"""マグロねこ Tuna-Duvet Kitten (series nedoko, Sushi Bedtime, concepts_F.md): an orange tabby kitten asleep on a
rice futon under a thick red tuna duvet with its pale sinew lines, only its head, ears and two white front paws out at
the top, its striped tail hanging out of the foot end; a white kaiten plate with a blue rim.
Gimmick: the duvet flips back, the kitten sits up, yawns and looks about, flops back down, the duvet falls back.

    tools/blender.sh art/blender/toys/nedoko/maguro.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _futon import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('nedoko', 'maguro')
B = Build()
plate(B)
rice_bed(B, seed=3)

# ------------------------------------------------------------------ the kitten: a loaf under the duvet, the head and paws out
BZ = RZ - 0.4
B.add('body', loaf('body', -2.6, 9.6, 8.6, 4.2, BZ, region='fur'))
B.add('body', limb('tail', [(0.4, 9.6, BZ + 1.6), (1.0, 12.4, BZ + 0.9), (2.6, 13.8, PZ + 2.6), (4.8, 13.6, PZ + 0.9), (6.6, 12.2, PZ + 0.7)],
                   [1.0, 0.95, 0.9, 0.85, 0.7], tris=40, region='fur', n=7))
for sx in (1, -1):
    B.add('body', paw('paw', (sx * 2.3, -5.6, RZ + 0.55), d=(sx * 0.12, -1, 0), r=1.25, region='white'))
HC = V3(0, -5.6, RZ + 4.0)
mz = lambda C, N: (C[:, 1] < HC[1] - 2.0) & (C[:, 2] < HC[2] - 0.4) & (np.abs(C[:, 0]) < 2.4)  # noqa: E731
HP = [head('head', HC, 8.8, 6.8, 7.0, snout=0.3, region='fur', rules=[('white', mz)])]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 2.6, -5.3, RZ + 6.6), (sx * 4.0, -5.1, RZ + 10.2), 3.1, th=0.9, region='ear', tris=16, cup=(sx * 0.3, -1, 0)))
B.add('head', *HP)

# ------------------------------------------------------------------ the tuna duvet: a thick slice draped over it, its lip turned up
B.add('neta', duvet('neta', -3.4, 12.8, 14.4, RZ + 5.5, RZ - 1.8, 'tuna', th=1.3, tris=130, curl=0.8, foot=RZ + 2.6,
                    sculpt=lambda h: tk.push(h, lambda V, N: 0.1 * np.sin(V[:, 0] * 0.9 + V[:, 1] * 1.4) * (N[:, 2] > 0.3))))
B.commit(F, kinds={'bed': 'gloss', 'neta': 'gloss'})


def make_rig():
    return wake_rig(F, (0, 7.6, BZ + 1.2), (0, -3.6, RZ + 2.4), (0, 12.8, RZ + 4.0))


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_bed(P, pt, sh, 'white', seed=3)
    TUNA = pt.ramp('#b8263a', 7, shift=0.06, light=0.5)
    P.fill('tuna', TUNA, tone=sh, base=0.05, brush={'preset': 'gloss', 'flow': 'along', 'axis': (1, 0.6, 0), 'L': 6})
    tuna = P.region('tuna')
    sinew = np.abs(np.mod(X * 0.55 + Yc * 0.8 + 0.6 * np.sin(X * 0.7), 3.4) - 1.7) < 0.16
    P.tint(tuna & sinew & (P.on[:, :, 2] > -0.2), pt.ramp('#e88a90', 6), sh)                         # the pale sinew lines
    P.shift(tuna & (P.on[:, :, 2] < -0.3), -1)
    FUR = pt.ramp('#d88a3e', 7, shift=0.06)
    P.fill('fur', FUR, tone=sh, base=0.1, brush='fur')
    fur = P.region('fur')
    stripe = np.abs(np.mod(Yc * 0.9 + 0.35 * np.abs(X) + 0.3 * np.sin(Z), 2.6) - 1.3) < 0.32
    P.tint(fur & stripe & (Z > RZ + 1.2), pt.ramp('#9a4e22', 6, shift=0.05), sh)                       # tabby stripes
    P.tint(fur & (np.abs(np.mod(np.arctan2(Yc - 13.0, X - 3.0) * 3.0, 1.0) - 0.5) < 0.16) & (Yc > 11.0), pt.ramp('#9a4e22', 6), sh)  # tail rings
    P.tint(fur & (Yc < HC[1]) & (Z > HC[2] + 1.4) & (np.abs(np.mod(X, 1.2) - 0.6) < 0.2), pt.ramp('#9a4e22', 6), sh)   # the forehead "M"
    P.fill('white', pt.ramp('#f4efe6', 6, shift=0.03), tone=sh, base=0.2, brush='fur')
    P.fill('ear', FUR, tone=sh, base=0.1, brush='fur')
    P.fill(P.region('ear') & (P.on[:, :, 1] < -0.5), pt.ramp('#f0a8a8', 6), tone=sh, base=0.15)
    fc = face.Face(P, c=tuple(HC + (0, -3.7, -0.4)), axis=(0, -1, 0.12), where=fur | P.region('white'), seed=4101)
    fc.eyes('sleepy', spread=3.6, size=0.5, dy=0.7)
    fc.mouth('w', w=1.4, dy=-1.2, weight=0.2)
    fc.blush(4.6, -0.6, rx=0.8, ry=0.45)
    P.lines(['tuna', 'fur', 'white'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=64, fold=(0, 14, 24, 40), skip=[('neta', 'bed'), ('body', 'bed'), ('head', 'body'), ('neta', 'body'), ('head', 'bed')],
    cams=[((34, -44, 30), (0, 0, 7)), ((-34, 40, 26), (0, 2, 7))])
