"""万年筆リュウ Fountain-Pen Dragon (secret): a vermilion urushi fountain pen that is a dragon (series henshin).

The pen's barrel parts into six jointed lacquer rings that wind into a serpent's S, the grip section is a horned and
whiskered dragon's head with the gold nib on its snout and the black comb feed for a lower jaw, the cap is the tail and
its gold clip swings up into a flame. Four short gold claws fold out from under the rings. Rest pose: the dragon
winding along the desk, head raised, jaws open. Gimmick: it straightens into a fountain pen (whiskers and horns laid
flat in their grooves, claws in, jaw shut, the flame down as the clip), rolls a little on the desk, then winds back up
ring by ring, ripples nose to tail and roars.

    tools/blender.sh art/blender/toys/henshin/ryu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

R0 = 4.1        # barrel radius
ZP = 4.6        # the pen's axis height lying on the desk
# the straight pen along y (front = -y): head | s1 .. s6 | tail (the cap)
J = [-23.0, -16.2, -9.4, -2.6, 4.2, 11.0, 17.8]
SEGS = [f's{i + 1}' for i in range(6)]


def lathe_y(nm, prof, n=14):
    """A turned part along the pen's axis: prof = [(r, y), ...] in figure y."""
    return tk.lathe(nm, prof, n=n, axis='Y', centre=(0, 0, ZP))


PARTS = {}
for i, nm in enumerate(SEGS):
    y0, y1 = J[i], J[i + 1]
    r0, r1 = R0 * (1.0 - 0.02 * i), R0 * (1.0 - 0.02 * (i + 1))
    # a lacquer ring sleeved into the one before it, with a gold band at its front joint
    body = lathe_y(nm, [(0, y0 - 0.6), (r0 * 0.84, y0 - 0.6), (r0 * 0.97, y0 + 0.5), (r0, y0 + 1.6), ((r0 + r1) / 2 * 1.03, (y0 + y1) / 2),
                        (r1 * 0.99, y1 - 0.5), (r1 * 0.9, y1 + 0.3), (0, y1 + 0.3)], n=12)
    band = lathe_y(nm + '_band', [(r0 * 1.0, y0 - 0.1), (r0 * 1.08, y0 + 0.2), (r0 * 1.08, y0 + 1.2), (r0 * 1.0, y0 + 1.5), (r0 * 0.95, y0 + 0.7)], n=12)

    def scales(h, y0=y0, y1=y1):
        def f(V, N):  # overlapping scale arcs pressed into the lacquer on the back of each ring
            a = np.arctan2(V[:, 0], V[:, 2] - ZP)
            u = a * 4.2 / math.pi
            v = (V[:, 1] - y0) / 2.0 + 0.5 * (np.floor(u) % 2)
            fu, fv = u - np.floor(u) - 0.5, v - np.floor(v)
            arc = np.clip(1 - np.hypot(fu * 1.6, fv * 1.3), 0, 1)
            top = tk.smoothstep(-0.2, 0.6, (V[:, 2] - ZP) / R0)
            return 0.16 * arc * top * (V[:, 1] > y0 + 1.6) * (V[:, 1] < y1 - 0.6)
        tk.push(h, f)
    lo, hi = tk.lowhigh(body, nm, lo=0, hi=2, sculpt=scales, region=('red', [('belly', lambda C, N: N[:, 2] < -0.55)]))
    blo, bhi = tk.lowhigh(band, nm + '_band', lo=0, hi=2, region='gold')
    tk.decimate(lo, 72)
    tk.decimate(blo, 30)
    PARTS[nm] = ([lo, blo], [hi, bhi])

# the tail: the cap with its gold band and finial
cap = lathe_y('tail', [(0, J[6] - 0.6), (3.6, J[6] - 0.6), (4.0, J[6] + 0.6), (4.15, J[6] + 4.0), (3.9, J[6] + 12.0), (3.2, J[6] + 16.0),
                       (2.1, J[6] + 17.6), (0, J[6] + 18.0)], n=12)
