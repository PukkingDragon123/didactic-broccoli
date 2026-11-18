"""金の鳳凰 Golden Phoenix: series karakuri, Edo Wind-Up Automata (concepts_B.md). The secret.

The master's piece: a phoenix (hōō) in gold leaf and coloured lacquer, perched on a black-lacquer rock veined with
gold, two paulownia leaves (the tree the hōō alights on) at its foot. Gold scale-feathers, a vermilion breast and
wattle, a three-plumed crest; its long wings folded along its back; five long tail plumes (vermilion, malachite,
azurite, violet, gold, each with a gold-ringed eye) trailing down across its black-lacquer base (gear window,
whalebone spring, brass key).
Gimmick (wind-up): the key winds; it lifts its head and cries, raises and spreads its wings wide toward you and fans its
five plumes up into a great fan behind it, beats its wings twice, then folds everything away.

    tools/blender.sh art/blender/toys/karakuri/houou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('karakuri', 'houou')
b = kr.base(F)
SZ = kr.SZ
RK = (2.6, 0.6)                  # the rock
RH = 4.4                         # its height over the base
YAW = 25.0                       # the bird faces out a little toward the front-right
BS = 1.25                        # the bird's scale (built at 1)
PERCH = Vector((RK[0], RK[1], SZ + RH - 0.2))
MW = Matrix.Translation(PERCH) @ Matrix.Rotation(math.radians(YAW), 4, 'Z') @ Matrix.Scale(BS, 4)
RZ = Matrix.Rotation(math.radians(YAW), 3, 'Z')


def W(v):
    """A point in the bird's frame (facing -y, its feet at the origin) in figure space."""
    return MW @ Vector(v)


def Wd(v):
    return (RZ @ Vector(v)).normalized()


# ------------------------------------------------------------------ the rock, gold-veined black lacquer; two paulownia leaves
RKR = [(SZ, 0.0, 11.4, 4.4, 4.2, 2.4), (SZ + 1.8, 0.1, 10.6, 4.0, 3.9, 2.3), (SZ + 3.4, 0.2, 8.4, 3.2, 3.1, 2.2), (SZ + RH, 0.2, 5.4, 2.2, 2.0, 2.0)]


def sc_rock(h):
    def f(V, N):
        d = np.zeros(len(V))
        rng = np.random.default_rng(861)
        for _ in range(9):
            c = (RK[0] + rng.uniform(-5, 5), RK[1] + rng.uniform(-4, 4), SZ + rng.uniform(0.5, RH))
            d += tk.bump(V, c, rng.uniform(1.6, 2.8), rng.uniform(-0.5, 0.6))
        d -= 0.18 * (np.abs(np.sin(V[:, 0] * 1.3 + V[:, 2] * 2.1) * np.cos(V[:, 1] * 1.1 - V[:, 2])) > 0.92)   # cracks
        return d
    tk.push(h, f)


rk_lo, rk_hi = ak.stack('rock', RKR, n=16, tris=90, region='rock', cap0='flat', cap1='round')
for o in [rk_lo] + rk_hi:
    tk.move(o, (RK[0], RK[1], 0))
sc_rock(rk_hi[0])
b['lo'].append(rk_lo)
b['hi'] += rk_hi
LEAF = [(0.0, 0.0), (1.2, -1.1), (2.6, -1.9), (4.2, -1.8), (5.4, -0.9), (5.9, 0.0), (5.4, 0.9), (4.2, 1.8), (2.6, 1.9), (1.2, 1.1)]
for i, (c, yaw, pitch) in enumerate((((RK[0] - 4.6, RK[1] - 2.6, SZ + 0.6), 205, 22), ((RK[0] - 5.4, RK[1] + 0.6, SZ + 0.9), 160, 34))):
    for nm_, bev, lst in (('leaf_hi', 0.08, b['hi']), ('leaf', 0, b['lo'])):
        o = tk.slab(nm_, LEAF, 0.35, plane='XY', at=0.0, bevel=bev, segs=1 if bev else 0)
        if bev:
            tk.subsurf(o, 1)
            tk.push(o, lambda V, N: -0.08 * (np.abs(V[:, 1]) < 0.12) - 0.05 * (np.abs(np.abs(V[:, 1]) - 0.5 * V[:, 0] * (V[:, 0] < 4)) < 0.1))
            tk.set_region(o, 'leaf')
        tk.rotate(o, -pitch, 'Y')
        tk.rotate(o, yaw, 'Z')
        tk.move(o, c)
        lst.append(o)

