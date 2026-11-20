"""ビーバー Lumberjack Beaver (series okuni, National Animal Parade; Canada): a stout beaver standing on its big black
webbed feet with its flat scaly tail down behind, in a red-and-black check shirt and a red knitted toque with a white
cuff and a pompom, both paws on a hockey stick with its blade on the ice, the puck ready, two orange front teeth.
Gimmick: the tail slaps down, the stick swings, the puck shoots away and slides back.

    tools/blender.sh art/blender/toys/okuni/biba.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.6')   # (this figure's detail: the pieces' budgets times this)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _okuni import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('okuni', 'biba')
B = Build()
# ------------------------------------------------------------------ feet, the body in its shirt
for sx in (1, -1):
    B.add('body', shoe('foot', (sx * 3.4, 2.4, 0.0), (sx * 0.18, -1, 0), L=7.8, W=4.4, H=1.9, region='foot', tris=36, toe_up=0.1))
    for k_ in (-1, 0, 1):
        t = (sx * 3.4 + sx * 0.18 * 7.0 + k_ * 1.3, 2.4 - 7.4, 0.6)
        B.add('body', limb('claw', [t, (t[0], t[1] - 0.8, 0.3)], [0.4, 0.1], tris=8, region='claw', n=5, cap1='point'))
BODY = [dict(c=(0, 1.6, 2.4), w=10.6, h=4.8), dict(c=(0, 1.0, 7.4), w=13.2, ht=6.0, hb=5.6), dict(c=(0, 0.4, 13.0), w=12.2, ht=5.6, hb=5.0),
        dict(c=(0, 0.2, 17.6), w=9.4, h=4.2), dict(c=(0, 0.2, 20.4), w=6.8, h=3.2)]
B.add('body', low(tk.loft('body', BODY, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 170, lo=1, hi=3,
                  region=('fur', [('shirt', lambda C, N: C[:, 2] > 7.8), ('belly', lambda C, N: (C[:, 2] <= 7.8) & (N[:, 1] < -0.4))])))
for sx in (1, -1):   # the shirt's two chest pockets
    B.add('body', slabp('pocket', [(-1.3, -1.0), (1.3, -1.0), (1.3, 1.0), (0, 1.3), (-1.3, 1.0)], 0.4, 'shirt', plane='XZ', move=(sx * 2.6, -5.5, 15.2),
                        rot=[(sx * -16, 'Z', (0, 0, 0))]))
# ------------------------------------------------------------------ the flat tail
tail = tk.loft('tail', [dict(c=(0, 4.6, 3.0), w=3.6, h=1.4), dict(c=(0, 8.4, 1.1), w=6.8, h=0.75), dict(c=(0, 12.6, 0.6), w=7.6, h=0.65),
                        dict(c=(0, 15.4, 0.6), w=5.2, h=0.55)], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
tl = low(tail, 'tail', 40, region='tail', sculpt=lambda h: tk.push(h, lambda V, N: -0.12 * (bands(V[:, 0] + V[:, 1], 1.1, 0.16) | bands(V[:, 0] - V[:, 1], 1.1, 0.16)) * (V[:, 1] > 7)))
for o in tl:
    tk.flat_bottom(o, 0.4)
B.add('tail', tl)
# ------------------------------------------------------------------ arms, both paws on the hockey stick; the blade on the ice
S0, S1 = V3(-3.4, -6.4, 17.6), V3(4.6, -9.8, 0.9)   # the shaft: its butt end and its heel
sd = (S1 - S0) / np.linalg.norm(S1 - S0)
P1, P2 = S0 + sd * 2.2, S0 + sd * 8.0
B.add('arms', limb('arm_r', [(-5.0, -0.4, 17.6), (-6.4, -3.6, 15.2), tuple(P1 + (-0.6, 0.6, 0))], [2.0, 1.7, 1.4], tris=30, region='shirt', n=8))
B.add('arms', limb('arm_l', [(5.0, -0.4, 17.6), (5.8, -3.6, 13.4), tuple(P2 + (0.6, 0.6, 0))], [2.0, 1.7, 1.4], tris=30, region='shirt', n=8))
B.add('arms', blob('paw_r', P1 + (0, -0.2, 0), 1.35, tris=16, region='fur'), blob('paw_l', P2 + (0, -0.2, 0), 1.35, tris=16, region='fur'))
B.add('arms', limb('shaft', [S0, S1], [0.5, 0.45], tris=16, region='stick', n=6))
B.add('arms', slabp('blade', [(0, 0), (4.8, 0), (5.4, 0.35), (5.2, 1.4), (0.4, 1.5), (-0.2, 0.9)], 0.5, 'stick', plane='XZ', move=(S1[0] - 0.4, S1[1], 0.0)))
B.add('puck', turn('puck', [(0, 0), (1.5, 0), (1.55, 0.9), (0, 0.9)], (7.2, -12.0, 0.0), 'puck', tris=24, n=12))
# ------------------------------------------------------------------ the head: round, small ears, the orange teeth, the toque
NECK = (0, 0.2, 20.0)
hd = tk.loft('head', [dict(c=(0, 1.8, 23.6), w=7.8, h=3.6), dict(c=(0, -0.4, 24.0), w=9.8, ht=4.6, hb=4.0), dict(c=(0, -3.0, 23.2), w=8.2, ht=3.4, hb=3.2),
                      dict(c=(0, -4.8, 22.4), w=5.8, h=2.4)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
B.add('head', low(hd, 'head', 110, region=('fur', [('muzzle', lambda C, N: (C[:, 1] < -3.6) & (C[:, 2] < 23.4)),
                                                    ('nose', lambda C, N: (C[:, 1] < -5.6) & (C[:, 2] > 22.8) & (np.abs(C[:, 0]) < 1.3))])))
for sx in (1, -1):
    B.add('head', blob('ear', (sx * 4.2, 0.6, 25.6), 1.1, tris=12, region='fur', squash=(0.6, 1.0, 1.0)))
    B.add('head', box('tooth', (0.95, 0.55, 1.6), (sx * 0.52, -5.3, 20.8), 'teeth'))
TQ = (0, 0.2, 25.6)
tq = tk.lathe('toque', [(0, 0), (5.0, 0), (5.0, 1.5), (4.7, 3.0), (3.7, 4.6), (1.7, 5.7), (0, 5.9)], n=14, centre=TQ)
tk.rotate(tq, -8, 'X', pivot=TQ)
B.add('head', low(tq, 'toque', 70, region=('knit', [('cuff', lambda C, N: C[:, 2] < 27.0)]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.12 * bands(np.arctan2(V[:, 1] - 0.2, V[:, 0]) * 6, 1.0, 0.45) * (V[:, 2] < 27.2))))
B.add('head', blob('pom', (0, 1.1, 31.8), 1.7, tris=24, region='pom'))
G = grow(B, 'head', 1.12, NECK)
B.commit(F, bones={'body': 'body', 'tail': 'tail', 'arms': 'arms', 'puck': 'puck', 'head': 'head'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 1.0, 5.0), parent='root')
    R.bone('tail', (0, 4.4, 3.2), parent='body')
    R.bone('arms', (0, -0.6, 17.6), parent='body')
    R.bone('head', NECK, parent='body')
    R.bone('puck', (7.2, -12.0, 0.45), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'tail', 'arms', 'head', 'puck']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('tail', 4)
        k('tail', 10, rot=('X', -28), ease='BACK')    # up...
        k('tail', 14, rot=('X', 3), ease=('QUAD', 'EASE_IN'))   # ...slap
        k('tail', 18)
        k('arms', 14)
        k('arms', 22, rot=('Z', -24), move=(-0.6, 0.6, 1.0))    # the back-swing
        k('arms', 26, rot=('Z', 20), move=(0.4, -0.4, 0), ease=('QUAD', 'EASE_IN'))   # the slap shot
        k('arms', 40, rot=('Z', 20), move=(0.4, -0.4, 0))
        k('arms', 50)
        k('body', 20, rot=('Z', -6))
        k('body', 26, rot=('Z', 8))
        k('body', 44)
        k('head', 14, rot=('X', 6))
        k('head', 26, rot=('Z', 14))
        k('head', 44)
        k('puck', 25)
        k('puck', 34, move=(9.0, -14.0, 0.0), rot=('Z', 200), ease=('QUAD', 'EASE_OUT'))
        k('puck', 40, move=(9.0, -14.0, 0.0), scale=0.01, ease='CONSTANT')   # (it is gone into the net...)
        k('puck', 48, move=(0, 0, 3.0), scale=0.01)
        k('puck', 54, ease='BACK')   # ...and a fresh one drops in
        for b in allb[:-1]:
            k(b, 58)
        k('puck', 58)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('fur', pt.ramp('#7a4a2a', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    P.fill('belly', pt.ramp('#9a6a42', 6, shift=0.06), tone=sh, base=0.15, brush='fur')
    P.fill('muzzle', pt.ramp('#c8a080', 6, shift=0.05), tone=sh, base=0.15, brush='fur')
    P.fill('nose', pt.ramp('#2a2224', 4), tone=sh, base=0.2)
    P.fill('teeth', pt.ramp('#e8902a', 5, shift=0.05), tone=sh, base=0.2)
    P.fill('foot', pt.ramp('#2e2a2c', 6, shift=0.05, light=0.6), tone=sh, base=0.2)
    P.fill('claw', pt.ramp('#c8b8a0', 4), tone=sh, base=0.2)
    tr = P.region('tail')
    P.fill(tr, pt.ramp('#3a3236', 6, shift=0.05, light=0.6), tone=sh, base=0.2)
    P.shift(tr & (bands(X + Y, 1.1, 0.18) | bands(X - Y, 1.1, 0.18)), -1)
    u = np.where(np.abs(P.on[:, :, 0]) > 0.7, Y, X)
    check(P, pt, P.region('shirt'), sh, u, Z)
    P.fill('stick', pt.ramp('#d8b070', 6, shift=0.06), tone=sh, base=0.15, brush={'preset': 'wood', 'flow': 'along', 'axis': (0.4, -0.2, -0.9), 'L': 6})
    P.fill(P.region('stick') & (Z < 1.6), pt.ramp('#2a2426', 4), tone=sh, base=0.15)   # tape on the blade
    P.fill('puck', pt.ramp('#262224', 4, light=0.6), tone=sh, base=0.2)
    P.fill('knit', pt.ramp('#c8302a', 6, shift=0.06), tone=sh, base=0.1, brush='cloth')
    P.fill('cuff', pt.ramp('#f2efe6', 5, shift=0.04), tone=sh, base=0.15, brush='cloth')
    P.fill('pom', pt.ramp('#f2efe6', 5, shift=0.04), tone=sh, base=0.15, brush='fur')
    fc = face.Face(P, c=G((0, -4.4, 24.4)), axis=(0, -1, 0.15), where=P.region('fur') | P.region('muzzle') | P.region('nose'), seed=707)
    fc.eyes('dot', spread=4.6, size=0.58, dy=0.6)
    fc.mouth('upturn', w=2.0, dy=-2.2, weight=0.3)
    P.lines(['shirt', 'knit', 'cuff'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=58, skip=[('tail', 'body'), ('arms', 'body'), ('head', 'body'), ('arms', 'head'), ('arms', 'puck'), ('puck', 'body')])
