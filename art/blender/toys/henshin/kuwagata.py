"""クリップクワガタ Clip Stag: a Shōwa binder clip that is a stag beetle (series henshin, concepts.md).

The black spring-steel clip is the beetle's wing cases, its barrel sits on the thorax, and its two chrome wire levers
are the mandibles: folded back over the body it is a binder clip on the desk, flipped forward they are a stag
beetle's great jaws. Six legs fold out from under it. Rest pose: the beetle, jaws forward.
Gimmick: it folds into a binder clip (legs in, head in, levers back), sits a beat, then springs up, flips its jaws
forward and snaps them twice, and opens its wing cases to show the amber wings with a buzz.

    tools/blender.sh art/blender/toys/henshin/kuwagata.py [--preview] [--fold] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
from fig import Fig  # noqa: E402
from mathutils import Vector  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('henshin', 'kuwagata')

ZB = 9.6                     # the body's centre height (on its legs)
BARREL = (0, -12.4, ZB + 6.5)  # the clip's barrel, on top of the thorax: the levers' pivot (axis x)


# ------------------------------------------------------------------ the wing cases: the clip, split down the middle
def elytra_rings():
    R = [(-1.8, 19.0, 6.0, 2.0), (2.5, 23.4, 7.6, 2.6), (9.6, 24.6, 8.2, 2.8), (16.8, 23.0, 7.8, 2.7), (22.6, 17.6, 6.4, 2.4),
         (26.2, 8.4, 3.6, 1.8)]
    return [{'c': (0, y, ZB), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.7, 'tw': 0.62} for y, w, ht, hb in R]


def sculpt_elytra(h):
    def f(V, N):
        up = tk.smoothstep(0.1, 0.6, N[:, 2])
        # the steel's pressed rim round each case and two faint ribs (a stag beetle's elytra lines)
        rib = sum(-0.16 * tk.smoothstep(0.35, 0.0, np.abs(np.abs(V[:, 0]) - x)) for x in (3.6, 7.4))
        return up * rib
    tk.push(h, f)


ELY = {}
for sx, nm in ((1, 'ely_l'), (-1, 'ely_r')):
    cage = tk.loft(nm, elytra_rings(), n=16, cap0='round', cap1='round')
    tk.subsurf(cage, 1)
    hi = tk.copy(cage, nm + '_hi')
    tk.subsurf(hi, 2)
    sculpt_elytra(hi)
    for o in (cage, hi):
        tk.bisect(o, (sx * 0.12, 0, 0), (sx, 0, 0), keep='+')
    tk.regions(hi, 'black', [('inner', lambda C, N, sx=sx: np.abs(C[:, 0]) < 0.4)])
    tk.decimate(cage, 150)
    ELY[nm] = (cage, hi, (sx * 0.2, -4.4, ZB + 9.4))  # the hinge: the front of the wing case's inner edge

# ------------------------------------------------------------------ the thorax with the barrel, the belly, the head
cage = tk.loft('thorax', [{'c': (0, y, ZB + 0.6), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.9, 'tw': 0.82}
                          for y, w, ht, hb in ((-14.0, 14.0, 4.0, 2.4), (-11.5, 19.0, 5.6, 2.8), (-6.5, 20.6, 6.0, 3.0), (-2.6, 19.0, 5.4, 2.8))],
                n=16, cap0='round', cap1='round')


def sculpt_thorax(h):
    def f(V, N):
        # the pronotum's side notches and a central groove
        groove = -0.25 * tk.smoothstep(0.6, 0.0, np.abs(V[:, 0])) * tk.smoothstep(0.3, 0.8, N[:, 2])
        notch = sum(-tk.bump(V, (sx * 10.0, -9.0, ZB + 1.0), 2.0, 0.6) for sx in (1, -1))
        return groove + notch
    tk.push(h, f)


th_lo, th_hi = tk.lowhigh(cage, 'thorax', lo=1, hi=3, tris=150, sculpt=sculpt_thorax, region='black')
for o in (th_lo, th_hi):  # the head's socket: it draws back into the thorax for the clip
    tk.boolean(o, tk.loft('hsock', [{'c': (0, y, ZB + 0.4), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.8, 'tw': 0.8}
                                    for y, w, ht, hb in ((-15.2, 14.4, 4.3, 2.9), (-4.0, 14.4, 4.3, 2.9))], n=14, cap0='flat', cap1='flat'))
tk.decimate(th_lo, 170)
barrel = tk.cyl('barrel', 1.9, -8.2, 8.2, n=14, at=(BARREL[1], BARREL[2]), axis='X', bevel=0.4, segs=2)
bar_lo, bar_hi = tk.lowhigh(barrel, 'barrel', lo=0, hi=1, region='chrome')
tk.decimate(bar_lo, 56)
belly = tk.loft('belly', [{'c': (0, y, ZB - 3.0), 'w': w, 'h': 1.3, 'e': 2.6} for y, w in ((-4, 8.4), (2, 9.6), (12, 9.0), (18, 5))], n=12,
                cap0='round', cap1='round')
belly_lo, belly_hi = tk.lowhigh(belly, 'belly', lo=1, hi=2, tris=70, region='under')
head = tk.loft('head', [{'c': (0, y, ZB + 0.4), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.8, 'tw': 0.8}
                        for y, w, ht, hb in ((-9.6, 12.4, 3.6, 2.3), (-12.0, 12.8, 3.7, 2.4), (-15.4, 15.4, 3.9, 2.5), (-19.6, 14.6, 3.3, 2.3), (-22.0, 10.4, 2.2, 1.7))],
               n=14, cap0='round', cap1='round')


def sculpt_head(h):
    def f(V, N):
        # the compound eyes: two glossy domes on the head's sides; a brow ridge between them
        eyes = sum(tk.bump(V, (sx * 7.5, -17.0, ZB + 1.2), 2.9, 1.3, sharp=1.2) for sx in (1, -1))
        # a frowning brow ridge over each eye (a stag beetle is always cross)
        brow = sum(tk.bump(V, (sx * 6.2, -17.8, ZB + 3.4), 2.0, 0.55) for sx in (1, -1)) + tk.bump(V, (0, -19.6, ZB + 3.0), 2.6, 0.3)
        return eyes + brow
    tk.push(h, f)


head_lo, head_hi = tk.lowhigh(head, 'head', lo=1, hi=3, tris=110, sculpt=sculpt_head, region=(
    'black', [('ceye', lambda C, N: (np.hypot(np.abs(C[:, 0]) - 7.5, C[:, 1] + 17.0) < 2.7) & (np.abs(C[:, 0]) > 5.4))]))

# ------------------------------------------------------------------ the mandibles: the clip's chrome wire levers
MAND = {}
for sx, nm in ((1, 'mand_l'), (-1, 'mand_r')):
    # the lever: a wire loop from the barrel's end, arching wide round the eyes and closing to a hooked jaw tip
    P = [(7.6, BARREL[1], BARREL[2]), (10.4, -15.0, ZB + 6.0), (11.6, -19.6, ZB + 5.4), (11.8, -24.0, ZB + 3.2), (10.4, -29.0, ZB + 1.6),
         (7.4, -33.4, ZB + 1.1), (4.2, -35.4, ZB + 1.0), (3.0, -34.2, ZB + 1.1), (5.6, -32.2, ZB + 1.2), (7.6, -29.0, ZB + 1.4),
         (6.0, -27.2, ZB + 1.6), (7.9, -25.0, ZB + 2.0),  # the inner tooth
         (9.3, -21.0, ZB + 4.6), (9.0, -16.6, ZB + 6.0), (6.0, BARREL[1] - 0.6, BARREL[2])]
    P = [(sx * x, y, z) for x, y, z in P]
    lo = tk.tube(nm, P, 0.72, n=5, closed=True)
    hi = tk.tube(nm + '_hi', P, 0.72, n=10, closed=True)
    tk.subsurf(hi, 2)
    tk.subsurf(lo, 1)
    tk.decimate(lo, 120)
    tk.set_region(hi, 'chrome')
    MAND[nm] = (lo, hi, (sx * 6.8, BARREL[1], BARREL[2]))


# ------------------------------------------------------------------ legs: six, thin and spiny, from the belly
def leg(nm, sx, y, kind):
    """A stag beetle's leg from its socket under the belly, out and down to the ground with a slight knee: straight
    enough to fold flat under the body (the clip stands on its folded legs)."""
    reach = {'f': 15.0, 'm': 15.5, 'h': 15.0}[kind]
    dy = {'f': -3.0, 'm': 0.5, 'h': 3.5}[kind]
    c = np.array((sx * 3.8, y, ZB - 4.3))
    f = np.array((sx * reach, y + dy, 0.9))
    k = c + (f - c) * 0.55 + np.array((0, 0, 1.1))  # the knee, raised a touch
    t = f + np.array((sx * 1.0, dy * 0.3, -0.4))
    lo = tk.tube(nm, [tuple(c), tuple(k), tuple(f), tuple(t)], [1.15, 0.95, 0.72, 0.45], n=5, cap0='round', cap1='point')
    hi = tk.tube(nm + '_hi', [tuple(c), tuple(k), tuple(f), tuple(t)], [1.15, 0.95, 0.72, 0.45], n=8, cap0='round', cap1='point')
    tk.subsurf(lo, 1)
    tk.decimate(lo, 46)
    tk.subsurf(hi, 2)

    def spines(V, N):  # the tibia's little spines (baked)
        d = 0.0
        for t_ in np.linspace(0.2, 0.9, 4):
            p = k * (1 - t_) + f * t_
            d = d + tk.bump(V, tuple(p + np.array((0, 0.0, 0.4))), 0.5, 0.35)
        return d
    tk.push(hi, spines)
    tk.set_region(hi, 'black')
    return lo, hi, tuple(c)


LEGS = {}
for kind, y in (('f', -9.0), ('m', 1.5), ('h', 11.0)):
    for sx, side in ((1, 'l'), (-1, 'r')):
        nm = f'leg_{kind}{side}'
        LEGS[nm] = leg(nm, sx, y, kind)

# ------------------------------------------------------------------ hind wings (amber membranes under the wing cases)
WING = {}
for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
    out = [(0.0, 0.0), (4.6, 1.2), (7.0, 7.0), (7.4, 14.0), (6.0, 20.0), (3.2, 22.0), (0.8, 17.0), (-0.4, 8.0)]
    w = tk.slab(nm, [(sx * x, y) for x, y in out][::sx], 0.4, plane='XY', at=ZB + 1.2, bevel=0.1, segs=1)
    tk.move(w, (sx * 1.0, -1.0, 0))
    hi = tk.copy(w, nm + '_hi')
    tk.set_region(hi, 'wing')
    WING[nm] = (w, hi, (sx * 1.0, -1.0, ZB + 1.2))

# ------------------------------------------------------------------ parts
F.part('belly', belly_lo, [belly_hi], bone='root', uvw=0.6)
F.part('thorax', th_lo, [th_hi], bone='root', kind='gloss')
F.part('barrel', bar_lo, [bar_hi], bone='root', kind='metal', uvw=0.7)
F.part('head', head_lo, [head_hi], bone='head', kind='gloss')
for nm, (lo, hi, piv) in ELY.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss')
for nm, (lo, hi, piv) in MAND.items():
    F.part(nm, lo, [hi], bone=nm, kind='metal')
for nm, (lo, hi, c) in LEGS.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss')
for nm, (lo, hi, piv) in WING.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss', uvw=0.7)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
OUT = os.path.join(F.out, F.id)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, ZB))
    R.bone('head', (0, -11.0, ZB), parent='root')
    for nm, (lo, hi, piv) in ELY.items():
        R.bone(nm, piv, parent='root')
    for nm, (lo, hi, piv) in WING.items():
        R.bone(nm, piv, parent='root')
    for nm, (lo, hi, piv) in MAND.items():
        R.bone(nm, piv, parent='root')
    for nm, (lo, hi, c) in LEGS.items():
        R.bone(nm, c, parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    DOWN = ZB - 5.6  # the clip comes down onto its folded legs
    EY, EX = float(os.environ.get('ELY_Y', 36)), float(os.environ.get('ELY_X', 30))
    LEVER = -float(os.environ.get('LEVER', 188))  # the levers swing up and over, back onto the wing cases
    legs = {nm: (1 if nm.endswith('l') else -1) for nm in LEGS}
    with R.action('gimmick'):
        k = R.key
        allb = ['root', 'head'] + list(ELY) + list(WING) + list(MAND) + list(legs)
        for b in allb:
            k(b, 0)
        # 0-14 it folds into a binder clip: the levers swing back over its back, legs tuck under, head in, it sits
        for nm in MAND:
            k(nm, 4)
            k(nm, 8, rot=('X', LEVER * 0.5), ease='LINEAR')
            k(nm, 13, rot=('X', LEVER))
        # each pair swings back under the body at its own angle (front ones widest), then levels out flat
        FZ = [float(v) for v in os.environ.get('LEG_Z', '62,72,82').split(',')]
        FX = float(os.environ.get('LEG_X', 16))
        SWING = {nm: [('Z', sx * FZ['fmh'.index(nm[4])])] for nm, sx in legs.items()}
        FOLD = {nm: [('Z', sx * FZ['fmh'.index(nm[4])]), ('X', FX)] for nm, sx in legs.items()}
        for nm, sx in legs.items():  # the legs swing back under the body and lie flat
            k(nm, 3)
            k(nm, 7, rot=SWING[nm])
            k(nm, 10, rot=FOLD[nm])
        k('head', 1)
        k('head', 6, move=(0, 4.2, -0.3))
        k('root', 6)
        k('root', 13, move=(0, 0, -DOWN), ease='BOUNCE')
        # 14-36 a binder clip on the desk
        for nm in MAND:
            k(nm, 36, rot=('X', LEVER), ease='LINEAR')
        for nm, sx in legs.items():
            k(nm, 36, rot=FOLD[nm])
        k('head', 36, move=(0, 4.2, -0.3))
        k('root', 36, move=(0, 0, -DOWN))
        # 36-50 up on its legs, the jaws flip forward and snap, snap
        k('root', 42, move=(0, 0, 1.5), ease='BACK')
        k('root', 46)
        for nm, sx in legs.items():
            k(nm, 39, rot=SWING[nm])
            k(nm, 43, ease='BACK')
        k('head', 41, ease='BACK')
        for nm in MAND:
            k(nm, 40, rot=('X', LEVER * 0.5), ease='LINEAR')
            k(nm, 44, rot=('X', -6), ease='BACK')
        for nm, sx in (('mand_l', 1), ('mand_r', -1)):
            k(nm, 47, rot=[('X', -6), ('Z', sx * 16)])
            k(nm, 49, rot=('Z', -sx * 4), ease='CONSTANT')
            k(nm, 52, rot=('Z', -sx * 4))
            k(nm, 54, rot=('Z', sx * 14))
            k(nm, 56, rot=('Z', -sx * 4), ease='CONSTANT')
            k(nm, 60, rot=('Z', 0))
        # 58-90 the wing cases lift and part, the amber wings fan out with a buzz, then fold away
        for nm, sx in (('ely_l', 1), ('ely_r', -1)):
            k(nm, 60)
            k(nm, 63, rot=[('X', EX)])  # up first, off the thorax...
            k(nm, 66, rot=[('Y', -sx * EY), ('X', EX)], ease='BACK')  # ...then out
            k(nm, 80, rot=[('Y', -sx * EY), ('X', EX)])
            k(nm, 83, rot=[('X', EX)])
            k(nm, 86)
        for nm, sx in (('wing_l', 1), ('wing_r', -1)):
            k(nm, 62)
            k(nm, 68, rot=[('Z', sx * 52), ('Y', sx * 12)])
            for i, fr in enumerate(range(69, 79, 2)):
                k(nm, fr, rot=[('Z', sx * 52), ('Y', sx * (24 if i % 2 == 0 else 4))])
            k(nm, 79, rot=[('Z', sx * 52), ('Y', sx * 12)])
            k(nm, 84)
        k('root', 68)
        k('root', 72, move=(0, 0, 2.2))
        k('root', 78, move=(0, 0, 0), ease='BOUNCE')
        for b in allb:
            k(b, 92)
    return R


if '--clip' in ARGS:
    from rig import check_clip
    R = make_rig()
    res = check_clip(R, F.parts, range(1, 93), skip=[('barrel', 'thorax'), ('wing_l', 'ely_l'), ('wing_r', 'ely_r')], tol=0.35)
    for f, L in sorted(res.items()):
        print('CLIP', f, L)
    print('CLIP frames', len(res))
    sys.exit(0)

if '--preview' in ARGS or '--fold' in ARGS:
    lows = [p.low for p in F.parts]
    highs = [h for p in F.parts for h in p.highs]
    if '--fold' in ARGS:
        import bpy
        R = make_rig()
        R.arm.animation_data.action = bpy.data.actions['gimmick']
        frs = [int(v) for v in os.environ.get('FRS', '0,24,50,74').split(',')]
        cams = [((66, -74, 58), (0, -6, 8)), ((120, 0, 8), (0, -2, 8)), ((66, -74, 58), (0, -6, 8)), ((120, 0, 8), (0, -2, 8))]
        for i, fr in enumerate(frs):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=cams[i], lens=50)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=((66, -74, 58), (0, -6, 8)), lens=50)
    tk.preview(OUT + '_p2.png', highs, cam=((-62, 66, 50), (0, -2, 8)), lens=50)
    tk.preview(OUT + '_p3.png', lows, cam=((66, -74, 58), (0, -6, 8)), lens=50)
    tk.preview(OUT + '_p4.png', highs, cam=((0, -20, 110), (0, -6, 8)), lens=50)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=5.0, reuse='--repaint' in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.3)
    # black-lacquered spring steel: a near-black ramp that turns blue-violet in its lights (a stag beetle's sheen)
    BLACK = pt.ramp('#2c2a30', 7, dark=0.45, light=0.38, shift=0.0, sat=0.0)
    BLACK = np.array([pt.mix(c, pt.hexrgb('#4a5878'), 0.35 * max(0, i - 3) / 3) for i, c in enumerate(BLACK)])
    top = np.clip(on[:, :, 2], 0, 1)
    P.fill('black', BLACK, tone=sh, base=-0.05 + 0.1 * top)
    P.fill('inner', pt.ramp('#3a3638', 5, shift=0.03), tone=sh, base=-0.2)
    P.fill('under', pt.ramp('#43322a', 6, shift=0.05), tone=sh, base=0.0)
    P.fill('chrome', pt.ramp('#b3bbc4', 7, dark=0.75, light=0.75, shift=0.05), tone=sh * 1.5, base=0.1)
    # the eyes: jet beads in a dull bronze socket rim (so they read on the black head), the look is in the brows
    P.fill('ceye', pt.ramp('#1c1517', 5, dark=0.6, light=0.35, shift=0.04), tone=sh, base=-0.1)
    for sx in (1, -1):
        ax = np.array((sx * 0.72, -0.62, 0.32))
        ax /= np.linalg.norm(ax)
        P.eye(tuple(np.array((sx * 7.5, -17.0, ZB + 1.2)) + ax * 2.1), tuple(ax), 2.05, ry=1.9, full=True, bead=None,
              where=P.region('ceye'), facing=0.2)
        rimz = P.region('black') & ~P.region('ceye') & (np.hypot(np.abs(X) - 7.5, Yc + 17.0) < 3.25)
        P.flat(rimz, '#5e4c3c')
    # hind wings: amber membrane with dark veins
    P.fill('wing', pt.ramp('#d6a04a', 6, shift=0.07), tone=sh * 0.6, base=0.1)
    vein = P.region('wing') & ((np.abs(np.sin((np.abs(X) * 1.2 + Yc * 0.35))) < 0.12) | (np.abs(np.sin(Yc * 0.55)) < 0.08))
    P.tint(vein, pt.ramp('#d6a04a', 6, shift=0.07), sh * 0.6 - 0.7)
    # the clip maker's print on each wing case: a small cream size mark
    for sx in (1, -1):
        m = P.region('black') & (np.abs(np.abs(X) - 6.0) < 1.6) & (np.abs(Yc - 18.0) < 0.9) & (on[:, :, 2] > 0.4)
        P.flat(m, '#d8cfbc')
        P.flat(P.region('black') & (np.abs(np.abs(X) - 6.0) < 1.6) & (np.abs(Yc - 20.2) < 0.45) & (on[:, :, 2] > 0.4), '#d8cfbc')
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
