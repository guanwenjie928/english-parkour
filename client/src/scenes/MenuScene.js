import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder, PLAYER_COLORS } from '../utils/ColorConfig.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

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
    this.createLogo();
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

    // 纯色暖棕背景
    this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK);

    // 像素网格装饰（8-bit 经典风格）
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, PX.BG_MID, 0.3);
    for (let x = 0; x < width; x += 40) {
      gridGfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridGfx.lineBetween(0, y, width, y);
    }
  }

  createLogo() {
    const { width } = this.scale;

    if (this.textures.exists('menu-logo')) {
      const logo = this.add.image(width / 2, 110, 'menu-logo');
      logo.setScale(0.7);

      // 纯 alpha 入场（无缩放）
      this.tweens.add({
        targets: logo,
        alpha: { from: 0, to: 1 },
        duration: 600,
        ease: 'Linear',
      });
    } else {
      // Fallback: 像素文字 Logo
      this.add.text(width / 2, 80, '英 语 跑 酷', {
        fontSize: '36px',
        fontFamily: FONT_CN,
        color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      this.add.text(width / 2, 130, 'ENGLISH  PARKOUR', {
        fontSize: '10px',
        fontFamily: FONT,
        color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);
    }
  }

  createDecorations() {
    const { width, height } = this.scale;

    if (this.textures.exists('menu-character')) {
      const leftChar = this.add.image(100, height - 160, 'menu-character');
      leftChar.setScale(0.5);
      leftChar.setFlipX(true);
      leftChar.setTint(PX.SECONDARY);

      const rightChar = this.add.image(width - 100, height - 160, 'menu-character');
      rightChar.setScale(0.5);
      rightChar.setTint(PX.BG_LIGHT);
    }
  }

  createPanel() {
    const { width, height } = this.scale;
    const panelW = 420;
    const panelH = 200;
    const px = (width - panelW) / 2;
    const py = height * 0.42;

    // 面板背景（纯色 + 像素边框）
    const panelBg = this.add.rectangle(width / 2, py + panelH / 2, panelW, panelH, PX.BG_MID, 0.95);
    const panelBorder = this.add.graphics();
    drawPixelBorder(panelBorder, px, py, panelW, panelH, PX.BG_LIGHT, 3);

    // 内装饰线
    const innerGfx = this.add.graphics();
    drawPixelBorder(innerGfx, px + 10, py + 10, panelW - 20, panelH - 20, PX.BG_LIGHT, 1);

    this.panelBg = panelBg;
    this.panelBorder = panelBorder;

    // 名字显示区域（点击弹出输入框）
    this.createNameDisplay(width / 2, py + 50, panelW - 60);
  }

  createNameDisplay(x, y, width) {
    const height = 48;
    const displayBg = this.add.rectangle(x, y, width, height, PX.BG_DARK, 0.8)
      .setInteractive({ useHandCursor: true });

    const displayBorder = this.add.graphics();
    drawPixelBorder(displayBorder, x - width / 2, y - height / 2, width, height, PX.PRIMARY, 2);

    this.nameLabel = this.add.text(x, y - 25, 'YOUR NAME (点击输入)', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.nameDisplayText = this.add.text(x, y, '玩家', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 光标闪烁效果
    this.cursorText = this.add.text(x + 60, y, '_', {
      fontSize: '16px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setVisible(false);

    this.tweens.add({
      targets: this.cursorText,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
    });

    displayBg.on('pointerdown', () => {
      this.soundGenerator.play('click');
      this.openNameInput();
    });

    displayBg.on('pointerover', () => displayBorder.clear() && drawPixelBorder(displayBorder, x - width / 2, y - height / 2, width, height, PX.HIGHLIGHT, 2));
    displayBg.on('pointerout', () => displayBorder.clear() && drawPixelBorder(displayBorder, x - width / 2, y - height / 2, width, height, PX.PRIMARY, 2));

    this.nameDisplayBg = displayBg;
    this.nameDisplayBorder = displayBorder;
  }

  createButtons() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const startY = height * 0.68;

    // 快速开始
    this.quickStartBtn = this._makeButton(cx, startY, 280, 54,
      'QUICK  START', PX.PRIMARY, PX.TEXT_DARK,
      () => this.handleQuickStart());

    // 加入房间
    this._makeButton(cx, startY + 70, 240, 44,
      'JOIN  ROOM', PX.BG_LIGHT, PX.TEXT_LIGHT,
      () => this.openRoomInput());

    // 老师模式
    this._makeButton(cx, startY + 125, 200, 38,
      'TEACHER', PX.BG_MID, PX.TEXT_MUTED,
      () => this.openRoomInput(true));
  }

  _makeButton(x, y, w, h, text, fillColor, textColor, onClick) {
    const bx = x - w / 2;
    const by = y - h / 2;

    const bg = this.add.rectangle(x, y, w, h, fillColor)
      .setInteractive({ useHandCursor: true });

    const border = this.add.graphics();
    drawPixelBorder(border, bx - 2, by - 2, w + 4, h + 4,
      fillColor === PX.PRIMARY ? 0x5a9e38 : PX.BG_LIGHT, 2);

    const label = this.add.text(x, y, text, {
      fontSize: '11px',
      fontFamily: FONT,
      color: '#' + textColor.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setFillStyle(PX.HIGHLIGHT));
    bg.on('pointerout', () => bg.setFillStyle(fillColor));
    bg.on('pointerdown', () => {
      this.soundGenerator.play('click');
      onClick();
    });

    bg.setAlpha(0); label.setAlpha(0); border.setAlpha(0);
    this.tweens.add({
      targets: [bg, label, border],
      alpha: 1,
      duration: 400,
      ease: 'Linear',
    });

    return bg;
  }

  createInputModal() {
    const { width, height } = this.scale;

    // 输入遮罩（全屏，点击关闭）
    this.inputOverlay = this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK, 0.85)
      .setVisible(false)
      .setInteractive()
      .setDepth(100);

    // 输入面板
    const panelW = 400;
    const panelH = 180;
    const px = (width - panelW) / 2;
    const py = height * 0.35;

    this.inputPanel = this.add.rectangle(width / 2, py + panelH / 2, panelW, panelH, PX.BG_MID, 0.98)
      .setVisible(false)
      .setDepth(100);

    this.inputPanelBorder = this.add.graphics()
      .setVisible(false)
      .setDepth(100);
    drawPixelBorder(this.inputPanelBorder, px, py, panelW, panelH, PX.PRIMARY, 3);

    // 输入标题
    this.inputTitle = this.add.text(width / 2, py + 30, '', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5)
      .setVisible(false)
      .setDepth(100);

    // 输入值显示
    this.inputValue = this.add.text(width / 2, py + 80, '', {
      fontSize: '28px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5)
      .setVisible(false)
      .setDepth(100);

    // 光标
    this.inputCursor = this.add.text(width / 2 + 80, py + 80, '_', {
      fontSize: '28px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5)
      .setVisible(false)
      .setDepth(100);

    this.tweens.add({
      targets: this.inputCursor,
      alpha: 0,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
    });

    // 提示文字
    this.inputHint = this.add.text(width / 2, py + 140, '[ENTER] 确认  [ESC] 取消', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5)
      .setVisible(false)
      .setDepth(100);

    // 点击遮罩关闭
    this.inputOverlay.on('pointerdown', () => this.closeInput());
  }

  setupKeyboardInput() {
    this.input.keyboard.on('keydown', (event) => {
      if (!this.inputMode) return;

      if (event.key === 'Enter') {
        this.confirmInput();
        return;
      }

      if (event.key === 'Escape') {
        this.closeInput();
        return;
      }

      if (event.key === 'Backspace') {
        if (this.inputMode === 'name') {
          this.playerName = this.playerName.slice(0, -1);
        } else if (this.inputMode === 'room') {
          this.roomCode = this.roomCode.slice(0, -1);
        }
        this.updateInputDisplay();
        return;
      }

      // 输入限制
      const char = event.key;
      if (this.inputMode === 'name') {
        // 名字：字母数字中文，最多8个字符
        if (/^[a-zA-Z0-9\u4e00-\u9fa5]$/.test(char) && this.playerName.length < 8) {
          this.playerName += char;
        }
      } else if (this.inputMode === 'room') {
        // 房间码：仅数字，最多6位
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
    this.inputCursor.x = this.inputValue.x + this.inputValue.width / 2 + 10;

    this.inputOverlay.setVisible(true);
    this.inputPanel.setVisible(true);
    this.inputPanelBorder.setVisible(true);
    this.inputTitle.setVisible(true);
    this.inputValue.setVisible(true);
    this.inputCursor.setVisible(true);
    this.inputHint.setVisible(true);
  }

  updateInputDisplay() {
    const value = this.inputMode === 'name' ? this.playerName : this.roomCode;
    this.inputValue.setText(value);
    this.inputCursor.x = this.inputValue.x + this.inputValue.width / 2 + 10;
  }

  confirmInput() {
    if (this.inputMode === 'name') {
      this.playerName = this.playerName.trim() || '玩家';
      this.nameDisplayText.setText(this.playerName);
      this.nameLabel.setText('YOUR NAME');
    }
    this.closeInput();
  }

  closeInput() {
    this.inputMode = null;
    this.inputOverlay.setVisible(false);
    this.inputPanel.setVisible(false);
    this.inputPanelBorder.setVisible(false);
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
    const { width, height } = this.scale;

    const errBg = this.add.rectangle(width / 2, height - 50, 500, 36, PX.ERROR, 0.9);
    const errBorder = this.add.graphics();
    drawPixelBorder(errBorder, width / 2 - 252, height - 68, 504, 40, 0xb0443a, 2);

    const errText = this.add.text(width / 2, height - 50, msg, {
      fontSize: '10px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [errBg, errBorder, errText],
      alpha: 0,
      duration: 2500,
      delay: 1000,
      onComplete: () => { errBg.destroy(); errBorder.destroy(); errText.destroy(); },
    });
  }

  shutdown() {
    this.panelBg?.destroy();
    this.panelBorder?.destroy();
    this.inputOverlay?.destroy();
    this.inputPanel?.destroy();
  }
}
