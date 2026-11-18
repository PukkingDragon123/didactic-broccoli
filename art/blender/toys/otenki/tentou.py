"""てんとうムシ Sun Ladybird (secret): the sunshine courier (series otenki, concepts_D.md). 天道虫, "the sun's-path
insect", the ladybird that climbs to the top of a stem and flies off towards the sun. Ours delivers it: a seven-spot
ladybird in a little courier's cap, riding a gold-bellied dawn cloud, the sun itself folded under her wing cases.

Gimmick: the wing cases open, the wings flutter and the sun rises up off her back and lights (light-up). Pull it back
and let go: the cloud scoots off (run).

    tools/blender.sh art/blender/toys/otenki/tentou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kumo as km  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('otenki', 'tentou')
C = km.cloud(F, L=26.0, W=18.0, Hc=7.6, seed=13, lumps=1.1, region='cloud', bar=False)
ST = C['top'] - 0.6
SC = np.array((0.0, 1.6, ST + 0.6))          # the shell's foot centre
PN = np.array((0.0, -6.0, ST + 0.8))         # the pronotum
HC = np.array((0.0, -8.8, ST + 2.0))         # the head
SUN = np.array((0.0, 1.6, ST + 2.6))         # the sun's centre, folded under the wing cases
low = km.low

# ------------------------------------------------------------------ the body under it all: the abdomen, six legs
abd = tk.lathe('abdomen', [(0, 0.0), (6.6, 0.0), (6.4, 1.2), (4.4, 2.0), (0, 2.2)], n=16, centre=tuple(SC))
tk.scale(abd, (1.0, 1.15, 1.0), pivot=tuple(SC))
BODY = [low(abd, 'abdomen', 60, lo=0, hi=1, region='under')]
for sx in (1, -1):
    for i, (y0, y1) in enumerate(((-3.6, -6.8), (0.4, 0.0), (4.0, 6.0))):
        lg = tk.tube('leg', [(sx * 5.6, y0, ST + 1.0), (sx * 8.0, (y0 + y1) / 2, ST + 1.6), (sx * 8.6, y1, ST - 0.2)], [0.55, 0.45, 0.35], n=5, cap1='round')
        BODY.append(low(lg, 'leg', 16, lo=1, hi=1, region='black'))
pron = tk.lathe('pronotum', [(0, 0.0), (5.0, 0.0), (4.8, 1.4), (3.4, 3.2), (0, 3.6)], n=14, centre=tuple(PN))
tk.scale(pron, (1.0, 0.62, 1.0), pivot=tuple(PN))
BODY.append(low(pron, 'pronotum', 60, lo=1, hi=1, region='black'))
# ------------------------------------------------------------------ the head: small and black, white cheek marks, a courier's cap
head = tk.lathe('head', [(0, -2.2), (2.2, -1.8), (2.9, 0.0), (2.6, 1.4), (1.6, 2.2), (0, 2.4)], n=12, centre=tuple(HC))
tk.scale(head, (1.12, 0.9, 1.0), pivot=tuple(HC))
CP = HC + (0, 0.4, 1.8)
cap = tk.lathe('cap', [(0, 0.0), (2.6, 0.0), (2.6, 0.8), (2.0, 1.8), (0, 2.1)], n=12, centre=tuple(CP))
visor = tk.slab('visor', tk.circle_pts(2.5, 10, (0, 0), 200, 340, closed=False), 0.35, plane='XY', at=0.0, bevel=0.1, segs=1)
tk.scale(visor, (1.0, 0.9, 1.0))
tk.move(visor, tuple(CP + (0, -0.6, 0.2)))
HEAD = [low(head, 'head', 70, lo=1, hi=1, region='black'), low(cap, 'cap', 40, lo=0, hi=1, region='cap'), low(visor, 'visor', 20, lo=0, hi=1, region='cap')]
for sx in (1, -1):
    an = tk.tube('antenna', [tuple(HC + (sx * 1.0, -1.6, 1.2)), tuple(HC + (sx * 2.2, -2.6, 2.6)), tuple(HC + (sx * 2.6, -3.0, 3.0))], [0.25, 0.2, 0.35], n=4, cap1='round')
    HEAD.append(low(an, 'antenna', 10, lo=0, hi=1, region='black'))
# ------------------------------------------------------------------ the wing cases (split down the middle) and the wings folded under
EL = {}
for nm, sx in (('ely_l', 1), ('ely_r', -1)):
    d = tk.lathe(nm, [(0, 0.0), (7.2, 0.0), (7.4, 0.8), (6.6, 3.6), (4.4, 6.0), (0, 6.8)], n=20, centre=tuple(SC))
    tk.scale(d, (1.0, 1.18, 1.0), pivot=tuple(SC))
    tk.bisect(d, (sx * 0.12, 0, 0), (sx, 0, 0), keep='+')
    wg = tk.slab('wing', [(0.0, 0.0), (3.0, -1.6), (7.0, -1.0), (8.6, 0.4), (7.0, 1.6), (2.6, 1.4)], 0.25, plane='XY', at=0.0, bevel=0.08, segs=1)
    if sx < 0:
        tk.scale(wg, (-1, 1, 1))
        tk.fix_normals(wg)
    tk.rotate(wg, -sx * 70, 'Z')
    tk.move(wg, tuple(SC + (sx * 0.8, -2.0, 2.4)))
    EL[nm] = ([low(d, nm, 90, lo=1, hi=1, region='ely'), low(wg, 'wing', 20, lo=0, hi=1, region='wing')], (sx * 0.4, SC[1] - 3.0, SC[2] + 5.2))
# ------------------------------------------------------------------ the sun, folded flat under the wing cases
rays = []
for i in range(24):
    a = math.radians(i * 15)
    r = 4.6 if i % 2 else 3.4
    rays.append((r * math.cos(a), r * math.sin(a)))
sun = tk.slab('sun', rays, 0.8, plane='XY', at=0.0, bevel=0.2, segs=1)
disc = tk.cyl('disc', 2.9, 0.0, 1.2, n=14, at=(0, 0), axis='Z', bevel=0.3, segs=1)
tk.move(disc, (0, 0, -0.6))
s1 = tk.join([sun, disc], 'sun')
tk.move(s1, tuple(SUN))
sun_lo, sun_hi = low(s1, 'sun', 90, lo=0, hi=1, region=('ray', [('sundisc', lambda C_, N: np.hypot(C_[:, 0] - SUN[0], C_[:, 1] - SUN[1]) < 2.95)]))

# ------------------------------------------------------------------ parts
km.parts(F, C)
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
for nm, (pp, hinge) in EL.items():
    F.part(nm, pp[0][0], [pp[0][1]], bone=nm, kind='gloss')
    F.part('w' + nm[3:], pp[1][0], [pp[1][1]], bone='w' + nm[3:])
F.part('sun', sun_lo, [sun_hi], bone='sun', kind='led')


# ------------------------------------------------------------------ rig: the press clip and the pull-back run
def make_rig():
    from rig import Rig
    R = Rig()
    km.bones(R, C)
    R.bone('body', (0, 0.0, ST), parent='cloud')
    R.bone('head', tuple(HC + (0, 1.6, -0.6)), parent='body')
    for nm, (pp, hinge) in EL.items():
        R.bone(nm, hinge, parent='body')
        R.bone('w' + nm[3:], tuple(SC + ((1 if nm == 'ely_l' else -1) * 0.8, -2.0, 2.4)), parent='body')
    R.bone('sun', tuple(SUN), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'cloud', 'wf', 'wb', 'body', 'head', 'ely_l', 'ely_r', 'w_l', 'w_r', 'sun']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-14 the wing cases swing open; 10-18 the wings unfold, then whirr; 12-26 the sun rises off her back, turns to
        # face front and shines (light-up); 60-76 it all folds away again
        for nm, sx in (('ely_l', 1), ('ely_r', -1)):
            k(nm, 4)
            k(nm, 14, rot=[('Y', -sx * 62), ('X', -14)], ease='BACK')
            k(nm, 60, rot=[('Y', -sx * 62), ('X', -14)])
            k(nm, 74)
        for nm, sx in (('w_l', 1), ('w_r', -1)):
            k(nm, 8)
            k(nm, 16, rot=[('Z', sx * 60), ('Y', -sx * 20)], move=(0, 0, 3.0))
            for i, f in enumerate(range(18, 56, 2)):
                k(nm, f, rot=[('Z', sx * 60), ('Y', -sx * (34 if i % 2 else 6))], move=(0, 0, 3.0), ease='LINEAR')
            k(nm, 58, rot=[('Z', sx * 60), ('Y', -sx * 20)], move=(0, 0, 3.0))
            k(nm, 70)
        k('sun', 10)
        k('sun', 26, move=(0, -1.0, 9.0), rot=('X', -70), ease='BACK')
        for i, f in enumerate(range(30, 58, 7)):
            k('sun', f, move=(0, -1.0, 9.0 + (0.5 if i % 2 else 0)), rot=[('X', -70), ('Y', 10 * (i + 1))])
        k('sun', 62, move=(0, -1.0, 9.0), rot=[('X', -70), ('Y', 45)])
        k('sun', 72)
        k('head', 20)
        k('head', 28, rot=('X', -16))
        k('head', 56, rot=('X', -16))
        k('head', 66)
        for b in allb:
            k(b, 80)
    km.run(R, C, extra=lambda k_, f: (k_('head', f, rot=('X', 0 if f % 16 == 0 else -6)), k_('ely_l', f), k_('ely_r', f), k_('sun', f)))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    km.paint_cloud(P, pt, sh, C, col='#f8f0e2', belly='#e0a858')
    km.paint_kit(P, pt, sh, C, plate_ink='#d0302a')
    # the wing cases: glossy red, seven black spots (three each side and one shared at the front of the seam)
    ey = P.region('ely')
    P.fill('ely', pt.ramp('#d4302a', 7, shift=0.07, light=0.6), tone=sh, base=0.1, brush={'preset': 'gloss', 'flow': 'around'})
    ax = np.abs(X)
    spots = np.zeros_like(ey)
    for (sx_, sy_, r_) in ((3.2, -2.6, 1.3), (5.2, 2.6, 1.2), (2.8, 5.6, 1.1)):
        spots |= np.hypot(ax - sx_, Y - SC[1] - sy_) < r_
    spots |= np.hypot(X, Y - SC[1] + 6.4) < 1.6
    P.fill(ey & spots & (P.on[:, :, 2] > 0.0), pt.ramp('#1e1c1c', 5, shift=0.04), tone=sh, base=0.05, brush=False)
    P.fill('black', pt.ramp('#262424', 6, shift=0.04), tone=sh, base=0.1, brush='gloss')
    bl = P.region('black') & (P.part == PI['body'])
    P.fill(bl & (np.hypot(ax - 3.4, Y - PN[1] + 1.2) < 1.3) & (Z > PN[2] + 0.4), pt.ramp('#efe8d8', 4), tone=sh, base=0.2)   # white marks
    P.fill('under', pt.ramp('#3a3030', 5), tone=sh, base=0.05)
    P.fill('wing', pt.ramp('#e8cc96', 5, shift=0.05), tone=sh * 0.5, base=0.25, brush={'preset': 'pvc', 'flow': 'along', 'axis': (1, 0.2, 0)})
    P.shift(P.region('wing') & (np.abs(np.mod(np.arctan2(Y - SC[1] + 2.0, X) * 6, 1.0) - 0.5) < 0.05), -1)   # veins
    P.fill('cap', pt.ramp('#2a5ab0', 6, shift=0.06), tone=sh, base=0.1, brush='cloth')
    P.flat(P.region('cap') & (np.hypot(X, Z - CP[2] - 1.0) < 0.55) & (Y < CP[1] - 1.2), '#f2c040')     # the cap's sun badge
    P.fill('ray', pt.ramp('#f0a030', 5, shift=0.06), tone=sh * 0.4, base=0.2, brush=False)
    P.fill('sundisc', pt.ramp('#ffd860', 5, shift=0.04), tone=sh * 0.4, base=0.3, brush={'preset': 'pvc', 'flow': 'around'})
    # the face: on the black head, light ink dots and a little smile; pink blush
    hd = P.region('black') & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -2.6, 0.2)), axis=(0, -1, 0.1), where=hd, seed=661, ink='#f2e8d2')
    fc.eyes('dot', spread=2.8, size=0.42, dy=0.4, uneven=0.2)
    fc.mouth('upturn', w=1.4, dy=-0.7, weight=0.26)
    fc.blush(spread=3.6, dy=-0.3, rx=0.6, ry=0.35, col='#e87a8a')
    # the sun's own face, painted on the disc's top: two dots and a grin (it is a toy sun)
    fs = face.Face(P, c=tuple(SUN + (0, 0, 0.6)), axis=(0, -0.0001, 1), up=(0, 1, 0), where=P.region('sundisc'), seed=662)
    fs.eyes('dot', spread=2.0, size=0.34, dy=0.3)
    fs.mouth('upturn', w=1.6, dy=-0.6, weight=0.28)
    P.lines(['ely', 'cap', 'sundisc'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('body', 'cloud'), ('head', 'body'), ('ely_l', 'body'), ('ely_r', 'body'), ('w_l', 'body'), ('w_r', 'body'),
                                                              ('sun', 'body'), ('w_l', 'ely_l'), ('w_r', 'ely_r'), ('sun', 'ely_l'), ('sun', 'ely_r'),
                                                              ('wf', 'cloud'), ('wb', 'cloud')]),
    cams=[((40, -52, 40), (0, -1, 12)), ((-40, 48, 38), (0, 2, 12))], fold=(0, 10, 26, 44))
