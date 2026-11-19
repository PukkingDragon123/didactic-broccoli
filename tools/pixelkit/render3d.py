"""Blender (headless bpy) half of the pixel kit's 3D-to-pixel pipeline.
   tools/blender.sh tools/pixelkit/render3d.py <workdir> [job ...]
Models each object (real geometry: relief-displaced coins with milled edges, a subdivided piggy with folded
ears and a curly tail, tin bank, kiss-lock purse, capsule), renders it point-sampled at 4x the sprite's native
size as two Raw passes per frame: camera-space normals (n.png) and material id / pattern / depth (i.png),
plus projected decal anchors (anchors.json). tools/pixelkit/build.py toon-shades, quantises and outlines."""
import bpy, bmesh, json, math, os, sys
import numpy as np
from mathutils import Vector, Quaternion, Euler
from bpy_extras.object_utils import world_to_camera_view

WORK = sys.argv[1]
JOBS = sys.argv[2:]
SS = 4  # supersample


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 1
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.cycles.pixel_filter_type = 'BOX'
    sc.cycles.filter_width = 0.01
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Raw'
    sc.view_settings.look = 'None'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGBA'
    sc.render.image_settings.color_depth = '16'
    sc.render.threads_mode = 'FIXED'
    sc.render.threads = 2
    return sc


def emission_mat(name, build):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    build(nt, em.inputs['Color'])
    return m


def normal_mat():
    def b(nt, col):
        g = nt.nodes.new('ShaderNodeNewGeometry')
        vt = nt.nodes.new('ShaderNodeVectorTransform')
        vt.vector_type = 'NORMAL'; vt.convert_from = 'WORLD'; vt.convert_to = 'CAMERA'
        nt.links.new(g.outputs['Normal'], vt.inputs['Vector'])
        mul = nt.nodes.new('ShaderNodeVectorMath'); mul.operation = 'MULTIPLY_ADD'
        mul.inputs[1].default_value = (0.5, 0.5, 0.5); mul.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(vt.outputs[0], mul.inputs[0])
        nt.links.new(mul.outputs[0], col)
    return emission_mat('N', b)


def id_mat(mid, pattern=None):
    """R = mid/32, G = pattern (0/1), B = camera depth mapped to 0..1 (over 0..20 units)."""
    def b(nt, col):
        comb = nt.nodes.new('ShaderNodeCombineXYZ')
        comb.inputs[0].default_value = mid / 32
        g = nt.nodes.new('ShaderNodeNewGeometry')
        vt = nt.nodes.new('ShaderNodeVectorTransform')
        vt.vector_type = 'POINT'; vt.convert_from = 'WORLD'; vt.convert_to = 'CAMERA'
        nt.links.new(g.outputs['Position'], vt.inputs['Vector'])
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(vt.outputs[0], sep.inputs[0])
        dm = nt.nodes.new('ShaderNodeMath'); dm.operation = 'MULTIPLY'; dm.inputs[1].default_value = 1 / 20
        nt.links.new(sep.outputs[2], dm.inputs[0]); nt.links.new(dm.outputs[0], comb.inputs[2])
        if pattern:
            nt.links.new(pattern(nt), comb.inputs[1])
        nt.links.new(comb.outputs[0], col)
    return emission_mat(f'ID{mid}', b)


def dots_pattern(scale, rad, axes=(0, 2)):
    """Regular polka dots in object space (offset every other row)."""
    def p(nt):
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])

        def M(op, a, b=None, v=None):
            n = nt.nodes.new('ShaderNodeMath'); n.operation = op
            for i, x in enumerate((a, b)):
                if x is None:
                    continue
                if isinstance(x, (int, float)):
                    n.inputs[i].default_value = x
                else:
                    nt.links.new(x, n.inputs[i])
            return n.outputs[0]
        u = M('MULTIPLY', sep.outputs[axes[0]], scale)
        v = M('MULTIPLY', sep.outputs[axes[1]], scale)
        row = M('FLOOR', v)
        shift = M('MULTIPLY', M('FRACT', M('MULTIPLY', row, 0.5)), 1.0)
        fu = M('SUBTRACT', M('FRACT', M('ADD', u, shift)), 0.5)
        fv = M('SUBTRACT', M('FRACT', v), 0.5)
        d = M('SQRT', M('ADD', M('MULTIPLY', fu, fu), M('MULTIPLY', fv, fv)))
        return M('LESS_THAN', d, rad)
    return p


