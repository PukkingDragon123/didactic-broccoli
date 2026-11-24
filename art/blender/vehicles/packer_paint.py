"""Paints the packer truck's textures (pixel art, 256 px/m): the shell atlas as hand-painted elevations (see
packer_layout.py), the tiling swatches for trim, steel, chrome, rubber, cab interior, the hopper's throat and the tread
plate, and the wheel sheet. Run with plain python3 (PIL + numpy); packer.py then models the truck in Blender.
  python3 -I art/blender/vehicles/packer_paint.py   -> art/blender/vehicles/out/tex/*.png

Everything is shapes, never single pixels: brush strokes a value step up or down, panel seams with a lit lip, dust as
clusters of round dabs pooled toward edges, grime in lobed steps up from the bottoms, mud splashed up from the arch
lips (dark on the lip), rust runs, a few lobed chips with a dark rim. Type is pixel type at its native grid or whole
multiples: DotGothic16 (kana / kanji), GG Display and Alagard (tools/pixprint.py)."""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../../..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from packer_layout import P, ATLAS, VIEWS, px, TILE, WHEEL  # noqa: E402
import pixprint  # noqa: E402

OUT = os.path.join(HERE, 'out', 'tex')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(1979)
JP = ImageFont.truetype(os.path.join(ROOT, 'shots/.art-cache/fonts/px/DotGothic16-Regular.ttf'), 16)


def C(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32)


IMG = np.zeros((ATLAS, ATLAS, 3), np.float32)
KIND = np.zeros((ATLAS, ATLAS), np.uint8)   # 1 paint (takes brushwork and wear), 2 lamps / glass / type-free parts
WHITE, WHITE_D, WHITE_L = C('#e9e8e0'), C('#c9c9c1'), C('#f7f6ef')
BLUE, BLUE_D, BLUE_L = C('#245aa6'), C('#173d74'), C('#4f82c6')
SEAM, LIP = C('#8f918c'), C('#fbfaf3')
GRIME, MUD, MUD_D, DUST, RUST, RUST_D = C('#4a4239'), C('#5c4c39'), C('#2f271e'), C('#a39a88'), C('#8a5a32'), C('#5a3a22')


class View:
    def __init__(self, name):
        self.n = name
        self.ox, self.oy, self.w, self.h = VIEWS[name]

    def p(self, a, b):
        """(a, b): (z, y) on the sides, (x, y) front and back, (z, x) on the top -> atlas pixel."""
        n = self.n
        if n in ('px', 'nx'): return px(n, 0, b, a)
        if n in ('pz', 'nz', 'pz2', 'nz2'): return px(n, a, b, 0)
        return px(n, b, 0, a)

    def sl(self):
        return slice(self.oy, self.oy + self.h), slice(self.ox, self.ox + self.w)

    def mask(self, pts, outline=False, width=1):
        im = Image.new('L', (self.w, self.h), 0)
        d = ImageDraw.Draw(im)
        q = [(c - self.ox, r - self.oy) for c, r in (self.p(a, b) for a, b in pts)]
        if outline: d.line(q + [q[0]], fill=255, width=width)
        else: d.polygon(q, fill=255)
        return np.asarray(im) > 0

    def fill(self, pts, col, kind=1):
        m = self.mask(pts)
        S = self.sl()
        IMG[S][m] = col
        KIND[S][m] = kind
        return m

    def rect(self, a0, b0, a1, b1, col, kind=1):
        return self.fill([(a0, b0), (a1, b0), (a1, b1), (a0, b1)], col, kind)

    def line(self, pts, col, closed=False, width=1):
        im = Image.new('L', (self.w, self.h), 0)
        q = [(c - self.ox, r - self.oy) for c, r in (self.p(a, b) for a, b in pts)]
        ImageDraw.Draw(im).line(q + ([q[0]] if closed else []), fill=255, width=width)
        m = np.asarray(im) > 0
        IMG[self.sl()][m] = col
        return m

    def seam(self, pts, closed=False):
        """A panel seam: a dark line with a lit lip one pixel under it."""
        self.line([(a, b) for a, b in pts], SEAM, closed)
        d = 1 / P
        lip = [(a, b - d) for a, b in pts]
        m = self.mask(lip, outline=True) if closed else None
        if closed:
            S = self.sl()
            dark = (np.abs(IMG[S] - SEAM).sum(-1) < 1)
            IMG[S][m & ~dark] = IMG[S][m & ~dark] * 0.35 + LIP * 0.65
        else:
            self.line(lip, LIP * 0.7 + WHITE * 0.3)

    def stamp(self, mask, a, b, col, anchor='c', kind=1):
        """A bool type mask with its top-left / top-centre at game (a, b)."""
        c, r = self.p(a, b)
        h, w = mask.shape
        c = int(round(c - (w / 2 if anchor == 'c' else 0)))
        r = int(round(r))
        sub = IMG[r:r + h, c:c + w]
        sub[mask] = col
        KIND[r:r + h, c:c + w][mask] = kind


