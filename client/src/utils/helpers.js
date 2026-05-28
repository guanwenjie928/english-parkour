// 通用工具函数 — 纯函数风格，零副作用

// Fisher-Yates 洗牌，取前 n 个
export const shuffleSlice = (arr, n) => {
  const result = [...arr];
  const limit = Math.min(n, result.length);
  for (let i = 0; i < limit; i++) {
    const j = i + (Math.random() * (result.length - i) | 0);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, limit);
};

// groupBy — O(n)，返回 Map<key, item[]>
export const groupBy = (arr, key) =>
  arr.reduce((m, item) => {
    const k = typeof key === 'function' ? key(item) : item[key];
    return m.set(k, [...(m.get(k) ?? []), item]);
  }, new Map());

// 集合交集 — O(min(|a|, |b|))
export const setIntersection = (a, b) =>
  new Set(a.size < b.size ? [...a].filter(x => b.has(x)) : [...b].filter(x => a.has(x)));

// 数值钳制
export const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// 范围内随机整数
export const randInt = (lo, hi) => lo + (Math.random() * (hi - lo + 1) | 0);

// 防抖 (trailing)
export const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

// 节流 (leading)
export const throttle = (fn, ms) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last < ms) return;
    last = now;
    return fn(...args);
  };
};

// 线性插值
export const lerp = (a, b, t) => a + (b - a) * t;

// 深拷贝（结构化克隆）
export const clone = (obj) => {
  try { return structuredClone(obj); }
  catch { return JSON.parse(JSON.stringify(obj)); }
};

// 随机选取数组元素
export const randomPick = (arr) => arr[Math.random() * arr.length | 0];

// 生成唯一 ID（短）
export const shortId = () => Math.random().toString(36).substring(2, 10);
