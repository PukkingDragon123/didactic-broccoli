"""paperkit.py: real paper for printed things. Every surface effect comes from a real CC0 scan (ambientCG):
  Paper001 fine white stock, Paper002 grey newsprint, Paper003 crumpled sheet (creases), Paper004 kraft, Paper005 /
  Paper006 brown wrapping, Cardboard002 corrugated board, SurfaceImperfections003 streaky grime (rain runs),
  SurfaceImperfections005 water rings (tide marks), SurfaceImperfections007 drips and specks.
The ink is printed INTO the paper (multiplied by the stock's own grain), then the physical life of the sheet is laid
on top: sun fade (magenta and yellow go first, as real inks do), folds, creases, rain runs and tide marks outdoors,
masking tape and torn corners (alpha).
  age(im, **opts) -> RGBA   (im: a finished RGB print at its output size)
  stock(name, w, h, scale=1.0) -> float32 HxWx3 0..1 (a tiled real paper scan)
"""
import os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from printkit import source, rgb

_tiles = {}


def _scan(name):
    if name not in _tiles:
        im = source('acg:' + name)
        _tiles[name] = np.asarray(im.convert('RGB'), np.float32) / 255
    return _tiles[name]


def _opacity(name):
    """The opacity map of a SurfaceImperfections set (fetched with its colour map)."""
    k = name + ':op'
    if k not in _tiles:
        import io, zipfile, urllib.request
        from printkit import CACHE, UA
        p = os.path.join(CACHE, 'acg', name + '_op.jpg')
        if not os.path.exists(p):
            z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(urllib.request.Request('https://ambientcg.com/get?file=%s_1K-JPG.zip' % name, headers=UA), timeout=120).read()))
            with open(p, 'wb') as f: f.write(z.read(next(n for n in z.namelist() if n.endswith('_Opacity.jpg'))))
        _tiles[k] = np.asarray(Image.open(p).convert('L'), np.float32) / 255
    return _tiles[k]


def tile(a, w, h, scale=1.0, ox=0, oy=0):
    """Tile a 2D/3D array over w x h at scale (texels of a per output px), offset (ox, oy)."""
    H0, W0 = a.shape[:2]
    if scale != 1.0:
        sq = a.ndim == 3 and a.shape[2] == 1
        im = Image.fromarray((np.clip(a[..., 0] if sq else a, 0, 1) * 255).astype(np.uint8))
        im = im.resize((max(2, int(W0 * scale)), max(2, int(H0 * scale))), Image.LANCZOS)
        a = np.asarray(im, np.float32) / 255
        if sq: a = a[..., None]
        H0, W0 = a.shape[:2]
    ys = (np.arange(h) + oy) % H0; xs = (np.arange(w) + ox) % W0
    return a[ys][:, xs]


def stock(name, w, h, scale=1.0, ox=0, oy=0):
    return tile(_scan(name), w, h, scale, ox, oy)


def _lum(a): return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11


def grain(im, paper='Paper001', k=1.0, scale=0.5, seed=0):
    """Print the image into a real paper stock: multiply by the stock's normalised lightness (k = how much)."""
    a = np.asarray(im.convert('RGB'), np.float32) / 255
    h, w = a.shape[:2]
    s = stock(paper, w, h, scale, seed * 37, seed * 53)
    L = _lum(s); L = L / max(1e-3, L.mean())
    g = 1 + (L - 1) * 3.0 * k
    return a * np.clip(g, 0.7, 1.15)[..., None]


def fade_cmy(a, f):
    """Sun fade: magenta and yellow inks bleach first, then cyan, the black last; the paper yellows a little."""
    C, M, Y = 1 - a[..., 0], 1 - a[..., 1], 1 - a[..., 2]
    K = np.minimum(np.minimum(C, M), Y)
    C, M, Y = C - K, M - K, Y - K
    C *= 1 - f * 0.35; M *= 1 - f * 0.8; Y *= 1 - f * 0.65; K *= 1 - f * 0.28
    out = np.stack([1 - (C + K), 1 - (M + K), 1 - (Y + K)], -1)
    paper = np.array([0.95, 0.92, 0.84], np.float32)
    return out * (1 - f * 0.12) + paper * f * 0.12 * out.mean(-1, keepdims=True) / 0.8


