"""せかいガメ The World Turtle (series tabigame, World Tour Turtles; the secret): the oldest traveller of all, a wise
sea turtle with gold-leaf scute borders resting on its flippers, carrying the whole round world on its back: a
painted globe (blue seas, green and sand continents, white poles) in a gilt meridian on a gilt pedestal.
Gimmick: it paddles its flippers and nods, and the globe spins round twice.

    tools/blender.sh art/blender/toys/tabigame/sekai.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kame import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('tabigame', 'sekai')
B = Build()
T = Turtle(B, L=30.0, W=24.0, clr=0.6, dome=6.8, neck=0.7, head=1.4, legs='flipper', flat_top=0.5, sp='seaturtle')
for a, b in B.p['body'][:1] + B.p['legs']:
    tk.flat_bottom(a, 0.7)
    tk.flat_bottom(b, 0.7)
z0 = T.top - 1.0
RG = 8.6
GC = (0.0, 0.0, z0 + 3.0 + RG + 0.9)
B.add('shell', turn('pedestal', [(0, 0), (4.2, 0), (4.4, 0.6), (2.0, 1.4), (1.4, 2.4), (2.4, 3.2), (0, 3.4)], (0, 0, z0), 'gilt', tris=40, n=12))
RA = RG + 0.9
arc = [(GC[0] - RA * math.sin(t), 0.0, GC[2] - RA * math.cos(t)) for t in np.linspace(0.12, math.pi, 9)]
B.add('shell', limb('meridian', [(0, 0, z0 + 3.0)] + arc, 0.42, tris=60, region='gilt', n=6))
B.add('shell', blob('pin', (0, 0, GC[2] + RA + 0.2), 0.6, tris=12, region='gilt'))
B.add('globe', turn('globe', [(0, -RG)] + [(RG * math.sin(t), -RG * math.cos(t)) for t in np.linspace(0.2, math.pi - 0.2, 8)] + [(0, RG)], GC, 'sea',
                    tris=150, n=16))
T.commit(F, extra_bones={'globe': 'globe'})


def make_rig():
    R = T.rig(F, extra=lambda R: R.bone('globe', GC, parent='shell'))
    k = R.key
    allb = ['root', 'body', 'legs', 'head', 'shell', 'globe']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for i, f in enumerate(range(6, 55, 8)):   # paddling: the flippers rock, the body rolls with them
            sgn = 1 if i % 2 == 0 else -1
            k('legs', f, rot=('Y', 12 * sgn))
            k('body', f, rot=('Y', -2.5 * sgn), move=(0, 0, 0.4))
            k('head', f, rot=('X', -6 if i % 2 == 0 else 4))
        k('legs', 60)
        k('body', 60)
        k('head', 60)
        for j, f in enumerate(range(4, 53, 6)):
            k('globe', f, rot=('Z', 90 * j), ease='LINEAR')
        k('globe', 58, rot=('Z', 720 + 20), ease='BACK')
        k('globe', 64, rot=('Z', 720))
        for b in allb[:-1]:
            k(b, 64)
    return R


def land(P):
    d = P.pos - np.asarray(GC)
    r = np.linalg.norm(d, axis=2) + 1e-6
    lon = np.degrees(np.arctan2(d[:, :, 1], d[:, :, 0]))
    lat = np.degrees(np.arcsin(np.clip(d[:, :, 2] / r, -1, 1)))
    wob = 4.0 * np.sin(np.radians(lon) * 5.0 + np.radians(lat) * 3.0) + 3.0 * np.sin(np.radians(lat) * 7.0 - np.radians(lon) * 2.0)
    m = np.zeros(lat.shape, bool)
    for lo, la, rx, ry in ((-100, 47, 30, 18), (-88, 18, 10, 10), (-60, -16, 15, 26), (-40, 72, 11, 8), (15, 50, 16, 10), (20, 4, 21, 27),
                           (45, 24, 10, 8), (92, 48, 42, 18), (78, 20, 8, 11), (108, 12, 10, 9), (135, -25, 16, 10), (138, 37, 3, 7), (172, -42, 3, 6)):
        dl = (np.mod(lon - lo + 180, 360) - 180) * np.cos(np.radians(la))
        m |= ((dl + wob) / rx) ** 2 + ((lat - la + wob * 0.5) / ry) ** 2 < 1
    return m, lat


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_turtle(P, pt, sh, T, '#6a7a58', '#2e4a3a', scute='#3e5e48', plast='#e2d6a8', beak='#5a6a4a', vest=('#f2efe6', '#2a5aa8'), dabs=False)
    sk = P.region('skin') | P.region('face')
    who, d = P.dabs(sk, size=1.1, spacing=1.4, seed=6)   # the sea turtle's big pale-edged scales
    P.fill(sk & (who >= 0) & (d > 0.72), pt.ramp('#c8c8a0', 5, shift=0.04), tone=sh, base=0.1)
    sr = P.region('shell') | P.region('marginal')
    P.fill(sr & (P.cav > 0.56), pt.ramp('#e0b040', 6, shift=0.08, light=0.6), tone=sh, base=0.2, brush=False)   # gold leaf in the seams
    P.fill('gilt', pt.ramp('#e0b040', 7, shift=0.08, light=0.6), tone=sh, base=0.15, brush='metal')
    gm = P.region('sea')
    P.fill(gm, pt.ramp('#2a64a8', 7, shift=0.06), tone=sh, base=0.15, brush={'preset': 'gloss', 'flow': 'around'})
    m, lat = land(P)
    P.fill(gm & m, pt.ramp('#5a9a4a', 6, shift=0.06), tone=sh, base=0.15)
    P.fill(gm & m & (np.abs(np.abs(lat) - 22) < 8), pt.ramp('#cba868', 6, shift=0.05), tone=sh, base=0.15)
    P.fill(gm & (np.abs(lat) > 72), pt.ramp('#f2f2ea', 5, shift=0.03), tone=sh, base=0.25)
    turtle_face(P, T, 808)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, skip=[('globe', 'shell')], frames=64, fold=(0, 14, 30, 46))
