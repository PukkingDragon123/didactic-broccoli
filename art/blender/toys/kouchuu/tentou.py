"""テントウ・ドット Dot, Bass (series kouchuu, The Hardwings): the ladybird on bass: a red collarless jacket whose tails
are her red, black-spotted wing cases, black drainpipes, a black head with the white cheek patches under a mop-top
cut dead straight, and a cream bass as long as she is.
Gimmick: the jacket tails (her wing cases) flip open and shut to the beat while she bobs and nods.

    tools/blender.sh art/blender/toys/kouchuu/tentou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.3')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _band import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('kouchuu', 'tentou')
B = Build()
GO, GR = V3(-1.4, -5.8, 10.0), 60.0
M = Beetle(B, hand_r=(-0.4, -7.0, 10.6), hand_l=(5.0, -6.2, 14.6), hk=1.08, wings=True, trousers='pants', fringe=22.6, stance=(3.1, 7.8, 3.8))   # (a wider stance: it stands steady with its guitar)
M.antennae(club=True)
gp, tip = guitar('bass', neck=12.0, k=0.95)
B.add('body', *place(gp, [(GR, 'Y'), (-10, 'Z')], GO))
B.commit(F, bones={'body': 'body', 'head': 'head', 'arm_r': 'arm_r', 'arm_l': 'arm_l', 'wing_l': 'wing_l', 'wing_r': 'wing_r'})


def make_rig():
    R = M.rig(F)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'wing_l', 'wing_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for nm, sx in (('wing_l', 1), ('wing_r', -1)):
            k(nm, 4)
            k(nm, 12, rot=[('Y', -sx * 58), ('X', 22)], ease='BACK')
            for i, f in enumerate(range(16, 40, 4)):
                k(nm, f, rot=[('Y', -sx * (50 if i % 2 else 62)), ('X', 22)])
            k(nm, 40, rot=[('Y', -sx * 58), ('X', 22)])
            k(nm, 48, ease='BACK')
        for i, f in enumerate(range(6, 42, 3)):
            k('arm_r', f, rot=('X', -10 if i % 2 == 0 else 4))
            k('body', f, move=(0, 0, 0.5 if i % 2 == 0 else 0.0))
        k('arm_r', 42)
        k('body', 42)
        for i, f in enumerate(range(8, 40, 6)):
            k('head', f, rot=[('X', 10), ('Z', 8 if i % 2 else -8)])
            k('head', f + 3, rot=('X', -3))
        k('head', 44)
        for b in allb:
            k(b, 56)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_member(P, pt, sh, chitin='#1e1a1e', suit='#c8302a', hair='#1e1a1c', ely='#d0302a')
    P.fill('pants', pt.ramp('#26242a', 6, shift=0.05, light=0.6), tone=sh, base=0.15, brush='cloth')
    er = P.region('elytra')
    for c in ((2.4, 4.6, 15.0), (-2.4, 4.6, 15.0), (3.0, 5.4, 11.0), (-3.0, 5.4, 11.0), (1.6, 5.3, 8.6), (-1.6, 5.3, 8.6), (3.6, 3.4, 13.0), (-3.6, 3.4, 13.0)):
        P.fill(er & (np.linalg.norm(P.pos - np.array(c), axis=2) < 1.15), pt.ramp('#1e1a1e', 5, light=0.6), tone=sh, base=0.25, brush=False)
    for sx in (1, -1):   # the white cheek patches
        P.fill(P.region('chitin') & (np.linalg.norm(P.pos - np.array((sx * 4.4, -1.6, 21.4)), axis=2) < 1.5), pt.ramp('#f2efe6', 5), tone=sh, base=0.25)
    paint_guitar(P, pt, sh, body='#efe6cc', guard='#6a3a1e', neck='#5a3a24')
    fc = face_at(P, M, 303, size=0.46)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=56, skip=[('wing_l', 'body'), ('wing_r', 'body'), ('wing_l', 'arm_l'), ('wing_r', 'arm_r'), ('wing_l', 'head'), ('wing_r', 'head')])
