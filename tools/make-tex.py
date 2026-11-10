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
#   tiled        the quad already spans exactly one repeat (corners on the joints of a regular pattern): no seam cut
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
    """Gaussian blur by FFT (periodic); wrap=False reflects the borders first. sigma: a number or (along y, along x)."""
    sy, sx = sigma if isinstance(sigma, (tuple, list)) else (sigma, sigma)
    if sy <= 0 and sx <= 0:
        return a
    if not wrap:
        p = int(min(3 * max(sy, sx), min(a.shape[:2]) - 1))
        pad = [(p, p), (p, p)] + [(0, 0)] * (a.ndim - 2)
        return gblur(np.pad(a, pad, mode='reflect'), sigma)[p:-p, p:-p]
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * math.pi ** 2 * ((sx * fx) ** 2 + (sy * fy) ** 2))
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


# ---------------------------------------------------------------------------------------------------- pixel art
DENS = 128          # texels a metre for the world's surfaces (walls, roofs, roads, ground); `dens` per tile overrides
WARM = np.array([0.24, 0.97])    # Oklab a, b: the way a highlight leans (towards a sunny yellow)
COOL = np.array([0.20, -0.98])   # the way a shadow leans (towards a lilac blue)
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]   # the 8 neighbours (dy, dx)
SIDES = [(0, 1, 2), (5, 6, 7), (0, 3, 5), (2, 4, 7)]                              # top, bottom, left, right rows of them


def tile_px(t):
    """The tile's size in texels: its real size times the density, a multiple of 16 (so the mips halve cleanly)."""
    if t.get('px'):
        return t['px']
    return max(32, int(round(t['m'] * t.get('dens', DENS) / 16.0)) * 16)


def kmeans(P, k, iters=16, w=None):
    """Deterministic k-means on P (N x d), seeded along the first axis' quantiles; w: optional point weights."""
    order = np.argsort(P[:, 0])
    C = np.stack([P[order[int((i + 0.5) / k * len(P))]] for i in range(k)]).astype(np.float64)
    w = np.ones(len(P)) if w is None else w
    for _ in range(iters):
        lab = np.argmin(((P[:, None, :] - C[None, :, :]) ** 2).sum(-1), 1)
        for i in range(k):
            m = lab == i
            if m.any():
                C[i] = (P[m] * w[m, None]).sum(0) / w[m].sum()
    return C, lab


def neighbours(a):
    """The 8 neighbour images of a (periodic): neighbours(a)[n][y, x] = a[y + dy, x + dx]."""
    return [np.roll(a, (-dy, -dx), axis=(0, 1)) for dy, dx in NB]


def cleanup(lab, pal, rounds=2, keep_dl=None):
    """Pixel-art cluster cleanup on a label image (periodic, so the tile stays seamless):
      - orphans (no neighbour of their own colour) and lone pairs go to the neighbouring colour that has most
        pixels round them (ties: the closest colour);
      - a one-pixel bump or notch on a straight edge (its own colour along one full side, the other five all one
        colour) is filled in;
      1 px lines, corners and diagonals keep their pixels. keep_dl: an orphan at least this much lighter or darker
      (Oklab L) than everything round it stays (a deliberate glint or pit)."""
    K = len(pal)
    D = np.sqrt(((pal[:, None, :] - pal[None, :, :]) ** 2).sum(-1))
    for _ in range(rounds):
        for stage in ('single', 'pair', 'bump'):
            nb = neighbours(lab)
            eq = [n == lab for n in nb]
            same = np.sum(eq, 0)
            cnt = np.stack([np.sum([n == k for n in nb], 0) for k in range(K)]).astype(np.float32)
            # the replacement: most neighbours, then the nearest colour; never the pixel's own
            score = cnt - 0.05 * D[lab].transpose(2, 0, 1)
            np.put_along_axis(score, lab[None], -1e9, 0)
            best = np.argmax(score, 0)
            if stage == 'single':
                hit = same == 0
                if keep_dl is not None:
                    dl = np.abs(pal[lab, 0][None] - pal[np.stack(nb), 0]).min(0)
                    hit &= dl < keep_dl
            elif stage == 'pair':
                one = same == 1
                hit = np.zeros_like(one)
                for n, e in zip(neighbours(one), eq):
                    hit |= one & e & n
            else:
                full = np.zeros_like(same, dtype=bool)
                for s in SIDES:
                    full |= eq[s[0]] & eq[s[1]] & eq[s[2]]
                hit = (same == 3) & full & (cnt.max(0) == 5)
            lab = np.where(hit, best, lab)
    return lab


