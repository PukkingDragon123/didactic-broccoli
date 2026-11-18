"""気合いマングース Fighter Mongoose (series janru, concepts_E.md): the fighting genre, our own: a lean mongoose in a
white gi with a black belt and navy cuffs, a spiky dark crest, low in a wide horse stance in a cracked crater, his
cupped hands at his hip with an energy ball charging between them, his long tail laid along the crater floor.
Gimmick (light-up): he twists into the charge, the energy ball swells and pulses with its flames flaring, and it
glows (series data `light`); then it dies down.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/mangusu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'mangusu')
B = Build()
FZ = 1.4   # the crater floor


# ------------------------------------------------------------------ the crater: a dish with a cracked raised rim
def cracks(h):
    def f(V, N):
        a = np.arctan2(V[:, 1], V[:, 0])
        r = np.hypot(V[:, 0], V[:, 1])
        return -0.3 * (np.abs(np.sin(a * 7.0 + r * 0.35)) > 0.97) * (N[:, 2] > 0.3)
    tk.push(h, f)


crater = tk.lathe('base', [(0, 0), (14.0, 0), (14.0, 1.6), (13.2, 3.4), (11.8, 3.2), (9.0, 1.9), (5.0, 1.3), (0, FZ)], n=18, centre=(0, 0, 0))
B.add('base', low(crater, 'base', 110, lo=0, hi=3, region='rock', sculpt=cracks))
for i, (x, y) in enumerate(((11.6, -5.0), (-12.0, 3.6), (4.0, 12.0))):
    B.add('base', blob('rubble', (x, y, 3.2), 1.0 + 0.2 * i, tris=10, region='rock', squash=(1.2, 1.0, 0.7)))

# ------------------------------------------------------------------ the horse stance: thighs out to the knees, shins down to bare feet
for sx in (1, -1):
    HIP, KN, AN = V3(sx * 2.6, 0.6, 12.0), V3(sx * 6.4, -1.4, 8.8), V3(sx * 6.8, -0.4, FZ + 2.6)
    B.add('legs', limb('thigh', [HIP, KN], [2.2, 1.9], tris=18, region='gi', n=8))
    B.add('legs', low(tk.loft('shin', [dict(c=tuple(KN), w=3.8, h=1.9), dict(c=tuple(AN + (0, 0, 0.6)), w=4.4, h=2.1)], n=8, up=(0, -1, 0), cap0='round', cap1='flat'),
                      'shin', 18, lo=1, hi=2, region='gi'))
    B.add('legs', limb('ankle', [AN + (0, 0, 0.8), AN + (0, 0.2, -1.2)], 1.2, tris=8, region='fur', n=6))
    B.add('legs', shoe('foot', (sx * 6.6, 1.2, FZ), (sx * 0.35, -1, 0), L=4.6, W=2.6, H=1.7, region='fur', tris=24, toe_up=0.1))

# ------------------------------------------------------------------ the body: the gi with its open V, the belt and its tails, the tail
TORSO = [dict(c=(0, 0.6, 11.4), w=7.2, h=3.0), dict(c=(0, 0.4, 14.6), w=6.0, h=2.7), dict(c=(0.2, 0.4, 18.6), w=7.6, ht=3.0, hb=3.1, e=2.4),
         dict(c=(0.3, 0.4, 20.4), w=4.0, h=2.0)]


def vneck(C, N):
    return (N[:, 1] < -0.4) & (np.abs(C[:, 0] - 0.2) < 0.2 + 0.55 * (C[:, 2] - 15.4)) & (C[:, 2] > 15.4)


B.add('body', low(tk.loft('torso', TORSO, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 130, lo=1, hi=3,
                  region=('gi', [('belt', lambda C, N: (C[:, 2] > 12.4) & (C[:, 2] < 13.6)), ('cream', vneck)]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.25 * np.exp(-((V[:, 2] - 13.0) / 0.5) ** 2) - 0.2 * vneck(V, N))))
for sx in (1, -1):
    B.add('body', limb('btail', [(sx * 0.8, -3.0, 12.8), (sx * 1.4, -3.4, 11.0), (sx * 1.6, -3.2, 9.6)], [0.5, 0.45, 0.4], tris=8, region='belt', n=5, cap1='flat'))
B.add('body', blob('knot', (0, -3.0, 13.0), 0.8, tris=8, region='belt'))
B.add('body', limb('tail', [(0, 3.2, 12.0), (1.4, 7.0, 9.0), (4.4, 9.6, 5.0), (8.4, 9.2, 3.0), (11.2, 6.8, 2.9)], [1.9, 2.0, 1.7, 1.2, 0.5], tris=40,
                   region='tailfur', n=8, cap1='point', sculpt=lambda h: tk.push(h, lambda V, N: 0.18 * np.sin(V[:, 0] * 3.0 + V[:, 1] * 2.0))))

# ------------------------------------------------------------------ the arms: both hands cupped at his left hip round the ball
SL, SR = V3(4.0, 0.4, 19.4), V3(-3.6, 0.4, 19.4)
BC = V3(6.8, 1.0, 14.2)
WL, WR = V3(6.4, 1.2, 17.4), V3(5.6, -0.2, 11.2)
B.add('arms', limb('slv_l', [SL, (7.4, 3.4, 18.6), WL + (0.2, 0.6, 0.4)], [1.7, 1.5, 1.4], tris=18, region='gi', n=8),
      limb('cuff_l', [WL + (0.2, 0.6, 0.6), WL], 1.2, tris=8, region='cuff', n=6),
      *hand('hand_l', WL, (0.15, 0.0, -1.0), r=1.15, kind='open', region='fur', up=(1, 0, 0), tris=18, curl=0.5))
B.add('arms', limb('slv_r', [SR, (-2.0, -3.6, 14.6), WR + (-1.2, -0.8, 0.0)], [1.7, 1.5, 1.4], tris=18, region='gi', n=8),
      limb('cuff_r', [WR + (-1.2, -0.8, 0.0), WR], 1.2, tris=8, region='cuff', n=6),
      *hand('hand_r', WR, (0.25, 0.1, 1.0), r=1.15, kind='open', region='fur', up=(1, 0, 0), tris=18, curl=0.5))
# the energy ball and its flames
BP = [blob('ball', BC, 1.8, tris=30, region='ki')]
for d in ((1, 0, 0.3), (0.7, -0.6, -0.4), (0.6, 0.7, -0.2), (0.4, -0.3, 0.9), (0.9, 0.4, 0.7)):
    d = np.asarray(d, float) / np.linalg.norm(d)
    BP.append(limb('flame', [BC + d * 1.4, BC + d * 2.9], [0.55, 0.05], tris=6, region='ki2', n=4, cap1='point'))
B.add('ball', *BP)

# ------------------------------------------------------------------ the head: a long low muzzle, small round ears, the spiky crest
HC = V3(0.4, -1.0, 24.6)
head = tk.loft('head', [dict(c=tuple(HC + (0, 2.0, 0.2)), w=5.4, h=2.8), dict(c=tuple(HC), w=6.2, ht=3.0, hb=2.7), dict(c=tuple(HC + (0, -2.8, -0.7)), w=4.0, ht=2.0, hb=1.9),
                        dict(c=tuple(HC + (0, -5.0, -1.2)), w=1.8, ht=1.0, hb=1.0)], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
HP = [low(head, 'head', 100, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 1] < HC[1] - 1.6) & (C[:, 2] < HC[2] - 0.4))])),
      blob('nose', HC + (0, -5.9, -1.0), 0.5, tris=8, region='nose'),
      limb('neck', [(0.3, 0.4, 20.0), HC + (0, 0.8, -2.0)], 1.7, tris=8, region='fur', n=6)]
for sx in (1, -1):
    HP.append(blob('ear', HC + (sx * 2.9, 1.0, 1.8), 1.0, tris=8, region='fur', squash=(0.6, 1.0, 1.0)))
for tip in ((0, -1.2, 7.4), (1.9, 0.6, 6.4), (-1.9, 0.6, 6.4), (0, 2.8, 6.0), (2.8, 2.6, 4.4), (-2.8, 2.6, 4.4), (0, 4.6, 3.6)):
    t = np.asarray(tip)
    HP.append(limb('spike', [HC + t * 0.25 + (0, 0.4, 1.6), HC + t], [1.4, 0.1], tris=8, region='crest', n=5, cap1='point'))
B.add('head', *HP)
B.commit(F, bones={'base': 'root', 'legs': 'root'}, kinds={'ball': 'led'})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0.6, 12.0), parent='root')
    R.bone('head', (0.3, 0.4, 20.2), parent='body')
    R.bone('arms', (0.2, 0.4, 18.6), parent='body')
    R.bone('ball', tuple(BC), parent='arms')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arms', 'ball']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he twists into the charge; the ball swells, pulses, flares; then it dies down
        k('body', 4)
        k('body', 14, rot=('Z', 6), ease='BACK')
        k('body', 64, rot=('Z', 6))
        k('body', 74)
        k('head', 8)
        k('head', 16, rot=[('Z', -10), ('X', -6)], ease='BACK')
        k('head', 64, rot=[('Z', -10), ('X', -6)])
        k('head', 74)
        k('ball', 6)
        k('ball', 20, scale=1.6, ease='BACK')
        for i, f in enumerate(range(26, 60, 6)):
            k('ball', f, scale=1.85 if i % 2 == 0 else 1.6, rot=('Z', 30 * (i + 1)))
        k('ball', 62, scale=1.9, rot=('Z', 220))
        k('ball', 72, rot=('Z', 260))
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('rock', pt.ramp('#8a7c6a', 7, shift=0.06), tone=sh, base=0.05, brush={'preset': 'pvc', 'flow': 'around'})
    r = np.hypot(X, Yc)
    P.tint(P.region('rock') & (r < 8.0) & (P.on[:, :, 2] > 0.5), pt.ramp('#5a4e44', 6, shift=0.05), sh)      # the scorched floor
    P.fill('fur', pt.ramp('#9a7a52', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    P.fill('tailfur', pt.ramp('#9a7a52', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    P.tint(P.region('tailfur') & (np.abs(np.mod(X * 0.7 + Yc * 0.7, 2.2) - 1.1) < 0.25), pt.ramp('#6a5038', 6), sh)   # grizzled bands
    P.fill('cream', pt.ramp('#e6d4b0', 6, shift=0.05), tone=sh, base=0.15, brush='fur')
    P.fill('nose', pt.ramp('#2a2224', 5, light=0.6), tone=sh, base=0.3)
    P.fill('crest', pt.ramp('#3a2a22', 6, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('gi', pt.ramp('#f2efe6', 6, shift=0.03), tone=sh, base=0.15, brush='cloth')
    P.fill('belt', pt.ramp('#26242a', 6, shift=0.04, light=0.6), tone=sh, base=0.1)
    P.fill('cuff', pt.ramp('#2c3c6a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('ki', pt.ramp('#7ad0ff', 6, shift=0.05, light=0.6), tone=sh * 0.5, base=0.3, brush='gloss')
    P.fill('ki2', pt.ramp('#c8f0ff', 5, light=0.6), tone=sh * 0.5, base=0.35)
    fc = face.Face(P, c=tuple(HC + (0, -4.0, 0.2)), axis=(0, -1, 0.2), where=P.region('fur') | P.region('cream'), seed=1221)
    fc.eyes('dot', spread=3.4, size=0.28, dy=0.9, uneven=0.2)
    fc.mouth('shout', w=1.2, dy=-1.0, weight=0.24)
    P.lines(['gi', 'belt', 'cuff'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arms', 'body'), ('ball', 'arms'), ('ball', 'body'), ('body', 'legs'), ('arms', 'legs'),
                                         ('legs', 'base'), ('body', 'base')],
    fold=(0, 14, 30, 62))
