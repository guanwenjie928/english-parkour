// 服务端通用工具函数 — 纯函数风格

// Fisher-Yates 洗牌，取前 n 个
const shuffleSlice = (arr, n) => {
  const result = [...arr];
  const limit = Math.min(n, result.length);
  for (let i = 0; i < limit; i++) {
    const j = i + (Math.random() * (result.length - i) | 0);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, limit);
};

// groupBy — O(n)，返回 Map
const groupBy = (arr, key) =>
  arr.reduce((m, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    return m.set(k, [...(m.get(k) ?? []), item]);
  }, new Map());

// 集合交集
const setIntersection = (a, b) =>
  new Set(a.size < b.size ? [...a].filter(x => b.has(x)) : [...b].filter(x => a.has(x)));

// 数值钳制
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// 范围内随机整数
const randInt = (lo, hi) => lo + (Math.random() * (hi - lo + 1) | 0);

// 随机选取
const randomPick = (arr) => arr[Math.random() * arr.length | 0];

// 6位房间码生成
const generateRoomCode = () => {
  const digits = '0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += digits[Math.random() * 10 | 0];
  return code;
};

// 延迟 ms
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 带超时的 Promise
const withTimeout = (promise, ms, fallback) =>
  Promise.race([promise, delay(ms).then(() => fallback)]);

module.exports = {
  shuffleSlice,
  groupBy,
  setIntersection,
  clamp,
  randInt,
  randomPick,
  generateRoomCode,
  delay,
  withTimeout,
};
