import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { GHIBLI, drawRoundedRect, drawSoftBorder, drawGlassPanel } from '../utils/ColorConfig.js';
import { createFloatingParticles } from '../utils/AnimationHelper.js';

const C = GHIBLI;
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
    this.load.image('menu-logo', 'assets/ui/menu-logo.jpg');
    this.load.image('menu-character', 'assets/ui/menu-character.png');
    this.load.image('menu-bg', 'assets/ui/menu-bg.jpg');
  }

  _createLoadingUI(width, height) {
    // 奶油白全屏背景
    this.add.rectangle(width / 2, height / 2, width, height, C.BG_CREAM).setDepth(1000);

    // 飘浮粒子
    createFloatingParticles(this, width, height, {
      count: 6, type: 'petal', depth: 1001,
    });

    // 标题
    this.add.text(width / 2, height * 0.32, '英语跑酷', {
      fontSize: '48px',
      fontFamily: FONT_CN,
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1002);

    this.add.text(width / 2, height * 0.40, 'English Parkour', {
      fontSize: '16px',
      fontFamily: FONT,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1002);

    // 圆角进度条
    const barW = 300;
    const barH = 10;
    const barX = (width - barW) / 2;
    const barY = height * 0.50;

    // 进度条背景（圆角）
    const barBgGfx = this.add.graphics().setDepth(1002);
    barBgGfx.fillStyle(C.BG_SAND, 1);
    barBgGfx.fillRoundedRect(barX, barY, barW, barH, 5);

    // 进度条边框
    const barBorderGfx = this.add.graphics().setDepth(1002);
    barBorderGfx.lineStyle(2, C.ACCENT, 0.6);
    barBorderGfx.strokeRoundedRect(barX, barY, barW, barH, 5);

    // 进度条填充
    this._progressBar = this.add.rectangle(barX, barY, 0, barH, C.PRIMARY)
      .setOrigin(0, 0).setDepth(1003);
    // 用 mask 实现圆角填充效果
    const maskGfx = this.add.graphics().setDepth(1004);
    maskGfx.fillStyle(0xffffff);
    maskGfx.fillRoundedRect(barX, barY, barW, barH, 5);
    this._progressBar.setMask(maskGfx.createGeometryMask());

    // 百分比文字
    this._percentText = this.add.text(width / 2, height * 0.56, '0%', {
      fontSize: '14px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1002);

    // 加载提示
    this.add.text(width / 2, height * 0.62, '正在准备...', {
      fontSize: '12px',
      fontFamily: FONT,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1002);

    // 底部装饰草地
    const grassGfx = this.add.graphics().setDepth(1001);
    grassGfx.fillStyle(C.GRASS, 0.3);
    grassGfx.fillRoundedRect(0, height - 40, width, 80, 20);

    this.load.on('progress', (value) => {
      this._progressBar.width = barW * value;
      this._percentText.setText(`${Math.floor(value * 100)}%`);
    });
  }

  create() {
    const { width, height } = this.scale;
    this.children.removeAll(true);

    // 奶油白背景
    this.add.rectangle(width / 2, height / 2, width, height, C.BG_CREAM);

    // 纹理预处理（仅处理已加载的菜单素材）
    this._processTextures();

    // 启动点击开始画面
    this.showStartScreen();

    // 阶段 2：后台加载游戏素材
    this._loadGameAssets();
  }

  // === 阶段 2：后台加载游戏素材 ===
  _loadGameAssets() {
    this.load.image('run-sheet', 'assets/characters/run-sheet.png');
    this.load.image('pose-sheet', 'assets/characters/pose-sheet.png');
    this.load.image('items-strip', 'assets/items/items-strip.png');
    this.load.image('vfx-strip', 'assets/vfx/vfx-strip.png');
    this.load.image('bg-city-far', 'assets/backgrounds/city-far.jpg');
    this.load.image('bg-city-mid', 'assets/backgrounds/city-mid.jpg');
    this.load.image('bg-city-near', 'assets/backgrounds/city-near.jpg');

    this.load.once('complete', () => {
      this.gameAssetsLoaded = true;
      this._processTextures();
      this._createAnimations();
      console.log('[BootScene] 游戏素材后台加载完成');
    });

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

  // === 点击开始画面（吉卜力治愈风格） ===
  showStartScreen() {
    const { width, height } = this.scale;

    // 飘浮花瓣背景
    createFloatingParticles(this, width, height, {
      count: 10, type: 'petal', depth: 1,
    });

    // 天空渐变（多个色条模拟）
    const skyColors = [C.ACCENT, 0xb8e0e0, 0xccd5c8, 0xdde8d0, C.BG_CREAM];
    const bandH = Math.ceil(height / skyColors.length);
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandH + bandH / 2, width, bandH + 1, color, 0.5)
        .setDepth(0);
    });

    // 底部草地装饰
    const grassGfx = this.add.graphics().setDepth(1);
    grassGfx.fillStyle(C.GRASS, 0.25);
    grassGfx.fillRoundedRect(-20, height - 60, width + 40, 120, 30);

    // --- Logo 卡片 ---
    const logoW = 360;
    const logoH = 90;
    const logoX = (width - logoW) / 2;
    const logoY = height * 0.10;

    const logoGfx = this.add.graphics().setDepth(2);
    drawGlassPanel(logoGfx, logoX, logoY, logoW, logoH, 14, C.BG_CREAM, 0.92, C.ACCENT, 2);

    const title = this.add.text(width / 2, logoY + 30, '英语跑酷', {
      fontSize: '42px',
      fontFamily: FONT_CN,
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    this.add.text(width / 2, logoY + 68, 'ENGLISH PARKOUR', {
      fontSize: '12px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    // Logo 入场动画
    title.setAlpha(0);
    title.y += 20;
    this.tweens.add({
      targets: title,
      alpha: 1,
      y: logoY + 30,
      duration: 600,
      ease: 'Back.easeOut',
    });

    // --- 角色立绘 ---
    if (this.textures.exists('menu-character')) {
      const leftChar = this.add.image(110, height * 0.55, 'menu-character')
        .setScale(0.42).setDepth(1).setAlpha(0.8);
      const rightChar = this.add.image(width - 110, height * 0.55, 'menu-character')
        .setScale(0.42).setFlipX(true).setDepth(1).setAlpha(0.8);

      // 呼吸动画
      [leftChar, rightChar].forEach((char) => {
        this.tweens.add({
          targets: char,
          scaleX: 0.44,
          scaleY: 0.44,
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    }

    // --- 开始按钮 ---
    const btnW = 260;
    const btnH = 56;
    const btnX = width / 2 - btnW / 2;
    const btnY = height * 0.72 - btnH / 2;

    const btnBg = this.add.graphics().setDepth(3);
    btnBg.fillStyle(C.PRIMARY, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
    btnBg.lineStyle(2, 0x5a8a3e, 0.4);
    btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 14);

    const btnText = this.add.text(width / 2, height * 0.72, '开始游戏', {
      fontSize: '20px',
      fontFamily: FONT_CN,
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(4);

    // 按钮热区
    const hitArea = this.add.rectangle(width / 2, height * 0.72, btnW, btnH, 0x000000, 0)
      .setInteractive({ useHandCursor: true }).setDepth(5);

    // 按钮呼吸动画
    this.tweens.add({
      targets: [btnBg, btnText],
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    hitArea.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x7fb069, 1);
      btnBg.fillRoundedRect(btnX - 2, btnY - 2, btnW + 4, btnH + 4, 16);
      btnBg.lineStyle(2, 0x5a8a3e, 0.5);
      btnBg.strokeRoundedRect(btnX - 2, btnY - 2, btnW + 4, btnH + 4, 16);
    });

    hitArea.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(C.PRIMARY, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 14);
      btnBg.lineStyle(2, 0x5a8a3e, 0.4);
      btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 14);
    });

    // 点击开始
    const startGame = () => {
      SoundGenerator.unlock();
      this.scene.start('MenuScene');
    };

    hitArea.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    // 底部提示
    this.add.text(width / 2, height * 0.80, '点击屏幕 或 按空格键/回车键 开始', {
      fontSize: '13px',
      fontFamily: FONT_CN,
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    // 版本标识
    this.add.text(width / 2, height - 22, 'v2.0  Ghibli', {
      fontSize: '10px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    // 加载提示
    if (!this.gameAssetsLoaded) {
      const loadingHint = this.add.text(width / 2, height - 42, '正在准备游戏素材...', {
        fontSize: '11px',
        fontFamily: FONT,
        color: '#' + C.ACCENT.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(3);

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
  }
}
