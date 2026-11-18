"""裏の隣人ヤモリ The Quiet Neighbour (series minato, secret; concepts_E.md): a neat salaryman gecko in a white
short-sleeved shirt, a striped tie and grey slacks, watering his potted morning glory from a tin can and giving you a
polite little wave, a pleasant closed-eye smile. Nothing odd about him at all.
Gimmick: the watering stops; his head turns slowly right round: on the back of it is a second face, wide-eyed and
grinning. It holds, and turns back.

    GG_FACET=1 tools/blender.sh art/blender/toys/minato/yamori.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('minato', 'yamori')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the cobbles, his flower pot and morning glory, neat shoes, the tail
B.add('body', cobbles(seed=13))
POT = V3(-8.0, -4.6, GZ - 0.2)
B.add('body', low(tk.lathe('pot', [(0, 0), (2.4, 0), (3.2, 3.4), (3.5, 3.6), (3.4, 4.2), (0, 4.0)], n=10, centre=tuple(POT)), 'pot', 30, lo=0, hi=2,
                  region=('pot', [('soil', lambda C, N: (N[:, 2] > 0.6) & (C[:, 2] > POT[2] + 3.9))])))
B.add('body', limb('stake', [POT + (0, 0, 3.8), POT + (0.2, 0.2, 11.6)], 0.3, tris=6, region='bamboo', n=4))
B.add('body', limb('vine', [POT + (0.6, 0, 4.0), POT + (-0.6, -0.4, 6.0), POT + (0.6, 0.4, 8.0), POT + (-0.4, 0.0, 10.2), POT + (0.2, -0.2, 11.8)], 0.25,
                   tris=14, region='leaf', n=4))
for i, (dx, dz, a) in enumerate(((1.4, 5.6, 30), (-1.6, 7.4, -20), (1.4, 9.4, 40))):
    lf = tk.slab('leaf', [(0, 0), (1.0, 0.8), (1.0, 2.0), (0, 2.6), (-1.0, 2.0), (-1.0, 0.8)], 0.3, plane='XZ', at=0.0, bevel=0.1, segs=0)
    tk.rotate(lf, a - 90 * np.sign(dx), 'Y')
    tk.move(lf, tuple(POT + (dx * 0.3, 0, dz)))
    B.add('body', low(lf, 'leaf', 10, lo=0, hi=1, region='leaf'))
fl = tk.lathe('flower', [(0, -0.2), (0.4, -0.2), (1.6, 0.7), (1.8, 1.0), (0, 0.5)], n=8, centre=(0, 0, 0))
tk.rotate(fl, -70, 'X')
tk.move(fl, tuple(POT + (0.4, -0.8, 11.0)))
B.add('body', low(fl, 'flower', 14, lo=0, hi=1, region='petal'))
for sx in (1, -1):
    B.add('body', shoe('shoe', (sx * 2.0, 0.8, GZ - 0.2), (sx * 0.08, -1, 0), L=5.6, W=2.8, H=2.0, region='shoe'))
    B.add('body', limb('leg', [(sx * 2.0, 0.0, GZ + 1.6), (sx * 2.2, 0.4, 14.6)], [1.8, 2.3], tris=16, region='slacks', n=8))
B.add('body', limb('tail', [(0, 3.4, 13.0), (0, 7.0, 8.4), (2.0, 10.0, 4.2), (5.4, 10.0, 3.6), (7.6, 7.6, 3.4), (7.4, 5.6, 3.3)],
                   [2.0, 1.8, 1.4, 1.0, 0.7, 0.3], tris=30, region='skin', n=6, cap1='point'))

# ------------------------------------------------------------------ the slim body: shirt tucked into the slacks, a belt, the tie
TORSO = [dict(c=(0, 0.4, 13.4), w=8.4, h=3.8), dict(c=(0, 0.2, 16.4), w=8.2, h=3.7), dict(c=(0, 0.0, 20.0), w=9.4, h=3.9),
         dict(c=(0, 0.0, 22.8), w=10.2, ht=3.6, hb=3.6, e=2.5), dict(c=(0, 0.0, 24.4), w=5.6, h=2.8)]
B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 140, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.25 * tk.smoothstep(0.7, 0.3, np.abs(V[:, 2] - 15.4))),
                  region=('shirt', [('slacks', lambda C, N: C[:, 2] < 14.8), ('belt', lambda C, N: C[:, 2] < 16.0)])))
tie = tk.loft('tie', [dict(c=(0, -3.6, 23.8), w=1.2, h=0.4), dict(c=(0, -4.0, 22.6), w=1.0, h=0.4), dict(c=(0, -4.2, 18.4), w=1.8, h=0.4),
                      dict(c=(0, -4.0, 17.0), w=0.4, h=0.3)], n=6, up=(0, -1, 0), cap0='round', cap1='point')
B.add('body', low(tie, 'tie', 18, lo=0, hi=1, region='tie'))
B.add('body', limb('collar', [(-2.8, -1.6, 24.4), (-1.0, -3.4, 23.8), (0, -3.8, 23.6), (1.0, -3.4, 23.8), (2.8, -1.6, 24.4)], 0.7, tris=14, region='shirt', n=5))

# ------------------------------------------------------------------ the arms: the watering can over the pot, a polite little wave
SR, SL = V3(-4.8, 0.0, 22.4), V3(4.8, 0.0, 22.4)
WR = V3(-6.0, -5.6, 17.0)
B.add('arm_r', limb('slv_r', [SR, (-6.0, -1.6, 19.6)], [1.9, 1.7], tris=12, region='shirt', n=8, cap1='flat'))
B.add('arm_r', limb('fore_r', [(-6.0, -1.6, 19.6), WR], [1.1, 1.0], tris=10, region='skin', n=6))
B.add('arm_r', blob('fist_r', WR + (0, -0.4, 0.6), 1.2, tris=10, region='skin'))
CAN = WR + (-0.6, -2.2, -1.6)
can = tk.lathe('can', [(0, -2.0), (2.2, -2.0), (2.4, 1.6), (2.0, 2.0), (0, 2.0)], n=10, centre=(0, 0, 0))
spout = tk.tube('spout', [(-1.8, 0, -0.8), (-4.6, 0, 1.0), (-6.0, 0, 2.2)], [0.6, 0.45, 0.4], n=6, cap0='round', cap1='round')
rose = tk.lathe('rose', [(0, -0.2), (0.4, -0.2), (1.0, 0.4), (0, 0.5)], n=8, centre=(0, 0, 0))
tk.rotate(rose, -60, 'Y')
tk.move(rose, (-6.2, 0, 2.3))
handle = tk.tube('chandle', [(1.6, 0, 2.0), (1.8, 0, 3.6), (0.6, 0, 4.0), (-1.0, 0, 2.0)], 0.4, n=5)
CANP = [low(can, 'can', 30, lo=0, hi=2, region='tin'), low(spout, 'spout', 16, lo=0, hi=1, region='tin'), low(rose, 'rose', 10, lo=0, hi=1, region='tin'),
        low(handle, 'chandle', 12, lo=0, hi=1, region='tin')]
for a, b in CANP:
    for o in (a, b):
        tk.rotate(o, 18, 'Y')
        tk.rotate(o, -40, 'Z')
        tk.move(o, tuple(CAN))
B.add('arm_r', *CANP)
SPR = np.asarray(CAN) + np.array((-6.2 * math.cos(math.radians(18)) * math.cos(math.radians(-40)), -6.2 * math.cos(math.radians(18)) * math.sin(math.radians(-40)),
                                  2.4 + 6.2 * math.sin(math.radians(18)) * 0.2))
WL = V3(8.4, -2.6, 25.2)
B.add('arm_l', limb('slv_l', [SL, (7.2, -0.6, 19.8)], [1.9, 1.7], tris=12, region='shirt', n=8, cap1='flat'))
B.add('arm_l', limb('fore_l', [(7.2, -0.6, 19.8), WL], [1.1, 1.0], tris=10, region='skin', n=6))
B.add('arm_l', *hand('hand_l', WL, (0.05, -0.3, 1), r=1.2, kind='open', region='skin', up=(0, -1, 0)))

# ------------------------------------------------------------------ the head: broad and flat, the bulging eye bumps (a face on each side)
NECK = (0, 0.0, 24.2)
head = tk.loft('head', [dict(c=(0, 3.4, 29.6), w=8.0, h=3.6), dict(c=(0, 0.2, 29.8), w=9.6, ht=4.0, hb=3.6), dict(c=(0, -3.2, 29.2), w=8.4, ht=3.0, hb=3.2),
                        dict(c=(0, -5.4, 28.8), w=6.2, ht=2.2, hb=2.4)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)
HP = [low(head, 'head', 110, lo=1, hi=3, region=('skin', [('throat', lambda C, N: N[:, 2] < -0.5)])), limb('neck', [NECK, (0, 0.2, 28.0)], 2.6, tris=12,
                                                                                                         region='skin', n=8)]
for sx in (1, -1):
    HP.append(blob('eyebump', (sx * 4.2, -1.2, 31.2), 1.7, tris=14, region='skin'))
B.add('head', *HP)
B.commit(F)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # a last polite little wave; the can comes level; then the head turns right round, slowly, and holds
        k('arm_l', 4, rot=('Y', 14))
        k('arm_l', 9, rot=('Y', -10))
        k('arm_l', 14, rot=('Y', 14))
        k('arm_l', 20)
        k('arm_r', 12)
        k('arm_r', 20, rot=('Y', -14))
        k('arm_r', 76, rot=('Y', -14))
        k('arm_r', 84)
        k('head', 18)
        k('head', 32, rot=('Z', 90), ease='LINEAR')
        k('head', 46, rot=('Z', 180), ease=('BACK', 'EASE_OUT'))
        k('head', 72, rot=('Z', 180))
        k('head', 80, rot=('Z', 260), ease='LINEAR')
        k('head', 88, rot=('Z', 360))
        k('head', 89)
        for b in allb:
            k(b, 96)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stone', pt.ramp('#8c8a84', 7, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('stone') & (np.abs(np.mod(X + 0.5 * np.floor(Yc / 2.6) * 2.6, 3.4) - 1.7) < 1.45) & (np.abs(np.mod(Yc, 2.6) - 1.3) < 1.1) & (P.on[:, :, 2] > 0.5),
           pt.ramp('#9c968a', 7, shift=0.05), tone=sh, base=0.05)
    P.fill('pot', pt.ramp('#b0603a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('soil', pt.ramp('#4a3424', 5), tone=sh, base=0.0)
    P.fill('bamboo', pt.ramp('#c9b06a', 5), tone=sh, base=0.1)
    P.fill('leaf', pt.ramp('#4f8a3e', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('petal', pt.ramp('#5a6ad0', 6, shift=0.06), tone=sh, base=0.15)
    SKIN = pt.ramp('#9fb86a', 7, shift=0.06)
    P.fill('skin', SKIN, tone=sh, base=0.1)
    who, d = P.dabs(P.region('skin'), size=0.5, spacing=1.8, seed=41)
    P.shift(P.region('skin') & (who >= 0) & (d < 0.6), -1)                                                   # pebbly gecko skin
    P.fill('throat', pt.ramp('#e3e0b4', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('shirt', pt.ramp('#f2f0ea', 6, shift=0.03), tone=sh, base=0.15)
    P.fill('slacks', pt.ramp('#6a6c72', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('belt', pt.ramp('#2a2426', 5, light=0.6), tone=sh, base=0.1)
    P.fill('tie', pt.ramp('#3a4a6a', 6, shift=0.05), tone=sh, base=0.1)
    P.tint(P.region('tie') & (np.abs(np.mod(Z - 0.6 * X, 1.6) - 0.8) < 0.18), pt.ramp('#c8b070', 5), sh)
    P.fill('shoe', pt.ramp('#1e1c20', 5, light=0.6), tone=sh, base=0.2, brush='gloss')
    P.fill('tin', pt.ramp('#a8b2b0', 6, shift=0.05, light=0.6), tone=sh, base=0.15, brush='metal')
    hd = (P.region('skin') | P.region('throat')) & (Z > 26.5)
    # the face he shows you: closed contented arcs and a pleasant little smile
    fc = face.Face(P, c=(0, -5.8, 30.2), axis=(0, -1, 0.15), where=hd & (Yc < 0), seed=1011)
    fc.eyes('happy', spread=6.6, size=0.6, dy=0.6)
    fc.mouth('upturn', w=3.2, dy=-1.6, weight=0.3)
    # ...and the one on the back of his head: wide staring dots far apart and a huge grin full of teeth
    bk_ = face.Face(P, c=(0, 4.8, 30.2), axis=(0, 1, 0.15), where=hd & (Yc > 1.0), seed=1012)
    bk_.eyes('dot', spread=5.6, size=0.85, dy=0.8, uneven=0.35)
    bk_.mouth('grin', w=5.6, dy=-1.8, weight=0.36, teeth=6)
    P.lines(['shirt', 'tie', 'slacks', 'belt'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=96, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('arm_l', 'head')], fold=(0, 20, 34, 56))
