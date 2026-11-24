"""Our own round-4 models (hand-painted textures in r4_tex/, painted by r4_paint.py), each built to its real size and
converted by lowpix like every other world model (art/lowpix/world/world.json, src = art/lowpix/world/made/<name>.glb).
Front = Blender -y = glTF / game +z.
    tools/blender.sh art/lowpix/world/made/r4_props.py -- <out.glb> <what>
what: twin_tub | recycle_cage | cig | cart | notebook | bush_sign | hatbox | byobu | shrine_roof | shopbag | pod_base | diorama"""
import bpy, bmesh, sys, os, math, random
from mathutils import Vector, Matrix
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
from common import setup, mat, finish
out, what = sys.argv[-2], sys.argv[-1]
TD = os.path.join(H, 'r4_tex')
random.seed(44); setup()
MS = {}
parts = []


def M(n, r=0.6, mt=0.0):
    if n not in MS:
        m = mat(TD, n, r, mt)
        if n == 'rc_mesh':  # wire mesh: cut-out
            try: m.blend_method = 'CLIP'
            except Exception: pass
            nt = m.node_tree; img = [x for x in nt.nodes if x.type == 'TEX_IMAGE'][0]
            nt.links.new(img.outputs['Alpha'], nt.nodes['Principled BSDF'].inputs['Alpha'])
        MS[n] = m
    return MS[n]


def obj(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    for m in mats: o.data.materials.append(M(*m) if isinstance(m, tuple) else M(m))
    parts.append(o)
    return o


def place(bm, loc=(0, 0, 0), rot=(0, 0, 0)):
    R = Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    bmesh.ops.transform(bm, matrix=Matrix.Translation(loc) @ R, verts=bm.verts)


FACES = ('front', 'back', 'left', 'right', 'top', 'bottom')


def box(sx, sy, sz, loc, mats, rot=(0, 0, 0), bev=0.0, wuv=0.0):
    """A box; every face shows its whole texture, upright as seen from outside (or, with wuv, one texture repeat per wuv
    metres: tiles and planks keep their size on every face). mats: one name or {face: name} (+'*')."""
    if isinstance(mats, str): mats = {'*': mats}
    names = []
    for f in FACES:
        n = mats.get(f, mats.get('*'))
        if n not in names: names.append(n)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        n = f.normal
        k = 'front' if n.y < -0.5 else 'back' if n.y > 0.5 else 'left' if n.x < -0.5 else 'right' if n.x > 0.5 else 'top' if n.z > 0.5 else 'bottom'
        f.material_index = names.index(mats.get(k, mats.get('*')))
        for l in f.loops:
            c = l.vert.co
            u, v = {'front': (c.x, c.z), 'back': (-c.x, c.z), 'right': (c.y, c.z), 'left': (-c.y, c.z), 'top': (c.x, c.y), 'bottom': (c.x, -c.y)}[k]
            if wuv:
                su, sv = {'front': (sx, sz), 'back': (sx, sz), 'right': (sy, sz), 'left': (sy, sz), 'top': (sx, sy), 'bottom': (sx, sy)}[k]
                l[uv].uv = ((u + 0.5) * su / wuv + loc[0] / wuv, (v + 0.5) * sv / wuv + loc[2] / wuv)
            else:
                l[uv].uv = (u + 0.5, v + 0.5)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bev > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, profile=0.5, affect='EDGES')
    place(bm, loc, rot)
    return obj('box', bm, names)


