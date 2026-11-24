"""Our own window squeegee (the window job): a blue handle with a ribbed rubber grip, a steel channel and its rubber
blade. Hand-painted textures in squeegee_tex/. Rebuild: tools/blender.sh art/lowpix/world/made/squeegee.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, tex, rough, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, tex)); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {'steel': mat('steel', 'steel.png', 0.35, 0.6), 'rubber': mat('rubber', 'rubber.png', 0.6), 'handle': mat('handle', 'handle.png', 0.45)}
parts = []
def add(o, m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
def bevel(o, w):
    mod = o.modifiers.new('b', 'BEVEL'); mod.width = w; mod.segments = 1
# blade along x at the bottom, the channel over it, the handle up the middle (Blender z up)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.012)); o = add(None, 'rubber'); o.scale = (0.27, 0.005, 0.024); bevel(o, 0.001)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.032)); o = add(None, 'steel'); o.scale = (0.272, 0.014, 0.022); bevel(o, 0.002)
bpy.ops.mesh.primitive_cylinder_add(vertices=10, radius=0.0115, depth=0.21, location=(0, 0, 0.148)); add(None, 'handle')
bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.018, radius2=0.011, depth=0.022, location=(0, 0, 0.052)); add(None, 'handle')
bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=5, radius=0.0125, location=(0, 0, 0.253)); add(None, 'handle')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.convert(target='MESH'); bpy.ops.object.join()
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
