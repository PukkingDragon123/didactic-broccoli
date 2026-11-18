"""けずりブタ Sharpener Pig: a Shōwa hand-crank pencil sharpener that is a pig (series henshin, concepts.md).

The rounded housing is the pig, the pencil entry (a two-size selector boss) is the snout with its nostrils, the crank
at the back is a curly tail with a knob, the top-cover latches are the ears and the rubber feet telescope down into
trotters. The shavings drawer under the snout is its mouth. Rest pose: the pig on its trotters, ears up.
Gimmick: it sits down into a sharpener (ears flat, legs in), cranks its tail round three times, the drawer pops out
full of shavings ('burp'), then it stands back up with a hop and an ear flick.

    tools/blender.sh art/blender/toys/henshin/buta.py [--preview] [--fold] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
from fig import Fig  # noqa: E402
from mathutils import Vector  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('henshin', 'buta')

LEG = 5.2          # the housing stands this high on its trotters
W, L, H = 29.0, 34.0, 26.0   # housing width (x), length (y), height (z)
Z0 = LEG           # housing bottom
ZC = Z0 + H / 2
FRONT = -L / 2 - 1.5   # the front face (the loft's domed cap)


# ------------------------------------------------------------------ the housing (the pig's body)
def body_rings():
    """A round-bellied pig that is still a bakelite sharpener housing: soft superellipse sections, a belly that hangs
    a little, a narrower face and a round rump."""
    R = []
    for y, w, ht, hb, e in ((-L / 2, 0.80, 0.40, 0.40, 2.5), (-L / 2 + 2.2, 0.95, 0.50, 0.50, 2.7), (-L / 2 + 7.5, 1.0, 0.52, 0.55, 2.8),
                            (0.0, 1.05, 0.53, 0.60, 2.8), (L / 2 - 7.5, 1.0, 0.52, 0.56, 2.7), (L / 2 - 2.4, 0.9, 0.47, 0.47, 2.5),
                            (L / 2, 0.68, 0.35, 0.35, 2.3)):
        R.append({'c': (0, y, ZC), 'w': W * w, 'ht': H * ht, 'hb': H * hb, 'e': e})
    return R


EYE_C = {1: (6.9, FRONT + 1.3, ZC + 6.0), -1: (-6.9, FRONT + 1.3, ZC + 6.0)}


def sculpt_body(h):
    def f(V, N):
        # the top cover's seam (a crisp groove round the housing) and two screw heads per side
        seam = -0.28 * tk.smoothstep(0.35, 0.0, np.abs(V[:, 2] - (Z0 + H - 6.5))) * tk.smoothstep(0.2, 0.6, np.abs(N[:, 0]) + np.abs(N[:, 1]))
        d = seam
        for sx in (1, -1):
            for y in (-L / 2 + 6, L / 2 - 6):
                d += tk.bump(V, (sx * W / 2, y, Z0 + 5), 1.4, 0.35)
        # a soft belly, chubby cheeks either side of the snout, a raised top cover
        d += 0.6 * tk.smoothstep(-0.2, -0.9, N[:, 2]) * np.exp(-(V[:, 1] / 12) ** 2)
        for sx in (1, -1):
            d += tk.bump(V, (sx * 10.2, FRONT + 2.8, ZC - 3.0), 7.0, 1.6, sharp=1.6)  # round cheeks
        # (the face is painted on: lib/face.py, no sculpted eyes, brows or mouth)
        d += 0.35 * tk.smoothstep(Z0 + H - 6.2, Z0 + H - 5.6, V[:, 2])
        return d
    tk.push(h, f)
    # the pencil entry socket in the front: the snout part sits in it
    tk.boolean(h, tk.cyl('sock', 6.7, FRONT - 1.0, FRONT + 5.8, n=24, at=(0, ZC - 1.5), axis='Y', bevel=0.4, segs=2))
    # the drawer opening at the bottom front
    tk.boolean(h, tk.rbox('slot', (13.5, 8.6, 4.0), centre=(0, -L / 2 + 1.0, Z0 + 2.0), bevel=0.6, segs=2))


def sockets(o):
    """The four wells the trotters draw up into (the sharpener's feet)."""
    for x, y in ((8.6, -7.6), (-8.6, -7.6), (8.6, 9.5), (-8.6, 9.5)):
        tk.boolean(o, tk.loft('well', [{'c': (x * 1.01, y, Z0 + z), 'w': 9.9, 'h': 4.7, 'e': 2.3} for z in (-2.0, 10.4)], n=12, up=(0, -1, 0),
                              cap0='flat', cap1='flat'))


cage = tk.loft('body', body_rings(), n=20, cap0='round', cap1='round', capd=1.6)
plate = tk.rbox('plate', (0.8, 13.0, 6.4), centre=(W * 0.51 + 0.2, 2.0, ZC - 0.5), bevel=0.35, segs=2)
tk.set_region(plate, 'label')
body_lo, body_hi = tk.lowhigh(cage, 'body', lo=1, hi=3, tris=330, sculpt=sculpt_body, region='pink')
for o in (body_lo, body_hi):
    sockets(o)
tk.boolean(body_lo, tk.cyl('sock', 6.7, FRONT - 1.0, FRONT + 5.8, n=20, at=(0, ZC - 1.5), axis='Y', bevel=0, segs=0))
tk.boolean(body_lo, tk.rbox('slot', (13.5, 8.6, 4.0), centre=(0, -L / 2 + 1.0, Z0 + 2.0), bevel=0.6, segs=1))
tk.decimate(body_lo, 380)

# ------------------------------------------------------------------ the snout: a two-size pencil selector (nostrils)
SN = (0, FRONT, ZC - 1.5)
# (lathes along y: the profile's z is +y, so negative z sticks out of the front)
snout = tk.lathe('snout', [(0, 2.5), (6.3, 2.5), (6.6, -0.8), (6.4, -3.2), (5.5, -4.4), (0, -4.6)], n=20, axis='Y', centre=SN)


def sculpt_snout(h):
    for sx in (1, -1):  # the nostrils: the big- and small-pencil holes
        tk.boolean(h, tk.cyl('hole', 1.85 if sx > 0 else 1.55, SN[1] - 7, SN[1] - 2.2, n=16, at=(sx * 2.7, SN[2] + 0.4), axis='Y', bevel=0.2, segs=1))


snout_lo, snout_hi = tk.lowhigh(snout, 'snout', lo=0, hi=2, tris=None, sculpt=sculpt_snout, region='snout')
tk.decimate(snout_lo, 90)
bezel = tk.lathe('bezel', [(6.2, 0.6), (7.3, 0.6), (7.4, -0.3), (6.8, -0.8), (6.2, -0.6)], n=24, axis='Y', centre=SN)
bezel_lo, bezel_hi = tk.lowhigh(bezel, 'bezel', lo=0, hi=1, region='chrome')
tk.decimate(bezel_lo, 60)

# ------------------------------------------------------------------ the shavings drawer (the mouth)
drawer = tk.rbox('drawer', (13.0, 7.0, 3.4), centre=(0, -L / 2 + 1.6, Z0 + 2.0), bevel=0.7, segs=2)
tab = tk.rbox('tab', (8.0, 2.0, 2.2), centre=(0, -L / 2 - 1.6, Z0 + 1.9), bevel=0.5, segs=2)
drawer_lo, drawer_hi = tk.lowhigh(drawer, 'drawer', lo=0, hi=1, region='drawer')
tab_lo, tab_hi = tk.lowhigh(tab, 'tab', lo=0, hi=1, region='drawer')
tk.decimate(drawer_lo, 60)
tk.decimate(tab_lo, 30)

# ------------------------------------------------------------------ ears: the top-cover latches
EARS = {}
for sx, nm in ((1, 'ear_l'), (-1, 'ear_r')):
    root = (sx * 8.0, -L / 2 + 7.5, Z0 + H + float(os.environ.get('EARZ', 0.8)))
    # a soft triangular flap, cupped, tipping forward and out (pig ears flop forward)
    pts = [(-5.2, 0.0), (5.2, 0.0), (5.0, 3.6), (3.4, 7.2), (0.8, 9.6), (-0.8, 9.6), (-3.6, 7.0), (-5.0, 3.4)]
    e = tk.slab(nm, pts, 3.0, plane='XZ', at=0.0, bevel=1.1, segs=1)
    tk.subsurf(e, 1)

    def cup(V, sx=sx):
        V = V.copy()
        V[:, 1] += 0.06 * V[:, 0] ** 2 - 0.05 * V[:, 2] ** 1.5  # cupped, curling forward at the tip
        return V
    tk.deform(e, cup)
    tk.rotate(e, -sx * 24, 'Y')     # splayed out
    tk.rotate(e, 44, 'X')           # tipped forward, floppy
    tk.move(e, root)
    lo, hi = tk.lowhigh(e, nm, lo=0, hi=2, region=('pink', [('inner', lambda C, N: N[:, 1] < -0.45)]))
    tk.decimate(lo, 40)
    # the latch hinge the ear turns on: a knuckle moulded on the housing's top
    kn = tk.cyl('knuckle', 2.5, root[0] - 3.4, root[0] + 3.4, n=12, at=(root[1], root[2]), axis='X', bevel=0.4, segs=2)
    knl, knh = tk.lowhigh(kn, 'knuckle', lo=0, hi=1, region='pink')
    tk.decimate(knl, 28)
    EARS[nm] = (lo, hi, root, knl, knh)

# ------------------------------------------------------------------ trotters (telescoping rubber feet)
LEGS = {}
for nm, x, y in (('leg_fl', 8.6, -7.6), ('leg_fr', -8.6, -7.6), ('leg_bl', 8.6, 9.5), ('leg_br', -8.6, 9.5)):
    lg = tk.loft(nm, [{'c': (x, y, Z0 + 3.5), 'w': 9.2, 'h': 4.3, 'e': 2.3},
                      {'c': (x * 1.02, y, Z0 - 0.6), 'w': 8.6, 'h': 4.1, 'e': 2.3},
                      {'c': (x * 1.03, y - 0.3, 2.2), 'w': 7.8, 'h': 3.8, 'e': 2.5},
                      {'c': (x * 1.04, y - 0.6, 0.0), 'w': 8.2, 'h': 4.0, 'e': 2.9}], n=10, up=(0, -1, 0), cap0='round', cap1='flat')

    def sc_leg(h, x=x, y=y):
        def f(V, N):
            # the cloven hoof: a groove down the front of the trotter
            cleft = -0.35 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 0] - x * 1.03)) * (V[:, 2] < 2.6) * (V[:, 1] < y - 0.5)
            return cleft
        tk.push(h, f)
    lo, hi = tk.lowhigh(lg, nm, lo=1, hi=3, tris=46, sculpt=sc_leg, region=('pink', [('hoof', lambda C, N: C[:, 2] < 2.2)]))
    LEGS[nm] = (lo, hi, (x, y, Z0 + 2.0))

