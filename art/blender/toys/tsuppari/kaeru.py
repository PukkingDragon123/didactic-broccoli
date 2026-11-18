"""ヤンキー座りガエル Squatting Frog: series tsuppari, Tsuppari Zoo (concepts_B.md).

A green frog in the yankī squat on a scrap of shop-front pavement: heels down, knees out, one forearm on his knee,
a wooden sword over his shoulder, a grass stalk in the corner of his wide mouth, a sideways glare. He wears a satin
sukajan (black body, red sleeves, 夜露死苦 embroidered in gold across the back) and purple jersey trousers, bare
webbed feet. At his toes, a stray duckling looks up at him; it has decided he is its mother.
Gimmick: he pops up out of the squat and points the sword, and the duckling waddles after him; he squats back down.

    tools/blender.sh art/blender/toys/tsuppari/kaeru.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('tsuppari', 'kaeru')
low, high = [], []

# ------------------------------------------------------------------ a scrap of pavement: a slab and its kerb
BZ = 2.4
base_hi = [tk.rbox('slab_hi', (30.0, 27.0, BZ), centre=(0, -1.0, BZ / 2), bevel=0.6, segs=2)]
base_lo = [tk.rbox('slab', (30.0, 27.0, BZ), centre=(0, -1.0, BZ / 2), bevel=0.4, segs=1)]
base_hi.append(tk.rbox('kerb_hi', (30.0, 3.4, 1.4), centre=(0, 10.8, BZ + 0.7), bevel=0.4, segs=2))
base_lo.append(tk.rbox('kerb', (30.0, 3.4, 1.4), centre=(0, 10.8, BZ + 0.7), bevel=0.3, segs=1))
tk.push(base_hi[0], lambda V, N: -0.25 * (np.abs(np.sin(V[:, 0] * 0.42)) < 0.04) * (N[:, 2] > 0.5) - 0.25 * (np.abs(V[:, 1] + 1.0) < 0.12) * (N[:, 2] > 0.5))
for o in base_hi:
    tk.set_region(o, 'slab')

# ------------------------------------------------------------------ the squat: webbed feet flat, shins up to wide knees, thighs back
KNEE = {}
LEG = {}
for sx in (1, -1):
    an = np.array((sx * 6.2, -2.6, BZ + 1.2))
    # the foot: a flat pad and three long toes fanned forward with round tips
    pad = tk.lathe('foot', [(0, 0), (2.6, 0.0), (2.8, 0.7), (2.0, 1.5), (0, 1.8)], n=8, centre=(an[0], an[1] - 0.6, BZ))
    tk.scale(pad, (1.0, 1.3, 1.0), pivot=(an[0], an[1] - 0.6, BZ))
    ph = tk.copy(pad, 'foot_hi')
    tk.subsurf(ph, 2)
    tk.set_region(ph, 'skin')
    low.append(pad)
    high.append(ph)
    for a in (-34, -6, 22):
        d = np.array((math.sin(math.radians(a)) * sx, -math.cos(math.radians(a)), 0))
        p0 = np.array((an[0], an[1] - 1.6, BZ + 0.6))
        tip = p0 + d * 5.2 + (0, 0, -0.1)
        lo, hi = ak.spine('toe', [tuple(p0), tuple(p0 + d * 2.6), tuple(tip)], [1.6, 1.1, 1.5], [0.6, 0.45, 0.6], n=6, up=(0, 0, 1),
                          tris=14, region='skin', cap0='round', cap1='round')
        low.append(lo)
        high += hi
    knee = np.array((sx * 9.0, -5.4, BZ + 11.6))
    hip = np.array((sx * 4.4, 3.4, BZ + 6.4))
    KNEE[sx] = knee
    lo, hi = ak.spine('shin', [tuple(an), tuple((an + knee) / 2 + (sx * 0.4, 0, 0)), tuple(knee)], [5.6, 6.6, 6.4], [2.8, 3.2, 3.2],
                      n=10, up=(0, -1, 0), tris=50, region='pants', cap0='round', cap1='round')
    tk.push(hi[0], lambda V, N: 0.12 * np.cos(V[:, 2] * 1.4 + V[:, 1]) ** 8)  # jersey creases
    low.append(lo)
    high += hi
    lo, hi = ak.spine('thigh', [tuple(knee), tuple((knee + hip) / 2 + (sx * 0.8, 0, 0.8)), tuple(hip)], [6.6, 8.0, 7.6], [3.4, 4.0, 3.8],
                      n=10, up=(0, 0, 1), tris=56, region='pants', cap0='round', cap1='round')
    tk.push(hi[0], lambda V, N: 0.12 * np.cos(V[:, 1] * 1.3 + V[:, 2]) ** 8)
    LEG[sx] = (lo, hi)

# ------------------------------------------------------------------ the body, leaning over his knees, in a satin sukajan
TORSO = [(0, 3.8, BZ + 4.6), (0, 2.8, BZ + 9.0), (0, 0.8, BZ + 13.6), (0, -1.0, BZ + 17.6), (0, -1.8, BZ + 19.8)]
tor_lo, tor_hi = ak.spine('torso', TORSO, [10.6, 13.2, 13.4, 13.6, 9.6], [5.6, 6.2, 6.0, 5.4, 4.0], [5.4, 6.0, 5.6, 5.0, 3.8],
                          e=2.2, n=14, up=(0, -1, 0), tris=200, region='jacket', cap0='round', cap1='round')


def sc_torso(V, N):
    z = V[:, 2] - BZ
    d = 0.35 * np.exp(-((z - 8.6) / 0.6) ** 2) - 0.25 * np.exp(-((z - 9.4) / 0.25) ** 2)      # the ribbed hem
    d += 0.12 * (np.cos(np.arctan2(V[:, 0], V[:, 1]) * 30) > 0.3) * (np.abs(z - 8.6) < 0.7)
    d -= 0.3 * np.exp(-((V[:, 0] - 0.6) / 0.3) ** 2) * tk.smoothstep(-0.2, -0.7, N[:, 1]) * (z > 9.0)  # the zip
    d += 0.12 * np.cos(z * 1.2 + V[:, 0] * 0.4) ** 8 * (z > 9.6) * (z < 15)                 # satin folds
    return d


tk.push(tor_hi[0], sc_torso)
tk.regions(tor_hi[0], 'jacket', [('pants', lambda C, N: C[:, 2] < BZ + 8.2), ('rib', lambda C, N: np.abs(C[:, 2] - BZ - 8.7) < 0.7)])
col_lo, col_hi = ak.stack('collar', [(BZ + 18.6, -1.4, 10.4, 4.6, 4.4, 2.2), (BZ + 20.4, -1.8, 10.0, 4.3, 4.1, 2.2)], n=12, tris=40,
                          region='rib', cap0=None, cap1=None)
# the left arm: forearm draped over the knee, the hand hanging
la_lo, la_hi, _ = tt.arm('arm_l', [(-7.0, -0.8, BZ + 17.6), (-10.4, -3.4, BZ + 14.4), (-9.6, -7.4, BZ + 13.4), (-8.0, -9.6, BZ + 11.6)],
                         r=2.3, hand=2.0, tris=56, region='sleeve', hand_region='skin')

# ------------------------------------------------------------------ the head: wide and flat, the eyes bulging on top
HZ = BZ + 25.4
HEAD = [(0, 2.4, HZ + 0.2), (0, -0.8, HZ + 0.6), (0, -4.4, HZ + 0.4), (0, -7.6, HZ - 0.6), (0, -9.6, HZ - 1.4)]
head_lo, head_hi = ak.spine('head', HEAD, [12.6, 18.0, 18.4, 15.4, 9.6], [4.6, 5.4, 5.2, 4.0, 2.4], [5.2, 5.8, 5.4, 4.2, 2.6],
                            e=2.3, n=14, up=(0, 0, 1), tris=180, region='skin')


def sc_head(V, N):
    # the mouth: one long crease from cheek to cheek
    m = np.exp(-((V[:, 2] - (HZ - 1.4 - 0.025 * V[:, 0] ** 2 + 0.6 * tk.smoothstep(-2, -8, V[:, 1]))) / 0.35) ** 2)
    d = -0.4 * m * tk.smoothstep(-2.5, -6.0, V[:, 1])
    d += tk.bump(V, (0, -9.8, HZ - 0.9), 2.0, 0.3)                         # the snout's nostrils ridge
    d += 0.25 * tk.smoothstep(-0.3, -0.8, N[:, 2]) * tk.smoothstep(-2, -6, V[:, 1])  # a full throat
    return d


tk.push(head_hi[0], sc_head)
EYES = []
for sx in (1, -1):
    c = (sx * 5.0, -4.6, HZ + 4.4)
    prof = [(0, -2.6), (2.8, -2.0), (3.3, 0.0), (2.8, 1.6), (1.6, 2.6), (0, 3.0)]
    for nm_, n_ in (('eye_hi', 16), ('eye', 8)):
        o = tk.lathe(nm_, prof, n=n_, centre=c)
        tk.rotate(o, -24, 'X', pivot=c)
        tk.rotate(o, sx * 12, 'Y', pivot=c)
        if nm_ == 'eye_hi':
            tk.subsurf(o, 1)
            tk.set_region(o, 'skin')
        EYES.append(o)
# the grass stalk in the corner of his mouth
gp = [(4.6, -8.0, HZ - 1.6), (8.2, -10.0, HZ - 0.6), (11.4, -11.6, HZ + 1.6), (13.0, -12.0, HZ + 3.6)]
gr_lo, gr_hi = ak.spine('grass', gp, [0.9, 1.0, 0.8, 0.2], 0.25, n=6, up=(0, 0, 1), tris=16, region='grass', cap0='round', cap1='point')
gh_lo, gh_hi = ak.spine('ghead', [(11.0, -11.4, HZ + 1.2), (12.8, -12.0, HZ + 3.6), (13.6, -12.2, HZ + 5.4)], [1.4, 1.6, 0.4], 1.0,
                        n=6, up=(0, 0, 1), tris=16, region='grassh', cap0='round', cap1='point')

# ------------------------------------------------------------------ the right arm and the wooden sword over his shoulder
SH = (7.0, -0.8, BZ + 17.6)
ra_lo, ra_hi, HR = tt.arm('arm_r', [SH, (10.6, -4.0, BZ + 14.6), (10.6, -6.6, BZ + 18.0)], r=2.3, hand=2.1, tris=50,
                          region='sleeve', hand_region='skin', mitt=(-0.6, -0.2, 0.7))
HR = np.array(HR)
SW_D = np.array((0.34, 0.86, 0.44))
SW_D /= np.linalg.norm(SW_D)
sw_pts = [tuple(HR - SW_D * 3.4), tuple(HR + SW_D * 1.0), tuple(HR + SW_D * 12.0 + (0.3, 0, 0.6)), tuple(HR + SW_D * 24.0 + (0.4, 0, 0.4))]
sw_lo, sw_hi = ak.spine('sword', sw_pts, [2.0, 2.0, 2.2, 1.6], [1.0, 1.0, 0.9, 0.7], n=6, up=(1, 0, 0), tris=36, region='wood',
                        cap0='round', cap1='round')
tk.push(sw_hi[0], lambda V, N: 0.15 * (np.mod((V - HR) @ SW_D, 2.4) < 0.4) * (((V - HR) @ SW_D) < 1.2))  # the bound grip
tsuba_hi = tk.lathe('tsuba_hi', [(0, -0.35), (2.0, -0.3), (2.1, 0.0), (2.0, 0.3), (0, 0.35)], n=12, centre=tuple(HR + SW_D * 1.6))
tsuba_lo = tk.lathe('tsuba', [(0, -0.35), (2.0, -0.3), (2.1, 0.0), (2.0, 0.3), (0, 0.35)], n=6, centre=tuple(HR + SW_D * 1.6))
from mathutils import Vector  # noqa: E402
q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(SW_D)))
for o in (tsuba_hi, tsuba_lo):
    c = Vector(tuple(HR + SW_D * 1.6))
    tk.move(o, tuple(-c))
    tk.transform(o, q.to_matrix().to_4x4())
    tk.move(o, tuple(c))
tk.set_region(tsuba_hi, 'tsuba')

# ------------------------------------------------------------------ the duckling at his toes, looking up at him
DK = (-2.6, -11.8, BZ)
db = [(0, 0.0), (1.6, 0.2), (2.0, 1.4), (1.6, 2.6), (0, 3.0)]
duck_hi = [tk.lathe('duck_hi', db, n=14, centre=DK)]
duck_lo = [tk.lathe('duck', db, n=7, centre=DK)]
for o in duck_hi + duck_lo:
    tk.scale(o, (0.9, 1.25, 1.0), pivot=DK)
DH = (DK[0], DK[1] - 1.2, DK[2] + 4.2)
for nm_, n_, lst in (('dhead_hi', 14, duck_hi), ('dhead', 7, duck_lo)):
    lst.append(tk.lathe(nm_, [(0, -1.5), (1.3, -1.1), (1.55, 0.1), (1.2, 1.1), (0, 1.45)], n=n_, centre=DH))
dbk_lo, dbk_hi = ak.spine('dbill', [(DH[0], DH[1] - 1.1, DH[2] + 0.1), (DH[0], DH[1] - 2.4, DH[2] + 0.5)], [1.3, 1.0], 0.35, n=6, up=(0, 0, 1),
                          tris=10, region='bill', cap0='round', cap1='round')
for o in duck_hi[:2]:
    tk.subsurf(o, 1)
    tk.set_region(o, 'duck')
tk.push(duck_hi[0], lambda V, N: tk.bump(V, (DK[0] + 1.8, DK[1] + 0.4, DK[2] + 1.8), 1.0, 0.4) + tk.bump(V, (DK[0] - 1.8, DK[1] + 0.4, DK[2] + 1.8), 1.0, 0.4))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi)
F.part('legs', tk.join(low, 'legs'), high)
for sx, nm in ((1, 'thigh_r'), (-1, 'thigh_l')):
    F.part(nm, LEG[sx][0], LEG[sx][1], bone=nm)
F.part('body', tk.join([tor_lo, col_lo, la_lo], 'body'), tor_hi + col_hi + la_hi, bone='body', kind='gloss')
F.part('head', tk.join([head_lo] + EYES[1::2] + [gr_lo, gh_lo], 'head'), head_hi + EYES[0::2] + gr_hi + gh_hi, bone='head')
F.part('arm', ra_lo, ra_hi, bone='arm', kind='gloss')
F.part('sword', tk.join([sw_lo, tsuba_lo], 'sword'), sw_hi + [tsuba_hi], bone='sword')
F.part('duck', tk.join(duck_lo + [dbk_lo], 'duck'), duck_hi + dbk_hi, bone='duck')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('thigh_r', tuple(KNEE[1]), parent='root')
    R.bone('thigh_l', tuple(KNEE[-1]), parent='root')
    R.bone('body', (0, 3.6, BZ + 6.0), parent='root')
    R.bone('head', (0, -1.6, BZ + 19.8), parent='body')
    R.bone('arm', SH, parent='body')
    R.bone('sword', tuple(HR), parent='arm')
    R.bone('duck', DK, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'thigh_r', 'thigh_l', 'body', 'head', 'arm', 'sword', 'duck']
        for b in bones:
            k(b, 0)
        # 0-12 he pops up out of the squat (hips up, back straight), the sword comes round to point at you
        for b in ('thigh_r', 'thigh_l'):
            k(b, 3)
            k(b, 12, rot=('X', 20), ease='BACK')
            k(b, 50, rot=('X', 20))
            k(b, 62, ease='BOUNCE')
        k('body', 3)
        k('body', 12, move=(0, 1.0, 3.0), rot=('X', -6), ease='BACK')
        k('body', 50, move=(0, 1.0, 3.0), rot=('X', -6))
        k('body', 62, ease='BOUNCE')
        k('arm', 6)
        k('arm', 16, rot=('X', -34), ease='BACK')
        k('arm', 50, rot=('X', -34))
        k('arm', 60)
        k('sword', 6)
        k('sword', 18, rot=('X', 168), ease='BACK')
        k('sword', 48, rot=('X', 168))
        k('sword', 60)
        k('head', 10)
        k('head', 16, rot=('X', -8))
        k('head', 48, rot=('X', -8))
        k('head', 58)
        # 18-48 the duckling waddles after him: three little steps forward, wobbling
        k('duck', 18)
        for i, f in enumerate((22, 26, 30, 34, 38, 42)):
            k('duck', f, move=(0, -0.9 * (i + 1) * 0.5 + 0.0, 0.5 if i % 2 == 0 else 0.0), rot=('Z', 12 if i % 2 == 0 else -12))
        k('duck', 46, move=(0, -2.7, 0))
        k('duck', 56, move=(0, -2.7, 0))
        k('duck', 68)
        for b in bones:
            k(b, 76)
    return R


import paint as pt  # noqa: E402


def glyph(name):
    return np.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'glyphs.npz'))[name]


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    # pavement: grey concrete, its expansion joints, a painted white line; the kerb a shade darker
    P.fill('slab', pt.ramp('#9c9890', 6, shift=0.04), tone=sh + 0.12 * (np.sin(X * 2.1 + Yc * 1.3) * np.sin(Yc * 1.7 - X) > 0.6), base=0.0)
    P.fill(P.region('slab') & (P.on[:, :, 2] > 0.5) & (np.abs(Yc + 10.0) < 0.9) & (Z < BZ + 0.1), pt.ramp('#e4e0d4', 4), tone=sh, base=0.15)
    P.fill(P.region('slab') & (Yc > 9.0) & (Z > BZ + 0.05), pt.ramp('#86827b', 6, shift=0.04), tone=sh, base=0.0)
    P.fill('skin', pt.ramp('#6aa046', 7, shift=0.07), tone=sh, base=0.05)
    P.fill(P.region('skin') & (np.sin(X * 1.7 + Z * 0.9) * np.sin(Yc * 1.3 - Z * 0.6) > 0.7) & (P.on[:, :, 2] > -0.2), pt.ramp('#3e6e2c', 5), tone=sh, base=0.0)
    P.fill(P.region('skin') & (Z < HZ - 1.2) & (Z > HZ - 6.0) & (Yc < -3.0) & (P.on[:, :, 2] < 0.2), pt.ramp('#d7d48c', 6, shift=0.05), tone=sh, base=0.1)  # the throat
    P.fill('pants', pt.ramp('#5c3a86', 7, shift=0.07), tone=sh, base=0.0)
    P.fill('jacket', pt.ramp('#1f1e26', 7, shift=0.08, light=0.65), tone=sh * 1.3, base=0.0)
    P.fill('sleeve', pt.ramp('#b32a2c', 7, shift=0.08, light=0.6), tone=sh * 1.3, base=0.0)
    P.fill('rib', pt.ramp('#1f1e26', 6, shift=0.06), tone=sh, base=0.0)
    P.fill(P.region('rib') & (np.mod(Z * 1.4, 1.0) < 0.3), pt.ramp('#d6a640', 4), tone=sh, base=0.0)
    # 夜露死苦 embroidered down his back, gold on black satin
    d = bk.Decal(P, (0, 7.0, BZ + 14.0), (0, 1, 0), where=P.region('jacket'))
    g = glyph('yoroshiku')
    gh, gw = g.shape
    s_ = 2.6 / gh                                     # four characters stacked top to bottom
    u, v = -d.U, d.V
    k = np.clip(((3.3 - v) / 2.6).astype(int), 0, 3)  # which character, top to bottom
    gi = np.clip((((3.3 - v) - k * 2.6) / s_).astype(int), 0, gh - 1)
    gj = np.clip(((u + 1.3) / s_).astype(int) + k * (gw // 4), 0, gw - 1)
    on = d.m & (v < 3.3) & (v > -7.1) & (np.abs(u) < 1.3) & g[gi, gj]
    P.fill(on, GOLD, tone=sh, base=0.15)
    P.fill('wood', pt.ramp('#b98a52', 6, shift=0.06), tone=sh + 0.15 * (np.sin((X + Yc * 0.2) * 9.0) > 0.7), base=0.05)
    P.fill(P.region('wood') & (np.linalg.norm(P.pos - HR, axis=2) < 3.4), pt.ramp('#3a2a22', 5), tone=sh, base=0.0)
    P.fill('tsuba', pt.ramp('#2a2522', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('grass', pt.ramp('#8ca04a', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('grassh', pt.ramp('#b8a65a', 5, shift=0.05), tone=sh, base=0.05)
    P.fill(P.region('grassh') & (np.mod(Z * 3.0, 1.0) < 0.35), pt.ramp('#8a7a3a', 4), tone=sh, base=0.0)
    P.fill('duck', pt.ramp('#f2d24a', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('bill', pt.ramp('#e8902e', 5, shift=0.05), tone=sh, base=0.1)
    # faces: his, a sideways glare from the tops of his eye bumps over the long mouth; the duckling's, adoring
    import face
    for sx in (1, -1):
        fe = face.Face(P, c=(sx * 5.4, -7.4, HZ + 4.2), axis=(sx * 0.2, -1, 0.35), where=P.region('skin'), seed=631 + sx)
        fe.eyes('dot', spread=0.01, size=0.85, dy=0.0, look=1, only=0)
        fe.stroke([(-1.6, 1.6 - 0.7 * sx), (1.6, 1.6 + 0.7 * sx)], weight=0.5)
    mf = face.Face(P, c=(0.0, -9.6, HZ - 1.2), axis=(0, -1, 0.1), where=P.region('skin'), seed=633)
    mf.nose('nostrils', dy=0.9, size=0.5)
    df = face.Face(P, c=(DH[0], DH[1] - 1.3, DH[2] + 0.6), axis=(0, -1, 0.3), where=P.region('duck'), seed=634)
    df.eyes('dot', spread=2.2, size=0.32, dy=0.2)
    df.blush(1.4, -0.5, rx=0.5, ry=0.3)
    P.lines(['grass', 'grassh', 'tsuba', 'bill'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('legs', 'base'), ('duck', 'base'), ('thigh_r', 'legs'), ('thigh_l', 'legs'), ('body', 'thigh_r'),
                                 ('body', 'thigh_l'), ('body', 'legs'), ('head', 'body'), ('arm', 'body'), ('sword', 'arm'),
                                 ('thigh_r', 'base'), ('thigh_l', 'base'), ('body', 'base')],
       cam=((66, -92, 58), (0, 0, 16)), fold=(0, 12, 18, 40), frames=76)
