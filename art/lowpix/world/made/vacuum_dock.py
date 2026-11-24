"""Our own robot-vacuum dock (catalogue vacuum): the classic charging base: a curved charcoal-topped white back that the
round robot backs into, a low ramp with two brushed charging strips, a green status light.
Hand-painted textures in dock_tex/. Rebuild: tools/blender.sh art/lowpix/world/made/vacuum_dock.py -- <out.glb> <tex dir>"""
import bpy, bmesh, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
setup()
M = {n: mat(td, n, 0.4) for n in ['abs', 'top', 'metal', 'led']}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
# the back: a 120-degree arc of a ring (the robot's curve), white sides, a charcoal cap; front = -y
bm = bmesh.new()
R0, R1, H, n = 0.11, 0.17, 0.1, 10
ring = []
for k in range(n + 1):
    a = math.radians(-60 + 120 * k / n) + math.pi / 2
    ring.append([bm.verts.new((math.cos(a) * r, math.sin(a) * r - 0.07, z)) for r, z in [(R0, 0), (R1, 0), (R1, H), (R0, H)]])
for k in range(n):
    for j in range(4): bm.faces.new([ring[k][j], ring[k][(j + 1) % 4], ring[k + 1][(j + 1) % 4], ring[k + 1][j]])
bm.faces.new(ring[0][::-1]); bm.faces.new(ring[n])
me = bpy.data.meshes.new('back'); bm.to_mesh(me); bm.free()
o = bpy.data.objects.new('back', me); bpy.context.collection.objects.link(o); o.data.materials.append(M['top']); parts.append(o)
bpy.context.view_layer.objects.active = o; o.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.cube_project(cube_size=0.6); bpy.ops.object.mode_set(mode='OBJECT')
o.select_set(False)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.17, depth=0.012, location=(0, -0.07, H + 0.006)); cap = take('abs')
bm = bmesh.new(); bm.from_mesh(cap.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < 0.105], context='VERTS'); bm.to_mesh(cap.data); bm.free()
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.03, 0.006)); o = take('abs'); o.scale = (0.24, 0.16, 0.012)   # the ramp plate
for x in (-0.05, 0.05):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -0.05, 0.0135)); o = take('metal'); o.scale = (0.03, 0.07, 0.003)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.035, 0.075)); o = take('led'); o.scale = (0.014, 0.004, 0.006)
finish(parts, out, smooth=False)
