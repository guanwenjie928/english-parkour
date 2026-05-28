import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';

// 星露谷暖色调
const SDV = {
  SKY_TOP: 0x6496d6, SKY_BOT: 0xd4c8a0,
  GRASS: 0x6ab840, GRASS_D: 0x559a30,
  PANEL: 0x6b4018, PANEL_BORDER: 0x9a6a38, PANEL_INNER: 0x8a5528,
  TEXT: 0xf5e6c8, TEXT_DIM: 0xb0a080, TEXT_DARK: 0x3a2010,
  ACCENT: 0xffc840, PRIMARY: 0x6ac840,
  WARN: 0xff4a3a, GOLD: 0xffc840,
  INPUT_PAPER: 0xf5eed8,
};
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.playerName = '';
    this.roomCode = '';
    this.inputMode = null;
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    this._createBackground(w, h);
    this._createPanel(w, h);
    this._createButtons(w, h);
    this._createInputModal(w, h);
    this._setupKeyboard();
    this._checkDupTab();

    try { this.soundGenerator.playBGM('menu'); } catch (e) { /* ok */ }
  }

  // === 背景（田园） ===
  _createBackground(w, h) {
    this.cameras.main.setBackgroundColor(SDV.SKY_TOP);

    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Phaser.Math.Linear(SDV.SKY_TOP >> 16 & 0xff, SDV.SKY_BOT >> 16 & 0xff, t);
      const g = Phaser.Math.Linear(SDV.SKY_TOP >> 8 & 0xff, SDV.SKY_BOT >> 8 & 0xff, t);
      const b = Phaser.Math.Linear(SDV.SKY_TOP & 0xff, SDV.SKY_BOT & 0xff, t);
      const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
      this.add.rectangle(w / 2, h * 0.4 * t, w, Math.ceil(h * 0.4 / steps) + 1, color).setDepth(0);
    }

    // 草地
    const gy = h * 0.42;
    this.add.rectangle(w / 2, gy + (h - gy) / 2, w, h - gy, SDV.GRASS).setDepth(0);
    // 草纹
    for (let x = 0; x < w; x += 15 + Math.floor(Math.random() * 20)) {
      this.add.rectangle(x, gy + Math.random() * 20, 6 + Math.random() * 8, 1.5, SDV.GRASS_D, 0.3).setDepth(0);
    }

    // 像素小云
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * w;
      const cy = h * 0.04 + Math.random() * h * 0.18;
      const cs = 2 + Math.floor(Math.random() * 3);
      const parts = [[0,0],[1,-1],[2,0],[0,1],[1,1],[2,1]];
      for (const [dx, dy] of parts) {
        this.add.rectangle(cx + dx * cs, cy + dy * cs, cs, cs, 0xf0f0f0, 0.7).setDepth(0);
      }
    }

    // 背景素材（如果有）
    if (this.textures.exists('menu-bg')) {
      const bg = this.add.image(w / 2, h / 2, 'menu-bg');
      const tex = this.textures.get('menu-bg').source[0];
      bg.setScale(Math.max(w / tex.width, h / tex.height)).setDepth(0).setAlpha(0.15).setTint(0x5a8a3a);
    }

    // 标题
    const titleSize = Math.max(36, Math.min(58, w * 0.058));
    const title = this.add.text(w / 2, h * 0.13, 'ENGLISH PARKOUR', {
      fontSize: `${titleSize}px`,
      fontFamily: FONT,
      fontStyle: '900',
      color: '#f5e6c8',
      stroke: '#3a2818',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);

    const subSize = Math.max(13, titleSize * 0.32);
    this.add.text(w / 2, h * 0.19, '- Typing Shmup -', {
      fontSize: `${subSize}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#c4a070',
    }).setOrigin(0.5).setDepth(2);

    this.tweens.add({ targets: title, alpha: 0.75, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 角色立绘
    if (this.textures.exists('menu-character')) {
      const char = this.add.image(w / 2, h * 0.38, 'menu-character')
        .setScale(0.5).setDepth(1).setAlpha(0.4).setTint(0x6a9a4a);
      this.tweens.add({ targets: char, scaleX: 0.53, scaleY: 0.53, duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: char, y: char.y - 4, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  // === 木质面板 ===
  _createPanel(w, h) {
    const pw = Math.min(380, w * 0.6);
    const ph = 90;
    const px = (w - pw) / 2;
    const py = h * 0.50;

    const gfx = this.add.graphics().setDepth(2);
    gfx.fillStyle(SDV.PANEL, 0.93);
    gfx.fillRoundedRect(px, py, pw, ph, 5);
    gfx.fillStyle(SDV.PANEL_BORDER, 0.8);
    gfx.fillRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 4);
    gfx.fillStyle(SDV.PANEL, 0.95);
    gfx.fillRoundedRect(px + 4, py + 4, pw - 8, ph - 8, 3);
    gfx.fillStyle(0xffffff, 0.1);
    gfx.fillRoundedRect(px + 6, py + 6, pw - 12, 2, 1);

    this.panelGfx = gfx;

    this.nameLabel = this.add.text(w / 2, py + 14, 'YOUR NAME', {
      fontSize: '10px', fontFamily: FONT, fontStyle: '700', color: '#b0a080',
    }).setOrigin(0.5).setDepth(3);

    const nameW = pw - 60;
    const nameH = 36;
    const nameX = (w - nameW) / 2;
    const nameY = py + 50;

    const nameBg = this.add.graphics().setDepth(3);
    nameBg.fillStyle(SDV.INPUT_PAPER, 1);
    nameBg.fillRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 3);
    nameBg.lineStyle(1.5, SDV.PANEL_BORDER, 0.7);
    nameBg.strokeRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 3);

    this.nameDisplayText = this.add.text(w / 2, nameY, 'Player', {
      fontSize: '15px', fontFamily: FONT, fontStyle: '700', color: '#3a2010',
    }).setOrigin(0.5).setDepth(4);

    const editIcon = this.add.text(w / 2 + nameW / 2 - 14, nameY, '>', {
      fontSize: '12px', fontFamily: FONT, fontStyle: '800', color: '#8a5a30',
    }).setOrigin(0.5).setDepth(4);

    const hitArea = this.add.rectangle(w / 2, nameY, nameW, nameH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);
    hitArea.on('pointerdown', () => { this.soundGenerator.play('click'); this._openNameInput(); });
    hitArea.on('pointerover', () => {
      nameBg.clear();
      nameBg.fillStyle(SDV.INPUT_PAPER, 1);
      nameBg.fillRoundedRect(nameX - 1, nameY - nameH / 2 - 1, nameW + 2, nameH + 2, 3);
      nameBg.lineStyle(2, SDV.GOLD, 0.9);
      nameBg.strokeRoundedRect(nameX - 1, nameY - nameH / 2 - 1, nameW + 2, nameH + 2, 3);
    });
    hitArea.on('pointerout', () => {
      nameBg.clear();
      nameBg.fillStyle(SDV.INPUT_PAPER, 1);
      nameBg.fillRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 3);
      nameBg.lineStyle(1.5, SDV.PANEL_BORDER, 0.7);
      nameBg.strokeRoundedRect(nameX, nameY - nameH / 2, nameW, nameH, 3);
    });
    this.nameDisplayBg = nameBg;
  }

  // === 按钮 ===
  _createButtons(w, h) {
    const cx = w / 2;
    const startY = h * 0.68;
    const makeBtn = (x, y, bw, bh, label, color, onClick, textColor = '#ffffff') => {
      const bx = x - bw / 2;
      const by = y - bh / 2;
      const gfx = this.add.graphics().setDepth(3);
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillRoundedRect(bx + 2, by + 2, bw, bh, 4);
      gfx.fillStyle(color);
      gfx.fillRoundedRect(bx, by, bw, bh, 4);
      gfx.lineStyle(1.5, 0xffffff, 0.2);
      gfx.strokeRoundedRect(bx, by, bw, bh, 4);
      gfx.fillStyle(0xffffff, 0.12);
      gfx.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 3, 2);

      const text = this.add.text(x, y, label, {
        fontSize: '15px', fontFamily: FONT, fontStyle: '800', color: textColor,
      }).setOrigin(0.5).setDepth(4);

      const hit = this.add.rectangle(x, y, bw, bh, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(5);
      hit.on('pointerover', () => {
        gfx.clear();
        gfx.fillStyle(0x000000, 0.3);
        gfx.fillRoundedRect(bx + 3, by + 3, bw, bh, 4);
        gfx.fillStyle(color);
        gfx.fillRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 4);
        gfx.lineStyle(2, 0xffffff, 0.35);
        gfx.strokeRoundedRect(bx - 1, by - 1, bw + 2, bh + 2, 4);
        text.setScale(1.04);
      });
      hit.on('pointerout', () => {
        gfx.clear();
        gfx.fillStyle(0x000000, 0.3);
        gfx.fillRoundedRect(bx + 2, by + 2, bw, bh, 4);
        gfx.fillStyle(color);
        gfx.fillRoundedRect(bx, by, bw, bh, 4);
        gfx.lineStyle(1.5, 0xffffff, 0.2);
        gfx.strokeRoundedRect(bx, by, bw, bh, 4);
        gfx.fillStyle(0xffffff, 0.12);
        gfx.fillRoundedRect(bx + 2, by + 2, bw - 4, bh / 3, 2);
        text.setScale(1);
      });
      hit.on('pointerdown', () => { text.setScale(0.95); onClick(); });
      return { gfx, text, hit };
    };

    makeBtn(cx, startY, 260, 46, 'START GAME', SDV.PRIMARY, () => this._handleQuickStart());
    makeBtn(cx, startY + 60, 220, 38, 'JOIN ROOM', SDV.GOLD, () => this._openRoomInput(), '#3a2010');
    makeBtn(cx, startY + 106, 180, 32, 'TEACHER', SDV.PANEL_BORDER, () => this._openRoomInput(true), '#f5e6c8');
  }

  // === 输入模态框 ===
  _createInputModal(w, h) {
    this.inputOverlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setVisible(false).setInteractive().setDepth(100);

    const pw = 340, ph = 130;
    const px = (w - pw) / 2, py = h * 0.32;

    this.inputPanelGfx = this.add.graphics().setVisible(false).setDepth(100);
    const showPanel = () => {
      this.inputPanelGfx.clear();
      this.inputPanelGfx.fillStyle(SDV.PANEL, 0.96);
      this.inputPanelGfx.fillRoundedRect(px, py, pw, ph, 5);
      this.inputPanelGfx.fillStyle(SDV.PANEL_BORDER, 0.8);
      this.inputPanelGfx.fillRoundedRect(px + 2, py + 2, pw - 4, ph - 4, 4);
      this.inputPanelGfx.fillStyle(SDV.PANEL, 0.95);
      this.inputPanelGfx.fillRoundedRect(px + 4, py + 4, pw - 8, ph - 8, 3);
    };

    this.inputTitle = this.add.text(w / 2, py + 22, '', {
      fontSize: '11px', fontFamily: FONT, fontStyle: '700', color: '#b0a080',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this.inputValue = this.add.text(w / 2, py + 60, '', {
      fontSize: '26px', fontFamily: FONT, fontStyle: '800', color: '#3a2010',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this.inputCursor = this.add.text(w / 2 + 80, py + 60, '|', {
      fontSize: '22px', fontFamily: FONT, color: '#6a4a30',
    }).setOrigin(0.5).setVisible(false).setDepth(101);
    this.tweens.add({ targets: this.inputCursor, alpha: 0, duration: 500, yoyo: true, repeat: -1 });

    this.inputHint = this.add.text(w / 2, py + 112, 'ENTER 确认 | ESC 取消', {
      fontSize: '10px', fontFamily: FONT_CN, color: '#8a6a50',
    }).setOrigin(0.5).setVisible(false).setDepth(101);

    this._showModalPanel = showPanel;
    this.inputOverlay.on('pointerdown', () => this._closeInput());
  }

  _setupKeyboard() {
    this.input.keyboard.on('keydown', (e) => {
      if (!this.inputMode) return;
      if (e.key === 'Enter') { this._confirmInput(); return; }
      if (e.key === 'Escape') { this._closeInput(); return; }
      if (e.key === 'Backspace') {
        if (this.inputMode === 'name') this.playerName = this.playerName.slice(0, -1);
        else this.roomCode = this.roomCode.slice(0, -1);
        this._updateInputDisplay();
        return;
      }
      const char = e.key;
      if (this.inputMode === 'name') {
        if (/^[a-zA-Z0-9\u4e00-\u9fa5]$/.test(char) && this.playerName.length < 8) this.playerName += char;
      } else if (this.inputMode === 'room') {
        if (/^[0-9]$/.test(char) && this.roomCode.length < 6) this.roomCode += char;
      }
      this._updateInputDisplay();
    });
  }

  _openNameInput() {
    this.inputMode = 'name';
    this.playerName = this.playerName || 'Player';
    this._showModal('YOUR NAME', this.playerName);
  }

  _openRoomInput(isTeacher = false) {
    this.inputMode = 'room';
    this.isTeacherMode = isTeacher;
    this._showModal(isTeacher ? 'ROOM CODE (TEACHER)' : 'ROOM CODE (6 DIGITS)', this.roomCode);
  }

  _showModal(title, value) {
    this.inputTitle.setText(title);
    this.inputValue.setText(value);
    this.inputCursor.x = this.inputValue.x + this.inputValue.width / 2 + 10;
    this._showModalPanel();
    this.inputOverlay.setVisible(true);
    this.inputPanelGfx.setVisible(true);
    this.inputTitle.setVisible(true);
    this.inputValue.setVisible(true);
    this.inputCursor.setVisible(true);
    this.inputHint.setVisible(true);
  }

  _updateInputDisplay() {
    const value = this.inputMode === 'name' ? this.playerName : this.roomCode;
    this.inputValue.setText(value);
    this.inputCursor.x = this.inputValue.x + this.inputValue.width / 2 + 10;
  }

  _confirmInput() {
    if (this.inputMode === 'name') this.playerName = this.playerName.trim() || '玩家';
    this.nameDisplayText.setText(this.playerName);
    this._closeInput();
  }

  _closeInput() {
    this.inputMode = null;
    this.inputOverlay.setVisible(false);
    this.inputPanelGfx.setVisible(false);
    this.inputTitle.setVisible(false);
    this.inputValue.setVisible(false);
    this.inputCursor.setVisible(false);
    this.inputHint.setVisible(false);
  }

  _handleQuickStart() {
    const name = this.playerName.trim() || '玩家';
    this.scene.start('ShmupScene', { code: 'SOLO', name, isTeacher: false, isLocal: true });
    window.network.joinRoom?.('SOLO', name, false);
  }

  async _checkDupTab() {
    const result = await window.checkDuplicateSession();
    if (result.duplicate) this._showError('Another tab is already open');
  }

  _showError(msg) {
    this.soundGenerator.play('wrong');
    const { width: w } = this.scale;
    const tw = 360, th = 34, tx = (w - tw) / 2, ty = 50;
    const gfx = this.add.graphics().setDepth(200);
    gfx.fillStyle(SDV.WARN, 0.9);
    gfx.fillRoundedRect(tx, ty, tw, th, 3);
    const text = this.add.text(w / 2, ty + th / 2, msg, {
      fontSize: '11px', fontFamily: FONT, fontStyle: '700', color: '#ffffff',
    }).setOrigin(0.5).setDepth(201);
    gfx.y = -60; text.y = -60;
    this.tweens.add({ targets: [gfx, text], y: '+=60', duration: 280, ease: 'Back.easeOut' });
    this.tweens.add({ targets: [gfx, text], alpha: 0, y: '-=20', duration: 350, delay: 2000,
      onComplete: () => { gfx.destroy(); text.destroy(); } });
  }

  shutdown() { this.inputOverlay?.destroy(); }
}
