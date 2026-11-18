"""Hand-drawn faces for the toy line (the owner's rule and drawing: docs/ref/faces_owner.png, CLAUDE.md).

As simple as possible, hand-drawn and cute:
- eyes: two small SOLID ink dots, a little uneven in size and shape (never perfect circles, never a matched pair),
  no whites, iris, pupils, highlights, lashes or lids;
- mouth: ONE brush stroke, a flat line with a little upturn at one end, a short slanted dash, or a big open grin with
  2-4 tooth strokes; varied weight, slightly wobbly, like a quick marker;
- cute comes from placement: eyes wide apart or tiny and close together, the mouth small or one big grin, and the face
  sits LOW on the head.
Painted into the albedo as ink (flat texels, hard pixel edges) through the figure's maps: the strokes live in a plane
facing `axis` through `c` (u to the viewer's right, v up), projected onto the surface that faces that way.

    import face
    fc = face.Face(P, c=(0, -14.0, 22.0), axis=(0, -1, 0.2), where=P.region('body'), seed=4)
    fc.eyes(spread=5.2, size=0.55, dy=0.8)              # wide apart; size = dot half-width (mm)
    fc.mouth('upturn', w=6.0, dy=-1.6)                   # or 'line', 'dash', 'grin', 'w', 'o', 'frown'
    fc.stroke([(-3, 3), (-1.5, 3.4)], weight=0.35)      # anything else: a brow, a '>' closed eye, a sweat line
    fc.blush(4.6, -0.6)                                  # an airbrushed blush patch, in two stepped tones
"""
import math

import numpy as np

INK = '#1b1513'


def _hex(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], np.float32)


