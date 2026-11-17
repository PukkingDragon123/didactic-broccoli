"""テープマイマイ Tape Snail: a weighted Shōwa tape cutter that is a snail (series henshin, concepts.md).

The roll of amber tape is the shell (its wound layers are the shell's spiral), the heavy cutter base is the snail's
foot, the front of it rises into the head with the serrated cutter as its lip, and the eye-stalks telescope out of
the head. Rest pose: the snail, stalks up. Gimmick: the stalks pull in and the head ducks back (a tape cutter), the
roll spins out a length of tape and the head nods to cut it, then the stalks pop out one after the other and wave.

    tools/blender.sh art/blender/toys/henshin/maimai.py [--preview] [--fold] [--fast] [--repaint]
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
F = Fig('henshin', 'maimai')

ROLL = (0, 6.0, 19.0)   # the roll's centre (axis x)
RO, RI = 13.6, 8.2      # tape outer radius, core radius
RW = 12.0               # roll width


# ------------------------------------------------------------------ the foot: the heavy cutter base
def foot_rings():
    R = [(-21.0, 9.0, 2.2, 2.6, 2.4), (-17.0, 14.5, 3.0, 3.0, 2.8), (-10.0, 18.0, 3.6, 3.2, 3.2), (0.0, 20.0, 4.2, 3.3, 3.4),
         (10.0, 20.5, 4.6, 3.3, 3.4), (18.0, 19.0, 4.4, 3.2, 3.2), (24.0, 14.0, 3.4, 2.9, 2.8), (27.5, 7.0, 2.0, 2.2, 2.4)]
    return [{'c': (0, y, 3.3 + (0.6 if y > 20 else 0)), 'w': w, 'ht': ht, 'hb': hb, 'e': e} for y, w, ht, hb, e in R]


def sculpt_foot(h):
    def f(V, N):
        side = tk.smoothstep(0.5, 0.95, np.abs(N[:, 0]))
        # the snail's frilly skirt: a soft ripple along the lower edge of the foot
        frill = 0.32 * side * np.sin(V[:, 1] * 1.25) * tk.smoothstep(4.0, 1.5, V[:, 2])
        # a crisp moulding line round the base (the weighted cutter's parting line)
        mould = -0.22 * side * tk.smoothstep(0.35, 0.0, np.abs(V[:, 2] - 4.2))
        return frill + mould
    tk.push(h, f)


cage = tk.loft('foot', foot_rings(), n=16, cap0='round', cap1='round')
# the cradle: two side cheeks cast with the base, rising round the spindle (a weighted cutter's side walls)
cheeks = []
for sx in (1, -1):
    out = [(ROLL[1] - 12.5, 3.0), (ROLL[1] + 12.5, 3.0), (ROLL[1] + 10.5, 6.5)]
    for i in range(9):
        a = math.radians(-20 + 220 * i / 8)
        out.append((ROLL[1] + 5.2 * math.cos(a), ROLL[2] + 5.2 * math.sin(a)))
    out.append((ROLL[1] - 10.5, 6.5))
    ch = tk.slab('cheek', out, 2.4, plane='YZ', at=sx * (RW / 2 + 1.25), bevel=0.9, segs=1)
    tk.subsurf(ch, 1)
    cheeks.append(ch)
foot_lo, foot_hi = tk.lowhigh(cage, 'foot', lo=1, hi=3, tris=230, sculpt=sculpt_foot, region=(
    'body', [('sole', lambda C, N: N[:, 2] < -0.5)]))
ch_lo, ch_hi = [], []
for ch in cheeks:
    lo, hi = tk.lowhigh(ch, 'cheek', lo=0, hi=2, tris=70, region='body')
    ch_lo.append(lo)
    ch_hi.append(hi)
spindle = tk.cyl('spindle', 3.2, -RW / 2 - 3.4, RW / 2 + 3.4, n=16, at=(ROLL[1], ROLL[2]), axis='X', bevel=0.5, segs=2)
sp_lo, sp_hi = tk.lowhigh(spindle, 'spindle', lo=0, hi=1, region='hub')
tk.decimate(sp_lo, 60)

# ------------------------------------------------------------------ the head: neck, cheeks, the cutter lip
NECK = (0, -14.0, 5.0)


def head_rings():
    R = [((0, -12.0, 4.6), 13.0, 4.0, 2.8), ((0, -16.5, 6.4), 12.6, 4.8, 3.0), ((0, -20.0, 9.4), 12.4, 5.4, 3.0),
         ((0, -22.6, 13.0), 12.0, 5.6, 2.8), ((0, -24.0, 16.4), 10.4, 5.0, 2.6)]
    return [{'c': c, 'w': w, 'h': h, 'e': e} for c, w, h, e in R]


def sculpt_head(h):
    def f(V, N):
        # a soft brow over where the eye-stalks come out, a smile crease above the cutter, a chin
        brow = tk.bump(V, (0, -24.6, 17.0), 5.0, 0.6, sharp=1.5)
        smile = -0.3 * tk.smoothstep(0.5, 0.0, np.abs(V[:, 2] - (10.2 - 0.02 * V[:, 0] ** 2))) * (V[:, 1] < -24.0)
        sockets = sum(-tk.bump(V, (sx * 3.0, -24.4, 19.4), 1.9, 0.7) for sx in (1, -1))
        return brow + smile + sockets
    tk.push(h, f)


cage = tk.loft('head', head_rings(), n=14, up=(0, -1, 0.35), cap0='round', cap1='round')
head_lo, head_hi = tk.lowhigh(cage, 'head', lo=1, hi=3, tris=170, sculpt=sculpt_head, region='body')
# the serrated cutter: a chrome blade under the head, teeth pointing down and forward (the lip)
pts = [(-6.0, 0.0)]
for i in range(12):
    x0 = -6.0 + i
    pts += [(x0 + 0.5, -1.1), (x0 + 1.0, 0.0)]
pts += [(6.0, 1.8), (-6.0, 1.8)]
blade_hi = tk.slab('blade_hi', [(x, z) for x, z in pts], 0.6, plane='XZ', at=0, bevel=0.12, segs=1)
blade_lo = tk.slab('blade', [(-6.0, -1.1), (6.0, -1.1), (6.0, 1.8), (-6.0, 1.8)], 0.6, plane='XZ', at=0, bevel=0, segs=0)
for b in (blade_hi, blade_lo):
    tk.rotate(b, -30, 'X')
    tk.move(b, (0, -25.6, 8.6))
tk.set_region(blade_hi, 'chrome')

# ------------------------------------------------------------------ the shell: the tape roll on its core
roll = tk.lathe('roll', [(RI - 1.4, -RW / 2 + 0.2), (RO - 0.6, -RW / 2), (RO, -RW / 2 + 0.6), (RO + 0.15, 0), (RO, RW / 2 - 0.6),
                         (RO - 0.6, RW / 2), (RI - 1.4, RW / 2 - 0.2), (RI - 1.6, 0)], n=28, axis='X', centre=ROLL)
roll_lo, roll_hi = tk.lowhigh(roll, 'roll', lo=0, hi=2, region=(
    'tape', [('core', lambda C, N: np.linalg.norm(C[:, 1:] - np.array(ROLL[1:]), axis=1) < RI + 0.4)]))
tk.decimate(roll_lo, 200)


def sculpt_roll(h):
    # the wound layers: fine concentric ridges on the sides of the roll (the snail's growth lines)
    def f(V, N):
        side = tk.smoothstep(0.6, 0.95, np.abs(N[:, 0]))
        r = np.linalg.norm(V[:, 1:] - np.array(ROLL[1:]), axis=1)
        th = np.arctan2(V[:, 2] - ROLL[2], V[:, 1] - ROLL[1])
        spiral = np.sin((r + th / (2 * math.pi) * 1.9) * 2 * math.pi / 1.9)
        return 0.12 * side * spiral * (r > RI + 0.2)
    tk.push(h, f)


sculpt_roll(roll_hi)

# ------------------------------------------------------------------ eye-stalks (two telescoping segments) and feelers
STALK = {}
for sx, nm in ((1, 'l'), (-1, 'r')):
    base = np.array((sx * 3.0, -24.4, 18.6))
    tipdir = np.array((sx * 0.42, -0.42, 1.0))
    tipdir /= np.linalg.norm(tipdir)
    a = base + tipdir * 7.2
    b = a + tipdir * 6.2
    s1 = tk.tube('stalk_' + nm + '1', [tuple(base - tipdir * 1.0), tuple(base + tipdir * 3.0), tuple(a + tipdir * 0.6)], [1.55, 1.4, 1.25], n=8,
                 cap0='round', cap1='round')
    s2 = tk.tube('stalk_' + nm + '2', [tuple(a - tipdir * 1.2), tuple(a + tipdir * 3.0), tuple(b)], [1.05, 0.95, 0.9], n=8,
                 cap0='round', cap1='flat')
    ball = tk.lathe('eyeball_' + nm, [(0, -1.6), (2.1, -0.9), (2.55, 0.4), (1.9, 1.7), (0, 2.25)], n=12, axis='Z', centre=tuple(b + tipdir * 0.9))
    q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(tipdir)))
    c = Vector(tuple(b + tipdir * 0.9))
    tk.transform(ball, __import__('mathutils').Matrix.Translation(c) @ q.to_matrix().to_4x4() @ __import__('mathutils').Matrix.Translation(-c))
    l1, h1 = tk.lowhigh(s1, 'stalk_' + nm + '1', lo=1, hi=3, tris=40, region='body')
    l2, h2 = tk.lowhigh(s2, 'stalk_' + nm + '2', lo=1, hi=3, tris=32, region='body')
    lb, hb = tk.lowhigh(ball, 'eyeball_' + nm, lo=1, hi=2, tris=48, region='eyeball')
    STALK[nm] = dict(l1=l1, h1=h1, l2=tk.join([l2, lb], 'stalk_' + nm + '2'), h2=[h2, hb], base=tuple(base), a=tuple(a), dir=tipdir,
                     eye=tuple(b + tipdir * 0.9))
FEEL = {}
for sx, nm in ((1, 'l'), (-1, 'r')):
    base = np.array((sx * 4.2, -26.0, 12.6))
    d = np.array((sx * 0.55, -1.0, -0.25))
    d /= np.linalg.norm(d)
    t = tk.tube('feeler_' + nm, [tuple(base - d * 1.0), tuple(base + d * 1.8), tuple(base + d * 3.6)], [1.1, 0.9, 0.75], n=8, cap0='round', cap1='round')
    lo, hi = tk.lowhigh(t, 'feeler_' + nm, lo=1, hi=3, tris=32, region='body')
    FEEL[nm] = (lo, hi, tuple(base), d)

# ------------------------------------------------------------------ parts
F.part('foot', tk.join([foot_lo] + ch_lo, 'foot'), [foot_hi] + ch_hi, bone='root')
F.part('spindle', sp_lo, [sp_hi], bone='root', uvw=0.6)
F.part('head', head_lo, [head_hi], bone='head')
F.part('blade', blade_lo, [blade_hi], bone='head', kind='metal', sharp=40, uvw=0.7)
F.part('roll', roll_lo, [roll_hi], bone='roll', kind='gloss')
for nm, S in STALK.items():
    F.part('stalk_' + nm + '1', S['l1'], [S['h1']], bone='stalk_' + nm + '1')
    F.part('stalk_' + nm + '2', S['l2'], S['h2'], bone='stalk_' + nm + '2')
for nm, (lo, hi, base, d) in FEEL.items():
    F.part('feeler_' + nm, lo, [hi], bone='feeler_' + nm)
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
OUT = os.path.join(F.out, F.id)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 4))
    R.bone('roll', ROLL, parent='root')
    R.bone('head', NECK, parent='root')
    for nm, S in STALK.items():
        R.bone('stalk_' + nm + '1', S['base'], parent='head')
        R.bone('stalk_' + nm + '2', S['a'], parent='stalk_' + nm + '1')
    for nm, (lo, hi, base, d) in FEEL.items():
        R.bone('feeler_' + nm, base, parent='head')
    for p in F.parts:
        R.attach(p.low, p.bone)
    st = {nm: S['dir'] for nm, S in STALK.items()}
    with R.action('gimmick'):
        k = R.key
        bones = ['root', 'roll', 'head', 'stalk_l1', 'stalk_l2', 'stalk_r1', 'stalk_r2', 'feeler_l', 'feeler_r']
        for b in bones:
            k(b, 0)
        # 0-12 the stalks pull in (tips first), the feelers tuck, the head ducks back: a tape cutter
        for nm, d in st.items():
            k('stalk_' + nm + '2', 2)
            k('stalk_' + nm + '2', 7, move=tuple(-d * 6.4))
            k('stalk_' + nm + '1', 5)
            k('stalk_' + nm + '1', 11, move=tuple(-d * 7.6))
        for nm, (lo, hi, base, d) in FEEL.items():
            k('feeler_' + nm, 4)
            k('feeler_' + nm, 9, move=tuple(-np.array(d) * 3.4))
        k('head', 6)
        k('head', 12, move=(0, 2.4, -0.6), rot=('X', -4))
        # 14-40 the roll spins out tape, the head nods to cut it ('pishi')
        k('roll', 14)
        k('roll', 34, rot=('X', -540))
        k('head', 34, move=(0, 2.4, -0.6), rot=('X', -4))
        k('head', 37, move=(0, 2.4, -1.2), rot=('X', 8))
        k('head', 40, move=(0, 2.4, -0.6), rot=('X', -4))
        k('root', 34)
        k('root', 37, move=(0, 0, -0.5))
        k('root', 40)
        for nm, d in st.items():
            k('stalk_' + nm + '1', 44, move=tuple(-d * 7.6))
            k('stalk_' + nm + '2', 44, move=tuple(-d * 6.4))
        for nm, (lo, hi, base, d) in FEEL.items():
            k('feeler_' + nm, 44, move=tuple(-np.array(d) * 3.4))
        k('head', 44, move=(0, 2.4, -0.6), rot=('X', -4))
        # 44-60 out again: the head stretches, one stalk then the other pops up, the feelers poke out
        k('head', 50, move=(0, -0.8, 0.3), rot=('X', 3), ease='BACK')
        k('head', 56, move=(0, 0, 0))
        k('stalk_l1', 49, move=(0, 0, 0), ease='BACK')
        k('stalk_l2', 52, move=(0, 0, 0), ease='BACK')
        k('stalk_r1', 52, move=(0, 0, 0), ease='BACK')
        k('stalk_r2', 55, move=(0, 0, 0), ease='BACK')
        for nm in FEEL:
            k('feeler_' + nm, 51, move=(0, 0, 0), ease='BACK')
        # 56-90 the stalks look about: a wave each, out of step
        for nm, sx in (('l', 1), ('r', -1)):
            off = 0 if nm == 'l' else 4
            k('stalk_' + nm + '1', 58 + off, rot=('Y', sx * 12))
            k('stalk_' + nm + '1', 66 + off, rot=('Y', -sx * 8))
            k('stalk_' + nm + '1', 74 + off, rot=('X', 8))
            k('stalk_' + nm + '1', 84, rot=('X', 0))
            k('stalk_' + nm + '2', 60 + off, rot=('Y', sx * 14))
            k('stalk_' + nm + '2', 69 + off, rot=('Y', -sx * 10))
            k('stalk_' + nm + '2', 84)
        for b in bones:
            k(b, 90)
    return R


if '--preview' in ARGS or '--fold' in ARGS:
    lows = [p.low for p in F.parts]
    highs = [h for p in F.parts for h in p.highs]
    if '--fold' in ARGS:
        import bpy
        R = make_rig()
        R.arm.animation_data.action = bpy.data.actions['gimmick']
        for i, fr in enumerate((0, 24, 52, 64)):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=((70, -76, 52), (0, -2, 16)), lens=50)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=((70, -76, 52), (0, -2, 16)), lens=50)
    tk.preview(OUT + '_p2.png', highs, cam=((-70, 62, 46), (0, 0, 16)), lens=50)
    tk.preview(OUT + '_p3.png', lows, cam=((70, -76, 52), (0, -2, 16)), lens=50)
    tk.preview(OUT + '_p4.png', highs, cam=((110, -10, 18), (0, -2, 16)), lens=55)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=6.0, reuse='--repaint' in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.42, ao=0.85, cav=1.1)
    top = np.clip(on[:, :, 2], 0, 1)
    TEAL = pt.ramp('#4a8a90', 7, shift=0.07)
    # factory airbrush: the body darkens to the sole, the head and stalks paler toward the top
    air = -0.3 * tk.smoothstep(4.0, 0.5, Z) + 0.15 * tk.smoothstep(12, 26, Z)
    P.fill('body', TEAL, tone=sh, base=air)
    P.fill('sole', pt.ramp('#2f5f68', 6, shift=0.06), tone=sh, base=0.0)
    # the shell: amber tape wound into a spiral (bands a tone apart), glossy; the cardboard core
    AMBER = pt.ramp('#e2a23c', 7, shift=0.08)
    r = np.linalg.norm(np.stack([Yc - ROLL[1], Z - ROLL[2]], 2), axis=2)
    th = np.arctan2(Z - ROLL[2], Yc - ROLL[1])
    turn = (r - RI) / 2.3 + th / (2 * math.pi)
    band = np.where((np.mod(turn, 1.0) < 0.5), 0.12, -0.12)
    side = np.abs(on[:, :, 0]) > 0.6
    shr = P.shade(light=0.0, ao=0.85, cav=1.1)  # (the roll spins: no painted key light on it, only its own shadows)
    P.fill('tape', AMBER, tone=shr, base=0.12 + band * side)
    seam = P.region('tape') & side & (np.abs(np.mod(turn, 1.0) - 0.5) < 0.075) & (r > RI + 0.6)
    P.tint(seam, AMBER, shr - 0.75)
    P.fill('core', pt.ramp('#b98a56', 6, shift=0.06), tone=shr, base=0.0)
    P.fill('hub', pt.ramp('#efe2c0', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('chrome', pt.ramp('#b3bbc4', 7, dark=0.75, light=0.75, shift=0.05), tone=sh * 1.5, base=0.1)
    # eyes on the stalk tips: big glossy black beads with a catchlight, looking forward
    P.fill('eyeball', pt.ramp('#211c1f', 5, shift=0.05, light=0.3), tone=sh, base=0.0)
    for nm, S in STALK.items():
        e = np.array(S['eye'])
        look = np.array((0, -1.0, 0.25))
        look /= np.linalg.norm(look)
        P.eye(tuple(e + look * 2.0), tuple(look), 1.75, iris='#2a2225', pupil='#120e10', ring='#120e10', where=P.region('eyeball'),
              facing=-0.2)
    # a printed smile above the cutter and two blush dots
    for sx in (1, -1):
        P.flat(P.ellipse((sx * 4.6, -25.2, 12.6), (sx * 0.5, -1, 0.2), 1.2, 0.8) & P.region('body'), '#e88a86')
    P.lines(['body'], ['tape', 'core', 'hub', 'eyeball', 'chrome'], step=2)
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
