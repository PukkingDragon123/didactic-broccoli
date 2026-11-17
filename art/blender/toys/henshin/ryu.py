"""万年筆リュウ Fountain-Pen Dragon (secret): a vermilion urushi fountain pen that is a dragon (series henshin).

The pen's barrel parts into jointed rings that coil like a dragon's body, the gold nib is its snout and upper jaw,
the black comb feed under it its lower jaw, the cap is the tail with the gold clip for a tail fin, gold claws fold
out from between the rings and two gold horns flip up behind its head. Rest pose: the dragon rearing in an S.
Gimmick: it straightens and lies down as a fountain pen, rolls a quarter turn, then coils back up, ripples nose to
tail and opens its jaws.

    tools/blender.sh art/blender/toys/henshin/ryu.py [--preview] [--fold] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
from fig import Fig  # noqa: E402
from mathutils import Matrix, Quaternion, Vector  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('henshin', 'ryu')

R0 = 4.6        # barrel radius
ZP = 5.4        # the pen's axis height when it lies on the desk (the cap's clip keeps it from rolling)
# joints along the straight pen (front = -y): head | seg1 | seg2 | seg3 | seg4 | tail (the cap)
J = [-20.0, -12.0, -4.0, 4.0, 12.0]
SEGS = [('seg1', J[0], J[1]), ('seg2', J[1], J[2]), ('seg3', J[2], J[3]), ('seg4', J[3], J[4])]


def ring_seg(nm, y0, y1, r0, r1):
    """A barrel ring: a lacquer tube with a gold band at its front joint (sleeved a little into the ring before it)."""
    prof = [(0, y0 - 0.6), (r0 * 0.86, y0 - 0.6), (r0 * 0.98, y0 + 0.4), (r0, y0 + 1.6), ((r0 + r1) / 2 * 1.02, (y0 + y1) / 2),
            (r1 * 0.99, y1 - 0.6), (r1 * 0.9, y1 + 0.4), (0, y1 + 0.4)]
    body = tk.lathe(nm, [(r, y) for r, y in prof], n=14, axis='Y', centre=(0, 0, ZP))
    band = tk.lathe(nm + '_band', [(r0 * 1.0, y0 - 0.2), (r0 * 1.07, y0 + 0.1), (r0 * 1.07, y0 + 1.3), (r0 * 1.0, y0 + 1.6), (r0 * 0.94, y0 + 0.7)],
                    n=14, axis='Y', centre=(0, 0, ZP))
    # (lathe 'Y' maps the profile's z to +y about the centre: give positions relative to it)
    return body, band


def lathe_y(nm, prof, n=14):
    """A turned part along the pen's axis: prof = [(r, y), ...] in figure y."""
    ob = tk.lathe(nm, [(r, y) for r, y in prof], n=n, axis='Y', centre=(0, 0, ZP))
    return ob


PARTS = {}
# the barrel rings, thinning a little toward the tail
radii = [4.4, 4.7, 4.8, 4.6, 4.3]
for i, (nm, y0, y1) in enumerate(SEGS):
    body, band = ring_seg(nm, y0, y1, radii[i], radii[i + 1])

    def scales(h, y0=y0, y1=y1):
        def f(V, N):  # a dragon's scales pressed into the lacquer (rows of overlapping arcs along the top)
            a = np.arctan2(V[:, 0], V[:, 2] - ZP)
            u = a * 4.6 / math.pi
            v = (V[:, 1] - y0) / 2.2 + 0.5 * (np.floor(u) % 2)
            fu, fv = u - np.floor(u) - 0.5, v - np.floor(v)
            arc = np.clip(1 - np.hypot(fu * 1.6, fv * 1.3), 0, 1)
            top = tk.smoothstep(-0.2, 0.6, (V[:, 2] - ZP) / R0)
            return 0.16 * arc * top * (V[:, 1] > y0 + 1.6) * (V[:, 1] < y1 - 0.6)
        tk.push(h, f)
    lo, hi = tk.lowhigh(body, nm, lo=0, hi=2, sculpt=scales, region=('red', [('belly', lambda C, N: N[:, 2] < -0.55)]))
    blo, bhi = tk.lowhigh(band, nm + '_band', lo=0, hi=2, region='gold')
    tk.decimate(lo, 100)
    tk.decimate(blo, 48)
    PARTS[nm] = ([lo, blo], [hi, bhi])

