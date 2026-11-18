"""たちまわりカマイタチ Sword-Fight Kamaitachi: the fight scene (tachimawari), a weasel whose forearms end in sickles,
riding its own little whirlwind (series kabuki, concepts_C.md): a short indigo fighting kimono with white waves, red
cross-straps tied for action and a red headband, a long bushy tail with a dark tip.

Gimmick: it crouches, spins a full turn on its whirlwind with both sickles out (the wind spins the other way), the
tail whips, and it freezes in the fighter's mie.

    tools/blender.sh art/blender/toys/kabuki/kamaitachi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kabuki', 'kamaitachi')

WZ = 4.2                      # the whirlwind's top (where the feet stand)
HC = (0, -3.4, 33.0)          # the head's centre
NECK = (0, -1.4, 27.0)

# ------------------------------------------------------------------ the whirlwind it rides
whirl = tk.lathe('whirl', [(0, 0), (14.0, 0), (13.6, 1.2), (11.6, 2.8), (8.0, 3.8), (4.0, WZ), (0, WZ)], n=28)


def sc_whirl(h):
    def f(V, N):  # spiral gusts sweeping round it
        r = np.hypot(V[:, 0], V[:, 1])
        a = np.arctan2(V[:, 1], V[:, 0])
        return 0.5 * (np.abs(np.sin(a * 3 + r * 0.55)) ** 6) - 0.2
    tk.push(h, f)


whirl_lo, whirl_hi = cx.low(whirl, 'whirl', 140, lo=1, hi=2, sculpt=sc_whirl, region='wind')

# ------------------------------------------------------------------ legs in the fighter's crouch, the long body, the short kimono
LEGS = []
for sx, fy in ((-1, -2.6), (1, 1.6)):
    hip = np.array((sx * 3.4, 0.6, 12.6))
    knee = np.array((sx * 6.0, fy - 2.0, 8.6))
    ank = np.array((sx * 5.6, fy, WZ + 1.4))
    lg = tk.tube('leg', [tuple(hip), tuple(knee), tuple(ank)], [3.2, 2.6, 2.0], n=8)
    ft = tk.loft('foot', [{'c': tuple(ank + (0, 1.4, -0.6)), 'w': 3.2, 'h': 1.2, 'e': 2.2}, {'c': tuple(ank + (0, -2.6, -0.8)), 'w': 3.6, 'h': 1.2, 'e': 2.2}],
                 n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
    LEGS += [cx.low(lg, 'leg', 40, lo=1, hi=1, region='fur'), cx.low(ft, 'foot', 24, lo=1, hi=1, region='fur')]
body = tk.loft('body', [{'c': (0, 0.6, 10.6), 'w': 13.0, 'ht': 6.0, 'hb': 6.4, 'e': 2.3},
                        {'c': (0, 0.0, 15.0), 'w': 14.6, 'ht': 6.6, 'hb': 6.4, 'e': 2.4},
                        {'c': (0, -0.6, 20.4), 'w': 13.0, 'ht': 6.2, 'hb': 5.8, 'e': 2.3},
                        {'c': (0, -1.2, 24.6), 'w': 11.4, 'ht': 5.4, 'hb': 5.0, 'e': 2.3},
                        {'c': (0, -1.6, 27.8), 'w': 8.0, 'h': 3.8, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.4)


def sc_body(h):
    def f(V, N):
        col = 0.35 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 0] + 0.6 * (V[:, 2] - 25.4))) * (N[:, 1] < -0.4) * (V[:, 2] > 17.0)
        obi = 0.4 * tk.smoothstep(0.6, 0.2, np.abs(V[:, 2] - 16.0) - 1.2)
        hem = 0.3 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 2] - 10.6))
        return col + obi + hem
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 220, lo=1, hi=3, sculpt=sc_body, region=('kimono', [('obi', lambda C, N: np.abs(C[:, 2] - 16.0) < 1.6)]))
tail = tk.tube('tail', [(0, 5.4, 12.0), (0.6, 10.0, 10.6), (2.4, 14.0, 13.6), (3.4, 15.0, 19.6), (2.0, 13.4, 24.0)], [2.4, 3.2, 3.4, 3.0, 1.8], n=10, cap1='round')


def sc_tail(h):
    def f(V, N):  # bushy fur
        return 0.25 * np.sin(V[:, 2] * 2.4 + V[:, 0] * 1.4) * np.sin(V[:, 1] * 2.1)
    tk.push(h, f)


tail_lo, tail_hi = cx.low(tail, 'tail', 80, lo=1, hi=2, sculpt=sc_tail, region=('fur', [('tip', lambda C, N: C[:, 2] > 21.0)]))

# ------------------------------------------------------------------ arms with sickles: one raised high, one forward
ARMS = {}
for sx, nm, el, wr, bdir in ((-1, 'arm_r', (-9.0, -3.0, 28.0), (-8.6, -6.4, 33.6), (0.15, -0.35, 1.0)),
                             (1, 'arm_l', (9.4, -5.0, 21.0), (8.0, -11.0, 22.0), (0.2, -1.0, -0.15))):
    sh_ = (sx * 6.2, -0.8, 24.4)
    el, wr, bdir = np.array(el), np.array(wr), np.array(bdir) / np.linalg.norm(bdir)
    a = tk.tube(nm, [sh_, tuple(el), tuple(wr)], [2.6, 2.3, 2.0], n=8)
    # the sickle: a curved blade swept forward from the wrist, its back edge thick
    side = np.cross(bdir, (0, 0, 1) if abs(bdir[2]) < 0.9 else (1, 0, 0))
    side /= np.linalg.norm(side)
    pts = []
    for i in range(7):
        t = i / 6
        pts.append(wr + bdir * (1.0 + 9.0 * t) + side * (-sx) * 3.4 * math.sin(math.pi * t * 0.8) * t)
    blade = tk.tube('blade', [tuple(p) for p in pts], [1.3, 1.25, 1.15, 1.0, 0.8, 0.5, 0.15], n=6, squash=0.35, up=tuple(side), cap1='point')
    cuff = tk.lathe('cuff', [(0, -1.2), (2.4, -1.2), (2.6, 0.0), (2.4, 1.2), (0, 1.2)], n=10)
    from mathutils import Vector
    q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(bdir)))
    tk.transform(cuff, q.to_matrix().to_4x4())
    tk.move(cuff, tuple(wr))
    ARMS[nm] = ([cx.low(a, nm, 40, lo=1, hi=1, region='kimono'), cx.low(blade, 'blade', 50, lo=1, hi=2, region='steel'),
                 cx.low(cuff, 'cuff', 24, lo=0, hi=1, region='strap')], sh_)

# ------------------------------------------------------------------ the head: a weasel's, small round ears, the red headband with its tails
head = tk.loft('head', [{'c': (0, HC[1] + 4.6, HC[2] + 0.4), 'w': 9.4, 'h': 4.6, 'e': 2.2}, {'c': (0, HC[1] + 1.6, HC[2] + 0.4), 'w': 13.6, 'h': 6.6, 'e': 2.3},
                        {'c': (0, HC[1] - 2.2, HC[2] - 0.2), 'w': 12.6, 'h': 6.0, 'e': 2.3}, {'c': (0, HC[1] - 5.6, HC[2] - 1.2), 'w': 8.0, 'h': 4.2, 'e': 2.2},
                        {'c': (0, HC[1] - 8.2, HC[2] - 1.8), 'w': 4.4, 'h': 2.6, 'e': 2.2}], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)
head_lo, head_hi = cx.low(head, 'head', 190, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 2] < HC[2] - 1.6) & (C[:, 1] < HC[1] - 1.0))]))
HEADP = [(head_lo, head_hi)]
for sx in (1, -1):
    e = tk.lathe('ear', [(0, -0.6), (2.2, -0.4), (2.4, 0.8), (1.6, 1.8), (0, 2.1)], n=8)
    tk.scale(e, (1, 0.6, 1))
    tk.rotate(e, -sx * 30, 'Y')
    tk.move(e, (sx * 5.0, HC[1] + 1.8, HC[2] + 5.2))
    HEADP.append(cx.low(e, 'ear', 20, lo=0, hi=1, region='fur'))
band = tk.lathe('band', [(5.2, -0.7), (6.0, -0.7), (6.1, 0.7), (5.2, 0.7)], n=18, centre=(0, HC[1] + 0.4, HC[2] + 3.2))
tk.scale(band, (0.96, 1.08, 1.0), (0, HC[1] + 0.4, HC[2] + 3.2))
tk.rotate(band, -12, 'X', (0, HC[1] + 0.4, HC[2] + 3.2))
bt = tk.tube('btails', [(0, HC[1] + 6.4, HC[2] + 3.6), (1.2, HC[1] + 8.0, HC[2] + 1.6), (2.2, HC[1] + 8.8, HC[2] - 1.8)], [0.8, 0.7, 0.5], n=5)
HEADP += [cx.low(band, 'band', 50, lo=0, hi=1, region='red'), cx.low(bt, 'btails', 20, lo=0, hi=1, region='red')]

# ------------------------------------------------------------------ parts
F.part('whirl', whirl_lo, [whirl_hi], bone='whirl', kind='gloss')
F.part('body', tk.join([body_lo, tail_lo] + [l[0] for l in LEGS], 'body'), [body_hi, tail_hi] + [l[1] for l in LEGS], bone='body')
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='head')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('whirl', (0, 0, 1.0), parent='root')
    R.bone('body', (0, 0, WZ), parent='root')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='body')
    R.bone('head', NECK, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'whirl', 'body', 'arm_r', 'arm_l', 'head']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # a crouch, then the spin: a full turn with both sickles out, the wind turning the other way
        k('body', 3)
        k('body', 8, scale=(1.03, 1.03, 0.96))
        k('body', 12, rot=('Z', 90), move=(0, 0, 1.4), ease='LINEAR')
        k('body', 16, rot=('Z', 180), move=(0, 0, 1.8), ease='LINEAR')
        k('body', 20, rot=('Z', 270), move=(0, 0, 1.4), ease='LINEAR')
        k('body', 25, rot=('Z', 372), ease='BACK')
        k('body', 30, rot=('Z', 360))
        k('whirl', 6)
        for i in range(1, 7):
            k('whirl', 6 + i * 6, rot=('Z', -120 * i), ease='LINEAR')
        k('whirl', 46, rot=('Z', -760))
        for nm, sx in (('arm_r', -1), ('arm_l', 1)):
            k(nm, 6)
            k(nm, 12, rot=('Y', sx * 34))
            k(nm, 24, rot=('Y', sx * 34))
            k(nm, 30, rot=('Y', sx * -6), ease='BACK')
            k(nm, 46, rot=('Y', sx * -6))
            k(nm, 54)
        # the mie: head snaps to the front, a glare
        k('head', 22)
        k('head', 28, rot=('Y', 12), ease='BACK')
        k('head', 46, rot=('Y', 12))
        k('head', 54)
        k('body', 46, rot=('Z', 360))
        k('body', 47)
        for b in allb:
            k(b, 60)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('wind', pt.ramp('#cfe2ea', 7, shift=0.05), tone=sh, base=0.12)
    r, a = np.hypot(X, Yc), np.arctan2(Yc, X)
    P.tint(P.region('wind') & (np.abs(np.sin(a * 3 + r * 0.55)) > 0.92), pt.ramp('#7aa2b8', 6, shift=0.05), sh)
    FUR = pt.ramp('#c8884a', 7, shift=0.07)
    P.fill('fur', FUR, tone=free, base=0.08)
    P.fill('cream', pt.ramp('#f2e2c4', 6, shift=0.05), tone=free, base=0.1)
    P.fill('tip', pt.ramp('#3a2a22', 6, shift=0.05), tone=free, base=0.2)
    # the fighting kimono: indigo with white wave scales (seigaiha), red cross-straps, the obi
    P.fill('kimono', pt.ramp('#2c3a6a', 7, shift=0.07), tone=free, base=0.12)
    km = P.region('kimono')
    cu, cz = np.mod(X, 3.0) - 1.5, np.mod(Z + 0.75 * np.floor(X / 3.0), 1.6)
    P.tint(km & (np.abs(np.hypot(cu, cz) - 1.2) < 0.18), pt.ramp('#e8eef2', 6, shift=0.05), free + 0.2)
    P.tint(km & (P.part == PI['body']) & ((np.abs(X - 0.75 * (Z - 18.6)) < 0.6) | (np.abs(X + 0.75 * (Z - 18.6)) < 0.6)) & (Z > 14.0) & (Z < 26.0),
           pt.ramp('#c8303a', 6, shift=0.06), free)
    P.fill('obi', pt.ramp('#efe6d2', 6, shift=0.05), tone=free, base=0.1)
    P.fill('red', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('strap', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.05)
    P.fill('steel', pt.ramp('#c0c8d0', 7, dark=0.7, light=0.7, shift=0.05), tone=free * 1.4, base=0.15)
    # the face, drawn on: glaring dots, angry brows, a dark button nose and two fangs peeking: a fighter
    hd = (P.region('fur') | P.region('cream')) & (P.part == PI['head'])
    fc = face.Face(P, c=(0, HC[1] - 6.6, HC[2] + 0.2), axis=(0, -1, 0.2), where=hd, seed=141)
    fc.eyes('dot', spread=6.0, size=0.62, dy=1.6)
    fc.brows('angry', spread=6.4, dy=3.2, w=2.4)
    fn = face.Face(P, c=(0, HC[1] - 9.4, HC[2] - 1.8), axis=(0, -1, 0.1), where=hd, seed=142)
    fn.nose('button', 0.0, 0.4, size=0.8)
    fn.snout_mouth('Y', 0.0, -0.6, w=1.8)
    fn.fangs(0.0, -1.5, gap=1.2, n=2)
    P.lines(['kimono'], ['fur', 'obi', 'cream'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 61), skip=[('arm_r', 'body'), ('arm_l', 'body'), ('head', 'body')]),
       cams=[((60, -76, 52), (0, -2, 18)), ((-58, 66, 46), (0, 0, 18))], fold=(0, 12, 20, 32))