class Face:
    def __init__(s, P, c, axis, up=(0, 0, 1), where=None, seed=1, ink=INK, facing=0.12, depth=6.0):
        s.P, s.ink, s.rng = P, ink, np.random.default_rng(seed)
        s.U, s.V, s.W, a = P.frame(c, axis, up)
        m = (np.einsum('ijk,k->ij', P.on, a) > facing) & (np.abs(s.W) < depth) & P.mask
        s.m = m if where is None else (m & where)
        # texel size here (mm per texel), so a dot is never smaller than a couple of texels
        p = P.pos
        dx = np.linalg.norm(p[:, 1:] - p[:, :-1], axis=2)
        ok = s.m[:, 1:] & s.m[:, :-1]
        s.px = float(np.median(dx[ok])) if ok.sum() > 8 else 0.2

    # ------------------------------------------------------------------ primitives
    def _noise(s, n, k=3):
        """A smooth random curve over t in [0, 1] (n samples), amplitude about 1."""
        t = np.linspace(0, 1, n)
        out = np.zeros(n)
        for f in range(1, k + 1):
            out += s.rng.normal() / f * np.sin(2 * math.pi * (f * 0.7 * t + s.rng.random()))
        return out / max(1e-6, np.abs(out).max())

    def dot(s, u, v, rx, ry=None, rot=0.0):
        """One solid ink dot, a slightly lumpy ellipse."""
        ry = ry or rx
        rx, ry = max(rx, 1.1 * s.px), max(ry, 1.4 * s.px)
        cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        du, dv = s.U - u, s.V - v
        uu, vv = du * cr + dv * sr, -du * sr + dv * cr
        th = np.arctan2(vv / ry, uu / rx)
        ph = s.rng.random(3) * 2 * math.pi
        rr = 1 + 0.09 * np.sin(2 * th + ph[0]) + 0.06 * np.sin(3 * th + ph[1]) + 0.04 * np.sin(5 * th + ph[2])
        m = s.m & ((uu / rx) ** 2 + (vv / ry) ** 2 <= rr ** 2)
        s.P.flat(m, s.ink)
        return m

    def stroke(s, pts, weight=0.4, taper=(0.55, 0.75), wobble=0.06, col=None):
        """One brush / marker stroke along a polyline (u, v) in mm: pressure taper at both ends, a wobble across it,
        a little weight variation along it."""
        pts = np.asarray(pts, float)
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        L = seg.sum()
        if L < 1e-6:
            return s.dot(*pts[0], weight * 0.6)
        n = max(8, int(L / 0.08))
        cum = np.concatenate([[0], np.cumsum(seg)]) / L
        t = np.linspace(0, 1, n)
        Q = np.stack([np.interp(t, cum, pts[:, 0]), np.interp(t, cum, pts[:, 1])], 1)
        T = np.gradient(Q, axis=0)
        T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9
        N = np.stack([-T[:, 1], T[:, 0]], 1)
        Q = Q + N * (wobble * s._noise(n))[:, None]
        w = weight * (1 + 0.16 * s._noise(n, 2))
        w *= np.minimum(1, taper[0] + (1 - taper[0]) * np.clip(t / 0.18, 0, 1))  # the pen lands
        w *= np.minimum(1, taper[1] + (1 - taper[1]) * np.clip((1 - t) / 0.22, 0, 1))  # and lifts
        w = np.maximum(w, 1.05 * s.px)
        lo, hi = Q.min(0) - w.max(), Q.max(0) + w.max()
        cand = s.m & (s.U > lo[0]) & (s.U < hi[0]) & (s.V > lo[1]) & (s.V < hi[1])
        if not cand.any():
            return cand
        iy, ix = np.nonzero(cand)
        X = np.stack([s.U[iy, ix], s.V[iy, ix]], 1)
        A, B = Q[:-1], Q[1:]
        AB = B - A
        ab2 = (AB ** 2).sum(1) + 1e-12
        h = np.clip(((X[:, None, :] - A[None]) * AB[None]).sum(2) / ab2[None], 0, 1)
        Pp = A[None] + h[..., None] * AB[None]
        d = np.linalg.norm(X[:, None, :] - Pp, axis=2)
        k = d.argmin(1)
        wk = w[:-1][k] * (1 - h[np.arange(len(k)), k]) + w[1:][k] * h[np.arange(len(k)), k]
        hit = d[np.arange(len(k)), k] <= wk / 2
        m = np.zeros_like(cand)
        m[iy[hit], ix[hit]] = True
        s.P.flat(m, col or s.ink)
        return m

    # ------------------------------------------------------------------ the face
    def eyes(s, spread=4.0, size=0.5, dy=0.0, uneven=0.2, shape=1.35, tilt=0.0, close=None):
        """Two solid dots `spread` mm apart (centre to centre), `size` mm half-wide and `shape` times taller, at height
        dy; one is a little bigger and they lean a touch differently (never a matched pair). close: '>' and '<'
        closed-eye strokes instead (a happy squint)."""
        r = s.rng
        for sx in (-1, 1):
            k = 1 + (uneven * (0.5 + 0.5 * r.random()) if sx == (1 if r.random() < 0.5 else -1) else 0.0)
            u, v = sx * spread / 2 + r.normal() * 0.06, dy + r.normal() * 0.07 + sx * math.tan(math.radians(tilt)) * spread / 2
            if close:
                a = size * 2.2
                s.stroke([(u - sx * a * 0.6, v + a * 0.55), (u + sx * a * 0.5, v), (u - sx * a * 0.6, v - a * 0.5)], weight=size * 0.7, wobble=0.03)
            else:
                s.dot(u, v, size * k * (1 + r.normal() * 0.05), size * shape * k * (1 + r.normal() * 0.06), rot=r.normal() * 9)

    def mouth(s, kind='upturn', w=4.0, dy=-1.5, weight=0.42, h=None, side=1, teeth=3, slant=10.0, du=0.0):
        """ONE mouth stroke centred (du, dy), w mm wide.
        upturn: a flat line, the `side` end flicking up (+1 the viewer's right); line: flat, a hint of a smile;
        dash: a short slanted dash (slant degrees); grin: a big open grin, an arched top lip, a U below and `teeth`
        tooth strokes; w: a little cat 'ω'; o: a small round 'oh'; frown: a flat line drooping at one end."""
        r = s.rng
        x0, x1 = du - w / 2, du + w / 2
        if kind in ('upturn', 'line', 'frown'):
            n = 9
            xs = np.linspace(x0, x1, n)
            ys = dy - 0.06 * w * np.sin(np.linspace(0, math.pi, n)) * (0.4 if kind == 'line' else 0.15)
            pts = list(zip(xs, ys))
            if kind != 'line':
                flick = (0.22 if kind == 'upturn' else -0.18) * w
                e = x1 if side > 0 else x0
                pts = (pts if side > 0 else pts[::-1]) + [(e + side * 0.1 * w, dy + flick * 0.55), (e + side * 0.13 * w, dy + flick)]
            return s.stroke(pts, weight, taper=(0.75, 0.6) if side > 0 else (0.6, 0.75))
        if kind == 'dash':
            a = math.radians(slant)
            return s.stroke([(du - w / 2 * math.cos(a), dy - w / 2 * math.sin(a)), (du + w / 2 * math.cos(a), dy + w / 2 * math.sin(a))],
                            weight, taper=(0.8, 0.6))
        if kind == 'grin':
            h = h or w * 0.42
            top = [(x, dy + 0.08 * h * math.sin(math.pi * (x - x0) / w)) for x in np.linspace(x0 + 0.04 * w, x1 - 0.05 * w, 9)]
            s.stroke(top, weight, taper=(0.7, 0.8))
            bot = [(x0 - 0.06 * w + (w * 1.12) * q, dy + 0.12 * h - h * math.sin(math.pi * q) ** 0.85) for q in np.linspace(0, 1, 13)]
            s.stroke(bot, weight * 0.85, taper=(0.5, 0.9))
            for i in range(teeth):
                q = (i + 1) / (teeth + 1)
                x = x0 + w * (0.08 + 0.84 * q) + r.normal() * 0.04 * w
                depth = h * math.sin(math.pi * q) ** 0.85 * (0.82 + 0.1 * r.random())
                lean = 0.12 * h * (q - 0.35)
                s.stroke([(x, dy + 0.02 * h), (x + lean, dy - depth + 0.12 * h)], weight * 0.7, taper=(0.9, 0.7), wobble=0.02)
            return None
        if kind == 'w':
            k = w / 4
            return s.stroke([(du - 2 * k, dy + 0.3 * k), (du - k, dy - 0.6 * k), (du, dy + 0.15 * k), (du + k, dy - 0.6 * k), (du + 2 * k, dy + 0.3 * k)],
                            weight, taper=(0.7, 0.7), wobble=0.03)
        if kind == 'o':
            return s.dot(du, dy, w / 2, w / 2 * 1.15, rot=r.normal() * 8)
        raise ValueError(kind)

    def blush(s, spread, dy, rx=1.6, ry=0.9, col='#f08a86', base=None):
        """Two airbrushed blush patches (cheeks), as two stepped tones of `col` over the paint (pixel art: no blur)."""
        c = _hex(col)
        for sx in (-1, 1):
            du, dv = s.U - sx * spread / 2, s.V - dy
            d = np.sqrt((du / rx) ** 2 + (dv / ry) ** 2)
            for lim, k in ((1.0, 0.35), (0.62, 0.6)):
                m = s.m & (d <= lim)
                s.P.rgb[m] = s.P.rgb[m] * (1 - k) + c * k