def jp(s, k=1):
    """DotGothic16 at its native 16 px grid (alpha-thresholded, so every edge is a hard step), scaled by whole k."""
    w = int(JP.getlength(s)) + 2
    im = Image.new('L', (w, 30), 0)
    ImageDraw.Draw(im).text((1, 0), s, font=JP, fill=255)
    m = np.asarray(im) > 110
    rows = np.where(m.any(1))[0]
    m = m[rows[0]:rows[-1] + 1]
    return np.kron(m, np.ones((k, k), bool)) if k > 1 else m


def lat(s, face='ala', k=1):
    m = pixprint.line_mask(s, face)[0]
    rows = np.where(m.any(1))[0]
    m = m[rows[0]:rows[-1] + 1]
    cols = np.where(m.any(0))[0]
    m = m[:, cols[0]:cols[-1] + 1]
    return np.kron(m, np.ones((k, k), bool)) if k > 1 else m


def outline(m, r=1):
    """The mask grown by r px (square), for hard ink outlines."""
    h, w = m.shape
    o = np.zeros((h + 2 * r, w + 2 * r), bool)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o[r + dy:r + dy + h, r + dx:r + dx + w] |= m
    return o


def hcat(*ms, gap=8):
    h = max(m.shape[0] for m in ms)
    out = [np.vstack([m, np.zeros((h - m.shape[0], m.shape[1]), bool)]) for m in ms]
    sp = np.zeros((h, gap), bool)
    res = out[0]
    for m in out[1:]: res = np.hstack([res, sp, m])
    return res


# ------------------------------------------------------------------ brush and wear, all as shapes
def ell(d, cx, cy, rx, ry, fill=255):
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=fill)


