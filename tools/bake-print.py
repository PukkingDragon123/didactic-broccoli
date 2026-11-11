#!/usr/bin/env python3
"""bake-print.py: the printed things other than the drinks, baked from real photographs in real typefaces (printkit.py):
  goods   Mikawa-ya's own packs as 3D goods (src/products/goods.js regions: milk carton, cup noodles, rice balls, buns,
          pudding, puff stick, sweets)                                         -> public/img/print/goods.webp / .json
  shop    the packs, tins, model-kit boxes, posters, calendar and price board in Mikawa-ya's atlas
          (src/world/mikawayaArt.js cells, keys 'mk:<cell>')                    -> public/img/print/shop.webp / .json
Each panel has exactly the size and layout of the region it replaces (UVs and models are untouched). The pictures are
Google Open Images photos (CC BY 2.0), credited in CREDITS.md; the names and makers are the game's own.
  python3 -I tools/bake-print.py [goods|shop ...] [--sheet out.png]
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from printkit import Panel, mixc, ROOT

OUT = os.path.join(ROOT, 'public', 'img', 'print')
PH = {
    'shrimp': '0381e5e25585560d@validation',
    'biscuit': '0b8024808dcd7382@test',
    'crackers': '01f92a05010cabe0@validation',
    'chocolate': '0cd76710f90bf31e@validation',
    'caramelcorn': '0ec1189ce664eb0c@test',
    'octopus': '0bf5980ee7b42dd0@test',
    'popcorn': '0209d8ca4058580d@validation',
    'cereal': '04dcd9b74778a51b@test',
    'tank': '021d9739adae9f9c@test',
    'ship': '068d0ed1c82328ab@validation',
    'plane': '015c3c4a93dbf669@test',
    'robot': '098d3d6d0e2a1f19@test',
    'jelly': '0fc5e500a2beaf26@test',
    'matchbox': '2e402ae4b2addb7e@validation',
    'mikan': '0079ae4be5f70d5b@test',
    'tuna': '2ede3d43e9a4c9e5@test',
    'cat': 'bb32d4035b4776ad@test',
    'sardines': '308ced763b5f08bb@test',
    'curry': '94b560a540fe777a@test',
    'choco_old': 'a532a5538cff244f@test',
    'strawberry': '8a9d7da8e50cf3df@test',
    'konpeito': '6aa2cf5b69830d9c@validation',
    'gumdrop': '436ed2d6e9cd8ca4@test',
    'chips': '2bac4cbaa3859a6b@test',
    'cornchips': '0cb64ff535dd698a@validation',
    'melonpan': '071cf4dfd81e444e@test',
    'anpan': 'edce30188dc01bef@test',
    'flan': '1e1283c785486215@test',
    'onigiri': '2d66a2282db22f20@test',
    'ramen_shoyu': '02866b5332267a21@test',
    'ramen_tonkotsu': '01dde2016d147b23@test',
    'ramen_miso': '036577fa0421c5c6@test',
    'ramen4': '0913640030c7608e@test',
    'gyoza': '5b1c17cb6d748fa0@test',
    'asagao': 'd9010cd519a5f329@test',
    'lollipop': '0c97ce20e62e4106@validation',
    'milkyway': '0b4f76675243c81d@test',
    'wrestling': '10895bc3d7562b66@test',
    'dino': '098164e17499945c@test',
    'icecream': '00290e34951731ac@test',
    'sakura': '09598149cb9a5f78@test', 'ramen4': '0423752f180ef665@test', 'rice': '00ae02779702fe2a@test', 'kaedama': '027eed09ac62674b@test',
    'beer2': '0f79f3c11a3acce9@test', 'sake': '239d60ab92280542@test', 'cola': '27bc7351ff155958@test',
    'cows': '6b792f8539a62e67@test', 'milk': '1636d912cb396b1b@test', 'soda': '17b3ba937734b010@test', 'grape': '03e2cc8f5547bcbe@validation',
    'melon': '0aebb420d22f3e6e@validation', 'ume': '6d31cfc15b4efd11@test', 'lemons': '015af6da5e40d1d8@test', 'corn': '0039d1a14d295dee@test',
    'beans': '59bc07aff213dead@test', 'fuji': '04da2550440dd624@validation', 'bubbles': '086e20b26cefa816@test', 'teafield': '2c6b472a3ddd5dd7@test',
    'cocoa': '0af12cae5301c91d@validation', 'barley': '16f8a879d09ef4cb@test', 'jasmine': '129df409588b04f4@test', 'sea': '011d1dcbfb65a15f@test',
}
def ph(k): return 'oi:' + PH[k]
INK = 0x231c1a; WHITE = 0xfbf8f2; RED = 0xc8241e; GOLD = 0xc9a24a; Y = 0xf6d23a


def fine(P, x, y, w, text, ink=INK, size=5.2, maxy=None):
    return P.lines(text, 'biz', size, x, y, w, ink, lh=size * 1.3, maxy=maxy)

def facts(P, x, y, w, rows, ink=INK, size=5.4, maxy=None, paper=None):
    if paper is not None: P.rect(x, y, w, (maxy or P.h) - y, paper)
    return P.info(x, y, w, rows, ink=ink, size=size, maxy=maxy)

def maker_band(P, x, y, w, h, jp, en, band, ink):
    P.rect(x, y, w, h, band)
    P.text(jp, 'kaku', h * 0.6, x + 4, y + h / 2, ink, anchor='lm')
    P.text(en, 'barlow', h * 0.48, x + w - 4, y + h / 2, ink, anchor='rm')

def on(c):
    r, g, b = (c >> 16) & 255, (c >> 8) & 255, c & 255
    return INK if 0.3 * r + 0.59 * g + 0.11 * b > 150 else WHITE

def price_tag(P, x, y, yen):
    P.rect(x, y, 40, 16, 0xfff6a8); P.rect(x, y, 40, 16, RED, line=1)
    P.text('%d円' % yen, 'kaku', 9, x + 20, y + 8, RED)


# ================================================================== goods (src/products/goods.js)
G = {}
def good(key, w, h):
    def deco(fn): G[key] = (w, h, fn); return fn
    return deco

@good('milk', 560, 322)
def _(P):
    B = 0x1f4ea8
    for x0 in (0, 280):  # the two printed sides of the carton
        P.photo(ph('cows'), x0, 26, 140, 190, f=(0.5, 0.55, 1.25), sat=0.95)
        P.rect(x0, 0, 140, 26, B); P.text('モーベル牧場', 'kakub', 10, x0 + 70, 13, WHITE)
        P.rect(x0 + 14, 34, 112, 50, WHITE)
        P.text('牛乳', 'tokumin', 34, x0 + 70, 58, B)
        P.rect(x0, 216, 140, 106, B)
        P.rect(x0 + 24, 226, 92, 15, WHITE); P.text('成分無調整', 'kakub', 9, x0 + 70, 233.5, B)
        P.text('生乳100%使用', 'kaku', 11, x0 + 70, 256, WHITE)
        P.text('1000ml', 'barlowx', 18, x0 + 70, 280, Y)
        P.text('MOOBELL FARM FRESH MILK', 'barlow', 7, x0 + 70, 304, WHITE, track=0.5)
    # the right side: nutrition table, a photo of a glass of milk
    x0 = 140; P.rect(x0, 0, 140, 322, WHITE); P.rect(x0, 0, 140, 6, B); P.rect(x0, 316, 140, 6, B)
    P.text('栄養成分表示', 'kakub', 9, x0 + 70, 18, B); P.text('（200mlあたり）', 'biz', 6.5, x0 + 70, 30, B)
    y = 38
    for a, v in [('エネルギー', '137kcal'), ('たんぱく質', '6.8g'), ('脂質', '7.8g'), ('炭水化物', '9.9g'), ('ナトリウム', '85mg'), ('カルシウム', '227mg')]:
        P.hline(x0 + 8, y, 124, B, 0.6); P.text(a, 'biz', 7, x0 + 10, y + 7, INK, anchor='lm'); P.text(v, 'bizb', 7, x0 + 130, y + 7, INK, anchor='rm'); y += 14
    P.hline(x0 + 8, y, 124, B, 0.6)
    P.photo(ph('milk'), x0 + 14, y + 10, 112, 92, f=(0.55, 0.5, 1.2), sat=0.9)
    fine(P, x0 + 10, y + 110, 120, '開封後は賞味期限にかかわらず、お早めにお飲みください。', B, 6.2)
    # the back: the legal box, the code
    x0 = 420; P.rect(x0, 0, 140, 322, WHITE); maker_band(P, x0, 0, 140, 16, 'モーベル牧場', 'MOOBELL', B, WHITE)
    y = facts(P, x0 + 5, 22, 130, [('種類別', '牛乳'), ('商品名', 'モーベル牛乳'), ('乳脂肪分', '3.6%以上'), ('無脂乳固形分', '8.3%以上'), ('原材料名', '生乳100%'), ('殺菌', '130℃ 2秒間'), ('内容量', '1000ml'), ('賞味期限', '上部に記載'), ('保存方法', '要冷蔵(10℃以下)'), ('製造者', 'モーベル乳業（株）高原村まきば520')], size=5.8, maxy=272)
    P.barcode(x0 + 22, 288, '494073600901', h=16)
    for x in (140, 280, 420): P.rect(x, 0, 0.6, 322, 0xd8dce8)

@good('milkTop', 280, 126)
def _(P):
    B = 0x1f4ea8
    P.rect(0, 0, 280, 100, WHITE); P.rect(0, 92, 280, 8, B)
    P.text('あけぐち', 'kaku', 16, 70, 22, B)
    P.poly([(20, 56), (44, 46), (44, 66)], RED); P.poly([(120, 56), (96, 46), (96, 66)], RED); P.rect(44, 52, 52, 8, RED)
    P.text('左右に開いてください', 'biz', 7, 70, 78, INK)
    P.text('賞味期限', 'kakub', 9, 210, 18, INK)
    P.text('99.04.18', 'barlowx', 15, 210, 44, INK, track=1); P.text('MB7  14:20', 'barlow', 10, 210, 66, INK, track=1)
    P.rect(0, 100, 280, 26, 0xeeeee6)

@good('noodle', 528, 190)
def _(P):
    R = 0xc8281e
    P.rect(0, 0, 264, 190, WHITE)
    P.photo(ph('ramen_shoyu'), 0, 60, 264, 112, f=(0.5, 0.45, 1.15), sat=0.98)
    P.rect(0, 0, 528, 14, R); P.rect(0, 172, 528, 18, R); P.rect(0, 14, 528, 2, GOLD); P.rect(0, 170, 528, 2, GOLD)
    P.text('ねこ印', 'kakub', 9, 34, 28, R)
    P.text('しょうゆ味', 'dela', 20, 150, 30, R, stroke=(1.4, WHITE))
    P.text('カップめん', 'kaku', 15, 150, 50, INK)
    P.rect(196, 128, 56, 34, R, r=3); P.text('お湯をいれて', 'kakub', 5.5, 224, 136, WHITE); P.text('3分', 'kaku', 13, 224, 151, WHITE)
    P.text('NEKO-JIRUSHI  SOY SAUCE NOODLES', 'barlow', 8, 132, 181, WHITE, track=1)
    x0 = 264; P.rect(x0, 16, 264, 154, WHITE)
    y = facts(P, x0 + 8, 22, 248, [('名称', '即席カップめん'), ('原材料名', '油揚げめん（小麦粉、植物油脂、食塩）、スープ（しょうゆ、食塩、糖類、香辛料）、かやく（ねぎ、なると、メンマ）'), ('内容量', '77g（めん65g）'), ('賞味期限', '底面に記載'), ('製造者', 'ねこ印食品（株）汐見市しょうゆ町9')], size=6.2, maxy=134)
    P.barcode(x0 + 14, 140, '498122000455', h=14)
    P.text('希望小売価格', 'bizb', 5.5, x0 + 130, 142, INK, anchor='lt'); P.text('180円', 'kaku', 11, x0 + 130, 150, INK, anchor='lt')

@good('noodleLid', 192, 192)
def _(P):
    R = 0xc8281e; c = 96
    P.rect(0, 0, 192, 192, 0xf2efe6)
    P.ellipse(1, 1, 190, 190, R); P.ellipse(7, 7, 178, 178, 0xf6f3ea)
    P.photo(ph('ramen_shoyu'), 40, 66, 112, 70, f=(0.5, 0.45, 1.3), shape='ellipse')
    P.text('しょうゆ味', 'dela', 18, c, 40, R)
    P.text('ねこ印 カップめん', 'kakub', 9, c, 148, INK)
    P.text('熱湯3分', 'kaku', 10, c, 162, R)
    P.poly([(c - 8, 178), (c + 8, 178), (c, 188)], R)

def onigiri(kind):
    name, col, filling, yen = {'ume': ('梅', 0xd8302a, 'うめぼし', 120), 'tuna': ('ツナマヨ', 0x2a6ad8, 'ツナマヨネーズ', 130), 'shake': ('鮭', 0xe0782a, '焼きさけ', 140)}[kind]
    def fn(P):
        for x0 in (0, 192):
            P.photo(ph('onigiri'), x0, 0, 192, 168, f=(0.36, 0.52, 2.0), sat=0.95)
        # front: the pull strip and its numbers, the flavour sticker
        P.rect(91, 0, 10, 168, col); P.text('1', 'kaku', 9, 96, 20, WHITE)
        P.rect(46, 92, 100, 52, WHITE, r=4); P.rect(49, 95, 94, 46, col, r=3, line=1.4)
        P.text(name, 'mincho', 22 if len(name) == 1 else 15, 96, 112, col)
        P.text('手づくりおにぎり', 'kakub', 6.5, 96, 132, INK)
        for n, x in (('2', 30), ('3', 162)): P.ellipse(x - 8, 150 - 8, 16, 16, WHITE); P.text(n, 'kaku', 9, x, 150, col)
        # back: the facts sticker, the price
        P.rect(192 + 20, 80, 152, 70, WHITE)
        facts(P, 192 + 22, 82, 148, [('名称', 'おにぎり（' + filling + '）'), ('消費期限', '99.4.18 午前3時'), ('製造者', '三河屋 横丁かど')], size=6, maxy=148)
        price_tag(P, 192 + 130, 58, yen)
    return fn
for k in ('ume', 'tuna', 'shake'): G['oni:' + k] = (384, 168, onigiri(k))

def bun(kind):
    melon = kind == 'melon'
    def fn(P):
        P.rect(0, 0, 200, 200, 0xd8a050)
        P.photo(ph('melonpan' if melon else 'anpan'), 0, 0, 200, 200, f=(0.3, 0.45, 2.2) if melon else (0.55, 0.5, 1.9), sat=0.95)
        P.rect(0, 130, 200, 30, 0x3f8a3a); P.rect(0, 128, 200, 2, WHITE); P.rect(0, 160, 200, 2, WHITE)
        P.text('メロンパン' if melon else 'あんぱん', 'kaku', 15, 100, 145, WHITE)
        P.ellipse(110, 34, 64, 64, 0x4a2a14); P.ellipse(112, 36, 60, 60, 0xfff4d8)
        P.text('かめパン', 'mincho', 10, 142, 58, 0x4a2a14); P.text('本舗', 'mincho', 8, 142, 72, 0x4a2a14)
        price_tag(P, 12, 26, 130 if melon else 120)
    return fn
G['bun:melon'] = (200, 200, bun('melon')); G['bun:an'] = (200, 200, bun('an'))

@good('purin', 224, 104)
def _(P):
    P.photo(ph('flan'), 0, 0, 224, 104, f=(0.5, 0.55, 1.6), sat=0.95)
    P.rect(0, 22, 224, 40, WHITE); P.rect(0, 22, 224, 2, 0x2f6fd6); P.rect(0, 60, 224, 2, 0x2f6fd6)
    P.text('なめらかプリン', 'kaku', 12, 60, 42, 0x6a3210)
    P.text('モーベル牧場', 'kakub', 7, 168, 36, 0x2f6fd6); P.text('CUSTARD PUDDING 90g', 'barlow', 6.5, 168, 50, 0x2f6fd6)

@good('purinLid', 144, 144)
def _(P):
    c = 72
    P.rect(0, 0, 144, 144, 0xe8e4d8); P.ellipse(1, 1, 142, 142, 0xd8a830); P.ellipse(6, 6, 132, 132, 0xf6f2e8)
    P.text('プリン', 'kaku', 18, c, 30, 0x6a3210)
    P.photo(ph('flan'), 34, 46, 76, 50, f=(0.5, 0.5, 1.4), shape='round', r=4)
    P.text('カスタード', 'kakub', 8, c, 106, 0x2f6fd6); P.text('MOOBELL', 'barlow', 7, c, 118, 0x2f6fd6)

@good('puff', 188, 220)
def _(P):
    R = 0xd8382a
    P.rect(0, 0, 188, 220, Y)
    P.photo(ph('cornchips'), 0, 120, 94, 90, f=(0.5, 0.5, 1.3), sat=1.0)
    P.rect(0, 0, 188, 10, R); P.rect(0, 210, 188, 10, R)
    P.text('サクサク棒', 'dela', 15, 47, 64, R, vert=True, maxh=96, stroke=(1, WHITE))
    P.rect(4, 112, 86, 14, INK); P.text('チーズ味', 'kakub', 8, 47, 119, Y)
    P.ellipse(60, 176, 30, 30, WHITE); P.text('10円', 'kaku', 8, 75, 191, R)
    P.text('チュー太製菓', 'kakub', 6, 30, 16, INK)
    x0 = 94; P.rect(x0, 10, 94, 200, Y)
    facts(P, x0 + 3, 16, 88, [('名称', 'スナック菓子'), ('原材料名', 'コーン、植物油脂、チーズパウダー、食塩'), ('内容量', '6g'), ('製造者', 'チュー太製菓（株）')], size=5.2, maxy=150, paper=WHITE)
    P.text('あたりが出たらもう1本', 'bizb', 5, x0 + 47, 162, INK)

@good('candy', 96, 48)
def _(P):
    P.photo(ph('gumdrop'), 0, 0, 96, 48, f=(0.5, 0.5, 1.4), sat=0.95)
    P.rect(0, 16, 96, 16, WHITE); P.text('フルーツあめ', 'kakub', 8, 48, 24, RED)


# ================================================================== shop (src/world/mikawayaArt.js cells, 4x)
S = {}
SNACKS = [  # name, ground, accent, photo, focus
    ('えびせん', 0xf2a08a, 0xc8302a, 'shrimp'), ('ポテト', 0xf8d030, 0xc8302a, 'chips'), ('キャラメル', 0xf4c81a, 0x8a4a1a, 'caramelcorn'), ('ガム', 0x58c0b0, WHITE, 'jelly'),
    ('ラムネ', 0x8ad8f0, 0x2a6ad8, 'konpeito'), ('こんぺい', 0x8a5ad8, 0xffd23f, 'konpeito'), ('せんべい', 0x8a4a1a, 0xe8c040, 'crackers'), ('ビスケ', 0xe8b870, 0x6a3a1e, 'biscuit'),
    ('チョコ', 0x5a2e16, 0xe0443a, 'chocolate'), ('あめ', 0xe0443a, WHITE, 'gumdrop'), ('するめ', 0xe8dcc0, 0x1e2a6a, 'octopus'), ('きなこ', 0xd8a850, 0x6a3a1e, 'beans'),
    ('ふがし', 0x7a4a26, 0xf4e6c4, 'barley'), ('ポン', 0xf4ead2, 0xe0443a, 'popcorn'), ('ゼリー', 0x58c06c, 0xff6f91, 'strawberry'), ('カレー', 0xf08a2a, 0x6a1a0a, 'curry'),
    ('のりしお', 0x2a8a4a, WHITE, 'chips'), ('うめ', 0xa8283a, 0xf8a8c0, 'ume'), ('ソース', 0x4a2a14, 0xf4c040, 'crackers'), ('ミント', 0xb8ecd8, 0x2a8a6a, 'jasmine'),
    ('ココア', 0x2a5ab0, WHITE, 'cocoa'), ('みかん', 0xf8a030, 0x2a8a3a, 'mikan'), ('ぶどう', 0x6a2a9a, 0xf4d030, 'grape'), ('メロン', 0x3ac850, WHITE, 'melon'),
]
def snack(i):
    name, bg, ac, k = SNACKS[i]
    def fn(P):
        P.rect(0, 0, 64, 64, bg)
        P.photo(ph(k), 0, 17, 64, 47, f=(0.5, 0.5, 1.2 + (i % 3) * 0.2), sat=0.95)
        P.rect(0, 0, 64, 17, ac)
        P.text(name, 'kaku', 9 if len(name) <= 3 else 7.5, 32, 9, on(ac), maxw=60)
        yen = [10, 20, 30, 50, 100][(i * 3) % 5]
        P.ellipse(42, 42, 20, 20, 0xffd23f); P.ellipse(42, 42, 20, 20, INK, line=0.8); P.text('%d円' % yen, 'kaku', 6 if yen < 100 else 5, 52, 52, RED)
        P.rect(0, 0, 64, 64, mixc(bg, 0, 0.35), line=0.8)
    return fn
for i in range(24): S['snack%d' % i] = (64, 64, snack(i))

TALLS = [('ピカピカ', '洗剤', 0xf4f0e4, 0x2f6fd6, 'bubbles'), ('せっけん', 'ミルク', 0x2f8ab0, WHITE, 'milk'), ('コーン', 'フレーク', 0xf8d030, 0xc8302a, 'cereal'), ('マッチ', 'ふじ', 0xc8302a, WHITE, 'matchbox'),
         ('かとり', '線香', 0x2a7a4a, 0xf4e6c8, None), ('歯みがき', 'さわやか', 0xf4e6c8, 0xc83a2a, 'jasmine'), ('ティッシュ', 'やわらか', 0x2a4a9a, 0xe8b830, 'sakura'), ('ねこごはん', 'かつお味', 0xf08aa8, WHITE, 'cat')]
def tall(i):
    name, sub, bg, ac, k = TALLS[i]
    def fn(P):
        P.rect(0, 0, 64, 96, bg)
        if k: P.photo(ph(k), 4, 34, 56, 46, f=(0.5, 0.5, 1.3), sat=0.95)
        else:
            P.rect(4, 34, 56, 46, 0x1e4a2a)
            for r in (20, 15, 10, 5): P.ellipse(32 - r, 57 - r, 2 * r, 2 * r, 0x6a8a4a, line=1.6)
        P.rect(0, 8, 64, 22, ac); P.rect(0, 7, 64, 1, mixc(ac, 0, 0.4)); P.rect(0, 30, 64, 1, mixc(ac, 0, 0.4))
        P.text(name, 'kaku', 9 if len(name) <= 3 else 7.5, 32, 19, on(ac), maxw=60)
        P.rect(12, 83, 40, 10, WHITE, r=2); P.text(sub, 'kakub', 6, 32, 88, INK)
        P.rect(0, 0, 64, 96, mixc(bg, 0, 0.35), line=0.8)
    return fn
for i in range(8): S['tall%d' % i] = (64, 96, tall(i))

TINS = [('ねこ缶', 'まぐろ', 0xd8463a, 'cat'), ('さば', '水煮', 0xf4f0e4, 'sardines'), ('みかん', 'シロップ', 0x2f8ab0, 'mikan'), ('コーン', 'つぶ', 0xe8b830, 'corn'), ('カレー', '中辛', 0x3aa65a, 'curry'), ('のり', 'つくだ煮', 0x1e2a3a, 'sea')]
def tin(i):
    name, sub, bg, k = TINS[i]
    light = bg in (0xf4f0e4, 0xe8b830)
    def fn(P):
        P.rect(0, 0, 128, 64, bg)
        P.metal(0, 0, 128, 6, 0xc8ccd0); P.metal(0, 58, 128, 6, 0xc8ccd0)
        for x0 in (0, 64):
            P.photo(ph(k), x0 + 4, 26, 40, 30, f=(0.5, 0.5, 1.3), shape='round', r=2)
            P.rect(x0 + 2, 9, 60, 15, RED if light else WHITE)
            P.text(name, 'kaku', 9, x0 + 32, 16.5, WHITE if light else RED, maxw=56)
            P.text(sub, 'kakub', 6, x0 + 54, 41, INK if light else WHITE, vert=True, maxh=28)
    return fn
for i in range(6): S['can%d' % i] = (128, 64, tin(i))

KITS = [('ロボ', 0x1a2a5a, 'robot'), ('せんしゃ', 0x6a4a2a, 'tank'), ('ふね', 0x1a4a7a, 'ship'), ('ひこうき', 0xd86a2a, 'plane'), ('えんばん', 0x2a1a3a, 'milkyway')]
def kit(i):
    name, c0, k = KITS[i]
    def fn(P):
        P.photo(ph(k), 44, 0, 84, 64, f=(0.5, 0.5, 1.1), sat=0.9)
        P.rect(0, 0, 44, 64, c0); P.rect(44, 0, 2, 64, 0xffd23f)
        P.text(name, 'kaku', 10, 12, 6, 0xffd23f, anchor='mt', vert=True, maxh=54)
        P.text('1/100', 'barlowx', 8, 32, 8, WHITE); P.text('HOBBY', 'barlow', 6, 32, 18, WHITE); P.text('MATSU', 'barlow', 6, 32, 25, WHITE)
        P.rect(22, 44, 20, 12, RED); P.text('NEW', 'barlowx', 7, 32, 50, WHITE)
        P.rect(0, 0, 128, 64, 0xf4ecd8, line=0.8)
    return fn
for i in range(5): S['kit%d' % i] = (128, 64, kit(i))

def poster(title, sub, k, f, ground, ink, accent, face='dela', size=26, vert=False):
    def fn(P):
        P.rect(0, 0, 160, 240, ground)
        P.photo(ph(k), 0, 70, 160, 140, f=f, sat=0.92)
        P.text(title, face, size, 80, 38, ink, stroke=(1.6, accent), maxw=148)
        P.text(sub, 'kakub', 9, 80, 224, ink, maxw=150)
        P.rect(0, 0, 160, 240, mixc(ground, 0, 0.3), line=1)
    return fn
S['poster0'] = (160, 240, poster('ラムネ', '冷えてます 一本80円', 'soda', (0.5, 0.5, 1.3), 0x2a6ad8, WHITE, 0x123e8a))
S['poster1'] = (160, 240, poster('アイス', 'つめたい アイスクリーム あります', 'icecream', (0.5, 0.5, 1.2), 0xfbf6ee, RED, WHITE))
S['poster2'] = (160, 240, poster('超合金', 'ロボット プラモデル 入荷', 'robot', (0.5, 0.45, 1.1), 0x1a2a5a, 0xffd23f, 0x6a1a1a))
S['poster3'] = (160, 240, poster('プロレス', '4月24日(土) 汐見市体育館 午後6時', 'wrestling', (0.5, 0.45, 1.1), 0x101010, 0xf0c838, 0x6a1a1a))
S['poster4'] = (160, 240, poster('カレー', 'ほこほこ堂 レトルトカレー 中辛', 'curry', (0.5, 0.5, 1.2), 0x8a2a1a, WHITE, 0x4a1008))
S['poster5'] = (160, 240, poster('大怪獣', '汐見東映 4月29日より公開', 'dino', (0.5, 0.45, 1.1), 0x1a0a0a, 0xffd23f, 0x8a1a10, size=30))

def calendar(P):
    w, h = 128, 192
    P.rect(0, 0, w, h, 0xfbf8f0)
    P.photo(ph('sakura'), 6, 8, w - 12, 76, f=(0.5, 0.5, 1.1), sat=0.95)
    P.text('4', 'serif', 20, 12, 98, RED, anchor='lm'); P.text('平成11年', 'kakub', 7, w - 8, 94, INK, anchor='rm'); P.text('1999 APRIL', 'barlow', 6.5, w - 8, 104, INK, anchor='rm')
    for i, d in enumerate('日月火水木金土'): P.text(d, 'kakub', 6, 13 + i * 17, 118, RED if i == 0 else 0x2a5aa8 if i == 6 else INK)
    for d in range(1, 31):
        k = d + 3; i, j = k % 7, k // 7
        P.text(str(d), 'barlow', 7, 13 + i * 17, 130 + j * 11, RED if i == 0 or d == 29 else 0x2a5aa8 if i == 6 else INK)
    P.text('三河屋 横丁かど TEL 0123-45-6789', 'biz', 5, w / 2, 186, INK)
    P.rect(w / 2 - 3, 0, 6, 5, 0x6a6a6a); P.rect(0, 0, w, h, 0xc8c0b0, line=0.8)
S['calendar'] = (128, 192, calendar)

def menu(P):
    w, h = 176, 240
    P.rect(0, 0, w, h, 0x5a3a22); P.rect(0, 0, w, h, 0x3a2414, line=3)
    P.text('おしながき', 'mincho', 16, w / 2, 16, 0xf4e6c4, track=2)
    for i, (a, b) in enumerate([('牛乳', 150), ('ほうき', 600), ('工具セット', 900), ('乾電池', 300), ('蛍光ランプ', 400), ('チラシ', 500), ('懐中時計', 4000)]):
        y = 32 + i * 29; P.rect(8, y, w - 16, 25, 0xf4ecd8 if i % 2 else 0xfbf6e8)
        P.text(a, 'mincho', 12, 14, y + 12.5, INK, anchor='lm'); P.text('%d円' % b, 'kaku', 12, w - 14, y + 12.5, RED, anchor='rm')
S['menu'] = (176, 240, menu)


# ---- Ramen Yamada (src/products/ramenArt.js): the dishes on the ticket machine and the menu, the signboard, the beer
# poster (keys 'rm:...', in the shop sheet)
DISH = {'rm_shoyu': ('ramen_shoyu', (0.5, 0.5, 1.3)), 'rm_miso': ('ramen_miso', (0.5, 0.5, 1.4)), 'rm_tonkotsu': ('ramen_tonkotsu', (0.5, 0.5, 1.3)),
        'rm_shio': ('ramen4', (0.5, 0.5, 1.3)), 'rm_tantan': ('ramen_miso', (0.35, 0.45, 2.0)), 'rm_gyoza': ('gyoza', (0.5, 0.5, 1.3)),
        'rm_rice': ('rice', (0.5, 0.5, 1.6)), 'rm_chashu': ('ramen_shoyu', (0.62, 0.42, 2.6)), 'rm_beer': ('beer2', (0.5, 0.45, 1.2)),
        'rm_sake': ('sake', (0.5, 0.5, 1.2)), 'rm_oolong': ('cola', (0.5, 0.5, 1.2)), 'rm_kaedama': ('kaedama', (0.5, 0.4, 1.4))}
def dish(k, f):
    def fn(P):
        P.photo(ph(k), 0, 0, P.w, P.h, f=f, sat=0.98, con=1.06)
        P.rect(0, 0, P.w, P.h, 0x2e1f28, line=0.8)
    return fn
for i, (k, f) in DISH.items(): S['rm:dish:' + i] = (44, 36, dish(k, f))

def sign(P):
    w, h = 320, 64
    P.texture('acg:Wood049', 0, 0, w, h, tint=0x3a2416, k=1.0, mode='normal')
    P.rect(0, 0, w, 4, 0xc8a060); P.rect(0, h - 4, w, 4, 0xc8a060)
    P.text('らーめん 山田', 'mincho', 32, w / 2, 28, 0xf4e8c8, track=3)
    P.text('RAMEN YAMADA', 'serifb', 8, w / 2, 52, 0xe8402a, track=4)
    P.photo(ph('ramen_shoyu'), 10, 12, 40, 40, f=(0.5, 0.5, 1.3), shape='ellipse')
    P.photo(ph('gyoza'), 270, 12, 40, 40, f=(0.5, 0.5, 1.3), shape='ellipse')
S['rm:sign'] = (320, 64, sign)

def beer(P):
    w, h = 64, 96
    P.photo(ph('beer2'), 0, 0, w, h, f=(0.5, 0.5, 1.1), sat=0.95)
    P.rect(0, 0, w, 20, 0x14204e); P.text('生ビール', 'kaku', 10, w / 2, 10, 0xf4f0e0)
    P.rect(0, 76, w, 20, 0xc9a24a); P.text('ホーホー酒造', 'kakub', 6, w / 2, 82, 0x14204e); P.text('中ジョッキ 550円', 'kakub', 5, w / 2, 90, 0x14204e)
S['rm:beer'] = (64, 96, beer)


# ================================================================== street (src/world/LanePosters.js, keys 'lane:<design>:<n>')
# Posters and notices pasted up round the lane, 4x their old size: (48 x 68 -> 192 x 272, 40 x 58 -> 160 x 232,
# 56 x 44 -> 224 x 176). Photos: the lane set already shipped in public/img/photos (credited there).
L = {}
def lp(n): return 'local:lane/' + n + '.jpg'
def tape(P, w):
    for x in (6, w - 30): P.rect(x, 0, 24, 9, 0xe9e1c6)

def travel(src, title, sub, f=(0.5, 0.5, 1.0)):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, 0xf4efe2)
        P.photo(src, 8, 8, w - 16, round(h * 0.66), f=f, sat=0.88, warm=0.03)
        P.text(title, 'mincho', 26 if len(title) <= 3 else 20, w / 2, round(h * 0.66) + 34, INK, maxw=w - 20)
        P.text(sub, 'serifb', 10, w / 2, h - 30, 0x8a2a2a, track=3)
        P.rect(14, h - 14, w - 28, 3, RED); P.text('JNR', 'barlowx', 7, w - 18, h - 22, 0x1f4a9a, anchor='rm')
        tape(P, w)
    return fn
for i, (n, t, s, f) in enumerate([('fuji_morning', '富士山', 'SEE JAPAN', (0.5, 0.5, 1.0)), ('snow_monkeys', '湯けむり', 'ONSEN', (0.5, 0.5, 1.0)), ('sailboat', '夏の海', 'SUMMER', (0.5, 0.5, 1.0)), ('hydrangea', '旅に出よう', 'BY RAIL', (0.5, 0.5, 1.0)), ('shinkansen', 'ふるさと', 'BY RAIL', (0.5, 0.4, 1.0)), ('fuji_izu', '伊豆の春', 'SEE JAPAN', (0.45, 0.45, 1.2))]):
    L['travel:%d' % i] = (192, 272, travel(lp(n), t, s, f))

def event(sumo):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, 0xf8f4ea)
        P.rect(0, 0, w, 64, 0xb82020 if sumo else 0x1f4a9a)
        P.text('大相撲' if sumo else '少年野球', 'mincho' if sumo else 'kaku', 34 if sumo else 26, w / 2, 33, WHITE)
        P.photo(lp('sumo' if sumo else 'baseball'), 8, 72, w - 16, 130, sat=0.9)
        P.text('上山場所' if sumo else '夏季大会', 'mincho', 18, w / 2, 222, INK)
        P.text('8月15日〜20日 市民体育館' if sumo else '7月27日(日) 河川敷グラウンド', 'kakub', 8.5, w / 2, 246, 0xb82020, maxw=w - 16)
        tape(P, w)
    return fn
L['event:0'] = (192, 272, event(True)); L['event:1'] = (192, 272, event(False))

def zoo(n, aq):
    def fn(P):
        w, h = P.w, P.h
        P.photo(lp(n), 0, 0, w, h, sat=0.92)
        P.rect(12, h - 84, w - 24, 64, 0xf2c41a); P.rect(12, h - 84, w - 24, 64, INK, line=1.5)
        P.text('すいぞくかん' if aq else 'どうぶつえん', 'maru', 17, w / 2, h - 62, INK, maxw=w - 36)
        P.text('汐見市立' + ('水族館' if aq else '動物園') + ' 月曜休園', 'kakub', 7, w / 2, h - 34, 0x8a2a2a)
        tape(P, w)
    return fn
for i, n in enumerate(['elephant', 'giraffe', 'aquarium']): L['zoo:%d' % i] = (192, 272, zoo(n, n == 'aquarium'))

def kakigori(P):
    w, h = P.w, P.h
    P.rect(0, 0, w, h, 0xfbf8f0)
    P.text('氷', 'mincho', 54, w / 2 - 34, 46, RED); P.text('かき氷', 'kaku', 18, w / 2 + 30, 46, 0x2a5ab0, vert=True, maxh=74)
    P.photo(lp('kakigori'), 10, 92, w - 20, 104, sat=0.95)
    P.text('はじめました', 'mincho', 16, w / 2, 212, RED)
    P.text('いちご・メロン・レモン 各100円', 'kakub', 7, w / 2, 228, INK, maxw=w - 16)
    tape(P, w)
L['kakigori:0'] = (160, 232, kakigori)

def festival(i):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, 0x1a2448)
        P.photo('local:fireworks.jpg', 8, 8, w - 16, round(h * 0.5), f=(0.5 - 0.15 * i, 0.5, 1.2), sat=0.95)
        y = round(h * 0.5) + 8
        P.text('夏祭り', 'mincho', 30 if w > 170 else 26, w / 2, y + 28, 0xffd23f)
        P.text('盆踊り・夜店・花火', 'kakub', 9, w / 2, y + 52, WHITE)
        P.text('8月14日(土) 午後6時から', 'kakub', 8, w / 2, h - 38, 0xffd23f, maxw=w - 12)
        P.text('上山町内会', 'mincho', 9, w / 2, h - 18, 0xc8c4d8)
        tape(P, w)
    return fn
L['festival:0'] = (192, 272, festival(0)); L['festival:1'] = (160, 232, festival(1))

def lost(n, dog, name):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, 0xfbf8ee)
        P.text('迷い犬' if dog else '迷い猫', 'kaku', 28, w / 2, 24, RED)
        P.text('さがしています', 'kakub', 9, w / 2, 48, INK)
        P.photo(lp(n), 12, 58, w - 24, 92, sat=0.85, con=1.0)
        P.lines('名前：%s　%s。赤い首輪をしています。見かけた方はご連絡ください。' % (name, '柴犬 オス 3才' if dog else 'メス 2才'), 'biz', 7, 12, 156, w - 24, INK, lh=9.5, maxy=h - 50)
        for x in range(4, w - 16, 19):  # tear-off phone tabs
            P.rect(x, h - 44, 1, 44, 0xb8b4a8)
            P.text('TEL 23-4567', 'biz', 5.6, x + 9.5, h - 22, INK, rot=90)
        tape(P, w)
    return fn
for i, (n, dog, nm) in enumerate([('cat_black', 0, 'クロ'), ('cat_grey', 0, 'タマ'), ('cat_birman', 0, 'モモ'), ('cat_fluffy', 0, 'ミカン'), ('shiba', 1, 'ポチ'), ('shiba_puppy', 1, 'コタ')]):
    L['lost:%d' % i] = (160, 232, lost(n, dog, nm))

def rent(i):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, 0xfbf8f0); P.rect(2, 2, w - 4, h - 4, 0x1f4a9a, line=2)
        P.text('貸室', 'mincho', 34, w / 2, 32, 0x1f4a9a)
        x0, y0, pw, ph = 18, 62, w - 36, 80
        P.rect(x0, y0, pw, ph, INK, line=1.4); P.rect(x0 + pw * 0.45, y0, 1.2, ph, INK); P.rect(x0, y0 + ph / 2, pw * 0.45, 1.2, INK)
        P.rect(x0 + pw * 0.45 + 2, y0 + 2, pw * 0.55 - 4, ph - 4, 0xd8d0a0)
        for k in range(7): P.rect(x0 + pw * 0.45 + 4, y0 + 8 + k * 10, pw * 0.55 - 8, 0.8, 0xb8a870)
        P.text('和6', 'kakub', 7, x0 + pw * 0.72, y0 + ph / 2, INK); P.text('DK', 'kakub', 7, x0 + pw * 0.22, y0 + ph * 0.25, INK); P.text('洋4.5', 'kakub', 6, x0 + pw * 0.22, y0 + ph * 0.75, INK)
        P.text('2DK 駅徒歩8分', 'kakub', 10, w / 2, 160, INK)
        P.text('家賃 %s円' % ('45,000' if i == 0 else '38,000'), 'kaku', 13, w / 2, 182, RED)
        P.text('太田不動産', 'mincho', 11, w / 2, h - 22, 0x1f4a9a)
    return fn
L['rent:0'] = (160, 232, rent(0)); L['rent:1'] = (160, 232, rent(1))

def print_(src, cap, f=(0.5, 0.5, 1.0)):
    def fn(P):
        w, h = P.w, P.h
        P.rect(0, 0, w, h, 0xf4f0e4)
        P.photo(src, 10, 10, w - 20, h - 44, f=f, sat=0.88, warm=0.03)
        P.text(cap, 'barlow', 10, w / 2, h - 18, 0x6a6a6a, track=2)
    return fn
for i, (src, cap) in enumerate([('local:sakura.jpg', 'APRIL 1987'), (lp('fuji_morning'), 'SHOWA 62'), ('local:skyline.jpg', 'JUNE'), ('local:cumulus.jpg', 'AUGUST'), ('local:rainy_lane.jpg', 'JUNE'), (lp('kakigori'), 'AUGUST')]):
    L['print:%d' % i] = (224, 176, print_(src, cap))


SHEETS = {'goods': (G, 'goods:'), 'shop': (S, 'mk:'), 'street': (L, 'lane:')}


def bake_sheet(name, width=1024):
    reg, prefix = SHEETS[name]
    ims = {}
    for k, (w, h, fn) in reg.items():
        P = Panel(w, h, 0xffffff); fn(P); ims[k if k.startswith('rm:') else prefix + k] = P.image()
    order = sorted(ims, key=lambda i: -ims[i].height)
    x = y = rh = 0; idx = {}
    for i in order:
        w, h = ims[i].size
        if x + w > width: x = 0; y += rh; rh = 0
        idx[i] = [x, y, w, h]; x += w; rh = max(rh, h)
    out = Image.new('RGB', (width, y + rh), (0, 0, 0))
    for i, (x, y, w, h) in idx.items(): out.paste(ims[i], (x, y))
    os.makedirs(OUT, exist_ok=True)
    out.save(os.path.join(OUT, name + '.webp'), quality=94, method=6)
    json.dump(idx, open(os.path.join(OUT, name + '.json'), 'w'), separators=(',', ':'))
    print(name, out.size, os.path.getsize(os.path.join(OUT, name + '.webp')) // 1024, 'KB')
    return out


def main():
    args = [a for a in sys.argv[1:] if a in SHEETS]
    names = args or list(SHEETS)
    for n in names:
        out = bake_sheet(n)
        if '--sheet' in sys.argv: out.resize((out.width * 2, out.height * 2), Image.NEAREST).save(sys.argv[sys.argv.index('--sheet') + 1].replace('.png', '_' + n + '.png'))


if __name__ == '__main__':
    main()
