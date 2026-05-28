import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';

const PXL = {
  BG: 0x0a0a1e, ACCENT: 0x5abaff, TEXT: 0xe8e8ff, TEXT_DIM: 0x8888aa,
  GREEN: 0x4aff6a,
};
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    this.gameAssetsLoaded = false;
  }

  // === 阶段 1：快速加载菜单素材（目标 2-3s 出菜单）===
  preload() {
    const { width, height } = this.scale;
    this._createLoadingUI(width, height);

    // 仅加载菜单必需的素材
    this.load.image('menu-character', 'assets/ui/menu-character.png');
    this.load.image('menu-bg', 'assets/ui/menu-bg.jpg');
  }

  _createLoadingUI(width, height) {
    // 深空背景
    this.add.rectangle(width / 2, height / 2, width, height, PXL.BG).setDepth(1000);

    // 像素星空
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const ss = Math.random() < 0.3 ? 2 : 1;
      this.add.rectangle(sx, sy, ss, ss, PXL.TEXT, 0.15 + Math.random() * 0.3).setDepth(1000);
    }

    // 标题
    this.add.text(width / 2, height * 0.32, 'ENGLISH PARKOUR', {
      fontSize: '36px',
      fontFamily: FONT,
      fontStyle: '900',
      color: '#5abaff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(width / 2, height * 0.40, 'Typing Shmup', {
      fontSize: '14px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#8888aa',
    }).setOrigin(0.5).setDepth(1002);

    // 像素风进度条
    const barW = 300;
    const barH = 8;
    const barX = (width - barW) / 2;
    const barY = height * 0.48;

    // 进度条背景
    const barBgGfx = this.add.graphics().setDepth(1002);
    barBgGfx.fillStyle(0x1a1a3e, 1);
    barBgGfx.fillRect(barX, barY, barW, barH);
    barBgGfx.lineStyle(1, PXL.ACCENT, 0.4);
    barBgGfx.strokeRect(barX, barY, barW, barH);

    // 进度条填充
    const barFillBg = this.add.graphics().setDepth(1004);
    barFillBg.fillStyle(0x0a0a1e, 1);
    barFillBg.fillRect(barX, barY, barW, barH);

    this._progressBar = this.add.rectangle(barX, barY, 0, barH, PXL.GREEN)
      .setOrigin(0, 0).setDepth(1003);

    this._percentText = this.add.text(width / 2, height * 0.52, '0%', {
      fontSize: '12px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#4aff6a',
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(width / 2, height * 0.57, 'LOADING...', {
      fontSize: '10px',
      fontFamily: FONT,
      color: '#666688',
    }).setOrigin(0.5).setDepth(1002);

    this.load.on('progress', (value) => {
      this._progressBar.width = barW * value;
      this._percentText.setText(`${Math.floor(value * 100)}%`);
    });
  }

  create() {
    const { width, height } = this.scale;
    this.children.removeAll(true);

    // 深空背景
    this.add.rectangle(width / 2, height / 2, width, height, PXL.BG);

    // 星空
    for (let i = 0; i < 60; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const ss = Math.random() < 0.2 ? 2 : 1;
      this.add.rectangle(sx, sy, ss, ss, PXL.TEXT, 0.15 + Math.random() * 0.4).setDepth(0);
    }

    // 启动点击开始画面
    this.showStartScreen();

    // 阶段 2：后台加载
    this._loadGameAssets();
  }

  // === 阶段 2：后台加载游戏素材（弹幕模式无需额外素材，跳过）===
  _loadGameAssets() {
    // 弹幕射击模式所有视觉都是程序化像素绘制，无需加载额外素材
    this.gameAssetsLoaded = true;

    this.load.once('complete', () => {
      console.log('[BootScene] 全部就绪（程序化像素渲染模式）');
    });

    // 如果有素材可用则加载，否则直接标记完成
    this.load.start();
  }

  // === 纹理帧切片（兼容旧/新尺寸） ===
  _processTextures() {
    const runSheet = this.textures.get('run-sheet');
    if (runSheet && !runSheet.has('run_1')) {
      const rw = runSheet.source[0]?.width || 512;
      const rh = runSheet.source[0]?.height || 256;
      const cellW = Math.floor(rw / 4);
      const cellH = Math.floor(rh / 2);
      for (let i = 0; i < 8; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        runSheet.add(`run_${i + 1}`, 0, col * cellW, row * cellH, cellW, cellH);
      }
    }

    const poseSheet = this.textures.get('pose-sheet');
    const poseNames = ['idle', 'slide', 'stun', 'victory', 'shield'];
    if (poseSheet && !poseSheet.has('pose_idle')) {
      const pw = poseSheet.source[0]?.width || 640;
      const ph = poseSheet.source[0]?.height || 128;
      const cellW = Math.floor(pw / 5);
      poseNames.forEach((name, i) => {
        poseSheet.add(`pose_${name}`, 0, i * cellW, 0, cellW, ph);
      });
    }

    const itemsStrip = this.textures.get('items-strip');
    const itemNames = ['rocket', 'electric', 'banana', 'shield', 'magnet'];
    if (itemsStrip && !itemsStrip.has('item-rocket')) {
      const iw = itemsStrip.source[0]?.width || 320;
      const ih = itemsStrip.source[0]?.height || 64;
      const cellW = Math.floor(iw / 5);
      itemNames.forEach((name, i) => {
        itemsStrip.add(`item-${name}`, 0, i * cellW, 0, cellW, ih);
      });
    }
  }

  // === 动画创建 ===
  _createAnimations() {
    const runSheet = this.textures.get('run-sheet');
    if (!this.anims.exists('run') && runSheet && runSheet.has('run_1')) {
      this.anims.create({
        key: 'run',
        frames: Array.from({ length: 8 }, (_, i) => ({ key: 'run-sheet', frame: `run_${i + 1}` })),
        frameRate: 12,
        repeat: -1,
      });
    }

    const vfxStrip = this.textures.get('vfx-strip');
    if (vfxStrip && !vfxStrip.has('electric_0')) {
      const source = vfxStrip.source[0];
      const imgW = source.width;
      const imgH = source.height;
      const frameCount = 10;
      const frameH = Math.floor(imgH / frameCount);

      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`electric_${i}`, 0, 0, i * frameH, imgW, frameH);
      }
      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`shield_${i}`, 0, 0, (5 + i) * frameH, imgW, frameH);
      }
    }

    if (!this.anims.exists('electric-hit')) {
      this.anims.create({
        key: 'electric-hit',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `electric_${i}` })),
        frameRate: 10,
        repeat: 0,
      });
    }

    if (!this.anims.exists('shield-bubble')) {
      this.anims.create({
        key: 'shield-bubble',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `shield_${i}` })),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  // === 点击开始画面（像素街机风格） ===
  showStartScreen() {
    const { width, height } = this.scale;

    // 扫描线
    const scanGfx = this.add.graphics().setDepth(1).setAlpha(0.04);
    for (let y = 0; y < height; y += 3) {
      scanGfx.fillStyle(0x000000);
      scanGfx.fillRect(0, y, width, 1);
    }

    // 标题
    const titleSize = Math.max(40, Math.min(64, width * 0.07));
    const title = this.add.text(width / 2, height * 0.22, 'ENGLISH PARKOUR', {
      fontSize: `${titleSize}px`,
      fontFamily: FONT,
      fontStyle: '900',
      color: '#5abaff',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);

    this.add.text(width / 2, height * 0.30, '—  TYPING  SHMUP  —', {
      fontSize: `${Math.max(12, titleSize * 0.28)}px`,
      fontFamily: FONT,
      fontStyle: '700',
      color: '#8888aa',
    }).setOrigin(0.5).setDepth(2);

    // 标题入场
    title.setAlpha(0);
    title.y += 20;
    this.tweens.add({
      targets: title,
      alpha: 1,
      y: height * 0.22,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // 角色立绘（如果存在）
    if (this.textures.exists('menu-character')) {
      const char = this.add.image(width / 2, height * 0.46, 'menu-character')
        .setScale(0.55).setDepth(1).setAlpha(0.35).setTint(0x4a4a8a);

      this.tweens.add({
        targets: char,
        scaleX: 0.58,
        scaleY: 0.58,
        duration: 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 像素 START 按钮
    const btnW = 260;
    const btnH = 52;
    const btnX = width / 2 - btnW / 2;
    const btnY = height * 0.68;

    const btnGfx = this.add.graphics().setDepth(3);
    btnGfx.fillStyle(0x000000, 0.5);
    btnGfx.fillRect(btnX + 2, btnY + 2, btnW, btnH);
    btnGfx.fillStyle(PXL.GREEN, 1);
    btnGfx.fillRect(btnX, btnY, btnW, btnH);
    btnGfx.lineStyle(2, 0xffffff, 0.3);
    btnGfx.strokeRect(btnX, btnY, btnW, btnH);

    const btnText = this.add.text(width / 2, btnY + btnH / 2, 'PRESS START', {
      fontSize: '18px',
      fontFamily: FONT,
      fontStyle: '900',
      color: '#0a0a1e',
    }).setOrigin(0.5).setDepth(4);

    const hitArea = this.add.rectangle(width / 2, btnY + btnH / 2, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    // 按钮闪烁
    this.tweens.add({
      targets: btnText,
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    hitArea.on('pointerover', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x000000, 0.5);
      btnGfx.fillRect(btnX + 3, btnY + 3, btnW, btnH);
      btnGfx.fillStyle(PXL.GREEN, 1);
      btnGfx.fillRect(btnX - 1, btnY - 1, btnW + 2, btnH + 2);
      btnGfx.lineStyle(2, 0xffffff, 0.5);
      btnGfx.strokeRect(btnX - 1, btnY - 1, btnW + 2, btnH + 2);
      btnText.setScale(1.05);
    });

    hitArea.on('pointerout', () => {
      btnGfx.clear();
      btnGfx.fillStyle(0x000000, 0.5);
      btnGfx.fillRect(btnX + 2, btnY + 2, btnW, btnH);
      btnGfx.fillStyle(PXL.GREEN, 1);
      btnGfx.fillRect(btnX, btnY, btnW, btnH);
      btnGfx.lineStyle(2, 0xffffff, 0.3);
      btnGfx.strokeRect(btnX, btnY, btnW, btnH);
      btnText.setScale(1);
    });

    const startGame = () => {
      SoundGenerator.unlock();
      this.scene.start('MenuScene');
    };

    hitArea.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    // 底部提示
    this.add.text(width / 2, height * 0.78, 'PRESS SPACE / ENTER OR TAP TO START', {
      fontSize: '11px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#666688',
    }).setOrigin(0.5).setDepth(3);

    this.add.text(width / 2, height - 18, 'v2.0  PIXEL ARCADE', {
      fontSize: '10px',
      fontFamily: FONT,
      fontStyle: '700',
      color: '#555577',
    }).setOrigin(0.5).setDepth(3);
  }
}