# ------------------------------------------------------------------ the bird (built facing -y, feet at the origin)
bd_lo, bd_hi = [], []
lo, hi = ak.spine('body', [(0, 3.6, 4.4), (0, 1.4, 4.9), (0, -0.7, 5.9), (0, -1.8, 7.3)], [2.8, 5.0, 5.2, 3.8], [1.5, 2.6, 2.8, 2.1],
                  [1.6, 2.8, 2.8, 1.9], n=14, up=(0, 0, 1), tris=120, region='gold')


def sc_body(V, N):
    return -0.08 * (np.mod(V[:, 1] * 1.6 + np.abs(V[:, 0]) * 0.8 + V[:, 2] * 0.4, 1.0) < 0.22)     # scale-feather rows


tk.push(hi[0], sc_body)
tk.regions(hi[0], 'gold', [('breast', lambda C, N: (N[:, 1] < -0.3) & (C[:, 2] < 7.4) & (C[:, 1] < 0.6))])
bd_lo.append(lo)
bd_hi += hi
lo, hi = ak.spine('neck', [(0, -1.4, 6.9), (0, -2.5, 9.0), (0, -2.0, 11.2), (0, -2.3, 12.8)], [3.2, 2.4, 2.0, 2.0], [1.5, 1.2, 1.0, 1.0],
                  n=10, up=(0, 1, 0), tris=60, region='gold', cap0='round', cap1='round')
tk.push(hi[0], lambda V, N: -0.07 * (np.mod(V[:, 2] * 2.2 + np.abs(V[:, 0]) * 1.2, 1.0) < 0.25))
tk.regions(hi[0], 'gold', [('breast', lambda C, N: (N[:, 1] < -0.4) & (C[:, 2] < 9.6))])
bd_lo.append(lo)
bd_hi += hi
for sx in (1, -1):    # legs, three toes forward and one back, gripping the rock
    lo, hi = ak.spine('leg', [(sx * 1.1, 0.7, 4.4), (sx * 1.2, 0.2, 2.2), (sx * 1.1, -0.1, 0.5)], [1.2, 0.8, 0.7], 0.45, n=6, up=(0, 1, 0),
                      tris=18, region='leg', cap0='round', cap1='round')
    bd_lo.append(lo)
    bd_hi += hi
    for tx, ty in ((-0.6, -1.5), (0.0, -1.7), (0.6, -1.5), (0.0, 1.0)):
        pts = [(sx * 1.1, -0.1, 0.45), (sx * 1.1 + tx * 0.6, ty * 0.6 - 0.1, 0.35), (sx * 1.1 + tx, ty, 0.15)]
        hi = tk.tube('toe_hi', pts, [0.32, 0.26, 0.14], n=6, cap0='round', cap1='point')
        tk.set_region(hi, 'leg')
        bd_hi.append(hi)
        bd_lo.append(tk.tube('toe', pts, [0.32, 0.26, 0.14], n=3, cap0=None, cap1='point'))
for o in bd_lo + bd_hi:
    tk.transform(o, MW)

# the head: small and fierce, a hooked beak (its lower half opens), a vermilion wattle, a crest of three plumes
hd_lo, hd_hi = [], []
lo, hi = ak.spine('head', [(0, -1.3, 13.6), (0, -2.5, 13.95), (0, -3.6, 13.65)], [2.1, 2.6, 1.8], [1.1, 1.35, 0.95], n=14, up=(0, 0, 1),
                  tris=96, region='gold', cap0='round', cap1='round')
