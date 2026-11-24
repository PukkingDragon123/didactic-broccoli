"""Our own lane and park props (hand-painted textures in exterior_tex/): the twin-tub washer, scattered drink cans, park
litter, the park's pole clock, a pair of laundry poles with washing, the can and PET recycling cage. Front = glTF +z.
Rebuild one: tools/blender.sh art/lowpix/world/made/exterior.py -- <out.glb> <tex dir> <twin_tub|drink_cans|park_litter|park_clock|laundry_pole|recycle_cage>"""
import bpy, bmesh, sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td, what = sys.argv[-3], sys.argv[-2], sys.argv[-1]
random.seed(7); setup()
MS = {}
def M(n, r=0.6, mt=0.0):
    if n not in MS: MS[n] = mat(td, n, r, mt)
    return MS[n]
parts = []
def take(m, **k):
    o = bpy.context.active_object; o.data.materials.append(M(m, k.get('rough', 0.6), k.get('metal', 0.0))); parts.append(o); return o
def box(sx, sy, sz, x, y, z, m, bev=0.0, **k):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = take(m, **k); o.scale = (sx, sy, sz)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT')
    if bev: md = o.modifiers.new('b', 'BEVEL'); md.width = bev; md.segments = 2
    return o
def cyl(r, h, loc, m, v=12, rot=(0, 0, 0), **k):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=rot); return take(m, **k)
def can(x, y, lying, crushed, tex):
    o = cyl(0.033, 0.12, (0, 0, 0), tex, 12, metal=0.5)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.subdivide(number_cuts=2); bpy.ops.object.mode_set(mode='OBJECT')
    if crushed:
        for v in o.data.vertices:
            t = 1 - min(1.0, abs(v.co.z) / 0.045); v.co.y *= 1 - 0.65 * t; v.co.x *= 1 + 0.15 * t; v.co.z *= 0.85
    if lying: o.rotation_euler = (math.pi / 2, 0, random.uniform(0, 6.28)); o.location = (x, y, 0.033 if not crushed else 0.02)
    else: o.location = (x, y, 0.06)
    return o
if what == 'twin_tub':
    box(0.76, 0.46, 0.8, 0, 0, 0.42, 'enamel', 0.02)
    box(0.76, 0.462, 0.08, 0, 0, 0.74, 'aqua', 0.01)                               # the coloured top band
    box(0.42, 0.36, 0.02, -0.15, -0.02, 0.83, 'lid', 0.01); box(0.24, 0.36, 0.02, 0.24, -0.02, 0.83, 'lid', 0.01)  # wash / spin lids
    box(0.74, 0.08, 0.14, 0, 0.19, 0.89, 'aqua', 0.01)                              # the back control panel
    for x in (-0.25, -0.05, 0.22): cyl(0.03, 0.02, (x, 0.145, 0.9), 'knob', 12, rot=(math.pi / 2, 0, 0))
    for x in (-0.33, 0.33):
        for y in (-0.19, 0.19): cyl(0.025, 0.03, (x, y, 0.015), 'rubber', 8)
    cu = bpy.data.curves.new('hose', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.012
    sp = cu.splines.new('BEZIER'); P = [(0.385, 0.0, 0.1), (0.45, 0.0, 0.05), (0.55, -0.1, 0.01)]
    sp.bezier_points.add(len(P) - 1)
    for bp, c in zip(sp.bezier_points, P): bp.co = c; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    ho = bpy.data.objects.new('hose', cu); bpy.context.collection.objects.link(ho)
    bpy.context.view_layer.objects.active = ho; ho.select_set(True); bpy.ops.object.convert(target='MESH'); ho.data.materials.append(M('rubber')); parts.append(ho)
elif what == 'drink_cans':
    for (x, y, l, c, t) in [(0, 0, False, False, 'can_red'), (0.12, 0.05, True, False, 'can_blue'), (-0.1, 0.09, True, True, 'can_green'), (0.05, -0.12, True, True, 'can_white')]:
        can(x, y, l, c, t)
elif what == 'park_litter':
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 0.002)); o = take('newsprint'); o.scale = (0.3, 0.22, 1); o.rotation_euler = (0, 0, 0.4)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=3); bpy.ops.object.mode_set(mode='OBJECT')
    for v in o.data.vertices: v.co.z += 0.02 * max(0, v.co.x) ** 2 * 8
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.06, location=(0.25, 0.1, 0.05)); o = take('kraft'); o.scale = (1.2, 0.9, 0.8)
    for v in o.data.vertices: v.co *= random.uniform(0.8, 1.15)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.03, radius2=0.04, depth=0.09, location=(-0.22, -0.08, 0.04), rotation=(math.pi / 2, 0, 0.7)); take('cup')
    for k in range(3):
        bpy.ops.mesh.primitive_plane_add(size=1, location=(random.uniform(-0.3, 0.3), random.uniform(-0.25, 0.25), 0.004)); o = take('wrapper'); o.scale = (0.05, 0.03, 1); o.rotation_euler = (0.2, 0.1, random.uniform(0, 3))
