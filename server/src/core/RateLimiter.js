// 令牌桶速率限制 — 按 socketId 分桶
class TokenBucket {
  #tokens;
  #lastRefill;
  #rate;
  #capacity;

  constructor(rate = 50, capacity = 50) {
    this.#rate = rate;
    this.#capacity = capacity;
    this.#tokens = capacity;
    this.#lastRefill = Date.now();
  }

  tryConsume(count = 1) {
    this.#refill();
    if (this.#tokens < count) return false;
    this.#tokens -= count;
    return true;
  }

  #refill() {
    const now = Date.now();
    const added = ((now - this.#lastRefill) / 1000) * this.#rate;
    this.#tokens = Math.min(this.#capacity, this.#tokens + added);
    this.#lastRefill = now;
  }
}

// 按 socketId 分桶的速率限制器
const rateLimiters = new Map();

const checkRate = (socketId, limit = 50) => {
  let bucket = rateLimiters.get(socketId);
  if (!bucket) {
    bucket = new TokenBucket(limit, limit);
    rateLimiters.set(socketId, bucket);
  }
  return bucket.tryConsume();
};

const removeRateLimiter = (socketId) => {
  rateLimiters.delete(socketId);
};

module.exports = { TokenBucket, checkRate, removeRateLimiter };
