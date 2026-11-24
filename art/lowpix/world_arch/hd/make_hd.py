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
    """Register a recipe: key (the old recipe key it replaces) and the metres one repeat covers."""
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
def tile_layout(W, H, nx, ny, faces, rng, face_src=None, face_contrast=0.5, jitter=0.05, grout=(0.6, 0.58, 0.54), gw=2, random_faces=False):
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
            fi = int(rng.integers(len(faces))) if random_faces else (i + j) % len(faces)
            col = np.array(L.hexrgb(faces[fi]), np.float32) * (1 + rng.normal(0, jitter))
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
           vertical=False, knots=0, gap=1, streak=4):
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
            if streak:  # painted along the grain: long strokes, not blobs
                d = sum(np.roll(d, k, axis=1) for k in range(-streak, streak + 1)) / (2 * streak + 1)
                d = d / max(d.std(), 1e-3)
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


def finish(a, strokes, mean, k=28, seed=1, paint=0, contrast=1.0, sat=1.0):
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
    return plaster('beige_wall_001', W, H, rng, '#e9e2d6', std=0.05, k=18, extra=extra)


# ------------------------------------------------------------------ photo surfaces
def surface(asset, W, H, rng, std=0.08, flat=0.3, sat=0.8, ppm=PPM, blend=None):
    """A W x H patch of a photo at `ppm`, made seamless and laid with offset copies (no lined-up repeat), its detail set
    to `std`. blend: (asset2, weight) mixes a second photo's detail in (more unique area per repeat)."""
    src = L.seamless(L.flatten(L.at_ppm(L.photo(asset), ppm), flat))
    a = L.tile_to(src, W, H, rng)
    if blend:
        b = L.tile_to(L.seamless(L.flatten(L.at_ppm(L.photo(blend[0]), ppm), flat)), W, H, rng)
        lb = L.lum(b)
        a = a * (1 + (lb / lb.mean() - 1) * blend[1])[..., None]
    a = L.grade(a, sat=sat)
    return detail_std(a, std)


def concrete_surface(asset, W, H, rng, low=0.06, grit=0.05, sat=0.4, blend=None, ppm=PPM):
    """Concrete as a pixel artist paints it: the scan split into its broad tone (blurred, +-`low`) and its fine grit (a
    high-pass, +-`grit`), recombined, so the surface has real aggregate and soft clouding but no kuwahara cells or
    camouflage blotches. Hue from the scan (desaturated)."""
    from PIL import Image as _I, ImageFilter as _F
    def split(asset_):
        src = L.seamless(L.flatten(L.at_ppm(L.photo(asset_), ppm), 0.2))
        im = L.tile_to(src, W, H, rng)
        g = L.lum(im)
        g8 = _I.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8))
        lo = np.asarray(g8.filter(_F.GaussianBlur(14)), np.float32) / 255
        mid = np.asarray(g8.filter(_F.GaussianBlur(2)), np.float32) / 255
        hi = g - mid
        lo = (lo - lo.mean()) / max(lo.std(), 1e-3)
        hi = hi / max(hi.std(), 1e-3)
        return im, lo, hi
    im, lo, hi = split(asset)
    if blend:
        _, lo2, hi2 = split(blend[0])
        lo = lo * (1 - blend[1]) + lo2 * blend[1]
        hi = hi * (1 - blend[1]) + hi2 * blend[1]
    chroma = im.reshape(-1, 3).mean(0)
    chroma = chroma / max(chroma.mean(), 1e-3)
    chroma = 1 + (chroma - 1) * sat
    t = 0.6 * (1 + np.clip(lo, -3, 3) * low + np.clip(hi, -3, 3) * grit)
    return np.clip(t[..., None] * chroma[None, None, :], 0, 1)


def joints(a, xs=(), ys=(), w=2, dark=0.55, lip=1.12, rng=None, spall=0.0):
    """Saw cuts / panel seams: `w` px dark lines with a lit lip, the odd spalled chip along them."""
    H, W = a.shape[:2]
    for x in xs:
        a[:, x % W:(x % W) + w] *= dark
        a[:, (x + w) % W] *= lip
    for y in ys:
        a[y % H:(y % H) + w] *= dark
        a[(y + w) % H] *= lip
    if rng is not None and spall:
        for x in xs:
            for _ in range(int(H * spall)):
                L.dither_patch(a, x + rng.integers(-2, 3), rng.integers(0, H), int(rng.integers(1, 4)), int(rng.integers(1, 3)), f=0.75, k=0.9)
        for y in ys:
            for _ in range(int(W * spall)):
                L.dither_patch(a, rng.integers(0, W), y + rng.integers(-2, 3), int(rng.integers(1, 3)), int(rng.integers(1, 4)), f=0.75, k=0.9)
    np.clip(a, 0, 1, out=a)
    return a


def stains(a, rng, n, r=(10, 50), f=(0.82, 0.92), k=(0.5, 0.9)):
    H, W = a.shape[:2]
    for _ in range(n):
        L.dither_patch(a, rng.integers(0, W), rng.integers(0, H), int(rng.integers(*r)), int(rng.integers(int(r[0] * 0.7), int(r[1] * 0.8))), f=rng.uniform(*f), k=rng.uniform(*k), rng=rng)
    return a


def cracks(a, rng, n, length=(30, 120), f=0.7):
    H, W = a.shape[:2]
    for _ in range(n):
        ang = rng.uniform(0, 6.28)
        L.crack(a, rng.integers(0, W), rng.integers(0, H), rng.integers(*length), rng, f=f, dx=np.cos(ang), dy=np.sin(ang))
    return a


def streaks(a, rng, n, length=(20, 120), f=(0.8, 0.9), y0=None):
    H, W = a.shape[:2]
    for _ in range(n):
        L.streak(a, rng.integers(0, W), rng.integers(0, H) if y0 is None else y0 + rng.integers(0, 20), rng.integers(*length), f=rng.uniform(*f), rng=rng, width=int(rng.integers(1, 3)))
    return a


@recipe('garageSlab', (4, 4))
def garage_slab():
    """Grandpa's garage slab: power-trowelled concrete, worn, saw-cut control joints every 2 m with spalled lips,
    hairline cracks off the joints, oil stains and tyre scuffs."""
    rng = np.random.default_rng(274)
    W = H = px(4)
    a = surface('concrete_floor_worn_001', W, H, rng, std=0.07, blend=('brushed_concrete', 0.25))
    stains(a, rng, 10, r=(20, 70), f=(0.86, 0.94))
    for _ in range(3):  # oil drips: darker, tighter
        L.dither_patch(a, rng.integers(0, W), rng.integers(0, H), int(rng.integers(14, 34)), int(rng.integers(10, 24)), f=0.76, k=0.8, rng=rng, wobble=0.5)
    for _ in range(4):  # tyre scuffs: long faint bands
        x, y = rng.integers(0, W), rng.integers(0, H)
        for i in range(int(rng.integers(120, 300))):
            for w in range(14):
                if rng.random() < 0.18:
                    L.wpx(a, x + w, y + i, f=0.9)
    a = L.grade(a, mean='#989389')
    img, pal = L.pixel_art(a, k=26, seed=2, paint=1)
    b = f32(img)
    joints(b, xs=(0, px(2)), ys=(0, px(2)), w=2, rng=rng, spall=0.02)
    for x in (0, px(2)):
        for _ in range(2):
            L.crack(b, x + 2, rng.integers(0, H), rng.integers(40, 140), rng, f=0.66, dx=rng.choice([-1, 1]), dy=rng.normal(0, 0.6))
    cracks(b, rng, 3, f=0.7)
    return L.snap(to8(b), pal)


@recipe('domaFloor', (4, 4))
def doma_floor():
    """Mikawa-ya's doma (土間): an old trowelled concrete floor polished by fifty years of shoes: grey with a warm cast,
    soft clouding, fine grit, polished paths, hairline cracks, a saw-cut joint."""
    rng = np.random.default_rng(181)
    W = H = px(4)
    a = concrete_surface('concrete_floor_03', W, H, rng, low=0.06, grit=0.05, sat=0.5)
    a = L.grade(a, mean='#86817a')
    img, pal = L.pixel_art(a, k=22, seed=33, paint=0, clean_passes=2)
    b = cracks(f32(img), rng, 6, length=(40, 180), f=0.62)
    joints(b, xs=(0,), ys=(0,), w=1, dark=0.72, lip=1.06)
    return L.snap(to8(b), pal)


@recipe('floorHD', (2, 2))
def floor_hd():
    """A plain garage / shed slab: brushed concrete, joints at the edges, an oil stain, hairline cracks."""
    rng = np.random.default_rng(43)
    W = H = px(2)
    a = surface('brushed_concrete', W, H, rng, std=0.07)
    stains(a, rng, 5)
    L.dither_patch(a, W * 0.55, H * 0.6, 40, 28, f=0.78, k=0.8, rng=rng, wobble=0.5)
    a = L.grade(a, mean='#98948a')
    img, pal = L.pixel_art(a, k=24, seed=3, paint=1)
    b = joints(f32(img), xs=(0,), ys=(0,), w=2, rng=rng, spall=0.02)
    cracks(b, rng, 2)
    return L.snap(to8(b), pal)


@recipe('concreteHD', (2, 4))
def concrete_hd():
    """Cast concrete walls and floors: 1 x 2 m form-panel seams, P-cone tie holes (some leaking rust), rain streaks,
    efflorescence, hairline cracks."""
    rng = np.random.default_rng(42)
    W, H = px(2), px(4)
    a = surface('concrete_wall_003', W, H, rng, std=0.055, sat=0.4, blend=('concrete_wall_006', 0.15))
    streaks(a, rng, 18, length=(40, 300), f=(0.86, 0.93))
    a = L.grade(a, mean='#a4a098')
    img, pal = L.pixel_art(a, k=24, seed=4, paint=1)
    b = joints(f32(img), xs=(0, px(1)), ys=(0, px(2)), w=1, dark=0.72, lip=1.08)
    for y in (px(0.5), px(1.5), px(2.5), px(3.5)):
        for x in (px(0.25), px(0.75), px(1.25), px(1.75)):
            for dy in range(-3, 4):  # a recessed cone with a mortar plug
                for dx in range(-3, 4):
                    d = dx * dx + dy * dy
                    if d <= 9:
                        L.wpx(b, x + dx, y + dy, f=0.82 if d > 4 else 0.7)
            L.wpx(b, x - 2, y - 2, f=0.6); L.wpx(b, x + 2, y + 2, f=1.15)
            if rng.random() < 0.3:
                L.streak(b, x, y + 4, rng.integers(20, 90), f=0.78, rng=rng, width=2)
    cracks(b, rng, 2, f=0.72)
    return L.snap(to8(b), pal)


