// 像素弹幕英语射击 — Phaser 场景
// 词敌从右侧飞来，玩家输入英文单词发射子弹消灭
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { burstParticles } from '../utils/AnimationHelper.js';

// === 像素街机调色板 ===
const PXL = Object.freeze({
  BG:       0x0a0a1e,  // 深空蓝黑
  STAR:     0xaaaaCC,
  STAR_B:   0x6666aa,
  PLAYER:   0x4aff6a,  // 霓虹绿
  PLAYER_D: 0x2aaf4a,  // 暗绿
  ENEMY:    0x3a1a4a,  // 暗紫
  ENEMY_B:  0x6a4afa,  // 紫边框
  BULLET:   0xffff6a,  // 亮黄子弹
  BULLET_T: 0xffaa2a,  // 子弹尾迹
  HEART_F:  0xff3a5a,  // 红心
  HEART_E:  0x2a2a4a,  // 空心
  EXPLODE:  0xff8a3a,  // 爆炸橙
  TEXT:     0xe8e8ff,  // 亮白文字
  TEXT_DIM: 0x8888aa,  // 暗文字
  ACCENT:   0x5abaff,  // 霓虹蓝
  PANEL:    0x12122a,  // 面板底
  INPUT:    0x0a0a1a,  // 输入底
  CORRECT:  0x4aff6a,  // 正确绿
  WRONG:    0xff3a5a,  // 错误红
  GOLD:     0xffd700,  // 金色（连击）
});

