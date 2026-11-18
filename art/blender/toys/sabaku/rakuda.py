"""案内ラクダ Old Guide Camel (series sabaku, concepts_E.md): an old dromedary in a safari waistcoat (his hump out
through its back), rolled shirt sleeves, jodhpurs and boots, a pith helmet and a checked desert scarf, a great white
moustache; struck in a deep lunge, his cane flung up ahead ("Onward!"), the other hand shading his eyes. Perched on
his hump, small: his spirit, a ghostly ragged vulture with its wings hanging folded.
Gimmick: the vulture swells up over him, throws its wings wide and beats them; then folds and shrinks back.

    GG_FACET=1 tools/blender.sh art/blender/toys/sabaku/rakuda.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('sabaku', 'rakuda')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the drift, the lunge: left leg bent forward, right leg back
B.add('body', drift(r=15.0, seed=5))
LEGS = {'l': [(3.6, -0.6, 14.2), (3.9, -6.4, 10.6), (3.8, -7.2, GZ + 1.6)], 'r': [(-3.4, 1.2, 14.0), (-3.6, 4.6, 9.0), (-3.6, 7.6, GZ + 1.4)]}
for s_, (hp, kn, an) in LEGS.items():
    B.add('body', limb('thigh_' + s_, [hp, kn], [3.0, 2.5], tris=22, region='jodh', n=8))
    B.add('body', limb('boot_' + s_, [kn, an], [2.1, 1.8], tris=18, region='boot', n=8, cap0='round', cap1='flat'))
B.add('body', shoe('shoe_l', (3.8, -6.0, GZ - 0.2), (0.15, -1, 0), L=6.8, W=3.6, H=2.4, region='boot'))
B.add('body', shoe('shoe_r', (-3.6, 9.0, GZ - 0.2), (-0.1, -1, 0), L=6.6, W=3.6, H=2.4, region='boot', toe_up=0.0))

# ------------------------------------------------------------------ the body leaning into the lunge, the hump through the waistcoat, a tail
TORSO = [dict(c=(0, 0.6, 12.6), w=11.6, ht=5.2, hb=5.6), dict(c=(0, -0.2, 16.8), w=12.4, ht=6.0, hb=5.8),
         dict(c=(0, -1.0, 20.8), w=12.6, ht=5.4, hb=5.4), dict(c=(0, -1.8, 24.4), w=13.4, ht=4.6, hb=4.6, e=2.6),
         dict(c=(0, -2.2, 26.2), w=8.4, ht=3.6, hb=3.6)]


def sc_torso(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1])
        d = -0.3 * np.exp(-((z - 14.6) / 0.3) ** 2)                                       # the waistcoat hem
        d += -0.25 * np.exp(-(x / 0.3) ** 2) * front * (z > 14.6)                           # its front edge
        d += 0.3 * (np.abs(np.abs(x) - 3.4) < 1.6) * (np.abs(z - 17.4) < 1.3) * front       # the patch pockets
        return d
    tk.push(h, f)


B.add('body', low(tk.loft('torso', TORSO, n=16, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 220, lo=1, hi=3, sculpt=sc_torso,
                  region=('vest', [('jodh', lambda C, N: C[:, 2] < 14.4)])))
B.add('body', blob('hump', (0, 4.6, 21.4), 4.6, tris=40, squash=(1.05, 0.95, 1.1), region='fur'))
B.add('body', limb('tail', [(0, 5.6, 14.2), (0, 7.6, 12.0), (0.3, 8.4, 9.6)], [0.9, 0.7, 1.1], tris=16, region='fur', n=6))

# ------------------------------------------------------------------ the neck curving up and forward, the scarf knotted round it
NECK0 = (0, -2.2, 25.0)
B.add('head', limb('neck', [NECK0, (0, -5.0, 29.2), (0, -6.6, 33.4)], [3.0, 2.6, 2.5], tris=26, region='fur', n=8))
B.add('body', limb('scarf', [(5.0, -1.6, 25.8), (2.6, -5.6, 26.6), (-2.6, -5.6, 26.6), (-5.0, -1.6, 25.8), (-2.6, 2.4, 26.2),
                             (2.6, 2.4, 26.2), (5.0, -1.6, 25.8)], 1.3, tris=40, region='scarf', n=6, cap0='round', cap1='round'))
B.add('body', limb('scarf_end', [(-2.6, 2.4, 26.2), (-3.6, 6.4, 25.0), (-5.2, 9.8, 26.2)], [1.4, 1.2, 0.5], tris=16, region='scarf', n=6,
                   cap1='point'))

# ------------------------------------------------------------------ the head: the long camel face, heavy lip, little ears, moustache, pith helmet
head = tk.loft('head', [dict(c=(0, -5.0, 36.6), w=6.4, h=3.6), dict(c=(0, -7.4, 36.8), w=7.6, ht=3.8, hb=3.4),
                        dict(c=(0, -10.8, 35.4), w=5.8, ht=2.8, hb=3.0), dict(c=(0, -13.6, 34.4), w=6.0, ht=2.5, hb=3.0, e=2.4)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)


def sc_head(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        d = -0.3 * np.exp(-(x / 0.3) ** 2) * (y < -13.6) * (z < 35.0)                    # the split upper lip
        d += -0.25 * np.exp(-((z - 33.6) / 0.3) ** 2) * (y < -11.0)                         # the mouth line under the lip
        for sx in (1, -1):
            d += 0.4 * tk.bump(V, (sx * 2.6, -8.6, 38.4), 1.6, 1.0)                        # the brow ridges
        return d
    tk.push(h, f)


HP = [low(head, 'head', 120, lo=1, hi=3, sculpt=sc_head, region=('fur', [('muzzle', lambda C, N: C[:, 1] < -11.4)]))]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 3.0, -5.6, 38.6), (sx * 4.6, -4.6, 40.6), 2.2, th=0.8, region='fur', tris=10, cup=(sx * 0.3, -1, 0.2)))
    HP.append(limb('tash', [(sx * 0.4, -14.6, 34.8), (sx * 2.6, -14.4, 34.0), (sx * 4.8, -13.0, 32.4)], [1.1, 1.2, 0.35], tris=16,
                   region='tash', n=6, cap1='point'))
HC = (0, -7.4, 39.4)
HP.append(low(tk.lathe('helmet', [(0, 0), (4.4, 0), (4.6, 0.8), (4.2, 2.6), (2.8, 3.8), (0, 4.2)], n=12, centre=HC), 'helmet', 60, lo=1, hi=2,
              region=('helmet', [('band', lambda C, N: (C[:, 2] < HC[2] + 0.85) & (np.abs(N[:, 2]) < 0.6))])))
HP.append(low(tk.lathe('brim', [(0, -0.3), (6.4, -0.6), (6.8, -0.2), (6.4, 0.3), (0, 0.3)], n=14, centre=(HC[0], HC[1], HC[2] + 0.1)), 'brim', 40,
              lo=0, hi=2, region='helmet'))
for a, b in HP[-2:]:
    for o in (a, b):
        tk.rotate(o, 10, 'X', pivot=HC)
B.add('head', *HP)

# ------------------------------------------------------------------ the arms: the cane flung up ahead, the other hand shading his eyes
SR, SL = V3(-6.8, -1.8, 24.0), V3(6.8, -1.8, 24.0)
WR = V3(-7.8, -12.6, 25.0)
B.add('arm_r', limb('arm_r', [SR, (-8.6, -6.6, 22.4), WR], [2.5, 2.2, 1.6], tris=30, region='shirt', n=8))
B.add('arm_r', blob('fist_r', WR + (0, -1.4, 0.3), 2.0, tris=24, squash=(0.95, 1.1, 1.0), region='fur'))
CANE0, CANE1 = WR + (0.0, -1.6, -2.4), WR + (-1.6, -6.4, 12.0)
B.add('arm_r', limb('cane', [CANE0, CANE1], 0.55, tris=12, region='cane', n=6))
B.add('arm_r', limb('crook', [CANE0, CANE0 + (0, 0.6, -1.6), CANE0 + (0, 2.2, -2.0), CANE0 + (0, 3.2, -0.8)], 0.55, tris=14, region='cane', n=6))
WL = V3(5.6, -9.4, 36.2)
B.add('arm_l', limb('arm_l', [SL, (11.0, -4.6, 29.4), WL], [2.5, 2.2, 1.6], tris=30, region='shirt', n=8))
B.add('arm_l', *hand('hand_l', WL + (-0.3, -0.4, 0.2), (-1, -0.5, 0.1), r=1.7, kind='mitt', region='fur', up=(0, -0.3, 1)))

# ------------------------------------------------------------------ the spirit: a ghostly vulture on his hump, wings hanging folded
G = 3.1
Q_FULL = V3(3.0, 8.0, 46.0)
Q_REST = V3(0.0, 4.8, 27.6)


def place(o):
    tk.move(o, tuple(-Q_FULL))
    tk.scale(o, (1 / G, 1 / G, 1 / G))
    tk.move(o, tuple(Q_REST))


def shrunk(p):
    return tuple((np.asarray(p, float) - Q_FULL) / G + Q_REST)


q = Q_FULL
SP = [low(tk.loft('sp_body', [dict(c=tuple(q + (0, 7.0, -5.0)), w=5.0, h=1.0), dict(c=tuple(q + (0, 3.6, -2.4)), w=8.4, h=4.0),
                              dict(c=tuple(q + (0, -0.4, 0.4)), w=9.4, ht=5.0, hb=4.6), dict(c=tuple(q + (0, -2.6, 4.0)), w=8.0, h=4.0)],
                  n=10, up=(0, 0, 1), cap0='flat', cap1='round'), 'sp_body', 70, lo=1, hi=2, region='spirit',
          sculpt=lambda h: tk.push(h, lambda V, N: -0.3 * (np.abs(np.mod(V[:, 1] * 0.8 + np.abs(V[:, 0]) * 0.4, 2.0) - 1.0) < 0.2)))]
SP.append(limb('sp_ruff', [q + (-4.0, -1.4, 5.0), q + (0, -4.4, 5.6), q + (4.0, -1.4, 5.0), q + (0, 1.6, 5.8), q + (-4.0, -1.4, 5.0)], 1.9, tris=30,
               region='ruff', n=6))
SP.append(limb('sp_neck', [q + (0, -2.4, 5.4), q + (0, -4.2, 9.0), q + (0, -6.4, 10.4)], [1.6, 1.2, 1.1], tris=16, region='spirit', n=6))
SH = q + (0, -7.0, 11.0)
SP.append(low(tk.loft('sp_head', [dict(c=tuple(SH + (0, 1.6, 0.2)), w=3.4, h=1.8), dict(c=tuple(SH), w=3.6, h=2.0),
                                  dict(c=tuple(SH + (0, -2.4, -0.2)), w=2.0, ht=1.4, hb=1.0), dict(c=tuple(SH + (0, -3.8, -1.4)), w=1.0, h=0.5)],
                      n=8, up=(0, 0, 1), cap0='round', cap1='point'), 'sp_head', 30, lo=1, hi=2, region='spirit'))
for sx in (1, -1):
    SP.append(limb('sp_talon', [q + (sx * 2.0, 0.6, -3.2), q + (sx * 2.2, -1.0, -6.4), q + (sx * 2.2, -2.8, -6.8)], [0.8, 0.6, 0.3], tris=12,
                   region='spirit', n=5, cap1='point'))
WINGS = {}
for nm, sx in (('sp_wing_l', 1), ('sp_wing_r', -1)):
    root = q + (sx * 4.2, 0.2, 3.0)
    # hanging down at its sides like a cloak (they open in the front plane), the ragged primaries at the bottom
    pts = [(0.0, 0.0), (5.6, 0.4), (6.6, -4.0), (6.4, -10.0), (5.4, -15.0), (4.2, -17.4), (3.4, -15.2), (2.4, -17.0), (1.4, -14.0), (0.4, -15.4),
           (-0.4, -11.0), (-0.8, -5.0)]
    w = tk.slab(nm, [(sx * (c_ - 1.0), z_) for c_, z_ in pts][::sx], 1.2, plane='XZ', at=0.0, bevel=0.4, segs=1)
    tk.move(w, tuple(root + (0, 1.0, 0)))
    tk.rotate(w, -sx * 12, 'Y', pivot=tuple(root))
    WINGS[nm] = (low(w, nm, 50, lo=1, hi=2, region='spirit',
                     sculpt=lambda h: tk.push(h, lambda V, N: -0.25 * (np.abs(np.mod(V[:, 1] * 0.9 + V[:, 2] * 0.3, 2.2) - 1.1) < 0.22))), root)
for a, b in SP + [v[0] for v in WINGS.values()]:
    for o in (a, b):
        place(o)
B.add('spirit', *SP)
for nm, (pc, root) in WINGS.items():
    B.add(nm, pc)
B.commit(F, kinds={'spirit': 'glass', 'sp_wing_l': 'glass', 'sp_wing_r': 'glass'}, uvw={'spirit': 2.0, 'sp_wing_l': 1.8, 'sp_wing_r': 1.8})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK0, parent='body')
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
        # he peers ahead harder, the cane jabs up; the vulture swells over him
        k('arm_l', 6, rot=('X', -6))
        k('arm_l', 70, rot=('X', -6))
        k('arm_l', 80)
        k('arm_r', 8)
        k('arm_r', 14, rot=('X', -10), ease='BACK')
        k('arm_r', 70, rot=('X', -10))
        k('arm_r', 80)
        k('head', 10, rot=('X', -5))
        k('head', 72, rot=('X', -5))
        k('head', 80)
        spirit_keys(k, 'spirit', 4, 16, 72, 86, G, tuple(Q_FULL - Q_REST))
        # the wings swing out wide and beat
        for nm, sx in (('sp_wing_l', 1), ('sp_wing_r', -1)):
            k(nm, 14)
            k(nm, 24, rot=('Y', -sx * 118), ease='BACK')
            for i, f in enumerate((32, 40, 48, 56)):
                k(nm, f, rot=('Y', -sx * (92 if i % 2 == 0 else 124)))
            k(nm, 64, rot=('Y', -sx * 118))
            k(nm, 76)
        for b in allb:
            k(b, 90)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sand(P, pt, sh)
    P.fill('fur', pt.ramp('#c79a62', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('muzzle', pt.ramp('#dcbf92', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('vest', pt.ramp('#7d7448', 7, shift=0.07), tone=sh, base=0.05)
    vest = P.region('vest')
    P.fill(vest & (Z > 24.0), pt.ramp('#efe6d0', 6, shift=0.04), tone=sh, base=0.1)            # the shirt collar
    for z in (16.0, 18.6, 21.2):
        P.fill(vest & (np.hypot(X + 0.6, Z - z) < 0.6) & (Yc < -3), pt.ramp('#b98a3a', 5), tone=sh, base=0.2)   # buttons
    P.fill('jodh', pt.ramp('#cbb488', 7, shift=0.05), tone=sh, base=0.05)
    P.fill('boot', pt.ramp('#5a3a26', 6, shift=0.06, light=0.6), tone=sh, base=0.1, brush='gloss')
    P.fill('shirt', pt.ramp('#efe6d0', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('helmet', pt.ramp('#e3d6ae', 7, shift=0.05), tone=sh, base=0.1)
    P.fill('band', pt.ramp('#6a4a2e', 6, shift=0.05), tone=sh, base=0.0)
    P.fill('tash', pt.ramp('#f4efe4', 6, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill('cane', pt.ramp('#5e3a22', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'wood', 'flow': 'along', 'axis': (0, -0.3, 1), 'L': 6})
    RED = pt.ramp('#a8402e', 6, shift=0.06)
    P.fill('scarf', RED, tone=sh, base=0.05)
    sc = P.region('scarf')
    P.tint(sc & ((np.abs(np.mod(X + Yc, 2.0) - 1.0) < 0.3) | (np.abs(np.mod(Z * 1.6, 2.0) - 1.0) < 0.3)), pt.ramp('#efe6d0', 5), sh)
    # the face: bushy-browed, eyes narrowed into the glare, his mouth open under the moustache
    hd = P.region('fur') & (Z > 33)
    # (low on the face, facing up a little: under the hat's brim the eyes were hidden from the shelf)
    fc = face.Face(P, c=(0, -12.2, 36.0), axis=(0, -1, 0.35), where=hd | P.region('muzzle'), seed=911)
    fc.eyes('squeeze', spread=5.2, size=0.6, dy=0.4)
    fc.brows('raised', spread=5.6, dy=1.7, w=2.2, weight=0.5)
    mz = face.Face(P, c=(0, -15.0, 33.4), axis=(0, -1, -0.1), where=P.region('muzzle'), seed=912)
    mz.mouth('o', w=1.6, dy=-0.2, weight=0.35)
    # the spirit: a dusky violet vulture, a paler ruff
    ghost(P, pt, 'spirit', '#8a76c0', sh)
    ghost(P, pt, 'ruff', '#d8cfee', sh)
    P.lines(['vest', 'scarf', 'helmet', 'shirt'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=90, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('arm_l', 'head'), ('spirit', 'body'),
                                         ('sp_wing_l', 'spirit'), ('sp_wing_r', 'spirit'), ('sp_wing_l', 'body'), ('sp_wing_r', 'body'),
                                         ('spirit', 'head'), ('sp_wing_l', 'head'), ('sp_wing_r', 'head'), ('sp_wing_l', 'arm_l'),
                                         ('sp_wing_r', 'arm_r'), ('sp_wing_l', 'arm_r'), ('sp_wing_r', 'arm_l')],
    fold=(0, 16, 30, 52))
