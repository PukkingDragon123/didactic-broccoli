"""Our own round-5 museum displays (hand-painted textures in r5_tex/, painted by r5_paint.py), built to size and converted by
lowpix like every other world model (art/lowpix/world/world.json, src = art/lowpix/world/made/<name>.glb).
Front = Blender -y = glTF / game +z.
    tools/blender.sh art/lowpix/world/made/r5_props.py -- <out.glb> <hinadan | pod2>
hinadan: a four-tier hina-dan (1.5 x 1.0 m): black-lacquered steps under a red mosen felt that runs over every tread and
  riser and hangs over the sides in folds; on the top tier a six-panel gold-leaf byobu with brass hinges and corners, the
  emperor and empress dolls (lofted robes, layered sleeves, painted faces, crown and ei, the empress's long hair and fan) and
  two bonbori lanterns; the tachibana and the cherry on the bottom tier, diamond rice cakes on their stands and lacquered
  tables at the ends of the middle tiers. Tier tops 0.25 / 0.5 / 0.75 (toys, 6 each, |x| < 0.55) and 0.95 (the dolls).
pod2: a retro space-capsule exhibit base (r 0.48, 0.30 high): a hazard-striped skirt, a riveted hull with a red
  STAR POD-7 band, four bolted portholes, four fins, a chrome rim with rivet heads, the turntable deck, and four chrome ribs arching
  over the glass dome (drawn in code) to a red beacon."""
import bpy, bmesh, sys, os, math, random
from mathutils import Vector, Matrix
H = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, H)
from common import setup, mat, finish
out, what = sys.argv[-2], sys.argv[-1]
TD = os.path.join(H, 'r5_tex')
random.seed(55); setup()
MS, parts = {}, []


def M(n):
    if n not in MS: MS[n] = mat(TD, n, 0.6, 0.0)
    return MS[n]


def obj(name, bm, mats):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    for m in mats: o.data.materials.append(M(m))
    parts.append(o); return o


def xform(bm, loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    S = Matrix.Diagonal(Vector(scale).to_4d()) if scale else Matrix.Identity(4)
    if scale: S[3][3] = 1
    R = Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X')
    bmesh.ops.transform(bm, matrix=Matrix.Translation(loc) @ R @ S, verts=bm.verts)


def box(sx, sy, sz, loc, mt, rot=(0, 0, 0), bev=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); uv = bm.loops.layers.uv.new()
    for f in bm.faces:
        n = f.normal; ax = (0, 2) if abs(n.y) > 0.5 else (1, 2) if abs(n.x) > 0.5 else (0, 1)
        for l in f.loops: l[uv].uv = (l.vert.co[ax[0]] + 0.5, l.vert.co[ax[1]] + 0.5)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bev: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bev, segments=2, profile=0.5, affect='EDGES')
    xform(bm, loc, rot)
    return obj('box', bm, [mt])


