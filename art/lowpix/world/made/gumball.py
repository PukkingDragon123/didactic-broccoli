"""Our own gumball (the gumball machine's held sweet): a 16 x 9 UV sphere, 2.2 cm, with the hand-painted gumball_tex.png
(brush blotches, sugar-dull dabs, a hard highlight; painted for the game). Rebuild:
  tools/blender.sh art/lowpix/world/made/gumball.py -- art/lowpix/world/made/gumball.glb art/lowpix/world/made/gumball_tex.png
then node tools/lowpix-world.mjs gumball_m --force."""
import bpy, sys
out, tex = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=9, radius=0.011, location=(0, 0, 0.011))
ob = bpy.context.active_object; ob.name = 'gumball'
bpy.ops.object.shade_smooth()
m = bpy.data.materials.new('gum'); m.use_nodes = True
bsdf = m.node_tree.nodes['Principled BSDF']
img = m.node_tree.nodes.new('ShaderNodeTexImage'); img.image = bpy.data.images.load(tex); img.interpolation = 'Closest'
m.node_tree.links.new(img.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.35
ob.data.materials.append(m)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=True)
print('ok', out, len(ob.data.polygons))
