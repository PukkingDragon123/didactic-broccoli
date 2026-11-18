"""のぞきキリン Peeping Giraffe: a young giraffe at the partition wall between the men's bath and the women's (series
sento, concepts_D.md): blue tiles on his side, pink on the other, a yellow basin left up on the wall's top rail. Only
his ossicones show over the top.

Gimmick: the neck stretches up and he peeks over the wall; a yellow basin comes flying back over it, bonk, and the neck
shoots back down with the basin upside down on his head.

    tools/blender.sh art/blender/toys/sento/kirin.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402


import _yu as yu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402
from mathutils import Matrix  # noqa: E402

tk.reset()
F = Fig('sento', 'kirin')
H = yu.H
BZ = H + 14.0                 # the body's centre height
WY = 9.0                      # the partition wall's centre plane
WT = H + 29.0                 # the wall's top (under its rail)
NB = np.array((4.8, -1.0, BZ + 2.0))     # the neck's root
NT = np.array((6.4, -0.4, BZ + 11.2))    # its top (the head's pivot)
HYAW = -58.0                  # (the head points +x, turned this far towards the front)                  # the head turned to look at you
low = yu.low

# ------------------------------------------------------------------ the floor, the partition wall with its top rail, the basin on it
base_lo, base_hi = yu.floor(F)
BS = (6.0, WY, WT + 1.2)      # the basin left up on the rail
PB = [yu.box('wall', (30.0, 2.6, WT - H), (0, WY, (H + WT) / 2), 'walltile', bevel=0.4),
      yu.box('rail', (31.0, 3.6, 1.2), (0, WY, WT + 0.6), 'rail', bevel=0.35)]
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)
basin = yu.basin('basin', BS, r=3.1, h=2.2)

# ------------------------------------------------------------------ the giraffe: body, legs, tail (facing +x, the neck at the +x end)
body = tk.loft('body', [{'c': (-6.4, -1.0, BZ - 0.2), 'w': 6.6, 'h': 4.0, 'e': 2.2}, {'c': (-2.6, -1.0, BZ), 'w': 8.8, 'h': 5.2, 'e': 2.3},
                        {'c': (2.0, -1.0, BZ + 0.6), 'w': 9.4, 'h': 5.8, 'e': 2.3}, {'c': (5.6, -1.0, BZ + 1.2), 'w': 7.8, 'h': 5.2, 'e': 2.2}],
               n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
BODY = [low(body, 'body', 150, region='coat')]
for lx in (4.0, -4.6):
    for ly in (-3.2, 1.2):
        lg = tk.tube('leg', [(lx, ly, BZ - 1.6), (lx + 0.2, ly - 0.2, BZ - 7.6), (lx, ly - 0.3, H + 1.6), (lx, ly - 0.4, H + 0.1)],
                     [2.1, 1.45, 1.3, 1.4], n=8, cap0='round', cap1='flat')
        BODY.append(low(lg, 'leg', 40, region=('coat', [('hoof', lambda C, N: C[:, 2] < H + 1.5)])))
tail = tk.tube('tail', [(-6.8, -1.0, BZ + 0.6), (-7.8, -1.0, BZ - 2.4), (-8.0, -1.0, BZ - 6.0)], [0.55, 0.4, 0.35], n=6, cap1=None)
tuft = tk.tube('tuft', [(-8.0, -1.0, BZ - 5.6), (-8.1, -1.0, BZ - 7.0), (-8.0, -1.0, BZ - 8.6)], [0.6, 0.85, 0.15], n=6, cap1='point')
BODY += [low(tail, 'tail', 16, lo=1, hi=1, region='coat'), low(tuft, 'tuft', 16, lo=1, hi=1, region='mane')]

# ------------------------------------------------------------------ the neck with its mane; the head (turned to you)
neck = tk.tube('neck', [tuple(NB), tuple(NB + (0.9, 0.2, 4.6)), tuple(NT + (0, 0, -0.6))], [3.4, 2.5, 2.1], n=10, cap0='round', cap1='round')
mane = tk.loft('mane', [{'c': tuple(NB + (-1.6, 0.0, 1.0)), 'w': 0.8, 'h': 0.6}, {'c': tuple(NB + (-0.9, 0.2, 5.0)), 'w': 0.8, 'h': 0.7},
                        {'c': tuple(NT + (-1.2, 0.0, -0.4)), 'w': 0.7, 'h': 0.5}], n=6, up=(-1, 0, 0), cap0='point', cap1='point')
NECK = [low(neck, 'neck', 70, region='coat'), low(mane, 'mane', 20, lo=1, hi=1, region='mane')]
HC = NT + np.array((1.4, 0.0, 1.8))
head = tk.loft('head', [{'c': tuple(HC + (-1.6, 0, 0.7)), 'w': 4.6, 'h': 2.5, 'e': 2.2}, {'c': tuple(HC + (0.3, 0, 0.3)), 'w': 5.0, 'h': 2.9, 'e': 2.3},
                        {'c': tuple(HC + (2.8, 0, -0.7)), 'w': 4.0, 'h': 2.3, 'e': 2.3}, {'c': tuple(HC + (4.6, 0, -1.4)), 'w': 3.5, 'h': 1.9, 'e': 2.2}],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.9)
HEAD = [low(head, 'head', 110, region=('coat', [('muzzle', lambda C, N: C[:, 0] > HC[0] + 3.2)]))]
for sy in (1, -1):
    oc = tk.tube('ossicone', [tuple(HC + (-0.9, sy * 0.8, 1.6)), tuple(HC + (-1.1, sy * 1.0, 3.4))], [0.5, 0.42], n=6, cap1=None)
    kn = tk.lathe('knob', [(0, -0.5), (0.6, -0.3), (0.65, 0.15), (0.4, 0.5), (0, 0.6)], n=8, centre=tuple(HC + (-1.1, sy * 1.0, 3.7)))
    ear = tk.loft('ear', [{'c': tuple(HC + (-1.4, sy * 1.6, 1.0)), 'w': 0.9, 'h': 0.35}, {'c': tuple(HC + (-1.6, sy * 3.0, 1.5)), 'w': 1.2, 'h': 0.4},
                          {'c': tuple(HC + (-1.7, sy * 3.8, 1.6)), 'w': 0.5, 'h': 0.2}], n=6, up=(0, 0, 1), cap0='round', cap1='point')
    HEAD += [low(oc, 'ossicone', 14, lo=1, hi=1, region='coat'), low(kn, 'knob', 16, lo=1, hi=1, region='mane'),
             low(ear, 'ear', 16, lo=1, hi=1, region='coat')]
M = Matrix.Translation(tuple(NT)) @ Matrix.Rotation(math.radians(HYAW), 4, 'Z') @ Matrix.Translation(tuple(-NT))
for pr in HEAD:
    for o in pr:
        tk.transform(o, M)
FD = np.array((math.cos(math.radians(HYAW)), math.sin(math.radians(HYAW)), 0.0))   # the way his face looks

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('basin', basin[0], [basin[1]], bone='basin')
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('neck', tk.join([b[0] for b in NECK], 'neck'), [b[1] for b in NECK], bone='neck')
F.part('head', tk.join([b[0] for b in HEAD], 'head'), [b[1] for b in HEAD], bone='head')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, -1.0, BZ), parent='root')
    R.bone('neck', tuple(NB), parent='body')
    R.bone('head', tuple(NT), parent='neck')
    R.bone('basin', BS, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'neck', 'head', 'basin']
    k = R.key
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-16 the neck stretches up; 16-28 he peeks over (the head turns to the wall); 28-34 the basin comes flying;
        # 34-40 bonk: the neck shoots down, the basin rides down on his head; 66-84 the basin back up to its rail
        k('body', 4)
        k('body', 12, move=(0, 0, 0.8))
        k('body', 34, move=(0, 0, 0.8))
        k('body', 40, ease='BOUNCE')
        k('neck', 4)
        k('neck', 16, scale=(1.0, 1.65, 1.0), rot=('X', -8), ease='BACK')
        k('neck', 34, scale=(1.0, 1.65, 1.0), rot=('X', -8))
        k('neck', 40, ease='BOUNCE')
        k('head', 10)
        k('head', 20, rot=[('Z', 138), ('X', -8)])
        k('head', 34, rot=[('Z', 138), ('X', -8)])
        k('head', 38, rot=('X', 12), ease='ELASTIC')
        k('head', 56, rot=('X', 6))
        k('head', 64)
        k('basin', 26)
        k('basin', 30, move=(0.2, -2.0, 10.0), rot=('X', 110))
        k('basin', 34, move=(0.4, -5.0, 6.8), rot=('X', 180))
        k('basin', 40, move=(1.1, -10.6, 1.3), rot=('X', 180), ease='BOUNCE')
        k('basin', 60, move=(1.1, -10.6, 1.3), rot=('X', 180))
        k('basin', 70, move=(0.5, -4.0, 9.0), rot=('X', 90))
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    yu.paint_floor(P, pt, sh)
    # the partition: pale blue tiles on the men's side, pink on the women's, a wooden top rail
    wt = P.region('walltile')
    back = wt & (P.on[:, :, 1] > 0.6)
    P.fill(wt, pt.ramp('#b6d4dc', 6, shift=0.05), tone=sh, base=0.15, brush='gloss')
    P.fill(back, pt.ramp('#efbcc0', 6, shift=0.05), tone=sh, base=0.15, brush='gloss')
    T = 3.0
    P.fill(wt & ((np.abs(np.mod(X, T) - T / 2) > T / 2 - 0.2) | (np.abs(np.mod(Z - H, T) - T / 2) > T / 2 - 0.2)), pt.ramp('#eceee8', 4), tone=sh, base=0.1, brush=False)
    yu.paint_wood(P, pt, sh, 'rail', '#b88a52')
    yu.paint_basin(P, pt, sh)
    # the giraffe: cream with chestnut patches (each patch a hand-dabbed cell), dark mane, knobs and hooves
    co = P.region('coat')
    P.fill('coat', pt.ramp('#ecd2a0', 6, shift=0.05), tone=sh, base=0.15)
    who, d = P.dabs(co & (P.part != PI['head']) | (co & (P.part == PI['head']) & (Z > NT[2] + 2.2)), size=1.5, spacing=2.6, seed=11)
    P.fill(co & (who >= 0) & (d < 0.78), pt.ramp('#b0602e', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('muzzle', pt.ramp('#f2dcb6', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('mane', pt.ramp('#5a3420', 5, shift=0.05), tone=sh, base=0.05, brush='fur')
    P.fill('hoof', pt.ramp('#3a2a22', 4), tone=sh, base=0.05)
    # the face, turned to you: small wide dots high on the head, a little smile at the muzzle, nostril dashes
    hd = (co | P.region('muzzle')) & (P.part == PI['head'])
    HCr = np.array(NT) + np.array((1.4, 0.0, 1.8))
    c = NT + (np.array(M.to_3x3()) @ (HCr - NT)) + FD * 2.0
    fc = face.Face(P, c=tuple(c + (0, 0, 0.6)), axis=tuple(FD + (0, 0, 0.1)), where=hd, seed=541)
    fc.eyes('dot', spread=4.2, size=0.5, dy=0.5, uneven=0.25)
    fc.blush(spread=4.8, dy=-0.8, rx=0.8, ry=0.45)
    fm = face.Face(P, c=tuple(NT + (np.array(M.to_3x3()) @ (HCr + (4.8, 0, -1.4) - NT)) + FD * 0.8), axis=tuple(FD), where=hd, seed=542)
    fm.mouth('upturn', w=2.2, dy=-0.6, weight=0.34)
    fm.dot(-0.6, 0.6, 0.2)
    fm.dot(0.6, 0.6, 0.2)
    P.lines(['mane', 'hoof'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('neck', 'body'), ('head', 'neck'), ('basin', 'head'), ('basin', 'base')]),
    cams=[((40, -66, 46), (0, 0, 18)), ((-46, 56, 44), (0, 2, 18))], fold=(0, 22, 34, 48))
