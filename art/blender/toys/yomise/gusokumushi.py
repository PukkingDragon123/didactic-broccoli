"""ちょうちんダイオウグソクムシ Lantern-Peddler Giant Isopod: the lantern peddler of the deep-sea night market (series
yomise, concepts_D.md). A giant isopod in its armour of overlapping plates, a wooden carrying frame strapped on its back
with three paper lanterns hung from the top bar. (It has not eaten for five years. It does not mind.)

Gimmick: the lanterns light up warm (light-up) and it curls up shyly, then uncurls.

    tools/blender.sh art/blender/toys/yomise/gusokumushi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yatai as ya  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('yomise', 'gusokumushi')
SZ = ya.SZ
BZ = SZ + 2.4                 # the body's centre line
HY, TY = -5.6, 6.4            # the head and tail hinges (y)
FT = SZ + 21.0                # the carrying frame's top bar
low = ya.low


def seg_sculpt(h):
    def f(V, N):   # the overlapping plates: a groove and a lip every 2.4 mm along the back
        u = np.mod(V[:, 1] + 0.6, 2.4)
        return (-0.4 * np.exp(-(u / 0.3) ** 2) + 0.18 * np.exp(-((u - 0.5) / 0.3) ** 2)) * (N[:, 2] > -0.3)
    tk.push(h, f)


def plates(name, rings, tris, region='shell'):
    o = tk.loft(name, [{'c': (0, y, BZ + dz), 'w': w, 'ht': ht, 'hb': 1.2, 'e': 2.4} for y, w, ht, dz in rings], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
    return low(o, name, tris, sculpt=seg_sculpt, region=(region, [('under', lambda C_, N: N[:, 2] < -0.5)]))


# ------------------------------------------------------------------ the sea floor
base_lo, base_hi = ya.seabed(F, rx=14.0, ry=13.0, seed=10)
# ------------------------------------------------------------------ the isopod: head, middle, tail (each rigged), legs, antennae, tail fan
HEADP = [plates('headp', [(-10.6, 6.4, 2.2, -0.6), (-9.0, 9.4, 3.2, -0.2), (-7.0, 11.4, 3.8, 0.0), (HY + 0.6, 12.2, 4.0, 0.0)], 110)]
MID = [plates('midp', [(HY - 0.4, 12.4, 4.0, 0.0), (-2.0, 13.4, 4.4, 0.1), (2.4, 13.2, 4.4, 0.1), (TY + 0.4, 11.6, 4.0, 0.0)], 140)]
TAILP = [plates('tailp', [(TY - 0.6, 11.4, 3.8, 0.0), (8.6, 9.6, 3.0, -0.2), (10.8, 7.0, 2.0, -0.5), (12.2, 4.6, 1.2, -0.8)], 100)]
for sx in (1, -1):
    for i, y in enumerate((-4.4, -2.0, 0.4, 2.8, 5.0)):
        lg = tk.tube('leg', [(sx * 5.4, y, SZ + 1.2), (sx * 7.0, y - 0.4, SZ + 1.4), (sx * 7.8, y - 0.8, SZ + 0.1)], [0.5, 0.4, 0.25], n=5, cap1='point')
        MID.append(low(lg, 'leg', 12, lo=1, hi=1, region='leg'))
    an = tk.tube('antenna', [(sx * 1.6, -10.8, BZ + 0.2), (sx * 4.0, -13.4, SZ + 1.0), (sx * 8.0, -12.6, SZ + 0.5), (sx * 10.4, -9.0, SZ + 0.4)], [0.45, 0.35, 0.25, 0.15], n=5, cap1='point')
    HEADP.append(low(an, 'antenna', 24, lo=1, hi=1, region='leg'))
    ur = tk.slab('uropod', [(0.0, 0.0), (1.6, 1.0), (2.2, 4.0), (0.6, 3.6)], 0.5, plane='XY', at=0.0, bevel=0.15, segs=1)
    if sx < 0:
        tk.scale(ur, (-1, 1, 1))
        tk.fix_normals(ur)
    tk.move(ur, (sx * 2.6, 10.4, SZ + 0.8))
    TAILP.append(low(ur, 'uropod', 14, lo=0, hi=1, region='shell'))
# ------------------------------------------------------------------ the carrying frame strapped on its back, and its three lanterns
FR = []
for sx in (1, -1):
    FR.append(ya.box('post', (1.0, 1.0, FT - BZ - 3.4), (sx * 4.4, 1.2, (BZ + 3.6 + FT) / 2), 'frame'))
FR += [ya.box('rung', (9.8, 0.9, 0.9), (0, 1.2, BZ + 6.4), 'frame'), ya.box('rung2', (9.8, 0.9, 0.9), (0, 1.2, FT - 5.6), 'frame'),
       ya.box('beam', (16.4, 1.0, 1.0), (0, 1.2, FT), 'frame'), ya.box('strap', (13.6, 1.2, 0.5), (0, -0.6, BZ + 4.3), 'strap')]
LAN = []
for x in (-6.6, 0.0, 6.6):
    c = np.array((x, 1.2, FT - 4.6))
    ln = tk.lathe('lantern', [(0, -2.4), (1.1, -2.4), (1.9, -1.6), (2.1, 0.0), (1.9, 1.6), (1.1, 2.4), (0, 2.4)], n=12, centre=tuple(c))
    tk.push(ln, lambda V, N, c=c: -0.15 * (np.abs(np.mod(V[:, 2] - c[2] + 0.4, 0.8) - 0.4) < 0.1) * (np.abs(N[:, 2]) < 0.7))   # the bamboo ribs
    caps = [tk.cyl('lcap', 1.2, c[2] + s * 2.2, c[2] + s * 2.9, n=10, at=(c[0], c[1]), axis='Z', bevel=0.15, segs=1) for s in (1, -1)]
    hook = tk.tube('lhook', [tuple(c + (0, 0, 2.9)), tuple(c + (0, 0, 4.1))], 0.18, n=4)
    LAN += [low(ln, 'lantern', 50, lo=0, hi=1, region='paper')]
    FR += [low(tk.join(caps, 'lcaps'), 'lcaps', 30, lo=0, hi=0, region='lcap'), low(hook, 'lhook', 8, lo=0, hi=1, region='lcap')]

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('mid', tk.join([m[0] for m in MID], 'mid'), [m[1] for m in MID], bone='mid')
F.part('head', tk.join([h[0] for h in HEADP], 'head'), [h[1] for h in HEADP], bone='head')
F.part('tail', tk.join([t[0] for t in TAILP], 'tail'), [t[1] for t in TAILP], bone='tail')
F.part('frame', tk.join([f_[0] for f_ in FR], 'frame'), [f_[1] for f_ in FR], bone='frame')
F.part('lanterns', tk.join([l_[0] for l_ in LAN], 'lanterns'), [l_[1] for l_ in LAN], bone='lanterns', kind='led')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('mid', (0, 0.4, BZ), parent='root')
    R.bone('head', (0, HY, BZ + 1.0), parent='mid')
    R.bone('tail', (0, TY, BZ + 1.0), parent='mid')
    R.bone('frame', (0, 1.2, BZ + 3.6), parent='mid')
    R.bone('lanterns', (0, 1.2, FT), parent='frame')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'mid', 'head', 'tail', 'frame', 'lanterns']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-10 the lanterns light (and swing); 12-28 it curls up shyly (the back humps, head and tail tuck down);
        # 28-50 a peek (the head lifts a little); 54-70 it uncurls
        k('mid', 12)
        k('mid', 26, move=(0, 0, 2.2))
        k('mid', 52, move=(0, 0, 2.2))
        k('mid', 68)
        k('head', 12)
        k('head', 26, rot=('X', 34))
        k('head', 36, rot=('X', 34))
        k('head', 42, rot=('X', 20))
        k('head', 48, rot=('X', 34))
        k('head', 52, rot=('X', 34))
        k('head', 68)
        k('tail', 12)
        k('tail', 26, rot=('X', -30))
        k('tail', 52, rot=('X', -30))
        k('tail', 68)
        k('lanterns', 4)
        for i, f in enumerate(range(10, 70, 7)):
            k('lanterns', f, rot=('X', (6 if i % 2 else -6) * (1 - i / 10)))
        k('frame', 26)
        k('frame', 30, rot=('Y', 4))
        k('frame', 34)
        for b in allb:
            k(b, 76)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ya.paint_seabed(P, pt, sh)
    # the isopod: pale lilac-grey armour, each plate's back edge a step darker; a creamy underside, darker legs
    P.fill('shell', pt.ramp('#b8b0bc', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'lacquer', 'flow': 'along', 'axis': (1, 0, 0)})
    sl = P.region('shell')
    P.shift(sl & (np.mod(Y + 0.6, 2.4) < 0.35), -1)
    who, d = P.dabs(sl, size=0.4, spacing=1.2, seed=91)
    P.shift(sl & (who >= 0) & (d < 0.5), 1)
    P.fill('under', pt.ramp('#d8ccb8', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('leg', pt.ramp('#9a8e9c', 5, shift=0.05), tone=sh, base=0.05)
    # the frame: dark weathered wood, a rope strap; the lanterns: warm paper, red bands, black caps
    ya.paint_wood(P, pt, sh, 'frame', '#6a4a32', axis=(0, 0, 1))
    P.fill('strap', pt.ramp('#c8a870', 5, shift=0.05), tone=sh, base=0.05, brush={'preset': 'cloth', 'flow': 'along', 'axis': (1, 0, 0)})
    P.fill('paper', pt.ramp('#f6e2b0', 6, shift=0.05), tone=sh * 0.5, base=0.25, brush={'preset': 'pvc', 'flow': 'around'})
    pa = P.region('paper')
    lz = np.abs(Z - (FT - 4.6))
    P.fill(pa & (lz > 1.5) & (lz < 2.2), pt.ramp('#c8302a', 5, shift=0.05), tone=sh * 0.5, base=0.15, brush=False)
    P.shift(pa & (np.abs(np.mod(Z - FT + 4.6 + 0.4, 0.8) - 0.4) < 0.08), -1)     # the ribs
    P.fill('lcap', pt.ramp('#2a2624', 5), tone=sh, base=0.1)
    # the face: tiny dots set wide on the front of the head, a small shy mouth, blush
    hd = sl & (P.part == PI['head'])
    fc = face.Face(P, c=(0, -11.4, BZ + 0.6), axis=(0, -1, 0.35), where=hd, seed=711)
    fc.eyes('dot', spread=4.2, size=0.42, dy=0.6, uneven=0.25)
    fc.mouth('dash', w=1.2, dy=-0.6, weight=0.3, slant=-10)
    fc.blush(spread=5.0, dy=-0.2, rx=0.9, ry=0.5)
    P.lines(['paper', 'strap', 'frame'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 77), skip=[('head', 'mid'), ('tail', 'mid'), ('frame', 'mid'), ('lanterns', 'frame'), ('mid', 'base')]),
    cams=[((40, -52, 40), (0, -1, 10)), ((-40, 48, 38), (0, 2, 10))], fold=(0, 12, 28, 60))
