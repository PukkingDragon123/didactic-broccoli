"""ぎゅうにゅうラッコ Bath-Milk Sea Otter: floating on its back in the big tub (the tub fills its section of floor and
carries on into the next one), a yellow basin on its tummy for its "rock", a glass bottle of bath milk in its paws
(series sento, concepts_D.md).

Gimmick: kon-kon on the basin, the paper cap pops off, the bottle goes up and he drinks it down in one go.

    tools/blender.sh art/blender/toys/sento/rakko.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yu as yu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('sento', 'rakko')
H = yu.H
TT = H + 6.8                  # the tub's rim
WZ = H + 5.4                  # the water's surface
BZ = WZ + 0.8                 # the otter's spine line
HC = np.array((8.8, -1.8, WZ + 6.4))       # the head's centre
FD = np.array((0.5, -0.86, -0.1))          # the way the face looks (front right, at you)
BOT = np.array((4.2, -1.4, WZ + 5.0))      # the bottle's foot
ARMS_AT = (4.0, -1.4, WZ + 3.2)
low = yu.low

# ------------------------------------------------------------------ the floor and the big tub (tiled walls, the water)
base_lo, base_hi = yu.floor(F)
T = 1.8
PB = [yu.box('tubf', (yu.W, T, TT - H), (0, -yu.D / 2 + T / 2 + 0.4, (H + TT) / 2), 'tubtile', bevel=0.4),
      yu.box('tubb', (yu.W, T, TT - H), (0, yu.D / 2 - T / 2 - 0.4, (H + TT) / 2), 'tubtile', bevel=0.4),
      yu.tub_water('water', (yu.W - 0.4, yu.D - 2 * T - 0.6, WZ - H - 0.6), (0, 0, (H + 0.6 + WZ) / 2))]
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)

# ------------------------------------------------------------------ the otter on its back: body (cut at the water), feet, tail
body = tk.loft('body', [{'c': (-10.0, -1.0, BZ - 0.4), 'w': 4.8, 'ht': 2.0, 'hb': 2.0}, {'c': (-6.4, -1.0, BZ), 'w': 8.6, 'ht': 3.8, 'hb': 3.0},
                        {'c': (-1.2, -1.0, BZ + 0.4), 'w': 10.4, 'ht': 4.6, 'hb': 3.2}, {'c': (3.4, -1.2, BZ + 0.6), 'w': 9.6, 'ht': 4.4, 'hb': 3.0},
                        {'c': (6.6, -1.4, BZ + 1.2), 'w': 7.0, 'ht': 3.8, 'hb': 2.6}], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)
body_lo, body_hi = low(body, 'body', 200, region=('fur', [('belly', lambda C, N: (N[:, 2] > 0.55) & (C[:, 0] > -7.0) & (C[:, 0] < 4.0))]))
for o in (body_lo, body_hi):
    tk.bisect(o, (0, 0, WZ - 1.0), (0, 0, 1), keep='+')
BODY = [(body_lo, body_hi)]
for sy in (1, -1):   # the webbed hind feet up out of the water
    ft = tk.loft('foot', [{'c': (-10.6, -1.0 + sy * 2.0, BZ + 0.6), 'w': 2.0, 'h': 0.9}, {'c': (-11.8, -1.0 + sy * 2.6, BZ + 3.0), 'w': 3.2, 'h': 0.8},
                          {'c': (-12.4, -1.0 + sy * 2.9, BZ + 4.6), 'w': 3.6, 'h': 0.6}], n=8, up=(1, 0, 0.3), cap0='round', cap1='round', capd=0.5)
    BODY.append(low(ft, 'foot', 40, lo=1, hi=2, region='paw'))
tail = tk.loft('tail', [{'c': (-11.0, -1.0, BZ - 0.6), 'w': 3.0, 'h': 0.8}, {'c': (-14.0, -1.0, BZ - 0.4), 'w': 3.2, 'h': 0.7}], n=8, up=(0, 0, 1), cap1='round', capd=0.8)
BODY.append(low(tail, 'tail', 20, lo=1, hi=1, region='fur'))
basin = yu.basin('basin', (-2.0, -1.0, BZ + 3.6), r=3.6, h=2.4)
BODY.append(basin)

# ------------------------------------------------------------------ the head, raised to look at you: round, a broad muzzle, small ears
head = tk.lathe('head', [(0, -4.0), (3.1, -3.3), (4.3, -0.6), (4.2, 1.3), (2.9, 3.3), (0, 3.9)], n=14, centre=tuple(HC))
tk.scale(head, (1.06, 1.0, 0.92), pivot=tuple(HC))
MZ = HC + FD * 3.0 + (0, 0, -1.0)
muz = tk.lathe('muzzle', [(0, -1.6), (1.6, -1.2), (2.2, 0.0), (1.6, 1.2), (0, 1.5)], n=10, centre=tuple(MZ))
tk.scale(muz, (1.0, 1.0, 0.72), pivot=tuple(MZ))
HEAD = [low(head, 'head', 130, region='head'), low(muz, 'muzzle', 50, lo=1, hi=2, region='muzzle')]
for sy in (1, -1):
    side = np.cross(FD, (0, 0, 1))
    side /= np.linalg.norm(side)
    ec = HC + side * sy * 3.0 + (0, 0, 2.2) - FD * 0.8
    ear = tk.lathe('ear', [(0, -0.4), (0.9, -0.2), (0.9, 0.2), (0, 0.4)], n=8, centre=tuple(ec))
    HEAD.append(low(ear, 'ear', 12, lo=0, hi=1, region='head'))

# ------------------------------------------------------------------ the arms and the bottle of milk they hold up on the chest
ARMS = []
for sy, sh_ in ((1, (4.2, 3.0, BZ + 1.6)), (-1, (4.2, -5.6, BZ + 1.4))):
    paw = BOT + (0.2, sy * 1.5, 2.2)
    a = tk.tube('arm', [sh_, tuple(np.array(sh_) + (0.8, -sy * 0.4, 2.6)), tuple(paw)], [1.6, 1.3, 1.2], n=8, cap1='round')
    ARMS.append(low(a, 'arm', 40, region='fur'))
bottle = tk.lathe('bottle', [(0, 0.0), (1.25, 0.0), (1.4, 0.4), (1.4, 3.4), (1.0, 4.6), (0.9, 5.6), (1.05, 5.8), (0.9, 6.0), (0, 6.0)], n=12, centre=tuple(BOT))
ARMS.append(low(bottle, 'bottle', 70, lo=0, hi=1, region=('glass', [('milk', lambda C, N: C[:, 2] < BOT[2] + 4.0)])))
CAPZ = BOT[2] + 6.0
cap = tk.cyl('cap', 1.0, CAPZ, CAPZ + 0.45, n=12, at=(BOT[0], BOT[1]), axis='Z', bevel=0.12, segs=1)
cap_lo, cap_hi = tk.copy(cap, 'cap_lo'), cap
tk.set_region(cap_hi, 'cap')
cap_lo = tk.cyl('cap', 1.0, CAPZ, CAPZ + 0.45, n=8, at=(BOT[0], BOT[1]), axis='Z', bevel=0, segs=0)

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('head', tk.join([b[0] for b in HEAD], 'head'), [b[1] for b in HEAD], bone='head')
F.part('arms', tk.join([b[0] for b in ARMS], 'arms'), [b[1] for b in ARMS], bone='arms')
F.part('cap', cap_lo, [cap_hi], bone='cap')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, -1.0, WZ), parent='root')
    R.bone('head', (6.4, -1.4, BZ + 2.4), parent='body')
    R.bone('arms', ARMS_AT, parent='body')
    R.bone('cap', (BOT[0], BOT[1], CAPZ), parent='arms')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'head', 'arms', 'cap']
    k = R.key
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-22 kon-kon: the bottle's foot knocked on the basin twice; 24-30 the cap pops off and drops in the water;
        # 30-40 bottoms up, the head back; 40-60 glug; 60-72 back; the cap flips back on at the end (it's a toy)
        for f, d in ((4, 0), (8, 1), (11, 0), (15, 1), (18, 0)):
            k('arms', f, move=(-2.2 * d, 0.0, -0.6 * d), rot=('Y', -14 * d), ease='LINEAR' if d else None)
        k('arms', 26)
        k('body', 8)
        k('body', 9, move=(0, 0, -0.3))
        k('body', 12)
        k('body', 16, move=(0, 0, -0.3))
        k('body', 19)
        k('cap', 22)
        k('cap', 27, move=(1.0, -2.0, 6.0), rot=('X', 200))
        k('cap', 34, move=(-4.0, -7.0, -6.6), rot=('X', 360))
        k('cap', 70, move=(-4.0, -7.0, -6.6), rot=('X', 360))
        k('cap', 76, move=(0, 0, 3.0), rot=('X', 180))
        k('cap', 80)
        k('arms', 30)
        k('arms', 40, rot=('Y', 58), move=(0.6, 0, 1.6))
        k('arms', 52, rot=('Y', 70), move=(0.8, 0, 1.8))
        k('arms', 60, rot=('Y', 70), move=(0.8, 0, 1.8))
        k('arms', 72)
        k('head', 30)
        k('head', 40, rot=('Y', -14))
        k('head', 60, rot=('Y', -18))
        k('head', 66, rot=('X', -6))
        k('head', 74)
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    yu.paint_floor(P, pt, sh)
    tt = P.region('tubtile')
    P.fill('tubtile', pt.ramp('#e9ece6', 6, shift=0.04), tone=sh, base=0.2, brush='gloss')
    P.fill(tt & (Z > TT - 1.6), pt.ramp('#2a5aa8', 6, shift=0.06), tone=sh, base=0.05, brush='gloss')   # a cobalt edge
    P.fill(tt & ((np.abs(np.mod(X, 1.6) - 0.8) > 0.64) | (np.abs(np.mod(Z, 1.6) - 0.8) > 0.64)), pt.ramp('#9aa09c', 4), tone=sh, base=0.0, brush=False)
    yu.paint_water(P, pt, sh)
    yu.paint_basin(P, pt, sh)
    # the otter: dark chocolate fur, a pale grizzled head, cream muzzle, black webbed feet
    P.fill('fur', pt.ramp('#5c4232', 7, shift=0.07), tone=sh, base=0.05, brush='fur')
    P.fill('belly', pt.ramp('#7a5a44', 6, shift=0.06), tone=sh, base=0.05, brush='fur')
    P.fill('head', pt.ramp('#d6c4a4', 6, shift=0.05), tone=sh, base=0.1, brush='fur')
    P.fill('muzzle', pt.ramp('#efe4cc', 5, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill('paw', pt.ramp('#3a2c26', 5, shift=0.05), tone=sh, base=0.05)
    # the bottle: glass, milk white below the shoulder, a printed blue band; the paper cap with a red ring
    P.fill('glass', pt.ramp('#d4e2e2', 5, shift=0.04), tone=sh, base=0.25, brush='gloss')
    P.fill('milk', pt.ramp('#f4f1e6', 5, shift=0.03), tone=sh, base=0.3, brush='gloss')
    P.fill(P.region('milk') & (np.abs(Z - BOT[2] - 2.0) < 0.6), pt.ramp('#3a6ab0', 4), tone=sh, base=0.1, brush=False)
    P.fill('cap', pt.ramp('#efe6cc', 4), tone=sh, base=0.2)
    P.flat(P.region('cap') & (P.on[:, :, 2] > 0.7) & (np.abs(np.hypot(X - BOT[0], Y - BOT[1]) - 0.6) < 0.14), '#c8302a')
    # the face: tiny dots far apart, a little w mouth under a dark nose, whiskers; blush
    hd = (P.region('head') | P.region('muzzle')) & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + FD * 3.6 + (0, 0, 1.0)), axis=tuple(FD + (0, 0, 0.25)), where=hd, seed=551)
    fc.eyes('dot', spread=3.8, size=0.5, dy=0.5, uneven=0.25)
    fc.blush(spread=4.8, dy=-1.0, rx=0.9, ry=0.5)
    fm = face.Face(P, c=tuple(MZ + FD * 2.0), axis=tuple(FD + (0, 0, 0.15)), where=hd, seed=552)
    fm.nose('button', 0.0, 0.5, size=0.7)
    fm.snout_mouth('cat', 0.0, -0.3, w=1.6)
    fm.whiskers(0.0, -0.1, spread=1.8, n=2, length=1.8, weight=0.2, dots=True)
    P.lines(['paw', 'muzzle', 'cap'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('head', 'body'), ('arms', 'body'), ('cap', 'arms'), ('body', 'base'), ('cap', 'base'),
                                                              ('arms', 'head')]),
    cams=[((46, -58, 40), (0, 0, 10)), ((-46, 52, 36), (0, 2, 10))], fold=(0, 15, 28, 50))
