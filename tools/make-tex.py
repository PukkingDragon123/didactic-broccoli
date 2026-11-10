#!/usr/bin/env python3
"""make-tex.py: real photographs -> the game's seamless cartoon surface tiles (public/img/tex/*.jpg).

The photo texture library (src/kit/photoTex.js) is made from CC BY 2.0 photos of real surfaces out of Google Open
Images (credited one by one in CREDITS.md). Each one is

  1. cropped (optionally turned or rectified) to the flat, front-on part of the surface;
  2. evened out: a high-pass against a large blur takes the photographer's light fall-off and colour cast away;
  3. made to tile: per axis the best self-matching overlap is found, a minimum-error seam is cut through it
     (dynamic programming, no mirroring) and feathered;
  4. repainted: an edge-keeping bilateral filter flattens photographic noise, the picture is reduced to a small
     palette (k-means in Oklab, no dithering, nothing added), specks are absorbed by a mode filter at twice the
     size, and the result is scaled down so every shape has a clean anti-aliased edge;
  5. regraded: the palette is moved to the surface's colour in the game's pastel, slightly desaturated range,
     with the detail in darker tones of that colour (never black);
  6. written as a 512 x 512 JPEG.

Usage (run with -I when the photo folder holds downloads):
  python3 -I tools/make-tex.py <photo dir> [--fetch] [--sheet out.png] [--meta out.json] [name ...]
    <photo dir>   where the source photos are (<Open Images id>.jpg); --fetch downloads the missing ones
    --sheet       also write a contact sheet with every tile repeated 3 x 3
    --meta        write name -> { avg, bytes } as JSON (the avg colours go into src/kit/photoTex.js)
Needs Pillow and numpy.
"""
import json
import math
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw

SIZE = 512
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img', 'tex')
S3 = 'https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg'

# name -> source photo and how to treat it.
#   id, subset   the Open Images photo
#   crop         (x, y, w, h) as fractions of the photo (after turn); quad: 4 corners TL, BL, BR, TR (fractions)
#   turn         quarter turns anticlockwise; rot: fine rotation in degrees (anticlockwise) before cropping
#   col          the colour the surface should average to (hex); None keeps the photo's own, a little pastel
#   k            palette size; contrast: spread of lightness wanted (Oklab L, std); chroma: how much hue variation stays
#   smooth       bilateral range sigma (bigger = flatter); passes: how many times; clean: mode-filter radius (px at 2x)
#   flat         strength of the lighting high-pass (0..1); flat_sigma: its blur as a fraction of the crop
#   ox, oy       overlap search range per axis, as fractions of the crop
#   feather      seam feather in px (x seam, y seam)
T = {}


def tex(name, id, subset, crop=(0, 0, 1, 1), **kw):
    T[name] = dict(id=id, subset=subset, crop=crop, **kw)


# ---------------------------------------------------------------------------------------------------- the sources
# (filled in below, after the helpers, by SOURCES())


# ---------------------------------------------------------------------------------------------------- colour
def srgb2lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((np.maximum(c, 0) + 0.055) / 1.055) ** 2.4)


def lin2srgb(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


M1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929], [0.2119034982, 0.6806995451, 0.1073969566], [0.0883024619, 0.2817188376, 0.6299787005]])
M2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468], [1.9779984951, -2.4285922050, 0.4505937099], [0.0259040371, 0.7827717662, -0.8086757660]])


def rgb2lab(rgb):
    return np.cbrt(srgb2lin(rgb) @ M1.T) @ M2.T


def lab2rgb(lab):
    return lin2srgb((lab @ np.linalg.inv(M2).T) ** 3 @ np.linalg.inv(M1).T)


def hex2rgb(h):
    return np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], dtype=np.float64) / 255


# ---------------------------------------------------------------------------------------------------- filters
def gblur(a, sigma, wrap=True):
    """Gaussian blur by FFT (periodic); wrap=False reflects the borders first."""
    if sigma <= 0:
        return a
    if not wrap:
        p = int(min(3 * sigma, min(a.shape[:2]) - 1))
        pad = [(p, p), (p, p)] + [(0, 0)] * (a.ndim - 2)
        return gblur(np.pad(a, pad, mode='reflect'), sigma)[p:-p, p:-p]
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (math.pi * sigma) ** 2 * (fx * fx + fy * fy))
    if a.ndim == 3:
        g = g[:, :, None]
    return np.fft.irfft2(np.fft.rfft2(a, axes=(0, 1)) * g, s=(h, w), axes=(0, 1)).astype(a.dtype)


