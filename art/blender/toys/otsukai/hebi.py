"""白蛇 White Snake of Benzaiten: the secret of series otsukai, The Gods' Messengers (concepts_B.md).

The goddess of music's white snake in white lacquer banded with gold, coiled twice round the foot of a gold biwa
that stands on its vermilion step, its head raised in an S to look at you, its tail curled up to the strings.
Gimmick: it rises up out of its coil, sways, and plucks the biwa's strings with its tail (the biwa shivers).

    tools/blender.sh art/blender/toys/otsukai/hebi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import ak  # noqa: E402

F = bk.start('otsukai', 'hebi')
base_lo, base_hi, PZ = ak.plinth('plinth', [(26.0, 26.0, 3.2), (22.0, 22.0, 2.6)])

# ------------------------------------------------------------------ the biwa: a pear-shaped body, a neck, the bent-back pegbox
BX, BY = 0.0, 3.6
bprof = [(0, 0.0), (5.6, 0.4), (7.4, 3.2), (7.6, 7.2), (6.6, 11.6), (4.6, 15.4), (2.6, 18.4), (1.6, 20.0), (0, 20.4)]
biwa_hi = tk.lathe('biwa_hi', bprof, n=28, centre=(BX, BY, PZ))
biwa_lo = tk.lathe('biwa', bprof, n=12, centre=(BX, BY, PZ))
for o in (biwa_hi, biwa_lo):
    tk.scale(o, (1.0, 0.34, 1.0), pivot=(BX, BY, PZ))
tk.subsurf(biwa_hi, 1)
neck_pts = [(BX, BY - 0.6, PZ + 19.0), (BX, BY - 0.4, PZ + 27.0), (BX, BY + 0.6, PZ + 30.0), (BX, BY + 3.4, PZ + 32.6)]
bneck_lo, bneck_hi = ak.spine('bneck', neck_pts, [3.0, 2.4, 2.6, 2.2], [0.9, 0.8, 0.9, 0.8], n=8, up=(0, -1, 0), tris=40,
                              region='gold', cap0='round', cap1='round')
tk.set_region(biwa_hi, 'gold')
pegs_lo, pegs_hi = [], []
for i, z in enumerate((PZ + 30.2, PZ + 31.6)):
    for sx in (1, -1):
        p = [(BX, BY + 0.9 + 1.4 * i, z), (BX + sx * 3.2, BY + 1.0 + 1.4 * i, z + 0.2)]
        pegs_lo.append(tk.tube('peg', p, 0.45, n=4, cap0='flat', cap1='round'))
        h_ = tk.tube('peg_hi', p, 0.45, n=8, cap0='flat', cap1='round')
        tk.set_region(h_, 'peg')
        pegs_hi.append(h_)

# ------------------------------------------------------------------ the snake: two coils round the biwa's foot
R0 = 9.6
coil = []
N = 30
for i in range(N):
    t = i / (N - 1)
    a = math.radians(-90 - 1.65 * 360 * t)          # from the front, round the back and the front again
    z = PZ + 2.2 + 4.2 * t
    coil.append((BX + R0 * math.cos(a), BY + R0 * 0.82 * math.sin(a), z))
coil_r = [2.1 + 0.25 * math.sin(math.pi * t) for t in np.linspace(0, 1, N)]
coil_lo, coil_hi = ak.spine('coil', coil, [2 * r for r in coil_r], coil_r, n=8, up=(0, 0, 1), tris=300, region='snake', cap0='round', cap1='round')


def scales(h):
    def f(V, N_):
        # belly plates under, overlapping scale rows on the back
        under = tk.smoothstep(-0.2, -0.8, N_[:, 2])
        return -0.18 * under * (np.abs(np.mod(V[:, 0] * 0.9 + V[:, 1] * 0.9, 1.6) - 0.8) < 0.12) \
            + 0.12 * (1 - under) * np.cos(V[:, 0] * 3.1 + V[:, 2] * 2.3) * np.cos(V[:, 1] * 3.1 - V[:, 2] * 2.3)
    tk.push(h, f)


for h in coil_hi:
    scales(h)
# the neck and head (one bone: it rises): out of the front of the coil, up in an S, the head looking at you
s0 = np.array(coil[0])
NECK0 = tuple(s0 + np.array((0.0, -0.6, 0.6)))
npts = [tuple(s0 + np.array((0.0, 1.6, -0.2))), NECK0, tuple(s0 + np.array((1.2, -2.4, 4.6))), tuple(s0 + np.array((-0.6, -2.0, 9.0))),
        tuple(s0 + np.array((-0.4, -3.2, 13.4)))]
nk_lo, nk_hi = ak.spine('sneck', npts, [4.2, 4.2, 3.8, 3.8, 4.4], [2.1, 2.1, 1.9, 1.9, 2.1], n=8, up=(0, -1, 0), tris=90,
                        region='snake', cap0='round', cap1='flat')
for h in nk_hi:
    scales(h)
HC = np.array(npts[-1]) + np.array((0.0, -2.6, 1.0))
hp = [(0, -3.4), (2.4, -2.8), (3.4, -0.8), (3.2, 1.0), (2.2, 2.6), (0, 3.2)]
head_hi = tk.lathe('shead_hi', hp, n=20, axis='Y', centre=tuple(HC))
head_lo = tk.lathe('shead', hp, n=10, axis='Y', centre=tuple(HC))
for o in (head_hi, head_lo):
    tk.scale(o, (1.25, 1.45, 0.62), pivot=tuple(HC))
tk.subsurf(head_hi, 1)
tk.set_region(head_hi, 'snake')
# the tail: from the end of the coil up to the biwa's strings
e0 = np.array(coil[-1])
TAIL0 = tuple(e0)
tpts = [tuple(e0 + np.array((0.0, 0.0, -0.4))), tuple(e0 + np.array((1.4, 1.2, 3.0))), (BX + 3.4, BY - 3.6, PZ + 12.0), (BX + 1.6, BY - 4.4, PZ + 13.6)]
tl_lo, tl_hi = ak.spine('stail', tpts, [4.0, 3.0, 1.8, 0.8], [2.0, 1.5, 0.9, 0.4], n=8, up=(0, 0, 1), tris=60, region='snake',
                        cap0='round', cap1='point')

F.part('plinth', base_lo, base_hi)
F.part('biwa', tk.join([biwa_lo, bneck_lo] + pegs_lo, 'biwa'), [biwa_hi] + bneck_hi + pegs_hi, bone='biwa', kind='metal', sharp=70)
F.part('coil', coil_lo, coil_hi, kind='gloss')
F.part('sneck', tk.join([nk_lo, head_lo], 'sneck'), nk_hi + [head_hi], bone='sneck', kind='gloss')
F.part('stail', tl_lo, tl_hi, bone='stail', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('biwa', (BX, BY, PZ), parent='root')
    R.bone('sneck', NECK0, parent='root')
    R.bone('stail', TAIL0, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'biwa', 'sneck', 'stail']
        for b in bones:
            k(b, 0)
        # it rises out of its coil, head up and back, and sways
        k('sneck', 4, rot=('X', 6))
        k('sneck', 14, rot=('X', -14), move=(0, 0, 1.6), ease='BACK')
        for i, f in enumerate((20, 26, 32)):
            k('sneck', f, rot=[('X', -14), ('Y', 9 if i % 2 else -9)], move=(0, 0, 1.6))
        # the tail plucks the strings: twang, twang (the biwa shivers each time)
        for t0 in (22, 34):
            k('stail', t0)
            k('stail', t0 + 2, rot=[('Z', -10), ('X', 4)], ease='BACK')
            k('stail', t0 + 6)
            for j in range(4):
                k('biwa', t0 + 2 + j, rot=('Y', 1.6 * (1 if j % 2 else -1) * (1 - j / 4)), ease='LINEAR')
            k('biwa', t0 + 6)
        k('sneck', 44, rot=('X', -14), move=(0, 0, 1.6))
        k('sneck', 54, ease='BOUNCE')
        for b in bones:
            k(b, 62)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.0)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    WHITE = pt.ramp('#efebe3', 7, shift=0.07, dark=0.5)
    VERM = pt.ramp('#cc4a32', 7, shift=0.06)
    for r in ('snake',):
        P.fill(r, WHITE, tone=sh * 0.7, base=0.1)
    # gold bands across the snake every few scale rows (like lacquered rings), the belly plates a warm ivory
    snake = P.region('snake')
    ak.gold_bands(P, snake & (P.on[:, :, 2] > -0.3), X * 0.55 + Yc * 0.55 + Z * 0.8, 0.7, period=4.6)
    P.fill(snake & (P.on[:, :, 2] < -0.6), pt.ramp('#e6d4ad', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('gold', GOLD, tone=sh * 1.1, base=0.12)
    P.fill('peg', pt.ramp('#1b1920', 6, shift=0.06), tone=sh, base=0.1)
    # the biwa's face: a black lacquer plate with two crescent sound holes, the strings, the plectrum guard in red
    gold = P.region('gold')
    face_ = gold & (Yc < BY - 1.0) & (Z < PZ + 19.0)
    plate = face_ & (((X - BX) / 6.0) ** 2 + ((Z - PZ - 8.0) / 7.0) ** 2 < 1)
    P.fill(plate, pt.ramp('#1b1920', 6, shift=0.06), tone=sh * 0.5, base=0.08)
    P.fill(plate & (((X - BX) / 4.2) ** 2 + ((Z - PZ - 5.0) / 2.6) ** 2 < 1), VERM, tone=sh, base=0.08)
    for sx in (1, -1):
        P.fill(plate & (np.abs(np.hypot(X - BX - sx * 3.2, Z - PZ - 13.0) - 1.0) < 0.3) & (Z > PZ + 13.0), GOLD, tone=sh, base=0.1)
    strings = face_ & (np.min(np.stack([np.abs(X - BX - d) for d in (-1.2, -0.4, 0.4, 1.2)]), axis=0) < 0.14) & (Z > PZ + 3.0)
    P.flat(strings, '#f2e2b0')
    P.fill('plinth', VERM, tone=sh, base=0.0)
    # the face: small dark dots set wide, a tiny tongue (blep) under its nose dots
    import face
    fc = face.Face(P, c=tuple(HC + np.array((0.0, -4.6, 0.4))), axis=(0, -1, 0.1), where=P.region('snake'), seed=111)
    fc.eyes('dot', spread=4.8, size=0.55, dy=0.6)
    fc.nose('nostrils', dy=-0.6, size=0.5)
    fc.blep(dy=-1.6, w=0.8)
    fc.blush(6.4, -0.6, rx=1.1, ry=0.7, col='#efa3a8')
    P.lines(['gold', 'snake'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('coil', 'plinth'), ('biwa', 'plinth'), ('sneck', 'coil'), ('stail', 'coil')],
       cam=((70, -92, 58), (0, 0, 16)), fold=(0, 14, 24, 40), frames=62)
