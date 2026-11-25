"""Our own round-6 furniture (hand-painted textures in r6_tex/, painted by r6_paint.py): the real models that replace the
old code-block furniture of the lane, the shops and the flats (tools/block-audit.mjs). Bevelled boards, panels, legs and
fittings modelled to size and converted by lowpix like every other world model (art/lowpix/world/world.json, src =
art/lowpix/world/made/<name>.glb). Front = Blender -y = glTF / game +z. Sizes in metres (w x h x d).
    tools/blender.sh art/lowpix/world/made/r6_props.py -- <out.glb> <name>
counter_ramen   4.1 x 1.12 x 0.66  a ramen-ya counter: tongue-and-groove front boards, a thick scrubbed top, the raised
                serving ledge on the kitchen side, a steel footrail on brackets, a recessed kick plinth
kitchen_bench   1.95 x 0.86 x 0.6  a stainless worktable: rolled front edge, a back upstand, square legs on feet, an
                undershelf and a cross rail
steel_table     0.5 x 0.82 x 0.42  the same, small (a side table for the dirty bowls)
range_hood      3.4 x 0.4 x 0.7    a stainless exhaust hood: sloped front, a grease gutter lip, four filter panels, end caps
stock_stove     1.1 x 0.7 x 0.62   a low cast-iron stock-pot range: angle-iron legs, two ring burners with pan supports,
                the gas manifold and its valves
griddle_cab     0.7 x 0.78 x 0.55  a gyoza griddle on a black cabinet: two doors with handles, a steel plate with a rim
                and a grease trough, knobs
shelf_wall      1.2 x 0.14 x 0.24  a pine wall shelf on two iron bracket arms
shelf_long      2.2 x 0.14 x 0.26  the same, longer, three brackets
caddy           0.22 x 0.14 x 0.14 a condiment caddy: a wooden tray with a carry bar and a lidded chopstick box
signboard       2.3 x 0.5 x 0.09   a shop signboard: a moulded cedar frame round a recessed face (the print goes on it),
                back battens, two iron hanging brackets
nobori_pole     0.42 x 2.4 x 0.3   a nobori flag pole: steel pole, top crossbar with an end cap, a water-filled base
menu_easel      0.6 x 1.08 x 0.46  an A-frame menu easel: two front legs with a ledge and a top rail, a hinged back leg
ticket_machine  0.62 x 1.6 x 0.47  a meal-ticket machine (食券機): a cream steel cabinet on a black plinth, a bezel round the
                menu panel (the game's canvas panel sits in it, 0.54 x 0.67 at 0.865..1.535 m), the coin and note slots,
                the ticket chute and the change cup, a hood over the panel
Round 2: kitchen_unit (1.9 x 0.9 x 0.62: cream cupboards, a stainless top with the sink and its tap), wall_cupboard
(1.9 x 0.55 x 0.34), range_fan (0.62 x 0.3 x 0.4, a Showa extractor hood), console_table (1.0 x 0.78 x 0.32),
collection_cabinet (4.4 x 2.3 x 0.42: plinth, crown, posts, five shelves with tops at y - 0.005 for y in 0.16 / 0.56 /
0.96 / 1.36 / 1.74, a navy back, the lamp rail), glass_showcase (0.45 x 1.84 x 1.3: a wood base, corner posts, glass
shelves at 0.62 / 1.0 / 1.38, a top), mk_shelf (1.36 x 2.1 x 0.47: Mikawa-ya's shelving bay, shelves with tops at 0.06
/ 0.46 / 0.84 / 1.22 / 1.6 / 2.0 and their red price rails), mk_island (1.34 x 0.85 x 0.64: the stepped dagashi table,
tops at 0.63 and 0.85, its striped cloth skirt), hang_bar (1.5 x 0.4: a ceiling bar on two drop rods), standing_mirror
(0.44 x 1.36 x 0.16: the frame, foot and a tie), notice_board (1.16 x 1.95 x 0.3: posts, a cork board frame, a tin roof),
hang_sign (0.42 x 0.4 x 0.03: a wooden plaque on its cord), standpipe_tap (0.12 x 0.82 x 0.2), display_case
(1.0 x 0.84 x 0.5: a dark wood case with a velvet top, its brass plate and the glass box's metal edges), shelf_open
(1.0 x 1.565 x 0.36: shelves with tops at 0.0625 / 0.4625 / 0.8625 / 1.2625, a dark back).
Round 3 (the lane and the park): milk_box (0.22 x 0.29 x 0.17), window_box (0.9 x 0.16 x 0.2), sat_dish (0.5 x 0.75 x
0.55), styro_box (0.62 x 0.33 x 0.42), pinch_hanger (0.44 x 0.6 x 0.3), donation_box (0.22 x 0.24 x 0.17), mailbox (0.3 x
0.36 x 0.13), mailbox_bank (0.9 x 1.45 x 0.34: six slots on a post), plant_bench (1.5 x 0.66 x 0.3), sign_posts (1.3 x 1.8
x 0.1: two steel posts and a frame for a printed board, face 1.2 x 0.66 centred at 1.3 m), umbrella_closed (0.1 x 0.86 x
0.1), barricade (1.3 x 0.95 x 0.5), drawing_board (0.58 x 0.3 x 0.82), hose_reel (0.42 x 0.42 x 0.2)."""
import bpy, bmesh, sys, os, math, random
from mathutils import Vector, Matrix
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
from common import setup, mat, finish
out, what = sys.argv[-2], sys.argv[-1]
TD = os.path.join(H, 'r6_tex')
random.seed(66); setup()
MS, parts = {}, []


def M(n):
    if n not in MS: MS[n] = mat(TD, n, 0.35 if n in ('stainless', 'galv') else 0.7, 0.6 if n in ('stainless', 'steel_worn', 'galv') else 0.0)
    return MS[n]


def obj(bm, m):
    me = bpy.data.meshes.new('p'); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new('p', me); bpy.context.collection.objects.link(o)
    o.data.materials.append(M(m)); parts.append(o); return o


def uv_planar(bm, scale=1.0):
    """Planar UVs in metres per face (texel density stays even whatever the part's size)."""
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = (0, 2) if abs(n.y) >= max(abs(n.x), abs(n.z)) else (1, 2) if abs(n.x) >= abs(n.z) else (0, 1)
        for l in f.loops: l[uv].uv = (l.vert.co[ax[0]] * scale, l.vert.co[ax[1]] * scale)


def xform(bm, loc=(0, 0, 0), rot=(0, 0, 0)):
    R = Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    bmesh.ops.transform(bm, matrix=Matrix.Translation(loc) @ R, verts=bm.verts)


