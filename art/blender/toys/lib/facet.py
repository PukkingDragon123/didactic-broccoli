"""FACETED LOW-POLY: the toy line's visible low-poly style (the owner's direction, art/blender/toys/FACET.md).

A figure built in facet mode keeps the same script (cages, sculpts, rig, gimmick clips) but its game mesh and paint
change at the lib level:
- geometry: every game mesh is a deliberate low-poly (symmetric collapse to about RATIO of the old budget, coplanar
  slivers merged), flat shaded (one normal per face: crisp facets), 300-700 tris a figure (900 for a complex secret);
- texture: one 1024 px colour atlas (double the old density), no normal map (it would smooth the facets away); the
  sculpt's AO and cavity are baked in, and the paint is laid as hand-painted brushwork: strokes that follow the form
  (Painter.fill brush presets), a lit rim / shadow line along the facet edges, soft rubbed wear on hard corners,
  hand-brushed ink faces (lib/face.py) and stippled blush.

Which figures: the series in SERIES, or GG_FACET=1 / GG_FACET=0 to force it on or off for one build.
"""
import math
import os

import bpy  # noqa: F401  (first: it provides bmesh and mathutils)
import bmesh
import numpy as np

SERIES = {'henshin'}            # the series built in the faceted style (add a series here to convert it on rebuild)
RATIO = float(os.environ.get('GG_FACET_RATIO', 0.42))  # game-mesh triangles kept from the old (smooth) budget
SIZE = 1024                     # atlas size (px): double the smooth line's 512
TRIS = (300, 700, 900)          # the figure's target range and the hard cap (a complex secret)
RIM_PX = 1.15                   # facet-edge rim width (texels)
RIM_DEG = 16.0                  # an edge turning more than this is a facet edge that gets a rim
ON = False                      # set by Fig() for the figure being built (tk.decimate reads it)


def enabled(series):
    v = os.environ.get('GG_FACET')
    if v is not None and v != '':
        return v not in ('0', 'no', 'off')
    return series in SERIES


# ------------------------------------------------------------------ geometry
def _symmetric(ob, tol=0.03):
    """Is the mesh mirror-symmetric across x = 0 (then it is decimated symmetrically)?"""
    from mathutils import kdtree
    me = ob.data
    n = len(me.vertices)
    if n < 6:
        return False
    V = np.zeros(n * 3)
    me.vertices.foreach_get('co', V)
    V = V.reshape(-1, 3)
    span = np.ptp(V, axis=0).max()
    if abs(V[:, 0].mean()) > 0.02 * span + 0.05:
        return False
    kd = kdtree.KDTree(n)
    for i, v in enumerate(V):
        kd.insert(v, i)
    kd.balance()
    t = max(tol, 0.004 * span)
    ok = sum(1 for v in V if kd.find((-v[0], v[1], v[2]))[2] < t)
    return ok >= 0.92 * n


