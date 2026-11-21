"""pixprint.py: the pixel-art print shop for posters, flyers and gacha display cards (the owner's gashapon boards,
scratchpad ref_gacha: huge chunky outlined titles, hero product photo, line-up strip, price / N types / age badges,
yellow warning block, maker logo, barcode and QR, flat colour fields, dots, stripes, rays, diagonal splits, burst
stickers, little annotation arrows).

All type is pixel type, ALL ENGLISH, set at each face's native pixel grid (one font pixel = a whole block of output
pixels, scale by whole numbers, nearest only), never anti-aliased. Effects: hard pixel outlines and hard offset /
extruded shadows only (no glow, gradient, bevel, emboss, soft shadow, sparkles). Pictures are real photographs and the
real in-game toy renders (tools/render-toys.mjs), resampled once into place.

Faces (OFL, Google Fonts repo, fetched into shots/.art-cache/fonts/px at bake time; the game ships the baked images):
  ps2p   Press Start 2P (CodeMan38)         8 px em, chunky arcade caps
  silk / silkb  Silkscreen / Bold (Jason Kottke)  8 px em, cap 5: labels, badges
  jersey10 / 15 / 20 / 25  Jersey (Sarah Cadigan-Fried)  cap 10 / 15 / 20 / 25: condensed varsity display
  micro5 Micro 5 (Sarah Cadigan-Fried)      cap 5: the small print
  jacq12 / jacq24  Jacquard 12 / 24 (Sarah Cadigan-Fried)  pixel blackletter: old shop signs, vintage bills
  ala    Alagard (the game's UI face)       16 px em
  b5     the game's own 5 x 7 bitmap font (src/gfx/font5x7.js)

  S = Sheet(w, h, bg)                                       an output-size RGB print
  S.photo(ref, x, y, w, h, f=(fx, fy, zoom), clip=None)     a real photo (printkit refs), clip: polygon points
  S.text(s, x, y, face, scale, fill, anchor='lt', outline=[(r, col)...], shadow=(dx, dy, col), extrude=(dx, dy, n, col),
         track=0, bold=0, fills=None, bounce=None, maxw=None) -> (x0, y0, x1, y1)
  S.para(text, x, y, w, face, scale, fill, lh=None, align='l', maxy=None) -> y after
  S.rect / frame / poly / ellipse / line / dots / stripes / rays / burst / ribbon / arrow / badge / warning / barcode / qr
  S.toy(series, item, x, y, h, anchor='mb')                 the in-game toy render
  S.image() -> PIL RGB
"""
import math, os, re, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from printkit import ROOT, CACHE, fetch, source, cover, printed, rgb, mixc, jan13, L_CODES, G_CODES, R_CODES, PARITY

GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
FACES = {  # name: (repo path, native px per em)
    'ps2p': ('pressstart2p/PressStart2P-Regular.ttf', 8),
    'silk': ('silkscreen/Silkscreen-Regular.ttf', 8),
    'silkb': ('silkscreen/Silkscreen-Bold.ttf', 8),
    'jersey10': ('jersey10/Jersey10-Regular.ttf', 1400 / 75),
    'jersey15': ('jersey15/Jersey15-Regular.ttf', 27),
    'jersey20': ('jersey20/Jersey20-Regular.ttf', 34),
    'jersey25': ('jersey25/Jersey25-Regular.ttf', 41),
    'micro5': ('micro5/Micro5-Regular.ttf', 11),
    'jacq12': ('jacquard12/Jacquard12-Regular.ttf', 21),
    'jacq24': ('jacquard24/Jacquard24-Regular.ttf', 43),
    'ala': (None, 16),
}
K = 8  # faces are rasterised at 8x their grid and sampled at the block centres (exact, whatever the outline offsets)
TOYS = os.path.join(CACHE, 'toys')


def _path(face):
    rel, _ = FACES[face]
    if rel is None: return os.path.join(ROOT, 'src', 'assets', 'fonts', 'alagard.woff2')
    return fetch(GF + rel, os.path.join(CACHE, 'fonts', 'px', os.path.basename(rel)))