def lathe(prof, sides, loc, mt, rot=(0, 0, 0), caps=True, capmat=None, u_rep=1.0):
    bm = bmesh.new(); uv = bm.loops.layers.uv.new()
    L = [0.0]
    for i in range(1, len(prof)): L.append(L[-1] + math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]))
    tot = L[-1] or 1
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / sides), r * math.sin(2 * math.pi * k / sides), z)) for k in range(sides)] for r, z in prof]
    names = [mt] + ([capmat] if capmat and capmat != mt else [])
    for i in range(len(prof) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            for l, (uu, vv) in zip(f.loops, ((k, L[i]), (k + 1, L[i]), (k + 1, L[i + 1]), (k, L[i + 1]))): l[uv].uv = (uu / sides * u_rep, vv / tot)
    if caps:
        for i, flip in ((0, True), (len(prof) - 1, False)):
            r = prof[i][0]
            if r <= 1e-5: continue
            f = bm.faces.new(rings[i][::-1] if flip else rings[i]); f.material_index = names.index(capmat) if capmat else 0
            for l in f.loops: l[uv].uv = (0.5 + l.vert.co.x / (2 * r), 0.5 + l.vert.co.y / (2 * r))
    xform(bm, loc, rot)
    return obj('lathe', bm, names)


def frame(T, up=Vector((0, 0, 1))):
    B = up - T * up.dot(T)
    if B.length < 1e-6: B = Vector((0, 1, 0)) - T * T.y
    B.normalize(); N = T.cross(B).normalized()
    return N, B


def sweep(pts, rx, ry, mt, sides=12, caps=True, capmat=None, drop=0.0, vflip=False, up=Vector((0, 0, 1))):
    """An elliptical tube along pts; rx / ry: radius per point (lists or numbers); drop: the section hangs down by drop*ry."""
    pts = [Vector(p) for p in pts]; n = len(pts)
    rx = rx if isinstance(rx, (list, tuple)) else [rx] * n; ry = ry if isinstance(ry, (list, tuple)) else [ry] * n
    bm = bmesh.new(); uv = bm.loops.layers.uv.new(); rings = []
    for i, p in enumerate(pts):
        T = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized(); N, B = frame(T, up)
        rings.append([bm.verts.new(p + N * math.cos(2 * math.pi * k / sides) * rx[i] + B * (math.sin(2 * math.pi * k / sides) - drop) * ry[i]) for k in range(sides)])
    names = [mt] + ([capmat] if capmat and capmat != mt else [])
    for i in range(n - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            v0, v1 = i / (n - 1), (i + 1) / (n - 1)
            if vflip: v0, v1 = 1 - v0, 1 - v1
            for l, (uu, vv) in zip(f.loops, ((k / sides, v0), ((k + 1) / sides, v0), ((k + 1) / sides, v1), (k / sides, v1))): l[uv].uv = (uu, vv)
    if caps:
        for ring in (rings[0][::-1], rings[-1]):
            f = bm.faces.new(ring); f.material_index = names.index(capmat) if capmat else 0
            for l in f.loops: l[uv].uv = (0.5, 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj('sweep', bm, names)


def spline(ctrl, n=8):
    P = [Vector(c) for c in ctrl]; P = [P[0]] + P + [P[-1]]; o = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n; o.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    o.append(P[-2]); return o


def loft(sections, mt, sides=18, p=2.6, u_rep=3.0, cap_bottom=True):
    """A lofted body: sections = [(z, a, b, cy)] superellipse rings (half-width a in x, half-depth b in y, centre y cy)."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new(); rings = []
    for z, a, b, cy in sections:
        ring = []
        for k in range(sides):
            t = 2 * math.pi * k / sides; c, s = math.cos(t), math.sin(t)
            ring.append(bm.verts.new((a * math.copysign(abs(c) ** (2 / p), c), cy + b * math.copysign(abs(s) ** (2 / p), s), z)))
        rings.append(ring)
    zs = [s[0] for s in sections]; zt = (zs[-1] - zs[0]) or 1
    for i in range(len(rings) - 1):
        for k in range(sides):
            f = bm.faces.new((rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]))
            for l, (uu, vv) in zip(f.loops, ((k, zs[i]), (k + 1, zs[i]), (k + 1, zs[i + 1]), (k, zs[i + 1]))): l[uv].uv = (uu / sides * u_rep, (vv - zs[0]) / zt * u_rep * 0.6)
    for ring, flip in ((rings[0], True), (rings[-1], False)):
        if ring is rings[0] and not cap_bottom: continue
        f = bm.faces.new(ring[::-1] if flip else ring)
        for l in f.loops: l[uv].uv = (0.5 + l.vert.co.x * 4, 0.5 + l.vert.co.y * 4)
    return obj('loft', bm, [mt])


def ovoid(c, r, mt, sub=2, cut=None, face=False, jitter=0.0):
    """A deformed icosphere (head, hair mass, leaf clump); cut(lx, ly, lz) -> True drops a face; face: front planar UVs."""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0); uv = bm.loops.layers.uv.new()
    if jitter:
        for v in bm.verts: v.co *= 1 + random.uniform(-jitter, jitter)
    if cut:
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if cut(*f.calc_center_median())], context='FACES')
    for f in bm.faces:
        for l in f.loops:
            x, y, z = l.vert.co
            l[uv].uv = (x * 0.5 + 0.5, z * 0.5 + 0.5) if face else (math.atan2(y, x) / 6.283 + 0.5, z * 0.5 + 0.5)
    xform(bm, c, scale=r)
    return obj('ovoid', bm, [mt])


# ====================================================================================================== the hina-dan
if what == 'hinadan':
    W = 1.5
    TIERS = [(-0.5, -0.25, 0.25), (-0.25, 0.0, 0.5), (0.0, 0.25, 0.75), (0.25, 0.5, 0.95)]
    for y0, y1, top in TIERS: box(W - 0.01, y1 - y0 - 0.004, top - 0.004, (0, (y0 + y1) / 2, (top - 0.004) / 2), 'hd_lacquer')
    # the mosen: one sheet over every riser and tread, its sides hanging over the steps in folds
    o, l = 0.005, 0.003
    prof = [(-0.5 - o, 0.0), (-0.5 - o, 0.25 + l)]
    for (y0, y1, top), nxt in zip(TIERS, TIERS[1:] + [None]):
        if nxt: prof += [(nxt[0] - o, top + l), (nxt[0] - o, nxt[2] + l)]
        else: prof += [(y1 + o, top + l), (y1 + o, top - 0.1)]
    seg = []                                                                                 # (y, z, kind) sampled along the profile
    for (ya, za), (yb, zb) in zip(prof, prof[1:]):
        Ls = math.hypot(yb - ya, zb - za); n = max(2, int(Ls / 0.03)); kind = 't' if abs(yb - ya) > abs(zb - za) else 'r'
        for k in range(n): t = k / n; seg.append((ya + (yb - ya) * t, za + (zb - za) * t, kind))
    seg.append((prof[-1][0], prof[-1][1], 'r'))
    E = 0.14
    us = sorted(set([round(-W / 2 + W * i / 24, 4) for i in range(25)] + [round(s * (W / 2 + E * k / 7), 4) for s in (-1, 1) for k in range(1, 8)]))
    bm = bmesh.new(); uv = bm.loops.layers.uv.new(); rows = []; sacc = 0.0; prev = None
    for j, (y, z, kind) in enumerate(seg):
        if prev: sacc += math.hypot(y - prev[0], z - prev[1])
        prev = (y, z); row = []
        for u in us:
            e = abs(u) - W / 2; s = 1 if u > 0 else -1
            if e <= 1e-6: p = (u, y, z)
            elif kind == 't':
                k = min(1.0, e / 0.05)
                fold = (0.004 + 0.008 * (0.5 + 0.5 * math.sin(y * 55 + s * 1.3))) * k
                p = (s * (W / 2 + 0.004 + fold), y, z - e * (1 + 0.12 * math.sin(y * 37 + s)))
            else: p = (s * (W / 2 + 0.004), y, z)
            row.append((bm.verts.new(p), u, sacc))
        rows.append(row)
    for j in range(len(rows) - 1):
        for i in range(len(us) - 1):
            a, b, c, d = rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]
            try: f = bm.faces.new((a[0], b[0], c[0], d[0]))
            except ValueError: continue
            for lp, q in zip(f.loops, (a, b, c, d)): lp[uv].uv = (q[1] / 0.5, q[2] / 0.5)
    obj('mosen', bm, ['hd_mosen'])
    TOP = 0.953
    # the gold byobu: six panels zig-zagging behind the dolls, lacquered frames, brass hinges and corners
    n, pw, ph, a = 6, 0.165, 0.42, math.radians(22)
    x = -n * pw * math.cos(a) / 2; yb = 0.445
    for i in range(n):
        ang = a if i % 2 == 0 else -a; cx = x + pw * math.cos(a) / 2
        box(pw - 0.014, 0.01, ph - 0.026, (cx, yb, TOP + ph / 2), 'hd_gold', rot=(0, 0, ang))
        for dz in (0.007, ph - 0.007): box(pw, 0.016, 0.014, (cx, yb, TOP + dz), 'hd_lacquer', rot=(0, 0, ang))
        for e in (-1, 1):
            ex = cx + e * (pw / 2 - 0.007) * math.cos(ang); ey = yb + e * (pw / 2 - 0.007) * math.sin(ang)
            box(0.014, 0.016, ph, (ex, ey, TOP + ph / 2), 'hd_lacquer', rot=(0, 0, ang))
            for dz in (0.012, ph - 0.012): box(0.018, 0.02, 0.022, (ex, ey, TOP + dz), 'hd_brass', rot=(0, 0, ang))
        if i < n - 1:                                                                         # the hinge plates between panels
            hx = x + pw * math.cos(a); hy = yb + (pw / 2) * math.sin(a) * (1 if i % 2 == 0 else -1)   # the shared stile
            for dz in (0.08, ph / 2, ph - 0.08): box(0.012, 0.024, 0.03, (hx, hy, TOP + dz), 'hd_brass')
        x += pw * math.cos(a)

    def doll(cx, cy, cz, empress):
        s = 1.0
        if empress:
            body = [(0.0, 0.11, 0.08, -0.004), (0.016, 0.112, 0.082, -0.004), (0.045, 0.094, 0.068, 0.0), (0.08, 0.072, 0.05, 0.006), (0.104, 0.058, 0.04, 0.01), (0.117, 0.044, 0.031, 0.012), (0.126, 0.015, 0.013, 0.012)]
            robe = 'hd_robe_f'
        else:
            body = [(0.0, 0.096, 0.07, -0.004), (0.015, 0.1, 0.072, -0.004), (0.045, 0.088, 0.062, 0.0), (0.08, 0.07, 0.048, 0.006), (0.105, 0.058, 0.04, 0.01), (0.118, 0.045, 0.032, 0.012), (0.126, 0.016, 0.014, 0.012)]
            robe = 'hd_robe_m'
        o = loft([(cz + z, a_, b, cy + c) for z, a_, b, c in body], robe); o.location.x = cx
        for sx in (-1, 1):                                                                   # the wide sleeves, the hands meeting in front
            pts = spline([(cx + sx * 0.046, cy + 0.006, cz + 0.112), (cx + sx * 0.078, cy - 0.016, cz + 0.082), (cx + sx * 0.062, cy - 0.058, cz + 0.064), (cx + sx * 0.018, cy - 0.078, cz + 0.07)], 4)
            m = len(pts); k = [i / (m - 1) for i in range(m)]
            sweep(pts, [0.016 + 0.012 * t for t in k], [0.02 + (0.03 if empress else 0.024) * t for t in k], robe, sides=10, capmat='hd_white', drop=0.35, vflip=True)
        hz = cz + 0.152
        ovoid((cx, cy + 0.006, hz), (0.024, 0.022, 0.029), 'hd_face', face=True)          # the face (painted)
        ovoid((cx, cy + 0.009, hz + 0.003), (0.0265, 0.025, 0.031), 'hd_hair', cut=lambda x, y, z: y < -0.2 and z < 0.5)   # hair over the back and top
        if empress:
            for sx in (-1, 1): ovoid((cx + sx * 0.026, cy + 0.008, hz - 0.004), (0.011, 0.016, 0.02), 'hd_hair')       # the puffed sides
            sweep(spline([(cx, cy + 0.024, hz + 0.004), (cx, cy + 0.05, hz - 0.06), (cx, cy + 0.07, cz + 0.02)], 4), [0.018, 0.016, 0.014, 0.012, 0.01, 0.009, 0.008, 0.008, 0.008], 0.008, 'hd_hair', sides=8)
            box(0.032, 0.004, 0.012, (cx, cy - 0.006, hz + 0.03), 'hd_brass')                # the crown
            for sx in (-1, 0, 1): box(0.003, 0.003, 0.016, (cx + sx * 0.012, cy - 0.006, hz + 0.044), 'hd_brass')
            fan = bmesh.new(); fuv = fan.loops.layers.uv.new(); c0 = fan.verts.new((0, 0, 0)); rim = []
            for k in range(9):
                t = -0.9 + 1.8 * k / 8; rim.append(fan.verts.new((math.sin(t) * 0.05, 0, math.cos(t) * 0.05)))
            for k in range(8):
                f = fan.faces.new((c0, rim[k + 1], rim[k]))
                for lp, q in zip(f.loops, ((0.5, 0), ((k + 1) / 8, 1), (k / 8, 1))): lp[fuv].uv = q
            xform(fan, (cx, cy - 0.09, cz + 0.07), rot=(-0.3, 0, 0)); obj('fan', fan, ['hd_fan'])
        else:
            lathe([(0.0001, 0.0), (0.019, 0.0), (0.017, 0.012), (0.008, 0.02), (0.0001, 0.021)], 12, (cx, cy + 0.004, hz + 0.026), 'hd_lacquer')   # the kanmuri
            lathe([(0.0001, 0.0), (0.008, 0.0), (0.007, 0.02), (0.0001, 0.022)], 10, (cx, cy + 0.016, hz + 0.034), 'hd_lacquer')                  # its raised back
            sweep(spline([(cx, cy + 0.02, hz + 0.05), (cx, cy + 0.03, hz + 0.09), (cx, cy + 0.045, hz + 0.13)], 4), 0.008, 0.0016, 'hd_lacquer', sides=8, up=Vector((0, 1, 0)))   # the ei, standing up behind
            box(0.008, 0.004, 0.062, (cx, cy - 0.084, cz + 0.088), 'hd_wood', rot=(-0.25, 0, 0))   # the shaku

    doll(-0.12, 0.33, TOP, False)
    doll(0.12, 0.33, TOP, True)
    for sx in (-1, 1):                                                                       # bonbori lanterns flanking the pair
        bx, by = sx * 0.4, 0.33
        lathe([(0.0001, 0.0), (0.036, 0.0), (0.03, 0.01), (0.01, 0.016), (0.0001, 0.016)], 14, (bx, by, TOP), 'hd_lacquer')
        lathe([(0.0045, 0.016), (0.0045, 0.12)], 8, (bx, by, TOP), 'hd_lacquer', caps=False)
        lathe([(0.03, 0.12), (0.036, 0.135), (0.037, 0.165), (0.033, 0.19), (0.027, 0.2)], 14, (bx, by, TOP), 'hd_bonbori', caps=False)
        lathe([(0.0001, 0.112), (0.031, 0.112), (0.031, 0.122), (0.0001, 0.122)], 14, (bx, by, TOP), 'hd_lacquer')
        lathe([(0.0001, 0.197), (0.03, 0.197), (0.03, 0.205), (0.012, 0.212), (0.004, 0.226), (0.0001, 0.228)], 14, (bx, by, TOP), 'hd_lacquer')
    # the tachibana (viewer's left) and the cherry (right) at the ends of the bottom tier
    for sx, leaf in ((-1, 'hd_tachibana'), (1, 'hd_sakura')):
        tx, ty, tz = sx * 0.64, -0.375, 0.253
        lathe([(0.0001, 0.0), (0.03, 0.0), (0.036, 0.03), (0.04, 0.038), (0.04, 0.044), (0.0001, 0.044)], 6, (tx, ty, tz), 'hd_lacquer')
        lathe([(0.041, 0.036), (0.041, 0.046), (0.036, 0.046)], 6, (tx, ty, tz), 'hd_brass', caps=False)
        sweep(spline([(tx, ty, tz + 0.04), (tx + 0.008, ty, tz + 0.09), (tx - 0.004, ty, tz + 0.13)], 3), [0.007, 0.006, 0.006, 0.005, 0.004, 0.004, 0.003], [0.007, 0.006, 0.006, 0.005, 0.004, 0.004, 0.003], 'hd_wood', sides=6)
        for dx, dz, r in ((0, 0.16, 0.045), (-0.03, 0.135, 0.032), (0.032, 0.14, 0.033), (0.005, 0.195, 0.03)):
            ovoid((tx + dx, ty + random.uniform(-0.01, 0.01), tz + dz), (r, r * 0.9, r * 0.8), leaf, sub=2, jitter=0.12)
    # diamond rice cakes on their stands (middle tier) and lacquered tables with bowls (upper toy tier)
    def rhomb(cx, cy, cz, w, d, h, mt, vband=None):
        bm2 = bmesh.new(); u2 = bm2.loops.layers.uv.new()
        ring = [(0, -d / 2), (w / 2, 0), (0, d / 2), (-w / 2, 0)]
        lo = [bm2.verts.new((cx + x_, cy + y_, cz)) for x_, y_ in ring]; hi = [bm2.verts.new((cx + x_, cy + y_, cz + h)) for x_, y_ in ring]
        fs = [bm2.faces.new(lo[::-1]), bm2.faces.new(hi)] + [bm2.faces.new((lo[k], lo[(k + 1) % 4], hi[(k + 1) % 4], hi[k])) for k in range(4)]
        for f in fs:
            for lp in f.loops: lp[u2].uv = (0.5, vband) if vband is not None else ((lp.vert.co.x - cx) / w + 0.5, (lp.vert.co.z - cz) / max(h, 1e-3))
        obj('rhomb', bm2, [mt])
    for sx in (-1, 1):
        hx, hy, hz = sx * 0.64, -0.125, 0.503
        rhomb(hx, hy, hz, 0.1, 0.07, 0.03, 'hd_lacquer')
        for k, vb in enumerate((0.17, 0.5, 0.83)): rhomb(hx, hy, hz + 0.03 + k * 0.009, 0.088, 0.062, 0.008, 'hd_mochi', vband=vb)
        zx, zy, zz = sx * 0.64, 0.125, 0.753
        box(0.09, 0.08, 0.008, (zx, zy, zz + 0.034), 'hd_lacquer', bev=0.002)
        for lx in (-1, 1):
            for ly in (-1, 1): box(0.008, 0.008, 0.03, (zx + lx * 0.037, zy + ly * 0.032, zz + 0.015), 'hd_lacquer')
        for bx_ in (-0.02, 0.02): lathe([(0.0001, 0.0), (0.008, 0.0), (0.014, 0.012), (0.013, 0.014), (0.0001, 0.01)], 10, (zx + bx_, zy, zz + 0.038), 'hd_lacquer')
    finish(parts, out, smooth=False)

# ====================================================================================================== the space pod
elif what == 'pod2':
    Rr = 0.48
    lathe([(0.0001, 0.0), (0.47, 0.0), (0.47, 0.05), (0.46, 0.06)], 48, (0, 0, 0), 'sp2_skirt', caps=False, u_rep=6)
    lathe([(0.46, 0.06), (0.48, 0.075), (0.48, 0.255), (0.465, 0.27)], 48, (0, 0, 0), 'sp2_hull', caps=False)
    lathe([(0.465, 0.27), (0.474, 0.278), (0.474, 0.296), (0.44, 0.3)], 48, (0, 0, 0), 'sp2_chrome', caps=False, u_rep=8)
    lathe([(0.44, 0.296), (0.44, 0.301)], 48, (0, 0, 0), 'sp2_deck', caps=True, capmat='sp2_deck')
    for k in range(32):                                                                       # rivet heads round the rim
        a = 2 * math.pi * k / 32
        lathe([(0.0001, 0.0), (0.006, 0.0), (0.004, 0.004), (0.0001, 0.005)], 6, (math.cos(a) * 0.476, math.sin(a) * 0.476, 0.286), 'sp2_chrome', rot=(0, math.pi / 2, a))
    for k in range(4):                                                                        # bolted portholes on the band
        a = 2 * math.pi * k / 4
        rot = (math.pi / 2, 0, a + math.pi / 2)
        c = Vector((math.cos(a) * 0.478, math.sin(a) * 0.478, 0.165))
        ring = lathe([(0.034, 0.0), (0.046, 0.0), (0.048, 0.008), (0.04, 0.014), (0.034, 0.012)], 20, (0, 0, 0), 'sp2_chrome', caps=False)
        glass = lathe([(0.0001, 0.006), (0.035, 0.006)], 20, (0, 0, 0), 'sp2_port', caps=True, capmat='sp2_port')
        for o_ in (ring, glass):
            o_.rotation_euler = (0, math.pi / 2, a); o_.location = c
        for b in range(8):
            t = 2 * math.pi * b / 8; v = Vector((0, math.cos(t) * 0.041, math.sin(t) * 0.041))
            v.rotate(Matrix.Rotation(a, 3, 'Z'))
            lathe([(0.0001, 0.0), (0.0035, 0.0), (0.0025, 0.004), (0.0001, 0.0045)], 6, tuple(c + Vector((math.cos(a), math.sin(a), 0)) * 0.012 + v), 'sp2_chrome', rot=(0, math.pi / 2, a))
    for k in range(4):                                                                        # four stubby fins (between the portholes)
        a = 2 * math.pi * k / 4 + math.pi / 4
        bm = bmesh.new(); uv = bm.loops.layers.uv.new()
        prof = [(0.45, 0.0), (0.6, 0.0), (0.6, 0.03), (0.47, 0.17), (0.45, 0.17)]
        lo = [bm.verts.new((r, -0.012, z)) for r, z in prof]; hi = [bm.verts.new((r, 0.012, z)) for r, z in prof]
        fs = [bm.faces.new(lo), bm.faces.new(hi[::-1])] + [bm.faces.new((lo[i], hi[i], hi[(i + 1) % 5], lo[(i + 1) % 5])) for i in range(5)]
        for f in fs:
            for lp in f.loops: lp[uv].uv = (lp.vert.co.x * 2, lp.vert.co.z * 4)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        xform(bm, rot=(0, 0, a)); obj('fin', bm, ['sp2_skirt'])
    for k in range(4):                                                                        # chrome ribs arching over the dome
        a = 2 * math.pi * k / 4 + math.pi / 4
        pts = [(math.cos(a) * 0.472 * math.cos(t), math.sin(a) * 0.472 * math.cos(t), 0.3 + 0.472 * math.sin(t)) for t in [i / 16 * (math.pi / 2 - 0.06) for i in range(17)]]
        sweep(pts, 0.008, 0.008, 'sp2_chrome', sides=6, caps=True)
    lathe([(0.0001, 0.76), (0.05, 0.76), (0.05, 0.775), (0.03, 0.79), (0.0001, 0.79)], 16, (0, 0, 0), 'sp2_chrome')
    lathe([(0.0001, 0.79), (0.02, 0.79), (0.02, 0.81), (0.014, 0.825), (0.0001, 0.83)], 12, (0, 0, 0), 'sp2_beacon')
    lathe([(0.002, 0.83), (0.002, 0.9), (0.0001, 0.905)], 6, (0.0, 0.0, 0.0), 'sp2_chrome')
    finish(parts, out, smooth=False)
