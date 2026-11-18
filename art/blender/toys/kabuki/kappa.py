"""あらごとカッパ Aragoto Kappa: the hero of the piece, a kappa in the swaggering aragoto style (series kabuki,
concepts_C.md): red kumadori lines on his green face, the water dish on his head ringed by its fringe, a white
costume in bold black lattice with a red obi, the huge stiff sleeves, a sword at his hip and his shell on his back.

He holds the stance: feet planted wide, one webbed hand thrust out, the other fist on his hip.
Gimmick: the mie: he winds up (a sway and a swing of the arm), rolls his head round, freezes glaring (cross-eyed),
stamps, and the water in his dish sloshes.

    tools/blender.sh art/blender/toys/kabuki/kappa.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '..', 'kaden', '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('kabuki', 'kappa')

HIP = (0, 0.4, 11.0)
HC = (0, -1.4, 34.2)          # the head's centre (a big mascot head)
NECK = (0, 0.0, 26.4)
SHR, SHL = (-9.0, 0.2, 24.4), (9.0, 0.2, 24.4)

# ------------------------------------------------------------------ legs in the wide stance, webbed feet
LEGS = {}
for sx, nm in ((-1, 'leg_r'), (1, 'leg_l')):
    hip = np.array((sx * 4.4, 0.6, 10.6))
    knee = np.array((sx * 7.6, -1.6 if sx < 0 else 0.6, 5.6))
    ank = np.array((sx * 8.8, -2.2 if sx < 0 else 0.8, 1.8))
    lg = tk.tube(nm, [tuple(hip), tuple(knee), tuple(ank)], [3.8, 3.2, 2.8], n=8)
    ft = tk.slab('foot', [(-2.4, 2.2), (2.4, 2.2), (3.4, -3.0), (1.6, -2.2), (0.0, -4.0), (-1.6, -2.2), (-3.4, -3.0)], 1.4, plane='XY', at=0.7, bevel=0.5, segs=1)
    tk.rotate(ft, sx * 12, 'Z')
    tk.move(ft, (ank[0], ank[1] - 0.6, 0))
    LEGS[nm] = ([cx.low(lg, nm, 46, lo=1, hi=2, region=('skin', [('legging', lambda C, N: (C[:, 2] < 6.8) & (C[:, 2] > 2.6))])),
                 cx.low(ft, 'foot', 30, lo=1, hi=1, region='skin')], tuple(hip))

# ------------------------------------------------------------------ the costume: a flared robe to the knee, the obi; the shell on the back
robe = tk.loft('robe', [{'c': (0, 0.6, 6.6), 'w': 26.0, 'ht': 8.6, 'hb': 9.4, 'e': 2.7},
                        {'c': (0, 0.4, 10.6), 'w': 23.4, 'ht': 8.2, 'hb': 8.6, 'e': 2.6},
                        {'c': (0, 0.2, 16.6), 'w': 20.0, 'ht': 7.6, 'hb': 7.8, 'e': 2.5},
                        {'c': (0, 0.0, 22.6), 'w': 21.6, 'ht': 7.4, 'hb': 7.6, 'e': 2.6},
                        {'c': (0, 0.0, 26.4), 'w': 15.0, 'ht': 5.4, 'hb': 5.4, 'e': 2.3}], n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.4)


def sc_robe(h):
    def f(V, N):
        # the collar crossing left over right, the obi's raised band, folds down the skirt
        col = 0.35 * tk.smoothstep(0.55, 0.0, np.abs(V[:, 0] + 0.55 * (V[:, 2] - 25.0))) * (N[:, 1] < -0.4) * (V[:, 2] > 17.4)
        obi = 0.45 * tk.smoothstep(0.6, 0.2, np.abs(V[:, 2] - 17.4) - 1.6)
        folds = -0.3 * (np.abs(np.sin(np.arctan2(V[:, 1], V[:, 0]) * 7)) ** 6) * (V[:, 2] < 15.0)
        return col + obi + folds
    tk.push(h, f)


robe_lo, robe_hi = cx.low(robe, 'robe', 240, lo=1, hi=3, sculpt=sc_robe, region=('robe', [('obi', lambda C, N: np.abs(C[:, 2] - 17.4) < 2.1)]))
shell = tk.lathe('shell', [(0, 0), (8.6, 0), (9.4, 0.9), (8.6, 2.8), (5.6, 4.6), (0, 5.2)], n=16, axis='Y', centre=(0, 6.6, 17.6))
tk.scale(shell, (1.0, 1.0, 1.25), (0, 6.6, 17.6))


def sc_shell(h):
    def f(V, N):  # the shell's plates: a raised hex-ish grid of grooves
        u, v = V[:, 0] / 3.2, (V[:, 2] - 17.6) / 3.2
        g = (np.abs(np.mod(u + 0.5 * np.floor(v), 1.0) - 0.5) > 0.42) | (np.abs(np.mod(v, 1.0) - 0.5) > 0.42)
        return -0.3 * g * (N[:, 1] > 0.2)
    tk.push(h, f)


shell_lo, shell_hi = cx.low(shell, 'shell', 70, lo=1, hi=2, sculpt=sc_shell, region=('shell', [('rim', lambda C, N: C[:, 1] < 7.6)]))
sword = tk.tube('saya', [(10.4, -3.0, 17.6), (11.6, 2.0, 15.6), (12.6, 10.0, 12.2)], [1.2, 1.1, 1.0], n=6, cap1='round')
hilt = tk.tube('tsuka', [(9.8, -5.0, 18.4), (9.0, -9.8, 20.6)], [1.1, 1.0], n=6)
guard = tk.cyl('tsuba', 2.2, -0.4, 0.4, n=10, at=(-4.0, 18.2), axis='Y', bevel=0.15, segs=1)
tk.move(guard, (9.9, -0.0, 0))
SWORD = [cx.low(sword, 'saya', 30, lo=0, hi=1, region='lacquer'), cx.low(hilt, 'tsuka', 24, lo=0, hi=1, region='hilt'), cx.low(guard, 'tsuba', 20, lo=0, hi=1, region='gold')]

# ------------------------------------------------------------------ arms with the big stiff sleeves: right thrust out, left fist on the hip
ARMS = {}
hand_r = np.array((-18.0, -9.0, 26.4))
el_r = np.array((-13.6, -4.0, 24.8))
arm_r = tk.tube('arm_r', [SHR, tuple(el_r), tuple(hand_r)], [3.2, 2.8, 2.5], n=8)
palm = tk.slab('palm', [(-2.4, -1.4), (2.4, -1.4), (2.8, 1.6), (1.6, 3.6), (0.6, 2.2), (0.0, 3.8), (-0.6, 2.2), (-1.6, 3.6), (-2.8, 1.6)], 1.2, plane='XZ', at=0.0, bevel=0.45, segs=1)
tk.rotate(palm, 40, 'Z')
tk.move(palm, tuple(hand_r + np.array((-0.6, -1.2, 0.2))))
slv_r = tk.loft('sleeve_r', [{'c': (-10.6, -1.6, 22.4), 'w': 3.2, 'h': 4.6, 'e': 3.0}, {'c': (-13.4, -4.6, 19.8), 'w': 3.4, 'h': 7.6, 'e': 3.4},
                             {'c': (-15.6, -7.2, 18.6), 'w': 3.0, 'h': 7.4, 'e': 3.4}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
ARMS['arm_r'] = ([cx.low(arm_r, 'arm_r', 40, lo=1, hi=1, region='robe'), cx.low(palm, 'palm', 30, lo=1, hi=1, region='skin'),
                  cx.low(slv_r, 'sleeve_r', 70, lo=1, hi=2, region='sleeve')], SHR)
el_l = np.array((15.0, 1.6, 19.6))
fist_l = np.array((11.6, -4.0, 16.8))
arm_l = tk.tube('arm_l', [SHL, tuple(el_l), tuple(fist_l)], [3.2, 2.9, 2.6], n=8)
fist = tk.lathe('fist', [(0, -1.8), (1.8, -1.4), (2.2, 0.0), (1.8, 1.4), (0, 1.8)], n=10, centre=tuple(fist_l + np.array((-0.4, -0.8, 0))))
slv_l = tk.loft('sleeve_l', [{'c': (11.6, 0.6, 22.8), 'w': 3.2, 'h': 5.2, 'e': 3.0}, {'c': (15.0, 2.0, 17.6), 'w': 3.4, 'h': 7.4, 'e': 3.4},
                             {'c': (15.8, 2.6, 12.8), 'w': 3.0, 'h': 6.8, 'e': 3.4}], n=12, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
ARMS['arm_l'] = ([cx.low(arm_l, 'arm_l', 40, lo=1, hi=1, region='robe'), cx.low(fist, 'fist', 24, lo=0, hi=1, region='skin'),
                  cx.low(slv_l, 'sleeve_l', 70, lo=1, hi=2, region='sleeve')], SHL)

# ------------------------------------------------------------------ the head: round, the beak, the dish ringed by its fringe; the water in the dish
head = tk.loft('head', [{'c': (0, HC[1] + 5.6, HC[2] + 0.4), 'w': 11.0, 'h': 5.4, 'e': 2.2}, {'c': (0, HC[1] + 2.0, HC[2] + 0.4), 'w': 18.0, 'h': 8.4, 'e': 2.3},
                        {'c': (0, HC[1] - 2.4, HC[2]), 'w': 17.6, 'h': 8.2, 'e': 2.3}, {'c': (0, HC[1] - 5.8, HC[2] - 0.4), 'w': 11.6, 'h': 5.8, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
head_lo, head_hi = cx.low(head, 'head', 200, lo=1, hi=3, region='skin')
beak = tk.loft('beak', [{'c': (0, HC[1] - 6.8, HC[2] - 2.6), 'w': 6.4, 'ht': 1.5, 'hb': 1.7, 'e': 2.4}, {'c': (0, HC[1] - 9.0, HC[2] - 2.8), 'w': 5.2, 'ht': 1.1, 'hb': 1.3, 'e': 2.4},
                        {'c': (0, HC[1] - 10.0, HC[2] - 3.2), 'w': 3.0, 'ht': 0.7, 'hb': 0.9, 'e': 2.2}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
beak_lo, beak_hi = cx.low(beak, 'beak', 36, lo=1, hi=2, region='beak')
DISH_Z = HC[2] + 8.0
fringe = tk.lathe('fringe', [(4.8, -1.6), (7.8, -1.8), (8.8, -0.2), (7.6, 1.2), (5.4, 1.4), (4.4, 0.4)], n=24, centre=(0, HC[1] + 0.4, DISH_Z - 0.6))


def sc_fringe(h):
    def f(V, N):  # the shaggy fringe round the dish: strands
        a = np.arctan2(V[:, 1] - HC[1] - 0.4, V[:, 0])
        return 0.35 * np.abs(np.sin(a * 11)) ** 2 - 0.15
    tk.push(h, f)


dish = tk.lathe('dish', [(0, -0.6), (5.0, -0.6), (5.4, 0.6), (4.8, 0.9), (4.1, 0.3), (0, 0.2)], n=20, centre=(0, HC[1] + 0.4, DISH_Z))
HEADP = [(head_lo, head_hi), (beak_lo, beak_hi), cx.low(fringe, 'fringe', 90, lo=0, hi=2, sculpt=sc_fringe, region='hair'),
         cx.low(dish, 'dish', 50, lo=0, hi=1, region='dish')]
water = tk.lathe('water', [(0, -0.2), (4.0, -0.2), (4.0, 0.3), (0, 0.45)], n=16, centre=(0, HC[1] + 0.4, DISH_Z + 0.35))
water_lo, water_hi = cx.low(water, 'water', 30, lo=0, hi=1, region='water')

# ------------------------------------------------------------------ parts
F.part('robe', tk.join([robe_lo, shell_lo] + [s_[0] for s_ in SWORD], 'robe'), [robe_hi, shell_hi] + [s_[1] for s_ in SWORD], bone='body')
for nm, (pp, hip) in LEGS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='head')
F.part('water', water_lo, [water_hi], bone='water', kind='gloss')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', HIP, parent='root')
    for nm, (pp, hip) in LEGS.items():
        R.bone(nm, hip, parent='root')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='body')
    R.bone('head', NECK, parent='body')
    R.bone('water', (0, HC[1] + 0.4, DISH_Z), parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'leg_r', 'leg_l', 'arm_r', 'arm_l', 'head', 'water']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the wind-up: a sway back and the thrust arm draws in
        k('body', 4, rot=('Y', 6))
        k('body', 10, rot=('Y', -5))
        k('body', 14)
        k('arm_r', 4, rot=('Z', 20))
        k('arm_r', 12, rot=('Z', -12), ease='BACK')
        k('arm_r', 16)
        # the head roll: round in a circle
        k('head', 14)
        for i, f in enumerate(range(16, 34, 3)):
            a = 2 * math.pi * (i + 1) / 6
            k('head', f, rot=[('X', 14 * math.sin(a)), ('Y', 14 * math.cos(a) - 14 * (1 if i == 5 else 0) * 0)])
        k('head', 35, rot=('Y', -10))
        # the freeze, glaring: then the stamp
        k('head', 46, rot=('Y', -10))
        k('leg_r', 34)
        k('leg_r', 40, rot=('X', 22), ease='BACK')
        k('leg_r', 44, ease='LINEAR')
        k('root', 44)
        k('root', 45, move=(0, 0, -0.4))
        k('root', 47)
        # the water in the dish sloshes
        for i, f in enumerate(range(16, 54, 4)):
            k('water', f, rot=[('X', 8 if i % 2 else -8), ('Y', -6 if i % 2 else 6)])
        k('water', 58)
        k('head', 56)
        k('body', 46)
        k('body', 50, rot=('X', 4))
        k('body', 56)
        for b in allb:
            k(b, 64)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    tone = np.where(P.part == PI['robe'], sh, free)
    SKIN = pt.ramp('#7cae5a', 7, shift=0.07)
    P.fill('skin', SKIN, tone=tone, base=0.08)
    P.fill('legging', pt.ramp('#efe8dc', 6, shift=0.05), tone=free, base=0.05)
    P.flat(P.region('legging') & (np.mod(Z, 1.8) < 0.35), '#2a2628')
    # the costume: white with the bold black lattice of the aragoto hero, the red obi
    P.fill('robe', pt.ramp('#f0ebe0', 7, shift=0.05), tone=tone, base=0.05)
    lat = (np.abs(np.mod(X + 0.0, 5.0) - 2.5) < 0.75) | (np.abs(np.mod(Z, 5.0) - 2.5) < 0.75)
    P.tint(P.region('robe') & lat, pt.ramp('#26262c', 6, shift=0.05), tone + 0.2)
    P.fill('obi', pt.ramp('#c8303a', 7, shift=0.06), tone=sh, base=0.1)
    P.flat(P.region('obi') & (np.abs(Z - 17.4) < 0.3), '#e2b84c')
    P.fill('sleeve', pt.ramp('#f0ebe0', 7, shift=0.05), tone=free, base=0.05)
    P.tint(P.region('sleeve') & ((np.abs(np.mod(Z, 5.0) - 2.5) < 0.9)), pt.ramp('#26262c', 6, shift=0.05), free + 0.2)
    P.fill('shell', pt.ramp('#6a7a3a', 7, shift=0.07), tone=sh, base=0.05)
    P.fill('rim', pt.ramp('#c8b46a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('lacquer', pt.ramp('#2a2228', 6, shift=0.05), tone=free * 1.2, base=0.3)
    P.fill('hilt', pt.ramp('#efe6d2', 6, shift=0.05), tone=free, base=0.1)
    P.flat(P.region('hilt') & (np.mod(Yc + Z, 1.4) < 0.5), '#2a2228')
    P.fill('gold', pt.ramp('#d8b04a', 6, dark=0.6, light=0.6, shift=0.06), tone=free * 1.3, base=0.15)
    P.fill('beak', pt.ramp('#e8c24a', 7, shift=0.06), tone=free, base=0.1)
    P.fill('hair', pt.ramp('#2a3a2a', 6, shift=0.05), tone=free, base=0.15)
    P.fill('dish', pt.ramp('#e8e4d6', 6, shift=0.05), tone=free, base=0.1)
    P.fill('water', pt.ramp('#6ab4d4', 6, shift=0.05), tone=free * 0.5, base=0.15)
    # kumadori: the hero's red lines sweeping up from the eyes and down the cheeks (painted in clean strokes)
    hd = P.region('skin') & (P.part == PI['head'])
    fk = face.Face(P, c=(0, HC[1] - 8.0, HC[2] + 0.6), axis=(0, -1, 0.05), where=hd, seed=111, ink='#c8303a')
    for sx in (-1, 1):
        fk.stroke([(sx * 2.0, 1.6), (sx * 4.2, 3.8), (sx * 6.2, 6.4)], weight=0.6)
        fk.stroke([(sx * 3.0, 0.4), (sx * 5.6, 1.4), (sx * 7.6, 3.6)], weight=0.5)
        fk.stroke([(sx * 5.0, -2.0), (sx * 7.2, -3.6)], weight=0.5)
    # the face, drawn on: the mie's glare (both dots looking in), angry brows over them
    fc = face.Face(P, c=(0, HC[1] - 8.0, HC[2] + 0.6), axis=(0, -1, 0.05), where=hd, seed=112)
    fc.eyes('dot', spread=5.6, size=0.72, dy=0.4)
    fc.brows('angry', spread=6.4, dy=2.4, w=2.6)
    P.lines(['robe', 'sleeve'], ['obi', 'skin'], step=1)
    P.lines(['skin'], ['beak', 'hair', 'dish'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 65), skip=[('leg_r', 'robe'), ('leg_l', 'robe'), ('arm_r', 'robe'), ('arm_l', 'robe'), ('head', 'robe'), ('water', 'head')]),
       cams=[((60, -76, 52), (0, -2, 22)), ((-58, 66, 46), (0, 0, 22))], fold=(0, 12, 30, 40))