# the tail: the cap, its gold band and finial, and the clip as the tail fin
cap = lathe_y('tail', [(0, J[4] - 0.6), (4.0, J[4] - 0.6), (4.4, J[4] + 0.6), (4.5, J[4] + 4.0), (4.3, J[4] + 12.0), (3.6, J[4] + 16.4),
                       (2.4, J[4] + 18.2), (0, J[4] + 18.6)])
capband = lathe_y('tail_band', [(4.3, J[4] - 0.2), (4.75, J[4] + 0.2), (4.75, J[4] + 2.6), (4.3, J[4] + 3.0), (4.1, J[4] + 1.4)])
fin = lathe_y('tail_fin', [(0, J[4] + 18.2), (2.0, J[4] + 18.0), (2.2, J[4] + 19.4), (1.2, J[4] + 20.6), (0, J[4] + 20.8)], n=12)
clip_out = [(J[4] + 2.0, 0.0), (J[4] + 15.5, 0.0), (J[4] + 17.0, 1.6), (J[4] + 15.0, 3.2), (J[4] + 11.0, 3.6), (J[4] + 6.0, 2.2), (J[4] + 2.0, 2.0)]
clip = tk.slab('tail_clip', clip_out, 1.8, plane='YZ', at=0, bevel=0.4, segs=1)
tk.move(clip, (0, 0, ZP + 4.0))
lows, highs = [], []
for o, reg, tri in ((cap, 'red', 100), (capband, 'gold', 44), (fin, 'gold', 30), (clip, 'gold', 40)):
    lo, hi = tk.lowhigh(o, o.name, lo=0, hi=2, region=reg)
    tk.decimate(lo, tri)
    lows.append(lo)
    highs.append(hi)
PARTS['tail'] = (lows, highs)

# the head: the black grip section, the gold nib (snout, upper jaw) and the comb feed (lower jaw), eyes, horns
# the grip section carved into a dragon's head: a broad brow and cheeks, a long snout, flared nostrils
sect = tk.loft('head', [{'c': (0, y, ZP + dz), 'w': w, 'ht': ht, 'hb': hb, 'e': e}
                        for y, w, ht, hb, dz, e in ((J[0] + 0.6, 8.2, 4.0, 3.8, 0.0, 2.2), (J[0] - 1.6, 10.2, 4.6, 3.9, 0.3, 2.4),
                                                    (J[0] - 4.6, 9.4, 4.0, 3.3, 0.3, 2.6), (J[0] - 7.6, 7.0, 2.9, 2.4, -0.1, 2.8),
                                                    (J[0] - 10.0, 6.6, 2.6, 2.0, -0.2, 2.8), (J[0] - 11.4, 5.0, 1.9, 1.5, -0.3, 2.6))],
               n=14, cap0='round', cap1='round')


def sculpt_sect(h):
    def f(V, N):
        d = 0.0
        for sx in (1, -1):
            d = d + tk.bump(V, (sx * 3.0, J[0] - 3.4, ZP + 4.2), 2.6, 0.9)    # brow ridges over the eyes
            d = d + tk.bump(V, (sx * 4.6, J[0] - 2.2, ZP - 0.4), 3.0, 0.6)    # cheeks
            d = d + tk.bump(V, (sx * 2.0, J[0] - 10.8, ZP + 1.4), 1.3, 0.55)  # nostril flares
            d = d - tk.bump(V, (sx * 2.0, J[0] - 11.3, ZP + 1.3), 0.6, 0.5)   # the nostrils
        grip = -0.12 * (np.abs(np.sin(V[:, 1] * 3.2)) ** 6) * (V[:, 2] < ZP - 1)  # the grip's rings under the jaw
        return d + grip
    tk.push(h, f)


