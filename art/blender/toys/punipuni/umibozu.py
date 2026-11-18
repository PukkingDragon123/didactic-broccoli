"""うみぼうず Umibōzu: the sea monk, the huge bald shape that rises out of a calm sea at night and sinks boats, as a
squishy (series punipuni, concepts_D.md): a big sulking dark-teal dome rising out of its own curl of neon wave, two
stubby hands on the water, heavy brows.

Gimmick: the squeeze: it sinks down into its wave and spreads, a spout of water pops off the top of its head
mid-squish, and it rises slowly back.

    tools/blender.sh art/blender/toys/punipuni/umibozu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('punipuni', 'umibozu')
low = pu.low
WZ = 3.0                              # the water's surface
FC = np.array((0.0, -8.0, 15.0))     # the face
TOP = 22.4

# ------------------------------------------------------------------ the wave it rises from: a flat swell and a curling crest behind
sea = tk.lathe('sea', [(0, 0.0), (12.6, 0.0), (13.2, 1.0), (12.4, WZ - 0.4), (10.0, WZ), (0, WZ + 0.2)], n=20)
tk.scale(sea, (1.0, 0.92, 1.0))


def sc_sea(h):
    def f(V, N):   # swell
        a = np.arctan2(V[:, 1], V[:, 0])
        return (0.4 * np.sin(a * 5 + np.hypot(V[:, 0], V[:, 1]) * 0.6)) * (N[:, 2] > 0.5)
    tk.push(h, f)


crest = tk.tube('crest', [(-11.0, 5.0, 1.6), (-8.0, 8.6, 3.6), (-3.6, 10.4, 6.6), (0.6, 10.0, 9.2), (3.2, 8.2, 10.0), (4.0, 6.6, 8.6)],
                [2.0, 2.4, 2.4, 2.0, 1.4, 0.6], n=8, squash=1.3, cap1='point')
BASE = [low(sea, 'sea', 160, lo=1, hi=2, sculpt=sc_sea, region=('water', [('foam', lambda C, N: np.hypot(C[:, 0], C[:, 1]) > 11.6)])),
        low(crest, 'crest', 110, region=('water', [('foam', lambda C, N: (C[:, 2] > 6.4) & (N[:, 1] < 0.2))]))]
tk.flat_bottom(BASE[0][0], 0.4)
# ------------------------------------------------------------------ the sea monk: a tall soft dome, two stubby hands on the water
dome = tk.lathe('dome', [(0, WZ - 1.0), (8.4, WZ - 1.0), (8.8, WZ + 2.0), (9.0, WZ + 7.0), (8.2, WZ + 12.0), (6.4, WZ + 16.0), (3.6, TOP - 0.8), (0, TOP)], n=20)
tk.scale(dome, (1.0, 0.9, 1.0))
BODY = [low(dome, 'dome', 480, sculpt=pu.lumps(0.2, 1.1, 6), region='skin')]
for sx in (1, -1):
    hd = tk.lathe('hand', [(0, -0.8), (2.0, -0.6), (2.4, 0.2), (1.8, 0.9), (0, 1.0)], n=10, centre=(sx * 9.6, -3.0, WZ + 0.6))
    tk.scale(hd, (1.2, 1.4, 0.8), pivot=(sx * 9.6, -3.0, WZ + 0.6))
    BODY.append(low(hd, 'hand', 40, lo=1, hi=1, region='skin'))
spout = []
for i in range(5):   # the spout of water off its head: a jet and four droplet arcs
    a = math.radians(i * 72)
    if i == 0:
        spout.append(tk.tube('jet', [(0, 0, TOP - 7.0), (0, 0, TOP - 3.0), (0, 0, TOP - 0.8)], [0.9, 0.8, 0.5], n=8, cap1='round'))
    else:
        d = np.array((math.cos(a), math.sin(a), 0.0))
        spout.append(tk.tube('arc', [tuple(d * 0.4 + (0, 0, TOP - 1.4)), tuple(d * 1.4 + (0, 0, TOP - 1.0)), tuple(d * 2.0 + (0, 0, TOP - 1.8))], [0.45, 0.4, 0.3], n=6, cap1='round'))
SP = low(tk.join(spout, 'spout'), 'spout', 90, lo=1, hi=1, region='jet')

F.part('base', tk.join([b[0] for b in BASE], 'base'), [b[1] for b in BASE], bone='root')
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('spout', SP[0], [SP[1]], bone='spout', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, WZ - 1.0), parent='root')
    R.bone('spout', (0, 0, TOP - 7.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)

    def pop(k, f0, f1):   # the spout pops up out of its head and stays bobbing while it is squished
        k('spout', f0 - 2)
        k('spout', f0 + 4, move=(0, 0, 5.4), scale=(1.4, 1.5, 1.4), ease='BACK')
        k('spout', f0 + 10, move=(0, 0, 4.8), scale=(1.4, 1.5, 1.4))
        k('spout', f1, move=(0, 0, 5.4), scale=(1.4, 1.5, 1.4))
        k('spout', f1 + 16)
    pu.squeeze(R, 'body', ['root', 'spout'], pop=pop)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sk = pu.sugar(P, pt, sh, 'skin', '#3aa2b6', seed=31)
    pu.sugar(P, pt, sh, 'water', '#3ec8d8', seed=32)
    pu.sugar(P, pt, sh, 'foam', '#d8fff8', seed=33)
    wt = P.region('water')
    P.shift(wt & (np.abs(np.sin(np.hypot(X, Y) * 1.2 + np.arctan2(Y, X) * 2)) > 0.9), 1)     # ripples
    P.fill('jet', pt.ramp('#bff4ff', 5, shift=0.04), tone=sh, base=0.25, brush='gloss')
    # the face: on the dark dome, light ink: sulky half-moon eyes under heavy brows, a little downturned mouth
    fc = face.Face(P, c=tuple(FC), axis=(0, -1, 0.1), where=sk & (P.part == PI['body']), seed=821)
    fc.eyes('halfmoon', spread=6.4, size=0.85, dy=0.6, catch=False)
    fc.brows('angry', spread=6.8, dy=2.0, w=2.2, weight=0.36)
    fc.mouth('frown', w=2.6, dy=-2.4, weight=0.38)
    fc.blush(spread=8.4, dy=-1.2, rx=1.4, ry=0.7)
    P.lines(['foam', 'jet'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('spout', 'body'), ('body', 'base')]),
    cams=[((40, -52, 36), (0, 0, 11)), ((-40, 48, 34), (0, 2, 11))], fold=(0, 12, 24, 60))
