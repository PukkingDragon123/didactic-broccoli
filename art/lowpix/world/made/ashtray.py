"""Our own standing ashtray (Mikawa-ya's, by the door): a weighted steel foot, a red enamelled can with a cream band and
chipped, rust-run paint, a chrome dish on top with the ash and butts in its well. Hand-painted textures in ashtray_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/ashtray.py -- <out.glb> <tex dir>"""
import bpy, sys, os
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, tex, rough, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, tex)); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {k: mat(k, k + '.png', r, mt) for k, r, mt in [('can', 0.55, 0.2), ('chrome', 0.25, 0.8), ('steel', 0.6, 0.5), ('ash', 0.95, 0)]}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.13, depth=0.025, location=(0, 0, 0.0125)); take('steel')
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.1, radius2=0.03, depth=0.05, location=(0, 0, 0.05)); take('steel')
bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.022, depth=0.2, location=(0, 0, 0.17)); take('steel')
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.095, depth=0.36, location=(0, 0, 0.45)); take('can')
bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=0.096, radius2=0.115, depth=0.03, location=(0, 0, 0.645)); take('chrome')
bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.06, depth=0.012, location=(0, 0, 0.657)); take('ash')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
