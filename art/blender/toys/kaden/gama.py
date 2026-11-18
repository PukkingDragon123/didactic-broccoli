"""くろでんわガマ Dial-Phone Toad: a Shōwa moss-green dial telephone that is a toad (series kaden, concepts_C.md).

The squat bakelite body is the toad (warts and all), the handset lying across the top is its upper jaw, the two
cradle horns in front of it are its eye bumps, the rotary dial on the front slope is its pale belly, the rubber feet
are its splayed hands and folded hind legs. Under the handset is its mouth, and its tongue.
Gimmick: riiing (it rattles and hops on the spot), the handset-jaw lifts, the tongue flicks out and back, the jaw
shuts and the dial spins round and back.

    tools/blender.sh art/blender/toys/kaden/gama.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402
from mathutils import Vector  # noqa: E402

tk.reset()
F = Fig('kaden', 'gama')

Z0 = 3.0                       # the body's bottom (it sits on its feet)
TOP = 19.6                     # the top of the body (the handset rests on it)
HS_Y, HS_Z = 2.6, TOP + 3.0    # the handset's handle axis (along x)
HINGE = (0, 9.2, TOP + 0.6)    # the jaw's hinge at the back of the cradle (axis x)
DIAL_C = np.array((0, -13.2, 10.6))
DIAL_N = np.array((0, -math.cos(math.radians(38)), math.sin(math.radians(38))))
HORN = {sx: (sx * 10.8, -6.4, TOP + 2.2) for sx in (1, -1)}


# ------------------------------------------------------------------ the body: a squat phone, a squat toad
def rings():
    return [{'c': (0, 0.0, Z0), 'w': 37.0, 'h': 15.2, 'e': 3.2},
            {'c': (0, 0.2, Z0 + 3.0), 'w': 37.6, 'h': 15.6, 'e': 3.2},
            {'c': (0, 1.0, Z0 + 9.0), 'w': 35.0, 'h': 14.2, 'e': 3.0},
            {'c': (0, 2.2, TOP - 2.6), 'w': 30.0, 'h': 11.6, 'e': 2.8},
            {'c': (0, 2.8, TOP), 'w': 25.0, 'h': 9.4, 'e': 2.6}]


WARTS = []
rng = np.random.default_rng(7)
while len(WARTS) < 34:
    a = rng.uniform(0, 2 * math.pi)
    z = rng.uniform(Z0 + 3, TOP - 0.5)
    p = np.array((18.5 * math.cos(a), 1.0 + 15.0 * math.sin(a), z))
    if p[1] < -6 and abs(p[0]) < 12:   # (not on the dial's belly)
        continue
    WARTS.append((p, rng.uniform(0.9, 1.6)))


def sc_body(h):
    def f(V, N):
        d = np.zeros(len(V))
        side = N[:, 2] < 0.85
        for p, r in WARTS:  # warts: low round bumps, each pushed out from the surface nearest it
            dd = np.linalg.norm((V - p) * np.array((1, 1, 1.2)), axis=1)
            d += 0.55 * r * np.clip(1 - (dd / (r * 1.9)) ** 2, 0, 1) ** 2 * side * (np.abs(V[:, 0] - p[0]) < 6)
        # the cradle saddle on top: a shallow trough the handset lies in (the mouth's roof line)
        d -= 0.6 * tk.smoothstep(4.5, 0.5, np.abs(V[:, 1] - HS_Y)) * (N[:, 2] > 0.7) * (np.abs(V[:, 0]) < 9)
        # a lip line round the front just under the top: the toad's mouth
        d -= 0.3 * tk.smoothstep(0.45, 0.0, np.abs(V[:, 2] - (TOP - 2.4 + 0.012 * V[:, 0] ** 2))) * (V[:, 1] < -2) * (np.abs(V[:, 0]) < 13)
        return d
    tk.push(h, f)


body = tk.loft('body', rings(), n=24, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.6)
body_lo, body_hi = tk.lowhigh(body, 'body', lo=1, hi=3, sculpt=sc_body, region=('green', [
    ('mouth', lambda C, N: (N[:, 2] > 0.75) & (np.abs(C[:, 0]) < 10.5) & (C[:, 1] > -4.5) & (C[:, 1] < 6.4))]))
# the dial's seat: a round well in the front slope
for o in (body_lo, body_hi):
    well = tk.cyl('well', 9.4, -3.0, 3.0, n=24, at=(0, 0), axis='Z', bevel=0.4, segs=1)
    q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(DIAL_N)))
    tk.transform(well, q.to_matrix().to_4x4())
    tk.move(well, tuple(DIAL_C - DIAL_N * 1.2))
    tk.boolean(o, well)
tk.regions(body_hi, 'green', [('mouth', lambda C, N: (N[:, 2] > 0.75) & (np.abs(C[:, 0]) < 10.5) & (C[:, 1] > -4.5) & (C[:, 1] < 6.4)),
                              ('belly', lambda C, N: np.linalg.norm(C - (DIAL_C - DIAL_N * 1.2), axis=1) < 10.4)])
tk.decimate(body_lo, 470)

# the cradle horns: the eye bumps
HORNS = []
for sx in (1, -1):
    hx, hy, hz = HORN[sx]
    hn = tk.loft('horn', [{'c': (hx, hy, TOP - 3.0), 'w': 7.6, 'h': 3.6, 'e': 2.4},
                          {'c': (hx, hy - 0.2, hz), 'w': 7.0, 'h': 3.4, 'e': 2.4},
                          {'c': (hx * 1.02, hy - 0.2, hz + 2.4), 'w': 5.6, 'h': 2.8, 'e': 2.2}], n=12, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.6)
    HORNS.append(cx.low(hn, 'horn', 60, lo=1, hi=2, region='green'))

# ------------------------------------------------------------------ legs: splayed front hands, folded hind legs
LEGS = []
for sx in (1, -1):
    arm = tk.tube('arm', [(sx * 14.6, -8.0, Z0 + 5.6), (sx * 17.4, -10.8, Z0 + 2.2), (sx * 18.6, -12.6, 1.4)], [3.8, 3.2, 2.6], n=8)
    LEGS.append(cx.low(arm, 'arm', 40, lo=1, hi=1, region='green'))
    hand = tk.slab('hand', [(-0.2, 0.0), (-2.8, -2.6), (-2.0, -4.6), (-0.6, -3.0), (0.4, -5.4), (1.6, -3.0), (3.2, -4.2), (3.2, -1.8), (1.0, 0.8)], 1.6,
                   plane='XY', at=0.9, bevel=0.6, segs=1)
    if sx < 0:
        tk.scale(hand, (-1, 1, 1))
        tk.fix_normals(hand)
    tk.scale(hand, (1.4, 1.4, 1.0))
    tk.rotate(hand, sx * 18, 'Z')
    tk.move(hand, (sx * 18.8, -12.4, 0))
    LEGS.append(cx.low(hand, 'hand', 40, lo=1, hi=1, region='belly'))
    thigh = tk.loft('thigh', [{'c': (sx * 15.0, 3.0, Z0 + 5.5), 'w': 7.0, 'h': 4.6, 'e': 2.2},
                              {'c': (sx * 18.4, 4.6, Z0 + 4.4), 'w': 8.4, 'h': 5.8, 'e': 2.2},
                              {'c': (sx * 20.6, 6.6, Z0 + 2.2), 'w': 7.4, 'h': 5.0, 'e': 2.2}], n=10, up=(0, -1, 0), cap0='round', cap1='round', capd=1.8)
    LEGS.append(cx.low(thigh, 'thigh', 60, lo=1, hi=2, region='green'))
    foot = tk.slab('foot', [(0.0, 3.0), (-2.6, -1.8), (-1.2, -4.0), (0.6, -1.6), (2.2, -4.6), (3.0, -1.4), (4.8, -2.8), (3.6, 1.6)], 1.6,
                   plane='XY', at=0.9, bevel=0.6, segs=1)
    if sx < 0:
        tk.scale(foot, (-1, 1, 1))
        tk.fix_normals(foot)
    tk.scale(foot, (1.3, 1.3, 1.0))
    tk.rotate(foot, sx * 40, 'Z')
    tk.move(foot, (sx * 21.6, 3.4, 0))
    LEGS.append(cx.low(foot, 'foot', 40, lo=1, hi=1, region='belly'))

# ------------------------------------------------------------------ the handset: the upper jaw
hs = tk.loft('handset', [{'c': (-19.0, HS_Y, HS_Z - 0.6), 'w': 9.6, 'ht': 2.6, 'hb': 3.2, 'e': 2.4},
                         {'c': (-15.0, HS_Y, HS_Z), 'w': 11.2, 'ht': 3.4, 'hb': 3.6, 'e': 2.6},
                         {'c': (-9.0, HS_Y, HS_Z + 0.9), 'w': 7.4, 'ht': 2.4, 'hb': 2.0, 'e': 2.8},
                         {'c': (0.0, HS_Y, HS_Z + 1.4), 'w': 7.0, 'ht': 2.4, 'hb': 2.0, 'e': 2.8},
                         {'c': (9.0, HS_Y, HS_Z + 0.9), 'w': 7.4, 'ht': 2.4, 'hb': 2.0, 'e': 2.8},
                         {'c': (15.0, HS_Y, HS_Z), 'w': 11.2, 'ht': 3.4, 'hb': 3.6, 'e': 2.6},
                         {'c': (19.0, HS_Y, HS_Z - 0.6), 'w': 9.6, 'ht': 2.6, 'hb': 3.2, 'e': 2.4}], n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)


def sc_hs(h):
    def f(V, N):  # the earpiece and mouthpiece grilles underneath each end: rings of holes
        d = np.zeros(len(V))
        for ex in (-16.0, 16.0):
            r = np.hypot(V[:, 0] - ex, V[:, 1] - HS_Y)
            d -= 0.35 * ((np.abs(r - 2.2) < 0.35) | (r < 0.6)) * (N[:, 2] < -0.6)
        return d
    tk.push(h, f)


hs_lo, hs_hi = cx.low(hs, 'handset', 200, lo=1, hi=2, sculpt=sc_hs, region='green')

# the tongue: lies in the mouth under the handset, flicks out forward
TONGUE_P = (0, 6.0, TOP - 0.2)
tongue = tk.loft('tongue', [{'c': (0, 6.4, TOP - 0.3), 'w': 5.6, 'ht': 0.5, 'hb': 0.4, 'e': 2.2},
                            {'c': (0, 1.0, TOP - 0.4), 'w': 6.0, 'ht': 0.6, 'hb': 0.4, 'e': 2.2},
                            {'c': (0, -3.0, TOP - 0.6), 'w': 5.2, 'ht': 0.5, 'hb': 0.4, 'e': 2.2}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
tongue_lo, tongue_hi = cx.low(tongue, 'tongue', 40, lo=1, hi=2, region='tongue')

# the dial: the finger wheel over a cream number card
dial = tk.lathe('dial', [(0, -0.4), (8.6, -0.4), (8.8, 0.6), (8.2, 1.4), (3.4, 1.4), (3.0, 1.9), (0, 2.0)], n=24)


def sc_dial(h):
    def f(V, N):  # ten finger holes round the wheel (the finger stop at the bottom right)
        d = np.zeros(len(V))
        for i in range(10):
            a = math.radians(60 + i * 26)
            c = np.array((5.7 * math.cos(a), 5.7 * math.sin(a), 1.4))
            d -= 0.9 * np.clip(1 - (np.linalg.norm(V - c, axis=1) / 1.45) ** 2, 0, 1) ** 0.5
        return d
    tk.push(h, f)


dial_lo, dial_hi = cx.low(dial, 'dial', 120, lo=0, hi=3, sculpt=sc_dial, region='dial')
q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(DIAL_N)))
for o in (dial_lo, dial_hi):
    tk.transform(o, q.to_matrix().to_4x4())
    tk.move(o, tuple(DIAL_C - DIAL_N * 0.9))

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body_lo] + [h[0] for h in HORNS] + [l[0] for l in LEGS], 'body'), [body_hi] + [h[1] for h in HORNS] + [l[1] for l in LEGS], bone='root', kind='gloss')
F.part('handset', hs_lo, [hs_hi], bone='jaw', kind='gloss')
F.part('tongue', tongue_lo, [tongue_hi], bone='tongue')
F.part('dial', dial_lo, [dial_hi], bone='dial', kind='gloss')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('jaw', HINGE, parent='root')
    R.bone('tongue', TONGUE_P, parent='root')
    R.bone('dial', tuple(DIAL_C), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'jaw', 'tongue', 'dial']
    dn = tuple(DIAL_N)
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # riiing: it rattles and hops on the spot, the handset jiggles in its cradle
        for i, f in enumerate(range(2, 26, 2)):
            k('root', f, move=(0, 0, 1.0 if i % 2 else 0.0), rot=('Y', 2.5 if i % 4 == 1 else (-2.5 if i % 4 == 3 else 0)))
            k('jaw', f, rot=('X', -3 if i % 2 else 0))
        k('root', 27)
        k('jaw', 27)
        # moshi moshi: the handset-jaw lifts, the tongue flicks out and back
        k('jaw', 33, rot=('X', -38), ease='BACK')
        k('jaw', 50, rot=('X', -38))
        k('jaw', 55, ease='BOUNCE')
        k('tongue', 33)
        k('tongue', 37, move=(0, -9.5, 1.6), rot=('X', 20), ease='BACK')
        k('tongue', 42, move=(0, -9.5, 1.6), rot=('X', 20))
        k('tongue', 47)
        # and dials: the finger wheel goes round and springs back
        k('dial', 56)
        k('dial', 66, rot=[(dn, -210)])
        k('dial', 76, ease='BACK')
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.3, cav=1.1)
    GREEN = pt.ramp('#7f9a4e', 7, shift=0.07)
    air = 0.18 * tk.smoothstep(Z0 + 8, TOP + 4, Z) - 0.22 * tk.smoothstep(Z0 + 5, Z0, Z)
    P.fill('green', GREEN, tone=sh, base=air)
    hsm = P.part == 1
    P.fill(P.region('green') & hsm, GREEN, tone=free, base=0.12)
    # warts: a darker olive spot on each, a pale tip
    for p, r in WARTS:
        d = np.linalg.norm((P.pos - p) * np.array((1, 1, 1.2)), axis=2)
        P.tint(P.region('green') & (P.part == 0) & (d < r * 1.25), pt.ramp('#5e7434', 6, shift=0.06), sh + 0.05)
        P.tint(P.region('green') & (P.part == 0) & (d < r * 0.45), pt.ramp('#b7c47a', 6, shift=0.06), sh + 0.1)
    # back stripes: a toad's darker bands on the handset
    P.tint(P.region('green') & hsm & (on[:, :, 2] > 0.3) & (np.abs(np.mod(X + 2.0, 8.0) - 4.0) < 1.2) & (np.abs(X) < 12), pt.ramp('#5e7434', 6, shift=0.06), free + 0.05)
    P.fill('belly', pt.ramp('#ece0b8', 7, shift=0.06), tone=sh, base=0.1)
    P.fill('mouth', pt.ramp('#c8484e', 6, shift=0.06), tone=sh, base=-0.05)
    P.fill('tongue', pt.ramp('#ec8a94', 6, shift=0.06), tone=free, base=0.1)
    # the dial: a clear-grey finger wheel, the cream number card in the middle with its hand-printed digits round it
    dm = P.region('dial')
    P.fill('dial', pt.ramp('#c4c8c4', 7, dark=0.6, light=0.6, shift=0.05), tone=free * 1.3, base=0.1)
    U, V, W, a = P.frame(tuple(DIAL_C), tuple(DIAL_N))
    rr = np.hypot(U, V)
    P.flat(dm & (rr < 3.2) & (W > 0.6), '#efe6cc')
    for i in range(10):
        ang = math.radians(60 + i * 26)
        hc = np.hypot(U - 5.7 * math.cos(ang), V - 5.7 * math.sin(ang))
        P.flat(dm & (hc < 1.2), '#2c3026')
        P.flat(dm & (hc < 0.42), '#efe6cc')
    # the face, drawn on by hand: an ink dot on the front of each eye bump (set wide apart), a wide toad grin under them
    for sx in (1, -1):
        hx, hy, hz = HORN[sx]
        fc = face.Face(P, c=(hx, hy - 2.6, hz + 1.2), axis=(sx * 0.2, -1, 0.35), where=P.region('green') & (P.part == 0) & (Z > TOP - 1), seed=31 + sx)
        fc.dot(0.0, 0.0, 0.78, 1.0, rot=10 * sx)
    fm = face.Face(P, c=(0, -9.0, TOP - 2.6), axis=(0, -1, 0.3), where=P.region('green') & (P.part == 0), seed=37)
    fm.mouth('upturn', w=15.0, dy=-0.2, side=-1, weight=0.5)
    fm.blush(17.0, -1.6, rx=1.8, ry=0.9)
    P.lines(['green'], ['belly', 'mouth', 'dial'], step=2)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('dial', 'body'), ('tongue', 'body')]),
       cams=[((66, -80, 50), (0, -2, 12)), ((-62, 70, 46), (0, 0, 12))], fold=(0, 12, 38, 64))