def height_pattern(h, D):
    """Coin relief height (0 field .. 1 rim) from |local z|, for recess darkening / polished tops."""
    def p(nt):
        tc = nt.nodes.new('ShaderNodeTexCoord')
        sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        a = nt.nodes.new('ShaderNodeMath'); a.operation = 'ABSOLUTE'; nt.links.new(sep.outputs[2], a.inputs[0])
        m = nt.nodes.new('ShaderNodeMapRange'); m.clamp = True
        m.inputs[1].default_value = h; m.inputs[2].default_value = h + D
        nt.links.new(a.outputs[0], m.inputs[0])
        return m.outputs[0]
    return p


def camera(sc, W, H, S, az, el, target=(0, 0, 0), dist=10):
    cam = bpy.data.cameras.new('cam'); cam.type = 'ORTHO'
    cam.ortho_scale = max(W, H) / S
    co = bpy.data.objects.new('cam', cam); sc.collection.objects.link(co)
    a, e = math.radians(az), math.radians(el)
    d = Vector((-math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))
    co.location = Vector(target) + d * dist
    co.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = W * SS, H * SS
    sc.render.resolution_percentage = 100
    cam.sensor_fit = 'HORIZONTAL' if W >= H else 'VERTICAL'
    return co


def mesh_obj(sc, name, bm, mid, smooth=True, mats=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    if smooth:
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
    ob = bpy.data.objects.new(name, me)
    sc.collection.objects.link(ob)
    ob['mid'] = mid
    return ob


def render_frame(sc, out_dir, fi, objs, idmats, nmat, anchors=None):
    os.makedirs(out_dir, exist_ok=True)
    for ob in objs:
        ob.data.materials.clear(); ob.data.materials.append(nmat)
    sc.render.filepath = os.path.join(out_dir, f'f{fi}_n.png')
    bpy.ops.render.render(write_still=True)
    for ob in objs:
        ob.data.materials.clear(); ob.data.materials.append(idmats[ob['mid']])
    sc.render.filepath = os.path.join(out_dir, f'f{fi}_i.png')
    bpy.ops.render.render(write_still=True)
    res = {}
    if anchors:
        dg = bpy.context.evaluated_depsgraph_get()
        cam = sc.camera
        fwd = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
        W, H = sc.render.resolution_x / SS, sc.render.resolution_y / SS
        for k, (ob, p) in anchors.items():
            wp = ob.matrix_world @ Vector(p)
            v = world_to_camera_view(sc, cam, wp)
            hit, loc, *_ = sc.ray_cast(dg, wp - fwd * 0.02, -fwd)
            res[k] = [v.x * W, (1 - v.y) * H, not hit]
    return res


def ids(spec):
    return {k: id_mat(k, pat) for k, pat in spec.items()}


# ======================= coins ===========================================================
def coin_mesh(Hf, Hb, h, D, hole, reeds):
    NS, NR = 192, 70
    r0 = hole
    bm = bmesh.new()

    def samp(Hm, u, v):
        n = Hm.shape[0]
        x = (u + 1) / 2 * (n - 1); y = (1 - v) / 2 * (n - 1)
        x0, y0 = int(np.clip(math.floor(x), 0, n - 2)), int(np.clip(math.floor(y), 0, n - 2))
        fx, fy = x - x0, y - y0
        return (Hm[y0, x0] * (1 - fx) * (1 - fy) + Hm[y0, x0 + 1] * fx * (1 - fy) + Hm[y0 + 1, x0] * (1 - fx) * fy + Hm[y0 + 1, x0 + 1] * fx * fy)

    def face(Hm, side):
        rings = []
        start = 0 if r0 > 0 else 1
        centre = None
        if r0 == 0:
            centre = bm.verts.new((0, 0, side * (h + D * samp(Hm, 0, 0))))
        for i in range(start, NR + 1):
            r = r0 + (1 - r0) * i / NR
            ring = []
            for j in range(NS):
                a = 2 * math.pi * j / NS
                u, v = r * math.cos(a), r * math.sin(a)
                hu = u if side > 0 else -u
                ring.append(bm.verts.new((u, v, side * (h + D * samp(Hm, hu, v)))))
            rings.append(ring)
        if centre is not None:
            for j in range(NS):
                f = (centre, rings[0][j], rings[0][(j + 1) % NS])
                bm.faces.new(f if side > 0 else f[::-1])
        for i in range(len(rings) - 1):
            for j in range(NS):
                q = (rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % NS], rings[i][(j + 1) % NS])
                bm.faces.new(q[::-1] if side > 0 else q)
        return rings
    F = face(Hf, 1); B = face(Hb, -1)

    def wall(outer, inner_r, flip):
        N = NS if not reeds else reeds * 4
        top, bot = [], []
        for j in range(N):
            a = 2 * math.pi * j / N
            r = inner_r
            if reeds and not flip and (j % 4) in (2, 3):
                r *= 0.968
            zt = h + D * samp(Hf, math.cos(a) * inner_r, math.sin(a) * inner_r) - 0.002
            zb = -(h + D * samp(Hb, -math.cos(a) * inner_r, math.sin(a) * inner_r)) + 0.002
            top.append(bm.verts.new((r * math.cos(a), r * math.sin(a), zt)))
            bot.append(bm.verts.new((r * math.cos(a), r * math.sin(a), zb)))
        for j in range(N):
            q = (bot[j], bot[(j + 1) % N], top[(j + 1) % N], top[j])
            bm.faces.new(q[::-1] if flip else q)
    wall(F[-1], 0.999, False)
    if hole:
        wall(F[0], hole + 0.001, True)
    bm.normal_update()
    return bm


