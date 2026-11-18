"""砂嵐フェネック Sandstorm Fennec (series sabaku, concepts_E.md): a young fennec fox in a cropped red bolero jacket
with brass buttons and navy flared trousers, the enormous ears, up on one foot in a high crane kick with her arms flung
out, the big bushy tail swept down to the sand. On her back, small as a brooch: her spirit, a ghostly scorpion.
Gimmick: the scorpion swells up behind her, rears, and its sting stabs over her head in a flurry; then it shrinks.

    GG_FACET=1 tools/blender.sh art/blender/toys/sabaku/fennec.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('sabaku', 'fennec')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the drift; the standing leg in its flare, the kicking leg up
B.add('body', drift(r=13.6, seed=7))
B.add('body', limb('thigh_l', [(2.6, 0.4, 15.4), (2.9, -0.4, 9.8)], [2.6, 2.1], tris=18, region='pants', n=8))
B.add('body', low(tk.loft('flare_l', [dict(c=(2.9, -0.4, 10.0), w=4.2, h=2.1), dict(c=(2.7, 0.0, GZ + 2.0), w=6.2, h=3.0)], n=10,
                          up=(0, -1, 0), cap0='round', cap1='flat'), 'flare_l', 24, lo=1, hi=2, region='pants'))
B.add('body', shoe('shoe_l', (2.6, 1.6, GZ - 0.2), (0.25, -1, 0), L=5.6, W=3.0, H=2.2, region='shoe'))
KN, AN = V3(-6.4, -6.4, 19.0), V3(-7.6, -6.0, 12.6)
B.add('body', limb('thigh_r', [(-2.6, 0.4, 15.4), KN], [2.6, 2.1], tris=18, region='pants', n=8))
B.add('body', low(tk.loft('flare_r', [dict(c=tuple(KN), w=4.2, h=2.1), dict(c=tuple(AN + (0, 0, 0.6)), w=6.0, h=3.0)], n=10,
                          up=(0, -1, 0), cap0='round', cap1='flat'), 'flare_r', 24, lo=1, hi=2, region='pants'))
B.add('body', limb('foot_r', [AN + (0, 0, 1.2), AN + (-0.6, -1.2, -1.6), AN + (-0.8, -3.6, -2.4)], [1.3, 1.3, 1.0], tris=18, region='shoe', n=8))

# ------------------------------------------------------------------ the body, the bolero, the tail swept down to the sand
TORSO = [dict(c=(0.2, 0.4, 14.6), w=9.8, ht=4.4, hb=4.6), dict(c=(0.3, 0.3, 18.0), w=8.4, h=3.8), dict(c=(0.5, 0.2, 21.6), w=9.6, h=4.2),
         dict(c=(0.7, 0.2, 24.4), w=10.8, ht=3.8, hb=3.9, e=2.5), dict(c=(0.8, 0.2, 26.0), w=6.2, h=3.0)]


def sc_torso(h):
    def f(V, N):
        x, z = V[:, 0] - 0.5, V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1])
        d = 0.35 * tk.smoothstep(19.4, 20.0, z) * (np.abs(x) > 1.6 - 0.4 * (z - 20.0)) * front   # the bolero's open front, cut away
        d += 0.25 * np.exp(-((z - 15.6) / 0.6) ** 2)                                              # the belt
        return d
    tk.push(h, f)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 160, lo=1, hi=3, sculpt=sc_torso,
                  region=('jacket', [('pants', lambda C, N: C[:, 2] < 15.0), ('belt', lambda C, N: (C[:, 2] >= 15.0) & (C[:, 2] < 16.4)),
                                     ('shirt', lambda C, N: (C[:, 2] < 19.6) | ((N[:, 1] < -0.5) & (np.abs(C[:, 0] - 0.5) < 1.6 - 0.4 * (C[:, 2] - 20.0))))])))
B.add('body', limb('tail', [(0, 3.4, 15.4), (1.4, 7.6, 12.4), (2.8, 10.4, 7.6), (2.2, 9.8, 3.8)], [1.6, 3.2, 3.0, 1.4], tris=44, region='tail', n=8,
                   sculpt=lambda h: tk.push(h, lambda V, N: 0.25 * np.sin(V[:, 0] * 3.1) * np.sin(V[:, 2] * 2.7 + V[:, 1])), cap1='round'))

# ------------------------------------------------------------------ arms flung out: one forward, one up behind
SR, SL = V3(-4.8, 0.2, 24.0), V3(5.8, 0.4, 24.2)
WR, WL = V3(-13.2, -6.6, 27.2), V3(11.0, 3.4, 33.6)
B.add('arm_r', limb('slv_r', [SR, (-9.2, -3.6, 25.4)], [2.2, 1.9], tris=18, region='jacket', n=8, cap1='flat'))
B.add('arm_r', limb('fore_r', [(-9.2, -3.6, 25.4), WR], [1.5, 1.2], tris=14, region='fur', n=6))
B.add('arm_r', *hand('hand_r', WR, (-0.65, -0.55, 0.25), r=1.5, kind='open', region='fur', up=(0, 0, 1)))
B.add('arm_l', limb('slv_l', [SL, (9.2, 2.4, 28.6)], [2.2, 1.9], tris=18, region='jacket', n=8, cap1='flat'))
B.add('arm_l', limb('fore_l', [(9.2, 2.4, 28.6), WL], [1.5, 1.2], tris=14, region='fur', n=6))
B.add('arm_l', *hand('hand_l', WL, (0.35, 0.2, 1), r=1.5, kind='open', region='fur', up=(0, -1, 0)))

# ------------------------------------------------------------------ the head: round, a fine pointed muzzle, the huge ears
NECK = (0.8, 0.2, 26.4)
head = tk.loft('head', [dict(c=(0.8, 2.6, 31.6), w=7.6, h=4.0), dict(c=(0.8, -0.4, 31.4), w=9.2, ht=4.6, hb=4.2),
                        dict(c=(0.8, -3.6, 30.4), w=6.2, ht=2.9, hb=3.0), dict(c=(0.8, -6.6, 29.6), w=2.8, ht=1.3, hb=1.5)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
HP = [low(head, 'head', 110, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 1] < -2.0) & (C[:, 2] < 30.6))]))]
HP.append(blob('nose', (0.8, -7.4, 30.0), 0.8, tris=12, region='nose'))
for sx in (1, -1):
    HP.append(ear('ear', (0.8 + sx * 2.8, 0.4, 34.6), (0.8 + sx * 7.8, 1.6, 43.0), 5.4, th=1.1, region='ear', tris=18, cup=(sx * 0.3, -1, 0.1)))
B.add('head', *HP)

# ------------------------------------------------------------------ the spirit: a ghostly scorpion, rearing behind her, its tail over her head
G = 2.6
Q_FULL = V3(4.0, 10.0, 24.0)
Q_REST = V3(0.6, 4.4, 21.6)


def place(o):
    tk.move(o, tuple(-Q_FULL))
    tk.scale(o, (1 / G, 1 / G, 1 / G))
    tk.move(o, tuple(Q_REST))


def shrunk(p):
    return tuple((np.asarray(p, float) - Q_FULL) / G + Q_REST)


q = Q_FULL
seg = [dict(c=tuple(q + (0, 0.4, -9.0 + 2.6 * i)), w=w_, ht=2.4, hb=2.6, e=2.4) for i, w_ in enumerate((3.0, 6.0, 7.6, 8.4, 8.6, 8.2, 7.0))]
SP = [low(tk.loft('sp_body', seg, n=10, up=(0, -1, 0), cap0='round', cap1='round'), 'sp_body', 80, lo=1, hi=2, region='spirit',
          sculpt=lambda h: tk.push(h, lambda V, N: -0.3 * (np.abs(np.mod(V[:, 2] - q[2], 2.6) - 1.3) > 1.05)))]
for sx in (1, -1):
    for i, z in enumerate((0.0, 3.0)):
        r0 = q + (sx * 3.6, 0.6, z - 2.0)
        SP.append(limb('sp_leg', [r0, r0 + (sx * 3.6, -0.4, 1.6), r0 + (sx * 5.4, -1.0, -1.8)], [0.8, 0.7, 0.3], tris=12, region='spirit', n=5, cap1='point'))
    # the pincers, reaching forward round her sides, open
    p0 = q + (sx * 3.0, -1.0, 5.6)
    el = p0 + (sx * 4.6, -4.6, -2.0)
    cl = el + (-sx * 1.4, -6.4, 0.6)
    SP.append(limb('sp_arm', [p0, el, cl], [1.2, 1.1, 1.4], tris=18, region='spirit', n=6))
    SP.append(limb('sp_claw', [cl, cl + (sx * 1.2, -3.0, 0.6), cl + (sx * 0.2, -5.2, 0.4)], [1.6, 1.2, 0.3], tris=14, region='spirit', n=6, cap1='point'))
    SP.append(limb('sp_claw2', [cl, cl + (-sx * 1.0, -2.6, 0.0), cl + (-sx * 0.2, -4.2, 0.2)], [1.2, 0.9, 0.25], tris=12, region='spirit', n=6, cap1='point'))
TAIL0 = q + (0, 1.0, 8.4)
tail = [limb('sp_tail', [TAIL0, q + (0, 2.6, 12.4), q + (0, 1.6, 16.6), q + (0, -2.6, 19.2), q + (0, -7.0, 18.6)], [2.0, 1.9, 1.7, 1.5, 1.4], tris=44,
             region='spirit', n=8, sculpt=lambda h: tk.push(h, lambda V, N: -0.3 * (np.abs(np.sin((V[:, 1] + V[:, 2]) * 1.3)) > 0.93)))]
ST = q + (0, -7.0, 18.6)
tail.append(limb('sp_sting', [ST, ST + (0, -2.2, -0.6), ST + (0, -3.6, -2.6), ST + (0, -3.0, -4.6)], [1.8, 1.3, 0.7, 0.1], tris=16, region='sting', n=6,
                 cap1='point'))
for a, b in SP + tail:
    for o in (a, b):
        place(o)
B.add('spirit', *SP)
B.add('sp_tail', *tail)
B.commit(F, kinds={'spirit': 'glass', 'sp_tail': 'glass'}, uvw={'spirit': 1.8, 'sp_tail': 1.8})


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
    R.bone('sp_tail', shrunk(TAIL0), parent='spirit')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'spirit', 'sp_tail']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # her arms snap wider, her head whips round to you; the scorpion swells up behind her
        k('arm_r', 6, rot=('Z', -10), ease='BACK')
        k('arm_r', 72, rot=('Z', -10))
        k('arm_r', 82)
        k('arm_l', 6, rot=('Y', 12), ease='BACK')
        k('arm_l', 72, rot=('Y', 12))
        k('arm_l', 82)
        k('head', 8, rot=('Z', 14), ease='BACK')
        k('head', 72, rot=('Z', 14))
        k('head', 82)
        spirit_keys(k, 'spirit', 4, 16, 72, 86, G, tuple(Q_FULL - Q_REST))
        # the sting stabs forward over her head, again and again
        k('sp_tail', 18)
        for i in range(6):
            f = 22 + i * 7
            k('sp_tail', f, rot=('X', 26), ease='LINEAR')
            k('sp_tail', f + 4, rot=('X', -6), ease='QUAD')
        k('sp_tail', 66, rot=('X', 32), ease='BACK')
        k('sp_tail', 72, rot=('X', 32))
        k('sp_tail', 80)
        for b in allb:
            k(b, 90)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    sand(P, pt, sh)
    P.fill('fur', pt.ramp('#e3c08c', 7, shift=0.06), tone=sh, base=0.15, brush='fur')
    P.fill('tail', pt.ramp('#e3c08c', 7, shift=0.06), tone=sh, base=0.15, brush='fur')
    P.fill(P.region('tail') & (Z < 6.0), pt.ramp('#5a3e2a', 6, shift=0.05), tone=sh, base=0.1)         # the dark tail tip
    P.fill('cream', pt.ramp('#f6ead2', 6, shift=0.04), tone=sh, base=0.2)
    P.fill('ear', pt.ramp('#e3c08c', 7, shift=0.06), tone=sh, base=0.15)
    ein = P.region('ear') & (P.on[:, :, 1] < -0.4)
    P.fill(ein, pt.ramp('#efc9b4', 6, shift=0.05), tone=sh, base=0.2)                                  # the pale inner ears
    P.fill('nose', pt.ramp('#2a2224', 5, shift=0.05, light=0.6), tone=sh, base=0.3)
    RED = pt.ramp('#a32c3a', 7, shift=0.07)
    P.fill('jacket', RED, tone=sh, base=0.05)
    jk = P.region('jacket')
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    for z in (21.0, 23.0):
        for sx in (1, -1):
            P.fill(jk & (np.hypot(X - 0.5 - sx * 2.6, Z - z) < 0.55) & (Yc < -2), GOLD, tone=sh, base=0.2)
    P.fill('shirt', pt.ramp('#f1ebdf', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('belt', pt.ramp('#5a3a26', 6, shift=0.05), tone=sh, base=0.05)
    P.fill(P.region('belt') & (np.abs(X - 0.4) < 0.9) & (Yc < -2), GOLD, tone=sh, base=0.2)
    P.fill('pants', pt.ramp('#2f3d66', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('shoe', pt.ramp('#b07a46', 6, shift=0.06), tone=sh, base=0.1, brush='gloss')
    # the face: fierce little dots under angry brows, a confident grin
    hd = (P.region('fur') | P.region('cream')) & (Z > 27)
    fc = face.Face(P, c=(0.8, -5.6, 31.6), axis=(0, -1, 0.1), where=hd, seed=921)
    fc.eyes('dot', spread=5.4, size=0.55, dy=0.4, uneven=0.2)
    fc.brows('angry', spread=5.8, dy=1.8, w=1.9, weight=0.42)
    fc.mouth('grin', w=2.4, dy=-2.2, weight=0.32, teeth=3)
    fc.blush(6.4, -0.8, rx=1.0, ry=0.6)
    # the spirit: a warm ghost amber, the sting deeper
    ghost(P, pt, 'spirit', '#e09a4e', sh)
    ghost(P, pt, 'sting', '#c4503a', sh)
    P.lines(['jacket', 'belt', 'pants'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=90, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('spirit', 'body'), ('sp_tail', 'spirit'),
                                         ('sp_tail', 'body'), ('spirit', 'head'), ('sp_tail', 'head'), ('spirit', 'arm_r'), ('spirit', 'arm_l'),
                                         ('sp_tail', 'arm_l'), ('sp_tail', 'arm_r')],
    fold=(0, 18, 26, 66))
