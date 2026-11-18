"""ぬっぺっぽう Nuppeppō: the walking lump of flesh of the old scroll books, as a squishy (series punipuni,
concepts_D.md): a sagging peach lump of dough with fat folds, three wisps of hair and stubby arms crossed, very smug.

Gimmick: the squeeze: it squashes and spreads, a tongue pokes out mid-squish, and it rises slowly back.

    tools/blender.sh art/blender/toys/punipuni/nuppeppo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _puni as pu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('punipuni', 'nuppeppo')
low = pu.low
FC = np.array((0.0, -8.0, 15.6))       # the face's centre

# ------------------------------------------------------------------ the lump: a sagging dough body, its fat folds
body = tk.lathe('body', [(0, 0.0), (10.6, 0.0), (11.4, 0.9), (10.8, 2.6), (11.0, 4.0), (10.0, 5.8), (10.3, 7.2), (9.0, 9.6), (9.0, 11.2),
                         (7.8, 14.0), (6.0, 17.2), (3.4, 19.2), (0, 19.8)], n=20)
tk.scale(body, (1.0, 0.86, 1.0))


def sc_body(h):
    def f(V, N):   # dough: soft lumps, the folds sagging lower at the front, a belly-button dimple
        z = V[:, 2] + 0.5 * np.cos(np.arctan2(V[:, 1], V[:, 0]) + 1.57)
        folds = 0.45 * (np.exp(-((z - 4.2) / 0.7) ** 2) + np.exp(-((z - 7.6) / 0.8) ** 2)) * (N[:, 2] > -0.5)
        dimple = -0.6 * np.exp(-((V[:, 0]) ** 2 + (V[:, 2] - 6.2) ** 2) / 0.5) * (V[:, 1] < -6.0)
        return folds + dimple + 0.22 * np.sin(V[:, 0] * 1.2) * np.sin(V[:, 2] * 1.1 + 1.0)
    tk.push(h, f)


BODY = [low(body, 'body', 640, sculpt=sc_body, region='dough')]
tk.flat_bottom(BODY[0][0], 0.4)
for sx in (1, -1):   # stubby arms crossed over the front
    arm = tk.tube('arm', [(sx * 8.6, -2.6, 10.6), (sx * 6.8, -7.4, 9.6), (-sx * 1.6, -9.6, 9.4 + sx * 0.6)], [2.4, 2.2, 1.9], n=8, cap1='round')
    BODY.append(low(arm, 'arm', 70, region='dough'))
for i, (dx, dy) in enumerate(((-1.2, 0.4), (0.4, -0.4), (1.6, 0.6))):   # three wisps of hair
    w = tk.tube('wisp', [(dx, dy, 19.4), (dx * 1.6, dy - 0.6, 21.6), (dx * 2.2 + 0.8, dy - 0.2, 22.8)], [0.5, 0.35, 0.12], n=5, cap1='point')
    BODY.append(low(w, 'wisp', 16, lo=1, hi=1, region='hair'))
tongue = tk.lathe('tongue', [(0, -0.9), (1.0, -0.7), (1.3, 0.0), (1.0, 0.6), (0, 0.8)], n=10, centre=tuple(FC + (0.6, 0.6, -2.4)))
tk.scale(tongue, (1.0, 1.0, 0.6), pivot=tuple(FC + (0.6, 0.6, -2.4)))
TNG = low(tongue, 'tongue', 30, lo=1, hi=1, region='tongue')

F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('tongue', TNG[0], [TNG[1]], bone='tongue', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 0.3), parent='root')
    R.bone('tongue', tuple(FC + (0.6, 0.6, -2.4)), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)

    def pop(k, f0, f1):
        k('tongue', f0 - 4)
        k('tongue', f0 + 2, move=(0, -1.8, -0.2), scale=1.25, ease='BACK')
        k('tongue', f1 + 12, move=(0, -1.8, -0.2), scale=1.25)
        k('tongue', f1 + 24)
    pu.squeeze(R, 'body', ['root', 'tongue'], pop=pop)
    return R


def paint(P, pt):
    import face
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    dg = pu.sugar(P, pt, sh, 'dough', '#f4c2a8', seed=11)
    P.shift(dg & (P.cav > 0.56), -1)                       # the creases of the folds a step darker
    P.fill('hair', pt.ramp('#5a3a32', 5), tone=sh, base=0.05)
    P.fill('tongue', pt.ramp('#f06a7a', 5, shift=0.05), tone=sh, base=0.15)
    # the face: smug heavy-lidded eyes set wide, a sideways smirk, hatched blush (faces last: lib/face.py)
    fc = face.Face(P, c=tuple(FC), axis=(0, -1, 0.12), where=dg & (P.part == PI['body']), seed=801)
    fc.eyes('lid', spread=6.4, size=0.9, dy=0.6, catch=False)
    fc.mouth('smug', w=3.6, dy=-1.8, weight=0.42)
    fc.blush(spread=8.0, dy=-1.0, rx=1.5, ry=0.8)
    P.lines(['hair', 'tongue'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('tongue', 'body')]),
    cams=[((40, -52, 34), (0, 0, 10)), ((-40, 48, 32), (0, 2, 10))], fold=(0, 12, 24, 60))
