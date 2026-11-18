"""かまばんオオサンショウウオ Boiler-Man Salamander (secret): the kamaban in the boiler room behind the bath wall, a giant
salamander in a twisted headband with a plank of scrap timber, beside the brick firebox, the iron boiler and its
chimney (series sento, concepts_D.md). The salamander is the fire creature of the old books; this one just keeps the
water hot.

Gimmick: the firebox door swings open, he heaves the plank in, the fire flares (light-up), the door clangs shut and he
wipes his brow.

    tools/blender.sh art/blender/toys/sento/sanshou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yu as yu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('sento', 'sanshou')
H = yu.H
FX = -7.0                     # the firebox's centre (x)
FZ = H + 4.8                  # its door's centre height
BT = H + 9.6                  # the brick block's top
DH = (FX - 3.4, -1.0, FZ)     # the door's hinge (its left edge)
SX = 7.4                      # the salamander's centre (x)
HC = np.array((SX, -1.6, H + 17.4))     # the head's centre
PL = np.array((SX, -6.8, H + 10.2))     # the plank in his hands
low = yu.low

# ------------------------------------------------------------------ floor, brick firebox, iron boiler, gauge, chimney, scrap pile
base_lo, base_hi = yu.floor(F)
PB = [yu.box('brick', (14.0, 11.0, BT - H), (FX, 5.0, (H + BT) / 2), 'brick', bevel=0.35),
      yu.box('frame', (8.4, 0.6, 6.8), (FX, -0.7, FZ), 'iron', bevel=0.2)]
drum = tk.lathe('drum', [(0, BT), (5.6, BT), (5.8, BT + 0.6), (5.8, BT + 9.4), (5.2, BT + 10.6), (3.4, BT + 11.6), (1.6, BT + 11.9), (1.6, BT + 12.4), (0, BT + 12.4)],
                n=16, centre=(FX, 5.0, 0))


def sc_drum(h):
    def f(V, N):  # two riveted seams round the drum
        r = np.hypot(V[:, 0] - FX, V[:, 1] - 5.0)
        a = np.arctan2(V[:, 1] - 5.0, V[:, 0] - FX)
        seam = sum(np.exp(-((V[:, 2] - z) / 0.3) ** 2) for z in (BT + 1.4, BT + 8.6))
        riv = seam * (np.abs(np.sin(a * 10)) > 0.9) * (r > 5.0)
        return 0.18 * seam + 0.2 * riv
    tk.push(h, f)


PB.append(low(drum, 'drum', 120, lo=0, hi=2, sculpt=sc_drum, region='iron'))
PB.append(yu.rod('gauge', 1.6, -0.2, 0.9, (FX + 2.6, BT + 5.6), 'Y', 'gauge', n=12))
tk.rotate(PB[-1][0], 30, 'Z', pivot=(FX, 5.0, 0))
tk.rotate(PB[-1][1], 30, 'Z', pivot=(FX, 5.0, 0))
chim = tk.tube('chimney', [(FX, 5.0, BT + 12.0), (FX, 5.0, BT + 18.0), (FX + 0.4, 5.4, BT + 23.0)], [1.4, 1.35, 1.3], n=10, cap1='flat')
PB.append(low(chim, 'chimney', 50, lo=0, hi=1, region='iron'))
for x, y, L in ((0.6, 6.6, 6.6), (1.6, 8.6, 5.4)):   # scrap planks stood against the brickwork
    PB.append(yu.box('scrap', (0.9, 2.0, L), (x, y, H + L / 2), 'plank', bevel=0.2, rz=8))
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)
door = yu.box('door', (6.8, 0.8, 5.4), (FX, -1.4, FZ), 'door', bevel=0.3)
hand = tk.tube('handle', [(FX + 2.2, -1.9, FZ - 0.9), (FX + 2.2, -2.5, FZ), (FX + 2.2, -1.9, FZ + 0.9)], 0.35, n=5)
DOOR = [door, low(hand, 'handle', 20, lo=0, hi=1, region='brass')]
fire = tk.slab('fire', [(-2.6, -2.2), (2.6, -2.2), (2.8, 0.2), (2.0, 1.2), (1.6, 0.4), (0.9, 2.2), (0.2, 0.9), (-0.6, 2.4), (-1.2, 0.6),
                        (-1.9, 1.6), (-2.7, 0.0)], 0.7, plane='XZ', at=-0.4, bevel=0.2, segs=1)
tk.move(fire, (FX, 0, FZ))
fire_lo, fire_hi = low(fire, 'fire', 60, lo=0, hi=1, region='fire')

# ------------------------------------------------------------------ the giant salamander, upright, his tail curled on the floor
body = tk.loft('body', [{'c': (SX, 0.2, H + 1.3), 'w': 10.6, 'h': 4.0, 'e': 2.2}, {'c': (SX, -0.2, H + 5.4), 'w': 11.6, 'h': 4.4, 'e': 2.2},
                        {'c': (SX, -0.4, H + 10.0), 'w': 10.4, 'h': 4.0, 'e': 2.2}, {'c': (SX, -0.8, H + 14.0), 'w': 8.6, 'h': 3.6, 'e': 2.2}],
               n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)


def sc_skin(h):
    def f(V, N):  # the wrinkly fold down each side, bumpy old skin
        side = np.exp(-((np.abs(V[:, 0] - SX) - 5.4) / 0.6) ** 2)
        return 0.35 * side * np.sin(V[:, 2] * 2.6) ** 2 + 0.08 * np.sin(V[:, 0] * 5.0) * np.sin(V[:, 2] * 4.4)
    tk.push(h, f)


BODY = [low(body, 'body', 170, sculpt=sc_skin, region=('skin', [('belly', lambda C, N: N[:, 1] < -0.6)]))]
tail = tk.tube('tail', [(SX - 2.0, 3.0, H + 2.2), (SX - 4.0, 7.0, H + 2.0), (SX - 1.2, 9.6, H + 1.7), (SX + 3.0, 8.6, H + 1.3)], [3.2, 2.8, 2.2, 1.0], n=8, squash=0.6, cap1='point')
BODY.append(low(tail, 'tail', 60, sculpt=sc_skin, region='skin'))
for sx in (1, -1):   # stubby hind legs splayed on the floor, four fat toes
    lg = tk.tube('leg', [(SX + sx * 4.4, -0.6, H + 2.6), (SX + sx * 6.4, -2.8, H + 1.2), (SX + sx * 6.6, -4.2, H + 0.7)], [2.2, 1.8, 1.6], n=8, squash=0.8)
    BODY.append(low(lg, 'leg', 40, region='skin'))
    for t in range(4):
        to = tk.tube('toe', [(SX + sx * 6.6, -4.2, H + 0.7), (SX + sx * (5.4 + t * 0.9), -5.8 + abs(t - 1.5) * 0.3, H + 0.45)], [0.6, 0.5], n=5)
        BODY.append(low(to, 'toe', 10, lo=0, hi=1, region='skin'))
head = tk.loft('head', [{'c': tuple(HC + (0, 3.4, 0.2)), 'w': 9.0, 'h': 2.8, 'e': 2.4}, {'c': tuple(HC + (0, 0.8, 0.4)), 'w': 12.4, 'h': 3.4, 'e': 2.6},
                        {'c': tuple(HC + (0, -2.4, 0.0)), 'w': 12.8, 'h': 3.0, 'e': 2.8}, {'c': tuple(HC + (0, -4.6, -0.4)), 'w': 10.6, 'h': 2.2, 'e': 2.6}],
               n=16, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HEAD = [low(head, 'head', 150, sculpt=sc_skin, region=('skin', [('lip', lambda C, N: (C[:, 2] < HC[2] - 0.6) & (C[:, 1] < HC[1] - 2.0))]))]
band = [(HC[0] + 6.0 * math.cos(a), HC[1] + 0.6 + 4.4 * math.sin(a), HC[2] + 1.2 + 0.5 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 14, endpoint=False)]
bnd = tk.loft('band', [{'c': p_, 'w': 1.0, 'h': 0.7, 'e': 2.0} for p_ in band], n=6, closed=True)
knot = tk.tube('knot', [(HC[0] + 2.6, HC[1] + 4.8, HC[2] + 1.8), (HC[0] + 4.0, HC[1] + 6.6, HC[2] + 0.6), (HC[0] + 4.6, HC[1] + 7.6, HC[2] - 1.4)], [0.7, 0.6, 0.4], n=5, squash=0.5)
HEAD += [low(bnd, 'band', 70, lo=1, hi=1, region='hachimaki'), low(knot, 'knot', 20, lo=1, hi=1, region='hachimaki')]
ARMS = []
for sx in (1, -1):
    sh_ = (SX + sx * 5.0, -1.0, H + 11.6)
    a = tk.tube('arm', [sh_, (SX + sx * 6.4, -4.0, H + 10.0), (SX + sx * 3.6, -6.6, H + 10.0)], [1.8, 1.6, 1.5], n=8, cap1='round')
    ARMS.append(low(a, 'arm', 40, region='skin'))
plank = yu.box('plank', (12.0, 2.2, 1.0), tuple(PL), 'plank', bevel=0.25)

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('fire', fire_lo, [fire_hi], bone='fire', kind='led')
F.part('door', tk.join([d[0] for d in DOOR], 'door'), [d[1] for d in DOOR], bone='door')
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
F.part('head', tk.join([b[0] for b in HEAD], 'head'), [b[1] for b in HEAD], bone='head')
F.part('arms', tk.join([a[0] for a in ARMS], 'arms'), [a[1] for a in ARMS], bone='arms')
F.part('plank', plank[0], [plank[1]], bone='plank')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('fire', (FX, -0.4, FZ - 2.2), parent='root')
    R.bone('door', DH, parent='root')
    R.bone('body', (SX, 0.0, H + 1.0), parent='root')
    R.bone('head', (SX, -0.8, H + 14.6), parent='body')
    R.bone('arms', (SX, -1.0, H + 11.6), parent='body')
    R.bone('plank', tuple(PL), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'fire', 'door', 'body', 'head', 'arms', 'plank']
    k = R.key
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-14 the door swings open; 10-22 he turns to the fire and swings the plank back; 22-30 heave! the plank flies
        # in; 30-46 the fire flares; 46-54 the door clangs shut; 54-76 he wipes his brow (both arms up, the head
        # shakes); the plank is back in his hands at the end (a toy)
        k('door', 4)
        k('door', 14, rot=('Z', -105), ease='BACK')
        k('door', 46, rot=('Z', -105))
        k('door', 54, ease='BOUNCE')
        k('body', 8)
        k('body', 18, rot=('Z', -18))
        k('body', 46, rot=('Z', -18))
        k('body', 56)
        k('arms', 10)
        k('arms', 20, rot=('X', 24), move=(0, 0.6, 0.6))
        k('arms', 26, rot=('X', -36), ease='BACK')
        k('arms', 34, rot=('X', -10))
        k('arms', 54)
        k('arms', 62, rot=('X', -95), move=(0, 0.8, 2.4))
        k('arms', 72, rot=('X', -95), move=(0, 0.8, 2.4))
        k('arms', 80)
        k('plank', 10)
        k('plank', 20, move=(-1.0, 1.0, 0.8), rot=('Z', -18))
        k('plank', 24, move=(-7.0, 2.0, 2.4), rot=('Z', -10))
        k('plank', 29, move=(FX - PL[0] + 1.0, -0.4 - PL[1], FZ - PL[2]), rot=('Z', 0), scale=0.7)
        k('plank', 31, move=(FX - PL[0] - 1.0, 0.6 - PL[1], FZ - PL[2]), scale=0.05, ease='CONSTANT')
        k('plank', 74, move=(0, 0, 0), scale=0.05)
        k('plank', 80)
        k('fire', 28)
        k('fire', 34, scale=(1.35, 1.0, 1.6), ease='BACK')
        for i, f in enumerate(range(38, 50, 3)):
            k('fire', f, scale=(1.3 - 0.04 * i, 1.0, 1.5 - 0.1 * i + 0.1 * (i % 2)))
        k('fire', 60)
        k('head', 54)
        for i, f in enumerate(range(60, 74, 3)):
            k('head', f, rot=('Z', 8 if i % 2 else -8))
        k('head', 78)
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    yu.paint_floor(P, pt, sh)
    # brick: red-brown courses, pale mortar
    P.fill('brick', pt.ramp('#a04a32', 6, shift=0.06), tone=sh, base=0.05)
    br = P.region('brick')
    row = np.floor((Z - H) / 1.4)
    u = np.where(np.abs(P.on[:, :, 0]) > 0.6, Y, X) + 1.4 * (row % 2)
    mort = (np.abs(np.mod(Z - H, 1.4) - 0.7) > 0.56) | (np.abs(np.mod(u, 2.8) - 1.4) > 1.24)
    P.fill(br & ~mort & (np.mod(np.floor(u / 2.8) * 7 + row * 3, 5) == 0), pt.ramp('#7a3624', 5), tone=sh, base=0.05)
    P.fill(br & mort, pt.ramp('#c8b8a0', 4), tone=sh, base=0.05, brush=False)
    # iron: sooty black with a dull sheen; the brass gauge with its needle; the door
    P.fill('iron', pt.ramp('#3a3836', 6, shift=0.05, light=0.6), tone=sh, base=0.1, brush={'preset': 'metal', 'flow': 'down'})
    P.fill('door', pt.ramp('#2e2c2a', 6, shift=0.05, light=0.6), tone=sh, base=0.1, brush={'preset': 'metal', 'flow': 'down'})
    dr = P.region('door') & (P.on[:, :, 1] < -0.7)
    P.shift(dr & (np.minimum(np.abs(np.abs(X - FX) - 2.8), np.abs(np.abs(Z - FZ) - 2.1)) < 0.3) &
            (np.abs(np.mod(X - FX, 1.4) - 0.7) < 0.3) & (np.abs(np.mod(Z - FZ, 1.4) - 0.7) < 0.3), 2)     # rivets
    P.fill('brass', pt.ramp('#c9a24a', 5, shift=0.06), tone=sh, base=0.1)
    P.fill('gauge', pt.ramp('#c9a24a', 5, shift=0.06), tone=sh, base=0.1)
    gf = P.region('gauge') & (P.on[:, :, 1] < -0.5) & (np.abs(P.on[:, :, 0]) < 0.9)
    P.fill(gf, pt.ramp('#efe8d4', 4), tone=sh, base=0.25, brush=False)
    P.fill('plank', pt.ramp('#c8a06a', 6, shift=0.05), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0)})
    # the fire: white-yellow core to orange tongues (painted as it looks lit)
    fr = P.region('fire')
    P.fill('fire', pt.ramp('#ff9a30', 6, shift=0.08, light=0.7), tone=sh * 0.3, base=0.2, brush=False)
    P.fill(fr & (Z < FZ - 0.6) & (np.abs(X - FX) < 2.0), pt.ramp('#ffe070', 5, shift=0.04), tone=sh * 0.3, base=0.3, brush=False)
    P.fill(fr & (Z > FZ + 1.0), pt.ramp('#e85a20', 5, shift=0.05), tone=sh * 0.3, base=0.1, brush=False)
    # the salamander: dark olive-brown, black mottling, a paler belly; headband white
    sk = P.region('skin')
    P.fill('skin', pt.ramp('#6a5a3a', 7, shift=0.07), tone=sh, base=0.08)
    who, d = P.dabs(sk, size=1.2, spacing=2.2, seed=21)
    P.fill(sk & (who >= 0) & (d < 0.5) & (np.mod(who, 3) == 0), pt.ramp('#2e2618', 5), tone=sh, base=0.05)
    P.fill('belly', pt.ramp('#9a8a62', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('lip', pt.ramp('#8a7a52', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('hachimaki', pt.ramp('#f2ece0', 5, shift=0.04), tone=sh, base=0.2, brush='cloth')
    P.fill(P.region('hachimaki') & (np.mod(np.floor((X + Y) * 0.9), 2) == 0), pt.ramp('#c8302a', 4), tone=sh, base=0.1, brush='cloth')
    # the face: two tiny dots very far apart near the edges of his wide head, one long grin right across it
    hd = (sk | P.region('lip')) & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -5.6, 0.6)), axis=(0, -1, 0.35), where=hd, seed=561)
    fc.eyes('dot', spread=8.4, size=0.38, dy=0.8, uneven=0.3)
    fc.mouth('upturn', w=8.8, dy=-1.2, weight=0.42)
    fc.blush(spread=9.0, dy=-0.4, rx=1.2, ry=0.6, col='#d88a6a')
    P.lines(['hachimaki', 'plank'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('head', 'body'), ('arms', 'body'), ('plank', 'arms'), ('plank', 'base'), ('plank', 'fire'),
                                                              ('fire', 'base'), ('door', 'base'), ('plank', 'door'), ('arms', 'head'), ('plank', 'body')]),
    cams=[((40, -60, 44), (0, 0, 14)), ((-46, 52, 40), (0, 2, 14))], fold=(0, 20, 30, 64))
