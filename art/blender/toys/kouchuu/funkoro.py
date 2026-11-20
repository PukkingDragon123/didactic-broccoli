"""ローディー・ロロ Rollo the Roadie (series kouchuu, The Hardwings): the band's roadie, a stout dung beetle in denim
work overalls and a flat cap, leaning into a great ball of tangled guitar cables (black, red, grey and yellow leads,
two jack plugs sticking out) that he rolls from gig to gig.
Gimmick: he shoves and the ball rolls forward a turn, then he hauls it back.

    tools/blender.sh art/blender/toys/kouchuu/funkoro.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.3')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _band import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('kouchuu', 'funkoro')
B = Build()
RB = 6.6
BC = V3(0, -11.4, RB)
M = Beetle(B, hand_r=(-2.6, -7.4, 12.0), hand_l=(2.8, -7.2, 12.4), hk=1.12, hair=None, fringe=23.6)
M.antennae(club=True)
# the flat cap
CAP = (0, 0.2, 26.6)
cap = tk.lathe('cap', [(0, -0.4), (5.6, -0.4), (5.8, 0.4), (5.0, 1.6), (2.6, 2.3), (0, 2.4)], n=14, centre=CAP)
tk.scale(cap, (1.0, 1.1, 1.0), pivot=CAP)
tk.rotate(cap, -8, 'X', pivot=CAP)
B.add('head', lowk(cap, 'cap', 60, 'tweed'))
B.add('head', slabp('peak', [(math.cos(math.radians(a)) * 5.0, math.sin(math.radians(a)) * 5.0 * 1.1) for a in range(200, 341, 20)][::-1] +
                    [(math.cos(math.radians(a)) * 3.0, math.sin(math.radians(a)) * 3.0) for a in range(200, 341, 35)], 0.45, 'tweed', plane='XY',
                    move=(0, -1.6, 26.1), rot=[(-12, 'X', (0, 0, 0))]))
# the clypeus: the dung beetle's toothed shovel of a head-front, over the mouth
B.add('head', slabp('shovel', [(-3.4, 0), (-2.6, -1.0), (-1.4, -1.6), (-0.5, -1.2), (0, -1.8), (0.5, -1.2), (1.4, -1.6), (2.6, -1.0), (3.4, 0), (0, 0.6)],
                    0.5, 'chitin', plane='XY', move=(0, -4.2, 20.2), rot=[(-14, 'X', (0, 0, 0))]))


def tangle(h):
    def f(V, N):
        d = V - BC
        r = np.linalg.norm(d, axis=1) + 1e-6
        u = d / r[:, None]
        out = np.zeros(len(V))
        for ax, ph in (((1, 0, 0), 0.0), ((0, 0.6, 0.8), 1.3), ((0.7, 0.7, 0), 2.1), ((0.3, -0.5, 0.8), 0.7), ((-0.6, 0.2, 0.75), 2.9)):
            a = np.asarray(ax, float) / np.linalg.norm(ax)
            out += 0.4 * (np.abs(np.sin(np.arcsin(np.clip(u @ a, -1, 1)) * 7 + ph)) > 0.82)
        return np.minimum(out, 0.5)
    tk.push(h, f)


B.add('ball', turn('ball', [(0, -RB)] + [(RB * math.sin(t), -RB * math.cos(t)) for t in np.linspace(0.25, math.pi - 0.25, 9)] + [(0, RB)], tuple(BC),
                   'cable', tris=180, n=16, sculpt=tangle))
for p0, d in (((3.6, -12.0, 12.0), (3.0, 0.6, 1.6)), ((-5.4, -13.4, 9.0), (-2.6, -1.2, 1.4))):
    p0 = V3(*p0)
    d = V3(*d)
    B.add('ball', limb('lead', [p0, p0 + d * 0.6 + (0, 0, 0.6), p0 + d], 0.35, tris=10, region='lead', n=5))
    B.add('ball', limb('jack', [p0 + d, p0 + d * 1.5], [0.6, 0.3], tris=10, region='plug', n=6))
B.commit(F, bones={'body': 'body', 'head': 'head', 'arm_r': 'arm_r', 'arm_l': 'arm_l', 'ball': 'ball'})


def make_rig():
    R = M.rig(F, extra=lambda R: R.bone('ball', tuple(BC), parent='root'))
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'ball']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('body', 4, rot=('X', 4))
        k('body', 16, rot=('X', 10), move=(0, -2.2, 0))           # the shove
        k('body', 26, rot=('X', 6), move=(0, -3.4, 0))
        k('body', 46)
        k('ball', 6)
        k('ball', 26, move=(0, -4.0, 0), rot=('X', -40), ease=('QUAD', 'EASE_OUT'))
        k('ball', 34, move=(0, -4.2, 0), rot=('X', -42))
        k('ball', 46, ease=('QUAD', 'EASE_IN'))
        for nm in ('arm_r', 'arm_l'):
            k(nm, 4)
            k(nm, 14, rot=('X', -10))
            k(nm, 30, rot=('X', 6))
            k(nm, 46)
        k('head', 8)
        k('head', 18, rot=('X', 10))
        k('head', 32, rot=[('X', -6), ('Z', 10)])
        k('head', 46)
        for b in allb:
            k(b, 54)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_member(P, pt, sh, chitin='#26222a', suit='#3a5a8a', hair='#26222a', shirt='#e8e2d2', tie='#e8e2d2', boot='#5a3a24')
    sr = P.region('suit')
    P.fill(sr & bands(X * 0.7 + Z * 0.7, 0.5, 0.12), pt.ramp('#3a5a8a', 7, shift=0.06), tone=sh, base=-0.15, brush=False)   # the denim's twill
    for sx in (1, -1):   # the overall straps and their buttons
        P.flat(sr & (np.abs(X - sx * 2.2) < 0.45) & (Z > 14.5) & (P.on[:, :, 1] < -0.3), '#2a4470')
        P.flat(sr & (np.hypot(X - sx * 2.2, Z - 15.0) < 0.42) & (Y < -2), '#d8b048')
    P.fill('tweed', pt.ramp('#7a6a52', 6, shift=0.05), tone=sh, base=0.1, brush={'preset': 'cloth', 'cross': 1})
    P.shift(P.region('tweed') & bands(X + Y * 0.5, 0.7, 0.15), -1)
    cr = P.region('cable')
    P.fill(cr, pt.ramp('#2a2628', 6, shift=0.05, light=0.6), tone=sh, base=0.2, brush='gloss')
    d = P.pos - BC
    u = d / (np.linalg.norm(d, axis=2)[..., None] + 1e-6)
    for (ax, ph), col in zip((((1, 0, 0), 0.0), ((0, 0.6, 0.8), 1.3), ((0.7, 0.7, 0), 2.1), ((0.3, -0.5, 0.8), 0.7), ((-0.6, 0.2, 0.75), 2.9)),
                             ('#c8302a', '#2a2628', '#8a8c90', '#e8b830', '#c8302a')):
        a = np.asarray(ax, float) / np.linalg.norm(ax)
        m = cr & (np.abs(np.sin(np.arcsin(np.clip(u @ a, -1, 1)) * 7 + ph)) > 0.82)
        P.fill(m, pt.ramp(col, 6, shift=0.05), tone=sh, base=0.2, brush='gloss')
    P.fill('lead', pt.ramp('#2a2628', 5, light=0.6), tone=sh, base=0.2)
    P.fill('plug', pt.ramp('#c0c4cc', 6, light=0.6), tone=sh, base=0.2, brush='metal')
    face_at(P, M, 305, size=0.46)
    P.lines(['tweed'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=54, skip=[('arm_r', 'ball'), ('arm_l', 'ball'), ('ball', 'body'), ('ball', 'head')])
