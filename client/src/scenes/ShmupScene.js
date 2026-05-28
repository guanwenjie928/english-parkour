// 星露谷风 像素打字射击 — Phaser 场景
// 田园背景 + 像素法师 + 暗影词敌 + 魔法弹
import { SoundGenerator } from '../utils/SoundGenerator.js';

// === 星露谷风格调色板 ===
const SDV = Object.freeze({
  SKY_TOP:     0x6496d6,  // 天空上
  SKY_MID:     0x8db5e6,  // 天空中
  SKY_BOT:     0xd4c8a0,  // 天空下（暖黄）
  CLOUD:       0xf0f0f0,
  CLOUD_SHADOW:0xd8d8e0,
  MOUNTAIN:    0x5a7a4a,  // 远山
  MOUNTAIN_S:  0x80986a,  // 远山雪
  HILL_FAR:    0x6a9e4a,  // 远丘
  HILL_MID:    0x7ab85a,  // 中丘
  GRASS:       0x6ab840,  // 近草地
  GRASS_D:     0x559a30,  // 暗草地
  PATH:        0xc4a060,  // 小路
  TREE_TRUNK:  0x7a5230,  // 树干
  TREE_LEAF:   0x3a8a2a,  // 树叶
  TREE_HIGHLIGHT:0x5aaa3a,// 树高光
  BUSH:        0x4a9030,  // 灌木
  FLOWER:      0xffdd50,  // 小花
  FLOWER2:     0xff7090,  // 粉花
  FENCE_WOOD:  0xb08050,  // 篱笆
  MAGE_ROBE:   0x7050c8,  // 法师袍
  MAGE_DARK:   0x4a2090,  // 法师暗部
  MAGE_HAT:    0x5838b0,  // 法师帽
  MAGE_SKIN:   0xffdbb4,  // 肤色
  MAGE_SKIN_D: 0xe8c8a0,  // 肤色暗
  MAGE_EYE:    0x1a1a2a,  // 眼睛
  STAFF_WOOD:  0xb08040,  // 法杖木质
  STAFF_ORB:   0x80ddff,  // 法杖宝珠
  STAFF_GLOW:  0xa0eeff,  // 法杖光晕
  SHADOW_BODY: 0x2a1a3a,  // 暗影体
  SHADOW_EYE:  0xff4444,  // 暗影眼
  SHADOW_EYE2: 0xff8888,  // 暗影眼亮
  SCROLL:      0xf5e6c8,  // 羊皮纸
  SCROLL_B:    0xc4a08a,  // 羊皮纸边
  SCROLL_WOOD: 0x8a5a30,  // 卷轴木轴
  MAGIC_BALL:  0xffdd55,  // 魔法弹
  MAGIC_TRAIL: 0xffaa30,  // 魔法弹尾
  MAGIC_SPARK: 0xffea80,  // 魔法火花
  HEART_FULL:  0xff4050,  // 红心
  HEART_EMPTY: 0x4a3035,  // 空心
  HUD_PANEL:   0x6b4018,  // HUD木质底
  HUD_BORDER:  0x9a6a38,  // HUD木边
  HUD_GOLD:    0xffc840,  // HUD金色
  INPUT_PAPER: 0xf5eed8,  // 输入羊皮纸
  INPUT_INK:   0x3a2818,  // 输入墨色
  CORRECT:     0x5acc40,  // 正确
  WRONG:       0xff3a3a,  // 错误
  OVERLAY:     0x000000,
});

