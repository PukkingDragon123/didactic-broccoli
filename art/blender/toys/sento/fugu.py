"""みずぶろフグ Cold-Plunge Puffer: an old pufferfish in the little hinoki cold tub, up to the chin in the water, a
folded towel on his head (series sento, concepts_D.md).

Gimmick: a shiver, then brr! he puffs up round with all his spines out, and slowly lets it go.

    tools/blender.sh art/blender/toys/sento/fugu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yu as yu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('sento', 'fugu')
H = yu.H
TT = H + 6.8                  # the tub's rim
WZ = H + 5.6                  # the water's surface
B0 = (0.0, -0.6, WZ + 2.6)    # the puffer's centre
low = yu.low

# ------------------------------------------------------------------ the floor and the square hinoki cold tub
base_lo, base_hi = yu.floor(F)
TW, TD, T = 27.0, 22.0, 1.6
PB = [yu.box('tubf', (TW, T, TT - H), (0, -TD / 2 + T / 2, (H + TT) / 2), 'hinoki', bevel=0.4),
      yu.box('tubb', (TW, T, TT - H), (0, TD / 2 - T / 2, (H + TT) / 2), 'hinoki', bevel=0.4),
      yu.box('tubl', (T, TD - 2 * T, TT - H), (-TW / 2 + T / 2, 0, (H + TT) / 2), 'hinoki', bevel=0.4),
      yu.box('tubr', (T, TD - 2 * T, TT - H), (TW / 2 - T / 2, 0, (H + TT) / 2), 'hinoki', bevel=0.4),
      yu.tub_water('water', (TW - 2 * T + 0.2, TD - 2 * T + 0.2, WZ - H - 1.0), (0, 0, (H + 1.0 + WZ) / 2))]
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)

# ------------------------------------------------------------------ the puffer: a round body cut at the water, fins, the towel
RINGS = [(-8.6, 6.4, 4.4, 4.6), (-6.4, 12.4, 6.6, 6.8), (-2.4, 16.6, 8.2, 8.0), (2.0, 15.4, 7.6, 7.6), (5.4, 11.0, 5.6, 5.8),
         (8.0, 5.4, 3.2, 3.4), (9.6, 3.6, 2.2, 2.4)]          # (y, width, top, bottom): a blunt snout, the round middle, the tail stalk
body = tk.loft('body', [{'c': (0, B0[1] + y, B0[2] + 0.2 * (y < -5)), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.1} for y, w, ht, hb in RINGS],
               n=18, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
CAGE = tk.verts(body).copy()
CN = tk.vnormals(body).copy()
body_lo, body_hi = low(body, 'body', 220, region=('skin', [('belly', lambda C, N: C[:, 2] < B0[2] - 2.2)]))
for o in (body_lo, body_hi):
    tk.bisect(o, (0, 0, WZ - 1.2), (0, 0, 1), keep='+')
BODY = [(body_lo, body_hi)]
lips = tk.tube('lips', [(0, B0[1] - 8.6, B0[2] - 0.6), (0, B0[1] - 10.4, B0[2] - 0.7)], [1.5, 1.35], n=10, cap0=None, cap1='round')
BODY.append(low(lips, 'lips', 30, lo=1, hi=1, region='lips'))
for sx in (1, -1):   # pectoral fins paddling at the surface
    fin = tk.slab('fin', [(0.0, 0.0), (-1.6, 1.4), (-3.0, 0.8), (-3.4, -0.6), (-2.2, -1.6), (-0.6, -1.0)], 0.7, plane='YZ', at=0.0, bevel=0.25, segs=1)
    tk.rotate(fin, sx * 18, 'Z')
    tk.move(fin, (sx * 8.0, B0[1] - 1.0, WZ + 1.0))
    BODY.append(low(fin, 'fin', 30, lo=0, hi=1, region='fin'))
tail = tk.slab('tail', [(0.0, -1.4), (3.0, -2.6), (4.2, 0.2), (3.8, 3.4), (0.0, 1.4)], 0.9, plane='YZ', at=0.0, bevel=0.25, segs=1)
tk.move(tail, (0, B0[1] + 10.0, B0[2]))
BODY.append(low(tail, 'tail', 30, lo=0, hi=1, region='fin'))
# the towel, folded and laid over the top of his head
tw = [{'c': (x, B0[1] - 1.6, B0[2] + 8.2 * math.sqrt(max(0.0, 1 - (x / 8.3) ** 2)) + 0.45), 'w': 5.6, 'h': 0.55, 'e': 3.0}
      for x in np.linspace(-4.0, 4.0, 7)]
towel = tk.loft('towel', tw, n=8, up=(0, 0, 1), cap0='flat', cap1='flat')
BODY.append(low(towel, 'towel', 60, lo=1, hi=2, region='towel'))
# the spines: short cones over the top of him; at rest only their tips show
SP = []
for i, (v, nv) in enumerate(zip(CAGE, CN)):
    rel = v - np.array(B0)
    if v[2] < WZ + 0.6 or (i % 3 == 0) or rel[1] > 7.0:
        continue
    if rel[1] < -5.0 and abs(rel[0]) < 5.0:                   # (keep the face clear)
        continue
    if abs(rel[0]) < 3.6 and abs(rel[1] + 1.6) < 3.6 and rel[2] > 5.0:   # (and the towel)
        continue
    n_ = nv / np.linalg.norm(nv)
    SP.append(tk.tube('spine', [tuple(v - n_ * 1.0), tuple(v + n_ * 1.1)], [0.6, 0.06], n=5, cap0='flat', cap1='point'))
sp_lo, sp_hi = low(tk.join(SP, 'spines'), 'spines', 200, lo=0, hi=1, region='spine')

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('spines', sp_lo, [sp_hi], bone='spines')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, B0[1], WZ - 1.2), parent='root')
    R.bone('spines', B0, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'spines']
    k = R.key
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-16 a shiver; 16-24 brr! he puffs up and the spines stand out; 24-48 bobbing big; 48-80 he lets it go
        for i, f in enumerate(range(4, 18, 2)):
            k('body', f, rot=('Z', 4 if i % 2 else -4), ease='LINEAR')
        k('body', 18)
        k('spines', 18)
        k('body', 24, scale=1.34, ease='BACK')
        k('spines', 24, scale=1.16, ease='BACK')
        k('body', 34, scale=(1.34, 1.36, 1.3), rot=('Y', 4))
        k('body', 44, scale=1.34, rot=('Y', -4))
        k('body', 50, scale=1.34)
        k('spines', 52, scale=1.16)
        k('body', 80, ease='QUAD')
        k('spines', 74)
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    yu.paint_floor(P, pt, sh)
    yu.paint_wood(P, pt, sh, 'hinoki', '#dcbb84', axis=(0, 0, 1))
    hk = P.region('hinoki')
    P.shift(hk & (np.abs(np.mod(X + Y, 3.8) - 1.9) < 0.12) & (P.on[:, :, 2] < 0.5), -1)    # the board joints
    yu.paint_water(P, pt, sh)
    # the puffer: olive-gold back with dark spots, a white belly, pale fins
    P.fill('skin', pt.ramp('#b8a24e', 7, shift=0.07), tone=sh, base=0.1)
    sk = P.region('skin')
    who, d = P.dabs(sk & (Z > B0[2] - 0.5), size=1.1, spacing=2.4, seed=4)
    P.fill(sk & (who >= 0) & (d < 0.55) & (Z > B0[2] + 0.4), pt.ramp('#5a4a26', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('belly', pt.ramp('#f0ece0', 6, shift=0.04), tone=sh, base=0.2)
    P.fill('fin', pt.ramp('#e2cf86', 5, shift=0.05), tone=sh, base=0.2, brush={'preset': 'pvc', 'flow': 'along', 'axis': (0, 1, 0.3)})
    P.fill('spine', pt.ramp('#ece0b8', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('towel', pt.ramp('#f2eee4', 6, shift=0.04), tone=sh, base=0.2, brush='cloth')
    P.fill(P.region('towel') & (np.abs(np.abs(Y - B0[1] + 1.6) - 1.6) < 0.35), pt.ramp('#3a6ab0', 4), tone=sh, base=0.1)
    # the face: dots set wide on the sides of his head (a puffer's eyes), a worried brow, a small round o of a mouth
    fw = (sk | P.region('belly')) & (P.part == PI['body'])
    fc = face.Face(P, c=(0, B0[1] - 9.6, B0[2] + 0.6), axis=(0, -1, 0.08), where=fw, seed=531)
    fc.eyes('dot', spread=7.0, size=0.62, dy=1.4, uneven=0.2)
    fc.brows('worried', spread=7.4, dy=2.8, w=1.8, weight=0.36)
    fc.blush(spread=8.4, dy=-0.4, rx=1.3, ry=0.7, col='#f08a7a')
    P.fill('lips', pt.ramp('#e8d8b0', 5, shift=0.05), tone=sh, base=0.15)
    fl = face.Face(P, c=(0, B0[1] - 10.9, B0[2] - 0.7), axis=(0, -1, 0), where=P.region('lips'), seed=532)
    fl.mouth('o', w=1.2, dy=0.0, weight=0.4)
    P.lines(['fin', 'towel', 'lips'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('spines', 'body'), ('body', 'base'), ('spines', 'base')]),
    cams=[((46, -58, 40), (0, 0, 12)), ((-46, 52, 36), (0, 2, 12))], fold=(0, 12, 26, 60))
