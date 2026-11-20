"""ごじゅうのとうガメ Pagoda Pond Turtle (series tabigame, World Tour Turtles): a Japanese pond turtle plodding along
with a five-storey temple pagoda for a shell: vermilion posts and white plaster walls, five dark tiled roofs with
upturned eaves, a bronze spire with its nine rings and the jewel on top, all standing on a stone footing on the crown
of its carapace. Under the shell it wears a striped vest.
Gimmick: head and legs in, the pagoda shell lifts off with a turn, drops back, out it comes.

    tools/blender.sh art/blender/toys/tabigame/pagoda.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kame import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('tabigame', 'pagoda')
B = Build()
T = Turtle(B, L=28.0, W=23.0, clr=2.8, dome=7.6, neck=1.0, head=1.4, legs='webbed', sp='pond')
z = T.top - 1.4
B.add('shell', box('footing', (13.6, 13.6, 2.0), (0, 0, z + 1.0), 'stone', tris=12))
z += 2.0
WS = [9.6, 8.4, 7.3, 6.2, 5.2]


def upturn(ew):
    def f(V):  # the eaves' corners sweep up
        x, y = V[:, 0], V[:, 1]
        c = np.clip((np.minimum(np.abs(x), np.abs(y)) - ew * 0.22) / (ew * 0.28), 0, 1) ** 2
        V = V.copy()
        V[:, 2] += 0.75 * c
        return V
    return f


def tiles(h):
    tk.push(h, lambda V, N: -0.12 * (np.abs(np.mod(V[:, 0] + V[:, 1], 0.9) - 0.45) < 0.12) * (N[:, 2] > 0.4))


for i, w in enumerate(WS):
    B.add('shell', box('wall', (w, w, 1.8), (0, 0, z + 0.9), 'wall', tris=12, bev=0.2))
    z += 1.8
    ew = w + 5.2 - 0.3 * i
    nxt = WS[i + 1] if i + 1 < len(WS) else 1.6
    B.add('shell', tier('roof', [(z - 0.3, ew * 0.88, ew * 0.88), (z + 0.35, ew, ew), (z + 0.75, ew * 0.95, ew * 0.95),
                                 (z + 1.8, nxt + 0.8, nxt + 0.8)], ('roof', [('eave', lambda C, N: C[:, 2] < z + 0.7)]),
                        tris=56, n=20, e=6.0, warp=upturn(ew), sculpt=tiles))
    z += 1.8
# the bronze spire: nine rings on a mast, a water-flame and the jewel
sp = tk.tube('spire', [(0, 0, z - 0.4), (0, 0, z + 4.0), (0, 0, z + 7.0)], [0.55, 0.48, 0.4], n=8)
B.add('shell', lowk(sp, 'spire', 40, 'bronze', sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (np.abs(np.mod(V[:, 2] - z, 0.75) - 0.37) < 0.14) * (V[:, 2] < z + 6.2))))
B.add('shell', blob('jewel', (0, 0, z + 7.6), 0.9, tris=16, region='bronze'))
TOP = z + 8.5
T.commit(F)


def make_rig():
    R = T.rig(F)
    with R.action('gimmick'):
        shell_keys(R.key, T)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_turtle(P, pt, sh, T, '#8a7a48', '#5a4a2c', scute='#7a6438', plast='#d8c080', beak='#6a5e3a')
    P.fill('stone', pt.ramp('#8a8680', 6, shift=0.04), tone=sh, base=0.05)
    P.shift(P.region('stone') & (np.abs(np.mod(Z, 0.7) - 0.35) < 0.08), -1)
    wr = P.region('wall')
    P.fill(wr, pt.ramp('#efe8d8', 6, shift=0.04), tone=sh, base=0.15)
    u = np.where(np.abs(P.on[:, :, 0]) > 0.6, Y, X)
    post = np.abs(np.mod(u + 0.6, 2.0) - 1.0) < 0.3
    P.fill(wr & post, pt.ramp('#c8402a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill(wr & (np.abs(np.mod(Z - T.top - 0.6, 3.6) - 0.9) > 0.65), pt.ramp('#c8402a', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('roof', pt.ramp('#4a4c54', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'pvc', 'flow': 'down'})
    P.shift(P.region('roof') & (np.abs(np.mod(X + Y, 0.9) - 0.45) < 0.12), -1)
    P.fill('eave', pt.ramp('#d8d2c2', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('bronze', pt.ramp('#b08a3a', 6, shift=0.08, light=0.6), tone=sh, base=0.15, brush='metal')
    turtle_face(P, T, 731)
    P.lines(['wall', 'eave'], step=1)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint)
