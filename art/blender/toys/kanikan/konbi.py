"""コンビーフモクズガニ Corned-Beef Mitten Crab: a furry-clawed mitten crab sitting on the block of corned beef in a
tapered corned-beef tin, the top of the tin wound off on its key and leaning on the side (series kanikan,
concepts_D.md). The label: BIG RANCH CORNED BEEF.

Gimmick: the cut-off top flips away, the crab pops up off the meat and munches (furry claw to mouth, crumbs flying).

    tools/blender.sh art/blender/toys/kanikan/konbi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kanikan', 'konbi')
low = kn.low
BW, TW, TH, DP = 24.0, 17.0, 11.0, 15.0     # the tapered tin: bottom width, top width, height (to the cut), depth
MZ = TH + 2.6                               # the top of the meat block

# ------------------------------------------------------------------ the tapered tin (cut open), the meat standing proud of it, the top on its key
tin = tk.slab('tin', [(-BW / 2, 0.0), (BW / 2, 0.0), (TW / 2, TH), (-TW / 2, TH)], DP, plane='XZ', at=0.0, bevel=0.6, segs=2)
BASE = [low(tin, 'tin', 80, lo=0, hi=1, region=('tin', [('tin_in', lambda C, N: (N[:, 2] > 0.8) & (C[:, 2] > TH - 0.3))]))]
meat = tk.slab('meat', [(-TW / 2 + 0.5, TH - 0.4), (TW / 2 - 0.5, TH - 0.4), (TW / 2 - 1.2, MZ), (-TW / 2 + 1.2, MZ)], DP - 1.2, plane='XZ', at=0.0, bevel=0.9, segs=2)
BASE.append(low(meat, 'meat', 70, lo=0, hi=1, sculpt=lambda h: tk.push(h, lambda V, N: 0.15 * np.sin(V[:, 0] * 2.1) * np.sin(V[:, 1] * 1.7) * (N[:, 2] > 0.5)), region='meat'))
cap = tk.slab('cap', [(-TW / 2, 0.0), (TW / 2, 0.0), (TW / 2 - 0.8, 3.4), (-TW / 2 + 0.8, 3.4)], DP, plane='XZ', at=0.0, bevel=0.5, segs=1)
key = tk.tube('key', [(TW / 2 + 0.6, -DP / 2, 0.6), (TW / 2 + 0.6, DP / 2 + 1.6, 0.6), (TW / 2 + 0.6, DP / 2 + 3.0, 1.6), (TW / 2 + 0.6, DP / 2 + 3.6, 0.4),
                  (TW / 2 + 0.6, DP / 2 + 2.6, -0.4), (TW / 2 + 0.6, DP / 2 + 1.6, 0.6)], [0.9, 0.9, 0.4, 0.4, 0.4, 0.4], n=6)
HINGE = (-TW / 2, 0.0, TH + 0.2)
CAP = [low(cap, 'cap', 40, lo=0, hi=1, region=('captop', [('tin_in', lambda C, N: N[:, 2] < -0.6)])), low(key, 'key', 40, lo=0, hi=1, region='key')]
for o in [q for pr in CAP for q in pr]:
    tk.move(o, (0, 0, TH + 0.2))
    tk.rotate(o, -118, 'Y', pivot=HINGE)     # flipped open over the left side, hanging on its hinge strip
# ------------------------------------------------------------------ the mitten crab, furry claws, sat on the meat
SP = dict(w=11.6, d=9.4, h=4.0, claws=(1.25, 1.2), legs=5.6, stalk=1.8, lift=1.6, hair=1.0, tris=240,
          shape=[(0, 0.0), (0.7, 0.03), (1.0, 0.35), (0.9, 0.66), (0.55, 0.94), (0, 1.0)])
C = kn.crab(SP, at=(0.6, -0.8, MZ - 0.6), s=1.0)
CR = kn.crumbs('crumbs', C['mouth'] + (0, 0.8, 0), region='meat')

F.part('base', tk.join([b[0] for b in BASE], 'base'), [b[1] for b in BASE], bone='root')
F.part('cap', tk.join([c_[0] for c_ in CAP], 'cap'), [c_[1] for c_ in CAP], bone='cap')
F.part('crab', tk.join([b[0] for b in C['body']], 'crab'), [b[1] for b in C['body']], bone='crab')
for nm, (pp, sh_, tip) in C['claws'].items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('crumbs', CR[0], [CR[1]], bone='crumbs')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('cap', HINGE, parent='root')
    R.bone('crab', (0.6, -0.8, MZ), parent='root')
    for nm, (pp, sh_, tip) in C['claws'].items():
        R.bone(nm, tuple(sh_), parent='crab')
    R.bone('crumbs', tuple(C['mouth']), parent='crab')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kn.munch(R, lid='cap', lid_rot=('Y', 24), crab_up=(0, -0.6, 4.0), claw='claw_r', claw_rot=(('X', -30), ('Y', -28)), crumbs_bone='crumbs')
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    # the label: deep red, a gold band and a little gold steer-horn border, BIG RANCH in gold, CORNED BEEF in white
    tn = P.fill('tin', pt.ramp('#a82a26', 6, shift=0.06), tone=sh, base=0.1, brush='gloss')
    P.fill(tn & (np.abs(Z - 3.0) < 0.9), pt.ramp('#e0b040', 5, shift=0.05), tone=sh, base=0.1, brush=False)
    for face_y, sgn in ((-1, 1), (1, -1)):
        fr = tn & (P.on[:, :, 1] * face_y > 0.6)
        P.flat(fr & kn.text(X * sgn, Z, 'BIG RANCH', 0.36, 0.0, 8.0, bold=True), '#f0c848')
        P.flat(fr & kn.text(X * sgn, Z, 'CORNED BEEF', 0.3, 0.0, 5.4), '#f6f0e4')
        P.flat(fr & kn.text(X * sgn, Z, '340G', 0.26, 0.0, 3.0), '#7a1a18')
    kn.tinplate(P, pt, sh, 'tin_in', 'captop', 'key')
    P.fill('meat', pt.ramp('#c86a6a', 6, shift=0.06), tone=sh, base=0.1)
    mt = P.region('meat')
    who, d = P.dabs(mt, size=0.7, spacing=1.6, seed=5)
    P.fill(mt & (who >= 0) & (d < 0.45) & (np.mod(who, 2) == 0), pt.ramp('#f0d8c8', 4), tone=sh, base=0.15, brush=False)   # the fat flecks
    P.fill('crumb', pt.ramp('#c86a6a', 4), tone=sh, base=0.1)
    kn.paint_crab(P, pt, sh, C, PI['crab'], '#6a5a3a', under='#d8c8a0', tip='#e8dcc0', hair='#3a2e22', mouth='open', mw=2.6, seed=920)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 91), skip=[('crab', 'base'), ('claw_r', 'crab'), ('claw_l', 'crab'), ('crumbs', 'crab'), ('cap', 'base'),
                                                              ('claw_r', 'base'), ('claw_l', 'base'), ('crumbs', 'claw_r')]),
    cams=[((40, -54, 40), (0, 0, 9)), ((-40, 50, 36), (0, 2, 9))], fold=(0, 18, 30, 50))
