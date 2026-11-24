"""Our own corn-puff stick (Mikawa-ya's 10-yen snack): a puff stick in its printed film bag, crimped flat at both ends.
The wrapper is set from a real photo (corn.jpg, Open Images, credited) with DotGothic16 lettering (original name コーン棒).
Rebuild: tools/blender.sh art/lowpix/world/made/puff_stick.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
setup()
W, C = mat(td, 'wrap', 0.35), mat(td, 'crimp', 0.4)
parts = []
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.0125, depth=0.115, location=(0, 0, 0.0725), rotation=(0, 0, math.pi / 2))
o = bpy.context.active_object; o.data.materials.append(W); parts.append(o)
for z in (0.007, 0.138):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, z)); o = bpy.context.active_object; o.scale = (0.03, 0.003, 0.014); o.data.materials.append(C); parts.append(o)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT')
finish(parts, out, smooth=False)
