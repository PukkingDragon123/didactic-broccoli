"""文字書きフクロウ Calligrapher Owl: series karakuri, Edo Wind-Up Automata (concepts_B.md).

The Edo writing automaton (moji-kaki ningyō) as a round little owl scholar: a gofun-white facial disc with big ink
eyes, an indigo robe with a gold shippō pattern, a black-lacquer eboshi, kneeling on a small tatami. At its right
stands a gold-edged shikishi board on a lacquered easel with 寿 (kotobuki, long life) on it in fresh ink, its red seal
in the corner; the inkstone and an ink stick lie at its knee, on the black-lacquer base (gear window, whalebone
spring, brass key).
Gimmick (wind-up): the key winds; the old character is gone, the owl dips its brush twice in the inkstone and
writes 寿 again stroke by stroke in the right order (each stroke grows under the brush), lifts the brush, tilts its
head at its work and bows.

    tools/blender.sh art/blender/toys/karakuri/mojikaki.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('karakuri', 'mojikaki')
b = kr.base(F, w=28.0)
SZ = kr.SZ
O = (5.2, 0.6)                   # the owl's seat
CZ = SZ + 0.7                    # the top of its tatami

# ------------------------------------------------------------------ the shikishi board on its easel, facing out to the front-right
YAW, TILT = 45.0, 12.0
B = Vector((-5.4, -1.8, SZ + 8.6))                         # the board's middle
NB = Vector((math.sin(math.radians(YAW)) * math.cos(math.radians(TILT)), -math.cos(math.radians(YAW)) * math.cos(math.radians(TILT)),
             math.sin(math.radians(TILT))))               # out of its face
UB = Vector((math.cos(math.radians(YAW)), math.sin(math.radians(YAW)), 0.0))   # its right
VB = NB.cross(UB)                                          # its up
BW, BH, BT = 8.6, 9.6, 0.6
MB = Matrix((UB, VB, NB)).transposed().to_4x4()
MB.translation = B


def onb(u, v, h=0.0):
    """A point on the board: u right, v up (mm from its middle), h out of its face."""
    return B + UB * u + VB * v + NB * (BT / 2 + h)


bd_hi = tk.rbox('board_hi', (BW, BH, BT), bevel=0.18, segs=2)
tk.regions(bd_hi, 'goldedge', [('washi', lambda C, N: (N[:, 2] > 0.9) & (np.abs(C[:, 0]) < BW / 2 - 0.2) & (np.abs(C[:, 1]) < BH / 2 - 0.2)),
                               ('card', lambda C, N: N[:, 2] < -0.9)])
bd_lo = tk.rbox('board', (BW, BH, BT), bevel=0, segs=0)
for o in (bd_hi, bd_lo):
    tk.transform(o, MB)
# the easel: a ledge under the board, two legs down to the base, a strut behind
foot = onb(0, -BH / 2 - 0.45, -0.3)
st_hi, st_lo = [], []
ledge = tk.rbox('ledge_hi', (BW + 0.8, 1.6, 0.9), bevel=0.25, segs=2)
lg_lo = tk.rbox('ledge', (BW + 0.8, 1.6, 0.9), bevel=0, segs=0)
for o in (ledge, lg_lo):
    tk.transform(o, Matrix.Translation(foot) @ Matrix.Rotation(math.radians(YAW), 4, 'Z'))
st_hi.append(ledge)
st_lo.append(lg_lo)
for su in (-1, 1):
    top = foot + UB * su * (BW / 2 - 0.6) + Vector((0, 0, -0.3))
    pts = [tuple(top), tuple(Vector((top[0], top[1], SZ)) - NB * 0.4)]
    st_hi.append(tk.tube('leg_hi', pts, 0.42, n=8, cap0='round', cap1='flat'))
    st_lo.append(tk.tube('leg', pts, 0.42, n=4, cap0=None, cap1='flat'))
back = onb(0, 1.2, -BT - 0.1)
sp = [tuple(back), tuple(Vector((back[0], back[1], SZ)) - NB * 4.2)]
st_hi.append(tk.tube('strut_hi', sp, 0.4, n=8, cap0='round', cap1='flat'))
st_lo.append(tk.tube('strut', sp, 0.4, n=4, cap0=None, cap1='flat'))
for o in st_hi:
    tk.set_region(o, 'lac')

# ------------------------------------------------------------------ the inkstone and the ink stick, the tatami
INK = Vector((-1.2, -6.8, SZ + 1.15))                      # the ink pool (where the brush dips)
sz_hi = tk.rbox('suzuri_hi', (4.4, 5.0, 1.3), centre=(INK[0], INK[1] + 0.6, SZ + 0.65), bevel=0.35, segs=2)


def sc_suzuri(V, N):
    d = np.zeros(len(V))
    top = N[:, 2] > 0.7
    du, dv = (V[:, 0] - INK[0]) / 1.6, (V[:, 1] - INK[1] - 1.6) / 1.3
    d -= 0.45 * top * (du * du + dv * dv < 1)                               # the grinding face
    d -= 0.4 * top * (((V[:, 0] - INK[0]) / 1.5) ** 2 + ((V[:, 1] - INK[1]) / 0.9) ** 2 < 1)         # the well
    return d


tk.subsurf(sz_hi, 1)
tk.push(sz_hi, sc_suzuri)
tk.regions(sz_hi, 'stone', [('pool', lambda C, N: (N[:, 2] > 0.7) & (((C[:, 0] - INK[0]) / 1.6) ** 2 + ((C[:, 1] - INK[1]) / 1.0) ** 2 < 1))])
sz_lo = tk.rbox('suzuri', (4.4, 5.0, 1.3), centre=(INK[0], INK[1] + 0.6, SZ + 0.65), bevel=0.3, segs=1)
sm_hi = tk.rbox('sumi_hi', (0.9, 3.4, 0.7), centre=(INK[0] + 3.2, INK[1] + 1.0, SZ + 0.35), bevel=0.15, segs=1)
tk.rotate(sm_hi, 18, 'Z', pivot=(INK[0] + 3.2, INK[1] + 1.0, SZ))
tk.set_region(sm_hi, 'sumi')
sm_lo = tk.rbox('sumi', (0.9, 3.4, 0.7), centre=(INK[0] + 3.2, INK[1] + 1.0, SZ + 0.35), bevel=0, segs=0)
tk.rotate(sm_lo, 18, 'Z', pivot=(INK[0] + 3.2, INK[1] + 1.0, SZ))
tt_hi = tk.rbox('tatami_hi', (11.6, 10.4, 0.7), centre=(O[0], O[1] + 1.6, SZ + 0.35), bevel=0.2, segs=2)
tk.push(tt_hi, lambda V, N: -0.05 * (np.mod(V[:, 1] * 3.0, 1.0) < 0.3) * (N[:, 2] > 0.7))
tk.set_region(tt_hi, 'tatami')
tt_lo = tk.rbox('tatami', (11.6, 10.4, 0.7), centre=(O[0], O[1] + 1.6, SZ + 0.35), bevel=0.15, segs=1)
b['hi'] += [sz_hi, sm_hi, tt_hi]
b['lo'] += [sz_lo, sm_lo, tt_lo]

# ------------------------------------------------------------------ the owl: a round robe kneeling, a big round head
ROBE = [(CZ, 0.6, 10.6, 5.0, 4.2, 2.6), (CZ + 2.0, 0.6, 11.4, 5.2, 4.6, 2.4), (CZ + 4.4, 0.8, 11.0, 4.8, 4.5, 2.2),
        (CZ + 6.8, 0.9, 9.6, 4.1, 4.0, 2.1), (CZ + 8.6, 1.0, 7.4, 3.3, 3.2, 2.1), (CZ + 9.6, 1.0, 5.0, 2.4, 2.4, 2.0)]


def sc_robe(h):
    def f(V, N):
        z = V[:, 2]
        a = np.arctan2(V[:, 0], -(V[:, 1] - 0.6))
        d = 0.22 * np.cos(a * 7) ** 2 * tk.smoothstep(CZ + 3.0, CZ + 0.4, z)                                  # the skirt's folds
        d -= 0.3 * np.exp(-((V[:, 0] - 0.3 + (z - CZ - 8.6) * 0.5) / 0.25) ** 2) * (z > CZ + 4.2) * (V[:, 1] < -1.0)   # the collar
        d += 0.25 * np.exp(-((z - CZ - 4.4) / 0.6) ** 2)                                                       # the obi
        return d
    tk.push(h, f)


rb_lo, rb_hi = ak.stack('robe', ROBE, n=18, tris=150, sculpt=sc_robe, region='robe', cap0='flat', cap1='round')
tk.regions(rb_hi[0], 'robe', [('obi', lambda C, N: np.abs(C[:, 2] - CZ - 4.4) < 0.7),
                              ('collar', lambda C, N: (C[:, 1] < -0.8) & (np.abs(C[:, 0] - 0.3 + (C[:, 2] - CZ - 8.6) * 0.5) < 0.55) & (C[:, 2] > CZ + 5.2))])
body_lo, body_hi = [rb_lo], list(rb_hi)
for o in body_lo + body_hi:
    tk.move(o, (O[0], O[1], 0))


def at(v):
    return Vector((v[0] + O[0], v[1] + O[1], v[2]))


# the left wing: a sleeve, its feathered hand resting on the lap, holding back the right sleeve's hem
LS = at((3.9, 1.0, CZ + 8.0))
LH = at((1.2, -4.0, CZ + 4.2))
LE = kr.ik2(LS, LH, 3.6, 3.6, (1.0, 0.2, -0.6))
lo, hi = ak.spine('lsleeve', [tuple(LS), tuple(LS * 0.5 + LE * 0.5), tuple(LE)], [2.8, 3.0, 2.8], 1.3, n=8, up=(0, 0, 1), tris=28,
                  region='robe', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi
lo, hi = ak.spine('lwing', [tuple(LE), tuple(LE * 0.4 + LH * 0.6), tuple(LH)], [2.2, 2.0, 1.0], [0.7, 0.6, 0.4], n=8,
                  up=tuple((LH - LE).cross(Vector((0, 0, 1))).normalized()), tris=26, region='feather', cap0='round', cap1='round')
body_lo.append(lo)
body_hi += hi

HC = at((0.0, 0.8, CZ + 13.6))
TURN = 12.0                       # its face turned a little out to you
HEAD = [(0, 3.6, 0.0), (0, 1.2, 0.3), (0, -1.8, 0.0), (0, -3.6, -0.6)]
hd_lo, hd_hi = ak.spine('head', HEAD, [7.4, 10.8, 10.4, 7.2], [3.8, 4.7, 4.5, 3.0], [3.6, 4.3, 4.1, 2.8], e=2.2, n=16,
                        up=(0, 0, 1), tris=220, region='feather')
EYES = [(sx * 2.4, -3.6, 0.5) for sx in (1, -1)]


def sc_head(V, N):
    d = np.zeros(len(V))
    front = tk.smoothstep(-0.2, -0.6, N[:, 1])
    for e in EYES:
        r = np.hypot(V[:, 0] - e[0], (V[:, 2] - e[2]) * 0.95)
        d -= 0.3 * front * np.clip(1 - (r / 2.5) ** 2, 0, 1)                    # the heart-shaped facial disc: two shallow dishes
    d += 0.06 * np.cos(V[:, 0] * 4.0 + V[:, 2] * 5.0) ** 8 * tk.smoothstep(0.0, 0.5, N[:, 1])           # feathers behind
    return d


tk.push(hd_hi[0], sc_head)
def heart(C, N):
    ax = np.abs(C[:, 0])
    lobes = np.hypot(ax - 1.7, (C[:, 2] - 0.7) * 1.05) < 2.6
    chin = (C[:, 2] <= 0.7) & (C[:, 2] > -3.4) & (ax < 0.95 * (C[:, 2] + 3.4))
    return (N[:, 1] < -0.25) & (lobes | chin)


tk.regions(hd_hi[0], 'feather', [('disc', heart)])
bk_hi = tk.lathe('beak_hi', [(0, 0), (0.7, 0.0), (0.55, 0.6), (0, 1.5)], n=10, axis='Y', centre=(0, -4.1, -0.5))
tk.rotate(bk_hi, -180, 'Z', pivot=(0, -4.1, -0.5))
tk.rotate(bk_hi, 35, 'X', pivot=(0, -4.1, -0.5))
tk.set_region(bk_hi, 'beak')
bk_lo = tk.lathe('beak', [(0, 0), (0.7, 0.0), (0, 1.5)], n=4, axis='Y', centre=(0, -4.1, -0.5))
tk.rotate(bk_lo, -180, 'Z', pivot=(0, -4.1, -0.5))
tk.rotate(bk_lo, 35, 'X', pivot=(0, -4.1, -0.5))
# the eboshi: a tall black lacquer cap, its crown folded forward
EB = [(0, 0.0), (2.9, 0.0), (3.0, 1.2), (2.6, 3.4), (1.9, 5.2), (0.9, 6.3), (0, 6.5)]
eb_hi = tk.lathe('eboshi_hi', EB, n=18, centre=(0, 0.6, 3.6))
eb_lo = tk.lathe('eboshi', EB, n=8, centre=(0, 0.6, 3.6))
for o in (eb_hi, eb_lo):
    tk.scale(o, (1.0, 0.78, 1.0), pivot=(0, 0.6, 3.6))
    tk.rotate(o, -14, 'X', pivot=(0, 0.6, 3.6))
tk.subsurf(eb_hi, 1)
tk.push(eb_hi, lambda V, N: -0.18 * np.exp(-((V[:, 0] + 0.15 * (V[:, 2] - 6.0)) / 0.2) ** 2) * (V[:, 2] > 6.0) - 0.15 * np.exp(-((V[:, 2] - 5.0) / 0.25) ** 2))
tk.set_region(eb_hi, 'eboshi')
HM = Matrix.Translation(HC) @ Matrix.Rotation(math.radians(TURN), 4, 'Z')
for o in [hd_lo, bk_lo, eb_lo] + hd_hi + [bk_hi, eb_hi]:
    tk.transform(o, HM)
FACE = Vector((math.sin(math.radians(TURN)), -math.cos(math.radians(TURN)), 0.0))
NOD = Vector((math.cos(math.radians(TURN)), math.sin(math.radians(TURN)), 0.0))

# ------------------------------------------------------------------ the writing arm: a sleeve, the wing-hand with the brush
RS = at((-3.9, 1.0, CZ + 8.0))
UA, FA = 5.4, 6.4                 # upper (the sleeve), fore (wing-hand 2.6 mm, then the brush: its tip is the arm's end)
POLE = Vector((-0.45, -0.85, -0.15))    # the elbow out in front, below its chin
H0 = onb(1.6, -3.4, 1.8)          # at rest the brush hovers by the last stroke
RE0 = kr.ik2(RS, H0, UA, FA, POLE)
ru_lo, ru_hi = ak.spine('rsleeve', [tuple(RS), tuple(RS * 0.5 + RE0 * 0.5), tuple(RE0)], [2.8, 3.0, 2.8], 1.3, n=8, up=(0, 0, 1), tris=28,
                        region='robe', cap0='round', cap1='round')
dF = (H0 - RE0).normalized()
side = dF.cross(Vector((0, 0, 1))).normalized()
WT = RE0 + dF * 2.8               # the wing-hand's tip, where it grips the brush
rw_lo, rw_hi = ak.spine('rwing', [tuple(RE0), tuple(RE0 + dF * 1.8), tuple(WT)], [2.2, 2.0, 1.2], [0.7, 0.6, 0.5], n=8, up=tuple(side.cross(dF)),
                        tris=28, region='feather', cap0='round', cap1='round')
BR0 = WT - dF * 1.0
br_hi = [tk.tube('brush_hi', [tuple(BR0), tuple(H0 - dF * 1.5)], 0.32, n=8, cap0='round', cap1=None)]
tk.subsurf(br_hi[0], 1)
tk.set_region(br_hi[0], 'bamboo')
hair = tk.lathe('hair_hi', [(0, 0.0), (0.4, 0.05), (0.42, 0.5), (0.25, 1.15), (0, 1.55)], n=10)
hl = tk.lathe('hair', [(0, 0.0), (0.42, 0.3), (0, 1.55)], n=4)
for o in (hair, hl):
    tk.transform(o, Matrix.Translation(H0 - dF * 1.55) @ Vector((0, 0, 1)).rotation_difference(dF).to_matrix().to_4x4())
tk.set_region(hair, 'hair')
br_hi.append(hair)
br_lo = [tk.tube('brush', [tuple(BR0), tuple(H0 - dF * 1.5)], 0.32, n=4, cap0='flat', cap1=None), hl]

# ------------------------------------------------------------------ 寿, as nine ink strokes on the board (each grows under the brush)
STROKES = [   # (u, v) centre line, widths (mm), frames to write it
    ([(-1.9, 3.15), (-0.6, 3.25), (0.8, 3.35), (1.9, 3.45)], [0.62, 0.48, 0.46, 0.58], 4),
    ([(-2.5, 2.05), (-0.8, 2.13), (1.0, 2.22), (2.5, 2.3)], [0.66, 0.5, 0.48, 0.6], 4),
    ([(-3.4, 0.85), (-1.2, 0.93), (1.2, 1.02), (3.4, 1.12)], [0.7, 0.52, 0.5, 0.66], 5),
    ([(0.15, 3.95), (0.12, 2.6), (0.08, 1.3), (0.05, 0.05)], [0.72, 0.6, 0.58, 0.6], 4),
    ([(0.05, 0.05), (-0.45, -1.4), (-1.5, -2.8), (-3.0, -3.65)], [0.6, 0.5, 0.38, 0.14], 4),
    ([(-2.3, -0.75), (-0.3, -0.69), (1.6, -0.62), (3.4, -0.55)], [0.66, 0.5, 0.48, 0.62], 5),
    ([(1.9, -0.2), (1.9, -1.4), (1.88, -2.6), (1.85, -3.45)], [0.7, 0.6, 0.58, 0.55], 4),
    ([(1.85, -3.45), (1.5, -3.25), (1.1, -2.95)], [0.55, 0.32, 0.12], 2),
    ([(-0.6, -1.75), (-0.3, -2.05), (0.05, -2.4)], [0.36, 0.58, 0.5], 3),
]
JOIN = {4, 7}                     # strokes that carry on from the last without lifting the brush


def ribbon(name, pts, ws, h, n=1):
    """A flat brush stroke on the board: a strip along pts, ws wide, h out of the board's face."""
    pts = np.asarray(pts, float)
    m = len(pts)
    if n > 1:
        t = np.linspace(0, 1, (m - 1) * n + 1)
        s = np.linspace(0, 1, m)
        pts = np.stack([np.interp(t, s, pts[:, 0]), np.interp(t, s, pts[:, 1])], 1)
        ws = np.interp(t, s, ws)
        m = len(pts)
    T = np.gradient(pts, axis=0)
    T /= np.linalg.norm(T, axis=1, keepdims=True)
    Nn = np.stack([-T[:, 1], T[:, 0]], 1)
    V, Fc = [], []
    for i in range(m):
        for sgn in (-1, 1):
            q = pts[i] + Nn[i] * ws[i] / 2 * sgn
            V.append(tuple(onb(q[0], q[1], h)))
    for i in range(m - 1):
        Fc.append([2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1])
    a, b_, c = (Vector(V[j]) for j in Fc[0][:3])
    if (b_ - a).cross(c - a).dot(NB) < 0:            # face it out of the board
        Fc = [f[::-1] for f in Fc]
    return tk.from_pydata(name, V, Fc)


