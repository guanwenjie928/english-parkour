import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    const { width, height } = this.scale;

    // === 加载进度 UI ===
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    bg.setDepth(1000);

    const titleText = this.add.text(width / 2, height * 0.35, '英语跑酷', {
      fontSize: '48px',
      fontFamily: 'Arial Black',
      color: '#00d4ff',
    }).setOrigin(0.5).setDepth(1000);

    const loadingText = this.add.text(width / 2, height * 0.45, '加载中...', {
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5).setDepth(1000);

    // 进度条背景
    const barWidth = 400;
    const barHeight = 12;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.52;
    this.add.rectangle(width / 2, barY + barHeight / 2, barWidth + 4, barHeight + 4, 0x3a3a5e).setDepth(1000);
    const progressBar = this.add.rectangle(barX + 2, barY + 2, 0, barHeight, 0x00d4ff)
      .setOrigin(0, 0).setDepth(1000);

    // 百分比文字
    const percentText = this.add.text(width / 2, height * 0.56, '0%', {
      fontSize: '16px',
      color: '#00d4ff',
    }).setOrigin(0.5).setDepth(1000);

    // 监听加载进度
    this.load.on('progress', (value) => {
      progressBar.width = barWidth * value;
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    // 为了让加载画面可见（首次加载时可能非常快），这里保留进度 UI
    // 并在 create() 中做短暂停留

    // === 角色精灵图（单张 sheet 替代 8 张独立帧） ===
    this.load.image('run-sheet', 'assets/characters/run-sheet.jpg');
    this.load.image('pose-sheet', 'assets/characters/pose-sheet.jpg');

    // === 道具条带（单张 320×64 含 5 个道具图标） ===
    this.load.image('items-strip', 'assets/items/items-strip.jpg');

    // === 地图背景（城市 P0） ===
    this.load.image('bg-city-far', 'assets/backgrounds/city-far.jpg');
    this.load.image('bg-city-mid', 'assets/backgrounds/city-mid.jpg');
    this.load.image('bg-city-near', 'assets/backgrounds/city-near.jpg');

    // === 特效条带 ===
    this.load.image('vfx-strip', 'assets/vfx/vfx-strip.jpg');

    // === UI Atlas ===
    this.load.image('ui-atlas', 'assets/ui/ui-atlas.jpg');

    // === 障碍物 ===
    this.load.image('obstacles-strip', 'assets/obstacles/obstacles-strip.jpg');

    // === 菜单素材 ===
    this.load.image('menu-bg', 'assets/ui/menu-bg.jpg');
    this.load.image('menu-logo', 'assets/ui/menu-logo.jpg');
    this.load.image('menu-character', 'assets/ui/menu-character.png');

    // 音效: 全部由 SoundGenerator 程序化合成，零 mp3 文件
  }

  create() {
    const { width, height } = this.scale;

    // 清除 preload 中的 UI 元素
    this.children.removeAll(true);

    // === 深色背景 ===
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // === 从跑步 sheet (512×256 = 4列×2行, 每格128×128) 逐帧裁剪 ===
    const runSheet = this.textures.get('run-sheet');
    if (runSheet) {
      for (let i = 0; i < 8; i++) {
        const col = i % 4;
        const row = (i / 4) | 0;
        runSheet.add(`run_${i + 1}`, 0, col * 128, row * 128, 128, 128);
      }
    }

    // === 从姿势 sheet (640×128 = 5列×1行, 每格128×128) 裁剪 ===
    const poseSheet = this.textures.get('pose-sheet');
    const poseNames = ['idle', 'slide', 'stun', 'victory', 'shield'];
    if (poseSheet) {
      poseNames.forEach((name, i) => {
        poseSheet.add(`pose_${name}`, 0, i * 128, 0, 128, 128);
      });
    }

    // === 从道具条带 (320×64 = 5列×1行, 每格64×64) 裁剪 ===
    const itemsStrip = this.textures.get('items-strip');
    const itemNames = ['rocket', 'electric', 'banana', 'shield', 'magnet'];
    if (itemsStrip) {
      itemNames.forEach((name, i) => {
        itemsStrip.add(`item-${name}`, 0, i * 64, 0, 64, 64);
      });
    }

    // === 创建跑步动画 ===
    this.anims.create({
      key: 'run',
      frames: Array.from({ length: 8 }, (_, i) => ({ key: 'run-sheet', frame: `run_${i + 1}` })),
      frameRate: 12,
      repeat: -1,
    });

    // === 创建特效动画（从 vfx-strip 裁剪） ===
    const vfxStrip = this.textures.get('vfx-strip');
    if (vfxStrip) {
      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`electric_${i}`, 0, 0, i * 256, 256, 256);
      }
      this.anims.create({
        key: 'electric-hit',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `electric_${i}` })),
        frameRate: 10,
        repeat: 0,
      });

      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`shield_${i}`, 0, 0, 1280 + i * 256, 256, 256);
      }
      this.anims.create({
        key: 'shield-bubble',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `shield_${i}` })),
        frameRate: 10,
        repeat: 0,
      });
    }

    // === 点击开始画面 ===
    // 使用用户手势来解锁 AudioContext，符合浏览器自动播放策略
    this.showStartScreen();
  }

  showStartScreen() {
    const { width, height } = this.scale;

    // 标题
    const title = this.add.text(width / 2, height * 0.3, '英语跑酷', {
      fontSize: '56px',
      fontFamily: 'Arial Black',
      color: '#00d4ff',
      stroke: '#1a1a2e',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 副标题
    this.add.text(width / 2, height * 0.4, 'English Parkour', {
      fontSize: '18px',
      color: '#888888',
    }).setOrigin(0.5);

    // "点击开始"按钮
    const btnWidth = 280;
    const btnHeight = 60;
    const btnY = height * 0.58;

    const btnBg = this.add.rectangle(width / 2, btnY, btnWidth, btnHeight, 0x00d4ff, 0.9)
      .setInteractive({ useHandCursor: true });
    // 圆角效果 - 用 graphics 叠加
    const btnBorder = this.add.graphics();
    btnBorder.lineStyle(2, 0x00ffff, 1);
    btnBorder.strokeRoundedRect(width / 2 - btnWidth / 2, btnY - btnHeight / 2, btnWidth, btnHeight, 15);

    const btnText = this.add.text(width / 2, btnY, '点击开始', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#1a1a2e',
    }).setOrigin(0.5);

    // 按钮容器
    const btnContainer = this.add.container(0, 0);
    btnContainer.add([btnBg, btnBorder, btnText]);

    // 按钮呼吸动画（吸引点击）
    this.tweens.add({
      targets: btnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 底部提示文字
    this.add.text(width / 2, height * 0.75, '加载完毕后点击屏幕任意位置开始游戏', {
      fontSize: '14px',
      color: '#555555',
    }).setOrigin(0.5);

    // 版本标识（方便确认部署是否生效）
    this.add.text(width / 2, height - 20, 'v1.0.2', {
      fontSize: '12px',
      color: '#333333',
    }).setOrigin(0.5);

    // 点击开始处理
    const startGame = () => {
      // 在用户手势内解锁 AudioContext（符合浏览器策略）
      SoundGenerator.unlock();
      this.scene.start('MenuScene');
    };

    // 监听多种交互方式
    btnBg.on('pointerdown', startGame);
    this.input.keyboard.once('keydown-SPACE', startGame);
    this.input.keyboard.once('keydown-ENTER', startGame);

    // 标题入场动画
    title.setAlpha(0);
    title.setY(height * 0.25);
    this.tweens.add({
      targets: title,
      alpha: 1,
      y: height * 0.3,
      duration: 600,
      ease: 'Back.easeOut',
    });
  }
}
