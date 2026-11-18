"""Gacha Garage pixel-art kit: shared helpers (palettes, tiny fonts, outline, compositing,
small 3D renderers for coins / SDF props). Everything is point-sampled at native pixel size,
quantised to fixed 5-7 step ramps, then outlined and hand-detailed. No AA, no gradients."""
import math
import numpy as np
from PIL import Image


def C(h, a=255):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)] + [a], np.uint8)


def ramp(*hexes):
    return [C(h) for h in hexes]


def blank(w, h):
    return np.zeros((h, w, 4), np.uint8)


def put(a, x, y, c):
    if 0 <= y < a.shape[0] and 0 <= x < a.shape[1]:
        a[y, x] = c


def stamp(a, rows, pal, x0, y0):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch in pal:
                put(a, x0 + i, y0 + j, pal[ch])


def hline(a, x0, x1, y, c):
    for x in range(x0, x1 + 1):
        put(a, x, y, c)


def vline(a, x, y0, y1, c):
    for y in range(y0, y1 + 1):
        put(a, x, y, c)


def rect(a, x0, y0, x1, y1, c):
    a[max(0, y0):y1 + 1, max(0, x0):x1 + 1] = c


def line(a, x0, y0, x1, y1, c):
    n = max(abs(x1 - x0), abs(y1 - y0), 1)
    for k in range(n + 1):
        put(a, round(x0 + (x1 - x0) * k / n), round(y0 + (y1 - y0) * k / n), c)


def outline(a, col, diag=False, mask=None):
    m = a[..., 3] > 0 if mask is None else mask
    n = np.zeros_like(m)
    n[1:] |= m[:-1]; n[:-1] |= m[1:]; n[:, 1:] |= m[:, :-1]; n[:, :-1] |= m[:, 1:]
    if diag:
        n[1:, 1:] |= m[:-1, :-1]; n[:-1, :-1] |= m[1:, 1:]; n[1:, :-1] |= m[:-1, 1:]; n[:-1, 1:] |= m[1:, :-1]
    o = n & ~m & ~(a[..., 3] > 0) if mask is None else n & ~m
    a[o] = col
    return a


def over(dst, src, x, y):
    """Composite src onto dst at (x,y); src alpha is binary except flat shadow pixels."""
    h, w = src.shape[:2]
    H, W = dst.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x0 >= x1 or y0 >= y1:
        return dst
    s = src[y0 - y:y1 - y, x0 - x:x1 - x].astype(np.float32)
    d = dst[y0:y1, x0:x1].astype(np.float32)
    sa = s[..., 3:4] / 255
    out = d.copy()
    out[..., :3] = s[..., :3] * sa + d[..., :3] * (1 - sa)
    out[..., 3:4] = np.maximum(d[..., 3:4], s[..., 3:4])
    dst[y0:y1, x0:x1] = out.astype(np.uint8)
    return dst


def up(a, k):
    return Image.fromarray(a, 'RGBA').resize((a.shape[1] * k, a.shape[0] * k), Image.NEAREST)


def despeckle(idx, mask):
    """Kill single pixels whose 4 neighbours agree on another ramp step (hand clean-up pass)."""
    out = idx.copy()
    H, W = idx.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not mask[y, x]:
                continue
            nb = [idx[y - 1, x], idx[y + 1, x], idx[y, x - 1], idx[y, x + 1]]
            mk = [mask[y - 1, x], mask[y + 1, x], mask[y, x - 1], mask[y, x + 1]]
            if all(mk) and nb.count(nb[0]) == 4 and nb[0] != idx[y, x]:
                out[y, x] = nb[0]
    return out


