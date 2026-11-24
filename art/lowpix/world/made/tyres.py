"""Our own stack of three old tyres (the annex junk, the park): worn rubber with tread blocks, dusty sidewalls, each
tyre a little off-centre. Hand-painted rubber.png in tyres_tex/. Rebuild: tools/blender.sh art/lowpix/world/made/tyres.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
m = bpy.data.materials.new('rubber'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.9
i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, 'rubber.png')); i.interpolation = 'Closest'
m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color'])
parts = []
for k, (dx, dy, rz) in enumerate([(0, 0, 0), (0.025, -0.015, 0.4), (-0.02, 0.02, 1.1)]):
    bpy.ops.mesh.primitive_torus_add(major_segments=20, minor_segments=8, major_radius=0.24, minor_radius=0.085, location=(dx, dy, 0.085 + k * 0.17), rotation=(0, 0, rz), generate_uvs=True)
    o = bpy.context.active_object; o.scale = (1, 1, 1.0); o.data.materials.append(m); parts.append(o)
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
