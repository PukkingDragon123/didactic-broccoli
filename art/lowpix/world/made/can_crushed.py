"""Our own crushed soda can (lane litter for the sweep job): a 12-sided can, stamped flat in the middle and bent, a
plain red can with a white wave (no brand), creases and scuffs hand-painted in can.png.
Rebuild: tools/blender.sh art/lowpix/world/made/can_crushed.py -- <out.glb> <tex dir>"""
import bpy, bmesh, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
m = bpy.data.materials.new('can'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.4; b.inputs['Metallic'].default_value = 0.5
i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, 'can.png')); i.interpolation = 'Closest'
m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color'])
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.033, depth=0.12, location=(0, 0, 0))
o = bpy.context.active_object; o.data.materials.append(m)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.subdivide(number_cuts=3); bpy.ops.object.mode_set(mode='OBJECT')
for v in o.data.vertices:
    x, y, z = v.co
    t = 1 - min(1.0, abs(z) / 0.045)                 # the stamp: flattest in the middle
    y *= 1 - 0.7 * t ** 1.5
    x *= 1 + 0.18 * t
    z *= 0.86
    z += 0.012 * math.cos(x * 40) * t               # a crease
    v.co = (x, y, z)
o.rotation_euler = (0, math.pi / 2 - 0.25, 0.4)      # lying on its side, a little bent up
bpy.ops.object.transform_apply(rotation=True)
bpy.ops.object.shade_flat()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(o.data.polygons))