s_lo, s_hi = tk.lowhigh(sect, 'head', lo=1, hi=3, sculpt=sculpt_sect, region='black')
tk.decimate(s_lo, 140)
NIB0 = (0, J[0] - 6.0, ZP + 2.4)
nib_out = [(-3.0, 0.0), (3.0, 0.0), (2.6, -3.0), (1.4, -6.0), (0.0, -7.4), (-1.4, -6.0), (-2.6, -3.0)]
nib_hi = tk.slab('nib_hi', nib_out, 0.7, plane='XY', at=0, bevel=0.2, segs=2)
nib_lo = tk.slab('nib', nib_out, 0.7, plane='XY', at=0, bevel=0, segs=0)
for n_ in (nib_hi, nib_lo):  # curved like a nib (a shallow arch across), set on the section, pointing forward and down a touch
    tk.deform(n_, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], -0.16 * V[:, 0] ** 2], 1))
    tk.rotate(n_, 8, 'X')
    tk.move(n_, (0, NIB0[1], NIB0[2] + 0.6))
tk.boolean(nib_hi, tk.cyl('breather', 0.55, NIB0[2] - 3, NIB0[2] + 3, n=10, at=(0, NIB0[1] - 2.4), axis='Z', bevel=0.1, segs=1))
tk.set_region(nib_hi, 'gold')
feed_out = [(-2.0, 0.0), (2.0, 0.0), (1.4, -6.0), (0.4, -8.4), (-0.4, -8.4), (-1.4, -6.0)]
feed_hi = tk.slab('feed_hi', feed_out, 1.6, plane='XY', at=0, bevel=0.3, segs=2)
feed_lo = tk.slab('jaw', feed_out, 1.6, plane='XY', at=0, bevel=0, segs=0)
for f_ in (feed_hi, feed_lo):
    tk.move(f_, (0, J[0] - 4.4, ZP - 2.6))
# the feed's comb fins (a dragon's lower teeth)
for i in range(5):
    tk.boolean(feed_hi, tk.rbox('comb', (5.0, 0.35, 0.8), centre=(0, J[0] - 5.6 - i * 1.1, ZP - 3.4), bevel=0.05, segs=1))
tk.set_region(feed_hi, 'feed')
HORN = {}
for sx, nm in ((1, 'horn_l'), (-1, 'horn_r')):  # gold antlers: a sweeping beam with one tine
    base = (sx * 2.6, J[0] - 1.2, ZP + 3.6)
    beam = [base, (sx * 3.4, J[0] + 1.0, ZP + 6.2), (sx * 4.4, J[0] + 4.0, ZP + 8.0), (sx * 4.8, J[0] + 7.4, ZP + 8.6)]
    tine = [(sx * 3.5, J[0] + 1.6, ZP + 6.6), (sx * 3.4, J[0] + 1.4, ZP + 9.2), (sx * 3.0, J[0] + 2.4, ZP + 10.6)]
    lows, highs = [], []
    for nm2, pts, rr in ((nm, beam, [1.0, 0.8, 0.55, 0.1]), (nm + '_tine', tine, [0.55, 0.4, 0.08])):
        lo = tk.tube(nm2, pts, rr, n=6, cap0='round', cap1='point')
        hi = tk.tube(nm2 + '_hi', pts, rr, n=10, cap0='round', cap1='point')
        tk.subsurf(hi, 2)
        tk.set_region(hi, 'gold')
        tk.subsurf(lo, 1)
        tk.decimate(lo, 30 if nm2 == nm else 16)
        lows.append(lo)
        highs.append(hi)
    HORN[nm] = (tk.join(lows, nm), highs, base)
WHISK = []
for sx in (1, -1):  # long gold whiskers curling back from the snout
    pts = [(sx * 2.6, J[0] - 9.8, ZP + 0.4), (sx * 5.0, J[0] - 9.6, ZP + 0.2), (sx * 8.0, J[0] - 7.6, ZP + 1.2), (sx * 10.2, J[0] - 4.0, ZP + 3.0),
           (sx * 10.6, J[0] - 0.6, ZP + 5.0), (sx * 9.4, J[0] + 1.4, ZP + 6.4)]
    lo = tk.tube('whisk', pts, [0.5, 0.42, 0.36, 0.3, 0.24, 0.06], n=5, cap0='round', cap1='point')
    hi = tk.tube('whisk_hi', pts, [0.5, 0.42, 0.36, 0.3, 0.24, 0.06], n=8, cap0='round', cap1='point')
    tk.subsurf(hi, 2)
    tk.set_region(hi, 'gold')
    tk.decimate(lo, 46)
    WHISK.append((lo, hi))
