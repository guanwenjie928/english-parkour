import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder, PLAYER_COLORS } from '../utils/ColorConfig.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

export class LobbyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LobbyScene' });
  }

  init(data) {
    this.roomCode = data.code || '000000';
    this.playerName = data.name || '匿名';
    this.isTeacher = data.isTeacher || false;
    this.isLocal = data.isLocal || this.roomCode === 'SOLO';
    this.players = new Map();
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    // 纯色暖棕背景
    this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK);

    // 像素网格装饰
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, PX.BG_MID, 0.2);
    for (let x = 0; x < width; x += 40) {
      gridGfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridGfx.lineBetween(0, y, width, y);
    }

    // 外框装饰
    const outerGfx = this.add.graphics();
    drawPixelBorder(outerGfx, 16, 16, width - 32, height - 32, PX.BG_LIGHT, 2);

    // 房间码标签
    this.add.text(width / 2, height * 0.10, 'ROOM  CODE', {
      fontSize: '9px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 房间码大标题
    this.roomCodeText = this.add.text(width / 2, height * 0.18, this.roomCode, {
      fontSize: '56px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 闪烁动画（alpha 闪烁，像素感）
    this.tweens.add({
      targets: this.roomCodeText,
      alpha: 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
    });

    // 提示文字
    this.hintText = this.add.text(width / 2, height * 0.26, '告诉其他同学房间号，让他们加入！', {
      fontSize: '14px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 玩家列表
    this.createPlayerList();

    // 准备/开始按钮
    this.createActionButton();

    // 老师模式
    if (this.isTeacher) {
      this.createTeacherControls();
    }

    // 网络事件
    this.setupNetworkListeners();

    // 本地模式
    if (this.isLocal) {
      setTimeout(() => {
        window.network.requestPlayerList();
      }, 100);
    } else {
      window.network.requestPlayerList();
    }

    // 单人模式提示
    if (this.isLocal) {
      this.hintText.setText('与 4 个 AI 对手一起练习！');
      this.hintText.setColor('#' + PX.PRIMARY.toString(16).padStart(6, '0'));
      this.roomCodeText.setText('练习模式');
      this.roomCodeText.setFontSize('32px');
    }
  }

  createPlayerList() {
    const { width, height } = this.scale;
    const startY = height * 0.34;
    const slotHeight = 52;
    const slotGap = 8;

    this.playerSlots = [];

    for (let i = 0; i < 8; i++) {
      const y = startY + i * (slotHeight + slotGap);
      const slotW = 420;
      const slotX = (width - slotW) / 2;

      // 槽位背景（直角矩形）
      const bg = this.add.rectangle(width / 2, y + slotHeight / 2, slotW, slotHeight, PX.BG_MID, 0.9);

      // 像素边框
      const border = this.add.graphics();
      drawPixelBorder(border, slotX, y, slotW, slotHeight, PX.BG_LIGHT, 1);

      // 颜色方块（代替圆点）
      const color = PLAYER_COLORS[i];
      const dotX = slotX + 24;
      const dotY = y + slotHeight / 2;
      const dotSize = 14;
      const dotGfx = this.add.graphics();
      dotGfx.fillStyle(color.tint, 1);
      dotGfx.fillRect(dotX - dotSize / 2, dotY - dotSize / 2, dotSize, dotSize);
      // 方块边框
      drawPixelBorder(dotGfx, dotX - dotSize / 2 - 2, dotY - dotSize / 2 - 2, dotSize + 4, dotSize + 4, 0xffffff, 1);

      // 跑道编号
      this.add.text(dotX + 20, dotY, `${i + 1}`, {
        fontSize: '16px',
        fontFamily: FONT_CN,
        color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5);

      // 玩家名
      const nameText = this.add.text(dotX + 60, dotY, '等待加入...', {
        fontSize: '16px',
        fontFamily: FONT_CN,
        color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5);

      // 准备状态
      const readyText = this.add.text(slotX + slotW - 30, dotY, '', {
        fontSize: '11px',
        fontFamily: FONT,
        color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0.5);

      this.playerSlots.push({
        bg,
        border,
        dotGfx,
        nameText,
        readyText,
        trackNumber: i + 1,
        occupied: false,
      });
    }
  }

  createActionButton() {
    const { width, height } = this.scale;

    const btnY = height * 0.90;
    const btnW = 240;
    const btnH = 54;
    const btnColor = this.isTeacher ? PX.PRIMARY : PX.PRIMARY;
    const btnText = this.isTeacher ? '开始游戏' : '准  备';
    const btnX = width / 2 - btnW / 2;
    const btnCY = btnY - btnH / 2;

    this.actionBtn = this.add.rectangle(width / 2, btnY, btnW, btnH, btnColor)
      .setInteractive({ useHandCursor: true });

    // 像素边框
    this.actionBtnBorder = this.add.graphics();
    drawPixelBorder(this.actionBtnBorder, btnX - 3, btnCY - 3, btnW + 6, btnH + 6, 0x5a9e38, 2);

    this.actionBtnText = this.add.text(width / 2, btnY, btnText, {
      fontSize: '14px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_DARK.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.actionBtn.on('pointerdown', () => this.handleAction());
    this.actionBtn.on('pointerover', () => this.actionBtn.setFillStyle(PX.HIGHLIGHT));
    this.actionBtn.on('pointerout', () => {
      this.actionBtn.setFillStyle(this.isReady ? PX.ERROR : btnColor);
    });
  }

  createTeacherControls() {
    const { width } = this.scale;

    // 老师模式标签
    this.add.text(width - 20, 20, 'TEACHER', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(1, 0);

    // 设置按钮
    const settingsBtn = this.add.rectangle(70, 36, 90, 36, PX.SECONDARY)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showSettings())
      .on('pointerover', function () { this.setFillStyle(PX.HIGHLIGHT); })
      .on('pointerout', function () { this.setFillStyle(PX.SECONDARY); });

    const btnBorder = this.add.graphics();
    drawPixelBorder(btnBorder, 70 - 47, 36 - 20, 94, 40, PX.BG_LIGHT, 1);

    this.add.text(70, 36, 'SETUP', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
  }

  handleAction() {
    this.soundGenerator.play('click');

    if (this.isTeacher) {
      window.network.startGame();
    } else {
      this.isReady = !this.isReady;
      window.network.setReady(this.isReady);
      this.updateReadyButton();
    }
  }

  updateReadyButton() {
    const btnColor = this.isReady ? PX.ERROR : PX.PRIMARY;
    const btnText = this.isReady ? '取消准备' : '准  备';
    const { width } = this.scale;

    this.actionBtn.setFillStyle(btnColor);
    this.actionBtnText.setText(btnText);

    // 更新边框颜色
    if (this.actionBtnBorder) {
      this.actionBtnBorder.clear();
      const btnW = 240;
      const btnH = 54;
      const btnY = this.scale.height * 0.90;
      const btnX = width / 2 - btnW / 2;
      const btnCY = btnY - btnH / 2;
      const borderColor = this.isReady ? 0xb0443a : 0x5a9e38;
      drawPixelBorder(this.actionBtnBorder, btnX - 3, btnCY - 3, btnW + 6, btnH + 6, borderColor, 2);
    }
  }

  setupNetworkListeners() {
    window.network.on('player_joined', (data) => {
      this.addPlayer(data);
      this.soundGenerator.play('item_get');
    });

    window.network.on('player_left', (data) => {
      this.removePlayer(data.socketId);
    });

    window.network.on('player_ready', (data) => {
      this.updatePlayerReady(data.socketId, true);
    });

    window.network.on('countdown', (data) => {
      this.showCountdown(data.count);
    });

    window.network.on('game_start', () => {
      this.scene.start('GameScene', {
        code: this.roomCode,
        isTeacher: this.isTeacher,
      });
    });

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
    slot.nameText.setColor('#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'));

    // 高亮边框
    slot.border.clear();
    const { width } = this.scale;
    const slotW = 420;
    const slotX = (width - slotW) / 2;
    const slotHeight = 52;
    const startY = this.scale.height * 0.34;
    const slotGap = 8;
    const y = startY + (data.trackNumber - 1) * (slotHeight + slotGap);
    const color = PLAYER_COLORS[data.trackNumber - 1];
    drawPixelBorder(slot.border, slotX, y, slotW, slotHeight, color.tint, 2);
  }

  removePlayer(socketId) {
    const slot = this.playerSlots.find((s) => s.socketId === socketId);
    if (!slot) return;

    slot.occupied = false;
    slot.socketId = null;
    slot.nameText.setText('等待加入...');
    slot.nameText.setColor('#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'));
    slot.readyText.setText('');

    slot.border.clear();
    const { width } = this.scale;
    const slotW = 420;
    const slotX = (width - slotW) / 2;
    const slotHeight = 52;
    const startY = this.scale.height * 0.34;
    const slotGap = 8;
    const y = startY + (slot.trackNumber - 1) * (slotHeight + slotGap);
    drawPixelBorder(slot.border, slotX, y, slotW, slotHeight, PX.BG_LIGHT, 1);
  }

  updatePlayerReady(socketId, ready) {
    const slot = this.playerSlots.find((s) => s.socketId === socketId);
    if (!slot) return;

    slot.readyText.setText(ready ? 'READY' : '');
    if (ready) {
      this.soundGenerator.play('click');
    }
  }

  showCountdown(count) {
    const { width, height } = this.scale;

    if (this.countdownText) {
      this.countdownText.destroy();
    }

    this.countdownText = this.add.text(width / 2, height / 2, count.toString(), {
      fontSize: '140px',
      fontFamily: FONT,
      color: '#' + PX.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(100);

    // 像素感缩放动画（骤变式，无弹性缓动）
    this.tweens.add({
      targets: this.countdownText,
      scaleX: { from: 0.3, to: 1 },
      scaleY: { from: 0.3, to: 1 },
      duration: 600,
      ease: 'Linear',
    });

    this.soundGenerator.play('countdown');

    if (count === 1) {
      setTimeout(() => {
        this.countdownText.setText('GO!');
        this.countdownText.setColor('#' + PX.PRIMARY.toString(16).padStart(6, '0'));
        this.soundGenerator.play('go');
      }, 1000);
    }
  }

  showSettings() {
    console.log('Show settings');
  }
}
