"""HD surface textures: the close-up surfaces of the game (floors, walls, ceilings, counters, wood, plaster, concrete,
metal, roads) as high-res pixel art at 256 px/m (the standard in docs/ART.md, "Texel density"), photo-bashed from
CC0 Poly Haven photos (fetched at 2k by hdlib.photo; every asset used is listed in sources.json and credited).

Each recipe lays its surface out at 256 px per metre (tiles cut and toned one by one, planks cut from the grain photo,
blocks from the concrete photo...), paints it over (kuwahara), turns it into pixel art on a limited palette, then
places pixel strokes by hand-written rules (grout lines with a lit and a shaded edge, seams, nail heads, chipped
corners, hairline cracks, stains), so a tile repeats only every 2-4 m and nothing reads as a photo or as noise.

Writes public/textures/hd/<key>.webp (lossless) and src/gfx/hdtex.manifest.json ({key: {m: [w, h] metres, px: [w, h]}}).
The game picks these up wherever the recipe key was used (src/gfx/hdtex.js: pixMat, surfMat, shopMat, the rooms).
Run: python3 art/lowpix/world_arch/hd/make_hd.py [key ...]
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hdlib as L  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(ROOT, 'public', 'textures', 'hd')
MANIFEST = os.path.join(ROOT, 'src', 'gfx', 'hdtex.manifest.json')
PPM = 256
RECIPES = {}


def recipe(key, metres):
    def deco(fn):
        RECIPES[key] = (fn, metres)
        return fn
    return deco


def px(m):
    return int(round(m * PPM))


def grid(n_px, count):
    """Integer edges of `count` cells across n_px (cells differ by a pixel here and there, like hand-laid tiles)."""
    return [int(round(i * n_px / count)) for i in range(count + 1)]


# ------------------------------------------------------------------ tiles
def tile_layout(W, H, nx, ny, faces, rng, face_src=None, face_contrast=0.5, jitter=0.05, grout=(0.6, 0.58, 0.54), gw=2):
    """Faces of nx x ny tiles (each cut from `face_src`, a photo at 256 px/m, at a random spot and toned to
    faces[(i + j) % len(faces)] with its own jitter) over grout. -> (float image, cells [(x0, y0, w, h)])."""
    xs, ys = grid(W, nx), grid(H, ny)
    a = np.zeros((H, W, 3), np.float32)
    a[:] = grout
    cells = []
    for j in range(ny):
        for i in range(nx):
            x0, y0 = xs[i] + gw // 2, ys[j] + gw // 2
            w, h = xs[i + 1] - xs[i] - gw, ys[j + 1] - ys[j] - gw
            if w <= 2 or h <= 2:
                continue
            col = np.array(L.hexrgb(faces[(i + j) % len(faces)]), np.float32) * (1 + rng.normal(0, jitter))
            if face_src is not None:
                p = L.cut(face_src, int(rng.integers(0, face_src.shape[1])), int(rng.integers(0, face_src.shape[0])), w, h, int(rng.integers(0, 4)) if w == h else 0)
                pl = L.lum(p)[..., None]
                p = col * (1 + (pl / max(pl.mean(), 1e-3) - 1) * face_contrast)
            else:
                p = np.ones((h, w, 3), np.float32) * col
            a[y0:y0 + h, x0:x0 + w] = np.clip(p, 0, 1)
            cells.append((x0, y0, w, h))
    return a, cells


def tile_strokes(a, cells, rng, grout, gw=2, bevel=(1.1, 0.86), chip=0.08, crackp=0.03, grime=None, grime_k=0.3):
    """Hand-placed strokes on the pixel-art tiles: crisp grout (dirtier where the grime is), a lit top-left and a
    shaded bottom-right edge on every tile, chipped corners, the odd hairline crack."""
    H, W = a.shape[:2]
    mask = np.ones((H, W), bool)
    for (x0, y0, w, h) in cells:
        mask[y0:y0 + h, x0:x0 + w] = False
    g = np.ones((H, W), np.float32) if grime is None else 1 + (L.lum(grime) / max(L.lum(grime).mean(), 1e-3) - 1) * grime_k
    gc = np.array(grout, np.float32)[None, :] * g[mask][:, None]
    a[mask] = np.clip(gc, 0, 1)
    for (x0, y0, w, h) in cells:
        m = a[y0 + 1:y0 + h - 1, x0 + 1:x0 + w - 1].reshape(-1, 3).mean(0)
        a[y0, x0:x0 + w] = m * bevel[0]  # solid strokes: the tile's own colour, lit / shaded
        a[y0:y0 + h, x0] = m * bevel[0]
        a[y0 + h - 1, x0:x0 + w] = m * bevel[1]
        a[y0:y0 + h, x0 + w - 1] = m * bevel[1]
        if rng.random() < chip:
            right, low = rng.random() < 0.5, rng.random() < 0.5
            cx, cy = (x0 + w - 1 if right else x0), (y0 + h - 1 if low else y0)
            s = int(rng.integers(2, 6))
            for dy in range(s):
                for dx in range(s - dy):
                    L.wpx(a, cx + (-dx if right else dx), cy + (-dy if low else dy), c=gc.mean(0) * 0.9)
        if rng.random() < crackp:
            L.crack(a, x0 + rng.integers(2, max(3, w - 2)), y0 + 1, h - 2, rng, f=0.62, dx=rng.normal(0, 0.4), dy=1)
    np.clip(a, 0, 1, out=a)
    return a


def to8(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def f32(img8):
    return img8.astype(np.float32) / 255


@recipe('shopTile', (4, 4))
def shop_tile():
    """Ramen Yamada's floor: 15 cm glazed quarry tiles, cream and warm grey in a checker, worn and greasy, chipped
    corners, a cracked tile here and there, grout dark with years of mopping."""
    rng = np.random.default_rng(112)
    W = H = px(4)
    face = L.flatten(L.at_ppm(L.photo('clay_floor_001'), PPM))
    grime = L.tile_to(L.seamless(L.flatten(L.at_ppm(L.photo('concrete_floor_worn_001'), PPM), 0.4)), W, H, rng)
    grout = (0.42, 0.39, 0.35)
    a, cells = tile_layout(W, H, 26, 26, ['#e2dccc', '#b4aa96'], rng, face_src=face, face_contrast=0.5, grout=grout)
    g = L.lum(grime) / L.lum(grime).mean()
    a *= (1 + (g - 1) * 0.55)[..., None]
    for _ in range(18):  # grease and wear where feet go
        L.dither_patch(a, rng.integers(0, W), rng.integers(0, H), int(rng.integers(14, 60)), int(rng.integers(10, 44)), f=rng.uniform(0.82, 0.9), k=rng.uniform(0.5, 0.9), rng=rng)
    a = L.grade(a, mean='#beb7a8')
    img, pal = L.pixel_art(a, k=30, seed=1, paint=1)
    a = tile_strokes(f32(img), cells, rng, np.array(grout) * 1.0, grime=grime, grime_k=0.5, chip=0.1, crackp=0.04)
    return L.snap(to8(a), pal)


# ------------------------------------------------------------------ wood
def grain_along_x(img):
    """Rotate a wood photo so its grain runs along x (the axis the luminance changes least along)."""
    g = L.lum(img)
    vx = np.abs(np.diff(g, axis=1)).mean()
    vy = np.abs(np.diff(g, axis=0)).mean()
    return img if vx < vy else np.ascontiguousarray(np.rot90(img))


def planks(W, H, rows, src, rng, tones, length=(0.9, 2.0), seam=(0.55, 1.12), joint=0.6, nails=0.0, contrast=1.0,
           vertical=False, knots=0, gap=1):
    """Boards: `rows` planks across the H (or W, vertical=True) axis, each a run of boards cut from the grain photo
    `src` (grain along x, 256 px/m) at random spots, toned to one of `tones` with its own jitter. Returns
    (float image, strokes) where strokes() lays the seams, butt joints and nail heads after the pixel-art pass."""
    if vertical:
        W, H = H, W
    a = np.zeros((H, W, 3), np.float32)
    ys = grid(H, rows)
    seams, joints = [], []
    for r in range(rows):
        y0, y1 = ys[r], ys[r + 1]
        h = y1 - y0
        x = int(rng.integers(0, W))
        start = x
        while x < start + W:
            ln = int(px(rng.uniform(*length)))
            ln = min(ln, start + W - x)
            p = L.cut(src, int(rng.integers(0, src.shape[1])), int(rng.integers(0, src.shape[0])), ln, h, 0, rng.random() < 0.5)
            pl = L.lum(p)
            col = np.array(L.hexrgb(tones[int(rng.integers(len(tones)))]), np.float32) * (1 + rng.normal(0, 0.05))
            d = (pl - pl.mean()) / max(pl.std(), 1e-3)  # the grain at a set strength, whatever the photo's contrast
            p = col * (1 + np.clip(d, -2.5, 2.5) * 0.09 * contrast)[..., None]
            xs_ = (np.arange(x, x + ln)) % W
            a[y0:y1, xs_] = np.clip(p, 0, 1)
            joints.append((x % W, y0, h))
            x += ln
        seams.append(y0)

    def strokes(b):
        for y0 in seams:
            for gy in range(gap):
                b[(y0 + gy) % H, :] *= seam[0]
            b[(y0 + gap) % H, :] *= seam[1]
        for (x, y0, h) in joints:
            if rng.random() < joint:
                b[y0:y0 + h, x % W] *= seam[0]
                b[y0:y0 + h, (x + 1) % W] *= seam[1]
                if nails and rng.random() < nails:
                    for ny in (y0 + max(2, h // 4), y0 + h - max(3, h // 4)):
                        for dx in (3, -3):
                            L.wpx(b, x + dx, ny, f=0.45)
                            L.wpx(b, x + dx + 1, ny, f=0.7)
                            L.wpx(b, x + dx, ny - 1, f=1.15)
        return np.clip(b, 0, 1)
    if vertical:
        a = np.ascontiguousarray(np.rot90(a, -1))

        def vstrokes(b):
            bb = np.ascontiguousarray(np.rot90(b, 1))
            return np.ascontiguousarray(np.rot90(strokes(bb), -1))
        return a, vstrokes
    return a, strokes


def wood_src(asset, mean=None, sat=1.0):
    return grain_along_x(L.flatten(L.at_ppm(L.photo(asset), PPM), 0.3))


def finish(a, strokes, mean, k=28, seed=1, paint=1, contrast=1.0, sat=1.0):
    """Grade to the old texture's mean colour, pixel-art pass, hand strokes, snap to the palette."""
    a = L.grade(a, mean=mean, contrast=contrast, sat=sat)
    img, pal = L.pixel_art(a, k=k, seed=seed, paint=paint)
    if strokes is not None:
        img = L.snap(to8(strokes(f32(img))), pal)
    return img


