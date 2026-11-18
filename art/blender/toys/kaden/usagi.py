"""ポンうさぎ Pop-up Rabbit: a Shōwa chrome pop-up toaster that is a rabbit (series kaden, concepts_C.md).

The two slices of toast are its long ears, the browning knob is its pink nose, the crumb tray's tab its buck teeth,
the bakelite feet its paws, the side lever its forepaw and the cord's round plug its cottontail.
Gimmick: the lever goes down and the toast-ears sink into the slots (the tips peek out), it ticks and trembles,
DING: the toast-ears shoot up, the rabbit hops, the ears flop and the nose-knob twitches.

    tools/blender.sh art/blender/toys/kaden/usagi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'lib'), os.path.join(HERE, '_cx')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import cx  # noqa: E402
from fig import Fig  # noqa: E402

tk.reset()
F = Fig('kaden', 'usagi')

Z0, Z1 = 3.4, 25.0          # the housing's bottom and top
ZC = (Z0 + Z1) / 2
W, L = 28.0, 30.0           # width (x) and length (y)
FRONT = -L / 2 - 1.0        # the face (the domed front cap)
SLOT_X, SLOT_Y, SLOT_L = 6.2, -5.0, 12.4   # the two toast slots (along y), their centre and length
SINK = 11.2                 # how far the toast goes down
EAR_Z = 16.6                # a slice's bottom at rest (it stands 22.5 tall)


# ------------------------------------------------------------------ the housing
def rings():
    R = []
    for y, w, ht, hb, e in ((-L / 2, 0.86, 0.42, 0.42, 2.6), (-L / 2 + 2.6, 0.97, 0.49, 0.49, 3.0), (-L / 2 + 8, 1.0, 0.5, 0.5, 3.4),
                            (L / 2 - 8, 1.0, 0.5, 0.5, 3.4), (L / 2 - 2.6, 0.96, 0.48, 0.48, 3.0), (L / 2, 0.84, 0.4, 0.4, 2.6)):
        R.append({'c': (0, y, ZC), 'w': W * w, 'ht': (Z1 - Z0) * ht, 'hb': (Z1 - Z0) * hb, 'e': e})
    return R


def sc_house(h):
    def f(V, N):
        d = np.zeros(len(V))
        # chubby cheeks either side of the nose (the face itself is drawn on, not sculpted)
        for sx in (1, -1):
            d += tk.bump(V, (sx * 7.0, FRONT + 2.4, ZC - 2.4), 6.4, 1.5, sharp=1.6)
        # the bakelite skirt's seam and the chrome body's raised side ribs (three on each flank)
        d -= 0.3 * tk.smoothstep(0.4, 0.0, np.abs(V[:, 2] - (Z0 + 3.4)))
        side = np.abs(N[:, 0]) > 0.7
        for z in (ZC - 3.0, ZC, ZC + 3.0):
            d += 0.28 * tk.smoothstep(0.45, 0.0, np.abs(V[:, 2] - z)) * side * (np.abs(V[:, 1]) < L / 2 - 6)
        return d
    tk.push(h, f)


def wells(o, bevel=0.5, segs=1):
    """The toast slots, deep enough to take the toast when it goes down, and the lever's groove down the side."""
    for sx in (1, -1):
        tk.boolean(o, tk.rbox('slot', (5.0, SLOT_L + 0.6, 22.0), centre=(sx * SLOT_X, SLOT_Y, Z1 - 9.0), bevel=bevel, segs=segs))
    tk.boolean(o, tk.rbox('groove', (5.0, 3.0, 13.0), centre=(-W / 2, 2.0, ZC + 1.6), bevel=bevel, segs=segs))


cage = tk.loft('house', rings(), n=20, cap0='round', cap1='round', capd=1.6)
house_lo, house_hi = tk.lowhigh(cage, 'house', lo=1, hi=3, sculpt=sc_house, region=('chrome', [('skirt', lambda C, N: C[:, 2] < Z0 + 3.4)]))
for o in (house_lo, house_hi):
    wells(o)
