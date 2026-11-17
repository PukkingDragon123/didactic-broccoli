"""Pixel-art coats for the converted animals: the converted model's colours (a realistic transfer from the source
texture) repainted as detailed, realistic pixel art on its own atlas.

  raster(P, F, UV, W, H)            -> per-texel triangle id, barycentrics, rest position and normal
  repaint(src, R, ramps, classify, flow, ...) -> the new atlas (uint8 RGB)

Every texel: its material group (classify(rgb, P, N) -> ramp name), a tone in that group's hue-shifted ramp from the
source lightness, a fur stroke layer (short strokes traced along a flow field in 3D: darker roots, lit tips), baked
occlusion in creases and under the body, then the ramp colour. Strokes and clusters are placed by a seeded rule, so a
rebuild gives the same coat.
"""
import numpy as np


def raster(P, F, UV, W, H):
    tri = np.full((H, W), -1, np.int32)
    bary = np.zeros((H, W, 3), np.float32)
    U, V = UV[:, 0] * W, UV[:, 1] * H
    for t, (i, j, k) in enumerate(F):
        xs, ys = U[[i, j, k]], V[[i, j, k]]
        x0, x1 = max(0, int(np.floor(xs.min())) - 1), min(W - 1, int(np.ceil(xs.max())) + 1)
        y0, y1 = max(0, int(np.floor(ys.min())) - 1), min(H - 1, int(np.ceil(ys.max())) + 1)
        if x0 > x1 or y0 > y1: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        det = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(det) < 1e-12: continue
        l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / det
        l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / det
        l2 = 1 - l0 - l1
        e = -0.02
        m = (l0 >= e) & (l1 >= e) & (l2 >= e)
        sub = tri[y0:y1 + 1, x0:x1 + 1]
        put = m & (sub < 0)
        sub[put] = t
        bary[y0:y1 + 1, x0:x1 + 1][put] = np.stack([l0, l1, l2], -1)[put]
    # dilate the coverage by 2 texels (mip / seam safety): neighbours copy the nearest covered texel's triangle
    for _ in range(3):
        empty = tri < 0
        if not empty.any(): break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sh = np.roll(np.roll(tri, dy, 0), dx, 1)
            shb = np.roll(np.roll(bary, dy, 0), dx, 1)
            take = empty & (sh >= 0) & (tri < 0)
            tri[take] = sh[take]; bary[take] = shb[take]
    return tri, bary


def surface(P, N, F, tri, bary):
    ok = tri >= 0
    t = np.where(ok, tri, 0)
    idx = F[t]  # H, W, 3
    Ps = (P[idx] * bary[..., None]).sum(2)
    Ns = (N[idx] * bary[..., None]).sum(2)
    Ns /= np.linalg.norm(Ns, axis=-1, keepdims=True) + 1e-9
    return ok, Ps, Ns


def hexes(lst):
    return np.array([[int(h[i:i + 2], 16) for i in (1, 3, 5)] for h in lst], np.float32)


def hash2(a, b, s=0):
    h = (a.astype(np.int64) * 374761393 + b.astype(np.int64) * 668265263 + s * 2246822519) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffff) / float(0x1000000)


def tri_jacobians(P, F, UV, W, H):
    """Per triangle: the map from a 3D tangent vector to a UV direction in texels (2 x 3 pseudo-inverse)."""
    P0, P1, P2 = P[F[:, 0]], P[F[:, 1]], P[F[:, 2]]
    T0, T1, T2 = UV[F[:, 0]] * [W, H], UV[F[:, 1]] * [W, H], UV[F[:, 2]] * [W, H]
    dP = np.stack([P1 - P0, P2 - P0], -1)          # T, 3, 2
    dT = np.stack([T1 - T0, T2 - T0], -1)          # T, 2, 2
    pinv = np.linalg.pinv(dP)                       # T, 2, 3
    return dT @ pinv                                # T, 2, 3


