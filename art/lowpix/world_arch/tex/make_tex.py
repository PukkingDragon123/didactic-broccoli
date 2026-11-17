"""Tiling surface textures for the town and the garage, at ~128 px/m (the game's architecture density), from CC0 Poly
Haven photos stylised by lowpix (`python3 -m lowpix photo polyhaven:<id> --style pixel-hd --size N -o src/<id>.png`,
src/ holds those outputs). This step cleans them (stray palette specks), sets their colour and contrast, and writes
public/textures/lowpix/world_arch/<name>.png:
  asphalt (4 m tile), concrete (kerbs, strips, aprons, 4 m), park_ground (masa-do, 4 m), sand (sandbox, 4 m), paving (plaza slabs, 4 m),
  cblock (concrete-block walls, 4 m), plywood (3.64 x 3.64 m: eight 91 x 182 cm sheets, each with its own grain shift and tone, seams and nail rows),
  detail_paint / detail_metal / detail_wood (2 m, neutral grey, mean 0.85: multiplied by a material's colour and
  vertex tint, so the town's plain painted, metal and wooden parts get real surface detail instead of a flat colour).
Run: python3 art/lowpix/world_arch/tex/make_tex.py
"""
import os

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
OUT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'public', 'textures', 'lowpix', 'world_arch'))
os.makedirs(OUT, exist_ok=True)


def load(name):
    return np.asarray(Image.open(os.path.join(SRC, name + '.png')).convert('RGB')).astype(np.float32) / 255.0


def despeckle(a, sat_max=0.35):
    """Replace isolated saturated specks (palette artefacts: yellow / orange dots) with the 3x3 median."""
    mx, mn = a.max(2), a.min(2)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    med = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3))).astype(np.float32) / 255
    msat = np.median(sat)
    bad = sat > max(sat_max, msat + 0.25)
    a = a.copy()
    a[bad] = med[bad]
    return a


def grade(a, contrast=1.0, gain=(1, 1, 1), mean=None, sat=1.0):
    m = a.reshape(-1, 3).mean(0)
    a = m + (a - m) * contrast
    if sat != 1.0:
        L = a.mean(2, keepdims=True)
        a = L + (a - L) * sat
    a = a * np.array(gain, np.float32)
    if mean is not None:
        a = a * (mean / max(1e-3, a.mean()))
    return np.clip(a, 0, 1)


def neutral(a, contrast=0.06, mean=0.85):
    """Luminance only, normalised: mean 0.85, standard deviation `contrast` (so every detail map has the same strength)."""
    L = a.mean(2)
    L = mean + (L - L.mean()) / max(1e-3, L.std()) * contrast
    return np.clip(np.stack([L, L, L], 2), 0, 1)


def save(a, name, size=None):
    im = Image.fromarray((a * 255 + 0.5).astype(np.uint8))
    if size:
        im = im.resize(size, Image.NEAREST)
    im = im.quantize(256, dither=Image.Dither.NONE).convert('RGB')
    im.save(os.path.join(OUT, name + '.png'), optimize=True)
    print(name, im.size)


