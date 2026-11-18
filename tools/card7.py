"""card7.py: designer-made gacha cards, one original layout per series (the owner's printed-card vocabulary from
scratchpad/ref_gacha, not a traced template). Only real photos (backgrounds and cut-outs, credited), our toy renders
and pixel-font type; flat shapes only where they carry print (price coin, capsule badge, sticker burst, tags, the
legal strip). No drawn props, patterns, bunting, glow or gradient.
  python3 -I tools/bake-cards.py --card7 kanikan,nakanohito,kasabuki   -> shots/clone/card7_<series>.png"""
import os, math
import numpy as np
from PIL import Image, ImageDraw
from printkit import source, rgb
from pixprint import Sheet, line_mask, _dilate, upscale
from lettering import emblem
import paperkit as PK
from card6 import Card, mixc, deep, lum, W, H, WH, INK, PAPER, GREY, YEL

GOLD = 0xf2c84a; CREAM = 0xf6eedb


# ------------------------------------------------------------------------------------------------- logo lettering
def logo7(S, text, x, y, face, ks, fill, layers, drop=(3, 3, INK), track=-1, bounce=None, space=None, inner=INK):
    """Custom logotype from a pixel face: every letter at its own integer scale (ks, cycled), bounced on the baseline,
    overlapping its neighbour (track < 0) with its own ink keyline, the whole word wrapped in hard outline layers
    (r, col) innermost first (ink, colour, ink...) and dropped on a hard offset shadow. Returns the ink box."""
    parts, cx = [], 0
    for i, ch in enumerate(text):
        k = ks[i % len(ks)]
        if ch == ' ': cx += (space or 3) * k; continue
        m, _, b, _ = line_mask(ch, face)
        M = np.repeat(np.repeat(m, k, 0), k, 1)
        dy = (bounce[i % len(bounce)] if bounce else 0)
        parts.append((M, cx, -b * k + dy, i)); cx += M.shape[1] + track * k
    x0 = min(p[1] for p in parts); y0 = min(p[2] for p in parts)
    x1 = max(p[1] + p[0].shape[1] for p in parts); y1 = max(p[2] + p[0].shape[0] for p in parts)
    pad = sum(r for r, _ in layers) + 1
    U = np.zeros((y1 - y0 + 2 * pad, x1 - x0 + 2 * pad), bool)
    for M, px, py, _ in parts: U[py - y0 + pad:py - y0 + pad + M.shape[0], px - x0 + pad:px - x0 + pad + M.shape[1]] |= M
    sil = _dilate(U, 1, 'sq'); stack = []
    for r, col in layers: sil = _dilate(sil, r, 'disc'); stack.append((sil, col))
    P = (sil.shape[0] - U.shape[0]) // 2
    if drop: S._stamp(sil, x + drop[0], y + drop[1], drop[2])
    for s_, c in reversed(stack): S._stamp(s_, x + (sil.shape[1] - s_.shape[1]) // 2, y + (sil.shape[0] - s_.shape[0]) // 2, c)
    fills = fill if isinstance(fill, list) else [fill]
    for M, px, py, i in parts:  # each letter keylined over the one before it (interlocking)
        X, Y = x + P + px - x0 + pad, y + P + py - y0 + pad
        S._stamp(_dilate(M, 1, 'sq'), X - 1, Y - 1, inner); S._stamp(M, X, Y, fills[i % len(fills)])
    return (x, y, x + sil.shape[1], y + sil.shape[0])


def burst(S, cx, cy, r, n, fill, line=INK, lines=(), col=INK, face='b5', rot=0.0, jag=0.72):
    """A die-cut sticker burst (flat, hard keyline) with its words."""
    pts = [(cx + math.cos(rot + math.pi * i / n) * (r if i % 2 == 0 else r * jag), cy + math.sin(rot + math.pi * i / n) * (r if i % 2 == 0 else r * jag)) for i in range(2 * n)]
    S.poly([(px + (px - cx) / max(1, math.hypot(px - cx, py - cy)) * 1.5, py + (py - cy) / max(1, math.hypot(px - cx, py - cy)) * 1.5) for px, py in pts], line)
    S.poly(pts, fill)
    for j, l in enumerate(lines): S.text(l, cx, cy - 4 * len(lines) + 9 * j + 1, face, 1, col, anchor='mt')


def coin(S, cx, cy, r, price, fill=GOLD, ink=INK):
    """The price coin: a flat disc, inner ring, the price and YEN."""
    S.ellipse(cx - r - 1, cy - r - 1, 2 * r + 2, 2 * r + 2, ink); S.ellipse(cx - r, cy - r, 2 * r, 2 * r, fill)
    S.ellipse(cx - r + 3, cy - r + 3, 2 * r - 6, 2 * r - 6, fill, line=deep(fill, 0.35))
    S.text('%d' % price, cx, cy - 9, 'b5', 2, ink, anchor='mt'); S.text('YEN', cx, cy + 7, 'micro5', 1, ink, anchor='mt')


def capsule(S, x, y, w, h, top, bot, words, ink=INK):
    """A two-tone capsule badge (the gacha ball), words across the seam."""
    S.rrect(x - 1, y - 1, w + 2, h + 2, ink, r=h // 2 + 1)
    S.rrect(x, y, w, h, bot, r=h // 2); S.rect(x + h // 2, y, w - h, h // 2, top)
    S.d.pieslice((x, y, x + h - 1, y + h - 1), 90, 270, fill=rgb(top)); S.d.pieslice((x + w - h, y, x + w - 1, y + h - 1), 270, 90, fill=rgb(top))
    S.d.pieslice((x, y, x + h - 1, y + h - 1), 180, 270, fill=rgb(top)); S.rect(x, y + h // 2, h // 2, h // 2, bot)
    S.d.pieslice((x, y, x + h - 1, y + h - 1), 90, 180, fill=rgb(bot)); S.rect(x + w - h // 2, y + h // 2, h // 2, h // 2, bot)
    S.d.pieslice((x + w - h, y, x + w - 1, y + h - 1), 0, 90, fill=rgb(bot))
    S.rect(x + 2, y + h // 2, w - 4, 1, ink)
    S.text(words, x + w // 2, y + h // 2 - 3, 'b5', 1, ink, anchor='mt', outline=[(1, WH)])


def callout(S, text, tx, ty, px, py, anchor='rm', fill=WH, ink=INK, face='micro5'):
    """A printed callout: a label tag with a leader line to the point on the figure (a dot at the end)."""
    tw = line_mask(text, face)[0].shape[1] + 6; th = 9
    X = {'l': tx, 'm': tx - tw // 2, 'r': tx - tw}[anchor[0]]; Y = ty - th // 2
    ex = X + tw if px > X + tw else X if px < X else X + tw // 2
    S.line([(ex, ty), (px, py)], ink, 1); S.rect(px - 1, py - 1, 3, 3, ink)
    S.rect(X - 1, Y - 1, tw + 2, th + 2, ink); S.rect(X, Y, tw, th, fill); S.text(text, X + 3, Y + 2, face, 1, ink)


def age_mark(S, cx, cy, ink=INK, paper=WH):
    S.ellipse(cx - 9, cy - 9, 18, 18, ink); S.ellipse(cx - 8, cy - 8, 16, 16, paper)
    S.text('15+', cx, cy - 5, 'micro5', 1, ink, anchor='mt'); S.text('AGE', cx, cy + 1, 'micro5', 1, ink, anchor='mt')


class Card7(Card):
    """Card plus G: a 2x layer of real photo grounds under everything."""
    def __init__(self, s, ctx):
        super().__init__(s, ctx)
        self.G = Sheet(2 * W, 2 * H, PAPER); self.B = Sheet(W, H, None)

    def photo(self, ref, box, focus=(0.5, 0.5, 1.0), tint=None, k=0.35, bright=1.0, con=1.0, layer=None):
        """A real photo ground cropped to box, colour-graded toward tint (k: how far), hard-edged."""
        x, y, w, h = box
        a = np.asarray(source(ref), np.float32); a = a * 255 if a.max() <= 1.5 else a
        im = Image.fromarray(a.clip(0, 255).astype(np.uint8)).convert('RGB')
        fx, fy, z = focus; Wt, Ht = 2 * w, 2 * h
        sc = max(Wt / im.width, Ht / im.height) * z
        im = im.resize((max(Wt, int(im.width * sc)), max(Ht, int(im.height * sc))), Image.LANCZOS)
        ox = int((im.width - Wt) * fx); oy = int((im.height - Ht) * fy)
        b = np.asarray(im.crop((ox, oy, ox + Wt, oy + Ht)), np.float32)
        L = (0.3 * b[..., 0] + 0.59 * b[..., 1] + 0.11 * b[..., 2])[..., None]
        b = (b - L.mean()) * con + L.mean()
        if tint is not None: b = b * (1 - k) + np.array(rgb(tint), np.float32) * (L / 128.0) * k
        b = (b * bright).clip(0, 255).astype(np.uint8)
        (layer or self.G).im.paste(Image.fromarray(b), (2 * x, 2 * y))

    def legal(self, y, entries, red, mark_col):
        """The dense legal / spec strip: real paper, line-up legend with colour swatches, small print, age mark,
        maker mark, capsule size, barcode, part number."""
        self.photo('acg:Paper002', (0, y, W, H - y), tint=CREAM, k=0.25, bright=1.04)
        F = self.F; F.rect(0, y, W, 1, INK)
        rows = 3; cw = 60
        for i, (num, name, col) in enumerate(entries):
            cx = 5 + (i // rows) * cw; cy = y + 5 + (i % rows) * 9
            while line_mask(name, 'micro5')[0].shape[1] > cw - 22 and ' ' in name: name = name.split(' ', 1)[1]
            F.rect(cx, cy, 6, 6, INK); F.rect(cx + 1, cy + 1, 4, 4, col)
            F.text('%02d %s' % (num, name), cx + 9, cy + 1, 'micro5', 1, INK)
        sx = 128; F.rect(sx - 4, y + 4, 1, H - y - 8, INK)
        for j, l in enumerate(['SMALL PARTS.', 'NOT FOR UNDER 3.', 'KEEP FROM MOUTH.', 'PVC/ABS. 50MM', 'FOR ILLUSTRATION']):
            F.text(l, sx, y + 4 + 6 * j, 'micro5', 1, INK)
        age_mark(F, 208, y + 13, paper=0xf3ead6)
        bx = W - 98; F.barcode(bx, y + 4, '4970%08d' % (sum(map(ord, self.sid)) * 7919 % 10 ** 8), h=9, ink=INK, bg=0xf3ead6)
        mb = F.text(self.maker, W - 6, H - 8, 'micro5', 1, red, anchor='rt')
        emblem(F, self.em, mb[0] - 14, H - 11, mark_col, ink=INK, paper=0xf3ead6)


# ================================================================================ CRABS IN FOOD CANS: out at sea
def c_kanikan(K):
    B, M, F = K.B, K.M, K.F
    red, navy = 0xc8302a, 0x1c3a6a
    K.photo('oi:0d76fa17adca869d@test', (0, 0, W, 246), focus=(0.5, 0.7, 1.0), tint=0x1d5f8a, k=0.3, con=1.05)
    # the cast at sea: a burst of real surf behind the leader, the tins bobbing in a real wave
    K.cut('sea_splash', 230, 112, 120, 0, 'back')
    K.cut('fish_0', 30, 150, 52, -28, 'back')
    hb = K.toy(K.hero['id'], 222, 178, 118, 132)
    K.wave(0, W, 162, 186, amp=5, period=30)
    K.cut('lemon_1', 128, 176, 32, 18, 'front'); K.cut('lemon_2', 306, 182, 24, -12, 'front')
    rest = K.rest; cw = (W - 20) / len(rest)
    for k_, it in enumerate(rest):
        cx = 12 + cw * (k_ + .5); K.toy(it['id'], cx, 236, 42, cw - 6, sil=it['secret'], shadow=False)
    K.wave(0, W, 224, 246, amp=4, period=24)
    for k_, it in enumerate(rest):  # the numbers on the swell, like a printed index
        cx = 12 + cw * (k_ + .5)
        F.rect(int(cx) - 7, 236, 14, 9, INK); F.text('%02d' % (K.items.index(it) + 1), cx, 238, 'micro5', 1, YEL if it['secret'] else WH, anchor='mt')
    # logo: CRABS IN / FOOD CANS, gold letters, ink - red - ink, bouncing like they float
    logo7(F, 'CRABS IN', 10, 8, 'jersey10', [2, 2, 2, 2, 2, 2, 2, 2], GOLD, [(1, INK), (2, red), (1, INK)], bounce=[0, -2, 1, -1, 2, 0, -2, 1], track=1)
    bb = logo7(F, 'FOOD CANS', 6, 32, 'jersey10', [4, 3, 3, 3, 3, 4, 3, 3, 3], GOLD, [(1, INK), (2, red), (1, INK)], bounce=[0, 3, -2, 2, 0, -3, 1, -2, 3], track=-1)
    F.rect(112, 10, 34, 11, INK); F.text('VOL.1', 129, 12, 'b5', 1, YEL, anchor='mt')
    burst(F, bb[2] + 8, bb[1] + 4, 21, 10, red, lines=('NEW', 'CATCH!'), col=WH, face='micro5', rot=0.2)
    for j, l in enumerate(['EVERY CRAB HAS FOUND', 'A TIN TO ITS TASTE.']): F.text(l, 10, bb[3] + 4 + 9 * j, 'b5', 1, WH, outline=[(1, INK)])
    # price coin + capsule badge + maker tab, top right
    coin(F, 294, 26, 21, K.s['price'])
    capsule(F, 246, 54, 68, 15, red, WH, '%d TYPES' % len(K.items))
    F.text('+ 1 SECRET TIN', 280, 72, 'micro5', 1, WH, anchor='mt', outline=[(1, INK)])
    # callouts on the leader
    if hb:
        x0, y0, x1, y1 = hb; w_, h_ = x1 - x0, y1 - y0
        callout(F, 'PULL-TAB LID OPENS', 146, 134, x0 + w_ * 0.42, y0 + h_ * 0.14, anchor='rm')
        callout(F, 'THE CRAB LIVES INSIDE', 146, 150, x0 + w_ * 0.36, y0 + h_ * 0.42, anchor='rm')
        callout(F, 'A REAL PRINTED TIN', 146, 166, x0 + w_ * 0.3, y0 + h_ * 0.74, anchor='rm')
    sw = [0x3a6ab0, 0x6a8a9a, 0xb83a2a, 0xc87a3a, 0xe8c040, 0x2a2a30]
    K.legal(246, [(i + 1, it['name'].upper().split(' ')[-2] if len(it['name'].split(' ')) > 2 else it['name'].upper(), sw[i % 6]) for i, it in enumerate(K.items)], red, red)


# ========================================================================== WHO'S IN THE SUIT?: on the miniature set
def c_nakanohito(K):
    B, M, F = K.B, K.M, K.F
    red = 0xc8342c
    K.photo('local:cumulus.jpg', (0, 0, W, 168), focus=(0.5, 0.4, 1.1), tint=0xd8a060, k=0.28)   # the painted sky flat
    K.photo('acg:Cardboard001', (0, 168, W, 78), tint=0x8a6a48, k=0.25, bright=0.92)              # the set floor
    # the miniature city and the army, real photos; the monster stomps between them
    K.cut('skyscraper_0', 136, 132, 84, 0, 'back'); K.cut('skyscraper_2', 304, 128, 92, 0, 'back'); K.cut('skyscraper_1', 262, 150, 60, 0, 'back')
    hb = K.toy(K.hero['id'], 214, 206, 168, 140)
    K.cut('tank_1', 128, 204, 46, 0, 'front'); K.cut('tank_0', 298, 214, 40, 0, 'front')
    K.cut('camera_1', 28, 210, 58, 12, 'front')
    rest = [i for i in K.rest]; cw = 52
    for k_, it in enumerate(rest):
        cx = 54 + cw * k_ if k_ < 2 else 0
    # the cast line: the others stand on the floor in front, numbered like call sheet
    xs = [60, 100, 140, 274, 312]
    for it, cx in zip(rest, [58, 96, 170, 252, 294]):
        K.toy(it['id'], cx, 242, 44, 40, sil=it['secret'])
    # logo: WHO'S IN / THE SUIT?, monster-movie letters, yellow, ink - red - ink, stomping bounce
    logo7(F, "WHO'S IN", 8, 8, 'jersey15', [2, 2, 2, 2, 2, 2, 2, 2], 0xf4d640, [(1, INK), (2, red), (1, INK)], bounce=[0, 2, -1, 0, 1, 0, 2, -1], track=1)
    bb = logo7(F, 'THE SUIT?', 4, 40, 'jersey15', [2, 2, 2, 1, 3, 3, 3, 3, 3], 0xf4d640, [(1, INK), (2, red), (1, INK)], bounce=[0, -2, 1, 0, 3, -2, 2, -3, 1], track=-1)
    F.rect(10, bb[3] + 3, 112, 11, INK); F.text('MONSTER SUIT FIGURE', 66, bb[3] + 5, 'b5', 1, WH, anchor='mt')
    burst(F, 170, 28, 17, 9, YEL, lines=('TAKE', '1!'), face='micro5', rot=0.3)
    # the clapperboard: production, scene (price), take (types)
    x, y = 244, 6; F.rect(x - 1, y - 1, 72, 52, INK); F.rect(x, y, 70, 50, 0x26221f)
    for i in range(7): F.poly([(x + i * 10, y), (x + i * 10 + 6, y), (x + i * 10 + 2, y + 7), (x - 4 + i * 10, y + 7)], WH)
    F.rect(x, y + 8, 70, 1, WH)
    F.text('PROD. GG-0417', x + 4, y + 12, 'micro5', 1, WH); F.text('SCENE', x + 4, y + 20, 'micro5', 1, 0xb8b0a0); F.text('%d YEN' % K.s['price'], x + 66, y + 19, 'b5', 1, YEL, anchor='rt')
    F.text('TAKE', x + 4, y + 30, 'micro5', 1, 0xb8b0a0); F.text('%d TYPES' % len(K.items), x + 66, y + 29, 'b5', 1, WH, anchor='rt')
    F.text('DIR. ??? (SECRET)', x + 4, y + 40, 'micro5', 1, WH)
    if hb:
        x0, y0, x1, y1 = hb; w_, h_ = x1 - x0, y1 - y0
        callout(F, 'AN ACTOR INSIDE!', 112, 138, x0 + w_ * 0.5, y0 + h_ * 0.14, anchor='rm')
        callout(F, 'ZIP UP THE BACK', 112, 154, x0 + w_ * 0.36, y0 + h_ * 0.42, anchor='rm')
        callout(F, 'RUBBER SUIT TAIL', 316, 176, x0 + w_ * 0.86, y0 + h_ * 0.8, anchor='rm')
    for it, cx in zip(rest, [58, 96, 170, 252, 294]):
        F.text('%02d' % (K.items.index(it) + 1), cx, 236, 'micro5', 1, WH, anchor='mt', outline=[(1, INK)])
    sw = [0x8a6a4a, 0x5a7a4a, 0xc8a840, 0x9aa0a8, 0x6a9a3a, 0x2a2a30]
    K.legal(246, [(i + 1, it['name'].upper().replace('THE ', ''), sw[i % 6]) for i, it in enumerate(K.items)], red, red)


# ============================================================================= UMBRELLA ARMS: rain on the dojo
def c_kasabuki(K):
    B, M, F = K.B, K.M, K.F
    red, gold = 0xc8342a, 0xe8c060
    K.photo('local:rain_window.jpg', (0, 0, W, 200), tint=0x5a1a1c, k=0.55, bright=0.9, con=1.15)   # rain on glass
    K.photo('acg:Wood049', (0, 200, W, 46), tint=0x6a3a24, k=0.3, bright=0.85)                     # the dojo floor
    K.cut('rose_2', 18, 172, 60, -15, 'back'); K.cut('sword_0', 250, 96, 150, 35, 'back'); K.cut('dagger_2', 286, 150, 80, -55, 'back')
    hb = K.toy(K.hero['id'], 214, 196, 120, 190)
    K.cut('sea_splash', 150, 196, 50, 0, 'front'); K.cut('rose_0', 306, 196, 40, 20, 'front')
    rest = K.rest; cw = (W - 24) / len(rest)
    for k_, it in enumerate(rest):
        cx = 12 + cw * (k_ + .5); K.toy(it['id'], cx, 240, 34, cw - 6, sil=it['secret'])
    # logo: UMBRELLA small / ARMS huge, Alagard, gold, ink - red - ink
    logo7(F, 'UMBRELLA', 10, 26, 'ala', [2, 2, 2, 2, 2, 2, 2, 2], gold, [(1, INK), (2, red), (1, INK)], bounce=[0, 1, 0, -1, 0, 1, 0, -1], track=0)
    bb = logo7(F, 'ARMS', 14, 52, 'ala', [5, 4, 4, 5], gold, [(1, INK), (2, red), (1, INK)], bounce=[0, 2, -1, 1], track=-1)
    F.text('RAIN OR SHINE,', 12, 10, 'b5', 1, WH, outline=[(1, INK)]); F.text('ALWAYS ARMED.', 12, 18, 'b5', 1, gold, outline=[(1, INK)])
    F.rect(bb[2] - 4, bb[1] + 4, 30, 11, INK); F.text('VOL.1', bb[2] + 11, bb[1] + 6, 'b5', 1, gold, anchor='mt')
    burst(F, 52, 142, 24, 11, gold, lines=('OPENS', 'INTO A', 'BLADE!'), face='micro5', rot=0.1)
    # the tsuba-shaped price plate and the capsule
    cx, cy, r = 292, 30, 22
    oct_ = [(cx + math.cos(math.pi / 8 + i * math.pi / 4) * r, cy + math.sin(math.pi / 8 + i * math.pi / 4) * r) for i in range(8)]
    F.poly([(px + (px - cx) / r * 1.5, py + (py - cy) / r * 1.5) for px, py in oct_], INK); F.poly(oct_, 0x2a2224)
    F.rect(cx - 3, cy - r + 6, 6, 10, gold)
    F.text('%d' % K.s['price'], cx, cy - 2, 'b5', 2, gold, anchor='mt'); F.text('YEN', cx, cy + 13, 'micro5', 1, WH, anchor='mt')
    capsule(F, 248, 58, 66, 15, red, WH, '%d TYPES' % len(K.items))
    if hb:
        x0, y0, x1, y1 = hb; w_, h_ = x1 - x0, y1 - y0
        callout(F, 'CLOSED: AN UMBRELLA', 200, 112, x0 + w_ * 0.2, y0 + h_ * 0.4, anchor='rm')
        callout(F, 'FOLDS IN THREE', 316, 104, x0 + w_ * 0.62, y0 + h_ * 0.4, anchor='rm')
        callout(F, 'OPEN: A WEAPON', 316, 190, x0 + w_ * 0.84, y0 + h_ * 0.62, anchor='rm')
    for k_, it in enumerate(rest):
        cx = 12 + cw * (k_ + .5); F.text('%02d' % (K.items.index(it) + 1), cx, 241, 'micro5', 1, gold, anchor='mt', outline=[(1, INK)])
    sw = [0xc8342a, 0x2a2a30, 0xe8c060, 0x3a5a8a, 0x8a3a5a, 0x2a2224]
    K.legal(246, [(i + 1, it['name'].upper().split(' ')[-1], sw[i % 6]) for i, it in enumerate(K.items)], red, red)


CARDS = {'kanikan': c_kanikan, 'nakanohito': c_nakanohito, 'kasabuki': c_kasabuki}


def card7(s, ctx):
    K = Card7(s, ctx)
    CARDS[s['id']](K)
    im = upscale(K.B.im, 2)
    out = K.G.im.convert('RGBA'); out.alpha_composite(im); out.alpha_composite(K.P.im); out.alpha_composite(upscale(K.M.im, 2))
    out.alpha_composite(K.T.im); out.alpha_composite(K.FC.im); out.alpha_composite(upscale(K.F.im, 2))
    return PK.age(out.convert('RGB'), paper='Paper001', grain_k=0.14, fade=0.0, seed=sum(map(ord, s['id']))).convert('RGB')