SCHED = []                        # the frame each stroke starts
_f = 31
for _i, (_p, _w, _n) in enumerate(STROKES):
    SCHED.append(_f)
    _f += _n + (3 if _i + 1 < len(STROKES) and (_i + 1) not in JOIN else 0)
WEND = _f                         # the writing is done
FRAMES = WEND + 30
ink_parts = []
print('reach', [round((onb(*p_, 0.3) - RS).length, 1) for st in STROKES for p_ in (st[0][0], st[0][-1])], round((INK - RS).length, 1))
for i, (pts, ws, nf) in enumerate(STROKES):
    h = 0.06 + 0.035 * i
    hi = ribbon(f'k{i + 1}_hi', pts, ws, h, n=4)
    tk.set_region(hi, 'ink')
    lo = ribbon(f'k{i + 1}', pts, ws, h)
    s0, s1 = onb(*pts[0], h), onb(*pts[-1], h)
    ink_parts.append((f'k{i + 1}', lo, hi, s0, s1, pts, nf))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(b['lo'], 'base'), b['hi'], kind='gloss')
F.part('key', b['key'][0], b['key'][1], bone='key', kind='metal')
F.part('easel', tk.join([bd_lo] + st_lo, 'easel'), [bd_hi] + st_hi)
F.part('body', tk.join(body_lo, 'body'), body_hi, bone='body')
F.part('head', tk.join([hd_lo, bk_lo, eb_lo], 'head'), hd_hi + [bk_hi, eb_hi], bone='head')
F.part('rsleeve', ru_lo, ru_hi, bone='rarm')
F.part('rwing', tk.join([rw_lo] + br_lo, 'rwing'), rw_hi + br_hi, bone='rfore')
for nm, lo, hi, s0, s1, pts, nf in ink_parts:
    F.part(nm, lo, [hi], bone=nm)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('key', b['KEY'], parent='root')
    R.bone('body', tuple(at((0, 0.6, CZ))), parent='root')
    R.bone('head', tuple(at((0, 1.0, CZ + 9.4))), parent='body')
    R.bone('rarm', tuple(RS), parent='body')
    R.bone('rfore', tuple(RE0), parent='rarm')
    for nm, lo, hi, s0, s1, pts, nf in ink_parts:
        R.bone(nm, tuple(s0), parent='root', tail=tuple(s0 + (s1 - s0).normalized() * 2.0))
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key

    def brush(f, H, ease='LINEAR'):
        H = Vector(H)
        kr.arm(k, 'rarm', 'rfore', RS, RE0, H0, kr.ik2(RS, H, UA, FA, POLE), H, f, ease=ease)

    with R.action('gimmick'):
        bones = ['root', 'key', 'body', 'head', 'rarm', 'rfore']
        for bn in bones:
            k(bn, 0)
        kr.wind(k, 0, 12, 2)
        kr.unwind(k, 12, FRAMES, 2)
        # the old character is gone as the key winds (a fresh board)
        for nm, *_ in ink_parts:
            k(nm, 0, scale=0.01, ease='CONSTANT')
        # 12-28 it dips the brush twice in the inkstone, looking down at it
        k('head', 10)
        k('head', 16, rot=[(NOD, 10), ('Z', -8)])
        k('head', 28, rot=[(NOD, 10), ('Z', -8)])
        k('head', 34, rot=[(NOD, 6)])
        dip = INK + Vector((0, 0, 0.2))
        up = INK + Vector((0, 0, 2.6))
        brush(12, H0)
        brush(17, up, ease=None)
        brush(19, dip)
        brush(21, up)
        brush(23, dip)
        brush(26, up, ease=None)
        # 30-88 it writes, stroke by stroke in the right order; each stroke grows under the brush tip
        first = STROKES[0][0][0]
        brush(SCHED[0] - 1, onb(*first, 1.3), ease=None)
        for i, (nm, lo, hi, s0, s1, pts, nf) in enumerate(ink_parts):
            f = SCHED[i]
            if i not in JOIN:
                brush(f, onb(*pts[0], 0.3))
            k(nm, f - 1, scale=0.01, ease='CONSTANT')
            k(nm, f, scale=(1.0, 0.03, 1.0), ease='LINEAR')
            for j in range(1, nf + 1):
                t = j / nf
                brush(f + j, onb(*(np.asarray(pts[0]) + (np.asarray(pts[-1]) - np.asarray(pts[0])) * t), 0.3))
            k(nm, f + nf, ease='LINEAR')
            k(nm, FRAMES)
            f += nf
            if i + 1 < len(ink_parts) and (i + 1) not in JOIN:
                nxt = ink_parts[i + 1][5][0]
                brush(f + 1, onb(*pts[-1], 1.3))
                brush(f + 2, onb(*nxt, 1.3))
        # it lifts the brush away, tilts its head at its work, and bows
        f = WEND
        brush(f + 4, H0, ease=None)
        k('head', f, rot=[(NOD, 6)])
        k('head', f + 6, rot=[(FACE, -14)])
        k('head', f + 13, rot=[(FACE, -14)])
        k('head', f + 17)
        k('body', f + 14)
        k('body', f + 20, rot=('X', 12))
        k('body', f + 24, rot=('X', 12))
        brush(FRAMES, H0)
        for bn in bones:
            if bn != 'key':
                k(bn, FRAMES)
    return R


