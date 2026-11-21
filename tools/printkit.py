"""printkit.py: a small print shop for the game's printed things (drink labels, packets, posters, menus), baked from
real photographs and set in real typefaces, the way a 1999 Japanese package designer would lay them out.

Nothing is drawn by formula: every picture is a real, freely licensed photograph (Google Open Images, CC BY 2.0;
ambientCG, CC0), cropped and printed into a panel; the rest is type (OFL fonts from the Google Fonts repository: they
are only used at bake time, the game ships the baked PNGs), rules, flat ink fields, a barcode and the small print.

  P = Panel(w, h, bg)                     a w x h pixel panel, drawn SS times larger and reduced at the end
  P.photo('oi:<id>@<subset>', x, y, w, h, f=(fx, fy, zoom), shape='rect' | 'ellipse' | 'round', r=, sat=, con=)
  P.text(s, 'dela', size, x, y, fill, anchor='mm', stroke=(w, col), sx=1, track=0, vert=False, maxw=None)
  P.rect(x, y, w, h, col, r=0, line=0)    P.metal(x, y, w, h, tint)    P.paper(x, y, w, h)
  P.info(x, y, w, rows, ink, paper)       P.barcode(x, y, digits12, h)  P.image() -> PIL RGB at w x h
All coordinates are output pixels (floats are fine). Downloads are cached in shots/.art-cache (gitignored).
"""
import io, os, urllib.request, zipfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
CACHE = os.environ.get('ART_CACHE', os.path.join(ROOT, 'shots', '.art-cache'))
UA = {'User-Agent': 'Mozilla/5.0 (print bake)'}
SS = 4  # supersampling: panels are drawn at 4x and reduced with a Lanczos filter

GF = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
FONTS = {  # name: (file in the Google Fonts repo, variation name or None)
    'dela': ('delagothicone/DelaGothicOne-Regular.ttf', None),
    'antique': ('zenantique/ZenAntique-Regular.ttf', None),
    'mincho': ('shipporiminchob1/ShipporiMinchoB1-ExtraBold.ttf', None),
    'tokumin': ('kaiseitokumin/KaiseiTokumin-ExtraBold.ttf', None),
    'rock': ('rocknrollone/RocknRollOne-Regular.ttf', None),
    'mplus': ('mplus1p/MPLUS1p-Black.ttf', None),
    'mplusb': ('mplus1p/MPLUS1p-Bold.ttf', None),
    'kaku': ('zenkakugothicnew/ZenKakuGothicNew-Black.ttf', None),
    'kakub': ('zenkakugothicnew/ZenKakuGothicNew-Bold.ttf', None),
    'kakum': ('zenkakugothicnew/ZenKakuGothicNew-Medium.ttf', None),
    'maru': ('zenmarugothic/ZenMaruGothic-Black.ttf', None),
    'marub': ('zenmarugothic/ZenMaruGothic-Bold.ttf', None),
    'brush': ('yujisyuku/YujiSyuku-Regular.ttf', None),
    'biz': ('bizudpgothic/BIZUDPGothic-Regular.ttf', None),
    'bizb': ('bizudpgothic/BIZUDPGothic-Bold.ttf', None),
    'anton': ('anton/Anton-Regular.ttf', None),
    'archivo': ('archivoblack/ArchivoBlack-Regular.ttf', None),
    'barlow': ('barlowcondensed/BarlowCondensed-Bold.ttf', None),
    'barlowx': ('barlowcondensed/BarlowCondensed-ExtraBold.ttf', None),
    'barlows': ('barlowcondensed/BarlowCondensed-SemiBold.ttf', None),
    'oswald': ('oswald/Oswald[wght].ttf', b'Bold'),
    'serif': ('playfairdisplay/PlayfairDisplay[wght].ttf', b'Black'),
    'serifb': ('playfairdisplay/PlayfairDisplay[wght].ttf', b'Bold'),
    # phase 15 (graphic-design pass): period Japanese display faces and matching retro Latin, all OFL
    'oldmincho': ('zenoldmincho/ZenOldMincho-Black.ttf', None),
    'oldminchob': ('zenoldmincho/ZenOldMincho-Bold.ttf', None),
    'shippori': ('shipporimincho/ShipporiMincho-ExtraBold.ttf', None),
    'reggae': ('reggaeone/ReggaeOne-Regular.ttf', None),
    'decol': ('kaiseidecol/KaiseiDecol-Bold.ttf', None),
    'yusei': ('yuseimagic/YuseiMagic-Regular.ttf', None),
    'dot': ('dotgothic16/DotGothic16-Regular.ttf', None),
    'antiqueb': ('zenkakugothicantique/ZenKakuGothicAntique-Black.ttf', None),
    'mochiy': ('mochiypopone/MochiyPopOne-Regular.ttf', None),
    'train': ('trainone/TrainOne-Regular.ttf', None),
    'abril': ('abrilfatface/AbrilFatface-Regular.ttf', None),
    'alfa': ('alfaslabone/AlfaSlabOne-Regular.ttf', None),
    'bebas': ('bebasneue/BebasNeue-Regular.ttf', None),
    'limelight': ('limelight/Limelight-Regular.ttf', None),
}