def bilateral(a, radius, sigma_s, sigma_r, passes):
    """Edge-keeping smoothing, periodic. a: H x W x 3 in Oklab."""
    a = a.astype(np.float32)
    offs = [(dy, dx) for dy in range(-radius, radius + 1) for dx in range(-radius, radius + 1) if dy * dy + dx * dx <= radius * radius + 1]
    for _ in range(passes):
        acc = np.zeros_like(a)
        wsum = np.zeros(a.shape[:2], dtype=np.float32)
        for dy, dx in offs:
            b = np.roll(a, (dy, dx), axis=(0, 1))
            d = b - a
            w = np.exp(-(d * d).sum(-1) / (2 * sigma_r * sigma_r) - (dy * dy + dx * dx) / (2 * sigma_s * sigma_s)).astype(np.float32)
            acc += b * w[:, :, None]
            wsum += w
        a = acc / wsum[:, :, None]
    return a


def resize(a, w, h, wrap=False, how=Image.BICUBIC):
    """Resize a float H x W x C array; wrap=True pads periodically first so the borders stay seamless."""
    H, W = a.shape[:2]
    if wrap:
        py, px = max(4, H // 16), max(4, W // 16)
        a = np.pad(a, [(py, py), (px, px), (0, 0)], mode='wrap')
        sy, sx = h / H, w / W
        big = resize(a, round(a.shape[1] * sx), round(a.shape[0] * sy), False, how)
        oy, ox = round(py * sy), round(px * sx)
        return big[oy:oy + h, ox:ox + w]
    ch = [np.asarray(Image.fromarray(a[:, :, c].astype(np.float32), 'F').resize((w, h), how)) for c in range(a.shape[2])]
    return np.stack(ch, -1)


# ---------------------------------------------------------------------------------------------------- tiling
def seam_path(E, cyclic):
    """Minimum-cost top-to-bottom path through E (rows x cols), one column per row, moving at most one column a row."""
    if cyclic:
        n = E.shape[0]
        return seam_path(np.concatenate([E, E, E], 0), False)[n:2 * n]
    n, m = E.shape
    C = np.empty_like(E)
    C[0] = E[0]
    big = np.float32(1e9)
    for y in range(1, n):
        p = C[y - 1]
        left = np.concatenate([[big], p[:-1]])
        right = np.concatenate([p[1:], [big]])
        C[y] = E[y] + np.minimum(p, np.minimum(left, right))
    path = np.empty(n, dtype=np.int64)
    path[-1] = int(np.argmin(C[-1]))
    for y in range(n - 2, -1, -1):
        x = path[y + 1]
        lo, hi = max(0, x - 1), min(m, x + 2)
        path[y] = lo + int(np.argmin(C[y, lo:hi]))
    return path


def tile_x(A, lo, hi, feather, cyclic, log):
    """Make A (H x W x 3) repeat along x: overlap its right end onto its left end where they match best, cut a
    minimum-error seam through the overlap and feather it. Returns a narrower image."""
    H, W = A.shape[:2]
    G = gblur(A, 1.2, wrap=False)
    best = None
    for O in range(max(8, int(lo * W)), max(9, int(hi * W)) + 1):
        d = G[:, :O] - G[:, W - O:]
        cost = float((d * d).mean())
        if best is None or cost < best[0]:
            best = (cost, O)
    O = best[1]
    L, R = A[:, :O], A[:, W - O:]
    d = G[:, :O] - G[:, W - O:]
    E = (d * d).sum(-1).astype(np.float32)
    # keep the seam off the very ends of the overlap, where there is no room to feather
    ramp = np.minimum(np.arange(O), O - 1 - np.arange(O)).astype(np.float32)
    E = E + (np.maximum(0, feather * 1.5 - ramp) / max(1.0, feather * 1.5))[None, :] ** 2 * float(E.mean()) * 4
    p = seam_path(E, cyclic)
    x = np.arange(O)[None, :] - p[:, None]
    m = np.clip(x / max(1e-3, feather) * 0.5 + 0.5, 0, 1)
    m = m * m * (3 - 2 * m)                              # 0 -> the right end's pixels, 1 -> the left end's
    m = gblur(m.astype(np.float32), 1.0, wrap=cyclic)
    out = A[:, :W - O].copy()
    out[:, :O] = R * (1 - m[:, :, None]) + L * m[:, :, None]
    log.append(f'overlap {O}px cost {best[0]:.5f}')
    return out


def make_tileable(A, ox, oy, feather, log):
    B = tile_x(A, ox[0], ox[1], feather[0], False, log)
    B = tile_x(np.ascontiguousarray(B.transpose(1, 0, 2)), oy[0], oy[1], feather[1], True, log).transpose(1, 0, 2)
    return np.ascontiguousarray(B)


# ---------------------------------------------------------------------------------------------------- repaint
def kmeans(P, k, iters=14):
    """Deterministic k-means: P is N x 3 (Oklab). Starts from lightness quantiles."""
    order = np.argsort(P[:, 0])
    C = np.stack([P[order[int((i + 0.5) / k * len(P))]] for i in range(k)])
    for _ in range(iters):
        lab = np.argmin(((P[:, None, :] - C[None, :, :]) ** 2).sum(-1), 1)
        for i in range(k):
            if (lab == i).any():
                C[i] = P[lab == i].mean(0)
    return C


def repaint(lab, k, clean, lweight=1.0):
    """Reduce a smoothed Oklab image (at 2x) to k flat colours with clean region shapes. Returns labels, palette."""
    H, W = lab.shape[:2]
    Wt = np.array([lweight, 1, 1], dtype=np.float32)
    P = (lab * Wt).reshape(-1, 3)
    C = kmeans(P[::23].astype(np.float64), k).astype(np.float32)
    # soft membership, smoothed, then the winner: a mode filter that rounds shapes and swallows specks
    score = np.empty((k, H, W), dtype=np.float32)
    for i in range(k):
        score[i] = -((lab * Wt - C[i]) ** 2).sum(-1)
    lab0 = np.argmax(score, 0)
    votes = np.stack([gblur((lab0 == i).astype(np.float32), clean) for i in range(k)])
    lab1 = np.argmax(votes, 0)
    pal = np.stack([lab.reshape(-1, 3)[(lab1 == i).reshape(-1)].mean(0) if (lab1 == i).any() else C[i] / Wt for i in range(k)])
    return lab1, pal


def regrade(pal, counts, col, contrast, chroma, maxdrop, maxlift):
    """Move the palette (Oklab) to the target colour; detail stays as lighter / darker tones of it."""
    w = counts / counts.sum()
    m = (pal * w[:, None]).sum(0)
    d = pal - m
    sd = math.sqrt(float((w * d[:, 0] ** 2).sum())) + 1e-6
    kL = min(3.0, contrast / sd) if contrast else 1.0
    if col is None:
        t = m.copy()
        t[0] = min(max(t[0], 0.42), 0.9)
        t[1:] *= 0.8
    else:
        t = rgb2lab(hex2rgb(col))
    out = np.empty_like(pal)
    out[:, 0] = np.clip(t[0] + d[:, 0] * kL, t[0] - maxdrop, min(0.985, t[0] + maxlift))
    out[:, 1:] = t[1:] + d[:, 1:] * chroma
    return out


def process(name, t, src):
    log = []
    im = Image.open(os.path.join(src, t['id'] + '.jpg')).convert('RGB')
    if t.get('turn'):
        im = im.rotate(90 * t['turn'], expand=True)
    W0, H0 = im.size
    work = t.get('work', 640)
    if 'quad' in t:
        q = [v * (W0 if i % 2 == 0 else H0) for i, v in enumerate(t['quad'])]
        aspect = t.get('aspect', 1.0)
        im = im.transform((round(work * aspect), work), Image.QUAD, q, Image.BICUBIC)
    else:
        if t.get('rot'):
            im = im.rotate(t['rot'], resample=Image.BICUBIC)
        x, y, w, h = t['crop']
        im = im.crop((round(x * W0), round(y * H0), round((x + w) * W0), round((y + h) * H0)))
        s = work / min(im.size)
        im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS if s < 1 else Image.BICUBIC)
    A = np.asarray(im, dtype=np.float32) / 255
    # 2. even out the light
    f = t.get('flat', 1.0)
    if f:
        low = gblur(A, t.get('flat_sigma', 0.2) * min(A.shape[:2]), wrap=False)
        A = np.clip(A - f * (low - A.reshape(-1, 3).mean(0)), 0, 1)
    # 3. make it tile
    B = make_tileable(A, t.get('ox', (0.08, 0.22)), t.get('oy', (0.08, 0.22)), t.get('feather', (6, 6)), log)
    B = np.clip(resize(B, SIZE, SIZE, wrap=True, how=Image.LANCZOS), 0, 1)
    if t.get('raw'):
        return (B * 255 + 0.5).astype(np.uint8), log
    # 4. repaint
    lab = rgb2lab(B.astype(np.float64)).astype(np.float32)
    lab = bilateral(lab, t.get('radius', 5), t.get('sigma_s', 3.0), t.get('smooth', 0.05), t.get('passes', 3))
    if t.get('soften'):
        lab = gblur(lab, t['soften'])
    big = resize(lab, SIZE * 2, SIZE * 2, wrap=True)
    labels, pal = repaint(big, t.get('k', 6), t.get('clean', 2.0), t.get('lweight', 1.0))
    counts = np.bincount(labels.reshape(-1), minlength=len(pal)).astype(np.float64)
    # 5. regrade
    pal2 = regrade(pal.astype(np.float64), counts, t.get('col'), t.get('contrast', 0), t.get('chroma', 0.75), t.get('maxdrop', 0.2), t.get('maxlift', 0.1))
    rgb = lab2rgb(pal2)[labels]
    out = np.clip(resize(rgb.astype(np.float32), SIZE, SIZE, wrap=True, how=Image.BOX), 0, 1)
    log.append('palette ' + ' '.join('#%02x%02x%02x' % tuple(int(round(v * 255)) for v in c) for c in lab2rgb(pal2)))
    return (out * 255 + 0.5).astype(np.uint8), log