capband = lathe_y('tail_band', [(3.9, J[6] - 0.2), (4.35, J[6] + 0.2), (4.35, J[6] + 2.4), (3.9, J[6] + 2.8), (3.7, J[6] + 1.3)], n=12)
fin = lathe_y('tail_fin', [(0, J[6] + 17.6), (1.8, J[6] + 17.4), (2.0, J[6] + 18.8), (1.1, J[6] + 19.8), (0, J[6] + 20.0)], n=10)
lows, highs = [], []
for o, reg, tri in ((cap, 'red', 90), (capband, 'gold', 36), (fin, 'gold', 26)):
    lo, hi = tk.lowhigh(o, o.name, lo=0, hi=2, region=reg)
    tk.decimate(lo, tri)
    lows.append(lo)
    highs.append(hi)
PARTS['tail'] = (lows, highs)

# the clip, a gold flame: it lies along the cap as a pen's clip and swings up as the dragon's tail fire
CLIP0 = (0, J[6] + 3.0, ZP + 4.2)   # its hinge on the cap band
flame = [(0.0, 0.0), (13.4, 0.0), (15.2, 0.9), (14.0, 1.6), (15.8, 2.8), (13.0, 2.7), (13.6, 4.2), (10.8, 3.2), (10.4, 4.6),
         (7.6, 3.0), (5.6, 2.6), (2.0, 2.4), (0.0, 1.8)]
flame = [(CLIP0[1] + u, CLIP0[2] + v - 1.2) for u, v in flame]
clip_hi = tk.slab('flame_hi', flame, 1.6, plane='YZ', at=0, bevel=0.45, segs=2)
clip_lo = tk.slab('flame', flame, 1.6, plane='YZ', at=0, bevel=0, segs=0)
tk.set_region(clip_hi, 'gold')


# the head: the grip section carved as a dragon's head; the nib on its snout, the feed its lower jaw
def head_rings():
    R = [(J[0] + 0.6, 8.0, 3.8, 3.6, 0.0, 2.2), (J[0] - 1.8, 10.2, 4.5, 3.8, 0.3, 2.4), (J[0] - 4.8, 9.6, 4.2, 3.0, 0.6, 2.6),
         (J[0] - 8.0, 7.2, 3.0, 2.0, 0.6, 2.8), (J[0] - 10.6, 6.6, 2.5, 1.6, 0.5, 2.8), (J[0] - 12.0, 5.0, 1.8, 1.2, 0.4, 2.6)]
    return [{'c': (0, y, ZP + dz), 'w': w, 'ht': ht, 'hb': hb, 'e': e} for y, w, ht, hb, dz, e in R]


EYE_C = {sx: (sx * 3.9, J[0] - 4.4, ZP + 2.5) for sx in (1, -1)}


def sculpt_head(h):
    def f(V, N):
        d = 0.0
        for sx in (1, -1):
            # brows sweeping back and up (a fierce frown), the eye socket under them, flared nostrils, cheek plates
            d = d + tk.bump(V, (sx * 3.0, J[0] - 5.4, ZP + 4.4), 2.2, 0.9) + tk.bump(V, (sx * 3.6, J[0] - 3.0, ZP + 4.9), 2.0, 0.7)
            d = d + tk.bump(V, (sx * 2.0, J[0] - 11.2, ZP + 2.1), 1.3, 0.6) - tk.bump(V, (sx * 2.0, J[0] - 11.8, ZP + 2.0), 0.6, 0.55)
            d = d + tk.bump(V, (sx * 4.7, J[0] - 2.0, ZP - 1.0), 2.4, 0.6)
        grip = -0.12 * (np.abs(np.sin(V[:, 1] * 3.2)) ** 6) * (V[:, 2] < ZP - 1)
        return d + grip
    tk.push(h, f)


cage = tk.loft('head', head_rings(), n=14, cap0='round', cap1='round')
head_lo, head_hi = tk.lowhigh(cage, 'head', lo=1, hi=3, tris=150, sculpt=sculpt_head, region=(
    'black', [('mouth', lambda C, N: (N[:, 2] < -0.5) & (C[:, 1] < J[0] - 6.0))]))
