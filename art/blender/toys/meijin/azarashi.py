"""メンコアザラシ Menko Seal: the menko champion, a spotted seal pup on its belly in a headband (series meijin,
concepts_C.md), one flipper raised with its best card, the rival's card lying on the ground in front of it.

Gimmick: the flipper winds up, SLAP, the rival's card flips over (and lands face down: it's his now), the seal's
belly wobbles and it claps its flippers.

    tools/blender.sh art/blender/toys/meijin/azarashi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('meijin', 'azarashi')

HC = (0, -7.6, 15.6)            # the head's centre (raised, looking ahead)
SH = (-7.4, -4.0, 9.2)          # the slapping flipper's shoulder
CARD_EDGE = (-9.0, -19.0, 0.0)  # the rival card's hinge edge (it flips over this)

# ------------------------------------------------------------------ the seal: a plump body on its belly, the tail flippers
body = tk.loft('body', [{'c': (0, -5.4, 9.6), 'w': 13.0, 'ht': 6.0, 'hb': 5.6, 'e': 2.2},
                        {'c': (0, -1.0, 7.4), 'w': 18.6, 'ht': 7.4, 'hb': 6.6, 'e': 2.3},
                        {'c': (0, 5.6, 5.6), 'w': 18.0, 'ht': 6.2, 'hb': 5.6, 'e': 2.3},
                        {'c': (0, 11.6, 3.8), 'w': 12.6, 'ht': 4.0, 'hb': 3.6, 'e': 2.2},
                        {'c': (0, 15.6, 2.8), 'w': 6.4, 'h': 2.2, 'e': 2.2}], n=18, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
tk.deform(body, lambda V: np.stack([V[:, 0], V[:, 1], np.maximum(V[:, 2], 0.2 + 0.0 * V[:, 2])], 1))


def sc_body(h):
    def f(V, N):  # the belly's soft folds where it meets the ground
        return -0.3 * (np.abs(np.sin(V[:, 1] * 0.9)) ** 6) * (N[:, 2] < 0.2) * (V[:, 2] < 4.0)
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 260, lo=1, hi=3, sculpt=sc_body, region='coat')
FLIPS = []
for sx in (1, -1):
    tf = tk.slab('tailf', [(0.0, 0.0), (2.6, 1.0), (4.6, 4.4), (3.4, 5.4), (1.4, 3.4), (0.0, 2.0)], 1.2, plane='XY', at=1.0, bevel=0.45, segs=1)
    if sx < 0:
        tk.scale(tf, (-1, 1, 1))
        tk.fix_normals(tf)
    tk.move(tf, (sx * 0.8, 15.2, 0))
    FLIPS.append(cx.low(tf, 'tailf', 24, lo=1, hi=1, region='coat'))
# the resting front flipper (on the ground) and the slapping one (raised, the card in it)
rest = tk.loft('fl', [{'c': (6.6, -4.0, 7.0), 'w': 3.6, 'h': 2.0, 'e': 2.2}, {'c': (9.4, -6.6, 2.4), 'w': 4.6, 'h': 1.4, 'e': 2.3},
                      {'c': (10.6, -9.6, 0.9), 'w': 3.6, 'h': 0.9, 'e': 2.2}], n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
FLIPS.append(cx.low(rest, 'fl', 40, lo=1, hi=1, region='coat'))
slap = tk.loft('slap', [{'c': SH, 'w': 3.6, 'h': 2.0, 'e': 2.2}, {'c': (-9.6, -6.0, 13.6), 'w': 4.6, 'h': 1.5, 'e': 2.3},
                        {'c': (-10.6, -7.6, 17.0), 'w': 3.6, 'h': 1.0, 'e': 2.2}], n=8, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
card = tk.rbox('mycard', (7.0, 0.5, 9.0), centre=(-11.6, -9.4, 19.0), bevel=0.2, segs=1)
tk.rotate(card, -24, 'X', (-11.6, -9.4, 19.0))
SLAP = [cx.low(slap, 'slap', 40, lo=1, hi=1, region='coat'), cx.low(card, 'mycard', 12, lo=0, hi=1, region='card')]

# ------------------------------------------------------------------ the rival's card on the ground (it flips over its far edge)
rc = tk.rbox('card', (9.0, 7.0, 0.5), centre=(CARD_EDGE[0], CARD_EDGE[1] + 3.5, 0.25), bevel=0.15, segs=1)
rcard = cx.low(rc, 'card', 12, lo=0, hi=1, region=('front', [('back', lambda C, N: N[:, 2] < -0.5)]))

# ------------------------------------------------------------------ the head with its whiskers, the headband
head = tk.loft('head', [{'c': (HC[0], HC[1] + 4.2, HC[2] - 0.6), 'w': 11.6, 'h': 5.6, 'e': 2.2}, {'c': (HC[0], HC[1] + 1.0, HC[2]), 'w': 14.6, 'h': 6.8, 'e': 2.3},
                        {'c': (HC[0], HC[1] - 2.8, HC[2] - 0.4), 'w': 13.0, 'h': 6.0, 'e': 2.3}, {'c': (HC[0], HC[1] - 5.4, HC[2] - 1.4), 'w': 8.4, 'h': 4.0, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)


def sc_head(h):
    def f(V, N):  # the whisker pads
        return sum(tk.bump(V, (sx * 2.2, HC[1] - 6.0, HC[2] - 2.0), 2.4, 0.9) for sx in (1, -1))
    tk.push(h, f)


head_lo, head_hi = cx.low(head, 'head', 180, lo=1, hi=3, sculpt=sc_head, region='coat')
band = tk.lathe('band', [(5.8, -0.7), (6.7, -0.7), (6.8, 0.7), (5.8, 0.7)], n=18, centre=(HC[0], HC[1] + 0.4, HC[2] + 3.0))
tk.rotate(band, -10, 'X', (HC[0], HC[1] + 0.4, HC[2] + 3.0))
bt = tk.tube('knot', [(HC[0] + 4.6, HC[1] + 4.6, HC[2] + 3.4), (HC[0] + 6.0, HC[1] + 6.6, HC[2] + 4.6), (HC[0] + 7.4, HC[1] + 7.6, HC[2] + 3.6)], [0.8, 0.7, 0.5], n=5)
HEADP = [(head_lo, head_hi), cx.low(band, 'band', 40, lo=0, hi=1, region='band'), cx.low(bt, 'knot', 16, lo=0, hi=1, region='band')]

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body_lo] + [f_[0] for f_ in FLIPS] + [h_[0] for h_ in HEADP], 'body'), [body_hi] + [f_[1] for f_ in FLIPS] + [h_[1] for h_ in HEADP], bone='body')
F.part('slap', tk.join([s_[0] for s_ in SLAP], 'slap'), [s_[1] for s_ in SLAP], bone='slap')
F.part('card', rcard[0], [rcard[1]], bone='card')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 0.5), parent='root')
    R.bone('slap', SH, parent='body')
    R.bone('card', CARD_EDGE, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'slap', 'card']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the wind-up... SLAP
        k('slap', 2)
        k('slap', 10, rot=('X', 22))
        k('slap', 14, rot=('X', -36), ease='LINEAR')
        k('slap', 22, rot=('X', -36))
        k('slap', 30)
        k('body', 12)
        k('body', 14, scale=(1.04, 0.98, 0.94))
        k('body', 18, scale=(0.98, 1.01, 1.04))
        k('body', 22, scale=1.0)
        # the rival's card flips over and lands face down
        k('card', 14)
        k('card', 22, rot=('X', 90), move=(0, 0, 4.0))
        k('card', 28, rot=('X', 180), move=(0, 0, 0.5), ease='BOUNCE')
        k('card', 46, rot=('X', 180), move=(0, 0, 0.5))
        k('card', 54, rot=('X', 360), move=(0, 0, 0.0))
        # a clap of the flippers (the slapping flipper waves)
        for i, f in enumerate((32, 36, 40, 44)):
            k('slap', f, rot=('Y', 18 if i % 2 == 0 else -6))
        k('slap', 50)
        k('body', 30)
        k('body', 34, move=(0, 0, 0.8))
        k('body', 38, ease='BOUNCE')
        for b in allb:
            k(b, 60)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    # a spotted seal pup: silver-grey, paler underneath, dark spots
    P.fill('coat', pt.ramp('#b4b8bc', 7, shift=0.06), tone=np.where(P.part == PI['body'], sh, free), base=0.1 - 0.15 * (on[:, :, 2] < -0.3))
    cm = P.region('coat')
    sp = (np.sin(X * 1.7 + Yc * 0.4) * np.sin(Yc * 1.5 - Z * 0.6) * np.sin(Z * 1.3 + X * 0.5) > 0.35) & (Z > 3.0)
    P.tint(cm & sp & (np.hypot(X - HC[0], Yc - HC[1] + 4.0) > 5.5), pt.ramp('#5a5e66', 6, shift=0.06), free)
    P.fill('band', pt.ramp('#f2ece2', 6, shift=0.05), tone=free, base=0.1)
    P.flat(P.region('band') & (np.abs(Yc - (HC[1] - 6.6)) < 0.9), '#c8303a')
    # the menko: his card (a red sun burst behind a printed kabuto) and the rival's (blue, a printed rocket), plain backs
    P.fill('card', pt.ramp('#f2e2b4', 6, shift=0.05), tone=free * 0.5, base=0.15)
    cdm = P.region('card')
    U, V = X + 11.6, Z - 19.0
    P.flat(cdm & (np.abs(np.mod(np.degrees(np.arctan2(V, U)) + 360, 30) - 15) < 6) & (np.hypot(U, V) < 4.0), '#d8402e')
    P.flat(cdm & (np.hypot(U, V + 0.6) < 1.8), '#2a2a2e')
    P.flat(cdm & (np.abs(np.abs(U) - 3.2) < 0.25), '#2a2a2e')
    P.fill('front', pt.ramp('#5a8ac8', 6, shift=0.06), tone=sh * 0.5, base=0.15)
    fm = P.region('front')
    U2, V2 = X - CARD_EDGE[0], Yc - (CARD_EDGE[1] + 3.5)
    P.flat(fm & (np.abs(U2) < 1.0) & (np.abs(V2) < 2.6), '#f2ece2')
    P.flat(fm & (np.abs(U2) < 2.4) & (np.abs(V2 - 2.0) < 0.6), '#d8402e')
    P.flat(fm & ((np.abs(np.abs(U2) - 4.0) < 0.25) | (np.abs(np.abs(V2) - 3.0) < 0.25)), '#f2e2b4')
    P.fill('back', pt.ramp('#d8c8a0', 6, shift=0.05), tone=free * 0.5, base=0.1)
    # the face, drawn on: a determined little seal: dots, a confident brow, the dark nose, a Y mouth, whiskers with dots
    hd = cm & (P.part == PI['body']) & (Yc < HC[1] + 2.0) & (Z > HC[2] - 6.0)
    fc = face.Face(P, c=(HC[0], HC[1] - 5.8, HC[2] + 0.6), axis=(0, -1, 0.15), where=hd, seed=181)
    fc.eyes('big', spread=7.6, size=0.62, dy=0.8)
    fc.brows('angry', spread=7.6, dy=2.8, w=1.8, weight=0.32)
    fn = face.Face(P, c=(HC[0], HC[1] - 7.4, HC[2] - 2.0), axis=(0, -1, 0.1), where=hd, seed=182)
    fn.nose('button', 0.0, 0.7, size=0.9)
    fn.snout_mouth('Y', 0.0, -0.4, w=1.8)
    fn.whiskers(0.0, 0.1, spread=4.8, n=3, length=2.4, dots=True)
    P.lines(['coat'], ['band', 'card'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 61), skip=[('slap', 'body')]),
       cams=[((56, -76, 44), (0, -4, 8)), ((-54, 62, 40), (0, 0, 8))], fold=(0, 10, 16, 26))
