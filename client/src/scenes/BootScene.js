import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';

const SDV = {
  SKY_TOP: 0x6496d6, SKY_BOT: 0xd4c8a0,
  GRASS: 0x6ab840, GRASS_D: 0x559a30,
  PANEL: 0x6b4018, PANEL_BORDER: 0x9a6a38,
  TEXT: 0xf5e6c8, TEXT_DIM: 0xb0a080,
  GREEN: 0x6ac840, GOLD: 0xffc840, ACCENT: 0x6496d6,
};
const FONT = 'Nunito';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    this.gameAssetsLoaded = false;
  }

  preload() {
    const { width: w, height: h } = this.scale;
    this._createLoadingUI(w, h);
    this.load.image('menu-character', 'assets/ui/menu-character.png');
    this.load.image('menu-bg', 'assets/ui/menu-bg.jpg');
  }

  _createLoadingUI(w, h) {
    // 天空渐变
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Phaser.Math.Linear(SDV.SKY_TOP >> 16 & 0xff, SDV.SKY_BOT >> 16 & 0xff, t);
      const g = Phaser.Math.Linear(SDV.SKY_TOP >> 8 & 0xff, SDV.SKY_BOT >> 8 & 0xff, t);
      const b = Phaser.Math.Linear(SDV.SKY_TOP & 0xff, SDV.SKY_BOT & 0xff, t);
      this.add.rectangle(w / 2, h * 0.4 * t, w, Math.ceil(h * 0.4 / steps) + 1, (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b)).setDepth(1000);
    }
    this.add.rectangle(w / 2, h * 0.42 + (h - h * 0.42) / 2, w, h - h * 0.42, SDV.GRASS).setDepth(1000);

    // 像素云
    for (let i = 0; i < 5; i++) {
      const cx = Math.random() * w, cy = h * 0.04 + Math.random() * h * 0.16;
      const cs = 2 + Math.floor(Math.random() * 3);
      const parts = [[0,0],[1,-1],[2,0],[0,1],[1,1],[2,1]];
      for (const [dx, dy] of parts) {
        this.add.rectangle(cx + dx * cs, cy + dy * cs, cs, cs, 0xf0f0f0, 0.6).setDepth(1000);
      }
    }

    // 标题
    this.add.text(w / 2, h * 0.30, 'ENGLISH PARKOUR', {
      fontSize: '36px', fontFamily: FONT, fontStyle: '900',
      color: '#f5e6c8', stroke: '#3a2818', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(w / 2, h * 0.37, 'Typing Shmup', {
      fontSize: '14px', fontFamily: FONT, fontStyle: '700', color: '#c4a070',
    }).setOrigin(0.5).setDepth(1002);

    // 木质进度条
    const barW = 280, barH = 6, barX = (w - barW) / 2, barY = h * 0.46;
    this.add.graphics().setDepth(1002)
      .fillStyle(SDV.PANEL, 1).fillRoundedRect(barX, barY, barW, barH, 3)
      .lineStyle(1, SDV.PANEL_BORDER, 0.6).strokeRoundedRect(barX, barY, barW, barH, 3);
    this._progressBar = this.add.rectangle(barX, barY, 0, barH, SDV.GOLD)
      .setOrigin(0, 0).setDepth(1003);
    this._percentText = this.add.text(w / 2, h * 0.50, '0%', {
      fontSize: '12px', fontFamily: FONT, fontStyle: '700', color: '#c4a070',
    }).setOrigin(0.5).setDepth(1002);
    this.add.text(w / 2, h * 0.54, 'LOADING...', {
      fontSize: '10px', fontFamily: FONT, color: '#8a6a50',
    }).setOrigin(0.5).setDepth(1002);

    this.load.on('progress', (v) => {
      this._progressBar.width = barW * v;
      this._percentText.setText(`${Math.floor(v * 100)}%`);
    });
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.children.removeAll(true);
    this.gameAssetsLoaded = true;
    console.log('[BootScene] create');

    // 天空
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Phaser.Math.Linear(SDV.SKY_TOP >> 16 & 0xff, SDV.SKY_BOT >> 16 & 0xff, t);
      const g = Phaser.Math.Linear(SDV.SKY_TOP >> 8 & 0xff, SDV.SKY_BOT >> 8 & 0xff, t);
      const b = Phaser.Math.Linear(SDV.SKY_TOP & 0xff, SDV.SKY_BOT & 0xff, t);
      this.add.rectangle(w / 2, h * 0.4 * t, w, Math.ceil(h * 0.4 / steps) + 1, (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b));
    }
    this.add.rectangle(w / 2, h * 0.42 + (h - h * 0.42) / 2, w, h - h * 0.42, SDV.GRASS);

    // 草纹
    for (let x = 0; x < w; x += 15 + Math.floor(Math.random() * 20)) {
      this.add.rectangle(x, h * 0.44 + Math.random() * 20, 6 + Math.random() * 8, 1.5, SDV.GRASS_D, 0.3);
    }

    // 云
    for (let i = 0; i < 6; i++) {
      const cx = Math.random() * w, cy = h * 0.04 + Math.random() * h * 0.18;
      const cs = 2 + Math.floor(Math.random() * 3);
      const parts = [[0,0],[1,-1],[2,0],[0,1],[1,1],[2,1]];
      for (const [dx, dy] of parts) {
        this.add.rectangle(cx + dx * cs, cy + dy * cs, cs, cs, 0xf0f0f0, 0.7);
      }
    }

    this._showStartScreen(w, h);
    console.log('[BootScene] ready');
  }

  _showStartScreen(w, h) {
    const titleSize = Math.max(40, Math.min(60, w * 0.065));
    const title = this.add.text(w / 2, h * 0.20, 'ENGLISH PARKOUR', {
      fontSize: `${titleSize}px`, fontFamily: FONT, fontStyle: '900',
      color: '#f5e6c8', stroke: '#3a2818', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(w / 2, h * 0.27, '- TYPING SHMUP -', {
      fontSize: `${Math.max(12, titleSize * 0.26)}px`, fontFamily: FONT, fontStyle: '700', color: '#c4a070',
    }).setOrigin(0.5).setDepth(2);

    title.setAlpha(0).y += 20;
    this.tweens.add({ targets: title, alpha: 1, y: h * 0.20, duration: 550, ease: 'Back.easeOut' });

    if (this.textures.exists('menu-character')) {
      const char = this.add.image(w / 2, h * 0.42, 'menu-character')
        .setScale(0.48).setDepth(1).setAlpha(0.35).setTint(0x5a8a3a);
      this.tweens.add({ targets: char, scaleX: 0.51, scaleY: 0.51, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // 木质按钮
    const btnW = 250, btnH = 50, btnX = w / 2 - btnW / 2, btnY = h * 0.65;
    const btnGfx = this.add.graphics().setDepth(3);
    btnGfx.fillStyle(0x000000, 0.3);
    btnGfx.fillRoundedRect(btnX + 2, btnY + 2, btnW, btnH, 4);
    btnGfx.fillStyle(SDV.GREEN);
    btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
    btnGfx.fillStyle(0xffffff, 0.12);
    btnGfx.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 3, 2);

    const btnText = this.add.text(w / 2, btnY + btnH / 2, 'PRESS START', {
      fontSize: '18px', fontFamily: FONT, fontStyle: '900', color: '#ffffff',
    }).setOrigin(0.5).setDepth(4);

    this.tweens.add({ targets: btnText, alpha: 0.5, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const hit = this.add.rectangle(w / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);
    hit.on('pointerover', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x000000, 0.3);
      btnGfx.fillRoundedRect(btnX + 3, btnY + 3, btnW, btnH, 4);
      btnGfx.fillStyle(SDV.GREEN);
      btnGfx.fillRoundedRect(btnX - 1, btnY - 1, btnW + 2, btnH + 2, 4);
      btnGfx.fillStyle(0xffffff, 0.2);
      btnGfx.fillRoundedRect(btnX + 1, btnY + 1, btnW - 2, btnH / 3, 2);
      btnText.setScale(1.05);
    });
    hit.on('pointerout', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x000000, 0.3);
      btnGfx.fillRoundedRect(btnX + 2, btnY + 2, btnW, btnH, 4);
      btnGfx.fillStyle(SDV.GREEN);
      btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 4);
      btnGfx.fillStyle(0xffffff, 0.12);
      btnGfx.fillRoundedRect(btnX + 2, btnY + 2, btnW - 4, btnH / 3, 2);
      btnText.setScale(1);
    });

    const startGame = () => { SoundGenerator.unlock(); this.scene.start('MenuScene'); };
    hit.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    this.add.text(w / 2, h * 0.76, 'PRESS SPACE / ENTER', {
      fontSize: '11px', fontFamily: FONT, fontStyle: '600', color: '#8a6a50',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(w / 2, h - 18, 'v2.0  STARDEW  VALLEY', {
      fontSize: '10px', fontFamily: FONT, fontStyle: '700', color: '#6a5a40',
    }).setOrigin(0.5).setDepth(3);
  }
}
