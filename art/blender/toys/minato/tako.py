"""まんが家ダコ Manga-Artist Octopus (series minato, concepts_E.md): the harbour town's manga artist, a red octopus
in a towel headband and a smock with a ruffled hem, on a round of harbour cobbles. Four arms hold him up; the other
four strike a pose with his tools: a dip pen thrust at you, a page held up, a brush and a ruler raised high.
Gimmick: the four tool arms whirl, drawing at impossible speed, a sweat drop on his brow; then the pen jabs at you.

    GG_FACET=1 tools/blender.sh art/blender/toys/minato/tako.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('minato', 'tako')
B = Build()
GZ = 3.0


def suckers(h):
    """rows of little sucker cups along the arms' undersides."""
    def f(V, N):
        under = tk.smoothstep(-0.1, -0.6, N[:, 2])
        cup = np.abs(np.sin(V[:, 0] * 2.6) * np.sin(V[:, 1] * 2.6 + V[:, 2] * 2.6)) > 0.75
        return 0.18 * under * cup
    tk.push(h, f)


# ------------------------------------------------------------------ the cobbles and the four arms he stands on, curling at the tips
B.add('body', cobbles(seed=3))
for sx in (1, -1):
    for fy, out in ((-1, (sx * 8.0, -6.4)), (1, (sx * 7.0, 7.4))):
        r0 = V3(sx * 3.0, fy * 2.2, 14.0)
        mid = V3(out[0] * 0.8, out[1] * 0.75, 6.0)
        end = V3(out[0], out[1], GZ + 0.9)
        tip = end + (sx * 1.6, fy * 1.8, 1.4)
        B.add('body', limb('leg', [r0, mid, end, tip, tip + (-sx * 0.8, -fy * 0.2, 1.0)], [3.3, 2.7, 1.9, 1.1, 0.4], tris=34, region='skin', n=8,
                           cap1='point', sculpt=suckers))

# ------------------------------------------------------------------ the big round head-body, the headband, the smock with its ruffle
head = tk.lathe('head', [(0, 0), (6.4, 0.6), (8.2, 3.6), (9.2, 8.6), (8.8, 13.4), (7.0, 17.6), (4.0, 20.2), (0, 21.0)], n=16, centre=(0, 0.4, 12.6))
tk.scale(head, (1.0, 0.92, 1.0), pivot=(0, 0.4, 12.6))


def sc_head(h):
    def f(V, N):
        d = 0.35 * tk.bump(V, (2.8, -7.4, 21.0), 2.4, 1.0) + 0.35 * tk.bump(V, (-2.8, -7.4, 21.0), 2.4, 1.0)   # the eye bulges
        d += 0.3 * tk.bump(V, (0, -7.6, 17.4), 1.6, 0.8)                                                          # the siphon-mouth
        return d
    tk.push(h, f)


B.add('body', low(head, 'head', 170, lo=1, hi=3, sculpt=sc_head,
                  region=('skin', [('smock', lambda C, N: (C[:, 2] < 18.2) & (C[:, 2] > 13.0))])))
B.add('body', limb('ruffle', [(9.0 * math.cos(a), 0.4 + 8.3 * math.sin(a), 13.6) for a in np.linspace(0, 2 * math.pi, 15)], 1.3, tris=46,
                   region='smock', n=6, sculpt=lambda h: tk.push(h, lambda V, N: 0.35 * np.sin(np.arctan2(V[:, 1], V[:, 0]) * 14.0))))
B.add('body', limb('band', [(8.7 * math.cos(a), 0.4 + 8.0 * math.sin(a), 27.6 + 0.6 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 15)], 1.1,
                   tris=40, region='band', n=6))
B.add('body', limb('knot', [(6.0, 6.4, 28.2), (8.4, 9.6, 29.4), (9.6, 11.6, 27.4)], [1.0, 0.9, 0.3], tris=12, region='band', n=5, cap1='point'))
B.add('body', limb('knot2', [(6.0, 6.4, 28.2), (5.4, 10.2, 26.0), (6.4, 11.4, 23.6)], [1.0, 0.9, 0.3], tris=12, region='band', n=5, cap1='point'))

