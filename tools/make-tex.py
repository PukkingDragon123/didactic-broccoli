#!/usr/bin/env python3
"""make-tex.py: real surface scans and photos -> the game's seamless HD pixel-art surface tiles (public/img/tex/*.png).

The texture library (src/kit/photoTex.js) is made from real material: CC0 scanned surfaces from Poly Haven
(polyhaven.com) and ambientCG (ambientcg.com), which already tile, and one CC BY 2.0 photo from Google Open Images
(cropped and made seamless here). Every source is credited in CREDITS.md. Each tile is

  1. the source's colour map (a photo: cropped, evened out and made seamless with a minimum-error seam first);
  2. scaled to the tile's real size at the game's density (128 texels a metre for walls, roofs, roads and ground,
     more for things seen up close), a multiple of 16 so its mips halve cleanly;
  3. reduced to high-resolution pixel art by tools/pixelart.py (shading ramps per hue family, a base tone that
     holds the surface, deliberate highlights and shadows, clean clusters, nothing added);
  4. regraded to the surface's colour in the game's pastel, slightly desaturated range (warm highlights, cool
     shadows), and written as a palette PNG. The game builds the mip chain in linear light when it loads them.

Usage:
  python3 -I tools/make-tex.py <source dir> [--fetch] [--sheet out.png] [--meta out.json] [name ...]
    <source dir>  where the downloads are (ph_<id>.jpg, acg_<id>.jpg, <Open Images id>.jpg); --fetch gets the
                  missing ones (Poly Haven 1k diffuse, ambientCG 1K-JPG colour map, the Open Images original)
    --sheet       also write a contact sheet (a 2 x 2 repeat and a magnified crop of each tile)
    --meta        write name -> { avg, bytes, px } as JSON (avg and px go into src/kit/photoTex.js)
Needs Pillow and numpy.
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img', 'tex')
S3 = 'https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg'
PH = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{0}/{0}_diff_1k.jpg'
ACG = 'https://ambientcg.com/get?file={0}_1K-JPG.zip'

# name -> source and how to treat it.
#   src          'ph:<id>' (Poly Haven), 'acg:<id>' (ambientCG), or an Open Images photo: id + subset
#   m            the real size the tile covers (metres; the source's own size for the scans); dens: texels a metre
#   turn         quarter turns anticlockwise (so boards, ribs and rush run the way the game's UVs expect)
#   crop, quad, rot, flat, flat_sigma, ox, oy, feather, tiled: only for a photo (crop to the surface, even out its
#                light, cut a seam to make it tile)
#   the rest     options of tools/pixelart.py reduce(): col, contrast, chroma, hue, steps, fam, bins, dead, streak,
#                bevel, min_cluster, keep_dl, smooth, sharp ...
T = {}


def tex(name, id, subset=None, crop=(0, 0, 1, 1), **kw):
    T[name] = dict(id=id, subset=subset, crop=crop, **kw)


def scan(name, src, **kw):
    """A tiling scan from Poly Haven ('ph:<id>') or ambientCG ('acg:<id>')."""
    T[name] = dict(id=src, **kw)


def src_file(t):
    kind, _, i = t['id'].partition(':')
    return (kind + '_' + i if i else t['id']) + '.jpg'


def fetch(t, dst):
    """Download a source into dst (curl: it goes through the proxy and its certificates)."""
    kind, _, i = t['id'].partition(':')
    if kind == 'ph':
        os.system(f"curl -sS -f -o '{dst}' '{PH.format(i)}'")
    elif kind == 'acg':
        z = dst + '.zip'
        os.system(f"curl -sS -f -L -o '{z}' '{ACG.format(i)}'")
        import zipfile
        with zipfile.ZipFile(z) as Z:
            n = [x for x in Z.namelist() if x.endswith('_Color.jpg')][0]
            open(dst, 'wb').write(Z.read(n))
        os.remove(z)
    else:
        os.system(f"curl -sS -f -o '{dst}' '{S3 % (t['subset'], t['id'])}'")


# ---------------------------------------------------------------------------------------------------- the sources
# (filled in below, after the helpers, by SOURCES())


# ---------------------------------------------------------------------------------------------------- the reduction
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixelart import srgb2lin, lin2srgb, rgb2lab, lab2rgb, hex2rgb, gblur, resize, reduce  # noqa: E402

DENS = 128          # texels a metre for the world's surfaces (walls, roofs, roads, ground); `dens` per tile overrides


def tile_px(t):
    """The tile's size in texels: its real size times the density, a multiple of 16 (so the mips halve cleanly)."""
    if t.get('px'):
        return t['px']
    return max(32, int(round(t['m'] * t.get('dens', DENS) / 16.0)) * 16)


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


