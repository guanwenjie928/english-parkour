// === 吉卜力治愈调色板（Ghibli Healing Theme）===
// 设计理念：宫崎骏手绘风格的温暖自然美学
// 替代 8-bit 像素暗棕复古风

export const GHIBLI = Object.freeze({
  // 背景色系 — 温暖渐变层次
  BG_CREAM:   0xfefae0,  // 奶油白（主背景）
  BG_SAND:    0xfaedcd,  // 暖沙色（次级背景）
  BG_WARM:    0xf2cc8f,  // 柔和蜂蜜（卡片底色）
  BG_CLOUD:   0xe9edc9,  // 云朵白绿

  // 主题色 — 吉卜力自然色
  PRIMARY:    0x6a994e,  // 治愈绿（主按钮/正确/草地）
  SECONDARY:  0x457b9d,  // 柔和蓝灰（次级按钮）
  ACCENT:     0xa8dadc,  // 天空蓝（装饰/高亮边框）
  HIGHLIGHT:  0xe6b85c,  // 温暖蜂蜜金（重点标记/排名第一）

  // 文字色
  TEXT_DARK:  0x3d5a40,  // 深森林绿（主文字）
  TEXT_WARM:  0x5c3d2e,  // 暖棕（次要文字）
  TEXT_MUTED: 0x8b9a8b,  // 柔和灰绿（提示文字）

  // 状态色
  SUCCESS:    0x6a994e,  // 治愈绿
  ERROR:      0xe63946,  // 柔和暖红
  WARNING:    0xe6b85c,  // 蜂蜜金

  // 天空/自然
  SKY_TOP:    0xa8dadc,  // 天空顶部（用于渐变）
  SKY_BOT:    0xfefae0,  // 天空底部（渐变到奶油白）
  GRASS:      0x6a994e,  // 草地绿
  FOREST:     0x3d5a40,  // 深森林
  SUNSET:     0xe07a5f,  // 日落珊瑚
});

// === 圆角矩形绘制工具 ===
// 替代旧的 drawPixelBorder() 直角粗线

/**
 * 绘制圆角填充矩形
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x, y - 左上角坐标
 * @param {number} w, h - 宽高
 * @param {number} radius - 圆角半径
 * @param {number} color - 填充色（hex）
 * @param {number} alpha - 透明度 (0-1)
 */
export function drawRoundedRect(gfx, x, y, w, h, radius, color, alpha = 1) {
  gfx.fillStyle(color, alpha);
  gfx.fillRoundedRect(x, y, w, h, radius);
}

/**
 * 绘制圆角边框（无填充）
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x, y, w, h, radius
 * @param {number} color - 边框色
 * @param {number} thickness - 线宽
 * @param {number} alpha
 */
export function drawSoftBorder(gfx, x, y, w, h, radius, color, thickness = 2, alpha = 1) {
  gfx.lineStyle(thickness, color, alpha);
  gfx.strokeRoundedRect(x, y, w, h, radius);
}

/**
 * 绘制毛玻璃面板 — 半透明填充 + 圆角 + 柔和边框
 * @param {Phaser.GameObjects.Graphics} gfx
 * @param {number} x, y, w, h, radius
 * @param {number} bgColor - 背景填充色
 * @param {number} bgAlpha - 背景透明度
 * @param {number} borderColor - 边框色
 * @param {number} borderThickness
 */
export function drawGlassPanel(gfx, x, y, w, h, radius, bgColor, bgAlpha, borderColor, borderThickness = 2) {
  // 填充
  gfx.fillStyle(bgColor, bgAlpha);
  gfx.fillRoundedRect(x, y, w, h, radius);
  // 边框
  gfx.lineStyle(borderThickness, borderColor, 0.6);
  gfx.strokeRoundedRect(x, y, w, h, radius);
}

// === 8 玩家颜色配置（治愈柔色调，降低饱和度） ===
export const PLAYER_COLORS = Object.freeze([
  { name: 'coral',    tint: 0xe07a5f, hex: '#e07a5f', label: '珊瑚', cssRgb: '224,122,95' },
  { name: 'sky',      tint: 0x81b5c9, hex: '#81b5c9', label: '天空', cssRgb: '129,181,201' },
  { name: 'meadow',   tint: 0x7fb069, hex: '#7fb069', label: '草地', cssRgb: '127,176,105' },
  { name: 'honey',    tint: 0xe6b85c, hex: '#e6b85c', label: '蜂蜜', cssRgb: '230,184,92' },
  { name: 'lavender', tint: 0xb5a0c9, hex: '#b5a0c9', label: '薰衣', cssRgb: '181,160,201' },
  { name: 'peach',    tint: 0xf0a88c, hex: '#f0a88c', label: '蜜桃', cssRgb: '240,168,140' },
  { name: 'rose',     tint: 0xe8b0b8, hex: '#e8b0b8', label: '玫瑰', cssRgb: '232,176,184' },
  { name: 'mint',     tint: 0x8cc4b8, hex: '#8cc4b8', label: '薄荷', cssRgb: '140,196,184' },
]);

// O(1) 索引辅助
export const getPlayerColor = (trackNumber) =>
  PLAYER_COLORS[trackNumber - 1] ?? PLAYER_COLORS[0];

export const getColorByName = (name) =>
  PLAYER_COLORS.find(c => c.name === name) ?? PLAYER_COLORS[0];
