"""きなこグマ Kinako Bear Cub (series dango, Dango Skewer Pals, concepts_F.md): soft dango rolled in kinako, roasted
soybean flour, so the bear cub is dusted all over: round ears, a pale muzzle and a little nose on the top ball, with
dark kuromitsu (brown-sugar syrup) poured over its head and running down like honey; its arms hugging its tummy on the
middle ball; round-padded feet out in front and a stub of a tail on the bottom one.
Gimmick: spin, spin, spin, and the head hops.

    tools/blender.sh art/blender/toys/dango/kinako.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kushi import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('dango', 'kinako')
B = Build()
stand(B)
skewer(B)
dust = lambda h: tk.push(h, lambda V, N: 0.05 * np.sin(V[:, 0] * 9.0 + V[:, 2] * 7.0) * np.sin(V[:, 1] * 8.0))  # noqa: E731  (the powder's grain)

# ------------------------------------------------------------------ the bottom ball: padded feet, the stub tail
B.add('b1', ball('ball1', Z1, region='kinako', seed=13, sculpt=dust))
for sx in (1, -1):
    B.add('b1', blob('foot', (sx * 2.5, -3.6, TZ + 1.6), 2.0, tris=18, region='kinako', squash=(1.0, 1.25, 0.85)))
B.add('b1', blob('tail', (0, BR - 0.2, Z1 - 0.4), 1.3, tris=12, region='kinako'))

# ------------------------------------------------------------------ the middle ball: arms hugging the tummy
B.add('b2', ball('ball2', Z2, region='kinako', seed=14, sculpt=dust))
for sx in (1, -1):
    B.add('b2', limb('arm', [(sx * BR * 0.85, 0.6, Z2 + 2.0), (sx * (BR + 0.9), -1.6, Z2 + 0.6), (sx * 3.6, -BR + 0.1, Z2 - 0.8), (sx * 1.2, -BR - 0.5, Z2 - 1.2)],
                     [1.5, 1.4, 1.25, 1.1], tris=26, region='kinako', n=8),
          blob('paw', (sx * 0.9, -BR - 0.6, Z2 - 1.2), 1.2, tris=12, region='kinako'))

# ------------------------------------------------------------------ the top ball: ears, muzzle, the syrup poured over it
B.add('b3', ball('ball3', Z3, region=('kinako', [('syrup', lambda C, N: (N[:, 2] > 0.62))]), seed=15, sculpt=dust),
      *drips('drip', Z3, BR, 6, 'syrup', seed=7, length=3.0, wid=0.9))
HP = [blob('muzzle', (0, -BR + 0.6, Z3 - 1.3), 2.0, tris=24, region='pale', squash=(1.15, 0.8, 0.85)),
      blob('nose', (0, -BR - 0.95, Z3 - 0.7), 0.6, tris=10, region='ink', squash=(1.3, 0.8, 0.8))]
for sx in (1, -1):
    HP.append(blob('ear', (sx * 3.9, 0.4, Z3 + BR * SQ - 1.0), 1.75, tris=16, region='kinako', squash=(1.0, 0.6, 1.0)))
B.add('b3', *HP)
B.commit(F, kinds={'b3': 'gloss'})


def make_rig():
    return spin_rig(F)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_stand(P, pt, sh)
    kin = P.region('kinako')
    who, d = P.dabs(kin, size=0.35, spacing=0.55, seed=29)
    P.fill('kinako', pt.ramp('#d6ac68', 7, shift=0.06), tone=sh, base=np.where(who >= 0, 0.35 - 0.7 * np.clip(d, 0, 1), 0.0), brush='fur')   # the dusted powder
    P.fill('pale', pt.ramp('#f0dcb4', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill('syrup', pt.ramp('#3a1e14', 7, shift=0.06, light=0.6), tone=sh, base=0.25, brush={'preset': 'gloss', 'flow': 'down'})
    P.fill('ink', pt.ramp('#1e1a1c', 5, light=0.5), tone=sh, base=0.3, brush='gloss')
    P.fill(kin & (Z > Z3 + 3.0) & (P.on[:, :, 1] < -0.6) & (np.abs(X) > 2.8), pt.ramp('#e8b0a0', 6), tone=sh, base=0.1)   # inner ears
    fc = face.Face(P, c=(0, -BR + 0.3, Z3 + 1.1), axis=(0, -1, 0.15), where=kin, seed=5501)
    fc.eyes('dot', spread=4.4, size=0.55, dy=0.3)
    fc.blush(6.2, -1.4, rx=0.9, ry=0.5)
    fc2 = face.Face(P, c=(0, -BR - 0.6, Z3 - 1.9), axis=(0, -1, -0.1), where=P.region('pale'), seed=5502)
    fc2.mouth('w', w=1.3, dy=0.0, weight=0.2)
    P.lines(['kinako', 'syrup', 'wood'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=60, fold=(0, 10, 22, 38), skip=[('b1', 'bed'), ('b2', 'bed'), ('b3', 'bed'), ('b1', 'b2'), ('b2', 'b3')],
    cams=[((40, -54, 34), (0, 0, 16)), ((-40, 50, 30), (0, 2, 16))])
