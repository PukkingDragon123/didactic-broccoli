"""card6.py: the gacha display cards, built on the STRUCTURE of the owner's six reference cards
(shots/clone/ref_<ref>.png, measured in tools/cardref/<ref>.json) and dressed in each series' own world: its credited
real photo as the scene, its palette, a prop or motif from its theme, a logotype face that suits it, its toys graded
to the photo with hard contact shadows and foreground pieces overlapping them. Design checklist: docs/ref/posters.md.
Laid out on the in-game card grid (320 x 280, src/gfx/banner.js) and printed 2x: rules, badges and pixel type are 2 x 2
blocks; the photos and toy renders are full resolution.
  python3 -I tools/bake-cards.py --ref [template] series,...   (all 21 series: python3 -I tools/bake-cards.py)"""
import os, math
import numpy as np
from PIL import Image, ImageDraw
from printkit import mixc as _mixc, rgb


def mixc(a, b, t):
    v = _mixc(a, b, t)
    return (int(v[0]) << 16) | (int(v[1]) << 8) | int(v[2]) if isinstance(v, (tuple, list)) else int(v)
from pixprint import Sheet, line_mask, _dilate, upscale
from lettering import emblem
import paperkit as PK

W, H = 320, 280
WH = 0xffffff; PAPER = 0xf7f2e6; INK = 0x241f1d; GREY = 0x8a8480; YEL = 0xf6e04a

# our series -> the reference card it is built on (similar themes together)
REF_OF = {
    'henshin': 'crabcan', 'kasabuki': 'crabcan', 'kanikan': 'crabcan', 'kaden': 'crabcan',              # object -> creature
    'yomise': 'pipeotter', 'hashigo': 'pipeotter', 'obakebaito': 'pipeotter', 'sento': 'pipeotter',    # playsets
    'nakanohito': 'fruitdragon', 'kabuki': 'fruitdragon', 'karakuri': 'fruitdragon', 'janru': 'fruitdragon',  # on stage
    'teruteru': 'tamakero', 'otenki': 'tamakero',                                                       # two modes
    'ekiin': 'birdphone', 'otsukai': 'birdphone', 'tsuppari': 'birdphone', 'meijin': 'birdphone',      # a creature with a job
    'sabaku': 'mandrake', 'minato': 'mandrake', 'datesha': 'mandrake',                                  # pose beasts on location
}
LOGO = {  # series -> (pixel face, bold, pixel italic shear): the face picked for the theme
    'henshin': ('jersey20', 0, 0.22), 'kasabuki': ('ala', 0, 0), 'kanikan': ('jersey20', 0, 0.15), 'kaden': ('ps2p', 0, 0),
    'yomise': ('jersey20', 0, 0), 'hashigo': ('jersey20', 0, 0), 'obakebaito': ('jersey20', 0, 0), 'sento': ('jersey20', 0, 0),
    'nakanohito': ('jersey20', 0, 0.12), 'kabuki': ('ala', 0, 0), 'karakuri': ('ala', 0, 0), 'janru': ('ps2p', 0, 0.2),
    'teruteru': ('jersey20', 0, 0), 'otenki': ('jersey20', 0, 0.12), 'ekiin': ('jersey20', 0, 0), 'otsukai': ('ala', 0, 0),
    'tsuppari': ('jersey20', 0, 0.2), 'meijin': ('ps2p', 0, 0), 'sabaku': ('ala', 0, 0), 'minato': ('ala', 0, 0), 'datesha': ('ala', 0, 0),
}
DECOR = {  # series -> real-photo cut-outs (tools/cardref/cutouts.py: Open Images masks, CC BY 2.0, CREDITS.md)
    'henshin': ['pen_1', 'ruler_1', 'scissors_1', 'pen_2', 'adhesive_tape_0', 'pen_0'],
    'kasabuki': ['sword_0', 'rose_2', 'dagger_2', 'flower_1', 'rose_0'],
    'kanikan': ['lemon_1', 'fish_0', 'oyster_2', 'lemon_2', 'fish_2'],
    'kaden': ['kettle_2', 'corded_phone_0', 'alarm_clock_1', 'kettle_0', 'clock_1'],
    'yomise': ['starfish_1', 'oyster_1', 'fish_1', 'starfish_0', 'sea_turtle_1'],
    'hashigo': ['frog_2', 'mushroom_0', 'frog_0', 'flower_1', 'mushroom_2'],
    'obakebaito': ['pumpkin_0', 'candle_2', 'pumpkin_2', 'candle_1', 'pumpkin_1'],
    'sento': ['milk_0', 'towel_1', 'tap_1', 'milk_1', 'duck_2'],
    'nakanohito': ['skyscraper_0', 'tank_1', 'skyscraper_2', 'camera_1', 'tank_0'],
    'kabuki': ['flower_0', 'rose_2', 'flower_2', 'rose_0', 'flower_1'],
    'karakuri': ['clock_1', 'teapot_1', 'watch_0', 'alarm_clock_0', 'teapot_2'],
    'janru': ['rocket_1', 'dice_1', 'kite_1', 'rocket_0', 'dice_0'],
    'teruteru': ['boot_0', 'frog_2', 'mushroom_1', 'duck_2', 'frog_0'],
    'otenki': ['kite_0', 'common_sunflower_0', 'sun_hat_1', 'kite_2', 'common_sunflower_2'],
    'ekiin': ['train_1', 'suitcase_2', 'watch_0', 'train_0', 'suitcase_0'],
    'otsukai': ['candle_1', 'rose_1', 'flower_2', 'candle_2', 'flower_0'],
    'tsuppari': ['motorcycle_1', 'rose_2', 'motorcycle_0', 'rose_0', 'dice_2'],
    'meijin': ['kite_2', 'dice_1', 'ball_0', 'kite_0', 'dice_0'],
    'sabaku': ['skull_1', 'snake_1', 'cowboy_hat_1', 'lizard_2', 'skull_0'],
    'minato': ['lighthouse_0', 'fish_2', 'canoe_1', 'lighthouse_2', 'fish_0'],
    'datesha': ['fedora_2', 'rose_2', 'tie_1', 'watch_1', 'cocktail_2'],
}
SLOTS = {  # template -> cut-out places (cx, cy, size, degrees, layer 'back' behind the toys / 'front' over them)
    'crabcan': [(34, 108, 44, -20, 'back'), (184, 102, 42, 25, 'back'), (194, 186, 34, -30, 'front'), (18, 188, 30, 15, 'front'), (296, 52, 24, 20, 'front')],
    'pipeotter': [(212, 40, 38, -15, 'back'), (300, 30, 34, 20, 'back'), (16, 116, 34, 10, 'back'), (204, 150, 30, -10, 'front'), (308, 146, 28, 15, 'front')],
    'fruitdragon': [(10, 124, 52, -25, 'back'), (312, 118, 50, 25, 'back'), (164, 124, 34, -15, 'back'), (10, 200, 32, 20, 'front'), (312, 200, 30, -20, 'front')],
    'tamakero': [(300, 74, 40, 20, 'back'), (20, 70, 38, -15, 'back'), (226, 184, 30, 10, 'front'), (136, 186, 28, -10, 'front'), (180, 150, 26, 15, 'back')],
    'birdphone': [(138, 44, 34, 20, 'back'), (140, 192, 36, -10, 'front'), (10, 196, 34, 15, 'front'), (306, 200, 32, -15, 'front'), (262, 130, 26, 10, 'back')],
    'mandrake': [(24, 34, 40, -20, 'back'), (178, 40, 36, 20, 'back'), (186, 158, 44, 15, 'back'), (310, 176, 40, -15, 'front'), (150, 236, 26, 10, 'front')],
}


