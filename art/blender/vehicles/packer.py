"""The town's garbage truck, modelled in Blender (headless bpy): a 1980s Japanese 2-ton cab-over packer (パッカー車).
  tools/blender.sh art/blender/vehicles/packer.py      (paint first: python3 -I art/blender/vehicles/packer_paint.py)
  -> art/blender/vehicles/out/packer_truck.glb, packer_truck_lod.glb (then node art/blender/vehicles/pack.mjs)

Modelled per docs/LOWPOLY.md from the real thing (Isuzu Elf / Mitsubishi Canter-class packers with a Morita / Shin
Meiwa-style body; 1.69 m wide, 2.3 m tall, 5.3 m long): a hollow cab shell (an extruded side profile with the front
wheel arch, its front corners rounded, a 3 cm skin) with the windscreen, door and back windows cut through it and
real glass in them, a dash, bench seat and wheel inside; a recessed grille with slats, square headlamps, turn lamps,
a wrapped bumper, entry steps, mirrors on tube stalks, wipers. The packer body is a ribbed box with a radiused top,
its sub-frame rail and marker lamps; the hopper behind it has a sloped tailgate, the loading mouth sunk into its back,
lift rams with chrome rods, the crew's tread-plate step on brackets, grab rails, tail lamps. Under it all: C-section
frame rails, fuel tank, battery box, silencer, axles, side guards, mud flaps; turned tyres on dished steel wheels,
duals at the back. The rotating packer plate is its own part (material `blade`), so are the four wheels (`wheel_fl`
...), so the game can move them. Painted by projection (packer_layout.py): the shell takes the hand-painted
elevations, everything else a tiling swatch at the same 256 px/m.

Game frame while modelling: x left, y up, z forward (metres); rotated to Blender's Z-up only at export."""
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from packer_layout import P, ATLAS, VIEWS, px, view_of, TILE, WHEEL  # noqa: E402
from bpykit import MAT, material, obj, prism, prism_x, prism_z, fix, apply, bevel, solidify, cut, rrect, box, tube, lathe, export, finish, tris, reset  # noqa: E402

OUT = os.path.join(HERE, 'out')
TEX = os.path.join(OUT, 'tex')
W = 0.85                      # half the cab's width
WR = 0.37                     # tyre radius
AXF, AXR, TRACKF, TRACKR = 1.75, -1.0, 0.68, 0.6
BLADE = (1.32, -2.28)         # the packer plate's pivot (y, z)

SCN = reset()


# ------------------------------------------------------------------ materials
for _ in (
    material('paint', 'packer_atlas', 0.45, 0.05),
    material('trim', 'trim', 0.6, 0.1),
    material('steel', 'steel', 0.55, 0.3),
    material('chrome', 'chrome', 0.25, 0.6),
    material('rubber', 'rubber', 0.85),
    material('interior', 'interior', 0.8),
    material('dark', 'dark', 0.75, 0.1),
    material('checker', 'checker', 0.5, 0.35),
    material('blade', 'steel', 0.55, 0.3),
    material('glass', None, 0.05, 0.0, (0.56, 0.64, 0.68, 1)),
): pass
for k in ('wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr'):
    material(k, 'wheel', 0.7, 0.05)


# ------------------------------------------------------------------ the cab
CAB_Z0, CAB_Z1, CAB_Y0, ROOF = 1.22, 2.42, 0.64, 2.08
ARCH = (AXF, WR, 0.47)


def cab_profile():
    zc, yc, R = ARCH
    a = math.asin((CAB_Y0 - yc) / R)
    arc = [(zc + math.cos(t) * R, yc + math.sin(t) * R) for t in [math.pi - a - (math.pi - 2 * a) * k / 11 for k in range(12)]]
    return [(CAB_Z0, CAB_Y0)] + arc + [(CAB_Z1, CAB_Y0), (CAB_Z1, 1.26), (2.40, 1.30), (2.30, 1.93), (2.22, 2.04), (2.12, ROOF), (1.30, ROOF), (1.24, 2.04), (CAB_Z0, 2.0)]


