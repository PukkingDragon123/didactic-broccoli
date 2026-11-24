"""Our own wrapped fruit candy (Mikawa-ya's jar, Gen-san's free candy): a striped boiled sweet in clear cellophane,
twisted at both ends. Hand-painted sweet.png and wrap.png in candy_tex/.
Rebuild: tools/blender.sh art/lowpix/world/made/candy.py -- <out.glb> <tex dir>"""
import bpy, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(name, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = rough
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, name + '.png')); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
S, Wr = mat('sweet', 0.2), mat('wrap', 0.3)
parts = []
bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, radius=0.011, location=(0, 0, 0.009))
o = bpy.context.active_object; o.scale = (1.35, 1.0, 0.82); o.data.materials.append(S); parts.append(o)
for sx in (-1, 1):  # the twists: a pinched neck, then a fan of crinkled cellophane
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=0.0028, radius2=0.0085, depth=0.011, location=(sx * 0.0195, 0, 0.009), rotation=(0, sx * math.pi / 2, 0))
    c = bpy.context.active_object; c.data.materials.append(Wr); c.scale = (1, 0.55, 1); parts.append(c)
    for v in c.data.vertices: v.co.x += 0.0012 * math.sin(v.co.z * 900)  # crinkle
for p in parts: p.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(bpy.context.active_object.data.polygons))