export class ShmupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShmupScene' });
    this.enemySprites = new Map();   // id → { container, wordText, meaningText, bg }
    this.bullets = [];               // { gfx, targetId, x, y, speed }
    this.stars = [];                 // 星空背景
    this.inputText = '';
    this.comboCount = 0;
    this.totalDestroyed = 0;
    this.gameStarted = false;
    this._lastPositionSync = null;
  }

  init(data) {
    this.roomCode = data?.code || 'SOLO';
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();
    this.soundGenerator.stopBGM();

    // 深空背景
    this.cameras.main.setBackgroundColor(PXL.BG);

    // === 1. 星空背景 ===
    this.createStarfield(width, height);

    // === 2. 扫描线覆盖（CRT 复古感）===
    this.createScanlines(width, height);

    // === 3. 玩家角色 ===
    this.createPlayer(width, height);

    // === 4. HUD ===
    this.createHUD(width, height);

    // === 5. 输入栏 ===
    this.createInputBar(width, height);

    // === 6. 引擎事件 ===
    this.setupEngineListeners(width, height);

    // === 7. 键盘监听 ===
    this.setupKeyboard();

    // === 8. 游戏循环 ===
    this.time.addEvent({
      delay: 16,
      callback: this.updateLoop,
      callbackScope: this,
      loop: true,
    });

    // 启动引擎
    window.network.start();
  }

  // ============================================================
  //  星空背景（视差滚动）
  // ============================================================
  createStarfield(w, h) {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      const layer = Math.random() < 0.3 ? 0 : (Math.random() < 0.5 ? 1 : 2);
      const speeds = [0.15, 0.3, 0.6];
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: layer === 0 ? 1 : (layer === 1 ? 1.5 : 2),
        alpha: 0.3 + Math.random() * 0.7,
        color: layer === 0 ? PXL.STAR_B : PXL.STAR,
        speed: speeds[layer],
        layer,
      });
    }
    this._starGfx = this.add.graphics().setDepth(0);
    this._drawStars();
  }

  _drawStars() {
    this._starGfx.clear();
    for (const s of this.stars) {
      this._starGfx.fillStyle(s.color, s.alpha);
      this._starGfx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
    }
  }

  // ============================================================
  //  CRT 扫描线
  // ============================================================
  createScanlines(w, h) {
    const scanGfx = this.add.graphics().setDepth(500).setAlpha(0.06);
    for (let y = 0; y < h; y += 3) {
      scanGfx.fillStyle(0x000000);
      scanGfx.fillRect(0, y, w, 1);
    }
  }

  // ============================================================
  //  像素风玩家角色（程序化绘制）
  // ============================================================
  createPlayer(w, h) {
    this.playerX = w * 0.12;
    this.playerY = h * 0.55;

    const gfx = this.add.graphics().setDepth(10);
    const px = this.playerX;
    const py = this.playerY;
    const s = Math.min(w, h) * 0.022; // 像素单元

    // 简易像素飞船角色
    const p = [
      // 机身（菱形）
      [0,-3], [0,-2], [0,-1], [0,0], [0,1], [0,2],
      [-1,-2], [-1,-1], [-1,0], [-1,1],
      [1,-2], [1,-1], [1,0], [1,1],
      [-2,-1], [-2,0], [2,-1], [2,0],
      // 引擎火焰
      [-1,2], [0,3], [1,2],
    ];

    // 阴影层
    for (const [dx, dy] of p) {
      gfx.fillStyle(PXL.PLAYER_D, 0.6);
      gfx.fillRect(px + (dx + 1) * s, py + (dy + 1) * s, s - 1, s - 1);
    }
    // 主体层
    for (const [dx, dy] of p) {
      gfx.fillStyle(dy >= 2 ? PXL.BULLET : PXL.PLAYER);
      gfx.fillRect(px + dx * s, py + dy * s, s - 1, s - 1);
    }

    // 引擎光晕动画
    this._engineGlow = this.add.circle(px, py + s * 3.5, s * 1.5, PXL.BULLET, 0.5).setDepth(9);
    this.tweens.add({
      targets: this._engineGlow,
      scaleX: 1.6,
      scaleY: 0.5,
      alpha: 0.2,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ============================================================
  //  HUD：HP 心、分数、波次、连击
  // ============================================================
  createHUD(w, h) {
    const hudY = Math.max(24, h * 0.04);
    const fontSize = Math.max(11, Math.min(16, w * 0.014));

    // HP 心（像素风小方块心形）
    this.hpHearts = [];
    this._hpGfx = this.add.graphics().setDepth(200);
    for (let i = 0; i < 5; i++) {
      this.hpHearts.push({ x: 16 + i * 28, y: hudY });
    }
    this._drawHP(5);

    // 分数
    this.scoreText = this.add.text(w / 2, hudY, '0', {
      fontSize: `${Math.max(18, fontSize * 1.4)}px`,
      fontFamily: 'Nunito',
      fontStyle: '800',
      color: '#e8e8ff',
    }).setOrigin(0.5, 0.5).setDepth(200);

    // 波次
    this.waveText = this.add.text(w / 2, hudY + fontSize * 1.6, 'WAVE 1', {
      fontSize: `${fontSize * 0.85}px`,
      fontFamily: 'Nunito',
      fontStyle: '600',
      color: '#5abaff',
    }).setOrigin(0.5, 0).setDepth(200);

    // 连击
    this.comboText = this.add.text(w - 16, hudY, '', {
      fontSize: `${fontSize * 1.1}px`,
      fontFamily: 'Nunito',
      fontStyle: '800',
      color: '#ffd700',
    }).setOrigin(1, 0.5).setDepth(200);

    // 倒计时
    this.timerText = this.add.text(w - 16, hudY + fontSize * 1.6, '', {
      fontSize: `${fontSize * 0.8}px`,
      fontFamily: 'Nunito',
      color: '#8888aa',
    }).setOrigin(1, 0).setDepth(200);
  }

  _drawHP(current) {
    this._hpGfx.clear();
    const s = 4; // 像素单元
    // 心形像素图案
    const heartPixels = [
      [0,2],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],
      [3,1],[3,2],[3,3],[4,2],
    ];
    for (let i = 0; i < 5; i++) {
      const hx = this.hpHearts[i].x;
      const hy = this.hpHearts[i].y - 8;
      const color = i < current ? PXL.HEART_F : PXL.HEART_E;
      for (const [dx, dy] of heartPixels) {
        this._hpGfx.fillStyle(color, i < current ? 1 : 0.4);
        this._hpGfx.fillRect(hx + dx * s - 10, hy + dy * s, s - 1, s - 1);
      }
    }
  }

  // ============================================================
  //  底部输入栏
  // ============================================================
  createInputBar(w, h) {
    const barH = 50;
    const barY = h - barH;
    const fontSize = Math.max(14, Math.min(20, w * 0.018));

    this.inputBarGfx = this.add.graphics().setDepth(200);
    this.inputBarGfx.fillStyle(PXL.INPUT, 0.95);
    this.inputBarGfx.fillRect(0, barY, w, barH);
    this.inputBarGfx.lineStyle(2, PXL.ACCENT, 0.5);
    this.inputBarGfx.lineBetween(0, barY, w, barY);

    // 提示文字
    this.add.text(16, barY + barH / 2, '>', {
      fontSize: `${fontSize}px`,
      fontFamily: 'Nunito',
      fontStyle: '800',
      color: '#4aff6a',
    }).setOrigin(0, 0.5).setDepth(201);

    // 输入文字
    this.inputDisplay = this.add.text(38, barY + barH / 2, '', {
      fontSize: `${fontSize}px`,
      fontFamily: 'Nunito',
      fontStyle: '700',
      color: '#e8e8ff',
    }).setOrigin(0, 0.5).setDepth(201);

    // 占位提示
    this.inputHint = this.add.text(w - 16, barY + barH / 2, 'Type & Enter →', {
      fontSize: `${fontSize * 0.7}px`,
      fontFamily: 'Nunito',
      color: '#666688',
    }).setOrigin(1, 0.5).setDepth(201);
  }

  // ============================================================
  //  引擎事件绑定
  // ============================================================
  setupEngineListeners(w, h) {
    const engine = window.network;

    engine.on('countdown', (data) => {
      this.showCountdown(data.count);
    });

    engine.on('game_start', (data) => {
      this.gameStarted = true;
      this._drawHP(data.hp);
      this.scoreText.setText('0');
      this.waveText.setText('WAVE 1');
    });

    engine.on('wave_start', (data) => {
      this.waveText.setText(`WAVE ${data.wave}`);
      // 波次提示弹出
      this.showWaveAnnounce(data.wave, w, h);
    });

    engine.on('enemy_spawn', (enemy) => {
      this.createEnemySprite(enemy, w, h);
    });

    engine.on('position_sync', (data) => {
      this._lastPositionSync = data;
      this.syncEnemyPositions(data.enemies);
      this._drawHP(data.hp);
      this.scoreText.setText(String(data.score));
      this.timerText.setText(this.formatTime(data.elapsed));
      if (data.combo >= 3) {
        this.comboText.setText(`COMBO x${data.combo}`);
        this.comboText.setAlpha(1);
      } else {
        this.comboText.setAlpha(0);
      }
      this.comboCount = data.combo;
    });

    engine.on('answer_result', (data) => {
      if (data.correct) {
        this.handleCorrectAnswer(data, w, h);
      } else {
        this.handleWrongAnswer(data, w, h);
      }
    });

    engine.on('enemy_hit_player', (data) => {
      this.handleEnemyHit(data, w, h);
    });

    engine.on('game_end', (data) => {
      this.handleGameEnd(data, w, h);
    });
  }

  // ============================================================
  //  词敌精灵创建
  // ============================================================
  createEnemySprite(enemy, w, h) {
    const ex = w * (enemy.x / 100); // 归一化 x → 屏幕坐标
    const ey = h * 0.2 + Math.random() * h * 0.5; // 随机 y 范围

    const fontSize = Math.max(10, Math.min(15, w * 0.014));
    const meaningSize = Math.max(9, Math.min(13, w * 0.012));

    // 敌机气泡背景
    const bubbleW = Math.max(80, enemy.word.length * fontSize * 0.8 + 32);
    const bubbleH = 44;

    const bg = this.add.graphics().setDepth(15);
    this._drawEnemyBubble(bg, ex, ey, bubbleW, bubbleH);

    // 英文单词
    const wordText = this.add.text(ex, ey - 6, enemy.word.toUpperCase(), {
      fontSize: `${fontSize}px`,
      fontFamily: 'Nunito',
      fontStyle: '800',
      color: '#e8e8ff',
    }).setOrigin(0.5).setDepth(16);

    // 中文释义
    const meaningText = this.add.text(ex, ey + 12, enemy.meaning, {
      fontSize: `${meaningSize}px`,
      fontFamily: 'ZCOOL KuaiLe',
      color: '#aaaacc',
    }).setOrigin(0.5).setDepth(16);

    // 存储引用
    this.enemySprites.set(enemy.id, {
      container: null,
      wordText,
      meaningText,
      bg,
      bubbleW,
      bubbleH,
      baseY: ey,
    });
  }

  _drawEnemyBubble(gfx, cx, cy, bw, bh, highlight = false) {
    gfx.clear();
    // 主体
    gfx.fillStyle(highlight ? 0x5a2a7a : PXL.ENEMY, 0.9);
    gfx.fillRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 6);
    // 边框
    gfx.lineStyle(1, highlight ? 0x8a6afa : PXL.ENEMY_B, 0.7);
    gfx.strokeRoundedRect(cx - bw / 2, cy - bh / 2, bw, bh, 6);
    // 顶部小角
    gfx.fillStyle(highlight ? 0x8a6afa : PXL.ENEMY_B, 0.6);
    gfx.fillTriangle(cx - 6, cy - bh / 2, cx + 6, cy - bh / 2, cx, cy - bh / 2 - 6);
  }

  // ============================================================
  //  同步敌人位置
  // ============================================================
  syncEnemyPositions(enemies) {
    const { width } = this.scale;
    for (const e of enemies) {
      const sprite = this.enemySprites.get(e.id);
      if (!sprite) {
        // 新敌人（可能漏了spawn事件）
        this.createEnemySprite(e, width, this.scale.height);
        continue;
      }
      const sx = width * (e.x / 100);
      sprite.wordText.x = sx;
      sprite.meaningText.x = sx;
      // 重绘背景在新位置
      this._drawEnemyBubble(sprite.bg, sx, sprite.baseY, sprite.bubbleW, sprite.bubbleH);
    }

    // 清理已死亡的敌人精灵
    const activeIds = new Set(enemies.map((e) => e.id));
    for (const [id, sprite] of this.enemySprites) {
      if (!activeIds.has(id)) {
        sprite.wordText.destroy();
        sprite.meaningText.destroy();
        sprite.bg.destroy();
        this.enemySprites.delete(id);
      }
    }
  }

  // ============================================================
  //  答对 — 子弹 + 爆炸
  // ============================================================
  handleCorrectAnswer(data, w, h) {
    const enemy = data.enemy;
    const sprite = this.enemySprites.get(enemy.id);
    this.soundGenerator.play('correct');

    if (sprite) {
      const ex = sprite.wordText.x;
      const ey = sprite.baseY;

      // 子弹从玩家飞向敌人
      this.createBullet(this.playerX + 20, this.playerY, ex, ey, () => {
        // 爆炸粒子
        this.createExplosion(ex, ey);
        // 分数弹出
        this.showScorePopup(ex, ey, data.combo);
      });

      // 立即移除敌人精灵（带闪烁）
      this.tweens.add({
        targets: [sprite.wordText, sprite.meaningText],
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 150,
        onComplete: () => {
          sprite.wordText.destroy();
          sprite.meaningText.destroy();
          sprite.bg.destroy();
          this.enemySprites.delete(enemy.id);
        },
      });
    }

    this.comboCount = data.combo;
    this.totalDestroyed++;
  }

  // ============================================================
  //  答错反馈
  // ============================================================
  handleWrongAnswer(data, w, h) {
    this.soundGenerator.play('wrong');
    this.cameras.main.shake(200, 0.005);

    // 屏幕红闪
    const flash = this.add.rectangle(w / 2, h / 2, w, h, PXL.WRONG, 0.15)
      .setDepth(400);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    this.comboCount = 0;
  }

  // ============================================================
  //  敌人到达左边界 — 玩家受伤
  // ============================================================
  handleEnemyHit(data, w, h) {
    const enemy = data.enemy;
    const sprite = this.enemySprites.get(enemy.id);
    this.soundGenerator.play('wrong');

    if (sprite) {
      // 红色爆炸
      this.createExplosion(sprite.wordText.x, sprite.baseY, true);
      sprite.wordText.destroy();
      sprite.meaningText.destroy();
      sprite.bg.destroy();
      this.enemySprites.delete(enemy.id);
    }

    this.cameras.main.shake(300, 0.008);
    // 红闪
    const flash = this.add.rectangle(w / 2, h / 2, w, h, PXL.WRONG, 0.2).setDepth(400);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });

    this._drawHP(data.hp);
  }

  // ============================================================
  //  游戏结束
  // ============================================================
  handleGameEnd(data, w, h) {
    this.gameStarted = false;

    // Game Over 文字
    const goText = this.add.text(w / 2, h * 0.3, 'GAME OVER', {
      fontSize: `${Math.max(36, h * 0.07)}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color: '#ff3a5a',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({
      targets: goText,
      alpha: 1,
      scaleX: { from: 2, to: 1 },
      scaleY: { from: 2, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
    });

    // 统计面板
    const statsY = h * 0.48;
    const stats = [
      `SCORE: ${data.score}`,
      `MAX COMBO: ${data.combo}`,
      `WORDS DESTROYED: ${data.destroyed}`,
      `WAVE REACHED: ${data.wave}`,
    ];

    stats.forEach((text, i) => {
      const st = this.add.text(w / 2, statsY + i * 28, text, {
        fontSize: `${Math.max(14, w * 0.018)}px`,
        fontFamily: 'Nunito',
        fontStyle: '700',
        color: '#e8e8ff',
      }).setOrigin(0.5).setDepth(300).setAlpha(0);

      this.tweens.add({
        targets: st,
        alpha: 1,
        y: st.y - 10,
        duration: 400,
        delay: 600 + i * 150,
        ease: 'Cubic.easeOut',
      });
    });

    // 重新开始按钮
    const btnY = h * 0.72;
    const btnW = 220;
    const btnH = 48;
    const btnGfx = this.add.graphics().setDepth(300).setAlpha(0);
    btnGfx.fillStyle(PXL.ACCENT, 0.9);
    btnGfx.fillRoundedRect(w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);
    btnGfx.lineStyle(2, 0x8adaff, 0.5);
    btnGfx.strokeRoundedRect(w / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 8);

    const btnText = this.add.text(w / 2, btnY, 'PLAY AGAIN', {
      fontSize: '18px',
      fontFamily: 'Nunito',
      fontStyle: '800',
      color: '#0a0a1e',
    }).setOrigin(0.5).setDepth(301).setAlpha(0);

    const btnHit = this.add.rectangle(w / 2, btnY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(302);

    btnHit.on('pointerdown', () => {
      this.cleanupAndRestart();
    });

    this.tweens.add({
      targets: [btnGfx, btnText],
      alpha: 1,
      duration: 500,
      delay: 1400,
    });
  }

  cleanupAndRestart() {
    // 清理所有敌人
    for (const [, sprite] of this.enemySprites) {
      sprite.wordText?.destroy();
      sprite.meaningText?.destroy();
      sprite.bg?.destroy();
    }
    this.enemySprites.clear();
    this.bullets = [];
    this.inputText = '';
    this.inputDisplay.setText('');
    this.comboCount = 0;
    this.totalDestroyed = 0;
    this.gameStarted = false;

    this.scene.restart();
  }

  // ============================================================
  //  子弹特效
  // ============================================================
  createBullet(fromX, fromY, toX, toY, onHit) {
    const gfx = this.add.graphics().setDepth(25);
    const bullet = { gfx, x: fromX, y: fromY, toX, toY, onHit, alive: true };
    this.bullets.push(bullet);

    // 子弹音效
    this.soundGenerator.play('click');
  }

  updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.alive) {
        b.gfx.destroy();
        this.bullets.splice(i, 1);
        continue;
      }

      const dx = b.toX - b.x;
      const dy = b.toY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 8;

      if (dist < speed) {
        b.alive = false;
        b.gfx.clear();
        if (b.onHit) b.onHit();
      } else {
        b.x += (dx / dist) * speed;
        b.y += (dy / dist) * speed;
        b.gfx.clear();
        // 子弹主体
        b.gfx.fillStyle(PXL.BULLET);
        b.gfx.fillRect(b.x - 3, b.y - 1, 6, 2);
        // 尾迹
        b.gfx.fillStyle(PXL.BULLET_T, 0.6);
        b.gfx.fillRect(b.x - 8, b.y, 5, 1);
      }
    }
  }

  // ============================================================
  //  爆炸粒子（像素风方块）
  // ============================================================
  createExplosion(x, y, isDamage = false) {
    const color = isDamage ? PXL.WRONG : PXL.EXPLODE;
    const count = isDamage ? 8 : 16;
    const gfx = this.add.graphics().setDepth(30);

    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.floor(Math.random() * 3),
        life: 0.4 + Math.random() * 0.3,
        alpha: 1,
      });
    }

    const update = () => {
      gfx.clear();
      let alive = false;
      for (const p of particles) {
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04;
          p.life -= 0.025;
          p.alpha = p.life;
          gfx.fillStyle(color, p.alpha);
          gfx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          alive = true;
        }
      }
      if (alive) {
        this.time.delayedCall(16, update);
      } else {
        gfx.destroy();
      }
    };
    update();
  }

  // ============================================================
  //  分数弹出
  // ============================================================
  showScorePopup(x, y, combo) {
    const points = 100 + (combo > 1 ? Math.min(combo - 1, 10) * 20 : 0);
    const isCombo = combo >= 3;
    const color = isCombo ? '#ffd700' : '#4aff6a';
    const size = isCombo ? '20px' : '16px';

    const text = this.add.text(x, y - 20, `+${points}`, {
      fontSize: size,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(250);

    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // ============================================================
  //  波次公告
  // ============================================================
  showWaveAnnounce(wave, w, h) {
    const text = this.add.text(w / 2, h * 0.35, `WAVE ${wave}`, {
      fontSize: `${Math.max(28, h * 0.05)}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color: '#5abaff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(250).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scaleX: { from: 1.5, to: 1 },
      scaleY: { from: 1.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          y: text.y - 30,
          duration: 600,
          delay: 800,
          ease: 'Cubic.easeIn',
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  // ============================================================
  //  3-2-1-GO 倒计时
  // ============================================================
  showCountdown(count) {
    const { width, height } = this.scale;
    const size = Math.max(60, Math.min(120, height * 0.15));
    const text = count === 0 ? 'GO!' : String(count);
    const color = count === 0 ? '#4aff6a' : (count <= 2 ? '#ff3a5a' : '#5abaff');

    const overlay = this.add.text(width / 2, height / 2, text, {
      fontSize: `${size}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(300);

    overlay.setScale(2).setAlpha(0);
    this.tweens.add({
      targets: overlay,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: overlay,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 500,
          delay: 100,
          ease: 'Cubic.easeIn',
          onComplete: () => overlay.destroy(),
        });
      },
    });

    this.soundGenerator.play(count === 0 ? 'victory' : 'countdown');
  }

  // ============================================================
  //  键盘监听
  // ============================================================
  setupKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (!this.gameStarted) return;

      if (event.key === 'Enter') {
        this.fireWord();
        return;
      }
      if (event.key === 'Backspace') {
        this.inputText = this.inputText.slice(0, -1);
        this.inputDisplay.setText(this.inputText);
        this.soundGenerator.play('click');
        return;
      }
      if (event.key === 'Escape') {
        this.inputText = '';
        this.inputDisplay.setText('');
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key) && event.key.length === 1) {
        if (this.inputText.length < 25) {
          this.inputText += event.key.toLowerCase();
          this.inputDisplay.setText(this.inputText);
          this.soundGenerator.play('click');
        }
      }
    });

    // 移动端：输入栏点击聚焦
    this.input.keyboard.on('keyup', () => {
      // no-op, handled in keydown
    });
  }

  fireWord() {
    if (!this.inputText.trim() || !this.gameStarted) return;
    const result = window.network.submitAnswer(this.inputText.trim());

    // 清空输入
    this.inputText = '';
    this.inputDisplay.setText('');

    if (result.correct) {
      // 输入栏绿闪
      const { width, height } = this.scale;
      const barH = 50;
      const barY = height - barH;
      const flash = this.add.rectangle(width / 2, barY + barH / 2, width, barH, PXL.CORRECT, 0.15)
        .setDepth(199);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => flash.destroy(),
      });
    } else if (result.ok) {
      // 输入栏红闪
      const { width, height } = this.scale;
      const barH = 50;
      const barY = height - barH;
      const flash = this.add.rectangle(width / 2, barY + barH / 2, width, barH, PXL.WRONG, 0.15)
        .setDepth(199);
      this.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 300,
        onComplete: () => flash.destroy(),
      });
    }
  }

  // ============================================================
  //  主更新循环
  // ============================================================
  updateLoop() {
    // 星空滚动
    const { width } = this.scale;
    for (const s of this.stars) {
      s.x -= s.speed;
      if (s.x < -5) s.x = width + 5;
    }
    this._drawStars();

    // 子弹更新
    this.updateBullets();
  }

  // ============================================================
  //  工具
  // ============================================================
  formatTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  shutdown() {
    this.soundGenerator?.stopBGM();
  }
}
