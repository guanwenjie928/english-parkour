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

    // 排名（右侧）
    this.rankText = this.add.text(viewW - 28, headerY, '', {
      fontSize: '14px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    // --- 迷你进度条（header 下方） ---
    const barY = headerY + headerH / 2 + 8;
    const barW = viewW - 180;
    const barX = 80;
    const barH = 5;

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
    const panelX = viewW - 150;
    const panelY = viewH - 105;
    const panelW = 130;
    const panelH = 85;

    const panelGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
    panelGfx.fillStyle(C.BG_CREAM, 0.85);
    panelGfx.fillRoundedRect(panelX, panelY, panelW, panelH, 10);
    panelGfx.lineStyle(1, C.ACCENT, 0.3);
    panelGfx.strokeRoundedRect(panelX, panelY, panelW, panelH, 10);

    this.add.text(panelX + panelW / 2, panelY + 12, 'ITEMS', {
      fontSize: '9px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    this.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const sx = panelX + 22 + i * 60;
      const sy = panelY + 48;

      const slotGfx = this.add.graphics().setScrollFactor(0).setDepth(100);
      slotGfx.fillStyle(C.BG_SAND, 0.7);
      slotGfx.fillRoundedRect(sx - 24, sy - 24, 48, 48, 8);
      slotGfx.lineStyle(1, C.ACCENT, 0.4);
      slotGfx.strokeRoundedRect(sx - 24, sy - 24, 48, 48, 8);

      const slotHit = this.add.rectangle(sx, sy, 48, 48, 0x000000, 0)
        .setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(102);

      const icon = this.add.image(sx, sy, 'items-strip')
        .setVisible(false).setScrollFactor(0).setDepth(101).setScale(0.1);

      slotHit.on('pointerdown', () => this.useItem(i));

      this.itemSlots.push({ slotGfx, icon, itemType: null, hitArea: slotHit });
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

    // 键盘容器入场动画
    this.keyboardContainer.setVisible(true);
    this.keyboardContainer.setAlpha(0);
    this.keyboardContainer.y = 30;
    this.tweens.add({
      targets: this.keyboardContainer,
      alpha: 1,
      y: 0,
      duration: 300,
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

    this.isPaused = true;
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
    this.keyboardContainer.setVisible(false);
    this.isPaused = false;
    this.answerTimerBar.setFillStyle(C.PRIMARY);

    window.network.submitAnswer(this.currentInput);
    this.wordChallenge = null;
  }

  handleAnswerResult(data) {
    const player = this.players.get(this.mySocketId);
    if (!player) return;

    if (data.correct) {
      player.speed = data.newSpeed;
      this.soundGenerator.play('correct');

      // 治愈粒子爆发
      burstParticles(this, player.sprite.x, player.sprite.y, C.PRIMARY, 12);

      // 闪绿
      player.sprite.setTint(0xaaffaa);
      this.time.delayedCall(250, () => {
        if (player.sprite?.active) player.sprite.clearTint();
      });
    } else {
      player.speed = data.newSpeed;
      this.soundGenerator.play('wrong');

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

    // 道具弹入动画
    emptySlot.icon.setScale(0);
    this.tweens.add({
      targets: emptySlot.icon,
      scaleX: 1,
      scaleY: 1,
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
  //  虚拟键盘（圆角治愈风）
  // ==============================================================
  createVirtualKeyboard(viewW, viewH) {
    const keys = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ];
    const keySize = 52;
    const gap = 5;

    this.keyboardContainer = this.add.container(0, 0);
    this.keyboardContainer.setVisible(false).setDepth(200).setScrollFactor(0);

    // 浅色遮罩（不再深棕）
    const mask = this.add.rectangle(viewW / 2, viewH / 2, viewW, viewH, C.BG_CREAM, 0.93);
    this.keyboardContainer.add(mask);

    // 圆角外框
    const frameGfx = this.add.graphics();
    frameGfx.fillStyle(C.BG_CREAM, 0.9);
    frameGfx.fillRoundedRect(30, viewH * 0.04, viewW - 60, viewH * 0.92, 16);
    frameGfx.lineStyle(2, C.ACCENT, 0.4);
    frameGfx.strokeRoundedRect(30, viewH * 0.04, viewW - 60, viewH * 0.92, 16);
    this.keyboardContainer.add(frameGfx);

    // 题目区域
    this.wordChallengeContainer = this.add.container(viewW / 2, viewH * 0.19);
    this.keyboardContainer.add(this.wordChallengeContainer);

    // 中文释义
    this.meaningText = this.add.text(0, -40, '', {
      fontSize: '18px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.meaningText);

    // 挖空/拼写
    this.blankText = this.add.text(0, 5, '', {
      fontSize: '42px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#' + C.TEXT_DARK.toString(16).padStart(6, '0'),
      letterSpacing: 8,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.blankText);

    // 输入显示
    this.inputDisplay = this.add.text(0, 55, '', {
      fontSize: '28px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
      letterSpacing: 4,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.inputDisplay);

    // 倒计时条（圆角）
    const timerY = 105;
    const timerW = 280;
    const timerH = 6;
    const timerBg = this.add.graphics();
    timerBg.fillStyle(C.BG_SAND, 0.6);
    timerBg.fillRoundedRect(-timerW / 2, timerY - timerH / 2, timerW, timerH, 3);
    this.wordChallengeContainer.add(timerBg);

    this.answerTimerBar = this.add.rectangle(0, timerY, timerW, timerH, C.PRIMARY);
    // 圆角 mask
    const timerMaskGfx = this.add.graphics();
    timerMaskGfx.fillStyle(0xffffff);
    timerMaskGfx.fillRoundedRect(-timerW / 2, timerY - timerH / 2, timerW, timerH, 3);
    this.answerTimerBar.setMask(timerMaskGfx.createGeometryMask());
    this.wordChallengeContainer.add(this.answerTimerBar);

    // 键盘行
    const keyStartY = viewH * 0.42;
    keys.forEach((row, rowIdx) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const startX = (viewW - rowWidth) / 2;

      row.forEach((key, colIdx) => {
        const kx = startX + colIdx * (keySize + gap);
        const ky = keyStartY + rowIdx * (keySize + gap);

        // 圆角按键背景
        const keyBg = this.add.graphics();
        keyBg.fillStyle(C.BG_CREAM, 0.9);
        keyBg.fillRoundedRect(kx, ky, keySize, keySize, 8);
        keyBg.lineStyle(1, C.ACCENT, 0.35);
        keyBg.strokeRoundedRect(kx, ky, keySize, keySize, 8);

        const label = this.add.text(kx + keySize / 2, ky + keySize / 2, key, {
          fontSize: '20px',
          fontFamily: FONT,
          fontStyle: '700',
          color: '#' + C.TEXT_DARK.toString(16).padStart(6, '0'),
        }).setOrigin(0.5);

        // 热区
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

    // 控制键
    const ctrlY = keyStartY + 3 * (keySize + gap) + 8;

    // DEL 键
    const delW = 90;
    const delX = viewW / 2 - 110;
    const delBg = this.add.graphics();
    delBg.fillStyle(C.ERROR, 0.12);
    delBg.fillRoundedRect(delX - delW / 2, ctrlY - keySize / 2, delW, keySize, 8);
    const delLabel = this.add.text(delX, ctrlY, 'DEL', {
      fontSize: '14px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.ERROR.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    const delHit = this.add.rectangle(delX, ctrlY, delW, keySize, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    delHit.on('pointerdown', () => this.handleBackspace());
    this.keyboardContainer.add([delBg, delLabel, delHit]);

    // ENTER 键
    const enterW = 150;
    const enterX = viewW / 2 + 40;
    const enterBg = this.add.graphics();
    enterBg.fillStyle(C.PRIMARY, 0.8);
    enterBg.fillRoundedRect(enterX - enterW / 2, ctrlY - keySize / 2, enterW, keySize, 8);
    const enterLabel = this.add.text(enterX, ctrlY, '确 定', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#ffffff',
    }).setOrigin(0.5);
    const enterHit = this.add.rectangle(enterX, ctrlY, enterW, keySize, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    enterHit.on('pointerdown', () => this.submitAnswer());
    enterHit.on('pointerover', () => {
      enterBg.clear();
      enterBg.fillStyle(0x7fb069, 0.9);
      enterBg.fillRoundedRect(enterX - enterW / 2 - 1, ctrlY - keySize / 2 - 1, enterW + 2, keySize + 2, 9);
    });
    enterHit.on('pointerout', () => {
      enterBg.clear();
      enterBg.fillStyle(C.PRIMARY, 0.8);
      enterBg.fillRoundedRect(enterX - enterW / 2, ctrlY - keySize / 2, enterW, keySize, 8);
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
    if (this.isPaused) return;

    const me = this.players.get(this.mySocketId);
    if (!me) return;

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

  shutdown() {
    this.soundGenerator.stopBGM();
  }
}
