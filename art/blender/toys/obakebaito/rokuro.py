"""ろくろ首 Long-Neck Lady: series obakebaito, Haunted House Part-Timers (concepts_B.md).

Front: a lady doll kneeling in front of the black flat in a plum furisode with a gold obi, her gofun-white face under
a glossy black shimada hairdo with a red comb, hands folded in her lap, demure. Turn it round: a weasel in a happi
coat behind the flat, braced against a push rod that runs through the flat into the small of her back.
Gimmick: the weasel shoves the rod; her telescopic neck shoots up, section by section, until her face looks down at
you over the top of the flat; she sways and sinks back. A playset stage block.

    tools/blender.sh art/blender/toys/obakebaito/rokuro.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('obakebaito', 'rokuro')
SZ, FY, FH = ob.SZ, ob.FY, ob.FH
st = ob.stage(F)

# ------------------------------------------------------------------ the lady, kneeling: a furisode, long sleeves, an obi
LX, LY = 0.0, -4.6
KIM = [(SZ, LY + 0.8, 11.0, 6.0, 5.0, 2.2), (SZ + 2.6, LY + 0.6, 10.4, 5.6, 4.6, 2.2), (SZ + 5.0, LY + 0.6, 8.4, 3.6, 3.6, 2.2),
       (SZ + 8.6, LY + 0.4, 8.8, 3.2, 3.2, 2.2), (SZ + 11.4, LY + 0.4, 7.8, 2.8, 2.8, 2.2), (SZ + 12.6, LY + 0.4, 3.6, 1.8, 1.8, 2.0)]


def sc_kim(h):
    def f(V, N):
        z = V[:, 2]
        d = 0.3 * np.exp(-((z - SZ - 5.4) / 0.5) ** 2) + 0.3 * np.exp(-((z - SZ - 8.0) / 0.5) ** 2)   # the obi's edges
        d -= 0.3 * np.exp(-((V[:, 0] - LX + 0.6 - (z - SZ - 12.0) * 0.5) / 0.25) ** 2) * (z > SZ + 8.4) * (V[:, 1] < LY - 1.0)  # the collar
        d += 0.25 * np.cos((V[:, 0] - LX) * 1.4) ** 6 * (z < SZ + 3.5)                               # skirt folds over her knees
        return d
    tk.push(h, f)


k_lo, k_hi = ak.stack('kimono', KIM, n=16, tris=130, sculpt=sc_kim, region='kimono', cap0='flat', cap1='round')
tk.regions(k_hi[0], 'kimono', [('obi', lambda C, N: (C[:, 2] > SZ + 5.2) & (C[:, 2] < SZ + 8.2))])
# the long sleeves falling either side, the hands together in her lap
sl_lo, sl_hi = [], []
for sx in (1, -1):
    pts = [(LX + sx * 3.9, LY + 0.4, SZ + 11.0), (LX + sx * 5.0, LY - 0.4, SZ + 7.2), (LX + sx * 4.8, LY - 1.2, SZ + 3.0)]
    lo, hi = ak.spine('sleeve', pts, [3.0, 3.6, 4.0], [1.6, 2.0, 2.2], n=8, up=(1, 0, 0), tris=30, region='kimono', cap0='round', cap1='round')
    sl_lo.append(lo)
    sl_hi += hi
hd_lo, hd_hi = ak.spine('hands', [(LX - 1.0, LY - 3.6, SZ + 5.0), (LX + 1.0, LY - 3.6, SZ + 5.0)], 2.4, 0.8, n=6, up=(0, 0, 1), tris=12,
                        region='skin', cap0='round', cap1='round')
# the obi's big bow on her back
bw_lo, bw_hi = ak.spine('bow', [(LX - 4.2, LY + 3.8, SZ + 7.2), (LX, LY + 4.2, SZ + 6.8), (LX + 4.2, LY + 3.8, SZ + 7.2)], [3.6, 2.4, 3.6], 0.9,
                        n=6, up=(0, 1, 0), tris=24, region='obi', cap0='round', cap1='round')
body_lo = [k_lo] + sl_lo + [hd_lo, bw_lo]
body_hi = k_hi + sl_hi + hd_hi + bw_hi

# ------------------------------------------------------------------ the telescopic neck: three sleeves, the head on top
NB = SZ + 12.2
SEGS = []
for i, (r, h) in enumerate(((1.25, 4.4), (1.05, 4.4), (0.85, 4.4))):
    c = (LX, LY, NB + 0.2 * i)
    hi = tk.cyl('neck%d_hi' % i, r, c[2], c[2] + h, n=12, at=(LX, LY), bevel=0.15, segs=1)
    tk.push(hi, lambda V, N, z0=c[2] + h: 0.12 * np.exp(-((V[:, 2] - z0 + 0.4) / 0.2) ** 2))  # a lip on each section
    tk.set_region(hi, 'skin')
    lo = tk.cyl('neck%d' % i, r, c[2], c[2] + h, n=6, at=(LX, LY), bevel=0, segs=0)
    SEGS.append((lo, [hi], c))
HZ = NB + 4.8 + 3.2
HC = np.array((LX, LY - 0.3, HZ))
hp = [(0, -3.4), (2.4, -2.9), (3.2, -0.6), (3.0, 1.4), (2.0, 2.8), (0, 3.2)]
fh = tk.lathe('face_hi', hp, n=16, centre=tuple(HC))
for o in (fh,):
    tk.scale(o, (0.95, 0.9, 1.0), pivot=tuple(HC))
tk.subsurf(fh, 1)
tk.set_region(fh, 'skin')
fl = tk.lathe('face', hp, n=8, centre=tuple(HC))
tk.scale(fl, (0.95, 0.9, 1.0), pivot=tuple(HC))
# the shimada: a glossy black crown, side wings, a tall bun on top, a red comb in front of the bun
SH_ = [(HZ - 2.0, LY + 1.4, 7.2, 1.6, 3.6, 2.0), (HZ + 0.6, LY + 0.8, 7.8, 2.6, 3.8, 2.0), (HZ + 2.6, LY + 0.4, 7.0, 3.2, 3.4, 2.0),
       (HZ + 3.6, LY + 0.4, 4.6, 2.4, 2.4, 2.0)]
hr_lo, hr_hi = ak.stack('hair', [(z, cy, w, ht, hb, e) for z, cy, w, ht, hb, e in SH_], n=12, tris=70, region='hair', cap0='round', cap1='round')
for o in [hr_lo] + hr_hi:
    tk.move(o, (LX, 0, 0))
tk.push(hr_hi[0], lambda V, N: 0.15 * np.cos((V[:, 0] - LX) * 3.0) ** 6)
bun_lo, bun_hi = ak.spine('bun', [(LX, LY + 1.6, HZ + 4.0), (LX, LY + 0.6, HZ + 5.6), (LX, LY - 0.4, HZ + 5.4)], [4.6, 5.0, 3.6], [1.6, 1.8, 1.4],
                          n=8, up=(0, -1, 0.5), tris=30, region='hair', cap0='round', cap1='round')
cb_hi = tk.rbox('comb_hi', (4.4, 0.6, 1.2), centre=(LX, LY - 1.6, HZ + 4.3), bevel=0.2, segs=1)
tk.set_region(cb_hi, 'comb')
cb_lo = tk.rbox('comb', (4.4, 0.6, 1.2), centre=(LX, LY - 1.6, HZ + 4.3), bevel=0, segs=0)
head_lo = [fl, hr_lo, bun_lo, cb_lo]
head_hi = [fh] + hr_hi + bun_hi + [cb_hi]

# ------------------------------------------------------------------ behind the flat: a weasel braced against the push rod
RZ = SZ + 6.4
rod_lo, rod_hi = ak.spine('rod', [(LX, LY + 3.6, RZ), (LX, FY, RZ), (LX, 7.4, RZ)], 1.0, 0.5, n=6, up=(0, 0, 1), tris=12, region='ply',
                          cap0='round', cap1='round')
kn_hi = tk.rbox('rknob_hi', (3.0, 1.0, 2.0), centre=(LX, 7.8, RZ), bevel=0.3, segs=1)
tk.set_region(kn_hi, 'ply')
kn_lo = tk.rbox('rknob', (3.0, 1.0, 2.0), centre=(LX, 7.8, RZ), bevel=0, segs=0)
w = ob.worker('weasel', at=(LX + 0.4, 12.2, SZ), yaw=0, name='w')
bw, bh = ob.KINDS['weasel'][:2]
arms_lo, arms_hi = [], []
for k_, sh, sx in (('l', w['sh_l'], -1), ('r', w['sh_r'], 1)):
    hand = (LX + sx * 1.6, 8.6, RZ)
    a_lo, a_hi, _ = tt.arm('warm_' + k_, [sh, tuple((np.array(sh) + np.array(hand)) / 2 + (sx * 0.6, 0, -0.8)), hand], r=1.0, hand=1.1, tris=26,
                           region='happi', hand_region='fur_weasel')
    arms_lo.append(a_lo)
    arms_hi += a_hi
wt_lo, wt_hi = ak.spine('wtail', [w['tp']((0, 2.6, 1.2)), w['tp']((1.2, 5.6, 0.6)), w['tp']((2.6, 8.0, 1.4))], [2.0, 2.2, 1.4], 1.0, n=8,
                        up=(0, 0, 1), tris=20, region='fur_weasel', cap0='round', cap1='round')

# ------------------------------------------------------------------ parts
F.part('stage', tk.join(st['lo'], 'stage'), st['hi'])
F.part('lady', tk.join(body_lo, 'lady'), body_hi)
for i, (lo, hi, c) in enumerate(SEGS):
    F.part('neck%d' % i, lo, hi, bone='neck%d' % i)
F.part('head', tk.join(head_lo, 'head'), head_hi, bone='head', kind='gloss')
F.part('rod', tk.join([rod_lo, kn_lo], 'rod'), rod_hi + [kn_hi], bone='rod')
F.part('weasel', tk.join(w['lo'] + [wt_lo], 'weasel'), w['hi'] + wt_hi, bone='weasel')
F.part('warms', tk.join(arms_lo, 'warms'), arms_hi, bone='warms')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    prev = 'root'
    for i, (lo, hi, c) in enumerate(SEGS):
        R.bone('neck%d' % i, c, parent=prev)
        prev = 'neck%d' % i
    R.bone('head', (LX, LY, HZ - 3.0), parent=prev)
    R.bone('rod', (LX, FY, RZ), parent='root')
    R.bone('weasel', (LX + 0.4, 12.2, SZ), parent='root')
    R.bone('warms', tuple((np.array(w['sh_l']) + np.array(w['sh_r'])) / 2), parent='weasel')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'neck0', 'neck1', 'neck2', 'head', 'rod', 'weasel', 'warms']
        for b in bones:
            k(b, 0)
        # 0-6 the weasel shoves; 4-16 the neck shoots up, each section 4 mm out of the last; 16-44 she sways, looks down
        k('weasel', 2)
        k('weasel', 6, move=(0, -1.4, 0), rot=('X', 10), ease='BACK')
        k('warms', 6, move=(0, -0.4, 0))
        k('rod', 2)
        k('rod', 6, move=(0, -1.4, 0), ease='BACK')
        for i, b in enumerate(('neck0', 'neck1', 'neck2')):
            k(b, 4 + i)
            k(b, 10 + 2 * i, move=(0, 0, 4.0), ease='BACK')
            k(b, 46, move=(0, 0, 4.0))
            k(b, 54 - 2 * i, ease='BOUNCE')
        k('head', 14)
        k('head', 16, move=(0, 0, 1.6))
        for i, f in enumerate((22, 28, 34, 40)):
            k('head', f, move=(0, 0, 1.6), rot=[('X', 16), ('Y', 10 if i % 2 == 0 else -10)])
        k('head', 46, move=(0, 0, 1.6))
        k('head', 52)
        k('weasel', 40, move=(0, -1.4, 0), rot=('X', 10))
        k('rod', 40, move=(0, -1.4, 0))
        k('warms', 40, move=(0, -0.4, 0))
        k('weasel', 50)
        k('rod', 50)
        k('warms', 50)
        for b in bones:
            k(b, 60)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ob.paint_stage(P, pt, sh, gl, bk)
    # a plum furisode scattered with white and gold plum blossom, a gold obi
    P.fill('kimono', pt.ramp('#6a2a4a', 7, shift=0.07), tone=sh, base=0.0)
    km = P.region('kimono')
    for i in range(14):
        a = i * 2.4
        cx, cz = LX + 5.0 * math.sin(a * 1.7), SZ + 1.2 + (i * 0.93) % 11.0
        P.fill(km & (np.hypot(X - cx, Z - cz) < 0.75), pt.ramp('#efe6dc' if i % 3 else '#d6a640', 4), tone=sh, base=0.1)
    P.fill('obi', pt.ramp('#d6a640', 6, shift=0.07), tone=sh, base=0.05)
    P.fill(P.region('obi') & (np.abs(np.mod(X * 1.2 + Z, 2.0) - 1.0) < 0.15), pt.ramp('#b3282c', 4), tone=sh)
    P.fill('skin', pt.ramp('#f4f0ea', 5, shift=0.03), tone=sh, base=0.25)      # gofun white
    P.fill('hair', pt.ramp('#18151a', 6, shift=0.05, light=0.6), tone=sh * 1.3, base=0.0)
    P.fill('comb', pt.ramp('#c2302a', 5, shift=0.05), tone=sh, base=0.05)
    ob.paint_worker(P, pt, sh, 'weasel', '#9a6a3c', gl, bk, crest_at=w['tp']((0.0, 3.0, 6.6)), crest_axis=(0, 1, 0))
    P.fill(P.region('fur_weasel') & (Yc < 12.2 - 2.4) & (Z > SZ + 10.6) & (Z < SZ + 12.6), pt.ramp('#f2e8d8', 4), tone=sh, base=0.15)  # pale throat
    import face
    # her face: narrow closed eyes, tiny red lips (an old doll's); the weasel's, half asleep on the job
    lf = face.Face(P, c=(LX, HC[1] - 2.9, HZ - 0.2), axis=(0, -1, 0.0), where=P.region('skin'), seed=731)
    lf.eyes('sleepy', spread=2.4, size=0.36, dy=0.5, tilt=8)
    lf.fill([(-0.5, -1.5), (0.5, -1.5), (0.3, -1.8), (-0.3, -1.8)], '#c2302a')
    lf.blush(1.8, -0.6, rx=0.7, ry=0.4)
    wf = face.Face(P, c=tuple(np.array(w['head']) + (0, -3.6, 0)), axis=(0, -1, 0.1), where=P.region('fur_weasel'), seed=732)
    wf.eyes('sleepy', spread=2.2, size=0.32, dy=0.4)
    wf.nose('button', dy=-0.6, size=0.35)
    P.lines(['comb', 'obi'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('lady', 'stage'), ('neck0', 'lady'), ('neck1', 'neck0'), ('neck2', 'neck1'), ('head', 'neck2'),
                                 ('neck1', 'lady'), ('neck2', 'lady'), ('head', 'lady'), ('rod', 'stage'), ('rod', 'lady'), ('weasel', 'stage'),
                                 ('warms', 'weasel'), ('warms', 'rod'), ('neck2', 'neck0'), ('head', 'neck1')],
       cam=((62, -90, 56), (0, 0, 16)), fold=(0, 6, 12, 30), frames=60)
