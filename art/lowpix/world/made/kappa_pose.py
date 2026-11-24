"""The yokai kappa (Kappa by samnorwoodgo, CC BY 4.0, https://sketchfab.com/3d-models/kappa-136cd1ad671c4b208cdf64aab42ea172):
its arms lowered from the modelling pose to hang at its sides (a rotation about each shoulder, blended in across the
shoulder so the skin stays whole), written as art/lowpix/world/made/kappa_posed.glb for lowpix (world.json: yokai_kappa,
credited to its author). The source is the downloaded scene.gltf (node_modules/.cache/lowpix-world/yokai_kappa/_source/).
    tools/blender.sh art/lowpix/world/made/kappa_pose.py -- <scene.gltf> <out.glb>"""
import bpy, sys, math
from mathutils import Matrix, Vector
src, out = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
o = [x for x in bpy.context.scene.objects if x.type == 'MESH'][0]
M = o.matrix_world.copy(); Mi = M.inverted()
SH = 0.62          # shoulder height (z, metres in the source's frame)
X0, X1 = 0.34, 0.47  # the blend across the shoulder (|x|)
ANG = math.radians(36)
def smooth(a, b, x): t = min(1, max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
for v in o.data.vertices:
    p = M @ v.co
    if p.z < 0.1: continue
    w = smooth(X0, X1, abs(p.x)) * smooth(0.1, 0.3, p.z)
    if w <= 0: continue
    s = 1 if p.x > 0 else -1
    piv = Vector((s * 0.36, p.y, SH))
    R = Matrix.Rotation(s * ANG * w, 4, 'Y')
    v.co = Mi @ (piv + (R @ (p - piv).to_4d()).to_3d())
o.data.update()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out)
