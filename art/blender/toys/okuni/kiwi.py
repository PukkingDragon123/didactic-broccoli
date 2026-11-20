"""キーウィ Rugby Kiwi (series okuni, National Animal Parade; New Zealand): a round shaggy kiwi in a black rugby jersey
with a white collar, white shorts and hooped socks, sturdy legs planted, its long beak down sniffing at the oval ball
lying at its feet.
Gimmick: it boots the ball up; the ball spins up over its head and drops back in front of it.

    tools/blender.sh art/blender/toys/okuni/kiwi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.9')   # (this figure's detail: the pieces' budgets times this)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _okuni import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('okuni', 'kiwi')
B = Build()
# ------------------------------------------------------------------ the round body: jersey above, shorts below
BODY = [dict(c=(0, 7.6, 10.6), w=7.6, h=3.8), dict(c=(0, 4.2, 11.0), w=13.6, ht=7.0, hb=6.4), dict(c=(0, -0.6, 10.8), w=14.2, ht=7.2, hb=6.6),
        dict(c=(0, -4.8, 11.2), w=10.6, ht=5.6, hb=5.0), dict(c=(0, -6.8, 12.0), w=6.4, h=3.4)]


def shag(h):
    tk.push(h, lambda V, N: 0.12 * np.sin(V[:, 0] * 3.1 + V[:, 2] * 1.7) * np.sin(V[:, 1] * 2.3))


B.add('body', low(tk.loft('body', BODY, n=14, up=(0, 0, 1), cap0='round', cap1='round'), 'body', 170, lo=1, hi=3, sculpt=shag,
                  region=('jersey', [('shorts', lambda C, N: C[:, 2] < 7.4), ('collar', lambda C, N: (C[:, 1] < -5.6) & (C[:, 2] > 10.0) & (C[:, 2] < 14.6))])))
# ------------------------------------------------------------------ the legs: thick, scaly, in hooped socks; three toes forward
LEGS = {}
for nm, sx in (('leg_l', 1), ('leg_r', -1)):
    pp = [limb(nm, [(sx * 3.0, 0.0, 6.0), (sx * 3.2, -0.2, 3.4), (sx * 3.4, -0.6, 1.2)], [1.6, 1.25, 1.1], tris=24, region='sock', n=8)]
    for k_ in (-1, 0, 1):
        t1 = (sx * 3.4 + k_ * 1.5, -3.8, 0.45)
        toe = limb('toe', [(sx * 3.4, -0.8, 0.7), t1], [0.6, 0.45], tris=10, region='leg', n=5)
        for o in toe:
            tk.flat_bottom(o, 0.25)
        pp += [toe, limb('claw', [t1, (t1[0], t1[1] - 0.8, 0.2)], [0.35, 0.08], tris=8, region='claw', n=5, cap1='point')]
    bt = limb('btoe', [(sx * 3.4, -0.4, 0.6), (sx * 3.5, 1.4, 0.4)], [0.5, 0.35], tris=8, region='leg', n=5)
    for o in bt:
        tk.flat_bottom(o, 0.2)
    pp.append(bt)
    LEGS[nm] = pp
B.add('body', *LEGS['leg_l'])
B.add('leg_r', *LEGS['leg_r'])
# ------------------------------------------------------------------ the little head, the long beak down to the ball
hd = tk.loft('head', [dict(c=(0, -5.8, 13.6), w=6.6, h=3.4), dict(c=(0, -8.2, 14.0), w=6.0, ht=3.2, hb=2.8), dict(c=(0, -10.0, 13.4), w=3.6, h=2.0)],
             n=10, up=(0, 0, 1), cap0='round', cap1='round')
B.add('head', low(hd, 'head', 60, region='fur', sculpt=shag))
B.add('head', limb('beak', [(0, -10.6, 13.0), (0, -12.8, 10.6), (0, -14.6, 7.6), (0, -15.4, 5.6)], [0.85, 0.65, 0.5, 0.35], tris=28, region='beak', n=6))
# ------------------------------------------------------------------ the rugby ball lying at its feet
BC = (-0.6, -14.2, 2.45)
ball = tk.lathe('ball', [(0, -3.4), (1.5, -2.5), (2.25, -1.0), (2.45, 0.0), (2.25, 1.0), (1.5, 2.5), (0, 3.4)], n=12, axis='X', centre=BC)
tk.rotate(ball, 18, 'Z', pivot=BC)
B.add('ball', low(ball, 'ball', 70, region='ball'))
B.commit(F, bones={'body': 'body', 'leg_r': 'leg_r', 'head': 'head', 'ball': 'ball'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 7.0), parent='root')
    R.bone('leg_r', (-3.0, 0.0, 6.0), parent='body')
    R.bone('head', (0, -5.6, 12.6), parent='body')
    R.bone('ball', BC, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'leg_r', 'head', 'ball']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('head', 4)
        k('head', 10, rot=('X', -24))   # the beak up out of the way
        k('leg_r', 6, rot=('X', 22))     # the leg back...
        k('leg_r', 12, rot=('X', -34), ease=('QUAD', 'EASE_IN'))   # ...and the kick
        k('leg_r', 22)
        k('body', 8, rot=('X', 4))
        k('body', 13, rot=('X', -5), move=(0, 0, 0.4))
        k('body', 22)
        k('ball', 11)
        k('ball', 22, move=(0.4, 3.6, 16.0), rot=('X', -300), ease=('QUAD', 'EASE_OUT'))
        k('ball', 34, move=(0.0, 0.2, 0.0), rot=('X', -720), ease=('QUAD', 'EASE_IN'))
        k('ball', 37, move=(0, 0, 1.2), rot=('X', -700))
        k('ball', 40, rot=('X', -720))
        k('ball', 56, rot=('X', -720))
        k('head', 24, rot=('X', -32))
        k('head', 34, rot=('X', 6))
        k('head', 44)
        for b in allb[:-1]:
            k(b, 56)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('jersey', pt.ramp('#26242a', 6, shift=0.05, light=0.6), tone=sh, base=0.2, brush='cloth')
    P.fill('collar', pt.ramp('#f2efe6', 5, shift=0.04), tone=sh, base=0.2, brush='cloth')
    P.fill(P.region('collar') & (Z < 11.6), pt.ramp('#26242a', 6, shift=0.05, light=0.6), tone=sh, base=0.2, brush='cloth')   # the V of the collar
    P.fill('shorts', pt.ramp('#f2efe6', 6, shift=0.04), tone=sh, base=0.15, brush='cloth')
    P.fill('fur', pt.ramp('#7a5a3a', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    P.fill('beak', pt.ramp('#e2d4b4', 6, shift=0.05), tone=sh, base=0.15)
    sk = P.region('sock')
    P.fill(sk, pt.ramp('#26242a', 5, shift=0.05, light=0.6), tone=sh, base=0.2, brush='cloth')
    P.fill(sk & bands(Z, 1.6, 0.6) & (Z > 2.2), pt.ramp('#f2efe6', 5), tone=sh, base=0.2, brush='cloth')
    P.fill(sk & (Z < 2.2), pt.ramp('#c8b890', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('leg', pt.ramp('#c8b890', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('claw', pt.ramp('#3a3230', 4), tone=sh, base=0.2)
    br = P.region('ball')
    P.fill(br, pt.ramp('#f0ebe0', 6, shift=0.04), tone=sh, base=0.2)
    d = P.pos - np.asarray(BC)
    P.fill(br & (np.abs(np.abs(d[:, :, 0] * np.cos(0.31) + d[:, :, 1] * np.sin(0.31)) - 1.6) < 0.5), pt.ramp('#c8302a', 5, shift=0.05), tone=sh, base=0.1)
    seam = br & (np.abs(d[:, :, 2] - 0.0) < 0.12) & (d[:, :, 2] > -2) & (P.on[:, :, 2] > -0.2)
    P.flat(seam & (np.abs(d[:, :, 0]) < 1.2), '#3a3230')
    fc = face.Face(P, c=(0, -9.6, 14.4), axis=(0, -1, 0.3), where=P.region('fur'), seed=219)
    fc.eyes('dot', spread=3.4, size=0.45, dy=0.3)
    fc.blush(4.2, -0.6, rx=0.7, ry=0.4, col='#d88a70')
    P.lines(['jersey', 'shorts', 'collar'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=56, skip=[('leg_r', 'body'), ('head', 'body'), ('ball', 'head'), ('ball', 'leg_r')],
   cams=[((56, -76, 40), (0, -4, 9)), ((-54, 68, 36), (0, -2, 9))])
