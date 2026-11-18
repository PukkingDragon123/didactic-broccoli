"""ロボパイロットハムスター Robot-Pilot Hamster (series janru, concepts_E.md): the giant-robot genre, our own: a squat
red-and-cream super robot with round shoulder pauldrons, a porthole chest and two round ear-fins on its head, planted
on a hangar deck plate; its pilot, a hamster in a flight suit and helmet, rides its shoulder pointing ahead.
Gimmick: the robot's left fist fires forward on its rocket, spinning, and flies back to its wrist.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/robo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'robo')
B = Build()
GZ = 2.6
B.add('body', plinth(r=14.0, n=8, region='deck'))
# ------------------------------------------------------------------ the robot: blocky legs and feet, the chest, pauldrons, the right arm
for sx in (1, -1):
    B.add('body', low(tk.rbox('foot', (5.6, 8.0, 2.6), centre=(sx * 4.4, -1.0, GZ + 1.3), bevel=0.5, segs=1), 'foot', 24, lo=0, hi=2, region='steel'))
    B.add('body', low(tk.loft('leg', [dict(c=(sx * 4.4, 0, GZ + 2.4), w=4.4, h=2.2, e=3.0), dict(c=(sx * 4.2, 0, 8.4), w=4.0, h=2.0, e=3.0),
                                      dict(c=(sx * 3.8, 0, 11.6), w=5.0, h=2.6, e=3.0)], n=8, up=(0, -1, 0), cap0='flat', cap1='flat'), 'leg', 30,
                      lo=1, hi=2, region='cream'))
    B.add('body', blob('knee', (sx * 4.3, -2.0, 8.0), 1.6, tris=12, region='red', squash=(1.1, 0.8, 1.0)))
TORSO = [dict(c=(0, 0.4, 11.0), w=10.0, h=4.4, e=3.2), dict(c=(0, 0.2, 15.0), w=12.6, h=5.4, e=3.2), dict(c=(0, 0.0, 19.6), w=15.2, ht=6.0, hb=5.4, e=3.4),
         dict(c=(0, 0.0, 22.0), w=10.0, h=4.0, e=3.0)]
B.add('body', low(tk.loft('torso', TORSO, n=12, up=(0, -1, 0), cap0='flat', cap1='flat'), 'torso', 120, lo=1, hi=3, region=('red', [('cream', lambda C, N: C[:, 2] < 14.0)]),
                  sculpt=lambda h: tk.push(h, lambda V, N: -0.35 * (np.hypot(V[:, 0], V[:, 2] - 18.0) < 2.8) * (np.hypot(V[:, 0], V[:, 2] - 18.0) > 2.2) * (N[:, 1] < -0.5))))
for sx in (1, -1):
    B.add('body', blob('pauldron', (sx * 9.4, 0.0, 21.0), 3.8, tris=36, region='red', squash=(1.0, 1.0, 0.8)))
B.add('body', limb('arm_r', [(-9.6, 0.0, 18.6), (-10.4, -1.4, 13.6), (-10.0, -4.6, 11.4)], [2.2, 2.0, 1.9], tris=24, region='steel', n=8))
B.add('body', low(tk.rbox('fist_r', (3.8, 4.0, 3.8), centre=(-10.0, -6.8, 11.2), bevel=0.7, segs=1), 'fist_r', 20, lo=0, hi=2, region='cream'))
# the left upper arm stays; its forearm and fist are the rocket
B.add('body', limb('arm_l', [(9.6, 0.0, 18.6), (10.6, -1.0, 15.0)], [2.2, 2.0], tris=14, region='steel', n=8))
W0 = V3(10.6, -1.6, 14.6)
B.add('rocket', limb('fore_l', [W0, W0 + (0, -5.6, 0)], [2.4, 2.6], tris=18, region='red', n=8, e=3.0),
      low(tk.rbox('fist_l', (4.2, 4.2, 4.2), centre=tuple(W0 + (0, -8.0, 0)), bevel=0.8, segs=1), 'fist_l', 20, lo=0, hi=2, region='cream'))
# ------------------------------------------------------------------ the robot head: visor, round ear-fins, a crest
HP = [low(tk.loft('rhead', [dict(c=(0, 1.0, 22.6), w=6.4, h=3.0, e=3.0), dict(c=(0, -0.6, 25.4), w=6.0, h=3.2, e=3.0), dict(c=(0, -0.4, 27.4), w=4.4, h=2.4, e=2.6)],
                        n=10, up=(0, -1, 0), cap0='flat', cap1='round'), 'rhead', 50, lo=1, hi=2, region=('cream', [('visor', lambda C, N: (N[:, 1] < -0.6) & (np.abs(C[:, 2] - 25.2) < 0.9))]))]
for sx in (1, -1):
    HP.append(blob('fin', (sx * 3.8, -0.2, 28.2), 1.9, tris=16, region='red', squash=(0.5, 1.0, 1.0)))
HP.append(limb('crest', [(0, -2.6, 27.0), (0, -3.4, 29.0), (0, -2.4, 30.4)], [0.8, 0.6, 0.2], tris=8, region='gold', n=5, cap1='point'))
B.add('rhead', *HP)
# ------------------------------------------------------------------ the pilot on the right pauldron: hamster, flight suit, helmet, pointing
PC = V3(-9.4, 0.4, 24.0)
B.add('pilot', low(tk.loft('suit', [dict(c=tuple(PC + (0, 0.4, 0.4)), w=4.0, h=2.2), dict(c=tuple(PC + (0, 0.2, 2.6)), w=4.0, h=2.0), dict(c=tuple(PC + (0, 0, 4.0)), w=3.0, h=1.6)],
                            n=10, up=(0, -1, 0), cap0='round', cap1='round'), 'suit', 30, lo=1, hi=2, region='flight'),
      blob('phead', PC + (0, -0.6, 6.4), 2.4, tris=24, region='fur', squash=(1.1, 1.0, 0.95)),
      low(tk.lathe('helmet', [(0, 0), (2.5, 0), (2.6, 1.0), (2.0, 2.2), (0, 2.6)], n=10, centre=tuple(PC + (0, 0.0, 7.0))), 'helmet', 24, lo=1, hi=2, region='helmetc'),
      limb('parm', [PC + (0.6, -0.6, 3.6), PC + (1.6, -3.0, 4.4), PC + (2.0, -5.2, 5.4)], [0.7, 0.6, 0.5], tris=10, region='flight', n=5),
      blob('pfist', PC + (2.1, -5.8, 5.6), 0.6, tris=8, region='fur'))
for sx in (1, -1):
    B.add('pilot', blob('pear', PC + (sx * 1.8, 0.2, 8.4), 0.8, tris=8, region='fur', squash=(1, 0.5, 1)))
    B.add('pilot', limb('pleg', [PC + (sx * 1.0, -0.6, 0.4), PC + (sx * 1.2, -2.6, 0.2), PC + (sx * 1.2, -3.0, -1.4)], 0.7, tris=8, region='flight', n=5))
B.commit(F)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('rocket', tuple(W0), parent='body')
    R.bone('rhead', (0, 0.2, 22.4), parent='body')
    R.bone('pilot', tuple(PC), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'rocket', 'rhead', 'pilot']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('pilot', 4)
        k('pilot', 10, rot=('X', 10), ease='BACK')
        k('pilot', 60, rot=('X', 10))
        k('pilot', 68)
        k('rhead', 6)
        k('rhead', 12, rot=('Z', -14))
        k('rhead', 60, rot=('Z', -14))
        k('rhead', 68)
        k('body', 10)
        k('body', 14, rot=('X', 3))
        k('body', 20)
        k('rocket', 12)
        k('rocket', 26, move=(0, -16.0, 1.0), rot=('Y', 360), ease='LINEAR')
        k('rocket', 36, move=(0, -18.0, 1.4), rot=('Y', 720))
        k('rocket', 54, rot=('Y', 1080), ease='QUAD')
        k('rocket', 55)
        for b in allb:
            k(b, 70)
    return R


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('deck', pt.ramp('#7a7e84', 6, shift=0.05), tone=sh, base=0.0, brush='metal')
    P.tint(P.region('deck') & (P.on[:, :, 2] < 0.5) & (np.mod(X + Yc + Z, 2.4) < 1.2), pt.ramp('#e0b030', 5), sh)      # hazard stripes on the rim
    P.flat(P.region('deck') & (P.on[:, :, 2] > 0.5) & ((np.abs(np.mod(X, 4.0) - 2.0) < 0.08) | (np.abs(np.mod(Yc, 4.0) - 2.0) < 0.08)), '#4a4e54')
    P.fill('red', pt.ramp('#c8343a', 7, shift=0.07), tone=sh, base=0.1)
    P.fill('cream', pt.ramp('#eee6d2', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('steel', pt.ramp('#5a6070', 6, shift=0.06, light=0.6), tone=sh, base=0.1)
    P.fill('gold', pt.ramp('#d6a640', 6, dark=0.6, light=0.6), tone=sh, base=0.2)
    P.fill('visor', pt.ramp('#3a8ac0', 5, light=0.6), tone=sh, base=0.3, brush='gloss')
    P.fill(P.region('red') & (np.hypot(X, Z - 18.0) < 2.2) & (Yc < -4), pt.ramp('#8ad0f0', 5, light=0.6), tone=sh, base=0.3, brush='gloss')   # the porthole
    P.fill('flight', pt.ramp('#e08a2a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('fur', pt.ramp('#e8c690', 6, shift=0.05), tone=sh, base=0.15, brush='fur')
    P.fill('helmetc', pt.ramp('#f2f0ea', 6, shift=0.03), tone=sh, base=0.15, brush='gloss')
    hc = PC + (0, -0.6, 6.4)
    fc = face.Face(P, c=tuple(hc + (0, -2.4, 0)), axis=(0, -1, 0.05), where=P.region('fur'), seed=1201)
    fc.eyes('dot', spread=2.0, size=0.32, dy=0.2)
    fc.mouth('shout', w=0.9, dy=-0.9, weight=0.2)
    fc.blush(2.6, -0.6, rx=0.5, ry=0.3)
    P.lines(['red', 'cream', 'steel'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=70, skip=[('rocket', 'body'), ('rhead', 'body'), ('pilot', 'body'), ('pilot', 'rhead')], fold=(0, 18, 30, 50))
