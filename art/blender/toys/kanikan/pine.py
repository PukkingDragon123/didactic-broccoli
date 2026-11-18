"""パインかんヤシガニ Pineapple-Ring Coconut Crab: a big coconut crab (the robber crab) in a squat ring-pull can of
pineapple rings, one ring worn round its claw like a bangle, the lid peeled up behind it (series kanikan,
concepts_D.md). The label: ISLE SUN PINEAPPLE RINGS IN SYRUP.

Gimmick: the lid peels right back, the crab pops up and munches its pineapple ring (claw to mouth, crumbs flying).

    tools/blender.sh art/blender/toys/kanikan/pine.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kanikan', 'pine')
low = kn.low
R0, TH = 11.0, 12.0
HY = R0 - 0.8                         # the lid's hinge (the back edge)

tin = kn.tin_round('tin', R0, TH, (0, 0, 0), bead=True)
syrup = tk.cyl('syrup', R0 - 0.6, TH - 2.0, TH - 0.9, n=20, at=(0, 0), axis='Z', bevel=0.2, segs=1)
ring = tk.lathe('pring', [(3.6, -0.7), (R0 - 1.6, -0.7), (R0 - 1.2, 0.0), (R0 - 1.6, 0.7), (3.6, 0.7), (3.2, 0.0)], n=20, centre=(0, 0, TH - 0.4))
BASE = [tin, low(syrup, 'syrup', 40, lo=0, hi=0, region='syrup'), low(ring, 'pring', 120, lo=1, hi=1, region='pine')]
lid = tk.cyl('lid', R0 - 0.4, TH - 0.2, TH + 0.3, n=22, at=(0, 0), axis='Z', bevel=0.2, segs=1)
LID = [low(lid, 'lid', 60, lo=0, hi=1, region=('lidtop', [('lidin', lambda C, N: N[:, 2] < -0.5)])), kn.ring_pull('pull', (0, -R0 + 3.6, TH + 0.3))]
for o in [q for pr in LID for q in pr]:
    tk.rotate(o, -78, 'X', pivot=(0, HY, TH + 0.1))
SP = dict(w=12.0, d=11.0, h=5.0, claws=(1.5, 1.35), legs=8.0, stalk=1.6, lift=1.8, tris=260, lumps=0.2, legr=1.25,
          shape=[(0, 0.0), (0.8, 0.02), (1.0, 0.3), (0.9, 0.6), (0.62, 0.9), (0, 1.0)])
C = kn.crab(SP, at=(0, -1.0, TH + 0.2), s=1.1)
CR = kn.crumbs('crumbs', C['mouth'] + (0, 0.8, 0), r=0.4, region='pine')
pp, sh_, tip = C['claws']['claw_r']
bangle = tk.lathe('bangle', [(1.6, -0.6), (2.6, -0.6), (2.8, 0.0), (2.6, 0.6), (1.6, 0.6), (1.4, 0.0)], n=14, centre=tuple((sh_ + tip) / 2))
tk.rotate(bangle, 70, 'Y', pivot=tuple((sh_ + tip) / 2))
pp.append(low(bangle, 'bangle', 60, lo=1, hi=1, region='pine'))

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
    R.bone('lid', (0, HY, TH + 0.1), parent='root')
    R.bone('crab', (0, -1.6, TH + 0.8), parent='root')
    for nm, (pp, sh_, tip) in C['claws'].items():
        R.bone(nm, tuple(sh_), parent='crab')
    R.bone('crumbs', tuple(C['mouth']), parent='crab')
    for p in F.parts:
        R.attach(p.low, p.bone)

    kn.munch(R, lid='lid', lid_rot=('X', -60), crab_up=(0, -0.8, 3.0), claw='claw_r', other='claw_l', claw_rot=(('X', -34), ('Y', -26)),
             crumbs_bone='crumbs')
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    tn = P.fill('tin', pt.ramp('#f2c838', 6, shift=0.06), tone=sh, base=0.1, brush='gloss')
    U = np.arctan2(X, -Y) * R0
    P.fill(tn & (np.abs(Z - 2.4) < 1.0), pt.ramp('#2a8a4a', 5, shift=0.06), tone=sh, base=0.1, brush=False)
    P.fill(tn & (np.abs(Z - 10.0) < 0.5), pt.ramp('#2a8a4a', 5, shift=0.06), tone=sh, base=0.1, brush=False)
    P.flat(tn & kn.text(U, Z, 'ISLE SUN', 0.36, 0.0, 8.0, bold=True), '#2a6a3a')
    P.flat(tn & kn.text(U, Z, 'PINEAPPLE RINGS', 0.26, 0.0, 5.4), '#c84a20')
    P.flat(tn & kn.text(U + 30.0, Z, 'IN SYRUP', 0.26, 0.0, 6.6), '#2a6a3a')
    P.flat(tn & kn.text(U - 30.0, Z, '565G', 0.3, 0.0, 6.6), '#2a6a3a')
    kn.tinplate(P, pt, sh, 'tin_rim', 'tin_in', 'lidtop', 'lidin', 'pull')
    P.fill('syrup', pt.ramp('#f6e2a0', 5, shift=0.04), tone=sh, base=0.2, brush='gloss')
    pn = P.fill('pine', pt.ramp('#f6d040', 6, shift=0.06), tone=sh, base=0.12, brush={'preset': 'pvc', 'flow': 'around'})
    P.shift(pn & (np.abs(np.sin(np.arctan2(Y, X) * 18)) > 0.92), -1)     # the fibres of the ring
    P.fill('crumb', pt.ramp('#f6d040', 4), tone=sh, base=0.1)
    kn.paint_crab(P, pt, sh, C, PI['crab'], '#6a4aa8', under='#e8a860', tip='#2a2030', bulb='#6a4aa8', mouth='grin', mw=3.4, seed=940)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 91), skip=[('crab', 'base'), ('claw_r', 'crab'), ('claw_l', 'crab'), ('crumbs', 'crab'), ('lid', 'base'),
                                                              ('claw_r', 'base'), ('claw_l', 'base'), ('crumbs', 'claw_r')]),
    cams=[((40, -54, 40), (0, 0, 10)), ((-40, 50, 36), (0, 2, 10))], fold=(0, 18, 30, 50))
