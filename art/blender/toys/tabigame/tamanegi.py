"""たまねぎやねガメ Onion Dome Steppe Tortoise (series tabigame, World Tour Turtles): a round cheeky steppe tortoise with a
little cathedral of onion domes on its back: a red-brick footing, a tall white centre tower under a gilt onion, and
four corner towers, each onion twisted in its own bright stripes, every one with its spike on top.
Gimmick: head and legs in, the cathedral lifts off and twirls, then settles back.

    tools/blender.sh art/blender/toys/tabigame/tamanegi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kame import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('tabigame', 'tamanegi')
B = Build()
T = Turtle(B, L=24.0, W=21.5, clr=2.6, dome=8.0, neck=0.8, head=1.4, legs='stump', flat_top=0.5, sp='steppe')
z0 = T.top - 1.3
B.add('shell', box('footing', (12.0, 12.0, 2.2), (0, 0, z0 + 1.1), 'brick', tris=12, bev=0.3))
zf = z0 + 2.2


def onion(r):
    return [(0, -0.2), (r * 0.62, -0.2), (r * 0.62, 0.1), (r * 0.98, r * 0.55), (r * 1.02, r * 0.95), (r * 0.78, r * 1.45), (r * 0.42, r * 1.9),
            (r * 0.16, r * 2.35), (r * 0.08, r * 2.6), (0, r * 2.75)]


TOWERS = [(0.0, 0.0, 2.5, 8.0, 3.3, 'gold')] + [(sx * 3.9, sy * 3.9, 1.55, 4.6, 2.2, nm)
                                               for (sx, sy), nm in zip(((1, -1), (-1, -1), (1, 1), (-1, 1)), ('dome_a', 'dome_b', 'dome_c', 'dome_d'))]
TOPS = []
for cx, cy, r, h, ro, reg in TOWERS:
    drum = [(0, 0), (r, 0), (r, h - 0.6), (r * 1.15, h - 0.45), (r * 1.15, h), (0, h)]
    B.add('shell', turn('drum', drum, (cx, cy, zf - 0.2), ('wall', [('cornice', lambda C, N: C[:, 2] > zf + h - 0.9)]), tris=36, n=8,
                        sculpt=lambda hh, cx=cx, cy=cy, r=r, h=h: tk.push(hh, lambda V, N: -0.25 * (np.abs(np.mod(np.arctan2(V[:, 1] - cy, V[:, 0] - cx) * 4 / np.pi, 1.0) - 0.5) < 0.18)
                                                                    * (V[:, 2] > zf + h * 0.35) * (V[:, 2] < zf + h - 1.2))))
    zo = zf + h - 0.2
    B.add('shell', turn('onion', onion(ro), (cx, cy, zo), reg, tris=56 if reg == 'gold' else 40, n=12))
    tip = zo + ro * 2.7
    B.add('shell', limb('spike', [(cx, cy, tip - 0.2), (cx, cy, tip + 1.0), (cx, cy, tip + 1.9)], [0.28, 0.2, 0.05], tris=10, region='gilt', n=5,
                        cap1='point'))
    B.add('shell', blob('knop', (cx, cy, tip + 0.7), 0.42, tris=12, region='gilt'))
    TOPS.append((cx, cy, zo, ro))
T.commit(F)


def make_rig():
    R = T.rig(F)
    with R.action('gimmick'):
        k = R.key
        shell_keys(k, T, lift=6.0, spin=40.0)
        k('shell', 25, move=(0, 0, 6.0), rot=('Z', 120))
        k('shell', 29, move=(0, 0, 6.0), rot=('Z', 230))
        k('shell', 33, move=(0, 0, 2.0), rot=('Z', 340))
        k('shell', 36, rot=('Z', 360), ease=('QUAD', 'EASE_IN'))
        k('shell', 38, move=(0, 0, 0.5), rot=('Z', 360))
        k('shell', 40, rot=('Z', 360))
        k('shell', 64, rot=('Z', 360))
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_turtle(P, pt, sh, T, '#a89060', '#7a6a3e', scute='#a08850', plast='#e2cc8a', beak='#7a6a48', vest=('#f2efe6', '#c8302a'))
    br = P.region('brick')
    P.fill(br, pt.ramp('#b04a32', 6, shift=0.05), tone=sh, base=0.05)
    row = np.floor(Z / 0.55)
    joint = (np.abs(np.mod(Z, 0.55)) < 0.1) | (np.abs(np.mod(X + Y + 0.6 * (row % 2), 1.2)) < 0.1)
    P.fill(br & joint, pt.ramp('#d8cbb0', 4), tone=sh, base=0.1, brush=False)
    P.fill('wall', pt.ramp('#f0ebe0', 6, shift=0.04), tone=sh, base=0.2)
    P.fill(P.region('wall') & (P.cav > 0.6), pt.ramp('#c84a32', 5, shift=0.05), tone=sh, base=0.0, brush=False)   # the brick-red window niches
    P.fill('cornice', pt.ramp('#c84a32', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('gilt', pt.ramp('#e0b040', 6, shift=0.08, light=0.6), tone=sh, base=0.15, brush='metal')
    P.fill('gold', pt.ramp('#e0b040', 7, shift=0.08, light=0.6), tone=sh, base=0.15, brush={'preset': 'metal', 'flow': 'around'})
    COLS = {'dome_a': ('#3a8a4a', '#f2ede2'), 'dome_b': ('#c8302a', '#f0c030'), 'dome_c': ('#2a5aa8', '#f2ede2'), 'dome_d': ('#e07a2a', '#3a8a4a')}
    for (cx, cy, zo, ro), reg in zip(TOPS[1:], ('dome_a', 'dome_b', 'dome_c', 'dome_d')):
        m = P.region(reg)
        a, b = COLS[reg]
        P.fill(m, pt.ramp(a, 6, shift=0.06), tone=sh, base=0.1)
        ang = np.arctan2(Y - cy, X - cx)
        tw = np.mod(ang * 4 / np.pi + (Z - zo) * 0.55, 1.0) < 0.5   # the twisted stripes
        P.fill(m & tw, pt.ramp(b, 6, shift=0.06), tone=sh, base=0.15)
    turtle_face(P, T, 262, blush='#e08a70')
    P.lines(['dome_a', 'dome_b', 'dome_c', 'dome_d', 'gold'], step=1)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint)
