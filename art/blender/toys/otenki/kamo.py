"""あめガモ Rain Duck: the rain courier (series otenki, concepts_D.md). A spot-billed duck in a yellow sou'wester on a
blue-grey rain cloud, steering with a big tin watering can held in both wings; the rose drips.

Gimmick: it tips the can and a shower of rain fans out of the rose; a quack. Pull it back and let go: the cloud scoots
off (run).

    tools/blender.sh art/blender/toys/otenki/kamo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402


import _kumo as km  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402
from mathutils import Vector  # noqa: E402

tk.reset()
F = Fig('otenki', 'kamo')
C = km.cloud(F, L=26.0, W=17.0, Hc=8.0, seed=7, region='cloud', bar=False)
ST = C['top'] - 0.8
HC = np.array((0.0, -0.8, ST + 13.4))
CB = np.array((0.0, -7.0, C['top'] - 0.6))      # the can's foot
SP0 = CB + (1.4, -2.2, 1.6)
SP1 = CB + (4.2, -6.8, 6.4)                    # the spout's end (the rose)
SD = (SP1 - SP0) / np.linalg.norm(SP1 - SP0)
low = km.low

# ------------------------------------------------------------------ the duck: an egg of a body, a stubby tail, orange feet
body = tk.loft('body', [{'c': (0, 1.0, ST + 0.6), 'w': 9.8, 'h': 4.0, 'e': 2.2}, {'c': (0, 0.8, ST + 4.4), 'w': 10.6, 'h': 4.4, 'e': 2.2},
                        {'c': (0, 0.4, ST + 8.0), 'w': 8.6, 'h': 3.6, 'e': 2.2}, {'c': (0, 0.0, ST + 10.6), 'w': 5.4, 'h': 2.6, 'e': 2.2}],
               n=14, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
RIDER = [low(body, 'body', 140, region=('plume', [('breast', lambda C_, N: (N[:, 1] < -0.5) & (C_[:, 2] > ST + 6.0))]))]
tl = tk.loft('tail', [{'c': (0, 4.6, ST + 2.0), 'w': 4.4, 'h': 1.0}, {'c': (0, 6.6, ST + 3.4), 'w': 2.6, 'h': 0.6}], n=8, up=(0, 0, 1), cap1='point')
RIDER.append(low(tl, 'tail', 20, lo=1, hi=1, region='tailf'))
for sx in (1, -1):
    ft = tk.loft('foot', [{'c': (sx * 3.0, -3.2, ST + 0.4), 'w': 1.4, 'h': 0.5}, {'c': (sx * 3.4, -5.6, ST + 0.1), 'w': 3.2, 'h': 0.45},
                          {'c': (sx * 3.6, -6.4, ST + 0.0), 'w': 3.4, 'h': 0.3}], n=6, up=(0, 0, 1), cap0='round', cap1='round', capd=0.3)
    RIDER.append(low(ft, 'foot', 20, lo=1, hi=1, region='foot'))
# ------------------------------------------------------------------ the head: round, the flat spatula bill, the yellow sou'wester
head = tk.lathe('head', [(0, -3.4), (2.8, -2.8), (3.8, -0.4), (3.6, 1.4), (2.4, 3.0), (0, 3.4)], n=14, centre=tuple(HC))
bill = tk.loft('bill', [{'c': tuple(HC + (0, -3.0, -0.6)), 'w': 3.0, 'h': 1.1, 'e': 2.4}, {'c': tuple(HC + (0, -5.4, -1.0)), 'w': 3.4, 'h': 0.8, 'e': 2.8},
                        {'c': tuple(HC + (0, -7.0, -1.3)), 'w': 3.0, 'h': 0.55, 'e': 2.6}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.4)
HB = HC + (0, 0.6, 2.2)
brim = tk.lathe('brim', [(0, -0.2), (6.0, -0.25), (6.2, 0.05), (5.8, 0.25), (0, 0.3)], n=18, centre=tuple(HB))
tk.scale(brim, (0.9, 1.0, 1.0), pivot=tuple(HB))
tk.rotate(brim, -12, 'X', pivot=tuple(HB))
crown = tk.lathe('crown', [(0, 0.0), (3.7, 0.0), (3.7, 1.0), (3.0, 2.4), (1.6, 3.2), (0, 3.4)], n=14, centre=tuple(HB))
tk.rotate(crown, -12, 'X', pivot=tuple(HB))
HEAD = [low(head, 'head', 110, region=('face', [('crownf', lambda C_, N: C_[:, 2] > HC[2] + 2.4)])), low(bill, 'bill', 50, region=('bill', [('billtip', lambda C_, N: C_[:, 1] < HC[1] - 6.2)])),
        low(brim, 'brim', 70, lo=0, hi=1, region='hat'), low(crown, 'crown', 60, lo=0, hi=1, region='hat')]
# ------------------------------------------------------------------ the watering can: tin body, long spout, rose, top handle; the wings on it
can = tk.lathe('can', [(0, 0.0), (2.6, 0.0), (2.75, 0.3), (2.75, 4.4), (2.4, 4.8), (0, 4.9)], n=14, centre=tuple(CB))
spout = tk.tube('spout', [tuple(SP0), tuple((SP0 + SP1) / 2), tuple(SP1)], [0.75, 0.6, 0.55], n=8)
rose = tk.lathe('rose', [(0.5, 0.0), (1.4, 0.9), (1.5, 1.2), (0, 1.25)], n=10)
q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(SD)))
tk.transform(rose, q.to_matrix().to_4x4())
tk.move(rose, tuple(SP1 - SD * 0.3))
hnd = tk.tube('handle', [tuple(CB + (0, 2.0, 4.4)), tuple(CB + (0, 0.6, 7.6)), tuple(CB + (0, -1.4, 7.6)), tuple(CB + (0, -2.4, 4.6))], 0.45, n=6)
CAN = [low(can, 'can', 60, lo=0, hi=1, region='tin'), low(spout, 'spout', 30, lo=1, hi=1, region='tin'), low(rose, 'rose', 24, lo=0, hi=1, region='brass'),
       low(hnd, 'handle', 24, lo=1, hi=1, region='tin')]
# the shower: a fan of rain from the rose (small at rest: a drip; it grows out in the gimmick)
fan = tk.lathe('shower', [(0.3, 0.0), (1.0, 2.0), (2.0, 4.6), (2.6, 6.0), (2.4, 6.3), (1.2, 4.0), (0.2, 0.6)], n=10)
tk.scale(fan, 0.16)
q2 = Vector((0, 0, 1)).rotation_difference(Vector(tuple(SD * 0.6 + np.array((0, 0, -0.8)))))
tk.transform(fan, q2.to_matrix().to_4x4())
tk.move(fan, tuple(SP1 + SD * 0.9))
fan_lo, fan_hi = low(fan, 'shower', 40, lo=0, hi=1, region='rain')
WINGS = {}
for nm, sx in (('wing_l', 1), ('wing_r', -1)):
    sh_ = np.array((sx * 4.6, 0.2, ST + 8.6))
    tip = CB + (sx * 1.0, -0.4, 7.4)
    w = tk.loft(nm, [{'c': tuple(sh_), 'w': 2.8, 'h': 1.4}, {'c': tuple((sh_ + tip) / 2 + (sx * 1.6, 0.6, -1.0)), 'w': 3.4, 'h': 1.1},
                     {'c': tuple(tip), 'w': 1.6, 'h': 0.7}], n=8, up=(sx, 0, 0.4), cap0='round', cap1='round', capd=0.6)
    WINGS[nm] = (low(w, nm, 40, region=('plume', [('specul', lambda C_, N, s=sh_: (np.abs(C_[:, 2] - s[2] + 3.0) < 1.2))])), tuple(sh_))

# ------------------------------------------------------------------ parts
km.parts(F, C)
F.part('rider', tk.join([r[0] for r in RIDER], 'rider'), [r[1] for r in RIDER], bone='rider')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
for nm, (pr, sh_) in WINGS.items():
    F.part(nm, pr[0], [pr[1]], bone=nm)
F.part('can', tk.join([c_[0] for c_ in CAN], 'can'), [c_[1] for c_ in CAN], bone='can')
F.part('shower', fan_lo, [fan_hi], bone='shower', kind='gloss')


# ------------------------------------------------------------------ rig: the press clip and the pull-back run
def make_rig():
    from rig import Rig
    R = Rig()
    km.bones(R, C)
    R.bone('rider', (0, 0.8, ST), parent='cloud')
    R.bone('head', (0, 0.0, ST + 10.6), parent='rider')
    for nm, (pr, sh_) in WINGS.items():
        R.bone(nm, sh_, parent='rider')
    R.bone('can', tuple(CB + (0, -1.0, 0.4)), parent='cloud')
    R.bone('shower', tuple(SP1 + SD * 0.9), parent='can')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'cloud', 'wf', 'wb', 'rider', 'head', 'wing_l', 'wing_r', 'can', 'shower']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-14 the wings heave the can up; 14-22 tip it: the shower fans out of the rose; 22-56 watering (the can sways);
        # 30 quack (the head tips up); 56-70 back
        k('can', 4)
        k('can', 12, move=(0, 0, 1.2))
        k('can', 20, move=(0, -0.4, 1.4), rot=('X', 30), ease='BACK')
        for i, f in enumerate(range(26, 56, 6)):
            k('can', f, move=(0, -0.4, 1.4), rot=[('X', 30), ('Y', 6 if i % 2 else -6)])
        k('can', 58, move=(0, -0.4, 1.4), rot=('X', 30))
        k('can', 70)
        for nm in WINGS:
            k(nm, 4)
            k(nm, 12, move=(0, 0, 1.0))
            k(nm, 20, move=(0, -1.2, 1.4), rot=('X', -10))
            k(nm, 58, move=(0, -1.2, 1.4), rot=('X', -10))
            k(nm, 70)
        k('shower', 14)
        k('shower', 22, scale=6.4, ease='BACK')
        for i, f in enumerate(range(26, 56, 4)):
            k('shower', f, scale=6.0 if i % 2 else 6.6)
        k('shower', 62, scale=6.0)
        k('shower', 68)
        k('head', 24)
        k('head', 30, rot=('X', -16), ease='BACK')
        k('head', 34)
        k('head', 40, rot=('X', -12))
        k('head', 44)
        for b in allb:
            k(b, 76)
    km.run(R, C, extra=lambda k_, f: (k_('head', f, rot=('X', 0 if f % 16 == 0 else 6)), k_('can', f), k_('wing_l', f), k_('wing_r', f)))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    km.paint_cloud(P, pt, sh, C, col='#a8b6c6', belly='#5c6a80')
    km.paint_kit(P, pt, sh, C, plate_ink='#2a5ab0')
    # the duck: brown scalloped plumage, a buff face with a dark crown and eye-line, black bill with a yellow tip
    pl = P.region('plume')
    P.fill('plume', pt.ramp('#8a6440', 7, shift=0.07), tone=sh, base=0.05, brush='feather')
    who, d = P.dabs(pl, size=1.0, spacing=1.6, seed=31)
    P.shift(pl & (who >= 0) & (d > 0.78), 1)     # pale feather edges
    P.fill('breast', pt.ramp('#b08a62', 6, shift=0.06), tone=sh, base=0.1, brush='feather')
    P.fill('specul', pt.ramp('#3a5ab8', 5, shift=0.06), tone=sh, base=0.1)
    P.fill('tailf', pt.ramp('#3a2e26', 5), tone=sh, base=0.05)
    P.fill('face', pt.ramp('#e6d4b0', 6, shift=0.05), tone=sh, base=0.15, brush='feather')
    P.fill('crownf', pt.ramp('#4a3626', 5, shift=0.05), tone=sh, base=0.05, brush='feather')
    fa = P.region('face') & (P.part == PI['head'])
    P.fill(fa & (np.abs(Z - HC[2] - 0.1 + 0.25 * (Y - HC[1])) < 0.16) & (Y < HC[1] - 0.6) & (np.abs(X) > 1.6), pt.ramp('#4a3626', 4), tone=sh, base=0.05, brush=False)   # eye-line
    P.fill('bill', pt.ramp('#34363a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('billtip', pt.ramp('#f0c030', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('foot', pt.ramp('#e88a30', 5, shift=0.06), tone=sh, base=0.1)
    P.fill('hat', pt.ramp('#f2c230', 6, shift=0.07), tone=sh, base=0.12, brush='gloss')
    P.shift(P.region('hat') & (P.cav > 0.55), -1)
    P.fill('tin', pt.ramp('#b4bcc4', 7, shift=0.04, light=0.7, dark=0.65), tone=sh * 1.3, base=0.05)
    tn = P.region('tin') & (P.part == PI['can'])
    P.fill(tn & (np.abs(Z - CB[2] - 2.4) < 0.9) & (np.abs(P.on[:, :, 2]) < 0.5), pt.ramp('#2a5ab0', 5, shift=0.05), tone=sh, base=0.05)   # a painted blue band
    P.fill('brass', pt.ramp('#c9a24a', 5, shift=0.06), tone=sh, base=0.1)
    P.fill('rain', pt.ramp('#bfe0f2', 5, shift=0.04), tone=sh * 0.5, base=0.25, brush=False)
    rn = P.region('rain')
    ang = np.arctan2(Y - SP1[1], X - SP1[0])
    P.fill(rn & (np.abs(np.sin(ang * 9)) > 0.8), pt.ramp('#7ab4d8', 4), tone=sh * 0.5, base=0.1, brush=False)
    # the face: dots in the eye-line, blush at the bill's root, a smile line along the bill
    hd = (P.region('face') | P.region('crownf')) & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -3.4, 0.8)), axis=(0, -1, 0.15), where=hd, seed=631)
    fc.eyes('dot', spread=4.8, size=0.55, dy=0.6, uneven=0.2)
    fc.blush(spread=5.2, dy=-1.2, rx=0.9, ry=0.5)
    P.lines(['bill', 'hat', 'foot'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 77), skip=[('rider', 'cloud'), ('head', 'rider'), ('wing_l', 'rider'), ('wing_r', 'rider'), ('can', 'cloud'),
                                                              ('wf', 'cloud'), ('wb', 'cloud'), ('shower', 'can'), ('wing_l', 'can'), ('wing_r', 'can')]),
    cams=[((46, -60, 44), (0, -2, 16)), ((-46, 56, 40), (0, 2, 16))], fold=(0, 14, 24, 40))