@recipe('woodDark', (2, 2))
def wood_dark():
    """Dark stained boards (counters, frames, furniture, beams): walnut grain, 12-16 cm boards, varnish worn."""
    rng = np.random.default_rng(24)
    a, st = planks(px(2), px(2), 14, wood_src('black_walnut_veneer_01'), rng, ['#5e3c22', '#553620', '#664428'], contrast=1.1)
    return finish(a, st, '#56371f', k=28)


@recipe('woodLight', (2, 2))
def wood_light():
    """Light boards (shelves, tops, door frames): oak grain, 12-16 cm boards."""
    rng = np.random.default_rng(23)
    a, st = planks(px(2), px(2), 14, wood_src('oak_veneer_02'), rng, ['#c49a63', '#bb915a', '#cba36c'], contrast=1.1)
    return finish(a, st, '#b48d5a', k=28)


@recipe('woodTable', (2, 2))
def wood_table():
    """Table and bench tops: cherry grain, wide 20 cm boards."""
    rng = np.random.default_rng(22)
    a, st = planks(px(2), px(2), 10, wood_src('cherry_veneer'), rng, ['#8a5a33', '#80522e', '#925f36'], contrast=1.0, joint=0.4)
    return finish(a, st, '#80532f', k=26)


@recipe('koshiita', (2, 1))
def koshiita():
    """腰板 wainscot: vertical Japanese cedar boards, dark-stained and polished by shoulders, a batten every 4 boards."""
    rng = np.random.default_rng(229)
    W, H = px(2), px(1)
    a, st = planks(W, H, 20, wood_src('japanese_cedar_planks'), rng, ['#4a3020', '#432b1c', '#503424'], vertical=True,
                   length=(1.0, 1.0), joint=0.0, contrast=1.2)

    def strokes(b):
        b = st(b)
        xs = grid(W, 20)
        for i in range(0, 20, 4):  # battens: a 6 px strip, lit on the left, shaded on the right
            x = xs[i]
            b[:, x:x + 6] = b[:, x:x + 6] * 0.85
            b[:, x] *= 1.25
            b[:, (x + 6) % W] *= 0.6
        return np.clip(b, 0, 1)
    return finish(a, strokes, '#432b1c', k=26)


