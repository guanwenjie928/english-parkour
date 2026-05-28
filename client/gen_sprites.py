#!/usr/bin/env python3
"""
吉卜力治愈风精灵图生成器
生成柔和圆润风格的 PNG 精灵图（透明背景），替代 8-bit 像素方块。
吉卜力暖系调色板：奶油肌、治愈绿、珊瑚红、天空蓝、蜂蜜金。

输出：
  items-strip.png   — 5 道具图标，320×64 (5×1, 每格64×64)
  run-sheet.png     — 8 帧跑步动画，512×256 (4×2, 每格128×128)
  pose-sheet.png    — 5 姿态帧，640×128 (5×1, 每格128×128)
  vfx-strip.png     — 10 帧特效，256×2560 (1×10竖条, 每格256×256)
  menu-character.png — 单图 256×256 角色立绘
"""
from PIL import Image, ImageDraw
import math
import random

random.seed(42)

OUTPUT_DIR = '/data/adfa356a-de4a-40cb-b325-e06a264a24a2/english-parkour/client/public/assets'

# === 吉卜力治愈调色板 ===
C = {
    'cream':      (0xfe, 0xfa, 0xe0),  # 奶油白
    'sand':       (0xfa, 0xed, 0xcd),  # 暖沙色
    'warm':       (0xf2, 0xcc, 0x8f),  # 柔和蜂蜜
    'primary':    (0x6a, 0x99, 0x4e),  # 治愈绿
    'secondary':  (0x45, 0x7b, 0x9d),  # 柔和蓝灰
    'accent':     (0xa8, 0xda, 0xdc),  # 天空蓝
    'highlight':  (0xe6, 0xb8, 0x5c),  # 蜂蜜金
    'text_dark':  (0x3d, 0x5a, 0x40),  # 深森林绿
    'text_warm':  (0x5c, 0x3d, 0x2e),  # 暖棕
    'text_muted': (0x8b, 0x9a, 0x8b),  # 柔和灰绿
    'error':      (0xe6, 0x39, 0x46),  # 柔和红
    'success':    (0x6a, 0x99, 0x4e),  # 治愈绿
    'sunset':     (0xe0, 0x7a, 0x5f),  # 日落珊瑚
    # 角色用色
    'skin':       (0xf5, 0xd5, 0xb0),  # 奶油肌
    'skin_shadow':(0xe8, 0xc0, 0x98),  # 肤色阴影
    'hair':       (0x5c, 0x3d, 0x2e),  # 暖棕发
    'hair_light': (0x8b, 0x6b, 0x4a),  # 发色高光
    'shirt':      (0x6a, 0x99, 0x4e),  # 上衣：治愈绿
    'shirt_light':(0x8b, 0xb5, 0x6e),  # 上衣亮部
    'pants':      (0xe0, 0x7a, 0x5f),  # 裤子：珊瑚色
    'pants_dark': (0xc0, 0x60, 0x48),  # 裤子暗部
    'shoe':       (0x5c, 0x3d, 0x2e),  # 鞋子：暖棕
    'white':      (0xff, 0xff, 0xff),
    'eye_white':  (0xff, 0xff, 0xff),
    'eye_pupil':  (0x3d, 0x5a, 0x40),
    'blush':      (0xff, 0xc0, 0xb0),  # 腮红
    # 特效色
    'flame_y':    (0xff, 0xe8, 0x80),  # 火焰黄
    'flame_o':    (0xff, 0xb0, 0x60),  # 火焰橙
    'flame_r':    (0xff, 0x70, 0x50),  # 火焰红
    'shield_a':   (0x90, 0xd0, 0xf0),  # 护盾蓝（浅）
    'shield_b':   (0x60, 0xb0, 0xe0),  # 护盾蓝（中）
    'bolt':       (0xff, 0xe8, 0x80),  # 闪电金
    'purple':     (0xb0, 0x90, 0xd0),  # 薰衣草紫
}


def new_image(w, h):
    """创建透明背景的 RGBA 图像"""
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    return img, draw


