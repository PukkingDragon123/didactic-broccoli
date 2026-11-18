"""ひがさボウ Parasol Bow: a pink lace parasol with a little crook handle, on a black-lacquer sword stand (series
kasabuki, concepts_D.md).

Gimmick: click: the closed canopy splits down its length and the two halves swing out into the limbs of a bow, the
string draws out between their tips, the fletching flicks out by the handle and the tip opens into an arrowhead: the
shaft was the arrow all along. Then it folds back into the parasol.

    tools/blender.sh art/blender/toys/kasabuki/bow.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kasabuki', 'bow')
AZ = kk.AZ
low = kk.low
X0, X1 = -9.0, 15.4          # the canopy (the limbs' hinge is at X1: the bow's grip)
OPEN = 76.0                  # how far each limb swings out (degrees)
L = X1 - X0
TIPX = X1 - L * math.cos(math.radians(OPEN))

base_lo, base_hi = kk.stand(F)
# ------------------------------------------------------------------ the handle, the shaft (the arrow), the grip wrap, the tip (the arrowhead)
crook = tk.tube('crook', [(-11.0, 0, AZ), (-17.4, 0, AZ), (-19.6, 0, AZ - 1.0), (-20.0, 0, AZ - 2.8), (-18.8, 0, AZ - 3.8)], [1.0, 1.0, 0.95, 0.9, 0.85], n=8, cap0='flat', cap1='round')
CORE = [low(crook, 'crook', 60, lo=1, hi=1, region='wood'), kk.rod('shaft', -11.4, 17.0, 0.45, 'shaft'), kk.ring('grip', X1 + 0.4, 1.3, 2.2, 'gripw', n=10),
        kk.ring('nock', -11.0, 1.1, 1.0, 'brass', n=10)]
tip = tk.lathe('tip', [(0, 16.6), (0.5, 16.6), (0.6, 18.4), (1.1, 18.8), (0.3, 21.6), (0, 22.2)], n=8, axis='X')
tk.move(tip, (0, 0, AZ))
TIP = low(tip, 'tip', 30, lo=0, hi=1, region='steel')
VANES = []
for i in range(3):   # the fletching, hidden in the canopy's foot until the limbs swing away
    a = math.radians(90 + i * 120)
    v = tk.slab('vane', [(0.0, 0.0), (-3.4, 0.0), (-3.0, 1.4), (-0.6, 1.0)], 0.2, plane='XZ', at=0.0, bevel=0.06, segs=1)
    tk.rotate(v, math.degrees(a) - 90, 'X')
    tk.move(v, (-5.0, 0, AZ))
    VANES.append(v)
VN = low(tk.join(VANES, 'vanes'), 'vanes', 40, lo=0, hi=1, region='vane')
# ------------------------------------------------------------------ the canopy, split down its length into the two limbs
LIMBS = {}
for nm, side in (('limb_f', -1), ('limb_b', 1)):
    o = tk.lathe(nm, [(0, X0), (0.9, X0), (2.0, X0 + 3.0), (3.0, X0 + 8.0), (2.6, X0 + 14.0), (1.6, X0 + 20.0), (0.8, X1), (0, X1 + 0.3)], n=14, axis='X')
    tk.move(o, (0, 0, AZ))
    tk.bisect(o, (0, side * 0.05, 0), (0, side, 0), keep='+')

    def sc(h):
        def f(V, N):   # the lace frill round the widest part, the fabric's soft folds
            fr = 0.35 * np.exp(-((V[:, 0] - X0 - 7.4) / 0.6) ** 2) * (np.abs(np.sin(np.arctan2(V[:, 2] - AZ, V[:, 1]) * 9)) + 0.4)
            return fr + 0.2 * np.abs(np.sin(np.arctan2(V[:, 2] - AZ, V[:, 1]) * 4))
        tk.push(h, f)
    LIMBS[nm] = (low(o, nm, 150, lo=1, hi=2, sculpt=sc, region='lace'), side)
string = tk.tube('string', [(TIPX, -0.8, AZ), (TIPX, 0.8, AZ)], 0.16, n=4, cap0='flat', cap1='flat')
STR = low(string, 'string', 10, lo=0, hi=0, region='string')

F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('core', tk.join([c[0] for c in CORE], 'core'), [c[1] for c in CORE], bone='core')
F.part('tip', TIP[0], [TIP[1]], bone='tip', kind='gloss')
F.part('vanes', VN[0], [VN[1]], bone='vanes')
for nm, (pr, side) in LIMBS.items():
    F.part(nm, pr[0], [pr[1]], bone=nm)
F.part('string', STR[0], [STR[1]], bone='string')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('core', (0, 0, AZ), parent='root')
    R.bone('tip', (16.6, 0, AZ), parent='core')
    R.bone('vanes', (-5.0, 0, AZ), parent='core')
    for nm in LIMBS:
        R.bone(nm, (X1, 0, AZ), parent='core')
    R.bone('string', (TIPX, 0, AZ), parent='core')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'core', 'tip', 'string'] + list(LIMBS)
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-8 click (the canopy halves part); 8-22 the limbs swing out; 18-26 the string draws out tip to tip; 20-28 the
        # arrowhead opens, the fletching flicks out; 26-34 the bow lifts and cants, drawn; 64-84 it folds away
        for nm, (pr, side) in LIMBS.items():
            k(nm, 4)
            k(nm, 7, rot=('Z', side * -6))
            k(nm, 20, rot=('Z', side * -OPEN), ease='BACK')
            k(nm, 66, rot=('Z', side * -OPEN))
            k(nm, 78)
        k('string', 18)
        k('string', 24, scale=(1.0, 1.0, 2 * 0.98 * L * math.sin(math.radians(OPEN)) / 1.6))
        k('string', 64, scale=(1.0, 1.0, 2 * 0.98 * L * math.sin(math.radians(OPEN)) / 1.6))
        k('string', 70)
        k('tip', 20)
        k('tip', 26, move=(3.0, 0, 0), scale=(1.0, 1.6, 1.6), ease='BACK')
        k('tip', 64, move=(3.0, 0, 0), scale=(1.0, 1.6, 1.6))
        k('tip', 72)
        k('core', 22)
        k('core', 34, move=(0, 0, 6.0), rot=('X', -35))
        k('core', 58, move=(0, 0, 6.0), rot=('X', -35))
        k('core', 64)
        for b in allb:
            k(b, 86)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kk.paint_stand(P, pt, sh)
    lc = P.fill('lace', pt.ramp('#f4b4c8', 7, shift=0.06), tone=sh, base=0.15, brush={'preset': 'cloth', 'flow': 'along', 'axis': (1, 0, 0), 'cross': True})
    a = np.arctan2(Z - AZ, Y)
    # white lace: the frill band and a scalloped lace edge near the tip, little eyelet holes
    P.fill(lc & (np.abs(X - X0 - 7.4) < 1.2), pt.ramp('#f8f2f2', 5, shift=0.03), tone=sh, base=0.2, brush='cloth')
    P.fill(lc & (np.abs(X - X0 - 4.2 - 0.6 * np.abs(np.sin(a * 6))) < 0.5), pt.ramp('#f8f2f2', 5, shift=0.03), tone=sh, base=0.2, brush=False)
    eye = lc & (np.hypot(np.mod(X, 2.0) - 1.0, np.mod(a * 3.0, 2.0) - 1.0) < 0.28) & (X > X0 + 9.0)
    P.fill(eye, pt.ramp('#c87a92', 4), tone=sh, base=0.05, brush=False)
    P.fill('wood', pt.ramp('#c89a6a', 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0.3)})
    P.fill('shaft', pt.ramp('#f4eee6', 5, shift=0.04), tone=sh, base=0.2, brush='lacquer')
    P.fill('gripw', pt.ramp('#c8506a', 5, shift=0.05), tone=sh, base=0.1, brush='cloth')
    P.fill('brass', pt.ramp('#c8a048', 6, shift=0.06), tone=sh * 1.3, base=0.1)
    P.fill('vane', pt.ramp('#f8f2f2', 5, shift=0.03), tone=sh, base=0.2, brush={'preset': 'feather', 'flow': 'along', 'axis': (1, 0, 0)})
    P.fill('string', pt.ramp('#f2ece0', 4), tone=sh, base=0.2, brush=False)
    kk.paint_steel(P, pt, sh, 'steel')
    P.lines(['lace', 'gripw', 'vane'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('limb_f', 'core'), ('limb_b', 'core'), ('limb_f', 'limb_b'), ('string', 'core'), ('string', 'limb_f'),
                                                              ('string', 'limb_b'), ('tip', 'core'), ('vanes', 'core'), ('limb_f', 'base'), ('limb_b', 'base'),
                                                              ('core', 'base'), ('tip', 'limb_f'), ('tip', 'limb_b'), ('vanes', 'limb_f'), ('vanes', 'limb_b')]),
    cams=[((30, -60, 40), (0, 0, 10)), ((-36, 56, 36), (0, 0, 10))], fold=(0, 12, 28, 50))