hd_lo.append(lo)
hd_hi += hi
lo, hi = ak.spine('beak', [(0, -3.8, 13.75), (0, -4.8, 13.6), (0, -5.5, 13.15)], [1.1, 0.7, 0.14], [0.42, 0.32, 0.1], n=8, up=(0, 0, 1),
                  tris=16, region='beak', cap0='round', cap1='point')
hd_lo.append(lo)
hd_hi += hi
lo, hi = ak.spine('wattle', [(0, -3.6, 13.0), (0, -3.8, 12.3), (0, -3.5, 11.8)], [0.9, 0.9, 0.5], 0.35, n=6, up=(0, 1, 0), tris=12,
                  region='red', cap0='round', cap1='round')
hd_lo.append(lo)
hd_hi += hi
for dx, sw in ((0.0, 0.0), (0.55, 0.5), (-0.55, -0.5)):
    pts = [(dx * 0.5, -2.3, 14.9), (dx, -1.5, 16.4 - abs(dx)), (dx + sw, -0.1, 17.3 - abs(dx)), (dx + sw * 1.6, 1.3, 17.0 - abs(dx) * 1.4)]
    lo, hi = ak.spine('crest', pts, [0.55, 0.45, 0.45, 0.9], 0.18, n=6, up=(1, 0, 0), tris=14, region='crest', cap0='round', cap1='point')
    hd_lo.append(lo)
    hd_hi += hi
jw_lo, jw_hi = ak.spine('jaw', [(0, -3.8, 13.35), (0, -4.9, 13.2)], [0.85, 0.2], 0.22, n=6, up=(0, 0, 1), tris=10, region='beak', cap0='round',
                        cap1='point')
for o in hd_lo + hd_hi + [jw_lo] + jw_hi:
    tk.transform(o, MW)

# ------------------------------------------------------------------ the wings: folded along its back; on the bone they spread toward you
WING = [(0.0, 0.7), (2.4, 1.3), (5.0, 1.2), (7.6, 0.6), (9.6, -0.3), (8.9, -1.2), (8.0, -0.9), (7.2, -2.0), (6.3, -1.4), (5.5, -2.5),
        (4.6, -1.8), (3.7, -2.7), (2.8, -2.0), (1.9, -2.5), (1.0, -1.6), (0.0, -1.0)]
SH = {sx: (sx * 2.2, -0.8, 7.7) for sx in (1, -1)}
D0 = Vector((0, 0.9, -0.44)).normalized()             # folded: the wing's length runs back along the body
A0 = Vector((0, 0.44, 0.9)).normalized()              # ... its leading edge up
wings = {}
for sx in (1, -1):
    n0 = D0.cross(A0) * sx                               # its outer face
    M = Matrix((D0, A0, n0)).transposed().to_4x4()
    M.translation = Vector(SH[sx]) + n0 * 0.35
    lo = tk.slab('wing', WING, 0.6, plane='XY', at=0.0, bevel=0, segs=0)
    hi = tk.slab('wing_hi', WING, 0.6, plane='XY', at=0.0, bevel=0.2, segs=1)
    tk.subsurf(hi, 1)

    def sc_wing(V, N):
        u, v = V[:, 0], V[:, 1]
        d = -0.07 * (np.abs(np.mod(u * 1.1 - v * 0.5, 1.0) - 0.5) < 0.08) * (v < -0.4)                  # the primaries' edges
        d -= 0.06 * (np.abs(np.mod(np.hypot(u * 0.9, v * 1.4) * 1.4, 1.0) - 0.5) < 0.1) * (v > -0.4)   # covert rows
        return d * (np.abs(N[:, 2]) > 0.5)
    tk.push(hi, sc_wing)
    tk.set_region(hi, 'wing')
    for o in (lo, hi):
        tk.transform(o, MW @ M)
        tk.fix_normals(o)
    wings[sx] = (lo, [hi], MW @ M)

