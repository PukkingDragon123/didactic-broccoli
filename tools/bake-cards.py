#!/usr/bin/env python3
"""bake-cards.py: the gacha display cards (台紙) and toy packaging art, from the ACTUAL in-game toys.
tools/render-toys.mjs renders every toy that exists (the game's own meshes, catalogue lighting, transparent) into
shots/.art-cache/toys/<series>/<item>.png + lineup.json; this lays them out like a real 1999 capsule-toy card: the
series title, the figures composited on a real photo backdrop (Open Images CC BY 2.0 / the game's credited photos),
a numbered line-up strip (全N種, the secret as a printed silhouette), price, age mark and maker line, then printed on
real card stock (tools/paperkit.py). Re-run both after the toy line-up changes:
  tools/slot.sh node tools/render-toys.mjs && python3 -I tools/bake-cards.py [series,...]
Out: public/img/print/cards/<series>.webp (320 x 280, the size src/gfx/banner.js draws).
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageFilter
from printkit import Panel, CACHE, ROOT, mixc, rgb
import paperkit as PK

TOYS = os.path.join(CACHE, 'toys')
OUT = os.path.join(ROOT, 'public', 'img', 'print', 'cards')
W, H = 640, 560  # 2x the banner's 320 x 280 (src/gfx/banner.js draws the card at this size)
BACK = {  # series -> photo backdrop (focus x, y, zoom)
    'henshin': ('oi:8cf0d90fadf83514@test', (0.7, 0.35, 1.5)), 'hashigo': ('local:skyline.jpg', (0.5, 0.35, 1.2)),
    'teruteru': ('local:rain_window.jpg', (0.5, 0.5, 1.1)), 'kaden': ('oi:a15e83bbe9f87d4f@test', (0.4, 0.5, 1.15)),
    'otsukai': ('oi:34f24d2374c50c25@test', (0.5, 0.42, 1.2)), 'nakanohito': ('local:skyline.jpg', (0.72, 0.72, 1.6)),
    'tsuppari': ('commons:Nighttime_on_the_shotengai_(238464174).jpg', (0.55, 0.45, 1.2)), 'obakebaito': ('commons:Obake_Yashiki.jpg', (0.3, 0.36, 1.45)),
    'ekiin': ('commons:Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg', (0.62, 0.55, 1.15)),
    'kabuki': ('commons:Misono-za_Nagoya_March_2013_(2).JPG', (0.55, 0.42, 1.55)),
    'meijin': ('commons:Shimizuike_Park_playground.jpg', (0.55, 0.6, 1.25)),
    'sento': ('commons:Japanese_communal_bathhouse_SENTO_Sentō_銭湯の浴室.jpg', (0.32, 0.4, 1.25)),
    'otenki': ('commons:Japanese_Summer_(14646910072).jpg', (0.5, 0.32, 1.1)),
    'yomise': ('commons:夏祭り_Summer_Festival_(8413673378).jpg', (0.62, 0.42, 1.2)),
    'sabaku': ('commons:Sand_dunes_in_the_desert,_Sahara_Desert,_Dakhla_Oasis,_Egypt.jpg', (0.5, 0.5, 1.1)),
    'minato': ('commons:Maeganeku_fishing_port_3.jpg', (0.45, 0.55, 1.15)),
    'datesha': ('commons:Black_and_white_marble_tile_in_the_southeast_gallery_(5396530982).jpg', (0.5, 0.5, 1.25)),
}
COMMONS = {  # photos from Wikimedia Commons (credited in CREDITS.md / public/CREDITS.txt), fetched once into the cache
    'commons:Nighttime_on_the_shotengai_(238464174).jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Nighttime_on_the_shotengai_%28238464174%29.jpg/1280px-Nighttime_on_the_shotengai_%28238464174%29.jpg',
    'commons:Obake_Yashiki.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Obake_Yashiki.jpg/960px-Obake_Yashiki.jpg',
    'commons:Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg/1280px-Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg',
    'commons:Misono-za_Nagoya_March_2013_(2).JPG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Misono-za_Nagoya_March_2013_%282%29.JPG/960px-Misono-za_Nagoya_March_2013_%282%29.JPG',
    'commons:Shimizuike_Park_playground.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Combination_playground_equipment_at_Shimizuike_Park%28north_east%29_in_Takatsuki.jpg/1280px-Combination_playground_equipment_at_Shimizuike_Park%28north_east%29_in_Takatsuki.jpg',
    'commons:Japanese_communal_bathhouse_SENTO_Sentō_銭湯の浴室.jpg': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ec/Japanese_communal_bathhouse_SENTO_Sent%C5%8D_%E9%8A%AD%E6%B9%AF%E3%81%AE%E6%B5%B4%E5%AE%A4.jpg/1280px-Japanese_communal_bathhouse_SENTO_Sent%C5%8D_%E9%8A%AD%E6%B9%AF%E3%81%AE%E6%B5%B4%E5%AE%A4.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    'commons:Japanese_Summer_(14646910072).jpg': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Japanese_Summer_%2814646910072%29.jpg/1280px-Japanese_Summer_%2814646910072%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    'commons:夏祭り_Summer_Festival_(8413673378).jpg': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/%E5%A4%8F%E7%A5%AD%E3%82%8A_Summer_Festival_%288413673378%29.jpg/1280px-%E5%A4%8F%E7%A5%AD%E3%82%8A_Summer_Festival_%288413673378%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    'commons:Sand_dunes_in_the_desert,_Sahara_Desert,_Dakhla_Oasis,_Egypt.jpg': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Sand_dunes_in_the_desert%2C_Sahara_Desert%2C_Dakhla_Oasis%2C_Egypt.jpg/1280px-Sand_dunes_in_the_desert%2C_Sahara_Desert%2C_Dakhla_Oasis%2C_Egypt.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    'commons:Maeganeku_fishing_port_3.jpg': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/56/Maeganeku_fishing_port_3.jpg/1280px-Maeganeku_fishing_port_3.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    'commons:Black_and_white_marble_tile_in_the_southeast_gallery_(5396530982).jpg': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/da/Black_and_white_marble_tile_in_the_southeast_gallery_%285396530982%29.jpg/1280px-Black_and_white_marble_tile_in_the_southeast_gallery_%285396530982%29.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
}


def photo_ref(ref):
    """commons:<file> -> file:<cached path> (downloaded on first use); any other reference as it is."""
    if ref not in COMMONS:
        return ref
    p = os.path.join(CACHE, 'commons', ref.split(':', 1)[1])
    if not os.path.exists(p):
        import urllib.error
        import urllib.request
        os.makedirs(os.path.dirname(p), exist_ok=True)
        req = urllib.request.Request(COMMONS[ref], headers={'User-Agent': 'GachaGarageAssetBot/1.0 (generic client)'})
        import time
        for i in range(8):  # (Wikimedia rate-limits bursts: back off and retry)
            try:
                data = urllib.request.urlopen(req, timeout=120).read()  # (read first: a failed fetch leaves no empty file)
                break
            except urllib.error.HTTPError as e:
                if e.code != 429 or i == 7:
                    raise
                time.sleep(30 + 15 * i)
        with open(p, 'wb') as f:
            f.write(data)
    return 'file:' + p


INK = 0x1c1816; WHITE = 0xfbf8f1; RED = 0xc62a1f
RANK = {'secret': 4, 'ultra': 3, 'rare': 2, 'uncommon': 1, 'common': 0}


def hexc(s, d=0xf2e6cf):
    try: return int(str(s).lstrip('#'), 16)
    except Exception: return d


def toy(sid, iid):
    p = os.path.join(TOYS, sid, iid + '.png')
    if not os.path.exists(p): return None
    im = Image.open(p).convert('RGBA'); bb = im.getbbox()
    return im.crop(bb) if bb else None


# ================================================================== the card (the owner's gashapon boards, all English, pixel type)
# Laid out on a 320 x 280 pixel grid and printed 2x (640 x 560): every rule, badge, sticker and letter is a whole 2 x 2
# block; only the real photo backdrop and the real toy renders are at the full resolution.
from pixprint import Sheet, text_size, upscale, save_webp
from lettering import logo, emblem
import re

LW, LH = W // 2, H // 2
PH = 168          # the stage (photo + logo field) is y 0..PH; the line-up band PH..BY; the small print BY..LH
BY = 238
YEL = 0xffd23f; GOLD_ = 0xf2b42a
KIND_EN = {  # the card's catch ribbon (series data card.kind is the Japanese print)
    'datesha': 'STRANGE POSE ANIMAL FIGURE', 'minato': 'STRANGE POSE ANIMAL FIGURE', 'sabaku': 'STRANGE POSE ANIMAL FIGURE',
    'ekiin': 'STATION STAFF FIGURE', 'hashigo': 'STACKING PLAYSET', 'henshin': 'COMPLETE TRANSFORMATION FIGURE',
    'kabuki': 'YOKAI KABUKI FIGURE', 'kaden': 'APPLIANCE ANIMAL FIGURE', 'karakuri': 'WIND-UP AUTOMATON FIGURE',
    'kasabuki': 'TRANSFORMING UMBRELLA ARMS', 'meijin': 'PLAYGROUND MASTER FIGURE', 'nakanohito': 'MONSTER SUIT FIGURE',
    'obakebaito': 'HAUNTED HOUSE PLAYSET', 'otenki': 'WEATHER DELIVERY FIGURE', 'otsukai': 'LACQUER & GOLD LEAF FIGURE',
    'sento': 'BATHHOUSE REGULARS FIGURE', 'teruteru': 'BALL-CHAIN MASCOT', 'tsuppari': 'TOUGH-GUY ANIMAL FIGURE',
    'yomise': 'DEEP-SEA NIGHT STALL FIGURE',
}
BURST = {  # the round sticker on the stage
    'henshin': ('TRANS-', 'FORMS!'), 'kasabuki': ('TRANS-', 'FORMS!'), 'hashigo': ('PLAY', 'SET!'), 'obakebaito': ('PLAY', 'SET!'),
    'teruteru': ('BALL', 'CHAIN!'), 'karakuri': ('WIND', 'IT UP!'), 'nakanohito': ('WHO', 'INSIDE?'), 'kaden': ('IT', 'MOVES!'),
    'yomise': ('LIGHTS', 'UP!'), 'otsukai': ('GOLD', 'LEAF!'), 'kabuki': ('MIE!',), 'sabaku': ('POSE!',), 'minato': ('POSE!',),
    'datesha': ('POSE!',),
}
LOGO = {  # series -> the hand-lettered logotype (tools/lettering.py alphabet, lines, style); one effect only
    'henshin': ('ruler', [('STATIONERY', 1), ('BEASTS', 2)], dict(outline=(1, 0x1c1816), track=1, bounce=[0, 0, 1, 0, -1, 0, 0, 1, 0, 0])),
    'yomise': ('bubble', [('DEEP-SEA', 1), ('NIGHT', 2), ('STALLS', 2)], dict(outline=(1, 0x0c1020), track=1, bounce=[0, 1, 0, -1, 0, 1, 0, 0, -1, 0, 1, 0])),
}
TITLE_FACE = {'obakebaito': 'jacq24', 'kabuki': 'jacq24', 'otsukai': 'ala', 'karakuri': 'ps2p', 'otenki': 'ps2p'}
MAKERS = [  # original makers (no real brand): name, mark colour, emblem (tools/lettering.py EMBLEM, hand-drawn stamps)
    ('GACHA GARAGE TOYS', 0xd8402a, 'gg'), ('KOROKORO CAPSULE', 0x2f8a4a, 'koro'), ('TOY HUTCH', 0x2a5aa8, 'hutch'),
    ('POKKE WORKS', 0xe08a1a, 'pokke'), ('MARUMARU TOYS', 0x8a3a8a, 'maru'),
]
MAKER_OF = {'henshin': 0, 'nakanohito': 0, 'teruteru': 0, 'kaden': 1, 'otsukai': 3, 'yomise': 2, 'obakebaito': 4,
            'tsuppari': 2, 'ekiin': 1, 'kabuki': 4, 'meijin': 3, 'hashigo': 1, 'sento': 2, 'otenki': 3, 'sabaku': 4,
            'minato': 4, 'datesha': 4, 'karakuri': 0, 'kasabuki': 2}
WARN_EN = ('SMALL PARTS. NOT FOR CHILDREN UNDER 3 YEARS. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER YOUR HEAD. '
           'THE PICTURE MAY DIFFER FROM THE PRODUCT.')


def light(c, t=0.55): return mixc(c, 0xffffff, t)
def lum(v): return (0.3 * ((v >> 16) & 255) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255)) / 255


def meta(sid):
    """The series' English tagline and each figure's gimmick word, read from src/data/series/<sid>.js."""
    try: src = open(os.path.join(ROOT, 'src', 'data', 'series', sid + '.js'), encoding='utf-8').read()
    except OSError: return '', {}
    m = re.search(r"tagline:\s*(['\"])(.*?)\1,", src)
    gim, ids = {}, [(mm.start(), mm.group(1)) for mm in re.finditer(r"\bid:\s*'([^']+)',\s*name:", src)]
    for k, (pos, iid) in enumerate(ids):
        end = ids[k + 1][0] if k + 1 < len(ids) else len(src)
        g = re.search(r"gimmick:\s*\{\s*text:\s*(['\"])(.*?)\1", src[pos:end])
        if g: gim[iid] = g.group(2)
    return (m.group(2) if m else ''), gim


def split_title(name, face, maxw):
    """The series name in capitals, in one or two lines (at a colon, else at the most even word break)."""
    t = name.upper().replace('’', "'")
    if ':' in t: a, b = t.split(':', 1); return [a.strip(), b.strip()]
    if text_size(t, face)[0] <= maxw or ' ' not in t: return [t]
    words = t.split(' ')
    best = min(range(1, len(words)), key=lambda i: max(text_size(' '.join(words[:i]), face)[0], text_size(' '.join(words[i:]), face)[0]))
    return [' '.join(words[:best]), ' '.join(words[best:])]


def pattern(S, region, kind, col, seed=0):
    if kind == 'stripes': S.stripes(region, col, w=3, gap=5, slope=1)
    elif kind == 'grid':  # ruled lines (never crossed: no cross shapes on the print)
        S.stripes(region, col, w=1, gap=5, slope=None)
    elif kind == 'waves': S.stripes(region, col, w=2, gap=6, slope=None)  # (as the boards: dots and stripes only)
    else: S.dots(region, col, step=8, size=3)


def maker_mark(S, x, y, k, s=16, scale=1):
    name, col, em = MAKERS[k]
    emblem(S, em, x, y, col, scale=scale)
    return name


def wrap2(name, w, face='micro5'):
    """A figure's name in at most two lines of w px (long names keep their last words)."""
    words = name.upper().replace('’', "'").split(' ')
    if words[0] == 'THE' and len(words) > 1: words = words[1:]
    lines, cur = [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if cur and text_size(t, face)[0] > w: lines.append(cur); cur = wd
        else: cur = t
    lines.append(cur)
    return lines if len(lines) <= 2 else lines[-2:]


def card(s):
    sid = s['id']; c = s.get('card') or {}
    bg, acc, txt, acc2 = hexc(c.get('bg')), hexc(c.get('accent'), RED), hexc(c.get('text'), INK), hexc(c.get('accent2'), 0x2a5aa8)
    dark = lum(bg) < 0.45  # a night theme (yomise's navy, obakebaito's plum): the logo field and the line-up band print dark
    ltxt = txt if lum(txt) > 0.45 else 0xf2efe6  # (the light ink on a dark field)
    if lum(txt) > 0.45: txt = mixc(bg, 0, 0.55) if dark else INK  # the ink must read on the light print
    field, dots = (bg, mixc(bg, 0xffffff, 0.14)) if dark else (light(acc, 0.78), light(acc, 0.62))
    band, btxt = (bg, ltxt) if dark else (light(bg, 0.25), txt)
    ink = mixc(bg, 0, 0.7) if dark else INK
    tagline, gim = meta(sid)
    items = s['items']; n = len(items)
    rendered = [i for i in items if not i['secret'] and toy(sid, i['id']) is not None]
    hero = max(rendered, key=lambda i: RANK.get(i['rarity'], 0) * 0.6 + min(1.4, toy(sid, i['id']).height / max(1, toy(sid, i['id']).width))) if rendered else None
    seed = sum(map(ord, sid))

    # --- the photo stage, full resolution
    base = Image.new('RGB', (W, H), rgb(WHITE))
    ref, f = BACK.get(sid, ('oi:9a73ee8933d93045@test', (0.5, 0.5, 1.0)))
    from printkit import source, cover, printed
    base.paste(printed(cover(source(photo_ref(ref)), W, PH * 2, f), 1.05, 1.04, 1.04), (0, 0))

    # --- the print under the toys (pixel grid)
    B = Sheet(LW, LH, None)
    edge = [(150, 0), (164, 0), (118, PH), (104, PH)]
    fieldp = [(0, 0), (157, 0), (111, PH), (0, PH)]
    B.poly(fieldp, field); pattern(B, fieldp, c.get('pattern', 'dots'), dots, seed)
    B.poly(edge, acc2 if not dark else acc)
    B.poly([(164, 0), (167, 0), (121, PH), (118, PH)], ink)
    B.rect(0, PH, LW, BY - PH, band); B.rect(0, PH, LW, 2, ink); B.rect(0, PH + 2, LW, 2, acc)
    B.rect(0, BY, LW, LH - BY, 0xfbf8f1); B.rect(0, BY, LW, 1, ink)
    # line-up cells: a numbered disc and a name tag each
    cw = (LW - 8) / max(1, n)
    for k, it in enumerate(items):
        cx = 4 + cw * (k + 0.5)
        lines = ['SECRET'] if it['secret'] else wrap2(it['name'], int(cw) - 6)
        th = 3 + 6 * len(lines)
        tagc = (YEL if not dark else acc) if it['secret'] else (acc if not dark else acc2)
        B.rrect(cx - cw / 2 + 2, BY - th - 2, cw - 4, th, tagc, r=2)
        for j, l in enumerate(lines):
            B.text(l, cx, BY - th + 1 + 6 * j, 'micro5', 1, ink if it['secret'] else 0xfbf8f1, anchor='mt')
    # the small print: warning block, maker, address, code, barcode
    B.warning(4, BY + 3, 148, LH - BY - 6, ink=INK, paper=0xffe14a, text=WARN_EN)
    mk = MAKER_OF.get(sid, seed % len(MAKERS))
    mname = maker_mark(B, 157, BY + 4, mk, 14)
    B.text(mname, 175, BY + 5, 'silkb', 1, INK)
    B.text('TOY LINE 0120-00-1999', 175, BY + 13, 'micro5', 1, INK)
    B.qr(LW - 25, BY + 4, 1, seed, INK)
    B.barcode(162, BY + 25, '4970' + str(seed * 7919 % 10 ** 8).zfill(8), h=7, ink=INK, bg=0xfbf8f1)
    B.text('MADE IN JAPAN', LW - 4, LH - 4, 'micro5', 1, INK, anchor='rb')

    im = base.convert('RGBA'); im.alpha_composite(upscale(B.im, 2))

    # --- the toys (full resolution): the hero on the stage, the line-up in the band
    T = Sheet(W, H, None)
    hb = None
    if hero is not None:
        hb = T.toy(sid, hero['id'], 2 * 238, 2 * (PH + 4), h=2 * 150, w=2 * 128)
    for k, it in enumerate(items):
        cx = 4 + cw * (k + 0.5)
        lines = 1 if it['secret'] else len(wrap2(it['name'], int(cw) - 6))
        foot = BY - (3 + 6 * lines) - 4
        hh = foot - PH - 8
        if it['secret']:
            T.toy(sid, it['id'], 2 * cx, 2 * foot, h=2 * hh, w=2 * (cw - 10), silhouette=mixc(btxt, band, 0.25) if dark else txt)
        else:
            T.toy(sid, it['id'], 2 * cx, 2 * foot, h=2 * hh, w=2 * (cw - 10))
    im.alpha_composite(T.im)

    # --- the print over the toys: kind line, logotype, badges, one sticker, the hero's caption (pixel grid)
    F = Sheet(LW, LH, None)
    kind = KIND_EN.get(sid, 'MASCOT FIGURE')
    F.text(kind, 8, 8, 'silkb', 1, ltxt if dark else txt)
    y = 20; boxes = []
    if sid in LOGO:
        al, lines, kw = LOGO[sid]
        for j, (l, sc_) in enumerate(lines):
            b = logo(F, al, l, 6, y, sc_, acc if not dark else YEL, accent=acc2 if not dark else RED, accent2=ink, **kw)
            y = b[3] + 2; boxes.append(b)
    else:  # (series without their own logotype yet)
        face = TITLE_FACE.get(sid, 'jersey25')
        for l in split_title(s['name'], face, 150):
            b = F.text(l, 8, y, face, 1, acc if not dark else YEL, shadow=(1, 1, ink), maxw=200); y = b[3] + 4; boxes.append(b)
    busy = [(b[0] - 2, b[1] - 2, b[2] + 4, b[3] + 4) for b in boxes]
    # price / types / age
    by = PH - 37
    pw_ = text_size('%d' % s['price'], 'jersey20')[0]
    F.rrect(6, by, pw_ + 30, 32, YEL, r=2, line=ink)
    pb = F.text('%d' % s['price'], 11, by + 4, 'jersey20', 1, RED)
    F.text('YEN', pb[2] + 3, pb[3], 'silkb', 1, RED, anchor='lb')
    F.text('PER TURN', 6 + (pw_ + 30) // 2, by + 28, 'micro5', 1, ink, anchor='mb')
    x_ = 6 + pw_ + 33
    F.rect(x_, by, 44, 32, ink); F.rect(x_ + 1, by + 1, 42, 30, RED)
    nb = F.text(str(n), x_ + 5, by + 6, 'jersey20', 1, 0xfbf8f1)
    F.text('ALL', nb[2] + 3, by + 9, 'micro5', 1, 0xfbf8f1); F.text('TYPES', nb[2] + 3, by + 16, 'micro5', 1, 0xfbf8f1)
    x_ += 47
    F.rect(x_, by, 26, 32, ink); F.rect(x_ + 1, by + 1, 24, 30, 0xfbf8f1)
    F.text('AGES', x_ + 13, by + 5, 'micro5', 1, ink, anchor='mt'); F.text('15+', x_ + 13, by + 14, 'jersey10', 1, ink, anchor='mt')
    busy.append((0, by - 2, x_ + 30, by + 34))
    # the maker's stamp, top right
    maker_mark(F, LW - 28, 6, mk, scale=2)
    # one round sticker
    bw = BURST.get(sid, ('NEW!',))
    bx, byy = LW - 34, 58
    br = max(14, max(text_size(l, 'silkb')[0] for l in bw) // 2 + 4 + 2 * (len(bw) > 1))
    F.roundel(bx, byy, br, fill=YEL if acc != YEL else 0xfbf8f1, line=ink, t=1)
    for j, l in enumerate(bw): F.text(l, bx, byy + (j - (len(bw) - 1) / 2) * 9, 'silkb', 1, RED, anchor='mm')
    # the hero's name on a tag, one arrow to it
    if hb:
        x0, y0, x1, y1 = [v // 2 for v in hb]
        rows = wrap2(hero['name'], 92, 'silkb')
        tw = max(text_size(r, 'silkb')[0] for r in rows); th = 9 * len(rows) + 3
        tx = max(124, min(LW - tw - 10, x0 + 8 - tw))
        hit = lambda yy: any(not (tx + tw + 4 < a or tx - 4 > c_ or yy + th < b_ or yy - 3 > d_) for a, b_, c_, d_ in busy)
        cands = [int(y0 + (y1 - y0) * f_) for f_ in (0.42, 0.3, 0.55, 0.2, 0.66)] + list(range(30, PH - 20, 6))
        ty = next((yy for yy in cands if 26 <= yy <= PH - 12 - th and not hit(yy)), None)
        if ty is None: tx, ty = LW - tw - 8, PH - 46 - th  # no room by the logo: tuck it at the stage's right edge
        F.rect(tx - 4, ty - 3, tw + 8, th, ink); F.rect(tx - 3, ty - 2, tw + 6, th - 2, 0xfbf8f1)
        for j, r in enumerate(rows): F.text(r, tx, ty + 9 * j, 'silkb', 1, ink)
        hx, hy = x0 + (x1 - x0) * 0.42, y0 + (y1 - y0) * 0.5
        if hx > tx + tw + 4: ax, ay = tx + tw + 4, ty + th // 2 - 2
        elif hx < tx - 4: ax, ay = tx - 5, ty + th // 2 - 2
        else: ax, ay = tx + tw // 2, ty + th - 1
        if tx - 6 <= hx <= tx + tw + 6 and ty - 4 <= hy <= ty + th + 6: hy = min(y1 - 4, ty + th + 12)  # aim clear of the tag
        below = ay >= ty + th - 1  # leaving from the tag's foot: the curve dips, never back through the tag
        mid = ((ax + hx) / 2, max(ay, hy) + 6) if below else ((ax + hx) / 2 + 2, ay - 10)
        F.arrow([(ax, ay), mid, (hx, hy)], ink, t=1, head=3)
    # the secret's mark in the line-up
    for k, it in enumerate(items):
        if it['secret']: F.text('?', 4 + cw * (k + 0.5), PH + 24, 'ps2p', 2, YEL if dark else 0xfbf8f1, anchor='mm')
    im.alpha_composite(upscale(F.im, 2))
    return PK.age(im.convert('RGB'), paper='Paper001', grain_k=0.3, fade=0.03, seed=seed % 997).convert('RGB')


# ================================================================== the studio cards (POSTER-3, tools/pressworks.py)
# The same print studio as the posters: cream card stock, the series' own 2-3 inks (pressworks.PALETTES), the photo
# backdrop screened in those inks (a duotone on the 320 x 280 grid, printed 2x), a hand-pixelled logotype
# (tools/letterforms.py), the facts set as a ruled table instead of stickers. The toys are the real renders, in
# their true colours, at full resolution. Layout: the label column (left) and the stage (right), the numbered
# line-up, the small print (warning, maker, codes).
import pressworks as PW
import letterforms as LFm
STUDIO = {  # series -> palette, roles, backdrop tone, logotype lines, motif inks
    'henshin': dict(pal='schoolroom', field='paper', ink='cobalt', acc='pencil', hot='redpen', stage=('pencil', 'cobalt'),
                    under_k=0.42, tone=dict(lo=0.08, hi=0.8, gamma=1.0), logo=('draft', ['STATiONERY', 'BEASTS'], {}),
                    kind='TRANSFORMING ANIMAL FIGURE', catch='EVERY ONE TRANSFORMS',
                    blurb='STAPLERS, SHARPENERS AND PENS FROM A SHOWA DESK THAT UNFOLD INTO ANIMALS.'),
    'yomise': dict(pal='night-stall', field='deep', ink='deep', acc='aqua', hot='lantern', stage=('deep', 'lantern'),
                   tone=dict(lo=0.08, hi=0.6, gamma=0.8, invert=True), logo=('wire', ['DEEP-SEA', 'NiGHT STALLS'], dict(bounce=[0, 1, 0, -1, 0, 1, -1, 0])),
                   kind='DEEP-SEA NIGHT STALL FIGURE', catch='THE STALLS LIGHT UP'),
}


def wrap3(name, w, face='micro5'):
    """wrap2, also breaking long hyphenated words after their hyphen."""
    words = []
    for wd in name.upper().replace('’', "'").split(' '):
        if text_size(wd, face)[0] > w and '-' in wd:
            a, b = wd.split('-', 1); words += [a + '-', b]
        else: words.append(wd)
    if words[0] == 'THE' and len(words) > 1: words = words[1:]
    lines, cur = [], ''
    for wd in words:
        t = (cur + ('' if cur.endswith('-') else ' ') + wd).strip()
        if cur and text_size(t, face)[0] > w: lines.append(cur); cur = wd
        else: cur = t
    lines.append(cur)
    return lines[:3]


def card3(s):
    sid = s['id']; st = STUDIO[sid]; P = PW.PALETTES[st['pal']]
    pap = P['paper']; ink = P[st['ink']]; acc = P[st['acc']]; hot = P[st['hot']]
    dark = st['field'] != 'paper'
    fld = P[st['field']] if dark else pap
    on = pap if dark else ink           # type on the label column
    items = s['items']; n = len(items)
    rendered = [i for i in items if not i['secret'] and toy(sid, i['id']) is not None]
    hero = max(rendered, key=lambda i: RANK.get(i['rarity'], 0)) if rendered else None
    seed = sum(map(ord, sid))
    M = 6; SX = 150; SY = 146; LY = 149; BY = 236
    B = Sheet(LW, LH, pap)
    # the label column
    B.rect(M, M, SX - M - 3, SY - M, fld)
    # the stage: the real photo screened in the series' inks (flat underprint + halftone)
    under, top = st['stage']
    sw, sh = LW - M - SX, SY - M
    B.rect(SX, M, sw, sh, PW.tint(P[under], st.get('under_k', 1.0)))
    ref, f = BACK.get(sid, ('oi:9a73ee8933d93045@test', (0.5, 0.5, 1.0)))
    PW.halftone(B, photo_ref(ref), SX, M, sw, sh, P[top], T=4, over=not dark, f=f, **st['tone'])
    # label column type
    x = M + 6; y = M + 7
    B.text(st['kind'], x, y, 'micro5', 1, acc if dark else hot)
    al, lines, kw = st['logo']; y += 10
    for l in lines:
        bb = LFm.word(B, al, l, x, y, on if not dark else acc, accent=hot, accent2=hot if dark else acc, **kw); y = bb[3] + 4
    tagline, gim = meta(sid)
    y = B.para(tagline.upper() if tagline else st['catch'], x, y + 2, SX - M - 16, 'micro5', 1, hot if not dark else on, lh=7, maxy=y + 22)
    if st.get('blurb'): B.para(st['blurb'], x, y + 3, SX - M - 16, 'micro5', 1, on, lh=7, maxy=SY - 40)
    # the facts as a ruled table: price | types | age
    ty = SY - 34
    B.rect(x, ty, SX - M - 15, 1, on)
    pb = LFm.word(B, 'figs', '%d' % s['price'], x, ty + 5, on)
    B.text('YEN', pb[2] + 2, pb[1], 'b5', 1, acc if dark else hot); B.text('A TURN', pb[2] + 2, pb[1] + 9, 'micro5', 1, on)
    vx = pb[2] + 34
    B.rect(vx, ty + 4, 1, 21, on)
    nb = LFm.word(B, 'figs', str(n), vx + 5, ty + 5, on)
    B.text('TYPES', nb[2] + 2, nb[1], 'b5', 1, on); B.text('AGES 15+', nb[2] + 2, nb[1] + 9, 'micro5', 1, on)
    # the line-up: numbered cells on the paper
    B.rect(M, LY, LW - 2 * M, 1, ink)
    cw = (LW - 2 * M) / n
    for k, it in enumerate(items):
        cx = M + cw * (k + 0.5)
        B.text(str(k + 1), M + cw * k + 3, LY + 4, 'b5', 1, hot)
        lines_ = ['SECRET'] if it['secret'] else wrap3(it['name'], int(cw) - 6)
        for j, l in enumerate(lines_):
            B.text(l, cx, BY - 5 - 6 * (len(lines_) - j), 'micro5', 1, hot if it['secret'] else ink, anchor='mt')
        if k: B.rect(M + cw * k, LY + 4, 1, BY - LY - 8, PW.tint(ink, 0.3))
    B.rect(M, BY, LW - 2 * M, 1, ink)
    # the small print: the warning (ruled, one ink), maker, codes
    wy = BY + 4; ww = 150
    B.frame(M, wy, ww, LH - wy - M, ink)
    B.rect(M, wy, ww, 8, ink)
    tx = M + 3
    B.poly([(tx + 3, wy + 1), (tx + 6, wy + 7), (tx, wy + 7)], hot); B.rect(tx + 3, wy + 3, 1, 2, ink); B.rect(tx + 3, wy + 6, 1, 1, ink)
    B.text('WARNING', tx + 10, wy + 2, 'micro5', 1, pap); B.text('CHOKING HAZARD', M + ww - 3, wy + 2, 'micro5', 1, pap, anchor='rt')
    B.para('SMALL PARTS. NOT FOR CHILDREN UNDER 3. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER YOUR HEAD.', M + 3, wy + 11, ww - 6, 'micro5', 1, ink, lh=6, maxy=LH - M - 2)
    mk = MAKER_OF.get(sid, seed % len(MAKERS)); name, mcol, em = MAKERS[mk]
    emblem(B, em, M + ww + 6, wy + 1, hot, ink=ink, paper=pap)
    B.text(name, M + ww + 20, wy + 2, 'b5', 1, ink)
    B.text('TOY LINE 0120-00-1999', M + ww + 20, wy + 11, 'micro5', 1, ink)
    B.qr(LW - M - 21, wy + 2, 1, seed, ink, bg=pap)
    B.barcode(M + ww + 12, wy + 20, '4970' + str(seed * 7919 % 10 ** 8).zfill(8), h=8, ink=ink, bg=pap)
    B.text('MADE IN JAPAN', LW - M, LH - M + 1, 'micro5', 1, ink, anchor='rb')
    im = upscale(B.im.convert('RGB'), 2).convert('RGBA')
    # the toys, full resolution: the hero on the stage, the line-up in its cells
    T = Sheet(W, H, None)
    hb = None
    if hero is not None:
        hb = T.toy(sid, hero['id'], 2 * (SX + sw * 0.55), 2 * (SY - 6), h=2 * (sh - 22), w=2 * (sw - 20))
    for k, it in enumerate(items):
        cx = M + cw * (k + 0.5)
        nl = 1 if it['secret'] else len(wrap3(it['name'], int(cw) - 6))
        foot = BY - 7 - 6 * nl
        T.toy(sid, it['id'], 2 * cx, 2 * foot, h=2 * (foot - LY - 10), w=2 * (cw - 10), silhouette=ink if it['secret'] else None)
    im.alpha_composite(T.im)
    F = Sheet(LW, LH, None)
    for k, it in enumerate(items):
        if it['secret']:
            LFm.word(F, 'figs', '?', M + cw * (k + 0.5), (LY + BY) / 2 - 8, acc if not dark else hot, anchor='mm')
    if hb:  # the hero's name, a museum-label caption on a paper slip with one leader rule
        x0, y0, x1, y1 = [v // 2 for v in hb]
        nm = hero['name'].upper()
        tw = text_size(nm, 'micro5')[0]
        tx_, ty_ = LW - M - tw - 8, M + 6
        F.rect(tx_ - 3, ty_ - 3, tw + 6, 11, pap); F.text(nm, tx_, ty_, 'micro5', 1, ink)
        F.rect(tx_ + tw // 2, ty_ + 8, 1, max(0, int(y0 + (y1 - y0) * 0.25) - ty_ - 8), pap)
    im.alpha_composite(upscale(F.im, 2))
    return PK.age(im.convert('RGB'), paper='Paper001', grain_k=0.3, fade=0.03, seed=seed % 997).convert('RGB')


# ================================================================== the board cards (POSTER-4: the owner's gashapon boards)
# Bright candy colours sampled from the owner's reference cards (pressworks.BOARD), the real photo backdrop in full
# colour with a white print border, the hero toy big and breaking out of it, a pixel logotype in one colour with a
# white die-cut border, badge row (price / N types / age), the line-up on name tags, the warning block, maker, codes.
CARD4 = {
    'henshin': dict(board='morokoshi', field='yellow', logo_c2='red', logo_c='leaf', tagc='leaf', hot='red', ink='ink', paper='cream',
                    logo=('chochin20', ['STATIONERY', 'BEASTS'], dict(bounce=[0, -1, 1, 0, -1, 1, 0, -1, 1, 0])), kind='TRANSFORMING ANIMAL FIGURE', pattern='stripes',
                    blurb='STAPLERS, SHARPENERS AND PENS THAT UNFOLD INTO ANIMALS!'),
    'yomise': dict(board='kaju-dragon', field='sky', logo_c2='red', logo_c='forest', tagc='forest', hot='red', ink='ink', paper='white',
                   logo=('chochin20', ['DEEP-SEA', 'NIGHT', 'STALLS'], dict(bounce=[0, 1, -1, 0, 1, -1, 0, 1, -1, 0, 1, -1], track=1)), kind='DEEP-SEA NIGHT STALL FIGURE', pattern='dots',
                   blurb='NO ELECTRICITY DOWN HERE: EVERY STALL BRINGS ITS OWN LIGHT!'),
}


def card4(s):
    """The board card: white stock with a playful pattern, the photo stage right, the hero toy big and breaking out of
    it, a HUGE two-line logo in one colour with a fat white die-cut border overlapping stage and figure, the badge
    row, the line-up on name tags, the small print."""
    from printkit import source, cover, printed
    from PIL import ImageDraw
    sid = s['id']; st = CARD4[sid]; P = PW.BOARD[st['board']]
    fld = P[st['field']]; lc = P[st['logo_c']]; tc = P[st['tagc']]; hot = P[st['hot']]; ink = P[st['ink']]
    WH = 0xffffff
    items = s['items']; n = len(items)
    rendered = [i for i in items if not i['secret'] and toy(sid, i['id']) is not None]
    hero = max(rendered, key=lambda i: RANK.get(i['rarity'], 0)) if rendered else None
    seed = sum(map(ord, sid))
    M = 5; SX = 150; SY0 = 22; SY = 158; BY = 238
    # the stock: white with the pattern in a light tint of the field colour
    Bg = Sheet(LW, LH, WH)
    light = PW.tint(fld, 0.28, WH)
    if st['pattern'] == 'stripes': Bg.stripes((0, 0, LW, LH), light, w=4, gap=6, slope=1)
    else: Bg.dots((0, 0, LW, LH), light, step=8, size=3)
    base = upscale(Bg.im, 2).convert('RGB')
    sw, sh = LW - M - SX - 2, SY - SY0
    ImageDraw.Draw(base).rectangle((2 * (SX - 3), 2 * (SY0 - 3), 2 * (SX + sw + 3) - 1, 2 * (SY0 + sh + 3) - 1), fill=rgb(fld))
    ImageDraw.Draw(base).rectangle((2 * (SX - 2), 2 * (SY0 - 2), 2 * (SX + sw + 2) - 1, 2 * (SY0 + sh + 2) - 1), fill=rgb(WH))
    ref, f = BACK.get(sid, ('oi:9a73ee8933d93045@test', (0.5, 0.5, 1.0)))
    base.paste(printed(cover(source(photo_ref(ref)), 2 * sw, 2 * sh, f), 1.18, 1.08, 1.08), (2 * SX, 2 * SY0))
    B = Sheet(LW, LH, None)
    # the badge row
    x = M + 3; by = SY - 30
    B.rrect(x, by, 62, 28, WH, r=2, line=ink)
    pb = LFm.word(B, 'figs', '%d' % s['price'], x + 4, by + 5, hot)
    B.text('YEN', pb[2] + 2, pb[1], 'b5', 1, hot); B.text('A TURN', pb[2] + 2, pb[1] + 10, 'micro5', 1, ink)
    tx = x + 65
    B.rrect(tx, by, 40, 28, hot, r=2, line=ink)
    nb = LFm.word(B, 'figs', str(n), tx + 4, by + 5, WH)
    B.text('ALL', nb[2] + 3, by + 7, 'micro5', 1, WH); B.text('TYPES', nb[2] + 3, by + 15, 'micro5', 1, WH)
    ax = tx + 43
    B.rrect(ax, by, 26, 28, WH, r=2, line=ink)
    B.text('AGES', ax + 13, by + 6, 'micro5', 1, ink, anchor='mt'); B.text('15+', ax + 13, by + 15, 'b5', 1, ink, anchor='mt')
    # the line-up on name tags, straight on the patterned stock
    LY = SY + 6
    cw = (LW - 2 * M) / n
    for k, it in enumerate(items):
        cx = M + cw * (k + 0.5)
        lines_ = ['SECRET'] if it['secret'] else wrap3(it['name'], int(cw) - 8)
        th = 3 + 6 * len(lines_)
        B.rrect(cx - cw / 2 + 3, BY - th - 3, cw - 6, th, hot if it['secret'] else tc, r=2, line=WH)
        for j, l in enumerate(lines_): B.text(l, cx, BY - th - 1 + 6 * j, 'micro5', 1, WH, anchor='mt')
    # the small print
    wy = BY + 2; ww = 150
    B.rrect(M, wy, ww, LH - wy - M, WH, r=1, line=hot)
    B.rect(M + 1, wy + 1, ww - 2, 8, hot)
    t0 = M + 4; yel = P.get('yellow', P.get('mustard'))
    B.poly([(t0 + 3, wy + 2), (t0 + 6, wy + 8), (t0, wy + 8)], yel); B.rect(t0 + 3, wy + 4, 1, 2, ink); B.rect(t0 + 3, wy + 7, 1, 1, ink)
    B.text('WARNING', t0 + 10, wy + 3, 'micro5', 1, WH); B.text('CHOKING HAZARD', M + ww - 3, wy + 3, 'micro5', 1, WH, anchor='rt')
    B.para('SMALL PARTS. NOT FOR CHILDREN UNDER 3. DO NOT PUT THE CAPSULE IN YOUR MOUTH OR OVER YOUR HEAD.', M + 3, wy + 12, ww - 6, 'micro5', 1, ink, lh=6, maxy=LH - M - 2)
    mk = MAKER_OF.get(sid, seed % len(MAKERS)); name, mcol, em = MAKERS[mk]
    B.rrect(M + ww + 3, wy, LW - 2 * M - ww - 3, LH - wy - M, WH, r=1, line=ink)
    emblem(B, em, M + ww + 7, wy + 3, mcol, ink=ink, paper=WH)
    B.text(name, M + ww + 21, wy + 4, 'b5', 1, ink)
    B.qr(LW - M - 23, wy + 4, 1, seed, ink, bg=WH)
    B.barcode(M + ww + 13, wy + 18, '4970' + str(seed * 7919 % 10 ** 8).zfill(8), h=8, ink=ink, bg=WH)
    im = base.convert('RGBA'); im.alpha_composite(upscale(B.im, 2))
    # the toys: the hero big, breaking out of the stage at the top and the foot
    T = Sheet(W, H, None)
    if hero is not None:
        T.toy(sid, hero['id'], 2 * (SX + sw * 0.56), 2 * (SY + 14), h=2 * (sh + 34), w=2 * (sw + 10))
    for k, it in enumerate(items):
        cx = M + cw * (k + 0.5)
        nl = 1 if it['secret'] else len(wrap3(it['name'], int(cw) - 8))
        foot = BY - 6 - 6 * nl - 3
        T.toy(sid, it['id'], 2 * cx, 2 * foot, h=2 * (foot - LY - 2), w=2 * (cw - 6), silhouette=ink if it['secret'] else None)
    im.alpha_composite(T.im)
    # over everything: the kind tag, the HUGE logo (fat white die-cut border), the secret's ?, the hero's name
    F = Sheet(LW, LH, None)
    F.tag(M + 3, M + 3, st['kind'], fill=hot, ink=WH, line=WH, face='micro5', pad=2)
    al, lines, kw = st['logo']; y = M + 18
    for j, l in enumerate(lines):
        bb = LFm.word(F, al, l, M + 6 + (j % 2) * 10, y, lc if j % 2 == 0 else P[st['logo_c2']], border=(3, WH), **kw); y = bb[3] + 7
    for k, it in enumerate(items):
        if it['secret']: LFm.word(F, 'figs', '?', M + cw * (k + 0.5), (LY + BY) / 2 - 10, yel, anchor='mm', border=(1, WH))
    if hero is not None:
        F.tag(LW - M - 4, SY0 + 4, hero['name'].upper(), fill=WH, ink=ink, line=ink, face='micro5', anchor='rt', pad=2)
    im.alpha_composite(upscale(F.im, 2))
    return PK.age(im.convert('RGB'), paper='Paper001', grain_k=0.25, fade=0.0, seed=seed % 997).convert('RGB')


if __name__ == '__main__':
    L = json.load(open(os.path.join(TOYS, 'lineup.json')))
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    for sid, s in L.items():
        if only and sid not in only: continue
        if not os.path.exists(os.path.join(ROOT, 'src', 'data', 'series', sid + '.js')): continue  # a retired series
        im = card4(s) if sid in CARD4 else card(s); save_webp(im, os.path.join(OUT, sid + '.webp'), near=False, quality=92)
        print('card', sid, len(s['items']))