def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
        with open(path, 'wb') as f: f.write(data)
    return path


_fonts = {}
def font(name, px):
    k = (name, px)
    if k not in _fonts:
        rel, var = FONTS[name]
        p = fetch(GF + rel.replace('[', '%5B').replace(']', '%5D'), os.path.join(CACHE, 'fonts', os.path.basename(rel)))
        f = ImageFont.truetype(p, max(1, int(round(px))))
        if var:
            try: f.set_variation_by_name(var)
            except Exception: pass
        _fonts[k] = f
    return _fonts[k]


_src = {}
def source(ref):
    """A PIL RGB image for a reference: oi:<ImageID>@<subset> (Open Images), acg:<AssetId> (ambientCG colour map),
    local:<path under public/img/photos>."""
    if ref in _src: return _src[ref]
    kind, _, rest = ref.partition(':')
    if kind == 'oi':
        iid, _, sub = rest.partition('@')
        p = fetch('https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg' % (sub or 'test', iid), os.path.join(CACHE, 'oi', iid + '.jpg'))
    elif kind == 'acg':
        p = os.path.join(CACHE, 'acg', rest + '.jpg')
        if not os.path.exists(p):
            z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(urllib.request.Request('https://ambientcg.com/get?file=%s_1K-JPG.zip' % rest, headers=UA), timeout=120).read()))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'wb') as f: f.write(z.read(next(n for n in z.namelist() if n.endswith('_Color.jpg'))))
    elif kind == 'file':  # an absolute path (a cached Commons download)
        p = rest
    elif kind == 'local':  # a photo already shipped with the game (public/img/photos/..., credited there)
        p = os.path.join(ROOT, 'public', 'img', 'photos', rest)
    else:
        raise ValueError(ref)
    im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
    _src[ref] = im
    return im


def rgb(c):
    if isinstance(c, tuple): return c
    return ((c >> 16) & 255, (c >> 8) & 255, c & 255)


def mixc(a, b, t):
    a, b = rgb(a), rgb(b)
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def cover(im, w, h, f=(0.5, 0.5, 1.0)):
    """Crop im to the aspect w:h around (fx, fy) at zoom (1 = as large as fits), resized to w x h."""
    fx, fy, z = (tuple(f) + (1.0,))[:3] if len(f) < 3 else f
    W, H = im.size
    a = w / h
    cw, ch = (W, W / a) if W / H < a else (H * a, H)
    cw /= z; ch /= z
    x0 = min(max(0, fx * W - cw / 2), W - cw); y0 = min(max(0, fy * H - ch / 2), H - ch)
    return im.resize((int(round(w)), int(round(h))), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch))


def printed(im, sat=0.92, con=1.04, bright=1.0, warm=0.0):
    """A photo as offset print sees it: a touch less saturated, a touch more contrast, never neon."""
    if sat != 1: im = ImageEnhance.Color(im).enhance(sat)
    if con != 1: im = ImageEnhance.Contrast(im).enhance(con)
    if bright != 1: im = ImageEnhance.Brightness(im).enhance(bright)
    if warm:
        a = np.asarray(im, np.float32); a[..., 0] *= 1 + warm; a[..., 2] *= 1 - warm
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    return im


