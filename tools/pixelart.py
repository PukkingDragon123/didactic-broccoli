#!/usr/bin/env python3
"""pixelart.py: the game's HD pixel-art reduction, shared by every tool that turns a real image into a texture
(tools/make-tex.py for the surface library, tools/make-views.py for the window views, the asset importer for model
textures). It is what docs/ART.md calls "high-resolution pixel art": realistic content, finished the way a pixel
artist would: a limited palette per material, clean clusters, deliberate highlights and shadows, no noise, no blur.

  reduce(rgb, w, h, **opts) -> (rgb8 h x w x 3 uint8, labels h x w, palette n x 3 uint8)
    rgb   float array H x W x 3 in 0..1 (sRGB), any size; the result is w x h texels.
    The steps: an area downscale to 2x the target in linear light; an edge-keeping (bilateral) pass in Oklab that
    flattens photographic noise; down to the target; an unsharp touch on lightness; optional streaks along a grain;
    then the palette: `fam` hue families (k-means on colour), each a shading ramp of lightness steps ('base': a base
    tone holding most of the surface with fewer pixels the further a step is from it; 'even': an even ramp for
    forms such as ribs, tiles and bricks); an optional bevel (one step of highlight / shadow along joints, light
    from the top left); cluster cleanup (orphans, lone pairs, bumps on straight edges, specks under `min_cluster`
    pixels that are one step off their surroundings); a regrade towards `col` with warm highlights and cool shadows.
    Everything is periodic (wrap=True), so a seamless input stays seamless.
  Options (all optional): col (hex the result averages to; None keeps the image's own, a little pastel), contrast
    (Oklab L std wanted; 0 keeps it), chroma (0..1 hue variation kept), hue (warm / cool lean), steps, fam, bins
    ('base' | 'even'), dead / bin (base-tone widths in std), smooth / passes / radius / sigma_s (bilateral), sharp,
    streak (sy, sx, keep), bevel (k; negative = pale joints), min_cluster, keep_dl, rounds, maxdrop / maxlift.

CLI (for tools in other languages):
  python3 -I tools/pixelart.py in.(png|jpg) out.png W H ['{"col": 12345, "steps": 10}']
    keeps an alpha channel if the input has one (cut at 50%, colour reduced under it); writes a palette PNG.
Needs Pillow and numpy.
"""
import json
import math
import sys

import numpy as np
from PIL import Image

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


# ---------------------------------------------------------------------------------------------------- pixel art
WARM = np.array([0.24, 0.97])    # Oklab a, b: the way a highlight leans (towards a sunny yellow)
COOL = np.array([0.20, -0.98])   # the way a shadow leans (towards a lilac blue)
NB = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]   # the 8 neighbours (dy, dx)
SIDES = [(0, 1, 2), (5, 6, 7), (0, 3, 5), (2, 4, 7)]                              # top, bottom, left, right rows of them


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
    fam = t.get('fam', 2)
    # hue families: k-means on the colour (a, b), the votes smoothed so a family is a region, not a speckle
    if fam > 1:
        C, f0 = kmeans(np.concatenate([P[:, :1] * t.get('fam_L', 0.0), P[:, 1:] * 4], 1), fam)   # fam_L: split by lightness too (a checker of greys)
        votes = np.stack([gblur((f0 == i).reshape(H, W).astype(np.float32), t.get('fam_blur', 0.9)) for i in range(fam)])
        fmap = np.argmax(votes, 0).reshape(-1)
    else:
        fmap = np.zeros(len(P), dtype=np.int64)
    share = np.bincount(fmap, minlength=fam) / len(P)
    steps = t.get('steps', 14)
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
            dead, bw = t.get('dead', 0.5), t.get('bin', 0.9)
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


def reduce(rgb, w, h, wrap=True, **t):
    """rgb: H x W x 3 floats (sRGB 0..1) -> (rgb8, labels, palette8) at w x h. See the module notes."""
    lin = srgb2lin(np.clip(rgb, 0, 1).astype(np.float64)).astype(np.float32)
    lin2 = np.clip(resize(lin, 2 * w, 2 * h, wrap=wrap, how=Image.LANCZOS), 0, 1)
    lab = rgb2lab(lin2srgb(lin2).astype(np.float64)).astype(np.float32)
    lab = bilateral(lab, t.get('radius', 3), t.get('sigma_s', 1.6), t.get('smooth', 0.02), t.get('passes', 1))
    lab = resize(lab, w, h, wrap=wrap, how=Image.BOX)
    sh = t.get('sharp', 0.8)
    if sh:
        lab[:, :, 0] += sh * (lab[:, :, 0] - gblur(lab[:, :, 0], 1.0))
    if t.get('streak'):
        sy, sx, keep = t['streak']
        Ls = gblur(lab[:, :, 0], (sy, sx))
        lab[:, :, 0] = Ls + (lab[:, :, 0] - Ls) * keep
    labels, pal = pixelate(lab, t)
    counts = np.bincount(labels.reshape(-1), minlength=len(pal)).astype(np.float64)
    pal2 = regrade(pal, counts, t.get('col'), t.get('contrast', 0), t.get('chroma', 0.75), t.get('maxdrop', 0.2), t.get('maxlift', 0.1), t.get('hue', 0.12), t.get('kmax', 3.0))
    rgb8 = (np.clip(lab2rgb(pal2), 0, 1) * 255 + 0.5).astype(np.uint8)
    return rgb8[labels], labels, rgb8


def save_png(path, labels, pal8, alpha=None):
    """A palette PNG (a handful of tones, lossless); alpha (H x W bool) is written as a fully transparent index."""
    if alpha is not None:
        labels = np.where(alpha, labels, len(pal8))
        pal8 = np.concatenate([pal8, [[0, 0, 0]]])
    if len(pal8) > 256:
        raise ValueError('more than 256 tones')
    im = Image.fromarray(labels.astype(np.uint8), 'P')
    im.putpalette(pal8.reshape(-1).tolist() + [0] * (768 - pal8.size))
    if alpha is not None:
        im.info['transparency'] = len(pal8) - 1
        im.save(path, optimize=True, transparency=len(pal8) - 1)
    else:
        im.save(path, optimize=True)


def main():
    a = sys.argv[1:]
    if len(a) < 4:
        print(__doc__)
        return 1
    im = Image.open(a[0])
    opts = json.loads(a[4]) if len(a) > 4 else {}
    w, h = int(a[2]), int(a[3])
    has_a = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    rgba = np.asarray(im.convert('RGBA'), dtype=np.float32) / 255
    alpha = None
    if has_a:
        al = np.asarray(Image.fromarray((rgba[:, :, 3] * 255).astype(np.uint8)).resize((w, h), Image.BOX)) >= 128
        # bleed the colour under transparent texels so the reduction does not count them
        alpha = al
    rgb8, labels, pal = reduce(rgba[:, :, :3], w, h, **opts)
    save_png(a[1], labels, pal, alpha)
    return 0


if __name__ == '__main__':
    sys.exit(main())
