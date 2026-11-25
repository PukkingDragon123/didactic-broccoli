"""Our own garage kit: the structure and fittings of Grandpa's garage shop (src/world/GarageDetail.js), modelled to size and
converted by lowpix like every other world model (art/lowpix/world/world.json, src = art/lowpix/world/made/<id>.glb).
Hand-painted textures in garage_tex/ (garage_paint.py); the UVs are in metres (one texture = one metre).
Written in game axes (x right, y up, z towards the viewer; Blender gets (x, -z, y)), so front = glTF / game +z.
    tools/blender.sh art/lowpix/world/made/garage_kit.py -- <out dir> [id ...]
Each piece prints `BBOX <id> minx miny minz maxx maxy maxz` (game axes, metres) for its placement (the converter moves
the origin to the bottom centre of that box: src/plugins/garageMess.js KIT).
  gk_joist       a sawn timber joist, 5 m (two per run)                     gk_hbeam    a 4 m H-beam with stiffeners and
  gk_column      the steel H-column on the left wall, base plate, bolts                 bolted end plates (a splice midway)
  gk_channel     a 5 m steel C-channel girt                                 gk_fluoro   an inverted-Fuji twin-tube fixture body
  gk_tube        a fluorescent tube (end caps, pins; it glows in game)      gk_conduit  1 m of grey PVC conduit, coupling, saddles
  gk_knob        0.5 m of knob-and-tube wiring: a porcelain knob, cloth flex gk_jbox    a porcelain round junction box
  gk_outlet      a bakelite double outlet                                   gk_cordlamp the desk lamp's flex: outlet, plug, a long
  gk_switch      the light switch plate     gk_toggle  its toggle                       run on the floor, a power strip, the lamp lead
  gk_door        the green steel back door (hinges, lever, kick plate)      gk_doorframe its steel frame
  gk_window      the steel sash window with its wooden sill                 gk_curtain  the cafe curtain bunched on its rod
  gk_lightbox    the GACHA CORNER sign's housing (the lit face is a print) gk_lanterns the lanterns' cord between two beams
  gk_plank       a plank wall shelf on steel brackets, 1.2 m                gk_hookpole the shutter hook pole
  gk_bin         the storage bin (frosted tub, blue lid)"""
import bpy, bmesh, sys, os, math, random
from mathutils import Vector, Matrix
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
from common import setup, mat
TD = os.path.join(H, 'garage_tex')
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else H
ONLY = set(argv[1:])
random.seed(31)
MS = {}


def M(n):
    if n not in MS: MS[n] = mat(TD, n, 0.6, 0.0)
    return MS[n]


def G2B(p): return Vector((p[0], -p[2], p[1]))


