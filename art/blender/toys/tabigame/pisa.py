"""ななめのとうガメ Leaning Tower Slider (series tabigame, World Tour Turtles): a red-eared slider with a round white
marble bell tower on its back, six storeys of arcades and cornices and a belfry on top, leaning (of course) to one
side. It glances at it nervously.
Gimmick: head and legs in, the tower lifts off, leans further, and settles back.

    tools/blender.sh art/blender/toys/tabigame/pisa.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kame import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('tabigame', 'pisa')
B = Build()
T = Turtle(B, L=27.0, W=22.0, clr=2.6, dome=6.4, neck=1.1, head=1.1, legs='webbed', flat_top=0.5)
for a, b in B.p['head']:   # a nervous glance back at the tower
    for o in (a, b):
        tk.rotate(o, 22, 'Z', pivot=T.NECK)
        tk.rotate(o, -8, 'X', pivot=T.NECK)
z0 = T.top - 1.2
B.add('shell', turn('footing', [(0, 0), (7.6, 0), (7.8, 0.8), (7.2, 1.8), (0, 1.8)], (0, 0, z0), 'stone', tris=40, n=16))
TB = (0, 0, z0 + 1.8)   # the tower's foot (the lean's pivot)
prof = [(0, 0), (5.0, 0)]
z = 0.0
ZS = []
for k_ in range(6):
    h = 3.6 if k_ == 0 else 2.5
    prof += [(5.0, z + 0.05), (5.0, z + h - 0.55), (5.5, z + h - 0.4), (5.5, z + h - 0.05)]
    ZS.append((z, h))
    z += h
prof += [(3.9, z), (3.9, z + 2.8), (4.3, z + 3.0), (4.2, z + 3.4), (3.0, z + 3.9), (0, z + 4.3)]
ZT = z


def arcades(h):
    def f(V, N):
        x, y, zz = V[:, 0], V[:, 1], V[:, 2] - TB[2]
        r = np.hypot(x, y)
        a = np.arctan2(y, x)
        col = np.abs(np.mod(a * 14 / (2 * np.pi), 1.0) - 0.5) * 2   # 0 mid-arch .. 1 at a column
        d = np.zeros(len(V))
        for z_, h_ in ZS:
            lz = zz - z_
            top = h_ - 0.9 - 0.55 * col ** 2
            inside = (col < 0.62) & (lz > 0.35) & (lz < top) & (r > 4.6) & (r < 5.2)
            d -= 0.45 * inside
        bz = zz - ZT   # the belfry's arches
        bc = np.abs(np.mod(a * 8 / (2 * np.pi), 1.0) - 0.5) * 2
        d -= 0.4 * ((bc < 0.55) & (bz > 0.4) & (bz < 2.2 - 0.4 * bc ** 2) & (r > 3.5) & (r < 4.1))
        return d
    tk.push(h, f)


tw = turn('tower', prof, TB, ('marble', [('belfry', lambda C, N: C[:, 2] > TB[2] + ZT + 2.7)]), tris=230, n=20, sculpt=arcades, hi=3)
for o in tw:
    tk.rotate(o, 6.5, 'Y', pivot=TB)
B.add('shell', tw)
T.commit(F)


def make_rig():
    R = T.rig(F)
    with R.action('gimmick'):
        shell_keys(R.key, T, rot_axis='Y', spin=7.0, lift=6.0)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_turtle(P, pt, sh, T, '#4e6a3a', '#4a5630', scute='#6a7a3a', plast='#e0cc70', beak='#5a6a3a', vest=('#f2efe6', '#c8402a'))
    sk = P.region('skin') | P.region('face')
    stripe = np.abs(np.mod(Z * 1.3 + X * 0.35, 1.3) - 0.65) < 0.13
    P.fill(sk & stripe & (Z > 1.5), pt.ramp('#e8d050', 5, shift=0.05), tone=sh, base=0.1)
    HC, hk = T.HC, T.hk
    for sx in (1, -1):   # the red flash behind each eye
        c = np.array((sx * 2.6 * hk, HC[1] + 0.6 * hk, HC[2] + 0.4 * hk))
        cr = np.array(c)
        # (the head is turned: rotate the mark's centre with it)
        ang = np.radians(22)
        rx, ry = cr[0] - T.NECK[0], cr[1] - T.NECK[1]
        cr[0], cr[1] = T.NECK[0] + rx * np.cos(ang) - ry * np.sin(ang), T.NECK[1] + rx * np.sin(ang) + ry * np.cos(ang)
        d = np.linalg.norm(P.pos - cr, axis=2)
        P.fill(sk & (d < 1.0 * hk), pt.ramp('#c8302a', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('stone', pt.ramp('#b8b2a4', 6, shift=0.04), tone=sh, base=0.05)
    mr = P.region('marble')
    P.fill(mr, pt.ramp('#efe9dc', 7, shift=0.04), tone=sh, base=0.2, brush={'preset': 'pvc', 'flow': 'down'})
    P.fill(mr & (P.cav > 0.6), pt.ramp('#9a948a', 5, shift=0.04), tone=sh, base=0.0, brush=False)   # the arcades' shade
    vein = np.abs(np.sin(X * 2.1 + Z * 0.9 + np.sin(Y * 1.7) * 1.5)) < 0.06
    P.shift(mr & vein, -1)
    P.fill('belfry', pt.ramp('#c8b48a', 6, shift=0.05), tone=sh, base=0.1)
    turtle_face(P, T, 917, yaw=22)
    P.lines(['marble'], ['stone', 'shell', 'marginal'], step=1)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint)
