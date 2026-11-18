"""仕立て屋カメレオン Chameleon Tailor (series datesha, concepts_E.md): the gang's tailor, a green chameleon in a
houndstooth three-piece suit with a pincushion on his wrist and a tape measure round his neck, its end pulled out in
one hand like a fencer's foil; the helmet-crested head, the turret eyes, the tail rolled in a tight spiral behind him.
Gimmick (pose change): the eyes swivel in two directions, the tail unrolls and lifts, and the tape whips up; then all
settles back.

    GG_FACET=1 tools/blender.sh art/blender/toys/datesha/kameleon.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('datesha', 'kameleon')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the plinth; the legs and the pincer-mitten feet
B.add('base', plinth(n=12))
for sx in (1, -1):
    B.add('body', limb('leg', [(sx * 2.8, -0.4 * sx, GZ + 1.6), (sx * 3.2, 0.0, 9.4), (sx * 2.6, 0.4, 13.2)], [2.0, 2.2, 2.6], tris=18, region='suit', n=8))
    for dy in (-1.4, 1.2):
        B.add('body', limb('toe', [(sx * 2.8, -0.4 * sx + dy * 0.3, GZ + 0.9), (sx * 2.8 + sx * 0.6, -0.4 * sx + dy * 1.6, GZ + 0.6)], [1.1, 0.8], tris=10,
                           region='skin', n=6))

# ------------------------------------------------------------------ the body, the waistcoat; the tape round the neck
TORSO = [dict(c=(0, 0.6, 12.6), w=9.6, h=4.4), dict(c=(0, 0.4, 16.2), w=9.8, ht=4.8, hb=4.6), dict(c=(0, 0.2, 20.0), w=10.4, h=4.6),
         dict(c=(0, 0.2, 23.2), w=11.4, ht=4.0, hb=4.0, e=2.5), dict(c=(0, 0.0, 24.8), w=6.0, h=3.0)]


def vest(C, N):
    return (N[:, 1] < -0.4) & (np.abs(C[:, 0]) < 0.6 + 0.4 * (C[:, 2] - 14.4)) & (C[:, 2] > 14.4)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 150, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (vest(V, N) == 0) * (N[:, 1] < -0.4) * (V[:, 2] > 14.4)),
                  region=('suit', [('vest', vest)])))
for sx in (1, -1):
    tape = tk.loft('tape', [dict(c=(sx * 2.6, -3.8, 24.4), w=1.3, h=0.18), dict(c=(sx * 3.0, -4.8, 20.0), w=1.3, h=0.18), dict(c=(sx * 3.2, -5.0, 15.4), w=1.3, h=0.18)],
                   n=4, up=(0, -1, 0), cap0='flat', cap1='flat')
    B.add('body', low(tape, 'tape', 8, lo=0, hi=1, region='tape'))
B.add('body', limb('tape_n', [(-3.0, -2.6, 24.8), (-2.0, 2.2, 25.6), (2.0, 2.2, 25.6), (3.0, -2.6, 24.8)], 0.35, tris=12, region='tape', n=4))

# ------------------------------------------------------------------ the tail: a tight spiral roll behind him (it unrolls on the press)
TR = V3(0, 4.6, 13.4)
sp = [TR + (0, 1.6 + r * math.cos(a), -1.6 - r * math.sin(a)) for a, r in zip(np.linspace(0, 3.6 * math.pi, 16), np.linspace(4.0, 0.8, 16))]
B.add('tail', limb('tail', [TR] + sp, [2.2] + list(np.linspace(1.8, 0.4, 16)), tris=50, region='skin', n=6, cap1='round'))

# ------------------------------------------------------------------ the arms: the tape's end held out like a foil, the pincushion wrist on the hip
SR, SL = V3(-5.6, 0.2, 22.6), V3(5.6, 0.2, 22.6)
WR = V3(-12.0, -6.0, 23.0)
B.add('arm_r', limb('arm_r', [SR, (-9.4, -1.6, 20.6), WR], [2.1, 1.9, 1.5], tris=24, region='suit', n=8))
B.add('arm_r', blob('hand_r', WR + (-0.8, -0.6, 0.2), 1.3, tris=10, region='skin'))
tend = tk.loft('tape_end', [dict(c=tuple(WR + (-1.0, -1.0, 0.4)), w=1.3, h=0.18), dict(c=tuple(WR + (-3.0, -5.4, 2.8)), w=1.3, h=0.18),
                            dict(c=tuple(WR + (-3.6, -8.6, 5.4)), w=1.3, h=0.18)], n=4, up=(0, 0, 1), cap0='flat', cap1='flat')
B.add('arm_r', low(tend, 'tape_end', 8, lo=0, hi=1, region='tape'))
B.add('arm_r', blob('tab', WR + (-3.6, -8.8, 5.6), 0.6, tris=8, region='brass', squash=(1.2, 0.5, 1.0), lo=0, hi=1))
B.add('body', limb('arm_l', [SL, (9.4, 0.8, 18.8), (6.4, -1.4, 15.6)], [2.1, 1.9, 1.5], tris=24, region='suit', n=8))
B.add('body', blob('hand_l', (5.8, -1.8, 15.2), 1.3, tris=10, region='skin'))
B.add('body', blob('cushion', (8.4, -0.4, 17.4), 1.6, tris=14, region='cushion', squash=(1.0, 1.0, 0.7)))

# ------------------------------------------------------------------ the head: the helmet crest, the long mouth, the turret eyes
NECK = (0, 0.0, 24.6)
head = tk.loft('head', [dict(c=(0, 2.6, 29.0), w=6.6, h=3.6), dict(c=(0, -0.2, 29.0), w=8.0, ht=3.8, hb=3.4), dict(c=(0, -3.4, 28.4), w=6.4, ht=2.8, hb=3.0),
                        dict(c=(0, -5.8, 27.8), w=3.8, ht=1.8, hb=2.0)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HP = [low(head, 'head', 90, lo=1, hi=3, region='skin',
          sculpt=lambda h: tk.push(h, lambda V, N: -0.35 * np.exp(-((V[:, 2] - 27.6 + 0.05 * V[:, 1]) / 0.3) ** 2) * (np.abs(N[:, 0]) > 0.4) * (V[:, 1] < -1))),
      limb('casque', [(0, 4.0, 30.4), (0, 3.0, 34.6), (0, -0.6, 33.8)], [2.2, 1.8, 0.4], tris=16, region='skin', n=6, cap1='point')]
B.add('head', *HP)
EYES = {}
for nm, sx in (('eye_l', 1), ('eye_r', -1)):
    c = V3(sx * 3.2, -2.8, 29.2)
    e = tk.lathe(nm, [(0, -1.0), (1.5, -0.6), (1.6, 0.5), (1.0, 1.3), (0.4, 1.7), (0, 1.8)], n=10, centre=(0, 0, 0))
    tk.rotate(e, sx * -80, 'Y')
    tk.rotate(e, -30 * sx, 'Z')
    tk.move(e, tuple(c))
    EYES[nm] = (low(e, nm, 24, lo=1, hi=2, region='skin'), c)
    B.add(nm, EYES[nm][0])
B.commit(F, bones={'base': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pose change)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('tail', tuple(TR), parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    for nm, (pc, c) in EYES.items():
        R.bone(nm, tuple(c), parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'tail', 'arm_r', 'eye_l', 'eye_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # the eyes swivel each their own way, twice
        for i, f in enumerate((6, 14, 22, 30)):
            k('eye_l', f, rot=[('Z', 40 if i % 2 == 0 else -30), ('X', 20 if i < 2 else -10)])
            k('eye_r', f, rot=[('Z', 30 if i % 2 == 0 else -40), ('X', -15 if i < 2 else 20)])
        k('eye_l', 60, rot=('Z', -30))
        k('eye_r', 60, rot=('Z', 30))
        k('eye_l', 70)
        k('eye_r', 70)
        # the tail unrolls and lifts, the tape whips up, the head cocks
        k('tail', 8)
        k('tail', 20, rot=('X', -55), ease='BACK')
        k('tail', 60, rot=('X', -55))
        k('tail', 72)
        k('arm_r', 10)
        k('arm_r', 18, rot=[('Y', -40), ('Z', 20)], ease='BACK')
        k('arm_r', 60, rot=[('Y', -40), ('Z', 20)])
        k('arm_r', 72)
        k('head', 10)
        k('head', 18, rot=('Y', -14))
        k('head', 60, rot=('Y', -14))
        k('head', 70)
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
    P.fill('suit', pt.ramp('#d8d0bc', 6, shift=0.04), tone=sh, base=0.1)
    su = P.region('suit')
    # houndstooth: a broken check, each tooth a square with a notch
    u, v = np.mod((X + Yc * 0.5) / 1.4, 1.0), np.mod(Z / 1.4, 1.0)
    tooth = ((u < 0.5) & (v < 0.5)) | ((u >= 0.5) & (v >= 0.5) & (u - 0.5 < v - 0.5)) | ((u < 0.25) & (v >= 0.5) & (v < 0.75))
    P.tint(su & tooth, pt.ramp('#2e2a30', 6, shift=0.05), sh)
    P.fill('vest', pt.ramp('#6a2a3a', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('skin', pt.ramp('#5aa04a', 7, shift=0.07), tone=sh, base=0.1)
    sk = P.region('skin')
    P.tint(sk & (np.abs(np.sin(Z * 1.4 + X * 0.3)) > 0.86), pt.ramp('#d8c84a', 6), sh)                            # yellow bands
    who, d = P.dabs(sk, size=0.45, spacing=1.6, seed=71)
    P.shift(sk & (who >= 0) & (d < 0.5), 1)
    P.fill('tape', pt.ramp('#e8d48a', 6, shift=0.05), tone=sh, base=0.15, brush=False)
    P.flat(P.region('tape') & (np.abs(np.mod(Z + X + Yc, 0.8) - 0.4) < 0.06), '#3a3224')
    P.fill('brass', pt.ramp('#c99a3e', 5, light=0.6), tone=sh, base=0.2)
    P.fill('cushion', pt.ramp('#c8343a', 6, shift=0.05), tone=sh, base=0.1)
    # the face: a dot at the tip of each turret eye, the long mouth stroked along the jaw, a sly upturn
    for nm, (pc, c) in EYES.items():
        sx = 1 if nm == 'eye_l' else -1
        tip = c + np.array((sx * 2.0 * math.cos(math.radians(14)), -2.0 * math.sin(math.radians(14)) * 1.0, 0)) * 1.0
        fe = face.Face(P, c=tuple(c + (sx * 1.6, -1.0, 0)), axis=(sx, -0.55, 0), where=sk, seed=1141 + sx)
        fe.dot(0, 0, 0.55, 0.5)
    for sx in (1, -1):
        sd = face.Face(P, c=(sx * 3.0, -3.6, 27.8), axis=(sx, -0.2, 0), where=sk & (Z > 26), seed=1144 + sx)
        sd.stroke([(-sx * 2.6, -0.1), (0.0, 0.0), (sx * 1.6, 0.35)], weight=0.28)
    P.lines(['suit', 'vest', 'tape'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('tail', 'body'), ('eye_l', 'head'), ('eye_r', 'head'), ('body', 'base'),
                                         ('tail', 'base')], fold=(0, 14, 22, 50))