tk.regions(house_hi, 'chrome', [('skirt', lambda C, N: C[:, 2] < Z0 + 3.4), ('slotin', lambda C, N: (C[:, 2] < Z1 - 0.9) & (C[:, 2] > Z0 + 0.6) & (np.abs(np.abs(C[:, 0]) - SLOT_X) < 2.3) & (np.abs(C[:, 1] - SLOT_Y) < SLOT_L / 2 + 0.5)),
                                   ('slotin', lambda C, N: (np.abs(C[:, 0]) > W / 2 - 3.0) & (np.abs(C[:, 1] - 2.0) < 1.6) & (np.abs(C[:, 2] - ZC - 1.6) < 6.6) & (C[:, 0] < 0))])
tk.decimate(house_lo, 480)

# ------------------------------------------------------------------ the nose (the browning knob) and the buck teeth (the crumb tab)
nose = tk.lathe('nose', [(0, 1.0), (3.5, 1.0), (3.8, 0.0), (3.5, -1.5), (2.3, -2.5), (0, -2.8)], n=14, axis='Y', centre=(0, FRONT + 0.6, ZC - 1.8))
tk.scale(nose, (1.0, 1.0, 0.82), (0, FRONT, ZC - 1.8))


def sc_nose(h):
    def f(V, N):  # the knob's grip flutes, and the pointer ridge
        a = np.arctan2(V[:, 2] - (ZC - 1.8), V[:, 0])
        return -0.16 * (np.abs(np.sin(a * 6)) ** 4) * (N[:, 1] > -0.7) + 0.3 * tk.smoothstep(0.5, 0.1, np.abs(V[:, 0])) * (V[:, 2] > ZC - 1.8) * (N[:, 1] < -0.6)
    tk.push(h, f)


nose_lo, nose_hi = cx.low(nose, 'nose', 70, lo=0, hi=2, sculpt=sc_nose, region='nose')
teeth = tk.rbox('teeth', (6.2, 4.0, 4.4), centre=(0, FRONT + 1.4, Z0 + 3.6), bevel=0.9, segs=2)


def sc_teeth(h):
    def f(V, N):  # the gap between the two front teeth
        return -0.45 * tk.smoothstep(0.35, 0.0, np.abs(V[:, 0])) * (N[:, 1] < -0.3)
    tk.push(h, f)


teeth_lo, teeth_hi = cx.low(teeth, 'teeth', 40, lo=0, hi=2, sculpt=sc_teeth, region='teeth')


# ------------------------------------------------------------------ paws: four bakelite feet (long hind feet)
PAWS = []
for x, y, ln, wd in ((8.0, -10.8, 6.4, 6.4), (-8.0, -10.8, 6.4, 6.4), (10.2, 6.6, 14.0, 7.0), (-10.2, 6.6, 14.0, 7.0)):
    p = tk.loft('paw', [{'c': (x, y + ln / 2, 3.0), 'w': wd * 0.85, 'h': 2.6, 'e': 2.4},
                        {'c': (x, y, 3.0), 'w': wd, 'h': 3.0, 'e': 2.6},
                        {'c': (x, y - ln / 2, 2.4), 'w': wd * 0.92, 'h': 2.4, 'e': 2.6}], n=10, cap0='round', cap1='round', capd=1.6)
    tk.deform(p, lambda V: np.stack([V[:, 0], V[:, 1], np.maximum(V[:, 2], 0.05)], 1))

    def sc_paw(h, x=x, y=y, ln=ln):
        def f(V, N):  # three toe grooves at the front
            front = V[:, 1] < y - ln / 2 + 2.4
            return -0.35 * (np.abs(np.sin((V[:, 0] - x) * math.pi / 1.7)) < 0.25) * front * (N[:, 2] > -0.3)
        tk.push(h, f)
    PAWS.append(cx.low(p, 'paw', 40, hi=2, sculpt=sc_paw, region='bakelite'))

