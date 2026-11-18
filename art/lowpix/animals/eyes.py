"""Modelled animal eyes: an eyeball (glossy, its front mapped to an iris frame) and two eyelids (shells just outside the
eyeball, their fur sampled from the face around the socket, a dark rim along the edge) that rotate about the eye to
open, close and narrow it. The two lids' edges are tilted (outer corner up), so the opening between them is an almond.
Iris frames are painted as pixel art at 4x and reduced by majority (crisp, no blended edges).
"""
import numpy as np
from PIL import Image, ImageDraw


def frame_basis(axis, tilt):
    f = axis / np.linalg.norm(axis)
    up = np.array([0, 1.0, 0]); up = up - f * (up @ f); up /= np.linalg.norm(up)
    s = np.cross(up, f)
    # tilt the lid frame about the eye axis (outer corner up)
    c, sn = np.cos(tilt), np.sin(tilt)
    up2 = up * c + s * sn; s2 = np.cross(up2, f)
    return f, up2, s2


def eyeball(c, axis, r, frame_uv, nu=10, nv=6):
    """A UV sphere around c; the front hemisphere mapped (planar along the axis) into frame_uv = (u0, v0, du, dv)."""
    f, up, s = frame_basis(axis, 0)
    pos, nrm, uv, tri = [], [], [], []
    u0, v0, du, dv = frame_uv
    for j in range(nv + 1):
        th = np.pi * j / nv                     # 0 = front pole
        for i in range(nu + 1):
            ph = 2 * np.pi * i / nu
            d = f * np.cos(th) + (s * np.cos(ph) + up * np.sin(ph)) * np.sin(th)
            pos.append(c + d * r); nrm.append(d)
            lx, ly = d @ s, d @ up
            k = 0.5 if th < np.pi / 2 else 0.5 * 1.02   # behind the equator: the dark edge of the frame
            uv.append((u0 + du * (0.5 + lx * k), v0 + dv * (0.5 - ly * k)))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i; b = a + 1; cc = a + nu + 1; d = cc + 1
            tri += [(a, cc, b), (b, cc, d)]
    return np.array(pos), np.array(nrm), np.array(uv), np.array(tri)


def lid(c, axis, r, upper, tilt, patch, az=1.5, el=1.45, na=8, ne=4, rim=0.1):
    """A shell of radius r over the upper (or lower) half of the eye, its edge on the eye's equator at rest; vertices at
    azimuth -az..az and elevation 0..el (radians). Its texture is its own patch = (u0, v0, du, dv) in the atlas: column =
    azimuth, row = elevation (row 0 the edge); paint it with lid_texels()."""
    f, up, s = frame_basis(axis, tilt)
    sg = 1 if upper else -1
    pos, nrm, uv, tri = [], [], [], []
    u0, v0, du, dv = patch
    els = [0, rim * 0.5, rim] + list(np.linspace(rim, el, ne)[1:])
    for j, e in enumerate(els):
        for i in range(na + 1):
            a = -az + 2 * az * i / na
            d = (f * np.cos(a) + s * np.sin(a)) * np.cos(e) + up * np.sin(e) * sg
            pos.append(c + d * r); nrm.append(d)
            uv.append((u0 + du * (i / na), v0 + dv * (e / el)))
    W = na + 1
    for j in range(len(els) - 1):
        for i in range(na):
            a = j * W + i; b = a + 1; cc = a + W; d = cc + 1
            tri += [(a, b, cc), (b, d, cc)] if upper else [(a, cc, b), (b, cc, d)]
    return np.array(pos), np.array(nrm), np.array(uv), np.array(tri)


def lid_texels(tex, rect, c, axis, r, upper, tilt, colour_at, rim_cols, az=1.5, el=1.45, rim=0.1, seed=0):
    """Paint a lid's patch: the dark rim along the edge, then the fur the lid shows when it closes, sampled from the face
    round the eye (colour_at(p) -> rgb of the closest skin), with a few lash-dark clusters near the rim."""
    x0, y0, w, h = rect
    f, up, s = frame_basis(axis, tilt)
    sg = 1 if upper else -1
    rng = np.random.default_rng(seed)
    for yy in range(h):
        e = (yy + 0.5) / h * el
        for xx in range(w):
            a = -az + 2 * az * (xx + 0.5) / w
            if e < rim:
                tex[y0 + yy, x0 + xx] = rim_cols[0] if e < rim * 0.6 else rim_cols[1]
                continue
            d = (f * np.cos(a) + s * np.sin(a)) * np.cos(e) + up * np.sin(e) * sg
            # the skin colour a little beyond the lid (the lid closes with the fur round the eye on it)
            col = np.array(colour_at(c + d * r * 1.6), np.float32)
            if col.mean() < 40: col = np.array(colour_at(c + d * r * 2.0), np.float32)
            if rng.random() < 0.12: col *= 0.88
            tex[y0 + yy, x0 + xx] = np.clip(col, 0, 255)


def closest_uv(P, F, UV, region):
    """A function p -> uv of the closest point on the mesh triangles in `region` (mask of triangles)."""
    T = np.where(region)[0]
    A, B, C = P[F[T, 0]], P[F[T, 1]], P[F[T, 2]]

    def f(p):
        # closest point on each triangle (via projection + clamping to the barycentric simplex, approximately)
        e0, e1 = B - A, C - A
        v2 = p - A
        d00 = (e0 * e0).sum(1); d01 = (e0 * e1).sum(1); d11 = (e1 * e1).sum(1)
        d20 = (v2 * e0).sum(1); d21 = (v2 * e1).sum(1)
        den = d00 * d11 - d01 * d01 + 1e-12
        v = (d11 * d20 - d01 * d21) / den; w = (d00 * d21 - d01 * d20) / den
        v = np.clip(v, 0, 1); w = np.clip(w, 0, 1); s = v + w
        over = s > 1; v[over] /= s[over]; w[over] /= s[over]
        q = A + e0 * v[:, None] + e1 * w[:, None]
        k = np.argmin(((q - p) ** 2).sum(1))
        t = T[k]; u = 1 - v[k] - w[k]
        return UV[F[t, 0]] * u + UV[F[t, 1]] * v[k] + UV[F[t, 2]] * w[k]
    return f


def paint_iris(size, iris, pupil, seed=3):
    """One eye frame (size x size px): the owner's rule, a simple solid dark bead with one tiny highlight (no iris,
    pupil, whites or lashes). `pupil` is ignored: every frame is the same bead (the lids carry the expressions)."""
    col = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.uint8)
    out = np.zeros((size, size, 3), np.uint8) + col(iris.get('bead', '#141010'))
    return out                     # (no highlight: the owner wants plain hand-drawn dots)


def majority(a, K, keep=()):
    H, W = a.shape[0] // K, a.shape[1] // K
    out = np.zeros((H, W, 3), np.uint8)
    keep = [tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) if isinstance(h, str) else tuple(h) for h in keep]
    for y in range(H):
        for x in range(W):
            blk = a[y * K:(y + 1) * K, x * K:(x + 1) * K].reshape(-1, 3)
            cols, cnt = np.unique(blk, axis=0, return_counts=True)
            best = cols[cnt.argmax()]
            for kc in keep:
                m = (cols == kc).all(1)
                if m.any() and cnt[m][0] >= K * K * 0.3: best = np.array(kc)
            out[y, x] = best
    return out