# ------------------------------------------------------------------ the crank: a curly tail
TP = (0, L / 2 + 0.6, ZC + 3.0)  # the crank shaft (axis y)
shaft = tk.cyl('shaft', 1.5, TP[1] - 2.0, TP[1] + 3.0, n=12, at=(TP[0], TP[2]), axis='Y', bevel=0.3, segs=1)
boss = tk.lathe('boss', [(0, 0), (3.6, 0), (3.6, 1.2), (2.6, 2.0), (0, 2.0)], n=16, axis='Y', centre=(0, L / 2 - 0.8, TP[2]))
# the crank arm curls like a pig's tail: a spiral in the x-z plane behind the housing, then the knob
curl = []
for i in range(14):
    t = i / 13
    a = math.radians(-90 + 400 * t)
    r = 5.2 * (1 - 0.55 * t)
    curl.append((r * math.cos(a) * 0.95, TP[1] + 3.2 + 2.6 * t, TP[2] + r * math.sin(a) + 5.2 - 0.6))
curl[0] = (0, TP[1] + 2.6, TP[2])
arm = tk.tube('crank', curl, [1.35] * 3 + [1.25] * 9 + [1.1, 1.1], n=8, cap0='round', cap1='round')
knob_c = Vector(curl[-1]) + Vector((0, 2.2, 0))
knob = tk.lathe('knob', [(0, -2.6), (1.9, -2.3), (2.5, -0.6), (2.2, 1.6), (1.3, 2.6), (0, 2.8)], n=12, axis='Y', centre=tuple(knob_c))
lows, highs = [], []
for o, reg, tri in ((shaft, 'chrome', 24), (boss, 'chrome', 40), (arm, 'chrome', 160), (knob, 'knob', 60)):
    lo, hi = tk.lowhigh(o, o.name, lo=1, hi=2, region=reg)
    tk.decimate(lo, tri)
    lows.append(lo)
    highs.append(hi)
