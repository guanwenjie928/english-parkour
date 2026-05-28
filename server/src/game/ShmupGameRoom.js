// 射击弹幕多人房间 — 服务端权威游戏逻辑
// 状态机驱动 + 波次系统 + 敌人生成/移动/碰撞 + 答题验证
const { Logger } = require('../core/Logger');

const STATE_MACHINE = Object.freeze({
  waiting: {
    allowedTransitions: new Set(['countdown', 'closed']),
    onEnter: (room) => { room._clearTimers(); },
  },
  countdown: {
    allowedTransitions: new Set(['playing', 'waiting']),
    onEnter: (room) => room._startCountdown(),
  },
  playing: {
    allowedTransitions: new Set(['ended', 'waiting']),
    onEnter: (room) => room._startGameLoop(),
  },
  ended: {
    allowedTransitions: new Set(['waiting', 'closed']),
    onEnter: (room) => room._finalizeGame(),
  },
  closed: {
    allowedTransitions: new Set([]),
    onEnter: (room) => room.cleanup(),
  },
});

class ShmupGameRoom {
  static MAX_PLAYERS = 8;
  static TICK_RATE = 50;       // 20Hz 状态同步
  static RECONNECT_WINDOW = 30000;
  static BASE_HP = 5;          // 竞技模式单人HP
  static COOP_HP = 10;         // 协作模式共享HP

  constructor(id, code, config = {}) {
    this.id = id;
    this.code = code;
    this.status = 'waiting';
    this.mode = config.mode || 'coop'; // 'coop' | 'competitive'
    this.difficulty = config.difficulty || 1;

    // 玩家
    this.players = new Map();          // socketId → PlayerState
    this.playerIdToSocket = new Map(); // db playerId → socketId

    // 运行时
    this._timer = null;
    this._tickTimer = null;
    this._waveTimer = null;
    this._startedAt = null;
    this._elapsed = 0;
    this._io = null;

    // 射击游戏特有
    this.wave = 0;
    this.activeEnemies = [];
    this._enemyIdSeq = 0;
    this._wordPool = [];
    this._usedWords = new Set();

    // 单词引擎（外部注入）
    this.wordEngine = null;

    // 波次配置
    this._waveInterval = 6000;
    this._enemySpawnInterval = 2000;
    this._spawnTimer = null;

    // 时间戳
    this.createdAt = Date.now();
  }

  // === 状态转换 ===
  transition(newStatus) {
    const current = STATE_MACHINE[this.status];
    if (!current?.allowedTransitions.has(newStatus)) {
      return { ok: false, reason: `invalid_transition: ${this.status} → ${newStatus}` };
    }
    const prev = this.status;
    this.status = newStatus;
    Logger.info('room_transition', { room: this.code, from: prev, to: newStatus });
    STATE_MACHINE[newStatus].onEnter(this);
    return { ok: true };
  }

  // === 玩家管理 ===
  addPlayer(socketId, data = {}) {
    if (this.players.size >= ShmupGameRoom.MAX_PLAYERS) {
      return { ok: false, reason: 'room_full' };
    }
    if (this.status !== 'waiting') {
      return { ok: false, reason: 'game_in_progress' };
    }

    const player = {
      socketId,
      name: data.name || 'Player',
      isTeacher: !!data.isTeacher,
      isReady: false,
      isOnline: true,
      score: 0,
      combo: 0,
      maxCombo: 0,
      hp: this.mode === 'coop' ? ShmupGameRoom.COOP_HP : ShmupGameRoom.BASE_HP,
      wordsDestroyed: 0,
      wordsMissed: 0,
      connectedAt: Date.now(),
    };

    this.players.set(socketId, player);
    return { ok: true, player };
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    // 清理 playerIdToSocket 映射
    for (const [pid, sid] of this.playerIdToSocket) {
      if (sid === socketId) { this.playerIdToSocket.delete(pid); break; }
    }
  }

  setPlayerReady(socketId, ready = true) {
    const player = this.players.get(socketId);
    if (!player) return { ok: false, reason: 'player_not_found' };
    player.isReady = ready;
    return { ok: true };
  }

  allReady() {
    if (this.players.size < 2) return false;
    return [...this.players.values()].every((p) => p.isReady);
  }

  // === 倒计时 ===
  _startCountdown() {
    let count = 3;
    this.broadcast('countdown', { count });

    this._timer = setInterval(() => {
      count--;
      if (count > 0) {
        this.broadcast('countdown', { count });
      } else {
        clearInterval(this._timer);
        this._timer = null;
        this.broadcast('countdown', { count: 0 });
        this.transition('playing');
      }
    }, 800);
  }