def brushwork(V, k=0.032, density=1 / 150):
    """Long strokes laid along the panels, each a value step lighter or darker, and a slow posterised drift."""
    S = V.sl()
    up, dn = Image.new('L', (V.w, V.h)), Image.new('L', (V.w, V.h))
    du, dd = ImageDraw.Draw(up), ImageDraw.Draw(dn)
    horiz = V.n != 'top'
    for _ in range(int(V.w * V.h * density)):
        cx, cy = rng.uniform(0, V.w), rng.uniform(0, V.h)
        a, b = rng.uniform(5, 12), rng.uniform(1.0, 2.2)
        ell(du if rng.random() < 0.5 else dd, cx, cy, a if horiz else b, b if horiz else a)
    u, d = np.asarray(up) > 0, np.asarray(dn) > 0
    gy, gx = np.mgrid[0:V.h, 0:V.w]
    g = rng.random((V.h // 40 + 3, V.w // 40 + 3))
    fy, fx = gy / 40, gx / 40
    iy, ix = fy.astype(int), fx.astype(int)
    ty, tx = fy - iy, fx - ix
    n = (g[iy, ix] * (1 - tx) + g[iy, ix + 1] * tx) * (1 - ty) + (g[iy + 1, ix] * (1 - tx) + g[iy + 1, ix + 1] * tx) * ty
    drift = 0.98 + np.floor(n * 3) * 0.02
    mul = drift * (1 + k * (u.astype(np.float32) - d.astype(np.float32)))
    paint = KIND[S] == 1
    IMG[S][paint] *= mul[paint][:, None]


def edge_shade(V, m, k=0.9, r=2):
    """Darker pixels just inside a panel's outline (the paint turning away from the light)."""
    e = m.copy()
    for _ in range(r):
        e = e & np.roll(e, 1, 0) & np.roll(e, -1, 0) & np.roll(e, 1, 1) & np.roll(e, -1, 1)
    rim = m & ~e
    IMG[V.sl()][rim] *= k


def blend(V, lv, col, steps):
    """lv: int level map over the view; mix toward col by steps[lv-1] on painted pixels."""
    S = V.sl()
    paint = KIND[S] == 1
    for i, a in enumerate(steps, 1):
        m = (lv == i) & paint
        IMG[S][m] = IMG[S][m] * (1 - a) + col * a


def grime(V, a0, a1, b, h, steps=(0.16, 0.3, 0.44)):
    """Grime up from a bottom edge (a0..a1 at height b): lobes of three heights, darkest at the bottom."""
    c0, r0 = V.p(a0, b)
    c1, _ = V.p(a1, b)
    c0, c1 = sorted((c0, c1))
    H = h * P
    lv = np.zeros((V.h, V.w), np.int8)
    for i, frac in enumerate((1.0, 0.55, 0.25)):
        im = Image.new('L', (V.w, V.h))
        d = ImageDraw.Draw(im)
        x = c0 - V.ox
        while x < c1 - V.ox:
            rx = rng.uniform(4, 10)
            ry = H * frac * rng.uniform(0.45, 1.0)
            ell(d, x, r0 - V.oy, rx, ry)
            x += rx * rng.uniform(0.7, 1.3)
        d.rectangle([c0 - V.ox, r0 - V.oy, c1 - V.ox, r0 - V.oy + 3], fill=255)
        m = np.asarray(im) > 0
        cols = np.zeros(V.w, bool)
        cols[max(0, int(c0 - V.ox)):int(c1 - V.ox)] = True
        m &= cols[None, :]
        m[int(r0 - V.oy) + 1:] = False
        lv[m] = i + 1
    blend(V, lv, GRIME, steps)


def splash_arch(V, zc, yc, R, ang0, ang1, n=26):
    """Mud thrown up from a wheel-arch lip: a dark band on the lip, tapering splashes and a few drops beyond."""
    lv = np.zeros((V.h, V.w), np.int8)
    band, body = Image.new('L', (V.w, V.h)), Image.new('L', (V.w, V.h))
    db, dbody = ImageDraw.Draw(band), ImageDraw.Draw(body)
    q = lambda a, b: tuple(np.subtract(V.p(a, b), (V.ox, V.oy)))
    # the band, 2-6 px, following the lip
    angs = np.linspace(ang0, ang1, 40)
    inner = [q(zc + math.cos(t) * R, yc + math.sin(t) * R) for t in angs]
    outer = [q(zc + math.cos(t) * (R + rng.uniform(2, 6) / P), yc + math.sin(t) * (R + rng.uniform(2, 6) / P)) for t in angs[::-1]]
    db.polygon(inner + outer, fill=255)
    for _ in range(n):
        t = rng.uniform(ang0, ang1)
        L = (6 + 34 * rng.random() ** 2) / P
        w = rng.uniform(1.6, 3.6) / P
        bend = rng.uniform(-0.25, 0.25)
        ca, sa = math.cos(t), math.sin(t)
        tx, ty = -sa, ca
        base = (zc + ca * R, yc + sa * R)
        pts = []
        for k in range(6):
            f = k / 5
            r = R + L * f
            off = w * (1 - 0.8 * f)
            cz, cy = zc + math.cos(t + bend * f * L / R) * r, yc + math.sin(t + bend * f * L / R) * r
            pts.append((cz + tx * off, cy + ty * off))
        for k in range(5, -1, -1):
            f = k / 5
            r = R + L * f
            off = w * (1 - 0.8 * f)
            cz, cy = zc + math.cos(t + bend * f * L / R) * r, yc + math.sin(t + bend * f * L / R) * r
            pts.append((cz - tx * off, cy - ty * off))
        dbody.polygon([q(a, b) for a, b in pts], fill=255)
        dbody.polygon([q(*base), q(*pts[1]), q(*pts[-2])], fill=255)
        if rng.random() < 0.35:
            r = R + L + rng.uniform(4, 9) / P
            c = q(zc + ca * r, yc + sa * r)
            ell(dbody, c[0], c[1], rng.uniform(1.5, 2.6), rng.uniform(1.5, 2.6))
    lv[np.asarray(body) > 0] = 1
    lv[np.asarray(band) > 0] = 2
    S = V.sl()
    paint = KIND[S] == 1
    m1, m2 = (lv == 1) & paint, (lv == 2) & paint
    IMG[S][m1] = IMG[S][m1] * 0.38 + MUD * 0.62
    IMG[S][m2] = IMG[S][m2] * 0.2 + MUD_D * 0.8


def splash_edge(V, a0, a1, b, n=14):
    """Mud thrown up a flat panel from its bottom edge (over the rear wheels)."""
    lv = np.zeros((V.h, V.w), np.int8)
    im, im2 = Image.new('L', (V.w, V.h)), Image.new('L', (V.w, V.h))
    d, d2 = ImageDraw.Draw(im), ImageDraw.Draw(im2)
    q = lambda a, bb: tuple(np.subtract(V.p(a, bb), (V.ox, V.oy)))
    for _ in range(n):
        a = rng.uniform(a0, a1)
        L, w = (6 + 30 * rng.random() ** 2) / P, rng.uniform(1.6, 3.4) / P
        lean = rng.uniform(-0.35, 0.35)
        pts = [q(a - w, b), q(a + w, b), q(a + w * 0.25 + lean * L, b + L), q(a - w * 0.25 + lean * L, b + L)]
        d.polygon(pts, fill=255)
        if rng.random() < 0.3:
            c = q(a + lean * L * 1.3, b + L + rng.uniform(4, 8) / P)
            ell(d, c[0], c[1], 1.8, 1.8)
    c0, r0 = V.p(a0, b)
    c1, _ = V.p(a1, b)
    c0, c1 = sorted((c0, c1))
    x = c0 - V.ox
    while x < c1 - V.ox:
        rx = rng.uniform(3, 8)
        if rng.random() < 0.45: ell(d2, x, r0 - V.oy, rx, rng.uniform(1.5, 3.5))
        x += rx * rng.uniform(1.2, 2.6)
    lv[np.asarray(im) > 0] = 1
    lv[np.asarray(im2) > 0] = 2
    S = V.sl()
    paint = KIND[S] == 1
    m1, m2 = (lv == 1) & paint, (lv == 2) & paint
    IMG[S][m1] = IMG[S][m1] * 0.5 + MUD * 0.5
    IMG[S][m2] = IMG[S][m2] * 0.35 + MUD_D * 0.65


def runs(V, pts, col=RUST, col2=RUST_D):
    """Rust / dirt runs: 2-3 px wide, tapering down, the top third darker."""
    for a, b, L in pts:
        w = rng.uniform(1.0, 1.6) / P
        L = L / P
        m = V.mask([(a - w, b), (a + w, b), (a + w * 0.3, b - L), (a - w * 0.3, b - L)])
        m2 = V.mask([(a - w, b), (a + w, b), (a + w * 0.6, b - L * 0.35), (a - w * 0.6, b - L * 0.35)])
        S = V.sl()
        IMG[S][m] = IMG[S][m] * 0.55 + col * 0.45
        IMG[S][m2] = IMG[S][m2] * 0.4 + col2 * 0.6


def chips(V, pts):
    """A few lobed flakes: bare primer inside a dark rim."""
    for a, b, r in pts:
        ph = rng.uniform(0, 6.28)
        rr = lambda t, k: r / P * k * (1 + 0.28 * math.sin(3 * t + ph) + 0.14 * math.sin(5 * t + 2 * ph))
        ts = np.linspace(0, 6.28, 14, endpoint=False)
        m = V.mask([(a + math.cos(t) * rr(t, 1) * 1.0, b + math.sin(t) * rr(t, 1)) for t in ts])
        m2 = V.mask([(a + math.cos(t) * rr(t, 0.55), b + math.sin(t) * rr(t, 0.55)) for t in ts])
        S = V.sl()
        IMG[S][m] = C('#3a3430')
        IMG[S][m2] = C('#9a978c')


def dust(V, centres, spread=16):
    """Dust: clusters of round dabs 6-20 px across, a ring and a denser core (two or three values)."""
    lv = np.zeros((V.h, V.w), np.int8)
    for (a, b, n) in centres:
        c, r = V.p(a, b)
        for _ in range(n):
            x, y = c - V.ox + rng.normal(0, spread), r - V.oy + rng.normal(0, spread * 0.6)
            rad = rng.uniform(3, 10)
            im = Image.new('L', (V.w, V.h))
            d = ImageDraw.Draw(im)
            ell(d, x, y, rad, rad * rng.uniform(0.7, 1))
            ring = np.asarray(im) > 0
            im2 = Image.new('L', (V.w, V.h))
            ell(ImageDraw.Draw(im2), x, y, rad * 0.5, rad * 0.4)
            core = np.asarray(im2) > 0
            lv = np.minimum(3, lv + ring.astype(np.int8) + core.astype(np.int8))
    blend(V, lv, DUST, (0.14, 0.24, 0.34))


def lamp(V, a0, b0, a1, b1, base, dark, hi, facet=6, bezel=C('#3a3c3e'), grid=True):
    """A lamp lens: a bezel, the lens in its colour with moulded facets and a lit corner."""
    V.rect(a0, b0, a1, b1, bezel, 2)
    d = 2 / P
    m = V.rect(min(a0, a1) + d, min(b0, b1) + d, max(a0, a1) - d, max(b0, b1) - d, base, 2)
    S = V.sl()
    gy, gx = np.mgrid[0:V.h, 0:V.w]
    f = m & ((gx % facet == 0) | ((gy % facet == 0) if grid else False))
    IMG[S][f] = dark
    c0, r0 = V.p(min(a0, a1) + d, max(b0, b1) - d)
    c0, r0 = int(min(c0, V.p(max(a0, a1) - d, 0)[0])), int(r0)
    IMG[r0 + 1:r0 + 4, c0 + 1:c0 + 6] = hi


def plate(V, a, b, top, bot, bg=C('#1f5a36'), ink=C('#f2f1e6'), rim=C('#0f3a20')):
    """A green commercial number plate, 0.33 x 0.165 m, its lines in DotGothic16 / Alagard at the native grid."""
    V.rect(a - 0.165, b, a + 0.165, b + 0.165, rim, 2)
    V.rect(a - 0.165 + 1 / P, b + 1 / P, a + 0.165 - 1 / P, b + 0.165 - 1 / P, bg, 2)
    t1 = hcat(*[jp(t) if any(ord(ch) > 0x2e7f for ch in t) else lat(t) for t in top], gap=6)
    t2 = hcat(*[jp(t) if any(ord(ch) > 0x2e7f for ch in t) else lat(t) for t in bot], gap=6)
    V.stamp(t1, a, b + 0.165 - 4 / P, ink, kind=2)
    V.stamp(t2, a, b + 0.165 - 23 / P, ink, kind=2)


# ------------------------------------------------------------------ the shell
CAB_Z0, CAB_Z1, CAB_Y0, ROOF = 1.22, 2.42, 0.64, 2.08
ARCH = (1.75, 0.37, 0.47)
BODY = (-2.0, 1.14, 0.82, 2.28)
RIBS = [-1.62, -1.02, -0.42, 0.18, 0.78]
HOP = [(-2.0, 0.52), (-2.0, 2.30), (-2.16, 2.34), (-2.34, 2.14), (-2.48, 1.70), (-2.48, 0.52)]


def cab_profile():
    zc, yc, R = ARCH
    arc = [(zc + math.cos(t) * R, yc + math.sin(t) * R) for t in np.linspace(math.pi - math.asin((CAB_Y0 - yc) / R), math.asin((CAB_Y0 - yc) / R), 12)]
    return [(CAB_Z0, CAB_Y0)] + arc + [(CAB_Z1, CAB_Y0), (CAB_Z1, 1.26), (2.40, 1.30), (2.30, 1.93), (2.22, 2.04), (2.12, ROOF), (1.30, ROOF), (1.24, 2.04), (CAB_Z0, 2.0)]


def side(name):
    V = View(name)
    S = V.sl()
    IMG[S] = C('#2b2a28')
    KIND[S] = 0
    # the packer body, its rail, ribs, band and lettering
    z0, z1, y0, y1 = BODY
    body = V.rect(z0, y0, z1, y1 + 0.02, WHITE)
    V.rect(z0, 0.78, z1, 0.86, C('#9a9d9e'))
    V.rect(z0, 0.78, z1, 0.79, C('#5e6163'))
    V.rect(z0, 1.10, z1, 1.36, BLUE)
    V.rect(z0, 1.10, z1, 1.105, BLUE_D)
    V.rect(z0, 1.355, z1, 1.36, BLUE_L)
    V.rect(z0, 1.40, z1, 1.415, BLUE)
    V.seam([(z0, 2.16), (z1, 2.16)])
    for z in RIBS:
        V.rect(z - 0.03, 0.86, z + 0.03, 2.14, WHITE_L)
        V.rect(z - 0.03, 1.10, z + 0.03, 1.36, BLUE_L)
        V.rect(z - 0.03 - 3 / P, 0.86, z - 0.03, 2.14, WHITE_D)   # the rib's shadow, toward the back
        V.line([(z - 0.03, 0.86), (z - 0.03, 2.14)], SEAM)
        V.line([(z + 0.03, 0.86), (z + 0.03, 2.14)], LIP)
    title = hcat(jp('森尾市', 2), jp('清掃車', 2), gap=24)
    V.stamp(outline(title, 2), -0.45, 1.98 + 2 / P, WHITE_L)
    V.stamp(title, -0.45, 1.98, BLUE_D)
    V.stamp(lat('MORIO CITY', 'ggd', 2), -0.45, 1.33 - 1 / P, WHITE_L)
    V.stamp(jp('まちを きれいに'), 0.62 if name == 'px' else 0.62, 1.04, BLUE_D)
    V.stamp(lat('No. 3', 'ala'), -1.75, 1.04, BLUE_D)
    for z in (-1.8, -1.25, -0.7, -0.15, 0.4, 0.95):
        lamp(V, z - 0.025, 0.80, z + 0.025, 0.84, C('#f0a030'), C('#c07018'), C('#ffd890'), facet=4)
    edge_shade(V, body)
    # the hopper: cooler white, its seams, the split from the body, a red / white reflector strip on its back edge
    hop = V.fill(HOP, C('#e2e3de'))
    for y in (0.95, 1.40, 1.85):
        V.seam([(-2.47, y), (-2.01, y)])
    V.line([(-2.0, 0.52), (-2.0, 2.30)], C('#55585a'), width=2)
    for k in range(8):
        y = 0.62 + k * 0.12
        V.rect(-2.475, y, -2.445, y + 0.06, C('#c8302a') if k % 2 == 0 else C('#f2f0ea'), 2)
    edge_shade(V, hop)
    # the cab
    cab = V.fill(cab_profile(), WHITE)
    V.rect(CAB_Z0, 1.02, CAB_Z1, 1.08, BLUE)
    V.rect(CAB_Z0, 1.02, CAB_Z1, 1.025, BLUE_D)
    V.rect(CAB_Z0, 1.105, CAB_Z1, 1.112, BLUE)
    door = [(1.28, 0.70), (2.30, 0.70), (2.30, 1.30), (2.21, 1.92), (2.14, 1.98), (1.28, 1.98)]
    V.seam(door, closed=True)
    win = [(1.34, 1.32), (2.26, 1.32), (2.18, 1.86), (1.34, 1.86)]
    V.fill(win, C('#2a3238'), 2)
    V.line(win, C('#1a1c1e'), closed=True, width=2)
    V.rect(1.40, 1.17, 1.52, 1.21, C('#3a3c3e'))
    V.rect(1.41, 1.19, 1.51, 1.205, C('#c9cfd3'))
    V.stamp(jp('森尾市', 2), 1.80, 1.29, BLUE_D)
    V.stamp(lat('MORIO CITY', 'ala'), 1.80, 0.97, BLUE_D)
    lamp(V, 2.27, 0.92, 2.33, 0.96, C('#f0a030'), C('#c07018'), C('#ffd890'), facet=4)
    edge_shade(V, cab)
    # the bumper's wrapped end
    V.rect(2.36, 0.42, 2.58, 0.66, C('#8e9193'))
    V.rect(2.36, 0.64, 2.58, 0.66, C('#b8bcbe'))
    V.rect(2.36, 0.42, 2.58, 0.44, C('#5e6163'))
    brushwork(V)
    # wear: grime from the bottoms, mud from the arch and over the rear wheels, rust runs, chips
    grime(V, CAB_Z0, ARCH[0] - 0.385, CAB_Y0, 0.1)
    grime(V, ARCH[0] + 0.385, CAB_Z1, CAB_Y0, 0.08)
    grime(V, z0, z1, 0.86, 0.12)
    grime(V, -2.48, -2.0, 0.52, 0.16)
    zc, yc, R = ARCH
    splash_arch(V, zc, yc, R, math.asin((CAB_Y0 - yc) / R) + 0.05, math.pi - math.asin((CAB_Y0 - yc) / R) - 0.05)
    splash_edge(V, -1.55, -0.45, 0.86)
    runs(V, [(-2.3, 1.85, 22), (-2.1, 1.40, 30), (-2.42, 0.95, 18), (-1.3, 2.16, 26), (0.5, 2.16, 16), (-0.75, 2.16, 34)])
    chips(V, [(1.45, 0.74, 3.5), (2.1, 0.76, 2.6), (-1.02, 0.90, 3.0), (-2.45, 0.58, 3.4), (-2.05, 2.2, 2.4), (0.18, 0.92, 2.6)])


def front():
    V = View('pz')
    S = V.sl()
    IMG[S] = WHITE
    KIND[S] = 1
    V.rect(-0.95, 2.08, 0.95, 2.4, WHITE)
    V.seam([(-0.86, 2.16), (0.86, 2.16)])
    cab = V.rect(-0.85, CAB_Y0, 0.85, ROOF, WHITE)
    V.rect(-0.74, 1.33, 0.74, 1.89, C('#2a3238'), 2)
    V.rect(-0.85, 1.02, 0.85, 1.08, BLUE)
    V.rect(-0.85, 1.02, 0.85, 1.025, BLUE_D)
    V.rect(-0.85, 1.105, 0.85, 1.112, BLUE)
    V.stamp(jp('森尾市', 2), 0, 1.29, BLUE_D)
    # the grille: dark slats with a lit top edge
    V.rect(-0.48, 0.80, 0.48, 1.00, C('#1c1d1f'), 2)
    y = 0.815
    while y < 0.99:
        V.rect(-0.47, y, 0.47, y + 0.016, C('#4a4e52'), 2)
        V.rect(-0.47, y + 0.012, 0.47, y + 0.016, C('#8e959a'), 2)
        y += 0.03
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.56, s * 0.80))
        lamp(V, x0, 0.80, x1, 0.97, C('#dfe6e8'), C('#b4c0c5'), C('#ffffff'), facet=6, bezel=C('#b9bfc3'), grid=False)
        x0, x1 = sorted((s * 0.60, s * 0.80))
        lamp(V, x0, 0.69, x1, 0.76, C('#f0a030'), C('#c07018'), C('#ffd890'), facet=5)
    V.rect(-0.60, 0.70, 0.60, 0.72, C('#3a3c3e'))
    edge_shade(V, cab)
    # the bumper and the plate
    V.rect(-0.95, 0.42, 0.95, 0.66, C('#8e9193'))
    V.rect(-0.95, 0.64, 0.95, 0.66, C('#b8bcbe'))
    V.rect(-0.95, 0.42, 0.95, 0.44, C('#5e6163'))
    for x in (-0.62, 0.62):
        V.rect(x - 2 / P, 0.53, x + 2 / P, 0.55, C('#4a4c4e'))
    plate(V, 0, 0.455, ['森尾', '800'], ['さ', '3-71'])
    brushwork(V)
    grime(V, -0.85, 0.85, CAB_Y0, 0.08)
    grime(V, -0.95, 0.95, 0.42, 0.07)
    chips(V, [(-0.7, 0.50, 3.0), (0.4, 0.62, 2.4), (0.83, 0.9, 2.6)])


