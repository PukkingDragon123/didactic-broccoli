"""かがみジシ Mirror Lion: the lion spirit of the lion dance (series kabuki, secret; concepts_C.md): a white lion-dog
with red kumadori, gold curls for brows and a long white mane flowing down his back, in a gold brocade costume with red
peonies over red trousers, a peony sprig raised in one paw.

Gimmick: kegurui, the lion's mane-whirl: he crouches, the mane lifts and streams out behind him, whirls a full circle
round his head, and settles as he roars.

    tools/blender.sh art/blender/toys/kabuki/jishi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '..', 'kaden', '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('kabuki', 'jishi')

HC = (0, -1.2, 33.0)          # the head's centre
NECK = (0, 0.0, 26.4)
MANE_P = (0, 4.4, 39.0)       # the mane's root (it lifts and whirls round from here)

# ------------------------------------------------------------------ legs in a wide stance (red trousers), the gold costume, the sleeves
LEGS = []
for sx, fy in ((-1, -0.6), (1, 0.4)):
    hip = np.array((sx * 4.2, 0.4, 11.0))
    knee = np.array((sx * 7.6, fy - 1.0, 5.6))
    ank = np.array((sx * 8.4, fy, 1.8))
    lg = tk.tube('leg', [tuple(hip), tuple(knee), tuple(ank)], [4.2, 3.6, 2.6], n=8)
    ft = tk.loft('foot', [{'c': tuple(ank + (0, 3.6, -0.8)), 'w': 4.6, 'h': 1.2, 'e': 2.6}, {'c': tuple(ank + (0, -4.4, -0.9)), 'w': 5.2, 'h': 1.1, 'e': 2.6}],
                 n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
    LEGS += [cx.low(lg, 'leg', 50, lo=1, hi=1, region='trousers'), cx.low(ft, 'foot', 24, lo=1, hi=1, region='tabi')]
robe = tk.loft('robe', [{'c': (0, 0.4, 9.0), 'w': 22.0, 'ht': 8.0, 'hb': 8.6, 'e': 2.6},
                        {'c': (0, 0.2, 14.6), 'w': 18.6, 'ht': 7.2, 'hb': 7.4, 'e': 2.5},
                        {'c': (0, 0.0, 21.0), 'w': 20.4, 'ht': 7.2, 'hb': 7.4, 'e': 2.6},
                        {'c': (0, 0.2, 26.6), 'w': 14.6, 'ht': 5.4, 'hb': 5.4, 'e': 2.3}], n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.4)


def sc_robe(h):
    def f(V, N):
        col = 0.35 * tk.smoothstep(0.55, 0.0, np.abs(V[:, 0] + 0.55 * (V[:, 2] - 25.0))) * (N[:, 1] < -0.4) * (V[:, 2] > 15.6)
        obi = 0.45 * tk.smoothstep(0.6, 0.2, np.abs(V[:, 2] - 15.4) - 1.4)
        return col + obi
    tk.push(h, f)


robe_lo, robe_hi = cx.low(robe, 'robe', 220, lo=1, hi=3, sculpt=sc_robe, region=('brocade', [('obi', lambda C, N: np.abs(C[:, 2] - 15.4) < 1.9)]))
ARMS = []
# the peony paw raised, the other on the hip
for sx, el, pw in ((-1, (-13.6, -3.0, 20.0), (-9.6, -9.6, 22.0)), (1, (14.4, 1.4, 19.0), (10.8, -4.0, 15.6))):
    s_ = np.array((sx * 8.6, 0.2, 23.6))
    el, pw = np.array(el), np.array(pw)
    a = tk.tube('arm', [tuple(s_), tuple(el), tuple(pw)], [3.2, 2.9, 2.5], n=8)
    paw = tk.lathe('paw', [(0, -1.7), (1.8, -1.3), (2.2, 0.0), (1.8, 1.3), (0, 1.7)], n=10, centre=tuple(pw + (0, -0.8, 0.2)))
    slv = tk.loft('sleeve', [{'c': tuple(s_ + (sx * 2.0, -0.6, -1.0)), 'w': 3.2, 'h': 4.6, 'e': 3.0},
                             {'c': tuple(el + (0, 0, -4.4)), 'w': 3.4, 'h': 6.8, 'e': 3.4},
                             {'c': tuple(el + (sx * 0.6, 0.4, -9.0)), 'w': 3.0, 'h': 6.0, 'e': 3.4}], n=12, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
    ARMS += [cx.low(a, 'arm', 40, lo=1, hi=1, region='brocade'), cx.low(paw, 'paw', 24, lo=0, hi=1, region='white'),
             cx.low(slv, 'sleeve', 70, lo=1, hi=2, region='brocade')]
stem = tk.tube('stem', [(-9.6, -11.0, 20.6), (-10.4, -12.4, 25.0), (-11.6, -13.4, 28.4)], [0.5, 0.45, 0.4], n=6)
peony = tk.lathe('peony', [(0, -1.2), (2.6, -0.8), (3.4, 0.6), (2.6, 1.8), (1.2, 2.4), (0, 2.2)], n=12, centre=(-11.8, -13.6, 29.4))


def sc_peony(h):
    def f(V, N):  # ruffled petals
        a = np.arctan2(V[:, 1] + 13.6, V[:, 0] + 11.8)
        return 0.35 * np.abs(np.sin(a * 5 + V[:, 2] * 1.2)) - 0.15
    tk.push(h, f)


leaf = tk.slab('leaf', [(0.0, 0.0), (1.6, 1.2), (2.4, 3.4), (1.4, 5.0), (0.0, 4.0), (-0.6, 2.0)], 0.5, plane='XZ', at=0.0, bevel=0.2, segs=1)
tk.rotate(leaf, 50, 'Y')
tk.move(leaf, (-10.6, -12.6, 24.0))
ARMS += [cx.low(stem, 'stem', 16, lo=0, hi=1, region='leaf'), cx.low(peony, 'peony', 40, lo=0, hi=2, sculpt=sc_peony, region='peony'),
         cx.low(leaf, 'leaf', 16, lo=0, hi=1, region='leaf')]

# ------------------------------------------------------------------ the lion's head: gold curls for brows, a big nose, the roar; and the long mane
head = tk.loft('head', [{'c': (0, HC[1] + 4.8, HC[2] + 0.4), 'w': 11.0, 'h': 5.4, 'e': 2.2}, {'c': (0, HC[1] + 1.8, HC[2] + 0.4), 'w': 17.0, 'h': 8.0, 'e': 2.4},
                        {'c': (0, HC[1] - 2.2, HC[2]), 'w': 16.8, 'h': 7.8, 'e': 2.4}, {'c': (0, HC[1] - 5.6, HC[2] - 0.8), 'w': 12.0, 'h': 5.6, 'e': 2.3}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)


def sc_head(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            for k in range(3):   # the curly brows: three gold curls each side
                d += tk.bump(V, (sx * (2.0 + 2.1 * k), HC[1] - 6.0 + 0.8 * k, HC[2] + 3.6 - 0.4 * k), 1.5, 0.9)
            d += tk.bump(V, (sx * 4.4, HC[1] - 6.4, HC[2] - 2.6), 2.4, 0.7)   # the cheeks
        d += tk.bump(V, (0, HC[1] - 7.6, HC[2] - 0.6), 2.6, 1.2)   # the big nose
        return d
    tk.push(h, f)


head_lo, head_hi = cx.low(head, 'head', 200, lo=1, hi=3, sculpt=sc_head, region='white')
ears = []
for sx in (1, -1):
    e = tk.lathe('ear', [(0, -0.6), (2.0, -0.4), (2.2, 0.8), (1.2, 2.4), (0, 2.8)], n=8)
    tk.scale(e, (1.0, 0.55, 1.0))
    tk.rotate(e, -sx * 60, 'Y')
    tk.move(e, (sx * 7.4, HC[1] + 1.0, HC[2] + 4.0))
    ears.append(cx.low(e, 'ear', 20, lo=0, hi=1, region='gold'))
mane = tk.loft('mane', [{'c': (0, HC[1] - 1.0, HC[2] + 7.6), 'w': 14.0, 'h': 2.6, 'e': 2.2},
                        {'c': (0, HC[1] + 4.6, HC[2] + 6.6), 'w': 17.6, 'h': 3.6, 'e': 2.3},
                        {'c': (0, HC[1] + 8.8, HC[2] + 1.0), 'w': 18.6, 'h': 3.6, 'e': 2.4},
                        {'c': (0, HC[1] + 10.4, HC[2] - 7.0), 'w': 17.0, 'h': 3.2, 'e': 2.4},
                        {'c': (0, HC[1] + 11.2, HC[2] - 15.0), 'w': 14.0, 'h': 2.6, 'e': 2.4},
                        {'c': (0, HC[1] + 12.4, HC[2] - 21.0), 'w': 9.0, 'h': 1.8, 'e': 2.2}], n=14, up=(0, -1, 0), cap0='round', cap1='round', capd=1.4)


def sc_mane(h):
    def f(V, N):  # long locks of white hair
        return 0.45 * np.abs(np.sin(V[:, 0] * 1.3 + 0.08 * V[:, 2])) ** 2 - 0.22
    tk.push(h, f)


mane_lo, mane_hi = cx.low(mane, 'mane', 150, lo=1, hi=2, sculpt=sc_mane, region='mane')
# the curly ruff framing the face (what makes him a lion)
ruff = tk.lathe('ruff', [(7.0, -1.6), (9.6, -1.4), (10.4, 0.2), (9.4, 1.6), (7.2, 1.4), (6.6, 0.0)], n=22, axis='Y', centre=(0, HC[1] - 1.6, HC[2] - 0.6))


def sc_ruff(h):
    def f(V, N):  # tight curls all round
        a = np.arctan2(V[:, 2] - (HC[2] - 0.6), V[:, 0])
        return 0.55 * np.abs(np.sin(a * 9)) ** 1.5 * np.abs(np.sin(V[:, 1] * 2.2 + a * 3)) - 0.2
    tk.push(h, f)


ruff_lo, ruff_hi = cx.low(ruff, 'ruff', 110, lo=0, hi=3, sculpt=sc_ruff, region='ruff')

# ------------------------------------------------------------------ parts
F.part('body', tk.join([robe_lo] + [l[0] for l in LEGS], 'body'), [robe_hi] + [l[1] for l in LEGS], bone='body')
F.part('arms', tk.join([a_[0] for a_ in ARMS], 'arms'), [a_[1] for a_ in ARMS], bone='body')
F.part('head', tk.join([head_lo, ruff_lo] + [e[0] for e in ears], 'head'), [head_hi, ruff_hi] + [e[1] for e in ears], bone='head')
F.part('mane', mane_lo, [mane_hi], bone='mane')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 10.0), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('whirl', MANE_P, parent='head')
    R.bone('mane', MANE_P, parent='whirl')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'head', 'whirl', 'mane']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # he crouches; the mane lifts and streams out behind him
        k('body', 3)
        k('body', 9, move=(0, 0, -1.2), scale=(1.02, 1.02, 0.97))
        k('mane', 4)
        k('mane', 12, rot=('X', 78))
        k('mane', 58, rot=('X', 78))
        k('mane', 66)
        # kegurui: the mane whirls a full circle round his head (the head circling with it)
        k('whirl', 12)
        for i in range(1, 9):
            k('whirl', 12 + i * 4, rot=('Z', 45 * i), ease='LINEAR')
        k('whirl', 46, rot=('Z', 360))
        k('head', 12)
        for i in range(1, 9):
            a = 2 * math.pi * i / 8
            k('head', 12 + i * 4, rot=[('X', 6 * math.cos(a)), ('Y', 6 * math.sin(a))], ease='LINEAR')
        # the roar, settled
        k('body', 44, move=(0, 0, -1.2))
        k('body', 50, move=(0, 0, 0.6), ease='BACK')
        k('body', 56)
        k('head', 50, rot=('X', -8))
        k('head', 55, rot=('X', -8))
        k('head', 59)
        for b in allb:
            k(b, 70)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    # the gold brocade: gold with red peony roundels and a fine key pattern; red trousers; a white obi
    P.fill('brocade', pt.ramp('#d8a83a', 7, dark=0.6, shift=0.06), tone=free, base=0.1)
    bm = P.region('brocade')
    P.tint(bm & (np.abs(np.mod(X + Z, 1.6) - 0.8) < 0.15), pt.ramp('#a87a2a', 6, shift=0.06), free)
    for cx_, cz in ((-4.6, 20.0), (4.4, 23.0), (0.6, 11.0), (-6.4, 9.6), (6.6, 12.6), (-14.0, 19.0), (14.6, 15.0)):
        rr = np.hypot(X - cx_, Z - cz)
        P.flat(bm & (rr < 1.8) & (on[:, :, 1] < 0.6), '#c8303a')
        P.flat(bm & (rr < 0.6) & (on[:, :, 1] < 0.6), '#f2d27a')
    P.fill('obi', pt.ramp('#f2ece2', 6, shift=0.05), tone=free, base=0.1)
    P.fill('trousers', pt.ramp('#c8303a', 7, shift=0.06), tone=free, base=0.08)
    P.fill('tabi', pt.ramp('#f2ece2', 6, shift=0.05), tone=free, base=0.1)
    P.fill('white', pt.ramp('#f6f0e6', 7, shift=0.05), tone=free, base=0.08)
    P.fill('gold', pt.ramp('#d8a83a', 6, dark=0.6, shift=0.06), tone=free * 1.2, base=0.15)
    P.fill('mane', pt.ramp('#f4f0e8', 7, shift=0.05), tone=free, base=0.12)
    P.fill('ruff', pt.ramp('#efd9a0', 7, shift=0.06), tone=free, base=0.1)
    P.tint(P.region('ruff') & (np.abs(np.sin(np.arctan2(Z - (HC[2] - 0.6), X) * 9)) > 0.8), pt.ramp('#d8a83a', 6, shift=0.06), free)
    P.tint(P.region('mane') & (np.abs(np.sin(X * 1.3 + 0.08 * Z)) < 0.3), pt.ramp('#d2ccc2', 6, shift=0.05), free)
    P.fill('peony', pt.ramp('#e8506a', 7, shift=0.06), tone=free, base=0.1)
    P.fill('leaf', pt.ramp('#4a8a4a', 6, shift=0.06), tone=free, base=0.1)
    # the gold curls of the brows, painted over their sculpted bumps
    hd = P.region('white') & (P.part == PI['head'])
    for sx in (1, -1):
        for k in range(3):
            c = np.array((sx * (2.0 + 2.1 * k), HC[1] - 6.0 + 0.8 * k, HC[2] + 3.6 - 0.4 * k))
            P.tint(hd & (np.linalg.norm(P.pos - c, axis=2) < 1.4), pt.ramp('#d8a83a', 6, dark=0.6, shift=0.06), free)
    # kumadori in red, the lion's roar: dots under the gold brows, the big nose, an open shout with fangs
    fk = face.Face(P, c=(0, HC[1] - 7.6, HC[2] + 0.4), axis=(0, -1, 0.05), where=hd, seed=161, ink='#c8303a')
    for sx in (-1, 1):
        fk.stroke([(sx * 3.4, 1.0), (sx * 5.6, 1.8), (sx * 7.4, 3.8)], weight=0.5)
        fk.stroke([(sx * 4.0, -2.8), (sx * 6.4, -2.4)], weight=0.45)
    fc = face.Face(P, c=(0, HC[1] - 7.6, HC[2] + 0.4), axis=(0, -1, 0.05), where=hd, seed=162)
    fc.eyes('dot', spread=6.4, size=0.72, dy=1.4)
    fc.nose('button', 0.0, -0.8, size=1.2, col='#2a2226')
    fc.mouth('shout', w=4.6, dy=-3.4)
    P.lines(['brocade'], ['obi', 'white', 'trousers'], step=1)
    P.lines(['white'], ['mane', 'gold', 'ruff'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 71), skip=[('arms', 'body'), ('head', 'body'), ('mane', 'head')]),
       cams=[((62, -78, 54), (0, -2, 22)), ((-60, 68, 48), (0, 0, 22))], fold=(0, 14, 26, 38))