def ws_z(y): return 2.40 + (y - 1.30) * (2.30 - 2.40) / (1.93 - 1.30)


def cab():
    bm = bmesh.new()
    prism_x(bm, cab_profile(), -W, W)
    fix(bm)
    # the front corners, rounded in plan
    edges = [e for e in bm.edges if all(abs(abs(v.co.x) - W) < 1e-4 for v in e.verts) and abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-4
             and min(v.co.z for v in e.verts) > 2.2 and max(v.co.y for v in e.verts) < 2.03]
    bmesh.ops.bevel(bm, geom=edges, offset=0.09, offset_type='OFFSET', segments=3, profile=0.5, affect='EDGES', clamp_overlap=True)
    o = obj('cab', bm, ['paint', 'interior'])
    bevel(o, 0.03, 2, 40)
    solidify(o, 0.03)
    # windows: the windscreen, both doors, the back
    up = Vector((0, 1.93 - 1.30, 2.30 - 2.40)).normalized()
    nrm = Vector((1, 0, 0)).cross(up)
    L = (Vector((0, 1.93, 2.30)) - Vector((0, 1.30, 2.40))).length
    bm = bmesh.new(); prism(bm, rrect(-0.74, 0.03, 0.74, L - 0.04, 0.05), (0, 1.30, 2.40), (1, 0, 0), up, nrm, -0.2, 0.2); fix(bm)
    cut(o, obj('c_ws', bm, ['rubber']))
    win = [(1.34, 1.32), (2.26, 1.32), (ws_z(1.86) - 0.12, 1.86), (1.34, 1.86)]
    for s in (-1, 1):
        bm = bmesh.new(); prism_x(bm, win, s * 0.6, s * 1.1); fix(bm)
        cut(o, obj('c_win', bm, ['rubber']))
    bm = bmesh.new(); prism_z(bm, rrect(-0.45, 1.52, 0.45, 1.86, 0.04), 1.0, 1.4); fix(bm)
    cut(o, obj('c_back', bm, ['rubber']))
    # the grille, sunk 2 cm into the front
    bm = bmesh.new(); prism_z(bm, [(-0.48, 0.80), (0.48, 0.80), (0.48, 1.0), (-0.48, 1.0)], CAB_Z1 - 0.02, CAB_Z1 + 0.2); fix(bm)
    cut(o, obj('c_grille', bm, ['trim']))
    # glass in every opening, set back from the skin
    bm = bmesh.new()
    prism(bm, rrect(-0.75, 0.02, 0.75, L - 0.03, 0.05), (0, 1.30, 2.40), (1, 0, 0), up, nrm, -0.016, -0.012)
    for s in (-1, 1): prism_x(bm, win, s * (W - 0.014), s * (W - 0.018))
    prism_z(bm, rrect(-0.46, 1.51, 0.46, 1.87, 0.04), CAB_Z0 + 0.012, CAB_Z0 + 0.016)
    fix(bm)
    obj('glass', bm, ['glass'])
    # inside: the dash and its binnacle, the bench seat, the wheel on its column, the gear lever, the back wall's trim
    bm = bmesh.new()
    prism_x(bm, [(2.05, 1.0), (2.37, 1.0), (2.37, 1.28), (2.27, 1.33), (2.05, 1.22)], -0.81, 0.81)
    prism_x(bm, [(2.10, 1.22), (2.24, 1.26), (2.22, 1.36), (2.12, 1.33)], 0.22, 0.62)
    fix(bm)
    o2 = obj('dash', bm, ['interior']); bevel(o2, 0.015, 1, 30)
    bm = bmesh.new()
    prism_x(bm, [(1.32, 0.9), (1.84, 0.9), (1.86, 1.0), (1.81, 1.05), (1.36, 1.06), (1.32, 1.02)], -0.79, 0.79)
    prism_x(bm, [(1.27, 1.03), (1.40, 1.03), (1.37, 1.62), (1.33, 1.66), (1.27, 1.66)], -0.79, 0.79)
    fix(bm)
    o2 = obj('seat', bm, ['interior']); bevel(o2, 0.03, 2, 30)
    sw = bmesh.new()
    c, tilt = Vector((0.42, 1.36, 2.02)), math.radians(52)
    ax, ay = Vector((1, 0, 0)), Vector((0, math.cos(tilt), -math.sin(tilt)))
    rings = []
    for i in range(16):
        t = 2 * math.pi * i / 16
        rad = ax * math.cos(t) + ay * math.sin(t)
        nn = ax.cross(ay)
        rings.append([sw.verts.new(c + rad * (0.19 + 0.016 * math.cos(2 * math.pi * j / 5)) + nn * 0.016 * math.sin(2 * math.pi * j / 5)) for j in range(5)])
    for i in range(16):
        for j in range(5):
            sw.faces.new((rings[i][j], rings[i][(j + 1) % 5], rings[(i + 1) % 16][(j + 1) % 5], rings[(i + 1) % 16][j]))
    fix(sw)
    obj('wheel_ring', sw, ['trim'])
    tube('column', [(0.42, 1.36, 2.02), (0.42, 1.18, 2.22)], 0.025, 'trim', 6)
    tube('spoke', [(0.27, 1.36 + 0.0, 2.02), (0.57, 1.36, 2.02)], 0.012, 'trim', 5)
    tube('lever', [(0.0, 0.98, 1.95), (-0.02, 1.25, 1.93)], 0.012, 'chrome', 5)
    # front: grille slats, headlamps, turn lamps, the wrapped bumper, entry steps, wipers
    bm = bmesh.new()
    y = 0.815
    while y < 0.99:
        prism_x(bm, [(CAB_Z1 - 0.02, y), (CAB_Z1 - 0.004, y), (CAB_Z1 - 0.004, y + 0.016), (CAB_Z1 - 0.02, y + 0.016)], -0.47, 0.47)
        y += 0.03
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.56, s * 0.80))
        prism_z(bm, [(x0, 0.80), (x1, 0.80), (x1, 0.97), (x0, 0.97)], CAB_Z1 - 0.005, CAB_Z1 + 0.03)
        x0, x1 = sorted((s * 0.60, s * 0.80))
        prism_z(bm, [(x0, 0.69), (x1, 0.69), (x1, 0.76), (x0, 0.76)], CAB_Z1 - 0.005, CAB_Z1 + 0.022)
        prism_x(bm, [(2.27, 0.92), (2.33, 0.92), (2.33, 0.96), (2.27, 0.96)], s * W - 0.01, s * (W + 0.012))
    fix(bm)
    o2 = obj('lamps', bm, ['paint']); bevel(o2, 0.006, 1, 30)
    bm = bmesh.new()
    prism_x(bm, [(2.34, 0.42), (2.52, 0.42), (2.57, 0.45), (2.57, 0.63), (2.52, 0.66), (2.34, 0.66)], -0.9, 0.9)
    fix(bm)
    edges = [e for e in bm.edges if all(abs(abs(v.co.x) - 0.9) < 1e-4 for v in e.verts) and abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-4 and min(v.co.z for v in e.verts) > 2.5]
    bmesh.ops.bevel(bm, geom=edges, offset=0.07, offset_type='OFFSET', segments=3, profile=0.5, affect='EDGES', clamp_overlap=True)
    o2 = obj('bumper', bm, ['paint']); bevel(o2, 0.01, 1, 40)
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.6, s * 0.88))
        box('step', x0, 0.40, 2.14, x1, 0.44, 2.33, 'checker', 0.006)
        tube('wiper', [(s * 0.05 - 0.3, 1.33, ws_z(1.33) + 0.012), (s * 0.05 + 0.25, 1.36, ws_z(1.36) + 0.012)], 0.008, 'trim', 4)
        # mirrors on tube stalks, and the under-mirror on the front corner
        tube('stalk', [(s * (W - 0.02), 1.9, 2.22), (s * (W + 0.17), 1.9, 2.3), (s * (W + 0.17), 1.36, 2.3), (s * (W - 0.02), 1.30, 2.3)], 0.012, 'trim', 6)
        bm = bmesh.new()
        prism_z(bm, rrect(s * (W + 0.17) - 0.06, 1.38, s * (W + 0.17) + 0.06, 1.72, 0.03), 2.31, 2.36)
        fix(bm)
        o2 = obj('mirror', bm, ['trim']); bevel(o2, 0.008, 1, 30)
        bm = bmesh.new()
        prism_z(bm, rrect(s * (W + 0.17) - 0.05, 1.39, s * (W + 0.17) + 0.05, 1.71, 0.025), 2.302, 2.31)
        fix(bm)
        obj('mirror_glass', bm, ['chrome'])
    # roof: a rain gutter lip down each side
    for s in (-1, 1):
        x0, x1 = sorted((s * (W - 0.005), s * (W + 0.012)))
        box('gutter', x0, 1.97, 1.28, x1, 1.99, 2.14, 'paint', 0.004)