def lathe(prof, sides, loc, mt, rot=(0, 0, 0), caps=True, capmat=None, u_rep=1.0):
    """Revolve prof [(r, z), ...] (bottom -> top) about z; u around, v along the profile; flat caps where r > 0."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    L = [0.0]
    for i in range(1, len(prof)): L.append(L[-1] + math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]))
    tot = L[-1] or 1
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / sides), r * math.sin(2 * math.pi * k / sides), z)) for k in range(sides)] for r, z in prof]
    names = [mt] + ([capmat] if capmat and capmat != mt else [])
    for i in range(len(prof) - 1):
        for k in range(sides):
            a, b = rings[i][k], rings[i][(k + 1) % sides]; c, d = rings[i + 1][(k + 1) % sides], rings[i + 1][k]
            f = bm.faces.new((a, b, c, d))
            for l, (uu, vv) in zip(f.loops, ((k, L[i]), (k + 1, L[i]), (k + 1, L[i + 1]), (k, L[i + 1]))):
                l[uv].uv = (uu / sides * u_rep, vv / tot)
    if caps:
        for i, flip in ((0, True), (len(prof) - 1, False)):
            r = prof[i][0]
            if r <= 1e-5: continue
            ring = rings[i][::-1] if flip else rings[i]
            f = bm.faces.new(ring)
            f.material_index = names.index(capmat) if capmat else 0
            for l in f.loops:
                l[uv].uv = (0.5 + l.vert.co.x / (2 * r), 0.5 + l.vert.co.y / (2 * r))
    place(bm, loc, rot)  # (faces are wound outward by construction)
    return obj('lathe', bm, names)


def tube(pts, r, sides, mt, caps=True, vlen=1.0):
    """A tube swept along pts (parallel-transport frames); u around, v = length / vlen."""
    pts = [Vector(p) for p in pts]
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    T = [(pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized() for i in range(len(pts))]
    up = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
    N = T[0].cross(up).normalized(); rings = []; L = [0.0]
    for i, p in enumerate(pts):
        if i: L.append(L[-1] + (p - pts[i - 1]).length); N = (N - T[i] * N.dot(T[i])).normalized()
        B = T[i].cross(N)
        rings.append([bm.verts.new(p + (N * math.cos(2 * math.pi * k / sides) + B * math.sin(2 * math.pi * k / sides)) * r) for k in range(sides)])
    for i in range(len(pts) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            for l, (uu, vv) in zip(f.loops, ((k, L[i]), (k + 1, L[i]), (k + 1, L[i + 1]), (k, L[i + 1]))):
                l[uv].uv = (uu / sides, vv / vlen)
    if caps:
        for ring in (rings[0][::-1], rings[-1]):
            f = bm.faces.new(ring)
            for l in f.loops: l[uv].uv = (0.5, 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj('tube', bm, [mt])


def spline(ctrl, n=10):
    """Catmull-Rom through the control points."""
    P = [Vector(c) for c in ctrl]; P = [P[0]] + P + [P[-1]]; out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-2]); return out


def quad(w, h, loc, mt, rot=(0, 0, 0)):
    """A plane w x h in its local xz (facing -y), the whole texture on it."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    vs = [bm.verts.new((x * w / 2, 0, z * h / 2)) for x, z in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f = bm.faces.new(vs)
    for l, c in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = c
    place(bm, loc, rot)
    return obj('quad', bm, [mt])


# ====================================================================================================== the builds
if what == 'twin_tub':
    W, D = 0.76, 0.44
    box(0.72, 0.40, 0.05, (0, 0, 0.055), 'tt_plinth', bev=0.006)                       # the base pan
    for x in (-0.32, 0.32):
        for y in (-0.16, 0.16): lathe([(0.026, 0.0), (0.03, 0.012), (0.024, 0.03)], 10, (x, y, 0), 'tt_rubber')   # feet
    box(W, D, 0.76, (0, 0, 0.08 + 0.38), {'front': 'tt_front', '*': 'tt_side', 'top': 'tt_deck'}, bev=0.012)  # the cabinet
    box(W + 0.006, D + 0.006, 0.035, (0, 0, 0.84 + 0.0175), 'tt_deck', bev=0.008)       # the top deck rim
    box(0.40, 0.29, 0.022, (-0.15, -0.045, 0.875 + 0.011), {'top': 'tt_lid_wash', '*': 'tt_deck'}, rot=(0.0, 0, 0), bev=0.006)  # wash lid
    box(0.24, 0.29, 0.022, (0.215, -0.045, 0.875 + 0.011), {'top': 'tt_lid_spin', '*': 'tt_deck'}, bev=0.006)  # spin lid
    box(0.13, 0.13, 0.008, (0.215, -0.06, 0.897 + 0.004), {'top': 'tt_window', '*': 'tt_deck'})                 # the spin-drum window
    # the control panel: a raked fascia across the back
    box(W, 0.12, 0.15, (0, 0.17, 0.875 + 0.07), {'front': 'tt_panel', '*': 'tt_deck'}, rot=(math.radians(-18), 0, 0), bev=0.008)
    for x in (-0.2375, 0.0, 0.2375):  # the three dials, on the fascia's printed scales
        k = lathe([(0.038, 0.0), (0.038, 0.022), (0.032, 0.03)], 14, (0, 0, 0), 'tt_knob_side', caps=True, capmat='tt_knob')
        k.rotation_euler = (math.radians(90 - 18), 0, 0); k.location = (x, 0.109, 0.951)
    # hoses: the drain hose out of the right side to the floor, the water inlet over the back
    tube(spline([(0.385, 0.08, 0.16), (0.44, 0.08, 0.14), (0.50, 0.0, 0.05), (0.56, -0.12, 0.025), (0.62, -0.30, 0.025), (0.60, -0.42, 0.04)], 8), 0.018, 10, 'tt_hose', vlen=0.4)
    tube(spline([(-0.25, 0.235, 0.90), (-0.25, 0.30, 0.86), (-0.22, 0.32, 0.70), (-0.18, 0.30, 0.40)], 8), 0.012, 8, 'tt_hose', vlen=0.4)
    finish(parts, out, smooth=False)

