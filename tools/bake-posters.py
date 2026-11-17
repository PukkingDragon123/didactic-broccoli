#!/usr/bin/env python3
"""bake-posters.py: the posters and notices of the lane and the shops, at graphic-designer quality.
Two kinds, both on real paper (tools/paperkit.py: real CC0 paper scans, sun fade, folds, rain runs, tape, tears):
  designed   our own layouts (1990s Japanese neighbourhood print: mincho headlines, heavy gothic, vertical copy, a
             real grid) around real photographs (Google Open Images, CC BY 2.0) in OFL faces (tools/printkit.py)
  vintage    real public-domain posters (Wikimedia Commons: the Japanese Government Railways' 1930s travel posters),
             aged where they hang; no brand on them is current (credited in CREDITS.md / public/CREDITS.txt)
Output: one sheet per area, public/img/print/<sheet>.webp (+ src/gfx/print/<sheet>.json regions), via bake-print.py.
  python3 -I tools/bake-posters.py [lane] [--sheet out.png] [--only key,key]
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from printkit import Panel, ROOT, CACHE, cover, printed, mixc
import paperkit as PK
import importlib.util
_bp = importlib.util.spec_from_file_location('bake_print', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-print.py'))
BP = importlib.util.module_from_spec(_bp); _bp.loader.exec_module(BP)

INK = 0x1c1816; WHITE = 0xfbf8f1; RED = 0xc62a1f; VERM = 0xd8402a; INDIGO = 0x1b2340; GOLD = 0xe8b838; CREAM = 0xf3ecdc
def oi(k): return 'oi:' + k
COMMONS = os.path.join(CACHE, 'commons')

# ------------------------------------------------------------------ photographs used here (Open Images, CC BY 2.0)
PH = {
    'bonodori': '99d0d046afd231c4@train',     # sankuy, "Summer Festival - Hanabi 5"
    'fireworks': '3273e580b71afeef@validation',  # megawheel360, "Tokyo Bay Fireworks Festival 2010 #7"
    'sumo': '0deee1bb956b2216@test',          # SteFou!, "Sumo Wrestling"
    'fuji_clouds': '537d350a5dbe1f18@test',   # Michael G Winters, "Japan Mount Fuji (12)"
    'monkeys': '2a1c261ad12e6f62@test',       # Chi Tranter, "Snow monkeys in hot spring Japan"
    'shinkansen': '842fcd9c97854956@test',    # alisdair, "Hikari Shinkansen"
    'shiba': 'c14e22cfec55c7d2@test',         # Guilhem Vellut, "Shiba Inu dog @ Mount Mitake"
}
def ph(k): return oi(PH[k])

SCALE = 0.66
POSTERS = {}  # key -> (w, h, design(P), age opts)
def poster(key, w, h, **age):
    def deco(fn): POSTERS[key] = (w, h, fn, age); return fn
    return deco


# ================================================================== designed: summer festival (盆踊り・花火)
@poster('lane:festival:0', 240, 340, paper='Paper001', fade=0.12, streak=0.5, folds=(0, 0), tape=('tl', 'tr'), crease=0.6, seed=11)
def _(P):
    w, h = P.w, P.h
    P.rect(0, 0, w, h, INDIGO)
    P.photo(ph('bonodori'), 0, 0, w, 214, f=(0.42, 0.42, 1.25), sat=0.98, con=1.08, warm=0.04)
    # the vermilion title column over the photo, vertical mincho
    P.rect(w - 58, 0, 46, 196, VERM)
    P.text('夏まつり', 'oldmincho', 38, w - 35, 98, WHITE, vert=True, maxh=176)
    P.text('第二十八回', 'oldminchob', 10, w - 74, 8, WHITE, anchor='mt', vert=True)
    # the date block: big numerals, the day in a box
    y0 = 222
    P.text('8.14', 'bebas', 64, 12, y0 + 34, GOLD, anchor='lm')
    P.rect(112, y0 + 14, 22, 22, GOLD); P.text('土', 'kaku', 15, 123, y0 + 25, INDIGO)
    P.text('SAT', 'bebas', 11, 123, y0 + 46, GOLD, track=1)
    P.text('上山中央公園', 'kakub', 11, 12, y0 + 72, WHITE, anchor='lm')
    P.text('雨天の場合は十五日に順延', 'kakum', 7.5, 12, y0 + 86, 0xb8bdd8, anchor='lm')
    # the evening's programme on a hairline grid
    x0, gy = 146, y0 + 8
    for t, ev in [('17:00', '夜店'), ('18:30', '盆踊り'), ('19:30', '子ども神輿'), ('20:30', '花火')]:
        P.hline(x0, gy, w - x0 - 10, 0x6a7090, 0.6)
        P.text(t, 'bebas', 13, x0, gy + 10, GOLD, anchor='lm')
        P.text(ev, 'kakub', 10, x0 + 34, gy + 10, WHITE, anchor='lm')
        gy += 21
    P.hline(x0, gy, w - x0 - 10, 0x6a7090, 0.6)
    P.rect(0, h - 22, w, 22, 0x121830)
    P.text('主催 上山町内会　協賛 上山商店会', 'kakum', 8, 12, h - 11, 0xc8cce0, anchor='lm')
    P.text('入場無料', 'kakub', 8, w - 12, h - 11, GOLD, anchor='rm')


# ================================================================== designed: rail travel campaign (1990s)
@poster('lane:travel:0', 240, 340, paper='Paper001', fade=0.2, streak=0.35, tape=('tl', 'tr'), crease=0.5, seed=21)
def _(P):
    w, h = P.w, P.h
    P.rect(0, 0, w, h, WHITE)
    P.photo(ph('fuji_clouds'), 0, 0, w, 262, f=(0.5, 0.45, 1.12), sat=0.95, con=1.06)
    # vertical copy in the sky, two columns, right to left
    P.text('雲の上の、', 'oldmincho', 19, w - 22, 14, WHITE, anchor='mt', vert=True)
    P.text('ふるさと。', 'oldmincho', 19, w - 52, 44, WHITE, anchor='mt', vert=True)
    P.text('SEE THE COUNTRY BY RAIL', 'bebas', 10, 12, 250, WHITE, anchor='lm', track=2)
    # the railway's block: monogram, name, the ticket offer
    y = 270
    P.rect(12, y + 6, 34, 34, RED); P.text('上', 'oldmincho', 26, 29, y + 23, WHITE)
    P.text('上山鉄道', 'kaku', 18, 54, y + 16, INK, anchor='lm')
    P.text('KAMIYAMA RAILWAY', 'bebas', 11, 55, y + 33, 0x5a5a5a, anchor='lm', track=1.5)
    P.rect(w - 82, y + 8, 70, 30, INK)
    P.text('周遊きっぷ', 'kakub', 9, w - 47, y + 17, WHITE)
    P.text('発売中', 'kaku', 11, w - 47, y + 30, GOLD)
    P.hline(12, h - 16, w - 24, INK, 0.6)
    P.text('富士周遊 2日間 大人 9,800円', 'kakum', 7, 12, h - 9, INK, anchor='lm')
    P.text('99.7', 'bebas', 9, w - 12, h - 9, INK, anchor='rm')


# ================================================================== designed: the sumo tour (大相撲 上山場所)
@poster('lane:event:0', 240, 340, paper='Paper001', fade=0.28, streak=0.4, folds=(1, 1), tape=('tl', 'tr'), crease=0.7, torn=('bl',), seed=31)
def _(P):
    w, h = P.w, P.h
    P.rect(0, 0, w, h, CREAM)
    P.rect(0, 0, w, 96, INK)
    P.text('大相撲', 'oldmincho', 56, 14, 50, WHITE, anchor='lm')
    P.rect(w - 50, 10, 38, 76, RED)
    P.text('上山場所', 'oldminchob', 15, w - 31, 48, WHITE, vert=True, maxh=70)
    P.photo(ph('sumo'), 0, 96, w, 132, f=(0.5, 0.55, 1.3), sat=0.9, con=1.05)
    P.rect(0, 228, w, 3, RED)
    y = 240
    P.text('平成十一年', 'oldminchob', 10, 14, y + 6, INK, anchor='lm')
    P.text('八月十五日', 'oldmincho', 22, 14, y + 26, INK, anchor='lm')
    P.text('〜二十日', 'oldmincho', 15, 128, y + 28, INK, anchor='lm')
    P.text('上山市民体育館', 'kakub', 11, 14, y + 48, RED, anchor='lm')
    # ticket table
    tx, ty = 14, y + 60
    for i, (seat, yen) in enumerate([('升席', '8,000円'), ('椅子席', '3,500円'), ('自由席', '1,500円')]):
        P.hline(tx, ty + i * 11, w - 28, INK, 0.6)
        P.text(seat, 'kakub', 8, tx + 2, ty + i * 11 + 6, INK, anchor='lm')
        P.text(yen, 'bebas', 10, w - 16, ty + i * 11 + 6, INK, anchor='rm')
    P.hline(tx, ty + 33, w - 28, INK, 0.6)


# ================================================================== the shop's own promo posters (src/world/Posters.js,
# src/gfx/flyers.js promos): the ACTUAL toys (tools/render-toys.mjs renders) on real photographs, sheet 'promo'
PROMO = {}
TOYS = os.path.join(CACHE, 'toys')
def toys_on(im, series, ids, box, hero=0):
    """Composite toy renders (cropped to their alpha) standing along the bottom of box (x, y, w, h), output px."""
    x0, y0, bw, bh = box; n = len(ids)
    for k, iid in enumerate(ids):
        p = os.path.join(TOYS, series, iid + '.png')
        if not os.path.exists(p): continue
        t = Image.open(p).convert('RGBA'); bb = t.getbbox()
        if not bb: continue
        t = t.crop(bb); big = k == hero
        Ht, Wt = bh * (1.0 if big else 0.72), bw / n * (1.25 if big else 1.0)
        kk = min(Ht / t.height, Wt / t.width); t = t.resize((max(1, int(t.width * kk)), max(1, int(t.height * kk))), Image.LANCZOS)
        cx = x0 + bw * (k + 0.5) / n
        im.alpha_composite(t, (int(cx - t.width / 2), int(y0 + bh - t.height)))
    return im

def promo(key, photo, f, series, ids, title, tface, sub, ground, ink, accent, foot):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, ground)
        P.photo(photo, 0, 0, w, 230, f=f, sat=0.9, con=1.02, bright=0.85)
        P.rect(0, 230, w, 4, accent)
        P.text(title, tface, 30 if len(title) <= 6 else 24, 12, 262, ink, anchor='lm', maxw=w - 24)
        P.text(sub, 'kakub', 10, 12, 290, ink, anchor='lm', maxw=w - 24)
        P.rect(0, h - 30, w, 30, accent)
        P.text('ガチャガレージ', 'kaku', 12, 12, h - 15, ground, anchor='lm')
        P.text(foot, 'bebas', 11, w - 12, h - 15, ground, anchor='rm', track=1)
        P.post = lambda im: toys_on(im.convert('RGBA'), series, ids, (14, 70, w - 28, 158)).convert('RGB')
    PROMO['promo:' + key] = (240, 340, fn, dict(paper='Paper001', fade=0.08, crease=0.4, tape=('tl', 'tr'), seed=len(key)))
promo('reopen', 'local:garage.jpg', (0.5, 0.5, 1.0), 'rojineko', ['wall', 'stalker', 'box'], '祝 再開店', 'oldmincho', 'おじいちゃんのガチャ屋、また開きます。', 0xf6efe0, INK, RED, 'OPEN 10:00-20:00')
promo('kaiju', 'oi:6324262554f184ab@test', (0.5, 0.75, 1.7), 'sampuru', ['ramen', 'sundae', 'katsu'], 'サンプル食堂', 'mochiy', '本物そっくり、食品サンプル 全7種', 0xfbf6ee, INK, 0xd8402a, '300 YEN')
promo('space', 'oi:f4200fadef07c329@test', (0.5, 0.55, 1.2), 'denka', ['radio', 'sewing', 'tv'], '昭和の家電', 'oldmincho', 'あの頃のおうち、ミニチュアで。全8種', 0xf3ecdc, INK, 0x2a7a6a, '300 YEN')
promo('sakura', 'oi:f291d677045b5a38@test', (0.5, 0.6, 1.1), 'okashi', ['dango', 'matcha', 'taiyaki'], '和菓子処', 'oldmincho', 'ちいさな和菓子、ひとつどうぞ。全7種', 0xf8efe4, INK, 0xb8506a, '200 YEN')
promo('secret', 'local:milky_way.jpg', (0.5, 0.5, 1.0), 'shinkai', ['angler', 'nautilus', 'jelly'], 'シークレット', 'mochiy', '各シリーズにひとつ。きみは引けるか？', 0x15182a, 0xf4e6c0, 0xe8b838, 'SECRET')
promo('glow', 'local:rain_window.jpg', (0.5, 0.5, 1.0), 'shinkai', ['jelly', 'angler', 'dumbo'], '夜光る', 'mochiy', '暗いところで光る、蓄光フィニッシュ', 0x101820, 0xd8f0e0, 0x58c08a, 'GLOW')

# the handed-out joke flyers (src/gfx/flyers.js 'meme' designs): real photos, two-line captions on plain ink bands
MEMES = {
    'much': ('local:lane/shiba_puppy.jpg', 'WOW. SUCH CAPSULE.', 'MUCH WANT. ガチャガレージ'),
    'nope': ('local:lane/cat_black.jpg', '通販？ NOPE.', '路地のガチャ？ YEP.'),
    'distracted': ('local:back_street.jpg', '昼休み、給料日。', 'その足は、ガチャ屋へ。'),
    'brain': ('local:milky_way.jpg', '1回まわす → 10回まわす', '→ ガレージを継ぐ。'),
    'simply': ('local:lane/fuji_morning.jpg', 'ONE DOES NOT SIMPLY', 'TURN ONLY ONCE.'),
    'nobody': ('local:rainy_lane.jpg', '誰も: ', '深夜3時のわたし: あと1回だけ。'),
    'expect': ('oi:9a73ee8933d93045@test', '期待: シークレット', '現実: 同じハムスター、6回目。'),
    'manager': ('local:lane/cat_grey.jpg', '新しい店長です。', '給料はおやつ。'),
    'itwasme': ('local:lane/cat_fluffy.jpg', 'カプセルの中身は…', 'わたしだ。ミカン'),
}
for mid, (photo, top, bot) in MEMES.items():
    def meme(P, photo=photo, top=top, bot=bot):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, INK); P.photo(photo, 0, 46, w, h - 112, sat=0.95)
        P.text(top, 'kaku', 17, w / 2, 24, WHITE, maxw=w - 16)
        P.text(bot, 'kaku', 15, w / 2, h - 44, WHITE, maxw=w - 16)
        P.text('ガチャガレージ 路地の奥', 'kakub', 8, w / 2, h - 14, 0xb8b0a0)
    PROMO['promo:' + mid] = (240, 340, meme, dict(paper='Paper002', fade=0.06, crease=0.5, seed=len(mid)))

# ================================================================== vintage: real 1930s posters (public domain)
VINTAGE = {  # key: (commons file, crop focus, title for credits)
    'v:obama': ('1930s_Japan_Travel_Poster_-_01.jpg', (0.5, 0.5, 1.0)),
    'v:matsushima': ('1930s_Japan_Travel_Poster_-_02.jpg', (0.5, 0.5, 1.0)),
    'v:nagoya': ('1930s_Japan_Travel_Poster_-_03.jpg', (0.5, 0.5, 1.0)),
    'v:alps': ('1930s_Japan_Travel_Poster_-_04.jpg', (0.5, 0.5, 1.0)),
    'v:autumn': ('1930s_Japan_Travel_Poster_-_05.jpg', (0.5, 0.5, 1.0)),
    'v:tenryu': ('1930s_Japan_Travel_Poster_-_06.jpg', (0.5, 0.5, 1.0)),
    'v:yoro': ('1930s_Japan_Travel_Poster_-_07.jpg', (0.5, 0.5, 1.0)),
    'v:kirishima': ('1930s_Japan_Travel_Poster_-_09.jpg', (0.5, 0.5, 1.0)),
    'v:koshu': ('1930s_Japan_Travel_Poster_-_10.jpg', (0.5, 0.5, 1.0)),
    'v:nara': ('1930s_Japan_Travel_Poster_-_11.jpg', (0.5, 0.5, 1.0)),
    'v:miho': ('1930s_Japan_Travel_Poster_-_13.jpg', (0.5, 0.5, 1.0)),
    'v:tateyama': ('1930s_Japan_Travel_Poster_-_14.jpg', (0.5, 0.5, 1.0)),
    'v:kinkaku': ('1930s_Japan_Travel_Poster_-_15.jpg', (0.5, 0.5, 1.0)),
}


def vintage(key, w, h, **age):
    fn, f = VINTAGE[key]
    src = Image.open(os.path.join(COMMONS, fn)).convert('RGB')
    def design(P):
        P.photo('file:' + os.path.join(COMMONS, fn), 0, 0, w, h, f=f, sat=1.0, con=1.0)
    return (w, h, design, age)


# ------------------------------------------------------------------ bake
def render(key, w, h, fn, age):
    P = Panel(w, h, 0xffffff); fn(P)
    im = P.image()
    if callable(getattr(P, 'post', None)): im = P.post(im)
    out = PK.age(im, **age)
    # the lane sheet must stay within 1024 x 1024: posters are kept at 0.66 of their design size (~500 px/m)
    return out.resize((round(w * SCALE), round(h * SCALE)), Image.LANCZOS)


# the rest of the lane's notices (tools/bake-print.py 'street' designs), aged for a wall outdoors
def street():
    import random
    out = {}
    rn = random.Random(5)
    for k, (w, h, fn) in BP.L.items():
        d, n = k.split(':'); n = int(n)
        if d == 'travel': key = 'lane:travel:%d' % (n + 1)
        elif d == 'event':
            if n == 0: continue
            key = 'lane:event:%d' % n
        elif d == 'festival': key = 'lane:festival:%d' % (n + 1)
        elif d == 'lost': key = 'lane:lost:' + ('cat%d' % n if n < 4 else 'dog%d' % (n - 4))
        else: key = 'lane:' + k
        age = dict(paper='Paper002' if d in ('lost', 'rent') else 'Paper001', fade=rn.uniform(0.1, 0.45), streak=rn.uniform(0.3, 0.8),
                   crease=rn.uniform(0.3, 0.9), folds=(1, 1) if d in ('lost', 'rent') else (0, 0), rings=rn.uniform(0, 0.5),
                   tape=('tl', 'tr'), torn=(rn.choice(['bl', 'br']),) if rn.random() < 0.35 else None, seed=rn.randrange(999))
        out[key] = (w, h, fn, age)
    return out


def build(only=None):
    ims = {}
    POSTERS.update({k: v for k, v in street().items() if k not in POSTERS})
    for k, (w, h, fn, age) in POSTERS.items():
        if only and k not in only: continue
        ims[k] = render(k, w, h, fn, age)
    return ims


if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    ims = build(only)
    out, idx = BP.pack(ims, 1024, alpha=True)
    if '--sheet' in sys.argv:
        p = sys.argv[sys.argv.index('--sheet') + 1]
        bg = Image.new('RGBA', out.size, (90, 84, 78, 255)); bg.alpha_composite(out); bg.convert('RGB').save(p)
        print('sheet', p, out.size)
    else:
        BP.save_sheet('lane', out, idx)
        pr = {k: render(k, w, h, fn, age) for k, (w, h, fn, age) in PROMO.items()}
        o2, i2 = BP.pack(pr, 1024, alpha=True); BP.save_sheet('promo', o2, i2)
