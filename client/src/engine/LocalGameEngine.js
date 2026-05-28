// 本地游戏引擎 — 替代 socket.io 的纯浏览器实现
// 支持单人模式 + AI 对手，零服务器依赖

import { getWordBank } from './WordBank.js';
import { createAIBots } from './AIBot.js';
import { PLAYER_COLORS } from '../utils/ColorConfig.js';

// 状态机
const STATE_MACHINE = Object.freeze({
  waiting: {
    allowedTransitions: new Set(['countdown', 'closed']),
    onEnter: (room) => room.clearTimer(),
  },
  countdown: {
    allowedTransitions: new Set(['playing', 'waiting']),
    onEnter: (room) => room.startCountdown(),
  },
  playing: {
    allowedTransitions: new Set(['ended', 'waiting']),
    onEnter: (room) => room.startGameLoop(),
  },
  ended: {
    allowedTransitions: new Set(['waiting', 'closed']),
    onEnter: (room) => room.finalizeGame(),
  },
  closed: {
    allowedTransitions: new Set([]),
    onEnter: (room) => room.cleanup(),
  },
});

// 道具系统
const ITEM_REGISTRY = Object.freeze({
  rocket: {
    type: 'buff',
    selfTarget: true,
    duration: 5000,
    effect: (p) => ({ speed: p.speed * 2.5 }),
  },
  electric: {
    type: 'control',
    selfTarget: false,
    duration: 0,
    effect: (t) => ({ paralyzed: true, needConsecutiveCorrect: 2 }),
  },
  banana: {
    type: 'control',
    selfTarget: false,
    duration: 0,
    effect: (t) => ({ slow: true, needConsecutiveCorrect: 1 }),
  },
  shield: {
    type: 'defense',
    selfTarget: true,
    duration: 8000,
    effect: (p) => ({ shielded: true }),
  },
});

class LocalGameEngine {
  constructor() {
    this.isLocal = true;
    this.playerId = this._genId();
    this.eventHandlers = new Map();

    // 兼容 NetworkManager 的 socket.id 访问模式
    this.socket = { id: this.playerId };

    // 单词引擎
    this.wordBank = getWordBank();

    // 房间状态
    this.room = {
      id: null,
      code: null,
      status: 'idle',
      players: new Map(), // socketId -> player/bot
      trackMap: new Map(), // trackNumber -> socketId
      humanPlayer: null,
      aiBots: [],
      timer: null,
      tickTimer: null,
      startedAt: null,
      elapsed: 0,
      wordChallengeSeq: 0,
    };

    // 绑定方法
    this._tick = this._tick.bind(this);
  }

