// 房间状态机 — 数据结构驱动 + 查表驱动状态转换
const { Logger } = require('../core/Logger');

const STATE_MACHINE = Object.freeze({
  waiting: {
    allowedTransitions: new Set(['countdown', 'closed']),
    onEnter: (room) => { room.clearTimer(); },
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

class GameRoom {
  static MAX_PLAYERS = 8;
  static TICK_RATE = 50; // ms
  static RECONNECT_WINDOW = 30000; // 30s
  static GAME_DURATION = 90000; // 90s

  constructor(id, code, config = {}) {
    this.id = id;
    this.code = code;
    this.status = 'waiting';
    this.mapId = config.mapId || 'city';
    this.duration = config.duration || GameRoom.GAME_DURATION;
    this.wordConfig = config.wordConfig || { difficulty: 2, category: '三年级' };

    // O(1) 查找表
    this.players = new Map(); // socketId → PlayerState
    this.trackMap = new Map(); // trackNumber → socketId
    this.playerIdToSocket = new Map(); // db playerId → socketId

    // 运行时状态
    this.timer = null;
    this.tickTimer = null;
    this.startedAt = null;
    this.elapsed = 0;
    this.wordChallengeSeq = 0;
    this.io = null; // Socket.io 实例（用于广播）

    // 单词引擎引用（外部注入）
    this.wordEngine = null;

    // 当前题目
    this.currentChallenge = null;
  }

  // 查表驱动状态转换
  transition(newStatus) {
    const sm = STATE_MACHINE[newStatus];
    if (!sm) return { ok: false, reason: 'invalid_state' };
    if (!sm.allowedTransitions.has(this.status)) {
      return { ok: false, reason: 'transition_not_allowed', from: this.status, to: newStatus };
    }

    this.status = newStatus;
    sm.onEnter(this);
    Logger.info('room_state_transition', { roomId: this.id, newStatus });
    return { ok: true };
  }

  addPlayer(socketId, playerData) {
    if (this.players.size >= GameRoom.MAX_PLAYERS) return { ok: false, reason: 'room_full' };

    const track = this.findAvailableTrack();
    if (track === null) return { ok: false, reason: 'no_available_track' };

    const player = {
      socketId,
      id: playerData.id,
      name: playerData.name,
      trackNumber: track,
      colorTheme: playerData.colorTheme,
      progress: 0,
      speed: 1,
      baseSpeed: 1,
      status: 'waiting',
      isOnline: true,
      isReady: false,
      items: [],
      effects: {}, // { paralyzed, shielded, slow }
      consecutiveCorrect: 0,
      correctCount: 0,
      wrongCount: 0,
      currentChallenge: null,
    };

    this.players.set(socketId, player);
    this.trackMap.set(track, socketId);
    if (playerData.id) this.playerIdToSocket.set(playerData.id, socketId);

    return { ok: true, player };
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return { ok: false };

    this.trackMap.delete(player.trackNumber);
    if (player.id) this.playerIdToSocket.delete(player.id);
    this.players.delete(socketId);

    return { ok: true };
  }

  findAvailableTrack() {
    for (let i = 1; i <= GameRoom.MAX_PLAYERS; i++) {
      if (!this.trackMap.has(i)) return i;
    }
    return null;
  }

  setPlayerReady(socketId, ready = true) {
    const player = this.players.get(socketId);
    if (!player) return { ok: false, reason: 'player_not_found' };
    player.isReady = ready;
    return { ok: true };
  }

  allReady() {
    if (this.players.size === 0) return false;
    return [...this.players.values()].every((p) => p.isReady);
  }

  startCountdown() {
    let count = 3;
    this.broadcast('countdown', { count });

    this.timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.broadcast('countdown', { count });
      } else {
        this.clearTimer();
        this.transition('playing');
      }
    }, 1000);
  }

  startGameLoop() {
    this.startedAt = Date.now();
    this.elapsed = 0;

    // 发送首题
    this.sendNewWordChallenge();

    // 位置同步定时器
    this.tickTimer = setInterval(() => this.tick(), GameRoom.TICK_RATE);

    // 游戏结束定时器
    this.timer = setTimeout(() => {
      this.transition('ended');
    }, this.duration);
  }

  tick() {
    this.elapsed = Date.now() - this.startedAt;

    // 更新玩家位置
    this.players.forEach((player) => {
      if (player.effects.paralyzed || player.status === 'stunned') return;
      const speedMultiplier = player.effects.slow ? 0.15 : 1;
      player.progress += (player.speed * speedMultiplier * GameRoom.TICK_RATE) / 1000;
      if (player.progress > 100) player.progress = 100;
    });

    // 广播位置同步
    this.syncPositions();

    // 检查是否有人到达终点
    const finishers = [...this.players.values()].filter((p) => p.progress >= 100);
    if (finishers.length > 0 && this.status === 'playing') {
      // 延迟 2s 后结束，让更多人完成
      setTimeout(() => this.transition('ended'), 2000);
    }
  }

  syncPositions() {
    const snapshot = [...this.players.values()].map(
      ({ socketId, progress, speed, trackNumber, status, effects }) => ({
        socketId,
        progress,
        speed,
        trackNumber,
        status,
        shielded: effects.shielded || false,
      })
    );
    this.broadcast('position_sync', snapshot);
  }

  sendNewWordChallenge() {
    if (!this.wordEngine) return;

    const word = this.wordEngine.selectWord(this.id, this.wordConfig);
    if (!word) return;

    this.wordChallengeSeq++;
    this.currentChallenge = word;

    const challenge = this.wordEngine.generateChallenge(word);

    this.players.forEach((player) => {
      player.currentChallenge = challenge;
    });

    this.broadcast('word_challenge', {
      seq: this.wordChallengeSeq,
      type: challenge.type,
      display: challenge.display,
      wordId: word.id,
      timeLimit: 10,
    });
  }

  handleAnswer(socketId, answer) {
    const player = this.players.get(socketId);
    if (!player || !player.currentChallenge) {
      return { ok: false, reason: 'no_challenge' };
    }

    const { correct } = this.wordEngine.validateAnswer(player.currentChallenge, answer);

    // 更新状态
    if (correct) {
      player.consecutiveCorrect++;
      player.correctCount++;
      player.speed = Math.min(player.speed + 0.5, 5); // 上限 5
      player.currentChallenge = null;

      // 检查道具奖励
      const reward = this.checkItemReward(player);

      // 追赶机制: 落后 30% 以上时，答对获得额外 20% 速度
      if (this.isCatchUp(player)) {
        player.speed += 0.2;
      }

      return { ok: true, correct, newSpeed: player.speed, reward };
    } else {
      player.consecutiveCorrect = 0;
      player.wrongCount++;
      player.speed = Math.max(player.speed - 0.3, 0.5); // 下限 0.5
      player.currentChallenge = null;
      return { ok: true, correct, newSpeed: player.speed };
    }
  }

  checkItemReward(player) {
    const items = ['rocket', 'electric', 'banana', 'shield'];
    if (
      player.consecutiveCorrect > 0 &&
      player.consecutiveCorrect % 3 === 0 &&
      player.items.length < 2
    ) {
      const available = items.filter((i) => !player.items.includes(i));
      const item = available[Math.random() * available.length | 0];
      if (item) {
        player.items.push(item);
        return { grant: true, item };
      }
    }
    return { grant: false };
  }

  isCatchUp(player) {
    const maxProgress = Math.max(...[...this.players.values()].map((p) => p.progress));
    return maxProgress - player.progress > 30;
  }

  useItem(fromSocketId, itemType, targetTrack) {
    const from = this.players.get(fromSocketId);
    if (!from || !from.items.includes(itemType)) {
      return { ok: false, reason: 'not_owned' };
    }

    const { ItemSystem } = require('./ItemSystem');
    const result = ItemSystem.useItem(this, fromSocketId, itemType, targetTrack);

    if (result.ok && !result.blocked) {
      // 移除道具
      from.items = from.items.filter((i) => i !== itemType);
    }

    return result;
  }

  computeRankings() {
    const sorted = [...this.players.values()]
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

  finalizeGame() {
    this.clearTimer();
    const rankings = this.computeRankings();
    this.broadcast('game_end', { rankings });
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
  }

  cleanup() {
    this.clearTimer();
    this.players.clear();
    this.trackMap.clear();
    this.playerIdToSocket.clear();
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.to(this.id).emit(event, data);
    }
  }

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      status: this.status,
      mapId: this.mapId,
      players: [...this.players.entries()],
      startedAt: this.startedAt,
      elapsed: this.elapsed,
    };
  }
}

module.exports = { GameRoom };