def age(im, paper='Paper001', grain_k=0.8, fade=0.0, crease=0.0, folds=(0, 0), streak=0.0, rings=0.0, specks=0.0,
        torn=None, tape=None, yellow=0.0, seed=1, outdoor=False):
    """A finished print, aged on a real stock -> RGBA (alpha: torn corners and lost tabs).
    folds (nx, ny): fold lines across / down the sheet; crease: crumple from the Paper003 scan; streak: rain runs from
    the top (outdoors); rings: tide marks; torn: list of corners 'tl' 'tr' 'bl' 'br' torn away; tape: corners taped."""
    rnd = np.random.default_rng(seed)
    w, h = im.size
    a = grain(im, paper, grain_k, seed=seed)
    if fade: a = fade_cmy(a, fade)
    if yellow:
        a = a * (1 - yellow * np.array([0.0, 0.05, 0.16], np.float32))
    if crease:
        c = _lum(stock('Paper003', w, h, 0.6 + 0.3 * rnd.random(), int(rnd.integers(0, 900)), int(rnd.integers(0, 900))))
        c = (c - c.mean()) / max(1e-3, c.std())
        a = a * (1 + c * 0.05 * crease)[..., None]
    ny, nx = folds
    if nx or ny:
        L = np.ones((h, w), np.float32)
        for i in range(1, nx + 1):  # vertical folds
            x = int(w * i / (nx + 1) + rnd.integers(-2, 3))
            L[:, max(0, x - 1)] *= 0.93; L[:, x] *= 1.07; L[:, min(w - 1, x + 1)] *= 0.97
        for j in range(1, ny + 1):
            y = int(h * j / (ny + 1) + rnd.integers(-2, 3))
            L[max(0, y - 1)] *= 0.93; L[y] *= 1.07; L[min(h - 1, y + 1)] *= 0.97
        a = a * L[..., None]
        # ink rubs off along the folds where they cross
        for i in range(1, nx + 1):
            for j in range(1, ny + 1):
                cx, cy = int(w * i / (nx + 1)), int(h * j / (ny + 1)); r = 3
                a[max(0, cy - r):cy + r, max(0, cx - r):cx + r] = a[max(0, cy - r):cy + r, max(0, cx - r):cx + r] * 0.6 + 0.38
    if streak:
        s = tile(_lum(_scan('SurfaceImperfections003'))[..., None], w, h, 0.5, int(rnd.integers(0, 500)), 0)[..., 0]
        s = np.clip((s - 0.18) * 2.2, 0, 1)
        top = np.linspace(1.0, 0.35, h, dtype=np.float32)[:, None]
        a = a * (1 - s * streak * 0.35 * top)[..., None] + np.array([0.20, 0.17, 0.12], np.float32) * (s * streak * 0.08 * top)[..., None]
    if rings:
        r_ = tile(_opacity('SurfaceImperfections005')[..., None], w, h, 0.45, int(rnd.integers(0, 500)), int(rnd.integers(0, 500)))[..., 0]
        a = a * (1 - r_ * rings * 0.35)[..., None] + np.array([0.55, 0.42, 0.22], np.float32) * (r_ * rings * 0.18)[..., None]
    if specks:
        sp = tile(_opacity('SurfaceImperfections007')[..., None], w, h, 0.4, int(rnd.integers(0, 500)), int(rnd.integers(0, 500)))[..., 0]
        a = a * (1 - np.clip(sp, 0, 1) * specks * 0.4)[..., None]
    a = np.clip(a, 0, 1)
    out = Image.fromarray((a * 255).astype(np.uint8)).convert('RGBA')
    if tape:
        for corner in tape: _tape(out, corner, rnd)
    if torn:
        for corner in torn: _tear(out, corner, rnd)
    return out


def _tape(out, corner, rnd):
    """A strip of masking tape (cut from a real kraft paper scan, translucent) across a corner."""
    w, h = out.size
    tw, th = max(18, int(w * 0.17)), max(7, int(w * 0.05))
    t = stock('Paper001', tw, th, 0.5, int(rnd.integers(0, 300)), int(rnd.integers(0, 300)))
    t = t * np.array([0.93, 0.88, 0.72], np.float32)
    ta = Image.fromarray((np.clip(t, 0, 1) * 255).astype(np.uint8)).convert('RGBA')
    m = Image.new('L', (tw, th), 190); d = ImageDraw.Draw(m)
    for x in range(0, tw):  # torn tape ends, a little ragged
        pass
    for y in range(th):
        for side in (0, tw - 1):
            n = int(rnd.integers(0, 3))
            for k in range(n): m.putpixel((side + (k if side == 0 else -k), y), 0)
    ta.putalpha(m)
    ang = (-35 if corner in ('tl', 'br') else 35) + float(rnd.normal(0, 5))
    ta = ta.rotate(ang, expand=True, resample=Image.BICUBIC)
    x = -ta.width // 3 if corner[1] == 'l' else w - ta.width * 2 // 3
    y = -ta.height // 3 if corner[0] == 't' else h - ta.height * 2 // 3
    layer = Image.new('RGBA', out.size, (0, 0, 0, 0)); layer.paste(ta, (x, y), ta)
    out.alpha_composite(layer)


def _tear(out, corner, rnd):
    """Tear a corner away along a ragged line; the torn edge shows the paper's white core."""
    w, h = out.size
    s = int(min(w, h) * (0.12 + 0.12 * rnd.random()))
    pts = []
    n = 12
    for i in range(n + 1):
        t = i / n
        jitter = rnd.normal(0, s * 0.06)
        pts.append((t * s + jitter * 0.3, (1 - t) * s + jitter))
    m = Image.new('L', (w, h), 255); d = ImageDraw.Draw(m)
    poly = [(0, 0)] + pts
    fx = (lambda x: x) if corner[1] == 'l' else (lambda x: w - 1 - x)
    fy = (lambda y: y) if corner[0] == 't' else (lambda y: h - 1 - y)
    P = [(fx(x), fy(y)) for x, y in poly]
    d.polygon(P, fill=0)
    rim = m.filter(ImageFilter.MinFilter(3))
    a = np.asarray(out, np.float32)
    edge = (np.asarray(m) > 0) & (np.asarray(rim) == 0)
    a[edge, :3] = a[edge, :3] * 0.3 + np.array([236, 230, 214], np.float32) * 0.7
    a[..., 3] = np.minimum(a[..., 3], np.asarray(m, np.float32))
    out.paste(Image.fromarray(a.astype(np.uint8)))


def lost_tabs(out, x0, y0, tab_w, n, taken, rnd=None):
    """Tear-off tabs along the bottom: the ones in `taken` are gone (transparent), each cut a little ragged."""
    a = np.asarray(out).copy()
    h = a.shape[0]
    for i in taken:
        x = x0 + i * tab_w
        a[y0 + 2:, x + 1:x + tab_w, 3] = 0
        a[y0:y0 + 2, x + 1:x + tab_w, :3] = (a[y0:y0 + 2, x + 1:x + tab_w, :3] * 0.4 + np.array([236, 230, 214]) * 0.6).astype(np.uint8)
    out.paste(Image.fromarray(a))
    return out
