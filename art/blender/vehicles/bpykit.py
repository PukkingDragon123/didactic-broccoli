"""Shared bpy helpers for the vehicle models (art/blender/vehicles/*.py): materials with a pixel-art image (nearest,
repeat), polygon prisms in any plane, bevel / solidify / boolean applied in place, rounded outlines, boxes, swept
tubes, lathes. All geometry is built in the game frame (x left, y up, z forward, metres); the scripts rotate it to
Blender's Z-up only when they export."""
import math, os
import bpy, bmesh
from mathutils import Vector, Matrix

TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'tex')
MAT = {}
SCN = None


def reset():
    global SCN
    bpy.ops.wm.read_factory_settings(use_empty=True)
    SCN = bpy.context.scene
    MAT.clear()
    return SCN


def material(name, img=None, rough=0.6, metal=0.0, col=(1, 1, 1, 1)):
    """A Principled material, its base colour from out/tex/<img>.png (nearest, repeat), kept in MAT."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get('Principled BSDF')
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Base Color'].default_value = col
    if img:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = bpy.data.images.load(os.path.join(TEX, img + '.png'))
        t.interpolation = 'Closest'
        t.extension = 'REPEAT'
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    MAT[name] = m
    return m


# ------------------------------------------------------------------ mesh helpers (game frame)
def obj(name, bm, mats):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    for m in mats: me.materials.append(MAT[m])
    return o


def prism(bm, pts, origin, ux, uy, n, d0, d1, mi=0):
    """A 2D polygon in the plane (origin, ux, uy) extruded along n from d0 to d1."""
    O, U, Vv, N = Vector(origin), Vector(ux), Vector(uy), Vector(n)
    a = [bm.verts.new(O + U * x + Vv * y + N * d0) for x, y in pts]
    b = [bm.verts.new(O + U * x + Vv * y + N * d1) for x, y in pts]
    k = len(pts)
    fs = [bm.faces.new((a[i], a[(i + 1) % k], b[(i + 1) % k], b[i])) for i in range(k)]
    fs += [bm.faces.new(b), bm.faces.new(list(reversed(a)))]
    for f in fs: f.material_index = mi
    return fs


def prism_x(bm, zy, x0, x1, mi=0):      # profile (z, y), across x
    return prism(bm, [(z, y) for z, y in zy], (0, 0, 0), (0, 0, 1), (0, 1, 0), (1, 0, 0), x0, x1, mi)


def prism_z(bm, xy, z0, z1, mi=0):      # profile (x, y), along z
    return prism(bm, xy, (0, 0, 0), (1, 0, 0), (0, 1, 0), (0, 0, 1), z0, z1, mi)


def fix(bm):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)


def apply(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear()
    o.data = me


def bevel(o, width, segs=2, angle=35):
    m = o.modifiers.new('bevel', 'BEVEL')
    m.width, m.segments, m.limit_method, m.angle_limit = width, segs, 'ANGLE', math.radians(angle)
    m.harden_normals = False
    apply(o)


def solidify(o, t):
    m = o.modifiers.new('skin', 'SOLIDIFY')
    m.thickness, m.offset, m.use_even_offset, m.material_offset = t, -1, True, 1
    apply(o)


def cut(o, cutter, op='DIFFERENCE'):
    m = o.modifiers.new('cut', 'BOOLEAN')
    m.operation, m.object, m.solver = op, cutter, 'EXACT'
    m.material_mode = 'TRANSFER'
    cutter.hide_set(True)
    apply(o)
    bpy.data.objects.remove(cutter)


def rrect(x0, y0, x1, y1, r, n=3):
    """A rounded rectangle's outline, CCW."""
    out = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / n)
            out.append((cx + math.cos(t) * r, cy + math.sin(t) * r))
    return out


def box(name, x0, y0, z0, x1, y1, z1, mat, bev=0.0, segs=1):
    bm = bmesh.new()
    prism_z(bm, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], z0, z1)
    fix(bm)
    o = obj(name, bm, [mat])
    if bev: bevel(o, bev, segs, 30)
    return o


def tube(name, path, r, mat, seg=8):
    """A tube swept along a polyline (frames carried along the path, mitred at the bends)."""
    bm = bmesh.new()
    pts = [Vector(p) for p in path]
    dirs = [(pts[i + 1] - pts[i]).normalized() for i in range(len(pts) - 1)]
    tang = [dirs[0]] + [(dirs[i - 1] + dirs[i]).normalized() for i in range(1, len(pts) - 1)] + [dirs[-1]]
    a = tang[0].cross(Vector((0, 1, 0)) if abs(tang[0].y) < 0.9 else Vector((1, 0, 0))).normalized()
    rings = []
    for i, p in enumerate(pts):
        d = tang[i]
        a = (a - d * a.dot(d)).normalized()
        b = d.cross(a)
        bend = dirs[i] - dirs[i - 1] if 0 < i < len(pts) - 1 else None
        k = 1 / max(0.5, dirs[i - 1].dot(d)) if bend is not None else 1.0
        bn = (bend - d * bend.dot(d)).normalized() if bend is not None and bend.length > 1e-6 else None
        ring = []
        for j in range(seg):
            t = 2 * math.pi * j / seg
            off = a * math.cos(t) + b * math.sin(t)
            if bn is not None: off = off + bn * off.dot(bn) * (k - 1)
            ring.append(bm.verts.new(p + off * r))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for j in range(seg):
            bm.faces.new((r0[j], r0[(j + 1) % seg], r1[(j + 1) % seg], r1[j]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    fix(bm)
    return obj(name, bm, [mat])


def lathe(bm, prof, centre, side, seg=16, mi=0):
    """Turn a profile [(r, w)] round the x axis at centre; w > 0 faces out (side = +1 / -1 in x)."""
    cx, cy, cz = centre
    rings = []
    for r, w in prof:
        if r < 1e-4: rings.append([bm.verts.new((cx + side * w, cy, cz))])
        else: rings.append([bm.verts.new((cx + side * w, cy + math.sin(2 * math.pi * j / seg) * r, cz + math.cos(2 * math.pi * j / seg) * r)) for j in range(seg)])
    for r0, r1 in zip(rings, rings[1:]):
        if len(r0) == 1 and len(r1) == 1: continue
        if len(r0) == 1:
            for j in range(seg): bm.faces.new((r0[0], r1[j], r1[(j + 1) % seg])).material_index = mi
        elif len(r1) == 1:
            for j in range(seg): bm.faces.new((r0[j], r0[(j + 1) % seg], r1[0])).material_index = mi
        else:
            for j in range(seg): bm.faces.new((r0[j], r0[(j + 1) % seg], r1[(j + 1) % seg], r1[j])).material_index = mi




def export(path, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_materials='EXPORT', export_image_format='AUTO')


def finish(objs, sharp=40):
    """Smooth with sharp edges past `sharp` degrees, and the game frame turned to Blender's (x, -z, y)."""
    for o in objs:
        o.data.shade_smooth()
        o.data.set_sharp_from_angle(angle=math.radians(sharp))
        o.data.transform(Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1))))
        o.data.update()


def tris(objs): return sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
