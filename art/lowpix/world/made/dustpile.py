"""Our own dust pile (a sweep-up heap): a 40 x 30 cm mound with a soft, lumpy rise (no noise), hand-painted dust.png
(fluff, hairs, threads, crumbs, scraps). Rebuild: tools/blender.sh art/lowpix/world/made/dustpile.py -- <out.glb> <tex dir>"""
import bpy, bmesh, sys, os, math
out, td = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
m = bpy.data.materials.new('dust'); m.use_nodes = True
b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 1.0
i = m.node_tree.nodes.new('ShaderNodeTexImage'); i.image = bpy.data.images.load(os.path.join(td, 'dust.png')); i.interpolation = 'Closest'
m.node_tree.links.new(i.outputs['Color'], b.inputs['Base Color'])
bpy.ops.mesh.primitive_grid_add(x_subdivisions=14, y_subdivisions=12, size=1)
o = bpy.context.active_object; o.data.materials.append(m)
bm = bmesh.new(); bm.from_mesh(o.data)
# keep the oval: drop the grid's corners outside it, so the heap has a ragged round edge, not a sheet
bmesh.ops.delete(bm, geom=[v for v in bm.verts if math.hypot(v.co.x * 0.4 / 0.2, v.co.y * 0.3 / 0.15) > 1.08], context='VERTS')
lumps = [(-0.06, 0.02, 0.05, 0.11), (0.07, -0.03, 0.035, 0.09), (0.0, 0.06, 0.025, 0.08), (0.1, 0.06, 0.015, 0.06)]
for v in bm.verts:
    x, y = v.co.x * 0.4, v.co.y * 0.3
    r = math.hypot(x / 0.2, y / 0.15)
    h = max(0.0, 1 - r) ** 1.3 * 0.045
    for lx, ly, lh, lr in lumps: h += lh * max(0.0, 1 - math.hypot(x - lx, y - ly) / lr) ** 2
    v.co = (x, y, h * min(1.0, max(0.0, (1 - r) * 3)))
bm.to_mesh(o.data); bm.free()
bpy.ops.object.shade_smooth()
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(o.data.polygons))