def back():
    V = View('nz')
    S = V.sl()
    IMG[S] = C('#e2e3de')
    KIND[S] = 1
    hop = V.rect(-0.88, 0.52, 0.88, 2.34, C('#e2e3de'))
    V.seam([(-0.88, 1.70), (0.88, 1.70)])
    V.seam([(-0.88, 2.12), (0.88, 2.12)])
    # chevrons along the bottom
    m = V.rect(-0.88, 0.52, 0.88, 0.73, C('#1c1c1c'), 2)
    gy, gx = np.mgrid[0:V.h, 0:V.w]
    st = m & (((gx + gy) // 14) % 2 == 0)
    IMG[S][st] = C('#e8b81a')
    # the mouth and its steel lip
    V.rect(-0.66, 0.76, 0.66, 1.42, C('#1b1c1d'), 2)
    V.rect(-0.69, 1.42, 0.69, 1.45, C('#c8ccd0'))
    V.rect(-0.69, 0.73, 0.69, 0.76, C('#a8acb0'))
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.70, s * 0.86))
        lamp(V, x0, 0.88, x1, 0.98, C('#c8281e'), C('#8a1812'), C('#ff9a80'), facet=5)
        lamp(V, x0, 0.77, x1, 0.86, C('#f0a030'), C('#c07018'), C('#ffd890'), facet=5)
    V.rect(-0.19, 0.525, 0.19, 0.715, C('#1c1c1c'), 2)
    plate(V, 0, 0.535, ['森尾', '800'], ['さ', '3-71'])
    title = jp('森尾市', 2)
    V.stamp(title, 0, 2.02, BLUE_D)
    V.stamp(lat('MORIO CITY', 'ggd'), 0, 1.86, BLUE)
    warn = jp('キケン 近よらないで')
    V.stamp(outline(warn, 1), 0, 1.62 + 1 / P, C('#f2f0ea'))
    V.stamp(warn, 0, 1.62, C('#b8281e'))
    edge_shade(V, hop)
    brushwork(V)
    grime(V, -0.88, 0.88, 0.52, 0.1)
    runs(V, [(-0.62, 0.76, 34), (-0.3, 0.76, 22), (0.15, 0.76, 40), (0.55, 0.76, 26), (-0.8, 2.12, 20), (0.7, 1.70, 24)], col=GRIME, col2=MUD_D)
    chips(V, [(-0.5, 1.44, 3.2), (0.3, 1.43, 2.6), (0.8, 0.8, 2.8), (-0.86, 1.2, 2.4)])


