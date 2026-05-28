#!/usr/bin/env python3
"""
convert_sprites.py — 纯 PIL 实现：将 items.zip 中的高分辨率 JPG 去灰底转为 RGBA PNG
"""

import zipfile
import io
import os
import sys
from PIL import Image, ImageFilter

ZIP_PATH = '/data/adfa356a-de4a-40cb-b325-e06a264a24a2/assets/upload/items.zip'
ASSETS_DIR = '/data/adfa356a-de4a-40cb-b325-e06a264a24a2/english-parkour/client/public/assets'

SPRITE_CONFIG = {
    'characters/run-sheet.jpg':   {'tolerance': 50, 'feather': 1},
    'characters/pose-sheet.jpg':  {'tolerance': 35, 'feather': 1},
    'items/items-strip.jpg':      {'tolerance': 55, 'feather': 2},
    'vfx/vfx-strip.jpg':          {'tolerance': 30, 'feather': 1},
}

def detect_bg_color(img):
    """从图片边缘采样主导背景色"""
    w, h = img.size
    thickness = max(1, min(w, h) // 40)
    pixels = []

    # 四条边采样
    for x in range(0, w, 3):
        for y in range(0, thickness):
            pixels.append(img.getpixel((x, y)))
            pixels.append(img.getpixel((x, h - 1 - y)))
    for y in range(0, h, 3):
        for x_d in range(0, thickness):
            pixels.append(img.getpixel((x_d, y)))
            pixels.append(img.getpixel((w - 1 - x_d, y)))

    # 中位数（比均值更稳健）
    r = sorted(p[0] for p in pixels)[len(pixels) // 2]
    g = sorted(p[1] for p in pixels)[len(pixels) // 2]
    b = sorted(p[2] for p in pixels)[len(pixels) // 2]
    return (r, g, b)

def remove_background(img, tolerance, bg_color, feather=1):
    """纯 PIL：基于色彩距离生成 alpha 通道"""
    r_bg, g_bg, b_bg = bg_color

    # 为每个像素计算到背景色的距离，建立 alpha 掩膜
    src = img.convert('RGB')
    w, h = src.size

    # 创建灰度图作为 alpha
    alpha = Image.new('L', (w, h))
    src_px = src.load()
    alpha_px = alpha.load()

    max_dist = tolerance * 3  # 归一化范围

    for y in range(h):
        for x in range(w):
            pr, pg, pb = src_px[x, y]
            dr = pr - r_bg
            dg = pg - g_bg
            db = pb - b_bg
            dist = (dr * dr + dg * dg + db * db) ** 0.5
            # 距离越大 → 越不透明
            a = min(255, int(dist / max_dist * 255))
            alpha_px[x, y] = a

    # 柔和羽化
    if feather > 0:
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=feather))

    # 组合 RGBA
    result = src.convert('RGBA')
    result.putalpha(alpha)
    return result

def main():
    if not os.path.exists(ZIP_PATH):
        print(f'ERROR: {ZIP_PATH} not found')
        sys.exit(1)

    z = zipfile.ZipFile(ZIP_PATH)
    print(f'Opening {ZIP_PATH}')
    print(f'Contents: {z.namelist()}\n')

    for zip_path, config in SPRITE_CONFIG.items():
        if zip_path not in z.namelist():
            print(f'SKIP: {zip_path} not in zip')
            continue

        print(f'--- Processing {zip_path} ---')
        jpg_data = z.read(zip_path)
        img = Image.open(io.BytesIO(jpg_data)).convert('RGB')
        w, h = img.size
        print(f'  Original: {w}x{h}')

        bg_color = detect_bg_color(img)
        print(f'  Detected BG: RGB{bg_color}')

        result = remove_background(img, config['tolerance'], bg_color, config['feather'])
        print(f'  Result: {result.size} {result.mode}')

        # 输出
        rel = zip_path.replace('.jpg', '.png')
        out = os.path.join(ASSETS_DIR, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        result.save(out, 'PNG', optimize=True)
        print(f'  Saved: {out} ({os.path.getsize(out)/1024:.1f} KB)')

        # 验证
        alpha_ch = result.getchannel('A')
        alpha_data = list(alpha_ch.getdata())
        transparent = sum(1 for a in alpha_data if a < 128) / len(alpha_data)
        print(f'  Transparent pixels: {transparent:.1%}\n')

    z.close()

    # 验证最终文件
    print('=== Verification ===')
    for zip_path in SPRITE_CONFIG:
        png_path = os.path.join(ASSETS_DIR, zip_path.replace('.jpg', '.png'))
        if os.path.exists(png_path):
            img = Image.open(png_path)
            print(f'  {png_path}: {img.size} {img.mode} OK')
        else:
            print(f'  {png_path}: MISSING!')

    print('\n=== Done ===')

if __name__ == '__main__':
    main()
