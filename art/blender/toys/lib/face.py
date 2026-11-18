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
WHITE = '#f6f2ea'      # teeth
SHADE = '#cfc8be'      # the shade under the top lip
INSIDE = '#6e2a2c'     # a mouth's dark inside
TONGUE = '#e47c7c'


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

    def fill(s, poly, col):
        """Fill a closed polygon (u, v) in mm with flat paint (mouth insides, tongues, drops)."""
        poly = np.asarray(poly, float)
        lo, hi = poly.min(0), poly.max(0)
        cand = s.m & (s.U >= lo[0]) & (s.U <= hi[0]) & (s.V >= lo[1]) & (s.V <= hi[1])
        if not cand.any():
            return cand
        iy, ix = np.nonzero(cand)
        x, y = s.U[iy, ix], s.V[iy, ix]
        inside = np.zeros(len(x), bool)
        j = len(poly) - 1
        for i in range(len(poly)):  # even-odd ray casting
            xi, yi = poly[i]
            xj, yj = poly[j]
            hit = ((yi > y) != (yj > y)) & (x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi)
            inside ^= hit
            j = i
        m = np.zeros_like(cand)
        m[iy[inside], ix[inside]] = True
        s.P.flat(m, col)
        return m

    def drop(s, u, v, r=0.5, col='#bfe3f2', weight=0.3):
        """A tear / sweat / drool drop: a pointed top, a round bottom, pale blue with an ink outline."""
        pts = [(u + r * math.sin(a), v - r * 0.2 - r * math.cos(a) * 0.95) for a in np.linspace(-math.pi * 0.8, math.pi * 0.8, 11)]
        poly = [(u, v + r * 1.4)] + pts + [(u, v + r * 1.4)]
        s.fill(poly, col)
        s.stroke(poly, weight, taper=(0.9, 0.9), wobble=0.02)

    # ------------------------------------------------------------------ the face
    EYES = ('dot', 'big', 'tiny', 'happy', 'squeeze', 'sleepy', 'dizzy', 'swirl', 'wink', 'side', 'teary', 'shock')

    def eyes(s, kind='dot', spread=4.0, size=0.5, dy=0.0, uneven=0.2, shape=1.35, tilt=0.0, look=1, close=None, only=None):
        """Two eyes `spread` mm apart at height dy, in the quick-marker hand. kind:
        dot (two solid dots, never a matched pair), big, tiny, happy (^ ^ arcs), squeeze (> <), sleepy (- - lines),
        dizzy (x x), swirl (@ @), wink (a dot and a ^), side (dots glancing to `look` side), teary (dots, a drop
        under one), shock (two small rings). size: a dot's half-width (mm)."""
        if close:
            kind = 'squeeze'
        r = s.rng
        w = size * 0.75  # marker weight for the line eyes
        for sx in ((only,) if only else (-1, 1)):  # (only: one eye, the left (-1) or right (+1) one, e.g. on its own bump)
            k = 1 + (uneven * (0.5 + 0.5 * r.random()) if sx == (1 if r.random() < 0.5 else -1) else 0.0)
            u, v = sx * spread / 2 + r.normal() * 0.06, dy + r.normal() * 0.07 + sx * math.tan(math.radians(tilt)) * spread / 2
            a = size * 2.2
            kk = kind
            if kind == 'wink':
                kk = 'dot' if sx < 0 else 'happy'
            if kk in ('dot', 'big', 'tiny', 'side', 'teary'):
                f = {'big': 1.7, 'tiny': 0.62}.get(kk, 1.0)
                du = 0.32 * size * look if kk == 'side' else 0.0
                s.dot(u + du, v, size * f * k * (1 + r.normal() * 0.05), size * f * shape * k * (1 + r.normal() * 0.06), rot=r.normal() * 9)
                if kk == 'teary' and sx == look:
                    s.drop(u + 0.3 * size, v - size * 3.2, r=size * 0.9)
            elif kk == 'happy':
                s.stroke([(u - a * 0.6, v - a * 0.25), (u - a * 0.15, v + a * 0.32), (u + a * 0.15, v + a * 0.32), (u + a * 0.6, v - a * 0.25)], w, wobble=0.03)
            elif kk == 'squeeze':
                s.stroke([(u - sx * a * 0.6, v + a * 0.55), (u + sx * a * 0.5, v), (u - sx * a * 0.6, v - a * 0.5)], w, wobble=0.03)
            elif kk == 'sleepy':
                s.stroke([(u - a * 0.65, v + a * 0.05), (u, v - a * 0.08), (u + a * 0.65, v + a * 0.02)], w, wobble=0.03)
            elif kk == 'dizzy':
                s.stroke([(u - a * 0.5, v + a * 0.5), (u + a * 0.5, v - a * 0.5)], w, wobble=0.02)
                s.stroke([(u - a * 0.5, v - a * 0.5), (u + a * 0.5, v + a * 0.5)], w, wobble=0.02)
            elif kk == 'swirl':
                t = np.linspace(0, 4.2 * math.pi, 28)
                rr = a * 0.95 * t / t[-1]
                s.stroke([(u + rr[i] * math.cos(t[i]) * sx, v + rr[i] * math.sin(t[i])) for i in range(len(t))], w * 0.8, wobble=0.015, taper=(0.9, 0.7))
            elif kk == 'shock':
                t = np.linspace(0, 2 * math.pi, 14)
                s.stroke([(u + a * 0.42 * math.cos(q), v + a * 0.5 * math.sin(q)) for q in t], w * 0.8, wobble=0.02, taper=(1, 1))
                s.dot(u, v, size * 0.32)

    def brows(s, kind='angry', spread=4.0, dy=1.6, w=1.8, weight=0.38, only=None):
        """Brow strokes: angry (slanting down to the middle), worried (up in the middle), raised (one up), flat."""
        for sx in ((only,) if only else (-1, 1)):
            u = sx * spread / 2
            inner, outer = {'angry': (-0.45, 0.25), 'worried': (0.4, -0.3), 'flat': (0, 0),
                            'raised': ((0.5, 0.45) if sx > 0 else (0, 0))}.get(kind, (0, 0))
            s.stroke([(u - sx * w / 2, dy + inner * w / 2), (u + sx * w / 2, dy + outer * w / 2)], weight, wobble=0.03)

    MOUTHS = ('upturn', 'line', 'dash', 'frown', 'grin', 'gritted', 'shout', 'tongue', 'smug', 'wobble', 'pout', 'drool', 'w', 'o')

    def mouth(s, kind='upturn', w=4.0, dy=-1.5, weight=0.42, h=None, side=1, teeth=3, slant=10.0, du=0.0):
        """ONE mouth stroke centred (du, dy), w mm wide.
        upturn: a flat line, the `side` end flicking up (+1 the viewer's right); line: flat, a hint of a smile;
        dash: a short slanted dash (slant degrees); grin: a big open grin, an arched top lip, a U below and `teeth`
        tooth strokes; w: a little cat 'ω'; o: a small round 'oh'; frown: a flat line drooping at one end;
        gritted: clenched white teeth; shout: a big open mouth; tongue: a smile with the tongue out; smug: a side smile;
        wobble: a wavy ~; pout: a '3'; drool: a flat line with a drop at a corner. Grins fill the teeth white."""
        r = s.rng
        x0, x1 = du - w / 2, du + w / 2
        if kind in ('upturn', 'line', 'frown'):
            n = 9
            xs = np.linspace(x0, x1, n)
            ys = dy - 0.06 * w * np.sin(np.linspace(0, math.pi, n)) * (0.4 if kind == 'line' else 0.15)
            pts = list(zip(xs, ys))
            if kind != 'line':
                flick = (0.1 if kind == 'upturn' else -0.09) * w
                e = x1 if side > 0 else x0
                pts = (pts if side > 0 else pts[::-1]) + [(e + side * 0.05 * w, dy + flick * 0.35), (e + side * 0.085 * w, dy + flick)]
            return s.stroke(pts, weight, taper=(0.75, 0.6) if side > 0 else (0.6, 0.75))
        if kind == 'dash':
            a = math.radians(slant)
            return s.stroke([(du - w / 2 * math.cos(a), dy - w / 2 * math.sin(a)), (du + w / 2 * math.cos(a), dy + w / 2 * math.sin(a))],
                            weight, taper=(0.8, 0.6))
        if kind in ('grin', 'gritted'):  # the owner's grin: an ink outline, the teeth WHITE, ink separators
            h = h or w * 0.42
            top = [(x, dy + 0.08 * h * math.sin(math.pi * (x - x0) / w)) for x in np.linspace(x0 + 0.04 * w, x1 - 0.05 * w, 9)]
            if kind == 'grin':
                bot = [(x0 - 0.06 * w + (w * 1.12) * q, dy + 0.12 * h - h * math.sin(math.pi * q) ** 0.85) for q in np.linspace(0, 1, 13)]
            else:  # gritted: a squarer box of clenched teeth
                bot = [(x0 + 0.02 * w + (w * 0.92) * q, dy - h * 0.62 * min(1, 4 * q, 4 * (1 - q)) ** 0.5) for q in np.linspace(0, 1, 11)]
            poly = top + bot[::-1]
            s.fill(poly, WHITE)
            # a light grey shade under the top lip
            s.fill(top + [(x, y - 0.18 * h) for x, y in top[::-1]], SHADE)
            s.stroke(top, weight, taper=(0.7, 0.8))
            s.stroke(bot, weight * 0.85, taper=(0.5, 0.9))
            for i in range(teeth):
                q = (i + 1) / (teeth + 1)
                x = x0 + w * (0.08 + 0.84 * q) + r.normal() * 0.04 * w
                if kind == 'grin':
                    depth = h * math.sin(math.pi * q) ** 0.85 * (0.82 + 0.1 * r.random())
                    lean = 0.18 * h + 0.1 * h * (q - 0.5)  # (a quick hand: the strokes all lean the same way)
                    s.stroke([(x - lean * 0.4, dy), (x + lean * 0.6, dy - depth * 0.86 + 0.12 * h)], weight * 0.7, taper=(0.9, 0.7), wobble=0.02)
                else:
                    s.stroke([(x, dy), (x + 0.05 * h, dy - h * 0.5)], weight * 0.6, taper=(0.9, 0.8), wobble=0.015)
            if kind == 'gritted':
                s.stroke([(x0 + 0.1 * w, dy - h * 0.3), (x1 - 0.1 * w, dy - h * 0.3)], weight * 0.55, wobble=0.02)
            return None
        if kind == 'shout':  # a big open shout: dark inside, a pink tongue, white top teeth, the ink rim
            h = h or w * 0.8
            ring = [(du + w / 2 * math.sin(a) * (1 - 0.15 * math.cos(a)), dy - h / 2 + h / 2 * math.cos(a)) for a in np.linspace(0, 2 * math.pi, 18)]
            s.fill(ring, INSIDE)
            s.fill([(du + w / 2 * 0.7 * math.sin(a), dy - h * 0.82 + h * 0.22 * math.cos(a)) for a in np.linspace(-1.6, 1.6, 9)], TONGUE)
            s.fill([(du - w * 0.32, dy - 0.02 * h), (du + w * 0.32, dy - 0.02 * h), (du + w * 0.3, dy - 0.2 * h), (du - w * 0.3, dy - 0.2 * h)], WHITE)
            return s.stroke(ring, weight, taper=(1, 1), wobble=0.03)
        if kind == 'tongue':  # a smile with the tongue poking out under it
            xs = np.linspace(x0, x1, 9)
            sm = [(x, dy - 0.12 * w * math.sin(math.pi * (x - x0) / w)) for x in xs]
            tu = du + 0.12 * w * side
            lobe = [(tu - 0.2 * w, dy - 0.1 * w)] + [(tu + 0.2 * w * math.cos(a), dy - 0.14 * w - 0.22 * w * math.sin(a)) for a in np.linspace(math.pi, 2 * math.pi, 9)][1:] + [(tu + 0.2 * w, dy - 0.1 * w)]
            lobe = [(x, y) for x, y in lobe]
            s.fill(lobe, TONGUE)
            s.stroke(lobe, weight * 0.75, taper=(0.9, 0.9), wobble=0.02)
            s.stroke([(tu, dy - 0.13 * w), (tu, dy - 0.24 * w)], weight * 0.5, wobble=0.01)
            return s.stroke(sm, weight)
        if kind == 'smug':  # a short side smile, off-centre, one corner tucked up
            x0, x1 = du + side * 0.05 * w, du + side * 0.5 * w
            pts = [(x0 + (x1 - x0) * q, dy + 0.02 * w * math.sin(math.pi * q) - (0.0 if q < 0.7 else 0.0)) for q in np.linspace(0, 1, 7)]
            pts += [(x1 + side * 0.06 * w, dy + 0.1 * w), (x1 + side * 0.05 * w, dy + 0.16 * w)]
            return s.stroke(pts, weight, taper=(0.6, 0.6))
        if kind == 'wobble':  # a wavy ~ (nervous, queasy)
            xs = np.linspace(x0, x1, 15)
            return s.stroke([(x, dy + 0.07 * w * math.sin((x - x0) / w * 4 * math.pi)) for x in xs], weight, taper=(0.7, 0.7))
        if kind == 'pout':  # a little '3' on its side: two bumps pushed forward
            k = w / 3.2
            pts = [(du - 0.1 * k, dy + 0.9 * k), (du + 0.45 * k, dy + 0.55 * k), (du + 0.05 * k, dy + 0.05 * k), (du + 0.45 * k, dy - 0.45 * k), (du - 0.1 * k, dy - 0.85 * k)]
            return s.stroke(pts, weight, taper=(0.8, 0.7), wobble=0.02)
        if kind == 'drool':  # a flat line, a drop hanging from one corner
            s.stroke([(x0, dy), (x1, dy - 0.03 * w)], weight, taper=(0.7, 0.7))
            return s.drop(x1 - 0.08 * w if side > 0 else x0 + 0.08 * w, dy - 0.32 * w, r=0.09 * w)
        if kind == 'w':
            k = w / 4
            return s.stroke([(du - 2 * k, dy + 0.3 * k), (du - k, dy - 0.6 * k), (du, dy + 0.15 * k), (du + k, dy - 0.6 * k), (du + 2 * k, dy + 0.3 * k)],
                            weight, taper=(0.7, 0.7), wobble=0.03)
        if kind == 'o':  # a small round 'oh': an ink ring, dark inside
            t = np.linspace(0, 2 * math.pi, 14)
            ring = [(du + w * 0.24 * math.cos(q), dy + w * 0.29 * math.sin(q)) for q in t]
            s.fill(ring, INSIDE)
            return s.stroke(ring, weight * 0.9, taper=(1, 1), wobble=0.02)
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
