"""ゆめくいバク Dream-Eater Baku (secret): the chimera that eats bad dreams, as a squishy (series punipuni,
concepts_D.md): a plump lavender tapir sitting up, a trunk, small tusks, a curly cream mane, tiger-striped legs and a
lion's tail tuft; sleepy and very pleased with itself.

Gimmick: the squeeze: it squashes and spreads, the trunk curls up and puffs out a dream bubble mid-squish, and it
rises slowly back.

    tools/blender.sh art/blender/toys/punipuni/baku.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _puni as pu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('punipuni', 'baku')
low = pu.low
HC = np.array((0.0, -2.6, 17.0))      # the head
TR = HC + (0, -4.4, -1.0)             # the trunk's root

# ------------------------------------------------------------------ the body sitting up, fat hind legs forward, forelegs, the tail tuft
body = tk.loft('body', [{'c': (0, 0.6, 1.2), 'w': 12.4, 'h': 5.2, 'e': 2.2}, {'c': (0, 0.4, 5.2), 'w': 13.6, 'h': 5.8, 'e': 2.2},
                        {'c': (0, 0.0, 9.6), 'w': 12.0, 'h': 5.0, 'e': 2.2}, {'c': (0, -0.6, 13.0), 'w': 8.6, 'h': 4.0, 'e': 2.2}],
               n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.2)
BODY = [low(body, 'body', 360, sculpt=pu.lumps(0.15, 1.2, 10), region=('skin', [('belly', lambda C, N: (N[:, 1] < -0.6) & (C[:, 2] < 11.0))]))]
tk.flat_bottom(BODY[0][0], 0.6)
for sx in (1, -1):
    hl = tk.tube('hleg', [(sx * 4.6, 0.6, 2.8), (sx * 5.4, -4.2, 2.2), (sx * 5.0, -7.0, 1.6)], [3.0, 2.6, 2.2], n=8, cap1='round')
    fl = tk.tube('fleg', [(sx * 5.0, -2.6, 11.0), (sx * 5.0, -5.4, 8.2), (sx * 3.2, -6.0, 6.6)], [1.9, 1.7, 1.6], n=8, cap1='round')
    BODY += [low(hl, 'hleg', 70, region='leg'), low(fl, 'fleg', 50, region='leg')]
    for t in range(3):   # three blunt toes on each hind foot
        to = tk.lathe('toe', [(0, -0.4), (0.7, -0.3), (0.8, 0.1), (0, 0.5)], n=6, centre=(sx * 5.0 + (t - 1) * 1.0, -9.0, 0.8))
        BODY.append(low(to, 'toe', 10, lo=0, hi=1, region='hoof'))
tail = tk.tube('tail', [(0, 5.6, 2.4), (0.8, 8.4, 3.0), (1.2, 9.6, 5.2)], [0.6, 0.5, 0.4], n=5)
tuft = tk.lathe('tuft', [(0, -1.0), (1.2, -0.6), (1.5, 0.3), (0.9, 1.1), (0, 1.4)], n=8, centre=(1.3, 9.8, 6.4))
BODY += [low(tail, 'tail', 16, lo=1, hi=1, region='skin'), low(tuft, 'tuft', 24, lo=1, hi=1, sculpt=pu.lumps(0.2, 3.0, 1), region='mane')]
# ------------------------------------------------------------------ the head: round, small ears, tusks, a curly mane round the neck
head = tk.lathe('head', [(0, -4.6), (3.6, -3.8), (5.0, -0.8), (4.8, 1.6), (3.4, 3.8), (0, 4.4)], n=16, centre=tuple(HC))
tk.scale(head, (1.06, 1.0, 0.92), pivot=tuple(HC))
BODY.append(low(head, 'head', 200, region='skin'))
for sx in (1, -1):
    ec = HC + (sx * 3.6, 1.0, 3.4)
    ear = tk.lathe('ear', [(0, -0.5), (1.5, -0.3), (1.6, 0.3), (0, 0.5)], n=10, axis='Y', centre=tuple(ec))
    tk.rotate(ear, -sx * 30, 'Y', pivot=tuple(ec))
    tusk = tk.tube('tusk', [tuple(HC + (sx * 1.6, -4.0, -2.4)), tuple(HC + (sx * 2.0, -4.8, -3.2)), tuple(HC + (sx * 2.6, -5.0, -2.6))], [0.5, 0.4, 0.1], n=5, cap1='point')
    BODY += [low(ear, 'ear', 20, lo=1, hi=1, region='skin'), low(tusk, 'tusk', 12, lo=0, hi=1, region='tusk')]
for i in range(9):   # the mane: curls round the back of the head and neck
    a = math.radians(-30 + i * 30)
    c = HC + (5.0 * math.sin(a), 1.4 + 3.6 * math.cos(a) * 0.6 + 1.2, -2.2 + 0.6 * math.cos(a * 2))
    cu = tk.lathe('curl', [(0, -1.4), (1.4, -1.0), (1.8, 0.0), (1.3, 1.1), (0, 1.5)], n=8, centre=tuple(c))
    BODY.append(low(cu, 'curl', 22, lo=1, hi=1, sculpt=pu.lumps(0.2, 2.6, i), region='mane'))
# ------------------------------------------------------------------ the trunk (rigged: it curls), and the dream bubble folded in its tip
trunk = tk.tube('trunk', [tuple(TR + (0, 1.0, 0.4)), tuple(TR + (0, -1.4, -1.0)), tuple(TR + (0, -2.2, -3.0)), tuple(TR + (0, -1.8, -4.6))], [1.9, 1.6, 1.3, 1.1], n=10, cap1='flat')
TRK = low(trunk, 'trunk', 70, region='skin')
DT = TR + (0, -1.8, -4.2)
dream = tk.lathe('dream', [(0, -1.0), (0.9, -0.8), (1.2, 0.0), (1.0, 0.7), (0, 1.0)], n=10, centre=tuple(DT))
tk.push(dream, lambda V, N: 0.12 * np.sin(V[:, 0] * 6 + V[:, 2] * 5))
DRM = low(dream, 'dream', 40, lo=1, hi=1, sculpt=pu.lumps(0.1, 5.0, 2), region='dream')

F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('trunk', TRK[0], [TRK[1]], bone='trunk')
F.part('dream', DRM[0], [DRM[1]], bone='dream', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 0.3), parent='root')
    R.bone('trunk', tuple(TR + (0, 0.6, 0.2)), parent='body')
    R.bone('dream', tuple(DT), parent='trunk')
    for p in F.parts:
        R.attach(p.low, p.bone)

    def pop(k, f0, f1):   # the trunk curls up and a dream bubble puffs out, floats up, wobbles; back in at the end
        k('trunk', f0 - 4)
        k('trunk', f0 + 4, rot=('X', -70), ease='BACK')
        k('trunk', f1 + 14, rot=('X', -70))
        k('trunk', f1 + 30)
        k('dream', f0)
        k('dream', f0 + 8, move=(0, -2.6, 2.6), scale=3.6, ease='BACK')
        k('dream', f1 + 4, move=(0, -2.8, 3.4), scale=(3.8, 3.4, 3.8))
        k('dream', f1 + 14, move=(0, -2.6, 2.6), scale=3.6)
        k('dream', f1 + 26)
    pu.squeeze(R, 'body', ['root', 'trunk', 'dream'], pop=pop)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sk = pu.sugar(P, pt, sh, 'skin', '#c6b0ee', seed=51)
    pu.sugar(P, pt, sh, 'belly', '#ebe0fa', seed=52)
    lg = pu.sugar(P, pt, sh, 'leg', '#c6b0ee', seed=53)
    P.fill(lg & (np.abs(np.mod(Y * 0.9 + Z * 0.7 + 0.4 * np.sin(X * 2.0), 2.4) - 1.2) < 0.36), pt.ramp('#6a4a9a', 5, shift=0.05), tone=sh, base=0.05)  # tiger stripes
    pu.sugar(P, pt, sh, 'mane', '#f6ead4', seed=54)
    P.fill('hoof', pt.ramp('#6a4a9a', 4), tone=sh, base=0.1)
    P.fill('tusk', pt.ramp('#f6f0e2', 4), tone=sh, base=0.2)
    P.fill('dream', pt.ramp('#ffc8e4', 5, shift=0.05), tone=sh, base=0.2, brush='gloss')
    P.fill(P.region('dream') & (np.abs(np.mod(X + Z, 1.4) - 0.7) < 0.2), pt.ramp('#bfe8ff', 4), tone=sh, base=0.2, brush=False)
    fc = face.Face(P, c=tuple(HC + (0, -4.8, 1.0)), axis=(0, -1, 0.15), where=sk & (P.part == PI['body']), seed=841)
    fc.eyes('lid', spread=5.8, size=0.85, dy=0.6, catch=False)
    fc.blush(spread=7.6, dy=-1.2, rx=1.3, ry=0.7)
    fm = face.Face(P, c=tuple(HC + (0, -4.6, -2.6)), axis=(0, -1, 0.0), where=sk & (P.part == PI['body']), seed=842)
    fm.mouth('upturn', w=2.0, dy=0.0, weight=0.32)
    P.lines(['mane', 'tusk', 'dream'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('trunk', 'body'), ('dream', 'trunk'), ('dream', 'body')]),
    cams=[((40, -52, 36), (0, 0, 11)), ((-40, 48, 34), (0, 2, 11))], fold=(0, 12, 24, 60))