def top():
    V = View('top')
    S = V.sl()
    IMG[S] = WHITE
    KIND[S] = 1
    V.rect(1.14, -0.95, 1.22, 0.95, C('#2b2a28'), 0)
    for z in RIBS:
        V.rect(z - 0.03, -0.86, z + 0.03, 0.86, WHITE_L)
        V.rect(z - 0.03 - 3 / P, -0.86, z - 0.03, 0.86, WHITE_D)
    V.seam([(-2.0, -0.86), (-2.0, 0.86)])
    V.seam([(2.12, -0.84), (2.12, 0.84)])
    brushwork(V)
    cs = []
    for _ in range(26):
        z = rng.uniform(-2.3, 2.3)
        x = rng.choice([-1, 1]) * rng.uniform(0.55, 0.84) if rng.random() < 0.7 else rng.uniform(-0.6, 0.6)
        cs.append((z, x, int(rng.integers(3, 8))))
    for z in (-1.98, 1.1, 1.26, 2.1):
        for _ in range(3):
            cs.append((z + rng.uniform(-0.05, 0.05), rng.uniform(-0.8, 0.8), int(rng.integers(3, 6))))
    dust(V, cs)
    runs(V, [(rng.uniform(-1.9, 1.0), rng.uniform(-0.8, 0.8), 14) for _ in range(4)], col=GRIME, col2=MUD_D)


