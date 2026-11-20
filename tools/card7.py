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


_KIT = {}


def kit_sprite(name, frame=0, scale=1):
    """A sprite from the pixel-art kit (public/img/pixelkit, tools/pixelkit/build.py), at an integer scale."""
    if not _KIT:
        import json
        d = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img', 'pixelkit')
        _KIT['meta'] = json.load(open(os.path.join(d, 'kit.json')))
        _KIT['im'] = Image.open(os.path.join(d, 'kit.png')).convert('RGBA')
    sp = _KIT['meta']['sprites'][name]
    im = _KIT['im'].crop((sp['x'] + frame * sp['w'], sp['y'], sp['x'] + (frame + 1) * sp['w'], sp['y'] + sp['h']))
    return im.resize((sp['w'] * scale, sp['h'] * scale), Image.NEAREST) if scale != 1 else im


def coin(S, cx, cy, r, price, fill=GOLD, ink=INK):
    """The price coin: the kit's pixel 500-yen coin at 2x, the price and YEN printed across it."""
    sp = kit_sprite('coin500', 0, 2)
    S.im.alpha_composite(sp, (int(cx - sp.width // 2), int(cy - sp.height // 2)))
    S.text('%d' % price, cx, cy - 8, 'b5', 2, ink, anchor='mt', outline=[(1, WH)]); S.text('YEN', cx, cy + 8, 'micro5', 1, ink, anchor='mt', outline=[(1, WH)])


def capsule(S, x, y, w, h, top, bot, words, ink=INK):
    """The capsule badge: the kit's pixel capsule, words beside it."""
    sp = kit_sprite('capsule_s')
    S.im.alpha_composite(sp, (int(x), int(y + h // 2 - sp.height // 2)))
    S.text(words, x + sp.width + 2, y + h // 2 - 3, 'b5', 1, ink, anchor='lt', outline=[(1, WH)])


def callout(S, text, tx, ty, px, py, anchor='rm', fill=WH, ink=INK, face='micro5'):
    """A printed callout: a label tag with a leader line to the point on the figure (a dot at the end)."""
    tw = line_mask(text, face)[0].shape[1] + 6; th = 9
    X = {'l': tx, 'm': tx - tw // 2, 'r': tx - tw}[anchor[0]]; Y = ty - th // 2
    S.rect(X - 1, Y - 1, tw + 2, th + 2, ink); S.rect(X, Y, tw, th, fill); S.text(text, X + 3, Y + 2, face, 1, ink)


def age_mark(S, cx, cy, ink=INK, paper=WH):
    S.ellipse(cx - 9, cy - 9, 18, 18, ink); S.ellipse(cx - 8, cy - 8, 16, 16, paper)
    S.text('15+', cx, cy - 5, 'micro5', 1, ink, anchor='mt'); S.text('AGE', cx, cy + 1, 'micro5', 1, ink, anchor='mt')


class Card7(Card):
    """Card plus G: a 2x layer of real photo grounds under everything."""
    def __init__(self, s, ctx):
        super().__init__(s, ctx)
        self.G = Sheet(2 * W, 2 * H, PAPER); self.B = Sheet(W, H, None)

    def photo(self, ref, box, focus=(0.5, 0.5, 1.0), tint=None, k=0.35, bright=1.0, con=1.0, layer=None, rep=1):
        """A real photo ground cropped to box, colour-graded toward tint (k: how far), hard-edged."""
        x, y, w, h = box
        a = np.asarray(source(ref), np.float32); a = a * 255 if a.max() <= 1.5 else a
        im = Image.fromarray(a.clip(0, 255).astype(np.uint8)).convert('RGB')
        if rep > 1:  # a tileable material shown at its real scale (e.g. small bath tiles)
            t = Image.new('RGB', (im.width * rep, im.height * rep))
            for i in range(rep):
                for j in range(rep): t.paste(im, (i * im.width, j * im.height))
            im = t.resize((im.width, im.height), Image.LANCZOS)
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
            name = name.replace('-', ' ').replace("'S", '')
            while line_mask(name, 'micro5')[0].shape[1] > cw - 14 and ' ' in name: name = name.rsplit(' ', 1)[0]
            F.rect(cx, cy, 11, 7, col if lum(col) < 0.55 else INK); F.text('%02d' % num, cx + 6, cy + 1, 'micro5', 1, WH, anchor='mt')
            F.text(name, cx + 13, cy + 1, 'micro5', 1, INK)
        sx = 128; F.rect(sx - 4, y + 4, 1, H - y - 8, INK)
        for j, l in enumerate(['SMALL PARTS.', 'NOT FOR UNDER 3.', 'KEEP FROM MOUTH.', 'PVC/ABS. 50MM', 'FOR ILLUSTRATION']):
            F.text(l, sx, y + 4 + 6 * j, 'micro5', 1, INK)
        age_mark(F, 208, y + 13, paper=0xf3ead6)
        bx = W - 98; F.barcode(bx, y + 4, '4970%08d' % (sum(map(ord, self.sid)) * 7919 % 10 ** 8), h=9, ink=INK, bg=0xf3ead6)
        mb = F.text(self.maker, W - 6, H - 8, 'micro5', 1, red, anchor='rt')
        emblem(F, self.em, mb[0] - 14, H - 11, mark_col, ink=INK, paper=0xf3ead6)


# ----------------------------------------------------------------------------------------- the printed pieces
def crest(K, x0, x1, top, bot, layer='front', tint=None, k=0.3):
    """A band of real breaking wave (tools/cardref/cutouts.py sea_crest: cut on the photo's own foam line)."""
    t = Image.open(os.path.join(K.ctx['cuts'], 'sea_crest.png')).convert('RGBA')
    w2, h2 = 2 * (x1 - x0), 2 * (bot - top)
    sc = max(w2 / t.width, h2 / t.height * 0.9); t = t.resize((int(t.width * sc) + 1, int(t.height * sc) + 1), Image.LANCZOS)
    t = t.crop((0, 0, w2, min(t.height, h2)))
    a = np.asarray(t).astype(np.float32)
    if tint is not None:
        L = (0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2])[..., None]
        a[..., :3] = a[..., :3] * (1 - k) + np.array(rgb(tint), np.float32) * (L / 128) * k
    a[..., 3] = (a[..., 3] > 127) * 255
    (K.FC if layer == 'front' else K.P).im.alpha_composite(Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGBA'), (2 * x0, 2 * top))


def price_piece(F, style, x, y, price, col, ink=INK):
    if style == 'coin': coin(F, x, y, 21, price, fill=col)
    elif style == 'tsuba':
        r = 22; o = [(x + math.cos(math.pi / 8 + i * math.pi / 4) * r, y + math.sin(math.pi / 8 + i * math.pi / 4) * r) for i in range(8)]
        F.poly([(px + (px - x) / r * 1.5, py + (py - y) / r * 1.5) for px, py in o], ink); F.poly(o, 0x2a2224)
        F.rect(x - 3, y - r + 6, 6, 9, col); F.text('%d' % price, x, y - 2, 'b5', 2, col, anchor='mt'); F.text('YEN', x, y + 13, 'micro5', 1, WH, anchor='mt')
    else:  # ticket: a stub with punched corners
        F.rect(x - 31, y - 15, 62, 30, ink); F.rect(x - 30, y - 14, 60, 28, col)
        for cx_, cy_ in ((x - 30, y - 14), (x + 27, y - 14), (x - 30, y + 11), (x + 27, y + 11)): F.rect(cx_, cy_, 3, 3, ink)
        F.rect(x + 12, y - 13, 1, 26, ink)
        F.text('%d' % price, x - 9, y - 10, 'b5', 2, ink, anchor='mt'); F.text('YEN', x - 9, y + 5, 'micro5', 1, ink, anchor='mt')
        F.text('ADMIT', x + 21, y - 9, 'micro5', 1, ink, anchor='mt'); F.text('ONE', x + 21, y - 2, 'micro5', 1, ink, anchor='mt')


def fit_logo(lines, face, w, h, big):
    """The largest whole scale at which every line (first letter one step bigger) fits w x h."""
    for k in (4, 3, 2, 1):
        ws = [sum(line_mask(c, face)[0].shape[1] * (k + (1 if i == 0 and big else 0)) + k for i, c in enumerate(l) if c != ' ') + 3 * k * l.count(' ') + 8 for l in lines]
        hs = sum(line_mask(l, face)[0].shape[0] * k + 10 for l in lines)
        if max(ws) <= w and hs <= h: return k
    return 1


def designer(K, c):
    """One card from its config c: real photo grounds, cut-outs behind, the hero and its callouts, cut-outs in front,
    the full numbered line-up, the hand-set logo with its kickers, price piece, capsule badge, the legal strip."""
    F = K.F; ink = INK; col = c['col']; fill = c['fill']
    sc = SCENE.get(K.sid)
    if sc: K.photo('oi:%s@test' % sc, (0, 0, W, 246), tint=c['col'], k=0.12, con=1.04)
    for g in ([] if sc else c['bg']): K.photo(g[0], g[1], tint=g[2], k=g[3], bright=g[4] if len(g) > 4 else 1.0, con=1.05, rep=g[5] if len(g) > 5 else 1)
    for cu in c.get('back', []): K.cut(*cu, 'back')
    hx, hfoot, hh, hw = c['hero']
    hid = c.get('hero_id', K.hero['id']); hb = K.toy(K.pose(hid, 2), hx, hfoot, hh, hw)
    for b in c.get('crest', []): crest(K, *b)
    for cu in c.get('front', []): K.cut(*cu, 'front')
    n = len(K.items); x0, x1, foot, lh = c.get('lineup', (8, W - 8, 238, 34)); cw = (x1 - x0) / n
    for i, it in enumerate(K.items):
        cx = x0 + cw * (i + .5); K.toy(K.pose(it['id'], 1), cx, foot, lh, cw - 4, sil=it['secret'], shadow=not it['secret'])
    for b in c.get('crest_low', []): crest(K, *b)
    for i, it in enumerate(K.items):
        cx = x0 + cw * (i + .5); F.rect(int(cx) - 7, foot - 1, 14, 9, ink)
        F.text('%02d' % (i + 1), cx, foot + 1, 'micro5', 1, c.get('numcol', YEL) if it['secret'] else WH, anchor='mt')
        if it['secret']: F.text('?', cx, foot - lh // 2 - 4, 'b5', 2, c.get('numcol', YEL), anchor='mt', outline=[(1, ink)])
    # logo
    lx, ly, lw, lhh = c['logo']; face = c['face']; lines = c['lines']
    k = fit_logo(lines, face, lw, lhh, c.get('big', True)); y = ly; bb = None; rn = sum(map(ord, K.sid))
    for j, l in enumerate(lines):
        ks = [k + (1 if (i == 0 and c.get('big', True)) else 0) for i in range(len(l))]
        bnc = [((rn * (i + 3) * 7) % 5 - 2) * max(1, k // 2) for i in range(len(l))]
        lyr = [(1, ink), (2, col), (1, ink)]
        ax = lx + (c.get('indent', 6) * j if c.get('align', 'l') == 'l' else 0)
        bb = logo7(F, l, ax, y, face, ks, fill, lyr, drop=(3, 3, ink), track=c.get('track', 0), bounce=bnc, space=c.get('space'))
        y = bb[3] - 3
    tx, ty = c.get('kick_at', (lx + 2, bb[3] + 4))
    if ty > ly: ty = max(ty, bb[3] + 4)  # a kicker under the logo never collides with it
    for j, l in enumerate(c['kick']): F.text(l, tx, ty + 9 * j, 'b5', 1, WH if j == 0 else fill, outline=[(1, ink)])
    if c.get('vol'): vx, vy = c['vol']; F.rect(vx, vy, 34, 11, ink); F.text('VOL.1', vx + 17, vy + 2, 'b5', 1, fill, anchor='mt')
    if c.get('burst'): bx, by, br, bl, bf = c['burst']; burst(F, bx, by, br, 10, bf, lines=bl, col=ink if lum(bf) > 0.5 else WH, face='micro5', rot=0.25)
    if c.get('flow'):  # right-hand logos: the price and the capsule flow under the kicker
        ky = ty + 9 * len(c['kick']) + 20; c['price_at'] = (tx + 31, ky); c['caps'] = (tx + 70, ky - 7)
    px, py = c['price_at']; price_piece(F, c.get('price', 'coin'), px, py, K.s['price'], c.get('pricecol', GOLD))
    cx_, cy_ = c['caps']; capsule(F, cx_, cy_, 66, 15, col, WH, '%d TYPES' % n)
    if hb:
        X0, Y0, X1, Y1 = hb; w_, h_ = X1 - X0, Y1 - Y0
        for t, tx_, ty_, fx, fy in c.get('calls', []):
            callout(F, t, tx_, ty_, X0 + w_ * fx, Y0 + h_ * fy, anchor='rm')
    fill_space(K, POOL.get(K.sid, []))
    sw = c.get('sw', [col, fill, 0x3a6ab0, 0x5a8a3a, 0xc87a3a, 0x2a2a30, 0x8a5a9a])
    K.legal(246, [(i + 1, it['name'].upper().replace('THE ', ''), sw[i % len(sw)]) for i, it in enumerate(K.items)], col, col)


def fill_space(K, pool, top=246, cell=8):
    """Dense dressing: real cut-outs from the series' pool dropped into the emptiest parts of the card (largest
    first: 3 sizes), behind the toys and type, a few in front at the edges, until no gap of ~15% is left."""
    if not pool: return
    def occ():
        o = np.zeros((top, W), bool)
        for L in (K.P, K.T, K.FC):
            a = np.asarray(L.im.getchannel('A').resize((W, H), Image.NEAREST))[:top] > 0; o |= a
        o |= np.asarray(K.F.im.getchannel('A'))[:top] > 0
        return o
    o = occ(); rn = __import__('random').Random(sum(map(ord, K.sid))); used = 0
    for size in (48, 38, 30):  # the scene fills the card now: a few pieces only
        n = size // cell; best = None
        ch, cw_ = top // cell, W // cell
        cells = o[:ch * cell, :cw_ * cell].reshape(ch, cell, cw_, cell).mean((1, 3)) < 0.06
        for gy in range(-1, ch - n + 2):
            for gx in range(-1, cw_ - n + 2):
                y0, x0 = max(gy, 0), max(gx, 0)
                win = cells[y0:gy + n, x0:gx + n]
                if win.size and win.all() and win.size >= (n - 1) * (n - 1):
                    sc = rn.random()
                    if best is None or sc > best[0]: best = (sc, gx, gy)
        if best is None: continue
        _, gx, gy = best; key = pool[used % len(pool)]; used += 1
        cx, cy = (gx + n / 2) * cell, (gy + n / 2) * cell
        edge = cx < 30 or cx > W - 30 or cy > top - 40
        K.cut(key, cx, cy, size, rn.choice([-24, -14, -6, 8, 16, 26]), 'front' if edge and size <= 42 else 'back')
        o = occ()


SCENE = {"ekiin": "5ae14ddecd96d964", "kaden": "01681d52ad599ab4", "sento": "7bf02f84d9e7e793", "obakebaito": "1c618757d7fbe472", "kabuki": "c53e9e5ce002345f", "minato": "b32ff2eda0976748", "sabaku": "3429ee539afa4b6b", "meijin": "6ba33481bde04590", "otenki": "5ad31e2a209ce02e", "kanikan": "d886a2ce6734eefe", "yomise": "fe304f3a84e56aa6", "henshin": "3da8d61c1402ad41", "janru": "d498ff3de2bb80da", "karakuri": "e1cd3f6c8713b840", "otsukai": "3e32e7bab925c99f", "datesha": "ee5961ef538e122c", "tsuppari": "4341168486bcf6f2", "hashigo": "68a9c1b45c6b1603", "nakanohito": "d4ddcc06cc2b1f9b", "kasabuki": "09c51578bda20b16", "teruteru": "d83ad91bc283b22c", "nedoko": "2fa42aee03a40a34", "dango": "343d79160871cf9e", "tabigame": "045a11743e13d784", "okuni": "2cb490f905c817c7", "kouchuu": "f75ebe13615cad9d"}  # series -> its full-card scene photo (Open Images, CC BY 2.0, CREDITS.md)


POOL = {  # series -> real cut-outs that belong in its scene (Open Images masks, credited)
    'kanikan': ['oyster_1', 'fish_1', 'lemon_0', 'starfish_0', 'fish_2', 'oyster_0', 'sea_turtle_1', 'lemon_2'],
    'nakanohito': ['skyscraper_1', 'skyscraper_1', 'skyscraper_2', 'skyscraper_0', 'skyscraper_2'],
    'kasabuki': ['flower_1', 'rose_1', 'sword_1', 'flower_0', 'rose_0', 'dagger_1'],
    'henshin': ['scissors_0', 'pen_0', 'ruler_0', 'adhesive_tape_1', 'pencil_case_0', 'scissors_2', 'pen_2'],
    'kaden': ['alarm_clock_0', 'teapot_0', 'kettle_0', 'kettle_2', 'alarm_clock_0', 'corded_phone_2'],
    'yomise': ['starfish_0', 'sea_turtle_1', 'oyster_1', 'starfish_2', 'sea_kelp', 'oyster_0', 'sea_turtle_0'],
    'hashigo': ['frog_0', 'mushroom_2', 'flower_1', 'frog_1', 'strawberry_0', 'mushroom_1'],
    'obakebaito': ['raven_0', 'bat_(animal)_0', 'candle_0', 'owl_1', 'pumpkin_1', 'raven_1', 'skull_0', 'bat_(animal)_1'],
    'sento': ['duck_0', 'milk_1', 'tap_2', 'duck_1', 'milk_2', 'tap_0'],
    'kabuki': ['flower_1', 'rose_1', 'sword_1', 'flower_0', 'rose_2', 'flower_2'],
    'karakuri': ['teapot_0', 'alarm_clock_0', 'teapot_2', 'kettle_0', 'teapot_0', 'teapot_2'],
    'janru': ['kite_2', 'dice_0', 'kite_2', 'dice_1', 'ball_1', 'dice_2'],
    'teruteru': ['frog_0', 'duck_0', 'mushroom_0', 'boot_0', 'frog_1', 'mushroom_2', 'duck_1'],
    'otenki': ['kite_2', 'common_sunflower_1', 'sun_hat_0', 'kite_1', 'common_sunflower_2', 'kite_1', 'sun_hat_2'],
    'ekiin': ['backpack_0', 'coffee_cup_0', 'suitcase_0', 'teapot_1', 'train_0', 'briefcase_0', 'backpack_1', 'coffee_cup_1'],
    'otsukai': ['candle_2', 'flower_1', 'rose_0', 'candle_0', 'flower_0', 'rose_2'],
    'tsuppari': ['guitar_1', 'motorcycle_0', 'rose_1', 'guitar_1', 'dice_2', 'motorcycle_2', 'rose_0'],
    'meijin': ['skateboard_0', 'football_1', 'roller_skates_0', 'dice_0', 'kite_0', 'roller_skates_1', 'football_1', 'roller_skates_1'],
    'sabaku': ['lizard_2', 'snake_0', 'skull_0', 'cowboy_hat_0', 'lizard_0', 'snake_2', 'skull_2', 'cowboy_hat_2'],
    'minato': ['harbor_seal_0', 'canoe_0', 'fish_0', 'lighthouse_2', 'harbor_seal_1', 'oyster_2', 'canoe_1', 'fish_1'],
    'datesha': ['wine_0', 'briefcase_1', 'fedora_0', 'rose_0', 'cocktail_0', 'tie_0', 'wine_1', 'fedora_1'],
    'nedoko': ['cucumber_0', 'lemon_1', 'pillow_0', 'alarm_clock_1', 'cucumber_2', 'radish_0', 'lemon_2', 'fish_1', 'cucumber_1'],
    'dango': ['strawberry_0', 'peach_1', 'flower_1', 'saucer_2', 'strawberry_2', 'teapot_1', 'peach_2', 'flower_0', 'strawberry_1'],
    'tabigame': ['sea_turtle_0', 'suitcase_0', 'sun_hat_0', 'clock_1', 'sea_turtle_2', 'backpack_1', 'train_2', 'lighthouse_0'],
    'okuni': ['kite_0', 'flower_0', 'sun_hat_0', 'rose_0', 'kite_1', 'football_1', 'flower_2', 'teddy_bear_1'],
    'kouchuu': ['guitar_1', 'tie_0', 'rose_0', 'corded_phone_0', 'mushroom_0', 'strawberry_1', 'flower_1', 'watch_1'],
}


R, Lf = 'right', 'left'
CFG = {
    'kanikan': dict(col=0xc8302a, fill=GOLD, face='jersey10', lines=['CRABS IN', 'FOOD CANS'], logo=(6, 6, 186, 76),
        bg=[('oi:0d76fa17adca869d@test', (0, 0, W, 246), 0x1d5f8a, 0.3)], back=[('fish_0', 26, 146, 50, -28), ('oyster_2', 300, 200, 40, 10)],
        hero=(226, 182, 116, 128), crest_low=[(0, W, 232, 246, 'front', 0x1d6a9a, 0.55)],
        front=[('lemon_1', 132, 182, 32, 18), ('lemon_2', 308, 190, 24, -12)],
        kick=['EVERY CRAB HAS FOUND', 'A TIN TO ITS TASTE.'], vol=(116, 8), burst=(200, 30, 21, ('NEW', 'CATCH!'), 0xc8302a),
        price_at=(294, 26), caps=(246, 54), calls=[('PULL-TAB LID OPENS', 146, 132, 0.42, 0.14), ('THE CRAB LIVES INSIDE', 146, 148, 0.36, 0.42)],
        sw=[0x3a6ab0, 0x6a8a9a, 0xb83a2a, 0xc87a3a, 0xe8c040, 0x2a2a30]),
    'nakanohito': dict(col=0xc8342c, fill=0xf4d640, face='jersey15', lines=["WHO'S IN", 'THE SUIT?'], logo=(6, 6, 170, 96),
        bg=[('local:cumulus.jpg', (0, 0, W, 168), 0xd8a060, 0.28), ('acg:Cardboard001', (0, 168, W, 78), 0x8a6a48, 0.25, 0.92)],
        back=[('skyscraper_0', 136, 132, 84, 0), ('skyscraper_2', 304, 128, 92, 0), ('skyscraper_1', 262, 150, 60, 0)],
        hero=(214, 204, 160, 140), front=[('camera_1', 26, 206, 56, 12), ('flashlight_2', 300, 200, 50, -30)],
        kick=['MONSTER SUIT FIGURE', 'MONSTERS ON SET!'], burst=(168, 30, 18, ('TAKE', '1!'), YEL), price='ticket', pricecol=0xf3ead6,
        price_at=(288, 22), caps=(248, 44), calls=[('AN ACTOR INSIDE!', 112, 146, 0.5, 0.14), ('ZIP UP THE BACK', 112, 162, 0.36, 0.42), ('RUBBER SUIT TAIL', 316, 180, 0.86, 0.8)]),
    'kasabuki': dict(col=0xc8342a, fill=0xe8c060, face='ala', lines=['UMBRELLA', 'ARMS'], logo=(8, 24, 196, 96), track=1,
        bg=[('local:rain_window.jpg', (0, 0, W, 200), 0x5a1a1c, 0.55, 0.9), ('acg:Wood049', (0, 200, W, 46), 0x6a3a24, 0.3, 0.85)],
        back=[('rose_2', 18, 176, 58, -15), ('sword_0', 250, 96, 150, 35), ('dagger_2', 286, 150, 80, -55)],
        hero=(214, 198, 118, 190), front=[('rose_0', 306, 196, 40, 20)], kick_at=(12, 6), kick=['RAIN OR SHINE,', 'ALWAYS ARMED.'],
        vol=(150, 104), burst=(48, 150, 24, ('OPENS', 'INTO A', 'BLADE!'), 0xe8c060), price='tsuba', pricecol=0xe8c060, price_at=(292, 30), caps=(248, 58),
        calls=[('CLOSED: AN UMBRELLA', 200, 118, 0.2, 0.4), ('FOLDS IN THREE', 316, 104, 0.62, 0.4), ('OPEN: A WEAPON', 316, 190, 0.84, 0.62)]),
    'henshin': dict(col=0x2f7a4a, fill=0xf2e6b8, face='jersey15', lines=['STATIONERY', 'BEASTS'], logo=(6, 6, 190, 90),
        bg=[('acg:Wood049', (0, 0, W, 246), 0x6a4a2a, 0.2)],
        back=[('ruler_1', 240, 40, 120, -20), ('pen_1', 300, 120, 90, 60), ('scissors_1', 190, 170, 60, -30)],
        hero=(244, 196, 130, 130), front=[('pen_2', 40, 196, 70, -15), ('adhesive_tape_1', 150, 186, 34, 0)],
        kick=['FROM DESK TOOL', 'TO BEAST!'], burst=(150, 110, 22, ('COMPLETE', 'TRANS-', 'FORM!'), 0xd2402e), price_at=(28, 152), pricecol=GOLD, caps=(56, 168),
        calls=[('STAPLER JAWS = MOUTH', 168, 120, 0.3, 0.3), ('LEGS FOLD AWAY', 168, 136, 0.35, 0.8)]),
    'kaden': dict(col=0x3f9a86, fill=0xf1ead6, face='ps2p', lines=['APPLIANCE', 'ANIMALS'], logo=(130, 6, 184, 70), align='r',
        bg=[('acg:Paper005', (0, 0, W, 170), 0xf0e2c0, 0.2), ('acg:Tatami001', (0, 170, W, 76), 0xa89a5a, 0.2)],
        back=[('kettle_2', 30, 150, 70, -10), ('corded_phone_2', 270, 150, 56, 15)], hero=(80, 200, 150, 140),
        front=[('kettle_0', 300, 206, 40, 10)], kick_at=(140, 64), kick=['SWITCH ON:', 'IT MOVES LIKE THE ANIMAL'],
        burst=(290, 104, 22, ('IT', 'MOVES!'), 0xd2483a), price='ticket', pricecol=0xf6e6a0, price_at=(186, 116), caps=(156, 140),
        calls=[('THE FAN TURNS', 300, 192, 0.6, 0.3)], flow=True),
    'yomise': dict(col=0x1d4a8a, fill=0xf2c230, face='jersey15', lines=['DEEP-SEA', 'NIGHT STALLS'], logo=(6, 6, 200, 92),
        bg=[('oi:0d76fa17adca869d@test', (0, 0, W, 246), 0x0c1840, 0.6, 0.65)],
        back=[('sea_kelp', 306, 100, 96, 0), ('sea_coral', 140, 190, 70, 0), ('sea_spray', 250, 40, 60, 0), ('fish_1', 190, 120, 40, 8)],
        hero=(250, 206, 140, 120), front=[('starfish_1', 20, 206, 36, 10), ('sea_coral', 316, 214, 44, 0)],
        kick=['EVERY STALL BRINGS', 'ITS OWN LIGHT.'], burst=(150, 112, 20, ('LIGHTS', 'UP!'), 0xe0503a), price_at=(30, 150), caps=(60, 166),
        calls=[('LANTERN GLOWS', 196, 150, 0.4, 0.2), ('A STALL ON ITS BACK', 196, 166, 0.4, 0.6)], numcol=0xf2c230),
    'hashigo': dict(col=0x2c3c6a, fill=0xf2e6c8, face='jersey15', lines=['LADDER', 'FROGS'], logo=(150, 6, 164, 90), align='r',
        bg=[('local:cumulus.jpg', (0, 0, W, 190), 0x8ab0d8, 0.15), ('acg:Planks012', (0, 190, W, 56), 0x8a6a40, 0.2)],
        back=[('mushroom_0', 300, 196, 40, 0)], hero=(80, 210, 170, 120),
        front=[('frog_2', 160, 210, 44, -10)], kick_at=(156, 100), kick=['STACK THE LADDER,', 'UP THEY GO!'],
        burst=(286, 140, 22, ('PLAY', 'SET!'), 0xc8342c), price='ticket', pricecol=0xf2e6c8, price_at=(206, 150), caps=(180, 172),
        calls=[('HANDS ON THE RUNG', 300, 192, 0.6, 0.35)], flow=True),
    'obakebaito': dict(col=0x8e2f4a, fill=0xe8e0c8, face='jersey15', lines=['HAUNTED HOUSE', 'PART-TIMERS'], logo=(6, 6, 220, 84),
        bg=[('acg:Wood051', (0, 0, W, 246), 0x2a1a24, 0.45, 0.8)],
        back=[('pumpkin_0', 30, 170, 64, -8), ('candle_2', 286, 100, 50, 0), ('pumpkin_2', 300, 196, 50, 10)],
        hero=(210, 204, 140, 120), front=[('candle_1', 110, 206, 36, 0)], kick=['SCARY FROM THE FRONT.', 'TIRED FROM THE BACK.'],
        burst=(262, 40, 22, ('PLAY', 'SET!'), 0xd8c27a), price='tsuba', pricecol=0xd8c27a, price_at=(40, 152), caps=(70, 170),
        calls=[('TURN IT: BREAK TIME', 316, 192, 0.6, 0.6)], numcol=0xd8c27a),
    'sento': dict(col=0x2a5aa8, fill=0xf2f2ea, face='jersey15', lines=['BATHHOUSE', 'REGULARS'], logo=(6, 6, 190, 86),
        bg=[('acg:Tiles032', (0, 0, W, 246), 0x3a8a6a, 0.15, 1.0, 3)],
        back=[('duck_2', 40, 186, 40, 0)], hero=(236, 196, 140, 120),
        front=[('milk_0', 130, 180, 40, 0), ('tap_1', 304, 30, 40, 0)],
        kick=['EVERYONE HAS THEIR OWN', 'WAY TO TAKE A BATH.'], burst=(170, 120, 22, ('BATH', 'TIME!'), 0xc8303a), price_at=(30, 150), caps=(56, 168),
        calls=[('BUBBLES ON HEAD', 180, 100, 0.5, 0.12)]),
    'kabuki': dict(col=0xc8303a, fill=0xf2e6cf, face='ala', lines=['YOKAI', 'KABUKI'], logo=(6, 18, 160, 100),
        bg=[('acg:Planks012', (0, 0, W, 246), 0x2a2a2e, 0.5, 0.7), ('acg:Tatami001', (0, 196, W, 50), 0xb8a060, 0.2)],
        back=[('flower_0', 140, 60, 60, 0), ('rose_2', 300, 60, 56, 15), ('flower_2', 20, 180, 50, -10)], hero=(228, 200, 168, 140),
        front=[('rose_0', 300, 200, 40, 10)], kick_at=(10, 4), kick=['THE YOKAI TAKE THE STAGE:', 'HOLD THE POSE!'],
        burst=(150, 36, 20, ('MIE!',), 0xf2c230), price='tsuba', pricecol=0xf2c230, price_at=(40, 150), caps=(70, 168),
        calls=[('KUMADORI MAKE-UP', 156, 150, 0.4, 0.15), ('BIG MIE POSE', 156, 166, 0.25, 0.4)]),
    'karakuri': dict(col=0x7a4a20, fill=0xe8c070, face='ala', lines=['EDO WIND-UP', 'AUTOMATA'], logo=(6, 8, 200, 90),
        bg=[('acg:Wood049', (0, 0, W, 246), 0x5a3a20, 0.25)],
        back=[('teapot_1', 290, 60, 70, 10), ('alarm_clock_0', 30, 180, 50, -10)], hero=(220, 204, 150, 130),
        front=[('teapot_1', 120, 206, 44, 0), ('teapot_2', 306, 210, 36, 20)], kick=['WIND THE KEY.', 'WATCH THE TRICK.'],
        burst=(150, 120, 22, ('WIND', 'IT UP!'), 0xc79a48), price='coin', pricecol=0xc79a48, price_at=(30, 150), caps=(56, 168),
        calls=[('TURN THE KEY', 200, 110, 0.7, 0.4)]),
    'janru': dict(col=0xd8344e, fill=0xf2ead8, face='ps2p', lines=['ANIME', 'GENRE CLUB'], logo=(6, 6, 190, 84),
        bg=[('local:galaxy.jpg', (0, 0, W, 246), 0x2c3c6a, 0.3, 0.9)],
        back=[('kite_0', 290, 70, 90, 30), ('dice_1', 40, 180, 40, -15)], hero=(220, 200, 150, 130),
        front=[('kite_1', 130, 196, 44, -20)], kick=['EVERY GENRE GETS', 'ITS BIG MOMENT.'],
        burst=(160, 120, 22, ('BIG', 'MOMENT!'), 0xf2c230), price='ticket', pricecol=0xf2ead8, price_at=(36, 140), caps=(60, 160),
        calls=[('HERO POSE', 196, 96, 0.4, 0.2)]),
    'teruteru': dict(col=0x34536e, fill=0xf2f2ea, face='jersey15', lines=['UPSIDE-DOWN', 'RAIN CHARMS'], logo=(120, 6, 194, 80), align='r',
        bg=[('local:rain_window.jpg', (0, 0, W, 246), 0x6a8aa0, 0.35)],
        back=[('boot_0', 290, 190, 54, 0), ('frog_2', 210, 160, 40, 0)], hero=(80, 206, 160, 130),
        front=[('mushroom_1', 160, 210, 34, 0)], kick_at=(128, 86), kick=['HANG IT UPSIDE DOWN', 'AND IT RAINS.'],
        burst=(290, 130, 22, ('FLIP', 'IT!'), 0xc0463a), price='coin', price_at=(170, 140), caps=(196, 156),
        calls=[('SUNNY SIDE UP', 300, 192, 0.6, 0.3)], flow=True),
    'otenki': dict(col=0x2a5ab0, fill=0xf2c230, face='jersey15', lines=['WEATHER', 'EXPRESS'], logo=(6, 6, 180, 86),
        bg=[('local:cumulus.jpg', (0, 0, W, 196), 0x8ab0e0, 0.15), ('acg:Grass004', (0, 196, W, 50), 0x5a8a3a, 0.15)],
        back=[('kite_0', 280, 50, 70, 20), ('common_sunflower_0', 30, 180, 56, 0)], hero=(220, 206, 150, 130),
        front=[('sun_hat_1', 130, 206, 40, -10)], kick=["TODAY'S WEATHER,", 'DELIVERED TO YOUR DOOR.'],
        burst=(160, 120, 22, ('ON ITS', 'WAY!'), 0xf2c230), price='ticket', pricecol=0xe6eef4, price_at=(40, 152), caps=(80, 168),
        calls=[('WEATHER IN THE BAG', 196, 100, 0.4, 0.4)]),
    'ekiin': dict(col=0x2c3a5c, fill=0xe8e2cc, face='jersey15', lines=['PLATFORM', 'STAFF'], logo=(146, 6, 168, 90), align='r',
        bg=[('acg:Concrete034', (0, 0, W, 246), 0x8a8a90, 0.2), ('acg:PavingStones070', (0, 200, W, 46), 0xb8a060, 0.3)],
        back=[('train_1', 250, 140, 120, 0), ('suitcase_2', 30, 190, 44, 0)], hero=(80, 204, 160, 130),
        front=[('teapot_2', 160, 210, 34, 0)], kick_at=(150, 92), kick=['EVERY JOB DONE BY THE', 'ANIMAL BORN FOR IT.'],
        burst=(290, 186, 20, ('ON', 'TIME!'), 0xc8303a), price='ticket', pricecol=0xe8e2cc, price_at=(200, 156), caps=(244, 150),
        calls=[('CAP AND WHISTLE', 300, 192, 0.6, 0.12)], flow=True),
    'otsukai': dict(col=0xb8322a, fill=0xc99a3a, face='ala', lines=["THE GODS'", 'MESSENGERS'], logo=(6, 8, 200, 90),
        bg=[('local:sakura.jpg', (0, 0, W, 190), 0xd8b8b0, 0.2), ('acg:Gravel022', (0, 190, W, 56), 0x9a9088, 0.2)],
        back=[('candle_1', 290, 120, 50, 0), ('rose_1', 30, 186, 44, 0)], hero=(220, 204, 150, 130),
        front=[('flower_2', 140, 206, 36, 0)], kick=['SENT BY THE SHRINE,', 'ON OFFICIAL BUSINESS.'],
        burst=(160, 120, 22, ('GOLD', 'LEAF!'), 0xc99a3a), price='tsuba', pricecol=0xc99a3a, price_at=(36, 150), caps=(64, 168),
        calls=[('LACQUER & GOLD LEAF', 196, 104, 0.4, 0.3)]),
    'tsuppari': dict(col=0xc8302a, fill=0xf2f2ea, face='jersey15', lines=['TSUPPARI', 'ZOO'], logo=(150, 6, 164, 96), align='r',
        bg=[('acg:Concrete034', (0, 0, W, 200), 0x3a3640, 0.4, 0.8), ('acg:Asphalt025A', (0, 200, W, 46), 0x2a2a30, 0.2)],
        back=[('motorcycle_1', 260, 170, 100, 0), ('rose_2', 30, 60, 50, -20)], hero=(84, 206, 170, 130),
        front=[('rose_0', 170, 208, 34, 10)], kick_at=(156, 108), kick=['TOUGH GUYS.', 'SOFT HEARTS.'],
        burst=(290, 120, 20, ('YEAH?!',), 0xf2c230), price='coin', pricecol=0xf2c230, price_at=(200, 140), caps=(230, 160),
        calls=[('LONG COAT', 300, 192, 0.6, 0.5)], flow=True),
    'meijin': dict(col=0xc8303a, fill=0xf2e6c4, face='ps2p', lines=['PLAYGROUND', 'CHAMPIONS'], logo=(6, 6, 200, 70),
        bg=[('local:cumulus.jpg', (0, 0, W, 170), 0x9ab8d8, 0.15), ('acg:Ground054', (0, 170, W, 76), 0xa88a60, 0.2)],
        back=[('kite_2', 280, 60, 70, 15), ('ball_0', 30, 190, 40, 0)], hero=(220, 204, 150, 130),
        front=[('dice_1', 140, 208, 32, -15)], kick=['CHAMPIONS OF THE', 'BACK LANE.'],
        burst=(170, 110, 22, ('NO.1!',), 0xf2c230), price='coin', price_at=(30, 140), caps=(58, 158),
        calls=[('SPINS FOR REAL', 196, 120, 0.4, 0.6)]),
    'sabaku': dict(col=0x3a2f5a, fill=0xe8c060, face='ala', lines=['DESERT ROAD'], logo=(6, 20, 200, 60),
        bg=[('file:' + os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'shots', '.art-cache', 'commons', 'Sand_dunes_in_the_desert,_Sahara_Desert,_Dakhla_Oasis,_Egypt.jpg'), (0, 0, W, 246), 0xd8a860, 0.2)],
        back=[('skull_1', 290, 190, 60, 0), ('cowboy_hat_1', 120, 170, 50, -10)], hero=(220, 200, 160, 130),
        front=[('snake_1', 40, 210, 60, 0)], kick_at=(10, 4), kick=['POSE BEASTS I', 'EACH TRAVELLER HAS A SPIRIT.'],
        burst=(150, 100, 20, ('POSE!',), 0xc8a040), price='coin', pricecol=0xc8a040, price_at=(30, 128), caps=(56, 146),
        calls=[('HOLD THE POSE', 196, 116, 0.4, 0.3)]),
    'minato': dict(col=0x2f4a6a, fill=0xf2f2ea, face='ala', lines=['HARBOUR TOWN'], logo=(6, 20, 200, 60),
        bg=[('local:cumulus.jpg', (0, 0, W, 150), 0x9ab8d8, 0.15), ('oi:0d76fa17adca869d@test', (0, 150, W, 96), 0x2a6a90, 0.25)],
        back=[('lighthouse_0', 296, 110, 100, 0)], hero=(220, 196, 150, 120),
        front=[('fish_2', 140, 186, 36, -35)], kick_at=(10, 4), kick=['POSE BEASTS II', 'NOTHING ODD HERE AT ALL.'],
        burst=(160, 100, 20, ('POSE!',), 0xc8343a), price='ticket', pricecol=0xdfe6e4, price_at=(40, 128), caps=(70, 146),
        calls=[('QUIET NEIGHBOUR?', 196, 120, 0.4, 0.4)]),
    'datesha': dict(col=0xc89a30, fill=0xf2f2ea, face='ala', lines=['DANDY GANG'], logo=(6, 20, 200, 60),
        bg=[('file:' + os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'shots', '.art-cache', 'commons', 'Black_and_white_marble_tile_in_the_southeast_gallery_(5396530982).jpg'), (0, 0, W, 246), 0x2a2a30, 0.25, 0.85)],
        back=[('fedora_2', 286, 60, 60, 10), ('rose_2', 30, 180, 50, -10)], hero=(220, 200, 160, 130),
        front=[('tie_1', 140, 206, 40, 20), ('cocktail_2', 304, 200, 40, 0)], kick_at=(10, 4), kick=['POSE BEASTS III', 'STRIKE THE POSE. HOLD IT.'],
        burst=(160, 100, 20, ('POSE!',), 0xc89a30), price='tsuba', pricecol=0xc89a30, price_at=(36, 128), caps=(64, 146),
        calls=[('SHARP SUIT', 196, 120, 0.4, 0.4)]),
    'nedoko': dict(col=0xc8302a, fill=0xf6eedc, face='jersey15', lines=['SUSHI', 'BEDTIME'], logo=(6, 6, 150, 74), hero_id='maguro',
        bg=[], back=[('pillow_0', 292, 92, 58, 12), ('cucumber_1', 150, 176, 34, 0)], hero=(232, 204, 132, 150),
        front=[('lemon_1', 124, 204, 32, -14), ('alarm_clock_1', 304, 196, 40, 14)],
        kick=['THE RICE IS THE FUTON.', 'THE TOPPING IS THE DUVET.'], burst=(190, 30, 21, ('WAKE', 'UP!'), 0xf2c230),
        price='ticket', pricecol=0xf6eedc, price_at=(38, 158), caps=(74, 180),
        calls=[('THE DUVET FLIPS BACK', 160, 128, 0.4, 0.3), ('PLATE COLOUR = RARITY', 160, 144, 0.25, 0.9)],
        sw=[0x2a5a9a, 0x3f8a4a, 0xc8302a, 0xe8b030, 0x26242a, 0xd8a840]),
    'dango': dict(col=0x3f8a3a, fill=0xf8e6ea, face='jersey15', lines=['DANGO', 'SKEWER PALS'], logo=(6, 6, 156, 74), space=7, hero_id='hanami',
        bg=[], back=[('flower_1', 300, 40, 44, 0), ('peach_1', 156, 186, 38, -10)], hero=(238, 204, 168, 110),
        front=[('strawberry_0', 304, 210, 28, 12)],
        kick=['THREE BALLS, ONE ANIMAL.', 'SPIN THEM ROUND!'], burst=(186, 28, 21, ('IT', 'SPINS!'), 0xe07a8e),
        price='coin', price_at=(34, 156), caps=(70, 176),
        calls=[('EACH BALL SPINS', 176, 126, 0.45, 0.5), ('THE HEAD HOPS OFF', 176, 142, 0.4, 0.15)],
        sw=[0xe07a8e, 0xa86224, 0x5e8c3c, 0x1e2a24, 0xd6ac68, 0xf6f3ea]),
    'tabigame': dict(col=0x2a7a5a, fill=0xf2d040, face='jersey15', lines=['WORLD TOUR', 'TURTLES'], logo=(6, 6, 186, 92), hero_id='pagoda',
        bg=[], back=[('sea_turtle_1', 290, 68, 56, -12), ('suitcase_2', 34, 190, 46, -8)], hero=(234, 208, 132, 156),
        front=[('sun_hat_1', 130, 208, 34, 10), ('lighthouse_2', 306, 196, 40, 6)],
        kick=['SLOW TRAVELLERS.', 'THEY BRING THE SIGHTS.'], burst=(172, 58, 21, ('LIFT', 'IT!'), 0xf2d040),
        price='ticket', pricecol=0xf2ead6, price_at=(38, 150), caps=(70, 168),
        calls=[('THE SHELL LIFTS OFF', 232, 136, 0.45, 0.3)],
        sw=[0xc8402a, 0xefe9dc, 0xd6be86, 0xd4b07a, 0x3a8a4a, 0x2a64a8]),
    'okuni': dict(col=0x2a5aa8, fill=0xf6eedc, face='jersey15', lines=['NATIONAL', 'ANIMAL PARADE'], logo=(124, 6, 192, 92), align='r', hero_id='kangaru',
        bg=[], back=[('kite_1', 34, 60, 50, 20), ('balloon_2', 300, 150, 40, 0)], hero=(84, 208, 150, 130),
        front=[('cowboy_hat_0', 158, 214, 34, -8), ('football_1', 302, 214, 28, 0)], kick_at=(150, 92),
        kick=['EVERY COUNTRY SENDS', 'ITS BEST. IN COSTUME.'], burst=(292, 150, 21, ('IN', 'COSTUME!'), 0xe8443a),
        price='coin', price_at=(190, 150), caps=(232, 140), flow=True,
        calls=[],
        sw=[0xb4643a, 0xc8302e, 0x26345e, 0x26242a, 0xc0302a, 0xa88ad0]),
    'kouchuu': dict(col=0xd8342e, fill=0xf2c230, face='ala', lines=['THE', 'HARDWINGS'], logo=(6, 6, 190, 92), hero_id='kuwagata',
        bg=[], back=[('guitar_2', 294, 84, 54, 14), ('rose_1', 32, 192, 40, 0)], hero=(232, 208, 132, 152),
        front=[('tie_1', 128, 208, 36, 20), ('watch_0', 304, 202, 32, 0)],
        kick=['MOP-TOP BEETLE BEAT GROUP.', 'FOUR BEETLES, SIX LEGS EACH.'], burst=(150, 30, 21, ('SHAKE', 'IT!'), 0xf2c230),
        price='ticket', pricecol=0xefe8d6, price_at=(38, 150), caps=(70, 168),
        calls=[('MOP-TOPS SHAKE', 232, 136, 0.45, 0.2)],
        sw=[0x8a8c92, 0x2a2a30, 0xc8302a, 0x6a7a8c, 0x3a5a8a, 0x2a8a5a]),
}
CARDS = {sid: (lambda K, c=c: designer(K, c)) for sid, c in CFG.items()}


def card7(s, ctx):
    K = Card7(s, ctx)
    CARDS[s['id']](K)
    im = upscale(K.B.im, 2)
    out = K.G.im.convert('RGBA'); out.alpha_composite(im); out.alpha_composite(K.P.im); out.alpha_composite(upscale(K.M.im, 2))
    out.alpha_composite(K.T.im); out.alpha_composite(K.FC.im); out.alpha_composite(upscale(K.F.im, 2))
    return PK.age(out.convert('RGB'), paper='Paper001', grain_k=0.14, fade=0.0, seed=sum(map(ord, s['id']))).convert('RGB')
