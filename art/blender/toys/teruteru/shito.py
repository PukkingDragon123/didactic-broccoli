"""しとしと Shito-shito (Drizzle): series teruteru, Upside-Down Rain Charms (concepts_B.md).

A teru-teru bōzu hung head-down until it turned into a raindrop: the cloth-covered head at the bottom (it stands on
its flattened crown), a faded red string round the neck, the cloth sack gathered up into a knot whose four
handkerchief corners hang limp like wet ears. Grey-blue and soggy, a sleepy painted eye and one drawn in marker with
the ink running, three fat drops clinging to the corner tips. A keychain (screw eye, ball chain).
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

F = bk.start('teruteru', 'shito')

# ------------------------------------------------------------------ the body: head, neck, sack (one cloth form)
#        z     r     x-lean  depth (front/back half-depth factor)
RINGS = [(0.0, 5.4, 0.0), (0.8, 8.4, 0.0), (3.0, 11.0, 0.0), (7.2, 12.3, 0.0), (11.4, 11.8, 0.0), (15.2, 9.6, 0.0),
         (17.9, 7.0, 0.0), (19.2, 6.8, 0.1), (21.2, 7.9, 0.2), (24.2, 7.9, 0.5), (27.4, 6.5, 0.9), (30.2, 4.6, 1.4),
         (32.4, 3.1, 1.8), (33.6, 2.5, 2.0)]
NECK_Z = 18.5
KNOT = (2.1, 0.0, 34.6)
body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=7, fold_amp=0.55, soggy=0.5,
               cheeks=((-5.4, 6.6), (5.4, 6.6)), tris=520)
knot = tt.knot('knot', KNOT, r=2.9, h=3.6, lean=(0.25, 0.0), tris=70)
cord = tt.neck_cord('cord', NECK_Z, RINGS, bow_at=-35, ends=((-0.6, -6.5), (0.8, -7.8)), thick=0.75, tris=150)

# ------------------------------------------------------------------ the four corners: limp, wet, hanging like ears
CORNERS = {}
TIPS = {}
for nm, ang, L, droop in (('c_fl', -132, 15.0, 1.0), ('c_fr', -50, 15.5, 1.05), ('c_bl', 135, 13.5, 0.95), ('c_br', 42, 14.5, 1.0)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=L, W=11.0, a0=24, a1=-112 * droop, cup=1.2, ripple=0.35, tris=80, thick=1.1,
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

# ------------------------------------------------------------------ the keychain
chain_lo, chain_hi, HANG = bk.keychain((KNOT[0], KNOT[1], KNOT[2] + 1.4), h=11.0, w=8.5, lean=8)

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body[0], knot[0], cord[0]], 'body'), body[1] + knot[1] + cord[1])
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
for nm, (lo, his, tip, cn) in DROPS.items():
    F.part(nm, lo, his, bone=nm, kind='gloss', uvw=0.7)
F.part('chain', chain_lo, chain_hi, bone='chain', kind='metal', uvw=0.5)


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
    R.bone('chain', (KNOT[0], KNOT[1], KNOT[2] + 2), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    R.point('hang', HANG, bone='chain')
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'chain'] + list(CORNERS) + list(DROPS)
        for b in bones:
            k(b, 0)
        # 0-7 a sniff: it squashes down, then the shiver (brrr) on its crown
        k('root', 4, scale=(1.05, 0.93, 1.05))
        k('root', 7, scale=(0.97, 1.04, 0.97))
        for i, f in enumerate(range(9, 25, 2)):
            k('root', f, rot=('Y', 5.0 * (1 if i % 2 else -1) * (1 - i / 9)), ease='LINEAR')
        k('root', 26)
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

FACE_C = (0.0, -11.0, 10.6)


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
    P.fill('drop', pt.ramp('#8cc3e6', 6, shift=0.05, light=0.6), tone=sh * 0.6, base=0.1)
    P.fill('metal', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    tt.drop_gloss(P, 'drop')
    # the face, drawn the right way up on the upside-down head
    f = bk.Face(P, FACE_C, (0, -1, 0), depth=5, where=P.region('cloth'))
    P.flat(f.ell(-5.0, -1.6, 2.8, 1.8) & (f.V < -1.0), '#e9a3a6')  # (blush, painted under everything else)
    P.flat(f.ell(5.2, -1.8, 2.6, 1.7) & (f.V < -1.1), '#e9a3a6')
    # the painted eye (left): a sleepy bead under a heavy lid, a catchlight
    e = f.ell(-4.0, 1.3, 1.95, 2.15)
    P.flat(e, '#1d1a22')
    P.flat(e & (f.V > 1.55 + 0.3 * np.cos((f.U + 4.0) / 2.0)), CLOTH[3])
    P.flat(f.stroke(bk.arc(-4.0, 1.25, 2.1, 12, 168, 10, ry=0.6), 0.55), '#1d1a22')
    P.flat(f.ell(-4.65, 0.6, 0.55), '#f6f2ea')
    P.flat(f.ell(-3.3, 0.1, 0.25), '#f6f2ea')
    P.flat(f.stroke([(-6.1, 3.8), (-4.3, 4.25), (-2.5, 4.75)], 0.5, taper=True), '#2b2830')
    # the marker eye (right): a scribbled blob with the pen's overshoot, and the ink running down in the rain
    blob = f.ell(4.2, 1.2, 1.7, 1.9, rot=12)
    for i in range(5):
        blob |= f.stroke([(2.8 + 0.1 * i, 0.0 + 0.55 * i), (5.5 + 0.2 * i, 0.4 + 0.55 * i)], 0.45)
    P.flat(blob, '#262330')
    P.flat(f.ell(3.7, 1.9, 0.45), '#5d6278')  # (the marker's wet sheen)
    for u0, L, w in ((3.4, 5.6, 0.5), (4.8, 3.9, 0.42), (2.6, 2.6, 0.36)):
        pts = [(u0 + 0.25 * math.sin(i * 1.7), -0.5 - L * i / 6) for i in range(7)]
        P.flat(f.stroke(pts, w, taper=True), '#3a3f58')
    # a small wobbly pout
    P.flat(f.stroke([(-1.5, -2.9), (-0.7, -2.45), (0.1, -2.8), (0.9, -2.5), (1.5, -2.85)], 0.5), '#2a2328')
    P.lines(['cloth', 'corner'], ['cord'], step=2)
    P.lines(['cord'], step=1)
    P.lines(['drop'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'chain')] + [(c, 'body') for c in CORNERS], cam=((60, -84, 52), (0, 0, 24)),
       fold=(0, 12, 36, 92), frames=100)
