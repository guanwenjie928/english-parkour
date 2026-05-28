// 全局错误兜底 — 三级捕获：process + Express + Socket

const { Logger } = require('./Logger');

const setupErrorBoundary = (server, io, rooms) => {
  // 未捕获 Promise rejection
  process.on('unhandledRejection', (reason) => {
    Logger.error('unhandledRejection', {
      reason: String(reason),
      stack: reason?.stack,
    });
  });

  // 未捕获同步异常
  process.on('uncaughtException', (err) => {
    Logger.fatal('uncaughtException', {
      message: err.message,
      stack: err.stack,
    });
    // 致命错误 → 优雅关闭
    const { gracefulShutdown } = require('./GracefulShutdown');
    gracefulShutdown(server, rooms, 3000).then(() => process.exit(1));
  });

  // Express 错误中间件
  server.use((err, req, res, next) => {
    Logger.error('route_error', {
      url: req.url,
      method: req.method,
      error: err.message,
    });
    res.status(500).json({
      error: 'internal_error',
      requestId: req.id || 'unknown',
    });
  });

  // Socket.io 事件级兜底包装器
  const safeHandler = (fn) => {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (e) {
        Logger.error('socket_handler_error', {
          fn: fn.name,
          error: e.message,
          stack: e.stack,
        });
      }
    };
  };

  return { safeHandler };
};

module.exports = { setupErrorBoundary };
