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

In facet mode (lib/facet.py) the same calls paint real brushwork: uneven ink density with bristle streaks, a tapered
dry-brush edge, ink pooled darker where a stroke lands and lifts (and low in a dot), and blush dabbed on as stipple.
"""
import math
import os

import numpy as np

INK = '#1b1513'
WHITE = '#f6f2ea'      # teeth
SHADE = '#cfc8be'      # the shade under the top lip
INSIDE = '#6e2a2c'     # a mouth's dark inside
TONGUE = '#e47c7c'
# the richer hand-drawn kit (faces_v3: inked eye shapes with a dabbed catchlight, lid strokes, lash ticks, tapered
# brows, hatched or dabbed cheeks, corner ticks, open mouths, sweat / anger marks, freckles): GG_FACE_V3=1 turns it
# on for a build; it becomes the default once the owner approves the sheet (art/blender/toys/faces.py)
V3 = os.environ.get('GG_FACE_V3', '1') == '1'  # (the owner approved the kit: on by default; GG_FACE_V3=0 for the old marker dots)
CATCH = '#f3ede0'      # the off-white dab of a catchlight
HATCH = '#d9505c'      # cheek hatching
ANGER = '#cf3b2e'      # an anger mark
FRECKLE = '#9a5a3c'
BOLD = 1.55            # the kit's graphic ink: confident, heavier strokes ...
STEADY = 0.45          # ... and a steadier hand (less wobble): bold simple shapes, nothing fussy or realistic


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
        s._used = False  # (a fresh face whose first mark is a dot() is an eye on its own knob: drawn as the species' eye)
        s.sp = None  # the species style (STYLE) the face is drawn in; set from the figure (SPECIES) when the kit is on
        if V3:
            try:
                import facet
                f = facet.FIG
                s.sp = STYLE.get(SPECIES.get(f'{f.series}/{f.id}', SPECIES.get(f.id))) if f is not None else None
                if s.sp:  # each figure its own take on its species: the slant and lids vary a little
                    import zlib
                    h = zlib.crc32(f'{f.series}/{f.id}'.encode())
                    s.sp = dict(s.sp, tilt=s.sp.get('tilt', 0) + (h % 9) - 4, lid=s.sp.get('lid', bool(h & 16)))
            except Exception:  # noqa: BLE001
                s.sp = None

    def species(s, name):
        """Draw this face in a species' style (STYLE): eye shape and slant, lids, lashes, brows, its mouth, extras."""
        s.sp = STYLE.get(name)
        return s

    # ------------------------------------------------------------------ brushwork (facet mode)
    def _brush(s, m, cov, pool=None, thin=None):
        """Lay ink by coverage: full ink where cov >= 1, a thin glaze of ink (uneven density, the dry edge) where
        0 < cov < 1, pooled darker ink on `pool`."""
        P = s.P
        ink = _hex(s.ink)
        lum = float(ink @ np.array([0.3, 0.59, 0.11]))
        dark = ink * 0.62 if lum < 0.5 else ink * 0.86
        full = m & (cov >= 1)
        part = m & (cov > 0) & (cov < 1)
        P.rgb[part] = P.rgb[part] * 0.42 + ink * 0.58
        P.idx[part] = -2
        P.flat(full, ink)
        if thin is not None:
            tm = full & thin
            P.rgb[tm] = P.rgb[tm] * 0.22 + ink * 0.78
        if pool is not None:
            P.flat(full & pool, dark)
        return full | part

    def _bristles(s, x, nb=9):
        """Per-texel bristle value 0..1 from a coordinate across the stroke (streaks run along it)."""
        r = s.rng.random(nb + 1)
        i = np.clip((x * 0.5 + 0.5) * nb, 0, nb).astype(int)
        return r[i]

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
        first, s._used = not s._used, True
        if first and s.sp and s.sp.get('eye') in ('bar', 'slit', 'round', 'pin', 'compound'):
            k = s.sp.get('eyek', 1.5) * 1.15
            return s.eye(u, v, 2 * rx * k, 2 * ry * k, s.sp['eye'], sx=1 if u >= 0 else -1, rot=rot)
        rx, ry = max(rx, 1.1 * s.px), max(ry, 1.4 * s.px)
        cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        du, dv = s.U - u, s.V - v
        uu, vv = du * cr + dv * sr, -du * sr + dv * cr
        th = np.arctan2(vv / ry, uu / rx)
        ph = s.rng.random(3) * 2 * math.pi
        lk = STEADY if V3 else 1.0  # (the kit: a cleaner, bolder blob)
        rr = 1 + lk * (0.09 * np.sin(2 * th + ph[0]) + 0.06 * np.sin(3 * th + ph[1]) + 0.04 * np.sin(5 * th + ph[2]))
        BIG = 14  # (texels: a smaller mark is solid ink with only its edge wobble; dry brush and pooling smear it)
        if getattr(s.P, 'facet', False) and 2 * max(rx, ry) / s.px >= BIG:  # a big brush dab: dry ragged rim, ink pooled low
            d = np.sqrt((uu / rx) ** 2 + (vv / ry) ** 2) / rr
            cand = s.m & (d <= 1.12)
            br = s._bristles(np.cos(th * 2 + ph[0]), 12)
            cov = np.where(d <= 0.8, 1.0, np.where(br > 0.5, 1.0, np.where(br > 0.22, 0.5, 0.0)))
            return s._brush(cand, cov, pool=(vv / ry < -0.38) & (d < 0.85))
        m = s.m & ((uu / rx) ** 2 + (vv / ry) ** 2 <= rr ** 2)
        s.P.flat(m, s.ink)
        return m

    def stroke(s, pts, weight=0.4, taper=(0.55, 0.75), wobble=0.06, col=None):
        """One brush / marker stroke along a polyline (u, v) in mm: pressure taper at both ends, a wobble across it,
        a little weight variation along it."""
        pts = np.asarray(pts, float)
        if V3:
            weight, wobble = weight * BOLD, wobble * STEADY
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
        if getattr(s.P, 'facet', False) and col is None and weight / s.px >= 14:  # a big brush stroke: bristle streaks, a dry edge, pooled ends
            hk = h[np.arange(len(k)), k]
            tt = (k + hk) / (n - 1)
            AB_k = AB[k]
            side = np.sign(AB_k[:, 0] * (X[:, 1] - A[k][:, 1]) - AB_k[:, 1] * (X[:, 0] - A[k][:, 0]))
            dn = side * d[np.arange(len(k)), k] / np.maximum(wk / 2, 1e-6)
            br = s._bristles(np.clip(dn, -1, 1), 9)
            a = np.abs(dn)
            cov = np.where(a <= 0.72, 1.0, np.where(a <= 1.12, np.where(br > 0.45, 1.0, np.where(br > 0.2, 0.5, 0.0)), 0.0))
            ends = (np.minimum(tt, 1 - tt) * L < 0.6 * weight) & (a < 0.8)
            thin = (br < 0.2) & (tt > 0.25) & (tt < 0.75)
            m = np.zeros_like(cand)
            cv = np.zeros(cand.shape)
            pl = np.zeros_like(cand)
            th_ = np.zeros_like(cand)
            m[iy, ix] = cov > 0
            cv[iy, ix] = cov
            pl[iy, ix] = ends
            th_[iy, ix] = thin
            return s._brush(m, cv, pool=pl, thin=th_)
        hit = d[np.arange(len(k)), k] <= wk / 2
        m = np.zeros_like(cand)
        m[iy[hit], ix[hit]] = True
        s.P.flat(m, col or s.ink)
        return m

    def fill(s, poly, col):
        """Fill a closed polygon (u, v) in mm with flat paint (mouth insides, tongues, drops)."""
        m = s._inside(poly)
        if m.any():
            s.P.flat(m, col)
        return m

    def _inside(s, poly):
        """The face texels inside a closed polygon (u, v) in mm."""
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
        return m

    def drop(s, u, v, r=0.5, col='#bfe3f2', weight=0.3):
        """A tear / sweat / drool drop: a pointed top, a round bottom, pale blue with an ink outline."""
        pts = [(u + r * math.sin(a), v - r * 0.2 - r * math.cos(a) * 0.95) for a in np.linspace(-math.pi * 0.8, math.pi * 0.8, 11)]
        poly = [(u, v + r * 1.4)] + pts + [(u, v + r * 1.4)]
        s.fill(poly, col)
        s.stroke(poly, weight, taper=(0.9, 0.9), wobble=0.02)


    # ------------------------------------------------------------------ animal features (the same marker hand)
    def nose(s, kind='tri', du=0.0, dy=0.0, size=0.6, col=None):
        """tri (cat, rabbit: a small rounded inverted triangle), button (dog, bear: a solid oval), snout (pig: an oval
        with two nostril dots), nostrils (frog, horse: two tiny dots), beak (bird: a filled wedge), beak_open."""
        k = size
        if kind == 'tri':
            poly = [(du - k, dy + 0.45 * k), (du + k, dy + 0.5 * k), (du + 0.08 * k, dy - 0.75 * k)]
            s.fill(poly, col or INK)
            return s.stroke(poly + [poly[0]], 0.3 * k, taper=(1, 1), wobble=0.02, col=col)
        if kind == 'button':
            return s.dot(du, dy, k * 0.95, k * 0.7, rot=s.rng.normal() * 6)
        if kind == 'snout':
            ring = [(du + 1.5 * k * math.cos(a), dy + 1.05 * k * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 16)]
            s.fill(ring, col or '#f2a0a8')
            s.stroke(ring, 0.32 * k, taper=(1, 1), wobble=0.02)
            s.dot(du - 0.55 * k, dy, 0.24 * k, 0.4 * k)
            return s.dot(du + 0.55 * k, dy, 0.22 * k, 0.38 * k)
        if kind == 'nostrils':
            s.dot(du - 0.6 * k, dy, 0.16 * k, 0.2 * k)
            return s.dot(du + 0.6 * k, dy + 0.04 * k, 0.15 * k, 0.19 * k)
        if kind in ('beak', 'beak_open'):
            top = [(du - 1.1 * k, dy + 0.35 * k), (du + 1.1 * k, dy + 0.35 * k), (du, dy - 1.0 * k)]
            if kind == 'beak_open':
                top = [(du - 1.1 * k, dy + 0.35 * k), (du + 1.1 * k, dy + 0.35 * k), (du, dy - 0.45 * k)]
                low = [(du - 0.75 * k, dy - 0.55 * k), (du + 0.75 * k, dy - 0.55 * k), (du, dy - 1.35 * k)]
                s.fill([(du - 0.8 * k, dy - 0.2 * k), (du + 0.8 * k, dy - 0.2 * k), (du, dy - 1.1 * k)], INSIDE)
                s.fill(low, col or '#f0a830')
                s.stroke(low + [low[0]], 0.28 * k, taper=(1, 1), wobble=0.02)
            s.fill(top, col or '#f0a830')
            return s.stroke(top + [top[0]], 0.3 * k, taper=(1, 1), wobble=0.02)
        raise ValueError(kind)

    def patch(s, du, dy, rx, ry, col, rot=0.0, lumpy=0.06):
        """A painted patch (a muzzle, panda eye patches, a tanuki mask, a belly blaze): a lumpy filled oval."""
        ph = s.rng.random(2) * 6.3
        pts = []
        for a in np.linspace(0, 2 * math.pi, 22, endpoint=False):
            r = 1 + lumpy * math.sin(3 * a + ph[0]) + lumpy * 0.6 * math.sin(5 * a + ph[1])
            x, y = rx * r * math.cos(a), ry * r * math.sin(a)
            c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
            pts.append((du + x * c - y * sn, dy + x * sn + y * c))
        return s.fill(pts, col)

    def snout_mouth(s, kind='Y', du=0.0, dy=0.0, w=2.0, weight=0.38):
        """Animal mouths hung under a nose at (du, dy): Y (dog, bear: a stroke down, two curves out), cat (a small
        omega), rabbit (a little x under a Y)."""
        if kind == 'cat':
            return s._mouth('w', w=w, dy=dy - 0.3 * w, du=du, weight=weight)
        s.stroke([(du, dy), (du + 0.02 * w, dy - 0.35 * w)], weight, wobble=0.015)
        for sx in (-1, 1):
            s.stroke([(du, dy - 0.35 * w), (du + sx * 0.25 * w, dy - 0.55 * w), (du + sx * 0.5 * w, dy - 0.42 * w)], weight, taper=(0.9, 0.6), wobble=0.02)
        if kind == 'rabbit':
            s.stroke([(du - 0.15 * w, dy - 0.62 * w), (du + 0.15 * w, dy - 0.85 * w)], weight * 0.7)
            s.stroke([(du + 0.15 * w, dy - 0.62 * w), (du - 0.15 * w, dy - 0.85 * w)], weight * 0.7)

    def fangs(s, du=0.0, dy=0.0, gap=1.4, n=2, size=0.5):
        """One or two tiny white fangs peeking down from a mouth line, ink outlined."""
        for i in range(n):
            x = du + (i - (n - 1) / 2) * gap
            tri = [(x - 0.45 * size, dy), (x + 0.45 * size, dy), (x + 0.05 * size, dy - 1.0 * size)]
            s.fill(tri, WHITE)
            s.stroke(tri, 0.22 * size + 0.12, taper=(1, 1), wobble=0.01)

    def blep(s, du=0.0, dy=0.0, w=1.0):
        """A tongue blep: a little pink lobe poking out under the mouth."""
        lobe = [(du - 0.5 * w, dy)] + [(du + 0.5 * w * math.cos(a), dy - 0.15 * w - 0.55 * w * math.sin(a)) for a in np.linspace(math.pi, 2 * math.pi, 9)] + [(du + 0.5 * w, dy)]
        s.fill(lobe, TONGUE)
        s.stroke(lobe, 0.22 * w + 0.1, taper=(1, 1), wobble=0.015)

    def whiskers(s, du=0.0, dy=0.0, spread=2.4, n=3, length=2.8, weight=0.26, dots=False):
        """Whiskers: n uneven strokes fanning out each side of (du, dy); dots: whisker dots on the muzzle instead."""
        r = s.rng
        for sx in (-1, 1):
            for i in range(n):
                a = math.radians((i - (n - 1) / 2) * 14 + r.normal() * 4)
                x0, y0 = du + sx * spread / 2, dy + (i - (n - 1) / 2) * 0.35
                if dots:
                    s.dot(x0 - sx * 0.2 * i, y0, 0.14, 0.16)
                    continue
                L = length * (0.85 + 0.3 * r.random())
                s.stroke([(x0, y0), (x0 + sx * L * math.cos(a), y0 + L * math.sin(a))], weight, taper=(0.8, 0.4), wobble=0.04)

    def tufts(s, du=0.0, dy=0.0, spread=7.0, size=1.0, weight=0.3):
        """Cheek tufts: a little zig-zag of fur sticking out each side (fox, cat, tanuki)."""
        for sx in (-1, 1):
            x = du + sx * spread / 2
            s.stroke([(x, dy + 0.5 * size), (x + sx * 0.7 * size, dy + 0.2 * size), (x + sx * 0.2 * size, dy - 0.05 * size),
                      (x + sx * 0.8 * size, dy - 0.35 * size), (x, dy - 0.55 * size)], weight, taper=(0.7, 0.7), wobble=0.02)

    def marks(s, kind='tabby', du=0.0, dy=0.0, size=1.0, col=None, weight=0.34):
        """Forehead and face marks: tabby (an M), stripes (tiger: three a side), tanuki (a dark mask round the eyes),
        panda (black eye patches), blaze (a pale stripe down the middle)."""
        k = size
        if kind == 'tabby':
            return s.stroke([(du - 1.4 * k, dy), (du - 0.9 * k, dy + 1.0 * k), (du, dy + 0.2 * k), (du + 0.9 * k, dy + 1.0 * k), (du + 1.4 * k, dy)],
                            weight, taper=(0.7, 0.7), wobble=0.03, col=col)
        if kind == 'stripes':
            for sx in (-1, 1):
                for i in range(3):
                    y = dy + (i - 1) * 0.9 * k
                    s.stroke([(du + sx * 4.6 * k, y + 0.2 * k), (du + sx * 3.2 * k, y)], weight * 1.2, taper=(0.9, 0.3), wobble=0.03, col=col)
            return s.stroke([(du - 0.3 * k, dy + 2.6 * k), (du, dy + 1.6 * k), (du + 0.3 * k, dy + 2.6 * k)], weight * 1.2, wobble=0.02, col=col)
        if kind == 'tanuki':
            for sx in (-1, 1):
                s.patch(du + sx * 1.9 * k, dy, 1.7 * k, 1.05 * k, col or '#3a2c24', rot=-sx * 18)
            return None
        if kind == 'panda':
            for sx in (-1, 1):
                s.patch(du + sx * 1.9 * k, dy - 0.1 * k, 1.05 * k, 1.45 * k, col or '#1e1a1c', rot=sx * 28)
            return None
        if kind == 'blaze':
            return s.patch(du, dy, 0.7 * k, 2.6 * k, col or '#f4efe4')
        raise ValueError(kind)

    # ------------------------------------------------------------------ the v3 hand-drawn kit
    def _lumpy(s, u, v, rx, ry, lumpy=0.1, rot=0.0, n=20):
        ph = s.rng.random(2) * 6.283
        c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        pts = []
        for a in np.linspace(0, 2 * math.pi, n, endpoint=False):
            r = 1 + lumpy * (0.6 * math.sin(2 * a + ph[0]) + 0.4 * math.sin(3 * a + ph[1]))
            x, y = rx * r * math.cos(a), ry * r * math.sin(a)
            pts.append((u + x * c - y * sn, v + x * sn + y * c))
        return pts

    def dab(s, u, v, r, col, lumpy=0.22):
        """A small hand-dabbed spot of paint (a catchlight, a freckle): an uneven blob, never a perfect circle."""
        r = max(r, 0.9 * s.px)
        return s.fill(s._lumpy(u, v, r * (1 + 0.15 * s.rng.normal()), r * 0.82, lumpy, rot=s.rng.normal() * 40, n=12), col)

    def eye(s, u, v, w, h, shape='oval', sx=1, catch=True, lid=None, lashes=0, lower=False, rot=0.0):
        """One hand-inked eye centred (u, v), w x h mm, sx the side (-1 the figure's right, as the viewer sees it on
        the left). shape: oval, bean (pinched on the inner side), halfmoon (a dome, flat underneath), lid (sleepy: the
        top cut off by a heavy lid line). catch: a dabbed off-white catchlight up and to the outside; lid: an upper-lid
        stroke over the eye (default on big eyes); lashes: little ticks at the outer corner; lower: a lower-lid mark."""
        rx, ry = w / 2, h / 2
        c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        R = lambda x, y: (u + x * c - y * sn, v + x * sn + y * c)  # noqa: E731
        t = np.linspace(0, 2 * math.pi, 26, endpoint=False)
        if shape == 'bean':
            pts = [R(rx * math.cos(a), ry * math.sin(a) * (1 - 0.32 * max(0.0, -math.cos(a) * sx) ** 2)) for a in t]
        elif shape == 'halfmoon':
            top = [R(rx * math.cos(a), -0.15 * ry + 1.15 * ry * math.sin(a)) for a in np.linspace(0, math.pi, 14)]
            bot = [R(rx * math.cos(a), -0.15 * ry - 0.18 * ry * math.sin(a)) for a in np.linspace(math.pi, 2 * math.pi, 8)[1:-1]]
            pts = top + bot
        elif shape == 'lid':
            pts = [R(rx * math.cos(a), min(ry * math.sin(a), 0.2 * ry)) for a in t]
        else:
            pts = s._lumpy(u, v, rx, ry, 0.03, rot)
        if shape == 'compound':  # an isopod's / insect's compound eye: a solid dark kidney, a fine facet hatch, no pupil
            return s._compound(u, v, w, h, sx, rot)
        if shape in ('bar', 'slit', 'round', 'pin', 'compound'):  # a real animal eye: a coloured iris, an ink rim, the species' pupil
            iris = (s.sp or {}).get('iris', '#d9a43a')
            m = s.fill(pts, iris)
            s.stroke(pts + [pts[0]], max(0.1, 0.16 * w), taper=(1, 1), wobble=0.005)
            if shape == 'bar':    # octopus, goat, toad: a horizontal bar
                s.fill(s._lumpy(u, v, rx * 0.72, ry * 0.2, 0.04, rot), s.ink)
            elif shape == 'slit':  # cat, croc, snake, gecko: a vertical slit
                s.fill(s._lumpy(u, v, rx * 0.17, ry * 0.85, 0.04, rot), s.ink)
            elif shape == 'round':  # owl, fish, bird: a big round pupil
                s.fill(s._lumpy(u, v, rx * 0.5, ry * 0.5, 0.04, rot), s.ink)
            else:                  # pin: a small pupil (fish, frog)
                s.fill(s._lumpy(u, v, rx * 0.3, ry * 0.3, 0.04, rot), s.ink)
            return m
        m = s.fill(pts, s.ink)
        big = w / s.px >= 12
        if shape == 'lid' or (lid if lid is not None else big):  # the upper lid: a brush stroke over the top
            k0, k1 = (0.98, 0.12) if shape != 'lid' else (1.06, -0.06)
            arc = [R(rx * 1.12 * math.cos(a) + sx * 0.1 * rx, (0.2 * ry if shape == 'lid' else ry * k0 * math.sin(a)) + 0.06 * ry)
                   for a in np.linspace(math.pi * k1 if sx < 0 else math.pi * (1 - k1), math.pi * (1 - k1) if sx < 0 else math.pi * k1, 7)]
            s.stroke(arc, max(0.12, 0.2 * w), taper=(0.6, 0.95) if sx > 0 else (0.95, 0.6), wobble=0.01)
        for i in range(lashes):  # little lash ticks at the outer corner
            a = math.radians(25 + 22 * i)
            x0, y0 = sx * rx * math.cos(a) * 1.02, ry * math.sin(a) * 1.02
            s.stroke([R(x0, y0), R(x0 + sx * 0.4 * ry * math.cos(a + 0.5), y0 + 0.45 * ry * math.sin(a + 0.5) + 0.12 * ry)],
                     max(0.1, 0.14 * w), taper=(1, 0.2), wobble=0.003)
        if lower:  # a lower-lid mark
            s.stroke([R(rx * 0.95 * math.cos(a), -ry * 1.35 * abs(math.sin(a)) - 0.1 * ry) for a in np.linspace(math.pi * 1.2, math.pi * 1.8, 5)],
                     max(0.07, 0.08 * w), taper=(0.6, 0.6), wobble=0.01)
        return m  # (solid ink: no catchlight, white or highlight inside an eye, the owner's rule)

    def _compound(s, u, v, w, h, sx, rot):
        """A compound eye (giant isopod, insects) in ink: a dark kidney lying along the head's edge, its outer end up
        and its hollow facing up and in; inside it a fine facet hatch (two crossing line sets, a honeycomb-ish net) a
        step lighter than the ink, and a solid ink rim. No pupil, no catchlight, no white."""
        rx = 0.5 * max(w, h) * 1.05
        ry = rx * 0.56
        c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        R = lambda x, y: (u + x * c - y * sn, v + x * sn + y * c)  # noqa: E731

        def kidney(kx, ky):
            pts = []
            for a in np.linspace(0, 2 * math.pi, 40, endpoint=False):
                x, y = kx * math.cos(a), ky * math.sin(a)
                if y > 0:  # the hollow on the upper long side (the kidney's hilum), a little towards the inner end
                    y -= 0.5 * ky * math.exp(-((x / kx + 0.12 * sx) ** 2) / 0.16) * math.sin(a)
                y *= 1 + 0.1 * (x / kx) * sx  # the outer end a touch fuller
                pts.append(R(x, y))
            return pts
        iris = (s.sp or {}).get('iris', '#2c2832')
        m = s.fill(kidney(rx, ry), iris)
        inner = s._inside(kidney(rx * 0.8, ry * 0.68)) & m
        if inner.any():  # the facets: two line sets 60 degrees apart, a texel wide, a step lighter
            du, dv = s.U - u, s.V - v
            sp = max(4.6 * s.px, 0.3 * ry)
            lw = min(0.4, 1.0 * s.px / sp)
            hit = np.zeros_like(inner)
            for ang in (rot + 58, rot + 122):  # (a diamond net: at this texel size a third set turns to speckle)
                ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
                d = (du * ca + dv * sa) / sp + 0.5
                hit |= np.abs(np.mod(d, 1.0) - 0.5) > 0.5 - lw / 2
            s.P.flat(inner & hit, (s.sp or {}).get('facet', '#4e4858'))
        pts = kidney(rx, ry)
        s.stroke(pts + [pts[0]], max(0.1, 0.12 * w), taper=(1, 1), wobble=0.005)
        return m

    def anger(s, du, dy, size=1.0, col=ANGER):
        """An anger mark: four short curved strokes popping out of a corner (the manga vein cross)."""
        k = size
        for qx, qy in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
            s.stroke([(du + qx * 0.25 * k, dy + qy * 0.75 * k), (du + qx * 0.32 * k, dy + qy * 0.32 * k), (du + qx * 0.75 * k, dy + qy * 0.25 * k)],
                     0.16 * k + 0.04, taper=(0.7, 0.7), wobble=0.01, col=col)

    def freckles(s, du, dy, spread=4.0, n=3, size=0.12, col=FRECKLE):
        """A few freckle dabs on each cheek."""
        for sx in (-1, 1):
            for i in range(n):
                s.dab(du + sx * (spread / 2 + (i - (n - 1) / 2) * 0.45 + s.rng.normal() * 0.08), dy + (0.2 if i % 2 else -0.15) + s.rng.normal() * 0.06, size, col)

    def sweat(s, du, dy, r=0.5):
        return s.drop(du, dy, r)

    def ticks(s, x0, x1, dy, w, weight):
        """Small corner ticks at both ends of a mouth line (a dimple-like flick)."""
        for x, sgn in ((x0, -1), (x1, 1)):
            s.stroke([(x + sgn * 0.02 * w, dy + 0.1 * w), (x - sgn * 0.03 * w, dy - 0.06 * w)], weight * 0.55, taper=(0.9, 0.4), wobble=0.005)

    # ------------------------------------------------------------------ the face
    EYES = ('dot', 'big', 'tiny', 'happy', 'squeeze', 'sleepy', 'dizzy', 'swirl', 'wink', 'side', 'teary', 'shock')

    def eyes(s, kind='dot', spread=4.0, size=0.5, dy=0.0, uneven=0.2, shape=1.35, tilt=0.0, look=1, close=None, only=None,
             catch=True, lid=None, lashes=0, lower=False, style=None):
        """Two eyes `spread` mm apart at height dy, in the quick-marker hand. kind:
        dot (two solid dots, never a matched pair), big, tiny, happy (^ ^ arcs), squeeze (> <), sleepy (- - lines),
        dizzy (x x), swirl (@ @), wink (a dot and a ^), side (dots glancing to `look` side), teary (dots, a drop
        under one), shock (two small rings). size: a dot's half-width (mm).
        v3 kit (V3): oval, bean, halfmoon, lid (sleepy lid) are inked eye shapes with a dabbed catchlight (catch), an
        upper-lid stroke on big eyes (lid), lash ticks (lashes = n) and lower-lid marks (lower); with V3 on, dot / big /
        side / teary eyes are drawn as ovals (style: the shape to use instead)."""
        s._used = True
        if close:
            kind = 'squeeze'
        sp = s.sp if (s.sp and not only) else None
        if sp and kind in ('dot', 'big', 'side', 'teary', 'tiny', 'oval', 'bean', 'halfmoon', 'lid'):
            style = sp.get('eye', style)
            kind = 'tiny' if style == 'tiny' else ('side' if kind == 'side' else 'dot')
            size *= sp.get('size', 1.0)
            spread *= sp.get('spread', 1.0)
            tilt = sp.get('tilt', tilt)
            lid = sp.get('lid', lid)
            lashes = sp.get('lashes', lashes)
            lower = sp.get('lower', lower)
            uneven = sp.get('uneven', uneven)
            if sp.get('look'):
                kind, look = 'side', sp['look']
            if sp.get('brows') and size / s.px >= 5:  # (a small face gets no brows: they merge with the eyes into a mask)
                bk, bw = sp['brows'] if isinstance(sp['brows'], tuple) else (sp['brows'], 1.0)
                ek = 1.15 * (sp.get('eyek', 1.5) if sp.get('eye') in ('bar', 'slit', 'round', 'pin', 'compound') else 1.0)
                s.brows(bk, spread * 1.02, dy + size * shape * ek * 1.15 + max(0.45, 4 * s.px), size * 2.4, max(0.14, size * 0.34) * bw)
        r = s.rng
        w = size * 0.75  # marker weight for the line eyes
        for sx in ((only,) if only else (-1, 1)):  # (only: one eye, the left (-1) or right (+1) one, e.g. on its own bump)
            k = 1 + (uneven * (0.5 + 0.5 * r.random()) if sx == (1 if r.random() < 0.5 else -1) else 0.0)
            u, v = sx * spread / 2 + r.normal() * 0.06, dy + r.normal() * 0.07
            a = size * 2.2
            kk = kind
            if kind == 'wink':
                kk = 'dot' if sx < 0 else 'happy'
            if V3 and kk in ('dot', 'big', 'side', 'teary') and not (style is None and size * 2 / s.px < 5):
                kk = style or 'oval'
            if kk in ('oval', 'bean', 'halfmoon', 'lid', 'bar', 'slit', 'round', 'pin', 'compound'):
                f = 1.15  # (the kit: bold, graphic eye shapes)
                if kk in ('bar', 'slit', 'round', 'pin', 'compound'):
                    f *= (sp or {}).get('eyek', 1.5)
                    for feat in (sp or {}).get('around', ()):  # what the species has round each eye
                        R_ = size * f * 1.25
                        if feat == 'bulge':   # a raised eye bulge (octopus, frog)
                            s.stroke([(u + R_ * 1.35 * math.cos(a), v + R_ * 1.25 * math.sin(a)) for a in np.linspace(0.15, math.pi - 0.15, 9)], max(0.12, size * 0.3), taper=(0.4, 0.4))
                        elif feat == 'disc':  # an owl's facial disc
                            s.stroke([(u + R_ * 2.0 * math.cos(a), v + R_ * 1.9 * math.sin(a) - 0.2 * R_) for a in np.linspace(-0.7 if sx > 0 else math.pi * 0.35, math.pi * 0.65 if sx > 0 else math.pi + 0.7, 12)], max(0.12, size * 0.28), taper=(0.3, 0.3))
                        elif feat == 'patch':  # dark eye patches (tanuki, raccoon dog, panda-ish dogs)
                            s.patch(u, v - 0.1 * R_, R_ * 1.6, R_ * 1.1, (sp or {}).get('patch', '#3a2c24'), rot=-sx * 16)
                        elif feat == 'stalk':  # crab eyes on stalks
                            s.stroke([(u, v - R_ * 1.0), (u - sx * 0.1 * R_, v - R_ * 2.6)], max(0.14, size * 0.45), taper=(1, 1))
                        elif feat == 'ring':  # a fish's or bird's eye ring
                            s.stroke([(u + R_ * 1.35 * math.cos(a), v + R_ * 1.35 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 14)], max(0.08, size * 0.18), taper=(1, 1))
                du = 0.25 * size * look if kind == 'side' else 0.0
                s.eye(u + du, v, 2 * f * size * k * (1 + r.normal() * 0.05), 2 * f * size * shape * k * (1 + r.normal() * 0.06), kk, sx=sx,
                      catch=False, lid=lid, lashes=lashes, lower=lower, rot=r.normal() * 5 + sx * tilt)
                if kind == 'teary' and sx == look:
                    s.drop(u + 0.3 * size, v - size * 3.4, r=size * 0.9)
            elif kk in ('dot', 'big', 'tiny', 'side', 'teary'):
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
            if V3:  # a tapered brush stroke, a slight arch, heavy at the inner end
                pts = [(u - sx * w / 2, dy + inner * w / 2), (u, dy + (inner + outer) * w / 4 + 0.08 * w), (u + sx * w / 2, dy + outer * w / 2)]
                s.stroke(pts, weight * 1.15, taper=(0.95, 0.25), wobble=0.02)
                continue
            s.stroke([(u - sx * w / 2, dy + inner * w / 2), (u + sx * w / 2, dy + outer * w / 2)], weight, wobble=0.03)

    MOUTHS = ('upturn', 'line', 'dash', 'frown', 'grin', 'gritted', 'shout', 'tongue', 'smug', 'wobble', 'pout', 'drool', 'w', 'o')

    def mouth(s, kind='upturn', w=4.0, dy=-1.5, weight=0.42, h=None, side=1, teeth=3, slant=10.0, du=0.0, ticks=None):
        sp = s.sp
        if sp:
            if sp.get('mouth') and (kind in ('upturn', 'line', 'dash', 'smug', 'w', 'o', 'frown', 'wobble', 'pout') or sp['mouth'] in ANATOMY):
                kind = sp['mouth']
                w *= sp.get('mw', 1.0)
            for x in sp.get('extras', ()):
                if x == 'whiskers':
                    s.whiskers(du, dy + 0.35 * w, w * 1.5, 3, w * 0.75, max(0.12, weight * 0.5))
                elif x == 'fangs':
                    s.fangs(du + (0.15 * w if kind == 'smug' else 0), dy - 0.02 * w, w * 0.32, 2, w * 0.13)
                elif x == 'fang':
                    s.fangs(du + side * 0.22 * w, dy - 0.02 * w, w, 1, w * 0.14)
                elif x == 'blush':
                    s.blush(w * 2.0, dy + 0.45 * w, rx=w * 0.32, ry=w * 0.18)
                elif x == 'hatch':
                    s.blush(w * 2.0, dy + 0.45 * w, rx=w * 0.32, ry=w * 0.2, style='hatch')
                elif x == 'freckles':
                    s.freckles(du, dy + 0.5 * w, w * 2.0)
                elif x == 'tufts':
                    s.tufts(du, dy + 0.4 * w, w * 2.6, w * 0.35)
                elif x == 'gill':
                    for sg in (-1, 1):
                        s.stroke([(du + sg * 2.1 * w, dy + 0.5 * w), (du + sg * 2.3 * w, dy - 0.1 * w), (du + sg * 2.1 * w, dy - 0.7 * w)], weight * 0.8, taper=(0.5, 0.5))
                elif x == 'sweat':
                    s.sweat(du + w * 1.1, dy + w * 1.3, w * 0.14)
        if kind == 'siphon':  # an octopus has no mouth on its face: a siphon tube at the side
            x = du + side * 0.35 * w
            tube = s._lumpy(x, dy, 0.18 * w, 0.26 * w, 0.05, rot=side * 25)
            s.fill(tube, (s.sp or {}).get('skin2', '#c25a4a'))
            s.stroke(tube + [tube[0]], weight * 0.8, taper=(1, 1), wobble=0.005)
            return s.dab(x + side * 0.03 * w, dy + 0.02 * w, 0.07 * w, s.ink)
        if kind == 'lips':  # a fish's pouty lips (two thick arcs) and a gill line behind
            for sg in (1, -1):
                s.stroke([(du - 0.3 * w, dy + sg * 0.02 * w), (du, dy + sg * 0.14 * w), (du + 0.3 * w, dy + sg * 0.02 * w)], weight * 1.2, taper=(0.6, 0.6))
            return None
        if kind == 'beakline':  # a bird's beak seam, a short hooked line
            return s.stroke([(du - 0.4 * w, dy + 0.05 * w), (du + 0.1 * w, dy), (du + 0.4 * w, dy - 0.12 * w)], weight, taper=(0.9, 0.4))
        if kind == 'muzzle':  # dog / tanuki / bear: a pale muzzle, a nose leather and a Y mouth
            s.patch(du, dy + 0.15 * w, 0.55 * w, 0.38 * w, (s.sp or {}).get('muzzle', '#efe2c8'))
            s.nose('button', du, dy + 0.32 * w, 0.22 * w)
            return s.snout_mouth('Y', du, dy + 0.2 * w, 0.55 * w, weight)
        if kind == 'catnose':  # a cat's nose leather and its split upper lip
            s.nose('tri', du, dy + 0.3 * w, 0.18 * w, col=(s.sp or {}).get('nose', '#d88a8a'))
            return s.snout_mouth('cat', du, dy + 0.18 * w, 0.5 * w, weight)
        if kind == 'smirk':  # a villain's / toothy smirk: a long side curve, one corner tucked up, a tooth showing
            x0, x1 = du - 0.45 * w * side, du + 0.5 * w * side
            pts = [(x0 + (x1 - x0) * q, dy - 0.05 * w * math.sin(math.pi * q) + 0.12 * w * q ** 3) for q in np.linspace(0, 1, 9)]
            s.stroke(pts, weight, taper=(0.5, 0.8) if side > 0 else (0.8, 0.5))
            tx = du + side * 0.18 * w
            s.fill([(tx - 0.07 * w, dy - 0.01 * w), (tx + 0.07 * w, dy - 0.0 * w), (tx + 0.01 * w, dy - 0.16 * w)], WHITE)
            return s.stroke([(tx - 0.07 * w, dy - 0.01 * w), (tx + 0.01 * w, dy - 0.16 * w), (tx + 0.07 * w, dy)], weight * 0.45, taper=(1, 1), wobble=0.004)
        if kind == 'flat':  # deadpan: one dead-straight line, tiny corner ticks
            s.stroke([(du - w / 2, dy), (du + w / 2, dy + 0.01 * w)], weight, taper=(0.85, 0.85), wobble=0.01)
            return s.ticks(du - w / 2, du + w / 2, dy, w, weight)
        if kind == 'long':  # a frog's long thin mouth line, curling up at the very ends
            pts = [(du + w / 2 * x, dy - 0.04 * w * (1 - x * x) + 0.05 * w * max(0.0, abs(x) - 0.85) * 8) for x in np.linspace(-1, 1, 13)]
            return s.stroke(pts, weight * 0.8, taper=(0.7, 0.7), wobble=0.015)
        if V3 and (ticks or (ticks is None and kind in ('line', 'upturn', 'smug') and w / s.px >= 22)):
            s.ticks(du - w / 2, du + w / 2, dy, w, weight)
        if kind == 'open':  # an open mouth: dark inside, a tongue at the bottom, two top teeth, the ink rim
            h = h or w * 0.6
            rim = [(du + w / 2 * math.cos(a), dy - h * 0.5 * math.sin(a) * (1.0 if math.sin(a) > 0 else 0.25)) for a in np.linspace(0, 2 * math.pi, 22)]
            s.fill(rim, INSIDE)
            s.fill([(du + w * 0.3 * math.cos(a), dy - h * 0.48 + h * 0.2 * math.sin(a)) for a in np.linspace(0, math.pi, 10)] +
                   [(du - w * 0.3, dy - h * 0.5)], TONGUE)
            for x in (-0.13, 0.13):
                s.fill([(du + (x - 0.1) * w, dy + 0.02 * h), (du + (x + 0.1) * w, dy + 0.02 * h), (du + (x + 0.08) * w, dy - 0.2 * h), (du + (x - 0.08) * w, dy - 0.2 * h)], WHITE)
            return s.stroke(rim, weight, taper=(1, 1), wobble=0.02)
        return s._mouth(kind, w, dy, weight, h, side, teeth, slant, du)

    def _mouth(s, kind='upturn', w=4.0, dy=-1.5, weight=0.42, h=None, side=1, teeth=3, slant=10.0, du=0.0):
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

    def blush(s, spread, dy, rx=1.6, ry=0.9, col='#f08a86', base=None, style=None):
        if style == 'hatch':  # three or four short diagonal hatch strokes on each cheek
            for sx in (-1, 1):
                for i in range(4):
                    x = sx * spread / 2 + (i - 1.5) * rx * 0.42 + s.rng.normal() * 0.04
                    s.stroke([(x - 0.18 * rx, dy - 0.45 * ry), (x + 0.22 * rx, dy + 0.5 * ry)], max(0.1, 0.11 * rx), taper=(0.8, 0.5), wobble=0.01, col=HATCH)
            return
        return s._blush(spread, dy, rx, ry, col, base)

    def _blush(s, spread, dy, rx=1.6, ry=0.9, col='#f08a86', base=None):
        """Two airbrushed blush patches (cheeks), as two stepped tones of `col` over the paint (pixel art: no blur)."""
        c = _hex(col)
        if getattr(s.P, 'facet', False):  # hand-dabbed stipple: dense in the middle, scattered dabs at the edge
            for sx in (-1, 1):
                cu, cv = sx * spread / 2, dy
                cand = s.m & (np.abs(s.U - cu) < rx * 1.3) & (np.abs(s.V - cv) < ry * 1.3)
                if not cand.any():
                    continue
                iy, ix = np.nonzero(cand)
                U, V = s.U[iy, ix], s.V[iy, ix]
                rd = max(0.11, 0.075 * (rx + ry))
                nd = int(2.4 * rx * ry / (rd * rd))
                pu = s.rng.normal(0, rx * 0.48, nd)
                pv = s.rng.normal(0, ry * 0.48, nd)
                ok = (pu / rx) ** 2 + (pv / ry) ** 2 < 1.15
                pu, pv = pu[ok] + cu, pv[ok] + cv
                rr = rd * (0.7 + 0.6 * s.rng.random(len(pu)))
                cnt = np.zeros(len(U), int)
                for a, b, r in zip(pu, pv, rr):
                    cnt += ((U - a) ** 2 + (V - b) ** 2 < r * r)
                for lim, k in ((1, 0.3), (3, 0.56)):
                    sel = cnt >= lim
                    y_, x_ = iy[sel], ix[sel]
                    s.P.rgb[y_, x_] = s.P.rgb[y_, x_] * (1 - k) + c * k
                    s.P.idx[y_, x_] = np.where(s.P.idx[y_, x_] >= 0, -3, s.P.idx[y_, x_])  # (rims leave it alone)
            return
        for sx in (-1, 1):
            du, dv = s.U - sx * spread / 2, s.V - dy
            d = np.sqrt((du / rx) ** 2 + (dv / ry) ** 2)
            for lim, k in ((1.0, 0.35), (0.62, 0.6)):
                m = s.m & (d <= lim)
                s.P.rgb[m] = s.P.rgb[m] * (1 - k) + c * k


