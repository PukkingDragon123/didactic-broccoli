"""おりたたみサンセツコン Folding Three-Section Staff: a navy folding umbrella in its sleeve, with a wrist strap, on a
black-lacquer sword stand (series kasabuki, concepts_D.md).

Gimmick: click: it comes apart into three sections joined by chains (the handle, the canopy, the cap end), the two
far sections swing up and over into a zig-zag and whirl once, then it all folds back together.

    tools/blender.sh art/blender/toys/kasabuki/sansetsu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kasabuki', 'sansetsu')
AZ = kk.AZ
low = kk.low
J1, J2 = -6.0, 7.6             # the two joints (chains) along the umbrella
GAP = 2.4                      # the chain's length when it comes apart

base_lo, base_hi = kk.stand(F)
# ------------------------------------------------------------------ section A: the straight handle with its strap, the telescoped shaft
handle = tk.lathe('handle', [(0, -24.0), (1.2, -24.0), (1.5, -23.2), (1.6, -18.0), (1.3, -15.6), (0.9, -15.0), (0, -15.0)], n=10, axis='X')
tk.move(handle, (0, 0, AZ))
loop = tk.tube('strap', [(-23.4, 0.0, AZ - 1.2), (-24.6, -0.4, AZ - 3.6), (-23.0, -0.6, AZ - 5.4), (-21.2, -0.4, AZ - 4.0), (-21.6, 0.0, AZ - 1.4)], 0.35, n=4, squash=0.5, closed=True)
SA = [low(handle, 'handle', 50, lo=1, hi=1, region='rubber'), low(loop, 'strap', 40, lo=0, hi=1, region='strapc'),
      kk.rod('tel1', -15.2, -10.0, 0.75, 'chrome'), kk.rod('tel2', -10.2, J1 - 0.2, 0.62, 'chrome'), kk.ring('tring', -10.1, 0.9, 0.6, 'chrome', n=10)]
# ------------------------------------------------------------------ section B: the canopy in its sleeve; section C: the top end and its cap
cb = kk.bundle('canopyb', J1 + 0.1, J2 - 0.1, [(0.0, 2.4), (0.15, 3.0), (0.5, 3.2), (0.85, 3.0), (1.0, 2.6)], folds=6, tris=140, depth=0.25)
SB = [cb, kk.ring('sleeve1', J1 + 3.0, 3.25, 1.6, 'sleeve', n=14), kk.ring('sleeve2', J2 - 3.0, 3.25, 1.6, 'sleeve', n=14)]
cc = kk.bundle('canopyc', J2 + 0.1, 19.0, [(0.0, 2.6), (0.4, 2.3), (0.8, 1.5), (1.0, 0.8)], folds=6, tris=110, depth=0.25)
cap = tk.lathe('cap', [(0, 18.6), (1.0, 18.6), (1.1, 20.6), (0.6, 21.6), (0, 21.8)], n=10, axis='X')
tk.move(cap, (0, 0, AZ))
SC = [cc, low(cap, 'cap', 30, lo=0, hi=1, region='chrome'), kk.ring('sleeve3', J2 + 3.6, 2.5, 1.4, 'sleeve', n=14)]
# ------------------------------------------------------------------ the chains, coiled up inside each joint until it comes apart
CH = {}
for nm, x in (('chain1', J1), ('chain2', J2)):
    links = []
    for i in range(4):
        c = (x - 0.6 + i * 0.4, 0, AZ)
        lk = tk.tube('link', [(c[0] + 0.5 * math.cos(a), c[1] + (0.32 * math.sin(a) if i % 2 else 0.0), c[2] + (0.0 if i % 2 else 0.32 * math.sin(a)))
                              for a in np.linspace(0, 2 * math.pi, 8, endpoint=False)], 0.12, n=4, closed=True)
        links.append(lk)
    CH[nm] = (low(tk.join(links, nm), nm, 120, lo=0, hi=0, region='chrome'), x)

F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('secA', tk.join([s_[0] for s_ in SA], 'secA'), [s_[1] for s_ in SA], bone='secA')
F.part('secB', tk.join([s_[0] for s_ in SB], 'secB'), [s_[1] for s_ in SB], bone='secB')
F.part('secC', tk.join([s_[0] for s_ in SC], 'secC'), [s_[1] for s_ in SC], bone='secC')
for nm, (pr, x) in CH.items():
    F.part(nm, pr[0], [pr[1]], bone=nm, kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('secA', (-15.0, 0, AZ), parent='root')
    R.bone('chain1', (J1 - 0.6, 0, AZ), parent='secA')
    R.bone('secB', (J1, 0, AZ), parent='secA')
    R.bone('chain2', (J2 - 0.6, 0, AZ), parent='secB')
    R.bone('secC', (J2, 0, AZ), parent='secB')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'secA', 'secB', 'secC', 'chain1', 'chain2']
    sx = GAP / 1.6 + 1.0
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-10 click-click: the sections pull apart on their chains; 10-24 B swings up, C over and down (a zig-zag);
        # 24-44 the whole staff whirls round once on its handle; 44-60 it holds; 62-84 it folds back together
        for nm in ('chain1', 'chain2'):
            k(nm, 4)
            k(nm, 10, scale=(sx, 1.0, 1.0), ease='BACK')
            k(nm, 66, scale=(sx, 1.0, 1.0))
            k(nm, 74)
        k('secB', 4)
        k('secB', 10, move=(GAP, 0, 0))
        k('secB', 22, move=(GAP, 0, 0), rot=('Y', -48), ease='BACK')
        k('secB', 60, move=(GAP, 0, 0), rot=('Y', -48))
        k('secB', 70, move=(GAP, 0, 0))
        k('secB', 76)
        k('secC', 6)
        k('secC', 12, move=(GAP, 0, 0))
        k('secC', 24, move=(GAP, 0, 0), rot=('Y', 100), ease='BACK')
        k('secC', 60, move=(GAP, 0, 0), rot=('Y', 100))
        k('secC', 70, move=(GAP, 0, 0))
        k('secC', 76)
        k('secA', 24)
        k('secA', 30, move=(0, 0, 5.2))
        for i, f in enumerate(range(32, 46, 3)):
            k('secA', f, move=(0, 0, 5.2), rot=('X', -72 * (i + 1)), ease='LINEAR')
        k('secA', 48, move=(0, 0, 5.2), rot=('X', -360))
        k('secA', 52, move=(0, 0, 5.2))
        k('secA', 60)
        for b in allb:
            k(b, 86)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kk.paint_stand(P, pt, sh)
    for rg in ('canopyb', 'canopyc'):
        cv = P.fill(rg, pt.ramp('#2a3a6a', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'cloth', 'flow': 'along', 'axis': (1, 0, 0)})
        P.shift(cv & (P.cav > 0.55), -1)
    P.fill('sleeve', pt.ramp('#2a3a6a', 6, shift=0.06), tone=sh, base=0.15, brush='cloth')
    sl = P.region('sleeve')
    P.fill(sl & (np.abs(np.mod(X, 1.2) - 0.6) < 0.18), pt.ramp('#e8c040', 5), tone=sh, base=0.1, brush=False)      # a yellow pin-stripe
    P.fill('rubber', pt.ramp('#2a2a2c', 6, shift=0.05), tone=sh, base=0.1)
    rb = P.region('rubber')
    P.shift(rb & (np.abs(np.mod(X, 0.9) - 0.45) < 0.12) & (X > -23.0) & (X < -16.0), 1)      # grip ridges
    P.fill('strapc', pt.ramp('#e8c040', 5, shift=0.05), tone=sh, base=0.1, brush='cloth')
    P.fill('chrome', pt.ramp('#c7cbd2', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.5, base=0.05)
    P.lines(['sleeve', 'strapc'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('secA', 'base'), ('secB', 'base'), ('secC', 'base'), ('chain1', 'secA'), ('chain1', 'secB'),
                                                              ('chain2', 'secB'), ('chain2', 'secC'), ('secB', 'secA'), ('secC', 'secB')]),
    cams=[((30, -60, 40), (0, 0, 10)), ((-36, 56, 36), (0, 0, 10))], fold=(0, 12, 26, 50))
