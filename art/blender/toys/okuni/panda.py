"""パンダ Silk Jacket Panda (series okuni, National Animal Parade; China): a giant panda sitting back on its round
bottom, hind legs out in front, in a red silk jacket with a stand-up collar and gold knotted buttons, a stalk of
green bamboo with a leafy top held across in both paws.
Gimmick: munch: the bamboo comes up to its mouth three times, the head nodding with each bite.

    tools/blender.sh art/blender/toys/okuni/panda.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _okuni import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('okuni', 'panda')
B = Build()
# ------------------------------------------------------------------ the seated body in its jacket, the legs out in front
BODY = [dict(c=(0, 1.2, 0.6), w=12.6, h=5.4), dict(c=(0, 1.0, 4.4), w=15.6, ht=6.8, hb=6.4), dict(c=(0, 0.6, 10.0), w=15.0, ht=6.4, hb=6.0),
        dict(c=(0, 0.4, 15.0), w=12.6, h=5.4), dict(c=(0, 0.4, 18.0), w=8.6, h=4.0)]
bd = low(tk.loft('body', BODY, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 170, lo=1, hi=3,
         region=('black', [('jacket', lambda C, N: C[:, 2] > 5.6)]))
for o in bd:
    tk.flat_bottom(o, 0.9)
B.add('body', bd)
B.add('body', limb('collar', [(-3.6, -1.6, 18.0), (-2.2, -3.6, 18.6), (0, -4.2, 18.8), (2.2, -3.6, 18.6), (3.6, -1.6, 18.0)], 0.8, tris=24, region='trim', n=6))
for sx in (1, -1):
    lg = limb('leg', [(sx * 4.2, -1.0, 3.4), (sx * 5.0, -5.6, 2.6), (sx * 5.4, -8.4, 2.8)], [3.2, 2.9, 2.7], tris=40, region='black', n=8)
    for o in lg:
        tk.flat_bottom(o, 0.6)
    B.add('body', lg)
    B.add('body', blob('sole', (sx * 5.5, -10.6, 3.2), 2.2, tris=16, region='pad', squash=(1.0, 0.45, 1.1)))
# ------------------------------------------------------------------ the arms (both paws on the bamboo) and the bamboo
SH = V3(0, 0.0, 15.6)
for sx in (1, -1):
    B.add('arms', limb('arm', [(sx * 6.4, 0.2, 15.6), (sx * 7.0, -3.6, 12.6), (sx * 3.4, -6.8, 12.2)], [2.6, 2.3, 2.1], tris=36, region='sleeve', n=8))
    B.add('arms', blob('paw', (sx * 2.4, -7.6, 12.4), 2.0, tris=20, region='black', squash=(1.0, 1.1, 0.95)))
BB = [V3(-7.0, -8.2, 6.0), V3(-0.8, -8.0, 12.4), V3(5.6, -7.4, 20.4)]


def nodes(h):
    def f(V, N):
        t = (V - BB[0]) @ ((BB[2] - BB[0]) / np.linalg.norm(BB[2] - BB[0]))
        return 0.3 * (np.abs(np.mod(t, 4.2) - 2.1) > 1.85)
    tk.push(h, f)


B.add('arms', limb('bamboo', BB, [0.85, 0.85, 0.75], tris=36, region='bamboo', n=8, sculpt=nodes))
LEAF = [(0, 0), (0.9, 1.6), (0.6, 3.6), (0, 4.6), (-0.6, 3.6), (-0.9, 1.6)]
for i, (rz, rx) in enumerate(((30, -20), (-40, -10), (90, 15))):
    B.add('arms', slabp('leaf', LEAF, 0.3, 'leaf', plane='XZ', move=tuple(BB[2] + (0, 0, 0.2)), rot=[(rx, 'X', (0, 0, 0)), (rz, 'Y', (0, 0, 0))]))
# ------------------------------------------------------------------ the head: big and round, black ears
HC = (0, -1.0, 24.6)
B.add('head', limb('neck', [(0, 0.4, 17.6), (0, -0.4, 21.0)], 3.6, tris=16, region='white', n=8))
hd = tk.loft('head', [dict(c=(0, 2.8, 24.8), w=9.4, h=4.4), dict(c=(0, 0.2, 25.0), w=13.4, ht=6.0, hb=5.4), dict(c=(0, -3.2, 24.4), w=12.0, ht=5.2, hb=4.8),
                      dict(c=(0, -5.6, 23.4), w=6.4, ht=2.8, hb=2.8)], n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)
B.add('head', low(hd, 'head', 130, lo=1, hi=3, region=('white', [('nose', lambda C, N: (C[:, 1] < -6.6) & (C[:, 2] > 23.4) & (np.abs(C[:, 0]) < 1.2))])))
for sx in (1, -1):
    e = tk.lathe('ear', [(0, -0.9), (2.1, -0.6), (2.4, 0.2), (1.8, 0.9), (0, 1.1)], n=10, axis='Y', centre=(sx * 4.6, 0.8, 30.0))
    tk.rotate(e, sx * -25, 'Y', pivot=(sx * 4.6, 0.8, 30.0))
    B.add('head', low(e, 'ear', 20, region='black'))
B.commit(F, bones={'body': 'body', 'arms': 'arms', 'head': 'head'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0.6, 6.0), parent='root')
    R.bone('arms', tuple(SH), parent='body')
    R.bone('head', (0, 0.0, 18.8), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'arms', 'head']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for i, f in enumerate((8, 22, 36)):   # three bites: the bamboo up, a nod, back down a little
            k('arms', f, rot=('X', -16), move=(0, 0, 1.8))
            k('arms', f + 6, rot=('X', -6), move=(0, 0, 0.6))
            k('head', f, rot=('X', 4))
            k('head', f + 3, rot=('X', 12))
            k('head', f + 7, rot=('Z', 6 if i % 2 else -6))
        k('body', 10)
        k('body', 30, rot=('Y', 3))
        k('body', 44)
        for b in allb:
            k(b, 56)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('white', pt.ramp('#f0ede4', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill('black', pt.ramp('#2a2628', 6, shift=0.05, light=0.6), tone=sh, base=0.2, brush='fur')
    P.fill('pad', pt.ramp('#4a3e3c', 5), tone=sh, base=0.15)
    P.fill('nose', pt.ramp('#1e1a1c', 4), tone=sh, base=0.15)
    jr = P.region('jacket') | P.region('sleeve')
    P.fill(jr, pt.ramp('#c8302e', 7, shift=0.07), tone=sh, base=0.1, brush={'preset': 'cloth', 'flow': 'down', 'shine': 0.4})
    P.shift(jr & (np.abs(np.sin(X * 1.7 + Z * 0.6) * np.sin(Z * 1.1 - X * 0.4)) > 0.9), 1)   # the silk's woven cloud figure
    P.fill('trim', pt.ramp('#e0b040', 6, shift=0.08), tone=sh, base=0.15)
    jk = P.region('jacket')
    P.fill(jk & (Z < 6.8), pt.ramp('#e0b040', 6, shift=0.08), tone=sh, base=0.15)   # the gold hem
    for z in (8.4, 11.4, 14.4):   # the knotted frog buttons
        P.fill(jk & (np.hypot(X - 0.0, Z - z) < 0.55) & (Y < -4), pt.ramp('#e0b040', 5, shift=0.08), tone=sh, base=0.2, brush=False)
        P.flat(jk & (np.abs(Z - z) < 0.16) & (np.abs(X) < 2.0) & (np.abs(X) > 0.5) & (Y < -4), '#e0b040')
    P.fill('bamboo', pt.ramp('#6aa040', 6, shift=0.07), tone=sh, base=0.1, brush={'preset': 'pvc', 'flow': 'along', 'axis': (0.5, 0.05, 0.6)})
    P.fill(P.region('bamboo') & (P.cav > 0.56), pt.ramp('#3a6a28', 5), tone=sh, base=0.0)
    P.fill('leaf', pt.ramp('#5a9a3a', 6, shift=0.07), tone=sh, base=0.1)
    hd = P.region('white') & (Z > 20)
    fc = face.Face(P, c=(0, -6.0, 25.4), axis=(0, -1, 0.15), where=hd | P.region('nose'), seed=411)
    fc.eyes('dot', spread=5.2, size=0.62, dy=0.6)
    fc.mouth('upturn', w=2.4, dy=-2.4, weight=0.32)
    fc.blush(6.2, -1.4, rx=1.0, ry=0.55, col='#e8a0a0')
    P.lines(['jacket', 'sleeve'], ['black', 'white', 'trim'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=56, skip=[('arms', 'body'), ('head', 'body'), ('arms', 'head')])
