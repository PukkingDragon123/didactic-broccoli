"""Our own robot-vacuum dock (catalogue vacuum): a white ABS ramp plate and back panel with rounded edges, brass charging
contacts, a blue status light, dark rubber feet. Hand-painted textures in dock_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/vacuum_dock.py -- <out.glb> <tex dir>"""
import bpy, sys, os
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n, r=0.5):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = r
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, n + '.png')); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {n: mat(n) for n in ['abs', 'dark', 'brass', 'led']}
parts = []
def box(sx, sy, sz, x, y, z, m, bev=0.004):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = bpy.context.active_object; o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    if bev: md = o.modifiers.new('b', 'BEVEL'); md.width = bev; md.segments = 2
    o.data.materials.append(M[m]); parts.append(o); return o
box(0.26, 0.1, 0.012, 0, -0.03, 0.006, 'abs')            # the ramp plate (front = -y -> glTF +z)
box(0.26, 0.04, 0.1, 0, 0.03, 0.05, 'abs', 0.008)        # the back
box(0.2, 0.004, 0.06, 0, 0.0072, 0.055, 'dark', 0.001)   # the front panel
for x in (-0.07, 0.07): box(0.012, 0.01, 0.004, x, -0.04, 0.0135, 'brass', 0)  # charging contacts
box(0.016, 0.004, 0.006, 0, 0.0046, 0.075, 'led', 0)     # the light
for x in (-0.11, 0.11): box(0.02, 0.02, 0.003, x, 0.03, -0.0015, 'dark', 0)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
for o in parts:
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
o = bpy.context.active_object; o.location.z = 0.003; bpy.ops.object.transform_apply(location=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(o.data.polygons))