def process(name, t, src):
    log = []
    im = Image.open(os.path.join(src, src_file(t))).convert('RGB')
    if t.get('turn'):
        im = im.rotate(90 * t['turn'], expand=True)
    N = tile_px(t)
    if ':' in t['id']:
        B = np.asarray(im, dtype=np.float32) / 255   # a scan: already seamless
        if t.get('flat'):   # (a scan with a slow wash of light across it: take it out, periodically)
            low = gblur(B, t.get('flat_sigma', 0.12) * min(B.shape[:2]))
            B = np.clip(B - t['flat'] * (low - B.reshape(-1, 3).mean(0)), 0, 1)
    else:
        B = photo_tile(im, t, log)
    if t.get('raw'):
        lin = srgb2lin(B.astype(np.float64)).astype(np.float32)
        return (lin2srgb(resize(lin, N, N, wrap=True, how=Image.BOX)) * 255 + 0.5).astype(np.uint8), None, log
    opts = {k: v for k, v in t.items() if k not in ('id', 'subset', 'crop', 'quad', 'rot', 'turn', 'm', 'dens', 'px', 'work', 'flat', 'flat_sigma', 'ox', 'oy', 'feather', 'tiled', 'aspect', 'raw')}
    px, labels, pal = reduce(B, N, N, **opts)
    log.append(f'{N}px {len(np.unique(labels))} tones')
    return px, (labels, pal), log


