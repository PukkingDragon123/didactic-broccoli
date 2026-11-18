"""三峯オオカミ Mitsumine Wolf: series otsukai, The Gods' Messengers (concepts_B.md).

The mountain shrine's guardian wolf as a black-lacquer idol: sitting on its vermilion step with its chest ruff
thrown out, a sacred shimenawa rope round its neck hung with white paper shide, a long jaw, short ears and its
tail curled round its forepaws, the ruff and the tail's tip in gold leaf.
Gimmick: it lifts its head and howls, jaw open, then gives one wag of its tail.

    tools/blender.sh art/blender/toys/otsukai/ookami.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('otsukai', 'ookami')

# ------------------------------------------------------------------ the shrine step
base_lo, base_hi, PZ = ak.plinth('plinth', [(24.0, 30.0, 3.2), (20.0, 25.5, 2.6)])

# ------------------------------------------------------------------ the body: sitting upright, haunches wide
BODY = [(PZ + 0.0, 3.0, 17.0, 9.0, 10.0, 2.6), (PZ + 2.6, 2.8, 18.0, 9.4, 10.6, 2.6), (PZ + 6.6, 2.0, 16.0, 8.6, 9.2, 2.4),
        (PZ + 11.0, 0.6, 12.8, 7.6, 6.8, 2.3), (PZ + 15.5, -0.8, 10.8, 6.8, 5.2, 2.2), (PZ + 19.5, -1.8, 9.0, 5.6, 4.4, 2.1),
        (PZ + 22.8, -2.4, 7.6, 4.8, 3.8, 2.0)]


def sc_body(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 8.2, 5.0, PZ + 5.0), 6.5, 1.3, sharp=1.4)          # the haunches
            d += tk.bump(V, (sx * 4.6, -2.0, PZ + 17.0), 3.6, 0.4)                   # shoulders
        # the chest ruff: carved flame-tufts down the front
        front = tk.smoothstep(-0.3, -0.8, N[:, 1])
        tuft = np.cos(V[:, 0] * 1.5) ** 2 * tk.smoothstep(PZ + 9, PZ + 13, V[:, 2]) * tk.smoothstep(PZ + 21, PZ + 18, V[:, 2])
        d += 0.45 * front * tuft
        d -= 0.3 * np.exp(-(V[:, 0] / 0.5) ** 2) * tk.smoothstep(0.3, 0.8, N[:, 1])   # the spine groove down the back
        return d
    tk.push(h, f)


body_lo, body_hi = ak.stack('body', BODY, n=18, tris=380, sculpt=sc_body)

# front legs and paws, hind paws
legs_lo, legs_hi = [], []
for sx in (1, -1):
    pts = [(sx * 3.3, -4.4, PZ + 13.5), (sx * 3.4, -5.6, PZ + 9.0), (sx * 3.5, -6.6, PZ + 4.6), (sx * 3.6, -7.0, PZ + 2.2)]
    lo, hi = ak.spine('leg', pts, [5.0, 4.4, 4.0, 3.9], [2.5, 2.2, 2.0, 1.95], n=10, up=(0, -1, 0), tris=60, cap0='round', cap1='flat')
    legs_lo.append(lo)
    legs_hi += hi
    for (px, py, pw, pd) in ((sx * 3.7, -8.2, 4.4, 5.6), (sx * 7.4, -3.6, 4.2, 6.2)):
        paw = tk.lathe('paw', [(0, 0), (pw / 2 * 0.9, 0.0), (pw / 2, 0.9), (pw / 2 * 0.75, 1.9), (0, 2.3)], n=10, centre=(px, py, PZ))
        tk.scale(paw, (1.0, pd / pw, 1.0), pivot=(px, py, PZ))
        ph = tk.copy(paw, 'paw_hi')
        tk.subsurf(ph, 2)
        tk.push(ph, lambda V, N, px=px, py=py: -0.25 * (np.abs(np.cos((V[:, 0] - px) * 2.2)) < 0.3) * (V[:, 1] < py - 1.0))  # toes
        tk.decimate(paw, 30)
        legs_lo.append(paw)
        legs_hi.append(ph)

# ------------------------------------------------------------------ the head: cheeks, long snout, tall ears
HZ = PZ + 27.6
NECK = (0.0, -2.4, PZ + 22.6)
HZ = PZ + 28.6
HEAD = [(0, 2.8, HZ + 0.3), (0, 0.5, HZ + 0.3), (0, -2.8, HZ), (0, -5.8, HZ - 0.8), (0, -8.4, HZ - 1.1), (0, -10.6, HZ - 1.3),
        (0, -12.2, HZ - 1.4)]


def sc_head(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 7.0, -1.5, HZ - 3.2), 4.0, 1.0)       # cheek ruffs
            d += tk.bump(V, (sx * 3.0, -5.0, HZ + 3.0), 2.4, 0.35)      # brows
        d += tk.bump(V, (0, -12.4, HZ - 1.2), 1.5, 0.5)                  # the nose
        # the mouth line along each side of the snout
        d -= 0.3 * np.exp(-((V[:, 2] - (HZ - 2.7 + 0.1 * (V[:, 1] + 8))) / 0.3) ** 2) * (V[:, 1] < -6.0) * (np.abs(V[:, 0]) > 1.0)
        return d
    tk.push(h, f)


head_lo, head_hi = ak.spine('head', HEAD, [8.6, 14.0, 14.0, 9.4, 6.6, 5.2, 3.4], [4.9, 6.6, 6.2, 3.6, 2.4, 1.8, 1.3],
                            [4.6, 5.2, 4.0, 2.0, 1.4, 1.1, 0.9], e=2.2, n=14, up=(0, 0, 1), tris=300, sculpt=sc_head)
EARS = []
for sx in (1, -1):
    root = (sx * 4.4, -0.2, HZ + 4.6)
    lo, hi, r_, tip = tt.corner('ear', root, -90, L=6.8, W=7.0, a0=88, a1=72, cup=1.1, ripple=0.0, tris=40, thick=1.3,
                                root_r=0.0, root_z=0.0, shape=0.7, power=1.3, region='ear')
    for o in (lo, hi):
        tk.rotate(o, sx * 14, 'Y', pivot=root)
    EARS.append((lo, hi))

# the lower jaw (it opens to howl), with a row of small teeth sculpted along it
JAW = (0.0, -3.8, HZ - 2.6)
jaw_lo, jaw_hi = ak.spine('jaw', [(0, -3.6, HZ - 2.9), (0, -7.0, HZ - 3.2), (0, -10.6, HZ - 3.0)], [8.0, 5.6, 3.4], [1.3, 1.0, 0.8],
                          [1.8, 1.4, 1.0], n=10, up=(0, 0, 1), tris=60, cap0='round', cap1='round')
# the shimenawa: a thick twisted straw rope round its neck, and four zig-zag paper shide hanging from it
NR = []
for t in np.linspace(0, 2 * math.pi, 40, endpoint=False):
    cy, w, ht, hb = ak.stack_at(BODY, PZ + 20.8)
    NR.append((math.cos(t) * (w / 2 + 0.9), cy - math.sin(t) * ((ht if math.sin(t) > 0 else hb) + 0.9), PZ + 20.8 - 0.9 * math.sin(t) ** 2 * (math.sin(t) > 0)))
rope_lo = tk.tube('rope', NR[::4], 1.2, n=5, closed=True)
rope_hi = tk.tube('rope_hi', NR, 1.25, n=12, closed=True)
tt.twist_cord(rope_hi, 2.4, strands=2, pitch=3.0)
tk.set_region(rope_hi, 'rope')
SH_LO, SH_HI = [], []
ZZ = [(0.0, 0.0), (1.8, 0.0), (1.8, -2.0), (0.4, -2.0), (0.4, -4.0), (2.0, -4.0), (2.0, -6.0), (0.9, -6.0), (0.9, -7.6),
      (-0.4, -7.6), (-0.4, -5.6), (0.8, -5.6), (0.8, -4.4), (-0.8, -4.4), (-0.8, -2.4), (0.4, -2.4), (0.4, -0.6), (0.0, -0.6)]
for t in (-2.2, -1.0, 1.0, 2.2):
    cy, w, ht, hb = ak.stack_at(BODY, PZ + 20.0)
    x = t * 1.9
    y = cy - ht * math.sqrt(max(0.0, 1 - (x / (w / 2 + 0.5)) ** 2)) - 1.4
    for nm_, bev, lst in (('shide', 0.0, SH_LO), ('shide_hi', 0.1, SH_HI)):
        o = tk.slab(nm_, ZZ, 0.35, plane='XZ', bevel=bev, segs=1 if bev else 0)
        tk.rotate(o, -18, 'X')
        tk.move(o, (x - 0.6, y, PZ + 20.2))
        lst.append(o)
for o in SH_HI:
    tk.set_region(o, 'shide')
# ------------------------------------------------------------------ the tail: raised behind it like a flame, the jewel on its tip
TAIL0 = (2.0, 9.6, PZ + 2.4)
tpts = [TAIL0, (6.4, 10.4, PZ + 2.2), (9.4, 6.0, PZ + 2.2), (9.8, 0.0, PZ + 2.2), (8.2, -6.4, PZ + 2.2), (5.8, -10.0, PZ + 2.0)]


def sc_tail(h):
    def f(V, N):
        # carved flame-locks running up the tail
        ph = V[:, 2] * 0.9 + np.arctan2(V[:, 1] - 11, V[:, 0] - 2.5) * 3.0
        return 0.32 * np.cos(ph) ** 3
    tk.push(h, f)


tail_lo, tail_hi = ak.spine('tail', tpts, [3.6, 5.2, 5.8, 5.4, 4.4, 1.8], [1.6, 2.2, 2.4, 2.3, 1.9, 0.8], e=2.1, n=12,
                            up=(0, 0, 1), tris=150, sculpt=sc_tail, region='tail', cap0='round', cap1='point')
# ------------------------------------------------------------------ parts
F.part('plinth', base_lo, base_hi)
F.part('body', tk.join([body_lo] + legs_lo + [rope_lo] + SH_LO, 'body'), body_hi + legs_hi + [rope_hi] + SH_HI, sharp=70)
F.part('head', tk.join([head_lo] + [e[0] for e in EARS], 'head'), head_hi + [e[1] for e in EARS], bone='head')
F.part('jaw', jaw_lo, jaw_hi, bone='jaw')
F.part('tail', tail_lo, tail_hi, bone='tail')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', NECK, parent='root')
    R.bone('jaw', JAW, parent='head')
    R.bone('tail', TAIL0, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'jaw', 'tail']
        for b in bones:
            k(b, 0)
        # 0-8 it draws a breath (head down a touch), then lifts its head and howls: the jaw drops, holds, wavers
        k('head', 6, rot=('X', 6))
        k('head', 16, rot=('X', -26), ease='BACK')
        k('jaw', 12)
        k('jaw', 18, rot=('X', 24))
        for i, f in enumerate((24, 30, 36, 42)):
            k('jaw', f, rot=('X', 24 - (4 if i % 2 else 0)))
            k('head', f, rot=[('X', -26 - (2 if i % 2 else 0)), ('Y', 3 if i % 2 else -3)])
        k('jaw', 50, rot=('X', 0), ease='BACK')
        k('head', 50, rot=('X', -24))
        k('head', 60, rot=('X', 0), ease='BACK')
        # one wag of the tail as it settles
        k('tail', 50)
        k('tail', 55, rot=('Z', 7))
        k('tail', 60, rot=('Z', -4))
        k('tail', 66)
        for b in bones:
            k(b, 72)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.2)
    LAC = pt.ramp('#26222b', 7, shift=0.08, light=0.55)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    VERM = pt.ramp('#cc4a32', 7, shift=0.06)
    for r in ('body', 'tail'):
        P.fill(r, LAC, tone=sh * 0.55, base=0.08)
    P.fill('ear', LAC, tone=sh * 0.55, base=0.08)
    # gold leaf: the ear linings, the chest ruff's tufts, the tail's tip
    ear_in = P.region('ear') & (P.on[:, :, 1] < -0.2)
    P.fill(ear_in, GOLD, tone=sh, base=0.1)
    ruff = P.region('body') & (Yc < -3.0) & (Z > PZ + 10.0) & (Z < PZ + 19.6) & (np.abs(X) < 4.6 - 0.15 * (Z - PZ - 10))
    P.fill(ruff, GOLD, tone=sh, base=0.08)
    P.fill(P.region('tail') & (Yc < -5.0), GOLD, tone=sh, base=0.1)
    P.fill('rope', pt.ramp('#d8c48a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('shide', pt.ramp('#f3efe6', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('plinth', VERM, tone=sh, base=0.0)
    P.fill('head', LAC, tone=sh * 0.55, base=0.08)
    P.fill('jaw', LAC, tone=sh * 0.55, base=0.08)
    P.fill(P.region('jaw') & (P.on[:, :, 2] > 0.5), pt.ramp('#b8484a', 5, shift=0.05), tone=sh, base=0.05)
    # the face in cream ink: small fierce dots under angry brows
    import face
    fc = face.Face(P, c=(0.0, -6.8, HZ + 0.7), axis=(0, -1, 0.5), where=P.region('body'), seed=91, ink='#efe4c8')
    fc.eyes('tiny', spread=6.6, size=0.75, dy=0.5)
    fc.brows('angry', spread=7.0, dy=2.2, w=2.4, weight=0.45)
    P.lines(['rope', 'shide'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'plinth'), ('jaw', 'head'), ('tail', 'body')],
       cam=((70, -96, 62), (0, 0, 20)), fold=(0, 15, 25, 52), frames=74)
