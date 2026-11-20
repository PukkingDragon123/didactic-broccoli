"""The one scene template for the gacha cards' 3D title logos (tools/logo3d.py writes the specs, renders, composites).
Every letter is a pixel-font glyph (tools/pixprint.py) extruded into a chunky solid block, chamfered on its face edges
(the facet-edge rim), painted like the toy line (brush-stroke colour bands per letter, a lighter rim, a painted side
colour, chipped wear), tilted and bounced, the top line stacked on the bottom line's tops; the series' own toys (their
build glbs) sit on, peek behind or push the letters, all in one Cycles scene with the toy key light and a shadow
catcher, so contact shadows are real. Transparent PNG out; tools/logo3d.py pixel-snaps it for the card.
  tools/blender.sh art/blender/logo3d/scene.py spec1.json [spec2.json ...]"""
import bpy, bmesh, json, math, sys
from mathutils import Vector, Matrix

KEY = Vector((-0.45, -0.62, 0.64)).normalized()  # the painted key light of the toy line (lib/paint.py): upper front-left


def lin(c):
    return tuple(((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items(): setattr(n, k, v)
    return n


def painted(name, tones, chip, chip_at, stroke, rough=0.55):
    """A hand-painted finish: brush strokes (stretched noise in the letter's own space, turned per letter) laid as hard
    colour bands of a hue-shifted ramp (tones: dark, base, light), chipped wear on top (chip colour where a fine noise
    passes chip_at). No gradients: every transition is a CONSTANT ramp step."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial'); bs = node(nt, 'ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = rough; bs.inputs['Specular IOR Level'].default_value = 0.22
    tc = node(nt, 'ShaderNodeTexCoord')
    mp = node(nt, 'ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, stroke[0], 0)
    mp.inputs['Scale'].default_value = (stroke[1], 1.0, stroke[2])
    nz = node(nt, 'ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.2; nz.inputs['Detail'].default_value = 1.5
    nz.inputs['Roughness'].default_value = 0.45
    cr = node(nt, 'ShaderNodeValToRGB'); cr.color_ramp.interpolation = 'CONSTANT'; E = cr.color_ramp.elements
    E[0].position = 0.0; E[0].color = lin(tones[0]); E[1].position = 0.37; E[1].color = lin(tones[1])
    e = E.new(0.6); e.color = lin(tones[2])
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], nz.inputs['Vector'])
    nt.links.new(nz.outputs['Fac'], cr.inputs['Fac'])
    wz = node(nt, 'ShaderNodeTexNoise'); wz.inputs['Scale'].default_value = 16.0; wz.inputs['Detail'].default_value = 3.0
    wr = node(nt, 'ShaderNodeValToRGB'); wr.color_ramp.interpolation = 'CONSTANT'; W = wr.color_ramp.elements
    W[0].color = (0, 0, 0, 1); W[1].position = chip_at; W[1].color = (1, 1, 1, 1)
    mx = node(nt, 'ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs['B'].default_value = lin(chip)
    nt.links.new(tc.outputs['Object'], wz.inputs['Vector']); nt.links.new(wz.outputs['Fac'], wr.inputs['Fac'])
    nt.links.new(wr.outputs['Color'], mx.inputs['Factor']); nt.links.new(cr.outputs['Color'], mx.inputs['A'])
    nt.links.new(mx.outputs['Result'], bs.inputs['Base Color']); nt.links.new(bs.outputs['BSDF'], out.inputs['Surface'])
    return m


def letter(L, i):
    """One glyph block: front faces at y = 0 facing the camera (-y), extruded to y = depth, face edges chamfered."""
    rows, b, p, d = L['rows'], L['b'], L['p'], L['depth']
    h, w = len(rows), len(rows[0]); bm = bmesh.new(); V = {}
    def v(x, z):
        if (x, z) not in V: V[(x, z)] = bm.verts.new(((x - w / 2) * p, 0.0, (b - z) * p))
        return V[(x, z)]
    fr = [bm.faces.new((v(x, z + 1), v(x + 1, z + 1), v(x + 1, z), v(x, z))) for z, r in enumerate(rows) for x, c in enumerate(r) if c == '1']
    ex = bmesh.ops.extrude_face_region(bm, geom=fr, use_keep_orig=True)
    for g in ex['geom']:
        if isinstance(g, bmesh.types.BMVert): g.co.y += d
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.dissolve_limit(bm, angle_limit=0.01, verts=list(bm.verts), edges=list(bm.edges))
    bw = bm.edges.layers.float.get('bevel_weight_edge') or bm.edges.layers.float.new('bevel_weight_edge')
    for f in bm.faces:
        f.material_index = 0 if f.normal.y < -0.9 else 2; f.smooth = False
    for e in bm.edges:
        if any(f.material_index == 0 for f in e.link_faces): e[bw] = 1.0
    me = bpy.data.meshes.new('L%d' % i); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('L%d' % i, me); bpy.context.scene.collection.objects.link(ob)
    for m in L['mats']: me.materials.append(m)
    bv = ob.modifiers.new('rim', 'BEVEL'); bv.width = L['cham']; bv.segments = 1; bv.limit_method = 'WEIGHT'
    bv.material = 1; bv.harden_normals = False; bv.use_clamp_overlap = True
    return ob


def world_verts(ob, n=400):
    dg = bpy.context.evaluated_depsgraph_get(); out = []
    for o in ([ob] + list(ob.children_recursive)):
        if o.type != 'MESH': continue
        e = o.evaluated_get(dg); me = e.to_mesh(); M = o.matrix_world
        st = max(1, len(me.vertices) // n)
        out += [M @ me.vertices[k].co for k in range(0, len(me.vertices), st)]
        e.to_mesh_clear()
    return out


def bbox(ob):
    P = world_verts(ob, 2000)
    return Vector([min(q[k] for q in P) for k in range(3)]), Vector([max(q[k] for q in P) for k in range(3)])


def drop(ob, floor=0.0):
    """Lower ob straight down until it rests on whatever is below it (letters, toys, the ground)."""
    bpy.context.view_layer.update(); P = world_verts(ob); o = ob.location.copy()
    ob.location.z += 1000; bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get(); sc = bpy.context.scene; need = -1e9
    for q in P:
        hit, loc, *_ = sc.ray_cast(dg, Vector((q.x, q.y, 500.0)), Vector((0, 0, -1)))
        need = max(need, (loc.z if hit else floor) - (q.z - o.z))
    ob.location = Vector((o.x, o.y, need)); bpy.context.view_layer.update()


def toy(T, i):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=T['glb'])
    new = [o for o in bpy.data.objects if o not in before]
    E = bpy.data.objects.new('T%d' % i, None); bpy.context.scene.collection.objects.link(E)
    for o in new:
        if o.parent is None: o.parent = E
    bpy.context.view_layer.update(); lo, hi = bbox(E)
    s = T['h'] / max(1e-6, hi.z - lo.z)
    if (hi.x - lo.x) * s > T['h'] * T.get('wmax', 1.35): s = T['h'] * T.get('wmax', 1.35) / (hi.x - lo.x)
    E.scale = (s, s, s); E.location = (-(lo.x + hi.x) / 2 * s, -(lo.y + hi.y) / 2 * s, -lo.z * s)
    bpy.context.view_layer.update()
    # re-centre on the origin so the yaw turns it in place
    R = bpy.data.objects.new('R%d' % i, None); bpy.context.scene.collection.objects.link(R); E.parent = R
    R.rotation_euler = (math.radians(T.get('pitch', 0)), math.radians(T.get('roll', 0)), math.radians(T.get('yaw', 0)))
    bpy.context.view_layer.update()
    return R


def build(S):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    # ground: a shadow catcher, so only the real shadows reach the card
    me = bpy.data.meshes.new('ground'); bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(me); bm.free()
    g = bpy.data.objects.new('ground', me); sc.collection.objects.link(g); g.is_shadow_catcher = True
    obs = {}
    for i, L in enumerate(S['letters']):
        L['mats'] = [painted('f%d' % i, L['front'], L['chip_f'], 0.74, L['stroke']),
                     painted('r%d' % i, L['rim'], L['chip_r'], 0.6, L['stroke']),
                     painted('s%d' % i, L['side'], L['chip_s'], 0.68, (L['stroke'][0] + 1.2, L['stroke'][1], L['stroke'][2]))]
        ob = letter(L, i); obs[i] = ob
        ob.rotation_euler = (math.radians(L['pitch']), math.radians(L['tilt']), math.radians(L['yaw']))
        ob.scale = (L['s'],) * 3; ob.location = (L['x'], L['y'], 0.0)
    for ob in obs.values(): ob.location.z = 1000.0
    bpy.context.view_layer.update()
    # rest every letter: the bottom line on the ground, then the top line on the bottom line's tops
    lines = sorted({L['line'] for L in S['letters']}, reverse=True)
    for line in lines:  # the bottom line stands on the ground; the top line rests on the bottom line's tops
        idx = [i for i, L in enumerate(S['letters']) if L['line'] == line]; zs = {}; last = 0.0
        for i in idx:
            if S['letters'][i].get('punct'): zs[i] = last; continue
            obs[i].location.z = 0.0; bpy.context.view_layer.update()
            if line == lines[0]: zs[i] = -min(q.z for q in world_verts(obs[i], 3000))
            else: drop(obs[i]); zs[i] = max(obs[i].location.z, S.get('shelf', {}).get(str(line), 0.0))  # never falls through a gap
            last = zs[i]; obs[i].location.z = 1000.0
        for i in idx: obs[i].location.z = zs[i]
        bpy.context.view_layer.update()
    for i, T in enumerate(S['toys']):
        R = toy(T, i); lo, hi = bbox(R); hw = (hi.x - lo.x) / 2; hd = (hi.y - lo.y) / 2
        A = obs[T['at']]; alo, ahi = bbox(A)
        if T['role'] == 'sit':
            R.location = ((alo.x + ahi.x) / 2 + T.get('dx', 0) * (ahi.x - alo.x), (alo.y + ahi.y) / 2 + 0.04, 0)
        elif T['role'] == 'peek':
            R.location = ((alo.x + ahi.x) / 2 + (ahi.x - alo.x) * (0.22 if T['side'] == 'r' else -0.22), ahi.y + hd + 0.03, 0)
        elif T['role'] == 'push':
            mid = [q for q in world_verts(A, 3000) if abs(q.z - (alo.z + ahi.z) / 2) < (ahi.z - alo.z) * 0.3]
            ex = max(q.x for q in mid) if T['side'] == 'r' else min(q.x for q in mid)
            R.location = (ex + (hw * 0.82 if T['side'] == 'r' else -hw * 0.82), (alo.y + ahi.y) / 2 - 0.05, 0)
        elif T['role'] == 'hold':
            R.location = ((alo.x + ahi.x) / 2 + T.get('dx', 0) * (ahi.x - alo.x), alo.y - hd - 0.02, 0)
        bpy.context.view_layer.update()
        if T['role'] == 'sit': drop(R)
        else: R.location.z = -min(q.z for q in world_verts(R, 3000)); bpy.context.view_layer.update()
    # backdrop: a second shadow catcher standing behind the logo, so the letters cast a real shadow on the card
    ys = [q.y for o in sc.objects if o.type == 'MESH' and o is not g for q in world_verts(o, 300)]
    me = bpy.data.meshes.new('back'); bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(me); bm.free()
    bd = bpy.data.objects.new('back', me); sc.collection.objects.link(bd); bd.is_shadow_catcher = True
    g.visible_shadow = False; bd.visible_shadow = False  # catchers take shadows, never cast them
    bd.rotation_euler = (math.radians(90), 0, 0); bd.location = (0, max(ys) + S.get('gap', 0.12), 0)
    # lights: the toy key from the upper front-left (hard sun), a cool soft fill, a pale sky
    k = bpy.data.objects.new('key', bpy.data.lights.new('key', 'SUN')); sc.collection.objects.link(k)
    k.data.energy = S.get('key', 4.4); k.data.angle = math.radians(3); k.rotation_euler = KEY.to_track_quat('Z', 'Y').to_euler()
    f = bpy.data.objects.new('fill', bpy.data.lights.new('fill', 'SUN')); sc.collection.objects.link(f)
    f.data.energy = 0.7; f.data.angle = math.radians(40); f.data.color = (0.86, 0.9, 1.0)
    f.rotation_euler = Vector((0.7, -0.5, 0.35)).normalized().to_track_quat('Z', 'Y').to_euler()
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.78, 0.8, 0.86, 1); bg.inputs[1].default_value = 0.55
    # camera: look at the logo from a little above and to one side, framed tight (perspective)
    allp = []
    for o in sc.objects:
        if o.type == 'MESH' and o not in (g, bd): allp += world_verts(o, 600)
    lo = Vector([min(q[k] for q in allp) for k in range(3)]); hi = Vector([max(q[k] for q in allp) for k in range(3)])
    ctr = (lo + hi) / 2; e, a = math.radians(S['cam']['elev']), math.radians(S['cam']['azim'])
    dist = S['cam'].get('dist', 3.2) * max(hi.x - lo.x, hi.z - lo.z)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.location = ctr + Vector((-math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler(); bpy.context.view_layer.update()
    Mi = cam.matrix_world.inverted(); uv = [(c.x / -c.z, c.y / -c.z) for c in (Mi @ q for q in allp)]
    u0, u1 = min(t[0] for t in uv), max(t[0] for t in uv); v0, v1 = min(t[1] for t in uv), max(t[1] for t in uv)
    m = 0.03 * (u1 - u0); u0 -= m; u1 += m; v0 -= m; v1 += m
    bw, bh = S['box']; A = (u1 - u0) / (v1 - v0)
    rw, rh = (bw, max(8, round(bw / A))) if A > bw / bh else (max(8, round(bh * A)), bh)
    cd = cam.data; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36.0; cd.lens = 36.0 / (u1 - u0)
    big = max(u1 - u0, (u1 - u0) * rh / rw)
    cd.shift_x = ((u0 + u1) / 2) / big; cd.shift_y = ((v0 + v1) / 2) / big
    r = sc.render; r.engine = 'CYCLES'; r.resolution_x, r.resolution_y = rw * S.get('ss', 1), rh * S.get('ss', 1)
    r.resolution_percentage = 100; r.film_transparent = True; r.filter_size = 0.8
    r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'; r.filepath = S['out']
    sc.cycles.samples = S.get('samples', 48); sc.cycles.use_denoising = True; sc.cycles.max_bounces = 3
    sc.cycles.device = 'CPU'; sc.view_settings.view_transform = 'Standard'; sc.view_settings.look = 'None'
    bpy.ops.render.render(write_still=True)
    print('logo3d', S['out'], rw, rh)


if __name__ == '__main__':
    for p in sys.argv[1:]: build(json.load(open(p)))