class Panel:
    def __init__(self, w, h, bg=0xffffff):
        self.w, self.h = w, h
        self.im = Image.new('RGB', (int(w * SS), int(h * SS)), rgb(bg))
        self.d = ImageDraw.Draw(self.im)
        self.late = []  # drawn at 1x after the reduction (barcodes: whole pixels)

    # ---------------------------------------------------------------- shapes
    def _mask(self, w, h, shape, r=0):
        m = Image.new('L', (w, h), 0); d = ImageDraw.Draw(m)
        if shape == 'ellipse': d.ellipse((0, 0, w - 1, h - 1), fill=255)
        elif shape == 'round': d.rounded_rectangle((0, 0, w - 1, h - 1), radius=int(r * SS), fill=255)
        else: d.rectangle((0, 0, w, h), fill=255)
        return m

    def rect(self, x, y, w, h, c, r=0, line=0, fill=True):
        box = (x * SS, y * SS, (x + w) * SS - 1, (y + h) * SS - 1)
        if r: self.d.rounded_rectangle(box, radius=r * SS, fill=rgb(c) if fill and not line else None, outline=rgb(c) if line else None, width=int(line * SS) if line else 0)
        elif line: self.d.rectangle(box, outline=rgb(c), width=int(line * SS))
        else: self.d.rectangle(box, fill=rgb(c))

    def poly(self, pts, c):
        self.d.polygon([(x * SS, y * SS) for x, y in pts], fill=rgb(c))

    def ellipse(self, x, y, w, h, c, line=0):
        box = (x * SS, y * SS, (x + w) * SS - 1, (y + h) * SS - 1)
        if line: self.d.ellipse(box, outline=rgb(c), width=int(line * SS))
        else: self.d.ellipse(box, fill=rgb(c))

    def hline(self, x, y, w, c, t=1): self.rect(x, y, w, t, c)

    def paste(self, im, x, y, mask=None):
        self.im.paste(im, (int(round(x * SS)), int(round(y * SS))), mask)

    # ---------------------------------------------------------------- pictures
    def photo(self, ref, x, y, w, h, f=(0.5, 0.5, 1.0), shape='rect', r=0, sat=0.92, con=1.04, bright=1.0, warm=0.0, flip=False, alpha=1.0, fade=None):
        W, H = int(round(w * SS)), int(round(h * SS))
        im = printed(cover(source(ref), W, H, f), sat, con, bright, warm)
        if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        m = self._mask(W, H, shape, r)
        if fade:  # fade: (side, fraction): the photo dissolves into the ground on one side (a printed vignette)
            side, fr = fade
            g = np.ones((H, W), np.float32)
            n = int((H if side in 'tb' else W) * fr)
            ramp = np.linspace(0, 1, n, dtype=np.float32) ** 1.4
            if side == 't': g[:n] = ramp[:, None]
            elif side == 'b': g[H - n:] = ramp[::-1, None]
            elif side == 'l': g[:, :n] = ramp[None, :]
            else: g[:, W - n:] = ramp[None, ::-1]
            m = Image.fromarray((np.asarray(m, np.float32) * g).astype(np.uint8))
        if alpha < 1: m = m.point(lambda v: int(v * alpha))
        self.im.paste(im, (int(round(x * SS)), int(round(y * SS))), m)

    def texture(self, ref, x, y, w, h, tint=None, k=1.0, scale=1.0, mode='multiply'):
        """A real surface photo (brushed metal, paper) laid over a box; tinted like a coloured lacquer on metal."""
        W, H = int(round(w * SS)), int(round(h * SS))
        src = source(ref)
        s = src.resize((int(src.width * scale * SS / 4), int(src.height * scale * SS / 4)), Image.LANCZOS)
        tile = Image.new('RGB', (W, H))
        for ty in range(0, H, s.height):
            for tx in range(0, W, s.width): tile.paste(s, (tx, ty))
        a = np.asarray(tile, np.float32) / 255
        if tint is not None:
            l = a.mean(-1, keepdims=True); l = (l - l.mean()) * 1.6 + 0.5
            t = np.array(rgb(tint), np.float32) / 255
            a = np.clip(t * (0.55 + 0.9 * l), 0, 1)
        X, Y = int(round(x * SS)), int(round(y * SS))
        base = np.asarray(self.im.crop((X, Y, X + W, Y + H)), np.float32) / 255
        out = base * (1 - k) + a * k if mode == 'normal' else base * (1 - k + k * a / max(1e-3, a.mean()))
        self.im.paste(Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)), (X, Y))

    def metal(self, x, y, w, h, tint=0xc8ccd2):
        """Bare can metal (a real brushed-aluminium photo, ambientCG Metal009) seen through clear or tinted lacquer."""
        self.texture('acg:Metal009', x, y, w, h, tint=tint, k=1.0, mode='normal')

    def condensation(self, x, y, w, h, k=0.3, ref='oi:0ddb1dfda676b504@test', tile=200):
        """Beads of water on a cold can: the drops of a real photo (Open Images, water drops on a tarp), lifted out as
        their light and shade only (a high-pass of the photo's lightness), tiled at tile px wide and laid over the print."""
        W, H = int(round(w * SS)), int(round(h * SS))
        src = source(ref); sw, sh = src.size
        src = src.crop((int(sw * 0.06), int(sh * 0.08), int(sw * 0.94), int(sh * 0.92))).convert('L')
        T = int(tile * SS); src = src.resize((T, int(T * src.height / src.width)), Image.LANCZOS)
        a = np.asarray(src, np.float32) / 255
        lo = np.asarray(src.filter(ImageFilter.GaussianBlur(3 * SS)), np.float32) / 255
        det = np.clip((a - lo) * 2.0, -0.4, 0.6)
        reps = (H // det.shape[0] + 1, W // det.shape[1] + 1)
        det = np.tile(det, reps)[:H, :W]
        X, Y = int(round(x * SS)), int(round(y * SS))
        base = np.asarray(self.im.crop((X, Y, X + W, Y + H)), np.float32) / 255
        d = det[..., None]
        out = np.where(d > 0, base + (1 - base) * d * k * 1.5, base * (1 + d * k * 0.8))
        self.paste(Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)), x, y)

    def paper(self, x, y, w, h, k=0.6):
        self.texture('acg:Paper001', x, y, w, h, k=k)

    # ---------------------------------------------------------------- type
    def text(self, s, face, size, x, y, fill, anchor='mm', stroke=None, stroke2=None, sx=1.0, track=0.0, vert=False, maxw=None, maxh=None, rot=0):
        """Set a line of type. size in output pixels (the em). stroke=(width px, colour): an outline under the letters
        (stroke2 a second, wider one under that), as a die-line printed round a logo. sx < 1 condenses it. maxw: the
        line is condensed (then scaled) to fit. vert: set top to bottom (ー and brackets turned)."""
        f = font(face, size * SS)
        sw = int(round(stroke[0] * SS)) if stroke else 0
        sw2 = int(round(stroke2[0] * SS)) if stroke2 else 0
        pad = max(sw, sw2) + 2
        if vert:
            glyphs = []
            for ch in s:
                g = self._glyph(ch, f, fill, stroke, stroke2, pad, track)
                if ch in 'ー〜～ー（）()「」-': g = g.rotate(-90, expand=True)
                glyphs.append(g)
            Wt = max(g.width for g in glyphs); Ht = sum(g.height for g in glyphs) - int(pad * 2 * (len(glyphs) - 1) * 0.9)
            lay = Image.new('RGBA', (Wt, max(1, Ht)), (0, 0, 0, 0)); yy = 0
            for g in glyphs:
                lay.alpha_composite(g, ((Wt - g.width) // 2, yy)); yy += g.height - int(pad * 2 * 0.9) + int(track * SS)
        else:
            lay = self._glyph(s, f, fill, stroke, stroke2, pad, track)
        if sx != 1: lay = lay.resize((max(1, int(lay.width * sx)), lay.height), Image.LANCZOS)
        if maxw and lay.width - 2 * pad > maxw * SS:
            k = maxw * SS / (lay.width - 2 * pad)
            kx = max(k, 0.62)  # condense first, down to 62%, then scale the whole line
            lay = lay.resize((max(1, int(lay.width * kx)), lay.height), Image.LANCZOS)
            if k < kx: lay = lay.resize((max(1, int(lay.width * k / kx)), max(1, int(lay.height * k / kx))), Image.LANCZOS)
        if maxh and lay.height - 2 * pad > maxh * SS:
            k = maxh * SS / (lay.height - 2 * pad); lay = lay.resize((max(1, int(lay.width * k)), max(1, int(lay.height * k))), Image.LANCZOS)
        if rot: lay = lay.rotate(rot, expand=True, resample=Image.BICUBIC)
        X, Y = x * SS, y * SS
        ax, ay = anchor[0], anchor[1]
        X -= {'l': pad, 'm': lay.width / 2, 'r': lay.width - pad}[ax]
        Y -= {'t': pad, 'm': lay.height / 2, 'b': lay.height - pad}[ay]
        self.im.paste(lay, (int(round(X)), int(round(Y))), lay)
        return (lay.width - 2 * pad) / SS, (lay.height - 2 * pad) / SS

    def _glyph(self, s, f, fill, stroke, stroke2, pad, track, crop=True):
        asc, desc = f.getmetrics()
        if track:
            parts = [self._glyph(ch, f, fill, stroke, stroke2, pad, 0, crop=False) for ch in s]
            w = sum(p.width - 2 * pad for p in parts) + int(track * SS) * (len(parts) - 1) + 2 * pad
            lay = Image.new('RGBA', (max(1, w), asc + desc + 2 * pad), (0, 0, 0, 0)); xx = 0
            for p in parts: lay.alpha_composite(p, (xx, 0)); xx += p.width - 2 * pad + int(track * SS)
            bb = lay.getbbox()
            if bb: lay = lay.crop((0, max(0, bb[1] - pad), lay.width, min(lay.height, bb[3] + pad)))
            return lay
        w = int(f.getlength(s)) + 2 * pad + 2
        lay = Image.new('RGBA', (max(1, w), asc + desc + 2 * pad), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
        if stroke2: d.text((pad, pad), s, font=f, fill=rgb(stroke2[1]) + (255,), stroke_width=int(round(stroke2[0] * SS)), stroke_fill=rgb(stroke2[1]) + (255,))
        if stroke: d.text((pad, pad), s, font=f, fill=rgb(stroke[1]) + (255,), stroke_width=int(round(stroke[0] * SS)), stroke_fill=rgb(stroke[1]) + (255,))
        d.text((pad, pad), s, font=f, fill=rgb(fill) + (255,))
        # trim the empty space above the cap height so 'm' anchors sit on the visual middle
        bb = lay.getbbox() if crop else None
        if bb: lay = lay.crop((0, max(0, bb[1] - pad), lay.width, min(lay.height, bb[3] + pad)))
        return lay

    def lines(self, text, face, size, x, y, w, fill, lh=None, maxy=None, align='l'):
        """Wrap Japanese / English text to width w (character by character, no line may start with 、。), return the y after."""
        f = font(face, size * SS); lh = lh or size * 1.25
        out, cur = [], ''
        for ch in text:
            if ch == '\n': out.append(cur); cur = ''; continue
            if f.getlength(cur + ch) > w * SS and cur and ch not in '、。）」':
                out.append(cur); cur = ch
            else: cur += ch
        if cur: out.append(cur)
        for l in out:
            if maxy is not None and y + lh > maxy + 0.5: break
            self.text(l, face, size, x if align == 'l' else x + w / 2, y, fill, anchor=('l' if align == 'l' else 'm') + 't')
            y += lh
        return y

    def info(self, x, y, w, rows, ink=0x222222, paper=None, size=6.5, maxy=None, head=None):
        """The 品名 box of a Japanese label: a ruled table, heads on the left."""
        lh = size * 1.32
        hw = max(font('bizb', size * SS).getlength(h) for h, _ in rows) / SS + 3
        top = y
        if paper is not None: self.rect(x, y, w, (maxy or self.h) - y, paper)
        y += 1.5
        for h, t in rows:
            y0 = y
            self.text(h, 'bizb', size, x + 2, y, ink, anchor='lt')
            y = self.lines(t, 'biz', size, x + hw + 2, y, w - hw - 4, ink, lh=lh, maxy=maxy)
            if maxy and y > maxy: break
            self.hline(x, y + 0.5, w, ink, 0.5); y += 1.5
        self.rect(x, top, w, y - top, ink, line=0.6)
        self.rect(x + hw, top, 0.5, y - top, ink)
        return y + 2

    def barcode(self, x, y, d12, h=14, ink=0x141414, bg=0xffffff, digits=True):
        """An EAN-13 (JAN) code, one module a whole pixel, laid in after the reduction so it stays sharp."""
        self.late.append(('bar', x, y, d12, h, ink, bg, digits))
        self.rect(x - 4, y - 2, 95 + 15, h + (9 if digits else 4), bg)

    # ---------------------------------------------------------------- finish
    def image(self):
        im = self.im.resize((self.w, self.h), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=40, threshold=2))
        for job in self.late:
            if job[0] == 'bar': _draw_ean(im, *job[1:])
        return im


L_CODES = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
G_CODES = [''.join('1' if c == '0' else '0' for c in reversed(l)) for l in L_CODES]
R_CODES = [''.join('1' if c == '0' else '0' for c in l) for l in L_CODES]
PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']


def jan13(d12):
    d = [int(c) for c in str(d12).ljust(12, '0')[:12]]
    s = sum(v * (3 if i % 2 else 1) for i, v in enumerate(d))
    return ''.join(map(str, d)) + str((10 - s % 10) % 10)


def _draw_ean(im, x, y, d12, h, ink, bg, digits):
    code = jan13(d12); par = PARITY[int(code[0])]
    bits = '101' + ''.join((L_CODES if par[i] == 'L' else G_CODES)[int(c)] for i, c in enumerate(code[1:7])) + '01010' + ''.join(R_CODES[int(c)] for c in code[7:]) + '101'
    d = ImageDraw.Draw(im); x, y = int(round(x)), int(round(y))
    guard = set(list(range(0, 3)) + list(range(45, 50)) + list(range(92, 95)))
    for i, b in enumerate(bits):
        if b == '1': d.rectangle((x + i, y, x + i, y + h - 1 + (3 if i in guard and digits else 0)), fill=rgb(ink))
    if digits:
        f = ImageFont.truetype(fetch(GF + FONTS['biz'][0], os.path.join(CACHE, 'fonts', os.path.basename(FONTS['biz'][0]))), 7)
        d.text((x - 6, y + h), code[0], font=f, fill=rgb(ink))
        for i, c in enumerate(code[1:7]): d.text((x + 4 + i * 7, y + h), c, font=f, fill=rgb(ink))
        for i, c in enumerate(code[7:]): d.text((x + 50 + i * 7, y + h), c, font=f, fill=rgb(ink))


# ================================================================== pixel type (the game's fonts, set on whole pixels)
# The owner's rule for every printed thing: kana and kanji in DotGothic16, Latin in the game's own fonts (Alagard, and
# the hand-made 5 x 7 bitmap font for tiny print). They are set AFTER the photo work is reduced to the output size, at
# their native pixel grid (DotGothic16 / Alagard at 16, 32, 48 px; 5x7 at whole scales), thresholded to hard edges:
# crisp under nearest filtering, no smoothing, no effects. Smaller than 16 px, DotGothic16 is drawn at 16 and reduced
# with a box filter to grey small print (too small to read in the world, just as on a real pack).
#   P.ptext(s, x, y, fill, size=16, face='dot'|'ala'|'b5', anchor='lt', vert=False, track=0, outline=None, maxw=None)
#   ptext_w(s, size, face) -> width in px
DOT = ('dotgothic16/DotGothic16-Regular.ttf', None)
ALAGARD = os.path.join(ROOT, 'src', 'assets', 'fonts', 'alagard.woff2')
_pfonts = {}


def _pfont(face, px):
    k = (face, px)
    if k not in _pfonts:
        if face == 'dot': p = fetch(GF + DOT[0], os.path.join(CACHE, 'fonts', 'DotGothic16-Regular.ttf'))
        elif face == 'ala': p = ALAGARD
        else: raise ValueError(face)
        _pfonts[k] = ImageFont.truetype(p, px)
    return _pfonts[k]


def _is_cjk(s):
    return any(ord(c) > 0x2e7f for c in s)


def _mask_ttf(s, face, size, track=0, vert=False):
    """A hard-edged mask of a line set in a pixel font at its grid (size: a multiple of 16 for crisp, else reduced)."""
    grid = 16
    real = size if size >= grid else grid
    real = int(round(real / grid) * grid) if size >= grid else grid
    f = _pfont(face, real)
    asc, desc = f.getmetrics()
    if vert:
        cells = []
        for ch in s:
            m = _mask_ttf(ch, face, real, 0, False)
            if ch in 'ー〜～ー（）()「」-―…': m = m.rotate(-90, expand=True)
            cells.append(m)
        W = max(c.width for c in cells); H = sum(c.height for c in cells) + int(track) * (len(cells) - 1) + (len(cells) - 1) * max(1, real // 16)
        out = Image.new('L', (W, H), 0); y = 0
        for c in cells: out.paste(c, ((W - c.width) // 2, y)); y += c.height + int(track) + max(1, real // 16)
        m = out
    else:
        if track:
            parts = [_mask_ttf(ch, face, real, 0, False) if ch != ' ' else Image.new('L', (real // 2, 1), 0) for ch in s]
            W = sum(p.width for p in parts) + int(track) * (len(parts) - 1); H = max(p.height for p in parts)
            m = Image.new('L', (max(1, W), H), 0); x = 0
            for p in parts: m.paste(p, (x, H - p.height if p.height < H * 0.6 else 0)); x += p.width + int(track)
        else:
            w = int(f.getlength(s)) + 4
            m = Image.new('L', (max(1, w), asc + desc + 4), 0)
            ImageDraw.Draw(m).text((2, 2), s, font=f, fill=255)
            m = m.point(lambda v: 255 if v >= 128 else 0)
            # trim to the ink, keeping a line's baseline consistent: trim columns fully, rows to ascender box
            bb = m.getbbox()
            if bb: m = m.crop((bb[0], 2, bb[2], 2 + asc + desc))
            bb = m.getbbox()
            if bb: m = m.crop((0, bb[1], m.width, bb[3]))
    if size < grid:
        k = size / grid
        m = m.resize((max(1, int(round(m.width * k))), max(1, int(round(m.height * k)))), Image.BOX)
    return m


def pmask(s, size=16, face='dot', track=0, vert=False, bold=False):
    if face == 'b5': face = 'ala'  # the old 5x7 face is gone (owner: high-res pixel fonts only)
    if bold:  # the pixel-font bold: every stroke one font pixel wider to the right
        m = _mask_ttf(s, face, size, track, vert)
        k = max(1, int(size) // 16)
        a = np.asarray(m) > 0; b = a.copy()
        for i in range(1, k + 1): b[:, i:] |= a[:, :-i]
        return Image.fromarray(np.pad(b, ((0, 0), (0, k))).astype(np.uint8) * 255)
    if face == 'auto': face = 'dot' if _is_cjk(s) else 'ala'
    return _mask_ttf(s, face, size, track, vert)


def ptext_w(s, size=16, face='dot', track=0):
    return pmask(s, size, face, track).width


def _late_ptext(im, s, x, y, fill, size, face, anchor, vert, track, outline, maxw, shadow, bold=False):
    m = pmask(s, size, face, track, vert, bold)
    if maxw and m.width > maxw:  # condense on whole columns (drop every n-th column), never smear
        keep = [i for i in range(m.width) if int(i * maxw / m.width) != int((i + 1) * maxw / m.width) or i == m.width - 1]
        a = np.asarray(m)[:, keep]; m = Image.fromarray(a)
    ax, ay = anchor[0], anchor[1]
    X = int(round(x - {'l': 0, 'm': m.width / 2, 'r': m.width}[ax]))
    Y = int(round(y - {'t': 0, 'm': m.height / 2, 'b': m.height}[ay]))
    if shadow:
        dx, dy, col = shadow
        im.paste(Image.new('RGB', m.size, rgb(col)), (X + dx, Y + dy), m)
    if outline:
        w, col = outline
        o = m.filter(ImageFilter.MaxFilter(2 * w + 1)) if w else m
        big = Image.new('L', (m.width + 2 * w, m.height + 2 * w), 0); big.paste(m, (w, w))
        big = big.filter(ImageFilter.MaxFilter(2 * w + 1))
        im.paste(Image.new('RGB', big.size, rgb(col)), (X - w, Y - w), big)
    im.paste(Image.new('RGB', m.size, rgb(fill)), (X, Y), m)
    return m.size


def _ptext(self, s, x, y, fill, size=16, face='auto', anchor='lt', vert=False, track=0, outline=None, maxw=None, shadow=None, bold=False):
    """Pixel type, laid in after the reduction (see above). Returns (w, h) in px."""
    f = 'dot' if face == 'auto' and _is_cjk(s) else ('ala' if face == 'auto' else face)
    m = pmask(s, size, f, track, vert, bold)
    self.late.append(('ptext', s, x, y, fill, size, f, anchor, vert, track, outline, maxw, shadow, bold))
    w = min(m.width, maxw) if maxw else m.width
    return w, m.height


def _image(self):
    im = self.im.resize((self.w, self.h), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=0.6, percent=40, threshold=2))
    for job in self.late:
        if job[0] == 'bar': _draw_ean(im, *job[1:])
        elif job[0] == 'ptext': _late_ptext(im, *job[1:])
        elif job[0] == 'prect': ImageDraw.Draw(im).rectangle(job[1], fill=rgb(job[2]))
    return im


def _prect(self, x, y, w, h, c):
    """A hard-edged rule or box on whole output pixels (laid in with the type)."""
    self.late.append(('prect', (int(round(x)), int(round(y)), int(round(x + w)) - 1, int(round(y + h)) - 1), c))


Panel.ptext = _ptext
Panel.image = _image
Panel.prect = _prect


# ------------------------------------------------------------------ PIXEL: every P.text() is set in the game's pixel type
# Layouts written for vector faces keep their positions and anchors; the size snaps to the pixel grid:
#   kana / kanji (DotGothic16):  >= 40 px -> 48, >= 22 -> 32, >= 12.5 -> 16, smaller -> grey small print (16 reduced)
#   Latin: serif / display faces -> Alagard (16 / 32 / 48); the rest -> the 5 x 7 font at a whole scale (7, 14, 21... px)
# A line that would overflow maxw steps down a size, then (last resort) drops whole columns.
PIXEL = os.environ.get('PRINT_PIXEL') == '1'  # off: printed art may use real OFL faces (owner, phase 15)
HEAVY = {'dela', 'kaku', 'mplus', 'maru', 'rock', 'archivo', 'anton', 'barlowx', 'tokumin', 'mincho'}
SERIF = {'serif', 'serifb', 'tokumin', 'antique', 'mincho', 'brush'}
_orig_text, _orig_lines, _orig_info = Panel.text, Panel.lines, Panel.info


def _snap_cjk(s):
    return 48 if s >= 40 else 32 if s >= 22 else 16 if s >= 12.5 else max(6, round(s))


def _plan(s, face, size):
    """(pface, psize) for a run of text."""
    if _is_cjk(s): return 'dot', _snap_cjk(size)
    if face in SERIF and size >= 12.5: return 'ala', _snap_cjk(size)
    return 'b5', max(1, int(round(size / 8.5))) if size >= 12.5 else 1


def _fit(s, face, size, maxw, track=0):
    pf, ps = _plan(s, face, size)
    if not maxw: return pf, ps
    while ptext_w(s, ps, pf, track) > maxw:
        if pf == 'b5':
            if ps <= 1: break
            ps -= 1
        elif ps > 16: ps -= 16
        elif ps == 16: ps = 12
        else: break
    return pf, ps


def _text_px(self, s, face, size, x, y, fill, anchor='mm', stroke=None, stroke2=None, sx=1.0, track=0.0, vert=False, maxw=None, maxh=None, rot=0):
    if not PIXEL: return _orig_text(self, s, face, size, x, y, fill, anchor, stroke, stroke2, sx, track, vert, maxw, maxh, rot)
    if vert and maxh: maxw = None
    pf, ps = _fit(s, face, size, maxw if not vert else None, int(track))
    if vert and maxh:
        while pmask(s, ps, pf, int(track), True).height > maxh and ps > 16: ps -= 16
    ol = (max(1, int(round(stroke2[0] if stroke2 else stroke[0]))), (stroke2 or stroke)[1]) if (stroke or stroke2) else None
    bold = face in HEAVY and pf != 'b5' and ps >= 32
    w, h = _ptext(self, s, x, y, fill, ps, pf, anchor if len(anchor) == 2 else anchor + 't', vert, int(track), ol, maxw, None, bold)
    return w, h


def _lines_px(self, text, face, size, x, y, w, fill, lh=None, maxy=None, align='l'):
    if not PIXEL: return _orig_lines(self, text, face, size, x, y, w, fill, lh, maxy, align)
    pf, ps = _plan(text, face, size)
    lh = max(lh or 0, (pmask('漢Ag', ps, pf).height if pf != 'b5' else 7 * ps) + 1)
    out, cur = [], ''
    for ch in text:
        if ch == '\n': out.append(cur); cur = ''; continue
        if cur and ch not in '、。）」' and ptext_w(cur + ch, ps, pf) > w: out.append(cur); cur = ch
        else: cur += ch
    if cur: out.append(cur)
    for l in out:
        if maxy is not None and y + lh > maxy + 0.5: break
        _ptext(self, l, x if align == 'l' else x + w / 2, y, fill, ps, pf, ('l' if align == 'l' else 'm') + 't')
        y += lh
    return y


def _info_px(self, x, y, w, rows, ink=0x222222, paper=None, size=6.5, maxy=None, head=None):
    if not PIXEL: return _orig_info(self, x, y, w, rows, ink, paper, size, maxy, head)
    hw = max(ptext_w(h, *_plan(h, 'bizb', size)[::-1][::-1][1:] or (16,), _plan(h, 'bizb', size)[0]) if False else ptext_w(h, _plan(h, 'bizb', size)[1], _plan(h, 'bizb', size)[0]) for h, _ in rows) + 3
    top = y
    if paper is not None: self.rect(x, y, w, (maxy or self.h) - y, paper)
    y += 1.5
    for h, t in rows:
        _ptext(self, h, x + 2, y, ink, _plan(h, 'bizb', size)[1], _plan(h, 'bizb', size)[0], 'lt')
        y = _lines_px(self, t, 'biz', size, x + hw + 2, y, w - hw - 4, ink, lh=size * 1.32, maxy=maxy)
        if maxy and y > maxy: break
        self.prect(x, y + 0.5, w, 1, ink); y += 1.5
    self.prect(x, top, w, 1, ink); self.prect(x, top, 1, y - top, ink); self.prect(x + w - 1, top, 1, y - top, ink); self.prect(x, y - 1, w, 1, ink)
    self.prect(x + hw, top, 1, y - top, ink)
    return y + 2


Panel.text, Panel.lines, Panel.info = _text_px, _lines_px, _info_px
