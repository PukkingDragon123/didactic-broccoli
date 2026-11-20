"""ピラミッドリクガメ Pyramid Spurred Tortoise (series tabigame, World Tour Turtles): a big grumpy desert tortoise (the
spurred kind, sandy and wrinkled, with the big scales on its fore-legs) carrying three sandstone pyramids on its shell, the great one on the crown and two little ones, their stone courses worn by the sun.
Gimmick: head and legs in, the pyramids lift off with a turn, thump back down.

    tools/blender.sh art/blender/toys/tabigame/piramido.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kame import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('tabigame', 'piramido')
B = Build()
T = Turtle(B, L=29.0, W=24.0, clr=3.2, dome=8.6, neck=0.8, head=1.45, legs='stump', spurs=True, flat_top=0.55)
zt = T.top - 0.8


def courses(h):
    tk.push(h, lambda V, N: -0.16 * (np.abs(np.mod(V[:, 2], 0.85) - 0.42) < 0.1) * (N[:, 2] < 0.85))


def pyramid(name, cx, cy, base, ht, rot=0.0, zt=zt):
    rings = [(zt - 1.8, base * 0.92, base * 0.92), (zt + ht * 0.02, base, base), (zt + ht * 0.5, base * 0.5, base * 0.5), (zt + ht * 0.97, base * 0.04, base * 0.04)]
    a, b = tier(name, rings, ('stone', [('cap', lambda C, N: C[:, 2] > zt + ht * 0.82)]), tris=40, n=16, e=9.0, sculpt=courses, at=(cx, cy),
                cap1='point')
    for o in (a, b):
        tk.rotate(o, rot, 'Z', pivot=(cx, cy, zt))
    return a, b


B.add('shell', pyramid('great', 0.4, 0.6, 12.6, 11.0, 4))
B.add('shell', pyramid('second', -5.6, 7.6, 6.4, 5.4, -8, zt=T.top - 1.6))
B.add('shell', pyramid('third', 6.0, -6.8, 5.6, 4.6, 10, zt=T.top - 1.8))
T.commit(F)


def make_rig():
    R = T.rig(F)
    with R.action('gimmick'):
        shell_keys(R.key, T, lift=6.0, spin=30.0)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_turtle(P, pt, sh, T, '#c4a272', '#a8844e', scute='#c8a466', plast='#e0c890', beak='#9a7c50', vest=('#f2efe6', '#2a7a5a'))
    sk = P.region('skin') | P.region('face')
    P.shift(sk & (np.abs(np.mod(Z * 2.2 + np.sin(X * 1.3) * 0.6, 1.0) - 0.5) < 0.1), -1)     # wrinkles
    st = P.region('stone')
    P.fill(st, pt.ramp('#d4b07a', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'pvc', 'flow': 'down'})
    P.fill(st & (P.cav > 0.58), pt.ramp('#8a6a42', 5, shift=0.05), tone=sh, base=0.0, brush=False)
    who, d = P.dabs(st, size=0.7, spacing=1.0, seed=3)
    P.shift(st & (who >= 0) & (who % 3 == 0), -1)   # weathered blocks
    P.fill('cap', pt.ramp('#efe6cc', 5, shift=0.04), tone=sh, base=0.2)
    turtle_face(P, T, 377)
    P.lines(['stone'], ['shell'], step=1)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint)
