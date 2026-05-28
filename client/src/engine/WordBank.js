// 静态单词数据 — 从 database/init.sql 提取
// 零外部依赖，供 LocalGameEngine 使用

const WORDS = [
  // 三年级
  { id: 1, word: 'apple', meaning: '苹果', difficulty: 1, challenge_type: 'cn_to_en', blank_pattern: null, blank_count: 0, category: '三年级' },
  { id: 2, word: 'banana', meaning: '香蕉', difficulty: 1, challenge_type: 'cn_to_en', blank_pattern: null, blank_count: 0, category: '三年级' },
  { id: 3, word: 'cat', meaning: '猫', difficulty: 1, challenge_type: 'cn_to_en', blank_pattern: null, blank_count: 0, category: '三年级' },
  { id: 4, word: 'dog', meaning: '狗', difficulty: 1, challenge_type: 'cn_to_en', blank_pattern: null, blank_count: 0, category: '三年级' },
  { id: 5, word: 'beautiful', meaning: '美丽的', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'b_a_t_f_l', blank_count: 4, category: '三年级' },
  { id: 6, word: 'elephant', meaning: '大象', difficulty: 2, challenge_type: 'fill_blank', blank_pattern: 'e_e_h_n', blank_count: 3, category: '三年级' },
  { id: 7, word: 'friend', meaning: '朋友', difficulty: 2, challenge_type: 'fill_blank', blank_pattern: 'f_i_n', blank_count: 2, category: '三年级' },
  { id: 8, word: 'school', meaning: '学校', difficulty: 2, challenge_type: 'cn_to_en', blank_pattern: null, blank_count: 0, category: '三年级' },
  { id: 9, word: 'teacher', meaning: '老师', difficulty: 2, challenge_type: 'fill_blank', blank_pattern: 't_a_h_r', blank_count: 2, category: '三年级' },
  { id: 10, word: 'student', meaning: '学生', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 's_u_e_t', blank_count: 3, category: '三年级' },

  // 四年级
  { id: 11, word: 'computer', meaning: '电脑', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'c_m_u_e_', blank_count: 3, category: '四年级' },
  { id: 12, word: 'bicycle', meaning: '自行车', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'b_c_c_e', blank_count: 3, category: '四年级' },
  { id: 13, word: 'library', meaning: '图书馆', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'l_b_a_y', blank_count: 3, category: '四年级' },
  { id: 14, word: 'medicine', meaning: '药', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'm_d_c_n_', blank_count: 4, category: '四年级' },
  { id: 15, word: 'tomorrow', meaning: '明天', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 't_m_r_o_', blank_count: 3, category: '四年级' },
  { id: 16, word: 'yesterday', meaning: '昨天', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'y_s_e_d_y', blank_count: 4, category: '四年级' },
  { id: 17, word: 'morning', meaning: '早上', difficulty: 2, challenge_type: 'fill_blank', blank_pattern: 'm_r_i_g', blank_count: 2, category: '四年级' },
  { id: 18, word: 'evening', meaning: '晚上', difficulty: 2, challenge_type: 'fill_blank', blank_pattern: 'e_e_i_g', blank_count: 2, category: '四年级' },
  { id: 19, word: 'country', meaning: '国家', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'c_u_t_y', blank_count: 3, category: '四年级' },
  { id: 20, word: 'language', meaning: '语言', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'l_n_u_g_', blank_count: 4, category: '四年级' },

  // 五年级
  { id: 21, word: 'knowledge', meaning: '知识', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'k_o_l_d_e', blank_count: 4, category: '五年级' },
  { id: 22, word: 'exercise', meaning: '锻炼', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'e_e_c_i_e', blank_count: 4, category: '五年级' },
  { id: 23, word: 'mountain', meaning: '山', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'm_u_t_i_', blank_count: 4, category: '五年级' },
  { id: 24, word: 'weather', meaning: '天气', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'w_a_h_r', blank_count: 2, category: '五年级' },
  { id: 25, word: 'between', meaning: '在...之间', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'b_t_e_n', blank_count: 3, category: '五年级' },
  { id: 26, word: 'believe', meaning: '相信', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'b_l_e_e', blank_count: 3, category: '五年级' },
  { id: 27, word: 'against', meaning: '反对', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'a_a_n_t', blank_count: 3, category: '五年级' },
  { id: 28, word: 'general', meaning: '一般的', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'g_n_r_l', blank_count: 4, category: '五年级' },
  { id: 29, word: 'foreign', meaning: '外国的', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'f_r_e_g', blank_count: 3, category: '五年级' },
  { id: 30, word: 'journey', meaning: '旅行', difficulty: 3, challenge_type: 'fill_blank', blank_pattern: 'j_u_n_y', blank_count: 3, category: '五年级' },

  // 六年级
  { id: 31, word: 'discovery', meaning: '发现', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'd_s_o_e_y', blank_count: 4, category: '六年级' },
  { id: 32, word: 'education', meaning: '教育', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'e_u_a_i_n', blank_count: 5, category: '六年级' },
  { id: 33, word: 'scientist', meaning: '科学家', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 's_i_n_i_t', blank_count: 4, category: '六年级' },
  { id: 34, word: 'especially', meaning: '尤其', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'e_p_c_a_y', blank_count: 5, category: '六年级' },
  { id: 35, word: 'necessary', meaning: '必要的', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'n_c_s_a_y', blank_count: 5, category: '六年级' },
  { id: 36, word: 'different', meaning: '不同的', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'd_f_e_e_t', blank_count: 4, category: '六年级' },
  { id: 37, word: 'important', meaning: '重要的', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'i_p_r_a_t', blank_count: 4, category: '六年级' },
  { id: 38, word: 'wonderful', meaning: '精彩的', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'w_n_e_f_l', blank_count: 5, category: '六年级' },
  { id: 39, word: 'following', meaning: '下列的', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 'f_l_o_i_g', blank_count: 4, category: '六年级' },
  { id: 40, word: 'situation', meaning: '情况', difficulty: 4, challenge_type: 'fill_blank', blank_pattern: 's_t_a_i_n', blank_count: 5, category: '六年级' },
];