elif what == 'park_clock':
    cyl(0.12, 0.08, (0, 0, 0.04), 'green', 12, rough=0.5, metal=0.3)
    cyl(0.045, 2.9, (0, 0, 1.5), 'green', 12, rough=0.5, metal=0.3)
    cyl(0.3, 0.16, (0, 0, 3.2), 'green', 24, rot=(math.pi / 2, 0, 0), rough=0.5, metal=0.3)     # the housing, faces both ways
    for y in (-0.081, 0.081):
        cyl(0.27, 0.004, (0, y, 3.2), 'clockface', 24, rot=(math.pi / 2, 0, 0), rough=0.3)
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.06, radius2=0.0, depth=0.12, location=(0, 0, 3.56)); take('green', rough=0.5, metal=0.3)
    # planar UVs on the two faces (the painted dial)
    for o in parts[3:5]:
        uv = o.data.uv_layers.active
        for p in o.data.polygons:
            for li in p.loop_indices:
                co = o.data.vertices[o.data.loops[li].vertex_index].co; uv.data[li].uv = (0.5 + co.x / 0.56 * (1 if o.location.y < 0 else -1), 0.5 + co.y / 0.56)
elif what == 'laundry_pole':
    for x in (-0.9, 0.9):
        box(0.24, 0.24, 0.12, x, 0, 0.06, 'concrete')
        cyl(0.022, 1.7, (x, 0, 0.97), 'pipe', 10, metal=0.6)
        cyl(0.016, 0.5, (x, 0, 1.78), 'pipe', 8, rot=(math.pi / 2, 0, 0), metal=0.6)        # the T arm
    for y in (-0.22, 0.22): cyl(0.016, 2.3, (0, y, 1.8), 'pipe', 8, rot=(0, math.pi / 2, 0), metal=0.6)
    for (x, y, w, h, t) in [(-0.45, -0.22, 0.34, 0.62, 'towel'), (0.3, -0.22, 0.5, 0.55, 'shirt'), (-0.2, 0.22, 0.4, 0.5, 'towel')]:
        bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, 1.8 - h / 2)); o = take(t, rough=0.9); o.scale = (w, 1, h); o.rotation_euler = (math.pi / 2, 0, 0)
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=4); bpy.ops.object.mode_set(mode='OBJECT')
        for v in o.data.vertices: v.co.z += 0.03 * math.sin(v.co.x * 14)      # (folds: plane local z is world y)
elif what == 'recycle_cage':
    W, D, H = 1.2, 0.6, 0.9
    for x in (-W / 2, W / 2):
        for y in (-D / 2, D / 2): box(0.04, 0.04, H, x, y, H / 2, 'frame')
    for z in (0.02, H): box(W, D, 0.03, 0, 0, z, 'frame')
    box(W - 0.02, 0.01, H - 0.05, 0, -D / 2, H / 2, 'mesh'); box(W - 0.02, 0.01, H - 0.05, 0, D / 2, H / 2, 'mesh')
    box(0.01, D - 0.02, H - 0.05, -W / 2, 0, H / 2, 'mesh'); box(0.01, D - 0.02, H - 0.05, W / 2, 0, H / 2, 'mesh')
    box(W - 0.02, D - 0.02, 0.01, 0, 0, H - 0.02, 'mesh')
finish(parts, out, smooth=False, apply_mods=True)
