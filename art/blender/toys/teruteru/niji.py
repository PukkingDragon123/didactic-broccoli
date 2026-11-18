"""にじくい Niji-kui (Rainbow Eater): the secret of series teruteru, Upside-Down Rain Charms (concepts_B.md).

The one that stops the rain for good: a black cloth charm, its face drawn in white chalk, two corners pricked up
like little ears, slurping a rainbow like a noodle; the rainbow's far end lies on the shelf. A keychain.
Gimmick: slurp: the rainbow is sucked in, it gulps (its head bulges), burps a little cloud, and a new rainbow
creeps back out.

    tools/blender.sh art/blender/toys/teruteru/niji.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('teruteru', 'niji')

RINGS = [(0.0, 7.2, 0.0), (0.8, 10.4, 0.0), (3.0, 13.0, 0.0), (7.2, 14.3, 0.0), (11.4, 13.4, 0.0), (15.2, 10.4, 0.0),
         (17.9, 7.2, 0.0), (19.2, 7.0, 0.0), (21.2, 8.0, 0.0), (24.0, 7.8, 0.0), (26.8, 6.3, 0.0), (29.4, 4.3, 0.0),
         (31.4, 2.9, 0.0), (32.4, 2.4, 0.0)]
NECK_Z = 18.5
KNOT = (0.0, 0.0, 33.4)
FACE = (0.0, -13.8, 8.0)
MOUTH = (0.0, -13.4, 6.4)

body = tt.body(RINGS, n=18, neck_z=NECK_Z, knot=KNOT, folds=7, fold_amp=0.5, cheeks=((-6.2, 7.0), (6.2, 7.0)), tris=440, depth=0.96)
knot = tt.knot('knot', KNOT, r=2.8, h=3.4, tris=50)
cord = tt.neck_cord('cord', NECK_Z, RINGS, bow_at=-20, ends=((-0.5, -5.5), (0.7, -6.8)), thick=0.75, tris=110)

# ------------------------------------------------------------------ corners: two pricked up like ears, two drooping
CORNERS = {}
for nm, ang, L, W, a0, a1 in (('c_fl', -128, 8.5, 6.5, 80, 58), ('c_fr', -52, 8.5, 6.5, 80, 60), ('c_bl', 140, 11.0, 7.0, 20, -80), ('c_br', 40, 11.5, 7.0, 18, -82)):
    lo, hi, root, tip = tt.corner(nm, KNOT, ang, L=L, W=W, a0=a0, a1=a1, cup=0.9, ripple=0.25, tris=40, thick=1.0,
                                  root_r=1.5, shape=0.85 if a0 > 50 else 0.5, power=1.2)
    CORNERS[nm] = (lo, hi, root)

# ------------------------------------------------------------------ the rainbow, slurped like a noodle
RB_X0, RB_DX = 2.0, 4.0   # (it comes out of the right end of the mouth and drifts right)
path = []
for t in np.linspace(0, 1, 26):
    # out of the mouth in a high arch (a rainbow), down onto the shelf and lying along it for its last stretch
    y = MOUTH[1] + 2.5 - 24.0 * t
    if t < 0.86:
        s_ = t / 0.86
        z = (MOUTH[2] - 0.4) * (1 - s_) + 0.65 * s_ + 10.0 * math.sin(math.pi * s_ ** 0.85)
    else:
        z = 0.65
    path.append((RB_X0 + RB_DX * t, y, z))
rb_rings = [{'c': p, 'w': 6.0, 'h': 0.62, 'e': 4.0} for p in path]
rb_lo = tk.loft('rainbow', rb_rings, n=4, up=(0, 0, 1), cap0='flat', cap1='round', capd=0.8)
rb_hi = tk.loft('rainbow_hi', rb_rings, n=12, up=(0, 0, 1), cap0='flat', cap1='round', capd=0.8)
tk.subsurf(rb_hi, 1)
tk.set_region(rb_hi, 'rainbow')

# ------------------------------------------------------------------ the burp cloud (hidden in the head at rest)
CLOUD_C = (0.0, -6.0, 7.6)
cl_lo, cl_hi = [], []
for dx, dz, r in ((-1.6, -0.3, 1.6), (0.3, 0.5, 2.0), (2.0, -0.2, 1.4)):
    c = (CLOUD_C[0] + dx, CLOUD_C[1], CLOUD_C[2] + dz)
    cl_lo.append(tk.lathe('cloud', [(0, -r), (r * 0.85, -r * 0.5), (r * 0.85, r * 0.5), (0, r)], n=6, centre=c))
    h = tk.lathe('cloud_hi', [(0, -r)] + [(r * math.sin(q), -r * math.cos(q)) for q in np.linspace(0.25, math.pi - 0.25, 7)] + [(0, r)], n=14, centre=c)
    tk.subsurf(h, 1)
    tk.set_region(h, 'cloud')
    cl_hi.append(h)

ARMS = {}
for nm, sx in (('arm_r', 1), ('arm_l', -1)):  # both hands on its full round belly
    lo_, hi_, hc_ = tt.arm(nm, [(sx * 6.7, -1.2, 21.4), (sx * 9.6, -3.9, 19.6), (sx * 11.2, -6.4, 16.6)], hand=2.1, mitt=(-sx * 0.3, -0.5, 0.8))
    ARMS[nm] = (lo_, hi_, (sx * 6.7, -1.2, 21.4))
feet = tt.feet('feet', RINGS, x=4.8)
F.part('body', tk.join([body[0], knot[0], cord[0], feet[0]], 'body'), body[1] + knot[1] + cord[1] + feet[1])
for nm, (lo_, hi_, sh_) in ARMS.items():
    F.part(nm, lo_, hi_, bone=nm)
for nm, (lo, hi, root) in CORNERS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)
F.part('rainbow', rb_lo, [rb_hi], bone='rainbow', kind='gloss')
F.part('cloud', tk.join(cl_lo, 'cloud'), cl_hi, bone='cloud', uvw=0.6)
kit.eyepin(F, at=(KNOT[0], KNOT[1] + 0.5, KNOT[2] + 1.5), bone='root')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    for nm, (lo_, hi_, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='root')
    R.bone('rainbow', (RB_X0, MOUTH[1], MOUTH[2]), parent='root')
    R.bone('cloud', CLOUD_C, parent='root')
    for nm, (lo, hi, root) in CORNERS.items():
        R.bone(nm, root, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'rainbow', 'cloud', 'arm_r', 'arm_l'] + list(CORNERS)
        # after the gulp it pats its belly (a little rub, one hand then the other)
        for nm, sx, t0 in (('arm_r', 1, 34), ('arm_l', -1, 38)):
            k(nm, t0)
            k(nm, t0 + 3, rot=('X', -6))
            k(nm, t0 + 6, rot=('X', 2))
            k(nm, t0 + 9, rot=('X', -5))
            k(nm, t0 + 13)
        for b in bones:
            k(b, 0)
        # 0-6 it leans back to get a grip on it; 6-26 sluuurp: the rainbow shrinks away into its mouth
        k('root', 5, rot=('X', 4))
        k('rainbow', 5, rot=('X', 4))
        for i, f in enumerate(range(8, 28, 3)):
            q = (i + 1) / 7
            k('rainbow', f, rot=('X', 4 - 26 * q), scale=max(0.04, (1 - q) ** 1.4), ease='LINEAR')
            k('root', f, rot=[('X', 4 - 2 * q), ('Z', 3 * (1 if i % 2 else -1))], ease='LINEAR')
        k('rainbow', 29, scale=0.01, ease='CONSTANT')
        # 28-36 gulp: the head swells, the ears prick up
        k('root', 30, scale=(1.1, 0.95, 1.1))
        k('root', 36, scale=(0.98, 1.02, 0.98), ease='BACK')
        for nm in ('c_fl', 'c_fr'):
            k(nm, 28)
            k(nm, 32, rot=('X', -14 if nm == 'c_fl' else -14), ease='BACK')
            k(nm, 44)
        # 38-58 burp: a little cloud puffs out of its mouth and floats up, gone
        k('cloud', 37, scale=0.3)
        k('cloud', 41, move=(0, -9.5, -0.6), scale=1.0, ease='BACK')
        k('cloud', 52, move=(0, -12.0, 7.0), scale=1.15)
        k('cloud', 56, move=(0, -12.5, 9.0), scale=0.01, ease='CONSTANT')
        k('cloud', 57, scale=0.01)
        k('cloud', 74, scale=0.01)
        k('root', 40, rot=('X', -5))
        k('root', 46)
        # 54-76 a new rainbow creeps back out of its mouth
        k('rainbow', 54, scale=0.01)
        k('rainbow', 58, rot=('X', -20), scale=0.12)
        k('rainbow', 72, rot=('X', 3), scale=1.0, ease='BACK')
        for b in bones:
            k(b, 80)
    return R


import paint as pt  # noqa: E402

RAINBOW = ['#e05a4e', '#f09a45', '#f4d65a', '#7cc06a', '#5aa7d8', '#5d6cc4', '#9a6ac0']


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    INKBLACK = pt.ramp('#34303d', 7, shift=0.07, light=0.5)
    P.fill('cloth', INKBLACK, tone=sh, base=0.05 * tk.smoothstep(20, 33, Z))
    P.fill('corner', INKBLACK, tone=sh, base=0.1)
    P.fill('cord', pt.ramp('#d9cfb6', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('hand', INKBLACK, tone=sh, base=0.14)
    P.fill('pin', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.4, base=0.15)
    P.fill('cloud', pt.ramp('#f2efe8', 6, shift=0.05), tone=sh, base=0.15)
    # the rainbow: seven bands along it (across its width), each its own ramp, with a paint line between bands
    rb = P.region('rainbow')
    t = np.clip((MOUTH[1] + 2.5 - Yc) / 24.0, 0, 1)
    k = np.clip(np.floor((X - (RB_X0 + RB_DX * t) + 3.0) / 6.0 * 7), 0, 6).astype(int)
    for i, col in enumerate(RAINBOW):
        P.fill(rb & (k == i), pt.ramp(col, 6, shift=0.05), tone=sh * 0.8, base=0.12)
    # the face in white chalk: dots wide apart, one long flat mouth the rainbow comes out of
    import face
    fc = face.Face(P, c=FACE, axis=(0, -1, 0.1), where=P.region('cloth'), seed=51, ink='#efe4c8')
    fc.eyes('happy', spread=9.0, size=0.8, dy=1.8)
    fc.mouth('pout', w=2.8, dy=-1.7, du=1.4)
    fc.blush(13.0, -0.6, rx=2.0, ry=1.1, col='#7a5d74')
    # the drippy rainbow lips: drips of every colour running down from its mouth
    for i, (du, L_) in enumerate(((-0.6, 2.0), (0.4, 3.1), (1.3, 1.6), (2.1, 2.6), (2.9, 1.9))):
        col = RAINBOW[(i * 2) % 7]
        fc.stroke([(du, -2.2), (du + 0.05, -2.2 - L_)], weight=0.45, taper=(1.0, 0.6), col=col)
        fc.stroke([(du + 0.05, -2.3 - L_), (du + 0.06, -2.6 - L_)], weight=0.95, taper=(1.0, 1.0), col=col)
    P.lines(['cloth', 'corner'], ['cord'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'pin'), ('cloud', 'body'), ('rainbow', 'body'), ('rainbow', 'cloud'), ('arm_r', 'body'), ('arm_l', 'body')] + [(c, 'body') for c in CORNERS],
       cam=((66, -96, 54), (0, -6, 18)), fold=(0, 18, 42, 64), frames=80)