# ---- tiny 3x5 printing font (tickets, receipts, coin legends) -------------------------
F3 = {
    '0': ["XXX", "X.X", "X.X", "X.X", "XXX"], '1': [".X.", "XX.", ".X.", ".X.", "XXX"],
    '2': ["XX.", "..X", ".X.", "X..", "XXX"], '3': ["XX.", "..X", ".X.", "..X", "XX."],
    '4': ["X.X", "X.X", "XXX", "..X", "..X"], '5': ["XXX", "X..", "XX.", "..X", "XX."],
    '6': [".XX", "X..", "XXX", "X.X", "XXX"], '7': ["XXX", "..X", ".X.", ".X.", ".X."],
    '8': ["XXX", "X.X", "XXX", "X.X", "XXX"], '9': ["XXX", "X.X", "XXX", "..X", "XX."],
    '¥': ["X.X", ".X.", "XXX", "XXX", ".X."], '.': [".", ".", ".", ".", "X"],
    '-': ["..", "..", "XX", "..", ".."], ':': [".", "X", ".", "X", "."], ' ': ["..", "..", "..", "..", ".."],
    'A': [".X.", "X.X", "XXX", "X.X", "X.X"], 'B': ["XX.", "X.X", "XX.", "X.X", "XX."],
    'C': [".XX", "X..", "X..", "X..", ".XX"], 'D': ["XX.", "X.X", "X.X", "X.X", "XX."],
    'E': ["XXX", "X..", "XX.", "X..", "XXX"], 'G': [".XX", "X..", "X.X", "X.X", ".XX"],
    'I': ["XXX", ".X.", ".X.", ".X.", "XXX"], 'K': ["X.X", "X.X", "XX.", "X.X", "X.X"],
    'M': ["X.X", "XXX", "XXX", "X.X", "X.X"], 'N': ["XX.", "X.X", "X.X", "X.X", "X.X"],
    'O': [".X.", "X.X", "X.X", "X.X", ".X."], 'R': ["XX.", "X.X", "XX.", "X.X", "X.X"],
    'S': [".XX", "X..", ".X.", "..X", "XX."], 'T': ["XXX", ".X.", ".X.", ".X.", ".X."],
    'W': ["X.X", "X.X", "XXX", "XXX", "X.X"], 'Y': ["X.X", "X.X", ".X.", ".X.", ".X."],
    'o': ["..", "..", "XX", "XX", ".."], '>': ["X..", ".X.", "..X", ".X.", "X.."],
}


def text3(a, s, x, y, c, gap=1):
    for ch in s:
        g = F3[ch]
        for j, row in enumerate(g):
            for i, v in enumerate(row):
                if v == 'X':
                    put(a, x + i, y + j, c)
        x += len(g[0]) + gap
    return x


def text3_w(s, gap=1):
    return sum(len(F3[ch][0]) + gap for ch in s) - gap


# ---- light (upper-left key) -----------------------------------------------------------
L = np.array([-0.55, 0.62, 0.56]); L /= np.linalg.norm(L)
V = np.array([0.0, 0.0, 1.0])
HV = (L + V) / np.linalg.norm(L + V)


