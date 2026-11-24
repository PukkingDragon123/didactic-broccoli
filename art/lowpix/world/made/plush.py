"""Our own piggy bank and plush bears (the owner asked for these to be made by us, not imported). Modelled here in
Blender (skin-modifier armatures and lofted, extruded cages under subdivision, then reduced to the prop budget), and
painted here: every brush mark is placed on the model in 3D (fur clumps that follow the nap, sewn seams, glaze strokes)
and inked decals (faces, flowers, stitches, the patch) are drawn by hand with PIL and projected onto the surface, all
baked into the model's own UV atlas (saved in plush_tex/<name>.png). Converted by lowpix like every other world model
(art/lowpix/world/world.json: piggy_bank_c, teddy, teddy2). Front = Blender -y = glTF / game +z; origin bottom centre.
    tools/blender.sh art/lowpix/world/made/plush.py -- <out.glb> <piggy | teddy | teddy_old>
piggy: a Showa ceramic chokinbako in pink glaze: barrel body lofted ring by ring into the head, the snout extruded to a
  flat disc with nostrils, ears pulled out of the head and thinned, four stubby legs extruded to hooves, a coin slot
  sunk into the back, a curly tail, a rubber stopper underneath; painted plum blossoms on both flanks, a red collar with
  a gold bell, inked eyes and brows, hatched blush, glaze sheen and pooling, a few chips showing the white body.
teddy: a classic seated mohair bear (0.30 m): chubby, round head, short trimmed muzzle with a satin-stitched nose and a
  stitched smile, embroidered ink eyes, felt paw and foot pads with stitched edges, a red satin bow at the neck.
teddy_old: an old 1920s-style bear (0.25 m), slumped and worn: a hump on the back, long arms, a long pointed snout,
  big feet, the head tilted; balding mohair, darned pads, a gingham patch blanket-stitched over one elbow, an ear sewn
  back on in other thread, mismatched shoe-button eyes and a frayed nose."""
import bpy, bmesh, sys, os, math, random
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from PIL import Image, ImageDraw

H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
from common import setup
out, what = sys.argv[-2], sys.argv[-1]
TD = os.path.join(H, 'plush_tex')
os.makedirs(TD, exist_ok=True)
random.seed(what)
setup()
OBJS = []
S = 1024                                                                         # source atlas (lowpix resamples to ppm)


# ============================================================================================================ modelling
def mk(name, me, part):
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(bpy.data.materials.get(part) or bpy.data.materials.new(part)); OBJS.append(o); return o


def bm_obj(name, bm, part):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); return mk(name, me, part)


def apply_mods(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear(); o.data = me
    return o


def tris(o):
    o.data.calc_loop_triangles(); return len(o.data.loop_triangles)


def reduce(o, target):
    n = tris(o)
    if n > target:
        d = o.modifiers.new('dec', 'DECIMATE'); d.ratio = target / n; d.use_collapse_triangulate = False
        apply_mods(o)
    return o


def skin(name, nodes, edges, part, sub=2, smooth=0.6):
    """A skin-modifier armature (nodes: (pos, rx, ry)), subdivided: one connected stuffed surface."""
    me = bpy.data.meshes.new(name); me.from_pydata([Vector(n[0]) for n in nodes], edges, [])
    o = mk(name, me, part)
    m = o.modifiers.new('skin', 'SKIN'); m.branch_smoothing = smooth
    sv = me.skin_vertices[0].data
    for i, n in enumerate(nodes): sv[i].radius = (n[1], n[2])
    sv[0].use_root = True
    s = o.modifiers.new('sub', 'SUBSURF'); s.levels = sub
    return apply_mods(o)


def sculpt(name, elems, part, faces, res=0.0022):
    """A soft stuffed volume (metaball sculpt: ('ell', centre, semi-axes, rotation, negative) or ('cap', centre, (half
    length, radius), rotation, negative)), meshed fine, then retopologised by QuadriFlow into ~faces clean quads."""
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = 0.6
    o = bpy.data.objects.new(name, mb); bpy.context.collection.objects.link(o)
    for kind, co, ax, rot, neg in elems:
        e = mb.elements.new(); e.co = Vector(co); e.stiffness = 2.0; e.use_negative = neg
        if kind == 'ell':
            m = max(ax); e.type = 'ELLIPSOID'; e.radius = m / 0.574; e.size_x, e.size_y, e.size_z = [x / m for x in ax]
        else:
            e.type = 'CAPSULE'; e.radius = ax[1] / 0.574; e.size_x = ax[0]
        if rot is not None: e.rotation = rot
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bpy.data.objects.remove(o)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=res * 0.05)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=res * 0.02)
    for _ in range(4):                                                             # mend the polygoniser's odd pinched spot
        bad = [v for v in bm.verts if not v.is_manifold]
        if not bad: break
        bmesh.ops.delete(bm, geom=list({f for v in bad for f in v.link_faces}), context='FACES')
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
        bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    # keep the outer shell only (the polygoniser can leave a stray inner pocket)
    seen, comps = set(), []
    for f0 in bm.faces:
        if f0 in seen: continue
        stack, comp = [f0], []
        seen.add(f0)
        while stack:
            f = stack.pop(); comp.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g not in seen: seen.add(g); stack.append(g)
        comps.append(comp)
    if len(comps) > 1:
        comps.sort(key=len)
        bmesh.ops.delete(bm, geom=[f for c in comps[:-1] for f in c], context='FACES')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    print('shell', name, len(comps), 'parts; non-manifold', sum(1 for e in bm.edges if not e.is_manifold), sum(1 for v in bm.verts if not v.is_manifold))
    bm.to_mesh(me); bm.free()
    ob = mk(name, me, part)
    for x in bpy.context.selected_objects: x.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    n0 = len(ob.data.polygons)
    r = bpy.ops.object.quadriflow_remesh(target_faces=faces, seed=3)
    if 'FINISHED' not in r:                                                      # QuadriFlow balks at the fine shell: ease it down first
        reduce(ob, 5000)
        bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(ob.data); bm.free()
        r = bpy.ops.object.quadriflow_remesh(target_faces=faces, seed=3)
        if 'FINISHED' not in r: reduce(ob, faces * 2)
    print('sculpt', name, n0, '->', len(ob.data.polygons), r)
    if not ob.data.materials: ob.data.materials.append(bpy.data.materials.get(part))
    return ob


def subsurf(o, lv=1):
    s = o.modifiers.new('sub', 'SUBSURF'); s.levels = lv; return apply_mods(o)


def frame(T, up=Vector((0, 0, 1))):
    B = up - T * up.dot(T)
    if B.length < 1e-6: B = Vector((0, 1, 0)) - T * T.y
    B.normalize(); N = T.cross(B).normalized()
    return N, B