// 法师像素图 (坐标格: 5x5 unit)
const MAGE_MAP = {
  hat: [
    [0,-8],[1,-8],
    [-2,-7],[-1,-7],[0,-7],[1,-7],[2,-7],
    [-2,-6],[-1,-6],[0,-6],[1,-6],[2,-6],
    [-3,-5],[-2,-5],[-1,-5],[0,-5],[1,-5],[2,-5],[3,-5],
  ],
  face: [
    [-2,-4],[-1,-4],[0,-4],[1,-4],
    [-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],
    [-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],
  ],
  robe: [
    [-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],
    [-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[-4,0],
    [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
    [-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
    [-3,3],[-2,3],[-1,3],[0,3],[1,3],[2,3],[3,3],
    [-2,4],[-1,4],[0,4],[1,4],[2,4],
    [-1,5],[0,5],[1,5],
  ],
  staff: [
    [4,-2],[4,-1],[4,0],[4,1],[4,2],[4,3],[4,4],[4,5],[4,6],
  ],
  orb: [[4,-3]],
};

// 心形像素图案
const HEART_PX = [
  [0,2],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],
  [3,1],[3,2],[3,3],[4,2],
];

// 暗影怪像素 (小史莱姆形状)
const SHADOW_PX = [
  [-2,3],[-1,3],[0,3],[1,3],[2,3],
  [-3,2],[-2,2],[-1,2],[0,2],[1,2],[2,2],[3,2],
  [-3,1],[-2,1],[-1,1],[0,1],[1,1],[2,1],[3,1],
  [-4,0],[-3,0],[-2,0],[-1,0],[0,0],[1,0],[2,0],[3,0],[4,0],
  [-4,-1],[-3,-1],[-2,-1],[-1,-1],[0,-1],[1,-1],[2,-1],[3,-1],[4,-1],
  [-3,-2],[-2,-2],[-1,-2],[0,-2],[1,-2],[2,-2],[3,-2],
  [-2,-3],[-1,-3],[0,-3],[1,-3],[2,-3],
];

export class ShmupScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShmupScene' });
    this.enemySprites = new Map();
    this.bullets = [];
    this.clouds = [];
    this._lastPositionSync = null;
    this.inputText = '';
    this.comboCount = 0;
    this.gameStarted = false;
  }

  init(data) {
    this.roomCode = data?.code || 'SOLO';
  }

  create() {
    const { width: w, height: h } = this.scale;
    this.soundGenerator = SoundGenerator.get();
    this.soundGenerator.stopBGM();

    // 1. 天空渐变
    this._createSky(w, h);
    // 2. 云朵
    this._createClouds(w, h);
    // 3. 远山
    this._createMountains(w, h);
    // 4. 丘陵
    this._createHills(w, h);
    // 5. 草地
    this._createGrassland(w, h);
    // 6. 装饰（树、栅栏、花）
    this._createDecorations(w, h);
    // 7. 玩家法师
    this._createMage(w, h);
    // 8. HUD
    this._createHUD(w, h);
    // 9. 输入栏
    this._createInputBar(w, h);
    // 10. 引擎事件
    this._setupListeners(w, h);
    // 11. 键盘
    this._setupKeyboard();
    // 12. 循环
    this.time.addEvent({ delay: 16, callback: this._updateLoop, callbackScope: this, loop: true });

    window.network.start();
  }

  // ================================================================
  //  背景 — 天空渐变
  // ================================================================
  _createSky(w, h) {
    const gfx = this.add.graphics().setDepth(0);
    const steps = 40;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Phaser.Math.Linear(SDV.SKY_TOP >> 16 & 0xff, SDV.SKY_BOT >> 16 & 0xff, t);
      const g = Phaser.Math.Linear(SDV.SKY_TOP >> 8 & 0xff, SDV.SKY_BOT >> 8 & 0xff, t);
      const b = Phaser.Math.Linear(SDV.SKY_TOP & 0xff, SDV.SKY_BOT & 0xff, t);
      const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
      gfx.fillStyle(color);
      gfx.fillRect(0, (h * 0.55) * t, w, Math.ceil(h * 0.55 / steps) + 1);
    }
  }

  // ================================================================
  //  背景 — 像素云朵（视差慢速）
  // ================================================================
  _createClouds(w, h) {
    this.clouds = [];
    const cloudDraw = (cx, cy, s) => {
      const gfx = this.add.graphics().setDepth(1);
      const drawCloud = (ox, oy) => {
        // 像素云朵（4列块状）
        const parts = [
          [0,0],[1,-1],[2,-1],[3,0],[4,0],
          [0,1],[1,1],[2,1],[3,1],[4,1],
          [1,2],[2,2],[3,2],
        ];
        for (const [dx, dy] of parts) {
          gfx.fillStyle(dy < 1 ? SDV.CLOUD : SDV.CLOUD_SHADOW, 0.85);
          gfx.fillRect(ox + dx * s, oy + dy * s, s - 1, s - 1);
        }
      };
      drawCloud(cx, cy);
      return { gfx, x: cx, y: cy, speed: 0.08 + Math.random() * 0.12 };
    };

    for (let i = 0; i < 8; i++) {
      this.clouds.push(cloudDraw(
        Math.random() * w * 1.5,
        h * 0.04 + Math.random() * h * 0.22,
        2 + Math.floor(Math.random() * 4),
      ));
    }
  }

  // ================================================================
  //  背景 — 远山（带雪顶）
  // ================================================================
  _createMountains(w, h) {
    const gfx = this.add.graphics().setDepth(2);
    const baseY = h * 0.52;

    // 山脉轮廓
    const peaks = [
      [0, 0.55], [0.08, 0.32], [0.12, 0.38], [0.18, 0.28], [0.22, 0.35],
      [0.28, 0.25], [0.32, 0.30], [0.38, 0.42], [0.45, 0.20], [0.50, 0.33],
      [0.55, 0.28], [0.62, 0.38], [0.68, 0.22], [0.72, 0.35], [0.78, 0.30],
      [0.84, 0.40], [0.90, 0.26], [0.94, 0.34], [1.0, 0.45],
    ];

    // 最远的山（浅色）
    for (const [rx, ry] of peaks) {
      const px = rx * w;
      const py = baseY + ry * h * 0.25;
      gfx.fillStyle(SDV.MOUNTAIN_S);
      gfx.fillTriangle(px - w * 0.06, baseY + h * 0.15, px + w * 0.06, baseY + h * 0.15, px, py);
    }

    // 雪顶
    for (const [rx, ry] of peaks) {
      if (ry > 0.35) continue;
      const px = rx * w;
      const py = baseY + ry * h * 0.25;
      gfx.fillStyle(0xf0f0f0, 0.7);
      gfx.fillTriangle(px - w * 0.02, py + h * 0.03, px + w * 0.02, py + h * 0.03, px, py);
    }

    // 前景山（深色）
    for (const [rx, ry] of peaks) {
      const px = rx * w + w * 0.03;
      const py = baseY + ry * h * 0.22 + h * 0.05;
      gfx.fillStyle(SDV.MOUNTAIN);
      gfx.fillTriangle(px - w * 0.05, baseY + h * 0.14, px + w * 0.05, baseY + h * 0.14, px, py);
    }
  }

  // ================================================================
  //  背景 — 丘陵
  // ================================================================
  _createHills(w, h) {
    const gfx = this.add.graphics().setDepth(3);
    const baseY = h * 0.58;

    // 远丘
    gfx.fillStyle(SDV.HILL_FAR, 0.85);
    for (let x = 0; x < w; x += w / 6) {
      gfx.fillEllipse(x, baseY + 12, w / 4 + Phaser.Math.Between(-20, 20), 40 + Phaser.Math.Between(-10, 10));
    }

    // 中丘
    gfx.fillStyle(SDV.HILL_MID, 0.9);
    const baseY2 = h * 0.63;
    for (let x = w / 10; x < w; x += w / 5) {
      gfx.fillEllipse(x, baseY2 + 8, w / 4.5 + Phaser.Math.Between(-15, 25), 30 + Phaser.Math.Between(-5, 15));
    }
  }

  // ================================================================
  //  背景 — 草地 + 小路
  // ================================================================
  _createGrassland(w, h) {
    const gfx = this.add.graphics().setDepth(4);
    const gy = h * 0.64;

    // 主草地
    gfx.fillStyle(SDV.GRASS);
    gfx.fillRect(0, gy, w, h - gy);

    // 草纹层次
    gfx.fillStyle(SDV.GRASS_D, 0.3);
    for (let x = 0; x < w; x += 20 + Math.floor(Math.random() * 15)) {
      const ry = gy + Math.random() * 30;
      gfx.fillRect(x, ry, 8 + Math.random() * 12, 2);
    }

    // 小路（从左边中间到中央）
    const pathY = h * 0.78;
    gfx.fillStyle(SDV.PATH, 0.5);
    gfx.fillEllipse(w * 0.08, pathY, w * 0.2, 16);
    gfx.fillEllipse(w * 0.22, pathY + 4, w * 0.18, 14);
    gfx.fillEllipse(w * 0.38, pathY + 6, w * 0.15, 12);

    // 地面小草丛点缀
    for (let i = 0; i < 25; i++) {
      const gx = Math.random() * w;
      const gy2 = h * 0.66 + Math.random() * (h - h * 0.66);
      gfx.fillStyle(SDV.GRASS_D, 0.5);
      gfx.fillRect(gx, gy2, 2 + Math.random() * 3, 3 + Math.random() * 5);
    }
  }

  // ================================================================
  //  背景 — 装饰（树、栅栏、花）
  // ================================================================
  _createDecorations(w, h) {
    const gfx = this.add.graphics().setDepth(5);
    const gy = h * 0.61;

    // 画一棵像素小树
    const drawTree = (tx, ty, s) => {
      // 树干
      gfx.fillStyle(SDV.TREE_TRUNK);
      gfx.fillRect(tx - s * 1, ty, s * 2, s * 8);
      // 树叶（三层三角 + 圆顶）
      gfx.fillStyle(SDV.TREE_LEAF);
      for (let row = 0; row < 5; row++) {
        const rw = 7 - row;
        const ry = ty - s * (2 + row);
        gfx.fillRect(tx - s * rw / 2, ry, s * rw, s);
      }
      // 高光
      gfx.fillStyle(SDV.TREE_HIGHLIGHT, 0.6);
      for (let row = 0; row < 3; row++) {
        const ry = ty - s * (2 + row);
        gfx.fillRect(tx - s * 0.5, ry, s * 1.5, s);
      }
    };

    // 右边远处几棵树
    drawTree(w * 0.78, gy - 14, 3.5);
    drawTree(w * 0.88, gy - 10, 3);
    drawTree(w * 0.95, gy - 16, 3.8);

    // 左边小灌木
    const drawBush = (bx, by, ss) => {
      gfx.fillStyle(SDV.BUSH);
      gfx.fillEllipse(bx, by, ss * 8, ss * 5);
      gfx.fillStyle(SDV.BUSH, 0.7);
      gfx.fillEllipse(bx + ss * 1.5, by - ss * 0.5, ss * 5, ss * 3.5);
    };
    drawBush(w * 0.04, h * 0.67, 2.5);
    drawBush(w * 0.14, h * 0.68, 2);

    // 小花
    for (let i = 0; i < 15; i++) {
      const fx = Math.random() * w * 0.75;
      const fy = h * 0.66 + Math.random() * (h - h * 0.66);
      const fc = Math.random() < 0.5 ? SDV.FLOWER : SDV.FLOWER2;
      // 茎
      gfx.fillStyle(SDV.GRASS_D, 0.4);
      gfx.fillRect(fx, fy - 3, 1, 4);
      // 花瓣（十字像素）
      gfx.fillStyle(fc);
      gfx.fillRect(fx - 1, fy - 4, 3, 3);
    }

    // 小栅栏
    gfx.fillStyle(SDV.FENCE_WOOD);
    for (let i = 0; i < 4; i++) {
      const fx = w * 0.03 + i * w * 0.05;
      const fy = h * 0.705 + (i % 2) * 3;
      gfx.fillRect(fx, fy, 3, 12);
      gfx.fillRect(fx - 4, fy + 1, 10, 2);
    }
  }

  // ================================================================
  //  玩家 — 像素法师
  // ================================================================
  _createMage(w, h) {
    this.mageX = w * 0.14;
    this.mageY = h * 0.72;
    const s = Math.max(3, Math.min(5, w * 0.0045)); // 像素单元

    const gfx = this.add.graphics().setDepth(20);
    const px = this.mageX;
    const py = this.mageY;

    const drawMage = (ox, oy, alpha = 1) => {
      // 影子
      gfx.fillStyle(SDV.OVERLAY, 0.2 * alpha);
      gfx.fillEllipse(ox, oy + s * 6, s * 9, s * 2);

      // 法杖（画在角色后面）
      gfx.fillStyle(SDV.STAFF_WOOD, alpha);
      gfx.fillRect(ox + s * 4, oy - s * 2, s, s * 9);

      // 袍子
      const robeColors = [SDV.MAGE_ROBE, SDV.MAGE_DARK, SDV.MAGE_ROBE];
      for (const [dx, dy] of MAGE_MAP.robe) {
        const colorIdx = dy < 0 ? 0 : (dy >= 3 ? 2 : 1);
        gfx.fillStyle(robeColors[colorIdx], alpha);
        gfx.fillRect(ox + dx * s, oy + dy * s, s - 0.5, s - 0.5);
      }

      // 脸部
      for (const [dx, dy] of MAGE_MAP.face) {
        gfx.fillStyle(SDV.MAGE_SKIN, alpha);
        gfx.fillRect(ox + dx * s, oy + dy * s, s - 0.5, s - 0.5);
      }

      // 眼睛
      gfx.fillStyle(SDV.MAGE_EYE, alpha);
      gfx.fillRect(ox + s * (-1), oy - s * 3.5, s * 0.6, s * 0.8);
      gfx.fillRect(ox + s * 1.2, oy - s * 3.5, s * 0.6, s * 0.8);

      // 帽子
      for (const [dx, dy] of MAGE_MAP.hat) {
        gfx.fillStyle(SDV.MAGE_HAT, alpha);
        gfx.fillRect(ox + dx * s, oy + dy * s, s - 0.5, s - 0.5);
      }

      // 法杖宝珠
      gfx.fillStyle(SDV.STAFF_ORB, alpha);
      gfx.fillRect(ox + s * 4, oy - s * 3, s, s);
      gfx.fillStyle(SDV.STAFF_GLOW, alpha * 0.6);
      gfx.fillRect(ox + s * 3.5, oy - s * 3.5, s * 2, s * 2);
    };

    drawMage(px, py, 1);
    this._mageGfx = gfx;
    this._mageDrawFn = drawMage;
    this._mageScale = s;

    // 待机呼吸动画
    this._mageBob = 0;
  }

  // ================================================================
  //  HUD — 木质面板
  // ================================================================
  _createHUD(w, h) {
    const hudY = 6;
    const hudH = 52;
    const pad = 10;

    // HUD 木质背景
    const gfx = this.add.graphics().setDepth(200);
    // 深木框
    gfx.fillStyle(SDV.HUD_PANEL, 0.92);
    gfx.fillRoundedRect(pad, hudY, w - pad * 2, hudH, 4);
    // 浅木内框
    gfx.fillStyle(SDV.HUD_BORDER, 0.8);
    gfx.fillRoundedRect(pad + 2, hudY + 2, w - pad * 2 - 4, hudH - 4, 3);
    // 深木内芯
    gfx.fillStyle(SDV.HUD_PANEL, 0.9);
    gfx.fillRoundedRect(pad + 3, hudY + 3, w - pad * 2 - 6, hudH - 6, 2);
    // 顶边高光
    gfx.fillStyle(0xffffff, 0.15);
    gfx.fillRoundedRect(pad + 4, hudY + 4, w - pad * 2 - 8, 2, 1);

    this._hudY = hudY;
    this._hudH = hudH;

    // HP 心
    this.hpHearts = [];
    this._hpGfx = this.add.graphics().setDepth(201);
    const heartY = hudY + hudH / 2;
    for (let i = 0; i < 5; i++) {
      this.hpHearts.push({ x: pad + 20 + i * 28, y: heartY });
    }
    this._drawHearts(5);

    // 分数 — 金色
    const fontSize = Math.max(12, Math.min(17, w * 0.016));
    this.scoreText = this.add.text(w / 2, heartY, '0', {
      fontSize: `${fontSize}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color: '#ffc840',
    }).setOrigin(0.5).setDepth(201);

    // 波次
    this.waveText = this.add.text(w / 2, heartY + fontSize * 1.1, 'WAVE 1', {
      fontSize: `${fontSize * 0.7}px`,
      fontFamily: 'Nunito',
      fontStyle: '700',
      color: '#c4a070',
    }).setOrigin(0.5, 0).setDepth(201);

    // 连击
    this.comboText = this.add.text(w - pad - 16, heartY, '', {
      fontSize: `${fontSize * 1.1}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color: '#ffa030',
    }).setOrigin(1, 0.5).setDepth(201);

    // 时间
    this.timerText = this.add.text(w - pad - 16, heartY + fontSize * 1.1, '', {
      fontSize: `${fontSize * 0.7}px`,
      fontFamily: 'Nunito',
      fontStyle: '600',
      color: '#a08060',
    }).setOrigin(1, 0).setDepth(201);
  }

  _drawHearts(current) {
    this._hpGfx.clear();
    const s = 3;
    for (let i = 0; i < 5; i++) {
      const hx = this.hpHearts[i].x;
      const hy = this.hpHearts[i].y;
      const isFull = i < current;
      for (const [dx, dy] of HEART_PX) {
        const c = isFull ? SDV.HEART_FULL : SDV.HEART_EMPTY;
        this._hpGfx.fillStyle(c, isFull ? 1 : 0.45);
        this._hpGfx.fillRect(hx + dx * s - 8, hy + dy * s - 6, s - 0.5, s - 0.5);
      }
    }
  }

  // ================================================================
  //  底部输入栏 — 羊皮纸风格
  // ================================================================
  _createInputBar(w, h) {
    const barH = 52;
    const barY = h - barH;
    const fontSize = Math.max(13, Math.min(18, w * 0.017));

    const gfx = this.add.graphics().setDepth(200);
    // 羊皮纸
    gfx.fillStyle(SDV.INPUT_PAPER);
    gfx.fillRect(0, barY, w, barH);
    // 顶部木条
    gfx.fillStyle(SDV.HUD_BORDER);
    gfx.fillRect(0, barY, w, 3);
    gfx.fillStyle(SDV.FENCE_WOOD, 0.5);
    gfx.fillRect(0, barY + 3, w, 1);
    // 纸纹
    gfx.fillStyle(0x000000, 0.03);
    for (let x = 0; x < w; x += 8) {
      gfx.fillRect(x, barY + 8, 1, barH - 12);
    }

    this.add.text(18, barY + barH / 2, '✨', {
      fontSize: `${fontSize}px`,
    }).setOrigin(0, 0.5).setDepth(201);

    this.inputDisplay = this.add.text(40, barY + barH / 2, '', {
      fontSize: `${fontSize}px`,
      fontFamily: 'Nunito',
      fontStyle: '700',
      color: '#3a2818',
    }).setOrigin(0, 0.5).setDepth(201);

    this.inputHint = this.add.text(w - 16, barY + barH / 2, '输入单词后 Enter', {
      fontSize: `${fontSize * 0.65}px`,
      fontFamily: 'ZCOOL KuaiLe',
      color: '#b0a080',
    }).setOrigin(1, 0.5).setDepth(201);
  }

  // ================================================================
  //  引擎事件
  // ================================================================
  _setupListeners(w, h) {
    const engine = window.network;

    engine.on('countdown', (d) => this._showCountdown(d.count, w, h));
    engine.on('game_start', (d) => {
      this.gameStarted = true;
      this._drawHearts(d.hp);
      this.scoreText.setText('0');
      this.waveText.setText('WAVE 1');
    });
    engine.on('wave_start', (d) => {
      this.waveText.setText(`WAVE ${d.wave}`);
      this._showWaveAnnounce(d.wave, w, h);
    });
    engine.on('enemy_spawn', (enemy) => this._createEnemySprite(enemy, w, h));
    engine.on('position_sync', (d) => {
      this._lastPositionSync = d;
      this._syncEnemies(d.enemies, w, h);
      this._drawHearts(d.hp);
      this.scoreText.setText(String(d.score));
      this.timerText.setText(this._fmtTime(d.elapsed));
      if (d.combo >= 3) {
        this.comboText.setText(`COMBO x${d.combo}`);
        this.comboText.setAlpha(1);
      } else {
        this.comboText.setAlpha(0);
      }
      this.comboCount = d.combo;
    });
    engine.on('answer_result', (d) => {
      d.correct ? this._onCorrect(d, w, h) : this._onWrong(w, h);
    });
    engine.on('enemy_hit_player', (d) => this._onEnemyHit(d, w, h));
    engine.on('game_end', (d) => this._onGameEnd(d, w, h));
  }

  // ================================================================
  //  词敌精灵 — 暗影怪 + 头顶卷轴
  // ================================================================
  _createEnemySprite(enemy, w, h) {
    const ex = w * (enemy.x / 100);
    const ey = h * 0.55 + Math.random() * h * 0.33;
    const fs = Math.max(9, Math.min(14, w * 0.013));
    const s = Math.max(2, Math.min(4, w * 0.0035)); // 暗影体像素单元

    // 暗影体
    const shadowGfx = this.add.graphics().setDepth(15);
    const drawShadow = (ox, oy, alpha = 1) => {
      shadowGfx.clear();
      for (const [dx, dy] of SHADOW_PX) {
        shadowGfx.fillStyle(SDV.SHADOW_BODY, alpha);
        shadowGfx.fillRect(ox + dx * s, oy + dy * s, s - 0.5, s - 0.5);
      }
      // 眼睛
      shadowGfx.fillStyle(SDV.SHADOW_EYE, alpha);
      shadowGfx.fillRect(ox - s * 1.5, oy - s * 1.5, s * 1.2, s * 1.2);
      shadowGfx.fillRect(ox + s * 0.8, oy - s * 1.5, s * 1.2, s * 1.2);
      // 瞳孔
      shadowGfx.fillStyle(SDV.SHADOW_EYE2, alpha * 0.8);
      shadowGfx.fillRect(ox - s * 1, oy - s * 1, s * 0.7, s * 0.6);
      shadowGfx.fillRect(ox + s * 1.2, oy - s * 1, s * 0.7, s * 0.6);
    };
    drawShadow(ex, ey + s * 0, 1);

    // 羊皮纸卷轴（单词标签）
    const txtW = Math.max(70, enemy.word.length * fs * 0.7 + 24);
    const txtH = 36;
    const scrollY = ey - s * 4 - txtH / 2;

    const scrollGfx = this.add.graphics().setDepth(16);
    const drawScroll = (ox, oy, aw, ah) => {
      scrollGfx.clear();
      // 纸面
      scrollGfx.fillStyle(SDV.SCROLL, 0.95);
      scrollGfx.fillRoundedRect(ox - aw / 2, oy - ah / 2, aw, ah, 4);
      // 边框
      scrollGfx.lineStyle(1, SDV.SCROLL_B, 0.8);
      scrollGfx.strokeRoundedRect(ox - aw / 2, oy - ah / 2, aw, ah, 4);
      // 卷轴木轴（上下）
      scrollGfx.fillStyle(SDV.SCROLL_WOOD);
      scrollGfx.fillRect(ox - aw / 2 - 2, oy - ah / 2 - 2, aw + 4, 4);
      scrollGfx.fillRect(ox - aw / 2 - 2, oy + ah / 2 - 2, aw + 4, 4);
    };
    drawScroll(ex, scrollY, txtW, txtH);

    // 单词文字
    const wordText = this.add.text(ex, scrollY - 6, enemy.word.toUpperCase(), {
      fontSize: `${fs}px`,
      fontFamily: 'Nunito',
      fontStyle: '800',
      color: '#3a2020',
    }).setOrigin(0.5).setDepth(17);

    // 中文释义
    const meaningText = this.add.text(ex, scrollY + 10, enemy.meaning, {
      fontSize: `${fs * 0.75}px`,
      fontFamily: 'ZCOOL KuaiLe',
      color: '#6a4a3a',
    }).setOrigin(0.5).setDepth(17);

    this.enemySprites.set(enemy.id, {
      shadowGfx, drawShadow,
      scrollGfx, drawScroll,
      wordText, meaningText,
      baseY: ey, scrollY, txtW, txtH,
      shadowScale: s,
    });
  }

  // ================================================================
  //  同步敌人位置
  // ================================================================
  _syncEnemies(enemies, w, h) {
    for (const e of enemies) {
      let sprite = this.enemySprites.get(e.id);
      if (!sprite) {
        this._createEnemySprite(e, w, h);
        sprite = this.enemySprites.get(e.id);
        if (!sprite) continue;
      }
      const sx = w * (e.x / 100);
      sprite.wordText.x = sx;
      sprite.meaningText.x = sx;
      sprite.drawShadow(sx, sprite.baseY);
      sprite.drawScroll(sx, sprite.scrollY, sprite.txtW, sprite.txtH);
    }

    // 清理死亡敌人
    const activeIds = new Set(enemies.map((e) => e.id));
    for (const [id, sp] of this.enemySprites) {
      if (!activeIds.has(id)) {
        sp.shadowGfx.destroy();
        sp.scrollGfx.destroy();
        sp.wordText.destroy();
        sp.meaningText.destroy();
        this.enemySprites.delete(id);
      }
    }
  }

  // ================================================================
  //  正确 — 魔法弹 + 爆炸
  // ================================================================
  _onCorrect(data, w, h) {
    const enemy = data.enemy;
    const sp = this.enemySprites.get(enemy.id);
    this.soundGenerator.play('correct');

    if (sp) {
      const ex = sp.wordText.x;
      const ey = sp.baseY;
      // 从法杖宝珠发射魔法弹
      const staffX = this.mageX + this._mageScale * 4;
      const staffY = this.mageY - this._mageScale * 3;
      this._createMagicBolt(staffX, staffY, ex, ey, () => {
        this._createMagicBurst(ex, ey);
        this._showScorePopup(ex, ey - 20, data.combo);
      });

      // 敌人消散
      this.tweens.add({
        targets: [sp.wordText, sp.meaningText, sp.shadowGfx, sp.scrollGfx],
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 200,
        onComplete: () => {
          sp.shadowGfx.destroy();
          sp.scrollGfx.destroy();
          sp.wordText.destroy();
          sp.meaningText.destroy();
          this.enemySprites.delete(enemy.id);
        },
      });
    }
  }

  // ================================================================
  //  错误反馈
  // ================================================================
  _onWrong(w, h) {
    this.soundGenerator.play('wrong');
    this.cameras.main.shake(180, 0.004);
    const flash = this.add.rectangle(w / 2, h / 2, w, h, SDV.WRONG, 0.12).setDepth(400);
    this.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
    this.comboCount = 0;
  }

  // ================================================================
  //  敌人到达左侧 — 受伤
  // ================================================================
  _onEnemyHit(data, w, h) {
    const sp = this.enemySprites.get(data.enemy.id);
    this.soundGenerator.play('wrong');
    if (sp) {
      this._createMagicBurst(sp.wordText.x, sp.baseY, true);
      sp.shadowGfx.destroy();
      sp.scrollGfx.destroy();
      sp.wordText.destroy();
      sp.meaningText.destroy();
      this.enemySprites.delete(data.enemy.id);
    }
    this.cameras.main.shake(250, 0.006);
    const flash = this.add.rectangle(w / 2, h / 2, w, h, SDV.WRONG, 0.15).setDepth(400);
    this.tweens.add({ targets: flash, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    this._drawHearts(data.hp);
  }

  // ================================================================
  //  游戏结束
  // ================================================================
  _onGameEnd(data, w, h) {
    this.gameStarted = false;

    // 遮罩
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, SDV.OVERLAY, 0)
      .setDepth(290);
    this.tweens.add({ targets: overlay, alpha: 0.55, duration: 500 });

    // GAME OVER
    const goText = this.add.text(w / 2, h * 0.28, 'GAME OVER', {
      fontSize: `${Math.max(32, h * 0.06)}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color: '#ff5a4a',
      stroke: '#2a1010',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({
      targets: goText, alpha: 1,
      scaleX: { from: 2.5, to: 1 },
      scaleY: { from: 2.5, to: 1 },
      duration: 500, ease: 'Back.easeOut',
    });

    // 统计（羊皮纸面板）
    const statsY = h * 0.43;
    const panelW = Math.min(300, w * 0.7);
    const panelH = 140;
    const gfx = this.add.graphics().setDepth(300).setAlpha(0);
    gfx.fillStyle(SDV.INPUT_PAPER, 0.95);
    gfx.fillRoundedRect(w / 2 - panelW / 2, statsY, panelW, panelH, 6);
    gfx.lineStyle(2, SDV.SCROLL_B, 0.7);
    gfx.strokeRoundedRect(w / 2 - panelW / 2, statsY, panelW, panelH, 6);

    this.tweens.add({ targets: gfx, alpha: 1, duration: 400, delay: 300 });

    const stats = [
      `分数: ${data.score}`,
      `最大连击: ${data.combo}`,
      `消灭词敌: ${data.destroyed}`,
      `到达波次: ${data.wave}`,
    ];
    stats.forEach((text, i) => {
      const st = this.add.text(w / 2, statsY + 30 + i * 26, text, {
        fontSize: `${Math.max(13, w * 0.016)}px`,
        fontFamily: 'Nunito',
        fontStyle: '700',
        color: '#3a2818',
      }).setOrigin(0.5).setDepth(301).setAlpha(0);
      this.tweens.add({ targets: st, alpha: 1, duration: 300, delay: 700 + i * 120 });
    });

    // 再来一次按钮
    const btnY = statsY + panelH + 30;
    const btnW = 200;
    const btnH = 44;
    const btnGfx = this.add.graphics().setDepth(300).setAlpha(0);
    btnGfx.fillStyle(SDV.HUD_BORDER);
    btnGfx.fillRoundedRect(w / 2 - btnW / 2, btnY, btnW, btnH, 4);
    btnGfx.fillStyle(SDV.HUD_GOLD);
    btnGfx.fillRoundedRect(w / 2 - btnW / 2 + 2, btnY + 2, btnW - 4, btnH - 4, 3);
    const btnText = this.add.text(w / 2, btnY + btnH / 2, '再来一局', {
      fontSize: '16px',
      fontFamily: 'ZCOOL KuaiLe',
      fontStyle: '700',
      color: '#3a2010',
    }).setOrigin(0.5).setDepth(301).setAlpha(0);

    this.tweens.add({ targets: [btnGfx, btnText], alpha: 1, duration: 400, delay: 1300 });

    const hit = this.add.rectangle(w / 2, btnY + btnH / 2, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(302);
    hit.on('pointerdown', () => this._restart());
  }

  _restart() {
    for (const [, sp] of this.enemySprites) {
      sp.shadowGfx?.destroy();
      sp.scrollGfx?.destroy();
      sp.wordText?.destroy();
      sp.meaningText?.destroy();
    }
    this.enemySprites.clear();
    this.bullets = [];
    this.inputText = '';
    this.inputDisplay.setText('');
    this.comboCount = 0;
    this.gameStarted = false;
    this.scene.restart();
  }

  // ================================================================
  //  魔法弹（带拖尾粒子）
  // ================================================================
  _createMagicBolt(fromX, fromY, toX, toY, onHit) {
    const gfx = this.add.graphics().setDepth(25);
    const bolt = { gfx, x: fromX, y: toY, toX, toY, onHit, alive: true, trail: [] };
    this.bullets.push(bolt);
    this.soundGenerator.play('click');
  }

  _updateBullets() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.alive) {
        b.gfx.destroy();
        this.bullets.splice(i, 1);
        continue;
      }
      const dx = b.toX - b.x;
      const dy = b.toY - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 7;
      if (dist < speed) {
        b.alive = false;
        b.gfx.clear();
        if (b.onHit) b.onHit();
      } else {
        b.x += (dx / dist) * speed;
        b.y += (dy / dist) * speed;
        b.gfx.clear();
        // 拖尾
        b.gfx.fillStyle(SDV.MAGIC_TRAIL, 0.5);
        b.gfx.fillCircle(b.x - (dx / dist) * 5, b.y - (dy / dist) * 5, 3);
        // 主体
        b.gfx.fillStyle(SDV.MAGIC_BALL);
        b.gfx.fillCircle(b.x, b.y, 4);
        // 核心
        b.gfx.fillStyle(0xffffff, 0.8);
        b.gfx.fillCircle(b.x, b.y, 2);
      }
    }
  }

  // ================================================================
  //  魔法爆炸（星形粒子）
  // ================================================================
  _createMagicBurst(x, y, isDamage = false) {
    const color = isDamage ? SDV.WRONG : SDV.MAGIC_SPARK;
    const count = isDamage ? 10 : 20;
    const gfx = this.add.graphics().setDepth(30);
    const particles = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1 + Math.floor(Math.random() * 3),
        life: 0.3 + Math.random() * 0.4,
        alpha: 1,
      });
    }
    const update = () => {
      gfx.clear();
      let alive = false;
      for (const p of particles) {
        if (p.life > 0) {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.life -= 0.025;
          p.alpha = p.life;
          gfx.fillStyle(color, p.alpha);
          gfx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
          alive = true;
        }
      }
      if (alive) this.time.delayedCall(16, update);
      else gfx.destroy();
    };
    update();
  }

  // ================================================================
  //  分数弹出
  // ================================================================
  _showScorePopup(x, y, combo) {
    const points = 100 + (combo > 1 ? Math.min(combo - 1, 10) * 20 : 0);
    const isCombo = combo >= 3;
    const color = isCombo ? '#ffa030' : '#5acc40';
    const size = isCombo ? '18px' : '14px';
    const text = this.add.text(x, y, `+${points}`, {
      fontSize: size,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color,
      stroke: '#2a1a08',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(250);
    this.tweens.add({
      targets: text, y: y - 50, alpha: 0,
      duration: 700, ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  // ================================================================
  //  波次公告
  // ================================================================
  _showWaveAnnounce(wave, w, h) {
    const text = this.add.text(w / 2, h * 0.32, `— 第 ${wave} 波 —`, {
      fontSize: `${Math.max(24, h * 0.045)}px`,
      fontFamily: 'ZCOOL KuaiLe',
      fontStyle: '700',
      color: '#f5e6c8',
      stroke: '#3a2818',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(250).setAlpha(0);
    this.tweens.add({
      targets: text, alpha: 1,
      scaleX: { from: 1.4, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: 300, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text, alpha: 0, y: text.y - 25,
          duration: 500, delay: 700, ease: 'Cubic.easeIn',
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  // ================================================================
  //  倒计时
  // ================================================================
  _showCountdown(count, w, h) {
    const size = Math.max(70, Math.min(130, h * 0.16));
    const text = count === 0 ? 'GO!' : String(count);
    const color = count === 0 ? '#5acc40' : (count <= 2 ? '#ff5a4a' : '#ffc840');
    const overlay = this.add.text(w / 2, h / 2, text, {
      fontSize: `${size}px`,
      fontFamily: 'Nunito',
      fontStyle: '900',
      color,
      stroke: '#2a1a08',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(300).setScale(2).setAlpha(0);
    this.tweens.add({
      targets: overlay, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 200, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: overlay, scaleX: 1.5, scaleY: 1.5, alpha: 0,
          duration: 450, delay: 100, ease: 'Cubic.easeIn',
          onComplete: () => overlay.destroy(),
        });
      },
    });
    this.soundGenerator.play(count === 0 ? 'victory' : 'countdown');
  }

  // ================================================================
  //  键盘
  // ================================================================
  _setupKeyboard() {
    this.input.keyboard.on('keydown', (event) => {
      if (!this.gameStarted) return;
      if (event.key === 'Enter') { this._fireWord(); return; }
      if (event.key === 'Backspace') {
        this.inputText = this.inputText.slice(0, -1);
        this.inputDisplay.setText(this.inputText);
        this.soundGenerator.play('click');
        return;
      }
      if (event.key === 'Escape') {
        this.inputText = '';
        this.inputDisplay.setText('');
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key) && event.key.length === 1) {
        if (this.inputText.length < 25) {
          this.inputText += event.key.toLowerCase();
          this.inputDisplay.setText(this.inputText);
          this.soundGenerator.play('click');
        }
      }
    });
  }

  _fireWord() {
    if (!this.inputText.trim() || !this.gameStarted) return;
    const result = window.network.submitAnswer(this.inputText.trim());
    this.inputText = '';
    this.inputDisplay.setText('');

    const { width: w, height: h } = this.scale;
    const barH = 52;
    const barY = h - barH;
    const color = result.correct ? SDV.CORRECT : (result.ok ? SDV.WRONG : 0xffffff);
    const flash = this.add.rectangle(w / 2, barY + barH / 2, w, barH, color, 0.12).setDepth(199);
    this.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
  }

  // ================================================================
  //  主循环
  // ================================================================
  _updateLoop() {
    const { width: w } = this.scale;

    // 云朵漂移
    for (const c of this.clouds) {
      c.x -= c.speed;
      if (c.x < -60) c.x = w + 60;
      c.gfx.x = c.x;
    }

    // 法师呼吸动画
    this._mageBob += 0.03;
    const bob = Math.sin(this._mageBob) * 1.5;
    this._mageGfx.clear();
    this._mageDrawFn(this.mageX, this.mageY + bob, 1);

    // 子弹更新
    this._updateBullets();
  }

  _fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  shutdown() {
    this.soundGenerator?.stopBGM();
  }
}
