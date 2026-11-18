"""かぜモモンガ Wind Flying-Squirrel: the wind courier (series otenki, concepts_D.md). A Japanese flying squirrel with
huge dark eyes on a curly wisp of a cloud, the wind itself packed in a green furoshiki bundle on the rack behind.

Gimmick: it undoes the bundle, and its gliding membranes billow out wide while the bundle sags empty. Pull it back
and let go: the cloud scoots off (run).

    tools/blender.sh art/blender/toys/otenki/momonga.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kumo as km  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('otenki', 'momonga')
C = km.cloud(F, L=25.0, W=16.0, Hc=7.0, seed=5, lumps=0.8, tail=0.9, region='cloud')
ST = C['top'] - 0.8
HC = np.array((0.0, -1.0, ST + 14.2))
BUN = np.array((0.0, C['rack'][1] + 0.4, C['rack'][2] + 3.0))     # the bundle
low = km.low

# ------------------------------------------------------------------ the squirrel: a pear of a body, legs, the flat fluffy tail
body = tk.loft('body', [{'c': (0, 0.6, ST + 0.6), 'w': 8.4, 'h': 3.6, 'e': 2.2}, {'c': (0, 0.4, ST + 4.0), 'w': 9.2, 'h': 3.9, 'e': 2.2},
                        {'c': (0, 0.0, ST + 8.0), 'w': 7.6, 'h': 3.3, 'e': 2.2}, {'c': (0, -0.4, ST + 10.8), 'w': 5.4, 'h': 2.6, 'e': 2.2}],
               n=14, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
RIDER = [low(body, 'body', 130, region=('fur', [('cream', lambda C_, N: N[:, 1] < -0.55)]))]
for sx in (1, -1):
    lg = tk.tube('leg', [(sx * 3.0, -1.0, ST + 1.6), (sx * 4.2, -4.4, ST + 0.8), (sx * 4.4, -6.2, ST - 0.4)], [1.9, 1.5, 1.2], n=8)
    RIDER.append(low(lg, 'leg', 36, region='fur'))
tail = tk.loft('tail', [{'c': (1.6, 3.8, ST + 1.0), 'w': 3.0, 'h': 1.2}, {'c': (5.0, 5.0, ST + 2.6), 'w': 5.0, 'h': 1.3}, {'c': (7.0, 5.0, ST + 6.6), 'w': 5.6, 'h': 1.4},
                        {'c': (6.8, 4.4, ST + 10.4), 'w': 4.4, 'h': 1.2}, {'c': (5.6, 3.8, ST + 12.2), 'w': 2.0, 'h': 0.8}], n=10, up=(-1, 0, 0),
               cap0='round', cap1='round', capd=0.8)
RIDER.append(low(tail, 'tail', 70, sculpt=lambda h: tk.push(h, lambda V, N: 0.25 * np.sin(V[:, 2] * 2.2) * np.sin(V[:, 0] * 2.0)), region='fur'))
# ------------------------------------------------------------------ the head: round, small round ears, pale cheeks
head = tk.lathe('head', [(0, -4.0), (3.2, -3.4), (4.6, -0.8), (4.5, 1.2), (3.2, 3.2), (0, 3.9)], n=14, centre=tuple(HC))
tk.scale(head, (1.06, 0.94, 1.0), pivot=tuple(HC))
HEAD = [low(head, 'head', 120, region=('fur', [('cream', lambda C_, N: (N[:, 1] < -0.5) & (C_[:, 2] < HC[2] - 0.4))]))]
for sx in (1, -1):
    ec = HC + (sx * 2.6, 0.8, 3.7)
    ear = tk.lathe('ear', [(0, -0.4), (1.1, -0.3), (1.15, 0.2), (0, 0.4)], n=10, axis='Y', centre=tuple(ec))
    tk.rotate(ear, -sx * 24, 'Y', pivot=tuple(ec))
    HEAD.append(low(ear, 'ear', 16, lo=1, hi=1, region='fur'))
# ------------------------------------------------------------------ arms on the grips, each with its gliding membrane down to the ankle
ARMS = {}
for nm, sx in (('arm_l', 1), ('arm_r', -1)):
    sh_ = np.array((sx * 3.6, -0.4, ST + 9.0))
    hand = np.array((sx * 4.8, -C['L'] * 0.36 + 0.2, C['top'] + 3.6))
    a = tk.tube(nm, [tuple(sh_), tuple((sh_ + hand) / 2 + (sx * 1.2, 0, -0.6)), tuple(hand)], [1.4, 1.2, 1.1], n=8, cap1='round')
    mem = tk.slab('mem', [(sh_[1] + 0.6, sh_[2] - 1.0), (hand[1] + 1.2, hand[2] - 0.6), (-5.2, ST + 0.6), (0.6, ST + 2.2)], 0.6, plane='YZ', at=0.0, bevel=0.2, segs=1)
    tk.move(mem, (sx * 4.9, 0, 0))
    tk.rotate(mem, sx * 6, 'Y', pivot=(sx * 4.9, 0, ST + 5))
    ARMS[nm] = ([low(a, nm, 36, region='fur'), low(mem, 'mem', 40, lo=1, hi=1, region='mem')], tuple(sh_))
# ------------------------------------------------------------------ the furoshiki bundle of wind on the rack, knotted on top
bun = tk.rbox('bundle', (7.4, 6.4, 6.0), centre=tuple(BUN), bevel=2.4, segs=3)
knot = [tk.loft('knot', [{'c': tuple(BUN + (sx * 0.6, 0, 2.8)), 'w': 1.6, 'h': 0.7}, {'c': tuple(BUN + (sx * 2.0, -0.2, 4.4)), 'w': 1.6, 'h': 0.5},
                         {'c': tuple(BUN + (sx * 2.6, -0.4, 4.8)), 'w': 0.6, 'h': 0.3}], n=6, up=(0, -1, 0), cap1='point') for sx in (1, -1)]
BUNDLE = [low(bun, 'bundle', 100, lo=1, hi=2, sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * np.sin(V[:, 0] * 1.4 + V[:, 2]) * np.sin(V[:, 1] * 1.3)), region='cloth')]
BUNDLE += [low(kn, 'knot', 16, lo=1, hi=1, region='cloth') for kn in knot]

# ------------------------------------------------------------------ parts
km.parts(F, C)
F.part('rider', tk.join([r[0] for r in RIDER], 'rider'), [r[1] for r in RIDER], bone='rider')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('bundle', tk.join([b[0] for b in BUNDLE], 'bundle'), [b[1] for b in BUNDLE], bone='bundle')


# ------------------------------------------------------------------ rig: the press clip and the pull-back run
def make_rig():
    from rig import Rig
    R = Rig()
    km.bones(R, C)
    R.bone('rider', (0, 0.4, ST), parent='cloud')
    R.bone('head', (0, -0.4, ST + 10.8), parent='rider')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='rider')
    R.bone('bundle', (BUN[0], BUN[1], C['rack'][2]), parent='cloud')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'cloud', 'wf', 'wb', 'rider', 'head', 'arm_l', 'arm_r', 'bundle']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-14 it reaches back and the knot comes undone; 14-22 whoosh: the bundle puffs, then sags empty, and the
        # membranes billow out wide (it leans back, cheeks full); 22-52 riding the gust; 60-76 back
        k('head', 4)
        k('head', 12, rot=('Z', 40))
        k('head', 20, rot=('X', -10), scale=(1.08, 1.0, 1.0))
        k('head', 50, rot=('X', -10), scale=(1.08, 1.0, 1.0))
        k('head', 66)
        k('bundle', 10)
        k('bundle', 16, scale=(1.14, 1.12, 1.14), ease='BACK')
        k('bundle', 24, scale=(1.06, 0.62, 1.04))
        k('bundle', 60, scale=(1.06, 0.62, 1.04))
        k('bundle', 72)
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 12)
            k(nm, 20, rot=[('X', -24), ('Z', sx * 80)], ease='BACK')
            for i, f in enumerate(range(26, 54, 6)):
                k(nm, f, rot=[('X', -24 + (6 if i % 2 else 0)), ('Z', sx * (74 if i % 2 else 84))])
            k(nm, 56, rot=[('X', -24), ('Z', sx * 80)])
            k(nm, 70)
        k('rider', 14)
        k('rider', 22, rot=('X', 4))
        k('rider', 52, rot=('X', 4))
        k('rider', 66)
        k('cloud', 18)
        k('cloud', 24, move=(0, 0, 1.0), rot=('X', -4))
        k('cloud', 50, move=(0, 0, 0.6), rot=('X', -2))
        k('cloud', 62)
        for b in allb:
            k(b, 80)
    km.run(R, C, extra=lambda k_, f: (k_('head', f), k_('arm_l', f), k_('arm_r', f), k_('bundle', f, scale=1.0 if f % 16 == 0 else (1.0, 1.0, 1.04))))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    km.paint_cloud(P, pt, sh, C, col='#f2f4f4', belly='#b4c2d0')
    km.paint_kit(P, pt, sh, C, plate_ink='#3a8a5a')
    P.fill('fur', pt.ramp('#9c8a72', 7, shift=0.06), tone=sh, base=0.08, brush='fur')
    P.fill('cream', pt.ramp('#f2ece0', 6, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill('mem', pt.ramp('#8a7a64', 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'fur', 'flow': 'down'})
    P.fill(P.region('mem') & (P.cav < 0.45), pt.ramp('#efe6d6', 5), tone=sh, base=0.15)      # the pale edge of the membrane
    # the green furoshiki with white arabesque vines
    P.fill('cloth', pt.ramp('#2f8a5a', 6, shift=0.07), tone=sh, base=0.05, brush='cloth')
    cl = P.region('cloth')
    u = X + 0.6 * Y
    vine = np.abs(np.mod(Z - BUN[2] - 0.9 * np.sin(u * 1.5), 2.6) - 1.3) < 0.2
    curl = np.abs(np.hypot(np.mod(u, 2.6) - 1.3, np.mod(Z - 0.6, 2.6) - 1.3) - 0.7) < 0.17
    P.fill(cl & (vine | curl), pt.ramp('#eef0e6', 4), tone=sh, base=0.2, brush=False)
    # the face: big dark eyes set wide (a momonga's), a tiny pink nose, a little Y mouth, puffed blush
    hd = (P.region('fur') | P.region('cream')) & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -4.4, 0.6)), axis=(0, -1, 0.1), where=hd, seed=621)
    fc.eyes('big', spread=5.0, size=0.95, dy=0.6, uneven=0.15)
    fc.blush(spread=6.0, dy=-1.0, rx=1.2, ry=0.6)
    fn = face.Face(P, c=tuple(HC + (0, -4.6, -0.8)), axis=(0, -1, 0.05), where=hd, seed=622)
    fn.nose('tri', 0.0, 0.4, size=0.6, col='#d07a7a')
    fn.snout_mouth('Y', 0.0, 0.0, w=1.4)
    P.lines(['cloth', 'mem'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('rider', 'cloud'), ('head', 'rider'), ('arm_l', 'rider'), ('arm_r', 'rider'), ('bundle', 'cloud'),
                                                              ('wf', 'cloud'), ('wb', 'cloud')]),
    cams=[((46, -60, 44), (0, 0, 16)), ((-46, 56, 40), (0, 2, 16))], fold=(0, 12, 22, 40))
