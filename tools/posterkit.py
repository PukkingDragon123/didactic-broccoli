"""posterkit.py: a small layout kit for the game's printed posters and flyers, set like a print designer would:
pixel type only (tools/pixprint.py's OFL pixel faces, Alagard, GG Display, the 5x7 font, DotGothic16 for kana) laid
on the final texture grid at whole-number scales,
real photographs cover-cropped like offset print (printkit.printed), cut-outs of the actual in-game toy renders
(tools/render-toys.mjs cache), flat ink only (hard offset shades and keylines; no glow, no gradient), on real paper
scans (tools/paperkit.py). Coordinates are final texture px; the art is drawn k x larger and reduced once, then the
pixel type is set on the grid (never resampled), then the sheet is aged.
  S = Sheet(224, 317, bg); S.photo('ph:garage', ...); S.toy('teruteru/para', cx, base_y, h); S.text(...); S.finish(**age)
Photo refs: 'ph:<name>' public/img/photos/<name>.jpg, 'oi:<id>' Open Images original in the art cache, 'cut:<name>'
an Open Images cut-out (art cache/cuts), 'toy:<series>/<id>' a toy render. All credited in CREDITS.md."""
import os
import numpy as np
from PIL import Image, ImageDraw
from printkit import font, cover, printed, CACHE, ROOT
import paperkit as PK
import pixprint as PX
PX.FACES.setdefault('dot', ('dotgothic16/DotGothic16-Regular.ttf', 16))  # DotGothic16 for kana

OI = os.path.join(CACHE, 'oi'); TOYS = os.path.join(CACHE, 'toys'); CUTS = os.path.join(CACHE, 'cuts'); ACG = os.path.join(CACHE, 'acg')
PHOTOS = os.path.join(ROOT, 'public', 'img', 'photos')
_cache = {}


def load(ref):
    if ref in _cache: return _cache[ref]
    kind, name = ref.split(':', 1)
    path = {'ph': os.path.join(PHOTOS, name + '.jpg'), 'oi': os.path.join(OI, name + '.jpg'), 'cut': os.path.join(CUTS, name + '.png'),
            'toy': os.path.join(TOYS, name + '.png'), 'acg': os.path.join(ACG, name + '.jpg')}[kind]
    im = Image.open(path)
    im = im.convert('RGBA') if kind in ('cut', 'toy') else im.convert('RGB')
    if kind in ('cut', 'toy'):
        bb = im.getbbox(); im = im.crop(bb) if bb else im
    _cache[ref] = im
    return im


def rgba(c, a=255): return ((c >> 16) & 255, (c >> 8) & 255, c & 255, a)


