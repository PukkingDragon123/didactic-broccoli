"""ばんがさカタナ Wagasa Katana: a red oiled-paper umbrella (wagasa) on a black-lacquer sword stand (series kasabuki,
concepts_D.md). Its rattan-wrapped handle is a katana's grip, its closed canopy the scabbard.

Gimmick: click: the canopy slides off along the stand as the scabbard, the two halves of the tsuba flip out and lock,
and the blade is drawn; then it all slides home again.

    tools/blender.sh art/blender/toys/kasabuki/katana.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kake as kk  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('kasabuki', 'katana')
AZ = kk.AZ
low = kk.low
XG = -15.6                 # the guard (tsuba) station
SLIDE = 21.0               # how far the scabbard slides off

base_lo, base_hi = kk.stand(F)
# ------------------------------------------------------------------ the grip (the wagasa's rattan-wrapped handle) with its end cap
grip = tk.lathe('grip', [(0, -27.4), (1.15, -27.4), (1.35, -26.8), (1.3, -22.0), (1.42, XG - 1.4), (0, XG - 1.2)], n=10, axis='X')
tk.move(grip, (0, 0, AZ))
GRIP = [low(grip, 'grip', 60, lo=1, hi=1, region='wrap'), kk.ring('kashira', -27.0, 1.45, 1.0, 'brass'), kk.ring('fuchi', XG - 1.6, 1.5, 0.8, 'brass')]
# ------------------------------------------------------------------ the blade, hidden in the closed canopy until it is drawn
outline = [(XG, -1.05), (10.0, -1.0), (15.0, -0.75), (18.2, 0.15), (16.6, 0.85), (10.0, 1.15), (XG, 1.15)]
blade = tk.slab('blade', [(x, z + 0.0008 * (x - XG) ** 2) for x, z in outline], 0.55, plane='XZ', at=0.0, bevel=0.15, segs=1)
tk.move(blade, (0, 0, AZ))
BLADE = [low(blade, 'blade', 40, lo=0, hi=1, region='steel'), kk.box('habaki', (1.0, 1.0, 2.6), (XG + 0.5, 0, AZ), 'brass', bevel=0.15)]
# ------------------------------------------------------------------ the tsuba: two half-ovals folded flat along the blade, flipping out to lock
TSUBA = {}
for nm, sz in (('tsuba_u', 1), ('tsuba_d', -1)):
    half = tk.slab(nm, [(-2.2, 0.0), (2.2, 0.0), (2.0, 1.0), (1.2, 2.2), (0.0, 2.6), (-1.2, 2.2), (-2.0, 1.0)], 0.6, plane='YZ', at=0.0, bevel=0.15, segs=1)
    if sz < 0:
        tk.scale(half, (1, 1, -1))
        tk.fix_normals(half)
    tk.rotate(half, sz * 90, 'Y')           # folded down flat along the blade, into the canopy
    tk.move(half, (XG, 0, AZ + sz * 0.6))
    TSUBA[nm] = (low(half, nm, 30, lo=0, hi=1, region='tsuba'), (XG, 0, AZ + sz * 0.6), sz)
# ------------------------------------------------------------------ the closed canopy (the scabbard): red oiled paper, the top knob and its cord
canopy = kk.bundle('canopy', XG - 0.2, 21.0, [(0.0, 1.5), (0.04, 2.0), (0.2, 3.4), (0.45, 3.0), (0.75, 2.1), (0.95, 1.5), (1.0, 1.3)], folds=12, tris=280)
knob = tk.lathe('knob', [(0, 20.6), (1.6, 20.8), (1.8, 21.8), (1.2, 23.2), (0, 23.6)], n=10, axis='X')
tk.move(knob, (0, 0, AZ))
cord = tk.tube('cord', [(22.0, 0.0, AZ + 1.4), (22.6, -0.6, AZ + 2.4), (21.6, -1.0, AZ + 2.8), (20.6, -0.6, AZ + 2.0)], 0.22, n=4)
SAYA = [canopy, low(knob, 'knob', 30, lo=0, hi=1, region='knob'), low(cord, 'cord', 16, lo=0, hi=1, region='cord'),
        kk.ring('band', XG + 4.0, 3.15, 1.2, 'band', n=14)]

F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('grip', tk.join([g[0] for g in GRIP], 'grip'), [g[1] for g in GRIP], bone='sword')
F.part('blade', tk.join([b[0] for b in BLADE], 'blade'), [b[1] for b in BLADE], bone='sword', kind='gloss')
for nm, (pr, hinge, sz) in TSUBA.items():
    F.part(nm, pr[0], [pr[1]], bone=nm, kind='gloss')
F.part('saya', tk.join([s_[0] for s_ in SAYA], 'saya'), [s_[1] for s_ in SAYA], bone='saya')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('sword', (XG, 0, AZ), parent='root')
    for nm, (pr, hinge, sz) in TSUBA.items():
        R.bone(nm, hinge, parent='sword')
    R.bone('saya', (XG + 4.0, 0, AZ), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'sword', 'tsuba_u', 'tsuba_d', 'saya']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-8 click: the scabbard unlocks (a nudge); 8-22 it slides off along the stand, baring the blade; 18-24 the
        # tsuba halves flip out and lock (snap); the sword lifts a hair and tilts, ready; 62-84 everything slides home
        k('saya', 4)
        k('saya', 7, move=(1.2, 0, 0), ease='BACK')
        k('saya', 10, move=(1.2, 0, 0))
        k('saya', 22, move=(SLIDE, 0, 0), ease='QUAD')
        k('saya', 64, move=(SLIDE, 0, 0))
        k('saya', 80, ease='QUAD')
        for nm, (pr, hinge, sz) in TSUBA.items():
            k(nm, 16)
            k(nm, 22, rot=('Y', -sz * 90), ease='BACK')
            k(nm, 62, rot=('Y', -sz * 90))
            k(nm, 70)
        k('sword', 22)
        k('sword', 30, move=(0, 0, 1.4), rot=('Y', -4))
        k('sword', 56, move=(0, 0, 1.4), rot=('Y', -4))
        k('sword', 62)
        for b in allb:
            k(b, 86)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kk.paint_stand(P, pt, sh)
    # the oiled paper: deep vermilion, darker in the folds, a black band and a white ring near the runner
    cv = P.fill('canopy', pt.ramp('#c8342a', 7, shift=0.07), tone=sh, base=0.08, brush={'preset': 'lacquer', 'flow': 'along', 'axis': (1, 0, 0)})
    P.shift(cv & (P.cav > 0.55), -1)
    P.fill(cv & (np.abs(X - XG - 9.0) < 0.5), pt.ramp('#efe6d2', 4), tone=sh, base=0.1, brush=False)
    P.fill('band', pt.ramp('#1e1a1c', 5), tone=sh, base=0.1)
    P.fill('knob', pt.ramp('#1e1a1c', 5, shift=0.04), tone=sh, base=0.1, brush='lacquer')
    P.fill('cord', pt.ramp('#e8b830', 4), tone=sh, base=0.1)
    # the grip: dark rattan wrap in a diamond lattice over cream (the katana's tsuka-ito)
    P.fill('wrap', pt.ramp('#efe4c8', 5, shift=0.04), tone=sh, base=0.1)
    wr = P.region('wrap')
    a = np.arctan2(Z - AZ, Y)
    lat = (np.abs(np.mod(X * 0.9 + a * 1.2, 2.0) - 1.0) < 0.42) | (np.abs(np.mod(X * 0.9 - a * 1.2, 2.0) - 1.0) < 0.42)
    P.fill(wr & lat, pt.ramp('#2a2224', 5), tone=sh, base=0.05, brush='cloth')
    P.fill('brass', pt.ramp('#c8a048', 6, shift=0.06), tone=sh * 1.3, base=0.1)
    P.fill('tsuba', pt.ramp('#3a3432', 6, shift=0.04, light=0.6), tone=sh * 1.3, base=0.1, brush='metal')
    kk.paint_steel(P, pt, sh, 'steel')
    st = P.region('steel')
    P.fill(st & (Z - AZ - 0.0008 * (X - XG) ** 2 < -0.35), pt.ramp('#eef2f6', 5, shift=0.03, light=0.8), tone=sh * 1.2, base=0.2, brush=False)   # the edge
    P.fill(st & (np.abs(Z - AZ - 0.0008 * (X - XG) ** 2 + 0.35 - 0.12 * np.sin(X * 2.4)) < 0.12), pt.ramp('#9aa0a8', 4), tone=sh, base=0.1, brush=False)  # hamon
    P.lines(['band', 'tsuba', 'wrap'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('saya', 'base'), ('blade', 'saya'), ('tsuba_u', 'saya'), ('tsuba_d', 'saya'), ('grip', 'saya'),
                                                              ('tsuba_u', 'blade'), ('tsuba_d', 'blade'), ('grip', 'base'), ('blade', 'base')]),
    cams=[((30, -60, 40), (0, 0, 10)), ((-36, 56, 36), (0, 0, 10))], fold=(0, 10, 24, 50))