def photo_tile(im, t, log):
    """A photo -> an evenly lit, seamless float image (crop / rectify, high-pass the light, cut a seam)."""
    W0, H0 = im.size
    work = t.get('work', 640)
    if 'quad' in t:
        q = [v * (W0 if i % 2 == 0 else H0) for i, v in enumerate(t['quad'])]
        im = im.transform((round(work * t.get('aspect', 1.0)), work), Image.QUAD, q, Image.BICUBIC)
    else:
        if t.get('rot'):
            im = im.rotate(t['rot'], resample=Image.BICUBIC)
        x, y, w, h = t['crop']
        im = im.crop((round(x * W0), round(y * H0), round((x + w) * W0), round((y + h) * H0)))
        s = work / min(im.size)
        im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS if s < 1 else Image.BICUBIC)
    A = np.asarray(im, dtype=np.float32) / 255
    f = t.get('flat', 1.0)
    if f:
        low = gblur(A, t.get('flat_sigma', 0.2) * min(A.shape[:2]), wrap=bool(t.get('tiled')))
        A = np.clip(A - f * (low - A.reshape(-1, 3).mean(0)), 0, 1)
    if t.get('tiled'):
        return A
    return make_tileable(A, t.get('ox', (0.08, 0.22)), t.get('oy', (0.08, 0.22)), t.get('feather', (6, 6)), log)


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
    get = '--fetch' in args
    raw = '--raw' in args
    args = [a for a in args if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 1
    src, names = args[0], args[1:] or list(T)
    meta = {}
    for n in names:
        t = dict(T[n])
        p = os.path.join(src, src_file(t))
        if not os.path.exists(p):
            if not get:
                print(f'{n}: missing {p} (use --fetch)')
                continue
            fetch(t, p)
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
    scan('wood_planks', 'ph:hinoki_planks', m=1.88, turn=1, col=0xb89b78, contrast=0.05, streak=(3, 0.5, 0.35), bevel=1.5)
    scan('wood_weathered', 'ph:wood_planks_grey', m=1.5, col=0x9a9388, contrast=0.06, chroma=0.5, streak=(3, 0.5, 0.35), bevel=1.5)
    scan('plywood', 'ph:plywood', m=0.98, col=0xc9ae86, contrast=0.04, streak=(0.5, 2, 0.5))
    scan('timber_dark', 'ph:dark_wood', m=2.0, turn=1, col=0x5f4a3c, contrast=0.05, streak=(3, 0.5, 0.4))
    # walls
    scan('plaster_cream', 'ph:plastered_wall', m=2.0, col=0xd9cfb8, contrast=0.035)
    scan('mortar_grey', 'ph:grey_plaster', m=1.0, col=0xa9a59c, contrast=0.03)
    scan('block_wall', 'ph:concrete_block_wall', m=2.0, col=0xa7a59f, contrast=0.06, bevel=1.2)
    scan('brick_red', 'ph:brick_wall_02', m=2.0, col=0xa8685a, contrast=0.06, fam=3, bins='even', bevel=1.2)
    # metal
    scan('tin_corrugated', 'ph:corrugated_iron', m=1.12, col=0xa9b0b0, contrast=0.09, fam=1, bins='even', streak=(4, 0.3, 0.3))
    scan('tin_rusty', 'ph:rusty_corrugated_iron', m=2.0, col=0x94705a, contrast=0.07, chroma=0.9, fam=2, bins='even', streak=(3, 0.3, 0.5))
    scan('steel_painted', 'acg:Metal032', m=1.5, col=0xc4c6c2, contrast=0.025, fam=1, dead=0.8)
    scan('steel_galvanised', 'acg:Metal009', m=1.5, col=0xa9aeb0, contrast=0.035, fam=1, streak=(0.4, 3, 0.4))
    scan('rust', 'ph:rust_coarse_01', m=2.19, col=0x8c5a40, contrast=0.06, chroma=0.9, fam=2)
    # concrete and road
    scan('concrete', 'ph:brushed_concrete', m=2.5, col=0xb3b0a8, contrast=0.035)
    scan('concrete_stained', 'ph:concrete_floor_worn_001', m=3.0, col=0x9c9990, contrast=0.045, smooth=0.01, dead=0.5)
    scan('asphalt', 'ph:asphalt_04', m=4.0, col=0x74757a, contrast=0.06, smooth=0.03, passes=2, min_cluster=5, keep_dl=0.08, flat=0.6)
    scan('asphalt_patched', 'ph:asphalt_02', m=3.0, col=0x66666a, contrast=0.06, smooth=0.03, passes=2, min_cluster=5, keep_dl=0.08)
    # roofs
    scan('roof_kawara', 'ph:grey_roof_tiles', m=3.0, col=0x62666c, contrast=0.08, chroma=0.35, bins='even')
    scan('roof_tin', 'ph:box_profile_metal_sheet', m=2.0, col=0x7e8c94, contrast=0.05, bins='even', streak=(4, 0.3, 0.3))
    # indoor (seen up close: denser)
    scan('tatami', 'acg:Tatami001', m=1.0, dens=192, flat=1.0, flat_sigma=0.04, fam=1, col=0xb9b07c, contrast=0.05, streak=(0.3, 2.5, 0.4))
    scan('shoji_paper', 'acg:Paper001', m=0.5, dens=256, col=0xe6e0d0, contrast=0.025)
    scan('cardboard', 'acg:Cardboard004', m=0.6, dens=256, col=0xb99870, contrast=0.035)
    scan('canvas_cloth', 'acg:Fabric036', m=0.4, dens=256, col=0xcfc6b0, contrast=0.04, smooth=0.008, dead=0.5)
    scan('indigo_cloth', 'acg:Fabric081A', m=0.4, dens=256, col=0x44587c, contrast=0.04, smooth=0.008, dead=0.5)
    scan('paper_old', 'acg:Paper006', m=0.5, dens=256, col=0xd8cba8, contrast=0.035)
    scan('tile_white', 'acg:Tiles107', m=1.0, dens=256, col=0xdcdcd4, contrast=0.05, dead=1.4, bevel=1.2, fam=1)
    scan('tile_checker_floor', 'ph:checkered_pavement_tiles', m=2.0, dens=192, col=0x9a9a94, contrast=0.15, chroma=0.1, maxdrop=0.3, maxlift=0.2, steps=8, fam=2, fam_L=1.0, dead=1.6, smooth=0.06, passes=2)
    # ground
    scan('gravel', 'ph:gravel', m=2.0, col=0x9c988e, contrast=0.07, bins='even')
    scan('soil', 'ph:farm_soil', m=2.0, col=0x7c6650, contrast=0.05)
    scan('grass', 'ph:leafy_grass', m=2.0, col=0x7c9a5c, contrast=0.06, fam=2)
    scan('moss', 'acg:Moss002', m=1.0, col=0x6c8650, contrast=0.04, fam=2)
    # bark (trees: src/town/foliage.js)
    scan('bark_pine', 'ph:pine_bark', m=2.0, dens=192, col=0x4e4038, contrast=0.08, bins='even', streak=(2, 0.5, 0.5))
    scan('bark_cherry', 'ph:sakura_bark', m=1.6, dens=192, col=0x64504c, contrast=0.05, chroma=0.8, bins='even', streak=(0.5, 2, 0.5))
    # other
    scan('rubber', 'acg:Rubber004', m=0.75, dens=256, col=0x3c3c40, contrast=0.03)
    tex('frosted_glass', 'c0009d86fc844520', 'test', m=0.5, dens=256, crop=(0.02, 0.02, 0.96, 0.96), col=0xd0dcdc, contrast=0.04)


SOURCES()
if __name__ == '__main__':
    sys.exit(main())