@recipe('shopCeiling', (2, 2))
def shop_ceiling():
    """竿縁天井 board ceiling: hinoki boards 30 cm wide with thin battens (sao-buchi) across every 45 cm."""
    rng = np.random.default_rng(260)
    W, H = px(2), px(2)
    a, st = planks(W, H, 7, wood_src('ash_veneer'), rng, ['#8c6941', '#84623c', '#936f46'], vertical=True,
                   length=(1.6, 2.0), joint=0.3, contrast=1.0)

    def strokes(b):
        b = st(b)
        for y in grid(H, 4)[:-1]:  # the battens across the boards: 8 px, lit top edge, shadow under
            b[y:y + 8] = b[y:y + 8] * 0.8
            b[y] *= 1.3
            b[(y + 8) % H] *= 0.55
            b[(y + 9) % H] *= 0.8
        return np.clip(b, 0, 1)
    return finish(a, strokes, '#8c6941', k=28)


# ------------------------------------------------------------------ plaster
def detail_std(a, std):
    """Set the image's luminance detail to a standard deviation of `std` (relative to its mean), keeping each pixel's
    hue; the mean colour is set later by the grade."""
    Lm = L.lum(a)
    d = (Lm - Lm.mean()) / max(Lm.std(), 1e-3)
    target = Lm.mean() * (1 + np.clip(d, -3, 3) * std)
    return np.clip(a / np.maximum(Lm, 1e-3)[..., None] * target[..., None], 0, 1)


