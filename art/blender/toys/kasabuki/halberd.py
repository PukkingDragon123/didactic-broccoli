"""こうもりハルバード Bat-Umbrella Halberd: a black Western umbrella (a kōmori-gasa, a "bat umbrella") with a
crook handle, on a black-lacquer sword stand (series kasabuki, concepts_D.md).

Gimmick: click: the tip shoots out into a spike, three panels of the canopy fan up into a bat-wing axe blade and a
fourth drops into the back hook; then it all folds back into the umbrella.

    tools/blender.sh art/blender/toys/kasabuki/halberd.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kasabuki', 'halberd')
AZ = kk.AZ
low = kk.low
HX = 9.0                   # the panels' hinge on the shaft

base_lo, base_hi = kk.stand(F)
# ------------------------------------------------------------------ the crook handle, the steel shaft, the black canopy with its strap
crook = tk.tube('crook', [(-12.0, 0, AZ), (-19.0, 0, AZ), (-22.6, 0, AZ - 0.6), (-24.6, 0, AZ - 3.0), (-24.0, 0, AZ - 5.6), (-21.8, 0, AZ - 6.4), (-20.4, 0, AZ - 5.4)],
                [1.25, 1.25, 1.25, 1.2, 1.15, 1.1, 1.05], n=8, cap0='flat', cap1='round')
CORE = [low(crook, 'crook', 80, lo=1, hi=1, region='wood'), kk.rod('shaft', -12.4, 25.0, 0.5, 'chrome'), kk.ring('collar', -12.0, 1.0, 1.2, 'chrome')]
canopy = kk.bundle('canopy', -9.6, 21.0, [(0.0, 0.8), (0.05, 1.6), (0.25, 3.2), (0.5, 2.8), (0.8, 1.6), (1.0, 0.8)], folds=8, tris=240, depth=0.35, twist=0.06)
strap = kk.ring('strap', 2.0, 3.0, 1.4, 'strap', n=14)
button = kk.box('snap', (1.4, 0.8, 1.4), (2.0, -3.0, AZ + 0.4), 'chrome', bevel=0.3)
CANOPY = [canopy, strap, button]
# ------------------------------------------------------------------ the spike, telescoped inside the tip; the panels folded inside the canopy
spike = tk.lathe('spike', [(0, 19.4), (0.6, 19.4), (0.75, 21.6), (0.9, 22.0), (0.45, 25.4), (0, 27.8)], n=8, axis='X')
tk.move(spike, (0, 0, AZ))
SPIKE = low(spike, 'spike', 40, lo=0, hi=1, region='steel')
PANELS = {}
for i, (nm, deg, L, notch) in enumerate((('p1', 56, 12.0, True), ('p2', 90, 13.0, True), ('p3', 124, 12.0, True), ('hook', -96, 7.0, False))):
    # a fabric panel between two ribs: a long blade-shaped triangle, its outer edge scalloped like a bat's wing
    if notch:
        out = [(0.0, -0.5), (-L * 0.45, -2.2), (-L, -2.6), (-L * 0.84, -0.8), (-L, 0.9), (-L * 0.84, 2.4), (-L * 0.45, 2.2), (0.0, 0.5)]
    else:
        out = [(0.0, -0.5), (-L * 0.7, -1.2), (-L, 0.2), (-L * 0.8, 0.9), (-L * 0.5, 0.6), (0.0, 0.5)]
    pn = tk.slab(nm, out, 0.45, plane='XZ', at=0.3 * (i - 1.5), bevel=0.12, segs=1)
    tk.move(pn, (HX, 0, AZ))
    PANELS[nm] = (low(pn, nm, 24, lo=0, hi=1, region='panel'), deg)

F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('core', tk.join([c[0] for c in CORE], 'core'), [c[1] for c in CORE], bone='core')
F.part('canopy', tk.join([c[0] for c in CANOPY], 'canopy'), [c[1] for c in CANOPY], bone='core')
F.part('spike', SPIKE[0], [SPIKE[1]], bone='spike', kind='gloss')
for nm, (pr, deg) in PANELS.items():
    F.part(nm, pr[0], [pr[1]], bone=nm)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('core', (0, 0, AZ), parent='root')
    R.bone('spike', (19.4, 0, AZ), parent='core')
    for nm in PANELS:
        R.bone(nm, (HX, 0, AZ), parent='core')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'core', 'spike'] + list(PANELS)
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-10 click: the spike shoots out of the tip; 10-26 the panels fan up one after another (the axe blade) and
        # the hook drops; 26-30 it all locks (the halberd lifts and turns a little to show off); 64-84 it folds away
        k('spike', 4)
        k('spike', 10, move=(5.0, 0, 0), ease='BACK')
        k('spike', 66, move=(5.0, 0, 0))
        k('spike', 74)
        for i, (nm, (pr, deg)) in enumerate(PANELS.items()):
            f0 = 10 + i * 3
            k(nm, f0)
            k(nm, f0 + 8, rot=('Y', deg), ease='BACK')
            k(nm, 62 - i * 2, rot=('Y', deg))
            k(nm, 72 - i * 2)
        k('core', 26)
        k('core', 34, move=(0, 0, 2.6), rot=('X', -18))
        k('core', 56, move=(0, 0, 2.6), rot=('X', -18))
        k('core', 62)
        for b in allb:
            k(b, 86)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kk.paint_stand(P, pt, sh)
    cv = P.fill('canopy', pt.ramp('#2a2a30', 7, shift=0.05, light=0.6), tone=sh, base=0.15, brush={'preset': 'cloth', 'flow': 'along', 'axis': (1, 0, 0)})
    P.shift(cv & (P.cav > 0.55), -1)
    P.fill('strap', pt.ramp('#2a2a30', 5, shift=0.05, light=0.6), tone=sh, base=0.2, brush='cloth')
    P.fill('panel', pt.ramp('#2e2c34', 6, shift=0.05, light=0.6), tone=sh, base=0.15, brush={'preset': 'cloth', 'flow': 'along', 'axis': (1, 0, 0)})
    pn = P.region('panel')
    P.fill(pn & (P.cav < 0.42), pt.ramp('#b8bec6', 4), tone=sh, base=0.15, brush=False)     # the rib along each panel's edge
    P.fill('wood', pt.ramp('#8a4a2a', 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0.3)})
    P.fill('chrome', pt.ramp('#c7cbd2', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.5, base=0.05)
    kk.paint_steel(P, pt, sh, 'steel')
    P.lines(['strap', 'panel'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('canopy', 'base'), ('core', 'base'), ('spike', 'core'), ('spike', 'canopy'),
                                                              ('p1', 'canopy'), ('p2', 'canopy'), ('p3', 'canopy'), ('hook', 'canopy'),
                                                              ('p1', 'p2'), ('p2', 'p3'), ('p1', 'p3'), ('p1', 'hook'), ('p2', 'hook'), ('p3', 'hook'),
                                                              ('p1', 'core'), ('p2', 'core'), ('p3', 'core'), ('hook', 'core')]),
    cams=[((30, -60, 40), (0, 0, 10)), ((-36, 56, 36), (0, 0, 10))], fold=(0, 12, 30, 50))
