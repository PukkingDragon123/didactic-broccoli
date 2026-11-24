"""Our own paint roller (the annex renovation): a ribbed plastic grip, a steel shaft and frame, a nap roller. Hand-painted
textures nap.png, grip.png, steel.png. Rebuild: tools/blender.sh art/lowpix/world/made/roller.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, tex, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, tex)); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {'nap': mat('nap', 'nap.png', 0.95), 'grip': mat('grip', 'grip.png', 0.5), 'steel': mat('steel', 'steel.png', 0.35)}
parts = []
def cyl(r, depth, loc, rot, m, verts=10):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
# (Blender z up = glTF y up): the grip, the shaft, the frame's arm and riser, the axle, the roller across the top
cyl(0.013, 0.15, (0, 0, 0.075), (0, 0, 0), 'grip', 12)
cyl(0.0042, 0.13, (0, 0, 0.215), (0, 0, 0), 'steel', 6)
cyl(0.0035, 0.105, (0.0525, 0, 0.28), (0, math.pi / 2, 0), 'steel', 6)
cyl(0.0035, 0.03, (0.105, 0, 0.295), (0, 0, 0), 'steel', 6)
cyl(0.0035, 0.018, (0.096, 0, 0.31), (0, math.pi / 2, 0), 'steel', 6)
cyl(0.03, 0.18, (0, 0, 0.31), (0, math.pi / 2, 0), 'nap', 16)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
