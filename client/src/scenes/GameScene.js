import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder, PLAYER_COLORS } from '../utils/ColorConfig.js';
import { clamp, lerp } from '../utils/helpers.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

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
  SPRITE_VISIBLE_RANGE: 15,
});

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.players = new Map();
    this.myTrack = 1;
    this.mySocketId = null;
    this.items = [];
    this.wordChallenge = null;
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

    // === 设置世界边界（Camera 约束） ===
    this.cameras.main.setBounds(0, 0, WORLD.WIDTH, WORLD.HEIGHT);

    // === 1. 三层视差背景（scrollFactor 0.1/0.3/0.6） ===
    this.createParallaxBackgrounds(width, height);

    // === 2. 世界空间跑道 ===
    this.createTracks(width, height);

    // === 3. 起点/终点线 ===
    this.createStartFinishLines();

    // === 4. HUD（scrollFactor 0，最高 depth） ===
    this.createHUD(width, height);

    // === 5. 虚拟键盘 + 物理键盘 ===
    this.createVirtualKeyboard(width, height);
    this.setupPhysicalKeyboard();

    this.mySocketId = window.network.socket.id;

    // === 6. 玩家加入事件（首次同步） ===
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
  //  视差背景（真 LF2 卷轴）
  // ==============================================================
  createParallaxBackgrounds(viewW, viewH) {
    // 远山 — 最慢
    this.bgFar = this.add.tileSprite(viewW / 2, viewH / 2, viewW, viewH, 'bg-city-far')
      .setScrollFactor(0.1).setDepth(1);

    // 城市中景 — 中速
    this.bgMid = this.add.tileSprite(viewW / 2, viewH / 2, viewW, viewH, 'bg-city-mid')
      .setScrollFactor(0.3).setDepth(2);

    // 路面近景 — 最快（底部装饰性路面）
    this.bgNear = this.add.tileSprite(viewW / 2, viewH * 0.85, viewW, viewH * 0.3, 'bg-city-near')
      .setScrollFactor(0.6).setDepth(3);

    // 半透明暖色叠加层
    const overlay = this.add.rectangle(viewW / 2, viewH / 2, viewW, viewH, PX.BG_DARK, 0.12)
      .setScrollFactor(0).setDepth(4);
  }

  // ==============================================================
  //  世界空间跑道
  // ==============================================================
  createTracks(viewW, viewH) {
    this.tracks = [];
    const trackH = viewH / WORLD.TRACK_COUNT;

    for (let i = 0; i < WORLD.TRACK_COUNT; i++) {
      const y = trackH * i + trackH / 2;

      // 跑道背景（横跨整个世界）
      const fillColor = i % 2 === 0 ? PX.BG_MID : 0x352518;
      const trackBg = this.add.rectangle(
        WORLD.WIDTH / 2, y, WORLD.WIDTH, trackH - 2,
        fillColor
      ).setDepth(5);

      // 跑道编号标签（固定在起点附近）
      this.add.text(WORLD.START_X - 30, y, `${i + 1}`, {
        fontSize: '11px',
        fontFamily: FONT,
        color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(8);

      // 上边框线（世界宽度）
      const topBorder = this.add.rectangle(
        WORLD.WIDTH / 2, y - trackH / 2, WORLD.WIDTH, 2,
        PX.PRIMARY, 0.35
      ).setDepth(6);

      // 下边框线
      const botBorder = this.add.rectangle(
        WORLD.WIDTH / 2, y + trackH / 2, WORLD.WIDTH, 2,
        PX.PRIMARY, 0.35
      ).setDepth(6);

      this.tracks.push({ y, height: trackH, bg: trackBg });
    }
  }

  // ==============================================================
  //  起点线 / 终点线
  // ==============================================================
  createStartFinishLines() {
    const { height } = this.scale;

    // 起点线（像素绿虚线）
    const startGfx = this.add.graphics().setDepth(8);
    for (let y = 0; y < height; y += 12) {
      startGfx.fillStyle(0x6bb348, 0.8);
      startGfx.fillRect(WORLD.START_X - 1, y, 3, 8);
    }
    this.add.text(WORLD.START_X + 6, height - 20, 'START', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0, 1).setDepth(8);

    // 终点线（棋盘格）
    const finishGfx = this.add.graphics().setDepth(8);
    for (let y = 0; y < height; y += 16) {
      for (let dx = 0; dx < 12; dx += 6) {
        const color = ((y / 16) + (dx / 6)) % 2 === 0 ? 0xffffff : 0x3b2818;
        finishGfx.fillStyle(color, 0.9);
        finishGfx.fillRect(WORLD.FINISH_X + dx, y, 6, 16);
      }
    }
    this.add.text(WORLD.FINISH_X - 6, height - 20, 'FINISH', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(1, 1).setDepth(8);
  }

  // ==============================================================
  //  HUD（scrollFactor 0，始终固定在屏幕上）
  // ==============================================================
  createHUD(viewW) {
    // --- 计时器（顶部居中） ---
    const timerBg = this.add.rectangle(viewW / 2, 30, 120, 36, PX.BG_DARK, 0.85)
      .setScrollFactor(0).setDepth(100);
    const timerBorder = this.add.graphics().setScrollFactor(0).setDepth(100);
    drawPixelBorder(timerBorder, viewW / 2 - 62, 12, 124, 36, PX.BG_LIGHT, 1);

    this.timerText = this.add.text(viewW / 2, 30, '90', {
      fontSize: '26px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

    // --- 排名（右上角） ---
    this.rankText = this.add.text(viewW - 16, 30, '', {
      fontSize: '9px',
      fontFamily: FONT,
      color: '#' + PX.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(101);

    // --- 迷你进度条（顶部） ---
    const barY = 62;
    const barWidth = viewW - 40;
    const barBg = this.add.rectangle(viewW / 2, barY, barWidth, 4, PX.BG_MID)
      .setScrollFactor(0).setDepth(100);
    const barBorder = this.add.graphics().setScrollFactor(0).setDepth(100);
    drawPixelBorder(barBorder, 18, barY - 4, barWidth + 4, 8, PX.BG_LIGHT, 1);

    this.progressDots = [];
    for (let i = 0; i < WORLD.TRACK_COUNT; i++) {
      const dotSize = 8;
      const dotX = 20 + dotSize;
      const dotGfx = this.add.graphics().setScrollFactor(0).setDepth(101);
      dotGfx.fillStyle(PLAYER_COLORS[i].tint, 1);
      dotGfx.fillRect(dotX - dotSize / 2, barY - dotSize / 2, dotSize, dotSize);

      const dotBorder = this.add.graphics().setScrollFactor(0).setDepth(101);
      drawPixelBorder(dotBorder, dotX - dotSize / 2 - 1, barY - dotSize / 2 - 1, dotSize + 2, dotSize + 2, 0xffffff, 1);

      this.progressDots.push({ dotGfx, dotBorder, progress: 0, dotSize });
    }

    // --- 道具栏（右下角） ---
    this.createItemPanel(viewW);
  }

  // ==============================================================
  //  道具面板
  // ==============================================================
  createItemPanel(viewW) {
    const { height } = this.scale;

    this.add.text(viewW - 90, height - 140, 'ITEM', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const x = viewW - 55 - i * 80;
      const y = height - 75;

      const slot = this.add.rectangle(x, y, 56, 56, PX.BG_MID)
        .setScrollFactor(0).setDepth(100)
        .setInteractive({ useHandCursor: true });

      const slotBorder = this.add.graphics().setScrollFactor(0).setDepth(100);
      drawPixelBorder(slotBorder, x - 30, y - 30, 60, 60, PX.PRIMARY, 2);

      const icon = this.add.image(x, y, 'items-strip')
        .setVisible(false).setScrollFactor(0).setDepth(101);

      slot.on('pointerdown', () => this.useItem(i));

      this.itemSlots.push({ slot, icon, itemType: null });
    }
  }

  // ==============================================================
  //  玩家创建（世界坐标）
  // ==============================================================
  createPlayer(data) {
    const trackData = this.tracks[data.trackNumber - 1];
    if (!trackData) return;

    const startX = this.progressToWorldX(0);

    // 角色精灵（pose-sheet idle 帧用于初始，run-sheet 用于跑酷）
    const sprite = this.add.sprite(startX, trackData.y, 'run-sheet')
      .setScale(0.6).setDepth(50)
      .play('run');

    const nameText = this.add.text(startX, trackData.y - 36, data.name || '', {
      fontSize: '10px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
      backgroundColor: '#' + PX.BG_DARK.toString(16).padStart(6, '0') + 'cc',
      padding: { x: 5, y: 2 },
    }).setOrigin(0.5).setDepth(51);

    const color = PLAYER_COLORS[data.trackNumber - 1];
    sprite.setTint(color.tint);

    this.players.set(data.socketId, {
      socketId: data.socketId,
      sprite,
      nameText,
      trackNumber: data.trackNumber,
      progress: 0,
      speed: 1,
      shielded: false,
      currentPose: 'run',
    });
  }

  // ==============================================================
  //  姿态切换系统（pose-sheet 5 姿态）
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
    // 从 LocalGameEngine 获取已有玩家数据（若游戏已开始）
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

    // 如果有待答题目，立即显示
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

      // 护盾视觉
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
        const barWidth = this.scale.width - 40;
        const newX = 20 + (p.progress / 100) * barWidth;
        const size = dotData.dotSize;
        dotData.dotGfx.clear();
        dotData.dotGfx.fillStyle(PLAYER_COLORS[p.trackNumber - 1].tint, 1);
        dotData.dotGfx.fillRect(newX - size / 2, 62 - size / 2, size, size);
        dotData.dotBorder.clear();
        drawPixelBorder(dotData.dotBorder, newX - size / 2 - 1, 62 - size / 2 - 1, size + 2, size + 2, 0xffffff, 1);
      }
    });

    // 计算我方排名
    const me = this.players.get(this.mySocketId);
    if (me) {
      this.myTrack = me.trackNumber;
      const sorted = [...this.players.values()].sort((a, b) => b.progress - a.progress);
      const myRank = sorted.findIndex((p) => p.socketId === this.mySocketId) + 1;
      this.rankText.setText(myRank > 0 ? `RANK ${myRank}/${sorted.length}` : '');
    }
  }

  // ==============================================================
  //  单词挑战 UI
  // ==============================================================
  showWordChallenge(data) {
    this.wordChallenge = data;
    this.currentInput = '';
    this.inputDisplay.setText('');

    if (data.type === 'cn_to_en') {
      this.meaningText.setText(data.display);
      this.blankText.setText('???');
    } else {
      this.meaningText.setText('FILL IN');
      this.blankText.setText(data.display);
    }

    this.keyboardContainer.setVisible(true);
    this.timeLeft = 10;
    this.answerTimerBar.setScale(1, 1);
    this.answerTimerBar.setFillStyle(PX.PRIMARY);

    if (this.timerEvent) this.timerEvent.remove();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.answerTimerBar.setScale(this.timeLeft / 10, 1);
        if (this.timeLeft <= 3) {
          this.answerTimerBar.setFillStyle(PX.ERROR);
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
    this.answerTimerBar.setFillStyle(PX.PRIMARY);

    window.network.submitAnswer(this.currentInput);
    this.wordChallenge = null;
  }

  handleAnswerResult(data) {
    const player = this.players.get(this.mySocketId);
    if (!player) return;

    if (data.correct) {
      player.speed = data.newSpeed;
      this.soundGenerator.play('correct');
      this.tweens.add({
        targets: player.sprite,
        alpha: 0.5,
        duration: 100,
        yoyo: true,
        repeat: 2,
      });
    } else {
      player.speed = data.newSpeed;
      this.soundGenerator.play('wrong');
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

    // 瞄准进度最靠前的对手
    const target = targets[0];
    window.network.useItem(itemType, target.trackNumber);
    this.clearItemSlot(slotIndex);
  }

  clearItemSlot(index) {
    this.itemSlots[index].itemType = null;
    this.itemSlots[index].icon.setVisible(false);
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
      // 目标进入 stun 姿态
      this.setPlayerPose(to, 'stun');
      this.soundGenerator.play('electric');
    } else if (data.itemType === 'rocket') {
      this.createRocketEffect(from.sprite);
      this.soundGenerator.play('rocket');
    } else if (data.itemType === 'banana') {
      // 目标进入 slide 姿态
      this.setPlayerPose(to, 'slide');
      this.soundGenerator.play('banana');
    } else if (data.itemType === 'shield') {
      this.createShieldEffect(to.sprite);
      this.setPlayerPose(to, 'shield');
      this.soundGenerator.play('shield');
    }
  }

  createLightningEffect(from, to) {
    const graphics = this.add.graphics().setDepth(55);
    graphics.lineStyle(4, PX.HIGHLIGHT);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const jaggedX = midX + (Math.random() - 0.5) * 50;
    const jaggedY = midY + (Math.random() - 0.5) * 30;
    graphics.lineBetween(from.x, from.y, jaggedX, jaggedY);
    graphics.lineBetween(jaggedX, jaggedY, to.x, to.y);

    this.time.delayedCall(200, () => {
      graphics.clear();
      this.time.delayedCall(100, () => {
        graphics.lineStyle(4, PX.HIGHLIGHT);
        graphics.lineBetween(from.x, from.y, jaggedX, jaggedY);
        graphics.lineBetween(jaggedX, jaggedY, to.x, to.y);
        this.time.delayedCall(200, () => graphics.destroy());
      });
    });
  }

  createRocketEffect(sprite) {
    const particles = this.add.particles(sprite.x - 30, sprite.y, 'items-strip', {
      frame: 0,
      speed: { min: 100, max: 300 },
      scale: { start: 0.5, end: 0 },
      lifespan: 500,
      quantity: 2,
      frequency: 100,
    }).setDepth(55);
    this.time.delayedCall(5000, () => particles.destroy());
  }

  createShieldEffect(sprite) {
    const shieldAnim = this.add.sprite(sprite.x, sprite.y, 'vfx-strip')
      .setDepth(55).setScale(1.5);
    shieldAnim.play('shield-bubble');
    this.time.delayedCall(800, () => shieldAnim.destroy());
  }

  // ==============================================================
  //  虚拟键盘
  // ==============================================================
  createVirtualKeyboard(viewW, viewH) {
    const keys = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ];
    const keySize = 56;
    const gap = 6;

    this.keyboardContainer = this.add.container(0, 0);
    this.keyboardContainer.setVisible(false).setDepth(200).setScrollFactor(0);

    // 深色遮罩
    const mask = this.add.rectangle(viewW / 2, viewH / 2, viewW, viewH, PX.BG_DARK, 0.92);
    this.keyboardContainer.add(mask);

    // 像素外框
    const frameGfx = this.add.graphics();
    drawPixelBorder(frameGfx, 40, viewH * 0.05, viewW - 80, viewH * 0.90, PX.BG_LIGHT, 2);
    this.keyboardContainer.add(frameGfx);

    // 题目区域
    this.wordChallengeContainer = this.add.container(viewW / 2, viewH * 0.20);
    this.keyboardContainer.add(this.wordChallengeContainer);

    // 中文释义
    this.meaningText = this.add.text(0, -45, '', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.meaningText);

    // 挖空
    this.blankText = this.add.text(0, 0, '', {
      fontSize: '40px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
      letterSpacing: 10,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.blankText);

    // 输入显示
    this.inputDisplay = this.add.text(0, 55, '', {
      fontSize: '28px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      letterSpacing: 6,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.inputDisplay);

    // 倒计时条
    this.answerTimerBar = this.add.rectangle(0, 115, 280, 6, PX.PRIMARY);
    const timerBorder = this.add.graphics();
    drawPixelBorder(timerBorder, -142, 110, 284, 10, PX.BG_LIGHT, 1);
    this.wordChallengeContainer.add(this.answerTimerBar);
    this.wordChallengeContainer.add(timerBorder);

    // 键盘行
    const keyStartY = viewH * 0.42;
    keys.forEach((row, rowIdx) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const startX = (viewW - rowWidth) / 2;

      row.forEach((key, colIdx) => {
        const x = startX + colIdx * (keySize + gap) + keySize / 2;
        const y = keyStartY + rowIdx * (keySize + gap);

        const btn = this.add.rectangle(x, y, keySize, keySize, PX.SECONDARY)
          .setInteractive({ useHandCursor: true });
        const btnBorder = this.add.graphics();
        drawPixelBorder(btnBorder, x - keySize/2 - 2, y - keySize/2 - 2, keySize + 4, keySize + 4, PX.BG_LIGHT, 1);
        const label = this.add.text(x, y, key, {
          fontSize: '20px',
          fontFamily: FONT,
          color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
        }).setOrigin(0.5);

        btn.on('pointerdown', () => {
          this.handleKeyInput(key);
          btn.setFillStyle(PX.PRIMARY);
          label.setColor('#' + PX.TEXT_DARK.toString(16).padStart(6, '0'));
          this.time.delayedCall(120, () => {
            btn.setFillStyle(PX.SECONDARY);
            label.setColor('#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'));
          });
        });
        btn.on('pointerover', () => btn.setFillStyle(PX.HIGHLIGHT));
        btn.on('pointerout', () => btn.setFillStyle(PX.SECONDARY));

        this.keyboardContainer.add([btnBorder, btn, label]);
      });
    });

    // 控制键
    const ctrlY = keyStartY + 3 * (keySize + gap) + 10;

    const bsW = 90;
    const bsX = viewW / 2 - 110;
    const bsBtn = this.add.rectangle(bsX, ctrlY, bsW, keySize, PX.ERROR)
      .setInteractive({ useHandCursor: true });
    const bsBorder = this.add.graphics();
    drawPixelBorder(bsBorder, bsX - bsW/2 - 2, ctrlY - keySize/2 - 2, bsW + 4, keySize + 4, 0xb0443a, 1);
    const bsLabel = this.add.text(bsX, ctrlY, 'DEL', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    bsBtn.on('pointerdown', () => this.handleBackspace());
    this.keyboardContainer.add([bsBorder, bsBtn, bsLabel]);

    const subW = 160;
    const subX = viewW / 2 + 50;
    const subBtn = this.add.rectangle(subX, ctrlY, subW, keySize, PX.PRIMARY)
      .setInteractive({ useHandCursor: true });
    const subBorder = this.add.graphics();
    drawPixelBorder(subBorder, subX - subW/2 - 2, ctrlY - keySize/2 - 2, subW + 4, keySize + 4, 0x5a9e38, 1);
    const subLabel = this.add.text(subX, ctrlY, 'ENTER', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_DARK.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    subBtn.on('pointerdown', () => this.submitAnswer());
    this.keyboardContainer.add([subBorder, subBtn, subLabel]);
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

    // Camera 平滑跟随玩家
    const targetCamX = me.sprite.x - this.scale.width * 0.35;
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
    });
  }

  shutdown() {
    this.soundGenerator.stopBGM();
  }
}
