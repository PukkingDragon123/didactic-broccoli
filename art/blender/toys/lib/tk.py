"""Modelling kit for the Blender toy line (headless bpy, tools/blender.sh).

Units: 1 Blender unit = 1 mm. Z is up, the figure stands on z = 0 and faces -Y (glTF +Z after export).
Every object keeps an identity transform: its vertices are in figure (world) coordinates, so baked object-space maps
are figure-space maps and rig parenting only has to add the parent inverse.

Forms are built as cages for subdivision surface modelling: lofts of superellipse sections along a spine (bodies,
limbs, snouts, tails), lathes (anything turned), bevelled boxes and outline slabs (hard-surface parts). The same cage
gives both meshes of a part: the game mesh (subdivision level 1, then decimated to its budget) and the sculpt
(level 3 or more, plus displacement detail, creases and booleans) that is baked onto it.
"""
import math

import bpy  # (first: it provides bmesh and mathutils)
import bmesh
import numpy as np
from mathutils import Matrix, Vector


# ------------------------------------------------------------------ scene and objects
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = 'NONE'
    s.render.fps = 30
    return s


def link(ob):
    bpy.context.scene.collection.objects.link(ob)
    return ob


def from_bm(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def from_pydata(name, V, F):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in V], [], [tuple(int(i) for i in f) for f in F])
    me.validate()
    me.update()
    ob = link(bpy.data.objects.new(name, me))
    fix_normals(ob)
    return ob


