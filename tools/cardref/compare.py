#!/usr/bin/env python3
"""compare.py: shots/clone/compare.png: each reference card next to its card at the same height (one series per
template), then every baked card in a grid.  python3 -I tools/cardref/compare.py henshin:crabcan ... [--all]"""
import os, sys, glob
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pairs = [a.split(':') for a in sys.argv[1:] if ':' in a]
H = 560; BG = (40, 40, 44); rows = []
for sid, ref in pairs:
    r = Image.open(os.path.join(ROOT, 'shots', 'clone', 'ref_%s.png' % ref)).convert('RGB')
    c = Image.open(os.path.join(ROOT, 'shots', 'clone', 'clone_%s.png' % sid)).convert('RGB')
    r = r.resize((int(H * r.width / r.height), H), Image.LANCZOS)
    rows.append((r, c))
pw = max(a.width + b.width for a, b in rows) + 30
cols = 2; out_rows = (len(rows) + cols - 1) // cols
grid = []
if '--all' in sys.argv:
    grid = sorted(glob.glob(os.path.join(ROOT, 'shots', 'clone', 'clone_*.png')))
gw = 320; gh = 280; gc = (cols * pw) // (gw + 10); grows = (len(grid) + gc - 1) // gc
out = Image.new('RGB', (cols * pw + 10, out_rows * (H + 12) + 10 + grows * (gh + 10)), BG)
for i, (a, b) in enumerate(rows):
    x = 10 + (i % cols) * pw; y = 10 + (i // cols) * (H + 12)
    out.paste(a, (x, y)); out.paste(b, (x + a.width + 8, y))
y0 = 10 + out_rows * (H + 12)
for i, p in enumerate(grid):
    im = Image.open(p).convert('RGB').resize((gw, gh), Image.LANCZOS)
    out.paste(im, (10 + (i % gc) * (gw + 10), y0 + (i // gc) * (gh + 10)))
out.save(os.path.join(ROOT, 'shots', 'clone', 'compare.png')); print(out.size)
