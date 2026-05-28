import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder, PLAYER_COLORS } from '../utils/ColorConfig.js';
import { clamp, lerp } from '../utils/helpers.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

// 学生端相机配置
const STUDENT_CAMERA = Object.freeze({
  VIEWPORT_WIDTH_PCT: 30,
  CENTER_OFFSET: 0.35,
  SMOOTH_FACTOR: 0.08,
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

    // 视差背景
    this.createParallaxBackgrounds();

    // 跑道
    this.createTracks();

    // 玩家
    this.mySocketId = window.network.socket.id;

    // 虚拟键盘
    this.createVirtualKeyboard();

    // 道具栏
    this.createItemPanel();

    // 迷你进度条
    this.createMiniProgressBar();

    // 计时器
    this.createTimer();

    // 网络事件
    this.setupNetworkListeners();

    // 游戏循环
    this.time.addEvent({
      delay: 50,
      callback: this.gameLoop,
      callbackScope: this,
      loop: true,
    });
  }

  createParallaxBackgrounds() {
    const { width, height } = this.scale;

    this.bgFar = this.add.tileSprite(width / 2, height / 2, width, height, 'bg-city-far');
    this.bgMid = this.add.tileSprite(width / 2, height / 2, width, height, 'bg-city-mid');
    this.bgNear = this.add.tileSprite(width / 2, height * 0.8, width, height * 0.4, 'bg-city-near');

    this.bgFar.setScrollFactor(0);
    this.bgMid.setScrollFactor(0);
    this.bgNear.setScrollFactor(0);

    // 半透明暖色叠加层（统一画面色调）
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK, 0.15);
    overlay.setScrollFactor(0).setDepth(0);
  }

  createTracks() {
    const { width, height } = this.scale;
    this.tracks = [];
    const trackHeight = height / 8;

    for (let i = 0; i < 8; i++) {
      const y = trackHeight * i + trackHeight / 2;

      // 跑道背景（暖棕交替）
      const trackBg = this.add.rectangle(
        width / 2, y, width, trackHeight - 4,
        i % 2 === 0 ? PX.BG_MID : 0x352518
      ).setScrollFactor(0);

      // 跑道边框（像素绿）
      const borderGfx = this.add.graphics().setScrollFactor(0);
      const topY = y - trackHeight / 2;
      const botY = y + trackHeight / 2;
      borderGfx.fillStyle(PX.PRIMARY, 0.6);
      borderGfx.fillRect(0, topY - 1, width, 2);
      borderGfx.fillRect(0, botY - 1, width, 2);

      // 跑道编号（像素字体）
      this.add.text(24, y, `${i + 1}`, {
        fontSize: '14px',
        fontFamily: FONT,
        color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setScrollFactor(0);

      this.tracks.push({ y, height: trackHeight });
    }

    // 玩家精灵容器
    this.playerContainer = this.add.container(0, 0);
  }

  createVirtualKeyboard() {
    const { width, height } = this.scale;
    const keys = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ];

    const keySize = 56;
    const gap = 6;

    this.keyboardContainer = this.add.container(0, 0);
    this.keyboardContainer.setVisible(false).setDepth(100);

    // 背景遮罩
    const mask = this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK, 0.92);
    this.keyboardContainer.add(mask);

    // 像素外框
    const frameGfx = this.add.graphics();
    drawPixelBorder(frameGfx, 40, 40, width - 80, height - 80, PX.BG_LIGHT, 2);
    this.keyboardContainer.add(frameGfx);

    // 题目显示区域
    this.wordChallengeContainer = this.add.container(width / 2, height * 0.22);
    this.keyboardContainer.add(this.wordChallengeContainer);

    // 中文释义
    this.meaningText = this.add.text(0, -50, '', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.meaningText);

    // 挖空显示
    this.blankText = this.add.text(0, 0, '', {
      fontSize: '40px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
      letterSpacing: 10,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.blankText);

    // 输入显示
    this.inputDisplay = this.add.text(0, 60, '', {
      fontSize: '28px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      letterSpacing: 6,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.inputDisplay);

    // 倒计时条（像素分段式）
    this.answerTimerBar = this.add.rectangle(0, 120, 280, 6, PX.PRIMARY);
    this.answerTimerBarBorder = this.add.graphics();
    drawPixelBorder(this.answerTimerBarBorder, -142, 120 - 5, 284, 10, PX.BG_LIGHT, 1);
    this.wordChallengeContainer.add(this.answerTimerBar);
    this.wordChallengeContainer.add(this.answerTimerBarBorder);

    // 键盘区域
    const keyboardY = height * 0.50;

    keys.forEach((row, rowIndex) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const startX = (width - rowWidth) / 2;

      row.forEach((key, colIndex) => {
        const x = startX + colIndex * (keySize + gap) + keySize / 2;
        const y = keyboardY + rowIndex * (keySize + gap);

        // 按键方块
        const btn = this.add.rectangle(x, y, keySize, keySize, PX.SECONDARY)
          .setInteractive({ useHandCursor: true });

        // 像素边框
        const btnBorder = this.add.graphics();
        drawPixelBorder(btnBorder, x - keySize / 2 - 2, y - keySize / 2 - 2, keySize + 4, keySize + 4, PX.BG_LIGHT, 1);

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

    // 底行控制键
    const controlY = keyboardY + 3 * (keySize + gap) + 10;

    // 退格键
    const bsW = 90;
    const bsX = width / 2 - 110;
    const backspaceBtn = this.add.rectangle(bsX, controlY, bsW, keySize, PX.ERROR)
      .setInteractive({ useHandCursor: true });
    const bsBorder = this.add.graphics();
    drawPixelBorder(bsBorder, bsX - bsW / 2 - 2, controlY - keySize / 2 - 2, bsW + 4, keySize + 4, 0xb0443a, 1);
    const bsLabel = this.add.text(bsX, controlY, 'DEL', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    backspaceBtn.on('pointerdown', () => this.handleBackspace());
    backspaceBtn.on('pointerover', () => backspaceBtn.setFillStyle(0xb0443a));
    backspaceBtn.on('pointerout', () => backspaceBtn.setFillStyle(PX.ERROR));
    this.keyboardContainer.add([bsBorder, backspaceBtn, bsLabel]);

    // 提交键
    const subW = 160;
    const subX = width / 2 + 50;
    const submitBtn = this.add.rectangle(subX, controlY, subW, keySize, PX.PRIMARY)
      .setInteractive({ useHandCursor: true });
    const subBorder = this.add.graphics();
    drawPixelBorder(subBorder, subX - subW / 2 - 2, controlY - keySize / 2 - 2, subW + 4, keySize + 4, 0x5a9e38, 1);
    const subLabel = this.add.text(subX, controlY, 'ENTER', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_DARK.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
    submitBtn.on('pointerdown', () => this.submitAnswer());
    submitBtn.on('pointerover', () => submitBtn.setFillStyle(PX.HIGHLIGHT));
    submitBtn.on('pointerout', () => submitBtn.setFillStyle(PX.PRIMARY));
    this.keyboardContainer.add([subBorder, submitBtn, subLabel]);
  }

  createItemPanel() {
    const { width, height } = this.scale;

    // 道具标签
    this.add.text(width - 90, height - 150, 'ITEM', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0);

    this.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const x = width - 55 - i * 80;
      const y = height - 80;

      // 道具槽（像素边框方块）
      const slot = this.add.rectangle(x, y, 60, 60, PX.BG_MID)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      const slotBorder = this.add.graphics().setScrollFactor(0);
      drawPixelBorder(slotBorder, x - 32, y - 32, 64, 64, PX.PRIMARY, 2);

      const icon = this.add.image(x, y, 'items-strip')
        .setVisible(false)
        .setScrollFactor(0);

      slot.on('pointerdown', () => this.useItem(i));

      this.itemSlots.push({ slot, slotBorder, icon, itemType: null });
    }
  }

  createMiniProgressBar() {
    const { width } = this.scale;
    const barY = 100;
    const barWidth = width - 40;

    // 背景条
    const barBg = this.add.rectangle(width / 2, barY, barWidth, 6, PX.BG_MID).setScrollFactor(0);
    const barBorder = this.add.graphics().setScrollFactor(0);
    drawPixelBorder(barBorder, 18, barY - 5, barWidth + 4, 10, PX.BG_LIGHT, 1);

    // 8 个玩家位置（像素方块代替圆点）
    this.progressDots = [];
    for (let i = 0; i < 8; i++) {
      const color = PLAYER_COLORS[i];
      const dotSize = i === this.myTrack - 1 ? 12 : 8;
      const dotX = 20 + dotSize;

      const dotGfx = this.add.graphics().setScrollFactor(0);
      dotGfx.fillStyle(color.tint, 1);
      dotGfx.fillRect(dotX - dotSize / 2, barY - dotSize / 2, dotSize, dotSize);

      // 小方块边框
      const borderGfx = this.add.graphics().setScrollFactor(0);
      drawPixelBorder(borderGfx, dotX - dotSize / 2 - 1, barY - dotSize / 2 - 1, dotSize + 2, dotSize + 2, 0xffffff, 1);

      this.progressDots.push({ dotGfx, borderGfx, progress: 0, dotSize });
    }

    // 排名文字
    this.rankText = this.add.text(width - 20, barY - 24, '', {
      fontSize: '9px',
      fontFamily: FONT,
      color: '#' + PX.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(1, 0.5).setScrollFactor(0);
  }

  createTimer() {
    const { width } = this.scale;

    // 计时器背景
    const timerBg = this.add.rectangle(width / 2, 42, 120, 40, PX.BG_DARK, 0.85).setScrollFactor(0);
    const timerBorder = this.add.graphics().setScrollFactor(0);
    drawPixelBorder(timerBorder, width / 2 - 62, 22, 124, 40, PX.BG_LIGHT, 1);

    this.timerText = this.add.text(width / 2, 42, '90', {
      fontSize: '28px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setScrollFactor(0);
  }

  setupNetworkListeners() {
    window.network.on('position_sync', (data) => {
      this.updatePlayers(data);
    });

    window.network.on('word_challenge', (data) => {
      this.showWordChallenge(data);
    });

    window.network.on('answer_result', (data) => {
      this.handleAnswerResult(data);
    });

    window.network.on('item_reward', (data) => {
      this.addItem(data.item);
    });

    window.network.on('item_effect', (data) => {
      this.showItemEffect(data);
    });

    window.network.on('game_end', (data) => {
      this.scene.start('ResultScene', { rankings: data.rankings });
    });

    window.network.on('player_update', (data) => {
      this.updatePlayer(data);
    });
  }

  updatePlayers(data) {
    data.forEach((p) => {
      if (!this.players.has(p.socketId)) {
        this.createPlayer(p);
      }
      const player = this.players.get(p.socketId);
      player.progress = p.progress;
      player.speed = p.speed;
      player.trackNumber = p.trackNumber;
      player.shielded = p.shielded;

      // 更新迷你进度条（像素方块位置）
      if (p.trackNumber) {
        const dotData = this.progressDots[p.trackNumber - 1];
        dotData.progress = p.progress;
        const newX = 20 + (p.progress / 100) * (this.scale.width - 40);
        const size = dotData.dotSize;

        dotData.dotGfx.clear();
        dotData.dotGfx.fillStyle(PLAYER_COLORS[p.trackNumber - 1].tint, 1);
        dotData.dotGfx.fillRect(newX - size / 2, 100 - size / 2, size, size);

        dotData.borderGfx.clear();
        drawPixelBorder(dotData.borderGfx, newX - size / 2 - 1, 100 - size / 2 - 1, size + 2, size + 2, 0xffffff, 1);
      }
    });

    const me = this.players.get(this.mySocketId);
    if (me) {
      this.myTrack = me.trackNumber;
    }

    const sorted = [...this.players.values()].sort((a, b) => b.progress - a.progress);
    const myRank = sorted.findIndex((p) => p.socketId === this.mySocketId) + 1;
    this.rankText.setText(myRank > 0 ? `RANK ${myRank}/${sorted.length}` : '');
  }

  createPlayer(data) {
    const trackData = this.tracks[data.trackNumber - 1];
    if (!trackData) return;

    const sprite = this.add.sprite(100, trackData.y, 'run-sheet')
      .setScale(0.8)
      .play('run');

    const nameText = this.add.text(100, trackData.y - 40, data.name || '', {
      fontSize: '12px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
      backgroundColor: '#' + PX.BG_DARK.toString(16).padStart(6, '0') + 'cc',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5);

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
    });
  }

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

  addItem(itemType) {
    const emptySlot = this.itemSlots.find((s) => !s.itemType);
    if (!emptySlot) return;

    emptySlot.itemType = itemType;
    emptySlot.icon.setVisible(true);

    const itemIndex = ['rocket', 'electric', 'banana', 'shield', 'magnet'].indexOf(itemType);
    if (itemIndex >= 0) {
      emptySlot.icon.setCrop(itemIndex * 64, 0, 64, 64);
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

    const target = targets[0];
    window.network.useItem(itemType, target.trackNumber);
    this.clearItemSlot(slotIndex);
  }

  clearItemSlot(index) {
    this.itemSlots[index].itemType = null;
    this.itemSlots[index].icon.setVisible(false);
  }

  showItemEffect(data) {
    const from = this.players.get(data.fromId);
    const to = this.players.get(data.toId);

    if (!from || !to) return;

    if (data.itemType === 'electric') {
      this.createLightningEffect(from.sprite, to.sprite);
      this.soundGenerator.play('electric');
    } else if (data.itemType === 'rocket') {
      this.createRocketEffect(from.sprite);
      this.soundGenerator.play('rocket');
    } else if (data.itemType === 'banana') {
      this.soundGenerator.play('banana');
    } else if (data.itemType === 'shield') {
      this.createShieldEffect(to.sprite);
      this.soundGenerator.play('shield');
    }
  }

  createLightningEffect(from, to) {
    const graphics = this.add.graphics();
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
    });

    this.time.delayedCall(5000, () => particles.destroy());
  }

  createShieldEffect(sprite) {
    const shieldAnim = this.add.sprite(sprite.x, sprite.y, 'vfx-strip');
    shieldAnim.play('shield-bubble');
    shieldAnim.setScale(1.5);

    this.time.delayedCall(800, () => shieldAnim.destroy());
  }

  gameLoop() {
    if (this.isPaused) return;

    const me = this.players.get(this.mySocketId);
    if (!me) return;

    const progress = me.progress;
    this.bgFar.tilePositionX = progress * 5;
    this.bgMid.tilePositionX = progress * 10;
    this.bgNear.tilePositionX = progress * 20;

    const trackPixelWidth = 5000;
    const targetX = (progress / 100) * trackPixelWidth;
    const cameraTargetX = targetX - this.scale.width * STUDENT_CAMERA.CENTER_OFFSET;

    this.cameras.main.scrollX = lerp(
      this.cameras.main.scrollX,
      cameraTargetX,
      STUDENT_CAMERA.SMOOTH_FACTOR
    );

    this.players.forEach((player) => {
      const targetX = (player.progress / 100) * trackPixelWidth;
      player.sprite.x = lerp(player.sprite.x, targetX, 0.1);
      player.nameText.x = player.sprite.x;
    });
  }

  shutdown() {
    this.soundGenerator.stopBGM();
  }
}
