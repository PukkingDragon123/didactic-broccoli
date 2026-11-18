"""占いヤギ Fortune-Teller Goat (series minato, concepts_E.md): the old palm-reader of the shopping arcade, a nanny goat
in a fringed, beaded shawl over a long skirt, a headscarf knotted under her horns, hoop earrings, a goatee; leaning
back with a crystal ball raised high in both hands, one hoof forward.
Gimmick (light-up): she lifts the ball higher, shuts her eyes and sways; the crystal ball glows.

    GG_FACET=1 tools/blender.sh art/blender/toys/minato/yagi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('minato', 'yagi')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the cobbles; the long skirt to the ground, two hooves peeping out
B.add('body', cobbles(seed=11))
SK = [dict(c=(0, 0.4, GZ + 0.6), w=17.6, ht=8.2, hb=8.6, e=2.2), dict(c=(0, 0.6, 7.0), w=13.4, ht=6.2, hb=6.6), dict(c=(0, 0.8, 13.6), w=10.6, ht=5.0, hb=5.2),
      dict(c=(0, 1.2, 18.0), w=11.2, ht=5.0, hb=5.0), dict(c=(0, 1.8, 22.4), w=12.2, ht=4.6, hb=4.8, e=2.4), dict(c=(0, 2.2, 24.6), w=7.0, h=3.4)]


def sc_skirt(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        folds = 0.45 * np.cos(np.arctan2(x, y - 0.6) * 7.0) ** 4 * tk.smoothstep(13.0, 4.0, z)
        sash = 0.35 * tk.smoothstep(1.0, 0.4, np.abs(z - 13.8))
        return folds + sash
    tk.push(h, f)


B.add('body', low(tk.loft('robe', SK, n=16, up=(0, -1, 0), cap0='flat', cap1='round'), 'robe', 200, lo=1, hi=3, sculpt=sc_skirt,
                  region=('skirt', [('sash', lambda C, N: np.abs(C[:, 2] - 13.8) < 1.1), ('blouse', lambda C, N: C[:, 2] > 14.9)])))
for sx in (1, -1):
    B.add('body', shoe('hoof', (sx * 2.6, -4.4, GZ - 0.2), (sx * 0.2, -1, 0), L=3.8, W=2.6, H=1.8, region='hoof'))
# the shawl: a fringed triangle over her shoulders and down her back
shawl = tk.loft('shawl', [dict(c=(0, 2.2, 23.6), w=14.0, ht=5.4, hb=5.4, e=2.4), dict(c=(0, 2.6, 19.6), w=13.6, ht=5.6, hb=5.6, e=2.4)],
                n=16, up=(0, -1, 0), cap0=None, cap1=None)
tk.deform(shawl, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], -(V[:, 1] - 2.0).clip(0) * 0.9 - 0.05 * V[:, 0] ** 2 * (V[:, 1] > 2.0)], 1))
B.add('body', low(shawl, 'shawl', 50, lo=0, hi=2, region='shawl'))
for i in range(9):
    a = -math.pi * 0.95 + i * math.pi * 0.95 / 4
    x, y = 7.2 * math.cos(a), 2.4 + 5.6 * -math.sin(a) * 0.98
    B.add('body', blob('bead', (x * 0.98, y, 19.0 - max(0.0, y - 2.0) * 0.9 - 0.05 * x * x * (y > 2.0) - 0.8), 0.55, tris=8, region='bead', lo=0, hi=1))

# ------------------------------------------------------------------ the arms raising the crystal ball high, the ball
SR, SL = V3(-5.8, 1.8, 22.0), V3(5.8, 1.8, 22.0)
BALL = V3(0.4, -3.4, 37.4)
ARMS = []
for sx, s_ in ((-1, SR), (1, SL)):
    w = BALL + (sx * 3.4, 0.4, -2.4)
    ARMS.append(limb('arm', [s_, s_ + (sx * 3.2, -2.6, 4.6), w], [2.3, 2.0, 1.6], tris=24, region='blouse', n=8))
    ARMS.append(limb('fore', [w, w + (-sx * 0.6, 0, 0.8)], 1.5, tris=8, region='fur', n=6))
    ARMS.append(blob('hand', w + (-sx * 1.0, -0.2, 1.6), 1.4, tris=12, region='fur', squash=(0.8, 1.0, 1.2)))
ARMS.append(low(tk.lathe('stand', [(0, 0), (2.0, 0.0), (1.6, 0.9), (2.2, 1.6), (0, 1.8)], n=8, centre=tuple(BALL + (0, 0, -4.4))), 'stand', 18, lo=0, hi=1,
                region='brass'))
B.add('arms', *ARMS)
ball = tk.lathe('ball', [(0, -3.4), (2.4, -2.4), (3.4, 0), (2.4, 2.4), (0, 3.4)], n=12, centre=tuple(BALL))
B.add('ball', low(ball, 'ball', 60, lo=1, hi=2, region='crystal'))

# ------------------------------------------------------------------ the head tilted back to the ball: long face, horns, ears, goatee, headscarf
NECK = (0, 2.2, 24.6)
head = tk.loft('head', [dict(c=(0, 3.6, 29.6), w=7.0, h=3.6), dict(c=(0, 1.2, 29.6), w=7.6, ht=3.8, hb=3.4), dict(c=(0, -2.0, 28.2), w=5.6, ht=2.6, hb=2.8),
                        dict(c=(0, -4.6, 27.2), w=4.2, ht=2.0, hb=2.2)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HP = [low(head, 'head', 100, lo=1, hi=3, region=('fur', [('muzzle', lambda C, N: C[:, 1] < -2.6)]))]
HP.append(limb('goatee', [(0, -3.6, 25.6), (0, -3.8, 23.8), (0.2, -3.4, 22.4)], [1.0, 0.8, 0.2], tris=10, region='beard', n=5, cap1='point'))
for sx in (1, -1):
    HP.append(limb('horn', [(sx * 1.8, 2.0, 32.6), (sx * 2.8, 4.4, 34.6), (sx * 3.4, 7.2, 34.0), (sx * 3.0, 8.4, 32.0)], [1.0, 0.8, 0.6, 0.2], tris=16,
                   region='horn', n=6, cap1='point', sculpt=lambda h: tk.push(h, lambda V, N: -0.15 * (np.abs(np.sin((V[:, 1] + V[:, 2]) * 3.0)) > 0.9))))
    HP.append(ear('ear', (sx * 3.4, 2.0, 30.4), (sx * 7.2, 2.8, 29.0), 2.4, th=0.8, region='fur', tris=10, cup=(0, -1, 0.4)))
    ring = [(sx * 4.2, 2.4 + 0.9 * math.cos(a), 27.2 + 0.9 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 7)]
    HP.append(limb('hoop', ring, 0.22, tris=8, region='brass', n=4))
scarf = tk.lathe('scarf', [(0, -0.4), (4.4, -0.4), (4.6, 1.2), (3.8, 2.6), (0, 3.0)], n=12, centre=(0, 2.6, 30.4))
tk.rotate(scarf, -16, 'X', pivot=(0, 2.6, 30.4))
HP.append(low(scarf, 'scarf', 50, lo=1, hi=2, region='scarf'))
HP.append(limb('knot', [(0, 6.4, 30.6), (0.6, 8.2, 29.0), (1.2, 8.6, 26.6)], [1.0, 0.8, 0.3], tris=10, region='scarf', n=5, cap1='point'))
for a, b in HP:
    for o in (a, b):
        tk.rotate(o, -14, 'X', pivot=NECK)
B.add('head', *HP)
B.commit(F, bones={'ball': 'arms'}, kinds={'ball': 'led'})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arms', (0, 1.8, 22.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arms']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # the ball goes up, her head goes back, and she sways over it
        k('arms', 10, move=(0, 0.6, 1.6), ease='BACK')
        k('head', 10, rot=('X', -8))
        for i, f in enumerate((22, 34, 46, 58, 70)):
            s = 1 if i % 2 == 0 else -1
            k('body', f, rot=('Y', 4 * s))
            k('arms', f, move=(0, 0.6, 1.6), rot=('Y', -3 * s))
            k('head', f, rot=[('X', -8), ('Y', 6 * s)])
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stone', pt.ramp('#8c8a84', 7, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('stone') & (np.abs(np.mod(X + 0.5 * np.floor(Yc / 2.6) * 2.6, 3.4) - 1.7) < 1.45) & (np.abs(np.mod(Yc, 2.6) - 1.3) < 1.1) & (P.on[:, :, 2] > 0.5),
           pt.ramp('#9c968a', 7, shift=0.05), tone=sh, base=0.05)
    P.fill('skirt', pt.ramp('#4a2e5e', 7, shift=0.07), tone=sh, base=0.05)
    sk = P.region('skirt')
    P.tint(sk & (np.abs(np.mod(np.arctan2(X, Yc) * 5.0 + Z * 0.15, 1.4) - 0.7) < 0.1) & (np.abs(np.mod(Z, 3.0) - 1.5) < 0.22), pt.ramp('#d6a640', 6), sh)
    P.fill('sash', pt.ramp('#c8a040', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('blouse', pt.ramp('#e9dcc4', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('shawl', pt.ramp('#a8323e', 6, shift=0.06), tone=sh, base=0.05)
    P.tint(P.region('shawl') & (np.abs(np.mod(X + Yc, 2.0) - 1.0) < 0.2), pt.ramp('#d6a640', 5), sh)
    P.fill('bead', pt.ramp('#3a8a8a', 5, shift=0.05), tone=sh, base=0.2, brush='gloss')
    P.fill('hoof', pt.ramp('#3a302a', 5, light=0.6), tone=sh, base=0.2)
    P.fill('fur', pt.ramp('#e8e2d6', 7, shift=0.04), tone=sh, base=0.1, brush='fur')
    P.fill('muzzle', pt.ramp('#d9cfc0', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('beard', pt.ramp('#f4f1ea', 6, shift=0.03), tone=sh, base=0.15, brush='fur')
    P.fill('horn', pt.ramp('#8a7a62', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('brass', pt.ramp('#c99a3e', 6, dark=0.6, light=0.6, shift=0.08), tone=sh, base=0.2)
    P.fill('scarf', pt.ramp('#2e5a8a', 6, shift=0.06), tone=sh, base=0.05)
    P.tint(P.region('scarf') & ((np.mod(X * 1.3, 2.2) - 1.1) ** 2 + (np.mod(Z * 1.3, 2.2) - 1.1) ** 2 < 0.2), pt.ramp('#efe6d0', 5), sh)
    # the crystal ball, painted as it looks lit in daylight: a pale lilac-blue with a painted swirl
    P.fill('crystal', pt.ramp('#c8d4f0', 6, shift=0.05, light=0.7), tone=sh * 0.6, base=0.3, brush='gloss')
    P.tint(P.region('crystal') & (np.abs(np.sin(np.arctan2(X - BALL[0], Z - BALL[2]) * 2 + np.hypot(X - BALL[0], Z - BALL[2]) * 1.4)) > 0.92),
           pt.ramp('#f4f0ff', 5), sh * 0.6 + 0.3)
    # the face (tilted back to the ball): knowing half-shut eyes, a sly little smile
    hd = (P.region('fur') | P.region('muzzle')) & (Z > 25)
    ax = (0, -math.cos(math.radians(14)), math.sin(math.radians(14)) + 0.1)
    fc = face.Face(P, c=(0, -3.6, 30.8), axis=ax, where=hd, seed=1001)
    fc.eyes('sleepy', spread=5.0, size=0.6, dy=0.4)
    fm = face.Face(P, c=(0, -5.2, 27.4), axis=ax, where=hd, seed=1002)
    fm.mouth('upturn', w=1.6, dy=-0.4, weight=0.28, side=-1)
    fm.blush(4.0, 0.6, rx=0.9, ry=0.5)
    P.lines(['shawl', 'sash', 'blouse', 'scarf'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=84, skip=[('head', 'body'), ('arms', 'body'), ('arms', 'head'), ('ball', 'arms'), ('ball', 'head')], fold=(0, 10, 22, 46))
