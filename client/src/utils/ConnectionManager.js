// WebSocket 连接状态机 + 指数退避重连

const CONN_STATES = Object.freeze({
  idle: { label: 'idle' },
  connecting: { label: 'connecting', showIndicator: true },
  connected: { label: 'connected', hideIndicator: true },
  slow: { label: 'slow', showWarning: true },
  reconnecting: { label: 'reconnecting', showOverlay: true },
  failed: { label: 'failed', showFailedScreen: true },
});

class ConnectionManager {
  #state = 'idle';
  #socket = null;
  #attempt = 0;
  #callbacks = new Map();
  #maxAttempts = 5;
  #baseDelay = 1000;
  #maxDelay = 10000;
  #rttHistory = [];

  constructor(socket, options = {}) {
    this.#socket = socket;
    this.#maxAttempts = options.maxAttempts ?? 5;
    this.#baseDelay = options.baseDelay ?? 1000;
    this.#maxDelay = options.maxDelay ?? 10000;
    this.#bindEvents();

    // 每3秒探测一次 RTT
    this.#startRTTProbe();
  }

  #bindEvents() {
    this.#socket.io.on('reconnect_attempt', () => {
      this.#attempt++;
      this.#transition('reconnecting');
    });

    this.#socket.io.on('reconnect', () => {
      this.#attempt = 0;
      this.#transition('connected');
    });

    this.#socket.io.on('reconnect_failed', () => {
      this.#transition('failed');
    });

    this.#socket.on('connect', () => {
      this.#attempt = 0;
      this.#transition('connected');
    });

    this.#socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // 服务器主动断开，不重连
        this.#transition('failed');
      } else {
        this.#transition('reconnecting');
      }
    });

    // 被动心跳
    this.#socket.on('ping', () => this.#socket.emit('pong'));
  }

  #startRTTProbe() {
    setInterval(() => {
      if (this.#state !== 'connected') return;
      const start = Date.now();
      this.#socket.emit('ping');
      this.#socket.once('pong', () => {
        const rtt = Date.now() - start;
        this.#rttHistory.push(rtt);
        if (this.#rttHistory.length > 5) this.#rttHistory.shift();
        const avgRTT = this.#rttHistory.reduce((a, b) => a + b, 0) / this.#rttHistory.length;
        this.#transition(avgRTT > 2000 ? 'slow' : 'connected');
      });
    }, 3000);
  }

  #transition(state) {
    if (!CONN_STATES[state] || this.#state === state) return;
    this.#state = state;
    const cb = this.#callbacks.get(state);
    cb?.(CONN_STATES[state]);
  }

  onState(state, callback) {
    this.#callbacks.set(state, callback);
    return this;
  }

  get state() {
    return this.#state;
  }

  get isConnected() {
    return this.#state === 'connected';
  }

  get attempt() {
    return this.#attempt;
  }

  // 手动重连
  reconnect() {
    this.#socket.connect();
  }
}

export { ConnectionManager, CONN_STATES };
