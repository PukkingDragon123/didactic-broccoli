"""カンガルー Bush Hat Kangaroo (series okuni, National Animal Parade; Australia): a red kangaroo standing up on its
long hind feet and thick tail, a slouch bush hat (its ears through the brim) strung with dangling corks, a wooden
boomerang in one paw and a joey peeking out of the pouch.
Gimmick: a big hop; up pops the joey.

    tools/blender.sh art/blender/toys/okuni/kangaru.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _okuni import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('okuni', 'kangaru')
B = Build()
# ------------------------------------------------------------------ feet, haunches, tail
for sx in (1, -1):
    B.add('body', shoe('foot', (sx * 3.0, 3.4, 0.0), (sx * 0.08, -1, 0), L=10.4, W=3.2, H=2.0, region='fur', tris=36, toe_up=0.2))
    B.add('body', blob('thigh', (sx * 3.5, 1.6, 5.2), 4.0, tris=48, region='fur', squash=(0.75, 1.15, 1.05)))
tl = limb('tail', [(0, 3.8, 6.0), (0, 7.4, 3.0), (0, 10.8, 1.2), (0, 13.6, 0.8)], [2.7, 2.2, 1.5, 0.8], tris=44, region='fur', n=8)
for o in tl:
    tk.flat_bottom(o, 0.75)
B.add('body', tl)
# ------------------------------------------------------------------ the body: pear-shaped, leaning a little forward; the pouch
BODY = [dict(c=(0, 1.6, 3.6), w=9.4, h=4.2), dict(c=(0, 0.9, 8.0), w=10.8, ht=5.0, hb=4.4), dict(c=(0, -0.2, 13.0), w=9.2, ht=4.4, hb=3.8),
        dict(c=(0, -0.8, 17.4), w=7.4, h=3.4), dict(c=(0, -1.0, 20.4), w=5.0, h=2.6)]


def pouch(h):
    tk.push(h, lambda V, N: tk.bump(V, (0, -5.0, 9.4), 4.0, 0.5) - 0.5 * np.exp(-((V[:, 2] - 11.0) / 0.35) ** 2) * (np.abs(V[:, 0]) < 3.0) * (V[:, 1] < -3.5))


B.add('body', low(tk.loft('body', BODY, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 150, lo=1, hi=3, sculpt=pouch,
                  region=('fur', [('belly', lambda C, N: (N[:, 1] < -0.35) & (C[:, 2] > 3.5) & (C[:, 2] < 18.5))])))
B.add('body', limb('lip', [(-3.0, -4.0, 11.2), (0, -5.3, 11.0), (3.0, -4.0, 11.2)], 0.55, tris=16, region='belly', n=6))
# ------------------------------------------------------------------ the joey in the pouch
JC = (0.0, -4.8, 12.4)
jh = tk.loft('joey', [dict(c=(0, -3.8, 12.6), w=2.8, h=1.3), dict(c=(0, -4.8, 12.8), w=3.2, h=1.6), dict(c=(0, -6.2, 12.4), w=1.8, h=1.0)],
             n=8, up=(0, 0, 1), cap0='round', cap1='round')
B.add('joey', low(jh, 'joey', 40, region='joey'))
for sx in (1, -1):
    B.add('joey', ear('jear', (sx * 0.9, -4.2, 13.8), (sx * 1.5, -3.8, 15.6), 1.1, th=0.5, region='joey', tris=12))
# ------------------------------------------------------------------ arms: one holds up the boomerang, one rests on the pouch
SR, SL = V3(-3.4, -1.8, 18.0), V3(3.4, -1.8, 18.0)
B.add('arm_r', limb('arm_r', [SR, (-4.8, -4.4, 15.6), (-3.8, -6.6, 16.4)], [1.25, 1.0, 0.9], tris=24, region='fur', n=6))
B.add('arm_r', blob('paw_r', (-3.6, -7.3, 16.6), 1.05, tris=16, region='fur', squash=(1, 1.2, 1)))
BM = [(0, 0), (4.6, 2.4), (5.1, 1.6), (0.7, -0.9), (-0.7, -0.9), (-5.1, 1.6), (-4.6, 2.4)]
B.add('arm_r', slabp('boom', BM, 0.7, 'wood', plane='XZ', move=(-3.6, -7.6, 17.2), rot=[(-20, 'Y', (0, 0, 0)), (15, 'X', (0, 0, 0))]))
B.add('arm_l', limb('arm_l', [SL, (4.6, -4.2, 15.2), (2.6, -5.4, 13.0)], [1.25, 1.0, 0.9], tris=24, region='fur', n=6))
B.add('arm_l', blob('paw_l', (2.2, -5.8, 12.4), 1.05, tris=16, region='fur', squash=(1.2, 1, 0.9)))
# ------------------------------------------------------------------ the head: long and deer-like, tall ears through the bush hat
NECK = (0, -0.8, 20.0)
B.add('head', limb('neck', [NECK, (0, -1.0, 23.6)], 2.3, tris=16, region='fur', n=8))
hd = tk.loft('head', [dict(c=(0, 0.6, 24.8), w=5.0, h=2.4), dict(c=(0, -1.4, 24.8), w=6.0, ht=2.9, hb=2.6), dict(c=(0, -3.8, 24.2), w=4.4, ht=2.0, hb=2.0),
                      dict(c=(0, -5.8, 23.6), w=3.0, ht=1.5, hb=1.5)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
B.add('head', low(hd, 'head', 96, region=('fur', [('muzzle', lambda C, N: (C[:, 1] < -3.4) & (C[:, 2] < 23.8)),
                                                   ('nose', lambda C, N: (C[:, 1] < -6.2) & (C[:, 2] > 23.4))])))
for sx in (1, -1):
    B.add('head', ear('ear', (sx * 2.6, 0.0, 26.2), (sx * 4.4, 1.0, 31.2), 2.3, th=0.9, region='fur', tris=16, cup=(0, -1, 0)))
HAT = (0, -1.0, 27.0)
brim = tk.lathe('brim', [(0, 0), (5.8, 0), (5.9, 0.35), (0, 0.5)], n=16, centre=HAT)
crown = tk.lathe('crown', [(0, 0), (3.5, 0), (3.4, 2.2), (2.8, 2.9), (0, 2.6)], n=12, centre=(0, -1.0, 27.2))
for o in (brim, crown):
    tk.rotate(o, -7, 'X', pivot=HAT)
B.add('head', low(brim, 'brim', 40, lo=1, hi=2, region='hat', sculpt=lambda h: tk.deform(h, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], 0.5 * np.clip((np.abs(V[:, 0]) - 3.5) / 2.4, 0, 1) ** 2], 1))))
B.add('head', low(crown, 'crown', 40, region=('hat', [('band', lambda C, N: C[:, 2] < 28.0)])))
CORKS = []
for a in (-150, -115, -65, -30):
    ca = math.radians(a)
    top = (5.4 * math.cos(ca), -1.0 + 5.4 * math.sin(ca), 27.1 - 0.7 * math.sin(ca))
    bot = (top[0], top[1], top[2] - 2.4)
    B.add('head', limb('string', [top, bot], 0.16, tris=8, region='string', n=4))
    B.add('head', blob('cork', (bot[0], bot[1], bot[2] - 0.5), 0.55, tris=12, region='cork', squash=(0.85, 0.85, 1.25)))
B.commit(F, bones={'body': 'body', 'joey': 'joey', 'arm_r': 'arm_r', 'arm_l': 'arm_l', 'head': 'head'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 1.0, 5.0), parent='root')
    R.bone('joey', JC, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    R.bone('head', NECK, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'joey', 'arm_r', 'arm_l', 'head']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('root', 4)
        k('root', 8, move=(0, 0, -0.6), scale=(1.0, 0.92, 1.0))   # the crouch
        k('root', 16, move=(0, -1.0, 7.5), rot=('X', -6), ease=('QUAD', 'EASE_OUT'))
        k('root', 24, move=(0, -0.4, 0.2), rot=('X', 2), ease=('QUAD', 'EASE_IN'))
        k('root', 27, move=(0, 0, -0.4), scale=(1.0, 0.94, 1.0))
        k('root', 32, ease='BACK')
        k('head', 8, rot=('X', 6))
        k('head', 16, rot=('X', -10))
        k('head', 27, rot=('X', 8))
        k('head', 34)
        k('joey', 16)
        k('joey', 22, move=(0, -0.4, 2.6), rot=('Z', 15), ease='BACK')
        k('joey', 40, move=(0, -0.4, 2.6), rot=('Z', -15))
        k('joey', 48)
        for nm, sx in (('arm_r', -1), ('arm_l', 1)):
            k(nm, 8)
            k(nm, 16, rot=('Y', sx * 18))
            k(nm, 28)
        k('arm_r', 36, rot=('X', -25))
        k('arm_r', 46)
        for b in allb:
            k(b, 56)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('fur', pt.ramp('#b4643a', 7, shift=0.07), tone=sh, base=0.05, brush='fur')
    P.fill('belly', pt.ramp('#ecd6b4', 6, shift=0.05), tone=sh, base=0.15, brush='fur')
    P.fill('muzzle', pt.ramp('#e6cca8', 6, shift=0.05), tone=sh, base=0.15, brush='fur')
    P.fill('nose', pt.ramp('#3a2a26', 5), tone=sh, base=0.15)
    P.fill('joey', pt.ramp('#c8804e', 6, shift=0.06), tone=sh, base=0.15, brush='fur')
    P.fill('hat', pt.ramp('#8c7a50', 6, shift=0.05), tone=sh, base=0.1, brush='cloth')
    P.fill('band', pt.ramp('#4a3a28', 5, shift=0.04), tone=sh, base=0.05)
    P.fill('cork', pt.ramp('#c8a070', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('string', pt.ramp('#3a3020', 4), tone=sh, base=0.1, brush=False)
    P.fill('wood', pt.ramp('#9a5a2a', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0), 'L': 4})
    P.fill(P.region('wood') & bands(X + Z, 1.6, 0.35), pt.ramp('#e8d2a0', 5), tone=sh, base=0.1, brush=False)
    fc = face.Face(P, c=(0, -4.6, 25.2), axis=(0, -1, 0.25), where=P.region('fur') | P.region('muzzle') | P.region('nose'), seed=611)
    fc.eyes('dot', spread=3.6, size=0.55, dy=0.5)
    fc.mouth('upturn', w=2.0, dy=-1.8, weight=0.3)
    fj = face.Face(P, c=(0, -6.2, 12.6), axis=(0, -1, 0.1), where=P.region('joey'), seed=612)
    fj.species('kangaroo')
    fj.eyes('dot', spread=1.7, size=0.32, dy=0.3)
    P.lines(['hat', 'band', 'belly'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=56, skip=[('joey', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('head', 'body'), ('arm_l', 'joey'), ('arm_r', 'head')])
