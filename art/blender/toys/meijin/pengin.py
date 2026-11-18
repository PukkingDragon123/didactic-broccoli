"""たけうまペンギン Stilt Penguin: the takeuma champion, a penguin up on a pair of bamboo stilts (the bird with the
shortest legs on the lane on the tallest stilts) in a red wool hat with a pompom (series meijin, concepts_C.md), on a
patch of the lane's packed earth.

Gimmick: step, step, step: the stilts lift one after the other and he sways over them, then wobbles, windmills and
rights himself.

    tools/blender.sh art/blender/toys/meijin/pengin.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('meijin', 'pengin')

GZ = 2.4                       # the ground's top
FZ = 13.6                      # the footrests' top
PX = 6.8                       # the poles' x
TOPZ = 38.0
HC = (0, -0.6, 32.0)

# ------------------------------------------------------------------ the patch of packed earth
ground = tk.lathe('ground', [(0, 0), (13.6, 0), (13.8, 1.2), (12.8, GZ), (0, GZ)], n=24)


def sc_ground(h):
    def f(V, N):
        return 0.25 * np.sin(V[:, 0] * 0.9) * np.sin(V[:, 1] * 1.1) * (N[:, 2] > 0.5)
    tk.push(h, f)


ground_lo, ground_hi = cx.low(ground, 'ground', 80, lo=1, hi=2, sculpt=sc_ground, region='earth')

# ------------------------------------------------------------------ the stilts, each with its footrest, the foot on it and the flipper gripping it
STILTS = {}
for sx, nm in ((1, 'stilt_l'), (-1, 'stilt_r')):
    x = sx * PX
    pole = tk.cyl('pole', 1.2, GZ, TOPZ, n=8, at=(x, 0.0), axis='Z', bevel=0.3, segs=1)

    def sc_pole(h, x=x):
        def f(V, N):  # the bamboo's nodes
            return 0.3 * (np.abs(np.mod(V[:, 2] - 4.0, 8.0) - 4.0) > 3.6)
        tk.push(h, f)
    rest = tk.rbox('rest', (3.0, 4.2, 2.0), centre=(x - sx * 1.6, -0.6, FZ - 1.0), bevel=0.4, segs=1)
    rope = tk.lathe('rope', [(1.2, -1.0), (1.8, -1.0), (1.9, 1.0), (1.2, 1.0)], n=10, centre=(x, 0.0, FZ - 1.2))
    foot = tk.loft('foot', [{'c': (x - sx * 2.4, 1.4, FZ + 0.7), 'w': 3.4, 'h': 1.0, 'e': 2.3}, {'c': (x - sx * 2.6, -2.8, FZ + 0.7), 'w': 4.6, 'h': 1.0, 'e': 2.4}],
                   n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=0.9)
    flip = tk.loft('flipper', [{'c': (sx * 6.2, 0.4, 27.4), 'w': 2.0, 'h': 3.2, 'e': 2.2}, {'c': (sx * 7.6, -0.4, 31.8), 'w': 1.8, 'h': 2.8, 'e': 2.2},
                               {'c': (x, -0.6, 34.6), 'w': 1.6, 'h': 2.4, 'e': 2.2}], n=8, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
    STILTS[nm] = ([cx.low(pole, 'pole', 40, lo=0, hi=2, sculpt=sc_pole, region='bamboo'), cx.low(rest, 'rest', 16, lo=0, hi=1, region='bamboo'),
                   cx.low(rope, 'rope', 20, lo=0, hi=1, region='rope'), cx.low(foot, 'foot', 20, lo=1, hi=1, region='orange'),
                   cx.low(flip, 'flipper', 40, lo=1, hi=1, region='black')], (x, 0.0, GZ))

# ------------------------------------------------------------------ the penguin: one plump body and head, the beak, the wool hat and its pompom
body = tk.loft('body', [{'c': (0, 0.2, FZ + 1.2), 'w': 10.6, 'h': 5.4, 'e': 2.2},
                        {'c': (0, 0.0, FZ + 6.0), 'w': 14.6, 'h': 7.2, 'e': 2.3},
                        {'c': (0, 0.0, 24.0), 'w': 14.0, 'h': 7.0, 'e': 2.3},
                        {'c': (0, -0.2, 29.0), 'w': 13.0, 'h': 6.6, 'e': 2.3},
                        {'c': (0, -0.4, 34.0), 'w': 11.4, 'h': 6.0, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=2.4)
body_lo, body_hi = cx.low(body, 'body', 220, lo=1, hi=3, region='black')
beak = tk.loft('beak', [{'c': (0, -6.2, 30.6), 'w': 3.2, 'h': 1.6, 'e': 2.2}, {'c': (0, -8.0, 30.2), 'w': 2.0, 'h': 1.0, 'e': 2.2}], n=8, up=(0, 0, 1),
               cap0='round', cap1='point', capd=0.6)
hat = tk.lathe('hat', [(0, 0), (6.0, 0), (6.2, 1.6), (5.6, 3.8), (3.6, 5.6), (0, 6.2)], n=16, centre=(0, -0.2, 34.6))
tk.rotate(hat, -8, 'X', (0, -0.2, 34.6))
pom = tk.lathe('pom', [(0, -1.8), (1.7, -1.4), (2.1, 0.0), (1.7, 1.4), (0, 1.8)], n=10, centre=(0, 0.6, 41.6))


def sc_wool(h):
    def f(V, N):  # knit ribs
        a = np.arctan2(V[:, 1], V[:, 0])
        return -0.18 * (np.abs(np.sin(a * 12)) > 0.8)
    tk.push(h, f)


def sc_pom(h):
    def f(V, N):
        return 0.25 * np.sin(V[:, 0] * 4.1) * np.sin(V[:, 1] * 4.3 + V[:, 2] * 3.1)
    tk.push(h, f)


BODYP = [(body_lo, body_hi), cx.low(beak, 'beak', 16, lo=1, hi=1, region='orange'),
         cx.low(hat, 'hat', 60, lo=0, hi=2, sculpt=sc_wool, region=('hat', [('brim', lambda C, N: C[:, 2] < 36.4)])),
         cx.low(pom, 'pom', 24, lo=0, hi=2, sculpt=sc_pom, region='brim')]

# ------------------------------------------------------------------ parts
F.part('ground', ground_lo, [ground_hi], bone='root')
F.part('body', tk.join([b_[0] for b_ in BODYP], 'body'), [b_[1] for b_ in BODYP], bone='body')
for nm, (pp, base) in STILTS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, FZ), parent='root')
    for nm, (pp, base) in STILTS.items():
        R.bone(nm, base, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'stilt_l', 'stilt_r']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # step, step, step: a stilt lifts, he sways over the other
        f = 2
        for i, (up, sx) in enumerate((('stilt_l', 1), ('stilt_r', -1), ('stilt_l', 1))):
            k(up, f)
            k(up, f + 4, move=(0, -0.6, 2.6), rot=('X', -6))
            k(up, f + 8, ease='BOUNCE')
            k('body', f, rot=('Y', 0))
            k('body', f + 4, rot=('Y', sx * -7), move=(0, 0, 1.2))
            k('body', f + 8, rot=('Y', 0), move=(0, 0, 0))
            f += 9
        # the wobble: he tips, windmills on his stilts, rights himself
        k('body', 30)
        k('body', 34, rot=('X', 9))
        k('body', 38, rot=('X', -8))
        k('body', 42, rot=('X', 5))
        k('body', 46, rot=('X', -2))
        k('body', 50)
        for nm, sx in (('stilt_l', 1), ('stilt_r', -1)):
            k(nm, 30)
            k(nm, 34, rot=('X', 4))
            k(nm, 38, rot=('X', -4))
            k(nm, 44)
        for b in allb:
            k(b, 56)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    P.fill('earth', pt.ramp('#a88a64', 6, shift=0.06), tone=sh, base=0.08)
    P.tint(P.region('earth') & (np.sin(X * 1.9) * np.sin(Yc * 2.1) > 0.7), pt.ramp('#8a6c4c', 6, shift=0.06), sh)
    P.fill('black', pt.ramp('#2e3038', 7, shift=0.06), tone=free, base=0.25)
    # the white front and the white ring round the eyes of an Adélie
    bd = P.region('black') & (P.part == PI['body'])
    wf = bd & (((on[:, :, 1] < -0.35) & (Z < 29.5)) | ((on[:, :, 1] < -0.7) & (Z < 31.6)))
    P.fill(wf, pt.ramp('#f2eee6', 7, shift=0.05), tone=free, base=0.08)
    P.fill('orange', pt.ramp('#e89a3a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('bamboo', pt.ramp('#c8b45a', 7, shift=0.06), tone=free, base=0.08)
    P.tint(P.region('bamboo') & (np.abs(np.mod(Z - 4.0, 8.0) - 4.0) > 3.4), pt.ramp('#8a7a3a', 6, shift=0.06), free)
    P.fill('rope', pt.ramp('#d8c49a', 5, shift=0.05), tone=free, base=0.1)
    P.fill('hat', pt.ramp('#c8303a', 7, shift=0.06), tone=free, base=0.08)
    P.fill('brim', pt.ramp('#f2eee6', 6, shift=0.05), tone=free, base=0.1)
    # the face, drawn on: wide wobbly eyes (worried, high up there), a little 'o' of concentration, blush
    fc = face.Face(P, c=(0, -6.6, 31.6), axis=(0, -1, 0.1), where=bd, seed=201)
    fc.eyes('dot', spread=6.8, size=0.6, dy=1.2)
    fc.brows('worried', spread=7.2, dy=3.0, w=1.8, weight=0.32)
    fc.blush(9.0, -0.6, rx=1.3, ry=0.7)
    P.lines(['black'], ['orange', 'brim', 'hat'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 57), skip=[('stilt_l', 'body'), ('stilt_r', 'body')]),
       cams=[((60, -76, 54), (0, -1, 20)), ((-58, 66, 48), (0, 0, 20))], fold=(0, 6, 15, 34))