def box(sx, sy, sz, loc, m, bev=0.004, rot=(0, 0, 0), seg=1):
    """A bevelled box (sx along x, sy deep along y, sz high), centred on loc."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bev: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bev, sx / 3, sy / 3, sz / 3), segments=seg, profile=0.5, affect='EDGES')
    xform(bm, loc, rot); uv_planar(bm)
    return obj(bm, m)


def cyl(r, h, loc, m, n=12, rot=(0, 0, 0), r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=h)
    xform(bm, loc, rot)
    uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        for l in f.loops:
            c = l.vert.co - Vector(loc)
            l[uv].uv = (math.atan2(c.y, c.x) * r, c.z) if abs(f.normal.z) < 0.5 else (c.x, c.y)
    return obj(bm, m)


def lathe(prof, n, loc, m):
    """A surface of revolution round z from a (r, z) profile."""
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / n), r * math.sin(2 * math.pi * k / n), z)) for k in range(n)] for r, z in prof]
    for a, b in zip(rings, rings[1:]):
        for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if prof[0][0] > 0: bm.faces.new(list(reversed(rings[0])))
    if prof[-1][0] > 0: bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    xform(bm, loc); uv_planar(bm)
    return obj(bm, m)


def prism(prof, length, loc, m, axis='x'):
    """A closed (y, z) profile extruded along x (length), centred on loc."""
    bm = bmesh.new()
    a = [bm.verts.new((-length / 2, y, z)) for y, z in prof]
    b = [bm.verts.new((length / 2, y, z)) for y, z in prof]
    n = len(prof)
    bm.faces.new(a[::-1]); bm.faces.new(b)
    for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    xform(bm, loc); uv_planar(bm)
    return obj(bm, m)


def bar(p, q, r, m, n=8):
    """A round bar from p to q."""
    p, q = Vector(p), Vector(q); d = q - p
    o = cyl(r, d.length, (0, 0, 0), m, n)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (p + q) / 2
    return o


# ------------------------------------------------------------------------------------------------ the pieces
def counter_ramen():
    W = 4.1
    # body carcass (hidden behind the boards), the kick plinth recessed
    box(4.0, 0.46, 0.84, (0, 0.05, 0.08 + 0.42), 'oak', 0.004)
    box(3.96, 0.42, 0.08, (0, 0.08, 0.04), 'black', 0.003)
    # tongue-and-groove front boards, a little uneven
    n = 32
    for i in range(n):
        x = -2.0 + (i + 0.5) * 4.0 / n
        box(4.0 / n - 0.006, 0.022, 0.8 + random.uniform(-0.004, 0.004), (x, -0.19, 0.08 + 0.4), 'oak', 0.005, rot=(0, 0, random.uniform(-0.01, 0.01)))
    # apron rail under the top, a base rail over the plinth
    box(4.02, 0.03, 0.07, (0, -0.205, 0.905), 'cedar_dark', 0.006)
    box(4.02, 0.03, 0.05, (0, -0.205, 0.105), 'cedar_dark', 0.006)
    # end panels
    for sx in (-1, 1): box(0.04, 0.5, 0.88, (sx * 2.0, 0.05, 0.08 + 0.43), 'cedar_dark', 0.008)
    # the thick top (scrubbed light wood), its front edge eased
    box(W, 0.62, 0.05, (0, -0.02, 0.975), 'oak_top', 0.012, seg=2)
    # the raised serving ledge on the kitchen side, on two little posts at each end
    box(4.0, 0.14, 0.035, (0, 0.26, 1.105), 'oak_top', 0.008, seg=2)
    box(4.0, 0.03, 0.09, (0, 0.205, 1.045), 'oak', 0.006)
    for x in (-1.96, -0.65, 0.65, 1.96): box(0.04, 0.12, 0.09, (x, 0.26, 1.045), 'oak', 0.006)
    # the footrail: a steel tube on four brackets
    bar((-1.95, -0.24, 0.13), (1.95, -0.24, 0.13), 0.02, 'steel_worn', 10)
    for x in (-1.8, -0.6, 0.6, 1.8):
        box(0.03, 0.05, 0.03, (x, -0.22, 0.13), 'iron', 0.004)
        box(0.06, 0.008, 0.06, (x, -0.202, 0.13), 'iron', 0.002)


def bench(w, h, d, shelf=True):
    """A stainless worktable w x h x d."""
    t = 0.035
    box(w, d - 0.02, t, (0, 0.0, h - t / 2), 'stainless', 0.006)
    bar((-w / 2, -d / 2 + 0.01, h - 0.018), (w / 2, -d / 2 + 0.01, h - 0.018), 0.018, 'stainless', 8)  # rolled front edge
    box(w, 0.02, 0.1, (0, d / 2 - 0.01, h + 0.05), 'stainless', 0.004)  # back upstand
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (w / 2 - 0.04), sy * (d / 2 - 0.05)
            box(0.035, 0.035, h - t - 0.03, (x, y, 0.03 + (h - t - 0.03) / 2), 'steel_worn', 0.004)
            cyl(0.022, 0.03, (x, y, 0.015), 'rubber', 8)
    box(w - 0.06, d - 0.08, 0.03, (0, 0, h - t - 0.03), 'steel_worn', 0.003)  # apron frame under the top
    if shelf: box(w - 0.08, d - 0.1, 0.02, (0, 0, 0.17), 'stainless', 0.004)
    for sx in (-1, 1): box(0.025, d - 0.1, 0.025, (sx * (w / 2 - 0.04), 0, 0.17), 'steel_worn', 0.003)


def kitchen_bench(): bench(1.95, 0.86, 0.6)


def steel_table(): bench(0.5, 0.82, 0.42)


def range_hood():
    L = 3.4
    prism([(0.35, 0.4), (-0.2, 0.4), (-0.35, 0.16), (-0.35, 0.02), (0.35, 0.02)], L, (0, 0, 0), 'stainless')
    for sx in (-1, 1): prism([(0.352, 0.402), (-0.202, 0.402), (-0.352, 0.16), (-0.352, 0.018), (0.352, 0.018)], 0.012, (sx * (L / 2 + 0.006), 0, 0), 'steel_worn')
    box(L, 0.05, 0.03, (0, -0.33, 0.015), 'steel_worn', 0.004)  # grease gutter lip
    for i in range(4):
        box(0.74, 0.5, 0.012, (-1.2 + i * 0.8, 0.02, 0.03), 'filter', 0.002)
    for x in (-1.2, 1.2): box(0.16, 0.06, 0.04, (x, -0.33, 0.0), 'black', 0.004)  # little lamp housings
    for i in range(1, 4): box(0.012, 0.012, 0.36, (-L / 2 + i * L / 4, -0.28, 0.25), 'steel_worn', 0.003, rot=(0.6, 0, 0))  # seams


def stock_stove():
    w, h, d = 1.1, 0.7, 0.62
    for sx in (-1, 1):
        for sy in (-1, 1): box(0.04, 0.04, h - 0.05, (sx * (w / 2 - 0.03), sy * (d / 2 - 0.03), (h - 0.05) / 2), 'iron', 0.004)
    for sy in (-1, 1): box(w, 0.04, 0.05, (0, sy * (d / 2 - 0.03), h - 0.05), 'iron', 0.004)
    for sx in (-1, 1): box(0.04, d, 0.05, (sx * (w / 2 - 0.03), 0, h - 0.05), 'iron', 0.004)
    box(w - 0.08, d - 0.08, 0.02, (0, 0, 0.12), 'steel_worn', 0.003)  # drip tray low down
    for x in (-0.27, 0.27):
        lathe([(0.0, 0.5), (0.09, 0.5), (0.1, 0.53), (0.06, 0.55), (0.0, 0.55)], 16, (x, 0.0, 0), 'iron')  # ring burner
        cyl(0.03, 0.5, (x, 0, 0.25), 'iron', 8)
        lathe([(0.05, h - 0.012), (0.17, h - 0.012), (0.17, h + 0.015), (0.05, h + 0.015)], 16, (x, 0.0, 0), 'iron')  # the cast-iron grate ring the pots stand on
        for k in range(4):  # pan support fins
            a = k * math.pi / 2 + 0.4
            box(0.16, 0.02, 0.07, (x + math.cos(a) * 0.15, math.sin(a) * 0.15, h - 0.02), 'iron', 0.003, rot=(0, 0, a))
        bar((x, -d / 2 + 0.06, 0.52), (x, 0, 0.52), 0.012, 'galv', 6)
    bar((-w / 2 + 0.05, -d / 2 + 0.06, 0.52), (w / 2 - 0.05, -d / 2 + 0.06, 0.52), 0.016, 'galv', 8)  # manifold
    for x in (-0.27, 0.27):
        cyl(0.018, 0.04, (x, -d / 2 + 0.03, 0.52), 'black', 8, rot=(math.pi / 2, 0, 0))
        box(0.06, 0.012, 0.014, (x, -d / 2 + 0.005, 0.52), 'enamel_red', 0.003)


def griddle_cab():
    w, h, d = 0.7, 0.75, 0.55
    box(w, d, h - 0.06, (0, 0, 0.06 + (h - 0.06) / 2), 'black', 0.006)
    box(w - 0.04, d - 0.04, 0.06, (0, 0.01, 0.03), 'rubber', 0.004)
    for sx in (-1, 1):
        box(w / 2 - 0.03, 0.015, h - 0.2, (sx * (w / 4), -d / 2 - 0.004, 0.1 + (h - 0.2) / 2 + 0.02), 'black', 0.008)
        box(w / 2 - 0.09, 0.008, h - 0.3, (sx * (w / 4), -d / 2 - 0.012, 0.1 + (h - 0.2) / 2 + 0.02), 'iron', 0.004)
        bar((sx * 0.04, -d / 2 - 0.03, 0.42), (sx * 0.04, -d / 2 - 0.03, 0.56), 0.008, 'stainless', 6)
    box(w - 0.04, d - 0.05, 0.02, (0, 0.0, h + 0.01), 'steel_worn', 0.003)  # the plate
    for sx in (-1, 1): box(0.02, d - 0.05, 0.03, (sx * (w / 2 - 0.03), 0, h + 0.03), 'stainless', 0.003)
    box(w - 0.04, 0.02, 0.05, (0, d / 2 - 0.035, h + 0.035), 'stainless', 0.003)
    box(w - 0.1, 0.05, 0.02, (0, -d / 2 + 0.03, h + 0.005), 'iron', 0.003)  # grease trough
    for x in (-0.22, -0.07, 0.08, 0.23): cyl(0.016, 0.025, (x, -d / 2 - 0.01, h - 0.05), 'black', 10, rot=(math.pi / 2, 0, 0))


def shelf(w, d=0.24, n_br=2):
    box(w, d, 0.03, (0, 0, 0.125), 'pine', 0.006, seg=2)
    box(w, 0.02, 0.035, (0, d / 2 - 0.01, 0.09), 'pine', 0.004)  # back batten
    xs = [-w / 2 + 0.12, w / 2 - 0.12] if n_br == 2 else [-w / 2 + 0.15, 0, w / 2 - 0.15]
    for x in xs:
        box(0.025, 0.02, 0.12, (x, d / 2 - 0.01, 0.05), 'iron', 0.003)
        box(0.025, d - 0.04, 0.02, (x, 0.0, 0.1), 'iron', 0.003)
        bar((x, d / 2 - 0.02, 0.0), (x, -d / 2 + 0.05, 0.1), 0.008, 'iron', 6)


def shelf_wall(): shelf(1.2)


def shelf_long(): shelf(2.2, 0.26, 3)


def caddy():
    box(0.2, 0.1, 0.012, (0, 0, 0.006), 'oak', 0.003)
    for sy in (-1, 1): box(0.2, 0.008, 0.03, (sy * 0 + 0, sy * 0.046, 0.02), 'oak', 0.002)
    for sx in (-1, 1): box(0.008, 0.1, 0.07, (sx * 0.096, 0, 0.035), 'oak', 0.002)
    bar((-0.092, 0, 0.065), (0.092, 0, 0.065), 0.006, 'cedar_dark', 6)
    box(0.06, 0.13, 0.1, (0.13, 0.0, 0.05), 'enamel_red', 0.004)  # chopstick box
    box(0.064, 0.134, 0.012, (0.13, 0.0, 0.106), 'black', 0.003)
    cyl(0.01, 0.012, (0.13, 0.0, 0.118), 'black', 8)


def signboard():
    w, h = 2.3, 0.46
    box(w - 0.08, 0.03, h - 0.08, (0, 0.02, h / 2 + 0.02), 'cedar_dark', 0.003)  # back panel (face recessed)
    for z in (0.02, h + 0.02): box(w, 0.07, 0.05, (0, 0.0, z), 'cedar_dark', 0.012, seg=2)
    for x in (-w / 2 + 0.025, w / 2 - 0.025): box(0.05, 0.07, h + 0.05, (x, 0.0, h / 2 + 0.02), 'cedar_dark', 0.012, seg=2)
    for x in (-0.7, 0.7):
        box(0.05, 0.03, h - 0.1, (x, 0.05, h / 2 + 0.02), 'pine', 0.004)  # battens behind
        box(0.03, 0.12, 0.012, (x, 0.07, h + 0.05), 'iron', 0.003)  # hanging brackets
        box(0.03, 0.012, 0.07, (x, 0.125, h + 0.02), 'iron', 0.003)


def nobori_pole():
    lathe([(0.0, 0.0), (0.15, 0.0), (0.15, 0.08), (0.12, 0.13), (0.04, 0.15), (0.04, 0.16), (0.0, 0.16)], 16, (0, 0, 0), 'black')
    cyl(0.03, 0.04, (0, 0, 0.17), 'galv', 10)
    cyl(0.014, 2.25, (0, 0, 0.16 + 1.125), 'galv', 8)
    bar((0, 0, 2.36), (-0.38, 0, 2.36), 0.008, 'galv', 6)  # the crossbar (the flag hangs from it, on -x)
    lathe([(0.0, 2.38), (0.018, 2.38), (0.018, 2.41), (0.0, 2.43)], 8, (0, 0, 0), 'black')
    for z in (0.6, 1.2, 1.8): cyl(0.02, 0.025, (0, 0, z), 'black', 8)  # flag rings


def menu_easel():
    h = 1.05
    for sx in (-1, 1):
        box(0.04, 0.03, h, (sx * 0.26, -0.06, h / 2), 'pine', 0.006, rot=(-0.12, 0, 0))
    box(0.58, 0.05, 0.04, (0, -0.115, 0.31), 'pine', 0.006)  # ledge the board stands on
    box(0.56, 0.05, 0.012, (0, -0.135, 0.33), 'pine', 0.003)
    box(0.58, 0.035, 0.04, (0, -0.005, h - 0.04), 'pine', 0.006)  # top rail
    box(0.05, 0.03, h - 0.06, (0, 0.2, (h - 0.06) / 2), 'pine', 0.006, rot=(0.38, 0, 0))  # back leg
    box(0.03, 0.03, 0.03, (0, 0.0, h - 0.02), 'iron', 0.004)  # hinge
    bar((-0.24, -0.08, 0.45), (0, 0.18, 0.4), 0.004, 'galv', 4)  # stay chain
    bar((0.24, -0.08, 0.45), (0, 0.18, 0.4), 0.004, 'galv', 4)


def ticket_machine():
    w, h, d = 0.62, 1.55, 0.45
    box(w - 0.02, d - 0.03, 0.08, (0, 0.0, 0.04), 'black', 0.004)
    box(w, d, h - 0.08, (0, 0.0, 0.08 + (h - 0.08) / 2), 'cream', 0.01, seg=2)
    f = -d / 2  # the front face (Blender -y)
    for z in (0.855, 1.545): box(0.6, 0.02, 0.02, (0, f - 0.008, z), 'black', 0.004)  # bezel round the panel
    for x in (-0.285, 0.285): box(0.02, 0.02, 0.71, (x, f - 0.008, 1.2), 'black', 0.004)
    box(w + 0.02, 0.1, 0.03, (0, f - 0.03, h + 0.0), 'cream', 0.008)  # the little hood over the panel
    box(0.5, 0.02, 0.22, (0, f - 0.006, 0.66), 'steel_worn', 0.004)  # the money plate
    box(0.03, 0.012, 0.06, (-0.15, f - 0.018, 0.7), 'black', 0.002)  # coin slot
    box(0.14, 0.012, 0.025, (0.1, f - 0.018, 0.72), 'black', 0.002)  # note slot
    box(0.06, 0.012, 0.04, (-0.15, f - 0.018, 0.6), 'enamel_red', 0.003)  # return lever
    box(0.24, 0.05, 0.06, (0.08, f - 0.02, 0.5), 'steel_worn', 0.006)  # ticket chute
    box(0.2, 0.02, 0.012, (0.08, f - 0.04, 0.47), 'black', 0.002)
    box(0.16, 0.08, 0.1, (-0.16, f - 0.03, 0.32), 'stainless', 0.01)  # change cup
    box(0.13, 0.06, 0.06, (-0.16, f - 0.05, 0.33), 'black', 0.004)
    for sx in (-1, 1): box(0.012, d - 0.06, h - 0.3, (sx * (w / 2 + 0.002), 0.0, 0.2 + (h - 0.3) / 2), 'steel_worn', 0.003)


def door_panel(w, h, loc, m='cream', handle='stainless', hx=0.0):
    """A cupboard door: a frame round a recessed panel, a bar handle."""
    x, y, z = loc
    box(w, 0.018, h, (x, y, z), m, 0.004)
    box(w - 0.08, 0.01, h - 0.08, (x, y - 0.006, z), m, 0.006)
    if handle: bar((x + hx - 0.05, y - 0.03, z + h / 2 - 0.08), (x + hx + 0.05, y - 0.03, z + h / 2 - 0.08), 0.007, handle, 6)


def kitchen_unit():
    w, h, d = 1.9, 0.82, 0.6
    box(w, d - 0.02, h - 0.1, (0, 0.01, 0.1 + (h - 0.1) / 2), 'cream', 0.004)
    box(w - 0.04, d - 0.08, 0.1, (0, 0.04, 0.05), 'black', 0.003)
    for i in range(4): door_panel(0.46, 0.68, (-w / 2 + 0.24 + i * 0.474, -d / 2 + 0.005, 0.12 + 0.36), hx=(0.15 if i % 2 else -0.15))
    t = 0.04  # the stainless top round the sink (a frame of four pieces), the basin, the tap
    sx0, sx1 = -0.65, -0.15
    box(sx0 + w / 2, d + 0.02, t, ((-w / 2 + sx0) / 2, 0, h + t / 2), 'stainless', 0.005)
    box(w / 2 - sx1, d + 0.02, t, ((sx1 + w / 2) / 2, 0, h + t / 2), 'stainless', 0.005)
    box(sx1 - sx0, 0.14, t, ((sx0 + sx1) / 2, -d / 2 + 0.06, h + t / 2), 'stainless', 0.005)
    box(sx1 - sx0, 0.12, t, ((sx0 + sx1) / 2, d / 2 - 0.05, h + t / 2), 'stainless', 0.005)
    box(sx1 - sx0 - 0.01, 0.37, 0.16, ((sx0 + sx1) / 2, 0.0, h - 0.06), 'stainless', 0.01)
    box(sx1 - sx0 - 0.03, 0.34, 0.01, ((sx0 + sx1) / 2, 0.0, h + 0.025), 'steel_worn', 0.002)  # the basin floor
    box(w, 0.02, 0.12, (0, d / 2 + 0.0, h + t + 0.06), 'stainless', 0.004)  # splash upstand
    cyl(0.018, 0.04, (-0.4, d / 2 - 0.06, h + t + 0.02), 'stainless', 10)
    bar((-0.4, d / 2 - 0.06, h + t + 0.04), (-0.4, d / 2 - 0.06, h + t + 0.3), 0.012, 'stainless', 8)
    bar((-0.4, d / 2 - 0.06, h + t + 0.3), (-0.4, d / 2 - 0.25, h + t + 0.26), 0.01, 'stainless', 8)
    box(0.07, 0.03, 0.02, (-0.4, d / 2 - 0.06, h + t + 0.2), 'enamel_red', 0.004)


def wall_cupboard():
    w, h, d = 1.9, 0.55, 0.34
    box(w, d - 0.02, h, (0, 0.01, h / 2), 'cream', 0.006)
    for i in range(4): door_panel(0.46, h - 0.06, (-w / 2 + 0.24 + i * 0.474, -d / 2 + 0.005, h / 2 + 0.005), hx=0)
    box(w, 0.04, 0.03, (0, -d / 2 + 0.02, 0.015), 'cream', 0.004)  # the light rail underneath


def range_fan():
    prism([(0.2, 0.3), (-0.06, 0.3), (-0.2, 0.08), (-0.2, 0.0), (0.2, 0.0)], 0.62, (0, 0, 0), 'cream')
    box(0.56, 0.3, 0.012, (0, 0.0, 0.006), 'filter', 0.002)
    box(0.16, 0.02, 0.05, (0.18, -0.2, 0.05), 'black', 0.004)  # switch box
    bar((0.22, -0.2, 0.03), (0.22, -0.2, -0.12), 0.003, 'black', 4)  # pull cord
    cyl(0.012, 0.03, (0.22, -0.2, -0.13), 'cream', 8)


def console_table():
    w, h, d = 1.0, 0.78, 0.32
    box(w, d, 0.035, (0, 0, h - 0.0175), 'pine', 0.008, seg=2)
    for sx in (-1, 1):
        box(0.045, 0.045, h - 0.035, (sx * (w / 2 - 0.06), 0.0, (h - 0.035) / 2), 'cedar_dark', 0.006)
        box(0.04, d - 0.06, 0.04, (sx * (w / 2 - 0.06), 0, 0.12), 'cedar_dark', 0.005)
    box(w - 0.14, 0.02, 0.07, (0, -d / 2 + 0.04, h - 0.07), 'cedar_dark', 0.004)  # apron
    box(w - 0.14, 0.02, 0.07, (0, d / 2 - 0.04, h - 0.07), 'cedar_dark', 0.004)
    box(w - 0.14, 0.03, 0.03, (0, 0, 0.12), 'cedar_dark', 0.004)  # stretcher


def collection_cabinet():
    W, D = 4.4, 0.42
    box(W, D, 0.12, (0, 0, 0.06), 'cedar_dark', 0.006)
    box(W + 0.04, D + 0.03, 0.08, (0, -0.01, 2.16), 'cedar_dark', 0.01, seg=2)
    box(W, 0.05, 0.1, (0, -D / 2 - 0.0, 2.25), 'cedar_dark', 0.008)  # crown fascia
    for x in (-W / 2, W / 2): box(0.06, D, 2.2, (x, 0, 1.1), 'cedar_dark', 0.008)
    for i in range(1, 4): box(0.04, D, 2.0, (-W / 2 + i * W / 4, 0, 1.12), 'oak', 0.006)
    box(W - 0.1, 0.02, 2.0, (0, D / 2 - 0.02, 1.12), 'navy', 0.003)
    for y in (0.16, 0.56, 0.96, 1.36, 1.74): box(W, D - 0.02, 0.025, (0, -0.01, y - 0.0175), 'oak_top', 0.004)
    box(W - 0.1, 0.04, 0.03, (0, -D / 2 + 0.06, 2.075), 'black', 0.004)  # the lamp rail under the crown


def glass_showcase():
    w, d = 0.45, 1.3
    box(w, d, 0.6, (0, 0, 0.3), 'cedar_dark', 0.008)
    for sy in (-1, 1): box(0.01, d / 2 - 0.06, 0.48, (-w / 2 - 0.004, sy * d / 4, 0.3), 'oak', 0.004)  # door panels (the open side)
    box(w + 0.02, d + 0.02, 0.06, (0, 0, 1.81), 'cedar_dark', 0.01, seg=2)
    for sx in (-1, 1):
        for sy in (-1, 1): box(0.025, 0.025, 1.18, (sx * (w / 2 - 0.0125), sy * (d / 2 - 0.0125), 1.19), 'cedar_dark', 0.004)
    for z in (0.62, 1.0, 1.38): box(w - 0.05, d - 0.05, 0.012, (0, 0, z + 0.0075), 'galv', 0.002)


def mk_shelf():
    a, b, D = -0.68, 0.68, 0.47
    for x in (a + 0.0175, b - 0.0175): box(0.035, D, 2.1, (x, 0, 1.05), 'pine', 0.006)
    box(b - a, 0.015, 2.1, (0, D / 2 - 0.0075, 1.05), 'oak', 0.003)
    for y in (0.06, 0.46, 0.84, 1.22, 1.6, 2.0):
        box(b - a - 0.07, D - 0.02, 0.025, (0, -0.01, y - 0.0125), 'pine', 0.004)
        box(b - a - 0.07, 0.006, 0.022, (0, -D / 2 + 0.0, y - 0.019), 'enamel_red', 0.002)
    box(b - a, D, 0.04, (0, 0, 2.1), 'pine', 0.006)


def mk_island():
    w, d = 1.3, 0.6
    box(w, d, 0.6, (0, 0, 0.3), 'oak', 0.008)
    box(w + 0.04, d + 0.04, 0.03, (0, 0, 0.615), 'cedar_dark', 0.008, seg=2)
    box(w, 0.26, 0.2, (0, 0.17, 0.73), 'oak', 0.006)
    box(w + 0.02, 0.28, 0.02, (0, 0.17, 0.84), 'cedar_dark', 0.005)
    # the striped skirt round the front and the ends, in folds
    n = 24
    for i in range(n):
        x = -w / 2 + (i + 0.5) * w / n
        box(w / n + 0.004, 0.01, 0.56, (x, -d / 2 - 0.006 - (0.004 if i % 2 else 0), 0.3), 'skirt', 0.002)
    for sx in (-1, 1): box(0.01, d, 0.56, (sx * (w / 2 + 0.006), 0, 0.3), 'skirt', 0.002)


def hang_bar():
    bar((-0.75, 0, 0.0), (0.75, 0, 0.0), 0.01, 'galv', 8)
    for x in (-0.72, 0.72):
        bar((x, 0, 0.0), (x, 0, 0.4), 0.0075, 'galv', 6)
        cyl(0.03, 0.01, (x, 0, 0.395), 'galv', 10)  # ceiling rose
    for x in (-0.6, -0.3, 0.0, 0.3, 0.6): box(0.012, 0.03, 0.03, (x, 0, -0.015), 'black', 0.003)  # clips


def standing_mirror():
    W, H, T = 0.38, 1.32, 0.04
    for z in (0.06, H): box(W + T, T, T, (0, 0, z), 'oak', 0.008)
    for x in (-W / 2, W / 2): box(T, T, H, (x, 0, H / 2 + 0.03), 'oak', 0.008)
    box(W + 0.06, 0.16, 0.04, (0, -0.02, 0.02), 'oak', 0.008)
    box(W - 0.02, 0.01, H - 0.06, (0, 0.016, H / 2 + 0.04), 'cedar_dark', 0.002)  # back board


def notice_board():
    for x in (-0.48, 0.48): box(0.07, 0.07, 1.95, (x, 0, 0.975), 'cedar_dark', 0.01)
    box(1.0, 0.02, 0.66, (0, -0.01, 1.42), 'cork', 0.003)
    for z in (1.09, 1.75): box(1.04, 0.05, 0.04, (0, -0.02, z), 'oak', 0.008)
    for x in (-0.5, 0.5): box(0.04, 0.05, 0.7, (x, -0.02, 1.42), 'oak', 0.008)
    prism([(0.11, 0.0), (-0.15, -0.045), (-0.15, -0.03), (0.11, 0.015)], 1.16, (0, -0.02, 1.82), 'enamel_green')  # the tin roof
    box(1.16, 0.02, 0.06, (0, 0.1, 1.79), 'cedar_dark', 0.004)


def hang_sign():
    box(0.42, 0.022, 0.21, (0, 0, -0.27), 'oak', 0.006, seg=2)
    for sx in (-1, 1):
        cyl(0.008, 0.026, (sx * 0.15, 0, -0.18), 'brass', 8, rot=(math.pi / 2, 0, 0))
        bar((sx * 0.15, 0, -0.175), (0, 0, -0.0), 0.003, 'black', 4)
    box(0.02, 0.03, 0.02, (0, 0, 0.0), 'iron', 0.004)  # the hook


def standpipe_tap():
    cyl(0.03, 0.75, (0, 0, 0.375), 'galv', 10)
    cyl(0.04, 0.03, (0, 0, 0.015), 'galv', 10)
    bar((0, 0, 0.72), (0, -0.12, 0.72), 0.015, 'galv', 8)
    bar((0, -0.12, 0.72), (0, -0.14, 0.68), 0.012, 'stainless', 8)
    cyl(0.022, 0.025, (0, 0, 0.79), 'galv', 8)
    box(0.09, 0.016, 0.016, (0, 0, 0.81), 'enamel_red', 0.004)  # the handle


def display_case():
    box(1.0, 0.5, 0.82, (0, 0, 0.41), 'cedar_dark', 0.008)
    for sx in (-1, 1): door_panel(0.46, 0.6, (sx * 0.24, -0.255, 0.38), 'cedar_dark', None)
    box(0.96, 0.46, 0.02, (0, 0, 0.83), 'velvet', 0.003)
    box(0.9, 0.012, 0.06, (0, -0.256, 0.7), 'brass', 0.003)
    h = 0.22
    for sx in (-1, 1):
        for sy in (-1, 1): box(0.012, 0.012, h, (sx * 0.48, sy * 0.23, 0.84 + h / 2), 'stainless', 0.002)
    for z in (0.84, 0.84 + h):
        for sy in (-1, 1): box(0.96, 0.012, 0.012, (0, sy * 0.23, z), 'stainless', 0.002)
        for sx in (-1, 1): box(0.012, 0.46, 0.012, (sx * 0.48, 0, z), 'stainless', 0.002)


def shelf_open():
    for sx in (-1, 1): box(0.03, 0.36, 1.55, (sx * 0.485, 0, 0.775), 'pine', 0.005)
    box(1.0, 0.02, 1.55, (0, 0.17, 0.775), 'cedar_dark', 0.003)
    for y in (0.05, 0.45, 0.85, 1.25): box(0.97, 0.36, 0.025, (0, 0, y), 'pine', 0.004)
    box(1.0, 0.36, 0.03, (0, 0, 1.55), 'pine', 0.006)


def milk_box():
    box(0.2, 0.15, 0.24, (0, 0, 0.12), 'cream', 0.006)
    box(0.22, 0.17, 0.03, (0, 0.0, 0.255), 'cedar_dark', 0.006)
    box(0.2, 0.012, 0.012, (0, -0.08, 0.235), 'iron', 0.002)  # the lid's hinge strip
    box(0.04, 0.015, 0.03, (0, -0.082, 0.2), 'brass', 0.003)  # catch
    box(0.18, 0.02, 0.02, (0, 0.085, 0.24), 'iron', 0.003)  # wall bracket


def window_box():
    prism([(0.1, 0.16), (-0.1, 0.16), (-0.085, 0.02), (0.085, 0.02)], 0.9, (0, 0, 0), 'pine')
    for x in (-0.4, 0.4): box(0.04, 0.2, 0.02, (x, 0, 0.01), 'iron', 0.003)  # feet
    box(0.86, 0.17, 0.01, (0, 0, 0.15), 'black', 0.002)  # the soil


def sat_dish():
    box(0.12, 0.02, 0.2, (0, 0.27, 0.1), 'galv', 0.004)  # wall plate
    bar((0, 0.27, 0.1), (0, 0.0, 0.1), 0.02, 'galv', 8)
    bar((0, 0.0, 0.1), (0, 0.0, 0.42), 0.02, 'galv', 8)
    lathe([(0.0, 0.0), (0.12, 0.012), (0.2, 0.035), (0.23, 0.05), (0.225, 0.055), (0.0, 0.01)], 18, (0, 0, 0), 'cream').rotation_euler = (math.pi / 2 - 0.3, 0, 0)
    parts[-1].location = (0, -0.05, 0.5)
    bar((0, -0.08, 0.42), (0, -0.3, 0.38), 0.008, 'galv', 6)  # LNB arm
    box(0.04, 0.06, 0.04, (0, -0.32, 0.38), 'black', 0.005)


def styro_box():
    box(0.6, 0.4, 0.3, (0, 0, 0.15), 'cream', 0.01, seg=2)
    box(0.62, 0.42, 0.03, (0, 0, 0.3), 'cream', 0.008)
    box(0.56, 0.36, 0.02, (0, 0, 0.3), 'black', 0.003)
    for x in (-0.14, 0.14): bar((x, 0, 0.29), (x, 0, 0.9), 0.007, 'pine', 4)


def pinch_hanger():
    bar((0, 0, 0.6), (0, 0, 0.36), 0.006, 'stainless', 6)
    lathe([(0.0, 0.6), (0.03, 0.6), (0.03, 0.62), (0.0, 0.64)], 8, (0, 0, 0), 'stainless')
    for dx, dy, w, d in ((0, -0.14, 0.44, 0.02), (0, 0.14, 0.44, 0.02), (-0.21, 0, 0.02, 0.3), (0.21, 0, 0.02, 0.3)): box(w, d, 0.02, (dx, dy, 0.35), 'enamel_green', 0.004)
    for sx in (-1, 1):
        for sy in (-1, 1): bar((0, 0, 0.36), (sx * 0.2, sy * 0.13, 0.35), 0.004, 'stainless', 4)
    cols = ['cream', 'navy', 'enamel_red', 'cream', 'enamel_green', 'cream']
    for i, c in enumerate(cols):
        x, y = -0.18 + (i % 4) * 0.12, (-0.14 if i < 4 else 0.14)
        box(0.03, 0.02, 0.04, (x, y, 0.33), 'pine', 0.003)  # the peg
        box(0.06, 0.012, 0.15 + (i % 3) * 0.03, (x, y, 0.32 - (0.15 + (i % 3) * 0.03) / 2), c, 0.004)  # a sock


def donation_box():
    box(0.2, 0.16, 0.2, (0, 0, 0.1), 'oak', 0.006)
    for k in range(4): box(0.2, 0.025, 0.012, (0, -0.06 + k * 0.04, 0.205), 'cedar_dark', 0.003)  # the slatted top
    box(0.22, 0.18, 0.02, (0, 0, 0.01), 'cedar_dark', 0.005)
    box(0.05, 0.01, 0.05, (0, -0.082, 0.14), 'brass', 0.003)  # the hasp


def mailbox():
    box(0.3, 0.12, 0.34, (0, 0, 0.17), 'enamel_red', 0.008)
    box(0.32, 0.14, 0.02, (0, -0.0, 0.35), 'enamel_red', 0.006)
    box(0.2, 0.012, 0.025, (0, -0.064, 0.27), 'black', 0.003)  # slot
    box(0.22, 0.01, 0.05, (0, -0.066, 0.3), 'enamel_red', 0.004)  # its flap
    box(0.04, 0.012, 0.04, (0.09, -0.066, 0.1), 'stainless', 0.003)  # lock


def mailbox_bank():
    box(0.08, 0.08, 0.9, (0, 0.05, 0.45), 'galv', 0.006)
    box(0.12, 0.12, 0.02, (0, 0.05, 0.01), 'galv', 0.004)
    box(0.9, 0.32, 0.55, (0, 0, 0.9 + 0.275), 'cream', 0.008)
    for i in range(6):
        x, z = -0.3 + (i % 3) * 0.3, 1.31 - (i // 3) * 0.25
        box(0.27, 0.012, 0.22, (x, -0.165, z), 'cream', 0.004)
        box(0.16, 0.01, 0.02, (x, -0.172, z + 0.06), 'black', 0.002)
        box(0.06, 0.008, 0.03, (x, -0.172, z - 0.04), 'stainless', 0.002)


def plant_bench():
    for sx in (-1, 1):
        for sy in (-1, 1): box(0.06, 0.06, 0.62, (sx * 0.68, sy * 0.1, 0.31), 'cedar_dark', 0.008)
    for k in range(4): box(1.5, 0.06, 0.03, (0, -0.105 + k * 0.07, 0.64), 'pine', 0.006)
    for sx in (-1, 1): box(0.06, 0.28, 0.04, (sx * 0.68, 0, 0.6), 'cedar_dark', 0.006)
    box(1.4, 0.03, 0.04, (0, 0, 0.2), 'cedar_dark', 0.006)


def sign_posts():
    for x in (-0.62, 0.62):
        box(0.05, 0.05, 1.75, (x, 0, 0.875), 'galv', 0.006)
        lathe([(0.0, 1.75), (0.035, 1.75), (0.03, 1.78), (0.0, 1.8)], 8, (x, 0, 0), 'galv')
    for z in (0.95, 1.65): box(1.24, 0.04, 0.04, (0, 0.02, z), 'galv', 0.005)
    box(1.22, 0.02, 0.68, (0, 0.03, 1.3), 'cream', 0.003)  # the backing plate (the print goes in front)
    for x in (-0.62, 0.62):
        for z in (1.0, 1.6): box(0.06, 0.02, 0.06, (x, -0.03, z), 'galv', 0.003)


def umbrella_closed():
    lathe([(0.0, 0.08), (0.012, 0.1), (0.04, 0.3), (0.045, 0.55), (0.03, 0.72), (0.008, 0.76), (0.0, 0.76)], 8, (0, 0, 0), 'navy')
    bar((0, 0, 0.0), (0, 0, 0.86), 0.006, 'steel_worn', 6)
    bar((0, 0, 0.76), (0, 0, 0.84), 0.012, 'cedar_dark', 6)
    box(0.012, 0.03, 0.02, (0, 0.015, 0.3), 'navy', 0.003)  # the strap


def barricade():
    for sx in (-1, 1):
        bar((sx * 0.6, -0.22, 0.0), (sx * 0.6, 0.0, 0.92), 0.02, 'steel_worn', 6)
        bar((sx * 0.6, 0.22, 0.0), (sx * 0.6, 0.0, 0.92), 0.02, 'steel_worn', 6)
        box(0.08, 0.06, 0.06, (sx * 0.6, 0.0, 0.92), 'black', 0.006)
    for z in (0.62, 0.84): box(1.3, 0.025, 0.12, (0, -0.06, z), 'skirt', 0.004)
    for sx in (-1, 1): box(0.1, 0.5, 0.04, (sx * 0.6, 0, 0.02), 'black', 0.006)  # the weighted feet


def drawing_board():
    box(0.58, 0.82, 0.02, (0, 0, 0.17), 'pine', 0.004, rot=(0.35, 0, 0))
    box(0.58, 0.03, 0.03, (0, -0.39, 0.03), 'cedar_dark', 0.004)  # the ledge
    for sx in (-1, 1): box(0.03, 0.3, 0.06, (sx * 0.26, 0.2, 0.04), 'cedar_dark', 0.004, rot=(0.35, 0, 0))
    box(0.21, 0.297, 0.004, (0.0, -0.02, 0.19), 'cream', 0.001, rot=(0.35, 0, 0))  # the page


def hose_reel():
    box(0.14, 0.03, 0.4, (0, 0.085, 0.2), 'galv', 0.005)  # wall bracket
    lathe([(0.04, -0.07), (0.17, -0.07), (0.17, -0.06), (0.06, -0.06), (0.06, 0.06), (0.17, 0.06), (0.17, 0.07), (0.04, 0.07)], 18, (0, 0, 0), 'enamel_green')
    parts[-1].rotation_euler = (math.pi / 2, 0, 0); parts[-1].location = (0, 0.0, 0.22)
    lathe([(0.06, -0.055), (0.13, -0.055), (0.13, 0.055), (0.06, 0.055)], 16, (0, 0, 0), 'rubber')  # the wound hose
    parts[-1].rotation_euler = (math.pi / 2, 0, 0); parts[-1].location = (0, 0.0, 0.22)
    bar((0.0, -0.08, 0.22), (0.0, -0.12, 0.22), 0.012, 'enamel_red', 6)  # crank
    bar((0.0, -0.12, 0.22), (0.1, -0.12, 0.3), 0.01, 'enamel_red', 6)


def stroller():
    for sx in (-1, 1):
        for sy in (-1, 1): lathe([(0.0, -0.012), (0.07, -0.012), (0.07, 0.012), (0.0, 0.012)], 12, (0, 0, 0), 'rubber'); parts[-1].rotation_euler = (0, math.pi / 2, 0); parts[-1].location = (sx * 0.21, sy * 0.24, 0.07)
    for sx in (-1, 1):
        bar((sx * 0.2, -0.24, 0.07), (sx * 0.2, 0.0, 0.2), 0.01, 'stainless', 6)
        bar((sx * 0.2, 0.24, 0.07), (sx * 0.2, 0.0, 0.2), 0.01, 'stainless', 6)
        bar((sx * 0.2, 0.0, 0.2), (sx * 0.2, 0.32, 0.95), 0.012, 'stainless', 6)  # push bar uprights
    bar((-0.22, 0.32, 0.95), (0.22, 0.32, 0.95), 0.016, 'rubber', 8)
    prism([(-0.25, 0.2), (0.22, 0.2), (0.25, 0.5), (-0.25, 0.48)], 0.4, (0, 0, 0), 'enamel_red')  # the bassinet body
    lathe([(0.0, 0.0), (0.24, 0.0), (0.24, 0.02), (0.0, 0.02)], 10, (0, 0, 0), 'cream'); parts[-1].rotation_euler = (0, math.pi / 2, 0); parts[-1].scale = (1, 1.1, 0.9); parts[-1].location = (0, 0.05, 0.5)
    for k in range(5):  # the folding hood: ribs and cloth panels
        a = 0.15 + k * 0.3
        box(0.42, 0.012, 0.14, (0, 0, 0), 'enamel_red', 0.004, rot=(a, 0, 0))
        parts[-1].location = (0, -0.22 + 0.15 * math.sin(a) - 0.0, 0.5 + 0.15 * math.cos(a))


def concrete_pipe():
    R, r, L = 0.5, 0.41, 2.0
    n = 20
    prof = [(r, -L / 2), (R, -L / 2), (R, L / 2), (r, L / 2)]
    bm = bmesh.new()
    rings = [[bm.verts.new((rr * math.cos(2 * math.pi * k / n), rr * math.sin(2 * math.pi * k / n), z)) for k in range(n)] for rr, z in prof]
    for a, b in zip(rings, rings[1:] + rings[:1]):
        for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    xform(bm, (0, 0, R), (0, math.pi / 2, 0)); uv_planar(bm)
    obj(bm, 'galv')
    for x in (-L / 2 + 0.06, L / 2 - 0.06):  # the spigot bands
        bm = bmesh.new()
        rr = [[bm.verts.new((x + dx, (R + 0.012) * math.cos(2 * math.pi * k / n), R + (R + 0.012) * math.sin(2 * math.pi * k / n))) for k in range(n)] for dx in (-0.04, 0.04)]
        for k in range(n): bm.faces.new((rr[0][k], rr[0][(k + 1) % n], rr[1][(k + 1) % n], rr[1][k]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces); uv_planar(bm); obj(bm, 'steel_worn')


def open_shelf5():
    """2.6 x 2.0 x 0.33: a back board, two sides, five shelves with tops at 0.375 + 0.38 i (the annex's figures)."""
    L, D = 2.6, 0.33
    box(L, 0.03, 2.0, (0, D / 2 - 0.015, 1.0), 'oak', 0.004)
    for x in (-L / 2 + 0.02, L / 2 - 0.02): box(0.04, D, 2.0, (x, 0, 1.0), 'cedar_dark', 0.006)
    for i in range(5): box(L - 0.08, D - 0.03, 0.025, (0, -0.015, 0.375 + i * 0.38 - 0.0125), 'pine', 0.004)
    box(L, D, 0.04, (0, 0, 2.02), 'cedar_dark', 0.006)
    box(L - 0.08, 0.02, 0.08, (0, -D / 2 + 0.01, 0.04), 'cedar_dark', 0.004)  # kick board


def pencil():
    """0.19 long, lying along x: a hexagonal green-lacquered body, the sharpened cedar tip and lead, a brass ferrule and
    a pink eraser."""
    R, L = 0.0036, 0.15
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=6, radius1=R, radius2=R, depth=L)
    xform(bm, (0, 0, 0), (0, math.pi / 2, 0)); uv_planar(bm, 20); obj(bm, 'enamel_green')
    lathe([(R * 0.96, 0.0), (0.0009, 0.019), (0.0, 0.02)], 12, (0, 0, 0), 'pine'); parts[-1].rotation_euler = (0, math.pi / 2, 0); parts[-1].location = (L / 2, 0, 0)
    lathe([(0.0009, 0.0), (0.0, 0.004)], 8, (0, 0, 0), 'black'); parts[-1].rotation_euler = (0, math.pi / 2, 0); parts[-1].location = (L / 2 + 0.019, 0, 0)
    cyl(R * 1.04, 0.009, (0, 0, 0), 'brass', 12, rot=(0, math.pi / 2, 0)); parts[-1].location = (-L / 2 - 0.0045, 0, 0)
    cyl(R * 0.95, 0.008, (0, 0, 0), 'enamel_red', 12, rot=(0, math.pi / 2, 0)); parts[-1].location = (-L / 2 - 0.013, 0, 0)


