"""ベイクドビーンズシオマネキ Baked-Bean Fiddler Crab: a fiddler crab perched on the heap of beans in a tall ring-pull
can, waving its one enormous claw, the lid peeled up behind it (series kanikan, concepts_D.md). The label: HAPPY HILL
BAKED BEANS IN TOMATO SAUCE.

Gimmick: the lid peels right back, the crab pops up, waves the big claw and shovels beans in with the little one.

    tools/blender.sh art/blender/toys/kanikan/beans.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kanikan', 'beans')
low = kn.low
R0, TH = 9.0, 19.0
HY = R0 - 0.8                         # the lid's hinge (the back edge)

tin = kn.tin_round('tin', R0, TH, (0, 0, 0), bead=True)
heap = tk.lathe('heap', [(0, TH - 1.0), (R0 - 0.7, TH - 1.0), (R0 - 1.0, TH + 0.6), (5.0, TH + 2.0), (0, TH + 2.6)], n=18)
BASE = [tin, low(heap, 'heap', 90, lo=1, hi=2, sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (np.sin(V[:, 0] * 3.1) * np.sin(V[:, 1] * 2.9) > 0.2) * (N[:, 2] > 0.3)), region='beans')]
lid = tk.cyl('lid', R0 - 0.4, TH - 0.2, TH + 0.3, n=22, at=(0, 0), axis='Z', bevel=0.2, segs=1)
LID = [low(lid, 'lid', 60, lo=0, hi=1, region=('lidtop', [('lidin', lambda C, N: N[:, 2] < -0.5)])), kn.ring_pull('pull', (0, -R0 + 3.6, TH + 0.3))]
for o in [q for pr in LID for q in pr]:
    tk.rotate(o, -78, 'X', pivot=(0, HY, TH + 0.1))
SP = dict(w=9.0, d=6.6, h=3.4, claws=(0.75, 1.8), legs=6.0, stalk=3.2, lift=1.6, tris=200,
          shape=[(0, 0.0), (0.75, 0.02), (1.0, 0.36), (0.86, 0.7), (0.5, 0.95), (0, 1.0)])
C = kn.crab(SP, at=(0, -1.6, TH + 0.8), s=1.2)
CR = kn.crumbs('crumbs', C['mouth'] + (0, 0.8, 0), r=0.4, region='beans')

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

    def wave(k):   # the big claw waves high, back and forth, while the little one shovels
        for i, f in enumerate(range(22, 66, 8)):
            k('claw_l', f, rot=[('Y', 30 if i % 2 else 52), ('X', -20)])
    kn.munch(R, lid='lid', lid_rot=('X', -60), crab_up=(0, -0.8, 3.6), claw='claw_r', other='claw_l', claw_rot=(('X', -34), ('Y', 30)),
             crumbs_bone='crumbs', extra=wave)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    tn = P.fill('tin', pt.ramp('#2a9a9a', 6, shift=0.06), tone=sh, base=0.1, brush='gloss')
    U = np.arctan2(X, -Y) * R0
    P.fill(tn & (np.abs(Z - 4.0) < 1.6), pt.ramp('#f08a30', 5, shift=0.06), tone=sh, base=0.1, brush=False)
    P.flat(tn & kn.text(U, Z, 'HAPPY HILL', 0.34, 0.0, 14.0, bold=True), '#f6f0e4')
    P.flat(tn & kn.text(U, Z, 'BAKED', 0.42, 0.0, 10.6, bold=True), '#f2c040')
    P.flat(tn & kn.text(U, Z, 'BEANS', 0.42, 0.0, 7.4, bold=True), '#f2c040')
    P.flat(tn & kn.text(U, Z, 'IN TOMATO SAUCE', 0.22, 0.0, 4.0), '#7a2a10')
    P.flat(tn & kn.text(U + 28.0, Z, '415G', 0.3, 0.0, 10.0), '#f6f0e4')
    kn.tinplate(P, pt, sh, 'tin_rim', 'tin_in', 'lidtop', 'lidin', 'pull')
    bn = P.fill('beans', pt.ramp('#e0702a', 6, shift=0.06), tone=sh, base=0.12, brush='gloss')
    who, d = P.dabs(bn, size=0.5, spacing=0.9, seed=3)
    P.shift(bn & (who >= 0) & (d > 0.75), -1)          # bean edges in the sauce
    P.fill('crumb', pt.ramp('#e0702a', 4), tone=sh, base=0.1)
    kn.paint_crab(P, pt, sh, C, PI['crab'], '#3a4a6a', under='#e8e0d0', tip='#f2e6c8', bulb='#3a4a6a', mouth='open', mw=2.4, seed=930)
    big = P.region('cshell') & (P.part == PI['claw_l'])
    P.fill(big, pt.ramp('#f0b030', 6, shift=0.06), tone=sh, base=0.1)       # the big claw: bright yellow-orange
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 91), skip=[('crab', 'base'), ('claw_r', 'crab'), ('claw_l', 'crab'), ('crumbs', 'crab'), ('lid', 'base'),
                                                              ('claw_r', 'base'), ('claw_l', 'base'), ('crumbs', 'claw_r')]),
    cams=[((40, -54, 44), (0, 0, 13)), ((-40, 50, 40), (0, 2, 13))], fold=(0, 18, 30, 50))
