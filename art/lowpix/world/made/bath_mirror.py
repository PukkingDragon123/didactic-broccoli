"""Our own bath mirror (flat 103's wash place): a rectangular mirror in a white plastic frame with a small shelf under it.
Hand-painted glass.png (a painted reflection of the tiled room) and plastic.png in bath_mirror_tex/. Wall = Blender y 0,
the room = -y (glTF +z). Rebuild: tools/blender.sh art/lowpix/world/made/bath_mirror.py -- <out.glb> <tex dir>"""
import bpy, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td = sys.argv[-2], sys.argv[-1]
setup()
G, P = mat(td, 'glass', 0.08, 0.3), mat(td, 'plastic', 0.4)
parts = []
def box(sx, sy, sz, x, y, z, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = bpy.context.active_object; o.scale = (sx, sy, sz); o.data.materials.append(m); parts.append(o)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT')
box(0.38, 0.025, 0.56, 0, -0.0125, 0.32, P)       # the frame
box(0.33, 0.006, 0.5, 0, -0.027, 0.32, G)         # the glass
box(0.4, 0.09, 0.02, 0, -0.045, 0.01, P)          # the little shelf
box(0.4, 0.012, 0.05, 0, -0.088, 0.03, P)         # its lip
finish(parts, out, smooth=False)
