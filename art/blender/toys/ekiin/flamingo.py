"""しんごうフラミンゴ Signal Flamingo: the platform dispatcher, a flamingo standing on one leg like a signal post, the
dispatcher's red-banded cap, a whistle in her bill and the two-sided signal flag (red one side, green the other) in
her wing (series ekiin, concepts_C.md). She stands on a platform tile: on one leg she needs one.

Gimmick: the flag goes up, the neck straightens like a signal arm, the whistle (head up), the flag flips from red to
green, and the tucked leg kicks out and folds back.

    tools/blender.sh art/blender/toys/ekiin/flamingo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('ekiin', 'flamingo')

BZ = 3.0                      # the tile's top
BC = (0, 1.0, 30.0)           # the body's centre
HD = (0, -7.6, 51.0)          # the head's centre
NECK0 = (0, -6.0, 33.0)       # the neck's pivot (at the chest)
POLE = (-9.0, -7.0)           # the flag pole (x, y)
POLE_Z = (29.0, 45.0)

# ------------------------------------------------------------------ the platform tile
tile = tk.rbox('tile', (24.0, 20.0, BZ), centre=(0, 0.6, BZ / 2), bevel=0.7, segs=1)
tile_lo, tile_hi = cx.low(tile, 'tile', 30, lo=0, hi=1, region='concrete')

# ------------------------------------------------------------------ the body (with the folded wings moulded on) and the tail
body = tk.loft('body', [{'c': (0, BC[1] - 9.0, BC[2] + 1.6), 'w': 8.0, 'h': 5.0, 'e': 2.2},
                        {'c': (0, BC[1] - 5.0, BC[2] + 0.6), 'w': 13.0, 'ht': 6.4, 'hb': 6.0, 'e': 2.3},
                        {'c': (0, BC[1] + 1.0, BC[2]), 'w': 14.4, 'ht': 6.6, 'hb': 6.2, 'e': 2.3},
                        {'c': (0, BC[1] + 6.4, BC[2] + 0.8), 'w': 11.0, 'ht': 5.2, 'hb': 4.6, 'e': 2.3},
                        {'c': (0, BC[1] + 10.6, BC[2] + 2.4), 'w': 5.6, 'h': 2.6, 'e': 2.2}], n=16, up=(0, 0, 1), cap0='round', cap1='point', capd=1.6)


def sc_body(h):
    def f(V, N):  # the folded wing's coverts and the flight feathers' rows along each flank
        side = np.abs(N[:, 0]) > 0.45
        u = V[:, 1] * 0.8 - V[:, 2] * 0.6
        d = -0.22 * (np.abs(np.sin(u * math.pi / 2.0)) ** 6) * side * (V[:, 1] > BC[1] - 2)
        d += 0.3 * tk.smoothstep(0.6, 0.0, np.abs(V[:, 2] - (BC[2] + 2.6 - 0.18 * (V[:, 1] - BC[1])))) * side
        return d
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 220, lo=1, hi=3, sculpt=sc_body, region=('pink', [('wing', lambda C, N: (np.abs(N[:, 0]) > 0.45) & (C[:, 2] < BC[2] + 2.6 - 0.18 * (C[:, 1] - BC[1])) & (C[:, 1] > BC[1] - 3))]))

# the standing leg (its backward 'knee' halfway), the webbed foot
leg = tk.tube('leg', [(1.6, 2.0, BC[2] - 4.0), (1.8, 2.4, 22.0), (1.8, 1.2, 15.0), (1.6, 0.0, BZ + 1.2)], [2.0, 1.25, 1.35, 1.0], n=8)
foot = tk.slab('foot', [(-2.6, 2.4), (2.6, 2.4), (3.6, -3.2), (1.6, -2.2), (0.0, -4.0), (-1.6, -2.2), (-3.6, -3.2)], 1.0, plane='XY', at=BZ + 0.5, bevel=0.35, segs=1)
tk.move(foot, (1.6, -0.6, 0))
STAND = [cx.low(leg, 'leg', 50, lo=1, hi=2, region='leg'), cx.low(foot, 'foot', 24, lo=0, hi=1, region='leg')]
# the tucked leg: thigh down, the shin folded back up under the belly, the foot curled
tuck = tk.tube('tuck', [(-1.8, 2.0, BC[2] - 4.0), (-2.2, -2.6, 21.6), (-2.2, 2.8, 23.4), (-2.0, 6.6, 24.6)], [1.9, 1.3, 1.1, 0.9], n=8)
tfoot = tk.slab('tfoot', [(-2.0, 1.4), (2.0, 1.4), (2.6, -2.2), (0.0, -2.8), (-2.6, -2.2)], 0.9, plane='XZ', at=0.0, bevel=0.3, segs=1)
tk.rotate(tfoot, 70, 'X')
tk.move(tfoot, (-2.0, 7.4, 24.2))
TUCK = [cx.low(tuck, 'tuck', 46, lo=1, hi=2, region='leg'), cx.low(tfoot, 'tfoot', 20, lo=0, hi=1, region='leg')]
TUCK_P = (-1.8, 2.0, BC[2] - 4.0)

# ------------------------------------------------------------------ the neck, head, bill, whistle and cap
neck = tk.tube('neck', [NECK0, (0, -8.6, 36.6), (0, -8.8, 40.8), (0, -6.4, 44.4), (0, -5.4, 47.6), (0, -6.2, 50.0)], [3.0, 2.3, 2.1, 2.0, 2.1, 2.6], n=10)
head = tk.loft('head', [{'c': (0, HD[1] + 3.0, HD[2] + 0.4), 'w': 4.6, 'h': 2.6, 'e': 2.2}, {'c': (0, HD[1] + 0.6, HD[2] + 0.4), 'w': 6.4, 'h': 3.4, 'e': 2.2},
                        {'c': (0, HD[1] - 2.0, HD[2] + 0.1), 'w': 5.6, 'h': 3.0, 'e': 2.2}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
bill = tk.loft('bill', [{'c': (0, HD[1] - 2.6, HD[2] - 0.2), 'w': 3.8, 'h': 2.1, 'e': 2.4}, {'c': (0, HD[1] - 5.2, HD[2] - 0.4), 'w': 3.2, 'h': 1.9, 'e': 2.4},
                        {'c': (0, HD[1] - 6.6, HD[2] - 1.8), 'w': 2.4, 'h': 1.5, 'e': 2.4}, {'c': (0, HD[1] - 7.0, HD[2] - 3.6), 'w': 1.6, 'h': 1.0, 'e': 2.2}],
                n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
whistle = tk.cyl('whistle', 0.85, -1.6, 1.6, n=10, at=(HD[1] - 7.6, HD[2] - 3.4), axis='X', bevel=0.2, segs=1)
tk.rotate(whistle, 90, 'Z', (0, HD[1] - 7.6, HD[2] - 3.4))
HEADP = [cx.low(neck, 'neck', 70, lo=1, hi=2, region='pink'), cx.low(head, 'head', 70, lo=1, hi=2, region='pink'),
         cx.low(bill, 'bill', 50, lo=1, hi=2, region=('bill', [('tip', lambda C, N: C[:, 2] < HD[2] - 1.6)])),
         cx.low(whistle, 'whistle', 20, lo=0, hi=1, region='brass')]
HEADP += cx.station_cap((0, HD[1] + 0.8, HD[2] + 2.8), r=3.6, h=3.0, tilt=-10, visor=0.95)
for lo_, hi_ in HEADP[1:]:   # (mascot proportions: a bigger head than a real flamingo's)
    for o_ in (lo_, hi_):
        tk.scale(o_, 1.3, HD)

# ------------------------------------------------------------------ the flag wing: a wing raised to the pole, the two-sided flag
s = np.array((-6.0, BC[1] - 1.0, BC[2] + 2.0))
hand = np.array((POLE[0], POLE[1], 33.0))
mid = (s + hand) / 2 + np.array((-2.4, 1.0, -2.0))
fw = tk.loft('fwing', [{'c': tuple(s), 'w': 3.0, 'h': 4.6, 'e': 2.2}, {'c': tuple(mid), 'w': 2.6, 'h': 4.2, 'e': 2.2},
                       {'c': tuple(hand + np.array((0.8, 0.6, 0))), 'w': 2.2, 'h': 3.2, 'e': 2.2}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
FWING = cx.low(fw, 'fwing', 50, lo=1, hi=2, region=('wing', [('arm', lambda C, N: np.linalg.norm(C - mid, axis=1) < 2.4)]))
pole = tk.cyl('pole', 0.55, POLE_Z[0], POLE_Z[1], n=8, at=POLE, axis='Z', bevel=0.15, segs=1)
flag = tk.slab('flag', [(0.0, 0.0), (7.4, 0.0), (7.4, 5.6), (0.0, 5.6)], 0.6, plane='XZ', at=POLE[1], bevel=0.2, segs=1)
tk.move(flag, (POLE[0] - 7.6, 0, POLE_Z[1] - 6.0))
tk.subsurf(flag, 1, keep_corners=True)
tk.deform(flag, lambda V: V + np.stack([0 * V[:, 0], 0.5 * np.sin((V[:, 0] - POLE[0]) * 0.7), 0 * V[:, 0]], 1))
FLAG = [cx.low(pole, 'pole', 16, lo=0, hi=1, region='wood'),
        cx.low(flag, 'flag', 40, lo=0, hi=1, region=('red', [('green', lambda C, N: N[:, 1] > 0.2)]))]

# ------------------------------------------------------------------ parts
F.part('body', tk.join([tile_lo, body_lo] + [s_[0] for s_ in STAND], 'body'), [tile_hi, body_hi] + [s_[1] for s_ in STAND], bone='root')
F.part('tuck', tk.join([t[0] for t in TUCK], 'tuck'), [t[1] for t in TUCK], bone='tuck')
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='neck')
F.part('fwing', FWING[0], [FWING[1]], bone='fwing')
F.part('flag', tk.join([f_[0] for f_ in FLAG], 'flag'), [f_[1] for f_ in FLAG], bone='flag')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('tuck', TUCK_P, parent='root')
    R.bone('neck', NECK0, parent='root')
    R.bone('fwing', tuple(s), parent='root')
    R.bone('flag', (POLE[0], POLE[1], POLE_Z[0]), parent='fwing')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'tuck', 'neck', 'fwing', 'flag']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the flag goes up
        k('fwing', 3)
        k('fwing', 10, rot=('Y', 14), move=(0, 0, 2.0), ease='BACK')
        k('fwing', 60, rot=('Y', 14), move=(0, 0, 2.0))
        k('fwing', 68)
        # the neck straightens like a signal arm, then the whistle: head up
        k('neck', 8)
        k('neck', 16, rot=('X', -9), ease='BACK')
        k('neck', 22, rot=('X', -9))
        k('neck', 26, rot=('X', -16))
        k('neck', 30, rot=('X', -12))
        k('neck', 34, rot=('X', -16))
        k('neck', 40, rot=('X', -6))
        k('neck', 62, rot=('X', -6))
        k('neck', 70)
        # red to green: the flag flips round its pole
        k('flag', 30)
        k('flag', 38, rot=('Z', 180), ease='BACK')
        k('flag', 58, rot=('Z', 180))
        k('flag', 66, rot=('Z', 360))
        # the tucked leg kicks out and folds back (a little dance of the signal post)
        k('tuck', 40)
        k('tuck', 45, rot=('X', 34), ease='BACK')
        k('tuck', 50)
        k('root', 44)
        k('root', 47, move=(0, 0, 0.6))
        k('root', 51, ease='BOUNCE')
        for b in allb:
            k(b, 74)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    tone = np.where(P.part == PI['body'], sh, free)
    PINK = pt.ramp('#f2a2ac', 7, shift=0.06)
    P.fill('pink', PINK, tone=tone, base=0.08 + 0.1 * tk.smoothstep(BC[2], 50, Z))
    WING = pt.ramp('#e46c86', 7, shift=0.06)
    P.fill('wing', WING, tone=tone, base=0.05)
    P.tint(P.region('wing') & (Yc > BC[1] + 5.0), pt.ramp('#2e2a30', 6, shift=0.05), tone + 0.2)   # black flight feathers
    P.fill('leg', pt.ramp('#e88a98', 6, shift=0.06), tone=tone, base=0.0)
    P.fill('bill', pt.ramp('#f2d6cc', 6, shift=0.05), tone=free, base=0.1)
    P.fill('tip', pt.ramp('#2a2628', 6, shift=0.05), tone=free, base=0.25)
    P.fill('brass', pt.ramp('#d8b04a', 6, dark=0.6, light=0.6, shift=0.06), tone=free * 1.3, base=0.2)
    P.fill('arm', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('concrete', pt.ramp('#a8a49a', 6, shift=0.05), tone=sh, base=0.05)
    tm = P.region('concrete') & (on[:, :, 2] > 0.8)
    P.flat(tm & (Yc < -5.0), '#e8c440')
    P.flat(tm & (Yc < -5.0) & (np.mod(X, 1.6) < 0.6) & (np.mod(Yc, 1.6) < 0.6), '#c8a428')
    P.fill('wood', pt.ramp('#c8a06a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('red', pt.ramp('#d2343a', 6, shift=0.06), tone=free * 0.6, base=0.15)
    P.fill('green', pt.ramp('#3a9a52', 6, shift=0.06), tone=free * 0.6, base=0.15)
    # the dispatcher's cap: navy with the red band
    NAVY = pt.ramp('#2c3a5c', 7, shift=0.06)
    P.fill('cap', NAVY, tone=free, base=0.15)
    P.fill('band', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.05)
    P.fill('visor', pt.ramp('#26262c', 6, shift=0.05), tone=free * 1.3, base=0.3)
    P.fill('badge', pt.ramp('#e2b84c', 6, shift=0.06), tone=free, base=0.2)
    # the face, drawn on: a squeezed-shut eye each side (she is blowing the whistle hard), puffed rosy cheeks
    for sx in (1, -1):
        fc = face.Face(P, c=(sx * 3.9, HD[1] + 0.3, HD[2] + 0.8), axis=(sx * 0.85, -0.45, 0.1), where=P.region('pink') & (P.part == PI['head']), seed=91 + sx)
        fc.eyes('squeeze', spread=0.0, size=0.62, dy=0.0, only=sx)
        fc.blush(0.0, -2.0, rx=1.2, ry=0.7)
    P.lines(['pink', 'wing'], ['leg', 'bill', 'cap', 'band', 'arm'], step=1)
    P.lines(['red', 'green'], None, step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 75), skip=[('tuck', 'body'), ('head', 'body'), ('fwing', 'body'), ('flag', 'fwing')]),
       cams=[((70, -84, 66), (0, -2, 26)), ((-66, 74, 60), (0, 0, 26))], fold=(0, 14, 38, 46))
