"""リーゼント鶏 Regent Rooster: series tsuppari, Tsuppari Zoo (concepts_B.md).

A white rooster in a long black gakuran (stand-up collar, gold buttons, the hem flaring at his knees), baggy bontan
trousers, scaly yellow legs on a pair of geta, his comb grown into a towering red regent pompadour with the comb's
points along its crest and sickle tail feathers jutting out of the jacket's back vent. Left hand in his pocket, right
hand on the comb in his back pocket. The soft heart: a lost chick asleep in the pompadour, which he never mentions.
Gimmick: the pompadour bounces (the chick pops up), he whips the comb out over his shoulder and slicks the side of
his hair back, twice, chin up, and puts it away.

    tools/blender.sh art/blender/toys/tsuppari/niwatori.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('tsuppari', 'niwatori')

# ------------------------------------------------------------------ geta, the hanao thongs, scaly legs and toes
GX, GY = 5.0, -0.8
low, high = [], []
for sx in (1, -1):
    cx = sx * GX
    high.append(tk.rbox('geta_hi', (6.2, 12.0, 1.8), centre=(cx, GY, 2.7), bevel=0.45, segs=2))
    low.append(tk.rbox('geta', (6.2, 12.0, 1.8), centre=(cx, GY, 2.7), bevel=0.3, segs=1))
    for ty in (-3.5, 3.5):
        high.append(tk.rbox('tooth_hi', (5.8, 1.4, 1.9), centre=(cx, GY + ty, 0.95), bevel=0.25, segs=1))
        low.append(tk.rbox('tooth', (5.8, 1.4, 1.9), centre=(cx, GY + ty, 0.95), bevel=0, segs=0))
    for h_ in high[-3:]:
        tk.set_region(h_, 'geta')
    # the thong: from one side of the board up over the foot to the hole between the toes and back down the other side
    pts = [(cx - 2.8, GY + 0.6, 3.5), (cx - 2.3, GY - 0.6, 4.6), (cx, GY - 3.0, 4.9), (cx, GY - 4.2, 3.5)]
    pts = pts + [(cx + 2.3, GY - 0.6, 4.6), (cx + 2.8, GY + 0.6, 3.5)]
    for seg in (pts[:4], [pts[2], pts[4], pts[5]]):
        h_ = tk.tube('hanao_hi', seg, 0.5, n=8)
        tk.subsurf(h_, 1)
        tk.set_region(h_, 'hanao')
        high.append(h_)
        low.append(tk.tube('hanao', seg, 0.5, n=4, cap0=None, cap1=None))
    # the shank out of the trouser cuff, the toes splayed on the board (three forward, one back)
    ank = (cx, GY + 0.6, 4.1)
    lo, hi = ak.spine('leg', [ank, (cx * 0.98, GY + 0.7, 7.6)], [2.1, 2.0], 1.05, n=7, up=(0, -1, 0), tris=18, region='leg')
    low.append(lo)
    high += hi
    for a in (-30, 0, 30, 180):
        d = np.array((math.sin(math.radians(a)) * sx, -math.cos(math.radians(a)), 0))
        tip = np.array(ank) + d * (3.8 if a != 180 else 2.0) + (0, 0, -0.5)
        lo, hi = ak.spine('toe', [ank, tuple((np.array(ank) + tip) / 2 + (0, 0, 0.1)), tuple(tip)], [1.3, 1.0, 0.5], [0.65, 0.55, 0.3],
                          n=5, up=(0, 0, 1), tris=10, region='leg', cap0='round', cap1='point')
        low.append(lo)
        high += hi

# ------------------------------------------------------------------ bontan trousers: wide balloon legs, tight at the cuff
for sx in (1, -1):
    pts = [(sx * 3.6, 0.8, 18.4), (sx * 4.7, 0.2, 13.8), (sx * 5.1, -0.4, 10.0), (sx * GX, GY + 0.7, 6.6)]
    lo, hi = ak.spine('pants', pts, [8.2, 10.4, 9.2, 4.2], [4.2, 5.2, 4.6, 2.2], n=12, up=(0, -1, 0), tris=64, region='pants',
                      cap0='round', cap1='flat')
    # the drape: long folds falling to the cuff, bunched where they gather
    tk.push(hi[0], lambda V, N, sx=sx: 0.3 * np.cos(np.arctan2(V[:, 1], V[:, 0] - sx * 4.8) * 4.0 + V[:, 2] * 0.15) ** 4
            * tk.smoothstep(16.0, 11.0, V[:, 2]) + 0.25 * np.cos(V[:, 2] * 3.0) ** 6 * (V[:, 2] < 8.6))
    low.append(lo)
    high += hi

# ------------------------------------------------------------------ the tanran gakuran: short, pigeon chest, square shoulders
JK = [(15.6, 0.4, 15.6, 7.2, 7.0, 2.4), (18.0, 0.2, 14.6, 7.2, 6.4, 2.3), (21.8, -0.6, 15.8, 8.6, 6.0, 2.2),
      (25.4, -0.2, 17.8, 7.4, 5.8, 3.0), (27.8, 0.2, 14.8, 5.8, 5.2, 2.6), (29.6, 0.4, 9.0, 4.2, 4.2, 2.0)]
BUTTONS = [17.0, 19.6, 22.2, 24.8]


def sc_jacket(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = tk.smoothstep(-0.2, -0.7, N[:, 1])
        back = tk.smoothstep(0.2, 0.7, N[:, 1])
        d = -0.28 * np.exp(-((x - 0.9) / 0.32) ** 2) * front * (z < 28.5)          # the placket's edge
        for bz in BUTTONS:
            cy, w, ht, hb = ak.stack_at(JK, bz)
            d += tk.bump(V, (0, cy - ht, bz), 0.75, 0.45)
        for sx in (1, -1):
            d -= 0.25 * np.exp(-((z - 26.0 + 0.12 * np.abs(x)) / 0.3) ** 2) * (np.abs(x) > 4.5)  # shoulder seams
        d -= 0.4 * np.exp(-(x / 0.35) ** 2) * (z < 18.0) * back                    # the back vent
        d -= 0.3 * np.exp(-((z - 16.6) / 0.3) ** 2)                                # the hem band
        return d
    tk.push(h, f)


jk_lo, jk_hi = ak.stack('jacket', JK, n=18, tris=226, sculpt=sc_jacket, region='jacket', cap0='flat', cap1='round')
col_lo, col_hi = ak.stack('collar', [(28.6, 0.4, 10.8, 5.2, 5.2, 2.2), (31.8, 0.5, 10.2, 4.9, 4.9, 2.2)], n=12, tris=48,
                          region='collar', cap0=None, cap1=None)
low += [jk_lo, col_lo]
high += jk_hi + col_hi

# the left hand shoved in the trousers' side pocket
la_lo, la_hi, _ = tt.arm('arm_l', [(-7.4, 0.2, 25.8), (-9.8, 0.8, 20.8), (-9.2, -0.2, 16.2), (-8.0, -0.6, 14.0)], r=2.5, hand=1.2,
                         tris=48, region='sleeve', hand_region='pants')
low.append(la_lo)
high += la_hi

# ------------------------------------------------------------------ sickle tail feathers out of the back vent
for pts, w in (([(0, 4.4, 16.6), (0, 8.4, 17.6), (0, 11.8, 21.2), (0, 12.4, 26.0), (0, 11.0, 29.4)], [2.4, 3.3, 3.1, 2.4, 0.5]),
               ([(-0.8, 4.4, 16.8), (-1.6, 8.0, 18.4), (-2.8, 10.4, 22.0), (-3.2, 10.0, 25.0)], [2.2, 2.8, 2.4, 0.5]),
               ([(0.8, 4.4, 16.4), (1.6, 8.6, 16.8), (2.6, 11.6, 19.2), (3.0, 12.4, 22.0)], [2.2, 2.6, 2.2, 0.5])):
    lo, hi = ak.spine('tail', pts, w, 0.55, n=8, up=(1, 0, 0), tris=28, region='tail', cap0='round', cap1='point')
    tk.push(hi[0], lambda V, N: -0.12 * (np.mod(np.hypot(V[:, 1] - 8, V[:, 2] - 18), 1.6) < 0.3))  # feather barbs
    low.append(lo)
    high += hi

# ------------------------------------------------------------------ the head: a rooster's, beak, wattles
HC = (0.0, -0.8, 36.4)
# a bird's head, long front to back, the brow sloping into the beak; the neck's hackles fall over the collar
HEAD = [(0, 5.0, 36.0), (0, 2.6, 36.6), (0, -1.0, 36.8), (0, -4.6, 36.2), (0, -7.6, 35.6)]
head_lo, head_hi = ak.spine('head', HEAD, [6.0, 12.0, 13.4, 12.0, 7.4], [3.4, 6.0, 6.6, 5.6, 3.6], [3.6, 6.2, 6.8, 5.8, 3.4],
                            e=2.2, n=14, up=(0, 0, 1), tris=170, region='feather')
head_hi = head_hi[0]
NECK = [(29.2, 0.4, 10.4, 5.2, 5.2, 2.0), (31.6, 0.2, 11.0, 5.6, 5.6, 2.0), (34.0, 0.0, 10.4, 5.4, 5.2, 2.0)]
neck_lo, neck_hi = ak.stack('neck', NECK, n=12, tris=50, region='feather', cap0=None, cap1=None)


def sc_neck(V, N):
    ang = np.arctan2(V[:, 0], V[:, 1])
    return 0.55 * np.clip(np.cos(ang * 10) * 1.6 - (V[:, 2] - 29.6) * 0.6, 0, 1) + 0.15 * np.cos(ang * 20) ** 2


tk.push(neck_hi[0], sc_neck)


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        d += tk.bump(V, (sx * 5.0, HC[1] - 4.8, HC[2] - 1.0), 3.0, 0.5)     # cheeks
        d += tk.bump(V, (sx * 3.0, HC[1] - 6.8, HC[2] + 2.2), 2.0, 0.4)     # brow ridges
    # the sides slicked back: feather grooves running back
    d -= 0.12 * (np.cos((V[:, 2] - 0.1 * V[:, 1]) * 3.2) > 0.85) * (np.abs(V[:, 0]) > 4.4) * (V[:, 2] > 34.0)
    return d


tk.push(head_hi, sc_head)
tk.set_region(head_hi, 'feather')
BEAK = [(0, -6.0, 35.8), (0, -10.4, 35.2), (0, -13.4, 33.8)]
beak_lo, beak_hi = ak.spine('beak', BEAK, [4.4, 2.8, 0.5], [2.0, 1.3, 0.3], [1.6, 0.9, 0.3], n=8, up=(0, 0, 1), tris=36,
                            region='beak', cap0='round', cap1='point')
wat_lo, wat_hi = [], []
for sx in (1, -1):
    c = (sx * 0.85, -7.6, 32.4)
    prof = [(0, -2.2), (1.0, -1.8), (1.2, -0.6), (0.8, 0.8), (0, 1.6)]
    o = tk.lathe('wattle_hi', prof, n=12, centre=c)
    tk.scale(o, (0.7, 1.0, 1.0), pivot=c)
    tk.subsurf(o, 1)
    tk.set_region(o, 'red')
    wat_hi.append(o)
    o = tk.lathe('wattle', prof, n=5, centre=c)
    tk.scale(o, (0.7, 1.0, 1.0), pivot=c)
    wat_lo.append(o)

# ------------------------------------------------------------------ the regent pompadour (his comb), points on its crest
POMP = [(0, 5.0, 40.0), (0, 2.6, 44.6), (0, -1.6, 47.6), (0, -6.6, 48.8), (0, -11.2, 47.4), (0, -13.8, 44.6)]
PW = [9.6, 11.0, 11.4, 11.0, 9.6, 6.0]
PH = [3.2, 3.8, 4.2, 4.0, 3.4, 2.0]
CREST = [(0, 1.4, 50.6), (0, -3.0, 52.4), (0, -7.6, 52.6), (0, -11.6, 50.4)]


def sc_pomp(V, N):
    top = tk.smoothstep(0.1, 0.6, N[:, 2])
    d = 0.24 * np.cos(V[:, 0] * 1.9) ** 4 * (0.4 + 0.6 * top)               # the combed strands
    for c in CREST:
        d += tk.bump(V, c, 2.3, 1.5, sharp=1.2) * top                       # the comb's points
    return d


pomp_lo, pomp_hi = ak.spine('pomp', POMP, PW, PH, n=12, up=(0, 0, 1), tris=150, region='red', cap0='round', cap1='round')
tk.push(pomp_hi[0], sc_pomp)

# ------------------------------------------------------------------ the chick asleep in it
CH = (2.4, -5.4, 53.4)
chb = [(0, -1.6), (1.6, -1.2), (2.0, 0.2), (1.5, 1.4), (0, 1.8)]
chick_hi = [tk.lathe('chick_hi', chb, n=14, centre=CH)]
chick_lo = [tk.lathe('chick', chb, n=6, centre=CH)]
CHH = (CH[0], CH[1] - 1.0, CH[2] + 2.6)
for nm_, n_, lst in (('chead_hi', 14, chick_hi), ('chead', 6, chick_lo)):
    lst.append(tk.lathe(nm_, [(0, -1.4), (1.2, -1.0), (1.45, 0.1), (1.1, 1.0), (0, 1.35)], n=n_, centre=CHH))
cb_lo, cb_hi = ak.spine('cbeak', [(CHH[0], CHH[1] - 1.0, CHH[2] - 0.1), (CHH[0], CHH[1] - 2.2, CHH[2] - 0.3)], [0.9, 0.2], 0.35,
                        n=6, up=(0, 0, 1), tris=10, region='beak', cap0='round', cap1='point')
for o in chick_hi[:2]:
    tk.subsurf(o, 1)
    tk.set_region(o, 'chick')
tk.push(chick_hi[0], lambda V, N: tk.bump(V, (CH[0] + 1.9, CH[1] + 0.3, CH[2] + 0.2), 1.0, 0.4) + tk.bump(V, (CH[0] - 1.9, CH[1] + 0.3, CH[2] + 0.2), 1.0, 0.4))

# ------------------------------------------------------------------ the right arm, hand on the comb in his back pocket
SH = (7.6, 0.6, 25.8)
ra_lo, ra_hi, HCR = tt.arm('arm_r', [SH, (9.8, 3.2, 21.0), (8.2, 5.8, 16.6)], r=2.5, hand=2.0, tris=56, region='sleeve',
                           hand_region='feather', mitt=(-0.5, -0.3, 0.8))
d_ = np.array((8.2, 5.8, 16.6)) - np.array((9.8, 3.2, 21.0))
d_ /= np.linalg.norm(d_)
c0 = np.array(HCR) + d_ * 0.6
COMB = [tuple(c0 + d_ * t) for t in (0.0, 3.0, 6.4, 8.2)]
comb_lo, comb_hi = ak.spine('comb', COMB, [1.0, 1.7, 1.6, 0.5], 0.3, n=6, up=(1, 0, 0), tris=24, region='comb', cap0='round', cap1='round')
tk.push(comb_hi[0], lambda V, N: -0.25 * (np.abs(np.sin(((V - c0) @ d_) * 4.2)) < 0.35) * (((V - c0) @ d_) > 3.0))  # the teeth

# ------------------------------------------------------------------ parts
F.part('body', tk.join(low, 'body'), high)
F.part('head', tk.join([head_lo, neck_lo, beak_lo] + wat_lo, 'head'), [head_hi] + neck_hi + beak_hi + wat_hi, bone='head')
F.part('pomp', pomp_lo, pomp_hi, bone='pomp', kind='gloss')
F.part('chick', tk.join(chick_lo + [cb_lo], 'chick'), chick_hi + cb_hi, bone='chick')
F.part('arm', ra_lo, ra_hi, bone='arm')
F.part('comb', comb_lo, comb_hi, bone='arm', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', (0, 0.0, 31.0), parent='root')
    R.bone('pomp', (0, 2.6, 42.0), parent='head')
    R.bone('chick', (CH[0], CH[1], CH[2] - 1.4), parent='pomp')
    R.bone('arm', SH, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'pomp', 'chick', 'arm']
        for b in bones:
            k(b, 0)
        # 0-12 the pompadour boings, the chick pops up and drops back in
        k('pomp', 3, rot=('X', 7))
        k('pomp', 7, rot=('X', -6))
        k('pomp', 11, rot=('X', 3))
        k('pomp', 15)
        k('chick', 3)
        k('chick', 7, move=(0, 0, 1.8))
        k('chick', 13, ease='BOUNCE')
        # 12-24 the comb comes out of the back pocket over his shoulder; 24-48 two slick strokes, chin up
        k('arm', 12)
        k('arm', 24, rot=[('X', 160), ('Y', -3)], ease='BACK')
        k('head', 14)
        k('head', 24, rot=[('X', -10), ('Y', -7)])
        k('arm', 31, rot=[('X', 182), ('Y', -5)])
        k('arm', 38, rot=[('X', 160), ('Y', -3)])
        k('arm', 45, rot=[('X', 182), ('Y', -5)])
        k('head', 48, rot=[('X', -10), ('Y', -7)])
        k('arm', 50, rot=[('X', 170), ('Y', -3)])
        # 50-64 the comb goes back in the pocket; 64-78 a last boing, the chick peeks out again
        k('arm', 62, ease='BACK')
        k('head', 60)
        k('pomp', 62)
        k('pomp', 66, rot=('X', 6))
        k('pomp', 70, rot=('X', -4))
        k('pomp', 74)
        k('chick', 62)
        k('chick', 67, move=(0, 0, 1.4))
        k('chick', 73, ease='BOUNCE')
        for b in bones:
            k(b, 80)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    P.fill('jacket', pt.ramp('#25242c', 7, shift=0.08, light=0.5), tone=sh, base=0.0)
    P.fill('sleeve', pt.ramp('#25242c', 7, shift=0.08, light=0.5), tone=sh, base=0.0)
    P.fill('collar', pt.ramp('#25242c', 7, shift=0.08, light=0.5), tone=sh, base=0.05)
    P.fill('pants', pt.ramp('#2b2d38', 7, shift=0.08, light=0.5), tone=sh, base=0.0)
    # gold buttons down the front, the school badge on the collar, the celluloid collar strip along its top
    jk = P.region('jacket')
    for bz in BUTTONS:
        cy, w, ht, hb = ak.stack_at(JK, bz)
        P.fill(jk & (np.hypot(X, Z - bz) < 0.8) & (Yc < cy - ht + 1.5), GOLD, tone=sh * 1.3, base=0.1)
    col = P.region('collar')
    P.flat(col & (Z > 31.2), '#ece6d8')
    P.fill(col & (np.abs(np.abs(X) - 3.1) < 0.55) & (np.abs(Z - 30.0) < 0.55) & (Yc < 0), GOLD, tone=sh, base=0.15)
    P.fill('geta', pt.ramp('#c39a63', 7, shift=0.06), tone=sh + 0.18 * (np.sin(Yc * 5.0 + np.sin(X * 2) * 0.8) > 0.6), base=0.0)
    P.fill('hanao', pt.ramp('#b3282c', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('leg', pt.ramp('#e3ae3c', 7, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region('leg') & (np.mod(Z * 1.6, 1.0) < 0.22) & (Z > 4.2), pt.ramp('#b07a24', 5), tone=sh, base=0.0)  # scales
    P.fill('feather', pt.ramp('#f1ece0', 7, shift=0.05, dark=0.45), tone=sh, base=0.15)
    P.fill('red', pt.ramp('#d03a2c', 7, shift=0.06, light=0.5), tone=sh, base=0.05)
    P.fill('beak', pt.ramp('#e9a838', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('tail', pt.ramp('#20302d', 7, shift=0.1, light=0.6), tone=sh, base=0.0)
    P.fill(P.region('tail') & (np.mod(Z * 0.5 + Yc * 0.3, 1.0) < 0.18), pt.ramp('#35685a', 5), tone=sh, base=0.0)  # the green sheen
    P.fill('comb', pt.ramp('#a8632e', 6, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region('comb') & (np.sin(X * 3.1 + Z * 2.3) * np.sin(Yc * 2.7 - Z) > 0.35), pt.ramp('#5a2c16', 5), tone=sh, base=0.0)
    P.fill('chick', pt.ramp('#f2cf48', 6, shift=0.05), tone=sh, base=0.15)
    # faces: his, a hard stare under knitted brows with a little blush he would deny; the chick's, asleep
    import face
    fc = face.Face(P, c=(0.0, HC[1] - 7.6, HC[2] + 1.2), axis=(0, -1, 0.1), where=P.region('feather'), seed=601)
    fc.eyes('dot', spread=7.6, size=0.66, dy=0.0)
    fc.brows('angry', spread=8.0, dy=2.0, w=2.5, weight=0.48)
    fc.blush(5.4, -1.8, rx=1.4, ry=0.75)
    cf = face.Face(P, c=(CHH[0], CHH[1] - 1.3, CHH[2] + 0.3), axis=(0, -1, 0.2), where=P.region('chick'), seed=602)
    cf.eyes('sleepy', spread=1.6, size=0.32, dy=0.2)
    P.lines(['collar', 'hanao', 'comb', 'beak', 'red'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('head', 'body'), ('pomp', 'head'), ('chick', 'pomp'), ('arm', 'body'), ('comb', 'arm')],
       cam=((66, -92, 58), (0, 0, 26)), fold=(0, 7, 24, 45), frames=80)