# ------------------------------------------------------------------ the packer body and hopper
BODY = (-2.0, 1.14, 0.82, 2.28)
RIBS = [-1.62, -1.02, -0.42, 0.18, 0.78]
HOP = [(-2.0, 0.52), (-2.0, 2.30), (-2.16, 2.34), (-2.34, 2.14), (-2.48, 1.70), (-2.48, 0.52)]


def body():
    z0, z1, y0, y1 = BODY
    bm = bmesh.new()
    prof = [(-0.86, y0), (0.86, y0)] + [(0.74 + math.cos(t) * 0.12, y1 - 0.12 + math.sin(t) * 0.12) for t in (math.radians(a) for a in (0, 30, 60, 90))] \
        + [(-0.74 + math.cos(t) * 0.12, y1 - 0.12 + math.sin(t) * 0.12) for t in (math.radians(a) for a in (90, 120, 150, 180))]
    prism_z(bm, prof, z0, z1)
    fix(bm)
    o = obj('body', bm, ['paint']); bevel(o, 0.02, 1, 40)
    bm = bmesh.new()
    for z in RIBS:
        for s in (-1, 1):
            x0, x1 = sorted((s * 0.855, s * 0.882))
            prism_z(bm, [(x0, 0.86), (x1, 0.86), (x1, 2.14), (x0, 2.14)], z - 0.03, z + 0.03)
        prism_z(bm, [(-0.72, y1 - 0.005), (0.72, y1 - 0.005), (0.72, y1 + 0.02), (-0.72, y1 + 0.02)], z - 0.03, z + 0.03)
    prism_z(bm, [(-0.9, 0.76), (0.9, 0.76), (0.9, 0.86), (-0.9, 0.86)], z0, z1)
    for z in (-1.8, -1.25, -0.7, -0.15, 0.4, 0.95):
        for s in (-1, 1):
            x0, x1 = sorted((s * 0.895, s * 0.91))
            prism_z(bm, [(x0, 0.80), (x1, 0.80), (x1, 0.84), (x0, 0.84)], z - 0.025, z + 0.025)
    fix(bm)
    o = obj('ribs', bm, ['paint']); bevel(o, 0.006, 1, 40)
    # the hopper, its mouth sunk in, the throat dark
    bm = bmesh.new()
    prism_x(bm, HOP, -0.88, 0.88)
    fix(bm)
    o = obj('hopper', bm, ['paint']); bevel(o, 0.03, 2, 30)
    bm = bmesh.new(); prism_z(bm, [(-0.66, 0.76), (0.66, 0.76), (0.66, 1.42), (-0.66, 1.42)], -2.6, -2.06); fix(bm)
    cut(o, obj('c_mouth', bm, ['dark']))
    bm = bmesh.new()
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.70, s * 0.86))
        prism_z(bm, [(x0, 0.77), (x1, 0.77), (x1, 0.98), (x0, 0.98)], -2.505, -2.475)
    fix(bm)
    o = obj('taillamps', bm, ['paint']); bevel(o, 0.005, 1, 30)
    # lift rams either side of the tailgate (barrel and chrome rod), their brackets, the top hinges
    for s in (-1, 1):
        a, b = Vector((s * 0.93, 0.92, -2.04)), Vector((s * 0.93, 1.96, -2.30))
        m = a.lerp(b, 0.55)
        tube('ram', [a, m], 0.045, 'steel', 8)
        tube('rod', [m, b], 0.022, 'chrome', 8)
        x0, x1 = sorted((s * 0.88, s * 0.96))
        box('ram_lug', x0, 0.86, -2.08, x1, 0.98, -2.0, 'steel', 0.008)
        box('ram_lug2', x0, 1.92, -2.34, x1, 2.02, -2.26, 'steel', 0.008)
        x0, x1 = sorted((s * 0.62, s * 0.80))
        box('hinge', x0, 2.28, -2.06, x1, 2.36, -1.96, 'steel', 0.01)
    # the crew's step on its brackets, grab rails up the back
    box('rear_step', -0.88, 0.27, -2.64, 0.88, 0.32, -2.46, 'checker', 0.008)
    for s in (-1, 1):
        bm = bmesh.new()
        prism_x(bm, [(-2.62, 0.32), (-2.48, 0.32), (-2.48, 0.52), (-2.52, 0.52)], s * 0.7 - 0.012, s * 0.7 + 0.012)
        fix(bm)
        obj('step_bracket', bm, ['steel'])
        tube('grab', [(s * 0.80, 0.62, -2.48), (s * 0.80, 0.64, -2.55), (s * 0.80, 1.86, -2.55), (s * 0.80, 1.88, -2.48)], 0.018, 'chrome', 6)
    tube('grab_h', [(-0.6, 1.60, -2.48), (-0.58, 1.60, -2.53), (0.58, 1.60, -2.53), (0.6, 1.60, -2.48)], 0.016, 'chrome', 6)


