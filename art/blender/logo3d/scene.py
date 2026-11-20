"""The one scene template for the gacha cards' 3D title logos (tools/logo3d.py writes the specs, renders, composites).
Every letter is a glyph of our hand-pixelled display face (tools/fonts/gg_display.py) extruded into a chunky solid
block, chamfered on its face edges (the facet-edge rim), painted like the toy line in the series' own themed finish
(paint(): brush-stroke colour bands plus hard-edged painted pattern layers: crab-shell bumps, turtle scutes, rice,
tiles, paper ribs, carapace bands...; chipped wear), with small sculpted themed bits growing off the letters (bit():
claws, legs, flippers, spikes, drips, steam puffs, umbrella ribs, a skewer...), tilted and bounced, the top line
stacked on the bottom line's tops; the series' own toys (their build glbs) sit on, peek behind or push the letters,
all in one Cycles scene with the toy key light and a shadow catcher, so contact shadows are real. Transparent PNG out;
tools/logo3d.py pixel-snaps it for the card.
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


def paint(name, P):
    """A hand-painted finish: brush strokes (stretched noise in the letter's own space, turned per letter) laid as hard
    colour bands of a hue-shifted ramp (P['t']: dark, base, light), then the theme's pattern layers (P['L']), each a
    hard-edged painted mask (wobbled by a brush noise, never a smooth blend) in its own colour (two brush tones when
    'c2'), chipped wear on top. No gradients: every transition is a step."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    N = lambda kind, **kw: node(nt, kind, **kw); lk = nt.links.new
    def math(op, a, b=None, c=None):
        n = N('ShaderNodeMath', operation=op)
        for k, v in enumerate((a, b, c)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[k].default_value = v
            else: lk(v, n.inputs[k])
        return n.outputs[0]
    out = N('ShaderNodeOutputMaterial'); bs = N('ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = P.get('rough', 0.62); bs.inputs['Specular IOR Level'].default_value = 0.18
    tc = N('ShaderNodeTexCoord'); sh = N('ShaderNodeVectorMath', operation='ADD'); sh.inputs[1].default_value = P.get('off', (0, 0, 0))
    lk(tc.outputs['Object'], sh.inputs[0]); co = sh.outputs[0]
    sp = N('ShaderNodeSeparateXYZ'); lk(tc.outputs['Object'], sp.inputs[0]); X, Z = sp.outputs[0], sp.outputs[2]
    so = N('ShaderNodeSeparateXYZ'); lk(co, so.inputs[0]); XO, ZO = so.outputs[0], so.outputs[2]
    st = P['stroke']; mp = N('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, st[0], 0)
    mp.inputs['Scale'].default_value = (st[1], 1.0, st[2]); lk(co, mp.inputs['Vector'])
    nz = N('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 3.2; nz.inputs['Detail'].default_value = 1.5
    nz.inputs['Roughness'].default_value = 0.45; lk(mp.outputs['Vector'], nz.inputs['Vector'])
    cr = N('ShaderNodeValToRGB'); cr.color_ramp.interpolation = 'CONSTANT'; E = cr.color_ramp.elements; T = P['t']
    E[0].position = 0.0; E[0].color = lin(T[0]); E[1].position = 0.37; E[1].color = lin(T[1]); e = E.new(0.6); e.color = lin(T[2])
    lk(nz.outputs['Fac'], cr.inputs['Fac']); col = cr.outputs['Color']
    brush = math('GREATER_THAN', nz.outputs['Fac'], 0.5)
    wz = N('ShaderNodeTexNoise'); wz.inputs['Scale'].default_value = 5.0; wz.inputs['Detail'].default_value = 2.0
    lk(co, wz.inputs['Vector']); wc = math('SUBTRACT', wz.outputs['Fac'], 0.5)  # the hand's wobble, centred
    def wob(v, w): return v if not w else math('MULTIPLY_ADD', wc, w, v)
    def xz(px, pz, asp=1.0):
        cx = N('ShaderNodeCombineXYZ'); lk(X, cx.inputs[0]); lk(math('MULTIPLY', Z, asp), cx.inputs[2])
        d = N('ShaderNodeVectorMath', operation='DISTANCE'); lk(cx.outputs[0], d.inputs[0]); d.inputs[1].default_value = (px, 0, pz * asp)
        return d.outputs['Value']
    for Ly in P.get('L', []):
        k = Ly['k']; w = Ly.get('w', 0.0); sc = Ly.get('sc', 4.0); thr = Ly.get('thr', 0.5)
        if k in ('spots', 'cells'):
            vo = N('ShaderNodeTexVoronoi', feature='F1' if k == 'spots' else 'DISTANCE_TO_EDGE')
            vo.inputs['Scale'].default_value = sc; vo.inputs['Randomness'].default_value = Ly.get('rand', 1.0)
            if Ly.get('sq'):  # squashed cells (scales, grains): scale the space per axis
                vm = N('ShaderNodeVectorMath', operation='MULTIPLY'); vm.inputs[1].default_value = Ly['sq']; lk(co, vm.inputs[0]); lk(vm.outputs[0], vo.inputs['Vector'])
            else: lk(co, vo.inputs['Vector'])
            mk = math('LESS_THAN', wob(vo.outputs['Distance'], w), thr)
        elif k == 'stripes':
            d = N('ShaderNodeVectorMath', operation='DOT_PRODUCT'); lk(co, d.inputs[0]); d.inputs[1].default_value = Ly.get('ax', (0, 0, 1))
            v = math('FRACT', wob(math('MULTIPLY', d.outputs['Value'], sc), w))
            mk = math('LESS_THAN', v, thr)
            if Ly.get('gt') is not None: mk = math('MULTIPLY', mk, math('GREATER_THAN', v, Ly['gt']))
        elif k == 'below':
            v = wob(Z, w); mk = math('LESS_THAN', v, thr)
            if Ly.get('gt') is not None: mk = math('MULTIPLY', mk, math('GREATER_THAN', v, Ly['gt']))
        elif k == 'dab':
            mk = math('LESS_THAN', wob(xz(*Ly['p'], Ly.get('asp', 1.0)), w), Ly.get('r', 0.08))
        elif k == 'ring':
            v = wob(xz(*Ly['p']), w); mk = math('MULTIPLY', math('LESS_THAN', v, Ly['r2']), math('GREATER_THAN', v, Ly['r1']))
        elif k == 'radial':
            px, pz = Ly['p']; ang = math('ARCTAN2', math('SUBTRACT', Z, pz), math('SUBTRACT', X, px))
            mk = math('LESS_THAN', math('FRACT', wob(math('MULTIPLY', ang, Ly.get('n', 10) / (2 * 3.14159265)), w)), thr)
        elif k in ('grid', 'dots'):
            fx = math('FRACT', wob(math('MULTIPLY', XO, sc), w)); fz = math('FRACT', wob(math('MULTIPLY', ZO, sc * Ly.get('asp', 1.0)), w))
            if k == 'grid': mk = math('MAXIMUM', math('LESS_THAN', fx, thr), math('LESS_THAN', fz, thr * Ly.get('asp', 1.0)))
            else:
                c = N('ShaderNodeCombineXYZ'); lk(fx, c.inputs[0]); lk(fz, c.inputs[1])
                d = N('ShaderNodeVectorMath', operation='DISTANCE'); lk(c.outputs[0], d.inputs[0]); d.inputs[1].default_value = (0.5, 0.5, 0)
                mk = math('LESS_THAN', d.outputs['Value'], thr)
        elif k == 'checker':
            par = math('FLOORED_MODULO', math('ADD', math('FLOOR', math('MULTIPLY', XO, sc)), math('FLOOR', math('MULTIPLY', ZO, sc * Ly.get('asp', 1.0)))), 2.0)
            mk = math('GREATER_THAN', par, 0.5)
        elif k == 'blot':
            bn = N('ShaderNodeTexNoise'); bn.inputs['Scale'].default_value = sc; bn.inputs['Detail'].default_value = Ly.get('det', 2.0)
            if Ly.get('sq'):
                vm = N('ShaderNodeVectorMath', operation='MULTIPLY'); vm.inputs[1].default_value = Ly['sq']; lk(co, vm.inputs[0]); lk(vm.outputs[0], bn.inputs['Vector'])
            else: lk(co, bn.inputs['Vector'])
            mk = math('GREATER_THAN', wob(bn.outputs['Fac'], w), thr)
        elif k == 'seam':
            mk = math('LESS_THAN', wob(math('ABSOLUTE', math('SUBTRACT', X, Ly.get('x', 0.0))), w), thr)
        else: continue
        if Ly.get('zlt') is not None: mk = math('MULTIPLY', mk, math('LESS_THAN', wob(Z, 0.12), Ly['zlt']))
        if Ly.get('zgt') is not None: mk = math('MULTIPLY', mk, math('GREATER_THAN', wob(Z, 0.12), Ly['zgt']))
        c = Ly['c']
        if Ly.get('c2'):  # the layer painted in two brush tones
            m2 = N('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.inputs['A'].default_value = lin(c); m2.inputs['B'].default_value = lin(Ly['c2'])
            lk(brush, m2.inputs['Factor']); csock = m2.outputs['Result']
        else: csock = None
        mx = N('ShaderNodeMix'); mx.data_type = 'RGBA'; lk(col, mx.inputs['A'])
        if csock is not None: lk(csock, mx.inputs['B'])
        else: mx.inputs['B'].default_value = lin(c)
        lk(math('MULTIPLY', mk, Ly.get('a', 1.0)), mx.inputs['Factor']); col = mx.outputs['Result']
    if P.get('chip'):
        ch, at = P['chip']
        cz = N('ShaderNodeTexNoise'); cz.inputs['Scale'].default_value = 16.0; cz.inputs['Detail'].default_value = 3.0; lk(co, cz.inputs['Vector'])
        mx = N('ShaderNodeMix'); mx.data_type = 'RGBA'; lk(col, mx.inputs['A']); mx.inputs['B'].default_value = lin(ch)
        lk(math('GREATER_THAN', cz.outputs['Fac'], at), mx.inputs['Factor']); col = mx.outputs['Result']
    lk(col, bs.inputs['Base Color']); lk(bs.outputs['BSDF'], out.inputs['Surface'])
    return m


# ------------------------------------------------------------------ sculpted themed bits (faceted, painted like the letters)
def _tube(bm, pts, radii, sides=6, flat=(1.0, 1.0)):
    """A faceted tube along pts (tapering through radii; a 0 radius ends in a point), capped."""
    pts = [Vector(q) for q in pts]; n = len(pts); rings = []
    for i, q in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        ref = Vector((0, 1, 0)) if abs(t.y) < 0.9 else Vector((1, 0, 0))
        a = t.cross(ref).normalized(); b = t.cross(a).normalized(); r = radii[i]
        if r <= 1e-5: rings.append([bm.verts.new(q)]); continue
        rings.append([bm.verts.new(q + (a * math.cos(2 * math.pi * k / sides) * flat[0] + b * math.sin(2 * math.pi * k / sides) * flat[1]) * r) for k in range(sides)])
    for r0, r1 in zip(rings, rings[1:]):
        if len(r0) == 1 and len(r1) == 1: continue
        if len(r0) == 1: [bm.faces.new((r0[0], r1[(k + 1) % sides], r1[k])) for k in range(sides)]
        elif len(r1) == 1: [bm.faces.new((r0[k], r0[(k + 1) % sides], r1[0])) for k in range(sides)]
        else: [bm.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k])) for k in range(sides)]
    for r in (rings[0], rings[-1]):
        if len(r) > 2: bm.faces.new(r)


def _blob(bm, c, r):
    """A faceted lump (a once-subdivided icosphere, flat shaded)."""
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0, matrix=Matrix.LocRotScale(Vector(c), None, Vector(r)))


def _prism(bm, poly, y0, y1):
    """A flat shape in the letter plane (x, z points), cut from a slab y0..y1 deep."""
    f = bm.faces.new([bm.verts.new((x, y0, z)) for x, z in poly])
    ex = bmesh.ops.extrude_face_region(bm, geom=[f])
    for g in ex['geom']:
        if isinstance(g, bmesh.types.BMVert): g.co.y = y1


def bit(B, i, j, parent, mats):
    """One sculpted bit B (letter-local, cap height 1: x right, z up, the face at y = 0 toward the camera, the back at
    y = depth) on letter i (parented, so it tilts and rests with it). Parts: (bmesh builder, material key)."""
    k = B['k']; x, z = B.get('x', 0.0), B.get('z', 0.0); s = B.get('s', 1.0); g = B.get('sg', 1); D = 0.2
    V = lambda *a: Vector(a)
    parts = []
    def part(fn, key='m'): parts.append((fn, key))
    if k == 'claw':  # crab claw: a jointed arm out of the letter's side, a palm, two curved fingers
        a = math.radians(B.get('a', 30)); d = V(math.cos(a), 0, math.sin(a)); up = V(-math.sin(a), 0, math.cos(a)) * g
        p0 = V(x, D, z) - d * 0.06; p1 = p0 + d * 0.26 * s; d2 = (d * 0.45 + up * 0.75).normalized(); p2 = p1 + d2 * 0.2 * s
        part(lambda bm: _tube(bm, [p0, p1, p2], [0.075 * s, 0.085 * s, 0.1 * s], 6))
        c = p2 + d2 * 0.13 * s; part(lambda bm: _blob(bm, c, (0.17 * s, 0.12 * s, 0.15 * s)))
        for sgn, ln in ((1, 0.34), (-1, 0.28)):
            fa = math.atan2(d2.z, d2.x) + sgn * math.radians(24); f = V(math.cos(fa), 0, math.sin(fa))
            q0 = c + f * 0.08 * s; cu = V(-f.z, 0, f.x) * -sgn
            part(lambda bm, q0=q0, f=f, cu=cu, ln=ln: _tube(bm, [q0, q0 + f * ln * 0.55 * s, q0 + f * ln * s + cu * 0.07 * s], [0.08 * s, 0.055 * s, 0.0], 6))
    elif k == 'legs':  # crab / beetle legs: jointed, pointed, splayed out of the letter's foot
        th = B.get('th', 0.045)
        for n in range(B.get('n', 3)):
            y0 = 0.06 + 0.1 * n; sp = 0.6 + 0.4 * n  # out of the foot toward the camera, splayed, the knee up
            q0 = V(x, y0, z + 0.1); q1 = V(x + g * 0.14 * s * sp, y0 - 0.24 * s, z + 0.2 * s); q2 = V(x + g * 0.24 * s * sp, y0 - 0.44 * s, z - 0.04)
            part(lambda bm, q=(q0, q1, q2): _tube(bm, q, [th * s, th * 0.9 * s, 0.0], 5))
    elif k == 'flipper':  # turtle flipper: a flattened, tapering paddle out of the letter's foot
        q = [V(x, 0.16, z + 0.12), V(x + g * 0.13 * s, -0.12 * s, z + 0.06), V(x + g * 0.24 * s, -0.3 * s, z + 0.025)]
        part(lambda bm: _tube(bm, q, [0.11 * s, 0.13 * s, 0.05 * s], 6, flat=(0.38, 1.0)))
    elif k == 'tail':
        q = [V(x, D, z + 0.12), V(x + g * 0.12 * s, D, z + 0.08), V(x + g * 0.2 * s, D + 0.02, z + 0.03)]
        part(lambda bm: _tube(bm, q, [0.06 * s, 0.04 * s, 0.0], 5))
    elif k == 'head':  # a turtle's head and neck out of the letter's side (no face: the toys carry the faces)
        q = [V(x, D, z), V(x + g * 0.16 * s, D - 0.05, z + 0.08 * s), V(x + g * 0.26 * s, D - 0.1, z + 0.12 * s)]
        part(lambda bm: _tube(bm, q, [0.085 * s, 0.08 * s, 0.075 * s], 6))
        part(lambda bm: _blob(bm, q[2] + V(g * 0.08 * s, -0.02, 0.02 * s), (0.12 * s, 0.1 * s, 0.09 * s)))
    elif k == 'spike':  # a dorsal plate on the letter's top
        lean = B.get('lean', 0.0) * s
        part(lambda bm: _prism(bm, [(x - 0.13 * s, z - 0.06), (x + 0.13 * s, z - 0.06), (x + lean + 0.02 * s, z + 0.3 * s)], D - 0.05, D + 0.05))
    elif k == 'drip':  # a run of sauce / slime / paint down the letter's face, a bulb at its end, a pool on the top
        L = B.get('len', 0.3)
        part(lambda bm: _blob(bm, (x, 0.02, z - 0.005), (0.1 * s, 0.07, 0.04)))
        part(lambda bm: _tube(bm, [V(x, -0.012, z - 0.02), V(x, -0.016, z - L * 0.55), V(x, -0.02, z - L)], [0.05 * s, 0.038 * s, 0.036 * s], 6, flat=(1.0, 0.55)))
        part(lambda bm: _blob(bm, (x, -0.022, z - L - 0.01), (0.052 * s, 0.035, 0.058 * s)))
    elif k == 'puff':  # steam / cloud: a cluster of faceted lumps above (or sitting on) the letter
        h = z + B.get('gap', 0.12)
        for dx, dz, r in ((0, 0.1, 0.13), (-0.13, 0.04, 0.1), (0.13, 0.05, 0.11), (0.05, 0.22, 0.09)):
            part(lambda bm, c=(x + dx * s, D - 0.02, h + dz * s), r=r: _blob(bm, c, (r * s, r * 0.85 * s, r * 0.9 * s)))
    elif k == 'rib':  # umbrella ribs: bamboo spokes fanning out of the letter's top, knobbed tips
        for an in B.get('fan', (40, 90, 140)):
            a = math.radians(an); e = V(x + math.cos(a) * 0.36 * s, D - 0.06, z + math.sin(a) * 0.36 * s)
            part(lambda bm, e=e: _tube(bm, [V(x, D, z - 0.06), e], [0.026 * s, 0.02 * s], 5))
            part(lambda bm, e=e: _blob(bm, e, (0.035 * s,) * 3))
    elif k == 'knob':  # an appliance dial on the letter's face, a pointer ridge on it
        part(lambda bm: _tube(bm, [V(x, 0.01, z), V(x, -0.08 * s, z)], [0.12 * s, 0.11 * s], 10))
        part(lambda bm: _prism(bm, [(x - 0.02 * s, z), (x + 0.02 * s, z), (x + 0.02 * s, z + 0.1 * s), (x - 0.02 * s, z + 0.1 * s)], -0.08 * s, -0.11 * s), 'm2')
    elif k == 'key':  # a wind-up key out of the letter's side: shaft and butterfly bow
        e = V(x + g * 0.2 * s, D, z)
        part(lambda bm: _tube(bm, [V(x - g * 0.03, D, z), e], [0.035 * s, 0.035 * s], 6))
        for sz in (1, -1): part(lambda bm, sz=sz: _blob(bm, e + V(g * 0.06 * s, 0, sz * 0.09 * s), (0.06 * s, 0.035 * s, 0.1 * s)))
    elif k == 'cactus':  # a saguaro on the letter's top
        part(lambda bm: _tube(bm, [V(x, D, z - 0.05), V(x, D, z + 0.36 * s)], [0.085 * s, 0.08 * s], 8))
        part(lambda bm: _blob(bm, (x, D, z + 0.36 * s), (0.08 * s, 0.08 * s, 0.05 * s)))
        for sx, h0, h1 in ((1, 0.12, 0.27), (-1, 0.2, 0.3)):
            q = [V(x, D, z + h0 * s), V(x + sx * 0.14 * s, D, z + h0 * s), V(x + sx * 0.14 * s, D, z + h1 * s)]
            part(lambda bm, q=q: _tube(bm, q, [0.05 * s, 0.05 * s, 0.045 * s], 6))
    elif k in ('barnacle', 'stud', 'rivet', 'grain', 'bubble'):  # small things on the face (or floating, for bubbles)
        for (px, pz) in B['pts']:
            if k == 'barnacle': part(lambda bm, px=px, pz=pz: _tube(bm, [V(px, 0.01, pz), V(px, -0.06 * s, pz)], [0.065 * s, 0.03 * s], 6))
            elif k == 'stud': part(lambda bm, px=px, pz=pz: _tube(bm, [V(px, 0.01, pz), V(px, -0.07 * s, pz)], [0.06 * s, 0.0], 4))
            elif k == 'rivet': part(lambda bm, px=px, pz=pz: _blob(bm, (px, 0.0, pz), (0.04 * s, 0.03 * s, 0.04 * s)))
            elif k == 'grain': part(lambda bm, px=px, pz=pz: _blob(bm, (px, -0.01, pz), (0.05 * s, 0.025 * s, 0.028 * s)))
            else: part(lambda bm, px=px, pz=pz: _blob(bm, (px, -0.15, pz), (0.05 * s,) * 3))
    elif k == 'knot':  # a balloon's tied neck out of the letter's lower corner
        a = math.radians(B.get('a', -120)); d = V(math.cos(a), 0, math.sin(a))
        q = [V(x, D, z) - d * 0.03, V(x, D, z) + d * 0.07 * s, V(x, D, z) + d * 0.12 * s]
        part(lambda bm: _tube(bm, q, [0.035 * s, 0.03 * s, 0.065 * s], 6))
    elif k == 'shide':  # a folded shrine paper zigzag hanging in front of the letter's face
        w = 0.07 * s; P_ = []
        for n in range(4): P_ += [(x + (0.06 if n % 2 else -0.04) * s, z - n * 0.1 * s)]
        L_ = [(px - w / 2, pz) for px, pz in P_]; R_ = [(px + w / 2, pz - 0.03 * s) for px, pz in P_]
        part(lambda bm: _prism(bm, L_ + R_[::-1], -0.03, -0.015))
    elif k == 'lure':  # an anglerfish's lure: a curved stalk out of the letter's top, a bulb at the end
        q = [V(x, D, z - 0.04), V(x + 0.04 * s, 0.12, z + 0.26 * s), V(x + 0.2 * s, -0.04, z + 0.4 * s), V(x + 0.32 * s, -0.12, z + 0.32 * s)]
        part(lambda bm: _tube(bm, q, [0.03 * s, 0.026 * s, 0.022 * s, 0.02 * s], 5))
        part(lambda bm: _blob(bm, q[-1] + V(0.03 * s, 0, -0.05 * s), (0.075 * s,) * 3), 'm2')
    elif k == 'toes':  # a frog's splayed toes gripping the letter's foot, round pads
        for dx in (-0.12, 0.0, 0.12):
            e = V(x + dx * 1.5 * s, -0.14 * s, z + 0.02)
            part(lambda bm, e=e, dx=dx: _tube(bm, [V(x + dx * s, 0.06, z + 0.1), e], [0.04 * s, 0.032 * s], 5))
            part(lambda bm, e=e: _blob(bm, e, (0.05 * s, 0.045 * s, 0.035 * s)))
    elif k == 'staple':  # a staple driven into the letter's top
        q = [V(x - 0.12 * s, D, z - 0.1), V(x - 0.12 * s, D, z + 0.12 * s), V(x + 0.12 * s, D, z + 0.12 * s), V(x + 0.12 * s, D, z - 0.1)]
        part(lambda bm: _tube(bm, q, [0.028 * s] * 4, 4))
    elif k == 'drop':  # raindrops hanging in front of the letter
        for (px, pz) in B['pts']:
            part(lambda bm, px=px, pz=pz: _tube(bm, [V(px, -0.14, pz + 0.13 * s), V(px, -0.14, pz + 0.03 * s), V(px, -0.14, pz - 0.035 * s)], [0.0, 0.05 * s, 0.045 * s], 6))
            part(lambda bm, px=px, pz=pz: _blob(bm, (px, -0.14, pz - 0.035 * s), (0.05 * s, 0.05 * s, 0.045 * s)))
    elif k == 'antenna':  # a beetle's elbowed antennae out of the letter's top
        for sx in (-1, 1):
            q = [V(x + sx * 0.05 * s, D, z - 0.04), V(x + sx * 0.08 * s, D - 0.04, z + 0.2 * s), V(x + sx * 0.24 * s, D - 0.1, z + 0.3 * s)]
            part(lambda bm, q=q: _tube(bm, q, [0.026 * s, 0.022 * s, 0.02 * s], 5))
            part(lambda bm, q=q: _blob(bm, q[-1], (0.035 * s, 0.03 * s, 0.03 * s)))
    elif k == 'horn':  # a rhinoceros-beetle horn out of the letter's top
        q = [V(x, D - 0.05, z - 0.04), V(x + 0.03 * s, D - 0.1, z + 0.22 * s), V(x + 0.15 * s, D - 0.14, z + 0.36 * s)]
        part(lambda bm: _tube(bm, q, [0.07 * s, 0.05 * s, 0.0], 6))
    for n, (fn, key) in enumerate(parts):
        bm = bmesh.new(); fn(bm); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new('b%d_%d' % (i, n)); bm.to_mesh(me); bm.free()
        for f in me.polygons: f.use_smooth = False
        ob = bpy.data.objects.new(me.name, me); bpy.context.scene.collection.objects.link(ob)
        me.materials.append(mats[key]); ob.parent = parent


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
        L['mats'] = [paint('f%d' % i, L['front']), paint('r%d' % i, L['rim']), paint('s%d' % i, L['side'])]
        ob = letter(L, i); obs[i] = ob
        for n, B in enumerate(L.get('bits', [])):  # the theme's sculpted bits, parented so they tilt and rest with it
            pt = B.get('paint', 'front')
            mats = {'m': {'front': L['mats'][0], 'side': L['mats'][2]}[pt] if isinstance(pt, str) else paint('b%d_%d' % (i, n), pt)}
            if B.get('paint2'): mats['m2'] = paint('b%d_%d2' % (i, n), B['paint2'])
            else: mats['m2'] = mats['m']
            bit(B, i, n, ob, mats)
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
    for n, K in enumerate(S.get('skewers', [])):  # a bamboo skewer run through a whole line of letters
        idx = [i for i, L in enumerate(S['letters']) if L['line'] == K['line'] and not L.get('punct')]
        bb = [bbox(obs[i]) for i in idx]
        x0 = min(b[0].x for b in bb) - 0.3; x1 = max(b[1].x for b in bb) + 0.45
        zc = sum((b[0].z + b[1].z) / 2 for b in bb) / len(bb) + K.get('dz', 0.0); yc = sum((b[0].y + b[1].y) / 2 for b in bb) / len(bb)
        r = K.get('r', 0.035); bm = bmesh.new()
        _tube(bm, [Vector((x0, yc, zc)), Vector((x1 - 0.12, yc, zc)), Vector((x1, yc, zc))], [r, r, 0.0], 7)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); me = bpy.data.meshes.new('skewer%d' % n); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(me.name, me); sc.collection.objects.link(ob); me.materials.append(paint('sk%d' % n, K['paint']))
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
