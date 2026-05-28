require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { db } = require('./src/db');
const { Logger } = require('./src/core/Logger');
const { setupErrorBoundary } = require('./src/core/ErrorBoundary');
const { registerShutdownHandlers } = require('./src/core/GracefulShutdown');
const { setupGameSocket } = require('./src/socket/gameSocket');
const { setupShmupSocket } = require('./src/socket/shmupSocket');
const apiRoutes = require('./src/routes/api');
const { WordEngine } = require('./src/game/WordEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
});

app.use(cors());
app.use(express.json());

// 内存中的房间存储
const rooms = new Map();

// 初始化单词引擎
const wordEngine = new WordEngine();

// 启动时加载单词
async function init() {
  try {
    await wordEngine.loadFromDB();
    Logger.info('word_engine_loaded', { wordCount: wordEngine.byId.size });
  } catch (err) {
    Logger.error('word_engine_load_failed', { error: err.message });
  }
}

init();

// API 路由
app.use('/api', apiRoutes(rooms, wordEngine));
app.use('/api/words/import', apiRoutes.importRoutes());

// 静态文件（生产环境）
app.use(express.static(path.join(__dirname, '../client/dist')));

// 错误兜底
const { safeHandler } = setupErrorBoundary(app, io, rooms);

// WebSocket 设置 — 支持跑酷（旧）和射击（新）两种模式
setupGameSocket(io, rooms, wordEngine);
setupShmupSocket(io, rooms, wordEngine);

// 房间回收定时器（30分钟 TTL）
const ROOM_TTL = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  rooms.forEach((room, id) => {
    const createdAt = room.createdAt || now;
    const shouldClean =
      (room.status === 'ended' && now - createdAt > ROOM_TTL) ||
      (room.status === 'waiting' && room.players.size === 0 && now - createdAt > ROOM_TTL);

    if (shouldClean) {
      room.cleanup();
      rooms.delete(id);
      cleaned++;
    }
  });
  if (cleaned > 0) {
    Logger.info('room_recycle', { cleaned, remaining: rooms.size });
  }
}, 5 * 60 * 1000); // 每5分钟检查一次

// 注册优雅关闭
registerShutdownHandlers(server, rooms);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  Logger.info('server_started', { port: PORT });
});