def chassis():
    for s in (-1, 1):
        a, b = sorted((s * 0.36, s * 0.48))
        bm = bmesh.new()
        if s > 0: c = [(a, 0.44), (b, 0.44), (b, 0.64), (a, 0.64), (a, 0.61), (b - 0.03, 0.61), (b - 0.03, 0.47), (a, 0.47)]
        else: c = [(a, 0.44), (b, 0.44), (b, 0.47), (a + 0.03, 0.47), (a + 0.03, 0.61), (b, 0.61), (b, 0.64), (a, 0.64)]
        prism_z(bm, c, -2.45, 2.3)
        fix(bm)
        obj('rail', bm, ['trim'])
        # side guards between the axles, on three brackets
        x0, x1 = sorted((s * 0.84, s * 0.87))
        box('guard', x0, 0.50, -0.55, x1, 0.56, 1.2, 'steel', 0.005)
        box('guard2', x0, 0.64, -0.55, x1, 0.70, 1.2, 'steel', 0.005)
        for z in (-0.4, 0.35, 1.05):
            x0, x1 = sorted((s * 0.48, s * 0.86))
            box('guard_br', x0, 0.52, z - 0.015, x1, 0.68, z + 0.015, 'trim')
        # mud flaps behind the rear wheels, fenders over them
        x0, x1 = sorted((s * 0.27, s * 0.84))
        box('flap', x0, 0.2, -1.52, x1, 0.74, -1.505, 'rubber')
        box('fender', x0, 0.76, -1.48, x1, 0.79, -0.52, 'trim', 0.004)
    for z in (-2.2, -1.4, -0.6, 0.6, 1.5):
        box('xmember', -0.36, 0.48, z - 0.04, 0.36, 0.60, z + 0.04, 'trim')
    bm = bmesh.new(); prism_z(bm, rrect(0.5, 0.42, 0.82, 0.74, 0.07, 2), 0.15, 0.85); fix(bm)
    o = obj('tank', bm, ['steel']); bevel(o, 0.01, 1, 30)
    for z in (0.3, 0.7): box('strap', 0.49, 0.41, z - 0.02, 0.83, 0.75, z + 0.02, 'trim')
    box('battery', -0.82, 0.44, 0.3, -0.52, 0.72, 0.78, 'trim', 0.012)
    tube('silencer', [(-0.3, 0.38, -0.2), (-0.3, 0.38, 0.6)], 0.09, 'dark', 10)
    tube('tailpipe', [(-0.3, 0.38, -0.2), (-0.3, 0.36, -0.6), (-0.6, 0.3, -0.75)], 0.03, 'dark', 6)
    tube('propshaft', [(0, 0.4, -0.95), (0, 0.44, 1.5)], 0.035, 'trim', 8)
    tube('axle_r', [(-0.5, WR, AXR), (0.5, WR, AXR)], 0.06, 'trim', 10)
    tube('axle_f', [(-0.55, WR + 0.03, AXF), (0.55, WR + 0.03, AXF)], 0.04, 'trim', 8)
    bm = bmesh.new()
    lathe(bm, [(0, 0.14), (0.08, 0.13), (0.14, 0.06), (0.15, 0.0), (0.13, -0.08), (0, -0.1)], (0, WR, AXR), 1, 12)
    fix(bm)
    o = obj('diff', bm, ['trim'])
    o.data.transform(Matrix.Translation((0, WR, AXR)) @ Matrix.Rotation(math.pi / 2, 4, 'Y') @ Matrix.Translation((0, -WR, -AXR)))


