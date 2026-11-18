"""ちょうちんアンコウ Lure-Fishing Anglerfish: the water-balloon fishing stall (yo-yo tsuri) of the deep-sea night market
(series yomise, concepts_D.md). A fat anglerfish with a huge toothy grin squats on the sea floor behind a tub of striped
water balloons; its own lure, arched out over the tub, is both the stall's lamp and the fishing line.

Gimmick: the lure lights (light-up), dips into the tub and lifts a balloon out; the angler wiggles, very proud.

    tools/blender.sh art/blender/toys/yomise/ankou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
from mathutils import Matrix  # noqa: E402

tk.reset()
F = Fig('yomise', 'ankou')
SZ = ya.SZ
YAW = 25.0                                   # the fish turned towards its tub (front right)
OFF = np.array((-3.6, 3.4, 0.0))             # where it squats
M = Matrix.Translation(tuple(OFF)) @ Matrix.Rotation(math.radians(YAW), 4, 'Z')
R3 = np.array(M.to_3x3())
AX = R3 @ np.array((1.0, 0.0, 0.0))          # the lure's hinge axis (the fish's own x)
B = np.array((0.0, -2.8, SZ + 9.6))          # the lure's root (fish space)
E = np.array((0.0, -15.0, SZ + 12.6))        # the esca, the lit bulb (fish space)
DIP = 46.0                                   # how far the rod dips (degrees)
low = ya.low


def W(p):
    """fish space -> figure space"""
    return tuple(R3 @ np.asarray(p, float) + OFF)


def rot_about(v, axis, deg):
    a = math.radians(deg)
    k = np.asarray(axis, float) / np.linalg.norm(axis)
    return v * math.cos(a) + np.cross(k, v) * math.sin(a) + k * np.dot(k, v) * (1 - math.cos(a))


EW = np.array(W(E))
BW = np.array(W(B))
ED = BW + rot_about(EW - BW, AX, DIP)        # the esca at the bottom of the dip
TUB = np.array((ED[0] + 0.4, ED[1] - 0.6, SZ - 0.2))

# ------------------------------------------------------------------ the sea floor and the stall's tub of water balloons
base_lo, base_hi = ya.seabed(F, rx=14.0, ry=13.0, seed=2)
tub = tk.lathe('tub', [(0, 0.0), (3.8, 0.0), (4.0, 0.3), (4.2, 2.6), (4.4, 2.8), (4.0, 2.9), (3.8, 0.8), (0, 0.8)], n=16, centre=tuple(TUB))
water = tk.cyl('water', 3.85, TUB[2] + 0.7, TUB[2] + 2.0, n=16, at=(TUB[0], TUB[1]), axis='Z', bevel=0.1, segs=1)
PB = [low(tub, 'tub', 90, lo=0, hi=1, region='tub'), low(water, 'water', 40, lo=0, hi=0, region='water')]
BAL = []


def balloon(name, c, region):
    o = tk.lathe(name, [(0, -1.2), (0.8, -1.0), (1.15, -0.2), (1.0, 0.6), (0.5, 1.0), (0, 1.05)], n=10, centre=tuple(c))
    knot = tk.tube(name + 'k', [tuple(np.array(c) + (0, 0, 0.9)), tuple(np.array(c) + (0.2, 0, 1.6))], [0.25, 0.18], n=4)
    return low(tk.join([o, knot], name), name, 40, lo=1, hi=1, region=region)


for i, (dx, dy) in enumerate(((-1.8, 1.4), (1.8, 1.0))):
    PB.append(balloon('bal%d' % i, TUB + (dx, dy, 2.6), 'bal%d' % i))
catch_c = np.array((ED[0], ED[1], TUB[2] + 2.6))
CATCH = balloon('catch', catch_c, 'bal2')
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)

# ------------------------------------------------------------------ the anglerfish (built facing -y, then turned to its tub)
RINGS = [(-7.2, 12.4, 3.8, 1.2), (-4.0, 16.4, 6.4, 2.4), (0.2, 14.6, 6.2, 2.6), (4.0, 9.0, 3.8, 2.2), (7.0, 4.0, 1.8, 1.4)]
body = tk.loft('body', [{'c': (0, y, SZ + 3.6), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.3} for y, w, ht, hb in RINGS],
               n=18, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)


def sc_body(h):
    def f(V, N):   # lumpy warty skin and a crease where the jaw closes
        warts = 0.18 * (np.sin(V[:, 0] * 3.1) * np.sin(V[:, 1] * 2.7) * np.sin(V[:, 2] * 2.3) > 0.5)
        return warts
    tk.push(h, f)


FISH = [low(body, 'body', 220, sculpt=sc_body, region=('skin', [('belly', lambda C_, N: N[:, 2] < -0.4), ('lip', lambda C_, N: (C_[:, 1] < -6.0) & (C_[:, 2] < SZ + 3.8))]))]
jaw = tk.loft('jaw', [{'c': (0, -2.0, SZ + 1.6), 'w': 15.0, 'ht': 1.2, 'hb': 1.4, 'e': 2.4}, {'c': (0, -6.4, SZ + 1.8), 'w': 14.6, 'ht': 1.4, 'hb': 1.5, 'e': 2.6},
                      {'c': (0, -9.2, SZ + 2.2), 'w': 11.6, 'ht': 1.4, 'hb': 1.3, 'e': 2.5}], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
FISH.append(low(jaw, 'jaw', 90, region=('belly', [('lip', lambda C_, N: N[:, 2] > 0.3)])))
for i in range(9):   # the lower teeth, up in front of the top lip
    a = math.radians(-60 + 120 * i / 8)
    tb = np.array((5.4 * math.sin(a), -2.6 - 6.6 * math.cos(a), SZ + 3.2))
    th = tk.tube('tooth', [tuple(tb), tuple(tb + (0, -0.2, 1.4 + 0.5 * (i % 2)))], [0.42, 0.06], n=5, cap0='flat', cap1='point')
    FISH.append(low(th, 'tooth', 8, lo=0, hi=1, region='tooth'))
tail = tk.slab('tail', [(0.0, -1.4), (3.2, -3.2), (4.6, -0.2), (3.6, 3.2), (0.0, 1.2)], 0.7, plane='YZ', at=0.0, bevel=0.2, segs=1)
tk.move(tail, (0, 7.6, SZ + 2.6))
FISH.append(low(tail, 'tail', 30, lo=0, hi=1, region='fin'))
for sx in (1, -1):
    fin = tk.slab('pfin', [(0.0, 0.0), (2.6, -1.4), (3.8, 0.0), (3.4, 1.6), (1.0, 1.8)], 0.6, plane='XY', at=0.0, bevel=0.2, segs=1)
    if sx < 0:
        tk.scale(fin, (-1, 1, 1))
        tk.fix_normals(fin)
    tk.move(fin, (sx * 6.6, -1.2, SZ + 0.5))
    eye = tk.lathe('eye', [(0, -0.4), (1.0, -0.2), (1.0, 0.3), (0.6, 0.7), (0, 0.8)], n=8, centre=(sx * 3.2, -4.4, SZ + 9.4))
    FISH += [low(fin, 'pfin', 20, lo=0, hi=1, region='fin'), low(eye, 'eye', 14, lo=0, hi=1, region='eyebump')]
rod = tk.tube('rod', [tuple(B), tuple(B + (0, -2.6, 4.2)), tuple(B + (0, -7.2, 6.0)), tuple(E + (0, 0.6, 1.0))], [0.55, 0.45, 0.35, 0.3], n=6)
esca = tk.lathe('esca', [(0, -1.4), (1.0, -1.0), (1.3, 0.0), (1.0, 0.8), (0, 1.2)], n=10, centre=tuple(E))
LURE = low(rod, 'rod', 40, lo=1, hi=1, region='skin')
ESCA = low(esca, 'esca', 30, lo=1, hi=1, region='esca')
for pr in FISH + [LURE, ESCA]:
    for o in pr:
        tk.transform(o, M)

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('body', tk.join([f_[0] for f_ in FISH], 'body'), [f_[1] for f_ in FISH], bone='body')
F.part('lure', LURE[0], [LURE[1]], bone='lure')
F.part('esca', ESCA[0], [ESCA[1]], bone='lure', kind='led')
F.part('catch', CATCH[0], [CATCH[1]], bone='catch')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', W((0, 0, SZ)), parent='root')
    R.bone('lure', tuple(BW), parent='body')
    R.bone('catch', tuple(catch_c), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'lure', 'catch']

    def lure(f, deg, swing=0.0, ease=None):
        k('lure', f, rot=[(tuple(AX), deg)] + ([('Z', swing)] if swing else []), ease=ease)

    def hang(f, deg, dz=-1.6):
        """the caught balloon hanging under the esca when the rod is at deg"""
        e = BW + rot_about(EW - BW, AX, deg)
        k('catch', f, move=tuple(e + (0, 0, dz) - catch_c))
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-18 the lit lure dips into the tub; 18-24 a nibble; 24-40 up it comes with a balloon; 40-60 the angler
        # wiggles, proud; 62-74 the balloon drops back in the tub and the rod goes back up
        lure(4, 0)
        lure(18, DIP)
        lure(21, DIP - 4)
        lure(24, DIP)
        k('catch', 22)
        hang(24, DIP, dz=-0.2)
        for f, d in ((30, 24), (36, 4), (40, -4)):
            lure(f, d)
            hang(f, d)
        for i, f in enumerate(range(44, 62, 6)):
            lure(f, -4, swing=(5 if i % 2 else -5))
            hang(f, -4)
            k('body', f, rot=('Z', 5 if i % 2 else -5))
        lure(62, -4)
        hang(62, -4)
        k('body', 62)
        k('catch', 70, ease='BOUNCE')
        lure(74, 0)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ya.paint_seabed(P, pt, sh)
    P.fill('tub', pt.ramp('#4aa0d0', 6, shift=0.06), tone=sh, base=0.1, brush='gloss')
    P.fill('water', pt.ramp('#8ad0e0', 5, shift=0.04), tone=sh, base=0.2, brush='gloss')
    for i, (a, b) in enumerate((('#f07aa0', '#f2e6e8'), ('#f2c230', '#f2ece0'), ('#6ac07a', '#f2ece0'))):
        rg = P.region('bal%d' % i)
        P.fill(rg, pt.ramp(a, 5, shift=0.05), tone=sh, base=0.1, brush='gloss')
        P.fill(rg & (np.abs(np.mod(np.arctan2(Y, X) * 6 + Z * 0.0, 2.0) - 1.0) < 0.3), pt.ramp(b, 4), tone=sh, base=0.15, brush=False)
    # the angler: plum-brown, warty, a paler belly and lips; dark fins; the esca a pale glowing green
    sk = P.region('skin')
    P.fill('skin', pt.ramp('#5a4248', 7, shift=0.07), tone=sh, base=0.05)
    who, d = P.dabs(sk, size=1.0, spacing=1.8, seed=61)
    P.fill(sk & (who >= 0) & (d < 0.45) & (np.mod(who, 2) == 0), pt.ramp('#3a2a30', 5), tone=sh, base=0.05)
    P.fill('belly', pt.ramp('#9a8278', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('lip', pt.ramp('#8a6a68', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('fin', pt.ramp('#4a3a44', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'pvc', 'flow': 'along', 'axis': (0, 1, 0)})
    P.fill('eyebump', pt.ramp('#6a5258', 5), tone=sh, base=0.1)
    P.fill('esca', pt.ramp('#e8f2a8', 5, shift=0.04, light=0.6), tone=sh * 0.4, base=0.25)
    # the face: tiny pale dots up on the eye bumps, and the grin right across the mouth, a few teeth
    fb = P.region('eyebump')
    for sx in (1, -1):
        c = np.array(W((sx * 3.2, -4.7, SZ + 10.0)))
        fe = face.Face(P, c=tuple(c), axis=tuple(R3 @ np.array((sx * 0.3, -0.6, 1.0))), where=fb, seed=670 + sx, ink='#efe4c8')
        fe.dot(0.0, 0.0, 0.42 if sx > 0 else 0.36)
    fm = face.Face(P, c=W((0, -7.8, SZ + 5.4)), axis=tuple(R3 @ np.array((0, -1, 0.3))), where=sk, seed=673)
    fm.blush(spread=9.0, dy=0.0, rx=1.2, ry=0.6, col='#c87a8a')
    P.fill('tooth', pt.ramp('#f2ece0', 4, shift=0.03), tone=sh, base=0.25)
    P.lines(['tub', 'fin', 'tooth'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('body', 'base'), ('lure', 'body'), ('esca', 'body'), ('catch', 'base'), ('catch', 'esca'),
                                                              ('esca', 'base')]),
    cams=[((40, -52, 40), (0, -2, 8)), ((-40, 48, 38), (0, 2, 8))], fold=(0, 18, 34, 50))