crank_lo = tk.join(lows, 'crank')
crank_hi = highs

EYES = []  # (the eyes are painted: lib/face.py)

# ------------------------------------------------------------------ parts
for v in EARS.values():  # (no hinge barrel: the ear sits on the top cover and folds flat on it)
    tk.delete(v[3])
    tk.delete(v[4])
F.part('body', tk.join([body_lo] + [e[0] for e in EYES], 'body'), [body_hi, plate] + [e[1] for e in EYES])
F.part('snout', snout_lo, [snout_hi], bone='snout')
F.part('bezel', bezel_lo, [bezel_hi], kind='metal', uvw=0.6)
F.part('drawer', tk.join([drawer_lo, tab_lo], 'drawer'), [drawer_hi, tab_hi], bone='drawer', uvw=0.8)
for nm, (lo, hi, root, knl, knh) in EARS.items():
    F.part(nm, lo, [hi], bone=nm)
for nm, (lo, hi, p) in LEGS.items():
    F.part(nm, lo, [hi], bone=nm)
F.part('crank', crank_lo, crank_hi, bone='crank', kind='metal')
for p in F.parts:
    p.bone = p.bone or 'root'
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
OUT = os.path.join(F.out, F.id)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, ZC))
    R.bone('snout', SN, parent='root')
    R.bone('drawer', (0, -L / 2 + 3, Z0 + 3), parent='root')
    for nm, (lo, hi, root, knl, knh) in EARS.items():
        R.bone(nm, root, parent='root')
    for nm, (lo, hi, p) in LEGS.items():
        R.bone(nm, p, parent='root')
    R.bone('crank', TP, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    ears = {'ear_l': 1, 'ear_r': -1}
    EAR = float(os.environ.get('EAR', 70))
    with R.action('gimmick'):
        k = R.key
        allb = ['root', 'snout', 'drawer', 'crank'] + list(ears) + list(LEGS)
        for b in allb:
            k(b, 0)
        # 0-14 it sits down into a sharpener: ears fold flat, trotters slide up, the body drops onto them
        for nm, sx in ears.items():
            k(nm, 3, rot=('X', -10))
            k(nm, 9, rot=[('X', -44), ('Y', sx * 24), ('X', -EAR)])
        k('root', 4, move=(0, 0, 1.2))
        k('root', 12, move=(0, 0, -LEG + 1.0), ease='BOUNCE')
        for nm in LEGS:
            k(nm, 4)
            k(nm, 11, move=(0, 0, LEG - 1.0))
        k('snout', 6)
        k('snout', 10, move=(0, 2.2, 0))
        # 14-50 a sharpener: the crank turns three times (the tail spins), then the drawer pops out full of shavings
        k('crank', 14)
        for i in range(1, 7):
            k('crank', 14 + i * 5, rot=('Y', -180 * i), ease='LINEAR')
        k('drawer', 44)
        k('drawer', 48, move=(0, -6.5, -0.6), ease='BACK')
        k('drawer', 58, move=(0, -6.5, -0.6))
        k('drawer', 63, move=(0, 0, 0), ease='BACK')
        for nm in LEGS:
            k(nm, 60, move=(0, 0, LEG - 1.0))
        for nm, sx in ears.items():
            k(nm, 62, rot=[('X', -44), ('Y', sx * 24), ('X', -EAR)])
        k('root', 60, move=(0, 0, -LEG + 1.0))
        k('snout', 60, move=(0, 2.2, 0))
        # 60-80 it stands back up with a hop: trotters out, snout out, ears flick
        k('root', 66, move=(0, 0, 3.0))
        k('root', 72, move=(0, 0, 0), ease='BOUNCE')
        for nm in LEGS:
            k(nm, 66, move=(0, 0, 0), ease='BACK')
        k('snout', 65, move=(0, 0, 0), ease='BACK')
        for nm, sx in ears.items():
            k(nm, 68, rot=('X', 12), ease='BACK')
            k(nm, 74, rot=('X', -8))
            k(nm, 78, rot=('X', 0))
        k('crank', 80)
        for b in allb:
            k(b, 84)
    return R


if '--clip' in ARGS:
    from rig import check_clip
    R = make_rig()
    res = check_clip(R, F.parts, range(1, 85), skip=[('bezel', 'body'), ('snout', 'bezel'), ('crank', 'body')], tol=0.35)
    for f, L_ in sorted(res.items()):
        print('CLIP', f, L_)
    print('CLIP frames', len(res))
    sys.exit(0)

if '--preview' in ARGS or '--fold' in ARGS:
    lows = [p.low for p in F.parts]
    highs = [h for p in F.parts for h in p.highs]
    if '--fold' in ARGS:
        import bpy
        R = make_rig()
        R.arm.animation_data.action = bpy.data.actions['gimmick']
        for i, fr in enumerate((0, 30, 52, 68)):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=((62, -70, 50), (0, 0, 14)), lens=50)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=((62, -70, 50), (0, 0, 14)), lens=50)
    tk.preview(OUT + '_p2.png', highs, cam=((-62, 66, 44), (0, 2, 14)), lens=50)
    tk.preview(OUT + '_p3.png', lows, cam=((62, -70, 50), (0, 0, 14)), lens=50)
    tk.preview(OUT + '_p4.png', lows, cam=((70, -10, 40), (6, -9, 30)), lens=90)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402
