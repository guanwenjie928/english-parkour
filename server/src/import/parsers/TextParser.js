// 纯文本解析器 — 智能分隔符推断

const FORMAT_PATTERNS = Object.freeze([
  { regex: /^([\w\s'-]+?)\s*[-–—]\s*(.+)$/, name: 'dash-separated' },
  { regex: /^([\w\s'-]+?)\t(.+)$/, name: 'tab-separated' },
  { regex: /^([\w\s'-]+?),(.+)$/, name: 'csv' },
  { regex: /^([\w\s'-]+?)\s*[:：]\s*(.+)$/, name: 'colon-separated' },
  { regex: /^\d+[.)]\s*([\w\s'-]+?)\s+(.+)$/, name: 'numbered-list' },
  { regex: /^([\w'-]+)$/, name: 'english-only' },
]);

const detectFormat = (lines) => {
  const samples = lines.filter((l) => l.trim()).slice(0, 10);
  if (samples.length === 0) return 'unknown';

  const votes = new Map();

  samples.forEach((line) => {
    FORMAT_PATTERNS.forEach(({ regex, name }) => {
      if (regex.test(line.trim())) {
        votes.set(name, (votes.get(name) || 0) + 1);
      }
    });
  });

  const [winner, count] = [...votes.entries()].reduce(
    (best, entry) => (entry[1] > best[1] ? entry : best),
    ['unknown', 0]
  );

  return count >= samples.length * 0.5 ? winner : 'unknown';
};

const parseText = (content) => {
  const lines = content.split(/\r?\n/);
  const format = detectFormat(lines);

  const results = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const pattern = FORMAT_PATTERNS.find((p) => p.name === format);
    if (!pattern) return;

    const match = trimmed.match(pattern.regex);
    if (match) {
      results.push({
        word: match[1].trim(),
        meaning: match[2]?.trim() || null,
        raw: trimmed,
      });
    } else if (format === 'english-only') {
      results.push({
        word: trimmed,
        meaning: null,
        raw: trimmed,
      });
    }
  });

  return { format, results };
};

module.exports = { parseText, detectFormat };