def blade():
    """The rotating packer plate: a curved scoop on its shaft, hanging from the pivot in the hopper."""
    y, z = BLADE
    bm = bmesh.new()
    pts = []
    for k in range(7):
        t = k / 6
        pts.append((z - 0.02 + 0.13 * math.sin(t * math.pi * 0.9), y - 0.06 - 0.5 * t))
    prof = pts + [(a - 0.022, b) for a, b in reversed(pts)]
    prism_x(bm, prof, -0.6, 0.6)
    fix(bm)
    o = obj('blade', bm, ['blade']); bevel(o, 0.006, 1, 30)
    tube('blade_shaft', [(-0.63, y, z), (0.63, y, z)], 0.05, 'blade', 10)


TYRE = [(0, 0.055), (0.05, 0.055), (0.06, 0.05), (0.12, 0.045), (0.135, 0.02), (0.215, 0.025), (0.235, 0.06), (0.25, 0.08), (0.30, 0.1),
        (0.345, 0.095), (0.365, 0.075), (WR, 0.05), (WR, -0.05), (0.365, -0.075), (0.345, -0.095), (0.30, -0.1), (0.25, -0.08), (0.235, -0.06), (0.14, -0.05), (0, -0.05)]


def wheels():
    for name, x, z, dual in (('wheel_fl', TRACKF, AXF, False), ('wheel_fr', -TRACKF, AXF, False), ('wheel_rl', TRACKR, AXR, True), ('wheel_rr', -TRACKR, AXR, True)):
        s = 1 if x > 0 else -1
        bm = bmesh.new()
        lathe(bm, TYRE, (x, WR, z), s, 18)
        if dual: lathe(bm, TYRE, (x - s * 0.215, WR, z), -s, 18)
        fix(bm)
        obj(name, bm, [name])


