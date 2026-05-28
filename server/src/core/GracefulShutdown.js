// 优雅关闭 — SIGTERM → 通知 → 保存 → 关 HTTP → 关 DB

const { Logger } = require('./Logger');

const gracefulShutdown = async (server, rooms, timeoutMs = 5000) => {
  Logger.info('shutdown_initiated', { rooms: rooms.size });

  // 1. 通知所有客户端服务器即将关闭
  rooms.forEach((room, roomId) => {
    if (room.status === 'playing') {
      // 通过 io.to 通知，io 需从外部传入或全局访问
      const io = room.io;
      if (io) {
        io.to(roomId).emit('server_shutdown', { resumeIn: 30 });
      }
    }
  });

  // 2. 保存所有进行中的游戏状态到 DB
  const saves = [...rooms.values()]
    .filter((r) => r.status === 'playing')
    .map((r) => saveRoomState(r));

  await Promise.allSettled(saves);

  // 3. 关闭 HTTP 服务器
  await new Promise((resolve) => {
    server.close(resolve);
    setTimeout(resolve, timeoutMs);
  });

  // 4. 断开 DB 连接
  const { db } = require('../db');
  await db.end();

  Logger.info('shutdown_complete');
  return true;
};

const saveRoomState = async (room) => {
  const { db } = require('../db');
  try {
    await db.execute(
      'UPDATE rooms SET status = ?, snapshot = ? WHERE id = ?',
      ['interrupted', JSON.stringify(room.toJSON?.() || room), room.id]
    );
    return { roomId: room.id, saved: true };
  } catch (err) {
    return { roomId: room.id, saved: false, error: err.message };
  }
};

const registerShutdownHandlers = (server, rooms) => {
  ['SIGTERM', 'SIGINT'].forEach((sig) => {
    process.on(sig, () => {
      Logger.info('signal_received', { signal: sig });
      gracefulShutdown(server, rooms).then(() => process.exit(0));
    });
  });
};

module.exports = { gracefulShutdown, registerShutdownHandlers };