# the eyes are painted (lib/face.py): gold dots, like the pen's maki-e
EYES = []
EYE_AX = {sx: tuple(np.array((sx * 0.86, -0.42, 0.28)) / np.linalg.norm((0.86, 0.42, 0.28))) for sx in (1, -1)}
NIB0 = (0, J[0] - 6.6, ZP + 2.6)
nib_out = [(-2.6, 0.0), (2.6, 0.0), (2.3, -2.8), (1.3, -5.4), (0.0, -6.8), (-1.3, -5.4), (-2.3, -2.8)]
nib_hi = tk.slab('nib_hi', nib_out, 0.7, plane='XY', at=0, bevel=0.2, segs=2)
nib_lo = tk.slab('nib', nib_out, 0.7, plane='XY', at=0, bevel=0, segs=0)
for n_ in (nib_hi, nib_lo):  # arched like a nib, riding on the snout
    tk.deform(n_, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], -0.16 * V[:, 0] ** 2], 1))
    tk.rotate(n_, 9, 'X')
    tk.move(n_, NIB0)
tk.boolean(nib_hi, tk.cyl('breather', 0.5, NIB0[2] - 3, NIB0[2] + 3, n=10, at=(0, NIB0[1] - 2.2), axis='Z', bevel=0.1, segs=1))
tk.set_region(nib_hi, 'gold')
# the lower jaw: the feed (black, with its comb fins as teeth) and a red tongue
JAW0 = (0, J[0] - 4.0, ZP - 1.2)
jaw_out = [(-2.6, 0.0), (2.6, 0.0), (2.2, -4.0), (1.4, -7.2), (0.0, -8.2), (-1.4, -7.2), (-2.2, -4.0)]
jaw_hi = tk.slab('jaw_hi', jaw_out, 1.6, plane='XY', at=0, bevel=0.35, segs=2)
jaw_lo = tk.slab('jaw', jaw_out, 1.6, plane='XY', at=0, bevel=0, segs=0)
for o in (jaw_hi, jaw_lo):
    tk.move(o, (0, JAW0[1], JAW0[2] - 0.7))
for i in range(5):  # the comb fins: little teeth
    tk.boolean(jaw_hi, tk.rbox('comb', (5.6, 0.35, 0.8), centre=(0, JAW0[1] - 1.4 - i * 1.15, JAW0[2] - 1.5), bevel=0.05, segs=1))
tk.regions(jaw_hi, 'feed', [('tongue', lambda C, N: (N[:, 2] > 0.5) & (np.abs(C[:, 0]) < 1.4) & (C[:, 1] > JAW0[1] - 6.0))])
for i, y in enumerate((-1.6, -3.4, -5.2)):
    for sx in (1, -1):
        t = tk.tube('tooth', [(sx * (2.0 - i * 0.25), JAW0[1] + y, JAW0[2] - 0.2), (sx * (2.0 - i * 0.25), JAW0[1] + y, JAW0[2] + 1.0)],
                    [0.42, 0.06], n=6, cap0='flat', cap1='point')
        tk.subsurf(t, 1)
        tk.set_region(t, 'tooth')
        PARTS.setdefault('_teeth', []).append(t)
# horns: gold antlers that lay back flat in grooves along the head for the pen
HORN = {}
for sx, nm in ((1, 'horn_l'), (-1, 'horn_r')):
    base = (sx * 2.4, J[0] - 1.6, ZP + 4.2)
    beam = [base, (sx * 3.2, J[0] + 0.4, ZP + 6.6), (sx * 4.2, J[0] + 3.2, ZP + 8.4), (sx * 4.6, J[0] + 6.4, ZP + 9.0)]
    tine = [(sx * 3.3, J[0] + 1.0, ZP + 7.0), (sx * 3.2, J[0] + 0.8, ZP + 9.4), (sx * 2.8, J[0] + 1.8, ZP + 10.8)]
    lows, highs = [], []
    for nm2, pts, rr in ((nm, beam, [0.95, 0.75, 0.5, 0.1]), (nm + '_tine', tine, [0.5, 0.38, 0.08])):
        lo = tk.tube(nm2, pts, rr, n=6, cap0='round', cap1='point')
        hi = tk.tube(nm2 + '_hi', pts, rr, n=10, cap0='round', cap1='point')
        tk.subsurf(hi, 2)
        tk.set_region(hi, 'gold')
        tk.subsurf(lo, 1)
        tk.decimate(lo, 28 if nm2 == nm else 14)
        lows.append(lo)
        highs.append(hi)
    HORN[nm] = (tk.join(lows, nm), highs, base)
