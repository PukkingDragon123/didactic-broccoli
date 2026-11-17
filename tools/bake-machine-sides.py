#!/usr/bin/env python3
"""bake-machine-sides.py: the side graphics of the gacha machines (public/img/machines/side_<type>.png, the sizes the
machine models map), from a real photograph of gumballs (Open Images 9a73ee8933d93045, "gumballs galore!" by Ms NyKenJee, CC BY 2.0) and real
type (OFL faces), printed on real paper (tools/paperkit.py).   python3 -I tools/bake-machine-sides.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from printkit import Panel, ROOT
import paperkit as PK
SIDES = {  # type: (w, h, ground, ink, title, sub, photo focus)
    'retro': (184, 77, 0xe2b648, 0x3a2410, 'ガチャガチャ', 'GS-70  100 YEN', (0.25, 0.5, 2.2)),
    'standard': (197, 77, 0x3f72bf, 0xffffff, 'カプセルトイ', 'CAPSULE GS-90', (0.5, 0.5, 2.2)),
    'royal': (236, 82, 0xc4528f, 0xffffff, 'ガチャガチャ', 'ROYAL GS-1000', (0.75, 0.5, 2.2)),
}
for k, (w, h, g, ink, t, sub, f) in SIDES.items():
    P = Panel(w, h, g)
    P.rect(0, 0, w, h, g); P.rect(0, 0, w, 3, 0xfbf6ea); P.rect(0, h - 3, w, 3, 0xfbf6ea)
    s = h - 14
    P.photo('oi:9a73ee8933d93045@test', 7, 7, s, s, f=(f[0], 0.5, 1.6), shape='round', r=6, sat=1.0, con=1.05)
    P.rect(7, 7, s, s, 0xfbf6ea, r=6, line=1.2)
    P.text(t, 'mochiy', 17, s + 15, h * 0.42, ink, anchor='lm', maxw=w - s - 20)
    P.text(sub, 'bebas', 10, s + 16, h * 0.72, ink, anchor='lm', track=1)
    im = PK.age(P.image(), paper='Paper001', grain_k=0.4, fade=0.05, seed=len(k)).convert('RGB')
    im.save(os.path.join(ROOT, 'public', 'img', 'machines', 'side_%s.png' % k), optimize=True)
    print(k, im.size)