# ------------------------------------------------------------------ the four tool arms: two on each side, each one its own pose
ARMS = {}
pen_r = [V3(-4.6, -4.4, 16.0), V3(-10.0, -8.6, 18.6), V3(-11.8, -13.6, 21.4), V3(-11.6, -16.6, 22.4)]
brush_r = [V3(-5.4, 2.6, 17.4), V3(-11.6, 3.2, 24.0), V3(-13.6, 1.4, 31.0), V3(-12.6, 0.0, 34.2)]
page_l = [V3(4.6, -4.4, 16.0), V3(11.6, -4.8, 19.4), V3(14.8, -3.8, 24.6), V3(14.6, -2.8, 27.6)]
rule_l = [V3(5.4, 2.6, 17.4), V3(11.4, 4.4, 23.0), V3(14.0, 3.6, 29.6), V3(13.6, 2.2, 32.6)]
PEN0, PEN1 = pen_r[-1] + (0.0, -0.6, 0.2), pen_r[-1] + (-1.0, -8.4, 1.6)
BR0, BR1 = brush_r[-1] + (0.4, 0, 0.4), brush_r[-1] + (2.6, -1.0, 7.6)
RU0, RU1 = rule_l[-1] + (-0.6, 0, -2.6), rule_l[-1] + (-3.2, 0.4, 9.6)
PG = page_l[-1] + (1.0, -0.6, 2.4)
for nm, sets in (('arms_r', (pen_r, brush_r)), ('arms_l', (page_l, rule_l))):
    pcs = []
    for pts in sets:
        pcs.append(limb('arm', pts + [pts[-1] + (pts[-1] - pts[-2]) * 0.5], [2.9, 2.3, 1.6, 1.0, 0.35], tris=30, region='skin', n=8, cap1='point',
                        sculpt=suckers))
    ARMS[nm] = pcs
ARMS['arms_r'].append(limb('pen', [PEN0, PEN0 + (PEN1 - PEN0) * 0.75], [0.7, 0.6], tris=12, region='penholder', n=6))
ARMS['arms_r'].append(limb('nib', [PEN0 + (PEN1 - PEN0) * 0.75, PEN1], [0.6, 0.05], tris=8, region='nib', n=5, cap1='point'))
ARMS['arms_r'].append(limb('brush', [BR0, BR0 + (BR1 - BR0) * 0.7], 0.55, tris=10, region='bamboo', n=5))
ARMS['arms_r'].append(limb('bristle', [BR0 + (BR1 - BR0) * 0.7, BR0 + (BR1 - BR0) * 0.85, BR1], [0.8, 0.9, 0.1], tris=10, region='ink', n=6,
                           cap1='point'))
ARMS['arms_l'].append(low(tk.rbox('ruler', (0.5, 1.8, np.linalg.norm(RU1 - RU0)), centre=(0, 0, 0), bevel=0.15, segs=1), 'ruler', 12, lo=0, hi=1,
                          region='ruler'))
ru = ARMS['arms_l'][-1]
for o in ru:
    tk.rotate(o, math.degrees(math.atan2(RU1[0] - RU0[0], RU1[2] - RU0[2])), 'Y')
    tk.move(o, tuple((RU0 + RU1) / 2))
pg = tk.rbox('page', (0.4, 7.2, 9.6), centre=(0, 0, 0), bevel=0.1, segs=0)
tk.rotate(pg, -34, 'Z')
tk.rotate(pg, 8, 'X')
tk.move(pg, tuple(PG))
ARMS['arms_l'].append(low(pg, 'page', 12, lo=0, hi=1, region='paper'))
for nm, pcs in ARMS.items():
    B.add(nm, *pcs)
