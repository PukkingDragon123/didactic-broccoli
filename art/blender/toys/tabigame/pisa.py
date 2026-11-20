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
T = Turtle(B, L=27.0, W=22.0, clr=2.6, dome=6.4, neck=1.1, head=1.35, legs='webbed', flat_top=0.5, sp='slider')
T.turn_head(22, -8)   # a nervous glance back at the tower
z0 = T.top - 1.2
B.add('shell', turn('footing', [(0, 0), (7.6, 0), (7.8, 0.8), (7.2, 1.8), (0, 1.8)], (0, 0, z0), 'stone', tris=40, n=16))
TB = (0, 0, z0 + 1.8)   # the tower's foot (the lean's pivot)
LEAN = 6.5
prof = [(0, 0), (5.0, 0)]
z = 0.0
ZS = []
for k_ in range(5):
    h = 4.0 if k_ == 0 else 3.0
    prof += [(5.0, z + h - 0.5), (5.45, z + h - 0.4), (5.45, z + h)]
    ZS.append((z, h))
    z += h
prof += [(3.9, z), (3.9, z + 2.8), (4.3, z + 3.0), (4.2, z + 3.4), (3.0, z + 3.9), (0, z + 4.3)]
ZT = z


def arcades(h):
    def f(V, N):
        x, y, zz = V[:, 0], V[:, 1], V[:, 2] - TB[2]
        r = np.hypot(x, y)
        a = np.arctan2(y, x)
        col = np.abs(np.mod(a * 12 / (2 * np.pi), 1.0) - 0.5) * 2   # 0 mid-arch .. 1 at a column
        d = np.zeros(len(V))
        for z_, h_ in ZS:
            lz = zz - z_
            top = h_ - 0.9 - 0.55 * col ** 2
            d -= 0.4 * ((col < 0.62) & (lz > 0.35) & (lz < top) & (r > 4.6) & (r < 5.2))
        return d
    tk.push(h, f)


# the game mesh: the turned tower as it is, twelve crisp sides (a decimated cylinder crumples); the sculpt: its arcades
tw_lo = tk.lathe('tower', prof, n=12, centre=TB)
tw_lo['facet'] = 1
tw_hi = tk.lathe('tower_hi', prof, n=24, centre=TB)
tk.subsurf(tw_hi, 2)
arcades(tw_hi)
tk.regions(tw_hi, 'marble', [('belfry', lambda C, N: C[:, 2] > TB[2] + ZT + 2.7)])
for o in (tw_lo, tw_hi):
    tk.rotate(o, LEAN, 'Y', pivot=TB)
B.add('shell', (tw_lo, tw_hi))
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
    # (the slider's yellow stripes and red ear patches: paint_turtle, from the real animal)
    P.fill('stone', pt.ramp('#b8b2a4', 6, shift=0.04), tone=sh, base=0.05)
    mr = P.region('marble')
    P.fill(mr, pt.ramp('#efe9dc', 7, shift=0.04), tone=sh, base=0.2, brush={'preset': 'pvc', 'flow': 'down'})
    d = P.pos - np.asarray(TB)
    ca, sa = np.cos(np.radians(-LEAN)), np.sin(np.radians(-LEAN))
    lx, lz0 = d[:, :, 0] * ca + d[:, :, 2] * sa, -d[:, :, 0] * sa + d[:, :, 2] * ca   # (tower space: the lean undone)
    r = np.hypot(lx, d[:, :, 1])
    col = np.abs(np.mod(np.arctan2(d[:, :, 1], lx) * 12 / (2 * np.pi), 1.0) - 0.5) * 2
    niche = np.zeros(r.shape, bool)
    for z_, h_ in ZS:
        lz = lz0 - z_
        niche |= (col < 0.6) & (lz > 0.35) & (lz < h_ - 0.9 - 0.55 * col ** 2) & (r < 5.3)
    P.fill(mr & niche, pt.ramp('#a8a296', 5, shift=0.04), tone=sh, base=-0.1, brush=False)   # the arcades' shade
    vein = np.abs(np.sin(X * 2.1 + Z * 0.9 + np.sin(Y * 1.7) * 1.5)) < 0.05
    P.shift(mr & vein & ~niche, -1)
    P.fill('belfry', pt.ramp('#c8b48a', 6, shift=0.05), tone=sh, base=0.1)
    turtle_face(P, T, 917)
    P.lines(['marble'], ['stone', 'shell', 'marginal'], step=1)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint)
