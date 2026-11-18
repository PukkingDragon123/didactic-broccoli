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


def ruff(X, Y, Z):
    """The chest ruff's lower edge, a U round the front from shoulder to shoulder hung with flame-tufts: (t, tri), t the
    height above the edge, tri 1 at a tuft's centre line and 0 between tufts (nine across the front)."""
    u = np.clip(np.arctan2(X, -(Y - 0.6)) / (math.pi / 2), -1.2, 1.2)
    t = Z - (PZ + 10.6 + 6.4 * u ** 2)
    tri = 1 - np.abs(np.mod(u * 4.5 + 0.5, 1.0) - 0.5) * 2
    return t, tri, np.abs(u) < 1.05


def sc_body(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 8.2, 5.0, PZ + 5.0), 6.5, 1.3, sharp=1.4)          # the haunches
            d += tk.bump(V, (sx * 4.6, -2.0, PZ + 17.0), 3.6, 0.4)                   # shoulders
        # the chest ruff: carved flame-tufts down the front
        front = tk.smoothstep(-0.3, -0.8, N[:, 1])
        tuft = np.cos(V[:, 0] * 1.5) ** 2 * tk.smoothstep(PZ + 9, PZ + 13, V[:, 2]) * tk.smoothstep(PZ + 21, PZ + 18, V[:, 2])
        d += 0.6 * front * tuft * (0.55 + 0.45 * np.cos(V[:, 2] * 1.7 + V[:, 0] * 0.8)) ** 2  # carved fur tufts
        # the ruff's edge: a raised scalloped hem of flame-tufts hanging over the chest, shoulder to shoulder
        t, tri, on = ruff(V[:, 0], V[:, 1], V[:, 2])
        hem = (t < 0.8) & (t > -2.4 * tri ** 1.3)
        d += 0.55 * hem * on * tk.smoothstep(0.2, -0.3, N[:, 1])
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
NECK = (0.0, -1.8, PZ + 24.4)
HZ = PZ + 28.6
HEAD = [(0, 2.8, HZ + 0.3), (0, 0.5, HZ + 0.3), (0, -2.8, HZ), (0, -6.0, HZ - 0.9), (0, -9.0, HZ - 1.3), (0, -12.0, HZ - 1.6),
        (0, -14.2, HZ - 1.7)]


def sc_head(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 7.0, -1.5, HZ - 3.2), 4.0, 1.0)       # cheek ruffs
            d += tk.bump(V, (sx * 3.0, -5.0, HZ + 3.0), 2.4, 0.35)      # brows
        d += tk.bump(V, (0, -14.4, HZ - 1.4), 1.6, 0.5)                  # the nose
        # the upper lip: a ridge along the snout's lower edge, a groove under it where the jaw meets it
        lipz = HZ - 2.7 - 0.05 * (V[:, 1] + 6)
        sn = (V[:, 1] < -5.5) & (np.abs(V[:, 0]) > 0.8)
        d += 0.4 * np.exp(-((V[:, 2] - lipz - 0.35) / 0.35) ** 2) * sn - 0.35 * np.exp(-((V[:, 2] - lipz + 0.3) / 0.25) ** 2) * sn
        # the mouth line along each side of the snout
        d -= 0.3 * np.exp(-((V[:, 2] - (HZ - 2.7 + 0.1 * (V[:, 1] + 8))) / 0.3) ** 2) * (V[:, 1] < -6.0) * (np.abs(V[:, 0]) > 1.0)
        return d
    tk.push(h, f)


head_lo, head_hi = ak.spine('head', HEAD, [8.6, 14.0, 13.6, 8.6, 6.2, 5.0, 3.4], [4.9, 6.6, 6.0, 3.4, 2.4, 1.9, 1.4],
                            [4.6, 5.2, 4.0, 2.2, 1.7, 1.4, 1.0], e=2.2, n=14, up=(0, 0, 1), tris=300, sculpt=sc_head)
EARS = []
for sx in (1, -1):
    root = (sx * 4.4, -0.2, HZ + 4.6)
    lo, hi, r_, tip = tt.corner('ear', root, -90, L=8.2, W=6.6, a0=88, a1=72, cup=1.1, ripple=0.0, tris=40, thick=1.3,
                                root_r=0.0, root_z=0.0, shape=0.95, power=1.3, region='ear')
    for o in (lo, hi):
        tk.rotate(o, sx * 14, 'Y', pivot=root)
    EARS.append((lo, hi))