class Sheet:
    def __init__(self, w, h, bg=0xf3ecdc, k=5):
        """w x h: the final texture size in px (all coordinates are in these px); the art is drawn k x larger."""
        self.w, self.h, self.k = w, h, k
        self.im = Image.new('RGBA', (int(w * k), int(h * k)), rgba(bg))
        self.late = []

    def B(self, x, y, w, h): k = self.k; return [int(round(x * k)), int(round(y * k)), int(round((x + w) * k)) - 1, int(round((y + h) * k)) - 1]

    # ---------------------------------------------------------------- surfaces
    def paper(self, name='Paper001', k=0.45, x=0, y=0, w=None, h=None):
        """Multiply a real paper (or board) scan's lightness over a region: the stock the ink sits on."""
        w = w or self.w; h = h or self.h
        bx = self.B(x, y, w, h); W, H = bx[2] - bx[0] + 1, bx[3] - bx[1] + 1
        s = cover(load('acg:' + name), W, H).convert('L')
        L = np.asarray(s, np.float32) / 255; L = L / max(1e-3, L.mean())
        reg = np.asarray(self.im.crop((bx[0], bx[1], bx[0] + W, bx[1] + H)), np.float32)
        reg[..., :3] = np.clip(reg[..., :3] * np.clip(1 + (L - 1) * k, 0.72, 1.06)[..., None], 0, 255)
        self.im.paste(Image.fromarray(reg.astype(np.uint8), 'RGBA'), (bx[0], bx[1]))

    def rect(self, x, y, w, h, c, line=0, r=0, a=255):
        d = ImageDraw.Draw(self.im, 'RGBA'); b = self.B(x, y, w, h)
        if line: d.rounded_rectangle(b, r * self.k, outline=rgba(c, a), width=max(1, int(round(line * self.k))))
        else: d.rounded_rectangle(b, r * self.k, fill=rgba(c, a))

    def ellipse(self, x, y, w, h, c, line=0):
        d = ImageDraw.Draw(self.im, 'RGBA'); b = self.B(x, y, w, h)
        if line: d.ellipse(b, outline=rgba(c), width=max(1, int(round(line * self.k))))
        else: d.ellipse(b, fill=rgba(c))

    def poly(self, pts, c):
        ImageDraw.Draw(self.im, 'RGBA').polygon([(px * self.k, py * self.k) for px, py in pts], fill=rgba(c))

    def photo(self, ref, x, y, w, h, f=(0.5, 0.5, 1.0), sat=0.92, con=1.04, bright=1.0, warm=0.0, shape=None, mono=None):
        """A real photograph cover-cropped into a box (f = focus x, y, zoom). mono = (dark, light): a duotone print
        (the photo's lightness mapped between two inks, like a cheap two-colour job)."""
        b = self.B(x, y, w, h); W, H = b[2] - b[0] + 1, b[3] - b[1] + 1
        ph = printed(cover(load(ref), W, H, f), sat=sat, con=con, bright=bright, warm=warm)
        if mono:
            L = np.asarray(ph.convert('L'), np.float32)[..., None] / 255
            d, l = np.array(rgba(mono[0])[:3], np.float32), np.array(rgba(mono[1])[:3], np.float32)
            ph = Image.fromarray((d + (l - d) * L).astype(np.uint8))
        m = None
        if shape == 'circle':
            m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).ellipse([0, 0, W - 1, H - 1], fill=255)
        self.im.paste(ph.convert('RGBA'), (b[0], b[1]), m)

    def toy(self, ref, cx, by, h=None, w=None, flip=False, shade=None):
        """A toy render (the actual in-game model), standing with its base centre at (cx, by), h design units tall.
        shade = (colour, dx, dy): a flat printed shadow of its silhouette."""
        t = load(ref if ':' in ref else 'toy:' + ref)
        s = (h / t.height) if h else (w / t.width)
        tw, th = max(1, int(t.width * s * self.k)), max(1, int(t.height * s * self.k))
        t = t.resize((tw, th), Image.LANCZOS)
        if flip: t = t.transpose(Image.FLIP_LEFT_RIGHT)
        ox, oy = int(cx * self.k - tw / 2), int(by * self.k - th)
        if shade:
            sil = Image.new('RGBA', t.size, rgba(shade[0])); sil.putalpha(t.split()[3].point(lambda v: 255 if v > 100 else 0))
            self.im.alpha_composite(sil, (ox + int(shade[1] * self.k), oy + int(shade[2] * self.k)))
        self.im.alpha_composite(t, (ox, oy))
        return tw / self.k, th / self.k

    # ---------------------------------------------------------------- type (pixel faces only, set after the reduction)
    def text(self, s, *a, anchor='lt', rot=0, **kw):
        # text(s, x, y, face, scale, fill) or text(s, face, scale, x, y, fill)
        a = list(a) + [None] * (5 - len(a))
        x, y, face, scale, fill = (a[2], a[3], a[0], a[1], a[4]) if isinstance(a[0], str) else (a[0], a[1], a[2], a[3], a[4])
        face = face or 'b5'; scale = scale or 1; fill = 0x1c1816 if fill is None else fill
        """A line of pixel type (tools/pixprint.py faces: ggd, jersey10-25, ala, jacq12/24, ps2p, silk/silkb, micro5,
        b5, dot for kana), laid on the final texture grid after the art is reduced: one font pixel = scale texels,
        nearest only. (x, y) in final px is the anchor of the letters' ink box ('lt', 'mb', 'rm'...). kw: track, bold,
        outline=[(r, col)], shadow=(dx, dy, col), extrude, maxw. rot 90: reads bottom to top. Returns the ink (w, h)."""
        self.late.append(('text', s, x, y, face, scale, fill, anchor, rot, kw))
        w, h = PX.text_size(s, face, scale, kw.get('track', 0), kw.get('bold', 0))
        return w, h

    def tw(self, s, face='b5', scale=1, track=0): return PX.text_size(s, face, scale, track)[0]

    def fit(self, s, face, scale, maxw, track=0):
        """The largest whole scale <= scale at which s fits maxw px."""
        while scale > 1 and PX.text_size(s, face, scale, track)[0] > maxw: scale -= 1
        return scale

    def para(self, text, x, y, w, face='b5', scale=1, fill=0x1c1816, lh=None, align='l', track=0):
        """Word-wrapped pixel type in a column w px wide from top y; returns the y under the last line."""
        _, hh = PX.text_size('AH', face, scale)
        lh = lh or hh + 2 * scale + (1 if face in ('b5', 'micro5', 'silk', 'silkb') else 0)
        for part in text.split('\n'):
            cur = ''
            rows = []
            for word in part.split(' '):
                t = (cur + ' ' + word).strip()
                if cur and PX.text_size(t, face, scale, track)[0] > w: rows.append(cur); cur = word
                else: cur = t
            rows.append(cur)
            for r in rows:
                if r: self.text(r, {'l': x, 'm': x + w / 2, 'r': x + w}[align], y, face, scale, fill, anchor=align + 't', track=track)
                y += lh
        return y

    def _late(self, im):
        P = PX.Sheet(self.w, self.h, 0xffffff); P.im = im; P.d = ImageDraw.Draw(im)
        for job in self.late:
            _, s, x, y, face, scale, fill, anchor, rot, kw = job
            if not rot:
                P.text(s, x, y, face, scale, fill, anchor=anchor, **kw); continue
            w, h = PX.text_size(s, face, scale, kw.get('track', 0), kw.get('bold', 0))
            pad = 8 * scale
            T = PX.Sheet(w + 2 * pad, h + 2 * pad, None); T.text(s, pad, pad, face, scale, fill, anchor='lt', **kw)
            r = T.im.rotate(rot, expand=True, resample=Image.NEAREST)
            bb = r.getbbox() or (0, 0, 1, 1); r = r.crop(bb)
            X = x - {'l': 0, 'm': r.width / 2, 'r': r.width}[anchor[0]]; Y = y - {'t': 0, 'm': r.height / 2, 'b': r.height}[anchor[1]]
            im.paste(r, (int(round(X)), int(round(Y))), r)
        return im

    # ---------------------------------------------------------------- out
    def finish(self, size=None, **age):
        """Art reduced once to the texture size, the pixel type laid on its grid, then aged on real paper (paperkit)."""
        im = self.im.convert('RGB').resize((self.w, self.h), Image.LANCZOS)
        im = self._late(im)
        return PK.age(im, **age) if age else im.convert('RGBA')
