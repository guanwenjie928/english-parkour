// 8玩家颜色配置表 — 纯代码驱动，零图片依赖
// 白色基础精灵 + setTint(PLAYER_COLORS[i].tint) → 对应颜色角色

export const PLAYER_COLORS = Object.freeze([
  { name: 'red',    tint: 0xff4444, hex: '#ff4444', label: '红队', cssRgb: '255,68,68' },
  { name: 'blue',   tint: 0x4488ff, hex: '#4488ff', label: '蓝队', cssRgb: '68,136,255' },
  { name: 'green',  tint: 0x44dd44, hex: '#44dd44', label: '绿队', cssRgb: '68,221,68' },
  { name: 'yellow', tint: 0xffdd44, hex: '#ffdd44', label: '黄队', cssRgb: '255,221,68' },
  { name: 'purple', tint: 0xcc44ff, hex: '#cc44ff', label: '紫队', cssRgb: '204,68,255' },
  { name: 'orange', tint: 0xff8844, hex: '#ff8844', label: '橙队', cssRgb: '255,136,68' },
  { name: 'pink',   tint: 0xff88cc, hex: '#ff88cc', label: '粉队', cssRgb: '255,136,204' },
  { name: 'cyan',   tint: 0x44dddd, hex: '#44dddd', label: '青队', cssRgb: '68,221,221' },
]);

// O(1) 索引: trackNumber (1-8) → color config
export const getPlayerColor = (trackNumber) =>
  PLAYER_COLORS[trackNumber - 1] ?? PLAYER_COLORS[0];

// O(1) 索引: color name → color config
export const getColorByName = (name) =>
  PLAYER_COLORS.find(c => c.name === name) ?? PLAYER_COLORS[0];
