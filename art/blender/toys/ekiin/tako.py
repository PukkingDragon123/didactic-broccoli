"""べんとうダコ Ekiben Octopus: the platform lunchbox seller, an octopus in a white vendor's cap with a wooden tray of
station bentō and clay tea pots hung from a strap (series ekiin, concepts_C.md).

Five arms stand him on the platform, three work: one holds a bentō up to a carriage window, one reaches for the
coin, one carries a tea pot. "Bentō, bentō!" The suckers are cream dots along the undersides.
Gimmick: the bentō arm lifts it up to the window, the coin arm reaches out and takes the coin, the tea-pot arm
waves it, the tray bounces on its strap and he bobs.

    tools/blender.sh art/blender/toys/ekiin/tako.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

tk.reset()
F = Fig('ekiin', 'tako')

MC = (0, 1.0, 28.0)          # the mantle's centre
BASE_Z = 13.0                # where the arms leave the body
TRAY = (0, -11.0, 14.0)      # the tray's centre (top of its floor)

# ------------------------------------------------------------------ the mantle (the head) and the skirt the arms grow from
mantle = tk.loft('mantle', [{'c': (0, 0.4, BASE_Z - 1.0), 'w': 15.0, 'h': 7.0, 'e': 2.2},
                            {'c': (0, 0.6, BASE_Z + 4.0), 'w': 20.0, 'h': 9.4, 'e': 2.2},
                            {'c': (0, 0.8, MC[2] - 3.0), 'w': 23.4, 'ht': 11.0, 'hb': 10.4, 'e': 2.2},
                            {'c': (0, 1.2, MC[2] + 3.0), 'w': 23.0, 'ht': 10.8, 'hb': 10.2, 'e': 2.2},
                            {'c': (0, 1.8, MC[2] + 7.6), 'w': 17.0, 'h': 8.4, 'e': 2.2}], n=18, up=(0, -1, 0), cap0='round', cap1='round', capd=3.2)


def sc_mantle(h):
    def f(V, N):
        d = np.zeros(len(V))
        d += tk.bump(V, (0, -8.6, MC[2] - 6.0), 2.6, 1.6)     # the little tube of a mouth (the siphon)
        d -= tk.bump(V, (0, -10.0, MC[2] - 6.0), 1.0, 0.8)
        for sx in (1, -1):
            d += tk.bump(V, (sx * 5.0, -8.2, MC[2] - 1.0), 2.8, 0.6)   # brow bumps over the eyes
        return d
    tk.push(h, f)


mantle_lo, mantle_hi = cx.low(mantle, 'mantle', 300, lo=1, hi=3, sculpt=sc_mantle, region='skin')
CAP = cx.station_cap((0, 1.6, MC[2] + 9.0), r=6.2, h=4.0, tilt=-10, visor=0.9)


# ------------------------------------------------------------------ arms
def arm_pts(a_deg, reach, curl=1.0, lift=0.0):
    """A standing arm: from under the body out along the ground at angle a (0 = +x), curling up at the tip."""
    a = math.radians(a_deg)
    d = np.array((math.cos(a), math.sin(a), 0))
    pts = [np.array((0, 0.6, BASE_Z)) + d * 3.0 + np.array((0, 0, -1.0))]
    pts.append(pts[0] + d * 4.0 + np.array((0, 0, -6.0)))
    pts.append(pts[0] + d * (reach * 0.55) + np.array((0, 0, -BASE_Z + 2.4 + lift)))
    pts.append(pts[0] + d * reach + np.array((0, 0, -BASE_Z + 2.0 + lift)))
    side = np.cross(d, (0, 0, 1))
    pts.append(pts[0] + d * (reach + 2.6 * curl) + side * 1.2 + np.array((0, 0, -BASE_Z + 4.2 + lift)))
    pts.append(pts[0] + d * (reach + 1.4 * curl) + side * 2.6 + np.array((0, 0, -BASE_Z + 5.8 + lift)))
    return [tuple(p) for p in pts]


def sucker_sculpt(h):
    def f(V, N):  # sucker rows on the undersides (shallow cups)
        under = N[:, 2] < -0.2
        return -0.25 * under * (np.abs(np.sin(V[:, 0] * 2.2) * np.sin(V[:, 1] * 2.2 + V[:, 2])) > 0.75)
    tk.push(h, f)


LEGS = []
for a_deg, reach in ((-125, 11.5), (-55, 11.5), (165, 11.0), (15, 11.0), (95, 11.0)):
    pts = arm_pts(a_deg, reach)
    t = tk.tube('leg', pts, [4.4, 3.9, 3.1, 2.5, 1.7, 1.0], n=8, squash=0.82)
    tk.deform(t, lambda V: np.stack([V[:, 0], V[:, 1], np.maximum(V[:, 2], 0.0)], 1))
    LEGS.append(cx.low(t, 'leg', 60, lo=1, hi=2, sculpt=sucker_sculpt, region=('skin', [('under', lambda C, N: N[:, 2] < -0.25)])))

# the three working arms: bentō up to the window (viewer's left), the coin arm, the tea-pot arm
UP_S, COIN_S, POT_S = (-8.0, -1.0, BASE_Z + 2.0), (8.0, -1.0, BASE_Z + 2.0), (6.4, 5.0, BASE_Z + 1.0)
BENTO_AT = np.array((-13.4, -6.0, 31.0))
COIN_AT = np.array((15.6, -9.0, 21.0))
POT_AT = np.array((14.0, 9.0, 14.0))
WORK = {}
for nm, s, tip, r0 in (('arm_up', UP_S, BENTO_AT + (0, 0, -2.6), 3.2), ('arm_coin', COIN_S, COIN_AT, 3.0), ('arm_pot', POT_S, POT_AT + (0, 0, 3.4), 2.8)):
    s, tip = np.array(s), np.array(tip)
    mid = (s + tip) / 2 + np.array((np.sign(s[0]) * 3.0, 0, -1.6))
    t = tk.tube(nm, [tuple(s), tuple(mid), tuple(tip - (tip - mid) * 0.15), tuple(tip)], [r0 * 1.15, r0 * 0.9, r0 * 0.62, r0 * 0.5], n=8)
    WORK[nm] = (cx.low(t, nm, 60, lo=1, hi=2, sculpt=sucker_sculpt, region=('skin', [('under', lambda C, N: N[:, 2] < -0.35)])), tuple(s))
bento = tk.rbox('bento', (7.4, 5.4, 3.2), centre=tuple(BENTO_AT), bevel=0.6, segs=2)
tk.rotate(bento, 12, 'Y', tuple(BENTO_AT))
coin = tk.cyl('coin', 1.6, -0.35, 0.35, n=14, at=(COIN_AT[1] - 0.6, COIN_AT[2] + 1.0), axis='X', bevel=0.12, segs=1)
tk.move(coin, (COIN_AT[0] + 0.4, 0, 0))
pot = tk.lathe('pot', [(0, 0), (2.6, 0.2), (3.4, 1.8), (3.0, 3.6), (1.6, 4.4), (1.8, 5.0), (0, 5.2)], n=14, centre=tuple(POT_AT - (0, 0, 2.0)))
spout = tk.tube('spout', [tuple(POT_AT + (0, -2.4, 0.2)), tuple(POT_AT + (0, -4.6, 1.6))], [0.9, 0.6], n=6)
HELD = {'arm_up': cx.low(bento, 'bento', 40, lo=0, hi=2, region='bento'),
        'arm_coin': cx.low(coin, 'coin', 24, lo=0, hi=1, region='coin'),
        'arm_pot': [cx.low(pot, 'pot', 60, lo=0, hi=2, region='clay'), cx.low(spout, 'spout', 16, lo=0, hi=1, region='clay')]}

# ------------------------------------------------------------------ the tray on its strap: bentō and tea pots
tray = tk.rbox('tray', (26.0, 11.0, 2.6), centre=(TRAY[0], TRAY[1], TRAY[2] - 1.3), bevel=0.6, segs=1)
tk.boolean(tray, tk.rbox('well', (24.0, 9.0, 3.0), centre=(TRAY[0], TRAY[1], TRAY[2] + 0.4), bevel=0.4, segs=1))
TRAYP = [cx.low(tray, 'tray', 60, lo=0, hi=1, region='wood')]
for i, x in enumerate((-8.8, -3.4, 2.0)):
    b = tk.rbox('box', (4.8, 7.6, 2.6 + 0.4 * (i % 2)), centre=(x, TRAY[1] - 0.2, TRAY[2] + 1.0), bevel=0.45, segs=2)
    TRAYP.append(cx.low(b, 'box', 24, lo=0, hi=1, region='bento'))
for x in (7.0, 10.6):
    p = tk.lathe('tpot', [(0, 0), (1.5, 0.1), (1.9, 1.2), (1.6, 2.4), (0.9, 2.9), (0, 3.0)], n=10, centre=(x, TRAY[1] + 1.2, TRAY[2] - 0.2))
    TRAYP.append(cx.low(p, 'tpot', 30, lo=0, hi=1, region='clay'))
for sx in (1, -1):
    st = tk.tube('strap', [(sx * 11.6, TRAY[1] + 4.4, TRAY[2] + 0.4), (sx * 10.6, -4.0, TRAY[2] + 5.6), (sx * 8.6, -1.0, MC[2] - 4.0)], 0.55, n=5)
    TRAYP.append(cx.low(st, 'strap', 20, lo=0, hi=1, region='strap'))

# ------------------------------------------------------------------ parts
F.part('body', tk.join([mantle_lo] + [l[0] for l in LEGS] + [c[0] for c in CAP], 'body'), [mantle_hi] + [l[1] for l in LEGS] + [c[1] for c in CAP], bone='body')
F.part('tray', tk.join([t[0] for t in TRAYP], 'tray'), [t[1] for t in TRAYP], bone='tray')
for nm, ((lo, hi), s) in WORK.items():
    held = HELD[nm] if isinstance(HELD[nm], list) else [HELD[nm]]
    F.part(nm, tk.join([lo] + [h[0] for h in held], nm), [hi] + [h[1] for h in held], bone=nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0.6, BASE_Z - 4.0), parent='root')
    R.bone('tray', (0, -2.0, MC[2] - 4.0), parent='body')
    for nm, ((lo, hi), s) in WORK.items():
        R.bone(nm, s, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'tray', 'arm_up', 'arm_coin', 'arm_pot']
    with R.action('gimmick'):
        k = R.key
        for b in allb:
            k(b, 0)
        # "Bentō, bentō!": he bobs, the tray bounces on its strap
        for i, f in enumerate((4, 10, 16, 22)):
            k('body', f, move=(0, 0, 1.2 if i % 2 == 0 else 0.0), scale=(1.02, 1.02, 0.97) if i % 2 else 1.0)
            k('tray', f, rot=('X', -6 if i % 2 == 0 else 3))
        k('body', 26)
        k('tray', 26)
        # the bentō goes up to the carriage window
        k('arm_up', 6)
        k('arm_up', 16, rot=[('Y', -18), ('X', 16)], ease='BACK')
        k('arm_up', 44, rot=[('Y', -18), ('X', 16)])
        k('arm_up', 54)
        # the coin arm reaches out, takes the coin and brings it home
        k('arm_coin', 18)
        k('arm_coin', 28, rot=[('Y', 20), ('X', -10)], ease='BACK')
        k('arm_coin', 34, rot=[('Y', 20), ('X', -10)])
        k('arm_coin', 44, rot=[('Y', -6), ('X', -6)])
        k('arm_coin', 54)
        # the tea-pot arm waves the pot ("o-cha!")
        k('arm_pot', 26)
        for i, f in enumerate((32, 38, 44, 50)):
            k('arm_pot', f, rot=('X', -14 if i % 2 == 0 else 6))
        k('arm_pot', 58)
        k('body', 52)
        k('body', 56, move=(0, 0, 1.4))
        k('body', 62, ease='BOUNCE')
        for b in allb:
            k(b, 70)
    return R


# ------------------------------------------------------------------ paint
def paint(P):
    import paint as pt
    import face
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    free = P.shade(light=0.0, ao=0.35, cav=1.1)
    tone = np.where(P.part == PI['body'], sh, free)
    SKIN = pt.ramp('#e46a4e', 7, shift=0.07)
    P.fill('skin', SKIN, tone=tone, base=0.08 + 0.12 * tk.smoothstep(MC[2], MC[2] + 10, Z))
    P.fill('under', pt.ramp('#f2c0a4', 6, shift=0.06), tone=tone, base=0.1)
    # suckers: cream dots in rows on the undersides
    und = P.region('under')
    P.tint(und & ((np.mod(X * 1.1 + Yc * 0.4, 1.8) - 0.9) ** 2 + (np.mod(Yc * 1.1 - X * 0.4 + Z * 0.3, 1.8) - 0.9) ** 2 < 0.22), pt.ramp('#fbe6d0', 5, shift=0.05), tone + 0.2)
    # darker freckles on the mantle (an octopus's skin)
    sk = P.region('skin') & (P.part == PI['body']) & (Z > BASE_Z + 6)
    P.tint(sk & (np.sin(X * 1.3 + Z * 0.9) * np.sin(Yc * 1.1 - Z * 0.7) > 0.86), pt.ramp('#b8483c', 6, shift=0.06), sh)
    # the white vendor's cap (a red band), the armband
    P.fill('cap', pt.ramp('#f2eee4', 7, shift=0.05), tone=free, base=0.15)
    P.fill('band', pt.ramp('#c8303a', 6, shift=0.06), tone=free, base=0.1)
    P.fill('visor', pt.ramp('#26262c', 6, shift=0.05), tone=free * 1.3, base=0.3)
    P.fill('badge', pt.ramp('#e2b84c', 6, shift=0.06), tone=free, base=0.2)
    # the tray: pale wood; the bentō in printed paper wrappers (a red label band, a brush mark), clay pots
    P.fill('wood', pt.ramp('#d2ac74', 7, shift=0.06), tone=sh, base=0.1)
    P.tint(P.region('wood') & (np.mod(X * 1.7 + np.sin(Yc * 0.8) * 1.2, 2.2) < 0.25), pt.ramp('#b08a56', 6, shift=0.06), sh)
    BW = pt.ramp('#efe6cc', 6, shift=0.05)
    P.fill('bento', BW, tone=free, base=0.1)
    bm = P.region('bento')
    P.flat(bm & (np.abs(np.mod(X + 0.8, 5.4) - 2.7) < 0.7) & (on[:, :, 2] > 0.5), '#c8343c')
    P.flat(bm & (np.abs(np.mod(X + 0.8, 5.4) - 2.7) < 0.22) & (on[:, :, 2] > 0.5) & (np.mod(Yc, 1.6) < 0.8), '#2a2224')
    P.flat(bm & (on[:, :, 2] < 0.5) & (np.mod(Z, 1.2) < 0.3), '#9a7a5a')
    P.fill('clay', pt.ramp('#8a5236', 6, shift=0.06), tone=free, base=0.12)
    P.flat(P.region('clay') & (on[:, :, 2] > 0.7), '#efe6d4')
    P.fill('coin', pt.ramp('#c9a24a', 6, dark=0.6, light=0.6, shift=0.05), tone=free * 1.3, base=0.2)
    P.fill('strap', pt.ramp('#5a4632', 5, shift=0.05), tone=free, base=0.1)
    # the face, drawn on: happy ^ ^ eyes, the octopus's shouting tube of a mouth ("bentō, bentō!"), a blush
    fc = face.Face(P, c=(0, -9.4, MC[2] - 3.0), axis=(0, -1, 0.05), where=P.region('skin') & (P.part == PI['body']), seed=71)
    fc.eyes('happy', spread=10.0, size=0.8, dy=1.8)
    fc.blush(13.6, -0.6, rx=1.8, ry=1.0)
    fm = face.Face(P, c=(0, -10.6, MC[2] - 6.0), axis=(0, -1, 0), where=P.region('skin') & (P.part == PI['body']), seed=72)
    fm.mouth('o', w=1.6, dy=0.0)
    P.lines(['skin'], ['cap', 'band', 'under', 'strap'], step=1)
    P.lines(['bento', 'clay'], None, step=1)
    P.clusters()
    return P.done()


cx.run(F, make_rig, paint, clip=dict(frames=range(1, 71), skip=[('arm_up', 'body'), ('arm_coin', 'body'), ('arm_pot', 'body'), ('tray', 'body')]),
       cams=[((66, -80, 54), (0, -2, 18)), ((-62, 70, 48), (0, 0, 18))], fold=(0, 16, 30, 44))
