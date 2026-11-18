"""ひかりぼうホタルイカ Glow-Stick Firefly Squid: the glow-stick seller of the deep-sea night market (series yomise,
concepts_D.md). A little firefly squid stands on its splayed arms beside its stall pole, glowing rings hung on the
crossbar, a glow-stick held up in each of its two raised arms (a firefly squid's arm tips are its lights).

Gimmick: it twirls the two sticks, and the sticks and the rings blink blue in turn (light-up).

    tools/blender.sh art/blender/toys/yomise/hotaruika.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('yomise', 'hotaruika')
SZ = ya.SZ
SQ = np.array((-1.6, -0.6, SZ))         # the squid's foot centre
HZ = SZ + 7.6                            # the head's centre height
POLE = np.array((7.4, 3.0, SZ))
PT = SZ + 24.0                           # the pole's top
low = ya.low

# ------------------------------------------------------------------ the sea floor, the bamboo stall pole with its crossbar
base_lo, base_hi = ya.seabed(F, rx=13.5, ry=12.0, seed=6)
pole = tk.tube('pole', [tuple(POLE), tuple(POLE + (0, 0, PT - SZ))], [0.75, 0.65], n=8, cap0='flat', cap1='flat')
tk.push(pole, lambda V, N: 0.12 * (np.abs(np.mod(V[:, 2], 5.0) - 2.5) > 2.2))   # bamboo nodes
bar = tk.tube('bar', [tuple(POLE + (-7.0, 0, PT - SZ - 1.4)), tuple(POLE + (1.0, 0, PT - SZ - 1.4))], 0.5, n=6, cap0='flat', cap1='flat')
PB = [low(pole, 'pole', 40, lo=1, hi=2, region='bamboo'), low(bar, 'bar', 20, lo=0, hi=1, region='bamboo')]
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)
RINGS = []
for i, x in enumerate((-5.6, -3.2, -0.8)):   # glowing rings hanging off the crossbar
    c = POLE + (x, 0, PT - SZ - 1.4 - 2.6 - 0.4 * i)
    ring = tk.tube('ring', [(c[0] + 2.0 * math.cos(a), c[1], c[2] + 2.0 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)], 0.32, n=5, closed=True)
    RINGS.append(low(ring, 'ring%d' % i, 60, lo=0, hi=1, region='ring%d' % i))

# ------------------------------------------------------------------ the squid: the pointed mantle with its fins, the head, eight arms splayed
mantle = tk.loft('mantle', [{'c': tuple(SQ + (0, 0.4, HZ - SZ + 2.4)), 'w': 6.4, 'h': 2.9, 'e': 2.2}, {'c': tuple(SQ + (0, 0.6, HZ - SZ + 7.0)), 'w': 6.8, 'h': 3.1, 'e': 2.2},
                          {'c': tuple(SQ + (0, 0.8, HZ - SZ + 12.0)), 'w': 5.2, 'h': 2.6, 'e': 2.2}, {'c': tuple(SQ + (0, 0.9, HZ - SZ + 15.4)), 'w': 2.4, 'h': 1.4, 'e': 2.2}],
                n=14, up=(0, -1, 0), cap0='round', cap1='point', capd=1.0)
SQD = [low(mantle, 'mantle', 120, region='mantle')]
fins = tk.slab('fins', [(-5.6, 0.0), (-0.4, -3.6), (0.4, -3.6), (5.6, 0.0), (0.0, 1.2)], 0.6, plane='XZ', at=0.0, bevel=0.2, segs=1)
tk.move(fins, tuple(SQ + (0, 1.0, HZ - SZ + 15.0)))
head = tk.lathe('head', [(0, -2.6), (2.8, -2.2), (3.8, -0.2), (3.6, 1.4), (2.6, 2.4), (0, 2.6)], n=14, centre=tuple(SQ + (0, 0, HZ - SZ)))
tk.scale(head, (1.12, 0.92, 1.0), pivot=tuple(SQ + (0, 0, HZ - SZ)))
SQD += [low(fins, 'fins', 20, lo=0, hi=1, region='mantle'), low(head, 'head', 90, region='head')]
for i in range(6):   # six arms splayed onto the sea floor (the two raised ones are rigged)
    a = math.radians(30 + i * 60 + (0 if i % 2 else 8))
    d = np.array((math.cos(a), math.sin(a), 0.0))
    p0 = SQ + (0, 0, HZ - SZ - 1.8) + d * 1.6
    pts = [tuple(p0), tuple(SQ + d * 4.0 + (0, 0, 2.6)), tuple(SQ + d * 6.6 + (0, 0, 0.5)), tuple(SQ + d * 8.0 + (0, 0, 0.8))]
    arm = tk.tube('arm', pts, [1.0, 0.8, 0.5, 0.3], n=6, cap1='round')
    SQD.append(low(arm, 'arm', 30, lo=1, hi=1, region='arm'))
ARMS = {}
for nm, sx in (('arm_l', 1), ('arm_r', -1)):
    sh_ = SQ + (sx * 2.2, -1.6, HZ - SZ - 1.2)
    el = sh_ + (sx * 3.0, -1.0, 3.0)
    hand = sh_ + (sx * 3.4, -1.4, 6.6)
    arm = tk.tube(nm, [tuple(sh_), tuple(el), tuple(hand)], [0.9, 0.7, 0.5], n=6, cap1='round')
    stick = tk.tube('stick', [tuple(hand + (0, 0, -1.8)), tuple(hand + (0, 0, 4.4))], [0.55, 0.55], n=6, cap0='round', cap1='round')
    ARMS[nm] = (low(arm, nm, 30, lo=1, hi=1, region='arm'), low(stick, 'stick_' + nm[-1], 20, lo=0, hi=1, region='stick_' + nm[-1]), tuple(sh_))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
for i, r in enumerate(RINGS):
    F.part('ring%d' % i, r[0], [r[1]], bone='rings', kind='led')
F.part('body', tk.join([q[0] for q in SQD], 'body'), [q[1] for q in SQD], bone='body')
for nm, (a, st, sh_) in ARMS.items():
    F.part(nm, a[0], [a[1]], bone=nm)
    F.part('stick_' + nm[-1], st[0], [st[1]], bone=nm, kind='led')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', tuple(SQ + (0, 0, 2.0)), parent='root')
    R.bone('rings', tuple(POLE + (-3.0, 0, PT - SZ - 1.4)), parent='root')
    for nm, (a, st, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'rings', 'arm_l', 'arm_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-52 it twirls the two sticks in circles (left and right out of step), bobbing on its arms; the rings swing;
        # 56-70 a bow (the mantle tips forward); 76 back
        for i, f in enumerate(range(4, 54, 4)):
            ph = i * math.pi / 2
            for nm, sx in (('arm_l', 1), ('arm_r', -1)):
                k(nm, f, rot=[('Y', sx * 28 * math.cos(ph + (0 if sx > 0 else math.pi))), ('X', -20 * math.sin(ph + (0 if sx > 0 else math.pi)))], ease='LINEAR')
            k('body', f, move=(0, 0, 0.6 if i % 2 else 0), ease='LINEAR')
        for nm in ARMS:
            k(nm, 58)
        k('body', 54)
        k('body', 62, rot=('X', 16))
        k('body', 70)
        k('rings', 6)
        for i, f in enumerate(range(12, 60, 8)):
            k('rings', f, rot=('X', 6 if i % 2 else -6))
        k('rings', 66)
        for b in allb:
            k(b, 76)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ya.paint_seabed(P, pt, sh)
    P.fill('bamboo', pt.ramp('#b8a060', 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': (0, 0, 1)})
    P.shift(P.region('bamboo') & (np.abs(np.mod(Z, 5.0) - 2.5) > 2.25), -1)
    for i, col in enumerate(('#9ae8ff', '#c8f0a0', '#f0a8e8')):
        P.fill('ring%d' % i, pt.ramp(col, 5, shift=0.04), tone=sh * 0.4, base=0.25, brush=False)
    for s_ in ('stick_l', 'stick_r'):
        P.fill(s_, pt.ramp('#a8ecff', 5, shift=0.04), tone=sh * 0.4, base=0.25, brush=False)
    # the squid: reddish-brown speckled mantle (chromatophores) over a pale pink-white body, blue photophore dots
    P.fill('mantle', pt.ramp('#e8c8c0', 6, shift=0.05), tone=sh, base=0.15)
    mt = P.region('mantle')
    who, d = P.dabs(mt, size=0.55, spacing=1.0, seed=81)
    P.fill(mt & (who >= 0) & (d < 0.5) & (np.mod(who, 3) != 0), pt.ramp('#a85a4a', 5, shift=0.05), tone=sh, base=0.05, brush=False)
    P.fill('head', pt.ramp('#efd8d0', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('arm', pt.ramp('#e2bcb4', 6, shift=0.05), tone=sh, base=0.1)
    ar = P.region('arm')
    who2, d2 = P.dabs(ar, size=0.35, spacing=1.6, seed=82)
    P.flat(ar & (who2 >= 0) & (d2 < 0.6), '#4a8ad0')        # photophores
    # the face: the big squid eyes as two dots set wide on the head, a tiny smiling mouth, blush
    hd = P.region('head')
    fc = face.Face(P, c=tuple(SQ + (0, -3.4, HZ - SZ + 0.4)), axis=(0, -1, 0.1), where=hd, seed=691)
    fc.eyes('dot', spread=5.4, size=0.6, dy=0.4, uneven=0.15)
    fc.mouth('upturn', w=1.4, dy=-1.2, weight=0.3)
    fc.blush(spread=5.6, dy=-0.8, rx=0.9, ry=0.5)
    P.lines(['mantle', 'bamboo'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 77), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('stick_l', 'arm_l'), ('stick_r', 'arm_r'), ('body', 'base'),
                                                              ('ring0', 'base'), ('ring1', 'base'), ('ring2', 'base')]),
    cams=[((40, -52, 40), (0, -1, 12)), ((-40, 48, 38), (0, 2, 12))], fold=(0, 12, 24, 62))
