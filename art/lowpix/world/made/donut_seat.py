"""Our own giant donut seat (catalogue decor): a fat ring cushion with pink icing and sprinkles over golden dough.
Hand-painted donut.png in donut_tex/. Rebuild: tools/blender.sh art/lowpix/world/made/donut_seat.py -- <out.glb> <tex dir>"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
setup()
M = mat(td, 'donut', 0.55)
bpy.ops.mesh.primitive_torus_add(major_segments=28, minor_segments=12, major_radius=0.3, minor_radius=0.15, location=(0, 0, 0.15), generate_uvs=True)
o = bpy.context.active_object; o.scale = (1, 1, 0.82); o.data.materials.append(M)
finish([o], out)
