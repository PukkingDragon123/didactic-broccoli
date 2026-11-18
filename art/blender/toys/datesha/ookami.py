"""伊達オオカミ Dandy Wolf (series datesha, concepts_E.md): the young boss of the dandy gang, a grey wolf in a cropped
cream double-breasted jacket cut in a deep V to his chest fur, gold bee brooches on the lapels, high-waisted wide
burgundy trousers and two-tone shoes, his mane slicked back; contrapposto on a chequered marble plinth, one hand on his
heart and the other on his hip, head tilted.
Gimmick (pose change): the hand on his heart sweeps up to point at the sky, the head follows, the hips swing over; he
holds it, then settles back.

    GG_FACET=1 tools/blender.sh art/blender/toys/datesha/ookami.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('datesha', 'ookami')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the plinth; wide trousers, weight on the left leg, the right knee in
B.add('base', plinth())
B.add('legs', shoe('shoe_l', (3.0, 1.2, GZ - 0.2), (0.3, -1, 0), L=6.0, W=3.0, H=2.2, region='shoe'))
B.add('legs', shoe('shoe_r', (-2.6, -0.8, GZ - 0.2), (-0.5, -1, 0), L=6.0, W=3.0, H=2.2, region='shoe'))
for nm, pts in (('leg_l', [(3.0, 0.6, GZ + 1.8), (2.8, 0.2, 9.6), (2.6, 0.4, 15.6)]), ('leg_r', [(-2.8, -1.2, GZ + 1.8), (-0.8, -1.6, 9.6), (-2.4, 0.4, 15.6)])):
    B.add('legs', limb(nm, pts, [2.6, 2.6, 3.0], tris=24, region='pants', n=8,
                       sculpt=lambda h: tk.push(h, lambda V, N: -0.25 * np.exp(-((np.abs(V[:, 0]) - 2.6) / 0.3) ** 2) * (N[:, 1] < -0.5))))

# ------------------------------------------------------------------ the body: high waistband, the cropped jacket's deep V, the chest fur
TORSO = [dict(c=(0, 0.4, 14.6), w=9.6, h=4.2), dict(c=(0, 0.4, 18.0), w=9.0, h=4.0), dict(c=(0, 0.2, 21.8), w=11.0, h=4.4),
         dict(c=(0, 0.2, 25.2), w=13.4, ht=4.2, hb=4.2, e=2.7), dict(c=(0, 0.2, 27.0), w=7.2, h=3.4)]


def vee(C, N):
    return (N[:, 1] < -0.35) & (np.abs(C[:, 0]) < 0.3 + 0.5 * (C[:, 2] - 18.4)) & (C[:, 2] > 18.4)


def sc_torso(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = N[:, 1] < -0.35
        lapel = 0.4 * (np.abs(np.abs(x) - (0.3 + 0.5 * (z - 18.4)) - 0.8) < 0.8) * front * (z > 18.4)
        band = 0.3 * tk.smoothstep(0.7, 0.3, np.abs(z - 17.4))
        return lapel + band - 0.4 * vee(V, N)
    tk.push(h, f)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 170, lo=1, hi=3, sculpt=sc_torso,
                  region=('jacket', [('pants', lambda C, N: C[:, 2] < 17.0), ('band', lambda C, N: C[:, 2] < 18.0), ('chest', vee)])))
B.add('body', limb('tail', [(0, 4.2, 15.6), (0.6, 7.6, 12.6), (1.6, 9.0, 8.6), (2.6, 8.4, 6.0)], [1.6, 2.4, 2.0, 0.6], tris=24, region='fur', n=8, cap1='point',
                   sculpt=lambda h: tk.push(h, lambda V, N: 0.2 * np.sin(V[:, 0] * 3.3) * np.sin(V[:, 2] * 2.9))))
for sx in (1, -1):
    B.add('body', blob('bee', (sx * 2.6, -4.0, 24.6), 0.75, tris=10, region='bee', squash=(1.0, 0.6, 1.3), lo=0, hi=1))

# ------------------------------------------------------------------ the arms: hand on heart (it will sweep up), hand on hip
SR, SL = V3(-6.4, 0.2, 25.0), V3(6.4, 0.2, 25.0)
WR = V3(-1.4, -5.6, 22.6)
B.add('arm_r', limb('arm_r', [SR, (-7.6, -3.6, 20.6), WR], [2.3, 2.0, 1.6], tris=26, region='jacket', n=8))
B.add('arm_r', limb('cuff_r', [WR, WR + (0.6, -0.3, 0.2)], 1.7, tris=8, region='shirt', n=8, cap0='flat', cap1='flat'))
B.add('arm_r', *hand('hand_r', WR + (0.8, -0.4, 0.3), (0.95, -0.2, 0.3), r=1.5, kind='mitt', region='fur', up=(0, -1, 0)))
WL = V3(6.6, -1.4, 17.2)
B.add('arm_l', limb('arm_l', [SL, (10.4, 0.8, 20.4), WL], [2.3, 2.0, 1.6], tris=26, region='jacket', n=8))
B.add('arm_l', *hand('hand_l', WL, (-0.6, -0.2, -0.6), r=1.5, kind='mitt', region='fur'))

# ------------------------------------------------------------------ the head: a long wolf muzzle, tall ears, the slicked-back mane
NECK = (0, 0.2, 26.8)
head = tk.loft('head', [dict(c=(0, 2.6, 31.0), w=7.4, h=3.8), dict(c=(0, 0.0, 31.0), w=8.6, ht=4.0, hb=3.6), dict(c=(0, -3.2, 30.0), w=5.6, ht=2.6, hb=2.8),
                        dict(c=(0, -6.6, 29.2), w=3.6, ht=1.7, hb=1.9)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HP = [low(head, 'head', 110, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 2] < 29.6) & (C[:, 1] < -1.0))])),
      limb('neck', [NECK, (0, 0.0, 29.6)], 2.8, tris=12, region='fur', n=8), blob('nose', (0, -7.6, 29.8), 0.75, tris=10, region='nose')]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 2.8, 1.2, 33.6), (sx * 3.8, 2.4, 38.0), 3.0, th=1.0, region='fur', tris=12, cup=(sx * 0.3, -1, 0.1)))
mane = tk.loft('mane', [dict(c=(0, -1.6, 34.6), w=5.6, h=1.0), dict(c=(0, 1.4, 35.0), w=7.0, h=1.4), dict(c=(0, 4.6, 33.4), w=7.4, h=1.6),
                        dict(c=(0, 6.8, 30.0), w=5.6, h=1.4), dict(c=(0, 7.4, 27.4), w=3.4, h=0.8)], n=10, up=(0, 0, 1), cap0='round', cap1='point')
HP.append(low(mane, 'mane', 50, lo=1, hi=3, region='mane', sculpt=lambda h: tk.push(h, lambda V, N: -0.2 * (np.abs(np.sin(V[:, 0] * 2.4)) > 0.85))))
for a, b in HP:
    for o in (a, b):
        tk.rotate(o, 12, 'Y', pivot=NECK)
B.add('head', *HP)
B.commit(F, bones={'base': 'root', 'legs': 'hips'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pose change)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('hips', (0, 0, GZ), parent='root')
    R.bone('body', (0, 0.4, 15.6), parent='hips')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'hips', 'body', 'head', 'arm_r', 'arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # pose B: the body swings over, the arm sweeps up to point at the sky, the head tips back to follow it
        B_ = {'body': [('Y', -12), ('Z', 16)], 'arm_r': [('X', -40), ('Y', -100)], 'head': [('Y', -22), ('X', -14)], 'arm_l': [('Y', 6)]}
        for b, r in B_.items():
            k(b, 6)
            k(b, 16, rot=r, ease='BACK')
            k(b, 60, rot=r)
            k(b, 72)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('marble', pt.ramp('#e9e4da', 6, shift=0.04), tone=sh, base=0.1)
    mb = P.region('marble') & (P.on[:, :, 2] > 0.5)
    P.tint(mb & ((np.floor(X / 3.0) + np.floor(Yc / 3.0)) % 2 == 0), pt.ramp('#2a2a30', 6, shift=0.05), sh)
    P.fill('fur', pt.ramp('#8a8c94', 7, shift=0.05), tone=sh, base=0.1, brush='fur')
    P.fill('cream', pt.ramp('#e2ddd2', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('chest', pt.ramp('#e2ddd2', 6, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill('mane', pt.ramp('#4a4c58', 7, shift=0.06, light=0.6), tone=sh, base=0.15, brush={'preset': 'gloss', 'flow': 'along', 'axis': (0, 1, -0.3)})
    P.fill('nose', pt.ramp('#1e1c20', 5, light=0.6), tone=sh, base=0.3)
    P.fill('jacket', pt.ramp('#ece2c8', 6, shift=0.04), tone=sh, base=0.1)
    jk = P.region('jacket')
    # a little woven bee motif scattered over the jacket
    who, d = P.dabs(jk, size=0.5, spacing=3.2, seed=51)
    P.tint(jk & (who >= 0) & (d < 0.6), pt.ramp('#c89a30', 5), sh)
    P.tint(jk & (who >= 0) & (d < 0.25), pt.ramp('#2a2426', 5), sh)
    P.fill('band', pt.ramp('#5a1e2a', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('pants', pt.ramp('#7a2434', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('shirt', pt.ramp('#f4f1ea', 6, shift=0.03), tone=sh, base=0.15)
    P.fill('shoe', pt.ramp('#f1ece2', 6, shift=0.03), tone=sh, base=0.15, brush='gloss')
    P.fill(P.region('shoe') & (Yc < np.where(X > 0, -1.8, -3.4)), pt.ramp('#2a2224', 5, light=0.6), tone=sh, base=0.2, brush='gloss')
    P.fill('bee', pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08), tone=sh, base=0.2)
    P.flat(P.region('bee') & (np.abs(np.mod(Z, 0.7) - 0.35) < 0.1), '#2a2426')
    # the face: half-lidded, one raised brow, a confident little upturn
    hd = (P.region('fur') | P.region('cream')) & (Z > 27.5)
    ax = (0.2, -1, 0.1)
    # (the head looks down past its snout: the eyes sit on the brow above it, facing up and out, big enough to read)
    fc = face.Face(P, c=(-0.3, -2.4, 31.4), axis=(0.0, -1, 0.45), where=hd, seed=1101)
    fc.eyes('dot', spread=4.3, size=0.62, dy=0.0)
    fm = face.Face(P, c=(-0.6, -7.4, 28.8), axis=ax, where=hd, seed=1102)
    fm.mouth('upturn', w=2.0, dy=-0.2, weight=0.3)
    P.lines(['jacket', 'band', 'pants', 'shirt'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('body', 'legs'), ('legs', 'base'), ('arm_r', 'head'),
                                         ('arm_l', 'legs'), ('body', 'base')], fold=(0, 16, 40, 76))
