"""片足 Kataashi, "One-Leg Balance" (series hashigo): a green tree frog on the lower rung of its ladder section, on one
foot, the other leg kicked out behind, the left arm out for balance and an open red-and-gold fan held high.
Gimmick: a press and it teeters: it rocks on its foot, the free leg sweeps, the fan flutters, and it holds the pose.

    tools/blender.sh art/blender/toys/hashigo/kataashi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402

import tk  # noqa: E402
import face  # noqa: E402
import _frog as fr  # noqa: E402
from fig import Fig  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('hashigo', 'kataashi')

PELVIS = (0.6, -5.4, 20.6)
M = fr.body_matrix(rot=(-9, 7, 0), at=PELVIS)
fr.ladder(F, seed=1)
lo, his = fr.body(F, M, seed=11)
F.part('body', lo, his, bone='body')
# the support leg (its left, +X) on the rung's front, the right leg kicked out behind and to the side
leg_l, HIP_L = fr.leg(F, M, 1, knee=(9.4, -9.8, 19.2), heel=(5.8, -2.6, 17.0), ankle=(4.4, 1.4, 14.2), foot_dir=(0.1, -1, -0.35), foot_up=(0, -0.3, 1))
leg_r, HIP_R = fr.leg(F, M, -1, knee=(-9.4, -5.4, 18.2), heel=(-12.4, -2.2, 21.8), ankle=(-15.6, -3.4, 23.6), foot_dir=(-0.7, -0.2, 0.6), foot_up=(-0.5, -0.6, 0.5))
# the left arm out for balance, the right one high with the fan
arm_l, SH_L = fr.arm(F, M, 1, elbow=(10.8, -8.0, 28.8), wrist=(14.8, -9.6, 31.4), hand_dir=(0.8, -0.3, 0.45), hand_up=(0, -0.3, 1))
arm_r, SH_R = fr.arm(F, M, -1, elbow=(-10.6, -7.6, 30.8), wrist=(-12.2, -8.4, 34.6), hand_dir=(-0.2, -0.1, 1), hand_up=(-1, 0, 0))
# the fan: a half-open folding fan, its pivot in the right hand, ribs fanning out above it
FAN0 = np.array((-12.4, -8.6, 35.6))
outline = [(0.0, 0.0)] + [(5.8 * math.cos(a), 5.8 * math.sin(a)) for a in np.linspace(math.radians(25), math.radians(155), 14)]
fan_hi = tk.slab('fan_hi', outline, 0.5, plane='XZ', at=0.0, bevel=0.15, segs=1)
tk.push(fan_hi, lambda V, N: 0.12 * np.sign(np.sin(np.arctan2(V[:, 2], V[:, 0]) * 26)) * (np.hypot(V[:, 0], V[:, 2]) > 1.2))  # the pleats
fan_lo = tk.slab('fan', outline[::2] + [outline[-1]], 0.5, plane='XZ', at=0.0, bevel=0, segs=0)
for o in (fan_hi, fan_lo):
    tk.rotate(o, -18, 'Y')
    tk.rotate(o, 12, 'X')
    tk.move(o, tuple(FAN0))
tk.set_region(fan_hi, 'fan')
F.part('fan', fan_lo, [fan_hi], bone='fan', kind='gloss')
FOOT_L = (3.8, -3.2, 13.6)

# the frog grown 15% about its standing foot (the rung moved up 1 mm)
T, M = fr.grow(F, M, FOOT_L, shift=(0, 0, 1.0))
FOOT_L, HIP_L, HIP_R, SH_L, SH_R = [T(p) for p in (FOOT_L, HIP_L, HIP_R, SH_L, SH_R)]
FAN0 = np.array(T(FAN0))


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, fr.LY, 0))
    R.bone('body', FOOT_L, parent='root')        # it rocks on its support foot
    R.bone('leg_l', tuple(HIP_L), parent='body')
    R.bone('leg_r', tuple(HIP_R), parent='body')
    R.bone('arm_l', tuple(SH_L), parent='body')
    R.bone('arm_r', tuple(SH_R), parent='body')
    R.bone('fan', tuple(FAN0), parent='arm_r')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'leg_r', 'arm_l', 'arm_r', 'fan'):
            k(b, 0)
        # it teeters: a rock to the right, the free leg sweeping out for balance, back left, and settles
        k('body', 8, rot=('Y', -4))
        k('leg_r', 8, rot=[('Z', 8), ('X', 8)])
        k('arm_l', 8, rot=('Y', -16))
        k('body', 18, rot=('Y', 4))
        k('leg_r', 18, rot=[('Z', -3), ('X', -4)])
        k('arm_l', 18, rot=('Y', 12))
        k('body', 27, rot=('Y', -3))
        k('body', 34)
        k('leg_r', 34)
        k('arm_l', 34)
        # the fan flutters (quick flicks) and the arm lifts it high: ta-da
        for i, f_ in enumerate(range(6, 34, 4)):
            k('fan', f_, rot=('Y', 14 if i % 2 else -14))
        k('fan', 36)
        k('arm_r', 30)
        k('arm_r', 40, rot=('X', -10))
        k('arm_r', 58, rot=('X', -10))
        for b in ('body', 'leg_r', 'arm_l', 'arm_r', 'fan'):
            k(b, 70)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    fr.paint_ladder(P, pt, sh)
    SK, HP = fr.paint_frog(P, pt, sh, skin='#6fae3c', belly='#e8e2a6', happi='#2c3c6a', spots='#4f8a2c', seed=3)
    fr.happi_marks(P, M, pt, sh)
    # the fan: red paper, a gold sun, black lacquer ribs at the pivot
    P.fill('fan', pt.ramp('#c8342c', 6, shift=0.06), tone=sh * 0.7, base=0.1)
    r = np.sqrt((P.X - FAN0[0]) ** 2 + (P.Z - FAN0[2]) ** 2)
    P.flat(P.region('fan') & (np.abs(r - 3.9) < 1.05) & (P.Z > FAN0[2] + 1.2) & (np.abs(P.X - FAN0[0] + 0.6) < 2.2), '#e9b83c')
    P.flat(P.region('fan') & (r < 1.3), '#221a18')
    # the face: a dot eye on each bump, one upturned marker stroke right across the head, a blush
    fr.frog_face(P, M, eyes='dot', mouth='upturn', seed=14, blush=True, mouth_w=19.0, weight=0.6, side=1)
    P.lines(['skin', 'belly'], ['happi', 'band'], step=1)
    P.lines(['pad'], ['skin', 'belly'], col='#1b1513', step=1)  # (marker outlines round the toe pads)
    P.clusters()
    return P.done()


fr.run(F, ARGS, make_rig, paint, cam=((48, -78, 42), (0, -3, 24)), skip=[('body', 'happi'), ('leg_l', 'body'), ('leg_r', 'body'), ('arm_l', 'body'), ('arm_r', 'body'), ('fan', 'arm_r'), ('leg_l', 'ladder')])
