"""パチンワニ Snap Croc: a Shōwa desk stapler that is a crocodile (series henshin, art/blender/toys/concepts.md).

The top arm is the snout (its staple magazine and the staples are the upper teeth), the base is the lower jaw and
belly (the anvil sits on its tongue), the eye knobs sink into the arm, the four stubby legs swing in under the base
and the jointed tail telescopes into the back of the base under the hinge. Rest pose: the crocodile, jaw ajar.
Gimmick: it hops, folds itself into a stapler, gives one stapler 'pachin', then springs back out and chomps.

    tools/blender.sh art/blender/toys/henshin/wani.py [--preview] [--fold] [--fast]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
from mathutils import Vector  # noqa: E402
from fig import Fig  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('henshin', 'wani')

K = 0.88                    # the stapler's length scale (a chunky Shōwa desk stapler)
B0 = 4.0                    # the base stands this high on its legs in the creature pose
JAW_OPEN = 15.0             # rest pose: the jaw ajar (degrees)


def Y(y):
    return y * K


HINGE = (0, Y(23.6), B0 + 8.6)  # the arm's pivot (axis X)


# ------------------------------------------------------------------ the base: lower jaw, belly, tongue
def base_rings():
    z = B0 + 2.9
    return [
        {'c': (0, Y(-28.4), z + 0.5), 'w': 8.4, 'ht': 2.0, 'hb': 2.3, 'e': 2.6},   # the chin, tipped up a little
        {'c': (0, Y(-26.2), z + 0.2), 'w': 11.6, 'ht': 2.6, 'hb': 2.8, 'e': 3.0},
        {'c': (0, Y(-19), z), 'w': 12.4, 'ht': 2.7, 'hb': 2.9, 'e': 3.2},
        {'c': (0, Y(-6), z), 'w': 13.2, 'ht': 2.7, 'hb': 2.9, 'e': 3.3},
        {'c': (0, Y(8), z), 'w': 14.4, 'ht': 2.7, 'hb': 2.9, 'e': 3.3},
        {'c': (0, Y(20), z), 'w': 14.8, 'ht': 2.7, 'hb': 2.9, 'e': 3.3},
        {'c': (0, Y(26.6), z), 'w': 13.6, 'ht': 2.6, 'hb': 2.8, 'e': 3.0},
    ]


def sculpt_base(h):
    def f(V, N):
        # the belly's ventral scale rows: shallow grooves across the underside and up the sides
        under = tk.smoothstep(0.2, -0.6, N[:, 2])
        rows = 0.2 * (np.abs(np.sin(V[:, 1] * math.pi / 2.4)) ** 8) * under
        # a gum ridge along the rim inside the mouth, where the teeth sit
        rim = 0.35 * tk.smoothstep(1.2, 0.0, np.abs(np.abs(V[:, 0]) - 5.5)) * tk.smoothstep(0.4, 0.9, N[:, 2]) * (V[:, 1] < Y(14))
        return -rows + rim
    tk.push(h, f)


TOP = B0 + 5.6  # the base's top (the tongue)
cage = tk.loft('base', base_rings(), n=16, cap0='round', cap1='round')
base_lo, base_hi = tk.lowhigh(cage, 'base', lo=1, hi=3, tris=170, sculpt=sculpt_base, region=(
    'jaw', [('mouth', lambda C, N: (N[:, 2] > 0.55) & (C[:, 1] < Y(16)) & (np.abs(C[:, 0]) < 6.0))]))
LEG_Y = (Y(-10.6), Y(9.0))


def hollow(o):
    """The stapler base is hollow underneath (as a real one is): the legs fold up into it through notches in its
    sides and the tail slides in at the back, so nothing passes through anything."""
    tk.boolean(o, tk.rbox('cavity', (11.2, 61.0, 6.8), centre=(0, 9.5, B0 + 0.4), bevel=0.6, segs=1))
    for y in LEG_Y:
        for sx in (1, -1):
            tk.boolean(o, tk.rbox('notch', (5.0, 6.4, 6.9), centre=(sx * 7.0, y, B0 + 0.45), bevel=0.5, segs=1))
    tk.regions(o, 'jaw', [('mouth', lambda C, N: (N[:, 2] > 0.55) & (C[:, 1] < Y(16)) & (np.abs(C[:, 0]) < 6.0) & (C[:, 2] > B0 + 5)),
                          ('inner', lambda C, N: (C[:, 2] < B0 + 3.95) & (np.abs(C[:, 0]) < 6.4) & (N[:, 2] < 0.9))])


hollow(base_lo)
hollow(base_hi)
tk.decimate(base_lo, 290)


def teeth(nm, x, y0, y1, n, zroot, h, big=(), slope=0.0, sink=1.2):
    """A row of n chunky teeth along y (y0 -> y1) at x, roots at zroot (+ slope * (y - y0)), h > 0 up, h < 0 down.
    Game mesh: plain pointed teeth; sculpt: rounded cones with blunt tips."""
    L = (y1 - y0) / n
    s_ = 1 if h > 0 else -1
    zr = lambda y: zroot + slope * (y - y0)

    def outline(fine):
        pts = []
        for i in range(n):
            ya, yb = y0 + i * L, y0 + (i + 1) * L
            yc = (ya + yb) / 2
            hh = h * (1.3 if i in big else (1.0, 0.82, 1.08, 0.9, 1.12, 0.86)[i % 6])
            if fine:
                pts += [(ya, zr(ya)), (yc - L * 0.3, zr(yc) + hh * 0.55), (yc - L * 0.14, zr(yc) + hh * 0.9),
                        (yc, zr(yc) + hh), (yc + L * 0.14, zr(yc) + hh * 0.9), (yc + L * 0.3, zr(yc) + hh * 0.55)]
            else:
                pts += [(ya, zr(ya)), (yc, zr(yc) + hh)]
        pts.append((y1, zr(y1)))
        pts += [(y1, zr(y1) - s_ * sink), (y0, zr(y0) - s_ * sink)]
        return pts[::-1] if s_ < 0 else pts
    lo = tk.slab(nm, outline(False), 1.5, plane='YZ', at=x, bevel=0, segs=0)
    hi = tk.slab(nm + '_hi', outline(True), 1.7, plane='YZ', at=x, bevel=0.55, segs=3)
    tk.set_region(hi, 'tooth')
    return lo, hi


# teeth show even when the stapler is shut: a crocodile's grin
teeth_lo, teeth_hi = [], []
for sx in (1, -1):
    lo, hi = teeth('lteeth', sx * 5.75, Y(-25.6), Y(2.0), 7, TOP - 0.45, 1.45, big=(1,))
    teeth_lo.append(lo)
    teeth_hi.append(hi)

hinge = tk.rbox('hinge', (12.6, 6.4, 6.0), centre=(0, Y(23.9), B0 + 6.8), bevel=1.6, segs=3)
hinge_lo, hinge_hi = tk.lowhigh(hinge, 'hinge', lo=0, hi=1, region='green')
tk.decimate(hinge_lo, 50)
pin = tk.cyl('pin', 1.7, -7.6, 7.6, n=12, at=(HINGE[1], HINGE[2]), axis='X', bevel=0.35, segs=2)
pin_lo, pin_hi = tk.lowhigh(pin, 'pin', lo=0, hi=0, region='chrome')
tk.decimate(pin_lo, 28)

ANVIL = [(-3.6, Y(-26.0)), (3.6, Y(-26.0)), (4.0, Y(-14.0)), (-4.0, Y(-14.0))]
anvil_hi = tk.slab('anvil_hi', ANVIL, 0.7, plane='XY', at=TOP - 0.2, bevel=0.22, segs=2)
tk.set_region(anvil_hi, 'chrome')
tk.boolean(anvil_hi, tk.rbox('groove', (4.6, 1.3, 1.0), centre=(0, Y(-21.5), TOP + 0.3), bevel=0.3, segs=2))
anvil_lo = tk.slab('anvil', ANVIL, 0.7, plane='XY', at=TOP - 0.2, bevel=0, segs=0)


# ------------------------------------------------------------------ the arm: snout, hump, magazine, upper teeth
def arm_rings():
    R = [(-28.8, 7.8, 9.3, 2.2, 1.6, 2.4), (-26.8, 10.8, 9.8, 3.4, 2.0, 2.6),  # the nostril bulb
         (-22.6, 10.0, 9.7, 2.9, 2.2, 2.8),  # the dip behind it
         (-14.2, 11.8, 10.2, 3.6, 2.5, 3.0), (-3.0, 13.2, 10.9, 4.4, 2.8, 3.1), (7.0, 14.4, 11.8, 5.5, 3.1, 3.2),
         (15.0, 15.0, 12.4, 6.3, 3.3, 3.2), (20.8, 14.6, 12.4, 5.8, 3.3, 3.0), (24.8, 12.4, 12.0, 4.2, 3.0, 2.7)]
    return [{'c': (0, Y(y), B0 + z), 'w': w, 'ht': ht, 'hb': hb, 'e': e} for y, w, z, ht, hb, e in R]


# osteoderm plates: two neat rows down the snout, four rows over the hump behind the eyes
SCUTES = [(sx * 1.9, Y(y), 0.3) for y in np.arange(-17.0, 7.0, 3.2) for sx in (1, -1)] + \
         [(sx * x, Y(y), 0.42) for y in np.arange(18.6, 25.5, 2.6) for x in (1.8, 4.7) for sx in (1, -1)]


def sculpt_arm(h):
    def f(V, N):
        up = tk.smoothstep(0.3, 0.75, N[:, 2])
        d = np.zeros(len(V))
        for x, y, hh in SCUTES:
            q = ((np.abs(V[:, 0] - x) / 1.15) ** 4 + (np.abs(V[:, 1] - y) / 1.1) ** 4) ** 0.25
            d = np.maximum(d, hh * tk.smoothstep(1.0, 0.75, q))
        nk = tk.bump(V, (0, Y(-26.6), B0 + 13.0), 3.0, 0.45)  # the nostril knob
        # the jaw line: a crocodile's 'smile' crease along the lower edge of the snout
        side = tk.smoothstep(0.6, 0.95, np.abs(N[:, 0]))
        smile = -0.22 * side * tk.smoothstep(0.55, 0.0, np.abs(V[:, 2] - (B0 + 9.0 + 0.045 * (V[:, 1] + 28))))
        return up * d + nk + smile
    tk.push(h, f)
    for sx in (1, -1):  # nostrils: two little pits on the knob
        tk.boolean(h, tk.rbox('nos', (1.0, 1.4, 2.0), centre=(sx * 1.25, Y(-26.9), B0 + 13.2), bevel=0.45, segs=2))


cage = tk.loft('arm', arm_rings(), n=16, cap0='round', cap1='round')
arm_lo, arm_hi = tk.lowhigh(cage, 'arm', lo=1, hi=3, tris=250, sculpt=sculpt_arm, region=(
    'green', [('lip', lambda C, N: (C[:, 2] < B0 + 9.3 + 0.045 * (C[:, 1] + 28)) & (N[:, 2] > -0.5)),
              ('mouth', lambda C, N: N[:, 2] <= -0.5)]))

for sx in (1, -1):  # the eye knobs' sockets: they sink into these for the stapler
    for o in (arm_lo, arm_hi):
        tk.boolean(o, tk.loft('socket', [{'c': (sx * 4.6, Y(12.6) - 0.1, B0 + z), 'w': 9.0, 'h': 3.8, 'e': 2.3} for z in (10.4, 22.0)],
                              n=12, up=(0, -1, 0), cap0='flat', cap1='flat'))
tk.decimate(arm_lo, 256)
mag = tk.rbox('magazine', (8.0, 40.0 * K, 1.8), centre=(0, Y(-6.0), B0 + 7.7), bevel=0.5, segs=2)
mag_lo, mag_hi = tk.lowhigh(mag, 'magazine', lo=0, hi=1, region='chrome')
tk.decimate(mag_lo, 36)
up_teeth_lo, up_teeth_hi = [], []
for sx in (1, -1):
    lo, hi = teeth('uteeth', sx * 4.9, Y(-27.4), Y(3.6), 8, B0 + 8.9, -1.45, big=(0, 2), slope=0.05)
    up_teeth_lo.append(lo)
    up_teeth_hi.append(hi)

# ------------------------------------------------------------------ eye knobs (they sink into the arm for the stapler)
EYE = {}
for sx, nm in ((1, 'eye_l'), (-1, 'eye_r')):
    top = B0 + 18.4
    c = (sx * 4.5, Y(12.6), top)
    t = tk.loft(nm, [{'c': (c[0], c[1] + 0.6, top - 3.0), 'w': 7.8, 'h': 2.9, 'e': 2.3},
                     {'c': (c[0], c[1] + 0.4, top + 1.0), 'w': 7.4, 'h': 2.7, 'e': 2.4},
                     {'c': (c[0] + sx * 0.2, c[1] + 0.3, top + 3.2), 'w': 6.4, 'h': 2.3, 'e': 2.6, 'tw': 0.9}],
                n=12, up=(0, -1, 0), cap0='flat', cap1=1.2)
    ax = np.array([sx * 0.26, -0.92, 0.3])
    ax /= np.linalg.norm(ax)
    ec = np.array(c) + np.array([sx * 0.55, -1.6, 1.0])  # the eyeball's centre: a big bead in the front of the knob

    def sc_eye(h, sx=sx, c=c, top=top):
        def f(V, N):
            # the heavy brow: a ridge over the eyeball, angled down toward the snout (a sly, sleepy look)
            brow = tk.bump(V, (c[0] + sx * 0.9, c[1] - 0.6, top + 3.6), 2.8, 0.7, sharp=1.5)
            crease = -0.3 * tk.smoothstep(0.9, 0.0, np.abs(V[:, 2] - (top - 1.6)))
            return brow + crease
        tk.push(h, f)
    lo, hi = tk.lowhigh(t, nm, lo=1, hi=3, tris=42, sculpt=sc_eye, region="eye")

    def bead(name, n, lv):
        b = tk.lathe(name, [(0, -1.7), (2.0, -1.25), (2.75, 0.0), (2.0, 1.25), (0.0, 1.7)], n=n)
        q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(ax)))
        tk.transform(b, q.to_matrix().to_4x4())
        tk.move(b, tuple(ec))
        tk.subsurf(b, lv)
        return b
    ball_hi = bead(nm + '_ball_hi', 16, 2)
    tk.set_region(ball_hi, 'eyeball')
    ball_lo = bead(nm + '_ball', 8, 0)
    EYE[nm] = (tk.join([lo, ball_lo], nm), [hi, ball_hi], tuple(ec), tuple(ax))


# ------------------------------------------------------------------ legs: stubby, sprawled, clawed
def leg(nm, y, sx, rear):
    """A stubby sprawled leg, straight from the hip inside the hollow base out through its notch to a broad clawed foot
    (straight, so it folds flat along the inside of the base)."""
    s = sx
    sh = np.array((s * 2.8, y, B0 + 1.8))  # the hip: inside the hollow base, behind the notch
    d = np.array((s * math.cos(math.radians(35)), 0, -math.sin(math.radians(35))))
    pts = [sh + d * t for t in (0.0, 3.0, 6.0, 8.0)]
    limb = tk.loft(nm + '_limb', [{'c': tuple(p), 'w': w, 'h': h, 'e': 2.3} for p, w, h in zip(pts, (4.4, 4.3, 3.9, 3.6), (1.55, 1.5, 1.4, 1.35))],
                   n=8, cap0='round', cap1='round')
    end = pts[-1]
    ft = tk.loft(nm + '_foot', [
        {'c': (end[0] + s * 0.6, y + 1.4, 0.95), 'w': 4.0, 'ht': 0.95, 'hb': 0.85, 'e': 2.4},
        {'c': (end[0] + s * 0.9, y - 0.8, 0.85), 'w': 5.0, 'ht': 0.85, 'hb': 0.8, 'e': 2.6},
        {'c': (end[0] + s * 1.0, y - 2.9, 0.65), 'w': 5.4, 'ht': 0.6, 'hb': 0.6, 'e': 3.2},
    ], n=8, cap0='round', cap1=1.0)
    toes = []  # (sculpt only: baked into the foot)
    ntoe = 4 if rear else 5
    for k in range(ntoe):
        a = math.radians(-34 + 68 * k / (ntoe - 1)) * s
        bx, by = end[0] + s * 1.0 + math.sin(a) * 1.7, y - 2.2
        dx, dy = math.sin(a), -math.cos(a)
        L = 1.9 + (0.4 if 0 < k < ntoe - 1 else 0)
        t = tk.tube(nm + f'_toe{k}', [(bx, by, 0.7), (bx + dx * L * 0.6, by + dy * L * 0.6, 0.62), (bx + dx * L, by + dy * L, 0.42)],
                    [0.7, 0.56, 0.08], n=8, cap0='round', cap1='point')
        tk.subsurf(t, 2)
        tk.set_region(t, 'claw')
        toes.append(t)

    def sc_limb(h):
        def f(V, N):  # scaly bands round the leg and a knuckle ridge (baked)
            u = (V - sh) @ d
            return -0.12 * (np.abs(np.sin(u * 2.4)) ** 6)
        tk.push(h, f)
    l0, h0 = tk.lowhigh(limb, nm + '_limb', lo=1, hi=3, tris=40, sculpt=sc_limb, region=('leg', [('belly', lambda C, N: N[:, 2] < -0.5)]))
    l1, h1 = tk.lowhigh(ft, nm + '_foot', lo=1, hi=3, tris=26, region='leg')
    return tk.join([l0, l1], nm), [h0, h1] + toes, tuple(sh)


LEGS = {}
for nm, y, sx, rear in (('leg_fl', LEG_Y[0], 1, False), ('leg_fr', LEG_Y[0], -1, False), ('leg_bl', LEG_Y[1], 1, True), ('leg_br', LEG_Y[1], -1, True)):
    LEGS[nm] = leg(nm, y, sx, rear)

# ------------------------------------------------------------------ the tail: three telescoping segments, curling
TAIL_PTS = [(0, Y(24.0), B0 + 1.65), (0, Y(24.0) + 6.6, B0 + 1.2), (1.4, Y(24.0) + 12.4, B0 + 0.3), (4.8, Y(24.0) + 16.8, 3.3),
            (9.4, Y(24.0) + 19.0, 2.6), (13.8, Y(24.0) + 18.4, 1.9), (17.0, Y(24.0) + 15.8, 1.3)]
TAIL_W = [9.6, 8.6, 7.2, 5.7, 4.3, 2.9, 1.0]
TAIL_H = [1.8, 1.75, 1.7, 1.6, 1.4, 1.1, 0.5]


def sculpt_tail(h):
    P = np.array(TAIL_PTS)

    def f(V, N):
        up = tk.smoothstep(0.3, 0.85, N[:, 2])
        d = np.zeros(len(V))
        for i in range(len(P) - 1):  # the caudal crests: a double row, closing to one toward the tip
            for t in np.linspace(0, 1, 3, endpoint=False):
                c = P[i] * (1 - t) + P[i + 1] * t
                tang = (P[i + 1] - P[i]) / np.linalg.norm(P[i + 1] - P[i])
                side = np.cross([0, 0, 1], tang)
                w = TAIL_W[i] * (1 - t) + TAIL_W[i + 1] * t
                for sxx in (1, -1):
                    cc = c + side * sxx * w * 0.18
                    r = np.linalg.norm(V[:, :2] - cc[:2], axis=1)
                    d = np.maximum(d, (0.25 + 0.05 * w) * np.clip(1 - (r / (0.3 + w * 0.11)) ** 2, 0, 1))
        return up * d
    tk.push(h, f)


TAIL = []
for k, (i0, i1) in enumerate(((0, 2), (2, 4), (4, 6))):
    rings = []
    for i in range(i0, i1 + 1):
        p = np.array(TAIL_PTS[i], float)
        w, hh = TAIL_W[i], TAIL_H[i]
        if i == i0 and k > 0:  # each segment starts a little inside the one before (a jointed toy's sleeve)
            p = p * 0.8 + np.array(TAIL_PTS[i - 1]) * 0.2
            w, hh = w * 0.9, hh * 0.9
        rings.append({'c': tuple(p), 'w': w, 'ht': hh * 1.05, 'hb': hh, 'e': 2.5})
    t = tk.loft(f'tail{k + 1}', rings, n=10, cap0='round', cap1='point' if k == 2 else 'round')
    lo, hi = tk.lowhigh(t, f'tail{k + 1}', lo=1, hi=3, tris=52 if k < 2 else 34, sculpt=sculpt_tail, region=(
        'skin', [('belly', lambda C, N: N[:, 2] < -0.35)]))
    TAIL.append((lo, hi, TAIL_PTS[i0]))

# ------------------------------------------------------------------ the creature pose: the jaw ajar
JAWED = [arm_lo, arm_hi, mag_lo, mag_hi] + up_teeth_lo + up_teeth_hi + [EYE[k][0] for k in ('eye_l', 'eye_r')] + \
        [h for k in ('eye_l', 'eye_r') for h in EYE[k][1]]
for o in JAWED:
    tk.rotate(o, -JAW_OPEN, 'X', HINGE)

# ------------------------------------------------------------------ parts
F.part('base', tk.join([base_lo] + teeth_lo, 'base'), [base_hi] + teeth_hi, bone='root')
F.part('hinge', hinge_lo, [hinge_hi], bone='root', sharp=40, uvw=0.8)
F.part('pin', pin_lo, [pin_hi], bone='root', kind='metal', sharp=40, uvw=0.6)
F.part('anvil', anvil_lo, [anvil_hi], bone='root', kind='metal', sharp=40, uvw=0.6)
F.part('arm', tk.join([arm_lo] + up_teeth_lo, 'arm'), [arm_hi] + up_teeth_hi, bone='jaw')
F.part('magazine', mag_lo, [mag_hi], bone='jaw', kind='metal', sharp=40, uvw=0.6)
for nm in ('eye_l', 'eye_r'):
    F.part(nm, EYE[nm][0], EYE[nm][1], bone=nm)
for nm, (lo, highs, sh) in LEGS.items():
    F.part(nm, lo, highs, bone=nm)
for k, (lo, hi, p0) in enumerate(TAIL):
    F.part(f'tail{k + 1}', lo, [hi], bone=f'tail{k + 1}')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})

OUT = os.path.join(F.out, 'wani')


# ------------------------------------------------------------------ rig and the gimmick clip
def jawed(p):
    """A point of the arm in the rest (jaw ajar) pose."""
    v = Vector(p) - Vector(HINGE)
    v.rotate(__import__('mathutils').Matrix.Rotation(math.radians(-JAW_OPEN), 3, 'X'))
    return tuple(v + Vector(HINGE))


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, Y(0), B0 + 2.9))
    R.bone('jaw', HINGE, parent='root')
    for nm in ('eye_l', 'eye_r'):
        sx = 1 if nm == 'eye_l' else -1
        R.bone(nm, jawed((sx * 4.5, Y(12.6), B0 + 15.4)), parent='jaw')
    for nm, (lo, highs, sh) in LEGS.items():
        R.bone(nm, sh, parent='root')
    R.bone('tail1', TAIL_PTS[0], parent='root')
    R.bone('tail2', TAIL_PTS[2], parent='tail1')
    R.bone('tail3', TAIL_PTS[4], parent='tail2')
    for p in F.parts:
        R.attach(p.low, p.bone)
    up = Vector((0, math.sin(math.radians(JAW_OPEN)), math.cos(math.radians(JAW_OPEN))))  # the arm's 'up' at rest
    sink = {'eye_l': tuple(-4.3 * up), 'eye_r': tuple(-4.3 * up)}  # straight down into their sockets
    legs = {'leg_fl': 1, 'leg_bl': 1, 'leg_fr': -1, 'leg_br': -1}
    LOW = B0  # the base comes down flat on the desk: the legs are folded up inside it
    # a leg tucks in under the base through its notch, then lies forward along the hollow, clear of the tail
    # a leg swings forward along the side (it slopes under the wall), then lifts flat into the hollow
    FZ, FX = float(os.environ.get('FOLD_Z', 80)), float(os.environ.get('FOLD_X', 35))
    TUCK = {nm: [('Z', -sx * FZ)] for nm, sx in {'leg_fl': 1, 'leg_bl': 1, 'leg_fr': -1, 'leg_br': -1}.items()}
    FOLD = {nm: [('Z', -sx * FZ), ('X', -FX)] for nm, sx in {'leg_fl': 1, 'leg_bl': 1, 'leg_fr': -1, 'leg_br': -1}.items()}

    # the tail straightened (each segment turned back onto the one before it) and telescoped into the base
    def tdir(a, b):
        d = np.array(TAIL_PTS[b]) - np.array(TAIL_PTS[a])
        return math.degrees(math.atan2(d[0], d[1])), math.degrees(math.atan2(d[2], math.hypot(d[0], d[1])))
    (y1, p1), (y2, p2), (y3, p3) = tdir(0, 2), tdir(2, 4), tdir(4, 6)
    T_ROT = {'tail1': [('Z', y1), ('X', -p1)], 'tail2': [('Z', y2 - y1), ('X', p1 - p2)], 'tail3': [('Z', y3 - y2), ('X', p2 - p3)]}
    from mathutils import Quaternion

    def Q(rots):
        q = Quaternion()
        for ax, deg in rots:
            q = Quaternion({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[ax], math.radians(deg)) @ q
        return q
    q1 = Q(T_ROT['tail1'])
    q2 = q1 @ Q(T_ROT['tail2'])
    # a child's slide is in its parent's turned frame: give it in figure space along the straightened tail
    T_IN = {'tail1': (0, -9.0, 0), 'tail2': tuple(q1.inverted() @ Vector((0, -12.0, 0))), 'tail3': tuple(q2.inverted() @ Vector((0, -10.0, 0)))}
    with R.action('gimmick'):
        k = R.key
        for b in ['root', 'jaw', 'eye_l', 'eye_r', 'tail1', 'tail2', 'tail3'] + list(legs):
            k(b, 0)
        # 0-4 anticipation: a crouch, the jaw gapes
        k('root', 4, move=(0, 0, -0.8))
        k('jaw', 4, rot=('X', -7))
        # 5-16 the hop: up, legs swing in under the base, the tail straightens and telescopes in, eyes sink, jaw shuts
        k('root', 10, move=(0, 0, 6.0))
        k('root', 18, move=(0, 0, -LOW), ease='BOUNCE')
        k('root', 22, move=(0, 0, -LOW))
        for nm, sx in legs.items():
            d = 1 if nm[-2] == 'b' else 0
            k(nm, 5 + d, rot=('Y', 0))
            k(nm, 11 + d, rot=TUCK[nm])   # under the base and in through the notch...
            k(nm, 15 + d, rot=FOLD[nm])   # ...then laid back along the hollow
        for t in ('tail1', 'tail2', 'tail3'):
            k(t, 6)
            k(t, 11, rot=T_ROT[t])
            k(t, 15, rot=T_ROT[t], move=T_IN[t])
        k('jaw', 11, rot=('X', -7))
        k('jaw', 15, rot=('X', JAW_OPEN))
        for e in ('eye_l', 'eye_r'):
            k(e, 9)
            k(e, 14, move=sink[e])
        # 22-42 a stapler: one press of the arm, 'pachin'
        k('jaw', 28, rot=('X', JAW_OPEN))
        k('jaw', 30, rot=('X', JAW_OPEN + 2.2))
        k('jaw', 34, rot=('X', JAW_OPEN))
        k('jaw', 42, rot=('X', JAW_OPEN))
        k('root', 42, move=(0, 0, -LOW))
        for nm, sx in legs.items():
            k(nm, 42, rot=FOLD[nm])
            k(nm, 45, rot=TUCK[nm])
        for t in ('tail1', 'tail2', 'tail3'):
            k(t, 42, rot=T_ROT[t], move=T_IN[t])
        for e in ('eye_l', 'eye_r'):
            k(e, 42, move=sink[e])
        # 42-58 it springs back out: a pop up, legs out, eyes pop, the tail slides out and whips round
        k('root', 47, move=(0, 0, 3.0))
        k('root', 53, move=(0, 0, 0), ease='BOUNCE')
        for nm, sx in legs.items():
            k(nm, 50, rot=('Y', 0), ease='BACK')
        for e in ('eye_l', 'eye_r'):
            k(e, 46, move=(0, 0, 0), ease='BACK')
        for t in ('tail1', 'tail2', 'tail3'):
            k(t, 47, rot=T_ROT[t])
        k('tail1', 51, rot=('X', 0))
        k('tail2', 52, rot=('Z', -9), ease='BACK')
        k('tail3', 53, rot=('Z', -12), ease='BACK')
        k('tail2', 58, rot=('Z', 0))
        k('tail3', 60, rot=('Z', 0))
        # 47-84 the chomp: gape, snap, gape, snap, settle ajar
        k('jaw', 47, rot=('X', JAW_OPEN))
        k('jaw', 53, rot=('X', -22))
        k('jaw', 56, rot=('X', JAW_OPEN), ease='CONSTANT')
        k('jaw', 60, rot=('X', JAW_OPEN))
        k('jaw', 63, rot=('X', -16))
        k('jaw', 65, rot=('X', JAW_OPEN), ease='CONSTANT')
        k('jaw', 69, rot=('X', JAW_OPEN))
        k('jaw', 76, rot=('X', 0), ease='BACK')
        k('jaw', 84, rot=('X', 0))
        k('root', 84)
        for b in ['eye_l', 'eye_r', 'tail1', 'tail2', 'tail3'] + list(legs):
            k(b, 84)
    return R


if '--clip' in ARGS:
    from rig import check_clip
    R = make_rig()
    skip = [('tail1', 'tail2'), ('tail2', 'tail3'), ('tail1', 'tail3'), ('hinge', 'base'), ('pin', 'hinge'), ('pin', 'base'), ('anvil', 'base'),
            ('magazine', 'arm'), ('arm', 'hinge'), ('pin', 'arm'), ('magazine', 'hinge')]
    res = check_clip(R, F.parts, range(1, 86, 1), skip=skip, tol=0.35)
    for f, L in sorted(res.items()):
        print('CLIP', f, L)
    print('CLIP frames', len(res))
    sys.exit(0)

if '--preview' in ARGS or '--fold' in ARGS:
    lows = [p.low for p in F.parts]
    highs = [h for p in F.parts for h in p.highs]
    if '--fold' in ARGS:
        R = make_rig()
        import bpy
        R.arm.animation_data.action = __import__('bpy').data.actions['gimmick']
        if '--bbox' in ARGS:
            for fr in (0, 36):
                bpy.context.scene.frame_set(fr)
                for b in ('tail1', 'tail2', 'tail3'):
                    pb = R.arm.pose.bones[b]
                    print(fr, b, 'head', np.round(np.array(pb.head), 1), 'tail', np.round(np.array(pb.tail), 1))
                for o in lows:
                    V = np.array([o.matrix_world @ v.co for v in o.data.vertices])
                    print(fr, o.name, np.round(V.min(0), 1), np.round(V.max(0), 1))
            sys.exit(0)
        FR = int(os.environ.get('FR', 30))
        views = [(FR, ((0, 8, -120), (0, 8, 0)), 40), (FR, ((90, 30, 10), (0, 10, 6)), 50), (FR, ((-60, 70, 30), (0, 8, 6)), 50), (int(os.environ.get('FR2', 10)), ((58, -66, 48), (0, 2, 8)), 45)]
        for i, (fr, cam, lens) in enumerate(views):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=cam, lens=lens)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=((58, -66, 48), (0, 2, 8)), lens=55)
    tk.preview(OUT + '_p2.png', highs, cam=((-62, 60, 44), (0, 6, 8)), lens=55)
    tk.preview(OUT + '_p3.png', lows, cam=((58, -66, 48), (0, 2, 8)), lens=55)
    tk.preview(OUT + '_p4.png', highs, cam=((110, -6, 14), (0, 4, 9)), lens=60)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402
import face  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=6.0, reuse="--repaint" in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    top = np.clip(on[:, :, 2], 0, 1)
    GREEN = pt.ramp('#3f8247', 7, shift=0.08)
    # factory airbrush: a darker back, lighter flanks; the crocodile's dark crossbands across the back
    bands = tk.smoothstep(0.35, 0.8, np.sin(Yc * 2 * math.pi / 7.6 + 0.6)) * tk.smoothstep(0.45, 0.85, top) * (Yc > -20)
    air = -0.32 * tk.smoothstep(0.3, 0.95, top) + 0.12 * tk.smoothstep(0.7, 0.1, top) - 0.42 * bands
    # the legs' and tail's pebbled scales: rounded clusters a tone darker (painted, like the factory's spray mask)
    # (hand-dabbed: each pebble its own lumpy dab, a lit top edge on the bigger ones)
    skin = P.region('leg') | P.region('skin')
    who, dd = P.dabs(skin, size=1.5, spacing=1.6, seed=3)
    pebbles = -0.3 * (who >= 0) + 0.25 * ((who >= 0) & (dd < 0.55) & (on[:, :, 2] > 0.2))
    bwho, bdd = P.dabs(P.region('green'), size=2.6, spacing=2.4, seed=4)  # the back's big scutes
    air = air - 0.22 * ((bwho >= 0) & (bdd > 0.72)) * tk.smoothstep(0.3, 0.7, top)
    for r in ('green', 'eye'):
        P.fill(r, GREEN, tone=sh, base=air)
    for r in ('leg', 'skin'):
        P.fill(r, GREEN, tone=sh, base=air + pebbles)
    P.fill('lip', pt.ramp('#d3d184', 6, shift=0.06), tone=sh, base=0.05)
    CREAM = pt.ramp('#ecdcaa', 6, shift=0.07)
    P.fill('jaw', CREAM, tone=sh, base=0.08)
    P.fill('belly', CREAM, tone=sh, base=0.0)
    P.fill('inner', pt.ramp('#a39878', 5, shift=0.06), tone=sh, base=-0.15)  # the hollow underneath
    P.fill('mouth', pt.ramp('#cf6670', 6, shift=0.06), tone=sh, base=-0.05 - 0.25 * tk.smoothstep(4.0, 6.0, np.abs(X)))
    P.fill('tooth', pt.ramp('#f4ecd8', 5, shift=0.05, dark=0.4), tone=sh, base=0.15)
    P.fill('chrome', pt.ramp('#b3bbc4', 7, dark=0.75, light=0.75, shift=0.05), tone=sh * 1.5, base=0.1)
    P.fill('steel', pt.ramp('#6c747e', 6, dark=0.7, light=0.6, shift=0.05), tone=sh * 1.3, base=0.0)
    P.fill('claw', pt.ramp('#3e3029', 5, shift=0.05), tone=sh, base=0.2)
    # the eyeballs: a lid of skin over the top, the yellow eye with a slit pupil looking sideways at you
    P.fill('eyeball', GREEN, tone=sh, base=-0.05)  # (the eye domes are part of the knobs: the eyes are ink dots)
    for nm in ('eye_l', 'eye_r'):
        # (the eyes were modelled with the jaw shut: turn them with it to the rest pose)
        ec = np.array(jawed(EYE[nm][2]))
        axv = Vector(EYE[nm][3])
        axv.rotate(__import__('mathutils').Matrix.Rotation(math.radians(-JAW_OPEN), 3, 'X'))
        ax = np.array(axv)
        c = ec + ax * 1.65
        k = 1.1 if nm == 'eye_l' else 0.9
        face.Face(P, tuple(c), tuple(ax), where=P.region('eyeball') | P.region('eye'), seed=21 + (nm == 'eye_l'), depth=2.0).dot(0.0, 0.2, 0.62 * k, 0.86 * k, rot=8 if nm == 'eye_l' else -5)
    # nostrils, the claws' tips, a printed maker's badge on the left flank
    for sx in (1, -1):
        P.flat(P.ellipse((sx * 1.25, Y(-26.9), B0 + 13.4), (0, -0.3, 1), 0.55, 0.75, up=(0, 1, 0)) & P.region('green'), '#1f1a17')
    badge_c = (7.4, Y(9.0), B0 + 11.2)
    ax = (1, 0.0, 0.1)
    U, V, W, a = P.frame(badge_c, ax)
    bface = (np.einsum('ijk,k->ij', on, np.array(ax) / np.linalg.norm(ax)) > 0.5) & P.region('green')
    oval = bface & ((U / 3.0) ** 2 + (V / 1.5) ** 2 <= 1)
    P.flat(oval, '#c4402e')
    P.flat(bface & ((U / 2.45) ** 2 + (V / 1.0) ** 2 <= 1) & ((U / 2.0) ** 2 + (V / 0.62) ** 2 > 1), '#f1e3bf')
    zig = bface & (np.abs(V - 0.25 * np.abs(((U * 2.2) % 2) - 1) + 0.1) < 0.14) & (np.abs(U) < 1.6)
    P.flat(zig, '#f1e3bf')
    # paint lines where the colours meet
    P.lines(['green', 'eye', 'leg', 'skin'], ['lip', 'jaw', 'belly', 'mouth'], step=2)
    P.lines(['jaw'], ['mouth'], step=1)
    P.lines(['tooth'], ['mouth', 'lip', 'jaw', 'green'], step=1)
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
