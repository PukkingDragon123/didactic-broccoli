"""ゴロゴロ Goro-goro (Thunder): series teruteru, Upside-Down Rain Charms (concepts_B.md).

A thunder-god's apprentice made from a tiger-print furoshiki: the knot twisted up into a zig-zag lightning-bolt
topknot, four short corners flaring round it like flames, a fanged grin, and the god's ring of drums worn as a
merry-go-round on its neck string (six little lacquered taiko on a hoop, on spokes from the string). A keychain.
Gimmick: it winds up, the drum ring spins round its neck (goro-goro-goro), the bolt crackles, the corners flare.

    tools/blender.sh art/blender/toys/teruteru/goro.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import kit  # noqa: E402  (lib/kit.py: the keychain screw eye)

F = bk.start('teruteru', 'goro')

RINGS = [(0.0, 6.2, 0.0), (0.8, 9.0, 0.0), (3.0, 11.4, 0.0), (7.2, 12.6, 0.0), (11.4, 12.0, 0.0), (15.2, 9.7, 0.0),
         (17.9, 7.1, 0.0), (19.2, 6.9, 0.0), (21.2, 7.9, 0.0), (24.0, 7.7, 0.0), (26.8, 6.1, 0.0), (29.2, 4.2, 0.0),
         (31.2, 2.8, 0.0), (32.2, 2.3, 0.0)]
NECK_Z = 18.5
KNOT = (0.0, 0.3, 33.2)
FACE = (0.0, -12.5, 7.9)  # the face's centre on the head (low)


body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=7, fold_amp=0.5, cheeks=((-5.8, 7.0), (5.8, 7.0)), tris=380)
knot = tt.knot('knot', KNOT, r=2.8, h=3.4, tris=50)

# ------------------------------------------------------------------ the corners: short, stiff, flaring up like flames
CORNERS = {}
for nm, ang in (('c_fl', -135), ('c_fr', -45), ('c_bl', 135), ('c_br', 45)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=7.5, W=7.0, a0=62, a1=8, cup=0.9, ripple=0.25, tris=36, thick=1.0,
                                  root_r=1.4, root_z=1.0, shape=0.65, power=1.4, curl=0.3)
    CORNERS[nm] = (lo, hi, root)

# ------------------------------------------------------------------ the lightning-bolt topknot
BOLT = [(-1.9, -1.0), (1.7, -1.0), (2.7, 5.0), (0.9, 5.0), (3.6, 10.4), (1.7, 10.4), (4.8, 16.2), (-1.4, 8.4), (0.5, 8.4),
        (-1.7, 3.5), (0.1, 3.5)]
BROOT = (0.6, -1.2, KNOT[2] + 0.4)


def place_bolt(o):
    tk.scale(o, 1.45)
    tk.rotate(o, -16, 'Y')
    tk.rotate(o, -34, 'X')
    tk.move(o, BROOT)
    return o


bolt_hi = place_bolt(tk.slab('bolt_hi', BOLT, 2.2, plane='XZ', bevel=0.75, segs=3))
tk.set_region(bolt_hi, 'bolt')
bolt_lo = place_bolt(tk.slab('bolt', BOLT, 2.2, plane='XZ', bevel=0.0, segs=0))

# ------------------------------------------------------------------ the drum ring: string, spokes, hoop, six taiko
HZ, HR = 19.6, 13.4  # the hoop's height and radius
cord = tt.neck_cord('cord', NECK_Z, RINGS, bow_at=-14, ends=((-0.4, -6.0), (0.9, -7.2)), thick=0.8, tris=110)
hoop_pts = [(HR * math.cos(t), HR * math.sin(t), HZ) for t in np.linspace(0, 2 * math.pi, 18, endpoint=False)]
hoop_lo = tk.tube('hoop', hoop_pts, 0.75, n=4, closed=True)
hoop_hi = tk.tube('hoop_hi', [(HR * math.cos(t), HR * math.sin(t), HZ) for t in np.linspace(0, 2 * math.pi, 72, endpoint=False)],
                  0.75, n=10, closed=True)
tk.set_region(hoop_hi, 'hoop')
spokes_lo, spokes_hi = [], []
for a in (90, 210, 330):
    t = math.radians(a)
    r0 = tt.ring_r(RINGS, NECK_Z)[0] + 0.6
    pts = [(r0 * math.cos(t), r0 * math.sin(t), NECK_Z), ((HR - 0.3) * math.cos(t), (HR - 0.3) * math.sin(t), HZ)]
    spokes_lo.append(tk.tube('spoke', pts, 0.5, n=4, cap0='flat', cap1='flat'))
    h = tk.tube('spoke_hi', pts, 0.5, n=8, cap0='flat', cap1='flat')
    tk.set_region(h, 'hoop')
    spokes_hi.append(h)
drums_lo, drums_hi = [], []
DRUM_A = [0, 60, 120, 180, 240, 300]
for a in DRUM_A:
    t = math.radians(a + 30)
    prof = [(0, -1.75), (2.0, -1.75), (2.3, -1.3), (2.55, 0.0), (2.3, 1.3), (2.0, 1.75), (0, 1.75)]
    lo = tk.lathe('drum', prof, n=7)
    hi = tk.lathe('drum_hi', [(0, -1.6), (1.9, -1.62), (2.05, -1.75), (2.3, -1.3), (2.55, 0.0), (2.3, 1.3), (2.05, 1.75), (1.9, 1.62), (0, 1.6)], n=24)
    tk.subsurf(hi, 1)

    def tacks(V, N):  # the rows of tacks round each drum head
        d = np.zeros(len(V))
        for zz in (-1.35, 1.35):
            ang = np.arctan2(V[:, 1], V[:, 0])
            d += 0.18 * (np.cos(ang * 12) > 0.6) * (np.abs(V[:, 2] - zz) < 0.22)
        return d
    tk.push(hi, tacks)
    tk.regions(hi, 'drum', [('head', lambda C, N: np.abs(N[:, 2]) > 0.8)])
    for o in (lo, hi):  # the drum's axis points out from the hoop
        tk.rotate(o, 90, 'Y')
        tk.rotate(o, math.degrees(t), 'Z')
        tk.move(o, (HR * math.cos(t), HR * math.sin(t), HZ))
    drums_lo.append(lo)
    drums_hi.append(hi)
ring_lo = tk.join([cord[0], hoop_lo] + spokes_lo + drums_lo, 'ring')
tk.decimate(ring_lo, 430)


# ------------------------------------------------------------------ parts
# ------------------------------------------------------------------ arms with drumsticks (bachi) over the front drums, feet
ARMS = {}
for nm, sx in (('arm_r', 1), ('arm_l', -1)):
    a_lo, a_hi, hc = tt.arm(nm, [(sx * 6.2, -1.2, 22.8), (sx * 8.4, -3.2, 23.8), (sx * 9.6, -4.8, 24.9)], mitt=(-sx * 0.4, -0.8, 0.4))
    tipc = np.array((sx * 12.4, -7.9, 23.6))
    st = [hc, tuple(tipc)]
    s_lo = tk.tube('bachi', [tuple(np.array(hc) - (tipc - np.array(hc)) * 0.25)] + st, [0.55, 0.55, 0.62], n=5, cap0='round', cap1='round')
    s_hi = tk.tube('bachi_hi', [tuple(np.array(hc) - (tipc - np.array(hc)) * 0.25)] + st, [0.55, 0.55, 0.62], n=10, cap0='round', cap1='round')
    tk.subsurf(s_hi, 1)
    tk.set_region(s_hi, 'stick')
    ARMS[nm] = (tk.join([a_lo, s_lo], nm), a_hi + [s_hi], (sx * 6.2, -1.2, 22.8))
feet = tt.feet('feet', RINGS)
F.part('body', tk.join([body[0], knot[0], feet[0]], 'body'), body[1] + knot[1] + feet[1])
for nm, (lo, his, sh_) in ARMS.items():
    F.part(nm, lo, his, bone=nm)
kit.eyepin(F, at=(KNOT[0], KNOT[1] + 1.4, KNOT[2] + 1.2), bone='root')
F.part('ring', ring_lo, cord[1] + [hoop_hi] + spokes_hi + drums_hi, bone='ring')
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
F.part('bolt', bolt_lo, [bolt_hi], bone='bolt', kind='gloss', sharp=50)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('ring', (0, 0, HZ), parent='root')
    for nm, (lo, his, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='root')
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    R.bone('bolt', BROOT, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'ring', 'bolt', 'arm_r', 'arm_l'] + list(CORNERS)
        # the drumsticks beat on the drums as they go by, left, right
        for i, f in enumerate(range(12, 58, 4)):
            nm = 'arm_r' if i % 2 else 'arm_l'
            other = 'arm_l' if i % 2 else 'arm_r'
            sx = 1 if nm == 'arm_r' else -1
            k(nm, f, rot=('Y', sx * 4.0), ease='LINEAR')
            k(other, f, rot=('Y', -sx * 2.5 * -1), ease='LINEAR')
        k('arm_r', 60)
        k('arm_l', 60)
        for b in bones:
            k(b, 0)
        # 0-8 it winds up: squash, the bolt leans back, the ring turns back a little (anticipation)
        k('root', 6, scale=(1.05, 0.93, 1.05))
        k('bolt', 6, rot=('X', 14))
        k('ring', 8, rot=('Z', 25))
        k('root', 10, scale=(0.97, 1.05, 0.97), ease='BACK')
        # 8-62 the drum ring spins round its neck (goro-goro-goro), faster then slower
        k('ring', 14, rot=('Z', -40), ease='LINEAR')
        for i, f in enumerate(range(20, 56, 6)):
            k('ring', f, rot=('Z', -40 - 110 * (i + 1)), ease='LINEAR')
        k('ring', 66, rot=('Z', -720), ease=('BACK', 'EASE_OUT'))
        k('root', 14)
        for i, f in enumerate(range(16, 58, 3)):  # it rocks with the drumming
            k('root', f, rot=('X', 2.2 * (1 if i % 2 else -1)), ease='LINEAR')
        k('root', 60)
        # the bolt crackles twice (a jitter), the corners flare out with each strike
        for t0 in (24, 42):
            for j in range(6):
                k('bolt', t0 + j, rot=[('Y', 9 * (1 if j % 2 else -1)), ('X', -6)], ease='CONSTANT')
            k('bolt', t0 + 6, rot=('X', 0))
            for nm, (lo, hi, root) in CORNERS.items():
                ax = tuple(np.cross((0, 0, 1), np.array(root) * (1, 1, 0)))
                k(nm, t0, rot=[(ax, 0)])
                k(nm, t0 + 2, rot=[(ax, 22)], ease='BACK')
                k(nm, t0 + 9, rot=[(ax, 0)])
        k('bolt', 70, rot=('X', -10), ease='BACK')
        k('bolt', 78)
        for b in bones:
            k(b, 86)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    TIGER = pt.ramp('#e9a637', 7, shift=0.07)
    P.fill('cloth', TIGER, tone=sh, base=0.08 * tk.smoothstep(20, 32, Z) - 0.12 * tk.smoothstep(8, 0, Z))
    P.fill('corner', TIGER, tone=sh, base=0.1)
    # tiger stripes: tapered wavy bands round the cloth, broken, kept off the face
    th = np.arctan2(Yc, X)
    face_zone = (Yc < -3) & (np.abs(X) < 10.5) & (Z > 3) & (Z < 16.5)
    # (lens-shaped strokes: a wavy band whose width swells and tapers to points round the body)
    s1 = np.sin(Z * 0.82 + 0.9 * np.sin(th * 2 + Z * 0.21) + 0.35 * th)
    brk = np.sin(th * 3 + Z * 0.33 + 0.8 * np.sin(Z * 0.5))
    stripe = (1 - s1) < 0.34 * np.clip(1 - brk * brk * 1.15, 0, 1) ** 1.5
    for r in ('cloth', 'corner'):
        P.fill(P.region(r) & stripe & ~face_zone, pt.ramp('#2c2224', 6, shift=0.05), tone=sh * 0.6, base=0.1)
    P.fill('bolt', pt.ramp('#f6e05a', 7, shift=0.06), tone=sh, base=0.15)
    P.fill('hoop', pt.ramp('#7a4a2c', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('cord', pt.ramp('#d8463a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('drum', pt.ramp('#c8352c', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('head', pt.ramp('#efe2c4', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('hand', TIGER, tone=sh, base=0.14)
    P.fill('stick', pt.ramp('#d9b98a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    # gold tacks round each drum head, a black three-comma (tomoe) on each head
    drum = P.region('drum')
    P.flat(drum & (P.cav > 0.56), '#e6c35a')
    head = P.region('head')
    for a in DRUM_A:
        t = math.radians(a + 30)
        c = np.array((HR * math.cos(t) + 1.75 * math.cos(t), HR * math.sin(t) + 1.75 * math.sin(t), HZ))
        ax = np.array((math.cos(t), math.sin(t), 0))
        U, V, W, _ = P.frame(tuple(c), tuple(ax))
        r, ang = np.hypot(U, V), np.arctan2(V, U)
        tom = np.zeros_like(head)
        for kk in range(3):
            a0 = ang - kk * 2 * math.pi / 3
            ph = (a0 + r * 0.9) % (2 * math.pi)
            tom |= (ph < 1.7) & (r > 0.25) & (r < 1.55) & (np.abs(W) < 0.6)
        P.flat(head & tom, '#231c1e')
        P.flat(head & (r < 0.28) & (np.abs(W) < 0.6), '#231c1e')
    # the face: dots wide apart and one big grin with three tooth strokes
    import face
    fc = face.Face(P, c=FACE, axis=(0, -1, 0.1), where=P.region('cloth'), seed=5)
    fc.blush(12.0, -0.9, rx=2.0, ry=1.1, col='#ef8b68')
    fc.eyes('big', spread=8.6, size=0.62, dy=1.7)
    fc.brows('angry', spread=8.8, dy=3.6, w=2.6, weight=0.5)
    fc.mouth('grin', w=6.6, dy=-0.9, teeth=3)
    P.lines(['cloth', 'corner'], ['cord'], step=2)
    P.lines(['bolt'], step=2)
    P.lines(['drum'], ['head'], step=2)
    P.lines(['hoop', 'cord'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin'), ('body', 'ring'), ('bolt', 'body'), ('bolt', 'pin'), ('arm_r', 'body'), ('arm_l', 'body')] + [(c, 'body') for c in CORNERS],
       cam=((60, -84, 52), (0, 0, 22)), fold=(0, 14, 26, 44), frames=86)
