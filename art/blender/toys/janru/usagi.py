"""まほう少女ウサギ Magical-Girl Rabbit (series janru, concepts_E.md): the magical-girl genre, our own: a white rabbit
in a pink frilled dress with a big red chest ribbon, puffed sleeves and white boots, on a little round stage; one
long ear up, one flopped, her star wand raised high, her other hand flung out in the pose.
Gimmick (transform + light-up): she waves the wand in a circle, the star spins and its hidden rays burst open round
it, and the star lights up (series data `light`); then it folds shut again.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/usagi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'usagi')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the stage; boots and legs
B.add('body', plinth(r=13.2, h=GZ, n=16, region='stage', tris=70))
for sx, heel, d in ((1, (2.4, 1.0, GZ), (0.2, -1, 0)), (-1, (-2.4, 1.8, GZ), (-0.25, -1, 0))):
    B.add('body', shoe('boot', heel, d, L=4.8, W=2.8, H=2.4, region='boot', tris=30))
    B.add('body', limb('shaft', [(heel[0] + sx * 0.2, heel[1] - 1.4, GZ + 1.6), (heel[0] + sx * 0.1, heel[1] - 1.2, 8.2)], [1.55, 1.7], tris=16, region='boot', n=8,
                       cap1='flat'))
    B.add('body', limb('leg', [(heel[0] + sx * 0.1, heel[1] - 1.2, 8.0), (sx * 2.0, 0.2, 12.4)], [1.3, 1.5], tris=12, region='fur', n=6))

# ------------------------------------------------------------------ the bell skirt with its frill; the bodice, sleeves, the chest ribbon


def ruffle(h):
    tk.push(h, lambda V, N: 0.28 * np.sin(np.arctan2(V[:, 1], V[:, 0]) * 9.0) * tk.smoothstep(15.0, 11.0, V[:, 2]))


skirt = tk.lathe('skirt', [(0, 10.4), (7.4, 10.4), (7.8, 11.0), (6.6, 12.6), (4.8, 14.6), (3.4, 16.0), (0, 16.2)], n=16, centre=(0, 0.2, 0))
B.add('body', low(skirt, 'skirt', 120, lo=1, hi=2, sculpt=ruffle, region=('skirt', [('frill', lambda C, N: C[:, 2] < 11.6)])))
TORSO = [dict(c=(0, 0.2, 15.2), w=6.4, h=2.8), dict(c=(0, 0.2, 18.2), w=5.8, h=2.6), dict(c=(0, 0.2, 21.2), w=7.0, ht=2.8, hb=2.9), dict(c=(0, 0.2, 22.8), w=3.6, h=1.8)]
B.add('body', low(tk.loft('torso', TORSO, n=10, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 70, lo=1, hi=2,
                  region=('dress', [('collar', lambda C, N: C[:, 2] > 21.8)])))
for sx in (1, -1):
    B.add('body', blob('sleeve', (sx * 4.0, 0.2, 21.0), 2.0, tris=18, region='dress', squash=(1.0, 1.0, 0.9)))
    B.add('body', blob('bow', (sx * 2.0, -2.9, 19.8), 1.6, tris=14, region='ribbon', squash=(1.2, 0.5, 0.75)))
    B.add('body', limb('btail', [(sx * 0.4, -2.9, 19.2), (sx * 1.2, -3.2, 17.4), (sx * 1.8, -3.6, 15.8)], [0.55, 0.5, 0.45], tris=8, region='ribbon', n=5,
                       cap1='flat'))
B.add('body', blob('knot', (0, -3.1, 19.8), 0.8, tris=10, region='gem2'))

# ------------------------------------------------------------------ the right arm raised with the wand; the left flung out
SR, SL = V3(-4.2, 0.2, 21.4), V3(4.2, 0.2, 21.4)
ER, WR = V3(-6.6, -1.0, 25.0), V3(-6.8, -1.6, 28.6)
ST = V3(-7.0, -2.2, 36.6)
B.add('arm_r', limb('arm_r', [SR, ER, WR], [1.2, 1.0, 0.95], tris=16, region='fur', n=6),
      *hand('hand_r', WR, (0.0, -0.1, 1.0), r=1.1, kind='fist', region='glove', up=(0, -1, 0), tris=18),
      limb('wand', [WR + (0, -0.3, -1.2), WR + (0, -0.4, 2.8), ST + (0, 0, -1.6)], [0.42, 0.42, 0.5], tris=12, region='wand', n=6),
      blob('cuff', ST + (0, 0, -1.8), 0.8, tris=8, region='wandgold', squash=(1, 1, 0.6)))
WL = V3(9.4, -1.4, 21.4)
B.add('arm_l', limb('arm_l', [SL, (7.2, -0.6, 19.6), WL], [1.2, 1.0, 0.95], tris=14, region='fur', n=6),
      *hand('hand_l', WL, (0.6, -0.3, 0.75), r=1.1, kind='open', region='glove', up=(0, -1, 0), tris=18))


# the star (a fat five-point star facing you, a gem in its heart) and its rays, tucked behind it until it opens
def star_pts(ro, ri, a0=90.0):
    return [((ro if i % 2 == 0 else ri) * math.cos(math.radians(a0 + 36 * i)), (ro if i % 2 == 0 else ri) * math.sin(math.radians(a0 + 36 * i)))
            for i in range(10)]


star = tk.slab('star', star_pts(3.0, 1.35), 1.2, plane='XZ', at=0.0, bevel=0.35, segs=1)
tk.move(star, tuple(ST))
B.add('star', low(star, 'star', 50, lo=1, hi=2, region='star'), blob('gem', ST + (0, -0.6, 0), 0.9, tris=12, region='gem', squash=(1, 0.6, 1)))
RAYS = []
for i in range(5):
    a = math.radians(90 + 36 + 72 * i)
    d = V3(math.cos(a), 0, math.sin(a))
    RAYS.append(limb('ray', [ST + d * 1.0 + (0, 0.7, 0), ST + d * 2.9 + (0, 0.7, 0)], [0.45, 0.05], tris=6, region='ray', n=4, cap1='point'))
B.add('rays', *RAYS)

# ------------------------------------------------------------------ the head: round, a small muzzle, one ear up, one flopped, a hair bow
HC = V3(0, -0.6, 27.0)
head = tk.loft('head', [dict(c=tuple(HC + (0, 2.2, 0.4)), w=6.2, h=3.2), dict(c=tuple(HC), w=7.6, ht=3.8, hb=3.3), dict(c=tuple(HC + (0, -2.6, -0.8)), w=5.4, ht=2.4, hb=2.3)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.9)
HP = [low(head, 'head', 110, lo=1, hi=3, region=('fur', [('cheek', lambda C, N: (C[:, 1] < HC[1] - 2.4) & (C[:, 2] < HC[2] - 0.2))])),
      blob('nose', HC + (0, -4.3, -0.5), 0.45, tris=8, region='nose', squash=(1.2, 0.8, 0.8)),
      limb('neck', [(0, 0.2, 22.4), HC + (0, 0.6, -2.4)], 1.6, tris=8, region='fur', n=6)]


def rear(name, pts, ws, tris):
    """A long rabbit ear: a flat leaf loft along a (bent) spine, rounded at the tip."""
    return low(tk.loft(name, [dict(c=tuple(HC + p), w=w, h=0.55) for p, w in zip(pts, ws)], n=8, up=(0, -1, 0), cap0='round', cap1='round', capd=0.6),
               name, tris, region='ear')


HP.append(rear('ear_l', [(1.6, 0.8, 3.0), (2.2, 1.1, 7.0), (2.8, 1.4, 11.0), (3.0, 1.5, 13.0)], [2.2, 3.2, 2.8, 1.4], 22))
HP.append(rear('ear_r', [(-1.6, 0.8, 3.0), (-2.4, 1.1, 6.6), (-3.4, 1.3, 8.6), (-5.4, 1.6, 8.2), (-7.0, 1.8, 6.6)], [2.2, 3.0, 2.9, 2.6, 1.2], 24))
for sx in (1, -1):
    HP.append(blob('hbow', HC + (sx * 1.3, -0.2, 3.9), 1.0, tris=10, region='ribbon', squash=(1.1, 0.5, 0.8)))
B.add('head', *HP)
B.commit(F, kinds={'star': 'led', 'rays': 'led'})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', (0, 0.2, 22.6), parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    R.bone('star', tuple(ST), parent='arm_r', length=2.0, tail=tuple(ST + (0, -2.0, 0)))
    R.bone('rays', tuple(ST), parent='star', length=2.0, tail=tuple(ST + (0, -2.0, 0)))
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'star', 'rays']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # the wand circles (a little loop of the arm), the star spins round and its rays burst open; she bobs
        for i, f in enumerate((6, 12, 18, 24)):
            k('arm_r', f, rot=[('Y', 10 * math.cos(i * math.pi / 2)), ('X', 10 * math.sin(i * math.pi / 2))], ease='LINEAR')
        k('arm_r', 32, rot=('Y', -8), ease='BACK')
        k('arm_r', 66, rot=('Y', -8))
        k('arm_r', 76)
        k('star', 4)
        k('star', 30, rot=('Y', 720), ease='QUAD')
        k('star', 76, rot=('Y', 720))
        k('rays', 26, scale=(1.0, 1.0, 1.0))
        k('rays', 34, scale=(2.3, 1.0, 2.3), ease='BACK')
        k('rays', 66, scale=(2.3, 1.0, 2.3))
        k('rays', 74)
        k('body', 26)
        k('body', 32, move=(0, 0, 0.8), ease='BACK')
        k('body', 40)
        k('head', 28)
        k('head', 34, rot=('Y', -8), ease='BACK')
        k('head', 66, rot=('Y', -8))
        k('head', 74)
        k('arm_l', 28)
        k('arm_l', 34, rot=('Y', 14), ease='BACK')
        k('arm_l', 66, rot=('Y', 14))
        k('arm_l', 74)
        for b in allb:
            k(b, 80)
        k('star', 80, rot=('Y', 720))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stage', pt.ramp('#c87a8a', 6, shift=0.05), tone=sh, base=0.05, brush='wood')
    stg = P.region('stage') & (P.on[:, :, 2] > 0.5)
    P.shift(stg & (np.abs(np.mod(X, 2.6) - 1.3) < 0.07), -2)                                   # the boards
    th = np.arctan2(Yc, X)
    P.tint(P.region('stage') & (P.on[:, :, 2] < 0.5) & (np.mod(th * 16 / math.pi, 2) < 1), pt.ramp('#f2e8d0', 5), sh)   # the scalloped rim
    P.fill('fur', pt.ramp('#f4efe6', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill('cheek', pt.ramp('#fbf6ee', 6, shift=0.03), tone=sh, base=0.25, brush='fur')
    P.fill('ear', pt.ramp('#f4efe6', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill(P.region('ear') & (P.on[:, :, 1] < -0.4), pt.ramp('#f2a8b8', 6, shift=0.05), tone=sh, base=0.2)
    P.fill('nose', pt.ramp('#e0708a', 5), tone=sh, base=0.2)
    P.fill('dress', pt.ramp('#e87aa8', 7, shift=0.06), tone=sh, base=0.1)
    P.fill('skirt', pt.ramp('#e87aa8', 7, shift=0.06), tone=sh, base=0.1)
    P.tint(P.region('skirt') & (np.abs(np.mod(Z, 1.4) - 0.7) < 0.12) & (Z < 13.0), pt.ramp('#f6d0de', 5), sh)
    P.fill('frill', pt.ramp('#fbf4f0', 6, shift=0.03), tone=sh, base=0.2)
    P.fill('collar', pt.ramp('#fbf4f0', 6, shift=0.03), tone=sh, base=0.2)
    P.fill('ribbon', pt.ramp('#d8344e', 7, shift=0.06), tone=sh, base=0.1, brush='gloss')
    P.fill('gem2', pt.ramp('#ffd860', 5, light=0.6), tone=sh, base=0.25, brush='gloss')
    P.fill('boot', pt.ramp('#f6f0ea', 6, shift=0.04), tone=sh, base=0.15, brush='gloss')
    P.tint(P.region('boot') & (Z > 7.2) & (Z < 8.6), pt.ramp('#e87aa8', 5), sh)
    P.fill('glove', pt.ramp('#fbf8f2', 6, shift=0.03), tone=sh, base=0.25)
    P.fill('wand', pt.ramp('#f2a8c8', 6, shift=0.05), tone=sh, base=0.2, brush='gloss')
    P.tint(P.region('wand') & (np.abs(np.mod(Z + X, 1.2) - 0.6) < 0.16), pt.ramp('#fff4f8', 5), sh)   # the candy stripe
    P.fill('wandgold', pt.ramp('#d6a640', 6, dark=0.6, light=0.6), tone=sh, base=0.2)
    P.fill('star', pt.ramp('#ffd860', 6, shift=0.06, light=0.6), tone=sh, base=0.25, brush='gloss')
    P.fill('ray', pt.ramp('#ffe9a0', 5, light=0.6), tone=sh, base=0.3)
    P.fill('gem', pt.ramp('#f070a8', 5, light=0.6), tone=sh, base=0.3, brush='gloss')
    fc = face.Face(P, c=tuple(HC + (0, -3.6, -0.4)), axis=(0, -1, 0.1), where=P.region('fur') | P.region('cheek'), seed=1211)
    fc.eyes('dot', spread=3.4, size=0.42, dy=0.5, uneven=0.2)
    fc.mouth('w', w=1.0, dy=-1.2, weight=0.2)
    fc.blush(4.4, -0.4, rx=0.8, ry=0.45)
    P.lines(['dress', 'skirt', 'ribbon', 'boot'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('star', 'arm_r'), ('rays', 'arm_r'), ('rays', 'star'),
                                         ('arm_r', 'head'), ('star', 'head'), ('rays', 'head')],
    fold=(0, 18, 34, 60))
