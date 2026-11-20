"""カブト・ホレス Horace, Rhythm Guitar (series kouchuu, The Hardwings): the rhinoceros beetle of the band, his great
forked horn curving up in front of his mop-top fringe, in a black collarless suit buttoned high, with a sunburst
single-cutaway guitar slung low.
Gimmick: chop, chop, chop on the rhythm, with a nod of the horn on every beat.

    tools/blender.sh art/blender/toys/kouchuu/kabuto.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.3')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _band import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('kouchuu', 'kabuto')
B = Build()
GO, GR = V3(-1.2, -5.7, 10.4), 64.0
M = Beetle(B, hand_r=(-0.2, -6.9, 10.8), hand_l=(4.4, -6.2, 14.0), hk=1.1, fringe=23.1, stance=(3.0, 8.4, 3.8, 3.6))   # (a wider stance: it stands steady with its guitar)
M.antennae(club=False)
HP = [(0, -4.4, 21.4), (0, -7.4, 23.4), (0, -8.6, 26.8), (0, -7.8, 29.6)]
B.add('head', limb('horn', HP, [1.45, 1.2, 0.85, 0.55], tris=36, region='horn', n=8))
for sx in (1, -1):   # the fork at its tip
    B.add('head', limb('fork', [HP[-1], (sx * 1.1, -7.0, 30.8)], [0.5, 0.12], tris=10, region='horn', n=6, cap1='point'))
gp, tip = guitar('single', neck=9.0, k=0.95)
B.add('body', *place(gp, [(GR, 'Y'), (-8, 'Z')], GO))
B.commit(F, bones={'body': 'body', 'head': 'head', 'arm_r': 'arm_r', 'arm_l': 'arm_l'})


def make_rig():
    R = M.rig(F)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for i, f in enumerate(range(4, 44, 2)):
            k('arm_r', f, rot=('X', -14 if i % 2 == 0 else 4))
        k('arm_r', 44)
        for i, f in enumerate(range(4, 44, 4)):
            k('head', f, rot=('X', 12))
            k('head', f + 2, rot=('X', -4))
            k('body', f, rot=('Y', 3 if i % 2 else -3))
        k('head', 44)
        k('body', 44)
        for b in allb:
            k(b, 52)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_member(P, pt, sh, chitin='#4a2618', suit='#2a2a30', hair='#221a18')
    P.fill('horn', pt.ramp('#4a2618', 7, shift=0.07, light=0.6), tone=sh, base=0.25, brush={'preset': 'gloss', 'flow': 'along', 'axis': (0, -0.3, 1), 'shine': 0.5})
    paint_guitar(P, pt, sh, body='#e0a030', burst='#3a1e14', guard='#efe6d0', neck='#6a4428')
    face_at(P, M, 302, size=0.46)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=52)
