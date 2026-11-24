"""Helpers for the HD surface textures (make_hd.py): real CC0 photos (Poly Haven, fetched at 2k into the lowpix photo
cache) cut, laid out and toned at the game's close-up texel density, then turned into pixel art: an edge-preserving
paint-over, a limited palette (k-means in Oklab), cluster clean-up (no lonely pixels, no speckle), and hand-placed
pixel strokes on top (grout, seams, nail heads, chips, cracks, stains) snapped back onto the palette.

Everything is deterministic (seeded). Images are float32 HxWx3 in 0..1 (sRGB) until `pixel_art` returns uint8.
"""
from __future__ import annotations

import json
import os
import urllib.request

import numpy as np
from PIL import Image

CACHE = os.environ.get('LOWPIX_CACHE') or os.path.join(os.path.expanduser('~'), '.cache', 'lowpix')
PHOTOS = os.path.join(CACHE, 'photos')
_DIMS = None
USED = {}  # asset -> metres (every photo a recipe touched, for sources.json / the credits)


# ------------------------------------------------------------------ photos
def _get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'lowpix-texture-baker'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def _dims():
    """Real size (metres) of every Poly Haven texture, from the public asset list (cached)."""
    global _DIMS
    if _DIMS is None:
        p = os.path.join(CACHE, 'ph_textures.json')
        if not os.path.exists(p):
            os.makedirs(CACHE, exist_ok=True)
            open(p, 'wb').write(_get('https://api.polyhaven.com/assets?type=textures'))
        _DIMS = {k: (v.get('dimensions') or [2000, 2000]) for k, v in json.load(open(p)).items()}
    return _DIMS


def photo(asset, res='2k', nor=False):
    """A Poly Haven texture: {'diff': HxWx3, 'nor': HxWx3 (-1..1) or None, 'm': width in metres, 'ppm': px per metre}."""
    d = os.path.join(PHOTOS, f'{asset}_{res}')
    os.makedirs(d, exist_ok=True)
    want = {'diff': 'Diffuse'}
    if nor:
        want['nor'] = 'nor_gl'
    listing = None
    out = {}
    for key, ph in want.items():
        path = os.path.join(d, f'{key}.jpg')
        if not os.path.exists(path):
            if listing is None:
                listing = json.loads(_get(f'https://api.polyhaven.com/files/{asset}'))
            f = (listing.get(ph) or {}).get(res, {})
            f = f.get('jpg') or f.get('png')
            open(path, 'wb').write(_get(f['url']))
        im = Image.open(path).convert('RGB')
        a = np.asarray(im, np.float32) / 255.0
        out[key] = a * 2 - 1 if key == 'nor' else a
    mm = _dims().get(asset, [2000, 2000])
    out['m'] = mm[0] / 1000.0
    out['ppm'] = out['diff'].shape[1] / out['m']
    USED[asset] = out['m']
    return out


def resize(a, w, h, flt=Image.BOX):
    if a.ndim == 2:
        return np.asarray(Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)).resize((w, h), flt), np.float32) / 255
    return np.asarray(Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8)).resize((w, h), flt), np.float32) / 255


def at_ppm(p, ppm, key='diff'):
    """The whole photo resampled to `ppm` px per metre (box filter: every target pixel averages the real surface)."""
    a = p[key]
    k = ppm / p['ppm']
    return resize(a, max(1, round(a.shape[1] * k)), max(1, round(a.shape[0] * k)))


def cut(src, x, y, w, h, rot=0, flip=False):
    """A w x h window of `src` at (x, y), wrapping round its edges; then rot90 x rot, flipped."""
    H, W = src.shape[:2]
    ys = (np.arange(h) + y) % H
    xs = (np.arange(w) + x) % W
    a = src[ys][:, xs]
    if flip:
        a = a[:, ::-1]
    return np.ascontiguousarray(np.rot90(a, rot))