def reduce(ob, tris):
    """Collapse the mesh to about `tris` triangles (symmetric across x = 0 when the part is), then merge the near-
    coplanar slivers that collapse leaves into clean planes and re-triangulate them (beauty)."""
    me = ob.data
    n = sum(len(p.vertices) - 2 for p in me.polygons)
    canon(ob)
    me = ob.data
    if n > tris:
        from mathutils.bvhtree import BVHTree
        bm0 = bmesh.new()
        bm0.from_mesh(me)
        bvh = BVHTree.FromBMesh(bm0)  # (the form before the collapse)
        m = ob.modifiers.new('fdec', 'DECIMATE')
        m.decimate_type = 'COLLAPSE'
        m.ratio = max(0.01, tris / n)
        m.use_collapse_triangulate = True
        if _symmetric(ob):
            m.use_symmetry = True
            m.symmetry_axis = 'X'
        V = np.zeros(len(me.vertices) * 3)
        ob.data.vertices.foreach_get('co', V)
        Z = V[2::3]
        if Z.min() < 0.3 and n > 80 and (Z < 0.6).mean() < 0.25:  # (it stands on the shelf: the collapse keeps the footprint, so it stands as well as before)
            g = ob.vertex_groups.new(name='facet_keep')
            g.add([int(i) for i in np.nonzero(Z >= 0.6)[0]], 1.0, 'REPLACE')
            m.vertex_group = g.name
            m.vertex_group_factor = 25.0
        _apply(ob)
        for g in list(ob.vertex_groups):
            if g.name == 'facet_keep':
                ob.vertex_groups.remove(g)
        # the collapse places merged vertices where the planes fit best (a little outside a curve, so the facets keep
        # the volume); one that overshoots further is pulled back to OUT mm off the form (clips keep working)
        OUT = 0.5
        for v in ob.data.vertices:
            loc, nrm, _, dist = bvh.find_nearest(v.co)
            if loc is not None and dist > OUT and (v.co - loc).dot(nrm) > 0:
                v.co = loc + (v.co - loc).normalized() * OUT
        bm0.free()
        ob.data.update()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.dissolve_degenerate(bm, dist=0.01, edges=bm.edges[:])
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(1.5), use_dissolve_boundaries=False, verts=bm.verts[:], edges=bm.edges[:])
    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method='BEAUTY', ngon_method='BEAUTY')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()
    ob['facet'] = 1
    if KEEP:
        ob['facet_keep'] = 1
    return ob


def canon(ob):
    """Rebuild the mesh with its vertices and faces in a canonical order (sorted by position, snapped to 0.1 um):
    subdivision and bevels are not repeatable from run to run, and the collapse breaks its ties by order, so without
    this the facets, the UVs and the bake cache would change every build."""
    me = ob.data
    V = np.zeros(len(me.vertices) * 3)
    me.vertices.foreach_get('co', V)
    V = np.round(V.reshape(-1, 3), 4)
    order = np.lexsort((V[:, 2], V[:, 1], V[:, 0]))
    rank = np.empty(len(order), np.int64)
    rank[order] = np.arange(len(order))
    F = []
    for p in me.polygons:
        f = [int(rank[i]) for i in p.vertices]
        k = f.index(min(f))
        F.append(f[k:] + f[:k])
    F.sort()
    mats = list(me.materials)
    new = bpy.data.meshes.new(me.name)
    new.from_pydata([tuple(v) for v in V[order]], [], F)
    new.validate()
    for m in mats:
        new.materials.append(m)
    ob.data = new
    if me.users == 0:
        bpy.data.meshes.remove(me)
    new.name = ob.name
    return ob


SMALL = 16                      # a piece asked for this few triangles is low-poly already: it keeps them
FIG = None                      # the figure being built (Fig sets it; rig.check_clip trims through it)


def budget(tris):
    """The facet target for a mesh the smooth line gave `tris` triangles (toes, tabs and pins keep theirs: cut further
    they only crumple)."""
    if tris <= SMALL or KEEP:
        return int(tris)
    return max(int(round(tris * RATIO)), SMALL)


KEEP = False


class keeping:
    """with facet.keeping(): ... -- the pieces built inside keep their smooth-line triangle counts (thin moving parts
    that would crumple: a compass's legs, a hinge pin), and the figure trim leaves them alone."""

    def __enter__(s):
        global KEEP
        KEEP = True

    def __exit__(s, *a):
        global KEEP
        KEEP = False


