#!/usr/bin/env python3
"""bake-candyvend.py: an original front print for the candy vending machine toy (machikado/jihanki), replacing the
source model's anime poster (someone else's IP). Real photos (Open Images, CC BY 2.0: sweets), our own type.
Writes art/print/jihanki_Poster_baseColor.png (same size, alpha and UV layout as the source model's Poster texture:
the panel below y=490 is repainted, printed upside down as the source maps it; the two warning stickers are kept)
and, if the lowpix conversion cache is present, puts it in place so the next conversion of the figure uses it.
  python3 -I tools/bake-candyvend.py
"""
import os, sys, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from printkit import Panel, ROOT
import paperkit as PK
SRC = os.path.join(ROOT, 'node_modules/.cache/lowpix-conv/src/sketchfab_f537e142a592428d85ca7a940be221d3/sketchfab_f537e142a592428d85ca7a940be221d3/textures/Poster_baseColor.png')
ORIG = os.path.join(ROOT, 'art', 'print', 'jihanki_Poster_baseColor.orig.png')
OUT = os.path.join(ROOT, 'art', 'print', 'jihanki_Poster_baseColor.png')
if not os.path.exists(ORIG): shutil.copy(SRC, ORIG)
base = Image.open(ORIG).convert('RGBA')
W, H = 2048, 2048 - 490
S = 4  # design at 1/4, the panel is shown small
P = Panel(W // S, H // S, 0xfdf6ea)
w, h = P.w, P.h
P.rect(0, 0, w, h, 0xfdf6ea)
P.photo('oi:436ed2d6e9cd8ca4@test', 0, 0, w, int(h * 0.62), f=(0.5, 0.5, 1.1), sat=1.0, con=1.06)  # gumdrops
for i in range(12): P.rect(i * w / 12, int(h * 0.62), w / 24, 10, 0xe24a6a)
P.rect(0, int(h * 0.62) + 10, w, h, 0xfdf6ea)
P.text('キャンディー', 'mochiy', 64, w / 2, int(h * 0.62) + 62, 0xd23a5a, maxw=w - 40)
P.text('いろんな味が 出てくるよ！', 'kakub', 22, w / 2, int(h * 0.62) + 112, 0x3a2a30)
P.rect(w / 2 - 120, h - 62, 240, 44, 0xd23a5a); P.text('1コ 100円', 'kaku', 26, w / 2, h - 40, 0xffffff)
im = PK.age(P.image(), paper='Paper001', grain_k=0.5, fade=0.08, seed=4).convert('RGB')
im = im.resize((W, H), Image.LANCZOS).rotate(180)
a = np.asarray(base).copy()
a[490:, :, :3] = np.asarray(im)
Image.fromarray(a).save(OUT)
if os.path.exists(os.path.dirname(SRC)): shutil.copy(OUT, SRC)
print('wrote', OUT)
