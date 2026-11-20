"""サーモンアザラシ Salmon-Duvet Seal Pup (series nedoko, Sushi Bedtime, concepts_F.md): a fluffy white harp seal pup,
round headed, black-eyed and whiskery, asleep on a rice futon under an orange salmon duvet with its broad white fat
stripes; its front flippers out on the rice in front of it, its two hind flippers sticking out of the foot end. A red
kaiten plate.
Gimmick: the salmon flips back, the pup heaves up on its flippers, a big seal yawn, and back down to sleep.

    tools/blender.sh art/blender/toys/nedoko/sake.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _futon import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('nedoko', 'sake')
B = Build()
plate(B)
rice_bed(B, L=23.6, W=12.8, seed=7)

# ------------------------------------------------------------------ the pup: a long plump loaf, flat flippers, a round head
BZ = RZ - 0.5
B.add('body', loaf('body', -2.4, 10.0, 9.0, 4.2, BZ, region='fur', sculpt=lambda h: tk.push(h, lambda V, N: 0.12 * np.sin(V[:, 0] * 3.0) * np.sin(V[:, 1] * 2.6))))


def flipper(name, root, tip, w, region='fur', tris=20, up=(0, 0, 1)):
    r, t = np.asarray(root, float), np.asarray(tip, float)
    o = tk.loft(name, [dict(c=tuple(r), w=w * 0.7, h=0.6), dict(c=tuple(r + (t - r) * 0.55), w=w, h=0.45), dict(c=tuple(t), w=w * 0.75, h=0.3)],
                n=8, up=up, cap0='round', cap1='round')
    return low(o, name, tris, lo=1, hi=3, region=region,  # (the digit ridges)
               sculpt=lambda h: tk.push(h, lambda V, N: -0.08 * (np.abs(np.mod(V[:, 0] * 2.4, 1.0) - 0.5) < 0.1)))


for sx in (1, -1):
    B.add('body', flipper('fflip', (sx * 3.4, -3.0, RZ + 0.6), (sx * 4.6, -7.6, RZ + 0.25), 2.6))           # the fore flippers on the rice
    B.add('body', flipper('hflip', (sx * 0.9, 11.6, RZ + 0.6), (sx * 3.0, 15.0, PZ + 2.4), 2.8, up=(0, -0.5, 1)))   # hind flippers out of the foot end
HC = V3(0, -5.4, RZ + 4.6)
HP = [head('head', HC, 9.8, 7.0, 7.8, snout=0.1, region='fur', rules=[('muzzle', lambda C, N: (C[:, 1] < HC[1] - 3.4) & (C[:, 2] < HC[2] - 0.6))])]
for sx in (1, -1):
    HP.append(blob('jowl', HC + (sx * 1.0, -3.5, -1.3), 1.2, tris=14, region='muzzle', squash=(1.0, 0.8, 0.8)))      # whisker pads
B.add('head', *HP)

# ------------------------------------------------------------------ the salmon duvet
B.add('neta', duvet('neta', -3.4, 13.4, 14.8, RZ + 5.6, RZ - 1.8, 'salmon', th=1.3, tris=130, curl=0.9, foot=RZ + 3.0,
                    sculpt=lambda h: tk.push(h, lambda V, N: -0.12 * (np.abs(np.mod(V[:, 1] * 0.7 - V[:, 0] * 0.45, 2.6) - 1.3) < 0.2) * (N[:, 2] > 0.2))))
B.commit(F, kinds={'bed': 'gloss', 'neta': 'gloss'})


def make_rig():
    return wake_rig(F, (0, 8.0, BZ + 1.2), (0, -3.6, RZ + 2.4), (0, 13.4, RZ + 4.0), sit=-30, look=20)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_bed(P, pt, sh, 'red', seed=7)
    P.fill('salmon', pt.ramp('#f07a40', 7, shift=0.06, light=0.5), tone=sh, base=0.1, brush={'preset': 'gloss', 'flow': 'along', 'axis': (-0.5, 0.8, 0), 'L': 6})
    sal = P.region('salmon')
    fat = np.abs(np.mod(Yc * 0.7 - X * 0.45, 2.6) - 1.3) < 0.36
    P.tint(sal & fat & (P.on[:, :, 2] > -0.3), pt.ramp('#f8d8c0', 6, shift=0.03), sh)                    # the white fat stripes
    P.shift(sal & (P.on[:, :, 2] < -0.3), -1)
    P.fill('fur', pt.ramp('#f2f0ea', 7, shift=0.04, dark=0.5), tone=sh, base=0.25, brush='fur')
    P.fill('muzzle', pt.ramp('#ebe6dc', 6, shift=0.03), tone=sh, base=0.2, brush='fur')
    P.shift(P.region('fur') & (Yc > 11.4) & (Z < RZ + 1.4), -1)                                          # the hind flippers a shade greyer
    fc = face.Face(P, c=tuple(HC + (0, -3.9, 0.0)), axis=(0, -1, 0.12), where=P.region('fur') | P.region('muzzle'), seed=4301)
    fc.eyes('sleepy', spread=4.4, size=0.6, dy=0.9)
    fc.nose('tri', dy=-0.6, size=0.5)
    fc.mouth('w', w=1.4, dy=-1.4, weight=0.2)
    fc.whiskers(dy=-0.9, spread=2.4, n=3, length=2.4, dots=True)
    fc.blush(5.2, -0.6, rx=0.9, ry=0.5)
    P.lines(['salmon', 'fur'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=64, fold=(0, 14, 24, 40), skip=[('neta', 'bed'), ('body', 'bed'), ('head', 'body'), ('neta', 'body'), ('head', 'bed')],
    cams=[((34, -44, 30), (0, 0, 7)), ((-34, 40, 26), (0, 2, 7))])
