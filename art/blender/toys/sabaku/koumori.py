"""夜王コウモリ Night-Lord Bat (series sabaku, secret; concepts_E.md): a tall flying-fox aristocrat in a black tailcoat,
a crimson cravat, pinstripe trousers and spats, a monocle, the great opera cape lined crimson pooling on the sand and
its high collar standing up behind his head; leaning far back with one long-fingered hand spread over his face and
the other arm flung out, the cape draped from it like a wing. Perched on his collar, small: his spirit, a ghostly
stone gargoyle.
Gimmick: the gargoyle swells up behind him and throws its great wings wide over him, he tips his head further back
and sweeps the arm up; then all folds away.

    GG_FACET=1 tools/blender.sh art/blender/toys/sabaku/koumori.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('sabaku', 'koumori')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the drift; slim legs in pinstripes and spats
B.add('body', drift(r=14.8, seed=19))
B.add('body', shoe('shoe_l', (3.6, -2.0, GZ - 0.2), (0.35, -1, 0), L=6.2, W=3.0, H=2.2, region='shoe'))
B.add('body', shoe('shoe_r', (-3.2, 2.2, GZ - 0.2), (-0.3, -1, 0), L=6.2, W=3.0, H=2.2, region='shoe'))
B.add('body', limb('leg_l', [(3.8, -2.4, GZ + 1.6), (2.9, -0.4, 10.4), (2.4, 0.8, 15.4)], [1.9, 2.0, 2.4], tris=22, region='pants', n=8))
B.add('body', limb('leg_r', [(-3.3, 1.6, GZ + 1.6), (-2.8, 1.4, 10.4), (-2.4, 1.2, 15.4)], [1.9, 2.0, 2.4], tris=22, region='pants', n=8))
for x, y in ((3.8, -2.4), (-3.3, 1.6)):
    B.add('body', limb('spat', [(x, y, GZ + 1.0), (x, y, GZ + 3.4)], 2.2, tris=12, region='spats', n=8, cap0='flat', cap1='flat'))

# ------------------------------------------------------------------ the body arched far back: tailcoat, shirt front, cravat, coat tails
TORSO = [dict(c=(0, 0.8, 14.4), w=9.4, h=4.0), dict(c=(0, 1.4, 18.4), w=8.8, h=3.8), dict(c=(0, 2.6, 22.2), w=10.8, h=4.2),
         dict(c=(0, 3.8, 25.4), w=12.4, ht=3.8, hb=3.8, e=2.6), dict(c=(0, 4.4, 27.2), w=6.6, h=3.0)]


def shirt_front(C, N):
    return (N[:, 1] < -0.45) & (np.abs(C[:, 0]) < 0.6 + 0.32 * (C[:, 2] - 15.0)) & (C[:, 2] > 16.0)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 160, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * tk.bump(V, (0, -1.2, 24.4), 1.6, 0.8)),
                  region=('coat', [('pants', lambda C, N: C[:, 2] < 15.0), ('cravat', lambda C, N: shirt_front(C, N) & (C[:, 2] > 23.0)),
                                   ('shirt', shirt_front)])))
for sx in (1, -1):
    B.add('body', low(tk.loft('tails', [dict(c=(sx * 2.2, 4.4, 17.4), w=3.6, h=0.9), dict(c=(sx * 2.6, 6.2, 12.0), w=3.2, h=0.8),
                                        dict(c=(sx * 2.8, 7.2, 8.4), w=2.0, h=0.6)], n=6, up=(0, -1, 0.3), cap0='round', cap1='point'),
                      'tails', 14, lo=0, hi=2, region='coat'))

# ------------------------------------------------------------------ the opera cape: its back half pooled on the sand, lined crimson
cape = tk.loft('cape', [dict(c=(0, 4.6, 26.6), w=15.0, ht=4.6, hb=5.0), dict(c=(0, 5.6, 18.0), w=19.0, ht=6.4, hb=6.8),
                        dict(c=(0, 7.0, 8.4), w=23.0, ht=8.0, hb=8.6), dict(c=(0, 7.6, GZ + 0.2), w=25.0, ht=8.6, hb=9.4, e=2.2)],
               n=18, up=(0, -1, 0), cap0='flat', cap1='round')
tk.bisect(cape, (0, 4.2, 0), (0, 1, 0), keep='+', fill=True)
B.add('body', low(cape, 'cape', 140, lo=1, hi=2, region=('cape', [('lining', lambda C, N: (N[:, 1] < -0.9) & (np.abs(C[:, 1] - 4.2) < 0.1))]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.5 * np.cos(np.arctan2(V[:, 0], V[:, 1] - 4) * 7.0) ** 4 * tk.smoothstep(24.0, 10.0, V[:, 2]))))
# the high collar standing up behind his head, cupped round it (the inside is crimson)
col = tk.slab('collar', [(-7.6, 0.0), (-9.8, 6.4), (-7.0, 7.4), (-4.6, 10.6), (-1.8, 8.2), (0.0, 9.4), (1.8, 8.2), (4.6, 10.6), (7.0, 7.4), (9.8, 6.4),
                         (7.6, 0.0)], 0.9, plane='XZ', at=0.0, bevel=0.35, segs=1)
tk.subsurf(col, 1)
tk.deform(col, lambda V: V + np.stack([0 * V[:, 0], -0.07 * V[:, 0] ** 2 + 0.3 * V[:, 2], 0 * V[:, 0]], 1))
tk.move(col, (0, 8.4, 25.4))
B.add('body', low(col, 'collar', 70, lo=0, hi=1, region=('cape', [('lining', lambda C, N: N[:, 1] < -0.3)])))

# ------------------------------------------------------------------ the arms: a hand spread over his face, the other flung out with the cape
SR, SL = V3(-6.2, 3.6, 25.4), V3(6.2, 3.6, 25.4)
WR = V3(-2.6, -4.6, 30.4)
B.add('arm_r', limb('arm_r', [SR, (-9.0, -1.0, 26.6), WR], [2.3, 2.0, 1.6], tris=28, region='coat', n=8))
B.add('arm_r', limb('cuff_r', [WR + (0.3, -0.1, 0.4), WR + (0.7, -0.2, 0.9)], 1.7, tris=10, region='shirt', n=8, cap0='flat', cap1='flat'))
B.add('arm_r', *hand('hand_r', WR + (0.8, -0.3, 1.2), (0.45, -0.25, 1), r=1.5, kind='open', region='skin', up=(0, -1, 0)))
WL = V3(16.0, 1.6, 19.6)
B.add('arm_l', limb('arm_l', [SL, (11.4, 3.2, 23.2), WL], [2.3, 2.0, 1.6], tris=28, region='coat', n=8))
B.add('arm_l', *hand('hand_l', WL + (0.6, -0.1, -0.3), (1, -0.3, -0.45), r=1.5, kind='open', region='skin', up=(0, 0, 1)))
drape = tk.slab('drape', [(5.4, 25.0), (11.0, 23.6), (15.6, 20.2), (14.4, 16.0), (12.6, 12.4), (10.6, 14.6), (8.4, 10.6), (6.0, 14.4)], 0.7,
                plane='XZ', at=0.0, bevel=0.25, segs=1)
tk.move(drape, (0, 3.6, 0))
tk.deform(drape, lambda V: V + np.stack([0 * V[:, 0], 0.6 * np.sin(V[:, 0] * 0.9) + 0.05 * (25 - V[:, 2]), 0 * V[:, 0]], 1))
B.add('arm_l', low(drape, 'drape', 40, lo=0, hi=1, region=('cape', [('lining', lambda C, N: N[:, 1] < -0.3)])))

# ------------------------------------------------------------------ the head thrown back: a fox face, tall ears, a monocle
NECK = (0, 4.4, 27.4)
head = tk.loft('head', [dict(c=(0, 5.6, 32.0), w=6.6, h=3.6), dict(c=(0, 3.2, 31.8), w=7.8, ht=3.8, hb=3.4),
                        dict(c=(0, 0.2, 31.0), w=5.2, h=2.6), dict(c=(0, -2.6, 30.4), w=2.6, ht=1.3, hb=1.5)],
               n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.9)
HP = [low(head, 'head', 100, lo=1, hi=3, region=('fur', [('muzzle', lambda C, N: C[:, 1] < 0.4)])),
      limb('neck', [NECK, (0, 4.2, 30.4)], 2.6, tris=12, region='mantle', n=6), blob('nose', (0, -3.2, 30.8), 0.6, tris=10, region='nose')]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 2.6, 4.6, 34.2), (sx * 4.0, 5.6, 39.4), 3.0, th=0.9, region='fur', tris=12, cup=(sx * 0.3, -1, 0.2)))
mono = [(2.0 + 1.0 * math.cos(a), -0.6, 32.4 + 1.0 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
HP.append(limb('monocle', mono + [mono[0]], 0.3, tris=16, region='gold', n=4))
HP.append(limb('mono_chain', [(3.0, -0.6, 32.0), (3.8, 0.6, 29.6), (3.4, 1.0, 27.2)], 0.2, tris=8, region='gold', n=4))
for a, b in HP:
    for o in (a, b):
        tk.rotate(o, -20, 'X', pivot=NECK)
B.add('head', *HP)

# ------------------------------------------------------------------ the spirit: a ghostly stone gargoyle on his collar, wings folded
G = 2.6
Q_FULL = V3(-6.0, 12.6, 30.0)
Q_REST = V3(-4.6, 9.4, 33.4)


def place(o):
    tk.move(o, tuple(-Q_FULL))
    tk.scale(o, (1 / G, 1 / G, 1 / G))
    tk.move(o, tuple(Q_REST))


def shrunk(p):
    return tuple((np.asarray(p, float) - Q_FULL) / G + Q_REST)


q = Q_FULL
SP = [low(tk.loft('sp_body', [dict(c=tuple(q + (0, 1.6, -6.0)), w=8.0, h=3.6), dict(c=tuple(q + (0, 0.6, -1.0)), w=9.4, h=4.4),
                              dict(c=tuple(q + (0, -0.6, 3.6)), w=11.4, ht=4.4, hb=4.6, e=2.5), dict(c=tuple(q + (0, -1.0, 6.0)), w=6.4, h=3.4)],
                  n=10, up=(0, -1, 0), cap0='round', cap1='round'), 'sp_body', 60, lo=1, hi=2, region='spirit')]
GH = q + (0, -3.0, 9.0)
SP.append(low(tk.loft('sp_head', [dict(c=tuple(GH + (0, 2.0, 0)), w=5.4, h=3.0), dict(c=tuple(GH), w=6.0, ht=3.2, hb=3.0),
                                  dict(c=tuple(GH + (0, -2.8, -1.0)), w=4.4, ht=1.8, hb=2.4)], n=8, up=(0, 0, 1), cap0='round', cap1='round'),
              'sp_head', 30, lo=1, hi=2, region='spirit'))
for sx in (1, -1):
    SP.append(limb('sp_horn', [GH + (sx * 1.8, 0.6, 2.4), GH + (sx * 3.4, 1.6, 4.4), GH + (sx * 3.0, 3.4, 5.6)], [0.8, 0.5, 0.1], tris=10,
                   region='spirit', n=5, cap1='point'))
    sh_ = q + (sx * 5.0, -0.4, 3.6)
    kn = q + (sx * 4.6, -4.6, -4.0)
    SP.append(limb('sp_thigh', [q + (sx * 3.4, 0.6, -5.0), kn, q + (sx * 4.0, -2.6, -9.6)], [2.4, 2.2, 1.6], tris=20, region='spirit', n=6))
    SP.append(limb('sp_arm', [sh_, q + (sx * 6.4, -3.6, -0.6), kn + (0, -1.0, 1.4)], [1.8, 1.6, 1.4], tris=18, region='spirit', n=6))
SP.append(limb('sp_tail', [q + (0, 3.6, -6.4), q + (2.0, 7.0, -8.4), q + (4.6, 8.0, -6.6)], [1.2, 0.9, 0.2], tris=12, region='spirit', n=5, cap1='point'))
WINGS = {}
for nm, sx in (('sp_wing_l', 1), ('sp_wing_r', -1)):
    root = q + (sx * 3.4, 1.8, 4.6)
    pts = [(0.0, 0.0), (2.6, 1.0), (5.0, -1.4), (5.6, -5.0), (5.0, -9.0), (4.0, -12.4), (2.6, -10.0), (1.4, -12.0), (0.4, -9.4), (-0.6, -10.6), (-1.2, -6.0)]
    w = tk.slab(nm, [(sx * c_, z_) for c_, z_ in pts][::sx], 1.0, plane='XZ', at=0.0, bevel=0.35, segs=1)
    tk.move(w, tuple(root + (0, 1.2, 0)))
    WINGS[nm] = (low(w, nm, 36, lo=1, hi=2, region='wing',
                     sculpt=lambda h: tk.push(h, lambda V, N: -0.25 * (np.abs(np.mod(V[:, 0] * 0.7 + V[:, 2] * 0.15, 2.0) - 1.0) < 0.15))), root)
for a, b in SP + [v[0] for v in WINGS.values()]:
    for o in (a, b):
        place(o)
B.add('spirit', *SP)
for nm, (pc, root) in WINGS.items():
    B.add(nm, pc)
B.commit(F, kinds={'spirit': 'glass', 'sp_wing_l': 'glass', 'sp_wing_r': 'glass'}, uvw={'spirit': 1.8, 'sp_wing_l': 1.6, 'sp_wing_r': 1.6})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    R.bone('spirit', tuple(Q_REST), parent='body')
    for nm, (pc, root) in WINGS.items():
        R.bone(nm, shrunk(root), parent='spirit')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'spirit', 'sp_wing_l', 'sp_wing_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he throws his head back further and sweeps the caped arm up; the gargoyle swells behind him
        k('head', 6)
        k('head', 16, rot=('X', -12), ease='BACK')
        k('head', 72, rot=('X', -12))
        k('head', 82)
        k('arm_l', 8)
        k('arm_l', 18, rot=('Y', -26), ease='BACK')
        k('arm_l', 72, rot=('Y', -26))
        k('arm_l', 84)
        k('arm_r', 10)
        k('arm_r', 18, rot=('X', -6), ease='BACK')
        k('arm_r', 72, rot=('X', -6))
        k('arm_r', 82)
        spirit_keys(k, 'spirit', 4, 18, 74, 88, G, tuple(Q_FULL - Q_REST))
        # the great wings thrown wide over him, two slow beats
        for nm, sx in (('sp_wing_l', 1), ('sp_wing_r', -1)):
            k(nm, 18)
            k(nm, 28, rot=('Y', -sx * 120), ease='BACK')
            k(nm, 40, rot=('Y', -sx * 96))
            k(nm, 50, rot=('Y', -sx * 126))
            k(nm, 60, rot=('Y', -sx * 100))
            k(nm, 68, rot=('Y', -sx * 120))
            k(nm, 78)
        for b in allb:
            k(b, 90)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sand(P, pt, sh)
    BLACK = pt.ramp('#25222c', 7, shift=0.08, light=0.55)
    P.fill('coat', BLACK, tone=sh, base=0.05)
    P.fill('cape', BLACK, tone=sh, base=0.0)
    P.fill('lining', pt.ramp('#a3222c', 7, shift=0.06), tone=sh, base=0.1, brush='gloss')
    P.fill('shirt', pt.ramp('#f1ebdf', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('cravat', pt.ramp('#b02a34', 6, shift=0.06), tone=sh, base=0.15)
    P.fill('pants', pt.ramp('#3a3844', 6, shift=0.06), tone=sh, base=0.0)
    P.tint(P.region('pants') & (np.abs(np.mod(X * 1.1 + 0.2 * Yc, 1.4) - 0.7) < 0.12), pt.ramp('#8a8698', 5), sh)   # pinstripes
    P.fill('spats', pt.ramp('#e8e2d4', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('shoe', pt.ramp('#1e1c22', 5, shift=0.06, light=0.6), tone=sh, base=0.15, brush='gloss')
    P.fill('fur', pt.ramp('#3a2e2a', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('mantle', pt.ramp('#b0703a', 6, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('muzzle', pt.ramp('#5a4436', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('skin', pt.ramp('#4a3a36', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('skin_claw', pt.ramp('#efe4c8', 5), tone=sh, base=0.2)
    P.fill('nose', pt.ramp('#1a1618', 5, light=0.6), tone=sh, base=0.3)
    P.fill('gold', pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08), tone=sh, base=0.2)
    # the face (thrown back, his own fingers across it): one wide eye through the monocle, a little fang-grin
    hd = (P.region('fur') | P.region('muzzle')) & (Z > 28)
    import math as m
    ax = (0, -m.cos(m.radians(20)) - 0.0, m.sin(m.radians(20)) + 0.15)
    fc = face.Face(P, c=(0, -1.6, 33.4), axis=ax, where=hd, seed=951, ink='#efe4c8')
    fc.eyes('dot', spread=4.0, size=0.42, dy=0.6, uneven=0.3)
    fc.brows('raised', spread=4.4, dy=1.8, w=1.6, weight=0.3)
    fm = face.Face(P, c=(0, -3.0, 30.6), axis=ax, where=hd, seed=952, ink='#efe4c8')
    fm.mouth('smug', w=1.8, dy=-0.4, weight=0.28)
    fm.fangs(dy=-0.7, gap=0.9, n=2, size=0.35)
    # the spirit: a ghostly lilac-grey stone gargoyle, its wings deeper
    ghost(P, pt, 'spirit', '#9c96c4', sh)
    ghost(P, pt, 'wing', '#6a5c9c', sh)
    P.lines(['coat', 'cape', 'shirt'], step=1)
    P.lines(['spirit'], col='#3c3666', step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=90, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('arm_r', 'head'), ('spirit', 'body'),
                                         ('sp_wing_l', 'spirit'), ('sp_wing_r', 'spirit'), ('sp_wing_l', 'body'), ('sp_wing_r', 'body'),
                                         ('spirit', 'head'), ('sp_wing_l', 'head'), ('sp_wing_r', 'head'), ('sp_wing_l', 'arm_l'),
                                         ('sp_wing_r', 'arm_r'), ('sp_wing_l', 'arm_r'), ('sp_wing_r', 'arm_l'), ('spirit', 'arm_l'), ('spirit', 'arm_r')],
    fold=(0, 18, 30, 50))