elif what == 'recycle_cage':
    W, D, Hc = 0.9, 0.6, 0.86
    t = 0.022
    for x in (-W / 2, W / 2):
        for y in (-D / 2, D / 2): box(t, t, Hc, (x, y, Hc / 2), 'rc_frame')
    for z in (0.03, Hc - 0.01):
        for y in (-D / 2, D / 2): box(W, t, t, (0, y, z), 'rc_frame')
        for x in (-W / 2, W / 2): box(t, D, t, (x, 0, z), 'rc_frame')
    box(W, t, t, (0, -D / 2, Hc * 0.5), 'rc_frame')                                     # a mid rail on the front
    for y, ry in ((-D / 2, 0), (D / 2, math.pi)): quad(W - t, Hc - 0.04, (0, y, Hc / 2), 'rc_mesh', (0, 0, ry))
    for x, ry in ((-W / 2, -math.pi / 2), (W / 2, math.pi / 2)): quad(D - t, Hc - 0.04, (x, 0, Hc / 2), 'rc_mesh', (0, 0, ry))
    quad(W - t, D - t, (0, 0, 0.03), 'rc_mesh', (math.pi / 2, 0, 0))                     # the floor
    # the lid: its own frame, hinged at the back, closed
    for y in (-D / 2, D / 2): box(W, t, t, (0, y, Hc + 0.02), 'rc_frame')
    for x in (-W / 2, W / 2): box(t, D, t, (x, 0, Hc + 0.02), 'rc_frame')
    quad(W - t, D - t, (0, 0, Hc + 0.02), 'rc_mesh', (math.pi / 2, 0, 0))
    box(0.36, 0.006, 0.18, (0, -D / 2 - 0.016, Hc - 0.17), {'front': 'rc_sign', '*': 'rc_frame'})   # the enamel sign
    # inside: PET bottles and cans, laid in loose layers (each in its own cell: nothing passes through anything)
    def bottle(tex, loc, rot):
        P = [(0.0001, 0.0), (0.03, 0.002), (0.033, 0.012), (0.033, 0.13), (0.03, 0.15), (0.018, 0.18), (0.013, 0.19), (0.013, 0.198), (0.015, 0.2), (0.015, 0.214), (0.0001, 0.215)]
        o = lathe(P, 12, (0, 0, 0), tex, caps=False); o.rotation_euler = rot; o.location = loc
    def can(tex, loc, rot, crushed=False):
        P = [(0.0001, 0.0), (0.028, 0.0), (0.033, 0.01), (0.033, 0.11), (0.028, 0.12), (0.027, 0.122), (0.0001, 0.122)]
        o = lathe(P, 12, (0, 0, 0), tex, caps=False)
        if crushed:
            for v in o.data.vertices:
                k = 1 - min(1.0, abs(v.co.z - 0.06) / 0.05); v.co.x *= 1 - 0.5 * k; v.co.y *= 1 + 0.1 * k
        o.rotation_euler = rot; o.location = loc
    z = 0.03 + 0.034
    for layer in range(3):
        rows = 6 if layer < 2 else 4
        for r in range(rows):
            y = -D / 2 + 0.06 + r * 0.088 + (0.044 if layer % 2 else 0)
            if y > D / 2 - 0.05: continue
            x = -W / 2 + 0.04 + random.uniform(0, 0.03)
            while True:
                kind = random.random()
                if kind < 0.55:
                    L = 0.215
                    if x + L > W / 2 - 0.03: break
                    flip = random.random() < 0.5
                    bottle(f'rc_pet{random.randrange(4)}', (x + (L if flip else 0), y, z), (0, math.pi / 2 * (-1 if flip else 1), random.uniform(-0.06, 0.06)))
                else:
                    L = 0.122
                    if x + L > W / 2 - 0.03: break
                    can(f'rc_can{random.randrange(4)}', (x, y, z), (0, math.pi / 2, random.uniform(-0.05, 0.05)), crushed=random.random() < 0.3)
                x += L + random.uniform(0.012, 0.04)
                if layer == 2 and random.random() < 0.35: x += 0.12
        z += 0.068
    finish(parts, out, smooth=False)