def pixelate(lab_img, t):
    """A smoothed Oklab image at the tile's size -> (labels, palette in Oklab): hue families, each a shading ramp of
    evenly spaced lightness steps, then the cluster cleanup."""
    H, W = lab_img.shape[:2]
    P = lab_img.reshape(-1, 3).astype(np.float64)
    fam = t.get('fam', 1)
    # hue families: k-means on the colour (a, b), the votes smoothed so a family is a region, not a speckle
    if fam > 1:
        C, f0 = kmeans(P[:, 1:] * 4, fam)
        votes = np.stack([gblur((f0 == i).reshape(H, W).astype(np.float32), t.get('fam_blur', 0.9)) for i in range(fam)])
        fmap = np.argmax(votes, 0).reshape(-1)
    else:
        fmap = np.zeros(len(P), dtype=np.int64)
    share = np.bincount(fmap, minlength=fam) / len(P)
    steps = t.get('steps', 8)
    lo_p, hi_p = t.get('lo', 1.0), t.get('hi', 99.5)
    labels = np.zeros(len(P), dtype=np.int64)
    pal = []
    for f in range(fam):
        m = fmap == f
        if not m.any():
            continue
        n = max(3, int(round(steps * math.sqrt(share[f] / share.max()))))
        L = P[m, 0]
        if t.get('bins', 'base') == 'even':
            # an even ramp from the darkest to the lightest tone (shading across a form: ribs, tiles, bricks)
            lo, hi = np.percentile(L, lo_p), np.percentile(L, hi_p)
            if hi - lo < 1e-3:
                hi = lo + 1e-3
            i = np.clip(np.round((L - lo) / (hi - lo) * (n - 1)), 0, n - 1).astype(np.int64)
            Ls = [lo + (hi - lo) * s / (n - 1) for s in range(n)]
        else:
            # a base tone that holds most of the surface, and fewer pixels the further a step is from it: the
            # wear, grain and stains read as deliberate clusters on a flat paint, not as an even camouflage
            med = np.median(L)
            sd = 1.4826 * np.median(np.abs(L - med)) + 1e-4
            dead, bw = t.get('dead', 0.7), t.get('bin', 0.9)
            nh = (n - 1) // 2
            dev = (np.abs(L - med) / sd - dead) / bw
            i = (np.sign(L - med) * np.clip(np.ceil(np.maximum(dev, 0)), 0, nh)).astype(np.int64) + nh
            n = 2 * nh + 1
            Ls = [med + np.sign(s - nh) * (dead + (abs(s - nh) - 0.5) * bw) * sd if s != nh else med for s in range(n)]
        ab_f = P[m, 1:].mean(0)
        base = len(pal)
        for s in range(n):
            ms = i == s
            ab = P[m][ms, 1:].mean(0) if ms.any() else ab_f
            ab = ab_f + (ab - ab_f) * t.get('ramp_ab', 0.5)   # one ramp: its tones share the family's hue
            pal.append([Ls[s], ab[0], ab[1]])
        labels[m] = base + i
    pal = np.array(pal)
    labels = labels.reshape(H, W)
    if t.get('bevel'):
        labels = bevel(labels, pal, lab_img[:, :, 0], t['bevel'])
    labels = cleanup(labels, pal, t.get('rounds', 2), t.get('keep_dl'))
    if t.get('min_cluster', 4) > 2:
        labels = merge_small(labels, pal, t.get('min_cluster', 4), t.get('merge_dl', 1.0) * step_dl(pal) * 1.01)
        labels = cleanup(labels, pal, 1, t.get('keep_dl'))
    return labels, pal


