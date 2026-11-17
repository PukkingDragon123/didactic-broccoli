#!/usr/bin/env python3
"""bake-paper.py: real paper for the paper UI kit (src/ui/paper.js). Cuts tileable 48 x 48 grain tiles from real CC0
paper scans (ambientCG: Paper001 fine stock, Paper002 newsprint, Paper004 kraft, Paper003 crumpled), keeps only
their lightness (normalised round mid-grey, so paper.js can tint each stock: cream, note, receipt, kraft, pink...),
and packs them in one strip: public/img/paper/grain.png (4 tiles: fine | news | kraft | crumple, 48 px each).
  python3 -I tools/bake-paper.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from printkit import source, ROOT

T = 48
def tileable(name, crop, gain):
    im = source('acg:' + name).convert('L')
    W, H = im.size
    a = np.asarray(im.crop((0, 0, crop, crop)).resize((T * 2, T * 2), Image.BOX), np.float32)
    # seamless: blend the tile with itself shifted half a period, across a soft cross mask
    b = np.roll(np.roll(a, T, 0), T, 1)
    y, x = np.mgrid[0:T * 2, 0:T * 2].astype(np.float32)
    m = np.minimum(np.minimum(x, T * 2 - 1 - x), np.minimum(y, T * 2 - 1 - y)) / T
    m = np.clip(m * 2.2, 0, 1)
    c = a * m + b * (1 - m)
    c = np.asarray(Image.fromarray(c.astype(np.uint8)).resize((T, T), Image.BOX), np.float32)
    c = (c - c.mean()) / max(1e-3, c.std())
    return np.clip(128 + c * gain, 0, 255).astype(np.uint8)

tiles = [tileable('Paper001', 240, 9), tileable('Paper002', 200, 10), tileable('Paper004', 220, 12), tileable('Paper003', 520, 11)]
out = Image.fromarray(np.concatenate(tiles, 1))
os.makedirs(os.path.join(ROOT, 'public', 'img', 'paper'), exist_ok=True)
p = os.path.join(ROOT, 'public', 'img', 'paper', 'grain.png'); out.save(p, optimize=True)
print(p, out.size, os.path.getsize(p), 'bytes')
