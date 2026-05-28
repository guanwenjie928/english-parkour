#!/usr/bin/env python3
"""
JPG → 透明 PNG 精灵图转换工具
用于将 8-bit 像素风格 JPG 精灵图转成带 alpha 通道的 PNG，
通过角采样检测背景色，实现自动抠图。
"""
from PIL import Image
import os
import math

ASSETS_DIR = '/data/adfa356a-de4a-40cb-b325-e06a264a24a2/english-parkour/client/public/assets'

# 需要转换的文件
CONVERSIONS = [
    ('characters/run-sheet.jpg', 'characters/run-sheet.png'),
    ('characters/pose-sheet.jpg', 'characters/pose-sheet.png'),
    ('items/items-strip.jpg', 'items/items-strip.png'),
    ('vfx/vfx-strip.jpg', 'vfx/vfx-strip.png'),
]


def detect_background_color(img, sample_margin=3):
    """
    从图像四个角 + 四条边采样，找到背景色。
    取采样区域中出现频率最高的颜色作为背景色。
    适用于像素风格图片（背景通常是纯色）。
    """
    w, h = img.size
    samples = []

    # 四个角
    corners = [
        (0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
    ]
    for cx, cy in corners:
        for dx in range(-sample_margin, sample_margin + 1):
            for dy in range(-sample_margin, sample_margin + 1):
                x = max(0, min(w - 1, cx + dx))
                y = max(0, min(h - 1, cy + dy))
                samples.append(img.getpixel((x, y)))

    # 四条边的中点
    edges = [
        (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2),
    ]
    for ex, ey in edges:
        for d in range(-sample_margin * 2, sample_margin * 2 + 1):
            x = max(0, min(w - 1, ex + d))
            y = max(0, min(h - 1, ey + d))
            samples.append(img.getpixel((x, y)))

    # 频率统计
    from collections import Counter
    freq = Counter(samples)
    return freq.most_common(1)[0][0]


def color_distance(c1, c2):
    """RGB 欧氏距离"""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))


def remove_background(img, bg_color, threshold=45, feather=25):
    """
    将背景色替换为透明。
    - threshold: 完全透明的最大距离
    - feather: 半透明过渡区的最大距离（超出后完全不透明）
    """
    img_rgba = img.convert('RGBA')
    pixels = img_rgba.load()
    w, h = img_rgba.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            dist = color_distance((r, g, b), bg_color)

            if dist <= threshold:
                # 完全透明
                pixels[x, y] = (r, g, b, 0)
            elif dist <= threshold + feather:
                # 半透明过渡（抗锯齿）
                alpha = int(255 * (dist - threshold) / feather)
                pixels[x, y] = (r, g, b, alpha)
            # else: 保持完全不透明

    return img_rgba


def main():
    for src_rel, dst_rel in CONVERSIONS:
        src_path = os.path.join(ASSETS_DIR, src_rel)
        dst_path = os.path.join(ASSETS_DIR, dst_rel)

        if not os.path.exists(src_path):
            print(f'[SKIP] 未找到源文件: {src_path}')
            continue

        print(f'[处理] {src_rel} ...')
        img = Image.open(src_path)
        print(f'  原始尺寸: {img.size}, 模式: {img.mode}')

        bg_color = detect_background_color(img)
        print(f'  检测到背景色: RGB{bg_color}')

        img_rgba = remove_background(img, bg_color)
        img_rgba.save(dst_path, 'PNG', optimize=True)

        # 报告文件大小
        src_size = os.path.getsize(src_path) / 1024
        dst_size = os.path.getsize(dst_path) / 1024
        print(f'  保存: {dst_rel} ({dst_size:.0f} KB, 原 {src_size:.0f} KB)')

    print('\n全部完成！')


if __name__ == '__main__':
    main()