def sweep(name, pts, rx, ry, part, sides=6, up=Vector((0, 0, 1)), closed=False):
    """A tube along pts with an elliptical section (rx along N, ry along B); per-point radii allowed."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    rx = rx if isinstance(rx, (list, tuple)) else [rx] * n; ry = ry if isinstance(ry, (list, tuple)) else [ry] * n
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        a, b = (pts[(i + 1) % n], pts[i - 1]) if closed else (pts[min(i + 1, n - 1)], pts[max(i - 1, 0)])
        T = (a - b).normalized(); N, B = frame(T, up)
        rings.append([bm.verts.new(p + N * math.cos(2 * math.pi * k / sides) * rx[i] + B * math.sin(2 * math.pi * k / sides) * ry[i]) for k in range(sides)])
    for i in range(n if closed else n - 1):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(sides): bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))
    if not closed:
        bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_obj(name, bm, part)


def spline(ctrl, n=6):
    P = [Vector(c) for c in ctrl]; P = [P[0]] + P + [P[-1]]; o = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n; o.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    o.append(P[-2]); return o


def lathe(name, prof, sides, loc, part):
    bm = bmesh.new()
    rings = [[bm.verts.new((loc[0] + r * math.cos(2 * math.pi * k / sides), loc[1] + r * math.sin(2 * math.pi * k / sides), loc[2] + z)) for k in range(sides)] for r, z in prof]
    for i in range(len(prof) - 1):
        for k in range(sides): bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm_obj(name, bm, part)


def join(objs):
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    return bpy.context.view_layer.objects.active


# ------------------------------------------------------------------------------------------------ the piggy bank
def build_piggy():
    SIDES = 12
    # (y, half-width, half-height, centre z) from the rump (+y) to the snout (-y): rump, barrel, shoulders, cheeks, snout
    RINGS = [(0.106, 0.017, 0.016, 0.074), (0.098, 0.041, 0.038, 0.073), (0.082, 0.057, 0.051, 0.072), (0.060, 0.065, 0.057, 0.071),
             (0.030, 0.069, 0.059, 0.071), (0.000, 0.069, 0.059, 0.072), (-0.025, 0.066, 0.057, 0.074), (-0.050, 0.059, 0.053, 0.078),
             (-0.072, 0.051, 0.047, 0.082), (-0.088, 0.039, 0.036, 0.079), (-0.097, 0.026, 0.023, 0.074), (-0.113, 0.024, 0.021, 0.073)]
    bm = bmesh.new(); R = []
    cl = bm.edges.layers.float.get('crease_edge') or bm.edges.layers.float.new('crease_edge')
    p = 2.25
    for y, a, b, zc in RINGS:
        ring = []
        for k in range(SIDES):
            t = 2 * math.pi * k / SIDES; c, s = math.cos(t), math.sin(t)
            ring.append(bm.verts.new((a * math.copysign(abs(c) ** (2 / p), c), y, zc + b * math.copysign(abs(s) ** (2 / p), s))))
        R.append(ring)
    F = {}
    for i in range(len(R) - 1):
        for k in range(SIDES): F[(i, k)] = bm.faces.new((R[i][k], R[i + 1][k], R[i + 1][(k + 1) % SIDES], R[i][(k + 1) % SIDES]))
    bm.faces.new(R[0][::-1])                                                     # the rump (the tail hides the pole)
    snout = bm.faces.new(R[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # the snout: a rolled rim, then the flat nose disc pushed out a touch
    r = bmesh.ops.inset_region(bm, faces=[snout], thickness=0.0035, depth=0.0015)
    for e in {e for f in [snout] for e in f.edges}: e[cl] = 0.7
    r = bmesh.ops.inset_region(bm, faces=[snout], thickness=0.002, depth=-0.0008)

    def extrude(face, cx, cy, hx, hy, z, tilt=(0, 0)):
        fc = face.calc_center_median()
        nf = bmesh.ops.extrude_discrete_faces(bm, faces=[face])['faces'][0]
        if face.is_valid: bmesh.ops.delete(bm, geom=[face], context='FACES_ONLY')
        for v in nf.verts:
            sx = 1 if v.co.x > fc.x else -1; sy = 1 if v.co.y > fc.y else -1
            v.co = Vector((cx + sx * hx + tilt[0], cy + sy * hy + tilt[1], z))
        return nf
    # four stubby legs out of the belly (two extrusions each: the leg, then a tight loop that keeps the hoof flat)
    for i, ly in ((3, 0.045), (6, -0.0375)):
        for k, sx in ((7, -1), (10, 1)):                                          # faces at 210-240 and 300-330 degrees
            f = F[(i, k)]
            f = extrude(f, sx * 0.044, ly, 0.0165, 0.016, 0.013)
            f = extrude(f, sx * 0.045, ly, 0.0148, 0.0145, 0.0022)
            f = extrude(f, sx * 0.045, ly, 0.0125, 0.0122, 0.0)
            for e in f.edges: e[cl] = 0.5
    # the ears: pulled up out of the head, thinned front to back, tipped forward and out
    for k, sx in ((1, 1), (4, -1)):                                                # faces at 30-60 and 120-150 degrees
        f = F[(7, k)]
        f = extrude(f, sx * 0.041, -0.062, 0.0165, 0.0058, 0.132)
        f = extrude(f, sx * 0.048, -0.071, 0.0105, 0.0042, 0.145)
        f = extrude(f, sx * 0.054, -0.080, 0.0035, 0.0022, 0.153)
    # the coin slot: the two faces astride the spine on the back, inset, squeezed to a slot and sunk
    top = [F[(4, 2)], F[(4, 3)]]
    ins = bmesh.ops.inset_region(bm, faces=top, thickness=0.004, depth=0)
    vs = {v for f in top for v in f.verts}
    for v in vs:
        v.co.y = 0.015 + (0.0022 if v.co.y > 0.015 else -0.0022)
        v.co.x = 0.0 if abs(v.co.x) < 0.004 else math.copysign(0.0145, v.co.x)
    for e in {e for f in top for e in f.edges}:
        if all(v in vs for v in e.verts) and len([f for f in e.link_faces if f in top]) == 1: e[cl] = 1.0
    ext = bmesh.ops.extrude_face_region(bm, geom=top)
    nv = [g for g in ext['geom'] if isinstance(g, bmesh.types.BMVert)]
    for v in nv: v.co.z -= 0.009
    old = [f for f in top if f.is_valid]
    if old: bmesh.ops.delete(bm, geom=old, context='FACES_ONLY')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    body = bm_obj('body', bm, 'glaze')
    subsurf(body, 1)
    reduce(body, 1600)
    # the curly tail: out of the rump, a tight one-and-a-half turn curl
    pts = []
    for i in range(18):
        t = i / 17; a = -1.4 + t * 2.6 * math.pi
        rr = 0.0078 * (1 - 0.3 * t)
        pts.append((rr * math.sin(a), 0.113 + 0.007 * t, 0.083 + rr * math.cos(a) + 0.003 * t))
    pts = [(0.0, 0.100, 0.080)] + pts
    rad = [0.0046 - 0.0019 * i / 18 for i in range(19)]
    sweep('tail', pts, rad, rad, 'glaze', sides=6, up=Vector((0, 1, 0)))
    # the rubber stopper in the belly: a ridged plug with a pull tab
    lathe('stopper', [(0.0001, -0.0045), (0.0105, -0.0045), (0.0125, -0.0028), (0.0118, -0.0012), (0.0132, 0.0), (0.0132, 0.006)], 12, (0, 0.012, 0.0155), 'rubber')
    sweep('tab', [(-0.005, 0.012, 0.0115), (0.0, 0.012, 0.0098), (0.005, 0.012, 0.0115)], 0.0018, 0.0035, 'rubber', sides=4, up=Vector((0, 1, 0)))


# ------------------------------------------------------------------------------------------------------ the bears
def rot_about(p, c, axis, ang):
    return tuple(Matrix.Rotation(ang, 3, axis) @ (Vector(p) - Vector(c)) + Vector(c))


BEAR = {}
TILT = 16                                                                          # the old bear's lolling head (degrees)


def build_bear(old):
    N = {}
    if not old:   # the classic seated bear: chubby, round head, short muzzle
        N.update(seat=((0, 0.012, 0.057), 0.060, 0.055), belly=((0, 0.004, 0.097), 0.064, 0.058), chest=((0, 0.010, 0.140), 0.051, 0.045),
                 neck=((0, 0.012, 0.168), 0.040, 0.036), head=((0, 0.006, 0.212), 0.063, 0.057), crown=((0, 0.012, 0.244), 0.051, 0.046),
                 muz=((0, -0.046, 0.200), 0.031, 0.027), mtip=((0, -0.066, 0.196), 0.023, 0.020))
        for s, k in ((1, 'L'), (-1, 'R')):
            N.update({'hip' + k: ((s * 0.040, -0.012, 0.050), 0.034, 0.034), 'knee' + k: ((s * 0.052, -0.066, 0.036), 0.033, 0.032),
                      'foot' + k: ((s * 0.056, -0.100, 0.040), 0.033, 0.032), 'sole' + k: ((s * 0.057, -0.111, 0.054), 0.029, 0.034),
                      'sh' + k: ((s * 0.048, 0.010, 0.150), 0.027, 0.027), 'elb' + k: ((s * 0.084, -0.010, 0.122), 0.025, 0.025),
                      'paw' + k: ((s * 0.090, -0.040, 0.098), 0.024, 0.022), 'pawt' + k: ((s * 0.087, -0.060, 0.088), 0.020, 0.019)})
    else:         # the old one: slimmer, a hump, long arms down to the floor, big feet, long snout, the head lolling
        N.update(seat=((0, 0.016, 0.050), 0.050, 0.046), belly=((0, 0.010, 0.088), 0.052, 0.048), chest=((0, 0.020, 0.127), 0.045, 0.043),
                 hump=((0, 0.044, 0.140), 0.034, 0.030), neck=((0.003, 0.014, 0.158), 0.031, 0.029), head=((0.004, 0.006, 0.193), 0.049, 0.045),
                 crown=((0.004, 0.012, 0.220), 0.039, 0.037), muz=((0.004, -0.040, 0.183), 0.024, 0.022), mtip=((0.004, -0.070, 0.177), 0.0145, 0.0135))
        for s, k in ((1, 'L'), (-1, 'R')):
            fw = 0.006 if s > 0 else -0.004
            N.update({'hip' + k: ((s * 0.034, -0.006, 0.044), 0.030, 0.030), 'knee' + k: ((s * 0.045, -0.060, 0.029), 0.027, 0.027),
                      'foot' + k: ((s * 0.049, -0.098, 0.030), 0.027, 0.027), 'sole' + k: ((s * 0.051, -0.114, 0.047), 0.026, 0.036),
                      'sh' + k: ((s * 0.040, 0.014, 0.140), 0.022, 0.022)})
            if s > 0:   # the bear's left arm rests forward by the thigh, the right hangs down beside it, paw on the floor
                N.update({'elbL': ((0.074, 0.000, 0.104), 0.021, 0.021), 'pawL': ((0.087, -0.030, 0.071), 0.019, 0.019), 'pawtL': ((0.089, -0.050, 0.052), 0.017, 0.015)})
            else:
                N.update({'elbR': ((-0.074, 0.016, 0.098), 0.021, 0.021), 'pawR': ((-0.085, 0.010, 0.057), 0.019, 0.019), 'pawtR': ((-0.087, -0.004, 0.024), 0.017, 0.015)})
        # the head lolls to the bear's left and drops forward a little, about the neck
        for k in ('head', 'crown', 'muz', 'mtip'):
            p, a, b = N[k]
            p = rot_about(p, N['neck'][0], 'Y', math.radians(-TILT)); p = rot_about(p, N['neck'][0], 'X', math.radians(-7))
            N[k] = (p, a, b)
    names = list(N.keys()); ix = {k: i for i, k in enumerate(names)}
    E = [('seat', 'belly'), ('belly', 'chest'), ('chest', 'neck'), ('neck', 'head'), ('head', 'crown'), ('head', 'muz'), ('muz', 'mtip')]
    for k in 'LR':
        E += [('seat', 'hip' + k), ('hip' + k, 'knee' + k), ('knee' + k, 'foot' + k), ('foot' + k, 'sole' + k),
              ('chest', 'sh' + k), ('sh' + k, 'elb' + k), ('elb' + k, 'paw' + k), ('paw' + k, 'pawt' + k)]
    if old: E.append(('chest', 'hump'))
    # the stuffed body, sculpted as one soft volume from the pattern pieces' shapes (a padded form per node, a limb along
    # each edge), then retopologised into clean quads at the prop budget
    el = []
    for k in names:
        p, rx, ry = N[k]
        if k.startswith('sole'): el.append(('ell', p, (rx * 0.95, 0.017 if not old else 0.016, ry * 0.95), None, False))
        else: el.append(('ell', p, (rx * 0.93, ry * 0.93, (rx + ry) / 2 * 0.93), None, False))
    for a_, b_ in E:
        pa, pb = Vector(N[a_][0]), Vector(N[b_][0])
        el.append(('cap', (pa + pb) / 2, ((pb - pa).length / 2, min(N[a_][1], N[b_][1]) * 0.78), Vector((1, 0, 0)).rotation_difference(pb - pa), False))
    if not old:
        for s in (1, -1): el.append(('ell', (s * 0.027, -0.030, 0.203), (0.026, 0.024, 0.026), None, False))      # full cheeks
    else:
        hp_ = Vector(N['head'][0])
        for s in (1, -1): el.append(('ell', tuple(Vector(rot_about((s * 0.022, -0.020, 0.188), hp_, 'Y', math.radians(-TILT)))), (0.019, 0.019, 0.02), None, False))
    body = sculpt('body', el, 'fur', 640 if not old else 720)
    # the seat sits flat on the shelf
    zmin = min(v.co.z for v in body.data.vertices)
    for v in body.data.vertices:
        if v.co.z < zmin + 0.004: v.co.z = zmin + 0.004 - (zmin + 0.004 - v.co.z) * 0.25
    # ears: stuffed, cupped lobes, each its own sewn piece set into the head
    hp, hr = Vector(N['head'][0]), N['head'][1]
    ears = []
    for s in (1, -1):
        if not old:
            base = hp + Vector((s * 0.040, 0.010, 0.040)); up_ = Vector((s * 0.45, 0.05, 1.0)).normalized(); w, t_, h = 0.027, 0.0105, 0.023
        else:
            lift = 0.0 if s > 0 else -0.007                                       # the bear's right ear: sewn back on lower
            base = hp + Vector((s * 0.033, 0.010, 0.031 + lift)); up_ = Vector((s * 0.7, 0.05, 1.0)).normalized(); w, t_, h = 0.022, 0.009, 0.019
            base = Vector(rot_about(base, hp, 'Y', math.radians(-TILT))); up_ = Matrix.Rotation(math.radians(-TILT), 3, 'Y') @ up_
        q = Vector((0, 0, 1)).rotation_difference(up_)
        c = base + up_ * h * 0.75
        fwd = q @ Vector((0, -1, 0))
        e = sculpt('ear' + ('L' if s > 0 else 'R'), [('ell', c, (w, t_, h), q, False), ('ell', c + fwd * t_ * 1.1 + up_ * 0.003, (w * 0.62, t_ * 0.6, h * 0.62), q, True)], 'ear', 56)
        ears.append((base, c + up_ * h * 0.9, s))
    BEAR.update(N=N, E=E, ears=ears, old=old)
    if not old:   # the red satin bow at the neck: a band round it, two loops, two tails and the knot
        nk = Vector(N['neck'][0])
        bvh = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
        band = []
        for i in range(20):                                                       # wrapped snug round the neck as it is
            a = 2 * math.pi * i / 20; d = Vector((math.cos(a), math.sin(a), 0)); c = nk + Vector((0, 0, 0.002 - 0.004 * math.sin(a)))
            loc = bvh.ray_cast(c + d * 0.2, -d)[0]
            band.append(loc + d * 0.0016)
        sweep('band', band, 0.0022, 0.0075, 'ribbon', sides=4, closed=True)
        kc = band[15] + Vector((0, -0.004, -0.002))                                # (i = 15: the front, a = 270 degrees)
        for s in (1, -1):
            loop = spline([kc, kc + Vector((s * 0.018, -0.006, 0.012)), kc + Vector((s * 0.034, -0.003, 0.010)), kc + Vector((s * 0.036, -0.001, -0.004)),
                           kc + Vector((s * 0.020, -0.005, -0.006)), kc + Vector((s * 0.004, -0.002, -0.001))], 2)
            sweep('loop', loop, 0.0022, [0.006 + 0.003 * math.sin(math.pi * i / (len(loop) - 1)) for i in range(len(loop))], 'ribbon', sides=4, up=Vector((0, -1, 0)))
            tail = [kc + Vector((s * 0.003, -0.002, -0.004)), kc + Vector((s * 0.010, -0.004, -0.020)), kc + Vector((s * 0.017, -0.002, -0.034))]
            sweep('tail', tail, 0.0018, [0.0065, 0.0065, 0.0075], 'ribbon', sides=4, up=Vector((0, -1, 0)))
        sweep('knot', [kc + Vector((-0.006, 0.001, 0)), kc + Vector((0, -0.003, 0)), kc + Vector((0.006, 0.001, 0))], 0.0045, 0.0075, 'ribbon', sides=6, up=Vector((0, 0, 1)))


# ============================================================================================================= painting
def unwrap(O):
    for o in bpy.context.selected_objects: o.select_set(False)
    O.select_set(True); bpy.context.view_layer.objects.active = O
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(58), island_margin=0.006, area_weight=0.0, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode='OBJECT')


def texels(O):
    """Every atlas texel the model covers: its pixel, 3D position, smooth normal and part."""
    me = O.data; me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tl = np.zeros(nt * 3, np.int64); me.loop_triangles.foreach_get('loops', tl); tl = tl.reshape(-1, 3)
    tv = np.zeros(nt * 3, np.int64); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
    tm = np.zeros(nt, np.int64); me.loop_triangles.foreach_get('material_index', tm)
    uv = np.zeros(len(me.loops) * 2); me.uv_layers.active.data.foreach_get('uv', uv); uv = uv.reshape(-1, 2) * S
    co = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    vn = np.zeros(len(me.vertices) * 3); me.vertices.foreach_get('normal', vn); vn = vn.reshape(-1, 3)
    PX, PP, NN, MM = [], [], [], []
    for t in range(nt):
        a, b, c = uv[tl[t]]
        x0, x1 = int(max(0, math.floor(min(a[0], b[0], c[0])))), int(min(S - 1, math.ceil(max(a[0], b[0], c[0]))))
        y0, y1 = int(max(0, math.floor(min(a[1], b[1], c[1])))), int(min(S - 1, math.ceil(max(a[1], b[1], c[1]))))
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        gx, gy = gx.ravel(), gy.ravel()
        d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
        if abs(d) < 1e-12: continue
        l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d
        l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d
        l2 = 1 - l0 - l1
        m = (l0 >= -1e-4) & (l1 >= -1e-4) & (l2 >= -1e-4)
        if not m.any(): continue
        L = np.stack([l0[m], l1[m], l2[m]], 1)
        PX.append(np.stack([gx[m] - 0.5, gy[m] - 0.5], 1).astype(np.int64))
        PP.append(L @ co[tv[t]]); n = L @ vn[tv[t]]; NN.append(n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9))
        MM.append(np.full(m.sum(), tm[t]))
    PX = np.concatenate(PX); key = PX[:, 1] * S + PX[:, 0]
    _, first = np.unique(key, return_index=True)                                  # one sample per texel
    return PX[first], np.concatenate(PP)[first], np.concatenate(NN)[first], np.concatenate(MM)[first]


def h01(i, salt=0):
    """A repeatable 0..1 value per integer id (per clump / per dab tone, never per pixel)."""
    x = (np.asarray(i, np.int64) * 374761393 + salt * 668265263) & 0xFFFFFFFF
    x = ((x ^ (x >> 13)) * 1274126177) & 0xFFFFFFFF
    return (x & 0xFFFF) / 65535.0


def cells(P, g, flow, stretch=0.5, shift=0.25, seed=1):
    """Brush clumps laid on the surface in 3D: one clump per g-sized cell, elongated along the flow (the fur's nap, a
    glaze stroke). Returns per point: clump id, position along the clump (-1 root .. 1 tip), the gap to the next clump."""
    rng = np.random.default_rng(seed)
    cell = np.floor(P / g).astype(np.int64) + 500
    key = cell[:, 0] * 1000000 + cell[:, 1] * 1000 + cell[:, 2]
    perm = rng.permutation(len(P))
    uk, fi = np.unique(key[perm], return_index=True)
    cid = perm[fi]; C = P[cid]; D = flow[cid]
    cpos = {k: i for i, k in enumerate(uk)}
    gk, inv = np.unique(key, return_inverse=True)
    best = np.zeros(len(P), np.int64); t = np.zeros(len(P)); gap = np.zeros(len(P))
    order = np.argsort(inv); bounds = np.searchsorted(inv[order], np.arange(len(gk) + 1))
    offs = [(a, b, c) for a in (-1, 0, 1) for b in (-1, 0, 1) for c in (-1, 0, 1)]
    for gi, k in enumerate(gk):
        idx = order[bounds[gi]:bounds[gi + 1]]
        cx, cy, cz = k // 1000000, (k // 1000) % 1000, k % 1000
        cand = [cpos[q] for q in ((cx + a) * 1000000 + (cy + b) * 1000 + (cz + c) for a, b, c in offs) if q in cpos]
        cand = np.array(cand)
        dlt = P[idx][:, None, :] - C[cand][None]
        al = np.einsum('ijk,jk->ij', dlt, D[cand]) - shift * g
        lat = np.linalg.norm(dlt - al[..., None] * D[cand][None], axis=2)
        dist = np.sqrt(lat ** 2 + (al * stretch) ** 2)
        o = np.argsort(dist, axis=1)
        j0 = o[:, 0]; r = np.arange(len(idx))
        best[idx] = cid[cand[j0]]
        t[idx] = np.clip((al[r, j0]) / (g * 0.9), -1.5, 1.5)
        gap[idx] = (dist[r, o[:, 1]] - dist[r, j0]) / g if len(cand) > 1 else 1.0
    return best, t, gap


def tufts(P, Nn, flow, g, seed=1, L=1.7, W=1.05, drop=None):
    """Painted fur: tapered tufts (round root, pointed tip) laid along the nap on the surface in 3D, one per g-cell; where
    tufts overlap, the one whose tip lies there is on top (each tuft's tip over the next one's root). Per point: a
    ramp index (-1 where no tuft covers: the gap / the backing), the tuft id. drop(centres) -> bool: tufts left out."""
    rng = np.random.default_rng(seed)
    cell = np.floor(P / g).astype(np.int64) + 500
    key = cell[:, 0] * 1000000 + cell[:, 1] * 1000 + cell[:, 2]
    perm = rng.permutation(len(P))
    uk, fi = np.unique(key[perm], return_index=True)
    cid = perm[fi]; C = P[cid]; D = flow[cid]; Lt = np.cross(Nn[cid], D)
    keep = np.ones(len(cid), bool) if drop is None else ~drop(cid)
    cpos = {k: i for i, k in enumerate(uk) if keep[i]}
    gk, inv = np.unique(key, return_inverse=True)
    out = np.full(len(P), -1); tid = np.full(len(P), -1)
    order = np.argsort(inv); bounds = np.searchsorted(inv[order], np.arange(len(gk) + 1))
    offs = [(a_, b_, c_) for a_ in (-1, 0, 1) for b_ in (-1, 0, 1) for c_ in (-1, 0, 1)]
    Lm, Wm = L * g, W * g / 2
    tone = h01(cid, seed)
    for gi, k in enumerate(gk):
        idx = order[bounds[gi]:bounds[gi + 1]]
        cx, cy, cz = k // 1000000, (k // 1000) % 1000, k % 1000
        cand = np.array([cpos[q] for q in ((cx + a_) * 1000000 + (cy + b_) * 1000 + (cz + c_) for a_, b_, c_ in offs) if q in cpos])
        if not len(cand): continue
        dl = P[idx][:, None, :] - C[cand][None]
        al = np.einsum('ijk,jk->ij', dl, D[cand]); la = np.einsum('ijk,jk->ij', dl, Lt[cand])
        dn = np.abs(np.einsum('ijk,jk->ij', dl, Nn[cid[cand]]))
        a = al / Lm
        w = np.where(a >= 0, (1 - np.clip(a, 0, 1) ** 2.4) ** 0.8, np.sqrt(np.clip(1 - (a / 0.22) ** 2, 0, 1))) * Wm
        inside = (np.abs(la) < w) & (a > -0.22) & (a < 1) & (dn < g * 0.8)
        score = np.where(inside, a, -9)
        j = np.argmax(score, 1); r = np.arange(len(idx)); hit = score[r, j] > -9
        aw = a[r, j]; lw = la[r, j] / np.maximum(w[r, j], 1e-9); tt = tone[cand[j]]
        ix = np.full(len(idx), 2)
        ix[(aw > 0.3) & (lw > -0.55) & (lw < 0.25)] = 3                        # the light caught along each tuft
        ix[(aw > 0.55) & (lw > -0.35) & (lw < 0.1) & (tt > 0.45)] = 4
        ix[lw > 0.58] = 1                                                      # its shadowed side
        ix[aw < 0.1] = 1                                                       # its root, coming out from under the last
        ix[(tt < 0.14) & (ix > 1)] -= 1                                         # a few darker tufts
        ix[~hit] = -1
        out[idx] = ix; tid[idx] = np.where(hit, cid[cand[j]], -1)
    return out, tid


def tangent(d, n):
    d = d - (d * n).sum(1, keepdims=True) * n
    return d / np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1e-9)


def ramp(cols, idx):
    return np.asarray(cols, float)[np.clip(idx, 0, len(cols) - 1)]


class Decal:
    """A hand-drawn RGBA sheet (PIL, hard edges) projected onto the surface facing `n` around `c`; `mpp` metres a pixel."""

    def __init__(s, w_m, h_m, mpp=0.00025):
        s.mpp = mpp; s.W, s.H = int(w_m / mpp), int(h_m / mpp)
        s.im = Image.new('RGBA', (s.W, s.H), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im)

    def p(s, x, y):  # metres from the centre (x right, y up) -> pixels
        return (s.W / 2 + x / s.mpp, s.H / 2 - y / s.mpp)

    def blob(s, x, y, rx, ry, fill, rot=0.0, wob=0.08, seed=0, n=28):
        r = random.Random(seed); a1, a2 = r.uniform(0, 6.3), r.uniform(0, 6.3); pts = []
        for k in range(n):
            t = 2 * math.pi * k / n; q = 1 + wob * (0.6 * math.sin(2 * t + a1) + 0.4 * math.sin(3 * t + a2))
            u, v = rx * q * math.cos(t), ry * q * math.sin(t)
            pts.append(s.p(x + u * math.cos(rot) - v * math.sin(rot), y + u * math.sin(rot) + v * math.cos(rot)))
        s.d.polygon(pts, fill=fill)

    def stroke(s, pts, w, fill, taper=0.35, seed=0):
        """A brush stroke through pts (metres), w wide, thinning at both ends."""
        P = [Vector((x, y, 0)) for x, y in pts]
        if len(P) > 2: P = spline(P, 8)
        L = [0.0]
        for i in range(1, len(P)): L.append(L[-1] + (P[i] - P[i - 1]).length)
        tot = L[-1] or 1; r = random.Random(seed)
        step = s.mpp * 0.5; k = 0; dist = 0.0
        while dist <= tot:
            while k < len(P) - 2 and L[k + 1] < dist: k += 1
            f = (dist - L[k]) / max(L[k + 1] - L[k], 1e-9); q = P[k].lerp(P[k + 1], min(1, f))
            u = dist / tot; ww = w * (1 - taper + taper * math.sin(math.pi * u) ** 0.6) * (1 + 0.06 * math.sin(u * 9 + seed))
            x, y = s.p(q.x, q.y); rr = max(0.5, ww / s.mpp / 2)
            s.d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=fill)
            dist += step

    def project(s, C, P, Nn, c, n, up=(0, 0, 1), depth=0.01, facing=0.25, mask=None):
        if c is None: print('decal missed the surface'); return
        n = np.asarray(n, float); n /= np.linalg.norm(n)
        upv = np.asarray(up, float); upv = upv - upv.dot(n) * n; upv /= np.linalg.norm(upv)
        right = np.cross(-n, upv)
        A = np.asarray(s.im).astype(float)
        dl = P - np.asarray(c, float)
        dn = dl @ n; u = dl @ right; v = dl @ upv
        col = np.floor(s.W / 2 + u / s.mpp).astype(np.int64); row = np.floor(s.H / 2 - v / s.mpp).astype(np.int64)
        m = (np.abs(dn) < depth) & ((Nn @ n) > facing) & (col >= 0) & (col < s.W) & (row >= 0) & (row < s.H)
        if mask is not None: m &= mask
        ii = np.where(m)[0]
        px = A[row[ii], col[ii]]
        on = px[:, 3] > 127
        C[ii[on]] = px[on, :3]


def surface_hit(bvh, origin, direction):
    loc, nrm, _, _ = bvh.ray_cast(Vector(origin), Vector(direction).normalized())
    return (np.array(loc), np.array(nrm)) if loc else (None, None)


def seg_dist(P, a, b):
    a, b = np.asarray(a, float), np.asarray(b, float); ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-12), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1), t


# -------------------------------------------------------------------------------------------------- piggy paint
GLAZE = [(176, 84, 104), (206, 116, 136), (228, 146, 162), (236, 158, 172), (244, 174, 186), (252, 204, 212), (255, 234, 236)]
INK = (34, 22, 26)


def paint_piggy(P, Nn, part, bvh):
    C = np.zeros((len(P), 3))
    glaze = part == 'glaze'
    # glaze laid on in long strokes round the body; a deeper pink where it pooled low, the sheen up top
    flow = tangent(np.tile([0.0, 1.0, 0.0], (len(P), 1)), Nn)
    cid, t, gap = cells(P, 0.011, flow, stretch=0.42, shift=0.0, seed=3)
    ix = np.full(len(P), 3)
    hv = h01(cid, 1)
    ix[(hv > 0.86) & (gap > 0.05)] = 4                                             # a stroke laid a little thicker
    ix[(hv < 0.1) & (gap > 0.05)] = 2
    ix[Nn[:, 2] < -0.35] = 2                                                       # the underside: the glaze runs thin
    ix[Nn[:, 2] < -0.75] = 1
    low = (P[:, 2] < 0.024) & (Nn[:, 2] < 0.3)
    ix[low] = np.minimum(ix[low], 2)
    Ls = np.array([-0.35, -0.45, 0.82]); Ls /= np.linalg.norm(Ls)
    lit = Nn @ Ls
    ix[lit > 0.84] = 5                                                             # the glaze sheen, a hot spot inside it
    ix[(lit > 0.955) & (hv > 0.25)] = 6
    C[:] = ramp(GLAZE, ix)
    # the coin slot: dark inside, an unglazed lip
    slot = glaze & (np.abs(P[:, 1] - 0.015) < 0.0044) & (np.abs(P[:, 0]) < 0.0168) & (P[:, 2] > 0.1)
    inner = slot & (np.abs(P[:, 1] - 0.015) < 0.0027) & (np.abs(P[:, 0]) < 0.0150)
    C[slot & ~inner] = (238, 226, 214)
    C[slot & ~inner & (Nn[:, 1] > 0.3)] = (206, 190, 176)
    C[inner] = (40, 26, 30)
    # hooves: rose-brown, a cleft stroke at the front
    hoof = glaze & (P[:, 2] < 0.0085)
    C[hoof] = ramp([(158, 112, 110), (184, 136, 132)], (P[hoof, 2] > 0.004).astype(int))
    for lx, ly in ((0.043, 0.045), (-0.043, 0.045), (0.043, -0.0375), (-0.043, -0.0375)):
        cleft = hoof & (np.abs(P[:, 0] - lx) < 0.0012) & (P[:, 1] < ly)
        C[cleft] = (96, 50, 56)
    # the snout disc and its nostrils
    tip = glaze & (P[:, 1] < -0.1135) & (Nn[:, 1] < -0.6)
    rim = glaze & (P[:, 1] < -0.111) & ~tip
    C[rim] = ramp(GLAZE, np.where(Nn[rim, 2] > 0.2, 3, 2))
    C[tip] = (228, 142, 154)
    hit, hn = surface_hit(bvh, (0, -0.3, 0.073), (0, 1, 0))
    dc = Decal(0.05, 0.05)
    for s in (-1, 1):
        dc.blob(s * 0.0072, 0.0005, 0.0034 + (0.0003 if s > 0 else 0), 0.0055, (124, 46, 62), rot=s * 0.25, wob=0.1, seed=11 + s)
        dc.stroke([(s * 0.0105, 0.0036), (s * 0.0078, 0.0062), (s * 0.004, 0.0058)], 0.0011, (250, 196, 206), seed=3)   # the shine on the rim of each nostril
    dc.stroke([(-0.016, -0.0128), (-0.004, -0.0164), (0.009, -0.0158), (0.017, -0.0118)], 0.0016, (170, 72, 92), seed=4)  # the disc's lower rim line
    dc.project(C, P, Nn, hit, (0, -1, 0), depth=0.006, facing=0.3)
    # the ears: the inner faces a deeper pink with an inked edge stroke
    for s in (-1, 1):
        ear = glaze & (P[:, 2] > 0.127) & (np.abs(P[:, 0] - s * 0.047) < 0.024) & (P[:, 1] < -0.045)
        front = ear & (Nn[:, 1] < -0.35)
        C[front] = (230, 140, 156)
        q = np.clip((P[:, 2] - 0.131) / 0.02, 0, 1)
        inner = front & (np.abs(P[:, 0] - s * (0.041 + q * 0.011)) < 0.0095 * (1 - q) + 0.0008) & (P[:, 2] > 0.131)
        C[inner] = (210, 116, 132)
    # the face: inked eyes with a lid stroke, brows, hatched blush; a red collar with a gold bell
    hit, hn = surface_hit(bvh, (0, -0.3, 0.104), (0, 1, 0))
    fc = Decal(0.11, 0.07)
    for s, sz, rot, seed in ((-1, 1.0, 0.12, 5), (1, 0.9, -0.2, 6)):
        ex, ey = s * 0.0215, -0.0005
        fc.blob(ex, ey, 0.0039 * sz, 0.0052 * sz, INK, rot=rot, wob=0.12, seed=seed)                    # bean-shaped ink eye
        fc.stroke([(ex - 0.0055 * s, ey + 0.0050), (ex - 0.001 * s, ey + 0.0068), (ex + 0.0052 * s, ey + 0.0046)], 0.0015, INK, seed=seed)  # the lid
        fc.stroke([(ex - 0.006 * s, ey + 0.0118 - 0.001 * s), (ex + 0.001 * s, ey + 0.0132), (ex + 0.0068 * s, ey + 0.011)], 0.0019, (88, 40, 52), taper=0.7, seed=seed + 2)  # brow
        for k in range(3):                                                                               # hatched blush
            bx = s * (0.033 + k * 0.0042) - 0.001
            fc.stroke([(bx - 0.0018, -0.0145), (bx + 0.0018, -0.0090)], 0.0016, (214, 84, 112), taper=0.5, seed=seed + k)
    fc.project(C, P, Nn, hit, (0, -1, 0.25), depth=0.02, facing=0.15, mask=glaze & (P[:, 1] < -0.06) & ~tip & ~rim)
    col = glaze & (np.abs(P[:, 1] - (-0.052 + (P[:, 2] - 0.078) * 0.28)) < 0.0034) & (P[:, 2] < 0.119) & (P[:, 2] > 0.026)
    C[col] = ramp([(150, 30, 40), (188, 44, 52), (214, 72, 70)], np.where(Nn[col] @ Ls > 0.45, 2, np.where(Nn[col] @ Ls > 0.0, 1, 0)))
    hit, hn = surface_hit(bvh, (0, -0.3, 0.0), (0, 1, 0.2))
    bell = Decal(0.03, 0.03)
    bell.blob(0, 0, 0.0068, 0.0064, (122, 84, 30), wob=0.05, seed=2)
    bell.blob(0, 0, 0.0058, 0.0054, (214, 168, 56), wob=0.05, seed=3)
    bell.stroke([(-0.0035, 0.0024), (-0.001, 0.0042), (0.0015, 0.0040)], 0.0016, (252, 230, 150), seed=4)
    bell.stroke([(-0.0048, -0.0008), (0.0048, -0.0008)], 0.0011, (122, 84, 30), taper=0.1)
    bell.blob(0, -0.0028, 0.0014, 0.0012, (60, 36, 20), seed=5)
    bell.stroke([(0, -0.0028), (0, -0.0058)], 0.0010, (60, 36, 20), taper=0.1)
    bell.project(C, P, Nn, hit, hn, up=(0, 0, 1), depth=0.006, facing=0.2)
    # plum blossoms on both flanks: a dark branch, five-petal flowers, buds and leaves, painted with a loaded brush
    for s in (-1, 1):
        hit, hn = surface_hit(bvh, (s * 0.3, 0.025, 0.068), (-s, 0, 0))
        fl = Decal(0.11, 0.08)
        r = random.Random(40 + s)
        fl.stroke([(-0.045, -0.026), (-0.022, -0.012), (0.0, -0.006), (0.02, 0.006), (0.044, 0.02)], 0.0024, (92, 58, 48), taper=0.6, seed=7)
        fl.stroke([(0.0, -0.006), (0.006, 0.012), (0.004, 0.026)], 0.0018, (92, 58, 48), taper=0.6, seed=8)
        fl.stroke([(-0.022, -0.012), (-0.03, 0.004)], 0.0016, (92, 58, 48), taper=0.6, seed=9)
        for lx, ly, ang in ((-0.012, -0.018, -0.7), (0.03, 0.0, 0.5), (0.012, 0.016, 1.6), (-0.038, -0.012, 2.6)):
            fl.blob(lx, ly, 0.0062, 0.0025, (78, 130, 74), rot=ang, wob=0.15, seed=int(lx * 1e4))
            fl.stroke([(lx - math.cos(ang) * 0.004, ly - math.sin(ang) * 0.004), (lx + math.cos(ang) * 0.004, ly + math.sin(ang) * 0.004)], 0.0008, (52, 96, 54), taper=0.6)
        for fx, fy, rr, colr in ((-0.026, -0.004, 0.0105, (250, 244, 236)), (0.010, 0.0, 0.0115, (248, 238, 228)), (0.034, 0.018, 0.0085, (250, 244, 236)),
                                 (0.004, 0.026, 0.0075, (244, 200, 210)), (-0.03, 0.006, 0.0, None)):
            if not colr: continue
            a0 = r.uniform(0, 1.2)
            for k in range(5):
                a = a0 + k * 2 * math.pi / 5
                fl.blob(fx + math.cos(a) * rr * 0.52, fy + math.sin(a) * rr * 0.52, rr * 0.5, rr * 0.44, (196, 90, 106), rot=a, wob=0.1, seed=k + int(fx * 1e4))
                fl.blob(fx + math.cos(a) * rr * 0.5, fy + math.sin(a) * rr * 0.5, rr * 0.43, rr * 0.37, colr, rot=a, wob=0.12, seed=k + 9 + int(fx * 1e4))
            fl.blob(fx, fy, rr * 0.3, rr * 0.28, (206, 52, 62), wob=0.1, seed=int(fy * 1e4))
            for k in range(5):
                a = a0 + 0.6 + k * 2 * math.pi / 5
                fl.blob(fx + math.cos(a) * rr * 0.36, fy + math.sin(a) * rr * 0.36, 0.0009, 0.0009, (232, 186, 70), seed=k)
        for bx, by in ((0.044, 0.024), (-0.046, -0.028), (0.006, 0.033)):
            fl.blob(bx, by, 0.0034, 0.0042, (214, 72, 92), wob=0.15, seed=int(bx * 1e4))
        fl.mpp *= 1.35                                                             # (drawn small, laid on larger)
        fl.project(C, P, Nn, hit, hn, up=(0, 0, 1), depth=0.026, facing=0.3, mask=glaze & (P[:, 2] > 0.024))
    # chips in the glaze: the white body showing, with a darker broken edge
    for c3, rr in (((0.055, -0.078, 0.150), 0.0032), ((-0.02, -0.114, 0.087), 0.0035), ((0.045, 0.050, 0.004), 0.003),
                   ((-0.03, 0.095, 0.094), 0.004), ((-0.062, -0.02, 0.054), 0.0034)):
        c3 = np.array(c3)
        dd = np.linalg.norm(P - c3, axis=1)
        ang = np.arctan2(P[:, 2] - c3[2], P[:, 0] - c3[0] + P[:, 1] - c3[1])
        edge = rr * (1 + 0.28 * np.sin(ang * 3 + c3[0] * 400) + 0.15 * np.sin(ang * 5))
        C[glaze & (dd < edge * 1.25)] = (150, 96, 104)
        C[glaze & (dd < edge)] = (236, 226, 212)
        C[glaze & (dd < edge * 0.55)] = (222, 210, 196)
    # the rubber stopper: dark, its rim and ridges catching light
    rub = part == 'rubber'
    C[rub] = (46, 40, 44)
    C[rub & (Nn[:, 2] > -0.3) & (P[:, 2] > 0.013)] = (70, 62, 66)
    C[rub & (np.abs(P[:, 2] - 0.0127) < 0.0006)] = (88, 80, 84)
    return C


# --------------------------------------------------------------------------------------------------- bear paint
def paint_bear(P, Nn, part, bvh):
    N, old = BEAR['N'], BEAR['old']
    INK = (28, 20, 16)                                                             # warm ink: it reads with the browns
    C = np.zeros((len(P), 3))
    fur = part == 'fur'; earp = part == 'ear'
    pos = {k: np.array(v[0]) for k, v in N.items()}
    # the nap: which bone each point belongs to and which way its fur lies
    bones = []
    for a, b in BEAR['E']:
        if a == 'head' and b == 'crown': fl = (0, 0.75, -0.65)
        elif b in ('muz', 'mtip'): fl = (0, 1.0, 0.25)
        elif a in ('seat', 'belly', 'chest') and b in ('belly', 'chest', 'neck', 'hump'): fl = (0, 0.25, -1.0)
        elif a == 'neck': fl = (0, 0.5, -0.85)
        else: fl = tuple(pos[b] - pos[a])
        bones.append((a, b, np.array(fl, float)))
    D = np.stack([seg_dist(P, pos[a], pos[b])[0] for a, b, _ in bones], 1)
    near = np.argmin(D, 1)
    flow = np.stack([bones[i][2] for i in range(len(bones))])[near]
    for base, tip, s in BEAR['ears']:
        e = earp & (np.linalg.norm(P - np.array(base), axis=1) < 0.04)
        flow[e] = np.array(tip - base)
    flow = tangent(flow / np.linalg.norm(flow, axis=1, keepdims=True), Nn)
    bname = lambda i: bones[i][1]
    nb = np.array([bname(i) for i in near])
    mdir = pos['mtip'] - pos['head']; mdir /= np.linalg.norm(mdir)
    muzzle = fur & (seg_dist(P, pos['muz'] - mdir * 0.01, pos['mtip'] + mdir * 0.03)[0] < N['muz'][1] * 1.12) & (((P - pos['muz']) @ mdir) > -0.012)
    # mohair in clumps: one painted tuft per cell, dark at the root and in the partings, light at the tip
    if not old:
        FUR = [(92, 50, 26), (132, 80, 38), (172, 116, 54), (204, 150, 74), (228, 184, 104)]
        MUZ = [(146, 98, 56), (184, 138, 86), (208, 168, 116), (226, 192, 142)]
        g, gm = 0.0135, 0.0085
    else:
        FUR = [(70, 52, 42), (104, 80, 60), (136, 108, 82), (162, 136, 104), (186, 162, 128)]
        MUZ = [(118, 96, 74), (150, 126, 98), (172, 150, 120), (190, 170, 140)]
        g, gm = 0.0125, 0.008
    worn = np.zeros(len(P), bool)
    if old:   # worn bald: the tufts rubbed off the belly, the snout, the crown, the paws and a sole
        for c, r in ((pos['belly'] + np.array([0.006, -0.044, 0.004]), 0.026), (pos['mtip'] + np.array([0, -0.01, 0.004]), 0.013),
                     (pos['crown'] + np.array([0.0, -0.008, 0.03]), 0.017), (pos['pawtL'], 0.018), (pos['pawtR'], 0.014), (pos['soleL'] + np.array([0, 0.0, 0.03]), 0.012)):
            worn |= np.linalg.norm(P - c, axis=1) < r
    wornf = lambda ids: worn[ids] & (h01(ids, 9) < 0.72)
    ix, tid = tufts(P, Nn, flow, g, seed=7, L=1.5 if not old else 1.35, W=1.25 if not old else 1.3, drop=wornf if old else None)
    C[:] = ramp(FUR, np.maximum(ix, 0))
    im, _ = tufts(P, Nn, flow, gm, seed=8, L=1.5, W=1.2, drop=wornf if old else None)
    im = np.where(im < 0, 0, np.minimum(im, 3))
    C[muzzle] = ramp(MUZ, im[muzzle])
    if old:   # the woven backing where the mohair is gone
        BACK = [(148, 126, 98), (172, 150, 118), (192, 172, 140)]
        bare = worn & (ix < 0) & ~muzzle
        C[bare] = ramp(BACK, 1 + (((np.floor(P[bare, 0] / 0.0024) + np.floor(P[bare, 2] / 0.0024)) % 2) == 0))
        bm_ = muzzle & worn & (im <= 0)
        C[bm_] = BACK[1]
    # sewn seams: the head gusset, the chin and the body's centre seams, the rings where limbs were sewn on
    SEAM = FUR[0]
    head_r = pos['head'] + np.array([0, 0, 0])
    rel = P - pos['head']
    if old:
        Rh = Matrix.Rotation(math.radians(TILT), 3, 'Y'); rel = rel @ np.array(Rh).T
    hd = fur & (np.isin(nb, ['crown', 'head', 'muz', 'mtip']))
    gus = 0.017 if not old else 0.012
    seam = hd & (np.abs(np.abs(rel[:, 0]) - gus * (1 + 0.6 * np.clip(rel[:, 2] / 0.05, -1, 1))) < 0.0011) & (rel[:, 2] > -0.005) & (rel[:, 1] < 0.04) & ~muzzle
    seam |= fur & (np.abs(P[:, 0]) < 0.001) & (P[:, 2] < pos['neck'][2]) & (P[:, 2] > pos['seat'][2] - 0.01) & ~np.isin(nb, ['hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR', 'soleL', 'soleR', 'shL', 'shR', 'elbL', 'elbR', 'pawL', 'pawR', 'pawtL', 'pawtR'])
    for k in 'LR':
        for j0, j1 in (('sh' + k, 'elb' + k), ('hip' + k, 'knee' + k)):
            ax = pos[j1] - pos[j0]; ax /= np.linalg.norm(ax)
            pl = (P - pos[j0]) @ ax
            radial = np.linalg.norm((P - pos[j0]) - pl[:, None] * ax, axis=1)
            seam |= fur & (np.abs(pl - 0.004) < 0.0011) & (radial < N[j0][1] * 1.25) & np.isin(nb, [j0, j1])
    C[seam] = SEAM
    # pads: felt soles and paw pads with a stitched edge (claw stitches on the old one)
    PAD = [(196, 168, 120), (218, 194, 150), (232, 214, 176)] if not old else [(150, 120, 86), (174, 146, 108), (190, 166, 128)]
    THREAD = (60, 36, 26) if not old else (52, 40, 34)
    for k, sx in (('L', 1), ('R', -1)):
        # the foot sole: the flat front of the upturned foot; the paw pad: the inside front of the paw
        so = pos['sole' + k]; ra, rz = N['sole' + k][1], N['sole' + k][2]
        dirs = (('sole', so, np.array([0.0, -1.0, 0.12]), ra * 0.78, rz * 0.8, 22),
                ('paw', pos['pawt' + k], np.array([-sx * 0.55, -0.8, -0.25]), N['pawt' + k][1] * 0.72, N['pawt' + k][1] * 0.85, 14))
        for kind, c0, dv, wa, wb, nst in dirs:
            dv = dv / np.linalg.norm(dv)
            e1 = np.cross(dv, [0, 0, 1.0]); e1 /= np.linalg.norm(e1); e2 = np.cross(e1, dv)
            q = P - c0; u_, v_ = q @ e1, q @ e2
            rr = np.sqrt((u_ / wa) ** 2 + (v_ / wb) ** 2)
            m = fur & ((q @ dv) > -0.004) & (np.linalg.norm(q, axis=1) < 0.06) & ((Nn @ dv) > 0.2)
            pad = m & (rr < 1.0) & ((Nn @ dv) > 0.45)
            ring = m & (rr >= 1.0) & (rr < 1.0 + 0.0026 / min(wa, wb))
            th = np.arctan2(v_, u_)
            dash = (np.floor(th / (2 * np.pi) * nst * 2) % 2) == 0
            C[pad] = ramp(PAD, np.where(v_[pad] > wb * 0.35, 2, np.where(v_[pad] < -wb * 0.4, 0, 1)))
            C[ring] = FUR[0]
            C[pad & (rr > 0.86) & dash] = THREAD                               # the stitches that hold it in
            if old and kind == 'paw':                                          # claw stitches across the paw tip
                for cl in (-1, 0, 1):
                    st = m & ~pad & (np.abs(u_ - cl * wa * 0.45) < 0.0011) & (v_ > wb * 0.55) & (v_ < wb * 1.25)
                    C[st] = THREAD
            if old and kind == 'sole' and k == 'L':                            # a darn across the worn sole
                dn = pad & (np.abs(u_ + 0.004) < 0.009) & (np.abs(v_ + 0.004) < 0.009)
                C[dn & ((np.floor(v_ / 0.0021) % 2) == 0)] = (118, 92, 66)
                C[dn & ((np.floor(v_ / 0.0021) % 2) == 1) & ((np.floor(u_ / 0.0021) % 2) == 0)] = (134, 108, 80)
    # ears: the inner face in shorter, lighter plush, a seam round it
    for base, tip, s in BEAR['ears']:
        ec = np.array((base + tip) / 2)
        m = earp & (np.linalg.norm(P - ec, axis=1) < 0.04)
        fr = m & (Nn[:, 1] < -0.3)
        C[fr] = ramp(MUZ, np.where(Nn[fr, 2] > 0.3, 2, 1))
        edge = m & (np.abs(Nn[:, 1]) < 0.3)
        C[edge & (Nn[:, 1] < 0)] = FUR[1]
        if old and s < 0:   # the ear sewn back on in pale thread: big uneven stitches across its base
            bb = np.array(base)
            near_b = (fur | earp) & (np.abs(P[:, 2] - bb[2] + 0.001) < 0.006) & (np.abs(P[:, 0] - bb[0]) < 0.022) & (np.abs(P[:, 1] - bb[1]) < 0.013) & (np.linalg.norm(P - bb, axis=1) < 0.026)
            ang = np.floor((P[:, 0] - bb[0]) / 0.0042)
            st = near_b & (ang % 2 == 0) & (np.abs(P[:, 2] - bb[2] + 0.001) < 0.0035)
            C[st] = (214, 200, 168)
    # the face, drawn in ink and thread: eyes, the satin-stitched nose, the stitched mouth
    hp = pos['head']; mt = pos['mtip']
    hit, hn = surface_hit(bvh, (mt[0], -0.4, mt[2] + (0.004 if not old else 0.003)), (0, 1, 0))
    nose = Decal(0.05, 0.05)
    if not old:
        NOSE = [(36, 22, 20), (58, 36, 30)]
        pts = [(-0.0098, 0.0058), (0.0098, 0.0062), (0.0052, -0.0022), (0.0, -0.0064), (-0.0055, -0.0024)]
        nose.d.polygon([nose.p(*q) for q in pts], fill=NOSE[0])
        nose.blob(0.0, 0.0022, 0.0098, 0.0044, NOSE[0], wob=0.06, seed=3)
        for k in range(-4, 5):                                                     # the satin stitches, laid side by side
            x = k * 0.0022
            nose.stroke([(x, 0.0062 - abs(k) * 0.0001), (x * 0.55, -0.0056 + abs(k) * 0.0006)], 0.0009, NOSE[1], taper=0.4, seed=k + 9)
        nose.stroke([(0.0, -0.0062), (0.0003, -0.0125)], 0.0019, NOSE[0], taper=0.2, seed=1)                          # the mouth: a drop, then
        nose.stroke([(0.0003, -0.0125), (-0.0055, -0.0148), (-0.0112, -0.0120)], 0.0018, NOSE[0], taper=0.45, seed=2)  # a smile either side
        nose.stroke([(0.0003, -0.0125), (0.0060, -0.0146), (0.0108, -0.0112)], 0.0018, NOSE[0], taper=0.45, seed=3)
    else:
        NOSE = [(30, 22, 20), (52, 38, 32)]
        nose.d.polygon([nose.p(*q) for q in [(-0.0074, 0.0050), (0.0072, 0.0054), (0.0, -0.0050)]], fill=NOSE[0])
        for k in range(-3, 4):
            x = k * 0.0021
            if k in (2,): continue                                                # a stitch gone, the cloth showing
            nose.stroke([(x, 0.0052), (x * 0.4, -0.0040)], 0.0010, NOSE[1], taper=0.4, seed=k + 3)
        nose.stroke([(0.0045, 0.0052), (0.0040, -0.0010)], 0.0016, MUZ[2], taper=0.2, seed=5)
        nose.stroke([(0.0074, 0.0050), (0.0118, 0.0090)], 0.0008, NOSE[1], taper=0.1, seed=6)                         # a loose thread end
        nose.stroke([(0.0, -0.0050), (-0.0002, -0.0118)], 0.0016, NOSE[0], taper=0.2, seed=1)
        nose.stroke([(-0.0002, -0.0118), (-0.0052, -0.0132), (-0.0094, -0.0150)], 0.0016, NOSE[0], taper=0.45, seed=2)  # a downturned mouth
        nose.stroke([(-0.0002, -0.0118), (0.0050, -0.0128), (0.0086, -0.0146)], 0.0016, NOSE[0], taper=0.45, seed=3)
    nose.project(C, P, Nn, hit, (0, -1, 0.1), depth=0.012, facing=0.1, mask=fur & np.isin(nb, ['muz', 'mtip', 'head']))
    ey = hp[2] + (0.019 if not old else 0.018)
    for s in (-1, 1):
        ex = hp[0] + s * (0.024 if not old else 0.019)
        if old: ex, ey2 = (np.array(rot_about((ex, 0, ey), hp, 'Y', math.radians(-TILT)))[[0, 2]])
        else: ey2 = ey
        hit, hn = surface_hit(bvh, (ex, -0.4, ey2), (0, 1, 0))
        if hit is None: continue
        eye = Decal(0.03, 0.03)
        if not old:   # embroidered eyes: solid ink, a little uneven, with the thread's lie and a lid stroke over each
            sz = 1.0 if s < 0 else 0.92
            eye.blob(0, 0, 0.0052 * sz, 0.0061 * sz, INK, rot=0.15 * s, wob=0.1, seed=20 + s)
            eye.stroke([(-0.0062 * s, 0.0058), (-0.001 * s, 0.0082), (0.0062 * s, 0.0062)], 0.0016, INK, taper=0.6, seed=22 + s)
        else:         # shoe buttons, one a replacement (smaller, browner, sewn on a bit low)
            if s > 0: eye.blob(0, 0, 0.0052, 0.0054, (24, 18, 18), wob=0.08, seed=30)
            else:
                eye.blob(0.0004, -0.0016, 0.0044, 0.0042, (66, 40, 28), wob=0.1, seed=31)
                eye.stroke([(-0.0014, -0.0016), (0.0022, -0.0016)], 0.0008, (150, 110, 80), taper=0.1)
                eye.stroke([(0.0004, -0.0034), (0.0004, 0.0002)], 0.0008, (150, 110, 80), taper=0.1)
        eye.project(C, P, Nn, hit, hn, up=(0, 0, 1), depth=0.006, facing=0.2, mask=fur)
    # the gingham patch blanket-stitched over the old bear's left elbow
    if old:
        el = pos['elbL']; hit, hn = surface_hit(bvh, el + np.array([0.06, -0.02, 0.01]), -np.array([0.06, -0.02, 0.01]))
        if hit is not None:
            pa = Decal(0.04, 0.04)
            sq = [(-0.0115, -0.0105), (0.0118, -0.0112), (0.0112, 0.0118), (-0.0108, 0.0110)]
            rot = lambda q, a=0.22: (q[0] * math.cos(a) - q[1] * math.sin(a), q[0] * math.sin(a) + q[1] * math.cos(a))
            pa.d.polygon([pa.p(*rot(q)) for q in sq], fill=(226, 220, 202))
            for i in range(-3, 3):                                                # faded indigo gingham, 4 mm checks
                for j in range(-3, 3):
                    a, b = i * 0.0040 + 0.0004, j * 0.0040
                    if i % 2 == 0 or j % 2 == 0:
                        cl = (86, 104, 148) if (i % 2 == 0 and j % 2 == 0) else (156, 166, 190)
                        q = [rot((max(a, -0.0115), max(b, -0.0108))), rot((min(a + 0.004, 0.0115), max(b, -0.0108))), rot((min(a + 0.004, 0.0115), min(b + 0.004, 0.0112))), rot((max(a, -0.0115), min(b + 0.004, 0.0112)))]
                        pa.d.polygon([pa.p(*v) for v in q], fill=cl)
            for k in range(4):                                                    # the blanket stitches round the edge
                p0, p1 = sq[k], sq[(k + 1) % 4]
                for j in range(7):
                    u = (j + 0.5) / 7; x, y = p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u
                    ix_, iy_ = -y * 0.0, 0
                    inward = (-x * 0.22, -y * 0.22)
                    pa.stroke([rot((x + inward[0], y + inward[1])), rot((x - inward[0] * 0.3, y - inward[1] * 0.3))], 0.0011, (236, 210, 140), taper=0.1, seed=k * 7 + j)
            pa.project(C, P, Nn, hit, hn, up=(0, 0, 1), depth=0.012, facing=0.2, mask=fur)
    # the red satin ribbon: painted folds and sheen
    rib = part == 'ribbon'
    if rib.any():
        Ls = np.array([-0.35, -0.55, 0.75]); Ls /= np.linalg.norm(Ls)
        li = Nn[rib] @ Ls
        C[rib] = ramp([(138, 26, 36), (164, 32, 42), (192, 44, 52), (222, 92, 92), (246, 168, 160)], np.digitize(li, [-0.2, 0.25, 0.6, 0.88]))
    return C


# ============================================================================================================ main
if what == 'piggy': build_piggy()
else: build_bear(what == 'teddy_old')
O = join(OBJS)
parts = [s.material.name.split('.')[0] for s in O.material_slots]
nt = tris(O)
unwrap(O)
dg = bpy.context.evaluated_depsgraph_get()
bvh = BVHTree.FromObject(O, dg)
PX, P, Nn, M = texels(O)
part = np.array(parts)[M]
C = paint_piggy(P, Nn, part, bvh) if what == 'piggy' else paint_bear(P, Nn, part, bvh)
img = np.zeros((S, S, 3), np.uint8); have = np.zeros((S, S), bool)
img[S - 1 - PX[:, 1], PX[:, 0]] = np.clip(C, 0, 255).astype(np.uint8); have[S - 1 - PX[:, 1], PX[:, 0]] = True
for _ in range(6):                                                                  # bleed the islands' edges outward
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.roll(np.roll(have, dy, 0), dx, 1); fill = sh & ~have
        img[fill] = np.roll(np.roll(img, dy, 0), dx, 1)[fill]; have |= fill
name = {'piggy': 'piggy_bank', 'teddy': 'teddy', 'teddy_old': 'teddy_old'}[what]
tex = os.path.join(TD, name + '.png'); Image.fromarray(img).save(tex)
# one material with the painted atlas
m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
b.inputs['Roughness'].default_value = 0.35 if what == 'piggy' else 0.95
i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(tex); i.interpolation = 'Closest'
m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color'])
O.data.materials.clear(); O.data.materials.append(m)
for p in O.data.polygons: p.material_index = 0; p.use_smooth = True
# origin at the bottom centre
co = np.array([v.co[:] for v in O.data.vertices])
off = Vector((-(co[:, 0].min() + co[:, 0].max()) / 2, -(co[:, 1].min() + co[:, 1].max()) / 2, -co[:, 2].min()))
for v in O.data.vertices: v.co += off
for o in bpy.context.selected_objects: o.select_set(False)
O.select_set(True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, use_selection=True)
co = np.array([v.co[:] for v in O.data.vertices])
print('ok', out, nt, 'tris', 'size', np.round(co.max(0) - co.min(0), 3), 'parts', parts, 'texels', len(P))