B.commit(F)
ROOTS = {'arms_r': (-5.0, -1.0, 16.6), 'arms_l': (5.0, -1.0, 16.6)}


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    for nm, r in ROOTS.items():
        R.bone(nm, r, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'arms_r', 'arms_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he hunches over the work; both sets of arms scribble in a blur, out of step
        k('body', 6, rot=('X', 5))
        for i in range(14):
            f = 8 + i * 3
            k('body', f, rot=[('X', 5), ('Z', 2 if i % 2 == 0 else -2)], ease='LINEAR')
            k('arms_r', f, rot=[('X', 12 if i % 2 == 0 else -8), ('Y', 6 if i % 3 == 0 else -6)], ease='LINEAR')
            k('arms_l', f, rot=[('X', -8 if i % 2 == 0 else 12), ('Y', -6 if i % 3 == 0 else 6)], ease='LINEAR')
        # done: the pen jabs at you, the page is flourished
        k('body', 52, rot=('X', -4), ease='BACK')
        k('arms_r', 52, rot=('X', 16), ease='BACK')
        k('arms_l', 52, rot=('Y', 14), ease='BACK')
        for b in ('body', 'arms_r', 'arms_l'):
            k(b, 70, rot={'body': ('X', -4), 'arms_r': ('X', 16), 'arms_l': ('Y', 14)}[b])
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stone', pt.ramp('#8c8a84', 7, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('stone') & (np.abs(np.mod(X + 0.5 * np.floor(Yc / 2.6) * 2.6, 3.4) - 1.7) < 1.45) & (np.abs(np.mod(Yc, 2.6) - 1.3) < 1.1) & (P.on[:, :, 2] > 0.5),
           pt.ramp('#9c968a', 7, shift=0.05), tone=sh, base=0.05)
    RED = pt.ramp('#c4523c', 7, shift=0.07)
    P.fill('skin', RED, tone=sh, base=0.1)
    sk = P.region('skin')
    P.fill(sk & (P.on[:, :, 2] < -0.3), pt.ramp('#eaa48c', 6, shift=0.05), tone=sh, base=0.15)            # the pale undersides
    who, d = P.dabs(sk & (P.on[:, :, 2] < -0.3), size=0.55, spacing=1.7, seed=21)
    P.shift(sk & (who >= 0) & (d < 0.6), 1)                                                                 # sucker rims
    P.fill('smock', pt.ramp('#9cb8d0', 7, shift=0.05), tone=sh, base=0.1)
    P.fill('band', pt.ramp('#f1ebdf', 6, shift=0.04), tone=sh, base=0.1)
    P.fill('penholder', pt.ramp('#2a2a30', 5, shift=0.05, light=0.6), tone=sh, base=0.2, brush='gloss')
    P.fill('nib', pt.ramp('#b8bcc4', 5, shift=0.05, light=0.6), tone=sh, base=0.3)
    P.fill('bamboo', pt.ramp('#c9b06a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('ink', pt.ramp('#1e1c22', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('ruler', pt.ramp('#e8d9a0', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('paper', pt.ramp('#f4f0e6', 6, shift=0.03), tone=sh, base=0.2)
    # the page: three hand-ruled panels with a scribble in each (seen from the front); ruler ticks
    pa = P.region('paper') & (P.on[:, :, 1] < -0.3)
    pf = face.Face(P, c=tuple(PG + (0.3, -0.4, 0)), axis=(0.56, -0.83, 0.1), where=pa, seed=961)
    for (u0, v0, u1, v1) in ((-3.0, 4.0, 3.0, 1.0), (-3.0, 0.4, -0.2, -4.2), (0.4, 0.4, 3.0, -4.2)):
        pf.stroke([(u0, v0), (u1, v0), (u1, v1), (u0, v1), (u0, v0)], weight=0.2)
    pf.stroke([(-2.0, 2.0), (-0.6, 3.0), (0.8, 1.8), (2.0, 2.8)], weight=0.18)
    pf.dot(-1.6, -1.6, 0.5)
    pf.stroke([(1.0, -2.4), (2.4, -1.0)], weight=0.2)
    P.flat(P.region('ruler') & (np.abs(np.mod(Z, 1.0) - 0.5) < 0.08) & (np.abs(P.on[:, :, 1]) > 0.5), '#3a3224')
    # the face: big determined dots under knotted brows, teeth gritted, a sweat drop
    fc = face.Face(P, c=(0, -8.0, 20.2), axis=(0, -1, 0.05), where=sk & (Z > 15), seed=962)
    fc.eyes('dot', spread=5.6, size=0.75, dy=0.8, uneven=0.25)
    fc.brows('angry', spread=6.0, dy=2.8, w=2.2, weight=0.5)
    fc.mouth('gritted', w=2.8, dy=-2.6, weight=0.32, teeth=3)
    fc.drop(4.6, 3.6, r=0.6)
    P.flat(P.region('band') & (np.hypot(X, Z - 28.0) < 1.1) & (Yc < -5), '#c8303a')                         # a red dot on the band
    P.lines(['smock', 'band', 'paper', 'ruler'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=84, skip=[('arms_r', 'body'), ('arms_l', 'body')], fold=(0, 12, 30, 56))
