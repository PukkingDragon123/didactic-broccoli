"""Factory-PVC paint for the toy line, per texel, from the baked maps (lib/fig.py): lowpix's rules for painting like
a person (docs/STYLE_GUIDE.md of the lowpix repo) applied to a capsule toy's finish.

- Every colour is a hand-picked base turned into a hue-shifted ramp: shadows cooler and more saturated, lights
  warmer and paler, the darkest tone a tinted near-black.
- The tone at a texel is the form's light (sculpt normal), ambient occlusion, cavity / edge (pointiness) and the
  factory airbrush gradient, quantised to the ramp in clean bands, then cleaned of lone texels (clusters, no noise).
- Paint lines: a crisp darker texel line where two paint colours meet on the sculpt.
- Printed details (eyes, pupils, catchlights, markings) are shapes evaluated in figure space, so they wrap across
  UV seams; they sit on top in flat ink colours.
Everything is sRGB 0..1. Figure space: mm, Z up, the figure faces -Y.

Facet mode (lib/facet.py, FACET.md): fill() lays the ramp as hand-painted brush strokes that follow the form (a preset
per material: brush='pvc' | 'gloss' | 'metal' | 'fur' | 'feather' | 'wood' | 'cloth' | 'lacquer', a dict of stroke
settings, or False), dabs() paints hand-dabbed patterns (pebbles, scales, spots), and done() adds the facet-edge rims
and the soft rubbed wear on hard corners.
"""
import colorsys
import math

import numpy as np

KEY = np.array([-0.45, -0.62, 0.64])  # the painted key light: upper front-left
KEY = KEY / np.linalg.norm(KEY)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def _hue_toward(h, target, k):
    d = ((target - h + 0.5) % 1.0) - 0.5
    return (h + d * k) % 1.0


def ramp(base, n=7, dark=0.55, light=0.42, shift=0.07, sat=0.22, ink=None):
    """A hue-shifted ramp of n tones around `base` (index n // 2 - ish is the base). dark / light: how far the ends go
    in value; shift: hue turn (toward blue-violet in shadow, toward yellow in light); sat: saturation change."""
    r, g, b = hexrgb(base) if isinstance(base, str) else base
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    mid = (n - 1) * 0.55
    out = []
    for i in range(n):
        t = (i - mid) / (mid if i < mid else (n - 1 - mid))  # -1 (darkest) .. 1 (lightest)
        if t < 0:
            hh = _hue_toward(h, 0.70, shift * -t * (1 if s > 0.08 else 0.4))
            ss = min(1, s * (1 + sat * -t) + 0.04 * -t)
            vv = v * (1 - dark * -t)
        else:
            hh = _hue_toward(h, 0.13, shift * t * (1 if s > 0.08 else 0.4))
            ss = max(0, s * (1 - sat * 1.6 * t))
            vv = min(1, v + (1 - v) * light * t + 0.06 * t)
        out.append(colorsys.hsv_to_rgb(hh, ss, vv))
    if ink:
        out[0] = tuple(hexrgb(ink))
    return np.array(out)


