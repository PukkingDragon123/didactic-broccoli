"""ハクトウワシ Slugger Bald Eagle (series okuni, National Animal Parade; the USA): a bald eagle standing at the plate
on its yellow talons, its white tail fanned on the ground behind, in a pinstriped ball jersey and a navy ball cap (no
logo), the bat over its shoulder in both wing-hands, glaring down the pitch under its heavy brow.
Gimmick: a big swing, all the way round, and back to the ready.

    tools/blender.sh art/blender/toys/okuni/washi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.6')   # (this figure's detail: the pieces' budgets times this)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _okuni import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('okuni', 'washi')
B = Build()
# ------------------------------------------------------------------ legs, talons, the tail fan on the ground
for sx in (1, -1):
    B.add('body', limb('leg', [(sx * 2.6, 0.4, 5.6), (sx * 2.8, -0.4, 1.4)], [1.1, 0.95], tris=16, region='leg', n=6))
    for k_ in (-1, 0, 1):
        t0 = (sx * 2.8, -0.6, 0.75)
        t1 = (sx * 2.8 + k_ * 1.3, -3.2, 0.55)
        toe = limb('toe', [t0, t1], [0.55, 0.45], tris=10, region='leg', n=5)
        for o in toe:
            tk.flat_bottom(o, 0.2)
        B.add('body', toe)
        B.add('body', limb('talon', [t1, (t1[0] + k_ * 0.3, t1[1] - 0.9, 0.2)], [0.35, 0.08], tris=8, region='talon', n=5, cap1='point'))
    bt = limb('btoe', [(sx * 2.8, -0.2, 0.7), (sx * 2.9, 1.6, 0.5)], [0.5, 0.4], tris=10, region='leg', n=5)
    for o in bt:
        tk.flat_bottom(o, 0.2)
    B.add('body', bt)
tail = tk.loft('tail', [dict(c=(0, 4.0, 8.4), w=5.6, h=1.3), dict(c=(0, 6.6, 4.0), w=7.0, h=0.8), dict(c=(0, 8.6, 0.6), w=8.0, h=0.6)],
               n=8, up=(0, -1, 0.4), cap0='round', cap1='round')
tl = low(tail, 'tail', 30, region='white', sculpt=lambda h: tk.push(h, lambda V, N: -0.15 * bands(V[:, 0], 1.3, 0.25)))
for o in tl:
    tk.flat_bottom(o, 0.5)
B.add('body', tl)
# ------------------------------------------------------------------ the body in its jersey
BODY = [dict(c=(0, 0.8, 4.2), w=8.6, h=3.6), dict(c=(0, 0.6, 8.2), w=11.4, ht=5.4, hb=5.0), dict(c=(0, 0.2, 13.2), w=11.8, ht=5.6, hb=5.0),
        dict(c=(0, 0.0, 18.0), w=10.0, h=4.6), dict(c=(0, -0.2, 21.4), w=7.4, h=3.4)]
B.add('body', low(tk.loft('body', BODY, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 160, lo=1, hi=3,
                  region=('feather', [('jersey', lambda C, N: C[:, 2] > 6.4)])))
B.add('body', limb('collar', [(-3.0, -1.2, 21.2), (-1.6, -3.0, 21.6), (0, -3.4, 21.4), (1.6, -3.0, 21.6), (3.0, -1.2, 21.2)], 0.5, tris=20, region='navy', n=5))
# ------------------------------------------------------------------ the head: white, a heavy brow, the hooked yellow beak; the cap
B.add('head', limb('neck', [(0, -0.2, 20.6), (0, -0.8, 24.0)], 2.8, tris=16, region='white', n=8))
hd = tk.loft('head', [dict(c=(0, 1.4, 26.2), w=6.8, h=3.2), dict(c=(0, -1.0, 26.6), w=8.4, ht=4.0, hb=3.6), dict(c=(0, -3.6, 26.0), w=6.4, ht=2.9, hb=2.8)],
             n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
B.add('head', low(hd, 'head', 90, region='white', sculpt=lambda h: tk.push(h, lambda V, N: sum(tk.bump(V, (sx * 1.7, -4.4, 27.8), 1.8, 0.5) for sx in (1, -1)))))
B.add('head', limb('beak', [(0, -4.0, 26.0), (0, -6.2, 26.0), (0, -7.4, 25.2), (0, -7.3, 24.2)], [1.9, 1.4, 0.8, 0.15], tris=28, region='beak', n=8,
                   cap1='point'))
CAP = (0, -0.6, 28.4)
crown = tk.lathe('cap', [(0, 0), (4.5, 0), (4.4, 1.5), (3.5, 2.7), (0, 3.1)], n=12, centre=CAP)
brim = tk.slab('brim', tk.circle_pts(6.6, 8, (0, 0), 205, 335, closed=False)[::-1] + tk.circle_pts(3.8, 6, (0, 0), 205, 335, closed=False), 0.4,
               plane='XY', at=0.0, bevel=0.0, segs=0)
brim_hi = tk.slab('brim_hi', tk.circle_pts(6.6, 8, (0, 0), 205, 335, closed=False)[::-1] + tk.circle_pts(3.8, 6, (0, 0), 205, 335, closed=False), 0.4,
                  plane='XY', at=0.0, bevel=0.12, segs=1)
for o in (brim, brim_hi):
    tk.move(o, (0, -0.6, 28.6))
tk.set_region(brim_hi, 'navy')
cp = low(crown, 'cap', 40, region='navy')
for o in (cp[0], cp[1], brim, brim_hi):
    tk.rotate(o, -6, 'X', pivot=CAP)
B.add('head', cp, (brim, brim_hi), blob('button', (0, -0.3, 31.4), 0.5, tris=10, region='navy'))
G = grow(B, 'head', 1.3, (0, -0.4, 21.6))
# ------------------------------------------------------------------ the wings (short jersey sleeves) gripping the bat over the right shoulder
CH = V3(0, -0.6, 17.0)
for sx in (1, -1):
    hand = (sx * 0.9 - 0.4, -7.0, 15.4 + (0.0 if sx > 0 else 1.6))
    B.add('swing', limb('wing', [(sx * 5.4, 0.2, 19.0), (sx * 7.4, -2.2, 15.8), hand], [2.7, 2.2, 1.4], tris=36, region='feather', n=8))
    B.add('swing', limb('sleeve', [(sx * 5.0, 0.2, 19.4), (sx * 6.4, -0.8, 17.6)], [2.5, 2.3], tris=16, region='jersey', n=8, cap0=None))
    for j in (-1, 1):
        B.add('swing', limb('prim', [hand, (hand[0] + j * 0.5, hand[1] - 1.2, hand[2] - 0.6 + j * 0.4)], [0.5, 0.25], tris=8, region='feather', n=5,
                            cap1='point'))
BAT = [V3(0.6, -7.6, 13.6), V3(-0.2, -7.2, 15.4), V3(-3.6, -3.2, 20.8), V3(-6.8, 1.4, 26.4)]
B.add('swing', limb('bat', BAT, [0.55, 0.45, 0.8, 1.25], tris=36, region='bat', n=8))
B.add('swing', blob('knob', BAT[0] + (0.1, -0.1, -0.4), 0.8, tris=12, region='bat', squash=(1, 1, 0.6)))
B.commit(F, bones={'body': 'body', 'head': 'head', 'swing': 'swing'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0.4, 6.0), parent='root')
    R.bone('head', (0, -0.4, 21.6), parent='body')
    R.bone('swing', tuple(CH), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'swing']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('swing', 6, rot=('Z', -14), move=(0, 1.0, 0.6))          # the wind-up
        k('swing', 12, rot=('Z', 95), move=(0, -0.6, -0.8), ease=('QUAD', 'EASE_IN'))   # the swing
        k('swing', 16, rot=('Z', 150), move=(0, 0.6, 0.4))
        k('swing', 30, rot=('Z', 150), move=(0, 0.6, 0.4))
        k('swing', 44, ease='BACK')
        k('body', 6, rot=('Z', -6))
        k('body', 13, rot=('Z', 18))
        k('body', 30, rot=('Z', 18))
        k('body', 44)
        k('head', 10)
        k('head', 16, rot=('Z', 20))
        k('head', 32, rot=('Z', 20))
        k('head', 44)
        for b in allb:
            k(b, 52)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('feather', pt.ramp('#4a3020', 7, shift=0.07, light=0.55), tone=sh, base=0.1, brush='feather')
    P.fill('white', pt.ramp('#f2efe6', 6, shift=0.04), tone=sh, base=0.2, brush='feather')
    P.fill('beak', pt.ramp('#f0b830', 6, shift=0.07), tone=sh, base=0.15, brush='gloss')
    P.fill('leg', pt.ramp('#e8b030', 6, shift=0.06), tone=sh, base=0.1)
    P.shift(P.region('leg') & bands(Z * 3.0 + X, 1.0, 0.18), -1)
    P.fill('talon', pt.ramp('#2a2424', 4), tone=sh, base=0.2)
    jr = P.region('jersey')
    P.fill(jr, pt.ramp('#f2efe4', 6, shift=0.04), tone=sh, base=0.2, brush='cloth')
    u = np.where(np.abs(P.on[:, :, 0]) > 0.7, Y, X)
    P.fill(jr & bands(u, 1.2, 0.16), pt.ramp('#26345e', 5, shift=0.05), tone=sh, base=0.1, brush=False)   # pinstripes
    for z in (9.6, 12.4, 15.2, 18.0):
        P.flat(jr & (np.hypot(X - 0.4, Z - z) < 0.4) & (Y < -4), '#26345e')
    P.fill('navy', pt.ramp('#26345e', 6, shift=0.05), tone=sh, base=0.15, brush='cloth')
    P.fill('bat', pt.ramp('#d0a060', 6, shift=0.06), tone=sh, base=0.15, brush={'preset': 'wood', 'flow': 'along', 'axis': (-0.5, 0.6, 0.6), 'L': 6})
    P.fill(P.region('bat') & (Z < 16.4), pt.ramp('#2a2426', 4), tone=sh, base=0.1)   # grip tape
    fc = face.Face(P, c=G((0, -4.2, 27.0)), axis=(0, -1, 0.15), where=P.region('white') & (Z > 24.5), seed=133)
    fc.eyes('dot', spread=4.6, size=0.4, dy=0.2)
    P.lines(['jersey', 'navy'], step=1)
    P.lines(['beak'], ['white'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=52, skip=[('head', 'body'), ('swing', 'body'), ('swing', 'head')])