# whiskers: two long gold whiskers from the snout corners, on their own hinges (they fold back flat for the pen)
WHISK = {}
for sx, nm in ((1, 'whisk_l'), (-1, 'whisk_r')):
    root = (sx * 3.5, J[0] - 10.0, ZP + 1.0)
    pts = [root, (sx * 5.6, J[0] - 9.6, ZP + 1.2), (sx * 7.6, J[0] - 8.0, ZP + 1.9), (sx * 9.0, J[0] - 5.2, ZP + 2.9), (sx * 9.6, J[0] - 2.0, ZP + 4.0)]
    lo = tk.tube(nm, pts, [0.48, 0.42, 0.36, 0.28, 0.08], n=5, cap0='round', cap1='point')
    hi = tk.tube(nm + '_hi', pts, [0.48, 0.42, 0.36, 0.28, 0.08], n=8, cap0='round', cap1='point')
    tk.subsurf(hi, 2)
    tk.set_region(hi, 'gold')
    tk.decimate(lo, 36)
    WHISK[nm] = (lo, hi, root, pts)
PARTS['head'] = ([head_lo, nib_lo] + [e[0] for e in EYES], [head_hi, nib_hi] + [e[1] for e in EYES])

# ------------------------------------------------------------------ the dragon's pose: each ring turned at its joint
# (relative turns in its parent's frame; s3 is the root ring on the desk)
CHAIN = {'s2': ('s3', J[2], [('Z', 34), ('X', -14)]), 's1': ('s2', J[1], [('Z', -44), ('X', -26)]),
         'head': ('s1', J[0], [('Z', -12), ('X', 34)]),
         's4': ('s3', J[3], [('Z', -38), ('X', 0)]), 's5': ('s4', J[4], [('Z', 42), ('X', 0)]), 's6': ('s5', J[5], [('Z', 40), ('X', 10)]),
         'tail': ('s6', J[6], [('Z', 22), ('X', 20)])}


def Q(rots):
    q = Quaternion()
    for ax, deg in rots:
        q = Quaternion({'X': (1, 0, 0), 'Y': (0, 1, 0), 'Z': (0, 0, 1)}[ax], math.radians(deg)) @ q
    return q


WORLD = {'s3': Matrix.Identity(4)}


def world(nm):
    if nm not in WORLD:
        par, y, rots = CHAIN[nm]
        P = Vector((0, y, ZP))
        WORLD[nm] = world(par) @ Matrix.Translation(P) @ Q(rots).to_matrix().to_4x4() @ Matrix.Translation(-P)
    return WORLD[nm]


# lift the whole coil so its lowest ring just touches the desk
zmin = min(min((world(nm) @ Vector(v)).z for v in tk.verts(o)) for nm in SEGS + ['tail', 'head'] for o in PARTS[nm][0])
LIFT = Matrix.Translation((0, 0, -zmin + 0.4))


def posed(nm, p):
    return tuple(LIFT @ world(nm) @ Vector(p))


for nm in SEGS + ['tail', 'head']:
    lows, highs = PARTS[nm]
    for o in lows + highs:
        tk.transform(o, LIFT @ world(nm))
for o in PARTS['_teeth'] + [jaw_lo, jaw_hi]:
    tk.transform(o, LIFT @ world('head'))
