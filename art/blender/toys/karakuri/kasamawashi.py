"""傘回しネコ Parasol Cat: series karakuri, Edo Wind-Up Automata (concepts_B.md).

The parasol-spinning automaton (kasa-mawashi, the daikagura street act) as a ginger tabby cat with a gofun-white
face: a sky-blue kimono with white seigaiha waves, a red under-collar, a black obi tied in a drum knot, white tabi.
It stands on its black-lacquer base (gear window, whalebone spring, brass key), one paw on its hip, the other holding
up a red paper wagasa over its shoulder, the parasol's face tilted out to you with a gold paw crest on it and a
temari ball sitting on its rim.
Gimmick (wind-up): the key winds; the parasol spins, the ball runs round and round its rim (rolling as it goes) while
the cat bobs its head in time; the parasol slows, the ball hops up off the rim and lands back on top, and the cat
bows.

    tools/blender.sh art/blender/toys/karakuri/kasamawashi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('karakuri', 'kasamawashi')
b = kr.base(F)
SZ = kr.SZ
C0 = (5.6, 2.8)                  # where the cat stands
HEM = SZ + 1.2                   # the kimono's hem, over its tabi


def at(v):
    return Vector((v[0] + C0[0], v[1] + C0[1], v[2]))


# ------------------------------------------------------------------ the cat: tabi, kimono, obi with its drum knot, a tail
body_lo, body_hi = [], []
for sx in (1, -1):
    c = at((sx * 1.6, -1.0, SZ))
    for nm_, n_, lst in (('tabi', 6, body_lo), ('tabi_hi', 12, body_hi)):
        o = tk.lathe(nm_, [(0, 0), (1.15, 0.0), (1.25, 0.6), (0.95, 1.2), (0, 1.5)], n=n_, centre=tuple(c))
        tk.scale(o, (1.0, 1.55, 1.0), pivot=tuple(c))
        tk.rotate(o, sx * -8, 'Z', pivot=tuple(c))
        lst.append(o)
    tk.subsurf(body_hi[-1], 1)
    tk.push(body_hi[-1], lambda V, N, c=c: -0.18 * np.exp(-((V[:, 0] - c[0] + 0.35) / 0.15) ** 2) * (V[:, 1] < c[1] - 0.6))   # the split toe
    tk.set_region(body_hi[-1], 'tabi')
KIM = [(HEM, 0.0, 7.4, 3.5, 3.4, 2.3), (SZ + 4.0, 0.0, 7.0, 3.3, 3.2, 2.2), (SZ + 6.6, 0.1, 7.4, 3.4, 3.2, 2.2),
       (SZ + 9.0, 0.2, 7.8, 3.3, 3.1, 2.3), (SZ + 10.8, 0.3, 6.8, 2.8, 2.8, 2.3), (SZ + 11.9, 0.3, 4.0, 1.9, 1.9, 2.0)]


def sc_kim(h):
    def f(V, N):
        z = V[:, 2]
        d = -0.3 * np.exp(-((V[:, 0] + 0.4 - (z - SZ - 11.0) * 0.5) / 0.25) ** 2) * (z > SZ + 3.0) * (V[:, 1] < -1.2)   # the front overlap
        d += 0.35 * np.exp(-((z - SZ - 7.3) / 1.0) ** 6)                                                                   # the obi
        d += 0.18 * np.cos(np.arctan2(V[:, 0], -V[:, 1]) * 6) ** 2 * tk.smoothstep(SZ + 4.0, HEM, z)                       # skirt folds
        return d
    tk.push(h, f)


km_lo, km_hi = ak.stack('kimono', KIM, n=18, tris=150, sculpt=sc_kim, region='kimono', cap0='flat', cap1='round')
tk.regions(km_hi[0], 'kimono', [('obi', lambda C, N: np.abs(C[:, 2] - SZ - 7.3) < 1.05),
                                ('eri', lambda C, N: (C[:, 1] < -0.9) & (np.abs(C[:, 0] + 0.4 - (C[:, 2] - SZ - 11.0) * 0.5) < 0.6) & (C[:, 2] > SZ + 8.6))])
body_lo.append(km_lo)
body_hi += km_hi
KN = [(SZ + 6.0, 3.4, 4.8, 0.8, 1.6, 3.0), (SZ + 7.8, 3.6, 5.2, 0.9, 1.8, 3.0), (SZ + 9.2, 3.4, 4.6, 0.8, 1.4, 3.0)]
kn_lo, kn_hi = ak.stack('knot', KN, n=10, tris=36, region='obi', cap0='round', cap1='round')
body_lo.append(kn_lo)
body_hi += kn_hi
tl_lo, tl_hi = ak.spine('tail', [(0.6, 3.2, SZ + 3.4), (2.0, 5.4, SZ + 3.8), (3.0, 6.4, SZ + 6.2), (2.4, 6.0, SZ + 8.6)], [1.6, 1.5, 1.3, 1.0],
                        0.75, n=8, up=(0, 0, 1), tris=32, region='fur', cap0='round', cap1='round')
body_lo.append(tl_lo)
body_hi += tl_hi
for o in body_lo + body_hi:
    if o.name.startswith(('kimono', 'knot', 'tail')):
        tk.move(o, (C0[0], C0[1], 0))

# ------------------------------------------------------------------ the head: round, ginger with a white face, pointed ears; a jaunty tilt
HC = at((0.0, 0.5, SZ + 16.2))
TURN = 18.0
HEAD = [(0, 3.2, 0.2), (0, 0.8, 0.5), (0, -2.0, 0.0), (0, -3.6, -1.4)]
hd_lo, hd_hi = ak.spine('head', HEAD, [7.6, 10.4, 10.0, 5.6], [3.6, 4.4, 4.0, 2.2], [3.4, 4.2, 4.0, 2.4], e=2.2, n=16, up=(0, 0, 1),
                        tris=210, region='fur')


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        d += tk.bump(V, (sx * 4.3, -1.6, -1.6), 2.2, 0.55)              # cheek ruffs
    d += tk.bump(V, (0, -3.9, -1.3), 1.1, 0.35)                         # the muzzle
    return d


tk.push(hd_hi[0], sc_head)
tk.regions(hd_hi[0], 'fur', [('gofun', lambda C, N: (N[:, 1] < -0.15) & (C[:, 2] < 1.0 - 0.25 * np.abs(C[:, 0])) & (C[:, 1] < -0.8))])
ears_lo, ears_hi = [], []
for sx in (1, -1):
    lo, hi = ak.spine('ear', [(sx * 2.9, 0.4, 3.0), (sx * 3.5, 0.5, 5.0), (sx * 3.9, 0.6, 6.6)], [3.4, 2.2, 0.4], [0.9, 0.7, 0.3], n=8,
                      up=(0, 1, 0), tris=22, region='fur', cap0='round', cap1='point')
    tk.regions(hi[0], 'fur', [('earin', lambda C, N: (N[:, 1] < -0.4) & (C[:, 2] > 3.6))])
    ears_lo.append(lo)
    ears_hi += hi
HM = Matrix.Translation(HC) @ Matrix.Rotation(math.radians(TURN), 4, 'Z') @ Matrix.Rotation(math.radians(-7), 4, 'Y')
for o in [hd_lo] + hd_hi + ears_lo + ears_hi:
    tk.transform(o, HM)
FACE = Vector((math.sin(math.radians(TURN)), -math.cos(math.radians(TURN)), 0.0))
NOD = Vector((math.cos(math.radians(TURN)), math.sin(math.radians(TURN)), 0.0))

# ------------------------------------------------------------------ the parasol: out over its right shoulder, its face tilted to you
CAMV = Vector((0.553, -0.796, 0.242))            # (the front three-quarter view: toward the camera, screen right, up)
SCR = Vector((0.82, 0.57, 0.0))
SUP = CAMV.cross(SCR).normalized() * -1.0 if CAMV.cross(SCR).z < 0 else CAMV.cross(SCR).normalized()
RC = HC + SCR * -11.0 + SUP * 2.6 + CAMV * 2.6   # the middle of the canopy's rim
AX = (CAMV * 0.72 + SUP * 0.5 - SCR * 0.45).normalized()   # the parasol's axis (out of its face)
RR, DOME = 6.6, 2.0                              # rim radius, how high the crown stands over the rim
APEX = RC + AX * DOME
HAND = RC - AX * 8.0                             # where the right paw holds the shaft
QK = Vector((0, 0, 1)).rotation_difference(AX)
MK = Matrix.Translation(RC) @ QK.to_matrix().to_4x4()
E1 = QK @ Vector((1, 0, 0))
E2 = QK @ Vector((0, 1, 0))
KP = [(0, DOME + 0.3), (0.55, DOME + 0.28), (0.85, DOME + 0.05), (2.6, DOME * 0.66), (4.6, DOME * 0.34), (6.3, 0.06), (RR, -0.05),
      (6.45, -0.28), (4.6, DOME * 0.34 - 0.32), (2.6, DOME * 0.66 - 0.3), (0.9, DOME - 0.32), (0.35, DOME - 0.35), (0, DOME - 0.36)]
ks_hi = tk.lathe('canopy_hi', KP, n=32)
tk.subsurf(ks_hi, 1)
NR = 16                                          # ribs


def sc_canopy(V, N):
    a = np.arctan2(V[:, 1], V[:, 0])
    r = np.hypot(V[:, 0], V[:, 1])
    rib = np.cos(a * NR / 2) ** 40
    top = N[:, 2] > 0.2
    d = 0.07 * rib * top * (r > 1.0) - 0.06 * (1 - rib) * top * np.clip((r - 1.0) / 5.0, 0, 1)     # paper sags between the ribs
    d += 0.1 * (~top) * rib * (r > 0.6)                                                               # the ribs underneath
    return d


tk.push(ks_hi, sc_canopy)
tk.regions(ks_hi, 'paper', [('under', lambda C, N: N[:, 2] < -0.2), ('cap', lambda C, N: (np.hypot(C[:, 0], C[:, 1]) < 0.9) & (N[:, 2] > 0.2))])
ks_lo = tk.lathe('canopy', [(0, DOME + 0.3), (0.85, DOME + 0.05), (3.3, DOME * 0.5), (RR, -0.05), (6.4, -0.3), (0.9, DOME - 0.32), (0, DOME - 0.36)], n=12)
for o in (ks_hi, ks_lo):
    tk.transform(o, MK)
sh_pts = [tuple(HAND - AX * 1.6), tuple(APEX + AX * 0.9)]
sf_hi = tk.tube('shaft_hi', sh_pts, 0.3, n=8, cap0='round', cap1='round')
tk.set_region(sf_hi, 'bamboo')
sf_lo = tk.tube('shaft', sh_pts, 0.3, n=4, cap0='flat', cap1='flat')
# the temari ball on the rim (at the top of the rim at rest)
ETOP = (Vector((0, 0, 1)) - AX * AX.z).normalized()
BR = 1.1
BALL = RC + ETOP * 5.4 + AX * (DOME * (1 - 5.4 / 6.3) * 0.98 + BR + 0.12)
bl_hi = tk.lathe('ball_hi', [(0, -BR), (0.78 * BR, -0.78 * BR), (BR, 0), (0.78 * BR, 0.78 * BR), (0, BR)], n=12, centre=tuple(BALL))
tk.subsurf(bl_hi, 1)
tk.set_region(bl_hi, 'temari')
bl_lo = tk.lathe('ball', [(0, -BR), (0.75 * BR, -0.7 * BR), (BR, 0), (0.75 * BR, 0.7 * BR), (0, BR)], n=6, centre=tuple(BALL))

# ------------------------------------------------------------------ the arms: the right one up holding the shaft, the left paw on its hip
RSH = at((-3.6, 0.4, SZ + 10.9))
RE = kr.ik2(RSH, HAND, 3.6, 3.6, (-0.4, 0.3, -1.0))
lo, hi = ak.spine('rsleeve', [tuple(RSH), tuple(RSH * 0.5 + RE * 0.5), tuple(RE)], [2.8, 3.0, 3.0], 1.3, n=8, up=(0, 0, 1), tris=28,
                  region='kimono', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi
lo, hi = ak.spine('rarm', [tuple(RE), tuple(RE * 0.4 + HAND * 0.6), tuple(HAND)], [1.5, 1.4, 1.9], [0.75, 0.7, 0.95], n=8, up=(0, 0, 1),
                  tris=26, region='fur', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi
LSH = at((3.6, 0.4, SZ + 10.9))
LH = at((3.4, -1.6, SZ + 7.4))
LE = at((5.6, 0.2, SZ + 8.6))
lo, hi = ak.spine('lsleeve', [tuple(LSH), tuple(LSH * 0.5 + LE * 0.5), tuple(LE)], [2.8, 3.0, 3.0], 1.3, n=8, up=(0, 0, 1), tris=28,
                  region='kimono', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi
lo, hi = ak.spine('larm', [tuple(LE), tuple(LE * 0.45 + LH * 0.55), tuple(LH)], [1.5, 1.4, 1.8], [0.75, 0.7, 0.9], n=8, up=(0, 0, 1),
                  tris=24, region='fur', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi

# ------------------------------------------------------------------ on the base: the act's spare temari on a little lacquered tray
TRAY = Vector((-6.6, -4.4, SZ))
tr_hi = tk.rbox('tray_hi', (5.4, 3.4, 0.8), centre=tuple(TRAY + Vector((0, 0, 0.4))), bevel=0.3, segs=2)
tk.subsurf(tr_hi, 1)
tk.push(tr_hi, lambda V, N: -0.3 * (N[:, 2] > 0.7) * (np.abs(V[:, 0] - TRAY[0]) < 2.2) * (np.abs(V[:, 1] - TRAY[1]) < 1.2))
tk.set_region(tr_hi, 'tray')
b['hi'].append(tr_hi)
b['lo'].append(tk.rbox('tray', (5.4, 3.4, 0.8), centre=tuple(TRAY + Vector((0, 0, 0.4))), bevel=0, segs=0))
SPARE = [(TRAY + Vector((-1.2, 0.1, 0.6 + 1.0)), 1.0), (TRAY + Vector((1.25, -0.1, 0.6 + 0.9)), 0.9)]
for c, r in SPARE:
    o = tk.lathe('spare_hi', [(0, -r), (0.78 * r, -0.78 * r), (r, 0), (0.78 * r, 0.78 * r), (0, r)], n=12, centre=tuple(c))
    tk.subsurf(o, 1)
    tk.set_region(o, 'spare')
    b['hi'].append(o)
    b['lo'].append(tk.lathe('spare', [(0, -r), (0.75 * r, -0.7 * r), (r, 0), (0.75 * r, 0.7 * r), (0, r)], n=6, centre=tuple(c)))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(b['lo'], 'base'), b['hi'], kind='gloss')
F.part('key', b['key'][0], b['key'][1], bone='key', kind='metal')
F.part('body', tk.join(body_lo, 'body'), body_hi, bone='body')
F.part('head', tk.join([hd_lo] + ears_lo, 'head'), hd_hi + ears_hi, bone='head')
F.part('kasa', tk.join([ks_lo, sf_lo], 'kasa'), [ks_hi, sf_hi], bone='kasa')
F.part('ball', bl_lo, [bl_hi], bone='ball', kind='gloss')
print('reach', round((HAND - RSH).length, 2), 'apex', tuple(round(v, 1) for v in APEX), 'rim low z', round(RC.z - RR * math.sqrt(1 - AX.z ** 2), 1))
TANG = AX.cross(ETOP).normalized()               # the ball's way round the rim at rest
ROLL = ETOP                                      # (it rolls about this)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('key', b['KEY'], parent='root')
    R.bone('body', tuple(at((0, 0, SZ))), parent='root')
    R.bone('head', tuple(at((0, 0.4, SZ + 12.0))), parent='body')
    R.bone('kasa', tuple(APEX), parent='body')
    R.bone('ring', tuple(RC), parent='body')
    R.bone('ball', tuple(BALL), parent='ring')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'key', 'body', 'head', 'kasa', 'ring', 'ball']
        for bn in bones:
            k(bn, 0)
        kr.wind(k, 0, 12, 2)
        kr.unwind(k, 12, 104, 2)
        # 14-86 the parasol spins (four turns: it gathers speed, runs, slows)
        for f in range(14, 87, 2):
            t = (f - 14) / 72
            k('kasa', f, rot=[(AX, -4 * 360.0 * (t - math.sin(2 * math.pi * t) / (2 * math.pi)))], ease='LINEAR')
        # 18-74 the ball runs round the rim twice, rolling
        for f in range(18, 75, 4):
            t = kr.ease((f - 18) / 56) * 0.6 + ((f - 18) / 56) * 0.4
            k('ring', f, rot=[(AX, -720.0 * t)], ease='LINEAR')
        for f in range(18, 75, 2):
            t = kr.ease((f - 18) / 56) * 0.6 + ((f - 18) / 56) * 0.4
            k('ball', f, rot=[(ROLL, -2160.0 * t)], ease='LINEAR')
        # 76-92 it hops up off the rim and lands back on top
        k('ball', 76)
        k('ball', 82, move=tuple(AX * 3.6 + ETOP * 0.6), rot=[(TANG, -90)])
        k('ball', 85, move=tuple(AX * 3.9 + ETOP * 0.4), rot=[(TANG, -160)], ease=('BOUNCE', 'EASE_OUT'))
        k('ball', 92)
        # the cat bobs in time, watches the hop, then bows
        for i, f in enumerate(range(16, 77, 10)):
            k('head', f, rot=[(FACE, 6 if i % 2 == 0 else -6)])
            k('body', f, move=(0, 0, 0.25 if i % 2 == 0 else 0.0))
        k('head', 80, rot=[(NOD, -10)])
        k('head', 86, rot=[(NOD, -12)])
        k('head', 92)
        k('body', 80)
        k('body', 92)
        k('body', 97, rot=('X', 10))
        k('body', 100, rot=('X', 10))
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
    # sky-blue kimono, white seigaiha waves on its skirt and sleeves; red under-collar; black obi with a gold cord
    P.fill('kimono', pt.ramp('#5a92bc', 7, shift=0.07), tone=sh, base=0.05)
    km = P.region('kimono')
    ang = np.arctan2(X - C0[0], -(Yc - C0[1])) * 3.6
    P.fill(km & kr.seigaiha(ang, Z, 1.9, 0.3) & (Z < SZ + 6.2), pt.ramp('#eef2f2', 4, shift=0.03), tone=sh, base=0.15)
    P.fill(km & kr.seigaiha(X + Yc, Z, 1.5, 0.28) & (Z > SZ + 9.4) & (np.abs(X - C0[0]) > 2.6), pt.ramp('#eef2f2', 4, shift=0.03), tone=sh, base=0.15)
    P.fill('eri', pt.ramp('#c8303a', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('obi', pt.ramp('#25222a', 6, shift=0.06), tone=sh, base=0.0)
    P.fill(P.region('obi') & (np.abs(Z - SZ - 7.3) < 0.18), GOLD, tone=sh, base=0.1)
    P.fill(P.region('obi') & kr.kikko(X + Yc, Z, 1.2, 0.1) & (Yc > C0[1] + 2.5), pt.ramp('#5a4a6a', 4), tone=sh)
    P.fill('tabi', pt.ramp('#f2eee6', 5, shift=0.03), tone=sh, base=0.2)
    # ginger tabby: darker stripes on its head, ears and tail; the gofun-white face; pink inside the ears
    P.fill('fur', pt.ramp('#d98a3a', 7, shift=0.06), tone=sh, base=0.08)
    fr = P.region('fur')
    rel = P.pos - np.array(HC)
    up = np.einsum('ijk,k->ij', rel, np.array((0, 0, 1.0)))
    side = np.einsum('ijk,k->ij', rel, np.array(NOD))
    P.fill(fr & (up > 1.4) & (np.mod(side * 0.9 + 0.5, 1.8) < 0.5), pt.ramp('#a85a22', 5), tone=sh)
    P.fill(fr & (Z < SZ + 10.0) & (np.mod(Z * 1.4, 1.6) < 0.5), pt.ramp('#a85a22', 5), tone=sh)
    P.fill('gofun', pt.ramp('#f4f0e8', 5, shift=0.03), tone=sh, base=0.25)
    P.fill('earin', pt.ramp('#efb0a8', 5, shift=0.04), tone=sh, base=0.2)
    # the wagasa: red paper with a white janome ring, a gold paw crest in the middle, dark rib lines; the head
    # cap black; underneath, the ribs and a band of coloured binding thread round the shaft
    rk = P.pos - np.array(RC)
    cu = np.einsum('ijk,k->ij', rk, np.array(E1))
    cv = np.einsum('ijk,k->ij', rk, np.array(E2))
    rr = np.hypot(cu, cv)
    aa = np.arctan2(cv, cu)
    P.fill('paper', pt.ramp('#c42a2e', 7, shift=0.06), tone=sh, base=0.05)
    pa = P.region('paper')
    P.fill(pa & (rr > 4.2) & (rr < 4.9), pt.ramp('#f2ece0', 5, shift=0.03), tone=sh, base=0.15)
    P.fill(pa & (np.abs(np.mod(aa * NR / (2 * math.pi) + 0.5, 1.0) - 0.5) < 0.06 * 6.6 / np.maximum(rr, 0.5)) & (rr > 1.0), pt.ramp('#7a1a1e', 4), tone=sh)
    paw = (np.hypot(cu - 0.0, (cv + 0.55) * 1.15) < 1.35)
    for tu, tv in ((-1.55, 1.05), (-0.55, 1.75), (0.55, 1.75), (1.55, 1.05)):
        paw |= np.hypot(cu - tu, cv - tv) < 0.55
    P.fill(pa & paw & (rr > 0.9), GOLD, tone=sh, base=0.1)
    P.fill('cap', pt.ramp('#1d1a20', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('under', pt.ramp('#d8b484', 6, shift=0.05), tone=sh, base=0.05)
    un = P.region('under')
    P.fill(un & (np.abs(np.mod(aa * NR / (2 * math.pi) + 0.5, 1.0) - 0.5) < 0.12), pt.ramp('#7a5a3a', 4), tone=sh)
    for i, col in enumerate(('#2a6ab0', '#e8e0d0', '#c8303a', '#2a8a5a', '#e8c040')):
        P.fill(un & (rr > 0.9 + i * 0.32) & (rr < 1.2 + i * 0.32), pt.ramp(col, 3), tone=sh, base=0.1)
    P.fill('bamboo', pt.ramp('#cfae6c', 5, shift=0.05), tone=sh, base=0.1)
    # the temari: red, wound with white, gold and green thread
    P.fill('temari', pt.ramp('#c8303a', 5, shift=0.05), tone=sh, base=0.05)
    tm = P.region('temari')
    bq = P.pos - np.array(BALL)
    la = np.arctan2(bq[:, :, 1], bq[:, :, 0])
    P.fill(tm & (np.abs(np.mod(la * 8 / (2 * math.pi), 1.0) - 0.5) < 0.12), pt.ramp('#f2ece0', 4), tone=sh, base=0.1)
    P.fill(tm & (np.abs(bq[:, :, 2]) < 0.22), GOLD, tone=sh, base=0.1)
    P.fill(tm & (np.abs(np.abs(bq[:, :, 2]) - 0.62) < 0.1), pt.ramp('#2a8a5a', 4), tone=sh, base=0.1)
    P.fill('tray', pt.ramp('#8a1e22', 6, shift=0.06, light=0.6), tone=sh * 1.2, base=0.0)
    P.fill(P.region('tray') & (P.on[:, :, 2] > 0.7) & ((np.abs(X - TRAY[0]) > 2.3) | (np.abs(Yc - TRAY[1]) > 1.3)), GOLD, tone=sh, base=0.1)
    for (c, r), cols in zip(SPARE, (('#2a6ab0', '#f2ece0', '#e8c040'), ('#f2ece0', '#c8303a', '#2a8a5a'))):
        q = P.pos - np.array(c)
        sp = P.region('spare') & (np.linalg.norm(q, axis=2) < r + 0.3)
        P.fill(sp, pt.ramp(cols[0], 5, shift=0.05), tone=sh, base=0.05)
        P.fill(sp & (np.abs(np.mod(np.arctan2(q[:, :, 1], q[:, :, 0]) * 6 / (2 * math.pi), 1.0) - 0.5) < 0.13), pt.ramp(cols[1], 4), tone=sh, base=0.1)
        P.fill(sp & (np.abs(q[:, :, 2]) < 0.2), pt.ramp(cols[2], 4), tone=sh, base=0.1)
    # the face: happy shut eyes, a pink nose, the little cat mouth, whiskers, blush
    import face
    c = HC + FACE * 4.0 + Vector((0, 0, -0.4))
    fc = face.Face(P, c=tuple(c), axis=(FACE[0], FACE[1], 0.12), where=P.region('gofun') | P.region('fur'), seed=851)
    fc.eyes('happy', spread=4.4, size=0.5, dy=0.5)
    sn = face.Face(P, c=tuple(HC + FACE * 4.3 + Vector((0, 0, -1.3))), axis=(FACE[0], FACE[1], 0.05), where=P.region('gofun'), seed=852)
    sn.nose('tri', dy=0.3, size=0.42, col='#e88a92')
    sn.snout_mouth('cat', dy=-0.05, w=1.4, weight=0.22)
    sn.whiskers(dy=-0.2, spread=4.6, n=2, length=1.6, weight=0.16)
    sn.blush(5.0, -0.1, rx=0.9, ry=0.5)
    P.lines(['eri', 'obi', 'tabi', 'cap', 'under', 'temari', 'tray', 'spare'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('key', 'base'), ('body', 'base'), ('head', 'body'), ('kasa', 'body')],
       cam=((40, -58, 36), (0, 0, 18)), fold=(0, 30, 60, 84), frames=104)
