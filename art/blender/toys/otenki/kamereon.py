"""にじカメレオン Rainbow Chameleon: the rainbow courier (series otenki, concepts_D.md). A green chameleon in a painter's
beret, turret eyes swivelled, its tail curled in a spiral, gripping the handlebar of a paint-splashed cloud; seven
paint pots on the rack and the rainbow folded flat behind.

Gimmick: the tongue flicks out, and the rainbow swings up over its head from the rack. Pull it back and let go: the
cloud scoots off (run).

    tools/blender.sh art/blender/toys/otenki/kamereon.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kumo as km  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('otenki', 'kamereon')
C = km.cloud(F, L=27.0, W=18.0, Hc=8.0, seed=11, region='cloud')
ST = C['top'] - 0.6
HC = np.array((0.0, -4.6, ST + 10.2))           # the head's centre
RP = np.array((0.0, C['rack'][1] + 1.0, C['rack'][2] + 2.2))   # the rainbow's hinge
RO, RI = 11.0, 8.4                              # its outer and inner radius
low = km.low

# ------------------------------------------------------------------ the chameleon: a tall narrow body leaning to the bars, legs, the spiral tail
body = tk.loft('body', [{'c': (0, 3.0, ST + 1.8), 'w': 4.6, 'h': 2.6, 'e': 2.2}, {'c': (0, 1.4, ST + 4.4), 'w': 6.0, 'h': 3.8, 'e': 2.2},
                        {'c': (0, -0.6, ST + 7.0), 'w': 6.2, 'h': 3.8, 'e': 2.2}, {'c': (0, -2.4, ST + 8.8), 'w': 4.6, 'h': 2.8, 'e': 2.2}],
               n=14, up=(0, -0.6, 0.8), cap0='round', cap1='round', capd=1.0)


def sc_body(h):
    def f(V, N):   # the dorsal crest of little scales, and pebbly skin
        crest = 0.5 * np.exp(-(V[:, 0] / 0.5) ** 2) * (N[:, 1] > 0.3) * (np.abs(np.sin(V[:, 2] * 4.0)) ** 2)
        return crest + 0.08 * np.sin(V[:, 1] * 6) * np.sin(V[:, 2] * 6)
    tk.push(h, f)


RIDER = [low(body, 'body', 120, sculpt=sc_body, region=('skin', [('belly', lambda C_, N: N[:, 1] < -0.6)]))]
spiral = []
for i in range(14):
    t = i / 13
    a = math.radians(-90 + 520 * t)
    r = 3.6 * (1 - 0.72 * t)
    spiral.append((0.0, 6.2 + r * math.cos(a) * 0.9 + 1.6 * (1 - t), ST + 4.0 + r * math.sin(a)))
tail = tk.tube('tail', [(0, 3.2, ST + 2.0)] + spiral, [1.5] + list(np.linspace(1.4, 0.35, len(spiral))), n=8, cap1='round')
RIDER.append(low(tail, 'tail', 90, region='skin'))
for sx in (1, -1):
    lg = tk.tube('hleg', [(sx * 2.4, 2.6, ST + 2.4), (sx * 4.4, 0.4, ST + 2.6), (sx * 4.2, -1.2, ST + 0.4)], [1.2, 1.0, 0.9], n=6)
    ft = tk.loft('hfoot', [{'c': (sx * 4.2, -1.0, ST + 0.3), 'w': 1.8, 'h': 0.6}, {'c': (sx * 4.2, -2.8, ST + 0.1), 'w': 2.4, 'h': 0.5}], n=6, up=(0, 0, 1), cap1='round')
    RIDER += [low(lg, 'hleg', 30, lo=1, hi=1, region='skin'), low(ft, 'hfoot', 14, lo=1, hi=1, region='skin')]
# ------------------------------------------------------------------ the head: the casque, turret eyes, the beret
head = tk.loft('head', [{'c': tuple(HC + (0, 2.0, -0.4)), 'w': 4.6, 'h': 2.6, 'e': 2.2}, {'c': tuple(HC + (0, 0.0, 0.0)), 'w': 5.2, 'h': 3.0, 'e': 2.3},
                        {'c': tuple(HC + (0, -2.4, -0.4)), 'w': 4.0, 'h': 2.2, 'e': 2.3}, {'c': tuple(HC + (0, -3.8, -0.8)), 'w': 2.6, 'h': 1.5, 'e': 2.2}],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
casque = tk.loft('casque', [{'c': tuple(HC + (0, -0.6, 2.0)), 'w': 2.2, 'h': 1.2}, {'c': tuple(HC + (0, 1.4, 3.0)), 'w': 2.6, 'h': 1.4},
                            {'c': tuple(HC + (0, 3.2, 3.0)), 'w': 1.4, 'h': 0.8}], n=8, up=(0, 0, 1), cap1='point')
HEAD = [low(head, 'head', 100, region=('skin', [('belly', lambda C_, N: (N[:, 2] < -0.5))])), low(casque, 'casque', 30, lo=1, hi=1, region='skin')]
for sx in (1, -1):
    ec = HC + (sx * 2.0, -0.6, 0.6)
    eye = tk.lathe('turret', [(0, -0.2), (1.5, 0.0), (1.3, 0.9), (0.7, 1.5), (0, 1.6)], n=10, axis='X', centre=(0, 0, 0))
    if sx < 0:
        tk.scale(eye, (-1, 1, 1))
        tk.fix_normals(eye)
    tk.rotate(eye, sx * -25, 'Z')
    tk.move(eye, tuple(ec))
    HEAD.append(low(eye, 'turret', 30, lo=1, hi=1, region='turret'))
BC = HC + (0.6, 1.2, 3.6)
beret = tk.lathe('beret', [(0, -0.4), (2.8, -0.4), (3.4, 0.2), (2.6, 0.9), (0, 1.1)], n=14, centre=tuple(BC))
tk.rotate(beret, 14, 'Y', pivot=tuple(BC))
stalk = tk.tube('stalk', [tuple(BC + (0.2, 0, 0.9)), tuple(BC + (0.3, 0, 1.6))], [0.35, 0.3], n=5)
HEAD += [low(beret, 'beret', 50, lo=1, hi=1, region='beret'), low(stalk, 'stalk', 8, lo=0, hi=1, region='beret')]
tongue = tk.tube('tongue', [tuple(HC + (0, 1.6, -1.0)), tuple(HC + (0, -2.6, -1.0)), tuple(HC + (0, -3.6, -1.0))], [0.45, 0.45, 0.8], n=6, cap1='round')
tng_lo, tng_hi = low(tongue, 'tongue', 30, lo=1, hi=1, region='tongue')
# ------------------------------------------------------------------ front legs on the grips
ARMS = {}
for nm, sx in (('arm_l', 1), ('arm_r', -1)):
    sh_ = np.array((sx * 2.6, -1.8, ST + 7.6))
    hand = np.array((sx * 4.6, -C['L'] * 0.36 + 0.2, C['top'] + 3.5))
    a = tk.tube(nm, [tuple(sh_), tuple((sh_ + hand) / 2 + (sx * 1.6, 0.4, -1.0)), tuple(hand)], [1.1, 0.95, 0.9], n=6, cap1='round')
    ARMS[nm] = (low(a, nm, 30, lo=1, hi=1, region='skin'), tuple(sh_))
# ------------------------------------------------------------------ seven paint pots on the rack; the rainbow folded flat behind
POTS = []
rk = np.array(C['rack'])
for i in range(7):
    x = (i - 3) * 1.15 * (1 if i % 2 else 1)
    y = rk[1] - 1.2 + (1.6 if i % 2 else 0)
    o = tk.lathe('pot', [(0, 0.0), (0.85, 0.0), (0.9, 1.6), (0.75, 1.75), (0, 1.75)], n=8, centre=(x, y, rk[2] + 0.1))
    POTS.append(low(o, 'pot%d' % i, 14, lo=0, hi=1, region='pot%d' % i))
arc = tk.slab('rainbow', tk.circle_pts(RO, 18, (0, 0), 0, 180, closed=False) + tk.circle_pts(RI, 18, (0, 0), 180, 0, closed=False), 1.2, plane='XZ', at=0.0, bevel=0.3, segs=1)
tk.move(arc, tuple(RP))
tk.rotate(arc, -90, 'X', pivot=tuple(RP))     # (folded down flat behind, onto the rack: it swings up in the gimmick)
arc_lo, arc_hi = low(arc, 'rainbow', 160, lo=0, hi=1, region='rainbow')

# ------------------------------------------------------------------ parts
km.parts(F, C, extra_lo=[p[0] for p in POTS], extra_hi=[p[1] for p in POTS])
F.part('rider', tk.join([r[0] for r in RIDER], 'rider'), [r[1] for r in RIDER], bone='rider')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
F.part('tongue', tng_lo, [tng_hi], bone='tongue')
for nm, (pr, sh_) in ARMS.items():
    F.part(nm, pr[0], [pr[1]], bone=nm)
F.part('rainbow', arc_lo, [arc_hi], bone='rainbow')


# ------------------------------------------------------------------ rig: the press clip and the pull-back run
def make_rig():
    from rig import Rig
    R = Rig()
    km.bones(R, C)
    R.bone('rider', (0, 1.0, ST + 1.0), parent='cloud')
    R.bone('head', (0, -2.4, ST + 8.8), parent='rider')
    R.bone('tongue', tuple(HC + (0, -2.0, -1.0)), parent='head')
    for nm, (pr, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='rider')
    R.bone('rainbow', tuple(RP), parent='cloud')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'cloud', 'wf', 'wb', 'rider', 'head', 'tongue', 'arm_l', 'arm_r', 'rainbow']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-10 it peers; 10-14 thwip! the tongue; 16-22 back in; 18-32 the rainbow swings up over its head; 32-60 it
        # admires it (head tilts); 64-80 the rainbow folds back down
        k('head', 4)
        k('head', 10, rot=('X', 8))
        k('tongue', 9)
        k('tongue', 13, move=(0, -6.4, 0.6), ease='BACK')
        k('tongue', 17, move=(0, -6.4, 0.6))
        k('tongue', 22)
        k('head', 22)
        k('head', 34, rot=[('X', -14), ('Y', 10)], ease='BACK')
        k('head', 60, rot=[('X', -14), ('Y', 10)])
        k('head', 70)
        k('rainbow', 18)
        k('rainbow', 30, rot=('X', 90), ease='BACK')
        for i, f in enumerate(range(34, 62, 7)):
            k('rainbow', f, rot=('X', 90 + (3 if i % 2 else -3)))
        k('rainbow', 64, rot=('X', 90))
        k('rainbow', 78)
        k('rider', 20)
        k('rider', 30, rot=('X', 4))
        k('rider', 60, rot=('X', 4))
        k('rider', 70)
        for b in allb:
            k(b, 84)
    km.run(R, C, extra=lambda k_, f: (k_('head', f, rot=('Z', 0 if f % 16 == 0 else 6)), k_('arm_l', f), k_('arm_r', f), k_('rainbow', f)))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    km.paint_cloud(P, pt, sh, C, col='#f6eef0', belly='#c8b0c4')
    km.paint_kit(P, pt, sh, C, plate_ink='#c8302a')
    COLS = ['#d8443a', '#ec8a32', '#f2cc3a', '#5aae4a', '#3a8ad0', '#3a52a0', '#8a5aa8']
    cl = P.region('cloud')
    for i, col in enumerate(COLS):   # splashes of paint on the cloud
        rng = np.random.default_rng(80 + i)
        cx_, cy_ = rng.uniform(-6, 6), rng.uniform(-9, 9)
        sp = cl & (np.hypot((X - cx_) * 1.2, Y - cy_) < 0.9 + 0.5 * np.sin(np.arctan2(Y - cy_, X - cx_) * 5) ** 2) & (P.on[:, :, 2] > 0.2)
        P.fill(sp, pt.ramp(col, 5, shift=0.05), tone=sh, base=0.1, brush=False)
    for i, col in enumerate(COLS):
        P.fill('pot%d' % i, pt.ramp(col, 5, shift=0.05), tone=sh, base=0.1)
    # the rainbow, band by band (radius from the hinge), glossy
    rb = P.region('rainbow')
    rr = np.hypot(X - RP[0], np.hypot(Y - RP[1], Z - RP[2]))
    for i, col in enumerate(COLS):
        r0 = RO - (RO - RI) * (i + 1) / 7
        P.fill(rb & (rr >= r0 - 0.05), pt.ramp(col, 5, shift=0.05), tone=sh, base=0.15, brush={'preset': 'gloss', 'flow': 'around'})
    # the chameleon: leaf green, a pale lemon belly and a pale stripe along each flank, pebbly dabs
    sk = P.region('skin')
    P.fill('skin', pt.ramp('#5aa84a', 7, shift=0.07), tone=sh, base=0.08)
    who, d = P.dabs(sk, size=0.7, spacing=1.1, seed=51)
    P.shift(sk & (who >= 0) & (d > 0.8), -1)
    P.fill(sk & (np.abs(Z - ST - 4.8 + 0.5 * Y) < 0.5) & (P.part == PI['rider']) & (np.abs(X) > 2.0), pt.ramp('#d8e070', 5), tone=sh, base=0.1)
    P.fill('belly', pt.ramp('#d8e08a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('turret', pt.ramp('#6ab858', 6, shift=0.06), tone=sh, base=0.1)
    tr = P.region('turret')
    P.fill(tr & (np.mod(np.floor(np.arctan2(Z - HC[2] - 0.6, Y - HC[1] + 0.6) * 3), 2) == 0), pt.ramp('#d8e070', 5), tone=sh, base=0.1)
    P.fill('beret', pt.ramp('#c8302a', 6, shift=0.07), tone=sh, base=0.05, brush='cloth')
    P.fill('tongue', pt.ramp('#f08aa0', 5, shift=0.05), tone=sh, base=0.15)
    # the face: an ink dot at the tip of each turret eye (looking two ways), a long happy mouth line, blush
    for sx in (1, -1):
        tip = HC + (sx * 2.0, -0.6, 0.6) + np.array((sx * math.cos(math.radians(25)), -math.sin(math.radians(25)), 0)) * 1.6
        fe = face.Face(P, c=tuple(tip), axis=(sx * math.cos(math.radians(25)), -math.sin(math.radians(25)), 0.0), where=tr, seed=650 + sx)
        fe.dot(0.0, 0.0, 0.42 if sx > 0 else 0.36)
    hd = (sk | P.region('belly')) & (P.part == PI['head'])
    fm = face.Face(P, c=tuple(HC + (0, -4.6, -0.6)), axis=(0, -1, 0.05), where=hd, seed=653)
    fm.mouth('upturn', w=2.8, dy=-0.2, weight=0.32)
    fm.blush(spread=3.4, dy=0.4, rx=0.8, ry=0.45)
    P.lines(['beret', 'turret', 'rainbow'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('rider', 'cloud'), ('head', 'rider'), ('arm_l', 'rider'), ('arm_r', 'rider'), ('tongue', 'head'),
                                                              ('rainbow', 'cloud'), ('wf', 'cloud'), ('wb', 'cloud')]),
    cams=[((46, -60, 44), (0, 0, 14)), ((-46, 56, 40), (0, 2, 14))], fold=(0, 13, 30, 50))
