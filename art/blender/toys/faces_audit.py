#!/usr/bin/env python3
"""The face audit sheet: every figure's face close-up (fig.py face_close, written by a build or repaint with
GG_FACE_CLOSE=<dir>) in one labelled grid.

    GG_FACE_CLOSE=<dir> art/blender/toys/make.sh <series> --repaint     (each figure: <dir>/<series>__<id>.png)
    python3 -I art/blender/toys/faces_audit.py <dir> shots/blender_toys/faces_audit.png [--tile 160] [--cols 12]
"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
opt = lambda k, d: int(sys.argv[sys.argv.index(k) + 1]) if k in sys.argv else d  # noqa: E731
T, C = opt('--tile', 160), opt('--cols', 12)
files = sorted(glob.glob(os.path.join(src, '*__*.png')))
L = 16
rows = (len(files) + C - 1) // C
S = Image.new('RGB', (C * T, rows * (T + L)), (236, 230, 216))
D = ImageDraw.Draw(S)
try:
    F = ImageFont.truetype('/etc/alternatives/fonts-japanese-gothic.ttf', 12)
except OSError:
    F = ImageFont.load_default()
for i, p in enumerate(files):
    x, y = (i % C) * T, (i // C) * (T + L)
    S.paste(Image.open(p).convert('RGB').resize((T, T), Image.LANCZOS), (x, y + L))
    D.text((x + 3, y + 1), os.path.basename(p)[:-4].replace('__', '/'), font=F, fill=(34, 30, 28))
S.save(out)
print('faces_audit:', len(files), 'faces ->', out)
