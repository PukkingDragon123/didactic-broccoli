"""card6.py: gacha display cards CLONED from the owner's reference cards (tools/cardref/<ref>.json, measured from
shots/clone/ref_<ref>.png by tools/cardref/measure.py). Every box, colour, badge and background follows the spec;
only our toy renders, our English series lettering (pixel fonts, hand-set: integer x / y scales, pixel shear, hard
outlines and offset shadows, never a glow or gradient), English small print and original maker names change.
  python3 -I tools/bake-cards.py --ref crabcan henshin   (tools/bake-cards.py calls card6(series, ref))
Grid: the reference card's own pixel size (368 wide), printed 2x; the toy renders paste at the full 2x resolution."""
import os, json, math, random
import numpy as np
from PIL import Image
from printkit import ROOT
from pixprint import Sheet, line_mask, _dilate, upscale
from lettering import emblem

REF = os.path.join(ROOT, 'tools', 'cardref')
GW = 368
WH = 0xffffff; INK = 0x241f1d


def C(v): return int(v.lstrip('#'), 16) if isinstance(v, str) else v


def spec(ref):
    sp = json.load(open(os.path.join(REF, ref + '.json')))
    gh = int(round(GW * sp['aspect']))
    def bx(k):
        x0, y0, x1, y1 = sp['box'][k]
        return int(round(x0 * GW)), int(round(y0 * gh)), int(round((x1 - x0) * GW)), int(round((y1 - y0) * gh))
    col = lambda k, i=0: C(sp['colours'][k][i])
    return sp, gh, bx, col