  // === 游戏主循环 ===
  _startGameLoop() {
    this.wave = 0;
    this.activeEnemies = [];
    this._enemyIdSeq = 0;
    this._usedWords.clear();
    this._initWordPool();
    this._startedAt = Date.now();

    // 重置协作HP
    if (this.mode === 'coop') {
      const hp = ShmupGameRoom.COOP_HP;
      this.players.forEach((p) => { p.hp = hp; p.score = 0; p.combo = 0; });
    }

    this.broadcast('game_start', {
      mode: this.mode,
      hp: this._getSharedHP(),
      maxHp: this.mode === 'coop' ? ShmupGameRoom.COOP_HP : ShmupGameRoom.BASE_HP,
      players: this._serializePlayers(),
    });

    // 第一波立即开始
    this._startNextWave();
    // 后续波次定时器
    this._waveTimer = setInterval(() => this._startNextWave(), this._waveInterval);
    // Tick 循环
    this._tickTimer = setInterval(() => this._tick(), ShmupGameRoom.TICK_RATE);
  }

  _startNextWave() {
    if (this.status !== 'playing') return;
    this.wave++;
    const enemyCount = 2 + Math.min(this.wave, 6);
    this.broadcast('wave_start', { wave: this.wave, count: enemyCount });

    let spawned = 0;
    const interval = Math.max(600, this._enemySpawnInterval - this.wave * 100);
    const spawnOne = () => {
      if (this.status !== 'playing') return;
      if (spawned >= enemyCount) return;
      this._spawnEnemy();
      spawned++;
      if (spawned < enemyCount) {
        this._spawnTimer = setTimeout(spawnOne, interval);
      }
    };
    spawnOne();
  }

  _spawnEnemy() {
    const word = this._pickWord();
    if (!word) return;

    const enemy = {
      id: 'enemy-' + (this._enemyIdSeq++),
      word: word.word,
      meaning: word.meaning,
      x: 100,
      speed: 0.3 + Math.random() * 0.5 + this.wave * 0.05,
      hp: 1,
    };

    this.activeEnemies.push(enemy);
    this.broadcast('enemy_spawn', enemy);
  }

  // === Tick：移动 + 碰撞 ===
  _tick() {
    if (this.status !== 'playing') return;
    this._elapsed = Date.now() - this._startedAt;

    // 移动所有敌人
    for (const enemy of this.activeEnemies) {
      enemy.x -= enemy.speed;
    }

    // 检测到达危险区的敌人
    const missed = this.activeEnemies.filter((e) => e.x <= 0);
    for (const enemy of missed) {
      if (this.mode === 'coop') {
        // 协作：共享HP扣血
        this.players.forEach((p) => { p.hp = Math.max(0, p.hp - 1); p.combo = 0; });
      } else {
        // 竞技：每个在线玩家扣血
        this.players.forEach((p) => {
          if (p.isOnline) { p.hp = Math.max(0, p.hp - 1); p.combo = 0; }
        });
      }
      this.broadcast('enemy_hit_player', {
        enemy: { id: enemy.id, word: enemy.word, meaning: enemy.meaning },
        hp: this._getSharedHP(),
      });
    }
    this.activeEnemies = this.activeEnemies.filter((e) => e.x > 0);

    // 游戏结束检查
    const aliveCount = [...this.players.values()].filter((p) => p.hp > 0).length;
    if (aliveCount === 0) {
      this.transition('ended');
      return;
    }

    // 状态同步
    this.broadcast('position_sync', {
      enemies: this.activeEnemies.map((e) => ({
        id: e.id, x: e.x, word: e.word, meaning: e.meaning,
      })),
      players: this._serializePlayers(),
      hp: this._getSharedHP(),
      wave: this.wave,
      elapsed: this._elapsed,
    });
  }

  // === 答题验证（服务端权威） ===
  submitAnswer(socketId, answer) {
    if (this.status !== 'playing') return { ok: false, reason: 'not_playing' };

    const player = this.players.get(socketId);
    if (!player) return { ok: false, reason: 'player_not_found' };
    if (player.hp <= 0) return { ok: false, reason: 'player_dead' };

    const input = String(answer || '').trim().toLowerCase();
    if (!input) return { ok: false, reason: 'empty' };

    // 查找匹配的敌人
    const targetIndex = this.activeEnemies.findIndex(
      (e) => String(e.word).toLowerCase() === input,
    );

    if (targetIndex >= 0) {
      const target = this.activeEnemies[targetIndex];
      this.activeEnemies.splice(targetIndex, 1);

      // 更新玩家统计
      player.combo++;
      if (player.combo > player.maxCombo) player.maxCombo = player.combo;
      player.wordsDestroyed++;
      const comboBonus = Math.min(player.combo - 1, 10) * 20;
      const points = 100 + comboBonus;
      player.score += points;

      const result = {
        ok: true,
        correct: true,
        enemy: target,
        score: player.score,
        combo: player.combo,
        hp: this._getSharedHP(),
        playerName: player.name,
      };

      // 广播结果给所有人
      this.broadcast('answer_result', result);
      return result;
    }

    // 拼错 — 重置连击
    player.combo = 0;
    const result = {
      ok: true,
      correct: false,
      score: player.score,
      combo: 0,
      hp: this._getSharedHP(),
      playerName: player.name,
    };
    this.broadcast('answer_result', result);
    return result;
  }

