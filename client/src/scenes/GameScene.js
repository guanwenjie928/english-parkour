import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { PLAYER_COLORS } from '../utils/ColorConfig.js';
import { clamp, lerp } from '../utils/helpers.js';

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

    // 老师模式切换到老师场景
    if (this.isTeacher) {
      this.scene.start('TeacherScene', { code: this.roomCode });
      return;
    }
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    // 停止菜单BGM，播放游戏BGM
    this.soundGenerator.stopBGM();
    this.soundGenerator.playBGM('game');

    // 视差背景
    this.createParallaxBackgrounds();

    // 跑道
    this.createTracks();

    // 创建自己（占位，等待服务器同步）
    this.mySocketId = window.network.socket.id;

    // 虚拟键盘
    this.createVirtualKeyboard();

    // 道具栏
    this.createItemPanel();

    // 迷你进度条
    this.createMiniProgressBar();

    // 倒计时
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

    // 背景不跟随相机滚动
    this.bgFar.setScrollFactor(0);
    this.bgMid.setScrollFactor(0);
    this.bgNear.setScrollFactor(0);
  }

  createTracks() {
    const { width, height } = this.scale;
    this.tracks = [];
    const trackHeight = height / 8;

    for (let i = 0; i < 8; i++) {
      const y = trackHeight * i + trackHeight / 2;

      // 跑道背景
      this.add.rectangle(width / 2, y, width, trackHeight - 4, i % 2 === 0 ? 0x2a2a4e : 0x252545)
        .setScrollFactor(0);

      // 跑道边框
      this.add.rectangle(width / 2, y - trackHeight / 2 + 2, width, 2, 0x00d4ff)
        .setScrollFactor(0);
      this.add.rectangle(width / 2, y + trackHeight / 2 - 2, width, 2, 0x00d4ff)
        .setScrollFactor(0);

      // 跑道编号
      this.add.text(30, y, `${i + 1}`, {
        fontSize: '20px',
        color: '#00d4ff',
        fontFamily: 'Arial Black',
      }).setOrigin(0.5).setScrollFactor(0);

      this.tracks.push({ y, height: trackHeight });
    }

    // 玩家精灵容器（世界坐标）
    this.playerContainer = this.add.container(0, 0);
  }

  createVirtualKeyboard() {
    const { width, height } = this.scale;
    const keys = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
    ];

    const keySize = 64;
    const gap = 8;

    this.keyboardContainer = this.add.container(0, 0);
    this.keyboardContainer.setVisible(false).setDepth(100);

    // 背景遮罩
    const mask = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    this.keyboardContainer.add(mask);

    // 题目显示区域
    this.wordChallengeContainer = this.add.container(width / 2, height * 0.25);
    this.keyboardContainer.add(this.wordChallengeContainer);

    // 中文释义
    this.meaningText = this.add.text(0, -60, '', {
      fontSize: '24px',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.meaningText);

    // 挖空显示
    this.blankText = this.add.text(0, 0, '', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      letterSpacing: 12,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.blankText);

    // 输入显示
    this.inputDisplay = this.add.text(0, 80, '', {
      fontSize: '36px',
      fontFamily: 'Arial Black',
      color: '#00d4ff',
      letterSpacing: 8,
    }).setOrigin(0.5);
    this.wordChallengeContainer.add(this.inputDisplay);

    // 倒计时条
    this.answerTimerBar = this.add.rectangle(0, 140, 300, 8, 0x00d4ff);
    this.wordChallengeContainer.add(this.answerTimerBar);

    // 键盘区域
    const keyboardY = height * 0.55;

    keys.forEach((row, rowIndex) => {
      const rowWidth = row.length * (keySize + gap) - gap;
      const startX = (width - rowWidth) / 2;

      row.forEach((key, colIndex) => {
        const x = startX + colIndex * (keySize + gap) + keySize / 2;
        const y = keyboardY + rowIndex * (keySize + gap);

        const btn = this.add.rectangle(x, y, keySize, keySize, 0x3a3a5e)
          .setInteractive();

        const label = this.add.text(x, y, key, {
          fontSize: '24px',
          color: '#ffffff',
          fontFamily: 'Arial Black',
        }).setOrigin(0.5);

        btn.on('pointerdown', () => {
          this.handleKeyInput(key);
          btn.setFillStyle(0x00d4ff);
          label.setColor('#1a1a2e');
          this.time.delayedCall(100, () => {
            btn.setFillStyle(0x3a3a5e);
            label.setColor('#ffffff');
          });
        });

        this.keyboardContainer.add([btn, label]);
      });
    });

    // 底行控制键
    const controlY = keyboardY + 3 * (keySize + gap);

    // 退格键
    const backspaceBtn = this.add.rectangle(width / 2 - 100, controlY, 100, keySize, 0xff4444)
      .setInteractive();
    this.add.text(width / 2 - 100, controlY, '⌫', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);
    backspaceBtn.on('pointerdown', () => this.handleBackspace());
    this.keyboardContainer.add(backspaceBtn);

    // 提交键
    const submitBtn = this.add.rectangle(width / 2 + 50, controlY, 160, keySize, 0x44dd44)
      .setInteractive();
    this.add.text(width / 2 + 50, controlY, '提交 ↵', {
      fontSize: '22px',
      color: '#1a1a2e',
      fontFamily: 'Arial Black',
    }).setOrigin(0.5);
    submitBtn.on('pointerdown', () => this.submitAnswer());
    this.keyboardContainer.add(submitBtn);
  }

  createItemPanel() {
    const { width, height } = this.scale;

    // 道具槽背景
    this.add.text(width - 100, height - 140, '道具', {
      fontSize: '14px',
      color: '#888888',
    }).setOrigin(0.5).setScrollFactor(0);

    this.itemSlots = [];
    for (let i = 0; i < 2; i++) {
      const x = width - 60 - i * 80;
      const y = height - 80;

      const slot = this.add.rectangle(x, y, 64, 64, 0x2a2a4e)
        .setStrokeStyle(2, 0x00d4ff)
        .setScrollFactor(0)
        .setInteractive();

      const icon = this.add.image(x, y, 'items-strip')
        .setVisible(false)
        .setScrollFactor(0);

      slot.on('pointerdown', () => this.useItem(i));

      this.itemSlots.push({ slot, icon, itemType: null });
    }
  }

  createMiniProgressBar() {
    const { width } = this.scale;
    const barY = 100;
    const barWidth = width - 40;

    // 背景条
    this.add.rectangle(width / 2, barY, barWidth, 8, 0x3a3a5e).setScrollFactor(0);

    // 8 个玩家位置点
    this.progressDots = [];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.circle(20, barY, i === this.myTrack - 1 ? 10 : 6, PLAYER_COLORS[i].tint)
        .setStrokeStyle(2, 0xffffff)
        .setScrollFactor(0);
      this.progressDots.push({ dot, progress: 0 });
    }

    // 排名文字
    this.rankText = this.add.text(width - 20, barY - 30, '', {
      fontSize: '16px',
      color: '#ffdd44',
      fontFamily: 'Arial Black',
    }).setOrigin(1, 0.5).setScrollFactor(0);
  }

  createTimer() {
    const { width } = this.scale;
    this.timerText = this.add.text(width / 2, 50, '90', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#ff0000',
      strokeThickness: 4,
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

      // 更新迷你进度条
      if (p.trackNumber) {
        this.progressDots[p.trackNumber - 1].progress = p.progress;
        this.progressDots[p.trackNumber - 1].dot.x = 20 + (p.progress / 100) * (this.scale.width - 40);
      }
    });

    // 更新自己的跑道
    const me = this.players.get(this.mySocketId);
    if (me) {
      this.myTrack = me.trackNumber;
    }

    // 计算排名
    const sorted = [...this.players.values()].sort((a, b) => b.progress - a.progress);
    const myRank = sorted.findIndex((p) => p.socketId === this.mySocketId) + 1;
    this.rankText.setText(myRank > 0 ? `第 ${myRank} / ${sorted.length} 名` : '');
  }

  createPlayer(data) {
    const trackData = this.tracks[data.trackNumber - 1];
    if (!trackData) return;

    const sprite = this.add.sprite(100, trackData.y, 'run-sheet')
      .setScale(0.8)
      .play('run');

    const nameText = this.add.text(100, trackData.y - 40, data.name || '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
    }).setOrigin(0.5);

    // 用颜色着色区分玩家
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
      this.meaningText.setText('填空');
      this.blankText.setText(data.display);
    }

    this.keyboardContainer.setVisible(true);

    // 10秒倒计时动画
    this.timeLeft = 10;
    this.answerTimerBar.setScale(1, 1);

    if (this.timerEvent) this.timerEvent.remove();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.answerTimerBar.setScale(this.timeLeft / 10, 1);
        if (this.timeLeft <= 0) {
          this.submitAnswer();
        }
      },
      repeat: 9,
    });

    // 暂停背景滚动
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

    window.network.submitAnswer(this.currentInput);
    this.wordChallenge = null;
  }

  handleAnswerResult(data) {
    const player = this.players.get(this.mySocketId);
    if (!player) return;

    if (data.correct) {
      player.speed = data.newSpeed;
      this.soundGenerator.play('correct');

      // 正确特效
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
    // 找到空槽
    const emptySlot = this.itemSlots.find((s) => !s.itemType);
    if (!emptySlot) return;

    emptySlot.itemType = itemType;
    emptySlot.icon.setVisible(true);

    // 设置裁剪区域显示对应道具
    const itemIndex = ['rocket', 'electric', 'banana', 'shield', 'magnet'].indexOf(itemType);
    if (itemIndex >= 0) {
      emptySlot.icon.setCrop(itemIndex * 64, 0, 64, 64);
    }

    this.soundGenerator.play('item_get');
  }

  useItem(slotIndex) {
    const slot = this.itemSlots[slotIndex];
    if (!slot.itemType) return;

    // 如果是控制类道具，弹出目标选择
    if (['electric', 'banana'].includes(slot.itemType)) {
      this.showTargetSelector(slot.itemType, slotIndex);
      return;
    }

    // 直接使用
    window.network.useItem(slot.itemType);
    this.clearItemSlot(slotIndex);
  }

  showTargetSelector(itemType, slotIndex) {
    // 简单的目标选择（选择领先/落后玩家）
    // 实际应该显示跑道选择器
    const targets = [...this.players.values()]
      .filter((p) => p.socketId !== this.mySocketId)
      .sort((a, b) => b.progress - a.progress);

    if (targets.length === 0) return;

    // 默认打第一名
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
    graphics.lineStyle(4, 0xffff00);

    // 锯齿状闪电
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const jaggedX = midX + (Math.random() - 0.5) * 50;
    const jaggedY = midY + (Math.random() - 0.5) * 30;

    graphics.lineBetween(from.x, from.y, jaggedX, jaggedY);
    graphics.lineBetween(jaggedX, jaggedY, to.x, to.y);

    this.time.delayedCall(200, () => {
      graphics.clear();
      this.time.delayedCall(100, () => {
        graphics.lineStyle(4, 0xffff00);
        graphics.lineBetween(from.x, from.y, jaggedX, jaggedY);
        graphics.lineBetween(jaggedX, jaggedY, to.x, to.y);
        this.time.delayedCall(200, () => graphics.destroy());
      });
    });
  }

  createRocketEffect(sprite) {
    // 火箭加速粒子效果
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

    // 更新背景视差
    const progress = me.progress;
    this.bgFar.tilePositionX = progress * 5;
    this.bgMid.tilePositionX = progress * 10;
    this.bgNear.tilePositionX = progress * 20;

    // 更新相机位置（平滑跟随自己）
    const trackPixelWidth = 5000; // 假设赛道总长 5000px
    const targetX = (progress / 100) * trackPixelWidth;
    const cameraTargetX = targetX - this.scale.width * STUDENT_CAMERA.CENTER_OFFSET;

    this.cameras.main.scrollX = lerp(
      this.cameras.main.scrollX,
      cameraTargetX,
      STUDENT_CAMERA.SMOOTH_FACTOR
    );

    // 更新玩家位置
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
