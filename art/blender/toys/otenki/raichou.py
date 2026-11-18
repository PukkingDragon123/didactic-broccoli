"""ゆきライチョウ Snow Ptarmigan: the snow courier (series otenki, concepts_D.md). A rock ptarmigan in its white winter
plumage (red comb over the eye, black lores and tail edge, feathered snow-boot feet) holding a round wooden sieve of
snow up over its head, on a fat fluffy snow cloud.

Gimmick: it shakes the sieve side to side, fluffing right up, and sits back pleased. Pull it back and let go: the
cloud scoots off (run).

    tools/blender.sh art/blender/toys/otenki/raichou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kumo as km  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('otenki', 'raichou')
C = km.cloud(F, L=24.0, W=17.5, Hc=8.6, seed=9, lumps=1.25, region='cloud')
ST = C['top'] - 0.8
HC = np.array((0.0, -0.8, ST + 12.2))
SV = np.array((0.0, -0.2, ST + 19.4))      # the sieve's centre
low = km.low

# ------------------------------------------------------------------ the ptarmigan: a plump round body, the fanned tail, feathered feet
body = tk.loft('body', [{'c': (0, 0.8, ST + 0.8), 'w': 10.6, 'h': 4.4, 'e': 2.2}, {'c': (0, 0.6, ST + 4.6), 'w': 11.4, 'h': 4.9, 'e': 2.2},
                        {'c': (0, 0.2, ST + 8.0), 'w': 9.0, 'h': 4.0, 'e': 2.2}, {'c': (0, 0.0, ST + 10.0), 'w': 6.0, 'h': 3.0, 'e': 2.2}],
               n=14, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
RIDER = [low(body, 'body', 140, sculpt=lambda h: tk.push(h, lambda V, N: 0.18 * np.sin(V[:, 2] * 3.0 + V[:, 0]) * np.sin(V[:, 0] * 2.4)), region='plume')]
tail = tk.loft('tail', [{'c': (0, 4.6, ST + 2.2), 'w': 4.0, 'h': 0.9}, {'c': (0, 7.0, ST + 3.4), 'w': 6.4, 'h': 0.8}, {'c': (0, 7.8, ST + 3.8), 'w': 6.0, 'h': 0.6}],
               n=8, up=(0, -0.3, 1), cap1='round', capd=0.4)
RIDER.append(low(tail, 'tail', 24, lo=1, hi=1, region=('plume', [('tailblack', lambda C_, N: C_[:, 1] > 6.6)])))
for sx in (1, -1):
    ft = tk.lathe('boot', [(0, -1.2), (1.6, -1.0), (2.0, 0.0), (1.7, 1.0), (0, 1.4)], n=10, centre=(sx * 3.0, -4.6, ST + 0.9))
    tk.scale(ft, (1.0, 1.3, 0.8), pivot=(sx * 3.0, -4.6, ST + 0.9))
    RIDER.append(low(ft, 'boot', 30, lo=1, hi=2, sculpt=lambda h: tk.push(h, lambda V, N: 0.2 * np.sin(V[:, 1] * 6.0) * np.sin(V[:, 0] * 5.0)), region='plume'))
    for t in (-1, 0, 1):   # three little dark claws peeping out of the feathers
        cl = tk.tube('claw', [(sx * 3.0 + t * 0.8, -6.4, ST + 0.6), (sx * 3.0 + t * 1.0, -7.2, ST + 0.3)], [0.3, 0.1], n=4, cap1='point')
        RIDER.append(low(cl, 'claw', 8, lo=0, hi=1, region='beak'))
# ------------------------------------------------------------------ the head with its short dark beak
head = tk.lathe('head', [(0, -3.2), (2.6, -2.6), (3.4, -0.4), (3.2, 1.4), (2.2, 2.8), (0, 3.2)], n=14, centre=tuple(HC))
beak = tk.tube('beak', [tuple(HC + (0, -2.8, -0.3)), tuple(HC + (0, -3.8, -0.6)), tuple(HC + (0, -4.4, -1.1))], [0.9, 0.55, 0.12], n=6, cap1='point')
HEAD = [low(head, 'head', 100, region='plume'), low(beak, 'beak', 16, lo=1, hi=1, region='beak')]
# ------------------------------------------------------------------ the sieve of snow held up in both wings
rim = tk.lathe('rim', [(5.4, -0.9), (6.2, -0.9), (6.3, 0.9), (5.4, 0.9)], n=18, centre=tuple(SV))
mesh = tk.cyl('mesh', 5.5, SV[2] - 0.6, SV[2] - 0.3, n=16, at=(SV[0], SV[1]), axis='Z', bevel=0.1, segs=1)
snow = tk.lathe('snow', [(0, -0.4), (5.4, -0.4), (5.3, 0.6), (4.2, 1.8), (2.4, 2.8), (0, 3.2)], n=16, centre=tuple(SV))
SIEVE = [low(rim, 'rim', 70, lo=0, hi=1, region='wood'), low(mesh, 'mesh', 30, lo=0, hi=0, region='mesh'),
         low(snow, 'snow', 90, lo=1, hi=2, sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * np.sin(V[:, 0] * 1.7) * np.sin(V[:, 1] * 1.9 + 1.0) * (N[:, 2] > 0.3)), region='snow')]
WINGS = {}
for nm, sx in (('wing_l', 1), ('wing_r', -1)):
    sh_ = np.array((sx * 4.8, 0.4, ST + 8.4))
    tip = SV + (sx * 6.4, 0.0, -0.4)
    w = tk.loft(nm, [{'c': tuple(sh_), 'w': 3.0, 'h': 1.5}, {'c': tuple((sh_ + tip) / 2 + (sx * 1.4, 0.4, 0)), 'w': 3.6, 'h': 1.2},
                     {'c': tuple(tip), 'w': 2.0, 'h': 0.8}], n=8, up=(0, 1, 0), cap0='round', cap1='round', capd=0.7)
    WINGS[nm] = (low(w, nm, 40, region=('plume', [('primary', lambda C_, N, t=tip: np.linalg.norm(C_ - t, axis=1) < 2.4)])), tuple(sh_))

# ------------------------------------------------------------------ parts
km.parts(F, C)
F.part('rider', tk.join([r[0] for r in RIDER], 'rider'), [r[1] for r in RIDER], bone='rider')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
for nm, (pr, sh_) in WINGS.items():
    F.part(nm, pr[0], [pr[1]], bone=nm)
F.part('sieve', tk.join([s_[0] for s_ in SIEVE], 'sieve'), [s_[1] for s_ in SIEVE], bone='sieve')


# ------------------------------------------------------------------ rig: the press clip and the pull-back run
def make_rig():
    from rig import Rig
    R = Rig()
    km.bones(R, C)
    R.bone('rider', (0, 0.6, ST), parent='cloud')
    R.bone('head', (0, -0.2, ST + 10.0), parent='rider')
    for nm, (pr, sh_) in WINGS.items():
        R.bone(nm, sh_, parent='rider')
    R.bone('sieve', tuple(SV), parent='rider')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'cloud', 'wf', 'wb', 'rider', 'head', 'wing_l', 'wing_r', 'sieve']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-40 shake-shake: the sieve (and the wings with it) side to side; 8-20 it fluffs right up; 44-60 it sits back
        # pleased, head on one side; 76 back
        for i, f in enumerate(range(4, 42, 3)):
            d = 0 if f in (4, 40) else (1 if i % 2 else -1)
            k('sieve', f, move=(1.6 * d, 0, 0), rot=('Y', -10 * d), ease='LINEAR')
            for nm in WINGS:
                k(nm, f, move=(1.4 * d, 0, 0), ease='LINEAR')
        k('rider', 6)
        k('rider', 16, scale=(1.08, 1.08, 1.06), ease='BACK')
        k('rider', 40, scale=(1.08, 1.08, 1.06))
        k('rider', 50, rot=('X', 6))
        k('rider', 66, rot=('X', 6))
        k('rider', 76)
        k('head', 40)
        k('head', 48, rot=[('Y', 16), ('X', -6)], ease='BACK')
        k('head', 66, rot=[('Y', 16), ('X', -6)])
        k('head', 76)
        k('sieve', 50)
        k('sieve', 54, move=(0, 0, 0.6))
        k('sieve', 58)
        for b in allb:
            k(b, 80)
    km.run(R, C, extra=lambda k_, f: (k_('head', f), k_('sieve', f, rot=('Y', 0 if f % 16 == 0 else 4)), k_('wing_l', f), k_('wing_r', f)))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    km.paint_cloud(P, pt, sh, C, col='#f4f6f6', belly='#b8c8d8')
    km.paint_kit(P, pt, sh, C, plate_ink='#2a5ab0')
    # white winter plumage, blue-grey in the shade, faint feather scallops; black tail edge and primaries' tips
    pl = P.region('plume')
    P.fill('plume', pt.ramp('#f2f2ee', 7, shift=0.06, dark=0.42), tone=sh, base=0.2, brush='feather')
    who, d = P.dabs(pl, size=1.0, spacing=1.7, seed=41)
    P.shift(pl & (who >= 0) & (d > 0.8) & (Z < HC[2] - 2.0), -1)
    P.fill('tailblack', pt.ramp('#2c2a2a', 5), tone=sh, base=0.05)
    P.fill('primary', pt.ramp('#e6e6e2', 6, shift=0.05, dark=0.42), tone=sh, base=0.1, brush='feather')
    P.fill('beak', pt.ramp('#2c2a2a', 5), tone=sh, base=0.1)
    yu_wood = {'preset': 'wood', 'flow': 'around'}
    P.fill('wood', pt.ramp('#c8a06a', 6, shift=0.06), tone=sh, base=0.05, brush=yu_wood)
    P.fill('mesh', pt.ramp('#8a7a62', 4), tone=sh, base=0.0, brush=False)
    P.flat(P.region('mesh') & ((np.abs(np.mod(X, 0.8) - 0.4) < 0.1) | (np.abs(np.mod(Y, 0.8) - 0.4) < 0.1)), '#4a3e30')
    P.fill('snow', pt.ramp('#f6f8fa', 6, shift=0.05, dark=0.42), tone=sh, base=0.25, brush={'preset': 'pvc', 'flow': 'around', 'L': 1.6})
    # the face: the black lores through the eye, the red comb over it, the eyes on the stripe in light ink, blush
    hd = P.region('plume') & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -3.2, 0.6)), axis=(0, -1, 0.1), where=hd, seed=641)
    for sx in (1, -1):
        fc.patch(sx * 1.3, -0.1, 0.8, 0.26, '#2c2a2a', rot=sx * 8)     # the black lores
        fc.patch(sx * 2.2, 1.3, 0.85, 0.3, '#d23a32', rot=-sx * 14)    # the red comb
    fe = face.Face(P, c=tuple(HC + (0, -3.2, 0.6)), axis=(0, -1, 0.1), where=hd, seed=642, ink='#efe4c8')
    fe.eyes('dot', spread=4.0, size=0.42, dy=0.1, uneven=0.2)
    fc.blush(spread=4.6, dy=-1.0, rx=0.9, ry=0.5)
    P.lines(['wood', 'beak'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('rider', 'cloud'), ('head', 'rider'), ('wing_l', 'rider'), ('wing_r', 'rider'), ('wing_l', 'sieve'),
                                                              ('wing_r', 'sieve'), ('wf', 'cloud'), ('wb', 'cloud')]),
    cams=[((40, -52, 40), (0, -1, 16)), ((-40, 48, 38), (0, 2, 16))], fold=(0, 10, 25, 50))
