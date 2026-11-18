"""床屋アザラシ Barber Seal (series minato, concepts_E.md): the harbour town's barber, a spotted harbour seal reared up
on his tail flippers in a barber-pole striped smock with a towel round his neck and a waxed moustache, posed like a
duellist: one pair of shears thrust at you, the other raised behind his head.
Gimmick: both pairs of shears snip in a flurry, and his head snaps round to look at you.

    GG_FACET=1 tools/blender.sh art/blender/toys/minato/azarashi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('minato', 'azarashi')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the cobbles; the seal reared up in an S, his tail flippers fanned behind
B.add('body', cobbles(seed=9))
BODY = [dict(c=(0, 4.6, GZ + 2.6), w=9.4, h=3.6), dict(c=(0, 1.8, 8.6), w=13.4, ht=6.6, hb=6.8), dict(c=(0, 0.2, 14.6), w=13.4, ht=6.4, hb=6.4),
        dict(c=(0, -0.8, 20.4), w=11.6, ht=5.6, hb=5.6), dict(c=(0, -1.0, 24.6), w=9.4, h=4.6)]
B.add('body', low(tk.loft('body', BODY, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 170, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * tk.smoothstep(1.0, 0.3, np.abs(V[:, 2] - 9.8)) * (V[:, 2] > 8)),
                  region=('smock', [('fur', lambda C, N: C[:, 2] < 9.0)])))
for sx in (1, -1):
    fl = tk.slab('flipper', [(0.0, 0.0), (2.6, 2.4), (4.4, 6.4), (2.6, 6.0), (1.6, 7.0), (0.4, 5.8), (-1.0, 6.6), (-1.4, 3.0)], 0.9, plane='XY', at=0.0,
                 bevel=0.3, segs=1)
    tk.rotate(fl, sx * -28, 'Z')
    tk.move(fl, (sx * 2.2, 6.6, GZ + 0.5))
    B.add('body', low(fl, 'flipper', 20, lo=0, hi=1, region='fur'))
import math as _m  # noqa: E402
B.add('body', limb('towel', [(5.0 * _m.cos(a), -1.0 + 4.8 * _m.sin(a), 24.2 - 0.6 * _m.sin(a)) for a in np.linspace(0, 2 * _m.pi, 13)], 1.4, tris=36,
                   region='towel', n=6))

# ------------------------------------------------------------------ the head: round, whisker pads, the waxed moustache
NECK = (0, -1.0, 24.6)
head = tk.loft('head', [dict(c=(0, 1.2, 29.0), w=8.4, h=4.2), dict(c=(0, -1.6, 29.0), w=9.4, ht=4.6, hb=4.2), dict(c=(0, -4.6, 28.0), w=7.0, ht=3.0, hb=3.2),
                        dict(c=(0, -6.6, 27.6), w=5.0, ht=2.0, hb=2.2)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
HP = [low(head, 'head', 100, lo=1, hi=3, region=('fur', [('muzzle', lambda C, N: C[:, 1] < -4.6)]),
          sculpt=lambda h: tk.push(h, lambda V, N: 0.4 * tk.bump(V, (1.6, -6.4, 27.4), 1.5, 0.6) + 0.4 * tk.bump(V, (-1.6, -6.4, 27.4), 1.5, 0.6)))]
HP.append(blob('nose', (0, -7.6, 28.4), 0.8, tris=10, region='nose', squash=(1.2, 0.8, 0.8)))
for sx in (1, -1):
    HP.append(limb('tash', [(sx * 0.4, -7.6, 27.6), (sx * 2.4, -7.4, 27.4), (sx * 3.8, -6.6, 28.4), (sx * 4.2, -6.0, 29.6)], [0.7, 0.6, 0.4, 0.1],
                   tris=12, region='tash', n=5, cap1='point'))
B.add('head', *HP)

# ------------------------------------------------------------------ the fore-flippers and the two pairs of shears (each blade its own part)
SR, SL = V3(-5.8, -1.0, 21.4), V3(5.8, -0.6, 21.4)
B.add('arm_r', limb('arm_r', [SR, (-8.4, -5.6, 20.4), (-7.6, -9.2, 21.6)], [2.4, 2.0, 1.2], tris=22, region='fur', n=8, cap1='round'))
B.add('arm_l', limb('arm_l', [SL, (9.4, 0.8, 25.4), (9.0, 0.6, 29.4)], [2.4, 2.0, 1.2], tris=22, region='fur', n=8, cap1='round'))
SHEARS = {}


def blade(nm, piv, d, side, up):
    """one blade of a pair of shears: the ring handle behind the pivot, the long blade ahead; opened `side` degrees."""
    f, s, u = basis(d, up)
    piv = np.asarray(piv, float)
    tip = piv + f * 7.4
    bl = tk.loft(nm, [dict(c=tuple(piv), w=1.2, h=0.4), dict(c=tuple(piv + f * 3.6), w=1.0, h=0.3), dict(c=tuple(tip), w=0.2, h=0.15)], n=6,
                 up=tuple(u), cap0='round', cap1='point')
    hc = piv - f * 2.6 + s * 0.9 * np.sign(side)
    ring = [hc + s * 1.2 * math.cos(a) + f * 1.0 * math.sin(a) for a in np.linspace(0, 2 * math.pi, 9)]
    pcs = [low(bl, nm, 14, lo=0, hi=1, region='steel'), limb(nm + '_ring', ring, 0.4, tris=18, region='ring', n=4),
           limb(nm + '_shank', [piv, hc + f * 1.0], 0.35, tris=6, region='steel', n=4)]
    for a, b in pcs:
        for o in (a, b):
            q = (piv[0], piv[1], piv[2])
            ax = tuple(u)
            from mathutils import Matrix, Vector
            M = Matrix.Translation(Vector(q)) @ Matrix.Rotation(math.radians(side), 4, Vector(ax)) @ Matrix.Translation(-Vector(q))
            tk.transform(o, M)
    return pcs


for nm, piv, d, up, arm in (('sh_r', (-7.4, -11.4, 21.8), (0.05, -1, 0.05), (0, 0, 1), 'arm_r'), ('sh_l', (9.0, 0.4, 31.6), (0.05, 0.1, 1), (0, -1, 0), 'arm_l')):
    SHEARS[nm] = (piv, d, up)
    B.add(nm + 'a', *blade(nm + 'a', piv, d, 14, up))
    B.add(nm + 'b', *blade(nm + 'b', piv, d, -14, up))
B.commit(F, bones={'sh_ra': 'sh_ra', 'sh_rb': 'sh_rb', 'sh_la': 'sh_la', 'sh_lb': 'sh_lb'}, kinds={k_: 'metal' for k_ in ('sh_ra', 'sh_rb', 'sh_la', 'sh_lb')})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    for nm, (piv, d, up) in SHEARS.items():
        for ab in 'ab':
            R.bone(nm + ab, tuple(piv), parent='arm_r' if nm == 'sh_r' else 'arm_l')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'sh_ra', 'sh_rb', 'sh_la', 'sh_lb']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # snip-snip-snip: each pair closes and opens in a flurry, the two pairs out of step; the arms jab
        for nm, (piv, d, up) in SHEARS.items():
            ph = 0 if nm == 'sh_r' else 2
            for i in range(9):
                f = 6 + i * 4 + ph
                k(nm + 'a', f, rot=[(tuple(up), -13)], ease='LINEAR')
                k(nm + 'b', f, rot=[(tuple(up), 13)], ease='LINEAR')
                k(nm + 'a', f + 2, ease='LINEAR')
                k(nm + 'b', f + 2, ease='LINEAR')
        for i, f in enumerate((8, 16, 24, 32, 40)):
            k('arm_r', f, rot=('X', 6 if i % 2 == 0 else -4))
            k('arm_l', f + 2, rot=('Y', -6 if i % 2 == 0 else 4))
        k('arm_r', 46)
        k('arm_l', 46)
        # the head snaps round to look at you
        k('head', 40)
        k('head', 46, rot=('Z', 28), ease='BACK')
        k('head', 64, rot=('Z', 28))
        k('head', 74)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stone', pt.ramp('#8c8a84', 7, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('stone') & (np.abs(np.mod(X + 0.5 * np.floor(Yc / 2.6) * 2.6, 3.4) - 1.7) < 1.45) & (np.abs(np.mod(Yc, 2.6) - 1.3) < 1.1) & (P.on[:, :, 2] > 0.5),
           pt.ramp('#9c968a', 7, shift=0.05), tone=sh, base=0.05)
    P.fill('fur', pt.ramp('#8a8c8e', 7, shift=0.05), tone=sh, base=0.15)
    who, d = P.dabs(P.region('fur'), size=0.7, spacing=2.2, seed=31)
    P.tint(P.region('fur') & (who >= 0) & (d < 0.7) & (Yc > -4), pt.ramp('#4a4c52', 6), sh)                  # harbour-seal spots
    P.fill('muzzle', pt.ramp('#b9b6ae', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('nose', pt.ramp('#1e1c20', 5, light=0.6), tone=sh, base=0.3)
    P.fill('tash', pt.ramp('#2a2420', 5, light=0.6), tone=sh, base=0.2, brush='gloss')
    P.fill('smock', pt.ramp('#f1ece2', 6, shift=0.03), tone=sh, base=0.1)
    sm = P.region('smock')
    a = np.arctan2(X, Yc) * 3.0 + Z * 0.45                                                                     # barber-pole spirals
    P.tint(sm & (np.abs(np.mod(a, 2.4) - 0.6) < 0.32), pt.ramp('#c8343a', 6, shift=0.06), sh)
    P.tint(sm & (np.abs(np.mod(a, 2.4) - 1.8) < 0.32), pt.ramp('#2f4a8a', 6, shift=0.06), sh)
    P.fill('towel', pt.ramp('#f4f1ea', 6, shift=0.03), tone=sh, base=0.15, brush='cloth')
    P.fill('steel', pt.ramp('#b9bec6', 6, shift=0.05, light=0.6), tone=sh, base=0.3)
    P.fill('ring', pt.ramp('#2a2a30', 5, light=0.6), tone=sh, base=0.2, brush='gloss')
    # the face: one eye squeezed in a duellist's squint, a raised brow, a thin determined line under the moustache
    hd = (P.region('fur') | P.region('muzzle')) & (Z > 26)
    fc = face.Face(P, c=(0, -6.0, 29.8), axis=(0, -1, 0.1), where=hd, seed=991)
    fc.eyes('dot', spread=5.4, size=0.6, dy=0.4, only='l')
    fc.eyes('squeeze', spread=5.4, size=0.6, dy=0.4, only='r')
    fc.brows('raised', spread=5.8, dy=2.0, w=1.8, weight=0.4, only='l')
    fc.brows('angry', spread=5.8, dy=1.6, w=1.8, weight=0.4, only='r')
    fm = face.Face(P, c=(0, -7.8, 26.6), axis=(0, -1, -0.1), where=hd, seed=992)
    fm.mouth('line', w=1.6, dy=-0.2, weight=0.28)
    fm.whiskers(dy=0.6, spread=2.0, n=3, length=2.0, weight=0.15, dots=True)
    P.lines(['smock', 'towel'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('sh_ra', 'sh_rb'), ('sh_la', 'sh_lb'),
                                         ('sh_ra', 'arm_r'), ('sh_rb', 'arm_r'), ('sh_la', 'arm_l'), ('sh_lb', 'arm_l'), ('arm_l', 'head'),
                                         ('sh_la', 'head'), ('sh_lb', 'head')],
    fold=(0, 6, 8, 46))
