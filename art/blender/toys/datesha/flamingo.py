"""殺し屋フラミンゴ Flamingo Hitman (series datesha, concepts_E.md): the gang's quiet professional, a flamingo in a
pale pink pinstripe suit with a black shirt, white tie and a carnation in his lapel, dark glasses, poised on one long
leg with the other tucked up, his neck in a cool S, wings folded across his chest.
Gimmick (pose change): the wings fling wide open and the head snaps up; he holds it, then folds back.

    GG_FACET=1 tools/blender.sh art/blender/toys/datesha/flamingo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('datesha', 'flamingo')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the plinth; one long leg (the ankle bends backwards), webbed toes, the other tucked
B.add('base', plinth(n=12))
B.add('body', limb('leg', [(0.4, 0.4, GZ + 0.6), (0.4, 0.6, 8.6), (0.6, -0.8, 10.4), (0.6, 1.0, 16.0)], [0.8, 0.75, 0.9, 0.9], tris=20, region='leg', n=6))
for a in (-30, 0, 30):
    d = V3(math.sin(math.radians(a)), -math.cos(math.radians(a)), 0)
    B.add('body', limb('toe', [V3(0.4, 0.2, GZ + 0.5), V3(0.4, 0.2, GZ + 0.5) + d * 3.6], [0.55, 0.3], tris=8, region='leg', n=5))
web = tk.slab('web', [(0.4 + 3.4 * math.sin(math.radians(a)), 0.2 - 3.4 * math.cos(math.radians(a))) for a in (-30, 0, 30)] + [(0.4, 0.2)], 0.25,
              plane='XY', at=GZ + 0.35, bevel=0.0, segs=0)
B.add('body', low(web, 'web', 6, lo=0, hi=0, region='leg'))
B.add('body', limb('leg2', [(-1.6, 0.6, 16.0), (-2.4, -3.0, 13.4), (-1.6, 1.6, 12.2), (-1.2, 2.8, 12.6)], [0.9, 0.8, 0.7, 0.4], tris=16, region='leg', n=6))

# ------------------------------------------------------------------ the oval body in the jacket, the tail plumes; the S-curved neck
BODY = [dict(c=(0, 2.6, 15.8), w=7.6, h=3.6), dict(c=(0, 0.6, 18.6), w=10.4, ht=5.0, hb=5.4), dict(c=(0, -0.2, 22.4), w=10.6, ht=4.8, hb=4.8),
        dict(c=(0, -0.4, 25.0), w=10.8, ht=3.8, hb=3.8, e=2.5), dict(c=(0, -0.6, 26.4), w=5.0, h=2.6)]


def shirt(C, N):
    return (N[:, 1] < -0.4) & (np.abs(C[:, 0]) < 0.6 + 0.38 * (C[:, 2] - 18.6)) & (C[:, 2] > 18.6)


B.add('body', low(tk.loft('torso', BODY, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 150, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (shirt(V, N) == 0) * (N[:, 1] < -0.4) * (V[:, 2] > 18.6)),
                  region=('suit', [('tie', lambda C, N: shirt(C, N) & (np.abs(C[:, 0]) < 0.55)), ('shirt', shirt)])))
for sx in (1, 0, -1):
    B.add('body', limb('plume', [(sx * 1.4, 4.4, 17.0), (sx * 2.0, 8.2, 15.4), (sx * 2.4, 10.0, 13.2)], [1.2, 0.9, 0.2], tris=10, region='feather', n=5,
                       cap1='point'))
B.add('body', blob('carnation', (3.4, -4.6, 24.0), 0.9, tris=10, region='flower', lo=0, hi=2))
B.add('head', limb('neck', [(0, -0.6, 25.6), (0, -3.6, 28.4), (0, -1.0, 31.8), (0, -2.6, 35.2)], [1.8, 1.4, 1.3, 1.4], tris=24, region='feather', n=8))

# ------------------------------------------------------------------ the wings in their sleeves, folded across his chest
SR, SL = V3(-5.8, -0.2, 24.2), V3(5.8, -0.2, 24.2)
ARM = {}
for nm, sx, s_, z in (('arm_r', -1, SR, 21.4), ('arm_l', 1, SL, 22.6)):
    el = s_ + (sx * 1.2, -3.0, -3.6)
    wr = V3(-sx * 3.4, -5.4, z)
    ARM[nm] = (wr, [limb(nm, [s_, el, wr], [2.1, 1.9, 1.6], tris=22, region='suit', n=8),
                    limb(nm + '_tip', [wr, wr + (-sx * 1.6, 0.2, 0.2), wr + (-sx * 3.0, 0.6, -0.4)], [1.6, 1.2, 0.2], tris=12, region='feather', n=6,
                         cap1='point')])
for nm, (wr, pcs) in ARM.items():
    B.add(nm, *pcs)

# ------------------------------------------------------------------ the head: small, the bent beak with its black tip
NECK = (0, -0.6, 25.6)
HC = V3(0, -2.8, 36.6)
head = tk.loft('head', [dict(c=tuple(HC + (0, 1.6, 0)), w=3.6, h=2.0), dict(c=tuple(HC), w=4.0, ht=2.2, hb=2.0), dict(c=tuple(HC + (0, -1.8, -0.2)), w=3.0, h=1.6)],
               n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
HP = [low(head, 'head', 50, lo=1, hi=3, region='feather'),
      limb('beak', [HC + (0, -2.6, -0.2), HC + (0, -4.4, -0.4), HC + (0, -5.4, -1.6), HC + (0, -5.4, -2.8)], [1.0, 0.9, 0.6, 0.15], tris=14,
           region='beak', n=6, cap1='point')]
B.add('head', *HP)
B.commit(F, bones={'base': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pose change)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0.6, 0.8, 16.0), parent='root')
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
        # pose B: the wings fling wide and up, the head snaps up and over
        B_ = {'head': [('X', -14), ('Y', 10)], 'body': [('X', -4)]}
        for nm, s_ in (('arm_r', SR), ('arm_l', SL)):
            sx = -1 if nm == 'arm_r' else 1
            a = ARM[nm][0] - s_
            b = V3(sx * 11.0, -1.6, 4.6)
            ax = np.cross(a, b)
            B_[nm] = [(tuple(ax / np.linalg.norm(ax)), float(np.degrees(np.arccos(np.dot(a, b) / np.linalg.norm(a) / np.linalg.norm(b)))))]
        for b, r in B_.items():
            k(b, 6)
            k(b, 14, rot=r, ease='BACK')
            k(b, 60, rot=r)
            k(b, 72)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('marble', pt.ramp('#e9e4da', 6, shift=0.04), tone=sh, base=0.1)
    mb = P.region('marble') & (P.on[:, :, 2] > 0.5)
    P.tint(mb & ((np.floor(X / 3.0) + np.floor(Yc / 3.0)) % 2 == 0), pt.ramp('#2a2a30', 6, shift=0.05), sh)
    P.fill('suit', pt.ramp('#efc6c8', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('suit') & (np.abs(np.mod(X + 0.15 * Yc, 1.3) - 0.65) < 0.09), pt.ramp('#f8f2ee', 5), sh)        # chalk pinstripes
    P.fill('shirt', pt.ramp('#26242a', 5, shift=0.05, light=0.6), tone=sh, base=0.1)
    P.fill('tie', pt.ramp('#f4f1ea', 5, shift=0.03), tone=sh, base=0.15)
    P.fill('flower', pt.ramp('#f4f1ea', 5), tone=sh, base=0.2)
    P.fill('feather', pt.ramp('#ee8a9a', 7, shift=0.06), tone=sh, base=0.1, brush='feather')
    P.fill('leg', pt.ramp('#e27a8a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('beak', pt.ramp('#f0e0d0', 5), tone=sh, base=0.15)
    P.fill(P.region('beak') & (Yc < HC[1] - 4.9), pt.ramp('#1e1c20', 5, light=0.6), tone=sh, base=0.2)
    # the face: dark glasses (two dabbed lenses and a bridge), a thin straight mouth line at the beak's root
    fc = face.Face(P, c=tuple(HC + (0, -1.8, 0.4)), axis=(0, -1, 0.1), where=P.region('feather') & (Z > 34), seed=1131)
    for sx in (1, -1):
        fc.dot(sx * 1.0, 0.2, 0.75, 0.5)
    fc.stroke([(-0.4, 0.4), (0.4, 0.4)], weight=0.18)
    P.lines(['suit', 'shirt', 'tie'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('arm_r', 'arm_l'), ('arm_r', 'head'), ('arm_l', 'head'),
                                         ('body', 'base')], fold=(0, 14, 40, 76))
