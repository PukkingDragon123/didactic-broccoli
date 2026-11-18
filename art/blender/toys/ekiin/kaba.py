"""おしやカバ Pusher Hippo: the rush-hour pusher (oshiya) of a Shōwa platform, a hippo in the railway's navy jacket,
cap and white gloves, with the biggest backside on the line (series ekiin, concepts_C.md).

He stands on the platform edge (the yellow tactile strip, the white line) with his back to a packed carriage: a cream
and maroon car side with the doorway full of commuters and a briefcase still sticking out of it.
Gimmick: he steps forward, wiggles, and shoves backwards with his rump: the briefcase goes in, he steps away, the
doors slide shut, and he dusts off his gloves.

    tools/blender.sh art/blender/toys/ekiin/kaba.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
F = Fig('ekiin', 'kaba')

BZ = 3.0                     # the platform's top
WY = 10.0                    # the car side's front face (y)
OPX, OPZ = 9.6, BZ + 27.0    # the doorway's half width and top
HY = -1.2                    # the hippo's centre line (y)
HEAD = (0, HY - 2.6, BZ + 29.0)
SH = {sx: (sx * 10.2, HY + 1.0, BZ + 21.0) for sx in (1, -1)}

# ------------------------------------------------------------------ the platform and the carriage side
plat = tk.rbox('plat', (50.0, 28.0, BZ), centre=(0, -2.0, BZ / 2), bevel=0.8, segs=1)
plat_lo, plat_hi = cx.low(plat, 'plat', 40, lo=0, hi=1, region='concrete')
car = tk.rbox('car', (50.0, 3.4, BZ + 34.0), centre=(0, WY + 1.7, (BZ + 34.0) / 2 + 0.01), bevel=1.2, segs=2)
for o_ in (car,):
    tk.boolean(o_, tk.rbox('door', (2 * OPX, 8.0, OPZ - BZ + 0.2), centre=(0, WY + 1.7, (OPZ + BZ) / 2 - 0.1), bevel=0.6, segs=1))


def sc_car(h):
    def f(V, N):  # the rivet line and the window frames' raised edges on the car side
        side = N[:, 1] < -0.8
        d = 0.2 * (np.abs(V[:, 2] - (BZ + 16.0)) < 0.3) * side
        for wx in (-17.5, 17.5):
            d += 0.25 * (np.abs(np.maximum(np.abs(V[:, 0] - wx) - 4.6, np.abs(V[:, 2] - (BZ + 25.0)) - 4.4)) < 0.3) * side
        return d
    tk.push(h, f)


car_lo, car_hi = cx.low(car, 'car', 160, lo=0, hi=2, sculpt=sc_car, region=('cream', [
    ('maroon', lambda C, N: C[:, 2] < BZ + 16.0), ('inside', lambda C, N: (np.abs(C[:, 0]) < OPX + 0.2) & (C[:, 2] < OPZ + 0.2) & (C[:, 1] > WY + 0.1))]))
crowd = tk.rbox('crowd', (2 * OPX + 1.0, 1.0, OPZ - BZ), centre=(0, WY + 3.0, (OPZ + BZ) / 2), bevel=0.3, segs=1)
crowd_lo, crowd_hi = cx.low(crowd, 'crowd', 12, lo=0, hi=1, region='crowd')

# the doors: two leaves slid open to the sides of the doorway
DOORS = {}
for sx, nm in ((1, 'door_l'), (-1, 'door_r')):
    d = tk.rbox(nm, (OPX + 0.4, 1.0, OPZ - BZ - 0.4), centre=(sx * (OPX + OPX / 2 + 0.2), WY - 0.6, (OPZ + BZ) / 2), bevel=0.35, segs=1)
    tk.boolean(d, tk.rbox('win', (OPX - 3.4, 3.0, 9.0), centre=(sx * (OPX + OPX / 2 + 0.2), WY - 0.6, BZ + 21.0), bevel=0.8, segs=1))
    lo, hi = cx.low(d, nm, 60, lo=0, hi=1, region=('door', [('glass', lambda C, N: (np.abs(N[:, 1]) < 0.5) & (C[:, 2] > BZ + 16.0) & (C[:, 2] < BZ + 26.0))]))
    DOORS[nm] = (lo, hi, sx)

# the briefcase still sticking out of the doorway (top right)
bc = tk.rbox('case', (7.0, 6.0, 5.2), centre=(5.6, WY - 1.6, BZ + 25.2), bevel=0.8, segs=2)
tk.rotate(bc, -14, 'Y', (5.6, WY - 1.6, BZ + 25.2))
hnd = tk.tube('handle', [(3.6, WY - 1.6, BZ + 28.0), (4.0, WY - 1.6, BZ + 29.4), (6.6, WY - 1.6, BZ + 29.0), (7.0, WY - 1.6, BZ + 27.6)], 0.5, n=6)
tk.rotate(hnd, -14, 'Y', (5.6, WY - 1.6, BZ + 25.2))
CASE = [cx.low(bc, 'case', 40, lo=0, hi=2, region='leather'), cx.low(hnd, 'handle', 20, lo=0, hi=1, region='leather')]

# ------------------------------------------------------------------ the hippo
body = tk.loft('body', [{'c': (0, HY + 0.6, BZ + 7.6), 'w': 18.0, 'ht': 7.6, 'hb': 8.0, 'e': 2.3},
                        {'c': (0, HY + 0.8, BZ + 12.0), 'w': 23.0, 'ht': 9.0, 'hb': 9.8, 'e': 2.4},     # the rump bulges back
                        {'c': (0, HY + 0.2, BZ + 18.0), 'w': 22.4, 'ht': 9.4, 'hb': 8.4, 'e': 2.4},
                        {'c': (0, HY - 0.2, BZ + 23.4), 'w': 18.4, 'ht': 8.4, 'hb': 7.0, 'e': 2.3},
                        {'c': (0, HY - 0.6, BZ + 26.6), 'w': 13.0, 'ht': 6.4, 'hb': 5.4, 'e': 2.2}], n=18, up=(0, -1, 0), cap0='round', cap1='round', capd=1.6)


def sc_body(h):
    def f(V, N):
        # the jacket: its hem, the front opening, the pocket flaps; the tail stub on the rump
        d = 0.3 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 2] - (BZ + 11.2))) * (N[:, 2] > -0.5)
        d -= 0.25 * tk.smoothstep(0.35, 0.0, np.abs(V[:, 0])) * (N[:, 1] < -0.6) * (V[:, 2] > BZ + 11.2)
        for sx in (1, -1):
            d += 0.25 * ((np.abs(V[:, 0] - sx * 5.6) < 2.6) & (np.abs(V[:, 2] - (BZ + 15.6)) < 0.5)) * (N[:, 1] < -0.5)
        d += tk.bump(V, (0, HY + 10.4, BZ + 12.4), 1.8, 1.4)
        return d
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 260, lo=1, hi=3, sculpt=sc_body, region=('navy', [('hide', lambda C, N: C[:, 2] < BZ + 11.0)]))

head = tk.loft('head', [{'c': (HEAD[0], HEAD[1] + 4.6, HEAD[2] + 0.6), 'w': 11.0, 'h': 4.6, 'e': 2.2},
                        {'c': (HEAD[0], HEAD[1] + 2.4, HEAD[2] + 0.8), 'w': 14.0, 'ht': 5.8, 'hb': 5.4, 'e': 2.3},
                        {'c': (HEAD[0], HEAD[1] - 1.4, HEAD[2] + 0.2), 'w': 14.6, 'ht': 5.4, 'hb': 5.6, 'e': 2.4},
                        {'c': (HEAD[0], HEAD[1] - 5.4, HEAD[2] - 1.2), 'w': 17.4, 'ht': 4.8, 'hb': 5.4, 'e': 2.6},   # the big muzzle
                        {'c': (HEAD[0], HEAD[1] - 8.6, HEAD[2] - 1.6), 'w': 16.4, 'ht': 4.2, 'hb': 4.8, 'e': 2.7}], n=18, up=(0, 0, 1), cap0='round', cap1='round', capd=1.8)


def sc_head(h):
    def f(V, N):
        d = np.zeros(len(V))
        for sx in (1, -1):
            d += tk.bump(V, (sx * 4.0, HEAD[1] - 0.6, HEAD[2] + 5.0), 2.4, 1.3)    # eye bumps on top
            d += tk.bump(V, (sx * 3.4, HEAD[1] - 8.4, HEAD[2] + 2.0), 1.8, 0.6)    # nostril bumps
            d -= tk.bump(V, (sx * 3.4, HEAD[1] - 8.8, HEAD[2] + 2.4), 0.8, 0.5)    # nostrils
            d += tk.bump(V, (sx * 7.6, HEAD[1] - 5.6, HEAD[2] - 2.0), 3.6, 0.9)    # puffed cheeks (effort)
        return d
    tk.push(h, f)


head_lo, head_hi = cx.low(head, 'head', 230, lo=1, hi=3, sculpt=sc_head, region='hide')
EARS = []
for sx in (1, -1):
    e = tk.lathe('ear', [(0, -0.4), (1.6, -0.2), (1.8, 1.0), (1.1, 2.2), (0, 2.5)], n=8)
    tk.scale(e, (1, 0.6, 1))
    tk.rotate(e, sx * 30, 'Y')
    tk.move(e, (sx * 6.0, HEAD[1] + 3.6, HEAD[2] + 4.4))
    EARS.append(cx.low(e, 'ear', 24, lo=0, hi=1, region='hide'))
CAP = cx.station_cap((0, HEAD[1] + 2.6, HEAD[2] + 5.2), r=5.0, h=4.0, tilt=-16, scale=(1.0, 1.05, 1.0))

LEGS = []
for sx in (1, -1):
    lg = tk.loft('leg', [{'c': (sx * 5.6, HY, BZ + 8.0), 'w': 7.6, 'h': 3.8, 'e': 2.2}, {'c': (sx * 6.2, HY - 0.4, BZ + 2.0), 'w': 7.4, 'h': 3.8, 'e': 2.3},
                         {'c': (sx * 6.4, HY - 1.0, BZ), 'w': 8.2, 'h': 4.6, 'e': 2.6}], n=10, up=(0, -1, 0), cap0='round', cap1='flat')
    LEGS.append(cx.low(lg, 'leg', 50, lo=1, hi=2, region=('navy', [('hide', lambda C, N: C[:, 2] < BZ + 1.6)])))

# arms reaching back to the doorway's posts, white gloves gripping them
ARMS = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    s = np.array(SH[sx])
    hand = np.array((sx * (OPX + 1.0), WY - 1.6, BZ + 19.0))
    mid = (s + hand) / 2 + np.array((sx * 2.2, -0.8, -1.2))
    a = tk.tube(nm, [tuple(s), tuple(mid), tuple(hand - (hand - mid) / np.linalg.norm(hand - mid) * 1.6)], [3.0, 2.7, 2.5], n=10)
    g = tk.lathe('glove', [(0, -2.6), (2.0, -2.2), (2.7, -0.4), (2.4, 1.4), (1.2, 2.6), (0, 2.8)], n=10, centre=tuple(hand))
    ARMS[nm] = (cx.low(a, nm, 60, lo=1, hi=2, region='navy'), cx.low(g, 'glove', 40, lo=1, hi=2, region='glove'), tuple(s))

# ------------------------------------------------------------------ parts
F.part('set', tk.join([plat_lo, car_lo, crowd_lo], 'set'), [plat_hi, car_hi, crowd_hi], bone='root')
for nm, (lo, hi, sx) in DOORS.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss')
F.part('case', tk.join([c[0] for c in CASE], 'case'), [c[1] for c in CASE], bone='case')
F.part('hippo', tk.join([body_lo] + [l[0] for l in LEGS], 'hippo'), [body_hi] + [l[1] for l in LEGS], bone='hippo')
F.part('head', tk.join([head_lo] + [e[0] for e in EARS] + [c[0] for c in CAP], 'head'), [head_hi] + [e[1] for e in EARS] + [c[1] for c in CAP], bone='head')
for nm, (a, g, s) in ARMS.items():
    F.part(nm, tk.join([a[0], g[0]], nm), [a[1], g[1]], bone=nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    for nm, (lo, hi, sx) in DOORS.items():
        R.bone(nm, (sx * OPX * 1.5, WY - 0.6, BZ + 14), parent='root')
    R.bone('case', (5.6, WY - 1.6, BZ + 25.2), parent='root')
    R.bone('hippo', (0, HY, BZ), parent='root')
    R.bone('head', (0, HY - 0.6, BZ + 25.4), parent='hippo')
    for nm, (a, g, s) in ARMS.items():
        R.bone(nm, s, parent='hippo')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'door_l', 'door_r', 'case', 'hippo', 'head', 'arm_l', 'arm_r']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # a step forward (the arms let go of the posts), a wiggle, then the shove with his rump
        k('hippo', 3)
        k('hippo', 9, move=(0, -3.2, 0))
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 3)
            k(nm, 9, rot=('Z', sx * 26))
        for i, f in enumerate((12, 15, 18, 21)):
            k('hippo', f, move=(0, -3.2, 0), rot=('Z', 7 if i % 2 else -7))
        k('hippo', 24, move=(0, -3.8, 0.4))
        k('hippo', 28, move=(0, 1.0, 0), ease='BACK')
        k('head', 22)
        k('head', 26, rot=('X', -10))
        k('head', 32)
        # the briefcase is shoved in
        k('case', 26)
        k('case', 30, move=(0, 5.6, 0), ease='BACK')
        # he steps away and the doors slide shut
        k('hippo', 34, move=(0, 1.0, 0))
        k('hippo', 40, move=(0, -3.0, 0))
        for nm, sx in (('door_l', 1), ('door_r', -1)):
            k(nm, 40)
            k(nm, 47, move=(-sx * (OPX * 1.5 - OPX / 2 - 0.05), 0, 0), ease='BACK')
            k(nm, 70, move=(-sx * (OPX * 1.5 - OPX / 2 - 0.05), 0, 0))
            k(nm, 77)
        k('case', 72, move=(0, 5.6, 0))
        k('case', 79, ease='BACK')   # (and the next commuter's briefcase is sticking out again)
        # dusting off the gloves: the hands clap in front of him, and back to the posts
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 42, rot=('Z', sx * 26))
            for i, f in enumerate((48, 52, 56, 60)):
                k(nm, f, rot=[('Z', sx * 68), ('X', 18 if i % 2 else 8)])
            k(nm, 66, rot=('Z', sx * 26))
            k(nm, 76)
        k('hippo', 66, move=(0, -3.0, 0))
        k('hippo', 76)
        k('head', 50)
        k('head', 54, rot=('X', 8))
        k('head', 60)
        for b in allb:
            k(b, 82)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    # the set: concrete platform with the yellow tactile strip and the white safety line; the cream and maroon car
    P.fill('concrete', pt.ramp('#a8a49a', 6, shift=0.05), tone=sh, base=0.05)
    pm = P.region('concrete') & (on[:, :, 2] > 0.8)
    P.flat(pm & (np.abs(Yc + 11.0) < 2.4), '#e8c440')
    P.flat(pm & (np.abs(Yc + 11.0) < 2.4) & (np.mod(X, 1.6) < 0.6) & (np.mod(Yc, 1.6) < 0.6), '#c8a428')
    P.flat(pm & (np.abs(Yc - 6.4) < 0.5), '#f2efe6')
    P.fill('cream', pt.ramp('#ece0c0', 7, shift=0.06), tone=sh, base=0.08)
    P.fill('maroon', pt.ramp('#8a3a36', 7, shift=0.06), tone=sh, base=0.1)
    P.fill('inside', pt.ramp('#4a4a4e', 5, shift=0.05), tone=sh, base=-0.1)
    for wx in (-17.5, 17.5):
        P.flat(P.region('cream') & (on[:, :, 1] < -0.8) & (np.abs(X - wx) < 4.3) & (np.abs(Z - (BZ + 25.0)) < 4.1), '#5f7884')
    # the crowd: commuters packed in the doorway, flat painted silhouettes (backs, shoulders, hats, a newspaper)
    cr = P.region('crowd')
    P.fill('crowd', pt.ramp('#6a6c72', 5, shift=0.05), tone=sh * 0.5, base=-0.1)
    for cxp, cz, col in ((-6.0, BZ + 20.0, '#3e4450'), (0.0, BZ + 21.5, '#585248'), (6.2, BZ + 19.6, '#40403c')):
        P.flat(cr & ((X - cxp) ** 2 / 14 + (Z - cz) ** 2 / 30 < 1), col)
        P.flat(cr & ((X - cxp) ** 2 / 4.6 + (Z - cz - 7.4) ** 2 / 4.6 < 1), '#d8b496')
        P.flat(cr & (np.abs(X - cxp) < 2.6) & (np.abs(Z - cz - 9.2) < 0.9), '#2c2a2a')
    P.flat(cr & (np.abs(X + 3.0) < 2.4) & (np.abs(Z - (BZ + 14.0)) < 1.8), '#e8e2d4')
    P.fill('door', pt.ramp('#ece0c0', 7, shift=0.06), tone=free, base=0.08)
    P.fill(P.region('door') & (Z < BZ + 16.0), pt.ramp('#8a3a36', 7, shift=0.06), tone=free, base=0.1)
    P.fill('glass', pt.ramp('#5f7884', 5, shift=0.05), tone=free, base=0.0)
    P.fill('leather', pt.ramp('#6a4228', 6, shift=0.06), tone=free, base=0.1)
    # the hippo: lilac-grey hide, pinker underneath and round the muzzle; the navy jacket and trousers, gold buttons
    HIDE = pt.ramp('#a898a8', 7, shift=0.06)
    P.fill('hide', HIDE, tone=np.where(P.part == 4, sh, free), base=0.05)
    hd = P.part == 4
    P.tint(P.region('hide') & hd & (Yc < HEAD[1] - 3.0) & (Z < HEAD[2] - 1.0), pt.ramp('#d8a4ac', 6, shift=0.06), free)
    NAVY = pt.ramp('#2c3a5c', 7, shift=0.06)
    P.fill('navy', NAVY, tone=np.where(P.part == 3, sh, free), base=0.12)
    jk = P.region('navy') & (P.part == 3) & (on[:, :, 1] < -0.5)
    for z in (BZ + 13.0, BZ + 17.0, BZ + 21.0):
        P.flat(jk & ((X - 1.6) ** 2 + (Z - z) ** 2 < 0.5), '#e2b84c')
    P.flat(P.region('navy') & (P.part == 3) & (np.abs(Z - (BZ + 15.6)) < 0.35) & (np.abs(np.abs(X) - 5.6) < 2.6) & (on[:, :, 1] < -0.5), '#1c2440')
    P.fill('glove', pt.ramp('#f4f0e6', 6, shift=0.05), tone=free, base=0.15)
    P.fill('cap', NAVY, tone=free, base=0.15)
    P.fill('band', NAVY, tone=free, base=-0.05)
    P.fill('visor', pt.ramp('#26262c', 6, shift=0.05), tone=free * 1.3, base=0.3)
    P.fill('badge', pt.ramp('#e2b84c', 6, shift=0.06), tone=free, base=0.2)
    # the face, drawn on: eyes screwed up with effort on the eye bumps, gritted teeth along the muzzle, red cheeks
    fe = face.Face(P, c=(0, HEAD[1] - 2.2, HEAD[2] + 5.2), axis=(0, -0.55, 1), where=P.region('hide') & hd, seed=61)
    fe.eyes('squeeze', spread=8.0, size=0.7, dy=0.0)
    fm = face.Face(P, c=(0, HEAD[1] - 9.6, HEAD[2] - 2.0), axis=(0, -1, 0.1), where=P.region('hide') & hd, seed=62)
    fm.mouth('gritted', w=9.0, dy=-0.6, teeth=4)
    fm.blush(13.0, 0.6, rx=1.6, ry=0.9)
    P.lines(['hide'], ['navy', 'glove', 'cap', 'band', 'visor'], step=1)
    P.lines(['cream'], ['maroon', 'inside'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 83), skip=[('head', 'hippo'), ('arm_l', 'hippo'), ('arm_r', 'hippo'), ('case', 'set')]),
       cams=[((72, -86, 58), (0, 0, 20)), ((-70, 70, 50), (0, 0, 20))], fold=(0, 24, 28, 56))