def step_dl(pal):
    """The typical lightness step between neighbouring tones of a ramp."""
    d = np.diff(pal[:, 0])
    d = d[d > 0]
    return float(np.median(d)) if len(d) else 0.05


def merge_small(labels, pal, min_size, max_dl):
    """Clusters (8-connected, periodic) smaller than min_size pixels whose colour is within max_dl (Oklab L) of the
    colour round them are painted over with that colour: the speckle a photo leaves, not a deliberate pit or glint."""
    H, W = labels.shape
    lab = labels.reshape(-1).tolist()
    seen = bytearray(H * W)
    offs = [(dy, dx) for dy, dx in NB]
    out = list(lab)
    for start in range(H * W):
        if seen[start]:
            continue
        c = lab[start]
        comp, stack, border = [start], [start], {}
        seen[start] = 1
        while stack:
            i = stack.pop()
            y, x = divmod(i, W)
            for dy, dx in offs:
                j = ((y + dy) % H) * W + (x + dx) % W
                if lab[j] == c:
                    if not seen[j]:
                        seen[j] = 1
                        comp.append(j)
                        stack.append(j)
                        if len(comp) > min_size:
                            break
                else:
                    border[lab[j]] = border.get(lab[j], 0) + 1
            if len(comp) > min_size:
                break
        if len(comp) >= min_size or not border:
            # (a big cluster: the pixels already marked are part of it; the rest get marked when reached)
            if len(comp) > min_size:
                # mark the whole of the big cluster so it is not walked again from each of its pixels
                stack = list(comp)
                while stack:
                    i = stack.pop()
                    y, x = divmod(i, W)
                    for dy, dx in offs:
                        j = ((y + dy) % H) * W + (x + dx) % W
                        if lab[j] == c and not seen[j]:
                            seen[j] = 1
                            stack.append(j)
            continue
        to = max(border, key=lambda k: (border[k], -abs(pal[k, 0] - pal[c, 0])))
        if abs(pal[to, 0] - pal[c, 0]) <= max_dl or len(comp) <= 1:
            for i in comp:
                out[i] = to
    return np.array(out, dtype=labels.dtype).reshape(H, W)


def bevel(labels, pal, L, k):
    """Light from the top left, the way a pixel artist shades a raised face: along every joint (a groove darker than
    its surroundings: mortar, the gap between boards or tiles) the face just below / right of it gets one step of
    highlight and the face just above / left of it one step of shadow. k: how strong a groove must be (in standard
    deviations of the local contrast; lower = more joints)."""
    D = L - gblur(L, 2.0)
    j = D < -k * D.std() if k > 0 else D > -k * D.std()   # k < 0: the joints are lighter than the faces (pale mortar)
    # a joint is a line: drop lone dark pixels
    j &= (np.sum([n for n in neighbours(j)], 0) >= 2)
    above, left = np.roll(j, 1, 0), np.roll(j, 1, 1)
    below, right = np.roll(j, -1, 0), np.roll(j, -1, 1)
    hi = ~j & (above | left) & ~(below | right)
    lo = ~j & (below | right) & ~(above | left)
    # one step along the pixel's own ramp (palette entries of one family are consecutive, darkest first)
    fam_start = np.zeros(len(pal), dtype=np.int64)
    fam_end = np.zeros(len(pal), dtype=np.int64)
    s0 = 0
    for i in range(1, len(pal) + 1):
        if i == len(pal) or pal[i, 0] <= pal[i - 1, 0]:
            fam_start[s0:i], fam_end[s0:i] = s0, i - 1
            s0 = i
    up = np.minimum(labels + 1, fam_end[labels])
    dn = np.maximum(labels - 1, fam_start[labels])
    return np.where(hi, up, np.where(lo, dn, labels))


