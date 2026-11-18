"""みはりミーアキャット Lookout Meerkat (series sabaku, concepts_E.md): a meerkat bolt upright on a rock in the sand,
lost in an oversized leather flight jacket with a fleece collar, goggles pushed up on her head, a brass spyglass to one
eye and the other arm flung back, her tail propped behind her. Clinging to her shoulder, small: her spirit, a ghostly
scarab beetle.
Gimmick: the scarab swells up, opens its wing cases and buzzes round her in a full circle; then it shrinks back.

    GG_FACET=1 tools/blender.sh art/blender/toys/sabaku/mirkat.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('sabaku', 'mirkat')
B = Build()
GZ = 3.0
RZ = 7.4                       # the top of her rock

# ------------------------------------------------------------------ the drift and the rock; little hind paws, the tail propped behind
B.add('body', drift(r=13.6, seed=17))
rock = tk.lathe('rock', [(0, 0), (6.8, 0), (6.6, 1.6), (5.6, 3.6), (3.4, 4.4), (0, 4.5)], n=9, centre=(0, 0.4, GZ - 0.6))
B.add('body', low(rock, 'rock', 50, lo=1, hi=3, region='rock',
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.5 * np.sin(V[:, 0] * 1.3 + V[:, 2]) * np.sin(V[:, 1] * 1.1) - 0.3 * (np.abs(np.sin(V[:, 0] * 0.9 + V[:, 1] * 2.1)) > 0.96))))
for sx in (1, -1):
    B.add('body', shoe('paw', (sx * 2.2, 0.6, RZ - 0.3), (sx * 0.2, -1, 0), L=4.2, W=2.4, H=1.6, region='fur'))
    B.add('body', limb('leg', [(sx * 2.2, 0.4, RZ + 1.0), (sx * 2.5, 0.8, RZ + 5.4)], [1.7, 2.3], tris=14, region='fur', n=6))
B.add('body', limb('tail', [(0, 3.2, 12.6), (0, 6.6, 9.2), (0.6, 8.8, 5.4), (1.2, 9.8, 3.4)], [1.5, 1.2, 0.9, 0.4], tris=22, region='fur', n=6, cap1='point'))

# ------------------------------------------------------------------ the long body in the big jacket, its fleece collar
TORSO = [dict(c=(0, 0.6, 11.6), w=8.0, h=3.8), dict(c=(0, 0.2, 15.2), w=10.8, ht=4.8, hb=4.8, e=2.3), dict(c=(0, 0.0, 19.2), w=10.4, h=4.6),
         dict(c=(0, -0.2, 23.0), w=10.8, ht=4.4, hb=4.4, e=2.5), dict(c=(0, -0.2, 25.4), w=8.0, h=3.6), dict(c=(0, -0.2, 26.8), w=4.8, h=2.6)]


def sc_torso(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1])
        d = 0.3 * np.exp(-((z - 14.6) / 0.6) ** 2) * (z > 13.0)                    # the knit waistband
        d += -0.3 * np.exp(-((x + 0.8) / 0.3) ** 2) * front * (z > 14.0)            # the zip
        d += 0.25 * np.cos(z * 1.6 + x * 0.4) ** 8 * (z > 15.6) * (z < 24)          # big leather creases
        return d
    tk.push(h, f)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 170, lo=1, hi=3, sculpt=sc_torso,
                  region=('jacket', [('fur', lambda C, N: (C[:, 2] < 13.4) | (C[:, 2] > 25.6)), ('knit', lambda C, N: (C[:, 2] >= 13.4) & (C[:, 2] < 15.4))])))
import math  # noqa: E402
B.add('body', limb('collar', [(4.4 * math.cos(a), -0.2 + 3.8 * math.sin(a), 25.6 + 0.4 * math.sin(a)) for a in np.linspace(-0.3, 2 * math.pi - 0.6, 9)],
                   1.6, tris=40, region='fleece', n=6, sculpt=lambda h: tk.push(h, lambda V, N: 0.2 * np.sin(V[:, 0] * 4.1) * np.sin(V[:, 1] * 3.7))))

# ------------------------------------------------------------------ the head: small, pointed, dark eye patches; goggles and the spyglass
NECK = (0, -0.2, 26.6)
head = tk.loft('head', [dict(c=(0, 1.6, 31.2), w=5.6, h=3.2), dict(c=(0, -0.6, 31.0), w=6.8, ht=3.4, hb=3.2),
                        dict(c=(0, -3.0, 30.2), w=4.8, h=2.4), dict(c=(0, -5.2, 29.6), w=2.4, ht=1.2, hb=1.3)],
               n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
HP = [low(head, 'head', 90, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 1] < -1.6) & (C[:, 2] < 29.8))])),
      limb('neck', [NECK, (0, -0.4, 30.0)], 2.4, tris=12, region='fur', n=6), blob('nose', (0, -5.7, 29.9), 0.6, tris=10, region='nose')]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 3.0, 0.2, 32.0), (sx * 3.9, 0.6, 33.4), 2.2, th=0.8, region='fur', tris=10, cup=(sx * 0.5, -1, 0)))
    gl = tk.lathe('goggle', [(0, -0.6), (1.4, -0.6), (1.5, 0.4), (1.1, 0.7), (0, 0.6)], n=8, centre=(0, 0, 0))
    tk.rotate(gl, -60, 'X')
    tk.move(gl, (sx * 1.6, -1.6, 34.0))
    HP.append(low(gl, 'goggle', 20, lo=0, hi=2, region=('brass', [('lens', lambda C, N: N[:, 2] > 0.3)])))
HP.append(limb('strap', [(3.0, -1.4, 34.2), (3.6, 0.6, 33.6), (0, 3.0, 33.2), (-3.6, 0.6, 33.6), (-3.0, -1.4, 34.2)], 0.55, tris=16, region='strap', n=5))
SG0, SG1 = V3(-1.6, -4.8, 31.0), V3(-3.6, -14.4, 32.6)
glass = tk.tube('spyglass', [tuple(SG0 + (SG1 - SG0) * t) for t in (0, 0.25, 0.26, 0.55, 0.56, 1.0)], [1.0, 1.0, 1.15, 1.15, 1.35, 1.45], n=8,
                cap0='round', cap1='flat')
HP.append(low(glass, 'spyglass', 40, lo=0, hi=2, region=('brass', [('leather', lambda C, N: np.abs(np.dot(C - SG0, (SG1 - SG0) / np.linalg.norm(SG1 - SG0)) - 4.6) < 1.4)])))
B.add('head', *HP)

# ------------------------------------------------------------------ the arms: one holds the spyglass up, the other is flung back
SR, SL = V3(-4.6, -0.2, 24.4), V3(4.6, -0.2, 24.4)
B.add('head', limb('arm_r', [SR, (-7.0, -5.0, 24.2), (-3.4, -9.0, 30.4)], [2.7, 2.4, 2.0], tris=28, region='jacket', n=8))
B.add('head', blob('fist_r', (-2.9, -9.8, 31.6), 1.6, tris=18, region='fur', squash=(1.0, 1.1, 1.0)))
WL = V3(11.0, 5.6, 19.6)
B.add('arm_l', limb('arm_l', [SL, (8.8, 2.0, 22.6), WL], [2.7, 2.4, 2.1], tris=28, region='jacket', n=8))
B.add('arm_l', limb('cuff_l', [WL, WL + (0.5, 0.5, -0.3)], 2.1, tris=12, region='knit', n=8, cap0='flat', cap1='flat'))
B.add('arm_l', *hand('hand_l', WL + (0.6, 0.6, -0.3), (0.6, 0.6, -0.5), r=1.4, kind='open', region='fur', up=(0, 0, 1)))

# ------------------------------------------------------------------ the spirit: a ghostly scarab, clinging small to her shoulder
G = 2.4
Q_FULL = V3(13.0, 0.0, 30.0)
Q_REST = V3(4.4, 1.6, 27.2)
ORBIT = (0, 0, 28.0)


def place(o):
    tk.move(o, tuple(-Q_FULL))
    tk.scale(o, (1 / G, 1 / G, 1 / G))
    tk.move(o, tuple(Q_REST))


def shrunk(p):
    return tuple((np.asarray(p, float) - Q_FULL) / G + Q_REST)


q = Q_FULL
SP = [low(tk.loft('sp_body', [dict(c=tuple(q + (0, 5.4, 0.0)), w=6.0, ht=2.4, hb=1.8), dict(c=tuple(q + (0, 2.0, 0.4)), w=9.4, ht=3.0, hb=2.4),
                              dict(c=tuple(q + (0, -2.4, 0.4)), w=9.0, ht=2.8, hb=2.2), dict(c=tuple(q + (0, -5.0, 0.0)), w=6.0, ht=2.0, hb=1.6)],
                  n=10, up=(0, 0, 1), cap0='round', cap1='round'), 'sp_body', 60, lo=1, hi=2, region='spirit')]
SP.append(low(tk.loft('sp_headp', [dict(c=tuple(q + (0, -5.4, 0.2)), w=6.4, h=1.0), dict(c=tuple(q + (0, -7.4, 0.0)), w=7.6, h=0.8)],
                      n=8, up=(0, 0, 1), cap0='round', cap1='round'), 'sp_headp', 20, lo=1, hi=1, region='spirit'))
SP.append(limb('sp_horn', [q + (0, -6.6, 0.4), q + (0, -8.4, 2.6), q + (0, -8.0, 4.2)], [0.9, 0.6, 0.15], tris=10, region='spirit', n=5, cap1='point'))
for sx in (1, -1):
    for i, y in enumerate((-2.6, 0.0, 2.6)):
        r0 = q + (sx * 3.4, y, -1.2)
        SP.append(limb('sp_leg', [r0, r0 + (sx * 2.6, -0.6 + 0.6 * i, -0.6), r0 + (sx * 3.6, -1.2 + 1.2 * i, -2.8)], [0.6, 0.5, 0.2], tris=10,
                       region='spirit', n=5, cap1='point'))
ELY = {}
for nm, sx in (('sp_ely_l', 1), ('sp_ely_r', -1)):
    hinge = q + (sx * 0.4, -3.4, 2.4)
    e = tk.loft(nm, [dict(c=tuple(q + (sx * 2.4, -3.2, 2.2)), w=4.4, ht=0.9, hb=0.5), dict(c=tuple(q + (sx * 2.6, 0.6, 2.6)), w=5.0, ht=1.1, hb=0.5),
                     dict(c=tuple(q + (sx * 2.2, 4.6, 1.8)), w=4.0, ht=0.8, hb=0.4)], n=8, up=(0, 0, 1), cap0='round', cap1='round')
    ELY[nm] = (low(e, nm, 30, lo=1, hi=2, region='shell',
                   sculpt=lambda h: tk.push(h, lambda V, N: -0.15 * (np.abs(np.mod(V[:, 0], 1.1) - 0.55) < 0.1))), hinge)
for a, b in SP + [v[0] for v in ELY.values()]:
    for o in (a, b):
        place(o)
B.add('spirit', *SP)
for nm, (pc, hinge) in ELY.items():
    B.add(nm, pc)
B.commit(F, kinds={'spirit': 'glass', 'sp_ely_l': 'glass', 'sp_ely_r': 'glass'}, uvw={'spirit': 2.0, 'sp_ely_l': 1.8, 'sp_ely_r': 1.8})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    R.bone('orbit', ORBIT, parent='body')
    R.bone('spirit', tuple(Q_REST), parent='orbit')
    for nm, (pc, hinge) in ELY.items():
        R.bone(nm, shrunk(hinge), parent='spirit')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_l', 'orbit', 'spirit', 'sp_ely_l', 'sp_ely_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # she sweeps the spyglass round, following it, her free arm up; the scarab swells off her shoulder
        k('head', 10)
        k('head', 30, rot=('Z', 24))
        k('head', 52, rot=('Z', -20))
        k('head', 72, rot=('Z', -20))
        k('head', 82)
        k('arm_l', 8, rot=('X', -14), ease='BACK')
        k('arm_l', 74, rot=('X', -14))
        k('arm_l', 84)
        spirit_keys(k, 'spirit', 4, 16, 70, 84, G, tuple(Q_FULL - Q_REST))
        for nm, sx in (('sp_ely_l', 1), ('sp_ely_r', -1)):
            k(nm, 14)
            k(nm, 20, rot=('Y', sx * 50), ease='BACK')
            for i in range(10):
                k(nm, 22 + i * 4, rot=('Y', sx * (62 if i % 2 == 0 else 44)), ease='LINEAR')
            k(nm, 64, rot=('Y', sx * 50))
            k(nm, 70)
        # once round her, clockwise seen from above
        k('orbit', 18)
        for i, f in enumerate((30, 42, 54, 66)):
            k('orbit', f, rot=('Z', -90 * (i + 1)), ease='LINEAR')
        k('orbit', 67)
        for b in allb:
            k(b, 90)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sand(P, pt, sh)
    P.fill('rock', pt.ramp('#a88a6a', 7, shift=0.06), tone=sh, base=0.0, brush={'preset': 'pvc', 'flow': 'down'})
    P.fill('fur', pt.ramp('#c9a878', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('cream', pt.ramp('#efdcbc', 6, shift=0.04), tone=sh, base=0.15)
    P.fill(P.region('fur') & (Z < 8.0) & (Yc > 7.0), pt.ramp('#3a2e26', 5), tone=sh, base=0.1)            # the dark tail tip
    P.fill('nose', pt.ramp('#2a2224', 5, shift=0.05, light=0.6), tone=sh, base=0.3)
    P.fill('jacket', pt.ramp('#7a4a2c', 7, shift=0.07, light=0.55), tone=sh, base=0.05)
    P.fill('knit', pt.ramp('#3e3a34', 6, shift=0.05), tone=sh, base=0.05)
    P.tint(P.region('knit') & (np.abs(np.mod(np.arctan2(X, Yc) * 8, 1.0) - 0.5) < 0.18), pt.ramp('#2a2620', 5), sh)
    P.fill('fleece', pt.ramp('#efe4cc', 6, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill('brass', pt.ramp('#c99a3e', 6, dark=0.6, light=0.6, shift=0.08), tone=sh, base=0.15)
    P.fill('leather', pt.ramp('#4a2e22', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('lens', pt.ramp('#5f8a9a', 5, shift=0.05, light=0.6), tone=sh, base=0.3, brush='gloss')
    P.fill('strap', pt.ramp('#3a2a22', 5, shift=0.05), tone=sh, base=0.0)
    # the face: dark eye patches, one eye squeezed shut behind the spyglass, the other a bright dot; a tight little mouth
    hd = (P.region('fur') | P.region('cream')) & (Z > 28)
    for sx in (1, -1):
        pf = face.Face(P, c=(sx * 1.6, -3.4, 31.0), axis=(sx * 0.3, -1, 0.1), where=hd, seed=941 + sx, ink='#3a2c24')
        pf.dot(0, 0, 0.95, 0.75, rot=sx * 20)
    fc = face.Face(P, c=(0, -4.4, 31.0), axis=(0, -1, 0.1), where=hd, seed=943, ink='#efe4c8')
    fc.eyes('dot', spread=3.2, size=0.32, dy=0.0, only=-1)
    fm = face.Face(P, c=(0, -5.4, 29.0), axis=(0, -1, -0.1), where=hd, seed=944)
    fm.mouth('dash', w=1.0, dy=-0.2, weight=0.28)
    # the spirit: a ghostly lapis scarab with gold wing cases
    ghost(P, pt, 'spirit', '#5f7fd0', sh)
    ghost(P, pt, 'shell', '#d8b040', sh)
    P.lines(['jacket', 'knit', 'fleece', 'brass'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=90, skip=[('head', 'body'), ('arm_l', 'body'), ('spirit', 'body'), ('sp_ely_l', 'spirit'), ('sp_ely_r', 'spirit'),
                                         ('sp_ely_l', 'body'), ('sp_ely_r', 'body'), ('spirit', 'head'), ('sp_ely_l', 'head'), ('sp_ely_r', 'head'),
                                         ('spirit', 'arm_l'), ('sp_ely_l', 'arm_l'), ('sp_ely_r', 'arm_l')],
    fold=(0, 18, 36, 54))
