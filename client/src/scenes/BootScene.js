import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 加载基础资源
    this.load.image('logo', 'assets/ui/logo.png');
    this.load.image('btn-start', 'assets/ui/btn-start.png');

    // 加载角色序列帧
    for (let i = 1; i <= 8; i++) {
      this.load.image(`run_${i}`, `assets/characters/run_${String(i).padStart(2, '0')}.png`);
    }

    // 加载道具
    this.load.image('item-rocket', 'assets/items/rocket.png');
    this.load.image('item-electric', 'assets/items/electric.png');
    this.load.image('item-banana', 'assets/items/banana.png');
    this.load.image('item-shield', 'assets/items/shield.png');

    // 加载背景
    this.load.image('bg-city-far', 'assets/backgrounds/city-far.png');
    this.load.image('bg-city-mid', 'assets/backgrounds/city-mid.png');
    this.load.image('bg-city-near', 'assets/backgrounds/city-near.png');

    // 加载音效
    this.load.audio('sfx-correct', 'assets/audio/sfx_correct.mp3');
    this.load.audio('sfx-wrong', 'assets/audio/sfx_wrong.mp3');
    this.load.audio('sfx-item', 'assets/audio/sfx_item.mp3');
    this.load.audio('bgm-menu', 'assets/audio/bgm_menu.mp3');
  }

  create() {
    // 创建动画
    this.anims.create({
      key: 'run',
      frames: Array.from({length: 8}, (_, i) => ({ key: `run_${i+1}` })),
      frameRate: 12,
      repeat: -1
    });

    this.scene.start('MenuScene');
  }
}
