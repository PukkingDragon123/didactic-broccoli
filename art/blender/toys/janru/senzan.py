"""森のぬしセンザンコウ Forest Lord (series janru, secret; concepts_E.md): the gentle-giant forest-spirit genre, our
own creature: a huge old pangolin, its bronze scales overgrown with moss, a little forest growing on its back (two
firs, a round tree, a mushroom) and fireflies resting in it; it plods on a mossy forest floor, its head low and
its long tail curled round to the front.
Gimmick (light-up): it lifts its head and looks up, the tail uncurls a little, and the fireflies on its back light
up (series data `light`); then it settles back down.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/senzan.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'senzan')
B = Build()
GZ = 3.4

# ------------------------------------------------------------------ the forest floor: a mossy mound, a stone, a root
floor = tk.lathe('base', [(0, 0), (14.0, 0), (14.0, 1.4), (12.6, 2.8), (8.0, 3.3), (0, GZ + 0.1)], n=18, centre=(0, 0, 0))
B.add('base', low(floor, 'base', 80, lo=0, hi=3, region='floor', sculpt=lambda h: tk.push(h, lambda V, N: 0.2 * np.sin(V[:, 0] * 1.3) * np.sin(V[:, 1] * 1.1) * (N[:, 2] > 0.5))))
B.add('base', blob('stone', (-9.6, -6.4, 3.4), 1.8, tris=14, region='stone', squash=(1.2, 1.0, 0.7)))
B.add('base', limb('root', [(-12.6, 4.4, 2.6), (-9.6, 6.6, 3.6), (-6.8, 9.6, 3.4)], [0.9, 0.8, 0.5], tris=12, region='bark', n=6, cap1='point'))


# ------------------------------------------------------------------ the body: the great arched scaled back, moss on top
def scales(h):
    def f(V, N):
        v = V[:, 1] * 0.8 - V[:, 2] * 0.5
        u = V[:, 0] * 0.8 + 0.5 * np.floor(v)
        return -0.25 * ((np.mod(v, 1.0) > 0.85) | ((np.abs(np.mod(u, 1.0) - 0.5) > 0.44) & (np.mod(v, 1.0) > 0.3)))
    tk.push(h, f)


BODY = [dict(c=(0, 8.6, 10.2), w=9.6, ht=4.6, hb=4.0), dict(c=(0, 2.4, 13.8), w=13.0, ht=7.0, hb=5.4), dict(c=(0, -3.6, 12.6), w=11.0, ht=5.8, hb=4.8),
        dict(c=(0, -7.2, 10.0), w=6.4, ht=3.4, hb=3.2)]


def mossy(C, N):
    return (N[:, 2] > 0.55) & (C[:, 2] > 17.0)


B.add('body', low(tk.loft('body', BODY, n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6), 'body', 340, lo=1, hi=3, sculpt=scales,
                  region=('scales', [('belly', lambda C, N: N[:, 2] < -0.5), ('moss', mossy)])))
for sx in (1, -1):
    # forelegs with their big digging claws; the thick hind legs
    B.add('body', limb('fore', [(sx * 4.2, -4.6, 10.4), (sx * 5.0, -5.4, 6.6), (sx * 5.2, -5.6, GZ + 1.4)], [2.0, 1.7, 1.5], tris=16, region='scales', n=8))
    B.add('body', *hand('claw', (sx * 5.2, -5.8, GZ + 1.2), (sx * 0.1, -1, -0.25), r=1.2, kind='claw', region='skin', up=(0, 0, 1), tris=14))
    B.add('body', limb('hind', [(sx * 4.6, 7.0, 10.0), (sx * 5.4, 7.6, 6.4), (sx * 5.4, 7.0, GZ + 1.6)], [2.8, 2.3, 1.8], tris=18, region='scales', n=8))
    B.add('body', shoe('hfoot', (sx * 5.4, 8.4, GZ), (sx * 0.15, -1, 0), L=4.6, W=3.2, H=2.0, region='skin', tris=20, toe_up=0.1))

# ------------------------------------------------------------------ the little forest on its back: two firs, a round tree, a mushroom, the fireflies


def fir(c, h, r, tris=24):
    c = np.asarray(c, float)
    prof = [(0, 0), (0.35, 0), (0.35, h * 0.2), (r, h * 0.2), (r * 0.45, h * 0.55), (r * 0.8, h * 0.5), (0.05, h)]
    return [low(tk.lathe('fir', prof, n=7, centre=tuple(c)), 'fir', tris, lo=0, hi=2, region=('fir', [('bark', lambda C, N: C[:, 2] < c[2] + h * 0.2)]))]


FOREST = []
FOREST += fir((-2.4, 3.4, 19.4), 9.6, 3.2, 32)
FOREST += fir((1.8, 6.6, 17.2), 6.8, 2.4, 26)
TC = V3(2.8, -0.8, 23.6)
FOREST += [limb('trunk', [(2.4, -0.4, 19.4), TC + (0, 0, -0.4)], [0.5, 0.4], tris=8, region='bark', n=5),
           blob('canopy', TC + (0, 0, 1.0), 3.0, tris=36, region='leaf', squash=(1.0, 1.0, 0.85))]
FOREST += [limb('stem', [(-3.6, -2.4, 18.4), (-3.7, -2.5, 19.8)], [0.35, 0.3], tris=6, region='stem', n=5),
           low(tk.lathe('cap', [(0, 0), (1.2, 0), (1.0, 0.5), (0, 0.9)], n=8, centre=(-3.7, -2.5, 19.7)), 'cap', 10, lo=0, hi=2, region='shroom')]
B.add('body', *FOREST)
FLIES = [(-1.0, 1.0, 19.6), (-3.2, 4.8, 21.2), (0.6, 3.0, 19.6), (5.4, -0.4, 24.4), (1.0, -1.4, 25.4), (3.0, 6.2, 19.4), (-2.0, 2.4, 26.0), (-4.0, -0.4, 18.6),
         (2.8, 4.0, 18.8)]
B.add('flies', *[blob('fly', p, 0.42, tris=6, region='fly') for p in FLIES])

# ------------------------------------------------------------------ the head: a small cone of a head on the long neck, low; the curled tail
HC = V3(0, -9.6, 8.6)
head = tk.loft('head', [dict(c=tuple(HC + (0, 1.8, 0.8)), w=5.6, h=2.8), dict(c=tuple(HC), w=4.8, ht=2.5, hb=2.2), dict(c=tuple(HC + (0, -2.8, -1.0)), w=2.8, h=1.5),
                        dict(c=tuple(HC + (0, -4.6, -1.6)), w=1.3, h=0.8)], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.5)
B.add('head', low(head, 'head', 70, lo=1, hi=3, region=('skin', [('scales', lambda C, N: (N[:, 2] > 0.4) & (C[:, 1] > HC[1] - 1.0))]), sculpt=scales),
      blob('nose', HC + (0, -5.3, -1.6), 0.45, tris=6, region='nose'))
for sx in (1, -1):
    B.add('head', blob('ear', HC + (sx * 2.2, 1.2, 1.2), 0.6, tris=6, region='skin', squash=(0.5, 1.0, 1.0)))
B.add('tail', limb('tail', [(0, 10.4, 10.0), (2.6, 13.0, 7.4), (7.0, 12.0, 5.2), (10.4, 7.4, 4.2), (11.2, 2.4, 4.0), (10.0, -1.0, 4.0)], [3.6, 3.2, 2.7, 2.1, 1.4, 0.6],
                   tris=80, region='scales', n=8, cap1='point', sculpt=scales))
B.commit(F, bones={'base': 'root'}, kinds={'flies': 'led'})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('flies', (0, 2.0, 20.0), parent='body')
    R.bone('head', (0, -6.6, 10.4), parent='body')
    R.bone('tail', (0, 9.6, 10.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'flies', 'head', 'tail']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # it lifts its head slowly and looks up; the tail uncurls a little; the fireflies lift off their perches a touch
        k('head', 6)
        k('head', 26, rot=('X', -34))
        k('head', 34, rot=[('X', -34), ('Z', 10)])
        k('head', 46, rot=[('X', -34), ('Z', -8)])
        k('head', 62, rot=('X', -30))
        k('head', 80)
        k('tail', 8)
        k('tail', 28, rot=('Z', -12))
        k('tail', 62, rot=('Z', -12))
        k('tail', 80)
        k('flies', 14)
        k('flies', 30, move=(0, 0, 0.6))
        k('flies', 44, move=(0, 0, 0.2))
        k('flies', 58, move=(0, 0, 0.6))
        k('flies', 76)
        for b in allb:
            k(b, 88)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('floor', pt.ramp('#5a7a34', 7, shift=0.07), tone=sh, base=0.05, brush='fur')
    P.tint(P.region('floor') & (P.on[:, :, 2] < 0.6), pt.ramp('#5a4632', 6, shift=0.05), sh)                    # the earth at the edge
    P.tint(P.region('floor') & (np.sin(X * 1.7) * np.sin(Yc * 1.3) > 0.8), pt.ramp('#8aa040', 6), sh)           # lighter moss clumps
    P.fill('stone', pt.ramp('#8a8a84', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('bark', pt.ramp('#6a4a32', 6, shift=0.05), tone=sh, base=0.05, brush='wood')
    SC = pt.ramp('#9a7c4a', 7, shift=0.07)
    P.fill('scales', SC, tone=sh, base=0.1)
    sc = P.region('scales')
    v = Yc * 0.8 - Z * 0.5
    u = X * 0.8 + 0.5 * np.floor(v)
    P.shift(sc & ((np.mod(v, 1.0) > 0.82) | ((np.abs(np.mod(u, 1.0) - 0.5) > 0.44) & (np.mod(v, 1.0) > 0.3))), -2)   # the scale edges
    P.shift(sc & (np.mod(v, 1.0) < 0.18), 1)                                                                          # their worn lips
    P.tint(sc & (np.sin(X * 0.9 + Yc * 0.7) * np.sin(Z * 1.1) > 0.7) & (P.on[:, :, 2] > 0.2), pt.ramp('#6a8a3a', 6), sh)   # moss creeping in
    P.fill('moss', pt.ramp('#5f8a3a', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    P.fill('belly', pt.ramp('#c8a882', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('skin', pt.ramp('#b08a6a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('nose', pt.ramp('#2a2224', 5, light=0.6), tone=sh, base=0.3)
    P.fill('fir', pt.ramp('#2e5a3a', 7, shift=0.07), tone=sh, base=0.05, brush='fur')
    P.fill('leaf', pt.ramp('#4a7a34', 7, shift=0.07), tone=sh, base=0.05, brush='fur')
    P.fill('stem', pt.ramp('#efe4c8', 5), tone=sh, base=0.2)
    P.fill('shroom', pt.ramp('#d8783a', 6, shift=0.05), tone=sh, base=0.15, brush='gloss')
    P.fill('fly', pt.ramp('#e8f070', 5, light=0.6), tone=sh * 0.4, base=0.35)
    fc = face.Face(P, c=tuple(HC + (0, -2.6, 0.2)), axis=(0, -1, 0.35), where=P.region('skin'), seed=1261)
    fc.eyes('dot', spread=3.0, size=0.34, dy=0.5, uneven=0.2)
    fc.mouth('upturn', w=0.9, dy=-0.6, weight=0.18)
    P.lines(['scales', 'moss', 'belly'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=88, skip=[('head', 'body'), ('tail', 'body'), ('flies', 'body'), ('tail', 'base'), ('body', 'base')], fold=(0, 26, 40, 62))
