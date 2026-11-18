"""くびふりフクロウ Swivel Owl: a Shōwa mint-green desk fan that is an owl (series kaden, concepts_C.md).

The wire guard is the owl's facial disc (its radial wires are the disc's feathers), the enamel hub plate in the middle
is its face (two hand-drawn dots), the maker's badge is the beak, the two pull-knobs on the motor are the ear tufts, the column is the
plump body with its folded wings and the switch feet grip the base. The vent cover at the back carries the false face
a pygmy owl has on the back of its head, so it still looks at you when it turns round.
Gimmick: a toe-key goes down, the fan oscillates, then turns its head right round to look behind it, tilts it and
swings back with a flick of the tufts.

    tools/blender.sh art/blender/toys/kaden/fukuro.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

tk.reset()
F = Fig('kaden', 'fukuro')

BH = 6.2                 # the base's height
HZ = 40.0                # the head's centre (the fan's motor axis)
GF = -12.6               # the guard's front (y)
PLATE_R = 9.4            # the face plate in the middle of the guard (the owl's face)
KNUCKLE = (0, 0.0, 25.2)  # the tilt joint (axis x)

# ------------------------------------------------------------------ the base: a domed Shōwa fan foot
base = tk.loft('base', [{'c': (0, -1, 0.0), 'w': 36, 'h': 14.6, 'e': 3.0},
                        {'c': (0, -1, 1.3), 'w': 37, 'h': 15.1, 'e': 3.0},
                        {'c': (0, -1, 3.6), 'w': 35.4, 'h': 14.3, 'e': 2.8},
                        {'c': (0, -1, 5.4), 'w': 31.0, 'h': 12.4, 'e': 2.6},
                        {'c': (0, -1, BH), 'w': 25.0, 'h': 10.0, 'e': 2.4}], n=20, up=(0, -1, 0), cap0='flat', cap1='round', capd=0.5)


def sc_base(h):
    def f(V, N):
        # the chrome trim bead round the foot, and the slot the key-toes come out of along the front
        d = 0.35 * tk.smoothstep(0.45, 0.0, np.abs(V[:, 2] - 1.55))
        return d
    tk.push(h, f)


base_lo, base_hi = cx.low(base, 'base', 140, hi=3, sculpt=sc_base, region=('cream', [
    ('trim', lambda C, N: np.abs(C[:, 2] - 1.55) < 0.55)]))

# ------------------------------------------------------------------ the toe-keys (piano-key switches) along the front
KEYS = []
for i, x in enumerate((-8.4, -2.9, 2.9, 8.4)):
    xx = x * 1.06
    k = tk.loft('key', [{'c': (x, -4.6, BH + 1.2), 'w': 4.6, 'ht': 1.25, 'hb': 1.1, 'e': 3.0},
                        {'c': (x * 1.02, -9.2, BH + 1.2), 'w': 4.8, 'ht': 1.3, 'hb': 1.1, 'e': 3.0},
                        {'c': (xx, -12.6, BH + 0.4), 'w': 4.6, 'ht': 1.25, 'hb': 1.05, 'e': 2.8},
                        {'c': (xx, -14.6, BH - 1.5), 'w': 3.9, 'ht': 1.0, 'hb': 0.9, 'e': 2.4},
                        {'c': (xx, -15.4, BH - 3.4), 'w': 2.4, 'ht': 0.7, 'hb': 0.6, 'e': 2.2}], n=8, cap0='flat', cap1='point', capd=0.5)
    lo, hi = cx.low(k, f'key{i}', 34, hi=2, region=('keyred' if i == 1 else 'key', [('claw', lambda C, N: C[:, 2] < BH - 1.2)]))
    KEYS.append((lo, hi, x))


# ------------------------------------------------------------------ the body: a plump owl column with a chest bib
def body_rings():
    R = []
    for z, w, ht, hb, yc in ((4.6, 21.0, 9.4, 9.4, -0.2), (8.4, 22.6, 10.6, 9.8, -0.6), (13.0, 22.0, 10.8, 9.6, -0.8),
                             (17.6, 19.4, 9.6, 8.6, -0.6), (21.2, 15.2, 7.6, 7.0, -0.2), (23.6, 10.6, 5.2, 5.2, 0.0)):
        R.append({'c': (0, yc, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.3})
    return R


def sc_body(h):
    def f(V, N):
        # the chest: rows of overlapping feathers (each row's lower edge stands proud), only on the front
        front = tk.smoothstep(-0.2, -0.7, N[:, 1])
        row = np.floor((V[:, 2] - 6.0) / 2.5)
        u = V[:, 0] / 2.8 + 0.5 * np.mod(row, 2)
        fu = np.mod(u, 1.0) - 0.5
        fv = np.mod((V[:, 2] - 6.0) / 2.5, 1.0)
        sc = (1 - (2 * fu) ** 2) * (1 - fv) ** 2
        d = 0.32 * sc * front * (V[:, 2] < 20.5)
        # the seam where the column meets its cap, under the neck
        d -= 0.3 * tk.smoothstep(0.4, 0.0, np.abs(V[:, 2] - 21.6))
        return d
    tk.push(h, f)


body = tk.loft('body', body_rings(), n=16, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.0)
body_lo, body_hi = cx.low(body, 'body', 190, hi=3, sculpt=sc_body, region=('mint', [
    ('bib', lambda C, N: (N[:, 1] < -0.35) & (C[:, 2] < 20.5) & (C[:, 2] > 5.0) & (np.abs(C[:, 0]) < 7.2 + (20.5 - C[:, 2]) * 0.12))]))


def body_r(z):
    """Half width and half depths of the body at height z (for hugging parts)."""
    zs = [r['c'][2] for r in body_rings()]
    ws = [r['w'] / 2 for r in body_rings()]
    ds = [r['hb'] for r in body_rings()]
    return np.interp(z, zs, ws), np.interp(z, zs, ds)


# ------------------------------------------------------------------ wings: folded against the body (the fan's art-deco fins)
WINGS = []
for sx in (1, -1):
    pts = [(-2.6, 21.0), (-5.6, 16.4), (-6.0, 11.0), (-3.4, 6.6), (1.5, 4.6), (6.4, 4.9), (8.2, 8.0), (7.6, 13.6), (4.8, 18.6), (1.2, 21.4)]
    w = tk.slab('wing', pts, 2.4, plane='YZ', at=0.0, bevel=0.9, segs=1)
    tk.subsurf(w, 1)

    def hug(V, sx=sx):
        V = V.copy()
        hw, hd = body_r(V[:, 2])
        t = V[:, 0]
        ry = np.clip(V[:, 1] / (hd + 2.5), -0.95, 0.95)
        V[:, 0] = sx * (hw * np.sqrt(1 - ry ** 2) + 0.55 + t * 1.0 + 0.9) + 0 * t
        V[:, 0] += sx * 0.9 * tk.smoothstep(14, 5, V[:, 2])  # the tips stand off the belly a little
        return V
    tk.deform(w, hug)
    tk.fix_normals(w)

    def sc_wing(h, sx=sx):
        def f(V, N):
            # the long flight feathers: grooves running down and back, scalloped tips along the lower edge
            u = (V[:, 1] * 0.8 + V[:, 2] * 0.5)
            g = -0.28 * (np.abs(np.sin(u * math.pi / 2.2)) ** 6) * (V[:, 2] < 14) * (np.abs(N[:, 0]) > 0.5)
            cov = 0.25 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 2] - (15.0 - 0.25 * V[:, 1]))) * (np.abs(N[:, 0]) > 0.5)
            return g + cov
        tk.push(h, f)
    lo, hi = cx.low(w, 'wing', 52, hi=2, sculpt=sc_wing, region='wing')
    WINGS.append((lo, hi))

# ------------------------------------------------------------------ feet: feathered pads; the key-toes come out of them
FEET = []
for sx in (1, -1):
    ft = tk.loft('foot', [{'c': (sx * 5.6, -1.0, BH + 1.6), 'w': 9.6, 'h': 1.6, 'e': 2.2},
                          {'c': (sx * 5.6, -4.5, BH + 1.9), 'w': 10.6, 'h': 2.0, 'e': 2.4},
                          {'c': (sx * 5.7, -7.6, BH + 1.5), 'w': 9.4, 'h': 1.6, 'e': 2.4}], n=10, cap0='round', cap1='round', capd=1.4)

    def sc_foot(h):
        def f(V, N):  # leg feathers: soft rows across the top of the pad
            return 0.14 * np.abs(np.sin(V[:, 1] * 1.9 + np.abs(V[:, 0]) * 0.4)) ** 3 * (N[:, 2] > 0.2)
        tk.push(h, f)
    FEET.append(cx.low(ft, 'foot', 40, hi=2, sculpt=sc_foot, region='foot'))

# ------------------------------------------------------------------ the neck: post, tilt knuckle and its wing-nut knob
post = tk.cyl('post', 3.1, 20.5, 31.0, n=12, at=(0, 0), axis='Z', bevel=0.4, segs=1)
knuckle = tk.cyl('knuckle', 3.5, -4.6, 4.6, n=14, at=(KNUCKLE[1], KNUCKLE[2]), axis='X', bevel=0.6, segs=2)
knob = tk.lathe('knob', [(0, 4.4), (2.3, 4.4), (2.6, 5.4), (2.2, 6.6), (0, 6.9)], n=10, axis='X', centre=(0, KNUCKLE[1], KNUCKLE[2]))
neck = []
for o, t in ((post, 28), (knuckle, 44), (knob, 20)):
    neck.append(cx.low(o, o.name, t, lo=0, hi=1, region='chrome' if o is not knob else 'tuft'))

# ------------------------------------------------------------------ the head: motor housing (the back of the owl's head)
house = tk.lathe('house', [(0, -6.2), (12.0, -6.2), (12.7, -4.2), (12.8, -1.0), (12.2, 3.0), (10.6, 6.6), (8.0, 9.4), (4.6, 11.2), (0, 11.9)],
                 n=24, axis='Y', centre=(0, 0, HZ))


def sc_house(h):
    def f(V, N):
        # cooling vents round the back cover, a seam where the cover meets the housing
        back = V[:, 1] > 6.5
        r, a = cx.polar(V[:, 0], V[:, 2], (0, HZ))
        vents = -0.45 * (np.abs(np.mod(a, 20) - 10) < 3.2) * (r > 4.2) * (r < 8.4) * back
        seam = -0.32 * tk.smoothstep(0.4, 0.0, np.abs(V[:, 1] - 6.4))
        return vents + seam
    tk.push(h, f)


house_lo, house_hi = cx.low(house, 'house', 170, lo=1, hi=2, sculpt=sc_house, region='mint')

# ------------------------------------------------------------------ the guard: the facial disc
guard = tk.lathe('guard', [(0, GF), (4.0, GF + 0.2), (8.0, GF + 0.8), (11.5, GF + 1.8), (14.2, GF + 3.1), (15.7, GF + 4.4), (16.1, GF + 5.6),
                           (15.7, GF + 6.7), (14.2, GF + 7.1), (12.2, GF + 7.0), (0, GF + 7.0)], n=32, axis='Y', centre=(0, 0, HZ))


def guard_front(V):
    r = np.hypot(V[:, 0], V[:, 2] - HZ)
    return np.interp(r, [0, 4, 8, 11.5, 14.2, 15.7], [GF, GF + 0.2, GF + 0.8, GF + 1.8, GF + 3.1, GF + 4.4])


def sc_guard(h):
    def f(V, N):
        r, a = cx.polar(V[:, 0], V[:, 2], (0, HZ))
        front = (N[:, 1] < -0.25) & (r < 14.9)
        wires = (np.abs(np.mod(a + 6.0, 360 / 28) - 360 / 56) < 1.5 + 6.0 / np.maximum(r, 1)) & (r > 3.0)
        rings = (np.abs(r - 11.8) < 0.45) | (np.abs(r - 14.6) < 0.5)
        d = np.where(front & (r > PLATE_R - 0.3), np.where(wires | rings, 0.3, -0.55), 0.0)
        rim = (r > 15.0) & (r < 16.4)
        return d + 0.25 * rim
    tk.push(h, f)


guard_lo, guard_hi = cx.low(guard, 'guard', 230, lo=0, hi=3, sculpt=sc_guard, region='wire')

# the face plate (cream enamel: the owl's face, painted by hand) and the maker's badge on it: the beak
FACE = []
plate = tk.lathe('plate', [(0, GF - 1.7), (4.8, GF - 1.5), (8.0, GF - 0.9), (PLATE_R, GF + 0.1), (PLATE_R - 0.3, GF + 1.3), (0, GF + 1.3)],
                 n=24, axis='Y', centre=(0, 0, HZ))
FACE.append(cx.low(plate, 'plate', 70, lo=0, hi=2, region='plate'))
bk = tk.slab('badge', [(-1.9, 1.2), (1.9, 1.2), (1.6, -0.9), (0.0, -3.7), (-1.6, -0.9)], 2.0, plane='XZ', at=0.0, bevel=0.6, segs=2)
tk.move(bk, (0, GF - 2.0, HZ - 2.2))
tk.deform(bk, lambda V: V + np.stack([0 * V[:, 0], -0.16 * (HZ - 1.0 - V[:, 2]), 0 * V[:, 0]], 1))
FACE.append(cx.low(bk, 'badge', 36, lo=0, hi=2, region='badge'))

# ------------------------------------------------------------------ ear tufts: the oscillation pull-knobs
TUFTS = {}
for sx, nm in ((1, 'tuft_l'), (-1, 'tuft_r')):
    root = np.array((sx * 6.6, 1.4, HZ + 9.6))
    t = tk.lathe(nm, [(0, -1.0), (2.7, -1.0), (3.0, 0.8), (2.5, 3.8), (1.4, 7.0), (0, 9.6)], n=10)
    tk.scale(t, (1.0, 0.75, 1.0))
    tk.rotate(t, -sx * 36, 'Y')
    tk.rotate(t, 10, 'X')
    tk.move(t, tuple(root))
    col = tk.lathe('collar', [(0, -1.6), (3.1, -1.6), (3.3, -0.4), (2.6, 0.2), (0, 0.2)], n=12)
    tk.rotate(col, -sx * 30, 'Y')
    tk.rotate(col, 12, 'X')
    tk.move(col, tuple(root))

    def sc_tuft(h):
        def f(V, N):  # feather barbs: fine grooves up the tuft
            return -0.12 * (np.abs(np.sin(np.arctan2(V[:, 1] - 1.4, V[:, 0]) * 7)) ** 4)
        tk.push(h, f)
    a = cx.low(t, nm, 44, lo=1, hi=2, sculpt=sc_tuft, region='tuft')
    b = cx.low(col, 'collar', 22, lo=0, hi=1, region='chrome')
    TUFTS[nm] = (a, b, tuple(root))

# ------------------------------------------------------------------ parts
F.part('base', base_lo, [base_hi], bone='root')
F.part('body', tk.join([body_lo] + [w[0] for w in WINGS] + [f[0] for f in FEET], 'body'), [body_hi] + [w[1] for w in WINGS] + [f[1] for f in FEET], bone='root')
F.part('keys', tk.join([k[0] for i, k in enumerate(KEYS) if i != 1], 'keys'), [k[1] for i, k in enumerate(KEYS) if i != 1], bone='root')
F.part('key', KEYS[1][0], [KEYS[1][1]], bone='key')
F.part('neck', tk.join([n[0] for n in neck], 'neck'), [n[1] for n in neck], bone='swivel', kind='gloss')
F.part('head', tk.join([house_lo, guard_lo] + [f[0] for f in FACE], 'head'), [house_hi, guard_hi] + [f[1] for f in FACE], bone='tilt')
for nm, (a, b, root) in TUFTS.items():
    F.part(nm, tk.join([a[0], b[0]], nm), [a[1], b[1]], bone=nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 3))
    R.bone('key', (KEYS[1][2], -4.6, BH + 1.2), parent='root')
    R.bone('swivel', (0, 0, 21.0), parent='root')
    R.bone('tilt', KNUCKLE, parent='swivel')
    for nm, (a, b, root) in TUFTS.items():
        R.bone(nm, root, parent='tilt')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('root', 'key', 'swivel', 'tilt', 'tuft_l', 'tuft_r'):
            k(b, 0)
        # a toe-key goes down: switch on
        k('key', 2)
        k('key', 5, rot=('X', 5), ease='BACK')
        k('key', 78, rot=('X', 5))
        k('key', 82, ease='BACK')
        # the fan oscillates: an easy sweep left and right
        k('swivel', 6)
        k('swivel', 15, rot=('Z', 34))
        k('swivel', 27, rot=('Z', -34))
        k('swivel', 35, rot=('Z', -8))
        # the owl turns its head right round to look behind it (a quick whip with an overshoot), holds, tilts
        k('swivel', 42, rot=('Z', 172), ease='BACK')
        k('swivel', 54, rot=('Z', 172))
        k('tilt', 42)
        k('tilt', 47, rot=('Y', -16), ease='BACK')
        k('tilt', 53, rot=('Y', -16))
        # and swings back to face you, with the other tilt and a flick of the tufts
        k('swivel', 62, rot=('Z', -6), ease='BACK')
        k('swivel', 70, rot=('Z', 0))
        k('tilt', 60, rot=('Y', 6))
        k('tilt', 64, rot=('Y', 14), ease='BACK')
        k('tilt', 74, rot=('Y', 14))
        k('tilt', 82)
        for nm, sx in (('tuft_l', 1), ('tuft_r', -1)):
            k(nm, 40)
            k(nm, 44, rot=('Y', -sx * 16), ease='BACK')
            k(nm, 50)
            k(nm, 63)
            k(nm, 66, rot=('Y', -sx * 20), ease='BACK')
            k(nm, 69, rot=('Y', sx * 6))
            k(nm, 73)
        for b in ('root', 'key', 'swivel', 'tilt', 'tuft_l', 'tuft_r'):
            k(b, 88)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    MINT = pt.ramp('#93cdb9', 7, shift=0.06)
    # factory airbrush: deeper toward the ground and round the back, a pale top
    air = 0.16 * tk.smoothstep(HZ, HZ + 12, Z) - 0.28 * tk.smoothstep(16, 5, Z) - 0.12 * tk.smoothstep(2, 10, Yc)
    P.fill('mint', MINT, tone=sh, base=air)
    P.fill('wing', MINT, tone=sh, base=air - 0.1)
    # the wing feathers: printed darker-mint scallops along the lower edge and the covert line
    wing = P.region('wing')
    u = Yc * 0.8 + Z * 0.5
    P.tint(wing & (np.abs(np.sin(u * math.pi / 2.2)) > 0.93) & (Z < 13.5), pt.ramp('#5f9c8a', 6, shift=0.06), sh - 0.1)
    P.tint(wing & (np.abs(Z - (15.0 - 0.25 * Yc)) < 0.45), pt.ramp('#5f9c8a', 6, shift=0.06), sh - 0.1)
    CREAM = pt.ramp('#efe4c8', 7, shift=0.06)
    P.fill('bib', CREAM, tone=sh, base=0.05)
    bib = P.region('bib')
    row = np.floor((Z - 6.0) / 2.5)
    u = X / 2.8 + 0.5 * np.mod(row, 2)
    fu = np.mod(u, 1.0) - 0.5
    fv = np.mod((Z - 6.0) / 2.5, 1.0)
    chev = (np.abs(fv - (0.2 + 0.55 * np.abs(fu))) < 0.11) & (np.abs(fu) < 0.36) & (Z > 7.0)
    P.tint(bib & chev, pt.ramp('#a87a56', 6, shift=0.06), sh)
    P.fill('foot', CREAM, tone=sh, base=-0.05)
    P.tint(P.region('foot') & (np.mod(Yc * 0.6 + np.abs(X) * 0.13, 1.0) < 0.22), pt.ramp('#c9b48e', 6, shift=0.05), sh)
    # the base: cream enamel, a chrome trim, the key slot dark
    P.fill('cream', CREAM, tone=sh, base=0.0 - 0.15 * tk.smoothstep(3, 0, Z))
    CHROME = pt.ramp('#b6bec6', 7, dark=0.75, light=0.75, shift=0.05)
    P.fill('trim', CHROME, tone=sh * 1.5, base=0.1)
    P.fill('slot', pt.ramp('#3c3a3a', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('chrome', CHROME, tone=sh * 1.5, base=0.1)
    P.fill('key', CREAM, tone=sh, base=0.1)
    P.fill('keyred', pt.ramp('#d2483a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('claw', pt.ramp('#3a302e', 6, shift=0.05), tone=sh, base=0.2)
    # a printed maker's plate on the base, front left
    plate = P.region('cream') & (np.abs(X + 12.0) < 3.6) & (np.abs(Z - 4.6) < 0.9) & (Yc < -5)
    P.flat(plate, '#c23a2c')
    P.flat(plate & (np.abs(Z - 4.6) < 0.3) & (np.abs(X + 12.0) < 2.6), '#f1e3bf')
    # tufts: cream bakelite with brown bars
    # tufts: brown bakelite knobs, darker toward the tip like an owl's ear feathers
    tz = Z - (HZ + 9.6)
    P.fill('tuft', pt.ramp('#9a6a44', 7, shift=0.06), tone=sh, base=0.1 - 0.06 * tz)
    P.tint(P.region('tuft') & (tz > 6.0), pt.ramp('#5a3a2a', 6, shift=0.06), sh)
    # the guard: chrome wires over the dark inside of the fan, the pale blue blades showing between them
    r, a = cx.polar(X, Z, (0, HZ))
    gd = P.region('wire')
    front = gd & (on[:, :, 1] < -0.25) & (r < 14.9)
    wires = (np.abs(np.mod(a + 6.0, 360 / 28) - 360 / 56) < 1.5 + 6.0 / np.maximum(r, 1)) & (r > 3.0)
    rings = (np.abs(r - 11.8) < 0.45) | (np.abs(r - 14.6) < 0.5)
    metal = gd & (~front | wires | rings)
    P.fill(metal, CHROME, tone=sh * 1.5, base=0.15)
    gap = gd & front & ~(wires | rings)
    blade = np.zeros_like(gd)
    for a0 in (20, 140, 260):
        da = np.abs((a - a0 + 180) % 360 - 180)
        blade |= (da < 30 - r * 0.6) & (r < 13.6) & (r > 3.2)
    P.fill(gap & blade, pt.ramp('#88b4c4', 5, shift=0.05), tone=sh * 0.5, base=-0.3)
    P.fill(gap & ~blade, pt.ramp('#384448', 5, shift=0.05), tone=sh * 0.5, base=0.0)
    # the face plate: cream enamel and the face drawn on by hand (lib/face.py): two ink dots set wide, a soft blush
    import face
    P.fill('plate', CREAM, tone=sh, base=0.12)
    pl = P.region('plate')
    fc = face.Face(P, c=(0, GF - 1.7, HZ), axis=(0, -1, 0), where=pl, seed=3)
    fc.blush(11.4, -2.6, rx=1.9, ry=1.1)
    fc.eyes('big', spread=9.4, size=0.72, dy=0.2)  # (an owl: two big dots and the beak, the badge)
    # the back cover: the false face a pygmy owl has on the back of its head (it still looks at you when it turns)
    fb = face.Face(P, c=(0, 11.9, HZ), axis=(0, 1, 0), where=P.region('mint') & (Yc > 6.6), seed=5)
    fb.eyes('sleepy', spread=9.0, size=0.65, dy=1.4)
    fb.mouth('dash', w=2.2, dy=-1.2, slant=-12)
    # the badge-beak: orange enamel, a chrome edge, a darker hooked tip
    P.fill('badge', pt.ramp('#e99a34', 6, shift=0.06), tone=sh, base=0.1)
    bd = P.region('badge')
    P.tint(bd & (Z < HZ - 4.9), pt.ramp('#b8641e', 6, shift=0.06), sh)
    P.lines(['badge'], None, col='#8c4a18')
    P.lines(['mint', 'wing', 'bib'], ['chrome', 'wire', 'tuft', 'badge', 'foot'], step=2)
    P.lines(['plate'], ['wire'], step=2)
    P.lines(['bib'], ['mint'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 89), skip=[('neck', 'body'), ('neck', 'head'), ('key', 'base'), ('keys', 'base'), ('key', 'body'), ('keys', 'body'),
                                                               ('tuft_l', 'head'), ('tuft_r', 'head')]),
       cams=[((70, -84, 62), (0, 0, 28)), ((-70, 80, 56), (0, 0, 28))])