# ------------------------------------------------------------------ the five tail plumes, trailing across the base (they fan up on their bones)
ROOT = W((0, 3.4, 4.6))
PL = 15.5
PLUMES = []
for i in range(5):
    # rest: down and away to the back left, a little spread; fan: up behind it, -64..64 degrees, tilted back
    ang = math.radians(-8 + 8 * i)
    hd = Vector((-0.95, 0.1, 0.0))
    hd = Matrix.Rotation(ang, 3, 'Z') @ hd
    d0 = Vector((hd.x, hd.y, -0.72)).normalized()
    a0 = Vector((0, 0, 1)).cross(d0).normalized()
    th = math.radians(-44 + 22 * i)
    d1 = Wd((math.sin(th), 0.34, math.cos(th)))
    n_fan = Wd((0, -1, 0.34))
    a1 = n_fan.cross(d1).normalized()
    curl = (-1) ** i * 0.5 + (i - 2) * 0.15
    PLUMES.append((d0, a0, d1, a1, curl))


def plume_outline(curl):
    pts_t, pts_b = [], []
    for t in np.linspace(0, 1, 9):
        u = PL * t
        c = curl * math.sin(math.pi * t) * 1.6
        w = 0.35 + 0.5 * t + 0.85 * math.exp(-((t - 0.84) / 0.11) ** 2)
        if t == 1.0:
            w = 0.0
        pts_t.append((u, c + w))
        pts_b.append((u, c - w))
    return pts_t[:-1] + [(PL + 0.4, 0.0)] + pts_b[::-1][1:]


print('plume tips at rest', [tuple(round(c, 1) for c in ROOT + p_[0] * (PL + 0.4)) for p_ in PLUMES])
plumes = []
for i, (d0, a0, d1, a1, curl) in enumerate(PLUMES):
    out = plume_outline(curl)
    lo = tk.slab(f'p{i + 1}', out, 0.36, plane='XY', at=0.0, bevel=0, segs=0)
    hi = tk.slab(f'p{i + 1}_hi', out, 0.36, plane='XY', at=0.0, bevel=0.12, segs=1)
    tk.subsurf(hi, 1)
    tk.push(hi, lambda V, N, c=curl: (0.08 * np.exp(-((V[:, 1] - c * np.sin(np.pi * V[:, 0] / PL) * 1.6) / 0.12) ** 2)
                                      - 0.05 * (np.abs(np.mod(V[:, 0] * 2.4 - np.abs(V[:, 1]) * 1.6, 1.0) - 0.5) < 0.1)) * (np.abs(N[:, 2]) > 0.5))
    tk.set_region(hi, 'plume')
    M = Matrix((d0, a0, d0.cross(a0))).transposed().to_4x4()
    M.translation = ROOT + d0.cross(a0) * (0.12 * (i - 2))
    for o in (lo, hi):
        tk.transform(o, M)
        tk.fix_normals(o)
    plumes.append((f'p{i + 1}', lo, [hi], M))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(b['lo'], 'base'), b['hi'], kind='gloss')
F.part('key', b['key'][0], b['key'][1], bone='key', kind='metal')
F.part('body', tk.join(bd_lo, 'body'), bd_hi, bone='body', kind='metal')
F.part('head', tk.join(hd_lo, 'head'), hd_hi, bone='head', kind='metal')
F.part('jaw', jw_lo, jw_hi, bone='jaw', kind='metal')
for sx, nm in ((1, 'wing_r'), (-1, 'wing_l')):
    F.part(nm, wings[sx][0], wings[sx][1], bone=nm, kind='metal')
for nm, lo, hi, M in plumes:
    F.part(nm, lo, hi, bone=nm, kind='metal')

