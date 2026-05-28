// 离线检测 — 多信号融合

class OfflineDetector {
  #signals = { browser: true, probe: true, heartbeat: true };
  #onChange = null;
  #probeInterval = null;

  constructor({ onChange, probeInterval = 5000 }) {
    this.#onChange = onChange;

    // 浏览器 online/offline 事件
    window.addEventListener('online', () => this.#setSignal('browser', true));
    window.addEventListener('offline', () => this.#setSignal('browser', false));

    // 启动主动探测
    this.#startProbe(probeInterval);
  }

  #startProbe(interval) {
    this.#probeInterval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch('/api/health', {
          method: 'HEAD',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        this.#setSignal('probe', true);
      } catch {
        this.#setSignal('probe', false);
      }
    }, interval);
  }

  #setSignal(name, value) {
    this.#signals[name] = value;
    const isOnline = Object.values(this.#signals).every(Boolean);
    this.#onChange?.(isOnline, { ...this.#signals });
  }

  setHeartbeat(result) {
    this.#setSignal('heartbeat', result);
  }

  get isOnline() {
    return Object.values(this.#signals).every(Boolean);
  }

  get signals() {
    return { ...this.#signals };
  }

  destroy() {
    clearInterval(this.#probeInterval);
  }
}

export { OfflineDetector };