PARTS['head'] = ([s_lo, nib_lo] + [w[0] for w in WHISK], [s_hi, nib_hi] + [w[1] for w in WHISK])


# ------------------------------------------------------------------ the dragon pose: each ring turned at its joint
# (relative turns of each piece at its joint, in its parent's frame; seg2 is the root that stays put)
CHAIN = {'seg1': ('seg2', J[1], [('X', -34), ('Z', -22)]), 'head': ('seg1', J[0], [('X', 36), ('Z', 14)]),
         'seg3': ('seg2', J[2], [('X', 8), ('Z', 34)]), 'seg4': ('seg3', J[3], [('X', -4), ('Z', 40)]),
         'tail': ('seg4', J[4], [('X', -16), ('Z', 38)])}


def Q(rots):
    q = Quaternion()
    for ax, deg in rots:
        q = Quaternion({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[ax], math.radians(deg)) @ q
    return q


WORLD = {'seg2': Matrix.Identity(4)}


def world(nm):
    if nm not in WORLD:
        par, y, rots = CHAIN[nm]
        q = Q(rots)
        # the front chain turns about the joint at its back end (sign: seg1/head lie in front of their joint)
        P = Vector((0, y, ZP))
        WORLD[nm] = world(par) @ Matrix.Translation(P) @ q.to_matrix().to_4x4() @ Matrix.Translation(-P)
    return WORLD[nm]


LIFT = Matrix.Translation((0, 0, 3.4))  # the coiled dragon stands up off the desk on its claws


def posed(nm, p):
    return tuple(LIFT @ world(nm) @ Vector(p))
for nm, (lows, highs) in PARTS.items():
    M = LIFT @ world(nm)
    for o in lows + highs:
        tk.transform(o, M)
for nm, (lo, hi, base) in HORN.items():
    M = LIFT @ world('head')
    for o in [lo] + hi:
        tk.transform(o, M)


# legs: four gold claws, reaching from under the posed rings down to the desk (built in the pose)
def claw(nm, sx, seg, y):
    c = Vector(posed(seg, (sx * 3.4, y, ZP - 1.4)))
    f = Vector((c.x + sx * 3.6, c.y - 1.8, 0.9))
    k = (c + f) / 2 + Vector((sx * 1.6, 0.6, 1.0))
    pieces = [tk.tube(nm, [tuple(c), tuple(k), tuple(f)], [1.7, 1.35, 1.0], n=6, cap0='round', cap1='round')]
    for a in (-35, 0, 35):
        d = np.array((math.sin(math.radians(a)) * sx * 0.8, -math.cos(math.radians(a)), -0.1))
        p0 = np.array(f)
        pieces.append(tk.tube(nm + f'_t{a}', [tuple(p0), tuple(p0 + d * 1.7), tuple(p0 + d * 3.0 + np.array((0, 0, -0.6)))], [0.55, 0.42, 0.06], n=5,
                              cap0='round', cap1='point'))
    lows, highs = [], []
    for i, p in enumerate(pieces):
        lo, hi = tk.lowhigh(p, p.name, lo=0 if i else 1, hi=2, region='gold')
        tk.decimate(lo, 34 if i == 0 else 10)
        lows.append(lo)
        highs.append(hi)
    return tk.join(lows, nm), highs, tuple(c), tuple(f - c)


CLAWS = {}
for nm, sx, y, seg in (('claw_fl', 1, -16.0, 'seg1'), ('claw_fr', -1, -16.0, 'seg1'), ('claw_bl', 1, 0.0, 'seg3'), ('claw_br', -1, 0.0, 'seg3')):
    lo, hi, c, d = claw(nm, sx, seg, y)
    CLAWS[nm] = (lo, hi, c, seg, d)
for o in (feed_lo, feed_hi):
    tk.transform(o, LIFT @ world('head'))

# ------------------------------------------------------------------ parts
for nm in ('seg2', 'seg1', 'seg3', 'seg4', 'tail'):
    lows, highs = PARTS[nm]
    F.part(nm, tk.join(lows, nm), highs, bone=nm, kind='gloss')
lows, highs = PARTS['head']
F.part('head', tk.join(lows, 'head'), highs, bone='head', kind='gloss')
F.part('jaw', feed_lo, [feed_hi], bone='jaw', kind='gloss')
for nm, (lo, hi, base) in HORN.items():
    F.part(nm, lo, hi, bone=nm, kind='metal')
for nm, (lo, hi, c, seg, d) in CLAWS.items():
    F.part(nm, lo, hi, bone=nm, kind='metal')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
OUT = os.path.join(F.out, F.id)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', posed('seg2', (0, 0, ZP)))
    R.bone('seg2', posed('seg2', (0, (J[1] + J[2]) / 2, ZP)), parent='root')
    R.bone('seg1', posed('seg1', (0, J[1], ZP)), parent='seg2')
    R.bone('head', posed('head', (0, J[0], ZP)), parent='seg1')
    R.bone('jaw', posed('head', (0, NIB0[1] + 0.4, NIB0[2] - 0.2)), parent='head')
    R.bone('seg3', posed('seg3', (0, J[2], ZP)), parent='seg2')
    R.bone('seg4', posed('seg4', (0, J[3], ZP)), parent='seg3')
    R.bone('tail', posed('tail', (0, J[4], ZP)), parent='seg4')
    for nm, (lo, hi, base) in HORN.items():
        R.bone(nm, posed('head', base), parent='head')
    for nm, (lo, hi, c, seg, d) in CLAWS.items():
        R.bone(nm, c, parent=seg)
    for p in F.parts:
        R.attach(p.low, p.bone)
    # straightening a piece: undo its joint turn, expressed in figure axes at rest (rot(parent) Q^-1 rot(parent)^-1)
    straight = {}
    for nm, (par, y, rots) in CHAIN.items():
        Mp = world(par).to_quaternion()
        straight[nm] = Mp @ Q(rots).inverted() @ Mp.inverted()
    seq = ['seg1', 'head', 'seg3', 'seg4', 'tail']
    claws = {nm: (1 if nm.endswith('l') else -1) for nm in CLAWS}
    # a claw folds forward flat under the belly of the straight pen: its turn, given its ring is straightened too
    fold = {}
    for nm, (lo, hi, c, seg, d) in CLAWS.items():
        sx = claws[nm]
        qP = world(seg).to_quaternion().inverted()  # the ring's own straightening (figure axes)
        if seg == 'seg3':
            qP = world('seg3').to_quaternion().inverted()
        d0 = Vector(d)
        want = Vector((sx * 0.2, -1.0, -0.06)).normalized()
        qD = (qP @ d0).rotation_difference(want) @ qP  # rest direction -> straightened with the ring -> folded
        fold[nm] = qP.inverted() @ qD
    with R.action('gimmick'):
        k = R.key
        allb = ['root', 'seg2', 'jaw'] + seq + list(HORN) + list(claws)
        for b in allb:
            k(b, 0)
        # 0-16 it uncoils and lies down: a fountain pen on the desk; claws and horns fold flat
        for i, nm in enumerate(seq):
            k(nm, 2 + i)
            k(nm, 13 + i // 2, quat=straight[nm])
        for nm, sx in claws.items():
            k(nm, 3)
            k(nm, 10, quat=fold[nm])
        for nm in HORN:
            k(nm, 3)
            k(nm, 10, rot=('X', -60))
        k('root', 6)
        k('root', 16, move=(0, 0, -3.4), ease='BOUNCE')
        # 16-40 a pen: it rolls a quarter turn and back on the desk
        k('seg2', 20)
        k('seg2', 27, rot=('Y', 40))
        k('seg2', 34, rot=('Y', 0))
        for nm in seq:
            k(nm, 40, quat=straight[nm])
        for nm, sx in claws.items():
            k(nm, 40, quat=fold[nm])
        for nm in HORN:
            k(nm, 40, rot=('X', -60))
        k('root', 40, move=(0, 0, -3.4))
        # 40-60 it rears up and coils again (tail first, then the head), horns flick up, claws out
        k('root', 48, ease='BACK')
        for i, nm in enumerate(['tail', 'seg4', 'seg3', 'seg1', 'head']):
            k(nm, 44 + i * 2, ease='BACK')
        for nm in claws:
            k(nm, 47, ease='BACK')
        for nm in HORN:
            k(nm, 54, rot=('X', 12), ease='BACK')
            k(nm, 58)
        # 54-90 a ripple runs nose to tail; the jaws open in a roar
        for i, nm in enumerate(['head', 'seg1', 'seg3', 'seg4', 'tail']):
            t0 = 58 + i * 3
            k(nm, t0)
            k(nm, t0 + 4, rot=('Z', 10 * (1 if i % 2 else -1)))
            k(nm, t0 + 9, rot=('Z', -8 * (1 if i % 2 else -1)))
            k(nm, t0 + 14)
        k('jaw', 60)
        k('jaw', 64, rot=('X', 24), ease='BACK')
        k('jaw', 74, rot=('X', 24))
        k('jaw', 78)
        k('head', 62, rot=('X', -10))
        k('head', 76)
        for b in allb:
            k(b, 92)
    return R


if '--preview' in ARGS or '--fold' in ARGS:
    lows = [p.low for p in F.parts]
    highs = [h for p in F.parts for h in p.highs]
    if '--fold' in ARGS:
        import bpy
        R = make_rig()
        R.arm.animation_data.action = bpy.data.actions['gimmick']
        for i, fr in enumerate((0, 24, 50, 66)):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=((56, -62, 46), (0, -4, 12)), lens=50)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=((56, -62, 46), (0, -4, 12)), lens=50)
    tk.preview(OUT + '_p2.png', highs, cam=((-56, 58, 40), (0, -2, 12)), lens=50)
    tk.preview(OUT + '_p3.png', lows, cam=((56, -62, 46), (0, -4, 12)), lens=50)
    tk.preview(OUT + '_p4.png', highs, cam=((96, -4, 16), (0, -4, 12)), lens=50)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=5.0, reuse='--repaint' in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.5, ao=0.8, cav=1.2)
    RED = pt.ramp('#a8261d', 7, dark=0.55, light=0.4, shift=0.06)
    GOLD = pt.ramp('#d6a640', 7, dark=0.6, light=0.6, shift=0.08)
    P.fill('red', RED, tone=sh, base=0.0)
    P.fill('belly', pt.ramp('#7a1c18', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('gold', GOLD, tone=sh * 1.3, base=0.08)
    P.fill('black', pt.ramp('#25201f', 6, dark=0.4, light=0.45, shift=0.05), tone=sh, base=0.08)
    P.fill('feed', pt.ramp('#2c2624', 5, shift=0.04), tone=sh, base=0.0)
    # gold maki-e on the lacquer: the pressed scales picked out in gold, and cloud scrolls along the flanks
    red = P.region('red')
    scale_lines = red & (P.cav > 0.56)
    P.tint(scale_lines, GOLD, sh * 1.3 + 0.2)
    # (cloud scrolls: drawn in each ring's own frame so they ride with it)
    for p in F.parts:
        if p.name not in ('seg1', 'seg2', 'seg3', 'seg4', 'tail'):
            continue
        m = red & (P.part == [q.name for q in F.parts].index(p.name))
        if not m.any():
            continue
        Minv = (LIFT @ world(p.name)).inverted()
        Q = P.pos @ np.array(Minv.to_3x3()).T + np.array(Minv.translation)
        a = np.arctan2(Q[:, :, 0], Q[:, :, 2] - ZP)
        side = np.abs(np.abs(a) - math.pi / 2) < 0.75
        u, v = (Q[:, :, 1] % 9.0) - 4.5, (np.abs(a) - math.pi / 2) * R0
        rr = np.hypot(u - 1.2, v)
        th = np.arctan2(v, u - 1.2)
        swirl = np.abs(((rr - 0.35 * th) % 1.25) - 0.62) < 0.2
        P.tint(m & side & swirl & (rr < 3.2), GOLD, sh * 1.3 + 0.15)
    # the dragon's eyes on the grip: gold rings, red-amber eyes with a slit, glinting
    for sx in (1, -1):
        c = posed('head', (sx * 4.0, J[0] - 4.2, ZP + 2.6))
        ax = Vector(posed('head', (sx * 1.0, J[0] - 4.8, ZP + 0.5))) - Vector(posed('head', (0, J[0] - 4.2, ZP)))
        P.eye(c, tuple(ax.normalized()), 1.45, iris='#e8b030', slit=0.22, ring='#d6a640', pupil='#2a0f0c', where=P.region('black'), facing=0.0)
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
