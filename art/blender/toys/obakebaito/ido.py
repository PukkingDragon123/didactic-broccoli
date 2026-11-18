"""井戸おばけ Well Ghost: series obakebaito, Haunted House Part-Timers (concepts_B.md).

Front: an old stone well with a wooden frame and a pulley, and in it, up to her shoulders, a white-robed ghost with
long black hair hanging over her face, one eye peeping through, hands hanging limp in front. Turn it round: a mole in
a happi coat behind the black flat, turning the crank of the winch whose rope runs over the flat to the well's pulley.
Gimmick: the mole cranks; the ghost rises out of the well, sways, and sinks back. A playset stage block.

    tools/blender.sh art/blender/toys/obakebaito/ido.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('obakebaito', 'ido')
SZ, FY, FH = ob.SZ, ob.FY, ob.FH
st = ob.stage(F)

# ------------------------------------------------------------------ the well: a ring of dressed stones, a wooden frame, a pulley
WC = (-1.0, -5.0)
RO, RI, WH = 7.6, 5.6, 8.4
w_hi = tk.lathe('well_hi', [(RI, SZ), (RO, SZ), (RO, SZ + WH), (RO - 0.4, SZ + WH + 0.5), (RI + 0.4, SZ + WH + 0.5), (RI, SZ + WH), (RI, SZ + 1.0)],
                n=32, centre=(WC[0], WC[1], 0))
tk.subsurf(w_hi, 1)


def stones(V, N):
    a = np.arctan2(V[:, 1] - WC[1], V[:, 0] - WC[0])
    row = np.floor((V[:, 2] - SZ) / 2.1)
    u = np.mod(a * 9 / math.pi + row * 0.5, 1.0)
    v = np.mod((V[:, 2] - SZ) / 2.1, 1.0)
    return -0.35 * ((u < 0.06) | (u > 0.94) | (v < 0.08)) * (np.hypot(V[:, 0] - WC[0], V[:, 1] - WC[1]) > RO - 0.3)


tk.push(w_hi, stones)
tk.set_region(w_hi, 'stone')
w_lo = tk.lathe('well', [(RI, SZ), (RO, SZ), (RO, SZ + WH + 0.3), (RI, SZ + WH + 0.3), (RI, SZ + 1.0)], n=14, centre=(WC[0], WC[1], 0))
st['lo'].append(w_lo)
st['hi'].append(w_hi)
water = tk.cyl('water_hi', RI, SZ + 0.9, SZ + 1.2, n=20, at=WC, bevel=0, segs=0)
tk.set_region(water, 'water')
st['hi'].append(water)
st['lo'].append(tk.cyl('water', RI, SZ + 0.9, SZ + 1.2, n=8, at=WC, bevel=0, segs=0))
TOP = SZ + 21.0
for sx in (1, -1):
    x = WC[0] + sx * (RO + 0.4)
    o = tk.rbox('post_hi', (1.6, 1.6, TOP - SZ), centre=(x, WC[1], (SZ + TOP) / 2), bevel=0.3, segs=1)
    tk.set_region(o, 'wood')
    st['hi'].append(o)
    st['lo'].append(tk.rbox('post', (1.6, 1.6, TOP - SZ), centre=(x, WC[1], (SZ + TOP) / 2), bevel=0, segs=0))
o = tk.rbox('beam_hi', (2 * RO + 4.4, 1.8, 1.6), centre=(WC[0], WC[1], TOP), bevel=0.3, segs=1)
tk.set_region(o, 'wood')
st['hi'].append(o)
st['lo'].append(tk.rbox('beam', (2 * RO + 4.4, 1.8, 1.6), centre=(WC[0], WC[1], TOP), bevel=0, segs=0))
WP = (WC[0], WC[1], TOP - 2.2)
pl_hi = tk.lathe('wpul_hi', [(0, -0.7), (1.5, -0.6), (1.0, 0.0), (1.5, 0.6), (0, 0.7)], n=12, axis='X', centre=WP)
tk.set_region(pl_hi, 'peg')
st['hi'].append(pl_hi)
st['lo'].append(tk.lathe('wpul', [(0, -0.7), (1.5, -0.6), (1.0, 0.0), (1.5, 0.6), (0, 0.7)], n=6, axis='X', centre=WP))

# ------------------------------------------------------------------ the ghost: white robe, long black hair, limp hands
GZ = SZ + 4.0      # her waist, down in the well
ROBE = [(GZ, WC[1], 7.4, 3.4, 3.4, 2.0), (GZ + 5.0, WC[1], 8.0, 3.8, 3.6, 2.0), (GZ + 9.0, WC[1] + 0.2, 7.6, 3.6, 3.4, 2.1),
        (GZ + 11.0, WC[1] + 0.2, 4.6, 2.4, 2.4, 2.0)]
g_lo, g_hi = [], []
r_lo, r_hi = ak.stack('robe', [(z, cy, w, ht, hb, e) for z, cy, w, ht, hb, e in ROBE], n=12, tris=70, region='robe', cap0='round', cap1='round')
for o in [r_lo] + r_hi:
    tk.move(o, (WC[0], 0, 0))
tk.push(r_hi[0], lambda V, N: -0.3 * np.exp(-((V[:, 0] - WC[0] - 0.5 + (V[:, 2] - GZ - 10) * 0.35) / 0.25) ** 2) * (V[:, 1] < WC[1] - 1.0))  # the collar's crossover
g_lo.append(r_lo)
g_hi += r_hi
GH = np.array((WC[0], WC[1] - 0.3, GZ + 14.2))
hp = [(0, -3.0), (2.2, -2.5), (3.0, -0.4), (2.7, 1.6), (1.6, 2.8), (0, 3.1)]
hh = tk.lathe('ghead_hi', hp, n=16, centre=tuple(GH))
tk.subsurf(hh, 1)
tk.set_region(hh, 'skin')
g_hi.append(hh)
g_lo.append(tk.lathe('ghead', hp, n=8, centre=tuple(GH)))
# the hair: a heavy black mass over the crown and back, down to her waist, two curtains down the front, parted
HAIR = [(GH[2] + 3.4, GH[1] + 0.4, 6.6, 3.2, 3.6, 2.0), (GH[2] + 0.5, GH[1] + 0.6, 7.6, 3.6, 4.0, 2.0), (GH[2] - 3.0, GH[1] + 1.0, 8.4, 3.0, 4.4, 2.0),
        (GH[2] - 8.0, GH[1] + 1.4, 8.6, 2.6, 4.4, 2.0), (GH[2] - 11.0, GH[1] + 1.6, 7.8, 2.2, 4.0, 2.0)]


def sc_hair(h):
    def f(V, N):
        d = 0.25 * np.cos((V[:, 0] - WC[0]) * 3.2 + np.sin(V[:, 2] * 0.6)) ** 6       # long strands
        # the parting: the hair is open in front of the face, a narrow gap she peers through
        front = (V[:, 1] < GH[1] - 1.0) & (V[:, 2] < GH[2] + 1.6) & (V[:, 2] > GH[2] - 3.4) & (np.abs(V[:, 0] - WC[0] + 0.8) < 1.3)
        return d - 2.0 * front
    tk.push(h, f)


hr_lo, hr_hi = ak.stack('hair', [(z, cy, w, ht, hb, e) for z, cy, w, ht, hb, e in HAIR[::-1]], n=14, tris=110, sculpt=sc_hair, region='hair',
                        cap0='round', cap1='round')
for o in [hr_lo] + hr_hi:
    tk.move(o, (WC[0], 0, 0))
g_lo.append(hr_lo)
g_hi += hr_hi
hb_hi = tk.slab('hband_hi', [(-1.4, 0.0), (1.4, 0.0), (0.0, 1.8)], 0.4, plane='XZ', at=GH[1] - 3.2, bevel=0.1, segs=1)
hb_lo = tk.slab('hband', [(-1.4, 0.0), (1.4, 0.0), (0.0, 1.8)], 0.4, plane='XZ', at=GH[1] - 3.2, bevel=0, segs=0)
for o in (hb_hi, hb_lo):
    tk.move(o, (WC[0] + 0.6, 0, GH[2] + 1.6))
tk.set_region(hb_hi, 'robe')
g_lo.append(hb_lo)
g_hi.append(hb_hi)
for sx in (1, -1):
    sh = (WC[0] + sx * 3.4, WC[1] - 0.4, GZ + 9.6)
    a_lo, a_hi, _ = tt.arm('garm', [sh, (WC[0] + sx * 3.0, WC[1] - 4.0, GZ + 9.4), (WC[0] + sx * 1.6, WC[1] - 5.6, GZ + 8.2)], r=1.6, hand=1.2,
                           tris=30, region='robe', hand_region='skin', mitt=(0, -0.4, -0.9))
    g_lo.append(a_lo)
    g_hi += a_hi
rp_lo, rp_hi = ak.spine('grope', [tuple(GH + (0, 0.6, 3.2)), (WP[0], WP[1], WP[2] - 1.0)], 0.5, 0.25, n=4, up=(1, 0, 0), tris=8, region='string',
                        cap0='round', cap1='round')
g_lo.append(rp_lo)
g_hi += rp_hi

# ------------------------------------------------------------------ behind the flat: the winch and the mole working it
WN = (7.6, 9.0, SZ + 6.0)
for sx in (1, -1):
    o = tk.rbox('wsup_hi', (1.0, 3.0, 6.6), centre=(WN[0] + sx * 3.2, WN[1], SZ + 3.3), bevel=0.25, segs=1)
    tk.set_region(o, 'ply')
    st['hi'].append(o)
    st['lo'].append(tk.rbox('wsup', (1.0, 3.0, 6.6), centre=(WN[0] + sx * 3.2, WN[1], SZ + 3.3), bevel=0, segs=0))
dr_hi = tk.lathe('drum_hi', [(0, -2.6), (1.9, -2.6), (1.5, -2.2), (1.5, 2.2), (1.9, 2.6), (0, 2.6)], n=14, axis='X', centre=WN)
tk.subsurf(dr_hi, 1)
tk.set_region(dr_hi, 'wood')
dr_lo = tk.lathe('drum', [(0, -2.6), (1.9, -2.6), (1.9, 2.6), (0, 2.6)], n=7, axis='X', centre=WN)
CH_ = (WN[0] - 3.9, WN[1], WN[2])
ck_lo, ck_hi = ak.spine('crankarm', [CH_, (CH_[0], CH_[1], CH_[2] + 3.4)], 1.0, 0.4, n=4, up=(1, 0, 0), tris=8, region='peg', cap0='round', cap1='round')
kn_lo, kn_hi = ak.spine('knob', [(CH_[0], CH_[1], CH_[2] + 3.4), (CH_[0] - 2.0, CH_[1], CH_[2] + 3.4)], 1.0, 0.5, n=6, up=(0, 0, 1), tris=10,
                        region='wood', cap0='round', cap1='round')
crank_lo = [dr_lo, ck_lo, kn_lo]
crank_hi = [dr_hi] + ck_hi + kn_hi
FP = (4.0, FY + 0.2, SZ + FH + 1.2)
fp_hi = tk.lathe('fpul_hi', [(0, -0.6), (1.2, -0.5), (0.8, 0.0), (1.2, 0.5), (0, 0.6)], n=12, axis='X', centre=FP)
tk.set_region(fp_hi, 'peg')
st['hi'].append(fp_hi)
st['lo'].append(tk.lathe('fpul', [(0, -0.6), (1.2, -0.5), (0.8, 0.0), (1.2, 0.5), (0, 0.6)], n=6, axis='X', centre=FP))
for nm_, pts in (('rope1', [(WN[0], WN[1] - 1.2, WN[2] + 1.6), FP]), ('rope2', [FP, (WP[0] + 0.4, WP[1] + 1.2, WP[2] + 0.4)])):
    lo, hi = ak.spine(nm_, [pts[0], tuple((np.array(pts[0]) + np.array(pts[1])) / 2 + (0, 0, 0.4)), pts[1]], 0.5, 0.25, n=4, up=(1, 0, 0),
                      tris=8, region='string', cap0='round', cap1='round')
    st['lo'].append(lo)
    st['hi'] += hi
w = ob.worker('mole', at=(CH_[0] - 6.6, WN[1] + 0.6, SZ), yaw=110, name='m')
bw, bh = ob.KINDS['mole'][:2]
KN = (CH_[0] - 1.4, CH_[1], CH_[2] + 3.4)
ma_lo, ma_hi, _ = tt.arm('marm', [w['sh_r'], tuple((np.array(w['sh_r']) + np.array(KN)) / 2 + (0, 0, -1.2)), KN], r=1.3, hand=1.6, tris=30,
                         region='happi', hand_region='paw')
ml_lo, ml_hi, _ = tt.arm('marml', [w['sh_l'], w['tp']((-bw * 0.7, 0.4, bh * 0.55)), w['tp']((-bw * 0.56, 1.2, bh * 0.36))], r=1.3,
                         hand=1.6, tris=30, region='happi', hand_region='paw')

# ------------------------------------------------------------------ parts
F.part('stage', tk.join(st['lo'], 'stage'), st['hi'])
F.part('ghost', tk.join(g_lo, 'ghost'), g_hi, bone='ghost')
F.part('crank', tk.join(crank_lo, 'crank'), crank_hi, bone='crank')
F.part('mole', tk.join(w['lo'] + [ml_lo], 'mole'), w['hi'] + ml_hi, bone='mole')
F.part('marm', ma_lo, ma_hi, bone='marm')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('ghost', (WC[0], WC[1], SZ + 1.0), parent='root')
    R.bone('crank', WN, parent='root')
    R.bone('mole', (CH_[0] - 6.6, WN[1] + 0.6, SZ), parent='root')
    R.bone('marm', w['sh_r'], parent='mole')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'ghost', 'crank', 'mole', 'marm']
        for b in bones:
            k(b, 0)
        # 0-24 the mole cranks (two turns) and the ghost rises out of the well; 24-50 she sways; 50-66 sinks back
        for i in range(9):
            k('crank', 2 + i * 3, rot=('X', -90.0 * i), ease='LINEAR')
            k('marm', 2 + i * 3, rot=('X', 22 * math.sin(i * math.pi / 2)), ease='LINEAR')
        k('marm', 30)
        k('ghost', 2)
        k('ghost', 24, move=(0, 0, 9.0))
        for i, f in enumerate((30, 36, 42, 48)):
            k('ghost', f, move=(0, 0, 9.0), rot=[('Y', 9 if i % 2 == 0 else -9), ('X', 4)])
        k('ghost', 52, move=(0, 0, 9.0))
        k('mole', 26)
        k('mole', 34, rot=('Z', -30))          # he looks round at you, unimpressed
        k('mole', 48, rot=('Z', -30))
        k('mole', 56)
        for i in range(5):
            k('crank', 50 + i * 3, rot=('X', -720 + 90.0 * i), ease='LINEAR')
        k('ghost', 64, ease='BOUNCE')
        for b in bones:
            k(b, 70, rot=('X', -360) if b == 'crank' else None)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ob.paint_stage(P, pt, sh, gl, bk)
    P.fill('stone', pt.ramp('#8e8a80', 6, shift=0.05), tone=sh + 0.1 * (np.sin(X * 3.1) * np.sin(Z * 2.7 + Yc) > 0.5), base=0.0)
    P.fill(P.region('stone') & (P.cav > 0.56), pt.ramp('#4e5a3a', 4), tone=sh, base=0.0)       # moss in the joints
    P.fill('water', pt.ramp('#1a2026', 4), tone=sh, base=0.0)
    P.fill('wood', pt.ramp('#7a5a3a', 6, shift=0.06), tone=sh + 0.15 * (np.sin(Z * 5.0 + X) > 0.7), base=0.0)
    P.fill('string', pt.ramp('#cbb98a', 4), tone=sh, base=0.05)
    P.fill('robe', pt.ramp('#efece6', 6, shift=0.04), tone=sh, base=0.2)
    P.fill('skin', pt.ramp('#dfe2dc', 5, shift=0.03), tone=sh, base=0.2)        # a deathly pale face and hands
    P.fill('hair', pt.ramp('#1a1618', 6, shift=0.05, light=0.5), tone=sh * 1.2, base=0.0)
    P.fill('paw', pt.ramp('#e7a7a0', 5, shift=0.05), tone=sh, base=0.1)
    ob.paint_worker(P, pt, sh, 'mole', '#4a4448', gl, bk, crest_at=w['tp']((0.0, 3.9, 5.2)),
                    crest_axis=(math.sin(math.radians(110)) * -1, -math.cos(math.radians(110)) * -1, 0.0))
    import face
    # her one eye through the parted hair, and a thin grey line of a mouth
    gf = face.Face(P, c=(WC[0] - 0.8, GH[1] - 3.0, GH[2] + 0.2), axis=(0, -1, 0.0), where=P.region('skin'), seed=711)
    gf.eyes('dot', spread=0.01, size=0.5, dy=0.0, only=0)
    gf.mouth('line', w=0.9, dy=-2.0, weight=0.22)
    fdir = np.array((math.sin(math.radians(110)), -math.cos(math.radians(110)), 0.0))
    hc = np.array(w['head'])
    mf = face.Face(P, c=tuple(hc + fdir * 5.6), axis=tuple(fdir + (0, 0, 0.1)), where=P.region('fur_mole'), seed=712)
    mf.nose('button', dy=0.0, size=0.55, col='#e7a7a0')
    mf2 = face.Face(P, c=tuple(hc + fdir * 3.2 + (0, 0, 0.6)), axis=tuple(fdir + (0, 0, 0.1)), where=P.region('fur_mole'), seed=713)
    mf2.eyes('tiny', spread=2.6, size=0.3, dy=0.4)
    mf2.mouth('dash', w=0.8, dy=-1.6, weight=0.22)
    P.lines(['string', 'robe'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('ghost', 'stage'), ('crank', 'stage'), ('mole', 'stage'), ('marm', 'mole'), ('marm', 'crank'), ('marm', 'stage')],
       cam=((62, -90, 56), (0, 0, 16)), fold=(0, 12, 24, 40), frames=70)