  _genId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // === 事件系统（与 NetworkManager 兼容）===
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) handlers.delete(handler);
    return this;
  }

  emit(event, data) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) handlers.forEach((h) => h(data));

    // 特殊处理：转发给 AI
    if (event === 'word_challenge') {
      this._dispatchToAI('word_challenge', data);
    }
  }

  // === API 方法（与 NetworkManager 兼容）===
  joinRoom(code, playerName, isTeacher = false) {
    this.room.code = code;
    this.room.id = `local_${code}`;

    // 创建真人玩家
    const humanPlayer = {
      socketId: this.playerId,
      id: this.playerId,
      name: playerName,
      trackNumber: 1,
      colorTheme: PLAYER_COLORS[0].name,
      isTeacher: isTeacher,
      isHuman: true,
      progress: 0,
      speed: 1,
      baseSpeed: 1,
      status: 'waiting',
      isOnline: true,
      isReady: false,
      items: [],
      effects: {},
      consecutiveCorrect: 0,
      correctCount: 0,
      wrongCount: 0,
    };

    this.room.players.set(this.playerId, humanPlayer);
    this.room.trackMap.set(1, this.playerId);
    this.room.humanPlayer = humanPlayer;

    // 单人模式：创建 AI 对手
    if (code === 'SOLO') {
      this.room.aiBots = createAIBots();
      this.room.aiBots.forEach((bot) => {
        this.room.players.set(bot.socketId, bot);
        this.room.trackMap.set(bot.trackNumber, bot.socketId);
      });
    }

    this.room.status = 'waiting';

    // 触发事件
    setTimeout(() => {
      this.emit('room_state', { status: 'waiting', code });
      this.emit('player_list', { players: this._getPlayerList() });

      // AI 自动加入事件
      this.room.aiBots.forEach((bot) => {
        this.emit('player_joined', {
          socketId: bot.socketId,
          name: bot.name,
          trackNumber: bot.trackNumber,
        });
      });
    }, 0);

    return { ok: true };
  }

  setReady(ready) {
    if (!this.room.humanPlayer) return { ok: false };

    this.room.humanPlayer.isReady = ready;
    this.emit('player_ready', { socketId: this.playerId, ready });

    // 单人模式：AI 自动陆续准备
    if (this.room.code === 'SOLO') {
      this.room.aiBots.forEach((bot, index) => {
        setTimeout(() => {
          bot.isReady = true;
          this.emit('player_ready', { socketId: bot.socketId, ready: true });
          if (this._allReady()) this._transition('countdown');
        }, 500 + index * 500);
      });
    }

    // 检查是否全部准备
    if (this._allReady()) this._transition('countdown');

    return { ok: true };
  }

  startGame() {
    if (this.room.humanPlayer?.isTeacher) {
      return this._transition('countdown');
    }
    return { ok: false, reason: 'not_teacher' };
  }

  submitAnswer(answer) {
    if (this.room.status !== 'playing') return { ok: false };

    const player = this.room.players.get(this.playerId);
    if (!player?.currentChallenge) return { ok: false };

    const challenge = player.currentChallenge;
    const result = this.wordBank.validateAnswer(challenge, answer);

    // 更新状态
    if (result.correct) {
      player.consecutiveCorrect++;
      player.correctCount++;
      player.speed = Math.min(player.speed + 0.5, 5);

      // 清除负面效果
      if (player.effects.paralyzed && player.consecutiveCorrect >= 2) {
        delete player.effects.paralyzed;
      }
      if (player.effects.slow && player.consecutiveCorrect >= 1) {
        delete player.effects.slow;
      }

      // 道具奖励
      const reward = this._checkItemReward(player);
      this.emit('answer_result', { correct: true, newSpeed: player.speed, reward });
    } else {
      player.consecutiveCorrect = 0;
      player.wrongCount++;
      player.speed = Math.max(player.speed - 0.3, 0.5);
      this.emit('answer_result', { correct: false, newSpeed: player.speed });
    }

    // 延迟发新题
    setTimeout(() => this._sendNewChallenge(player), 2000);

    return { ok: true };
  }

  useItem(itemType, targetTrack) {
    const player = this.room.players.get(this.playerId);
    if (!player?.items.includes(itemType)) return { ok: false, reason: 'not_owned' };

    const itemDef = ITEM_REGISTRY[itemType];
    if (!itemDef) return { ok: false };

    let result = { ok: true, blocked: false };

    // 确定目标
    let targetId = this.playerId;
    if (!itemDef.selfTarget && targetTrack) {
      targetId = this.room.trackMap.get(targetTrack);
    }

    const target = this.room.players.get(targetId);
    if (!target) return { ok: false };

    // 护盾格挡
    if (itemDef.type === 'control' && target.effects.shielded) {
      delete target.effects.shielded;
      result = { ok: true, blocked: true, by: 'shield' };
    } else {
      // 应用效果
      const effects = itemDef.effect(target);
      Object.assign(target.effects, effects);

      // 定时清除
      if (itemDef.duration > 0) {
        setTimeout(() => {
          Object.keys(effects).forEach((k) => delete target.effects[k]);
        }, itemDef.duration);
      }
    }

    // 移除道具
    player.items = player.items.filter((i) => i !== itemType);

    // 广播效果
    this.emit('item_effect', {
      fromId: this.playerId,
      toId: targetId,
      itemType,
      blocked: result.blocked,
      by: result.by,
    });

    return result;
  }

  requestPlayerList() {
    this.emit('player_list', { players: this._getPlayerList() });
    return { ok: true };
  }

  send(event, data) {
    // 本地模式：直接处理
  }

  disconnect() {
    this.cleanup();
  }

  // === 内部方法 ===
  _getPlayerList() {
    return [...this.room.players.values()].map((p) => ({
      socketId: p.socketId,
      name: p.name,
      trackNumber: p.trackNumber,
      isReady: p.isReady,
      isOnline: p.isOnline,
      isHuman: p.isHuman || false,
    }));
  }

  _allReady() {
    return [...this.room.players.values()].every((p) => p.isReady);
  }

  _transition(newStatus) {
    // 获取当前状态的状态机配置
    const currentSm = STATE_MACHINE[this.room.status];
    if (!currentSm) return { ok: false };
    // 检查新状态是否在当前状态的允许转换列表中
    if (!currentSm.allowedTransitions.has(newStatus)) {
      return { ok: false, reason: 'transition_not_allowed' };
    }

    this.room.status = newStatus;
    // 执行新状态的 onEnter
    const newSm = STATE_MACHINE[newStatus];
    if (newSm && newSm.onEnter) {
      newSm.onEnter(this);
    }
    this.emit('room_state', { status: newStatus, code: this.room.code });

    return { ok: true };
  }

  startCountdown() {
    let count = 3;
    this.emit('countdown', { count });

    this.room.timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.emit('countdown', { count });
      } else {
        this.clearTimer();
        this._transition('playing');
      }
    }, 1000);
  }

  startGameLoop() {
    this.room.startedAt = Date.now();
    this.room.elapsed = 0;

    // 发射 game_start 事件（LobbyScene 依赖此事件跳转到 GameScene）
    this.emit('game_start', {});

    // 给所有人发第一题
    this.room.players.forEach((player) => {
      if (player.isHuman) {
        this._sendNewChallenge(player);
      } else {
        // AI 自动答题
        this._dispatchToAI('game_start', {});
      }
    });

    // 启动 tick
    this.room.tickTimer = setInterval(this._tick, 50);

    // 游戏结束定时器（90s）
    this.room.timer = setTimeout(() => {
      this._transition('ended');
    }, 90000);
  }

  finalizeGame() {
    this.clearTimer();
    const rankings = this._computeRankings();
    this.emit('game_end', { rankings });
  }

  _tick() {
    this.room.elapsed = Date.now() - this.room.startedAt;

    // 更新所有玩家位置
    this.room.players.forEach((player) => {
      if (player.isHuman) {
        // 真人玩家：检查效果
        if (player.effects.paralyzed) return;
        const speedMultiplier = player.effects.slow ? 0.15 : 1;
        player.progress += (player.speed * speedMultiplier * 50) / 1000;
      } else {
        // AI：tick 更新
        player.tick(50);
      }
      if (player.progress > 100) player.progress = 100;
    });

    // 广播位置
    this._syncPositions();

    // 检查终点
    const finishers = [...this.room.players.values()].filter((p) => p.progress >= 100);
    if (finishers.length > 0 && this.room.status === 'playing') {
      setTimeout(() => this._transition('ended'), 2000);
    }
  }

  _syncPositions() {
    const snapshot = [...this.room.players.values()].map((p) => ({
      socketId: p.socketId,
      progress: p.progress,
      speed: p.speed,
      trackNumber: p.trackNumber,
      status: p.status,
      shielded: !!p.effects.shielded,
    }));
    this.emit('position_sync', snapshot);
  }

  _sendNewChallenge(player) {
    const word = this.wordBank.selectWord(this.room.id, { difficulty: 2 });
    if (!word) return;

    this.room.wordChallengeSeq++;
    const challenge = this.wordBank.generateChallenge(word);
    player.currentChallenge = challenge;

    if (player.isHuman) {
      this.emit('word_challenge', {
        seq: this.room.wordChallengeSeq,
        type: challenge.type,
        display: challenge.display,
        wordId: word.id,
        timeLimit: 10,
      });
    }
  }

  _dispatchToAI(event, data) {
    if (event === 'word_challenge' || event === 'game_start') {
      this.room.aiBots.forEach((bot) => {
        // 获取单词给 AI
        const word = this.wordBank.selectWord(this.room.id, { difficulty: 2 });
        if (word) {
          const challenge = this.wordBank.generateChallenge(word);
          bot.currentChallenge = challenge;

          // 模拟答题
          bot.simulateAnswer(challenge, (botId, correct) => {
            const botPlayer = this.room.players.get(botId);
            if (!botPlayer) return;

            if (correct) {
              botPlayer.consecutiveCorrect++;
              botPlayer.correctCount++;
              botPlayer.speed = Math.min(botPlayer.speed + 0.5, 5);

              // 道具奖励
              if (botPlayer.consecutiveCorrect % 3 === 0 && botPlayer.items.length < 2) {
                const items = ['rocket', 'electric', 'banana', 'shield'];
                const available = items.filter((i) => !botPlayer.items.includes(i));
                if (available.length > 0) {
                  const item = available[Math.floor(Math.random() * available.length)];
                  botPlayer.items.push(item);
                }
              }
            } else {
              botPlayer.consecutiveCorrect = 0;
              botPlayer.wrongCount++;
              botPlayer.speed = Math.max(botPlayer.speed - 0.3, 0.5);
            }

            // 延迟发新题
            setTimeout(() => {
              const newWord = this.wordBank.selectWord(this.room.id, { difficulty: 2 });
              if (newWord) {
                const newChallenge = this.wordBank.generateChallenge(newWord);
                botPlayer.currentChallenge = newChallenge;
              }
            }, 2000);
          });
        }
      });

      // 启动 AI 道具循环
      this.room.aiBots.forEach((bot) => {
        bot.startItemLoop(
          (botId, itemType, targetTrack) => {
            // AI 使用道具
            const botPlayer = this.room.players.get(botId);
            if (!botPlayer?.items.includes(itemType)) return;

            const itemDef = ITEM_REGISTRY[itemType];
            let targetId = botId;
            if (!itemDef.selfTarget && targetTrack) {
              targetId = this.room.trackMap.get(targetTrack);
            }

            const target = this.room.players.get(targetId);
            if (!target) return;

            if (itemDef.type === 'control' && target.effects.shielded) {
              delete target.effects.shielded;
            } else {
              const effects = itemDef.effect(target);
              Object.assign(target.effects, effects);
            }

            botPlayer.items = botPlayer.items.filter((i) => i !== itemType);

            this.emit('item_effect', {
              fromId: botId,
              toId: targetId,
              itemType,
              blocked: false,
            });
          },
          () => [...this.room.players.values()]
        );
      });
    }
  }

  _checkItemReward(player) {
    const items = ['rocket', 'electric', 'banana', 'shield'];
    if (
      player.consecutiveCorrect > 0 &&
      player.consecutiveCorrect % 3 === 0 &&
      player.items.length < 2
    ) {
      const available = items.filter((i) => !player.items.includes(i));
      const item = available[Math.floor(Math.random() * available.length)];
      if (item) {
        player.items.push(item);
        this.emit('item_reward', { item });
        return { grant: true, item };
      }
    }
    return { grant: false };
  }

  _computeRankings() {
    const sorted = [...this.room.players.values()]
      .map((p) => ({
        socketId: p.socketId,
        name: p.name,
        progress: p.progress,
        correctCount: p.correctCount,
        trackNumber: p.trackNumber,
      }))
      .sort((a, b) => b.progress - a.progress);

    // Dense rank
    sorted.forEach((p, i, arr) => {
      p.rank = arr.filter((o) => o.progress > p.progress).length + 1;
    });

    return sorted;
  }

  clearTimer() {
    if (this.room.timer) {
      clearTimeout(this.room.timer);
      clearInterval(this.room.timer);
      this.room.timer = null;
    }
    if (this.room.tickTimer) {
      clearInterval(this.room.tickTimer);
      this.room.tickTimer = null;
    }
  }

  cleanup() {
    this.clearTimer();
    this.room.aiBots.forEach((bot) => bot.stopItemLoop());
    this.room.players.clear();
    this.room.trackMap.clear();
    this.eventHandlers.clear();
  }
}

export { LocalGameEngine };
