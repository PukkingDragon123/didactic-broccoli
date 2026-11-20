"""とけいとうガメ Clock Tower Box Turtle (series tabigame, World Tour Turtles): a prim red-eyed box turtle with a high
domed shell carrying a gothic sandstone clock tower: a panelled shaft, the clock stage with four white dials (gilt
rims, black ticks and hands), a belfry of pointed arches, corner pinnacles and a slate spire with a gilt finial.
Gimmick: head and legs in, the tower lifts off, the front dial's hands whizz round twice, it settles back.

    tools/blender.sh art/blender/toys/tabigame/tokei.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _kame import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('tabigame', 'tokei')
B = Build()
T = Turtle(B, L=24.0, W=19.5, clr=2.6, dome=9.6, neck=0.9, head=1.3, legs='stump', flat_top=0.42, rim=0.8, sp='box')
z = T.top - 1.3
B.add('shell', box('footing', (10.6, 10.6, 2.0), (0, 0, z + 1.0), 'stone', tris=12))
z += 2.0


def panels(h):   # the shaft's gothic panels: tall sunk lancets on every face
    def f(V, N):
        u = np.where(np.abs(N[:, 0]) > 0.7, V[:, 1], V[:, 0])
        side = (np.abs(N[:, 0]) > 0.7) | (np.abs(N[:, 1]) > 0.7)
        return -0.28 * side * (np.abs(np.mod(u + 0.8, 1.6) - 0.8) < 0.45) * (V[:, 2] > ZP0 + 0.6) * (V[:, 2] < ZP1 - 0.6)
    tk.push(h, f)


ZP0, ZP1 = z, z + 8.6
B.add('shell', box('shaft', (6.8, 6.8, 8.6), (0, 0, z + 4.3), 'sand', tris=12, bev=0.25))
sh_lo, sh_hi = B.p['shell'][-1]
panels(sh_hi)
z += 8.6
ZC = z + 2.7                                     # the dials' centre height
B.add('shell', box('stage', (8.2, 8.2, 5.6), (0, 0, z + 2.8), 'sand', tris=12, bev=0.3))
for ax, sx in (('Y', -1), ('Y', 1), ('X', -1), ('X', 1)):   # the four dials
    c = (sx * 4.15, 0, ZC) if ax == 'X' else (0, sx * 4.15, ZC)
    d = tk.cyl('dial', 2.55, -0.3, 0.3, n=16, axis=ax, bevel=0.12, segs=1)
    dh = tk.cyl('dial_hi', 2.55, -0.3, 0.3, n=24, axis=ax, bevel=0.12, segs=2)
    for o in (d, dh):
        tk.move(o, c)
    tk.set_region(dh, 'dial')
    B.add('shell', (d, dh))
z += 5.6
B.add('shell', box('cornice', (8.8, 8.8, 0.8), (0, 0, z + 0.4), 'sand', tris=12, bev=0.2))
z += 0.8
ZB0 = z
B.add('shell', box('belfry', (6.4, 6.4, 3.2), (0, 0, z + 1.6), 'sand', tris=12, bev=0.25))
bl_lo, bl_hi = B.p['shell'][-1]
tk.push(bl_hi, lambda V, N: -0.35 * ((np.abs(N[:, 0]) > 0.7) | (np.abs(N[:, 1]) > 0.7)) * (np.abs(np.mod(np.where(np.abs(N[:, 0]) > 0.7, V[:, 1], V[:, 0]) + 1.0, 2.0) - 1.0) < 0.55) * (V[:, 2] > ZB0 + 0.5) * (V[:, 2] < ZB0 + 2.6))
z += 3.2
B.add('shell', tier('spire', [(z - 0.2, 7.0, 7.0), (z + 0.6, 6.6, 6.6), (z + 4.0, 3.0, 3.0), (z + 7.4, 0.5, 0.5)], 'slate', tris=40, n=16, e=7.0,
                    cap1='point'))
B.add('shell', limb('finial', [(0, 0, z + 7.2), (0, 0, z + 9.4)], [0.35, 0.18], tris=12, region='gilt', n=6, cap1='point'))
for sx in (1, -1):
    for sy in (1, -1):
        B.add('shell', limb('pinnacle', [(sx * 3.9, sy * 3.9, z - 0.4), (sx * 3.9, sy * 3.9, z + 1.4), (sx * 3.9, sy * 3.9, z + 3.0)], [0.6, 0.5, 0.1],
                            tris=14, region='sand', n=6, cap1='point'))
# the front dial's hands (their own part: they spin)
HCN = (0, -4.5, ZC)
hh = tk.slab('hour', [(-0.22, -0.3), (0.22, -0.3), (0.16, 1.5), (0, 1.75), (-0.16, 1.5)], 0.22, plane='XZ', at=0.0, bevel=0.0, segs=0)
mh = tk.slab('minute', [(-0.16, -0.4), (0.16, -0.4), (0.1, 2.15), (0, 2.35), (-0.1, 2.15)], 0.22, plane='XZ', at=0.0, bevel=0.0, segs=0)
tk.rotate(mh, -100, 'Y')
hand_lo = tk.join([hh, mh], 'hands')
tk.move(hand_lo, HCN)
hand_hi = tk.copy(hand_lo, 'hands_hi')
hand_lo['facet'] = 1   # (thin hands keep every triangle)
tk.set_region(hand_hi, 'hand')
B.add('hands', (hand_lo, hand_hi))
T.commit(F, extra_bones={'hands': 'hands'})


def make_rig():
    R = T.rig(F, extra=lambda R: R.bone('hands', HCN, parent='shell'))
    k = R.key
    with R.action('gimmick'):
        shell_keys(k, T, extra=('hands',), spin=-18.0)
        for f, a in ((14, 0), (20, -240), (26, -480), (32, -720)):
            k('hands', f, rot=('Y', a), ease='LINEAR' if f < 32 else None)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_turtle(P, pt, sh, T, '#3e342c', '#4a3420', scute='#6a4a26', plast='#d8b860', beak='#4a3a2e', vest=('#f2efe6', '#2a4a8a'))
    who, d = P.dabs(P.region('shell'), size=1.2, spacing=2.2, seed=4)   # the box turtle's yellow-orange flecks
    P.fill(P.region('shell') & (who >= 0) & (d < 0.55), pt.ramp('#d8962a', 5, shift=0.05), tone=sh, base=0.1)
    sk = P.region('skin') | P.region('face')
    who, d = P.dabs(sk, size=0.7, spacing=1.6, seed=9)
    P.fill(sk & (who >= 0) & (d < 0.5), pt.ramp('#d8782a', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('stone', pt.ramp('#8a867c', 6, shift=0.04), tone=sh, base=0.05)
    sr = P.region('sand')
    P.fill(sr, pt.ramp('#d6be86', 7, shift=0.05), tone=sh, base=0.15, brush={'preset': 'pvc', 'flow': 'down'})
    P.fill(sr & (P.cav > 0.6), pt.ramp('#7a6a48', 5, shift=0.04), tone=sh, base=0.0, brush=False)
    P.shift(sr & (np.abs(np.mod(Z, 1.1) - 0.55) < 0.07) & (np.abs(P.on[:, :, 2]) < 0.5), -1)   # the coursed stone
    P.fill('slate', pt.ramp('#3e4a5a', 6, shift=0.05), tone=sh, base=0.1)
    P.shift(P.region('slate') & (np.abs(np.mod(Z, 0.8) - 0.4) < 0.1), -1)
    P.fill('gilt', pt.ramp('#d8a840', 6, shift=0.08, light=0.6), tone=sh, base=0.15, brush='metal')
    dr = P.region('dial')
    P.fill(dr, pt.ramp('#f2eedf', 5, shift=0.03), tone=sh, base=0.25, brush=False)
    # each dial: a gilt rim, twelve ink ticks
    for c, ax in (((0, -4.45, ZC), (0, -1, 0)), ((0, 4.45, ZC), (0, 1, 0)), ((-4.45, 0, ZC), (-1, 0, 0)), ((4.45, 0, ZC), (1, 0, 0))):
        U, V, W, a = P.frame(c, ax)
        r = np.hypot(U, V)
        ang = np.arctan2(V, U)
        P.fill(dr & (r > 2.15) & (np.abs(W) < 1.0), pt.ramp('#d8a840', 5, shift=0.08), tone=sh, base=0.15, brush=False)
        tick = (r > 1.55) & (r < 2.0) & (np.abs(np.mod(ang * 6 / np.pi + 0.5, 1.0) - 0.5) < 0.12)
        P.flat(dr & tick & (np.abs(W) < 1.0), '#1e1a1c')
        if ax[1] > 0:   # the dials without moving hands: painted hands at ten past ten
            hand = ((np.abs(U * np.cos(0.5) - V * np.sin(0.5)) < 0.13) & (V > 0) & (r < 1.5)) | ((np.abs(V * np.cos(0.9) + U * np.sin(0.9)) < 0.11) & (U > 0) & (r < 1.9))
        else:
            hand = (np.abs(U) < 0.12) & (V > 0) & (r < 1.6)
        if ax[1] >= 0:
            P.flat(dr & hand & (np.abs(W) < 1.0), '#1e1a1c')
    P.fill('hand', pt.ramp('#262224', 4), tone=sh, base=0.1, brush=False)
    turtle_face(P, T, 523)
    P.lines(['sand'], ['dial', 'slate', 'stone'], step=1)
    P.lines(['shell', 'marginal'], ['skin', 'face'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, skip=[('hands', 'shell')])