def fill_circle(draw, cx, cy, r, color):
    """画实心圆"""
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                px, py = cx + dx, cy + dy
                if 0 <= px < draw.im.size[0] and 0 <= py < draw.im.size[1]:
                    draw.point((px, py), fill=color)


def fill_rounded_rect(draw, x, y, w, h, r, color):
    """画圆角实心矩形"""
    # 中间矩形
    for dy in range(r, h - r):
        for dx in range(w):
            px, py = x + dx, y + dy
            if 0 <= px < draw.im.size[0] and 0 <= py < draw.im.size[1]:
                draw.point((px, py), fill=color)
    # 上方矩形
    for dy in range(r):
        for dx in range(w):
            px, py = x + dx, y + dy
            if 0 <= px < draw.im.size[0] and 0 <= py < draw.im.size[1]:
                draw.point((px, py), fill=color)
    # 下方矩形
    for dy in range(h - r, h):
        for dx in range(w):
            px, py = x + dx, y + dy
            if 0 <= px < draw.im.size[0] and 0 <= py < draw.im.size[1]:
                draw.point((px, py), fill=color)
    # 四个圆角
    for cx, cy_off in [(x + r, y + r), (x + w - 1 - r, y + r),
                        (x + r, y + h - 1 - r), (x + w - 1 - r, y + h - 1 - r)]:
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                if dx * dx + dy * dy <= r * r:
                    px, py = cx + dx, cy_off + dy
                    if 0 <= px < draw.im.size[0] and 0 <= py < draw.im.size[1]:
                        draw.point((px, py), fill=color)


def lighten(c, amt=30):
    return tuple(min(255, v + amt) for v in c)


def darken(c, amt=30):
    return tuple(max(0, v - amt) for v in c)


def blend_alpha(bg, fg_rgba):
    """混合半透明前景到背景色"""
    fa = fg_rgba[3] / 255.0
    r = int(fg_rgba[0] * fa + bg[0] * (1 - fa))
    g = int(fg_rgba[1] * fa + bg[1] * (1 - fa))
    b = int(fg_rgba[2] * fa + bg[2] * (1 - fa))
    a = max(bg[3], fg_rgba[3])
    return (r, g, b, a)


# ============================================================
# 1. 道具图标 items-strip.png (320×64)
# ============================================================
def draw_items_strip():
    img, draw = new_image(320, 64)
    cell_w, cell_h = 64, 64
    items = ['rocket', 'electric', 'banana', 'shield', 'magnet']

    for idx, item in enumerate(items):
        ox = idx * cell_w
        cx, cy = ox + cell_w // 2, cell_h // 2

        if item == 'rocket':
            # 圆头小火箭
            fill_rounded_rect(draw, cx - 6, cy - 10, 12, 20, 5, C['sunset'])
            fill_rounded_rect(draw, cx - 4, cy - 12, 8, 6, 3, lighten(C['sunset']))
            # 火焰
            fill_circle(draw, cx, cy + 12, 3, C['flame_y'])
            fill_circle(draw, cx - 2, cy + 13, 2, C['flame_o'])
            fill_circle(draw, cx + 2, cy + 13, 2, C['flame_o'])

        elif item == 'electric':
            # 圆角闪电
            pts = [
                (cx - 2, cy - 14), (cx - 10, cy - 2), (cx - 4, cy - 2),
                (cx - 8, cy + 12), (cx + 2, cy - 1), (cx - 4, cy - 1),
                (cx - 2, cy - 14)
            ]
            for i in range(len(pts) - 1):
                _draw_soft_line(draw, pts[i][0], pts[i][1],
                                pts[i+1][0], pts[i+1][1], C['bolt'], 3)

        elif item == 'banana':
            # 弯曲香蕉
            for i in range(18):
                bx = cx - 8 + int(5 * math.sin(i * 0.28))
                by = cy - 9 + i
                fill_circle(draw, bx, by, 3, C['highlight'])
            # 两端
            fill_circle(draw, cx + 5, cy - 7, 2, darken(C['highlight'], 40))
            fill_circle(draw, cx - 5, cy + 7, 2, darken(C['highlight'], 40))

        elif item == 'shield':
            # 圆形护盾
            fill_circle(draw, cx, cy, 13, C['shield_a'])
            fill_circle(draw, cx, cy, 9, C['shield_b'])
            fill_circle(draw, cx, cy, 5, C['white'])

        elif item == 'magnet':
            # U 形磁铁
            fill_rounded_rect(draw, cx - 12, cy - 10, 8, 20, 3, C['purple'])
            fill_rounded_rect(draw, cx + 4, cy - 10, 8, 20, 3, C['purple'])
            fill_rounded_rect(draw, cx - 12, cy + 6, 24, 5, 2, C['purple'])
            # N/S 标记
            fill_rounded_rect(draw, cx - 8, cy + 10, 5, 3, 1, C['error'])
            fill_rounded_rect(draw, cx + 4, cy + 10, 5, 3, 1, C['secondary'])

    img.save(f'{OUTPUT_DIR}/items/items-strip.png', 'PNG', optimize=True)
    print(f'  items-strip.png: {img.size}')


