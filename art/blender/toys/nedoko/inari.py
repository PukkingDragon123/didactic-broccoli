"""いなりキツネ Tofu-Pouch Fox (series nedoko, Sushi Bedtime, concepts_F.md): an inari fox, of course, zipped into an
inari-zushi like a sleeping bag: the sweet fried-tofu pouch with its pebbly golden skin (rice showing at its open
end), the fox's head and black-socked paws out of the top, its big white-tipped tail out of the side and curled round
the front of the bed. A yellow kaiten plate.
Gimmick: the pouch's top flap opens, the fox sits up and looks about, then tucks back in.

    tools/blender.sh art/blender/toys/nedoko/inari.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _futon import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('nedoko', 'inari')
B = Build()
plate(B)
L_, H_ = 22.0, 5.0
TZ = PZ + H_                    # the pouch's lower half: its top (the fox lies on it)
Y0 = RY - L_ / 2
rice_bed(B, L=L_, W=13.0, H=H_, seed=9,
         region=('tofu', [('rice', lambda C, N: (C[:, 1] < Y0 + 1.6) & (N[:, 1] < -0.55) & (C[:, 2] > PZ + 1.4) & (np.abs(C[:, 0]) < 5.4))]),
         tris=160)

# ------------------------------------------------------------------ the fox: a slim loaf in the pouch, the head out, the tail out of the side
BZ = TZ - 0.4
B.add('body', loaf('body', -2.4, 9.4, 8.2, 4.0, BZ, region='fur'))
for sx in (1, -1):
    B.add('body', paw('paw', (sx * 2.0, -6.2, TZ + 0.5), d=(sx * 0.1, -1, 0), r=1.15, region='sock'))
tail = [(4.6, 8.0, TZ + 1.2), (7.4, 9.0, PZ + 3.6), (9.6, 5.6, PZ + 3.0), (10.2, 0.6, PZ + 3.0), (9.0, -4.4, PZ + 3.2), (7.2, -7.2, PZ + 3.6)]
B.add('body', limb('tail', tail, [1.4, 2.0, 2.5, 2.6, 2.2, 1.0], tris=70, region=('fur', [('white', lambda C, N: C[:, 1] < -4.0)]), n=9,
                   sculpt=lambda h: tk.push(h, lambda V, N: 0.16 * np.sin(V[:, 1] * 2.2 + V[:, 2] * 1.4) * np.sin(V[:, 0] * 1.9))))
HC = V3(0, -5.2, TZ + 4.4)
mz = lambda C, N: (C[:, 1] < HC[1] - 2.4) & (C[:, 2] < HC[2] - 0.3)  # noqa: E731
HP = [head('head', HC, 8.6, 6.6, 6.8, snout=1.8, region='fur', rules=[('white', mz)])]
for sx in (1, -1):
    HP.append(ear('ear', HC + (sx * 2.5, 0.4, 2.4), HC + (sx * 4.0, 0.8, 7.6), 3.4, th=1.0, region='ear', tris=16, cup=(sx * 0.25, -1, 0)))
    HP.append(blob('ruff', HC + (sx * 3.8, -0.6, -1.8), 1.6, tris=12, region='white', squash=(0.8, 1.0, 1.1)))     # cheek ruffs
B.add('head', *HP)

# ------------------------------------------------------------------ the pouch's top flap: thick fried tofu, closed at the foot


def pebble(h):
    tk.push(h, lambda V, N: 0.14 * np.clip(np.sin(V[:, 0] * 2.7 + 1.1) * np.sin(V[:, 1] * 2.3) * np.sin(V[:, 2] * 2.9 + 0.4) * 2, -0.5, 1))


B.add('neta', duvet('neta', -3.2, 13.4, 14.6, TZ + 5.6, PZ + 1.4, 'tofu', th=1.6, tris=140, curl=1.4, arch=2.6, roll=4.6, sculpt=pebble))
B.commit(F, kinds={'bed': 'matte'})


def make_rig():
    return wake_rig(F, (0, 7.4, BZ + 1.2), (0, -3.4, TZ + 2.4), (0, 13.0, TZ + 2.0), sit=-34)


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_bed(P, pt, sh, 'yellow', seed=9)
    TOFU = pt.ramp('#c8862e', 7, shift=0.07, light=0.5)
    tofu = P.region('tofu')
    who, d = P.dabs(tofu, size=0.9, spacing=1.1, seed=11)
    P.fill('tofu', TOFU, tone=sh, base=np.where(who >= 0, 0.25 - 0.5 * np.clip(d, 0, 1), -0.2), brush={'preset': 'pvc', 'flow': 'around'})   # the pebbly fried skin
    P.shift(tofu & (who >= 0) & (d > 0.85), -1)
    P.fill('fur', pt.ramp('#e08a34', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    P.fill('white', pt.ramp('#f4eee2', 6, shift=0.03), tone=sh, base=0.2, brush='fur')
    P.fill('ear', pt.ramp('#e08a34', 7, shift=0.07), tone=sh, base=0.1, brush='fur')
    ear_ = P.region('ear')
    P.fill(ear_ & (P.on[:, :, 1] < -0.5), pt.ramp('#f2dcc4', 6), tone=sh, base=0.1)
    P.fill(ear_ & (Z > HC[2] + 6.0), pt.ramp('#2a2224', 5, light=0.5), tone=sh, base=0.1)                   # black ear tips
    P.fill('sock', pt.ramp('#2e2628', 6, light=0.5), tone=sh, base=0.15, brush='fur')
    fc = face.Face(P, c=tuple(HC + (0, -3.6, 0.6)), axis=(0, -1, 0.2), where=P.region('fur') | P.region('white'), seed=4401)
    fc.eyes('dot', spread=3.8, size=0.5, dy=0.6)
    fc.mouth('smug', w=1.4, dy=-1.6, weight=0.2)
    fc.blush(4.6, -0.6, rx=0.8, ry=0.45)
    P.lines(['tofu', 'fur', 'white'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=64, fold=(0, 14, 24, 40), skip=[('neta', 'bed'), ('body', 'bed'), ('head', 'body'), ('neta', 'body'), ('head', 'bed')],
    cams=[((34, -44, 30), (0, 0, 7)), ((-34, 40, 26), (0, 2, 7))])
