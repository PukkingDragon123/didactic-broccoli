"""Face rigging for the converted animals (in the source units, before the move to metres):
  carve_eye(P, centre, axis, r)        the head surface inside the eye opening pulled back behind the eyeball
  split_mouth(P, F, UV, zone, below)   the lips cut apart along the mouth line; returns new P, F, UV, a jaw weight per
                                       vertex, the slit chain (pairs of upper / lower vertex ids, corner to corner)
  mouth_bag(...)                       the inside of the mouth (roof, floor, throat) and a tongue, as extra triangles
"""
import numpy as np


def carve_eye(P, c, a, r, k=1.12):
    """Vertices in front of the eyeball centre within k*r of its axis move onto a shell just inside the eyeball."""
    P = P.copy()
    d = P - c
    along = d @ a
    perp = np.linalg.norm(d - np.outer(along, a), axis=1)
    m = (along > -0.2 * r) & (perp < k * r) & (np.linalg.norm(d, axis=1) < 2.2 * r)
    # blend: inside the opening fully onto the shell, a soft ring round it
    w = np.clip((k * r - perp[m]) / (0.35 * r), 0, 1)
    shell = c + d[m] / (np.linalg.norm(d[m], axis=1, keepdims=True) + 1e-9) * (r * 0.96)
    P[m] = P[m] * (1 - w[:, None]) + shell * w[:, None]
    return P


def split_mouth(P, F, UV, is_zone, is_lower):
    """is_zone(C) / is_lower(C): per-triangle (centroid) masks. Edges between a lower and an upper triangle inside the
    zone are cut (their vertices duplicated, the copy used by the lower side); the cut's two ends stay joined."""
    C = P[F].mean(1)
    zone, low = is_zone(C), is_lower(C)
    # edge -> triangles
    E = {}
    for t, f in enumerate(F):
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            E.setdefault((min(a, b), max(a, b)), []).append(t)
    # positions are shared across UV seams by several vertex ids: work on welded position keys
    key = np.round(P * 1e4).astype(np.int64)
    _, pid = np.unique(key, axis=0, return_inverse=True); pid = pid.reshape(-1)
    slit, other = set(), set()
    for (a, b), ts in E.items():
        if len(ts) != 2: continue
        t0, t1 = ts
        if low[t0] != low[t1]:
            if zone[t0] and zone[t1]: slit.add((a, b))
            else: other.add((a, b))
    # slit edges are recorded per vertex id; a UV seam inside the zone would leave the mesh unsplit there (rare)
    slit_p = {pid[v] for e in slit for v in e}
    other_p = {pid[v] for e in other for v in e}
    cut_p = slit_p - other_p                      # the two end vertices stay joined
    P2, UV2 = list(P), list(UV)
    remap = {}
    F2 = F.copy()
    lower_tris = np.where(low)[0]
    for t in lower_tris:
        for k in range(3):
            v = F2[t, k]
            if pid[v] in cut_p:
                if v not in remap:
                    remap[v] = len(P2); P2.append(P[v].copy()); UV2.append(UV[v].copy())
                F2[t, k] = remap[v]
    P2, UV2 = np.array(P2), np.array(UV2)
    # the chain of cut vertices (upper id, lower id), sorted across the mouth by x
    pairs = sorted(((u, l) for u, l in remap.items()), key=lambda q: P[q[0], 0])
    ends = sorted({v for e in slit for v in e if pid[v] in (slit_p & other_p)}, key=lambda v: P[v, 0])
    return P2, F2, UV2, low, pairs, ends


def jaw_weights(P2, F2, low, falloff):
    """1 on the lower-jaw triangles' vertices, faded by falloff(P) (behind the chin, down the throat), 0.5 at shared
    vertices."""
    n = len(P2)
    lo = np.zeros(n); hi = np.zeros(n)
    for t, f in enumerate(F2):
        if low[t]: lo[f] = 1
        else: hi[f] = 1
    w = np.where(lo > 0, np.where(hi > 0, 0.5, 1.0), 0.0)
    return w * falloff(P2)


