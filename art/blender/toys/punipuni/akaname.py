"""あかなめ Akaname: the bath-scum licker that comes out at night to lick the grime off the bathtub, as a squishy
keychain (series punipuni, concepts_D.md): a squat neon-pink imp, a spiky topknot, one clawed hand up, a huge tongue
lolling down its front. Cheeky.

Gimmick: the squeeze: it squashes and spreads, the tongue stretches right out mid-squish, and it rises slowly back.

    tools/blender.sh art/blender/toys/punipuni/akaname.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('punipuni', 'akaname')
low = pu.low
FC = np.array((0.0, -7.0, 11.0))      # the face
MO = np.array((0.0, -7.0, 9.2))       # the mouth (the tongue's root)

body = tk.lathe('body', [(0, 0.0), (7.4, 0.0), (8.2, 1.4), (8.4, 4.0), (7.6, 7.4), (6.6, 10.6), (4.8, 13.4), (2.4, 15.0), (0, 15.4)], n=18)
tk.scale(body, (1.0, 0.9, 1.0))
BODY = [low(body, 'body', 420, sculpt=pu.lumps(0.18, 1.4, 4), region='skin')]
tk.flat_bottom(BODY[0][0], 0.4)
for sx in (1, -1):
    ft = tk.lathe('foot', [(0, -0.9), (1.8, -0.8), (2.2, 0.0), (1.7, 0.8), (0, 1.0)], n=10, centre=(sx * 3.6, -6.0, 0.9))
    tk.scale(ft, (1.0, 1.4, 1.0), pivot=(sx * 3.6, -6.0, 0.9))
    BODY.append(low(ft, 'foot', 30, lo=1, hi=1, region='skin'))
up = tk.tube('arm', [(-6.6, -1.2, 9.0), (-9.0, -2.0, 11.0), (-9.8, -2.6, 13.8)], [1.9, 1.6, 1.5], n=8, cap1='round')
dn = tk.tube('arm', [(6.6, -1.6, 8.4), (8.0, -4.4, 6.4), (5.4, -6.8, 5.8)], [1.9, 1.6, 1.5], n=8, cap1='round')
BODY += [low(up, 'arm', 50, region='skin'), low(dn, 'arm', 50, region='skin')]
for i, (dx, dz) in enumerate(((-1.0, 0.0), (0.0, 0.4), (1.0, 0.0))):   # three claws on the raised hand
    cl = tk.tube('claw', [(-9.8 + dx * 0.9, -2.8, 14.8 + dz), (-10.2 + dx * 1.4, -3.4, 16.4 + dz)], [0.5, 0.06], n=5, cap1='point')
    BODY.append(low(cl, 'claw', 10, lo=0, hi=1, region='claw'))
for i, (dx, dy, dz) in enumerate(((-1.6, 0.6, 0.0), (0.0, 0.0, 0.8), (1.6, 0.6, 0.0))):   # the spiky topknot
    hr = tk.tube('spike', [(dx * 0.5, dy + 0.6, 14.6), (dx, dy + 1.0, 17.0 + dz)], [1.0, 0.1], n=6, cap1='point')
    BODY.append(low(hr, 'spike', 16, lo=1, hi=1, region='hair'))
kit.eyepin(F, at=(0.0, 2.6, 15.0), bone='body')
tongue = tk.loft('tongue', [{'c': tuple(MO + (0, 0.4, 0.2)), 'w': 3.0, 'h': 0.8}, {'c': tuple(MO + (0, -1.2, -1.4)), 'w': 3.8, 'h': 0.9},
                            {'c': tuple(MO + (0, -1.8, -3.8)), 'w': 4.0, 'h': 0.9}, {'c': tuple(MO + (0, -1.6, -5.2)), 'w': 3.2, 'h': 0.8}],
                 n=10, up=(0, -1, 0.2), cap0='round', cap1='round', capd=0.5)
TNG = low(tongue, 'tongue', 60, lo=1, hi=1, region='tongue')

F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('tongue', TNG[0], [TNG[1]], bone='tongue', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 0.3), parent='root')
    R.bone('tongue', tuple(MO), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)

    def pop(k, f0, f1):   # the tongue stretches right out and wags
        k('tongue', f0 - 4)
        k('tongue', f0 + 2, scale=(1.1, 1.6, 1.1), rot=('X', -24), ease='BACK')
        k('tongue', f0 + 10, scale=(1.1, 1.6, 1.1), rot=[('X', -24), ('Y', 10)])
        k('tongue', f1, scale=(1.1, 1.6, 1.1), rot=[('X', -24), ('Y', -10)])
        k('tongue', f1 + 22)
    pu.squeeze(R, 'body', ['root', 'tongue'], pop=pop)
    return R


def paint(P, pt):
    import face
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sk = pu.sugar(P, pt, sh, 'skin', '#ff7aa8', seed=21)
    P.fill('tongue', pt.ramp('#e8405a', 6, shift=0.06), tone=sh, base=0.12, brush='gloss')
    P.shift(P.region('tongue') & (np.abs(P.X) < 0.25), -1)        # the groove down the tongue
    P.fill('claw', pt.ramp('#f6eede', 4), tone=sh, base=0.2)
    pu.sugar(P, pt, sh, 'hair', '#8a2a6a', seed=22)
    P.fill('pin', pt.ramp('#c7cbd2', 6, shift=0.04, light=0.8), tone=sh * 1.4, base=0.05)
    fc = face.Face(P, c=tuple(FC), axis=(0, -1, 0.15), where=sk & (P.part == PI['body']), seed=811)
    fc.eyes('bean', spread=5.4, size=0.75, dy=0.9, tilt=-8, catch=False)
    fc.brows('raised', spread=5.8, dy=2.6, w=1.6, weight=0.32)
    fm = face.Face(P, c=tuple(MO + (0, -0.2, 0.4)), axis=(0, -1, 0.1), where=sk & (P.part == PI['body']), seed=812)
    fm.mouth('open', w=3.8, dy=0.0, weight=0.38)
    fc.blush(spread=7.0, dy=-1.0, rx=1.3, ry=0.7)
    P.lines(['tongue', 'hair'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('tongue', 'body')]),
    cams=[((40, -52, 34), (0, 0, 9)), ((-40, 48, 32), (0, 2, 9))], fold=(0, 12, 24, 60))
