// 单词引擎 — 预索引 + O(1) 查询 + 带权随机

const { db } = require('../db');
const { shuffleSlice } = require('../utils');

class WordEngine {
  constructor() {
    // 预索引结构
    this.byDifficulty = new Map(); // Map<difficulty, Map<category, Word[]>>
    this.byId = new Map(); // Map<id, Word>
    this.usedInRoom = new Map(); // Map<roomId, Set<wordId>>
    this.loaded = false;
  }

  async loadFromDB() {
    const [rows] = await db.execute(
      'SELECT id, word, meaning, difficulty, challenge_type, blank_pattern, blank_count, category FROM words WHERE is_active = TRUE'
    );

    rows.forEach((w) => {
      // 按难度+分类索引
      if (!this.byDifficulty.has(w.difficulty)) {
        this.byDifficulty.set(w.difficulty, new Map());
      }
      const catMap = this.byDifficulty.get(w.difficulty);
      if (!catMap.has(w.category)) {
        catMap.set(w.category, []);
      }
      catMap.get(w.category).push(w);

      // 按 ID 索引
      this.byId.set(w.id, w);
    });

    this.loaded = true;
  }

  // 为房间选取单词（带权随机 + 去重）
  selectWord(roomId, config) {
    const difficulty = config.difficulty || 2;
    const category = config.category;

    const catMap = this.byDifficulty.get(difficulty);
    if (!catMap) return null;

    const pool = category
      ? catMap.get(category) || []
      : [...catMap.values()].flat();

    const used = this.usedInRoom.get(roomId) || new Set();
    const available = pool.filter((w) => !used.has(w.id));

    if (available.length === 0) {
      // 重置已用词池
      used.clear();
      if (pool.length === 0) return null;
    }

    const pick = available[Math.random() * available.length | 0] || pool[0];
    used.add(pick.id);
    this.usedInRoom.set(roomId, used);

    return pick;
  }

  // 生成题目（fill_blank 或 cn_to_en）
  generateChallenge(word) {
    if (word.challenge_type === 'cn_to_en') {
      return {
        type: 'cn_to_en',
        wordId: word.id,
        word: word.word,
        display: word.meaning,
      };
    }

    // fill_blank: 40% 挖空，首尾不挖，不连续挖
    const pattern = word.blank_pattern || this.generateBlankPattern(word.word);
    return {
      type: 'fill_blank',
      wordId: word.id,
      word: word.word,
      display: pattern,
      blankPositions: this.extractBlankPositions(word.word, pattern),
    };
  }

  generateBlankPattern(word) {
    const chars = [...word];
    const blankCount = Math.max(3, (chars.length * 0.4) | 0);
    const eligible = chars
      .map((_, i) => i)
      .filter((i) => i > 0 && i < chars.length - 1);

    const positions = shuffleSlice(eligible, blankCount).sort((a, b) => a - b);

    return chars.map((c, i) => (positions.includes(i) ? '_' : c)).join('');
  }

  extractBlankPositions(word, pattern) {
    return [...pattern].map((c, i) => (c === '_' ? i : -1)).filter((i) => i !== -1);
  }

  // 校验答案
  validateAnswer(challenge, userInput) {
    const input = (userInput || '').trim().toLowerCase();
    if (!input) return { correct: false, reason: 'empty' };

    if (challenge.type === 'cn_to_en') {
      return { correct: input === challenge.word.toLowerCase() };
    }

    // fill_blank: 只比较挖空位置的字符
    const expected = challenge.blankPositions.map((i) => challenge.word[i]).join('');
    return {
      correct: input === expected.toLowerCase(),
      expected: expected.toLowerCase(),
    };
  }

  // 清空房间已用词
  clearRoom(roomId) {
    this.usedInRoom.delete(roomId);
  }
}

module.exports = { WordEngine };
