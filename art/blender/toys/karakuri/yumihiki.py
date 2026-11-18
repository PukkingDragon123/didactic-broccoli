"""弓曳きウサギ Archer Rabbit: series karakuri, Edo Wind-Up Automata (concepts_B.md).

The Edo bow-drawing automaton (yumihiki dōji) as a white rabbit: kneeling on a red cushion in a green brocade kimono,
sleeves tied back with a red tasuki cord, purple hakama, a leather archer's glove on the right paw. It holds a tall
lacquered yumi out over its left knee, an arrow already half drawn, and looks down the shaft at the little kasumi
target standing on a post at the far end of its black-lacquer base (gear window, whalebone spring, brass key).
Gimmick (wind-up): the key winds; it draws to the cheek and holds, looses (the string snaps straight, the bow turns
over in its hand as a real archer's does, the right arm flies open), the arrow thunks into the target, which rocks
and quivers; the rabbit bows, takes a fresh arrow out of its glove and draws it back to the ready.

    tools/blender.sh art/blender/toys/karakuri/yumihiki.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import ak  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
sys.path.insert(0, HERE)
import _kr as kr  # noqa: E402

F = bk.start('karakuri', 'yumihiki')
b = kr.base(F, w=28.0)
SZ = kr.SZ
P0 = (-7.4, 2.6)                 # the archer's seat
CZ = SZ + 0.9                    # the top of its cushion
YA, ZA = -2.15, CZ + 10.0        # the arrow's line (along +x, at the rabbit's cheek)
XB, YB = -1.4, -1.55             # the bow's grip (x) and its plane (y)
ZG = ZA - 1.1                    # the grip's middle (the arrow rests on the bow hand)
ZTU, ZTL = ZA + 10.5, ZA - 6.0   # the bow's tips: a yumi is held a third of the way up
XS = XB - 1.0                    # the string, straight between the tips
AL = 8.6                         # the arrow
XN0, XNF = XS - 1.6, -7.1        # the nock at rest (half drawn) and at full draw
TC = (11.6, YA, ZA)              # the target's middle; its paper faces x = TC - 0.45
XHIT = TC[0] + 0.45              # the arrow's tip, stuck in the target
POST = (12.45, YA, SZ + 0.8)     # the target's post (its pivot when it rocks)


def at(v):
    return (v[0] + P0[0], v[1] + P0[1], v[2])


# ------------------------------------------------------------------ the cushion and the target's foot (on the base)
zb_hi = tk.rbox('zabuton_hi', (10.8, 10.2, 0.9), centre=at((0, 0.4, SZ + 0.45)), bevel=0.42, segs=3)
tk.push(zb_hi, lambda V, N: 0.12 * N[:, 2] * (1 - np.clip(np.maximum(np.abs(V[:, 0] - P0[0]) / 5.4, np.abs(V[:, 1] - P0[1] - 0.4) / 5.1) ** 8, 0, 1)))
tk.set_region(zb_hi, 'zabuton')
b['hi'].append(zb_hi)
b['lo'].append(tk.rbox('zabuton', (10.8, 10.2, 0.9), centre=at((0, 0.4, SZ + 0.45)), bevel=0.3, segs=1))
ft_hi = tk.rbox('tfoot_hi', (3.4, 3.8, 0.8), centre=(12.0, YA, SZ + 0.4), bevel=0.3, segs=2)
tk.set_region(ft_hi, 'post')
b['hi'].append(ft_hi)
b['lo'].append(tk.rbox('tfoot', (3.4, 3.8, 0.8), centre=(12.0, YA, SZ + 0.4), bevel=0, segs=0))

# ------------------------------------------------------------------ the rabbit: kneeling hakama, brocade kimono
HAK = [(CZ, 0.4, 10.0, 5.0, 3.8, 2.6), (CZ + 1.6, 0.4, 10.2, 5.0, 4.0, 2.6), (CZ + 3.0, 0.5, 9.0, 4.0, 3.8, 2.4),
       (CZ + 4.3, 0.8, 7.4, 3.0, 3.0, 2.2)]


def sc_hak(h):
    def f(V, N):
        a = np.arctan2(V[:, 0], -(V[:, 1] - 0.4))
        pleat = 0.28 * (np.mod(a * 9 / (2 * math.pi), 1.0) - 0.5) * tk.smoothstep(CZ + 3.4, CZ + 0.6, V[:, 2])
        knees = sum(tk.bump(V, (sx * 2.4, -3.6, CZ + 2.2), 2.6, 0.5) for sx in (1, -1))
        return pleat + knees - 0.25 * np.exp(-((V[:, 2] - CZ - 4.0) / 0.3) ** 2)
    tk.push(h, f)


hk_lo, hk_hi = ak.stack('hakama', HAK, n=20, tris=130, sculpt=sc_hak, region='hakama', cap0='flat', cap1='round')
UP = [(CZ + 4.0, 0.9, 7.4, 3.0, 3.0, 2.2), (CZ + 6.4, 0.9, 7.9, 3.1, 3.0, 2.3), (CZ + 8.3, 1.0, 7.6, 2.8, 2.7, 2.4),
      (CZ + 9.5, 1.0, 4.2, 1.9, 1.9, 2.0)]


def sc_up(h):
    def f(V, N):
        z = V[:, 2]
        d = -0.3 * np.exp(-((V[:, 0] - 0.4 + (z - CZ - 8.6) * 0.45) / 0.25) ** 2) * (z > CZ + 4.6) * (V[:, 1] < -1.0)   # the collar
        d += 0.22 * np.exp(-((z - CZ - 4.6) / 0.5) ** 2)                                                                # the obi's edge
        return d
    tk.push(h, f)


up_lo, up_hi = ak.stack('kimono', UP, n=14, tris=100, sculpt=sc_up, region='kimono', cap0='flat', cap1='round')
tk.regions(up_hi[0], 'kimono', [('obi', lambda C, N: C[:, 2] < CZ + 4.9),
                                ('collar', lambda C, N: (C[:, 1] < -0.6) & (np.abs(C[:, 0] - 0.4 + (C[:, 2] - CZ - 8.6) * 0.45) < 0.5) & (C[:, 2] > CZ + 5.2))])
body_lo, body_hi = [hk_lo, up_lo], hk_hi + up_hi
for o in body_lo + body_hi:
    tk.move(o, (P0[0], P0[1], 0))

# the left arm, held out to the bow: a short tied-back sleeve, a white forearm, the paw round the grip
LS = Vector(at((3.3, 1.0, CZ + 8.2)))
GP = Vector((XB, YB - 0.15, ZG - 0.1))
LE = kr.ik2(LS, GP, 3.2, 3.2, (0.4, 0.2, -1.0))
lo, hi = ak.spine('lsleeve', [tuple(LS), tuple(LS * 0.45 + LE * 0.55), tuple(LE)], [2.7, 2.5, 2.1], 1.2, n=8, up=(0, 0, 1), tris=26,
                  region='kimono', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi
lo, hi = ak.spine('larm', [tuple(LE), tuple(LE * 0.4 + GP * 0.6), tuple(GP)], [1.6, 1.45, 1.9], [0.8, 0.75, 0.95], n=8, up=(0, 0, 1),
                  tris=26, region='fur', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi

# ------------------------------------------------------------------ the head: big, white, turned down the arrow; long ears
HC = Vector(at((0.0, 0.8, CZ + 13.2)))
TURN = 70.0
HEAD = [(0, 3.4, 0.2), (0, 1.0, 0.4), (0, -1.8, 0.1), (0, -3.6, -1.0), (0, -4.6, -1.4)]
hd_lo, hd_hi = ak.spine('head', HEAD, [6.2, 9.0, 8.8, 5.6, 3.6], [3.6, 4.5, 4.3, 2.6, 1.6], [3.6, 4.4, 4.2, 2.8, 1.8], e=2.2, n=14,
                        up=(0, 0, 1), tris=150, region='fur')


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        d += tk.bump(V, (sx * 3.2, -2.0, -1.7), 2.6, 0.7)      # round cheeks
    d += tk.bump(V, (0, -4.8, -0.8), 0.9, 0.3)                  # the nose
    d += 0.08 * np.cos(V[:, 0] * 5.0 + V[:, 2] * 3.0) ** 8 * tk.smoothstep(-0.2, 0.5, N[:, 1])   # fur on the back of the head
    return d


tk.push(hd_hi[0], sc_head)
ears_lo, ears_hi = [], []
for pts, ww in (([(1.7, 0.7, 3.4), (2.1, 1.4, 7.4), (2.3, 1.3, 11.0)], [2.0, 2.9, 1.2]),
                ([(-1.7, 0.7, 3.4), (-2.1, 1.5, 7.2), (-2.3, 1.2, 9.6), (-2.5, -0.9, 10.8)], [2.0, 2.9, 2.4, 1.1])):
    lo, hi = ak.spine('ear', pts, ww, 0.5, n=8, up=(0, 1, 0), tris=34, region='fur', cap0='round', cap1='round')
    tk.regions(hi[0], 'fur', [('earin', lambda C, N: (N[:, 1] < -0.5) & (C[:, 2] > 4.6))])
    ears_lo.append(lo)
    ears_hi += hi
HM = Matrix.Translation(HC) @ Matrix.Rotation(math.radians(TURN), 4, 'Z')
for o in [hd_lo] + hd_hi + ears_lo + ears_hi:
    tk.transform(o, HM)
FACE = Vector((math.sin(math.radians(TURN)), -math.cos(math.radians(TURN)), 0.0))   # the way its face looks
NOD = Vector((math.cos(math.radians(TURN)), math.sin(math.radians(TURN)), 0.0))     # its nodding axis

# ------------------------------------------------------------------ the right arm, drawing: upper sleeve and forearm with the glove
RS = Vector(at((-3.3, 1.0, CZ + 8.2)))
UA, FA = 4.2, 5.2
POLE = (-1.0, 0.3, 0.25)
H0 = Vector((XN0, YA, ZA))
RE0 = kr.ik2(RS, H0, UA, FA, POLE)
ru_lo, ru_hi = ak.spine('rsleeve', [tuple(RS), tuple(RS * 0.5 + RE0 * 0.5), tuple(RE0)], [2.7, 2.5, 2.1], 1.2, n=8, up=(0, 0, 1), tris=26,
                        region='kimono', cap0='round', cap1='round')
GL = RE0 + (H0 - RE0) * 0.72
rf_lo, rf_hi = ak.spine('rarm', [tuple(RE0), tuple(GL), tuple(H0 + (H0 - RE0).normalized() * 0.3)], [1.6, 1.5, 2.0], [0.8, 0.75, 1.0], n=8,
                        up=(0, 0, 1), tris=28, region='fur', cap0='round', cap1='round')
tk.regions(rf_hi[0], 'fur', [('glove', lambda C, N: np.linalg.norm(C - np.array(H0), axis=1) < 1.75)])

# ------------------------------------------------------------------ the bow: a tall asymmetric yumi, its grip wrapped, the string in two halves


def limb_x(z):
    if z >= ZG:
        u = (z - ZG) / (ZTU - ZG)
    else:
        u = (ZG - z) / (ZG - ZTL)
    return XB - 1.5 * u * u + 0.5 * max(0.0, (u - 0.85) / 0.15) ** 2


BZ = [ZTL, ZTL + 1.2, ZTL + 3.2, ZG - 1.0, ZG, ZG + 1.0, ZG + 3.6, ZG + 6.4, ZTU - 1.8, ZTU - 0.6, ZTU]
BP = [(limb_x(z), YB, z) for z in BZ]
BR = [0.2, 0.26, 0.32, 0.42, 0.46, 0.42, 0.34, 0.3, 0.26, 0.22, 0.18]
bow_hi = tk.tube('bow_hi', BP, BR, n=8, up=(0, 1, 0), squash=0.8)
tk.subsurf(bow_hi, 1)
tk.regions(bow_hi, 'bowwood', [('grip', lambda C, N: np.abs(C[:, 2] - ZG) < 1.1),
                               ('rattan', lambda C, N: (np.abs(np.mod(C[:, 2] - ZG, 3.1) - 1.55) < 0.22) & (np.abs(C[:, 2] - ZG) > 1.6))])
bow_lo = tk.tube('bow', BP, BR, n=4, up=(0, 1, 0), squash=0.8)
TU, TL = Vector((XS, YB, ZTU - 0.3)), Vector((XS, YB, ZTL + 0.3))
N0 = Vector((XN0, YA, ZA))
strings = {}
for nm, T in (('strU', TU), ('strL', TL)):
    hi = tk.tube(nm + '_hi', [tuple(T), tuple(N0)], 0.1, n=6, cap0='round', cap1='round')
    tk.set_region(hi, 'string')
    strings[nm] = (T, tk.tube(nm, [tuple(T), tuple(N0)], 0.12, n=3, cap0=None, cap1=None), [hi])

# ------------------------------------------------------------------ the arrow: bamboo shaft, hawk fletching, a steel head
TIP0 = Vector((XN0 + AL, YA, ZA))
ar_hi = [tk.tube('shaft_hi', [(XN0 + 0.1, YA, ZA), (XN0 + AL - 0.8, YA, ZA)], 0.2, n=8, cap0='round', cap1=None)]
tk.subsurf(ar_hi[0], 1)
tk.set_region(ar_hi[0], 'shaft')
hd = tk.lathe('ahead_hi', [(0, 0), (0.28, 0.0), (0.34, 0.25), (0, 1.0)], n=10, axis='X', centre=(XN0 + AL - 1.0, YA, ZA))
tk.set_region(hd, 'steel')
ar_hi.append(hd)
ar_lo = [tk.tube('shaft', [(XN0, YA, ZA), (XN0 + AL - 0.9, YA, ZA)], 0.2, n=4, cap0='flat', cap1=None),
         tk.lathe('ahead', [(0, 0), (0.34, 0.2), (0, 1.0)], n=4, axis='X', centre=(XN0 + AL - 1.0, YA, ZA))]
VANE = [(0.0, 0.0), (2.3, 0.0), (2.1, 0.62), (0.5, 0.62)]
for a in (90, 210, 330):
    for nm_, bev, lst in (('vane_hi', 0.03, ar_hi), ('vane', 0, ar_lo)):
        o = tk.slab(nm_, VANE, 0.09, plane='XZ', at=0.0, bevel=bev, segs=1 if bev else 0)
        tk.move(o, (XN0 + 0.35, 0, 0.18))
        tk.rotate(o, a - 90, 'X')
        tk.move(o, (0, YA, ZA))
        lst.append(o)
        if nm_ == 'vane_hi':
            tk.set_region(o, 'feather')

# ------------------------------------------------------------------ the target: a kasumi mato on a lacquered post
MP = [(0, -0.45), (2.85, -0.45), (3.15, -0.6), (3.35, 0.0), (3.15, 0.6), (2.85, 0.45), (0, 0.45)]
mt_hi = tk.lathe('mato_hi', MP, n=28, axis='X', centre=TC)
tk.subsurf(mt_hi, 1)
tk.regions(mt_hi, 'hoop', [('mato', lambda C, N: (np.abs(N[:, 0]) > 0.85) & (np.hypot(C[:, 1] - TC[1], C[:, 2] - TC[2]) < 2.8))])
mt_lo = tk.lathe('mato', [(0, -0.45), (3.35, -0.55), (3.35, 0.55), (0, 0.45)], n=10, axis='X', centre=TC)
pst_hi = tk.cyl('post_hi', 0.45, POST[2], ZA - 0.2, n=10, at=(POST[0], POST[1]), bevel=0.15, segs=1)
tk.set_region(pst_hi, 'post')
pst_lo = tk.cyl('post', 0.45, POST[2], ZA - 0.2, n=5, at=(POST[0], POST[1]), bevel=0, segs=0)

# ------------------------------------------------------------------ parts
F.part('base', tk.join(b['lo'], 'base'), b['hi'], kind='gloss')
F.part('key', b['key'][0], b['key'][1], bone='key', kind='metal')
F.part('body', tk.join(body_lo, 'body'), body_hi, bone='body')
F.part('head', tk.join([hd_lo] + ears_lo, 'head'), hd_hi + ears_hi, bone='head')
F.part('rsleeve', ru_lo, ru_hi, bone='rarm')
F.part('rarm', rf_lo, rf_hi, bone='rfore')
F.part('bow', bow_lo, [bow_hi], bone='bow', kind='gloss')
for nm, (T, lo, hi) in strings.items():
    F.part(nm, lo, hi, bone=nm)
F.part('arrow', tk.join(ar_lo, 'arrow'), ar_hi, bone='arrowg')
F.part('target', tk.join([mt_lo, pst_lo], 'target'), [mt_hi, pst_hi], bone='target', kind='gloss')


def string_keys(k, n, f, ease='LINEAR'):
    """Both string halves meeting at the nock point n."""
    for nm, (T, lo, hi) in strings.items():
        k(nm, f, quat=tuple(kr.qdir(N0 - T, n - T)), scale=(1.0, (n - T).length / (N0 - T).length, 1.0), ease=ease)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('key', b['KEY'], parent='root')
    R.bone('body', at((0, 0.5, CZ)), parent='root')
    R.bone('head', at((0, 1.0, CZ + 9.4)), parent='body')
    R.bone('rarm', tuple(RS), parent='body')
    R.bone('rfore', tuple(RE0), parent='rarm')
    R.bone('bow', (XB, YB, ZG), parent='body')
    for nm, (T, lo, hi) in strings.items():
        R.bone(nm, tuple(T), parent='bow', tail=tuple(T + (N0 - T).normalized() * 3.0))
    R.bone('arrow', tuple(TIP0), parent='root')
    R.bone('arrowg', (XN0, YA, ZA), parent='arrow')
    R.bone('target', POST, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key

    def hand(f, H, ease='LINEAR'):
        H = Vector(H)
        kr.arm(k, 'rarm', 'rfore', RS, RE0, H0, kr.ik2(RS, H, UA, FA, POLE), H, f, ease=ease)

    def nock(f, x, ease='LINEAR'):
        """The arrow, the hand and the string together, the nock at x."""
        k('arrow', f, move=(x - XN0, 0, 0), ease=ease)
        hand(f, (x, YA, ZA), ease)
        string_keys(k, Vector((x, YA, ZA)), f, ease)

    with R.action('gimmick'):
        bones = ['root', 'key', 'body', 'head', 'rarm', 'rfore', 'bow', 'strU', 'strL', 'arrow', 'arrowg', 'target']
        for bn in bones:
            k(bn, 0)
        kr.wind(k, 0, 12, 2)
        kr.unwind(k, 12, 104, 2)
        # 14-34 it draws to its cheek (the hand, the arrow and the string as one), 34-46 holds, aiming
        for f in range(14, 35, 2):
            nock(f, XN0 + (XNF - XN0) * kr.ease((f - 14) / 20))
        k('head', 14)
        k('head', 30, rot=(NOD, 4))
        k('head', 46, rot=(NOD, 4))
        nock(46, XNF)
        # 46 it looses: the string snaps straight (overshoots and settles), the arrow flies, the right arm flies open,
        # the bow turns over in its hand (yugaeri)
        S0 = Vector((XS, YA, ZA))
        string_keys(k, S0 + Vector((0.7, 0, 0)), 47)
        string_keys(k, S0 + Vector((-0.3, 0, 0)), 49)
        string_keys(k, S0, 51)
        string_keys(k, S0, 92)
        ZAN = (RS[0] - 5.0, YA - 0.6, ZA - 0.4)
        hand(51, ZAN, ease=None)
        hand(66, ZAN)
        k('head', 52, rot=(NOD, -3))
        k('head', 60)
        k('bow', 47)
        k('bow', 50, rot=('Z', 120))
        k('bow', 54, rot=('Z', 168))
        k('bow', 56, rot=('Z', 160))
        k('bow', 66, rot=('Z', 160))
        k('bow', 78)
        tip0 = XNF + AL
        for i, f in enumerate(range(46, 51)):
            k('arrow', f, move=(tip0 + (XHIT - tip0) * i / 4 - TIP0[0], 0, 0), ease='LINEAR')
        # 50 it hits: the target rocks back on its post, the arrow quivering in it
        piv = Vector(POST)
        hit = Vector((XHIT, YA, ZA))
        rock = {50: 0, 52: 9, 54: 2, 56: -4, 58: 1, 60: 2, 62: 0}
        wag = {50: 0, 51: 8, 52: -6, 53: 5, 54: -4, 55: 3, 56: -2, 57: 1, 58: 0}
        for f in sorted(set(rock) | set(wag) | {76}):
            ph = float(np.interp(f, sorted(rock), [rock[x] for x in sorted(rock)]))
            ps = float(np.interp(f, sorted(wag), [wag[x] for x in sorted(wag)]))
            M = Matrix.Rotation(math.radians(ph), 3, 'Y')
            tip = piv + M @ (hit - piv)
            k('arrow', f, move=tuple(tip - TIP0), rot=[('Y', ph), ('Z', ps)], ease='LINEAR')
            if f in rock:
                k('target', f, rot=('Y', ph))
        # 62-80 it bows, and its right hand comes back to the string
        k('body', 62)
        k('body', 70, rot=('X', 14))
        k('body', 74, rot=('X', 14))
        k('body', 80)
        for f in range(68, 81, 2):
            t = kr.ease((f - 66) / 14)
            hand(f, Vector(ZAN) * (1 - t) + H0 * t)
        # 76-80 the arrow in the target is pulled through (gone); 81-92 a fresh one slides out of the glove, nocked
        k('arrow', 80, move=tuple(hit - TIP0), scale=0.02, ease='CONSTANT')
        k('arrow', 81)
        k('arrowg', 80, ease='CONSTANT')
        k('arrowg', 81, scale=0.02)
        k('arrowg', 84, scale=0.02, ease='BACK')
        k('arrowg', 92)
        # 92-98 the string is hooked back to the nock in its glove
        string_keys(k, N0, 97, ease=None)
        hand(97, H0)
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
    # the cushion: scarlet wool, gold piping round its edges and a gold tassel at each corner
    P.fill('zabuton', pt.ramp('#b8262e', 6, shift=0.06), tone=sh, base=0.0)
    zb = P.region('zabuton')
    ex, ey = np.abs(X - P0[0]), np.abs(Yc - P0[1] - 0.4)
    P.fill(zb & ((np.abs(ex - 5.0) < 0.22) & (ey < 4.8) | (np.abs(ey - 4.7) < 0.22) & (ex < 5.1)), GOLD, tone=sh, base=0.1)
    P.fill(zb & (np.hypot(ex - 5.1, ey - 4.8) < 0.55), GOLD, tone=sh, base=0.1)
    # green brocade kimono, a gold tortoiseshell (kikko) lattice; white collar; dark obi; purple hakama with fine stripes
    P.fill('kimono', pt.ramp('#2f6a4a', 7, shift=0.07), tone=sh, base=0.0)
    km = P.region('kimono')
    P.fill(km & kr.kikko(X + Yc * 0.6, Z, 1.9, 0.16), GOLD, tone=sh, base=0.05)
    P.fill('collar', pt.ramp('#efe9dc', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('obi', pt.ramp('#2a2430', 6, shift=0.06), tone=sh, base=0.0)
    P.fill(P.region('obi') & (np.abs(Z - CZ - 4.5) < 0.18), GOLD, tone=sh, base=0.1)
    P.fill('hakama', pt.ramp('#4a2f62', 7, shift=0.07), tone=sh, base=0.0)
    P.fill(P.region('hakama') & (np.abs(np.mod(np.arctan2(X - P0[0], -(Yc - P0[1] - 0.4)) * 5.0, 1.0) - 0.5) < 0.05), pt.ramp('#9a86b4', 4), tone=sh)
    # the tasuki: a red cord crossed over its back, tying the sleeves
    back = km & (Yc > P0[1] + 1.4)
    for sx in (1, -1):
        P.fill(back & (np.abs((X - P0[0]) * sx - (Z - CZ - 6.6) * 0.95) < 0.3), pt.ramp('#c8303a', 4), tone=sh, base=0.1)
    P.fill(km & (np.abs(Z - CZ - 8.0) < 0.25) & (np.abs(X - P0[0]) > 2.6), pt.ramp('#c8303a', 4), tone=sh, base=0.1)
    # white fur, pink inside the ears; the leather archer's glove
    P.fill('fur', pt.ramp('#f4f0e8', 6, shift=0.03), tone=sh, base=0.25)
    P.fill('earin', pt.ramp('#efb4b4', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('glove', pt.ramp('#8a5a36', 6, shift=0.06), tone=sh, base=0.05)
    gl = P.region('glove')
    P.fill(gl & (np.abs(np.linalg.norm(P.pos - np.array(H0), axis=2) - 1.45) < 0.12), pt.ramp('#5a3620', 4), tone=sh)   # its cuff strap
    # the yumi: dark lacquered bamboo, red rattan bindings, a white leather grip; a hemp string
    P.fill('bowwood', pt.ramp('#3a2620', 6, shift=0.06, light=0.55), tone=sh * 1.2, base=0.0)
    P.fill('rattan', pt.ramp('#a82a2a', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('grip', pt.ramp('#e9ddc4', 5, shift=0.04), tone=sh, base=0.1)
    P.fill(P.region('grip') & (np.abs(np.mod((Z - ZG) * 3.0 + X * 1.2, 1.0) - 0.5) < 0.09), pt.ramp('#b8a888', 4), tone=sh)
    P.fill('string', pt.ramp('#e8dcb0', 4, shift=0.03), tone=sh, base=0.2)
    # the arrow: pale bamboo with dark nodes, white hawk feathers barred black, a steel head
    P.fill('shaft', pt.ramp('#cfae6c', 5, shift=0.05), tone=sh, base=0.1)
    P.fill(P.region('shaft') & (np.abs(np.mod(X - XN0, 2.9) - 2.3) < 0.12), pt.ramp('#7a5a32', 4), tone=sh)
    P.fill(P.region('shaft') & (X < XN0 + 0.35), pt.ramp('#1e1a1c', 3), tone=sh)
    P.fill('feather', pt.ramp('#efe8da', 5, shift=0.04), tone=sh, base=0.15)
    P.fill(P.region('feather') & (np.abs(np.mod(X - XN0, 0.7) - 0.35) < 0.12), pt.ramp('#2a2224', 4), tone=sh)
    P.fill('steel', pt.ramp('#9aa0a8', 5, shift=0.04, light=0.7), tone=sh * 1.3, base=0.1)
    # the target: a hinoki hoop, washi with the kasumi rings (the rings show through the thin paper behind, fainter)
    P.fill('hoop', pt.ramp('#c9a26a', 6, shift=0.05), tone=sh, base=0.05)
    P.fill(P.region('hoop') & (np.abs(np.mod(np.arctan2(Z - ZA, Yc - YA) * 7.0, 1.0) - 0.5) < 0.06), pt.ramp('#8a6a40', 4), tone=sh)
    P.fill('mato', pt.ramp('#f2eee4', 5, shift=0.03), tone=sh, base=0.2)
    r = np.hypot(Yc - YA, Z - ZA)
    ring = np.zeros_like(r, bool)
    for r0, r1 in ((0.62, 0.95), (1.45, 1.75), (2.2, 2.8)):
        ring |= (r > r0) & (r < r1)
    front = P.region('mato') & (X < TC[0])
    P.fill(front & ring, pt.ramp('#1e1a1c', 4), tone=sh, base=0.0)
    P.fill(P.region('mato') & (X >= TC[0]) & ring, pt.ramp('#b0aaa0', 4), tone=sh, base=0.1)
    P.fill('post', pt.ramp('#1d1a20', 6, shift=0.05, light=0.6), tone=sh * 1.3, base=0.0)
    P.fill(P.region('post') & (P.on[:, :, 2] > 0.8), GOLD, tone=sh, base=0.1)
    # the face: dot eyes, one shut to aim; a pink nose, the little rabbit mouth, blush
    import face
    c = HC + FACE * 4.2 + Vector((0, 0, -0.6))
    fc = face.Face(P, c=tuple(c), axis=(FACE[0], FACE[1], 0.15), where=P.region('fur'), seed=821)
    fc.eyes('dot', spread=4.6, size=0.4, dy=0.9, only=1)
    fc.eyes('sleepy', spread=4.6, size=0.45, dy=0.95, only=-1)
    fc.brows('worried', spread=4.6, dy=2.2, w=1.3, weight=0.2, only=-1)
    sn = face.Face(P, c=tuple(HC + FACE * 4.8 + Vector((0, 0, -1.2))), axis=(FACE[0], FACE[1], 0.1), where=P.region('fur'), seed=822)
    sn.nose('tri', dy=0.2, size=0.45, col='#e88a92')
    sn.snout_mouth('rabbit', dy=-0.25, w=1.3, weight=0.22)
    sn.blush(4.6, -0.4, rx=1.0, ry=0.55)
    P.lines(['zabuton', 'obi', 'collar', 'grip', 'rattan', 'feather', 'mato', 'glove'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint,
       skip=[('key', 'base'), ('body', 'base'), ('head', 'body'), ('rsleeve', 'body'), ('rarm', 'rsleeve'), ('bow', 'body'),
             ('strU', 'bow'), ('strL', 'bow'), ('strU', 'rarm'), ('strL', 'rarm'), ('arrow', 'rarm'), ('arrow', 'strU'),
             ('arrow', 'strL'), ('arrow', 'bow'), ('target', 'base'), ('arrow', 'target'), ('strU', 'strL')],
       cam=((40, -58, 36), (0, 0, 16)), fold=(0, 34, 52, 72), frames=104)
