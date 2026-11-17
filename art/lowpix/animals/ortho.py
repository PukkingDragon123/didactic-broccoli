"""Debug: orthographic shaded render of a mesh with a unit grid (front: x/y, side: z/y, top: x/z), markers."""
import numpy as np
from PIL import Image, ImageDraw


def render(P, F, view='front', box=None, px=40, grid=1.0, marks=(), tex=None, UV=None):
    ax = {'front': (0, 1, 2, 1), 'side': (2, 1, 0, 1), 'top': (0, 2, 1, -1), 'back': (0, 1, 2, -1)}[view]
    a, b, d, sgn = ax
    X, Y, Z = P[:, a].copy(), P[:, b].copy(), P[:, d] * (sgn if view != 'top' else 1)
    if view == 'back': X = -X
    if view == 'side': X = X  # looking from +x: z to the right
    if box is None: box = (X.min(), X.max(), Y.min(), Y.max())
    x0, x1, y0, y1 = box
    W, H = int((x1 - x0) * px) + 1, int((y1 - y0) * px) + 1
    img = np.full((H, W, 3), 60.0); zb = np.full((H, W), -1e9)
    sx = (X - x0) * px; sy = (y1 - Y) * px
    nrm = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-12
    L = np.array([0.4, 0.7, 0.6]); L /= np.linalg.norm(L)
    shade = 0.35 + 0.65 * np.abs(nrm @ L)
    for t, (i, j, k) in enumerate(F):
        xs, ys = sx[[i, j, k]], sy[[i, j, k]]
        bx0, bx1 = max(0, int(xs.min())), min(W - 1, int(xs.max()) + 1)
        by0, by1 = max(0, int(ys.min())), min(H - 1, int(ys.max()) + 1)
        if bx0 > bx1 or by0 > by1: continue
        gx, gy = np.meshgrid(np.arange(bx0, bx1 + 1) + 0.5, np.arange(by0, by1 + 1) + 0.5)
        det = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
        if abs(det) < 1e-12: continue
        l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / det
        l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / det
        l2 = 1 - l0 - l1
        m = (l0 >= 0) & (l1 >= 0) & (l2 >= 0)
        if not m.any(): continue
        z = l0 * Z[i] + l1 * Z[j] + l2 * Z[k]
        sub = zb[by0:by1 + 1, bx0:bx1 + 1]
        w = m & (z > sub)
        sub[w] = z[w]
        if tex is not None:
            u = l0 * UV[i, 0] + l1 * UV[j, 0] + l2 * UV[k, 0]; v = l0 * UV[i, 1] + l1 * UV[j, 1] + l2 * UV[k, 1]
            c = tex[np.clip((v * tex.shape[0]).astype(int), 0, tex.shape[0] - 1), np.clip((u * tex.shape[1]).astype(int), 0, tex.shape[1] - 1)][..., :3] * shade[t]
            img[by0:by1 + 1, bx0:bx1 + 1][w] = c[w]
        else:
            img[by0:by1 + 1, bx0:bx1 + 1][w] = 200 * shade[t]
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    dr = ImageDraw.Draw(im)
    if grid:
        for gx in np.arange(np.ceil(x0 / grid) * grid, x1, grid):
            X0 = (gx - x0) * px; dr.line([(X0, 0), (X0, H)], fill=(90, 140, 220) if abs(gx) < 1e-6 else (80, 90, 110), width=1)
            if round(gx / grid) % 2 == 0: dr.text((X0 + 2, 2), f"{gx:g}", fill=(150, 200, 255))
        for gy in np.arange(np.ceil(y0 / grid) * grid, y1, grid):
            Y0 = (y1 - gy) * px; dr.line([(0, Y0), (W, Y0)], fill=(80, 90, 110), width=1)
            if round(gy / grid) % 2 == 0: dr.text((2, Y0 + 2), f"{gy:g}", fill=(150, 200, 255))
    for m in marks:
        mx, my = (m[a] - x0) * px, (y1 - m[b]) * px
        if view == 'back': mx = (-m[a] - x0) * px
        dr.ellipse([mx - 4, my - 4, mx + 4, my + 4], outline=(255, 60, 60), width=2)
    return im
