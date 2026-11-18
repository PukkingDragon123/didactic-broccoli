"""大親分コブラ Cobra Don (series datesha, secret; concepts_E.md): the head of the dandy gang, a king cobra coiled on
his marble plinth with his upper body reared up, wearing a white double-breasted jacket printed with little gold
crescent moons, its empty sleeves draped over his "shoulders" like a cape, a black silk scarf and a cream fedora, his
hood folded close.
Gimmick (pose change): he rears up higher, the hood flares wide behind the hat, the head dips to stare you down and
the forked tongue flicks; then he settles.

    GG_FACET=1 tools/blender.sh art/blender/toys/datesha/kobura.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('datesha', 'kobura')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the plinth and the coils: two turns of a fat body, the tail tip curling out
B.add('base', plinth(r=14.2, n=16))
coil = [(r * math.cos(a), 1.0 + r * math.sin(a), GZ + 1.9 + 1.5 * (a / (2 * math.pi))) for a, r in zip(np.linspace(-0.6, 4.0 * math.pi, 26), np.linspace(10.4, 5.6, 26))]
tip = [(10.4 * math.cos(-0.6 - t), 1.0 + 10.4 * math.sin(-0.6 - t), GZ + 1.2 - 0.2 * t) for t in (0.3, 0.6)]


def scales(h):
    def f(V, N):
        a = np.arctan2(V[:, 1] - 1.0, V[:, 0]) * 9.0
        return -0.15 * (np.abs(np.sin(a + V[:, 2] * 2.0)) > 0.9)
    tk.push(h, f)


B.add('body', limb('coil', tip[::-1] + coil, [0.6, 1.3] + list(np.linspace(2.0, 3.2, 26)), tris=150, region='scales', n=8, sculpt=scales, cap0='point'))
UP = [V3(0, 1.0, 8.6), V3(0, 0.8, 12.6), V3(0, 0.2, 17.0), V3(0, -0.4, 21.6), V3(0, -0.4, 25.0)]
B.add('body', limb('rise', UP, [3.2, 3.2, 3.0, 2.8, 2.6], tris=40, region='scales', n=8, sculpt=scales))

# ------------------------------------------------------------------ the jacket on his reared-up body, sleeves hanging empty, the scarf
J = [dict(c=(0, 0.0, 14.6), w=10.6, ht=4.6, hb=4.8), dict(c=(0, -0.2, 18.4), w=10.8, ht=4.6, hb=4.8), dict(c=(0, -0.4, 22.2), w=12.6, ht=4.2, hb=4.4, e=2.6),
     dict(c=(0, -0.4, 24.2), w=6.4, h=3.2)]


def lap(C, N):
    return (N[:, 1] < -0.4) & (np.abs(C[:, 0] + 0.8) < 0.4 + 0.45 * (C[:, 2] - 16.0)) & (C[:, 2] > 16.0)


B.add('body', low(tk.loft('jacket', J, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'jacket', 140, lo=1, hi=3, region=('jacket', [('scarf', lap)]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (lap(V, N) == 0) * (N[:, 1] < -0.4) * (V[:, 2] > 16.0))))
for sx in (1, -1):
    B.add('body', limb('sleeve', [(sx * 6.0, 0.4, 22.6), (sx * 7.4, 0.8, 18.0), (sx * 7.2, 1.0, 12.8)], [2.0, 2.0, 1.8], tris=22, region='jacket', n=8,
                       cap1='flat'))

# ------------------------------------------------------------------ the hood (folded close; it flares), the head, the fedora, the tongue
HOOD0 = V3(0, 1.6, 26.0)
hood = tk.slab('hood', [(-3.0, -2.6), (-4.6, 0.8), (-4.4, 4.6), (-2.4, 7.0), (0.0, 7.6), (2.4, 7.0), (4.4, 4.6), (4.6, 0.8), (3.0, -2.6)], 1.0, plane='XZ',
               at=0.0, bevel=0.35, segs=1)
tk.move(hood, tuple(HOOD0))
tk.deform(hood, lambda V: V + np.stack([0 * V[:, 0], 0.15 * V[:, 0] ** 2, 0 * V[:, 0]], 1))
hp = low(hood, 'hood', 40, lo=1, hi=2, region=('hoodback', [('hoodfront', lambda C, N: N[:, 1] < -0.3)]))
for o in hp:
    tk.scale(o, (0.45, 1, 1), pivot=tuple(HOOD0))
B.add('hood', hp)
NECK = (0, -0.4, 25.0)
HC = V3(0, -2.4, 29.6)
head = tk.loft('head', [dict(c=tuple(HC + (0, 3.0, -0.6)), w=4.8, h=2.6), dict(c=tuple(HC), w=6.4, ht=2.6, hb=2.2), dict(c=tuple(HC + (0, -3.4, -0.4)), w=4.6, ht=1.8, hb=1.6)],
               n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HP = [low(head, 'head', 70, lo=1, hi=3, region='scales'), limb('neck', [NECK, HC + (0, 2.4, -1.0)], 2.4, tris=12, region='scales', n=8)]
fed = tk.lathe('fedora', [(0, 0), (3.6, 0), (3.6, 2.6), (2.8, 3.4), (0, 3.0)], n=12, centre=tuple(HC + (0, 0.6, 2.0)))
tk.deform(fed, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], -0.8 * np.exp(-(V[:, 0] / 1.0) ** 2) * (V[:, 2] > HC[2] + 4.4)], 1))   # the pinch
HP.append(low(fed, 'fedora', 40, lo=1, hi=2, region=('hat', [('hatband', lambda C, N: (C[:, 2] < HC[2] + 2.9) & (np.abs(N[:, 2]) < 0.6))])))
HP.append(low(tk.lathe('brim', [(0, -0.2), (6.0, -0.3), (6.4, 0.2), (0, 0.2)], n=14, centre=tuple(HC + (0, 0.6, 2.1))), 'brim', 30, lo=0, hi=2, region='hat'))
for a, b in HP[-2:]:
    for o in (a, b):
        tk.rotate(o, 10, 'X', pivot=tuple(HC + (0, 0.6, 2.0)))
        tk.rotate(o, -8, 'Y', pivot=tuple(HC + (0, 0.6, 2.0)))
B.add('head', *HP)
T0 = HC + (0, -5.6, -0.8)
B.add('tongue', limb('tongue', [T0 + (0, 1.6, 0), T0 + (0, -0.6, -0.2)], [0.3, 0.25], tris=6, region='tongue', n=4),
      limb('fork_l', [T0 + (0, -0.6, -0.2), T0 + (0.6, -1.8, -0.4)], [0.22, 0.05], tris=4, region='tongue', n=4, cap1='point'),
      limb('fork_r', [T0 + (0, -0.6, -0.2), T0 + (-0.6, -1.8, -0.4)], [0.22, 0.05], tris=4, region='tongue', n=4, cap1='point'))
B.commit(F, bones={'base': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pose change)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 1.0, 8.6), parent='root')
    R.bone('hood', tuple(HOOD0), parent='body')
    R.bone('head', NECK, parent='body')
    R.bone('tongue', tuple(T0 + (0, 1.6, 0)), parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'hood', 'head', 'tongue']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he rears up, the hood flares, the head dips to stare you down; the tongue flicks, twice
        k('body', 6)
        k('body', 16, move=(0, 0, 1.6), rot=('X', -4), ease='BACK')
        k('body', 64, move=(0, 0, 1.6), rot=('X', -4))
        k('body', 74)
        k('hood', 8)
        k('hood', 18, scale=(2.4, 1.0, 1.15), ease='BACK')
        k('hood', 64, scale=(2.4, 1.0, 1.15))
        k('hood', 74)
        k('head', 14)
        k('head', 22, rot=('X', 12), ease='BACK')
        k('head', 64, rot=('X', 12))
        k('head', 72)
        k('tongue', 0, move=(0, 1.8, 0))
        for f in (24, 40):
            k('tongue', f, move=(0, 1.8, 0))
            k('tongue', f + 3, ease='LINEAR')
            k('tongue', f + 5, rot=('Z', 8))
            k('tongue', f + 7, rot=('Z', -8))
            k('tongue', f + 10, move=(0, 1.8, 0))
        for b in allb[:-1]:
            k(b, 80)
        k('tongue', 80, move=(0, 1.8, 0))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('marble', pt.ramp('#e9e4da', 6, shift=0.04), tone=sh, base=0.1)
    mb = P.region('marble') & (P.on[:, :, 2] > 0.5)
    P.tint(mb & ((np.floor(X / 3.0) + np.floor(Yc / 3.0)) % 2 == 0), pt.ramp('#2a2a30', 6, shift=0.05), sh)
    P.fill('scales', pt.ramp('#5a6a3a', 7, shift=0.07), tone=sh, base=0.1)
    sc = P.region('scales')
    P.tint(sc & (np.abs(np.sin(np.arctan2(Yc - 1.0, X) * 4.0 + Z * 0.9)) > 0.9), pt.ramp('#d8c070', 6), sh)          # pale bands
    P.fill(sc & (P.on[:, :, 1] < -0.5) & (Z > 12), pt.ramp('#e0d4a0', 6, shift=0.04), tone=sh, base=0.15)            # the belly up the front
    P.fill('jacket', pt.ramp('#f2eee4', 6, shift=0.03), tone=sh, base=0.15)
    jk = P.region('jacket')
    who, d = P.dabs(jk, size=0.55, spacing=3.0, seed=81)
    moon = jk & (who >= 0) & (d < 0.8)
    who2, d2 = P.dabs(jk, size=0.55, spacing=3.0, seed=81)
    P.tint(moon, pt.ramp('#d6a640', 5), sh)
    for z in (17.2, 19.6):
        for x in (-2.6, 1.6):
            P.flat(jk & (np.hypot(X - x, Z - z) < 0.45) & (Yc < -3), '#2a2426')
    P.fill('scarf', pt.ramp('#26242c', 6, shift=0.05, light=0.6), tone=sh, base=0.15, brush='gloss')
    P.fill('hoodback', pt.ramp('#4a5a32', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('hoodfront', pt.ramp('#e0d4a0', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('hoodfront') & (np.abs(np.mod(Z, 1.6) - 0.8) < 0.18), pt.ramp('#3a3a2a', 5), sh)
    P.fill('hat', pt.ramp('#e9dcc0', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('hatband', pt.ramp('#26242c', 5, light=0.6), tone=sh, base=0.1)
    P.fill('tongue', pt.ramp('#c8343a', 5), tone=sh, base=0.2)
    # the face: small hard dots under heavy brows, a thin cruel line of a mouth
    hd = P.region('scales') & (Z > 27.5)
    fc = face.Face(P, c=tuple(HC + (0, -3.4, 0.6)), axis=(0, -1, 0.15), where=hd, seed=1151, ink='#1a1818')
    fc.eyes('dot', spread=4.6, size=0.45, dy=0.4, uneven=0.2)
    fc.brows('angry', spread=5.0, dy=1.2, w=1.8, weight=0.42)
    fc.mouth('line', w=3.0, dy=-1.4, weight=0.26)
    P.lines(['jacket', 'scarf', 'hat', 'hatband'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('hood', 'body'), ('hood', 'head'), ('tongue', 'head'), ('body', 'base')], fold=(0, 16, 26, 50))
