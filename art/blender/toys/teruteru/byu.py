"""ビュービュー Byū-byū (Typhoon): series teruteru, Upside-Down Rain Charms (concepts_B.md).

A storm-teal charm caught in its own wind: the cloth wrung into a spiral, the sack bent over downwind, all four
corners streaming the same way and its hem come loose into a long streamer that whips round its middle. Printed
with white wind curls. A keychain.
Gimmick: it spins like a top, twice round, corners fluttering, and wobbles to a dizzy stop.

    tools/blender.sh art/blender/toys/teruteru/byu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import kit  # noqa: E402

F = bk.start('teruteru', 'byu')

RINGS = [(0.0, 5.8, 0.0), (0.8, 8.8, 0.0), (3.0, 11.2, 0.0), (7.2, 12.4, 0.0), (11.4, 11.9, 0.0), (15.2, 9.6, 0.1),
         (17.9, 7.0, 0.2), (19.2, 6.8, 0.3), (21.4, 7.6, 0.6), (24.4, 7.3, 1.2), (27.4, 5.9, 2.0), (30.0, 4.3, 2.9),
         (32.0, 3.1, 3.6), (33.0, 2.5, 4.0)]
NECK_Z = 18.5
KNOT = (4.5, 0.0, 33.8)
FACE = (0.0, -12.5, 7.7)

body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=6, fold_amp=0.6, twist=9.0, cheeks=((-5.6, 7.2), (5.6, 7.2)),
               tris=480)
knot = tt.knot('knot', KNOT, r=2.7, h=3.4, lean=(0.35, 0.0), tris=50, turns=1.8)
cord = tt.neck_cord('cord', NECK_Z, RINGS, bow_at=-150, ends=((-1.2, -5.0), (-0.6, -6.6)), thick=0.7, tris=100)

# ------------------------------------------------------------------ the streamer: the loose hem whipping round its middle
pts, rings = [], []
N = 22
for i in range(N):
    t = i / (N - 1)
    a = math.radians(40 - 400 * t)               # from downwind (+x) round the front and back again
    z = KNOT[2] - 1.0 - 15.5 * t ** 0.85
    r = 3.0 + 10.5 * min(1.0, t * 3.0) + 1.2 * math.sin(t * 9)
    pts.append((r * math.cos(a) + KNOT[0] * (1 - t), r * math.sin(a), z))
    rings.append({'w': 0.75, 'h': 1.9 * (1 - 0.55 * t) + 0.3, 'e': 3.0, 'twist': 25 * math.sin(t * 8)})
for p_, r_ in zip(pts, rings):
    r_['c'] = p_
str_lo = tk.loft('streamer', rings, n=4, up=(0, 0, 1), cap0='flat', cap1='point')
str_hi = tk.loft('streamer_hi', rings, n=10, up=(0, 0, 1), cap0='flat', cap1='point')
tk.subsurf(str_hi, 1)
tk.set_region(str_hi, 'cloth')

# ------------------------------------------------------------------ four corners streaming downwind
CORNERS = {}
for nm, ang, L, a0, a1, tw in (('c_a', -40, 12.0, 18, -12, 35), ('c_b', -8, 14.5, 26, 0, -25), ('c_c', 22, 13.5, 8, -20, 30), ('c_d', 52, 11.0, 30, 4, -20)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=L, W=7.5, a0=a0, a1=a1, cup=0.6, ripple=0.45, tris=40, thick=0.9,
                                  root_r=1.6, shape=0.55, power=1.0, twist=tw)
    CORNERS[nm] = (lo, hi, root)

arm_r = tt.arm('arm_r', [(6.8, -0.8, 22.4), (9.8, -2.2, 23.0), (12.0, -3.4, 24.8)], hand=2.0, mitt=(-0.5, -0.6, 0.5))
arm_l = tt.arm('arm_l', [(-5.8, 0.6, 22.4), (-8.2, 2.6, 23.2), (-9.4, 4.8, 23.6)], hand=1.9)
feet = tt.feet('feet', RINGS)
# the pinwheel (kazaguruma): a bamboo stick up from the right hand, four curled paper blades on a pin
WHEEL = np.array((15.4, -5.2, 34.0))
st_pts = [tuple(np.array(arm_r[2]) + np.array((-0.25, 0.3, -1.6))), tuple(WHEEL + np.array((-0.4, 1.2, -1.2))), tuple(WHEEL + np.array((0, 1.3, 0)))]
stick_lo = tk.tube('stick', st_pts, 0.5, n=5, cap0='round', cap1='round')
stick_hi = tk.tube('stick_hi', st_pts, 0.5, n=10, cap0='round', cap1='round')
tk.subsurf(stick_hi, 1)
tk.set_region(stick_hi, 'stick')
bl_lo, bl_hi = [], []
for i in range(4):
    blade = [(0.0, 0.0), (6.6, 0.4), (6.0, 3.1), (0.8, 1.2)]
    for nm_, segs, lst in (('blade', 0, bl_lo), ('blade_hi', 2, bl_hi)):
        b_ = tk.slab(nm_, blade, 0.5, plane='XZ', bevel=0.12 if segs else 0, segs=1 if segs else 0)
        if segs:
            tk.subsurf(b_, 1)
        tk.deform(b_, lambda V: np.c_[V[:, 0], V[:, 1] - 0.16 * V[:, 2] ** 2 - 0.05 * V[:, 0] * V[:, 2], V[:, 2]])  # (the curl)
        tk.rotate(b_, 90 * i + 10, 'Y')
        tk.move(b_, tuple(WHEEL))
        lst.append(b_)
pin_hi = tk.lathe('wpin_hi', [(0, -0.4), (0.9, -0.3), (1.0, 0.3), (0.6, 0.7), (0, 0.8)], n=12, axis='Y', centre=tuple(WHEEL + np.array((0, -0.5, 0))))
tk.set_region(pin_hi, 'wpin')
for b_ in bl_hi:
    tk.set_region(b_, 'blade')
wheel_lo = tk.join(bl_lo + [tk.lathe('wpin', [(0, -0.4), (1.0, 0.0), (0, 0.8)], n=5, axis='Y', centre=tuple(WHEEL + np.array((0, -0.5, 0))))], 'wheel')
F.part('body', tk.join([body[0], knot[0], cord[0], str_lo, feet[0]], 'body'), body[1] + knot[1] + cord[1] + [str_hi] + feet[1])
F.part('arm_r', tk.join([arm_r[0], stick_lo], 'arm_r'), arm_r[1] + [stick_hi], bone='arm_r')
F.part('arm_l', arm_l[0], arm_l[1], bone='arm_l')
F.part('wheel', wheel_lo, bl_hi + [pin_hi], bone='wheel', sharp=60)
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
kit.eyepin(F, at=(KNOT[0] - 0.4, KNOT[1], KNOT[2] + 1.4), bone='root')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('arm_r', (6.8, -0.8, 22.4), parent='root')
    R.bone('arm_l', (-5.8, 0.6, 22.4), parent='root')
    R.bone('wheel', tuple(WHEEL), parent='arm_r')
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'arm_r', 'arm_l', 'wheel'] + list(CORNERS)
        # the pinwheel whirs the whole time it spins (and a bit after), the blown-back arm flaps
        for i, f in enumerate(range(4, 64, 3)):
            k('wheel', f, rot=('Y', -(i + 1) * 70.0 * min(1.0, 0.4 + i / 6)), ease='LINEAR')
        k('wheel', 70, rot=('Y', -1440), ease=('QUAD', 'EASE_OUT'))
        for i, f in enumerate(range(10, 50, 4)):
            k('arm_l', f, rot=('X', 12 if i % 2 else -4), ease='LINEAR')
        k('arm_l', 54)
        for b in bones:
            k(b, 0)
        # 0-8 it winds back (anticipation), then spins twice like a top, leaning into a precessing wobble
        k('root', 6, rot=('Z', 30), scale=(1.03, 0.96, 1.03))
        # (keys every 2 frames, never more than ~70 degrees apart: quaternion keys stay true to the turn)
        spin = []
        for f in range(8, 48, 2):
            q = (f - 6) / 40.0
            spin.append((f, 30 - 770 * (1 - (1 - q) ** 2.2)))
        spin[-1] = (46, -740)
        for i, (f, a) in enumerate(spin):
            lean = 5.0 * (1 - i / len(spin))
            k('root', f, rot=[('Z', a), ('X', lean * math.cos(math.radians(a * 0.5))), ('Y', lean * math.sin(math.radians(a * 0.5)))],
              ease='LINEAR' if i < len(spin) - 1 else None)
        # 46-70 dizzy: it wobbles round and settles (the turn ends at -720)
        for i, f in enumerate(range(50, 70, 4)):
            w = 6.0 * (1 - i / 5)
            k('root', f, rot=[('Z', -720), ('X', w * (1 if i % 2 else -1)), ('Y', w * 0.6)])
        k('root', 72, rot=('Z', -720))
        # the corners flutter in the wind of the spin
        for j, (nm, (lo, hi, root)) in enumerate(CORNERS.items()):
            ax = tuple(np.cross((0, 0, 1), np.array(root) * (1, 1, 0)))
            for i, f in enumerate(range(10 + j, 48, 3)):
                k(nm, f, rot=[(ax, (-16 if i % 2 else 6))], ease='LINEAR')
            k(nm, 52, rot=[(ax, 0)], ease='BACK')
        for b in bones:
            k(b, 78, rot=('Z', -720) if b == 'root' else None)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.2)
    STORM = pt.ramp('#5d9196', 7, shift=0.07)
    P.fill('cloth', STORM, tone=sh, base=0.1 * tk.smoothstep(20, 33, Z) - 0.14 * tk.smoothstep(8, 0, Z))
    P.fill('corner', STORM, tone=sh, base=0.14)
    # white wind curls: spirals (each a few turns of an Archimedean curl with a tail), printed round the cloth
    th = np.arctan2(Yc, X)
    face_zone = (Yc < -3) & (np.abs(X) < 9.0) & (Z < 15.5)
    curl = np.zeros_like(P.mask)
    for a0, z0, s_ in ((0.4, 25.0, 1.0), (2.3, 22.5, -1.0), (-2.6, 27.0, 1.0), (1.6, 8.0, 1.0), (-1.2 + math.pi, 6.0, -1.0), (3.4, 12.0, 1.0)):
        r0 = tt.ring_r(RINGS, z0)[0]
        du = (np.mod(th - a0 + math.pi, 2 * math.pi) - math.pi) * r0
        dv = Z - z0
        rr = np.hypot(du, dv)
        ang = np.arctan2(dv, du) * s_
        ph = np.mod(rr / 0.95 - ang / (2 * math.pi), 1.0)
        spiral = (np.abs(ph - 0.5) < 0.17) & (rr < 3.4)
        tail = (np.abs(dv + 3.0 * s_ * 0 - 0.15 * du) < 0.3) & (du > 0) & (du < 9.0) & (np.abs(dv) < 3.6) & (rr > 2.8)
        curl |= spiral | tail
    for r in ('cloth', 'corner'):
        P.fill(P.region(r) & curl & ~face_zone, pt.ramp('#e2efe9', 6, shift=0.05), tone=sh * 0.6, base=0.1)
    P.fill('cord', pt.ramp('#e7c64a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('hand', STORM, tone=sh, base=0.14)
    P.fill('stick', pt.ramp('#cdb07a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('wpin', pt.ramp('#e0b84a', 6, shift=0.05), tone=sh, base=0.1)
    bl = P.region('blade')
    ang = np.arctan2(P.Z - WHEEL[2], P.X - WHEEL[0])
    for j, col in enumerate(('#e2503f', '#f2c64a', '#4b8fd0', '#f4efe6')):
        P.fill(bl & (np.floor(np.mod(ang - math.radians(10), 2 * math.pi) / (math.pi / 2)) == j), pt.ramp(col, 6, shift=0.05), tone=sh, base=0.1)
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    # the face: blown about: the dots at two heights, a small round 'oh'
    import face
    fc = face.Face(P, c=FACE, axis=(0, -1, 0.1), where=P.region('cloth'), seed=41)
    fc.blush(10.4, -1.0, rx=2.0, ry=1.1, col='#e98f8c')
    fc.eyes('swirl', spread=7.0, size=0.8, dy=1.3, tilt=6.0)
    fc.mouth('wobble', w=3.0, dy=-1.7, du=-0.2)
    P.lines(['cloth', 'corner'], ['cord'], step=2)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin'), ('arm_r', 'body'), ('arm_l', 'body')] + [(c, 'body') for c in CORNERS], cam=((60, -84, 52), (2, 0, 20)),
       fold=(0, 16, 30, 56), frames=78)
