"""ちかてつモグラ Subway Mole: the underground line's driver, a mole in the railway's navy jacket and a lamp helmet with
his goggles pushed up, coming up out of the hole he has just dug (series ekiin, secret; concepts_C.md).

He stands in the pit of a molehill of fresh earth, both pink spade-hands up, a dug-up length of rail on its sleeper
by the hole. The helmet lamp is a light-up part.
Gimmick: he ducks down into the hole and pops up out of it, the lamp swings round looking for the line, and he
waves a spade-hand.

    tools/blender.sh art/blender/toys/ekiin/mogura.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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
from mathutils import Vector  # noqa: E402

tk.reset()
F = Fig('ekiin', 'mogura')

PIT_R = 14.6
MZ = 7.0                     # the mole's bottom (standing in the pit)
HC = (0, -1.0, 23.0)         # the head end (the body and head are one, as a mole's are)
LAMP = (0, -9.0, 31.0)       # the lamp's pivot (axis z)

# ------------------------------------------------------------------ the molehill, its pit, the dug-up rail
mound = tk.lathe('mound', [(0, 0), (22.4, 0), (22.0, 2.4), (19.8, 6.0), (17.2, 9.0), (15.6, 10.2), (14.0, 10.4), (0, 10.4)], n=32)
tk.boolean(mound, tk.cyl('pit', PIT_R, 0.6, 14.0, n=28, at=(0, 0), axis='Z', bevel=0.6, segs=1))


def sc_mound(h):
    def f(V, N):  # clods of fresh earth: lumpy, crumbly
        return 0.3 * np.sin(V[:, 0] * 1.3 + np.sin(V[:, 1] * 0.9) * 2) * np.sin(V[:, 1] * 1.2 + V[:, 2] * 0.8) * (N[:, 2] > 0.1)
    tk.push(h, f)


mound_lo, mound_hi = cx.low(mound, 'mound', 260, lo=1, hi=2, sculpt=sc_mound, region=('earth', [('pit', lambda C, N: np.hypot(C[:, 0], C[:, 1]) < PIT_R + 0.3)]))
sleeper = tk.rbox('sleeper', (16.0, 4.0, 2.4), centre=(4.0, -15.6, 1.4), bevel=0.4, segs=1)
tk.rotate(sleeper, 18, 'Z', (4.0, -15.6, 1.4))
tk.move(sleeper, (1.0, -3.0, 0))
rail = tk.slab('rail', [(-1.4, 0.0), (1.4, 0.0), (1.4, 0.5), (0.4, 0.8), (0.4, 2.4), (1.0, 2.7), (1.0, 3.4), (-1.0, 3.4), (-1.0, 2.7), (-0.4, 2.4), (-0.4, 0.8), (-1.4, 0.5)],
               22.0, plane='YZ', at=0.0, bevel=0.15, segs=1)
tk.rotate(rail, 90, 'Z')
tk.rotate(rail, 18, 'Z')
tk.move(rail, (4.0, -18.0, 2.6))
SET = [(mound_lo, mound_hi), cx.low(sleeper, 'sleeper', 20, lo=0, hi=1, region='wood'), cx.low(rail, 'rail', 60, lo=0, hi=1, region='rail')]

# ------------------------------------------------------------------ the mole: one plump velvet body, the pink snout, spade hands
body = tk.loft('body', [{'c': (0, 0.6, MZ), 'w': 13.0, 'h': 6.4, 'e': 2.2},
                        {'c': (0, 0.4, MZ + 5.0), 'w': 17.4, 'h': 8.4, 'e': 2.2},
                        {'c': (0, 0.0, MZ + 11.0), 'w': 18.0, 'h': 8.6, 'e': 2.2},
                        {'c': (0, -0.6, HC[2]), 'w': 15.2, 'h': 7.6, 'e': 2.2},
                        {'c': (0, -1.2, HC[2] + 4.8), 'w': 10.4, 'h': 5.6, 'e': 2.2}], n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=2.0)


def sc_body(h):
    def f(V, N):  # the velvet fur's soft tufts, the jacket's hem
        return 0.12 * np.sin(V[:, 0] * 2.1 + V[:, 2] * 1.7) * np.sin(V[:, 1] * 1.9 - V[:, 2] * 1.3) + 0.3 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 2] - (MZ + 8.6)))
    tk.push(h, f)


body_lo, body_hi = cx.low(body, 'body', 260, lo=1, hi=3, sculpt=sc_body, region=('fur', [('navy', lambda C, N: (C[:, 2] < MZ + 8.6) | ((C[:, 2] < MZ + 15.0) & (N[:, 1] > -0.4)))]))
snout = tk.loft('snout', [{'c': (0, -7.4, HC[2] - 0.6), 'w': 6.4, 'h': 4.0, 'e': 2.2}, {'c': (0, -10.6, HC[2] - 1.0), 'w': 4.4, 'h': 2.8, 'e': 2.2},
                          {'c': (0, -12.6, HC[2] - 1.2), 'w': 3.0, 'h': 2.2, 'e': 2.2}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
snout_lo, snout_hi = cx.low(snout, 'snout', 60, lo=1, hi=2, region=('fur', [('pink', lambda C, N: C[:, 1] < -10.4)]))
HANDS = {}
for sx, nm in ((1, 'hand_l'), (-1, 'hand_r')):
    s = np.array((sx * 7.6, -3.0, MZ + 11.0))
    hnd = np.array((sx * 7.8, -8.2, MZ + 9.4))
    arm = tk.tube('arm', [tuple(s), tuple((s + hnd) / 2 + np.array((sx * 0.8, 0, -0.6))), tuple(hnd)], [3.0, 2.6, 2.4], n=8)
    pad = tk.slab('spade', [(-3.2, -1.0), (-2.6, 2.8), (-1.2, 3.6), (0.0, 2.6), (1.2, 3.6), (2.6, 2.8), (3.2, -1.0), (1.6, -2.6), (-1.6, -2.6)], 1.6,
                  plane='XZ', at=0.0, bevel=0.6, segs=1)
    tk.subsurf(pad, 1)
    tk.rotate(pad, sx * -24, 'Y')
    tk.move(pad, tuple(hnd + np.array((sx * 0.6, -1.4, 0.8))))
    HANDS[nm] = ([cx.low(arm, 'arm', 40, lo=1, hi=1, region='fur'), cx.low(pad, 'spade', 50, lo=1, hi=2, region=('pink', [('claw', lambda C, N, z=hnd[2]: C[:, 2] > z + 3.0)]))], tuple(s))

# the lamp helmet: a round driver's helmet with a gold band, the goggles pushed up on it, the lamp on its bracket
helm = tk.lathe('helmet', [(0, 0), (8.6, 0), (8.8, 0.8), (8.2, 3.4), (6.4, 5.8), (3.4, 7.0), (0, 7.3)], n=20, centre=(0, -1.2, HC[2] + 4.0))
tk.rotate(helm, -8, 'X', (0, -1.2, HC[2] + 4.0))
brim = tk.lathe('brim', [(8.0, -0.4), (10.2, -0.2), (10.4, 0.4), (8.4, 0.8)], n=20, centre=(0, -1.2, HC[2] + 4.0))
tk.rotate(brim, -8, 'X', (0, -1.2, HC[2] + 4.0))
GOG = []
for sx in (1, -1):
    g = tk.lathe('gog', [(0, -0.6), (2.2, -0.6), (2.4, 0.6), (1.6, 1.2), (0, 1.2)], n=12)
    q = Vector((0, 0, 1)).rotation_difference(Vector((sx * 0.3, -0.75, 0.6)).normalized())
    tk.transform(g, q.to_matrix().to_4x4())
    tk.move(g, (sx * 3.4, -6.0, HC[2] + 8.6))
    GOG.append(cx.low(g, 'gog', 30, lo=0, hi=1, region=('brass', [('lens', lambda C, N, sx=sx: N[:, 1] < -0.5)])))
for g_ in GOG:   # (no goggles after all: on the helmet's front they read as a second pair of eyes)
    tk.delete(g_[0])
    tk.delete(g_[1])
HELM = [cx.low(helm, 'helmet', 110, lo=0, hi=2, region='navy'), cx.low(brim, 'brim', 50, lo=0, hi=1, region='navy')]
lamp = tk.lathe('lamp', [(0, -0.4), (2.6, -0.4), (2.9, 1.2), (2.4, 2.6), (0, 2.8)], n=14, axis='Y', centre=(LAMP[0], LAMP[1] + 1.6, LAMP[2]))
tk.scale(lamp, (1, -1, 1), (0, LAMP[1] + 1.6, 0))
tk.fix_normals(lamp)
lens = tk.cyl('lens', 2.3, -0.3, 0.3, n=14, at=(LAMP[0], LAMP[2]), axis='Y', bevel=0.15, segs=1)
tk.move(lens, (0, LAMP[1] - 1.3, 0))
LAMPP = [cx.low(lamp, 'lamp', 50, lo=0, hi=1, region='brass')]
lens_lo, lens_hi = cx.low(lens, 'lens', 24, lo=0, hi=1, region='lamp')

# ------------------------------------------------------------------ parts
F.part('set', tk.join([s_[0] for s_ in SET], 'set'), [s_[1] for s_ in SET], bone='root')
F.part('mole', tk.join([body_lo, snout_lo] + [h_[0] for h_ in HELM], 'mole'), [body_hi, snout_hi] + [h_[1] for h_ in HELM], bone='mole')
for nm, (pp, s) in HANDS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('lamphead', LAMPP[0][0], [LAMPP[0][1]], bone='lamp', kind='metal')
F.part('lamplens', lens_lo, [lens_hi], bone='lamp', kind='led')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('mole', (0, 0, MZ), parent='root')
    R.bone('lamp', (LAMP[0], LAMP[1] + 1.0, LAMP[2]), parent='mole')
    for nm, (pp, s) in HANDS.items():
        R.bone(nm, s, parent='mole')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'mole', 'lamp', 'hand_l', 'hand_r']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # down the hole...
        k('mole', 3, move=(0, 0, 0.8), scale=(0.97, 0.97, 1.04))
        k('mole', 10, move=(0, 0, -4.8), scale=(1.03, 1.03, 0.96))
        k('mole', 16, move=(0, 0, -4.8))
        # ...and up out of it
        k('mole', 21, move=(0, 0, 2.6), scale=(0.96, 0.96, 1.05), ease='BACK')
        k('mole', 27, ease='BOUNCE')
        # the lamp swings round looking for the line
        k('lamp', 24)
        k('lamp', 31, rot=('Z', 40))
        k('lamp', 39, rot=('Z', -40))
        k('lamp', 45, rot=('Z', 0), ease='BACK')
        # a wave of the spade hand
        k('hand_r', 40)
        for i, f in enumerate((44, 48, 52, 56)):
            k('hand_r', f, rot=[('X', -50), ('Y', -24 if i % 2 == 0 else 6)])
        k('hand_r', 62)
        k('hand_l', 44)
        k('hand_l', 50, rot=('X', -10))
        k('hand_l', 58)
        for b in allb:
            k(b, 66)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    P.fill('earth', pt.ramp('#7a5638', 7, shift=0.07), tone=sh, base=0.08)
    P.tint(P.region('earth') & (np.sin(X * 2.3) * np.sin(Yc * 2.1 + Z) > 0.7), pt.ramp('#5a3e28', 6, shift=0.06), sh)
    P.fill('pit', pt.ramp('#3a2a20', 5, shift=0.05), tone=sh, base=-0.1)
    P.fill('wood', pt.ramp('#8a6a4a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('rail', pt.ramp('#8a8c90', 6, dark=0.6, light=0.6, shift=0.05), tone=sh * 1.3, base=0.15)
    P.tint(P.region('rail') & (on[:, :, 2] > 0.8), pt.ramp('#d0d4d8', 6, shift=0.05), sh)
    FUR = pt.ramp('#5a4e58', 7, shift=0.07)
    P.fill('fur', FUR, tone=free, base=0.12)
    P.fill('pink', pt.ramp('#efa4ae', 7, shift=0.06), tone=free, base=0.1)
    P.fill('claw', pt.ramp('#f4e8dc', 6, shift=0.05), tone=free, base=0.15)
    NAVY = pt.ramp('#2c3a5c', 7, shift=0.06)
    P.fill('navy', NAVY, tone=free, base=0.12)
    jm = P.region('navy') & (P.part == PI['mole']) & (Z < MZ + 15.0) & (on[:, :, 1] < -0.4)
    for z in (MZ + 4.0, MZ + 7.2):
        P.flat(jm & ((X - 1.4) ** 2 + (Z - z) ** 2 < 0.45), '#e2b84c')
    hm = P.region('navy') & (P.part == PI['mole']) & (Z > HC[2] + 4.0)
    P.flat(hm & (np.abs(Z - (HC[2] + 5.4 - 0.14 * (Yc + 1.2))) < 0.5), '#d8b04a')
    P.fill('brass', pt.ramp('#d8b04a', 6, dark=0.6, light=0.6, shift=0.06), tone=free * 1.3, base=0.15)
    P.fill('lens', pt.ramp('#7ab0c8', 5, shift=0.05), tone=free * 0.6, base=0.25)
    P.fill('lamp', pt.ramp('#fff2c0', 5, shift=0.05), tone=free * 0.3, base=0.4)
    # the face, drawn on: two tiny dots close together (a mole barely needs eyes), the pink nose, a Y mouth, whiskers
    fc = face.Face(P, c=(0, -9.4, HC[2] + 0.4), axis=(0, -1, 0.25), where=(P.region('fur') | P.region('pink')) & (P.part == PI['mole']), seed=101)
    fc.eyes('tiny', spread=4.6, size=0.7, dy=2.0)
    fn = face.Face(P, c=(0, -12.6, HC[2] - 1.2), axis=(0, -1, 0.1), where=P.region('pink') & (P.part == PI['mole']), seed=102)
    fn.nose('button', 0.0, 0.3, size=0.9, col='#c8586a')
    fn.snout_mouth('Y', 0.0, -0.7, w=1.6)
    fw = face.Face(P, c=(0, -10.4, HC[2] - 1.0), axis=(0, -1, 0.1), where=P.region('fur') & (P.part == PI['mole']), seed=103)
    fw.whiskers(0.0, -0.2, spread=4.6, n=2, length=2.4)
    P.lines(['fur'], ['navy', 'pink', 'brass'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 67), skip=[('hand_l', 'mole'), ('hand_r', 'mole'), ('lamphead', 'mole'), ('lamplens', 'mole'), ('lamplens', 'lamphead')]),
       cams=[((64, -78, 52), (0, -2, 14)), ((-60, 70, 46), (0, 0, 14))], fold=(0, 12, 22, 50))
