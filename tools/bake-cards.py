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
TITLE_FACE = {'obakebaito': 'jacq24', 'kabuki': 'jacq24', 'otsukai': 'ala', 'karakuri': 'ps2p', 'otenki': 'ps2p'}
MAKERS = [  # original makers (no real brand): name, mark colour, initials ('' = the capsule mark)
    ('GACHA GARAGE TOYS', 0xd8402a, ''), ('KOROKORO CAPSULE', 0x2f8a4a, 'KC'), ('TOY HUTCH', 0x2a5aa8, 'TH'),
    ('POKKE WORKS', 0xe08a1a, 'PW'), ('MARUMARU TOYS', 0x8a3a8a, 'MM'),
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


def maker_mark(S, x, y, k, s=16):
    name, col, ini = MAKERS[k]
    S.rrect(x, y, s, s, col, r=3)
    if ini: S.text(ini, x + s // 2, y + s // 2, 'silkb', 1, 0xfbf8f1, anchor='mm')
    else: S.capsule(x + 2, y + 2, s - 4, top=0xfbf8f1, bot=col, line=0xfbf8f1)
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

    # --- the print over the toys: the logo, badges, sticker, captions and arrows (pixel grid)
    F = Sheet(LW, LH, None)
    kind = KIND_EN.get(sid, 'MASCOT FIGURE')
    kw = text_size(kind, 'silkb')[0]
    F.ribbon(5, 6, kw + 16, 11, ink, notch='r')
    F.text(kind, 9, 9, 'silkb', 1, 0xfbf8f1)
    face = TITLE_FACE.get(sid, 'jersey25')
    lines = split_title(s['name'], face, 150)
    if face == 'jersey25' and max(text_size(l, face)[0] for l in lines) > 196: face = 'jersey20'
    if face == 'jersey20' and max(text_size(l, face)[0] for l in lines) > 196: face = 'jersey15'
    sc = 2 if face in ('ala', 'ps2p') else 1
    if face == 'ps2p': sc = 3 if max(text_size(l, face)[0] for l in lines) * 3 <= 190 else 2
    y = 24
    ol = [(1, ink), (2, 0xfbf8f1), (1, ink)]
    busy = []  # boxes already printed on the stage (the hero's caption keeps clear of them)
    for l in lines:
        b = F.text(l, 8, y, face, sc, acc if not dark else YEL, outline=ol, shadow=(3, 3, ink), maxw=200)
        busy.append((b[0] - 4, b[1] - 4, b[2] + 7, b[3] + 7))
        y = b[3] + 9
    tag = re.split(r'[:.!?]\s', tagline.upper().replace('’', "'"))[0].strip(' .')
    if tag and tag.split(' ')[0] not in kind and text_size(tag, 'silkb')[0] < 236:
        y += 3
        words, rows, cur = tag.split(' '), [], ''
        for wd in words:
            t = (cur + ' ' + wd).strip()
            if cur and text_size(t, 'silkb')[0] > 118: rows.append(cur); cur = wd
            else: cur = t
        rows.append(cur)
        rw = max(text_size(r, 'silkb')[0] for r in rows)
        F.rect(6, y - 3, rw + 8, 9 * len(rows) + 3, 0xfbf8f1 if not dark else ink); F.frame(6, y - 3, rw + 8, 9 * len(rows) + 3, ink)
        F.rect(8, y - 3 + 9 * len(rows) + 3, rw + 8, 2, ink)
        for j, r in enumerate(rows): F.text(r, 10, y + 9 * j, 'silkb', 1, ink if not dark else ltxt)
        busy.append((6, y - 3, rw + 16, y + 9 * len(rows) + 2))
    # price / types / age, the Qualia stack
    by = PH - 37
    pw_ = text_size('%d' % s['price'], 'jersey20')[0]
    F.rrect(6, by, pw_ + 30, 32, YEL, r=3, line=ink)
    pb = F.text('%d' % s['price'], 11, by + 4, 'jersey20', 1, RED)
    F.text('YEN', pb[2] + 3, pb[3], 'silkb', 1, RED, anchor='lb')
    F.text('PER TURN', 6 + (pw_ + 30) // 2, by + 28, 'micro5', 1, ink, anchor='mb')
    x_ = 6 + pw_ + 33
    F.rrect(x_, by, 44, 32, RED, r=3, line=ink)
    nb = F.text(str(n), x_ + 5, by + 6, 'jersey20', 1, 0xfbf8f1)
    F.text('ALL', nb[2] + 3, by + 9, 'micro5', 1, 0xfbf8f1)
    F.text('TYPES', nb[2] + 3, by + 16, 'micro5', 1, 0xfbf8f1)
    x_ += 47
    F.rrect(x_, by, 26, 32, 0xfbf8f1, r=3, line=ink)
    F.text('AGES', x_ + 13, by + 5, 'micro5', 1, ink, anchor='mt')
    F.text('15+', x_ + 13, by + 14, 'jersey10', 1, ink, anchor='mt')
    busy.append((0, by - 2, x_ + 30, by + 34))
    # the maker's mark, top right (as the boards carry theirs)
    F.rrect(LW - 25, 4, 21, 21, 0xfbf8f1, r=3, line=ink)
    maker_mark(F, LW - 22, 7, mk, 15)
    # the sticker
    bw = BURST.get(sid, ('NEW!',))
    bx, byy = LW - 38, 54
    br = max(15, max(text_size(l, 'silkb')[0] for l in bw) // 2 + 5 + 2 * (len(bw) > 1))
    F.roundel(bx, byy, br, fill=YEL if acc != YEL else 0xfbf8f1, line=ink, t=2, shadow=(2, 2, ink))
    for j, l in enumerate(bw):
        F.text(l, bx, byy + (j - (len(bw) - 1) / 2) * 9, 'silkb', 1, RED, anchor='mm')
    # the hero's caption: its name on a tag, its gimmick, an arrow to it, and a size bar
    if hb:
        x0, y0, x1, y1 = [v // 2 for v in hb]
        rows = wrap2(hero['name'], 92, 'silkb')
        g = (gim.get(hero['id']) or '').upper().replace('’', "'")
        tw = max(text_size(r, 'silkb')[0] for r in rows); th = 9 * len(rows) + 3
        tx = max(124, min(LW - tw - 10, x0 + 8 - tw))
        hit = lambda yy: any(not (tx + tw + 4 < a or tx - 4 > c_ or yy + th + 9 < b_ or yy - 3 > d_) for a, b_, c_, d_ in busy)
        cands = [int(y0 + (y1 - y0) * f_) for f_ in (0.42, 0.3, 0.55, 0.2, 0.66)] + list(range(30, PH - 20, 6))
        ty = next((yy for yy in cands if 26 <= yy <= PH - 12 - th and not hit(yy)), cands[0])
        F.rrect(tx - 4, ty - 3, tw + 8, th, 0xfbf8f1, r=2, line=ink)
        for j, r in enumerate(rows): F.text(r, tx, ty + 9 * j, 'silkb', 1, ink)
        if g:
            gw = text_size(g, 'micro5')[0]
            F.rrect(tx - 2, ty + th - 2, gw + 6, 9, RED, r=2, line=ink)
            F.text(g, tx + 1, ty + th, 'micro5', 1, 0xfbf8f1)
        ax, ay = tx + tw - 2, ty + th // 2 - 2
        hx, hy = x0 + (x1 - x0) * 0.42, y0 + (y1 - y0) * 0.5
        F.arrow([(ax + 4, ay), ((ax + hx) / 2 + 2, ay - 12), (hx, hy)], ink, t=1, head=3, outline=0xfbf8f1)
        # size bar (skipped where the sticker sits)
        sx = min(LW - 6, x1 + 4)
        if not (abs(sx - bx) < br + 4 and y0 < byy + br):
            F.rect(sx, y0, 1, y1 - y0, ink); F.rect(sx - 2, y0, 5, 1, ink); F.rect(sx - 2, y1 - 1, 5, 1, ink)
            F.rrect(sx - 9, (y0 + y1) // 2 - 5, 19, 10, 0xfbf8f1, r=2, line=ink)
            F.text('5CM', sx + 1, (y0 + y1) // 2, 'micro5', 1, ink, anchor='mm')
    # line-up: numbered discs, the gimmick words, the secret's '?'
    for k, it in enumerate(items):
        cx = 4 + cw * (k + 0.5); x = int(cx - cw / 2) + 3
        F.ellipse(x, PH + 7, 9, 9, ink); F.text(str(k + 1), x + 5, PH + 12, 'micro5', 1, 0xfbf8f1, anchor='mm')
        if it['secret']:
            F.text('?', cx, PH + 26, 'ps2p', 2, 0xfbf8f1 if not dark else YEL, anchor='mm', outline=[(1, ink)])
        else:
            g = (gim.get(it['id']) or '').upper().replace('’', "'")
            if g and text_size(g, 'micro5')[0] < cw - 18 and list(gim.values()).count(gim.get(it['id'])) == 1:
                F.text(g, int(cx + cw / 2) - 3, PH + 8, 'micro5', 1, acc2 if not dark else YEL, anchor='rt', outline=[(1, 0xfbf8f1 if not dark else ink, 'plus')])
    im.alpha_composite(upscale(F.im, 2))
    return PK.age(im.convert('RGB'), paper='Paper001', grain_k=0.3, fade=0.03, seed=seed % 997).convert('RGB')


if __name__ == '__main__':
    L = json.load(open(os.path.join(TOYS, 'lineup.json')))
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    for sid, s in L.items():
        if only and sid not in only: continue
        if not os.path.exists(os.path.join(ROOT, 'src', 'data', 'series', sid + '.js')): continue  # a retired series
        im = card(s); save_webp(im, os.path.join(OUT, sid + '.webp'), near=False, quality=92)
        print('card', sid, len(s['items']))
