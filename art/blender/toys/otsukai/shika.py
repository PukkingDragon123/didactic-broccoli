"""春日ジカ Kasuga Deer: series otsukai, The Gods' Messengers (concepts_B.md).

The Kasuga shrine's sacred deer as a black-lacquer idol: kneeling on its vermilion step, legs folded under, a gold
spotted coat, gold antlers with a sakaki branch laid across them and white paper shide hanging from it, a vermilion
saddle cloth printed with wisteria.
Gimmick: it bows deeply (the way the deer at Nara bow), twice, the shide swinging, and flicks its ears.

    tools/blender.sh art/blender/toys/otsukai/shika.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import ak  # noqa: E402

F = bk.start('otsukai', 'shika')
base_lo, base_hi, PZ = ak.plinth('plinth', [(22.0, 36.0, 3.2), (18.0, 32.0, 2.6)])

# ------------------------------------------------------------------ the body, kneeling (along y, head to -y)
ZC = PZ + 6.0
BODY = [(13.0, 9.0, 4.8, 4.0), (9.0, 12.6, 6.0, 5.0), (3.0, 14.0, 6.6, 5.6), (-3.0, 14.0, 6.8, 5.6), (-7.5, 12.6, 6.6, 5.2), (-10.5, 9.6, 5.8, 4.4)]


def sc_body(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 6.4, 8.0, ZC - 0.5), 5.0, 1.1)       # the haunches over the folded hind legs
            d += tk.bump(V, (sx * 5.8, -6.5, ZC + 1.0), 3.6, 0.6)      # shoulders
        d -= 0.25 * np.exp(-(V[:, 0] / 0.45) ** 2) * tk.smoothstep(0.4, 0.9, N[:, 2])  # the spine line
        return d
    tk.push(h, f)


body_lo, body_hi = ak.spine('body', [(0, y, ZC + (0.4 if y < -6 else 0)) for y, w, a, b in BODY], [w for y, w, a, b in BODY],
                            [a for y, w, a, b in BODY], [b for y, w, a, b in BODY], e=2.3, n=16, up=(0, 0, 1), tris=330,
                            sculpt=sc_body, cap0='round', cap1='round')
# folded legs: forelegs tucked forward under the chest, hind hocks along the sides; little black hooves
legs_lo, legs_hi = [], []
for sx in (1, -1):
    for pts, r in (([(sx * 3.4, -6.0, PZ + 2.4), (sx * 3.2, -10.5, PZ + 1.6), (sx * 3.0, -13.6, PZ + 1.3)], 1.6),
                   ([(sx * 6.4, 10.6, PZ + 2.0), (sx * 6.0, 5.6, PZ + 1.5), (sx * 5.4, 2.4, PZ + 1.3)], 1.5)):
        lo, hi = ak.spine('leg', pts, 2 * r, r, n=8, up=(0, 0, 1), tris=40, cap0='round', cap1='round')
        legs_lo.append(lo)
        legs_hi += hi
        e_ = np.array(pts[-1]) + (np.array(pts[-1]) - np.array(pts[-2])) / np.linalg.norm(np.array(pts[-1]) - np.array(pts[-2])) * 1.2
        hv = tk.lathe('hoof_hi', [(0, -1.4), (1.3, -1.1), (1.4, 0.4), (0.9, 1.3), (0, 1.5)], n=12, axis='Y', centre=tuple(e_))
        tk.set_region(hv, 'hoof')
        legs_hi.append(hv)

# ------------------------------------------------------------------ neck and head (one bone: the bow), ears, antlers
NECK0 = (0.0, -10.2, ZC + 1.6)
HZ = PZ + 21.0
neck_lo, neck_hi = ak.spine('neck', [(0.0, -7.6, ZC + 3.0), (0.0, -9.6, ZC + 8.0), (0.0, -10.6, HZ - 3.0)], [7.6, 6.4, 5.8], [3.6, 3.1, 2.8], n=10,
                            up=(0, -1, 0), tris=70, cap0='round', cap1='round')
HEAD = [(0, -8.2, HZ + 0.8), (0, -10.6, HZ + 0.6), (0, -13.4, HZ - 0.4), (0, -15.6, HZ - 1.6), (0, -16.9, HZ - 2.2)]


def sc_head(h):
    def f(V, N):
        d = tk.bump(V, (0, -17.1, HZ - 2.0), 1.3, 0.35)  # the nose
        for sx in (1, -1):
            d += tk.bump(V, (sx * 3.6, -11.6, HZ + 1.6), 1.8, 0.3)  # brow bumps (the bases of the antlers' pedicles)
        return d
    tk.push(h, f)


head_lo, head_hi = ak.spine('head', HEAD, [9.8, 11.0, 8.0, 5.4, 3.6], [5.0, 4.9, 3.6, 2.6, 1.8], [4.6, 4.4, 3.2, 2.4, 1.7], e=2.2,
                            n=12, up=(0, 0, 1), tris=200, sculpt=sc_head)
EARS = {}
for nm, sx in (('ear_l', -1), ('ear_r', 1)):
    root = (sx * 3.9, -9.4, HZ + 1.8)
    lo, hi, r_, tip = tt.corner(nm, root, 0 if sx > 0 else 180, L=6.6, W=4.4, a0=22, a1=6, cup=0.9, ripple=0.0, tris=30,
                                thick=1.0, root_r=0.0, root_z=0.0, shape=0.9, power=1.0, region='ear')
    EARS[nm] = (lo, hi, root)
ant_lo, ant_hi = [], []
for sx in (1, -1):
    b0 = np.array((sx * 2.8, -11.2, HZ + 3.2))
    main = [tuple(b0), tuple(b0 + (sx * 1.8, 1.0, 3.6)), tuple(b0 + (sx * 3.8, 2.6, 6.6)), tuple(b0 + (sx * 4.4, 4.6, 9.4))]
    tines = [[main[1], tuple(np.array(main[1]) + (sx * 0.6, -2.6, 2.0))], [main[2], tuple(np.array(main[2]) + (sx * 1.8, -1.8, 2.6))]]
    for pts, r0, r1 in [(main, 0.9, 0.5)] + [(t_, 0.6, 0.35) for t_ in tines]:
        rr = list(np.linspace(r0, r1, len(pts)))
        ant_lo.append(tk.tube('ant', pts, rr, n=4, cap0='flat', cap1='point'))
        h_ = tk.tube('ant_hi', pts, rr, n=10, cap0='flat', cap1='point')
        tk.subsurf(h_, 1)
        tk.set_region(h_, 'gold')
        ant_hi.append(h_)
# the sakaki branch laid across the antlers, its leaves, and shide (zig-zag paper) hanging from it
BR = [(-9.0, -9.6, HZ + 9.2), (-3.0, -8.8, HZ + 8.4), (3.0, -8.4, HZ + 8.6), (9.4, -8.8, HZ + 9.6)]
br_lo = tk.tube('branch', BR, 0.55, n=5, cap0='round', cap1='round')
br_hi = tk.tube('branch_hi', BR, 0.55, n=10, cap0='round', cap1='round')
tk.set_region(br_hi, 'branch')
lf_lo, lf_hi = [], []
for i, (x, a) in enumerate(((-8.0, 40), (-5.6, -30), (-1.0, 60), (2.2, -50), (5.6, 30), (8.4, -40))):
    z = np.interp(x, [p[0] for p in BR], [p[2] for p in BR])
    y = np.interp(x, [p[0] for p in BR], [p[1] for p in BR])
    leaf = [(0, 0), (1.4, 0.9), (3.6, 0.6), (4.6, 0.0), (3.6, -0.6), (1.4, -0.9)]
    for nm_, lst, bev in (('sleaf', lf_lo, 0.0), ('sleaf_hi', lf_hi, 0.15)):
        o = tk.slab(nm_, leaf, 0.45, plane='XY', bevel=bev, segs=1 if bev else 0)
        tk.rotate(o, 25, 'X')
        tk.rotate(o, a + (0 if i % 2 else 180) * 0, 'Z')
        tk.rotate(o, 18 if i % 2 else -18, 'Y')
        tk.move(o, (x, y, z + 0.3))
        lst.append(o)
for o in lf_hi:
    tk.set_region(o, 'sleaf')
SHIDE = []
for sx in (1, -1):
    top = np.array((sx * 6.6, -9.0, HZ + 8.6))
    zz = [(0.0, 0.0), (2.2, 0.0), (2.2, -2.4), (0.6, -2.4), (0.6, -4.8), (2.6, -4.8), (2.6, -7.4), (1.2, -7.4), (1.2, -9.6),
          (-0.4, -9.6), (-0.4, -7.0), (1.0, -7.0), (1.0, -5.2), (-1.0, -5.2), (-1.0, -2.8), (0.6, -2.8), (0.6, -0.8), (0.0, -0.8)]
    for nm_, bev in (('shide', 0.0), ('shide_hi', 0.12)):
        o = tk.slab(nm_, zz, 0.35, plane='XZ', bevel=bev, segs=1 if bev else 0)
        tk.move(o, tuple(top))
        SHIDE.append(o)
for o in SHIDE[1::2]:
    tk.set_region(o, 'shide')

# ------------------------------------------------------------------ the saddle cloth over its back (wisteria)
def saddle(nm, nu, nv, rip=0.0, th=0.5):
    V, F_ = [], []
    for layer in (0, 1):
        for i in range(nv):
            y = 4.6 - 9.4 * i / (nv - 1)
            w = float(np.interp(-y, [-b[0] for b in BODY], [b[1] for b in BODY]))
            ht = float(np.interp(-y, [-b[0] for b in BODY], [b[2] for b in BODY]))
            for j in range(nu):
                ph = math.radians(-96 + 192 * j / (nu - 1))
                g = 0.5 + (th if layer else 0) + rip * math.sin(j * 1.7 + i)
                hem = 0.5 * (abs(ph) / math.radians(96)) ** 6
                V.append(((w / 2 + g + hem) * math.sin(ph), y, ZC + (ht + g) * math.cos(ph) * (1.0 if math.cos(ph) > 0 else 0.8)))
    n_ = nu * nv

    def ix(l, i, j):
        return l * n_ + i * nu + j
    for i in range(nv - 1):
        for j in range(nu - 1):
            F_.append([ix(0, i, j), ix(0, i, j + 1), ix(0, i + 1, j + 1), ix(0, i + 1, j)])
            F_.append([ix(1, i, j), ix(1, i + 1, j), ix(1, i + 1, j + 1), ix(1, i, j + 1)])
    for i in range(nv - 1):
        F_.append([ix(0, i, 0), ix(0, i + 1, 0), ix(1, i + 1, 0), ix(1, i, 0)])
        F_.append([ix(0, i, nu - 1), ix(1, i, nu - 1), ix(1, i + 1, nu - 1), ix(0, i + 1, nu - 1)])
    for j in range(nu - 1):
        F_.append([ix(0, 0, j), ix(1, 0, j), ix(1, 0, j + 1), ix(0, 0, j + 1)])
        F_.append([ix(0, nv - 1, j), ix(0, nv - 1, j + 1), ix(1, nv - 1, j + 1), ix(1, nv - 1, j)])
    return tk.from_pydata(nm, V, F_)


sad_lo = saddle('saddle', 9, 5)
sad_hi = saddle('saddle_hi', 36, 16, rip=0.06)
tk.subsurf(sad_hi, 1)
tk.set_region(sad_hi, 'saddle')

# ------------------------------------------------------------------ parts
F.part('plinth', base_lo, base_hi)
F.part('body', tk.join([body_lo, sad_lo] + legs_lo, 'body'), body_hi + [sad_hi] + legs_hi)
F.part('neck', neck_lo, neck_hi, bone='neck')
F.part('head', tk.decimate(tk.join([head_lo] + ant_lo + [br_lo] + lf_lo + SHIDE[0::2], 'head'), 500), head_hi + ant_hi + [br_hi] + lf_hi + SHIDE[1::2],
       bone='head', sharp=70)
HP = (0.0, -9.8, HZ - 2.0)  # the nod: where the head sits on the neck
for nm, (lo, hi, root) in EARS.items():
    F.part(nm, lo, [hi], bone=nm, sharp=60)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('neck', NECK0, parent='root')
    R.bone('head', HP, parent='neck')
    for nm, (lo, hi, root) in EARS.items():
        R.bone(nm, root, parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'neck', 'head', 'ear_l', 'ear_r']
        # (the neck dips a little with each bow, the head does the rest)
        for f, a in ((6, -3), (16, 6), (22, 5), (28, -1), (40, 7), (50, 6), (60, -1), (66, 0)):
            k('neck', f, rot=('X', a))
        for b in bones:
            k(b, 0)
        # 0-8 it lifts its head (anticipation), then two deep bows, the second slower and deeper
        k('head', 6, rot=('X', -6))
        k('head', 16, rot=('X', 16))
        k('head', 22, rot=('X', 14))
        k('head', 28, rot=('X', -4), ease='BACK')
        k('head', 40, rot=('X', 19))
        k('head', 50, rot=('X', 17))
        k('head', 60, rot=('X', -3), ease='BACK')
        k('head', 66)
        # the ears flick back at each bow and pop up again
        for nm, sx in (('ear_l', -1), ('ear_r', 1)):
            for t0 in (14, 38):
                k(nm, t0)
                k(nm, t0 + 3, rot=('Y', -sx * 22))
                k(nm, t0 + 10, ease='BACK')
            k(nm, 62, rot=('Y', sx * 14))
            k(nm, 66)
        for b in bones:
            k(b, 72)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.2)
    LAC = pt.ramp('#26222b', 7, shift=0.08, light=0.55)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    VERM = pt.ramp('#cc4a32', 7, shift=0.06)
    P.fill('body', LAC, tone=sh * 0.55, base=0.08)
    P.fill('head', LAC, tone=sh * 0.55, base=0.08)
    P.fill('neck', LAC, tone=sh * 0.55, base=0.08)
    P.fill('leg', LAC, tone=sh * 0.55, base=0.08)
    P.fill('ear', LAC, tone=sh * 0.55, base=0.08)
    P.fill(P.region('ear') & (P.on[:, :, 2] > 0.3), GOLD, tone=sh, base=0.08)
    P.fill('hoof', pt.ramp('#141215', 5, shift=0.05), tone=sh, base=0.15)
    # the coat's spots in gold leaf: two rows along each flank (the saddle cloth covers the middle)
    spots = np.zeros_like(P.mask)
    for sx in (1, -1):
        for y0, z0 in ((10.5, ZC + 3.0), (8.0, ZC + 4.4), (5.0, ZC + 3.6), (11.0, ZC + 0.6), (-8.6, ZC + 3.2), (-9.6, ZC + 0.8)):
            spots |= (np.hypot(Yc - y0, Z - z0) < 0.9) & (X * sx > 2.5)
    P.fill(P.region('body') & spots, GOLD, tone=sh, base=0.1)
    P.fill('gold', GOLD, tone=sh * 1.2, base=0.12)
    P.fill('saddle', VERM, tone=sh, base=0.05)
    # wisteria on the saddle: hanging clusters of small purple petals with a gold border along the hem
    sad = P.region('saddle')
    hem = sad & (Z < ZC + 0.8)
    P.fill(hem, GOLD, tone=sh, base=0.1)
    wis = np.zeros_like(P.mask)
    for y0, x0 in ((4.4, 4.5), (0.0, 5.6), (-4.0, 4.8), (2.2, -5.0), (-2.2, -5.6), (5.4, -4.4)):
        for k_ in range(5):
            zz = ZC + 5.0 - k_ * 0.9
            wis |= (np.hypot(Yc - y0 - 0.25 * (k_ % 2), Z - zz) < 0.55 - 0.06 * k_) & (np.sign(X) == np.sign(x0))
    P.fill(sad & wis & ~hem, pt.ramp('#9a7ac8', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('branch', pt.ramp('#6b4a33', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('sleaf', pt.ramp('#3f7a4a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('shide', pt.ramp('#f3efe6', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('plinth', VERM, tone=sh, base=0.0)
    # the face in cream ink: round, wide-apart dot eyes (a gentle deer), a tiny 'w' of a mouth under the nose
    import face
    fc = face.Face(P, c=(0.0, -12.2, HZ + 0.6), axis=(0, -1, 0.35), where=P.region('body'), seed=71, ink='#efe4c8')
    fc.eyes('dot', spread=7.6, size=0.62, dy=0.9)
    fc2 = face.Face(P, c=(0.0, -16.4, HZ - 2.0), axis=(0, -1, -0.2), where=P.region('body'), seed=72, ink='#efe4c8')
    fc2.mouth('w', w=1.6, dy=-0.8)
    P.lines(['saddle'], step=2)
    P.lines(['shide', 'sleaf', 'gold'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'plinth'), ('neck', 'head')], cam=((76, -96, 60), (0, -2, 15)), fold=(0, 16, 40, 60), frames=72)
