"""うらないデメニギス Fortune-Teller Barreleye: the fortune-teller's booth of the deep-sea night market (series yomise,
concepts_D.md). A barreleye stands on its tail behind a little draped table with an omikuji box; its see-through dome
head, the green tube-eyes looking up inside it, is the crystal ball. (The two "eyes" on its face are its nostrils.)

Gimmick: the dome glows green (light-up), the big fins wave over it, and a fortune stick pops up out of the box.

    tools/blender.sh art/blender/toys/yomise/demenigisu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('yomise', 'demenigisu')
SZ = ya.SZ
TB = np.array((1.4, -5.6, SZ))          # the table's foot
TT = SZ + 7.0                           # its top
FX, FY = -0.6, 3.0                      # the fish's axis
HD = np.array((FX, FY - 1.0, SZ + 18.4))   # the dome's centre
BOX = np.array((TB[0] + 2.6, TB[1] - 0.6, TT))
low = ya.low

# ------------------------------------------------------------------ the sea floor, the draped table, the omikuji box and its stick
base_lo, base_hi = ya.seabed(F, rx=13.0, ry=12.5, seed=4)
table = tk.rbox('table', (10.0, 7.6, TT - SZ), centre=(TB[0], TB[1], (SZ + TT) / 2), bevel=0.6, segs=2)
tk.push(table, lambda V, N: 0.3 * np.sin(V[:, 0] * 2.2 + V[:, 1] * 2.2) * (V[:, 2] < TT - 1.2) * (np.abs(N[:, 2]) < 0.6))   # the drape's folds
box = tk.lathe('box', [(0, 0.0), (1.7, 0.0), (1.7, 4.2), (1.3, 4.6), (0, 4.6)], n=6, centre=tuple(BOX))
PB = [low(table, 'table', 90, lo=1, hi=2, region=('cloth', [('cloth_top', lambda C_, N: N[:, 2] > 0.7)])), low(box, 'box', 30, lo=0, hi=1, region='box')]
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)
stick = tk.tube('stick', [tuple(BOX + (0, 0, 1.0)), tuple(BOX + (0, 0, 5.4))], [0.32, 0.3], n=5, cap0='flat', cap1='flat')
STK = low(stick, 'stick', 12, lo=0, hi=1, region=('stick', [('sticktip', lambda C_, N: C_[:, 2] > BOX[2] + 4.7)]))

# ------------------------------------------------------------------ the barreleye, upright on its tail: body, shawl, tail fin, fins, the dome
body = tk.loft('body', [{'c': (FX, FY + 0.4, SZ + 2.8), 'w': 2.8, 'h': 1.8, 'e': 2.2}, {'c': (FX, FY + 0.2, SZ + 7.6), 'w': 6.6, 'h': 4.0, 'e': 2.2},
                        {'c': (FX, FY, SZ + 12.6), 'w': 7.6, 'h': 4.8, 'e': 2.3}, {'c': (FX, FY - 0.2, SZ + 16.4), 'w': 7.0, 'h': 4.6, 'e': 2.3},
                        {'c': (FX, FY - 0.6, SZ + 18.6), 'w': 5.2, 'h': 3.6, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
FISH = [low(body, 'body', 170, region=('scale', [('shawl', lambda C_, N: (C_[:, 2] > SZ + 6.0) & (C_[:, 2] < SZ + 13.0))]))]
snout = tk.tube('snout', [(FX, FY - 3.6, SZ + 15.8), (FX, FY - 5.6, SZ + 15.4)], [1.6, 1.1], n=10, cap0=None, cap1='round')
FISH.append(low(snout, 'snout', 30, lo=1, hi=1, region='scale'))
tail = tk.slab('tail', [(-4.6, 0.0), (4.6, 0.0), (1.4, 3.6), (0.0, 4.4), (-1.4, 3.6)], 0.8, plane='XZ', at=0.0, bevel=0.25, segs=1)
tk.move(tail, (FX, FY + 0.4, SZ))
tail2 = tk.copy(tail, 'tail2')
tk.rotate(tail2, 90, 'Z', pivot=(FX, FY + 0.4, 0))
FISH += [low(tail, 'tail', 20, lo=0, hi=1, region='fin'), low(tail2, 'tail2', 20, lo=0, hi=1, region='fin')]
dorsal = tk.slab('dorsal', [(0.0, 0.0), (2.6, -1.0), (3.0, 1.6), (0.0, 2.6)], 0.6, plane='YZ', at=FX, bevel=0.2, segs=1)
tk.move(dorsal, (0, FY + 3.6, SZ + 10.0))
FISH.append(low(dorsal, 'dorsal', 16, lo=0, hi=1, region='fin'))
dome = tk.lathe('dome', [(0, -0.6), (3.0, -0.6), (4.2, 1.0), (4.4, 3.0), (3.6, 5.0), (2.0, 6.2), (0, 6.5)], n=16, centre=(0, 0, 0))
tk.scale(dome, (1.0, 1.2, 1.0))
tk.rotate(dome, -30, 'X')
tk.move(dome, tuple(HD))
DOME = low(dome, 'dome', 90, lo=1, hi=2, region='dome')
FINS = {}
for nm, sx in (('fin_l', 1), ('fin_r', -1)):   # the big fan fins held up round the dome, a fortune-teller's hands
    root = np.array((FX + sx * 3.4, FY - 1.4, SZ + 14.2))
    fn = tk.slab(nm, [(0.0, 0.0), (1.6, -1.6), (5.6, -2.0), (7.2, -0.4), (6.6, 1.6), (2.4, 1.4)], 0.6, plane='XZ', at=0.0, bevel=0.2, segs=1)
    if sx < 0:
        tk.scale(fn, (-1, 1, 1))
        tk.fix_normals(fn)
    tk.rotate(fn, -sx * 62, 'Y')
    tk.rotate(fn, sx * 20, 'Z')
    tk.move(fn, tuple(root))
    FINS[nm] = (low(fn, nm, 24, lo=0, hi=1, region='fin'), tuple(root))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('stick', STK[0], [STK[1]], bone='stick')
F.part('body', tk.join([f_[0] for f_ in FISH], 'body'), [f_[1] for f_ in FISH], bone='body')
F.part('dome', DOME[0], [DOME[1]], bone='body', kind='led')
for nm, (pr, root) in FINS.items():
    F.part(nm, pr[0], [pr[1]], bone=nm)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (FX, FY, SZ + 1.0), parent='root')
    for nm, (pr, root) in FINS.items():
        R.bone(nm, root, parent='body')
    R.bone('stick', tuple(BOX + (0, 0, 1.0)), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'fin_l', 'fin_r', 'stick']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-12 it leans in over the table; 10-44 the fins weave circles over the glowing dome; 40-46 the fortune stick
        # pops up out of the box; 46-64 it holds still, solemn; 70-80 back
        k('body', 4)
        k('body', 12, rot=('X', 8))
        for i, f in enumerate(range(10, 46, 6)):
            k('body', f + 2, rot=[('X', 8), ('Z', 4 if i % 2 else -4)])
            for nm, sx in (('fin_l', 1), ('fin_r', -1)):
                up = (i + (sx > 0)) % 2
                k(nm, f, rot=[('Y', -sx * (14 if up else -6)), ('Z', sx * (24 if up else -10))])
        for nm in FINS:
            k(nm, 50)
        k('body', 48, rot=('X', 4))
        k('body', 64, rot=('X', 4))
        k('body', 74)
        k('stick', 40)
        k('stick', 46, move=(0, 0, 3.4), ease='BACK')
        k('stick', 66, move=(0, 0, 3.4))
        k('stick', 74)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ya.paint_seabed(P, pt, sh)
    # the table: a deep purple drape with a gold hem; the top a paler cloth; the box plain wood with a red label
    P.fill('cloth', pt.ramp('#4a2a6a', 6, shift=0.07), tone=sh, base=0.05, brush={'preset': 'cloth', 'flow': 'down'})
    P.fill(P.region('cloth') & (Z < SZ + 1.0), pt.ramp('#d8b048', 5), tone=sh, base=0.1, brush=False)
    P.fill('cloth_top', pt.ramp('#5a3a7a', 6, shift=0.06), tone=sh, base=0.1, brush='cloth')
    ya.paint_wood(P, pt, sh, 'box', '#c8a06a', axis=(0, 0, 1))
    P.fill(P.region('box') & (np.abs(Z - BOX[2] - 2.4) < 1.2) & (P.on[:, :, 1] < -0.4), pt.ramp('#c8302a', 4), tone=sh, base=0.1, brush=False)
    P.fill('stick', pt.ramp('#e8d4a8', 4), tone=sh, base=0.15)
    P.fill('sticktip', pt.ramp('#c8302a', 4), tone=sh, base=0.1)
    # the fish: dark umber with bronze scales, its shawl purple with a gold hem; fins pale and see-through-ish
    P.fill('scale', pt.ramp('#5a4232', 7, shift=0.07), tone=sh, base=0.05)
    sc = P.region('scale')
    who, d = P.dabs(sc, size=0.8, spacing=1.3, seed=71)
    P.fill(sc & (who >= 0) & (d > 0.78), pt.ramp('#a8865a', 5), tone=sh, base=0.05, brush=False)
    P.fill('shawl', pt.ramp('#6a3a8a', 6, shift=0.07), tone=sh, base=0.05, brush='cloth')
    P.fill(P.region('shawl') & ((np.abs(Z - SZ - 6.4) < 0.5) | (np.abs(Z - SZ - 12.6) < 0.5)), pt.ramp('#d8b048', 5), tone=sh, base=0.1, brush=False)
    P.fill('fin', pt.ramp('#b8b4a4', 6, shift=0.05), tone=sh, base=0.15, brush={'preset': 'pvc', 'flow': 'along', 'axis': (1, -0.5, 0)})
    # the dome: pale green glass, the two green tube-eyes inside it looking up, a light streak
    dm = P.region('dome')
    P.fill('dome', pt.ramp('#bfe8c8', 6, shift=0.04, light=0.5), tone=sh * 0.5, base=0.25, brush={'preset': 'gloss', 'flow': 'around'})
    for sx in (1, -1):
        ec = HD + (sx * 1.4, -1.6, 1.4)
        P.fill(dm & (np.hypot(X - ec[0], Y - ec[1]) < 0.85) & (Z > HD[2]), pt.ramp('#3aa85a', 5, shift=0.05), tone=sh * 0.5, base=0.2, brush=False)
        P.flat(dm & (np.hypot(X - ec[0], Y - ec[1]) < 0.35) & (Z > HD[2] + 3.4), '#1a2a20')
    P.fill(dm & (np.abs(X - HD[0] + 1.8 - 0.4 * (Z - HD[2])) < 0.3) & (Y < HD[1]), pt.ramp('#f2fff4', 4), tone=sh * 0.3, base=0.3, brush=False)
    # the face (the nostril "eyes" set close, a small solemn mouth at the snout's tip), blush
    fw = sc & (P.part == PI['body'])
    fc = face.Face(P, c=(FX, FY - 4.4, SZ + 15.6), axis=(0, -1, 0.2), where=fw, seed=681, ink='#efe4c8')
    fc.eyes('dot', spread=1.8, size=0.38, dy=1.0, uneven=0.2)
    fm = face.Face(P, c=(FX, FY - 6.7, SZ + 15.4), axis=(0, -1, 0.0), where=fw, seed=682, ink='#efe4c8')
    fm.mouth('line', w=1.4, dy=-0.2, weight=0.3)
    fc.blush(spread=3.4, dy=0.4, rx=0.7, ry=0.4, col='#c87a8a')
    P.lines(['shawl', 'fin', 'dome', 'cloth'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('fin_l', 'body'), ('fin_r', 'body'), ('stick', 'base'), ('dome', 'body'), ('body', 'base')]),
    cams=[((40, -52, 40), (0, -1, 11)), ((-40, 48, 38), (0, 2, 11))], fold=(0, 16, 30, 50))