def letters(S, text, face, box, fill, outline=(), shadow=None, bold=1, track=0, shear=0.0, maxk=(6, 6), ratio=2.5,
            anchor='l', bounce=None):
    """A hand-set logotype line fitted into box (x, y, w, h): the pixel font's mask at integer x / y scales, sheared
    row by row (pixel italics), then hard outlines (r, col) innermost first and a hard offset shadow (dx, dy, col).
    fill: one colour, or a list cycled per letter. Returns the ink box."""
    x, y, w, h = box
    m, _, _, spans = line_mask(text, face, track, bold, bounce)
    pad = sum(o[0] for o in outline)
    sx = max(1, min(maxk[0], int((w - 2 * pad) // (m.shape[1] * (1 + shear * m.shape[0] / max(m.shape[1], 1))))))
    sy = max(1, min(maxk[1], int((h - 2 * pad) // m.shape[0]), int(sx * ratio)))
    M = np.repeat(np.repeat(m, sy, 0), sx, 1)
    lab = np.zeros(M.shape, np.int16)
    for i, (a, b) in enumerate(spans): lab[:, a * sx:b * sx] = i
    if shear:
        Hh = M.shape[0]; ext = int(math.ceil(shear * Hh))
        M2 = np.zeros((Hh, M.shape[1] + ext), bool); L2 = np.zeros(M2.shape, np.int16)
        for r in range(Hh):
            d = int(shear * (Hh - 1 - r)); M2[r, d:d + M.shape[1]] = M[r]; L2[r, d:d + M.shape[1]] = lab[r]
        M, lab = M2, L2
    layers = []; sil = M
    for o in outline:
        sil = _dilate(sil, o[0], 'disc'); layers.append((sil, o[1]))
    P = sil.shape[0] - M.shape[0]  # total outline pad (2 * sum r)
    X = x + {'l': 0, 'm': (w - sil.shape[1]) // 2, 'r': w - sil.shape[1]}[anchor]
    Y = y + (h - sil.shape[0]) // 2
    if shadow:
        S._stamp(sil, X + shadow[0], Y + shadow[1], shadow[2])
    for s_, c in reversed(layers):
        S._stamp(s_, X + (sil.shape[1] - s_.shape[1]) // 2, Y + (sil.shape[0] - s_.shape[0]) // 2, c)
    fills = fill if isinstance(fill, list) else [fill]
    for i in range(len(spans)):
        S._stamp(M & (lab == i), X + P // 2, Y + P // 2, fills[i % len(fills)])
    return (X, Y, X + sil.shape[1], Y + sil.shape[0])


def leaf(S, cx, cy, L, ang, cols, rn, monstera=True):
    """A pixel-art tropical leaf (flat ink shapes, 3 greens, a midrib and monstera slits)."""
    dark, mid, light = cols
    ca, sa = math.cos(ang), math.sin(ang)
    P = lambda u, v: (cx + u * ca - v * sa, cy + u * sa + v * ca)
    Wd = L * 0.42
    outline = [P(L * t, Wd * math.sin(math.pi * t) ** 0.8) for t in np.linspace(0, 1, 18)] + \
              [P(L * t, -Wd * math.sin(math.pi * t) ** 0.8) for t in np.linspace(1, 0, 18)]
    S.poly(outline, dark)
    S.poly([P(L * t, Wd * 0.86 * math.sin(math.pi * t) ** 0.8) for t in np.linspace(0.04, 0.97, 16)] + [P(L * 0.97, 0), P(L * 0.04, 0)], mid)
    S.poly([P(L * t, -Wd * 0.86 * math.sin(math.pi * t) ** 0.8) for t in np.linspace(0.04, 0.97, 16)] + [P(L * 0.97, 0), P(L * 0.04, 0)], light)
    if monstera:
        for k in range(5):
            t = 0.18 + 0.15 * k
            for sgn in (1, -1):
                e = Wd * math.sin(math.pi * t) ** 0.8
                S.line([P(L * t, sgn * e * 0.35), P(L * (t + 0.07), sgn * e * 1.05)], 0xf8f2e1 if rn.random() < 0.5 else dark, 2)
    S.line([P(0, 0), P(L * 0.95, 0)], light, 1)
    for k in range(6):
        t = 0.12 + 0.14 * k
        for sgn in (1, -1):
            S.line([P(L * t, 0), P(L * (t + 0.08), sgn * Wd * 0.55 * math.sin(math.pi * t))], dark, 1)


def heroes(s):
    items = s['items']
    reg = [i for i in items if not i['secret']]
    rank = {'rare': 3, 'uncommon': 2, 'common': 1}
    hero = max(reg, key=lambda i: rank.get(i['rarity'], 0))
    return items, reg, hero


def _pose(sid, iid, n):
    p = os.path.join(ROOT, 'shots', '.art-cache', 'toys', sid, 'pose', '%s_%d.png' % (iid, n))
    return 'pose/%s_%d' % (iid, n) if os.path.exists(p) else iid


def maker_square(S, x, y, w, h, fill, letter, ink=WH):
    S.rrect(x, y, w, h, fill, r=3)
    letters(S, letter, 'ps2p', (x + 2, y + 2, w - 4, h - 12), ink, bold=1, anchor='m', maxk=(3, 3), ratio=1)
    S.text('GG TOYS', x + w // 2, y + h - 8, 'micro5', 1, ink, anchor='mt')


def small_print(S, x, y, w, maxy, col=INK, n=6):
    S.para('SMALL PARTS. NOT FOR CHILDREN UNDER 3 YEARS. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER YOUR HEAD. '
           'THE PICTURE MAY DIFFER FROM THE PRODUCT. KEEP AWAY FROM FIRE.', x, y, w, 'micro5', 1, col, lh=6, maxy=maxy)


# ==================================================================================== crab can (red can, white label)
def t_crabcan(s, MAKER):
    sp, H, bx, col = spec('crabcan')
    sid = s['id']; items, reg, hero = heroes(s)
    red = col('bg'); logo_red = col('label_logo', 1); ring = col('lid_ring'); grey = col('footer', 1)
    hero = next((i for i in reg if i['id'] == 'wani'), hero)
    B = Sheet(GW, H, red)
    # the can lid at the top: white ellipse with two pressed rings
    x, y, w, h = bx('lid'); B.ellipse(x, y - 8, w, h + 8, WH, line=ring, t=2); B.ellipse(x + 18, y - 2, w - 36, h - 6, WH, line=ring, t=2)
    B.rect(x + w // 2 - 22, y + 4, 44, 6, WH); B.rrect(x + w // 2 - 20, y + 3, 40, 7, WH, r=3, line=ring)
    # price roundel
    x, y, w, h = bx('price'); B.ellipse(x, y, w, h, WH, line=ring, t=1)
    letters(B, '%d' % s['price'], 'ps2p', (x + 5, y + 7, w - 18, 18), red, bold=1, maxk=(2, 3), anchor='m')
    B.text('YEN', x + w - 6, y + 14, 'micro5', 1, red, anchor='rt')
    B.text('%d TYPES' % len(items), x + w // 2, y + h - 12, 'micro5', 1, red, anchor='mt')
    # maker square
    x, y, w, h = bx('maker'); B.rrect(x, y, w, h, WH, r=2); letters(B, MAKER[2], 'ps2p', (x + 3, y + 3, w - 6, h - 6), red, bold=1, anchor='m', maxk=(3, 3), ratio=1)
    # the label: a wide white band with rounded ends
    x, y, w, h = bx('label'); B.rrect(x, y, w, h, WH, r=h // 2)
    x, y, w, h = bx('catch'); letters(B, 'CAPSULE DESK MECHA  VOL.1', 'b5', (x - 10, y, w + 20, h), logo_red, bold=0, maxk=(1, 1), anchor='m')
    x, y, w, h = bx('logo'); letters(B, s['name'].upper(), 'jersey20', (x - 8, y - 2, w + 16, h + 4), logo_red, bold=2, track=-1, shear=0.3, maxk=(2, 3), anchor='m')
    # release-date tag (white frame, white type on the red)
    x, y, w, h = bx('date'); B.frame(x, y, w, h, WH, 1)
    B.text('NOV', x + w // 2, y + 5, 'b5', 1, WH, anchor='mt'); B.text('2026', x + w // 2, y + 15, 'b5', 1, WH, anchor='mt'); B.text('ON SALE', x + w // 2, y + h - 9, 'micro5', 1, WH, anchor='mt')
    # dimension line
    x, y, w, h = bx('dim'); B.rect(x + 3, y, 2, h, WH); B.rect(x, y, 8, 2, WH); B.rect(x, y + h - 2, 8, 2, WH)
    B.text('52', x + 8, y + h // 2 - 8, 'b5', 1, WH); B.text('MM', x + 8, y + h // 2 + 2, 'micro5', 1, WH)
    # the arrow: object -> transformed (white with a red hairline, like the reference's bent arrow)
    x, y, w, h = bx('arrow'); B.arrow([(x + 6, y + h), (x + 6, y + 6), (x + w + 4, y + 6)], WH, t=5, head=8)
    # big catch + hero name
    x, y, w, h = bx('catch2'); B.text('FROM STAPLER TO CROC!', x, y + 1, 'micro5', 1, WH)
    F = Sheet(GW, H, None)
    x, y, w, h = bx('big'); letters(F, 'TRANSFORMS!', 'jersey15', (x, y - 2, w + 12, h + 4), WH, bold=2, shear=0.0, maxk=(2, 2))
    x, y, w, h = bx('heroname'); F.text(hero['name'].upper(), x + w // 2, y + 2, 'b5', 1, WH, anchor='mt', outline=[(1, red)])
    # the line-up can: lid ellipse + white body
    x, y, w, h = bx('lineup'); B.rrect(x, y, w, h, WH, r=10)
    x, y, w, h = bx('lineup_lid'); B.ellipse(x, y, w, h, WH, line=ring, t=2); B.ellipse(x + 14, y + 4, w - 28, h - 8, WH, line=ring, t=1)
    x, y, w, h = bx('lineup_head'); B.text('LINE-UP', x + w // 2, y + 2, 'b5', 1, logo_red, anchor='mt')
    lx, ly, lw, lh = bx('lineup'); rest = [i for i in items if i is not hero]; cw = lw / len(rest)
    for k, it in enumerate(rest):
        B.text('SECRET' if it['secret'] else it['name'].split(' ')[-1].upper(), lx + cw * (k + .5), ly + lh - 9, 'micro5', 1, INK, anchor='mt')
    # sticker sheet box
    x, y, w, h = bx('sticker'); B.rrect(x, y, w, h, WH, r=4)
    B.text('STICKER', x + w // 2, y + 5, 'b5', 1, logo_red, anchor='mt'); B.text('INCLUDED!', x + w // 2, y + 14, 'b5', 1, logo_red, anchor='mt')
    B.rrect(x + 10, y + 26, w - 20, 16, logo_red, r=3); letters(B, MAKER[2] + '-' + MAKER[2], 'ps2p', (x + 12, y + 28, w - 24, 12), WH, bold=1, anchor='m', maxk=(1, 1))
    for j, t in enumerate(['* 2 SIZES', '* 6 DESIGNS', '* WATERPROOF']): B.text(t, x + 8, y + 47 + 7 * j, 'micro5', 1, INK)
    B.rrect(x + 8, y + h - 18, 14, 14, red, r=2); B.poly([(x + 15, y + h - 15), (x + 19, y + h - 7), (x + 11, y + h - 7)], WH)
    B.rrect(x + w - 24, y + h - 18, 14, 14, WH, r=2, line=INK)
    # slogan + footer
    x, y, w, h = bx('slogan'); letters(B, 'THE PENCIL CASE HAS GONE WILD! CAPSULE TOY AT LAST!', 'b5', (x, y, w, h), WH, bold=1, maxk=(1, 2), ratio=2, anchor='m')
    x, y, w, h = bx('footer'); B.rect(x, y, w, h, WH)
    for j in range(3): B.text(['* PICTURES ARE FOR ILLUSTRATION. COLOURS MAY VARY.', '* SMALL PARTS: NOT FOR CHILDREN UNDER 3.', '* KEEP THE CAPSULE AWAY FROM FIRE.'][j], x + 6, y + 3 + 6 * j, 'micro5', 1, grey)
    x, y, w, h = bx('footer_maker'); letters(B, MAKER[0], 'b5', (x - 14, y, w + 14, h), logo_red, bold=1, maxk=(1, 1), anchor='r')
    im = upscale(B.im, 2).convert('RGBA')
    T = Sheet(2 * GW, 2 * H, None)
    x, y, w, h = bx('obj'); T.toy(sid, _pose(sid, hero['id'], 0), 2 * (x + w / 2), 2 * (y + h), h=2 * h, w=2 * w)
    x, y, w, h = bx('hero'); T.toy(sid, _pose(sid, hero['id'], 2), 2 * (x + w / 2), 2 * (y + h), h=2 * h, w=2 * w)
    for k, it in enumerate(rest):
        T.toy(sid, _pose(sid, it['id'], 2), 2 * (lx + cw * (k + .5)), 2 * (ly + lh - 11), h=2 * (lh - 26), w=2 * (cw - 3),
              silhouette=INK if it['secret'] else None)
    im.alpha_composite(T.im); im.alpha_composite(upscale(F.im, 2))
    return im


# ================================================================ pipe otter (pale stripes, playset hero, rainbow logo)
def t_pipeotter(s, MAKER):
    sp, H, bx, col = spec('pipeotter')
    sid = s['id']; items, reg, hero = heroes(s)
    O = {k: C(v) for k, v in sp['override'].items()}
    B = Sheet(GW, H, WH)
    x, y, w, h = bx('stripes')
    for k, yy in enumerate(range(y + 4, y + h, 18)):  # wavy pale-blue bands (pixel-stepped)
        for xx in range(0, GW, 4):
            B.rect(xx, yy + int(2 * math.sin(xx / 23 + k)), 4, 9, O['stripe'])
    x, y, w, h = bx('floor'); B.rect(x, y, w, h, WH)
    maker_square(B, *bx('maker'), O['maker'], MAKER[2])
    F = Sheet(GW, H, None)
    x, y, w, h = bx('catch')
    F.text('EVERY STALL BRINGS', x + 6, y + 4, 'b5', 1, O['red'], outline=[(1, WH)])
    F.text('ITS OWN LIGHT!', x + 14, y + 14, 'b5', 1, O['red'], outline=[(1, WH)])
    F.poly([(x + w - 18, y + 6), (x + w - 4, y + 2), (x + w - 10, y + 16)], O['red'])
    # logo: green word with white pipe-joint cuts, then one colour per letter, white rim + grey shadow
    x, y, w, h = bx('logo'); words = s['name'].upper().split(' ')
    top, last = words[0], words[-1]
    bb = letters(F, top + ' ' + last, 'silkb', (x, y, w, h), [O['green']] * (len(top) + 1) + [O['red'], O['green'], O['yellow'], O['blue']],
                 outline=[(3, WH)], shadow=(1, 2, O['shadow']), bold=1, track=0, maxk=(3, 8), ratio=2.7, anchor='m')
    for xx in range(bb[0] + 12, bb[0] + (bb[2] - bb[0]) * len(top) // (len(top) + len(last) + 1), 21):
        F.rect(xx, bb[1] + (bb[3] - bb[1]) // 2 - 1, 2, 3, WH)  # the pipe-joint seams across the green word
    # options row: two round swatches, OR
    x, y, w, h = bx('opts'); r = h - 4
    B.ellipse(x + 2, y + 4, r, r, O['green'], line=WH, t=2); B.ellipse(x + r + 22, y + 4, r, r, 0xd8dee0, line=WH, t=2)
    B.text('OR', x + r + 6, y + r // 2 + 1, 'b5', 1, O['red'])
    B.tag(x + 2, y - 2, 'LIT', fill=O['green'], ink=WH, line=WH); B.tag(x + r + 22, y - 2, 'UNLIT', fill=0x3a9ad6, ink=WH, line=WH)
    x, y, w, h = bx('callout'); B.text('SLIDE THE LID,', x, y + 4, 'micro5', 1, INK); B.text('LIGHT THE STALL!', x, y + 11, 'micro5', 1, INK)
    x, y, w, h = bx('extra'); B.ellipse(x, y, w, h, O['red'], line=WH, t=1)
    B.text('WITH', x + w // 2, y + 6, 'micro5', 1, WH, anchor='mt'); B.text('LAMP', x + w // 2, y + 13, 'micro5', 1, WH, anchor='mt'); B.text('PARTS', x + w // 2, y + 20, 'micro5', 1, WH, anchor='mt')
    x, y, w, h = bx('count'); letters(B, '%d TYPES' % len(items), 'b5', (x - 2, y, w + 30, h), O['green'], outline=[(2, WH)], bold=1, maxk=(2, 3))
    x, y, w, h = bx('info'); x += 26
    B.rrect(x, y, 40, h, O['cell'], r=2, line=O['green']); B.text('5 STALLS', x + 20, y + 4, 'micro5', 1, INK, anchor='mt'); B.text('+SECRET', x + 20, y + 11, 'micro5', 1, INK, anchor='mt')
    B.text('X', x + 45, y + 6, 'b5', 1, INK); B.rrect(x + 54, y, 46, h, O['cell'], r=2, line=O['green'])
    B.text('LIGHTS', x + 77, y + 4, 'micro5', 1, INK, anchor='mt'); B.text('2 WAYS', x + 77, y + 11, 'micro5', 1, INK, anchor='mt')
    # the line-up: pale yellow cells, title strip on top
    lx, ly, lw, lh = bx('lineup'); n = len(items); cw = lw / n
    for k, it in enumerate(items):
        cx = int(lx + cw * k) + 1; B.rrect(cx, ly, int(cw) - 3, lh, O['cell'], r=4); B.rrect(cx + 3, ly + 9, int(cw) - 9, lh - 12, 0xf7f5e4, r=3)
        B.text('SECRET' if it['secret'] else it['name'].split(' ')[-1].upper(), cx + 4, ly + 2, 'micro5', 1, INK)
    im = upscale(B.im, 2).convert('RGBA')
    T = Sheet(2 * GW, 2 * H, None)
    x, y, w, h = bx('hero'); T.toy(sid, _pose(sid, hero['id'], 2), 2 * (x + w / 2), 2 * (y + h), h=2 * h, w=2 * w)
    side = [i for i in reg if i is not hero]
    x, y, w, h = bx('pipes')
    spots = [(0.22, 0.42, 0.42), (0.66, 0.30, 0.36), (0.30, 0.95, 0.40), (0.78, 0.98, 0.36)]
    for it, (fx, fy, fh) in zip(side, spots):
        T.toy(sid, _pose(sid, it['id'], 1), 2 * (x + w * fx), 2 * (y + h * fy), h=2 * h * fh, w=2 * w * 0.42)
    for k, it in enumerate(items):
        cx = lx + cw * (k + .5)
        T.toy(sid, _pose(sid, it['id'], 2), 2 * cx, 2 * (ly + lh - 4), h=2 * (lh - 16), w=2 * (cw - 10), silhouette=INK if it['secret'] else None)
    im.alpha_composite(T.im); im.alpha_composite(upscale(F.im, 2))
    return im


# ===================================================== fruit dragon (leaf-framed cream, green brush logo, green footer)
def t_fruitdragon(s, MAKER):
    sp, H, bx, col = spec('fruitdragon')
    sid = s['id']; items, reg, hero = heroes(s)
    O = {k: C(v) for k, v in sp['override'].items()}
    cream = col('bg'); green = col('logo', 1); band = col('band'); orange = col('price_red'); yel = col('warn_head')
    B = Sheet(GW, H, cream)
    rn = random.Random(7); lc = (O['leaf_dark'], O['leaf_mid'], O['leaf_light'])
    for cx, cy, L, a in [(-10, 60, 90, 0.2), (-14, 200, 110, -0.25), (20, 300, 90, -1.2), (GW + 8, 130, 100, 3.3), (GW + 12, 250, 95, 2.8),
                         (GW - 70, -8, 80, 1.9), (110, -14, 70, 1.4), (GW - 30, 320, 80, -2.0), (160, 330, 70, -1.7)]:
        leaf(B, cx, cy, L, a, lc, rn)
    x, y, w, h = bx('band'); B.rect(x, y, w, h, band)
    # catch line (red, white rim, stepping up like the reference's arc) + logo + sub
    F = Sheet(GW, H, None)
    x, y, w, h = bx('catch'); F.text('BORN FROM A FILM SET!', x + 4, y + 4, 'b5', 1, O['red'], outline=[(2, WH)], bounce=[3, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 3])
    name = s['name'].upper().replace('’', "'").rstrip('?')
    l1, l2 = ("WHO'S IN", 'THE SUIT?') if s['id'] == 'nakanohito' else (name.split(' ', 1) + [''])[:2]
    letters(F, l1, 'jersey10', bx('logo1'), green, outline=[(3, WH)], bold=1, maxk=(3, 6), ratio=2.6)
    letters(F, l2, 'jersey10', bx('logo2'), green, outline=[(3, WH)], bold=1, maxk=(3, 6), ratio=2.6)
    letters(F, 'MONSTER SUIT FIGURE', 'b5', bx('sub'), green, outline=[(2, WH)], bold=1, maxk=(1, 2), ratio=2)
    x, y, w, h = bx('maker'); B.rrect(x, y, w, h, WH, r=3)
    emblem(B, MAKER[3], x + (w - 12) // 2, y + 3, MAKER[1], ink=INK, paper=WH)
    for j, t in enumerate(['WATCH', 'IT', 'MOVE!']): B.text(t, x + w // 2, y + 21 + 6 * j, 'micro5', 1, INK, anchor='mt')
    B.qr(x + 4, y + h - 32, 1, 11, INK, bg=WH)
    x, y, w, h = bx('heroname'); F.text(hero['name'].upper(), x + w // 2, y, 'b5', 1, INK, anchor='mt', outline=[(1, WH)])
    lx, ly, lw, lh = bx('lineup'); rest = [i for i in items if i is not hero]; cw = lw / len(rest)
    nx, ny, nw, nh = bx('lineup_names')
    for k, it in enumerate(rest):
        B.text('SECRET' if it['secret'] else it['name'].split(' ')[-1].upper(), lx + cw * (k + .5), ny + 2, 'b5', 1, green, anchor='mt', outline=[(1, WH)])
    # footer blocks
    x, y, w, h = bx('price'); B.rect(x, y, w, h, WH)
    letters(B, '%d' % s['price'], 'ps2p', (x + 2, y + 2, w - 22, 18), orange, bold=1, maxk=(2, 2), anchor='m'); B.text('YEN', x + w - 3, y + 8, 'micro5', 1, orange, anchor='rt')
    x, y, w, h = bx('count'); B.rect(x, y, w, h, orange); letters(B, '%d TYPES' % len(items), 'b5', (x + 2, y + 1, w - 4, h - 2), WH, bold=1, maxk=(1, 2), anchor='m')
    x, y, w, h = bx('age'); B.rect(x, y, w, h, WH); B.text('AGES', x + w // 2, y + 6, 'b5', 1, INK, anchor='mt'); B.text('15 & UP', x + w // 2, y + 18, 'b5', 1, INK, anchor='mt')
    x, y, w, h = bx('warn'); B.rect(x, y, w, h, WH)
    hx, hy, hw, hh = bx('warn_head'); B.rect(hx + 2, hy + 2, hw - 4, hh - 2, yel); B.text('! CAUTION', hx + hw // 2, hy + 3, 'micro5', 1, INK, anchor='mt')
    B.para('SMALL PARTS. NOT FOR CHILDREN UNDER 3 YEARS. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER YOUR HEAD. THE PICTURE MAY DIFFER FROM THE PRODUCT.',
           x + 4, hy + hh + 2, w - 8, 'micro5', 1, O['red'], lh=6, maxy=bx('warn_bar')[1] - 1)
    bx_, by_, bw_, bh_ = bx('warn_bar'); B.rect(bx_ + 2, by_, bw_ - 4, bh_, yel); B.text('! WARNING  CHOKING HAZARD', bx_ + bw_ // 2, by_ + 2, 'micro5', 1, INK, anchor='mt')
    small_print(B, x + 4, by_ + bh_ + 2, w - 8, y + h - 2)
    x, y, w, h = bx('makerblk'); B.rect(x, y, w, h, WH)
    B.text('CO. LTD.', x + 4, y + 4, 'micro5', 1, INK); letters(B, MAKER[0], 'b5', (x + 4, y + 11, w - 44, 12), INK, bold=1, maxk=(1, 1))
    B.text('POKKEWORKS.EXAMPLE', x + 4, y + 26, 'micro5', 1, INK); B.text('SCAN FOR THE VIDEO', x + 4, y + 33, 'micro5', 1, INK)
    qx, qy, qw, qh = bx('qr'); B.qr(qx, qy, 1, 5, INK, bg=WH)
    gx, gy, gw, gh = bx('barcode'); B.barcode(gx, gy, '497000%06d' % (sum(map(ord, sid)) * 37 % 10 ** 6), h=gh - 8, ink=INK, bg=WH)
    B.text('MADE IN JAPAN', x + 4, y + h - 8, 'micro5', 1, INK)
    im = upscale(B.im, 2).convert('RGBA')
    T = Sheet(2 * GW, 2 * H, None)
    x, y, w, h = bx('hero'); T.toy(sid, _pose(sid, hero['id'], 2), 2 * (x + w / 2), 2 * (y + h), h=2 * h, w=2 * w)
    for k, it in enumerate(rest):
        T.toy(sid, _pose(sid, it['id'], 2), 2 * (lx + cw * (k + .5)), 2 * (ly + lh), h=2 * lh, w=2 * (cw - 2), silhouette=INK if it['secret'] else None)
    im.alpha_composite(T.im); im.alpha_composite(upscale(F.im, 2))
    return im


TEMPLATES = {'crabcan': t_crabcan, 'pipeotter': t_pipeotter, 'fruitdragon': t_fruitdragon}
# our series -> the reference card each is cloned from (similar themes together; only the sample is baked so far)
REF_OF = {
    'henshin': 'crabcan', 'kasabuki': 'crabcan', 'kanikan': 'crabcan', 'kaden': 'crabcan',             # transforming objects
    'yomise': 'pipeotter', 'hashigo': 'pipeotter', 'obakebaito': 'pipeotter', 'sento': 'pipeotter',   # playsets
    'nakanohito': 'fruitdragon', 'kabuki': 'fruitdragon', 'karakuri': 'fruitdragon', 'janru': 'fruitdragon',  # mythic / monster
    'teruteru': 'tamakero', 'otenki': 'tamakero', 'punipuni': 'tamakero',                              # pose / mode gimmick
    'ekiin': 'birdphone', 'otsukai': 'birdphone', 'tsuppari': 'birdphone', 'meijin': 'birdphone',     # creature with a job
    'sabaku': 'mandrake', 'minato': 'mandrake', 'datesha': 'mandrake',                                 # pose animals, photo set
}


def card6(s, ref, MAKER):
    return TEMPLATES[ref](s, MAKER)
