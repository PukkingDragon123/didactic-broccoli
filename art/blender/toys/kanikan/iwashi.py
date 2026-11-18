"""イワシ缶ワタリガニ Sardine-Tin Blue Crab: a blue swimming crab (paddle legs, long side spines) living in a flat
sardine tin, on a bed of sardines, the roll-back key lid half peeled (series kanikan, concepts_D.md). The label:
PORTO MARU SARDINES IN OLIVE OIL.

Gimmick: the lid rolls right back, the crab pops up and munches (claw to mouth, crumbs flying), then ducks back in.

    tools/blender.sh art/blender/toys/kanikan/iwashi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kani as kn  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('kanikan', 'iwashi')
low = kn.low
TW, TD, TH = 32.0, 21.0, 7.0          # the tin
FZ = TH - 0.8                         # the oil and the fish
HY = TD / 2 - 0.6                     # the lid's hinge (the back edge, where it rolls round the key)
OPEN0 = -40.0                         # the lid at rest: peeled back this far

# ------------------------------------------------------------------ the tin: a rounded oblong, its rolled rim; the sardines in oil
tin = tk.rbox('tin', (TW, TD, TH), centre=(0, 0, TH / 2), bevel=3.6, segs=3)
tin_lo, tin_hi = low(tin, 'tin', 200, lo=0, hi=1, region=('tin', [('tin_in', lambda C, N: (N[:, 2] > 0.7) & (C[:, 2] > TH - 0.2))]))
rim = tk.rbox('rim', (TW + 0.6, TD + 0.6, 0.9), centre=(0, 0, TH - 0.2), bevel=0.4, segs=2)
tk.boolean(rim, tk.rbox('cut', (TW - 2.0, TD - 2.0, 3.0), centre=(0, 0, TH), bevel=2.4, segs=2))
BASE = [(tin_lo, tin_hi), low(rim, 'rim', 120, lo=0, hi=0, region='tin_rim')]
for i, y in enumerate((-5.6, 0.0, 5.6)):   # three sardines laid head to tail
    sx = 1 if i % 2 else -1
    fish = tk.loft('fish', [{'c': (-sx * 12.0, y, FZ + 0.4), 'w': 2.0, 'h': 0.8}, {'c': (-sx * 6.0, y, FZ + 0.8), 'w': 4.0, 'h': 1.4},
                            {'c': (sx * 4.0, y, FZ + 0.7), 'w': 3.6, 'h': 1.2}, {'c': (sx * 10.0, y, FZ + 0.4), 'w': 1.6, 'h': 0.6}], n=8, up=(0, 0, 1), cap0='round', cap1='point')
    tail = tk.slab('tailf', [(0.0, -0.2), (1.8, -1.2), (1.4, 0.0), (1.8, 1.2), (0.0, 0.2)], 0.3, plane='XY', at=FZ + 0.4, bevel=0.08, segs=1)
    if sx < 0:
        tk.scale(tail, (-1, 1, 1))
        tk.fix_normals(tail)
    tk.move(tail, (sx * 10.0, y, 0))
    BASE += [low(fish, 'fish', 40, lo=1, hi=1, region='fish'), low(tail, 'tailf', 10, lo=0, hi=1, region='fish')]
# ------------------------------------------------------------------ the lid, half rolled back round its key
lid = tk.rbox('lid', (TW - 0.6, TD - 1.2, 0.5), centre=(0, -0.4, TH + 0.3), bevel=3.2, segs=2)
roll = tk.tube('roll', [(-TW / 2 + 2.0, HY, TH + 0.9), (TW / 2 - 2.0, HY, TH + 0.9)], 1.0, n=10, cap0='flat', cap1='flat')
key = tk.tube('key', [(TW / 2 - 2.0, HY, TH + 0.9), (TW / 2 + 1.6, HY, TH + 0.9), (TW / 2 + 3.2, HY - 1.2, TH + 0.9), (TW / 2 + 4.0, HY, TH + 0.9),
                      (TW / 2 + 3.2, HY + 1.2, TH + 0.9), (TW / 2 + 1.6, HY, TH + 0.9)], 0.35, n=5)
LID = [low(lid, 'lid', 60, lo=0, hi=1, region=('lidtop', [('lidin', lambda C, N: N[:, 2] < -0.5)])), low(roll, 'roll', 40, lo=0, hi=1, region='tin_rim'),
       low(key, 'key', 40, lo=0, hi=1, region='key')]
for pr in LID:
    for o in pr:
        tk.rotate(o, OPEN0, 'X', pivot=(0, HY, TH + 0.9))
# ------------------------------------------------------------------ the crab
SP = dict(w=13.0, d=8.6, h=3.6, spines=True, paddle=True, claws=(1.05, 1.0), legs=8.0, stalk=2.0, lift=1.4, tris=240,
          shape=[(0, 0.0), (0.7, 0.02), (1.0, 0.32), (0.86, 0.6), (0.5, 0.92), (0, 1.0)])
C = kn.crab(SP, at=(0, -1.4, FZ - 0.8), s=1.25)
CR = kn.crumbs('crumbs', C['mouth'] + (0, 0.8, 0), region='fish')

F.part('base', tk.join([b[0] for b in BASE], 'base'), [b[1] for b in BASE], bone='root')
F.part('lid', tk.join([l_[0] for l_ in LID], 'lid'), [l_[1] for l_ in LID], bone='lid')
F.part('crab', tk.join([b[0] for b in C['body']], 'crab'), [b[1] for b in C['body']], bone='crab')
for nm, (pp, sh_, tip) in C['claws'].items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('crumbs', CR[0], [CR[1]], bone='crumbs')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('lid', (0, HY, TH + 0.9), parent='root')
    R.bone('crab', (0, -1.4, FZ), parent='root')
    for nm, (pp, sh_, tip) in C['claws'].items():
        R.bone(nm, tuple(sh_), parent='crab')
    R.bone('crumbs', tuple(C['mouth']), parent='crab')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kn.munch(R, lid='lid', lid_rot=('X', -95), crab_up=(0, -1.4, 5.6), claw='claw_r', claw_rot=(('X', -30), ('Y', -30)), crumbs_bone='crumbs')
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    # the printed tin: a navy band round its side, a red line, the brand in white pixel letters; tinplate rims and lid
    tn = P.fill('tin', pt.ramp('#21407a', 6, shift=0.05), tone=sh, base=0.1, brush='gloss')
    P.fill(tn & (np.abs(Z - 1.2) < 0.5), pt.ramp('#c8302a', 5), tone=sh, base=0.1, brush=False)
    P.fill(tn & (np.abs(Z - TH + 1.4) < 0.4), pt.ramp('#e8c040', 5), tone=sh, base=0.1, brush=False)
    fr = tn & (P.on[:, :, 1] < -0.6)
    P.flat(fr & kn.text(X, Z, 'PORTO MARU', 0.36, 0.0, 4.4, bold=True), '#f4f0e4')
    P.flat(fr & kn.text(X, Z, 'SARDINES IN OLIVE OIL', 0.24, 0.0, 2.3), '#e8c040')
    bk = tn & (P.on[:, :, 1] > 0.6)
    P.flat(bk & kn.text(-X, Z, 'NET WT 125G', 0.26, 0.0, 3.4), '#f4f0e4')
    sd = tn & (np.abs(P.on[:, :, 0]) > 0.6)
    P.flat(sd & kn.text(np.where(P.on[:, :, 0] > 0, Y, -Y), Z, 'NO.3', 0.28, 0.0, 3.4), '#f4f0e4')
    for rg in ('tin_rim', 'tin_in', 'lidin', 'key'):
        P.fill(rg, pt.ramp('#c4c8ce', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.4, base=0.05)
    P.fill('lidtop', pt.ramp('#c4c8ce', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.4, base=0.05)
    P.fill('fish', pt.ramp('#b8c2cc', 6, shift=0.04, light=0.7), tone=sh * 1.2, base=0.15, brush='gloss')
    P.fill(P.region('fish') & (P.on[:, :, 2] > 0.5) & (np.abs(np.mod(X, 1.6) - 0.8) < 0.5), pt.ramp('#4a6a8a', 5), tone=sh, base=0.05, brush=False)   # the blue backs
    # the crab: mottled olive-blue shell, cream underneath, blue claws with red-orange tips
    cs = P.fill('cshell', pt.ramp('#4a78a8', 7, shift=0.07), tone=sh, base=0.08)
    who, d = P.dabs(cs, size=0.6, spacing=1.2, seed=7)
    P.shift(cs & (who >= 0) & (d < 0.5) & (np.mod(who, 3) == 0), -1)
    P.fill('cunder', pt.ramp('#efe6d2', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('ctip', pt.ramp('#e0603a', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('cbulb', pt.ramp('#4a78a8', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('crumb', pt.ramp('#b8c2cc', 4), tone=sh, base=0.15)
    for i, e in enumerate(C['eyes']):
        fe = face.Face(P, c=tuple(e), axis=(0, -1, 0.1), where=P.region('cbulb'), seed=900 + i)
        fe.dot(0.0, 0.0, 0.5 if i else 0.44)
    fm = face.Face(P, c=tuple(C['mouth'] + (0, 0, 0.4)), axis=(0, -1, 0.2), where=cs & (P.part == PI['crab']), seed=902)
    fm.mouth('grin', w=3.2, dy=0.0, weight=0.34, teeth=3)
    fm.blush(spread=5.0, dy=0.6, rx=0.9, ry=0.5)
    P.lines(['cshell'], ['cunder', 'ctip'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 91), skip=[('crab', 'base'), ('claw_r', 'crab'), ('claw_l', 'crab'), ('crumbs', 'crab'), ('lid', 'base'),
                                                              ('claw_r', 'base'), ('claw_l', 'base'), ('crumbs', 'claw_r')]),
    cams=[((40, -54, 40), (0, 0, 6)), ((-40, 50, 36), (0, 2, 6))], fold=(0, 18, 30, 50))
