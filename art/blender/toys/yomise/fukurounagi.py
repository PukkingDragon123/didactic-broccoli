"""ふうせんフクロウナギ Balloon Gulper Eel: the balloon seller of the deep-sea night market (series yomise, concepts_D.md).
A gulper eel, all mouth, tiny eyes right at the tip of its snout, coiled on the sea floor; its whip of a tail rises
behind with two balloons tied on, and its tip glows pink.

Gimmick: the huge jaw drops open and it blows a balloon up big in its mouth, the tail tip glowing (light-up); then
gulp, the balloon is gone.

    tools/blender.sh art/blender/toys/yomise/fukurounagi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yatai as ya  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('yomise', 'fukurounagi')
SZ = ya.SZ
HC = np.array((1.0, -2.0, SZ + 13.4))       # the skull
HJ = HC + (0, 0.6, -1.4)                     # the jaw's hinge
TIP = np.array((-6.6, 4.6, SZ + 19.0))      # the tail tip (it glows)
low = ya.low

# ------------------------------------------------------------------ the sea floor
base_lo, base_hi = ya.seabed(F, rx=13.0, ry=12.0, seed=8)

# ------------------------------------------------------------------ the eel: neck down into a coil on the floor, the tail rising behind
path = [tuple(HC + (0, 1.2, -0.6)), (1.2, 1.4, SZ + 9.6), (2.6, 3.6, SZ + 5.0)]
for a in np.linspace(80, 420, 9):
    r = 5.0 - 0.003 * (a - 80)
    path.append((0.4 + r * math.cos(math.radians(a)), 2.6 + r * math.sin(math.radians(a)) * 0.9, SZ + 1.7 + 0.004 * (a - 80)))
path += [(-5.8, 3.8, SZ + 4.0), (-7.0, 5.0, SZ + 9.0), (-6.6, 5.2, SZ + 14.6), tuple(TIP + (0, 0, -0.8))]
radii = list(np.linspace(2.4, 1.6, 12)) + [1.2, 0.8, 0.5, 0.32]
eel = tk.tube('eel', path, radii, n=8, cap0='round', cap1='round')
EEL = [low(eel, 'eel', 200, region=('skin', [('belly', lambda C_, N: N[:, 2] < -0.5)]))]
fin = tk.loft('dfin', [{'c': p_, 'w': 0.4, 'h': 0.6} for p_ in [(-5.6, 3.6, SZ + 6.0), (-7.4, 5.4, SZ + 9.4), (-7.0, 5.6, SZ + 13.4)]], n=4, up=(-1, 0, 0), cap0='point', cap1='point')
EEL.append(low(fin, 'dfin', 12, lo=1, hi=1, region='fin'))
tipb = tk.lathe('tipb', [(0, -0.8), (0.6, -0.5), (0.75, 0.1), (0.5, 0.6), (0, 0.8)], n=8, centre=tuple(TIP))
TIPB = low(tipb, 'tipb', 16, lo=0, hi=1, region='glow')
# the balloons on their strings, tied on just below the tail tip
BAL = []
for i, (c, col) in enumerate((((-3.4, 6.4, SZ + 27.0), 'balr'), ((-9.6, 2.4, SZ + 25.4), 'baly'))):
    c = np.array(c)
    b = tk.lathe('bal', [(0, -2.8), (1.6, -2.2), (2.5, -0.6), (2.4, 1.0), (1.4, 2.2), (0, 2.5)], n=12, centre=tuple(c))
    kn = tk.tube('knot', [tuple(c + (0, 0, -2.6)), tuple(c + (0, 0, -3.4))], [0.35, 0.2], n=4)
    st = tk.tube('string', [tuple(TIP + (0, 0, -1.6)), tuple((TIP + c) / 2 + (0.6, 0, -1.0)), tuple(c + (0, 0, -3.2))], 0.16, n=4)
    BAL += [low(b, 'bal', 50, lo=1, hi=1, region=col), low(kn, 'knot', 8, lo=0, hi=1, region=col), low(st, 'string', 12, lo=0, hi=1, region='string')]
# ------------------------------------------------------------------ the head: the skull and its long upper jaw; the huge pouch of a lower jaw
upper = tk.loft('upper', [{'c': tuple(HC + (0, 1.6, 0.0)), 'w': 4.6, 'h': 2.2, 'e': 2.2}, {'c': tuple(HC + (0, -1.4, 0.2)), 'w': 5.0, 'h': 1.8, 'e': 2.4},
                          {'c': tuple(HC + (0, -5.0, -0.2)), 'w': 4.4, 'h': 1.2, 'e': 2.5}, {'c': tuple(HC + (0, -8.0, -0.6)), 'w': 2.8, 'h': 0.9, 'e': 2.4}],
                n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
HEAD = [low(upper, 'upper', 100, region=('skin', [('mouth', lambda C_, N: N[:, 2] < -0.6)]))]
pouch = tk.loft('pouch', [{'c': tuple(HJ + (0, 0.6, 0.0)), 'w': 4.6, 'ht': 0.8, 'hb': 1.4, 'e': 2.2}, {'c': tuple(HJ + (0, -2.6, 0.0)), 'w': 6.8, 'ht': 0.8, 'hb': 3.4, 'e': 2.3},
                          {'c': tuple(HJ + (0, -5.6, 0.3)), 'w': 6.0, 'ht': 0.7, 'hb': 2.8, 'e': 2.4}, {'c': tuple(HJ + (0, -8.0, 0.6)), 'w': 3.4, 'ht': 0.6, 'hb': 1.0, 'e': 2.4}],
                n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
JAW = low(pouch, 'pouch', 110, region=('belly', [('mouth', lambda C_, N: N[:, 2] > 0.6)]))
puff = tk.lathe('puff', [(0, -1.0), (0.6, -0.8), (0.95, -0.2), (0.9, 0.4), (0.5, 0.85), (0, 0.95)], n=10, centre=tuple(HJ + (0, -4.6, 0.8)))
PUFF = low(puff, 'puff', 30, lo=1, hi=1, region='balb')

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('body', tk.join([e[0] for e in EEL] + [b[0] for b in BAL], 'body'), [e[1] for e in EEL] + [b[1] for b in BAL], bone='body')
F.part('tip', TIPB[0], [TIPB[1]], bone='body', kind='led')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
F.part('jaw', JAW[0], [JAW[1]], bone='jaw')
F.part('puff', PUFF[0], [PUFF[1]], bone='puff', kind='gloss')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0.4, 2.6, SZ + 1.0), parent='root')
    R.bone('head', tuple(HC + (0, 1.6, -1.0)), parent='body')
    R.bone('jaw', tuple(HJ), parent='head')
    R.bone('puff', tuple(HJ + (0, -4.6, 0.8)), parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'jaw', 'puff']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-14 the jaw drops wide; 10-30 a balloon blown up big in the mouth (the head lifts with the effort); 30-52 it
        # shows it off; 52-58 gulp: the balloon is gone and the jaw snaps shut; 64-76 a satisfied nod
        k('jaw', 4)
        k('jaw', 14, rot=('X', 36), ease='BACK')
        k('jaw', 52, rot=('X', 36))
        k('jaw', 58, ease='BOUNCE')
        k('puff', 10)
        k('puff', 30, move=(0, -4.6, 0.6), scale=3.2)
        k('puff', 50, move=(0, -4.6, 0.6), scale=3.2)
        k('puff', 55, move=(0, 0.4, 0.0), scale=0.6)
        k('puff', 58)
        k('head', 8)
        k('head', 26, rot=('X', -12))
        k('head', 52, rot=('X', -12))
        k('head', 58)
        k('head', 66, rot=('X', 10))
        k('head', 74)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ya.paint_seabed(P, pt, sh)
    # the eel: velvet black-brown, a slate belly, the inside of the mouth dark plum; the tail tip glowing pink
    P.fill('skin', pt.ramp('#3a3038', 7, shift=0.06, light=0.5), tone=sh, base=0.15)
    sk = P.region('skin')
    P.shift(sk & (np.abs(np.sin(X * 1.6 + Y * 1.3 + Z * 0.9)) > 0.96), 1)
    P.fill('belly', pt.ramp('#5a5462', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('mouth', pt.ramp('#6a2a3a', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('fin', pt.ramp('#5a5060', 5), tone=sh, base=0.1)
    P.fill('glow', pt.ramp('#ffa8d0', 5, shift=0.04), tone=sh * 0.4, base=0.25, brush=False)
    P.fill('balr', pt.ramp('#e0443a', 6, shift=0.06), tone=sh, base=0.15, brush='gloss')
    P.fill('baly', pt.ramp('#f2c230', 6, shift=0.06), tone=sh, base=0.15, brush='gloss')
    P.fill('balb', pt.ramp('#5aa8e0', 6, shift=0.06), tone=sh, base=0.15, brush='gloss')
    P.fill('string', pt.ramp('#efe8d8', 4), tone=sh, base=0.2, brush=False)
    # the face: tiny pale dots close together right at the snout's tip, a little blush; the jaw is the grin
    hd = sk & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -8.6, 0.0)), axis=(0, -1, 0.5), where=hd, seed=701, ink='#efe4c8')
    fc.eyes('dot', spread=1.6, size=0.32, dy=0.3, uneven=0.2)
    fc.blush(spread=3.6, dy=-0.2, rx=0.7, ry=0.4, col='#c87a8a')
    P.lines(['balr', 'baly', 'mouth'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('head', 'body'), ('jaw', 'head'), ('puff', 'head'), ('puff', 'jaw'), ('body', 'base'), ('jaw', 'body'),
                                                              ('tip', 'body')]),
    cams=[((40, -52, 40), (0, -1, 13)), ((-40, 48, 38), (0, 2, 13))], fold=(0, 14, 30, 56))
