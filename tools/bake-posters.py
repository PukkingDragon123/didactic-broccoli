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
    return PK.age(im, **age)


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
