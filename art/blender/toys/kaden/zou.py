"""ケトルゾウ Kettle Elephant: a Shōwa enamel whistling kettle on a trivet that is an elephant (series kaden,
concepts_C.md).

The round enamel kettle is the elephant, the spout curling up from its front is the trunk with the whistle flap at
its tip, the trivet's four stubby legs are its legs, the bail handle's lugs carry its big round ears, and the lid knob
sits on its head like a little red cap. A red camellia decal on each flank, black enamel rims.
Gimmick: it simmers and rocks, the lid rattles, the ears flap, the trunk lifts and the whistle flap flips open: toot.

    tools/blender.sh art/blender/toys/kaden/zou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kaden', 'zou')

ZB = 5.4                  # the kettle's bottom (it stands on the trivet legs)
ZT = 23.6                 # the lid seat
LID_R = 9.0
SP = (0, -14.6, 11.2)     # the spout's root (the trunk's pivot, axis x)
EAR_Z = 16.6

# ------------------------------------------------------------------ the kettle body: a squat round hōrō kettle
prof = [(0, ZB), (13.6, ZB), (15.4, ZB + 0.6), (16.6, ZB + 2.0), (17.6, ZB + 4.6), (17.8, ZB + 7.2), (17.2, ZB + 10.2),
        (15.6, ZB + 13.4), (13.0, ZB + 15.8), (10.6, ZT - 0.6), (LID_R + 0.6, ZT), (LID_R - 0.6, ZT + 0.1), (LID_R - 0.8, ZT - 1.4), (0, ZT - 1.4)]
body = tk.lathe('body', prof, n=28)


def sc_body(h):
    def f(V, N):
        r = np.hypot(V[:, 0], V[:, 1])
        # the rolled rim at the foot and at the lid seat, the shoulder seam
        d = 0.3 * tk.smoothstep(0.6, 0.0, np.abs(V[:, 2] - (ZB + 0.9))) + 0.25 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 2] - ZT)) * (r > LID_R)
        d -= 0.22 * tk.smoothstep(0.35, 0.0, np.abs(V[:, 2] - (ZB + 13.4)))
        # a chubby forehead over the trunk and cheeks either side of it
        d += tk.bump(V, (0, -15.6, 17.0), 6.0, 0.7)
        for sx in (1, -1):
            d += tk.bump(V, (sx * 5.6, -16.0, 10.4), 4.6, 0.8)
        return d
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 400, lo=1, hi=2, sculpt=sc_body, region=('enamel', [
    ('rim', lambda C, N: (C[:, 2] < ZB + 1.6) | ((C[:, 2] > ZT - 0.8) & (np.hypot(C[:, 0], C[:, 1]) > LID_R - 1.0))),
    ('dark', lambda C, N: (C[:, 2] < ZT - 0.5) & (np.hypot(C[:, 0], C[:, 1]) < LID_R - 0.4))]))

# ------------------------------------------------------------------ the lid and its knob (a little red cap)
lid = tk.lathe('lid', [(0, ZT - 1.0), (LID_R - 1.0, ZT - 1.0), (LID_R - 0.9, ZT + 0.2), (LID_R + 0.3, ZT + 0.4), (LID_R + 0.4, ZT + 1.1),
                      (LID_R - 1.0, ZT + 2.4), (5.0, ZT + 3.3), (2.4, ZT + 3.6), (0, ZT + 3.6)], n=24)
knob = tk.lathe('knob', [(0, ZT + 3.2), (2.0, ZT + 3.2), (2.2, ZT + 4.2), (3.4, ZT + 5.4), (3.5, ZT + 6.6), (2.6, ZT + 7.5), (0, ZT + 7.7)], n=14)
LID = [cx.low(lid, 'lid', 110, lo=0, hi=2, region=('enamel', [('rim', lambda C, N: (np.hypot(C[:, 0], C[:, 1]) > LID_R - 0.6))])),
       cx.low(knob, 'knob', 60, lo=0, hi=2, region='cap')]

# ------------------------------------------------------------------ the spout: the trunk, with the whistle flap at its tip
trunk_pts = [(0, -12.0, 10.6), SP, (0, -18.8, 11.0), (0, -22.6, 12.6), (0, -25.0, 15.8), (0, -26.0, 20.0), (0, -25.6, 24.2), (0, -24.2, 27.4)]
trunk = tk.tube('trunk', trunk_pts, [5.0, 4.7, 4.1, 3.5, 3.0, 2.7, 2.5, 2.45], n=12, cap0='round', cap1='flat')


def sc_trunk(h):
    def f(V, N):  # the trunk's wrinkles: soft rings round it, deeper underneath
        s = V[:, 1] * 0.8 - V[:, 2] * 0.55
        return -0.2 * (np.abs(np.sin(s * math.pi / 1.3)) ** 6) * (V[:, 1] < -16.0)
    tk.push(h, f)


trunk_lo, trunk_hi = cx.low(trunk, 'trunk', 170, lo=1, hi=2, sculpt=sc_trunk, region=('enamel', [('rim', lambda C, N: C[:, 2] > 26.6)]))
TIP = np.array(trunk_pts[-1])
FLAP_P = (0, TIP[1] + 2.0, TIP[2] + 0.6)   # the flap's hinge (behind the tip)
flap = tk.lathe('flap', [(0, -0.4), (2.9, -0.4), (3.0, 0.4), (2.0, 1.0), (0, 1.1)], n=14)
tk.rotate(flap, -26, 'X')
tk.move(flap, (0, TIP[1] - 0.2, TIP[2] + 0.4))
hinge = tk.cyl('hinge', 0.8, -1.4, 1.4, n=8, at=(FLAP_P[1], FLAP_P[2]), axis='X', bevel=0.2, segs=1)
FLAP = [cx.low(flap, 'flap', 40, lo=0, hi=2, region='metal'), cx.low(hinge, 'hinge', 20, lo=0, hi=1, region='metal')]

# ------------------------------------------------------------------ ears on the handle lugs, the bail handle over the top
EARS = {}
for sx, nm in ((1, 'ear_l'), (-1, 'ear_r')):
    pts = [(-0.6, -6.4), (4.0, -8.0), (9.2, -6.6), (12.8, -2.2), (13.4, 3.2), (11.4, 7.8), (6.4, 9.8), (1.8, 8.8), (-0.6, 4.4), (-0.8, -1.6)]
    e = tk.slab(nm, pts, 1.9, plane='XZ', at=0.0, bevel=0.75, segs=1)
    tk.subsurf(e, 1)
    tk.deform(e, lambda V: np.stack([V[:, 0], V[:, 1] + 0.035 * (V[:, 0] - 6.0) ** 2 + 0.03 * (V[:, 2] - 1.0) ** 2 - 1.2, V[:, 2]], 1))  # cupped forward
    if sx < 0:
        tk.scale(e, (-1, 1, 1))
        tk.fix_normals(e)
    tk.rotate(e, sx * 22, 'Z')       # the outer edge swept back a little
    root = (sx * 14.2, -8.6, EAR_Z)
    tk.move(e, root)
    lo, hi = cx.low(e, nm, 76, lo=0, hi=2, region=('enamel', [('inner', lambda C, N: N[:, 1] < -0.35)]))
    EARS[nm] = (lo, hi, root)
LUG = []
for sx in (1, -1):
    lug = tk.rbox('lug', (2.6, 4.6, 5.0), centre=(sx * 15.6, 1.8, ZB + 14.0), bevel=0.8, segs=2)
    tk.rotate(lug, -sx * 30, 'Y', (sx * 15.6, 1.8, ZB + 14.0))
    LUG.append(cx.low(lug, 'lug', 30, lo=0, hi=1, region='metal'))
arch = []
for i in range(15):
    t = i / 14
    a = math.pi * t
    arch.append((-15.6 * math.cos(a) * (1 + 0.04 * math.sin(a)), 1.8, ZB + 15.4 + 18.6 * math.sin(a) ** 0.85))
bail = tk.tube('bail', arch, 0.85, n=6, cap0='round', cap1='round')
grip = tk.tube('grip', [arch[i] for i in range(4, 11)], [2.0, 2.3, 2.4, 2.4, 2.4, 2.3, 2.0], n=10, cap0='round', cap1='round')


def sc_grip(h):
    def f(V, N):  # the bakelite grip's finger ridges
        return -0.25 * (np.abs(np.sin(V[:, 0] * math.pi / 2.0)) ** 8)
    tk.push(h, f)


HANDLE = [cx.low(bail, 'bail', 80, lo=0, hi=1, region='metal'), cx.low(grip, 'grip', 110, lo=0, hi=2, sculpt=sc_grip, region='grip')]

# ------------------------------------------------------------------ the trivet legs (with toenails) and a little wire tail
LEGS = []
for x, y in ((9.2, -8.0), (-9.2, -8.0), (9.6, 8.6), (-9.6, 8.6)):
    lg = tk.loft('leg', [{'c': (x, y, ZB + 3.0), 'w': 7.2, 'h': 3.5, 'e': 2.2}, {'c': (x * 1.02, y * 1.02, 2.2), 'w': 7.0, 'h': 3.4, 'e': 2.2},
                         {'c': (x * 1.03, y * 1.03, 0.0), 'w': 7.6, 'h': 3.7, 'e': 2.4}], n=10, up=(0, -1, 0), cap0='round', cap1='flat', capd=1.2)

    def sc_leg(h, x=x, y=y):
        def f(V, N):  # three toenails round the front of each foot
            d = np.zeros(len(V))
            for a in (-35, 0, 35):
                c = (x * 1.03 + 3.3 * math.sin(math.radians(a)), y * 1.03 - 3.3 * math.cos(math.radians(a)), 1.0)
                d += tk.bump(V, c, 1.4, 0.35)
            return d
        tk.push(h, f)
    LEGS.append(cx.low(lg, 'leg', 44, lo=1, hi=2, sculpt=sc_leg, region=('leg', [('nail', lambda C, N: (C[:, 2] < 2.2) & (N[:, 2] < 0.5))])))
tail = tk.tube('tail', [(0, 16.8, ZB + 6.0), (0.4, 18.8, ZB + 5.0), (1.2, 20.0, ZB + 2.6), (2.2, 20.2, ZB + 1.2)], [1.0, 0.8, 0.7, 0.9], n=6)
TAIL = cx.low(tail, 'tail', 40, lo=0, hi=1, region=('metal', [('tuft', lambda C, N: C[:, 2] < ZB + 1.9)]))

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body_lo] + [l[0] for l in LUG] + [l[0] for l in LEGS] + [TAIL[0]] + [h[0] for h in HANDLE], 'body'),
       [body_hi] + [l[1] for l in LUG] + [l[1] for l in LEGS] + [TAIL[1]] + [h[1] for h in HANDLE], bone='root', kind='gloss')
F.part('lid', tk.join([l[0] for l in LID], 'lid'), [l[1] for l in LID], bone='lid', kind='gloss')
F.part('trunk', trunk_lo, [trunk_hi], bone='trunk', kind='gloss')
F.part('flap', tk.join([f[0] for f in FLAP], 'flap'), [f[1] for f in FLAP], bone='flap', kind='metal', uvw=0.8)
for nm, (lo, hi, root) in EARS.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('lid', (0, 0, ZT), parent='root')
    R.bone('trunk', SP, parent='root')
    R.bone('flap', FLAP_P, parent='trunk')
    for nm, (lo, hi, root) in EARS.items():
        R.bone(nm, root, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'lid', 'trunk', 'flap', 'ear_l', 'ear_r']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # it simmers: a rocking, rumbling body and a lid that rattles faster and faster
        for i, f in enumerate((4, 9, 13, 17, 20, 23, 26, 29)):
            k('root', f, rot=('Y', 2.2 if i % 2 else -2.2))
            k('lid', f, move=(0, 0, 0.9 if i % 2 else 0.2), rot=('Y', 4 if i % 2 else -3))
        k('root', 32)
        k('lid', 32)
        # the ears flap out, the trunk lifts, the whistle flap flips open: toot
        for nm, sx in (('ear_l', 1), ('ear_r', -1)):
            k(nm, 26)
            k(nm, 33, rot=('Z', -sx * 30), ease='BACK')
            k(nm, 38, rot=('Z', -sx * 8))
            k(nm, 43, rot=('Z', -sx * 32))
            k(nm, 48, rot=('Z', -sx * 8))
            k(nm, 53, rot=('Z', -sx * 30))
            k(nm, 64, rot=('Z', -sx * 30))
            k(nm, 72, ease='BACK')
        k('trunk', 28)
        k('trunk', 36, rot=('X', -22), ease='BACK')
        k('trunk', 62, rot=('X', -22))
        k('trunk', 72, ease='BACK')
        k('flap', 34)
        k('flap', 38, rot=('X', -75), ease='BACK')
        k('flap', 60, rot=('X', -75))
        k('flap', 64)
        k('lid', 36)
        for i, f in enumerate(range(38, 60, 3)):
            k('lid', f, move=(0, 0, 1.0 if i % 2 else 0.3))
        k('lid', 62)
        k('root', 36)
        k('root', 40, move=(0, 0, 1.6), rot=('X', -3))
        k('root', 46, ease='BOUNCE')
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)  # (moving parts: little baked occlusion)
    GREY = pt.ramp('#aebcc8', 7, shift=0.07)
    air = 0.15 * tk.smoothstep(ZB + 8, ZT, Z) - 0.25 * tk.smoothstep(ZB + 6, ZB, Z) - 0.1 * tk.smoothstep(0, 16, Yc)
    P.fill('enamel', GREY, tone=sh, base=air)
    P.fill(P.region('enamel') & (P.part == [p.name for p in F.parts].index('trunk')), GREY, tone=free, base=0.05)
    P.fill(P.region('enamel') & np.isin(P.part, [i for i, p in enumerate(F.parts) if p.name.startswith('ear')]), GREY, tone=free, base=0.05)
    INK_BLACK = pt.ramp('#2c2f3a', 6, shift=0.05)
    P.fill('rim', INK_BLACK, tone=sh, base=0.25)
    P.fill('dark', INK_BLACK, tone=sh, base=-0.2)
    P.fill('inner', pt.ramp('#e7a7a6', 6, shift=0.05), tone=free, base=0.05)
    P.fill('cap', pt.ramp('#d4423a', 7, shift=0.06), tone=sh, base=0.1)
    METAL = pt.ramp('#b4bcc2', 7, dark=0.7, light=0.7, shift=0.05)
    P.fill('metal', METAL, tone=sh * 1.4, base=0.1)
    P.fill('grip', INK_BLACK, tone=sh, base=0.3)
    P.fill('leg', INK_BLACK, tone=sh, base=0.2)
    P.fill('nail', pt.ramp('#efe4c8', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('tuft', INK_BLACK, tone=sh, base=0.1)
    # the camellia decal on each flank: five red petals round a yellow heart, two leaves
    for sx in (1, -1):
        U, V = Yc - 3.0, Z - (ZB + 7.4)
        side = P.region('enamel') & (X * sx > 12) & (P.part == 0)
        r, a = np.hypot(U, V), np.arctan2(V, U)
        petal = r < 3.4 * (0.72 + 0.28 * np.abs(np.cos(a * 2.5)))
        P.tint(side & petal, pt.ramp('#d03a40', 6, shift=0.06), sh + 0.1)
        P.tint(side & petal & (np.abs(np.cos(a * 2.5)) < 0.12) & (r > 1.2), pt.ramp('#a42630', 6, shift=0.06), sh)
        P.flat(side & (r < 1.0), '#f2c84a')
        for lu, lv, la in ((4.2, -1.8, -25), (-3.8, -2.4, 205)):
            cu, cv = U - lu, V - lv
            cr, sr = math.cos(math.radians(la)), math.sin(math.radians(la))
            uu, vv = cu * cr + cv * sr, -cu * sr + cv * cr
            P.tint(side & ((uu / 2.3) ** 2 + (vv / 1.0) ** 2 < 1) & ~petal, pt.ramp('#3f7a46', 6, shift=0.06), sh)
    # the face, drawn on by hand: two little ink dots set wide above the trunk, a small upturned smile beside it
    fc = face.Face(P, c=(0, -16.6, 13.6), axis=(0, -1, 0.15), where=P.region('enamel') & (P.part == 0), seed=11)
    fc.blush(13.0, -2.4, rx=2.0, ry=1.1)
    fc.eyes(spread=12.0, size=0.85, dy=1.4)
    fc.mouth('upturn', w=2.8, dy=-3.6, du=5.6, side=1)
    P.lines(['enamel'], ['rim', 'dark', 'cap', 'metal', 'grip', 'inner'], step=2)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('trunk', 'body'), ('flap', 'trunk'), ('lid', 'body')]),
       cams=[((70, -80, 52), (0, -4, 16)), ((-66, 72, 48), (0, 0, 16))], fold=(0, 20, 40, 56))
