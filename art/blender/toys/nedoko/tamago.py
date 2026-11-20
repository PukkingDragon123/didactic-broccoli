"""たまごハムスター Omelette-Quilt Hamster (series nedoko, Sushi Bedtime, concepts_F.md): a golden hamster with stuffed
cheek pouches tucked under a plump tamago-yaki quilt (square shouldered, its rolled layers showing on the sides, the top
browned), the whole bed tied up with a band of nori like a futon strap; it holds a sunflower seed under its chin. A
green kaiten plate.
Gimmick: the quilt (and its strap) lifts, the hamster sits up cheeks first, yawns, and flops back to bed.

    tools/blender.sh art/blender/toys/nedoko/tamago.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _futon import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('nedoko', 'tamago')
B = Build()
plate(B)
rice_bed(B, L=22.0, W=12.6, seed=5)

# ------------------------------------------------------------------ the hamster: a round loaf, a big round head with stuffed cheeks
BZ = RZ - 0.5
B.add('body', loaf('body', -2.2, 8.4, 9.4, 4.4, BZ, region='fur'))
for sx in (1, -1):
    B.add('body', paw('paw', (sx * 1.5, -7.4, RZ + 1.0), d=(sx * -0.3, -1, 0.2), r=0.9, region='pink', tris=18))
B.add('body', blob('seed', (0, -9.4, RZ + 1.5), 1.0, tris=14, region='seed', squash=(0.55, 0.5, 1.2)))
HC = V3(0, -5.2, RZ + 4.2)
mz = lambda C, N: (C[:, 1] < HC[1] - 2.2) & (C[:, 2] < HC[2] - 0.2)  # noqa: E731
HP = [head('head', HC, 9.6, 7.2, 7.2, snout=0.0, region='fur', rules=[('cream', mz)])]
for sx in (1, -1):
    HP.append(blob('cheek', HC + (sx * 3.9, -1.6, -1.6), 2.4, tris=26, region='cream', squash=(0.9, 0.95, 0.8)))      # the stuffed pouches
    HP.append(blob('ear', HC + (sx * 3.2, 0.9, 3.4), 1.5, tris=14, region='ear', squash=(1.0, 0.45, 1.0)))
B.add('head', *HP)

# ------------------------------------------------------------------ the tamago quilt: thick, square shouldered, rolled layers; the nori strap
QT, QS = RZ + 6.0, RZ - 2.4


def rolls(h):
    def f(V, N):
        side = tk.smoothstep(0.3, 0.8, np.abs(N[:, 0]))
        return -0.16 * side * (np.abs(np.mod(V[:, 2] + 0.25 * V[:, 1], 1.6) - 0.8) < 0.14)
    tk.push(h, f)


B.add('neta', duvet('neta', -2.8, 12.0, 14.6, QT, QS, 'egg', th=2.2, tris=150, curl=0.4, arch=3.2, foot=RZ + 3.2, ends=0.66, sculpt=rolls),
      duvet('band', 3.0, 5.6, 15.4, QT + 0.4, QS - 0.2, 'nori', th=0.4, tris=50, arch=3.2, roll=0.0))
B.commit(F, kinds={'bed': 'gloss'})


def make_rig():
    return wake_rig(F, (0, 6.8, BZ + 1.2), (0, -3.4, RZ + 2.4), (0, 12.0, RZ + 3.4), sit=-40)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_bed(P, pt, sh, 'green', seed=5)
    EGG = pt.ramp('#f2c838', 7, shift=0.07, light=0.5)
    P.fill('egg', EGG, tone=sh, base=0.15, brush={'preset': 'pvc', 'flow': 'along', 'axis': (0, 1, 0), 'L': 7})
    egg = P.region('egg')
    layer = np.abs(np.mod(Z + 0.25 * Yc, 1.6) - 0.8) < 0.13
    P.tint(egg & layer & (np.abs(P.on[:, :, 0]) > 0.35), pt.ramp('#c88a2a', 6), sh)                       # the rolled layers
    brown = egg & (P.on[:, :, 2] > 0.6) & (np.sin(X * 1.7) * np.sin(Yc * 1.3 + 0.5) > 0.55)
    P.tint(brown, pt.ramp('#c8822a', 6, shift=0.06), sh)                                                   # browned spots on top
    nori(P, pt, sh, 'nori')
    FUR = pt.ramp('#e0a24c', 7, shift=0.06)
    P.fill('fur', FUR, tone=sh, base=0.15, brush='fur')
    P.fill('cream', pt.ramp('#f6ead2', 6, shift=0.03), tone=sh, base=0.2, brush='fur')
    P.fill('ear', pt.ramp('#e8a08a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('pink', pt.ramp('#f0b0a8', 6), tone=sh, base=0.2)
    P.fill('seed', pt.ramp('#2a2624', 5, light=0.5), tone=sh, base=0.2)
    P.flat(P.region('seed') & (np.abs(np.mod(Z * 2.2, 1.0) - 0.5) < 0.12), '#e8e2d2')                    # the seed's stripes
    fc = face.Face(P, c=tuple(HC + (0, -3.9, 0.2)), axis=(0, -1, 0.1), where=P.region('fur') | P.region('cream'), seed=4211)
    fc.eyes('dot', spread=4.2, size=0.55, dy=0.7)
    fc.nose('tri', dy=-0.5, size=0.45)
    fc.mouth('w', w=1.2, dy=-1.3, weight=0.18)
    fc.blush(5.6, -0.8, rx=0.9, ry=0.5)
    P.lines(['egg', 'nori', 'fur', 'cream'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=64, fold=(0, 14, 24, 40), skip=[('neta', 'bed'), ('body', 'bed'), ('head', 'body'), ('neta', 'body'), ('head', 'bed')],
    cams=[((34, -44, 30), (0, 0, 7)), ((-34, 40, 26), (0, 2, 7))])