def behind(name):
    """The faces turned forward behind the cab / back ahead of the hopper: plain body white, seams, grime low down."""
    V = View(name)
    S = V.sl()
    IMG[S] = WHITE
    KIND[S] = 1
    V.rect(-0.95, 0.16, 0.95, 0.82, C('#9a9d9e'))
    V.seam([(-0.86, 2.16), (0.86, 2.16)])
    if name == 'nz2': V.rect(-0.45, 1.52, 0.45, 1.86, C('#2a3238'), 2)
    brushwork(V)
    grime(V, -0.9, 0.9, 0.82, 0.1)
    grime(V, -0.86, 0.86, 0.64, 0.08)


def bottom():
    V = View('bot')
    S = V.sl()
    IMG[S] = C('#3a3631')
    KIND[S] = 1
    brushwork(V, k=0.08, density=1 / 60)




# ------------------------------------------------------------------ swatches (tileable, 0.5 m)
def swatch(name, base, strokes=((0.94, 1.06), 1 / 90), spots=None, bands=None, draw=None):
    N = TILE
    im = np.zeros((N, N, 3), np.float32) + base
    up, dn = Image.new('L', (N * 3, N * 3)), Image.new('L', (N * 3, N * 3))
    du, dd = ImageDraw.Draw(up), ImageDraw.Draw(dn)
    for _ in range(int(N * N * strokes[1])):
        cx, cy, a, b = rng.uniform(0, N), rng.uniform(0, N), rng.uniform(4, 10), rng.uniform(1.0, 2.0)
        for ox in (0, N, 2 * N):
            for oy in (0, N, 2 * N):
                ell(du if _ % 2 else dd, cx + ox, cy + oy, a, b)
    u = (np.asarray(up)[N:2 * N, N:2 * N] > 0).astype(np.float32)
    d = (np.asarray(dn)[N:2 * N, N:2 * N] > 0).astype(np.float32)
    im *= (1 + (strokes[0][1] - 1) * u - (1 - strokes[0][0]) * d)[..., None]
    if spots:
        col, n, r0, r1, a = spots
        lay = Image.new('L', (N * 3, N * 3))
        dl = ImageDraw.Draw(lay)
        for _ in range(n):
            cx, cy, r = rng.uniform(0, N), rng.uniform(0, N), rng.uniform(r0, r1)
            for ox in (0, N, 2 * N):
                for oy in (0, N, 2 * N):
                    ell(dl, cx + ox, cy + oy, r, r * rng.uniform(0.6, 1))
        m = np.asarray(lay)[N:2 * N, N:2 * N] > 0
        im[m] = im[m] * (1 - a) + col * a
    if bands:
        for y0, h, col in bands:
            im[y0:y0 + h] = col
    if draw: draw(im)
    Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(os.path.join(OUT, name + '.png'))


