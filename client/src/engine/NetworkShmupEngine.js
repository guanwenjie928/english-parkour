// 射击弹幕多人网络引擎 — Socket.io /shmup 命名空间客户端封装
// 与 ShmupEngine 共享相同的公共接口，ShmupScene 可透明切换
// 架构：乐观输入 + 服务端权威纠正
import { io } from 'socket.io-client';

export class NetworkShmupEngine {
  constructor(serverUrl = '') {
    this.isLocal = false;
    this.playerId = null;
    this.eventHandlers = new Map();

    // 连接 /shmup 命名空间（与旧跑酷模式的默认 / 隔离）
    this.socket = io(serverUrl + '/shmup', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    // === 客户端缓存状态（用于乐观预测） ===
    this.state = 'idle';          // idle → waiting → countdown → playing → ended
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hp = 5;
    this.maxHp = 5;
    this.wave = 0;
    this.mode = 'coop';
    this.elapsed = 0;

    // 玩家列表（含其他玩家，用于 HUD 显示）
    this.players = [];
    // 敌人缓存（用于乐观本地匹配）
    this._enemyCache = [];

    // 房间信息
    this.roomCode = null;
    this.playerName = null;
    this.isTeacher = false;
    this.isReady = false;

    // 等待服务端响应的 Promise 解析器
    this._pendingCallbacks = new Map();

    this._setupSocketListeners();
    this._setupConnectionHandling();
  }

  // ================================================================
  //  Socket 事件 → 本地事件转发
  // ================================================================
  _setupSocketListeners() {
    // --- 房间事件 ---
    this.socket.on('player_joined', (d) => {
      this.players = d.players || [];
      this.emit('player_joined', d);
    });
    this.socket.on('player_left', (d) => {
      this.players = d.players || [];
      this.emit('player_left', d);
    });
    this.socket.on('player_ready', (d) => {
      this.players = d.players || [];
      this.emit('player_ready', d);
    });
    this.socket.on('player_offline', (d) => {
      this.players = d.players || [];
      this.emit('player_offline', d);
    });
    this.socket.on('player_reconnected', (d) => {
      this.players = d.players || [];
      this.emit('player_reconnected', d);
    });
    this.socket.on('player_disconnected', (d) => {
      this.emit('player_disconnected', d);
    });

    // --- 游戏流程 ---
    this.socket.on('countdown', (d) => {
      this.state = 'countdown';
      this.emit('countdown', d);
    });

    this.socket.on('game_start', (d) => {
      this.state = 'playing';
      this.hp = d.hp;
      this.maxHp = d.maxHp;
      this.mode = d.mode || 'coop';
      this.wave = 0;
      this.score = 0;
      this.combo = 0;
      this.players = d.players || [];
      this._enemyCache = [];
      this.emit('game_start', d);
    });

    this.socket.on('wave_start', (d) => {
      this.wave = d.wave;
      this.emit('wave_start', d);
    });

    // --- 游戏数据 ---
    this.socket.on('enemy_spawn', (enemy) => {
      // 缓存敌人用于乐观匹配
      this._enemyCache.push(enemy);
      this.emit('enemy_spawn', enemy);
    });

    this.socket.on('position_sync', (d) => {
      // 服务端权威状态覆盖
      if (d.hp !== undefined) this.hp = d.hp;
      if (d.wave !== undefined) this.wave = d.wave;
      if (d.elapsed !== undefined) this.elapsed = d.elapsed;
      if (d.players) this.players = d.players;

      // 更新本地敌人缓存
      this._enemyCache = d.enemies || [];

      // 同步本地玩家分数
      const me = d.players?.find((p) => p.socketId === this.playerId);
      if (me) {
        this.score = me.score;
        this.combo = me.combo;
      }

      this.emit('position_sync', d);
    });

    this.socket.on('answer_result', (d) => {
      // 更新本地状态
      if (d.playerName === this.playerName) {
        if (d.correct) {
          this.score = d.score;
          this.combo = d.combo;
          // 从缓存移除被消灭的敌人
          if (d.enemy) {
            this._enemyCache = this._enemyCache.filter((e) => e.id !== d.enemy.id);
          }
        } else {
          this.combo = 0;
        }
        if (d.hp !== undefined) this.hp = d.hp;
      }
      this.emit('answer_result', d);
    });

    this.socket.on('enemy_hit_player', (d) => {
      if (d.hp !== undefined) this.hp = d.hp;
      // 从缓存移除越界的敌人
      if (d.enemy) {
        this._enemyCache = this._enemyCache.filter((e) => e.id !== d.enemy.id);
      }
      this.emit('enemy_hit_player', d);
    });

    this.socket.on('game_end', (d) => {
      this.state = 'ended';
      this.emit('game_end', d);
    });

    // --- 错误 ---
    this.socket.on('error', (d) => this.emit('error', d));
  }

  // ================================================================
  //  连接状态管理
  // ================================================================
  _setupConnectionHandling() {
    this.socket.on('connect', () => {
      this.playerId = this.socket.id;
      this.emit('connected', { socketId: this.socket.id });
    });

    this.socket.on('disconnect', (reason) => {
      this.emit('disconnected', { reason });
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.emit('reconnecting');
    });

    this.socket.io.on('reconnect', () => {
      this.playerId = this.socket.id;
      this.emit('reconnected', { socketId: this.socket.id });
    });

    this.socket.io.on('reconnect_failed', () => {
      this.emit('connection_failed');
    });
  }

  // ================================================================
  //  事件系统（与 ShmupEngine 兼容）
  // ================================================================
  on(event, handler) {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, new Set());
    this.eventHandlers.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    const h = this.eventHandlers.get(event);
    if (h) h.delete(handler);
    return this;
  }