NOD = Wd((1, 0, 0))                # its head's nodding axis (positive: down)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('key', b['KEY'], parent='root')
    R.bone('body', tuple(PERCH), parent='root')
    R.bone('head', tuple(W((0, -2.2, 12.6))), parent='body')
    R.bone('jaw', tuple(W((0, -3.8, 13.35))), parent='head')
    for sx, nm in ((1, 'wing_r'), (-1, 'wing_l')):
        R.bone(nm, tuple(W(SH[sx])), parent='body')
    for nm, lo, hi, M in plumes:
        R.bone(nm, tuple(ROOT), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    Q = {}
    for sx, nm in ((1, 'wing_r'), (-1, 'wing_l')):
        d1 = Wd((sx * 0.8, 0.12, 0.58))
        a1 = Wd((-sx * 0.58, 0.0, 0.8))
        Q[nm] = kr.qframe(Wd(D0), Wd(A0), d1, a1)
        Q[nm + '_half'] = kr.qframe(Wd(D0), Wd(A0), Wd((sx * 0.93, 0.16, 0.28)), Wd((-sx * 0.28, 0.0, 0.96)))   # a downbeat
    for i, (nm, lo, hi, M) in enumerate(plumes):
        d0, a0, d1, a1, curl = PLUMES[i]
        Q[nm] = kr.qframe(d0, a0, d1, a1)
    I = Q['wing_r'].copy()
    I.identity()

    def turn(nm, f, q, ease=None):
        k(nm, f, quat=tuple(q), ease=ease)

    def sweep(nm, f0, f1, qa, qb, step=3, last=None):
        """A big turn, keyed every few frames along the shortest arc (eased)."""
        n = max(1, (f1 - f0) // step)
        for j in range(n + 1):
            t = kr.ease(j / n)
            turn(nm, f0 + (f1 - f0) * j // n, qa.slerp(qb, t), ease=last if j == n else 'LINEAR')

    with R.action('gimmick'):
        bones = ['root', 'key', 'body', 'head', 'jaw', 'wing_r', 'wing_l'] + [p[0] for p in plumes]
        for bn in bones:
            k(bn, 0)
        kr.wind(k, 0, 12, 2)
        kr.unwind(k, 12, 112, 2)
        # 12-20 it rises and lifts its head; 22-34 it cries (the beak opens)
        k('body', 12)
        k('body', 20, move=(0, 0, 0.6))
        k('head', 12)
        k('head', 20, rot=[(NOD, -16)])
        k('jaw', 22)
        k('jaw', 26, rot=[(NOD, 26)])
        k('jaw', 32, rot=[(NOD, 26)])
        k('jaw', 36)
        # 16-30 the wings rise and spread toward you; 24-44 the plumes fan up behind, one after another
        for nm in ('wing_r', 'wing_l'):
            turn(nm, 16, I)
            sweep(nm, 16, 30, I, Q[nm])
        for i, (nm, lo, hi, M) in enumerate(plumes):
            f0 = 24 + abs(i - 2) * 2
            turn(nm, f0, I)
            sweep(nm, f0, f0 + 16, I, Q[nm])
        # 46-64 two beats of the wings, the body bobbing; the head turns to you
        for nm in ('wing_r', 'wing_l'):
            for f0 in (46, 56):
                sweep(nm, f0, f0 + 4, Q[nm], Q[nm + '_half'], step=2)
                sweep(nm, f0 + 4, f0 + 10, Q[nm + '_half'], Q[nm], step=2)
            turn(nm, 74, Q[nm])
        for f0 in (46, 56):
            k('body', f0 + 4, move=(0, 0, 1.0))
            k('body', f0 + 10, move=(0, 0, 0.6))
        k('head', 46, rot=[(NOD, -16)])
        k('head', 54, rot=[(NOD, -8), ('Z', 12)])
        k('head', 70, rot=[(NOD, -8), ('Z', 12)])
        # 76-104 it folds away: plumes down, wings in, head down, a settle
        for i, (nm, lo, hi, M) in enumerate(plumes):
            f0 = 76 + (2 - abs(i - 2)) * 2
            turn(nm, f0, Q[nm])
            sweep(nm, f0, f0 + 18, Q[nm], I)
        for nm in ('wing_r', 'wing_l'):
            sweep(nm, 84, 100, Q[nm], I)
        k('head', 92, rot=[(NOD, 6)])
        k('head', 104)
        k('body', 74, move=(0, 0, 0.6))
        k('body', 100)
        k('body', 104, move=(0, 0, 0.2))
        for bn in bones:
            if bn != 'key':
                k(bn, 112)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kr.paint_base(P, pt, sh)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    LEAFG = pt.ramp('#e6be5a', 7, dark=0.55, light=0.65, shift=0.08)
    DEEP = pt.ramp('#a87a28', 5, shift=0.06)
    VERM = pt.ramp('#d0402a', 6, shift=0.06)
    # the rock: black lacquer, gold veins, a gold paulownia crest; the leaves green-gold
    ak.lacquer(P, ('rock',))
    rk = P.region('rock')
    P.fill(rk & (np.abs(np.sin(X * 0.9 + np.sin(Z * 1.7) * 1.2) * np.cos(Yc * 0.8 + Z * 0.5)) > 0.94), GOLD, tone=sh, base=0.1)
    fr = rk & (P.on[:, :, 1] < -0.6)
    cu, cv = X - RK[0] - 0.4, Z - SZ - 1.9
    kiri = (np.hypot(cu * 1.3, cv + 0.25) < 0.75) | ((np.abs(cu) < 1.4) & (np.abs(cv - 0.35 - np.abs(cu) * 0.3) < 0.28) & (np.abs(cu) > 0.8))
    for k_ in (-0.7, 0.0, 0.7):
        kiri |= (np.abs(cu - k_) < 0.17) & (cv > 0.7) & (cv < 1.5 + 0.2 * (k_ == 0))
    P.fill(fr & kiri, GOLD, tone=sh, base=0.15)
    P.fill('leaf', pt.ramp('#4a7a3a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region('leaf') & (P.cav > 0.6), GOLD, tone=sh, base=0.05)
    # the bird: gold leaf in scale-feathers, a vermilion breast scaled in gold, vermilion legs and wattle, ivory beak
    P.fill('gold', LEAFG, tone=sh * 1.2, base=0.12)
    P.fill(P.region('gold') & (P.cav > 0.58), DEEP, tone=sh, base=0.0)
    P.fill('breast', VERM, tone=sh, base=0.05)
    br = P.region('breast')
    P.fill(br & kr.seigaiha(X - Yc * 0.5, Z, 0.7, 0.12, rings=2), GOLD, tone=sh, base=0.1)
    P.fill('leg', VERM, tone=sh, base=0.05)
    P.fill('red', VERM, tone=sh, base=0.08)
    P.fill('beak', pt.ramp('#e8b85a', 5, shift=0.05), tone=sh, base=0.1)
    P.fill(P.region('beak') & (P.cav > 0.6), pt.ramp('#8a5a22', 3), tone=sh)
    P.fill('crest', VERM, tone=sh, base=0.05)
    P.fill(P.region('crest') & (Z > PERCH[2] + 16.6), LEAFG, tone=sh, base=0.15)
    # the wings: gold coverts, then bands of malachite, azurite and vermilion out to the flight feathers
    wr = P.region('wing')
    for sx in (1, -1):
        Mi = wings[sx][2].inverted()
        loc = np.einsum('ij,hwj->hwi', np.array(Mi)[:3, :3], P.pos) + np.array(Mi)[:3, 3]
        u, v = loc[:, :, 0], loc[:, :, 1]
        m = wr & (np.abs(loc[:, :, 2]) < 1.0) & (u > -0.5) & (u < 10.5)
        P.fill(m, LEAFG, tone=sh * 1.2, base=0.12)
        P.fill(m & (v < 0.2) & (v > -0.9), pt.ramp('#2f8a6a', 5, shift=0.06), tone=sh, base=0.08)
        P.fill(m & (v <= -0.9) & (v > -1.6), pt.ramp('#2f5aa8', 5, shift=0.06), tone=sh, base=0.08)
        P.fill(m & (v <= -1.6), VERM, tone=sh, base=0.06)
        P.fill(m & (v < 0.2) & (np.abs(np.mod(u * 1.1 - v * 0.5, 1.0) - 0.5) < 0.09), LEAFG, tone=sh, base=0.1)   # gold quills
        P.fill(m & (v >= 0.2) & kr.seigaiha(u, v, 0.8, 0.12, rings=2), DEEP, tone=sh, base=0.0)
    # the plumes: a gold quill, coloured vanes barred with gold, and a gold-ringed eye near each tip
    pr = P.region('plume')
    cols = ('#d0402a', '#2f8a6a', '#2f5aa8', '#7a3a9a', '#d0402a')
    for i, (nm, lo, hi, M) in enumerate(plumes):
        Mi = M.inverted()
        loc = np.einsum('ij,hwj->hwi', np.array(Mi)[:3, :3], P.pos) + np.array(Mi)[:3, 3]
        u, v, w = loc[:, :, 0], loc[:, :, 1], loc[:, :, 2]
        m = pr & (np.abs(w) < 0.6) & (u > -0.5) & (u < PL + 1.0)
        curl = PLUMES[i][4]
        vc = v - curl * np.sin(np.pi * np.clip(u / PL, 0, 1)) * 1.6
        if not m.any():
            continue
        m &= np.abs(vc) < 3.0
        P.fill(m, pt.ramp(cols[i], 6, shift=0.06), tone=sh, base=0.06)
        P.fill(m & (np.abs(np.mod(u * 2.4 - np.abs(vc) * 1.6, 1.0) - 0.5) < 0.12) & (u < PL * 0.72), LEAFG, tone=sh, base=0.1)
        ex, er = PL * 0.84, np.hypot((u - PL * 0.84) * 0.8, vc)
        P.fill(m & (er < 1.25), LEAFG, tone=sh, base=0.12)
        P.fill(m & (er < 0.85), pt.ramp('#2f5aa8' if i % 2 == 0 else '#2f8a6a', 5), tone=sh, base=0.1)
        P.fill(m & (er < 0.42), pt.ramp('#1d1a20', 3), tone=sh, base=0.0)
        P.fill(m & (np.abs(vc) < 0.14) & (u < PL * 0.72), LEAFG, tone=sh, base=0.15)            # the quill
    # the face: a fierce little ink eye ringed in vermilion, each side of its head
    import face
    for sx in (1, -1):
        c = W((sx * 1.25, -2.9, 14.15))
        ax = Wd((sx * 1.0, -0.35, 0.1))
        fc = face.Face(P, c=tuple(c), axis=tuple(ax), where=P.region('gold'), seed=870 + sx)
        fc.patch(0.0, 0.0, 0.78, 0.6, '#d0402a')
        fe = face.Face(P, c=tuple(c), axis=tuple(ax), where=P.region('gold'), seed=872 + sx)
        fe.eyes('dot', spread=0.0, size=0.33, dy=0.0, only=1)
        fe.brows('angry', spread=0.4, dy=0.55, w=0.8, weight=0.16, only=1 if sx > 0 else -1)
    P.lines(['leaf', 'beak', 'red', 'breast', 'crest'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint,
       skip=[('key', 'base'), ('body', 'base'), ('head', 'body'), ('jaw', 'head'), ('wing_r', 'body'), ('wing_l', 'body')] +
       [(p[0], 'body') for p in plumes] + [(a[0], c[0]) for i, a in enumerate(plumes) for c in plumes[i + 1:]],
       cam=((44, -62, 40), (0, 0, 16)), fold=(0, 30, 44, 90), frames=112)