def seamless(a, frac=0.2):
    """Cross-fade an image with its half-shifted self so a photo crop wraps without a seam."""
    H, W = a.shape[:2]
    sh = np.roll(np.roll(a, H // 2, 0), W // 2, 1)
    y = np.abs(np.linspace(-1, 1, H))[:, None]
    x = np.abs(np.linspace(-1, 1, W))[None, :]
    w = np.clip((np.maximum(x, y) - (1 - 2 * frac)) / (2 * frac), 0, 1)
    return a * (1 - w[..., None]) + sh * w[..., None]


def tile_to(src, W, H, rng, jitter=True):
    """Fill W x H from a (smaller) seamless source, each copy offset / flipped so the repeat doesn't line up."""
    out = np.zeros((H, W, 3), np.float32)
    sh, sw = src.shape[:2]
    for y0 in range(0, H, sh):
        for x0 in range(0, W, sw):
            p = cut(src, int(rng.integers(0, sw)) if jitter else 0, int(rng.integers(0, sh)) if jitter else 0, sw, sh)
            out[y0:y0 + sh, x0:x0 + sw] = p[:min(sh, H - y0), :min(sw, W - x0)]
    return out


# ------------------------------------------------------------------ colour
def lum(a):
    return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def grade(a, mean=None, contrast=1.0, sat=1.0, gain=(1, 1, 1)):
    """Contrast about the mean, saturation, a colour gain, then scaled so the mean colour is `mean` (hex or rgb)."""
    m = a.reshape(-1, 3).mean(0)
    a = m + (a - m) * contrast
    if sat != 1.0:
        L = lum(a)[..., None]
        a = L + (a - L) * sat
    a = a * np.array(gain, np.float32)
    if mean is not None:
        t = np.array(hexrgb(mean) if isinstance(mean, str) else mean, np.float32)
        cur = a.reshape(-1, 3).mean(0)
        a = a * (t / np.maximum(cur, 1e-3))
    return np.clip(a, 0, 1)


def hexrgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def flatten(a, contrast=0.0):
    """Remove the photo's own large-scale light (de-light): divide by a heavy blur, keep the mean."""
    from PIL import ImageFilter
    r = max(4, a.shape[1] // 12)
    b = np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255
    m = a.reshape(-1, 3).mean(0)
    out = a / np.maximum(b, 0.03) * m
    return np.clip(out * (1 - contrast) + a * contrast, 0, 1)


def _srgb_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def oklab(rgb):
    l = _srgb_lin(np.clip(rgb, 0, 1))
    M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]], np.float32)
    M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]], np.float32)
    lms = np.cbrt(l @ M1.T)
    return lms @ M2.T


# ------------------------------------------------------------------ paint-over and pixel art
def _box(a, r):
    k = 2 * r + 1
    pad = np.pad(a, [(r + 1, r), (r + 1, r)] + [(0, 0)] * (a.ndim - 2), mode='wrap')
    c = pad.cumsum(0).cumsum(1)
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def kuwahara(img, r=2):
    """Edge-preserving flattening (each pixel takes its calmest quadrant's mean): photo noise becomes painted shapes."""
    L = lum(img)
    m = _box(img, r)
    ml = _box(L, r)
    v = _box(L * L, r) - ml * ml
    best = np.full(L.shape, np.inf, np.float32)
    out = np.zeros_like(img)
    for dy in (-r, r):
        for dx in (-r, r):
            vv = np.roll(np.roll(v, -dy, 0), -dx, 1)
            mm = np.roll(np.roll(m, -dy, 0), -dx, 1)
            sel = vv < best
            best = np.where(sel, vv, best)
            out[sel] = mm[sel]
    return out


def palette(img, k=24, seed=0, sample=80000):
    """k colours for an image: k-means in Oklab on a sample of its pixels (sorted dark to light)."""
    rng = np.random.default_rng(seed)
    flat = img.reshape(-1, 3)
    s = flat[rng.choice(len(flat), min(sample, len(flat)), replace=False)]
    X = oklab(s)
    # k-means++ seeding
    C = [X[rng.integers(len(X))]]
    for _ in range(1, k):
        d = np.min([((X - c) ** 2).sum(1) for c in C], axis=0)
        if not d.sum() > 0:  # fewer distinct colours than k
            break
        C.append(X[rng.choice(len(X), p=d / d.sum())])
    k = len(C)
    C = np.array(C)
    for _ in range(14):
        lab = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(-1), 1)
        for j in range(k):
            sel = lab == j
            if sel.any():
                C[j] = X[sel].mean(0)
    lab = np.argmin(((X[:, None, :] - C[None]) ** 2).sum(-1), 1)
    rgb = np.array([s[lab == j].mean(0) if (lab == j).any() else s[0] for j in range(k)], np.float32)
    return rgb[np.argsort(lum(rgb))]


def assign(img, pal):
    """Nearest palette index per pixel (Oklab)."""
    P = oklab(pal)
    X = oklab(img.reshape(-1, 3))
    out = np.empty(len(X), np.int32)
    for i in range(0, len(X), 262144):
        out[i:i + 262144] = np.argmin(((X[i:i + 262144, None, :] - P[None]) ** 2).sum(-1), 1)
    return out.reshape(img.shape[:2])


def _neigh_counts(lab, k, centre=True):
    H, W = lab.shape
    p = np.pad(lab, 1, mode='wrap')
    cnt = np.zeros((k, H, W), np.int8)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0 and not centre:
                continue
            n = p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]
            for j in np.unique(n):
                cnt[j] += (n == j)
    return cnt