def fix_normals(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def copy(ob, name):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = name
    c.data.name = name
    c.modifiers.clear()
    return link(c)


def delete(ob):
    me = ob.data
    bpy.data.objects.remove(ob, do_unlink=True)
    if me and me.users == 0:
        bpy.data.meshes.remove(me)


def apply(ob):
    """Apply every modifier (evaluated mesh swap: no operator context needed)."""
    if not ob.modifiers:
        return ob
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    me.name = ob.name
    if old.users == 0:
        bpy.data.meshes.remove(old)
    return ob


def subsurf(ob, levels, keep_corners=False):
    if levels <= 0:
        return ob
    m = ob.modifiers.new('sub', 'SUBSURF')
    m.levels = m.render_levels = levels
    m.quality = 3
    m.use_creases = True
    m.boundary_smooth = 'PRESERVE_CORNERS' if keep_corners else 'ALL'
    return apply(ob)


def decimate(ob, tris):
    """Collapse-decimate to about `tris` triangles (a smooth subdivided mesh keeps its form). In facet mode (lib/facet.py)
    the target is the faceted budget instead (about facet.RATIO of it, symmetric, slivers merged)."""
    import facet
    if facet.ON:
        return facet.reduce(ob, facet.budget(tris), cap=facet.cap(tris))
    n = tri_count(ob)
    if n <= tris:
        return ob
    m = ob.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = tris / n
    m.use_collapse_triangulate = True
    return apply(ob)


def triangulate(ob):
    m = ob.modifiers.new('tri', 'TRIANGULATE')
    m.quad_method = 'BEAUTY'
    m.ngon_method = 'BEAUTY'
    return apply(ob)


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def smooth(ob, sharp_angle=None):
    me = ob.data
    me.shade_smooth()
    if sharp_angle is not None:
        me.set_sharp_from_angle(angle=math.radians(sharp_angle))
    return ob


def join(obs, name=None):
    """Join objects into the first one."""
    obs = [o for o in obs if o]
    base = obs[0]
    flag = any(o.get('facet') for o in obs)  # (facet mode: already reduced, lib/facet.py)
    keep = any(o.get('facet_keep') for o in obs)
    if len(obs) > 1:
        bm = bmesh.new()
        for o in obs:
            bm.from_mesh(o.data)  # (identity transforms: no matrix to apply)
        # keep material slots: map by name
        names = []
        for o in obs:
            for s in o.material_slots:
                if s.material and s.material.name not in names:
                    names.append(s.material.name)
        me = bpy.data.meshes.new(name or base.name)
        bm.to_mesh(me)
        bm.free()
        # re-derive material indices per source object
        idx = []
        for o in obs:
            local = [names.index(s.material.name) if s.material else 0 for s in o.material_slots] or [0]
            idx += [local[p.material_index] if p.material_index < len(local) else 0 for p in o.data.polygons]
        for n in names:
            me.materials.append(bpy.data.materials[n])
        if names:
            me.polygons.foreach_set('material_index', np.array(idx, dtype=np.int32))
        old = base.data
        base.data = me
        for o in obs[1:]:
            delete(o)
        if old.users == 0:
            bpy.data.meshes.remove(old)
    if flag:
        base['facet'] = 1
    if keep:
        base['facet_keep'] = 1
    if name:
        base.name = name
        base.data.name = name
    return base


# ------------------------------------------------------------------ vertex access and sculpt deformations
def verts(ob):
    a = np.zeros(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('co', a)
    return a.reshape(-1, 3)


def set_verts(ob, V):
    ob.data.vertices.foreach_set('co', np.asarray(V, dtype=np.float64).reshape(-1))
    ob.data.update()


def vnormals(ob):
    a = np.zeros(len(ob.data.vertices) * 3)
    ob.data.vertices.foreach_get('normal', a)
    return a.reshape(-1, 3)


def deform(ob, fn):
    """Move vertices: fn(V (n,3)) -> V' (n,3)."""
    set_verts(ob, fn(verts(ob)))
    return ob


def push(ob, fn):
    """Sculpt along the vertex normals: fn(V, N) -> offset (n,) in mm (positive = out)."""
    V, N = verts(ob), vnormals(ob)
    set_verts(ob, V + N * np.asarray(fn(V, N))[:, None])
    return ob


def bump(V, c, r, h, sharp=2.0):
    """A smooth radial bump field: h at the centre c, 0 at distance r."""
    d = np.linalg.norm(V - np.asarray(c), axis=1) / r
    return h * np.clip(1 - d * d, 0, 1) ** sharp


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def transform(ob, M):
    ob.data.transform(M)
    ob.data.update()
    return ob


def move(ob, d):
    return transform(ob, Matrix.Translation(Vector(d)))


def rotate(ob, deg, axis, pivot=(0, 0, 0)):
    p = Vector(pivot)
    M = Matrix.Translation(p) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-p)
    return transform(ob, M)


def scale(ob, s, pivot=(0, 0, 0)):
    s = (s, s, s) if np.isscalar(s) else s
    p = Vector(pivot)
    M = Matrix.Translation(p) @ Matrix.Diagonal((*s, 1)) @ Matrix.Translation(-p)
    return transform(ob, M)


def mirror(ob, name, axis=0):
    """A mirrored copy (left / right parts that move on their own bones)."""
    c = copy(ob, name)
    s = [1, 1, 1]
    s[axis] = -1
    transform(c, Matrix.Diagonal((*s, 1)))
    fix_normals(c)
    return c


def crease(ob, pred, value=1.0):
    """Crease the edges whose midpoint (and the two vertex positions) pass pred(mid (n,3), a (n,3), b (n,3))."""
    me = ob.data
    V = verts(ob)
    E = np.zeros(len(me.edges) * 2, dtype=np.int64)
    me.edges.foreach_get('vertices', E)
    E = E.reshape(-1, 2)
    a, b = V[E[:, 0]], V[E[:, 1]]
    sel = pred((a + b) / 2, a, b)
    at = me.attributes.get('crease_edge') or me.attributes.new('crease_edge', 'FLOAT', 'EDGE')
    cur = np.zeros(len(me.edges))
    at.data.foreach_get('value', cur)
    cur[sel] = value
    at.data.foreach_set('value', cur)
    return ob


def boolean(ob, cutter, op='DIFFERENCE', keep=False, transfer=False):
    """transfer: the new faces from the cutter keep the cutter's own material (paint region), not the target's."""
    m = ob.modifiers.new('bool', 'BOOLEAN')
    m.operation = op
    m.solver = 'EXACT'
    m.object = cutter
    if transfer:
        m.material_mode = 'TRANSFER'
    apply(ob)
    if not keep:
        delete(cutter)
    return ob


# ------------------------------------------------------------------ lofts (superellipse sections along a spine)
def _rot(v, axis, ang):
    axis = axis / (np.linalg.norm(axis) + 1e-12)
    return v * math.cos(ang) + np.cross(axis, v) * math.sin(ang) + axis * np.dot(axis, v) * (1 - math.cos(ang))


def frames(P, up=(0, 0, 1), closed=False):
    """Parallel-transport frames along a polyline: tangents T and section 'up' vectors U."""
    P = np.asarray(P, float)
    n = len(P)
    T = np.zeros_like(P)
    T[0] = P[1] - P[0]
    T[-1] = P[-1] - P[-2]
    if n > 2:
        T[1:-1] = P[2:] - P[:-2]
    if closed:
        T[0] = P[1] - P[-1]
        T[-1] = P[0] - P[-2]
    T /= np.linalg.norm(T, axis=1)[:, None]
    up = np.asarray(up, float)
    u = up - T[0] * np.dot(up, T[0])
    if np.linalg.norm(u) < 1e-6:
        u = np.array([0, 1.0, 0]) - T[0] * T[0][1]
    u /= np.linalg.norm(u)
    U = [u]
    for i in range(1, n):
        ax = np.cross(T[i - 1], T[i])
        s = np.linalg.norm(ax)
        if s > 1e-9:
            u = _rot(u, ax, math.atan2(s, np.dot(T[i - 1], T[i])))
        u = u - T[i] * np.dot(u, T[i])
        u /= np.linalg.norm(u)
        U.append(u)
    U = np.array(U)
    if closed:  # spread the holonomy twist round the loop so the last ring meets the first one untwisted
        ax = np.cross(T[-1], T[0])
        s_ = np.linalg.norm(ax)
        u = U[-1] if s_ < 1e-9 else _rot(U[-1], ax, math.atan2(s_, np.dot(T[-1], T[0])))
        u = u - T[0] * np.dot(u, T[0])
        phi = math.atan2(np.dot(np.cross(u, U[0]), T[0]), np.dot(u, U[0]))
        for i in range(n):
            U[i] = _rot(U[i], T[i], phi * i / n)
    return T, U


def section(n, w, ht, hb=None, e=2.0, tw=1.0, bw=1.0, roll=0.0, shift=0.0):
    """Points (n, 2) of a superellipse section: width w, half-heights ht (top) / hb (bottom), exponent e (2 = ellipse,
    3-4 = boxy), tw / bw = width factor at the top / bottom (taper), shift = sideways shear of the top."""
    hb = ht if hb is None else hb
    a = np.linspace(0, 2 * math.pi, n, endpoint=False) + roll
    c, s = np.cos(a), np.sin(a)
    x = np.sign(c) * np.abs(c) ** (2 / e)
    y = np.sign(s) * np.abs(s) ** (2 / e)
    k = 1 + (tw - 1) * np.clip(y, 0, 1) + (bw - 1) * np.clip(-y, 0, 1)
    X = x * w / 2 * k + shift * np.clip(y, 0, 1)
    Y = np.where(y > 0, y * ht, y * hb)
    return np.stack([X, Y], 1)


def loft(name, rings, n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=None, spine=None, closed=False):
    """A closed form from sections along a spine.

    rings: list of dicts {c: centre (x, y, z), w: width, h: half-height (or ht / hb), e, tw, bw, roll, shift, twist}
    The section's x axis is width (perpendicular to the spine and to `up`), its y axis is `up` turned along the spine.
    cap: 'round' (a domed inset end), 'flat' (one n-gon), 'point' (a pole) or None (open)."""
    C = np.array([r['c'] for r in rings], float)
    T, U = frames(C if spine is None else spine, up, closed)
    W = np.cross(U, T)
    V, F = [], []
    for i, r in enumerate(rings):
        S = section(n, r['w'], r.get('ht', r.get('h')), r.get('hb'), r.get('e', 2.0), r.get('tw', 1.0), r.get('bw', 1.0),
                    math.radians(r.get('roll', 0.0)), r.get('shift', 0.0))
        tw = math.radians(r.get('twist', 0.0))
        w, u = W[i] * math.cos(tw) + U[i] * math.sin(tw), U[i] * math.cos(tw) - W[i] * math.sin(tw)
        for x, y in S:
            V.append(C[i] + w * x + u * y)
    m = len(rings)
    for i in range(m - 1 + (1 if closed else 0)):
        j = (i + 1) % m
        for k in range(n):
            a, b = i * n + k, i * n + (k + 1) % n
            F.append([a, b, j * n + (k + 1) % n, j * n + k])
    if closed:  # a ring (a wire loop): no caps
        return from_pydata(name, V, F)

    def cap(i, sgn, kind):
        if not kind:
            return
        ring = list(range(i * n, i * n + n))
        r = rings[i]
        d = capd if capd is not None else 0.32 * min(r['w'] / 2, r.get('ht', r.get('h')))
        if isinstance(kind, (int, float)):
            d = kind
            kind = 'round'
        if kind == 'flat':
            F.append(ring[::-1] if sgn < 0 else ring)
        elif kind == 'point':
            V.append(C[i] + T[i] * d * sgn * 1.8)
            p = len(V) - 1
            for k in range(n):
                F.append([ring[k], ring[(k + 1) % n], p])
        else:  # round: an inset ring pushed out, then a flat n-gon (subdivision domes it)
            base = len(V)
            for k in ring:
                V.append(C[i] + (V[k] - C[i]) * 0.62 + T[i] * d * sgn)
            inner = list(range(base, base + n))
            for k in range(n):
                F.append([ring[k], ring[(k + 1) % n], inner[(k + 1) % n], inner[k]])
            F.append(inner)

    cap(0, -1, cap0)
    cap(m - 1, 1, cap1)
    return from_pydata(name, V, F)


def tube(name, pts, radii, n=8, up=(0, 0, 1), e=2.0, cap0='round', cap1='round', squash=1.0, closed=False):
    """A limb / tail / stalk: a loft of round sections of radius radii[i] along pts (closed: a wire loop)."""
    radii = radii if hasattr(radii, '__len__') else [radii] * len(pts)
    rings = [{'c': p, 'w': 2 * r, 'h': r * squash, 'e': e} for p, r in zip(pts, radii)]
    spine = None
    if closed:  # tangents that wrap round the loop
        P = np.asarray(pts, float)
        spine = P
    return loft(name, rings, n=n, up=up, cap0=cap0, cap1=cap1, closed=closed, spine=spine)


def bisect(ob, co, no, keep='+', fill=True):
    """Cut a mesh with a plane (point co, normal no) and keep one side ('+' along the normal), filling the cut."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    geom = list(bm.verts) + list(bm.edges) + list(bm.faces)
    r = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(co), plane_no=Vector(no), clear_inner=keep == '+', clear_outer=keep != '+')
    if fill:
        edges = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
        if edges:
            bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def lathe(name, prof, n=16, axis='Z', centre=(0, 0, 0)):
    """A turned form: prof = [(r, z), ...] from bottom to top around the axis; r = 0 at an end closes it to a pole."""
    V, F = [], []
    rows = []
    for r, z in prof:
        if r <= 1e-6:
            V.append((0, 0, z))
            rows.append([len(V) - 1])
        else:
            row = []
            for k in range(n):
                a = 2 * math.pi * k / n
                V.append((r * math.cos(a), r * math.sin(a), z))
                row.append(len(V) - 1)
            rows.append(row)
    for a, b in zip(rows, rows[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for k in range(n):
                F.append([a[0], b[(k + 1) % n], b[k]])
        elif len(b) == 1:
            for k in range(n):
                F.append([a[k], a[(k + 1) % n], b[0]])
        else:
            for k in range(n):
                F.append([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
    if len(rows[0]) > 1:
        F.append(rows[0][::-1])
    if len(rows[-1]) > 1:
        F.append(rows[-1])
    ob = from_pydata(name, V, F)
    R = {'Z': Matrix.Identity(4), 'X': Matrix.Rotation(math.radians(90), 4, 'Y'), 'Y': Matrix.Rotation(math.radians(-90), 4, 'X')}[axis]
    transform(ob, Matrix.Translation(Vector(centre)) @ R)
    return ob


# ------------------------------------------------------------------ hard-surface pieces
def rbox(name, size, centre=(0, 0, 0), bevel=0.5, segs=3, profile=0.5):
    """A bevelled box (size x, y, z), rounded edges of radius `bevel` in `segs` segments."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2])) + Vector(centre)
    if bevel > 0 and segs > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, offset_type='OFFSET', segments=segs, profile=profile,
                        affect='EDGES', clamp_overlap=True)
    return from_bm(name, bm)


