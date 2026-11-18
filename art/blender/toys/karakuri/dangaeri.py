"""段返りザル Somersault Monkey: series karakuri, Edo Wind-Up Automata (concepts_B.md).

The Edo step-somersault automaton as a monkey: a little acrobat with a gofun-white face picked out in red, a red and
gold brocade jacket, white leggings and a curling tail, standing at the top of its own black-lacquer three-step stair
with its arms up, ready. The stair is a playset part: stand two side by side and they make one long flight.
Gimmick (wind-up): the key winds; it throws a back somersault down onto the middle step, another onto the bottom
step, bows, and scampers back up as the key runs down.

    tools/blender.sh art/blender/toys/karakuri/dangaeri.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import ak  # noqa: E402
import kit  # noqa: E402
sys.path.insert(0, HERE)
import _kr as kr  # noqa: E402

F = bk.start('karakuri', 'dangaeri')
b = kr.base(F, w=28.0)
SZ = kr.SZ
STEP = 2.8
STEPS = [(-9.33, 3), (0.0, 2), (9.33, 1)]           # (x centre, level): the stair falls away to the right
for x, n in STEPS:
    h = STEP * n
    o = tk.rbox('step_hi', (9.33, 14.0, h), centre=(x, 0.0, SZ + h / 2), bevel=0.4, segs=2)
    tk.push(o, lambda V, N, h=h: 0.18 * (np.abs(V[:, 2] - SZ - h + 0.5) < 0.22))      # a moulded nosing on each tread
    tk.set_region(o, 'base')
    b['hi'].append(o)
    b['lo'].append(tk.rbox('step', (9.33, 14.0, h), centre=(x, 0.0, SZ + h / 2), bevel=0, segs=0))
kit.connector(F, 'in', (-14.0, 0.0, 0.0))
kit.connector(F, 'out', (14.0, 0.0, 0.0))
TOP = SZ + STEP * 3
MX = -9.6                                            # the monkey stands here, facing -x (its back to the drop)

# ------------------------------------------------------------------ the acrobat (built facing -y, then turned to face -x)
m_lo, m_hi = [], []
LEGS = []
for sx in (1, -1):
    lo, hi = ak.spine('leg', [(sx * 1.5, 0.2, 0.0), (sx * 1.6, 0.0, 2.4), (sx * 1.4, 0.0, 4.6)], [2.2, 2.0, 2.4], 1.1, n=8, up=(0, -1, 0),
                      tris=20, region='tights', cap0='round', cap1='round')
    m_lo.append(lo)
    m_hi += hi
    ft = tk.lathe('foot', [(0, 0), (1.1, 0.0), (1.2, 0.6), (0.9, 1.0), (0, 1.1)], n=6, centre=(sx * 1.5, -0.6, 0.0))
    tk.scale(ft, (1.0, 1.6, 1.0), pivot=(sx * 1.5, -0.6, 0.0))
    fh = tk.copy(ft, 'foot_hi')
    tk.subsurf(fh, 2)
    tk.set_region(fh, 'skin')
    m_lo.append(ft)
    m_hi.append(fh)
JK = [(4.0, 0.0, 6.2, 2.8, 2.8, 2.2), (6.4, 0.0, 6.6, 3.0, 2.8, 2.2), (9.0, -0.1, 6.4, 2.8, 2.6, 2.3), (10.0, 0.0, 3.6, 1.8, 1.8, 2.0)]
jk_lo, jk_hi = ak.stack('jacket', JK, n=12, tris=70, region='jacket', cap0='round', cap1='round')
tk.push(jk_hi[0], lambda V, N: 0.25 * np.exp(-((V[:, 2] - 5.2) / 0.35) ** 2))     # the sash
m_lo.append(jk_lo)
m_hi += jk_hi
for sx in (1, -1):    # arms flung up over its head, ready
    lo, hi = ak.spine('arm', [(sx * 2.8, 0.0, 9.0), (sx * 3.6, -0.4, 11.6), (sx * 3.2, -0.6, 14.4)], [1.8, 1.6, 1.5], 0.85, n=8,
                      up=(0, -1, 0), tris=18, region='jacket', cap0='round', cap1='round')
    m_lo.append(lo)
    m_hi += hi
    hd = tk.lathe('hand', [(0, -0.9), (0.8, -0.6), (0.9, 0.2), (0.6, 0.8), (0, 0.9)], n=6, centre=(sx * 3.1, -0.6, 15.4))
    hh = tk.copy(hd, 'hand_hi')
    tk.subsurf(hh, 1)
    tk.set_region(hh, 'skin')
    m_lo.append(hd)
    m_hi.append(hh)
HC = (0.0, -0.3, 13.0)
hp = [(0, -3.2), (2.4, -2.7), (3.3, -0.4), (3.1, 1.4), (2.0, 2.8), (0, 3.2)]
h_hi = tk.lathe('head_hi', hp, n=16, centre=HC)
tk.subsurf(h_hi, 1)


def sc_head(V, N):
    front = tk.smoothstep(-0.3, -0.8, N[:, 1])
    d = 0.4 * front * (((V[:, 0] / 2.4) ** 2 + ((V[:, 2] - HC[2] + 0.4) / 2.2) ** 2) < 1)        # the raised face
    d += tk.bump(np.asarray(V), (0, HC[1] - 3.2, HC[2] - 1.0), 1.2, 0.5) * front                 # the muzzle
    return d


tk.push(h_hi, sc_head)
tk.regions(h_hi, 'fur', [('gofun', lambda C, N: (N[:, 1] < -0.35) & (((C[:, 0] / 2.6) ** 2 + ((C[:, 2] - HC[2] + 0.4) / 2.4) ** 2) < 1))])
m_hi.append(h_hi)
m_lo.append(tk.lathe('head', hp, n=8, centre=HC))
for sx in (1, -1):
    c = (sx * 3.2, 0.2, HC[2] + 0.3)
    for nm_, n_ in (('ear', 5), ('ear_hi', 12)):
        o = tk.lathe(nm_, [(0, -0.3), (1.0, -0.25), (1.2, 0.0), (1.0, 0.25), (0, 0.3)], n=n_, axis='X', centre=c)
        if nm_ == 'ear_hi':
            tk.subsurf(o, 1)
            tk.set_region(o, 'skin')
            m_hi.append(o)
        else:
            m_lo.append(o)
tf_lo, tf_hi = ak.spine('topknot', [(0, 0.4, HC[2] + 3.0), (0, 0.8, HC[2] + 4.4), (0, 0.0, HC[2] + 5.0)], [1.6, 1.4, 0.6], 1.0, n=6, up=(0, -1, 0),
                        tris=12, region='fur', cap0='round', cap1='round')
tl_lo, tl_hi = ak.spine('tail', [(0, 2.6, 4.6), (0.4, 5.0, 5.6), (0.6, 5.6, 8.2), (0.2, 4.4, 9.6)], [1.4, 1.2, 1.0, 0.8], 0.6, n=6,
                        up=(1, 0, 0), tris=24, region='fur', cap0='round', cap1='round')
m_lo += [tf_lo, tl_lo]
m_hi += tf_hi + tl_hi
MZ = 7.0                                            # its middle (the somersault's pivot), above its feet
from mathutils import Matrix  # noqa: E402
M = Matrix.Translation((MX, 0.0, TOP)) @ Matrix.Rotation(math.radians(-90), 4, 'Z')    # face -x
for o in m_lo + m_hi:
    tk.transform(o, M)

# ------------------------------------------------------------------ parts
F.part('base', tk.join(b['lo'], 'base'), b['hi'], kind='gloss')
F.part('key', b['key'][0], b['key'][1], bone='key', kind='metal')
F.part('monkey', tk.join(m_lo, 'monkey'), m_hi, bone='monkey')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('key', b['KEY'], parent='root')
    R.bone('monkey', (MX, 0.0, TOP + MZ), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        k('root', 0)
        k('monkey', 0)
        kr.wind(k, 0, 12, 2)
        kr.unwind(k, 12, 110, 2)
        # two back somersaults down the stair (+x, one step each), each a full turn about y through its middle
        k('monkey', 14, rot=('Y', 0.0))
        k('monkey', 18, move=(0, 0, 0.4), rot=('Y', -6))             # it gathers itself
        for j, (f0, x0, z0) in enumerate(((20, 0.0, 0.0), (40, 9.33, -STEP))):
            for i in range(1, 9):
                t = i / 8
                k('monkey', f0 + 2 * i, move=(x0 + 9.33 * t, 0, z0 - STEP * t + 6.0 * math.sin(math.pi * t)), rot=('Y', 360.0 * t),
                  ease='LINEAR')
            k('monkey', f0 + 18, move=(x0 + 9.33, 0, z0 - STEP), rot=('Y', 360.0))
            k('monkey', f0 + 20, move=(x0 + 9.33, 0, z0 - STEP), rot=('Y', 360.0))
        # a bow at the bottom, then it scampers back up, two hops
        k('monkey', 66, move=(18.66, 0, -2 * STEP), rot=('Y', 360.0))
        k('monkey', 72, move=(18.66, 0, -2 * STEP), rot=[('Y', 360.0), ('Y', -24)])
        k('monkey', 78, move=(18.66, 0, -2 * STEP), rot=('Y', 360.0))
        k('monkey', 82, move=(15.5, 0, -2 * STEP + 5.0), rot=('Y', 360.0))
        k('monkey', 86, move=(9.33, 0, -STEP + 3.0), rot=('Y', 360.0))
        k('monkey', 92, move=(9.33, 0, -STEP), rot=('Y', 360.0))
        k('monkey', 96, move=(6.2, 0, -STEP + 5.0), rot=('Y', 360.0))
        k('monkey', 100, move=(0, 0, 3.0), rot=('Y', 360.0))
        k('monkey', 106, move=(0, 0, 0), rot=('Y', 360.0), ease='BOUNCE')
        k('monkey', 110, rot=('Y', 360.0))
        k('root', 110)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kr.paint_base(P, pt, sh)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    # gold nosings on the stair treads
    bs = P.region('base')
    for x, n in STEPS:
        P.fill(bs & (np.abs(Z - SZ - STEP * n + 0.5) < 0.3) & (np.abs(X - x) < 4.7), GOLD, tone=sh, base=0.1)
    P.fill('jacket', pt.ramp('#b3282c', 7, shift=0.07), tone=sh, base=0.0)
    jk = P.region('jacket')
    P.fill(jk & ((np.abs(np.mod((Yc + Z) * 0.9, 1.6) - 0.8) < 0.1) | (np.abs(np.mod((Yc - Z) * 0.9, 1.6) - 0.8) < 0.1)), GOLD, tone=sh, base=0.05)
    P.fill(jk & (np.abs(Z - TOP - 5.2) < 0.45), GOLD, tone=sh, base=0.1)
    P.fill('tights', pt.ramp('#efeae0', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('fur', pt.ramp('#7a5a3a', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('skin', pt.ramp('#d88a78', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('gofun', pt.ramp('#f4f0e8', 5, shift=0.03), tone=sh, base=0.25)
    import face
    fc = face.Face(P, c=(MX - 3.4, 0.0, TOP + HC[2]), axis=(-1, 0, 0.1), where=P.region('gofun'), seed=811)
    fc.patch(0.0, 0.6, 2.0, 1.1, '#d8584a')                         # the red mask round its eyes, finely painted
    fe = face.Face(P, c=(MX - 3.4, 0.0, TOP + HC[2]), axis=(-1, 0, 0.1), where=P.region('gofun'), seed=812)
    fe.eyes('dot', spread=1.9, size=0.3, dy=0.6)
    fe.nose('nostrils', dy=-0.6, size=0.35)
    fe.mouth('upturn', w=1.2, dy=-1.4, weight=0.22)
    P.lines(['jacket'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('key', 'base')], cam=((62, -90, 56), (0, 0, 12)), fold=(0, 24, 28, 56), frames=110)
