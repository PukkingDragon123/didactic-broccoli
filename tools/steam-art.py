#!/usr/bin/env python3
"""Steam capsule art from a real in-game render: pixelate (4x), ordered-dither to a small palette, then set
the logo in Alagard at its native pixel grid with a hard ink outline. No filters, no glows.

usage: python3 tools/steam-art.py RAW.png ALAGARD.ttf OUT_DIR
writes capsule_main_1232x706.png, header_920x430.png, small_462x174.png
"""
import re
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

# the game's own 5x7 bitmap font (src/gfx/font5x7.js), so small type sits on the same pixel grid as the art
_SRC = (Path(__file__).resolve().parent.parent / 'src/gfx/font5x7.js').read_text(encoding='utf-8')
FONT5 = {}
for m in re.finditer(r"(?:'(.)'|\b([A-Z0-9]))\s*:\s*'([.#|]+)'", _SRC):
    FONT5[m.group(1) or m.group(2)] = m.group(3).split('|')


def text5_w(s):
    return sum(len(FONT5.get(c, FONT5['?'])[0]) + 1 for c in s.upper()) - 1


def draw5(img, s, x, y, col):
    px = img.load()
    for c in s.upper():
        rows = FONT5.get(c, FONT5['?'])
        for ry, row in enumerate(rows):
            for rx, ch in enumerate(row):
                if ch == '#' and 0 <= x + rx < img.width and 0 <= y + ry < img.height:
                    px[x + rx, y + ry] = col
        x += len(rows[0]) + 1

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
INK = (26, 18, 22)
CREAM = (255, 244, 214)
GOLD = (255, 210, 63)
RED = (200, 50, 44)


def pixelate(img, scale, colors=40):
    """Box-downscale, ordered dither to an adaptive palette, return the small image."""
    w, h = img.size[0] // scale, img.size[1] // scale
    small = img.convert('RGB').resize((w, h), Image.BOX)
    pal = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    palette = pal.getpalette()[: colors * 3]
    px = small.load()
    for y in range(h):
        for x in range(w):
            t = (BAYER4[y % 4][x % 4] / 16 - 0.5) * 18
            r, g, b = px[x, y]
            px[x, y] = (max(0, min(255, int(r + t))), max(0, min(255, int(g + t))), max(0, min(255, int(b + t))))
    pimg = Image.new('P', (1, 1))
    pimg.putpalette(palette + [0] * (768 - len(palette)))
    return small.quantize(palette=pimg, dither=Image.Dither.NONE).convert('RGB')


def outlined(draw, xy, text, font, fill, ink=INK, shadow=2):
    x, y = xy
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx or dy:
                draw.text((x + dx, y + dy), text, font=font, fill=ink)
    for s in range(1, shadow + 1):
        draw.text((x + s, y + s + 1), text, font=font, fill=ink)
    draw.text((x, y), text, font=font, fill=fill)


def logo(small, font_path, where='bottom-left', big=16, tag=True):
    """Draw the logo onto the low-res canvas so it upscales with the art."""
    d = ImageDraw.Draw(small)
    f = ImageFont.truetype(font_path, big)
    t = ImageFont.truetype(font_path, 16) if big > 16 else f
    W, H = small.size
    title1, title2 = 'GACHA', 'GARAGE'
    w1 = d.textlength(title1, font=f); w2 = d.textlength(title2, font=f)
    lh = big + 2
    block_w = max(w1, w2)
    if where == 'bottom-left':
        x, y = 8, H - lh * 2 - (14 if tag else 0) - 8
    elif where == 'center':
        x, y = (W - block_w) // 2, (H - lh * 2) // 2 - 4
    else:  # top-left
        x, y = 8, 6
    outlined(d, (x, y), title1, f, GOLD)
    outlined(d, (x, y + lh), title2, f, CREAM)
    if tag and W >= 280:
        # a red price-sticker strip with the tagline in the 5x7 font, ink edge and a hard 1-px drop
        tagline = 'A CAPSULE-TOY SHOP IN A BACK LANE'
        tw = text5_w(tagline)
        ty = y + lh * 2 + 3
        d.rectangle([x - 1, ty - 1, x + tw + 6, ty + 11], fill=INK)
        d.rectangle([x, ty, x + tw + 5, ty + 9], fill=RED)
        d.line([x + 1, ty + 1, x + tw + 4, ty + 1], fill=(226, 92, 76))
        draw5(small, tagline, x + 3, ty + 2, CREAM)
    return small


def make(raw, font_path, out, size, scale, where, big):
    W, H = size
    # cover-crop the raw render to the target aspect
    rw, rh = raw.size
    k = max(W / rw, H / rh)
    img = raw.resize((round(rw * k), round(rh * k)), Image.LANCZOS)
    ox, oy = (img.width - W) // 2, (img.height - H) // 2
    img = img.crop((ox, oy, ox + W, oy + H))
    small = pixelate(img, scale)
    small = logo(small, font_path, where, big, tag=W >= 900)
    final = small.resize((small.width * scale, small.height * scale), Image.NEAREST)
    canvas = Image.new('RGB', (W, H), INK)
    canvas.paste(final, ((W - final.width) // 2, (H - final.height) // 2))
    canvas.save(out)
    print('wrote', out)


if __name__ == '__main__':
    raw_path, font_path, out_dir = sys.argv[1:4]
    raw = Image.open(raw_path).convert('RGB')
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    make(raw, font_path, out / 'capsule_main_1232x706.png', (1232, 706), 4, 'bottom-left', 32)
    make(raw, font_path, out / 'header_920x430.png', (920, 430), 4, 'bottom-left', 32)
    make(raw, font_path, out / 'small_462x174.png', (462, 174), 3, 'center', 16)
