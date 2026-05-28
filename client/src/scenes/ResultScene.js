import Phaser from 'phaser';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create(data) {
    const { width, height } = this.scale;

    // 背景
    this.add.rectangle(width/2, height/2, width, height, 0x1a1a2e);

    // 标题
    this.add.text(width/2, height * 0.15, '比赛结束!', {
      fontSize: '56px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#00d4ff',
      strokeThickness: 6
    }).setOrigin(0.5);

    // 排名列表
    const rankings = data.rankings || [
      { rank: 1, name: '小亮', progress: 100 },
      { rank: 2, name: '小红', progress: 95 },
      { rank: 3, name: '小明', progress: 88 }
    ];

    rankings.forEach((player, index) => {
      const y = height * 0.3 + index * 80;
      const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#ffffff'];

      // 排名徽章
      this.add.circle(100, y, 30, Phaser.Display.Color.HexStringToColor(colors[index] || '#ffffff').color)
        .setStrokeStyle(3, 0xffffff);

      this.add.text(100, y, `${player.rank}`, {
        fontSize: '28px',
        color: '#1a1a2e',
        fontFamily: 'Arial Black'
      }).setOrigin(0.5);

      // 姓名
      this.add.text(200, y, player.name, {
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial'
      }).setOrigin(0, 0.5);

      // 进度
      this.add.text(width - 100, y, `${player.progress}%`, {
        fontSize: '28px',
        color: '#00d4ff',
        fontFamily: 'Arial Black'
      }).setOrigin(1, 0.5);
    });

    // 再来一局按钮
    const restartBtn = this.add.rectangle(width/2, height * 0.8, 200, 60, 0x00d4ff)
      .setInteractive()
      .on('pointerdown', () => {
        this.scene.start('MenuScene');
      });

    this.add.text(width/2, height * 0.8, '再来一局', {
      fontSize: '28px',
      color: '#1a1a2e',
      fontFamily: 'Arial Black'
    }).setOrigin(0.5);

    // 烟花特效
    this.createFireworks();
  }

  createFireworks() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff];

    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 300, () => {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = Phaser.Math.Between(100, this.scale.height / 2);

        const particles = this.add.particles(x, y, 'item-rocket', {
          speed: { min: 100, max: 400 },
          scale: { start: 0.8, end: 0 },
          lifespan: 1000,
          quantity: 20,
          tint: Phaser.Math.RND.pick(colors)
        });

        this.time.delayedCall(1500, () => particles.destroy());
      });
    }
  }
}
