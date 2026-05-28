import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { PLAYER_COLORS } from '../utils/ColorConfig.js';

export class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  init(data) {
    this.rankings = data.rankings || [];
  }

  create() {
    const { width, height } = this.scale;
    this.soundGenerator = SoundGenerator.get();

    // 停止游戏BGM，播放胜利BGM
    this.soundGenerator.stopBGM();
    this.soundGenerator.playBGM('final');
    this.soundGenerator.play('victory');

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // 标题
    this.add.text(width / 2, height * 0.12, '🎉 比赛结束!', {
      fontSize: '64px',
      fontFamily: 'Arial Black',
      color: '#ffffff',
      stroke: '#ffdd44',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // 排名列表
    this.createRankingList();

    // 按钮
    this.createButtons();

    // 烟花特效
    this.createFireworks();
  }

  createRankingList() {
    const { width, height } = this.scale;
    const startY = height * 0.28;
    const itemHeight = 70;

    this.rankings.forEach((player, index) => {
      const y = startY + index * itemHeight;
      const isMe = player.socketId === window.network.socket.id;

      // 背景条（自己高亮）
      const bgColor = isMe ? 0x3a3a6e : (index % 2 === 0 ? 0x2a2a4e : 0x252545);
      this.add.rectangle(width / 2, y, 600, itemHeight - 8, bgColor);

      // 奖牌
      const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
      const medalColor = medalColors[index] || '#444444';
      const medalText = index < 3 ? ['🥇', '🥈', '🥉'][index] : `${index + 1}`;

      this.add.circle(120, y, 28, Phaser.Display.Color.HexStringToColor(medalColor).color)
        .setStrokeStyle(3, 0xffffff);

      this.add.text(120, y, medalText, {
        fontSize: index < 3 ? '28px' : '20px',
        fontFamily: 'Arial Black',
        color: index < 3 ? '#1a1a2e' : '#888888',
      }).setOrigin(0.5);

      // 颜色圆点
      const color = PLAYER_COLORS[player.trackNumber - 1] || PLAYER_COLORS[0];
      this.add.circle(180, y, 12, color.tint);

      // 姓名
      this.add.text(210, y, player.name, {
        fontSize: '24px',
        color: '#ffffff',
        fontFamily: 'Arial',
      }).setOrigin(0, 0.5);

      // 进度
      this.add.text(width - 150, y, `${player.progress.toFixed(1)}%`, {
        fontSize: '22px',
        color: '#00d4ff',
        fontFamily: 'Arial Black',
      }).setOrigin(1, 0.5);

      // 正确数
      this.add.text(width - 80, y, `✓ ${player.correctCount || 0}`, {
        fontSize: '16px',
        color: '#44dd44',
      }).setOrigin(0.5);
    });
  }

  createButtons() {
    const { width, height } = this.scale;

    // 再来一局
    const restartBtn = this.add.rectangle(width / 2 - 130, height * 0.88, 220, 60, 0x00d4ff)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2 - 130, height * 0.88, '再来一局', {
      fontSize: '28px',
      fontFamily: 'Arial Black',
      color: '#1a1a2e',
    }).setOrigin(0.5);

    restartBtn.on('pointerdown', () => {
      this.soundGenerator.play('click');
      this.scene.start('MenuScene');
    });
    restartBtn.on('pointerover', () => restartBtn.setScale(1.05));
    restartBtn.on('pointerout', () => restartBtn.setScale(1));

    // 退出
    const exitBtn = this.add.rectangle(width / 2 + 130, height * 0.88, 220, 60, 0x3a3a5e)
      .setInteractive({ useHandCursor: true });

    this.add.text(width / 2 + 130, height * 0.88, '退出', {
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this.soundGenerator.play('click');
      window.location.reload();
    });
    exitBtn.on('pointerover', () => exitBtn.setScale(1.05));
    exitBtn.on('pointerout', () => exitBtn.setScale(1));
  }

  createFireworks() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];

    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 400, () => {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = Phaser.Math.Between(100, this.scale.height / 2);
        const color = Phaser.Math.RND.pick(colors);

        // 创建爆炸粒子效果
        this.createExplosion(x, y, color);
      });
    }

    // 循环烟花
    this.time.addEvent({
      delay: 3000,
      callback: () => {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = Phaser.Math.Between(100, this.scale.height / 2);
        const color = Phaser.Math.RND.pick(colors);
        this.createExplosion(x, y, color);
      },
      loop: true,
    });
  }

  createExplosion(x, y, color) {
    // 使用图形创建简单的爆炸效果
    const particles = [];
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(3, 8);

      const particle = this.add.circle(x, y, Phaser.Math.Between(4, 8), color);
      particle.velocityX = Math.cos(angle) * speed;
      particle.velocityY = Math.sin(angle) * speed;
      particle.life = 1.0;

      particles.push(particle);
    }

    // 动画更新
    const updateParticles = () => {
      let alive = false;
      particles.forEach((p) => {
        if (p.life > 0) {
          p.x += p.velocityX;
          p.y += p.velocityY;
          p.velocityY += 0.2; // 重力
          p.life -= 0.02;
          p.alpha = p.life;
          p.scale = p.life;
          alive = true;
        } else {
          p.setVisible(false);
        }
      });

      if (alive) {
        this.time.delayedCall(16, updateParticles);
      } else {
        particles.forEach((p) => p.destroy());
      }
    };

    updateParticles();
  }

  shutdown() {
    this.soundGenerator.stopBGM();
  }
}
