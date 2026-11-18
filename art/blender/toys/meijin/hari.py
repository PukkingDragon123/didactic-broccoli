"""ベーゴマハリネズミ Beigoma Hedgehog: the beigoma champion of the lane (series meijin, concepts_C.md): a hedgehog
in a striped vest and shorts, a red headband, the launching string in his paw, beside the bucket arena (an old bucket
with a canvas stretched over it) where his iron top sits ready.

Gimmick: he winds back and throws: the iron top spins on the canvas, wobbling round the ring, and he pumps his fist.

    tools/blender.sh art/blender/toys/meijin/hari.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('meijin', 'hari')

HX = -7.0                      # the hedgehog's centre line (x)
HC = (HX, -2.4, 24.4)          # the head's centre
BK = (10.0, 1.0)               # the bucket's centre (x, y)
BZ = 11.0                      # the canvas top
TOP = (BK[0] + 1.6, BK[1] - 1.0, BZ + 0.9)

# ------------------------------------------------------------------ the bucket arena: a tin bucket with a canvas stretched over it, a rope round
bucket = tk.lathe('bucket', [(0, 0), (7.0, 0), (7.4, 0.6), (8.4, BZ - 0.8), (8.8, BZ - 0.4), (8.6, BZ), (0, BZ - 0.6)], n=24, centre=(BK[0], BK[1], 0))


def sc_bucket(h):
    def f(V, N):  # the pressed rings of a tin bucket, the rope binding the canvas
        r = np.hypot(V[:, 0] - BK[0], V[:, 1] - BK[1])
        side = np.abs(N[:, 2]) < 0.6
        d = 0.25 * side * ((np.abs(V[:, 2] - 3.0) < 0.35) | (np.abs(V[:, 2] - 7.0) < 0.35))
        d += 0.45 * side * tk.smoothstep(0.7, 0.0, np.abs(V[:, 2] - (BZ - 1.4)))
        d -= 0.5 * (N[:, 2] > 0.6) * tk.smoothstep(6.0, 0.0, r)   # the canvas sags a little in the middle
        return d
    tk.push(h, f)


bucket_lo, bucket_hi = cx.low(bucket, 'bucket', 160, lo=1, hi=2, sculpt=sc_bucket, region=('tin', [('canvas', lambda C, N: (N[:, 2] > 0.5) & (C[:, 2] > BZ - 1.0)),
                                                                                              ('rope', lambda C, N: np.abs(C[:, 2] - (BZ - 1.4)) < 0.7)]))
top = tk.lathe('beigoma', [(0, -1.4), (1.0, -1.0), (3.2, 0.4), (3.4, 0.9), (2.4, 1.2), (0, 1.3)], n=14, centre=TOP)


def sc_top(h):
    def f(V, N):  # the cast ridges and the maker's mark on the iron top
        a = np.arctan2(V[:, 1] - TOP[1], V[:, 0] - TOP[0])
        return 0.15 * (np.abs(np.sin(a * 8)) > 0.7) * (N[:, 2] > 0.3)
    tk.push(h, f)


top_lo, top_hi = cx.low(top, 'beigoma', 50, lo=0, hi=2, sculpt=sc_top, region='iron')

# ------------------------------------------------------------------ the hedgehog: body with its spines, legs, the vest and shorts
body = tk.loft('body', [{'c': (HX, 0.8, 5.6), 'w': 12.4, 'h': 6.4, 'e': 2.2},
                        {'c': (HX, 0.6, 10.0), 'w': 15.0, 'ht': 7.0, 'hb': 7.6, 'e': 2.3},
                        {'c': (HX, 0.2, 15.0), 'w': 14.6, 'ht': 6.6, 'hb': 7.6, 'e': 2.3},
                        {'c': (HX, -0.2, 19.0), 'w': 12.0, 'h': 6.0, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.4)
body_lo, body_hi = cx.low(body, 'body', 180, lo=1, hi=3, region=('vest', [('shorts', lambda C, N: C[:, 2] < 9.4)]))
# the spines: a spiky cloak over the back and the top of the head (its own part, the silhouette carries the spikes)
spine = tk.loft('spines', [{'c': (HX, 3.6, 7.0), 'w': 13.4, 'h': 4.0, 'e': 2.2},
                           {'c': (HX, 4.0, 13.0), 'w': 16.0, 'h': 4.6, 'e': 2.3},
                           {'c': (HX, 3.4, 19.0), 'w': 15.6, 'h': 4.8, 'e': 2.3},
                           {'c': (HX, 1.4, 25.4), 'w': 15.0, 'h': 5.4, 'e': 2.3},
                           {'c': (HX, -1.8, 29.4), 'w': 11.0, 'h': 3.8, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.6)


def spikes(o, amp):
    def f(V, N):  # a field of spines: cones pushed out along the normal on a staggered grid
        out = N[:, 1] > -0.3
        u = np.arctan2(V[:, 1] - 2.0, V[:, 0] - HX) * 4.0
        v = V[:, 2] / 2.2
        fu = np.mod(u + 0.5 * np.floor(v), 1.0) - 0.5
        fv = np.mod(v, 1.0) - 0.5
        return amp * np.clip(1 - 2.2 * np.hypot(fu, fv), 0, 1) ** 1.5 * out
    tk.push(o, f)


spine_lo, spine_hi = cx.low(spine, 'spines', 150, lo=1, hi=2, sculpt=lambda h: spikes(h, 0.6), region='spines')
# the spines themselves: little cones standing out of the cloak along its normals, spread evenly over the back and crown
from mathutils import Vector  # noqa: E402
Vs, Ns = tk.verts(spine_lo), tk.vnormals(spine_lo)
cand = [i for i in range(len(Vs)) if Ns[i][1] > -0.15 and Vs[i][2] > 6.0]
pick = [max(cand, key=lambda i: Vs[i][2])]
while len(pick) < 64:
    d = np.min(np.linalg.norm(Vs[cand][:, None, :] - Vs[pick][None, :, :], axis=2), axis=1)
    pick.append(cand[int(np.argmax(d))])
SPK_LO, SPK_HI = [], []
for i in pick:
    n_ = Vector(tuple(Ns[i])).normalized()
    n_ = (n_ + Vector((0, 0.35, 0.25))).normalized()   # (the spines lie back a little)
    for lst, nn in ((SPK_LO, 3), (SPK_HI, 6)):
        c = tk.lathe('spike', [(0, -0.6), (1.05, -0.6), (0, 3.0)] if nn == 3 else [(0, -0.6), (1.05, -0.6), (0.45, 1.6), (0, 3.0)], n=nn)
        q = Vector((0, 0, 1)).rotation_difference(n_)
        tk.transform(c, q.to_matrix().to_4x4())
        tk.move(c, tuple(Vs[i]))
        lst.append(c)
spine_lo = tk.join([spine_lo] + SPK_LO, 'spines')
spk_hi = tk.join(SPK_HI, 'spikes_hi')
tk.set_region(spk_hi, 'spines')
LEGS = []
for sx in (1, -1):
    lg = tk.tube('leg', [(HX + sx * 3.4, 0.6, 6.4), (HX + sx * 3.8, 0.0, 2.6), (HX + sx * 3.8, -1.6, 0.9)], [2.4, 2.0, 1.8], n=8)
    LEGS.append(cx.low(lg, 'leg', 30, lo=1, hi=1, region='skin'))

# ------------------------------------------------------------------ arms: the throwing arm (with the string), the other on his hip; the head
ARM_S = (HX + 6.4, -0.6, 16.6)
arm = tk.tube('arm_t', [ARM_S, (HX + 10.0, -3.0, 13.6), (HX + 12.6, -6.0, 13.0)], [2.2, 2.0, 1.8], n=8)
paw = tk.lathe('paw', [(0, -1.3), (1.4, -1.0), (1.7, 0.0), (1.3, 1.0), (0, 1.3)], n=8, centre=(HX + 13.0, -6.6, 13.0))
string = tk.tube('string', [(HX + 13.4, -7.4, 12.4), (HX + 14.6, -9.0, 9.6), (HX + 13.0, -9.6, 7.4)], [0.35, 0.32, 0.3], n=5)
ARMT = [cx.low(arm, 'arm_t', 34, lo=1, hi=1, region='skin'), cx.low(paw, 'paw', 18, lo=0, hi=1, region='skin'), cx.low(string, 'string', 20, lo=0, hi=1, region='string')]
arm2 = tk.tube('arm', [(HX - 6.4, -0.6, 16.6), (HX - 9.6, -1.4, 13.0), (HX - 7.6, -4.0, 11.0)], [2.2, 2.0, 1.8], n=8)
ARM2 = [cx.low(arm2, 'arm', 34, lo=1, hi=1, region='skin')]
head = tk.loft('head', [{'c': (HC[0], HC[1] + 3.6, HC[2] + 0.6), 'w': 11.0, 'h': 5.4, 'e': 2.2}, {'c': (HC[0], HC[1], HC[2]), 'w': 13.4, 'h': 6.4, 'e': 2.3},
                        {'c': (HC[0], HC[1] - 3.6, HC[2] - 1.2), 'w': 9.0, 'h': 4.4, 'e': 2.2}, {'c': (HC[0], HC[1] - 6.8, HC[2] - 2.0), 'w': 3.6, 'h': 2.2, 'e': 2.2}],
                n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
head_lo, head_hi = cx.low(head, 'head', 140, lo=1, hi=3, region='skin')
band = tk.lathe('band', [(5.6, -0.6), (6.4, -0.6), (6.5, 0.6), (5.6, 0.6)], n=16, centre=(HC[0], HC[1] + 0.2, HC[2] + 2.6))
tk.rotate(band, -14, 'X', (HC[0], HC[1] + 0.2, HC[2] + 2.6))
EARS = []
for sx in (1, -1):
    e = tk.lathe('ear', [(0, -0.4), (1.5, -0.3), (1.5, 0.6), (0.8, 1.2), (0, 1.3)], n=8)
    tk.scale(e, (1, 0.6, 1))
    tk.move(e, (HC[0] + sx * 5.0, HC[1] + 0.4, HC[2] + 4.2))
    EARS.append(cx.low(e, 'ear', 16, lo=0, hi=1, region='skin'))
HEADP = [(head_lo, head_hi), cx.low(band, 'band', 40, lo=0, hi=1, region='band')] + EARS

# ------------------------------------------------------------------ parts
F.part('bucket', bucket_lo, [bucket_hi], bone='root', kind='gloss')
F.part('beigoma', top_lo, [top_hi], bone='top', kind='metal')
F.part('body', tk.join([body_lo, spine_lo] + [l[0] for l in LEGS] + [a_[0] for a_ in ARM2] + [h_[0] for h_ in HEADP], 'body'),
       [body_hi, spine_hi, spk_hi] + [l[1] for l in LEGS] + [a_[1] for a_ in ARM2] + [h_[1] for h_ in HEADP], bone='body')
F.part('arm_t', tk.join([a_[0] for a_ in ARMT], 'arm_t'), [a_[1] for a_ in ARMT], bone='arm_t')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (HX, 0, 2.0), parent='root')
    R.bone('arm_t', ARM_S, parent='body')
    R.bone('top', (TOP[0], TOP[1], BZ - 0.4), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'arm_t', 'top']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # wind back... and throw
        k('body', 2)
        k('body', 8, rot=('Z', -14))
        k('body', 13, rot=('Z', 6), ease='BACK')
        k('body', 18)
        k('arm_t', 2)
        k('arm_t', 8, rot=('X', 24))
        k('arm_t', 12, rot=('X', -16), ease='BACK')
        k('arm_t', 20)
        # the top spins, wobbling round the ring
        k('top', 12)
        for i in range(1, 13):
            f = 12 + i * 3
            a = 2 * math.pi * i / 6
            k('top', f, rot=[('Z', -170 * i), ('X', 5 * math.sin(a)), ('Y', 5 * math.cos(a))], move=(-1.2 * math.sin(a) - 0.0, 1.2 * math.cos(a) - 1.2, 0), ease='LINEAR')
        k('top', 52, rot=('Z', -170 * 12 - 60))
        k('top', 58, rot=('Z', -170 * 12 - 60))
        # the fist pump
        k('arm_t', 44)
        k('arm_t', 49, rot=[('X', -50), ('Z', -10)], ease='BACK')
        k('arm_t', 54, rot=[('X', -40), ('Z', -10)])
        k('arm_t', 60)
        k('body', 44)
        k('body', 48, move=(0, 0, 1.2))
        k('body', 53, ease='BOUNCE')
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
    P.fill('tin', pt.ramp('#a8b2b8', 7, dark=0.65, light=0.6, shift=0.05), tone=sh * 1.3, base=0.1)
    P.fill('canvas', pt.ramp('#d8c8a2', 6, shift=0.06), tone=sh, base=0.08)
    P.flat(P.region('canvas') & (np.abs(np.hypot(X - BK[0], Yc - BK[1]) - 5.2) < 0.25), '#8a6a4a')
    P.fill('rope', pt.ramp('#c8a46a', 6, shift=0.06), tone=sh, base=0.05)
    P.tint(P.region('rope') & (np.mod(np.arctan2(Yc - BK[1], X - BK[0]) * 6 + Z * 2, 1.2) < 0.4), pt.ramp('#8a6a3a', 6, shift=0.06), sh)
    P.fill('iron', pt.ramp('#5a5a62', 6, dark=0.6, light=0.6, shift=0.05), tone=free * 1.3, base=0.2)
    P.flat(P.region('iron') & (on[:, :, 2] > 0.7) & (np.hypot(X - TOP[0], Yc - TOP[1]) < 1.2), '#c8303a')
    P.fill('spines', pt.ramp('#7a5a44', 7, shift=0.07), tone=sh, base=0.1)
    P.tint(P.region('spines') & (np.sin(np.arctan2(Yc - 2.0, X - HX) * 16) * np.sin(Z * 2.9) > 0.5), pt.ramp('#d8c4a4', 6, shift=0.06), sh + 0.2)
    P.fill('skin', pt.ramp('#efd2b0', 7, shift=0.06), tone=free, base=0.08)
    # the vest (white and blue stripes), the red shorts, the red headband
    P.fill('vest', pt.ramp('#f2eee4', 6, shift=0.05), tone=sh, base=0.08)
    P.tint(P.region('vest') & (np.abs(np.mod(Z, 2.4) - 1.2) < 0.5), pt.ramp('#3a5a9a', 6, shift=0.06), sh)
    P.fill('shorts', pt.ramp('#c8303a', 6, shift=0.06), tone=sh, base=0.08)
    P.fill('band', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('string', pt.ramp('#efe6d2', 5, shift=0.05), tone=free, base=0.2)
    # the face, drawn on: a champion's smug look: confident dots, a raised brow, a black button nose, a side smile
    hd = P.region('skin') & (P.part == PI['body']) & (Z > 19.5)
    fc = face.Face(P, c=(HC[0], HC[1] - 5.0, HC[2] + 0.4), axis=(0, -1, 0.2), where=hd, seed=171)
    fc.eyes('dot', spread=6.0, size=0.6, dy=1.2)
    fc.brows('raised', spread=6.2, dy=2.8, w=1.8)
    fc.blush(8.2, -0.6, rx=1.3, ry=0.7)
    fn = face.Face(P, c=(HC[0], HC[1] - 7.8, HC[2] - 2.0), axis=(0, -1, 0.1), where=hd, seed=172)
    fn.nose('button', 0.0, 0.2, size=0.9)
    fm = face.Face(P, c=(HC[0], HC[1] - 5.8, HC[2] - 2.6), axis=(0, -1, -0.3), where=hd, seed=173)
    fm.mouth('smug', w=2.6, dy=-0.4)
    P.lines(['skin'], ['spines', 'vest', 'band'], step=1)
    P.lines(['vest'], ['shorts'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 65), skip=[('arm_t', 'body')]),
       cams=[((60, -76, 50), (1, -1, 13)), ((-58, 66, 44), (1, 0, 13))], fold=(0, 8, 24, 50))
