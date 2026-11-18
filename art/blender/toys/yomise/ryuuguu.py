"""リュウグウノツカイ The Dragon Palace's Messenger (secret): the oarfish, "messenger of the Dragon Palace", as the
deep-sea night market's festival float (series yomise, concepts_D.md). A long silver ribbon of a fish coiled up round a
red coral stand, a red fin running the length of its back, the long red plumes of its crest streaming back from its
head and its two oar-fins trailing below.

Gimmick: the crest lights up red (light-up) and the whole body ripples like a festival dragon.

    tools/blender.sh art/blender/toys/yomise/ryuuguu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yatai as ya  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('yomise', 'ryuuguu')
SZ = ya.SZ
CO = np.array((-3.4, 3.6, SZ))         # the coral's foot
low = ya.low

# ------------------------------------------------------------------ the sea floor and the red coral stand
base_lo, base_hi = ya.seabed(F, rx=14.0, ry=12.5, seed=12)
CORAL = [tk.tube('coral', [tuple(CO), tuple(CO + (0.4, 0.2, 7.0)), tuple(CO + (-0.6, 0.6, 13.0)), tuple(CO + (0.2, 0.2, 17.6))], [1.8, 1.4, 1.0, 0.6], n=8, cap1='round')]
for d, z0, L in (((1, 0.2, 0.8), 5.0, 6.0), ((-0.4, 1.0, 0.8), 8.0, 5.0), ((0.6, -0.8, 1.0), 11.0, 4.4), ((-0.7, 0.6, 1.0), 13.4, 3.6)):
    d = np.array(d) / np.linalg.norm(d)
    p0 = CO + (0, 0, z0)
    CORAL.append(tk.tube('branch', [tuple(p0), tuple(p0 + d * L * 0.6 + (0, 0, 0.4)), tuple(p0 + d * L)], [0.9, 0.7, 0.45], n=6, cap1='round'))
co_lo, co_hi = low(tk.join(CORAL, 'coral'), 'coral', 160, lo=1, hi=2,
                   sculpt=lambda h: tk.push(h, lambda V, N: 0.18 * (np.sin(V[:, 0] * 4.1) * np.sin(V[:, 1] * 3.7) * np.sin(V[:, 2] * 3.3) > 0.3)), region='coral')
base_lo.append(co_lo)
base_hi.append(co_hi)

# ------------------------------------------------------------------ the oarfish: a tall thin ribbon coiled up round the coral, in three rigged lengths
PATH = [(9.6, -4.6, SZ + 1.4), (5.4, -7.0, SZ + 3.0), (0.0, -6.8, SZ + 5.6), (-4.8, -4.0, SZ + 8.4), (-7.4, 0.6, SZ + 11.0), (-5.6, 5.4, SZ + 13.6),
        (-0.6, 7.4, SZ + 16.0), (4.0, 5.0, SZ + 18.6), (5.4, 0.4, SZ + 21.0), (3.6, -3.4, SZ + 23.0), (1.0, -5.6, SZ + 24.0)]
RAD = list(np.linspace(0.35, 0.95, 4)) + [1.0] * 5 + [0.95, 0.9]
SEGS = {'segA': (0, 4), 'segB': (3, 8), 'segC': (7, 11)}
PARTS = {}
for nm, (a, b) in SEGS.items():
    pts = PATH[a:b]
    rr = RAD[a:b]
    body = tk.tube(nm, pts, rr, n=8, squash=2.6, up=(0, 0, 1), cap0='round', cap1='round' if nm != 'segC' else None)
    fin = tk.tube(nm + 'fin', [tuple(np.array(p) + (0, 0, r * 2.6 + 0.5)) for p, r in zip(pts, rr)], [0.22] * len(pts), n=4, squash=3.2, up=(0, 0, 1), cap0='point', cap1='point')
    PARTS[nm] = [low(body, nm, 80, region=('silver', [('belly', lambda C_, N: N[:, 2] < -0.6)])), low(fin, nm + 'fin', 30, lo=1, hi=1, region='redfin')]
HC = np.array(PATH[-1])
FD = np.array((-0.55, -0.83, 0.0))      # the way the head looks
head = tk.loft('head', [{'c': tuple(HC - FD * 0.6), 'w': 1.9, 'h': 2.4}, {'c': tuple(HC + FD * 1.8 + (0, 0, -0.2)), 'w': 2.0, 'h': 2.2},
                        {'c': tuple(HC + FD * 3.6 + (0, 0, -0.6)), 'w': 1.4, 'h': 1.4}], n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.6)
PARTS['segC'].append(low(head, 'head', 50, region='silver'))
for sx in (1, -1):   # the two long oar-fins trailing under the head, a paddle at each tip
    side = np.cross(FD, (0, 0, 1)) * sx
    p0 = HC + FD * 1.6 + (0, 0, -1.8)
    oar = tk.tube('oar', [tuple(p0), tuple(p0 + side * 1.6 - FD * 2.0 + (0, 0, -3.0)), tuple(p0 + side * 2.6 - FD * 4.4 + (0, 0, -5.2))], [0.2, 0.16, 0.14], n=4)
    pad = tk.lathe('paddle', [(0, -0.8), (0.5, -0.4), (0.55, 0.2), (0, 0.7)], n=6, centre=tuple(p0 + side * 2.7 - FD * 4.6 + (0, 0, -5.8)))
    PARTS['segC'] += [low(oar, 'oar', 12, lo=0, hi=1, region='redfin'), low(pad, 'paddle', 10, lo=0, hi=1, region='redfin')]
CREST = []
for i in range(5):   # the crest: long red plumes streaming back off the head
    a = (i - 2) * 0.35
    side = np.cross(FD, (0, 0, 1))
    p0 = HC + FD * 1.4 + (0, 0, 2.0) + side * a * 0.6
    pts = [tuple(p0), tuple(p0 - FD * 2.4 + side * a * 2.0 + (0, 0, 3.2 + 0.4 * (2 - abs(i - 2)))), tuple(p0 - FD * 5.6 + side * a * 3.6 + (0, 0, 4.4 + 0.6 * (2 - abs(i - 2)))),
           tuple(p0 - FD * 8.0 + side * a * 4.6 + (0, 0, 3.6))]
    CREST.append(tk.tube('plume', pts, [0.42, 0.36, 0.28, 0.12], n=5, cap1='point'))
cr_lo, cr_hi = low(tk.join(CREST, 'crest'), 'crest', 120, lo=1, hi=1, region='crest')

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
for nm, pr in PARTS.items():
    F.part(nm, tk.join([p_[0] for p_ in pr], nm), [p_[1] for p_ in pr], bone=nm)
F.part('crest', cr_lo, [cr_hi], bone='crest', kind='led')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('segA', PATH[0], parent='root')
    R.bone('segB', PATH[3], parent='segA')
    R.bone('segC', PATH[7], parent='segB')
    R.bone('crest', tuple(HC + FD * 1.4 + (0, 0, 2.0)), parent='segC')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'segA', 'segB', 'segC', 'crest']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-64 a travelling ripple up the body (each length a quarter-beat behind the one below), the head rising and
        # dipping like a lion-dance head; the crest streams and flutters; 64-80 settles
        for f in range(4, 66, 4):
            t = (f - 4) / 60.0 * 2 * math.pi * 2.0
            amp = math.sin(min(1.0, (f - 4) / 12.0) * math.pi / 2) * (1.0 if f < 52 else (64 - f) / 12.0)
            k('segA', f, rot=('Z', 4 * amp * math.sin(t)))
            k('segB', f, rot=[('Z', 4 * amp * math.sin(t - 1.2)), ('X', 2 * amp * math.sin(t - 0.6))])
            k('segC', f, rot=[('Z', 9 * amp * math.sin(t - 2.4)), ('X', 6 * amp * math.sin(t - 1.8))])
            k('crest', f, rot=('X', -10 * amp * (0.5 + 0.5 * math.sin(t * 2))))
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ya.paint_seabed(P, pt, sh)
    P.fill('coral', pt.ramp('#d8584a', 6, shift=0.07), tone=sh, base=0.08)
    cr = P.region('coral')
    who, d = P.dabs(cr, size=0.35, spacing=0.9, seed=101)
    P.fill(cr & (who >= 0) & (d < 0.5), pt.ramp('#f2c2b0', 4), tone=sh, base=0.15, brush=False)    # polyps
    # the oarfish: bright silver, faint blue sheen and rows of dark dashes along the flank; red fins and crest
    P.fill('silver', pt.ramp('#d4d8e0', 7, shift=0.04, light=0.7, dark=0.6), tone=sh * 1.3, base=0.15, brush={'preset': 'gloss', 'flow': 'along', 'axis': (0, 0, 1)})
    sv = P.region('silver')
    who2, d2 = P.dabs(sv, size=0.35, spacing=1.6, seed=102)
    P.fill(sv & (who2 >= 0) & (d2 < 0.55) & (np.mod(who2, 2) == 0), pt.ramp('#4a5266', 4), tone=sh, base=0.05, brush=False)
    P.fill('belly', pt.ramp('#eef0f2', 5, shift=0.03), tone=sh, base=0.2)
    P.fill('redfin', pt.ramp('#e0503a', 6, shift=0.07), tone=sh, base=0.1)
    P.fill('crest', pt.ramp('#f05a46', 6, shift=0.07), tone=sh * 0.5, base=0.2, brush={'preset': 'pvc', 'flow': 'along', 'axis': tuple(-FD)})
    # the face: small dots set back on the head, a little upturned mouth at the tip, blush
    hd = sv & (P.part == PI['segC'])
    fc = face.Face(P, c=tuple(HC + FD * 4.0 + (0, 0, 0.1)), axis=tuple(FD + (0, 0, 0.1)), where=hd, seed=721)
    fc.eyes('dot', spread=2.0, size=0.36, dy=0.5, uneven=0.2)
    fc.mouth('upturn', w=1.0, dy=-0.5, weight=0.26)
    fc.blush(spread=2.6, dy=-0.2, rx=0.5, ry=0.3)
    P.lines(['redfin', 'crest'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 81), skip=[('segB', 'segA'), ('segC', 'segB'), ('crest', 'segC'), ('segA', 'base')]),
    cams=[((40, -52, 40), (0, -1, 13)), ((-40, 48, 38), (0, 2, 13))], fold=(0, 16, 30, 46))
