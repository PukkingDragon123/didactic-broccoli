"""Gen-san's FREE CANDY van kit, modelled in Blender for the imported 1980s kei van (public/models/lowpix/world_arch/
kei_van.glb, its own frame: facing +z, the kerb side +x): the sweets wholesaler's roof sign (an A-frame of two
enamelled boards on a ridge tube and end frames, sitting on a roof rack: rubber feet, two cross bars, chrome rails),
the side panels' sign-painting (a grid shrink-wrapped onto the van's own flanks), and a wooden tray of sweets on two
steel brackets at the sliding door with its ご自由に card (the game fills it with the wrapped-candy and lollipop props).
  python3 -I art/blender/vehicles/van_paint.py && node art/blender/vehicles/decode.mjs kei_van
  tools/blender.sh art/blender/vehicles/van_kit.py
  -> art/blender/vehicles/out/candy_kit.glb (then node art/blender/vehicles/pack.mjs candy_kit)"""
import math, os, sys
import bpy, bmesh  # noqa: F401  (bpy first: it sets up bmesh)
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bpykit import material, obj, prism, prism_x, prism_z, fix, bevel, box, tube, export, finish, tris, reset, apply  # noqa: E402

P, TILE = 256, 128
SCN = reset()
material('board', 'candy_board', 0.45, 0.05)
material('enamel', 'enamel', 0.45, 0.05)
material('trim', 'trim', 0.6, 0.1)
material('chrome', 'chrome', 0.25, 0.6)
material('wood', 'wood', 0.7)
material('steel', 'steel', 0.55, 0.3)
material('candy_side', 'candy_side', 0.5)
material('candy_tag', 'candy_tag', 0.7)

# ------------------------------------------------------------------ the roof rack and the A-frame sign
RX, ZA, ZB = 0.56, -0.70, 0.45
for z in (ZA, ZB):
    for s in (-1, 1):
        box('foot', s * RX - 0.035, 1.68, z - 0.05, s * RX + 0.035, 1.83, z + 0.05, 'trim', 0.01)
    tube('crossbar', [(-RX - 0.04, 1.83, z), (RX + 0.04, 1.83, z)], 0.016, 'trim', 8)
for s in (-1, 1):
    tube('rail', [(s * RX, 1.80, -0.84), (s * RX, 1.858, -0.78), (s * RX, 1.858, 0.53), (s * RX, 1.80, 0.59)], 0.013, 'chrome', 6)

B0, B1, X0, X1, YB, YT = -0.75, 0.75, 0.125, 0.012, 1.87, 2.265
L = math.hypot(X0 - X1, YT - YB)
for s in (-1, 1):
    uy = Vector((-(X0 - X1) * s, YT - YB, 0)).normalized()
    out = Vector((uy.y * s, -uy.x * s, 0))
    bm = bmesh.new()
    prism(bm, [(0, 0), (B1 - B0, 0), (B1 - B0, L), (0, L)], (s * X0, YB, B0), (0, 0, 1), uy, out, -0.016, 0)
    fix(bm)
    o = obj('board', bm, ['board', 'enamel'])
    for f in o.data.polygons:
        if f.normal.dot(out) < 0.9: f.material_index = 1
    bevel(o, 0.003, 1, 40)
for ze in (B0 - 0.02, B1 + 0.02):
    tube('end_frame', [(X0 + 0.01, YB - 0.01, ze), (0, YT + 0.012, ze), (-X0 - 0.01, YB - 0.01, ze)], 0.013, 'trim', 6)
tube('ridge', [(0, YT + 0.012, B0 - 0.02), (0, YT + 0.012, B1 + 0.02)], 0.014, 'trim', 6)
for s in (-1, 1):
    tube('sill', [(s * (X0 + 0.01), YB - 0.01, B0 - 0.02), (s * (X0 + 0.01), YB - 0.01, B1 + 0.02)], 0.012, 'trim', 6)