for nm, (lo, hi, base) in HORN.items():
    for o in [lo] + hi:
        tk.transform(o, LIFT @ world('head'))
for nm, (lo, hi, root, pts) in WHISK.items():
    for o in (lo, hi):
        tk.transform(o, LIFT @ world('head'))
for o in (clip_lo, clip_hi):
    tk.transform(o, LIFT @ world('tail'))
# the jaw ajar at rest (a little growl), turned about its hinge
JAW_OPEN = 16.0
jaw_pivot = Vector(posed('head', JAW0))
head_x = (LIFT @ world('head')).to_3x3() @ Vector((1, 0, 0))
Mj = Matrix.Translation(jaw_pivot) @ Matrix.Rotation(math.radians(JAW_OPEN), 4, head_x) @ Matrix.Translation(-jaw_pivot)
for o in PARTS['_teeth'] + [jaw_lo, jaw_hi]:
    tk.transform(o, Mj)
# the flame raised at rest (it lies along the cap as the clip)
FLAME_UP = 58.0
clip_pivot = Vector(posed('tail', CLIP0))
tail_x = (LIFT @ world('tail')).to_3x3() @ Vector((1, 0, 0))
Mf = Matrix.Translation(clip_pivot) @ Matrix.Rotation(math.radians(FLAME_UP), 4, tail_x) @ Matrix.Translation(-clip_pivot)
for o in (clip_lo, clip_hi):
    tk.transform(o, Mf)


# legs: four short gold claws from under rings s2 and s5, down to the desk (built in the pose)
def claw(nm, sx, seg, y):
    # the shoulder sits against the ring's flank, so the folded claw lies along the outside of the pen
    c = Vector(posed(seg, (sx * (R0 + 1.5), y, ZP - 1.0)))
    f = Vector((c.x + sx * 2.8, c.y - 1.4, 0.9))
    k = (c + f) / 2 + Vector((sx * 1.0, 0.3, 0.7))
    pieces = [tk.tube(nm, [tuple(c), tuple(k), tuple(f)], [1.3, 1.15, 0.95], n=6, cap0='round', cap1='round')]
    for a in (-38, 0, 38):
        d = np.array((math.sin(math.radians(a)) * sx * 0.8, -math.cos(math.radians(a)), -0.1))
        p0 = np.array(f)
        pieces.append(tk.tube(nm + f'_t{a}', [tuple(p0), tuple(p0 + d * 1.6), tuple(p0 + d * 2.7 + np.array((0, 0, -0.55)))], [0.52, 0.4, 0.06], n=5,
                              cap0='round', cap1='point'))
    lows, highs = [], []
    for i, p in enumerate(pieces):
        lo, hi = tk.lowhigh(p, p.name, lo=0 if i else 1, hi=2, region='gold')
        tk.decimate(lo, 30 if i == 0 else 9)
        lows.append(lo)
        highs.append(hi)
    return tk.join(lows, nm), highs, tuple(c), tuple(f - c)


CLAWS = {}
for nm, sx, y, seg in (('claw_fl', 1, (J[2] + J[3]) / 2, 's3'), ('claw_fr', -1, (J[2] + J[3]) / 2, 's3'),
                       ('claw_bl', 1, (J[4] + J[5]) / 2, 's5'), ('claw_br', -1, (J[4] + J[5]) / 2, 's5')):
    lo, hi, c, d = claw(nm, sx, seg, y)
    CLAWS[nm] = (lo, hi, c, seg, d)

# ------------------------------------------------------------------ parts
for nm in SEGS + ['tail']:
    lows, highs = PARTS[nm]
    F.part(nm, tk.join(lows, nm), highs, bone=nm, kind='gloss')
lows, highs = PARTS['head']
F.part('head', tk.join(lows, 'head'), highs, bone='head', kind='gloss')
F.part('jaw', jaw_lo, [jaw_hi] + PARTS['_teeth'], bone='jaw', kind='gloss')
F.part('flame', clip_lo, [clip_hi], bone='flame', kind='metal')
for nm, (lo, hi, base) in HORN.items():
    F.part(nm, lo, hi, bone=nm, kind='metal')