def job_coins():
    spec = json.load(open(os.path.join(WORK, 'coins.json')))
    for name, c in spec.items():
        sc = reset()
        R = c['R']; W = H = 2 * R + 2
        camera(sc, W, H, R, 0, 0)
        Hf = np.load(os.path.join(WORK, f'h_{name}_f.npy')); Hb = np.load(os.path.join(WORK, f'h_{name}_b.npy'))
        h = c['thick'] / (2 * R) - c['D'] * 0.55
        bm = coin_mesh(Hf, Hb, h, c['D'], c.get('hole', 0) / R if c.get('hole') else 0, c.get('reeds', 0))
        ob = mesh_obj(sc, 'coin', bm, 1)
        # sharp-ish: keep smooth normals (relief is in the geometry)
        nm = normal_mat(); im = ids({1: height_pattern(h, c['D'])})
        for fi, ang in enumerate(c['angles']):
            ob.rotation_euler = Euler((math.pi / 2, 0, math.radians(ang)), 'XYZ')
            render_frame(sc, os.path.join(WORK, name), fi, [ob], im, nm)


# ======================= piggy bank =====================================================
def uvsphere(r, scale, seg=40, rings=22):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    return bm


def cyl(r1, r2, depth, seg=24):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2, depth=depth)
    return bm


def mods(ob, sub=2, bevel=None):
    if bevel:
        b = ob.modifiers.new('bev', 'BEVEL'); b.width = bevel; b.segments = 3
    if sub:
        s = ob.modifiers.new('sub', 'SUBSURF'); s.levels = sub; s.render_levels = sub


