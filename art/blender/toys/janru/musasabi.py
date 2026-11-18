"""忍者ムササビ Ninja Flying Squirrel (series janru, concepts_E.md): the ninja genre, our own: a flying squirrel in an
indigo hood and suit with a long red scarf, crouched on a tiled roof ridge, her left hand up in a two-finger sign
before her face, a shuriken ready in her right; the gliding membranes folded along her sides, the flat tail laid
along the ridge behind.
Gimmick: she flings her arms wide, the membranes spread out like a cape, and the shuriken spins; then she folds back.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/musasabi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'musasabi')
B = Build()
RZ = 7.2   # the top of the ridge cap

# ------------------------------------------------------------------ the roof: two tiled slopes up to a ridge cap (running front to back), on a plinth
B.add('base', plinth(r=13.4, h=2.2, n=12, region='plaster', tris=50))
roof = tk.slab('roof', [(-9.0, 2.2), (9.0, 2.2), (0.0, RZ - 0.6)], 19.0, plane='XZ', at=0.0, bevel=0.3, segs=1)


def tiles(h):
    tk.push(h, lambda V, N: -0.25 * (np.abs(np.mod(V[:, 1], 2.4) - 1.2) > 1.05) * (np.abs(N[:, 2]) > 0.4))


B.add('base', low(roof, 'roof', 40, lo=0, hi=3, region='tile', sculpt=tiles))
B.add('base', low(tk.loft('ridge', [dict(c=(0, -10.0, RZ - 0.6), w=5.0, h=1.0, e=2.8), dict(c=(0, 10.0, RZ - 0.6), w=5.0, h=1.0, e=2.8)], n=8, up=(0, 0, 1),
                          cap0='round', cap1='round', capd=0.8), 'ridge', 20, lo=1, hi=2, region='tile'))
for sx in (1, -1):
    B.add('base', blob('onigawara', (0, sx * 10.2, RZ + 0.4), 1.6, tris=12, region='tile', squash=(1.2, 0.6, 1.0)))

# ------------------------------------------------------------------ the crouch: feet on the ridge, knees up, the flat tail along the ridge
for sx in (1, -1):
    B.add('body', shoe('foot', (sx * 1.6, 1.0, RZ + 0.4), (sx * 0.15, -1, 0), L=3.8, W=2.0, H=1.5, region='tabi', tris=20, toe_up=0.1))
    B.add('body', limb('thigh', [(sx * 2.2, 1.6, 12.8), (sx * 3.6, -2.6, 13.6), (sx * 1.8, -0.6, RZ + 1.6)], [2.0, 1.8, 1.3], tris=20, region='suit', n=8))
B.add('body', low(tk.loft('tail', [dict(c=(0, 3.2, 11.4), w=2.4, h=1.0), dict(c=(0.4, 6.6, 9.0), w=5.4, h=1.2), dict(c=(0.6, 10.4, 7.8), w=5.6, h=1.0),
                                   dict(c=(0.4, 12.6, 7.9), w=3.4, h=0.8)], n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8), 'tail', 30, lo=1, hi=2,
                  region='tailfur', sculpt=lambda h: tk.push(h, lambda V, N: 0.15 * np.sin(V[:, 0] * 4.0))))

# ------------------------------------------------------------------ the body, hunched forward; the scarf (knot and long tails streaming back)
TORSO = [dict(c=(0, 1.4, 11.8), w=6.4, h=3.0), dict(c=(0, 0.6, 15.6), w=6.2, h=2.8), dict(c=(0, -0.4, 19.0), w=6.8, h=2.8), dict(c=(0, -0.8, 20.4), w=3.6, h=1.8)]
B.add('body', low(tk.loft('torso', TORSO, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 110, lo=1, hi=3,
                  region=('suit', [('sash', lambda C, N: (C[:, 2] > 12.6) & (C[:, 2] < 13.6))]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.2 * np.exp(-((V[:, 2] - 13.1) / 0.45) ** 2))))
B.add('body', low(tk.lathe('scarf', [(2.4, 0), (3.6, 0.2), (3.7, 1.4), (3.0, 2.0), (2.2, 1.8)], n=10, centre=(0, -0.8, 19.8)), 'scarf', 30, lo=0, hi=2, region='scarf'))


def band(name, pts, ws, tris):
    """A flat cloth band (the scarf's tails) along pts."""
    return low(tk.loft(name, [dict(c=p, w=w, h=0.3) for p, w in zip(pts, ws)], n=6, up=(0, 0, 1), cap0='flat', cap1='flat'), name, tris, region='scarf')


B.add('body', band('scarf_t', [(1.4, 2.4, 20.6), (2.6, 5.6, 20.4), (3.6, 8.6, 18.6), (4.6, 10.8, 16.2)], [1.8, 2.0, 1.9, 1.6], 24),
      band('scarf_t2', [(0.6, 2.6, 20.2), (1.0, 5.4, 18.8), (1.8, 7.6, 16.6)], [1.6, 1.7, 1.4], 16))

# ------------------------------------------------------------------ the arms: the sign before her face; the shuriken hand low and out
SL, SR = V3(3.6, -0.2, 19.0), V3(-3.6, -0.2, 19.0)
WL = V3(1.2, -5.6, 21.4)
B.add('arm_l', limb('arm_l', [SL, (5.0, -3.6, 17.6), WL], [1.3, 1.1, 1.0], tris=16, region='suit', n=6),
      *hand('hand_l', WL, (-0.15, -0.1, 1.0), r=0.95, kind='point', region='fur', up=(0, -1, 0), tris=16))
WR = V3(-7.4, -3.2, 15.4)
SHU = WR + (-1.6, -1.0, 0.4)
B.add('arm_r', limb('arm_r', [SR, (-6.2, -0.8, 17.0), WR], [1.3, 1.1, 1.0], tris=16, region='suit', n=6),
      *hand('hand_r', WR, (-0.7, -0.5, 0.1), r=0.95, kind='mitt', region='fur', up=(0, 0, 1), tris=14))
star = tk.slab('shuriken', [(2.6, 0), (0.6, 0.6), (0, 2.6), (-0.6, 0.6), (-2.6, 0), (-0.6, -0.6), (0, -2.6), (0.6, -0.6)], 0.5, plane='XZ', at=0.0, bevel=0.15, segs=1)
tk.rotate(star, 20, 'Z')
tk.move(star, tuple(SHU))
B.add('shuriken', low(star, 'shuriken', 24, lo=0, hi=2, region='steel'))

# ------------------------------------------------------------------ the membranes, folded along her flanks (they spread)
for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
    o = tk.slab(nm, [(0.0, 19.0), (1.6, 18.0), (2.2, 15.0), (1.8, 12.4), (0.0, 12.0)], 0.6, plane='XZ', at=0.0, bevel=0.2, segs=1)
    tk.scale(o, (sx, 1, 1))
    tk.move(o, (sx * 3.0, 0.8, 0))
    B.add(nm, low(o, nm, 20, lo=0, hi=2, region='membrane'))

# ------------------------------------------------------------------ the head: the round squirrel head in its hood, the ears through, big cheeks
HC = V3(0, -1.6, 24.8)
head = tk.loft('head', [dict(c=tuple(HC + (0, 2.0, 0.2)), w=6.4, h=3.2), dict(c=tuple(HC), w=7.6, ht=3.6, hb=3.2), dict(c=tuple(HC + (0, -2.4, -0.8)), w=5.6, ht=2.4, hb=2.4)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)


def mask(C, N):  # the face opening of the hood: an oval band across the eyes
    return (C[:, 1] < HC[1] - 1.6) & (np.abs(C[:, 2] - HC[2] - 0.2) < 1.2) & (np.abs(C[:, 0]) < 3.0)


HP = [low(head, 'head', 110, lo=1, hi=3, region=('hood', [('fur', mask)])),
      blob('nose', HC + (0, -4.0, -0.2), 0.4, tris=8, region='nose'),
      limb('neck', [(0, -0.8, 20.4), HC + (0, 0.8, -2.2)], 1.6, tris=8, region='suit', n=6)]
for sx in (1, -1):
    HP.append(ear('ear', HC + (sx * 2.2, 0.6, 3.0), HC + (sx * 3.0, 1.0, 5.6), 2.2, th=0.8, region='hood', tris=10, cup=(sx * 0.3, -1, 0.1)))
HP.append(limb('knot', [HC + (0, 3.0, 0.8), HC + (0.6, 5.4, 1.4), HC + (1.0, 6.6, 0.6)], [0.7, 0.6, 0.4], tris=8, region='hood', n=5, cap1='flat'))
B.add('head', *HP)
B.commit(F, bones={'base': 'root'}, kinds={'shuriken': 'metal'})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, RZ), parent='root')
    R.bone('head', (0, -0.8, 20.4), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('shuriken', tuple(SHU), parent='arm_r', length=2.0, tail=tuple(SHU + (0, -2.0, 0)))
    R.bone('wing_l', (3.0, 0.8, 15.5), parent='body')
    R.bone('wing_r', (-3.0, 0.8, 15.5), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_l', 'arm_r', 'shuriken', 'wing_l', 'wing_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # she rises a little, flings her arms wide; the membranes spread like a cape; the shuriken spins
        k('body', 6, move=(0, 0, 0.8), ease='BACK')
        k('body', 60, move=(0, 0, 0.8))
        k('body', 70)
        k('arm_l', 4)
        k('arm_l', 12, rot=[('X', 30), ('Y', 60)], ease='BACK')
        k('arm_l', 60, rot=[('X', 30), ('Y', 60)])
        k('arm_l', 70)
        k('arm_r', 4)
        k('arm_r', 12, rot=('Y', -40), ease='BACK')
        k('arm_r', 60, rot=('Y', -40))
        k('arm_r', 70)
        for nm, sx in (('wing_l', 1), ('wing_r', -1)):
            k(nm, 6)
            k(nm, 14, scale=(3.0, 1.15, 1.0), rot=('Y', sx * 18), ease='BACK')
            k(nm, 60, scale=(3.0, 1.15, 1.0), rot=('Y', sx * 18))
            k(nm, 70)
        k('shuriken', 10)
        k('shuriken', 22, rot=('Y', 360), ease='LINEAR')
        k('shuriken', 34, rot=('Y', 720), ease='LINEAR')
        k('shuriken', 46, rot=('Y', 1080), ease='LINEAR')
        k('shuriken', 60, rot=('Y', 1440))
        k('head', 6)
        k('head', 12, rot=('X', -8), ease='BACK')
        k('head', 60, rot=('X', -8))
        k('head', 70)
        for b in allb:
            k(b, 76)
        k('shuriken', 76, rot=('Y', 1440))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('plaster', pt.ramp('#e2dccc', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('tile', pt.ramp('#4e5660', 7, shift=0.05, light=0.6), tone=sh, base=0.1, brush='gloss')
    tl = P.region('tile')
    P.shift(tl & (np.abs(np.mod(Yc, 2.4) - 1.2) > 1.08), -2)                                                                       # the tile rows
    P.fill('suit', pt.ramp('#2e3458', 7, shift=0.06, light=0.6), tone=sh, base=0.1, brush='cloth')
    P.fill('hood', pt.ramp('#2e3458', 7, shift=0.06, light=0.6), tone=sh, base=0.1, brush='cloth')
    P.fill('sash', pt.ramp('#5a3a2a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('tabi', pt.ramp('#26262e', 6, shift=0.04, light=0.6), tone=sh, base=0.1)
    P.fill('scarf', pt.ramp('#c8343a', 7, shift=0.07), tone=sh, base=0.1, brush='cloth')
    P.fill('fur', pt.ramp('#b08a62', 7, shift=0.06), tone=sh, base=0.15, brush='fur')
    P.fill('tailfur', pt.ramp('#9a7650', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.tint(P.region('tailfur') & (P.on[:, :, 2] < -0.2), pt.ramp('#e0cca8', 6), sh)
    P.fill('membrane', pt.ramp('#8a6a4a', 6, shift=0.05), tone=sh, base=0.1, brush='fur')
    P.fill('nose', pt.ramp('#2a2224', 5, light=0.6), tone=sh, base=0.3)
    P.fill('steel', pt.ramp('#8a9098', 6, shift=0.04, light=0.6), tone=sh, base=0.2, brush='metal')
    fc = face.Face(P, c=tuple(HC + (0, -3.2, 0.0)), axis=(0, -1, 0.1), where=P.region('fur') | P.region('hood'), seed=1251)
    fc.eyes('dot', spread=3.2, size=0.28, dy=0.4, uneven=0.2)
    fc.mouth('dash', w=0.8, dy=-1.0, weight=0.18)
    P.lines(['suit', 'hood', 'scarf', 'sash'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=76, skip=[('head', 'body'), ('arm_l', 'body'), ('arm_r', 'body'), ('shuriken', 'arm_r'), ('wing_l', 'body'), ('wing_r', 'body'),
                                         ('wing_l', 'arm_l'), ('wing_r', 'arm_r'), ('arm_l', 'head'), ('body', 'base')],
    fold=(0, 8, 14, 40))