def plaster(asset, W, H, rng, mean, contrast=1.0, k=20, flat=0.0, sat=0.8, extra=None, std=0.06):
    src = L.seamless(L.flatten(L.at_ppm(L.photo(asset), PPM), flat))
    a = L.tile_to(src, W, H, rng)
    a = L.grade(a, sat=sat)
    a = detail_std(a, std * contrast)
    if extra:
        extra(a)
    return finish(a, None, mean, k=k, paint=2)


@recipe('shikkui', (2, 2))
def shikkui():
    """漆喰 lime plaster: warm off-white, soft trowel arcs, a hairline crack or two, faint hand marks."""
    rng = np.random.default_rng(242)
    W = H = px(2)

    def extra(a):
        for _ in range(26):  # trowel arcs: faint dithered sweeps
            cx, cy, r = rng.integers(0, W), rng.integers(0, H), rng.integers(40, 140)
            t0 = rng.uniform(0, 6.28)
            for t in np.linspace(t0, t0 + rng.uniform(0.6, 1.4), int(r)):
                for dr in range(3):
                    if rng.random() < 0.5:
                        L.wpx(a, cx + np.cos(t) * (r + dr), cy + np.sin(t) * (r + dr) * 0.6, f=0.97 if dr else 1.03)
        for _ in range(2):
            L.crack(a, rng.integers(0, W), rng.integers(0, H), rng.integers(30, 90), rng, f=0.85, dx=rng.normal(0, 1), dy=1)
    return plaster('beige_wall_001', W, H, rng, '#e9e2d6', std=0.035, k=18, extra=extra)


# ------------------------------------------------------------------ main
def main(keys):
    os.makedirs(OUT, exist_ok=True)
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    for key in keys or RECIPES:
        fn, m = RECIPES[key]
        img = fn()
        size = L.save_webp(img, os.path.join(OUT, key + '.webp'))
        man[key] = {'m': list(m), 'px': [img.shape[1], img.shape[0]]}
        print(f'{key:16s} {img.shape[1]}x{img.shape[0]}  {m[0]}x{m[1]} m  {img.shape[1] / m[0]:.0f} px/m  {size // 1024} KB  '
              f'{len(np.unique(img.reshape(-1, 3), axis=0))} colours')
    json.dump(dict(sorted(man.items())), open(MANIFEST, 'w'), indent=1)
    src = os.path.join(HERE, 'sources.json')
    old = json.load(open(src)) if os.path.exists(src) else {}
    for a, mm in L.USED.items():
        old[a] = {'source': f'https://polyhaven.com/a/{a}', 'license': 'CC0-1.0', 'metres': round(mm, 3)}
    json.dump(dict(sorted(old.items())), open(src, 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
