"""ツチノコ Tsuchinoko: the fat cryptid snake of the mountain villages, as a squishy keychain (series punipuni,
concepts_D.md): a beer-belly of a body, a stubby tail curled round, the viper head up with a sly grin; neon lime with a
diamond back.

Gimmick: the squeeze: the belly balloons out, the forked tongue flicks mid-squish, and it rises slowly back.

    tools/blender.sh art/blender/toys/punipuni/tsuchinoko.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _puni as pu  # noqa: E402
import kit  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('punipuni', 'tsuchinoko')
low = pu.low
HC = np.array((0.0, -10.0, 9.6))      # the head

# ------------------------------------------------------------------ the fat body, the stubby tail curled round to the side
RINGS = [((7.8, 5.0, 1.1), 1.2, 0.8), ((7.4, 8.4, 1.3), 2.0, 1.1), ((5.0, 10.0, 1.6), 2.8, 1.4), ((2.6, 9.6, 2.4), 4.4, 2.2), ((0.6, 7.0, 3.8), 9.0, 3.8), ((0.0, 2.6, 5.4), 13.0, 5.4),
         ((0.0, -1.8, 5.6), 12.6, 5.6), ((0.0, -5.4, 6.2), 8.6, 4.4), ((0.0, -7.8, 7.6), 6.4, 3.2)]
body = tk.loft('body', [{'c': c, 'w': w, 'h': h, 'e': 2.2} for c, w, h in RINGS], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
BODY = [low(body, 'body', 520, sculpt=pu.lumps(0.15, 1.6, 2), region=('scales', [('belly', lambda C, N: N[:, 2] < -0.2)]))]
tk.flat_bottom(BODY[0][0], 0.5)
head = tk.loft('head', [{'c': tuple(HC + (0, 2.4, -0.6)), 'w': 6.0, 'h': 2.4, 'e': 2.3}, {'c': tuple(HC + (0, 0.4, 0.0)), 'w': 8.8, 'h': 2.7, 'e': 2.6},
                        {'c': tuple(HC + (0, -2.2, -0.2)), 'w': 7.6, 'h': 2.2, 'e': 2.8}, {'c': tuple(HC + (0, -4.0, -0.5)), 'w': 4.6, 'h': 1.5, 'e': 2.5}],
               n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
BODY.append(low(head, 'head', 160, region=('scales', [('belly', lambda C, N: N[:, 2] < -0.6)])))
kit.eyepin(F, at=(0.0, 0.6, 10.9), bone='body')
tongue = tk.loft('tongue', [{'c': tuple(HC + (0, -2.2, -0.9)), 'w': 1.0, 'h': 0.25}, {'c': tuple(HC + (0, -3.4, -0.9)), 'w': 0.9, 'h': 0.22},
                            {'c': tuple(HC + (0, -3.9, -0.9)), 'w': 1.4, 'h': 0.2}], n=6, up=(0, 0, 1), cap0='round', cap1='flat')
for sx in (1, -1):
    pr = tk.tube('fork', [tuple(HC + (sx * 0.3, -3.8, -0.9)), tuple(HC + (sx * 0.9, -4.6, -0.8))], [0.22, 0.08], n=4, cap1='point')
    tongue = tk.join([tongue, pr], 'tongue')
TNG = low(tongue, 'tongue', 30, lo=0, hi=1, region='tongue')

F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('tongue', TNG[0], [TNG[1]], bone='tongue', kind='gloss')


def make_rig():
    from rig import Rig
    import kit as kt
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 0.3), parent='root')
    R.bone('tongue', tuple(HC + (0, -2.2, -0.9)), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)

    def pop(k, f0, f1):   # the forked tongue flicks out twice
        k('tongue', f0 - 2)
        for i, f in enumerate(range(f0 + 2, f1 + 8, 6)):
            k('tongue', f, move=(0, -2.6 if i % 2 == 0 else -1.0, 0), ease='LINEAR')
        k('tongue', f1 + 14)
    pu.squeeze(R, 'body', ['root', 'tongue'], pop=pop)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sc = pu.sugar(P, pt, sh, 'scales', '#8ee04a', seed=12)
    dia = (np.abs(np.mod(Y + X * 0.0, 3.2) - 1.6) + np.abs(X) * 0.9 < 1.3) & (Z > 4.0)    # the diamond chain down the back
    P.fill(sc & dia & (np.abs(X) < 2.4), pt.ramp('#2f9a4a', 6, shift=0.06), tone=sh, base=0.05)
    pu.sugar(P, pt, sh, 'belly', '#f2f0c0', seed=13)
    P.shift(P.region('belly') & (np.abs(np.mod(Y, 1.4) - 0.7) < 0.12), -1)     # the belly scales' lines
    P.fill('tongue', pt.ramp('#f0506a', 5, shift=0.05), tone=sh, base=0.15)
    P.fill('pin', pt.ramp('#c7cbd2', 6, shift=0.04, light=0.8), tone=sh * 1.4, base=0.05)
    hd = sc & (P.part == PI['body']) & (Y < -7.0) & (Z > 8.0)
    fc = face.Face(P, c=tuple(HC + (0, -2.6, 1.2)), axis=(0, -1, 0.5), where=hd, seed=802)
    fc.eyes('bean', spread=4.6, size=0.62, dy=0.5, tilt=12, catch=False)
    fc.brows('angry', spread=4.8, dy=1.6, w=1.4, weight=0.3)
    fm = face.Face(P, c=tuple(HC + (0, -3.4, -0.4)), axis=(0, -1, 0.2), where=hd, seed=803)
    fm.mouth('smug', w=3.6, dy=-0.2, weight=0.36)
    P.lines(['belly', 'tongue'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('tongue', 'body')]),
    cams=[((40, -52, 34), (0, 0, 7)), ((-40, 48, 32), (0, 2, 7))], fold=(0, 12, 24, 60))
