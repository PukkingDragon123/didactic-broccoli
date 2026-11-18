"""パラパラ Para-para (Hail): series teruteru, Upside-Down Rain Charms (concepts_B.md).

A charm made from a sheet of yesterday's newspaper: crumpled washi printed with columns of text, stiff paper corners
sticking out of its knot at all angles, hailstones frozen into its creases, and its cheeks puffed full of more.
A keychain (screw eye in the knot).
Gimmick: it puffs itself up and spits three hailstones, pa-ra-pa-ra, that bounce off the shelf; then it has more.

    tools/blender.sh art/blender/toys/teruteru/para.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('teruteru', 'para')

RINGS = [(0.0, 5.8, 0.0), (0.8, 8.8, 0.0), (3.0, 11.3, 0.0), (7.2, 12.6, 0.0), (11.4, 12.1, 0.0), (15.2, 9.8, 0.0),
         (17.9, 7.2, 0.0), (19.2, 7.0, -0.1), (21.2, 8.2, -0.2), (24.2, 8.4, -0.3), (27.2, 7.0, -0.4), (30.0, 4.9, -0.5),
         (32.2, 3.2, -0.6), (33.4, 2.5, -0.6)]
NECK_Z = 18.5
KNOT = (-0.6, 0.0, 34.4)
FACE = (0.0, -12.5, 7.7)
MOUTH = (FACE[0] + 0.6, FACE[1], FACE[2] - 1.9)

rng = np.random.default_rng(7)
# the creases of the crumpled sheet: random fold lines (a point and a normal each), sharper on the sack
CREASES = []
for i in range(36):
    z = rng.uniform(NECK_Z + 1, 33) if i < 24 else rng.uniform(2, 16)
    r, xc = tt.ring_r(RINGS, z)
    a = rng.uniform(0, 2 * math.pi)
    if i >= 24 and math.sin(a) < -0.35:  # (none across the face)
        a = -a
    p = np.array((xc + r * math.cos(a), r * math.sin(a), z))
    n = rng.normal(size=3)
    n -= p * 0 + n.dot(np.array((math.cos(a), math.sin(a), 0))) * np.array((math.cos(a), math.sin(a), 0))
    CREASES.append((p, n / np.linalg.norm(n), rng.uniform(5, 9) if i < 24 else rng.uniform(4, 7), 0.8 if i < 24 else 0.4))


def crumple(V, N, th):
    d = np.zeros(len(V))
    for p, n, R, a in CREASES:
        dist = np.abs((V - p) @ n)
        fall = np.clip(1 - np.linalg.norm(V - p, axis=1) / R, 0, 1) ** 1.5
        d -= a * np.clip(1 - dist / 0.45, 0, 1) * fall      # the crease itself (a V groove)
        d += 0.4 * a * np.clip(1 - dist / 1.6, 0, 1) * fall  # the ridge either side of it
    return d


body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=6, fold_amp=0.4, cheeks=((-5.6, 7.2), (5.6, 7.2)), tris=440,
               extra=crumple)
# (puffed cheeks: more than the others)
tk.push(body[1][0], lambda V, N: sum(tk.bump(V, (sx * 5.9, -11.8, 7.0), 5.0, 0.55, sharp=1.6) for sx in (-1, 1)))
knot = tt.knot('knot', KNOT, r=2.9, h=3.6, tris=50, turns=0.6)
cord = tt.neck_cord('cord', NECK_Z, RINGS, bow_at=-170, ends=((0.6, -6.0), (-0.9, -7.5)), thick=0.7, tris=110)

# ------------------------------------------------------------------ stiff paper corners at all angles
CORNERS = {}
for nm, ang, L, a0, a1, tw in (('c_fl', -140, 9.5, 58, 30, 25), ('c_fr', -38, 10.5, 40, 12, -30), ('c_bl', 128, 8.5, 70, 48, -15),
                              ('c_br', 30, 10.0, 22, -8, 35)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=L, W=8.0, a0=a0, a1=a1, cup=0.5, ripple=0.55, tris=40, thick=0.9,
                                  root_r=1.6, shape=0.75, power=1.0, twist=tw)
    CORNERS[nm] = (lo, hi, root)

# ------------------------------------------------------------------ hailstones frozen into the creases
ICE_AT = [(-3.4, 31.0, 1.5), (60, 26.5, 1.25), (150, 23.0, 1.4), (-120, 22.6, 1.15), (210, 29.5, 1.0), (15, 21.6, 1.1)]
ice_lo, ice_hi = [], []
for a, z, r in ICE_AT:
    rr, xc = tt.ring_r(RINGS, z)
    t = math.radians(a)
    c = (xc + (rr + r * 0.25) * math.cos(t), (rr + r * 0.25) * math.sin(t), z)
    prof = [(0, -r)] + [(r * math.sin(q) * (1 + 0.08 * math.sin(3 * q)), -r * math.cos(q)) for q in np.linspace(0.5, math.pi - 0.5, 4)] + [(0, r)]
    lo = tk.lathe('ice', prof, n=6, centre=c)
    hi = tk.lathe('ice_hi', [(0, -r)] + [(r * math.sin(q) * (1 + 0.08 * math.sin(3 * q)), -r * math.cos(q)) for q in np.linspace(0.2, math.pi - 0.2, 9)] + [(0, r)], n=14, centre=c)
    tk.subsurf(hi, 1)
    tk.set_region(hi, 'ice')
    ice_lo.append(lo)
    ice_hi.append(hi)

# ------------------------------------------------------------------ the three it spits (hidden in its cheeks at rest)
SPIT = {}
for nm, off, r in (('hail_a', (-1.4, 4.2, 0.6), 1.45), ('hail_b', (1.3, 4.6, -0.2), 1.3), ('hail_c', (0.2, 5.2, 1.1), 1.2)):
    c = tuple(np.array(MOUTH) + np.array(off))
    lo = tk.lathe(nm, [(0, -r), (r * 0.8, -r * 0.6), (r, 0), (r * 0.8, r * 0.6), (0, r)], n=6, centre=c)
    hi = tk.lathe(nm + '_hi', [(0, -r)] + [(r * math.sin(q), -r * math.cos(q)) for q in np.linspace(0.2, math.pi - 0.2, 9)] + [(0, r)], n=14, centre=c)
    tk.subsurf(hi, 1)
    tk.set_region(hi, 'ice')
    SPIT[nm] = (lo, hi, c, r)

# ------------------------------------------------------------------ parts
ARMS = {}
for nm, sx in (('arm_r', 1), ('arm_l', -1)):  # little fists up by its sides, in a huff
    lo_, hi_, hc_ = tt.arm(nm, [(sx * 6.4, -0.6, 22.6), (sx * 8.9, -1.8, 23.5), (sx * 10.1, -3.0, 25.6)], hand=2.2)
    ARMS[nm] = (lo_, hi_, (sx * 6.4, -0.6, 22.6))
feet = tt.feet('feet', RINGS)
F.part('body', tk.join([body[0], knot[0], cord[0], feet[0]], 'body'), body[1] + knot[1] + cord[1] + feet[1])
for nm, (lo_, hi_, sh_) in ARMS.items():
    F.part(nm, lo_, hi_, bone=nm)
F.part('ice', tk.decimate(tk.join(ice_lo, 'ice'), 170), ice_hi, kind='gloss', uvw=0.8)
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=55)
for nm, (lo, hi, c, r) in SPIT.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss', uvw=0.5)
kit.eyepin(F, at=(KNOT[0], KNOT[1], KNOT[2] + 1.6), bone='root')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    for nm, (lo_, hi_, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='root')
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    for nm, (lo, hi, c, r) in SPIT.items():
        R.bone(nm, c, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'arm_r', 'arm_l'] + list(CORNERS) + list(SPIT)
        # the fists: pulled in while it puffs up, thrown up and out with each spit
        for nm, sx in (('arm_r', 1), ('arm_l', -1)):
            k(nm, 12, rot=('Y', sx * 10))
            for i in range(3):
                k(nm, 18 + i * 7, rot=('Y', -sx * 22), ease='BACK')
                k(nm, 22 + i * 7, rot=('Y', sx * 4))
            k(nm, 46)
        for b in bones:
            k(b, 0)
        # 0-14 it breathes in and puffs up (the corners bristle), holds it...
        k('root', 4, scale=(0.97, 1.03, 0.97))
        k('root', 12, rot=('X', 5), scale=(1.07, 0.97, 1.07))
        for nm, (lo, hi, root) in CORNERS.items():
            ax = tuple(np.cross((0, 0, 1), np.array(root) * (1, 1, 0)))
            k(nm, 4)
            k(nm, 12, rot=[(ax, -14)], ease='BACK')
        k('root', 16, rot=('X', 6), scale=(1.08, 0.96, 1.08))
        # ... then pa-ra-pa-ra: three hailstones shot out of its mouth, each bouncing twice on the shelf
        for i, (nm, (lo, hi, c, r)) in enumerate(SPIT.items()):
            t0 = 18 + i * 7
            k('root', t0, rot=('X', -7), scale=(0.98, 1.02, 0.98), ease='BACK')
            k('root', t0 + 4, rot=('X', 3), scale=(1.05, 0.98, 1.05))
            side = (-5.0, 3.5, 0.8)[i]
            mouth = np.array(MOUTH) + np.array((0, -0.4, 0))
            land1 = np.array((side, -24.0 - 3 * i, r))
            land2 = np.array((side * 1.5, -33.0 - 2 * i, r))
            stop = np.array((side * 1.7, -38.0 - 2 * i, r))
            k(nm, t0 - 1, scale=0.6)
            k(nm, t0, move=tuple(mouth - np.array(c)), scale=0.8, ease='LINEAR')
            k(nm, t0 + 2, move=tuple(mouth + np.array((side * 0.25, -5.0, 1.6)) - np.array(c)), scale=1.0, ease='LINEAR')
            k(nm, t0 + 6, move=tuple(land1 - np.array(c)), ease='LINEAR')
            k(nm, t0 + 9, move=tuple((land1 + land2) / 2 + np.array((0, 0, 3.0)) - np.array(c)), ease='LINEAR')
            k(nm, t0 + 12, move=tuple(land2 - np.array(c)), ease='LINEAR')
            k(nm, t0 + 14, move=tuple((land2 + stop) / 2 + np.array((0, 0, 0.9)) - np.array(c)), ease='LINEAR')
            k(nm, t0 + 16, move=tuple(stop - np.array(c)))
            k(nm, 66, move=tuple(stop - np.array(c)), ease='CONSTANT')
            k(nm, 70, move=tuple(stop - np.array(c)), scale=0.01, ease='CONSTANT')
            k(nm, 71, scale=0.01)
            k(nm, 84, scale=0.01)
        k('root', 40)
        for nm, (lo, hi, root) in CORNERS.items():
            k(nm, 40, rot=[(tuple(np.cross((0, 0, 1), np.array(root) * (1, 1, 0))), -14)])
            k(nm, 46, ease='BACK')
        # 46-80 a satisfied little hop, the stones melt away on the shelf
        k('root', 50, move=(0, 0, 2.0), scale=(0.97, 1.04, 0.97))
        k('root', 55, ease='BOUNCE')
        for b in bones:
            k(b, 86)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.9, cav=1.4)
    PAPER = pt.ramp('#e6dcc2', 7, shift=0.06)
    P.fill('cloth', PAPER, tone=sh, base=0.05 - 0.2 * tk.smoothstep(8, 0, Z) + 0.08 * tk.smoothstep(24, 33, Z))
    P.fill('corner', PAPER, tone=sh, base=0.08)
    # the newspaper's print (vertical Japanese columns): articles of text with ragged column ends and paragraph gaps,
    # rules between articles, one headline in big heavy characters, a halftone photo on the back
    def hsh(i, j, k=0.0):
        return np.mod(np.sin(i * 12.9898 + j * 78.233 + k * 37.719) * 43758.5453, 1.0)
    th = np.arctan2(Yc, X)
    u = (th + math.pi) * 10.5            # (mm round the body, about)
    ci = np.floor(u / 1.45)
    art = np.floor(ci / 6)               # articles six columns wide, each with its own rules and top
    top = 4.0 + 7.0 * hsh(art, 3.0)
    zz = Z - top
    cj = np.floor(zz / 1.15)
    fu, fz = np.mod(u, 1.45) / 1.45, np.mod(zz, 1.15) / 1.15
    glyph = (fu > 0.12) & (fu < 0.82) & (fz > 0.1) & (fz < 0.86)
    kind = hsh(ci, cj, 1.0)
    glyph &= ~((kind < 0.3) & (fu > 0.42) & (fu < 0.52)) & ~((kind > 0.75) & (fz > 0.45) & (fz < 0.55))
    ragged = hsh(ci, np.floor(cj / 9), 2.0) * 9 > np.mod(cj, 9) + 0.0
    text = glyph & ragged & (hsh(ci, cj, 4.0) > 0.08) & (zz > 0.5)
    rule = (np.abs(zz) < 0.22) | (np.mod(ci, 6) == 0) & (fu < 0.1)
    face_zone = (Yc < -3) & (np.abs(X) < 9.5) & (Z < 16.5)
    hl = (art == np.floor((math.pi * 0.6 + math.pi) * 10.5 / 1.45 / 6)) & (np.mod(ci, 6) == 3)
    big = hl & (np.mod(zz, 2.6) > 0.3) & (np.mod(zz, 2.6) < 2.3) & (Z > 20) & (Z < 31)
    photo_u, photo_z = (math.pi * 0.42 + math.pi) * 10.5, 9.5
    photo = (np.abs(u - photo_u) < 4.2) & (np.abs(Z - photo_z) < 3.4)
    half = photo & (((np.mod(u, 0.7) - 0.35) ** 2 + (np.mod(Z, 0.7) - 0.35) ** 2) < (0.06 + 0.07 * (1 + np.sin(u * 0.9) * np.cos(Z * 1.1))))
    for r in ('cloth', 'corner'):
        reg = P.region(r) & ~face_zone & (Z > 1.2)
        P.fill(reg & text & ~photo & ~hl, pt.ramp('#9a9282', 5, shift=0.05), tone=sh * 0.6, base=0.05)
        P.fill(reg & (rule | big | (photo & ~half)) & ~(photo & ~half & ~rule), pt.ramp('#3b3633', 5, shift=0.05), tone=sh * 0.5, base=0.1)
        P.fill(reg & photo & ~half, pt.ramp('#c9bfa8', 5, shift=0.05), tone=sh * 0.6, base=0.05)
        P.fill(reg & half, pt.ramp('#4a4440', 5, shift=0.05), tone=sh * 0.5, base=0.1)
    P.fill('ice', pt.ramp('#cfe6f2', 6, shift=0.05, light=0.6), tone=sh * 0.6, base=0.12)
    tt.drop_gloss(P, 'ice')
    P.fill('cord', pt.ramp('#46607c', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('hand', PAPER, tone=sh, base=0.12)
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    # the face: puffed cheeks (rosy), dots wide apart, a short slanted dash of a mouth (cross, cheeks full)
    import face
    fc = face.Face(P, c=FACE, axis=(0, -1, 0.1), where=P.region('cloth'), seed=21)
    fc.blush(11.8, -1.0, rx=2.4, ry=1.6, col='#eba09a')
    fc.eyes('squeeze', spread=7.0, size=0.8, dy=1.3)
    fc.mouth('pout', w=2.2, dy=-1.8, du=0.3)
    P.lines(['cloth', 'corner'], ['cord', 'ice'], step=2)
    P.lines(['ice'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin'), ('body', 'ice'), ('arm_r', 'body'), ('arm_l', 'body')] + [(c, 'body') for c in CORNERS] + [(s_, 'body') for s_ in SPIT],
       cam=((60, -84, 52), (0, 0, 20)), fold=(0, 16, 26, 40), frames=86)
