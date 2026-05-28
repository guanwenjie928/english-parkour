// 心跳检测与僵尸连接清理
// 配置驱动，零嵌套

const HEARTBEAT_CONFIG = Object.freeze({
  PING_INTERVAL: 5000,
  PONG_TIMEOUT: 8000,
  MAX_MISSED: 2,
  ZOMBIE_CLEANUP: 15000,
});

class HeartbeatManager {
  #clients = new Map(); // socketId → { lastPong, missed, onZombie, onRecover, timer }

  register(socket, { onZombie, onRecover } = {}) {
    const entry = {
      lastPong: Date.now(),
      missed: 0,
      onZombie,
      onRecover,
      timer: setInterval(() => this.#ping(socket), HEARTBEAT_CONFIG.PING_INTERVAL),
    };
    this.#clients.set(socket.id, entry);
    socket.on('pong', () => this.#onPong(socket.id));
    socket.on('disconnect', () => this.#cleanup(socket.id));
  }

  #ping(socket) {
    const entry = this.#clients.get(socket.id);
    if (!entry) return;

    socket.emit('ping');

    const timeSinceLastPong = Date.now() - entry.lastPong;
    if (timeSinceLastPong <= HEARTBEAT_CONFIG.PONG_TIMEOUT) return;

    entry.missed++;

    if (entry.missed === 1) {
      socket.emit('connection_warning', { msg: '网络不稳定' });
    }
    if (entry.missed >= HEARTBEAT_CONFIG.MAX_MISSED) {
      entry.onZombie?.(socket.id);
    }
    if (entry.missed * HEARTBEAT_CONFIG.PING_INTERVAL >= HEARTBEAT_CONFIG.ZOMBIE_CLEANUP) {
      this.#cleanup(socket.id);
    }
  }

  #onPong(socketId) {
    const entry = this.#clients.get(socketId);
    if (!entry) return;

    if (entry.missed >= HEARTBEAT_CONFIG.MAX_MISSED) {
      entry.onRecover?.(socketId);
    }
    entry.lastPong = Date.now();
    entry.missed = 0;
  }

  #cleanup(socketId) {
    const entry = this.#clients.get(socketId);
    if (!entry) return;
    clearInterval(entry.timer);
    this.#clients.delete(socketId);
  }

  remove(socketId) {
    this.#cleanup(socketId);
  }
}

module.exports = { HeartbeatManager, HEARTBEAT_CONFIG };
