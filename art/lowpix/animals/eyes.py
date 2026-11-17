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


def eyeball(c, axis, r, frame_uv, nu=14, nv=10):
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


def lid(c, axis, r, upper, tilt, surf_uv, rim_uv, az=1.35, el=1.45, na=12, ne=7, rim=0.12):
    """A shell of radius r over the upper (or lower) half of the eye, its edge on the eye's equator at rest; vertices
    sampled at azimuth -az..az and elevation 0..el (radians); the first rim (radians) of elevation is the dark rim."""
    f, up, s = frame_basis(axis, tilt)
    sg = 1 if upper else -1
    pos, nrm, uv, tri = [], [], [], []
    els = [0, rim * 0.5, rim] + list(np.linspace(rim, el, ne)[1:])
    for j, e in enumerate(els):
        for i in range(na + 1):
            a = -az + 2 * az * i / na
            d = (f * np.cos(a) + s * np.sin(a)) * np.cos(e) + up * np.sin(e) * sg
            p = c + d * r
            pos.append(p); nrm.append(d)
            uv.append(rim_uv if e < rim * 0.99 else surf_uv(p))
    W = na + 1
    for j in range(len(els) - 1):
        for i in range(na):
            a = j * W + i; b = a + 1; cc = a + W; d = cc + 1
            tri += [(a, b, cc), (b, d, cc)] if upper else [(a, cc, b), (b, cc, d)]
    return np.array(pos), np.array(nrm), np.array(uv), np.array(tri)


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
    """One iris frame (size x size px): the eyeball's front seen along its axis. iris: dict of colours; pupil: (w, h)
    as fractions of the eyeball radius (a vertical slit or a round pupil). Painted per pixel at 3x and reduced by
    majority: a darker limbus ring, the body greener outside and golden round the pupil, fine radial fibres (alternating
    lighter / darker spokes whose widths vary), the upper lid's shadow, a small sharp catchlight."""
    K = 3
    S = size * K
    rng = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:S, 0:S]
    x = (xx + 0.5) / S * 2 - 1; y = (yy + 0.5) / S * 2 - 1      # -1..1 over the eyeball
    rr = np.hypot(x, y); ang = np.arctan2(y, x)
    ri = iris.get('size', 0.82)
    col = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
    out = np.zeros((S, S, 3), np.float32) + col(iris['ball'])
    k = rr / ri
    # body: outer -> mid -> inner by radius (stepped, 3 bands with a jagged, fibrous boundary)
    spokes = np.zeros_like(ang)
    nsp = 46
    edges = np.sort(rng.random(nsp)) * 2 * np.pi
    idx = np.searchsorted(edges, (ang + np.pi) % (2 * np.pi)) % nsp
    jag = rng.random(nsp)[idx] * 0.08
    band = np.where(k < 0.5 + jag, 2, np.where(k < 0.78 + jag, 1, 0))
    for b, name in enumerate(['outer', 'mid', 'inner']):
        out[band == b] = col(iris[name])
    # fibres: alternate spokes a shade lighter / darker in the mid and outer bands
    light = (idx % 3 == 0); dark = (idx % 3 == 1)
    fib = (k > 0.36) & (k < 0.94)
    out[fib & light] = out[fib & light] * 0.55 + col(iris['fibre_l']) * 0.45
    out[fib & dark] = out[fib & dark] * 0.55 + col(iris['fibre_d']) * 0.45
    # limbus ring and the edge of the iris
    out[(k > 0.9) & (k <= 1)] = col(iris['limbus'])
    out[k > 1] = col(iris['ball'])
    # the upper lid's shadow over the top of the iris
    sh = (y < -0.42 + 0.25 * x * x) & (k <= 1)
    out[sh] = out[sh] * 0.62 + col(iris['shadow']) * 0.38
    # pupil (with a faint darker ring)
    pw, ph = pupil
    pk = (x / pw) ** 2 + (y / ph) ** 2
    out[pk < 1.35] = out[pk < 1.35] * 0.6 + col(iris['pupil']) * 0.4
    out[pk < 1] = col(iris['pupil'])
    # catchlight (the window, upper left of the pupil) and a faint second one lower right
    g1 = ((x + 0.3) / 0.13) ** 2 + ((y + 0.34) / 0.1) ** 2 < 1
    out[g1] = col(iris['glint'])
    g2 = ((x - 0.33) / 0.05) ** 2 + ((y - 0.38) / 0.04) ** 2 < 1
    out[g2] = out[g2] * 0.4 + col(iris['glint2']) * 0.6
    return majority(np.clip(out, 0, 255).astype(np.uint8), K, keep=[iris['glint'], iris['pupil']])


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
