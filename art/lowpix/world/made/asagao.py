"""Our own morning glory (asagao) in a school pot: a blue plastic pot of soil, an andon trellis of four bamboo canes with
two rings, the vine winding up it with heart-shaped leaves, and (flowering) blue trumpet flowers. Hand-painted textures
in asagao_tex/. Rebuild: tools/blender.sh art/lowpix/world/made/asagao.py -- <out.glb> <tex dir> <flowers 0|1>"""
import bpy, bmesh, sys, os, math, random
out, td, fl = sys.argv[-3], sys.argv[-2], sys.argv[-1] == '1'
random.seed(3)
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(n, r=0.7):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = r
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, n + '.png')); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
M = {n: mat(n) for n in ['pot', 'soil', 'bamboo', 'vine', 'leaf', 'flower']}
parts = []
def take(m):
    o = bpy.context.active_object; o.data.materials.append(M[m]); parts.append(o); return o
# the pot, its rim and the soil
bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.085, radius2=0.11, depth=0.15, location=(0, 0, 0.075)); take('pot')
bpy.ops.mesh.primitive_torus_add(major_segments=14, minor_segments=4, major_radius=0.112, minor_radius=0.008, location=(0, 0, 0.15)); take('pot')
bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=0.104, depth=0.01, location=(0, 0, 0.135)); take('soil')
# the andon trellis: four canes, two rings
H = 0.62
for k in range(4):
    a = k * math.pi / 2 + math.pi / 4
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.005, depth=H, location=(math.cos(a) * 0.075, math.sin(a) * 0.075, 0.13 + H / 2)); take('bamboo')
for z in (0.42, 0.7):
    bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=4, major_radius=0.076, minor_radius=0.003, location=(0, 0, z)); take('bamboo')
# the vine: a helix round the canes (a curve with a round bevel)
cu = bpy.data.curves.new('vine', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.0025; cu.bevel_resolution = 1
sp = cu.splines.new('POLY'); pts = []
for i in range(60):
    t = i / 59; a = t * math.pi * 2 * 3.2; r = 0.082 + 0.004 * math.sin(i)
    pts.append((math.cos(a) * r, math.sin(a) * r, 0.14 + t * (H - 0.02)))
sp.points.add(len(pts) - 1)
for p, c in zip(sp.points, pts): p.co = (*c, 1)
vo = bpy.data.objects.new('vine', cu); bpy.context.collection.objects.link(vo)
bpy.context.view_layer.objects.active = vo; vo.select_set(True); bpy.ops.object.convert(target='MESH'); vo.data.materials.append(M['vine']); parts.append(vo)
# heart-shaped leaves along the vine, facing out, cupped a little
def leaf(at, a, s, tilt):
    bm = bmesh.new()
    outline = [(0, 0)] + [((math.sin(t) ** 3) * 0.5, (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)) / 32 + 0.4) for t in [math.pi * k / 8 for k in range(1, 16)]]
    c = bm.verts.new((0, 0.01, 0.42))
    vs = [bm.verts.new((x, -abs(x) * 0.25, y)) for x, y in outline[1:]]
    for k in range(len(vs) - 1): bm.faces.new([c, vs[k], vs[k + 1]])
    me = bpy.data.meshes.new('leaf'); bm.to_mesh(me); bm.free()
    uv = me.uv_layers.new()
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co; uv.data[li].uv = (co.x + 0.5, co.z)
    o = bpy.data.objects.new('leaf', me); bpy.context.collection.objects.link(o); o.data.materials.append(M['leaf'])
    o.scale = (s, s, s); o.location = at; o.rotation_euler = (tilt, 0, a + math.pi / 2); parts.append(o)
for i in range(4, 58, 3):
    x, y, z = pts[i]; a = math.atan2(y, x)
    leaf((x * 1.15, y * 1.15, z - 0.02), a + random.uniform(-0.5, 0.5), random.uniform(0.07, 0.1) * (0.8 + 0.4 * (i / 58)), random.uniform(0.3, 0.9))
if fl:  # trumpet flowers on short stalks, open outward
    for i in (14, 22, 29, 35, 41, 47, 53, 57):
        x, y, z = pts[i]; a = math.atan2(y, x) + random.uniform(-0.4, 0.4)
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.004, radius2=0.034, depth=0.04, location=(math.cos(a) * 0.115, math.sin(a) * 0.115, z + 0.01), rotation=(0, math.pi / 2 - 0.4, a))
        take('flower')
for o in bpy.context.selected_objects: o.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
