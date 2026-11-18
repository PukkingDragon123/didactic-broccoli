"""サバ缶ヤドカリ Mackerel-Tin Hermit Crab: a hermit crab that has taken a round mackerel tin for its shell, the tin
lying on its side, the lid hinged up over the crab, chunks of mackerel at its feet (series kanikan, concepts_D.md). The
label: SABA STAR MACKEREL IN BRINE.

Gimmick: the lid swings right up, the crab pops out of its tin and munches (claw to mouth, crumbs flying), then backs in.

    tools/blender.sh art/blender/toys/kanikan/saba.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kanikan', 'saba')
low = kn.low
R0, TL = 11.0, 10.0                   # the tin's radius and length
CZ = R0 + 0.2                         # its axis height (lying on its side)
Y0 = 5.0                              # its closed end (y); the open end faces the front at Y0 - TL

# ------------------------------------------------------------------ the tin on its side (its open end to the front), the lid hinged at the top
tin = kn.tin_round('tin', R0, TL, (0, 0, 0), bead=True)
for o in tin:
    tk.rotate(o, 90, 'X')
    tk.move(o, (0, Y0, CZ))
lid = tk.cyl('lid', R0 - 0.3, 0.0, 0.5, n=22, at=(0, 0), axis='Z', bevel=0.2, segs=1)
tk.rotate(lid, 90, 'X')
tk.move(lid, (0, Y0 - TL - 0.4, CZ))
LID = low(lid, 'lid', 60, lo=0, hi=1, region=('lidtop', [('lidin', lambda C, N: N[:, 1] > 0.5)]))
HZ = CZ + R0 - 0.6                    # the lid's hinge (at the top of the open end)
for o in LID:
    tk.rotate(o, -100, 'X', pivot=(0, Y0 - TL - 0.4, HZ))
BASE = [tin]
for i, (x, y) in enumerate(((-6.4, -9.4), (5.8, -10.6))):   # chunks of mackerel at its feet
    ch = tk.rbox('chunk', (3.6, 2.8, 2.4), centre=(x, y, 1.2), bevel=0.8, segs=2)
    tk.rotate(ch, 20 + i * 40, 'Z', pivot=(x, y, 1.2))
    BASE.append(low(ch, 'chunk', 40, lo=0, hi=1, region=('meat', [('skin', lambda C, N: N[:, 2] > 0.6)])))
# ------------------------------------------------------------------ the hermit crab, coming out of the mouth of the tin
SP = dict(w=8.0, d=6.4, h=3.6, claws=(1.5, 0.95), legs=7.0, stalk=2.4, lift=2.4, tris=200, lumps=0.15,
          shape=[(0, 0.0), (0.8, 0.05), (1.0, 0.4), (0.8, 0.8), (0, 1.0)])
C = kn.crab(SP, at=(0, Y0 - TL - 0.6, 0.0), s=1.25)
CR = kn.crumbs('crumbs', C['mouth'] + (0, 0.8, 0), region='meat')

F.part('base', tk.join([b[0] for b in BASE], 'base'), [b[1] for b in BASE], bone='root')
F.part('lid', LID[0], [LID[1]], bone='lid')
F.part('crab', tk.join([b[0] for b in C['body']], 'crab'), [b[1] for b in C['body']], bone='crab')
for nm, (pp, sh_, tip) in C['claws'].items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('crumbs', CR[0], [CR[1]], bone='crumbs')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('lid', (0, Y0 - TL - 0.4, HZ), parent='root')
    R.bone('crab', (0, Y0 - TL, 0.5), parent='root')
    for nm, (pp, sh_, tip) in C['claws'].items():
        R.bone(nm, tuple(sh_), parent='crab')
    R.bone('crumbs', tuple(C['mouth']), parent='crab')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kn.munch(R, lid='lid', lid_rot=('X', -60), crab_up=(0, -3.2, 2.0), claw='claw_r', claw_rot=(('X', -34), ('Y', -24)), crumbs_bone='crumbs')
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    # the label round the tin: white, a blue wave band, SABA STAR in red pixel letters (U runs round the tin, V along it)
    tn = P.fill('tin', pt.ramp('#efeee6', 6, shift=0.04), tone=sh, base=0.15, brush='gloss')
    U = np.arctan2(X, -(Z - CZ)) * R0
    V = -(Y - (Y0 - TL / 2))
    P.fill(tn & (np.abs(V + 2.6 + 0.5 * np.sin(U * 0.8)) < 0.9), pt.ramp('#2a6ab0', 5, shift=0.05), tone=sh, base=0.1, brush=False)
    P.flat(tn & kn.text(U, V, 'SABA STAR', 0.34, 0.0, 1.6, bold=True), '#c8302a')
    P.flat(tn & kn.text(U, V, 'MACKEREL', 0.26, 0.0, -0.4), '#2a4a7a')
    P.flat(tn & kn.text(U + 24.0, V, 'IN BRINE', 0.26, 0.0, 1.0), '#2a4a7a')
    P.flat(tn & kn.text(U - 24.0, V, '190G', 0.3, 0.0, 1.0), '#2a4a7a')
    kn.tinplate(P, pt, sh, 'tin_rim', 'tin_in', 'lidtop', 'lidin')
    P.fill('meat', pt.ramp('#d8a088', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('skin', pt.ramp('#7a90a8', 5, shift=0.05), tone=sh, base=0.1, brush='gloss')
    P.fill('crumb', pt.ramp('#d8a088', 4), tone=sh, base=0.1)
    kn.paint_crab(P, pt, sh, C, PI['crab'], '#e07a3a', under='#f2d8b0', tip='#d8401a', mouth='upturn', mw=2.6, seed=910)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 91), skip=[('crab', 'base'), ('claw_r', 'crab'), ('claw_l', 'crab'), ('crumbs', 'crab'), ('lid', 'base'),
                                                              ('claw_r', 'base'), ('claw_l', 'base'), ('crumbs', 'claw_r')]),
    cams=[((40, -54, 40), (0, -2, 9)), ((-40, 50, 36), (0, 2, 9))], fold=(0, 18, 30, 50))