# ------------------------------------------------------------------ the side lever (a paw-shaped knob on a stem)
LV = (-W / 2 - 1.2, 2.0, ZC + 4.8)
stem = tk.rbox('stem', (4.6, 1.6, 2.2), centre=(-W / 2 + 0.6, 2.0, LV[2]), bevel=0.5, segs=1)
knob = tk.loft('knob', [{'c': (LV[0] - 0.4, 2.0, LV[2]), 'w': 4.2, 'h': 2.2, 'e': 2.4},
                        {'c': (LV[0] - 2.2, 2.0, LV[2] + 0.2), 'w': 4.8, 'h': 2.5, 'e': 2.5},
                        {'c': (LV[0] - 3.8, 2.0, LV[2] + 0.4), 'w': 4.2, 'h': 2.1, 'e': 2.4}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)


def sc_knob(h):
    def f(V, N):  # the paw's toe dents on top
        return -0.3 * (np.abs(np.sin((V[:, 1] - 2.0) * math.pi / 1.5)) < 0.3) * (N[:, 2] > 0.5) * (V[:, 0] < LV[0] - 2.6)
    tk.push(h, f)


lever = [cx.low(stem, 'stem', 24, lo=0, hi=1, region='chrome'), cx.low(knob, 'knob', 50, hi=2, sculpt=sc_knob, region='bakelite')]

# ------------------------------------------------------------------ the cottontail: the plug on its cord
TAIL = (0, L / 2 + 4.6, Z0 + 6.0)
cord = tk.tube('cord', [(0, L / 2 - 1.0, Z0 + 5.2), (0, L / 2 + 1.0, Z0 + 5.4), (0, L / 2 + 2.6, Z0 + 5.8)], [1.3, 1.25, 1.2], n=8)
plug = tk.lathe('plug', [(0, -3.6), (3.0, -3.4), (4.0, -1.8), (4.2, 0.4), (3.6, 2.4), (2.0, 3.6), (0, 3.9)], n=14, axis='Y', centre=TAIL)


def sc_plug(h):
    def f(V, N):  # fluff: soft tufts all over the bakelite ball (a cottontail moulded as a plug)
        a = np.arctan2(V[:, 2] - TAIL[2], V[:, 0])
        return 0.22 * np.abs(np.sin(a * 5 + V[:, 1] * 1.6)) ** 3
    tk.push(h, f)


tail = [cx.low(cord, 'cord', 30, lo=0, hi=1, region='cord'), cx.low(plug, 'plug', 70, hi=2, sculpt=sc_plug, region='tail')]

# ------------------------------------------------------------------ the toast: two slices, the ears
EARS = {}
for sx, nm in ((1, 'ear_l'), (-1, 'ear_r')):
    lean = 1.0 if sx > 0 else 0.6
    pts = [(-5.6, 0.0), (5.6, 0.0), (5.7, 14.0), (6.4, 16.2), (6.3, 18.6), (5.0, 20.8), (2.6, 22.3), (0.0, 22.6), (-2.6, 22.3),
           (-5.0, 20.8), (-6.3, 18.6), (-6.4, 16.2), (-5.7, 14.0)]
    pts = [(SLOT_Y + y, EAR_Z + z) for y, z in pts]
    t = tk.slab(nm, pts, 3.0, plane='YZ', at=sx * SLOT_X, bevel=0.8, segs=2)

    def sc_toast(h, sx=sx):
        def f(V, N):
            flat = np.abs(N[:, 0]) > 0.6
            # the crust stands proud round the edge, the crumb has open pores
            pores = -0.18 * (np.sin(V[:, 1] * 3.1 + np.sin(V[:, 2] * 2.3) * 1.5) * np.sin(V[:, 2] * 2.9 + V[:, 1] * 0.7) > 0.55)
            return np.where(flat, pores, 0.12)
        tk.push(h, f)
    lo, hi = tk.lowhigh(t, nm, lo=0, hi=2, sculpt=sc_toast, keep_corners=True,
                        region=('toast', [('crust', lambda C, N: np.abs(N[:, 0]) < 0.6)]))
    tk.decimate(lo, 64)
    EARS[nm] = (lo, hi, (sx * SLOT_X, SLOT_Y, Z1))

# ------------------------------------------------------------------ parts
F.part('house', tk.join([house_lo, teeth_lo] + [p[0] for p in PAWS], 'house'),
       [house_hi, teeth_hi] + [p[1] for p in PAWS], bone='root', kind='gloss')
F.part('nose', nose_lo, [nose_hi], bone='nose')
F.part('lever', tk.join([l[0] for l in lever], 'lever'), [l[1] for l in lever], bone='lever')
F.part('tail', tk.join([t[0] for t in tail], 'tail'), [t[1] for t in tail], bone='tail')
for nm, (lo, hi, p) in EARS.items():
    F.part(nm, lo, [hi], bone=nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('nose', (0, FRONT, ZC - 1.8), parent='root')
    R.bone('lever', LV, parent='root')
    R.bone('tail', (0, L / 2 + 1.0, Z0 + 5.4), parent='root')
    for nm, (lo, hi, p) in EARS.items():
        R.bone(nm, p, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'nose', 'lever', 'tail', 'ear_l', 'ear_r']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # the lever goes down and takes the toast with it: the ear tips peek out of the slots
        k('lever', 3)
        k('lever', 8, move=(0, 0, -6.6), ease='BACK')
        for nm in ('ear_l', 'ear_r'):
            k(nm, 3)
            k(nm, 9, move=(0, 0, -SINK), ease='BACK')
        k('root', 6)
        k('root', 9, scale=(1.03, 1.03, 0.95))
        k('root', 13, scale=1.0)
        # toasting: it ticks and trembles, the nose sniffs, the tail wags
        for i, f in enumerate(range(14, 40, 4)):
            k('root', f, rot=('Z', 1.6 if i % 2 else -1.6))
            k('nose', f, rot=('Y', 14 if i % 2 else -14))
            k('tail', f, rot=('Z', 10 if i % 2 else -10))
        k('root', 40)
        k('nose', 40)
        k('tail', 40)
        # DING: the toast-ears shoot up, the rabbit hops
        k('lever', 40, move=(0, 0, -6.6))
        k('lever', 43, ease='BACK')
        for nm in ('ear_l', 'ear_r'):
            k(nm, 40, move=(0, 0, -SINK))
            k(nm, 45, move=(0, 0, 8.0))
            k(nm, 52, ease='BOUNCE')
        k('root', 41)
        k('root', 45, move=(0, 0, 3.0), scale=(0.97, 0.97, 1.05))
        k('root', 51, ease='BOUNCE')
        # the ears flop out, one then the other; the nose twitches
        k('ear_l', 56)
        k('ear_l', 60, rot=('Y', 5), ease='BACK')
        k('ear_l', 70, rot=('Y', 5))
        k('ear_r', 59)
        k('ear_r', 63, rot=('Y', -5), ease='BACK')
        k('ear_r', 70, rot=('Y', -5))
        for i, f in enumerate(range(56, 72, 3)):
            k('nose', f, rot=('Y', 18 if i % 2 else -18))
        k('nose', 74)
        k('tail', 60)
        k('tail', 64, rot=('Z', 14))
        k('tail', 68, rot=('Z', -14))
        k('tail', 72)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    # painted chrome: the sky in the top half, a dark horizon band under the middle, the warm ground below
    CH = pt.ramp('#c3cbd2', 8, dark=0.7, light=0.7, shift=0.05)
    hz = ZC - 1.0 + 1.2 * np.sin(Yc * 0.25)
    flank = on[:, :, 1] > -0.55   # (the face keeps a soft chrome: no horizon line across it)
    chrome = 0.35 * tk.smoothstep(hz - 0.5, hz + 4.0, Z) - 0.7 * (np.abs(Z - hz) < 1.4) * flank - 0.25 * tk.smoothstep(hz - 1.5, Z0, Z) + 0.2 * (on[:, :, 2] > 0.8)
    m = P.fill('chrome', CH, tone=sh * 1.3, base=chrome)
    P.flat(m & flank & (np.abs(Z - (hz + 3.0)) < 0.4) & (np.abs(on[:, :, 2]) < 0.5), '#f4f6f6')  # the sharp highlight line
    CREAM = pt.ramp('#ece1c4', 7, shift=0.06)
    P.fill('skirt', CREAM, tone=sh, base=-0.05)
    P.fill('bakelite', CREAM, tone=sh, base=0.05)
    P.fill('slotin', pt.ramp('#3a3433', 5, shift=0.05), tone=sh, base=-0.1)
    # the face: rosy airbrushed cheeks, printed whiskers and the browning scale round the nose
    face = P.region('chrome') & (Yc < FRONT + 5.0) & (on[:, :, 1] < -0.3)
    for sx in (1, -1):
        ch = ((X - sx * 7.6) ** 2 / 12 + (Z - (ZC - 3.4)) ** 2 / 6 < 1)
        P.tint(face & ch, pt.ramp('#eab0b4', 6, shift=0.05), sh + 0.1)
    P.fill('nose', pt.ramp('#e98a96', 7, shift=0.06), tone=sh, base=0.1)
    P.flat(P.region('nose') & (np.abs(X) < 0.35) & (Z > ZC - 1.4) & (on[:, :, 1] < -0.6), '#fff4f0')
    P.fill('teeth', pt.ramp('#f6efe0', 6, shift=0.05), tone=sh, base=0.15)
    P.lines(['teeth'], None, col='#9a8c80')
    P.flat(P.region('teeth') & (np.abs(X) < 0.3) & (Yc < FRONT + 0.5), '#9a8c80')
    # the face, drawn on by hand: two ink dots set wide apart either side of the nose knob (the buck teeth are its mouth)
    cx.face(P, (0, FRONT, ZC), (0, -1, 0), eyes=[(6.9, 0.8), (-6.6, 0.5)], eye_r=1.2, where=face, facing=0.1)
    # the toast: golden, paler in the middle, the crust brown, a stripe of toasting from the element
    TOAST = pt.ramp('#e2ac5c', 7, shift=0.07)
    tz = Z - EAR_Z
    mid = np.exp(-((Yc - SLOT_Y) / 4.0) ** 2 - ((tz - 11) / 7.0) ** 2)
    free = P.shade(light=0.0, ao=0.0, cav=1.1)  # (the toast moves: no baked occlusion from the slot)
    P.fill('toast', TOAST, tone=free * 0.8, base=0.25 * mid - 0.1 * tk.smoothstep(16, 22, tz))
    P.fill('crust', pt.ramp('#9a5a2c', 7, shift=0.06), tone=free, base=0.0)
    P.tint(P.region('toast') & (np.abs(np.abs(Yc - SLOT_Y) - 2.6) < 0.5) & (tz > 6) & (tz < 19), pt.ramp('#c88a42', 6, shift=0.06), free * 0.8)
    # a pat of butter melting on the left ear (it is breakfast)
    bu, bv = (Yc - SLOT_Y + 0.6) * 0.92 + (tz - 15.2) * 0.38, -(Yc - SLOT_Y + 0.6) * 0.38 + (tz - 15.2) * 0.92
    butter = P.region('toast') & (X > 0) & (np.abs(bu) ** 4 + np.abs(bv) ** 4 < 1.9 ** 4)
    P.tint(butter, pt.ramp('#f6dc7c', 6, shift=0.05), free + 0.25)
    P.tint(butter & (bv > 1.1), pt.ramp('#f6dc7c', 6, shift=0.05), free + 0.6)
    melt = P.region('toast') & (X > 0) & (np.abs(Yc - SLOT_Y + 0.3) < 0.7) & (tz < 14.0) & (tz > 11.6 + 0.6 * np.sin(Yc * 3))
    P.tint(melt, pt.ramp('#eec664', 6, shift=0.05), free + 0.1)
    P.fill('tail', pt.ramp('#f4ecdc', 7, shift=0.05), tone=sh, base=0.1)
    P.fill('cord', pt.ramp('#3c3434', 5, shift=0.05), tone=sh, base=0.2)
    # a little red maker's badge on the flank
    badge = P.region('chrome') & (X > 0) & ((Yc - 4.0) ** 2 / 10 + (Z - (ZC + 4.6)) ** 2 / 2.2 < 1)
    P.flat(badge, '#c8323a')
    P.flat(badge & ((Yc - 4.0) ** 2 / 4 + (Z - (ZC + 4.6)) ** 2 / 0.6 < 1), '#f1e3bf')
    P.lines(['chrome'], ['skirt', 'nose', 'teeth', 'slotin'], step=2)
    P.lines(['toast'], ['crust'], step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('nose', 'house'), ('lever', 'house'), ('tail', 'house')]),
       cams=[((66, -78, 50), (0, -2, 18)), ((-62, 70, 46), (0, 0, 18))], fold=(0, 12, 30, 45, 62))