def _draw_soft_line(draw, x0, y0, x1, y1, color, thickness):
    """画柔和粗线"""
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy

    while True:
        for tx in range(-thickness // 2, (thickness + 1) // 2):
            for ty in range(-thickness // 2, (thickness + 1) // 2):
                px, py = x0 + tx, y0 + ty
                if 0 <= px < draw.im.size[0] and 0 <= py < draw.im.size[1]:
                    draw.point((px, py), fill=color)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


# ============================================================
# 2. 跑步动画 run-sheet.png (512×256, 4×2 网格)
# ============================================================
def draw_run_sheet():
    img, draw = new_image(512, 256)
    frame_w, frame_h = 128, 128

    for frame in range(8):
        col, row = frame % 4, frame // 4
        ox, oy = col * frame_w, row * frame_h
        draw_character_frame(draw, ox, oy, frame_w, frame_h, frame, 'run')

    img.save(f'{OUTPUT_DIR}/characters/run-sheet.png', 'PNG', optimize=True)
    print(f'  run-sheet.png: {img.size}')


# ============================================================
# 3. 姿态精灵图 pose-sheet.png (640×128, 5×1)
# ============================================================
def draw_pose_sheet():
    img, draw = new_image(640, 128)
    frame_w, frame_h = 128, 128
    poses = ['idle', 'slide', 'stun', 'victory', 'shield']

    for idx, pose in enumerate(poses):
        ox = idx * frame_w
        draw_character_frame(draw, ox, 0, frame_w, frame_h, idx, pose)

    img.save(f'{OUTPUT_DIR}/characters/pose-sheet.png', 'PNG', optimize=True)
    print(f'  pose-sheet.png: {img.size}')


def draw_character_frame(draw, ox, oy, fw, fh, frame_idx, pose):
    """画一个吉卜力风格角色帧（圆润造型）"""
    cx, cy = ox + fw // 2, oy + fh // 2

    if pose == 'run':
        phase = frame_idx * math.pi / 4
        leg_offset = int(5 * math.sin(phase))
        arm_offset = int(3 * math.sin(phase))

        # 头 — 圆形
        head_y = cy - 28
        fill_circle(draw, cx, head_y, 10, C['skin'])
        # 头发
        fill_circle(draw, cx, head_y - 4, 11, C['hair'])
        fill_circle(draw, cx - 5, head_y - 3, 5, C['hair_light'])
        fill_circle(draw, cx + 5, head_y - 3, 5, C['hair_light'])
        # 眼睛
        fill_circle(draw, cx - 4, head_y - 1, 2, C['eye_white'])
        fill_circle(draw, cx + 4, head_y - 1, 2, C['eye_white'])
        fill_circle(draw, cx - 4, head_y - 1, 1, C['eye_pupil'])
        fill_circle(draw, cx + 4, head_y - 1, 1, C['eye_pupil'])
        # 腮红
        fill_circle(draw, cx - 6, head_y + 2, 2, C['blush'])
        fill_circle(draw, cx + 6, head_y + 2, 2, C['blush'])
        # 嘴
        fill_circle(draw, cx, head_y + 4, 2, C['text_warm'])

        # 身体 — 圆角矩形
        body_top = head_y + 8
        fill_rounded_rect(draw, cx - 8, body_top, 16, 16, 6, C['shirt'])
        # 衣领
        fill_circle(draw, cx, body_top + 1, 3, C['shirt_light'])

        # 左臂
        la_y = body_top + arm_offset
        fill_rounded_rect(draw, cx - 14, la_y, 6, 14, 3, C['shirt'])
        fill_circle(draw, cx - 11, la_y + 14, 3, C['skin'])

        # 右臂
        ra_y = body_top - arm_offset
        fill_rounded_rect(draw, cx + 8, ra_y, 6, 14, 3, C['shirt'])
        fill_circle(draw, cx + 11, ra_y + 14, 3, C['skin'])

        # 左腿
        leg_top = body_top + 14
        ll_y = leg_top + leg_offset
        fill_rounded_rect(draw, cx - 8, ll_y, 7, 12, 3, C['pants'])
        fill_rounded_rect(draw, cx - 9, ll_y + 10, 9, 4, 2, C['shoe'])

        # 右腿
        rl_y = leg_top - leg_offset
        fill_rounded_rect(draw, cx + 1, rl_y, 7, 12, 3, C['pants'])
        fill_rounded_rect(draw, cx, rl_y + 10, 9, 4, 2, C['shoe'])

        # 速度线
        if frame_idx in [2, 3, 6, 7]:
            for i in range(3):
                lx = cx - 20 - i * 3
                ly = cy - 3 + i * 4
                fill_circle(draw, lx, ly, 1, C['highlight'])

    elif pose == 'idle':
        breath = 0 if frame_idx % 2 == 0 else 1

        # 头
        head_y = cy - 30 + breath
        fill_circle(draw, cx, head_y, 10, C['skin'])
        fill_circle(draw, cx, head_y - 4, 11, C['hair'])
        fill_circle(draw, cx - 5, head_y - 3, 5, C['hair_light'])
        fill_circle(draw, cx + 5, head_y - 3, 5, C['hair_light'])
        # 眼睛
        fill_circle(draw, cx - 4, head_y, 2, C['eye_white'])
        fill_circle(draw, cx + 4, head_y, 2, C['eye_white'])
        fill_circle(draw, cx - 4, head_y, 1, C['eye_pupil'])
        fill_circle(draw, cx + 4, head_y, 1, C['eye_pupil'])
        # 腮红
        fill_circle(draw, cx - 6, head_y + 2, 2, C['blush'])
        fill_circle(draw, cx + 6, head_y + 2, 2, C['blush'])
        # 微笑
        fill_circle(draw, cx, head_y + 3, 2, C['text_warm'])

        # 身体
        body_top = head_y + 7
        fill_rounded_rect(draw, cx - 8, body_top, 16, 18, 6, C['shirt'])
        # 双臂
        fill_rounded_rect(draw, cx - 14, body_top, 6, 16, 3, C['shirt'])
        fill_circle(draw, cx - 11, body_top + 16, 3, C['skin'])
        fill_rounded_rect(draw, cx + 8, body_top, 6, 16, 3, C['shirt'])
        fill_circle(draw, cx + 11, body_top + 16, 3, C['skin'])
        # 腿
        leg_top = body_top + 16
        fill_rounded_rect(draw, cx - 7, leg_top, 7, 14, 3, C['pants'])
        fill_rounded_rect(draw, cx - 8, leg_top + 12, 9, 4, 2, C['shoe'])
        fill_rounded_rect(draw, cx, leg_top, 7, 14, 3, C['pants'])
        fill_rounded_rect(draw, cx - 1, leg_top + 12, 9, 4, 2, C['shoe'])

    elif pose == 'slide':
        # 后仰姿态
        head_y = cy - 26
        fill_circle(draw, cx - 2, head_y, 10, C['skin'])
        fill_circle(draw, cx - 2, head_y - 4, 11, C['hair'])
        # 惊讶表情
        fill_circle(draw, cx - 6, head_y - 1, 3, C['eye_white'])
        fill_circle(draw, cx + 2, head_y - 1, 3, C['eye_white'])
        fill_circle(draw, cx - 6, head_y - 1, 2, C['eye_pupil'])
        fill_circle(draw, cx + 2, head_y - 1, 2, C['eye_pupil'])
        fill_circle(draw, cx - 2, head_y + 4, 3, C['text_warm'])

        body_top = head_y + 7
        fill_rounded_rect(draw, cx - 4, body_top, 12, 14, 5, C['shirt'])
        # 手撑地
        fill_circle(draw, cx - 14, body_top + 12, 3, C['skin'])
        fill_circle(draw, cx + 10, body_top + 10, 3, C['skin'])
        # 腿打滑
        fill_rounded_rect(draw, cx - 8, body_top + 10, 7, 10, 3, C['pants'])
        fill_rounded_rect(draw, cx + 4, body_top + 12, 7, 10, 3, C['pants'])
        # 打滑线
        for i in range(4):
            fill_circle(draw, cx + 14 + i * 2, body_top + 16, 1, C['cream'])

    elif pose == 'stun':
        # 麻痹僵直
        head_y = cy - 28
        fill_circle(draw, cx, head_y, 9, C['skin'])
        fill_circle(draw, cx, head_y - 4, 10, C['hair'])
        # X 眼
        for dx in [-1, 1]:
            fill_circle(draw, cx - 4 + dx, head_y + dx, 1, C['eye_pupil'])
            fill_circle(draw, cx + 3 + dx, head_y + dx, 1, C['eye_pupil'])
        # 嘴
        fill_rounded_rect(draw, cx - 2, head_y + 3, 5, 2, 1, darken(C['skin']))

        body_top = head_y + 5
        fill_rounded_rect(draw, cx - 7, body_top, 14, 16, 5, C['shirt'])
        # 手臂僵直伸出
        fill_rounded_rect(draw, cx - 20, body_top + 2, 14, 5, 3, C['shirt'])
        fill_circle(draw, cx - 20, body_top + 4, 3, C['skin'])
        fill_rounded_rect(draw, cx + 6, body_top + 2, 14, 5, 3, C['shirt'])
        fill_circle(draw, cx + 20, body_top + 4, 3, C['skin'])
        # 腿
        fill_rounded_rect(draw, cx - 7, body_top + 14, 7, 12, 3, C['pants'])
        fill_rounded_rect(draw, cx, body_top + 14, 7, 12, 3, C['pants'])
        # 电感
        for i in range(5):
            fill_circle(draw, cx + (i - 2) * 5, head_y - 14 + (i % 2) * 3, 1, C['bolt'])

    elif pose == 'victory':
        # 胜利高举
        head_y = cy - 30
        fill_circle(draw, cx, head_y, 10, C['skin'])
        fill_circle(draw, cx, head_y - 4, 11, C['hair'])
        fill_circle(draw, cx - 5, head_y - 3, 5, C['hair_light'])
        fill_circle(draw, cx + 5, head_y - 3, 5, C['hair_light'])
        # 开心眼 (^_^)
        _draw_soft_line(draw, cx - 6, head_y - 2, cx - 2, head_y, C['eye_pupil'], 1)
        _draw_soft_line(draw, cx + 2, head_y, cx + 6, head_y - 2, C['eye_pupil'], 1)
        # 大笑
        fill_circle(draw, cx, head_y + 4, 3, C['text_warm'])

        body_top = head_y + 7
        fill_rounded_rect(draw, cx - 8, body_top, 16, 16, 6, C['shirt'])
        # 双臂高举
        fill_rounded_rect(draw, cx - 15, body_top - 20, 5, 22, 3, C['shirt'])
        fill_circle(draw, cx - 13, body_top - 20, 3, C['skin'])
        fill_rounded_rect(draw, cx + 10, body_top - 20, 5, 22, 3, C['shirt'])
        fill_circle(draw, cx + 13, body_top - 20, 3, C['skin'])
        # 腿
        fill_rounded_rect(draw, cx - 8, body_top + 14, 7, 12, 3, C['pants'])
        fill_rounded_rect(draw, cx + 1, body_top + 14, 7, 12, 3, C['pants'])
        fill_rounded_rect(draw, cx - 9, body_top + 24, 9, 4, 2, C['shoe'])
        fill_rounded_rect(draw, cx, body_top + 24, 9, 4, 2, C['shoe'])
        # 星星
        fill_circle(draw, cx + 24, head_y - 10, 2, C['highlight'])
        fill_circle(draw, cx + 20, head_y - 2, 2, C['highlight'])

    elif pose == 'shield':
        # 护盾姿态
        head_y = cy - 28
        fill_circle(draw, cx, head_y, 9, C['skin'])
        fill_circle(draw, cx, head_y - 4, 10, C['hair'])
        fill_circle(draw, cx - 4, head_y, 2, C['eye_white'])
        fill_circle(draw, cx + 4, head_y, 2, C['eye_white'])
        fill_circle(draw, cx - 4, head_y, 1, C['eye_pupil'])
        fill_circle(draw, cx + 4, head_y, 1, C['eye_pupil'])

        body_top = head_y + 5
        fill_rounded_rect(draw, cx - 7, body_top, 14, 16, 5, C['shirt'])
        # 手臂交叉护胸
        fill_rounded_rect(draw, cx - 12, body_top + 2, 10, 4, 2, C['shirt'])
        fill_rounded_rect(draw, cx + 2, body_top + 6, 10, 4, 2, C['shirt'])
        # 腿
        fill_rounded_rect(draw, cx - 6, body_top + 14, 7, 12, 3, C['pants'])
        fill_rounded_rect(draw, cx + 1, body_top + 14, 7, 12, 3, C['pants'])

        # 护盾球体
        for dy in range(-25, 28):
            for dx in range(-25, 28):
                dist2 = dx * dx + dy * dy
                shield_cx, shield_cy = cx, cy + 3
                if 500 <= dist2 <= 625:
                    alpha = 80
                    sc = C['shield_a']
                elif 400 <= dist2 < 500:
                    alpha = 120
                    sc = C['shield_b']
                else:
                    continue
                px, py = shield_cx + dx, shield_cy + dy
                if 0 <= px < ox + fw and 0 <= py < oy + fh:
                    existing = draw.im.getpixel((px, py))
                    blended = blend_alpha(existing, (sc[0], sc[1], sc[2], alpha))
                    draw.point((px, py), fill=blended)


# ============================================================
# 4. 特效 vfx-strip.png (256×2560)
# ============================================================
def draw_vfx_strip():
    img, draw = new_image(256, 2560)
    frame_h = 256

    for i in range(5):
        oy = i * frame_h
        draw_electric_frame(draw, oy, frame_h, i)

    for i in range(5):
        oy = (5 + i) * frame_h
        draw_shield_frame(draw, oy, frame_h, i)

    img.save(f'{OUTPUT_DIR}/vfx/vfx-strip.png', 'PNG', optimize=True)
    print(f'  vfx-strip.png: {img.size}')


def draw_electric_frame(draw, oy, fh, frame_idx):
    """柔化电击特效"""
    cx, cy = 128, oy + fh // 2
    bolt_colors = [C['bolt'], C['flame_y'], (0xff, 0xff, 0xd0), C['flame_y'], C['bolt']]
    color = bolt_colors[frame_idx]

    segments = [
        (cx, oy + 10), (cx - 25, oy + 50), (cx + 10, oy + 55),
        (cx - 35, oy + 100), (cx + 5, oy + 105),
        (cx - 20, oy + 150), (cx + 15, oy + 155),
        (cx - 30, oy + 200), (cx + 5, oy + 210),
        (cx - 15, oy + 240), (cx + 10, oy + 250),
    ]
    for i in range(len(segments) - 1):
        _draw_soft_line(draw, segments[i][0], segments[i][1],
                       segments[i+1][0], segments[i+1][1], color, 3 + frame_idx)

    # 发光粒子
    for _ in range(10 + frame_idx * 3):
        px = cx - 40 + random.randint(0, 80)
        py = oy + random.randint(10, fh - 10)
        fill_circle(draw, px, py, random.randint(1, 2),
                    (0xff, 0xff, 0xc0, 140))


def draw_shield_frame(draw, oy, fh, frame_idx):
    """柔和护盾波纹"""
    cx, cy = 128, oy + fh // 2
    alpha_vals = [40, 80, 120, 90, 50]
    alpha = alpha_vals[frame_idx]
    r_outer = 80 + frame_idx * 5

    for dy in range(-r_outer, r_outer + 1):
        for dx in range(-r_outer, r_outer + 1):
            dist2 = dx * dx + dy * dy
            inner_r = r_outer - 15
            if inner_r * inner_r <= dist2 <= r_outer * r_outer:
                sc = C['shield_b'] if (dx + dy) % 4 == 0 else C['shield_a']
                px, py = cx + dx, cy + dy
                if 0 <= px < 256 and 0 <= py < oy + fh:
                    existing = draw.im.getpixel((px, py))
                    blended = blend_alpha(existing, (sc[0], sc[1], sc[2], alpha))
                    draw.point((px, py), fill=blended)


# ============================================================
# 5. 菜单角色立绘 menu-character.png (256×256)
# ============================================================
def draw_menu_character():
    img, draw = new_image(256, 256)
    cx, cy = 128, 128

    # 大号圆润角色
    head_y = cy - 20
    fill_circle(draw, cx, head_y, 22, C['skin'])
    fill_circle(draw, cx, head_y - 8, 24, C['hair'])
    fill_circle(draw, cx - 10, head_y - 6, 10, C['hair_light'])
    fill_circle(draw, cx + 10, head_y - 6, 10, C['hair_light'])

    # 可爱的大眼睛
    fill_circle(draw, cx - 8, head_y - 1, 5, C['eye_white'])
    fill_circle(draw, cx + 8, head_y - 1, 5, C['eye_white'])
    fill_circle(draw, cx - 8, head_y - 1, 3, C['eye_pupil'])
    fill_circle(draw, cx + 8, head_y - 1, 3, C['eye_pupil'])
    # 眼睛高光
    fill_circle(draw, cx - 7, head_y - 2, 1, C['white'])
    fill_circle(draw, cx + 9, head_y - 2, 1, C['white'])
    # 腮红
    fill_circle(draw, cx - 12, head_y + 4, 4, C['blush'])
    fill_circle(draw, cx + 12, head_y + 4, 4, C['blush'])
    # 微笑
    fill_circle(draw, cx, head_y + 8, 4, C['text_warm'])
    fill_circle(draw, cx - 3, head_y + 8, 2, (0xff, 0xa0, 0xa0))

    # 身体
    body_top = head_y + 16
    fill_rounded_rect(draw, cx - 18, body_top, 36, 40, 12, C['shirt'])
    fill_rounded_rect(draw, cx - 10, body_top + 2, 20, 10, 4, C['shirt_light'])

    # 手臂
    fill_rounded_rect(draw, cx - 30, body_top + 2, 12, 30, 6, C['shirt'])
    fill_circle(draw, cx - 26, body_top + 32, 7, C['skin'])
    fill_rounded_rect(draw, cx + 18, body_top + 2, 12, 30, 6, C['shirt'])
    fill_circle(draw, cx + 26, body_top + 32, 7, C['skin'])

    # 腿
    leg_top = body_top + 36
    fill_rounded_rect(draw, cx - 12, leg_top, 12, 24, 6, C['pants'])
    fill_rounded_rect(draw, cx + 2, leg_top, 12, 24, 6, C['pants'])
    # 鞋
    fill_rounded_rect(draw, cx - 13, leg_top + 20, 14, 8, 4, C['shoe'])
    fill_rounded_rect(draw, cx + 1, leg_top + 20, 14, 8, 4, C['shoe'])

    img.save(f'{OUTPUT_DIR}/ui/menu-character.png', 'PNG', optimize=True)
    print(f'  menu-character.png: {img.size}')


# ============================================================
# Main
# ============================================================
if __name__ == '__main__':
    print('=== 生成吉卜力治愈风精灵图 ===')
    print()
    draw_items_strip()
    draw_run_sheet()
    draw_pose_sheet()
    draw_vfx_strip()
    draw_menu_character()
    print()
    print('全部精灵图生成完毕！')
