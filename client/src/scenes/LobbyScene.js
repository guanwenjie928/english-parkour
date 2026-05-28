import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { PLAYER_COLORS } from '../utils/ColorConfig.js';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  init(data) {
    this.roomCode = data.code || '000000';
    this.playerName = data.name || '匿名';
    this.isTeacher = data.isTeacher || false;
    this.players = new Map();
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 房间码大标题
    this.add.text(width / 2, height * 0.15, '房间号', {
      fontSize: '32px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    this.roomCodeText = this.add.text(width / 2, height * 0.25, this.roomCode, {
      fontSize: '96px',
      fontFamily: 'Arial Black',
      color: '#00d4ff',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 房间码闪烁动画（吸引注意）
    this.tweens.add({
      targets: this.roomCodeText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 提示文字
    this.add.text(width / 2, height * 0.38, '告诉其他同学房间号，让他们加入！', {
      fontSize: '20px',
      color: '#888888',
    }).setOrigin(0.5);

    // 玩家列表区域
    this.createPlayerList();

    // 准备/开始按钮
    this.createActionButton();

    // 老师模式切换
    if (this.isTeacher) {
      this.createTeacherControls();
    }

    // 注册网络事件
    this.setupNetworkListeners();

    // 请求当前玩家列表
    window.network.requestPlayerList();
  }

  createPlayerList() {
    const { width, height } = this.scale;
    const startY = height * 0.48;
    const slotHeight = 60;
    const slotGap = 10;

    this.playerSlots = [];

    for (let i = 0; i < 8; i++) {
      const y = startY + i * (slotHeight + slotGap);

      // 槽位背景
      const bg = this.add.rectangle(width / 2, y, 400, slotHeight, 0x2a2a4e)
        .setStrokeStyle(2, 0x3a3a5e);

      // 颜色圆点
      const colorDot = this.add.circle(width / 2 - 170, y, 15, PLAYER_COLORS[i].tint);

      // 跑道编号
      this.add.text(width / 2 - 130, y, `${i + 1}号`, {
        fontSize: '16px',
        color: '#888888',
      }).setOrigin(0, 0.5);

      // 玩家名（初始为空）
      const nameText = this.add.text(width / 2 - 80, y, '等待加入...', {
        fontSize: '20px',
        color: '#666666',
      }).setOrigin(0, 0.5);

      // 准备状态
      const readyText = this.add.text(width / 2 + 140, y, '', {
        fontSize: '16px',
        color: '#44dd44',
      }).setOrigin(0.5);

      this.playerSlots.push({
        bg,
        colorDot,
        nameText,
        readyText,
        trackNumber: i + 1,
        occupied: false,
      });
    }
  }

  createActionButton() {
    const { width, height } = this.scale;

    const btnY = height * 0.9;
    const btnColor = this.isTeacher ? 0x44dd44 : 0x00d4ff;
    const btnText = this.isTeacher ? '开始游戏' : '准备';

    this.actionBtn = this.add.rectangle(width / 2, btnY, 240, 70, btnColor)
      .setInteractive({ useHandCursor: true });

    this.actionBtnText = this.add.text(width / 2, btnY, btnText, {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#1a1a2e',
    }).setOrigin(0.5);

    this.actionBtn.on('pointerdown', () => this.handleAction());
    this.actionBtn.on('pointerover', () => this.actionBtn.setScale(1.05));
    this.actionBtn.on('pointerout', () => this.actionBtn.setScale(1));
  }

  createTeacherControls() {
    const { width, height } = this.scale;

    // 老师大屏入口
    this.add.text(width - 20, 20, '老师模式', {
      fontSize: '14px',
      color: '#ffdd44',
    }).setOrigin(1, 0);

    // 设置按钮（词库、时长等）
    const settingsBtn = this.add.rectangle(80, 40, 100, 40, 0x3a3a5e)
      .setInteractive()
      .on('pointerdown', () => this.showSettings());

    this.add.text(80, 40, '设置', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);
  }

  handleAction() {
    this.soundGenerator.play('click');

    if (this.isTeacher) {
      // 老师开始游戏
      window.network.startGame();
    } else {
      // 学生准备/取消准备
      this.isReady = !this.isReady;
      window.network.setReady(this.isReady);
      this.updateReadyButton();
    }
  }

  updateReadyButton() {
    const btnColor = this.isReady ? 0xff4444 : 0x00d4ff;
    const btnText = this.isReady ? '取消准备' : '准备';

    this.actionBtn.setFillStyle(btnColor);
    this.actionBtnText.setText(btnText);
  }

  setupNetworkListeners() {
    // 玩家加入
    window.network.on('player_joined', (data) => {
      this.addPlayer(data);
      this.soundGenerator.play('item_get');
    });

    // 玩家离开
    window.network.on('player_left', (data) => {
      this.removePlayer(data.socketId);
    });

    // 玩家准备状态更新
    window.network.on('player_ready', (data) => {
      this.updatePlayerReady(data.socketId, true);
    });

    // 倒计时开始
    window.network.on('countdown', (data) => {
      this.showCountdown(data.count);
    });

    // 游戏开始
    window.network.on('game_start', () => {
      this.scene.start('GameScene', {
        code: this.roomCode,
        isTeacher: this.isTeacher,
      });
    });

    // 初始玩家列表
    window.network.on('player_list', (data) => {
      data.players.forEach((p) => this.addPlayer(p));
    });
  }

  addPlayer(data) {
    const slot = this.playerSlots[data.trackNumber - 1];
    if (!slot) return;

    slot.occupied = true;
    slot.socketId = data.socketId;
    slot.nameText.setText(data.name);
    slot.nameText.setColor('#ffffff');
    slot.bg.setStrokeStyle(2, PLAYER_COLORS[data.trackNumber - 1].tint);
  }

  removePlayer(socketId) {
    const slot = this.playerSlots.find((s) => s.socketId === socketId);
    if (!slot) return;

    slot.occupied = false;
    slot.socketId = null;
    slot.nameText.setText('等待加入...');
    slot.nameText.setColor('#666666');
    slot.readyText.setText('');
    slot.bg.setStrokeStyle(2, 0x3a3a5e);
  }

  updatePlayerReady(socketId, ready) {
    const slot = this.playerSlots.find((s) => s.socketId === socketId);
    if (!slot) return;

    slot.readyText.setText(ready ? '已准备 ✓' : '');
    if (ready) {
      this.soundGenerator.play('click');
    }
  }

  showCountdown(count) {
    // 倒计时数字
    const { width, height } = this.scale;

    if (this.countdownText) {
      this.countdownText.destroy();
    }

    this.countdownText = this.add.text(width / 2, height / 2, count.toString(), {
      fontSize: '200px',
      fontFamily: 'Arial Black',
      color: '#ff4444',
      stroke: '#ffffff',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: this.countdownText,
      scaleX: [0, 1.2, 1],
      scaleY: [0, 1.2, 1],
      duration: 800,
      ease: 'Back.easeOut',
    });

    this.soundGenerator.play('countdown');

    if (count === 1) {
      setTimeout(() => {
        this.countdownText.setText('GO!');
        this.countdownText.setColor('#44dd44');
        this.soundGenerator.play('go');
      }, 1000);
    }
  }

  showSettings() {
    // 简单的设置弹窗
    console.log('Show settings');
  }
}
