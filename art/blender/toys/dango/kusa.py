"""よもぎガエル Mugwort Frog (series dango, Dango Skewer Pals, concepts_F.md): three deep green mugwort (yomogi)
dango, flecked with the leaf: the top ball a frog's head, its eyes up on top in two bulges, a wide flat mouth, and a
dollop of sweet red bean paste sat on its head like a hat; webbed hands spread on the middle ball; the bottom ball
its folded frog legs, the big webbed feet flat on the block.
Gimmick: spin, spin, spin, then a big frog hop off the skewer tip and back.

    tools/blender.sh art/blender/toys/dango/kusa.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kushi import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('dango', 'kusa')
B = Build()
stand(B)
skewer(B)
belly = lambda C, N: (N[:, 1] < -0.55) & (N[:, 2] < 0.35)  # noqa: E731  (the pale throat / belly patch)

# ------------------------------------------------------------------ the bottom ball: folded legs, webbed feet
B.add('b1', ball('ball1', Z1, region=('green', [('pale', belly)]), seed=7))
for sx in (1, -1):
    B.add('b1', limb('thigh', [(sx * BR * 0.7, 1.0, Z1 - 0.4), (sx * (BR + 1.4), -0.8, Z1 + 0.6), (sx * (BR + 0.6), -3.2, Z1 - 2.0), (sx * 3.4, -4.6, TZ + 0.9)],
                     [1.8, 1.9, 1.3, 0.9], tris=36, region='green', n=8),
          *hand('foot', (sx * 3.4, -4.6, TZ + 0.7), (sx * 0.25, -1, 0), r=1.0, kind='open', region='green', up=(0, 0, 1), tris=22))

# ------------------------------------------------------------------ the middle ball: webbed hands spread on the front
B.add('b2', ball('ball2', Z2, region=('green', [('pale', belly)]), seed=8))
for sx in (1, -1):
    B.add('b2', limb('arm', [(sx * BR * 0.85, -0.4, Z2 + 1.6), (sx * (BR + 0.9), -2.4, Z2 + 0.2), (sx * 3.4, -BR + 0.2, Z2 - 1.2)], [1.15, 1.0, 0.85], tris=18,
                     region='green', n=8),
          *hand('hand', (sx * 3.4, -BR + 0.2, Z2 - 1.2), (-sx * 0.5, -1, -0.3), r=0.85, kind='open', region='green', up=(0, -0.3, 1), tris=20))

# ------------------------------------------------------------------ the top ball: the eye bulges, the bean-paste hat
B.add('b3', ball('ball3', Z3, region=('green', [('pale', belly)]), seed=9, squash=(1.1, 1.0)))
EY = [V3(sx * 2.7, -2.4, Z3 + BR * SQ - 0.9) for sx in (1, -1)]
HP = [blob('bulge', p, 1.9, tris=20, region='green', squash=(1.0, 0.95, 0.9)) for p in EY]
ANKO = V3(0, 1.0, Z3 + BR * SQ + 0.6)
anko = tk.lathe('anko', [(0, -0.9), (2.4, -0.7), (2.9, 0.2), (2.2, 1.2), (1.2, 2.0), (0, 2.4)], n=12, centre=tuple(ANKO))
HP.append(low(anko, 'anko', 50, lo=1, hi=3, region='anko',
              sculpt=lambda h: tk.push(h, lambda V, N: 0.22 * np.clip(np.sin(V[:, 0] * 3.3) * np.sin(V[:, 1] * 3.1 + 1) * np.sin(V[:, 2] * 3.7) * 3, -0.3, 1))))
B.add('b3', *HP)
B.commit(F, kinds={'b3': 'matte'})


def make_rig():
    return spin_rig(F, hop=9.0)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_stand(P, pt, sh)
    mochi_fill(P, pt, sh, 'green', '#5e8c3c')
    mochi_fill(P, pt, sh, 'pale', '#a4c27a')
    leafy = (P.region('green') | P.region('pale')) & (np.sin(X * 4.1 + Z * 2.3) * np.sin(Yc * 3.7 - Z * 3.1) > 0.8)
    P.tint(leafy, pt.ramp('#2e5a22', 6, shift=0.05), sh)                                     # flecks of mugwort leaf
    who, d = P.dabs(P.region('anko'), size=0.7, spacing=0.8, seed=19)
    P.fill('anko', pt.ramp('#5a2228', 7, shift=0.06, light=0.5), tone=sh, base=np.where(who >= 0, 0.3 - 0.6 * np.clip(d, 0, 1), -0.2), brush='gloss')  # whole beans
    for i, p in enumerate(EY):
        fe = face.Face(P, c=tuple(p + (0, -1.6, 0.2)), axis=(0, -1, 0.25), where=P.region('green'), seed=5301 + i)
        fe.dot(0, 0, 0.75)                                                                    # an eye on its own knob: the species' eye
    fc = face.Face(P, c=(0, -BR + 0.2, Z3 - 0.4), axis=(0, -1, 0.0), where=P.region('green') | P.region('pale'), seed=5303)
    fc.mouth('long', w=5.6, dy=0.0, weight=0.24)
    fc.blush(6.4, 0.6, rx=0.9, ry=0.5)
    P.lines(['green', 'pale', 'anko', 'wood'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=60, fold=(0, 10, 22, 38), skip=[('b1', 'bed'), ('b2', 'bed'), ('b3', 'bed'), ('b1', 'b2'), ('b2', 'b3')],
    cams=[((40, -54, 34), (0, 0, 16)), ((-40, 50, 30), (0, 2, 16))])
