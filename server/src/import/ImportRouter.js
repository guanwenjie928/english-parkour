// 单词导入 REST API 路由

const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { WordExtractor } = require('./WordExtractor');
const { batchNormalize } = require('./WordNormalizer');
const { ImportValidator } = require('./ImportValidator');
const { db } = require('../db');
const { Logger } = require('../core/Logger');

// 内存存储（不保存上传文件）
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// 上传会话存储（内存）
const uploadSessions = new Map();
const SESSION_TTL = 30 * 60 * 1000; // 30分钟

// 清理过期会话
setInterval(() => {
  const now = Date.now();
  uploadSessions.forEach((session, id) => {
    if (now - session.createdAt > SESSION_TTL) {
      uploadSessions.delete(id);
    }
  });
}, 5 * 60 * 1000);

module.exports = () => {
  // POST /api/words/import/upload
  router.post('/upload', upload.array('files', 5), async (req, res) => {
    try {
      const files = req.files;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'no_files_uploaded' });
      }

      const sessionId = uuidv4();
      const results = [];

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase().slice(1);
        let content;

        // 根据文件类型解析
        if (['txt', 'csv'].includes(ext)) {
          content = file.buffer.toString('utf-8');
        } else if (ext === 'docx') {
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ buffer: file.buffer });
          content = result.value;
        } else if (ext === 'pdf') {
          const pdfParse = require('pdf-parse');
          const result = await pdfParse(file.buffer);
          content = result.text;
        } else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
          const { ImageParser } = require('./parsers/ImageParser');
          const parser = new ImageParser();
          const ocrResult = await parser.parse(file.buffer, file.mimetype);
          if (!ocrResult.success) {
            results.push({
              filename: file.originalname,
              fileType: ext,
              error: ocrResult.error,
              words: [],
              stats: { total: 0, new: 0, duplicate: 0, incomplete: 0 },
            });
            continue;
          }
          content = ocrResult.text;
        } else {
          results.push({
            filename: file.originalname,
            fileType: ext,
            error: 'unsupported_format',
            words: [],
            stats: { total: 0, new: 0, duplicate: 0, incomplete: 0 },
          });
          continue;
        }

        // 提取单词
        const extracted = WordExtractor.extract(content, ext === 'docx' ? 'docx' : ext);
        const normalized = batchNormalize(extracted.results);

        // 去重检测
        const validator = new ImportValidator();
        await validator.loadDbWords();
        const validated = validator.validate(normalized);

        results.push({
          filename: file.originalname,
          fileType: ext,
          detectedFormat: extracted.format,
          words: [...validated.valid, ...validated.incomplete],
          duplicates: validated.duplicates,
          stats: validated.stats,
        });
      }

      // 聚合统计
      const aggregateStats = results.reduce(
        (acc, r) => ({
          totalFiles: acc.totalFiles + 1,
          totalWords: acc.totalWords + r.stats.total,
          new: acc.new + r.stats.new,
          duplicate: acc.duplicate + r.stats.duplicate,
          incomplete: acc.incomplete + r.stats.incomplete,
        }),
        { totalFiles: 0, totalWords: 0, new: 0, duplicate: 0, incomplete: 0 }
      );

      // 保存会话
      uploadSessions.set(sessionId, {
        id: sessionId,
        results,
        createdAt: Date.now(),
      });

      res.json({
        sessionId,
        results,
        aggregateStats,
      });
    } catch (err) {
      Logger.error('import_upload_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/words/import/confirm
  router.post('/confirm', async (req, res) => {
    try {
      const { sessionId, words, overwriteDuplicates } = req.body;

      const session = uploadSessions.get(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'session_expired' });
      }

      const imported = [];
      const skipped = [];
      const failed = [];

      for (const word of words) {
        try {
          // 检查是否已存在
          const [existing] = await db.execute('SELECT id FROM words WHERE word = ?', [word.word]);

          if (existing.length > 0 && !overwriteDuplicates) {
            skipped.push({ word: word.word, reason: 'duplicate' });
            continue;
          }

          if (existing.length > 0 && overwriteDuplicates) {
            // 更新
            await db.execute(
              'UPDATE words SET meaning = ?, difficulty = ?, challenge_type = ?, blank_pattern = ?, blank_count = ?, category = ? WHERE word = ?',
              [
                word.meaning,
                word.difficulty,
                word.challengeType,
                word.blankPattern,
                word.blankCount,
                word.category,
                word.word,
              ]
            );
          } else {
            // 插入
            await db.execute(
              'INSERT INTO words (word, meaning, difficulty, challenge_type, blank_pattern, blank_count, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                word.word,
                word.meaning,
                word.difficulty,
                word.challengeType,
                word.blankPattern,
                word.blankCount,
                word.category,
              ]
            );
          }

          imported.push(word.word);
        } catch (err) {
          failed.push({ word: word.word, reason: err.message });
        }
      }

      // 清理会话
      uploadSessions.delete(sessionId);

      Logger.info('words_imported', { count: imported.length });

      res.json({
        imported: imported.length,
        skipped: skipped.length,
        failed: failed.length,
        details: { imported, skipped, failed },
      });
    } catch (err) {
      Logger.error('import_confirm_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/words/import/history
  router.get('/history', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const [rows] = await db.execute(
        'SELECT id, word, meaning, difficulty, challenge_type, category, created_at FROM words ORDER BY created_at DESC LIMIT ?',
        [limit]
      );

      res.json({ history: rows });
    } catch (err) {
      Logger.error('import_history_error', { error: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/words/import/template
  router.get('/template', (req, res) => {
    const template = `apple - 苹果
banana - 香蕉
cat - 猫
dog - 狗
beautiful - 美丽的
`;
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=word_template.txt');
    res.send(template);
  });

  return router;
};
