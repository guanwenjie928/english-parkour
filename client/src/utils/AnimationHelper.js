// 动画工具库 — 吉卜力治愈风格的统一动画工厂
// 所有场景共用，减少重复 tween 配置，确保动画一致性

import { GHIBLI } from './ColorConfig.js';

// === 统一缓动常量 ===
export const EASE = Object.freeze({
  SMOOTH: 'Sine.easeInOut',   // 平滑过渡（通用移动/淡入）
  BOUNCE: 'Back.easeOut',     // 弹性出场（按钮弹出/卡片入场）
  SNAP:   'Cubic.easeOut',    // 快速定格（计数/计时）
});

// === 飘浮治愈粒子背景 ===
// 在指定区域生成随机飘浮的花瓣/树叶/星光
// @param {Phaser.Scene} scene
// @param {number} width, height - 粒子区域
// @param {object} options
//   count: 粒子数量 (default 8)
//   type: 'petal' | 'leaf' | 'star' (default 'petal')
//   depth: 渲染深度 (default 0)
//   minSize, maxSize: 粒子大小范围 (default 3-6)
export function createFloatingParticles(scene, width, height, options = {}) {
  const {
    count = 8,
    type = 'petal',
    depth = 0,
    minSize = 3,
    maxSize = 6,
  } = options;

  const colors = {
    petal: [GHIBLI.SUNSET, 0xf0a88c, 0xe8b0b8, GHIBLI.HIGHLIGHT],
    leaf: [GHIBLI.GRASS, GHIBLI.FOREST, GHIBLI.PRIMARY],
    star: [GHIBLI.HIGHLIGHT, GHIBLI.ACCENT, 0xfefae0],
  };

  const palette = colors[type] || colors.petal;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = minSize + Math.random() * (maxSize - minSize);
    const color = palette[Math.floor(Math.random() * palette.length)];
    const alpha = 0.15 + Math.random() * 0.3;

    const particle = scene.add.circle(x, y, size, color, alpha).setDepth(depth);

    // 飘浮动画 — 随机幅度和周期
    const floatAmp = 10 + Math.random() * 25;
    const floatDur = 3000 + Math.random() * 4000;
    const driftAmp = 15 + Math.random() * 20;

    scene.tweens.add({
      targets: particle,
      y: y + floatAmp,
      duration: floatDur,
      yoyo: true,
      repeat: -1,
      ease: EASE.SMOOTH,
      delay: Math.random() * floatDur,
    });

    scene.tweens.add({
      targets: particle,
      x: x + driftAmp,
      duration: floatDur * 1.3,
      yoyo: true,
      repeat: -1,
      ease: EASE.SMOOTH,
      delay: Math.random() * floatDur,
    });

    // 轻微透明度波动
    scene.tweens.add({
      targets: particle,
      alpha: alpha * 0.5,
      duration: floatDur * 0.7,
      yoyo: true,
      repeat: -1,
      ease: EASE.SMOOTH,
      delay: Math.random() * floatDur * 0.5,
    });

    particles.push(particle);
  }

  return particles;
}