  emit(event, data) {
    const h = this.eventHandlers.get(event);
    if (h) h.forEach((fn) => fn(data));
  }

  // ================================================================
  //  房间操作（Promise 风格，通过 ACK 回调获取结果）
  // ================================================================
  createRoom(playerName, mode = 'coop', difficulty = 1) {
    return new Promise((resolve) => {
      this.socket.emit('create_room', { playerName, mode, difficulty }, (result) => {
        if (result?.ok) {
          this.roomCode = result.room.code;
          this.playerName = playerName;
          this.isTeacher = true;
          this.mode = mode;
          this.players = result.room.players || [];
        }
        resolve(result);
      });
    });
  }

  joinRoom(code, playerName) {
    return new Promise((resolve) => {
      this.socket.emit('join_room', { code, playerName }, (result) => {
        if (result?.ok) {
          this.roomCode = code;
          this.playerName = playerName;
          this.isTeacher = false;
          this.mode = result.room?.mode || 'coop';
          this.players = result.room?.players || [];
        }
        resolve(result);
      });
    });
  }

  setReady() {
    this.isReady = true;
    this.socket.emit('player_ready', {});
  }

  startGame() {
    this.socket.emit('start_game', {});
  }

  leaveRoom() {
    this.socket.emit('leave_room', {});
    this.roomCode = null;
    this.players = [];
    this.isTeacher = false;
    this.isReady = false;
  }

  reconnect(code, playerName) {
    return new Promise((resolve) => {
      this.socket.emit('reconnect', { code, playerName }, (result) => {
        if (result?.ok) {
          this.roomCode = code;
          this.playerName = playerName;
          this.players = result.room?.players || [];
        }
        resolve(result);
      });
    });
  }

  // ================================================================
  //  游戏操作
  // ================================================================
  // 联网模式下游戏由服务端驱动，start() 为空操作
  start() {
    // 服务端在房间满员 + 房主点击开始后自动驱动游戏流程
    // 此方法仅为接口兼容保留
  }

  // 答题：乐观本地预测 + 服务端发送
  // 返回本地预测结果（用于即时 UI 反馈），服务端通过 answer_result 事件发送权威结果
  submitAnswer(answer) {
    if (this.state !== 'playing') return { ok: false, reason: 'not_playing' };

    const input = String(answer || '').trim().toLowerCase();
    if (!input) return { ok: false, reason: 'empty' };

    // 发送到服务端
    this.socket.emit('submit_answer', { answer: input });

    // 乐观本地匹配：基于缓存敌人列表预测结果
    const matched = this._enemyCache.find(
      (e) => String(e.word).toLowerCase() === input,
    );

    if (matched) {
      // 乐观移除缓存中的敌人
      this._enemyCache = this._enemyCache.filter((e) => e.id !== matched.id);
      return { ok: true, correct: true, enemy: matched, pending: true };
    }

    return { ok: true, correct: false, pending: true };
  }
}
