"""Tiling surface textures for the town and the garage, at ~128 px/m (the game's architecture density), from CC0 Poly
Haven photos stylised by lowpix (`python3 -m lowpix photo polyhaven:<id> --style pixel-hd --size N -o src/<id>.png`,
src/ holds those outputs). This step cleans them (stray palette specks), sets their colour and contrast, and writes
public/textures/lowpix/world_arch/<name>.png:
  asphalt (4 m tile), park_ground (masa-do, 4 m), sand (sandbox, 4 m), paving (plaza slabs, 4 m),
  plywood (3.64 x 3.64 m: eight 91 x 182 cm sheets, each with its own grain shift and tone, seams and nail rows),
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


def neutral(a, contrast=0.6, mean=0.85):
    L = a.mean(2)
    L = L.mean() + (L - L.mean()) * contrast
    L = L * (mean / L.mean())
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
            sheet = grade(sheet, contrast=0.75, gain=(1.0 + k, 1.0, 1.0 - k))
            sheet *= rng.uniform(0.92, 1.05)
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


def main():
    save(grade(despeckle(load('asphalt_01')), contrast=0.8, gain=(0.97, 0.98, 1.02), mean=0.33, sat=0.35), 'asphalt')
    save(grade(despeckle(load('rocky_trail_02')), contrast=0.7, gain=(1.08, 1.02, 0.92), mean=0.56, sat=0.8), 'park_ground')
    save(grade(despeckle(load('sand_01')), contrast=0.45, gain=(1.05, 1.0, 0.9), mean=0.66, sat=0.8), 'sand')
    save(grade(despeckle(load('rectangular_paving')), contrast=0.3, gain=(1.0, 0.99, 0.97), mean=0.62, sat=0.3), 'paving')
    save(plywood(), 'plywood')
    save(neutral(despeckle(load('painted_plaster_wall')), contrast=0.22), 'detail_paint')
    save(neutral(despeckle(load('rusty_metal_02')), contrast=0.22), 'detail_metal')
    save(neutral(despeckle(load('weathered_planks')), contrast=0.25), 'detail_wood')


if __name__ == '__main__':
    main()
