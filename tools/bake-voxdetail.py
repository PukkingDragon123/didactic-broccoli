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
KINDS = ['plaster_cream', 'concrete', 'plywood', 'wood_weathered', 'paper_old', 'steel_galvanised', 'canvas_cloth',
         'paper_old', 'soil', 'gravel', 'rust', 'bark_pine', 'cardboard', 'moss', 'frosted_glass']
LEVELS = 9

def tile(name):
    im = Image.open(TEX / f'{name}.jpg').convert('L')
    # the scan reduced to the tile (whole scan, so it stays tileable), its broad light removed, then pixelled by rule:
    # smoothed so single-pixel noise goes, cut into four tones at fixed percentiles (clean clusters), and lone pixels
    # merged into their neighbours (a 3x3 mode filter), the way a pixel artist cleans a reduced photo
    im = im.resize((T, T), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32)
    big = np.asarray(Image.fromarray(a.astype(np.uint8)).filter(ImageFilter.GaussianBlur(14)), dtype=np.float32)
    hp = a - big
    hp = np.asarray(Image.fromarray(np.clip(hp + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float32) - 128
    cuts = np.percentile(hp, [14, 50, 86])
    q = np.digitize(hp, cuts)  # 0..3
    q = np.asarray(Image.fromarray((q * 60).astype(np.uint8)).filter(ImageFilter.ModeFilter(3)), dtype=np.float32) / 60
    TONES = np.array([0.2, 0.44, 0.58, 0.8])  # dark seam, body, body lit, highlight
    out = TONES[np.clip(np.round(q).astype(int), 0, 3)]
    out = out - out.mean() + 0.5
    return np.clip(out * 255, 0, 255).astype(np.uint8)

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
