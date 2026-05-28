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
    // 初始化 SoundGenerator（提前解锁 AudioContext）
    SoundGenerator.unlock();

    const { width, height } = this.scale;

    // 显示初始化状态（页面可能已经被 preload UI 占据）
    // 清除 preload 中的 UI 元素，显示"初始化中"
    this.children.removeAll(true);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);
    this.add.text(width / 2, height * 0.45, '正在初始化...', {
      fontSize: '20px',
      color: '#00d4ff',
    }).setOrigin(0.5);

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
      // electric-hit: 5帧竖排 256×256 each → frame 0-4 at y=0
      for (let i = 0; i < 5; i++) {
        vfxStrip.add(`electric_${i}`, 0, 0, i * 256, 256, 256);
      }
      this.anims.create({
        key: 'electric-hit',
        frames: Array.from({ length: 5 }, (_, i) => ({ key: 'vfx-strip', frame: `electric_${i}` })),
        frameRate: 10,
        repeat: 0,
      });

      // shield-bubble: 5帧竖排 256×256 each → frame 0-4 at y=1280
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

    // 短暂停顿让用户看到"初始化完成"，然后过渡到菜单
    this.time.delayedCall(200, () => {
      this.scene.start('MenuScene');
    });
  }
}