def blade_sign():
    """A projecting shop sign: a steel channel round a 0.44 x 1.04 board (faces on +-x in the game, prints go on them),
    two flat-bar brackets with bolt plates back to the pier (game -z)."""
    W, Ht, T = 0.44, 1.04, 0.035
    for z in (Ht / 2, -Ht / 2): box(T + 0.006, W + 0.02, 0.02, (0, 0, z), 'iron', 0.004)
    for y in (W / 2, -W / 2): box(T + 0.006, 0.02, Ht, (0, y, 0), 'iron', 0.004)
    box(T - 0.01, W, Ht, (0, 0, 0), 'cream', 0.002)
    for z in (Ht / 2 - 0.08, -Ht / 2 + 0.08):
        box(0.012, 0.12, 0.03, (0, W / 2 + 0.06, z), 'iron', 0.003)
        box(0.07, 0.008, 0.09, (0, W / 2 + 0.12, z), 'iron', 0.003)
        for dx in (-0.022, 0.022): cyl(0.006, 0.01, (dx, W / 2 + 0.115, z), 'galv', 6, rot=(math.pi / 2, 0, 0))


def garment(outline, depth, top):
    """A hanging garment: its outline (x, z) extruded thin, puffed a little in the middle, on a wire hanger whose hook
    tops out at `top`."""
    bm = bmesh.new()
    n = len(outline)
    fr = [bm.verts.new((x, -depth / 2 * (1.0 if abs(x) < 0.12 else 0.6), z)) for x, z in outline]
    bk = [bm.verts.new((x, depth / 2 * (1.0 if abs(x) < 0.12 else 0.6), z)) for x, z in outline]
    bm.faces.new(fr); bm.faces.new(list(reversed(bk)))
    for k in range(n): bm.faces.new((fr[k], fr[(k + 1) % n], bk[(k + 1) % n], bk[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    uv_planar(bm); obj(bm, 'cloth')
    # the wire hanger: shoulders and the hook
    sh = max(z for x, z in outline)
    bar((-0.19, 0, sh - 0.01), (0, 0, sh + 0.06), 0.004, 'stainless', 4)
    bar((0.19, 0, sh - 0.01), (0, 0, sh + 0.06), 0.004, 'stainless', 4)
    bar((0, 0, sh + 0.06), (0, 0, top - 0.03), 0.004, 'stainless', 4)
    bar((0, 0, top - 0.03), (0.03, 0, top), 0.004, 'stainless', 4)


def laundry_shirt():
    """0.62 x 0.8: a long-sleeved shirt with a collar on a wire hanger (white: tinted per instance)."""
    o = [(-0.06, 0.7), (-0.2, 0.68), (-0.3, 0.6), (-0.31, 0.2), (-0.24, 0.2), (-0.22, 0.52), (-0.2, 0.02), (0.2, 0.02), (0.22, 0.52), (0.24, 0.2), (0.31, 0.2), (0.3, 0.6), (0.2, 0.68), (0.06, 0.7), (0.0, 0.64)]
    garment(o, 0.03, 0.8)
    box(0.13, 0.035, 0.03, (0, 0, 0.69), 'cloth', 0.006)  # the collar


def laundry_tee():
    """0.5 x 0.7: a T-shirt on a wire hanger (white: tinted per instance)."""
    o = [(-0.07, 0.6), (-0.17, 0.58), (-0.26, 0.48), (-0.2, 0.42), (-0.18, 0.46), (-0.18, 0.02), (0.18, 0.02), (0.18, 0.46), (0.2, 0.42), (0.26, 0.48), (0.17, 0.58), (0.07, 0.6), (0.0, 0.55)]
    garment(o, 0.03, 0.7)


def clay_pot():
    """0.26 x 0.22: a terracotta flower pot (rolled rim, a drainage foot), soil in it: the lane's potted plants."""
    lathe([(0.0, 0.0), (0.085, 0.0), (0.09, 0.012), (0.115, 0.17), (0.13, 0.172), (0.13, 0.22), (0.112, 0.22), (0.105, 0.2), (0.0, 0.2)], 14, (0, 0, 0), 'pot')


globals()[what]()
finish(parts, out, smooth=False)