# the lower jaw (it opens to howl), with a row of small teeth sculpted along it
JAW = (0.0, -3.8, HZ - 2.6)
jaw_lo, jaw_hi = ak.spine('jaw', [(0, -3.6, HZ - 3.0), (0, -8.2, HZ - 3.4), (0, -12.8, HZ - 3.3)], [8.0, 5.0, 3.0], [1.2, 0.9, 0.7],
                          [1.7, 1.3, 0.9], n=10, up=(0, 0, 1), tris=60, cap0='round', cap1='round')
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
for t in (-1.7, 1.7):
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
tpts = [TAIL0, (7.8, 11.6, PZ + 2.4), (11.6, 6.6, PZ + 2.3), (12.2, 0.0, PZ + 2.2), (10.8, -6.6, PZ + 2.2), (8.0, -11.0, PZ + 2.0)]


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
F.part('body', tk.decimate(tk.join([body_lo] + legs_lo + [rope_lo] + SH_LO, 'body'), 800), body_hi + legs_hi + [rope_hi] + SH_HI, sharp=70, kind='gloss')
F.part('head', tk.join([head_lo] + [e[0] for e in EARS], 'head'), head_hi + [e[1] for e in EARS], bone='head', kind='gloss')
F.part('jaw', jaw_lo, jaw_hi, bone='jaw', kind='gloss')
F.part('tail', tail_lo, tail_hi, bone='tail', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', NECK, parent='root')
    R.bone('jaw', JAW, parent='head')
    R.bone('tail', (0.0, 1.5, PZ + 2.2), parent='root')  # (it wags round the body's curve)
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'jaw', 'tail']
        for b in bones:
            k(b, 0)
        # 0-8 it draws a breath (head down a touch), then lifts its head and howls: the jaw drops, holds, wavers
        k('head', 6, rot=('X', 6))
        k('head', 16, rot=('X', -15), ease='BACK')
        k('jaw', 12)
        k('jaw', 18, rot=('X', 24))
        for i, f in enumerate((24, 30, 36, 42)):
            k('jaw', f, rot=('X', 24 - (4 if i % 2 else 0)))
            k('head', f, rot=[('X', -15 - (2 if i % 2 else 0)), ('Y', 3 if i % 2 else -3)])
        k('jaw', 50, rot=('X', 0), ease='BACK')
        k('head', 50, rot=('X', -14))
        k('head', 60, rot=('X', 0), ease='BACK')
        # one wag of the tail as it settles
        k('tail', 50)
        k('tail', 55, rot=('Z', -6))
        k('tail', 60, rot=('Z', 3))
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
    ak.lacquer(P, ('body', 'tail', 'ear'))
    # gold leaf: the ear rims and linings, the ruff's carved tufts (their crests only), a band round the tail's tip
    P.fill(P.region('ear') & ((P.on[:, :, 1] < -0.2) | (P.cav > 0.53)), GOLD, tone=sh, base=0.1)
    # (the ruff's hem: one gold flame-tuft every ninth of the way round the chest, each a band with a point hanging down)
    t, tri, on = ruff(X, Yc, Z)
    hem = P.region('body') & on & (P.on[:, :, 1] < 0.2) & (t < 0.7) & (t > -2.2 * tri ** 1.3)
    P.fill(hem, GOLD, tone=sh, base=0.1)
    ak.gold_bands(P, P.region('tail'), Yc + 7.0, 1.6)
    P.fill(P.region('tail') & (Yc < -8.5), GOLD, tone=sh, base=0.1)
    P.fill('rope', pt.ramp('#d8c48a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('shide', pt.ramp('#f3efe6', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('plinth', VERM, tone=sh, base=0.0)
    ak.lacquer(P, ('jaw',))
    P.fill(P.region('jaw') & (P.on[:, :, 2] > 0.5), pt.ramp('#b8484a', 5, shift=0.05), tone=sh, base=0.05)
    # the face in cream ink: small fierce dots under angry brows
    import face
    fc = face.Face(P, c=(0.0, -6.8, HZ + 0.7), axis=(0, -1, 0.5), where=P.region('body'), seed=91, ink='#efe4c8')
    fc.eyes('tiny', spread=6.6, size=0.75, dy=0.5)
    fc.brows('angry', spread=7.0, dy=2.2, w=2.4, weight=0.45)
    sn = face.Face(P, c=(0.0, -14.4, HZ - 1.6), axis=(0, -1, 0.15), where=P.region('body'), seed=92, ink='#efe4c8')
    sn.nose('button', dy=0.3, size=0.85, col='#d9a640')
    sn.snout_mouth('Y', dy=-0.6, w=1.8)
    sn.fangs(dy=-1.25, gap=1.8, size=0.55)
    P.lines(['rope', 'shide'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'plinth'), ('jaw', 'head')],
       cam=((70, -96, 62), (0, 0, 20)), fold=(0, 15, 25, 52), frames=74)
