"""ミシンサギ Sewing Heron: a Shōwa sewing-machine head that is a grey heron (series kaden, concepts_C.md).

The machine's gooseneck arm is the heron's crooked neck, the needle head is its head with the spool pin's thread
trailing back as its black plume, the needle bar is the dagger beak, the hand wheel is its wing, the pillar is its
two legs and the bed is the riverbank, with a fish-print cloth under the needle. Dove-grey enamel with gold reed
decals. Built facing +x (a heron in profile) and turned a quarter toward the viewer.
Gimmick: the hand wheel spins and the needle-beak stabs, stabs, stabs, then the neck draws back for one big strike
at the fish on the cloth, and it lifts its head, pleased.

    tools/blender.sh art/blender/toys/kaden/sagi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kaden', 'sagi')

TURN = -15.0                      # the whole figure turns this much about z (the beak toward the viewer)
BZ = 4.2                          # the bed's top
CZ = BZ + 0.7                     # the cloth's top
CHEST = (1.0, 0, 22.0)            # the neck's pivot
HEAD = (16.0, 0, 32.6)            # the needle head's centre
BEAK_DIR = np.array((math.cos(math.radians(-76)), 0, math.sin(math.radians(-76))))
BEAK_ROOT = np.array((17.6, 0, 29.4))
BEAK_LEN = 19.0
WHEEL = (-7.4, -6.0, 21.0)


def T(p):
    """Figure space from the build frame (the quarter turn)."""
    a = math.radians(TURN)
    x, y, z = p
    return (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a), z)


def Tv(v):
    return T(v)


def local(X, Yc):
    """The build frame from figure space (for paint fields)."""
    a = math.radians(-TURN)
    return X * math.cos(a) - Yc * math.sin(a), X * math.sin(a) + Yc * math.cos(a)


# ------------------------------------------------------------------ the bed (the riverbank) and the fish-print cloth
bed = tk.rbox('bed', (44.0, 19.0, BZ), centre=(5.0, 0, BZ / 2), bevel=1.4, segs=2)
bed_lo, bed_hi = cx.low(bed, 'bed', 110, lo=0, hi=1, region='bed')
plate = tk.rbox('nplate', (6.0, 5.0, 0.6), centre=(BEAK_ROOT[0] + BEAK_DIR[0] * BEAK_LEN, 0, BZ + 0.2), bevel=0.25, segs=1)
plate_lo, plate_hi = cx.low(plate, 'nplate', 24, lo=0, hi=1, region='chrome')
cloth = tk.slab('cloth', [(-6.5, -8.0), (6.0, -8.6), (7.2, 7.6), (-7.0, 8.4)], 0.8, plane='XY', at=BZ + 0.35, bevel=0.3, segs=1)
tk.move(cloth, (BEAK_ROOT[0] + BEAK_DIR[0] * BEAK_LEN + 1.0, 0, 0))
tk.subsurf(cloth, 1)


def sc_cloth(h):
    def f(V, N):  # soft folds
        return 0.3 * np.sin(V[:, 1] * 0.9 + V[:, 0] * 0.3) * (N[:, 2] > 0.5)
    tk.push(h, f)


cloth_lo, cloth_hi = cx.low(cloth, 'cloth', 70, lo=0, hi=2, sculpt=sc_cloth, region='cloth')

# ------------------------------------------------------------------ legs (the pillar) with their backward knees, and feet
LEGS = []
for sy in (2.6, -2.6):
    lg = tk.tube('leg', [(-6.0, sy, BZ + 0.6), (-6.4, sy, 8.0), (-7.6, sy * 0.95, 12.6), (-5.0, sy * 0.85, 16.4), (-4.2, sy * 0.8, 19.6)],
                 [1.5, 1.4, 1.75, 1.55, 2.0], n=8, cap0='round', cap1='round')
    LEGS.append(cx.low(lg, 'leg', 56, lo=1, hi=2, region='leg'))
    for a in (-30, 0, 30, 180):
        ln = 2.6 if a == 180 else 4.4
        d = (math.cos(math.radians(a)), math.sin(math.radians(a)))
        toe = tk.tube('toe', [(-6.0, sy, BZ + 0.8), (-6.0 + d[0] * ln * 0.6, sy + d[1] * ln * 0.6, BZ + 0.7), (-6.0 + d[0] * ln, sy + d[1] * ln, BZ + 0.5)],
                      [0.9, 0.75, 0.5], n=6, cap0='round', cap1='round')
        LEGS.append(cx.low(toe, 'toe', 16, lo=0, hi=1, region='leg'))

# ------------------------------------------------------------------ the body: the machine's arm end (a plump heron's back)
body = tk.loft('body', [{'c': (-17.5, 0, 19.4), 'w': 3.0, 'ht': 1.4, 'hb': 1.0, 'e': 2.2},     # the tail feathers
                        {'c': (-14.0, 0, 20.4), 'w': 8.6, 'ht': 4.0, 'hb': 3.6, 'e': 2.4},
                        {'c': (-8.0, 0, 21.4), 'w': 12.6, 'ht': 6.2, 'hb': 5.8, 'e': 3.0},
                        {'c': (-1.5, 0, 22.2), 'w': 12.4, 'ht': 6.4, 'hb': 6.0, 'e': 3.0},
                        {'c': (3.0, 0, 22.4), 'w': 9.4, 'ht': 5.4, 'hb': 5.4, 'e': 2.5}], n=16, up=(0, 0, 1), cap0='point', cap1='round', capd=2.0)


def sc_body(h):
    def f(V, N):
        # the folded wing's flight feathers along the side, the panel seam of the machine's arm cover
        side = np.abs(N[:, 1]) > 0.55
        u = V[:, 0] * 0.9 - V[:, 2] * 0.5
        d = -0.25 * (np.abs(np.sin(u * math.pi / 2.3)) ** 6) * side * (V[:, 0] < -9) * (V[:, 2] < 22.5)
        d -= 0.22 * tk.smoothstep(0.35, 0.0, np.abs(V[:, 2] - 25.4)) * (V[:, 0] > -12)
        return d
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 230, lo=1, hi=2, sculpt=sc_body, region='grey')

# the hand wheel: the wing's roundel (chrome rim, five spokes)
wheel = tk.lathe('wheel', [(0, -1.4), (5.0, -1.4), (5.4, -0.6), (5.4, 0.6), (4.9, 1.3), (2.0, 1.0), (1.4, 1.9), (0, 2.0)], n=20, axis='Y',
                 centre=(WHEEL[0], WHEEL[1] + 1.2, WHEEL[2]))
tk.scale(wheel, (1, -1, 1), (0, WHEEL[1] + 1.2, 0))
tk.fix_normals(wheel)


def sc_wheel(h):
    def f(V, N):  # the spokes stand proud of the dished web between them; the rim is knurled
        r, a = cx.polar(V[:, 0], V[:, 2], (WHEEL[0], WHEEL[2]))
        web = (r > 2.1) & (r < 4.4) & (N[:, 1] < -0.5)
        spoke = np.abs(np.mod(a, 72) - 36) > 28
        return np.where(web, np.where(spoke, 0.2, -0.45), 0.0) - 0.12 * (r > 5.0) * (np.abs(np.sin(np.radians(a) * 30)) > 0.7)
    tk.push(h, f)


wheel_lo, wheel_hi = cx.low(wheel, 'wheel', 120, lo=0, hi=2, sculpt=sc_wheel, region='chrome')

# ------------------------------------------------------------------ the gooseneck arm: the neck
neck_pts = [(-1.0, 0, 21.6), (2.6, 0, 23.0), (5.2, 0, 26.6), (6.0, 0, 30.4), (7.6, 0, 33.6), (10.6, 0, 35.0), (13.6, 0, 34.4), (15.6, 0, 33.0)]
neck = tk.tube('neck', neck_pts, [4.8, 4.5, 3.9, 3.6, 3.5, 3.5, 3.6, 3.7], n=12, e=2.7, cap0='round', cap1='round')
neck_lo, neck_hi = cx.low(neck, 'neck', 150, lo=1, hi=2, region=('white', [('stripe', lambda C, N: (N[:, 0] > 0.55) & (C[:, 2] < 31) & (np.abs(C[:, 1]) < 1.0))]))

# the needle head: the heron's head, with the spool on top and the black plume trailing back
head = tk.loft('head', [{'c': (HEAD[0] - 3.6, 0, HEAD[2] + 0.2), 'w': 6.6, 'ht': 3.6, 'hb': 3.6, 'e': 3.0},
                        {'c': (HEAD[0], 0, HEAD[2]), 'w': 7.6, 'ht': 4.2, 'hb': 4.4, 'e': 3.4},
                        {'c': (HEAD[0] + 2.8, 0, HEAD[2] - 0.8), 'w': 7.0, 'ht': 3.8, 'hb': 4.2, 'e': 3.2}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)
head_lo, head_hi = cx.low(head, 'head', 110, lo=1, hi=2, region=('white', [('crest', lambda C, N: (N[:, 2] > 0.55) | ((np.abs(N[:, 1]) > 0.5) & (C[:, 2] > HEAD[2] + 1.6)))]))
spool = tk.lathe('spool', [(0, 0), (2.0, 0), (2.0, 0.6), (1.5, 0.8), (1.5, 2.6), (2.0, 2.8), (2.0, 3.4), (0, 3.4)], n=12, centre=(HEAD[0] - 1.6, 0, HEAD[2] + 3.4))
spool_lo, spool_hi = cx.low(spool, 'spool', 50, lo=0, hi=1, region=('thread', [('wood', lambda C, N: (C[:, 2] < HEAD[2] + 4.3) | (C[:, 2] > HEAD[2] + 5.9))]))
PLUMES = []
for k, (dy, dz, ln) in enumerate(((0.7, 0.4, 13.0), (-0.7, -0.4, 11.0))):
    pl = tk.tube('plume', [(HEAD[0] - 3.0, dy, HEAD[2] + 2.4 + dz), (HEAD[0] - 3.0 - ln * 0.4, dy * 1.4, HEAD[2] + 2.8 + dz), (HEAD[0] - 3.0 - ln * 0.8, dy * 1.8, HEAD[2] + 2.2 + dz),
                         (HEAD[0] - 3.0 - ln, dy * 2.0, HEAD[2] + 1.0 + dz)], [1.1, 0.95, 0.65, 0.25], n=6, cap0='round', cap1='point')
    tk.scale(pl, (1, 1, 0.7), (0, 0, HEAD[2] + 2.4))
    PLUMES.append(cx.low(pl, 'plume', 28, lo=0, hi=1, region='plume'))

# the needle bar: the dagger beak (it stabs along its own axis), the chrome presser foot and needle at its tip
tip = BEAK_ROOT + BEAK_DIR * BEAK_LEN
beak = tk.tube('beak', [tuple(BEAK_ROOT - BEAK_DIR * 2.0), tuple(BEAK_ROOT + BEAK_DIR * BEAK_LEN * 0.35), tuple(BEAK_ROOT + BEAK_DIR * BEAK_LEN * 0.75),
                        tuple(tip - BEAK_DIR * 1.6)], [2.2, 1.9, 1.3, 0.75], n=8, cap0='round', cap1='round')
tk.scale(beak, (1, 0.8, 1), tuple(BEAK_ROOT))
beak_lo, beak_hi = cx.low(beak, 'beak', 60, lo=1, hi=2, region='beak')
needle = tk.tube('needle', [tuple(tip - BEAK_DIR * 2.6), tuple(tip - BEAK_DIR * 0.4), tuple(tip + BEAK_DIR * 0.3)], [0.55, 0.4, 0.15], n=6, cap0='round', cap1='point')
needle_lo, needle_hi = cx.low(needle, 'needle', 20, lo=0, hi=1, region='chrome')

# ------------------------------------------------------------------ the quarter turn, parts
ALL = [bed_lo, bed_hi, plate_lo, plate_hi, cloth_lo, cloth_hi, body_lo, body_hi, wheel_lo, wheel_hi, neck_lo, neck_hi, head_lo, head_hi,
       spool_lo, spool_hi, beak_lo, beak_hi, needle_lo, needle_hi] + [o for l in LEGS for o in l] + [o for p in PLUMES for o in p]
for o in ALL:
    tk.rotate(o, TURN, 'Z')
F.part('base', tk.join([bed_lo, plate_lo, cloth_lo] + [l[0] for l in LEGS] + [body_lo], 'base'), [bed_hi, plate_hi, cloth_hi] + [l[1] for l in LEGS] + [body_hi], bone='root')
F.part('wheel', wheel_lo, [wheel_hi], bone='wheel', kind='gloss')
F.part('neck', tk.join([neck_lo, head_lo, spool_lo] + [p[0] for p in PLUMES], 'neck'), [neck_hi, head_hi, spool_hi] + [p[1] for p in PLUMES], bone='neck')
F.part('beak', tk.join([beak_lo, needle_lo], 'beak'), [beak_hi, needle_hi], bone='beak')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
YAX = Tv((0, 1, 0))   # the build frame's y axis (the neck nods about it) in figure space


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('wheel', T((WHEEL[0], WHEEL[1], WHEEL[2])), parent='root')
    R.bone('neck', T(CHEST), parent='root')
    R.bone('beak', T(tuple(BEAK_ROOT)), parent='neck')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'wheel', 'neck', 'beak']
    stab = np.array(Tv(tuple(BEAK_DIR)))
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the hand wheel turns and keeps turning: the machine is running
        k('wheel', 2)
        for i in range(1, 9):
            k('wheel', 2 + i * 8, rot=[(YAX, -150 * i)], ease='LINEAR')
        k('wheel', 76, rot=[(YAX, -150 * 8 - 60)])
        # stab, stab, stab: the needle-beak along its own axis
        k('beak', 6)
        for f in range(8, 38, 5):
            k('beak', f, move=tuple(stab * 2.4), ease='LINEAR')
            k('beak', f + 3)
        # the neck draws back (anticipation), then the big strike at the fish, a hold, and the proud head-lift
        k('neck', 36)
        k('neck', 44, rot=[(YAX, 10)])
        k('neck', 48, rot=[(YAX, -5)], ease='BACK')
        k('beak', 44)
        k('beak', 48, move=tuple(stab * 3.0))
        k('beak', 56, move=tuple(stab * 3.0))
        k('beak', 60)
        k('neck', 56, rot=[(YAX, -5)])
        k('neck', 62, rot=[(YAX, 12)], ease='BACK')
        k('neck', 72, rot=[(YAX, 12)])
        k('root', 60)
        k('root', 63, move=(0, 0, 0.8))
        k('root', 67, ease='BOUNCE')
        for b in allb:
            k(b, 82)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    Lx, Ly = local(X, Yc)
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    GREY = pt.ramp('#a9b0b8', 7, shift=0.07)
    P.fill('grey', GREY, tone=sh, base=0.12 * tk.smoothstep(18, 28, Z) - 0.1 * tk.smoothstep(-6, -16, Lx))
    WHITE = pt.ramp('#ebe6da', 7, shift=0.06)
    P.fill('white', WHITE, tone=free, base=0.05)
    INK = pt.ramp('#2a2a30', 6, shift=0.05)
    P.fill('stripe', INK, tone=free, base=0.2)
    P.fill('crest', INK, tone=free, base=0.2)
    P.fill('plume', INK, tone=free, base=0.25)
    P.fill('beak', pt.ramp('#e2b340', 7, shift=0.07), tone=free, base=0.1)
    CH = pt.ramp('#bcc4ca', 7, dark=0.72, light=0.72, shift=0.05)
    P.fill('chrome', CH, tone=sh * 1.4, base=0.12)
    P.fill('leg', pt.ramp('#d8b25a', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('bed', pt.ramp('#3a4448', 7, shift=0.06), tone=sh, base=0.15)
    P.fill('thread', pt.ramp('#c8343c', 6, shift=0.06), tone=free, base=0.1)
    P.fill('wood', pt.ramp('#c9a06a', 6, shift=0.06), tone=free, base=0.1)
    # the wing's flight feathers: a darker grey on the lower back, printed in bands
    wing = P.region('grey') & (Lx < -8.5) & (Z < 22.5)
    P.tint(wing, pt.ramp('#7f8892', 6, shift=0.06), sh)
    # the hand wheel's spokes darker than the polished rim
    r, a = cx.polar(Lx, Z, (WHEEL[0], WHEEL[2]))
    web = P.region('chrome') & (P.part == 1) & (r > 2.1) & (r < 4.5) & (np.abs(np.mod(a, 72) - 36) <= 28)
    P.fill(web, GREY, tone=free * 0.6, base=-0.05)
    # gold decals: reeds on the body, the bed's gold edge line
    GOLD = '#d1a84a'
    side = P.region('grey') & (np.abs(on[:, :, 1] * math.cos(math.radians(TURN)) - on[:, :, 0] * math.sin(math.radians(TURN))) > 0.4)
    for x0, h in ((-3.4, 7.0), (-0.8, 5.4), (1.8, 6.2)):
        P.flat(side & (np.abs(Lx - x0 - 0.18 * (Z - 17.0)) < 0.4) & (Z > 17.0) & (Z < 17.0 + h), GOLD)
        P.flat(side & ((Lx - x0 - 0.18 * h - 0.3) ** 2 / 0.7 + (Z - 17.0 - h) ** 2 / 3.0 < 1), GOLD)
    bed = P.region('bed')
    P.flat(bed & (np.abs(Z - (BZ - 0.9)) < 0.22), GOLD)
    P.flat(bed & (on[:, :, 2] > 0.8) & ((np.abs(np.abs(Ly) - 8.2) < 0.25) | (np.abs(np.abs(Lx - 5.0) - 20.6) < 0.25)), GOLD)
    # the cloth: indigo with white fish (the heron's catch)
    cl = P.region('cloth')
    P.fill('cloth', pt.ramp('#34548a', 6, shift=0.06), tone=sh, base=0.1)
    cxl = BEAK_ROOT[0] + BEAK_DIR[0] * BEAK_LEN + 1.0
    for fx, fy, fr in ((cxl - 3.2, -3.6, 15), (cxl + 2.6, 1.0, -20), (cxl - 2.0, 4.6, 5), (cxl + 4.0, -5.2, 30)):
        cr, sr = math.cos(math.radians(fr)), math.sin(math.radians(fr))
        uu, vv = (Lx - fx) * cr + (Ly - fy) * sr, -(Lx - fx) * sr + (Ly - fy) * cr
        fish = ((uu / 1.6) ** 2 + (vv / 0.8) ** 2 < 1) | ((uu < -1.2) & (uu > -2.6) & (np.abs(vv) < (-1.2 - uu) * 0.7))
        P.flat(cl & fish, '#eef0ec')
        P.flat(cl & ((uu - 0.8) ** 2 + (vv - 0.15) ** 2 < 0.06), '#34548a')
    # the face, drawn on by hand: one ink dot each side of the head (a heron in profile) and the line of its gape
    for sy in (-1, 1):
        ax = Tv((0, sy, 0.15))
        fc = face.Face(P, c=T((HEAD[0] + 1.0, sy * 3.8, HEAD[2])), axis=ax, where=P.region('white') & (P.part == 2), seed=21 + sy)
        fc.dot(-sy * 0.4, 0.5, 0.62, 0.8, rot=8 * sy)
        fc.stroke([(-sy * 0.9, -2.7), (sy * 0.7, -2.0)], weight=0.38)
    P.lines(['grey'], ['white', 'chrome', 'leg', 'stripe'], step=2)
    P.lines(['white'], ['stripe', 'crest', 'beak'], step=1)
    P.lines(['bed'], ['cloth', 'chrome'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 83), skip=[('neck', 'base'), ('beak', 'neck'), ('wheel', 'base')]),
       cams=[((74, -78, 50), (2, 0, 18)), ((-60, 74, 44), (2, 0, 18))], fold=(0, 10, 46, 52, 66))
