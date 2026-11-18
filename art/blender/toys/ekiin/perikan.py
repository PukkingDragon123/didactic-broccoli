"""あかぼうペリカン Red-Cap Pelican: the station porter (akabō, after the red caps they wore), a pelican hugging a
tower of luggage, his bill resting on top to steady it (series ekiin, concepts_C.md).

The stack stands on the platform in front of him (a brass-cornered trunk, a check suitcase, a hat box), his wings
round it, his pouch full of something a passenger forgot: an umbrella's crook pokes out of it. The red cap, a navy
porter's vest with its brass number badge.
Gimmick: the stack wobbles, he braces, his bill lifts to show the umbrella in the pouch, gulp, and the bill comes
back down on the hat box with a nod.

    tools/blender.sh art/blender/toys/ekiin/perikan.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('ekiin', 'perikan')

SY = -10.8                   # the stack's centre (y)
HC = (0, -3.0, 30.0)         # the head's centre
HINGE = (0, -7.4, 29.2)      # the upper bill's hinge (axis x)

# ------------------------------------------------------------------ the luggage tower
trunk = tk.rbox('trunk', (19.0, 10.4, 6.8), centre=(0, SY, 3.4), bevel=0.8, segs=2)
case = tk.rbox('suitcase', (16.4, 9.0, 6.0), centre=(0.6, SY - 0.2, 6.8 + 3.0), bevel=1.0, segs=2)
tk.rotate(case, 4, 'Z', (0.6, SY, 9.8))
hatbox = tk.lathe('hatbox', [(0, 0), (5.4, 0), (5.6, 0.6), (5.6, 4.6), (5.4, 5.2), (0, 5.2)], n=18, centre=(-0.6, SY - 0.4, 12.8))


def sc_lug(h):
    def f(V, N):  # straps and stitched seams round the luggage
        d = 0.25 * (np.abs(np.abs(V[:, 0]) - 5.2) < 0.7)
        d -= 0.15 * (np.abs(np.mod(V[:, 2], 6.8) - 3.4) < 0.15)
        return d
    tk.push(h, f)


STACK = [cx.low(trunk, 'trunk', 50, lo=0, hi=2, sculpt=sc_lug, region='trunk'), cx.low(case, 'suitcase', 50, lo=0, hi=2, sculpt=sc_lug, region='check'),
         cx.low(hatbox, 'hatbox', 60, lo=0, hi=2, region='hatbox')]
handle = tk.tube('lhandle', [(-3.0, SY - 5.4, 4.6), (-2.6, SY - 6.6, 5.4), (2.6, SY - 6.6, 5.4), (3.0, SY - 5.4, 4.6)], 0.5, n=6)
STACK.append(cx.low(handle, 'lhandle', 20, lo=0, hi=1, region='strap'))

# ------------------------------------------------------------------ the pelican: body, legs, wings round the stack
body = tk.loft('body', [{'c': (0, 4.0, 6.0), 'w': 13.0, 'h': 7.0, 'e': 2.2},
                        {'c': (0, 3.2, 11.0), 'w': 19.0, 'ht': 9.6, 'hb': 9.4, 'e': 2.3},
                        {'c': (0, 2.4, 17.0), 'w': 20.0, 'ht': 9.2, 'hb': 9.6, 'e': 2.3},
                        {'c': (0, 1.6, 22.4), 'w': 15.0, 'ht': 7.0, 'hb': 7.4, 'e': 2.2},
                        {'c': (0, 0.6, 25.6), 'w': 9.6, 'h': 4.8, 'e': 2.1}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.6)


def sc_body(h):
    def f(V, N):  # back feathers in soft rows, the vest's edge
        back = tk.smoothstep(-0.1, 0.6, N[:, 1])
        return 0.2 * (np.abs(np.sin(V[:, 2] * 1.4 + V[:, 0] * 0.3)) ** 6) * back - 0.25 * tk.smoothstep(0.4, 0.0, np.abs(V[:, 2] - 9.0))
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 220, lo=1, hi=3, sculpt=sc_body, region=('white', [('vest', lambda C, N: (C[:, 2] > 9.0) & (C[:, 2] < 22.0))]))
LEGS = []
for sx in (1, -1):
    lg = tk.tube('leg', [(sx * 4.2, 4.0, 7.0), (sx * 4.6, 3.6, 3.0), (sx * 4.8, 3.0, 0.8)], [2.0, 1.4, 1.3], n=8)
    LEGS.append(cx.low(lg, 'leg', 30, lo=1, hi=1, region='orange'))
    ft = tk.slab('foot', [(-2.6, 2.0), (2.6, 2.0), (3.6, -3.4), (1.8, -2.4), (0.0, -4.0), (-1.8, -2.4), (-3.6, -3.4)], 1.0, plane='XY', at=0.5, bevel=0.35, segs=1)
    tk.move(ft, (sx * 4.8, 1.6, 0))
    LEGS.append(cx.low(ft, 'foot', 24, lo=0, hi=1, region='orange'))
tail = tk.loft('tail', [{'c': (0, 10.0, 7.4), 'w': 8.0, 'h': 2.0, 'e': 2.2}, {'c': (0, 13.4, 4.0), 'w': 6.0, 'h': 1.4, 'e': 2.2},
                        {'c': (0, 15.0, 1.2), 'w': 4.6, 'h': 1.0, 'e': 2.2}], n=8, up=(0, 0, 1), cap0='round', cap1='round')
tk.deform(tail, lambda V: np.stack([V[:, 0], V[:, 1], np.maximum(V[:, 2], 0.0)], 1))
LEGS.append(cx.low(tail, 'tail', 30, lo=1, hi=1, region='white'))
WINGS = []
for sx in (1, -1):
    w = tk.loft('wing', [{'c': (sx * 9.0, 2.2, 19.0), 'w': 4.0, 'h': 6.0, 'e': 2.2},
                         {'c': (sx * 11.2, -3.2, 16.0), 'w': 3.4, 'h': 6.2, 'e': 2.2},
                         {'c': (sx * 10.6, -9.4, 12.6), 'w': 3.0, 'h': 5.4, 'e': 2.2},
                         {'c': (sx * 9.4, -13.0, 11.4), 'w': 2.4, 'h': 3.6, 'e': 2.0}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)

    def sc_wing(h, sx=sx):
        def f(V, N):  # long flight feathers, dark tips (painted) over the grooves
            return -0.2 * (np.abs(np.mod(V[:, 1] * 0.6 - V[:, 2] * 0.8, 2.0) - 1.0) < 0.18)
        tk.push(h, f)
    WINGS.append(cx.low(w, 'wing', 70, lo=1, hi=2, sculpt=sc_wing, region=('white', [('tips', lambda C, N: C[:, 1] < -9.0)])))

# ------------------------------------------------------------------ the head: the neck curve, the bill and its pouch
neck = tk.tube('neck', [(0, 1.0, 23.0), (0, 0.4, 26.4), (0, -1.6, 28.6), HC], [4.6, 4.0, 4.2, 4.6], n=10)
head = tk.loft('head', [{'c': (0, HC[1] + 4.0, HC[2] + 0.6), 'w': 7.0, 'h': 3.6, 'e': 2.2}, {'c': (0, HC[1] + 1.0, HC[2] + 0.4), 'w': 10.4, 'h': 5.4, 'e': 2.2},
                        {'c': (0, HC[1] - 2.6, HC[2]), 'w': 9.6, 'h': 5.0, 'e': 2.2}, {'c': (0, HC[1] - 4.8, HC[2] - 0.6), 'w': 6.4, 'h': 3.4, 'e': 2.2}],
                n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.4)
crest = tk.tube('crest', [(0, HC[1] + 2.6, HC[2] + 4.6), (0, HC[1] + 5.0, HC[2] + 5.6), (0, HC[1] + 7.0, HC[2] + 4.6)], [1.0, 0.8, 0.3], n=6, cap1='point')
pouch = tk.loft('pouch', [{'c': (0, -8.0, 27.0), 'w': 6.4, 'ht': 1.6, 'hb': 2.4, 'e': 2.2},
                          {'c': (0, -12.4, 24.6), 'w': 9.4, 'ht': 1.6, 'hb': 5.0, 'e': 2.2},     # the sack: full of a forgotten umbrella
                          {'c': (0, -17.4, 23.4), 'w': 8.6, 'ht': 1.4, 'hb': 4.4, 'e': 2.2},
                          {'c': (0, -21.0, 23.2), 'w': 3.6, 'ht': 0.8, 'hb': 1.2, 'e': 2.2}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HEADP = [cx.low(neck, 'neck', 60, lo=1, hi=2, region='white'), cx.low(head, 'head', 110, lo=1, hi=2, region='white'),
         cx.low(crest, 'crest', 20, lo=0, hi=1, region='white'), cx.low(pouch, 'pouch', 90, lo=1, hi=2, region='pouch')]
umb = tk.tube('umbrella', [(2.6, -15.0, 26.4), (2.8, -15.2, 28.6), (3.0, -16.8, 29.6), (3.2, -18.0, 28.6)], 0.55, n=6, cap0='round', cap1='round')
HEADP.append(cx.low(umb, 'umbrella', 24, lo=0, hi=1, region='umb'))
CAP = cx.station_cap((0, HC[1] + 0.8, HC[2] + 4.2), r=4.6, h=3.8, tilt=-14, visor=0.9)
HEADP += CAP
bill = tk.loft('bill', [{'c': (0, HINGE[1] + 0.6, HINGE[2] + 0.8), 'w': 5.6, 'ht': 1.6, 'hb': 0.8, 'e': 2.4},
                        {'c': (0, -12.6, 28.2), 'w': 5.0, 'ht': 1.3, 'hb': 0.6, 'e': 2.6},
                        {'c': (0, -18.0, 26.6), 'w': 4.0, 'ht': 1.1, 'hb': 0.5, 'e': 2.6},
                        {'c': (0, -21.8, 25.4), 'w': 2.8, 'ht': 1.4, 'hb': 0.6, 'e': 2.4}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
bill_lo, bill_hi = cx.low(bill, 'bill', 60, lo=1, hi=2, region=('bill', [('hook', lambda C, N: C[:, 1] < -20.6)]))

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body_lo] + [l[0] for l in LEGS], 'body'), [body_hi] + [l[1] for l in LEGS], bone='root')
F.part('stack', tk.join([s_[0] for s_ in STACK] + [w[0] for w in WINGS], 'stack'), [s_[1] for s_ in STACK] + [w[1] for w in WINGS], bone='stack')
F.part('head', tk.join([h_[0] for h_ in HEADP], 'head'), [h_[1] for h_ in HEADP], bone='head')
F.part('bill', bill_lo, [bill_hi], bone='bill')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('stack', (0, SY, 0.0), parent='root')
    R.bone('head', (0, 0.8, 23.0), parent='root')
    R.bone('bill', HINGE, parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'stack', 'head', 'bill']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the tower wobbles; he braces (the head rides it)
        for i, f in enumerate((4, 9, 14, 19, 23)):
            a = (2.4, -2.0, 1.4, -0.8, 0.0)[i]
            k('stack', f, rot=('Y', a))
            k('head', f, rot=('Y', a * 1.3))
        # the bill lifts: there is the umbrella in his pouch; gulp; the bill comes back down on the hat box
        k('bill', 24)
        k('bill', 30, rot=('X', -34), ease='BACK')
        k('bill', 44, rot=('X', -34))
        k('bill', 48)
        k('head', 26)
        k('head', 32, rot=('X', -8))
        k('head', 44, rot=('X', -8))
        k('head', 48, rot=('X', -2))
        k('head', 52, move=(0, 0, -0.6))   # gulp
        k('head', 56)
        k('head', 62, rot=('X', 6))
        k('head', 68)
        k('root', 50)
        k('root', 53, scale=(1.02, 1.02, 0.97))
        k('root', 57, ease='BOUNCE')
        for b in allb:
            k(b, 74)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    tone = np.where(P.part == PI['body'], sh, free)
    P.fill('white', pt.ramp('#f2eee6', 7, shift=0.06), tone=tone, base=0.05)
    P.fill('tips', pt.ramp('#3a3a42', 6, shift=0.05), tone=free, base=0.15)
    P.fill('orange', pt.ramp('#e89a4a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('bill', pt.ramp('#efb07a', 7, shift=0.06), tone=free, base=0.1)
    P.fill('hook', pt.ramp('#d4603c', 6, shift=0.06), tone=free, base=0.1)
    P.fill('pouch', pt.ramp('#f2c46a', 7, shift=0.06), tone=free, base=0.05)
    P.fill('umb', pt.ramp('#3a2a2a', 6, shift=0.05), tone=free, base=0.2)
    # the navy porter's vest, its brass number badge
    NAVY = pt.ramp('#2c3a5c', 7, shift=0.06)
    P.fill('vest', NAVY, tone=sh, base=0.12)
    vm = P.region('vest')
    P.flat(vm & ((X - 4.6) ** 2 + (Z - 19.0) ** 2 < 1.6) & (on[:, :, 1] < -0.3), '#d8b04a')
    P.flat(vm & (np.abs(X - 4.6) < 0.25) & (np.abs(Z - 19.0) < 0.75) & (on[:, :, 1] < -0.3), '#5a3a1a')
    # the red cap (akabō), a white band stripe
    RED = pt.ramp('#d03a36', 7, shift=0.06)
    P.fill('cap', RED, tone=free, base=0.1)
    P.fill('band', RED, tone=free, base=-0.08)
    P.fill('visor', pt.ramp('#26262c', 6, shift=0.05), tone=free * 1.3, base=0.3)
    P.fill('badge', pt.ramp('#e2b84c', 6, shift=0.06), tone=free, base=0.2)
    # the luggage: a brown trunk with brass corners and straps, a red check suitcase, a striped hat box
    P.fill('trunk', pt.ramp('#8a5a36', 7, shift=0.06), tone=free, base=0.08)
    tm = P.region('trunk')
    P.flat(tm & (np.abs(np.abs(X) - 5.2) < 0.7), '#4a2e1c')
    P.flat(tm & (np.abs(X) > 8.6) & ((Z > 5.8) | (Z < 1.0)), '#d0a84a')
    P.fill('check', pt.ramp('#c84a3c', 7, shift=0.06), tone=free, base=0.05)
    cm = P.region('check')
    P.tint(cm & (np.abs(np.mod(X, 2.2) - 1.1) < 0.3), pt.ramp('#7a2a26', 6, shift=0.06), free)
    P.tint(cm & (np.abs(np.mod(Z + Yc * 0.0, 2.2) - 1.1) < 0.3), pt.ramp('#7a2a26', 6, shift=0.06), free)
    P.flat(cm & (np.abs(np.mod(X, 2.2) - 1.1) < 0.12) & (np.abs(np.mod(Z, 2.2) - 1.1) < 0.12), '#f2d27a')
    P.fill('hatbox', pt.ramp('#efe0c4', 7, shift=0.06), tone=free, base=0.08)
    hb = P.region('hatbox')
    P.tint(hb & (np.abs(np.mod(np.degrees(np.arctan2(Yc - SY + 0.4, X + 0.6)), 30) - 15) < 6) & (np.abs(on[:, :, 2]) < 0.5), pt.ramp('#5a8aa4', 6, shift=0.06), free)
    P.fill('strap', pt.ramp('#4a2e1c', 5, shift=0.05), tone=free, base=0.1)
    # the face, drawn on: little worried dots each side of the head, worried brows, a bead of sweat
    for sx in (1, -1):
        fc = face.Face(P, c=(sx * 4.6, HC[1] - 1.4, HC[2] + 0.6), axis=(sx * 0.8, -0.55, 0.15), where=P.region('white') & (P.part == PI['head']), seed=81 + sx)
        fc.dot(0.0, 0.0, 0.55, 0.72, rot=8 * sx)
        fc.stroke([(-sx * 0.9, 1.2), (sx * 0.9, 1.75)], weight=0.36)
        if sx > 0:
            fc.drop(-1.8 * sx, 2.2, r=0.55)
    P.lines(['white'], ['vest', 'orange', 'bill', 'pouch', 'cap', 'band'], step=1)
    P.lines(['trunk', 'check', 'hatbox'], None, step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 75), skip=[('head', 'body'), ('bill', 'head'), ('stack', 'body')]),
       cams=[((66, -80, 52), (0, -4, 16)), ((-62, 70, 46), (0, 0, 16))], fold=(0, 10, 32, 52))
