"""Our own route-machine module (the Gacha Kaikan's walls): 2 x 2 capsule machines on a dark plinth under a lit header,
each with a painted body (one of six colours), its trim, the window packed with capsules, a display card, the chrome coin
mechanism with its handle, and the chute. Hand-painted textures in route_machine_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/route_machine.py -- <out.glb> <tex dir> <colour>"""
import bpy, sys, os, math, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import setup, mat, finish
out, td, col = sys.argv[-3], sys.argv[-2], sys.argv[-1]
setup()
M = {'body': mat(td, 'body_' + col, 0.35), 'trim': mat(td, 'trim_' + col, 0.35), 'window': mat(td, 'window', 0.1), 'card': mat(td, 'card', 0.6),
     'chrome': mat(td, 'chrome', 0.25, 0.8), 'dark': mat(td, 'dark', 0.6), 'lit': mat(td, 'lit', 0.3)}
parts = []
def box(sx, sy, sz, x, y, z, m):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = bpy.context.active_object; o.scale = (sx, sy, sz); o.data.materials.append(M[m]); parts.append(o)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.reset(); bpy.ops.object.mode_set(mode='OBJECT')  # (each face shows its whole painting)
    return o
F = -0.21  # the machines' front face (Blender -y = glTF +z, the aisle)
box(0.9, 0.44, 0.075, 0, 0, 0.0375, 'dark')                         # plinth
for cx in (-0.225, 0.225):
    for y0 in (0.1, 1.0):
        box(0.42, 0.42, 0.82, cx, 0, y0 + 0.41, 'body')
        box(0.42, 0.42, 0.04, cx, 0, y0 + 0.84, 'trim')
        box(0.3, 0.01, 0.35, cx, F - 0.006, y0 + 0.6, 'window')       # window full of capsules
        box(0.3, 0.008, 0.12, cx, F - 0.005, y0 + 0.36, 'card')        # display card
        box(0.2, 0.012, 0.13, cx, F - 0.007, y0 + 0.2, 'chrome')       # coin mechanism plate
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.045, depth=0.03, location=(cx, F - 0.025, y0 + 0.2), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.active_object; o.data.materials.append(M['chrome']); parts.append(o)
        box(0.07, 0.012, 0.014, cx, F - 0.042, y0 + 0.2, 'trim')       # the handle's grip bar
        box(0.14, 0.012, 0.06, cx, F - 0.007, y0 + 0.05, 'dark')       # chute
box(0.9, 0.44, 0.06, 0, 0, 1.92, 'trim')                             # header
box(0.82, 0.01, 0.03, 0, F - 0.016, 1.92, 'lit')                     # its light strip
finish(parts, out, smooth=False)