# ------------------------------------------------------------------ face styles: attitudes and species (the v3/v4 kit)
# A style restyles a face drawn with the ordinary calls (fc.eyes('dot', ...), fc.mouth('upturn', ...)): the eye shape
# and slant (tilt: degrees, + = the outer corners up), lids, lash ticks, brows (kind, weight), the mouth (it replaces the
# plain kinds; expressive ones such as grin, shout, squeeze stay), extras (whiskers, fangs, fang, blush, hatch,
# freckles, tufts, sweat). Every animal figure gets its species' style automatically (SPECIES), or fc.species(name).
ATTITUDE = {
    'smug': dict(eye='lid', tilt=-4, mouth='smug'),
    'determined': dict(eye='bean', tilt=12, brows=('angry', 1.2), mouth='flat'),
    'side_eye': dict(eye='oval', lid=True, look=1, mouth='dash'),
    'sly': dict(eye='bean', tilt=22, lid=True, mouth='smug', extras=('fang',)),
    'grumpy': dict(eye='lid', brows=('flat', 1.3), mouth='frown'),
    'derpy': dict(eye='oval', spread=1.35, uneven=0.5, mouth='o'),
    'bored': dict(eye='tiny', mouth='flat'),
    'intense': dict(eye='oval', lid=True, brows=('angry', 1.6), mouth='gritted'),
    'toothy_smirk': dict(eye='halfmoon', mouth='smirk'),
    'fangy': dict(eye='oval', brows=('raised', 1.0), mouth='line', extras=('fangs',)),
    'deadpan': dict(eye='oval', size=0.8, mouth='flat'),
    'mischief': dict(eye='halfmoon', tilt=10, mouth='w', extras=('blush',)),
    'sleepy_cool': dict(eye='lid', tilt=-8, lashes=1, mouth='dash'),
    'villain': dict(eye='bean', tilt=24, lid=True, brows=('angry', 1.4), mouth='smirk'),
    'worried': dict(eye='oval', brows=('worried', 1.1), mouth='wobble', extras=('sweat',)),
    'cheeky': dict(eye='bean', tilt=6, mouth='tongue', extras=('hatch',)),
}
STYLE = dict(ATTITUDE)
STYLE.update({  # one face design per animal
    'owl': dict(eye='oval', size=1.25, lid=True, brows=('angry', 1.4)),              # a stern old owl under heavy brows
    'frog': dict(eye='halfmoon', spread=1.25, mouth='long', mw=1.4),                  # deadpan, wide-set, a long thin mouth
    'toad': dict(eye='lid', spread=1.2, brows=('flat', 1.1), mouth='long', mw=1.3),   # a grumpy toad
    'tanuki': dict(eye='halfmoon', tilt=-8, mouth='w', extras=('blush',)),            # mischievous
    'fox': dict(eye='bean', tilt=22, lid=True, mouth='smug', extras=('fang',)),       # sly
    'pig': dict(eye='tiny', spread=0.85, mouth='smug'),                               # bored and smug
    'bear': dict(eye='tiny', spread=1.2, brows=('angry', 1.4), mouth='frown'),        # a gruff banchō
    'cat': dict(eye='lid', tilt=10, brows=('flat', 1.1), mouth='w', extras=('whiskers',)),  # grumpy cat
    'nekomata': dict(eye='bean', tilt=18, lid=True, lashes=2, mouth='smug', extras=('fang',)),
    'wolf': dict(eye='bean', tilt=12, brows=('angry', 1.2), mouth='line', extras=('fangs',)),
    'monkey': dict(eye='oval', spread=0.8, brows=('raised', 1.0), mouth='tongue'),   # mischief
    'bird': dict(eye='oval', size=0.9, lid=True, look=1),                             # a sharp side-eye
    'rooster': dict(eye='bean', tilt=10, lid=True, brows=('angry', 1.3)),
    'crow': dict(eye='bean', tilt=16, lid=True, brows=('angry', 1.1)),
    'crane': dict(eye='oval', size=0.9, lid=True, lashes=2),                          # elegant, sleepy-cool
    'pelican': dict(eye='lid', tilt=-6),                                              # deadpan
    'woodpecker': dict(eye='oval', brows=('angry', 1.1)),                             # intense
    'duck': dict(eye='oval', spread=1.15, uneven=0.45),                               # derpy
    'ptarmigan': dict(eye='oval', lashes=1),
    'phoenix': dict(eye='bean', tilt=18, lid=True, lashes=2),                         # proud
    'penguin': dict(eye='bean', tilt=8, brows=('angry', 1.0)),                        # determined
    'fish': dict(eye='oval', spread=1.3, uneven=0.45, mouth='o'),
    'puffer': dict(eye='oval', size=1.2, uneven=0.3, mouth='pout'),
    'angler': dict(eye='tiny', mouth='line', extras=('fangs',)),
    'barreleye': dict(eye='oval', lid=True, look=1, mouth='dash'),                    # a fortune teller's side-eye
    'eel': dict(eye='tiny', mouth='smirk'),                                           # a villain smirk
    'squid': dict(eye='lid', tilt=-8, mouth='pout', extras=('blush',)),               # sleepy-cool
    'octopus': dict(eye='lid', tilt=-6, mouth='pout', extras=('hatch',)),
    'isopod': dict(eye='tiny', mouth='flat'),                                         # deadpan
    'crab': dict(eye='oval', brows=('angry', 1.2), mouth='smirk'),
    'turtle': dict(eye='lid', tilt=-6, mouth='flat'),                                 # sleepy deadpan
    'rabbit': dict(eye='oval', lashes=2, mouth='w', extras=('blush',)),
    'giraffe': dict(eye='lid', lashes=3, mouth='smug'),                               # sleepy-cool
    'deer': dict(eye='oval', lashes=2, extras=('blush',)),
    'elephant': dict(eye='tiny', mouth='upturn'),
    'hippo': dict(eye='tiny', spread=1.4, mouth='long', mw=1.2),                      # derpy
    'mole': dict(eye='tiny', spread=0.7, mouth='smirk'),                              # a toothy squint
    'seal': dict(eye='oval', spread=1.3, size=1.15, mouth='w'),                       # derpy, wide-set
    'hedgehog': dict(eye='lid', brows=('flat', 1.2), mouth='frown'),                  # grumpy
    'chameleon': dict(eye='oval', lid=True, look=1, mouth='flat'),                    # side-eye
    'otter': dict(eye='halfmoon', mouth='smug'),                                      # smug
    'salamander': dict(eye='tiny', spread=1.5, mouth='long', mw=1.3),                 # derpy
    'snake': dict(eye='bean', tilt=20, lid=True, mouth='smirk', extras=('fang',)),    # sly villain
    'lizard': dict(eye='oval', look=1, mouth='flat'),
    'calf': dict(eye='oval', spread=1.2, uneven=0.4, mouth='o'),
    'squirrel': dict(eye='oval', size=1.3, mouth='w'),
    'ladybird': dict(eye='halfmoon', mouth='w', extras=('blush',)),
    'kappa': dict(eye='oval', brows=('angry', 1.1), mouth='line', extras=('fangs',)),
    'tengu': dict(eye='bean', tilt=20, brows=('angry', 1.5), mouth='smirk'),          # the villain
    'weasel': dict(eye='bean', tilt=15, brows=('angry', 1.3), mouth='gritted'),       # intense
    'azukiarai': dict(eye='oval', spread=1.3, uneven=0.5, mouth='o'),                 # comic, derpy
    'lion': dict(eye='oval', brows=('angry', 1.4), mouth='line', extras=('fangs',)),
})
SPECIES = {  # figure (series/id or id) -> species
    'henshin/buta': 'pig', 'henshin/tsuru': 'crane', 'henshin/wani': 'croc', 'henshin/ryu': 'dragon',
    'nakanohito/mogura': 'mole', 'nakanohito/entotsu': 'lizard',
    'otsukai/kitsune': 'fox', 'otsukai/shika': 'deer', 'otsukai/karasu': 'crow', 'otsukai/saru': 'monkey',
    'otsukai/ookami': 'wolf', 'otsukai/hebi': 'snake',
    'tsuppari/niwatori': 'rooster', 'tsuppari/kuma': 'bear', 'tsuppari/neko': 'cat', 'tsuppari/kaeru': 'frog',
    'tsuppari/tanuki': 'tanuki', 'tsuppari/mimizuku': 'owl',
    'karakuri/chahakobi': 'tanuki', 'karakuri/dangaeri': 'monkey', 'karakuri/yumihiki': 'rabbit', 'karakuri/mojikaki': 'owl',
    'karakuri/kasamawashi': 'cat', 'karakuri/houou': 'phoenix',
    'kaden/fukuro': 'owl', 'kaden/usagi': 'rabbit', 'kaden/zou': 'elephant', 'kaden/sagi': 'crane', 'kaden/gama': 'toad',
    'kaden/shika': 'deer',
    'ekiin/kitsutsuki': 'woodpecker', 'ekiin/kaba': 'hippo', 'ekiin/tako': 'octopus', 'ekiin/perikan': 'pelican',
    'ekiin/flamingo': 'crane', 'ekiin/mogura': 'mole',
    'kabuki/kappa': 'kappa', 'kabuki/tengu': 'tengu', 'kabuki/nekomata': 'nekomata', 'kabuki/kamaitachi': 'weasel',
    'kabuki/azukiarai': 'azukiarai', 'kabuki/jishi': 'lion',
    'meijin/hari': 'hedgehog', 'meijin/azarashi': 'seal', 'meijin/kamereon': 'chameleon', 'meijin/pengin': 'penguin',
    'sento/kame': 'turtle', 'sento/kani': 'crab', 'sento/fugu': 'puffer', 'sento/kirin': 'giraffe', 'sento/rakko': 'otter',
    'sento/sanshou': 'salamander',
    'otenki/ushi': 'calf', 'otenki/momonga': 'squirrel', 'otenki/kamo': 'duck', 'otenki/raichou': 'ptarmigan',
    'otenki/kamereon': 'chameleon', 'otenki/tentou': 'ladybird',
    'yomise/ankou': 'angler', 'yomise/demenigisu': 'barreleye', 'yomise/hotaruika': 'squid', 'yomise/fukurounagi': 'eel',
    'yomise/gusokumushi': 'isopod',
    'sabaku/wani': 'croc', 'sabaku/rakuda': 'camel', 'sabaku/fennec': 'fox', 'sabaku/hyena': 'hyena', 'sabaku/mirkat': 'meerkat',
    'sabaku/koumori': 'bat',
    'minato/tako': 'octopus', 'minato/kawauso': 'otter', 'minato/pengin': 'penguin', 'minato/azarashi': 'seal', 'minato/yagi': 'goat',
    'minato/yamori': 'gecko',
    'datesha/ookami': 'wolf', 'datesha/kujaku': 'peacock', 'datesha/pagu': 'pug', 'datesha/flamingo': 'crane',
    'datesha/kameleon': 'chameleon', 'datesha/kobura': 'snake',
}
STYLE.update({
    'croc': dict(eye='lid', tilt=6, brows=('flat', 1.2), mouth='smirk'),               # a lazy, toothy croc
    'camel': dict(eye='lid', tilt=-10, lashes=3, mouth='smug'),                        # a weary old guide
    'hyena': dict(eye='bean', tilt=20, brows=('angry', 1.3), mouth='line', extras=('fangs',)),  # the assassin
    'meerkat': dict(eye='oval', size=1.2, brows=('worried', 1.0), mouth='o'),          # on the lookout
    'bat': dict(eye='bean', tilt=24, lid=True, mouth='smirk', extras=('fang',)),       # the night lord
    'goat': dict(eye='lid', tilt=-4, mouth='flat'),                                    # deadpan fortune teller
    'gecko': dict(eye='oval', size=1.25, spread=1.25, mouth='long'),                   # the quiet neighbour
    'peacock': dict(eye='bean', tilt=14, lid=True, lashes=2, mouth=None),              # vain
    'pug': dict(eye='oval', spread=1.4, uneven=0.45, brows=('worried', 1.2), mouth='frown'),  # the bowl-cut pug
})