def slab(name, outline, depth, plane='XZ', at=0.0, bevel=0.4, segs=2, profile=0.5):
    """An outline (list of 2D points, counter-clockwise) extruded `depth` thick, centred on `at` along the plane's
    normal, with bevelled edges. plane 'XZ': outline in (x, z), thickness along y; 'XY': (x, y), thickness along z;
    'YZ': (y, z), thickness along x."""
    bm = bmesh.new()

    def P(u, v, w):
        return {'XZ': (u, w, v), 'XY': (u, v, w), 'YZ': (w, u, v)}[plane]
    vs = [bm.verts.new(P(u, v, at - depth / 2)) for u, v in outline]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)]
    d = Vector(P(0, 0, depth))
    for v in nv:
        v.co += d
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0 and segs > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, offset_type='OFFSET', segments=segs, profile=profile,
                        affect='EDGES', clamp_overlap=True)
    return from_bm(name, bm)


def circle_pts(r, n, c=(0, 0), a0=0.0, a1=360.0, closed=True):
    m = n if closed else n + 1
    return [(c[0] + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), c[1] + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(m)]


def cyl(name, r, z0, z1, n=16, at=(0, 0), axis='Z', bevel=0.3, segs=2):
    """A bevelled cylinder (pins, rivets, caps) along an axis through `at` (the other two coordinates)."""
    plane = {'Z': 'XY', 'Y': 'XZ', 'X': 'YZ'}[axis]
    ob = slab(name, circle_pts(r, n, at), z1 - z0, plane=plane, at=(z0 + z1) / 2, bevel=bevel, segs=segs)
    if axis == 'Y':  # the XZ plane maps (u, v, w) -> (u, w, v): thickness lies along y already
        pass
    return ob