def blocks(W, H, bw, bh, asset, rng, mean, joint=3, k=24, seed=5, std=0.08, mortar='#7e7a72', tone=(0.9, 1.08), sat=0.5, tints=None, streak_n=10):
    """Concrete blocks (ブロック): bw x bh px blocks in stretcher bond, each cut from the photo at its own spot and tone,
    raked mortar joints `joint` px with a lit lower lip, chipped corners, efflorescence, mould streaks."""
    src = L.seamless(L.flatten(L.at_ppm(L.photo(asset), PPM), 0.3))
    a = np.zeros((H, W, 3), np.float32)
    mort = np.array(L.hexrgb(mortar), np.float32)
    a[:] = mort
    cells = []
    rows = H // bh
    for r in range(rows):
        off = (bw // 2) * (r % 2)
        for c in range(-1, W // bw + 1):
            x0, y0 = c * bw + off + joint // 2, r * bh + joint // 2
            w, h = bw - joint, bh - joint
            p = L.cut(src, int(rng.integers(0, src.shape[1])), int(rng.integers(0, src.shape[0])), w, h)
            p = p * rng.uniform(*tone)
            if tints:
                p = p * np.array(L.hexrgb(tints[int(rng.integers(len(tints)))]), np.float32) / max(1e-3, np.mean(L.hexrgb(tints[0])))
            xs = np.arange(x0, x0 + w) % W
            a[y0:y0 + h][:, xs] = p
            cells.append((x0, y0, w, h))
    a = detail_std(L.grade(a, sat=sat), std)
    streaks(a, rng, streak_n, length=(30, 160), f=(0.8, 0.9))
    a = L.grade(a, mean=mean)
    img, pal = L.pixel_art(a, k=k, seed=seed, paint=1)
    b = f32(img)
    for (x0, y0, w, h) in cells:
        xs = np.arange(x0, x0 + w) % W
        b[y0, xs] *= 1.08
        b[y0 + h - 1, xs] *= 0.8
        b[y0:y0 + h, x0 % W] *= 1.04
        b[y0:y0 + h, (x0 + w - 1) % W] *= 0.86
        if rng.random() < 0.3:
            for d in range(int(rng.integers(2, 5))):
                L.wpx(b, x0 + d, y0, c=mort * 0.95)
                L.wpx(b, x0, y0 + d, c=mort * 0.95)
        if rng.random() < 0.2:  # efflorescence bleeding from the bed joint
            L.dither_patch(b, x0 + w * rng.uniform(0.3, 0.7), y0 + h - 2, int(w * 0.3), 4, f=1.12, k=0.7, rng=rng)
    return L.snap(to8(np.clip(b, 0, 1)), pal)


def cblocks(W, H, bw, bh, rng, mean, joint=3, mortar='#8a867e', seed=5, k=18):
    """Japanese concrete blocks (ブロック): 40 x 20 cm, stretcher bond. Each face its own cast tone (+-5 %) with soft
    clouding (the scan's broad tone, +-4 %) and the scan's fine grit kept faint (+-2 %): no dark pores, no speckle.
    Raked joints: the block above throws a shadow into the top of the joint, the mortar, a lit lower lip; each block
    a lit top arris and a shaded underside; chipped corners. (Stains and moss at the foot are the wall's own decals:
    town_stainBase / town_stainDrip.)"""
    from PIL import Image as _I, ImageFilter as _F
    src = L.seamless(L.flatten(L.at_ppm(L.photo('concrete_floor_02'), PPM), 0.0))
    g = L.lum(src)
    g8 = _I.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8))
    lo = np.asarray(g8.filter(_F.GaussianBlur(10)), np.float32) / 255
    mid = np.asarray(g8.filter(_F.GaussianBlur(1.5)), np.float32) / 255
    lo = (lo - lo.mean()) / max(lo.std(), 1e-3)
    hi = (mid - np.asarray(g8.filter(_F.GaussianBlur(4)), np.float32) / 255)
    hi = hi / max(hi.std(), 1e-3)
    base = np.array(L.hexrgb(mean), np.float32)
    mort = np.array(L.hexrgb(mortar), np.float32)
    a = np.zeros((H, W, 3), np.float32)
    a[:] = mort
    cells = []
    for r in range(H // bh):
        off = (bw // 2) * (r % 2)
        for c in range(-1, W // bw + 1):
            x0, y0 = c * bw + off + joint // 2, r * bh + joint // 2
            w, h = bw - joint, bh - joint
            ox, oy = int(rng.integers(0, W)), int(rng.integers(0, H))
            l_ = L.cut(lo[..., None], ox, oy, w, h)[..., 0]
            h_ = L.cut(hi[..., None], ox, oy, w, h)[..., 0]
            face = base * rng.uniform(0.95, 1.05) * (1 + np.clip(l_, -2.5, 2.5) * 0.04 + np.clip(h_, -2, 2) * 0.02)[..., None]
            xs = np.arange(x0, x0 + w) % W
            a[y0:y0 + h][:, xs] = face
            cells.append((x0, y0, w, h))
    pal = L.palette(np.clip(a, 0, 1), k, seed)
    b = f32(L.snap(to8(a), pal))
    for (x0, y0, w, h) in cells:
        xs = np.arange(x0, x0 + w) % W
        b[y0, xs] *= 1.07                    # the lit top arris
        b[y0 + h - 1, xs] *= 0.86            # the shaded underside
        b[y0:y0 + h, (x0 + w - 1) % W] *= 0.92
        jy = (y0 + h) % H                    # the joint below: shadow of this block, then mortar, then a lit lip
        b[jy, xs] = mort * 0.62
        b[(jy + joint - 1) % H, xs] = mort * 1.08
        if rng.random() < 0.25:              # a chipped corner, mortar-dark
            cx = x0 if rng.random() < 0.5 else x0 + w - 1
            for d in range(int(rng.integers(2, 5))):
                for e in range(3 - min(d, 2)):
                    L.wpx(b, cx + (d if cx == x0 else -d), y0 + e, c=mort * 0.85)
    for c in range(len(cells)):              # head joints: shadow on the left edge of the gap
        x0, y0, w, h = cells[c]
        b[y0:y0 + h, (x0 - joint) % W] = mort * 0.7
    b = np.clip(b, 0, 1)
    return L.snap(to8(b), L.palette(b, k + 4, seed + 1))


@recipe('town_stainDrip', (1, 1))
def town_stain_drip():
    """Rain run-off down a block wall from its coping: soft damp streaks, each its own width and length, darker in
    two clean steps near the top, no dither. Alpha-cut (the wall shows between)."""
    rng = np.random.default_rng(1084)
    W = H = px(1)
    a = np.zeros((H, W, 3), np.float32)
    al = np.zeros((H, W), np.float32)
    c1, c2 = np.array(L.hexrgb('#7c776e'), np.float32), np.array(L.hexrgb('#6c675f'), np.float32)
    x = 0
    while x < W:
        w = int(rng.integers(3, 10))
        if rng.random() < 0.6:
            ln = int(H * (0.25 + 0.75 * rng.random() ** 1.4))
            wob = 0
            for y in range(ln):
                if rng.random() < 0.04:
                    wob += int(rng.choice([-1, 1]))
                ww = max(1, int(round(w * (1 - 0.6 * y / ln))))
                xs = np.arange(x + wob, x + wob + ww) % W
                a[y, xs] = c2 if y < ln * 0.35 else c1
                al[y, xs] = 1
        x += w + int(rng.integers(1, 8))
    a[0:3] = c2 * 0.92; al[0:3] = 1  # the wet line under the coping
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=6, seed=70, paint=0, clean_passes=0)
    return rgba(img, al)


@recipe('town_stainBase', (1.1, 0.5))
def town_stain_base():
    """Splash-back grime and moss along the foot of a wall: a dark wet band with a ragged top edge, lighter dried
    splash above it in clean steps, cushions of moss in the low joints and corners. Alpha-cut, no dither."""
    rng = np.random.default_rng(1094)
    W, H = px(1.1), px(0.5)
    from PIL import Image as _I, ImageFilter as _F
    n = np.asarray(_I.fromarray((rng.random((H // 6 + 1, W // 6 + 1)) * 255).astype(np.uint8)).resize((W, H), _I.BICUBIC).filter(_F.GaussianBlur(3)), np.float32) / 255
    y = np.arange(H)[:, None] / H           # 0 at the top of the strip, 1 at the ground
    top = 0.35 + 0.35 * n                    # ragged edge
    al = (y > top).astype(np.float32)
    band = np.clip((y - top) / np.maximum(1 - top, 1e-3), 0, 1)
    step = np.floor(band * 3) / 3            # three clean steps of darkness toward the ground
    a = np.array(L.hexrgb('#8a8478'), np.float32) * (1 - 0.32 * step)[..., None]
    moss = np.zeros((H, W), bool)
    for _ in range(9):
        cx, cy = int(rng.integers(0, W)), int(H - rng.integers(4, 30))
        rx, ry = int(rng.integers(10, 34)), int(rng.integers(5, 12))
        yy, xx = np.ogrid[0:H, 0:W]
        d = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 + (n - 0.5) * 0.6
        moss |= d < 1
    mc = np.array(L.hexrgb('#5a6a34'), np.float32)
    a[moss] = mc * (0.85 + 0.3 * (n[moss] > 0.5))[..., None]
    al[moss] = 1
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=8, seed=71, paint=0, clean_passes=1)
    return rgba(img, al)


@recipe('blockHD', (2, 2))
def block_hd():
    """Concrete block wall (ブロック塀): 40 x 20 cm porous blocks in stretcher bond."""
    rng = np.random.default_rng(45)
    return cblocks(px(2), px(2), px(0.4), px(0.2), rng, '#9c988f')


def corrugated(W, H, ribs, asset, rng, mean, ramp=(0.78, 0.92, 1.08, 1.16, 1.1, 0.96, 0.82, 0.72), k=26, seed=6, bolts=(), rust=8, ppm=PPM, courses=0, fade=0, std=0.06):
    """Corrugated sheet: rib shading (a lit / shaded ramp across each rib, bent by dents), the photo's paint and rust
    mottling, fastener rows with washers and rust tears, rust runs down the valleys, an overlap seam."""
    a = surface(asset, W, H, rng, std=std, sat=0.6, ppm=ppm)
    x = np.arange(W)
    xs = grid(W, ribs)
    phase = np.zeros(W, np.float32)
    for i in range(ribs):
        phase[xs[i]:xs[i + 1]] = (x[xs[i]:xs[i + 1]] - xs[i]) / max(1, xs[i + 1] - xs[i])
    yy = np.arange(H)[:, None]
    dent = (np.sin(yy * 0.03 + x[None] * 0.01) * 0.04)
    ph = (phase[None, :] + dent) % 1.0
    rp = np.array(ramp, np.float32)
    shade = rp[(ph * len(rp)).astype(int) % len(rp)]
    a = a * shade[..., None]
    if fade:  # chalky, sun-faded enamel: soft lighter patches (the palette steps them into clean clusters, no dither)
        from PIL import Image as _I, ImageFilter as _F
        fm = np.zeros((H, W), np.float32)
        for _ in range(fade):
            cx, cy, rx, ry = rng.integers(0, W), rng.integers(0, H), rng.integers(30, 110), rng.integers(40, 150)
            yy, xx = np.ogrid[0:H, 0:W]
            dx = np.minimum(np.abs(xx - cx), W - np.abs(xx - cx)) / rx
            dy = np.minimum(np.abs(yy - cy), H - np.abs(yy - cy)) / ry
            fm = np.maximum(fm, np.clip(1 - np.sqrt(dx ** 2 + dy ** 2), 0, 1))
        fm = np.asarray(_I.fromarray((fm * 255).astype(np.uint8)).filter(_F.GaussianBlur(10)), np.float32) / 255
        a = a * (1 + fm * 0.08)[..., None]
    if courses:  # roof-tile courses: a shadow under each overlapping row, a lit lip on it
        for y in grid(H, courses)[:-1]:
            a[y:y + 3] *= 0.6
            a[(y + 3) % H] *= 1.15
    a = L.grade(a, mean=mean)
    img, pal = L.pixel_art(a, k=k, seed=seed, paint=0)
    b = f32(img)
    rustc = np.array(L.hexrgb('#8a4a26'), np.float32)
    for y in bolts:
        for i in range(0, ribs, 2):
            cx = xs[i] + (xs[1] - xs[0]) // 2
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                L.wpx(b, cx + dx, y + dy, f=0.5)
            L.wpx(b, cx, y, f=1.35)
            if rng.random() < 0.5:  # a rust tear under the washer: solid, fading in steps
                n = int(rng.integers(10, 60))
                for j in range(n):
                    L.wpx(b, cx, y + 2 + j, c=rustc, alpha=0.6 * (1 - int(3 * j / n) / 3))
    for _ in range(rust):  # rust runs down a valley: a 2-texel run, strong at the top, fading in steps, wobbling
        cx = xs[int(rng.integers(0, ribs))] + int((xs[1] - xs[0]) * 0.8)
        y = int(rng.integers(0, H))
        n = int(rng.integers(60, 260))
        x = cx
        for j in range(n):
            al = 0.6 * (1 - int(4 * j / n) / 4)
            for dx in (0, 1):
                L.wpx(b, x + dx, y + j, c=rustc * (1.1 if dx == 0 else 0.95), alpha=al)
            if rng.random() < 0.03:
                x += rng.choice([-1, 1])
    b[:, 0] *= 0.45
    b[:, 1] *= 1.25
    b = np.clip(b, 0, 1)
    return L.snap(to8(b), L.palette(b, k + 6, seed + 1))


@recipe('corrugatedHD', (2, 2))
def corrugated_hd():
    """Galvanised corrugated steel, old paint chalking off, rust tears under the fixings."""
    rng = np.random.default_rng(44)
    return corrugated(px(2), px(2), 27, 'corrugated_iron_02', rng, '#818a8f', bolts=(px(0.15), px(1.15)))


@recipe('shutter', (2, 2))
def shutter():
    """A roller shutter: 7.5 cm slats, each with its ribbed profile and the curl joint between, paint worn on the edges."""
    rng = np.random.default_rng(149)
    W = H = px(2)
    a = surface('painted_metal_shutter', W, H, rng, std=0.07, sat=0.5)
    ys = grid(H, 26)
    prof = np.array([1.12, 1.18, 1.1, 1.0, 0.95, 0.92, 0.9, 0.92, 0.95, 1.0, 1.05, 1.0, 0.95, 0.9, 0.86, 0.82, 0.74, 0.6, 0.78], np.float32)
    for i in range(26):
        h = ys[i + 1] - ys[i]
        t = (np.arange(h) / h * len(prof)).astype(int)
        a[ys[i]:ys[i + 1]] *= prof[t][:, None, None]
    stains(a, rng, 8, r=(20, 60), f=(0.86, 0.94))
    streaks(a, rng, 12, length=(30, 200))
    return finish(a, None, '#989c95', k=26)


def painted_metal(asset, mean, seed, blend=None):
    rng = np.random.default_rng(seed)
    W = H = px(2)
    a = surface(asset, W, H, rng, std=0.06, sat=0.7, blend=blend)
    for _ in range(30):  # scratches: short lit strokes through the paint
        x, y, ang, n = rng.integers(0, W), rng.integers(0, H), rng.uniform(0, 3.14), int(rng.integers(6, 30))
        for i in range(n):
            L.wpx(a, x + np.cos(ang) * i, y + np.sin(ang) * i, f=1.12)
    stains(a, rng, 6, r=(14, 50), f=(0.86, 0.94))
    a = L.grade(a, mean=mean)
    img, pal = L.pixel_art(a, k=24, seed=seed, paint=1)
    return img


@recipe('steel', (2, 2))
def steel():
    """Painted sheet steel (racks, hoods, appliances, doors): grey-blue paint, scratches, worn patches."""
    return painted_metal('blue_metal_plate', '#707c81', 184)


@recipe('steelGreen', (2, 2))
def steel_green():
    """Green-painted steel (the side door, old machines): chipped paint, rust freckles."""
    return painted_metal('green_metal_rust', '#607f6a', 191)


@recipe('girder', (2, 2))
def girder():
    """Painted girders of the railway bridge: old paint over rust, streaked."""
    return painted_metal('rusty_painted_metal', '#898377', 447)


@recipe('pTile', (1.8, 1.8))
def p_tile():
    """Shōwa vinyl P-tiles, 30 cm, cream and sage in a checker, marbled, scuffed, a burn mark, a lifted corner."""
    rng = np.random.default_rng(312)
    W = H = 462
    face = L.flatten(L.at_ppm(L.photo('clay_floor_001'), PPM), 0.3)
    a, cells = tile_layout(W, H, 6, 6, ['#e4dcc4', '#9fb39a'], rng, face_src=face, face_contrast=1.1, grout=(0.38, 0.36, 0.32), gw=1, jitter=0.03)
    stains(a, rng, 8, r=(10, 40), f=(0.88, 0.94))
    a = L.grade(a, mean='#a4a691')
    img, pal = L.pixel_art(a, k=28, seed=7, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.36, 0.34, 0.3), gw=1, bevel=(1.06, 0.8), chip=0.1, crackp=0.02)
    return L.snap(to8(b), pal)


@recipe('bathTile', (2, 2))
def bath_tile():
    """The bathroom of flat 103: 10 cm glazed tiles, pale blue, white grout gone grey, lime scale low down."""
    rng = np.random.default_rng(81)
    W = H = px(2)
    face = L.flatten(L.at_ppm(L.photo('clay_floor_001'), PPM), 0.3)
    a, cells = tile_layout(W, H, 20, 20, ['#d4e6ec', '#cfe2e8', '#d8eaee'], rng, face_src=face, face_contrast=0.25, grout=(0.7, 0.74, 0.74), gw=2, jitter=0.02)
    a = L.grade(a, mean='#cfe0e4')
    img, pal = L.pixel_art(a, k=20, seed=8, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.62, 0.66, 0.66), gw=2, bevel=(1.08, 0.88), chip=0.03, crackp=0.01)
    for (x0, y0, w, h) in cells:  # a glaze highlight in the top-left corner of each tile
        b[y0 + 2, x0 + 2:x0 + 6] = np.clip(b[y0 + 2, x0 + 2:x0 + 6] * 1.12, 0, 1)
        b[y0 + 3, x0 + 2] = np.clip(b[y0 + 3, x0 + 2] * 1.12, 0, 1)
    return L.snap(to8(b), pal)


@recipe('genkanTile', (2, 2))
def genkan_tile():
    """The sunken genkan floor: 20 cm grey stoneware tiles, gritty, scuffed by shoes."""
    rng = np.random.default_rng(71)
    W = H = px(2)
    face = L.flatten(L.at_ppm(L.photo('concrete_floor_02'), PPM), 0.3)
    a, cells = tile_layout(W, H, 10, 10, ['#9a948a', '#a49c90', '#948e84'], rng, face_src=face, face_contrast=0.8, grout=(0.42, 0.4, 0.38), gw=3)
    stains(a, rng, 6)
    a = L.grade(a, mean='#958f85')
    img, pal = L.pixel_art(a, k=24, seed=9, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.4, 0.38, 0.36), gw=3, chip=0.12)
    return L.snap(to8(b), pal)


# ------------------------------------------------------------------ the rooms
def tatami_mat(W, H, horiz, rng, weave):
    """One tatami mat: the igusa weave painted reed by reed (a lit, a mid and a shaded pixel row per reed, each reed
    its own tone, straw-coloured dashes along it, the warp stitches across), toned by the photo's large-scale fading;
    heri borders down the long edges (dark fabric with a woven pattern), a sewn short edge."""
    a = np.zeros((H, W, 3), np.float32)
    base = np.array(L.hexrgb('#c8c27a'), np.float32) * rng.uniform(0.95, 1.05)
    n_along, n_across = (W, H) if horiz else (H, W)
    reeds = np.ones((n_across, n_along), np.float32)
    prof = np.array([1.07, 1.0, 0.86], np.float32)
    for r in range(0, n_across, 3):
        tone = rng.uniform(0.95, 1.05)
        for k in range(3):
            if r + k < n_across:
                reeds[r + k] = prof[k] * tone
        x = 0
        while x < n_along:  # straw dashes along the reed
            ln = int(rng.integers(4, 14))
            if rng.random() < 0.35:
                reeds[r:r + 2, x:x + ln] *= rng.choice([0.92, 1.06])
            x += ln
    for x in range(0, n_along, 14):  # the warp stitches
        reeds[:, x] *= 0.93
    if not horiz:
        reeds = reeds.T
    # the photo's slow fading (sun, wear): blurred, gentle
    p = L.cut(weave, int(rng.integers(0, weave.shape[1])), int(rng.integers(0, weave.shape[0])), W, H)
    from PIL import Image as _I, ImageFilter as _F
    pl = np.asarray(_I.fromarray((np.clip(L.lum(p), 0, 1) * 255).astype(np.uint8)).filter(_F.GaussianBlur(12)), np.float32) / 255
    fade = 1 + (pl / max(pl.mean(), 1e-3) - 1) * 0.6
    a[:] = base * (reeds * fade)[..., None]
    hb = max(4, px(0.035))
    heri = np.array(L.hexrgb('#24301e'), np.float32)
    heri2 = np.array(L.hexrgb('#3a4a30'), np.float32)
    for t in range(hb):
        if horiz:
            for y in (t, H - 1 - t):
                a[y] = heri
                a[y, (np.arange(W) + t) % 4 == 0] = heri2
        else:
            for x in (t, W - 1 - t):
                a[:, x] = heri
                a[(np.arange(H) + t) % 4 == 0, x] = heri2
    edge = np.array(L.hexrgb('#8a8450'), np.float32)
    if horiz:
        a[:, 0] = edge; a[:, -1] = edge
    else:
        a[0] = edge; a[-1] = edge
    return a


def tatami_weave():
    return L.seamless(grain_along_x(L.flatten(L.at_ppm(L.photo('tatami_mat'), PPM), 0.2)))


@recipe('tatamiFloor', (3.6, 2.7))
def tatami_floor():
    """The six-mat floor of room 102 (one texture over 3.6 x 2.7 m): the mats laid so four corners never meet."""
    rng = np.random.default_rng(31)
    W, H = px(3.6), px(2.7)
    u = PPM * 0.9
    weave = tatami_weave()
    a = np.zeros((H, W, 3), np.float32)
    for (x0, y0, x1, y1) in [[0, 0, 2, 1], [2, 0, 4, 1], [0, 1, 1, 3], [1, 1, 3, 2], [1, 2, 3, 3], [3, 1, 4, 3]]:
        X0, Y0, X1, Y1 = round(x0 * u), round(y0 * u), round(x1 * u), round(y1 * u)
        horiz = (x1 - x0) > (y1 - y0)
        a[Y0:Y1, X0:X1] = tatami_mat(X1 - X0, Y1 - Y0, horiz, rng, weave if horiz else np.ascontiguousarray(np.rot90(weave)))
    L.dither_patch(a, W * 0.55, H * 0.55, 40, 30, f=0.9, k=0.6, rng=rng)  # worn where you sit
    L.dither_patch(a, W * 0.8, H * 0.4, 16, 12, f=0.82, k=0.6, rng=rng)   # a faint tea stain
    return finish(a, None, '#b5ac72', k=26)


@recipe('tatami', (1, 2))
def tatami_single():
    """One mat (0.9 x 1.8 m, with a 5 cm margin), for pixMat('tatami')."""
    rng = np.random.default_rng(199)
    a = tatami_mat(px(1), px(2), False, rng, np.ascontiguousarray(np.rot90(tatami_weave())))
    return finish(a, None, '#a39b63', k=24)


@recipe('tatamiMat', (1.8, 0.9))
def tatami_wide():
    """One mat lying across (1.8 x 0.9 m): Mikawa-ya's back room."""
    rng = np.random.default_rng(107)
    a = tatami_mat(px(1.8), px(0.9), True, rng, tatami_weave())
    return finish(a, None, '#b2aa70', k=24)


@recipe('wallpaper', (2, 2))
def wallpaper():
    """Off-white cloth wallpaper: a fine woven texture, a little yellowed, the odd scuff."""
    rng = np.random.default_rng(41)
    W = H = px(2)
    a = surface('terlenka', W, H, rng, std=0.035, sat=0.3, flat=0.0)
    stains(a, rng, 5, r=(20, 60), f=(0.94, 0.97))
    return finish(a, None, '#eae2d0', k=14)


@recipe('juraku', (2, 2))
def juraku():
    """聚楽壁 sand plaster: warm sandy finish with fine grit, a few darker grains."""
    rng = np.random.default_rng(17)
    W = H = px(2)
    a = surface('clay_plaster', W, H, rng, std=0.06, sat=0.6, blend=('sand_01', 0.15))
    return finish(a, None, '#d6c6a2', k=18, paint=1)


@recipe('ceilingBoards', (1.8, 1.8))
def ceiling_boards():
    """Room 102's ceiling: light boards 45 cm wide with a thin batten between them."""
    rng = np.random.default_rng(51)
    W = H = px(1.8)
    a, st = planks(W, H, 4, wood_src('okoume_veneer'), rng, ['#d8b888', '#d0ae80', '#d4b384'], vertical=True, length=(1.8, 1.8), joint=0.0)

    def strokes(b):
        b = st(b)
        for x in grid(W, 4)[:-1]:
            b[:, x:x + 3] *= 0.7
            b[:, (x + 3) % W] *= 1.15
        return np.clip(b, 0, 1)
    return finish(a, strokes, '#cbaa7d', k=24)


@recipe('flooring', (2, 2))
def flooring():
    """The kitchen strip's light-oak flooring: 12 cm boards, staggered joints, varnish worn in front of the sink."""
    rng = np.random.default_rng(61)
    W = H = px(2)
    a, st = planks(W, H, 16, wood_src('oak_veneer_01'), rng, ['#c89a68', '#d0a470', '#c49464'], vertical=True, length=(0.8, 1.6), contrast=0.9)
    stains(a, rng, 4, r=(30, 70), f=(0.9, 0.95))
    return finish(a, st, '#bb9162', k=26)


@recipe('woodFloor', (2, 2))
def wood_floor():
    """Old varnished floorboards (the museum's raised floor and the back rooms)."""
    rng = np.random.default_rng(21)
    W = H = px(2)
    a, st = planks(W, H, 14, wood_src('oak_veneer_05'), rng, ['#9a6a3f', '#8e6038', '#a37244'], length=(0.9, 1.8), nails=0.4)
    stains(a, rng, 5, r=(30, 70), f=(0.88, 0.94))
    return finish(a, st, '#8d613a', k=26)


@recipe('plaster', (2, 2))
def plaster_hd():
    """Painted plaster (room walls, painted parts tinted per part): warm cream, a faint roller texture."""
    rng = np.random.default_rng(13)
    W = H = px(2)
    a = surface('painted_plaster_wall', W, H, rng, std=0.05, sat=0.5)
    stains(a, rng, 4, r=(20, 60), f=(0.93, 0.96))
    return finish(a, None, '#d8ccb3', k=18, paint=1)


@recipe('cardboard', (1, 1))
def cardboard():
    """Corrugated cardboard: brown kraft with the flute ridges showing through, scuffs, a bit of tape residue."""
    rng = np.random.default_rng(169)
    W = H = px(1)
    a = surface('hessian_380', W, H, rng, std=0.03, sat=0.4)
    a = a * (1 + 0.035 * np.sin(np.arange(W) * 2 * np.pi / 4))[None, :, None]  # the flutes, 4 px apart
    stains(a, rng, 5, r=(10, 40), f=(0.88, 0.94))
    for _ in range(2):
        x, y = rng.integers(0, W), rng.integers(0, H)
        a[y:y + 12, :] = a[y:y + 12, :] * 1.08 if y + 12 < H else a[y:y + 12, :]
    return finish(a, None, '#b58753', k=18, paint=1)


# ------------------------------------------------------------------ the lane: walls, ground, roofs
def lap_boards(W, H, rows, src, rng, tones, mean, contrast=0.6, k=24, lap=(0.5, 0.75, 1.18), battens=0, paint=None):
    """Horizontal lap boards (下見板 / siding): each board's lower edge throws a shadow on the one below, its top
    catches the light; optional vertical battens (押縁) every 1/battens of the width."""
    a, st = planks(W, H, rows, src, rng, tones, length=(1.5, 3.5), contrast=contrast, joint=0.5, nails=0.3)
    if paint is not None:
        lp = L.lum(paint)
        a = a * (1 + (lp / lp.mean() - 1))[..., None]
    streaks(a, rng, 10, length=(40, 200), f=(0.86, 0.94))

    def strokes(b):
        b = st(b)
        ys = grid(H, rows)
        for y in ys[:-1]:
            b[(y + 1) % H] *= lap[0]
            b[(y + 2) % H] *= lap[1]
            b[(y - 1) % H] *= lap[2]
        if battens:
            for x in grid(W, battens)[:-1]:
                b[:, x:x + 10] = b[:, x:x + 10] * 0.9
                b[:, x] *= 1.25
                b[:, (x + 10) % W] *= 0.55
                b[:, (x + 11) % W] *= 0.8
                for y in ys[:-1]:  # a nail through the batten into each board
                    L.wpx(b, x + 5, y + (ys[1] - ys[0]) // 2, f=0.5)
        return np.clip(b, 0, 1)
    return finish(a, strokes, mean, k=k)


@recipe('houseWall', (2, 2))
def house_wall():
    """Painted lap siding (cream) on the old houses: 18 cm boards, paint chalking, dirt runs from the sills."""
    rng = np.random.default_rng(278)
    W = H = px(2)
    paint = surface('beige_wall_001', W, H, rng, std=0.04, sat=0.3)
    return lap_boards(W, H, 11, wood_src('ash_veneer'), rng, ['#cac1ad', '#c6bda8', '#cec5b2'], '#cac1ad', contrast=0.35, paint=paint)


@recipe('siding', (2, 2))
def siding():
    """Dark weathered clapboard (焼杉 style): 16 cm boards, the grain raised by weather, grey where the sun hits."""
    rng = np.random.default_rng(345)
    W = H = px(2)
    return lap_boards(W, H, 12, wood_src('weathered_planks'), rng, ['#34271e', '#3a2c22', '#2e231b'], '#34271e', contrast=1.3)


@recipe('boardWall', (2, 2))
def board_wall():
    """Board fence / shed wall: horizontal boards with a batten every 90 cm-ish, nails, weathering."""
    rng = np.random.default_rng(475)
    W = H = px(2)
    return lap_boards(W, H, 12, wood_src('brown_planks_08'), rng, ['#554231', '#5c4836', '#4e3c2c'], '#554231', contrast=1.2, battens=2)


@recipe('mortar', (2, 2))
def mortar():
    """モルタル rendered walls: rough float finish, hairline map cracks, rain streaks under the eaves."""
    rng = np.random.default_rng(464)
    W = H = px(2)
    a = surface('concrete_wall_004', W, H, rng, std=0.06, sat=0.4, blend=('beige_wall_002', 0.2))
    streaks(a, rng, 14, length=(40, 260), f=(0.86, 0.93))
    stains(a, rng, 4, r=(20, 60), f=(0.9, 0.95))
    a = L.grade(a, mean='#d3ccbd')
    img, pal = L.pixel_art(a, k=20, seed=10, paint=1)
    b = cracks(f32(img), rng, 5, length=(30, 140), f=0.78)
    return L.snap(to8(b), pal)


@recipe('tunnelWall', (2, 2))
def tunnel_wall():
    """The underpass walls: old cast concrete, soot and seep streaks from the deck, efflorescence."""
    rng = np.random.default_rng(425)
    W = H = px(2)
    a = surface('concrete_wall_006', W, H, rng, std=0.07, sat=0.3)
    streaks(a, rng, 30, length=(60, 400), f=(0.75, 0.9))
    a = L.grade(a, mean='#848076')
    img, pal = L.pixel_art(a, k=22, seed=11, paint=1)
    b = joints(f32(img), xs=(0,), ys=(), w=1, dark=0.7)
    cracks(b, rng, 2)
    return L.snap(to8(b), pal)


@recipe('prefabPanel', (2, 2))
def prefab_panel():
    """Light-steel prefab walls (ribbed enamel panels, the Suzukis' house): 11 cm ribs with a lit crest and a shaded
    valley, the cream enamel chalked and faded in patches, rust runs down from the fixings, an overlap seam."""
    rng = np.random.default_rng(495)
    return corrugated(px(2), px(2), 18, 'beige_wall_001', rng, '#d6cfbe',
                      ramp=(0.86, 0.95, 1.04, 1.09, 1.07, 1.0, 0.93, 0.86, 0.82), bolts=(px(0.2), px(1.2)), rust=6, fade=8, std=0.025, k=24)


@recipe('brickHD', (2, 2))
def brick_hd():
    """Red brick (the old works, the bathhouse chimney base): 22 x 7 cm bricks, each its own fired colour, sunk mortar."""
    rng = np.random.default_rng(377)
    return blocks(px(2), px(2), px(2) // 9, px(2) // 27, 'clay_floor_001', rng, '#8f5a46', joint=3, mortar='#9a948a',
                  tone=(0.82, 1.12), sat=0.9, tints=['#9a5a44', '#8a4e3a', '#a8664a', '#7a4636'], std=0.1, streak_n=4)


@recipe('oyaStone', (2, 2))
def oya_stone():
    """大谷石 Oya tuff walls: soft greenish stone blocks with the brown 'miso' pockets, weathered edges."""
    rng = np.random.default_rng(517)
    W = H = px(2)
    img = blocks(W, H, W // 3, H // 8, 'clay_plaster', rng, '#a7a27e', joint=3, mortar='#8a8670', tone=(0.92, 1.06), sat=0.5, std=0.08)
    b = f32(img)
    for _ in range(700):  # the miso: small brown pockets
        x, y = rng.integers(0, W), rng.integers(0, H)
        r = int(rng.integers(1, 3))
        L.dither_patch(b, x, y, r, r, c=(0.55, 0.4, 0.26), k=0.9)
    pal = L.palette(b, 24, 13)
    return L.snap(to8(b), pal)


@recipe('kenchi', (2, 2))
def kenchi():
    """間知石 retaining wall: square granite stones laid on the diagonal, deep joints, moss in the low corners."""
    rng = np.random.default_rng(402)
    W = H = px(2)
    s_ = 64  # stone pitch along the diagonals (wraps: 512 / 64)
    src = L.seamless(L.flatten(L.at_ppm(L.photo('granite_tile_04'), PPM), 0.3))
    y, x = np.mgrid[0:H, 0:W]
    u, v = (x + y) / s_, (x - y) / s_
    cu, cv = np.floor(u).astype(int), np.floor(v).astype(int)
    fu, fv = u - cu, v - cv
    a = np.zeros((H, W, 3), np.float32)
    tones = {}
    for key in set(zip(cu.ravel() % 16, cv.ravel() % 16)):
        tones[key] = (rng.uniform(0.86, 1.1), int(rng.integers(0, src.shape[1])), int(rng.integers(0, src.shape[0])))
    T = np.array([[tones.get((i, j), (1, 0, 0)) for j in range(16)] for i in range(16)], dtype=object)
    tone = np.vectorize(lambda i, j: tones[(i, j)][0] if (i, j) in tones else 1.0)(cu % 16, cv % 16).astype(np.float32)
    ox = np.vectorize(lambda i, j: tones[(i, j)][1] if (i, j) in tones else 0)(cu % 16, cv % 16)
    oy = np.vectorize(lambda i, j: tones[(i, j)][2] if (i, j) in tones else 0)(cu % 16, cv % 16)
    a = src[(y + oy) % src.shape[0], (x + ox) % src.shape[1]] * tone[..., None]
    # pillowed faces: lit towards the top-left, shaded bottom-right
    a *= (1 + (0.5 - fu) * 0.0 + (fv - 0.5) * 0.12 - (fu - 0.5) * 0.12)[..., None]
    a = detail_std(L.grade(a, sat=0.4), 0.08)
    joint = (np.minimum(fu, 1 - fu) * s_ < 1.6) | (np.minimum(fv, 1 - fv) * s_ < 1.6)
    a[joint] = np.array(L.hexrgb('#4a4842'), np.float32)
    a = L.grade(a, mean='#9e998d')
    img, pal = L.pixel_art(a, k=24, seed=14, paint=0)
    return img


@recipe('paving', (2, 2))
def paving():
    """Concrete paving slabs, 33 cm, gritty, uneven tones, weeds' dirt in the joints."""
    rng = np.random.default_rng(346)
    W = H = px(2)
    face = L.flatten(L.at_ppm(L.photo('concrete_floor_02'), PPM), 0.3)
    a, cells = tile_layout(W, H, 6, 6, ['#9d988f', '#a39e94', '#97928a'], rng, face_src=face, face_contrast=1.0, grout=(0.36, 0.35, 0.3), gw=3, random_faces=True)
    stains(a, rng, 8)
    a = L.grade(a, mean='#9d988f')
    img, pal = L.pixel_art(a, k=24, seed=15, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.34, 0.34, 0.28), gw=3, bevel=(1.06, 0.84), chip=0.2, crackp=0.08)
    return L.snap(to8(b), pal)


@recipe('gutterLid', (2, 0.5))
def gutter_lid():
    """Concrete U-gutter lids (側溝の蓋): 50 cm lids, two grip slots each, worn edges, dirt in the gaps."""
    rng = np.random.default_rng(355)
    W, H = px(2), px(0.5)
    face = L.flatten(L.at_ppm(L.photo('concrete_floor_02'), PPM), 0.3)
    a, cells = tile_layout(W, H, 4, 1, ['#97938b', '#9c978e', '#928e86'], rng, face_src=face, face_contrast=1.0, grout=(0.25, 0.24, 0.22), gw=3, random_faces=True)
    a = L.grade(a, mean='#97938b')
    img, pal = L.pixel_art(a, k=20, seed=16, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.25, 0.24, 0.22), gw=3, chip=0.3, crackp=0.1)
    for (x0, y0, w, h) in cells:
        for cx in (x0 + w // 4, x0 + 3 * w // 4):
            b[y0 + h // 2 - 4:y0 + h // 2 + 4, cx - 10:cx + 10] = (0.1, 0.1, 0.09)
            b[y0 + h // 2 - 5, cx - 10:cx + 10] *= 0.8
            b[y0 + h // 2 + 4, cx - 10:cx + 10] = np.clip(b[y0 + h // 2 + 4, cx - 10:cx + 10] * 1.3, 0, 1)
    return L.snap(to8(np.clip(b, 0, 1)), pal)


@recipe('grate', (0.5, 0.5))
def grate():
    """Steel drain grating: 3 cm bearing bars, a cross bar every 10 cm, rust and grime, dark below."""
    rng = np.random.default_rng(368)
    W = H = px(0.5)
    a = surface('rusty_metal_02', W, H, rng, std=0.08, sat=0.6)
    gap = np.zeros((H, W), bool)
    for x in range(0, W, 8):
        gap[:, x + 3:x + 8] = True
    for y in grid(H, 5)[:-1]:
        gap[y:y + 3] = False
    a[gap] = (0.06, 0.06, 0.055)
    a = L.grade(a, mean='#5a5c5a')
    img, pal = L.pixel_art(a, k=16, seed=17, paint=0)
    return img


@recipe('roadPaint', (1, 1))
def road_paint():
    """Road paint (white lines, letters): thick thermoplastic, worn through to the asphalt in specks and patches."""
    rng = np.random.default_rng(329)
    W = H = px(1)
    a = surface('concrete_wall_003', W, H, rng, std=0.03, sat=0.2)
    for _ in range(60):
        L.dither_patch(a, rng.integers(0, W), rng.integers(0, H), int(rng.integers(2, 12)), int(rng.integers(2, 9)), c=(0.36, 0.35, 0.34), k=rng.uniform(0.4, 0.9), rng=rng)
    return finish(a, None, '#ddd9ce', k=14)


@recipe('hazard', (1, 1))
def hazard():
    """Tiger stripes (yellow / black, 45 degrees, 12.5 cm), scuffed and chipped."""
    rng = np.random.default_rng(338)
    W = H = px(1)
    base = surface('blue_metal_plate', W, H, rng, std=0.05, sat=0.0)
    y, x = np.mgrid[0:H, 0:W]
    band = ((x + y) // 32) % 2 == 0
    a = np.where(band[..., None], np.array(L.hexrgb('#e0b418'), np.float32), np.array(L.hexrgb('#1e1c1a'), np.float32)) * (L.lum(base) / L.lum(base).mean())[..., None]
    for _ in range(40):
        L.dither_patch(a, rng.integers(0, W), rng.integers(0, H), int(rng.integers(2, 10)), int(rng.integers(2, 8)), c=(0.5, 0.48, 0.44), k=rng.uniform(0.3, 0.8), rng=rng)
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=16, seed=18, paint=0)
    return img


@recipe('tile', (2, 2))
def tile_white():
    """White glazed wall tiles, 15 cm, grey grout, a crazed or chipped one here and there."""
    rng = np.random.default_rng(244)
    W = H = px(2)
    face = L.flatten(L.at_ppm(L.photo('clay_floor_001'), PPM), 0.3)
    a, cells = tile_layout(W, H, 13, 13, ['#e2e0d8', '#dcdad2', '#e6e4dc'], rng, face_src=face, face_contrast=0.25, grout=(0.66, 0.65, 0.61), gw=2, random_faces=True, jitter=0.015)
    a = L.grade(a, mean='#dcdad2')
    img, pal = L.pixel_art(a, k=18, seed=19, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.6, 0.59, 0.55), gw=2, bevel=(1.06, 0.88), chip=0.05, crackp=0.03)
    return L.snap(to8(b), pal)


@recipe('tileSkirt', (2, 1))
def tile_skirt():
    """The tiled 腰壁 skirt of the old shops and houses: 5 x 5 cm mosaic tiles in mixed browns."""
    rng = np.random.default_rng(506)
    W, H = px(2), px(1)
    face = L.flatten(L.at_ppm(L.photo('clay_floor_001'), PPM), 0.3)
    a, cells = tile_layout(W, H, 40, 20, ['#8a5a3a', '#a06a42', '#7a4e34', '#b07a4c', '#6e4630'], rng, face_src=face, face_contrast=0.6, grout=(0.72, 0.68, 0.6), gw=2, random_faces=True)
    a = L.grade(a, mean='#846147')
    img, pal = L.pixel_art(a, k=24, seed=20, paint=0)
    b = tile_strokes(f32(img), cells, rng, (0.66, 0.62, 0.55), gw=2, bevel=(1.1, 0.84), chip=0.04, crackp=0.0)
    return L.snap(to8(b), pal)


@recipe('asphaltHD', (2, 2))
def asphalt_hd():
    """Asphalt (lane patches, forecourts): fine aggregate, tar-sealed cracks, an old cut-in repair."""
    rng = np.random.default_rng(311)
    W = H = px(2)
    a = surface('asphalt_01', W, H, rng, std=0.12, sat=0.3)
    stains(a, rng, 6, f=(0.85, 0.92))
    a = L.grade(a, mean='#4c4a48')
    img, pal = L.pixel_art(a, k=24, seed=21, paint=1)
    b = cracks(f32(img), rng, 4, length=(40, 160), f=0.55)
    return L.snap(to8(b), pal)


@recipe('asphalt', (2, 2))
def asphalt_px():
    rng = np.random.default_rng(212)
    W = H = px(2)
    a = surface('asphalt_02', W, H, rng, std=0.12, sat=0.3)
    stains(a, rng, 6, f=(0.85, 0.92))
    a = L.grade(a, mean='#4b4947')
    img, pal = L.pixel_art(a, k=24, seed=22, paint=1)
    b = cracks(f32(img), rng, 3, length=(40, 160), f=0.55)
    return L.snap(to8(b), pal)


@recipe('concrete', (2, 2))
def concrete_px():
    """Plain concrete (foundations, kerbs, steps)."""
    rng = np.random.default_rng(11)
    W = H = px(2)
    a = surface('concrete_floor_02', W, H, rng, std=0.07, sat=0.4)
    stains(a, rng, 6)
    a = L.grade(a, mean='#8d8882')
    img, pal = L.pixel_art(a, k=22, seed=23, paint=1)
    b = cracks(f32(img), rng, 3)
    return L.snap(to8(b), pal)


@recipe('ballast', (2, 2))
def ballast():
    """Track ballast: grey crushed stone, rust-brown near the rails."""
    rng = np.random.default_rng(457)
    W = H = px(2)
    a = surface('gravel', W, H, rng, std=0.16, sat=0.5)
    return finish(a, None, '#69645e', k=22, paint=1)


@recipe('roofTile', (2, 2))
def roof_tile():
    """Kawara (瓦) roofs: rows of S-profile clay tiles, 256 px/m (low porch roofs come within reach)."""
    rng = np.random.default_rng(437)
    return corrugated(px(2), px(2), 7, 'grey_roof_tiles', rng, '#80868e', ramp=(0.7, 0.86, 1.02, 1.14, 1.18, 1.1, 0.98, 0.84, 0.72, 0.62),
                      rust=0, courses=8, k=22)


@recipe('slateRoof', (2, 2))
def slate_roof():
    """Slate / cement-shingle roofs, 128 px/m (far)."""
    rng = np.random.default_rng(542)
    a = surface('grey_roof_tiles_02', 256, 256, rng, std=0.1, sat=0.4, ppm=128)
    return finish(a, None, '#484c56', k=20, paint=1)


@recipe('metalRoof', (2, 2))
def metal_roof():
    """Rusty standing-seam / corrugated roofs, 128 px/m (far)."""
    rng = np.random.default_rng(532)
    return corrugated(256, 256, 8, 'rusty_corrugated_iron', rng, '#8a5b43', rust=4, ppm=128, k=20)


@recipe('felt', (1, 1))
def felt():
    """Green felt (display boards, the card table): fine wool nap."""
    rng = np.random.default_rng(297)
    a = surface('caban', px(1), px(1), rng, std=0.05, sat=0.0)
    a = a * np.array(L.hexrgb('#2e5b39'), np.float32) / 0.4
    return finish(a, None, '#2e5b39', k=14, paint=1)


@recipe('velvet', (1, 1))
def velvet():
    """Red velvet (display plinths): soft pile with crushed shading."""
    rng = np.random.default_rng(303)
    a = surface('knitted_fleece', px(1), px(1), rng, std=0.07, sat=0.0)
    a = a * np.array(L.hexrgb('#8a1f2a'), np.float32) / 0.4
    return finish(a, None, '#8a1f2a', k=14, paint=1)


@recipe('shopFloor', (2, 2))
def shop_floor():
    """The museum's old varnished floorboards, darker where feet have worn the varnish."""
    rng = np.random.default_rng(31)
    W = H = px(2)
    a, st = planks(W, H, 14, wood_src('oak_veneer_05'), rng, ['#7a5434', '#70502f', '#84593a'], length=(0.9, 2.0), nails=0.4)
    stains(a, rng, 8, r=(30, 80), f=(0.86, 0.93))
    return finish(a, st, '#76522f', k=26)


@recipe('grassFloor', (2, 2))
def grass_floor():
    """Short grass (verges, the garden patches): blades and clumps from the photo, a little bare earth showing."""
    rng = np.random.default_rng(568)
    a = surface('grass_ground', px(2), px(2), rng, std=0.14, sat=1.0)
    return finish(a, None, '#60af46', k=22, paint=1, sat=0.9)


# ------------------------------------------------------------------ room 102: fusuma, the door, the curtain, the glass
def tint_detail(asset, W, H, rng, colour, std=0.05, ppm=PPM):
    """A photo's detail (luminance, normalised to `std`) on a flat `colour`: fabric, paint, paper."""
    a = surface(asset, W, H, rng, std=1.0, sat=0.0, ppm=ppm)
    g = L.lum(a)
    d = (g - g.mean()) / max(g.std(), 1e-3)
    return np.clip(np.array(L.hexrgb(colour), np.float32) * (1 + np.clip(d, -3, 3) * std)[..., None], 0, 1)


def fusuma(seed):
    """One fusuma leaf (0.9 x 1.74 m): woven fusuma paper, drifting kumo in gold leaf (painted in pixel strokes with a
    lit top edge), a mountain range in pale celadon along the foot, the black lacquered frame, a round hikite."""
    rng = np.random.default_rng(80 + seed)
    W, H = px(0.9), px(1.74)
    a = tint_detail('terlenka', W, H, rng, '#f0e6cc', std=0.03)
    gold, gold2 = np.array(L.hexrgb('#d8c08a'), np.float32), np.array(L.hexrgb('#e8d4a2'), np.float32)
    for k in range(5):  # kumo: long low cloud bands made of stacked rounded strokes
        cy = int(H * (0.1 + k * 0.17 + rng.uniform(0, 0.04)))
        cx = int(W * rng.uniform(0.15, 0.85))
        ln = int(rng.integers(60, 120))
        for row, (half, col) in enumerate(((ln // 2 - 18, gold2), (ln // 2, gold), (ln // 2 - 6, gold), (ln // 2 - 26, gold2))):
            y = cy + row * 3 - 4
            for x in range(cx - half, cx + half):
                wob = int(round(np.sin((x + k * 11) * 0.09) * 2))
                for t in range(3):
                    if 0 <= y + wob + t < H:
                        a[y + wob + t, x % W] = col * (1.06 if t == 0 else 1.0)
    for x in range(W):  # the mountains
        m = int(H * 0.86 - max(0, 60 - abs(x - W * (0.7 if seed % 2 else 0.3)) * 0.9) - np.sin(x * 0.07) * 6 - np.sin(x * 0.019 + seed) * 10)
        for y in range(max(0, m), H - 10):
            a[y, x] = np.array(L.hexrgb('#9ab0a0'), np.float32) * (0.94 + 0.08 * ((y - m) < 3))
    img, pal = L.pixel_art(a, k=22, seed=40 + seed, paint=0)
    b = f32(img)
    fr = np.array(L.hexrgb('#2a2018'), np.float32)
    for t in range(9):  # the lacquered frame (lit inner edge)
        c = fr * (1.4 if t == 7 else 1.0) if t < 8 else fr * 0.8
        b[t, :] = c; b[H - 1 - t, :] = c; b[:, t] = c; b[:, W - 1 - t] = c
    hx, hy = (24 if seed % 2 else W - 26), H // 2
    for y in range(-9, 10):
        for x in range(-9, 10):
            d = (x * x + y * y) ** 0.5
            if d <= 9:
                b[hy + y, hx + x] = (np.array(L.hexrgb('#3a2a1a')) if d > 6 else np.array(L.hexrgb('#7a6040')) * (1.2 if x + y < -3 else 1.0))
    pal2 = L.palette(b, 26, 41 + seed)
    return L.snap(to8(b), pal2)


recipe('fusuma1', (0.9, 1.74))(lambda: fusuma(1))
recipe('fusuma2', (0.9, 1.74))(lambda: fusuma(2))


@recipe('doorInside', (0.86, 1.9))
def door_inside():
    """The inside face of flat 102's steel door: cream baked paint over pressed steel, the lever and the thumb-turn,
    the door chain hanging in a loop, the peephole, the newspaper flap, a reminder note taped on, scuffs at the foot."""
    rng = np.random.default_rng(91)
    W, H = px(0.86), px(1.9)
    a = tint_detail('blue_metal_plate', W, H, rng, '#d8ccb0', std=0.03)
    stains(a, rng, 4, r=(20, 50), f=(0.94, 0.97))
    for y in range(H - 40, H - 4):  # scuffs from shoes
        for x in range(6, W - 6):
            if rng.random() < 0.06:
                L.wpx(a, x, y, f=0.85)
    img, pal = L.pixel_art(a, k=16, seed=50, paint=0)
    b = f32(img)
    steel, dark, lit = np.array(L.hexrgb('#b8bcc2'), np.float32), np.array(L.hexrgb('#5a5e64'), np.float32), np.array(L.hexrgb('#e8ecf0'), np.float32)
    b[0:6] *= 0.7; b[-6:] *= 0.7; b[:, 0:6] *= 0.7; b[:, -6:] *= 0.7  # the pressed frame
    b[6] *= 1.12; b[:, 6] *= 1.12
    hy = int(H * 0.48)
    b[hy:hy + 7, 12:44] = steel; b[hy, 12:44] = lit; b[hy + 6, 12:44] = dark  # the lever
    b[hy - 10:hy + 16, 14:26] = steel * 0.95; b[hy - 10, 14:26] = lit; b[hy - 10:hy + 16, 25] = dark  # the rose plate
    b[hy - 40:hy - 26, 16:24] = steel; b[hy - 36:hy - 30, 19:21] = dark  # the thumb-turn
    for i in range(60):  # the chain, hanging in a loop
        x = 22 + i
        y = int(H * 0.33 + np.sin(i / 60 * np.pi) * 26)
        b[y:y + 2, x:x + 2] = lit if i % 4 < 2 else steel
    b[int(H * 0.29):int(H * 0.29) + 5, W // 2 - 2:W // 2 + 3] = (0.12, 0.12, 0.12)  # the peephole
    b[int(H * 0.29), W // 2 - 2:W // 2 + 3] = steel
    sy = int(H * 0.66)
    b[sy:sy + 14, W // 2 - 28:W // 2 + 28] = np.array(L.hexrgb('#b8ac94'), np.float32); b[sy + 14:sy + 17, W // 2 - 28:W // 2 + 28] = np.array(L.hexrgb('#8a8070'), np.float32)
    nx, ny = W - 70, int(H * 0.16)  # the reminder note: yellow paper, ink lines, a strip of tape
    b[ny:ny + 56, nx:nx + 48] = np.array(L.hexrgb('#fff2a0'), np.float32)
    for k in range(5):
        y = ny + 12 + k * 8
        for x in range(nx + 5, nx + 5 + int(rng.integers(24, 40))):
            if rng.random() < 0.8:
                b[y + (1 if rng.random() < 0.2 else 0), x] = np.array(L.hexrgb('#4a4a7a'), np.float32)
    b[ny - 3:ny + 4, nx + 14:nx + 34] = np.array(L.hexrgb('#f0ead8'), np.float32)
    b[ny + 44:ny + 52, nx + 34:nx + 42] = np.array(L.hexrgb('#e5383b'), np.float32)
    return L.snap(to8(np.clip(b, 0, 1)), L.palette(np.clip(b, 0, 1), 26, 51))


@recipe('curtain', (0.5, 1.5))
def curtain():
    """Room 102's curtains: mint cotton with a faint woven check, a cream stripe every so often."""
    rng = np.random.default_rng(9)
    W, H = px(0.5), px(1.5)
    a = tint_detail('rough_linen', W, H, rng, '#8ac8b4', std=0.05, ppm=PPM * 2)
    for y in range(0, H, 96):
        a[y:y + 3] = a[y:y + 3] * 0.0 + np.array(L.hexrgb('#f4ecd4'), np.float32) * (1 + (L.lum(a[y:y + 3]) - L.lum(a[y:y + 3]).mean())[..., None] * 0.5)
    for x in range(0, W, 16):
        a[:, x] *= 0.94
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=14, seed=52, paint=0)
    return img


@recipe('kitchenGlass', (0.55, 0.4))
def kitchen_glass():
    """The kitchen window's figured glass (型板ガラス) with the evening glowing through: a diamond pattern, the light in
    stepped, dithered bands (no smooth gradient)."""
    W, H = px(0.55), px(0.4)
    y, x = np.mgrid[0:H, 0:W]
    t = y / H
    warm = np.array(L.hexrgb('#ffd0a0'), np.float32) * (1 - t)[..., None] + np.array(L.hexrgb('#ff9a60'), np.float32) * t[..., None]
    band = np.floor(t * 6) / 6
    warm = np.array(L.hexrgb('#ffd0a0'), np.float32) * (1 - band)[..., None] + np.array(L.hexrgb('#ff9a60'), np.float32) * band[..., None]
    dia = ((x + y) % 10 < 1) | ((x - y) % 10 < 1)
    a = warm * np.where(dia, 1.08, 1.0)[..., None]
    a[((x + y) % 10 == 1)] *= 0.94
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=12, seed=53, paint=0, clean_passes=0)
    return img


@recipe('bathDoor', (0.68, 1.85))
def bath_door():
    """The dead unit bath's door: white resin panel, a frosted window with ribbed glass, the frame, a latch handle."""
    rng = np.random.default_rng(5)
    W, H = px(0.68), px(1.85)
    a = tint_detail('beige_wall_001', W, H, rng, '#e8e8ec', std=0.02)
    gx0, gx1, gy0, gy1 = 20, W - 20, 50, int(H * 0.56)
    for yy in range(gy0, gy1):
        a[yy, gx0:gx1] = np.array(L.hexrgb('#c8d8e0' if (yy // 4) % 2 else '#d8e4ea'), np.float32)
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=14, seed=54, paint=0)
    b = f32(img)
    fr = np.array(L.hexrgb('#9a9ea4'), np.float32)
    b[0:8] = fr; b[-8:] = fr; b[:, 0:8] = fr; b[:, -8:] = fr
    b[gy0 - 3:gy0, gx0 - 3:gx1 + 3] = fr; b[gy1:gy1 + 3, gx0 - 3:gx1 + 3] = fr * 1.1
    b[:, W // 2 - 1:W // 2 + 1] *= 0.92
    hy = int(H * 0.6)
    b[hy:hy + 24, W - 46:W - 34] = np.array(L.hexrgb('#8a8e94'), np.float32); b[hy, W - 46:W - 34] = 0.9
    return L.snap(to8(np.clip(b, 0, 1)), L.palette(np.clip(b, 0, 1), 16, 55))


# ------------------------------------------------------------------ the views out of the windows (backdrops)
OPEN_IMAGES = 'https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg'
VIEWS = {  # tools/make-views.py's CC BY 2.0 Open Images photos (credited under "Window views"), at their full width
    'view_lane': dict(id='50d546d006457f9a', subset='train', crop=(0.0, 0.08, 1.0, 0.62), size=(952, 476), m=(8, 4),
                      opts=dict(fam=5, steps=8, bins='even', chroma=0.8, smooth=0.05, passes=2, min_cluster=3, hue=0.1, maxdrop=1, maxlift=1)),
    'view_plaza': dict(id='1c50a2d9bb44696e', subset='train', crop=(0.0, 0.0, 1.0, 0.75), size=(1020, 408), m=(10, 4),
                       opts=dict(fam=6, steps=8, bins='even', chroma=0.8, smooth=0.05, passes=2, min_cluster=3, hue=0.1, maxdrop=1, maxlift=1)),
    'view_tracks': dict(id='2ab37fb75e9ecd33', subset='test', crop=(0.0, 0.12, 1.0, 0.6), size=(1020, 408), m=(10, 4),
                        opts=dict(fam=6, steps=8, bins='even', chroma=0.6, smooth=0.06, passes=2, min_cluster=3, hue=0.1, maxdrop=1, maxlift=1)),
}


def view(key):
    """A window view as HD pixel art (tools/pixelart.py reduce) at the photo's own full width (never upscaled)."""
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    from pixelart import reduce
    from PIL import Image as _I
    v = VIEWS[key]
    d = os.path.join(L.CACHE, 'openimages')
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, v['id'] + '.jpg')
    if not os.path.exists(path):
        open(path, 'wb').write(L._get(OPEN_IMAGES % (v['subset'], v['id'])))
    im = _I.open(path).convert('RGB')
    W, H = im.size
    x, y, w, h = v['crop']
    im = im.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
    assert im.width >= v['size'][0], 'never upscale a view'
    rgb8, labels, pal = reduce(np.asarray(im, np.float32) / 255, v['size'][0], v['size'][1], wrap=False, **v['opts'])
    return np.asarray(rgb8, np.uint8)[..., :3]


for _k, _v in VIEWS.items():
    recipe(_k, _v['m'])(lambda k=_k: view(k))


# ------------------------------------------------------------------ the lane's small art (src/world/Town.js)
def rgba(img8, alpha):
    return np.dstack([img8, (np.clip(alpha, 0, 1) * 255).astype(np.uint8)])


@recipe('town_noren', (0.66, 0.72))
def town_noren():
    """One panel of the garage's 暖簾: indigo-dyed cotton (the weave from a linen scan), darker hems, a white 菱 crest
    resist-dyed in the middle with the dye bleeding a little at its edges, the hem fraying."""
    rng = np.random.default_rng(985)
    W, H = px(0.66), px(0.72)
    a = tint_detail('rough_linen', W, H, rng, '#24345e', std=0.07, ppm=PPM * 2)
    a[:12] *= 0.72; a[-14:] *= 0.72  # the hems: doubled cloth, darker
    cx, cy = W // 2, int(H * 0.5)
    y, x = np.mgrid[0:H, 0:W]
    d = np.abs(x - cx) + np.abs(y - cy)
    white = np.array(L.hexrgb('#f2eee4'), np.float32)
    for r0, r1 in ((60, 52), (34, 26), (6, 0)):  # nested diamonds
        ring = (d <= r0) & (d > r1)
        jag = rng.random((H, W)) < 0.25
        edge = ring & ((d > r0 - 2) | (d < r1 + 3)) & jag
        a[ring & ~edge] = white * (1 + (L.lum(a[ring & ~edge]) - L.lum(a[ring & ~edge]).mean())[..., None] * 0.6)
        a[edge] = white * 0.75 + np.array(L.hexrgb('#24345e'), np.float32) * 0.25
    for x0 in range(0, W, 3):  # fraying threads at the hem
        if rng.random() < 0.3:
            a[H - int(rng.integers(1, 5)):, x0] *= 0.6
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=16, seed=60, paint=0)
    return img


@recipe('town_gutterGrit', (2, 0.34))
def town_gutter_grit():
    """Grit along the kerbs and the wall feet: sand and gravel, dead leaves, a cigarette end, thicker against the kerb
    (top of the strip), thinning out across it. Alpha-cut."""
    rng = np.random.default_rng(1169)
    W, H = px(2), px(0.34)
    src = L.tile_to(L.seamless(L.flatten(L.at_ppm(L.photo('gravel'), PPM), 0.3)), W, H, rng)
    t = np.linspace(0, 1, H)[:, None]
    lum_ = L.lum(src)
    keep = (lum_ / lum_.mean() - 1) * 0.8 + rng.random((H, W)) * 0.5 > (t * 1.1 - 0.1)
    from PIL import Image as _I, ImageFilter as _F
    keep = np.asarray(_I.fromarray((keep * 255).astype(np.uint8)).filter(_F.ModeFilter(3)), np.uint8) > 127
    a = L.grade(src, sat=0.5) * 0.8
    for _ in range(24):  # leaves and litter
        cx, cy = int(rng.integers(0, W)), int(rng.integers(0, int(H * 0.7)))
        col = np.array(L.hexrgb(['#9a6a2a', '#b8862a', '#7a5a2a', '#6a7a3a', '#e8e4d8'][int(rng.integers(5))]), np.float32)
        lw, lh = int(rng.integers(5, 12)), int(rng.integers(3, 7))
        ang = rng.uniform(0, np.pi)
        for yy in range(-lh, lh + 1):
            for xx in range(-lw, lw + 1):
                if (xx / lw) ** 2 + (yy / lh) ** 2 <= 1:
                    X, Y = int(cx + xx * np.cos(ang) - yy * np.sin(ang)), int(cy + xx * np.sin(ang) + yy * np.cos(ang))
                    if 0 <= Y < H:
                        a[Y, X % W] = col * (0.85 if yy > 0 else 1.0)
                        keep[Y, X % W] = True
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=18, seed=61, paint=0, clean_passes=1)
    return rgba(img, keep.astype(np.float32))


@recipe('town_puddle', (1.8, 1.8))
def town_puddle():
    """A rain puddle in the asphalt camber: dark water with a sky-blue sheen (the shader reflects where blue > red), a
    wet darker rim, an irregular edge. Alpha-cut."""
    rng = np.random.default_rng(1548)
    W = H = px(1.8)
    y, x = np.mgrid[0:H, 0:W]
    ang = np.arctan2(y - H / 2, x - W / 2)
    r = np.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2))
    ph = rng.uniform(0, 6.28, 4)
    edge = 0.82 + 0.08 * np.sin(ang * 3 + ph[0]) + 0.05 * np.sin(ang * 5 + ph[1]) + 0.03 * np.sin(ang * 9 + ph[2])
    water = r < edge
    rim = (r < edge + 0.06) & ~water
    a = tint_detail('asphalt_01', W, H, rng, '#2a2c30', std=0.08)
    from PIL import Image as _I, ImageFilter as _F
    n = np.asarray(_I.fromarray((rng.random((H // 8, W // 8)) * 255).astype(np.uint8)).resize((W, H), _I.BICUBIC).filter(_F.GaussianBlur(6)), np.float32) / 255
    sheen = np.floor((n - n.min()) / max(np.ptp(n), 1e-3) * 4) / 4  # stepped sky sheen across the water
    a[water] = (np.array(L.hexrgb('#343c4a'), np.float32) * (0.9 + 0.25 * sheen[water])[..., None]
                + (L.lum(a[water]) - L.lum(a[water]).mean())[..., None] * 0.15)
    for _ in range(40):  # grit and a leaf floating / showing through
        cx, cy = int(rng.integers(0, W)), int(rng.integers(0, H))
        if water[cy, cx]:
            a[cy:cy + 2, cx:cx + 3] = np.array(L.hexrgb(['#5a524a', '#7a5a2a', '#2a2a2c'][int(rng.integers(3))]), np.float32)
    a[rim] = np.array(L.hexrgb('#24252a'), np.float32)
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=12, seed=62, paint=0)
    return rgba(img, (water | rim).astype(np.float32))


@recipe('town_fenceMesh', (0.5, 0.5))
def town_fence_mesh():
    """Green PVC-coated chain-link (菱形金網): 5 cm diamonds, the wire 2 texels wide with a lit and a shaded side,
    the coating worn to steel here and there. Alpha-cut."""
    rng = np.random.default_rng(1329)
    W = H = px(0.5)
    y, x = np.mgrid[0:H, 0:W]
    pitch = W // 10
    u, v = (x + y) % pitch, (x - y) % pitch
    wire = (u < 2) | (v < 2)
    a = np.zeros((H, W, 3), np.float32)
    a[:] = np.array(L.hexrgb('#4a7a52'), np.float32)
    a[(u == 0) | (v == 0)] *= 1.25
    a[((u == 0) | (u == 1)) & ((v == 0) | (v == 1))] *= 0.7  # the knuckles where wires cross
    worn = rng.random((H, W)) < 0.03
    a[worn & wire] = np.array(L.hexrgb('#9aa0a0'), np.float32)
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=8, seed=63, paint=0, clean_passes=0)
    return rgba(img, wire.astype(np.float32))


@recipe('town_blockDeco', (0.8, 0.2))
def town_block_deco():
    """透かしブロック: a course of perforated decorative concrete blocks (20 cm motifs: a four-petal opening in each),
    the same concrete as the block walls. Alpha-cut openings."""
    rng = np.random.default_rng(1749)
    W, H = px(0.8), px(0.2)
    face = cblocks(W, H, W // 4, H, rng, '#a09c94', joint=3, mortar='#7c7972')
    y, x = np.mgrid[0:H, 0:W]
    cw = W // 4
    lx, ly = (x % cw) - cw / 2, y - H / 2
    r = H * 0.36
    hole = np.zeros((H, W), bool)
    for dx, dy in ((r * 0.45, 0), (-r * 0.45, 0), (0, r * 0.45), (0, -r * 0.45)):
        hole |= ((lx - dx) ** 2 + (ly - dy) ** 2) < (r * 0.42) ** 2
    b = f32(face)
    ring = np.zeros_like(hole)
    for ox, oy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
        ring |= np.roll(np.roll(hole, ox, 1), oy, 0) & ~hole
    b[ring] *= 0.7  # the inner faces of the openings, in shadow
    return rgba(to8(b), (~hole).astype(np.float32))


# ------------------------------------------------------------------ Gacha Kaikan (src/growth/mall): floors and ceiling
MALL = {1: ('#f6e8ec', '#e8a8bc', '#c8889c'), 2: ('#eef8f6', '#9adcd0', '#6ab8ac'), 3: ('#f4e2c4', '#c8784a', '#9a5a38'),
        4: ('#2a2630', '#5a4a2a', '#d4a83a')}  # src/growth/mall/layout.js THEMES a, b, grout


def mall_tile(n):
    """A floor of the department store: 50 cm polished porcelain tiles in the floor's two colours, a fine grout line,
    a soft polish sheen near one corner of each tile, scuffs from trolleys."""
    a_, b_, g_ = MALL[n]
    rng = np.random.default_rng(700 + n)
    W = H = px(2)
    face = L.flatten(L.at_ppm(L.photo('clay_floor_001'), PPM), 0.3)
    a, cells = tile_layout(W, H, 4, 4, [a_, b_], rng, face_src=face, face_contrast=0.55, grout=L.hexrgb(g_), gw=2, jitter=0.02)
    stains(a, rng, 6, r=(20, 60), f=(0.93, 0.97))
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=22, seed=30 + n, paint=1)
    b = tile_strokes(f32(img), cells, rng, L.hexrgb(g_), gw=2, bevel=(1.06, 0.9), chip=0.02, crackp=0.0)
    for (x0, y0, w, h) in cells:  # the polish: a dithered sheen in the top-left quarter
        L.dither_patch(b, x0 + w * 0.3, y0 + h * 0.3, int(w * 0.2), int(h * 0.15), f=1.05, k=0.5)
    return L.snap(to8(np.clip(b, 0, 1)), pal)


for _n in MALL:
    recipe('mallTile%d' % _n, (2, 2))(lambda n=_n: mall_tile(n))


@recipe('mallCeil', (2, 2))
def mall_ceil():
    """The store's ceiling: 50 cm white acoustic boards, pin-hole pattern, a grey T-bar grid."""
    rng = np.random.default_rng(799)
    W = H = px(2)
    face = L.flatten(L.at_ppm(L.photo('beige_wall_001'), PPM), 0.3)
    a, cells = tile_layout(W, H, 4, 4, ['#f4f4f2'], rng, face_src=face, face_contrast=0.3, grout=L.hexrgb('#c8c8c4'), gw=4, jitter=0.01)
    img, pal = L.pixel_art(np.clip(a, 0, 1), k=12, seed=40, paint=1)
    b = f32(img)
    for (x0, y0, w, h) in cells:
        for yy in range(y0 + 6, y0 + h - 4, 7):
            for xx in range(x0 + 6 + (yy // 7 % 2) * 3, x0 + w - 4, 7):
                L.wpx(b, xx, yy, f=0.88)
    return L.snap(to8(b), pal)


# ------------------------------------------------------------------ src/world/surfaces.js (were 128 px/m PNGs)
@recipe('sf_asphalt', (4, 4))
def sf_asphalt():
    """The lane's road surface: worn asphalt, tar-sealed cracks, an old trench repair, oil drips."""
    rng = np.random.default_rng(1001)
    W = H = px(4)
    a = surface('asphalt_01', W, H, rng, std=0.2, sat=0.35, blend=('asphalt_04', 0.2))
    stains(a, rng, 12, r=(20, 80), f=(0.86, 0.93))
    x0 = int(rng.integers(0, W))  # a trench repair: darker, smoother band with sealed edges
    a[:, x0:x0 + 70] = a[:, x0:x0 + 70] * 0.86 if x0 + 70 <= W else a[:, x0:x0 + 70]
    a = L.grade(a, gain=(0.97, 0.98, 1.02), mean=(0.33, 0.33, 0.33), sat=0.35)
    img, pal = L.pixel_art(a, k=28, seed=24, paint=1)
    b = f32(img)
    if x0 + 70 <= W:
        b[:, x0] *= 0.6; b[:, x0 + 69] *= 0.6
    cracks(b, rng, 7, length=(60, 260), f=0.5)
    return L.snap(to8(b), pal)


@recipe('sf_concrete', (4, 4))
def sf_concrete():
    rng = np.random.default_rng(1002)
    W = H = px(4)
    a = surface('concrete_wall_003', W, H, rng, std=0.07, sat=0.4, blend=('concrete_floor_02', 0.2))
    stains(a, rng, 8)
    a = L.grade(a, gain=(1.0, 0.99, 0.96), mean=(0.62, 0.62, 0.62), sat=0.4)
    img, pal = L.pixel_art(a, k=24, seed=25, paint=1)
    b = cracks(f32(img), rng, 4)
    return L.snap(to8(b), pal)


@recipe('sf_cblock', (4, 4))
def sf_cblock():
    rng = np.random.default_rng(1964)
    return cblocks(px(4), px(4), px(0.4), px(0.2), rng, '#a09c94', mortar='#7c7972')


@recipe('sf_park_ground', (4, 4))
def sf_park_ground():
    rng = np.random.default_rng(1003)
    a = surface('rocky_trail_02', px(4), px(4), rng, std=0.1, sat=0.8, blend=('dirt', 0.2))
    a = L.grade(a, gain=(1.08, 1.02, 0.92), mean=(0.56, 0.53, 0.47))
    return finish(a, None, (0.56, 0.53, 0.47), k=26, paint=1)


@recipe('sf_sand', (4, 4))
def sf_sand():
    rng = np.random.default_rng(1004)
    a = surface('sand_01', px(4), px(4), rng, std=0.07, sat=0.8)
    return finish(a, None, (0.68, 0.64, 0.56), k=20, paint=1)


@recipe('sf_paving', (4, 4))
def sf_paving():
    rng = np.random.default_rng(1005)
    W = H = px(4)
    face = L.flatten(L.at_ppm(L.photo('concrete_floor_02'), PPM), 0.3)
    a, cells = tile_layout(W, H, 8, 8, ['#9e9a92', '#a6a298', '#96928a'], rng, face_src=face, face_contrast=1.0, grout=(0.4, 0.39, 0.35), gw=3, random_faces=True)
    stains(a, rng, 12)
    a = L.grade(a, mean=(0.62, 0.61, 0.59))
    img, pal = L.pixel_art(a, k=24, seed=26, paint=1)
    b = tile_strokes(f32(img), cells, rng, (0.38, 0.37, 0.33), gw=3, bevel=(1.06, 0.84), chip=0.2, crackp=0.06)
    return L.snap(to8(b), pal)


@recipe('sf_plywood', (3.64, 3.64))
def sf_plywood():
    """Eight 91 x 182 cm lauan sheets, each cut from its own place in the grain, seams and nail rows."""
    rng = np.random.default_rng(1999)
    src = grain_along_x(L.seamless(L.flatten(L.at_ppm(L.photo('plywood'), PPM), 0.2)))
    src = np.ascontiguousarray(np.rot90(src))
    pw, ph = 233, 466
    W, H = 4 * pw, 2 * ph
    a = np.zeros((H, W, 3), np.float32)
    for j in range(2):
        for i in range(4):
            sh_ = L.cut(src, int(rng.integers(0, src.shape[1])), int(rng.integers(0, src.shape[0])), pw, ph, 0, rng.random() < 0.5)
            sh_ = detail_std(L.grade(sh_, sat=0.55), 0.05) * rng.uniform(0.95, 1.05)
            a[j * ph:(j + 1) * ph, i * pw:(i + 1) * pw] = sh_
    a = L.grade(a, mean=(0.72, 0.6, 0.46))
    img, pal = L.pixel_art(a, k=24, seed=27, paint=0)
    b = f32(img)
    for i in range(4):
        b[:, i * pw] *= 0.55; b[:, (i * pw + 1) % W] *= 1.08
    for j in range(2):
        b[j * ph] *= 0.55; b[(j * ph + 1) % H] *= 1.08
    for i in range(4):
        for j in range(2):
            for y in range(j * ph + 24, (j + 1) * ph - 12, 38):
                for x in (i * pw + 6, (i + 1) * pw - 7):
                    L.wpx(b, x, y, f=0.6); L.wpx(b, x, y - 1, f=1.1)
    return L.snap(to8(b), pal)


def detail_map(asset, std, seed):
    rng = np.random.default_rng(seed)
    a = surface(asset, px(2), px(2), rng, std=std, sat=0.0)
    g = L.lum(a)
    g = 0.85 + (g - g.mean()) / max(g.std(), 1e-3) * std
    a = np.repeat(np.clip(g, 0, 1)[..., None], 3, 2)
    img, pal = L.pixel_art(a, k=10, seed=seed, paint=1)
    return img


@recipe('sf_detail_paint', (2, 2))
def sf_detail_paint():
    return detail_map('painted_plaster_wall', 0.06, 1006)


@recipe('sf_detail_metal', (2, 2))
def sf_detail_metal():
    return detail_map('rusty_metal_02', 0.06, 1007)


@recipe('sf_detail_wood', (2, 2))
def sf_detail_wood():
    rng = np.random.default_rng(1008)
    a, st = planks(px(2), px(2), 14, wood_src('weathered_planks'), rng, ['#d8d8d8'], contrast=0.8, joint=0.0)
    g = L.lum(a)
    g = 0.85 + (g - g.mean()) / max(g.std(), 1e-3) * 0.07
    img, pal = L.pixel_art(np.repeat(np.clip(g, 0, 1)[..., None], 3, 2), k=10, seed=1008, paint=0)
    return img


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
              f'{len(np.unique(img.reshape(-1, img.shape[2]), axis=0))} colours')
    json.dump(dict(sorted(man.items())), open(MANIFEST, 'w'), indent=1)
    src = os.path.join(HERE, 'sources.json')
    old = json.load(open(src)) if os.path.exists(src) else {}
    for a, mm in L.USED.items():
        old[a] = {'source': f'https://polyhaven.com/a/{a}', 'license': 'CC0-1.0', 'metres': round(mm, 3)}
    json.dump(dict(sorted(old.items())), open(src, 'w'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1:])
