import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { GHIBLI, drawRoundedRect, drawSoftBorder, drawGlassPanel, PLAYER_COLORS } from '../utils/ColorConfig.js';
import { createFloatingParticles, createSoftButton, slideUpIn, popIn, EASE } from '../utils/AnimationHelper.js';

const C = GHIBLI;
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.playerName = '';
    this.roomCode = '';
    this.inputMode = null; // 'name', 'room', null
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    this.createBackground();
    this.createDecorations();
    this.createPanel();
    this.createButtons();
    this.createInputModal();
    this.setupKeyboardInput();
    this.checkDuplicateTab();

    try {
      this.soundGenerator.playBGM('menu');
    } catch (e) {
      console.warn('[MenuScene] BGM 播放失败:', e.message);
    }
  }

  createBackground() {
    const { width, height } = this.scale;

    // 优先使用 menu-bg 素材图
    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu-bg');
      // 按比例缩放填满屏幕
      const tex = this.textures.get('menu-bg').source[0];
      const scaleX = width / tex.width;
      const scaleY = height / tex.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale).setDepth(0).setAlpha(0.55);
    }

    // 天空渐变色条（叠加在背景图上）
    const skyColors = [C.ACCENT, 0xb8e0e0, 0xcdd8c8, 0xdde8d0, C.BG_CREAM];
    const bandH = Math.ceil(height / skyColors.length);
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandH + bandH / 2, width, bandH + 1, color, 0.15);
    });

    // 底部草地
    const grassGfx = this.add.graphics();
    grassGfx.fillStyle(C.GRASS, 0.2);
    grassGfx.fillRoundedRect(-10, height - 50, width + 20, 100, 25);

    // 飘浮花瓣
    createFloatingParticles(this, width, height, {
      count: 8, type: 'petal', depth: 0,
    });
  }

  createDecorations() {
    const { width, height } = this.scale;

    if (this.textures.exists('menu-character')) {
      // 单主视觉角色立绘，居中放大
      const char = this.add.image(width / 2, height * 0.42, 'menu-character');
      char.setScale(0.7).setDepth(1).setAlpha(0.85);

      // 柔和呼吸动画
      this.tweens.add({
        targets: char,
        scaleX: 0.73,
        scaleY: 0.73,
        duration: 3500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 角色轻微浮动
      this.tweens.add({
        targets: char,
        y: char.y - 6,
        duration: 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  createPanel() {
    const { width, height } = this.scale;
    const panelW = 380;
    const panelH = 110;
    const px = (width - panelW) / 2;
    const py = height * 0.56;

    // 毛玻璃面板
    this.panelGfx = this.add.graphics().setDepth(2);
    drawGlassPanel(this.panelGfx, px, py, panelW, panelH, 12, C.BG_CREAM, 0.88, C.ACCENT, 2);

    // 标签
    this.nameLabel = this.add.text(width / 2, py + 18, '你的名字', {
      fontSize: '12px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    // 名字显示区域
    const nameW = panelW - 60;
    const nameH = 40;
    const nameX = (width - nameW) / 2;
    const nameY = py + 48;

    const nameBg = this.add.graphics().setDepth(3);
    nameBg.fillStyle(C.BG_SAND, 0.9);
    nameBg.fillRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 8);
    nameBg.lineStyle(1, C.ACCENT, 0.5);
    nameBg.strokeRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 8);

    this.nameDisplayText = this.add.text(width / 2, nameY, '玩家', {
      fontSize: '18px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(4);

    // 编辑图标
    const editIcon = this.add.text(width / 2 + nameW / 2 - 18, nameY, '✏️', {
      fontSize: '14px',
    }).setOrigin(0.5).setDepth(4);

    // 点击热区
    const hitArea = this.add.rectangle(width / 2, nameY, nameW, nameH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    hitArea.on('pointerdown', () => {
      this.soundGenerator.play('click');
      this.openNameInput();
    });

    hitArea.on('pointerover', () => {
      nameBg.clear();
      nameBg.fillStyle(C.BG_WARM, 0.9);
      nameBg.fillRoundedRect(nameX - 1, nameY - nameH / 2 - 1, nameW + 2, nameH + 2, 9);
      nameBg.lineStyle(2, C.ACCENT, 0.7);
      nameBg.strokeRoundedRect(nameX - 1, nameY - nameH / 2 - 1, nameW + 2, nameH + 2, 9);
    });

    hitArea.on('pointerout', () => {
      nameBg.clear();
      nameBg.fillStyle(C.BG_SAND, 0.9);
      nameBg.fillRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 8);
      nameBg.lineStyle(1, C.ACCENT, 0.5);
      nameBg.strokeRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 8);
    });

    this.nameDisplayBg = nameBg;

    // 入场动画
    slideUpIn(this, [this.nameLabel, this.nameDisplayText, editIcon], 200);
  }

  createButtons() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const startY = height * 0.71;

    // 快速开始 — 主按钮
    createSoftButton(this, cx, startY, 280, 50, '快 速 开 始', C.PRIMARY,
      () => this.handleQuickStart(),
      { fontSize: '18px', radius: 14 });

    // 加入房间
    createSoftButton(this, cx, startY + 65, 240, 44, '加 入 房 间', C.SECONDARY,
      () => this.openRoomInput(),
      { fontSize: '16px', radius: 12 });

    // 老师模式
    createSoftButton(this, cx, startY + 118, 200, 38, '老 师 模 式', C.BG_SAND,
      () => this.openRoomInput(true),
      { fontSize: '14px', radius: 10, textColor: C.TEXT_DARK });

    // 按钮入场
    this.tweens.add({
      targets: this.children.list.filter(c => c.type === 'Graphics'),
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: EASE.SMOOTH,
      delay: 400,
    });
  }

  createInputModal() {
    const { width, height } = this.scale;

    // 浅色遮罩（不再用深棕）
    this.inputOverlay = this.add.rectangle(width / 2, height / 2, width, height, C.BG_CREAM, 0.75)
      .setVisible(false)
      .setInteractive()
      .setDepth(100);

    // 圆角面板
    const panelW = 380;
    const panelH = 160;
    const px = (width - panelW) / 2;
    const py = height * 0.33;

    this.inputPanelGfx = this.add.graphics()
      .setVisible(false).setDepth(100);

    const showPanel = () => {
      this.inputPanelGfx.clear();
      drawGlassPanel(this.inputPanelGfx, px, py, panelW, panelH, 14, C.BG_CREAM, 0.95, C.PRIMARY, 2);
    };

    // 标题
    this.inputTitle = this.add.text(width / 2, py + 28, '', {
      fontSize: '14px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    // 输入值
    this.inputValue = this.add.text(width / 2, py + 70, '', {
      fontSize: '30px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    // 光标
    this.inputCursor = this.add.text(width / 2 + 80, py + 70, '|', {
      fontSize: '26px',
      fontFamily: FONT,
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this.tweens.add({
      targets: this.inputCursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: EASE.SMOOTH,
    });

    // 提示
    this.inputHint = this.add.text(width / 2, py + 125, 'Enter 确认  ·  Esc 取消', {
      fontSize: '11px',
      fontFamily: FONT,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    // 保存 showPanel 回调
    this._showModalPanel = showPanel;

    this.inputOverlay.on('pointerdown', () => this.closeInput());
  }

  setupKeyboardInput() {
    this.input.keyboard.on('keydown', (event) => {
      if (!this.inputMode) return;

      if (event.key === 'Enter') { this.confirmInput(); return; }
      if (event.key === 'Escape') { this.closeInput(); return; }
      if (event.key === 'Backspace') {
        if (this.inputMode === 'name') {
          this.playerName = this.playerName.slice(0, -1);
        } else if (this.inputMode === 'room') {
          this.roomCode = this.roomCode.slice(0, -1);
        }
        this.updateInputDisplay();
        return;
      }

      const char = event.key;
      if (this.inputMode === 'name') {
        if (/^[a-zA-Z0-9\u4e00-\u9fa5]$/.test(char) && this.playerName.length < 8) {
          this.playerName += char;
        }
      } else if (this.inputMode === 'room') {
        if (/^[0-9]$/.test(char) && this.roomCode.length < 6) {
          this.roomCode += char;
        }
      }
      this.updateInputDisplay();
    });
  }

  openNameInput() {
    this.inputMode = 'name';
    this.playerName = this.playerName || '玩家';
    this.showInputModal('输入你的名字', this.playerName);
  }

  openRoomInput(isTeacher = false) {
    this.inputMode = 'room';
    this.isTeacherMode = isTeacher;
    const title = isTeacher ? '输入房间号 (老师模式)' : '输入房间号 (6位数字)';
    this.showInputModal(title, this.roomCode);
  }

  showInputModal(title, value) {
    this.inputTitle.setText(title);
    this.inputValue.setText(value);
    this.inputCursor.x = this.inputValue.x + this.inputValue.width / 2 + 12;

    this._showModalPanel();
    this.inputOverlay.setVisible(true);
    this.inputPanelGfx.setVisible(true);
    this.inputTitle.setVisible(true);
    this.inputValue.setVisible(true);
    this.inputCursor.setVisible(true);
    this.inputHint.setVisible(true);
  }

  updateInputDisplay() {
    const value = this.inputMode === 'name' ? this.playerName : this.roomCode;
    this.inputValue.setText(value);
    this.inputCursor.x = this.inputValue.x + this.inputValue.width / 2 + 12;
  }

  confirmInput() {
    if (this.inputMode === 'name') {
      this.playerName = this.playerName.trim() || '玩家';
      this.nameDisplayText.setText(this.playerName);
    }
    this.closeInput();
  }

  closeInput() {
    this.inputMode = null;
    this.inputOverlay.setVisible(false);
    this.inputPanelGfx.setVisible(false);
    this.inputTitle.setVisible(false);
    this.inputValue.setVisible(false);
    this.inputCursor.setVisible(false);
    this.inputHint.setVisible(false);
  }

  handleQuickStart() {
    const name = this.playerName.trim() || '玩家';
    this.scene.start('LobbyScene', { code: 'SOLO', name, isTeacher: false, isLocal: true });
    window.network.joinRoom('SOLO', name, false);
  }

  handleJoinRoom() {
    const name = this.playerName.trim() || '玩家';
    const code = this.roomCode.trim();
    if (!code || code.length !== 6) {
      this.showError('请输入6位房间号');
      return;
    }
    this.scene.start('LobbyScene', { code, name, isTeacher: false });
    window.network.joinRoom(code, name, false);
  }

  handleTeacherMode() {
    const name = this.playerName.trim() || '老师';
    const code = this.roomCode.trim();
    if (!code || code.length !== 6) {
      this.showError('请输入房间号');
      return;
    }
    this.scene.start('TeacherScene', { code, name });
    window.network.joinRoom(code, name, true);
  }

  async checkDuplicateTab() {
    const result = await window.checkDuplicateSession();
    if (result.duplicate) {
      this.showError('你已在另一个标签页打开游戏');
    }
  }

  showError(msg) {
    this.soundGenerator.play('wrong');
    const { width } = this.scale;

    // Toast 风格错误提示（圆角，顶部滑入）
    const toastW = 400;
    const toastH = 40;
    const toastX = (width - toastW) / 2;
    const toastY = 60;

    const toastGfx = this.add.graphics().setDepth(200);
    toastGfx.fillStyle(C.ERROR, 0.92);
    toastGfx.fillRoundedRect(toastX, toastY, toastW, toastH, 10);

    const toastText = this.add.text(width / 2, toastY + toastH / 2, msg, {
      fontSize: '14px',
      fontFamily: FONT_CN,
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    // 从顶部滑入
    toastGfx.y = -60;
    toastText.y = -60;
    this.tweens.add({
      targets: [toastGfx, toastText],
      y: '+=60',
      duration: 300,
      ease: EASE.BOUNCE,
    });

    // 自动滑出消失
    this.tweens.add({
      targets: [toastGfx, toastText],
      alpha: 0,
      y: '-=20',
      duration: 400,
      delay: 2000,
      ease: EASE.SMOOTH,
      onComplete: () => { toastGfx.destroy(); toastText.destroy(); },
    });
  }

  shutdown() {
    this.inputOverlay?.destroy();
  }
}
