"""Our own kamidana (the household god-shelf: Mikawa-ya, Ramen Yamada, the garage): a hinoki shelf on two brackets, a
miniature shrine (steps, body with lacquered doors, gabled roof with its ridge billets), two sakaki vases, two sake jars,
the straw shimenawa along the front with three paper shide. Hand-painted textures in kamidana_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/kamidana_own.py -- <out.glb> <tex dir>"""
import bpy, bmesh, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rough=0.7):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, name + '.png')); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {k: mat(k) for k in ['hinoki', 'hinoki_old', 'doors', 'ceramic', 'sakaki', 'rope', 'paper']}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
def box(sx, sy, sz, x, y, z, m):  # Blender: x right, y back(-)/front(+) as depth, z up
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = take(m); o.scale = (sx, sy, sz); return o
def cyl(r, h, x, y, z, m, v=10, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=v, radius=r, depth=h, location=(x, y, z), rotation=rot); return take(m)
F = -0.12  # the shelf's front edge (toward the room is -y here; flipped on export below)
box(0.72, 0.26, 0.03, 0, 0, 0.015, 'hinoki')                                 # the shelf
for x in (-0.31, 0.31): box(0.03, 0.03, 0.09, x, 0.1, -0.045, 'hinoki_old')   # brackets under the back
# the miniature shrine
box(0.27, 0.17, 0.02, 0, 0.02, 0.04, 'hinoki'); box(0.23, 0.15, 0.02, 0, 0.02, 0.06, 'hinoki')
box(0.17, 0.11, 0.15, 0, 0.03, 0.145, 'hinoki')
box(0.11, 0.004, 0.11, 0, 0.03 - 0.056, 0.14, 'doors')
for x in (-0.07, 0.07): cyl(0.007, 0.15, x, -0.03, 0.145, 'hinoki_old', 6)   # front posts
bm = bmesh.new()  # the gabled roof: a prism with deep eaves, ridge along x
w, d, h, z0 = 0.15, 0.12, 0.07, 0.22
vs = [bm.verts.new(c) for c in [(-w, -d, z0), (w, -d, z0), (w, d, z0), (-w, d, z0), (-w, 0, z0 + h), (w, 0, z0 + h)]]
for f in [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]: bm.faces.new([vs[i] for i in f])
me = bpy.data.meshes.new('roof'); bm.to_mesh(me); bm.free()
ro = bpy.data.objects.new('roof', me); bpy.context.collection.objects.link(ro); ro.data.materials.append(M['hinoki_old']); parts.append(ro)
bpy.context.view_layer.objects.active = ro; ro.select_set(True)
bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.cube_project(cube_size=0.3); bpy.ops.object.mode_set(mode='OBJECT')
box(0.3, 0.014, 0.014, 0, 0, z0 + h + 0.004, 'hinoki_old')                    # the ridge beam
for x in (-0.08, 0, 0.08): cyl(0.008, 0.035, x, 0, z0 + h + 0.014, 'hinoki', 6, (math.pi / 2, 0, 0))  # billets
for x in (-0.13, 0.13): cyl(0.0045, 0.05, x, 0, z0 + h + 0.02, 'hinoki', 5, (0.5 if x > 0 else -0.5, 0, 0))  # crossed end boards
# offerings: the sakaki in their vases, the sake jars
for x in (-0.25, 0.25):
    cyl(0.02, 0.07, x, 0.02, 0.065, 'ceramic', 10)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.05, location=(x, 0.02, 0.15)); o = take('sakaki'); o.scale = (0.8, 0.6, 1.2)
for x in (-0.16, 0.16): cyl(0.013, 0.045, x, F + 0.04, 0.052, 'ceramic', 8)
# the shimenawa along the front edge, and its shide
cyl(0.012, 0.74, 0, F - 0.008, 0.005, 'rope', 8, (0, math.pi / 2, 0))
for x in (-0.2, 0, 0.2):
    bm = bmesh.new(); pts = [(0, 0), (0.02, -0.02), (0, -0.04), (0.02, -0.06), (0, -0.08)]
    vs = []
    for px, pz in pts: vs += [bm.verts.new((x + px - 0.012, F - 0.02, pz)), bm.verts.new((x + px + 0.012, F - 0.02, pz))]
    for k in range(len(pts) - 1): bm.faces.new([vs[2 * k], vs[2 * k + 1], vs[2 * k + 3], vs[2 * k + 2]])
    me = bpy.data.meshes.new('shide'); bm.to_mesh(me); bm.free()
    so = bpy.data.objects.new('shide', me); bpy.context.collection.objects.link(so); so.data.materials.append(M['paper']); parts.append(so)
for o in bpy.context.selected_objects: o.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
o = bpy.context.active_object
# (the front is Blender -y, which the glTF exporter turns into +z: the game's props face +z)
o.location.z = 0.09; bpy.ops.object.transform_apply(location=True)  # brackets' feet at 0
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(o.data.polygons))
