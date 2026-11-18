"""テレビジカ TV Deer: a Shōwa walnut television on four splayed legs that is a sika deer (series kaden, secret;
concepts_C.md).

The cabinet is the deer (cream sika spots along its walnut flanks, a white tuft of a tail), the four tapered legs
with their brass ferrules are its legs and hooves, the rabbit-ear aerial is its antlers (each rod with a tine), two
leaf ears sit at the aerial's foot, and the face is on the screen: the picture tube shows it. The sliding doors either
side of the screen are its eyelids. The screen is a light-up part (it glows while it plays).
Gimmick: the doors slide shut and open (a blink), blink again, the aerial-antlers extend and swivel, and it bows.

    tools/blender.sh art/blender/toys/kaden/shika.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('kaden', 'shika')

LZ = 15.0                    # the cabinet's bottom (the legs' height)
CW, CD, CH = 38.0, 22.0, 25.0  # cabinet width, depth, height
CZ = LZ + CH / 2
FY = -CD / 2                 # the cabinet front
SW, SH = 17.0, 14.6          # the screen's opening
SZ = CZ + 1.0                # the screen's centre height
DW = 8.4                    # a door's width
TOPZ = LZ + CH
ANT = (0, 4.0, TOPZ + 1.2)   # the aerial's base

# ------------------------------------------------------------------ the cabinet
cab = tk.rbox('cab', (CW, CD, CH), centre=(0, 0, CZ), bevel=3.2, segs=3, profile=0.6)


def sc_cab(h):
    def f(V, N):
        # the front frame's bead round the door tracks, the back's vent slots
        d = 0.25 * tk.smoothstep(0.5, 0.0, np.abs(np.abs(V[:, 2] - SZ) - (SH / 2 + 2.3))) * (N[:, 1] < -0.8) * (np.abs(V[:, 0]) < CW / 2 - 2)
        d -= 0.4 * (np.abs(np.mod(V[:, 0], 3.0) - 1.5) < 0.5) * (N[:, 1] > 0.8) * (np.abs(V[:, 2] - (CZ + 4)) < 3.5) * (np.abs(V[:, 0]) < 9)
        return d
    tk.push(h, f)


cab_lo, cab_hi = tk.lowhigh(cab, 'cab', lo=0, hi=2, sculpt=sc_cab, region='walnut')
for o in (cab_lo, cab_hi):
    tk.boolean(o, tk.rbox('scr', (SW + 1.0, 6.0, SH + 1.0), centre=(0, FY, SZ), bevel=2.2, segs=2))
tk.regions(cab_hi, 'walnut', [('bezel', lambda C, N: (np.abs(C[:, 0]) < SW / 2 + 1.0) & (np.abs(C[:, 2] - SZ) < SH / 2 + 1.0) & (C[:, 1] > FY - 0.5) & (C[:, 1] < FY + 3.2)),
                              ('panel', lambda C, N: (N[:, 1] < -0.8) & (C[:, 2] < SZ - SH / 2 - 2.6) & (np.abs(C[:, 0]) < CW / 2 - 3))])
tk.decimate(cab_lo, 300)

# the picture tube (a light-up part): a domed glass face set back in the opening
scr = tk.rbox('screen', (SW + 0.6, 2.4, SH + 0.6), centre=(0, FY + 3.0, SZ), bevel=2.0, segs=2)
tk.deform(scr, lambda V: np.stack([V[:, 0], V[:, 1] - 1.2 * np.clip(1 - (V[:, 0] / (SW / 2 + 0.3)) ** 2 - ((V[:, 2] - SZ) / (SH / 2 + 0.3)) ** 2, 0, 1) * (V[:, 1] < FY + 2.5), V[:, 2]], 1))
scr_lo, scr_hi = cx.low(scr, 'screen', 70, lo=0, hi=2, region='screen')

# the control strip under the screen: two knobs (channel and volume) and a speaker grille
KNOBS = []
for x in (-10.5, 10.5):
    kb = tk.lathe('knob', [(0, 0.6), (2.0, 0.6), (2.2, -0.6), (1.8, -1.8), (0, -2.0)], n=12, axis='Y', centre=(x, FY, LZ + 4.0))
    KNOBS.append(cx.low(kb, 'knob', 30, lo=0, hi=1, region='brass'))

# ------------------------------------------------------------------ the doors (eyelids), open to the sides of the screen
DOORS = {}
for sx, nm in ((1, 'door_l'), (-1, 'door_r')):
    d = tk.rbox(nm, (DW, 1.1, SH + 3.6), centre=(sx * (SW / 2 + DW / 2 + 0.3), FY - 0.75, SZ), bevel=0.45, segs=1)

    def sc_door(h, sx=sx):
        def f(V, N):  # tambour slats
            return -0.18 * (np.abs(np.mod(V[:, 0], 1.6) - 0.8) < 0.18) * (N[:, 1] < -0.8)
        tk.push(h, f)
    lo, hi = cx.low(d, nm, 30, lo=0, hi=2, sculpt=sc_door, region='door', keep_corners=True)
    DOORS[nm] = (lo, hi, sx)

# ------------------------------------------------------------------ legs with brass hooves, the tail tuft
LEGS = []
for x, y in ((14.0, -6.0), (-14.0, -6.0), (14.0, 6.0), (-14.0, 6.0)):
    ox, oy = np.sign(x) * 4.6, np.sign(y) * 3.2
    lg = tk.tube('leg', [(x, y, LZ + 1.5), (x + ox * 0.5, y + oy * 0.5, LZ * 0.5), (x + ox, y + oy, 2.2), (x + ox * 1.04, y + oy * 1.04, 0.0)],
                 [2.0, 1.5, 1.05, 1.15], n=8, cap0='round', cap1='flat')
    LEGS.append(cx.low(lg, 'leg', 44, lo=1, hi=2, region=('walnut', [('brass', lambda C, N: C[:, 2] < 3.4)])))
tail = tk.lathe('tail', [(0, -0.6), (2.6, -0.4), (2.8, 1.2), (1.8, 3.2), (0, 4.0)], n=10)
tk.rotate(tail, 70, 'X')
tk.move(tail, (0, CD / 2 - 0.4, TOPZ - 4.6))
LEGS.append(cx.low(tail, 'tail', 40, lo=1, hi=2, region='cream'))

# ------------------------------------------------------------------ the aerial: base, ears, two antler rods with tines
base = tk.lathe('abase', [(0, 0), (4.6, 0), (4.4, 1.6), (3.0, 3.0), (1.6, 3.4), (0, 3.6)], n=16, centre=(ANT[0], ANT[1], ANT[2] - 1.6))
base_lo, base_hi = cx.low(base, 'abase', 50, lo=0, hi=2, region='brass')
EARS = []
for sx in (1, -1):
    e = tk.slab('ear', [(0.0, -2.0), (3.6, -2.8), (7.4, -1.8), (10.2, 0.2), (7.6, 2.2), (3.6, 2.8), (0.0, 1.8)], 1.6, plane='XZ', at=0.0, bevel=0.6, segs=1)
    tk.subsurf(e, 1)
    tk.deform(e, lambda V: np.stack([V[:, 0], V[:, 1] + 0.09 * V[:, 2] ** 2 - 0.3, V[:, 2]], 1))  # cupped toward the front
    if sx < 0:
        tk.scale(e, (-1, 1, 1))
        tk.fix_normals(e)
    tk.rotate(e, -sx * 32, 'Y')        # up and out
    tk.move(e, (sx * 14.4, -3.6, TOPZ - 1.4))
    EARS.append(cx.low(e, 'ear', 44, lo=0, hi=2, region=('walnut', [('inner', lambda C, N: N[:, 1] < -0.5)])))
RODS = {}
for sx, nm in ((1, 'ant_l'), (-1, 'ant_r')):
    a = math.radians(28)
    dirv = np.array((sx * math.sin(a), 0.22, math.cos(a)))
    dirv /= np.linalg.norm(dirv)
    root = np.array(ANT) + np.array((sx * 1.2, 0, 0.8))
    lower = tk.tube('rod', [tuple(root - dirv * 1.0), tuple(root + dirv * 12.0)], [1.0, 0.85], n=6)
    tine_from = root + dirv * 8.0
    tdir = np.array((sx * 0.9, -0.5, 0.55))
    tdir /= np.linalg.norm(tdir)
    tine = tk.tube('tine', [tuple(tine_from), tuple(tine_from + tdir * 4.6)], [0.7, 0.55], n=6, cap1='round')
    tball = tk.lathe('tb', [(0, -1.0), (1.0, -0.6), (1.1, 0.2), (0.7, 0.9), (0, 1.1)], n=8, centre=tuple(tine_from + tdir * 5.2))
    lo = [cx.low(o, o.name, t, lo=0, hi=1, region='gold') for o, t in ((lower, 30), (tine, 20), (tball, 24))]
    upper = tk.tube('rodtip', [tuple(root + dirv * 6.0), tuple(root + dirv * 18.0)], [0.6, 0.55], n=6)
    ball = tk.lathe('ball', [(0, -1.3), (1.3, -0.8), (1.45, 0.2), (0.9, 1.2), (0, 1.4)], n=10, centre=tuple(root + dirv * 19.0))
    up = [cx.low(o, o.name, t, lo=0, hi=1, region='gold') for o, t in ((upper, 24), (ball, 30))]
    RODS[nm] = (lo, up, tuple(root), dirv)

# ------------------------------------------------------------------ parts
F.part('cab', tk.join([cab_lo] + [k[0] for k in KNOBS] + [l[0] for l in LEGS] + [base_lo] + [e[0] for e in EARS], 'cab'),
       [cab_hi] + [k[1] for k in KNOBS] + [l[1] for l in LEGS] + [base_hi] + [e[1] for e in EARS], bone='root', kind='gloss')
F.part('screen', scr_lo, [scr_hi], bone='root', kind='led')
for nm, (lo, hi, sx) in DOORS.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss')
for nm, (lo, up, root, dirv) in RODS.items():
    F.part(nm, tk.join([l[0] for l in lo], nm), [l[1] for l in lo], bone=nm, kind='metal')
    F.part(nm + '_tip', tk.join([u[0] for u in up], nm + '_tip'), [u[1] for u in up], bone=nm + '_tip', kind='metal')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    for nm, (lo, hi, sx) in DOORS.items():
        R.bone(nm, (sx * (SW / 2 + DW / 2), FY - 0.75, SZ), parent='root')
    for nm, (lo, up, root, dirv) in RODS.items():
        R.bone(nm, root, parent='root')
        R.bone(nm + '_tip', tuple(np.array(root) + dirv * 6.0), parent=nm)
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'door_l', 'door_r', 'ant_l', 'ant_r', 'ant_l_tip', 'ant_r_tip']
    shut = SW / 2 + 0.3 - 0.05  # (each door slides over half the screen: they meet in the middle)
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # a blink: the doors slide shut and open, then a quick second blink
        for nm, sx in (('door_l', 1), ('door_r', -1)):
            for f0 in (4, 26):
                k(nm, f0)
                k(nm, f0 + 4, move=(-sx * shut, 0, 0), ease='BACK' if f0 == 4 else None)
                k(nm, f0 + (9 if f0 == 4 else 6), move=(-sx * shut, 0, 0))
                k(nm, f0 + (14 if f0 == 4 else 10))
        # the aerial-antlers extend, then swivel side to side like a deer listening
        for nm, (lo, up, root, dirv) in RODS.items():
            sx = 1 if nm == 'ant_l' else -1
            k(nm + '_tip', 36)
            k(nm + '_tip', 42, move=tuple(dirv * 5.0), ease='BACK')
            k(nm + '_tip', 70, move=tuple(dirv * 5.0))
            k(nm + '_tip', 76)
            k(nm, 42)
            k(nm, 48, rot=('Y', -14))
            k(nm, 54, rot=('Y', 12))
            k(nm, 60, rot=('Y', -6))
            k(nm, 64)
        # and a sika deer's bow
        k('root', 60)
        k('root', 66, rot=('X', 9), move=(0, -0.6, 0))
        k('root', 72, rot=('X', 9), move=(0, -0.6, 0))
        k('root', 78, ease='BACK')
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.3, cav=1.1)
    WAL = pt.ramp('#8a5634', 7, shift=0.07)
    # walnut veneer: the grain in long wavy figure, two tones
    ph = Z * 1.7 + np.sin(X * 0.23 + 1.3) * 2.6 + np.sin(Yc * 0.31) * 1.9 + np.sin(X * 0.71 + Z * 0.4) * 0.8
    P.fill('walnut', WAL, tone=sh, base=0.05 + 0.06 * np.sin(ph * 0.5))
    streak = (np.sin(ph) > 0.94) & (np.sin(X * 0.9 + Z * 0.3 + Yc * 0.5) > -0.2)
    P.tint(P.region('walnut') & streak, pt.ramp('#6e4228', 6, shift=0.06), sh)
    # cream sika spots in rows along the flanks and the top (the deer)
    flank = P.region('walnut') & (P.part == 0) & (Z > LZ + 3) & ((np.abs(on[:, :, 0]) > 0.7) | (on[:, :, 2] > 0.7))
    for row, (zz, n0) in enumerate(((TOPZ - 4.0, 0.0), (TOPZ - 8.6, 1.6), (TOPZ - 13.0, 0.4))):
        uu = Yc + n0
        cell = np.floor(uu / 4.2)
        cu = uu - (cell + 0.5) * 4.2 + 0.5 * np.sin(cell * 2.7 + row)
        cz = Z - zz - 0.6 * np.sin(cell * 1.9 + row * 2.0)
        sp = (cu / 1.0) ** 2 + (cz / 0.8) ** 2 < 1
        P.flat(flank & (np.abs(on[:, :, 0]) > 0.7) & sp & (np.abs(Yc) < CD / 2 - 2.0), '#f1e4c6')
    ci, cj = np.floor((X + 1.0) / 4.6), np.floor((Yc + 1.3 * np.floor((X + 1.0) / 4.6)) / 5.0)
    du = X + 1.0 - (ci + 0.5) * 4.6 + 0.6 * np.sin(cj * 2.1 + ci)
    dv = Yc + 1.3 * ci - (cj + 0.5) * 5.0 + 0.7 * np.sin(ci * 1.7 + cj * 0.6)
    tsp = (du / 0.95) ** 2 + (dv / 0.8) ** 2 < 1
    P.flat(P.region('walnut') & (P.part == 0) & (on[:, :, 2] > 0.85) & tsp & (np.hypot(X - ANT[0], Yc - ANT[1]) > 6.0) & (np.abs(X) < CW / 2 - 3) & (np.abs(Yc) < CD / 2 - 2.5), '#f1e4c6')
    P.fill('bezel', pt.ramp('#d2b06a', 7, shift=0.06), tone=sh * 1.2, base=0.1)
    P.fill('panel', pt.ramp('#5a3a26', 6, shift=0.06), tone=sh, base=0.1)
    pnl = P.region('panel')
    P.flat(pnl & (np.abs(np.mod(X, 1.4) - 0.7) < 0.25) & (np.abs(X) < 7.0) & (np.abs(Z - (LZ + 4.0)) < 2.0), '#2e1e16')
    P.fill('brass', pt.ramp('#d2a64a', 7, dark=0.6, light=0.6, shift=0.06), tone=sh * 1.3, base=0.1)
    P.fill('gold', pt.ramp('#dcb050', 7, dark=0.6, light=0.6, shift=0.06), tone=free * 1.3, base=0.15)
    P.fill('cream', pt.ramp('#f1e4c6', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('inner', pt.ramp('#e9c2ac', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('door', pt.ramp('#b07a48', 7, shift=0.07), tone=free, base=0.1)
    P.tint(P.region('door') & (np.abs(np.mod(X, 1.6) - 0.8) < 0.22), pt.ramp('#8a5a34', 6, shift=0.06), free)
    # the screen: a pale blue-grey picture (it glows when lit), soft scan lines, and the deer's face on it
    sc = P.region('screen')
    P.fill('screen', pt.ramp('#b8d0d4', 6, shift=0.05), tone=free * 0.5, base=0.15 - 0.25 * tk.smoothstep(4.0, 8.6, np.abs(X)) - 0.25 * tk.smoothstep(3.5, 7.2, np.abs(Z - SZ)))
    P.tint(sc & (np.mod(Z, 0.9) < 0.3) & (np.abs(X) < 7.6), pt.ramp('#a4c0c6', 6, shift=0.05), free * 0.5)
    fc = face.Face(P, c=(0, FY + 1.2, SZ), axis=(0, -1, 0), where=sc, seed=41)
    fc.eyes(spread=7.6, size=0.75, dy=0.4)
    fc.mouth('w', w=2.6, dy=-2.2)
    fc.blush(10.6, -1.4, rx=1.5, ry=0.8, col='#e89a9a')
    P.lines(['walnut'], ['bezel', 'cream', 'brass', 'panel'], step=2)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('ant_l', 'cab'), ('ant_r', 'cab'), ('ant_l_tip', 'ant_l'), ('ant_r_tip', 'ant_r')]),
       cams=[((80, -96, 66), (0, 0, 26)), ((-74, 84, 60), (0, 0, 26))], fold=(0, 8, 46, 68))