// 预索引结构 — 与服务器 WordEngine 一致
class WordBank {
  constructor() {
    this.byDifficulty = new Map();
    this.byId = new Map();
    this.usedInRoom = new Map();
    this._buildIndex();
  }

  _buildIndex() {
    WORDS.forEach((w) => {
      // 按难度索引
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
  }

  // 获取指定难度和分类的单词池
  getByDifficulty(difficulty) {
    return this.byDifficulty.get(difficulty) || new Map();
  }

  // 获取指定分类的所有单词
  getByCategory(category) {
    const result = [];
    this.byDifficulty.forEach((catMap) => {
      if (catMap.has(category)) {
        result.push(...catMap.get(category));
      }
    });
    return result;
  }

  // 为房间选取单词（带权随机 + 去重）
  selectWord(roomId, config = {}) {
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

    const pick = available[Math.floor(Math.random() * available.length)] || pool[0];
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

    // fill_blank
    const pattern = word.blank_pattern || this._generateBlankPattern(word.word);
    return {
      type: 'fill_blank',
      wordId: word.id,
      word: word.word,
      display: pattern,
      blankPositions: this._extractBlankPositions(word.word, pattern),
    };
  }

  _generateBlankPattern(word) {
    const chars = [...word];
    const blankCount = Math.max(3, Math.floor(chars.length * 0.4));
    const eligible = chars
      .map((_, i) => i)
      .filter((i) => i > 0 && i < chars.length - 1);

    // Fisher-Yates shuffle
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const positions = shuffled.slice(0, blankCount).sort((a, b) => a - b);
    return chars.map((c, i) => (positions.includes(i) ? '_' : c)).join('');
  }

  _extractBlankPositions(word, pattern) {
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

// 单例导出
let instance = null;
export const getWordBank = () => {
  if (!instance) instance = new WordBank();
  return instance;
};

export { WORDS, WordBank };
