"""スケバンネコ Sukeban Cat: series tsuppari, Tsuppari Zoo (concepts_B.md).

A calico cat in sukeban uniform: a navy pleated skirt down to her shoes (the long skirt is the whole point), a cropped
sailor blouse with the square collar and a red scarf, her flat leather school bag slung over one shoulder, the other
fist on her hip, her tail curling out under the hem, eyes half shut in a glare. Hiding behind her skirt: the class
rabbit, whom nobody else remembered to feed.
Gimmick: she glares round, left, right; the rabbit hops out from behind her skirt and peeks at you, then hides again.

    tools/blender.sh art/blender/toys/tsuppari/neko.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('tsuppari', 'neko')
low, high = [], []

# ------------------------------------------------------------------ the long skirt: a bell of knife pleats to the floor
SKIRT = [(0.0, 0.6, 22.4, 10.4, 10.8, 2.0), (3.0, 0.5, 21.4, 10.0, 10.4, 2.0), (9.0, 0.4, 17.8, 8.4, 8.8, 2.0),
         (15.0, 0.2, 14.4, 6.8, 7.2, 2.0), (20.0, 0.0, 12.2, 5.8, 6.0, 2.0), (21.8, 0.0, 11.8, 5.6, 5.8, 2.0)]


def sc_skirt(h):
    def f(V, N):
        a = np.arctan2(V[:, 0], -V[:, 1] + 0.4)
        saw = np.mod(a * 14 / (2 * math.pi), 1.0)                    # knife pleats all round
        grow = 0.25 + 0.5 * tk.smoothstep(19.0, 3.0, V[:, 2])
        d = grow * (saw - 0.5) * (V[:, 2] > 0.5)
        d -= 0.3 * np.exp(-((V[:, 2] - 1.4) / 0.35) ** 2)            # the hem
        return d
    tk.push(h, f)


sk_lo, sk_hi = ak.stack('skirt', SKIRT, n=28, tris=300, sculpt=sc_skirt, region='skirt', cap0='flat', cap1='round')
low.append(sk_lo)
high += sk_hi
# loafer toes peeking out under the hem
for sx in (1, -1):
    c = (sx * 2.7, -9.8, 0.0)
    prof = [(0, 0), (1.7, 0.0), (1.9, 0.9), (1.4, 1.8), (0, 2.1)]
    o = tk.lathe('shoe_hi', prof, n=14, centre=c)
    tk.scale(o, (1.0, 1.5, 1.0), pivot=c)
    tk.subsurf(o, 1)
    tk.set_region(o, 'shoe')
    high.append(o)
    o = tk.lathe('shoe', prof, n=6, centre=c)
    tk.scale(o, (1.0, 1.5, 1.0), pivot=c)
    low.append(o)

# ------------------------------------------------------------------ the cropped sailor blouse, its square collar, the scarf
BL = [(19.4, 0.0, 14.0, 6.8, 7.0, 2.2), (23.0, -0.2, 13.2, 6.6, 5.9, 2.2), (27.0, -0.4, 14.0, 6.9, 5.4, 2.4),
      (30.0, -0.2, 14.6, 5.8, 5.2, 2.6), (32.0, 0.0, 9.0, 4.0, 4.0, 2.0)]


def sc_blouse(h):
    def f(V, N):
        z = V[:, 2]
        d = 0.25 * np.cos(np.arctan2(V[:, 0], V[:, 1]) * 9) ** 6 * tk.smoothstep(22.0, 19.6, z)  # the hem's gathers
        d -= 0.3 * np.exp(-((z - 19.9) / 0.3) ** 2)
        return d
    tk.push(h, f)


bl_lo, bl_hi = ak.stack('blouse', BL, n=16, tris=200, sculpt=sc_blouse, region='blouse', cap0='flat', cap1='round')
low.append(bl_lo)
high += bl_hi
# the square sailor collar flap down her back (a shell on the back of the blouse: built on the front, turned round)
BACKR = [(z, -cy, w, hb, ht, e) for z, cy, w, ht, hb, e in BL]


class _Flap:
    z = (32.4, 24.6)

    def __call__(s, v):
        half = 5.2 + 1.6 * min(1.0, v * 3)
        return (-half, half)


fl_lo, fl_hi = ak.shell('collar', BACKR, _Flap(), gap=0.25, th=0.6, nu=7, nv=6, tris=44, region='collar', ripple=0.03)
for o in [fl_lo] + fl_hi:
    tk.rotate(o, 180, 'Z')
low.append(fl_lo)
high += fl_hi
# the scarf: a knot at the V of the collar, two tails hanging
KN = (0.0, -6.9, 26.4)
kn_hi = tk.lathe('knot_hi', [(0, -1.2), (1.3, -0.9), (1.5, 0.0), (1.2, 0.9), (0, 1.2)], n=12, centre=KN)
tk.scale(kn_hi, (1.2, 0.7, 1.0), pivot=KN)
tk.subsurf(kn_hi, 1)
kn_lo = tk.lathe('knot', [(0, -1.2), (1.3, -0.9), (1.5, 0.0), (1.2, 0.9), (0, 1.2)], n=6, centre=KN)
tk.scale(kn_lo, (1.2, 0.7, 1.0), pivot=KN)
tk.set_region(kn_hi, 'scarf')
low.append(kn_lo)
high.append(kn_hi)
for sx in (1, -1):
    pts = [(sx * 0.4, -7.1, 25.6), (sx * 1.2, -7.2, 23.8), (sx * 1.6, -7.0, 21.8)]
    lo, hi = ak.spine('tail_' + str(sx), pts, [1.8, 2.2, 2.4], 0.3, n=6, up=(0, -1, 0), tris=16, region='scarf', cap0='round', cap1='flat')
    low.append(lo)
    high += hi

# ------------------------------------------------------------------ arms: a fist on her hip; the bag slung over a shoulder
la_lo, la_hi, _ = tt.arm('arm_l', [(-6.8, 0.0, 29.2), (-10.8, 1.2, 24.6), (-7.4, -0.4, 21.0)], r=2.0, hand=1.9, tris=48,
                         region='blouse', hand_region='fur')
ra_lo, ra_hi, HR = tt.arm('arm_r', [(6.8, 0.0, 29.2), (9.6, -2.6, 25.2), (8.2, -2.4, 31.6)], r=2.0, hand=1.9, tris=48,
                          region='blouse', hand_region='fur')
low += [la_lo, ra_lo]
high += la_hi + ra_hi
# the flat leather school bag, hanging behind her right shoulder on its handle
BAG = (4.2, 6.9, 22.8)
bag_hi = tk.rbox('bag_hi', (10.4, 1.6, 8.0), centre=BAG, bevel=0.5, segs=2)
bag_lo = tk.rbox('bag', (10.4, 1.6, 8.0), centre=BAG, bevel=0.3, segs=1)
for o in (bag_hi, bag_lo):
    tk.rotate(o, -6, 'X', pivot=BAG)
    tk.rotate(o, -10, 'Y', pivot=BAG)
tk.push(bag_hi, lambda V, N: -0.25 * np.exp(-((V[:, 2] - BAG[2] - 1.4) / 0.25) ** 2))  # the flap's edge
tk.set_region(bag_hi, 'bag')
hp_ = [tuple(np.array(HR) + (0, 0, 1.2)), (8.2, 1.0, 34.0), (7.8, 4.8, 32.0), (7.4, 6.8, 26.6)]
hd_hi = tk.tube('handle_hi', hp_, 0.5, n=8)
tk.subsurf(hd_hi, 1)
tk.set_region(hd_hi, 'bag')
low += [bag_lo, tk.tube('handle', hp_, 0.5, n=4, cap0=None, cap1=None)]
high += [bag_hi, hd_hi]

# ------------------------------------------------------------------ the tail out under the hem, curling up behind
tp = [(-1.0, 9.6, 3.0), (-3.4, 12.6, 5.6), (-5.0, 13.0, 10.4), (-4.6, 11.6, 14.6), (-3.0, 10.4, 16.4)]
tl_lo, tl_hi = ak.spine('tail', tp, [2.4, 2.6, 2.6, 2.4, 1.6], 1.2, n=8, up=(0, 0, 1), tris=50, region='fur', cap0='round', cap1='round')
low.append(tl_lo)
high += tl_hi

# ------------------------------------------------------------------ the head: a cat's, cheek ruffs, tall ears
HZ = 38.2
HEAD = [(0, 4.0, HZ), (0, 1.0, HZ + 0.4), (0, -2.6, HZ), (0, -5.2, HZ - 1.6), (0, -6.4, HZ - 2.0)]
head_lo, head_hi = ak.spine('head', HEAD, [9.0, 15.6, 15.2, 7.0, 4.4], [5.0, 7.0, 6.6, 3.2, 2.2], [5.0, 6.6, 6.2, 3.2, 2.2],
                            e=2.2, n=14, up=(0, 0, 1), tris=180, region='fur')


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        # cheek ruffs ending in a zig-zag of fur
        r = np.hypot(V[:, 1] + 2.0, V[:, 2] - HZ + 2.6)
        d += 0.9 * tk.smoothstep(0.0, 1.0, (np.abs(V[:, 0]) - 4.0) / 3.0) * (sx * V[:, 0] > 0) * np.clip(1.0 - r / 4.6, 0, 1) ** 0.6
        d += tk.bump(V, (sx * 2.6, -5.6, HZ + 2.2), 1.8, 0.35)        # brows
    d += tk.bump(V, (0, -6.7, HZ - 1.4), 1.0, 0.35)                     # the nose
    return d


tk.push(head_hi[0], sc_head)
EARS = []
for sx in (1, -1):
    root = (sx * 4.4, 0.4, HZ + 5.0)
    lo, hi, r_, tip = tt.corner('ear', root, -90, L=6.2, W=5.6, a0=86, a1=76, cup=0.9, ripple=0.0, tris=30, thick=1.1,
                                root_r=0.0, root_z=0.0, shape=0.9, power=1.3, region='ear')
    for o in (lo, hi):
        tk.rotate(o, sx * 18, 'Y', pivot=root)
    EARS.append((lo, hi))

# ------------------------------------------------------------------ the class rabbit, sitting behind her skirt
RB = (4.6, 13.4, 0.0)
rb_prof = [(0, 0.0), (2.6, 0.1), (3.4, 1.6), (3.0, 3.4), (1.6, 4.4), (0, 4.6)]
rab_hi = [tk.lathe('rab_hi', rb_prof, n=16, centre=RB)]
rab_lo = [tk.lathe('rab', rb_prof, n=8, centre=RB)]
for o in rab_hi + rab_lo:
    tk.scale(o, (0.85, 1.2, 1.0), pivot=RB)
RH = (RB[0], RB[1] - 2.8, 5.0)
for nm_, n_, lst in (('rhead_hi', 14, rab_hi), ('rhead', 7, rab_lo)):
    lst.append(tk.lathe(nm_, [(0, -2.2), (1.8, -1.7), (2.3, 0.0), (1.8, 1.6), (0, 2.1)], n=n_, centre=RH))
for sx in (1, -1):
    b0 = np.array((RH[0] + sx * 0.9, RH[1] + 0.6, RH[2] + 1.4))
    pts = [tuple(b0), tuple(b0 + (sx * 0.4, 0.8, 2.4)), tuple(b0 + (sx * 0.9, 1.8, 4.6))]
    lo, hi = ak.spine('rear', pts, [1.5, 1.8, 0.6], 0.5, n=6, up=(0, -1, 0), tris=14, region='rabbit', cap0='round', cap1='round')
    rab_lo.append(lo)
    rab_hi += hi
for o in rab_hi[:2]:
    tk.subsurf(o, 1)
for o in rab_hi:
    tk.set_region(o, 'rabbit')

# ------------------------------------------------------------------ parts
F.part('body', tk.join(low, 'body'), high)
F.part('head', tk.join([head_lo] + [e[0] for e in EARS], 'head'), head_hi + [e[1] for e in EARS], bone='head')
F.part('rabbit', tk.join(rab_lo, 'rabbit'), rab_hi, bone='rabbit')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', (0, 0.0, 32.0), parent='root')
    R.bone('rabbit', (0, 0, 0), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'rabbit']
        for b in bones:
            k(b, 0)
        # 0-30 she glares round: left, hold, right, hold
        k('head', 7, rot=[('Z', 34), ('X', 4)], ease='BACK')
        k('head', 16, rot=[('Z', 34), ('X', 4)])
        k('head', 23, rot=[('Z', -34), ('X', 4)], ease='BACK')
        k('head', 32, rot=[('Z', -34), ('X', 4)])
        # 30-62 behind her back the rabbit hops round her skirt and peeks out at you; she turns to it, softens
        k('rabbit', 28)
        k('rabbit', 33, rot=('Z', -20), move=(0, 0, 1.2))
        k('rabbit', 37, rot=('Z', -34))
        k('rabbit', 41, rot=('Z', -50), move=(0, 0, 1.0))
        k('rabbit', 45, rot=('Z', -58))
        k('rabbit', 60, rot=('Z', -58))
        k('head', 40, rot=[('Z', -40), ('X', 10)])
        k('head', 58, rot=[('Z', -40), ('X', 10)])
        # 60-76 it hops back behind her; she looks back at you as if nothing happened
        k('rabbit', 66, rot=('Z', -30), move=(0, 0, 1.0))
        k('rabbit', 72)
        k('head', 70, ease='BACK')
        for b in bones:
            k(b, 80)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    NAVY = pt.ramp('#283050', 7, shift=0.08, light=0.5)
    P.fill('skirt', NAVY, tone=sh, base=0.0)
    P.fill('blouse', pt.ramp('#ece8e0', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('collar', NAVY, tone=sh, base=0.05)
    # the collar's two white stripes, round its edge; the front of the collar painted down to the scarf in a V
    co = P.region('collar')
    P.flat(co & ((np.abs(np.abs(X) - 5.6 - 1.6 * tk.smoothstep(30.0, 28.0, Z)) < 0.25) | (np.abs(Z - 25.6) < 0.22)), '#efebe2')
    bl = P.region('blouse')
    vee = bl & (Yc < -1.0) & (Z > 26.0) & (np.abs(X) < 1.0 + (Z - 26.0) * 0.9) & (np.abs(X) > (Z - 26.0) * 0.55)
    P.fill(vee, NAVY, tone=sh, base=0.05)
    P.fill('scarf', pt.ramp('#c23a32', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('shoe', pt.ramp('#4a2e22', 6, shift=0.06, light=0.6), tone=sh * 1.2, base=0.0)
    P.fill('bag', pt.ramp('#3a2a22', 6, shift=0.06, light=0.55), tone=sh * 1.2, base=0.0)
    P.fill(P.region('bag') & (np.hypot(X - BAG[0] + 2.4, Z - BAG[2] + 1.0) < 1.4) & (P.on[:, :, 1] > 0.5), pt.ramp('#d84a3a', 4), tone=sh, base=0.1)  # a sticker
    # calico: white, with an orange patch and a black patch; orange and black bands down the tail
    P.fill('fur', pt.ramp('#f1ece2', 7, shift=0.05), tone=sh, base=0.15)
    P.fill('ear', pt.ramp('#f1ece2', 7, shift=0.05), tone=sh, base=0.15)
    ORANGE, BLACK = pt.ramp('#d98a3c', 6, shift=0.06), pt.ramp('#2a2526', 6, shift=0.06)
    fur = P.region('fur') | P.region('ear')
    P.fill(fur & (np.hypot((X + 4.0) * 0.9, Z - HZ - 3.4) < 4.6 + 0.6 * np.sin(Yc * 1.3)) & (Z > HZ), ORANGE, tone=sh, base=0.05)
    P.fill(fur & (np.hypot(X - 4.6, Z - HZ - 4.8) < 3.6 + 0.5 * np.sin(Yc * 1.7)) & (Z > HZ + 1.0), BLACK, tone=sh, base=0.0)
    P.fill(P.region('fur') & (Yc > 8.0) & (Z < 18) & (np.mod(Z * 0.35 + Yc * 0.1, 1.0) < 0.32), ORANGE, tone=sh, base=0.05)
    P.fill(P.region('fur') & (Yc > 8.0) & (Z < 18) & (np.mod(Z * 0.35 + Yc * 0.1, 1.0) > 0.7), BLACK, tone=sh, base=0.0)
    P.fill(P.region('ear') & (P.on[:, :, 1] < -0.3) & (P.cav > 0.5), pt.ramp('#e8a2a0', 5), tone=sh, base=0.1)
    P.fill('rabbit', pt.ramp('#f4f0e8', 6, shift=0.04), tone=sh, base=0.2)
    # the faces: a half-lidded glare with one fang; the rabbit, round-eyed
    import face
    fc = face.Face(P, c=(0.0, -6.2, HZ + 0.8), axis=(0, -1, 0.15), where=P.region('fur'), seed=621)
    fc.eyes('sleepy', spread=6.4, size=0.7, dy=0.3, tilt=-10)
    fc.brows('angry', spread=6.8, dy=2.0, w=2.2, weight=0.45)
    sn = face.Face(P, c=(0.0, -6.8, HZ - 1.3), axis=(0, -1, 0.1), where=P.region('fur'), seed=622)
    sn.nose('tri', dy=0.0, size=0.6, col='#d97a7a')
    sn.snout_mouth('cat', dy=-0.6, w=1.6)
    sn.fangs(du=0.5, dy=-1.0, n=1, size=0.4)
    sn.whiskers(dy=-0.5, spread=2.6, n=2, length=2.4)
    rf = face.Face(P, c=(RH[0], RH[1] - 2.2, RH[2] + 0.2), axis=(0, -1, 0.1), where=P.region('rabbit'), seed=623)
    rf.eyes('dot', spread=2.6, size=0.36, dy=0.4)
    rf.nose('tri', dy=-0.3, size=0.3, col='#d98a8a')
    rf.snout_mouth('rabbit', dy=-0.7, w=0.8, weight=0.22)
    P.fill(P.region('rabbit') & (Z > RH[2] + 2.4) & (P.on[:, :, 1] < -0.2) & (P.cav > 0.5), pt.ramp('#eaa6a4', 4), tone=sh, base=0.1)
    P.lines(['scarf', 'collar', 'bag', 'shoe'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('head', 'body'), ('rabbit', 'body')],
       cam=((66, -92, 58), (0, 0, 24)), fold=(0, 7, 23, 45), frames=80)