for nm, (lo, hi, root, pts) in WHISK.items():
    F.part(nm, lo, [hi], bone=nm, kind='metal')
for nm, (lo, hi, c, seg, d) in CLAWS.items():
    F.part(nm, lo, hi, bone=nm, kind='metal')
F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
OUT = os.path.join(F.out, F.id)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', posed('s3', (0, (J[2] + J[3]) / 2, ZP)))
    R.bone('s3', posed('s3', (0, (J[2] + J[3]) / 2, ZP)), parent='root')
    order = ['s2', 's1', 'head', 's4', 's5', 's6', 'tail']
    for nm in order:
        par, y, rots = CHAIN[nm]
        R.bone(nm, posed(nm, (0, y, ZP)), parent=par)
    R.bone('jaw', posed('head', JAW0), parent='head')
    R.bone('flame', posed('tail', CLIP0), parent='tail')
    for nm, (lo, hi, base) in HORN.items():
        R.bone(nm, posed('head', base), parent='head')
    for nm, (lo, hi, root, pts) in WHISK.items():
        R.bone(nm, posed('head', root), parent='head')
    for nm, (lo, hi, c, seg, d) in CLAWS.items():
        R.bone(nm, c, parent=seg)
    for p in F.parts:
        R.attach(p.low, p.bone)
    # straightening a piece: undo its joint turn, in figure axes at rest (rot(parent) Q^-1 rot(parent)^-1)
    straight = {}
    for nm, (par, y, rots) in CHAIN.items():
        Mp = world(par).to_quaternion()
        straight[nm] = Mp @ Q(rots).inverted() @ Mp.inverted()
    # a child part of a straightened piece: its own fold given in figure axes once the piece is straight
    def fold_q(seg, want):
        qP = world(seg).to_quaternion().inverted()
        return qP.inverted() @ want @ qP
    hx = world('head').to_quaternion()
    jaw_shut = hx @ Quaternion((1, 0, 0), math.radians(-JAW_OPEN)) @ hx.inverted()
    tx = world('tail').to_quaternion()
    flame_down = tx @ Quaternion((1, 0, 0), math.radians(-FLAME_UP)) @ tx.inverted()
    # whiskers and horns lie back flat along the head (in the head's own straight frame: rotate about its local z / x)
    WZ, WX = float(os.environ.get('WZ', 30)), float(os.environ.get('WX', 0))
    whisk_back = {nm: hx @ Quaternion((0, 0, 1), math.radians(sx * WZ)) @ Quaternion((1, 0, 0), math.radians(WX)) @ hx.inverted()
                  for nm, sx in (('whisk_l', 1), ('whisk_r', -1))}
    horn_back = {nm: hx @ Quaternion((1, 0, 0), math.radians(-float(os.environ.get('HB', 34)))) @ hx.inverted() for nm in HORN}
    claws = {nm: (1 if nm.endswith('l') else -1) for nm in CLAWS}
    fold = {}
    for nm, (lo, hi, c, seg, d) in CLAWS.items():
        sx = claws[nm]
        qP = world(seg).to_quaternion().inverted()
        d0 = Vector(d)
        dirn = float(os.environ.get('WANT_F' if seg == 's3' else 'WANT_B', 1))  # folded back along the flank
        want = Vector((0.0, dirn, 0.04)).normalized()
        qD = (qP @ d0).rotation_difference(want) @ qP
        fold[nm] = qP.inverted() @ qD
    seq = ['s2', 's1', 'head', 's4', 's5', 's6', 'tail']
    with R.action('gimmick'):
        k = R.key
        small = ['jaw', 'flame'] + list(HORN) + list(WHISK) + list(CLAWS)
        allb = ['root', 's3'] + seq + small
        for b in allb:
            k(b, 0)
        # 0-6 whiskers, horns, flame and jaw tuck in first; 4-16 the rings straighten into a pen and it lies down
        for nm in WHISK:
            k(nm, 1)
            k(nm, 6, quat=whisk_back[nm])
        for nm in HORN:
            k(nm, 1)
            k(nm, 6, quat=horn_back[nm])
        k('jaw', 1)
        k('jaw', 5, quat=jaw_shut)
        k('flame', 2)
        k('flame', 7, quat=flame_down)
        CT = [int(v) for v in os.environ.get('CLAW_T', '8,14').split(',')]
        for nm in CLAWS:  # the claws fold along the flanks as the rings straighten
            k(nm, CT[0])
            k(nm, CT[1], quat=fold[nm])
        for i, nm in enumerate(seq):
            k(nm, 4 + i)
            k(nm, 13 + i // 2, quat=straight[nm])
        k('root', 6)
        k('root', 17, move=(0, 0, float(LIFT.translation.z) * -1 + 0.0), ease='BOUNCE')
        # 17-40 a pen: it rolls a little on the desk and back
        k('s3', 20)
        k('s3', 27, rot=('Y', 30))
        k('s3', 34, rot=('Y', 0))
        hold = {**{nm: straight[nm] for nm in seq}, 'jaw': jaw_shut, 'flame': flame_down, **whisk_back, **horn_back, **fold}
        for nm, q in hold.items():
            k(nm, 40, quat=q)
        k('root', 40, move=(0, 0, float(LIFT.translation.z) * -1))
        # 40-58 it winds back up, tail first, then the head; claws out, horns up, whiskers out, flame up
        k('root', 48, ease='BACK')
        for i, nm in enumerate(['tail', 's6', 's5', 's4', 's2', 's1', 'head']):
            k(nm, 43 + i * 2, ease='BACK')
        for nm in CLAWS:  # out first, while the pen is still straight
            k(nm, 41, quat=fold[nm])
            k(nm, 46, quat=Quaternion(), ease='BACK')
        k('flame', 46, ease='BACK')
        for nm in HORN:
            k(nm, 55, rot=('X', 8), ease='BACK')
            k(nm, 59)
        for nm in WHISK:
            k(nm, 56, ease='BACK')
        # 56-92 a ripple runs nose to tail; the jaws open wide in a roar
        for i, nm in enumerate(['head', 's1', 's2', 's4', 's5', 's6', 'tail']):
            t0 = 58 + i * 2
            k(nm, t0)
            k(nm, t0 + 4, rot=('Z', 7 * (1 if i % 2 else -1)))
            k(nm, t0 + 9, rot=('Z', -5 * (1 if i % 2 else -1)))
            k(nm, t0 + 14)
        k('jaw', 60)
        k('jaw', 64, rot=('X', 0), quat=None)
        hx_open = hx @ Quaternion((1, 0, 0), math.radians(14)) @ hx.inverted()
        k('jaw', 66, quat=hx_open, ease='BACK')
        k('jaw', 76, quat=hx_open)
        k('jaw', 80)
        for b in allb:
            k(b, 92)
    return R


if '--clip' in ARGS:
    from rig import check_clip
    R = make_rig()
    skip = [(a, b) for a, b in zip(['head'] + SEGS, SEGS + ['tail'])] + [('s1', 'head'), ('jaw', 'head'), ('flame', 'tail')]
    res = check_clip(R, F.parts, range(1, 93), skip=skip, tol=0.35)
    for f, L_ in sorted(res.items()):
        print('CLIP', f, L_)
    print('CLIP frames', len(res))
    sys.exit(0)

if '--preview' in ARGS or '--fold' in ARGS:
    import bpy
    lows = [p.low for p in F.parts]
    highs = [h for p in F.parts for h in p.highs]
    cams = [((56, -62, 46), (0, -4, 10)), ((-56, 58, 40), (0, -2, 10)), ((56, -62, 46), (0, -4, 10)), ((0, -14, 110), (0, -2, 6))]
    if '--fold' in ARGS:
        R = make_rig()
        R.arm.animation_data.action = bpy.data.actions['gimmick']
        for i, fr in enumerate(int(v) for v in os.environ.get('FRS', '0,24,50,66').split(',')):
            bpy.context.scene.frame_set(fr)
            tk.preview(OUT + f'_p{i + 1}.png', lows, cam=cams[i], lens=45)
        sys.exit(0)
    tk.preview(OUT + '_p1.png', highs, cam=cams[0], lens=50)
    tk.preview(OUT + '_p2.png', highs, cam=cams[1], lens=50)
    tk.preview(OUT + '_p3.png', lows, cam=cams[2], lens=50)
    tk.preview(OUT + '_p4.png', highs, cam=cams[3], lens=45)
    sys.exit(0)


# ------------------------------------------------------------------ bake, paint
import paint as pt  # noqa: E402
import face  # noqa: E402

FAST = '--fast' in ARGS
F.unwrap()
F.bake(ao_samples=24 if FAST else 128, ao_dist=5.0, reuse='--repaint' in ARGS)


def paint(P):
    on, X, Yc, Z = P.on, P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.2)
    RED = pt.ramp('#a8261d', 7, dark=0.55, light=0.4, shift=0.06)
    GOLD = pt.ramp('#d6a640', 7, dark=0.6, light=0.6, shift=0.08)
    BLACK = pt.ramp('#25201f', 6, dark=0.4, light=0.45, shift=0.05)
    P.fill('red', RED, tone=sh, base=0.05, brush='lacquer')
    P.fill('belly', pt.ramp('#d8b25a', 6, shift=0.06), tone=sh, base=0.05)  # a gold belly
    P.fill('gold', GOLD, tone=sh * 1.3, base=0.1)
    P.fill('black', BLACK, tone=sh, base=0.1, brush='lacquer')
    P.fill('mouth', pt.ramp('#5a1418', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('feed', BLACK, tone=sh, base=0.0)
    P.fill('tongue', pt.ramp('#c8404a', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('tooth', pt.ramp('#f2ead6', 5, shift=0.05, dark=0.4), tone=sh, base=0.15)
    P.fill('eyeball', pt.ramp('#e8b030', 5, shift=0.06), tone=sh * 0.5, base=0.15)
    # gold maki-e: the pressed scales picked out in gold, and cloud scrolls on the flanks of every ring
    red = P.region('red')
    P.tint(red & (P.cav > 0.56), GOLD, sh * 1.3 + 0.2)
    names = [q.name for q in F.parts]
    for nm in SEGS + ['tail']:
        m = red & (P.part == names.index(nm))
        if not m.any():
            continue
        Minv = (LIFT @ world(nm)).inverted()
        Qp = P.pos @ np.array(Minv.to_3x3()).T + np.array(Minv.translation)
        a = np.arctan2(Qp[:, :, 0], Qp[:, :, 2] - ZP)
        side = np.abs(np.abs(a) - math.pi / 2) < 0.8
        u, v = (Qp[:, :, 1] % 6.8) - 3.4, (np.abs(a) - math.pi / 2) * R0
        rr = np.hypot(u - 0.8, v)
        th = np.arctan2(v, u - 0.8)
        swirl = np.abs(((rr - 0.33 * th) % 1.15) - 0.57) < 0.19
        P.tint(m & side & swirl & (rr < 2.8), GOLD, sh * 1.3 + 0.15)
    # the eyes: one gold dot each side under the brow, hand-dotted (a little uneven), like the pen's maki-e
    for sx in (1, -1):
        c = Vector(posed('head', EYE_C[sx]))
        axv = ((LIFT @ world('head')).to_3x3() @ Vector(EYE_AX[sx])).normalized()
        fc = face.Face(P, tuple(c), tuple(axv), where=P.region('black'), seed=12 + sx, ink='#e4bc52', depth=2.5)
        k = 1.12 if sx > 0 else 0.92
        fc.dot(0.15 * sx, -0.1, 0.5 * k, 0.68 * k, rot=sx * 8)
    P.clusters()
    return P.done()


P = pt.Painter(F.maps, F.region_index, F.size)
F.finish(paint(P))
F.drop_highs()
R = make_rig()
F.export(R)
