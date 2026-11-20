"""みたらしタヌキ Mitarashi Tanuki (series dango, Dango Skewer Pals, concepts_F.md): three grilled mitarashi dango
glazed in sweet soy syrup, the glaze running down their sides, scorched where the grill touched: the top ball a tanuki's
head (round ears, a pale muzzle, the dark mask painted round its eyes, a leaf on its head for its tricks), the middle
its round drum belly with two paws patting it, the bottom its stubby feet and its fat ringed tail behind.
Gimmick: spin, spin, spin, and the head hops off the tip and back.

    tools/blender.sh art/blender/toys/dango/mitarashi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kushi import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('dango', 'mitarashi')
B = Build()
stand(B)
skewer(B)
glaze = lambda C, N: N[:, 2] > 0.25  # noqa: E731  (the syrup sits on the upper half of each ball)

# ------------------------------------------------------------------ the bottom ball: stubby feet, the ringed tail
B.add('b1', ball('ball1', Z1, region=('mochi', [('glaze', glaze)]), seed=4), *drips('drip', Z1, BR, 5, 'glaze', seed=1))
for sx in (1, -1):
    B.add('b1', blob('foot', (sx * 2.3, -3.8, TZ + 1.2), 1.9, tris=16, region='fur', squash=(1.0, 1.5, 0.7)))
B.add('b1', limb('tail', [(0.0, BR - 0.8, Z1 - 0.6), (0.4, BR + 2.0, Z1 - 1.4), (1.6, BR + 4.0, Z1 + 0.4), (1.8, BR + 4.2, Z1 + 3.6)], [1.6, 2.2, 2.3, 1.4],
                 tris=40, region='tail', n=8, cap1='round'))

# ------------------------------------------------------------------ the middle ball: the drum belly, paws patting it
B.add('b2', ball('ball2', Z2, region=('mochi', [('glaze', glaze)]), seed=5), *drips('drip', Z2, BR, 5, 'glaze', seed=2, start=0.6))
for sx in (1, -1):
    B.add('b2', limb('arm', [(sx * BR * 0.86, 0.2, Z2 + 1.8), (sx * (BR + 0.8), -2.0, Z2 + 0.6), (sx * 2.6, -BR - 0.2, Z2 - 0.4)], [1.25, 1.1, 1.0], tris=20,
                     region='fur', n=8),
          blob('paw', (sx * 2.2, -BR - 0.5, Z2 - 0.5), 1.05, tris=12, region='fur'))

# ------------------------------------------------------------------ the top ball: the tanuki's head
B.add('b3', ball('ball3', Z3, region=('mochi', [('glaze', glaze)]), seed=6), *drips('drip', Z3, BR, 4, 'glaze', seed=3, start=0.3))
HP = [blob('muzzle', (0, -BR + 0.5, Z3 - 1.5), 2.1, tris=26, region='cream', squash=(1.2, 0.85, 0.85)),
      blob('nose', (0, -BR - 1.15, Z3 - 1.0), 0.65, tris=10, region='ink', squash=(1.2, 0.8, 0.8))]
for sx in (1, -1):
    HP.append(blob('ear', (sx * 3.6, 0.2, Z3 + BR * SQ - 0.4), 1.6, tris=14, region='fur', squash=(1.0, 0.55, 0.95)))
leaf = tk.loft('leaf', [dict(c=(0, 2.4, Z3 + BR * SQ + 0.1), w=0.6, h=0.12), dict(c=(0, 0.0, Z3 + BR * SQ + 0.8), w=3.6, h=0.2),
                        dict(c=(0, -2.6, Z3 + BR * SQ + 0.3), w=0.4, h=0.1)], n=8, up=(0, 0, 1), cap0='round', cap1='point')
tk.rotate(leaf, 30, 'Z', pivot=(0, 0, 0))
HP.append(low(leaf, 'leaf', 20, lo=1, hi=3, region='leaf', sculpt=lambda h: tk.push(h, lambda V, N: -0.08 * (np.abs(V[:, 0] * 0.866 + V[:, 1] * 0.5) < 0.12))))
B.add('b3', *HP)
B.commit(F, kinds={'b1': 'gloss', 'b2': 'gloss', 'b3': 'gloss'})


def make_rig():
    return spin_rig(F)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_stand(P, pt, sh)
    mochi_fill(P, pt, sh, 'mochi', '#e2c08a')
    P.fill('glaze', pt.ramp('#a86224', 7, shift=0.07, light=0.55), tone=sh, base=0.2, brush={'preset': 'gloss', 'flow': 'down'})
    g = P.region('glaze') | P.region('mochi')
    grill = np.abs(np.mod(np.arctan2(Yc, X) * 4.0 / np.pi, 1.0) - 0.5) < 0.09                  # where the grill bars touched: lines down each ball
    scorch = g & grill & (np.abs(P.on[:, :, 2]) < 0.6)
    P.tint(scorch, pt.ramp('#7a4420', 6, shift=0.05), sh)                                   # grill scorch marks
    P.fill('fur', pt.ramp('#8a6440', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('cream', pt.ramp('#f0e0c0', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill('ink', pt.ramp('#1e1a1c', 5, light=0.5), tone=sh, base=0.3, brush='gloss')
    P.fill('tail', pt.ramp('#8a6440', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.tint(P.region('tail') & (np.abs(np.mod(Z * 0.7 + Yc * 0.5, 2.2) - 1.1) < 0.4), pt.ramp('#3a2a20', 6), sh)     # the ringed tail
    P.fill('leaf', pt.ramp('#5a9a3a', 6, shift=0.06), tone=sh, base=0.15)
    fc = face.Face(P, c=(0, -BR + 0.1, Z3 + 1.0), axis=(0, -1, 0.15), where=P.region('glaze') | P.region('mochi'), seed=5201)
    fc.eyes('dot', spread=4.6, size=0.55, dy=0.4)
    fc.blush(6.4, -1.2, rx=0.9, ry=0.5)
    fc2 = face.Face(P, c=(0, -BR - 0.9, Z3 - 2.0), axis=(0, -1, 0.0), where=P.region('cream'), seed=5202)
    fc2.mouth('w', w=1.4, dy=0.0, weight=0.2)
    P.lines(['glaze', 'mochi', 'wood'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=60, fold=(0, 10, 22, 38), skip=[('b1', 'bed'), ('b2', 'bed'), ('b3', 'bed'), ('b1', 'b2'), ('b2', 'b3')],
    cams=[((40, -54, 34), (0, 0, 16)), ((-40, 50, 30), (0, 2, 16))])
