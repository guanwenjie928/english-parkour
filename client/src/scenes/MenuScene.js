import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { createSoftButton } from '../utils/AnimationHelper.js';

// 像素街机调色板
const PXL = {
  BG: 0x0a0a1e, ACCENT: 0x5abaff, PRIMARY: 0x4aff6a,
  PANEL: 0x12122a, TEXT: 0xe8e8ff, TEXT_DIM: 0x8888aa,
  WARN: 0xff3a5a, GOLD: 0xffd700, PANEL_BORDER: 0x3a3a6a,
};
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

    // 深空背景
    this.cameras.main.setBackgroundColor(PXL.BG);

    // 优先使用 menu-bg（降低亮度以适配暗色调）
    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(width / 2, height / 2, 'menu-bg');
      const tex = this.textures.get('menu-bg').source[0];
      const scaleX = width / tex.width;
      const scaleY = height / tex.height;
      const scale = Math.max(scaleX, scaleY);
      bg.setScale(scale).setDepth(0).setAlpha(0.25).setTint(0x1a1a4e);
    }

    // 像素星空
    this.createStarfield(width, height);

    // 底部扫描线装饰
    const scanGfx = this.add.graphics().setDepth(1).setAlpha(0.04);
    for (let y = 0; y < height; y += 3) {
      scanGfx.fillStyle(0x000000);
      scanGfx.fillRect(0, y, width, 1);
    }
  }

  createStarfield(w, h) {
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() < 0.2 ? 2 : 1;
      const alpha = 0.2 + Math.random() * 0.5;
      this.add.rectangle(x, y, size, size, PXL.TEXT, alpha).setDepth(0);
    }
  }

  createDecorations() {
    const { width, height } = this.scale;

    // 像素标题（无图片时用代码绘制）
    const titleSize = Math.max(36, Math.min(60, width * 0.06));
    const title = this.add.text(width / 2, height * 0.18, 'ENGLISH PARKOUR', {
      fontSize: `${titleSize}px`,
      fontFamily: FONT,
      fontStyle: '900',
      color: '#5abaff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2);

    // 副标题
    const subSize = Math.max(14, titleSize * 0.35);
    this.add.text(width / 2, height * 0.24, '—  TYPING  SHMUP  —', {
      fontSize: `${subSize}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#8888aa',
    }).setOrigin(0.5).setDepth(2);

    // 标题呼吸动画
    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 角色立绘（如果存在素材则显示，半透明低饱和融入暗色调）
    if (this.textures.exists('menu-character')) {
      const char = this.add.image(width / 2, height * 0.42, 'menu-character');
      char.setScale(0.6).setDepth(1).setAlpha(0.4).setTint(0x4a4a8a);

      this.tweens.add({
        targets: char,
        scaleX: 0.63,
        scaleY: 0.63,
        duration: 3500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: char,
        y: char.y - 5,
        duration: 4000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  createPanel() {
    const { width, height } = this.scale;
    const panelW = Math.min(380, width * 0.6);
    const panelH = 100;
    const px = (width - panelW) / 2;
    const py = height * 0.56;

    // 像素风面板（直角边框）
    const panelGfx = this.add.graphics().setDepth(2);
    panelGfx.fillStyle(PXL.PANEL, 0.92);
    panelGfx.fillRect(px, py, panelW, panelH);
    panelGfx.lineStyle(2, PXL.PANEL_BORDER, 0.8);
    panelGfx.strokeRect(px, py, panelW, panelH);
    // 内边框
    panelGfx.lineStyle(1, PXL.ACCENT, 0.25);
    panelGfx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);

    this.panelGfx = panelGfx;

    // 标签
    this.nameLabel = this.add.text(width / 2, py + 18, 'YOUR NAME', {
      fontSize: '11px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#8888aa',
    }).setOrigin(0.5).setDepth(3);

    // 名字显示
    const nameW = panelW - 60;
    const nameH = 38;
    const nameX = (width - nameW) / 2;
    const nameY = py + 52;

    const nameBg = this.add.graphics().setDepth(3);
    nameBg.fillStyle(0x0a0a1e, 1);
    nameBg.fillRect(nameX, nameY - nameH / 2, nameW, nameH);
    nameBg.lineStyle(1, PXL.ACCENT, 0.6);
    nameBg.strokeRect(nameX, nameY - nameH / 2, nameW, nameH);

    this.nameDisplayText = this.add.text(width / 2, nameY, 'Player', {
      fontSize: '16px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#4aff6a',
    }).setOrigin(0.5).setDepth(4);

    // 编辑指示
    const editIcon = this.add.text(width / 2 + nameW / 2 - 16, nameY, '>', {
      fontSize: '14px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#5abaff',
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
      nameBg.fillStyle(0x1a1a3e, 1);
      nameBg.fillRect(nameX - 1, nameY - nameH / 2 - 1, nameW + 2, nameH + 2);
      nameBg.lineStyle(2, PXL.ACCENT, 0.9);
      nameBg.strokeRect(nameX - 1, nameY - nameH / 2 - 1, nameW + 2, nameH + 2);
    });

    hitArea.on('pointerout', () => {
      nameBg.clear();
      nameBg.fillStyle(0x0a0a1e, 1);
      nameBg.fillRect(nameX, nameY - nameH / 2, nameW, nameH);
      nameBg.lineStyle(1, PXL.ACCENT, 0.6);
      nameBg.strokeRect(nameX, nameY - nameH / 2, nameW, nameH);
    });

    this.nameDisplayBg = nameBg;
  }

  createButtons() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const startY = height * 0.72;

    // 像素风按钮绘制函数
    const pixelButton = (x, y, w, h, label, color, onClick, textColor = '#0a0a1e') => {
      const bx = x - w / 2;
      const by = y - h / 2;
      const gfx = this.add.graphics().setDepth(3);

      // 阴影
      gfx.fillStyle(0x000000, 0.5);
      gfx.fillRect(bx + 2, by + 2, w, h);
      // 主体
      gfx.fillStyle(color, 1);
      gfx.fillRect(bx, by, w, h);
      // 高光边框
      gfx.lineStyle(2, 0xffffff, 0.25);
      gfx.strokeRect(bx, by, w, h);
      // 内边框
      gfx.lineStyle(1, 0x000000, 0.3);
      gfx.strokeRect(bx + 2, by + 2, w - 4, h - 4);

      const text = this.add.text(x, y, label, {
        fontSize: '16px',
        fontFamily: FONT,
        fontStyle: '800',
        color: textColor,
      }).setOrigin(0.5).setDepth(4);

      const hit = this.add.rectangle(x, y, w, h, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(5);

      hit.on('pointerover', () => {
        gfx.clear();
        gfx.fillStyle(0x000000, 0.5);
        gfx.fillRect(bx + 3, by + 3, w, h);
        gfx.fillStyle(color, 1);
        gfx.fillRect(bx - 1, by - 1, w + 2, h + 2);
        gfx.lineStyle(2, 0xffffff, 0.4);
        gfx.strokeRect(bx - 1, by - 1, w + 2, h + 2);
        text.setScale(1.05);
      });

      hit.on('pointerout', () => {
        gfx.clear();
        gfx.fillStyle(0x000000, 0.5);
        gfx.fillRect(bx + 2, by + 2, w, h);
        gfx.fillStyle(color, 1);
        gfx.fillRect(bx, by, w, h);
        gfx.lineStyle(2, 0xffffff, 0.25);
        gfx.strokeRect(bx, by, w, h);
        gfx.lineStyle(1, 0x000000, 0.3);
        gfx.strokeRect(bx + 2, by + 2, w - 4, h - 4);
        text.setScale(1);
      });

      hit.on('pointerdown', () => {
        text.setScale(0.95);
        if (onClick) onClick();
      });

      return { gfx, text, hit };
    };

    // 快速开始 — 绿色主按钮
    pixelButton(cx, startY, 280, 48, 'START GAME', PXL.PRIMARY, () => this.handleQuickStart());

    // 加入房间
    pixelButton(cx, startY + 62, 240, 40, 'JOIN ROOM', PXL.ACCENT, () => this.openRoomInput(), '#0a0a1e');

    // 老师模式
    pixelButton(cx, startY + 112, 200, 36, 'TEACHER', 0x6666aa, () => this.openRoomInput(true), '#e8e8ff');
  }

  createInputModal() {
    const { width, height } = this.scale;

    // 暗色遮罩
    this.inputOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.75)
      .setVisible(false).setInteractive().setDepth(100);

    const panelW = 360;
    const panelH = 140;
    const px = (width - panelW) / 2;
    const py = height * 0.33;

    this.inputPanelGfx = this.add.graphics().setVisible(false).setDepth(100);

    const showPanel = () => {
      this.inputPanelGfx.clear();
      this.inputPanelGfx.fillStyle(PXL.PANEL, 0.95);
      this.inputPanelGfx.fillRect(px, py, panelW, panelH);
      this.inputPanelGfx.lineStyle(2, PXL.ACCENT, 0.8);
      this.inputPanelGfx.strokeRect(px, py, panelW, panelH);
      this.inputPanelGfx.lineStyle(1, PXL.ACCENT, 0.2);
      this.inputPanelGfx.strokeRect(px + 4, py + 4, panelW - 8, panelH - 8);
    };

    this.inputTitle = this.add.text(width / 2, py + 24, '', {
      fontSize: '12px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#8888aa',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this.inputValue = this.add.text(width / 2, py + 62, '', {
      fontSize: '28px',
      fontFamily: FONT,
      fontStyle: '800',
      color: '#4aff6a',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this.inputCursor = this.add.text(width / 2 + 80, py + 62, '|', {
      fontSize: '24px',
      fontFamily: FONT,
      color: '#4aff6a',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this.tweens.add({
      targets: this.inputCursor,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.inputHint = this.add.text(width / 2, py + 115, 'ENTER: Confirm  |  ESC: Cancel', {
      fontSize: '10px',
      fontFamily: FONT,
      color: '#666688',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

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
    this.playerName = this.playerName || 'Player';
    this.showInputModal('ENTER YOUR NAME', this.playerName);
  }

  openRoomInput(isTeacher = false) {
    this.inputMode = 'room';
    this.isTeacherMode = isTeacher;
    const title = isTeacher ? 'ENTER ROOM CODE (TEACHER)' : 'ENTER ROOM CODE (6 DIGITS)';
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
    this.scene.start('ShmupScene', { code: 'SOLO', name, isTeacher: false, isLocal: true });
    window.network.joinRoom?.('SOLO', name, false);
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

    const toastW = 400;
    const toastH = 36;
    const toastX = (width - toastW) / 2;
    const toastY = 50;

    const toastGfx = this.add.graphics().setDepth(200);
    toastGfx.fillStyle(PXL.WARN, 0.9);
    toastGfx.fillRect(toastX, toastY, toastW, toastH);
    toastGfx.lineStyle(1, 0xffffff, 0.3);
    toastGfx.strokeRect(toastX, toastY, toastW, toastH);

    const toastText = this.add.text(width / 2, toastY + toastH / 2, msg, {
      fontSize: '12px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);

    toastGfx.y = -60;
    toastText.y = -60;
    this.tweens.add({
      targets: [toastGfx, toastText],
      y: '+=60',
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: [toastGfx, toastText],
      alpha: 0,
      y: '-=20',
      duration: 400,
      delay: 2000,
      onComplete: () => { toastGfx.destroy(); toastText.destroy(); },
    });
  }

  shutdown() {
    this.inputOverlay?.destroy();
  }
}
