import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder } from '../utils/ColorConfig.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
    this.gameAssetsLoaded = false;
  }

  // === 阶段 1：快速加载菜单素材（目标 2-3s 出菜单）===
  preload() {
    const { width, height } = this.scale;

    // 加载进度 UI（8-bit 风格）
    this._createLoadingUI(width, height);

    // 仅加载菜单必需的素材
    this.load.image('menu-logo', 'assets/ui/menu-logo.jpg');
    this.load.image('menu-character', 'assets/ui/menu-character.png');

    // 注意：游戏素材（精灵图、背景）在菜单/大厅闲置期间后台加载
  }

  _createLoadingUI(width, height) {
    const barW = 320;
    const barH = 16;
    const barX = (width - barW) / 2;
    const barY = height * 0.50;

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

    const borderGfx = this.add.graphics().setDepth(1000);
    drawPixelBorder(borderGfx, barX - 4, barY - 4, barW + 8, barH + 8, PX.BG_LIGHT, 3);

    this._progressBar = this.add.rectangle(barX, barY, 0, barH, PX.PRIMARY)
      .setOrigin(0, 0).setDepth(1000);

    this._percentText = this.add.text(width / 2, height * 0.56, '0%', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1000);

    this.load.on('progress', (value) => {
      this._progressBar.width = barW * value;
      this._percentText.setText(`${Math.floor(value * 100)}%`);
    });
  }

  create() {
    const { width, height } = this.scale;
    this.children.removeAll(true);

    // 深色背景
    this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK);

    // 纹理预处理 + 动画创建
    this._processTextures();
    this._createAnimations();

    // 启动点击开始画面
    this.showStartScreen();

    // 阶段 2：后台加载游戏素材（跑酷精灵图 + 背景 + BGM）
    this._loadGameAssets();
  }

  // === 阶段 2：后台加载游戏素材 ===
  _loadGameAssets() {
    // 使用 Phaser Loader 的独立加载（不影响当前场景）
    this.load.image('run-sheet', 'assets/characters/run-sheet.png');
    this.load.image('pose-sheet', 'assets/characters/pose-sheet.png');
    this.load.image('items-strip', 'assets/items/items-strip.png');
    this.load.image('vfx-strip', 'assets/vfx/vfx-strip.png');
    this.load.image('bg-city-far', 'assets/backgrounds/city-far.jpg');
    this.load.image('bg-city-mid', 'assets/backgrounds/city-mid.jpg');
    this.load.image('bg-city-near', 'assets/backgrounds/city-near.jpg');

    // 加载完成回调
    this.load.once('complete', () => {
      this.gameAssetsLoaded = true;
      // 纹理预处理 + 动画创建
      this._processTextures();
      this._createAnimations();
      console.log('[BootScene] 游戏素材后台加载完成');
    });

    this.load.start();
  }

  // === 纹理帧切片（兼容旧/新尺寸） ===
  _processTextures() {
    // run-sheet：4×2 网格，每帧 128×128 → 512×256（PNG）或动态计算（旧 JPG）
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

    // pose-sheet：5×1 横条，每帧 128×128 → 640×128（PNG）或动态计算
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

    // items-strip：5×1 横条，每帧 64×64 → 320×64（PNG）或动态计算
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
    // 跑步动画（8 帧，12fps）
    if (!this.anims.exists('run')) {
      this.anims.create({
        key: 'run',
        frames: Array.from({ length: 8 }, (_, i) => ({ key: 'run-sheet', frame: `run_${i + 1}` })),
        frameRate: 12,
        repeat: -1,
      });
    }

    // VFX 动画（动态计算帧切片以兼容不同尺寸）
    const vfxStrip = this.textures.get('vfx-strip');
    if (vfxStrip && !vfxStrip.has('electric_0')) {
      const source = vfxStrip.source[0];
      const imgW = source.width;
      const imgH = source.height;
      const frameCount = 10;   // 5 electric + 5 shield
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

  // === 点击开始画面 ===
  showStartScreen() {
    const { width, height } = this.scale;

    // 装饰像素边框
    const outerGfx = this.add.graphics();
    drawPixelBorder(outerGfx, 20, 20, width - 40, height - 40, PX.BG_LIGHT, 3);

    // 标题
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

    // "PRESS START" 按钮
    const btnW = 260;
    const btnH = 56;
    const btnX = width / 2 - btnW / 2;
    const btnY = height * 0.55 - btnH / 2;

    const btnBg = this.add.rectangle(width / 2, height * 0.55, btnW, btnH, PX.PRIMARY)
      .setInteractive({ useHandCursor: true });

    const btnBorder = this.add.graphics();
    drawPixelBorder(btnBorder, btnX - 4, btnY - 4, btnW + 8, btnH + 8, 0x5a9e38, 3);

    const btnText = this.add.text(width / 2, height * 0.55, 'PRESS  START', {
      fontSize: '14px',
      fontFamily: FONT,
      color: '#' + PX.TEXT_DARK.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 按钮闪烁
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
    this.add.text(width / 2, height - 24, 'v1.2.0  [8-BIT]', {
      fontSize: '8px',
      fontFamily: FONT,
      color: '#' + PX.BG_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 加载提示（如果游戏素材还在后台加载中）
    if (!this.gameAssetsLoaded) {
      const loadingHint = this.add.text(width / 2, height - 48, '(加载中...)', {
        fontSize: '8px',
        fontFamily: FONT,
        color: '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      // 加载完成后自动隐藏
      const checkLoaded = this.time.addEvent({
        delay: 500,
        callback: () => {
          if (this.gameAssetsLoaded) {
            loadingHint.setVisible(false);
            checkLoaded.remove();
          }
        },
        loop: true,
      });
    }

    // 点击开始处理
    const startGame = () => {
      SoundGenerator.unlock();
      this.scene.start('MenuScene');
    };

    btnBg.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    // 标题入场动画
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 500, ease: 'Linear' });
  }
}
