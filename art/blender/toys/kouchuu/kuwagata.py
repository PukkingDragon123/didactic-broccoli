"""クワガタ・クリップ Clip, Lead Guitar (series kouchuu, The Hardwings): the stag beetle of the band, his great
mandibles sweeping out from under a glossy mop-top fringe, in a grey collarless suit (his wing cases are the tails),
white shirt, thin black tie and Chelsea boots, playing a cherry-red hollow-body guitar.
Gimmick: he strums and shakes his mop-top.

    tools/blender.sh art/blender/toys/kouchuu/kuwagata.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.3')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _band import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('kouchuu', 'kuwagata')
B = Build()
GO, GR = V3(-1.6, -5.6, 11.4), 55.0     # the guitar's body centre, its tilt
M = Beetle(B, hand_r=(-0.6, -6.9, 11.8), hand_l=(4.6, -6.0, 15.8), hk=1.05, stance=(3.0, 8.4, 3.8, 3.6))   # (a wider stance: it stands steady with its guitar)
M.antennae(club=False)
for sx in (1, -1):   # the mandibles, each with its inner tooth
    p = [(sx * 2.4, -3.8, 21.0), (sx * 5.2, -6.0, 21.2), (sx * 5.6, -8.8, 22.0), (sx * 3.2, -10.6, 22.8)]
    B.add('head', limb('jaw', p, [1.15, 0.95, 0.7, 0.14], tris=30, region='jaw', n=6, cap1='point'))
    B.add('head', limb('tooth', [(sx * 5.4, -8.0, 21.8), (sx * 4.0, -8.4, 21.8)], [0.5, 0.1], tris=8, region='jaw', n=5, cap1='point'))
gp, tip = guitar('hollow', neck=9.0, k=0.95)
B.add('body', *place(gp, [(GR, 'Y'), (-12, 'Z')], GO))
B.commit(F, bones={'body': 'body', 'head': 'head', 'arm_r': 'arm_r', 'arm_l': 'arm_l'})


def make_rig():
    R = M.rig(F)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for i, f in enumerate(range(4, 40, 3)):
            k('arm_r', f, rot=('X', -12 if i % 2 == 0 else 6))
            k('body', f, move=(0, 0, 0.35 if i % 2 == 0 else 0.0), rot=('Z', 3 if i % 4 < 2 else -3))
        k('arm_r', 40)
        k('body', 40)
        shake(k, 6, 42, amp=15)
        k('arm_l', 10)
        k('arm_l', 22, rot=('Y', -6), move=(0.6, 0, 0.4))
        k('arm_l', 34)
        for b in allb:
            k(b, 50)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_member(P, pt, sh, chitin='#2e2018', suit='#8a8c92', hair='#3a2820')
    P.fill('jaw', pt.ramp('#5a2e1e', 7, shift=0.07, light=0.6), tone=sh, base=0.2, brush={'preset': 'gloss', 'flow': 'along', 'axis': (0, -1, 0.2), 'shine': 0.5})
    paint_guitar(P, pt, sh, body='#b42a2a', guard='#1e1a1c', neck='#5a3a24')
    gb = P.region('gbody')
    for sx in (1, -1):   # the two f-holes
        c = GO + np.array((0.0, -0.9, 0.0))
        d = P.pos - c
        ca, sa = np.cos(np.radians(GR)), np.sin(np.radians(GR))
        u = d[:, :, 0] * ca - d[:, :, 2] * sa
        v = d[:, :, 0] * sa + d[:, :, 2] * ca
        P.flat(gb & (np.abs(u - sx * 2.0 + 0.15 * np.sin(v * 2.2)) < 0.16) & (np.abs(v - 0.4) < 1.6) & (P.on[:, :, 1] < -0.5), '#1e1a1c')
    face_at(P, M, 301)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=50)
