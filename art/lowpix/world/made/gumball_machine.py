"""Our own penny gumball machine (the shop's gumball corner): a cast-iron foot and column, a red enamelled head with
the chrome coin mechanism, its turning handle and the chute, a glass globe packed with gumballs (painted behind the
glass), a red cap. 1.2 m. Hand-painted textures in gumball_machine_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/gumball_machine.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n, r=0.5, mt=0.0):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = r; b.inputs['Metallic'].default_value = mt
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, n + '.png')); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {'globe': mat('globe', 0.15), 'red': mat('red', 0.4, 0.2), 'chrome': mat('chrome', 0.25, 0.8), 'iron': mat('iron', 0.6, 0.4)}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
def cyl(r, h, z, m, v=16, r2=None, y=0.0, rot=(0, 0, 0)):
    if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=(0, y, z), rotation=rot)
    else: bpy.ops.mesh.primitive_cone_add(vertices=v, radius1=r, radius2=r2, depth=h, location=(0, y, z), rotation=rot)
    return take(m)
cyl(0.17, 0.03, 0.015, 'iron', 16, 0.15)                 # the foot
cyl(0.07, 0.06, 0.06, 'iron', 12, 0.04)
cyl(0.035, 0.42, 0.3, 'iron', 10)                        # the column
cyl(0.06, 0.04, 0.52, 'iron', 12, 0.08)                  # collar
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.68)); o = take('red'); o.scale = (0.26, 0.24, 0.28)
md = o.modifiers.new('b', 'BEVEL'); md.width = 0.02; md.segments = 2
cyl(0.15, 0.03, 0.835, 'red', 16)                         # the globe's seat ring
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.16, location=(0, 0, 0.97)); take('globe')
cyl(0.08, 0.04, 1.125, 'red', 16, 0.07)                   # the cap
bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.025, location=(0, 0, 1.16)); take('chrome')
# the coin mechanism on the front (front = -y), the handle, the chute and its little flap
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.127, 0.7)); o = take('chrome'); o.scale = (0.14, 0.02, 0.12)
cyl(0.035, 0.03, 0.714, 'chrome', 12, y=-0.15, rot=(math.pi / 2, 0, 0))
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.172, 0.714)); o = take('chrome'); o.scale = (0.09, 0.016, 0.018)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, -0.14, 0.62)); o = take('chrome'); o.scale = (0.09, 0.05, 0.05)
for o in parts: o.select_set(True)
for o in parts:
    bpy.context.view_layer.objects.active = o
    for m2 in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m2.name)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
