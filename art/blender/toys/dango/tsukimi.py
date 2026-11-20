"""つきみウサギ Moon-Viewing Rabbit, the secret of series dango (Dango Skewer Pals, concepts_F.md): no skewer at all. A
stack of white tsukimi dango on a little plain-wood offering stand (a sanbō: a rimmed tray on a box with its round
window): nine balls, then four, and on top the moon rabbit itself, a bigger ball with long ears; its two paws on the
front of the stack hold up a sprig of pampas grass, the moon rabbit's own offering.
Gimmick: the head ball hops up, spins round, ears flopping, and lands back on the pile.

    tools/blender.sh art/blender/toys/dango/tsukimi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kushi import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('dango', 'tsukimi')
B = Build()

# ------------------------------------------------------------------ the sanbō: a box with a round window, a rimmed tray on it
SZ = 7.4
B.add('bed', low(tk.rbox('box', (14.0, 14.0, SZ - 1.0), centre=(0, 0, (SZ - 1.0) / 2), bevel=0.4, segs=2), 'box', 40, lo=0, hi=2, region='hinoki'))
B.add('bed', low(tk.rbox('tray', (22.0, 22.0, 1.2), centre=(0, 0, SZ - 0.4), bevel=0.3, segs=2), 'tray', 24, lo=0, hi=2, region='hinoki'))
for (cx, cy, w, d) in ((0, -10.6, 22.0, 0.8), (0, 10.6, 22.0, 0.8), (-10.6, 0, 0.8, 20.4), (10.6, 0, 0.8, 20.4)):
    B.add('bed', low(tk.rbox('rim', (w, d, 1.6), centre=(cx, cy, SZ + 0.9), bevel=0.25, segs=1), 'rim', 12, lo=0, hi=2, region='hinoki'))
TOP = SZ + 0.2

# ------------------------------------------------------------------ the pile: nine, then four
R1, R2, SQ_ = 3.15, 3.15, 0.9
for i in range(3):
    for j in range(3):
        B.add('bed', ball('d', TOP + R1 * SQ_, r=R1, sq=SQ_, region='mochi', tris=40, at=((i - 1) * 6.1, (j - 1) * 6.1), seed=30 + 3 * i + j))
Z2_ = TOP + R1 * SQ_ * 2 + 0.9
for i in (-1, 1):
    for j in (-1, 1):
        B.add('bed', ball('d', Z2_, r=R2, sq=SQ_, region='mochi', tris=40, at=(i * 3.05, j * 3.05), seed=40 + i + 2 * j))

# ------------------------------------------------------------------ the paws and the pampas grass
for sx in (1, -1):
    B.add('bed', blob('paw', (2.6 + sx * 1.3, -5.9, Z2_ + 1.2), 1.2, tris=12, region='mochi', squash=(0.9, 0.8, 1.1)))
ST = [(2.6, -6.6, Z2_ - 2.0), (3.4, -6.9, Z2_ + 3.0), (5.4, -6.6, Z2_ + 9.0), (7.6, -6.0, Z2_ + 13.0)]   # (held to its right: clear of the face)
B.add('bed', limb('stem', ST, [0.35, 0.32, 0.28, 0.22], tris=18, region='stem', n=5))
for k, (a, L) in enumerate(((24, 6.0), (50, 5.0), (6, 5.4))):                  # the silvery plumes
    p0 = np.array(ST[2]) + np.array((0.6 * k, 0, 1.2 * k))
    d = np.array((math.sin(math.radians(a)), -0.15, math.cos(math.radians(a))))
    B.add('bed', limb('plume', [p0, p0 + d * L * 0.5 + (0.6, 0, 0), p0 + d * L + (1.4, 0, -0.8)], [0.5, 0.75, 0.25], tris=20, region='plume', n=6,
                      cap1='point', sculpt=lambda h: tk.push(h, lambda V, N: 0.1 * np.sin(V[:, 2] * 9.0 + V[:, 0] * 5.0))))
for sx in (1, -1):                                                                  # two long leaves
    B.add('bed', limb('blade', [(3.0, -6.7, Z2_ + 2.0), (3.0 + sx * 1.6 + 1.0, -7.6, Z2_ + 6.0), (3.0 + sx * 3.4 + 2.0, -8.0, Z2_ + 8.0)], [0.4, 0.35, 0.05], tris=12,
                      region='stem', n=4, cap1='point'))

# ------------------------------------------------------------------ the moon rabbit: the top ball, its long ears
HR = 4.8
HZ = Z2_ + R2 * SQ_ + HR * 0.86 - 0.6
HP = [ball('head', HZ, r=HR, sq=0.88, region='mochi', tris=150, seed=50)]
for sx in (1, -1):
    HP.append(blob('cheek', (sx * 2.6, -HR + 1.0, HZ - 1.3), 1.4, tris=12, region='mochi', squash=(1.0, 0.7, 0.8)))
EP = []
for sx in (1, -1):
    EP.append(ear('ear', (sx * 1.6, 0.6, HZ + HR * 0.8 - 0.6), (sx * 3.4, 2.2, HZ + HR * 0.8 + 10.0), 2.8, th=1.0, region='mochi', tris=22,
                  cup=(sx * 0.2, -1, 0.1)))
B.add('head', *HP)
B.add('ears', *EP)
B.commit(F)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('bed', (0, 0, SZ), parent='root')
    R.bone('head', (0, 0, HZ), parent='bed')
    R.bone('ears', (0, 0.8, HZ + HR * 0.8 - 0.4), parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    bones = ['root', 'bed', 'head', 'ears']
    with R.action('gimmick'):
        for b in bones:
            k(b, 0)
        k('head', 4)
        k('head', 7, move=(0, 0, -0.6))                                   # crouch
        k('head', 16, move=(0, 0, 9.0), rot=('Z', 180), ease='QUAD')       # hop and spin
        k('head', 24, move=(0, 0, 9.0), rot=('Z', 360))
        k('head', 32, ease='BOUNCE')
        k('ears', 7)
        k('ears', 12, rot=('X', -24))                                      # the ears stream down as it rises
        k('ears', 20, rot=('X', 18))                                       # ...and flop forward at the top
        k('ears', 28, rot=('X', -14))
        k('ears', 36, rot=('X', 8))
        k('ears', 42)
        k('head', 40)
        k('head', 44, rot=('Y', 8))
        k('head', 48, rot=('Y', -8))
        k('head', 52)
        for b in bones:
            k(b, 60)
    return R


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('hinoki', pt.ramp('#e2c494', 7, shift=0.05), tone=sh, base=0.15, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0), 'L': 9})
    hin = P.region('hinoki')
    P.shift(hin & (np.abs(np.mod(Yc * 1.4 + Z * 0.8 + 0.5 * np.sin(X * 0.4), 1.4) - 0.7) < 0.09), -1)
    win = hin & (np.abs(P.on[:, :, 1]) > 0.8) & (np.hypot(X / 3.6, (Z - SZ * 0.45) / 2.6) < 1)
    P.fill(win, pt.ramp('#5a3a24', 6, shift=0.05), tone=sh, base=-0.2)                      # the round window (the eye-hole of a sanbō)
    mochi_fill(P, pt, sh, 'mochi', '#f6f3ea')
    P.fill(P.region('mochi') & (Z > HZ + HR * 0.8) & (P.on[:, :, 1] < -0.5), pt.ramp('#f2b4bc', 6), tone=sh, base=0.15)   # inside the ears
    P.fill('stem', pt.ramp('#8a9a4a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('plume', pt.ramp('#d8ccb0', 6, shift=0.04), tone=sh, base=0.2, brush={'preset': 'fur', 'flow': 'along', 'axis': (0, 0, 1)})
    fc = face.Face(P, c=(0, -HR + 0.2, HZ + 0.4), axis=(0, -1, 0.1), where=P.region('mochi'), seed=5601)
    fc.eyes('dot', spread=3.8, size=0.55, dy=0.3)
    fc.mouth('w', w=1.2, dy=-1.5, weight=0.2)
    fc.blush(5.2, -1.0, rx=0.9, ry=0.5)
    P.lines(['mochi', 'hinoki'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=60, fold=(0, 12, 20, 32), skip=[('head', 'bed'), ('ears', 'head'), ('ears', 'bed')],
    cams=[((40, -54, 34), (0, 0, 16)), ((-40, 50, 30), (0, 2, 16))])