def pattern(S, box, kind, col, bg=None):
    """A flat pixel ground pattern (stripes, dots, rain, tiles, waves, checks, rays): no gradients."""
    x, y, w, h = box
    if bg is not None: S.rect(x, y, w, h, bg)
    if kind == 'grid':
        for yy in range(y + 3, y + h, 8): S.rect(x, yy, w, 1, col)
        S.rect(x + 18, y, 1, h, mixc(col, 0xd8402a, 0.6))
    elif kind == 'rain':
        for k, yy in enumerate(range(y - 8, y + h, 9)):
            for xx in range(x + (k * 5) % 14, x + w, 14): S.line([(xx, yy), (xx - 3, yy + 6)], col, 1)
    elif kind == 'waves':
        for k, yy in enumerate(range(y + 3, y + h, 10)):
            for xx in range(x, x + w, 2): S.rect(xx, yy + int(2 * math.sin(xx / 6 + k)), 2, 2, col)
    elif kind == 'tiles':
        for yy in range(y, y + h, 10): S.rect(x, yy, w, 1, col)
        for xx in range(x, x + w, 10): S.rect(xx, y, 1, h, col)
    elif kind == 'stripes':
        for yy in range(y + 2, y + h, 12): S.rect(x, yy, w, 5, col)
    elif kind == 'checks':
        for j, yy in enumerate(range(y, y + h, 16)):
            for i, xx in enumerate(range(x, x + w, 16)):
                if (i + j) % 2: S.rect(xx, yy, 16, 16, col)
    elif kind == 'dunes':
        for k, yy in enumerate(range(y + 10, y + h, 14)):
            for xx in range(x, x + w, 2): S.rect(xx, yy + int(5 * math.sin(xx / 26 + k * 1.7)), 2, 3, col)
    elif kind == 'rays':
        S.rays((x, y, w, h), x + w // 2, y + h, col, n=20)
    else:
        S.dots((x, y, w, h), col, step=8, size=2)


GROUND = {  # series -> (pattern, pattern colour mix toward the accent) for the template's ground
    'henshin': 'grid', 'kasabuki': 'rain', 'kanikan': 'waves', 'kaden': 'dots', 'yomise': 'waves', 'hashigo': 'stripes',
    'obakebaito': 'stripes', 'sento': 'tiles', 'nakanohito': 'dots', 'kabuki': 'stripes', 'karakuri': 'dots', 'janru': 'dots',
    'teruteru': 'rain', 'otenki': 'rays', 'ekiin': 'stripes', 'otsukai': 'dots', 'tsuppari': 'stripes', 'meijin': 'dots',
    'sabaku': 'dunes', 'minato': 'waves', 'datesha': 'checks',
}


# ------------------------------------------------------------------------------------------------------------ type
def _wrap(text, face, w, maxl=2):
    words = text.upper().replace('’', "'").split(' ')
    if words[0] == 'THE' and len(words) > 2: words = words[1:]
    lines, cur = [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if cur and line_mask(t, face)[0].shape[1] > w: lines.append(cur); cur = wd
        else: cur = t
    lines.append(cur)
    return lines[-maxl:] if len(lines) > maxl else lines


def title_lines(name):
    t = name.upper().replace('’', "'")
    if ':' in t: return [p.strip() for p in t.split(':', 1)]
    return [t]


SMALLER = {'jersey25': 'jersey20', 'jersey20': 'jersey15', 'jersey15': 'jersey10', 'jacq24': 'jacq12', 'ala': 'silkb', 'ps2p': 'silkb', 'b5': 'micro5'}


def set_lines(S, lines, box, face, fill, outline=(), shadow=None, bold=0, shear=0.0, align='l', maxk=4, gap=None, fills=None):
    """Hand-set logotype: the lines at ONE integer scale k (the largest that fits the box), pixel-sheared, hard
    outlines (r, col) innermost first, a hard offset shadow. Picks one line or a balanced two-line split, whichever
    sets bigger. Returns (x0, y0, x1, y1)."""
    x, y, w, h = box
    pad = sum(o[0] for o in outline) * 2 + (abs(shadow[1]) if shadow else 0)
    def plan(ls):
        ms = [line_mask(l, face, 0, bold) for l in ls]
        mw = max(m[0].shape[1] + shear * m[0].shape[0] for m in ms); mh = sum(m[0].shape[0] for m in ms)
        g = gap if gap is not None else max(2, ms[0][0].shape[0] // 4)
        k = min(maxk, int((w - pad) // mw), int((h - pad * len(ls) - g * (len(ls) - 1)) // mh))
        return k, ms, g
    cands = [lines]
    if len(lines) == 1 and ' ' in lines[0]:
        wd = lines[0].split(' ')
        best = min(range(1, len(wd)), key=lambda i: abs(len(' '.join(wd[:i])) - len(' '.join(wd[i:]))))
        cands.append([' '.join(wd[:best]), ' '.join(wd[best:])])
    lines, (k, ms, g) = max(((c, plan(c)) for c in cands), key=lambda t: (t[1][0], -len(t[0])))
    if k < 1 and face in SMALLER:  # too long for this face even at 1x: the next smaller cut of the same family
        return set_lines(S, lines if len(lines) > 1 else cands[0], box, SMALLER[face], fill, outline, shadow, bold, shear, align, maxk, gap, fills)
    k = max(k, 1)
    blocks = []
    for li, (m, _, _, spans) in enumerate(ms):
        M = np.repeat(np.repeat(m, k, 0), k, 1)
        lab = np.zeros(M.shape, np.int16)
        for i, (a, b) in enumerate(spans): lab[:, a * k:b * k] = i
        if shear:
            hh = M.shape[0]; ext = int(math.ceil(shear * hh)); M2 = np.zeros((hh, M.shape[1] + ext), bool); L2 = np.zeros(M2.shape, np.int16)
            for r in range(hh):
                d = int(shear * (hh - 1 - r)); M2[r, d:d + M.shape[1]] = M[r]; L2[r, d:d + M.shape[1]] = lab[r]
            M, lab = M2, L2
        blocks.append((M, lab, spans))
    tot = sum(b[0].shape[0] + pad for b in blocks) + g * (len(blocks) - 1)
    cy = y + (h - tot) // 2; box_ = [1e9, 1e9, -1, -1]; li0 = 0
    for M, lab, spans in blocks:
        sil = M; lay = []
        for o in outline: sil = _dilate(sil, o[0], 'disc'); lay.append((sil, o[1]))
        P = (sil.shape[1] - M.shape[1]) // 2
        X = x + {'l': 0, 'm': (w - sil.shape[1]) // 2, 'r': w - sil.shape[1]}[align]
        if shadow: S._stamp(sil, X + shadow[0], cy + shadow[1], shadow[2])
        for s_, c in reversed(lay): S._stamp(s_, X + (sil.shape[1] - s_.shape[1]) // 2, cy + (sil.shape[0] - s_.shape[0]) // 2, c)
        for i in range(len(spans)):
            col = fills[(li0 + i) % len(fills)] if fills else fill
            S._stamp(M & (lab == i), X + P, cy + P, col)
        li0 += len(spans)
        box_ = [min(box_[0], X), min(box_[1], cy), max(box_[2], X + sil.shape[1]), max(box_[3], cy + sil.shape[0])]
        cy += sil.shape[0] + g + (abs(shadow[1]) if shadow else 0)
    return box_


def lum(c): return (0.3 * ((c >> 16) & 255) + 0.59 * ((c >> 8) & 255) + 0.11 * (c & 255)) / 255
def deep(c, t=0.35): return mixc(c, 0x101014, t)


# ------------------------------------------------------------------------------------------------------- the card
class Card:
    """Layers: B (grid: flat ground) < P (2x: cut-outs behind) < M (grid: panels, props behind the toys) < T (2x: toys
    and their contact shadows) < FC (2x: cut-outs in front) < F (grid: foreground pieces, type and badges)."""
    def __init__(self, s, ctx):
        self.s, self.sid, self.ctx = s, s['id'], ctx
        c = s['card']; h = lambda v, d: int(str(v or d).lstrip('#'), 16)
        self.bg, self.ac, self.ac2, self.tx = h(c.get('bg'), 'f2e6cf'), h(c.get('accent'), '2a5aa8'), h(c.get('accent2'), 'c8302a'), h(c.get('text'), '241f1d')
        self.items = s['items']; self.reg = [i for i in self.items if not i['secret']]
        def bulk(i):  # the most substantial figure leads the card (reads best big)
            p = os.path.join(ctx['toys'], self.sid, i['id'] + '.png')
            return (np.asarray(Image.open(p).getchannel('A')) > 100).sum() if os.path.exists(p) else 0
        self.hero = max(self.reg, key=bulk)
        self.rest = [i for i in self.items if i is not self.hero]
        self.B = Sheet(W, H, PAPER); self.M = Sheet(W, H, None); self.F = Sheet(W, H, None)
        self.P = Sheet(2 * W, 2 * H, None); self.T = Sheet(2 * W, 2 * H, None); self.FC = Sheet(2 * W, 2 * H, None)
        self.grade_col = mixc(self.bg, self.ac, 0.25)
        self.face, self.bold, self.shear = LOGO.get(self.sid, ('jersey20', 0, 0))
        name, mcol, em = ctx['maker']
        self.maker, self.mcol, self.em = name, mcol, em
        self.initials = ''.join(wd[0] for wd in name.split()[:2])

    # -- a real-photo cut-out (hard edge), graded to the card, with a hard offset shadow (light from the top left)
    def cut(self, key, cx, cy, size, rot=0, layer='back'):
        p = os.path.join(self.ctx['cuts'], key + '.png')
        if not os.path.exists(p): return
        im = Image.open(p).convert('RGBA')
        if rot: im = im.rotate(rot, Image.BICUBIC, expand=True)
        bb = im.getchannel('A').point(lambda v: 255 if v > 127 else 0).getbbox(); im = im.crop(bb)
        k = 2 * size / max(im.size); im = im.resize((max(2, int(im.width * k)), max(2, int(im.height * k))), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32)
        g = np.array(rgb(self.grade_col), np.float32)
        a[..., :3] = a[..., :3] * 0.86 + a[..., :3] * g / 255 * 0.14 * 1.5
        al = a[..., 3] > 127; a[..., 3] = al * 255
        t = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
        L = self.FC if layer == 'front' else self.P
        X, Y = int(2 * cx - t.width / 2), int(2 * cy - t.height / 2)
        sh = Image.new('RGBA', t.size, (24, 18, 28, 0)); sh.putalpha(Image.fromarray((al * 96).astype(np.uint8)))
        L.im.alpha_composite(sh, (max(X + 4, 0), max(Y + 4, 0)), (max(-X - 4, 0), max(-Y - 4, 0)))
        L.im.alpha_composite(t, (max(X, 0), max(Y, 0)), (max(-X, 0), max(-Y, 0)))

    def decor(self, ref, only=None):
        keys = DECOR.get(self.sid, [])
        for k, sl in enumerate(SLOTS[ref]):
            if only and sl[4] != only or not keys: continue
            self.cut(keys[k % len(keys)], *sl)

    def ground(self, S, box, bg, t=0.82):
        pattern(S, box, GROUND.get(self.sid, 'dots'), mixc(bg, self.ac if lum(bg) > 0.4 else WH, 1 - t), bg)

    def pose(self, iid, n):
        p = os.path.join(self.ctx['toys'], self.sid, 'pose', '%s_%d.png' % (iid, n))
        return 'pose/%s_%d' % (iid, n) if os.path.exists(p) else iid

    # -- a toy, graded to the scene, standing on a hard contact shadow
    def toy(self, iid, cx, foot, h, w, sil=False, shadow=True, flip=False, top=False, grade=0.1):
        t = self.T.toy_img(self.sid, iid, 2 * h, 2 * w)
        if t is None: return None
        if flip: t = t.rotate(180)
        a = np.asarray(t).astype(np.float32)
        if sil: a[..., :3] = rgb(INK)
        elif self.grade_col is not None and grade:
            g = np.array(rgb(self.grade_col), np.float32); a[..., :3] = a[..., :3] * (1 - grade) + a[..., :3] * g / 255 * grade * 1.6
        t = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')
        X = int(round(2 * cx - t.width / 2)); Y = int(round(2 * foot)) if top else int(round(2 * foot - t.height))
        if shadow and not top:
            sw = int(t.width * 0.78); sh = max(6, int(t.width * 0.11)); sh -= sh % 2
            lay = Image.new('RGBA', self.T.im.size, (0, 0, 0, 0))
            ImageDraw.Draw(lay).ellipse((X + (t.width - sw) // 2, Y + t.height - sh // 2 - 2, X + (t.width + sw) // 2, Y + t.height + sh // 2 - 2), fill=(20, 16, 24, 120))
            self.T.im.alpha_composite(lay)
        self.T.im.alpha_composite(t, (max(X, 0), max(Y, 0)), (max(-X, 0), max(-Y, 0)))
        return (X / 2, Y / 2, (X + t.width) / 2, (Y + t.height) / 2)

    # -- shared print pieces
    def logo(self, S, box, lines=None, **kw):
        kw.setdefault('bold', self.bold); kw.setdefault('shear', self.shear)
        return set_lines(S, lines or title_lines(self.s['name']), box, self.face, **kw)

    def names(self, S, it, cx, y, w, col=INK, face='micro5', outline=None, maxl=2):
        ls = ['SECRET'] if it['secret'] else _wrap(it['name'], face, w, maxl)
        for j, l in enumerate(ls): S.text(l, cx, y + 6 * j, face, 1, col, anchor='mt', outline=outline)
        return len(ls)

    def strip(self, y, col):
        F = self.B; F.rect(0, y, W, H - y, WH)
        F.text('* PICTURES FOR ILLUSTRATION. SMALL PARTS: NOT FOR UNDER 3.', 6, y + 4, 'micro5', 1, GREY)
        F.text(self.maker, W - 6, y + 3, 'b5', 1, col, anchor='rt')

    def footer(self, S, y, band, red):
        """Price, ages, the warning block and the maker block (the Qualia-style footer), on a band colour."""
        S.rect(0, y, W, H - y, band)
        x0 = 6; S.rrect(x0, y + 5, 58, 36, WH, r=2)
        S.text('%d' % self.s['price'], x0 + 29, y + 8, 'b5', 2, red, anchor='mt'); S.text('YEN A TURN', x0 + 29, y + 21, 'micro5', 1, INK, anchor='mt')
        S.rect(x0 + 2, y + 28, 54, 11, red); S.text('%d TYPES' % len(self.items), x0 + 29, y + 30, 'b5', 1, WH, anchor='mt')
        S.rrect(x0, y + 44, 58, H - y - 50, WH, r=2)
        S.text('AGES', x0 + 29, y + 48, 'b5', 1, INK, anchor='mt'); S.text('15 & UP', x0 + 29, y + 58, 'b5', 1, INK, anchor='mt')
        wx = 70; ww = 140; S.rrect(wx, y + 5, ww, H - y - 11, WH, r=2)
        S.rect(wx + 3, y + 8, ww - 6, 9, YEL); S.text('CAUTION', wx + ww // 2, y + 10, 'b5', 1, INK, anchor='mt')
        S.para('SMALL PARTS. NOT FOR CHILDREN UNDER 3 YEARS. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER YOUR HEAD.',
               wx + 5, y + 21, ww - 10, 'micro5', 1, red, lh=6, maxy=y + 44)
        S.rect(wx + 3, y + 45, ww - 6, 8, YEL); S.text('WARNING: CHOKING HAZARD', wx + ww // 2, y + 46, 'micro5', 1, INK, anchor='mt')
        S.text('PICTURES MAY DIFFER FROM THE TOY.', wx + ww // 2, y + 57, 'micro5', 1, INK, anchor='mt')
        mx = 216; mw = W - mx - 6; S.rrect(mx, y + 5, mw, H - y - 11, WH, r=2)
        emblem(S, self.em, mx + 5, y + 9, self.mcol, ink=INK, paper=WH)
        S.text(self.maker.split(' ')[0], mx + 20, y + 9, 'b5', 1, INK); S.text(' '.join(self.maker.split(' ')[1:]) + ' CO.', mx + 20, y + 18, 'micro5', 1, INK)
        S.text('SCAN FOR THE', mx + 5, y + 29, 'micro5', 1, INK); S.text('MOVING VIDEO', mx + 5, y + 36, 'micro5', 1, INK)
        S.qr(mx + mw - 25, y + 28, 1, sum(map(ord, self.sid)), INK, bg=WH)
        S.barcode(mx + 10, y + 54, '4970%08d' % (sum(map(ord, self.sid)) * 7919 % 10 ** 8), h=7, ink=INK, bg=WH)

    def finish(self):
        im = upscale(self.B.im.convert('RGBA'), 2)
        im.alpha_composite(self.P.im); im.alpha_composite(upscale(self.M.im, 2)); im.alpha_composite(self.T.im); im.alpha_composite(self.FC.im); im.alpha_composite(upscale(self.F.im, 2))
        return PK.age(im.convert('RGB'), paper='Paper001', grain_k=0.18, fade=0.0, seed=sum(map(ord, self.sid))).convert('RGB')


# ============================================================ CRAB CAN: the series' object as a printed can / tin
def t_crabcan(K):
    B, M, F = K.B, K.M, K.F
    field = K.ac if lum(K.ac) < 0.6 else K.ac2
    lab = K.ac2 if abs(lum(K.ac2) - lum(field)) > 0.12 and lum(K.ac2) < 0.6 else deep(field, 0.25)
    ring = mixc(field, WH, 0.55)
    B.rect(0, 0, W, H, field)
    B.ellipse(8, -16, 304, 32, WH); B.ellipse(8, -16, 304, 32, WH, line=ring, t=2); B.ellipse(34, -10, 252, 20, WH, line=ring, t=1)
    # price disc and maker tile
    B.ellipse(4, 4, 50, 50, WH, line=ring, t=1)
    F.text('%d' % K.s['price'], 29, 13, 'b5', 2, lab, anchor='mt'); F.text('YEN', 29, 29, 'micro5', 1, lab, anchor='mt')
    F.text('%d TYPES' % len(K.items), 29, 37, 'micro5', 1, INK, anchor='mt')
    B.rrect(274, 6, 40, 26, WH, r=3); set_lines(F, [K.initials], (276, 8, 36, 22), 'ps2p', lab, align='m', maxk=2)
    # the label band
    B.rrect(60, 14, 208, 58, WH, r=29)
    F.text(K.ctx['kind'], 161, 20, 'micro5', 1, lab, anchor='mt')
    K.logo(F, (74, 28, 174, 40), fill=lab, align='m')
    # the product window: the scene photo with the transformation
    B.rrect(6, 78, 200, 120, WH, r=8); B.rrect(8, 80, 196, 116, mixc(field, WH, 0.86), r=7); K.ground(B, (12, 84, 188, 108), mixc(field, WH, 0.86)); K.decor('crabcan')
    h = K.hero; poses = K.pose(h['id'], 2) != h['id']
    if poses:
        K.toy(K.pose(h['id'], 0), 48, 190, 40, 66)
        M.arrow([(46, 146), (46, 126), (80, 126)], WH, t=4, head=7, outline=deep(field, 0.2))
        K.toy(K.pose(h['id'], 2), 138, 194, 104, 124)
    else:
        sec = next(i for i in K.reg if i is not h)
        K.toy(sec['id'], 48, 192, 54, 62)
        K.toy(h['id'], 132, 194, 106, 122)
    F.rrect(6, 190, 200, 8, WH, r=2)  # the window sill in front of the toys
    # the side column: the gimmick, the line, the hero's name
    bw = K.ctx['burst']
    bb = set_lines(F, list(bw), (214, 82, 100, 46), 'jersey20', WH, shadow=(1, 1, deep(field, 0.4)), align='l', maxk=2)
    ty = bb[3] + 6
    for j, l in enumerate(_wrap(K.ctx['tagline'], 'micro5', 98, 4)): F.text(l, 214, ty + 7 * j, 'micro5', 1, WH)
    nm = _wrap(h['name'], 'micro5', 90, 2)
    tb = 196 - 6 - 7 * len(nm); B.rrect(212, tb, 102, 7 * len(nm) + 6, WH, r=3)
    for j, l in enumerate(nm): F.text(l, 263, tb + 4 + 7 * j, 'micro5', 1, lab, anchor='mt')
    # the line-up tin
    B.rrect(6, 210, 230, 52, WH, r=8); B.ellipse(6, 202, 230, 16, WH, line=ring, t=2); B.ellipse(26, 205, 190, 10, WH, line=ring, t=1)
    F.text('LINE-UP', 121, 207, 'b5', 1, lab, anchor='mt')
    cw = 222 / len(K.rest)
    for k, it in enumerate(K.rest):
        cx = 10 + cw * (k + .5)
        nl = len(['S'] if it['secret'] else _wrap(it['name'], 'micro5', cw - 2))
        K.toy(it['id'], cx, 258 - 6 * nl, 38 - 6 * nl, cw - 4, sil=it['secret'], shadow=not it['secret'])
        K.names(F, it, cx, 259 - 6 * nl, cw - 2, col=INK)
    # the safety tile
    B.rrect(242, 204, 72, 58, WH, r=6)
    F.text('AGES 15+', 278, 209, 'b5', 1, lab, anchor='mt')
    F.poly([(254, 220), (260, 230), (248, 230)], YEL); F.poly([(254, 222), (258, 229), (250, 229)], YEL); F.rect(253, 223, 2, 3, INK); F.rect(253, 227, 2, 1, INK)
    F.text('CHOKING', 263, 221, 'micro5', 1, INK); F.text('HAZARD', 263, 227, 'micro5', 1, INK)
    for j, l in enumerate(['SMALL PARTS.', 'NOT FOR UNDER 3.', 'KEEP THE CAPSULE', 'AWAY FROM FIRE.']): F.text(l, 248, 235 + 6 * j, 'micro5', 1, GREY)
    K.strip(266, lab)


# ================================================== PIPE OTTER: a big playset prop on the scene, a rainbow logo
def prop_yomise(K, M, F):  # a night-stall frame: tiled roof, posts, noren, paper lanterns, a counter in front
    wood, dark = 0x7a4a2a, 0x4a2a18
    M.poly([(22, 34), (200, 34), (188, 22), (34, 22)], 0x2a2430); M.rect(22, 34, 178, 3, dark)
    for x in range(36, 190, 8): M.rect(x, 24, 1, 10, 0x3a3440)
    M.rect(34, 37, 6, 116, wood); M.rect(182, 37, 6, 116, wood); M.rect(34, 37, 154, 5, wood)
    for k, x in enumerate(range(42, 180, 23)):
        M.rect(x, 42, 21, 22, K.ac2 if k % 2 else 0x22305a); M.rect(x, 62, 21, 2, deep(K.ac2, 0.3) if k % 2 else 0x141c3a)
    for x in (56, 110, 164):
        M.rect(x, 64, 1, 6, INK); M.ellipse(x - 8, 70, 17, 20, 0xe0482c); M.rect(x - 6, 69, 13, 3, INK); M.rect(x - 6, 89, 13, 3, INK)
        for yy in (75, 80, 85): M.rect(x - 7, yy, 15, 1, 0xa82c1c)
    F.rect(26, 138, 168, 5, 0x9a6438); F.rect(26, 143, 168, 9, wood); F.rect(26, 151, 168, 2, dark)
    return [(70, 140, 40), (124, 140, 44), (166, 140, 36)]


def prop_hashigo(K, M, F):  # two bamboo ladders, frogs on the rungs
    bam, node = 0xc8a85a, 0x8a6a2a
    for x0 in (44, 128):
        M.rect(x0, 18, 4, 136, bam); M.rect(x0 + 44, 18, 4, 136, bam)
        for y in range(26, 150, 18): M.rect(x0 + 4, y, 40, 3, bam); M.rect(x0, y - 1, 4, 2, node); M.rect(x0 + 44, y - 1, 4, 2, node)
    F.rect(44, 18, 4, 136, bam); F.rect(172, 18, 4, 136, bam)  # the front rails overlap the climbers
    return [(66, 62, 34), (150, 98, 36), (110, 152, 36)]


def prop_obakebaito(K, M, F):  # a haunted-house gate: dark posts, a beam, torn cloth, a lantern, a fence in front
    post = 0x2a1e1c
    M.rect(30, 14, 8, 140, post); M.rect(178, 14, 8, 140, post); M.rect(20, 14, 176, 8, post); M.rect(26, 26, 164, 4, post)
    for k, x in enumerate(range(42, 176, 12)):
        M.poly([(x, 30), (x + 10, 30), (x + 8 + (k % 3), 52 + (k * 7) % 14), (x + 2, 48 + (k * 5) % 10)], 0xd8d0c0 if k % 2 else 0xb8b0a8)
    M.rect(108, 30, 1, 8, INK); M.ellipse(100, 38, 17, 22, 0xd8a040); M.rect(102, 37, 13, 3, INK); M.rect(102, 59, 13, 3, INK)
    for x in range(22, 196, 9): F.rect(x, 136, 7, 18, 0x4a3a30); F.poly([(x, 136), (x + 7, 136), (x + 3, 132)], 0x4a3a30)
    F.rect(20, 142, 178, 3, 0x2a1e1c)
    return [(62, 136, 46), (140, 136, 50), (104, 136, 30)]


def prop_sento(K, M, F):  # the bathtub: tiled walls of the tub in front, water inside
    tile, grout = 0xe8f0f2, 0x9ab8c8
    M.rect(24, 112, 176, 12, 0x5aa0d0)
    F.rect(20, 118, 184, 36, tile)
    for y in range(118, 154, 9): F.rect(20, y, 184, 1, grout)
    for k, y in enumerate(range(118, 154, 9)):
        for x in range(20 + (k % 2) * 6, 204, 12): F.rect(x, y, 1, 9, grout)
    F.rect(18, 114, 188, 5, 0xc8a070); F.rect(18, 118, 188, 1, 0x8a6a40)
    return [(60, 128, 44), (112, 128, 46), (164, 128, 42)]


PROP = {'yomise': prop_yomise, 'hashigo': prop_hashigo, 'obakebaito': prop_obakebaito, 'sento': prop_sento}


def t_pipeotter(K):
    B, M, F = K.B, K.M, K.F
    K.ground(B, (0, 0, W, 166), {'yomise': 0x1c2a4a, 'obakebaito': 0x2e2430, 'sento': 0xeef4f4}.get(K.sid, mixc(K.ac, WH, 0.8)))
    if K.sid == 'yomise':
        for bx_, by_, r_ in [(240, 30, 3), (252, 52, 2), (30, 70, 2), (226, 100, 4), (200, 18, 2)]: B.ellipse(bx_, by_, 2 * r_, 2 * r_, 0x1c2a4a, line=0x7aa8d8)
    K.decor('pipeotter')
    spots = PROP[K.sid](K, M, F) if K.sid in PROP else [(70, 140, 40), (124, 140, 44), (166, 140, 36)]
    side = [i for i in K.reg if i is not K.hero]
    for it, (cx, foot, h) in zip(side, spots): K.toy(K.pose(it['id'], 1), cx, foot, h, 52)
    K.toy(K.pose(K.hero['id'], 2), 262, 150, 112, 104)
    # maker tile + the catch
    M.rrect(6, 6, 26, 24, K.ac2, r=3); set_lines(F, [K.initials], (8, 8, 22, 14), 'ps2p', WH, align='m', maxk=2)
    F.text('TOYS', 19, 23, 'micro5', 1, WH, anchor='mt')
    set_lines(F, [K.ctx['tagline'].upper()], (38, 6, 236, 12), 'b5', WH, outline=[(1, deep(K.ac, 0.4))], maxk=1)
    # the logo over the scene: the words in the series colours, white rim, hard shadow
    L = title_lines(K.s['name'])[-1].split(' ')
    if K.sid == 'obakebaito':  # bone-white letters, plum rim: no candy colours on the haunted house
        K.logo(F, (6, 120, 308, 46), fill=0xe8e0c8, outline=[(2, deep(K.ac, 0.3))], shadow=(0, 2, 0x140e12), align='m', maxk=3)
    else:
        fills = [K.ac2 if lum(K.ac2) < 0.75 else K.ac] * (len(L[0]) + 1) + [K.ac, 0xf0b020, 0x3a9a4a, K.ac2, 0x3a70c0] * 6
        K.logo(F, (6, 124, 308, 42), fill=K.ac, fills=fills, outline=[(2, WH)], shadow=(0, 2, deep(K.ac, 0.5)), align='m', maxk=3)
    # the lower print: pale stripes, types, chips, price, the line-up cells
    B.rect(0, 166, W, H - 166, PAPER)
    for y in range(170, 262, 8): B.rect(0, y, W, 3, mixc(K.ac, PAPER, 0.9))
    tint = mixc(K.ac, PAPER, 0.78)
    set_lines(F, ['%d TYPES' % len(K.items)], (4, 169, 90, 22), 'b5', K.ac, outline=[(1, WH)], maxk=2)
    F.rrect(96, 172, 74, 16, tint, r=3, line=K.ac); F.text('%d FIGURES' % len(K.reg), 133, 174, 'micro5', 1, INK, anchor='mt'); F.text('+ 1 SECRET', 133, 181, 'micro5', 1, INK, anchor='mt')
    F.rrect(174, 172, 74, 16, tint, r=3, line=K.ac); F.text(' '.join(K.ctx['burst']).replace('- ', ''), 211, 177, 'micro5', 1, INK, anchor='mt')
    F.rrect(252, 171, 62, 18, K.ac2 if lum(K.ac2) < 0.6 else deep(K.ac2, 0.45), r=3); F.text('%d YEN' % K.s['price'], 283, 177, 'b5', 1, WH, anchor='mt')
    n = len(K.items); cw = (W - 12) / n
    for k, it in enumerate(K.items):
        x0 = int(6 + cw * k) + 1; x1 = int(6 + cw * (k + 1)) - 2
        B.rrect(x0, 194, x1 - x0, 68, tint, r=4); B.rrect(x0 + 3, 208, x1 - x0 - 6, 51, 0xfdfbf4, r=3)
        ls = ['SECRET'] if it['secret'] else _wrap(it['name'], 'micro5', x1 - x0 - 4)
        for j, l in enumerate(ls[:2]): F.text(l, (x0 + x1) / 2, 196 + 6 * j - (3 if len(ls) == 1 else 0) + 3, 'micro5', 1, INK, anchor='mt')
        K.toy(K.pose(it['id'], 2), (x0 + x1) / 2, 256, 44, x1 - x0 - 10, sil=it['secret'], grade=0)
    K.strip(266, K.ac2)


# ============================================== FRUIT DRAGON: the scene photo framed by a motif, the footer band
def motif(K, S, y, h, front=False):
    if K.sid == 'nakanohito':  # film strip
        S.rect(0, y, W, h, 0x161414)
        for x in range(3, W, 10): S.rect(x, y + 2, 6, 3, 0xe8e0d0); S.rect(x, y + h - 5, 6, 3, 0xe8e0d0)
    elif K.sid == 'kabuki':  # joshiki-maku: black, persimmon, green
        for k, x in enumerate(range(0, W, 12)): S.rect(x, y, 12, h, (0x1e1c1c, 0xc8642a, 0x2f5a3a)[k % 3])
    elif K.sid == 'karakuri':  # wooden slats
        S.rect(0, y, W, h, 0x6a4424)
        for x in range(0, W, 8): S.rect(x, y, 1, h, 0x4a2c16)
        S.rect(0, y, W, 1, 0x8a5a30)
    else:  # screen tone
        S.rect(0, y, W, h, K.ac)
        for yy in range(y + 2, y + h, 4):
            for x in range(2 + (yy // 4) % 2 * 2, W, 4): S.rect(x, yy, 1, 1, mixc(K.ac, WH, 0.5))


def t_fruitdragon(K):
    B, M, F = K.B, K.M, K.F
    K.ground(B, (0, 0, W, 206), mixc(K.bg, PAPER, 0.4), t=0.9); K.decor('fruitdragon')
    motif(K, M, 0, 12)
    set_lines(F, [K.ctx['tagline'].upper()], (8, 15, 178, 11), 'b5', WH, outline=[(1, INK)], maxk=1)
    red = K.ac2 if K.sid != 'kabuki' else K.ac2
    K.logo(F, (8, 28, 176, 64), fill=K.ac if lum(K.ac) < 0.6 else K.ac2, outline=[(2, WH), (1, INK)], align='l', maxk=3)
    F.text(K.ctx['kind'], 12, 98, 'b5', 1, INK, outline=[(1, WH)])
    B.rect(0, 0, W, 1, WH)
    M.rrect(282, 16, 32, 64, WH, r=3); emblem(M, K.em, 292, 20, K.mcol, ink=INK, paper=WH)
    for j, t in enumerate(['WATCH', 'IT MOVE']): M.text(t, 298, 32 + 6 * j, 'micro5', 1, INK, anchor='mt')
    M.qr(287, 49, 1, sum(map(ord, K.sid)), INK, bg=WH)
    hb = K.toy(K.pose(K.hero['id'], 2), 226, 134, 118, 104)
    nm = _wrap(K.hero['name'], 'micro5', 70, 2)
    for j, l in enumerate(nm): F.text(l, 280, 112 + 7 * j, 'micro5', 1, INK, anchor='mt', outline=[(1, WH)])
    cw = (W - 16) / len(K.rest)
    for k, it in enumerate(K.rest):
        cx = 8 + cw * (k + .5)
        K.toy(K.pose(it['id'], 2), cx, 182, 46, cw - 8, sil=it['secret'], shadow=not it['secret'])
        ls = ['SECRET'] if it['secret'] else _wrap(it['name'], 'micro5', cw - 10)
        th = 6 * len(ls) + 3; F.rrect(cx - (cw - 12) / 2, 184, cw - 12, th, WH, r=2)
        for j, l in enumerate(ls): F.text(l, cx, 186 + 6 * j, 'micro5', 1, INK, anchor='mt')
    motif(K, F, 198, 8, front=True)
    K.footer(B, 206, deep(K.ac, 0.45), red)


# ================================================================= TAMAKERO: two modes of one toy, the line-up band
def t_tamakero(K):
    B, M, F = K.B, K.M, K.F
    B.rect(0, 0, W, H, PAPER)
    K.ground(B, (0, 50, W, 146), mixc(K.bg, K.ac, 0.12)); K.decor('tamakero')
    B.ellipse(3, 2, 48, 48, WH); B.ellipse(3, 2, 48, 48, WH, line=K.ac2, t=2)
    F.text('%d' % K.s['price'], 27, 11, 'b5', 2, K.ac2, anchor='mt'); F.text('YEN', 27, 27, 'micro5', 1, K.ac2, anchor='mt'); F.text('%d TYPES' % len(K.items), 27, 34, 'micro5', 1, INK, anchor='mt')
    K.logo(F, (56, 4, 204, 42), fill=K.tx if lum(K.tx) < 0.4 else INK, shadow=(1, 1, mixc(K.ac, PAPER, 0.5)), align='m', maxk=3)
    B.rrect(266, 6, 48, 18, K.ac2, r=3); set_lines(F, [K.initials], (268, 8, 44, 14), 'ps2p', WH, align='m', maxk=2)
    F.text('NEW IN', 290, 28, 'micro5', 1, INK, anchor='mt'); F.text('NOV 2026', 290, 35, 'micro5', 1, INK, anchor='mt')
    h = K.hero
    K.toy(h['id'], 86, 192, 132, 140)
    if K.sid == 'teruteru':  # the gimmick: hang it upside down
        F.rect(250, 50, 1, 14, INK); K.toy(h['id'], 250, 62, 92, 90, flip=True, top=True, shadow=False)
        badge = ('HANG IT', 'UPSIDE', 'DOWN!'); labels = (('SUNNY SIDE UP', 86), ('RAIN SIDE DOWN', 250))
    else:
        sec = next(i for i in K.reg if i is not h); K.toy(sec['id'], 250, 190, 96, 100)
        badge = ('ON ITS', 'WAY TO', 'YOU!'); labels = ((h['name'], 86), (sec['name'], 250))
    M.ellipse(146, 60, 60, 60, WH, line=K.ac2, t=2)
    d = M.d; c = rgb(K.ac2) + (255,)
    d.arc((150, 64, 202, 116), 200, 320, fill=c, width=3); d.arc((150, 64, 202, 116), 20, 140, fill=c, width=3)
    M.poly([(196, 70), (204, 82), (192, 82)], K.ac2); M.poly([(156, 110), (148, 98), (160, 98)], K.ac2)
    for j, t in enumerate(badge): F.text(t, 176, 77 + 9 * j, 'b5', 1, K.ac2, anchor='mt')
    for t, cx in labels:
        ls = _wrap(t, 'micro5', 80, 1); tw = line_mask(ls[0], 'micro5')[0].shape[1] + 8
        F.rrect(cx - tw / 2, 182, tw, 10, WH, r=2, line=K.ac); F.text(ls[0], cx, 184, 'micro5', 1, INK, anchor='mt')
    B.rect(0, 196, W, 60, mixc(K.ac, PAPER, 0.85))
    cw = (W - 12) / len(K.items); pills = [K.ac, K.ac2, deep(K.ac, 0.3), mixc(K.ac, K.ac2, 0.5)]
    for k, it in enumerate(K.items):
        cx = 6 + cw * (k + .5)
        K.toy(it['id'], cx, 238, 38, cw - 6, sil=it['secret'], shadow=not it['secret'], grade=0)
        ls = ['SECRET'] if it['secret'] else _wrap(it['name'], 'micro5', cw - 8)
        F.rrect(cx - cw / 2 + 3, 240, cw - 6, 6 * len(ls) + 3, pills[k % 4], r=3)
        for j, l in enumerate(ls): F.text(l, cx, 242 + 6 * j, 'micro5', 1, WH, anchor='mt')
    set_lines(F, [K.ctx['tagline'].upper()], (6, 256, 308, 11), 'b5', K.tx if lum(K.tx) < 0.4 else INK, align='m', maxk=1)
    K.strip(268, K.ac2)


# ============================================================== BIRD PHONE: an old print of the scene, hero + grid
def t_birdphone(K):
    B, M, F = K.B, K.M, K.F
    K.ground(B, (0, 0, W, 206), mixc(K.bg, PAPER, 0.3), t=0.9); K.decor('birdphone')
    for j, l in enumerate(_wrap(K.ctx['tagline'], 'b5', 136, 2)): F.text(l, 8, 8 + 10 * j, 'b5', 1, INK, outline=[(1, WH)])
    bb = K.logo(F, (146, 6, 132, 40), fill=K.ac2 if K.sid != 'tsuppari' else K.ac2, outline=[(1, WH)], shadow=(1, 1, INK), align='m', maxk=3)
    F.text(K.ctx['kind'], 212, bb[3] + 3, 'micro5', 1, INK, anchor='mt', outline=[(1, WH)])
    M.rrect(284, 6, 30, 50, WH, r=3); emblem(M, K.em, 293, 9, K.mcol, ink=INK, paper=WH); M.qr(287, 26, 1, sum(map(ord, K.sid)), INK, bg=WH)
    K.toy(K.hero['id'], 74, 200, 150, 136)
    nm = _wrap(K.hero['name'], 'micro5', 90, 2)
    for j, l in enumerate(nm): F.text(l, 74, 186 + 6 * j, 'micro5', 1, INK, anchor='mt', outline=[(1, WH)])
    rows = [K.rest[:3], K.rest[3:]]
    for r, row in enumerate(rows):
        cw = 56; x0 = 148 + (168 - cw * len(row)) / 2; foot = 124 + 70 * r
        for k, it in enumerate(row):
            cx = x0 + cw * (k + .5)
            K.toy(it['id'], cx, foot - 12, 52, cw - 6, sil=it['secret'], shadow=not it['secret'])
            K.names(F, it, cx, foot - 10, cw - 4, outline=[(1, WH)])
    B.rect(0, 206, W, H - 206, PAPER)
    K.footer(B, 206, mixc(K.ac, PAPER, 0.25), K.ac2)


# ======================================================== MANDRAKE: on location, bunting, a line-up of round frames
def t_mandrake(K):
    B, M, F = K.B, K.M, K.F
    K.ground(B, (0, 0, W, 262), {'sabaku': 0xd8b878, 'minato': 0x5a8ab0, 'datesha': 0x2a2a30}.get(K.sid, K.ac), t=0.85); K.decor('mandrake')
    pts = [(x, 6 + 6 * math.sin(math.pi * x / W)) for x in range(-4, W + 8, 22)]
    F.line(pts, 0x3a3030, 1)
    cols = [K.ac2, PAPER, K.ac]
    for k, (x, y) in enumerate(pts[:-1]):
        F.poly([(x + 2, y), (x + 20, y + 1), (x + 11, y + 18)], cols[k % 3]); F.line([(x + 2, y), (x + 20, y + 1)], 0x3a3030, 1)
    M.rect(282, 0, 30, 40, K.ac2); emblem(M, K.em, 291, 6, K.mcol, ink=INK, paper=WH); M.text('TOYS', 297, 22, 'micro5', 1, WH, anchor='mt'); M.text(K.initials, 297, 30, 'b5', 1, WH, anchor='mt')
    tl = title_lines(K.s['name'])
    F.text(tl[0] + ' COLLECTION' if len(tl) > 1 else 'COLLECTION', 14, 52, 'ala', 1, WH, outline=[(1, INK)])
    bb = K.logo(F, (12, 64, 176, 60), lines=[tl[-1]], fill=WH, outline=[(1, deep(K.ac, 0.3))], shadow=(2, 2, deep(K.ac, 0.5)), align='l', maxk=3)
    F.rrect(14, bb[3] + 6, 84, 14, K.ac, r=2, line=WH); F.text('%d TYPES' % len(K.items), 56, bb[3] + 10, 'b5', 1, WH, anchor='mt')
    F.text('%d YEN A TURN' % K.s['price'], 104, bb[3] + 10, 'micro5', 1, WH, outline=[(1, INK)])
    K.toy(K.hero['id'], 238, 176, 150, 128)
    nm = _wrap(K.hero['name'], 'micro5', 80, 2)
    for j, l in enumerate(nm): F.text(l, 300, 140 + 6 * j, 'micro5', 1, WH, anchor='rt', outline=[(1, INK)])
    n = len(K.rest); cw = (W - 12) / n
    for k, it in enumerate(K.rest):
        cx = 6 + cw * (k + .5); d = min(46, cw - 8)
        M.ellipse(cx - d / 2 - 2, 190, d + 4, d + 4, WH); M.ellipse(cx - d / 2, 192, d, d, mixc(K.bg, WH, 0.3))
        K.toy(it['id'], cx, 192 + d - 4, d + 10, d + 4, sil=it['secret'], shadow=False, grade=0.06)
        F.d.arc((int(cx - d / 2 - 2), 190, int(cx + d / 2 + 1), 190 + d + 3), 20, 160, fill=rgb(WH) + (255,), width=2)
        K.names(F, it, cx, 240, cw - 4, col=WH, outline=[(1, INK)])
    K.strip(262, K.ac2)


TEMPLATES = {'crabcan': t_crabcan, 'pipeotter': t_pipeotter, 'fruitdragon': t_fruitdragon,
             'tamakero': t_tamakero, 'birdphone': t_birdphone, 'mandrake': t_mandrake}


def card6(s, ref, ctx):
    K = Card(s, ctx)
    TEMPLATES[ref](K)
    return K.finish()
