"""Packaging shapes for the shop goods (Mikawa-ya's shelves, src/world/CornerShop.js prod / can): modelled once in a unit
box (x -0.5..0.5, height 0..1, depth -0.5..0.5, front +z in the game), two materials: 'label' (UVs 0..1 over the printed
face, remapped at run time onto the shop's label atlas, src/world/mikawayaArt.js) and 'edge' (the packet's own colour).
Not lowpix-converted: the print is the shop's own label art. Written to public/models/made/<name>.glb.
    tools/blender.sh art/lowpix/world/made/r6_goods.py -- <out.glb> <name>
pk_bagrow   three pillow snack bags one behind the other (crimped top and bottom seams, puffed faces)
pk_bag      one pillow bag
pk_boxrow   three cartons one behind the other, each with its tuck flap on top
pk_display  a counter display box: the printed header card standing up at the back, a printed front lip, side walls and
            the packets' tops showing inside
pk_kit      a model-kit box: the base, the deeper printed lid over it
pk_carton   a shipping carton: the flaps folded down, a tape strip over the seam
pk_can      a can: rolled rims, the lid recessed, the label wrapped round the body
pk_news     a folded newspaper: a soft fold along one long edge"""
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix
out, what = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
MAT = {}
for n, c in (('label', (0.9, 0.9, 0.9, 1)), ('edge', (0.6, 0.6, 0.6, 1))):
    m = bpy.data.materials.new(n); m.diffuse_color = c; MAT[n] = m
bm = bmesh.new()
uv = bm.loops.layers.uv.new()
L, E = 0, 1  # material slots


def face(vs, m, uvs=None):
    f = bm.faces.new([bm.verts.new(v) for v in vs])
    f.material_index = m
    for k, l in enumerate(f.loops): l[uv].uv = uvs[k] if uvs else (0.5, 0.5)
    return f


def quad(a, b, c, d, m, uvs=None): return face([a, b, c, d], m, uvs)


def box(x0, x1, y0, y1, z0, z1, front=E, top=E, flabel=None, tlabel=None):
    """An axis box in game axes (x, y up, z front); faces get material + label UVs where asked."""
    P = lambda x, y, z: (x, -z, y)  # game -> Blender
    quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), front, flabel or [(0, 0), (1, 0), (1, 1), (0, 1)])
    quad(P(x1, y0, z0), P(x0, y0, z0), P(x0, y1, z0), P(x1, y1, z0), E)
    quad(P(x0, y1, z1), P(x1, y1, z1), P(x1, y1, z0), P(x0, y1, z0), top, tlabel or [(0, 0), (1, 0), (1, 1), (0, 1)])
    quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), E)
    quad(P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), E)
    quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), E)


def pillow(zc, t, nx=3, ny=4, x0=-0.5, x1=0.5):
    """A bag: front and back surfaces bulging by t/2 at the middle, meeting at the crimped rim."""
    P = lambda x, y, z: (x, -z, y)
    def bul(u, v):
        if v < 0.08 or v > 0.92: return 0.0
        return (max(0.0, 1 - (2 * u - 1) ** 4)) ** 0.5 * (math.sin(math.pi * (v - 0.08) / 0.84)) ** 0.5
    grid = lambda s: [[P(x0 + (x1 - x0) * i / nx, j / ny, zc + s * t / 2 * bul(i / nx, j / ny)) for i in range(nx + 1)] for j in range(ny + 1)]
    for s, flip in ((1, False), (-1, True)):
        g = grid(s)
        for j in range(ny):
            for i in range(nx):
                a, b, c, d = g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]
                us = [(i / nx, j / ny), ((i + 1) / nx, j / ny), ((i + 1) / nx, (j + 1) / ny), (i / nx, (j + 1) / ny)]
                if flip: a, b, c, d = b, a, d, c; us = [us[1], us[0], us[3], us[2]]
                quad(a, b, c, d, L if s > 0 else E, us)


def pk_bagrow():
    for k in range(3): pillow(0.5 - 0.17 - k * 0.33, 0.3)


