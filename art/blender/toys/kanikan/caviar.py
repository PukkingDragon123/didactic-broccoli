"""キャビアきんのカニ Caviar Golden Crab (secret): a spiny golden crab sitting on a heap of caviar in a flat caviar tin,
a mother-of-pearl spoon in its claw, the gold-and-black lid standing open behind it (series kanikan, concepts_D.md).
The label: ROYAL ROE CAVIAR, GRADE 000.

Gimmick: the lid swings right back, the crab pops up and spoons the caviar in (claw to mouth, roe flying).

    tools/blender.sh art/blender/toys/kanikan/caviar.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kani as kn  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('kanikan', 'caviar')
low = kn.low
R0, TH = 12.5, 5.6
HY = R0 + 0.2                          # the lid's hinge (the back edge)

tin = kn.tin_round('tin', R0, TH, (0, 0, 0), bead=False, n=28)
roe = tk.lathe('roe', [(0, TH - 1.0), (R0 - 0.7, TH - 1.0), (R0 - 1.0, TH + 0.2), (7.0, TH + 1.6), (0, TH + 2.2)], n=22)
BASE = [tin, low(roe, 'roe', 100, lo=1, hi=2, sculpt=lambda h: tk.push(h, lambda V, N: 0.18 * (np.sin(V[:, 0] * 4.1) * np.sin(V[:, 1] * 3.9) > 0.1) * (N[:, 2] > 0.3)), region='roe')]
lid = tk.lathe('lid', [(0, 0.0), (R0 + 0.3, 0.0), (R0 + 0.6, 0.3), (R0 + 0.6, 1.6), (R0, 1.9), (0, 2.0)], n=28)
tk.move(lid, (0, 0, TH - 0.4))
LID = low(lid, 'lid', 120, lo=0, hi=1, region=('lidtop', [('lidband', lambda C, N: np.abs(N[:, 2]) < 0.5), ('lidin', lambda C, N: N[:, 2] < -0.5)]))
for o in LID:
    tk.rotate(o, -100, 'X', pivot=(0, HY, TH - 0.2))
SP = dict(w=12.0, d=10.0, h=4.6, spines=True, claws=(1.25, 1.1), legs=8.0, stalk=1.8, lift=1.6, lumps=0.35, tris=280,
          shape=[(0, 0.0), (0.75, 0.02), (1.0, 0.3), (0.9, 0.62), (0.55, 0.92), (0, 1.0)])
C = kn.crab(SP, at=(0, -1.6, TH + 0.6), s=1.05)
pp, sh_, tip = C['claws']['claw_r']
sp_c = tip + (0.6, -1.0, 1.6)
bowl = tk.lathe('spoon', [(0, -0.3), (1.0, -0.2), (1.2, 0.2), (0, 0.1)], n=10, centre=tuple(sp_c))
tk.scale(bowl, (1.0, 1.4, 1.0), pivot=tuple(sp_c))
handle = tk.tube('spoonh', [tuple(sp_c + (0, 1.4, 0.0)), tuple(tip + (0.2, 1.0, -0.4))], [0.32, 0.26], n=5)
pp.append(low(tk.join([bowl, handle], 'spoon'), 'spoon', 50, lo=0, hi=1, region='pearl'))
CR = kn.crumbs('crumbs', C['mouth'] + (0, 0.8, 0), r=0.32, region='roe')

F.part('base', tk.join([b[0] for b in BASE], 'base'), [b[1] for b in BASE], bone='root')
F.part('lid', LID[0], [LID[1]], bone='lid', kind='gloss')
F.part('crab', tk.join([b[0] for b in C['body']], 'crab'), [b[1] for b in C['body']], bone='crab', kind='gloss')
for nm, (pq, s_, t_) in C['claws'].items():
    F.part(nm, tk.join([p_[0] for p_ in pq], nm), [p_[1] for p_ in pq], bone=nm, kind='gloss')
F.part('crumbs', CR[0], [CR[1]], bone='crumbs')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('lid', (0, HY, TH - 0.2), parent='root')
    R.bone('crab', (0, -1.6, TH + 0.6), parent='root')
    for nm, (pq, s_, t_) in C['claws'].items():
        R.bone(nm, tuple(s_), parent='crab')
    R.bone('crumbs', tuple(C['mouth']), parent='crab')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kn.munch(R, lid='lid', lid_rot=('X', -40), crab_up=(0, -1.0, 4.0), claw='claw_r', claw_rot=(('X', -32), ('Y', -28)), crumbs_bone='crumbs')
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    GOLD = pt.ramp('#d8b040', 7, shift=0.07, light=0.7, dark=0.65)
    tn = P.fill('tin', pt.ramp('#1e1c22', 6, shift=0.04, light=0.5), tone=sh, base=0.15, brush='gloss')
    U = np.arctan2(X, -Y) * R0 - 0.6 * R0      # (the label's centre turned towards the three-quarter view)
    P.fill(tn & ((np.abs(Z - 0.9) < 0.3) | (np.abs(Z - TH + 0.9) < 0.3)), GOLD, tone=sh, base=0.1, brush=False)
    P.flat(tn & kn.text(U, Z, 'ROYAL ROE', 0.3, 0.0, 3.4, bold=True), '#e8c050')
    P.flat(tn & kn.text(U, Z, 'CAVIAR', 0.22, 0.0, 1.8), '#e8c050')
    P.flat(tn & kn.text(U + 32.0, Z, 'GRADE 000', 0.24, 0.0, 2.6), '#e8c050')
    P.fill('tin_rim', GOLD, tone=sh * 1.3, base=0.1)
    P.fill('tin_in', GOLD, tone=sh * 1.3, base=0.1)
    P.fill('lidtop', pt.ramp('#1e1c22', 6, shift=0.04, light=0.5), tone=sh, base=0.15, brush='gloss')
    P.fill('lidband', GOLD, tone=sh * 1.3, base=0.1)
    P.fill('lidin', GOLD, tone=sh * 1.3, base=0.1)
    lt = P.region('lidtop')
    P.fill(lt & (np.abs(np.hypot(X, np.hypot(Y - HY, Z - TH)) - R0 * 0.8) < 0.4), GOLD, tone=sh, base=0.1, brush=False)    # a gold ring on the lid
    rr = P.fill('roe', pt.ramp('#2a2a30', 6, shift=0.04, light=0.6), tone=sh, base=0.1, brush='gloss')
    who, d = P.dabs(rr, size=0.32, spacing=0.6, seed=4)
    P.shift(rr & (who >= 0) & (d < 0.35), 2)        # the shine on each egg
    P.fill('crumb', pt.ramp('#2a2a30', 4, light=0.6), tone=sh, base=0.1)
    P.fill('pearl', pt.ramp('#eef0f4', 5, shift=0.04, light=0.6), tone=sh, base=0.2, brush='gloss')
    P.shift(P.region('pearl') & (np.abs(np.sin(X * 6 + Y * 4)) > 0.8), -1)
    kn.paint_crab(P, pt, sh, C, PI['crab'], '#d8a838', under='#f2dc8a', tip='#a87818', bulb='#d8a838', mouth='grin', mw=3.4, seed=950,
                  brush={'preset': 'metal', 'flow': 'around'})
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 91), skip=[('crab', 'base'), ('claw_r', 'crab'), ('claw_l', 'crab'), ('crumbs', 'crab'), ('lid', 'base'),
                                                              ('claw_r', 'base'), ('claw_l', 'base'), ('crumbs', 'claw_r')]),
    cams=[((40, -54, 40), (0, 0, 7)), ((-40, 50, 36), (0, 2, 7))], fold=(0, 18, 30, 50))