def repaint(src, P, N, F, UV, ramps, classify, flow, seed=1, stroke_density=0.16, stroke_len=(3, 6), occl=None):
    """src: the converted atlas (float RGB, H x W); returns uint8 RGB of the same size."""
    H, W = src.shape[:2]
    tri, bary = raster(P, F, UV, W, H)
    ok, Ps, Ns = surface(P, N, F, tri, bary)
    group = classify(src, Ps, Ns)              # H, W int (index into ramps list), -1 = keep source
    lum = (src[..., 0] * 0.3 + src[..., 1] * 0.55 + src[..., 2] * 0.15) / 255
    tone = np.zeros((H, W), np.float32)
    names = list(ramps)
    R = [hexes(ramps[n]) for n in names]
    # tone from the source lightness, relative to each group's mean (keeps painted gradients and pattern edges)
    for g in range(len(R)):
        m = (group == g) & ok
        if not m.any(): continue
        mu = np.median(lum[m])
        tone[m] = (lum[m] - mu) * 6.0
    # clusters: 2-3 texel blobs of a step lighter / darker (placed by a hash of a coarse cell)
    yy, xx = np.mgrid[0:H, 0:W]
    c1 = hash2(xx // 2, yy // 2, seed)
    tone += np.where(c1 < 0.18, -0.6, np.where(c1 > 0.86, 0.45, 0))
    # occlusion: creases, under the body, inside the legs (a caller field in 0..1, 1 = fully occluded)
    if occl is not None:
        tone -= occl(Ps, Ns) * 2.2
    # fur strokes: traced along the flow field
    J = tri_jacobians(P, F, UV, W, H)
    fdir = flow(Ps, Ns)                         # H, W, 3 (unit, tangent)
    stroke = np.zeros((H, W), np.float32)
    rng = np.random.default_rng(seed)
    cand = np.argwhere(ok & (group >= 0))
    pick = cand[rng.random(len(cand)) < stroke_density]
    lens = rng.integers(stroke_len[0], stroke_len[1] + 1, len(pick))
    kind = rng.random(len(pick))
    for (y, x), L, kd in zip(pick, lens, kind):
        fx, fy = x + 0.5, y + 0.5
        t0 = tri[y, x]; g0 = group[y, x]
        dark = kd < 0.62
        for s in range(L):
            iy, ix = int(fy), int(fx)
            if not (0 <= iy < H and 0 <= ix < W) or tri[iy, ix] < 0 or group[iy, ix] != g0: break
            u = s / max(1, L - 1)
            if dark:
                stroke[iy, ix] = min(stroke[iy, ix], -1.0 + 0.6 * u)       # dark root fading out
            else:
                stroke[iy, ix] = max(stroke[iy, ix], 0.45 + 0.4 * u)       # lit hair, brightest at the tip
            d = J[tri[iy, ix]] @ fdir[iy, ix]
            n = np.hypot(d[0], d[1])
            if n < 1e-6: break
            fx += d[0] / n; fy += d[1] / n
    tone += stroke
    out = src.copy()
    for g, ramp in enumerate(R):
        m = (group == g) & ok
        if not m.any(): continue
        base = (len(ramp) - 1) * ramps_mid(names[g])
        k = np.clip(np.round(base + tone[m]), 0, len(ramp) - 1).astype(int)
        out[m] = ramp[k]
    return np.clip(out, 0, 255).astype(np.uint8), (tri, bary, ok, Ps, Ns, group)


_MID = {}
def ramps_mid(name):
    return _MID.get(name, 0.62)


def set_mid(name, v):
    _MID[name] = v


def weld_normals(P, F, eps=1e-5):
    """Smooth normals shared across UV seams (vertices at the same position)."""
    key = np.round(P / eps).astype(np.int64)
    _, inv = np.unique(key, axis=0, return_inverse=True)
    inv = inv.reshape(-1)
    fn = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    acc = np.zeros((inv.max() + 1, 3))
    for c in range(3): np.add.at(acc, inv[F[:, c]], fn)
    acc /= np.linalg.norm(acc, axis=1, keepdims=True) + 1e-12
    return acc[inv]