def mouth_bag(P2, pairs, ends, inward, depth, tongue_len, uv_dark, uv_roof, uv_tongue):
    """Extra geometry for the inside of the mouth: for each cut vertex pair, roof (upper) and floor (lower) strips going
    `depth` toward `inward`, closed at the back; a tongue lying on the floor. Returns (pos, uv, tris, jaw weight)."""
    pos, uv, tri, jw = [], [], [], []

    def add(p, t, w):
        pos.append(p); uv.append(t); jw.append(w); return len(pos) - 1
    chain = [ends[0]] + [q for q in pairs] + [ends[-1]] if len(ends) >= 2 else list(pairs)
    up, lo, ri, fi = [], [], [], []
    for item in chain:
        if isinstance(item, tuple):
            u, l = item; p = P2[u]
        else:
            u = l = item; p = P2[item]
        d = inward - p; d /= np.linalg.norm(d)
        up.append(add(p, uv_roof, 0.0)); lo.append(add(p, uv_dark, 1.0))
        ri.append(add(p + d * depth + np.array([0, 0.12, 0]), uv_roof, 0.0))
        fi.append(add(p + d * depth - np.array([0, 0.12, 0]), uv_dark, 1.0))
    for i in range(len(chain) - 1):
        a, b = i, i + 1
        tri += [(up[a], ri[a], up[b]), (up[b], ri[a], ri[b])]          # the roof
        tri += [(lo[a], lo[b], fi[a]), (lo[b], fi[b], fi[a])]          # the floor
        tri += [(ri[a], fi[a], ri[b]), (ri[b], fi[a], fi[b])]          # the throat
    # the tongue: a flat leaf on the floor, its tip just behind the lower lip
    mid = len(chain) // 2
    base = P2[chain[mid][1] if isinstance(chain[mid], tuple) else chain[mid]]
    d = inward - base; d /= np.linalg.norm(d)
    side = np.cross(d, [0, 1, 0]); side /= np.linalg.norm(side)
    ring = []
    for k, (s, w) in enumerate([(0.15, 0.45), (0.45, 0.55), (0.8, 0.5), (1.0, 0.0)]):
        c = base + d * (s * tongue_len) - np.array([0, 0.18, 0])
        ring.append((add(c + side * w, uv_tongue, 1.0), add(c - side * w, uv_tongue, 1.0), add(c + np.array([0, 0.12, 0]), uv_tongue, 1.0)))
    tip = add(base + d * 0.02 - np.array([0, 0.16, 0]), uv_tongue, 1.0)
    n_tongue = len(pos) - ring[0][0]
    for k in range(len(ring) - 1):
        a, b = ring[k], ring[k + 1]
        tri += [(a[0], a[2], b[0]), (b[0], a[2], b[2]), (a[2], a[1], b[2]), (b[2], a[1], b[1])]
    tri += [(tip, ring[0][2], ring[0][0]), (tip, ring[0][1], ring[0][2])]
    tongue = np.zeros(len(pos), bool); tongue[ring[0][0]:] = True
    return np.array(pos), np.array(uv), np.array(tri), np.array(jw), tongue, base, d


def carve_eye2(P, c, f, up, s, r, e_up, e_lo, push=1.07):
    """The face around a modelled eye: inside the almond opening (the lens between the open lids, which hinge about the
    corner axis s) the skin is pulled back behind the eyeball; round it, the skin is kept just outside the lid shells
    (so the lids hide under it while the eye is open and only their dark rims show at the opening)."""
    P = P.copy()
    d = P - c
    dist = np.linalg.norm(d, axis=1) + 1e-9
    u = d / dist[:, None]
    fx, fy, fs = u @ f, u @ up, u @ s
    phi = np.arctan2(fy, fx)
    near = dist < 2.0 * r
    front = fx > 0.05
    inside = near & front & (phi < e_up) & (phi > e_lo) & (np.abs(fs) < 0.995)
    P[inside] = c + u[inside] * (r * 0.96)
    ring = near & ~inside & (fx > -0.25) & (dist < push * r)
    P[ring] = c + u[ring] * (push * r)
    return P
