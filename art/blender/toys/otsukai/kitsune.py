"""稲荷ギツネ Inari Fox: series otsukai, The Gods' Messengers (concepts_B.md).

The rice god's messenger as a sleek black-lacquer idol picked out in gold leaf: sitting bolt upright on its
vermilion shrine step, the granary key held crossways in its mouth, a red bib, tall ears lined in gold and its tail
raised behind it like a flame with the wish-jewel (hōju) on the tip.
Gimmick: it cocks its head, turns the key in its teeth (click, click), flicks its tail and bows.

    tools/blender.sh art/blender/toys/otsukai/kitsune.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('otsukai', 'kitsune')

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
HEAD = [(0, 2.8, HZ + 0.3), (0, 0.5, HZ + 0.3), (0, -2.8, HZ), (0, -5.6, HZ - 0.9), (0, -7.6, HZ - 1.5), (0, -9.4, HZ - 1.9),
        (0, -10.8, HZ - 2.1)]


def sc_head(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 7.0, -1.5, HZ - 3.2), 4.0, 1.0)       # cheek ruffs
            d += tk.bump(V, (sx * 3.0, -5.0, HZ + 3.0), 2.4, 0.35)      # brows
        d += tk.bump(V, (0, -11.1, HZ - 1.8), 1.4, 0.45)                 # the nose
        # the mouth line along each side of the snout
        d -= 0.3 * np.exp(-((V[:, 2] - (HZ - 2.7 + 0.1 * (V[:, 1] + 8))) / 0.3) ** 2) * (V[:, 1] < -6.0) * (np.abs(V[:, 0]) > 1.0)
        return d
    tk.push(h, f)


head_lo, head_hi = ak.spine('head', HEAD, [8.6, 14.2, 14.6, 9.6, 6.2, 4.4, 2.8], [4.9, 6.8, 6.4, 3.9, 2.7, 2.0, 1.4],
                            [4.9, 6.1, 5.6, 3.5, 2.5, 1.9, 1.3], e=2.2, n=14, up=(0, 0, 1), tris=300, sculpt=sc_head)
EARS = []
for sx in (1, -1):
    root = (sx * 4.2, -0.6, HZ + 4.9)
    lo, hi, r_, tip = tt.corner('ear', root, -90, L=10.5, W=7.0, a0=88, a1=72, cup=1.1, ripple=0.0, tris=40, thick=1.3,
                                root_r=0.0, root_z=0.0, shape=0.95, power=1.3, region='ear')
    for o in (lo, hi):
        tk.rotate(o, sx * 14, 'Y', pivot=root)
    EARS.append((lo, hi))

# the granary key, held crossways in the mouth (gold): shaft, ring bow on the right, bit hanging on the left
KEY_C = (0.0, -7.9, HZ - 2.9)
shaft_hi = tk.cyl('k_shaft', 0.65, -6.0, 6.2, n=12, at=(KEY_C[1], KEY_C[2]), axis='X', bevel=0.2, segs=1)
ring_pts = [(7.8 + 1.7 * math.cos(a), KEY_C[1], KEY_C[2] + 1.7 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 20, endpoint=False)]
bow_hi = tk.tube('k_bow', ring_pts, 0.55, n=8, closed=True)
bit_hi = tk.slab('k_bit', [(-6.0, 0.0), (-4.2, 0.0), (-4.2, -1.2), (-4.9, -1.2), (-4.9, -2.4), (-6.0, -2.4)], 1.0, plane='XZ', at=KEY_C[1], bevel=0.2, segs=1)
tk.move(bit_hi, (0, 0, KEY_C[2] + 0.2))
key_hi = tk.join([shaft_hi, bow_hi, bit_hi], 'key_hi')
tk.set_region(key_hi, 'gold')
shaft_lo = tk.cyl('k_shaft_lo', 0.65, -6.0, 6.2, n=5, at=(KEY_C[1], KEY_C[2]), axis='X', bevel=0, segs=0)
bow_lo = tk.tube('k_bow_lo', ring_pts[::3], 0.55, n=4, closed=True)
bit_lo = tk.slab('k_bit_lo', [(-6.0, 0.0), (-4.2, 0.0), (-4.2, -1.2), (-4.9, -1.2), (-4.9, -2.4), (-6.0, -2.4)], 1.0, plane='XZ', at=KEY_C[1], bevel=0, segs=0)
tk.move(bit_lo, (0, 0, KEY_C[2] + 0.2))
key_lo = tk.join([shaft_lo, bow_lo, bit_lo], 'key')

# the red bib (yodarekake) tied round the neck, hanging to a point on the chest
class _Bib:
    z = (PZ + 21.6, PZ + 12.6)

    def __call__(s, v):
        half = 5.6 * (1 - v ** 1.6) + 0.4
        return (-half, half)


bib_lo, bib_hi = ak.shell('bib', BODY, _Bib(), gap=0.3, th=0.7, nu=7, nv=8, tris=90, region='bib', ripple=0.12,
                          lift=lambda x, v: 0.5 * v ** 3)

# ------------------------------------------------------------------ the tail: raised behind it like a flame, the jewel on its tip
TAIL0 = (0.0, 9.6, PZ + 3.0)
tpts = [TAIL0, (2.6, 12.4, PZ + 6.8), (4.2, 13.6, PZ + 12.6), (4.0, 12.8, PZ + 18.6), (2.6, 10.8, PZ + 23.6), (1.2, 9.2, PZ + 27.2)]


def sc_tail(h):
    def f(V, N):
        # carved flame-locks running up the tail
        ph = V[:, 2] * 0.9 + np.arctan2(V[:, 1] - 11, V[:, 0] - 2.5) * 3.0
        return 0.32 * np.cos(ph) ** 3
    tk.push(h, f)


tail_lo, tail_hi = ak.spine('tail', tpts, [3.6, 7.2, 9.0, 8.6, 6.2, 2.4], [1.9, 3.7, 4.5, 4.3, 3.1, 1.2], e=2.1, n=12,
                            up=(0, 1, 0), tris=150, sculpt=sc_tail, region='tail', cap0='round', cap1='point')
JEWEL = (1.0, 8.9, PZ + 28.6)
jw_prof = [(0, -2.0), (1.6, -1.6), (2.3, -0.3), (2.1, 0.9), (1.3, 2.0), (0.5, 2.9), (0, 3.6)]
jewel_hi = tk.lathe('jewel_hi', jw_prof, n=18, centre=JEWEL)
tk.subsurf(jewel_hi, 1)
tk.set_region(jewel_hi, 'jewel')
jewel_lo = tk.lathe('jewel', jw_prof, n=8, centre=JEWEL)

# ------------------------------------------------------------------ parts
F.part('plinth', base_lo, base_hi)
F.part('body', tk.join([body_lo] + legs_lo + [bib_lo], 'body'), body_hi + legs_hi + bib_hi, kind='gloss')
F.part('head', tk.join([head_lo] + [e[0] for e in EARS], 'head'), head_hi + [e[1] for e in EARS], bone='head', kind='gloss')
F.part('key', key_lo, [key_hi], bone='key', kind='metal', uvw=0.7)
F.part('tail', tk.join([tail_lo, jewel_lo], 'tail'), tail_hi + [jewel_hi], bone='tail', kind='gloss')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', NECK, parent='root')
    R.bone('key', KEY_C, parent='head')
    R.bone('tail', TAIL0, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'head', 'key', 'tail']
        for b in bones:
            k(b, 0)
        # 0-10 it cocks its head; 10-30 turns the key in its teeth (click... click)
        k('head', 8, rot=('Y', -9))
        k('key', 10)
        k('key', 15, rot=('X', 90), ease='BACK')
        k('key', 22, rot=('X', 90))
        k('key', 27, rot=('X', 0), ease='BACK')
        k('head', 26, rot=('Y', -9))
        k('head', 32, rot=('Y', 6))
        # 12-46 the tail flicks: a swish to one side, the other, and a proud lift
        k('tail', 12)
        k('tail', 18, rot=[('Z', 9), ('X', -9)])
        k('tail', 25, rot=[('Z', -8), ('X', -9)])
        k('tail', 32, rot=[('Z', 7), ('X', -9)])
        k('tail', 40, rot=('X', -3))
        # 40-66 it bows to you (a messenger's bow), holds, and sits back up
        k('head', 40, rot=('Y', 0))
        k('head', 48, rot=('X', 16))
        k('root', 40)
        k('root', 48, rot=('X', 0))
        k('head', 58, rot=('X', 16))
        k('head', 66, rot=('X', 1.5), ease='BACK')
        k('tail', 66, rot=('X', -1))
        for b in bones:
            k(b, 74)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.2)
    LAC = pt.ramp('#26222b', 7, shift=0.08, light=0.55)
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    VERM = pt.ramp('#cc4a32', 7, shift=0.06)
    lac = ak.lacquer(P, ('body', 'tail', 'ear'))
    # gold leaf as bold graphic bands: a collar, the ear rims and linings, a band round the tail, the toes, the flame tip
    ak.gold_bands(P, P.region('body'), Z - (PZ + 21.6), 1.4)
    ear = P.region('ear')
    P.fill(ear & ((P.on[:, :, 1] < -0.2) | (P.cav > 0.53)), GOLD, tone=sh, base=0.1)
    ak.gold_bands(P, P.region('tail'), Z - (PZ + 15.5), 1.6)
    P.fill(P.region('tail') & (Z > PZ + 20.5 + 1.2 * np.sin(X * 1.7 + Yc)), GOLD, tone=sh, base=0.1)
    ak.gold_bands(P, P.region('body'), Z - (PZ + 0.7), 1.4)
    P.fill('gold', GOLD, tone=sh * 1.2, base=0.15)
    P.fill('jewel', GOLD, tone=sh, base=0.15)
    P.fill(P.region('jewel') & (Z > JEWEL[2] + 0.4), pt.ramp('#d4463a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('bib', VERM, tone=sh, base=0.05)
    P.fill('plinth', VERM, tone=sh, base=0.0)
    # the bib's gold border and a gold rice-jewel crest
    bib = P.region('bib')
    P.fill(bib & (Z > PZ + 20.5), GOLD, tone=sh, base=0.1)
    P.fill(bib & (np.hypot(X, Z - (PZ + 16.5)) < 1.6), GOLD, tone=sh, base=0.1)
    # the head: a lacquer head with red markings round the eyes (the Inari make-up), the face itself left for last
    # the face in cream ink on the lacquer: narrow fox eyes (calm slits, tilted up at the corners) with the Inari
    # shrine's red flicks at their outer ends; no mouth (it is busy holding the key)
    import face
    fc = face.Face(P, c=(0.0, -6.6, HZ + 0.9), axis=(0, -1, 0.5), where=P.region('body'), seed=61, ink='#efe4c8')
    fc.eyes('sleepy', spread=7.4, size=0.7, dy=0.6, tilt=-8.0)
    for sx in (-1, 1):
        fc.stroke([(sx * 4.6, 1.0), (sx * 5.8, 1.9)], weight=0.45, col='#d4463a')
    sn = face.Face(P, c=(0.0, -11.0, HZ - 1.4), axis=(0, -1, 0.25), where=P.region('body'), seed=62, ink='#efe4c8')
    sn.nose('tri', dy=0.0, size=0.75, col='#d9a640')
    sn.whiskers(dy=-0.6, spread=2.0, n=2, length=2.2, dots=True)
    P.lines(['bib'], step=2)
    P.lines(['jewel', 'gold'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('body', 'plinth')],
       cam=((70, -96, 62), (0, 0, 20)), fold=(0, 15, 25, 52), frames=74)