_F = {}
def _font(face):
    if face not in _F:
        f = ImageFont.truetype(_path(face), FACES[face][1] * K)
        asc, desc = f.getmetrics()
        _F[face] = {'f': f, 'asc': asc, 'desc': desc, 'phase': None}
        _F[face]['phase'] = _phase(face)
    return _F[face]


def _raster(face, s, ox=0, oy=0):
    F = _F[face]['f'] if face in _F else _font(face)['f']
    asc, desc = F.getmetrics()
    w = int(F.getlength(s)) + 4 * K
    im = Image.new('L', (w + K, asc + desc + 4 * K), 0)
    ImageDraw.Draw(im).text((2 * K + ox, 2 * K + oy), s, font=F, fill=255)
    return np.asarray(im, np.float32) / 255


def _phase(face):
    """The sub-block offset that puts the face's pixel grid on our blocks (the outlines sit on font units)."""
    a = _raster(face, 'HAMBURGEROS mwgk 0258')
    best = (9, 0, 0)
    for py in range(K):
        for px in range(K):
            b = a[py:py + (a.shape[0] - K) // K * K, px:px + (a.shape[1] - K) // K * K]
            r = b.reshape(b.shape[0] // K, K, b.shape[1] // K, K).mean((1, 3))
            ink = (r > 0.02).sum(); grey = ((r > 0.15) & (r < 0.85)).sum() / max(1, ink)
            if grey < best[0]: best = (grey, px, py)
    return best[1], best[2]


_G = {}
def glyph(face, ch):
    """One character at the face's native grid -> (bool mask rows x cols, advance px, baseline row)."""
    if face == 'b5': face = 'ala'  # the old 5x7 face is gone (owner: high-res pixel fonts only)
    k = (face, ch)
    if k in _G: return _G[k]
    if face == 'ggd':  # our own hand-pixelled display face (tools/fonts/gg_display.py)
        from fonts.gg_display import glyph as ggd
        rows, adv, base = ggd(ch)
        _G[k] = (np.array([[c == '#' for c in r] for r in rows], bool), adv, base)
        return _G[k]
    if face == 'b5':
        g = _b5().get(ch.upper()) or _b5().get('?')
        m = np.array([[c == '#' for c in row] for row in g], bool)
        _G[k] = (m, m.shape[1] + 1, 7)
        return _G[k]
    F = _font(face); f = F['f']; px, py = F['phase']
    a = _raster(face, ch)
    a = a[py:, px:]
    H, W = a.shape[0] // K, a.shape[1] // K
    a = a[:H * K, :W * K]
    m = a[K // 2::K, K // 2::K] > 0.5  # block centres
    # columns: the glyph's box starts at the text origin (2 blocks in, less the phase)
    x0 = (2 * K - px) // K if px else 2
    base = (2 * K + F['asc'] - py) / K
    adv = int(round(f.getlength(ch) / K))
    _G[k] = (m[:, x0:x0 + max(adv, 1) + 4], adv, int(round(base)))
    return _G[k]


_B5 = None
def _b5():
    global _B5
    if _B5 is None:
        src = open(os.path.join(ROOT, 'src', 'gfx', 'font5x7.js'), encoding='utf-8').read()
        body = src[src.index('const GLYPHS'):src.index('};', src.index('const GLYPHS'))]
        _B5 = {}
        for mm in re.finditer(r"(?:'((?:\\'|[^'])+)'|\"([^\"]+)\"|([A-Za-z0-9]))\s*:\s*'([.#|]+)'", body):
            ch = (mm.group(1) or mm.group(2) or mm.group(3)).replace("\\'", "'")
            _B5[ch] = mm.group(4).split('|')
    return _B5


ALIAS = {'’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', 'é': 'e', 'É': 'E', 'ō': 'o', 'ū': 'u', 'Ō': 'O', 'Ū': 'U'}


def line_mask(s, face, track=0, bold=0, bounce=None):
    """A line of type at the native grid -> (bool mask, cap_top row, baseline row, [per-letter column spans])."""
    s = ''.join(ALIAS.get(c, c) for c in s)
    if face == 'ggd': s = s.upper()
    parts, x, spans = [], 0, []
    base = max((glyph(face, c)[2] for c in s), default=0) if s else 0
    for i, c in enumerate(s):
        m, adv, b = glyph(face, c)
        dy = (bounce[i % len(bounce)] if bounce else 0)
        parts.append((m, x, base - b + dy))
        spans.append((x, x + adv))
        x += adv + track + (bold if c != ' ' else 0)
    W = max([px + m.shape[1] for m, px, _ in parts] + [1]) + bold + 2
    top = min([py for _, _, py in parts] + [0]); bot = max([py + m.shape[0] for m, _, py in parts] + [1])
    out = np.zeros((bot - top, W), bool)
    for m, px, py in parts:
        sub = out[py - top:py - top + m.shape[0], px:px + m.shape[1]]
        sub |= m[:sub.shape[0], :sub.shape[1]]
    if bold:
        b = out.copy()
        for i in range(1, bold + 1): b[:, i:] |= out[:, :-i]
        out = b
    # trim empty rows / cols, remembering where the baseline and cap height are
    rows = np.flatnonzero(out.any(1)); cols = np.flatnonzero(out.any(0))
    if not len(rows): return np.zeros((1, 1), bool), 0, 1, spans
    r0, r1, c0, c1 = rows[0], rows[-1] + 1, cols[0], cols[-1] + 1
    out = out[r0:r1, c0:c1]
    return out, 0, base - top - r0, [(a - c0, b - c0) for a, b in spans]


def text_size(s, face, scale=1, track=0, bold=0):
    m, _, _, _ = line_mask(s, face, track, bold)
    return m.shape[1] * scale, m.shape[0] * scale


def _dilate(m, r, shape='sq'):
    """Grow a bool mask by r pixels: 'sq' square (8-way), 'plus' (4-way, 1 px), 'disc' (rounded)."""
    if r <= 0: return m.copy()
    H, W = m.shape
    out = np.zeros((H + 2 * r, W + 2 * r), bool)
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if shape == 'plus' and abs(dx) + abs(dy) > r: continue
            if shape == 'disc' and dx * dx + dy * dy > r * r + r * 0.8: continue
            out[r + dy:r + dy + H, r + dx:r + dx + W] |= m
    return out


def styled(s, face, fill, outline=None, shadow=None, extrude=None, track=0, bold=0, fills=None, bounce=None, band=None):
    """A line of type with its hard outlines and shadow, composed at the native grid -> RGBA image, (ox, oy) of the
    letters inside it, cap box height. outline: [(r, col, shape?)...] innermost first. shadow: (dx, dy, col) of the
    whole outlined silhouette. extrude: (dx, dy, n, col) a stepped block shadow. fills: per-letter colours (cycled).
    band: (row fraction, col) a hard two-tone split across the letters (a printed second ink, never a gradient)."""
    m, _, base, spans = line_mask(s, face, track, bold, bounce)
    layers = [(m, rgb(fill))]
    sil = m; pad = 0
    for o in (outline or []):
        r, col = o[0], o[1]; shape = o[2] if len(o) > 2 else ('sq' if r == 1 else 'disc')
        sil = _dilate(sil, r, shape); pad += r
        layers.append((sil, rgb(col)))
    ex = [0, 0]
    if shadow: ex = [abs(shadow[0]), abs(shadow[1])]
    if extrude: ex = [max(ex[0], abs(extrude[0] * extrude[2])), max(ex[1], abs(extrude[1] * extrude[2]))]
    H, W = sil.shape
    img = np.zeros((H + ex[1], W + ex[0], 4), np.uint8)
    def put(mask, col, dx=0, dy=0):
        hh, ww = mask.shape
        o = (H - hh) // 2, (W - ww) // 2
        sub = img[o[0] + dy:o[0] + dy + hh, o[1] + dx:o[1] + dx + ww]
        sub[mask] = col + (255,)
    if extrude:
        dx, dy, n, col = extrude
        for i in range(n, 0, -1): put(sil, rgb(col), dx * i if dx > 0 else 0, dy * i if dy > 0 else 0)
    if shadow:
        dx, dy, col = shadow; put(sil, rgb(col), max(0, dx), max(0, dy))
    for mask, col in reversed(layers[1:]): put(mask, col)
    # the letters themselves (per-letter colours, the two-tone band)
    hh, ww = m.shape; o = ((H - hh) // 2, (W - ww) // 2)
    cols = np.zeros(m.shape + (3,), np.uint8); cols[:] = rgb(fill)
    if fills:
        for i, (a, b) in enumerate(spans):
            cols[:, max(0, a):max(0, b)] = rgb(fills[i % len(fills)])
    if band:
        fr, col = band; cols[int(round(hh * fr)):] = rgb(col)
    sub = img[o[0]:o[0] + hh, o[1]:o[1] + ww]
    sub[m, :3] = cols[m]; sub[m, 3] = 255
    return Image.fromarray(img, 'RGBA'), (o[1], o[0]), hh


class Sheet:
    def __init__(self, w, h, bg=0xffffff):
        """bg None: a transparent RGBA layer (a card's graphics over its photo and toys)."""
        self.w, self.h = int(w), int(h)
        self.im = Image.new('RGBA', (self.w, self.h), (0, 0, 0, 0)) if bg is None else Image.new('RGB', (self.w, self.h), rgb(bg))
        self.d = ImageDraw.Draw(self.im)
        self.rn = random.Random(w * 31 + h)

    # ------------------------------------------------------------ flat shapes (aliased: every edge a pixel step)
    def rect(self, x, y, w, h, c):
        if w <= 0 or h <= 0: return
        self.d.rectangle((int(x), int(y), int(x + w) - 1, int(y + h) - 1), fill=rgb(c))

    def frame(self, x, y, w, h, c, t=1):
        for i in range(t): self.d.rectangle((int(x) + i, int(y) + i, int(x + w) - 1 - i, int(y + h) - 1 - i), outline=rgb(c))

    def rrect(self, x, y, w, h, c, r=2, line=None, t=1):
        """A pixel rounded box (r: corner steps), optional hard outline of t px."""
        if line is not None:
            self.d.rounded_rectangle((int(x), int(y), int(x + w) - 1, int(y + h) - 1), radius=r + t, fill=rgb(line))
            x, y, w, h = x + t, y + t, w - 2 * t, h - 2 * t
        self.d.rounded_rectangle((int(x), int(y), int(x + w) - 1, int(y + h) - 1), radius=r, fill=rgb(c))

    def poly(self, pts, c):
        self.d.polygon([(int(round(px)), int(round(py))) for px, py in pts], fill=rgb(c))

    def ellipse(self, x, y, w, h, c, line=None, t=1):
        if line is not None:
            self.d.ellipse((int(x), int(y), int(x + w) - 1, int(y + h) - 1), fill=rgb(line))
            x, y, w, h = x + t, y + t, w - 2 * t, h - 2 * t
        self.d.ellipse((int(x), int(y), int(x + w) - 1, int(y + h) - 1), fill=rgb(c))

    def line(self, pts, c, t=1):
        self.d.line([(int(round(px)), int(round(py))) for px, py in pts], fill=rgb(c), width=t)

    def _region(self, region):
        """A bool mask over the sheet: region = (x, y, w, h) or a polygon [(x, y)...] or a bool array."""
        if isinstance(region, np.ndarray): return region
        m = Image.new('L', (self.w, self.h), 0); d = ImageDraw.Draw(m)
        if len(region) == 4 and not isinstance(region[0], (tuple, list)):
            x, y, w, h = region; d.rectangle((int(x), int(y), int(x + w) - 1, int(y + h) - 1), fill=255)
        else: d.polygon([(int(round(px)), int(round(py))) for px, py in region], fill=255)
        return np.asarray(m) > 0

    def _paint(self, mask, c):
        a = np.asarray(self.im).copy(); a[mask] = rgb(c) + ((255,) if a.shape[2] == 4 else ())
        self.im = Image.fromarray(a); self.d = ImageDraw.Draw(self.im)

    def fill(self, region, c): self._paint(self._region(region), c)

    def dots(self, region, c, step=6, size=2, stagger=True, ox=0, oy=0):
        """A printed dot screen: size x size pixel dots every step px (rows staggered)."""
        R = self._region(region)
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        sx = (xx - ox + ((yy - oy) // step % 2) * (step // 2 if stagger else 0)) % step
        sy = (yy - oy) % step
        dot = (sx < size) & (sy < size)
        if size >= 3:  # round the bigger dots off (no corner pixels)
            dot &= ~(((sx == 0) | (sx == size - 1)) & ((sy == 0) | (sy == size - 1)))
        self._paint(R & dot, c)

    def stripes(self, region, c, w=4, gap=4, slope=1):
        """Diagonal (slope 1 / -1) or straight (slope 0: vertical, None: horizontal) stripes."""
        R = self._region(region)
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        u = yy if slope is None else (xx + slope * yy)
        self._paint(R & ((u % (w + gap)) < w), c)

    def checks(self, region, c, s=4):
        R = self._region(region)
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        self._paint(R & (((xx // s) + (yy // s)) % 2 == 0), c)

    def rays(self, region, cx, cy, c, n=16, rot=0.0, duty=0.5):
        """A sunburst: n wedges of colour c round (cx, cy), clipped to region."""
        R = self._region(region)
        yy, xx = np.mgrid[0:self.h, 0:self.w]
        a = (np.arctan2(yy - cy, xx - cx) / (2 * math.pi) * n + rot) % 1.0
        self._paint(R & (a < duty), c)

    # ------------------------------------------------------------ pictures
    def photo(self, ref, x, y, w, h, f=(0.5, 0.5, 1.0), sat=0.95, con=1.04, bright=1.0, warm=0.0, clip=None, flip=False):
        W, H = int(round(w)), int(round(h))
        im = printed(cover(source(ref), W, H, f), sat, con, bright, warm)
        if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if clip is not None:
            m = Image.new('L', (self.w, self.h), 0)
            ImageDraw.Draw(m).polygon([(int(round(px)), int(round(py))) for px, py in clip], fill=255)
            m = m.crop((int(x), int(y), int(x) + W, int(y) + H))
            self.im.paste(im, (int(x), int(y)), m)
        else: self.im.paste(im, (int(x), int(y)))

    def toy_img(self, series, item, h=None, w=None):
        p = os.path.join(TOYS, series, item + '.png')
        if not os.path.exists(p): return None
        t = Image.open(p).convert('RGBA'); bb = t.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        if not bb: return None
        t = t.crop(bb)
        k = min((h or 1e9) / t.height, (w or 1e9) / t.width)
        t = t.resize((max(1, int(round(t.width * k))), max(1, int(round(t.height * k)))), Image.LANCZOS)
        a = np.asarray(t).copy(); a[..., 3] = np.where(a[..., 3] > 110, 255, 0)  # a hard cut edge (no fringe)
        return Image.fromarray(a, 'RGBA')

    def toy(self, series, item, x, y, h=None, w=None, anchor='mb', outline=None, shadow=None, silhouette=None, ground=None):
        """Paste the in-game toy render. outline: (r, col) a hard die-cut rim; shadow: (dx, dy, col) a flat offset
        silhouette; silhouette: col (the secret printed as a flat ink shape); ground: col a flat contact ellipse."""
        t = self.toy_img(series, item, h, w)
        if t is None: return None
        X = int(round(x - {'l': 0, 'm': t.width / 2, 'r': t.width}[anchor[0]]))
        Y = int(round(y - {'t': 0, 'm': t.height / 2, 'b': t.height}[anchor[1]]))
        A = np.asarray(t.getchannel('A')) > 0
        if ground is not None:
            gw = int(t.width * 0.8); gh = max(3, int(t.width * 0.12))
            self.ellipse(X + (t.width - gw) // 2, Y + t.height - gh // 2 - 1, gw, gh, ground)
        if shadow is not None:
            dx, dy, col = shadow; self._stamp(A, X + dx, Y + dy, col)
        if outline is not None:
            r, col = outline; self._stamp(_dilate(A, r, 'disc'), X - r, Y - r, col)
        if silhouette is not None: self._stamp(A, X, Y, silhouette)
        else: self.im.paste(t, (X, Y), t)
        return (X, Y, X + t.width, Y + t.height)

    def _stamp(self, mask, x, y, col):
        lay = Image.new(self.im.mode, (mask.shape[1], mask.shape[0]), rgb(col) + ((255,) if self.im.mode == 'RGBA' else ()))
        self.im.paste(lay, (int(x), int(y)), Image.fromarray((mask * 255).astype(np.uint8)))

    # ------------------------------------------------------------ type
    def text(self, s, x, y, face='silk', scale=1, fill=0x1c1816, anchor='lt', outline=None, shadow=None, extrude=None,
             track=0, bold=0, fills=None, bounce=None, band=None, maxw=None):
        """Set a line of pixel type; (x, y) is the anchor point of the letters' ink box ('lt', 'mm', 'rb'...).
        maxw: steps the scale down (whole numbers) until it fits. Returns the letters' box (x0, y0, x1, y1)."""
        while True:
            lay, (ox, oy), hh = styled(s, face, fill, outline, shadow, extrude, track, bold, fills, bounce, band)
            core_w = styled_core_w(lay, ox, shadow, extrude)
            if not maxw or core_w * scale <= maxw or scale <= 1: break
            scale -= 1
        if scale != 1: lay = lay.resize((lay.width * scale, lay.height * scale), Image.NEAREST)
        cw, ch = core_w * scale, hh * scale
        X = x - {'l': 0, 'm': cw / 2, 'r': cw}[anchor[0]]
        Y = y - {'t': 0, 'm': ch / 2, 'b': ch}[anchor[1]]
        X, Y = int(round(X)), int(round(Y))
        self.im.paste(lay, (X - ox * scale, Y - oy * scale), lay)
        return (X, Y, X + cw, Y + ch)

    def para(self, text, x, y, w, face='micro5', scale=1, fill=0x1c1816, lh=None, align='l', maxy=None, track=0):
        """Word-wrapped pixel type in a column w px wide; returns the y below the last line."""
        _, hh = text_size('Ag', face, scale)
        lh = lh or hh + 2 * scale
        out = []
        for para in text.split('\n'):
            cur = ''
            for word in para.split(' '):
                t = (cur + ' ' + word).strip()
                if cur and text_size(t, face, scale, track)[0] > w: out.append(cur); cur = word
                else: cur = t
            out.append(cur)
        for l in out:
            if maxy is not None and y + lh > maxy + 1: break
            if l: self.text(l, x if align == 'l' else x + w / 2 if align == 'm' else x + w, y, face, scale, fill, anchor=align + 't', track=track)
            y += lh
        return y

    # ------------------------------------------------------------ stickers and badges
    def roundel(self, cx, cy, r, fill=0xffd23f, line=0x1c1816, t=2, shadow=None, **_):
        """A round sticker (the boards' NEW! / ALL 6 TYPES / price discs): a flat pixel disc, a hard outline t px,
        a flat offset shadow. (No starbursts, crosses, sparkles or glints: the owner's rule.)"""
        R = int(round(r)); x, y = int(round(cx)) - R, int(round(cy)) - R
        if shadow:
            dx, dy, col = shadow; self.ellipse(x - t + dx, y - t + dy, 2 * (R + t), 2 * (R + t), col)
        self.ellipse(x - t, y - t, 2 * (R + t), 2 * (R + t), line)
        self.ellipse(x, y, 2 * R, 2 * R, fill)

    def ribbon(self, x, y, w, h, c, line=None, notch=None, t=1, tail=0):
        """A flat banner strip; notch: cut V tails ('l', 'r', 'lr'); tail: px the ends drop behind (folded)."""
        pts = [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]
        if notch:
            q = h // 2
            pts = [(x, y), (x + w, y)] + ([(x + w - q, y + h / 2)] if 'r' in notch else []) + [(x + w, y + h), (x, y + h)] + ([(x + q, y + h / 2)] if 'l' in notch else [])
        if line is not None:
            g = [(px + (1 if px > x + w / 2 else -1) * t, py + (1 if py > y + h / 2 else -1) * t) for px, py in pts]
            self.poly(g, line)
        self.poly(pts, c)

    def arrow(self, pts, c=0x1c1816, t=1, head=4, outline=None):
        """An annotation arrow along pts (a curve when given 3: quadratic), with a solid pixel arrowhead at the end."""
        if len(pts) == 3:
            (x0, y0), (x1, y1), (x2, y2) = pts
            P = [((1 - s) ** 2 * x0 + 2 * (1 - s) * s * x1 + s * s * x2, (1 - s) ** 2 * y0 + 2 * (1 - s) * s * y1 + s * s * y2) for s in np.linspace(0, 1, 18)]
        else: P = list(pts)
        (ax, ay), (bx, by) = P[-2], P[-1]
        ang = math.atan2(by - ay, bx - ax)
        hd = [(bx + math.cos(ang) * 1, by + math.sin(ang) * 1), (bx - math.cos(ang - 0.6) * head * 1.3, by - math.sin(ang - 0.6) * head * 1.3), (bx - math.cos(ang + 0.6) * head * 1.3, by - math.sin(ang + 0.6) * head * 1.3)]
        body = P[:-1] + [(bx - math.cos(ang) * head * 0.8, by - math.sin(ang) * head * 0.8)]
        if outline is not None:
            self.line(body, outline, t + 2)
            self.poly([(px + math.cos(math.atan2(py - by, px - bx)) * 1.4, py + math.sin(math.atan2(py - by, px - bx)) * 1.4) for px, py in hd], outline)
        self.line(body, c, t); self.poly(hd, c)

    def tag(self, x, y, s, fill=0xfbf8f1, ink=0x1c1816, line=0x1c1816, face='micro5', anchor='lt', pad=3):
        """A little rounded caption tag sized to its text; (x, y) anchors the tag box. Returns the box."""
        tw, th = text_size(s, face)
        W, H = tw + 2 * pad, th + 2 * pad - 1
        X = int(x - {'l': 0, 'm': W / 2, 'r': W}[anchor[0]]); Y = int(y - {'t': 0, 'm': H / 2, 'b': H}[anchor[1]])
        self.rrect(X - 1, Y - 1, W + 2, H + 2, fill, r=2, line=line)
        self.text(s, X + pad, Y + pad, face, 1, ink)
        return (X - 1, Y - 1, X + W + 1, Y + H + 1)

    def warning(self, x, y, w, h, ink=0x1c1816, paper=0xffe14a, scale=1, text=None):
        """The yellow choking-hazard block: a ruled box, a black head bar with a pixel warning triangle."""
        self.rect(x, y, w, h, paper); self.frame(x, y, w, h, ink, scale)
        bh = 9 * scale
        self.rect(x, y, w, bh, ink)
        tx = x + 3 * scale
        tri = [(tx + 3 * scale, y + 1 * scale), (tx + 7 * scale, y + 8 * scale - 1), (tx - 1 * scale, y + 8 * scale - 1)]
        self.poly(tri, paper); self.rect(tx + 3 * scale, y + 3 * scale, scale, 3 * scale, ink); self.rect(tx + 3 * scale, y + 7 * scale - 1, scale, scale, ink)
        self.text('WARNING', tx + 10 * scale, y + bh // 2 + 1, 'silkb', scale, paper, anchor='lm')
        self.text('CHOKING HAZARD', x + w - 3 * scale, y + bh // 2 + 1, 'micro5', scale, paper, anchor='rm')
        t = text or ('SMALL PARTS. NOT FOR CHILDREN UNDER 3 YEARS. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER '
                     'YOUR HEAD. KEEP AWAY FROM FIRE. ADULT SUPERVISION ADVISED.')
        self.para(t, x + 3 * scale, y + bh + 2 * scale, w - 6 * scale, 'micro5', scale, ink, lh=6 * scale, maxy=y + h - scale)

    def capsule(self, x, y, s, top=0xe8402a, bot=0xfbf8f1, line=0x1c1816):
        """The maker's capsule mark: a pixel capsule s px across (two-colour ball, seam, hard outline)."""
        self.ellipse(x, y, s, s, line)
        self.d.pieslice((int(x) + 1, int(y) + 1, int(x + s) - 2, int(y + s) - 2), 180, 360, fill=rgb(top))
        self.d.pieslice((int(x) + 1, int(y) + 1, int(x + s) - 2, int(y + s) - 2), 0, 180, fill=rgb(bot))
        self.rect(x + 1, y + s // 2 - (1 if s >= 12 else 0), s - 2, 1 if s < 12 else 2, line)

    def barcode(self, x, y, d12, h=14, ink=0x141414, bg=0xffffff, digits=True, m=1):
        """An EAN-13 (JAN) code, m px per module, digits in the 5 x 7 face."""
        code = jan13(d12); par = PARITY[int(code[0])]
        bits = '101' + ''.join((L_CODES if par[i] == 'L' else G_CODES)[int(c)] for i, c in enumerate(code[1:7])) + '01010' + ''.join(R_CODES[int(c)] for c in code[7:]) + '101'
        self.rect(x - 6 * m, y - 2 * m, (95 + 10) * m, h + (10 if digits else 4) * m, bg)
        guard = set(list(range(0, 3)) + list(range(45, 50)) + list(range(92, 95)))
        for i, b in enumerate(bits):
            if b == '1': self.rect(x + i * m, y, m, h + (3 * m if i in guard and digits else 0), ink)
        if digits:
            self.text(code[0], x - 5 * m, y + h + 2 * m, 'micro5', m, ink)
            self.text(code[1:7], x + 4 * m, y + h + 2 * m, 'micro5', m, ink, track=2)
            self.text(code[7:], x + 50 * m, y + h + 2 * m, 'micro5', m, ink, track=2)

    def qr(self, x, y, m=1, seed=0, ink=0x1c1816, bg=0xffffff):
        """A printed 2D code: 21 x 21 modules of m px with its three finder squares."""
        rn = random.Random(seed)
        self.rect(x - 2 * m, y - 2 * m, 25 * m, 25 * m, bg)
        for j in range(21):
            for i in range(21):
                f = (i < 7 and j < 7) or (i > 13 and j < 7) or (i < 7 and j > 13)
                if f:
                    ii, jj = (i - 14 if i > 13 else i), (j - 14 if j > 13 else j)
                    on = ii in (0, 6) or jj in (0, 6) or (2 <= ii <= 4 and 2 <= jj <= 4)
                elif (i == 7 or j == 7) and (i < 8 and j < 8 or i > 12 and j < 8 or i < 8 and j > 12): on = False
                else: on = rn.random() < 0.48
                if on: self.rect(x + i * m, y + j * m, m, m, ink)

    def image(self): return self.im.copy()


def styled_core_w(lay, ox, shadow, extrude):
    """Width of the letters' own box inside a styled() layer."""
    ex = 0
    if shadow: ex = abs(shadow[0])
    if extrude: ex = max(ex, abs(extrude[0] * extrude[2]))
    return lay.width - ex - 2 * ox


def upscale(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


def save_webp(im, path, near=True, quality=60):
    """Save for the game: near-lossless WebP (libwebp via the repo's sharp) keeps 1 px pixel type crisp, where a plain
    lossy WebP smears its edges and bleeds its colours (4:2:0 chroma). near=False: lossy with smart chroma subsampling."""
    import subprocess, tempfile
    with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f: tmp = f.name
    try:
        im.save(tmp)
        opts = '{nearLossless:true,quality:%d,effort:6,alphaQuality:100}' % quality if near else '{quality:%d,smartSubsample:true,effort:6}' % quality
        subprocess.run(['node', '-e', "require('sharp')(process.argv[1]).webp(%s).toFile(process.argv[2]).catch(e=>{console.error(e);process.exit(1)})" % opts, tmp, path],
                       check=True, cwd=ROOT)
    finally: os.unlink(tmp)
