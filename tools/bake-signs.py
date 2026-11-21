#!/usr/bin/env python3
"""bake-signs.py: the lane's shop signs, set like real sign-painters' work: proper sign faces (OFL, tools/printkit.py
FONTS), kerned pairs plus open tracking for caps, optical centring, a painted keyline and hard drop shade only (no
glow, no gradient), on real board surfaces (ambientCG CC0 scans in the art cache) with light, real wear. Drawn 4x and
reduced once, so the letters are clean at the texel grid (no jaggies, no blur), at ~200-400 px per metre of sign.
  sign:mikawaya   Mikawa-ya's fascia (src/world/CornerShop.js, 6.15 x 0.78 m)
  sign:tobacco    the closed tobacco shop's faded board (src/world/Neighbours.js, 3.9 x 0.55 m)
  sign:warehouse  the warehouse lettering by the park (src/world/Park.js, 4.6 x 1.34 m)
  sign:apt        Sakura Heights' name plate (src/world/Neighbours.js, 0.9 x 0.36 m)
  sign:ramen      Ramen Yamada's signboard (src/places/ramen/Ramen.js, 2.3 x 0.46 m)
Output: public/img/print/signs.webp + src/gfx/print/signs.json (read by the painters in src/gfx/textures.js and by
Ramen.js; main.js waits for the sheet before the world is built).
  python3 -I tools/bake-signs.py [--sheet out.png]
"""
import os, sys, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from printkit import font, CACHE, ROOT, cover, printed
import paperkit as PK
_bp = importlib.util.spec_from_file_location('bake_print', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-print.py'))
BP = importlib.util.module_from_spec(_bp); _bp.loader.exec_module(BP)

SS = 4  # supersampling
ACG = os.path.join(CACHE, 'acg')
OI = os.path.join(CACHE, 'oi')


def hexc(c, a=255): return ((c >> 16) & 255, (c >> 8) & 255, c & 255, a)


class Sign:
    """A sign face drawn at SS x its final size; every coordinate below is in final pixels."""
    def __init__(self, w, h, base):
        self.w, self.h = w, h
        self.im = Image.new('RGBA', (w * SS, h * SS), hexc(base))
        self.d = ImageDraw.Draw(self.im)

    def surface(self, name, tint, k=1.0, scale=1.0):
        """Multiply a real surface scan (lightness only, normalised) over the face: paint over planks, enamel over steel."""
        src = Image.open(os.path.join(ACG, name + '.jpg')).convert('L')
        W, H = self.im.size
        s = cover(src.convert('RGB'), int(W * scale), int(H * scale)).convert('L').resize((W, H), Image.BICUBIC)
        L = np.asarray(s, np.float32) / 255; L = L / max(1e-3, L.mean())
        a = np.asarray(self.im, np.float32)
        g = np.clip(1 + (L - 1) * k, 0.7, 1.08)[..., None]
        a[..., :3] = np.clip(a[..., :3] * g, 0, 255)
        self.im = Image.fromarray(a.astype(np.uint8), 'RGBA'); self.d = ImageDraw.Draw(self.im)

    def rect(self, x, y, w, h, c, r=0, line=0):
        box = [x * SS, y * SS, (x + w) * SS - 1, (y + h) * SS - 1]
        if line: self.d.rounded_rectangle(box, r * SS, outline=hexc(c), width=int(line * SS))
        else: self.d.rounded_rectangle(box, r * SS, fill=hexc(c))

    def circle(self, cx, cy, r, c, line=0):
        box = [(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS]
        if line: self.d.ellipse(box, outline=hexc(c), width=int(line * SS))
        else: self.d.ellipse(box, fill=hexc(c))

    def photo(self, path, cx, cy, r, ring=None):
        """A real photo in a round frame (the ramen bowls on the board)."""
        ph = printed(cover(Image.open(path).convert('RGB'), int(2 * r * SS), int(2 * r * SS)), sat=0.95, con=1.03)
        m = Image.new('L', ph.size, 0); ImageDraw.Draw(m).ellipse([0, 0, ph.size[0] - 1, ph.size[1] - 1], fill=255)
        self.im.paste(ph, (int((cx - r) * SS), int((cy - r) * SS)), m)
        if ring: self.circle(cx, cy, r, ring[0], line=ring[1])

    def text(self, s, face, cap, x, y, fill, track=0.0, anchor='c', shade=None, sx=1.0, vert=False):
        """Set s with its cap height = cap px, baseline at y (final px). Pair kerning from the font (raqm), plus
        track (em fraction) of open letter-spacing; anchor 'l' / 'c' / 'r' on x. shade = (colour, dx, dy): a hard
        sign-painter's drop shade. sx: horizontal scale (condensing for a long name). Returns the set width."""
        # size the font so its cap height (from 'H') matches cap
        probe = font(face, 200); bb = probe.getbbox('H'); px = 200 * cap * SS / max(1, bb[3] - bb[1])
        f = font(face, px)
        if vert:
            y0 = y * SS
            for ch in s:
                gb = f.getbbox(ch)
                g = Image.new('RGBA', (gb[2] - gb[0] + 4, gb[3] - gb[1] + 4), (0, 0, 0, 0))
                ImageDraw.Draw(g).text((-gb[0] + 2, -gb[1] + 2), ch, font=f, fill=hexc(fill))
                self.im.alpha_composite(g, (int(x * SS - g.width / 2), int(y0)))
                y0 += g.height + track * px
            return 0
        adv = []
        for i, ch in enumerate(s):
            nxt = s[i + 1] if i + 1 < len(s) else ''
            a = (f.getlength(ch + nxt) - f.getlength(nxt)) if nxt else f.getlength(ch)
            adv.append(a + (track * px if nxt else 0))
        tw = sum(adv)
        asc = f.getmetrics()[0]
        layer = Image.new('RGBA', (int(tw + 8 * SS), int(asc + px)), (0, 0, 0, 0))
        dl = ImageDraw.Draw(layer)
        cx = 4 * SS
        for ch, a in zip(s, adv): dl.text((cx, 0), ch, font=f, fill=(255, 255, 255, 255)); cx += a
        if sx != 1.0: layer = layer.resize((max(1, int(layer.width * sx)), layer.height), Image.LANCZOS); tw *= sx
        ox = {'l': x * SS, 'c': x * SS - tw / 2, 'r': x * SS - tw}[anchor] - 4 * SS * sx
        oy = y * SS - asc
        mask = layer.split()[3]
        for col, dx, dy in ([shade] if shade else []) + [(fill, 0, 0)]:
            solid = Image.new('RGBA', layer.size, hexc(col)); solid.putalpha(mask)
            self.im.alpha_composite(solid, (int(ox + dx * SS), int(oy + dy * SS)))
        return tw / SS

    def wear(self, k=0.25, seed=0, fade=0.0, grime='SurfaceImperfections009'):
        """Real-scan grime and a little sun fade (the paint's own age), then the one reduction to final size."""
        im = self.im.resize((self.w, self.h), Image.LANCZOS)
        a = np.asarray(im, np.float32) / 255
        if fade: a[..., :3] = np.clip(PK.fade_cmy(a[..., :3], fade), 0, 1)
        if k:
            src = Image.open(os.path.join(ACG, grime + '.jpg')).convert('L')
            rnd = np.random.default_rng(seed)
            ox, oy = rnd.integers(0, max(1, src.width - self.w)), rnd.integers(0, max(1, src.height - self.h))
            g = np.asarray(cover(src.convert('RGB'), max(self.w, 512), max(self.h, 512)).convert('L').crop((0, 0, self.w, self.h)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
            g = g / max(1e-3, g.mean())
            a[..., :3] *= np.clip(1 + (g[..., None] - 1) * k, 0.72, 1.0)  # grime only darkens: no bright specks
        return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8), 'RGBA')


# ------------------------------------------------------------------ Mikawa-ya (general store fascia)
def mikawaya():
    W, H = 1280, 162
    S = Sign(W, H, 0x1d5438)
    S.surface('Planks012', None, k=0.35, scale=1.0)            # painted over tongue-and-groove boards
    S.rect(8, 8, W - 16, H - 16, 0xefe6cf, r=6, line=3)         # the cream keyline
    S.rect(15, 15, W - 30, H - 30, 0x123a26, r=3, line=1.2)
    # the shop's crest: a red disc with a cream ring and 三 (three bars: Mikawa)
    S.circle(88, H / 2, 54, 0xc33a2a); S.circle(88, H / 2, 46, 0xefe6cf, line=4)
    S.text('三', 'oldmincho', 40, 88, H / 2 + 22, 0xf6eedb, anchor='c')
    # the name: a slab-serif wordmark, open tracking, hard drop shade
    S.text('MIKAWA-YA', 'alfa', 66, 600, 98, 0xf3ead2, track=0.075, anchor='c', shade=(0x0b2216, 4, 4))
    S.rect(258, 113, 684, 2.5, 0xd9b44a)
    S.text('GENERAL STORE  ·  SAKE  ·  RICE  ·  GROCERIES', 'barlows', 15, 600, 142, 0xe2bd55, track=0.2, anchor='c')
    # right panel: the name in kanji and the phone
    S.rect(1034, 26, 2, H - 52, 0xd9b44a)
    S.text('三河屋', 'oldmincho', 34, 1146, 86, 0xf3ead2, track=0.12, anchor='c', shade=(0x0b2216, 3, 3))
    S.text('TEL  2-1048', 'barlows', 14, 1146, 128, 0xe2bd55, track=0.18, anchor='c')
    return S.wear(k=0.12, seed=3, grime='SurfaceImperfections003')


# ------------------------------------------------------------------ the closed tobacco shop (old enamel, faded)
def tobacco():
    W, H = 1024, 144
    S = Sign(W, H, 0xeee3c6)
    S.surface('Paper004', None, k=0.2)
    S.rect(5, 5, W - 10, H - 10, 0x6a2a20, r=10, line=6)
    S.rect(17, 17, W - 34, H - 34, 0x6a2a20, r=6, line=1.5)
    S.circle(84, H / 2, 46, 0xb02a22); S.text('たばこ', 'kaku', 15, 84, H / 2 + 8, 0xf4ead2, anchor='c')
    S.circle(W - 84, H / 2, 46, 0x2a4f8a); S.text('塩', 'oldmincho', 34, W - 84, H / 2 + 17, 0xf4ead2, anchor='c')
    S.text('TOBACCO', 'serif', 64, W / 2, 88, 0xa22a20, track=0.16, anchor='c')
    S.text('SALT  ·  STAMPS  ·  POSTCARDS', 'barlows', 14, W / 2, 122, 0x2a3f6a, track=0.24, anchor='c')
    return S.wear(k=0.3, seed=11, fade=0.34, grime='SurfaceImperfections003')


# ------------------------------------------------------------------ the warehouse by the park (painted on the boards)
def warehouse():
    W, H = 1024, 298
    S = Sign(W, H, 0xe6dfcd)
    S.surface('Planks012', None, k=0.35, scale=0.8)
    S.rect(26, 28, W - 52, H - 56, 0x2c4a78, line=5)
    S.text('KAMIYAMA', 'oswald', 74, W / 2, 132, 0x2c4a78, track=0.22, anchor='c')
    S.text('WAREHOUSE CO.', 'oswald', 46, W / 2, 202, 0x2c4a78, track=0.3, anchor='c')
    S.rect(W / 2 - 150, 226, 300, 3, 0xa8352a)
    S.text('No. 3   ·   上山倉庫', 'kakub', 20, W / 2, 258, 0xa8352a, track=0.18, anchor='c')
    return S.wear(k=0.25, seed=21, fade=0.25, grime='SurfaceImperfections003')


# ------------------------------------------------------------------ Sakura Heights (the apartment's name plate)
def apt():
    W, H = 384, 154
    S = Sign(W, H, 0xf2ead7)
    S.surface('Paper004', None, k=0.12)
    S.rect(4, 4, W - 8, H - 8, 0x6e4a32, r=8, line=5)
    S.rect(14, 14, W - 28, H - 28, 0x6e4a32, r=4, line=1.2)
    S.text('SAKURA', 'serif', 40, W / 2, 70, 0x7a2e4a, track=0.14, anchor='c')
    S.text('HEIGHTS', 'barlows', 17, W / 2, 98, 0x7a2e4a, track=0.42, anchor='c')
    S.text('さくら荘', 'oldmincho', 17, W / 2, 132, 0x3a2a1c, track=0.3, anchor='c')
    return S.wear(k=0.12, seed=31, fade=0.1, grime='SurfaceImperfections003')


# ------------------------------------------------------------------ Ramen Yamada (dark-stained board, two real bowls)
def ramen():
    W, H = 800, 160
    S = Sign(W, H, 0x3a2418)
    S.surface('Wood051', None, k=0.6, scale=1.2)
    S.rect(6, 6, W - 12, H - 12, 0xd8b26a, r=4, line=3)
    S.photo(os.path.join(OI, '02866b5332267a21.jpg'), 82, H / 2, 56, ring=(0xd8b26a, 3))
    S.photo(os.path.join(OI, '5b1c17cb6d748fa0.jpg'), W - 82, H / 2, 56, ring=(0xd8b26a, 3))
    S.text('RAMEN', 'alfa', 54, W / 2, 92, 0xf1e6cc, track=0.12, anchor='c', shade=(0x140a06, 3, 3))
    S.rect(W / 2 - 170, 106, 340, 2, 0xc8402e)
    S.text('YAMADA  ·  らーめん山田', 'kakub', 15, W / 2, 136, 0xe25a40, track=0.16, anchor='c')
    return S.wear(k=0.1, seed=41, grime='SurfaceImperfections003')


SIGNS = {'sign:mikawaya': mikawaya, 'sign:tobacco': tobacco, 'sign:warehouse': warehouse, 'sign:apt': apt, 'sign:ramen': ramen}

if __name__ == '__main__':
    ims = {k: fn() for k, fn in SIGNS.items()}
    out, idx = BP.pack(ims, 1280, alpha=False)
    if '--sheet' in sys.argv:
        p = sys.argv[sys.argv.index('--sheet') + 1]; out.convert('RGB').save(p); print('sheet', p, out.size)
    else:
        BP.save_sheet('signs', out.convert('RGB'), idx, quality=92)