cab(); body(); chassis(); blade(); wheels()


# ------------------------------------------------------------------ uv: projection for the shell, swatches, the wheel sheet
def uv_all():
    for o in [o for o in SCN.objects if o.type == 'MESH']:
        me = o.data
        if not me.uv_layers: me.uv_layers.new(name='UV')
        uv = me.uv_layers.active.data
        for poly in me.polygons:
            mname = me.materials[poly.material_index].name if me.materials else 'paint'
            n = poly.normal
            if mname == 'paint':
                v = view_of(n, poly.center)
                for li in poly.loop_indices:
                    co = me.vertices[me.loops[li].vertex_index].co
                    c, r = px(v, co.x, co.y, co.z)
                    uv[li].uv = (c / ATLAS, 1 - r / ATLAS)
            elif mname.startswith('wheel_'):
                cx = {'wheel_fl': (TRACKF, AXF), 'wheel_fr': (-TRACKF, AXF), 'wheel_rl': (TRACKR, AXR), 'wheel_rr': (-TRACKR, AXR)}[mname]
                ctr = poly.center
                side = abs(n.x) > 0.5
                base = None
                for li in poly.loop_indices:
                    co = me.vertices[me.loops[li].vertex_index].co
                    if side:
                        u, vv = 0.5 + (co.z - cx[1]) / 0.8, (0.5 - (co.y - WR) / 0.8) * 256
                        uv[li].uv = (u, 1 - vv / WHEEL[1])
                    else:
                        a = math.atan2(co.y - WR, co.z - cx[1])
                        if base is None: base = a
                        while a - base > math.pi: a -= 2 * math.pi
                        while a - base < -math.pi: a += 2 * math.pi
                        tc = min((cx[0], cx[0] - (0.215 if cx[0] > 0 else -0.215)), key=lambda t: abs(ctr.x - t))
                        w = co.x - tc
                        uv[li].uv = (a / (2 * math.pi) * 4, 1 - (256 + min(63.5, max(0.5, (w / 0.21 + 0.5) * 64))) / WHEEL[1])
            else:
                ax = max(range(3), key=lambda i: abs(n[i]))
                a, b = [(1, 2), (0, 2), (0, 1)][ax]
                for li in poly.loop_indices:
                    co = me.vertices[me.loops[li].vertex_index].co
                    uv[li].uv = (co[a] * P / TILE, co[b] * P / TILE)