ANATOMY = ('siphon', 'lips', 'beakline', 'muzzle', 'catnose')
STYLE.update({  # the real animals' features, stylised (solid ink, hand-drawn): these replace the generic faces
    'octopus': dict(eye='bar', iris='#e8c25a', around=('bulge',), mouth='siphon', eyek=1.4),
    'squid': dict(eye='bar', iris='#9fe0ff', around=('bulge',), mouth='siphon', skin2='#e07aa8'),
    'frog': dict(eye='pin', iris='#e2c14a', around=('bulge',), spread=1.35, mouth='long', mw=1.5, eyek=1.6),
    'toad': dict(eye='bar', iris='#c99a3a', around=('bulge',), spread=1.3, mouth='long', mw=1.4),
    'croc': dict(eye='slit', iris='#d9b23a', lid=True, tilt=10, mouth='smirk', eyek=1.1),
    'owl': dict(eye='round', iris='#f0a020', around=('disc',), eyek=1.9, brows=('angry', 1.3)),
    'bird': dict(eye='round', iris='#3a2a20', around=('ring',), eyek=1.0, mouth='beakline'),
    'crow': dict(eye='round', iris='#2a2420', around=('ring',), brows=('angry', 1.1), mouth='beakline'),
    'rooster': dict(eye='round', iris='#e08a20', around=('ring',), brows=('angry', 1.3), mouth='beakline'),
    'crane': dict(eye='round', iris='#d8b040', around=('ring',), eyek=1.0, mouth='beakline'),
    'woodpecker': dict(eye='round', iris='#2a2420', around=('ring',), brows=('angry', 1.1), mouth='beakline'),
    'pelican': dict(eye='pin', iris='#f0e0a0', around=('ring',), mouth='beakline'),
    'duck': dict(eye='round', iris='#3a2a20', around=('ring',), mouth='beakline'),
    'ptarmigan': dict(eye='round', iris='#2a2420', around=('ring',)),
    'phoenix': dict(eye='slit', iris='#f2c230', lid=True, lashes=2, tilt=18),
    'penguin': dict(eye='round', iris='#3a2a20', around=('ring',), brows=('angry', 1.0), mouth='beakline'),
    'peacock': dict(eye='round', iris='#3a2a20', around=('ring',), lashes=2, mouth='beakline'),
    'fish': dict(eye='pin', iris='#e8d070', around=('ring',), spread=1.3, mouth='lips', extras=('gill',)),
    'puffer': dict(eye='round', iris='#e8c040', around=('ring',), mouth='lips', extras=('gill',), eyek=1.6),
    'angler': dict(eye='pin', iris='#c8d870', around=('ring',), mouth='line', extras=('fangs',)),
    'barreleye': dict(eye='round', iris='#7fe0a0', around=('ring',), mouth='lips', eyek=1.8),
    'eel': dict(eye='pin', iris='#d8c060', mouth='smirk', extras=('gill',)),
    'crab': dict(eye='round', iris='#2a2420', around=('stalk',), mouth='smirk', eyek=1.0),
    'cat': dict(eye='slit', iris='#c8d040', tilt=12, mouth='catnose', extras=('whiskers',), eyek=1.4),
    'nekomata': dict(eye='slit', iris='#f0b030', tilt=20, lid=True, mouth='catnose', extras=('fang',), eyek=1.4),
    'fox': dict(eye='slit', iris='#e0a030', tilt=22, lid=True, mouth='muzzle', muzzle='#f4ead8', eyek=1.2),
    'tanuki': dict(eye='round', iris='#3a2a20', around=('patch',), mouth='muzzle', muzzle='#f0e2c4', eyek=1.1),
    'dog': dict(eye='round', iris='#5a3a20', around=('patch',), mouth='muzzle'),
    'pug': dict(eye='round', iris='#4a3020', around=('patch',), spread=1.4, mouth='muzzle', muzzle='#3a2e28', eyek=1.5),
    'wolf': dict(eye='slit', iris='#e8c040', tilt=14, brows=('angry', 1.2), mouth='muzzle', muzzle='#e8e0d0', eyek=1.1),
    'hyena': dict(eye='round', iris='#e0b030', tilt=18, brows=('angry', 1.3), mouth='muzzle', muzzle='#d8c8a0'),
    'bear': dict(eye='round', iris='#3a2418', brows=('angry', 1.4), mouth='muzzle', muzzle='#d8b890', eyek=0.9),
    'snake': dict(eye='slit', iris='#d8e040', tilt=18, lid=True, mouth='smirk', extras=('fang',), eyek=1.2),
    'gecko': dict(eye='slit', iris='#c8b060', spread=1.3, mouth='long', eyek=1.7),
    'chameleon': dict(eye='pin', iris='#90c060', around=('bulge',), look=1, mouth='long', eyek=1.5),
    'lizard': dict(eye='slit', iris='#d0b050', mouth='long'),
    'salamander': dict(eye='pin', iris='#c0b080', spread=1.5, mouth='long', mw=1.3),
    'turtle': dict(eye='round', iris='#5a4020', lid=True, tilt=-8, mouth='beakline'),
    'goat': dict(eye='bar', iris='#e0b040', tilt=-4, mouth='flat'),
    'camel': dict(eye='round', iris='#4a3020', lid=True, lashes=3, tilt=-10, mouth='muzzle', muzzle='#e0c49a'),
    'rabbit': dict(eye='round', iris='#5a2a20', lashes=2, mouth='catnose', nose='#e89aa8'),
    'deer': dict(eye='round', iris='#3a2418', lashes=2, mouth='muzzle', muzzle='#f0e6d8'),
    'giraffe': dict(eye='round', iris='#3a2418', lid=True, lashes=3, mouth='muzzle', muzzle='#e8d0a8'),
    'otter': dict(eye='round', iris='#2a1e18', mouth='muzzle', muzzle='#e8dcc8', extras=('whiskers',)),
    'seal': dict(eye='round', iris='#2a1e18', spread=1.3, eyek=1.7, mouth='muzzle', muzzle='#e8e8e0', extras=('whiskers',)),
    'monkey': dict(eye='round', iris='#5a3420', brows=('raised', 1.0), mouth='muzzle', muzzle='#e8b8a0'),
    'hippo': dict(eye='round', iris='#4a3020', around=('bulge',), spread=1.4, mouth='long', mw=1.3),
    'elephant': dict(eye='round', iris='#4a3020', lid=True, lashes=2),
    'mole': dict(eye='pin', iris='#2a2420', spread=0.7, mouth='muzzle', muzzle='#e8b0b0', eyek=0.7),
    'hedgehog': dict(eye='round', iris='#2a1e18', mouth='muzzle', muzzle='#e8d8c0'),
    'meerkat': dict(eye='round', iris='#2a1e18', around=('patch',), mouth='muzzle', muzzle='#e8d8b8', patch='#4a3a2a'),
    'bat': dict(eye='slit', iris='#e05030', tilt=24, lid=True, mouth='smirk', extras=('fang',)),
    'lion': dict(eye='slit', iris='#e0a030', brows=('angry', 1.4), mouth='muzzle', muzzle='#f0dcb0'),
    'weasel': dict(eye='round', iris='#2a1e18', tilt=16, brows=('angry', 1.3), mouth='muzzle', muzzle='#f0e6d0'),
    'calf': dict(eye='round', iris='#3a2418', spread=1.25, uneven=0.4, mouth='muzzle', muzzle='#f0c8c0'),
    'squirrel': dict(eye='round', iris='#2a1e18', eyek=1.5, mouth='muzzle', muzzle='#f0e2c8'),
    'pig': dict(eye='round', iris='#3a2418', spread=0.85, eyek=0.8, lid=True),
    'isopod': dict(eye='compound', iris='#2c2832', facet='#55505e', tilt=26, spread=1.5, eyek=1.7, lid=False),  # wide-set kidney compound eyes
    'ladybird': dict(eye='round', iris='#2a2420', mouth='w'),
})
STYLE['dragon'] = dict(eye='slit', iris='#f2c230', tilt=16, eyek=1.2)
SPECIES.update({f'kanikan/{i}': 'crab' for i in ('iwashi', 'saba', 'konbi', 'beans', 'pine', 'caviar')})
SPECIES.update({'janru/robo': 'hamster', 'janru/usagi': 'rabbit', 'janru/mangusu': 'mongoose', 'janru/shiba': 'dog',
                'janru/gorira': 'gorilla', 'janru/musasabi': 'squirrel'})
STYLE.update({
    'hamster': dict(eye='round', iris='#2a1e18', eyek=1.4, mouth='catnose', nose='#e8a0a8', extras=('blush',)),
    'mongoose': dict(eye='round', iris='#3a2418', tilt=12, brows=('angry', 1.1), mouth='muzzle', muzzle='#d8c4a0'),
    'gorilla': dict(eye='round', iris='#3a2418', brows=('flat', 1.5), mouth='muzzle', muzzle='#6a5a52', eyek=0.9),
})
