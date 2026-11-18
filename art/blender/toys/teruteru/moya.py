"""もやもや Moya-moya (Fog): series teruteru, Upside-Down Rain Charms (concepts_B.md).

A shy one in pale lilac gauze printed with haze bands (kasumi): one long corner of its cloth hangs down over its
face like a fringe and hides an eye, two more trail down its back like wisps of mist. A keychain.
Gimmick: it wriggles, flicks the veil up to peek at you with both eyes, holds it there a moment, and hides again.

    tools/blender.sh art/blender/toys/teruteru/moya.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('teruteru', 'moya')

RINGS = [(0.0, 5.6, 0.0), (0.8, 8.6, 0.0), (3.0, 11.0, 0.0), (7.2, 12.2, 0.0), (11.4, 11.6, 0.0), (15.2, 9.4, 0.0),
         (17.9, 6.8, 0.0), (19.2, 6.6, 0.0), (21.6, 7.4, 0.0), (25.0, 7.3, 0.0), (28.6, 6.0, 0.0), (32.0, 4.2, 0.0),
         (34.6, 2.8, 0.0), (35.8, 2.3, 0.0)]
NECK_Z = 18.5
KNOT = (0.0, 0.0, 36.8)
FACE = (0.0, -12.2, 7.8)
VEIL_A = -113.0   # the veil's azimuth (degrees: -90 is the front)

body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=8, fold_amp=0.45, cheeks=((-5.4, 7.4), (5.4, 7.4)), tris=440)
knot = tt.knot('knot', KNOT, r=2.7, h=3.4, tris=50)
# a wispy cloud scarf round its neck (puffs of mist), its end trailing off behind
sc_lo, sc_hi = [], []
r_neck = tt.ring_r(RINGS, NECK_Z)[0]
PUFFS = [(r_neck + 1.1 + 0.4 * math.sin(a * 2), a, NECK_Z + 0.6 * math.sin(a * 3), 2.6 + 0.5 * math.cos(a * 5)) for a in np.linspace(0, 2 * math.pi, 13, endpoint=False)]
PUFFS += [(r_neck + 3.6, math.radians(52), NECK_Z - 0.6, 2.1), (r_neck + 6.4, math.radians(60), NECK_Z - 1.4, 1.7), (r_neck + 8.8, math.radians(64), NECK_Z - 2.6, 1.25)]
for rr, a, z, pr in PUFFS:
    c = (rr * math.cos(a), rr * math.sin(a), z)
    sc_lo.append(tk.lathe('puff', [(0, -pr), (pr * 0.85, -pr * 0.5), (pr * 0.85, pr * 0.5), (0, pr)], n=6, centre=c))
    h_ = tk.lathe('puff_hi', [(0, -pr)] + [(pr * math.sin(q), -pr * math.cos(q)) for q in np.linspace(0.25, math.pi - 0.25, 8)] + [(0, pr)], n=14, centre=c)
    tk.subsurf(h_, 1)
    tk.push(h_, lambda V, N, c=c: 0.18 * np.cos((V[:, 0] - c[0]) * 2.2 + (V[:, 2] - c[2]) * 1.7) ** 2)
    tk.set_region(h_, 'scarf')
    sc_hi.append(h_)
scarf_lo = tk.decimate(tk.join(sc_lo, 'scarf'), 200)
cord = (scarf_lo, sc_hi)


# ------------------------------------------------------------------ the veil: a long corner hanging over the face
def veil_mesh(name, nt, ns, ripple=0.0, th=0.85, gap=0.75):
    """A sheet of cloth lying over the body: from the knot down to z 6.6, centred on VEIL_A, widening as it falls,
    `th` thick, its hem scalloped and curling out a little."""
    top, bot = KNOT[2] + 1.2, 6.8
    V, F_ = [], []
    for layer in (0, 1):
        for i in range(nt):
            t = i / (nt - 1)
            z = top + (bot - top) * t
            half = math.radians(8 + 10 * t ** 0.8)
            for j in range(ns):
                s_ = j / (ns - 1) * 2 - 1
                a = math.radians(VEIL_A) + half * s_
                r = (tt.ring_r(RINGS, z)[0] if z < KNOT[2] - 1.0 else 2.4) + gap
                r += 1.4 * t ** 5 * (1 + 0.6 * s_ * s_)                       # the hem curls out
                r += ripple * math.sin(s_ * 7.5 + t * 3) * (0.3 + t)          # gauze ripples running down it
                zz = z - (0.9 * t ** 3 * math.cos(s_ * math.pi * 1.5) if t > 0.5 else 0)  # (a scalloped hem)
                if layer:
                    r += th
                V.append((r * math.cos(a), r * math.sin(a), zz))
    n = nt * ns

    def idx(l, i, j):
        return l * n + i * ns + j
    for i in range(nt - 1):
        for j in range(ns - 1):
            F_.append([idx(0, i, j), idx(0, i, j + 1), idx(0, i + 1, j + 1), idx(0, i + 1, j)])
            F_.append([idx(1, i, j), idx(1, i + 1, j), idx(1, i + 1, j + 1), idx(1, i, j + 1)])
    for i in range(nt - 1):  # the two long edges
        F_.append([idx(0, i, 0), idx(0, i + 1, 0), idx(1, i + 1, 0), idx(1, i, 0)])
        F_.append([idx(0, i, ns - 1), idx(1, i, ns - 1), idx(1, i + 1, ns - 1), idx(0, i + 1, ns - 1)])
    for j in range(ns - 1):  # the top and the hem
        F_.append([idx(0, 0, j), idx(1, 0, j), idx(1, 0, j + 1), idx(0, 0, j + 1)])
        F_.append([idx(0, nt - 1, j), idx(0, nt - 1, j + 1), idx(1, nt - 1, j + 1), idx(1, nt - 1, j)])
    return tk.from_pydata(name, V, F_)


veil_lo = veil_mesh('veil', 10, 4)
veil_hi = veil_mesh('veil_hi', 40, 13, ripple=0.3)
tk.subsurf(veil_hi, 1)
tk.set_region(veil_hi, 'veil')
VPIV = (2.4 * math.cos(math.radians(VEIL_A)), 2.4 * math.sin(math.radians(VEIL_A)), KNOT[2] + 0.6)

# ------------------------------------------------------------------ the other corners: one short, two long wisps down the back
CORNERS = {}
for nm, ang, L, W, a0, a1 in (('c_fr', -38, 8.5, 7.5, 40, -40), ('c_bl', 128, 19.0, 6.0, 20, -96), ('c_br', 62, 16.5, 5.6, 26, -92)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=L, W=W, a0=a0, a1=a1, cup=0.7, ripple=0.35, tris=48, thick=0.9,
                                  root_r=1.4, shape=0.5, power=1.1, curl=0.4)
    CORNERS[nm] = (lo, hi, root)

arm_r = tt.arm('arm_r', [(6.0, -0.8, 22.4), (6.9, -4.8, 21.9), (3.6, -8.3, 21.6)], hand=1.9, mitt=(0.3, -0.4, 0.8))
arm_l = tt.arm('arm_l', [(-6.1, 0.2, 22.4), (-8.4, -0.3, 21.0), (-9.4, -0.9, 18.6)], hand=1.9)
feet = tt.feet('feet', RINGS, size=(4.2, 5.2, 2.4))
F.part('body', tk.join([body[0], knot[0], cord[0], feet[0]], 'body'), body[1] + knot[1] + cord[1] + feet[1])
F.part('arm_r', arm_r[0], arm_r[1], bone='arm_r')
F.part('arm_l', arm_l[0], arm_l[1], bone='arm_l')
F.part('veil', veil_lo, [veil_hi], bone='veil', sharp=60)
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
kit.eyepin(F, at=(KNOT[0], KNOT[1] + 0.6, KNOT[2] + 1.4), bone='root')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('arm_r', (6.0, -0.8, 22.4), parent='root')
    R.bone('arm_l', (-6.1, 0.2, 22.4), parent='root')
    R.bone('veil', VPIV, parent='root')
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    a = math.radians(VEIL_A)
    vax = (-math.sin(a), math.cos(a), 0.0)   # the veil lifts about the knot's tangent (out and up)
    with R.action('gimmick'):
        bones = ['root', 'veil', 'arm_r', 'arm_l'] + list(CORNERS)
        # the fidgeting hand comes up in a shy little wave while it peeks
        k('arm_r', 18)
        k('arm_r', 24, rot=('X', -16), ease='BACK')
        for i, f in enumerate((28, 32, 36, 40)):
            k('arm_r', f, rot=[('X', -16), ('Z', 10 if i % 2 else -6)])
        k('arm_r', 48, rot=('X', -12))
        k('arm_r', 56)
        for b in bones:
            k(b, 0)
        # 0-10 a shy wriggle
        for i, f in enumerate((3, 6, 9)):
            k('root', f, rot=('Z', (7, -6, 3)[i]))
        k('root', 12)
        # 12-24 the veil flicks up (out over the knot), it leans in to peek with both eyes; holds; hides again
        k('veil', 11, rot=[(vax, -5)])
        k('veil', 20, rot=[(vax, -78)], ease='BACK')
        k('root', 22, rot=('X', -6), scale=(1.02, 0.98, 1.02))
        k('veil', 46, rot=[(vax, -74)])
        k('root', 46, rot=('X', -5))
        k('veil', 54, rot=[(vax, 0)], ease='BOUNCE')
        k('root', 56, rot=('X', 2))
        k('root', 62)
        # the mist wisps down its back sway all the while (lagging)
        for j, nm in enumerate(('c_bl', 'c_br')):
            root = np.array(CORNERS[nm][2])
            ax = tuple(np.cross((0, 0, 1), root * (1, 1, 0)))
            for i, f in enumerate(range(6 + 3 * j, 64, 10)):
                k(nm, f, rot=[(ax, (8 if i % 2 else -6) * (1 - f / 80))])
        k('c_fr', 18)
        k('c_fr', 23, rot=('X', -12), ease='BACK')
        k('c_fr', 50)
        for b in bones:
            k(b, 72)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.0)
    GAUZE = pt.ramp('#dcd8e6', 7, shift=0.07)
    P.fill('cloth', GAUZE, tone=sh, base=0.06 * tk.smoothstep(20, 34, Z) - 0.1 * tk.smoothstep(8, 0, Z))
    P.fill('corner', GAUZE, tone=sh, base=0.14)
    P.fill('veil', pt.ramp('#e9e6f0', 7, shift=0.07), tone=sh, base=0.14 - 0.08 * tk.smoothstep(20, 8, Z))
    # haze bands (kasumi): long rounded bands with stepped ends, in a cooler lilac-grey, wrapped round the cloth
    th = np.arctan2(Yc, X)
    face_zone = (Yc < -3) & (np.abs(X) < 9.0) & (Z < 15.5)
    band = np.zeros_like(P.mask)
    for z0, a0, a1, h in ((27.5, -0.6, 2.2, 1.3), (23.0, 1.6, 4.2, 1.1), (12.5, 0.2, 2.9, 1.5), (4.0, -2.4, 0.5, 1.2), (30.5, 3.0, 5.2, 0.9)):
        ang = np.mod(th - a0, 2 * math.pi)
        span = (a1 - a0)
        t = ang / span
        step = np.where(t < 0.12, 0.45, np.where(t > 0.88, 0.6, 1.0))  # (the stepped, rounded ends)
        band |= (t <= 1) & (np.abs(Z - z0 - 0.5 * np.sin(t * 6)) < h * step)
    for r in ('cloth', 'corner', 'veil'):
        P.fill(P.region(r) & band & ~face_zone, pt.ramp('#aaa2c6', 6, shift=0.06), tone=sh * 0.7, base=0.05)
    P.fill('scarf', pt.ramp('#eef0f6', 6, shift=0.06), tone=sh, base=0.16 + 0.1 * tk.smoothstep(NECK_Z - 3, NECK_Z + 2, Z))
    P.fill('hand', GAUZE, tone=sh, base=0.16)
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    # the face: dots wide apart (the left one under the veil), a small upturned mouth, a shy blush
    import face
    fc = face.Face(P, c=FACE, axis=(0, -1, 0.1), where=P.region('cloth'), seed=31)
    fc.blush(9.8, -1.0, rx=2.1, ry=1.25, col='#eca6b6')
    fc.eyes('side', spread=6.6, size=0.72, dy=1.1, look=1)
    fc.mouth('upturn', w=2.4, dy=-1.5, du=0.7)
    P.lines(['cloth', 'corner', 'veil'], ['scarf'], step=1)
    P.lines(['veil'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin'), ('arm_r', 'body'), ('arm_l', 'body')] + [(c, 'body') for c in CORNERS],
       cam=((60, -84, 52), (0, 0, 21)), fold=(0, 20, 34, 56), frames=72)