uv_all()


# ------------------------------------------------------------------ shading, budget, export (+ the far LOD)
finish([o for o in SCN.objects if o.type == 'MESH'])
ALL = [o for o in SCN.objects if o.type == 'MESH']
print('packer_truck tris', tris(ALL))
os.makedirs(OUT, exist_ok=True)
export(os.path.join(OUT, 'packer_truck.glb'), ALL)

# the far LOD: the shell and chassis only (no cab interior, no small parts), collapsed to about a third
STATIC = [o for o in ALL if not any(m.name.startswith(('wheel_', 'blade', 'glass')) for m in o.data.materials)]
SMALL = ('dash', 'seat', 'wheel_ring', 'column', 'spoke', 'lever', 'wiper', 'xmember', 'strap', 'guard_br', 'step_bracket', 'ram_lug', 'hinge', 'propshaft', 'tailpipe')
lod = []
for o in STATIC:
    if o.name.split('.')[0] in SMALL: continue
    c = o.copy(); c.data = o.data.copy(); SCN.collection.objects.link(c)
    if len(c.data.polygons) > 60:
        m = c.modifiers.new('dec', 'DECIMATE'); m.ratio = 0.4
        apply(c)
    lod.append(c)
for o in ALL: o.hide_set(True)
print('packer_truck_lod tris', tris(lod))
export(os.path.join(OUT, 'packer_truck_lod.glb'), lod)
