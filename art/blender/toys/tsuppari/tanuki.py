"""暴走タヌキ Bōsōzoku Tanuki: series tsuppari, Tsuppari Zoo (concepts_B.md).

A tanuki in a white tokkōfuku and a hachimaki astride his customised step-through scooter: a three-tier vinyl
backrest, two takeyari exhausts pointing at the sky and a team flag on a long pole, which, if you read it, says
安全運転 (drive safely). Both feet down at the lights. A pharmacy bag with granny's medicine swings off the handlebar.
Gimmick: press: it pops a wheelie, headlamp on, feet up, wheels spinning; pull it back and it zooms off (pull-back).

    tools/blender.sh art/blender/toys/tsuppari/tanuki.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _gl as gl  # noqa: E402

F = bk.start('tsuppari', 'tanuki')
bike_lo, bike_hi = [], []

# ------------------------------------------------------------------ wheels
WR = 5.2
WF, WB = (0, -15.0, WR), (0, 13.0, WR)
tire = [(0, -1.7), (3.4, -1.7), (4.5, -1.5), (5.0, -0.9), (WR, 0.0), (5.0, 0.9), (4.5, 1.5), (3.4, 1.7), (0, 1.7)]
tire_lo = [(0, -1.7), (3.6, -1.7), (4.8, -1.2), (WR, 0.0), (4.8, 1.2), (3.6, 1.7), (0, 1.7)]
WHEELS = {}
for nm, c in (('wf', WF), ('wb', WB)):
    hi = tk.lathe(nm + '_hi', tire, n=24, axis='X', centre=c)
    tk.subsurf(hi, 1)
    tk.push(hi, lambda V, N, c=c: -0.18 * (np.abs(np.sin(np.arctan2(V[:, 2] - c[2], V[:, 1] - c[1]) * 12)) < 0.3) * (np.hypot(V[:, 1] - c[1], V[:, 2] - c[2]) > 4.6))  # tread
    tk.regions(hi, 'tire', [('hub', lambda C, N, c=c: np.hypot(C[:, 1] - c[1], C[:, 2] - c[2]) < 3.3)])
    lo = tk.lathe(nm, tire_lo, n=9, axis='X', centre=c)
    WHEELS[nm] = (lo, [hi], c)

# ------------------------------------------------------------------ the scooter: floorboard, leg shield, fork, rear body
fb_hi = tk.rbox('floor_hi', (8.6, 13.0, 1.6), centre=(0, -3.2, 7.0), bevel=0.4, segs=2)
fb_lo = tk.rbox('floor', (8.6, 13.0, 1.6), centre=(0, -3.2, 7.0), bevel=0, segs=0)
tk.push(fb_hi, lambda V, N: -0.2 * (np.mod(V[:, 1], 1.6) < 0.3) * (N[:, 2] > 0.7) * (np.abs(V[:, 0]) < 3.2))  # rubber mat ribs
tk.set_region(fb_hi, 'mat')
bike_lo.append(fb_lo)
bike_hi.append(fb_hi)
shield = [(-4.4, 6.0), (4.4, 6.0), (5.8, 14.0), (5.6, 19.4), (3.6, 21.6), (-3.6, 21.6), (-5.6, 19.4), (-5.8, 14.0)]
for nm_, b_, s_ in (('shield_hi', 0.5, 2), ('shield', 0, 0)):
    o = tk.slab(nm_, shield, 1.6, plane='XZ', at=-10.4, bevel=b_, segs=s_)
    if s_:
        tk.subsurf(o, 1)
    tk.deform(o, lambda V: np.c_[V[:, 0], V[:, 1] - 0.08 * V[:, 0] ** 2 + 0.18 * (V[:, 2] - 6.0), V[:, 2]])  # curved, raked back
    (bike_hi if s_ else bike_lo).append(o)
tk.set_region(bike_hi[-1], 'paint')
fk_lo, fk_hi = ak.spine('fork', [(0, -12.6, 20.6), (0, -14.0, 13.0), (0, -15.0, WR)], [2.4, 2.2, 2.0], 1.2, n=8, up=(0, -1, 0), tris=24,
                        region='chrome', cap0='round', cap1='round')
fen = [(0, -15.0 + 6.6 * math.cos(a), WR + 6.6 * math.sin(a)) for a in np.linspace(math.radians(20), math.radians(160), 6)]
fe_lo, fe_hi = ak.spine('fender', fen, 4.6, 0.5, n=8, up=(1, 0, 0), tris=30, region='paint', cap0='flat', cap1='flat')
bike_lo += [fk_lo, fe_lo]
bike_hi += fk_hi + fe_hi
# the rear body: the bulging cowl over the engine and back wheel, the seat on top
RB = [(0, 1.8, 10.4), (0, 6.0, 11.4), (0, 11.0, 11.8), (0, 16.0, 11.2), (0, 19.6, 10.0)]
rb_lo, rb_hi = ak.spine('cowl', RB, [8.0, 11.6, 12.4, 11.2, 7.4], [3.6, 4.6, 4.8, 4.4, 3.0], [3.4, 4.2, 4.6, 4.2, 2.8], e=2.2, n=14,
                        up=(0, 0, 1), tris=118, region='paint', cap0='round', cap1='round')
tk.push(rb_hi[0], lambda V, N: -0.3 * np.exp(-((V[:, 2] - 9.6) / 0.25) ** 2) * (np.abs(V[:, 0]) > 4.0)
        - 0.3 * np.exp(-((np.hypot(V[:, 1] - 10.0, V[:, 2] - 11.6) - 3.0) / 0.25) ** 2) * (np.abs(V[:, 0]) > 5.4))  # panel lines, a side vent
st_lo, st_hi = ak.spine('seat', [(0, 3.0, 15.4), (0, 8.0, 16.2), (0, 13.6, 16.0)], [8.4, 9.6, 8.4], [1.6, 1.8, 1.6], [1.4, 1.6, 1.4],
                        e=2.4, n=10, up=(0, 0, 1), tris=40, region='seat', cap0='round', cap1='round')
tk.push(st_hi[0], lambda V, N: -0.2 * (np.mod(V[:, 1], 2.4) < 0.25) * (N[:, 2] > 0.6))  # tuck-and-roll
bike_lo += [rb_lo, st_lo]
bike_hi += rb_hi + st_hi
# the three-tier backrest, stepping up and back, on a chrome frame
for i, (y, z) in enumerate(((15.0, 20.2), (16.8, 26.4), (18.6, 32.6))):
    w = 9.0 - i * 0.8
    bike_hi.append(tk.rbox('rest_hi', (w, 2.6, 5.2), centre=(0, y, z), bevel=1.0, segs=2))
    bike_lo.append(tk.rbox('rest', (w, 2.6, 5.2), centre=(0, y, z), bevel=0, segs=0))
    tk.push(bike_hi[-1], lambda V, N, z=z: -0.2 * (np.abs(V[:, 2] - z) < 0.2))
    tk.set_region(bike_hi[-1], 'seat')
for sx in (1, -1):
    pts = [(sx * 3.4, 14.4, 14.0), (sx * 3.6, 17.0, 24.0), (sx * 3.4, 19.4, 35.4)]
    lo, hi = ak.spine('bar', pts, 0.9, 0.45, n=6, up=(0, -1, 0), tris=16, region='chrome', cap0='round', cap1='round')
    bike_lo.append(lo)
    bike_hi += hi
    # a takeyari exhaust each side, pointing at the sky
    pts = [(sx * 5.0, 14.0, 8.0), (sx * 5.6, 18.2, 10.4), (sx * 6.0, 20.2, 16.4), (sx * 6.0, 20.8, 24.6)]
    lo, hi = ak.spine('pipe', pts, 1.7, 0.85, n=8, up=(1, 0, 0), tris=24, region='chrome', cap0='round', cap1='flat')
    bike_lo.append(lo)
    bike_hi += hi
# the handlebar, grips, and the headlamp (a light-up part)
hb = [(-7.6, -12.0, 22.0), (-3.0, -12.8, 21.4), (3.0, -12.8, 21.4), (7.6, -12.0, 22.0)]
hb_lo, hb_hi = ak.spine('hbar', hb, 1.1, 0.55, n=6, up=(0, -1, 0), tris=24, region='chrome', cap0='round', cap1='round')
bike_lo.append(hb_lo)
bike_hi += hb_hi
for sx in (1, -1):
    lo, hi = ak.spine('grip', [(sx * 5.8, -12.3, 21.8), (sx * 8.2, -11.9, 22.1)], 1.6, 0.8, n=6, up=(0, -1, 0), tris=12, region='grip',
                      cap0='round', cap1='round')
    bike_lo.append(lo)
    bike_hi += hi
LAMP = (0, -13.6, 20.2)
lamp_prof = [(0, -1.4), (2.4, -1.2), (2.6, 0.4), (2.2, 1.2), (0, 1.4)]
lamp_hi = tk.lathe('lamp_hi', lamp_prof, n=16, axis='Y', centre=LAMP)
tk.subsurf(lamp_hi, 1)
lamp_lo = tk.lathe('lamp', lamp_prof, n=8, axis='Y', centre=LAMP)
tk.regions(lamp_hi, 'lampcase', [('lens', lambda C, N: N[:, 1] < -0.6)])
# the flag on its long pole: 安全運転
pole_lo, pole_hi = ak.spine('pole', [(-3.4, 19.6, 12.0), (-3.6, 21.6, 34.0), (-3.8, 23.0, 52.0)], 0.7, 0.35, n=6, up=(0, -1, 0), tris=16,
                            region='chrome', cap0='round', cap1='round')
FLAG = [(-3.8, 0.0), (-3.8, -1.0), (-3.8, -2.0)]
fl = [(0.0, 0.0), (0.0, -14.4), (6.8, -14.0), (6.4, -7.0), (7.0, 0.2)]
flag_hi = tk.slab('flag_hi', fl, 0.5, plane='YZ', at=-3.8, bevel=0.15, segs=1)
flag_lo = tk.slab('flag', fl, 0.5, plane='YZ', at=-3.8, bevel=0, segs=0)
for o in (flag_hi, flag_lo):
    tk.move(o, (0, 23.1, 51.6))
    tk.deform(o, lambda V: np.c_[V[:, 0] + 0.5 * np.sin((V[:, 1] - 23.0) * 0.7), V[:, 1], V[:, 2]])  # a ripple
tk.subsurf(flag_hi, 1)
tk.set_region(flag_hi, 'flag')
bike_lo += [pole_lo, flag_lo]
bike_hi += pole_hi + [flag_hi]

# ------------------------------------------------------------------ the tanuki: a round belly in a white tokkōfuku
BODY = [(14.6, 6.2, 11.4, 5.6, 5.4, 2.2), (18.4, 5.2, 13.6, 7.0, 5.6, 2.2), (22.6, 4.4, 13.2, 6.8, 5.2, 2.2),
        (26.4, 4.0, 12.4, 5.6, 4.8, 2.4), (28.8, 4.0, 8.0, 3.6, 3.6, 2.0)]


def sc_body(h):
    def f(V, N):
        d = -0.25 * np.exp(-((V[:, 0] - 0.8) / 0.3) ** 2) * tk.smoothstep(-0.2, -0.7, N[:, 1])     # the coat's front edge
        d += 0.25 * np.cos(np.arctan2(V[:, 0], V[:, 1] - 5.0) * 6) ** 6 * tk.smoothstep(18.0, 15.0, V[:, 2])  # skirt folds
        return d
    tk.push(h, f)


bd_lo, bd_hi = ak.stack('body', BODY, n=14, tris=130, sculpt=sc_body, region='coat', cap0='round', cap1='round')
skirt_lo, skirt_hi = ak.stack('skirt', [(12.6, 6.4, 15.0, 5.8, 6.8, 2.2), (15.8, 6.0, 13.0, 5.8, 5.8, 2.2)], n=12, tris=40,
                              region='coat', cap0=None, cap1=None)
la_lo, la_hi, _ = tt.arm('arm_l', [(-6.0, 4.2, 26.4), (-8.0, -2.6, 23.6), (-6.8, -11.0, 22.6)], r=2.2, hand=1.9, tris=44, region='coat', hand_region='fur')
ra_lo, ra_hi, _ = tt.arm('arm_r', [(6.0, 4.2, 26.4), (8.0, -2.6, 23.6), (6.8, -11.0, 22.6)], r=2.2, hand=1.9, tris=44, region='coat', hand_region='fur')
# granny's medicine: a paper pharmacy bag hanging off the left grip
MB = (-7.2, -11.6, 17.0)
mb_hi = tk.rbox('med_hi', (1.6, 4.2, 5.0), centre=MB, bevel=0.35, segs=2)
mb_lo = tk.rbox('med', (1.6, 4.2, 5.0), centre=MB, bevel=0, segs=0)
tk.push(mb_hi, lambda V, N: -0.2 * (np.abs(V[:, 2] - MB[2] - 1.8) < 0.15))  # the folded top
tk.set_region(mb_hi, 'med')
hl_lo, hl_hi = ak.spine('medh', [(-7.2, -12.6, 19.4), (-7.0, -12.3, 21.6), (-7.2, -11.0, 19.4)], 0.45, 0.25, n=5, up=(1, 0, 0), tris=10,
                        region='med', cap0='round', cap1='round')
rider_lo = [bd_lo, skirt_lo, la_lo, ra_lo, mb_lo, hl_lo]
rider_hi = bd_hi + skirt_hi + la_hi + ra_hi + [mb_hi] + hl_hi
# both feet down at the lights (they tuck up onto the floorboard when he rides)
LEGS = {}
for sx, nm in ((1, 'leg_r'), (-1, 'leg_l')):
    hip = (sx * 3.6, 5.0, 15.0)
    lo, hi = ak.spine(nm, [hip, (sx * 6.6, 3.4, 8.4), (sx * 8.4, 2.2, 2.4)], [5.2, 4.6, 4.0], 2.3, n=10, up=(0, -1, 0), tris=36,
                      region='pants', cap0='round', cap1='round')
    foot = tk.lathe('boot', [(0, 0), (2.0, 0.0), (2.2, 1.0), (1.8, 2.0), (0, 2.4)], n=6, centre=(sx * 8.6, 1.4, 0.0))
    tk.scale(foot, (1.0, 1.5, 1.0), pivot=(sx * 8.6, 1.4, 0.0))
    fh = tk.copy(foot, 'boot_hi')
    tk.subsurf(fh, 2)
    tk.set_region(fh, 'boot')
    LEGS[nm] = (tk.join([lo, foot], nm), hi + [fh], hip)

# ------------------------------------------------------------------ the head: tanuki mask, small round ears, the hachimaki
HZ = 35.0
HEAD = [(0, 8.2, HZ), (0, 5.4, HZ + 0.4), (0, 2.0, HZ), (0, -0.8, HZ - 1.4), (0, -2.4, HZ - 1.8)]
hd_lo, hd_hi = ak.spine('head', HEAD, [8.6, 15.0, 15.0, 7.4, 4.4], [5.0, 6.8, 6.4, 3.2, 2.2], [5.0, 6.6, 6.2, 3.2, 2.2], e=2.2, n=14,
                        up=(0, 0, 1), tris=150, region='fur')


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        d += tk.bump(V, (sx * 5.8, 2.6, HZ - 2.4), 3.4, 0.9)          # fat cheeks
    d += tk.bump(V, (0, -2.9, HZ - 1.4), 1.2, 0.5)                    # the nose
    return d


tk.push(hd_hi[0], sc_head)
ear_lo, ear_hi = [], []
for sx in (1, -1):
    c = (sx * 5.0, 6.2, HZ + 5.6)
    for nm_, n_, lst in (('ear', 5, ear_lo), ('ear_hi', 14, ear_hi)):
        o = tk.lathe(nm_, [(0, -0.7), (1.8, -0.5), (2.1, 0.0), (1.8, 0.5), (0, 0.7)], n=n_, axis='Y', centre=c)
        tk.rotate(o, sx * -24, 'Y', pivot=c)
        lst.append(o)
    tk.subsurf(ear_hi[-1], 1)
    tk.set_region(ear_hi[-1], 'fur')
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402
import bpy  # noqa: E402
_dg = bpy.context.evaluated_depsgraph_get()
_bvh = BVHTree.FromObject(hd_hi[0], _dg)
BC = Vector((0, 3.8, HZ + 4.4))
band = []
for a in np.linspace(0, 2 * math.pi, 16, endpoint=False):
    dv = Vector((math.cos(a), math.sin(a), 0.12 * math.sin(a)))
    hit = _bvh.ray_cast(BC + dv * 12.0, -dv)[0]
    band.append(tuple(hit + dv * 0.35) if hit is not None else tuple(BC + dv * 6.8))
bd2_hi = tk.loft('band_hi', [{'c': p_, 'w': 1.0, 'h': 1.5, 'e': 2.6} for p_ in band], n=8, closed=True)
tk.subsurf(bd2_hi, 1)
tk.set_region(bd2_hi, 'band')
bd2_lo = tk.loft('band', [{'c': p_, 'w': 1.0, 'h': 1.5, 'e': 2.6} for p_ in band[::2]], n=4, closed=True)
TAILS = []
for sx in (1, -1):
    pts = [(sx * 0.6, band[4][1] - 0.4, HZ + 5.2), (sx * 2.0, band[4][1] + 2.6, HZ + 4.2), (sx * 3.0, band[4][1] + 5.0, HZ + 3.4)]
    lo, hi = ak.spine('btail', pts, [1.8, 1.6, 1.4], 0.3, n=6, up=(0, 0, 1), tris=14, region='band', cap0='round', cap1='flat')
    TAILS.append((lo, hi))

# ------------------------------------------------------------------ parts
F.part('bike', tk.join(bike_lo, 'bike'), bike_hi, bone='bike', kind='gloss')
F.part('lamp', lamp_lo, [lamp_hi], bone='bike', kind='led')
for nm, (lo, hi, c) in WHEELS.items():
    F.part(nm, lo, hi, bone=nm)
F.part('rider', tk.join(rider_lo, 'rider'), rider_hi, bone='rider')
for nm, (lo, hi, hip) in LEGS.items():
    F.part(nm, lo, hi, bone=nm)
F.part('head', tk.join([hd_lo] + ear_lo + [bd2_lo] + [t[0] for t in TAILS], 'head'), hd_hi + ear_hi + [bd2_hi] + [h for t in TAILS for h in t[1]], bone='head')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('bike', (0, WB[1], 0), parent='root')
    R.bone('wf', WF, parent='bike')
    R.bone('wb', WB, parent='bike')
    R.bone('rider', (0, 6.0, 15.0), parent='bike')
    R.bone('head', (0, 4.6, 28.6), parent='rider')
    for nm, (lo, hi, hip) in LEGS.items():
        R.bone(nm, hip, parent='rider')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key

    def spin(b, f0, f1, turns, step=4):
        n = int(round((f1 - f0) / step))
        for i in range(n + 1):
            k(b, f0 + i * step, rot=('X', -360.0 * turns * i / n), ease='LINEAR')
    with R.action('gimmick'):
        bones = ['root', 'bike', 'wf', 'wb', 'rider', 'head', 'leg_r', 'leg_l']
        for b in bones:
            k(b, 0)
        # 0-12 revs (a shiver), feet up; 12-24 up on the back wheel; 24-48 a wobbly wheelie; 48-60 down with a bounce
        k('rider', 4, move=(0, 0, 0.4))
        k('rider', 8)
        for nm, sx in (('leg_r', 1), ('leg_l', -1)):
            k(nm, 6)
            k(nm, 12, rot=[('Y', -sx * 30), ('X', 50)], ease='BACK')
            k(nm, 50, rot=[('Y', -sx * 30), ('X', 50)])
            k(nm, 60)
        spin('wb', 8, 56, 3)
        spin('wf', 8, 56, 2)
        k('bike', 10)
        k('bike', 20, rot=('X', -24), ease='BACK')
        k('bike', 28, rot=('X', -20))
        k('bike', 36, rot=('X', -26))
        k('bike', 44, rot=('X', -21))
        k('bike', 52, ease='BOUNCE')
        k('rider', 18, rot=('X', -4))
        k('head', 12)
        k('head', 20, rot=('X', 8))
        k('head', 44, rot=('X', 8))
        k('head', 52)
        k('rider', 46, rot=('X', -4))
        for b in bones:
            k(b, 64)
    with R.action('run'):
        # the pull-back run: wheels turning, feet tucked up, a little bob (frame 0 = frame 16, looped)
        for f in (0, 16):
            k('bike', f)
            k('head', f)
            k('rider', f)
            for nm, sx in (('leg_r', 1), ('leg_l', -1)):
                k(nm, f, rot=[('Y', -sx * 30), ('X', 50)])
        k('rider', 8, move=(0, 0, 0.35))
        spin('wb', 0, 16, 1)
        spin('wf', 0, 16, 1)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    P.fill('tire', pt.ramp('#2a2a2c', 6, shift=0.05), tone=sh, base=0.0)
    P.fill('hub', pt.ramp('#c9ccd0', 6, shift=0.04, light=0.7), tone=sh * 1.4, base=0.05)
    P.fill('paint', pt.ramp('#6a3f8e', 7, shift=0.08, light=0.6), tone=sh * 1.3, base=0.0)   # candy purple
    P.fill(P.region('paint') & (np.abs(Z - 12.4 + 0.08 * Yc) < 0.5) & (np.abs(X) > 3.0), GOLD, tone=sh, base=0.1)  # a gold pinstripe
    P.fill('mat', pt.ramp('#2c2b2e', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('seat', pt.ramp('#b3242c', 7, shift=0.07, light=0.6), tone=sh * 1.3, base=0.0)    # red vinyl
    P.fill('chrome', pt.ramp('#c7cbd2', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.6, base=0.05)
    P.fill('grip', pt.ramp('#2a2a2c', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('lampcase', pt.ramp('#c7cbd2', 6, shift=0.04, light=0.8), tone=sh * 1.5, base=0.05)
    P.fill('lens', pt.ramp('#f6eab8', 5, shift=0.04), tone=sh * 0.5, base=0.25)
    # the flag: white with red text 安全運転 and a red border
    P.fill('flag', pt.ramp('#f1ece0', 5, shift=0.04), tone=sh, base=0.2)
    fl = P.region('flag')
    for sgn in (-1, 1):
        d = bk.Decal(P, (-3.8, 26.4, 44.6), (sgn, 0, 0), where=fl)
        P.fill(gl.text(d, 'anzen', 4, 0.0, 0.0, 2.9, vertical=True, mirror=False) | (d.m & ((np.abs(d.V) > 6.6) | (np.abs(d.U) > 2.6))),
               pt.ramp('#c2302a', 5), tone=sh, base=0.05)
    P.fill('coat', pt.ramp('#efeae0', 6, shift=0.04), tone=sh, base=0.15)
    # 交通安全 embroidered in gold down the right front of his coat
    cd = bk.Decal(P, (3.2, -2.0, 21.4), (0, -1, 0), where=P.region('coat'))
    P.fill(gl.text(cd, 'koutsuu', 4, 0.0, 0.0, 2.3, vertical=True), GOLD, tone=sh, base=0.1)
    P.fill('pants', pt.ramp('#efeae0', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('boot', pt.ramp('#26252a', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('fur', pt.ramp('#8a6a48', 7, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region('fur') & (Yc < 1.0) & (Z < HZ - 0.4), pt.ramp('#ece2cc', 6, shift=0.05), tone=sh, base=0.15)   # pale muzzle
    P.fill(P.region('fur') & (np.abs(Z - HZ - 6.0) < 1.6) & (Yc > 4.0) & (np.abs(X) > 3.6), pt.ramp('#3a2a20', 5), tone=sh, base=0.0)  # dark ear tips
    P.fill('band', pt.ramp('#f3efe6', 5, shift=0.04), tone=sh, base=0.2)
    P.fill(P.region('band') & (Yc < -1.0) & (np.abs(X) < 1.4), pt.ramp('#c2302a', 4), tone=sh, base=0.1)       # the red sun on his brow
    P.fill('med', pt.ramp('#f4f1ea', 5, shift=0.04), tone=sh, base=0.2)
    md = bk.Decal(P, (MB[0] - 0.8, MB[1], MB[2] - 0.4), (-1, 0, 0), where=P.region('med'))
    P.fill(gl.text(md, 'kusuri', 1, 0.0, 0.0, 2.4, mirror=False), pt.ramp('#2e6ab0', 4), tone=sh, base=0.1)
    # the face: the tanuki mask round the eyes, stern dots under brows; he is doing his best
    import face
    fc = face.Face(P, c=(0.0, -1.6, HZ + 1.0), axis=(0, -1, 0.2), where=P.region('fur'), seed=641)
    for sx in (1, -1):    # the mask: a dark patch round each eye, slanting down onto the cheek, a pale gap over the nose
        fc.patch(sx * 2.9, -0.3, 2.0, 1.25, '#3a2a20', rot=-sx * 28)
    fe = face.Face(P, c=(0.0, -1.6, HZ + 1.0), axis=(0, -1, 0.2), where=P.region('fur'), seed=643, ink='#f1e8d4')
    fe.eyes('dot', spread=5.6, size=0.6, dy=0.4)    # (cream dots on the dark mask)
    fc.brows('angry', spread=6.0, dy=2.4, w=2.0, weight=0.45)
    sn = face.Face(P, c=(0.0, -3.2, HZ - 1.2), axis=(0, -1, 0.1), where=P.region('fur'), seed=642)
    sn.nose('button', dy=0.2, size=0.75)
    sn.snout_mouth('Y', dy=-0.7, w=1.4)
    P.lines(['flag', 'seat', 'band', 'med', 'grip', 'tire'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('wf', 'bike'), ('wb', 'bike'), ('rider', 'bike'), ('head', 'rider'), ('leg_r', 'rider'),
                                 ('leg_l', 'rider'), ('leg_r', 'bike'), ('leg_l', 'bike'), ('lamp', 'bike'), ('head', 'bike')],
       cam=((70, -96, 60), (0, 0, 22)), fold=(0, 12, 24, 40), frames=64,
       extra_meta=None)
