"""おやまネコマタ Onnagata Nekomata: the female role, played by a two-tailed calico cat (series kabuki, concepts_C.md):
a red kimono with white plum blossoms, a gold obi tied in a big drum knot at the back, the hand towel of the cat
dance over her head with a flower hairpin, a folded fan held demurely in both paws, and two tails (one orange, one
black) curling up behind her, the giveaway.

Gimmick: the coy bow (ears flat, the tails swing down against her back), then the bakeneko reveal: she straightens,
whips both tails up, the ears prick, the head tilts: her mie.

    tools/blender.sh art/blender/toys/kabuki/nekomata.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '..', 'kaden', '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('kabuki', 'nekomata')

HC = (0, -0.8, 33.0)           # the head's centre
NECK = (0, 0.0, 26.2)
WAIST = (0, 0.0, 12.0)         # the bow's pivot
FAN = np.array((0.4, -9.4, 20.6))

# ------------------------------------------------------------------ the kimono: to the floor with a trailing hem, the obi and its drum knot
robe = tk.loft('robe', [{'c': (0, 0.6, 0.0), 'w': 22.0, 'ht': 8.4, 'hb': 10.4, 'e': 2.5},
                        {'c': (0, 0.4, 3.0), 'w': 19.0, 'ht': 7.6, 'hb': 8.6, 'e': 2.4},
                        {'c': (0, 0.2, 10.0), 'w': 15.4, 'ht': 6.6, 'hb': 6.8, 'e': 2.3},
                        {'c': (0, 0.0, 17.0), 'w': 15.6, 'ht': 6.6, 'hb': 6.6, 'e': 2.4},
                        {'c': (0, 0.0, 22.6), 'w': 17.0, 'ht': 6.4, 'hb': 6.4, 'e': 2.5},
                        {'c': (0, 0.2, 26.4), 'w': 11.6, 'ht': 4.4, 'hb': 4.4, 'e': 2.2}], n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=1.4)


def sc_robe(h):
    def f(V, N):
        col = 0.35 * tk.smoothstep(0.5, 0.0, np.abs(np.abs(V[:, 0]) - 0.5 * (26.0 - V[:, 2]))) * (N[:, 1] < -0.4) * (V[:, 2] > 18.6) * (V[:, 2] < 26.0)
        obi = 0.5 * tk.smoothstep(0.6, 0.2, np.abs(V[:, 2] - 16.6) - 2.0)
        folds = -0.25 * (np.abs(np.sin(V[:, 0] * 1.1 + V[:, 1] * 0.4)) ** 6) * (V[:, 2] < 12.0)
        return col + obi + folds
    tk.push(h, f)


robe_lo, robe_hi = cx.low(robe, 'robe', 230, lo=1, hi=3, sculpt=sc_robe, region=('kimono', [('obi', lambda C, N: np.abs(C[:, 2] - 16.6) < 2.6),
                                                                                             ('collar', lambda C, N: (np.abs(np.abs(C[:, 0]) - 0.5 * (26.0 - C[:, 2])) < 0.9) & (N[:, 1] < -0.4) & (C[:, 2] > 19.0))]))
cx.flat_bottom(robe_lo, 1.2)
cx.flat_bottom(robe_hi, 1.2)
knot = tk.rbox('knot', (11.0, 3.6, 7.6), centre=(0, 7.4, 17.2), bevel=1.2, segs=2)
knot_lo, knot_hi = cx.low(knot, 'knot', 50, lo=0, hi=2, region='obi')

# ------------------------------------------------------------------ the sleeves and the paws holding the fan
ARMS = []
for sx in (1, -1):
    s_ = np.array((sx * 7.6, 0.2, 24.2))
    el = np.array((sx * 9.6, -2.0, 19.4))
    pw = np.array((sx * 2.2, -8.0, 20.2))
    a = tk.tube('arm', [tuple(s_), tuple(el), tuple(pw)], [2.6, 2.4, 2.0], n=8)
    paw = tk.lathe('paw', [(0, -1.6), (1.6, -1.2), (1.9, 0.0), (1.5, 1.2), (0, 1.6)], n=10, centre=tuple(pw + (-sx * 0.4, -0.8, 0.2)))
    slv = tk.loft('sleeve', [{'c': (sx * 9.0, -0.2, 22.6), 'w': 2.8, 'h': 4.6, 'e': 3.0}, {'c': (sx * 10.8, -2.2, 16.4), 'w': 3.0, 'h': 6.6, 'e': 3.4},
                             {'c': (sx * 10.6, -3.0, 11.6), 'w': 2.6, 'h': 5.6, 'e': 3.4}], n=12, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
    ARMS += [cx.low(a, 'arm', 40, lo=1, hi=1, region='kimono'), cx.low(paw, 'paw', 24, lo=0, hi=1, region='white'),
             cx.low(slv, 'sleeve', 70, lo=1, hi=2, region='kimono')]
fan = tk.slab('fan', [(-0.9, -0.4), (0.9, -0.4), (1.3, 7.4), (-1.3, 7.4)], 1.2, plane='XZ', at=0.0, bevel=0.3, segs=1)
tk.rotate(fan, -18, 'X')
tk.rotate(fan, 14, 'Y')
tk.move(fan, tuple(FAN + (0, 0, -2.0)))
ARMS.append(cx.low(fan, 'fan', 24, lo=0, hi=1, region='fan'))

# ------------------------------------------------------------------ the head: a cat's, the muzzle, the towel over it, the hairpin; the ears
head = tk.loft('head', [{'c': (0, HC[1] + 5.0, HC[2] + 0.2), 'w': 10.0, 'h': 5.0, 'e': 2.2}, {'c': (0, HC[1] + 2.0, HC[2] + 0.2), 'w': 16.6, 'h': 7.6, 'e': 2.4},
                        {'c': (0, HC[1] - 2.2, HC[2] - 0.2), 'w': 16.4, 'h': 7.4, 'e': 2.4}, {'c': (0, HC[1] - 5.2, HC[2] - 0.8), 'w': 10.4, 'h': 5.0, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)


def sc_head(h):
    def f(V, N):  # the muzzle pads and the cheeks' fluff
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 1.5, HC[1] - 6.6, HC[2] - 2.2), 2.2, 0.8)
            d += tk.bump(V, (sx * 7.4, HC[1] - 1.0, HC[2] - 2.4), 3.0, 0.7)
        return d
    tk.push(h, f)


towel = tk.loft('towel', [{'c': (0, HC[1] - 3.6, HC[2] + 6.0), 'w': 15.4, 'h': 1.2, 'e': 3.2}, {'c': (0, HC[1] + 0.6, HC[2] + 7.8), 'w': 16.2, 'h': 1.2, 'e': 3.2},
                          {'c': (0, HC[1] + 5.0, HC[2] + 6.2), 'w': 15.4, 'h': 1.2, 'e': 3.2}, {'c': (0, HC[1] + 7.0, HC[2] + 2.0), 'w': 12.0, 'h': 1.0, 'e': 3.2}],
                n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
pin = tk.tube('kanzashi', [(6.6, HC[1] - 1.0, HC[2] + 6.4), (9.6, HC[1] - 0.6, HC[2] + 8.6)], [0.45, 0.4], n=6)
flower = tk.lathe('flower', [(0, -0.6), (1.9, -0.4), (2.1, 0.2), (1.3, 0.7), (0, 0.8)], n=10, centre=(9.8, HC[1] - 0.6, HC[2] + 8.8))
HEADP = [cx.low(head, 'head', 190, lo=1, hi=3, sculpt=sc_head, region='white'), cx.low(towel, 'towel', 80, lo=1, hi=2, region='towel'),
         cx.low(pin, 'kanzashi', 16, lo=0, hi=1, region='gold'), cx.low(flower, 'flower', 24, lo=0, hi=1, region='flower')]
EARS = {}
for sx, nm in ((1, 'ear_l'), (-1, 'ear_r')):
    e = tk.lathe(nm, [(0, -0.8), (2.6, -0.6), (2.2, 1.6), (1.0, 3.8), (0, 4.6)], n=6)
    tk.scale(e, (1.0, 0.55, 1.0))
    tk.rotate(e, -sx * 22, 'Y')
    root = (sx * 6.2, HC[1] + 0.8, HC[2] + 7.4)
    tk.move(e, root)
    EARS[nm] = (cx.low(e, nm, 24, lo=0, hi=1, region=('white', [('inner', lambda C, N: N[:, 1] < -0.6)])), root)

# ------------------------------------------------------------------ two tails curling up behind her
TAILS = {}
for sx, nm, col in ((1, 'tail_l', 'orange'), (-1, 'tail_r', 'black')):
    root = np.array((sx * 2.0, 7.2, 9.6))
    pts = [root, root + (sx * 1.6, 4.0, 2.4), root + (sx * 4.2, 6.0, 8.0), root + (sx * 5.0, 5.2, 14.0), root + (sx * 3.6, 3.4, 18.2), root + (sx * 1.4, 3.2, 19.6)]
    t = tk.tube(nm, [tuple(p) for p in pts], [1.9, 1.8, 1.7, 1.6, 1.5, 1.2], n=8, cap0='round', cap1='round')
    TAILS[nm] = (cx.low(t, nm, 60, lo=1, hi=2, region=(col, [('white', lambda C, N, r=root: C[:, 2] > r[2] + 17.0)])), tuple(root))

# ------------------------------------------------------------------ parts
F.part('robe', tk.join([robe_lo, knot_lo], 'robe'), [robe_hi, knot_hi], bone='body')
F.part('arms', tk.join([a_[0] for a_ in ARMS], 'arms'), [a_[1] for a_ in ARMS], bone='body')
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='head')
for nm, ((lo, hi), root) in EARS.items():
    F.part(nm, lo, [hi], bone=nm)
for nm, ((lo, hi), root) in TAILS.items():
    F.part(nm, lo, [hi], bone=nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', WAIST, parent='root')
    R.bone('head', NECK, parent='body')
    for nm, ((lo, hi), root) in EARS.items():
        R.bone(nm, root, parent='head')
    for nm, ((lo, hi), root) in TAILS.items():
        R.bone(nm, root, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'head', 'ear_l', 'ear_r', 'tail_l', 'tail_r']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the coy bow: ears flat, the tails swing down against her back
        k('body', 4)
        k('body', 14, rot=('X', 14))
        k('body', 26, rot=('X', 14))
        k('head', 4)
        k('head', 14, rot=('Y', 10))
        k('head', 26, rot=('Y', 10))
        for nm, sx in (('ear_l', 1), ('ear_r', -1)):
            k(nm, 4)
            k(nm, 12, rot=('X', 40))
            k(nm, 28, rot=('X', 40))
            k(nm, 32, rot=('X', -10), ease='BACK')
            k(nm, 40)
        for nm, sx in (('tail_l', 1), ('tail_r', -1)):
            k(nm, 4)
            k(nm, 14, rot=('X', -34))
            k(nm, 26, rot=('X', -34))
            # the reveal: the tails whip up and out
            k(nm, 31, rot=('Y', sx * 20), ease='BACK')
            k(nm, 50, rot=('Y', sx * 20))
            k(nm, 58)
        # she straightens with a tilt of the head: the mie
        k('body', 31, rot=('X', -4), ease='BACK')
        k('body', 50, rot=('X', -4))
        k('body', 58)
        k('head', 31, rot=('Y', -14), ease='BACK')
        k('head', 50, rot=('Y', -14))
        k('head', 58)
        for b in allb:
            k(b, 64)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    tone = np.where(P.part == PI['robe'], sh, free)
    # the kimono: deep red, white plum blossoms (five round petals) scattered, a black hem band
    P.fill('kimono', pt.ramp('#b8283a', 7, shift=0.07), tone=tone, base=0.08)
    km = P.region('kimono')
    for cx_, cz, cy in ((-4.0, 6.0, -1), (5.0, 9.0, -1), (-6.0, 20.0, -1), (3.6, 23.6, -1), (0.6, 3.0, -1), (7.0, 4.0, 1), (-5.4, 11.0, 1), (4.0, 21.0, 1), (-10.2, 15.0, 0), (10.2, 15.0, 0)):
        for a in range(5):
            ang = math.radians(90 + 72 * a)
            pu, pz = cx_ + 0.9 * math.cos(ang), cz + 0.9 * math.sin(ang)
            P.flat(km & ((X - pu) ** 2 + (Z - pz) ** 2 < 0.55) & ((Yc * cy > 0) | (cy == 0)), '#f6eee8')
        P.flat(km & ((X - cx_) ** 2 + (Z - cz) ** 2 < 0.2) & ((Yc * cy > 0) | (cy == 0)), '#e8b84a')
    P.tint(km & (Z < 1.6) & (P.part == PI['robe']), pt.ramp('#2a2228', 6, shift=0.05), sh + 0.2)
    P.fill('collar', pt.ramp('#f2ece2', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('obi', pt.ramp('#d8b04a', 7, shift=0.06), tone=tone, base=0.08)
    P.tint(P.region('obi') & (np.abs(np.mod(X + Z, 2.6) - 1.3) < 0.3), pt.ramp('#a87a2a', 6, shift=0.06), tone)
    P.fill('fan', pt.ramp('#efe0c0', 6, shift=0.05), tone=free, base=0.15)
    P.flat(P.region('fan') & (np.mod(X * 1.2 + Z * 0.3, 0.9) < 0.18), '#c8303a')
    WHITE = pt.ramp('#f6f0e6', 7, shift=0.05)
    P.fill('white', WHITE, tone=free, base=0.08)
    # calico patches on the head: orange over one eye, black at the other ear
    hd = P.region('white') & (P.part == PI['head'])
    P.tint(hd & ((X - 4.6) ** 2 / 14 + (Z - (HC[2] + 2.6)) ** 2 / 10 < 1) & (Yc < HC[1] + 1.0), pt.ramp('#e89a48', 6, shift=0.06), free)
    P.tint(hd & ((X + 5.6) ** 2 / 8 + (Z - (HC[2] + 4.2)) ** 2 / 6 < 1), pt.ramp('#2e2a2c', 6, shift=0.05), free + 0.2)
    P.fill('inner', pt.ramp('#efa4ae', 6, shift=0.06), tone=free, base=0.1)
    P.fill('orange', pt.ramp('#e89a48', 7, shift=0.06), tone=free, base=0.08)
    P.fill('black', pt.ramp('#2e2a2c', 6, shift=0.05), tone=free, base=0.25)
    # the towel: indigo shibori, white rings
    P.fill('towel', pt.ramp('#3a5a96', 7, shift=0.06), tone=free, base=0.1)
    tw = P.region('towel')
    P.flat(tw & (np.abs(np.hypot(np.mod(X, 3.2) - 1.6, np.mod(Yc, 3.2) - 1.6) - 0.9) < 0.25), '#e8eef2')
    P.fill('gold', pt.ramp('#d8b04a', 6, dark=0.6, light=0.6, shift=0.06), tone=free * 1.3, base=0.15)
    P.fill('flower', pt.ramp('#f2a0b4', 6, shift=0.06), tone=free, base=0.15)
    # the face, drawn on: the onnagata's demure closed eyes (^ ^), a little cat mouth, a pink nose, whiskers, blush
    fc = face.Face(P, c=(0, HC[1] - 7.4, HC[2] - 0.6), axis=(0, -1, 0.05), where=hd, seed=131)
    fc.eyes('happy', spread=7.4, size=0.75, dy=1.8)
    fc.nose('tri', 0.0, -1.0, size=0.7, col='#e2788a')
    fc.snout_mouth('cat', 0.0, -1.8, w=2.4)
    fc.whiskers(0.0, -1.6, spread=8.4, n=2, length=2.6)
    fc.blush(9.6, -0.8, rx=1.6, ry=0.9)
    P.lines(['kimono'], ['obi', 'collar', 'white'], step=1)
    P.lines(['white'], ['towel', 'inner'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 65), skip=[('arms', 'robe'), ('head', 'robe'), ('head', 'arms'), ('ear_l', 'head'), ('ear_r', 'head')]),
       cams=[((62, -76, 52), (0, -1, 20)), ((-60, 68, 46), (0, 0, 20))], fold=(0, 14, 34, 50))
