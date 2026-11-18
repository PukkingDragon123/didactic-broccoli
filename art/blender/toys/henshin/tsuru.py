"""コンパスヅル Compass Crane: a Shōwa drawing compass and protractor that is a red-crowned crane (series henshin).

The compass's black knurled handle is the crane's black neck, its red cap the red crown, the hinge housing is the
white body, the two jointed legs are the crane's legs, and the protractor (in two quarters) is the wings, its black
degree band the black wing tips. Rest pose: the crane in its courtship dance, wings raised, neck curved.
Gimmick: it folds into a compass (wings down into a protractor, legs together, neck straight, beak up), then breaks
into the crane's dance: wings beat, neck up, a call, one leg lifted and a hop.

    tools/blender.sh art/blender/toys/henshin/tsuru.py [--preview] [--fold] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import bpy  # noqa: E402
from fig import Fig  # noqa: E402
from mathutils import Vector  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('henshin', 'tsuru')

HIP = (0, 0.5, 27.0)       # the compass hinge: the legs' pivot (axis y)
BODY_C = (0, 1.0, 31.0)
SHOULDER = (0, 3.0, 35.2)  # the wings' pivot
NECK0 = (0, -5.4, 34.0)    # where the handle (neck) leaves the body
WR = 17.0                  # wing (protractor) radius

# ------------------------------------------------------------------ the body: the compass's white hinge housing
body = tk.loft('body', [{'c': (0, y, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.2}
                        for y, z, w, ht, hb in ((-8.0, 32.6, 5.0, 2.4, 2.2), (-5.6, 32.2, 10.0, 4.4, 4.0), (0.0, 31.4, 12.4, 5.2, 4.6),
                                                (5.5, 31.4, 11.4, 4.8, 4.2), (10.0, 31.8, 7.0, 3.2, 2.6), (12.6, 32.4, 2.4, 1.2, 1.0))],
               n=14, cap0='round', cap1='point')


def sculpt_body(h):
    def f(V, N):
        # the hinge boss either side (the compass's pivot screw) and soft feather layering on the back
        boss = sum(tk.bump(V, (sx * 5.6, HIP[1], HIP[2] + 2.6), 2.6, 0.5) for sx in (1, -1))
        layers = 0.12 * np.sin(V[:, 1] * 1.4 - np.abs(V[:, 0]) * 0.5) * tk.smoothstep(0.2, 0.8, N[:, 2]) * (V[:, 1] > 0)
        return boss + layers
    tk.push(h, f)


body_lo, body_hi = tk.lowhigh(body, 'body', lo=1, hi=3, tris=150, sculpt=sculpt_body, region='white')
# the bustle: the crane's black drooping plumes over the tail
bust = tk.loft('bustle', [{'c': (0, 4.0, 34.0), 'w': 7.0, 'ht': 2.2, 'hb': 1.4, 'e': 2.2}, {'c': (0, 9.0, 33.4), 'w': 8.6, 'ht': 2.4, 'hb': 1.6, 'e': 2.2},
                          {'c': (0, 13.6, 31.0), 'w': 7.6, 'ht': 2.0, 'hb': 1.4, 'e': 2.4}, {'c': (0, 16.4, 27.6), 'w': 4.6, 'ht': 1.2, 'hb': 0.8, 'e': 2.4}],
                n=10, cap0='round', cap1='round')


def sculpt_bustle(h):
    def f(V, N):  # long plumes: grooves running down the bustle
        return -0.2 * np.abs(np.sin(V[:, 0] * 1.6)) ** 4 * tk.smoothstep(0.0, 0.6, N[:, 2])
    tk.push(h, f)


bu_lo, bu_hi = tk.lowhigh(bust, 'bustle', lo=1, hi=3, tris=60, sculpt=sculpt_bustle, region='tail')
body_lo = tk.join([body_lo, bu_lo], 'body')
pivot = tk.cyl('pivot', 2.0, -6.4, 6.4, n=14, at=(HIP[1], HIP[2] + 2.4), axis='X', bevel=0.4, segs=2)
piv_lo, piv_hi = tk.lowhigh(pivot, 'pivot', lo=0, hi=1, region='chrome')
tk.decimate(piv_lo, 50)


# ------------------------------------------------------------------ the legs: the compass legs, jointed at the knee
def leg(nm, sx):
    top = (sx * 2.4, HIP[1], HIP[2] + 1.0)
    knee = (sx * 4.3, HIP[1] + 0.6, 13.0)
    ank = (sx * 5.4, HIP[1] - 0.6, 2.6)
    upper = tk.loft(nm + '_up', [{'c': top, 'w': 3.0, 'h': 1.3, 'e': 3.0}, {'c': (sx * 3.4, HIP[1] + 0.3, 20.0), 'w': 2.2, 'h': 1.05, 'e': 2.6},
                                 {'c': knee, 'w': 2.0, 'h': 1.0, 'e': 2.4}], n=8, up=(0, -1, 0), cap0='round', cap1='round')
    joint = tk.lathe(nm + '_knee', [(0, -1.3), (1.5, -1.1), (1.6, 0), (1.5, 1.1), (0, 1.3)], n=10, axis='X', centre=knee)
    lower = tk.loft(nm + '_low', [{'c': knee, 'w': 1.7, 'h': 0.85, 'e': 2.4}, {'c': (sx * 4.9, HIP[1] - 0.1, 7.0), 'w': 1.4, 'h': 0.7, 'e': 2.2},
                                  {'c': ank, 'w': 1.2, 'h': 0.6, 'e': 2.0}], n=8, up=(0, -1, 0), cap0='round', cap1='round')
    # the foot: three long toes and a hind toe (it stands on them; as a compass they are the point and the lead)
    toes = []
    for a, L in ((-38, 7.4), (0, 8.4), (38, 7.4), (180, 6.4)):
        d = np.array((math.sin(math.radians(a)) * sx * 0.9, -math.cos(math.radians(a)), 0))
        p0 = np.array(ank) + np.array((0, 0, -1.6))
        toes.append(tk.tube(nm + f'_toe{a}', [tuple(p0), tuple(p0 + d * L * 0.5 + np.array((0, 0, -0.5))), tuple(p0 + d * L + np.array((0, 0, -0.65)))],
                            [0.6, 0.45, 0.12], n=6, cap0='round', cap1='point'))
    lows, highs = [], []
    for o, tri in ((upper, 40), (joint, 30), (lower, 30)):
        lo, hi = tk.lowhigh(o, o.name, lo=1, hi=2, tris=tri, region=('steel', [('chrome', lambda C, N: np.linalg.norm(C - np.array(knee), axis=1) < 1.7)]) if o is joint else 'steel')
        lows.append(lo)
        highs.append(hi)
    for t in toes:
        lo, hi = tk.lowhigh(t, t.name, lo=0, hi=2, region='steel')
        tk.decimate(lo, 14)
        lows.append(lo)
        highs.append(hi)
    return tk.join(lows, nm), highs, top


LEGS = {nm: leg(nm, sx) for nm, sx in (('leg_l', 1), ('leg_r', -1))}

# ------------------------------------------------------------------ the neck: the black knurled handle, in two joints
N1 = [NECK0, (0, -7.4, 39.0), (0, -8.2, 44.0)]
N2 = [(0, -8.2, 43.6), (0, -7.6, 48.0), (0, -6.6, 51.6)]
HEAD = (0, -6.4, 52.4)


def knurl(h):
    def f(V, N):  # the handle's knurling: a fine diamond grip
        a = np.arctan2(V[:, 0], V[:, 1] + 7.6)
        return 0.09 * np.sign(np.sin(a * 8 + V[:, 2] * 2.2) * np.sin(a * 8 - V[:, 2] * 2.2))
    tk.push(h, f)


neck1 = tk.tube('neck1', N1, [1.9, 1.65, 1.5], n=10, cap0='round', cap1='round')
neck2 = tk.tube('neck2', N2, [1.45, 1.35, 1.3], n=10, cap0='round', cap1='round')
n1_lo, n1_hi = tk.lowhigh(neck1, 'neck1', lo=1, hi=3, tris=56, sculpt=knurl, region='black')
n2_lo, n2_hi = tk.lowhigh(neck2, 'neck2', lo=1, hi=3, tris=50, sculpt=knurl, region='black')
# the head: the handle's cap: red crown on top, black face, white nape; the beak hinged under it
head = tk.loft('head', [{'c': (0, -4.2, 53.0), 'w': 3.6, 'h': 2.0, 'e': 2.2}, {'c': (0, -6.4, 53.4), 'w': 4.8, 'h': 2.7, 'e': 2.3},
                        {'c': (0, -8.8, 53.0), 'w': 4.0, 'h': 2.3, 'e': 2.3}, {'c': (0, -10.4, 52.6), 'w': 2.4, 'h': 1.5, 'e': 2.2}],
               n=12, cap0='round', cap1='round')


def sculpt_head(h):
    def f(V, N):
        crown = tk.bump(V, (0, -6.6, 55.8), 2.6, 0.45)  # the red crown's raised, bare skin
        # a brow over each eye and the eye itself, a little glossy dome
        d = 0.0
        for sx in (1, -1):
            d = d + tk.bump(V, (sx * 2.2, -7.6, 54.6), 1.3, 0.3) + tk.bump(V, (sx * 2.35, -8.0, 53.5), 1.1, 0.3)
        return crown + d
    tk.push(h, f)


head_lo, head_hi = tk.lowhigh(head, 'head', lo=1, hi=3, tris=60, sculpt=sculpt_head, region=(
    'black', [('red', lambda C, N: (C[:, 2] > 54.4) & (C[:, 1] < -4.6) & (C[:, 1] > -9.0)),
              ('white', lambda C, N: C[:, 1] > -5.2)]))
BEAK0 = (0, -10.2, 52.6)
beak = tk.loft('beak', [{'c': BEAK0, 'w': 2.2, 'ht': 1.0, 'hb': 0.9, 'e': 2.2}, {'c': (0, -13.4, 52.1), 'w': 1.6, 'ht': 0.75, 'hb': 0.7, 'e': 2.2},
                        {'c': (0, -16.8, 51.4), 'w': 0.9, 'ht': 0.45, 'hb': 0.4, 'e': 2.0}], n=8, cap0='round', cap1='point')
beak_lo, beak_hi = tk.lowhigh(beak, 'beak', lo=1, hi=2, tris=40, region='beak')

# ------------------------------------------------------------------ the wings: the protractor, in two quarters
WING = {}
for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
    # modelled folded down (a vertical quarter of the protractor under the hinge), then raised to the rest pose
    pts = [(0, 0)] + [(sx * WR * math.sin(math.radians(a)), -WR * math.cos(math.radians(a))) for a in np.linspace(0, 90, 10)]
    if sx < 0:
        pts = pts[::-1]
    pts = [(p[0] * 0.98 + sx * 0.4, p[1]) for p in pts]
    w_hi = tk.slab(nm + '_hi', pts, 1.3, plane='XZ', at=0, bevel=0.3, segs=2)
    w_lo = tk.slab(nm, pts, 1.3, plane='XZ', at=0, bevel=0, segs=0)
    for w in (w_hi, w_lo):
        tk.move(w, SHOULDER)
    # the protractor's printed scale is paint; its arc rim is pressed: a slight ridge on the high
    tk.subsurf(w_hi, 1)
    tk.set_region(w_hi, 'proto')
    # rest pose: raised and spread, tipped back (the dance)
    from mathutils import Matrix
    M = Matrix.Rotation(math.radians(sx * 14), 3, 'Z') @ Matrix.Rotation(math.radians(12), 3, 'X') @ Matrix.Rotation(math.radians(-sx * 104), 3, 'Y')
    for w in (w_hi, w_lo):
        tk.rotate(w, -sx * 104, 'Y', SHOULDER)
        tk.rotate(w, 12, 'X', SHOULDER)
        tk.rotate(w, sx * 14, 'Z', SHOULDER)
    WING[nm] = (w_lo, w_hi, np.array(M))

# ------------------------------------------------------------------ parts
# the stand: a half protractor the crane stands on (a school set's protractor, and a steady footing)
BASE_T = 1.6
arc = [(22.0 * math.cos(math.radians(a)), 7.0 - 22.0 * math.sin(math.radians(a))) for a in np.linspace(0, 180, 25)]
stand_hi = tk.slab('stand_hi', arc, BASE_T, plane='XY', at=BASE_T / 2, bevel=0.35, segs=2)
stand_lo = tk.slab('stand', arc, BASE_T, plane='XY', at=BASE_T / 2, bevel=0, segs=0)
tk.boolean(stand_hi, tk.cyl('hole', 2.4, -1, 3, n=16, at=(0, 7.0), axis='Z', bevel=0.2, segs=1))
tk.set_region(stand_hi, 'stand')
for o in [o for o in bpy.data.objects if o.type == 'MESH' and not o.name.startswith('stand')]:
    tk.move(o, (0, 0, BASE_T))  # the crane stands on it
F.part('body', body_lo, [body_hi, bu_hi], bone='root')
F.part('stand', stand_lo, [stand_hi], bone='stand', kind='gloss')
F.part('pivot', piv_lo, [piv_hi], bone='root', kind='metal', uvw=0.6)
for nm, (lo, highs, top) in LEGS.items():
    F.part(nm, lo, highs, bone=nm, kind='metal')
F.part('neck1', n1_lo, [n1_hi], bone='neck1', kind='gloss')
F.part('neck2', n2_lo, [n2_hi], bone='neck2', kind='gloss')
F.part('head', head_lo, [head_hi], bone='neck2', kind='gloss')
F.part('beak', beak_lo, [beak_hi], bone='beak')
for nm, (lo, hi, M) in WING.items():
    F.part(nm, lo, [hi], bone=nm, kind='gloss')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
OUT = os.path.join(F.out, F.id)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('stand', (0, 7.0, 0.8))
    R.bone('root', (HIP[0], HIP[1], HIP[2] + BASE_T))
    for nm, (lo, highs, top) in LEGS.items():
        R.bone(nm, (top[0], top[1], top[2] + BASE_T), parent='root')
    up = lambda p: (p[0], p[1], p[2] + BASE_T)  # noqa: E731
    R.bone('neck1', up(NECK0), parent='root')
    R.bone('neck2', up(N2[0]), parent='neck1')
    R.bone('beak', up(BEAK0), parent='neck2')
    for nm in WING:
        R.bone(nm, up(SHOULDER), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    wings = {'wing_l': 1, 'wing_r': -1}
    legs = {'leg_l': 1, 'leg_r': -1}
    with R.action('gimmick'):
        k = R.key
        allb = ['root', 'neck1', 'neck2', 'beak'] + list(wings) + list(legs)
        for b in allb:
            k(b, 0)
        # 0-14 a compass: the wings come down into a protractor, the legs close, the neck straightens, beak up
        for nm, sx in wings.items():
            k(nm, 2)
            k(nm, 11, rot=[('Z', -sx * 14), ('X', -12), ('Y', sx * 104)])
        for nm, sx in legs.items():
            k(nm, 4)
            k(nm, 11, rot=('Y', sx * 7.5))
        k('neck1', 3)
        k('neck1', 10, rot=('X', -14))
        k('neck2', 4)
        k('neck2', 11, rot=('X', -26))
        k('beak', 5)
        k('beak', 11, rot=('X', -86))
        k('root', 10)
        k('root', 12, move=(0, 0, 0.8))
        k('root', 15, ease='BOUNCE')
        # 15-34 a compass standing on the desk; it turns once on its point
        k('root', 18)
        k('root', 32, rot=('Z', 360), ease='LINEAR')
        for nm, sx in wings.items():
            k(nm, 34, rot=[('Z', -sx * 14), ('X', -12), ('Y', sx * 104)])
        for nm, sx in legs.items():
            k(nm, 34, rot=('Y', sx * 7.5))
        k('neck1', 34, rot=('X', -14))
        k('neck2', 34, rot=('X', -26))
        k('beak', 34, rot=('X', -86))
        # 34-90 the dance: wings sweep up and beat, neck stretches up, a call, one leg up, a hop
        for nm, sx in wings.items():
            k(nm, 38, rot=[('Z', -sx * 7), ('X', -6), ('Y', sx * 50)])
            k(nm, 42, rot=('Y', sx * 6), ease='BACK')
            k(nm, 48, rot=('Y', sx * 22))
            k(nm, 54, rot=('Y', sx * 2))
            k(nm, 60, rot=('Y', sx * 18))
            k(nm, 68, rot=('Y', 0))
        k('neck1', 42, rot=('X', 6), ease='BACK')
        k('neck2', 44, rot=('X', 14))
        k('beak', 42, rot=('X', 0), ease='BACK')
        k('beak', 47, rot=('X', 14))
        k('beak', 50, rot=('X', 0))
        k('beak', 53, rot=('X', 14))
        k('beak', 56, rot=('X', 0))
        k('neck2', 58, rot=('X', 0))
        k('neck1', 58, rot=('X', 0))
        k('leg_r', 44)
        k('leg_r', 52, rot=[('X', -24)])   # the leg swings forward and up off the stand (a crane's high step)
        k('leg_r', 66, rot=[('X', -24)])
        k('leg_r', 72)
        k('leg_l', 34, rot=('Y', 7.5))
        k('leg_l', 44)
        k('root', 34)
        k('root', 60)
        k('root', 64, move=(0, 0, 3.0))
        k('root', 69, ease='BOUNCE')
        for b in allb:
            k(b, 90)
    return R


if '--clip' in ARGS:
    from rig import check_clip
    R = make_rig()
    res = check_clip(R, F.parts, range(1, 91), skip=[('pivot', 'body'), ('neck1', 'body'), ('neck2', 'neck1'), ('head', 'neck2'), ('beak', 'head')], tol=0.35)
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
        for i, fr in enumerate((0, 24, 48, 56)):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=((80, -96, 60), (0, -2, 30)), lens=50)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=((80, -96, 60), (0, -2, 30)), lens=50)
    tk.preview(OUT + '_p2.png', highs, cam=((-80, 84, 56), (0, 0, 30)), lens=50)
    tk.preview(OUT + '_p3.png', lows, cam=((80, -96, 60), (0, -2, 30)), lens=50)
    tk.preview(OUT + '_p4.png', highs, cam=((130, -6, 34), (0, -2, 30)), lens=50)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=6.0, reuse='--repaint' in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    WHITE = pt.ramp('#f1ede2', 7, dark=0.42, shift=0.07)
    P.fill('white', WHITE, tone=sh, base=0.12)
    BLACK = pt.ramp('#26232a', 6, dark=0.4, light=0.45, shift=0.05)
    P.fill('tail', BLACK, tone=sh, base=0.05)
    P.fill('black', BLACK, tone=sh, base=0.1)
    P.fill('red', pt.ramp('#d2342c', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('beak', pt.ramp('#b9a86c', 6, shift=0.07), tone=sh, base=0.05)
    P.fill('steel', pt.ramp('#565a66', 7, dark=0.6, light=0.6, shift=0.05), tone=sh * 1.3, base=0.0)
    P.fill('chrome', pt.ramp('#b3bbc4', 7, dark=0.75, light=0.75, shift=0.05), tone=sh * 1.5, base=0.1)
    # the eye: a black bead in a charcoal socket ring on the black face
    for sx in (1, -1):
        P.eye((sx * 2.55, -8.0, 53.5 + BASE_T), (sx, -0.2, 0.15), 1.15, scale=0.8, bead='#0b090a', rim='#4a454e',
              where=P.region('black') | P.region('white'), facing=0.2)
    # the protractor wings: white plastic, a black outer band (the crane's black wing tips), printed degree ticks
    for nm, (lo, hi, M) in WING.items():
        sx = 1 if nm == 'wing_l' else -1
        m = P.region('proto') & (P.part == [p.name for p in F.parts].index(nm))
        if not m.any():
            continue
        Q = (P.pos - np.array(SHOULDER) - np.array((0, 0, BASE_T))) @ M  # back into the folded plane (rows: x, y, z of the folded wing)
        u, v = Q[:, :, 0] * sx, Q[:, :, 2]
        r = np.hypot(u, v)
        ang = np.degrees(np.arctan2(u, -v))  # 0 = down the leg, 90 = out
        P.fill(m, WHITE, tone=sh * 0.7, base=0.2)
        band = m & (r > WR - 3.4)
        P.fill(band, BLACK, tone=sh, base=0.08)
        # degree ticks: every 5 degrees short, every 10 long; white on the band, black inside it
        a5 = np.abs(((ang + 2.5) % 5) - 2.5) < 0.42
        a10 = np.abs(((ang + 5) % 10) - 5) < 0.5
        tick_in = m & (r < WR - 3.4) & (r > WR - 4.6 - 1.4 * a10) & (a5 | a10)
        P.flat(tick_in, '#2a2629')
        tick_band = band & (r > WR - 2.4) & a10 & (r < WR - 0.5)
        P.flat(tick_band, '#efe9dc')
        # the origin mark at the hinge: a small circle and crosshair, and the base line
        P.flat(m & (np.abs(r - 2.2) < 0.32), '#2a2629')
        P.flat(m & (r < 3.2) & ((np.abs(u) < 0.22) | (np.abs(v) < 0.22)), '#2a2629')
        P.flat(m & (r > 3.4) & (r < WR - 3.4) & (np.abs(ang - 45) < 0.35), '#c43a2e')
    # the stand: a white protractor, its degree scale printed round the arc, the origin mark at the hole
    st = P.region('stand')
    P.fill('stand', WHITE, tone=sh * 0.7, base=0.18)
    sr = np.hypot(X, Yc - 7.0)
    sa = np.degrees(np.arctan2(7.0 - Yc, X))
    topf = on[:, :, 2] > 0.5
    a5 = np.abs(((sa + 2.5) % 5) - 2.5) < 0.5
    a10 = np.abs(((sa + 5) % 10) - 5) < 0.6
    P.flat(st & topf & (sr > 20.6 - 1.5 * a10) & (sr < 21.6) & (a5 | a10), '#2a2629')
    P.flat(st & topf & (np.abs(sr - 17.6) < 0.25), '#2a2629')
    P.flat(st & topf & (np.abs(sa - 90) < 0.45) & (sr > 3.2) & (sr < 17.6), '#c43a2e')
    P.flat(st & ~topf, WHITE[2])
    P.lines(['white'], ['tail', 'black', 'red'], step=1)
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
