"""あやとりグモ Cat's-Cradle Spider: the ayatori champion, a fluffy little jumping spider (series meijin,
concepts_C.md): four legs to sit on, four to play with, a cat's cradle of red string stretched between the front
four, two big eyes and two little ones.

Gimmick: the four front legs pull the cradle wide, twist it over, and spring it back into shape; the spider bounces.

    tools/blender.sh art/blender/toys/meijin/kumo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '..', 'kaden', '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('meijin', 'kumo')

CY = -13.0                      # the cradle's plane (y)
ANCH = {(-1, 0): (-8.6, CY - 2.6, 8.4), (-1, 1): (-8.6, CY - 2.6, 0.9), (1, 0): (8.6, CY - 2.6, 8.4), (1, 1): (8.6, CY - 2.6, 0.9)}
HEADC = (0, -4.6, 13.6)         # the cephalothorax (the head end)
ABD = (0, 6.4, 8.4)            # the abdomen

# ------------------------------------------------------------------ the body: the round fluffy head end and the abdomen behind it
head = tk.loft('ceph', [{'c': (0, HEADC[1] + 5.0, HEADC[2] - 1.0), 'w': 11.0, 'h': 5.6, 'e': 2.2},
                        {'c': (0, HEADC[1] + 1.4, HEADC[2]), 'w': 15.6, 'h': 7.4, 'e': 2.3},
                        {'c': (0, HEADC[1] - 2.8, HEADC[2] + 0.2), 'w': 15.0, 'h': 7.2, 'e': 2.4},
                        {'c': (0, HEADC[1] - 5.4, HEADC[2]), 'w': 11.0, 'h': 5.6, 'e': 2.3}], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.8)
abd = tk.loft('abd', [{'c': (0, ABD[1] - 6.0, ABD[2] + 1.0), 'w': 9.0, 'h': 4.6, 'e': 2.2}, {'c': (0, ABD[1] - 2.0, ABD[2]), 'w': 15.4, 'h': 7.2, 'e': 2.3},
                      {'c': (0, ABD[1] + 3.6, ABD[2] - 0.6), 'w': 15.0, 'h': 6.8, 'e': 2.3}, {'c': (0, ABD[1] + 7.4, ABD[2] - 1.6), 'w': 8.0, 'h': 4.0, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)


def fluff(h):
    def f(V, N):  # soft fluffy hair
        return 0.1 * np.sin(V[:, 0] * 2.7 + V[:, 2] * 1.3) * np.sin(V[:, 1] * 2.5 - V[:, 2] * 1.9)
    tk.push(h, f)


BODY = [cx.low(head, 'ceph', 170, lo=1, hi=3, sculpt=fluff, region='fur'), cx.low(abd, 'abd', 150, lo=1, hi=3, sculpt=fluff, region='fur')]
# pedipalps: two little fluffy feelers by the face
for sx in (1, -1):
    pp = tk.tube('palp', [(sx * 3.0, HEADC[1] - 6.6, HEADC[2] - 3.4), (sx * 3.6, HEADC[1] - 8.6, HEADC[2] - 4.4), (sx * 3.4, HEADC[1] - 9.6, HEADC[2] - 6.4)],
                 [1.1, 1.0, 1.2], n=6, cap1='round')
    BODY.append(cx.low(pp, 'palp', 20, lo=1, hi=1, region='palp'))


# ------------------------------------------------------------------ legs: four to sit on, four holding the cradle
def leg(name, pts, rad=(1.6, 1.4, 1.1, 0.9)):
    t = tk.tube(name, pts, list(rad)[:len(pts)], n=6, cap1='round')
    return cx.low(t, name, 36, lo=1, hi=1, region='leg')


BACK = []
for sx in (1, -1):
    for a, ln in ((25, 1.0), (60, 1.05)):
        r = math.radians(a)
        hip = np.array((sx * 6.0, HEADC[1] + 3.0 + 2.0 * (a > 40), HEADC[2] - 2.0))
        knee = hip + np.array((sx * 8.0 * math.cos(r), 8.0 * math.sin(r) * 0.8, 4.0))
        foot = knee + np.array((sx * 6.0 * math.cos(r), 6.0 * math.sin(r), -knee[2] + 0.9))
        BACK.append(leg('bleg', [tuple(hip), tuple(knee), tuple(foot)]))
FRONT = {}
for sx, nm in ((-1, 'legs_r'), (1, 'legs_l')):
    lg = []
    for row in (0, 1):
        hip = np.array((sx * 6.0, HEADC[1] - 2.0, HEADC[2] - 0.6 + (1.2 if row == 0 else -2.0)))
        tip = np.array(ANCH[(sx, row)])
        knee = (hip + tip) / 2 + np.array((sx * 3.6, 0.6, 3.0 if row == 0 else -1.0))
        lg.append(leg('fleg', [tuple(hip), tuple(knee), tuple(tip)], rad=(1.5, 1.3, 1.0)))
    FRONT[nm] = (lg, (sx * 6.0, HEADC[1] - 2.0, HEADC[2]))

# ------------------------------------------------------------------ the cat's cradle: red string between the four front feet
A = ANCH
q1 = lambda a, b, t: tuple(np.array(a) + (np.array(b) - np.array(a)) * t)   # noqa: E731
lines = [(A[(-1, 0)], A[(1, 0)]), (A[(-1, 1)], A[(1, 1)]), (A[(-1, 0)], A[(1, 1)]), (A[(-1, 1)], A[(1, 0)]),
         (q1(A[(-1, 0)], A[(1, 0)], 0.3), q1(A[(-1, 1)], A[(1, 1)], 0.3)), (q1(A[(-1, 0)], A[(1, 0)], 0.7), q1(A[(-1, 1)], A[(1, 1)], 0.7))]
STR = []
for a, b in lines:
    s_ = tk.tube('string', [a, b], [0.35, 0.35], n=4, cap0=None, cap1=None)
    STR.append(cx.low(s_, 'string', 8, lo=0, hi=0, region='string'))

# ------------------------------------------------------------------ parts
F.part('body', tk.join([b_[0] for b_ in BODY] + [l[0] for l in BACK], 'body'), [b_[1] for b_ in BODY] + [l[1] for l in BACK], bone='body')
for nm, (lg, hip) in FRONT.items():
    F.part(nm, tk.join([l[0] for l in lg], nm), [l[1] for l in lg], bone=nm)
F.part('cradle', tk.join([s_[0] for s_ in STR], 'cradle'), [s_[1] for s_ in STR], bone='cradle', uvw=0.6)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, 1.0), parent='root')
    for nm, (lg, hip) in FRONT.items():
        R.bone(nm, hip, parent='body')
    R.bone('cradle', (0, CY - 2.6, 4.65), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'legs_l', 'legs_r', 'cradle']
    SP = 2.4   # how far each side pulls out
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # pull the cradle wide...
        for nm, sx in (('legs_l', 1), ('legs_r', -1)):
            k(nm, 3)
            k(nm, 10, move=(sx * SP, 0, 0), ease='BACK')
            k(nm, 16, move=(sx * SP, 0, 0))
        k('cradle', 3)
        k('cradle', 10, scale=((8.6 + SP) / 8.6, 1.0, 1.0), ease='BACK')
        # ...twist it over (the whole cradle and the legs turn together)...
        k('cradle', 16, scale=((8.6 + SP) / 8.6, 1.0, 1.0))
        k('cradle', 26, rot=('Y', 180), scale=((8.6 + SP) / 8.6, 1.0, 1.0))
        k('body', 16)
        k('body', 21, rot=('Y', 10))
        k('body', 26, rot=('Y', 0))
        for nm, sx in (('legs_l', 1), ('legs_r', -1)):
            k(nm, 21, move=(sx * SP, 0, 2.0 * sx))
            k(nm, 26, move=(sx * SP, 0, 0))
            # ...and spring it back into shape
            k(nm, 32, move=(sx * SP, 0, 0))
            k(nm, 37, ease='BACK')
        k('cradle', 32, rot=('Y', 180), scale=((8.6 + SP) / 8.6, 1.0, 1.0))
        k('cradle', 37, rot=('Y', 180), ease='BACK')
        k('body', 36)
        k('body', 40, move=(0, 0, 1.4))
        k('body', 45, ease='BOUNCE')
        for b in allb:
            k(b, 52)
        k('cradle', 52, rot=('Y', 180))
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    P.fill('fur', pt.ramp('#3a3440', 7, shift=0.06), tone=sh, base=0.22)
    fm = P.region('fur')
    # a cream band over the eyes, orange spots on the abdomen, a pale belly
    P.tint(fm & (np.abs(Z - (HEADC[2] + 4.8)) < 1.0) & (Yc < HEADC[1] + 2.0), pt.ramp('#f2e2b4', 6, shift=0.05), sh + 0.1)
    for cx_, cy_ in ((-3.4, ABD[1] - 1.0), (3.4, ABD[1] - 1.0), (0.0, ABD[1] + 3.4)):
        P.tint(fm & (np.hypot(X - cx_, Yc - cy_) < 2.0) & (Z > ABD[2] + 3.0), pt.ramp('#e8883a', 6, shift=0.06), sh + 0.1)
    P.fill('leg', pt.ramp('#4a4450', 6, shift=0.06), tone=free, base=0.2)
    P.tint(P.region('leg') & (np.abs(np.mod(Z * 0.9 + X * 0.3, 3.0) - 1.5) < 0.4), pt.ramp('#d8c8a4', 5, shift=0.05), free + 0.2)
    P.fill('palp', pt.ramp('#e8883a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('string', pt.ramp('#d8343a', 5, shift=0.05), tone=free * 0.4, base=0.2)
    # the face, drawn on in pale ink on the dark fur: two big eyes, two small ones beside them, a little 'ω'
    hd = fm & (P.part == PI['body']) & (Yc < HEADC[1] - 3.0)
    fc = face.Face(P, c=(0, HEADC[1] - 7.4, HEADC[2] + 1.6), axis=(0, -1, 0.15), where=hd, seed=211, ink='#e2a43c')  # (amber spider eyes: never a blank white eye)
    fc.eyes('big', spread=4.6, size=0.75, dy=0.6)
    fc.dot(-5.4, 1.6, 0.42, 0.5)
    fc.dot(5.4, 1.4, 0.4, 0.48)
    fc.mouth('w', w=2.0, dy=-2.6)
    P.lines(['fur'], ['palp', 'leg'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 53), skip=[('legs_l', 'body'), ('legs_r', 'body'), ('cradle', 'legs_l'), ('cradle', 'legs_r')]),
       cams=[((58, -74, 50), (0, -4, 14)), ((-56, 64, 44), (0, 0, 14))], fold=(0, 10, 22, 34))
