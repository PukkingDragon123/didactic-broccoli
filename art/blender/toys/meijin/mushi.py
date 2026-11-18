"""むしずもう Mushi-Zumō: the summer bout every Shōwa kid staged, a rhino beetle against a stag beetle on a log ring
(series meijin, secret; concepts_C.md). The champion rhino wears a red mawashi; the challenger stag has its jaws round
his horn; the ring is a sawn log with the straw-bale circle painted and pressed in.

Gimmick: ton-ton, the log drums; the two shove back and forth; the rhino gets his horn under and heaves the stag up off
its feet; it drops back and they square up again.

    tools/blender.sh art/blender/toys/meijin/mushi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '..', 'kaden', '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('meijin', 'mushi')

LZ = 5.0                       # the log's top
RY, SY = 6.6, -11.6             # the rhino's and the stag's body centres (y)

# ------------------------------------------------------------------ the log ring and its straw-bale circle
log = tk.lathe('log', [(0, 0), (16.4, 0), (16.8, 1.0), (16.6, LZ - 0.6), (16.0, LZ), (0, LZ)], n=28)


def sc_log(h):
    def f(V, N):
        r = np.hypot(V[:, 0], V[:, 1])
        top = N[:, 2] > 0.6
        d = np.where(top, -0.15 * (np.abs(np.sin(r * 1.4 + 0.3 * np.sin(np.arctan2(V[:, 1], V[:, 0]) * 3))) > 0.9), 0.0)
        d += np.where(~top, 0.35 * (np.abs(np.sin(np.arctan2(V[:, 1], V[:, 0]) * 24 + V[:, 2] * 0.4)) > 0.7), 0.0)
        d += 0.45 * top * tk.smoothstep(0.7, 0.0, np.abs(r - 12.8))     # the bale circle, pressed proud
        return d
    tk.push(h, f)


log_lo, log_hi = cx.low(log, 'log', 160, lo=1, hi=2, sculpt=sc_log, region=('wood', [('bark', lambda C, N: N[:, 2] < 0.6)]))


# ------------------------------------------------------------------ beetles
def legs(cy, face):
    out = []
    for sx in (1, -1):
        for k, (dy, spread) in enumerate(((-3.2, 0.8), (0.0, 1.0), (3.4, 0.9))):
            y0 = cy + face * dy
            hip = np.array((sx * 3.2, y0, LZ + 3.0))
            knee = np.array((sx * (7.4 * spread), y0 + face * (k - 1) * 1.6, LZ + 4.4))
            foot = np.array((sx * (9.6 * spread), y0 + face * (k - 1) * 3.0, LZ + 0.4))
            t = tk.tube('leg', [tuple(hip), tuple(knee), tuple(foot)], [0.9, 0.75, 0.55], n=5, cap1='round')
            out.append(cx.low(t, 'leg', 18, lo=0, hi=1, region='legs'))
    return out


# the rhino beetle (facing -y): wing cases, the pronotum with its little horn, the great forked head horn
RH = []
el = tk.loft('relytra', [{'c': (0, RY + 6.4, LZ + 4.4), 'w': 7.4, 'h': 2.8, 'e': 2.3}, {'c': (0, RY + 2.6, LZ + 5.0), 'w': 11.0, 'h': 3.8, 'e': 2.4},
                         {'c': (0, RY - 1.6, LZ + 5.0), 'w': 11.0, 'h': 3.8, 'e': 2.4}], n=14, up=(0, 0, 1), cap0='round', cap1='flat')
pro = tk.loft('rpro', [{'c': (0, RY - 1.8, LZ + 5.2), 'w': 10.4, 'h': 3.4, 'e': 2.4}, {'c': (0, RY - 4.6, LZ + 5.2), 'w': 9.0, 'h': 3.2, 'e': 2.4},
                       {'c': (0, RY - 6.4, LZ + 4.4), 'w': 5.6, 'h': 2.2, 'e': 2.2}], n=12, up=(0, 0, 1), cap0='flat', cap1='round', capd=1.0)
phorn = tk.tube('rphorn', [(0, RY - 3.6, LZ + 8.0), (0, RY - 5.4, LZ + 9.6), (0, RY - 6.6, LZ + 9.8)], [1.2, 0.8, 0.4], n=6, cap1='point')
horn = tk.tube('rhorn', [(0, RY - 6.6, LZ + 3.6), (0, RY - 8.8, LZ + 4.4), (0, RY - 10.4, LZ + 6.4), (0, RY - 11.0, LZ + 9.0)], [1.6, 1.3, 1.0, 0.8], n=8)
forks = [tk.tube('fork', [(0, RY - 11.0, LZ + 8.8), (sx * 1.6, RY - 11.6, LZ + 10.2)], [0.7, 0.4], n=5, cap1='point') for sx in (1, -1)]
RH += [cx.low(el, 'relytra', 120, lo=1, hi=3, region='rshell'), cx.low(pro, 'rpro', 90, lo=1, hi=3, region='rshell'),
       cx.low(phorn, 'rphorn', 20, lo=0, hi=1, region='rshell'), cx.low(horn, 'rhorn', 50, lo=1, hi=1, region='rshell')]
RH += [cx.low(f_, 'fork', 10, lo=0, hi=1, region='rshell') for f_ in forks] + legs(RY, -1)

# the stag beetle (facing +y): wing cases, a wide head, the two great jaws round the rhino's horn
ST = []
el2 = tk.loft('selytra', [{'c': (0, SY - 6.0, LZ + 4.2), 'w': 7.0, 'h': 2.6, 'e': 2.3}, {'c': (0, SY - 2.4, LZ + 4.8), 'w': 10.0, 'h': 3.4, 'e': 2.4},
                          {'c': (0, SY + 1.6, LZ + 4.8), 'w': 10.0, 'h': 3.4, 'e': 2.4}], n=14, up=(0, 0, 1), cap0='round', cap1='flat')
pro2 = tk.loft('spro', [{'c': (0, SY + 1.8, LZ + 4.8), 'w': 9.6, 'h': 3.0, 'e': 2.6}, {'c': (0, SY + 4.0, LZ + 4.8), 'w': 9.0, 'h': 2.8, 'e': 2.6}], n=12, up=(0, 0, 1),
                cap0='flat', cap1='round', capd=0.8)
head2 = tk.loft('shead', [{'c': (0, SY + 4.8, LZ + 4.6), 'w': 10.4, 'h': 2.4, 'e': 3.0}, {'c': (0, SY + 6.6, LZ + 4.6), 'w': 9.0, 'h': 2.2, 'e': 3.0}], n=12, up=(0, 0, 1),
                 cap0='flat', cap1='round', capd=0.8)
ST += [cx.low(el2, 'selytra', 110, lo=1, hi=3, region='sshell'), cx.low(pro2, 'spro', 60, lo=1, hi=2, region='sshell'), cx.low(head2, 'shead', 60, lo=1, hi=2, region='sshell')]
for sx in (1, -1):
    jaw = tk.tube('jaw', [(sx * 3.4, SY + 6.6, LZ + 4.8), (sx * 4.8, SY + 9.6, LZ + 5.6), (sx * 4.0, SY + 12.2, LZ + 6.2), (sx * 2.9, SY + 13.2, LZ + 6.4)],
                  [1.3, 1.0, 0.8, 0.4], n=6, squash=0.6, cap1='point')
    ST.append(cx.low(jaw, 'jaw', 30, lo=1, hi=1, region='sshell'))
ST += legs(SY, 1)

# ------------------------------------------------------------------ parts
F.part('log', log_lo, [log_hi], bone='log')
F.part('rhino', tk.join([p_[0] for p_ in RH], 'rhino'), [p_[1] for p_ in RH], bone='rhino', kind='gloss')
F.part('stag', tk.join([p_[0] for p_ in ST], 'stag'), [p_[1] for p_ in ST], bone='stag', kind='gloss')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('log', (0, 0, 0.5), parent='root')
    R.bone('rhino', (0, RY + 7.2, LZ), parent='log')
    R.bone('stag', (-9.6, SY, LZ), parent='log')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'log', 'rhino', 'stag']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # ton-ton: the log drums
        for i, f in enumerate(range(2, 22, 3)):
            k('log', f, move=(0, 0, 0.8 if i % 2 == 0 else 0.0))
        k('log', 23)
        # the shove, back and forth (together: horn in jaws)
        for i, f in enumerate((6, 11, 16, 21)):
            d = (2.0, -2.4, 1.6, 0.0)[i]
            k('rhino', f, move=(0, -d, 0))
            k('stag', f, move=(0, -d, 0))
        # the heave: the rhino's horn goes under and the stag goes up off its feet...
        k('rhino', 25)
        k('rhino', 30, rot=('X', -10), move=(0, -0.6, 0))
        k('stag', 24)
        k('stag', 30, rot=('Y', -26), move=(0, -2.0, 0))
        k('stag', 36, rot=('Y', -26), move=(0, -2.0, 0))
        k('rhino', 36, rot=('X', -10), move=(0, -0.6, 0))
        # ...and drops back: they square up
        k('rhino', 39)
        k('stag', 43)
        k('rhino', 43)
        for b in allb:
            k(b, 50)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    r = np.hypot(X, Yc)
    P.fill('wood', pt.ramp('#d8b47a', 7, shift=0.06), tone=sh, base=0.08)
    P.tint(P.region('wood') & (np.abs(np.sin(r * 1.4 + 0.3 * np.sin(np.arctan2(Yc, X) * 3))) > 0.9), pt.ramp('#a88250', 6, shift=0.06), sh)
    P.tint(P.region('wood') & (np.abs(r - 12.8) < 0.8), pt.ramp('#e8d48a', 6, shift=0.06), sh + 0.15)            # the straw bales
    P.flat(P.region('wood') & (np.abs(r - 12.8) < 0.8) & (np.mod(np.degrees(np.arctan2(Yc, X)), 15) < 1.2), '#8a6a3a')
    P.flat(P.region('wood') & (r < 1.0), '#5a3a2a')
    P.fill('bark', pt.ramp('#6a4a32', 7, shift=0.06), tone=sh, base=0.05)
    # the champion rhino: gold lacquer (the secret), the red mawashi round his waist; the stag in glossy black-brown
    P.fill('rshell', pt.ramp('#d8a83a', 7, dark=0.6, light=0.6, shift=0.06), tone=free * 1.3, base=0.1)
    rm = P.region('rshell')
    P.tint(rm & (np.abs(Yc - (RY - 1.7)) < 1.1) & (Z < LZ + 8.6), pt.ramp('#c8303a', 6, shift=0.06), free)
    P.tint(rm & (np.abs(Yc - (RY - 1.7)) < 1.1) & (np.abs(X) < 0.7) & (Z > LZ + 7.0), pt.ramp('#f2e2b4', 6, shift=0.05), free)
    P.fill('sshell', pt.ramp('#4a3226', 7, shift=0.06), tone=free * 1.2, base=0.2)
    P.fill('legs', pt.ramp('#3a2a22', 6, shift=0.05), tone=free, base=0.2)
    # the faces, drawn on: the champion's glare (pale ink on the shells), the challenger gritting its jaws
    fr = face.Face(P, c=(0, RY - 6.6, LZ + 5.6), axis=(0, -1, 0.3), where=rm & (P.part == PI['rhino']), seed=221)
    fr.eyes('dot', spread=4.4, size=0.5, dy=0.6)
    fr.brows('angry', spread=4.6, dy=1.8, w=1.6, weight=0.3)
    sm = P.region('sshell') & (P.part == PI['stag'])
    fs = face.Face(P, c=(0, SY + 7.4, LZ + 5.4), axis=(0, 1, 0.4), where=sm, seed=222, ink='#efe6d2')
    fs.eyes('squeeze', spread=5.0, size=0.55, dy=0.4)
    fs.mouth('gritted', w=3.0, dy=-1.0, teeth=3)
    P.lines(['wood'], ['bark'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 51), skip=[]),
       cams=[((56, -64, 48), (0, -1, 8)), ((-56, 64, 48), (0, 0, 8))], fold=(0, 10, 32, 44))