  // === 结束 ===
  _finalizeGame() {
    this._clearTimers();

    // 找出胜者
    let winner = null;
    let maxScore = -1;
    this.players.forEach((p) => {
      if (p.score > maxScore) { maxScore = p.score; winner = p; }
    });

    this.broadcast('game_end', {
      players: this._serializePlayers(),
      winner: winner ? { name: winner.name, score: winner.score } : null,
      wave: this.wave,
    });
  }

  // === 单词选择 ===
  _pickWord() {
    if (!this.wordEngine) {
      // 无 wordEngine 时用简单回退
      const fallback = ['apple', 'banana', 'cat', 'dog', 'egg', 'fish', 'girl', 'house', 'ice', 'jump'];
      const w = fallback[Math.floor(Math.random() * fallback.length)];
      const idx = this._enemyIdSeq;
      return { word: w, meaning: `单词${idx}` };
    }
    if (this._wordPool.length === 0) this._initWordPool();
    for (let i = 0; i < this._wordPool.length; i++) {
      const w = this._wordPool[i];
      if (!this._usedWords.has(w.word)) {
        this._usedWords.add(w.word);
        this._wordPool.splice(i, 1);
        return w;
      }
    }
    this._usedWords.clear();
    this._initWordPool();
    return this._pickWord();
  }

  _initWordPool() {
    if (this.wordEngine) {
      this._wordPool = [...this.wordEngine.byId.values()];
    } else {
      const fallback = [
        { word: 'apple', meaning: '苹果' }, { word: 'banana', meaning: '香蕉' },
        { word: 'cat', meaning: '猫' }, { word: 'dog', meaning: '狗' },
        { word: 'egg', meaning: '鸡蛋' }, { word: 'fish', meaning: '鱼' },
        { word: 'girl', meaning: '女孩' }, { word: 'house', meaning: '房子' },
        { word: 'ice', meaning: '冰' }, { word: 'jump', meaning: '跳' },
        { word: 'king', meaning: '国王' }, { word: 'lion', meaning: '狮子' },
        { word: 'moon', meaning: '月亮' }, { word: 'nose', meaning: '鼻子' },
        { word: 'orange', meaning: '橙子' }, { word: 'pig', meaning: '猪' },
        { word: 'queen', meaning: '女王' }, { word: 'rabbit', meaning: '兔子' },
        { word: 'sun', meaning: '太阳' }, { word: 'tree', meaning: '树' },
      ];
      this._wordPool = [...fallback];
    }
    // Fisher-Yates shuffle
    for (let i = this._wordPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._wordPool[i], this._wordPool[j]] = [this._wordPool[j], this._wordPool[i]];
    }
  }

  // === 工具方法 ===
  _getSharedHP() {
    if (this.mode === 'coop') {
      const first = this.players.values().next().value;
      return first ? first.hp : ShmupGameRoom.COOP_HP;
    }
    // 竞技模式返回最小HP（用于显示）
    let minHp = Infinity;
    this.players.forEach((p) => { if (p.hp < minHp) minHp = p.hp; });
    return minHp === Infinity ? 0 : minHp;
  }

  _serializePlayers() {
    return [...this.players.values()].map((p) => ({
      socketId: p.socketId,
      name: p.name,
      score: p.score,
      combo: p.combo,
      hp: p.hp,
      isOnline: p.isOnline,
      isReady: p.isReady,
    }));
  }

  broadcast(event, data) {
    if (this._io) {
      this._io.to(this.id).emit(event, data);
    }
  }

  _clearTimers() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._tickTimer) { clearInterval(this._tickTimer); this._tickTimer = null; }
    if (this._waveTimer) { clearInterval(this._waveTimer); this._waveTimer = null; }
    if (this._spawnTimer) { clearTimeout(this._spawnTimer); this._spawnTimer = null; }
  }

  cleanup() {
    this._clearTimers();
    this.players.clear();
    this.activeEnemies = [];
    this._usedWords.clear();
    this._wordPool = [];
    Logger.info('shmup_room_cleaned', { code: this.code });
  }

  toJSON() {
    return {
      id: this.id,
      code: this.code,
      status: this.status,
      mode: this.mode,
      wave: this.wave,
      players: this._serializePlayers(),
      elapsed: this._elapsed,
    };
  }
}

module.exports = { ShmupGameRoom, STATE_MACHINE };
