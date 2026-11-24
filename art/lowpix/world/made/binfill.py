"""Our own bin fill (what shows in the shop's trash can as it fills): the black liner's surface heaped with crumpled
paper, receipts, empty capsule halves and a crushed can. Hand-painted textures in binfill_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/binfill.py -- <out.glb> <tex dir>"""
import bpy, bmesh, sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
random.seed(9); setup()
M = {n: mat(td, n, 0.8) for n in ['paper', 'receipt', 'capsule', 'liner']}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.15, depth=0.012, location=(0, 0, 0.006)); take('liner')
for k in range(9):  # crumpled paper balls: lumpy icospheres
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=random.uniform(0.025, 0.04), location=(random.uniform(-0.1, 0.1), random.uniform(-0.1, 0.1), 0.02))
    o = take('paper')
    for v in o.data.vertices: v.co *= random.uniform(0.75, 1.2)
    o.scale = (1, 1, 0.75); o.rotation_euler = (random.uniform(0, 3), random.uniform(0, 3), random.uniform(0, 3))
for k in range(3):  # receipts, curled
    bpy.ops.mesh.primitive_plane_add(size=1, location=(random.uniform(-0.08, 0.08), random.uniform(-0.08, 0.08), 0.03)); o = take('receipt')
    o.scale = (0.03, 0.08, 1); o.rotation_euler = (random.uniform(-0.4, 0.4), random.uniform(-0.3, 0.3), random.uniform(0, 3))
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.subdivide(number_cuts=3); bpy.ops.object.mode_set(mode='OBJECT')
    for v in o.data.vertices: v.co.z += 0.25 * (v.co.y ** 2)
for k in range(3):  # empty capsule halves, open side up or tipped
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.024, location=(random.uniform(-0.09, 0.09), random.uniform(-0.09, 0.09), 0.03)); o = take('capsule')
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z > 0.002], context='VERTS'); bm.to_mesh(o.data); bm.free()
    o.rotation_euler = (random.uniform(-0.8, 0.8), random.uniform(-0.8, 0.8), 0)
finish(parts, out)
