"""posterkit.py: a small layout kit for the game's printed posters and flyers, set like a print designer would:
OFL faces (tools/printkit.py FONTS) sized by cap height, kerned pairs (raqm) plus open tracking, optical anchors,
real photographs cover-cropped like offset print (printkit.printed), cut-outs of the actual in-game toy renders
(tools/render-toys.mjs cache), flat ink only (hard offset shades and keylines; no glow, no gradient), on real paper
scans (tools/paperkit.py). Everything is laid out in design units (a 600 px wide sheet), drawn k x larger and reduced
once at the end, so the type is clean at the texel grid.
  S = Sheet(600, 848, bg); S.photo('ph:garage', ...); S.toy('teruteru/para', cx, base_y, h); S.text(...); S.finish((w, h), age)
Photo refs: 'ph:<name>' public/img/photos/<name>.jpg, 'oi:<id>' Open Images original in the art cache, 'cut:<name>'
an Open Images cut-out (art cache/cuts), 'toy:<series>/<id>' a toy render. All credited in CREDITS.md."""
import os
import numpy as np
from PIL import Image, ImageDraw
from printkit import font, cover, printed, CACHE, ROOT
import paperkit as PK

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
    def __init__(self, w=600, h=848, bg=0xf3ecdc, k=2):
        self.w, self.h, self.k = w, h, k
        self.im = Image.new('RGBA', (int(w * k), int(h * k)), rgba(bg))

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

    # ---------------------------------------------------------------- type
    def _font(self, face, cap):
        probe = font(face, 200); bb = probe.getbbox('H')
        px = 200 * cap * self.k / max(1, bb[3] - bb[1])
        return font(face, px), px

    def textw(self, s, face, cap, track=0.0):
        f, px = self._font(face, cap)
        return sum(self._adv(s, f, px, track)) / self.k

    def _adv(self, s, f, px, track):
        out = []
        for i, ch in enumerate(s):
            nxt = s[i + 1] if i + 1 < len(s) else ''
            a = (f.getlength(ch + nxt) - f.getlength(nxt)) if nxt else f.getlength(ch)
            out.append(a + (track * px if nxt else 0))
        return out

    def fit(self, s, face, cap, maxw, track=0.0):
        """The cap height at which s fits maxw (never larger than cap)."""
        w = self.textw(s, face, cap, track)
        return cap if w <= maxw else cap * maxw / w

    def text(self, s, face, cap, x, y, fill, track=0.0, anchor='l', shade=None, stroke=None, sx=1.0, rot=0, alpha=255):
        """s with cap height cap, baseline y, anchored 'l' / 'c' / 'r' on x. shade = (colour, dx, dy) hard offset;
        stroke = (colour, width) a hard ink outline (meme captions). rot: degrees (90 = reads bottom to top).
        Returns the set width in design units."""
        f, px = self._font(face, cap)
        adv = self._adv(s, f, px, track); tw = sum(adv)
        asc, desc = f.getmetrics()
        sw = int(round((stroke[1] if stroke else 0) * self.k))
        pad = int(8 * self.k) + sw
        layer = Image.new('L', (int(tw + 2 * pad), int(asc + desc + 2 * pad)), 0)
        dl = ImageDraw.Draw(layer); cx = pad
        for ch, a in zip(s, adv): dl.text((cx, pad), ch, font=f, fill=255); cx += a
        out = None
        if stroke:
            out = Image.new('L', layer.size, 0); do = ImageDraw.Draw(out); cx = pad
            for ch, a in zip(s, adv): do.text((cx, pad), ch, font=f, fill=255, stroke_width=sw, stroke_fill=255); cx += a
        if sx != 1.0:
            nw = max(1, int(layer.width * sx)); layer = layer.resize((nw, layer.height), Image.LANCZOS)
            if out: out = out.resize((nw, out.height), Image.LANCZOS)
            tw *= sx; pad_x = pad * sx
        else: pad_x = pad
        ox = {'l': 0, 'c': -tw / 2, 'r': -tw}[anchor] - pad_x
        oy = -asc - pad
        layers = []
        if shade: layers.append((out or layer, shade[0], shade[1], shade[2]))
        if stroke: layers.append((out, stroke[0], 0, 0))
        layers.append((layer, fill, 0, 0))
        for m, col, dx, dy in layers:
            solid = Image.new('RGBA', m.size, rgba(col)); solid.putalpha(m.point(lambda v: v * alpha // 255))
            if rot:
                solid = solid.rotate(rot, expand=True, resample=Image.BICUBIC)
                # rotate about the anchor point (x, y): for 90 the layer's left-baseline maps to its bottom
                import math
                r = math.radians(rot); W0, H0 = m.size
                px0, py0 = -ox, -oy  # anchor inside the unrotated layer
                cxl, cyl = W0 / 2, H0 / 2
                rx = (px0 - cxl) * math.cos(r) + (py0 - cyl) * math.sin(r) + solid.width / 2
                ry = -(px0 - cxl) * math.sin(r) + (py0 - cyl) * math.cos(r) + solid.height / 2
                self.im.alpha_composite(solid, (int(x * self.k - rx + dx * self.k), int(y * self.k - ry + dy * self.k)))
            else:
                self.im.alpha_composite(solid, (int(x * self.k + ox + dx * self.k), int(y * self.k + oy + dy * self.k)))
        return tw / self.k

    def para(self, s, face, cap, x, y, w, fill, lead=1.55, track=0.0, align='l'):
        """Wrapped text from baseline y; returns the baseline after the last line."""
        for line in s.split('\n'):
            words, cur = line.split(' '), ''
            rows = []
            for wd in words:
                t = (cur + ' ' + wd).strip()
                if self.textw(t, face, cap, track) > w and cur: rows.append(cur); cur = wd
                else: cur = t
            rows.append(cur)
            for r in rows:
                ax = {'l': x, 'c': x + w / 2, 'r': x + w}[align]
                self.text(r, face, cap, ax, y, fill, track=track, anchor=align); y += cap * lead * 1.45
        return y

    # ---------------------------------------------------------------- out
    def finish(self, size, **age):
        """Aged on real paper (paperkit.age) at print scale, then reduced once to the texture size."""
        im = self.im.convert('RGB')
        im = im.resize((size[0] * 2, size[1] * 2), Image.LANCZOS)
        out = PK.age(im, **age) if age else im.convert('RGBA')
        return out.resize(size, Image.LANCZOS)
