"""けんだまカメレオン Kendama Chameleon: the kendama champion, a chameleon standing on its hind legs with its curled tail
for a prop (series meijin, concepts_C.md), the kendama held in both hands with the red ball on the spike (the hardest
trick, done), a casque like a cap and turret eyes.

Gimmick: up goes the ball, turning over, the tongue flicks out to steer it, and it lands back on the spike: tome-ken.

    tools/blender.sh art/blender/toys/meijin/kamereon.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('meijin', 'kamereon')

HC = (0, -2.2, 30.0)            # the head's centre
KEN = np.array((0.0, -12.2, 15.0))   # the kendama handle's foot
BALL = KEN + (0, 0, 13.6)       # the ball's centre, on the spike

# ------------------------------------------------------------------ body, legs, the spiral tail on the ground
body = tk.loft('body', [{'c': (0, 1.2, 8.0), 'w': 11.0, 'h': 6.0, 'e': 2.2},
                        {'c': (0, 0.4, 13.0), 'w': 13.6, 'ht': 7.0, 'hb': 6.4, 'e': 2.3},
                        {'c': (0, -0.6, 19.0), 'w': 13.0, 'ht': 6.6, 'hb': 6.0, 'e': 2.3},
                        {'c': (0, -1.4, 24.0), 'w': 10.6, 'h': 5.2, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.4)


def sc_body(h):
    def f(V, N):  # fine bead-scales and the ridge down the back
        d = 0.12 * np.sin(V[:, 0] * 3.1) * np.sin(V[:, 2] * 3.3 + V[:, 1] * 1.1)
        d += 0.6 * tk.smoothstep(1.2, 0.0, np.abs(V[:, 0])) * (N[:, 1] > 0.6)
        return d
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 200, lo=1, hi=3, sculpt=sc_body, region=('green', [('belly', lambda C, N: N[:, 1] < -0.5)]))
LEGS = []
for sx in (1, -1):
    lg = tk.tube('leg', [(sx * 4.4, 0.6, 10.0), (sx * 6.6, -2.4, 6.0), (sx * 6.0, -1.6, 1.6)], [2.4, 2.0, 1.7], n=8)
    ft = tk.loft('foot', [{'c': (sx * 6.0, 0.6, 0.9), 'w': 3.6, 'h': 0.9, 'e': 2.4}, {'c': (sx * 6.6, -7.4, 0.9), 'w': 4.4, 'h': 0.9, 'e': 2.4}],
                 n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=0.9)
    LEGS += [cx.low(lg, 'leg', 30, lo=1, hi=1, region='green'), cx.low(ft, 'foot', 16, lo=1, hi=1, region='green')]
spiral = []
for i in range(14):
    t = i / 13
    a = math.radians(90 + 520 * t)
    r = 8.0 * (1 - 0.72 * t)
    spiral.append((r * math.cos(a) * 0.9, 9.0 + r * math.sin(a), max(1.5 * (1 - t) + 0.9, 0.9) if i else 6.0))
spiral[0] = (0, 4.0, 7.0)
spiral[1] = (0, 7.0, 3.6)
tail = tk.tube('tail', spiral, [2.4, 2.2, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0, 0.9, 0.8], n=8)
tk.deform(tail, lambda V: np.stack([V[:, 0], V[:, 1], np.maximum(V[:, 2], 0.0)], 1))
tail_lo, tail_hi = cx.low(tail, 'tail', 120, lo=1, hi=2, region='green')

# ------------------------------------------------------------------ arms holding the kendama
ARMS = []
for sx in (1, -1):
    s_ = np.array((sx * 5.4, -1.6, 21.0))
    hnd = KEN + np.array((sx * 1.6, 0.6, 2.2 + (1.4 if sx < 0 else 0.0)))
    a = tk.tube('arm', [tuple(s_), tuple((s_ + hnd) / 2 + np.array((sx * 2.2, 0, -1.0))), tuple(hnd)], [2.0, 1.8, 1.6], n=8)
    paw = tk.lathe('paw', [(0, -1.2), (1.4, -0.9), (1.6, 0.0), (1.3, 0.9), (0, 1.2)], n=8, centre=tuple(hnd + (0, -0.4, 0)))
    ARMS += [cx.low(a, 'arm', 30, lo=1, hi=1, region='green'), cx.low(paw, 'paw', 16, lo=0, hi=1, region='green')]
handle = tk.cyl('handle', 1.1, KEN[2], KEN[2] + 9.6, n=8, at=(KEN[0], KEN[1]), axis='Z', bevel=0.3, segs=1)
spike = tk.lathe('spike', [(0, 0), (0.9, 0), (0.6, 2.0), (0.2, 3.4), (0, 3.6)], n=8, centre=tuple(KEN + (0, 0, 9.6)))
cross = tk.cyl('cross', 1.6, -5.0, 5.0, n=10, at=(KEN[1], KEN[2] + 7.2), axis='X', bevel=0.3, segs=1)
cups = []
for sx, r in ((1, 2.6), (-1, 2.2)):
    c = tk.lathe('cup', [(1.4, -0.8), (r, 0.2), (r, 0.6), (r - 0.6, 0.6), (0.9, -0.2)], n=12, axis='X', centre=(sx * 5.0, KEN[1], KEN[2] + 7.2))
    if sx < 0:
        tk.scale(c, (-1, 1, 1), (-5.0, 0, 0))
        tk.fix_normals(c)
    cups.append(c)
KENP = [cx.low(o, o.name, t, lo=0, hi=1, region='wood') for o, t in ((handle, 30), (spike, 16), (cross, 30))] + [cx.low(c, 'cup', 30, lo=0, hi=1, region='wood') for c in cups]
ball = tk.lathe('ball', [(0, -2.9), (1.5, -2.5), (2.6, -1.2), (2.9, 0.0), (2.6, 1.3), (1.5, 2.5), (0, 2.9)], n=14, centre=tuple(BALL))
ball_lo, ball_hi = cx.low(ball, 'ball', 70, lo=0, hi=2, region='ball')

# ------------------------------------------------------------------ the head: the casque, the turret eyes, the jaw; the tongue inside
head = tk.loft('head', [{'c': (0, HC[1] + 4.0, HC[2] - 0.4), 'w': 9.0, 'h': 4.6, 'e': 2.2}, {'c': (0, HC[1] + 1.0, HC[2]), 'w': 12.4, 'h': 6.0, 'e': 2.3},
                        {'c': (0, HC[1] - 3.0, HC[2] - 0.6), 'w': 10.6, 'h': 5.0, 'e': 2.3}, {'c': (0, HC[1] - 6.0, HC[2] - 1.4), 'w': 6.0, 'h': 3.0, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
casque = tk.loft('casque', [{'c': (0, HC[1] - 2.0, HC[2] + 4.2), 'w': 4.0, 'h': 1.4, 'e': 2.2}, {'c': (0, HC[1] + 1.4, HC[2] + 6.6), 'w': 6.0, 'h': 2.0, 'e': 2.3},
                            {'c': (0, HC[1] + 5.0, HC[2] + 6.0), 'w': 4.4, 'h': 1.6, 'e': 2.2}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HEADP = [cx.low(head, 'head', 150, lo=1, hi=3, region=('green', [('belly', lambda C, N: (N[:, 2] < -0.4))])), cx.low(casque, 'casque', 50, lo=1, hi=2, region='casque')]
from mathutils import Vector  # noqa: E402
for sx in (1, -1):
    t_ = tk.lathe('turret', [(0, -1.0), (2.6, -1.0), (2.4, 0.8), (1.4, 2.0), (0.9, 2.3), (0, 2.4)], n=10)
    q = Vector((0, 0, 1)).rotation_difference(Vector((sx * 1.0, -0.45, 0.2)).normalized())
    tk.transform(t_, q.to_matrix().to_4x4())
    tk.move(t_, (sx * 5.0, HC[1] - 1.2, HC[2] + 1.2))
    HEADP.append(cx.low(t_, 'turret', 30, lo=1, hi=1, region='turret'))
tongue = tk.tube('tongue', [(0, HC[1] - 4.6, HC[2] - 2.0), (0, HC[1] - 6.0, HC[2] - 2.0), (0, HC[1] - 6.8, HC[2] - 2.0)], [0.9, 0.8, 1.2], n=6, cap1='round')
tongue_lo, tongue_hi = cx.low(tongue, 'tongue', 24, lo=0, hi=1, region='tongue')

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body_lo, tail_lo] + [l[0] for l in LEGS] + [h_[0] for h_ in HEADP], 'body'), [body_hi, tail_hi] + [l[1] for l in LEGS] + [h_[1] for h_ in HEADP], bone='body')
F.part('arms', tk.join([a_[0] for a_ in ARMS] + [k_[0] for k_ in KENP], 'arms'), [a_[1] for a_ in ARMS] + [k_[1] for k_ in KENP], bone='arms')
F.part('ball', ball_lo, [ball_hi], bone='ball')
F.part('tongue', tongue_lo, [tongue_hi], bone='tongue')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 1.0), parent='root')
    R.bone('arms', (0, -1.6, 21.0), parent='body')
    R.bone('ball', tuple(BALL), parent='arms')
    R.bone('tongue', (0, HC[1] - 4.6, HC[2] - 2.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'arms', 'ball', 'tongue']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the dip and the flick: the arms drop, then pop the ball up
        k('arms', 2)
        k('arms', 6, move=(0, 0, -1.6))
        k('arms', 10, move=(0, 0, 1.2), ease='BACK')
        k('arms', 16)
        k('ball', 8)
        k('ball', 18, move=(0, -1.2, 11.0), rot=('X', -200))
        k('ball', 24, move=(0, -1.4, 12.0), rot=('X', -300))
        # the tongue flicks out to steer it
        k('tongue', 16)
        k('tongue', 20, move=(0, -2.4, 4.6), scale=(1.0, 3.4, 1.0), ease='BACK')
        k('tongue', 25, scale=1.0)
        # down onto the spike: tome-ken
        k('ball', 32, rot=('X', -360), ease='BOUNCE')
        k('arms', 30)
        k('arms', 33, move=(0, 0, -1.2))
        k('arms', 38, ease='BACK')
        k('body', 36)
        k('body', 40, move=(0, 0, 1.0))
        k('body', 45, ease='BOUNCE')
        for b in allb:
            k(b, 54)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    tone = np.where(P.part == PI['body'], sh, free)
    GREEN = pt.ramp('#5cb24a', 7, shift=0.07)
    P.fill('green', GREEN, tone=tone, base=0.08)
    # chameleon bands: yellow stripes down the flanks, the tail's rings
    P.tint(P.region('green') & (np.abs(np.mod(Z * 0.9 + Yc * 0.3, 4.2) - 2.1) < 0.6) & (Z > 4.0), pt.ramp('#d8d24a', 6, shift=0.06), tone)
    P.fill('belly', pt.ramp('#e2e6a4', 6, shift=0.06), tone=tone, base=0.1)
    P.fill('casque', pt.ramp('#3a8a4a', 7, shift=0.07), tone=free, base=0.1)
    P.fill('turret', GREEN, tone=free, base=0.05)
    P.tint(P.region('turret') & (np.mod(np.hypot(X - np.sign(X) * 5.0, Z - (HC[2] + 1.2)), 1.2) < 0.35), pt.ramp('#3a8a4a', 6, shift=0.06), free)
    P.fill('wood', pt.ramp('#d8b07a', 7, shift=0.06), tone=free, base=0.1)
    P.fill('ball', pt.ramp('#d03a3a', 7, shift=0.06), tone=free, base=0.15)
    P.fill('tongue', pt.ramp('#ef8a98', 6, shift=0.06), tone=free, base=0.1)
    # the face, drawn on: a dot at the tip of each turret eye (looking two ways at once), a long smug grin along the jaw
    for sx in (1, -1):
        c = (sx * 7.2, HC[1] - 2.2, HC[2] + 1.6)
        fe = face.Face(P, c=c, axis=(sx * 1.0, -0.45, 0.2), where=P.region('turret'), seed=191 + sx)
        fe.dot(0.0, 0.0, 0.62, 0.7, rot=0)
    fm = face.Face(P, c=(0, HC[1] - 5.8, HC[2] - 1.4), axis=(0, -1, 0.0), where=(P.region('green') | P.region('belly')) & (P.part == PI['body']), seed=193)
    fm.mouth('smug', w=6.4, dy=-0.4)
    fm.blush(7.6, 0.6, rx=1.2, ry=0.7)
    P.lines(['green'], ['belly', 'casque', 'turret'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 55), skip=[('arms', 'body'), ('tongue', 'body'), ('ball', 'arms')]),
       cams=[((58, -74, 50), (0, -3, 16)), ((-56, 64, 44), (0, 0, 16))], fold=(0, 10, 20, 32))