def trim(parts, top=None, log=print):
    """The figure's budget: when the parts still add up to more than TRIS[1] (many small pieces kept whole), reduce
    the bigger parts further, in proportion, to land just under it. Returns the new total."""
    top = top or TRIS[1]
    count = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)  # noqa: E731
    tot = sum(count(p.low) for p in parts)
    if tot <= top:
        return tot
    big = [p for p in parts if count(p.low) > 3 * SMALL and not p.low.get('facet_keep')]
    fixed = tot - sum(count(p.low) for p in big)
    k = max(0.3, (top * 0.97 - fixed) / max(1, tot - fixed))
    for p in big:
        reduce(p.low, max(3 * SMALL, int(count(p.low) * k)))
        flat(p.low)
    new = sum(count(p.low) for p in parts)
    log(f'facet: trimmed the figure from {tot} to {new} tris (bigger parts x{k:.2f})')
    return new


def flat(ob):
    ob.data.shade_flat()
    return ob


def _apply(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data
    ob.modifiers.clear()
    ob.data = me
    me.name = ob.name
    if old.users == 0:
        bpy.data.meshes.remove(old)


# ------------------------------------------------------------------ facet maps (per texel, from the game meshes)
def maps(parts, n, key=None):
    """Rasterise every game mesh's UV triangles: per texel the facet it lies on, the rim (+1 a lit edge highlight,
    -1 a shadow / crease line) along facet edges that turn more than RIM_DEG, the distance (texels) to the nearest
    hard convex edge (for wear) and the texel density (px per mm)."""
    key = np.array([-0.45, -0.62, 0.64]) if key is None else np.asarray(key, float)
    key = key / np.linalg.norm(key)
    fid = np.full((n, n), -1, np.int32)
    lpos = np.zeros((n, n, 3), np.float32)
    rim = np.zeros((n, n), np.int8)
    hard = np.full((n, n), 99.0, np.float32)
    ppmm = np.zeros((n, n), np.float32)
    base = 0
    for p in parts:
        bm = bmesh.new()
        bm.from_mesh(p.low.data)
        bm.faces.ensure_lookup_table()
        uvl = bm.loops.layers.uv.active
        bm.normal_update()
        for f in bm.faces:
            if len(f.verts) != 3:
                continue
            L = list(f.loops)
            uv = np.array([[l[uvl].uv.x * n - 0.5, l[uvl].uv.y * n - 0.5] for l in L])
            P3 = np.array([l.vert.co[:] for l in L])
            nf = np.array(f.normal[:])
            # each edge (opposite loop i's vertex): its signed turn angle (+ convex) and the neighbour's normal
            ang, nnb = [], []
            for i in range(3):
                e = L[(i + 1) % 3].edge  # the loop at i+1 starts the edge from vertex i+1 to i+2 (opposite i)
                o = [g for g in e.link_faces if g is not f]
                if not o:
                    ang.append(60.0)
                    nnb.append(-nf)
                    continue
                g = o[0]
                a = math.degrees(f.normal.angle(g.normal, 0.0))
                conv = (np.array(g.calc_center_median()[:]) - np.array(f.calc_center_median()[:])) @ nf < 1e-6
                ang.append(a if conv else -a)
                nnb.append(np.array(g.normal[:]))
            x0, y0 = np.floor(uv.min(0)).astype(int)
            x1, y1 = np.ceil(uv.max(0)).astype(int)
            x0, y0 = max(x0, 0), max(y0, 0)
            x1, y1 = min(x1, n - 1), min(y1, n - 1)
            if x1 < x0 or y1 < y0:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
            a, b, c = uv
            den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
            if abs(den) < 1e-9:
                continue
            l0 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den
            l1 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den
            l2 = 1 - l0 - l1
            ins = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
            if not ins.any():
                continue
            area_px = abs(den) / 2
            area_mm = f.calc_area()
            per = sum(np.linalg.norm(uv[(i + 1) % 3] - uv[i]) for i in range(3))
            roomy = 2 * area_px / max(per, 1e-9) > 2.6 * RIM_PX  # (a sliver of a face gets no rim: it would be all rim)
            dens = math.sqrt(area_px / max(area_mm, 1e-9))
            # distance (texels) to each edge: barycentric * the triangle's height over that edge
            lens = [np.linalg.norm(uv[(i + 2) % 3] - uv[(i + 1) % 3]) for i in range(3)]
            D = [lam * (2 * area_px / max(le, 1e-9)) for lam, le in zip((l0, l1, l2), lens)]
            yy, xx = ys[ins], xs[ins]
            fid[yy, xx] = base + f.index
            lpos[yy, xx] = l0[ins, None] * P3[0] + l1[ins, None] * P3[1] + l2[ins, None] * P3[2]
            ppmm[yy, xx] = dens
            r = np.zeros(yy.shape, np.int8)
            hd = np.full(yy.shape, 99.0, np.float32)
            lit = nf @ key
            for i in range(3):
                d = D[i][ins]
                if not roomy:
                    if ang[i] > 32:
                        hd = np.minimum(hd, d)
                    continue
                if ang[i] > RIM_DEG:
                    w = RIM_PX * (1.35 if ang[i] > 50 else 1.0)
                    near = d < w
                    if lit > 0.12:
                        r[near & (r == 0)] = 1
                    elif lit < -0.2 or nf[2] < -0.5:
                        r[near & (r == 0)] = -1
                    if ang[i] > 32:
                        hd = np.minimum(hd, d)
                elif ang[i] < -RIM_DEG:
                    r[(d < RIM_PX) & (r >= 0)] = -1
            rim[yy, xx] = r
            hard[yy, xx] = hd
        base += len(bm.faces)
        bm.free()
    return {'fid': fid, 'rim': rim, 'hard': hard, 'ppmm': ppmm, 'lpos': lpos}


def refill(maps, missed, got, keys=('ao', 'cav', 'on', 'reg', 'nrm')):
    """Texels whose bake rays missed the sculpt: their position is the game mesh's own surface (lpos), the rest is
    copied from the nearest well-baked texel in 3D (a texel-space fill smears them into streaks the brush picks up)."""
    from mathutils import kdtree
    bad = missed & got
    if not bad.any():
        return 0
    good = maps['mask'] & ~missed & got
    gy, gx = np.nonzero(good)
    step = max(1, len(gy) // 250000)
    gy, gx = gy[::step], gx[::step]
    kd = kdtree.KDTree(len(gy))
    for i, p in enumerate(maps['lpos'][gy, gx]):
        kd.insert(p, i)
    kd.balance()
    by, bx = np.nonzero(bad)
    near = np.array([kd.find(p)[1] for p in maps['lpos'][by, bx]])
    for k in keys:
        if k in maps:
            maps[k][by, bx] = maps[k][gy[near], gx[near]]
    maps['pos'][by, bx] = maps['lpos'][by, bx]
    return len(by)


# ------------------------------------------------------------------ brushwork (hand-painted strokes in figure space)
PRESETS = {
    # flow: the stroke direction on the surface; L / W: stroke length / width (mm); cover: how many layers of strokes;
    # p: the share of strokes that move the tone a step lighter (and as many darker); the rest only drag tone along
    'pvc': dict(flow='around', L=4.6, W=0.95, cover=1.2, p=0.1, tilt=12),
    'gloss': dict(flow='around', L=5.2, W=1.0, cover=1.1, p=0.09, tilt=10),
    'metal': dict(flow='down', L=4.5, W=0.45, cover=1.3, p=0.16, tilt=5),
    'fur': dict(flow='down', L=1.7, W=0.45, cover=1.8, p=0.32, tilt=28),
    'feather': dict(flow='down', L=2.4, W=0.5, cover=1.5, p=0.28, tilt=10),
    'wood': dict(flow='along', L=7.0, W=0.28, cover=1.5, p=0.3, tilt=3),
    'cloth': dict(flow='around', L=1.3, W=0.35, cover=1.7, p=0.3, tilt=4, cross=True),
    'lacquer': dict(flow='around', L=6.0, W=0.7, cover=1.0, p=0.12, tilt=8, shine=0.5),
}


def flow_dir(kind, P, N, axis=None):
    """Stroke directions (k, 3) at points P with surface normals N."""
    Z = np.array([0.0, 0.0, 1.0])
    if callable(kind):
        d = kind(P, N)
    elif kind == 'down':
        d = -Z - N * (N @ -Z)[:, None]
        alt = np.cross(N, [1.0, 0.0, 0.0])
        d = np.where((np.linalg.norm(d, axis=1) < 0.25)[:, None], alt, d)
    elif kind == 'along':
        a = np.array(axis if axis is not None else (0, 1, 0), float)
        d = a - N * (N @ a)[:, None]
        alt = np.cross(N, Z)
        d = np.where((np.linalg.norm(d, axis=1) < 0.25)[:, None], alt, d)
    else:  # around: horizontal, circling the form (the way a painter goes round a body)
        d = np.cross(Z, N)
        alt = np.cross(N, [1.0, 0.0, 0.0])
        d = np.where((np.linalg.norm(d, axis=1) < 0.25)[:, None], alt, d)
    return d / np.maximum(np.linalg.norm(d, axis=1), 1e-9)[:, None]


class Grid:
    """Texels bucketed by 3D cell, to find the texels near a stroke quickly."""

    def __init__(s, P3, cell):
        s.cell = cell
        s.lo = P3.min(0) - cell
        ijk = np.floor((P3 - s.lo) / cell).astype(np.int64)
        s.dim = ijk.max(0) + 3
        key = (ijk[:, 0] * s.dim[1] + ijk[:, 1]) * s.dim[2] + ijk[:, 2]
        s.order = np.argsort(key, kind='stable')
        s.keys = key[s.order]

    def near(s, c):
        i, j, k = np.floor((np.asarray(c) - s.lo) / s.cell).astype(np.int64)
        out = []
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                k0 = ((i + di) * s.dim[1] + (j + dj)) * s.dim[2] + (k - 1)
                a = np.searchsorted(s.keys, k0)
                b = np.searchsorted(s.keys, k0 + 3)
                if b > a:
                    out.append(s.order[a:b])
        return np.concatenate(out) if out else np.zeros(0, np.int64)


def strokes(pos, nrm, tone, step, flow='around', L=2.8, W=0.8, cover=1.3, p=0.2, tilt=20, axis=None, ppmm=10.0,
            seed=0, cross=False, glaze=0.3, **_):
    """Lay brush strokes over the texels (pos (k,3), sculpt normals (k,3), tone (k,)). Each stroke picks up the tone
    where it starts and drags it along (some a ramp step lighter or darker), tapered at both ends, its tail breaking
    into dry bristle streaks; later strokes lie over earlier ones. `glaze`: the share of strokes laid half a step
    lighter or darker (a thin glaze: painted as the colour between two ramp tones). Returns the new tone (k,) and the
    glaze (k,) (-1, 0, +1)."""
    k = len(pos)
    gl = np.zeros(k, np.int8)
    if k < 20:
        return tone, gl
    rng = np.random.default_rng(seed)
    area = k / max(ppmm, 1e-6) ** 2
    ns = int(cover * area / (L * W * 0.62))
    if ns < 1:
        return tone, gl
    out = tone.copy()
    grid = Grid(pos, max(L, W) * 0.52 + 0.05)
    cs = rng.integers(0, k, ns)
    D = flow_dir(flow, pos[cs], nrm[cs], axis)
    passes = [D]
    if cross:  # a weave: a second set of strokes across the first
        passes.append(np.cross(nrm[cs], D))
    for D in passes:
        for j, ci in enumerate(cs):
            c, nc = pos[ci], nrm[ci]
            d = D[j]
            a = math.radians(rng.normal() * tilt)
            b = np.cross(nc, d)
            d = d * math.cos(a) + b * math.sin(a)
            b = np.cross(nc, d)
            idx = grid.near(c)
            if not len(idx):
                continue
            q = pos[idx] - c
            u, v, h = q @ d, q @ b, q @ nc
            Lj = L * (0.7 + 0.6 * rng.random())
            Wj = W * (0.75 + 0.5 * rng.random())
            v = v - 0.12 * u * u / Lj * rng.normal()  # a slight curve
            t = u / Lj + 0.5  # 0 where the brush lands .. 1 where it lifts
            half = Wj / 2 * np.clip(np.minimum(t / 0.16, (1 - t) / 0.3), 0, 1) ** 0.5
            ok = (t >= 0) & (t <= 1) & (np.abs(v) <= half) & (np.abs(h) < Wj * 0.6) & ((nrm[idx] @ nc) > 0.8)
            # dry brush: the bristles run out of paint at different lengths along the tail
            nb = 6
            bi = np.clip(((v / np.maximum(half, 1e-6)) * 0.5 + 0.5) * nb, 0, nb - 1).astype(int)
            reach = 0.62 + 0.38 * rng.random(nb)
            ok &= t <= reach[bi]
            if not ok.any():
                continue
            r = rng.random()
            up = 0.6 * nc[2]  # (painted light: lighter strokes on the faces that look up, darker ones underneath)
            dv = step if r < p * (1 + up) else (-step if r < 2 * p else 0.0)
            out[idx[ok]] = tone[ci] + dv
            r2 = rng.random()
            gl[idx[ok]] = 1 if r2 < glaze * 0.5 * (1 + up) else (-1 if r2 < glaze else 0)
    return out, gl


def dabs(pos, nrm, ppmm, size=0.6, spacing=1.0, jitter=0.35, seed=0, lumpy=0.18):
    """A hand-dabbed pattern (pebbles, scales, spots, stipple): blobs on a jittered 3D lattice (spacing mm), each its
    own slightly lumpy size; returns per texel the dab number (-1 none) and the dab's radial distance (0 centre..1)."""
    k = len(pos)
    rng = np.random.default_rng(seed)
    lo = pos.min(0)
    ijk = np.floor((pos - lo) / spacing).astype(np.int64)
    dim = ijk.max(0) + 2
    cid = (ijk[:, 0] * dim[1] + ijk[:, 1]) * dim[2] + ijk[:, 2]
    # one dab per occupied cell, centred on a random texel of the cell, nudged
    order = np.argsort(cid, kind='stable')
    keys = cid[order]
    starts = np.r_[0, np.nonzero(np.diff(keys))[0] + 1]
    ends = np.r_[starts[1:], len(keys)]
    pick = order[starts + (rng.random(len(starts)) * (ends - starts)).astype(int)]
    C = pos[pick] + rng.normal(size=(len(pick), 3)) * spacing * jitter * 0.4
    R = size / 2 * (0.75 + 0.5 * rng.random(len(pick)))
    best = np.full(k, 9.0)
    who = np.full(k, -1, np.int64)
    grid = Grid(pos, max(spacing, size) * 0.75 + 0.05)
    ph = rng.random((len(pick), 2)) * 6.283
    for j, c in enumerate(C):
        idx = grid.near(c)
        if not len(idx):
            continue
        q = pos[idx] - c
        dn = q @ nrm[pick[j]]
        q = q - np.outer(dn, nrm[pick[j]])
        r = np.linalg.norm(q, axis=1)
        ang = np.arctan2(q[:, 0] + q[:, 2], q[:, 1] + 1e-9)
        rr = R[j] * (1 + lumpy * np.sin(3 * ang + ph[j, 0]) + lumpy * 0.6 * np.sin(5 * ang + ph[j, 1]))
        d = r / rr
        sel = (d < 1) & (d < best[idx]) & (np.abs(dn) < R[j]) & ((nrm[idx] @ nrm[pick[j]]) > 0.4)
        best[idx[sel]] = d[sel]
        who[idx[sel]] = j
    return who, best
