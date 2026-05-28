// 离线消息暂存 + 重连后回放

class MessageQueue {
  #queue = [];
  #maxSize = 20;

  enqueue(event, data) {
    if (this.#queue.length >= this.#maxSize) {
      this.#queue.shift(); // 丢最老的
    }
    this.#queue.push({
      event,
      data,
      ts: Date.now(),
    });
  }

  // 重连后回放
  async replay(socket) {
    const now = Date.now();
    // 只回放答题和道具，30秒内有效
    const valid = this.#queue.filter(
      ({ event, ts }) =>
        ['submit_answer', 'use_item'].includes(event) && now - ts < 30000
    );

    const results = [];
    for (const { event, data } of valid) {
      const result = await new Promise((resolve) => {
        socket.emit(event, data, (res) => resolve(res));
        setTimeout(() => resolve({ timeout: true }), 5000);
      });
      results.push({ event, result });
    }

    const dropped = this.#queue.length - valid.length;
    this.#queue = [];

    return {
      replayed: valid.length,
      dropped,
      results,
    };
  }

  clear() {
    this.#queue = [];
  }

  get length() {
    return this.#queue.length;
  }
}

export { MessageQueue };