def regrade(pal, counts, col, contrast, chroma, maxdrop, maxlift, hue, kmax=1.2):
    """Move the palette (Oklab) to the target colour; detail stays as lighter / darker tones of it, highlights lean
    warm and shadows cool (`hue`: how far)."""
    w = counts / max(1, counts.sum())
    m = (pal * w[:, None]).sum(0)
    d = pal - m
    sd = math.sqrt(float((w * d[:, 0] ** 2).sum())) + 1e-6
    kL = min(kmax, contrast / sd) if contrast else 1.0
    if col is None:
        t = m.copy()
        t[0] = min(max(t[0], 0.42), 0.9)
        t[1:] *= 0.8
    else:
        t = rgb2lab(hex2rgb(col))
    out = np.empty_like(pal)
    out[:, 0] = np.clip(t[0] + d[:, 0] * kL, t[0] - maxdrop, min(0.985, t[0] + maxlift))
    out[:, 1:] = t[1:] + d[:, 1:] * chroma
    dL = out[:, 0] - t[0]
    out[:, 1:] += hue * np.where(dL > 0, dL, 0)[:, None] * WARM + hue * np.where(dL < 0, -dL, 0)[:, None] * COOL
    # the regrade can shift the mean a little: pull it back onto the target
    w2 = counts / max(1, counts.sum())
    if col is not None:
        out[:, 1:] += t[1:] - (out[:, 1:] * w2[:, None]).sum(0)
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
        low = gblur(A, t.get('flat_sigma', 0.2) * min(A.shape[:2]), wrap=bool(t.get('tiled')))
        A = np.clip(A - f * (low - A.reshape(-1, 3).mean(0)), 0, 1)
    # 3. make it tile
    if t.get('tiled'):   # the quad already spans exactly one repeat of a regular pattern (e.g. a 2 x 2 block of floor tiles)
        B = A
    else:
        B = make_tileable(A, t.get('ox', (0.08, 0.22)), t.get('oy', (0.08, 0.22)), t.get('feather', (6, 6)), log)
    N = tile_px(t)
    # 4. scale down to twice the tile's size in linear light (an area filter: no ringing), flatten the photographic
    #    noise there with an edge-keeping filter, then down to the tile's size
    lin = srgb2lin(np.clip(B, 0, 1).astype(np.float64)).astype(np.float32)
    lin2 = np.clip(resize(lin, 2 * N, 2 * N, wrap=True, how=Image.LANCZOS), 0, 1)
    if t.get('raw'):
        return (lin2srgb(resize(lin2, N, N, wrap=True, how=Image.BOX)) * 255 + 0.5).astype(np.uint8), None, log
    lab = rgb2lab(lin2srgb(lin2).astype(np.float64)).astype(np.float32)
    lab = bilateral(lab, t.get('radius', 3), t.get('sigma_s', 1.6), t.get('smooth', 0.02), t.get('passes', 1))
    lab = resize(lab, N, N, wrap=True, how=Image.BOX)
    # crisp the edges a touch before the colours are counted (unsharp mask on lightness)
    sh = t.get('sharp', 0.8)
    if sh:
        lab[:, :, 0] += sh * (lab[:, :, 0] - gblur(lab[:, :, 0], 1.0))
    # long grain (boards, ribs, bark, rush): smooth the lightness along it so the clusters run in clean streaks
    if t.get('streak'):
        sy, sx, keep = t['streak']
        Ls = gblur(lab[:, :, 0], (sy, sx))
        lab[:, :, 0] = Ls + (lab[:, :, 0] - Ls) * keep
    # 5. the pixel art: families of shading ramps, cleaned clusters
    labels, pal = pixelate(lab, t)
    counts = np.bincount(labels.reshape(-1), minlength=len(pal)).astype(np.float64)
    # 6. regrade to the game's colour for the surface
    pal2 = regrade(pal, counts, t.get('col'), t.get('contrast', 0), t.get('chroma', 0.75), t.get('maxdrop', 0.2), t.get('maxlift', 0.1), t.get('hue', 0.12), t.get('kmax', 1.2))
    rgb = np.clip(lab2rgb(pal2), 0, 1)
    rgb8 = (rgb * 255 + 0.5).astype(np.uint8)
    used = np.unique(labels)
    log.append(f'{N}px {len(used)} tones')
    return rgb8[labels], (labels, rgb8), log


