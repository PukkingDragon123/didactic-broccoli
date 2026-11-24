"""Our own sign hook (the hook right of the shutter where the OPEN sign hangs): a rusty steel J-hook screwed into the
wall through a washer. Hand-painted rust.png in hook_tex/. Rebuild: tools/blender.sh art/lowpix/world/made/hook.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
m = bpy.data.materials.new('rust'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.6; b.inputs['Metallic'].default_value = 0.4
i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, 'rust.png')); i.interpolation = 'Closest'
m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color'])
parts = []
def cyl(r, h, loc, rot, v=8):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=loc, rotation=rot); o = bpy.context.active_object; o.data.materials.append(m); parts.append(o)
cyl(0.007, 0.0015, (0, 0.00075, 0.012), (math.pi / 2, 0, 0), 10)        # the washer on the wall (wall = y 0, out = -y)
cyl(0.0022, 0.026, (0, -0.013, 0.012), (math.pi / 2, 0, 0))             # the shank, straight out
cyl(0.0022, 0.012, (0, -0.0262, 0.0165), (0, 0, 0))                     # the upturned tip
bpy.ops.mesh.primitive_torus_add(major_segments=8, minor_segments=6, major_radius=0.0035, minor_radius=0.0022, location=(0, -0.0235, 0.012), rotation=(0, math.pi / 2, 0))
o = bpy.context.active_object; o.data.materials.append(m); parts.append(o)
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.shade_smooth()
o = bpy.context.active_object; o.location.z = -0.0045; bpy.ops.object.transform_apply(location=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(o.data.polygons))
