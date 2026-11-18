"""元総長ミミズク Old Boss Eagle-Owl: series tsuppari, Tsuppari Zoo (concepts_B.md). The secret.

The gang's founder, long retired: a big barred eagle-owl with his ear tufts swept back, square black sunglasses he
never takes off, his old embroidered coat thrown over his shoulders like a cape, and the yellow sash of a school
crossing guard across his chest. He holds the yellow 横断中 flag lowered, waiting for the children.
Gimmick: his head turns all the way round, checking the road both ways, and the flag goes up: cross now.

    tools/blender.sh art/blender/toys/tsuppari/mimizuku.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402

F = bk.start('tsuppari', 'mimizuku')
low, high = [], []

# ------------------------------------------------------------------ feathered feet and talons, the tail (a tripod)
for sx in (1, -1):
    an = np.array((sx * 3.8, -3.0, 1.4))
    lo, hi = ak.spine('shank', [tuple(an), (sx * 3.6, -1.6, 4.6)], [4.0, 4.6], 2.2, n=8, up=(0, -1, 0), tris=20, region='down',
                      cap0='round', cap1='round')
    tk.push(hi[0], lambda V, N: 0.25 * np.cos(V[:, 2] * 4.0 + V[:, 0] * 2.0) ** 6)  # feathered
    low.append(lo)
    high += hi
    for a in (-24, 4, 32, 180):
        d = np.array((math.sin(math.radians(a)) * sx, -math.cos(math.radians(a)), 0))
        p0 = an + (0, 0, -0.4)
        tip = p0 + d * (3.6 if a != 180 else 2.4) + (0, 0, -0.6)
        lo, hi = ak.spine('toe', [tuple(p0), tuple((p0 + tip) / 2 + (0, 0, 0.2)), tuple(tip)], [1.6, 1.2, 0.9], [0.8, 0.6, 0.45],
                          n=6, up=(0, 0, 1), tris=12, region='down', cap0='round', cap1='round')
        low.append(lo)
        high += hi
        c_ = tip + d * 0.3
        lo, hi = ak.spine('claw', [tuple(c_ - d * 0.4 + (0, 0, 0.3)), tuple(c_ + d * 0.6 + (0, 0, -0.1)), tuple(c_ + d * 0.9 + (0, 0, -0.55))],
                          [0.8, 0.6, 0.15], 0.4, n=5, up=(0, 0, 1), tris=8, region='claw', cap0='round', cap1='point')
        low.append(lo)
        high += hi
TAIL = [(0, 6.6, 6.4), (0, 9.4, 3.0), (0, 10.6, 0.6)]
tl_lo, tl_hi = ak.spine('tail', TAIL, [6.0, 7.2, 6.4], 1.0, n=8, up=(0, 1, 0.3), tris=24, region='wing', cap0='round', cap1='flat')
tk.push(tl_hi[0], lambda V, N: -0.2 * (np.abs(np.sin(V[:, 0] * 1.3)) < 0.15))
low.append(tl_lo)
high += tl_hi

# ------------------------------------------------------------------ the body: a deep barrel of a breast
BODY = [(2.6, 1.2, 11.6, 5.4, 6.2, 2.2), (6.0, 0.6, 16.2, 7.8, 7.6, 2.2), (12.0, 0.2, 18.2, 8.8, 8.0, 2.2),
        (18.0, 0.0, 17.2, 8.2, 7.4, 2.2), (23.0, 0.0, 15.0, 7.0, 6.6, 2.2), (26.4, 0.2, 13.0, 5.8, 5.8, 2.1)]


def sc_body(h):
    def f(V, N):
        front = tk.smoothstep(-0.1, -0.6, N[:, 1])
        # rows of breast feathers, each a little scallop
        row = np.mod(V[:, 2] * 0.85, 1.0)
        sc = np.abs(np.sin(V[:, 0] * 0.9 + np.floor(V[:, 2] * 0.85) * 1.3))
        return 0.3 * front * (row - 0.5) * (0.4 + 0.6 * sc)
    tk.push(h, f)


bd_lo, bd_hi = ak.stack('body', BODY, n=18, tris=280, sculpt=sc_body, region='breast', cap0='round', cap1='round')
low.append(bd_lo)
high += bd_hi
# the folded left wing (the right one holds the flag)
OUTW = [(0.0, 0.0), (5.0, 1.6), (10.0, 1.0), (14.6, -1.8), (17.0, -5.2), (15.0, -6.4), (12.6, -5.6), (11.0, -7.4), (8.6, -6.6),
        (6.6, -8.6), (4.4, -7.2), (2.0, -8.0), (0.6, -5.0)]
wl = {}
for nm_, segs in (('wing_l', 0), ('wing_l_hi', 2)):
    o = tk.slab(nm_, OUTW, 1.6, plane='YZ', bevel=0.4 if segs else 0, segs=1 if segs else 0)
    if segs:
        tk.subsurf(o, 1)
        tk.push(o, lambda V, N: 0.35 * np.mod((V[:, 2] + 0.9 * np.abs(np.sin(V[:, 1] * math.pi / 2.4))) / 2.6, 1.0) * np.sign(V[:, 0] + 1e-6))
    tk.rotate(o, -72, 'X')
    tk.rotate(o, 8, 'Y')
    tk.move(o, (-8.4, -0.6, 23.6))
    tk.deform(o, lambda V: np.c_[V[:, 0] + 0.012 * (V[:, 1] + 1.0) ** 2, V[:, 1], V[:, 2]])
    wl[segs] = o
tk.set_region(wl[2], 'wing')
low.append(wl[0])
high.append(wl[2])

# ------------------------------------------------------------------ the old coat over his shoulders, a cape
class _Cape:
    z = (27.0, 9.0)

    def __call__(s, v):
        half = 8.6 + 2.4 * v
        return (-half, half)


BACKR = [(z, -cy, w + 1.6, hb + 0.6, ht, e) for z, cy, w, ht, hb, e in BODY]
cp_lo, cp_hi = ak.shell('cape', BACKR, _Cape(), gap=0.9, th=0.8, nu=9, nv=7, tris=70, region='cape', ripple=0.12,
                        lift=lambda x, v: 0.6 * v ** 2)
for o in [cp_lo] + cp_hi:
    tk.rotate(o, 180, 'Z')
low.append(cp_lo)
high += cp_hi

# ------------------------------------------------------------------ the crossing guard's sash, left shoulder to right hip
_dg = bpy.context.evaluated_depsgraph_get()

_bvh = BVHTree.FromObject(bd_hi[0], _dg)
NRM = Vector((math.sin(math.radians(38)), 0.0, math.cos(math.radians(38))))
SC = Vector((0, 0.2, 17.6))
e1 = Vector((0, 1, 0)).cross(NRM).normalized()
e2 = NRM.cross(e1).normalized()
sash = []
for a in np.linspace(0, 2 * math.pi, 18, endpoint=False):
    dv = e1 * math.cos(a) + e2 * math.sin(a)
    hit = _bvh.ray_cast(SC + dv * 16.0, -dv)[0]
    sash.append(tuple(hit + dv * 0.75) if hit is not None else tuple(SC + dv * 8.6))

ss_hi = tk.loft('sash_hi', [{'c': p_, 'w': 0.6, 'h': 2.0, 'e': 2.6} for p_ in sash], n=8, up=tuple(NRM), closed=True)
tk.subsurf(ss_hi, 1)
tk.set_region(ss_hi, 'sash')
ss_lo = tk.loft('sash', [{'c': p_, 'w': 0.6, 'h': 2.0, 'e': 2.6} for p_ in sash[::2]], n=4, up=tuple(NRM), closed=True)
low.append(ss_lo)
high.append(ss_hi)

# ------------------------------------------------------------------ the head: a facial disc, ear tufts, a hooked beak, sunglasses
HZ = 33.4
HEAD = [(0, 4.6, HZ), (0, 1.6, HZ + 0.4), (0, -2.2, HZ + 0.2), (0, -4.4, HZ - 0.4)]
hd_lo, hd_hi = ak.spine('head', HEAD, [12.0, 17.4, 17.2, 13.0], [6.0, 7.6, 7.2, 5.2], [6.2, 7.6, 7.2, 5.0], e=2.3, n=14, up=(0, 0, 1),
                        tris=170, region='head')


def sc_head(V, N):
    d = np.zeros(len(V))
    front = tk.smoothstep(-0.3, -0.8, N[:, 1])
    for sx in (1, -1):
        r = np.hypot(V[:, 0] - sx * 3.6, (V[:, 2] - HZ - 0.4) * 1.05)
        d -= 0.7 * np.clip(1.0 - r / 3.8, 0, 1) * front                       # the dished facial disc round each eye
        d += 0.55 * np.exp(-((r - 4.2) / 0.6) ** 2) * front * (V[:, 2] > HZ - 4.0)  # its ruff rim
    d += 0.2 * np.cos(V[:, 2] * 3.2 + V[:, 0]) ** 8 * tk.smoothstep(0.0, 0.6, N[:, 1])  # crown feathers
    return d


tk.push(hd_hi[0], sc_head)
TUFTS = []
for sx in (1, -1):
    root = (sx * 5.6, -0.6, HZ + 5.4)
    lo, hi, r_, tip = tt.corner('tuft', root, -90, L=6.4, W=4.4, a0=70, a1=40, cup=0.4, ripple=0.0, tris=24, thick=1.2,
                                root_r=0.0, root_z=0.0, shape=0.8, power=1.3, region='head')
    for o in [lo, hi]:
        tk.rotate(o, 180, 'Z', pivot=root)        # swept back
        tk.rotate(o, sx * 22, 'Y', pivot=root)
    tk.push(hi, lambda V, N: -0.15 * (np.abs(np.sin(V[:, 2] * 4.0)) < 0.2))
    TUFTS.append((lo, hi))
bk_lo, bk_hi = ak.spine('beak', [(0, -7.0, HZ - 0.4), (0, -9.0, HZ - 1.4), (0, -9.2, HZ - 3.0)], [2.4, 1.6, 0.3], [1.2, 0.8, 0.2],
                        n=6, up=(0, -1, 0.3), tris=18, region='beak', cap0='round', cap1='point')
# square shades: two dark lenses on a heavy frame, arms back over the ear holes
gl_lo, gl_hi = [], []
for sx in (1, -1):
    c = (sx * 3.7, -7.0, HZ + 0.8)
    lens = [(-2.7, -1.9), (2.7, -1.9), (2.9, 1.6), (2.3, 2.1), (-2.3, 2.1), (-2.9, 1.6)]
    for nm_, b_, s_, lst in (('lens_hi', 0.35, 2, gl_hi), ('lens', 0, 0, gl_lo)):
        o = tk.slab(nm_, lens, 0.9, plane='XZ', at=0.0, bevel=b_, segs=s_)
        tk.rotate(o, sx * 14, 'Z')
        tk.move(o, c)
        lst.append(o)
    pts = [(sx * 6.3, -6.2, HZ + 2.0), (sx * 7.6, -3.4, HZ + 1.8), (sx * 8.2, 0.6, HZ + 1.0)]
    lo, hi = ak.spine('temple', pts, 0.6, 0.45, n=5, up=(0, 0, 1), tris=10, region='frame', cap0='round', cap1='round')
    gl_lo.append(lo)
    gl_hi += hi
br_lo, br_hi = ak.spine('bridge', [(-1.2, -7.6, HZ + 2.0), (0, -8.0, HZ + 2.2), (1.2, -7.6, HZ + 2.0)], 0.6, 0.45, n=5, up=(0, 0, 1),
                        tris=10, region='frame', cap0='round', cap1='round')
gl_lo.append(br_lo)
gl_hi += br_hi
for o in gl_hi[:2]:
    tk.set_region(o, 'lens')

# ------------------------------------------------------------------ the right wing: holding the 横断中 flag, lowered
SH = (8.0, -0.4, 22.6)
HAND = np.array((10.4, -5.4, 13.6))
aw_lo, aw_hi = ak.spine('wing_r', [SH, (10.2, -2.2, 18.6), tuple(HAND)], [5.4, 4.6, 3.6], [2.2, 1.9, 1.7], n=10, up=(1, 0, 0), tris=50,
                        region='wing', cap0='round', cap1='round')
tk.push(aw_hi[0], lambda V, N: 0.25 * np.mod((V[:, 2] + V[:, 1] * 0.5) / 2.2, 1.0))
# the wing's primaries curled round the pole like fingers
fg_lo, fg_hi = [], []
PD = np.array((0.12, -0.62, -0.78))
PD /= np.linalg.norm(PD)
for i, off in enumerate((-1.2, 0.0, 1.2)):
    p0 = HAND + PD * off + (0.9, 0, 0)
    pts = [tuple(p0), tuple(p0 + (-0.6, -1.4, 0.2)), tuple(p0 + (-2.2, -1.2, 0.1))]
    lo, hi = ak.spine('prim', pts, [1.6, 1.4, 0.8], 0.5, n=6, up=(0, 0, 1), tris=10, region='wing', cap0='round', cap1='round')
    fg_lo.append(lo)
    fg_hi += hi
POLE = [tuple(HAND - PD * 2.6), tuple(HAND + PD * 8.0), tuple(HAND + PD * 17.0)]
pl_lo, pl_hi = ak.spine('pole', POLE, 0.9, 0.45, n=6, up=(1, 0, 0), tris=16, region='pole', cap0='round', cap1='round')
# the flag: on the pole's far end, spread on the plane of the pole and the x axis
FX = np.cross(PD, (0, 0, 1))
FX /= np.linalg.norm(FX)
f0 = HAND + PD * 8.6
FLAG_C = f0 + PD * 4.2 + FX * 3.4
flag = [(0.0, 0.0), (8.4, 0.0), (8.4, 6.8), (0.0, 6.8)]
fl_hi = tk.slab('flag_hi', flag, 0.4, plane='XY', at=0.0, bevel=0.12, segs=1)
fl_lo = tk.slab('flag', flag, 0.4, plane='XY', at=0.0, bevel=0, segs=0)
M = np.eye(4)
M[:3, 0], M[:3, 1], M[:3, 2], M[:3, 3] = PD, FX, np.cross(PD, FX), f0
from mathutils import Matrix  # noqa: E402
for o in (fl_hi, fl_lo):
    tk.transform(o, Matrix(M.tolist()))
tk.subsurf(fl_hi, 1)
tk.deform(fl_hi, lambda V: V + np.outer(0.3 * np.sin((V - f0) @ PD * 0.8), np.cross(PD, FX)))
tk.set_region(fl_hi, 'flag')

# ------------------------------------------------------------------ parts
F.part('body', tk.join(low, 'body'), high)
F.part('head', tk.join([hd_lo, bk_lo] + [t[0] for t in TUFTS], 'head'), hd_hi + bk_hi + [t[1] for t in TUFTS], bone='head')
F.part('shades', tk.join(gl_lo, 'shades'), gl_hi, bone='head', kind='gloss')
F.part('wing', tk.join([aw_lo] + fg_lo, 'wing'), aw_hi + fg_hi, bone='wing')
F.part('flag', tk.join([pl_lo, fl_lo], 'flag'), pl_hi + [fl_hi], bone='wing')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', (0, 0.4, 26.4), parent='root')
    R.bone('wing', SH, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'wing']
        for b in bones:
            k(b, 0)
        # 4-40 the head goes all the way round (checking the road), in steady ticks
        k('head', 4)
        for i, f in enumerate((12, 19, 26, 33)):
            k('head', f, rot=('Z', 90.0 * (i + 1)), ease='LINEAR' if i < 3 else None)
        k('head', 38, rot=('Z', 360.0))
        # 36-50 up goes the flag: cross now; a little wave; 64-74 lowered again
        k('wing', 34)
        k('wing', 46, rot=('X', -92), ease='BACK')
        k('wing', 52, rot=('X', -86))
        k('wing', 58, rot=('X', -92))
        k('wing', 64, rot=('X', -92))
        k('wing', 76, ease='BOUNCE')
        k('head', 46, rot=[('Z', 360.0), ('X', -6)])
        k('head', 64, rot=[('Z', 360.0), ('X', -6)])
        k('head', 72, rot=('Z', 360.0))
        for b in bones:
            k(b, 84, rot=('Z', 360.0) if b == 'head' else None)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    BUFF, BROWN, DARK = pt.ramp('#d6a86a', 7, shift=0.06), pt.ramp('#8a5e34', 7, shift=0.06), pt.ramp('#3a2a20', 6, shift=0.05)
    P.fill('breast', BUFF, tone=sh, base=0.05)
    # the breast's dark streaks and fine bars
    br = P.region('breast')
    P.fill(br & (np.abs(np.sin(X * 1.1 + np.floor(Z * 0.42) * 2.1)) < 0.12) & (np.mod(Z * 0.42, 1.0) < 0.6), BROWN, tone=sh, base=0.0)
    P.fill('down', BUFF, tone=sh, base=0.15)
    P.fill('claw', pt.ramp('#2a2420', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('wing', BROWN, tone=sh, base=0.0)
    P.fill(P.region('wing') & (np.mod(Z * 0.9 + Yc * 0.4, 1.0) < 0.3), DARK, tone=sh, base=0.0)
    P.fill('head', BROWN, tone=sh, base=0.05)
    hd = P.region('head')
    P.fill(hd & (np.mod(Z * 0.9 + 0.4 * np.sin(X * 1.5), 1.0) < 0.16), DARK, tone=sh, base=0.0)
    face_ = hd & (P.on[:, :, 1] < -0.35) & (Z < HZ + 4.6)
    P.fill(face_, BUFF, tone=sh, base=0.1)                                    # the facial disc
    for sx in (1, -1):
        r = np.hypot(X - sx * 3.6, (Z - HZ - 0.4) * 1.05)
        P.fill(face_ & (np.abs(r - 4.2) < 0.5), DARK, tone=sh, base=0.0)      # its dark rim
    P.fill('beak', pt.ramp('#3a3430', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('lens', pt.ramp('#141317', 5, shift=0.03, light=0.45), tone=sh * 1.4, base=0.0)
    P.fill('frame', pt.ramp('#18171c', 5, shift=0.05), tone=sh, base=0.0)
    # the cape: his old coat, black, a gold-embroidered border
    P.fill('cape', pt.ramp('#211f28', 7, shift=0.08), tone=sh, base=0.0)
    cp = P.region('cape')
    P.fill(cp & ((Z < 10.4) | (np.abs(np.abs(X) - 10.0 - 1.2 * (27 - Z) / 18) < 0.5)), GOLD, tone=sh, base=0.05)
    P.fill(cp & (P.on[:, :, 1] < -0.3), pt.ramp('#8e1f2a', 5), tone=sh, base=0.0)   # the red lining
    # the sash: crossing-guard yellow with a reflective silver stripe
    P.fill('sash', pt.ramp('#e8c63a', 6, shift=0.05), tone=sh, base=0.15)
    ss = P.region('sash')
    P.fill(ss & (np.abs((P.pos - np.array((0, 0.2, 17.6))) @ np.array((math.sin(math.radians(38)), 0, math.cos(math.radians(38))))) < 0.4),
           pt.ramp('#d8dade', 4, light=0.8), tone=sh * 1.4, base=0.1)
    P.fill('pole', pt.ramp('#e9e4d6', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('flag', pt.ramp('#f2cf2a', 6, shift=0.05), tone=sh, base=0.15)
    flm = P.region('flag')
    nf = np.cross(PD, FX)
    for sgn in (1, -1):
        d = bk.Decal(P, tuple(FLAG_C), tuple(sgn * nf), up=tuple(-PD), where=flm, depth=2.0)
        P.fill(gl.text(d, 'oudan', 3, 0.0, 0.0, 2.2), pt.ramp('#1d1a18', 4), tone=sh, base=0.05)
    # the face: no eyes to see behind the shades; a stern little line under the beak, a feather-stroke brow over each lens
    import face
    fc = face.Face(P, c=(0.0, -7.6, HZ - 2.2), axis=(0, -1, 0.05), where=hd, seed=651)
    fc.mouth('line', w=2.2, dy=-1.6, weight=0.4)
    for sx in (1, -1):
        fc.stroke([(sx * 1.4, 5.8), (sx * 3.4, 6.6), (sx * 5.6, 6.2)], weight=0.55)
    P.lines(['sash', 'flag', 'cape', 'lens'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('head', 'body'), ('shades', 'head'), ('wing', 'body'), ('flag', 'wing'), ('shades', 'body')],
       cam=((66, -92, 58), (0, 0, 22)), fold=(0, 12, 26, 50), frames=84)
