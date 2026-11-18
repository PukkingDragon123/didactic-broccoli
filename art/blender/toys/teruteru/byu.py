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
FACE = (0.0, -12.3, 8.4)

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

F.part('body', tk.join([body[0], knot[0], cord[0], str_lo], 'body'), body[1] + knot[1] + cord[1] + [str_hi])
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
kit.eyepin(F, at=(KNOT[0] - 0.4, KNOT[1], KNOT[2] + 1.4), bone='root')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root'] + list(CORNERS)
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
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    # the face: blown about: the dots at two heights, a small round 'oh'
    import face
    fc = face.Face(P, c=FACE, axis=(0, -1, 0.1), where=P.region('cloth'), seed=41)
    fc.blush(9.6, -1.1, rx=1.7, ry=1.0, col='#e98f8c')
    fc.eyes(5.4, 0.48, dy=1.1, tilt=10.0)
    fc.mouth('o', w=1.3, dy=-1.6, du=-0.3)
    P.lines(['cloth', 'corner'], ['cord'], step=2)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin')] + [(c, 'body') for c in CORNERS], cam=((60, -84, 52), (2, 0, 20)),
       fold=(0, 16, 30, 56), frames=78)
