// AI 机器人对手 — 本地单人模式

import { PLAYER_COLORS } from '../utils/ColorConfig.js';

// AI 配置
const BOT_CONFIGS = [
  { name: 'Alice', skillLevel: 0.70, delayMin: 2000, delayMax: 4500, aggressiveness: 0.3 },
  { name: 'Bob', skillLevel: 0.80, delayMin: 1800, delayMax: 3500, aggressiveness: 0.5 },
  { name: 'Carol', skillLevel: 0.90, delayMin: 1500, delayMax: 2500, aggressiveness: 0.7 },
  { name: 'Dave', skillLevel: 0.85, delayMin: 1500, delayMax: 3000, aggressiveness: 0.6 },
];

const ITEM_TYPES = ['rocket', 'electric', 'banana', 'shield'];

class AIBot {
  constructor(config, trackNumber) {
    this.socketId = `bot_${trackNumber}`;
    this.name = config.name;
    this.trackNumber = trackNumber;
    this.colorTheme = PLAYER_COLORS[trackNumber - 1]?.name || 'blue';
    this.skillLevel = config.skillLevel;
    this.delayMin = config.delayMin;
    this.delayMax = config.delayMax;
    this.aggressiveness = config.aggressiveness;

    // 游戏状态
    this.progress = 0;
    this.speed = 1 + config.skillLevel * 0.3;
    this.baseSpeed = this.speed;
    this.items = [];
    this.effects = {};
    this.consecutiveCorrect = 0;
    this.correctCount = 0;
    this.wrongCount = 0;
    this.isReady = false;
    this.isOnline = true;
    this.status = 'waiting';

    // 定时器
    this.answerTimer = null;
    this.itemTimer = null;
  }

  // 随机延迟
  getAnswerDelay() {
    return Math.random() * (this.delayMax - this.delayMin) + this.delayMin;
  }

  // 模拟答题
  async simulateAnswer(challenge, submitFn) {
    if (this.answerTimer) clearTimeout(this.answerTimer);

    const delay = this.getAnswerDelay();
    this.answerTimer = setTimeout(() => {
      // 正确率 = skillLevel
      const correct = Math.random() < this.skillLevel;

      if (correct) {
        this.consecutiveCorrect++;
        this.correctCount++;
        this.speed = Math.min(this.speed + 0.5, 5);

        // 道具奖励（每3连对 + 物品少于2）
        if (this.consecutiveCorrect > 0 && this.consecutiveCorrect % 3 === 0 && this.items.length < 2) {
          const available = ITEM_TYPES.filter((i) => !this.items.includes(i));
          if (available.length > 0) {
            const item = available[Math.floor(Math.random() * available.length)];
            this.items.push(item);
          }
        }
      } else {
        this.consecutiveCorrect = 0;
        this.wrongCount++;
        this.speed = Math.max(this.speed - 0.3, 0.5);
      }

      submitFn(this.socketId, correct);
    }, delay);
  }

  // 取消答题
  cancelAnswer() {
    if (this.answerTimer) {
      clearTimeout(this.answerTimer);
      this.answerTimer = null;
    }
  }

  // 模拟道具使用
  startItemLoop(useItemFn, getPlayersFn) {
    if (this.itemTimer) return;

    const loop = () => {
      if (this.items.length === 0) return;

      // 随机间隔 10-20s
      const interval = Math.random() * 10000 + 10000;
      this.itemTimer = setTimeout(() => {
        if (this.items.length === 0 || Math.random() > this.aggressiveness) {
          loop();
          return;
        }

        // 选择道具
        const itemIndex = Math.floor(Math.random() * this.items.length);
        const itemType = this.items[itemIndex];

        // 选择目标
        let targetTrack = null;
        const players = getPlayersFn();

        if (['electric', 'banana'].includes(itemType)) {
          // 攻击领先玩家
          const others = players.filter((p) => p.trackNumber !== this.trackNumber);
          if (others.length > 0) {
            const leader = others.sort((a, b) => b.progress - a.progress)[0];
            targetTrack = leader.trackNumber;
          }
        }

        // 使用道具
        useItemFn(this.socketId, itemType, targetTrack);
        this.items.splice(itemIndex, 1);

        loop();
      }, interval);
    };

    loop();
  }

  // 停止道具循环
  stopItemLoop() {
    if (this.itemTimer) {
      clearTimeout(this.itemTimer);
      this.itemTimer = null;
    }
  }

  // 更新位置（tick）
  tick(deltaMs) {
    if (this.effects.paralyzed || this.status === 'stunned') return;
    const speedMultiplier = this.effects.slow ? 0.15 : 1;
    this.progress += (this.speed * speedMultiplier * deltaMs) / 1000;
    if (this.progress > 100) this.progress = 100;
  }

  // 应用效果
  applyEffect(effect) {
    if (effect === 'shield') {
      this.effects.shielded = true;
    } else if (effect === 'paralyzed') {
      this.effects.paralyzed = true;
    } else if (effect === 'slow') {
      this.effects.slow = true;
    }
  }

  // 清除效果
  clearEffect(effect) {
    delete this.effects[effect];
  }

  // 序列化为网络格式
  toJSON() {
    return {
      socketId: this.socketId,
      name: this.name,
      trackNumber: this.trackNumber,
      colorTheme: this.colorTheme,
      progress: this.progress,
      speed: this.speed,
      status: this.status,
      shielded: !!this.effects.shielded,
    };
  }
}

// 创建 4 个机器人
const createAIBots = () => {
  return BOT_CONFIGS.map((config, index) => new AIBot(config, index + 2));
};

export { AIBot, createAIBots, BOT_CONFIGS };
