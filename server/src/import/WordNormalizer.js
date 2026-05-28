// 单词规范化 — 清洗、去重、补全 blank_pattern、推断难度

const normalizeWord = (raw) => {
  const word = raw.word?.trim().toLowerCase();
  const meaning = raw.meaning?.trim() || null;

  if (!word || word.length < 2) {
    return { valid: false, reason: 'invalid_word' };
  }

  // 过滤非法字符
  if (!/^[a-zA-Z\s'-]+$/.test(word)) {
    return { valid: false, reason: 'invalid_characters' };
  }

  // 自动判定难度（按单词长度）
  const difficulty = raw.difficulty ?? inferDifficulty(word);

  // 自动判定题型
  const challengeType =
    raw.challengeType ?? (word.length <= 4 ? 'cn_to_en' : 'fill_blank');

  // 自动生成 blank_pattern
  const blankConfig =
    challengeType === 'fill_blank'
      ? generateBlankPattern(word)
      : { blankPattern: null, blankCount: 0 };

  return {
    valid: true,
    word,
    meaning,
    difficulty,
    challengeType,
    ...blankConfig,
    incomplete: !meaning,
    category: raw.category || '未分类',
  };
};

const inferDifficulty = (word) => {
  const len = word.length;
  if (len <= 3) return 1;
  if (len <= 5) return 2;
  if (len <= 7) return 3;
  if (len <= 9) return 4;
  return 5;
};

const generateBlankPattern = (word) => {
  const chars = [...word];
  const blankCount = Math.max(3, (chars.length * 0.4) | 0);
  const pool = chars
    .map((_, i) => i)
    .filter((i) => i > 0 && i < chars.length - 1);

  // Fisher-Yates 洗牌取前 n 个
  const positions = shuffleSlice(pool, blankCount).sort((a, b) => a - b);

  const pattern = chars.map((c, i) => (positions.includes(i) ? '_' : c)).join('');

  return { blankPattern: pattern, blankCount: positions.length };
};

const shuffleSlice = (arr, n) => {
  const result = [...arr];
  const limit = Math.min(n, result.length);
  for (let i = 0; i < limit; i++) {
    const j = i + (Math.random() * (result.length - i) | 0);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, limit);
};

const batchNormalize = (rawWords) => {
  const results = [];
  const seen = new Set();

  rawWords.forEach((raw) => {
    const normalized = normalizeWord(raw);
    if (!normalized.valid) return;

    // 去重
    if (seen.has(normalized.word)) return;
    seen.add(normalized.word);

    results.push(normalized);
  });

  return results;
};

module.exports = { normalizeWord, batchNormalize, inferDifficulty };
