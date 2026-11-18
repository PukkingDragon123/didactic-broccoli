"""しとしと Shito-shito (Drizzle): series teruteru, Upside-Down Rain Charms (concepts_B.md).

A teru-teru bōzu hung head-down until it turned into a raindrop: the cloth-covered head at the bottom (it stands on
its flattened crown), a faded red string round the neck, the cloth sack gathered up into a knot whose four
handkerchief corners hang limp like wet ears. Grey-blue and soggy, a sleepy painted eye and one drawn in marker with
the ink running, three fat drops clinging to the corner tips. A keychain (it hangs by the screw eye in its knot).
Gimmick: it shivers, the drops let go one by one and splash on the shelf, the corners flick up, the drops well up
again.

    tools/blender.sh art/blender/toys/teruteru/shito.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('teruteru', 'shito')

# ------------------------------------------------------------------ the body: head, neck, sack (one cloth form)
#        z     r     x-lean  depth (front/back half-depth factor)
RINGS = [(0.0, 5.4, 0.0), (0.8, 8.4, 0.0), (3.0, 11.0, 0.0), (7.2, 12.3, 0.0), (11.4, 11.8, 0.0), (15.2, 9.6, 0.0),
         (17.9, 7.0, 0.0), (19.2, 6.8, 0.1), (21.2, 7.9, 0.2), (24.2, 7.9, 0.5), (27.4, 6.5, 0.9), (30.2, 4.6, 1.4),
         (32.4, 3.1, 1.8), (33.6, 2.5, 2.0)]
NECK_Z = 18.5
KNOT = (2.1, 0.0, 34.6)
body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=7, fold_amp=0.55, soggy=0.5,
               cheeks=((-5.4, 6.6), (5.4, 6.6)), tris=430)
knot = tt.knot('knot', KNOT, r=2.9, h=3.6, lean=(0.25, 0.0), tris=70)
cord = tt.neck_cord('cord', NECK_Z, RINGS, bow_at=-8, ends=((-0.6, -6.5), (0.8, -7.8)), thick=0.75, tris=110)

# ------------------------------------------------------------------ the four corners: limp, wet, hanging like ears
CORNERS = {}
TIPS = {}
for nm, ang, L, droop in (('c_fl', -132, 15.0, 1.0), ('c_fr', -50, 15.5, 1.05), ('c_bl', 135, 13.5, 0.95), ('c_br', 42, 14.5, 1.0)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=L, W=11.0, a0=24, a1=-112 * droop, cup=1.2, ripple=0.35, tris=52, thick=1.1,
                                  root_r=1.2, shape=0.32, power=0.9)
    CORNERS[nm] = (lo, hi, root)
    TIPS[nm] = tip

# ------------------------------------------------------------------ the drops hanging from three tips
DROPS = {}
for nm, cn, r in (('drop_a', 'c_fr', 1.75), ('drop_b', 'c_fl', 1.5), ('drop_c', 'c_br', 1.6)):
    tip = np.array(TIPS[cn]) + np.array((0, 0, 0.35))
    hi = bk.drop(nm + '_hi', tuple(tip), r, r * 2.9, n=16)
    tk.subsurf(hi, 1)
    tk.set_region(hi, 'drop')
    lo = bk.drop(nm, tuple(tip), r, r * 2.9, n=7)
    tk.decimate(lo, 30)
    DROPS[nm] = (lo, [hi], tuple(tip), cn)


# ------------------------------------------------------------------ parts
# ------------------------------------------------------------------ arms (one holding up a taro-leaf umbrella), feet
arm_r = tt.arm('arm_r', [(6.0, -0.4, 22.4), (8.4, -1.1, 23.8), (10.4, -1.7, 26.6)], mitt=(-0.3, -0.9, 0.3))
arm_l = tt.arm('arm_l', [(-6.2, -0.4, 22.2), (-8.7, -1.5, 21.2), (-10.0, -2.3, 18.9)], mitt=(0.4, -0.9, 0.0))
feet = tt.feet('feet', RINGS)
LEAF_C = np.array((14.0, -1.6, 43.0))
stem_pts = [arm_r[2], tuple(np.array(arm_r[2]) + np.array((0.9, 0.0, 5.0))), tuple(LEAF_C + np.array((-0.6, 0, -6.0))), tuple(LEAF_C + np.array((0.3, 0, -1.6)))]
stem_lo = tk.tube('stem', stem_pts, [0.75, 0.7, 0.65, 0.6], n=5, cap0='round', cap1='flat')
stem_hi = tk.tube('stem_hi', stem_pts, [0.75, 0.7, 0.65, 0.6], n=10, cap0='round', cap1='flat')
tk.subsurf(stem_hi, 1)
tk.set_region(stem_hi, 'stem')


def leaf_outline(k):
    # a taro leaf seen from above: a broad heart, the notch at the stem end (toward -x), a drip tip at +x
    pts = []
    for t in np.linspace(0, 2 * math.pi, k, endpoint=False):
        r = 10.5 * (1 - 0.18 * math.cos(t)) * (1 - 0.28 * math.exp(-((t - math.pi) / 0.32) ** 2))
        r *= 1 + 0.12 * math.exp(-(min(t, 2 * math.pi - t) / 0.25) ** 2)
        pts.append((r * math.cos(t), 0.85 * r * math.sin(t)))
    return pts


def place_leaf(o, dome=0.05):
    tk.deform(o, lambda V: np.c_[V[:, 0], V[:, 1], V[:, 2] - dome * (V[:, 0] ** 2 + V[:, 1] ** 2)])
    tk.rotate(o, 16, 'Y')
    tk.rotate(o, -8, 'X')
    tk.move(o, tuple(LEAF_C))
    return o


leaf_lo = tk.slab('leaf', leaf_outline(14), 0.7, plane='XY', bevel=0, segs=0)
tk.subsurf(leaf_lo, 2)
place_leaf(leaf_lo)
leaf_hi = tk.slab('leaf_hi', leaf_outline(48), 0.75, plane='XY', bevel=0.25, segs=1)
tk.subsurf(leaf_hi, 2)
tk.push(leaf_hi, lambda V, N: -0.22 * (np.abs(np.sin(np.arctan2(V[:, 1], V[:, 0]) * 4.5)) < 0.12) * (np.hypot(V[:, 0], V[:, 1]) > 1.5)
        - 0.25 * np.exp(-(V[:, 1] / 0.3) ** 2) * (V[:, 0] > 0))  # (the veins, and the midrib)
place_leaf(leaf_hi)
tk.set_region(leaf_hi, 'leaf')
tk.decimate(leaf_lo, 90)
kit.eyepin(F, at=(KNOT[0], KNOT[1], KNOT[2] + 1.6), bone='root')
F.part('body', tk.join([body[0], knot[0], cord[0], feet[0]], 'body'), body[1] + knot[1] + cord[1] + feet[1])
F.part('arm_r', tk.join([arm_r[0], stem_lo, leaf_lo], 'arm_r'), arm_r[1] + [stem_hi, leaf_hi], bone='arm_r', sharp=70)
F.part('arm_l', arm_l[0], arm_l[1], bone='arm_l')
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
for nm, (lo, his, tip, cn) in DROPS.items():
    F.part(nm, lo, his, bone=nm, kind='gloss', uvw=0.7)


# ------------------------------------------------------------------ rig and the gimmick
def drop_path(tip, rd, ld):
    """Where a drop runs: down from the tip, over the sack and the head's cheek, never inside the cloth (its whole
    length below the tip: ld), then off the cheek to the shelf. Offsets from the tip, one per frame."""
    tip = np.array(tip)
    rad = tip[:2] / np.linalg.norm(tip[:2])
    pts, rmax = [], np.linalg.norm(tip[:2])
    zs = np.linspace(tip[2], ld + 0.2, 11)
    for z in zs:
        if z > 4.0:  # (the widest of the cloth along the drop and down to the next key: straight lines between keys)
            rmax = max([rmax] + [tt.ring_r(RINGS, q)[0] + rd + 0.9 for q in np.linspace(z, z - (zs[0] - zs[1]) - ld, 9)])
        pts.append(np.array((*(rad * rmax), z)) - tip)
    return pts


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    for nm, (lo, his, tip, cn) in DROPS.items():
        R.bone(nm, tip, parent='root')
    R.bone('arm_r', (6.0, -0.4, 22.4), parent='root')
    R.bone('arm_l', (-6.2, -0.4, 22.2), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'arm_r', 'arm_l'] + list(CORNERS) + list(DROPS)
        for b in bones:
            k(b, 0)
        # 0-7 a sniff: it squashes down, then the shiver (brrr) on its crown
        k('root', 4, scale=(1.05, 0.93, 1.05))
        k('root', 7, scale=(0.97, 1.04, 0.97))
        for i, f in enumerate(range(9, 25, 2)):
            k('root', f, rot=('Y', 5.0 * (1 if i % 2 else -1) * (1 - i / 9)), ease='LINEAR')
        k('root', 26)
        for i, f in enumerate(range(9, 25, 4)):
            k('arm_l', f, rot=('Y', (-14 if i % 2 else 10)), ease='LINEAR')
            k('arm_r', f, rot=('X', (3 if i % 2 else -3)), ease='LINEAR')
        k('arm_l', 27)
        k('arm_r', 27)
        k('arm_r', 66)
        k('arm_r', 72, rot=('Y', 9))
        k('arm_r', 80, rot=('Y', -3))
        k('arm_r', 86)
        # the drops let go one at a time: each runs down the cloth, over the cheek and splashes flat on the shelf;
        # its corner, relieved, springs up
        for t0, (nm, (lo, his, tip, cn)) in zip((28, 40, 52), DROPS.items()):
            path = drop_path(tip, 1.7, 1.75 * 2.9 * 1.3)
            k(nm, t0 - 3, scale=(0.9, 1.25, 0.9))
            k(nm, t0, scale=(0.85, 1.35, 0.85))
            for j, q in enumerate(path[1:], 1):
                k(nm, t0 + j, move=tuple(q), scale=(0.85, 1.3, 0.85), ease='LINEAR')
            te = t0 + len(path) - 1
            land = path[-1] + np.array((0, 0, 0.6 - (path[-1][2] + tip[2])))
            k(nm, te + 2, move=tuple(land), scale=(2.0, 0.14, 2.0))
            k(nm, te + 6, move=tuple(land + np.array((0, 0, -0.25))), scale=(2.5, 0.07, 2.5), ease='CONSTANT')
            k(nm, te + 7, move=(0, 0, 0), scale=0.01, ease='CONSTANT')
            k(cn, t0)
            k(cn, t0 + 4, rot=[(tuple(np.cross((0, 0, 1), np.array(tip) * (1, 1, 0))), -16)], ease='BACK')
            k(cn, t0 + 12)
        # 76-96 a last shudder, the corners shake out, and the drops well up again at the tips
        k('root', 74)
        k('root', 77, rot=('Y', -3))
        k('root', 80, rot=('Y', 2))
        k('root', 83)
        for i, nm in enumerate(DROPS):
            k(nm, 80 + 3 * i, scale=0.01)
            k(nm, 84 + 3 * i, scale=0.4)
            k(nm, 90 + 3 * i, scale=1.0, ease='BACK')
        for b in bones:
            k(b, 100)
    return R


# ------------------------------------------------------------------ paint
import paint as pt  # noqa: E402

FACE_C = (0.0, -12.4, 7.6)


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    CLOTH = pt.ramp('#9cb0c2', 7, shift=0.06)
    WET = pt.ramp('#73899f', 7, shift=0.06)
    # the airbrush: the water has run down into the head (darker, bluer at the bottom), the sack's top dries paler
    air = 0.16 * tk.smoothstep(22, 34, Z) - 0.28 * tk.smoothstep(9, 0, Z)
    P.fill('cloth', CLOTH, tone=sh, base=air)
    wet = P.region('cloth') & ((Z < 3.2 + 1.2 * np.sin(X * 0.7) + 0.8 * np.cos(Yc * 0.9)) | tt.spots(P, 5, 0.9, 1.4, seed=4, zmin=20, zmax=30))
    P.fill(wet, WET, tone=sh, base=0.05)
    P.fill('corner', CLOTH, tone=sh, base=0.12 - 0.3 * tk.smoothstep(31, 24, Z))
    P.fill('cord', pt.ramp('#b9564a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('hand', CLOTH, tone=sh, base=0.16)
    P.fill('leaf', pt.ramp('#5f9a4a', 7, shift=0.07), tone=sh, base=0.08 + 0.1 * tk.smoothstep(38, 46, Z))
    P.fill('stem', pt.ramp('#7fa45a', 6, shift=0.06), tone=sh, base=0.05)
    tt.drop_gloss(P, 'leaf')
    P.fill('drop', pt.ramp('#8cc3e6', 6, shift=0.05, light=0.6), tone=sh * 0.6, base=0.1)
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    tt.drop_gloss(P, 'drop')
    # the face, drawn the right way up on the upside-down head, low and small: two tiny dots close together and a
    # short slanted dash (glum); the rain has made one eye's ink run
    import face
    fc = face.Face(P, c=FACE_C, axis=(0, -1, 0.1), where=P.region('cloth'), seed=11)
    fc.blush(10.6, -1.0, rx=1.8, ry=1.0, col='#e9a7a9')
    fc.eyes('teary', spread=6.6, size=0.78, dy=1.0, look=1)
    fc.brows('worried', spread=6.8, dy=3.1, w=2.2, weight=0.42)
    fc.mouth('wobble', w=2.8, dy=-1.7)
    P.lines(['cloth', 'corner'], ['cord'], step=2)
    P.lines(['cord'], step=1)
    P.lines(['drop'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin'), ('arm_r', 'body'), ('arm_l', 'body')] + [(c, 'body') for c in CORNERS], cam=((66, -92, 58), (3, 0, 25)),
       fold=(0, 12, 36, 92), frames=100)
