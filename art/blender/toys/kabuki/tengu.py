"""かたきやくテング Villain Tengu: the villain of the piece, a long-nosed tengu (series kabuki, concepts_C.md): a red
face in indigo villain's kumadori, the little black tokin cap of the mountain ascetics, a shaggy white mane, the
yamabushi robe with its fluffy bonbon tassels down the chest, his black wings folded on his back, a feather fan
raised over his head and one-tooth geta.

Gimmick: he fans three great sweeps, lifts his nose to the gallery, unfolds his wings, and freezes in his mie.

    tools/blender.sh art/blender/toys/kabuki/tengu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kabuki', 'tengu')

GZ = 4.4                       # the soles (on top of the one-tooth geta)
HC = (0, -1.0, 34.0)           # the head's centre
NECK = (0, 0.0, 27.0)
SHR, SHL = (-9.0, 0.4, 25.0), (9.0, 0.4, 25.0)
FAN = np.array((-11.8, -4.6, 37.6))

# ------------------------------------------------------------------ one-tooth geta and tabi feet
FEET = []
for sx, fy in ((-1, -1.2), (1, 0.6)):
    x = sx * 7.4
    plat = tk.rbox('geta', (6.2, 10.4, 1.2), centre=(x, fy, GZ - 0.6), bevel=0.35, segs=1)
    tooth = tk.rbox('tooth', (3.0, 9.4, GZ - 1.2), centre=(x, fy, (GZ - 1.2) / 2), bevel=0.3, segs=1)
    foot = tk.loft('tabi', [{'c': (x, fy + 2.6, GZ + 0.9), 'w': 4.4, 'h': 1.4, 'e': 2.4}, {'c': (x, fy, GZ + 1.0), 'w': 4.6, 'h': 1.6, 'e': 2.4},
                            {'c': (x, fy - 3.2, GZ + 0.8), 'w': 4.0, 'h': 1.3, 'e': 2.4}], n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
    FEET += [cx.low(plat, 'geta', 20, lo=0, hi=1, region='wood'), cx.low(tooth, 'tooth', 16, lo=0, hi=1, region='wood'), cx.low(foot, 'tabi', 30, lo=1, hi=1, region='tabi')]

# ------------------------------------------------------------------ the robe: flared hakama-like skirt to the ankles, the bonbon tassels
robe = tk.loft('robe', [{'c': (0, 0.0, GZ + 1.8), 'w': 24.0, 'ht': 8.6, 'hb': 9.4, 'e': 2.8},
                        {'c': (0, 0.0, GZ + 7.0), 'w': 21.6, 'ht': 7.8, 'hb': 8.4, 'e': 2.6},
                        {'c': (0, 0.0, 15.6), 'w': 18.6, 'ht': 7.2, 'hb': 7.6, 'e': 2.5},
                        {'c': (0, 0.0, 22.0), 'w': 21.0, 'ht': 7.2, 'hb': 7.6, 'e': 2.6},
                        {'c': (0, 0.2, 26.8), 'w': 14.4, 'ht': 5.2, 'hb': 5.2, 'e': 2.3}], n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.4)


def sc_robe(h):
    def f(V, N):
        col = 0.35 * tk.smoothstep(0.55, 0.0, np.abs(V[:, 0] - 0.55 * (V[:, 2] - 25.8))) * (N[:, 1] < -0.4) * (V[:, 2] > 17.4)
        obi = 0.4 * tk.smoothstep(0.6, 0.2, np.abs(V[:, 2] - 16.6) - 1.4)
        pleats = -0.35 * (np.abs(np.sin(V[:, 0] * 1.4)) ** 6) * (V[:, 2] < 15.0) * (N[:, 1] < 0.2)
        return col + obi + pleats
    tk.push(h, f)


robe_lo, robe_hi = cx.low(robe, 'robe', 240, lo=1, hi=3, sculpt=sc_robe, region=('robe', [('obi', lambda C, N: np.abs(C[:, 2] - 16.6) < 1.9),
                                                                                          ('hakama', lambda C, N: C[:, 2] < 14.6)]))
POMS = []
for sx, z in ((-1, 23.4), (1, 23.4), (-1, 19.8), (1, 19.8)):
    pm = tk.lathe('pom', [(0, -1.6), (1.4, -1.3), (1.8, 0.0), (1.4, 1.3), (0, 1.6)], n=10, centre=(sx * 3.4, -7.8 + 0.5 * (23.4 - z), z))

    def sc_pom(h):
        def f(V, N):  # fluffy
            return 0.22 * np.sin(V[:, 0] * 5.1) * np.sin(V[:, 1] * 4.7 + V[:, 2] * 3.3)
        tk.push(h, f)
    POMS.append(cx.low(pm, 'pom', 24, lo=0, hi=2, sculpt=sc_pom, region='pom'))

# ------------------------------------------------------------------ folded black wings on his back
WINGS = {}
for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
    pts = [(0.0, 0.0), (3.4, 1.0), (6.4, -1.8), (8.0, -6.4), (7.6, -11.0), (5.6, -14.2), (4.2, -11.6), (2.4, -13.4), (1.2, -10.0), (0.0, -6.0)]
    w = tk.slab(nm, pts, 1.4, plane='XZ', at=0.0, bevel=0.5, segs=1)
    tk.subsurf(w, 1)
    if sx < 0:
        tk.scale(w, (-1, 1, 1))
        tk.fix_normals(w)
    tk.rotate(w, 14, 'X')            # hanging down the back, tipped out a little
    root = (sx * 4.6, 7.6, 23.2)
    tk.move(w, root)
    tk.deform(w, lambda V: V + np.stack([0 * V[:, 0], 0.04 * (V[:, 0]) ** 2, 0 * V[:, 0]], 1))

    def sc_wing(h, sx=sx):
        def f(V, N):  # feather rows
            return -0.22 * (np.abs(np.mod(V[:, 2] * 0.8 + np.abs(V[:, 0]) * 0.6, 2.2) - 1.1) < 0.2)
        tk.push(h, f)
    WINGS[nm] = (cx.low(w, nm, 60, lo=1, hi=2, sculpt=sc_wing, region='wing'), root)

# ------------------------------------------------------------------ arms: the fan raised over his head, the other pointing; the big sleeves
ARMS = {}
el_r = np.array((-14.0, -1.6, 31.0))
arm_r = tk.tube('arm_r', [SHR, tuple(el_r), tuple(FAN + (0.4, 0.6, -2.8))], [3.2, 2.8, 2.4], n=8)
slv_r = tk.loft('sleeve_r', [{'c': (-11.0, -0.6, 24.6), 'w': 3.2, 'h': 4.6, 'e': 3.0}, {'c': (-14.4, -1.6, 27.4), 'w': 3.4, 'h': 7.0, 'e': 3.4},
                             {'c': (-15.6, -2.0, 24.0), 'w': 3.0, 'h': 6.4, 'e': 3.4}], n=12, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
handle = tk.tube('handle', [tuple(FAN + (0, 0, -3.6)), tuple(FAN + (0, 0, 0.4))], [0.7, 0.6], n=6)
fan = tk.slab('fan', [(0.0, -0.6), (3.0, 0.8), (5.2, 3.0), (6.6, 4.8), (5.8, 6.0), (6.8, 8.0), (5.4, 9.2), (5.6, 11.0), (3.4, 11.6), (2.2, 13.4), (0.0, 12.6), (-2.2, 13.4),
                      (-3.4, 11.6), (-5.6, 11.0), (-5.4, 9.2), (-6.8, 8.0), (-5.8, 6.0), (-6.6, 4.8), (-5.2, 3.0), (-3.0, 0.8)], 1.0, plane='XZ', at=0.0, bevel=0.4, segs=1)
tk.subsurf(fan, 1)
tk.rotate(fan, -16, 'Y')
tk.move(fan, tuple(FAN))


def sc_fan(h):
    def f(V, N):  # the feathers fanning from the grip
        a = np.arctan2(V[:, 2] - FAN[2], V[:, 0] - FAN[0])
        return -0.25 * (np.abs(np.sin(a * 9)) > 0.85)
    tk.push(h, f)


ARMS['arm_r'] = ([cx.low(arm_r, 'arm_r', 40, lo=1, hi=1, region='robe'), cx.low(slv_r, 'sleeve_r', 70, lo=1, hi=2, region='sleeve'),
                  cx.low(handle, 'handle', 16, lo=0, hi=1, region='lacquer'), cx.low(fan, 'fan', 50, lo=1, hi=2, sculpt=sc_fan, region='feather')], SHR)
hand_l = np.array((17.6, -8.4, 27.6))
arm_l = tk.tube('arm_l', [SHL, (13.6, -3.6, 25.8), tuple(hand_l)], [3.2, 2.8, 2.4], n=8)
hnd = tk.lathe('hand', [(0, -1.6), (1.7, -1.2), (2.0, 0.0), (1.6, 1.2), (0, 1.6)], n=10, centre=tuple(hand_l + (0.6, -0.8, 0)))
finger = tk.tube('finger', [tuple(hand_l + (1.2, -2.0, 0.3)), tuple(hand_l + (2.6, -4.2, 0.6))], [0.75, 0.6], n=6)
slv_l = tk.loft('sleeve_l', [{'c': (11.2, -0.8, 24.2), 'w': 3.2, 'h': 4.6, 'e': 3.0}, {'c': (14.0, -4.0, 21.6), 'w': 3.4, 'h': 7.2, 'e': 3.4},
                             {'c': (15.6, -6.6, 20.6), 'w': 3.0, 'h': 6.6, 'e': 3.4}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
ARMS['arm_l'] = ([cx.low(arm_l, 'arm_l', 40, lo=1, hi=1, region='robe'), cx.low(hnd, 'hand', 24, lo=0, hi=1, region='skin'),
                  cx.low(finger, 'finger', 16, lo=0, hi=1, region='skin'), cx.low(slv_l, 'sleeve_l', 70, lo=1, hi=2, region='sleeve')], SHL)

# ------------------------------------------------------------------ the head: red face, the long nose, the tokin cap, the white mane
head = tk.loft('head', [{'c': (0, HC[1] + 5.4, HC[2] + 0.4), 'w': 10.6, 'h': 5.4, 'e': 2.2}, {'c': (0, HC[1] + 2.0, HC[2] + 0.4), 'w': 17.0, 'h': 8.0, 'e': 2.3},
                        {'c': (0, HC[1] - 2.2, HC[2]), 'w': 16.6, 'h': 7.8, 'e': 2.3}, {'c': (0, HC[1] - 5.6, HC[2] - 0.6), 'w': 11.0, 'h': 5.6, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
nose = tk.tube('nose', [(0, HC[1] - 5.6, HC[2] - 0.4), (0, HC[1] - 10.0, HC[2] - 0.2), (0, HC[1] - 13.6, HC[2] + 0.6), (0, HC[1] - 15.4, HC[2] + 1.6)],
               [2.6, 1.8, 1.3, 0.8], n=10, cap1='round')
tokin = tk.lathe('tokin', [(0, 0), (3.0, 0), (3.2, 0.6), (2.6, 2.4), (1.4, 3.0), (0, 3.1)], n=6, centre=(0, HC[1] - 3.6, HC[2] + 6.4))
tk.rotate(tokin, -24, 'X', (0, HC[1] - 3.6, HC[2] + 6.4))
mane = tk.loft('mane', [{'c': (0, HC[1] + 3.6, HC[2] + 6.6), 'w': 11.0, 'h': 3.0, 'e': 2.2}, {'c': (0, HC[1] + 7.0, HC[2] + 3.6), 'w': 15.0, 'h': 3.6, 'e': 2.2},
                        {'c': (0, HC[1] + 8.4, HC[2] - 2.0), 'w': 15.6, 'h': 3.4, 'e': 2.4}, {'c': (0, HC[1] + 8.4, HC[2] - 5.2), 'w': 12.0, 'h': 2.6, 'e': 2.4}],
                n=14, up=(0, -1, 0), cap0='round', cap1='round', capd=1.4)


def sc_mane(h):
    def f(V, N):  # the shaggy white mane in long locks
        return 0.4 * np.abs(np.sin(V[:, 0] * 1.5 + V[:, 2] * 0.2)) ** 2 - 0.2
    tk.push(h, f)


HEADP = [cx.low(head, 'head', 190, lo=1, hi=3, region='face'), cx.low(nose, 'nose', 50, lo=1, hi=2, region='face'),
         cx.low(tokin, 'tokin', 30, lo=0, hi=1, region='lacquer'), cx.low(mane, 'mane', 110, lo=1, hi=2, sculpt=sc_mane, region='mane')]

# ------------------------------------------------------------------ parts
F.part('robe', tk.join([robe_lo] + [f_[0] for f_ in FEET] + [p_[0] for p_ in POMS], 'robe'), [robe_hi] + [f_[1] for f_ in FEET] + [p_[1] for p_ in POMS], bone='body')
for nm, ((lo, hi), root) in WINGS.items():
    F.part(nm, lo, [hi], bone=nm)
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='head')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ + 2.0), parent='root')
    for nm, ((lo, hi), root) in WINGS.items():
        R.bone(nm, root, parent='body')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='body')
    R.bone('head', NECK, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'wing_l', 'wing_r', 'arm_r', 'arm_l', 'head']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # three great sweeps of the feather fan
        for i, f in enumerate((5, 11, 17, 23, 29, 35)):
            k('arm_r', f, rot=('Y', -24 if i % 2 == 0 else 10))
        k('arm_r', 40)
        k('body', 4)
        for i, f in enumerate((8, 14, 20, 26, 32)):
            k('body', f, rot=('Z', 4 if i % 2 == 0 else -4))
        k('body', 36)
        # the nose lifts to the gallery
        k('head', 30)
        k('head', 38, rot=('X', -8), ease='BACK')
        k('head', 58, rot=('X', -8))
        k('head', 64)
        # the wings unfold, the pointing arm thrusts: freeze
        for nm, sx in (('wing_l', 1), ('wing_r', -1)):
            k(nm, 34)
            k(nm, 42, rot=('Y', sx * 62), ease='BACK')
            k(nm, 58, rot=('Y', sx * 62))
            k(nm, 66)
        k('arm_l', 36)
        k('arm_l', 42, rot=('Z', 14), ease='BACK')
        k('arm_l', 58, rot=('Z', 14))
        k('arm_l', 64)
        for b in allb:
            k(b, 70)
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
    # the yamabushi robe: deep purple with a gold-dot pattern, the hakama in checks, a white obi
    P.fill('robe', pt.ramp('#4a3a6a', 7, shift=0.07), tone=tone, base=0.12)
    P.tint(P.region('robe') & ((np.mod(X + 0.5 * np.floor(Z / 2.4), 2.4) - 1.2) ** 2 + (np.mod(Z, 2.4) - 1.2) ** 2 < 0.16), pt.ramp('#d8b04a', 6, shift=0.06), tone + 0.2)
    P.fill('hakama', pt.ramp('#efe6d2', 7, shift=0.05), tone=sh, base=0.05)
    P.tint(P.region('hakama') & ((np.abs(np.mod(X, 3.0) - 1.5) < 0.45) | (np.abs(np.mod(Z, 3.0) - 1.5) < 0.45)), pt.ramp('#4a3a6a', 6, shift=0.07), sh + 0.1)
    P.fill('obi', pt.ramp('#efe6d2', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('sleeve', pt.ramp('#4a3a6a', 7, shift=0.07), tone=free, base=0.12)
    P.tint(P.region('sleeve') & (np.abs(np.mod(Z, 4.4) - 2.2) < 0.4), pt.ramp('#d8b04a', 6, shift=0.06), free + 0.1)
    P.fill('pom', pt.ramp('#f2ece2', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('wing', pt.ramp('#2a2a32', 7, shift=0.06), tone=free, base=0.25)
    P.tint(P.region('wing') & (np.abs(np.mod(Z * 0.8 + np.abs(X) * 0.6, 2.2) - 1.1) < 0.25), pt.ramp('#4a4a5a', 6, shift=0.06), free + 0.2)
    P.fill('feather', pt.ramp('#efe6d2', 6, shift=0.05), tone=free, base=0.1)
    P.tint(P.region('feather') & (Z > FAN[2] + 8.4), pt.ramp('#2a2a32', 6, shift=0.05), free + 0.2)
    P.fill('lacquer', pt.ramp('#26262c', 6, shift=0.05), tone=free * 1.2, base=0.3)
    P.fill('wood', pt.ramp('#b08a5a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('tabi', pt.ramp('#f2ece2', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('mane', pt.ramp('#f2ece2', 7, shift=0.05), tone=free, base=0.1)
    P.tint(P.region('mane') & (np.abs(np.sin(X * 1.5 + Z * 0.2)) < 0.25), pt.ramp('#c8c0b4', 6, shift=0.05), free)   # the locks
    RED = pt.ramp('#d04436', 7, shift=0.06)
    P.fill('face', RED, tone=free, base=0.1)
    P.fill('skin', RED, tone=free, base=0.1)
    # kumadori: the villain's indigo lines across the red face (and one along the nose)
    hd = P.region('face') & (P.part == PI['head'])
    fk = face.Face(P, c=(0, HC[1] - 7.4, HC[2] + 0.4), axis=(0, -1, 0.05), where=hd, seed=121, ink='#2a3a8a')
    for sx in (-1, 1):
        fk.stroke([(sx * 2.4, 2.6), (sx * 4.6, 4.0), (sx * 6.8, 6.0)], weight=0.6)
        fk.stroke([(sx * 3.4, -1.4), (sx * 5.6, -0.6), (sx * 7.4, 1.6)], weight=0.5)
        fk.stroke([(sx * 2.6, -4.0), (sx * 5.0, -4.8)], weight=0.45)
    # the face, drawn on: the villain's scowl: small glaring dots under heavy angry brows, a downturned mouth under the nose
    fc = face.Face(P, c=(0, HC[1] - 7.4, HC[2] + 0.4), axis=(0, -1, 0.05), where=hd, seed=122)
    fc.eyes('dot', spread=6.2, size=0.7, dy=1.2)
    fc.brows('angry', spread=6.8, dy=3.0, w=3.0, weight=0.5)
    fc.mouth('frown', w=4.4, dy=-4.2, side=1)
    P.lines(['robe', 'sleeve', 'hakama'], ['obi', 'face', 'pom'], step=1)
    P.lines(['face'], ['mane', 'lacquer'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 71), skip=[('arm_r', 'robe'), ('arm_l', 'robe'), ('head', 'robe'), ('wing_l', 'robe'), ('wing_r', 'robe')]),
       cams=[((62, -78, 56), (0, -2, 22)), ((-60, 68, 50), (0, 0, 22))], fold=(0, 12, 42, 56))
