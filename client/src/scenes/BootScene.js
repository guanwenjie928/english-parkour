import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder } from '../utils/ColorConfig.js';

const PX = EIGHT_BIT;     // 别名，方便使用
const FONT = 'Press Start 2P';  // 像素英文字体
const FONT_CN = 'Arial Black';   // 中文回退字体（Press Start 2P 无中文）

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;

    // === 加载进度 UI（8-bit 风格） ===
    this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK).setDepth(1000);

    this.add.text(width / 2, height * 0.35, '英 语 跑 酷', {
      fontSize: '36px',
      fontFamily: FONT_CN,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1000);

    this.add.text(width / 2, height * 0.43, 'LOADING...', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1000);

    // 进度条（像素分段式）
    const barW = 320;
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = height * 0.50;
    // 外框
    const borderGfx = this.add.graphics().setDepth(1000);
    drawPixelBorder(borderGfx, barX - 4, barY - 4, barW + 8, barH + 8, PX.BG_LIGHT, 3);
    // 内填充
    const progressBar = this.add.rectangle(barX, barY, 0, barH, PX.PRIMARY)
      .setOrigin(0, 0).setDepth(1000);

    const percentText = this.add.text(width / 2, height * 0.56, '0%', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1000);

    this.load.on('progress', (value) => {
      progressBar.width = barW * value;
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    // === 资源加载（与原来完全一致） ===
    this.load.image('run-sheet', 'assets/characters/run-sheet.jpg');
    this.load.image('pose-sheet', 'assets/characters/pose-sheet.jpg');
    this.load.image('items-strip', 'assets/items/items-strip.jpg');
    this.load.image('bg-city-far', 'assets/backgrounds/city-far.jpg');
    this.load.image('bg-city-mid', 'assets/backgrounds/city-mid.jpg');
    this.load.image('bg-city-near', 'assets/backgrounds/city-near.jpg');
    this.load.image('vfx-strip', 'assets/vfx/vfx-strip.jpg');
    this.load.image('ui-atlas', 'assets/ui/ui-atlas.jpg');
    this.load.image('obstacles-strip', 'assets/obstacles/obstacles-strip.jpg');
    this.load.image('menu-bg', 'assets/ui/menu-bg.jpg');
    this.load.image('menu-logo', 'assets/ui/menu-logo.jpg');
    this.load.image('menu-character', 'assets/ui/menu-character.png');
  }

  create() {
    const { width, height } = this.scale;
    this.children.removeAll(true);

    // 深色背景
    this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK);

    // 纹理裁剪和动画创建（保持不变）
    this._processTextures();
    this._createAnimations();

    // 点击开始画面
    this.showStartScreen();
  }

  _processTextures() {
    const runSheet = this.textures.get('run-sheet');
    if (runSheet) {
      for (let i = 0; i < 8; i++) {
        const col = i % 4;
        const row = (i / 4) | 0;
        runSheet.add(`run_${i + 1}`, 0, col * 128, row * 128, 128, 128);
      }
    }

    const poseSheet = this.textures.get('pose-sheet');
    const poseNames = ['idle', 'slide', 'stun', 'victory', 'shield'];
    if (poseSheet) {
      poseNames.forEach((name, i) => {
        poseSheet.add(`pose_${name}`, 0, i * 128, 0, 128, 128);
      });
    }

    const itemsStrip = this.textures.get('items-strip');
    const itemNames = ['rocket', 'electric', 'banana', 'shield', 'magnet'];
    if (itemsStrip) {
      itemNames.forEach((name, i) => {
        itemsStrip.add(`item-${name}`, 0, i * 64, 0, 64, 64);
      });
    }
  }

  _createAnimations() {
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 8 }, (_, i) => ({ key: 'run-sheet', frame: `run_${i + 1}` })),
      frameRate: 12,
      repeat: -1,
    });

    const vfxStrip = this.textures.get('vfx-strip');
    if (vfxStrip) {
      // VFX strip 实际尺寸 464×2320（竖条），总 10 帧，每帧 464×232
      const source = vfxStrip.source[0];
      const imgW = source.width;
      const imgH = source.height;
      const frameCount = 10;  // 5 electric + 5 shield
      const frameH = Math.floor(imgH / frameCount);

      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`electric_${i}`, 0, 0, i * frameH, imgW, frameH);
      }
      this.anims.create({
        key: 'electric-hit',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `electric_${i}` })),
        frameRate: 10,
        repeat: 0,
      });

      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`shield_${i}`, 0, 0, (5 + i) * frameH, imgW, frameH);
      }
      this.anims.create({
        key: 'shield-bubble',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `shield_${i}` })),
        frameRate: 10,
        repeat: 0,
      });
    }
  }

  showStartScreen() {
    const { width, height } = this.scale;

    // 装饰像素边框（外框）
    const outerGfx = this.add.graphics();
    drawPixelBorder(outerGfx, 20, 20, width - 40, height - 40, PX.BG_LIGHT, 3);

    // 标题 — 用像素绿色
    const title = this.add.text(width / 2, height * 0.28, '英 语 跑 酷', {
      fontSize: '42px',
      fontFamily: FONT_CN,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'ENGLISH PARKOUR', {
      fontSize: '11px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // "PRESS START" 按钮 — 块状矩形
    const btnW = 260;
    const btnH = 56;
    const btnX = width / 2 - btnW / 2;
    const btnY = height * 0.55 - btnH / 2;

    const btnBg = this.add.rectangle(width / 2, height * 0.55, btnW, btnH, PX.PRIMARY)
      .setInteractive({ useHandCursor: true });

    // 像素边框
    const btnBorder = this.add.graphics();
    drawPixelBorder(btnBorder, btnX - 4, btnY - 4, btnW + 8, btnH + 8, 0x5a9e38, 3);

    const btnText = this.add.text(width / 2, height * 0.55, 'PRESS  START', {
      fontSize: '14px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_DARK.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 按钮闪烁动画（alpha 闪烁，比 scale 更有像素感）
    this.tweens.add({
      targets: [btnBg, btnBorder, btnText],
      alpha: 0.5,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Linear',
    });

    // 底部提示
    this.add.text(width / 2, height * 0.70, 'CLICK / SPACE / ENTER', {
      fontSize: '9px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.76, '点击屏幕开始游戏', {
      fontSize: '14px',
      fontFamily: FONT_CN,
      color: '#' + PX.SECONDARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 版本标识
    this.add.text(width / 2, height - 24, 'v1.1.0  [8-BIT]', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.BG_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 底部像素装饰线
    const decoGfx = this.add.graphics();
    for (let i = 0; i < 8; i++) {
      const sx = width / 2 - 80 + i * 22;
      decoGfx.fillStyle(PX.BG_LIGHT, 0.4);
      decoGfx.fillRect(sx, height * 0.68, 8, 8);
    }

    // 点击开始处理
    const startGame = () => {
      SoundGenerator.unlock();
      this.scene.start('MenuScene');
    };

    btnBg.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    // 标题入场
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500, ease: 'Linear' });
  }
}
