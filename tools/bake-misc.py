#!/usr/bin/env python3
"""bake-misc.py: the rest of the game's printed matter, from real photographs (Open Images CC BY 2.0, the game's own
credited photos), renders of the actual in-game toys (tools/render-toys.mjs cache), OFL type and real paper
(tools/paperkit.py). Sheets:
  misc   (uploaded via the painters that copy from it: main.js waits for it before the world builds)
         shop:<id>    the garage / museum tin signs, calendar, menu tags, noren, poster, shop sign (src/gfx/shopArt.js)
         rohan        Rohan's one-sheet (src/npc/poster.js)       room:<id>   the posters in your room (src/room/textures.js)
         gcard:<id>   the pictures among the garage's cards (src/gfx/garageArt.js)
         life:board / life:job:<id>   the neighbourhood notice board and the job flyers (src/life/art.js)
         carton:<series>  the wholesale carton label (src/game/capsuleBox.js)
  toycut (never uploaded: read into canvases) toy:<series>/<item> 96 px cut-outs and bd:<series> backdrops for the
         blister cards (src/game/packaging.js)
  python3 -I tools/bake-misc.py      (re-run after tools/render-toys.mjs)
"""
import os, sys, json, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from printkit import Panel, CACHE, mixc, rgb
import paperkit as PK
_s = importlib.util.spec_from_file_location('bp', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-print.py')); BP = importlib.util.module_from_spec(_s); _s.loader.exec_module(BP)
_c = importlib.util.spec_from_file_location('bc', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-cards.py')); BC = importlib.util.module_from_spec(_c); _c.loader.exec_module(BC)
ph = BP.ph
INK = 0x1c1816; WHITE = 0xfbf8f1; RED = 0xc62a1f; CREAM = 0xf3ecdc
TOYS = os.path.join(CACHE, 'toys')
L = json.load(open(os.path.join(TOYS, 'lineup.json')))
M = {}  # key -> (w, h, fn, age or None)

def toy(series, iid):
    p = os.path.join(TOYS, series, iid + '.png')
    if not os.path.exists(p): return None
    t = Image.open(p).convert('RGBA'); bb = t.getbbox()
    return t.crop(bb) if bb else None

def place(im, t, cx, by, maxw, maxh):
    if t is None: return im
    k = min(maxw / t.width, maxh / t.height); t = t.resize((max(1, int(t.width * k)), max(1, int(t.height * k))), Image.LANCZOS)
    im.alpha_composite(t, (int(cx - t.width / 2), int(by - t.height))); return im

# ---------------------------------------------------------------- tin signs (printed tin: photo, type, the metal)
TINS = {'tin_neko_shoyu': ('ねこ印醤油', '特級', 'sardines', RED, WHITE), 'tin_gacha_ramune': ('ガチャラムネ', '冷えてます', 'soda', 0x2a5aa8, WHITE),
        'tin_kinzuru_senbei': ('金鶴せんべい', '手焼き', 'crackers', 0x1c1816, 0xe8c050), 'tin_genkin': ('ゲンキン', '元気ドリンク', 'beer2', 0xe8b830, INK),
        'tin_tsubame': ('ツバメ学生服', '丈夫で長持ち', None, 0x1f3a6a, WHITE), 'tin_fuji_match': ('ふじマッチ', '安全マッチ', 'matchbox', RED, WHITE)}
for k, (t, sub, p_, bg, fg) in TINS.items():
    def fn(P, t=t, sub=sub, p_=p_, bg=bg, fg=fg):
        w, h = P.w, P.h
        P.metal(0, 0, w, h, 0xd8dce0); P.rect(4, 4, w - 8, h - 8, bg)
        if p_: P.photo(ph(p_), 10, 12, w - 20, w - 20, f=(0.5, 0.5, 1.2), shape='round', r=6)
        else: P.photo('local:lane/fuji_morning.jpg', 10, 12, w - 20, w - 20, shape='round', r=6)
        P.text(t, 'oldmincho', 24, w / 2, w + 4, fg, anchor='mt', vert=True, maxh=h - w - 54)
        P.rect(8, h - 40, w - 16, 26, fg); P.text(sub, 'kakub', 9, w / 2, h - 27, bg, maxw=w - 20)
        for x, y in ((8, 8), (w - 8, 8), (8, h - 8), (w - 8, h - 8)): P.ellipse(x - 3, y - 3, 6, 6, 0x8a8e94)
    M['shop:' + k] = (160, 480, fn, dict(paper='Paper001', grain_k=0.3, fade=0.3, specks=0.8, rings=0.3, seed=len(k)))
for k, (t, sub, p_, bg, fg) in {'tin_tanuki_katori': ('たぬき蚊取線香', '夏の夜に', 'teafield', 0x2a7a4a, WHITE), 'tin_milk_caramel': ('ミルクキャラメル', '一箱十円', 'milk', 0xe8c050, 0x6a2a14)}.items():
    def fn(P, t=t, sub=sub, p_=p_, bg=bg, fg=fg):
        w, h = P.w, P.h
        P.metal(0, 0, w, h, 0xd8dce0); P.rect(4, 4, w - 8, h - 8, bg)
        P.photo(ph(p_), 10, 10, h - 20, h - 20, f=(0.5, 0.5, 1.2), shape='round', r=6)
        P.text(t, 'oldmincho', 30, h + 4, h * 0.42, fg, anchor='lm', maxw=w - h - 14)
        P.text(sub, 'kakub', 12, h + 4, h * 0.78, fg, anchor='lm')
    M['shop:' + k] = (480, 160, fn, dict(paper='Paper001', grain_k=0.3, fade=0.3, specks=0.8, seed=len(k)))
def s_calendar(P):
    w, h = P.w, P.h
    P.rect(0, 0, w, h, 0xfbf8f0); P.photo('local:sakura.jpg', 8, 8, w - 16, h * 0.48, sat=0.95)
    P.text('8', 'abril', 40, 14, h * 0.62, RED, anchor='lm'); P.text('昭和61年', 'kakub', 10, w - 10, h * 0.58, INK, anchor='rm'); P.text('1986 AUGUST', 'bebas', 10, w - 10, h * 0.66, INK, anchor='rm')
    for i, d in enumerate('日月火水木金土'): P.text(d, 'kakub', 8, 18 + i * 32, h * 0.74, RED if i == 0 else INK)
    for d in range(1, 32):
        k = d + 4; i, j = k % 7, k // 7
        P.text(str(d), 'bebas', 11, 18 + i * 32, h * 0.79 + j * 15, RED if i == 0 else INK)
M['shop:calendar'] = (256, 384, s_calendar, dict(paper='Paper001', fade=0.35, yellow=0.5, seed=2))
def s_tags(P):
    w, h = P.w, P.h; P.texture('acg:Wood049', 0, 0, w, h, tint=0xc89a62, k=1.0, mode='normal')
    for i, (t, y) in enumerate([('くじ 20円', 'kakub'), ('ガム 10円', 'kakub'), ('だがし 各種', 'kakub')]):
        P.text(t, 'yusei', 26, w / 2, 32 + i * 62, INK)
M['shop:menu_tags'] = (480, 192, s_tags, None)
def s_noren(P):
    w, h = P.w, P.h; P.rect(0, 0, w, h, 0x1e2a52)
    for x in (w // 3, 2 * w // 3): P.rect(x - 1, 0, 3, h, 0x141c3a)
    P.text('だがし', 'oldmincho', 64, w / 2, h * 0.45, 0xf4f0e4, track=10)
M['shop:noren'] = (384, 320, s_noren, dict(paper='Paper004', grain_k=0.8, fade=0.2, seed=4))
def s_poster(P):
    w, h = P.w, P.h; P.rect(0, 0, w, h, 0x1a0a0a)
    P.photo(ph('dino'), 0, 0, w, h * 0.66, f=(0.5, 0.45, 1.1), sat=0.9)
    P.text('大怪獣', 'oldmincho', 48, w / 2, h * 0.75, 0xffd23f); P.text('近日公開', 'kakub', 16, w / 2, h * 0.86, WHITE)
    P.text('汐見東映', 'kakub', 11, w / 2, h * 0.94, 0xc8c0b0)
M['shop:poster_showa'] = (288, 400, s_poster, dict(paper='Paper001', fade=0.45, crease=0.6, folds=(1, 1), seed=5))
def s_sign(P):
    w, h = P.w, P.h; P.texture('acg:Wood049', 0, 0, w, h, tint=0x3a2416, k=1.0, mode='normal')
    P.text('ガチャガレージ堂', 'oldmincho', 54, w / 2, h / 2, 0xf4e8c8, track=6, maxw=w - 40)
M['shop:shop_sign'] = (800, 176, s_sign, dict(paper='Paper001', grain_k=0.2, fade=0.25, specks=0.5, seed=6))

# ---------------------------------------------------------------- Rohan's one-sheet (a manga's launch poster)
def rohan(P):
    w, h = P.w, P.h; P.rect(0, 0, w, h, 0x2a1238)
    P.photo('local:prints/lantern_corridor.jpg', 0, 0, w, h * 0.7, sat=0.8, con=1.1)
    P.rect(0, h * 0.7, w, h * 0.3, 0x2a1238)
    P.text('GACHA GARAGE', 'abril', 30, w / 2, h * 0.77, 0xf4e6c0, maxw=w - 20)
    P.text('A BIZARRE CAPSULE ADVENTURE', 'bebas', 13, w / 2, h * 0.84, 0xe8b838, track=1.5)
    P.text('新連載', 'oldmincho', 24, 14, 14, 0xffffff, anchor='lt'); P.text('Vol. 1', 'bebas', 14, 14, 48, 0xe8b838, anchor='lt')
    P.text('NOW OPEN!', 'bebas', 18, w / 2, h * 0.93, 0xffffff, track=2)
M['rohan'] = (288, 408, rohan, dict(paper='Paper001', fade=0.05, tape=('tl', 'tr'), seed=7))

# ---------------------------------------------------------------- your room's posters
def room_mikan(P):
    w, h = P.w, P.h; P.photo('local:lane/cat_fluffy.jpg', 0, 0, w, h, sat=0.95)
    P.rect(0, h - 56, w, 56, 0xf08a2a); P.text('MIKAN RUN', 'alfa', 22, w / 2, h - 36, WHITE); P.text('ねこまつり 1999', 'kakub', 10, w / 2, h - 14, WHITE)
def room_kaiju(P):
    w, h = P.w, P.h; P.rect(0, 0, w, h, 0x101010); P.photo(ph('dino'), 0, 40, w, h - 100, sat=0.9)
    P.text('怪獣映画祭', 'oldmincho', 26, w / 2, 22, 0xffd23f); P.text('オールナイト上映', 'kakub', 11, w / 2, h - 40, WHITE); P.text('汐見東映', 'kakub', 9, w / 2, h - 18, 0xc8c0b0)
def room_idol(P):
    w, h = P.w, P.h; P.photo('local:neon_night.jpg', 0, 0, w, h, f=(0.5, 0.6, 1.6), sat=1.0, bright=0.8)
    P.rect(0, 0, w, 54, 0xe86aa8); P.text('LIVE TOUR 99', 'bebas', 28, w / 2, 27, WHITE, track=2)
    P.text('汐見市民会館 7.24', 'kakub', 11, w / 2, h - 16, WHITE)
for k, fn in {'mikan': room_mikan, 'kaiju': room_kaiju, 'idol': room_idol}.items():
    M['room:' + k] = (192, 272, fn, dict(paper='Paper001', fade=0.15, crease=0.5, tape=('tl', 'tr'), seed=len(k)))

# ---------------------------------------------------------------- the pictures among the garage's cards
M['gcard:drawCat'] = (256, 192, lambda P: (P.rect(0, 0, 256, 192, WHITE), P.photo('local:lane/cat_grey.jpg', 10, 10, 236, 150), P.text('ミカン店長', 'yusei', 18, 128, 176, INK)), dict(paper='Paper001', fade=0.2, tape=('tl', 'tr'), seed=8))
M['gcard:drawGacha'] = (256, 192, lambda P: (P.rect(0, 0, 256, 192, WHITE), P.photo('oi:9a73ee8933d93045@test', 10, 10, 236, 150), P.text('ガチャ 1回100円', 'yusei', 16, 128, 176, RED)), dict(paper='Paper001', fade=0.2, tape=('tl',), seed=9))
M['gcard:photo'] = (160, 192, lambda P: (P.rect(0, 0, 160, 192, WHITE), P.photo('local:back_street.jpg', 8, 8, 144, 150, sat=0.4, warm=0.12), P.text('昭和48年', 'yusei', 12, 80, 176, INK)), dict(paper='Paper001', fade=0.5, yellow=0.6, seed=10))

# ---------------------------------------------------------------- the notice board and job flyers (src/life/art.js)
def board(P):
    w, h = P.w, P.h
    P.texture('acg:Cardboard002', 0, 0, w, h, tint=0xb8875a, k=1.0, mode='normal'); P.rect(0, 0, w, 44, 0x2a5a3a)
    P.text('町内会 お知らせ', 'oldmincho', 22, 12, 22, 0xf4ecd8, anchor='lm'); P.text('NOTICES', 'bebas', 14, w - 12, 22, 0xf2d23a, anchor='rm', track=1)
    P.rect(232, 60, 132, 180, 0xf4ece0); P.rect(240, 66, 116, 30, RED); P.text('夏祭り', 'oldmincho', 20, 298, 81, WHITE)
    P.photo('local:fireworks.jpg', 240, 100, 116, 96); P.text('8月14日', 'kakub', 13, 298, 216, INK)
    P.rect(24, 64, 120, 170, 0xfbf8ee); P.text('迷い猫', 'kaku', 22, 84, 84, RED); P.photo('local:lane/cat_black.jpg', 32, 100, 104, 84)
    P.text('見かけた方は', 'kakub', 10, 84, 200, INK); P.text('TEL 23-4567', 'bebas', 12, 84, 220, INK)
M['life:board'] = (384, 256, board, dict(paper='Paper001', grain_k=0.3, fade=0.25, streak=0.3, seed=11))
for jid, (title, pay, photo, band) in {'dog': ('犬の散歩', '1,200円', 'local:lane/shiba.jpg', 0xe8a25a), 'car': ('洗車', '1,500円', 'local:rainy_lane.jpg', 0x3aa0e0),
                                     'windows': ('窓ふき', '1,000円', 'local:rain_window.jpg', 0x58c06c), 'street': ('町内清掃', '900円', 'local:back_street.jpg', 0xd8b84a)}.items():
    def job(P, title=title, pay=pay, photo=photo, band=band):
        w, h = P.w, P.h; P.rect(0, 0, w, h, 0xf6f0e2); P.rect(0, 0, w, 30, band)
        P.text('アルバイト', 'kakub', 12, w / 2, 15, WHITE)
        P.photo(photo, 8, 36, w - 16, 62); P.text(title, 'kaku', 16, w / 2, 112, INK, maxw=w - 10)
        P.text('日給 ' + pay, 'kakub', 11, w / 2, 130, RED)
        for x in range(4, w - 6, 15): P.rect(x, h - 22, 1, 22, 0xb8b4a8); P.text('TEL', 'bebas', 6, x + 7, h - 11, INK)
    M['life:job:' + jid] = (128, 160, job, dict(paper='Paper002', fade=0.15, folds=(0, 1), tape=('tl',), seed=len(jid)))

# ---------------------------------------------------------------- carton labels (the hero toys of the series)
for sid, s in L.items():
    def carton(P, sid=sid, s=s):
        w, h = P.w, P.h; c = s.get('card') or {}
        acc = BC.hexc(c.get('accent'), RED)
        P.rect(0, 0, w, h, WHITE); P.rect(0, 0, w, 40, acc)
        P.text(s['jp'], 'mochiy', 20, 10, 20, WHITE, anchor='lm', maxw=w - 120)
        P.text('取扱注意', 'kakub', 12, w - 10, 20, WHITE, anchor='rm')
        ref, f = BC.BACK.get(sid, ('local:gacha_rows.jpg', (0.5, 0.5, 1.0)))
        P.photo(ref, 8, 48, 168, 168, f=f, sat=0.9)
        P.text('カプセル入り', 'kakub', 13, 190, 70, INK, anchor='lm'); P.text('%d円' % s['price'], 'bebas', 28, 190, 110, RED, anchor='lm')
        P.text('全%d種' % len(s['items']), 'kaku', 16, 190, 150, INK, anchor='lm')
        P.text('GACHA GARAGE SUPPLY', 'bebas', 10, 190, 196, INK, anchor='lm', track=1)
        def post(im, sid=sid, s=s):
            im = im.convert('RGBA')
            items = [i for i in s['items'] if not i['secret']]
            for k_, it in enumerate(items[:2]): place(im, toy(sid, it['id']), 52 + k_ * 82, 212, 96, 140)
            return im.convert('RGB')
        P.post = post
    M['carton:' + sid] = (384, 224, carton, dict(paper='Paper001', grain_k=0.4, seed=len(sid)))

def build():
    ims = {}
    for k, (w, h, fn, age) in M.items():
        P = Panel(w, h, 0xffffff); fn(P); im = P.image()
        if callable(getattr(P, 'post', None)): im = P.post(im)
        ims[k] = PK.age(im, **age) if age else im
    return ims

if __name__ == '__main__':
    ims = build()
    out, idx = BP.pack(ims, 1024, alpha=True); BP.save_sheet('misc', out, idx)
    # toycut: 96 px cut-outs of every rendered toy + 128 x 96 backdrop crops (only read into canvases)
    cut = {}
    for sid, s in L.items():
        for it in s['items']:
            t = toy(sid, it['id'])
            if t is None: continue
            k = min(96 / t.width, 96 / t.height); t = t.resize((max(1, int(t.width * k)), max(1, int(t.height * k))), Image.LANCZOS)
            c = Image.new('RGBA', (96, 96), (0, 0, 0, 0)); c.alpha_composite(t, ((96 - t.width) // 2, 96 - t.height)); cut['toy:%s/%s' % (sid, it['id'])] = c
        ref, f = BC.BACK.get(sid, ('local:gacha_rows.jpg', (0.5, 0.5, 1.0)))
        P = Panel(128, 96, 0); P.photo(ref, 0, 0, 128, 96, f=f, sat=0.9); cut['bd:' + sid] = P.image().convert('RGBA')
    o2, i2 = BP.pack(cut, 1024, alpha=True); BP.save_sheet('toycut', o2, i2)