def Rx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def Ry(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def Rz(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


# ---- coins: analytic disc ray-cast, embossed face maps --------------------------------
class Face:
    """Per-texel face description at native size N=2R: mask, normal tilt (tu,tv), step offset, ramp id."""

    def __init__(self, R, hole=0.0):
        N = 2 * R
        self.R, self.N = R, N
        yy, xx = np.mgrid[0:N, 0:N].astype(float)
        self.dx, self.dy = xx - (N - 1) / 2, yy - (N - 1) / 2
        r = np.hypot(self.dx, self.dy)
        self.r = r
        self.mask = r <= R - 0.3
        if hole:
            self.mask &= r >= hole + 0.3
        self.tu = np.zeros((N, N)); self.tv = np.zeros((N, N))
        self.off = np.zeros((N, N), int)
        self.mat = np.zeros((N, N), int)
        self.raised = np.zeros((N, N), bool)
        self.ink = np.zeros((N, N), int)  # 0 none, else extra fixed colour index into ramp (absolute)
        ux, uy = self.dx / np.maximum(r, 1e-6), -self.dy / np.maximum(r, 1e-6)
        self.ux, self.uy = ux, uy
        out = self.mask & (r > R - 1.3)
        top = self.mask & (r > R - 2.3) & ~out
        bev = self.mask & (r > R - 3.3) & ~out & ~top
        self.tu[out], self.tv[out] = ux[out] * 0.9, uy[out] * 0.9
        self.tu[bev], self.tv[bev] = -ux[bev] * 0.8, -uy[bev] * 0.8
        self.field = self.mask & ~out & ~top & ~bev
        self.off[top] = 1
        self.off[self.field] = -1
        if hole:
            hr = self.mask & (r < hole + 1.3)
            self.tu[hr], self.tv[hr] = -ux[hr] * 0.9, -uy[hr] * 0.9
            self.field &= ~hr

    def raise_px(self, x, y):
        if 0 <= x < self.N and 0 <= y < self.N and self.mask[y, x]:
            self.raised[y, x] = True

    def raise_rows(self, rows, x0, y0, ch='X'):
        for j, row in enumerate(rows):
            for i, v in enumerate(row):
                if v == ch:
                    self.raise_px(x0 + i, y0 + j)

    def raise_text(self, s, cx, y, tall=False):
        w = text3_w(s)
        x = int(round(cx - w / 2))
        for chh in s:
            g = F3[chh]
            if tall:
                g = g[:1] + [g[1]] + g[1:3] + [g[3]] + g[3:]  # 3x7 coin numerals
            self.raise_rows(g, x, y)
            x += len(g[0]) + 1

    def finish(self):
        """Emboss raised pixels: lit top-left lip, polished top, cast shadow bottom-right."""
        R = self.raised
        f = self.mask & ~R
        self.off[R] = 1
        ul = np.zeros_like(R); ul[1:, 1:] = R[1:, 1:] & ~R[:-1, :-1]
        self.off[ul] = 2
        sh = np.zeros_like(R); sh[1:, 1:] = R[:-1, :-1]
        sh &= f
        self.off[sh & self.field] = -3
        sh2 = np.zeros_like(R); sh2[1:, :] = R[:-1, :]; sh2[:, 1:] |= R[:, :-1]
        self.off[sh2 & f & self.field & ~sh] = np.minimum(self.off[sh2 & f & self.field & ~sh], -2)
        return self


def coin_frame(front, back, theta, thick, ramps, outline_col, reeds=0, side_ramp=0, hole=0.0, gain=1.0):
    """Render one spin frame. ramps: list of 7-step ramps; face.mat picks one per texel."""
    R, N = front.R, front.N
    W = H = N + 2
    out = blank(W, H)
    c, s = math.cos(theta), math.sin(theta)
    h = thick / 2 / R
    hole_r = hole / R if hole else 0
    for j in range(H):
        for i in range(W):
            x = (i + 0.5 - W / 2) / R
            y = -(j + 0.5 - H / 2) / R
            o = np.array([c * x - 5 * s, y, s * x + 5 * c])
            d = np.array([s, 0.0, -c])
            best = None
            for zc, face, sign in ((h, front, 1), (-h, back, -1)):
                if abs(d[2]) < 1e-6:
                    continue
                t = (zc - o[2]) / d[2]
                p = o + t * d
                u = p[0] * sign
                col = int(math.floor((u + 1) / 2 * N)); row = int(math.floor((1 - p[1]) / 2 * N))
                if 0 <= col < N and 0 <= row < N and face.mask[row, col]:
                    if best is None or t < best[0]:
                        best = (t, 'face', face, sign, row, col, p)
            if abs(d[0]) > 1e-6:
                for rad, inner in ((1.0, False), (hole_r, True)):
                    if rad <= 0 or abs(y) >= rad:
                        continue
                    for sg in (1, -1):
                        t = (sg * math.sqrt(rad * rad - y * y) - o[0]) / d[0]
                        p = o + t * d
                        if abs(p[2]) <= h and (best is None or t < best[0]):
                            best = (t, 'side', None, inner, 0, 0, p)
            if best is None:
                continue
            t, kind, face, sign, row, col, p = best
            if kind == 'face':
                n = np.array([face.tu[row, col] * sign, face.tv[row, col], sign * 1.0])
                off = face.off[row, col]
                rmp = ramps[face.mat[row, col]]
            else:
                n = np.array([p[0], p[1], 0.0]) * (-1 if sign else 1)
                off = 0
                if reeds:
                    phi = math.atan2(p[1], p[0])
                    if int(math.floor((phi / (2 * math.pi) + 1) * reeds * 2)) % 2:
                        off = -1
                rmp = ramps[side_ramp]
            n = n / np.linalg.norm(n)
            nw = np.array([c * n[0] + s * n[2], n[1], -s * n[0] + c * n[2]])
            diff = max(float(nw @ L), 0.0)
            spec = max(float(nw @ HV), 0.0) ** 30
            env = 0.5 + 0.5 * nw[1]
            sh = (0.06 + 0.55 * diff + 0.22 * env + 0.7 * spec) * gain
            k = int(np.clip(sh * 7, 0, 6)) + off
            if kind == 'face' and face.ink[row, col]:
                k = face.ink[row, col] - 1 + min(off, 0)
            out[j, i] = rmp[int(np.clip(k, 0, len(rmp) - 1))]
    return outline(out, outline_col)


# ---- SDF helpers (piggy banks, capsules, purses) -------------------------------------
def sd_ellipsoid(p, r):
    r = np.asarray(r, float)
    k0 = np.linalg.norm(p / r, axis=-1)
    k1 = np.linalg.norm(p / (r * r), axis=-1)
    return k0 * (k0 - 1) / np.maximum(k1, 1e-9)


def sd_capsule(p, a, b, r):
    a, b = np.asarray(a, float), np.asarray(b, float)
    pa, ba = p - a, b - a
    hh = np.clip((pa @ ba) / (ba @ ba), 0, 1)
    return np.linalg.norm(pa - hh[..., None] * ba, axis=-1) - r


def sd_cyl_x(q, h, r, rr):
    d1 = np.abs(q[..., 0]) - h + rr
    d2 = np.sqrt(q[..., 1] ** 2 + q[..., 2] ** 2) - r + rr
    return np.minimum(np.maximum(d1, d2), 0) + np.sqrt(np.maximum(d1, 0) ** 2 + np.maximum(d2, 0) ** 2) - rr


def smin(a, b, k):
    hh = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b * (1 - hh) + a * hh - k * hh * (1 - hh)


def march(sdf, W, H, S, cx, cy, M, b, steps=110):
    """Orthographic sphere trace. view = M @ obj + b. Returns hit mask, obj pos, view normal, depth."""
    jj, ii = np.mgrid[0:H, 0:W].astype(float)
    vx = (ii + 0.5 - cx) / S
    vy = -(jj + 0.5 - cy) / S
    o = np.stack([vx, vy, np.full_like(vx, 4.0)], -1)
    d = np.array([0, 0, -1.0])
    Mi = M.T
    t = np.zeros((H, W)); hit = np.zeros((H, W), bool)
    for _ in range(steps):
        pv = o + t[..., None] * d
        po = (pv - b) @ Mi.T
        dist = sdf(po)
        hit |= dist < 0.002
        t = np.where(hit, t, t + np.maximum(dist * 0.7, 0.002))
        if (t > 8).all():
            break
    hit &= t < 8
    pv = o + t[..., None] * d
    po = (pv - b) @ Mi.T
    e = 0.004
    g = np.stack([sdf(po + np.array(v) * e) - sdf(po - np.array(v) * e) for v in ((1, 0, 0), (0, 1, 0), (0, 0, 1))], -1)
    n = g / np.maximum(np.linalg.norm(g, axis=-1, keepdims=True), 1e-9)
    nv = n @ M.T
    return hit, po, nv, pv[..., 2]


def project(pt, M, b, S, cx, cy):
    v = M @ np.asarray(pt, float) + b
    return int(math.floor(v[0] * S + cx)), int(math.floor(-v[1] * S + cy)), v[2]