def plywood():
    """Eight 3x6 sheets (91 x 182 cm) on a 468 x 466 px tile (128 px/m), each cut from a different place in the grain
    photo with its own tone, a dark seam between sheets and a faint row of nail heads along the edges."""
    src = np.ascontiguousarray(np.rot90(load('plywood')))  # face grain runs up the sheet
    H, W = src.shape[:2]
    pw, ph = 117, 233
    tile = np.zeros((2 * ph, 4 * pw, 3), np.float32)
    rng = np.random.default_rng(1999)
    for j in range(2):
        for i in range(4):
            ox, oy = rng.integers(0, W - pw), rng.integers(0, H - ph)
            sheet = src[oy:oy + ph, ox:ox + pw].copy()
            if rng.random() < 0.5:
                sheet = sheet[:, ::-1]
            k = rng.uniform(-0.04, 0.04)
            # light lauan / birch ply: the photo's grain kept faint, pulled to a pale warm tan
            sheet = grade(sheet, contrast=0.3, sat=0.55, mean=0.66)
            sheet = sheet * np.array([1.08 + k, 0.98, 0.8 - k], np.float32)
            sheet *= rng.uniform(0.95, 1.04)
            # the seam: a dark line on the left and top edge, a lit line just inside it
            sheet[:, 0] *= 0.55
            sheet[0, :] *= 0.55
            sheet[:, 1] *= 1.08
            sheet[1, :] *= 1.08
            for y in range(12, ph - 6, 19):  # nail heads down both long edges
                for x in (4, pw - 5):
                    sheet[y, x] *= 0.62
                    sheet[y - 1, x] *= 1.1
            tile[j * ph:(j + 1) * ph, i * pw:(i + 1) * pw] = sheet
    return np.clip(tile, 0, 1)


def cblock():
    """Japanese concrete-block wall (コンクリートブロック塀): 40 x 20 cm blocks in stretcher bond on a 4 m tile (512 px),
    each block its own tone, struck mortar joints with a lit lower lip, efflorescence and rain streaks."""
    base = grade(despeckle(load('concrete_wall_003')), contrast=0.32, gain=(1.0, 0.99, 0.95), mean=0.6, sat=0.25)
    H, W = base.shape[:2]
    out = base.copy()
    rng = np.random.default_rng(1964)
    rows = 20
    for r in range(rows):
        y0, y1 = int(r * H / rows), int((r + 1) * H / rows)
        off = 0.5 if r % 2 else 0.0
        for c in range(-1, 11):
            x0, x1 = int((c + off) * W / 10), int((c + 1 + off) * W / 10)
            xa, xb = max(0, x0), min(W, x1)
            if xb <= xa:
                continue
            out[y0:y1, xa:xb] *= rng.uniform(0.9, 1.08)
        out[y0, :] *= 0.62            # bed joint
        out[min(H - 1, y0 + 1), :] *= 0.85
        out[max(0, y1 - 1), :] *= 1.08  # the lit lower edge of the block above
        for c in range(11):
            x = int((c + off) * W / 10) % W
            out[y0:y1, x] *= 0.62     # head joints
            out[y0:y1, (x + 1) % W] *= 1.06
    for _ in range(14):               # efflorescence / rain streaks running down from the joints
        x, y, L = rng.integers(0, W), rng.integers(0, H), rng.integers(20, 120)
        out[y:min(H, y + L), x:x + 2] *= rng.choice([0.85, 1.12])
    return np.clip(out, 0, 1)


def main():
    save(cblock(), 'cblock')
    save(grade(despeckle(load('asphalt_01')), contrast=0.8, gain=(0.97, 0.98, 1.02), mean=0.33, sat=0.35), 'asphalt')
    save(grade(despeckle(load('rocky_trail_02')), contrast=0.7, gain=(1.08, 1.02, 0.92), mean=0.56, sat=0.8), 'park_ground')
    save(grade(despeckle(load('sand_01')), contrast=0.45, gain=(1.05, 1.0, 0.9), mean=0.66, sat=0.8), 'sand')
    save(grade(despeckle(load('rectangular_paving')), contrast=0.3, gain=(1.0, 0.99, 0.97), mean=0.62, sat=0.3), 'paving')
    save(grade(despeckle(load('concrete_wall_003')), contrast=0.55, gain=(1.0, 0.99, 0.96), mean=0.62, sat=0.4), 'concrete')
    save(plywood(), 'plywood')
    save(neutral(despeckle(load('painted_plaster_wall')), contrast=0.06), 'detail_paint')
    save(neutral(despeckle(load('rusty_metal_02')), contrast=0.06), 'detail_metal')
    save(neutral(despeckle(load('weathered_planks')), contrast=0.07), 'detail_wood')


if __name__ == '__main__':
    main()
