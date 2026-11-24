import bpy, os
def setup():
    bpy.ops.wm.read_factory_settings(use_empty=True)
def mat(td, n, r=0.6, mt=0.0):
    m = bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = r; b.inputs['Metallic'].default_value = mt
    i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, n + '.png')); i.interpolation = 'Closest'
    m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color']); return m
def finish(parts, out, smooth=True, apply_mods=False):
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in parts: o.select_set(True)
    if apply_mods:
        for o in parts:
            bpy.context.view_layer.objects.active = o
            for md in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join(); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if smooth: bpy.ops.object.shade_smooth()
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
    print('ok', out, len(bpy.context.active_object.data.polygons))