def save(name, px, indexed):
    """A palette PNG (the tile is pixel art: a handful of tones, no compression noise)."""
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name + '.png')
    if indexed is not None:
        labels, pal = indexed
        im = Image.fromarray(labels.astype(np.uint8), 'P')
        im.putpalette(pal.reshape(-1).tolist() + [0] * (768 - pal.size))
    else:
        im = Image.fromarray(px)
    im.save(p, optimize=True)
    return os.path.getsize(p)


def sheet(names, path, cell=256, crop=64):
    """A contact sheet: per tile, a 2 x 2 repeat at 1:1 (top) and a crop magnified to `cell` px, nearest (bottom)."""
    cols = 6
    rows = (len(names) + cols - 1) // cols
    pad, lab = 8, 14
    ch = cell + lab + cell // 2
    S = Image.new('RGB', (cols * (cell + pad) + pad, rows * (ch + pad) + pad), (40, 40, 44))
    d = ImageDraw.Draw(S)
    for i, n in enumerate(names):
        p = os.path.join(OUT, n + '.png')
        if not os.path.exists(p):
            continue
        im = Image.open(p).convert('RGB')
        x0, y0 = pad + (i % cols) * (cell + pad), pad + (i // cols) * (ch + pad)
        d.text((x0, y0), f'{n} {im.size[0]}', fill=(235, 235, 225))
        rep = Image.new('RGB', (im.size[0] * 2, im.size[1] * 2))
        for a in range(2):
            for b in range(2):
                rep.paste(im, (a * im.size[0], b * im.size[1]))
        S.paste(rep.resize((cell, cell // 2), Image.BOX, box=(0, 0, rep.size[0], rep.size[1] // 2)), (x0, y0 + lab))
        c = min(crop, im.size[0])
        S.paste(im.crop((0, 0, c, c)).resize((cell, cell), Image.NEAREST), (x0, y0 + lab + cell // 2))
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
        px, indexed, log = process(n, t, src)
        size = save(n, px, indexed)
        avg = lin2srgb(srgb2lin(px.reshape(-1, 3) / 255.0).mean(0))
        meta[n] = {'avg': '0x%02x%02x%02x' % tuple(int(round(v * 255)) for v in avg), 'bytes': size, 'px': px.shape[1]}
        print(f"{n}: {size // 1024} KB avg {meta[n]['avg']} | " + ' | '.join(log), flush=True)
    if '--meta' in opt:
        json.dump(meta, open(opt['--meta'], 'w'), indent=1)
    if '--sheet' in opt:
        sheet(names, opt['--sheet'])
    return 0


def SOURCES():
    # wood
    tex('wood_planks', '6fc8353c532d155b', 'validation', m=1.2, crop=(0.02, 0.02, 0.64, 0.96), col=0xb89b78, contrast=0.05, streak=(3, 0.5, 0.35), bevel=1.5)
    tex('wood_weathered', '96a78303db2be848', 'validation', m=1.2, crop=(0.02, 0.02, 0.96, 0.96), turn=1, col=0x9a9388, contrast=0.06, chroma=0.5, streak=(3, 0.5, 0.35), bevel=1.5)
    tex('plywood', '8f645490bc17fe56', 'test', m=1.2, rot=33, crop=(0.3, 0.63, 0.4, 0.31), col=0xc9ae86, contrast=0.04, streak=(2, 0.5, 0.5))
    tex('timber_dark', '1fec574bad3f3f62', 'train', m=1.0, crop=(0.02, 0.02, 0.96, 0.96), col=0x5f4a3c, contrast=0.05, streak=(3, 0.5, 0.4))
    # walls
    tex('plaster_cream', '169a12b14cac3226', 'validation', m=2.0, crop=(0.02, 0.02, 0.96, 0.96), col=0xd9cfb8, contrast=0.035)
    tex('mortar_grey', '1a7a377aa004b9d2', 'validation', m=2.0, crop=(0.04, 0.04, 0.92, 0.92), col=0xa9a59c, contrast=0.02)
    tex('block_wall', '8775d6970e194e4a', 'test', m=1.6, crop=(0.33, 0.42, 0.66, 0.57), col=0xa7a59f, contrast=0.06, bevel=1.2)
    tex('brick_red', '1778ac2d0e233f59', 'train', m=1.0, fam=2, crop=(0.45, 0.0, 0.55, 1.0), col=0xa8685a, contrast=0.06, bins='even', bevel=-1.2)
    # metal
    tex('tin_corrugated', '5fd02777b8eec9d0', 'train', m=1.0, crop=(0.02, 0.02, 0.85, 0.96), col=0xa9b0b0, contrast=0.06, bins='even', streak=(4, 0.3, 0.3))
    tex('tin_rusty', 'a4a862425bc9d098', 'train', m=1.0, fam=2, crop=(0.0, 0.2, 0.5, 0.8), col=0x94705a, contrast=0.07, chroma=0.9, bins='even', streak=(3, 0.3, 0.5))
    tex('steel_painted', '1b1471963e16b851', 'test', m=1.5, crop=(0.0, 0.0, 0.93, 1.0), col=0xc4c6c2, contrast=0.03)
    tex('steel_galvanised', '5f9335501f727e53', 'test', m=1.5, crop=(0.02, 0.02, 0.96, 0.96), col=0xa9aeb0, contrast=0.025)
    tex('rust', '3b33de2554dd9a1d', 'test', m=1.0, fam=2, crop=(0.02, 0.02, 0.96, 0.96), col=0x8c5a40, contrast=0.06, chroma=0.9)
    # concrete and road
    tex('concrete', '450b2aeae4ac7a18', 'test', m=2.5, crop=(0.02, 0.02, 0.96, 0.96), col=0xb3b0a8, contrast=0.035)
    tex('concrete_stained', '301758e85ce06904', 'test', m=2.5, crop=(0.02, 0.02, 0.96, 0.96), col=0x9c9990, contrast=0.035)
    tex('asphalt', 'f7ecfd1c46a3123e', 'test', m=2.0, crop=(0.02, 0.02, 0.64, 0.96), col=0x74757a, contrast=0.04, dead=0.9, keep_dl=0.08)
    tex('asphalt_patched', 'dd9ebb6895326599', 'test', m=3.0, crop=(0.02, 0.02, 0.96, 0.96), col=0x66666a, contrast=0.04, dead=0.9, keep_dl=0.08)
    # roofs
    tex('roof_kawara', '80b6496844f7ae38', 'test', m=1.2, crop=(0.02, 0.40, 0.56, 0.60), col=0x62666c, contrast=0.08, bins='even')
    tex('roof_tin', '7e6124d65af8c2d2', 'test', m=1.0, crop=(0.02, 0.02, 0.96, 0.96), col=0x7e8c94, contrast=0.05, bins='even', streak=(4, 0.3, 0.3))
    # indoor
    tex('tatami', '9f280e421809bc1c', 'train', m=0.3, dens=256, rot=11, crop=(0.73, 0.06, 0.2, 0.44), col=0xb9b07c, contrast=0.05, streak=(0.3, 2.5, 0.4))
    tex('shoji_paper', 'da75490bc31287e6', 'test', m=0.5, dens=256, crop=(0.02, 0.02, 0.96, 0.96), col=0xe6e0d0, contrast=0.025)
    tex('cardboard', 'a3509d80d7b9470d', 'test', m=0.6, dens=256, crop=(0.02, 0.02, 0.96, 0.96), col=0xb99870, contrast=0.035)
    tex('canvas_cloth', 'ba283675b76ce5ac', 'validation', m=0.4, dens=256, crop=(0.02, 0.02, 0.96, 0.96), col=0xcfc6b0, contrast=0.04)
    tex('indigo_cloth', 'ceabb4f14c91024a', 'test', m=0.4, dens=256, crop=(0.02, 0.02, 0.96, 0.96), col=0x44587c, contrast=0.04)
    tex('paper_old', '472d13aac51c1a42', 'validation', m=0.5, dens=256, crop=(0.04, 0.04, 0.92, 0.92), col=0xd8cba8, contrast=0.035)
    # tiles
    tex('tile_white', 'f297fbca3f95ae40', 'test', m=0.6, dens=256, quad=(0.0830, 0.1185, 0.0865, 0.4618, 0.3405, 0.4598, 0.3355, 0.1458), tiled=True, col=0xdcdcd4, contrast=0.05, smooth=0.12, flat_sigma=0.08, dead=1.4, bevel=1.2)
    tex('tile_checker_floor', 'cb1eff00d58c6902', 'test', m=0.6, dens=256, quad=(0.4244, 0.4535, 0.1640, 0.6540, 0.4453, 0.7855, 0.6938, 0.6361), tiled=True,
        col=0x9a9a94, contrast=0.15, chroma=0.1, maxdrop=0.3, maxlift=0.2, bins='even', steps=6)
    # ground
    tex('gravel', '47cb4f9c5896f9e1', 'test', m=1.0, crop=(0.02, 0.02, 0.96, 0.96), col=0x9c988e, contrast=0.07, bins='even')
    tex('soil', '565c97448adafced', 'test', m=1.5, crop=(0.02, 0.02, 0.96, 0.96), col=0x7c6650, contrast=0.05)
    tex('grass', '4282d75fe80ad4ff', 'train', m=1.5, fam=2, crop=(0.02, 0.02, 0.96, 0.96), col=0x7c9a5c, contrast=0.06)
    tex('moss', '4805738a8d43a057', 'validation', m=1.0, fam=2, crop=(0.02, 0.02, 0.96, 0.96), col=0x6c8650, contrast=0.035, flat_sigma=0.1)
    # bark (trees: src/town/foliage.js)
    tex('bark_pine', '79e18eab310e6e5f', 'validation', m=0.6, dens=256, turn=1, crop=(0.36, 0.01, 0.62, 0.35), col=0x4e4038, contrast=0.08, bins='even', streak=(2, 0.5, 0.5))
    tex('bark_cherry', '79e18eab310e6e5f', 'validation', m=0.6, dens=256, crop=(0.64, 0.36, 0.35, 0.62), col=0x64504c, contrast=0.05, chroma=0.8, bins='even', streak=(0.5, 2, 0.5))
    # other
    tex('rubber', '888b62110874f139', 'test', m=0.5, dens=256, crop=(0.02, 0.02, 0.44, 0.96), col=0x3c3c40, contrast=0.03)
    tex('frosted_glass', 'c0009d86fc844520', 'test', m=0.5, dens=256, crop=(0.02, 0.02, 0.96, 0.96), col=0xd0dcdc, contrast=0.04)


SOURCES()
if __name__ == '__main__':
    sys.exit(main())
