"""ぬりかべ屋 The Wall: series obakebaito, Haunted House Part-Timers (concepts_B.md).

Front: a nurikabe, a stretch of old plastered earthen wall under a little ridge of roof tiles, cracked and stained,
with two small eyes, a mouth and two stubby feet peeking out at the bottom. It stands where the black flat would be.
Turn it round: two rabbits in happi coats hold it up, one shoving with both paws, one leaning back against it with
her arms folded, looking at you as if you are the one who should not be here.
Gimmick: the rabbits heave; the wall lurches forward at you, twice, and rocks back. A playset stage block.

    tools/blender.sh art/blender/toys/obakebaito/nuri.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
import kit  # noqa: E402
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'tsuppari'))
import _ob as ob  # noqa: E402
import _gl as gl  # noqa: E402

F = bk.start('obakebaito', 'nuri')
SZ = ob.SZ
st = ob.stage(F, flat=False)

# ------------------------------------------------------------------ the wall: plaster over earth, a tiled ridge, stubby feet
WY, WT, WWD, WHT = 0.4, 4.6, 25.0, 18.6
w_lo, w_hi = [], []
wh = tk.rbox('wall_hi', (WWD, WT, WHT), centre=(0, WY, SZ + 1.2 + WHT / 2), bevel=0.9, segs=3)
tk.subsurf(wh, 1)


def plaster(V, N):
    d = 0.12 * np.sin(V[:, 0] * 1.7 + V[:, 2] * 0.9) * np.sin(V[:, 2] * 1.3 - V[:, 0] * 0.4)       # a hand-trowelled surface
    # cracks: a few jagged lines
    for (x0, z0, ang, L) in ((-6.0, SZ + 15.0, -60, 7.0), (7.4, SZ + 6.0, 70, 6.0), (2.0, SZ + 17.5, -100, 4.0)):
        a = math.radians(ang)
        u = (V[:, 0] - x0) * math.cos(a) + (V[:, 2] - z0) * math.sin(a)
        v = -(V[:, 0] - x0) * math.sin(a) + (V[:, 2] - z0) * math.cos(a)
        d -= 0.35 * (np.abs(v - 0.5 * np.sin(u * 2.3)) < 0.18) * (u > 0) * (u < L)
    # a patch where the plaster fell off, showing the earth and straw beneath
    d -= 0.45 * (np.hypot(V[:, 0] + 8.0, (V[:, 2] - SZ - 5.0) * 1.3) < 2.6)
    return d


tk.push(wh, plaster)
tk.regions(wh, 'plaster', [('earth', lambda C, N: np.hypot(C[:, 0] + 8.0, (C[:, 2] - SZ - 5.0) * 1.3) < 2.4)])
w_hi.append(wh)
w_lo.append(tk.rbox('wall', (WWD, WT, WHT), centre=(0, WY, SZ + 1.2 + WHT / 2), bevel=0.7, segs=1))
TZ = SZ + 1.2 + WHT
rf_hi = tk.lathe('roof_hi', [(0, -WWD / 2 - 1.0), (2.2, -WWD / 2 - 1.0), (3.6, -WWD / 2 - 0.6), (3.6, WWD / 2 + 0.6), (2.2, WWD / 2 + 1.0),
                             (0, WWD / 2 + 1.0)], n=16, axis='X', centre=(0, WY, TZ))
tk.scale(rf_hi, (1.0, 1.0, 0.55), pivot=(0, WY, TZ))
tk.subsurf(rf_hi, 1)
tk.push(rf_hi, lambda V, N: -0.25 * (np.abs(np.mod(V[:, 0] + 0.6, 2.4) - 1.2) > 1.05) - 0.2 * (np.abs(np.mod(np.arctan2(V[:, 2] - TZ, V[:, 1] - WY) * 3.0, 1.0) - 0.5) > 0.42))
tk.set_region(rf_hi, 'tile')
rf_lo = tk.lathe('roof', [(0, -WWD / 2 - 1.0), (3.6, -WWD / 2 - 0.6), (3.6, WWD / 2 + 0.6), (0, WWD / 2 + 1.0)], n=8, axis='X', centre=(0, WY, TZ))
tk.scale(rf_lo, (1.0, 1.0, 0.55), pivot=(0, WY, TZ))
w_lo.append(rf_lo)
w_hi.append(rf_hi)
for sx in (1, -1):
    c = (sx * 6.6, WY - WT / 2 - 0.6, SZ)
    prof = [(0, 0), (2.2, 0.0), (2.5, 1.0), (2.0, 2.0), (0, 2.4)]
    o = tk.lathe('foot_hi', prof, n=12, centre=c)
    tk.scale(o, (1.0, 1.35, 1.0), pivot=c)
    tk.subsurf(o, 1)
    tk.push(o, lambda V, N, c=c: -0.25 * (np.abs(np.cos((V[:, 0] - c[0]) * 2.2)) < 0.25) * (V[:, 1] < c[1] - 1.6))  # toes
    tk.set_region(o, 'plaster')
    w_hi.append(o)
    o = tk.lathe('foot', prof, n=6, centre=c)
    tk.scale(o, (1.0, 1.35, 1.0), pivot=c)
    w_lo.append(o)

# ------------------------------------------------------------------ behind: two rabbits holding it up
BACK = WY + WT / 2
r1 = ob.worker('rabbit', at=(-5.6, BACK + 4.6, SZ), yaw=0, name='r1')          # shoving with both paws
bw, bh = ob.KINDS['rabbit'][:2]
a1_lo, a1_hi = [], []
for k_, sh, sx in (('l', r1['sh_l'], -1), ('r', r1['sh_r'], 1)):
    hand = (-5.6 + sx * 2.4, BACK + 0.9, SZ + bh * 0.95)
    lo, hi, _ = tt.arm('r1arm_' + k_, [sh, tuple((np.array(sh) + np.array(hand)) / 2 + (sx * 0.5, 0, 0.4)), hand], r=1.1, hand=1.2, tris=24,
                       region='happi', hand_region='fur_rabbit')
    a1_lo.append(lo)
    a1_hi += hi
r2 = ob.worker('rabbit', at=(6.2, BACK + 3.4, SZ), yaw=168, name='r2')        # leaning back on it, arms folded, watching you
a2_lo, a2_hi = [], []
tp2 = r2['tp']
for k_, sh, sx in (('l', r2['sh_l'], -1), ('r', r2['sh_r'], 1)):
    hand = tp2((-sx * 1.4, -bw * 0.62, bh * 0.62))
    lo, hi, _ = tt.arm('r2arm_' + k_, [sh, tp2((sx * bw * 0.55, -bw * 0.45, bh * 0.55)), hand], r=1.1, hand=1.1, tris=24,
                       region='happi', hand_region='fur_rabbit')
    a2_lo.append(lo)
    a2_hi += hi

# ------------------------------------------------------------------ parts
F.part('stage', tk.join(st['lo'], 'stage'), st['hi'])
F.part('wall', tk.join(w_lo, 'wall'), w_hi, bone='wall')
F.part('rab1', tk.join(r1['lo'] + a1_lo, 'rab1'), r1['hi'] + a1_hi, bone='rab1')
F.part('rab2', tk.join(r2['lo'] + a2_lo, 'rab2'), r2['hi'] + a2_hi, bone='rab2')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('wall', (0, WY - WT / 2, SZ), parent='root')
    R.bone('rab1', (-5.6, BACK + 4.6, SZ), parent='root')
    R.bone('rab2', (6.2, BACK + 3.4, SZ), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'wall', 'rab1', 'rab2']
        for b in bones:
            k(b, 0)
        # two heaves: the wall lurches forward at you and rocks back; the shover follows it, the leaner nearly falls over
        for f0, deg in ((4, 11.0), (24, 14.0)):
            k('rab1', f0 + 1)
            k('rab1', f0 + 6, move=(0, -0.4, 0), rot=('X', 6))
            k('wall', f0 + 1)
            k('wall', f0 + 6, rot=('X', deg), ease='BACK')
            k('wall', f0 + 12)
            k('rab1', f0 + 9)
            k('rab2', f0 + 2)
            k('rab2', f0 + 7, rot=('X', -9), ease='BACK')
            k('rab2', f0 + 13, ease='BOUNCE')
        for b in bones:
            k(b, 52)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ob.paint_stage(P, pt, sh)
    # old plaster: warm off-white, rain stains running down from the tiles, the cracks inked
    P.fill('plaster', pt.ramp('#e2dccd', 6, shift=0.04), tone=sh, base=0.12)
    pl = P.region('plaster')
    stain = (np.sin(X * 2.3) * 0.5 + 0.5) * np.clip((Z - (TZ - 7.0)) / 7.0, 0, 1)
    P.fill(pl & (stain > 0.45), pt.ramp('#b8ae98', 5, shift=0.04), tone=sh, base=0.05)
    P.fill(pl & (P.cav < 0.42), pt.ramp('#5a4e40', 4), tone=sh)
    P.fill('earth', pt.ramp('#8a6a44', 5, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('earth') & (np.abs(np.sin(X * 4.0 + Z * 2.0)) < 0.2), pt.ramp('#d8b862', 4), tone=sh)    # straw in the clay
    P.fill('tile', pt.ramp('#5a5e66', 6, shift=0.06, light=0.55), tone=sh * 1.2, base=0.0)
    ob.paint_worker(P, pt, sh, 'rabbit', '#f2eee6', gl, bk, crest_at=r1['tp']((0.0, 3.4, 5.2)), crest_axis=(0, 1, 0))
    P.fill(P.region('fur_rabbit') & (Z > SZ + bh + 2.8) & (P.cav > 0.5), pt.ramp('#eaa6a4', 4), tone=sh, base=0.1)  # pink ear linings
    import face
    # the wall's face: two small eyes high up, a little worried mouth, low on the wall like a mascot's
    wf = face.Face(P, c=(0.0, WY - WT / 2 - 0.2, SZ + 10.0), axis=(0, -1, 0.0), where=pl, seed=741)
    wf.eyes('dot', spread=8.4, size=0.9, dy=1.4)
    wf.mouth('wobble', w=3.4, dy=-2.0, weight=0.5)
    # the leaning rabbit's face, deadpan
    fdir = np.array((math.sin(math.radians(168)), -math.cos(math.radians(168)), 0.0))
    hc = np.array(r2['head'])
    rf = face.Face(P, c=tuple(hc + fdir * 3.0), axis=tuple(fdir + (0, 0, 0.1)), where=P.region('fur_rabbit'), seed=742)
    rf.eyes('sleepy', spread=2.4, size=0.34, dy=0.4)
    rf.nose('tri', dy=-0.5, size=0.3, col='#d98a8a')
    rf.snout_mouth('rabbit', dy=-0.9, w=0.8, weight=0.22)
    P.lines(['tile'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('wall', 'stage'), ('rab1', 'stage'), ('rab2', 'stage')],
       cam=((62, -90, 56), (0, 0, 14)), fold=(0, 9, 16, 30), frames=52)
