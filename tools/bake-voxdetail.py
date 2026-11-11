#!/usr/bin/env python3
"""Bake the voxel face-detail atlas (public/img/tex/voxdetail.png) from the CC0 surface scans in public/img/tex.

Each tile is the scan's fine detail only: greyscale, high-passed (the broad light/dark of the photo removed, so a
voxel keeps its own painted colour), normalised to mean 128, then posterised to a few hard levels so it reads as crisp
hand-pixelled grain. The voxel shader (src/voxel/materials.js) multiplies a face's colour by it, per kind.
Tile order = surface kind - 1 (src/voxel/VoxelModel.js SURF).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
TEX = ROOT / 'public/img/tex'
T = 128  # tile size
KINDS = ['plaster_cream', 'concrete', 'plywood', 'wood_weathered', 'steel_painted', 'steel_galvanised', 'canvas_cloth',
         'paper_old', 'soil', 'gravel', 'rust', 'bark_pine', 'cardboard', 'moss', 'frosted_glass']
LEVELS = 9

def tile(name):
    im = Image.open(TEX / f'{name}.jpg').convert('L')
    # tile 128 texels at ~5 mm = 0.64 m: take a centred crop of the scan that size (scans span ~1-2 m), keep it tileable
    # by mirroring the crop's halves into a seamless blend
    im = im.resize((T * 2, T * 2), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32)
    # high-pass at two scales (keeps grain, drops lighting and big blotches)
    bl = np.asarray(im.filter(ImageFilter.GaussianBlur(10)), dtype=np.float32)
    hp = a - bl
    # wrap-safe downsample 2x by box filter
    hp = hp.reshape(T, 2, T, 2).mean(axis=(1, 3))
    hp /= (hp.std() + 1e-6)
    hp = np.clip(hp, -2.2, 2.2) / 2.2  # -1..1
    # posterise to hard levels (crisp pixel steps), mean back to 0
    q = np.round((hp * 0.5 + 0.5) * (LEVELS - 1)) / (LEVELS - 1)
    q = q - q.mean() + 0.5
    return np.clip(q * 255, 0, 255).astype(np.uint8)

def main():
    atlas = np.full((T * 4, T * 4), 128, np.uint8)
    for i, n in enumerate(KINDS):
        x, y = i % 4, i // 4
        atlas[y * T:(y + 1) * T, x * T:(x + 1) * T] = tile(n)
    out = TEX / 'voxdetail.png'
    Image.fromarray(atlas, 'L').save(out, optimize=True)
    print('wrote', out, atlas.shape)

if __name__ == '__main__':
    main()