class Painter:
    """Paints the albedo of a figure from its maps: P = Painter(F.maps, F.region_index)."""

    def __init__(s, maps, regions, size):
        s.m = maps
        s.ri = regions
        s.n = size
        s.rgb = np.zeros((size, size, 3), np.float32)
        s.idx = np.full((size, size), -1, np.int32)  # ramp index per texel (for clusters and lines)
        s.ramps = {}  # region id -> ramp
        s.pos, s.on, s.ao, s.cav = maps['pos'], maps['on'], maps['ao'], maps['cav']
        s.reg, s.mask, s.part = maps['reg'], maps['mask'], maps['part']
        s.X, s.Y, s.Z = s.pos[:, :, 0], s.pos[:, :, 1], s.pos[:, :, 2]
        s.facet = 'fid' in maps  # (the faceted style: brushwork, rims, wear)
        s.nfill = 0
        if s.facet:
            s.ppmm = float(np.median(maps['ppmm'][s.mask]))

    def region(s, name):
        return s.mask & (s.reg == s.ri.get(name, -99))

    def shade(s, light=0.55, ao=0.9, cav=1.2, wrap=0.35):
        """The tone field (about -1 .. 1) before any airbrush: form light + AO + cavity."""
        l = np.einsum('ijk,k->ij', s.on, KEY)
        l = (l + wrap) / (1 + wrap)
        v = light * (np.clip(l, -0.2, 1) - 0.45)
        v += ao * (np.clip(s.ao, 0, 1) - 1)
        v += cav * np.clip((s.cav - 0.5) * 2, -0.5, 0.5)
        return v

    def fill(s, name, rmp, tone=None, base=0.0, levels=None, extra=None, where=None, brush=None):
        """Paint a region with a ramp. tone: the tone field (default shade()); base: offset (airbrush, a float or a
        field); levels: how many ramp tones per unit of tone (default the ramp's length); extra: a field added.
        brush (facet mode): a stroke preset name (facet.PRESETS), a dict (a preset's settings, 'preset' to start from
        one), or False for none; default: 'metal' on metal parts, 'pvc' elsewhere."""
        m = s.region(name) if isinstance(name, str) else name
        if where is not None:
            m = m & where
        if not m.any():
            return m
        t = s.shade() if tone is None else tone
        t = t + base
        if extra is not None:
            t = t + extra
        n = len(rmp)
        mid = (n - 1) * 0.55
        k = (levels or n * 0.62)
        if s.facet and brush is not False:
            t = s.brushed(m, t, 1.0 / k, brush, name)
        i = np.clip(np.rint(mid + t * k), 0, n - 1).astype(np.int32)
        rid = len(s.ramps)
        s.ramps[rid] = rmp
        s.idx[m] = i[m] + rid * 64
        s.rgb[m] = rmp[i[m]]
        return m

    def brushed(s, m, t, step, brush=None, name=None):
        """The tone field t with brush strokes laid over the texels of m (facet mode)."""
        import facet
        import os
        if os.environ.get('GG_FACET_BRUSH') == '0':  # (debug: the paint without brushwork)
            return t
        t = np.broadcast_to(np.asarray(t, np.float32), m.shape).copy() if np.ndim(t) < 2 else np.array(t, np.float32)
        if isinstance(brush, dict):
            opt = dict(facet.PRESETS[brush.get('preset', 'pvc')])
            opt.update({k: v for k, v in brush.items() if k != 'preset'})
        else:
            if brush is None:
                metal = s.m['metal'][m].mean() > 0.5 if m.any() else False
                nm = name if isinstance(name, str) else ''
                brush = 'metal' if metal or any(w in nm for w in ('chrome', 'steel', 'metal', 'gold', 'brass', 'pin')) else 'pvc'
            opt = dict(facet.PRESETS[brush])
        s.nfill += 1
        ys, xs = np.nonzero(m)
        if brush == 'metal' or opt.get('chrome'):  # painted chrome: the sky above the horizon, the dark floor below
            t[ys, xs] += 0.32 * np.tanh(s.on[ys, xs, 2] * 5 + 0.4)
        t[ys, xs] = facet.strokes(s.pos[ys, xs], s.on[ys, xs], t[ys, xs], step, ppmm=s.ppmm, seed=s.nfill * 7919 + 13, **opt)
        return t

    def dabs(s, m, size=0.6, spacing=1.0, seed=0, **kw):
        """Facet mode: a hand-dabbed pattern over mask m (pebbled skin, scales, spots): returns (dab id per texel, -1
        none; radial distance 0..1 inside the dab). Paint with it, e.g. a tone offset: base=-0.3 * (who >= 0)."""
        import facet
        who = np.full(m.shape, -1, np.int64)
        dist = np.full(m.shape, 9.0)
        ys, xs = np.nonzero(m)
        if len(ys) < 20:
            return who, dist
        w, d = facet.dabs(s.pos[ys, xs], s.on[ys, xs], s.ppmm, size=size, spacing=spacing, seed=seed, **kw)
        who[ys, xs] = w
        dist[ys, xs] = d
        return who, dist

    def shift(s, m, d):
        """Move the shaded texels of m d ramp steps (+ lighter) within their own ramps."""
        m = m & (s.idx >= 0)
        if not m.any():
            return
        code = s.idx[m]
        rid, i = code // 64, code % 64
        out = np.empty((len(code), 3), np.float32)
        newi = i.copy()
        for r in np.unique(rid):
            sel = rid == r
            rm = s.ramps[int(r)]
            newi[sel] = np.clip(i[sel] + d, 0, len(rm) - 1)
            out[sel] = rm[newi[sel]]
        s.idx[m] = rid * 64 + newi
        s.rgb[m] = out

    def facets(s, rims=True, wear=0.35, seed=5):
        """Facet mode finish: a lit rim (a ramp step up) along the facet edges that face the light and a shadow line
        (a step down) along the ones that face away and in creases (facet.maps), then soft rubbed wear: sparse chips a
        step lighter on hard convex corners. Printed ink (flat texels) is left alone."""
        if not s.facet:
            return
        if rims:
            s.shift(s.m['rim'] > 0, 1)
            s.shift(s.m['rim'] < 0, -1)
        if wear:
            near = s.mask & (s.m['hard'] < 2.6) & (s.idx >= 0)
            who, d = s.dabs(near, size=0.55, spacing=1.5, seed=seed)
            rng = np.random.default_rng(seed)
            keep = rng.random(max(int(who.max()) + 1, 1)) < wear
            chip = (who >= 0) & keep[np.maximum(who, 0)]
            s.shift(chip, 1)

    def flat(s, m, col):
        """Flat ink (printed details): no shading."""
        s.rgb[m] = hexrgb(col) if isinstance(col, str) else col
        s.idx[m] = -2
        return m

    def tint(s, m, rmp, tone):
        """Paint a mask with a ramp at a given tone field (decals that still take the form's light)."""
        n = len(rmp)
        i = np.clip(np.rint((n - 1) * 0.55 + tone * n * 0.62), 0, n - 1).astype(np.int32)
        rid = len(s.ramps)
        s.ramps[rid] = rmp
        s.idx[m] = i[m] + rid * 64
        s.rgb[m] = rmp[i[m]]

    # ---------------------------------------------------------- shapes in figure space
    def frame(s, c, axis, up=(0, 0, 1)):
        """Local 2D coordinates (u, v) and depth w of every texel in a plane through c facing `axis`."""
        a = np.asarray(axis, float)
        a /= np.linalg.norm(a)
        upv = np.asarray(up, float)
        u = np.cross(upv, a)
        if np.linalg.norm(u) < 1e-6:
            u = np.cross([0, 1, 0], a)
        u /= np.linalg.norm(u)
        v = np.cross(a, u)
        d = s.pos - np.asarray(c, float)
        return d @ u, d @ v, d @ a, a

    def ellipse(s, c, axis, rx, ry, up=(0, 0, 1), facing=0.15, rot=0.0):
        """A printed ellipse (eyes, spots) on the surface around c, seen from `axis`."""
        U, V, W, a = s.frame(c, axis, up)
        if rot:
            cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
            U, V = U * cr + V * sr, -U * sr + V * cr
        d = (U / rx) ** 2 + (V / ry) ** 2
        face = np.einsum('ijk,k->ij', s.on, a) > facing
        return s.mask & (d <= 1) & face & (np.abs(W) < max(rx, ry) * 1.5)

    def eye(s, c, axis, r, up=(0, 0, 1), ry=None, where=None, full=False, scale=0.62, bead='#16100e', rim=None,
            facing=0.1, hi=True, rot=0.0, **_old):
        """DEPRECATED: paint faces with lib/face.py (hand-drawn ink dots and one mouth stroke, the owner's drawing).
        A bead eye (the owner's rule: animal eyes are simple beads or dots): a solid dark bead with at most one
        tiny highlight, never an iris, pupil ring, white, lid or lashes. Expression comes from brows, mouth and pose.
        full: the whole `where` region is the bead (a modelled eyeball); else a painted dot of radius r * scale.
        rim: an optional surround in a body tone (a dark bead on a dark face needs it to read).
        (Old keyword arguments such as iris, white, lid, look are accepted and ignored.)"""
        ry = ry or r
        U, V, W, a = s.frame(c, axis, up)
        if rot:
            cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
            U, V = U * cr + V * sr, -U * sr + V * cr
        face = (np.einsum('ijk,k->ij', s.on, a) > facing) & (np.abs(W) < r * 2) & s.mask
        if where is not None:
            face &= where
        rb, rby = (r, ry) if full else (r * scale, ry * scale)
        d = np.sqrt((U / rb) ** 2 + (V / rby) ** 2)
        out = (where & s.mask) if (full and where is not None) else (face & (d <= 1.0))
        if rim:
            s.flat(face & (d <= 1.4) & ~out, rim)
        if bead:  # (None: the bead's own shaded fill is already painted, only the catchlight goes on)
            s.flat(out, bead)
        if hi:  # one tiny catchlight, up and to the left (at least a texel)
            px = 1.0 / max(1e-6, getattr(s, 'ppmm', 5.0))
            hr = max(0.17 * rb, 0.55 * px)
            hm = face & (np.sqrt((U + 0.36 * rb) ** 2 + (V - 0.38 * rby) ** 2) <= hr)
            s.flat(hm & out, '#f6f0e4')
        return out

    # ---------------------------------------------------------- finishing passes
    def lines(s, regions_a, regions_b=None, col=None, step=1, maxd=0.7):
        """A crisp 1-texel paint line on texels of regions_a that touch regions_b (default: any other region)."""
        A = np.zeros_like(s.mask)
        for r in regions_a:
            A |= s.region(r)
        B = None
        if regions_b:
            B = np.zeros_like(s.mask)
            for r in regions_b:
                B |= s.region(r)
        edge = np.zeros_like(s.mask)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb_reg = np.roll(s.reg, (dy, dx), (0, 1))
            nb_mask = np.roll(s.mask, (dy, dx), (0, 1))
            nb_pos = np.roll(s.pos, (dy, dx), (0, 1))
            near = np.linalg.norm(nb_pos - s.pos, axis=2) < maxd
            other = nb_mask & near & (nb_reg != s.reg)
            if B is not None:
                other &= np.roll(B, (dy, dx), (0, 1))
            edge |= other
        m = A & edge
        if col:
            s.flat(m, col)
        else:
            s._darken(m, step)
        return m

    def _darken(s, m, step=1):
        ys, xs = np.nonzero(m & (s.idx >= 0))
        for y, x in zip(ys, xs):
            code = s.idx[y, x]
            rid, i = code // 64, code % 64
            r = s.ramps[rid]
            j = max(0, i - step)
            s.idx[y, x] = rid * 64 + j
            s.rgb[y, x] = r[j]

    def clusters(s, iters=2):
        """Clean lone texels: a texel whose ramp tone none of its 4 neighbours share takes the commonest neighbour tone
        of its own ramp (pixel artists paint in clusters)."""
        for _ in range(iters):
            idx = s.idx
            shad = idx >= 0
            nb = [np.roll(idx, sh, (0, 1)) for sh in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            same = sum((n == idx) for n in nb)
            lone = shad & (same == 0)
            if not lone.any():
                break
            ys, xs = np.nonzero(lone)
            for y, x in zip(ys, xs):
                rid = idx[y, x] // 64
                cand = [int(n[y, x]) for n in nb if n[y, x] >= 0 and n[y, x] // 64 == rid]
                if not cand:
                    continue
                v = max(set(cand), key=cand.count)
                s.idx[y, x] = v
                s.rgb[y, x] = s.ramps[rid][v % 64]

    def done(s):
        if s.facet and not getattr(s, '_faceted', False):
            s._faceted = True
            s.facets()
        return s.rgb


def _lighter(col, k):
    c = hexrgb(col) if isinstance(col, str) else np.asarray(col)
    return np.clip(c + (1 - c) * k, 0, 1)


def mix(a, b, t):
    return np.asarray(a) * (1 - t) + np.asarray(b) * t


# ------------------------------------------------------------------ paint fields (from agent C's kaden/_cx/cx.py)
def polar(X, Z, c):
    """Radius and angle (degrees, 0 = +x, counter-clockwise seen from the front) of points about c = (x, z)."""
    dx, dz = X - c[0], Z - c[1]
    return np.hypot(dx, dz), np.degrees(np.arctan2(dz, -dx)) % 360


def stripes(u, period, width):
    """Mask of bands across u: |u mod period| < width (centred)."""
    f = np.mod(u, period) - period / 2
    return np.abs(f) < width / 2


def chevrons(X, Z, x0, z0, period, w, spread=0.45):
    """Printed chevrons (rows of V marks, feathers, a happi's pattern) on a front: a mask."""
    return stripes(Z - z0 + np.abs(X - x0) * spread, period, w)