import face  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=6.0, reuse='--repaint' in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    top = np.clip(on[:, :, 2], 0, 1)
    PINK = pt.ramp('#eaa0a4', 7, shift=0.06)
    # factory airbrush: a warmer, deeper pink low on the flanks and round the rump; the top cover a touch paler
    air = 0.18 * tk.smoothstep(Z0 + H - 7, Z0 + H, Z) - 0.3 * tk.smoothstep(ZC - 2, Z0, Z) - 0.15 * tk.smoothstep(L / 2 - 8, L / 2 + 2, Yc)
    P.fill('pink', PINK, tone=sh, base=air)
    BLUSH = pt.ramp('#e2828c', 6, shift=0.06)
    # cheeks: an airbrushed blush either side of the snout
    cheek = np.zeros_like(X, bool)
    for sx in (1, -1):
        cheek |= ((X - sx * 10.6) ** 2 / 16 + (Z - (ZC - 3.2)) ** 2 / 9 < 1) & (Yc < FRONT + 6)
    P.fill(P.region('pink') & cheek, BLUSH, tone=sh, base=0.05)
    P.fill('blush', BLUSH, tone=sh, base=0.05)
    P.fill('inner', pt.ramp('#d4707c', 6, shift=0.06), tone=sh, base=-0.05)
    P.fill('snout', pt.ramp('#e58f98', 7, shift=0.06), tone=sh, base=0.08)
    P.fill('hoof', pt.ramp('#4e3e39', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('chrome', pt.ramp('#b3bbc4', 7, dark=0.75, light=0.75, shift=0.05), tone=sh * 1.5, base=0.1)
    P.fill('knob', pt.ramp('#efe2c0', 6, shift=0.06), tone=sh, base=0.1)
    # the shavings drawer: smoked amber plastic, and the curls of pencil shavings showing through its front
    P.fill('drawer', pt.ramp('#7d6a5a', 6, shift=0.05), tone=sh, base=0.0)
    shav = P.region('drawer') & (np.sin(X * 2.6 + np.sin(Z * 3.1) * 2) * np.sin(Z * 4.0 + X) > 0.25) & (Yc > FRONT + 0.6) & (Z < Z0 + 5.6)
    P.tint(shav, pt.ramp('#d9a86a', 5, shift=0.05), sh + 0.2)
    P.flat(shav & (np.sin(X * 5.0 + Z * 3.0) > 0.85), '#5a3a2a')  # the painted pencil-lead ends
    # the face, hand-drawn (lib/face.py): two ink dots far apart above the snout, a little smirk flicking up under it
    fc = face.Face(P, c=(0, FRONT, ZC), axis=(0, -1, 0), where=P.region('pink') | P.region('blush'), seed=7)
    fc.eyes(spread=12.6, size=0.62, dy=6.4, uneven=0.25)
    fc.mouth('upturn', w=4.6, dy=-9.3, du=0.8, weight=0.5, side=1)
    # the side label: a red enamel plate with a cream rule and the maker's pencil mark
    lab = P.region('label')
    P.fill('label', pt.ramp('#c23a2c', 6, shift=0.05), tone=sh * 0.6, base=0.05)
    U, V = Yc - 2.0, Z - (ZC - 0.5)
    P.flat(lab & ((np.abs(np.abs(U) - 5.7) < 0.32) & (np.abs(V) < 2.6) | (np.abs(np.abs(V) - 2.5) < 0.32) & (np.abs(U) < 5.7)), '#f1e3bf')
    body = lab & (U > -4.0) & (U < 1.6) & (np.abs(V) < 0.95)
    P.flat(body, '#e8b23a')  # a yellow hexagonal pencil, its ferrule and its sharpened tip
    P.flat(body & (np.abs(V) < 0.3), '#f2c85a')
    P.flat(lab & (U >= -4.0) & (U < -3.0) & (np.abs(V) < 0.95), '#c9ced4')
    tip = lab & (U >= 1.6) & (U < 3.6) & (np.abs(V) < 0.95 * (3.6 - U) / 2.0)
    P.flat(tip, '#e9cfa0')
    P.flat(tip & (U > 3.0), '#2a2224')
    P.lines(['pink', 'blush'], ['snout', 'hoof', 'inner'], step=2)
    P.lines(['snout'], ['pink', 'blush'], step=1)
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
