"""さんまいめアズキアライ Comic Azukiarai: the comic servant of the piece, the bean-washer of the riverbank, played by an
old river otter (series kabuki, concepts_C.md): squatting on a river stone over a pool, a bamboo sieve of red azuki in
his paws, a short servant's kimono, and a polka-dot hand towel tied under his chin, the comic role's hokkamuri.

Gimmick: shoki-shoki: he shakes the sieve, the beans hop, he peers up to see if you are watching, grins and shakes
again.

    tools/blender.sh art/blender/toys/kabuki/azukiarai.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('kabuki', 'azukiarai')

SZ = 5.6                       # the stone's top
HC = (0, -2.6, 26.0)           # the head's centre
NECK = (0, -0.6, 20.4)
SIEVE = np.array((0, -11.0, 13.6))

# ------------------------------------------------------------------ the river stone and its pool
stone = tk.lathe('stone', [(0, 0), (15.0, 0), (15.4, 1.6), (14.2, 3.8), (11.0, SZ), (0, SZ)], n=24)
tk.scale(stone, (1.0, 1.15, 1.0))


def sc_stone(h):
    def f(V, N):  # a water-worn river stone: soft lumps and a few cracks
        return 0.4 * np.sin(V[:, 0] * 0.7 + 1.0) * np.sin(V[:, 1] * 0.6 + V[:, 2] * 0.4) - 0.3 * (np.abs(np.sin(V[:, 0] * 0.9 + V[:, 1] * 0.5)) < 0.06)
    tk.push(h, f)


stone_lo, stone_hi = cx.low(stone, 'stone', 140, lo=1, hi=2, sculpt=sc_stone, region='stone')
pool = tk.lathe('pool', [(0, 0), (6.6, 0), (6.4, 0.9), (0, 1.0)], n=18, centre=(0, -12.6, SZ - 0.6))
tk.scale(pool, (1.3, 0.9, 1.0), (0, -12.6, 0))
pool_lo, pool_hi = cx.low(pool, 'pool', 40, lo=0, hi=1, region='water')

# ------------------------------------------------------------------ the otter, squatting: body, legs, the flat tail, the short kimono
body = tk.loft('body', [{'c': (0, 1.6, SZ + 1.0), 'w': 13.0, 'h': 7.0, 'e': 2.2},
                        {'c': (0, 0.8, SZ + 5.0), 'w': 16.4, 'ht': 7.8, 'hb': 8.2, 'e': 2.4},
                        {'c': (0, -0.4, SZ + 10.0), 'w': 15.4, 'ht': 7.2, 'hb': 7.4, 'e': 2.4},
                        {'c': (0, -1.0, SZ + 14.0), 'w': 12.4, 'h': 5.8, 'e': 2.3}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.6)


def sc_body(h):
    def f(V, N):
        col = 0.3 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 0] - 0.55 * (V[:, 2] - (SZ + 13.0)))) * (N[:, 1] < -0.4) * (V[:, 2] > SZ + 7.0)
        obi = 0.35 * tk.smoothstep(0.6, 0.2, np.abs(V[:, 2] - (SZ + 7.0)) - 1.0)
        return col + obi
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 200, lo=1, hi=3, sculpt=sc_body, region=('kimono', [('obi', lambda C, N: np.abs(C[:, 2] - (SZ + 7.0)) < 1.3)]))
LEGS = []
for sx in (1, -1):
    th = tk.loft('thigh', [{'c': (sx * 5.0, 1.0, SZ + 3.4), 'w': 6.0, 'h': 3.2, 'e': 2.2}, {'c': (sx * 6.6, -4.0, SZ + 3.0), 'w': 5.6, 'h': 3.0, 'e': 2.2},
                           {'c': (sx * 6.4, -6.6, SZ + 1.2), 'w': 4.6, 'h': 2.4, 'e': 2.2}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
    LEGS.append(cx.low(th, 'thigh', 40, lo=1, hi=1, region='fur'))
tail = tk.loft('tail', [{'c': (0, 6.6, SZ + 1.6), 'w': 6.6, 'h': 2.4, 'e': 2.3}, {'c': (1.0, 11.6, SZ + 0.9), 'w': 5.6, 'h': 1.8, 'e': 2.4},
                        {'c': (2.4, 15.4, SZ + 0.6), 'w': 3.2, 'h': 1.2, 'e': 2.3}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
LEGS.append(cx.low(tail, 'tail', 40, lo=1, hi=1, region='fur'))

# ------------------------------------------------------------------ the arms holding the sieve, the sieve and its beans
ARMS = []
for sx in (1, -1):
    s_ = np.array((sx * 6.0, -1.6, SZ + 12.6))
    pw = SIEVE + np.array((sx * 6.2, 0.6, 0.6))
    a = tk.tube('arm', [tuple(s_), tuple((s_ + pw) / 2 + np.array((sx * 1.6, 0, -1.0))), tuple(pw)], [2.4, 2.2, 1.9], n=8)
    paw = tk.lathe('paw', [(0, -1.3), (1.4, -1.0), (1.7, 0.0), (1.3, 1.0), (0, 1.3)], n=8, centre=tuple(pw + (sx * 0.3, 0, 0.4)))
    ARMS += [cx.low(a, 'arm', 34, lo=1, hi=1, region='kimono'), cx.low(paw, 'paw', 20, lo=0, hi=1, region='fur')]
sieve = tk.lathe('zaru', [(0, -2.0), (3.4, -2.0), (6.0, -0.8), (7.0, 0.8), (6.6, 1.2), (5.6, -0.2), (3.2, -1.2), (0, -1.2)], n=20, centre=tuple(SIEVE))


def sc_sieve(h):
    def f(V, N):  # the woven bamboo
        return -0.15 * ((np.abs(np.mod(V[:, 0] + V[:, 1], 1.2) - 0.6) < 0.12) | (np.abs(np.mod(V[:, 0] - V[:, 1], 1.2) - 0.6) < 0.12))
    tk.push(h, f)


sieve_lo, sieve_hi = cx.low(sieve, 'zaru', 70, lo=0, hi=2, sculpt=sc_sieve, region='bamboo')
beans = tk.lathe('beans', [(0, -0.6), (4.4, -0.6), (4.2, 0.4), (2.8, 1.4), (0, 1.8)], n=14, centre=tuple(SIEVE + (0, 0, -0.4)))


def sc_beans(h):
    def f(V, N):  # a heap of round beans
        return 0.32 * np.abs(np.sin(V[:, 0] * 3.1) * np.sin(V[:, 1] * 3.3) * np.sin(V[:, 2] * 2.9 + 1.0)) ** 0.6 - 0.12
    tk.push(h, f)


beans_lo, beans_hi = cx.low(beans, 'beans', 40, lo=0, hi=3, sculpt=sc_beans, region='beans')

# ------------------------------------------------------------------ the head: an old otter, the towel tied under his chin
head = tk.loft('head', [{'c': (0, HC[1] + 4.4, HC[2] + 0.2), 'w': 9.4, 'h': 4.6, 'e': 2.2}, {'c': (0, HC[1] + 1.4, HC[2] + 0.2), 'w': 14.0, 'h': 6.4, 'e': 2.3},
                        {'c': (0, HC[1] - 2.4, HC[2] - 0.4), 'w': 13.2, 'h': 5.8, 'e': 2.3}, {'c': (0, HC[1] - 5.4, HC[2] - 1.4), 'w': 8.6, 'h': 4.0, 'e': 2.2}],
                n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)


def sc_head(h):
    def f(V, N):  # the whisker pads
        return sum(tk.bump(V, (sx * 2.0, HC[1] - 6.2, HC[2] - 1.8), 2.3, 0.9) for sx in (1, -1))
    tk.push(h, f)


head_lo, head_hi = cx.low(head, 'head', 170, lo=1, hi=3, sculpt=sc_head, region=('fur', [('muzzle', lambda C, N: (C[:, 1] < HC[1] - 4.0) & (C[:, 2] < HC[2] + 0.4))]))
towel = tk.loft('towel', [{'c': (0, HC[1] - 2.8, HC[2] + 5.2), 'w': 13.0, 'h': 1.0, 'e': 3.0}, {'c': (0, HC[1] + 1.2, HC[2] + 6.8), 'w': 14.6, 'h': 1.0, 'e': 3.0},
                          {'c': (0, HC[1] + 5.0, HC[2] + 4.4), 'w': 13.6, 'h': 1.0, 'e': 3.0}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
SIDES = []
for sx in (1, -1):
    sd = tk.tube('towelside', [(sx * 6.4, HC[1] - 0.6, HC[2] + 4.4), (sx * 7.2, HC[1] - 1.6, HC[2] - 0.6), (sx * 3.6, HC[1] - 3.6, HC[2] - 5.0)], [1.2, 1.1, 0.9], n=6, squash=0.5)
    SIDES.append(cx.low(sd, 'towelside', 30, lo=0, hi=1, region='towel'))
knot = tk.lathe('knot', [(0, -1.2), (1.6, -0.9), (1.8, 0.2), (1.2, 1.1), (0, 1.2)], n=10, centre=(0, HC[1] - 4.4, HC[2] - 5.4))
ear = []
for sx in (1, -1):
    e = tk.lathe('ear', [(0, -0.4), (1.6, -0.3), (1.6, 0.6), (0.8, 1.2), (0, 1.3)], n=8)
    tk.scale(e, (1, 0.6, 1))
    tk.move(e, (sx * 6.0, HC[1] + 1.8, HC[2] + 3.4))
    ear.append(cx.low(e, 'ear', 16, lo=0, hi=1, region='fur'))
HEADP = [(head_lo, head_hi), cx.low(towel, 'towel', 60, lo=1, hi=2, region='towel'), cx.low(knot, 'knot', 20, lo=0, hi=1, region='towel')] + SIDES + ear

# ------------------------------------------------------------------ parts
tk.delete(pool_lo)
tk.delete(pool_hi)
F.part('stone', stone_lo, [stone_hi], bone='root')
F.part('body', tk.join([body_lo] + [l[0] for l in LEGS], 'body'), [body_hi] + [l[1] for l in LEGS], bone='body')
F.part('arms', tk.join([a_[0] for a_ in ARMS] + [sieve_lo], 'arms'), [a_[1] for a_ in ARMS] + [sieve_hi], bone='arms')
F.part('beans', beans_lo, [beans_hi], bone='beans')
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='head')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, SZ), parent='root')
    R.bone('arms', (0, -1.6, SZ + 12.6), parent='body')
    R.bone('beans', tuple(SIEVE), parent='arms')
    R.bone('head', NECK, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'arms', 'beans', 'head']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)

        def shake(f0, n, amp=1.4):
            for i in range(n):
                f = f0 + i * 3
                k('arms', f, move=(amp if i % 2 == 0 else -amp, 0, 0))
                k('beans', f + 1, move=(0, 0, 1.4 if i % 2 == 0 else 0.3))
            k('arms', f0 + n * 3)
            k('beans', f0 + n * 3 + 1)
        # shoki-shoki
        shake(2, 8)
        k('body', 2)
        for i, f in enumerate(range(4, 26, 4)):
            k('body', f, move=(0, 0, 0.5 if i % 2 else 0.0))
        k('body', 28)
        # he peers up to see if you are watching
        k('head', 26)
        k('head', 32, rot=[('X', -16), ('Y', -10)], ease='BACK')
        k('head', 44, rot=[('X', -16), ('Y', -10)])
        k('head', 48)
        # and again, faster
        shake(48, 6, amp=1.8)
        for b in allb:
            k(b, 70)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    P.fill('stone', pt.ramp('#8a8a84', 7, shift=0.06), tone=sh, base=0.08)
    P.tint(P.region('stone') & (np.sin(X * 0.9 + Yc * 1.3) * np.sin(Yc * 0.7 - X * 0.4) > 0.7), pt.ramp('#6a7a5a', 6, shift=0.06), sh)   # moss
    # the river lapping at the stone's foot: a blue band with white ripples
    wet = P.region('stone') & (Z < 1.7 + 0.35 * np.sin(np.arctan2(Yc, X) * 7))
    P.fill(wet, pt.ramp('#5aa0c8', 6, shift=0.05), tone=sh * 0.5, base=0.15)
    P.flat(wet & (np.abs(Z - (1.5 + 0.35 * np.sin(np.arctan2(Yc, X) * 7))) < 0.22), '#d8eef6')
    FUR = pt.ramp('#8a6248', 7, shift=0.07)
    P.fill('fur', FUR, tone=free, base=0.08)
    P.fill('muzzle', pt.ramp('#efe2cc', 6, shift=0.05), tone=free, base=0.1)
    # the servant's kimono: mustard with brown stripes, the dark sash
    P.fill('kimono', pt.ramp('#d8a840', 7, shift=0.06), tone=free, base=0.08)
    P.tint(P.region('kimono') & (np.abs(np.mod(X + 0.3 * Z, 2.4) - 1.2) < 0.35), pt.ramp('#8a5a2a', 6, shift=0.06), free)
    P.fill('obi', pt.ramp('#3a2a2a', 6, shift=0.05), tone=free, base=0.15)
    P.fill('bamboo', pt.ramp('#d8b878', 6, shift=0.06), tone=free, base=0.1)
    P.fill('beans', pt.ramp('#9a2a2a', 6, shift=0.06), tone=free, base=0.15)
    P.tint(P.region('beans') & (np.sin(X * 3.1) * np.sin(Yc * 3.3) > 0.6), pt.ramp('#d8bcae', 5, shift=0.05), free + 0.3)
    # the hand towel: white with indigo polka dots
    P.fill('towel', pt.ramp('#f2eee4', 6, shift=0.05), tone=free, base=0.1)
    P.flat(P.region('towel') & ((np.mod(X, 2.4) - 1.2) ** 2 + (np.mod(Yc + Z, 2.4) - 1.2) ** 2 < 0.3), '#2c3a6a')
    # the face, drawn on: an old comic's happy squint, a dark otter nose, the Y mouth with the tongue out, white whiskers
    hd = (P.region('fur') | P.region('muzzle')) & (P.part == PI['head'])
    fc = face.Face(P, c=(0, HC[1] - 6.0, HC[2] + 0.2), axis=(0, -1, 0.1), where=hd, seed=151)
    fc.eyes('happy', spread=6.6, size=0.7, dy=1.6)
    fc.brows('worried', spread=6.8, dy=3.4, w=2.0, weight=0.32)
    fn = face.Face(P, c=(0, HC[1] - 7.4, HC[2] - 1.6), axis=(0, -1, 0.15), where=hd, seed=152)
    fn.nose('button', 0.0, 0.9, size=0.9)
    fn.mouth('tongue', w=2.6, dy=-0.8)
    fw = face.Face(P, c=(0, HC[1] - 7.0, HC[2] - 1.8), axis=(0, -1, 0.1), where=hd, seed=153, ink='#efe6d2')
    fw.whiskers(0.0, 0.2, spread=4.6, n=3, length=2.6, dots=True)
    P.lines(['kimono'], ['obi', 'fur'], step=1)
    P.lines(['fur'], ['towel', 'muzzle'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 71), skip=[('arms', 'body'), ('head', 'body'), ('beans', 'arms')]),
       cams=[((58, -72, 48), (0, -3, 13)), ((-56, 62, 42), (0, 0, 13))], fold=(0, 6, 36, 56))