def clean(lab, k, passes=2):
    """Pixel-art clean-up on palette indices: a pixel no 4-neighbour shares takes its most common 8-neighbour."""
    H, W = lab.shape
    for _ in range(passes):
        p = np.pad(lab, 1, mode='wrap')
        n4 = [p[0:H, 1:W + 1], p[2:H + 2, 1:W + 1], p[1:H + 1, 0:W], p[1:H + 1, 2:W + 2]]
        lonely = np.ones((H, W), bool)
        for n in n4:
            lonely &= n != lab
        if not lonely.any():
            break
        cnt = _neigh_counts(lab, k, centre=False)
        lab = np.where(lonely, cnt.argmax(0), lab)
    return lab


def pixel_art(img, k=24, seed=0, paint=1, pal=None, clean_passes=2):
    """The pixel-art pass: paint-over (kuwahara r=`paint`), palette of k colours, indices cleaned. -> (uint8 img, pal)."""
    a = kuwahara(img, paint) if paint else img
    if pal is None:
        pal = palette(a, k, seed)
    lab = assign(a, pal)
    lab = clean(lab, len(pal), clean_passes)
    return (pal[lab] * 255 + 0.5).astype(np.uint8), pal


def snap(img8, pal):
    """Snap a uint8 image (after hand-placed strokes) back onto the palette."""
    lab = assign(img8.astype(np.float32) / 255, pal)
    return (pal[lab] * 255 + 0.5).astype(np.uint8)


# ------------------------------------------------------------------ hand-placed pixel strokes (on float images, wrapping)
def wpx(a, x, y, f=None, c=None, alpha=1.0):
    """Shade (f: multiply) or paint (c: rgb) one pixel, wrapping."""
    H, W = a.shape[:2]
    x, y = int(round(x)) % W, int(round(y)) % H
    if c is not None:
        a[y, x] = a[y, x] * (1 - alpha) + np.array(c, np.float32) * alpha
    elif f is not None:
        a[y, x] = np.clip(a[y, x] * f, 0, 1)


B4 = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) / 16


def dither_patch(a, cx, cy, rx, ry, f=None, c=None, k=0.6, rng=None, wobble=0.25):
    """A soft stain / wear patch laid with an ordered dither (no smooth gradient): shade or paint, wrapping."""
    H, W = a.shape[:2]
    ys, xs = np.mgrid[-ry:ry + 1, -rx:rx + 1]
    d = np.sqrt((xs / max(rx, 1)) ** 2 + (ys / max(ry, 1)) ** 2)
    if rng is not None and wobble:
        ang = np.arctan2(ys, xs)
        ph = rng.uniform(0, 6.28, 3)
        d = d * (1 + wobble * (np.sin(ang * 2 + ph[0]) * 0.5 + np.sin(ang * 3 + ph[1]) * 0.35 + np.sin(ang * 5 + ph[2]) * 0.15))
    s = np.clip(1 - d, 0, 1) * k
    X = (xs + int(cx)) % W
    Y = (ys + int(cy)) % H
    on = s > B4[Y % 4, X % 4]
    if c is not None:
        a[Y[on], X[on]] = np.array(c, np.float32)
    else:
        a[Y[on], X[on]] = np.clip(a[Y[on], X[on]] * f, 0, 1)


def crack(a, x, y, length, rng, f=0.62, dx=0.0, dy=1.0, branch=0.04, lit=1.12):
    """A hairline crack: a wandering 1 px line with a lit pixel beside it now and then, occasionally branching."""
    H, W = a.shape[:2]
    ang = np.arctan2(dy, dx)
    px, py = float(x), float(y)
    for i in range(int(length)):
        wpx(a, px, py, f=f)
        if rng.random() < 0.15:
            wpx(a, px + 1, py, f=lit)
        ang += rng.normal(0, 0.35)
        ang = ang * 0.85 + np.arctan2(dy, dx) * 0.15
        px += np.cos(ang)
        py += np.sin(ang)
        if rng.random() < branch:
            crack(a, px, py, length * 0.3 * rng.random(), rng, f, np.cos(ang + 0.9), np.sin(ang + 0.9), 0, lit)


def streak(a, x, y, length, f=0.85, rng=None, width=1):
    """A run (rain, rust, drip) that fades as it falls, dithered."""
    for i in range(int(length)):
        k = 1 - i / max(1, length)
        for w in range(width):
            if B4[int(y + i) % 4, int(x + w) % 4] < k:
                wpx(a, x + w, y + i, f=f)
        if rng is not None and rng.random() < 0.05:
            x += rng.choice([-1, 1])


def save_webp(img8, path):
    """Lossless WebP (pixel art: exact colours, palette-packed)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(img8).save(path, 'WEBP', lossless=True, quality=100, method=6)
    return os.path.getsize(path)
