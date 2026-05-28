// 射击弹幕型英语跑酷 — 本地游戏引擎
// 词敌从右侧飞来，拼对发射子弹消灭，拼错/超时扣血
import { getWordBank } from './WordBank.js';

export class ShmupEngine {
  constructor() {
    this.isLocal = true;
    this.playerId = 'player-' + Math.random().toString(36).slice(2, 8);
    this.eventHandlers = new Map();
    this.socket = { id: this.playerId };

    this.wordBank = getWordBank();

    // 游戏状态
    this.state = 'idle'; // idle → countdown → playing → ended
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hp = 5;
    this.maxHp = 5;
    this.wave = 0;
    this.totalWordsDestroyed = 0;
    this.totalWordsMissed = 0;

    // 活跃词敌列表
    this.activeEnemies = [];
    this.enemyIdSeq = 0;

    // 波次配置
    this.waveTimer = null;
    this.tickTimer = null;
    this.startedAt = null;
    this.elapsed = 0;
    this.waveInterval = 6000; // 波次间隔 ms
    this.enemySpawnInterval = 2000; // 每波内敌人生成间隔 ms

    // 已用单词（避免短期重复）
    this._usedWords = new Set();
    this._wordPool = [];

    this._tick = this._tick.bind(this);
  }

  // === 事件系统（与 NetworkManager 兼容）===
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

  // === 游戏控制 ===
  start() {
    this.state = 'countdown';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hp = this.maxHp;
    this.wave = 0;
    this.totalWordsDestroyed = 0;
    this.totalWordsMissed = 0;
    this.activeEnemies = [];
    this._usedWords.clear();
    this._initWordPool();

    let count = 3;
    this.emit('countdown', { count });
    const cdTimer = setInterval(() => {
      count--;
      if (count > 0) {
        this.emit('countdown', { count });
      } else {
        clearInterval(cdTimer);
        this.emit('countdown', { count: 0 });
        this._startPlaying();
      }
    }, 800);
  }

  _startPlaying() {
    this.state = 'playing';
    this.startedAt = Date.now();
    this.elapsed = 0;
    this.emit('game_start', { hp: this.hp, maxHp: this.maxHp });

    // 第一波立即开始
    this._startNextWave();
    this.waveTimer = setInterval(() => this._startNextWave(), this.waveInterval);
    this.tickTimer = setInterval(this._tick, 50);
  }

  _startNextWave() {
    if (this.state !== 'playing') return;
    this.wave++;
    const enemyCount = 2 + Math.min(this.wave, 6); // 2 → 8 个
    this.emit('wave_start', { wave: this.wave, count: enemyCount });

    // 在波次内逐个生成敌人
    let spawned = 0;
    const spawnOne = () => {
      if (this.state !== 'playing') return;
      if (spawned >= enemyCount) return;
      this._spawnEnemy();
      spawned++;
      if (spawned < enemyCount) {
        setTimeout(spawnOne, this.enemySpawnInterval - this.wave * 100);
      }
    };
    spawnOne();
  }

  _spawnEnemy() {
    const word = this._pickWord();
    if (!word) return;

    const enemy = {
      id: 'enemy-' + (this.enemyIdSeq++),
      word: word.word,
      meaning: word.meaning,
      x: 100, // 归一化 x: 0(左) → 100(右，初始位置)
      speed: 0.3 + Math.random() * 0.5 + this.wave * 0.05, // 越来越快
      hp: 1,
    };

    this.activeEnemies.push(enemy);
    this.emit('enemy_spawn', enemy);
  }

  _pickWord() {
    if (this._wordPool.length === 0) this._initWordPool();
    // 避免重复
    for (let i = 0; i < this._wordPool.length; i++) {
      const w = this._wordPool[i];
      if (!this._usedWords.has(w.word)) {
        this._usedWords.add(w.word);
        this._wordPool.splice(i, 1);
        return w;
      }
    }
    // 全部用过，重置
    this._usedWords.clear();
    this._initWordPool();
    return this._pickWord();
  }

  _initWordPool() {
    this._wordPool = this.wordBank.getAllWords().slice();
    // Fisher-Yates shuffle
    for (let i = this._wordPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._wordPool[i], this._wordPool[j]] = [this._wordPool[j], this._wordPool[i]];
    }
  }

  // === 核心 Tick ===
  _tick() {
    if (this.state !== 'playing') return;
    this.elapsed = Date.now() - this.startedAt;

    // 移动所有敌人
    for (const enemy of this.activeEnemies) {
      enemy.x -= enemy.speed;
    }

    // 检测到达危险区的敌人
    const missed = this.activeEnemies.filter((e) => e.x <= 0);
    for (const enemy of missed) {
      this.hp = Math.max(0, this.hp - 1);
      this.combo = 0;
      this.totalWordsMissed++;
      this.emit('enemy_hit_player', { enemy, hp: this.hp });
    }
    this.activeEnemies = this.activeEnemies.filter((e) => e.x > 0);

    // 游戏结束检查
    if (this.hp <= 0) {
      this._endGame();
      return;
    }

    // 清理到达边缘但未触发的（x<=0 已经在上面处理了）
    this.emit('position_sync', {
      enemies: this.activeEnemies.map((e) => ({
        id: e.id, x: e.x, word: e.word, meaning: e.meaning,
      })),
      hp: this.hp,
      score: this.score,
      combo: this.combo,
      wave: this.wave,
      elapsed: this.elapsed,
    });
  }

  // === 答题 ===
  submitAnswer(answer) {
    if (this.state !== 'playing') return { ok: false, reason: 'not_playing' };

    const input = answer.trim().toLowerCase();
    if (!input) return { ok: false, reason: 'empty' };

    // 查找匹配的敌人
    const target = this.activeEnemies.find((e) => e.word.toLowerCase() === input);

    if (target) {
      // 命中！
      this.activeEnemies = this.activeEnemies.filter((e) => e.id !== target.id);
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.totalWordsDestroyed++;

      // 计分：基础 100 + combo 加成
      const comboBonus = Math.min(this.combo - 1, 10) * 20;
      this.score += 100 + comboBonus;

      this.emit('answer_result', {
        correct: true,
        enemy: target,
        score: this.score,
        combo: this.combo,
        hp: this.hp,
      });

      return { ok: true, correct: true, enemy: target };
    } else {
      // 拼错
      this.combo = 0;
      this.emit('answer_result', {
        correct: false,
        score: this.score,
        combo: this.combo,
        hp: this.hp,
      });
      return { ok: true, correct: false };
    }
  }

  // === 结束 ===
  _endGame() {
    this.state = 'ended';
    clearInterval(this.waveTimer);
    clearInterval(this.tickTimer);
    this.emit('game_end', {
      score: this.score,
      combo: this.maxCombo,
      destroyed: this.totalWordsDestroyed,
      missed: this.totalWordsMissed,
      wave: this.wave,
    });
  }
}
