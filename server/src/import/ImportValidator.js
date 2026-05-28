// 导入校验 — 重复检测、数据库去重

const { db } = require('../db');

class ImportValidator {
  constructor() {
    this.dbWords = new Set();
  }

  async loadDbWords() {
    const [rows] = await db.execute('SELECT word FROM words WHERE is_active = TRUE');
    rows.forEach((r) => this.dbWords.add(r.word.toLowerCase()));
  }

  validate(words) {
    const results = {
      valid: [],
      duplicates: [],
      incomplete: [],
      stats: { total: words.length, new: 0, duplicate: 0, incomplete: 0 },
    };

    words.forEach((w) => {
      if (this.dbWords.has(w.word)) {
        results.duplicates.push(w);
        results.stats.duplicate++;
      } else if (w.incomplete) {
        results.incomplete.push(w);
        results.stats.incomplete++;
      } else {
        results.valid.push(w);
        results.stats.new++;
      }
    });

    return results;
  }
}

module.exports = { ImportValidator };
