"""いそべペンギン Nori-Wrapped Penguin (series dango, Dango Skewer Pals, concepts_F.md): isobe dango, toasted white
balls each wrapped in a strip of nori, and the nori is the penguin's black coat: wrapped round the back and over the
top ball like a hood, leaving the white face and front; a yellow-orange beak, two nori flippers on the middle ball, two
orange feet on the block from the bottom ball and a little tail behind.
Gimmick: the balls spin round the skewer and the head pops up off the tip and back.

    tools/blender.sh art/blender/toys/dango/isobe.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kushi import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('dango', 'isobe')
B = Build()
stand(B)
skewer(B)

# ------------------------------------------------------------------ the bottom ball: nori round the back, the feet, the tail
B.add('b1', ball('ball1', Z1, region='rice', seed=10), wrap('nori1', Z1, -35, 215, 3.4))
for sx in (1, -1):
    B.add('b1', low(tk.loft('foot', [dict(c=(sx * 2.2, -3.0, TZ + 0.6), w=2.4, h=0.5), dict(c=(sx * 2.5, -5.4, TZ + 0.5), w=3.2, h=0.45),
                                     dict(c=(sx * 2.7, -7.0, TZ + 0.45), w=2.6, h=0.35)], n=8, up=(0, 0, 1), cap0='round', cap1='round'),
                    'foot', 22, lo=1, hi=3, region='orange', sculpt=lambda h: tk.push(h, lambda V, N: -0.1 * (np.abs(np.mod(V[:, 0] * 1.4, 1.0) - 0.5) < 0.1))))
B.add('b1', limb('tail', [(0, BR - 0.6, Z1 - 2.2), (0, BR + 1.6, Z1 - 3.4)], [1.5, 0.4], tris=12, region='nori', n=6, cap1='point'))

# ------------------------------------------------------------------ the middle ball: the nori coat, two flippers
B.add('b2', ball('ball2', Z2, region='rice', seed=11), wrap('nori2', Z2, -40, 220, 3.6))
for sx in (1, -1):
    fl = tk.loft('flipper', [dict(c=(sx * (BR - 0.2), 0.4, Z2 + 1.8), w=2.6, h=0.55), dict(c=(sx * (BR + 1.4), -0.4, Z2 - 0.8), w=2.8, h=0.45),
                             dict(c=(sx * (BR + 1.6), -0.8, Z2 - 3.4), w=1.4, h=0.3)], n=8, up=(sx, 0, 0.3), cap0='round', cap1='round')
    B.add('b2', low(fl, 'flipper', 22, lo=1, hi=3, region='nori'))

# ------------------------------------------------------------------ the top ball: the nori hood, the beak
B.add('b3', ball('ball3', Z3, region='rice', seed=12), wrap('nori3', Z3, -20, 200, 3.4, dz=1.4))
BK = V3(0, -BR - 0.2, Z3 - 0.6)
beak = tk.loft('beak', [dict(c=tuple(BK + (0, 1.2, 0)), w=3.2, h=1.2), dict(c=tuple(BK + (0, -0.6, -0.1)), w=2.2, h=0.85),
                        dict(c=tuple(BK + (0, -2.0, -0.3)), w=0.6, h=0.3)], n=8, up=(0, 0, 1), cap0='round', cap1='point')
B.add('b3', low(beak, 'beak', 26, lo=1, hi=3, region='orange', sculpt=lambda h: tk.push(h, lambda V, N: -0.1 * (np.abs(V[:, 2] - BK[2] + 0.1) < 0.1))))
B.commit(F)


def make_rig():
    return spin_rig(F)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_stand(P, pt, sh)
    mochi_fill(P, pt, sh, 'rice', '#f4eee0')
    toast = P.region('rice') & (np.sin(X * 1.6 + Z * 1.2) * np.sin(Yc * 1.4 - Z * 0.9) > 0.72)
    P.tint(toast, pt.ramp('#d8a060', 6, shift=0.05), sh)                                       # toasted spots
    P.fill('nori', pt.ramp('#1e2a24', 6, shift=0.05, light=0.5), tone=sh, base=0.1, brush={'preset': 'cloth', 'flow': 'along', 'axis': (0, 0, 1), 'L': 4})
    P.shift(P.region('nori') & (np.abs(np.mod(Z * 1.6 + X * 0.6, 1.0) - 0.5) < 0.07), 1)       # the sheet's fibres
    P.fill('orange', pt.ramp('#f0a030', 6, shift=0.06), tone=sh, base=0.15)
    fc = face.Face(P, c=(0, -BR + 0.2, Z3 + 0.9), axis=(0, -1, 0.15), where=P.region('rice'), seed=5401)
    fc.eyes('dot', spread=4.4, size=0.55, dy=0.3)
    fc.blush(6.0, -1.4, rx=0.9, ry=0.5)
    P.lines(['rice', 'nori', 'orange', 'wood'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=60, fold=(0, 10, 22, 38), skip=[('b1', 'bed'), ('b2', 'bed'), ('b3', 'bed'), ('b1', 'b2'), ('b2', 'b3')],
    cams=[((40, -54, 34), (0, 0, 16)), ((-40, 50, 30), (0, 2, 16))])