def pk_bag(): pillow(0.0, 0.9)


def pk_boxrow():
    for k in range(3):
        z1 = 0.5 - k * 0.335; z0 = z1 - 0.32
        box(-0.5, 0.5, 0, 0.96, z0, z1, front=L if k == 0 else E)
        box(-0.5, 0.5, 0.96, 1.0, z0 + 0.03, z1 - 0.12)  # the tuck flap


def pk_display():
    box(-0.5, 0.5, 0, 1.0, -0.5, -0.38, front=L, flabel=[(0, 0.25), (1, 0.25), (1, 1), (0, 1)])  # header card
    box(-0.5, 0.5, 0, 0.3, 0.42, 0.5, front=L, flabel=[(0, 0), (1, 0), (1, 0.25), (0, 0.25)])  # front lip
    for x in (-0.5, 0.46): box(x, x + 0.04, 0, 0.42, -0.38, 0.42)
    box(-0.46, 0.46, 0, 0.05, -0.38, 0.42)
    for i in range(5):  # packet tops standing in it
        x = -0.4 + i * 0.2
        box(x - 0.08, x + 0.08, 0.05, 0.38 + (i % 2) * 0.06, -0.3, 0.36, top=L, tlabel=[(i * 0.2, 0.3), (i * 0.2 + 0.2, 0.3), (i * 0.2 + 0.2, 0.6), (i * 0.2, 0.6)])


def pk_kit():
    box(-0.48, 0.48, 0, 0.7, -0.48, 0.48)
    box(-0.5, 0.5, 0.3, 1.0, -0.5, 0.5, front=L, top=L, flabel=[(0, 0.0), (1, 0.0), (1, 1), (0, 1)])


def pk_carton():
    box(-0.5, 0.5, 0, 0.97, -0.5, 0.5, front=L)
    for z0, z1 in ((-0.5, -0.01), (0.01, 0.5)): box(-0.49, 0.49, 0.97, 0.995, z0, z1)  # the two top flaps
    box(-0.5, 0.5, 0.995, 1.0, -0.06, 0.06)  # tape


def pk_can():
    P = lambda r, a, y: (r * math.cos(a), -r * math.sin(a), y)
    n = 12
    prof = [(0.4, 0.0), (0.5, 0.05), (0.5, 0.92), (0.44, 0.97), (0.47, 1.0), (0.42, 1.0), (0.4, 0.985)]
    band = (1, 2)  # the label band: between profile points 1 and 2
    for j in range(len(prof) - 1):
        (r0, y0), (r1, y1) = prof[j], prof[j + 1]
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            lab = j == band[0]
            us = [(i / n, 0), ((i + 1) / n, 0), ((i + 1) / n, 1), (i / n, 1)]
            quad(P(r0, a0, y0), P(r0, a1, y0), P(r1, a1, y1), P(r1, a0, y1), L if lab else E, us)
    face([P(0.4, -2 * math.pi * i / n, 0.0) for i in range(n)], E)  # bottom
    face([P(0.4, 2 * math.pi * i / n, 0.985) for i in range(n)], E)  # the recessed lid
    bm.verts.ensure_lookup_table()


def pk_news():
    box(-0.5, 0.42, 0, 1.0, -0.5, 0.5, top=L, tlabel=[(0, 0), (1, 0), (1, 1), (0, 1)])
    for k in range(4):  # the rounded fold
        a0, a1 = -math.pi / 2 + k * math.pi / 4, -math.pi / 2 + (k + 1) * math.pi / 4
        P = lambda a, z: (0.42 + 0.08 * math.cos(a), -z, 0.5 + 0.5 * math.sin(a))
        quad(P(a0, -0.5), P(a1, -0.5), P(a1, 0.5), P(a0, 0.5), E)


globals()[what]()
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new(what); bm.to_mesh(me)
o = bpy.data.objects.new(what, me); bpy.context.collection.objects.link(o)
for n in ('label', 'edge'): o.data.materials.append(MAT[n])
for p in me.polygons: p.use_smooth = False
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True)
print('ok', out, len(me.polygons))
