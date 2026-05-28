// === 8-bit 暖色调色板（Warm Retro Theme）===
// 设计理念：舒适放松的怀旧游戏氛围，避免刺眼霓虹

export const EIGHT_BIT = Object.freeze({
  // 背景色系（巧克力棕渐变）
  BG_DARK:  0x2b1e10,  // 深巧克力棕
  BG_MID:   0x3d2b1a,  // 中棕
  BG_LIGHT: 0x5c4028,  // 浅棕

  // 主题色
  PRIMARY:    0x7ec850,  // 像素绿（主色调）
  ACCENT:     0x5b9bd5,  // 复古蓝
  HIGHLIGHT:  0xf0d080,  // 暖金黄
  SECONDARY:  0x8b7355,  // 卡其棕

  // 文字色
  TEXT_LIGHT: 0xf5e6d0,  // 奶油白
  TEXT_DARK:  0x2b1e10,  // 深棕
  TEXT_MUTED: 0x8b7355,  // 卡其（次要文字）

  // 状态色
  SUCCESS: 0x7ec850,  // 像素绿
  ERROR:   0xd9574a,  // 复古红
  WARNING: 0xf0d080,  // 暖金

  // 色板中更多可选色
  SKY_BLUE:   0x5b9bd5,
  ROSE:       0xd9574a,
  MINT:       0x7ec850,
  GOLD:       0xf0d080,
  SAND:       0xc4a46c,
});

// === 像素边框绘制工具 ===
// 使用粗线 + 直角风格模拟 8-bit 游戏边框
// @param {Phaser.GameObjects.Graphics} gfx - Phaser Graphics 对象
// @param {number} x, y, w, h - 矩形位置和尺寸
// @param {number} color - 线条颜色（hex）
// @param {number} thickness - 线条粗细（默认 4px）
export function drawPixelBorder(gfx, x, y, w, h, color, thickness = 4) {
  gfx.lineStyle(thickness, color, 1, 0);
  gfx.strokeRect(x, y, w, h);
}

// 绘制像素化虚线（模拟 8-bit 跑道分隔）
export function drawPixelDash(gfx, x1, y1, x2, y2, color, dashLen = 12, gapLen = 8) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(len / (dashLen + gapLen));
  const ux = dx / len;
  const uy = dy / len;

  gfx.lineStyle(3, color, 1, 0);
  for (let i = 0; i < steps; i++) {
    const start = i * (dashLen + gapLen);
    const end = start + dashLen;
    gfx.lineBetween(
      x1 + ux * start, y1 + uy * start,
      x1 + ux * end,   y1 + uy * end
    );
  }
}

// === 8 玩家颜色配置（适配暖色背景，调亮以保证可见性）===
export const PLAYER_COLORS = Object.freeze([
  { name: 'red',    tint: 0xe06050, hex: '#e06050', label: '红队', cssRgb: '224,96,80' },
  { name: 'blue',   tint: 0x5b9bd5, hex: '#5b9bd5', label: '蓝队', cssRgb: '91,155,213' },
  { name: 'green',  tint: 0x7ec850, hex: '#7ec850', label: '绿队', cssRgb: '126,200,80' },
  { name: 'yellow', tint: 0xf0d080, hex: '#f0d080', label: '黄队', cssRgb: '240,208,128' },
  { name: 'purple', tint: 0xb080d0, hex: '#b080d0', label: '紫队', cssRgb: '176,128,208' },
  { name: 'orange', tint: 0xf0a060, hex: '#f0a060', label: '橙队', cssRgb: '240,160,96' },
  { name: 'pink',   tint: 0xf090b8, hex: '#f090b8', label: '粉队', cssRgb: '240,144,184' },
  { name: 'cyan',   tint: 0x5bb8c8, hex: '#5bb8c8', label: '青队', cssRgb: '91,184,200' },
]);

// O(1) 索引辅助
export const getPlayerColor = (trackNumber) =>
  PLAYER_COLORS[trackNumber - 1] ?? PLAYER_COLORS[0];

export const getColorByName = (name) =>
  PLAYER_COLORS.find(c => c.name === name) ?? PLAYER_COLORS[0];
