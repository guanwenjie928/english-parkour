import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { GHIBLI, PLAYER_COLORS } from '../utils/ColorConfig.js';
import { burstParticles } from '../utils/AnimationHelper.js';
import { clamp, lerp } from '../utils/helpers.js';

const C = GHIBLI;
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

// === LF2 横轴卷轴常量 ===
const WORLD = Object.freeze({
  WIDTH: 10000,
  HEIGHT: 768,
  START_X: 200,
  FINISH_X: 9600,
  TRACK_COUNT: 8,
});

// Camera 平滑跟随配置
const CAMERA = Object.freeze({
  SMOOTH: 0.06,
  DEAD_ZONE: 60,
});

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.players = new Map();
    this.myTrack = 1;
    this.mySocketId = null;
    this.items = [];
    this.wordChallenge = null;
    this.comboCount = 0;
    this.starCount = 0;
    this.totalCorrect = 0;
    this.gameStarted = false;
    this._speedLineTimer = 0;
  }

  init(data) {
    this.roomCode = data.code;
    this.isTeacher = data.isTeacher || false;

    if (this.isTeacher) {
      this.scene.start('TeacherScene', { code: this.roomCode });
      return;
    }
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    this.soundGenerator.stopBGM();
    this.soundGenerator.playBGM('game');

    // 世界边界
    this.cameras.main.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

    // === 1. 三层视差背景（纯代码绘制，不依赖外部图片）===
    this.createParallaxBackgrounds(width, height);

    // === 2. 世界空间跑道 ===
    this.createTracks(width, height);

    // === 3. 起点/终点线 ===
    this.createStartFinishLines();

    // === 4. HUD ===
    this.createHUD(width, height);

    // === 5. 虚拟键盘 ===
    this.createVirtualKeyboard(width, height);
    this.setupPhysicalKeyboard();

    this.mySocketId = window.network.socket.id;

    // === 6. 玩家加入事件 ===
    this.handleLateJoin();

    // === 7. 网络事件 ===
    this.setupNetworkListeners();

    // === 8. 游戏主循环 ===
    this.time.addEvent({
      delay: 50,
      callback: this.gameLoop,
      callbackScope: this,
      loop: true,
    });
  }

  // ==============================================================
  //  视差背景 — 使用真实背景图 + 天空渐变
  // ==============================================================
  createParallaxBackgrounds(viewW, viewH) {
    // --- 天空渐变 (scrollFactor 0, depth 0) ---
    const skyColors = [C.ACCENT, 0xb8e0e0, 0xc8ddd0, C.BG_CREAM];
    const bandH = Math.ceil(viewH / skyColors.length);
    const skyContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(0);
    skyColors.forEach((color, i) => {
      skyContainer.add(this.add.rectangle(viewW / 2, i * bandH + bandH / 2, viewW, bandH + 1, color, 0.6));
    });

    // --- 三层视差背景（真实图片素材）---
    // 远山/地平线层 — 慢速滚动
    if (this.textures.exists('bg-city-far')) {
      this.add.tileSprite(0, 0, WORLD.WIDTH, viewH, 'bg-city-far')
        .setOrigin(0).setScrollFactor(0.08).setDepth(1);
    }
    // 中景层 — 中速滚动
    if (this.textures.exists('bg-city-mid')) {
      this.add.tileSprite(0, 0, WORLD.WIDTH, viewH, 'bg-city-mid')
        .setOrigin(0).setScrollFactor(0.25).setDepth(2);
    }
    // 近景层 — 较快速滚动
    if (this.textures.exists('bg-city-near')) {
      this.add.tileSprite(0, 0, WORLD.WIDTH, viewH, 'bg-city-near')
        .setOrigin(0).setScrollFactor(0.45).setDepth(3);
    }
  }

  // ==============================================================
  //  世界空间跑道
  // ==============================================================
  createTracks(viewW, viewH) {
    this.tracks = [];
    const trackH = viewH / WORLD.TRACK_COUNT;

    for (let i = 0; i < WORLD.TRACK_COUNT; i++) {
      const y = trackH * i + trackH / 2;

      // 跑道背景（圆角矩形风格）
      const fillColor = i % 2 === 0 ? C.BG_CREAM : C.BG_SAND;
      const fillAlpha = i % 2 === 0 ? 0.45 : 0.35;
      const trackBg = this.add.rectangle(
        WORLD.WIDTH / 2, y, WORLD.WIDTH, trackH - 3,
        fillColor, fillAlpha
      ).setDepth(5);

      // 柔和分隔线（虚线风格：每隔一段画一个点）
      const dashGfx = this.add.graphics().setDepth(6);
      dashGfx.lineStyle(1, C.ACCENT, 0.25);
      dashGfx.lineBetween(0, y - trackH / 2, WORLD.WIDTH, y - trackH / 2);
      dashGfx.lineBetween(0, y + trackH / 2, WORLD.WIDTH, y + trackH / 2);

      // 跑道编号
      this.add.text(WORLD.START_X - 30, y, `${i + 1}`, {
        fontSize: '11px',
        fontFamily: FONT,
        fontStyle: '700',
        color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(8);

      this.tracks.push({ y, height: trackH, bg: trackBg });
    }
  }

  // ==============================================================
  //  起点线 / 终点线
  // ==============================================================
  createStartFinishLines() {
    const { height } = this.scale;

    // 起点线（柔和绿虚线）
    const startGfx = this.add.graphics().setDepth(8);
    for (let y = 0; y < height; y += 14) {
      startGfx.fillStyle(C.PRIMARY, 0.7);
      startGfx.fillRoundedRect(WORLD.START_X - 1, y, 3, 9, 1);
    }
    this.add.text(WORLD.START_X + 8, height - 18, 'START', {
      fontSize: '10px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0, 1).setDepth(8);

    // 终点线（暖色棋盘格 → 柔和竖条纹）
    const finishGfx = this.add.graphics().setDepth(8);
    for (let y = 0; y < height; y += 14) {
      for (let dx = 0; dx < 10; dx += 5) {
        const stripeColor = ((y / 14) + (dx / 5)) % 2 === 0 ? C.BG_CREAM : C.TEXT_WARM;
        finishGfx.fillStyle(stripeColor, 0.85);
        finishGfx.fillRoundedRect(WORLD.FINISH_X + dx, y, 5, 14, 1);
      }
    }
    this.add.text(WORLD.FINISH_X - 6, height - 18, 'FINISH', {
      fontSize: '10px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
    }).setOrigin(1, 1).setDepth(8);
  }

  // ==============================================================
  //  HUD（scrollFactor 0，始终固定在屏幕上）
  // ==============================================================
  createHUD(viewW, viewH) {
    // --- 顶部信息栏 ---
    const headerY = 28;
    const headerH = 46;

    const headerGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
    headerGfx.fillStyle(C.BG_CREAM, 0.85);
    headerGfx.fillRoundedRect(8, headerY - headerH / 2, viewW - 16, headerH, 10);
    headerGfx.lineStyle(1, C.ACCENT, 0.3);
    headerGfx.strokeRoundedRect(8, headerY - headerH / 2, viewW - 16, headerH, 10);

    // 计时器（左侧）
    this.timerText = this.add.text(28, headerY, '90', {
      fontSize: '22px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // 连击/星星（计时器右侧）
    const fontSizeSm = Math.max(11, viewW * 0.011);
    this.comboText = this.add.text(72, headerY - 6, '', {
      fontSize: `${fontSizeSm}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    this.starText = this.add.text(72, headerY + 8, '', {
      fontSize: `${fontSizeSm}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#ffd700',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);

    // 排名（右侧）
    this.rankText = this.add.text(viewW - 28, headerY, '', {
      fontSize: '14px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    // --- 迷你进度条（header 下方，响应式）---
    const barY = headerY + headerH / 2 + 8;
    const barMargin = viewW * 0.09;
    const barW = viewW - barMargin * 2;
    const barX = barMargin;
    const barH = Math.max(4, viewH * 0.006);

    const barBgGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
    barBgGfx.fillStyle(C.BG_SAND, 0.6);
    barBgGfx.fillRoundedRect(barX, barY, barW, barH, 3);
    barBgGfx.lineStyle(1, C.ACCENT, 0.2);
    barBgGfx.strokeRoundedRect(barX, barY, barW, barH, 3);

    this.progressDots = [];
    for (let i = 0; i < WORLD.TRACK_COUNT; i++) {
      const dotX = barX + 4;
      const dotSize = 7;
      const dot = this.add.circle(dotX, barY + barH / 2, dotSize, PLAYER_COLORS[i].tint)
        .setScrollFactor(0).setDepth(101);
      this.progressDots.push({ dot, dotSize, progress: 0 });
    }

    // --- 道具面板 ---
    this.createItemPanel(viewW, viewH);
  }

  createItemPanel(viewW, viewH) {
    // 响应式布局：面板大小基于屏幕尺寸比例
    const minDim = Math.min(viewW, viewH);
    const panelW = Math.max(100, viewW * 0.16);
    const panelH = Math.max(70, minDim * 0.14);
    const margin = viewW * 0.02;
    const panelX = viewW - panelW - margin;
    const panelY = viewH - panelH - margin;

    const panelGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
    panelGfx.fillStyle(C.BG_CREAM, 0.85);
    panelGfx.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panelGfx.lineStyle(1, C.ACCENT, 0.3);
    panelGfx.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);

    const labelSize = Math.max(8, minDim * 0.015);
    this.add.text(panelX + panelW / 2, panelY + panelH * 0.18, 'ITEMS', {
      fontSize: `${labelSize}px`,
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // 道具槽位尺寸和间距基于面板大小
    const slotSize = Math.max(36, panelW * 0.35);
    const slotGap = panelW * 0.08;
    const totalSlotsW = 2 * slotSize + slotGap;
    const slotsStartX = panelX + (panelW - totalSlotsW) / 2;
    const slotsY = panelY + panelH * 0.62;

    this.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const sx = slotsStartX + slotSize / 2 + i * (slotSize + slotGap);
      const sy = slotsY;

      const slotGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
      slotGfx.fillStyle(C.BG_SAND, 0.7);
      slotGfx.fillRoundedRect(sx - slotSize / 2, sy - slotSize / 2, slotSize, slotSize, 8);
      slotGfx.lineStyle(1, C.ACCENT, 0.4);
      slotGfx.strokeRoundedRect(sx - slotSize / 2, sy - slotSize / 2, slotSize, slotSize, 8);

      const slotHit = this.add.rectangle(sx, sy, slotSize, slotSize, 0x000000, 0)
        .setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(102);

      // 图标缩放基于槽位大小（items-strip 原始帧约 464px）
      const iconScale = slotSize / 464;
      const icon = this.add.image(sx, sy, 'items-strip')
        .setVisible(false).setScrollFactor(0).setDepth(101).setScale(iconScale);

      slotHit.on('pointerdown', () => this.useItem(i));

      this.itemSlots.push({ slotGfx, icon, itemType: null, hitArea: slotHit, iconScale });
    }
  }

  // ==============================================================
  //  玩家创建（世界坐标）
  // ==============================================================
  createPlayer(data) {
    const trackData = this.tracks[data.trackNumber - 1];
    if (!trackData) return;

    if (!this.textures.exists('run-sheet')) return;

    const startX = this.progressToWorldX(0);

    const sprite = this.add.sprite(startX, trackData.y, 'run-sheet')
      .setScale(0.35).setDepth(50);

    if (this.anims.exists('run')) {
      sprite.play('run');
    }

    const nameText = this.add.text(startX, trackData.y - 48, data.name || '', {
      fontSize: '11px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
      backgroundColor: '#' + C.BG_CREAM.toString(16).padStart(6, '0') + 'cc',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setDepth(51);

    const color = PLAYER_COLORS[data.trackNumber - 1];

    // 头顶彩色圆点标识（替代全角色 tint，保留原画细节）
    const colorDot = this.add.circle(startX, trackData.y - 58, 5, color.tint, 0.9)
      .setDepth(51).setStrokeStyle(1, 0xffffff, 0.6);

    this.players.set(data.socketId, {
      socketId: data.socketId,
      sprite,
      nameText,
      colorDot,
      trackNumber: data.trackNumber,
      progress: 0,
      speed: 1,
      shielded: false,
      currentPose: 'run',
    });
  }

  // ==============================================================
  //  姿态切换系统
  // ==============================================================
  setPlayerPose(player, poseName) {
    if (!player || player.currentPose === poseName) return;
    player.currentPose = poseName;

    const poseSheet = this.textures.get('pose-sheet');
    if (!poseSheet) return;

    if (poseName === 'run') {
      player.sprite.play('run');
    } else {
      player.sprite.stop();
      const frameKey = `pose_${poseName}`;
      if (poseSheet.has(frameKey)) {
        player.sprite.setTexture('pose-sheet', frameKey);
      }
    }
  }

  // ==============================================================
  //  进度→世界坐标映射
  // ==============================================================
  progressToWorldX(progress) {
    return WORLD.START_X + (progress / 100) * (WORLD.FINISH_X - WORLD.START_X);
  }

  // ==============================================================
  //  延迟加入处理
  // ==============================================================
  handleLateJoin() {
    const room = window.network.room;
    if (!room || room.status !== 'playing') return;

    room.players.forEach((p) => {
      if (p.socketId !== this.mySocketId && !this.players.has(p.socketId)) {
        this.createPlayer(p);
        const player = this.players.get(p.socketId);
        if (player) {
          player.progress = p.progress;
          player.shielded = !!p.effects?.shielded;
          const wx = this.progressToWorldX(p.progress);
          player.sprite.x = wx;
          player.nameText.x = wx;
        }
      }
    });

    const me = room.players.get(this.mySocketId);
    if (me?.currentChallenge) {
      const ch = me.currentChallenge;
      this.showWordChallenge({
        seq: room.wordChallengeSeq,
        type: ch.type,
        display: ch.display,
        wordId: ch.wordId,
        timeLimit: 10,
      });
    }
  }

  // ==============================================================
  //  网络事件监听
  // ==============================================================
  setupNetworkListeners() {
    window.network.on('countdown', (data) => this.showCountdown(data.count));
    window.network.on('position_sync', (data) => this.updatePlayers(data));
    window.network.on('word_challenge', (data) => this.showWordChallenge(data));
    window.network.on('answer_result', (data) => this.handleAnswerResult(data));
    window.network.on('item_reward', (data) => this.addItem(data.item));
    window.network.on('item_effect', (data) => this.showItemEffect(data));
    window.network.on('game_end', (data) => {
      this.scene.start('ResultScene', { rankings: data.rankings });
    });
  }

  // ==============================================================
  //  位置同步
  // ==============================================================
  updatePlayers(data) {
    data.forEach((p) => {
      if (!this.players.has(p.socketId)) {
        this.createPlayer(p);
      }
      const player = this.players.get(p.socketId);
      if (!player) return;

      player.progress = p.progress;
      player.speed = p.speed;
      player.trackNumber = p.trackNumber;

      if (p.shielded && !player.shielded) {
        this.setPlayerPose(player, 'shield');
      } else if (!p.shielded && player.shielded) {
        this.setPlayerPose(player, 'run');
      }
      player.shielded = p.shielded;

      // 更新迷你进度条
      const dotData = this.progressDots[p.trackNumber - 1];
      if (dotData) {
        dotData.progress = p.progress;
        const barW = this.scale.width - 180;
        const barX = 80;
        const newX = barX + (p.progress / 100) * barW;
        dotData.dot.x = newX;
      }
    });

    const me = this.players.get(this.mySocketId);
    if (me) {
      this.myTrack = me.trackNumber;
      const sorted = [...this.players.values()].sort((a, b) => b.progress - a.progress);
      const myRank = sorted.findIndex((p) => p.socketId === this.mySocketId) + 1;
      this.rankText.setText(myRank > 0 ? `#${myRank}/${sorted.length}` : '');
    }
  }

  // ==============================================================
  //  3-2-1-GO 开场倒计时动画（仪式感）
  // ==============================================================
  showCountdown(count) {
    const { width, height } = this.scale;
    const size = Math.max(80, Math.min(150, height * 0.2));

    const text = count === 0 ? 'GO!' : String(count);
    const color = count === 0 ? C.HIGHLIGHT : (count <= 2 ? C.ERROR : C.PRIMARY);

    const overlay = this.add.text(width / 2, height / 2, text, {
      fontSize: `${size}px`,
      fontFamily: FONT,
      fontStyle: '900',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);

    // 弹入 + 缩放淡出
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
          duration: 600,
          ease: 'Cubic.easeIn',
          onComplete: () => overlay.destroy(),
        });
      },
    });

    // GO! 时启动游戏
    if (count === 0) {
      this.gameStarted = true;
    }

    this.soundGenerator.play(count === 0 ? 'victory' : 'click');
  }

  // ==============================================================
  //  单词挑战 UI（圆角治愈风格）
  // ==============================================================
  showWordChallenge(data) {
    this.wordChallenge = data;
    this.currentInput = '';
    this.inputDisplay.setText('');

    if (data.type === 'cn_to_en') {
      this.meaningText.setText(data.display);
      this.blankText.setText('???');
    } else {
      this.meaningText.setText('填空拼写');
      this.blankText.setText(data.display);
    }

    // 键盘容器从底部滑入（不暂停游戏！）
    this.keyboardContainer.setVisible(true);
    this.keyboardContainer.setAlpha(0);
    this.keyboardContainer.y = 200; // 从底部下方开始
    this.tweens.add({
      targets: this.keyboardContainer,
      alpha: 1,
      y: 0,
      duration: 350,
      ease: 'Back.easeOut',
    });

    this.timeLeft = 10;
    this.answerTimerBar.setScale(1, 1);
    this.answerTimerBar.setFillStyle(C.PRIMARY);

    if (this.timerEvent) this.timerEvent.remove();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.answerTimerBar.setScale(this.timeLeft / 10, 1);
        if (this.timeLeft <= 5) {
          this.answerTimerBar.setFillStyle(C.HIGHLIGHT);
        }
        if (this.timeLeft <= 3) {
          this.answerTimerBar.setFillStyle(C.ERROR);
        }
        if (this.timeLeft <= 0) {
          this.submitAnswer();
        }
      },
      repeat: 9,
    });

    // 游戏不暂停！玩家可以边看比赛边拼写
  }

  handleKeyInput(key) {
    if (this.currentInput.length < 20) {
      this.currentInput += key.toLowerCase();
      this.inputDisplay.setText(this.currentInput);
      this.soundGenerator.play('click');
    }
  }

  handleBackspace() {
    this.currentInput = this.currentInput.slice(0, -1);
    this.inputDisplay.setText(this.currentInput);
    this.soundGenerator.play('click');
  }

  submitAnswer() {
    if (this.timerEvent) this.timerEvent.remove();
    // 面板向下滑出
    this.tweens.add({
      targets: this.keyboardContainer,
      alpha: 0,
      y: 200,
      duration: 250,
      ease: 'Cubic.easeIn',
      onComplete: () => this.keyboardContainer.setVisible(false),
    });
    this.answerTimerBar.setFillStyle(C.PRIMARY);

    window.network.submitAnswer(this.currentInput);
    this.wordChallenge = null;
  }

  handleAnswerResult(data) {
    const player = this.players.get(this.mySocketId);
    if (!player) return;

    if (data.correct) {
      player.speed = data.newSpeed;
      player.progress = data.progress;
      this.soundGenerator.play('correct');

      // 粒子爆发
      burstParticles(this, player.sprite.x, player.sprite.y, C.PRIMARY, 12);

      // 连击系统
      this.comboCount++;
      this.totalCorrect++;
      if (this.comboCount >= 3) {
        this.showComboFX(player.sprite.x, player.sprite.y);
      }

      // 星星收集：每 5 题正确掉落一颗星
      if (this.totalCorrect % 5 === 0) {
        this.starCount++;
        this.showStarFX(player.sprite.x, player.sprite.y);
      }

      // 闪绿
      player.sprite.setTint(0xaaffaa);
      this.time.delayedCall(250, () => {
        if (player.sprite?.active) player.sprite.clearTint();
      });
    } else {
      player.speed = data.newSpeed;
      player.progress = data.progress;
      this.soundGenerator.play('wrong');

      // 连击中断
      this.comboCount = 0;

      // 屏幕微震
      this.cameras.main.shake(180, 0.004);

      // 闪红
      player.sprite.setTint(0xff9999);
      this.time.delayedCall(300, () => {
        if (player.sprite?.active) player.sprite.clearTint();
      });
    }
  }

  // ==============================================================
  //  道具系统
  // ==============================================================
  addItem(itemType) {
    const emptySlot = this.itemSlots.find((s) => !s.itemType);
    if (!emptySlot) return;

    emptySlot.itemType = itemType;
    emptySlot.icon.setVisible(true);

    const frameName = `item-${itemType}`;
    if (this.textures.get('items-strip').has(frameName)) {
      emptySlot.icon.setFrame(frameName);
    }
    this.soundGenerator.play('item_get');

    // 道具弹入动画（使用响应式缩放）
    const targetScale = emptySlot.iconScale || 0.1;
    emptySlot.icon.setScale(0);
    this.tweens.add({
      targets: emptySlot.icon,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 300,
      ease: 'Back.easeOut',
    });
  }

  useItem(slotIndex) {
    const slot = this.itemSlots[slotIndex];
    if (!slot.itemType) return;

    if (['electric', 'banana'].includes(slot.itemType)) {
      this.showTargetSelector(slot.itemType, slotIndex);
      return;
    }
    window.network.useItem(slot.itemType);
    this.clearItemSlot(slotIndex);
  }

  showTargetSelector(itemType, slotIndex) {
    const targets = [...this.players.values()]
      .filter((p) => p.socketId !== this.mySocketId)
      .sort((a, b) => b.progress - a.progress);
    if (targets.length === 0) return;

    const target = targets[0];
    window.network.useItem(itemType, target.trackNumber);
    this.clearItemSlot(slotIndex);
  }

  clearItemSlot(index) {
    const slot = this.itemSlots[index];
    slot.itemType = null;
    slot.icon.setVisible(false);
  }

  // ==============================================================
  //  道具特效
  // ==============================================================
  showItemEffect(data) {
    const from = this.players.get(data.fromId);
    const to = this.players.get(data.toId);
    if (!from || !to) return;

    if (data.itemType === 'electric') {
      this.createLightningEffect(from.sprite, to.sprite);
      this.setPlayerPose(to, 'stun');
      this.soundGenerator.play('electric');
      this.cameras.main.shake(150, 0.003);
    } else if (data.itemType === 'rocket') {
      this.createRocketEffect(from.sprite);
      this.soundGenerator.play('rocket');
      // 冲刺闪光
      burstParticles(this, from.sprite.x - 20, from.sprite.y, C.HIGHLIGHT, 8);
    } else if (data.itemType === 'banana') {
      this.setPlayerPose(to, 'slide');
      this.soundGenerator.play('banana');
      // 滑倒粒子
      burstParticles(this, to.sprite.x, to.sprite.y + 10, C.SUNSET, 6);
    } else if (data.itemType === 'shield') {
      this.createShieldEffect(to.sprite);
      this.setPlayerPose(to, 'shield');
      this.soundGenerator.play('shield');
    }
  }

  createLightningEffect(from, to) {
    // 使用 vfx-strip 电击精灵动画，放置于两个玩家之间
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;

    if (this.anims.exists('electric-hit')) {
      const lightning = this.add.sprite(midX, midY, 'vfx-strip')
        .setDepth(55).setScale(0.5);
      lightning.play('electric-hit');
      lightning.once('animationcomplete', () => lightning.destroy());
    }
  }

  createRocketEffect(sprite) {
    // 火箭火焰粒子（精灵动画 + 粒子混合）
    const fireGfx = this.add.graphics().setDepth(55);
    let fireFrame = 0;
    const fireTimer = this.time.addEvent({
      delay: 50,
      callback: () => {
        if (!fireGfx.active || !sprite.active) { fireTimer.remove(); return; }
        fireGfx.clear();
        fireFrame++;
        const fx = sprite.x - 40;
        const fy = sprite.y;
        for (let i = 0; i < 4; i++) {
          const offset = Math.sin(fireFrame * 0.5 + i) * 5;
          const size = 3 + (fireFrame % 4);
          const colors = [0xfff3cd, C.HIGHLIGHT, C.SUNSET, C.ERROR];
          fireGfx.fillStyle(colors[i], 0.7);
          fireGfx.fillCircle(fx - i * 10, fy + offset, size);
        }
      },
      repeat: 20,
    });
    this.time.delayedCall(1200, () => fireGfx.destroy());
  }

  createShieldEffect(sprite) {
    // 使用 vfx-strip 护盾精灵动画，覆盖在角色上
    if (this.anims.exists('shield-bubble')) {
      const shield = this.add.sprite(sprite.x, sprite.y, 'vfx-strip')
        .setDepth(55).setScale(0.5);
      shield.play('shield-bubble');
      shield.once('animationcomplete', () => shield.destroy());
    }
  }

  // ==============================================================
  //  底部浮动拼写面板（不遮挡游戏画面）
  // ==============================================================
  createVirtualKeyboard(viewW, viewH) {
    const keys = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ];
    // 响应式按键尺寸
    const minDim = Math.min(viewW, viewH);
    const keySize = Math.max(34, Math.min(52, minDim * 0.082));
    const gap = Math.max(3, keySize * 0.09);
    const fontSize = Math.max(14, keySize * 0.38);

    // 底部面板高度：32% 屏幕高
    const panelH = viewH * 0.34;
    const panelY = viewH - panelH;
    const panelPad = 14;

    this.keyboardContainer = this.add.container(0, 0);
    this.keyboardContainer.setVisible(false).setDepth(200).setScrollFactor(0);

    // === 半透明底栏（仅覆盖面板区域，上方游戏可见）===
    const panelBg = this.add.graphics();
    panelBg.fillStyle(C.BG_CREAM, 0.95);
    panelBg.fillRoundedRect(0, panelY - 8, viewW, panelH + 8, 18);
    panelBg.lineStyle(2, C.ACCENT, 0.35);
    panelBg.strokeRoundedRect(0, panelY - 8, viewW, panelH + 8, 18);
    this.keyboardContainer.add(panelBg);

    // 顶部拖拽指示条
    const handleGfx = this.add.graphics();
    handleGfx.fillStyle(C.ACCENT, 0.4);
    handleGfx.fillRoundedRect(viewW / 2 - 20, panelY + 4, 40, 3, 2);
    this.keyboardContainer.add(handleGfx);

    // === 题目行（面板内顶部）===
    const questionY = panelY + panelPad + 6;
    this.wordChallengeContainer = this.add.container(viewW / 2, questionY);
    this.keyboardContainer.add(this.wordChallengeContainer);

    // 中文释义
    this.meaningText = this.add.text(0, 0, '', {
      fontSize: `${Math.max(13, viewH * 0.022)}px`,
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.meaningText);

    // 挖空/拼写（下方12px）
    this.blankText = this.add.text(0, this.meaningText.height / 2 + 10, '', {
      fontSize: `${Math.max(24, viewH * 0.045)}px`,
      fontFamily: FONT,
      fontStyle: '800',
      color: '#' + C.TEXT_DARK.toString(16).padStart(6, '0'),
      letterSpacing: 6,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.blankText);

    // 输入显示区域
    const inputY = this.blankText.y + this.blankText.height / 2 + 12;
    this.inputDisplay = this.add.text(0, inputY, '', {
      fontSize: `${Math.max(18, viewH * 0.032)}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.inputDisplay);

    // 倒计时条（输入框下方）
    const timerY = inputY + 18;
    const timerW = Math.min(280, viewW * 0.5);
    const timerH = 5;
    const timerBg = this.add.graphics();
    timerBg.fillStyle(C.BG_SAND, 0.6);
    timerBg.fillRoundedRect(-timerW / 2, timerY - timerH / 2, timerW, timerH, 3);
    this.wordChallengeContainer.add(timerBg);

    this.answerTimerBar = this.add.rectangle(0, timerY, timerW, timerH, C.PRIMARY);
    const timerMaskGfx = this.add.graphics();
    timerMaskGfx.fillStyle(0xffffff);
    timerMaskGfx.fillRoundedRect(-timerW / 2, timerY - timerH / 2, timerW, timerH, 3);
    this.answerTimerBar.setMask(timerMaskGfx.createGeometryMask());
    this.wordChallengeContainer.add(this.answerTimerBar);

    // === 键盘行（面板内）===
    const keyStartY = panelY + panelH * 0.38;
    keys.forEach((row, rowIdx) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const startX = (viewW - rowWidth) / 2;

      row.forEach((key, colIdx) => {
        const kx = startX + colIdx * (keySize + gap);
        const ky = keyStartY + rowIdx * (keySize + gap);

        const keyBg = this.add.graphics();
        keyBg.fillStyle(C.BG_CREAM, 0.9);
        keyBg.fillRoundedRect(kx, ky, keySize, keySize, 8);
        keyBg.lineStyle(1, C.ACCENT, 0.35);
        keyBg.strokeRoundedRect(kx, ky, keySize, keySize, 8);

        const label = this.add.text(kx + keySize / 2, ky + keySize / 2, key, {
          fontSize: `${fontSize}px`,
          fontFamily: FONT,
          fontStyle: '700',
          color: '#' + C.TEXT_DARK.toString(16).padStart(6, '0'),
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(kx + keySize / 2, ky + keySize / 2, keySize, keySize, 0x000000, 0)
          .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => {
          this.handleKeyInput(key);
          keyBg.clear();
          keyBg.fillStyle(C.PRIMARY, 0.6);
          keyBg.fillRoundedRect(kx + 1, ky + 1, keySize - 2, keySize - 2, 7);
          label.setColor('#ffffff');
          this.time.delayedCall(150, () => {
            if (!keyBg.active) return;
            keyBg.clear();
            keyBg.fillStyle(C.BG_CREAM, 0.9);
            keyBg.fillRoundedRect(kx, ky, keySize, keySize, 8);
            keyBg.lineStyle(1, C.ACCENT, 0.35);
            keyBg.strokeRoundedRect(kx, ky, keySize, keySize, 8);
            label.setColor('#' + C.TEXT_DARK.toString(16).padStart(6, '0'));
          });
        });

        hitArea.on('pointerover', () => {
          keyBg.clear();
          keyBg.fillStyle(C.ACCENT, 0.5);
          keyBg.fillRoundedRect(kx - 1, ky - 1, keySize + 2, keySize + 2, 9);
        });

        hitArea.on('pointerout', () => {
          keyBg.clear();
          keyBg.fillStyle(C.BG_CREAM, 0.9);
          keyBg.fillRoundedRect(kx, ky, keySize, keySize, 8);
          keyBg.lineStyle(1, C.ACCENT, 0.35);
          keyBg.strokeRoundedRect(kx, ky, keySize, keySize, 8);
        });

        this.keyboardContainer.add([keyBg, label, hitArea]);
      });
    });

    // === 控制键 ===
    const ctrlY = keyStartY + 3 * (keySize + gap) + 6;
    const ctrlH = keySize * 0.85;

    // DEL 键
    const delW = keySize * 1.8;
    const delX = viewW / 2 - keySize * 2.2;
    const delBg = this.add.graphics();
    delBg.fillStyle(C.ERROR, 0.12);
    delBg.fillRoundedRect(delX - delW / 2, ctrlY - ctrlH / 2, delW, ctrlH, 7);
    const delLabel = this.add.text(delX, ctrlY, 'DEL', {
      fontSize: `${fontSize * 0.75}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.ERROR.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    const delHit = this.add.rectangle(delX, ctrlY, delW, ctrlH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    delHit.on('pointerdown', () => this.handleBackspace());
    this.keyboardContainer.add([delBg, delLabel, delHit]);

    // ENTER 键
    const enterW = keySize * 3;
    const enterX = viewW / 2 + keySize * 0.8;
    const enterBg = this.add.graphics();
    enterBg.fillStyle(C.PRIMARY, 0.8);
    enterBg.fillRoundedRect(enterX - enterW / 2, ctrlY - ctrlH / 2, enterW, ctrlH, 7);
    const enterLabel = this.add.text(enterX, ctrlY, '确 定', {
      fontSize: `${fontSize * 0.85}px`,
      fontFamily: FONT_CN,
      color: '#ffffff',
    }).setOrigin(0.5);
    const enterHit = this.add.rectangle(enterX, ctrlY, enterW, ctrlH, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    enterHit.on('pointerdown', () => this.submitAnswer());
    enterHit.on('pointerover', () => {
      enterBg.clear();
      enterBg.fillStyle(0x7fb069, 0.9);
      enterBg.fillRoundedRect(enterX - enterW / 2 - 1, ctrlY - ctrlH / 2 - 1, enterW + 2, ctrlH + 2, 8);
    });
    enterHit.on('pointerout', () => {
      enterBg.clear();
      enterBg.fillStyle(C.PRIMARY, 0.8);
      enterBg.fillRoundedRect(enterX - enterW / 2, ctrlY - ctrlH / 2, enterW, ctrlH, 7);
    });
    this.keyboardContainer.add([enterBg, enterLabel, enterHit]);
  }

  setupPhysicalKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (!this.keyboardContainer?.visible) return;
      if (event.key === 'Enter') { this.submitAnswer(); return; }
      if (event.key === 'Backspace') { this.handleBackspace(); return; }
      if (/^[a-zA-Z]$/.test(event.key) && event.key.length === 1) {
        this.handleKeyInput(event.key);
      }
    });
  }

  // ==============================================================
  //  游戏主循环
  // ==============================================================
  gameLoop() {
    const me = this.players.get(this.mySocketId);
    if (!me) return;

    // 刷新连击/星星 HUD
    if (this.comboText && this.comboCount >= 3) {
      this.comboText.setText(`🔥 x${this.comboCount}`);
      this.comboText.setAlpha(1);
    } else if (this.comboText) {
      this.comboText.setAlpha(0);
    }
    if (this.starText && this.starCount > 0) {
      this.starText.setText(`⭐ ${this.starCount}`);
    }

    // Camera 平滑跟随
    const targetCamX = me.sprite.x - this.scale.width * 0.4;
    this.cameras.main.scrollX = lerp(
      this.cameras.main.scrollX,
      clamp(targetCamX, 0, WORLD.WIDTH - this.scale.width),
      CAMERA.SMOOTH
    );

    // 更新所有玩家世界坐标
    this.players.forEach((player) => {
      const targetX = this.progressToWorldX(player.progress);
      player.sprite.x = lerp(player.sprite.x, targetX, 0.1);
      player.nameText.x = player.sprite.x;
      if (player.colorDot) player.colorDot.x = player.sprite.x;
    });

    // 速度线（高速度时）
    if (me.speed >= 3) {
      this._speedLineTimer += 50;
      if (this._speedLineTimer >= 60) {
        this._speedLineTimer = 0;
        this._drawSpeedLines(me);
      }
    }
  }

  _drawSpeedLines(player) {
    const gfx = this.add.graphics().setDepth(49);
    for (let i = 0; i < 3; i++) {
      const lx = player.sprite.x - 30 - Math.random() * 20;
      const ly = player.sprite.y - 10 + Math.random() * 20;
      gfx.fillStyle(C.HIGHLIGHT, 0.35);
      gfx.fillRoundedRect(lx, ly, 8 + Math.random() * 12, 2, 1);
    }
    this.time.delayedCall(200, () => gfx.destroy());
  }

  // ==============================================================
  //  连击特效（3+ 连击时触发）
  // ==============================================================
  showComboFX(x, y) {
    const { width } = this.scale;
    const fontSize = Math.max(28, Math.min(52, width * 0.045));

    const comboText = this.add.text(x, y - 50, `🔥 ${this.comboCount} 连击!`, {
      fontSize: `${fontSize}px`,
      fontFamily: FONT,
      fontStyle: '900',
      color: '#' + C.HIGHLIGHT.toString(16).padStart(6, '0'),
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(250);

    // 弹跳 + 上浮消失
    comboText.setScale(0.3);
    this.tweens.add({
      targets: comboText,
      scaleX: 1.2,
      scaleY: 1.2,
      y: y - 80,
      duration: 600,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: comboText,
      alpha: 0,
      y: y - 110,
      duration: 400,
      delay: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => comboText.destroy(),
    });

    // 额外金色粒子
    burstParticles(this, x, y - 20, C.HIGHLIGHT, 8);
  }

  // ==============================================================
  //  星星收集特效（每 5 题正确触发）
  // ==============================================================
  showStarFX(x, y) {
    const { width } = this.scale;

    // 大星星
    const starText = this.add.text(x, y - 60, '⭐', {
      fontSize: `${Math.max(36, width * 0.05)}px`,
    }).setOrigin(0.5).setDepth(250);

    starText.setScale(0);
    this.tweens.add({
      targets: starText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: starText,
      alpha: 0,
      y: y - 100,
      duration: 500,
      delay: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => starText.destroy(),
    });

    // 星星粒子
    burstParticles(this, x, y - 15, 0xffd700, 10);
  }

  shutdown() {
    this.soundGenerator.stopBGM();
  }
}