def place(ob, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    ob.location = loc; ob.rotation_euler = rot
    if parent:
        ob.parent = parent


def job_piggy():
    sc = reset()
    W, H, S = 56, 50, 16.5
    cam = camera(sc, W, H, S, 32, 20, target=(0, 0, 0.12))
    root = bpy.data.objects.new('root', None); sc.collection.objects.link(root)
    root.location = (0, 0, -0.97)
    parts = []

    def add(name, bm, mid, loc, rot=(0, 0, 0), sub=2, bevel=None):
        ob = mesh_obj(sc, name, bm, mid)
        mods(ob, sub, bevel)
        ob.parent = root
        ob.location = Vector(loc) - Vector((0, 0, -0.97)); ob.rotation_euler = rot
        parts.append(ob)
        return ob
    # egg body, slightly fuller at the rump
    bm = uvsphere(1.0, (1.0, 0.8, 0.8))
    for v in bm.verts:
        v.co.z *= 1.0 + 0.06 * v.co.x
        v.co.y *= 1.0 + 0.05 * v.co.x
    body = add('body', bm, 1, (0, 0, 0))
    add('snout', cyl(0.3, 0.27, 0.34, 24), 2, (-0.93, 0, -0.06), (0, math.pi / 2, 0), 1, 0.06)
    for sy in (-1, 1):  # folded ears: flat cones bent forward
        bm = cyl(0.19, 0.015, 0.36, 12)
        bmesh.ops.scale(bm, vec=(1, 0.42, 1), verts=bm.verts)
        bmesh.ops.translate(bm, vec=(0, 0, 0.18), verts=bm.verts)
        ear = add(f'ear{sy}', bm, 3, (-0.5, 0.36 * sy, 0.6), (0.25 * sy, -0.55, 0.35 * sy), 1)
        sd = ear.modifiers.new('bend', 'SIMPLE_DEFORM'); sd.deform_method = 'BEND'; sd.angle = math.radians(-75)
        sd.deform_axis = 'Y'
        ear.modifiers.move(len(ear.modifiers) - 1, 0)
    for lx in (-0.52, 0.5):
        for ly in (-0.42, 0.42):
            add('leg', cyl(0.17, 0.155, 0.42, 16), 4, (lx, ly, -0.76), (0, 0, 0), 1, 0.05)
    # curly tail
    cu = bpy.data.curves.new('tail', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.045; cu.bevel_resolution = 2
    sp = cu.splines.new('POLY')
    pts = []
    for k in range(22):
        t = k / 21
        a = t * 2.2 * math.pi
        pts.append((1.0 + 0.1 * t + 0.09 * math.sin(a) * t ** 0.3, 0.09 * math.cos(a) * t ** 0.3 - 0.0, 0.18 + 0.12 * t + 0.0))
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (*c, 1)
    tail = bpy.data.objects.new('tail', cu); sc.collection.objects.link(tail)
    tail.parent = root; tail.location = Vector((0, 0, 0.97)); tail['mid'] = 1
    # curves need a mesh for material swap: convert
    dg = bpy.context.evaluated_depsgraph_get()
    tme = bpy.data.meshes.new_from_object(tail.evaluated_get(dg))
    tob = bpy.data.objects.new('tailm', tme); sc.collection.objects.link(tob)
    tob.parent = root; tob.location = tail.location; tob['mid'] = 1
    tme.polygons.foreach_set('use_smooth', [True] * len(tme.polygons))
    bpy.data.objects.remove(tail)
    parts.append(tob)

    def surf(d, r=(1.0, 0.8, 0.8)):
        d = Vector(d)
        k = math.sqrt(sum((d[i] / r[i]) ** 2 for i in range(3)))
        return tuple(d / k)
    A = {
        'slot0': (body, (-0.22, 0, 0.805)), 'slot1': (body, (0.28, 0, 0.815)),
        'eyeL': (body, surf((-0.72, -0.44, 0.36))), 'eyeR': (body, surf((-0.72, 0.44, 0.36))),
        'blushL': (body, surf((-0.8, -0.5, 0.02))), 'blushR': (body, surf((-0.8, 0.5, 0.02))),
        'nosL': (body, (-1.105, -0.09, -0.06)), 'nosR': (body, (-1.105, 0.09, -0.06)),
        'fl1': (body, surf((0.05, -1.0, 0.12))), 'fl2': (body, surf((0.55, -1.0, -0.25))), 'fl3': (body, surf((-0.3, -1.0, -0.38))),
    }
    nm = normal_mat(); im = ids({1: None, 2: None, 3: None, 4: None})
    fwd = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
    upv = cam.matrix_world.to_quaternion() @ Vector((0, 1, 0))
    root.rotation_mode = 'QUATERNION'
    seq = [(0, 0), (-9, 3), (8, 5), (-6, 3), (4, 1), (0, 0)]
    meta = []
    for fi, (roll, hop) in enumerate(seq):
        root.rotation_quaternion = Quaternion(fwd, math.radians(-roll))
        root.location = Vector((0, 0, -0.97)) + upv * (hop / S)
        bpy.context.view_layer.update()
        meta.append(render_frame(sc, os.path.join(WORK, 'piggy'), fi, parts, im, nm, A))
    json.dump(meta, open(os.path.join(WORK, 'piggy', 'anchors.json'), 'w'))


# ======================= tin coin bank ===================================================
def job_tin():
    sc = reset()
    W, H, S = 34, 42, 21
    camera(sc, W, H, S, -20, 22, target=(0, 0, 0))
    parts = []

    def add(name, bm, mid, loc, rot=(0, 0, 0), sub=1, bevel=None):
        ob = mesh_obj(sc, name, bm, mid); mods(ob, sub, bevel); place(ob, loc, rot); parts.append(ob); return ob
    add('can', cyl(0.62, 0.62, 1.2, 40), 2, (0, 0, 0), sub=0)
    for z in (0.6, -0.6, 0.36, -0.36):
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=40, radius1=0.65, radius2=0.65, depth=0.07 if abs(z) < 0.5 else 0.09)
        add('rim', bm, 1, (0, 0, z), sub=0)
    for z in (0.6, -0.6):  # rolled edges
        bm = bmesh.new()
        bmesh.ops.create_circle(bm, cap_ends=True, segments=40, radius=0.63)
        add('lid', bm, 1, (0, 0, z + (0.045 if z > 0 else -0.045)), sub=0)
    A = {'slot0': (parts[0], (-0.2, 0.05, 0.65)), 'slot1': (parts[0], (0.2, 0.05, 0.65)),
         'label': (parts[0], (-0.21, -0.585, 0.0))}
    nm = normal_mat(); im = ids({1: None, 2: None})
    meta = [render_frame(sc, os.path.join(WORK, 'tin'), 0, parts, im, nm, A)]
    json.dump(meta, open(os.path.join(WORK, 'tin', 'anchors.json'), 'w'))


# ======================= kiss-lock coin purse ============================================
def job_purse():
    sc = reset()
    W, H, S = 40, 36, 19
    camera(sc, W, H, S, -18, 9, target=(0, 0, 0.0))
    parts = []
    bm = uvsphere(1.0, (0.9, 0.3, 0.8), 40, 24)
    for v in bm.verts:  # flat-topped pouch, wider at the bottom
        if v.co.z > 0.32:
            v.co.z = 0.32 + (v.co.z - 0.32) * 0.15
        v.co.x *= 1.0 + 0.12 * max(0, -v.co.z)
    ob = mesh_obj(sc, 'pouch', bm, 2); mods(ob, 1); parts.append(ob)
    # metal frame along the mouth (two arched rails) + kiss-lock balls
    for sy in (-1, 1):
        cu = bpy.data.curves.new('rail', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.06; cu.bevel_resolution = 2
        sp = cu.splines.new('POLY'); n = 24
        sp.points.add(n - 1)
        for k, p in enumerate(sp.points):
            a = math.pi * k / (n - 1)
            p.co = (-0.82 * math.cos(a), sy * 0.075, 0.25 + 0.17 * math.sin(a), 1)
        o = bpy.data.objects.new('r', cu); sc.collection.objects.link(o)
        dg = bpy.context.evaluated_depsgraph_get()
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); bpy.data.objects.remove(o)
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        ro = bpy.data.objects.new('rail', me); sc.collection.objects.link(ro); ro['mid'] = 1; parts.append(ro)
    for k, sx in enumerate((-0.07, 0.07)):
        bm = uvsphere(0.1, (1, 1, 1), 16, 10)
        b = mesh_obj(sc, 'ball', bm, 1); place(b, (sx * 1.3, (-0.06 if k == 0 else 0.06), 0.52)); parts.append(b)
        bm = cyl(0.025, 0.025, 0.1, 8)
        s = mesh_obj(sc, 'stem', bm, 1); place(s, (sx * 1.3, (-0.06 if k == 0 else 0.06), 0.44)); parts.append(s)
    nm = normal_mat(); im = ids({1: None, 2: dots_pattern(4.2, 0.17, (0, 2))})
    render_frame(sc, os.path.join(WORK, 'purse'), 0, parts, im, nm)


# ======================= capsule (closed -> opening) ====================================
def job_capsule():
    sc = reset()
    W, H, S = 36, 40, 15
    camera(sc, W, H, S, -15, 18, target=(0, 0, 0.18))
    parts = []

    def shell(top):
        bm = uvsphere(1.0, (1, 1, 1), 40, 24)
        kill = [v for v in bm.verts if (v.co.z < -1e-4 if top else v.co.z > 1e-4)]
        bmesh.ops.delete(bm, geom=kill, context='VERTS')
        ob = mesh_obj(sc, 'top' if top else 'bot', bm, 1 if top else 2)
        so = ob.modifiers.new('sol', 'SOLIDIFY'); so.thickness = 0.06
        mods(ob, 1)
        return ob
    top, bot = shell(True), shell(False)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, segments=40, radius1=1.015, radius2=1.015, depth=0.09)
    seam = mesh_obj(sc, 'seam', bm, 3); place(seam, (0, 0, -0.03), parent=bot); mods(seam, 0)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(0.12, 0.05, 0.08), verts=bm.verts)
    tab = mesh_obj(sc, 'tab', bm, 3); place(tab, (0, -1.0, -0.02), parent=bot); mods(tab, 0)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=(0.9, 0.06, 0.55), verts=bm.verts)
    slip = mesh_obj(sc, 'slip', bm, 4); mods(slip, 0)
    parts = [top, bot, seam, tab, slip]
    nm = normal_mat(); im = ids({1: None, 2: None, 3: None, 4: None})
    seq = [  # top (z lift, tilt deg, x shift, twist deg), slip lift
        (0, 0, 0, 0, None), (0, 0, 0, 25, None), (0.18, -8, 0, 25, None), (0.75, -38, -0.25, 25, 0.25),
        (1.1, -75, -0.75, 25, 0.75), (0.95, -88, -1.05, 25, 1.0)]
    for fi, (lz, tilt, sx, tw, sl) in enumerate(seq):
        top.location = (sx, 0, lz)
        top.rotation_euler = (0, math.radians(tilt), math.radians(tw))
        slip.hide_render = sl is None
        slip.location = (0.05, 0.1, -0.35 + (sl or 0))
        slip.rotation_euler = (0, math.radians(12), 0)
        bpy.context.view_layer.update()
        render_frame(sc, os.path.join(WORK, 'capsule'), fi, [p for p in parts if not p.hide_render], im, nm)
    # a small closed capsule (badges, card printing)
    top.location = (0, 0, 0); top.rotation_euler = (0, 0, 0); slip.hide_render = True
    camera(sc, 18, 18, 7.4, -15, 18, target=(0, 0, 0.05))
    bpy.context.view_layer.update()
    render_frame(sc, os.path.join(WORK, 'capsule_s'), 0, [p for p in parts if not p.hide_render], im, nm)


for j in JOBS:
    globals()['job_' + j]()
print('render3d done', JOBS)
