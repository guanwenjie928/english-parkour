import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { GHIBLI, drawRoundedRect, drawGlassPanel, PLAYER_COLORS } from '../utils/ColorConfig.js';
import { createFloatingParticles, createSoftButton, EASE } from '../utils/AnimationHelper.js';

const C = GHIBLI;
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

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

    this.createBackground();
    this.createRoomCode();
    this.createPlayerList();
    this.createActionButton();

    if (this.isTeacher) {
      this.createTeacherControls();
    }

    this.setupNetworkListeners();

    if (this.isLocal) {
      setTimeout(() => window.network.requestPlayerList(), 100);
      this.hintText.setText('与 4 个 AI 小伙伴一起练习！');
      this.hintText.setColor('#' + C.PRIMARY.toString(16).padStart(6, '0'));
      this.roomCodeText.setText('练习模式');
      this.roomCodeText.setFontSize('32px');
    } else {
      window.network.requestPlayerList();
    }
  }

  createBackground() {
    const { width, height } = this.scale;

    // 天空渐变
    const skyColors = [C.ACCENT, 0xb8e0e0, 0xcdd8c8, 0xdde8d0, C.BG_CREAM];
    const bandH = Math.ceil(height / skyColors.length);
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandH + bandH / 2, width, bandH + 1, color, 0.5);
    });

    // 底部草地
    const grassGfx = this.add.graphics();
    grassGfx.fillStyle(C.GRASS, 0.15);
    grassGfx.fillRoundedRect(-10, height - 40, width + 20, 80, 20);

    // 飘浮花瓣
    createFloatingParticles(this, width, height, {
      count: 6, type: 'petal', depth: 0,
    });

    // 柔和外框
    const borderGfx = this.add.graphics();
    borderGfx.lineStyle(1, C.ACCENT, 0.3);
    borderGfx.strokeRoundedRect(16, 16, width - 32, height - 32, 12);
  }

  createRoomCode() {
    const { width, height } = this.scene;

    // 标签
    this.add.text(width / 2, height * 0.08, 'ROOM CODE', {
      fontSize: '11px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 房间码
    this.roomCodeText = this.add.text(width / 2, height * 0.16, this.roomCode, {
      fontSize: '48px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 呼吸脉冲动画（替代 alpha 闪烁）
    this.tweens.add({
      targets: this.roomCodeText,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: EASE.SMOOTH,
    });

    // 提示文字
    this.hintText = this.add.text(width / 2, height * 0.23, '分享房间号给你的同学们吧', {
      fontSize: '14px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);
  }

  createPlayerList() {
    const { width, height } = this.scale;
    const slotW = 420;
    const slotH = 48;
    const slotGap = 4;
    const startY = height * 0.29;
    const slotX = (width - slotW) / 2;

    this.playerSlots = [];

    for (let i = 0; i < 8; i++) {
      const y = startY + i * (slotH + slotGap);

      // 圆角槽位背景
      const bg = this.add.graphics().setDepth(2);
      const bgColor = i % 2 === 0 ? C.BG_CREAM : C.BG_SAND;
      const bgAlpha = i % 2 === 0 ? 0.7 : 0.5;
      bg.fillStyle(bgColor, bgAlpha);
      bg.fillRoundedRect(slotX, y, slotW, slotH, 8);

      // 颜色圆点（圆形替代方块）
      const color = PLAYER_COLORS[i];
      const dotX = slotX + 22;
      const dotY = y + slotH / 2;
      const dot = this.add.circle(dotX, dotY, 7, color.tint).setDepth(3);
      // 白色环形边框
      this.add.circle(dotX, dotY, 7, color.tint, 0).setStrokeStyle(1, 0xffffff, 0.5).setDepth(3);

      // 跑道编号
      this.add.text(dotX + 16, dotY, `${i + 1}`, {
        fontSize: '14px',
        fontFamily: FONT,
        fontStyle: '700',
        color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5).setDepth(3);

      // 玩家名
      const nameText = this.add.text(dotX + 50, dotY, '等待加入...', {
        fontSize: '16px',
        fontFamily: FONT_CN,
        color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5).setDepth(3);

      // 准备状态
      const readyText = this.add.text(slotX + slotW - 30, dotY, '', {
        fontSize: '11px',
        fontFamily: FONT,
        fontStyle: '700',
        color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0.5).setDepth(3);

      this.playerSlots.push({
        bg, dot, nameText, readyText,
        trackNumber: i + 1,
        occupied: false,
      });
    }
  }

  createActionButton() {
    const { width, height } = this.scale;
    const btnY = height * 0.91;
    const btnText = this.isTeacher ? '开始游戏' : '准  备';

    this.actionBtnRefs = createSoftButton(this, width / 2, btnY, 240, 52, btnText, C.PRIMARY,
      () => this.handleAction(),
      { fontSize: '16px', radius: 14 });
  }

  createTeacherControls() {
    const { width } = this.scale;

    // 老师标签
    this.add.text(width - 20, 20, 'TEACHER', {
      fontSize: '10px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(1, 0).setDepth(10);
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
    const { width } = this.scale;
    const btnY = this.scale.height * 0.91;
    const bgColor = this.isReady ? C.SUNSET : C.PRIMARY;
    const btnText = this.isReady ? '取消准备' : '准  备';

    // Remove old button graphics and recreate
    this.actionBtnRefs?.bg?.destroy();
    this.actionBtnRefs?.text?.destroy();
    this.actionBtnRefs?.hitArea?.destroy();

    this.actionBtnRefs = createSoftButton(this, width / 2, btnY, 240, 52, btnText, bgColor,
      () => this.handleAction(),
      { fontSize: '16px', radius: 14 });
  }

  setupNetworkListeners() {
    window.network.on('player_joined', (data) => {
      this.addPlayer(data);
      this.soundGenerator.play('item_get');
    });

    window.network.on('player_left', (data) => this.removePlayer(data.socketId));

    window.network.on('player_ready', (data) =>
      this.updatePlayerReady(data.socketId, true));

    window.network.on('countdown', (data) => this.showCountdown(data.count));

    window.network.on('game_start', () => {
      this.scene.start('GameScene', {
        code: this.roomCode,
        isTeacher: this.isTeacher,
      });
    });

    window.network.on('player_list', (data) =>
      data.players.forEach((p) => this.addPlayer(p)));
  }

  addPlayer(data) {
    const slot = this.playerSlots[data.trackNumber - 1];
    if (!slot) return;

    slot.occupied = true;
    slot.socketId = data.socketId;
    slot.nameText.setText(data.name);
    slot.nameText.setColor('#' + C.TEXT_WARM.toString(16).padStart(6, '0'));

    // 高亮边框
    const { width } = this.scale;
    const slotW = 420;
    const slotX = (width - slotW) / 2;
    const slotH = 48;
    const slotGap = 4;
    const startY = this.scale.height * 0.29;
    const y = startY + (data.trackNumber - 1) * (slotH + slotGap);
    const color = PLAYER_COLORS[data.trackNumber - 1];

    slot.bg.clear();
    slot.bg.fillStyle(color.tint, 0.15);
    slot.bg.fillRoundedRect(slotX, y, slotW, slotH, 8);
    slot.bg.lineStyle(2, color.tint, 0.5);
    slot.bg.strokeRoundedRect(slotX, y, slotW, slotH, 8);
  }

  removePlayer(socketId) {
    const slot = this.playerSlots.find((s) => s.socketId === socketId);
    if (!slot) return;

    slot.occupied = false;
    slot.socketId = null;
    slot.nameText.setText('等待加入...');
    slot.nameText.setColor('#' + C.TEXT_MUTED.toString(16).padStart(6, '0'));
    slot.readyText.setText('');

    const { width } = this.scale;
    const slotW = 420;
    const slotX = (width - slotW) / 2;
    const slotH = 48;
    const slotGap = 4;
    const startY = this.scale.height * 0.29;
    const y = startY + (slot.trackNumber - 1) * (slotH + slotGap);
    const bgColor = slot.trackNumber % 2 === 1 ? C.BG_CREAM : C.BG_SAND;

    slot.bg.clear();
    slot.bg.fillStyle(bgColor, 0.5);
    slot.bg.fillRoundedRect(slotX, y, slotW, slotH, 8);
  }

  updatePlayerReady(socketId, ready) {
    const slot = this.playerSlots.find((s) => s.socketId === socketId);
    if (!slot) return;

    slot.readyText.setText(ready ? 'READY' : '');
    if (ready) this.soundGenerator.play('click');
  }

  showCountdown(count) {
    const { width, height } = this.scale;

    if (this.countdownText) this.countdownText.destroy();

    this.countdownText = this.add.text(width / 2, height / 2, count.toString(), {
      fontSize: '120px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#' + C.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(100);

    // 弹性缩放动画（替代 Linear）
    this.countdownText.setScale(0.2);
    this.tweens.add({
      targets: this.countdownText,
      scaleX: 1,
      scaleY: 1,
      duration: 700,
      ease: EASE.BOUNCE,
    });

    this.soundGenerator.play('countdown');

    if (count === 1) {
      setTimeout(() => {
        if (!this.scene.isActive() || !this.countdownText?.active) return;
        this.countdownText.setText('GO!');
        this.countdownText.setColor('#' + C.PRIMARY.toString(16).padStart(6, '0'));
        this.countdownText.setScale(0.5);
        this.tweens.add({
          targets: this.countdownText,
          scaleX: 1,
          scaleY: 1,
          duration: 500,
          ease: EASE.BOUNCE,
        });
        this.soundGenerator.play('go');
      }, 1000);
    }
  }

  showSettings() {
    console.log('Show settings');
  }
}