# ------------------------------------------------------------------ materials as paint regions
def region_mat(name):
    m = bpy.data.materials.get('R:' + name)
    if not m:
        m = bpy.data.materials.new('R:' + name)
    return m


def clean_slots(ob):
    """Faces on an empty material slot (a boolean cutter's) go to the first real slot; empty slots are dropped."""
    me = ob.data
    mats = list(me.materials)
    if all(m is not None for m in mats):
        return ob
    keep = [m for m in mats if m is not None]
    idx = np.zeros(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get('material_index', idx)
    remap = []
    for m in mats:
        remap.append(keep.index(m) if m is not None else 0)
    new = np.array(remap, dtype=np.int32)[np.clip(idx, 0, len(mats) - 1)] if mats else idx
    me.materials.clear()
    for m in keep:
        me.materials.append(m)
    me.polygons.foreach_set('material_index', new)
    return ob


def set_region(ob, name):
    ob.data.materials.clear()
    ob.data.materials.append(region_mat(name))
    ob.data.polygons.foreach_set('material_index', np.zeros(len(ob.data.polygons), dtype=np.int32))
    return ob


def regions(ob, default, rules):
    """Paint regions per face: rules = [(name, pred(centres (n,3), normals (n,3)) -> bool (n,)), ...], later rules win."""
    me = ob.data
    names = [default] + [r[0] for r in rules]
    uniq = list(dict.fromkeys(names))
    me.materials.clear()
    for n in uniq:
        me.materials.append(region_mat(n))
    nP = len(me.polygons)
    C = np.zeros(nP * 3)
    N = np.zeros(nP * 3)
    me.polygons.foreach_get('center', C)
    me.polygons.foreach_get('normal', N)
    C, N = C.reshape(-1, 3), N.reshape(-1, 3)
    idx = np.zeros(nP, dtype=np.int32)
    for name, pred in rules:
        idx[np.asarray(pred(C, N), bool)] = uniq.index(name)
    me.polygons.foreach_set('material_index', idx)
    return ob


# ------------------------------------------------------------------ one cage -> game mesh + sculpt
def lowhigh(cage, name, lo=1, hi=3, tris=None, sculpt=None, region=None, keep_corners=False):
    """From one subdivision cage: the game mesh (subdivision `lo`, decimated to `tris`) and the sculpt (subdivision
    `hi`, then sculpt(high) for displacement detail). The cage is consumed. Returns (low, high)."""
    import facet
    if facet.ON:  # (the higher-resolution facet line: the game mesh collapses from one subdivision level finer)
        lo = min(lo + 1, hi)
    high = copy(cage, name + '_hi')
    subsurf(high, hi, keep_corners)
    if sculpt:
        sculpt(high)
    if region:
        set_region(high, region) if isinstance(region, str) else regions(high, region[0], region[1])
    low = cage
    low.name = name
    low.data.name = name
    subsurf(low, lo, keep_corners)
    if tris:
        decimate(low, tris)
    return low, high


def preview(path, objs=None, res=(640, 480), cam=((70, -90, 60), (0, 0, 12)), samples=12, lens=50):
    """A quick Cycles look at the model (grey clay or its material)."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = False
    if not sc.world:
        sc.world = bpy.data.worlds.new('w')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (0.42, 0.40, 0.38, 1)
    bg.inputs[1].default_value = 0.9
    cd = bpy.data.cameras.new('pcam')
    cd.lens = lens
    cam_ob = bpy.data.objects.new('pcam', cd)
    link(cam_ob)
    cam_ob.location = Vector(cam[0])
    d = Vector(cam[1]) - Vector(cam[0])
    cam_ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam_ob
    ld = bpy.data.lights.new('key', 'SUN')
    ld.energy = 3.2
    ld.angle = math.radians(8)
    lo = bpy.data.objects.new('key', ld)
    link(lo)
    lo.rotation_euler = (math.radians(50), math.radians(-20), math.radians(-35))
    hidden = []
    if objs is not None:
        keep = set(objs) | {cam_ob, lo}
        for o in sc.objects:
            if o not in keep and o.type in ('MESH', 'EMPTY'):
                hidden.append((o, o.hide_render))
                o.hide_render = True
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o, h in hidden:
        o.hide_render = h
    bpy.data.objects.remove(cam_ob)
    bpy.data.objects.remove(lo)


# ------------------------------------------------------------------ clean-up helpers (from agent C's kaden/_cx/cx.py)
def lowdec(o, name, tris, lo=1, hi=2, region=None, sculpt=None, keep_corners=False):
    """lowhigh + decimate in one go: (low decimated to `tris`, high)."""
    a, b = lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name, keep_corners=keep_corners)
    decimate(a, tris)
    return a, b


def drop_faces(ob, pred):
    """Delete the faces whose centre / normal pass pred(C (n,3), N (n,3)): surfaces buried inside another part (they
    would only take texels from what you see)."""
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    C = np.array([f.calc_center_median() for f in bm.faces])
    N = np.array([f.normal for f in bm.faces])
    kill = [f for f, k in zip(bm.faces, np.asarray(pred(C, N), bool)) if k]
    bmesh.ops.delete(bm, geom=kill, context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    return ob


def flat_bottom(ob, h=0.9):
    """Press the lowest `h` mm of a mesh flat onto the shelf (z = 0): a hem or a sole that subdivision rounded off
    stands on its whole footprint again."""
    V = verts(ob)
    V[:, 2] = np.where(V[:, 2] < h, 0.0, V[:, 2])
    set_verts(ob, V)
    return ob
