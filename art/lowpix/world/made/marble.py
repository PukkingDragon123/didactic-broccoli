"""Our own glass marble (a junk-market trinket): the gumball script at 1.6 cm with the hand-painted marble_tex.png.
Rebuild: tools/blender.sh art/lowpix/world/made/marble.py -- art/lowpix/world/made/marble.glb art/lowpix/world/made/marble_tex.png"""
import bpy, sys
out, tex = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=9, radius=0.008, location=(0, 0, 0.008))
ob = bpy.context.active_object; ob.name = 'marble'
bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('glass'); m.use_nodes = True
bsdf = m.node_tree.nodes['Principled BSDF']
img = m.node_tree.nodes.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(tex); img.interpolation = 'Closest'
m.node_tree.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.08
ob.data.materials.append(m)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=True)
print('ok', out, len(ob.data.polygons))
