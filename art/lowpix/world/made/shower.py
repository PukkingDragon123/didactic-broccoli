"""Our own wash-place shower (flat 103's bath): a chrome wall mixer with its two handles (blue cold, red hot caps), the
spout, a grey ribbed hose up to the hand shower resting in its holder on a riser bar. Hand-painted textures in
shower_tex/. Wall = Blender y 0, the room = -y (glTF +z). Rebuild: tools/blender.sh art/lowpix/world/made/shower.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
setup()
M = {'chrome': mat(td, 'chrome', 0.2, 0.85), 'hose': mat(td, 'hose', 0.5, 0.6), 'white': mat(td, 'white', 0.4), 'marks': mat(td, 'marks', 0.4)}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
X = (math.pi / 2, 0, 0)
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.025, depth=0.24, location=(0, -0.06, 0.6), rotation=(0, math.pi / 2, 0)); take('chrome')  # mixer body
for sx in (-0.13, 0.13):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.012, depth=0.06, location=(sx * 0.9, -0.03, 0.6), rotation=X); take('chrome')  # wall arms
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.03, depth=0.03, location=(sx, -0.06, 0.6), rotation=(0, math.pi / 2, 0)); take('chrome')  # handles
    bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.012, depth=0.006, location=(sx + (0.017 if sx > 0 else -0.017), -0.06, 0.6), rotation=(0, math.pi / 2, 0)); take('marks')
bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.012, radius2=0.009, depth=0.1, location=(0, -0.11, 0.57), rotation=(1.2, 0, 0)); take('chrome')  # spout
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.01, depth=0.8, location=(0.22, -0.02, 1.1)); take('chrome')  # riser bar
for z in (0.72, 1.48):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.22, -0.01, z)); o = take('white'); o.scale = (0.03, 0.02, 0.04)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.22, -0.035, 1.32)); o = take('white'); o.scale = (0.04, 0.03, 0.05)  # holder
# the hand shower in its holder: a handle up, the head tilted out
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.012, depth=0.16, location=(0.22, -0.06, 1.33), rotation=(0.25, 0, 0)); take('white')
bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.04, depth=0.022, location=(0.22, -0.09, 1.43), rotation=(1.1, 0, 0)); take('white')
bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.034, depth=0.004, location=(0.22, -0.1, 1.425), rotation=(1.1, 0, 0)); take('chrome')
# the hose: from the mixer's underside, hanging in a loop, up to the shower handle
cu = bpy.data.curves.new('hose', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.008; cu.bevel_resolution = 1
sp = cu.splines.new('BEZIER'); P = [(0.05, -0.06, 0.575), (0.1, -0.1, 0.35), (0.2, -0.12, 0.4), (0.22, -0.07, 1.25)]
sp.bezier_points.add(len(P) - 1)
for bp, c in zip(sp.bezier_points, P): bp.co = c; bp.handle_left_type = bp.handle_right_type = 'AUTO'
cu.resolution_u = 6
ho = bpy.data.objects.new('hose', cu); bpy.context.collection.objects.link(ho)
bpy.context.view_layer.objects.active = ho; ho.select_set(True); bpy.ops.object.convert(target='MESH'); ho.data.materials.append(M['hose']); parts.append(ho)
finish(parts, out)
