"""ちょうちんリュウトウ Lantern Dragon Glaive (secret): an umbrella whose closed canopy is a red paper lantern, on a
black-lacquer shaft with gold rings and a curled dragon-tail pommel, on a black-lacquer sword stand (series kasabuki,
concepts_D.md).

Gimmick: click: the lantern splits into a dragon's jaws, the pearl in its throat lights (light-up), and a broad curved
glaive blade slides out of its mouth; then the jaws close on it again.

    tools/blender.sh art/blender/toys/kasabuki/ryuto.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kasabuki', 'ryuto')
AZ = kk.AZ
low = kk.low
L0, L1 = 2.0, 18.6           # the lantern
OUT = 12.0                   # how far the blade slides out

base_lo, base_hi = kk.stand(F)
# ------------------------------------------------------------------ the black-lacquer shaft, gold rings, the dragon-tail pommel
tail = tk.tube('pommel', [(-22.0, 0, AZ), (-25.0, 0, AZ + 0.6), (-26.8, 0, AZ + 2.6), (-26.0, 0, AZ + 4.4), (-24.4, 0, AZ + 4.2), (-24.2, 0, AZ + 3.0)],
               [1.2, 1.1, 1.0, 0.8, 0.6, 0.35], n=8, cap0='flat', cap1='point')
SHAFT = [kk.rod('shaft', -22.4, L0 + 1.0, 0.95, 'black', n=10), low(tail, 'pommel', 60, lo=1, hi=1, region='gold')]
for x in (-19.0, -12.0, -5.0, 0.6):
    SHAFT.append(kk.ring('gring', x, 1.15, 0.8, 'gold', n=10))
# ------------------------------------------------------------------ the lantern, split into the dragon's two jaws
JAWS = {}
for nm, side in (('jaw_u', 1), ('jaw_d', -1)):
    o = tk.lathe(nm, [(0, L0), (2.4, L0), (2.6, L0 + 0.8), (3.8, L0 + 3.0), (4.3, L0 + 8.0), (3.8, L1 - 3.0), (2.6, L1 - 0.8), (2.4, L1), (0, L1)], n=16, axis='X')
    tk.move(o, (0, 0, AZ))
    tk.bisect(o, (0, 0, AZ + side * 0.05), (0, 0, side), keep='+')

    def sc(h):
        def f(V, N):   # the lantern's bamboo ribs
            return -0.22 * (np.abs(np.mod(V[:, 0] - L0, 1.6) - 0.8) < 0.14) * (V[:, 0] > L0 + 1.2) * (V[:, 0] < L1 - 1.2) * (np.abs(N[:, 0]) < 0.8)
        tk.push(h, f)
    parts = [low(o, nm, 180, lo=1, hi=2, sculpt=sc, region=('paper', [('capb', lambda C, N: (C[:, 0] < L0 + 1.0) | (C[:, 0] > L1 - 1.0)),
                                                                      ('mouth', lambda C, N: np.abs(N[:, 2]) > 0.95)]))]
    if side > 0:   # the dragon's horns swept back along the upper jaw, and its brow ridges
        for sy in (1, -1):
            hn = tk.tube('horn', [(L1 - 4.0, sy * 1.6, AZ + 3.6), (L1 - 8.0, sy * 2.2, AZ + 4.6), (L1 - 12.0, sy * 2.0, AZ + 5.6)], [0.7, 0.5, 0.12], n=5, cap1='point')
            parts.append(low(hn, 'horn', 16, lo=1, hi=1, region='gold'))
    else:          # its beard
        bd = tk.tube('beard', [(L1 - 2.0, 0, AZ - 3.4), (L1 - 4.0, 0, AZ - 5.0), (L1 - 7.0, 0, AZ - 5.6)], [0.8, 0.6, 0.15], n=5, squash=0.5, cap1='point')
        parts.append(low(bd, 'beard', 16, lo=1, hi=1, region='gold'))
    JAWS[nm] = (parts, side)
pearl = tk.lathe('pearl', [(0, -1.8), (1.4, -1.4), (1.9, 0.0), (1.4, 1.4), (0, 1.8)], n=10, centre=(L0 + 4.6, 0, AZ))
PEARL = low(pearl, 'pearl', 40, lo=1, hi=1, region='pearl')
blade = tk.slab('blade', [(L0 + 1.0, -0.7), (L0 + 7.6, -0.9), (L0 + 12.0, -0.8), (L0 + 15.2, 0.0), (L0 + 16.4, 2.2), (L0 + 14.8, 2.8), (L0 + 12.0, 2.1),
                          (L0 + 9.4, 2.5), (L0 + 6.8, 1.8), (L0 + 1.0, 0.9)], 0.7, plane='XZ', at=0.0, bevel=0.25, segs=1)
tk.move(blade, (0, 0, AZ + 0.7))
BLADE = low(blade, 'blade', 50, lo=0, hi=1, region='steel')

F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('shaft', tk.join([s_[0] for s_ in SHAFT], 'shaft'), [s_[1] for s_ in SHAFT], bone='glaive')
for nm, (pp, side) in JAWS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('pearl', PEARL[0], [PEARL[1]], bone='glaive', kind='led')
F.part('blade', BLADE[0], [BLADE[1]], bone='blade', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('glaive', (0, 0, AZ), parent='root')
    for nm, (pp, side) in JAWS.items():
        R.bone(nm, (L0 + 0.4, 0, AZ + side * 0.4), parent='glaive')
    R.bone('blade', (L0 + 1.0, 0, AZ + 0.7), parent='glaive')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'glaive', 'jaw_u', 'jaw_d', 'blade']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-14 the jaws open (the pearl lights); 12-26 the blade slides out of the mouth and tilts up; 26-36 the glaive
        # lifts and the jaws snap a little wider; 62-84 the blade slides home and the jaws close
        k('jaw_u', 4)
        k('jaw_u', 14, rot=('Y', -38), ease='BACK')
        k('jaw_u', 30, rot=('Y', -38))
        k('jaw_u', 34, rot=('Y', -46), ease='BACK')
        k('jaw_u', 70, rot=('Y', -46))
        k('jaw_u', 80)
        k('jaw_d', 4)
        k('jaw_d', 14, rot=('Y', 5), ease='BACK')
        k('jaw_d', 70, rot=('Y', 5))
        k('jaw_d', 80)
        k('blade', 12)
        k('blade', 26, move=(OUT, 0, 1.2), rot=('Y', -8), ease='BACK')
        k('blade', 62, move=(OUT, 0, 1.2), rot=('Y', -8))
        k('blade', 74)
        k('glaive', 26)
        k('glaive', 36, move=(0, 0, 3.0), rot=('X', -10))
        k('glaive', 58, move=(0, 0, 3.0), rot=('X', -10))
        k('glaive', 64)
        for b in allb:
            k(b, 86)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kk.paint_stand(P, pt, sh)
    pp = P.fill('paper', pt.ramp('#d8382c', 7, shift=0.07), tone=sh * 0.8, base=0.15, brush={'preset': 'pvc', 'flow': 'around'})
    P.shift(pp & (P.cav > 0.55), -1)
    # the dragon on the lantern: gold scales down its back, eyes and nostrils on the upper jaw, a row of teeth on each lip
    up = pp & (Z > AZ + 0.5)
    who, d = P.dabs(up & (Z > AZ + 2.4), size=0.7, spacing=1.4, seed=61)
    P.fill(up & (who >= 0) & (d > 0.7) & (Z > AZ + 2.4), pt.ramp('#e8b840', 5), tone=sh, base=0.1, brush=False)
    for sy in (1, -1):
        P.fill(pp & (np.hypot(X - (L1 - 4.4), Z - AZ - 2.2) < 0.9) & (Y * sy > 1.5), pt.ramp('#f2d040', 4), tone=sh, base=0.2, brush=False)
        P.flat(pp & (np.hypot(X - (L1 - 4.2), Z - AZ - 2.2) < 0.4) & (Y * sy > 1.5), '#1a1414')
    lip = pp & (np.abs(Z - AZ) < 0.9) & (X > L0 + 4.0)
    P.fill(lip & (np.abs(np.mod(X, 1.2) - 0.6) < 0.4), pt.ramp('#f6f0e2', 4), tone=sh, base=0.25, brush=False)
    P.fill('mouth', pt.ramp('#6a1a22', 5), tone=sh, base=0.05)
    P.fill('capb', pt.ramp('#1e1a1c', 5, shift=0.04), tone=sh, base=0.1, brush='lacquer')
    P.fill('black', pt.ramp('#1e1a1c', 6, shift=0.04, light=0.5), tone=sh, base=0.15, brush='lacquer')
    P.fill('gold', pt.ramp('#d4a840', 6, shift=0.06), tone=sh * 1.3, base=0.1)
    P.fill('pearl', pt.ramp('#ffe8a0', 5, shift=0.04, light=0.6), tone=sh * 0.4, base=0.25, brush=False)
    kk.paint_steel(P, pt, sh, 'steel')
    st = P.region('steel')
    P.fill(st & (Z - AZ > 2.2) & (X > L0 + 8.0), pt.ramp('#eef2f6', 5, shift=0.03, light=0.8), tone=sh * 1.2, base=0.2, brush=False)    # the edge
    P.fill(st & (np.abs(X - L0 - 6.0) < 1.6) & (np.abs(Z - AZ - 0.4) < 0.9), pt.ramp('#d4a840', 5), tone=sh, base=0.1, brush=False)    # a gold dragon cloud inlay
    P.lines(['capb', 'gold', 'mouth'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('jaw_u', 'jaw_d'), ('jaw_u', 'shaft'), ('jaw_d', 'shaft'), ('pearl', 'jaw_u'), ('pearl', 'jaw_d'),
                                                              ('blade', 'jaw_u'), ('blade', 'jaw_d'), ('blade', 'pearl'), ('jaw_u', 'base'), ('jaw_d', 'base'),
                                                              ('shaft', 'base'), ('blade', 'shaft')]),
    cams=[((30, -60, 40), (0, 0, 10)), ((-36, 56, 36), (0, 0, 10))], fold=(0, 12, 30, 50))
