// 结构化 JSON 日志 — 方便日志系统解析
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
const CURRENT = LEVELS[process.env.LOG_LEVEL || 'info'];

const log = (level, event, data = {}) => {
  if (LEVELS[level] < CURRENT) return;
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  }));
};

const Logger = {
  debug: (e, d) => log('debug', e, d),
  info: (e, d) => log('info', e, d),
  warn: (e, d) => log('warn', e, d),
  error: (e, d) => log('error', e, d),
  fatal: (e, d) => log('fatal', e, d),
};

module.exports = { Logger };
