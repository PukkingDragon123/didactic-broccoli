#!/usr/bin/env python3
"""Steam capsule art from a real in-game render: pixelate (2x), ordered-dither to a small palette, then set
the logo in Alagard at whole multiples of its pixel grid with a hard ink outline. No filters, no glows.

usage: python3 tools/steam-art.py RAW.png ALAGARD.ttf OUT_DIR
writes capsule_main_1232x706.png, header_920x430.png, small_462x174.png, vertical_748x896.png, library_600x900.png
"""
import re
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFont

# the game's own 5x7 bitmap font (src/gfx/font5x7.js), so small type sits on the same pixel grid as the art
_SRC = (Path(__file__).resolve().parent.parent / 'src/gfx/font5x7.js').read_text(encoding='utf-8')
FONT5 = {}
for m in re.finditer(r"(?:'(.)'|\b([A-Z0-9]))\s*:\s*'([.#|]+)'", _SRC):
    FONT5[m.group(1) or m.group(2)] = m.group(3).split('|')


def text5_w(s):
    return sum(len(FONT5.get(c, FONT5['?'])[0]) + 1 for c in s.upper()) - 1


def draw5(img, s, x, y, col, k=1):
    """The 5x7 font at k small pixels per font pixel."""
    d = ImageDraw.Draw(img)
    for c in s.upper():
        rows = FONT5.get(c, FONT5['?'])
        for ry, row in enumerate(rows):
            for rx, ch in enumerate(row):
                if ch == '#':
                    d.rectangle([x + rx * k, y + ry * k, x + rx * k + k - 1, y + ry * k + k - 1], fill=col)
        x += (len(rows[0]) + 1) * k


BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
INK = (26, 18, 22)
CREAM = (255, 244, 214)
GOLD = (255, 210, 63)
RED = (200, 50, 44)


def pixelate(img, scale, colors=96, amp=11, sat=1.15):
    """Box-downscale, ordered dither to an adaptive (octree) palette, return the small image. Octree keeps the
    small saturated areas (lanterns, signs) that median cut averages away."""
    w, h = img.size[0] // scale, img.size[1] // scale
    small = ImageEnhance.Color(img.convert('RGB')).enhance(sat).resize((w, h), Image.BOX)
    pal = small.quantize(colors=colors, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    palette = pal.getpalette()[: colors * 3]
    px = small.load()
    for y in range(h):
        for x in range(w):
            t = (BAYER4[y % 4][x % 4] / 16 - 0.5) * amp
            r, g, b = px[x, y]
            px[x, y] = (max(0, min(255, int(r + t))), max(0, min(255, int(g + t))), max(0, min(255, int(b + t))))
    pimg = Image.new('P', (1, 1))
    pimg.putpalette(palette + [0] * (768 - len(palette)))
    return small.quantize(palette=pimg, dither=Image.Dither.NONE).convert('RGB')


def outlined(draw, xy, text, font, fill, u=1, ink=INK):
    """Text with a hard ink outline u small pixels thick and a stepped drop shadow (no blur)."""
    x, y = xy
    for s in range(1, 2 * u + 1):
        draw.text((x + s, y + s + u), text, font=font, fill=ink)
    for dx in range(-u, u + 1):
        for dy in range(-u, u + 1):
            if dx or dy:
                draw.text((x + dx, y + dy), text, font=font, fill=ink)
    draw.text((x, y), text, font=font, fill=fill)


def logo(small, font_path, where='bottom-left', u=1, tag=True, big=None, tk=None):
    """Draw the logo onto the low-res canvas so it upscales with the art. u = small pixels per logo unit:
    Alagard is set at 32*u px (a multiple of its 16-px design size, so its pixels stay whole)."""
    d = ImageDraw.Draw(small)
    big = big or (32 * u if tag else 16 * u)
    f = ImageFont.truetype(font_path, big)
    W, H = small.size
    title1, title2 = 'GACHA', 'GARAGE'
    block_w = max(d.textlength(title1, font=f), d.textlength(title2, font=f))
    lh = big + 2 * u
    tk = tk or u  # small pixels per pixel of the 5x7 tagline
    tag_h = 14 * tk if tag else 0
    if where == 'bottom-left':
        x, y = 8 * u, H - lh * 2 - tag_h - 8 * u
    elif where == 'center':
        x, y = int(W - block_w) // 2, (H - lh * 2) // 2 - 4 * u
    else:  # top-left
        x, y = 8 * u, 6 * u
    outlined(d, (x, y), title1, f, GOLD, u)
    outlined(d, (x, y + lh), title2, f, CREAM, u)
    if tag:
        # a red price-sticker strip with the tagline in the 5x7 font, ink edge and a lighter top lip
        tagline = 'A CAPSULE-TOY SHOP IN A BACK LANE'
        k = tk
        tw = text5_w(tagline) * k
        ty = y + lh * 2 + 3 * u
        d.rectangle([x - k, ty - k, x + tw + 6 * k - 1, ty + 11 * k - 1], fill=INK)
        d.rectangle([x, ty, x + tw + 5 * k - 1, ty + 9 * k - 1], fill=RED)
        d.rectangle([x + k, ty + k, x + tw + 4 * k - 1, ty + 2 * k - 1], fill=(226, 92, 76))
        draw5(small, tagline, x + 3 * k, ty + 2 * k, CREAM, k)
    return small


def make(raw, font_path, out, size, scale, where, u, big=None, tag=None, tk=None):
    W, H = size
    # cover-crop the raw render to the target aspect
    rw, rh = raw.size
    k = max(W / rw, H / rh)
    img = raw.resize((round(rw * k), round(rh * k)), Image.LANCZOS)
    ox, oy = (img.width - W) // 2, (img.height - H) // 2
    img = img.crop((ox, oy, ox + W, oy + H))
    small = pixelate(img, scale)
    small = logo(small, font_path, where, u, tag=(W >= 900) if tag is None else tag, big=big, tk=tk)
    final = small.resize((small.width * scale, small.height * scale), Image.NEAREST)
    canvas = Image.new('RGB', (W, H), INK)
    canvas.paste(final, ((W - final.width) // 2, (H - final.height) // 2))
    canvas.save(out)
    print('wrote', out)


if __name__ == '__main__':
    raw_path, font_path, out_dir = sys.argv[1:4]
    raw = Image.open(raw_path).convert('RGB')
    out = Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    make(raw, font_path, out / 'capsule_main_1232x706.png', (1232, 706), 2, 'bottom-left', 2)
    make(raw, font_path, out / 'header_920x430.png', (920, 430), 2, 'bottom-left', 1, big=48, tk=1)
    make(raw, font_path, out / 'small_462x174.png', (462, 174), 2, 'center', 1, big=32)
    # portrait capsules: the shop front cropped tall, the logo low over the road
    make(raw, font_path, out / 'vertical_748x896.png', (748, 896), 2, 'bottom-left', 2, tag=True, tk=1)
    make(raw, font_path, out / 'library_600x900.png', (600, 900), 2, 'bottom-left', 1, big=48, tag=True, tk=1)
