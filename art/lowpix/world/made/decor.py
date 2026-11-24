"""Our own decor and job props (hand-painted textures in decor_tex/): the mall's capsule statue on its marble plinth, the
neon ガチャ sign (real tubes, after the strokes of the old sign), a drift of petals and leaves for the sweep job, a
hamaya arrow on its stand, a broom bin. Front = glTF +z.
Rebuild one: tools/blender.sh art/lowpix/world/made/decor.py -- <out.glb> <tex dir> <capsule_statue|neon_gacha|petal_drift|hamaya|broombin>"""
import bpy, bmesh, sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td, what = sys.argv[-3], sys.argv[-2], sys.argv[-1]
random.seed(11); setup()
MS = {}
def M(n, r=0.5, mt=0.0):
    if n not in MS: MS[n] = mat(td, n, r, mt)
    return MS[n]
parts = []
def take(m, r=0.5, mt=0.0):
    o = bpy.context.active_object; o.data.materials.append(M(m, r, mt)); parts.append(o); return o
def box(sx, sy, sz, x, y, z, m, r=0.5, mt=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = take(m, r, mt); o.scale = (sx, sy, sz)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT'); return o
def cyl(rad, h, loc, m, v=12, rot=(0, 0, 0), r=0.5, mt=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=rad, depth=h, location=loc, rotation=rot); return take(m, r, mt)
def tube(pts, rad, m, closed=False):
    cu = bpy.data.curves.new('t', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = rad; cu.bevel_resolution = 1
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts): p.co = (*c, 1)
    sp.use_cyclic_u = closed
    o = bpy.data.objects.new('t', cu); bpy.context.collection.objects.link(o)
    for x in bpy.context.selected_objects: x.select_set(False)
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.convert(target='MESH'); o.data.materials.append(M(m, 0.3)); parts.append(o); return o
if what == 'capsule_statue':
    box(0.76, 0.66, 0.03, 0, 0, 0.015, 'marble'); box(0.66, 0.56, 0.2, 0, 0, 0.13, 'marble'); box(0.76, 0.66, 0.03, 0, 0, 0.245, 'marble')
    for z in (0.03, 0.26): box(0.77, 0.67, 0.012, 0, 0, z, 'gold', 0.3, 0.7)
    box(0.3, 0.01, 0.08, 0, -0.285, 0.14, 'gold', 0.3, 0.7)                               # plaque
    bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, major_radius=0.22, minor_radius=0.03, location=(0, 0, 0.3)); take('gold', 0.3, 0.7)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.37, location=(0, 0, 0.66)); o = take('capsule', 0.15); o.scale = (1, 1, 1.1)
elif what == 'neon_gacha':
    for s in (-1, 1):
        box(0.15, 0.2, 0.03, s * 0.5, -0.03, 0.015, 'metal', 0.4, 0.6); box(0.03, 0.03, 0.85, s * 0.51, -0.06, 0.45, 'metal', 0.4, 0.6)
    box(1.36, 0.03, 0.68, 0, -0.02, 0.56, 'board'); 
    for z in (0.225, 0.895): box(1.38, 0.05, 0.02, 0, -0.02, z, 'metal', 0.4, 0.6)
    V, Y0, FZ = 0.025, 0.0, -0.045
    tube([(-0.6, FZ, 0.275), (0.6, FZ, 0.275), (0.6, FZ, 0.85), (-0.6, FZ, 0.85)], 0.008, 'neon_cyan', closed=True)
    GA = [[[0, 11], [11, 11], [11, 3], [10, 1], [8, 0]], [[5, 16], [5, 9], [4, 5], [2, 2], [0, 0]], [[13, 17], [14, 15]], [[16, 17], [17, 15]]]
    CHI = [[[11, 16], [7, 15], [3, 14]], [[0, 10], [13, 10]], [[7, 14], [7, 5], [6, 2], [3, 0]]]
    YA = [[[0, 7], [9, 8], [9, 6], [7, 4]], [[2, 10], [5, 0]]]
    for strokes, ox in ((GA, -22), (CHI, -2), (YA, 14)):
        for st in strokes: tube([((ox + gx) * V, FZ, (13 + gy) * V + Y0) for gx, gy in st], 0.009, 'neon_pink')
elif what == 'petal_drift':
    for k in range(70):
        a = random.uniform(0, 6.28); rr = 0.7 * math.sqrt(random.uniform(0, 1))
        x, y = math.cos(a) * rr * 0.75, math.sin(a) * rr * 0.55
        kind = random.choice(['petal', 'petal', 'petal', 'leafy', 'leafbrown'])
        bpy.ops.mesh.primitive_circle_add(vertices=6 if kind == 'petal' else 8, radius=0.025 if kind == 'petal' else 0.04, fill_type='TRIFAN', location=(x, y, 0.002 + random.uniform(0, 0.01)))
        o = take(kind, 0.8); o.scale = (1, 0.6, 1); o.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, 6.28))
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT')
elif what == 'hamaya':
    box(0.1, 0.08, 0.03, 0, 0, 0.015, 'ema'); cyl(0.012, 0.05, (0, 0, 0.055), 'gold', 8, r=0.3, mt=0.7)
    cyl(0.006, 0.36, (0, 0, 0.21), 'shaft', 8)                                          # the arrow, point down in its stand
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.009, radius2=0.0, depth=0.03, location=(0, 0, 0.405)); take('gold', 0.3, 0.7)
    for k in range(3):                                                                  # fletching near the stand
        a = k * 2.094
        bpy.ops.mesh.primitive_plane_add(size=1, location=(math.cos(a) * 0.026, math.sin(a) * 0.026, 0.13)); o = take('feather', 0.8); o.scale = (0.05, 1, 0.13); o.rotation_euler = (math.pi / 2, 0, a + math.pi / 2)
    box(0.03, 0.02, 0.02, 0, 0, 0.3, 'ribbon')                                          # the red tie, its tails, the bell and the little ema
    for s in (-1, 1): box(0.012, 0.004, 0.07, s * 0.012, -0.012, 0.26, 'ribbon')
    bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=5, radius=0.012, location=(0.02, -0.015, 0.22)); take('gold', 0.3, 0.7)
    box(0.05, 0.004, 0.035, -0.03, -0.012, 0.24, 'ema')
elif what == 'broombin':
    bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.16, depth=0.42, location=(0, 0, 0.21)); o = take('galv', 0.4, 0.6)
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.z > 0.9], context='FACES'); bm.to_mesh(o.data); bm.free()
    for k, (x, y, rz) in enumerate([(-0.05, 0.03, 0.12), (0.05, -0.02, -0.15), (0.0, 0.07, 0.05)]):   # brooms for sale, heads up
        cyl(0.012, 1.0, (x, y, 0.5), 'bamboo', 8, rot=(0, rz, 0))
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.09, radius2=0.025, depth=0.32, location=(x + math.sin(rz) * 0.55, y, 1.1), rotation=(0, rz, 0)); o = take('straw', 0.9); o.scale = (1, 0.35, 1)
        bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.028, depth=0.04, location=(x + math.sin(rz) * 0.47, y, 0.95), rotation=(0, rz, 0)); take('ribbon')
finish(parts, out, smooth=False)