def save(name, px):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name + '.jpg')
    for q in (92, 90, 88, 85, 82, 78, 74, 70):
        Image.fromarray(px).save(p, quality=q, subsampling=0, optimize=True)
        if os.path.getsize(p) <= 80 * 1024:
            break
    return os.path.getsize(p)


def sheet(names, path, cell=132):
    cols = 6
    rows = (len(names) + cols - 1) // cols
    pad, lab = 10, 16
    S = Image.new('RGB', (cols * (cell * 3 + pad) + pad, rows * (cell * 3 + pad + lab) + pad), (40, 40, 44))
    d = ImageDraw.Draw(S)
    for i, n in enumerate(names):
        p = os.path.join(OUT, n + '.jpg')
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGB').resize((cell, cell), Image.LANCZOS)
        x0, y0 = pad + (i % cols) * (cell * 3 + pad), pad + (i // cols) * (cell * 3 + pad + lab)
        d.text((x0, y0), n, fill=(235, 235, 225))
        for a in range(3):
            for b in range(3):
                S.paste(im, (x0 + a * cell, y0 + lab + b * cell))
    S.save(path)


def main():
    args = [a for a in sys.argv[1:]]
    opt = {}
    for flag in ('--sheet', '--meta'):
        if flag in args:
            i = args.index(flag)
            opt[flag] = args[i + 1]
            del args[i:i + 2]
    fetch = '--fetch' in args
    raw = '--raw' in args
    args = [a for a in args if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 1
    src, names = args[0], args[1:] or list(T)
    meta = {}
    for n in names:
        t = dict(T[n])
        p = os.path.join(src, t['id'] + '.jpg')
        if not os.path.exists(p):
            if not fetch:
                print(f'{n}: missing {p} (use --fetch)')
                continue
            urllib.request.urlretrieve(S3 % (t['subset'], t['id']), p)
        if raw:
            t['raw'] = True
        px, log = process(n, t, src)
        size = save(n, px)
        avg = lin2srgb(srgb2lin(px.reshape(-1, 3) / 255.0).mean(0))
        meta[n] = {'avg': '0x%02x%02x%02x' % tuple(int(round(v * 255)) for v in avg), 'bytes': size}
        print(f"{n}: {size // 1024} KB avg {meta[n]['avg']} | " + ' | '.join(log), flush=True)
    if '--meta' in opt:
        json.dump(meta, open(opt['--meta'], 'w'), indent=1)
    if '--sheet' in opt:
        sheet(list(T), opt['--sheet'])
    return 0


def SOURCES():
    tex('wood_planks', '6fc8353c532d155b', 'validation', crop=(0.02, 0.02, 0.64, 0.96), col=0xb89b78, k=6, contrast=0.05)
    tex('asphalt', 'f7ecfd1c46a3123e', 'test', crop=(0.02, 0.02, 0.64, 0.96), col=0x74757a, k=5, contrast=0.04)


SOURCES()
if __name__ == '__main__':
    sys.exit(main())