# ------------------------------------------------------------------ the side panels' sign-painting (a grid, shrink-wrapped below)
SZ0, SZ1, SY0, SY1 = -1.25, 0.15, 0.68, 1.0
for s in (-1, 1):
    bm = bmesh.new()
    nu, nv = 14, 3
    vs = [[bm.verts.new((s * 0.70, SY0 + (SY1 - SY0) * j / nv, SZ0 + (SZ1 - SZ0) * i / nu)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            q = (vs[i][j], vs[i + 1][j], vs[i + 1][j + 1], vs[i][j + 1])
            bm.faces.new(q if s < 0 else q[::-1])
    obj('livery_l' if s > 0 else 'livery_r', bm, ['candy_side'])

# ------------------------------------------------------------------ the tray of sweets at the sliding door, its brackets and card
TZ0, TZ1, TX0, TX1, TY0, TY1 = -0.44, 0.08, 0.705, 0.965, 0.58, 0.645
bm = bmesh.new()
prism_z(bm, [(TX0, TY0), (TX1, TY0), (TX1, TY1), (TX0, TY1)], TZ0, TZ1)
fix(bm)
top = [f for f in bm.faces if f.normal.y > 0.9]
r = bmesh.ops.inset_region(bm, faces=top, thickness=0.012, depth=0)
bmesh.ops.translate(bm, vec=(0, -0.048, 0), verts=list({v for f in top for v in f.verts}))
for z in (-0.27, -0.09):
    prism_x(bm, [(z - 0.005, TY0 + 0.01), (z + 0.005, TY0 + 0.01), (z + 0.005, TY1 - 0.012), (z - 0.005, TY1 - 0.012)], TX0 + 0.012, TX1 - 0.012)
fix(bm)
o = obj('tray', bm, ['wood'])
bevel(o, 0.003, 1, 40)
for z in (TZ0 + 0.05, TZ1 - 0.05):
    bm = bmesh.new()
    prism_z(bm, [(0.688, 0.44), (0.706, 0.44), (0.93, TY0 - 0.004), (0.93, TY0), (0.688, TY0)], z - 0.007, z + 0.007)
    fix(bm)
    obj('bracket', bm, ['steel'])
tilt = math.radians(14)
uy = Vector((-math.sin(tilt), math.cos(tilt), 0))  # leaning back against the van
bm = bmesh.new()
prism(bm, [(0, 0), (0.28, 0), (0.28, 0.075), (0, 0.075)], (TX1 - 0.006, TY1 - 0.012, (TZ0 + TZ1) / 2 + 0.14), (0, 0, -1), uy, Vector((0, 0, -1)).cross(uy), 0, 0.003)
fix(bm)
o = obj('card', bm, ['candy_tag', 'enamel'])
cn = Vector((0, 0, -1)).cross(uy)
for f in o.data.polygons:
    if f.normal.dot(cn) < 0.9: f.material_index = 1


# ------------------------------------------------------------------ uv: the boards, panels and card take their paintings, the rest tiles
def uv_all():
    for o in [o for o in SCN.objects if o.type == 'MESH']:
        me = o.data
        if not me.uv_layers: me.uv_layers.new(name='UV')
        uv = me.uv_layers.active.data
        for poly in me.polygons:
            mn = me.materials[poly.material_index].name
            n = poly.normal
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                if mn == 'board':
                    s = 1 if co.x > 0 else -1
                    t = (YT - co.y) / (YT - YB)
                    uv[li].uv = ((B1 - co.z) / (B1 - B0) if s > 0 else (co.z - B0) / (B1 - B0), 1 - t)
                elif mn == 'candy_side':
                    u = (co.z - SZ0) / (SZ1 - SZ0)
                    uv[li].uv = (1 - u if co.x > 0 else u, (co.y - SY0) / (SY1 - SY0))
                elif mn == 'candy_tag':
                    lo = Vector((TX1 - 0.006, TY1 - 0.012, (TZ0 + TZ1) / 2 + 0.14))
                    d = co - lo
                    uv[li].uv = (min(1, max(0, -d.z / 0.28)), min(1, max(0, d.dot(uy) / 0.075)))
                else:
                    ax = max(range(3), key=lambda i: abs(n[i]))
                    a, b = [(1, 2), (0, 2), (0, 1)][ax]
                    uv[li].uv = (co[a] * P / TILE, co[b] * P / TILE)


uv_all()
ALL = [o for o in SCN.objects if o.type == 'MESH']
finish(ALL)
# the side panels shrink-wrapped onto the van's own flanks (projected along x, 4 mm proud), from the packed model itself
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, 'out', 'kei_van_ref.glb'))
ref = [o for o in SCN.objects if o.type == 'MESH' and o not in ALL]
flank = [o for o in ref if any(m and m.name == 'Body' for m in o.data.materials)]
for o in ALL:
    if not o.name.startswith('livery'): continue
    for t in flank:
        m = o.modifiers.new('wrap', 'SHRINKWRAP')
        m.target, m.wrap_method, m.offset = t, 'PROJECT', 0.004
        m.use_project_x, m.use_negative_direction, m.use_positive_direction, m.project_limit = True, True, True, 0.12
    apply(o)
for o in ref: bpy.data.objects.remove(o)
print('candy_kit tris', tris(ALL))
export(os.path.join(HERE, 'out', 'candy_kit.glb'), ALL)
