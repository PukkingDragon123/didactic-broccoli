"""がくランワニ Long-Coat Croc (series sabaku, concepts_E.md): a tall young crocodile in a floor-length,
high-collared black coat with a gold chain across the collar, one hand in his pocket, the other pointing at you, head
tipped back, the deadpan stare, his tail out under the hem, on a sand drift. On his shoulder rides his spirit, small:
a ghostly muscle-bound baboon in a long scarf with taped fists.
Gimmick: the spirit swells up behind him and rattles off a punch-rush, both fists pumping; then it shrinks back.

    GG_FACET=1 tools/blender.sh art/blender/toys/sabaku/wani.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('sabaku', 'wani')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the sand drift, shoes, trouser legs, the tail
B.add('body', drift(seed=3))
B.add('body', shoe('shoe_r', (-3.8, 1.6, GZ - 0.3), (-0.2, -1, 0), L=7.4, W=3.9, H=2.6))
B.add('body', shoe('shoe_l', (4.4, -1.2, GZ - 0.2), (0.45, -1, 0), L=7.4, W=3.9, H=2.6))
B.add('body', limb('leg_r', [(-3.8, 1.2, GZ + 2.0), (-3.6, 0.8, 10.0)], [2.1, 2.3], tris=20, region='pants', n=8))
B.add('body', limb('leg_l', [(4.6, -2.2, GZ + 2.0), (3.8, -0.4, 10.0)], [2.1, 2.3], tris=20, region='pants', n=8))


def sc_tail(h):
    def f(V, N):  # a row of scutes along the top
        return 0.35 * (np.abs(np.sin(V[:, 1] * 1.6 + V[:, 0] * 1.2)) > 0.7) * tk.smoothstep(0.3, 0.8, N[:, 2])
    tk.push(h, f)


B.add('body', limb('tail', [(0.0, 6.0, 8.6), (1.2, 10.0, 5.0), (5.0, 10.6, 3.6), (8.8, 7.8, 3.2)], [3.2, 2.6, 1.6, 0.35], tris=40,
                   region='skin', n=8, cap1='point', sculpt=sc_tail))

# ------------------------------------------------------------------ the long coat: flared hem blowing back, the waist, broad shoulders
COAT = [dict(c=(0.6, 1.8, 6.6), w=19.6, ht=8.2, hb=9.8, e=2.3), dict(c=(0.4, 1.0, 12.0), w=16.4, ht=6.6, hb=7.6, e=2.3),
        dict(c=(0.1, 0.5, 17.6), w=13.6, ht=5.4, hb=5.6, e=2.4), dict(c=(-0.3, 0.9, 23.0), w=15.6, ht=5.8, hb=5.6, e=2.5),
        dict(c=(-0.6, 1.4, 27.4), w=19.6, ht=5.2, hb=5.2, e=3.0), dict(c=(-0.6, 1.6, 30.2), w=13.2, ht=4.6, hb=4.6, e=2.4)]


def sc_coat(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1])
        placket = -0.3 * np.exp(-((x + 0.6) / 0.35) ** 2) * front * (z < 29.5)
        hem = -0.3 * np.exp(-((z - 7.6) / 0.3) ** 2)
        folds = 0.4 * np.cos(np.arctan2(x, y) * 6.0) ** 6 * tk.smoothstep(16.0, 8.0, z)
        pocket = -0.25 * (np.abs(z - 16.0) < 0.25) * (np.abs(np.abs(x) - 5.4) < 2.0) * front
        return placket + hem + folds + pocket
    tk.push(h, f)


B.add('body', low(tk.loft('coat', COAT, n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.2), 'coat', 260, lo=1, hi=3,
                  sculpt=sc_coat, region='coat'))
B.add('body', low(tk.loft('collar', [dict(c=(-0.6, 1.8, 29.6), w=11.6, h=4.6, e=2.4), dict(c=(-0.6, 2.2, 33.6), w=12.2, h=5.0, e=2.4)],
                          n=12, up=(0, -1, 0), cap0=None, cap1=None), 'collar', 40, lo=0, hi=2, region='collar'))
# the gold chain across the collar
CH = [(4.0, -3.0, 31.4), (2.4, -4.2, 28.9), (0.0, -4.6, 28.0), (-2.6, -4.2, 28.9), (-4.4, -3.0, 31.4)]


def sc_chain(h):
    def f(V, N):  # the links
        return 0.18 * np.sign(np.sin(V[:, 0] * 4.2))
    tk.push(h, f)


B.add('body', limb('chain', CH, 0.5, tris=24, region='gold', n=5, sculpt=sc_chain))

# ------------------------------------------------------------------ the arms: the right one points at you, the left is in its pocket
SR, SL = V3(-9.0, 1.4, 27.6), V3(9.0, 1.6, 27.2)
WR = V3(-5.6, -13.8, 30.2)
B.add('arm_r', limb('sleeve_r', [SR, (-11.4, -6.4, 27.0), WR], [3.1, 2.8, 2.5], tris=44, region='coat', n=8, cap1='flat'))
B.add('arm_r', limb('cuff_r', [WR + (0.25, 0.5, 0), WR - (0.25, 0.5, 0)], 2.7, tris=16, region='collar', n=8, cap0='flat', cap1='flat'))
B.add('arm_r', *hand('hand_r', WR + (-0.2, -0.9, 0.1), (0.3, -1, 0.08), r=2.1, kind='point', region='skin'))
B.add('body', limb('sleeve_l', [SL, (11.8, 3.2, 21.6), (8.4, -2.2, 15.6)], [3.1, 2.8, 2.5], tris=40, region='coat', n=8))

# ------------------------------------------------------------------ the croc head, tipped back: a long flat snout, eye knobs, nostrils
NECK = (0, 1.8, 31.4)
head = tk.loft('head', [dict(c=(0, 4.0, 36.4), w=8.8, h=3.8), dict(c=(0, 0.6, 37.0), w=10.6, ht=4.6, hb=4.4, e=2.3),
                        dict(c=(0, -3.6, 36.4), w=9.2, ht=3.4, hb=4.0, e=2.4), dict(c=(0, -8.2, 35.8), w=7.0, ht=2.3, hb=2.9, e=2.6),
                        dict(c=(0, -12.4, 35.6), w=6.4, ht=2.0, hb=2.4, e=2.6), dict(c=(0, -14.4, 35.6), w=5.2, ht=1.6, hb=1.8, e=2.4)],
                n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
JAW = lambda y: 35.4 + 0.02 * (y + 14)  # noqa: E731  (the mouth line's height along the snout)


def sc_head(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        d = -0.35 * np.exp(-((z - JAW(y)) / 0.3) ** 2) * (np.abs(N[:, 0]) > 0.4) * (y < -2.0)      # the long mouth line
        d += 0.25 * (np.abs(np.sin(x * 2.2) * np.sin(y * 1.6)) > 0.5) * tk.smoothstep(0.4, 0.8, N[:, 2]) * (y < -4)  # snout scutes
        d += tk.bump(V, (2.0, -14.2, 37.4), 1.0, 0.5) + tk.bump(V, (-2.0, -14.2, 37.4), 1.0, 0.5)  # the nostrils
        return d
    tk.push(h, f)


HP = [low(head, 'head', 170, lo=1, hi=3, sculpt=sc_head, region=('skin', [('belly', lambda C, N: (N[:, 2] < -0.35) & (C[:, 1] < -2))]))]
for sx in (1, -1):
    HP.append(blob('knob', (sx * 2.7, -1.2, 41.0), 1.7, tris=20, squash=(1.0, 1.15, 0.85), region='skin'))
HP.append(limb('neck', [NECK, (0, 0.2, 35.0)], 3.6, tris=16, region='skin', n=8))
for a, b in HP:
    for o in (a, b):
        tk.move(o, (0, 1.2, 0))
        tk.scale(o, (1.15, 1.15, 1.15), pivot=NECK)
        tk.rotate(o, -12, 'X', pivot=NECK)
        tk.rotate(o, -10, 'Z', pivot=NECK)
B.add('head', *HP)


def HX(p, d=False):
    """a point (d: a direction) of the head as built, where the move / scale / tilt above put it."""
    import math as m
    p = np.asarray(p, float) + (0 if d else np.array((0, 1.2, 0)))
    n = np.asarray(NECK, float)
    if not d:
        p = n + (p - n) * 1.15
    for ax, a in (('X', -12), ('Z', -10)):
        c, s_ = m.cos(m.radians(a)), m.sin(m.radians(a))
        q = p - (0 if d else n)
        q = np.array((q[0], c * q[1] - s_ * q[2], s_ * q[1] + c * q[2])) if ax == 'X' else np.array((c * q[0] - s_ * q[1], s_ * q[0] + c * q[1], q[2]))
        p = q + (0 if d else n)
    return tuple(p)

# ------------------------------------------------------------------ the spirit: a ghostly baboon in a long scarf, taped fists
G = 2.8                                   # how much it swells
Q_FULL = V3(6.4, 9.0, 36.0)              # its waist when out, behind him
Q_REST = V3(6.8, 3.4, 31.2)              # ...and riding on his right shoulder, small


def place(o, q=Q_FULL):
    """full-size spirit geometry (built round Q_FULL) shrunk onto his shoulder."""
    tk.move(o, tuple(-q))
    tk.scale(o, (1 / G, 1 / G, 1 / G))
    tk.move(o, tuple(Q_REST))


SP = []
SP.append(low(tk.loft('sp_body', [dict(c=tuple(Q_FULL + (0, 1.0, -9.0)), w=1.2, h=1.0), dict(c=tuple(Q_FULL + (0, 0.6, -5.0)), w=7.0, h=4.0),
                                   dict(c=tuple(Q_FULL + (0, 0, 0)), w=12.0, ht=5.4, hb=5.6), dict(c=tuple(Q_FULL + (0, 0.2, 6.0)), w=19.0, ht=6.2, hb=6.0, e=2.6),
                                   dict(c=tuple(Q_FULL + (0, 0.6, 9.4)), w=13.0, h=4.6)], n=12, up=(0, -1, 0), cap0='point', cap1='round'),
              'sp_body', 120, lo=1, hi=2, region='spirit',
              sculpt=lambda h: tk.push(h, lambda V, N: 0.4 * tk.bump(V, tuple(Q_FULL + (3.2, -5.6, 5.4)), 3.0, 0.8) + 0.4 * tk.bump(V, tuple(Q_FULL + (-3.2, -5.6, 5.4)), 3.0, 0.8))))
HC_ = Q_FULL + (0, -1.6, 13.6)
SP.append(low(tk.loft('sp_head', [dict(c=tuple(HC_ + (0, 3.0, 0.6)), w=7.6, h=3.6), dict(c=tuple(HC_ + (0, 0, 0.4)), w=9.0, ht=4.4, hb=4.0),
                                   dict(c=tuple(HC_ + (0, -3.4, -1.0)), w=5.8, ht=2.6, hb=3.0), dict(c=tuple(HC_ + (0, -6.0, -1.4)), w=4.6, ht=2.2, hb=2.4)],
                      n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0), 'sp_head', 60, lo=1, hi=2, region='spirit'))
SP.append(limb('sp_scarf', [HC_ + (-4.0, 0.6, -4.2), HC_ + (0, -3.0, -5.4), HC_ + (4.0, 0.6, -4.2), HC_ + (3.0, 5.0, -5.4), HC_ + (6.0, 10.0, -7.4),
                            HC_ + (9.0, 14.0, -6.0)], [1.4, 1.5, 1.4, 1.3, 1.1, 0.5], tris=40, region='scarf', n=6, cap1='point'))
SARM = {}
for nm, sx in (('sp_arm_r', -1), ('sp_arm_l', 1)):
    sh = Q_FULL + (sx * 8.6, 0.2, 6.2)
    el = sh + (sx * 4.0, -3.0, -3.6)
    wr = el + (-sx * 1.6, -6.4, 1.0)
    a = [limb(nm, [sh, el, wr], [3.2, 2.8, 2.3], tris=40, region='spirit', n=8),
         blob(nm + '_fist', wr + (0, -2.0, 0), 2.7, tris=30, squash=(1.0, 1.1, 0.95), region='tape')]
    SARM[nm] = (a, sh)
for a, b in SP + [p for v in SARM.values() for p in v[0]]:
    for o in (a, b):
        place(o)
B.add('spirit', *SP)
for nm, (a, sh) in SARM.items():
    B.add(nm, *a)
B.commit(F, kinds={'spirit': 'glass', 'sp_arm_r': 'glass', 'sp_arm_l': 'glass'}, uvw={'spirit': 2.2, 'sp_arm_r': 1.8, 'sp_arm_l': 1.8})


def shrunk(p):
    return tuple((np.asarray(p, float) - Q_FULL) / G + Q_REST)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('spirit', tuple(Q_REST), parent='body')
    for nm, (a, sh) in SARM.items():
        R.bone(nm, shrunk(sh), parent='spirit')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'spirit', 'sp_arm_r', 'sp_arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he lowers his head to glare; the spirit swells up behind him
        k('head', 6, rot=('X', 9))
        k('head', 74, rot=('X', 9))
        k('head', 84)
        spirit_keys(k, 'spirit', 4, 16, 70, 84, G, tuple(Q_FULL - Q_REST))
        # the punch-rush: the fists pump in turn (the arms are inside the swollen spirit: steps are 1/G)
        for nm, ph in (('sp_arm_r', 0), ('sp_arm_l', 1)):
            k(nm, 18)
            for i in range(7):
                f = 20 + i * 6 + ph * 3
                k(nm, f, move=(0, -3.4, 0.4), ease='LINEAR')
                k(nm, f + 3, move=(0, 0.4, 0), ease='LINEAR')
            k(nm, 64, move=(0, -3.8, 0.6), ease='BACK')
            k(nm, 70, move=(0, -3.8, 0.6))
            k(nm, 80)
        # his pointing arm jabs with the last punch
        k('arm_r', 60)
        k('arm_r', 64, rot=('Z', 6), ease='BACK')
        k('arm_r', 74, rot=('Z', 6))
        k('arm_r', 82)
        for b in allb:
            k(b, 90)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sand(P, pt, sh)
    INKC = pt.ramp('#23232c', 7, shift=0.08, light=0.55)
    P.fill('coat', INKC, tone=sh, base=0.05)
    P.fill('collar', INKC, tone=sh, base=0.0)
    P.fill('pants', pt.ramp('#2c2c38', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('shoe', pt.ramp('#3a2a22', 6, shift=0.06, light=0.6), tone=sh, base=0.1, brush='gloss')
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    P.fill('gold', GOLD, tone=sh, base=0.15)
    # brass buttons down the placket, a gold piping round the collar
    coat = P.region('coat')
    for z in (10.0, 14.0, 18.0, 22.0, 26.0):
        P.fill(coat & (np.hypot(X + 0.6 + 0.4, Z - z) < 0.8) & (Yc < -3), GOLD, tone=sh, base=0.2)
    P.fill(P.region('collar') & (Z > 33.0), GOLD, tone=sh, base=0.1)
    GREEN = pt.ramp('#5f8a46', 7, shift=0.07)
    P.fill('skin', GREEN, tone=sh, base=0.1)
    P.fill('belly', pt.ramp('#d9cf98', 6, shift=0.05), tone=sh, base=0.15)
    # back scutes a step darker in rows
    sk = P.region('skin')
    P.shift(sk & (np.abs(np.sin(X * 2.2) * np.sin(Yc * 1.6)) > 0.55) & (P.on[:, :, 2] > 0.3), -1)
    # the face: deadpan dot eyes on the knobs, heavy brows, one long flat mouth line along the snout, a nick of teeth
    hd = sk & (Z > 33)
    fc = face.Face(P, c=HX((0, -2.4, 41.4)), axis=HX((0, -1, 0.3), d=True), where=hd, seed=901)
    fc.eyes('dot', spread=5.4, size=0.55, dy=0.2, uneven=0.25)
    fc.brows('angry', spread=5.8, dy=1.4, w=2.2, weight=0.5)
    for sx in (1, -1):
        sd = face.Face(P, c=HX((sx * 3.4, -8.0, 35.6)), axis=HX((sx, -0.15, 0.0), d=True), where=hd, seed=902 + sx)
        sd.stroke([(-sx * 5.0, 0.1), (-sx * 1.0, 0.0), (sx * 2.8, 0.05), (sx * 3.8, 0.5)], weight=0.42)
        for u in (-3.6, -2.0, -0.4, 1.2):
            sd.stroke([(-sx * u, -0.25), (-sx * u + 0.25, -0.85)], weight=0.2, col='#efe4c8')
    # the spirit: pale jade, the scarf a deeper teal, the fists taped white
    ghost(P, pt, 'spirit', '#58b8a4', sh)
    ghost(P, pt, 'scarf', '#2f6f8a', sh)
    ghost(P, pt, 'tape', '#e8efe0', sh)
    sp = face.Face(P, c=tuple(np.asarray(shrunk(HC_ + (0, -6.4, 0.6)))), axis=(0, -1, 0.1), where=P.region('spirit'), seed=905, ink='#2f5f5a')
    sp.eyes('dot', spread=1.6, size=0.22, dy=0.4)
    sp.brows('angry', spread=1.8, dy=0.9, w=0.8, weight=0.18)
    P.lines(['coat'], ['skin', 'gold', 'collar'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=90, skip=[('head', 'body'), ('arm_r', 'body'), ('spirit', 'body'), ('sp_arm_r', 'spirit'), ('sp_arm_l', 'spirit'),
                                         ('sp_arm_r', 'body'), ('sp_arm_l', 'body'), ('spirit', 'head'), ('sp_arm_r', 'head'), ('sp_arm_l', 'head'),
                                         ('spirit', 'arm_r'), ('sp_arm_r', 'arm_r'), ('sp_arm_l', 'arm_r')],
    fold=(0, 18, 40, 66))