// === 圆角按钮工厂 ===
// 减少每个场景重复创建按钮的样板代码
// @returns {{ bg, border, label }} 按钮组件引用
export function createSoftButton(scene, x, y, w, h, label, color, onClick, options = {}) {
  const {
    textColor = 0xffffff,
    fontSize = '18px',
    fontFamily = 'Nunito',
    fontWeight = '700',
    radius = 14,
    depth = 10,
  } = options;

  const bx = x - w / 2;
  const by = y - h / 2;

  // 按钮背景
  const bg = scene.add.graphics().setDepth(depth);
  bg.fillStyle(color, 1);
  bg.fillRoundedRect(bx, by, w, h, radius);

  // 柔和边框
  const borderColor = _lightenColor(color, 30);
  bg.lineStyle(2, borderColor, 0.4);
  bg.strokeRoundedRect(bx, by, w, h, radius);

  // 文字
  const text = scene.add.text(x, y, label, {
    fontSize,
    fontFamily,
    fontStyle: fontWeight,
    color: '#' + textColor.toString(16).padStart(6, '0'),
  }).setOrigin(0.5).setDepth(depth + 1);

  // 交互热区（透明矩形覆盖）
  const hitArea = scene.add.rectangle(x, y, w, h, 0x000000, 0)
    .setInteractive({ useHandCursor: true })
    .setDepth(depth + 2);

  // hover 效果
  hitArea.on('pointerover', () => {
    bg.clear();
    bg.fillStyle(_lightenColor(color, 15), 1);
    bg.fillRoundedRect(bx - 2, by - 2, w + 4, h + 4, radius + 2);
    bg.lineStyle(2, borderColor, 0.7);
    bg.strokeRoundedRect(bx - 2, by - 2, w + 4, h + 4, radius + 2);
    text.setScale(1.03);
  });

  hitArea.on('pointerout', () => {
    bg.clear();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(bx, by, w, h, radius);
    bg.lineStyle(2, borderColor, 0.4);
    bg.strokeRoundedRect(bx, by, w, h, radius);
    text.setScale(1);
  });

  hitArea.on('pointerdown', () => {
    // 按下微缩
    text.setScale(0.95);
    if (onClick) onClick();
  });

  hitArea.on('pointerup', () => {
    text.setScale(1.03);
  });

  return { bg, text, hitArea };
}

// === 入场动画 — 从下方滑入 + 淡入 ===
export function slideUpIn(scene, targets, delay = 0, duration = 500) {
  const arr = Array.isArray(targets) ? targets : [targets];
  arr.forEach((t) => {
    if (!t) return;
    t.setAlpha(0);
    t.y += 30;
    scene.tweens.add({
      targets: t,
      alpha: 1,
      y: t.y - 30,
      duration,
      delay,
      ease: EASE.BOUNCE,
    });
  });
}

// === 脉冲呼吸动画 ===
export function pulse(targets, scale = 1.05, duration = 1000) {
  const arr = Array.isArray(targets) ? targets : [targets];
  arr.forEach((t) => {
    if (!t || !t.scene) return;
    t.scene.tweens.add({
      targets: t,
      scaleX: scale,
      scaleY: scale,
      duration,
      yoyo: true,
      repeat: -1,
      ease: EASE.SMOOTH,
    });
  });
}

// === 治愈粒子爆发（答对/胜利时） ===
export function burstParticles(scene, x, y, color, count = 15) {
  const particles = [];
  const gfx = scene.add.graphics().setDepth(80);

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    const size = 2 + Math.random() * 4;
    const life = 0.6 + Math.random() * 0.4;

    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      alpha: 1,
      life,
    });
  }

  // 粒子更新循环
  const updateParticles = () => {
    gfx.clear();
    let alive = false;

    particles.forEach((p) => {
      if (p.life > 0) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // 重力
        p.life -= 0.02;
        p.alpha = p.life;

        gfx.fillStyle(p.color, p.alpha);
        gfx.fillCircle(p.x, p.y, p.size);
        alive = true;
      }
    });

    if (alive) {
      scene.time.delayedCall(16, updateParticles);
    } else {
      gfx.destroy();
    }
  };

  updateParticles();
}

// === 弹入缩放动画 ===
export function popIn(scene, target, duration = 400, delay = 0) {
  if (!target) return;
  target.setScale(0);
  target.setAlpha(0);
  scene.tweens.add({
    targets: target,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    duration,
    delay,
    ease: EASE.BOUNCE,
  });
}

// === 辅助：颜色变亮 ===
function _lightenColor(color, amount) {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount);
  const b = Math.min(255, (color & 0xff) + amount);
  return (r << 16) | (g << 8) | b;
}
