"""エースのシバ Ace Shiba (series janru, concepts_E.md): the sports genre, our own: a shiba inu baseball ace in a
pinstriped cream uniform, navy cap (his ears through it) and navy socks, on the pitcher's mound at the top of his
wind-up: up on his left leg with the right knee kicked high, the glove up in front, the ball cocked back behind his
head, his curled tail up.
Gimmick (the pitch): the kick drops into a long stride, he lunges, the arm whips over the top and the ball flies off
toward you; then he's back at the top of the wind-up with a new ball.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/shiba.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'shiba')
B = Build()
MZ = 3.1   # the mound top

# ------------------------------------------------------------------ the pitcher's mound and its rubber
mound = tk.lathe('base', [(0, 0), (14.0, 0), (14.0, 1.0), (11.0, 2.2), (5.0, 3.0), (0, MZ + 0.1)], n=18, centre=(0, 0, 0))
B.add('base', low(mound, 'base', 90, lo=0, hi=3, region='dirt'))
B.add('base', low(tk.rbox('rubber', (4.4, 1.0, 0.6), centre=(0, 2.2, MZ - 0.05), bevel=0.2, segs=1), 'rubber', 12, lo=0, hi=2, region='rubber'))

# ------------------------------------------------------------------ the standing leg (on the root), the kicked leg (it strides)
B.add('legs', limb('thigh_l', [(1.8, 0.4, 12.6), (2.0, -0.4, 7.8)], [2.2, 1.8], tris=24, region='uni', n=8, cap1='flat'))
B.add('legs', limb('shin_l', [(2.0, -0.4, 8.2), (1.9, 0.4, MZ + 1.6)], [1.5, 1.2], tris=18, region='sock', n=6))
B.add('legs', shoe('shoe_l', (1.9, 1.6, MZ - 0.1), (0.25, -1, 0), L=4.8, W=2.7, H=2.0, region='shoe', tris=28))
KN, AN = V3(-2.6, -4.6, 15.4), V3(-2.9, -4.0, 10.8)
B.add('leg_r', limb('thigh_r', [(-1.8, 0.4, 12.6), KN], [2.2, 1.8], tris=24, region='uni', n=8),
      limb('shin_r', [KN + (0, 0.2, -0.4), AN], [1.5, 1.2], tris=18, region='sock', n=6),
      limb('shoe_r', [AN + (0, 0.6, 0.2), AN + (-0.1, -1.6, -0.9), AN + (-0.1, -3.2, -1.2)], [1.3, 1.25, 1.0], tris=18, region='shoe', n=8))

# ------------------------------------------------------------------ the body: jersey with its belt, the curled tail
TORSO = [dict(c=(0, 0.4, 11.6), w=7.0, h=3.0), dict(c=(0, 0.4, 15.2), w=6.4, h=2.8), dict(c=(0, 0.6, 19.4), w=7.8, ht=3.0, hb=3.1, e=2.4),
         dict(c=(0, 0.6, 21.0), w=4.2, h=2.0)]
B.add('body', low(tk.loft('torso', TORSO, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 170, lo=1, hi=3,
                  region=('uni', [('belt', lambda C, N: (C[:, 2] > 12.4) & (C[:, 2] < 13.4))]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.22 * np.exp(-((V[:, 2] - 12.9) / 0.5) ** 2))))
B.add('body', limb('tail', [(0, 3.2, 13.6), (0, 5.4, 15.4), (0, 5.4, 17.8), (0, 3.8, 18.4), (0, 3.2, 17.0)], [1.5, 1.6, 1.4, 1.1, 0.6], tris=34, region='fur', n=7,
                   cap1='round'))

# ------------------------------------------------------------------ the arms: the glove up in front; the ball hand cocked back
SL, SR = V3(4.0, 0.6, 20.4), V3(-4.0, 0.6, 20.4)
B.add('body', limb('slv_l', [SL, (5.6, -2.0, 17.8), (3.4, -4.0, 18.8)], [1.6, 1.4, 1.2], tris=16, region='uni', n=7),
      blob('glove', (2.2, -4.9, 19.8), 2.2, tris=34, region='leather', squash=(0.8, 0.55, 1.05)),
      limb('web', [(1.2, -5.2, 21.4), (1.6, -5.0, 22.6)], [0.7, 0.4], tris=6, region='leather', n=5, cap1='round'))
WR = V3(-9.0, 2.0, 24.6)
BALL = WR + (0.1, 0.9, 2.1)
B.add('arm_r', limb('slv_r', [SR, (-8.4, 1.2, 20.6), WR], [1.6, 1.4, 1.1], tris=20, region='uni', n=7),
      *hand('hand_r', WR, (-0.1, 0.3, 1.0), r=1.0, kind='fist', region='fur', up=(1, 0, 0), tris=20))
B.add('ball', blob('ball', BALL, 1.05, tris=20, region='ball'))

# ------------------------------------------------------------------ the head: the shiba, his cap with the ears through it
HC = V3(0, -0.8, 25.6)
head = tk.loft('head', [dict(c=tuple(HC + (0, 2.0, 0.2)), w=6.0, h=3.0), dict(c=tuple(HC), w=7.0, ht=3.2, hb=3.0), dict(c=tuple(HC + (0, -2.8, -0.9)), w=4.6, ht=2.0, hb=2.1),
                        dict(c=tuple(HC + (0, -4.6, -1.2)), w=2.4, ht=1.2, hb=1.2)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
HP = [low(head, 'head', 150, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 1] < HC[1] - 1.4) & (C[:, 2] < HC[2] - 0.5))])),
      blob('nose', HC + (0, -5.6, -0.9), 0.55, tris=8, region='nose'),
      limb('neck', [(0, 0.6, 20.6), HC + (0, 0.8, -2.2)], 1.8, tris=8, region='fur', n=6)]
for sx in (1, -1):
    HP.append(ear('ear', HC + (sx * 2.3, 0.6, 3.0), HC + (sx * 3.3, 1.2, 6.8), 2.8, th=0.9, region='ear', tris=14, cup=(sx * 0.2, -1, 0.1)))
HP.append(low(tk.lathe('cap', [(0, 0), (3.6, 0), (3.5, 1.4), (2.6, 2.6), (0, 3.0)], n=12, centre=tuple(HC + (0, 0.4, 2.0))), 'cap', 40, lo=1, hi=2, region='cap'))
HP.append(low(tk.loft('bill', [dict(c=tuple(HC + (0, -2.8, 2.3)), w=5.8, h=0.25), dict(c=tuple(HC + (0, -5.4, 1.9)), w=4.2, h=0.2)], n=8, up=(0, 0, 1),
                      cap0='flat', cap1='round', capd=0.8), 'bill', 16, lo=1, hi=2, region='capbill'))
B.add('head', *HP)
B.commit(F, bones={'base': 'root', 'legs': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pitch)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0.4, 12.6), parent='root')
    R.bone('leg_r', (-1.8, 0.4, 12.6), parent='body')
    R.bone('head', (0, 0.6, 20.8), parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('ball', tuple(BALL), parent='arm_r')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'leg_r', 'head', 'arm_r', 'ball']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # coil: the knee higher, the arm further back
        k('leg_r', 10, rot=('X', -12))
        k('arm_r', 10, rot=('X', -14))
        k('body', 10, rot=('X', -5))
        # the stride and the throw: the leg drops forward, he lunges, the arm whips over the top
        k('leg_r', 18, rot=('X', 46), ease='QUAD')
        k('body', 18, rot=('X', 14), ease='QUAD')
        k('arm_r', 14, rot=('X', -14))
        k('arm_r', 22, rot=('X', 150), ease='QUAD')
        k('head', 14)
        k('head', 20, rot=('X', 8))
        # the ball leaves the hand at the top of the swing and flies on toward you, then is gone
        k('ball', 18)
        k('ball', 34, move=(0, -36.0, 4.0), ease='LINEAR')
        k('ball', 35, move=(0, -36.0, 4.0), scale=0.01, ease='CONSTANT')
        k('ball', 62, scale=0.01, ease='CONSTANT')
        k('ball', 63, scale=0.01)
        k('ball', 72, ease='BACK')
        # the follow-through holds, then back to the top of the wind-up
        k('leg_r', 46, rot=('X', 46))
        k('body', 46, rot=('X', 14))
        k('arm_r', 46, rot=('X', 150))
        k('head', 46, rot=('X', 8))
        for b in ('root', 'body', 'leg_r', 'head', 'arm_r'):
            k(b, 66)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('dirt', pt.ramp('#b07a4a', 7, shift=0.06), tone=sh, base=0.05, brush={'preset': 'pvc', 'flow': 'around'})
    P.tint(P.region('dirt') & (P.on[:, :, 2] < 0.6), pt.ramp('#5a7a3a', 6, shift=0.06), sh)                    # the grass round the mound's foot
    P.fill('rubber', pt.ramp('#f2efe6', 5), tone=sh, base=0.2)
    P.fill('fur', pt.ramp('#d08a42', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('ear', pt.ramp('#d08a42', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill(P.region('ear') & (P.on[:, :, 1] < -0.4), pt.ramp('#f2e2c8', 6), tone=sh, base=0.2)
    P.fill('cream', pt.ramp('#f4e6cc', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill(P.region('fur') & (Z < 19.2) & (Z > 16) & (Yc > 3.4), pt.ramp('#f4e6cc', 6), tone=sh, base=0.2, brush='fur')   # the pale under the tail curl
    P.fill('nose', pt.ramp('#2a2224', 5, light=0.6), tone=sh, base=0.3)
    UNI = pt.ramp('#efe8d6', 6, shift=0.04)
    P.fill('uni', UNI, tone=sh, base=0.15, brush='cloth')
    P.tint(P.region('uni') & (np.abs(np.mod(X + 0.3 * Yc, 1.3) - 0.65) < 0.07), pt.ramp('#2c3c6a', 5), sh)     # pinstripes
    P.fill(P.region('uni') & (np.abs(X + 2.0) < 0.9) & (np.abs(Z - 18.6) < 0.9) & (Yc < -2), pt.ramp('#c8343a', 5), tone=sh, base=0.15)   # the number patch
    P.fill('belt', pt.ramp('#2c3c6a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('sock', pt.ramp('#2c3c6a', 6, shift=0.05), tone=sh, base=0.1)
    P.tint(P.region('sock') & (np.abs(np.mod(Z, 3.0) - 1.5) < 0.25), pt.ramp('#c8343a', 5), sh)
    P.fill('shoe', pt.ramp('#26242a', 6, shift=0.04, light=0.6), tone=sh, base=0.1, brush='gloss')
    P.fill('cap', pt.ramp('#2c3c6a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('capbill', pt.ramp('#2c3c6a', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('leather', pt.ramp('#a0602e', 7, shift=0.07), tone=sh, base=0.1, brush='gloss')
    P.fill('ball', pt.ramp('#f6f3ea', 5, shift=0.03), tone=sh, base=0.25)
    bl = P.region('ball')
    P.flat(bl & (np.abs(np.hypot(X - BALL[0] - 0.9, Z - BALL[2]) - 1.1) < 0.09), '#c8343a')                    # the seam
    fc = face.Face(P, c=tuple(HC + (0, -4.2, 0.0)), axis=(0, -1, 0.15), where=P.region('fur') | P.region('cream'), seed=1231)
    fc.eyes('dot', spread=4.0, size=0.42, dy=0.8, uneven=0.2)
    fc.brows('angry', spread=4.4, dy=1.7, w=1.4, weight=0.32)
    fc.mouth('smug', w=1.6, dy=-1.3, weight=0.24)
    P.lines(['uni', 'belt', 'sock', 'cap'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('ball', 'arm_r'), ('leg_r', 'body'), ('leg_r', 'legs'), ('body', 'legs'),
                                         ('ball', 'body'), ('ball', 'head'), ('arm_r', 'head'), ('ball', 'leg_r'), ('arm_r', 'leg_r'), ('leg_r', 'base')],
    fold=(0, 10, 22, 50))