elif what == 'cig':
    # along Blender -y (= game +z): filter end at y = 0, the lit end at y = -0.084
    o = lathe([(0.0001, 0.0), (0.0042, 0.0), (0.0042, 0.084), (0.0036, 0.0848), (0.0001, 0.085)], 10, (0, 0, 0), 'cig', caps=False)
    o.rotation_euler = (math.pi / 2, 0, 0)
    finish(parts, out, smooth=True)

elif what == 'cart':
    # the axle at the origin; the frame climbs the back (+y) to the handle; the tartan bag sits on the foot plate
    R = 0.08
    for x in (-0.15, 0.15):
        lathe([(0.055, -0.022), (0.06, -0.022), (R, -0.012), (R, 0.012), (0.06, 0.022), (0.055, 0.022)], 16, (x, 0, 0), 'cart_rubber', rot=(0, math.pi / 2, 0), caps=True, capmat='cart_wheel')
    tube([(-0.17, 0, 0), (0.17, 0, 0)], 0.007, 8, 'cart_frame')                            # the axle
    for x in (-0.12, 0.12):
        tube(spline([(x, 0.03, 0.0), (x, 0.06, 0.2), (x, 0.07, 0.6), (x, 0.06, 0.86)], 6), 0.009, 8, 'cart_frame')
    tube(spline([(-0.12, 0.06, 0.86), (-0.08, 0.06, 0.9), (0.08, 0.06, 0.9), (0.12, 0.06, 0.86)], 6), 0.009, 8, 'cart_frame')
    tube([(-0.075, 0.06, 0.9), (0.075, 0.06, 0.9)], 0.016, 10, 'cart_rubber')               # the foam grip
    box(0.24, 0.17, 0.008, (0, -0.07, 0.02), 'cart_frame', bev=0.002)                         # the foot plate
    tube([(-0.12, 0.03, 0.02), (-0.12, -0.14, 0.02)], 0.006, 6, 'cart_frame'); tube([(0.12, 0.03, 0.02), (0.12, -0.14, 0.02)], 0.006, 6, 'cart_frame')
    # the bag: a soft box with rounded corners (subdivided, pinched at the drawstring)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=3, use_grid_fill=True)
    for v in bm.verts:
        x, y, z = v.co; v.co = Vector((x * 0.24, y * 0.17, (z + 0.5) * 0.52))
        if v.co.z > 0.47: v.co.x *= 0.82; v.co.y *= 0.82                                    # gathered by the drawstring
        v.co.x *= 1 - 0.06 * (1 - abs(v.co.z - 0.26) / 0.26)
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            c = l.vert.co; l[uv].uv = ((c.x + c.y * (1 if f.normal.x >= 0 else -1)) / 0.43 + 0.5, c.z / 0.52)
    place(bm, (0, -0.07, 0.026))
    obj('bag', bm, ['cart_bag'])
    finish(parts, out, smooth=False)

