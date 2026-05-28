import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder, PLAYER_COLORS } from '../utils/ColorConfig.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    this.createBackground();
    this.createLogo();
    this.createDecorations();
    this.createPanel();
    this.createButtons();
    this.checkDuplicateTab();

    try {
      this.soundGenerator.playBGM('menu');
    } catch (e) {
      console.warn('[MenuScene] BGM 播放失败:', e.message);
    }
  }

  createBackground() {
    const { width, height } = this.scale;

    // 纯色暖棕背景（替代渐变）
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

      this.tweens.add({
        targets: logo,
        scale: { from: 0, to: 0.7 },
        alpha: { from: 0, to: 1 },
        duration: 600,
        ease: 'Linear',
      });
    } else {
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
      leftChar.setScale(0.7);
      leftChar.setFlipX(true);
      leftChar.setTint(PX.SECONDARY);

      const rightChar = this.add.image(width - 100, height - 160, 'menu-character');
      rightChar.setScale(0.7);
      rightChar.setTint(PX.BG_LIGHT);
    }
  }

  createPanel() {
    const { width, height } = this.scale;
    const panelW = 420;
    const panelH = 300;
    const px = (width - panelW) / 2;
    const py = height * 0.42;

    // 面板背景（纯色 + 像素边框，拒绝圆角）
    const panelBg = this.add.rectangle(width / 2, py + panelH / 2, panelW, panelH, PX.BG_MID, 0.95);
    const panelBorder = this.add.graphics();
    drawPixelBorder(panelBorder, px, py, panelW, panelH, PX.BG_LIGHT, 3);

    // 内装饰线
    const innerGfx = this.add.graphics();
    drawPixelBorder(innerGfx, px + 10, py + 10, panelW - 20, panelH - 20, PX.BG_LIGHT, 1);

    this.panelBg = panelBg;
    this.panelBorder = panelBorder;

    // 输入区域
    this.createInputs(width / 2, py, panelW);
  }

  createInputs(centerX, panelY, panelW) {
    const inputW = 300;
    const inputH = 48;

    // 名字标签
    this.add.text(centerX - panelW / 2 + 50, panelY + 40, 'YOUR  NAME', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0, 0.5);

    this.nameInput = this.createInputElement({
      x: centerX,
      y: panelY + 70,
      width: inputW,
      height: inputH,
      placeholder: '你的名字',
      id: 'nameInput',
      maxLength: 12,
    });

    // 房间码（默认隐藏）
    this.roomInput = this.createInputElement({
      x: centerX,
      y: panelY + 140,
      width: inputW,
      height: inputH,
      placeholder: '房间号 (6位)',
      id: 'roomInput',
      maxLength: 6,
      numeric: true,
    });
    if (this.roomInput?.domElement) {
      this.roomInput.domElement.style.display = 'none';
    }
  }

  createLabel(x, y, text) {
    this.add.text(x, y, text, {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0, 0.5);
  }

  createInputElement({ x, y, width, height, placeholder, id, maxLength, numeric }) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.maxLength = maxLength;
    input.id = id;
    input.style.cssText = `
      position: absolute;
      left: ${x - width / 2}px;
      top: ${y - height / 2}px;
      width: ${width}px;
      height: ${height}px;
      font-size: 16px;
      font-family: 'Press Start 2P', monospace;
      text-align: center;
      border: 3px solid #7ec850;
      border-radius: 0;
      background: rgba(43,30,16,0.8);
      color: #f5e6d0;
      outline: none;
      box-shadow: none;
      -webkit-appearance: none;
    `;

    input.addEventListener('focus', () => {
      input.style.borderColor = '#f0d080';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#7ec850';
    });

    if (numeric) {
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
    }

    document.body.appendChild(input);

    return {
      domElement: input,
      get value() { return input.value; },
      destroy: () => input.remove(),
    };
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
      () => this.handleJoinRoom());

    // 老师模式
    this._makeButton(cx, startY + 125, 200, 38,
      'TEACHER', PX.BG_MID, PX.TEXT_MUTED,
      () => this.handleTeacherMode());
  }

  _makeButton(x, y, w, h, text, fillColor, textColor, onClick) {
    const bx = x - w / 2;
    const by = y - h / 2;

    // 按钮背景
    const bg = this.add.rectangle(x, y, w, h, fillColor)
      .setInteractive({ useHandCursor: true });

    // 像素边框（深一档色）
    const border = this.add.graphics();
    drawPixelBorder(border, bx - 2, by - 2, w + 4, h + 4,
      fillColor === PX.PRIMARY ? 0x5a9e38 : PX.BG_LIGHT, 2);

    // 文字
    const label = this.add.text(x, y, text, {
      fontSize: '11px',
      fontFamily: FONT,
      color: '#' + textColor.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 交互
    bg.on('pointerover', () => bg.setFillStyle(PX.HIGHLIGHT));
    bg.on('pointerout', () => bg.setFillStyle(fillColor));
    bg.on('pointerdown', () => {
      this.soundGenerator.play('click');
      onClick();
    });

    // 入场
    bg.setAlpha(0); label.setAlpha(0); border.setAlpha(0);
    this.tweens.add({
      targets: [bg, label, border],
      alpha: 1,
      duration: 400,
      ease: 'Linear',
    });

    return bg;
  }

  handleQuickStart() {
    const name = this.nameInput?.value?.trim() || '玩家';
    if (name.length < 1) {
      this.showError('请输入你的名字');
      return;
    }
    this.clearInputs();
    window.network.joinRoom('SOLO', name, false);
    this.scene.start('LobbyScene', { code: 'SOLO', name, isTeacher: false, isLocal: true });
  }

  handleJoinRoom() {
    if (this.roomInput?.domElement) {
      this.roomInput.domElement.style.display = '';
    }
    const name = this.nameInput?.value?.trim();
    const code = this.roomInput?.value?.trim();
    if (!name || name.length < 1) {
      this.showError('请输入你的名字');
      return;
    }
    if (!code || code.length !== 6) {
      this.showError('请输入6位房间号');
      return;
    }
    this.clearInputs();
    window.network.joinRoom(code, name, false);
    this.scene.start('LobbyScene', { code, name, isTeacher: false });
  }

  handleTeacherMode() {
    const name = this.nameInput?.value?.trim() || '老师';
    if (this.roomInput?.domElement) {
      this.roomInput.domElement.style.display = '';
    }
    const code = this.roomInput?.value?.trim();
    if (!code || code.length !== 6) {
      this.showError('请输入房间号');
      return;
    }
    this.clearInputs();
    window.network.joinRoom(code, name, true);
    this.scene.start('TeacherScene', { code, name });
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

  clearInputs() {
    this.nameInput?.destroy();
    this.roomInput?.destroy?.();
  }

  shutdown() {
    this.clearInputs();
    this.panelBg?.destroy();
    this.panelBorder?.destroy();
  }
}