def tread(im):
    """Raised diamond tread plate: each lug lit on top, shadowed under."""
    for gy in range(0, TILE, 12):
        for gx in range(0, TILE, 12):
            ox = gx + (6 if (gy // 12) % 2 else 0)
            for k in range(-3, 4):
                x, y = (ox + k * (1 if (gy // 12) % 2 else -1)) % TILE, gy + 4 + k // 2
                im[y % TILE, x] = C('#b8bcbf')
                im[(y + 1) % TILE, x] = C('#c9cdd0')
                im[(y + 2) % TILE, x] = C('#4e5254')




# ------------------------------------------------------------------ the wheel sheet
def wheel():
    W, H = WHEEL
    im = np.zeros((H, W, 3), np.float32)
    gy, gx = np.mgrid[0:256, 0:256]
    k = 256 / 0.8
    dx, dy = (gx + 0.5 - 128) / k, (gy + 0.5 - 128) / k
    r, a = np.hypot(dx, dy), np.arctan2(dy, dx)
    disc = np.zeros((256, 256, 3), np.float32) + C('#202122')
    def put(m, col): disc[m] = col
    put(r < 0.37, C('#2a2b2c'))
    put((r > 0.305) & (r < 0.315), C('#38393a'))
    put((r > 0.355) & (r < 0.37), C('#1f2021'))
    put(r < 0.245, C('#a9aaa3'))
    put(r < 0.236, C('#e6e5dc'))
    put((r > 0.226) & (r < 0.232), C('#b3b3aa'))
    for i in range(8):
        t = i / 8 * 6.283 + 0.2
        cx, cy = math.cos(t) * 0.175, math.sin(t) * 0.175
        put(np.hypot(dx - cx, dy - cy) < 0.026, C('#151515'))
        put((np.hypot(dx - cx, dy - cy) < 0.026) & (dy - cy < -0.012), C('#2a2a28'))
    put((r > 0.128) & (r < 0.134), C('#b9b8ae'))
    put(r < 0.128, C('#d2d1c7'))
    for i in range(6):
        t = i / 6 * 6.283
        cx, cy = math.cos(t) * 0.09, math.sin(t) * 0.09
        put((np.abs(dx - cx) < 0.011) & (np.abs(dy - cy) < 0.011), C('#5a5a55'))
        put((np.abs(dx - cx) < 0.007) & (np.abs(dy - cy) < 0.007), C('#e9e9e2'))
    put(r < 0.058, C('#8f8e86'))
    put(r < 0.05, C('#c9c8be'))
    put((r < 0.05) & (dy < -0.015) & (dx < 0), C('#e9e8df'))
    # brushwork rings and wear: grime settled in the bottom of the dish, brake dust, mud on the tyre wall
    for _ in range(260):
        t, rr = rng.uniform(-3.14, 3.14), rng.uniform(0.05, 0.37)
        m = (np.abs(r - rr) < rng.uniform(0.004, 0.008)) & (np.abs(np.angle(np.exp(1j * (a - t)))) < rng.uniform(0.1, 0.3))
        disc[m] *= 0.95 if rng.random() < 0.5 else 1.05
    for _ in range(20):
        t = rng.uniform(0.3, 2.8)
        rr = rng.uniform(0.14, 0.23)
        cx, cy = math.cos(t) * rr, math.sin(t) * rr
        m = np.hypot(dx - cx, dy - cy) < rng.uniform(0.01, 0.022)
        disc[m] = disc[m] * 0.55 + C('#6a5238') * 0.45
    for _ in range(26):
        t = rng.uniform(0.2, 2.9)
        rr = rng.uniform(0.26, 0.36)
        cx, cy = math.cos(t) * rr, math.sin(t) * rr
        m = np.hypot(dx - cx, dy - cy) < rng.uniform(0.008, 0.02)
        disc[m] = disc[m] * 0.4 + C('#5c4c39') * 0.6
    im[:256] = disc
    # the tread strip: blocks between four grooves, sipes across, dirt packed in the grooves
    st = np.zeros((64, 256, 3), np.float32) + C('#2b2c2d')
    for y0 in (14, 30, 46):
        st[y0:y0 + 3] = C('#121314')
    for x in range(0, 256, 16):
        for y0, y1, off in ((0, 14, 0), (17, 30, 8), (33, 46, 0), (49, 64, 8)):
            st[y0:y1, (x + off) % 256:(x + off) % 256 + 2] = C('#141516')
            st[y0:y0 + 1, (x + off + 2) % 256:(x + off + 10) % 256] = C('#3a3b3c')
    for _ in range(30):
        x, y = rng.integers(0, 256), rng.choice([14, 30, 46])
        st[y:y + 3, x:x + rng.integers(4, 12)] = C('#4a3e30')
    im[256:] = st
    Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'wheel.png'))


if __name__ == '__main__':
    for n in ('px', 'nx'): side(n)
    front(); back(); top(); bottom(); behind('pz2'); behind('nz2')
    Image.fromarray(np.clip(IMG, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'packer_atlas.png'))
    swatch('trim', C('#25272a'), spots=(C('#3c4044'), 10, 2, 5, 0.6))
    swatch('steel', C('#8d9194'), spots=(C('#a9adb0'), 40, 3, 8, 0.5))
    swatch('chrome', C('#c7ccd0'), strokes=((0.97, 1.03), 1 / 200), bands=[(20, 6, C('#6d7378')), (26, 3, C('#9aa1a6')), (70, 4, C('#eef3f6')), (100, 5, C('#7d8388'))])
    swatch('rubber', C('#1e1f20'), spots=(C('#2c2d2e'), 16, 3, 7, 0.7))
    swatch('interior', C('#3c4148'), spots=(C('#2e3238'), 18, 4, 10, 0.6))
    swatch('dark', C('#2a2622'), spots=(C('#4a3424'), 24, 3, 9, 0.6))
    swatch('checker', C('#7d8184'), spots=(C('#5f5a52'), 14, 3, 8, 0.5), draw=tread)
    wheel()
    print('painted', sorted(os.listdir(OUT)))
