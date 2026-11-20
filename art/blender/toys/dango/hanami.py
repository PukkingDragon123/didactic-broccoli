"""はなみブタ Hanami Piglet (series dango, Dango Skewer Pals, concepts_F.md): cherry-blossom dango in its three spring
colours, one piglet: the pink top ball its head (a flat snout, floppy ears, a blossom tucked behind one ear), the
white middle ball its body with two trotters, the green bottom ball its seat with two little trotters in front and a
curly tail behind; on a bamboo skewer in a wooden skewer block.
Gimmick: the balls spin round the skewer one after another, then the head hops up and drops back on.

    tools/blender.sh art/blender/toys/dango/hanami.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kushi import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('dango', 'hanami')
B = Build()
stand(B)
skewer(B)

# ------------------------------------------------------------------ the bottom ball: green, trotters in front, the curly tail
B.add('b1', ball('green', Z1, region='green', seed=1))
for sx in (1, -1):
    B.add('b1', limb('leg', [(sx * 2.4, -BR * 0.6, Z1 - 1.4), (sx * 2.8, -BR - 1.0, Z1 - 2.6), (sx * 2.9, -BR - 2.2, TZ + 1.2)], [1.4, 1.3, 1.25], tris=18,
                     region='green', n=8),
          blob('hoof', (sx * 2.9, -BR - 2.6, TZ + 1.0), 1.15, tris=12, region='hoof', squash=(1.0, 0.7, 0.8)))
tail = [(0.0, BR - 0.4, Z1 + 0.6), (0.0, BR + 1.2, Z1 + 1.3), (1.0, BR + 1.9, Z1 + 0.5), (0.2, BR + 1.4, Z1 - 0.3), (-0.6, BR + 2.0, Z1 + 0.5), (0.2, BR + 2.6, Z1 + 1.1)]
B.add('b1', limb('tail', tail, [0.55, 0.5, 0.48, 0.46, 0.42, 0.3], tris=24, region='pinkish', n=6))

# ------------------------------------------------------------------ the middle ball: white, two trotters
B.add('b2', ball('white', Z2, region='white', seed=2))
for sx in (1, -1):
    B.add('b2', limb('arm', [(sx * BR * 0.8, -1.0, Z2 + 1.4), (sx * (BR + 1.2), -2.2, Z2 + 0.2), (sx * (BR + 1.0), -3.4, Z2 - 1.4)], [1.25, 1.15, 1.1], tris=18,
                     region='white', n=8),
          blob('hoof', (sx * (BR + 0.9), -3.7, Z2 - 2.0), 1.05, tris=12, region='hoof', squash=(0.9, 0.9, 0.7)))

# ------------------------------------------------------------------ the top ball: the piglet's head
B.add('b3', ball('pink', Z3, region='pink', seed=3))
SN = V3(0, -BR + 0.5, Z3 - 1.0)
snout = tk.lathe('snout', [(0, 0), (1.9, 0), (2.0, -0.7), (1.8, -1.4), (0, -1.55)], n=12, axis='Y', centre=tuple(SN))
tk.scale(snout, (1.0, 1.0, 0.78), pivot=tuple(SN))
HP = [low(snout, 'snout', 30, lo=1, hi=3, region='snout')]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 3.2, -0.2, Z3 + BR * SQ - 0.6), (sx * 6.0, -2.2, Z3 + 2.6), 3.9, th=0.9, region='pink', tris=16, cup=(sx * 0.2, -0.5, -1)))
FL = V3(3.4, -0.4, Z3 + 4.2)
for i in range(5):                                         # a cherry blossom tucked behind the right ear
    a = 2 * math.pi * i / 5
    HP.append(blob('petal', FL + (1.0 * math.cos(a), 0.3 * math.sin(a), 1.0 * math.sin(a)), 0.85, tris=10, region='blossom', squash=(1.0, 0.45, 1.0)))
HP.append(blob('heart', FL + (0, -0.35, 0), 0.4, tris=8, region='hoof'))
B.add('b3', *HP)
B.commit(F)


def make_rig():
    return spin_rig(F)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_stand(P, pt, sh)
    mochi_fill(P, pt, sh, 'pink', '#f2a6b6')
    mochi_fill(P, pt, sh, 'white', '#f6f2ea')
    mochi_fill(P, pt, sh, 'green', '#8cb85a')
    mochi_fill(P, pt, sh, 'pinkish', '#eaa0ae')
    mochi_fill(P, pt, sh, 'snout', '#ee98aa', base=0.25)
    P.fill('hoof', pt.ramp('#7a5a52', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('blossom', pt.ramp('#fbd6de', 6, shift=0.03), tone=sh, base=0.25)
    sn = P.region('snout') & (P.on[:, :, 1] < -0.7)
    for sx in (1, -1):
        P.flat(sn & (np.hypot((X - sx * 0.6) / 0.32, (Z - SN[2]) / 0.5) < 1), '#7a3a48')       # nostrils
    P.shift(P.region('pink') & (P.on[:, :, 1] < -0.3) & (P.on[:, :, 2] < 0.2) & (np.abs(X) > 2.8), 1)
    fc = face.Face(P, c=(0, -BR + 0.2, Z3 + 1.4), axis=(0, -1, 0.15), where=P.region('pink'), seed=5101)
    fc.eyes('dot', spread=5.0, size=0.5, dy=0.4)
    fc.blush(6.6, -1.6, rx=1.0, ry=0.55)
    fc2 = face.Face(P, c=(0, -BR + 0.6, Z3 - 2.9), axis=(0, -1, -0.2), where=P.region('pink'), seed=5102)
    fc2.mouth('smug', w=1.6, dy=0.0, weight=0.2)
    P.lines(['pink', 'white', 'green', 'wood'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=60, fold=(0, 10, 22, 38), skip=[('b1', 'bed'), ('b2', 'bed'), ('b3', 'bed'), ('b1', 'b2'), ('b2', 'b3')],
    cams=[((40, -54, 34), (0, 0, 16)), ((-40, 50, 30), (0, 2, 16))])
