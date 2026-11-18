"""じゃのめヤリ Janome Spear: a navy bull's-eye umbrella (janome-gasa: the white ring shows as a band when it is
closed), bamboo shaft and rattan-wrapped grip, on a black-lacquer sword stand (series kasabuki, concepts_D.md).

Gimmick: click: the top cap flips open, the shaft telescopes out, the canopy closes up into a spearhead's socket, the
leaf blade slides out of it and a red tassel flares; then it all goes back.

    tools/blender.sh art/blender/toys/kasabuki/yari.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kake as kk  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('kasabuki', 'yari')
AZ = kk.AZ
low = kk.low
X0, X1 = -8.0, 20.0          # the canopy
TEL = 7.0                    # how far the grip telescopes out
OUT = 13.0                   # how far the blade slides out

base_lo, base_hi = kk.stand(F)
# ------------------------------------------------------------------ the bamboo core shaft (shows when the grip telescopes), the grip
CORE = [kk.rod('core', -25.4, X0 + 1.0, 0.7, 'bamboo', n=8)]
grip = tk.lathe('grip', [(0, -26.0), (1.0, -26.0), (1.15, -25.4), (1.1, -18.4), (0.95, -17.6), (0, -17.6)], n=10, axis='X')
tk.move(grip, (0, 0, AZ))
GRIP = [low(grip, 'grip', 50, lo=1, hi=1, region='wrap'), kk.ring('gring', -17.8, 1.15, 0.8, 'brass', n=10)]
# ------------------------------------------------------------------ the canopy (it closes up into the socket), the blade and tassel inside it
canopy = kk.bundle('canopy', X0, X1, [(0.0, 1.0), (0.05, 1.8), (0.25, 3.2), (0.55, 2.9), (0.85, 1.9), (1.0, 1.2)], folds=10, tris=240, depth=0.3)
CAN = [canopy, kk.ring('band', 13.0, 2.2, 1.6, 'janome', n=14)]
leaf = tk.slab('blade', [(4.0, 0.0), (8.0, -1.1), (14.0, -1.7), (18.4, -0.5), (19.6, 0.0), (18.4, 0.5), (14.0, 1.7), (8.0, 1.1)], 0.9, plane='XZ', at=0.0, bevel=0.35, segs=1)
tk.move(leaf, (0, 0, AZ))
BLADE = low(leaf, 'blade', 40, lo=0, hi=1, region='steel')
strands = []
for i in range(6):
    a = math.radians(i * 60 + 30)
    d = np.array((0.0, math.cos(a), math.sin(a)))
    p0 = np.array((X1 - 2.0, 0, AZ)) + d * 0.5
    strands.append(tk.tube('strand', [tuple(p0), tuple(p0 + (-3.0, 0, 0) + d * 0.3), tuple(p0 + (-5.4, 0, 0) + d * 0.5)], [0.3, 0.26, 0.08], n=4, cap1='point'))
TAS = low(tk.join(strands, 'tassel'), 'tassel', 80, lo=0, hi=1, region='tassel')
cap = tk.lathe('cap', [(0, X1 - 0.4), (1.5, X1 - 0.4), (1.7, X1 + 0.8), (1.1, X1 + 2.4), (0, X1 + 2.8)], n=10, axis='X')
tk.move(cap, (0, 0, AZ))
CAP = low(cap, 'cap', 30, lo=0, hi=1, region='capl')

F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('core', CORE[0][0], [CORE[0][1]], bone='spear')
F.part('grip', tk.join([g[0] for g in GRIP], 'grip'), [g[1] for g in GRIP], bone='grip')
F.part('canopy', tk.join([c[0] for c in CAN], 'canopy'), [c[1] for c in CAN], bone='canopy')
F.part('blade', BLADE[0], [BLADE[1]], bone='blade', kind='gloss')
F.part('tassel', TAS[0], [TAS[1]], bone='tassel')
F.part('cap', CAP[0], [CAP[1]], bone='cap', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('spear', (0, 0, AZ), parent='root')
    R.bone('grip', (-17.6, 0, AZ), parent='spear')
    R.bone('canopy', (X1, 0, AZ), parent='spear')
    R.bone('blade', (4.0, 0, AZ), parent='spear')
    R.bone('tassel', (X1 - 2.0, 0, AZ), parent='spear')
    R.bone('cap', (X1 - 0.4, 0, AZ + 1.5), parent='spear')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'spear', 'grip', 'canopy', 'blade', 'tassel', 'cap']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-10 click: the cap flips open on its hinge; 8-18 the grip telescopes out; 10-22 the canopy closes up into the
        # socket; 16-28 the blade slides out; 24-30 the tassel flares; 30-38 the spear lifts and levels; 64-84 back
        k('cap', 4)
        k('cap', 10, rot=('Y', -130), ease='BACK')
        k('cap', 70, rot=('Y', -130))
        k('cap', 80)
        k('grip', 8)
        k('grip', 18, move=(-TEL, 0, 0), ease='BACK')
        k('grip', 66, move=(-TEL, 0, 0))
        k('grip', 76)
        k('canopy', 10)
        k('canopy', 22, scale=(0.42, 1.12, 1.12))
        k('canopy', 64, scale=(0.42, 1.12, 1.12))
        k('canopy', 76)
        k('blade', 16)
        k('blade', 28, move=(OUT, 0, 0), ease='BACK')
        k('blade', 62, move=(OUT, 0, 0))
        k('blade', 72)
        k('tassel', 22)
        k('tassel', 30, scale=(1.0, 3.0, 3.0), rot=('X', 30), ease='BACK')
        for i, f in enumerate(range(34, 62, 7)):
            k('tassel', f, scale=(1.0, 3.0 - 0.2 * (i % 2), 3.0), rot=('X', 30 + 25 * (i + 1)))
        k('tassel', 66)
        k('spear', 30)
        k('spear', 38, move=(0, 0, 2.4))
        k('spear', 58, move=(0, 0, 2.4))
        k('spear', 64)
        for b in allb:
            k(b, 86)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kk.paint_stand(P, pt, sh)
    cv = P.fill('canopy', pt.ramp('#23305a', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'lacquer', 'flow': 'along', 'axis': (1, 0, 0)})
    P.shift(cv & (P.cav > 0.55), -1)
    P.fill('janome', pt.ramp('#f2ecdc', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('bamboo', pt.ramp('#c8b070', 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0)})
    P.shift(P.region('bamboo') & (np.abs(np.mod(X, 6.0) - 3.0) > 2.75), -1)
    P.fill('wrap', pt.ramp('#5a3a28', 5, shift=0.05), tone=sh, base=0.05)
    P.shift(P.region('wrap') & (np.abs(np.mod(X * 1.6 + np.arctan2(Z - AZ, Y), 1.0) - 0.5) < 0.18), 1)    # the rattan spiral
    P.fill('brass', pt.ramp('#c8a048', 6, shift=0.06), tone=sh * 1.3, base=0.1)
    P.fill('capl', pt.ramp('#c8a048', 6, shift=0.06), tone=sh * 1.3, base=0.1)
    P.fill('tassel', pt.ramp('#c8302a', 6, shift=0.07), tone=sh, base=0.1, brush={'preset': 'fur', 'flow': 'along', 'axis': (1, 0, 0)})
    kk.paint_steel(P, pt, sh, 'steel')
    bl = P.region('steel')
    P.fill(bl & (np.abs(Z - AZ) < 0.25), pt.ramp('#9aa0a8', 4), tone=sh, base=0.05, brush=False)     # the midrib
    P.lines(['janome', 'tassel', 'capl'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('canopy', 'base'), ('core', 'base'), ('grip', 'base'), ('blade', 'canopy'), ('tassel', 'canopy'),
                                                              ('blade', 'tassel'), ('core', 'grip'), ('core', 'canopy'), ('cap', 'canopy'), ('cap', 'blade'),
                                                              ('blade', 'base'), ('tassel', 'base')]),
    cams=[((30, -60, 40), (0, 0, 10)), ((-36, 56, 36), (0, 0, 10))], fold=(0, 12, 30, 50))
