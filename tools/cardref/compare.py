#!/usr/bin/env python3
"""compare.py: shots/clone/compare.png, each reference card next to its clone at the same size.
  python3 -I tools/cardref/compare.py henshin:crabcan yomise:pipeotter ..."""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
pairs = [a.split(':') for a in sys.argv[1:]]
H = 600; tiles = []
for sid, ref in pairs:
    r = Image.open(os.path.join(ROOT, 'shots', 'clone', 'ref_%s.png' % ref)).convert('RGB')
    c = Image.open(os.path.join(ROOT, 'shots', 'clone', 'clone_%s.png' % sid)).convert('RGB')
    w = int(H * r.width / r.height)
    tiles.append((r.resize((w, H), Image.LANCZOS), c.resize((w, H), Image.LANCZOS)))
out = Image.new('RGB', (sum(2 * a.width + 30 for a, _ in tiles) + 20, H + 20), (40, 40, 44)); x = 10
for a, b in tiles:
    out.paste(a, (x, 10)); out.paste(b, (x + a.width + 6, 10)); x += 2 * a.width + 30
out.save(os.path.join(ROOT, 'shots', 'clone', 'compare.png')); print(out.size)