elif what == 'notebook':
    w, h, th = 0.15, 0.21, 0.016
    box(w, h, 0.0025, (0, 0, 0.00125), 'nb_cover', bev=0.0008)                                # back cover
    box(w - 0.006, h - 0.008, th - 0.005, (0.002, 0, 0.0025 + (th - 0.005) / 2), {'top': 'nb_pages', 'bottom': 'nb_pages', '*': 'nb_pages'})
    box(w, h, 0.0025, (0, 0, th - 0.00125), {'top': 'nb_cover', '*': 'nb_spine'}, bev=0.0008)    # front cover
    box(0.012, h, th, (-w / 2 + 0.004, 0, th / 2), 'nb_spine', bev=0.002)                    # the cloth spine
    finish(parts, out, smooth=False)

elif what == 'bush_sign':
    box(0.44, 0.012, 0.22, (0, 0, 0.62), {'front': 'sign_card', 'back': 'sign_card', '*': 'sign_stick'}, rot=(0.0, 0.05, 0))
    box(0.024, 0.02, 0.74, (0, 0.016, 0.37), 'sign_stick', bev=0.003)
    finish(parts, out, smooth=False)

elif what == 'hatbox':
    r, hgt = 0.17, 0.15
    lathe([(0.0001, 0.0), (r, 0.0), (r, hgt)], 28, (0, 0, 0), 'hb_side', caps=False)
    lathe([(r + 0.006, hgt - 0.035), (r + 0.006, hgt + 0.004)], 28, (0, 0, 0), 'hb_rim', caps=True, capmat='hb_lid')
    tube(spline([(-0.06, -r - 0.004, hgt + 0.005), (-0.04, -r - 0.02, hgt + 0.06), (0.04, -r - 0.02, hgt + 0.06), (0.06, -r - 0.004, hgt + 0.005)], 6), 0.004, 6, 'hb_rim')
    finish(parts, out, smooth=True)

elif what == 'byobu':
    # six panels zig-zagging, 1.44 m across, 0.6 m tall; gold leaf, lacquered frames, brass corners
    n, pw, ph, a = 6, 0.25, 0.6, math.radians(20)
    x = -n * pw * math.cos(a) / 2
    for i in range(n):  # a zig-zag: every panel's ends on the line y = 0, their middles alternately forward and back
        ang = a if i % 2 == 0 else -a
        cx = x + pw * math.cos(a) / 2
        box(pw - 0.016, 0.012, ph - 0.03, (cx, 0, ph / 2), {'front': 'by_gold', 'back': 'by_gold', '*': 'by_lacquer'}, rot=(0, 0, ang))
        for dz in (0.008, ph - 0.008):
            box(pw, 0.018, 0.016, (cx, 0, dz), 'by_lacquer', rot=(0, 0, ang))
        for e in (-1, 1):  # the stiles, with a brass corner fitting at each end
            ex = cx + e * (pw / 2 - 0.008) * math.cos(ang); ey = e * (pw / 2 - 0.008) * math.sin(ang)
            box(0.016, 0.018, ph, (ex, ey, ph / 2), 'by_lacquer', rot=(0, 0, ang))
            for dz in (0.012, ph - 0.012): box(0.02, 0.022, 0.024, (ex, ey, dz), 'by_brass', rot=(0, 0, ang))
        x += pw * math.cos(a)
    finish(parts, out, smooth=False)

