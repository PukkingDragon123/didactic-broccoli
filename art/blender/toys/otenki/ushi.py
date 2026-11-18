"""かみなりコウシ Thunder Calf: the thunder courier (series otenki, concepts_D.md). A brown calf with stubby horns in
the thunder god's tiger-stripe shorts, riding a dark thundercloud scooter, the god's ring of little taiko drums
strapped on an arch behind him, drumsticks in his fists on the handlebar.

Gimmick: don-don-don on the drums over his shoulders, and a zigzag lightning bolt jumps up out of the cloud (light-up,
flickering). Pull it back and let go: the cloud scoots off (run).

    tools/blender.sh art/blender/toys/otenki/ushi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _kumo as km  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('otenki', 'ushi')
C = km.cloud(F, L=27.0, W=19.0, Hc=8.4, seed=3, region='cloud')
ST = C['top'] - 0.8                       # the seat
HC = np.array((0.0, -1.6, ST + 13.6))    # the head's centre
AC = np.array((0.0, 7.0, ST + 8.0))      # the drum arch's centre
low = km.low

# ------------------------------------------------------------------ the calf: body, tiger-stripe shorts, legs astride
body = tk.loft('body', [{'c': (0, 0.8, ST + 0.6), 'w': 9.6, 'h': 4.2, 'e': 2.2}, {'c': (0, 0.6, ST + 4.4), 'w': 10.0, 'h': 4.4, 'e': 2.2},
                        {'c': (0, 0.2, ST + 8.2), 'w': 9.0, 'h': 4.0, 'e': 2.2}, {'c': (0, -0.2, ST + 10.6), 'w': 6.4, 'h': 3.0, 'e': 2.2}],
               n=14, up=(0, -1, 0), cap0='round', cap1='round', capd=1.0)
RIDER = [low(body, 'body', 150, region=('hide', [('shorts', lambda C_, N: C_[:, 2] < ST + 3.8)]))]
for sx in (1, -1):
    lg = tk.tube('leg', [(sx * 3.4, -0.6, ST + 1.8), (sx * 5.6, -4.6, ST + 1.2), (sx * 6.4, -5.6, ST - 2.6), (sx * 6.6, -6.4, ST - 3.6)], [2.4, 2.1, 1.7, 1.6], n=8)
    RIDER.append(low(lg, 'leg', 50, region=('hide', [('shorts', lambda C_, N: C_[:, 1] > -3.0), ('hoof', lambda C_, N: C_[:, 2] < ST - 2.8)])))
# ------------------------------------------------------------------ the head: a broad muzzle, ears out sideways, stubby horns
head = tk.lathe('head', [(0, -3.6), (3.0, -3.0), (4.2, -0.4), (4.0, 1.6), (2.6, 3.4), (0, 3.8)], n=14, centre=tuple(HC))
tk.scale(head, (1.08, 0.96, 1.0), pivot=tuple(HC))
MZ = HC + (0, -3.6, -1.6)
muz = tk.loft('muzzle', [{'c': tuple(MZ + (0, 1.6, 0.2)), 'w': 5.6, 'h': 2.6, 'e': 2.3}, {'c': tuple(MZ), 'w': 6.2, 'h': 2.8, 'e': 2.6},
                         {'c': tuple(MZ + (0, -1.0, -0.1)), 'w': 5.4, 'h': 2.3, 'e': 2.6}], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
HEAD = [low(head, 'head', 120, region='hide'), low(muz, 'muzzle', 60, region='muzzle')]
for sx in (1, -1):
    ear = tk.loft('ear', [{'c': tuple(HC + (sx * 3.6, 0.2, 1.2)), 'w': 1.6, 'h': 0.6}, {'c': tuple(HC + (sx * 5.0, 0.4, 0.2)), 'w': 2.4, 'h': 0.7},
                          {'c': tuple(HC + (sx * 6.0, 0.4, -1.0)), 'w': 1.0, 'h': 0.4}], n=8, up=(0, -1, 0.4), cap0='round', cap1='point')
    horn = tk.tube('horn', [tuple(HC + (sx * 2.2, 0.4, 3.0)), tuple(HC + (sx * 2.9, 0.6, 4.4)), tuple(HC + (sx * 3.0, 0.4, 5.4))], [0.85, 0.6, 0.25], n=6, cap1='point')
    HEAD += [low(ear, 'ear', 24, lo=1, hi=1, region=('hide', [('earin', lambda C_, N: N[:, 1] < -0.5)])), low(horn, 'horn', 16, lo=1, hi=1, region='horn')]
tuft = tk.loft('tuft', [{'c': tuple(HC + (0, -1.0, 3.4)), 'w': 3.0, 'h': 0.8}, {'c': tuple(HC + (0.4, -2.2, 3.2)), 'w': 2.0, 'h': 0.6}], n=6, up=(0, 0, 1), cap1='point')
HEAD.append(low(tuft, 'tuft', 14, lo=1, hi=1, region='tuft'))
# ------------------------------------------------------------------ arms on the handlebar, a drumstick in each fist
ARMS = {}
for nm, sx in (('arm_l', 1), ('arm_r', -1)):
    sh_ = np.array((sx * 4.6, 0.0, ST + 9.4))
    hand = np.array((sx * 4.6, -C['L'] * 0.36 + 0.2, C['top'] + 3.6))
    a = tk.tube(nm, [tuple(sh_), tuple((sh_ + hand) / 2 + (sx * 1.2, 0, -1.6)), tuple(hand)], [1.9, 1.6, 1.6], n=8, cap1='round')
    stick = tk.tube('bachi', [tuple(hand + (0, 0.6, -1.6)), tuple(hand + (0, -0.6, 2.8)), tuple(hand + (0, -1.0, 5.6))], [0.4, 0.45, 0.6], n=6)
    ARMS[nm] = ([low(a, nm, 44, region=('hide', [('hoof', lambda C_, N, h=hand: np.linalg.norm(C_ - h, axis=1) < 1.2)])),
                 low(stick, 'bachi', 16, lo=1, hi=1, region='bachi')], tuple(sh_))
# ------------------------------------------------------------------ the drum arch on the rack: five little taiko facing front
arch = tk.tube('arch', [(AC[0] + 9.0 * math.cos(math.radians(a)), AC[1], AC[2] + 9.0 * math.sin(math.radians(a)) - 2.0) for a in np.linspace(-10, 190, 11)],
               0.7, n=6, cap0='flat', cap1='flat')
DRUMS = [low(arch, 'arch', 90, lo=1, hi=1, region='arch')]
for a in (15, 52, 90, 128, 165):
    c = AC + (9.0 * math.cos(math.radians(a)), -0.2, 9.0 * math.sin(math.radians(a)) - 2.0)
    d = tk.lathe('drum', [(0, -1.2), (1.7, -1.2), (2.1, -0.6), (2.2, 0.0), (2.1, 0.6), (1.7, 1.2), (0, 1.2)], n=12, axis='Y', centre=tuple(c))
    DRUMS.append(low(d, 'drum', 40, lo=0, hi=1, region=('drumbody', [('drumhead', lambda C_, N: np.abs(N[:, 1]) > 0.8)])))
for sx in (1, -1):    # the arch's feet on the rack
    ft = tk.tube('archfoot', [(sx * 9.0, AC[1], AC[2] - 3.6), (sx * 3.4, C['rack'][1], C['rack'][2])], 0.5, n=6)
    DRUMS.append(low(ft, 'archfoot', 16, lo=1, hi=1, region='arch'))
# ------------------------------------------------------------------ the lightning bolt on the cloud's nose (it jumps up and crackles)
BC = np.array((0.0, -C['L'] * 0.48, C['z0'] + 3.4))
bolt = tk.slab('bolt', [(-0.6, -2.8), (1.4, 0.4), (0.0, 0.4), (1.2, 3.4), (-1.4, -0.2), (0.2, -0.2), (-1.6, -2.8)], 1.0, plane='XZ', at=0.0, bevel=0.25, segs=1)
tk.move(bolt, tuple(BC))
bolt_lo, bolt_hi = low(bolt, 'bolt', 40, lo=0, hi=1, region='bolt')

# ------------------------------------------------------------------ parts
km.parts(F, C)
F.part('rider', tk.join([r[0] for r in RIDER], 'rider'), [r[1] for r in RIDER], bone='rider')
F.part('head', tk.join([h[0] for h in HEAD], 'head'), [h[1] for h in HEAD], bone='head')
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('drums', tk.join([d[0] for d in DRUMS], 'drums'), [d[1] for d in DRUMS], bone='drums')
F.part('bolt', bolt_lo, [bolt_hi], bone='bolt', kind='led')


# ------------------------------------------------------------------ rig: the press clip and the pull-back run
def make_rig():
    from rig import Rig
    R = Rig()
    km.bones(R, C)
    R.bone('rider', (0, 0.6, ST), parent='cloud')
    R.bone('head', (0, -0.4, ST + 10.6), parent='rider')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='rider')
    R.bone('drums', (0, C['rack'][1], C['rack'][2]), parent='cloud')
    R.bone('bolt', tuple(BC), parent='cloud')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'cloud', 'wf', 'wb', 'rider', 'head', 'arm_l', 'arm_r', 'drums', 'bolt']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-44 don-don-don: the fists swing up over the shoulders in turn onto the drums; 18 the bolt jumps up out of
        # the cloud and stays crackling; 44-60 a last big double hit; 70-80 everything back
        hits = list(range(6, 46, 6))
        for i, f in enumerate(hits):
            for nm, sx in (('arm_l', 1), ('arm_r', -1)):
                up = (i + (sx > 0)) % 2 == 0
                k(nm, f, rot=[('X', -122 if up else -40), ('Y', sx * (34 if up else 8))], ease='QUAD')
            k('drums', f + 1, scale=1.04 if i % 2 else 1.0)
            k('head', f, rot=('X', 6 if i % 2 else -4))
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 50, rot=[('X', -150), ('Y', sx * 30)])
            k(nm, 54, rot=[('X', -126), ('Y', sx * 34)], ease='BACK')
            k(nm, 62, rot=[('X', -126), ('Y', sx * 34)])
            k(nm, 76)
        k('drums', 54, scale=1.06)
        k('drums', 58)
        k('head', 50, rot=('X', -8))
        k('head', 54, rot=('X', 10), ease='BACK')
        k('head', 70)
        k('bolt', 14)
        k('bolt', 20, move=(0, -0.6, 6.4), rot=('Y', -10), ease='BACK')
        for i, f in enumerate(range(24, 64, 4)):
            k('bolt', f, move=(0, -0.6, 6.4 + (0.4 if i % 2 else 0)), rot=('Y', -10 + (4 if i % 2 else -4)))
        k('bolt', 72)
        k('cloud', 18)
        for i, f in enumerate(range(20, 32, 2)):
            k('cloud', f, rot=('Y', 2 if i % 2 else -2), ease='LINEAR')
        k('cloud', 34)
        for b in allb:
            k(b, 84)
    km.run(R, C, extra=lambda k_, f: (k_('head', f, rot=('X', -4 if f % 16 else 0)), k_('arm_l', f), k_('arm_r', f)))
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    km.paint_cloud(P, pt, sh, C, col='#7a8292', belly='#424a5a')
    km.paint_kit(P, pt, sh, C, plate_ink='#e8b020')
    P.fill('hide', pt.ramp('#a8683c', 7, shift=0.07), tone=sh, base=0.05, brush='fur')
    P.fill('muzzle', pt.ramp('#efc8b0', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('earin', pt.ramp('#e8a890', 5), tone=sh, base=0.1)
    P.fill('horn', pt.ramp('#efe4c8', 5, shift=0.04), tone=sh, base=0.15)
    P.fill('hoof', pt.ramp('#3a2c26', 5), tone=sh, base=0.05)
    P.fill('tuft', pt.ramp('#5a3a22', 5), tone=sh, base=0.05, brush='fur')
    # the thunder god's shorts: tiger stripes (black wedges on gold)
    P.fill('shorts', pt.ramp('#e8a828', 6, shift=0.07), tone=sh, base=0.1, brush='cloth')
    sr = P.region('shorts')
    strp = np.abs(np.mod(Z * 1.1 + 0.6 * np.sin(X * 0.9 + Y * 0.7), 2.4) - 1.2) < 0.32
    P.fill(sr & strp, pt.ramp('#2a2420', 5), tone=sh, base=0.0, brush='cloth')
    P.fill('bachi', pt.ramp('#dcc28c', 5, shift=0.05), tone=sh, base=0.1, brush='wood')
    P.fill('arch', pt.ramp('#b8302a', 6, shift=0.07), tone=sh, base=0.05, brush='lacquer')
    P.fill('drumbody', pt.ramp('#b8302a', 6, shift=0.07), tone=sh, base=0.05, brush='lacquer')
    db = P.region('drumbody')
    P.fill(db & (np.abs(P.on[:, :, 1]) < 0.85) & (np.abs(np.abs(Y - AC[1] + 0.2) - 0.9) < 0.22), pt.ramp('#d8b048', 4), tone=sh, base=0.15, brush=False)  # brass studs
    P.fill('drumhead', pt.ramp('#efe2c4', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('bolt', pt.ramp('#fff0a0', 5, shift=0.04, light=0.6), tone=sh * 0.4, base=0.25, brush=False)
    # the face: cross brows, a big cheeky grin with teeth, nostrils on the pink muzzle
    hd = (P.region('hide') | P.region('muzzle')) & (P.part == PI['head'])
    fc = face.Face(P, c=tuple(HC + (0, -4.0, 1.0)), axis=(0, -1, 0.15), where=hd, seed=611)
    fc.eyes('dot', spread=4.6, size=0.55, dy=0.5, uneven=0.2)
    fc.brows('angry', spread=4.8, dy=1.8, w=1.6, weight=0.4)
    fm = face.Face(P, c=tuple(MZ + (0, -1.6, 0.0)), axis=(0, -1, 0.1), where=P.region('muzzle'), seed=612)
    fm.nose('nostrils', 0.0, 0.7, size=0.9)
    fm.mouth('grin', w=3.4, dy=-0.7, weight=0.36, teeth=3)
    P.lines(['horn', 'drumhead', 'shorts', 'muzzle'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 85), skip=[('rider', 'cloud'), ('head', 'rider'), ('arm_l', 'rider'), ('arm_r', 'rider'), ('bolt', 'cloud'),
                                                              ('drums', 'cloud'), ('wf', 'cloud'), ('wb', 'cloud')]),
    cams=[((46, -60, 44), (0, 0, 16)), ((-46, 56, 40), (0, 2, 16))], fold=(0, 6, 24, 54))
