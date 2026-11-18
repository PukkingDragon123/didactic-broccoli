"""キップきりキツツキ Ticket Woodpecker: the wicket clipper of a Shōwa station, a great spotted woodpecker in the
railway's peaked cap (series ekiin, concepts_C.md).

He stands on his feet and his stiff tail (a woodpecker's tripod), a ticket held up in one wing and the steel ticket
clipper in the other, a red armband on his sleeve. Black and white plumage, the red under the tail.
Gimmick: the clipper twirls (kachi-kachi, the clippers' habit), then he raises the ticket and punches it with his
beak, peck, peck, peck, and straightens up.

    tools/blender.sh art/blender/toys/ekiin/kitsutsuki.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('ekiin', 'kitsutsuki')

HC = (0, -0.8, 30.6)          # the head's centre
NECK = (0, 0.6, 24.2)         # the head's pivot
SH = {sx: (sx * 7.2, 0.4, 21.6) for sx in (1, -1)}   # shoulders (the wings' pivots)
TICKET = (5.0, -12.2, 17.0)
CLIP = (-6.4, -11.0, 18.4)

# ------------------------------------------------------------------ body and tail
body = tk.loft('body', [{'c': (0, 0.6, 3.4), 'w': 10.0, 'h': 8.4, 'e': 2.2},
                        {'c': (0, 0.2, 7.6), 'w': 15.6, 'ht': 7.6, 'hb': 7.0, 'e': 2.3},
                        {'c': (0, 0.0, 13.6), 'w': 17.2, 'ht': 8.2, 'hb': 7.6, 'e': 2.3},
                        {'c': (0, 0.2, 19.6), 'w': 15.6, 'ht': 7.4, 'hb': 7.2, 'e': 2.3},
                        {'c': (0, 0.4, 24.0), 'w': 11.6, 'ht': 5.6, 'hb': 5.6, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.4)


def sc_body(h):
    def f(V, N):  # breast feathers: soft overlapping rows on the white front
        front = tk.smoothstep(-0.2, -0.7, N[:, 1])
        row = np.floor(V[:, 2] / 2.2)
        u = V[:, 0] / 2.6 + 0.5 * np.mod(row, 2)
        fu, fv = np.mod(u, 1.0) - 0.5, np.mod(V[:, 2] / 2.2, 1.0)
        return 0.22 * (1 - (2 * fu) ** 2) * (1 - fv) ** 2 * front
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 230, lo=1, hi=3, sculpt=sc_body, region=('black', [
    ('white', lambda C, N: (N[:, 1] < -0.35) & (C[:, 2] > 6.5)),
    ('red', lambda C, N: (C[:, 2] < 4.2) & (N[:, 2] < 0.2))]))
tail = tk.slab('tail', [(-3.6, 0.0), (3.6, 0.0), (4.6, -9.0), (3.0, -11.6), (1.4, -10.4), (0.0, -12.2), (-1.4, -10.4), (-3.0, -11.6), (-4.6, -9.0)], 1.6,
               plane='XZ', at=0.0, bevel=0.5, segs=1)
tk.rotate(tail, 34, 'X')
tk.move(tail, (0, 5.4, 10.6))
tk.deform(tail, lambda V: np.stack([V[:, 0], V[:, 1] + 0.05 * V[:, 0] ** 2, np.maximum(V[:, 2], 0.0)], 1))


def sc_tail(h):
    def f(V, N):  # the stiff tail's feather shafts
        return -0.2 * (np.abs(np.mod(V[:, 0] + 0.7, 1.4) - 0.7) < 0.16)
    tk.push(h, f)


tail_lo, tail_hi = cx.low(tail, 'tail', 50, lo=1, hi=2, sculpt=sc_tail, region='black')

# feet: zygodactyl, two toes forward, gripping the ground
FEET = []
for sx in (1, -1):
    for a, ln in ((-14, 4.2), (14, 4.0), (165, 2.8)):
        d = (math.sin(math.radians(a)), -math.cos(math.radians(a)))
        x0 = sx * 3.6
        toe = tk.tube('toe', [(x0, -1.4, 2.6), (x0 + d[0] * ln * 0.5, -1.4 + d[1] * ln * 0.5, 1.0), (x0 + d[0] * ln, -1.4 + d[1] * ln, 0.55)], [1.1, 0.9, 0.55],
                      n=6, cap0='round', cap1='round')
        tk.deform(toe, lambda V: np.stack([V[:, 0], V[:, 1], np.maximum(V[:, 2], 0.0)], 1))
        FEET.append(cx.low(toe, 'toe', 18, lo=0, hi=1, region='foot'))

# ------------------------------------------------------------------ the head, beak and cap
head = tk.loft('head', [{'c': (0, HC[1] + 6.8, HC[2] + 0.4), 'w': 8.0, 'h': 4.6, 'e': 2.2},
                        {'c': (0, HC[1] + 4.2, HC[2] + 0.2), 'w': 15.2, 'h': 7.4, 'e': 2.3},
                        {'c': (0, HC[1], HC[2]), 'w': 17.0, 'h': 8.0, 'e': 2.3},
                        {'c': (0, HC[1] - 4.2, HC[2] - 0.4), 'w': 14.2, 'h': 6.8, 'e': 2.3},
                        {'c': (0, HC[1] - 6.4, HC[2] - 0.6), 'w': 7.2, 'h': 4.0, 'e': 2.2}], n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
head_lo, head_hi = cx.low(head, 'head', 200, lo=1, hi=3, region=('black', [
    ('white', lambda C, N: (C[:, 2] < HC[2] + 3.4) & (np.abs(N[:, 0]) > 0.35) & (C[:, 1] < HC[1] + 4.6) | ((N[:, 1] < -0.55) & (C[:, 2] < HC[2] + 2.6))),
    ('red', lambda C, N: (C[:, 1] > HC[1] + 6.0) & (C[:, 2] > HC[2] - 1.6) & (C[:, 2] < HC[2] + 3.0))]))
beak = tk.loft('beak', [{'c': (0, HC[1] - 6.0, HC[2] - 0.8), 'w': 4.6, 'ht': 2.0, 'hb': 2.0, 'e': 2.6},
                        {'c': (0, HC[1] - 9.6, HC[2] - 1.2), 'w': 2.8, 'ht': 1.3, 'hb': 1.3, 'e': 2.6},
                        {'c': (0, HC[1] - 12.6, HC[2] - 1.5), 'w': 1.4, 'ht': 0.6, 'hb': 0.6, 'e': 2.6}], n=8, up=(0, 0, 1), cap0='round', cap1='point', capd=0.6)
beak_lo, beak_hi = cx.low(beak, 'beak', 40, lo=1, hi=2, region='beak')
CAP = cx.station_cap((0, HC[1] + 0.6, HC[2] + 5.0), r=5.6, h=4.6, tilt=-12)

# ------------------------------------------------------------------ wings as arms: one holds the ticket up, one the clipper
WINGS = {}
for sx, nm, hand in ((1, 'wing_l', TICKET), (-1, 'wing_r', CLIP)):
    s = np.array(SH[sx])
    hnd = np.array(hand) + np.array((sx * 0.6, 2.4, -0.8))
    mid = (s + hnd) / 2 + np.array((sx * 3.0, 1.6, -1.6))
    w = tk.loft(nm, [{'c': tuple(s), 'w': 7.6, 'h': 2.4, 'e': 2.2},
                     {'c': tuple(mid), 'w': 7.8, 'h': 2.2, 'e': 2.3},
                     {'c': tuple(hnd), 'w': 5.6, 'h': 1.7, 'e': 2.3},
                     {'c': tuple(hnd + (hnd - mid) / np.linalg.norm(hnd - mid) * 3.0), 'w': 3.0, 'h': 1.1, 'e': 2.0}], n=10, up=(sx, 0, 0), cap0='round', cap1='round', capd=1.0)

    def sc_wing(h, sx=sx):
        def f(V, N):  # the flight feathers' white bars (sculpted as shallow steps)
            return -0.18 * (np.abs(np.mod(V[:, 1] * 0.7 + V[:, 2] * 0.5, 2.2) - 1.1) < 0.2)
        tk.push(h, f)
    lo, hi = cx.low(w, nm, 90, lo=1, hi=2, sculpt=sc_wing, region=('black', [('arm', lambda C, N, s=s: np.linalg.norm(C - (s + np.array((0, -1.0, -3.6))), axis=1) < 3.4)]))
    WINGS[nm] = (lo, hi, tuple(s))
tk_ = tk.slab('ticket', [(-3.0, -2.0), (3.0, -2.0), (3.0, 2.0), (-3.0, 2.0)], 0.5, plane='XZ', at=0.0, bevel=0.15, segs=1)
tk.rotate(tk_, -25, 'X')
tk.rotate(tk_, 20, 'Z')
tk.move(tk_, TICKET)
ticket = cx.low(tk_, 'ticket', 20, lo=0, hi=1, region='ticket')
# the clipper: two handles, a hinge and the punch jaws (a station clipper's silhouette)
clp = tk.slab('clipper', [(-0.6, -5.6), (0.6, -5.6), (0.9, -0.8), (1.8, 0.6), (1.4, 3.0), (0.4, 3.4), (-0.4, 3.4), (-1.4, 3.0), (-1.8, 0.6), (-0.9, -0.8)], 1.6,
              plane='YZ', at=0.0, bevel=0.35, segs=1)
tk.rotate(clp, -35, 'X')
tk.move(clp, CLIP)
clipper = cx.low(clp, 'clipper', 40, lo=0, hi=1, region='steel')

# ------------------------------------------------------------------ parts
F.part('body', tk.join([body_lo, tail_lo] + [f[0] for f in FEET], 'body'), [body_hi, tail_hi] + [f[1] for f in FEET], bone='root')
F.part('head', tk.join([head_lo, beak_lo] + [c[0] for c in CAP], 'head'), [head_hi, beak_hi] + [c[1] for c in CAP], bone='head')
F.part('wing_l', tk.join([WINGS['wing_l'][0], ticket[0]], 'wing_l'), [WINGS['wing_l'][1], ticket[1]], bone='wing_l')
F.part('wing_r', WINGS['wing_r'][0], [WINGS['wing_r'][1]], bone='wing_r')
F.part('clipper', clipper[0], [clipper[1]], bone='clipper', kind='metal')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('head', NECK, parent='root')
    for nm in ('wing_l', 'wing_r'):
        R.bone(nm, WINGS[nm][2], parent='root')
    R.bone('clipper', CLIP, parent='wing_r')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'head', 'wing_l', 'wing_r', 'clipper']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # kachi-kachi: the clipper twirls twice in his raised wing
        k('wing_r', 2)
        k('wing_r', 7, rot=('X', -14), ease='BACK')
        k('clipper', 4)
        k('clipper', 12, rot=('Y', 180), ease='LINEAR')
        k('clipper', 20, rot=('Y', 360), ease='LINEAR')
        k('clipper', 26, rot=('Y', 380))
        k('clipper', 30, rot=('Y', 360), ease='BACK')
        k('wing_r', 28, rot=('X', -14))
        k('wing_r', 34)
        # the ticket comes up and he punches it: peck, peck, peck (a little lean back first)
        k('wing_l', 26)
        k('wing_l', 32, rot=('X', -16), ease='BACK')
        k('wing_l', 62, rot=('X', -16))
        k('wing_l', 68)
        k('head', 28)
        k('head', 32, rot=('X', -8))
        for f in (36, 44, 52):
            k('head', f, rot=('X', 24), ease='LINEAR')
            k('head', f + 4, rot=('X', -2))
        k('head', 60)
        k('root', 56)
        k('root', 62, move=(0, 0, 1.0), scale=(0.98, 0.98, 1.03))
        k('root', 68, ease='BOUNCE')
        for b in allb:
            k(b, 76)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    BLACK = pt.ramp('#33323a', 7, shift=0.06)
    WHITE = pt.ramp('#efebe2', 7, shift=0.06)
    tone = np.where(P.part == 0, sh, free)
    # the plumage as smooth painted masks (the sculpt's region faces would step): black, the white front and cheeks, red
    plum = P.region('black') | P.region('white') | P.region('red')
    P.fill(plum, BLACK, tone=tone, base=0.2)
    bodym = plum & (P.part == 0)
    hd0 = plum & (P.part == 1)
    white = (bodym & (on[:, :, 1] < -0.32) & (Z > 4.4) & (Z < 24.5)) | \
            (hd0 & (((Z < HC[2] + 3.2 - 0.25 * np.clip(Yc - HC[1], 0, None)) & (np.abs(on[:, :, 0]) > 0.3) & (Yc < HC[1] + 4.2)) | ((on[:, :, 1] < -0.5) & (Z < HC[2] + 2.4))))
    P.fill(white, WHITE, tone=tone, base=0.05)
    RED = pt.ramp('#d2343c', 6, shift=0.06)
    P.fill(bodym & (Z < 4.6) & (on[:, :, 1] < 0.4), RED, tone=tone, base=0.1)
    P.fill(hd0 & ((Yc - (HC[1] + 6.6)) ** 2 / 4.0 + (Z - (HC[2] + 0.8)) ** 2 / 6.0 < 1) & (on[:, :, 1] > 0.3), RED, tone=free, base=0.1)
    P.fill('beak', pt.ramp('#5a5a62', 6, shift=0.05), tone=free, base=0.2)
    P.fill('foot', pt.ramp('#7a6e70', 6, shift=0.05), tone=sh, base=0.1)
    # the wings' white bars and the big white shoulder patch of a great spotted woodpecker
    wing = P.region('black') & ((P.part == 2) | (P.part == 3))
    du, dv = np.mod(Z * 0.8 + Yc * 0.3, 2.2) - 1.1, np.mod(Yc * 0.8 - Z * 0.3 + np.floor((Z * 0.8 + Yc * 0.3) / 2.2) * 1.1, 2.4) - 1.2
    P.tint(wing & (du ** 2 / 0.32 + dv ** 2 / 0.4 < 1), WHITE, free - 0.05)
    P.tint(P.region('black') & (P.part == 0) & (np.abs(on[:, :, 0]) > 0.5) & (Z > 15.0) & (Z < 21.0) & (Yc > -2.5) & (Yc < 3.5), WHITE, sh)
    # the red armband on the clipper wing's upper arm
    P.fill('arm', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.1)
    arm = P.region('arm')
    P.flat(arm & (np.abs(Z - (SH[-1][2] - 3.6)) < 0.35), '#f2dc8a')
    hd = P.part == 1
    # the cap: railway navy, a gold band stripe, a black glossy visor, the gold badge
    NAVY = pt.ramp('#2c3a5c', 7, shift=0.06)
    P.fill('cap', NAVY, tone=free, base=0.15)
    P.fill('band', NAVY, tone=free, base=-0.05)
    P.flat(P.region('band') & (np.abs(Z - (HC[2] + 5.0 + 1.0)) < 0.28), '#d8b04a')
    P.fill('visor', pt.ramp('#26262c', 6, shift=0.05), tone=free * 1.3, base=0.3)
    P.fill('badge', pt.ramp('#e2b84c', 6, shift=0.06), tone=free, base=0.2)
    # the ticket: a cardboard ticket (pale green, a red stripe), the clipper's bright steel
    P.fill('ticket', pt.ramp('#d6e2c4', 6, shift=0.05), tone=free * 0.5, base=0.2)
    tkm = P.region('ticket')
    P.flat(tkm & (np.abs((Z - TICKET[2]) * 0.9 + (X - TICKET[0]) * 0.1) < 0.35), '#c8343c')
    P.fill('steel', pt.ramp('#b8c0c8', 7, dark=0.7, light=0.7, shift=0.05), tone=free * 1.4, base=0.15)
    # the face, drawn on: stern little dots under the cap, a determined brow, beak-side mouth line
    for sx in (1, -1):
        fc = face.Face(P, c=(sx * 6.0, HC[1] - 2.6, HC[2] + 0.6), axis=(sx * 0.75, -0.65, 0.05), where=hd & ~P.region('beak') & ~P.region('cap') & ~P.region('visor') & ~P.region('band'), seed=51 + sx)
        fc.dot(0.0, 0.0, 0.62, 0.82, rot=6 * sx)
        fc.stroke([(-sx * 0.8, 1.6), (sx * 1.0, 1.25)], weight=0.42)
    P.lines(['black', 'white', 'red'], ['beak', 'arm', 'cap', 'visor'], step=1)
    P.lines(['cap'], ['visor', 'band'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 77), skip=[('head', 'body'), ('wing_l', 'body'), ('wing_r', 'body'), ('clipper', 'wing_r')]),
       cams=[((62, -76, 52), (0, -2, 20)), ((-60, 68, 46), (0, 0, 20))], fold=(0, 14, 38, 62))