elif what == 'shrine_roof':
    # a gabled roof for the 1.0 x 0.5 shrine case: two copper slopes, a ridge with katsuogi logs, gold end caps
    L, run, rise = 1.08, 0.31, 0.15
    s = math.atan2(rise, run)
    for sgn in (-1, 1):
        box(L, math.hypot(run, rise), 0.02, (0, sgn * run / 2, rise / 2), {'top': 'sr_copper', '*': 'sr_wood'}, rot=(-sgn * s, 0, 0))
    box(L + 0.04, 0.05, 0.05, (0, 0, rise + 0.01), 'sr_wood', bev=0.004)                     # the ridge beam
    for x in (-0.33, -0.11, 0.11, 0.33): lathe([(0.018, -0.07), (0.018, 0.07)], 10, (x, 0, rise + 0.053), 'sr_wood', rot=(math.pi / 2, 0, 0), caps=True, capmat='sr_gold')
    for x in (-L / 2 - 0.02, L / 2 + 0.02):
        for sgn in (-1, 1):  # chigi: the crossed boards at both gables
            box(0.016, 0.2, 0.03, (x, sgn * 0.05, rise + 0.07), 'sr_wood', rot=(-sgn * math.radians(55), 0, 0))
    for sgn in (-1, 1): box(L, 0.03, 0.03, (0, sgn * (run + 0.005), -0.01), 'sr_gold')        # the eaves' gold edge
    for x, flip in ((-L / 2 + 0.03, True), (L / 2 - 0.03, False)):                          # the gable boards under the roof
        bm = bmesh.new(); uv = bm.loops.layers.uv.new()
        pts = [(-run + 0.02, 0.0), (run - 0.02, 0.0), (0.0, rise - 0.01)]
        vs = [bm.verts.new((x, py, pz)) for py, pz in pts]
        f = bm.faces.new(vs[::-1] if flip else vs)
        for l in f.loops: l[uv].uv = (l.vert.co.y / (2 * run) + 0.5, l.vert.co.z / rise)
        bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.012)
        obj('gable', bm, ['sr_wood'])
    finish(parts, out, smooth=False)

elif what == 'shopbag':
    # a plastic carrier bag with groceries in it: a soft bulging body, the top gathered into two handle loops
    W, Dp, Hb = 0.26, 0.12, 0.28
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=4, use_grid_fill=True)
    for v in bm.verts:
        x, y, z = v.co; t = z + 0.5
        bul = 1 + 0.18 * math.sin(math.pi * min(1, t * 1.15))                                 # bulging with shopping
        top = 1 - 0.35 * max(0, t - 0.8) / 0.2                                                # gathered at the mouth
        v.co = Vector((x * W * bul * top + random.uniform(-0.004, 0.004), y * Dp * bul * top * (0.8 if t > 0.9 else 1) + random.uniform(-0.004, 0.004), t * Hb))
    uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        for l in f.loops:
            c = l.vert.co; side = c.x if abs(f.normal.y) > abs(f.normal.x) else c.y
            l[uv].uv = (side / W + 0.5, c.z / Hb)
    obj('bag', bm, ['sb_plastic'])
    for sx in (-1, 1):                                                                        # the two handles
        tube(spline([(sx * 0.1, -0.03, Hb - 0.01), (sx * 0.085, -0.02, Hb + 0.07), (sx * 0.055, 0.0, Hb + 0.1), (sx * 0.03, 0.02, Hb + 0.07), (sx * 0.02, 0.03, Hb - 0.01)], 5), 0.007, 6, 'sb_plastic', vlen=0.2)
    finish(parts, out, smooth=True)

elif what == 'ofuro':
    # a deep Japanese tub: sky-blue tiles outside and in, a hinoki rim, a chrome inlet; inner floor at 8 cm
    W, D, Hh, t = 1.02, 0.74, 0.6, 0.05
    for y, f in ((-D / 2 + t / 2, 'front'), (D / 2 - t / 2, 'back')):
        inner = 'back' if f == 'front' else 'front'
        box(W, t, Hh - 0.03, (0, y, (Hh - 0.03) / 2), {f: 'tb_tile', inner: 'tb_tile_in', '*': 'tb_tile'}, wuv=0.5)
    for x, f in ((-W / 2 + t / 2, 'left'), (W / 2 - t / 2, 'right')):
        inner = 'right' if f == 'left' else 'left'
        box(t, D - 2 * t, Hh - 0.03, (x, 0, (Hh - 0.03) / 2), {f: 'tb_tile', inner: 'tb_tile_in', '*': 'tb_tile'}, wuv=0.5)
    box(W - 2 * t, D - 2 * t, 0.08, (0, 0, 0.04), 'tb_tile_in', wuv=0.5)
    for y in (-D / 2 + 0.03, D / 2 - 0.03): box(W + 0.02, 0.08, 0.035, (0, y, Hh - 0.0175), 'tb_hinoki', bev=0.004)
    for x in (-W / 2 + 0.03, W / 2 - 0.03): box(0.08, D - 0.14, 0.035, (x, 0, Hh - 0.0175), 'tb_hinoki', bev=0.004)
    o = lathe([(0.032, 0.0), (0.032, 0.012), (0.022, 0.02), (0.0001, 0.02)], 14, (0, 0, 0), 'tb_chrome', caps=True, capmat='tb_chrome')
    o.rotation_euler = (0, -math.pi / 2, 0); o.location = (W / 2 - t, 0.0, 0.22)               # the inlet on the inner wall
    finish(parts, out, smooth=False)

