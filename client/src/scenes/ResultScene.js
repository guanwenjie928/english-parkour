import Phaser from 'phaser';
import { SoundGenerator } from '../utils/SoundGenerator.js';
import { GHIBLI, drawGlassPanel, PLAYER_COLORS } from '../utils/ColorConfig.js';
import { createFloatingParticles, createSoftButton, popIn, burstParticles, EASE } from '../utils/AnimationHelper.js';

const C = GHIBLI;
const FONT = 'Nunito';
const FONT_CN = 'ZCOOL KuaiLe';

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

    this.createBackground();
    this.createHeader();
    this.createRankingList();
    this.createButtons();
    this.createCelebration();
  }

  createBackground() {
    const { width, height } = this.scale;

    // 天空渐变色条
    const skyColors = [C.ACCENT, 0xb8e0e0, 0xcdd8c8, 0xdde8d0, C.BG_CREAM];
    const bandH = Math.ceil(height / skyColors.length);
    skyColors.forEach((color, i) => {
      this.add.rectangle(width / 2, i * bandH + bandH / 2, width, bandH + 1, color, 0.5);
    });

    // 底部草地
    const grassGfx = this.add.graphics();
    grassGfx.fillStyle(C.GRASS, 0.15);
    grassGfx.fillRoundedRect(-10, height - 40, width + 20, 80, 20);

    // 飘浮花瓣
    createFloatingParticles(this, width, height, {
      count: 8, type: 'petal', depth: 0,
    });

    // 柔和外框
    const borderGfx = this.add.graphics().setDepth(1);
    borderGfx.lineStyle(1, C.ACCENT, 0.3);
    borderGfx.strokeRoundedRect(16, 16, width - 32, height - 32, 12);
  }

  createHeader() {
    const { width, height } = this.scale;

    // 标题卡片
    const cardW = 360;
    const cardH = 70;
    const cardX = (width - cardW) / 2;
    const cardY = height * 0.04;

    const cardGfx = this.add.graphics().setDepth(2);
    drawGlassPanel(cardGfx, cardX, cardY, cardW, cardH, 14, C.BG_CREAM, 0.9, C.ACCENT, 2);

    // "比赛结束!" — 中文主标题
    const titleCn = this.add.text(width / 2, cardY + 26, '比赛结束!', {
      fontSize: '30px',
      fontFamily: FONT_CN,
      color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    // 英文副标题
    this.add.text(width / 2, cardY + 54, 'GAME OVER', {
      fontSize: '11px',
      fontFamily: FONT,
      fontStyle: '600',
      color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(3);

    // 弹性入场
    popIn(this, titleCn, 600);
  }

  createRankingList() {
    const { width, height } = this.scale;
    const startY = height * 0.18;
    const itemH = 56;
    const itemGap = 6;
    const slotW = 540;
    const slotX = (width - slotW) / 2;

    // 奖牌颜色
    const medalStyles = [
      { fill: 0xe6b85c, stroke: 0xc9a04a, label: '1' },  // 金
      { fill: 0xb0b0b0, stroke: 0x909090, label: '2' },  // 银
      { fill: 0xcd7f32, stroke: 0xa06020, label: '3' },  // 铜
    ];

    this.rankings.forEach((player, index) => {
      const y = startY + index * (itemH + itemGap);
      const isMe = player.socketId === window.network?.socket?.id;

      // 排名左边色条
      const rankStyle = medalStyles[index] || null;
      const accentColor = rankStyle ? rankStyle.fill : C.BG_SAND;

      // 卡片背景
      const bgGfx = this.add.graphics().setDepth(2);
      const bgAlpha = isMe ? 0.95 : (index % 2 === 0 ? 0.8 : 0.6);
      bgGfx.fillStyle(C.BG_CREAM, bgAlpha);
      bgGfx.fillRoundedRect(slotX, y, slotW, itemH, 10);

      // 左侧强调色条
      if (rankStyle) {
        bgGfx.fillStyle(rankStyle.fill, 0.9);
        bgGfx.fillRoundedRect(slotX, y + 4, 5, itemH - 8, 3);
      }

      // 柔和边框
      if (isMe) {
        bgGfx.lineStyle(2, C.PRIMARY, 0.6);
        bgGfx.strokeRoundedRect(slotX, y, slotW, itemH, 10);
      }

      // 奖牌 — 圆形（替代方块）
      const medalX = slotX + 36;
      const medalY = y + itemH / 2;
      const medalR = 14;

      if (rankStyle) {
        // 奖牌底色圆
        this.add.circle(medalX, medalY, medalR, rankStyle.fill).setDepth(3);
        this.add.circle(medalX, medalY, medalR, 0, 0).setStrokeStyle(2, rankStyle.stroke, 0.7).setDepth(3);
      } else {
        // 其余排名：柔和灰圆
        this.add.circle(medalX, medalY, medalR, C.BG_SAND).setDepth(3);
        this.add.circle(medalX, medalY, medalR, 0, 0).setStrokeStyle(1, C.TEXT_MUTED, 0.5).setDepth(3);
      }

      // 排名数字
      this.add.text(medalX, medalY, `${index + 1}`, {
        fontSize: '13px',
        fontFamily: FONT,
        fontStyle: '700',
        color: index < 3 ? '#' + C.TEXT_DARK.toString(16).padStart(6, '0') : '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(0.5).setDepth(4);

      // 颜色标识 — 圆形
      const color = PLAYER_COLORS[player.trackNumber - 1] || PLAYER_COLORS[0];
      const dotX = medalX + 32;
      this.add.circle(dotX, medalY, 7, color.tint).setDepth(3);
      this.add.circle(dotX, medalY, 7, 0, 0).setStrokeStyle(1, 0xffffff, 0.5).setDepth(3);

      // 玩家名
      this.add.text(dotX + 16, medalY, player.name, {
        fontSize: '17px',
        fontFamily: FONT_CN,
        color: '#' + C.TEXT_WARM.toString(16).padStart(6, '0'),
      }).setOrigin(0, 0.5).setDepth(3);

      // 进度
      this.add.text(slotX + slotW - 130, medalY, `${player.progress.toFixed(1)}%`, {
        fontSize: '15px',
        fontFamily: FONT,
        fontStyle: '700',
        color: '#' + C.PRIMARY.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0.5).setDepth(3);

      // 正确数
      this.add.text(slotX + slotW - 28, medalY, `${player.correctCount || 0}✓`, {
        fontSize: '12px',
        fontFamily: FONT,
        fontStyle: '600',
        color: '#' + C.TEXT_MUTED.toString(16).padStart(6, '0'),
      }).setOrigin(1, 0.5).setDepth(3);
    });
  }

  createButtons() {
    const { width, height } = this.scale;
    const btnY = height * 0.88;

    // 再来一局
    createSoftButton(this, width / 2 - 120, btnY, 200, 50, '再来一局', C.PRIMARY,
      () => {
        this.soundGenerator.play('click');
        this.scene.start('MenuScene');
      },
      { fontSize: '16px', radius: 12 });

    // 退出
    createSoftButton(this, width / 2 + 120, btnY, 200, 50, '退  出', C.SECONDARY,
      () => {
        this.soundGenerator.play('click');
        window.location.reload();
      },
      { fontSize: '16px', radius: 12 });
  }

  createCelebration() {
    const { width, height } = this.scale;
    const celebrationColors = [C.HIGHLIGHT, C.PRIMARY, C.SUNSET, C.ACCENT, C.SECONDARY];

    // 初始 3 轮密集爆发
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 600, () => {
        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(60, height * 0.30);
        burstParticles(this, x, y, Phaser.Math.RND.pick(celebrationColors), 14);
      });
    }

    // 后续周期性温和爆发
    this.time.addEvent({
      delay: 4000,
      callback: () => {
        const x = Phaser.Math.Between(100, width - 100);
        const y = Phaser.Math.Between(60, height * 0.30);
        burstParticles(this, x, y, Phaser.Math.RND.pick(celebrationColors), 8);
      },
      loop: true,
    });
  }

  shutdown() {
    this.soundGenerator.stopBGM();
  }
}
