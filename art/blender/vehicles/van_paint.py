"""Paints the candy van's livery and kit textures (pixel art, 256 px/m): the roof sign boards and the side panels of the
sweets wholesaler the van came from (丸福製菓, Marufuku Confectionery: FREE CANDY, it says, and Gen-san honours it), and
the tray's wood. Type: GG Display and Alagard (tools/pixprint.py), DotGothic16 for kana / kanji, native grid or whole
multiples, hard pixel outlines only.   python3 -I art/blender/vehicles/van_paint.py -> out/tex/candy_*.png, wood.png"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from packer_paint import C, jp, lat, outline, hcat, rng, ell, swatch, OUT, TILE  # noqa: E402  (shared helpers)

P = 256
CREAM, PINK, PINK_D, PINK_L, RED, INK, MINT = C('#f4ead2'), C('#e2729c'), C('#b4486e'), C('#f2a0bf'), C('#b8283a'), C('#3a1a22'), C('#7cc8b0')


def stamp(im, m, cx, top, col):
    h, w = m.shape
    x0 = int(round(cx - w / 2))
    im[top:top + h, x0:x0 + w][m] = col


def brush(im, k=0.035, density=1 / 140, mask=None):
    H, W = im.shape[:2]
    up, dn = Image.new('L', (W, H)), Image.new('L', (W, H))
    du, dd = ImageDraw.Draw(up), ImageDraw.Draw(dn)
    for _ in range(int(W * H * density)):
        cx, cy, a, b = rng.uniform(0, W), rng.uniform(0, H), rng.uniform(5, 11), rng.uniform(1, 2)
        ell(du if rng.random() < 0.5 else dd, cx, cy, a, b)
    mul = 1 + k * ((np.asarray(up) > 0).astype(np.float32) - (np.asarray(dn) > 0).astype(np.float32))
    if mask is not None: mul[~mask] = 1
    im *= mul[..., None]


def wear(im, n=6):
    """A few lobed chips at the edges and soft dirt lobes along the bottom (shapes, never single pixels)."""
    H, W = im.shape[:2]
    lay = Image.new('L', (W, H))
    d = ImageDraw.Draw(lay)
    x = 0
    while x < W:
        r = rng.uniform(3, 8)
        ell(d, x, H - 1, r, rng.uniform(2, 6))
        x += r * rng.uniform(0.8, 1.6)
    m = np.asarray(lay) > 0
    im[m] = im[m] * 0.75 + C('#5a4a3a') * 0.25
    for _ in range(n):
        cx, cy, r = rng.uniform(4, W - 4), rng.choice([rng.uniform(2, 6), rng.uniform(H - 7, H - 3)]), rng.uniform(2, 3.5)
        t = np.linspace(0, 6.28, 12, endpoint=False)
        ph = rng.uniform(0, 6.28)
        pts = [(cx + np.cos(a) * r * (1 + 0.3 * np.sin(3 * a + ph)), cy + np.sin(a) * r * (1 + 0.3 * np.sin(3 * a + ph))) for a in t]
        l2 = Image.new('L', (W, H)); ImageDraw.Draw(l2).polygon(pts, fill=255)
        l3 = Image.new('L', (W, H)); ImageDraw.Draw(l3).polygon([(cx + (px - cx) * 0.5, cy + (py - cy) * 0.5) for px, py in pts], fill=255)
        im[np.asarray(l2) > 0] = C('#3a2e28')
        im[np.asarray(l3) > 0] = C('#cfc8b8')


def board():
    """The roof sign: 1.5 x 0.40 m, both faces alike."""
    W, H = int(1.5 * P), int(0.40 * P)
    im = np.zeros((H, W, 3), np.float32) + PINK
    im[:4] = CREAM; im[-4:] = CREAM; im[:, :4] = CREAM; im[:, -4:] = CREAM
    im[4:5, 4:-4] = PINK_L; im[-5:-4, 4:-4] = PINK_D
    # candy-stripe ends
    gy, gx = np.mgrid[0:H, 0:W]
    for x0 in (8, W - 44):
        m = (gx >= x0) & (gx < x0 + 36) & (gy >= 8) & (gy < H - 8)
        st = m & (((gx + gy) // 8) % 2 == 0)
        im[m] = CREAM; im[st] = RED
    name = jp('丸福製菓', 2)
    stamp(im, outline(name, 2), W // 2, 10 - 2, CREAM)
    stamp(im, outline(name, 1), W // 2, 10 - 1, INK)
    stamp(im, name, W // 2, 10, RED)
    fc = lat('FREE CANDY', 'ggd', 2)
    stamp(im, outline(fc, 2), W // 2, 52 - 2, INK)
    stamp(im, fc, W // 2, 52, CREAM)
    brush(im)
    wear(im)
    Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'candy_board.png'))


def side():
    """The side panels (1.40 x 0.32 m, under the windows): the old sign-painting, a little faded and chipped."""
    W, H = int(1.40 * P), int(0.32 * P)
    im = np.zeros((H, W, 3), np.float32) + CREAM
    im[:3] = PINK_D; im[-3:] = PINK_D
    im[5:9] = PINK; im[-9:-5] = PINK
    fc = lat('FREE CANDY', 'ggd', 2)
    stamp(im, outline(fc, 2), W // 2, 14 - 2, INK)
    stamp(im, fc, W // 2, 14, PINK)
    sub = hcat(jp('丸福製菓'), jp('だがし・おかし問屋'), lat('TEL 3-0151', 'ala'), gap=14)
    stamp(im, sub, W // 2, 54, RED)
    brush(im, k=0.03)
    wear(im, 5)
    Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'candy_side.png'))


def tag():
    """The card on the tray's rim: ご自由に (help yourself), 0.28 x 0.075 m."""
    W, H = 72, 20
    im = np.zeros((H, W, 3), np.float32) + CREAM
    im[0] = PINK_D; im[-1] = PINK_D; im[:, 0] = PINK_D; im[:, -1] = PINK_D
    t = jp('ご自由に')
    stamp(im, t, W // 2, (H - t.shape[0]) // 2, RED)
    Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'candy_tag.png'))


def wood(im):
    """Planks: grain strokes along u, a plank seam every 48 px with its lit edge."""
    for y in range(0, TILE, 48):
        im[y] = C('#5a3a22'); im[(y + 1) % TILE] = C('#c8945c')
    lay = Image.new('L', (TILE * 3, TILE))
    d = ImageDraw.Draw(lay)
    for _ in range(90):
        cx, cy = rng.uniform(0, TILE), rng.uniform(0, TILE)
        for ox in (0, TILE, 2 * TILE): d.line([(cx + ox - rng.uniform(8, 20), cy), (cx + ox + rng.uniform(8, 20), cy)], fill=255, width=2)
    m = np.asarray(lay)[:, TILE:2 * TILE] > 0
    im[m] *= 0.88


board(); side(); tag()
swatch('wood', C('#a8743f'), spots=(C('#8a5a30'), 14, 3, 8, 0.5), draw=wood)
swatch('enamel', C('#e9e2cc'), spots=(C('#d4ccb4'), 12, 4, 9, 0.5))
print('painted candy textures')
