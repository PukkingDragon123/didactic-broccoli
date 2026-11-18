"""刺客ハイエナ Assassin Hyena (series sabaku, concepts_E.md): the villain's hired grinner, a spotted hyena in a
striped sleeveless vest, a wound turban, a yellow sash and baggy purple trousers, in a low wide crouch with one clawed
hand thrust low and the other raised high, head down, the big toothy grin. Coiled on his back, small: his spirit, a
ghostly cobra.
Gimmick: the cobra swells up behind him, its hood flares, and it lunges over his shoulder snapping, twice; then it
shrinks back.

    GG_FACET=1 tools/blender.sh art/blender/toys/sabaku/hyena.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('sabaku', 'hyena')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the drift; the wide crouch in baggy trousers, bare paws
B.add('body', drift(r=14.6, seed=11))
for sx in (1, -1):
    hp, kn, an = V3(sx * 3.4, 0.6, 13.0), V3(sx * 7.6, -2.4, 9.8), V3(sx * 6.6, -0.4 + 0.8 * (sx < 0), GZ + 1.6)
    B.add('body', limb('thigh', [hp, kn], [3.3, 3.1], tris=22, region='pants', n=8,
                       sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * np.sin(V[:, 2] * 2.4 + V[:, 0]) ** 8)))
    B.add('body', limb('shin', [kn, an + (0, 0, 0.8)], [3.0, 1.7], tris=20, region='pants', n=8))
    B.add('body', limb('cuff', [an + (0, 0, 1.6), an + (0, 0, 0.2)], 1.8, tris=12, region='sash', n=8))
    B.add('body', shoe('paw', an + (0, 1.2, -1.6 - 0.2), (sx * 0.5, -1, 0), L=5.6, W=3.6, H=2.2, region='fur'))
    for i in (-1, 0, 1):
        c0 = an + V3(sx * 0.5, -1, 0) * 4.6 / 1.12 + (i * 1.0, 0, -1.2)
        B.add('body', blob('toe', c0, 0.5, tris=8, region='claw', squash=(1, 1.3, 0.8), lo=0, hi=1))

# ------------------------------------------------------------------ the hunched body: a sloped back, big shoulders; the sash, a short tail
TORSO = [dict(c=(0, 1.2, 12.4), w=10.4, ht=4.6, hb=4.8), dict(c=(0, 0.4, 16.0), w=10.8, ht=5.4, hb=5.4),
         dict(c=(0, -0.8, 20.0), w=12.6, ht=5.6, hb=5.6), dict(c=(0, -2.0, 23.4), w=14.0, ht=5.0, hb=5.2, e=2.6),
         dict(c=(0, -2.6, 25.2), w=8.2, ht=3.4, hb=3.6)]
B.add('body', low(tk.loft('torso', TORSO, n=16, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 200, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * tk.smoothstep(0.8, 0.2, np.abs(V[:, 2] - 14.8))),
                  region=('vest', [('pants', lambda C, N: C[:, 2] < 13.6), ('sash', lambda C, N: (C[:, 2] >= 13.6) & (C[:, 2] < 16.0)),
                                   ('fur', lambda C, N: C[:, 2] > 24.6)])))
B.add('body', limb('sash_end', [(4.6, -3.4, 14.8), (6.4, -3.6, 12.6), (7.2, -3.2, 11.0)], [1.2, 1.0, 0.5], tris=14, region='sash', n=6, cap1='point'))
B.add('body', limb('tail', [(0, 4.8, 13.4), (0, 7.6, 11.8), (0.6, 8.8, 9.0)], [1.4, 1.5, 0.6], tris=18, region='mane', n=6, cap1='point'))
B.add('body', limb('mane', [(0, 2.2, 23.6), (0, 0.4, 27.2), (0, -1.6, 29.2)], [1.3, 1.2, 0.5], tris=14, region='mane', n=6, cap1='point',
                   sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (np.sin(V[:, 2] * 5.0) > 0.4))))

# ------------------------------------------------------------------ the arms: one claw low ahead, one raised high
SR, SL = V3(-7.2, -2.2, 23.2), V3(7.2, -2.2, 23.2)
WR, WL = V3(-9.2, -12.6, 16.6), V3(13.8, -4.8, 31.6)
B.add('arm_r', limb('arm_r', [SR, (-11.0, -6.6, 19.6), WR], [2.4, 2.2, 1.6], tris=30, region='fur', n=8))
B.add('arm_r', *hand('hand_r', WR, (0.1, -1, -0.15), r=1.8, kind='claw', region='fur', up=(0, 0, 1)))
B.add('arm_l', limb('arm_l', [SL, (12.2, -1.8, 26.6), WL], [2.4, 2.2, 1.6], tris=30, region='fur', n=8))
B.add('arm_l', *hand('hand_l', WL, (0.2, -0.6, 1), r=1.8, kind='claw', region='fur', up=(0, -1, 0)))

# ------------------------------------------------------------------ the head, low and forward: broad skull, heavy muzzle, round ears, the turban
NECK = (0, -2.6, 25.0)
head = tk.loft('head', [dict(c=(0, -3.0, 29.4), w=7.6, h=3.8), dict(c=(0, -5.8, 29.2), w=9.8, ht=4.6, hb=4.2),
                        dict(c=(0, -9.4, 27.8), w=7.0, ht=3.0, hb=3.4), dict(c=(0, -12.2, 27.2), w=5.2, ht=2.2, hb=2.6, e=2.4)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)


def sc_head(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        grin = -0.4 * np.exp(-((z - 26.4 + 0.05 * x ** 2) / 0.3) ** 2) * (y < -8.6)       # the wide mouth line, curling up at the ends
        return grin + 0.4 * tk.bump(V, (0, -13.6, 28.0), 1.1, 0.6)                          # the nose
    tk.push(h, f)


HP = [low(head, 'head', 120, lo=1, hi=3, sculpt=sc_head, region=('fur', [('muzzle', lambda C, N: C[:, 1] < -9.6)]))]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 3.6, -3.4, 32.4), (sx * 5.4, -2.6, 36.0), 3.8, th=1.0, region='fur', tris=12, cup=(sx * 0.4, -1, 0.1)))
TB = (0, -4.8, 32.4)
HP.append(low(tk.lathe('turban', [(0, 0), (4.6, 0), (5.0, 1.2), (4.6, 2.6), (3.0, 3.8), (0, 4.0)], n=12, centre=TB), 'turban', 70, lo=1, hi=2,
              region='turban', sculpt=lambda h: tk.push(h, lambda V, N: -0.3 * (np.abs(np.mod(V[:, 2] + 0.5 * V[:, 0], 1.3) - 0.65) < 0.12))))
HP.append(limb('turban_tail', [(0, -0.6, 33.6), (0.4, 2.6, 31.4), (1.4, 4.0, 27.6)], [1.0, 1.0, 0.4], tris=12, region='turban', n=6, cap1='point'))
B.add('head', *HP)

# ------------------------------------------------------------------ the spirit: a ghostly cobra, coiled small on his back
G = 2.5
Q_FULL = V3(6.0, 9.6, 20.0)
Q_REST = V3(0.0, 4.6, 20.6)


def place(o):
    tk.move(o, tuple(-Q_FULL))
    tk.scale(o, (1 / G, 1 / G, 1 / G))
    tk.move(o, tuple(Q_REST))


def shrunk(p):
    return tuple((np.asarray(p, float) - Q_FULL) / G + Q_REST)


q = Q_FULL
import math  # noqa: E402
coil = [q + (4.2 * math.cos(a), 4.2 * math.sin(a), -6.0 + 0.5 * a) for a in np.linspace(0, 2 * math.pi * 1.25, 11)]
SP = [limb('sp_coil', coil + [q + (-1.0, -1.0, 2.0), q + (0.0, 0.0, 6.0)], [1.6] + [2.4] * 10 + [2.2, 2.1], tris=90, region='spirit', n=8,
           cap0='point',
           sculpt=lambda h: tk.push(h, lambda V, N: -0.2 * (np.abs(np.sin((V[:, 0] + V[:, 1] + V[:, 2]) * 1.6)) > 0.94)))]
BEND = q + (0.0, 0.0, 6.0)
NK = [limb('sp_neck', [BEND, BEND + (0, -0.6, 4.6), BEND + (0, -1.0, 9.0)], [2.1, 2.0, 1.9], tris=24, region='belly', n=8)]
HD = BEND + (0, -2.4, 11.4)
NK.append(low(tk.loft('sp_head', [dict(c=tuple(HD + (0, 1.6, 0.0)), w=3.8, h=1.6), dict(c=tuple(HD), w=4.6, ht=1.8, hb=1.4),
                                  dict(c=tuple(HD + (0, -2.4, -0.4)), w=3.2, ht=1.2, hb=0.8)], n=8, up=(0, 0, 1), cap0='round', cap1='round'),
              'sp_head', 30, lo=1, hi=2, region='spirit'))
for sx in (1, -1):
    NK.append(limb('sp_fang', [HD + (sx * 0.9, -2.2, -1.0), HD + (sx * 0.9, -2.4, -2.6)], [0.35, 0.05], tris=8, region='fang', n=5, cap1='point'))
HOOD0 = BEND + (0, 0.6, 7.6)
hood = tk.slab('sp_hood', [(-3.0, -4.6), (-4.4, -1.4), (-4.0, 2.2), (-1.8, 4.0), (0.0, 4.4), (1.8, 4.0), (4.0, 2.2), (4.4, -1.4), (3.0, -4.6)],
               0.9, plane='XZ', at=0.0, bevel=0.35, segs=1)
tk.move(hood, tuple(HOOD0))
tk.deform(hood, lambda V: V + np.stack([0 * V[:, 0], 0.12 * (V[:, 0] - HOOD0[0]) ** 2, 0 * V[:, 0]], 1))   # cupped round the neck
HOOD = [low(hood, 'sp_hood', 40, lo=1, hi=2, region='hood')]
for a, b in SP + NK + HOOD:
    for o in (a, b):
        place(o)
B.add('spirit', *SP)
B.add('sp_neck', *NK)
B.add('sp_hood', *HOOD)
B.commit(F, kinds={'spirit': 'glass', 'sp_neck': 'glass', 'sp_hood': 'glass'}, uvw={'spirit': 1.8, 'sp_neck': 1.8, 'sp_hood': 1.8})


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
    R.bone('sp_neck', shrunk(BEND), parent='spirit')
    R.bone('sp_hood', shrunk(HOOD0), parent='sp_neck')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'spirit', 'sp_neck', 'sp_hood']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he cackles (the head bobs), the claws flex; the cobra swells up behind him and spreads its hood
        for i, f in enumerate((4, 8, 12, 16)):
            k('head', f, rot=('X', 7 if i % 2 == 0 else -3))
        k('head', 20)
        k('arm_l', 6, rot=('X', -12), ease='BACK')
        k('arm_l', 72, rot=('X', -12))
        k('arm_l', 82)
        spirit_keys(k, 'spirit', 4, 16, 72, 86, G, tuple(Q_FULL - Q_REST))
        k('sp_hood', 16)
        k('sp_hood', 22, scale=(1.6, 1.0, 1.15), ease='BACK')
        k('sp_hood', 68, scale=(1.6, 1.0, 1.15))
        k('sp_hood', 76)
        # it lunges over his shoulder and snaps, twice
        k('sp_neck', 24)
        for f in (30, 46):
            k('sp_neck', f, rot=[('X', 38), ('Z', -12)], ease='BACK')
            k('sp_neck', f + 8, rot=('X', -6))
        k('sp_neck', 66)
        k('arm_r', 28)
        k('arm_r', 32, rot=('X', 8), ease='BACK')
        k('arm_r', 66, rot=('X', 8))
        k('arm_r', 76)
        for b in allb:
            k(b, 90)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sand(P, pt, sh)
    FUR = pt.ramp('#b99a66', 7, shift=0.06)
    P.fill('fur', FUR, tone=sh, base=0.1, brush='fur')
    who, d = P.dabs(P.region('fur'), size=1.3, spacing=3.4, seed=13)
    P.tint(P.region('fur') & (who >= 0) & (d < 0.8) & (Z < 33), pt.ramp('#5a4632', 6, shift=0.05), sh)           # the spots
    P.fill('muzzle', pt.ramp('#3c3330', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('mane', pt.ramp('#4a3a2c', 6, shift=0.05), tone=sh, base=0.05, brush='fur')
    P.fill('claw', pt.ramp('#efe4c8', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('fur_claw', pt.ramp('#efe4c8', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('vest', pt.ramp('#ece5d4', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('vest') & (np.abs(np.mod(Z, 2.2) - 1.1) < 0.5), pt.ramp('#2a2a32', 6, shift=0.05), sh)        # the stripes
    P.fill('pants', pt.ramp('#5c3a74', 7, shift=0.07), tone=sh, base=0.05)
    P.fill('sash', pt.ramp('#d6a33a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('turban', pt.ramp('#ece6da', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('turban') & (np.abs(np.mod(Z + 0.5 * X, 2.6) - 1.3) < 0.3), pt.ramp('#3a4a8a', 6, shift=0.05), sh)
    # the face: small mean dots close together, angry brows, and the huge grin full of teeth
    hd = (P.region('fur') | P.region('muzzle')) & (Z > 25)
    fc = face.Face(P, c=(0, -11.0, 30.2), axis=(0, -1, 0.25), where=hd, seed=931, ink='#1e1a18')
    fc.eyes('dot', spread=4.4, size=0.5, dy=0.6, uneven=0.3)
    fc.brows('angry', spread=4.8, dy=1.8, w=1.8, weight=0.45)
    mz = face.Face(P, c=(0, -13.0, 27.0), axis=(0, -1, 0.0), where=P.region('muzzle'), seed=932, ink='#efe4c8')
    mz.mouth('grin', w=4.6, dy=-0.4, weight=0.34, teeth=5)
    # the spirit: a ghost green cobra, a paler belly, the hood's eye marks
    ghost(P, pt, 'spirit', '#7cc46a', sh)
    ghost(P, pt, 'belly', '#cfe9a8', sh)
    ghost(P, pt, 'hood', '#5ea65a', sh)
    ghost(P, pt, 'fang', '#f4f2e8', sh)
    P.lines(['vest', 'sash', 'turban', 'pants'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=90, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('spirit', 'body'), ('sp_neck', 'spirit'),
                                         ('sp_hood', 'sp_neck'), ('sp_hood', 'spirit'), ('sp_neck', 'body'), ('sp_hood', 'body'), ('spirit', 'head'),
                                         ('sp_neck', 'head'), ('sp_hood', 'head'), ('sp_neck', 'arm_r'), ('sp_neck', 'arm_l'), ('spirit', 'arm_l'),
                                         ('sp_hood', 'arm_l'), ('sp_hood', 'arm_r'), ('spirit', 'arm_r'), ('arm_r', 'head')],
    fold=(0, 18, 31, 50))
