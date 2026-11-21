"""Paint the printed labels of converted models in the game's pixel fonts (CLAUDE.md: every font is pixel art; real
brands become original ones). Each entry: the model id, rectangles of its atlas holding the source's printed words
(cleared to the panel's own colour) and the new words, set in the 5x7 font (b5, tools/pixprint.py) or DotGothic16.
  python3 art/lowpix/world/made/retouch.py <work dir> [id ...]   (extracts, paints, re-applies with retouch.mjs)
Redo after a model is re-converted (the atlas layout changes): check the rectangles against the new atlas first.
"""
import os, sys, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from pixprint import line_mask  # noqa: E402

DOT = os.path.join(ROOT, 'shots', '.art-cache', 'fonts', 'DotGothic16-Regular.ttf')
WHITE, GREEN, DGREEN = (246, 242, 232), (64, 138, 52), (40, 96, 40)

# model id: [('clear', x0, y0, x1, y1) | ('b5', text, x, y, scale, colour) | ('dot', text, cx, y, colour)]
JOBS = {
    # the red extinguisher cabinet: its Chinese labels become 消火器 (DotGothic16) and 119 / FIRE (5x7)
    'fire_box': [('clear', 160, 182, 216, 214), ('clear', 288, 183, 341, 214), ('clear', 392, 174, 457, 197),
                 ('clear', 310, 343, 365, 373), ('clear', 418, 343, 455, 373),
                 ('dot', '消火器', 188, 184, WHITE), ('b5', 'FIRE', 177, 204, 1, WHITE),
                 ('dot', '消火器', 314, 184, WHITE), ('b5', '119', 328, 349, 2, WHITE), ('b5', 'FIRE', 425, 352, 1, WHITE)],
    # the fertiliser sack: a real maker's name becomes our own HANA plant food
    'fertiliser_bag': [('clear', 68, 278, 137, 321), ('clear', 179, 273, 233, 315), ('clear', 315, 270, 407, 314),
                       ('b5', 'HANA', 78, 285, 2, GREEN), ('b5', 'PLANT FOOD', 72, 306, 1, DGREEN),
                       ('b5', 'HANA', 182, 282, 2, GREEN), ('b5', 'FOOD', 184, 302, 1, DGREEN),
                       ('b5', 'HANA', 336, 280, 2, GREEN), ('b5', 'PLANT FOOD', 330, 300, 1, DGREEN)],
    # the paper chochin (Ramen Yamada's lantern): its brushed そば redrawn in DotGothic16, stacked vertically
    'lantern_paper': [('clear', 80, 8, 100, 106), ('clear', 48, 104, 88, 212),
                      ('dotv', 'そば', 67, 118, 2, (34, 28, 30))],
    # the milk carton: its smooth-font REAL MILK becomes MILK in the 5x7 font, on both faces
    'milk_carton2': [('clear', 83, 58, 121, 82), ('clear', 123, 58, 162, 82),
                     ('b5', 'MILK', 85, 64, 1, (60, 130, 230)), ('b5', 'MILK', 125, 64, 1, (60, 130, 230))],
}


def ring_colour(a, x0, y0, x1, y1):
    """The panel's own colour: the median of a 2-texel ring just outside the rectangle."""
    h, w = a.shape[:2]
    xs0, ys0, xs1, ys1 = max(0, x0 - 2), max(0, y0 - 2), min(w, x1 + 2), min(h, y1 + 2)
    ring = np.concatenate([a[ys0:y0, xs0:xs1].reshape(-1, a.shape[2]), a[y1:ys1, xs0:xs1].reshape(-1, a.shape[2]),
                           a[ys0:ys1, xs0:x0].reshape(-1, a.shape[2]), a[ys0:ys1, x1:xs1].reshape(-1, a.shape[2])])
    return np.median(ring, axis=0).astype(np.uint8)


def paint(png, ops):
    im = Image.open(png).convert('RGBA')
    a = np.array(im)
    rng = np.random.default_rng(7)
    for op in ops:
        if op[0] == 'clear':
            _, x0, y0, x1, y1 = op
            c = ring_colour(a, x0, y0, x1, y1).astype(np.int16)
            # the panel colour with a faint 1-texel grain (no flat patch), alpha kept
            g = rng.integers(-5, 6, size=(y1 - y0, x1 - x0, 1))
            a[y0:y1, x0:x1, :3] = np.clip(c[:3] + g, 0, 255).astype(np.uint8)
    im = Image.fromarray(a)
    for op in ops:
        if op[0] == 'b5':
            _, s, x, y, k, col = op
            m, _, _, _ = line_mask(s, 'b5')
            for yy, xx in zip(*np.nonzero(m)):
                for dy in range(k):
                    for dx in range(k): im.putpixel((x + xx * k + dx, y + yy * k + dy), col + (255,))
        elif op[0] == 'dot':
            _, s, cx, y, col = op
            f = ImageFont.truetype(DOT, 16)
            layer = Image.new('L', im.size, 0)
            d = ImageDraw.Draw(layer)
            d.fontmode = '1'  # hard pixels, no anti-aliasing
            w = d.textlength(s, font=f)
            d.text((int(cx - w / 2), y), s, font=f, fill=255)
            im.paste(Image.new('RGBA', im.size, col + (255,)), (0, 0), layer)
        elif op[0] == 'dotv':  # vertical (tategaki), each glyph at its 16 px grid scaled by k
            _, s, cx, y, k, col = op
            f = ImageFont.truetype(DOT, 16)
            for i, ch in enumerate(s):
                g = Image.new('L', (32, 32), 0)
                d = ImageDraw.Draw(g)
                d.fontmode = '1'
                x0, y0, x1, y1 = d.textbbox((0, 0), ch, font=f)
                d.text((8 - x0 + (16 - (x1 - x0)) // 2, 8 - y0 + (16 - (y1 - y0)) // 2), ch, font=f, fill=255)
                g = g.crop((8, 8, 24, 24)).resize((16 * k, 16 * k), Image.NEAREST)
                im.paste(Image.new('RGBA', g.size, col + (255,)), (cx - 8 * k, y + i * 17 * k), g)
    im.save(png)


if __name__ == '__main__':
    work = sys.argv[1] if len(sys.argv) > 1 else '/tmp/retouch'
    os.makedirs(work, exist_ok=True)
    tool = os.path.join(os.path.dirname(__file__), 'retouch.mjs')
    only = sys.argv[2:]
    for mid, ops in JOBS.items():
        if only and mid not in only: continue
        png = os.path.join(work, mid + '.png')
        subprocess.run(['node', tool, 'extract', mid, png], check=True, cwd=ROOT)
        paint(png, ops)
        subprocess.run(['node', tool, 'apply', mid, png], check=True, cwd=ROOT)