import paint as pt  # noqa: E402


def shippo(u, v, a, w):
    """Mask of the shippō pattern (interlocking circles on a square grid, spacing a) lines, w wide."""
    R = a / math.sqrt(2)
    m = np.zeros(u.shape, bool)
    for oi in (0, 1):
        for oj in (0, 1):
            cu = (np.floor(u / a) + oi) * a
            cv = (np.floor(v / a) + oj) * a
            m |= np.abs(np.hypot(u - cu, v - cv) - R) < w / 2
    return m


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    kr.paint_base(P, pt, sh)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    # the tatami: woven rush, a black cloth border with a little gold
    P.fill('tatami', pt.ramp('#b5ad6a', 6, shift=0.06), tone=sh + 0.12 * (np.mod((Yc - O[1]) * 3.0, 1.0) < 0.35), base=0.05)
    tm = P.region('tatami')
    ex, ey = np.abs(X - O[0]), np.abs(Yc - O[1] - 1.6)
    P.fill(tm & ((ex > 5.0) | (ey > 4.6)), pt.ramp('#25222a', 5, shift=0.05), tone=sh, base=0.0)
    P.fill(tm & ((np.abs(ex - 5.35) < 0.12) & (ey < 4.9) | (np.abs(ey - 4.95) < 0.12) & (ex < 5.4)), GOLD, tone=sh, base=0.1)
    # the inkstone: dark slate, its well full of glossy ink; the ink stick with a gold label
    P.fill('stone', pt.ramp('#45454c', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('pool', pt.ramp('#121016', 4, shift=0.04, light=0.7), tone=sh * 1.4, base=0.0)
    P.fill('sumi', pt.ramp('#1a181c', 4, shift=0.04), tone=sh, base=0.05)
    P.fill(P.region('sumi') & (P.on[:, :, 2] > 0.7) & (np.abs(Yc - INK[1] - 1.0 - (X - INK[0] - 3.2) * 0.3) < 0.7), GOLD, tone=sh, base=0.1)
    # the board: cream washi flecked with gold leaf, gold edges, a red seal; the black lacquer easel
    lp = np.einsum('ijk,k->ij', P.pos - np.array(B), np.array(UB)), np.einsum('ijk,k->ij', P.pos - np.array(B), np.array(VB))
    P.fill('washi', pt.ramp('#f1e9d4', 5, shift=0.03), tone=sh * 0.5, base=0.2)
    wa = P.region('washi')
    rng = np.random.default_rng(831)
    for _ in range(26):
        cu, cv = rng.uniform(-BW / 2 + 0.4, BW / 2 - 0.4), rng.uniform(-BH / 2 + 0.4, BH / 2 - 0.4)
        if abs(cu) < 3.8 and abs(cv) < 4.2 and rng.random() < 0.7:
            continue
        s_ = rng.uniform(0.18, 0.4)
        P.fill(wa & (np.abs(lp[0] - cu) < s_) & (np.abs(lp[1] - cv) < s_ * rng.uniform(0.6, 1.2)), GOLD, tone=sh * 0.5, base=0.15)
    seal = wa & (np.abs(lp[0] - 3.3) < 0.62) & (np.abs(lp[1] + 3.6) < 0.62)
    P.fill(seal, pt.ramp('#c0302c', 4, shift=0.04), tone=sh * 0.5, base=0.1)
    P.flat(seal & ((np.abs(lp[0] - 3.3) < 0.12) | (np.abs(lp[1] + 3.6) < 0.12) | (np.abs(np.abs(lp[0] - 3.3) - 0.42) < 0.08)) & (np.abs(lp[0] - 3.3) < 0.48) & (np.abs(lp[1] + 3.6) < 0.48), '#f0d8c8')
    sig = wa & (np.abs(lp[0] - 3.3) < 0.14) & (lp[1] > -2.6) & (lp[1] < -0.6) & (np.mod(lp[1] * 2.2, 1.0) < 0.62)
    P.flat(sig, '#2a2226')                                                          # the signature, a column of tiny marks
    P.fill('goldedge', GOLD, tone=sh, base=0.1)
    P.fill('card', pt.ramp('#8a6a46', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('lac', pt.ramp('#1d1a20', 6, shift=0.05, light=0.6), tone=sh * 1.3, base=0.0)
    # ink: sumi black, the brush's dry streaks (kasure) at the ends of the long strokes
    P.fill('ink', pt.ramp('#141018', 4, shift=0.03, light=0.35), tone=sh * 0.4, base=0.0)
    P.flat(P.region('ink') & (np.mod(lp[1] * 9.0 + lp[0] * 0.4, 1.0) < 0.18) & ((lp[0] > 2.6) | (lp[1] < -3.0)), '#4a4450')
    # the robe: indigo with a gold shippō lattice; a white collar, a mustard obi with a brown stripe
    P.fill('robe', pt.ramp('#2c3a6a', 7, shift=0.07), tone=sh, base=0.0)
    P.fill(P.region('robe') & shippo(X + Yc * 0.5, Z, 1.6, 0.13), GOLD, tone=sh, base=0.05)
    P.fill('collar', pt.ramp('#efe9dc', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('obi', pt.ramp('#c69a3a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region('obi') & (np.abs(Z - CZ - 4.4) < 0.16), pt.ramp('#6a3a22', 4), tone=sh)
    # the owl: brown feathers barred darker, the white facial disc ringed brown, an ivory beak; the black eboshi
    P.fill('feather', pt.ramp('#8a6a48', 7, shift=0.06), tone=sh, base=0.05)
    fe = P.region('feather')
    P.fill(fe & (np.mod(Z * 1.6 + np.sin(X * 2.0) * 0.4, 1.0) < 0.2) & (Z < HC[2] + 1.0), pt.ramp('#5a4030', 5), tone=sh)
    P.fill('disc', pt.ramp('#f4f0e8', 5, shift=0.03), tone=sh, base=0.25)
    P.fill('beak', pt.ramp('#e2c890', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('eboshi', pt.ramp('#1b1920', 6, shift=0.06, light=0.55), tone=sh * 1.2, base=0.0)
    P.fill('bamboo', pt.ramp('#c9a868', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('hair', pt.ramp('#efe8d8', 4, shift=0.03), tone=sh, base=0.15)
    tipd = np.einsum('ijk,k->ij', P.pos - np.array(H0), np.array(-dF))
    P.fill(P.region('hair') & (tipd < 0.9), pt.ramp('#18141a', 3), tone=sh)          # the tip, wet with ink
    import face
    c = HC + FACE * 3.9 + Vector((0, 0, 0.6))
    fc = face.Face(P, c=tuple(c), axis=(FACE[0], FACE[1], 0.1), where=P.region('disc'), seed=841)
    fc.eyes('dot', spread=3.8, size=0.42, dy=0.1)
    fc.brows('raised', spread=4.2, dy=1.6, w=1.1, weight=0.2)
    fc.blush(5.0, -1.2, rx=0.8, ry=0.45)
    P.lines(['tatami', 'washi', 'goldedge', 'obi', 'collar', 'eboshi', 'beak', 'stone'], step=1)
    P.clusters()
    return P.done()


def kr_arc(cu, cv, r, a0, a1, n=12):
    return [(cu + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cv + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


bk.run(F, make_rig, paint,
       skip=[('key', 'base'), ('body', 'base'), ('head', 'body'), ('rsleeve', 'body'), ('rwing', 'rsleeve'), ('easel', 'base')] +
       [(nm, x) for nm, *_ in ink_parts for x in ('easel', 'rwing')] + [(a[0], c[0]) for i, a in enumerate(ink_parts) for c in ink_parts[i + 1:]],
       cam=((40, -58, 36), (0, 0, 14)), fold=(0, 20, SCHED[3] + 2, WEND + 20), frames=FRAMES)
