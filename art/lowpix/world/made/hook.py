"""Our own sign hook (the hook right of the shutter where the OPEN sign hangs): a galvanised steel J-hook, the rod bent
up at the tip, on a square plate screwed to the wall. Hand-painted galv.png in hook_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/hook.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
m = bpy.data.materials.new('galv'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.35; b.inputs['Metallic'].default_value = 0.7
i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, 'galv.png')); i.interpolation = 'Closest'
m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color'])
parts = []
def add():
    o = bpy.context.active_object; o.data.materials.append(m); parts.append(o); return o
# the wall is y = 0, the room is -y (glTF +z); the plate, its two screws, the rod out, the bend, the tip up
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.0015, 0.02)); o = add(); o.scale = (0.022, 0.003, 0.034)
for z in (0.008, 0.032):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.003, depth=0.002, location=(0, -0.0035, z), rotation=(math.pi / 2, 0, 0)); add()
cu = bpy.data.curves.new('rod', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.0022; cu.bevel_resolution = 2
sp = cu.splines.new('POLY'); P = [(0, -0.003, 0.02), (0, -0.02, 0.02), (0, -0.03, 0.021), (0, -0.036, 0.025), (0, -0.039, 0.031), (0, -0.04, 0.04)]
sp.points.add(len(P) - 1)
for p, c in zip(sp.points, P): p.co = (*c, 1)
ro = bpy.data.objects.new('rod', cu); bpy.context.collection.objects.link(ro)
bpy.context.view_layer.objects.active = ro; ro.select_set(True); bpy.ops.object.convert(target='MESH'); ro.data.materials.append(m); parts.append(ro)
bpy.ops.mesh.primitive_uv_sphere_add(segments=8, ring_count=4, radius=0.0026, location=(0, -0.04, 0.0405)); add()
for o in bpy.context.selected_objects: o.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); bpy.ops.object.shade_smooth()
o = bpy.context.active_object; o.location.z = -0.003; bpy.ops.object.transform_apply(location=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(o.data.polygons))