class Piece:
    def __init__(self): self.objs = []

    def mesh(self, bm, mt):
        me = bpy.data.meshes.new('p'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('p', me); bpy.context.collection.objects.link(o)
        o.data.materials.append(M(mt)); self.objs.append(o); return o

    def box(self, c, s, mt, rx=0.0, ry=0.0, rz=0.0, bev=0.0, uvo=None):
        """Box centred at c (game axes), size s = (x, y, z), turned about its centre (x, then z, then y), UVs in metres."""
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
        bmesh.ops.scale(bm, vec=(s[0], s[2], s[1]), verts=bm.verts)   # game (x, y, z) -> Blender (x, z, y) extents
        if bev: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bev, min(s) * 0.45), segments=1, profile=0.5, affect='EDGES')
        uv = bm.loops.layers.uv.new()
        ou, ov = uvo if uvo else (random.random(), random.random())
        for f in bm.faces:
            n = f.normal; ax = (0, 2) if abs(n.y) > 0.6 else (1, 2) if abs(n.x) > 0.6 else (0, 1)
            if abs(n.z) > 0.6: ax = (0, 1)
            for l in f.loops: l[uv].uv = (l.vert.co[ax[0]] + ou, l.vert.co[ax[1]] + ov)
        R = Matrix.Rotation(ry, 4, 'Z') @ Matrix.Rotation(-rz, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X')
        bmesh.ops.transform(bm, matrix=Matrix.Translation(G2B(c)) @ R, verts=bm.verts)
        return self.mesh(bm, mt)

    def sweep(self, pts, r, mt, sides=8, caps=True, closed=False):
        """A tube through game-axis points; r a radius or one per point. UVs: around x metres along."""
        P = [G2B(p) for p in pts]; n = len(P)
        rr = r if isinstance(r, (list, tuple)) else [r] * n
        bm = bmesh.new(); uv = bm.loops.layers.uv.new()
        T = []
        for i in range(n):
            a = P[max(0, i - 1)]; b = P[min(n - 1, i + 1)]
            t = (b - a); t = t.normalized() if t.length > 1e-9 else Vector((0, 0, 1)); T.append(t)
        up = Vector((0, 0, 1)) if abs(T[0].z) < 0.9 else Vector((1, 0, 0))
        N = (up - T[0] * up.dot(T[0])).normalized()
        rings, L = [], [0.0]
        for i in range(n):
            if i: N = (N - T[i] * N.dot(T[i])).normalized(); L.append(L[-1] + (P[i] - P[i - 1]).length)
            Bv = T[i].cross(N)
            rings.append([bm.verts.new(P[i] + (N * math.cos(2 * math.pi * k / sides) + Bv * math.sin(2 * math.pi * k / sides)) * rr[i]) for k in range(sides)])
        circ = 2 * math.pi * max(rr)
        for i in range(n - 1):
            for k in range(sides):
                k2 = (k + 1) % sides
                f = bm.faces.new((rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k]))
                for l, (u, v) in zip(f.loops, ((k, L[i]), (k + 1, L[i]), (k + 1, L[i + 1]), (k, L[i + 1]))): l[uv].uv = (u / sides * circ, v)
        if caps and not closed:
            for ring, rev in ((rings[0], True), (rings[-1], False)):
                f = bm.faces.new(list(reversed(ring)) if rev else ring)
                for l in f.loops: l[uv].uv = (l.vert.co.x * 1.0, l.vert.co.y * 1.0)
        bm.normal_update()
        return self.mesh(bm, mt)

    def lathe(self, c, prof, mt, axis='y', sides=10):
        """A turned part: prof = [(r, along)] from c along the game axis."""
        d = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1)}[axis]
        pts = [(c[0] + d[0] * a, c[1] + d[1] * a, c[2] + d[2] * a) for r, a in prof]
        return self.sweep(pts, [max(r, 1e-4) for r, a in prof], mt, sides=sides)

    def grid(self, fn, nu, nv, mt, thick=0.0):
        """A surface fn(u, v) -> game point on a nu x nv grid (u, v in 0..1), optionally with a back face `thick` behind."""
        bm = bmesh.new(); uv = bm.loops.layers.uv.new()
        layers = [0.0] + ([thick] if thick else [])
        V = []
        for li, off in enumerate(layers):
            row = []
            for j in range(nv + 1):
                row.append([bm.verts.new(G2B(fn(i / nu, j / nv, off))) for i in range(nu + 1)])
            V.append(row)
        for li in range(len(layers)):
            for j in range(nv):
                for i in range(nu):
                    q = (V[li][j][i], V[li][j][i + 1], V[li][j + 1][i + 1], V[li][j + 1][i])
                    f = bm.faces.new(q if li == 0 else tuple(reversed(q)))
                    for l, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))): l[uv].uv = (a / nu * 0.5, b / nv)
        bm.normal_update()
        return self.mesh(bm, mt)

    def export(self, name):
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.objs: o.select_set(True)
        bpy.context.view_layer.objects.active = self.objs[0]
        bpy.ops.object.join()
        o = bpy.context.active_object
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        bpy.ops.object.shade_flat()
        ws = [o.matrix_world @ v.co for v in o.data.vertices]
        mn = [min(v[k] for v in ws) for k in range(3)]; mx = [max(v[k] for v in ws) for k in range(3)]
        # Blender (x, y, z) -> game (x, z, -y)
        g0 = (mn[0], mn[2], -mx[1]); g1 = (mx[0], mx[2], -mn[1])
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + '.glb'), export_format='GLB', export_apply=True, use_selection=True)
        print('BBOX', name, ' '.join('%.4f' % v for v in g0 + g1), 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
        bpy.data.objects.remove(o)


def hexbolt(P, c, axis, r=0.01, h=0.01, mt='steeldark'):
    d = {'x': (1, 0, 0), 'y': (0, 1, 0), 'z': (0, 0, 1), '-x': (-1, 0, 0), '-y': (0, -1, 0), '-z': (0, 0, -1)}[axis]
    pts = [c, (c[0] + d[0] * h, c[1] + d[1] * h, c[2] + d[2] * h)]
    P.sweep(pts, r, mt, sides=6)


# ======================================================================================== the pieces
def gk_joist():
    P = Piece()
    P.box((0, 0.05, 0), (5.0, 0.1, 0.05), 'timber', bev=0.004)
    for x in (-2.3, -0.7, 1.0, 2.2):                         # where the boards were nailed up: the nail heads proud
        hexbolt(P, (x + random.uniform(-0.1, 0.1), 0.1, random.uniform(-0.01, 0.01)), 'y', r=0.004, h=0.002, mt='steeldark')
    P.box((-2.5 + 0.006, 0.05, 0), (0.012, 0.098, 0.048), 'timber', bev=0.002)   # the sawn end, a shade darker in the grain
    return P


def gk_hbeam():
    P = Piece()
    L = 4.0
    P.box((0, 0.224, 0), (L, 0.016, 0.15), 'steel', bev=0.003)
    P.box((0, 0.116, 0), (L, 0.2, 0.012), 'steel')
    P.box((0, 0.008, 0), (L, 0.016, 0.15), 'steel', bev=0.003)
    for x in (-1.0, 1.0):
        for s in (-1, 1): P.box((x, 0.116, s * 0.039), (0.012, 0.2, 0.066), 'steel')
    for s in (-1, 1):                                        # bolted end plates (a splice where two meet, a cleat at a wall)
        x = s * (L / 2 - 0.01)
        P.box((x, 0.116, 0), (0.02, 0.26, 0.2), 'steel', bev=0.002)
        for y in (0.04, 0.19):
            for z in (-0.065, 0.065): hexbolt(P, (x - s * 0.01, y, z), '-x' if s > 0 else 'x', r=0.011, h=0.012)
    return P


def gk_column():
    P = Piece()
    h = 3.1
    P.box((0.006, h / 2, 0), (0.012, h, 0.15), 'steel')
    P.box((0.066, h / 2, 0), (0.108, h, 0.012), 'steel')
    P.box((0.126, h / 2, 0), (0.012, h, 0.15), 'steel')
    P.box((0.1, 0.006, 0), (0.2, 0.012, 0.22), 'steeldark', bev=0.002)
    P.box((0.07, h - 0.006, 0), (0.15, 0.012, 0.17), 'steel', bev=0.002)
    for z in (-0.07, 0.07):
        P.sweep([(0.17, 0.012, z), (0.17, 0.05, z)], 0.008, 'steeldark', sides=8)
        hexbolt(P, (0.17, 0.012, z), 'y', r=0.015, h=0.013)
    for y in (0.9, 1.9):                                     # wall ties through the flange
        hexbolt(P, (0.012, y, 0.05), 'x', r=0.01, h=0.008); hexbolt(P, (0.012, y, -0.05), 'x', r=0.01, h=0.008)
    return P


def gk_channel():
    P = Piece()
    L = 5.0
    P.box((0, 0.05, 0.003), (L, 0.1, 0.006), 'steeldark')
    P.box((0, 0.003, 0.03), (L, 0.006, 0.06), 'steeldark', bev=0.001)
    P.box((0, 0.097, 0.03), (L, 0.006, 0.06), 'steeldark', bev=0.001)
    for x in (-2.0, -1.0, 0.0, 1.0, 2.0): hexbolt(P, (x, 0.05, 0.006), 'z', r=0.01, h=0.008)
    return P


def gk_fluoro():
    """Long axis along x (1.3 m); y = 0 is the bottom of the top plate (in the garage 3.02 m)."""
    P = Piece()
    L = 1.3
    P.box((0, 0.011, 0), (L, 0.022, 0.24), 'enamel', bev=0.003)
    for s in (-1, 1):
        P.box((0, -0.04, s * 0.085), (L - 0.02, 0.09, 0.006), 'enamel', rx=s * 0.7)
        P.box((s * L / 2, -0.02, 0), (0.012, 0.04, 0.22), 'enamel')
        P.box((s * L / 2, -0.0625, 0), (0.012, 0.045, 0.15), 'enamel')
        P.box((s * (L / 2 - 0.035), -0.102, 0), (0.035, 0.032, 0.11), 'bakelite', bev=0.004)
        # one hanger rod at each end, up the middle to the joist it hangs from (a rose screwed to its underside)
        P.sweep([(s * 0.35, 0.022, 0.0), (s * 0.35, 0.08, 0.0)], 0.004, 'steeldark', sides=6)
        P.lathe((s * 0.35, 0.076, 0.0), [(0.0, 0), (0.016, 0), (0.016, 0.004), (0.0, 0.004)], 'enamel', sides=10)
    P.box((0, -0.079, 0), (L, 0.012, 0.118), 'enamel')
    P.lathe((-0.5, -0.04, 0.07), [(0.0, 0), (0.009, 0), (0.009, 0.02), (0.0, 0.02)], 'bakelite', sides=8)   # the glow starter
    return P


def gk_tube():
    P = Piece()
    P.sweep([(-0.585, 0, 0), (0.585, 0, 0)], 0.014, 'tube', sides=10)
    for s in (-1, 1):
        P.lathe((s * 0.585, 0, 0), [(0.0, 0), (0.0145, 0), (0.0145, s * 0.025), (0.0, s * 0.025)], 'alu', axis='x', sides=10)
        for z in (-0.006, 0.006): P.sweep([(s * 0.61, 0, z), (s * 0.618, 0, z)], 0.0012, 'brass', sides=4)
    return P


def gk_conduit():
    """1 m along x; the wall is the plane z = 0 behind it."""
    P = Piece()
    P.sweep([(-0.5, 0, 0.013), (0.5, 0, 0.013)], 0.012, 'pvc', sides=10)
    P.lathe((0.45, 0, 0.013), [(0.0, 0), (0.0155, 0), (0.0155, 0.05), (0.0, 0.05)], 'pvc', axis='x', sides=10)
    for x in (-0.25, 0.25):
        arc = [(x, 0.0145 * math.sin(a), 0.013 + 0.0145 * math.cos(a)) for a in [-math.pi / 2 + k * math.pi / 8 for k in range(9)]]
        P.sweep([(x, -0.03, 0.0016)] + [(x, -0.0145, 0.0016)] + arc + [(x, 0.0145, 0.0016), (x, 0.03, 0.0016)], 0.0016, 'alu', sides=4)
        for y in (-0.025, 0.025): hexbolt(P, (x, y, 0.0032), 'z', r=0.004, h=0.002, mt='alu')
    return P


def gk_knob():
    """0.5 m along +x under a surface at y = 0: a porcelain knob at x = 0 and the flex to the next one."""
    P = Piece()
    P.lathe((0, 0, 0), [(0.0, 0), (0.011, 0), (0.011, -0.004), (0.0075, -0.009), (0.0075, -0.015), (0.011, -0.02), (0.01, -0.026), (0.0, -0.026)], 'porcelain', sides=10)
    P.lathe((0, -0.026, 0), [(0.0, 0), (0.004, 0), (0.004, -0.002), (0.0, -0.002)], 'steeldark', sides=6)
    pts = [(x, -0.012 - 0.004 * math.sin(math.pi * x / 0.5), 0.011) for x in [k * 0.05 for k in range(11)]]
    P.sweep(pts, 0.0035, 'flex', sides=6)
    P.lathe((0, -0.012, 0.011), [(0.0, -0.006), (0.0042, -0.006), (0.0042, 0.006), (0.0, 0.006)], 'steeldark', axis='x', sides=6)   # the tie wire
    return P


def gk_jbox():
    P = Piece()
    P.lathe((0, 0, 0), [(0.0, 0), (0.045, 0), (0.045, -0.004), (0.043, -0.026), (0.038, -0.03), (0.0, -0.03)], 'porcelain', sides=14)
    for x in (-0.02, 0.02): hexbolt(P, (x, -0.03, 0), '-y', r=0.005, h=0.002)
    for a in (0.3, 2.6):
        P.sweep([(math.cos(a) * 0.04, -0.012, math.sin(a) * 0.04), (math.cos(a) * 0.065, -0.012, math.sin(a) * 0.065)], 0.0035, 'flex', sides=6)
    return P


def outlet(P, c, plug=False):
    """A bakelite double outlet on a wall (wall plane z = c.z, facing +z)."""
    x, y, z = c
    P.box((x, y, z + 0.018), (0.075, 0.11, 0.036), 'bakelite', bev=0.005)
    for dy in (-0.025, 0.025):
        P.box((x, y + dy, z + 0.037), (0.034, 0.03, 0.003), 'plug', bev=0.001)
    hexbolt(P, (x, y, z + 0.036), 'z', r=0.004, h=0.002, mt='alu')
    if plug: P.box((x, y + 0.025, z + 0.05), (0.03, 0.034, 0.026), 'plug', bev=0.004)


def gk_outlet():
    P = Piece()
    outlet(P, (0, 0.055, 0))
    return P


def gk_cordlamp():
    """The desk lamp runs off the outlet by the back door: plug, a long flex on the floor (gaffer-taped down), a power
    strip behind the work table, and the lamp's lead up the back of the desk. Game coordinates of the garage."""
    P = Piece()
    outlet(P, (0.78, 0.30, -4.995), plug=True)
    run = [(0.78, 0.325, -4.93), (0.782, 0.29, -4.915), (0.79, 0.17, -4.9), (0.8, 0.05, -4.86), (0.82, 0.008, -4.76), (0.86, 0.006, -4.5),
           (0.9, 0.006, -4.25), (1.08, 0.006, -3.95), (1.18, 0.006, -3.45), (1.21, 0.006, -2.6), (1.18, 0.006, -1.6), (1.16, 0.006, -1.1),
           (1.12, 0.006, -0.8), (1.06, 0.006, -0.66)]
    P.sweep(run, 0.0055, 'rubber', sides=6)
    # the power strip, lying on the floor behind the desk (four sockets, a red switch)
    sx, sz = 0.92, -0.6
    P.box((sx, 0.02, sz), (0.3, 0.04, 0.055), 'bakelite', ry=0.25, bev=0.006)
    for k in range(4):
        dx = -0.09 + k * 0.055
        P.box((sx + dx * math.cos(0.25), 0.0405, sz - dx * math.sin(0.25)), (0.03, 0.002, 0.034), 'plug', ry=0.25)
    P.box((sx + 0.13 * math.cos(0.25), 0.042, sz - 0.13 * math.sin(0.25)), (0.016, 0.006, 0.022), 'grip', ry=0.25, bev=0.002)
    # the lamp's plug in the second socket, its lead up the back of the desk and over the edge to the lamp
    px, pz = sx + (-0.035) * math.cos(0.25), sz + 0.035 * math.sin(0.25)
    P.box((px, 0.055, pz), (0.026, 0.03, 0.03), 'plug', ry=0.25, bev=0.004)
    lead = [(px, 0.07, pz), (px + 0.01, 0.06, pz + 0.05), (0.9, 0.012, -0.5), (0.9, 0.02, -0.42), (0.895, 0.06, -0.38), (0.892, 0.3, -0.37),
            (0.89, 0.6, -0.368), (0.888, 0.77, -0.366), (0.887, 0.79, -0.356), (0.885, 0.789, -0.33), (0.884, 0.788, -0.29)]
    P.sweep(lead, 0.0045, 'rubber', sides=6)
    return P


def gk_cordchanger():
    """The coin changer's lead: a plug in the outlet in the back-left corner (x -4, z -4.85), down the wall and along
    the floor into the changer's side. Game coordinates of the garage."""
    P = Piece()
    P.box((-3.9785 + 0.008, 0.44, -4.85), (0.026, 0.034, 0.03), 'plug', bev=0.004)
    run = [(-3.96, 0.44, -4.85), (-3.945, 0.41, -4.84), (-3.935, 0.3, -4.82), (-3.93, 0.12, -4.79), (-3.925, 0.02, -4.74), (-3.9, 0.006, -4.64),
           (-3.84, 0.006, -4.52), (-3.78, 0.006, -4.42), (-3.75, 0.02, -4.36), (-3.745, 0.08, -4.33), (-3.74, 0.12, -4.31)]
    P.sweep(run, 0.005, 'rubber', sides=6)
    return P


def gk_switch():
    P = Piece()
    P.box((0, 0, 0.006), (0.08, 0.12, 0.012), 'bakelite', bev=0.003)
    P.box((0, 0, 0.014), (0.03, 0.052, 0.004), 'bakelite', bev=0.0015)
    for y in (-0.045, 0.045): hexbolt(P, (0, y, 0.012), 'z', r=0.004, h=0.0015, mt='alu')
    return P


def gk_toggle():
    P = Piece()
    P.box((0, 0, 0.009), (0.022, 0.036, 0.018), 'bakelite', bev=0.004)
    return P


def gk_door():
    """Hinged at x = 0, 1.2 x 2.1 m, 5 cm thick (z -0.025..0.025), the room on +z."""
    P = Piece()
    W, Ht = 1.2, 2.1
    P.box((W / 2, Ht / 2, 0), (W, Ht, 0.05), 'door', bev=0.004)
    for side in (1, -1):                                     # the pressed panel border, both faces
        z = side * 0.027
        for (cx, cy, sx, sy) in ((W / 2, 0.12, W - 0.16, 0.04), (W / 2, Ht - 0.12, W - 0.16, 0.04), (0.1, Ht / 2, 0.04, Ht - 0.2), (W - 0.1, Ht / 2, 0.04, Ht - 0.2)):
            P.box((cx, cy, z), (sx, sy, 0.004), 'door', bev=0.0015)
        # lever handle on a round rose, the key escutcheon under it
        zz = side * 0.025
        P.lathe((W - 0.1, 1.0, zz), [(0.0, 0), (0.03, 0), (0.03, side * 0.006), (0.0, side * 0.006)], 'brass', axis='z', sides=12)
        P.sweep([(W - 0.1, 1.0, zz + side * 0.006), (W - 0.1, 1.0, zz + side * 0.05)], 0.008, 'brass', sides=8)
        P.box((W - 0.16, 1.0, zz + side * 0.05), (0.13, 0.018, 0.016), 'brass', bev=0.006)
        P.box((W - 0.1, 0.9, zz + side * 0.002), (0.03, 0.06, 0.004), 'brass', bev=0.002)
    P.box((W / 2, 0.11, 0.0265), (W - 0.06, 0.2, 0.003), 'alu')            # kick plate on the room side
    for y in (0.25, 1.05, 1.85):                                             # the hinge barrels on the room side edge
        P.sweep([(0.0, y - 0.06, 0.03), (0.0, y + 0.06, 0.03)], 0.011, 'frame', sides=8)
        P.box((0.025, y, 0.026), (0.05, 0.11, 0.003), 'frame')
    return P


def gk_doorframe():
    P = Piece()
    for x in (-0.63, 0.63): P.box((x, 1.05, 0), (0.06, 2.1, 0.12), 'frame', bev=0.003)
    P.box((0, 2.13, 0), (1.32, 0.06, 0.12), 'frame', bev=0.003)
    for x in (-0.6 + 0.01, 0.6 - 0.01): P.box((x, 1.05, -0.04), (0.02, 2.06, 0.02), 'frame')   # the door stop
    return P


def gk_window():
    """A wall window 1.6 x 0.85 m; the wall is the plane z = 0, the room on +z; u along x; y = 0 at the sill line."""
    P = Piece()
    w, h, d = 1.6, 0.85, 0.1
    P.box((0, 0.02, 0), (w, 0.04, d), 'sash', bev=0.003)
    P.box((0, h - 0.02, 0), (w, 0.04, d), 'sash', bev=0.003)
    for x in (-w / 2 + 0.02, w / 2 - 0.02): P.box((x, h / 2, 0), (0.04, h, d), 'sash', bev=0.003)
    # two sliding sashes: their stiles meet at the middle, one in front of the other
    for k, zz in ((-1, 0.018), (1, -0.018)):
        P.box((k * 0.02, h / 2, zz), (0.032, h - 0.08, 0.03), 'sash', bev=0.002)
        P.box((k * w / 4, 0.055, zz), (w / 2 - 0.04, 0.03, 0.03), 'sash', bev=0.002)
        P.box((k * w / 4, h - 0.055, zz), (w / 2 - 0.04, 0.03, 0.03), 'sash', bev=0.002)
    P.lathe((-0.02, h / 2, 0.034), [(0.0, 0), (0.012, 0), (0.012, 0.008), (0.0, 0.008)], 'brass', axis='z', sides=10)   # crescent latch
    P.box((0.0, h / 2 + 0.006, 0.044), (0.04, 0.012, 0.008), 'brass', bev=0.003)
    P.box((0, -0.015, 0.075), (w + 0.12, 0.03, 0.17), 'sill', bev=0.004)
    for x in (-0.6, 0.6): P.box((x, -0.06, 0.012), (0.02, 0.06, 0.024), 'steeldark')   # sill brackets into the wall
    return P


def gk_curtain():
    """The cafe curtain bunched at one end of its rod (wall plane z = 0, room +z, y = 0 at the sill line)."""
    P = Piece()
    P.sweep([(-0.88, 0.87, 0.12), (0.88, 0.87, 0.12)], 0.006, 'alu', sides=8)
    for x in (-0.88, 0.88):
        P.box((x, 0.87, 0.06), (0.012, 0.02, 0.12), 'alu')
        P.lathe((x, 0.87, 0.0), [(0.0, 0), (0.016, 0), (0.016, 0.006), (0.0, 0.006)], 'alu', axis='z', sides=8)
    for k in range(6): P.lathe((-0.77 + k * 0.032, 0.87, 0.12), [(0.0, -0.004), (0.011, -0.004), (0.011, 0.004), (0.0, 0.004)], 'alu', axis='x', sides=8)
    def fn(u, v, off):
        x = -0.78 + u * 0.19
        y = 0.86 - v * 0.8
        z = 0.12 + 0.022 * math.sin(u * math.pi * 11) * (0.6 + 0.4 * v) - off + v * 0.01
        return (x + v * 0.03 * u, y - 0.01 * math.sin(u * 7), z)
    P.grid(fn, 44, 8, 'curtain', thick=0.004)
    return P


def gk_lightbox():
    """The sign's housing 1.65 x 0.42 x 0.1 (wall-side face z = 0, the lit face recessed at z = 0.085), on standoffs."""
    P = Piece()
    P.box((0, 0.21, 0.04), (1.65, 0.42, 0.08), 'lightbox', bev=0.006)
    for (cx, cy, sx, sy) in ((0, 0.405, 1.65, 0.03), (0, 0.015, 1.65, 0.03), (-0.81, 0.21, 0.03, 0.42), (0.81, 0.21, 0.03, 0.42)):
        P.box((cx, cy, 0.09), (sx, sy, 0.02), 'lightbox', bev=0.004)
    for x in (-0.6, 0.6):
        P.box((x, 0.21, -0.07), (0.03, 0.03, 0.14), 'steeldark')
        P.box((x, 0.21, -0.138), (0.07, 0.07, 0.004), 'steeldark')
        P.box((x, 0.44, 0.03), (0.03, 0.04, 0.06), 'steeldark')
    P.sweep([(0.75, 0.42, 0.03), (0.76, 0.5, 0.02), (0.78, 0.6, 0.0), (0.8, 0.66, -0.1), (0.8, 0.7, -0.138)], 0.004, 'flex', sides=6)
    return P


LANTERN_PTS = [(-3.51, 2.866 - math.sin(i * math.pi / 8) * 0.16 - (i % 2) * 0.02, -3.4 + 0.7 * i) for i in range(9)]


def gk_lanterns():
    """The paper lanterns' cord, tied under the H-beam flanges at z -3.4 and 2.2 (game coordinates), seven wire hangers."""
    P = Piece()
    pts = []
    for i in range(8):
        a, b = LANTERN_PTS[i], LANTERN_PTS[i + 1]
        for k in range(6):
            t = k / 6
            pts.append((a[0], a[1] + (b[1] - a[1]) * t - 0.012 * math.sin(math.pi * t), a[2] + (b[2] - a[2]) * t))
    pts.append(LANTERN_PTS[-1])
    P.sweep(pts, 0.004, 'flex', sides=6)
    for i in range(1, 8):
        p = LANTERN_PTS[i]
        P.sweep([(p[0], p[1], p[2]), (p[0], p[1] - 0.03, p[2])], 0.0015, 'steeldark', sides=4)
        P.lathe((p[0], p[1] - 0.03, p[2]), [(0.0, 0.0), (0.004, 0.0), (0.004, -0.004), (0.0, -0.004)], 'steeldark', sides=6)
    for p in (LANTERN_PTS[0], LANTERN_PTS[-1]):              # the ties round the flange
        P.lathe((p[0], p[1], p[2]), [(0.0, -0.01), (0.008, -0.01), (0.008, 0.002), (0.0, 0.002)], 'flex', sides=8)
    return P


def gk_plank():
    """A wall shelf 1.2 m: plywood plank (top at y 0.205) with a front batten, on two steel brackets (wall z = 0)."""
    P = Piece()
    P.box((0, 0.1925, 0.125), (1.2, 0.025, 0.25), 'ply', bev=0.002)
    P.box((0, 0.185, 0.26), (1.2, 0.04, 0.02), 'timber', bev=0.002)
    for x in (-0.48, 0.48):
        P.box((x, 0.17, 0.1), (0.02, 0.02, 0.2), 'steeldark', bev=0.002)
        P.box((x, 0.09, 0.01), (0.02, 0.18, 0.02), 'steeldark', bev=0.002)
        P.box((x, 0.1, 0.09), (0.012, 0.2, 0.012), 'steeldark', rx=0.72)
        for y in (0.03, 0.12): hexbolt(P, (x, y, 0.02), 'z', r=0.005, h=0.003, mt='alu')
    return P


def gk_hookpole():
    P = Piece()
    P.sweep([(0, 0.05, 0), (0, 2.05, 0)], 0.009, 'galv', sides=8)
    P.sweep([(0, 2.05, 0), (0, 2.12, 0), (0.02, 2.15, 0), (0.05, 2.15, 0), (0.07, 2.12, 0), (0.07, 2.09, 0)], 0.007, 'galv', sides=8)
    P.lathe((0, 0, 0), [(0.0, 0), (0.014, 0), (0.014, 0.06), (0.0, 0.06)], 'rubber', sides=10)
    P.lathe((0, 1.0, 0), [(0.0, 0), (0.013, 0), (0.013, 0.25), (0.0, 0.25)], 'grip', sides=10)
    return P


def gk_bin():
    """The storage bin 0.5 x 0.38 m with its lid (0.53 x 0.04): a tapered frosted tub with a rim, handles, a blue lid."""
    P = Piece()
    def tub(u, v, off):
        # u runs round the four sides, v up the wall
        w0, w1 = 0.46 - off * 2, 0.5 - off * 2
        hw = (w0 + (w1 - w0) * v) / 2
        a = u * 4; s = int(min(3, a)); t = a - s
        corners = [(-hw, -hw), (hw, -hw), (hw, hw), (-hw, hw), (-hw, -hw)]
        x = corners[s][0] + (corners[s + 1][0] - corners[s][0]) * t
        z = corners[s][1] + (corners[s + 1][1] - corners[s][1]) * t
        return (x, v * 0.38, z)
    P.grid(tub, 32, 4, 'bin', thick=0.006)
    P.box((0, 0.003, 0), (0.46, 0.006, 0.46), 'bin')
    P.box((0, 0.375, 0), (0.52, 0.012, 0.52), 'bin', bev=0.004)
    P.box((0, 0.4, 0), (0.53, 0.04, 0.53), 'binlid', bev=0.008)
    P.box((0, 0.423, 0), (0.44, 0.008, 0.44), 'binlid', bev=0.004)
    for s in (-1, 1): P.box((s * 0.255, 0.33, 0), (0.02, 0.03, 0.16), 'bin', bev=0.006)
    return P


ALL = [gk_joist, gk_hbeam, gk_column, gk_channel, gk_fluoro, gk_tube, gk_conduit, gk_knob, gk_jbox, gk_outlet, gk_cordlamp, gk_cordchanger,
       gk_switch, gk_toggle, gk_door, gk_doorframe, gk_window, gk_curtain, gk_lightbox, gk_lanterns, gk_plank, gk_hookpole, gk_bin]
setup()
for fn in ALL:
    if ONLY and fn.__name__ not in ONLY: continue
    fn().export(fn.__name__)
