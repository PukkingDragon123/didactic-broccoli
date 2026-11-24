"""Our own curve mirror (カーブミラー, the lane's blind-corner mirrors): an orange-enamelled steel pole on a base cap, a
bracket with its clamp band, a round convex mirror in an orange frame with a rain visor, a ribbed orange housing behind.
Hand-painted textures in mirror_pole_tex/ (the face is a painted fish-eye of the lane). Front = glTF +z.
Rebuild: tools/blender.sh art/lowpix/world/made/mirror_pole.py -- <out.glb> <tex dir>"""
import bpy, bmesh, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
setup()
M = {'orange': mat(td, 'orange', 0.45, 0.2), 'steel': mat(td, 'steel', 0.4, 0.6), 'mirror': mat(td, 'mirror', 0.08, 0.6)}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
C = 2.72  # mirror centre height; the pole stands a little behind it (+y), the face looks -y (glTF +z)
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.07, depth=0.06, location=(0, 0.12, 0.03)); take('steel')
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.038, depth=2.9, location=(0, 0.12, 1.45)); take('orange')
bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=5, radius=0.042, location=(0, 0.12, 2.9)); take('orange')
for z in (C - 0.18, C + 0.18):   # clamp bands and the bracket arms to the housing
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.046, depth=0.04, location=(0, 0.12, z)); take('steel')
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.075, z)); o = take('steel'); o.scale = (0.03, 0.09, 0.03)
# the housing (back, ribbed by its bevel), the frame ring, the visor, the convex face
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.31, depth=0.06, location=(0, 0.01, C), rotation=(math.pi / 2, 0, 0)); take('orange')
bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.24, depth=0.03, location=(0, 0.045, C), rotation=(math.pi / 2, 0, 0)); take('orange')
bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, major_radius=0.3, minor_radius=0.022, location=(0, -0.02, C), rotation=(math.pi / 2, 0, 0)); take('orange')
bm = bmesh.new()  # the visor: the top third of a ring, sloping forward
for k in range(13):
    a = math.radians(30 + 120 * k / 12)
    for r, y in ((0.3, -0.02), (0.33, -0.12)):
        bm.verts.new((math.cos(a) * r, y, C + math.sin(a) * r))
bm.verts.ensure_lookup_table()
for k in range(12): bm.faces.new([bm.verts[2 * k], bm.verts[2 * k + 1], bm.verts[2 * k + 3], bm.verts[2 * k + 2]])
me = bpy.data.meshes.new('visor'); bm.to_mesh(me); bm.free()
vo = bpy.data.objects.new('visor', me); bpy.context.collection.objects.link(vo); vo.data.materials.append(M['orange']); parts.append(vo)
vo.modifiers.new('s', 'SOLIDIFY').thickness = 0.006
bpy.context.view_layer.objects.active = vo; vo.select_set(True); bpy.ops.object.modifier_apply(modifier='s')
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.62, location=(0, 0.55, C)); f = take('mirror')
bm = bmesh.new(); bm.from_mesh(f.data)
ys = [v.co.y for v in bm.verts]; lo = min(ys); R = (max(ys) - lo) / 2; capr = R * 0.436
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y > lo + R * 0.1], context='VERTS'); bm.to_mesh(f.data); bm.free()  # (the front cap)
uv = f.data.uv_layers.active
for poly in f.data.polygons:   # planar UV across the face (the painted fish-eye)
    for li in poly.loop_indices:
        co = f.data.vertices[f.data.loops[li].vertex_index].co; uv.data[li].uv = (0.5 + co.x / (2 * capr), 0.5 + co.z / (2 * capr))
finish(parts, out)
