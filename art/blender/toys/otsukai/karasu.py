"""三本足ガラス Sun Crow: series otsukai, The Gods' Messengers (concepts_B.md).

The three-legged crow that guides the way, as a chubby black-lacquer bird standing on its three gold-clawed legs
on a vermilion step, its wings folded round it like a cloak, a gold sun disc with rays standing behind it.
Gimmick: it spreads its wings wide, the sun turns behind it, a little hop, and it folds them back.

    tools/blender.sh art/blender/toys/otsukai/karasu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import ak  # noqa: E402

F = bk.start('otsukai', 'karasu')
base_lo, base_hi, PZ = ak.plinth('plinth', [(24.0, 28.0, 3.2), (20.0, 23.5, 2.6)])
LZ = PZ + 4.2  # the body sits this high on its legs

BODY = [(LZ, 0.6, 7.0, 3.6, 3.6, 2.2), (LZ + 2.4, 0.4, 12.6, 6.2, 6.4, 2.2), (LZ + 7.0, 0.0, 15.0, 7.4, 7.4, 2.2),
        (LZ + 12.0, -0.4, 13.8, 6.8, 6.6, 2.2), (LZ + 16.0, -0.6, 10.6, 5.4, 5.2, 2.2), (LZ + 18.6, -0.6, 7.6, 4.0, 4.0, 2.1)]


def sc_body(h):
    def f(V, N):
        # breast feathers: overlapping scallop rows on the front
        front = tk.smoothstep(-0.2, -0.7, N[:, 1])
        row = np.mod(V[:, 2] * 0.9, 1.0)
        sc = np.cos((V[:, 0] * 1.1 + np.floor(V[:, 2] * 0.9) * 1.6)) * 0.5 + 0.5
        return 0.22 * front * (row - 0.5) * sc
    tk.push(h, f)


body_lo, body_hi = ak.stack('body', BODY, n=16, tris=330, sculpt=sc_body, cap0='round', cap1='round')
HC = (0.0, -1.4, LZ + 22.4)
head_hi = tk.lathe('head_hi', [(0, -6.4), (4.0, -5.2), (6.0, -2.0), (6.2, 0.6), (5.0, 3.8), (2.6, 5.8), (0, 6.3)], n=20, centre=HC)
tk.subsurf(head_hi, 1)
head_lo = tk.lathe('head', [(0, -6.4), (4.0, -5.2), (6.0, -2.0), (6.2, 0.6), (5.0, 3.8), (2.6, 5.8), (0, 6.3)], n=10, centre=HC)
for o in (head_hi, head_lo):
    tk.scale(o, 1.22, pivot=HC)
tk.push(head_hi, lambda V, N: tk.bump(V, (0, -1.4, HC[2] + 6.0), 2.4, 0.6))  # a little crest of feathers
beak_pts = [(0, HC[1] - 6.0, HC[2] - 1.0), (0, HC[1] - 8.6, HC[2] - 1.6), (0, HC[1] - 10.8, HC[2] - 2.6)]
beak_lo, beak_hi_ = ak.spine('beak', beak_pts, [4.2, 2.8, 0.6], [2.0, 1.4, 0.3], [1.8, 1.2, 0.3], n=8, up=(0, 0, 1), tris=40,
                             region='gold', cap0='round', cap1='point')
for o in [head_hi]:
    tk.set_region(o, 'body')

# three legs, gold, with forward toes and a back toe
legs_lo, legs_hi = [], []
for x, y in ((-3.2, -0.4), (3.2, -0.4), (0.0, 2.4)):
    pts = [(x, y, LZ + 3.0), (x * 1.1, y - 0.6, PZ + 1.6), (x * 1.1, y - 0.8, PZ + 0.5)]
    lo, hi = ak.spine('leg', pts, 1.6, 0.8, n=6, up=(0, -1, 0), tris=20, region='gold', cap0='round', cap1='round')
    legs_lo.append(lo)
    legs_hi += hi
    for a in (-30, 0, 30, 180):
        d = np.array((math.sin(math.radians(a)), -math.cos(math.radians(a)), 0))
        t0 = np.array((x * 1.1, y - 0.8, PZ + 0.5))
        tp = [tuple(t0), tuple(t0 + d * (2.6 if a != 180 else 1.8) + (0, 0, -0.1))]
        lo, hi = ak.spine('toe', tp, 0.9, 0.45, n=5, up=(0, 0, 1), tris=10, region='gold', cap0='round', cap1='point')
        legs_lo.append(lo)
        legs_hi += hi
tail_lo, tail_hi = ak.spine('tail', [(0, 5.2, LZ + 3.0), (0, 9.0, LZ + 0.8), (0, 11.6, PZ + 1.4)], [5.0, 6.4, 7.0], [1.2, 1.0, 0.7],
                            n=8, up=(0, 0, 1), tris=40, region='body', cap0='round', cap1='flat')

# ------------------------------------------------------------------ the wings: folded round it like a cloak
WINGS = {}
OUT = [(0.0, 0.0), (5.0, 1.8), (10.4, 1.2), (14.6, -1.6), (16.8, -5.0), (15.0, -6.2), (13.0, -5.0), (11.4, -7.0), (9.2, -6.0),
       (7.4, -8.2), (5.4, -6.8), (3.0, -8.0), (1.0, -5.0)]  # (a feathered trailing edge)
for nm, sx in (('wing_l', -1), ('wing_r', 1)):
    sh_ = np.array((sx * 6.9, -3.0, LZ + 15.0))
    los = []
    for nm_, segs in ((nm, 0), (nm + '_hi', 2)):
        o = tk.slab(nm_, OUT, 1.4, plane='YZ', bevel=0.35 if segs else 0, segs=1 if segs else 0)
        if segs:
            tk.subsurf(o, 1)
            tk.push(o, lambda V, N: -0.2 * (np.abs(np.mod(V[:, 1] * 0.55, 1.0) - 0.5) < 0.06))  # the primaries' lines
        # the outline is (y along the wing, z) at x = 0: lay it down the body's side, tip to the back, curved round
        tk.deform(o, lambda V, sx=sx: np.c_[V[:, 0] + sx * 0.03 * (V[:, 2] + 3.0) ** 2 * (V[:, 2] < -3), V[:, 1], V[:, 2]])
        tk.scale(o, 0.95)
        tk.rotate(o, -50, 'X')
        tk.rotate(o, -sx * 11, 'Y')
        tk.move(o, tuple(sh_))
        los.append(o)
    tk.set_region(los[1], 'wing')
    WINGS[nm] = (los[0], los[1], tuple(sh_))

# ------------------------------------------------------------------ the sun disc behind it, on a post
SUN = np.array((0.0, 9.6, PZ + 20.0))
rays = []
for i in range(32):
    a = 2 * math.pi * i / 32
    r = 11.0 if i % 2 == 0 else 8.6
    rays.append((r * math.cos(a), r * math.sin(a)))
sun_hi = tk.slab('sun_hi', rays, 1.2, plane='XZ', bevel=0.35, segs=2)
sun_lo = tk.slab('sun', rays, 1.2, plane='XZ', bevel=0, segs=0)
for o in (sun_hi, sun_lo):
    tk.move(o, tuple(SUN))
tk.push(sun_hi, lambda V, N: 0.35 * (np.hypot(V[:, 0] - SUN[0], V[:, 2] - SUN[2]) < 6.0) * (N[:, 1] < -0.5))
tk.set_region(sun_hi, 'sun')
post_hi = tk.cyl('post_hi', 1.1, PZ - 0.5, SUN[2] + 0.6, n=12, at=(0, SUN[1] + 1.9), bevel=0.3, segs=1)
post_lo = tk.cyl('post', 1.1, PZ - 0.5, SUN[2] + 0.6, n=6, at=(0, SUN[1] + 1.9), bevel=0, segs=0)
tk.set_region(post_hi, 'sunpost')

F.part('plinth', tk.join([base_lo, post_lo], 'plinth'), base_hi + [post_hi])
F.part('body', tk.join([body_lo, tail_lo] + legs_lo, 'body'), body_hi + tail_hi + legs_hi)
F.part('head', tk.join([head_lo, beak_lo], 'head'), [head_hi] + beak_hi_, bone='head')
for nm, (lo, hi, sh_) in WINGS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
F.part('sun', sun_lo, [sun_hi], bone='sun', kind='metal', sharp=50)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, LZ), parent='root')
    R.bone('head', (0, -0.8, LZ + 17.0), parent='body')
    for nm, (lo, hi, sh_) in WINGS.items():
        R.bone(nm, sh_, parent='body')
    R.bone('sun', tuple(SUN), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone if p.bone != 'root' or p.name != 'body' else 'body')
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'body', 'head', 'wing_l', 'wing_r', 'sun']
        for b in bones:
            k(b, 0)
        # 0-8 it ducks (anticipation), then the wings fling open and up, the head lifts; the sun turns behind it
        k('body', 6, scale=(1.04, 0.95, 1.04))
        for nm, sx in (('wing_l', -1), ('wing_r', 1)):
            k(nm, 6, rot=('Y', sx * -4))
            k(nm, 14, rot=[('X', -40), ('Y', sx * -58)], ease='BACK')
            for i, f in enumerate((20, 26, 32)):
                k(nm, f, rot=[('X', -40), ('Y', sx * (-58 + (14 if i % 2 == 0 else 0)))])
            k(nm, 40, rot=[('X', -40), ('Y', sx * -58)])
            k(nm, 50, ease='BOUNCE')
        k('head', 14, rot=('X', -14))
        k('head', 40, rot=('X', -14))
        k('head', 48)
        k('body', 14, move=(0, 0, 0.8))
        k('body', 20, move=(0, 0, 0), ease='BOUNCE')
        k('sun', 8)
        k('sun', 50, rot=('Y', 180))
        k('sun', 60, rot=('Y', 180))
        for b in bones:
            k(b, 66, rot=('Y', 180) if b == 'sun' else None)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    LAC = pt.ramp('#26222b', 7, shift=0.08, light=0.55)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    VERM = pt.ramp('#cc4a32', 7, shift=0.06)
    P.fill('body', LAC, tone=sh * 0.55, base=0.08)
    P.fill('wing', LAC, tone=sh * 0.55, base=0.1)
    # gold leaf on the wings' feathered edges
    P.fill(P.region('wing') & (P.cav > 0.53), GOLD, tone=sh, base=0.08)
    P.fill('gold', GOLD, tone=sh, base=0.12)
    P.fill('sun', GOLD, tone=sh * 1.2, base=0.12)
    P.fill(P.region('sun') & (np.hypot(X - SUN[0], Z - SUN[2]) < 5.6) & (Yc < SUN[1]), VERM, tone=sh, base=0.08)
    P.fill('sunpost', GOLD, tone=sh, base=0.05)
    P.fill('plinth', VERM, tone=sh, base=0.0)
    # the face: cream-ink dots set wide on the round head, a determined look (flat brows)
    import face
    fc = face.Face(P, c=(0.0, HC[1] - 7.0, HC[2] + 1.0), axis=(0, -1, 0.15), where=P.region('body'), seed=81, ink='#efe4c8')
    fc.eyes('dot', spread=8.0, size=0.68, dy=0.6)
    fc.brows('angry', spread=8.4, dy=2.6, w=2.4, weight=0.45)
    P.lines(['gold', 'sun'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'plinth'), ('head', 'body')], cam=((72, -96, 60), (0, 0, 18)), fold=(0, 14, 30, 52),
       frames=66)
