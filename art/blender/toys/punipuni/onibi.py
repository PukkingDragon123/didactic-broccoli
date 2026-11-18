"""おにび Onibi: a will-o'-wisp, the ghost-fire that floats over the paddies at night, as a squishy keychain (series
punipuni, concepts_D.md): a fat lilac-blue flame with a curling tail, little licks of flame at its sides and a big
toothy grin.

Gimmick: the squeeze: it squashes and spreads, its flame tips flare right out mid-squish, and it rises slowly back.

    tools/blender.sh art/blender/toys/punipuni/onibi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
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
F = Fig('punipuni', 'onibi')
low = pu.low
FC = np.array((0.0, -7.8, 7.4))

# ------------------------------------------------------------------ the flame: a fat drop of a body, the tail curling up and back
SP = [(0, 0.9, 0.6, 11.6, 4.8), (0, 0.6, 3.4, 15.4, 6.0), (0, 0.4, 7.0, 15.6, 7.2), (0, 0.8, 10.6, 12.6, 6.0), (0, 1.8, 13.6, 8.4, 4.2),
      (0, 3.4, 16.0, 5.0, 2.8), (0, 5.4, 17.4, 2.8, 1.8), (0, 7.2, 17.0, 1.4, 1.1)]
body = tk.loft('body', [{'c': (x, y, z), 'w': w, 'h': h, 'e': 2.2} for x, y, z, w, h in SP], n=16, up=(0, -1, 0), cap0='flat', cap1='point')
BODY = [low(body, 'body', 480, sculpt=pu.lumps(0.2, 1.3, 8), region=('fire', [('core', lambda C, N: (N[:, 1] < -0.55) & (C[:, 2] < 10.0))]))]
tk.flat_bottom(BODY[0][0], 1.3)   # (it stands on its flat foot)
kit.eyepin(F, at=(0.0, 3.0, 15.8), bone='body')
FL = []
for sx, z, L in ((1, 6.0, 4.0), (-1, 6.6, 3.6), (1, 10.2, 2.8), (-1, 10.8, 2.6)):   # licks of flame at the sides (they flare)
    p0 = np.array((sx * 6.6, 0.6, z))
    lk = tk.tube('lick', [tuple(p0 - (sx * 1.2, 0, 0)), tuple(p0 + (sx * L * 0.6, 0, L * 0.5)), tuple(p0 + (sx * L * 0.7, 0.4, L * 1.2))], [1.2, 0.9, 0.1], n=6, cap1='point')
    FL.append(lk)
FLM = low(tk.join(FL, 'flames'), 'flames', 120, lo=1, hi=1, region='fire')

F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('flames', FLM[0], [FLM[1]], bone='flames')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 0.3), parent='root')
    R.bone('flames', (0, 0.6, 7.6), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)

    def pop(k, f0, f1):   # the flame licks flare out wide and flicker
        k('flames', f0 - 4)
        k('flames', f0 + 2, scale=(1.5, 1.5, 1.2), ease='BACK')
        for i, f in enumerate(range(f0 + 6, f1 + 6, 4)):
            k('flames', f, scale=(1.45 + 0.1 * (i % 2), 1.55 - 0.1 * (i % 2), 1.2), ease='LINEAR')
        k('flames', f1 + 20)
    pu.squeeze(R, 'body', ['root', 'flames'], pop=pop)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    fr = pu.sugar(P, pt, sh, 'fire', '#8a9cff', seed=41)
    P.fill(fr & (Z > 12.0), pt.ramp('#b07aff', 6, shift=0.06, dark=0.42), tone=sh, base=0.12)     # violet towards the tip
    P.fill(fr & (P.part == PI['flames']), pt.ramp('#b07aff', 6, shift=0.06, dark=0.42), tone=sh, base=0.12)
    pu.sugar(P, pt, sh, 'core', '#d8e8ff', seed=42)
    P.fill('pin', pt.ramp('#c7cbd2', 6, shift=0.04, light=0.8), tone=sh * 1.4, base=0.05)
    fc = face.Face(P, c=tuple(FC), axis=(0, -1, 0.1), where=(fr | P.region('core')) & (P.part == PI['body']), seed=831)
    fc.eyes('bean', spread=5.6, size=0.8, dy=1.2, tilt=6, catch=False)
    fc.mouth('grin', w=5.4, dy=-1.6, weight=0.42, teeth=4)
    fc.blush(spread=8.0, dy=-0.2, rx=1.3, ry=0.7, col='#c88aff')
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('flames', 'body')]),
    cams=[((40, -52, 34), (0, 0, 9)), ((-40, 48, 32), (0, 2, 9))], fold=(0, 12, 24, 60))
