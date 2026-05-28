import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { EIGHT_BIT, drawPixelBorder, PLAYER_COLORS } from '../utils/ColorConfig.js';

const PX = EIGHT_BIT;
const FONT = 'Press Start 2P';
const FONT_CN = 'Arial Black';

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

    this.soundGenerator.stopBGM();
    this.soundGenerator.playBGM('final');
    this.soundGenerator.play('victory');

    // 纯色暖棕背景
    this.add.rectangle(width / 2, height / 2, width, height, PX.BG_DARK);

    // 像素网格装饰
    const gridGfx = this.add.graphics();
    gridGfx.lineStyle(1, PX.BG_MID, 0.15);
    for (let x = 0; x < width; x += 40) {
      gridGfx.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += 40) {
      gridGfx.lineBetween(0, y, width, y);
    }

    // 外框
    const outerGfx = this.add.graphics();
    drawPixelBorder(outerGfx, 16, 16, width - 32, height - 32, PX.BG_LIGHT, 2);

    // 标题（无 emoji，纯像素文字）
    this.add.text(width / 2, height * 0.08, 'GAME  OVER', {
      fontSize: '28px',
      fontFamily: FONT,
      color: '#' + PX.HIGHLIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.14, '比赛结束!', {
      fontSize: '18px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    // 排名列表
    this.createRankingList();

    // 按钮
    this.createButtons();

    // 烟花特效（简化，暖色调）
    this.createFireworks();
  }

  createRankingList() {
    const { width, height } = this.scale;
    const startY = height * 0.24;
    const itemHeight = 62;

    this.rankings.forEach((player, index) => {
      const y = startY + index * itemHeight;
      const isMe = player.socketId === window.network?.socket?.id;
      const slotW = 540;
      const slotX = (width - slotW) / 2;

      // 背景条
      const bgColor = isMe ? PX.BG_LIGHT : (index % 2 === 0 ? PX.BG_MID : 0x352518);
      const bg = this.add.rectangle(width / 2, y + itemHeight / 2, slotW, itemHeight - 6, bgColor, 0.95);
      if (isMe) {
        const bgBorder = this.add.graphics();
        drawPixelBorder(bgBorder, slotX, y, slotW, itemHeight - 6, PX.HIGHLIGHT, 2);
      }

      // 奖牌：像素方块（金/银/铜色）
      const medalColors = [0xf0d080, 0xc0c0c0, 0xcd7f32]; // 金银铜
      const medalColor = medalColors[index] || PX.SECONDARY;
      const medalX = slotX + 40;
      const medalSize = 22;

      const medalGfx = this.add.graphics();
      medalGfx.fillStyle(medalColor, 1);
      medalGfx.fillRect(medalX - medalSize / 2, y + itemHeight / 2 - medalSize / 2, medalSize, medalSize);
      drawPixelBorder(medalGfx,
        medalX - medalSize / 2 - 2, y + itemHeight / 2 - medalSize / 2 - 2,
        medalSize + 4, medalSize + 4, 0xffffff, 1);

      // 排名数字
      this.add.text(medalX, y + itemHeight / 2, `${index + 1}`, {
        fontSize: '14px',
        fontFamily: FONT,
        color: index < 3 ? '#' + PX.TEXT_DARK.toString(16).padStart(6, '0') : '#' + PX.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      // 颜色方块（代替圆点）
      const color = PLAYER_COLORS[player.trackNumber - 1] || PLAYER_COLORS[0];
      const dotX = medalX + 40;
      const dotSize = 12;
      const dotGfx = this.add.graphics();
      dotGfx.fillStyle(color.tint, 1);
      dotGfx.fillRect(dotX - dotSize / 2, y + itemHeight / 2 - dotSize / 2, dotSize, dotSize);
      drawPixelBorder(dotGfx,
        dotX - dotSize / 2 - 1, y + itemHeight / 2 - dotSize / 2 - 1,
        dotSize + 2, dotSize + 2, 0xffffff, 1);

      // 姓名
      this.add.text(dotX + 20, y + itemHeight / 2, player.name, {
        fontSize: '18px',
        fontFamily: FONT_CN,
        color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5);

      // 进度
      this.add.text(slotX + slotW - 120, y + itemHeight / 2, `${player.progress.toFixed(1)}%`, {
        fontSize: '16px',
        fontFamily: FONT_CN,
        color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0.5);

      // 正确数
      this.add.text(slotX + slotW - 30, y + itemHeight / 2, `OK:${player.correctCount || 0}`, {
        fontSize: '10px',
        fontFamily: FONT,
        color: '#' + PX.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);
    });
  }

  createButtons() {
    const { width, height } = this.scale;

    // 再来一局
    const btn1X = width / 2 - 130;
    const btnY = height * 0.88;
    const btnW = 200;
    const btnH = 50;

    const restartBtn = this.add.rectangle(btn1X, btnY, btnW, btnH, PX.PRIMARY)
      .setInteractive({ useHandCursor: true });

    const rBorder = this.add.graphics();
    drawPixelBorder(rBorder, btn1X - btnW / 2 - 3, btnY - btnH / 2 - 3, btnW + 6, btnH + 6, 0x5a9e38, 2);

    this.add.text(btn1X, btnY, '再来一局', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_DARK.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    restartBtn.on('pointerdown', () => {
      this.soundGenerator.play('click');
      this.scene.start('MenuScene');
    });
    restartBtn.on('pointerover', () => restartBtn.setFillStyle(PX.HIGHLIGHT));
    restartBtn.on('pointerout', () => restartBtn.setFillStyle(PX.PRIMARY));

    // 退出
    const btn2X = width / 2 + 130;
    const exitBtn = this.add.rectangle(btn2X, btnY, btnW, btnH, PX.SECONDARY)
      .setInteractive({ useHandCursor: true });

    const eBorder = this.add.graphics();
    drawPixelBorder(eBorder, btn2X - btnW / 2 - 3, btnY - btnH / 2 - 3, btnW + 6, btnH + 6, PX.BG_LIGHT, 1);

    this.add.text(btn2X, btnY, '退  出', {
      fontSize: '16px',
      fontFamily: FONT_CN,
      color: '#' + PX.TEXT_LIGHT.toString(16).padStart(6, '0'),
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this.soundGenerator.play('click');
      window.location.reload();
    });
    exitBtn.on('pointerover', () => exitBtn.setFillStyle(PX.HIGHLIGHT));
    exitBtn.on('pointerout', () => exitBtn.setFillStyle(PX.SECONDARY));
  }

  createFireworks() {
    const colors = [PX.HIGHLIGHT, PX.PRIMARY, PX.ACCENT, PX.ERROR, PX.GOLD, PX.MINT];

    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 500, () => {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = Phaser.Math.Between(80, this.scale.height * 0.35);
        const color = Phaser.Math.RND.pick(colors);
        this.createExplosion(x, y, color);
      });
    }

    this.time.addEvent({
      delay: 3500,
      callback: () => {
        const x = Phaser.Math.Between(100, this.scale.width - 100);
        const y = Phaser.Math.Between(80, this.scale.height * 0.35);
        const color = Phaser.Math.RND.pick(colors);
        this.createExplosion(x, y, color);
      },
      loop: true,
    });
  }

  createExplosion(x, y, color) {
    const particles = [];
    const particleCount = 10;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(3, 7);

      // 像素方块粒子
      const size = Phaser.Math.Between(3, 6);
      const particle = this.add.rectangle(x, y, size, size, color);
      particle.velocityX = Math.cos(angle) * speed;
      particle.velocityY = Math.sin(angle) * speed;
      particle.life = 1.0;

      particles.push(particle);
    }

    const updateParticles = () => {
      let alive = false;
      particles.forEach((p) => {
        if (p.life > 0) {
          p.x += p.velocityX;
          p.y += p.velocityY;
          p.velocityY += 0.15;
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
