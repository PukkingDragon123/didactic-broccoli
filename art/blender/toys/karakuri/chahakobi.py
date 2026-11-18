"""茶運びタヌキ Tea-Carrier Tanuki: series karakuri, Edo Wind-Up Automata (concepts_B.md).

An Edo tea-serving automaton made as a tanuki: a big head with a gofun-white face and finely painted features, a
red brocade kimono with a gold diamond pattern over dark striped hakama, holding out a black lacquer tray with a tea
bowl on it, its fat tail behind; it stands at the back of a black-lacquer base with a gear window in front, the
whalebone spring behind its hatch, and a brass key in its side; it runs on four little brass wheels that peek out
under its hem, as the real tea-carriers do.
Gimmick (wind-up): the key winds; it rolls forward on its wheels with its tea, stops, bows deeply, rises and rolls back
as the key unwinds.

    tools/blender.sh art/blender/toys/karakuri/chahakobi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
sys.path.insert(0, HERE)
import _kr as kr  # noqa: E402

F = bk.start('karakuri', 'chahakobi')
b = kr.base(F)
SZ = kr.SZ
DY = 4.0          # the doll stands at the back of the base; it glides forward to DY - 7

# ------------------------------------------------------------------ the doll: pleated hakama, brocade kimono, the tray held out
LIFT = 1.3        # the hem rides this high over the base, on its wheels
WR = 1.15         # wheel radius
HK = [(SZ + LIFT, DY + 0.4, 11.0, 5.2, 5.4, 2.2), (SZ + 3.0, DY + 0.3, 10.0, 4.8, 5.0, 2.2), (SZ + 6.4, DY + 0.2, 8.6, 4.2, 4.2, 2.2),
      (SZ + 7.6, DY + 0.2, 8.4, 4.0, 4.0, 2.2)]


def sc_hk(h):
    def f(V, N):
        a = np.arctan2(V[:, 0], -(V[:, 1] - DY))
        return 0.3 * (np.mod(a * 10 / (2 * math.pi), 1.0) - 0.5) * tk.smoothstep(SZ + 7.0, SZ + 1.0 + LIFT, V[:, 2]) - 0.3 * np.exp(-((V[:, 2] - SZ - 6.9) / 0.3) ** 2)
    tk.push(h, f)


hk_lo, hk_hi = ak.stack('hakama', HK, n=20, tris=120, sculpt=sc_hk, region='hakama', cap0='flat', cap1='round')
UP = [(SZ + 6.8, DY + 0.2, 8.6, 4.2, 4.2, 2.2), (SZ + 10.0, DY + 0.1, 8.8, 4.2, 3.8, 2.2), (SZ + 12.6, DY, 8.8, 3.6, 3.4, 2.4),
      (SZ + 13.8, DY, 5.0, 2.4, 2.4, 2.0)]


def sc_up(h):
    def f(V, N):
        z = V[:, 2]
        return -0.3 * np.exp(-((V[:, 0] - 0.5 + (z - SZ - 13.2) * 0.45) / 0.25) ** 2) * (z > SZ + 8.0) * (V[:, 1] < DY - 1.5)   # the collar's crossover
    tk.push(h, f)


up_lo, up_hi = ak.stack('kimono', UP, n=14, tris=90, sculpt=sc_up, region='kimono', cap0='flat', cap1='round')
TRAY = (0.0, DY - 6.6, SZ + 11.0)
arms_lo, arms_hi = [], []
for sx in (1, -1):
    sh = (sx * 4.0, DY, SZ + 12.4)
    hand = (sx * 2.8, TRAY[1] + 0.8, TRAY[2] - 0.6)
    lo, hi = ak.spine('sleeve', [sh, (sx * 4.8, DY - 2.4, SZ + 10.8), (sx * 3.4, DY - 4.6, SZ + 10.4)], [2.6, 3.2, 3.6], [1.6, 2.2, 2.6],
                      n=8, up=(0, 0, 1), tris=30, region='kimono', cap0='round', cap1='flat')
    arms_lo.append(lo)
    arms_hi += hi
    lo, hi = ak.spine('paw', [(sx * 3.3, DY - 4.6, SZ + 10.4), hand], [1.5, 1.4], 0.8, n=6, up=(0, 0, 1), tris=12, region='fur',
                      cap0='round', cap1='round')
    arms_lo.append(lo)
    arms_hi += hi
tray_hi = tk.lathe('tray_hi', [(0, -0.3), (3.0, -0.3), (3.3, 0.3), (3.0, 0.4), (2.8, 0.0), (0, 0.0)], n=18, centre=TRAY)
tk.subsurf(tray_hi, 1)
tk.set_region(tray_hi, 'lac')
tray_lo = tk.lathe('tray', [(0, -0.3), (3.3, -0.3), (3.3, 0.4), (0, 0.0)], n=9, centre=TRAY)
BOWL = (TRAY[0], TRAY[1], TRAY[2] + 0.1)
bowl_hi = tk.lathe('bowl_hi', [(0, 0), (0.9, 0.0), (1.0, 0.4), (1.9, 1.4), (2.0, 2.4), (1.8, 2.4), (1.6, 1.6), (0, 1.5)], n=16, centre=BOWL)
tk.subsurf(bowl_hi, 1)
tk.set_region(bowl_hi, 'bowl')
bowl_lo = tk.lathe('bowl', [(0, 0), (1.0, 0.0), (2.0, 2.4), (1.6, 1.6), (0, 1.5)], n=8, centre=BOWL)
TAIL = [(0, DY + 4.4, SZ + 2.8), (0.8, DY + 7.2, SZ + 3.4), (1.2, DY + 8.4, SZ + 5.2), (0.8, DY + 7.8, SZ + 7.0)]
tl_lo, tl_hi = ak.spine('tail', TAIL, [3.0, 4.2, 4.0, 2.0], [2.4, 3.4, 3.2, 1.6], n=10, up=(0, 0, 1), tris=40, region='fur',
                        cap0='round', cap1='round')
tk.push(tl_hi[0], lambda V, N: 0.15 * np.cos(V[:, 2] * 3.0 + V[:, 0] * 2.0) ** 6)
# the wheels: two brass axles under the hem, front and back, a spoked wheel at each end
WHEELS = {'whf': DY - 3.7, 'whb': DY + 3.4}
WZ = SZ + WR
wh = {}
for bn, wy in WHEELS.items():
    lo_, hi_ = [], []
    for sx in (1, -1):
        c = (sx * 3.1, wy, WZ)
        prof = [(0, -0.45), (WR * 0.8, -0.45), (WR, -0.3), (WR, 0.3), (WR * 0.8, 0.45), (0, 0.45)]
        h_ = tk.lathe(bn + '_hi', prof, n=20, axis='X', centre=c)
        tk.subsurf(h_, 1)

        def spokes(V, N, c=c):
            r = np.hypot(V[:, 1] - c[1], V[:, 2] - c[2])
            a = np.arctan2(V[:, 2] - c[2], V[:, 1] - c[1])
            side = np.abs(N[:, 0]) > 0.6
            return -0.25 * side * (r < WR * 0.72) * (r > 0.3) * (np.abs(np.sin(a * 3)) > 0.35)    # six spokes, cut through
        tk.push(h_, spokes)
        tk.set_region(h_, 'brass')
        hi_.append(h_)
        lo_.append(tk.lathe(bn, [(0, -0.45), (WR, -0.35), (WR, 0.35), (0, 0.45)], n=8, axis='X', centre=c))
    wh[bn] = (tk.join(lo_, bn), hi_)

# ------------------------------------------------------------------ the head: big, as on the old dolls; a gofun-white face
HZ = SZ + 19.2
HEAD = [(0, DY + 4.4, HZ), (0, DY + 1.6, HZ + 0.4), (0, DY - 1.8, HZ + 0.2), (0, DY - 4.2, HZ - 1.4), (0, DY - 5.6, HZ - 1.8)]
hd_lo, hd_hi = ak.spine('head', HEAD, [9.0, 13.6, 13.6, 7.0, 4.4], [4.8, 6.0, 5.8, 3.0, 2.0], [4.8, 5.8, 5.6, 3.0, 2.0], e=2.2, n=14,
                        up=(0, 0, 1), tris=150, region='fur')


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        d += tk.bump(V, (sx * 5.0, DY - 1.6, HZ - 2.4), 3.0, 0.8)       # round cheeks
    d += tk.bump(V, (0, DY - 6.0, HZ - 1.4), 1.0, 0.45)                 # the nose
    return d


tk.push(hd_hi[0], sc_head)
tk.regions(hd_hi[0], 'fur', [('gofun', lambda C, N: (N[:, 1] < -0.2) & (C[:, 1] < DY - 1.0))])
ears_lo, ears_hi = [], []
for sx in (1, -1):
    c = (sx * 4.4, DY + 1.2, HZ + 5.0)
    for nm_, n_, lst in (('ear', 5, ears_lo), ('ear_hi', 14, ears_hi)):
        o = tk.lathe(nm_, [(0, -0.6), (1.6, -0.5), (1.9, 0.0), (1.6, 0.5), (0, 0.6)], n=n_, axis='Y', centre=c)
        tk.rotate(o, sx * -22, 'Y', pivot=c)
        lst.append(o)
    tk.subsurf(ears_hi[-1], 1)
    tk.set_region(ears_hi[-1], 'fur')

# ------------------------------------------------------------------ parts
F.part('base', tk.join(b['lo'], 'base'), b['hi'], kind='gloss')
F.part('key', b['key'][0], b['key'][1], bone='key', kind='metal')
F.part('legs', tk.join([hk_lo, tl_lo], 'legs'), hk_hi + tl_hi, bone='doll')
F.part('upper', tk.join([up_lo] + arms_lo + [tray_lo, bowl_lo], 'upper'), up_hi + arms_hi + [tray_hi, bowl_hi], bone='upper', kind='gloss')
F.part('head', tk.join([hd_lo] + ears_lo, 'head'), hd_hi + ears_hi, bone='head')
for bn, (lo_, hi_) in wh.items():
    F.part(bn, lo_, hi_, bone=bn, kind='metal')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('key', b['KEY'], parent='root')
    R.bone('doll', (0, DY, SZ), parent='root')
    R.bone('upper', (0, DY, SZ + 7.0), parent='doll')
    R.bone('head', (0, DY, SZ + 13.6), parent='upper')
    for bn, wy in WHEELS.items():
        R.bone(bn, (0, wy, WZ), parent='doll')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'key', 'doll', 'upper', 'head'] + list(WHEELS)
        roll = math.degrees(7.0 / WR) / 6                 # the wheels' turn per step of the glide
        for bn in bones:
            k(bn, 0)
        kr.wind(k, 0, 12, 2)
        kr.unwind(k, 12, 104, 2)
        # 14-40 it glides forward with its tea (a little rocking gait), 40-46 stops, 46-58 bows deeply, 58-64 rises
        k('doll', 14)
        for i, f in enumerate((18, 22, 26, 30, 34, 38)):
            k('doll', f, move=(0, -7.0 * (i + 1) / 6, 0), rot=('Z', 3 if i % 2 == 0 else -3), ease='LINEAR')
            for bn in WHEELS:
                k(bn, f, rot=('X', roll * (i + 1)), ease='LINEAR')
        k('doll', 42, move=(0, -7.0, 0))
        for bn in WHEELS:
            k(bn, 14)
            k(bn, 42, rot=('X', roll * 6))
            k(bn, 66, rot=('X', roll * 6))
        k('upper', 44)
        k('upper', 52, rot=('X', 26))
        k('head', 44)
        k('head', 52, rot=('X', 10))
        k('upper', 58, rot=('X', 26))
        k('head', 58, rot=('X', 10))
        k('upper', 64)
        k('head', 64)
        # 66-100 and glides back to where it started
        k('doll', 66, move=(0, -7.0, 0))
        for i, f in enumerate((70, 75, 80, 85, 90, 95)):
            k('doll', f, move=(0, -7.0 + 7.0 * (i + 1) / 6, 0), rot=('Z', 3 if i % 2 == 0 else -3), ease='LINEAR')
            for bn in WHEELS:
                k(bn, f, rot=('X', roll * (5 - i)), ease='LINEAR')
        for bn in bones:
            if bn != 'key':
                k(bn, 104)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kr.paint_base(P, pt, sh)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    # red brocade with a gold diamond (hishi) lattice; dark indigo hakama with fine pale stripes
    P.fill('kimono', pt.ramp('#b3282c', 7, shift=0.07), tone=sh, base=0.0)
    km = P.region('kimono')
    u, v = (X + Z) * 0.75, (X - Z) * 0.75
    P.fill(km & ((np.abs(np.mod(u, 2.0) - 1.0) < 0.12) | (np.abs(np.mod(v, 2.0) - 1.0) < 0.12)), GOLD, tone=sh, base=0.05)
    P.fill('hakama', pt.ramp('#2a3050', 7, shift=0.07), tone=sh, base=0.0)
    P.fill(P.region('hakama') & (np.abs(np.mod(np.arctan2(X, -(Yc - DY)) * 6.0, 1.0) - 0.5) < 0.05), pt.ramp('#8a92b0', 4), tone=sh)
    P.fill('lac', pt.ramp('#1d1a20', 6, shift=0.05, light=0.6), tone=sh * 1.3, base=0.0)
    P.fill(P.region('lac') & (P.on[:, :, 2] > 0.8) & (np.hypot(X - TRAY[0], Yc - TRAY[1]) > 2.4), GOLD, tone=sh, base=0.1)   # its gold rim
    P.fill('bowl', pt.ramp('#5a6a4a', 6, shift=0.06), tone=sh, base=0.0)                    # an oribe-green tea bowl
    P.fill(P.region('bowl') & (P.on[:, :, 2] > 0.7) & (Z > BOWL[2] + 1.4), pt.ramp('#8aa04a', 4), tone=sh, base=0.15)  # the tea
    P.fill('fur', pt.ramp('#8a6a48', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('gofun', pt.ramp('#f4f0e8', 5, shift=0.03), tone=sh, base=0.25)
    import face
    fc = face.Face(P, c=(0.0, DY - 5.0, HZ + 0.8), axis=(0, -1, 0.2), where=P.region('gofun'), seed=801)
    for sx in (1, -1):    # the tanuki's mask as the doll-painters drew it: one fine brown sweep under each eye, down the cheek
        fc.stroke([(sx * 1.4, -0.9), (sx * 2.6, -1.3), (sx * 3.6, -0.7), (sx * 4.0, 0.2)], weight=0.35, col='#6a4a34')
    fc.eyes('dot', spread=4.8, size=0.36, dy=-0.1)
    fc.brows('raised', spread=4.8, dy=2.0, w=1.4, weight=0.22)
    sn = face.Face(P, c=(0.0, DY - 6.2, HZ - 1.2), axis=(0, -1, 0.1), where=P.region('gofun'), seed=803)
    sn.nose('button', dy=0.2, size=0.5)
    sn.mouth('upturn', w=1.4, dy=-1.0, weight=0.25)
    sn.blush(2.8, -0.6, rx=0.9, ry=0.5)
    P.lines(['lac', 'bowl'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('legs', 'base'), ('key', 'base'), ('upper', 'legs'), ('head', 'upper'), ('whf', 'legs'), ('whb', 'legs'),
                                 ('whf', 'base'), ('whb', 'base')],
       cam=((62, -90, 56), (0, 0, 14)), fold=(0, 12, 42, 52), frames=104)