elif what == 'pod_base':
    r = 0.48
    lathe([(0.0001, 0.0), (r, 0.0), (r, 0.02), (r - 0.01, 0.03), (r - 0.01, 0.26), (r, 0.27), (r, 0.29)], 48, (0, 0, 0), 'sp_side', caps=False, u_rep=4)
    lathe([(r - 0.002, 0.29), (r - 0.03, 0.30)], 48, (0, 0, 0), 'sp_side', caps=True, capmat='sp_top')
    finish(parts, out, smooth=True)

elif what == 'diorama':
    # 1.42 x 0.9 landscape for the diorama table: rolling hills, a river, flat plots where the toys stand (8 slots)
    W, Dd, N, M_ = 1.42, 0.9, 72, 46
    slots = [(-0.6 + (i % 4) * 0.4, (-0.28 if i < 4 else 0.28)) for i in range(8)]
    def ht(x, y):
        river = y - math.sin((x + W / 2) / W * 6.283 * 1.1) * 0.1125   # the painted river's line (r4_paint.py)
        h = 0.05 + 0.025 * math.sin(x * 5.0) * math.cos(y * 6.0) + (0.05 * (-x - 0.45) / 0.26 if x < -0.45 else 0)
        h = max(0.012, min(0.12, h))
        rv = abs(river) / 0.045
        if rv < 1: h = 0.008 + (h - 0.008) * rv ** 2
        for sx, sy in slots:
            d = math.hypot(x - sx, y - sy) / 0.11
            if d < 1: k = (1 - d) ** 0.5 if d > 0.6 else 1.0; h = h + (0.07 - h) * min(1, k * 1.2)
        return h
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    V = [[bm.verts.new(((i / N - 0.5) * W, (j / M_ - 0.5) * Dd, ht((i / N - 0.5) * W, (j / M_ - 0.5) * Dd))) for i in range(N + 1)] for j in range(M_ + 1)]
    for j in range(M_):
        for i in range(N):
            f = bm.faces.new((V[j][i], V[j][i + 1], V[j + 1][i + 1], V[j + 1][i]))
            for l in f.loops: l[uv].uv = (l.vert.co.x / W + 0.5, 1 - (l.vert.co.y / Dd + 0.5))
    obj('terrain', bm, ['dio_top'])
    # the skirt round the edge
    for (x0, y0, x1, y1) in ((-W / 2, -Dd / 2, W / 2, -Dd / 2), (W / 2, -Dd / 2, W / 2, Dd / 2), (W / 2, Dd / 2, -W / 2, Dd / 2), (-W / 2, Dd / 2, -W / 2, -Dd / 2)):
        bm = bmesh.new(); uv = bm.loops.layers.uv.new(); n = 40; vs = []
        for k in range(n + 1):
            x = x0 + (x1 - x0) * k / n; y = y0 + (y1 - y0) * k / n
            vs.append((bm.verts.new((x, y, 0.0)), bm.verts.new((x, y, ht(x, y)))))
        for k in range(n):
            f = bm.faces.new((vs[k][0], vs[k + 1][0], vs[k + 1][1], vs[k][1]))
            for l, c in zip(f.loops, ((k / n, 0), ((k + 1) / n, 0), ((k + 1) / n, 1), (k / n, 1))): l[uv].uv = c
        obj('skirt', bm, ['dio_side'])  # (wound outward: the edges run anticlockwise)
    finish(parts, out, smooth=True)
