"""日吉ザル Hie Monkey: series otsukai, The Gods' Messengers (concepts_B.md).

The mountain king's monkey (masaru) as a black-lacquer idol: squatting on its vermilion step in a tall court
eboshi cap, its red-lacquer face round and wise, a gohei wand with two white paper streamers held up in one hand,
the other hand on its knee, gold-leaf bands round its cap, wrists and the wand.
Gimmick: it waves the gohei left, right, left (a purification), then bows.

    tools/blender.sh art/blender/toys/otsukai/saru.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import ak  # noqa: E402

F = bk.start('otsukai', 'saru')
base_lo, base_hi, PZ = ak.plinth('plinth', [(24.0, 26.0, 3.2), (20.0, 22.0, 2.6)])

# ------------------------------------------------------------------ a squat round body, knees up, feet on the step
BODY = [(PZ + 0.0, 1.6, 15.0, 7.4, 8.2, 2.4), (PZ + 3.0, 1.2, 17.0, 8.4, 8.8, 2.4), (PZ + 7.5, 0.6, 16.0, 8.0, 7.6, 2.3),
        (PZ + 12.0, 0.2, 13.2, 6.8, 6.4, 2.2), (PZ + 15.5, 0.0, 10.0, 5.4, 5.0, 2.1)]


def sc_body(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 5.4, -6.0, PZ + 6.5), 4.2, 1.3, sharp=1.4)   # the knees, drawn up
        # fur in carved locks down the back and shoulders
        back = tk.smoothstep(0.1, 0.6, N[:, 1])
        d += 0.3 * back * np.cos(V[:, 0] * 1.6 + V[:, 2] * 0.5) ** 4
        return d
    tk.push(h, f)


body_lo, body_hi = ak.stack('body', BODY, n=16, tris=300, sculpt=sc_body)
feet_lo, feet_hi = [], []
for sx in (1, -1):
    c = (sx * 4.6, -6.4, PZ)
    for nm_, n_, lst in (('foot', 8, feet_lo), ('foot_hi', 16, feet_hi)):
        o = tk.lathe(nm_, [(0, 0), (2.3, 0.0), (2.5, 0.9), (1.8, 1.9), (0, 2.2)], n=n_, centre=c)
        tk.scale(o, (1.0, 1.5, 1.0), pivot=c)
        lst.append(o)
    tk.subsurf(feet_hi[-1], 1)

# ------------------------------------------------------------------ the head: round, a flat heart-shaped face, side ears
HC = (0.0, -1.0, PZ + 21.6)
hp = [(0, -6.4), (4.4, -5.4), (6.6, -2.2), (6.9, 0.8), (5.8, 4.0), (3.2, 6.0), (0, 6.6)]
head_hi = tk.lathe('head_hi', hp, n=24, centre=HC)
tk.subsurf(head_hi, 1)
head_lo = tk.lathe('head', hp, n=12, centre=HC)


def face_disc(V, N):
    # the face: a raised heart-shaped mask on the front, a muzzle bulge, a brow ridge over it
    u, v = V[:, 0], V[:, 2] - HC[2]
    front = tk.smoothstep(-0.3, -0.8, N[:, 1])
    heart = ((u / 4.8) ** 2 + ((v + 0.6) / 4.2) ** 2 < 1) | (((np.abs(u) - 2.2) / 2.6) ** 2 + ((v - 1.6) / 2.4) ** 2 < 1)
    d = 0.5 * heart * front + tk.bump(V, (0, HC[1] - 6.6, HC[2] - 2.2), 2.6, 0.9) * front
    d += tk.bump(V, (0, HC[1] - 6.4, HC[2] + 1.6), 3.4, 0.35) * front
    return d


tk.push(head_hi, face_disc)
tk.regions(head_hi, 'body', [('mask', lambda C, N: (N[:, 1] < -0.25) & ((C[:, 0] / 5.3) ** 2 + ((C[:, 2] - HC[2] + 0.5) / 4.8) ** 2 < 1))])
EARS = []
for sx in (1, -1):
    # a macaque's ears: small flat ovals laid against the sides of the head at eye level, a little behind the face,
    # their fronts turned forward and cupped
    c = (sx * 7.1, HC[1] + 1.6, HC[2] + 0.2)
    for nm_, n_ in (('ear', 8), ('ear_hi', 16)):
        o = tk.lathe(nm_, [(0, -0.35), (1.3, -0.3), (1.6, 0.0), (1.35, 0.3), (0, 0.4)], n=n_, axis='X', centre=c)
        tk.scale(o, (1.0, 0.85, 1.25), pivot=c)
        tk.rotate(o, sx * -28, 'Z', pivot=c)
        EARS.append(o)
for o in EARS[1::2]:
    tk.subsurf(o, 1)
    tk.push(o, lambda V, N: -0.28 * np.exp(-((V[:, 1] - HC[1] - 1.6) ** 2 + (V[:, 2] - HC[2] - 0.2) ** 2) / 0.9) * (np.abs(V[:, 0]) > 7.0))  # the cup
    tk.set_region(o, 'mask')
# the court eboshi: a tall lacquered cap leaning back, a gold cord round its base
cap_r = [(HC[2] + 4.6, -1.2, 9.6, 4.4, 4.6, 2.6), (HC[2] + 7.2, -0.4, 8.4, 3.6, 3.8, 2.8), (HC[2] + 10.4, 0.8, 6.4, 2.6, 2.8, 3.0),
         (HC[2] + 12.8, 2.0, 4.6, 1.8, 2.0, 3.0)]
cap_lo, cap_hi = ak.stack('cap', cap_r, n=12, tris=90, region='cap', cap0='flat', cap1='round')
tk.push(cap_hi[0], lambda V, N: -0.3 * np.exp(-((V[:, 0]) / 0.35) ** 2) * (V[:, 2] > HC[2] + 7))  # the cap's fold

# ------------------------------------------------------------------ arms: the right one up with the gohei, the left on its knee
ARM_R = (5.6, -0.6, PZ + 13.2)
arm_r = tt.arm('arm_r', [ARM_R, (9.0, -2.0, PZ + 13.0), (11.4, -3.0, PZ + 15.8)], r=1.8, hand=2.0, region='body', hand_region='mask')
arm_l = tt.arm('arm_l', [(-5.6, -0.6, PZ + 13.2), (-7.6, -3.6, PZ + 11.0), (-6.4, -6.0, PZ + 9.6)], r=1.8, hand=2.0, region='body', hand_region='mask')
hc = np.array(arm_r[2])
G_TOP = hc + np.array((2.2, -0.4, 11.0))
gw_pts = [tuple(hc + np.array((-0.15, 0.15, -2.6))), tuple(hc), tuple(G_TOP)]
gw_lo = tk.tube('gohei', gw_pts, 0.55, n=5, cap0='round', cap1='round')
gw_hi = tk.tube('gohei_hi', gw_pts, 0.55, n=10, cap0='round', cap1='round')
tk.set_region(gw_hi, 'wand')
ZZ = [(0.0, 0.0), (1.8, 0.0), (1.8, -2.0), (0.4, -2.0), (0.4, -4.0), (2.0, -4.0), (2.0, -6.0), (0.9, -6.0), (0.9, -7.6),
      (-0.4, -7.6), (-0.4, -5.6), (0.8, -5.6), (0.8, -4.4), (-0.8, -4.4), (-0.8, -2.4), (0.4, -2.4), (0.4, -0.6), (0.0, -0.6)]
sh_lo, sh_hi = [], []
for sx in (1, -1):
    for nm_, bev, lst in (('gshide', 0.0, sh_lo), ('gshide_hi', 0.1, sh_hi)):
        o = tk.slab(nm_, [(sx * u, v) for u, v in ZZ][::sx], 0.35, plane='XZ', bevel=bev, segs=1 if bev else 0)
        tk.move(o, tuple(G_TOP + np.array((sx * 0.5, 0.0, -0.6))))
        lst.append(o)
for o in sh_hi:
    tk.set_region(o, 'shide')
tail_lo, tail_hi = ak.spine('tail', [(0, 8.0, PZ + 3.0), (2.4, 10.2, PZ + 2.0), (4.8, 10.0, PZ + 1.4)], [3.0, 2.6, 2.0], [1.4, 1.2, 1.0],
                            n=8, up=(0, 0, 1), tris=36, cap0='round', cap1='round')

F.part('plinth', base_lo, base_hi)
F.part('body', tk.join([body_lo, tail_lo] + feet_lo, 'body'), body_hi + tail_hi + feet_hi, kind='gloss')
F.part('head', tk.join([head_lo, cap_lo] + EARS[0::2], 'head'), [head_hi] + cap_hi + EARS[1::2], bone='head', kind='gloss')
F.part('arm_r', tk.join([arm_r[0], gw_lo] + sh_lo, 'arm_r'), arm_r[1] + [gw_hi] + sh_hi, bone='arm_r', sharp=70, kind='gloss')
F.part('arm_l', arm_l[0], arm_l[1], bone='arm_l', kind='gloss')
NECK = (0.0, -0.4, PZ + 15.6)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', NECK, parent='root')
    R.bone('arm_r', ARM_R, parent='root')
    R.bone('arm_l', (-5.6, -0.6, PZ + 13.2), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'arm_r', 'arm_l']
        for b in bones:
            k(b, 0)
        # the purification: the gohei swept left, right, left (the head follows it), then a bow
        for f, a in ((6, 6), (14, -24), (22, 10), (30, -24), (38, 8), (44, 0)):
            k('arm_r', f, rot=('Y', a))
            k('head', f, rot=('Z', a * 0.3))
        k('arm_l', 40)
        k('arm_l', 46, rot=('X', -6))
        k('head', 50, rot=('X', 18))
        k('arm_r', 50, rot=('X', 10))
        k('head', 58, rot=('X', 18))
        k('head', 64, ease='BACK')
        k('arm_r', 64)
        k('arm_l', 64)
        for b in bones:
            k(b, 70)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.0)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    VERM = pt.ramp('#cc4a32', 7, shift=0.06)
    ak.lacquer(P, ('body', 'cap'))
    P.fill('mask', pt.ramp('#c8463a', 7, shift=0.06), tone=sh * 0.4, base=0.1)  # the red-lacquer face, ears and hands
    # gold leaf: bands round the cap and its fold, the wrists, the wand
    ak.gold_bands(P, P.region('cap'), Z - (HC[2] + 5.4), 1.3)
    ak.gold_bands(P, P.region('cap'), Z - (HC[2] + 11.6), 0.7)
    for hcx in (arm_r[2], arm_l[2]):
        d_ = np.linalg.norm(P.pos - np.array(hcx), axis=2)
        P.fill(P.region('body') & (np.abs(d_ - 2.7) < 0.55), GOLD, tone=sh, base=0.1)
    P.fill('wand', GOLD, tone=sh, base=0.1)
    P.fill('shide', pt.ramp('#f3efe6', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('plinth', VERM, tone=sh, base=0.0)
    # the face (a macaque's): close-set dots under a brow, two nostrils on the muzzle, a flat little mouth
    import face
    fc = face.Face(P, c=(0.0, HC[1] - 6.6, HC[2] + 0.6), axis=(0, -1, 0.05), where=P.region('mask'), seed=101)
    fc.eyes('dot', spread=4.4, size=0.62, dy=0.7)
    fc.brows('flat', spread=4.8, dy=2.4, w=2.0, weight=0.42)
    fc.nose('nostrils', dy=-1.4, size=0.7)
    fc.mouth('line', w=2.6, dy=-3.0)
    P.lines(['mask'], step=2)
    P.lines(['shide', 'wand'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'plinth'), ('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body')],
       cam=((70, -92, 56), (0, 0, 18)), fold=(0, 14, 30, 54), frames=70)
