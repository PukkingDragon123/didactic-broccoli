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
}
COMMONS = {  # photos from Wikimedia Commons (credited in CREDITS.md / public/CREDITS.txt), fetched once into the cache
    'commons:Nighttime_on_the_shotengai_(238464174).jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Nighttime_on_the_shotengai_%28238464174%29.jpg/1280px-Nighttime_on_the_shotengai_%28238464174%29.jpg',
    'commons:Obake_Yashiki.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Obake_Yashiki.jpg/960px-Obake_Yashiki.jpg',
    'commons:Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg/1280px-Shin-keisei-railway-Futawamukodai-station-platform-20100101.jpg',
    'commons:Misono-za_Nagoya_March_2013_(2).JPG': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Misono-za_Nagoya_March_2013_%282%29.JPG/960px-Misono-za_Nagoya_March_2013_%282%29.JPG',
    'commons:Shimizuike_Park_playground.jpg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Combination_playground_equipment_at_Shimizuike_Park%28north_east%29_in_Takatsuki.jpg/1280px-Combination_playground_equipment_at_Shimizuike_Park%28north_east%29_in_Takatsuki.jpg',
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


MAKER = ('ガチャガレージ玩具', 'GACHA GARAGE TOYS')
WARN = '小さな部品があります。3才未満のお子様には絶対に与えないでください。窒息などの危険があります。カプセルを口に入れたり、かぶったりしないでください。'


def light(c, t=0.55): return mixc(c, 0xffffff, t)


def qr(P, x, y, s, seed):
    """A printed 2D code (21 x 21 modules with its three finder squares), laid in on whole pixels."""
    import random; rn = random.Random(seed); m = s / 21
    P.rect(x - 3, y - 3, s + 6, s + 6, 0xffffff)
    for j in range(21):
        for i in range(21):
            f = (i < 7 and j < 7) or (i > 13 and j < 7) or (i < 7 and j > 13)
            if f:
                ii, jj = i % 14 if i > 13 else i, j % 14 if j > 13 else j
                on = ii in (0, 6) or jj in (0, 6) or (2 <= ii <= 4 and 2 <= jj <= 4)
            else: on = rn.random() < 0.5
            if on: P.rect(x + i * m, y + j * m, m + 0.3, m + 0.3, INK)


def logo(P, text, x, y, size, fill, shadow, maxw):
    """The chunky series logo: a heavy face, a thick white die-line round it and a flat offset shadow (no glow)."""
    P.text(text, 'mochiy', size, x + size * 0.07, y + size * 0.08, shadow, anchor='lm', stroke=(size * 0.11, shadow), maxw=maxw)
    P.text(text, 'mochiy', size, x, y, fill, anchor='lm', stroke=(size * 0.11, 0xffffff), maxw=maxw)


def card(s):
    c = s.get('card') or {}
    bg, acc, txt, acc2 = hexc(c.get('bg')), hexc(c.get('accent'), RED), hexc(c.get('text'), INK), hexc(c.get('accent2'), 0x2a5aa8)
    lum = lambda v: (0.3 * ((v >> 16) & 255) + 0.59 * ((v >> 8) & 255) + 0.11 * (v & 255)) / 255
    dark = lum(bg) < 0.45  # a night theme (yomise's navy, obakebaito's plum): the logo field and the line-up band print dark
    ltxt = txt if lum(txt) > 0.45 else 0xf2efe6  # (the light ink on a dark field)
    if lum(txt) > 0.45: txt = mixc(bg, 0, 0.55) if dark else INK  # the ink must read on the light print
    field, dots = (bg, mixc(bg, 0xffffff, 0.14)) if dark else (light(acc, 0.78), light(acc, 0.6))
    band, btxt = (bg, ltxt) if dark else (light(bg, 0.25), txt)
    items = s['items']; n = len(items)
    rendered = [i for i in items if not i['secret'] and toy(s['id'], i['id']) is not None]
    # the hero: the rarest figure that stands up well (a tall render), so the card leads with something that reads
    hero = max(rendered, key=lambda i: RANK.get(i['rarity'], 0) * 0.6 + min(1.4, toy(s['id'], i['id']).height / max(1, toy(s['id'], i['id']).width))) if rendered else None
    P = Panel(W, H, WHITE)
    # --- the stage: a real photo, bright as print; a colour field with a dot screen down the left for the logo
    ref, f = BACK.get(s['id'], ('oi:9a73ee8933d93045@test', (0.5, 0.5, 1.0)))
    P.photo(photo_ref(ref), 0, 0, W, 360, f=f, sat=1.05, con=1.04, bright=1.06)
    P.poly([(0, 0), (330, 0), (250, 360), (0, 360)], field)
    for yy in range(8, 360, 14):
        for xx in range(8, 330 - int(yy * 80 / 360) - 6, 14): P.ellipse(xx, yy, 4, 4, dots)
    # --- logo + subtitle
    title = s['jp']
    parts = [title] if len(title) <= 6 else [title[:len(title) // 2 + len(title) % 2], title[len(title) // 2 + len(title) % 2:]]
    for k, t in enumerate(parts): logo(P, t, 22, 70 + k * 74, 62 if len(parts) > 1 else 70, acc, mixc(bg, 0, 0.5) if dark else txt, 290)
    yb = 70 + len(parts) * 74 - 22
    P.rect(22, yb, 210, 30, acc2 if dark else txt); P.text((s.get('card') or {}).get('kind') or 'マスコットフィギュア', 'kakub', 16, 127, yb + 15, 0xffffff)
    P.text(s['name'].upper(), 'bebas', 18, 24, yb + 50, ltxt if dark else txt, anchor='lm', track=1)
    # --- price and count badges, the age box
    P.rect(22, 268, 74, 56, 0xffd23f); P.rect(22, 268, 74, 56, txt, line=2)
    P.text('%d' % s['price'], 'bebas', 34, 52, 292, RED, anchor='mm'); P.text('円', 'kakub', 14, 84, 300, RED)
    P.text('1回', 'kakub', 10, 59, 316, txt)
    P.rect(102, 268, 64, 56, RED); P.text('全%d種' % n, 'kaku', 20, 134, 296, 0xffffff)
    P.rect(172, 268, 70, 56, 0xffffff); P.rect(172, 268, 70, 56, txt, line=2)
    P.text('対象年齢', 'kakub', 11, 207, 284, txt); P.text('15才以上', 'kakub', 14, 207, 306, txt)
    # --- line-up band with each figure's name
    P.rect(0, 360, W, 112, band); P.rect(0, 360, W, 4, acc)
    cw = (W - 20) / max(1, n)
    for k, it in enumerate(items):
        nm = 'シークレット' if it['secret'] else (it.get('jp') or it['name'])
        P.text(nm, 'kakub', 10 if len(nm) <= 8 else 8.5, 10 + cw * (k + 0.5), 460, btxt, maxw=cw - 6)
    # --- the small print: warning block, maker, code, barcode
    P.rect(0, 472, W, 88, 0xffffff); P.rect(0, 472, W, 2, txt)
    P.rect(10, 480, 300, 72, 0xffe14a); P.rect(10, 480, 300, 72, txt, line=1.5)
    P.rect(16, 485, 64, 18, txt); P.text('注意', 'kakub', 11, 48, 494, 0xffe14a)
    P.text('WARNING', 'bebas', 13, 90, 494, txt, anchor='lm', track=1)
    P.lines(WARN, 'kakum', 7.5, 16, 507, 288, txt, lh=10, maxy=550)
    P.text(MAKER[0], 'kaku', 14, 326, 494, txt, anchor='lm'); P.text(MAKER[1], 'bebas', 12, 326, 512, txt, anchor='lm', track=1)
    P.text('汐見市本町2-14  お客様相談室 0120-00-1999', 'kakum', 7, 326, 530, txt, anchor='lm')
    qr(P, 590, 484, 40, hash(s['id']) % 9973)
    P.barcode(470, 524, '4970' + str(abs(hash(s['id'])) % 10**8).zfill(8), h=16)
    im = P.image().convert('RGBA')
    # --- the toys: the hero big on the photo, the full line-up in the band (secret: a flat ink silhouette)
    if hero is not None:
        t = toy(s['id'], hero['id']); k_ = min(290 / t.height, 300 / t.width, 1.15)  # never blown up past the render
        t = t.resize((max(1, int(t.width * k_)), max(1, int(t.height * k_))), Image.LANCZOS)
        sh = Image.new('RGBA', t.size, (20, 14, 10, 0)); sh.putalpha(t.getchannel('A').point(lambda v: int(v * 0.4))); sh = sh.filter(ImageFilter.GaussianBlur(5))
        cx = 470; im.alpha_composite(sh, (cx - t.width // 2 + 8, 352 - t.height + 4)); im.alpha_composite(t, (cx - t.width // 2, 352 - t.height))
    for k, it in enumerate(items):
        t = toy(s['id'], it['id'])
        if t is None: continue
        k_ = min(80 / t.height, (cw - 8) / t.width); t = t.resize((max(1, int(t.width * k_)), max(1, int(t.height * k_))), Image.LANCZOS)
        if it['secret']:
            a = t.getchannel('A'); t = Image.new('RGBA', t.size, rgb(mixc(btxt, band, 0.25) if dark else txt) + (0,)); t.putalpha(a)
        im.alpha_composite(t, (int(10 + cw * (k + 0.5) - t.width / 2), 448 - t.height))
    return PK.age(im.convert('RGB'), paper='Paper001', grain_k=0.35, fade=0.03, seed=abs(hash(s['id'])) % 997).convert('RGB')


if __name__ == '__main__':
    L = json.load(open(os.path.join(TOYS, 'lineup.json')))
    only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
    os.makedirs(OUT, exist_ok=True)
    for sid, s in L.items():
        if only and sid not in only: continue
        if not os.path.exists(os.path.join(ROOT, 'src', 'data', 'series', sid + '.js')): continue  # a retired series
        im = card(s); im.save(os.path.join(OUT, sid + '.webp'), quality=92, method=6)
        print('card', sid, len(s['items']))
