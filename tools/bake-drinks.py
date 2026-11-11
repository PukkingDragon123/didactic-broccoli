#!/usr/bin/env python3
"""bake-drinks.py: every drink's label (cans, PET bottles, the little tonic bottles, the sake cup, the ramune bottle),
laid out like a real 1999 Japanese drink and baked from real photographs into public/img/drinks/labels.webp +
labels.json ({ 'drinks:wrap:<id>': [x, y, w, h] }), one whole wrap per drink (front half | back half) at the size the 3D container
expects (src/products/spec.js wrapSize: 2 px per millimetre).

The pictures are real photographs (Google Open Images, CC BY 2.0: coffee, tea, fruit, a glass of beer...; ambientCG
CC0: the brushed aluminium of the can and the label paper), credited in CREDITS.md. The names, makers and layouts are
the game's own (src/products/brands.js); no real logo, mascot or trade dress. No mascots: real product photography and
plain type, the way the real shelves looked.
  python3 -I tools/bake-drinks.py [--only id,id] [--sheet out.png]
Needs Pillow and numpy; photos and fonts are fetched once into shots/.art-cache.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
from printkit import Panel, mixc, rgb, ROOT

OUT = os.path.join(ROOT, 'public', 'img', 'drinks')

# ------------------------------------------------------------------ the photographs (Open Images IDs, CC BY 2.0)
PH = {
    'beans': '59bc07aff213dead@test', 'coffee_black': '0b6927daf4ec8091@test', 'latte': '0b6008127f1034f7@test',
    'heart': '03e20f16eafbf89a@test', 'milkcoffee': '15a388b862890689@test', 'aulait': '0aec86633421382f@test',
    'cocoa': '0af12cae5301c91d@validation', 'cocoa2': '15b5a9e9d05e00ac@test', 'matcha': '569e6a1f8b1c9984@validation',
    'jasmine': '129df409588b04f4@test', 'milktea_glass': '2ffda31f40f1d21e@test', 'milktea_cup': '02d301de1b793797@test',
    'greentea': '00d03e88b1d2f7a3@test', 'melon': '0aebb420d22f3e6e@validation', 'grape': '03e2cc8f5547bcbe@validation',
    'lemons': '015af6da5e40d1d8@test', 'lemonslice': '065546d583608b96@test', 'bubbles': '086e20b26cefa816@test',
    'milk': '1636d912cb396b1b@test', 'plum': '261b8dd5057c1470@test', 'beer': '18eedb7aeb04344a@test',
    'beer2': '0f79f3c11a3acce9@test', 'whisky': '1358dd639dfd66e8@test', 'sea': '011d1dcbfb65a15f@test',
    'fuji': '04da2550440dd624@validation', 'grapefruit': '023f85a9892a798a@test', 'corn': '0039d1a14d295dee@test',
    'barley': '16f8a879d09ef4cb@test', 'wheat': '002a46e8cbba77fe@test', 'soda': '17b3ba937734b010@test',
    'lemonade': '20aec071a8260aac@test', 'white': '11c41a8d4373f4cf@validation', 'teafield': '2c6b472a3ddd5dd7@test',
    'cornsoup': 'dc77f4e27dbb3e52@test', 'oden': '91ba2deb2230aeda@test', 'sake': '239d60ab92280542@test',
    'ume': '6d31cfc15b4efd11@test', 'wave': '15fb215666bb5782@test', 'teacup': '642e0fa2ad99d843@test',
    'azuki': '11959778576e331e@validation', 'cows': '6b792f8539a62e67@test', 'cola': '27bc7351ff155958@test', 'cola2': '1a9d5f7cc9a88a1d@validation',
}
def ph(k): return 'oi:' + PH[k]

# ------------------------------------------------------------------ the facts (mirrors src/products/brands.js)
BR = {
    'bancho': ('番長珈琲', 'BANCHO COFFEE', '番長珈琲本舗（株）', '汐見市本町2-14', '10271'),
    'chako': ('ちゃこ園', 'CHAKO-EN TEA', 'ちゃこ園製茶（株）', '汐見市茶畑町88', '20418'),
    'puku': ('プクポップ', 'PUKU POP', '泡島飲料（株）', '泡島町みなと1-3', '30552'),
    'moobell': ('モーベル牧場', 'MOOBELL FARM', 'モーベル乳業（株）', '高原村まきば520', '40736'),
    'naminori': ('ナミノリ', 'NAMINORI SPORTS', 'ナミノリ飲料（株）', '汐見市浜通り7-1', '50193'),
    'genkin': ('ゲンキン製薬', 'GENKIN PHARMA', 'ゲンキン製薬（株）', '汐見市薬師町5-9', '60824'),
    'hoho': ('ホーホー酒造', 'HOHO BREWERY', 'ホーホー酒造（株）', '汐見市蔵前町3-11', '70365'),
    'hokohoko': ('ほこほこ堂', 'HOKOHOKO-DO', '（株）ほこほこ堂', '汐見市湯気町1-8', '80947'),
    'nazo': ('謎商会', 'NAZO SHOKAI', '（有）謎商会', '住所不明', '99999'),
    'gacha': ('ガチャラムネ', 'GACHA RAMUNE', 'ガチャ鉱泉所', '汐見市川端町6', '31108'),
}
CONT = {'can190': (53, 92, 'can'), 'can250': (53, 121, 'can'), 'can350': (66, 110, 'can'), 'can500': (66, 155, 'can'),
        'pet500': (66, 68, 'pet'), 'bottle': (38, 45, 'bottle'), 'cup': (66, 52, 'cup'), 'ramune': (56, 60, 'ramune')}
D = {}
def d(id, brand, cont, kind, ing, vol, mat, price, **o): D[id] = dict(id=id, brand=brand, cont=cont, kind=kind, ing=ing, vol=vol, mat=mat, price=price, item=str(len(D) * 37 + 101).zfill(5), **o)
d('vd_bancho', 'bancho', 'can190', 'コーヒー', 'コーヒー', '190g', 'steel', 130)
d('vd_morning', 'bancho', 'can190', 'コーヒー飲料', '牛乳、砂糖、コーヒー、乳化剤', '190g', 'steel', 130)
d('vd_maxsweet', 'bancho', 'can190', 'コーヒー飲料', '加糖練乳、砂糖、コーヒー、香料', '190g', 'steel', 130)
d('vd_aulait', 'bancho', 'can190', '乳飲料', '牛乳、砂糖、コーヒー、乳化剤', '190g', 'steel', 140, hot=1)
d('vd_cocoa', 'bancho', 'can190', '清涼飲料水', '砂糖、ココア、牛乳、食塩、香料', '190g', 'steel', 130, hot=1, shake=1)
d('vd_ocha', 'chako', 'pet500', '緑茶（清涼飲料水）', '緑茶、ビタミンC', '500ml', 'pet', 150)
d('vd_mugi', 'chako', 'pet500', '麦茶（清涼飲料水）', '大麦', '500ml', 'pet', 140)
d('vd_jasmine', 'chako', 'pet500', 'ジャスミン茶（清涼飲料水）', 'ジャスミン茶、ビタミンC', '500ml', 'pet', 150)
d('vd_milktea', 'chako', 'pet500', '紅茶飲料', '牛乳、砂糖、紅茶、香料、乳化剤', '500ml', 'pet', 150)
d('vd_melon', 'puku', 'can350', '炭酸飲料', '果糖ぶどう糖液糖、香料、酸味料、着色料（黄4、青1）', '350ml', 'alu', 130)
d('vd_kora', 'puku', 'can350', '炭酸飲料', '砂糖、カラメル色素、酸味料、香料、カフェイン', '350ml', 'alu', 130)
d('vd_grape', 'puku', 'can350', '炭酸飲料', 'ぶどう果汁、果糖ぶどう糖液糖、香料、酸味料', '350ml', 'alu', 130)
d('vd_cclemon', 'puku', 'pet500', '炭酸飲料', '砂糖、レモン果汁、ビタミンC、香料、酸味料', '500ml', 'pet', 150)
d('vd_ramunecan', 'puku', 'can350', '炭酸飲料', '砂糖、酸味料、香料', '350ml', 'alu', 130)
d('vd_cider', 'puku', 'can250', '炭酸飲料', '砂糖、香料、酸味料', '250ml', 'alu', 130)
d('vd_karupiko', 'moobell', 'pet500', '乳性飲料（清涼飲料水）', '砂糖、脱脂粉乳、乳酸菌飲料、香料、酸味料', '500ml', 'pet', 150)
d('vd_warmmilk', 'moobell', 'can190', '乳飲料', '生乳、はちみつ、砂糖', '190g', 'steel', 130, hot=1)
d('vd_ponkari', 'naminori', 'pet500', '清涼飲料水', '砂糖、果汁、食塩、酸味料、香料、塩化K、乳酸Ca', '500ml', 'pet', 150)
d('vd_aquaria', 'naminori', 'pet500', '清涼飲料水', '果糖ぶどう糖液糖、グレープフルーツ果汁、食塩、香料', '500ml', 'pet', 150)
d('vd_water', 'naminori', 'pet500', 'ミネラルウォーター', '水（鉱泉水）', '500ml', 'pet', 110)
d('vd_realbold', 'genkin', 'bottle', '炭酸飲料', '砂糖、はちみつ、ローヤルゼリー、カフェイン、ビタミンB群', '120ml', 'glass', 160)
d('vd_lipovita', 'genkin', 'bottle', '清涼飲料水', 'タウリン、砂糖、ビタミンB群、カフェイン、香料', '100ml', 'glass', 180)
d('vd_kurozu', 'genkin', 'bottle', '清涼飲料水', '米黒酢、はちみつ、りんご果汁', '120ml', 'glass', 160)
d('vd_morio', 'hoho', 'can350', 'ビール', '麦芽、ホップ', '350ml', 'alu', 250, alc=5)
d('vd_dryy', 'hoho', 'can350', 'ビール', '麦芽、ホップ、米、コーン、スターチ', '350ml', 'alu', 260, alc=5)
d('vd_strong', 'hoho', 'can500', 'リキュール（発泡性）', 'レモン、ウォッカ、酸味料、香料、甘味料', '500ml', 'alu', 200, alc=9)
d('vd_highball', 'hoho', 'can350', 'リキュール（発泡性）', 'ウイスキー、レモンスピリッツ、炭酸', '350ml', 'alu', 230, alc=7)
d('vd_onecup', 'hoho', 'cup', '清酒', '米、米こうじ、醸造アルコール', '180ml', 'glass', 240, alc=15)
d('vd_ume', 'hoho', 'can250', 'リキュール（発泡性）', '梅酒、糖類、酸味料、炭酸', '250ml', 'alu', 220, alc=4)
d('vd_nonal', 'hoho', 'can350', '炭酸飲料（ビールテイスト）', '麦芽、ホップ、香料、酸味料', '350ml', 'alu', 200)
d('vd_cornsoup', 'hokohoko', 'can190', 'コーンスープ', 'スイートコーン、牛乳、砂糖、食塩、でん粉', '190g', 'steel', 130, hot=1, shake=1)
d('vd_shiruko', 'hokohoko', 'can190', 'しるこ', '砂糖、小豆、食塩', '190g', 'steel', 140, hot=1, shake=1)
d('vd_oden', 'hokohoko', 'can500', 'おでん', 'だいこん、こんにゃく、うずら卵、ちくわ、牛すじ、だし', '280g', 'steel', 300, hot=1)
d('vd_natto', 'nazo', 'can350', '炭酸飲料', '砂糖、納豆エキス、カラメル色素、香料、ねばり', '350ml', 'alu', 120)
d('vd_mystery', 'nazo', 'can350', 'なぞ', 'ひみつ', '？？？ml', 'alu', 100)
d('vd_peppo', 'nazo', 'can350', '炭酸飲料', '砂糖、カラメル色素、香料（23種）、酸味料', '350ml', 'alu', 130)
d('ramune', 'gacha', 'ramune', '炭酸飲料', '砂糖、酸味料、香料', '200ml', 'glass', 80)


def wrap_size(cont):
    dd, lh, _ = CONT[cont]
    return round(3.141592653589793 * dd * 2 / 16) * 16, lh * 2


INK = 0x231c1a; WHITE = 0xfbf8f2; RED = 0xc8241e; GOLD = 0xc9a24a


# ------------------------------------------------------------------ shared bits
def hot_tag(P, x, y, w=30):
    P.rect(x, y, w, 11, RED, r=1.5); P.text('HOT', 'archivo', 7.5, x + w / 2, y + 5.6, WHITE)

def vol_mark(P, x, y, s, c, face='barlow', size=10, anchor='rm'):
    P.text(s, face, size, x, y, c, anchor=anchor)

def alc_mark(P, x, y, alc, c=INK, bg=WHITE):
    P.rect(x, y, 34, 22, bg, r=2); P.rect(x, y, 34, 22, c, r=2, line=1)
    P.text('お酒', 'kakub', 8, x + 17, y + 6.5, c); P.text('ALC.%d%%' % alc, 'barlow', 7.5, x + 17, y + 15.5, c)

def recycle(P, x, y, mat, ink):
    """The material mark printed on every Japanese can and bottle: two arrows chasing round a rounded square."""
    s = 20
    P.rect(x, y, s, s, ink, r=4, line=1.2)
    P.poly([(x + s - 6, y - 1.5), (x + s - 1, y + 1), (x + s - 6, y + 3.5)], ink)
    P.poly([(x + 6, y + s + 1.5), (x + 1, y + s - 1), (x + 6, y + s - 3.5)], ink)
    t = {'steel': 'スチール', 'alu': 'アルミ', 'pet': 'PET', 'glass': 'びん'}[mat]
    P.text(t, 'kakub', 5.6 if len(t) > 2 else 7, x + s / 2, y + s / 2, ink, maxw=s - 4)

def back(P, x0, W, H, dr, ground, ink, band, band_ink, accent=None, note=None):
    """The back half: the maker's band, the 品名 box, the bin note, the material mark, the JAN code and the price."""
    b = BR[dr['brand']]; kind = CONT[dr['cont']][2]
    if isinstance(ground, tuple): P.metal(x0, 0, W, H, ground[0])
    else: P.rect(x0, 0, W, H, ground)
    m = 6 if W > 150 else 4
    bh = 15 if H > 150 else 12
    P.rect(x0, 0, W, bh, band)
    if accent: P.rect(x0, bh, W, 1.5, accent)
    P.text(b[0], 'kaku', bh * 0.62, x0 + m, bh / 2 + 0.3, band_ink, anchor='lm')
    P.text(b[1], 'barlow', bh * 0.5, x0 + W - m, bh / 2 + 0.3, band_ink, anchor='rm')
    date = {'can': '缶底に記載', 'pet': 'キャップに記載'}.get(kind, 'ラベルに記載')
    rows = [('品名', dr['kind']), ('原材料名', dr['ing']), ('内容量', dr['vol']), ('賞味期限', date), ('保存方法', '直射日光を避けて保存'), ('製造者', b[2] + '\n' + b[3])]
    if W < 150: rows = [('品名', dr['kind']), ('内容量', dr['vol']), ('製造者', b[2])]
    bar_h = 14 if H >= 120 else 10
    yb = H - bar_h - 12
    fs = 5.6 if W > 150 else 4.8
    y = P.info(x0 + m, bh + 4, W - 2 * m, rows, ink=ink, paper=None, size=fs, maxy=yb - 4)
    if H > 150 or (kind == 'can' and y + 26 < yb):
        recycle(P, x0 + W - m - 22, y + 3, dr['mat'], ink)
        notes = []
        if dr.get('alc'): notes.append('お酒は20歳になってから。飲酒運転は法律で禁止されています。')
        if dr.get('shake'): notes.append('よく振ってからお飲みください。')
        if dr.get('hot'): notes.append('加温する場合は缶のまま直火にかけないでください。')
        if kind == 'can': notes.append('あき缶はくずかごへ。')
        notes.append('●開缶後はすぐにお飲みください。●凍らせないでください。●お問い合わせ：%s お客様相談室 0120-%s-%s（受付時間 平日9:00〜17:00）' % (b[2], b[4][:3], b[4][1:]) if kind == 'can' else '●お問い合わせ：%s お客様相談室 0120-%s-%s' % (b[2], b[4][:3], b[4][1:]))
        if note: notes.insert(0, note)
        P.lines(''.join(notes), 'biz', fs, x0 + m, y + 2, W - 2 * m - 28, ink, lh=fs * 1.3, maxy=yb - 4)
    jan = '49' + b[4] + dr['item']
    P.barcode(x0 + m + 5, yb, jan, h=bar_h, ink=0x141414, bg=0xffffff)
    if W > 150:
        px = x0 + m + 5 + 95 + 12
        P.text('希望小売価格', 'bizb', 5.5, px, yb + 2, ink, anchor='lt')
        P.text('%d円' % dr['price'], 'kaku', 11, px, yb + 10, ink, anchor='lt')
        P.text('(税別)', 'biz', 5, px + 2, yb + 23, ink, anchor='lt')


# ------------------------------------------------------------------ the fronts
F = {}
def front(id):
    def deco(fn): F[id] = fn; return fn
    return deco

# ---- 番長珈琲: 190 g steel coffee cans (168 x 184 front)
@front('vd_bancho')
def _(P, W, H):
    BK = 0x17130f
    P.rect(0, 0, W, H, BK)
    P.photo(ph('beans'), 0, 104, W, 80, f=(0.5, 0.55, 1.4), sat=0.9, fade=('t', 0.45))
    P.rect(0, 6, W, 1, GOLD); P.rect(0, 9, W, 0.6, GOLD)
    P.text('BANCHO COFFEE', 'serifb', 7, W / 2, 18, GOLD, track=1.6)
    P.text('番長', 'tokumin', 52, W / 2, 52, WHITE, maxw=120)
    P.rect(W / 2 - 46, 82, 92, 15, 0xb01c18); P.text('ブラック', 'kaku', 11, W / 2, 89.5, WHITE, track=1)
    P.text('無糖', 'kaku', 8.5, W / 2 + 54, 89.5, GOLD)
    P.text('深煎り炭火焙煎', 'mincho', 7.5, W / 2, 106, mixc(GOLD, WHITE, 0.3), track=1.2)
    P.rect(0, 160, W, 16, BK); P.text('BLACK', 'serif', 11, W / 2, 168, GOLD, track=3)
    vol_mark(P, W - 26, 176, '190g', WHITE, size=8)

@front('vd_morning')
def _(P, W, H):
    CR = 0xf3e9d6; OR = 0xd8641c; BR_ = 0x4a2a17
    P.rect(0, 0, W, H, CR)
    P.photo(ph('heart'), 0, 92, W, 92, f=(0.5, 0.45, 1.25), sat=0.95)
    P.rect(0, 0, W, 22, BR_); P.text('番長珈琲', 'mincho', 10, W / 2, 11, CR, track=2)
    P.rect(0, 22, W, 3, OR)
    P.text('朝', 'tokumin', 34, W / 2 - 34, 48, OR)
    P.text('ショット', 'kaku', 22, W / 2 + 18, 50, BR_, maxw=70)
    P.text('MORNING SHOT', 'barlowx', 11, W / 2, 73, BR_, track=1.2)
    P.rect(30, 82, W - 60, 1, OR)
    P.rect(W - 54, 100, 44, 16, OR, r=8); P.text('ミルク入り', 'kakub', 7, W - 32, 108, WHITE)
    vol_mark(P, W - 26, 176, '190g', WHITE, size=8)

@front('vd_maxsweet')
def _(P, W, H):
    YE = 0xf2c12e; BR_ = 0x3b2414
    P.rect(0, 0, W, H, YE)
    for i in range(-4, 14):  # the diagonal bands of a sweet coffee can
        x = i * 22
        P.poly([(x, 0), (x + 9, 0), (x + 9 - 40, 40), (x - 40, 40)], BR_)
    P.rect(0, 40, W, 3, BR_)
    P.text('MAXIMUM', 'archivo', 21, W / 2, 59, BR_, maxw=130)
    P.text('マキシマム', 'kaku', 15, W / 2, 80, BR_, track=0.5)
    P.text('甘', 'dela', 30, W / 2, 106, 0xb01c18, stroke=(2, WHITE))
    P.photo(ph('coffee_black'), 22, 124, W - 44, 46, f=(0.5, 0.45, 1.0), shape='round', r=4)
    P.rect(22, 124, W - 44, 46, BR_, r=4, line=1.4)
    P.text('練乳入り', 'kakub', 8, 40, 177, BR_)
    vol_mark(P, W - 26, 177, '190g', BR_, size=8)

@front('vd_aulait')
def _(P, W, H):
    CR = 0xf7f1e6; BR_ = 0x6a3b20
    P.rect(0, 0, W, H, CR)
    P.photo(ph('aulait'), 0, 70, W, 114, f=(0.5, 0.5, 1.15), sat=0.95)
    P.rect(0, 0, W, 6, BR_)
    P.text('番長珈琲', 'mincho', 8, W / 2, 14, BR_, track=2)
    P.text('Café au Lait', 'serif', 21, W / 2, 34, BR_, maxw=140)
    P.text('カフェオレ', 'kaku', 15, W / 2, 56, BR_, track=1)
    hot_tag(P, W - 44, 76)
    P.rect(18, 160, 72, 14, CR, r=7); P.text('ミルクたっぷり', 'kakub', 7, 54, 167, BR_)
    vol_mark(P, W - 26, 176, '190g', WHITE, size=8)

@front('vd_cocoa')
def _(P, W, H):
    CH = 0x4b2416; CR = 0xf3e2c8
    P.rect(0, 0, W, H, CH)
    P.photo(ph('cocoa2'), 0, 0, W, 110, f=(0.5, 0.42, 1.2), sat=0.95, fade=('b', 0.25))
    P.text('ココア', 'maru', 30, W / 2, 122, CR, stroke=(1.5, CH))
    P.text('MILK COCOA', 'barlowx', 12, W / 2, 146, mixc(CR, 0xd8a050, 0.4), track=2)
    hot_tag(P, 20, 160)
    P.text('番長珈琲', 'mincho', 7, W - 52, 166, CR)
    vol_mark(P, W - 26, 177, '190g', CR, size=8)

@front('vd_warmmilk')
def _(P, W, H):
    BL = 0x1c4f9c; CR = 0xfbf8f0
    P.rect(0, 0, W, H, CR)
    P.photo(ph('cows'), 0, 78, W, 106, f=(0.5, 0.5, 1.0), sat=0.9)
    P.rect(0, 0, W, 20, BL); P.text('モーベル牧場', 'kakub', 9, W / 2, 10, CR, track=0.5)
    P.text('ホット', 'maru', 18, W / 2, 34, BL)
    P.text('ミルク', 'maru', 26, W / 2, 57, BL)
    P.rect(W - 56, 88, 46, 16, 0xe0a020, r=8); P.text('はちみつ入り', 'kakub', 6.5, W - 33, 96, WHITE)
    hot_tag(P, 12, 90)
    vol_mark(P, W - 26, 176, '190g', BL, size=8)

@front('vd_cornsoup')
def _(P, W, H):
    YE = 0xf4c534; GR = 0x2c6e2a
    P.rect(0, 0, W, H, YE)
    P.photo(ph('cornsoup'), 0, 86, W, 98, f=(0.5, 0.5, 1.1), sat=0.95)
    P.photo(ph('corn'), 0, 0, W, 30, f=(0.5, 0.5, 1.6), sat=0.95)
    P.rect(0, 30, W, 3, GR)
    P.text('コーン', 'dela', 22, W / 2, 48, GR, stroke=(1.6, WHITE))
    P.text('ポタージュ', 'kaku', 15, W / 2, 70, 0x4a2a10)
    hot_tag(P, 12, 92); P.rect(W - 54, 92, 44, 15, GR, r=7); P.text('つぶ入り', 'kakub', 7, W - 32, 99.5, WHITE)
    P.text('ほこほこ堂', 'kakub', 7, 36, 176, WHITE)
    vol_mark(P, W - 26, 176, '190g', WHITE, size=8)

@front('vd_shiruko')
def _(P, W, H):
    AZ = 0x5a1a1c; CR = 0xf2e4cc
    P.rect(0, 0, W, H, AZ)
    P.photo(ph('azuki'), 0, 96, W, 88, f=(0.5, 0.5, 1.3), sat=0.95, warm=0.06, fade=('t', 0.3))
    P.text('ほこほこ堂', 'mincho', 7.5, W / 2, 10, CR, track=2)
    P.text('おしるこ', 'brush', 30, W / 2, 34 + 8, CR, maxw=140)
    P.rect(W / 2 - 34, 66, 68, 1, CR)
    P.text('北海道産小豆使用', 'mincho', 7.5, W / 2, 76, CR)
    hot_tag(P, 12, 108); P.text('つぶあん', 'kakub', 8, W - 34, 114, CR)
    vol_mark(P, W - 26, 176, '190g', CR, size=8)

# ---- PET bottles (208 x 136 front): the label sits round the waist
@front('vd_ocha')
def _(P, W, H):
    GR = 0x1e5a2a; PA = 0xf2efe0
    P.rect(0, 0, W, H, PA)
    P.photo(ph('teafield'), 0, 0, W, 40, f=(0.5, 0.6, 1.0), sat=0.95)
    P.photo(ph('greentea'), 128, 54, 70, 70, f=(0.42, 0.5, 1.5), shape='ellipse')
    P.rect(0, 40, W, 3, GR)
    P.text('お茶', 'brush', 48, 72, 84, INK)
    P.rect(16, 52, 18, 18, RED); P.text('はい', 'kakub', 6, 25, 61, WHITE)
    P.text('ちゃこ園', 'mincho', 7.5, 72, 120, GR, track=2)
    P.text('国産茶葉100%', 'kakub', 6, 160, 128, GR)
    vol_mark(P, 200, 50, '500ml', GR, size=8)

@front('vd_mugi')
def _(P, W, H):
    BR_ = 0x6b3814; PA = 0xf5ead2
    P.rect(0, 0, W, H, PA)
    P.photo(ph('wheat'), 0, 0, W, H, f=(0.5, 0.5, 1.0), sat=0.9, alpha=1.0)
    P.rect(36, 18, 136, 100, PA)
    P.rect(36, 18, 136, 100, BR_, line=1.2)
    P.text('麦茶', 'tokumin', 40, W / 2, 56, BR_)
    P.rect(56, 82, 96, 13, BR_); P.text('ノンカフェイン', 'kakub', 7.5, W / 2, 88.5, PA)
    P.text('六条大麦 香ばし焙煎', 'mincho', 6.5, W / 2, 106, BR_)
    P.text('ちゃこ園', 'kakub', 7, 18, 10, PA)
    vol_mark(P, 200, 128, '500ml', PA, size=8)

@front('vd_jasmine')
def _(P, W, H):
    GR = 0x2d6a4a; PA = 0xfafaf2
    P.rect(0, 0, W, H, PA)
    P.photo(ph('jasmine'), 0, 0, 92, H, f=(0.5, 0.5, 1.3), sat=0.95)
    P.rect(92, 0, 2, H, GR)
    P.text('ジャスミン茶', 'mincho', 19, 152, 44, GR, maxw=104)
    P.text('JASMINE TEA', 'serifb', 9, 152, 66, GR, track=1.5)
    P.rect(116, 80, 72, 1, GR)
    P.text('茉莉花の香り', 'mincho', 8, 152, 92, INK)
    P.text('ちゃこ園', 'kakub', 7, 152, 120, GR)
    vol_mark(P, 202, 128, '500ml', GR, size=7)

@front('vd_milktea')
def _(P, W, H):
    RD = 0x7a1c2a; CR = 0xf6efe2
    P.rect(0, 0, W, H, CR)
    P.photo(ph('milktea_cup'), 112, 0, 96, H, f=(0.5, 0.5, 1.25), sat=0.95)
    P.rect(0, 0, 112, H, CR); P.rect(108, 0, 2, H, RD); P.rect(104, 0, 1, H, RD)
    P.text('午後遅い', 'mincho', 13, 54, 30, RD)
    P.text('紅茶', 'mincho', 30, 54, 60, RD)
    P.text('Late Afternoon Tea', 'serifb', 7.5, 54, 86, INK)
    P.rect(16, 98, 76, 14, RD); P.text('ミルクティー', 'kakub', 7.5, 54, 105, CR)
    P.text('ちゃこ園', 'kakub', 6.5, 54, 124, RD)

@front('vd_cclemon')
def _(P, W, H):
    YE = 0xf5d72a; GR = 0x1c8a3a
    P.rect(0, 0, W, H, YE)
    P.photo(ph('lemons'), 0, 0, W, 50, f=(0.5, 0.5, 1.5), sat=0.95)
    P.rect(0, 50, W, 4, GR)
    P.text('C.C.LEMONADE', 'archivo', 20, W / 2, 72, GR, stroke=(1.4, WHITE), maxw=190)
    P.text('CCレモネード', 'kaku', 13, W / 2, 94, INK)
    P.rect(18, 106, 74, 18, GR, r=2); P.text('ビタミンC', 'kakub', 6, 55, 111, WHITE); P.text('レモン70個分', 'kakub', 6.5, 55, 119, WHITE)
    P.text('果汁1%', 'kakub', 8, 150, 115, INK)
    vol_mark(P, 202, 130, '500ml', INK, size=7)

@front('vd_karupiko')
def _(P, W, H):
    BL = 0x1d4fb4; WH = 0xfbfcff
    P.rect(0, 0, W, H, WH)
    P.photo(ph('white'), 136, 0, 72, H, f=(0.5, 0.55, 1.1), sat=0.9)
    P.rect(0, 0, 136, 26, BL); P.text('モーベル牧場', 'kakub', 8, 68, 13, WH, track=0.6)
    P.text('カルピコ', 'maru', 26, 68, 50, BL, maxw=124)
    P.text('ウォーター', 'maru', 15, 68, 76, BL)
    P.rect(18, 92, 100, 1, BL)
    P.text('乳酸菌飲料入り', 'kakub', 7.5, 68, 103, BL)
    P.text('KARUPIKO WATER', 'barlow', 7.5, 68, 120, INK, track=1)

@front('vd_ponkari')
def _(P, W, H):
    BL = 0x1747a6; WH = 0xffffff
    P.rect(0, 0, W, H, WH)
    P.photo(ph('sea'), 0, 0, W, 54, f=(0.5, 0.75, 1.3), sat=1.0)
    P.poly([(0, 54), (W, 40), (W, 58), (0, 72)], BL)
    P.text('ポンカリ', 'kaku', 24, W / 2, 88, BL, track=1)
    P.text('スエット', 'kaku', 24, W / 2, 112, BL, track=1)
    P.text('ION SUPPLY DRINK', 'barlow', 7.5, W / 2, 128, INK, track=1.5)
    P.text('ナミノリ', 'kakub', 7, 30, 128, BL)

@front('vd_aquaria')
def _(P, W, H):
    BL = 0x0e5fc8; WH = 0xf6fbff
    P.rect(0, 0, W, H, BL)
    P.photo(ph('grapefruit'), 128, 20, 70, 70, f=(0.5, 0.5, 1.15), shape='ellipse')
    P.text('AQUARIA', 'archivo', 24, 70, 40, WH, maxw=128)
    P.text('アクアリア', 'kaku', 14, 70, 64, WH, track=1)
    P.rect(16, 80, 108, 1, WH)
    P.text('グレープフルーツ味', 'kakub', 7, 70, 92, WH)
    P.rect(0, 108, W, 28, WH); P.text('SPORTS DRINK', 'barlowx', 11, W / 2, 122, BL, track=3)

@front('vd_water')
def _(P, W, H):
    BL = 0x0d3a7a
    P.photo(ph('fuji'), 0, 0, W, H, f=(0.5, 0.62, 1.7), sat=0.9)
    P.rect(30, 74, 148, 46, 0xfbfbf8)
    P.text('天然水', 'mincho', 24, W / 2, 92, BL, track=2)
    P.text('汐見の山の湧き水', 'mincho', 7, W / 2, 111, INK)
    P.text('NATURAL MINERAL WATER', 'barlow', 7, W / 2, 10, 0xffffff, track=1.5)
    P.text('ナミノリ', 'kakub', 7, 26, 128, 0xffffff)
    vol_mark(P, 202, 128, '500ml', 0xffffff, size=7)

# ---- プクポップ: 350 ml aluminium cans (208 x 220 front)
@front('vd_melon')
def _(P, W, H):
    GR = 0x1f9a3e
    P.rect(0, 0, W, H, GR)
    P.photo(ph('melon'), 0, 126, W, 94, f=(0.5, 0.5, 1.3), sat=0.95)
    P.rect(0, 122, W, 4, WHITE)
    P.text('プクポップ', 'kakub', 9, W / 2, 16, WHITE, track=0.6)
    P.text('メロン', 'dela', 34, W / 2, 50, WHITE, stroke=(2, 0x0b5a20))
    P.text('ソーダ', 'dela', 30, W / 2, 86, 0xf6e04a, stroke=(2, 0x0b5a20))
    P.text('MELON SODA', 'barlowx', 10, W / 2, 112, WHITE, track=3)
    P.rect(150, 196, 44, 14, WHITE, r=7); P.text('無果汁', 'kakub', 7, 172, 203, GR)
    vol_mark(P, 54, 206, '350ml', WHITE, size=9)

@front('vd_kora')
def _(P, W, H):
    RD = 0xc81e24
    P.rect(0, 0, W, H, RD)
    P.photo(ph('cola2'), 36, 108, 136, 100, f=(0.5, 0.5, 1.15), shape='round', r=5, sat=0.95)
    P.rect(36, 108, 136, 100, WHITE, r=5, line=1.6)
    P.text('KORA KOLA', 'archivo', 28, W / 2, 34, WHITE, maxw=180)
    P.rect(30, 54, W - 60, 2, WHITE)
    P.text('コーラ', 'kaku', 26, W / 2, 78, WHITE, track=4)
    P.text('プクポップ', 'kakub', 7, W / 2, 98, mixc(WHITE, RD, 0.2), track=2)
    vol_mark(P, 186, 214, '350ml', WHITE, size=8)

@front('vd_grape')
def _(P, W, H):
    PU = 0x4a1f78; OR = 0xf29a1e
    P.rect(0, 0, W, H, PU)
    P.photo(ph('grape'), 0, 120, W, 100, f=(0.5, 0.5, 1.2), sat=0.95, fade=('t', 0.25))
    P.text('プクポップ', 'kakub', 9, W / 2, 16, WHITE, track=0.6)
    P.text('FANTO', 'archivo', 36, W / 2, 48, OR, stroke=(1.6, WHITE))
    P.text('ファント', 'kaku', 18, W / 2, 80, WHITE, track=2)
    P.text('グレープ', 'dela', 26, W / 2, 106, WHITE)
    P.rect(152, 186, 44, 22, OR, r=3); P.text('果汁', 'kakub', 7, 174, 192, WHITE); P.text('10%', 'barlowx', 9, 174, 202, WHITE)
    vol_mark(P, 54, 206, '350ml', WHITE, size=9)

@front('vd_ramunecan')
def _(P, W, H):
    BL = 0x56b8e6; NV = 0x123e8a
    P.rect(0, 0, W, H, BL)
    P.photo(ph('soda'), 0, 0, W, 120, f=(0.5, 0.5, 1.4), sat=1.0, fade=('b', 0.3))
    P.rect(0, 118, W, 102, BL)
    P.text('ラムネ', 'dela', 40, W / 2, 140, WHITE, stroke=(2.2, NV))
    P.text('RAMUNE SODA', 'barlowx', 11, W / 2, 170, NV, track=3)
    P.text('なつかしの味', 'kakub', 8, W / 2, 188, NV)
    P.text('プクポップ', 'kakub', 7.5, W / 2, 16, WHITE, track=0.6)
    vol_mark(P, 186, 210, '350ml', NV, size=8)

@front('vd_cider')
def _(P, W, H):
    GR = 0x138a52; WH = 0xf7fbfa
    P.rect(0, 0, W, H, WH)
    P.photo(ph('bubbles'), 0, 132, W, 110, f=(0.5, 0.5, 1.1), sat=0.8, fade=('t', 0.3))
    P.rect(0, 0, W, 24, GR); P.text('プクポップ', 'kakub', 8.5, W / 2, 12, WH, track=0.6)
    P.text('MITTSU', 'serif', 22, W / 2, 46, GR, track=2)
    P.text('ミッツ', 'kaku', 22, W / 2, 76, INK, track=2)
    P.text('サイダー', 'kaku', 22, W / 2, 104, INK, track=2)
    P.rect(30, 120, W - 60, 1.4, GR)
    P.text('すっきり透明', 'mincho', 8, W / 2, 130, GR)
    vol_mark(P, W - 18, 234, '250ml', GR, size=8)

# ---- ホーホー酒造: beer, chu-hi, highball, sake
@front('vd_morio')
def _(P, W, H):
    NV = 0x14204e
    P.metal(0, 0, W, H, 0xc9a557)
    P.photo(ph('beer2'), 40, 108, 128, 96, f=(0.5, 0.45, 1.3), shape='round', r=4, sat=0.95)
    P.rect(40, 108, 128, 96, NV, r=4, line=1.4)
    P.rect(0, 0, W, 26, NV); P.text('ホーホー酒造', 'mincho', 9, W / 2, 13, 0xe8d39a, track=2)
    P.text('杜王', 'tokumin', 40, W / 2, 50, NV)
    P.text('DRAFT BEER', 'serifb', 13, W / 2, 80, NV, track=2.5)
    P.rect(30, 92, W - 60, 1, NV)
    P.rect(176, 32, 22, 22, RED); P.text('生', 'tokumin', 16, 187, 43, WHITE)
    alc_mark(P, 6, 194, 5, NV, 0xf4ecd4)
    vol_mark(P, 200, 214, '350ml', NV, size=8)

@front('vd_dryy')
def _(P, W, H):
    P.metal(0, 0, W, H, 0xd4d8dd)
    P.rect(0, 0, W, 6, INK); P.rect(0, 9, W, 1, INK)
    P.text('ホーホー酒造', 'kakub', 8, W / 2, 20, INK, track=0.6)
    P.text('辛口', 'tokumin', 36, W / 2, 56, RED)
    P.text('SUPER', 'archivo', 18, W / 2, 96, INK, track=3)
    P.text('DRYY', 'archivo', 40, W / 2, 128, INK, track=2)
    P.poly([(0, 152), (W, 140), (W, 148), (0, 160)], RED)
    P.text('スーパードライイ', 'kaku', 12, W / 2, 174, INK, track=1)
    P.text('KARAKUCHI BEER', 'barlow', 8, W / 2, 192, INK, track=2)
    alc_mark(P, 6, 194, 5, INK, 0xe8eaec)
    vol_mark(P, 200, 214, '350ml', INK, size=8)

@front('vd_strong')
def _(P, W, H):  # 500 ml: 208 x 310
    NV = 0x0f2a6a
    P.metal(0, 0, W, H, 0xccd2da)
    P.photo(ph('lemonslice'), 0, 170, W, 140, f=(0.5, 0.5, 1.2), sat=1.0, fade=('t', 0.25))
    P.rect(0, 0, W, 30, NV); P.text('ホーホー酒造', 'kakub', 9, W / 2, 15, WHITE, track=0.6)
    P.text('STRONG', 'archivo', 32, W / 2, 60, NV, maxw=180)
    P.text('ストロング', 'kaku', 22, W / 2, 96, NV, track=1)
    P.text('零', 'tokumin', 52, W / 2, 140, RED, stroke=(2, WHITE))
    P.rect(150, 182, 46, 30, NV, r=3); P.text('ALC.', 'barlow', 8, 173, 190, WHITE); P.text('9%', 'barlowx', 15, 173, 203, WHITE)
    P.text('レモン', 'kakub', 9, 32, 196, INK)
    alc_mark(P, 6, 278, 9, NV, 0xeef2f6)
    vol_mark(P, 200, 302, '500ml', NV, size=9)

@front('vd_highball')
def _(P, W, H):
    AM = 0x8a4a14; CR = 0xf6e6c8
    P.rect(0, 0, W, H, CR)
    P.photo(ph('whisky'), 0, 96, W, 124, f=(0.5, 0.45, 1.05), sat=0.95)
    P.rect(0, 0, W, 6, AM)
    P.text('ホーホー酒造', 'mincho', 8, W / 2, 16, AM, track=2)
    P.text('HIGHBALL', 'serif', 26, W / 2, 40, AM, maxw=180)
    P.text('ハイボール', 'kaku', 22, W / 2, 70, INK, track=1)
    P.text('WHISKY & SODA', 'barlow', 8, W / 2, 88, AM, track=2)
    alc_mark(P, 6, 194, 7, AM, CR)
    vol_mark(P, 200, 214, '350ml', WHITE, size=8)

@front('vd_ume')
def _(P, W, H):  # 250 ml: 168 x 242
    PK = 0xe58aa0; DP = 0x8a1c3c
    P.rect(0, 0, W, H, PK)
    P.photo(ph('ume'), 0, 140, W, 102, f=(0.5, 0.5, 1.2), sat=0.95, fade=('t', 0.25))
    P.text('ホーホー酒造', 'mincho', 8, W / 2, 14, DP, track=2)
    P.text('梅酒', 'tokumin', 44, W / 2, 56, DP, stroke=(1.6, WHITE))
    P.text('ソーダ', 'kaku', 20, W / 2, 96, WHITE, stroke=(1.2, DP), track=2)
    P.text('UMESHU SODA', 'barlowx', 9, W / 2, 120, DP, track=2)
    alc_mark(P, 6, 214, 4, DP, 0xfbe4ea)
    vol_mark(P, 160, 234, '250ml', WHITE, size=8)

@front('vd_nonal')
def _(P, W, H):
    BL = 0x1c3f8a; WH = 0xf8f8f4
    P.rect(0, 0, W, H, WH)
    P.photo(ph('barley'), 0, 120, W, 100, f=(0.5, 0.5, 1.2), sat=0.95)
    P.rect(0, 0, W, 30, BL); P.text('ホーホー酒造', 'kakub', 9, W / 2, 15, WH, track=0.6)
    P.text('ノンアル', 'kaku', 28, W / 2, 56, BL, track=1)
    P.text('0.00%', 'archivo', 26, W / 2, 88, RED)
    P.text('ビールテイスト飲料', 'kakub', 8, W / 2, 109, BL)
    vol_mark(P, 200, 214, '350ml', WHITE, size=8)

@front('vd_onecup')
def _(P, W, H):  # the sake cup: 208 x 104
    BL = 0x123a8a
    P.rect(0, 0, W, H, 0xfbfaf6)
    P.rect(0, 0, W, 8, BL); P.rect(0, H - 8, W, 8, BL)
    P.text('ワンカップ', 'mincho', 22, 76, 38, BL, track=1)
    P.text('上撰 清酒', 'mincho', 10, 76, 64, INK, track=3)
    P.text('ホーホー酒造', 'kakub', 6.5, 76, 84, BL)
    P.rect(156, 22, 34, 60, RED); P.text('上撰', 'mincho', 13, 173, 52, WHITE, vert=True)

# ---- ほこほこ堂 / 謎商会: the odd ones
@front('vd_oden')
def _(P, W, H):  # 208 x 310 steel
    RD = 0x9a1e16; CR = 0xf4ead6
    P.rect(0, 0, W, H, CR)
    P.photo(ph('oden'), 0, 120, W, 190, f=(0.5, 0.5, 1.1), sat=0.95)
    P.rect(0, 0, W, 30, RD); P.text('ほこほこ堂', 'mincho', 10, W / 2, 15, CR, track=3)
    P.text('おでん', 'brush', 44, W / 2, 66, RD, maxw=170)
    P.text('だし自慢 牛すじ入り', 'mincho', 9, W / 2, 104, INK)
    hot_tag(P, 12, 130, 34)
    vol_mark(P, 200, 300, '280g', WHITE, size=9)

@front('vd_natto')
def _(P, W, H):
    MU = 0xb88a2a; BK = 0x1e1810
    P.rect(0, 0, W, H, MU)
    P.photo(ph('cola'), 0, 116, W, 104, f=(0.5, 0.45, 1.2), sat=0.85, fade=('t', 0.25))
    P.text('謎商会', 'kakub', 8, W / 2, 14, BK, track=0.6)
    P.text('納豆', 'tokumin', 46, W / 2, 50, BK)
    P.rect(0, 80, W, 26, BK); P.text('コーラ', 'kaku', 17, W / 2, 93, MU, track=4)
    P.rect(16, 196, 50, 14, BK, r=7); P.text('ねばねば', 'kakub', 7, 41, 203, MU)
    vol_mark(P, 200, 214, '350ml', WHITE, size=8)

@front('vd_mystery')
def _(P, W, H):
    P.rect(0, 0, W, H, 0xf2f1ec)
    P.text('？', 'mincho', 96, W / 2, 96, INK)
    P.text('なぞのドリンク', 'mincho', 12, W / 2, 168, INK, track=2)
    P.text('謎商会', 'kakub', 7, W / 2, 196, 0x7a4ab0, track=0.6)
    vol_mark(P, 200, 214, '???ml', INK, size=8)

@front('vd_peppo')
def _(P, W, H):
    MR = 0x6a1020; CR = 0xf4e6d0
    P.rect(0, 0, W, H, MR)
    for y in (24, 194): P.rect(0, y, W, 1.2, CR)
    P.text('Mr.', 'serif', 20, W / 2, 46, CR)
    P.text('PEPPO', 'serif', 40, W / 2, 84, CR, maxw=170)
    P.text('ミスターペッポ', 'kaku', 14, W / 2, 120, CR, track=1)
    P.rect(W / 2 - 40, 136, 80, 34, CR, r=3); P.text('23種の', 'kakub', 8, W / 2, 146, MR); P.text('フレーバー', 'kakub', 9, W / 2, 160, MR)
    P.text('謎商会', 'kakub', 7, W / 2, 14, CR, track=0.6)
    vol_mark(P, 200, 210, '350ml', CR, size=8)

# ---- ゲンキン製薬: little brown tonic bottles, paper labels (120 x 90 front)
def tonic(P, W, H, name, sub, ground, ink, band):
    P.rect(0, 0, W, H, ground); P.paper(0, 0, W, H, 0.5)
    P.rect(0, 0, W, 14, band); P.text('ゲンキン製薬', 'kakub', 6.5, W / 2, 7, ground, track=0.6)
    P.text(name, 'kaku', 22, W / 2, 38, ink, maxw=W - 16)
    P.rect(10, 54, W - 20, 1, ink)
    P.text(sub, 'kakub', 7, W / 2, 64, ink, maxw=W - 16)
    P.rect(0, H - 12, W, 12, band)
@front('vd_realbold')
def _(P, W, H): tonic(P, W, H, 'リアルボールド', '指定医薬部外品', 0xf4d43a, 0x6a1a10, 0xb81c1a)
@front('vd_lipovita')
def _(P, W, H): tonic(P, W, H, 'リポビタZ', 'タウリン1000mg配合', 0xf6f2e6, 0x10307a, 0x10307a)
@front('vd_kurozu')
def _(P, W, H): tonic(P, W, H, '黒酢', 'はちみつ入り 飲む酢', 0x1e1a18, 0xe8c66a, 0x8a6a2a)

@front('ramune')
def _(P, W, H):  # 176 x 120
    BL = 0x1d5fc0
    P.rect(0, 0, W, H, 0xfdfcf8); P.paper(0, 0, W, H, 0.5)
    P.rect(4, 4, W - 8, H - 8, BL, line=1.4); P.rect(7, 7, W - 14, H - 14, RED, line=0.6)
    P.text('ラムネ', 'tokumin', 30, W / 2, 46, BL, track=2)
    P.text('ガチャ鉱泉所', 'mincho', 9, W / 2, 78, RED, track=2)
    P.text('RAMUNE', 'serifb', 8, W / 2, 96, BL, track=4)


# ------------------------------------------------------------------ backs: the house colours of each design
BACK = {  # id: (ground, ink, band, band ink, accent)
    'vd_bancho': (0x17130f, 0xe8dcc0, 0x2a2219, GOLD, GOLD), 'vd_morning': (0xf3e9d6, 0x3a2414, 0x4a2a17, 0xf3e9d6, 0xd8641c),
    'vd_maxsweet': (0xf2c12e, 0x2a180c, 0x3b2414, 0xf2c12e, None), 'vd_aulait': (0xf7f1e6, 0x3a2414, 0x6a3b20, 0xf7f1e6, None),
    'vd_cocoa': (0x4b2416, 0xf3e2c8, 0x2e140b, 0xf3e2c8, None), 'vd_warmmilk': (0xfbf8f0, 0x14306a, 0x1c4f9c, 0xfbf8f0, None),
    'vd_cornsoup': (0xf4c534, 0x2a1a08, 0x2c6e2a, 0xffffff, None), 'vd_shiruko': (0x5a1a1c, 0xf2e4cc, 0x3a0e10, 0xf2e4cc, None),
    'vd_ocha': (0xf2efe0, 0x14361a, 0x1e5a2a, 0xf2efe0, None), 'vd_mugi': (0xf5ead2, 0x4a2410, 0x6b3814, 0xf5ead2, None),
    'vd_jasmine': (0xfafaf2, 0x1a3a2a, 0x2d6a4a, 0xfafaf2, None), 'vd_milktea': (0xf6efe2, 0x3a1018, 0x7a1c2a, 0xf6efe2, None),
    'vd_cclemon': (0xf5d72a, 0x14301a, 0x1c8a3a, 0xffffff, None), 'vd_karupiko': (0xfbfcff, 0x14306a, 0x1d4fb4, 0xffffff, None),
    'vd_ponkari': (0xffffff, 0x10306a, 0x1747a6, 0xffffff, None), 'vd_aquaria': (0xf6fbff, 0x0a3a7a, 0x0e5fc8, 0xffffff, None),
    'vd_water': (0xf6f9fb, 0x0d2a5a, 0x0d3a7a, 0xffffff, None), 'vd_melon': (0xf4faf4, 0x0e3a18, 0x1f9a3e, 0xffffff, None),
    'vd_kora': (0xc81e24, 0xffffff, 0x8a1016, 0xffffff, None), 'vd_grape': (0x4a1f78, 0xffffff, 0x2e0f52, 0xf29a1e, 0xf29a1e),
    'vd_ramunecan': (0xeaf6fc, 0x123e8a, 0x56b8e6, 0xffffff, None), 'vd_cider': (0xf7fbfa, 0x0e3a24, 0x138a52, 0xffffff, None),
    'vd_morio': (0xefe2bc, 0x14204e, 0x14204e, 0xe8d39a, None), 'vd_dryy': (0xe6e8ea, 0x1a1a1a, 0x1a1a1a, 0xffffff, RED),
    'vd_strong': (0xe8ecf2, 0x0f2a6a, 0x0f2a6a, 0xffffff, RED), 'vd_highball': (0xf6e6c8, 0x3a1e08, 0x8a4a14, 0xf6e6c8, None),
    'vd_ume': (0xfbe4ea, 0x5a0e24, 0x8a1c3c, 0xffffff, None), 'vd_nonal': (0xf8f8f4, 0x1c3f8a, 0x1c3f8a, 0xffffff, RED),
    'vd_onecup': (0xfbfaf6, 0x123a8a, 0x123a8a, 0xffffff, None), 'vd_oden': (0xf4ead6, 0x3a0e0a, 0x9a1e16, 0xf4ead6, None),
    'vd_natto': (0xb88a2a, 0x1e1810, 0x1e1810, 0xb88a2a, None), 'vd_mystery': (0xf2f1ec, 0x231c1a, 0x7a4ab0, 0xffffff, None),
    'vd_peppo': (0x6a1020, 0xf4e6d0, 0x3e0812, 0xf4e6d0, None), 'vd_realbold': (0xf4d43a, 0x6a1a10, 0xb81c1a, 0xf4d43a, None),
    'vd_lipovita': (0xf6f2e6, 0x10307a, 0x10307a, 0xf6f2e6, None), 'vd_kurozu': (0x1e1a18, 0xe8c66a, 0x8a6a2a, 0x1e1a18, None),
    'ramune': (0xfdfcf8, 0x1d5fc0, 0x1d5fc0, 0xffffff, None),
}
METAL_BACK = {'vd_dryy': 0xd4d8dd, 'vd_strong': 0xccd2da, 'vd_morio': 0xc9a557}


def bake(id):
    dr = D[id]; Wt, H = wrap_size(dr['cont']); W = Wt // 2
    P = Panel(Wt, H, 0xffffff)
    g, ink, band, bink, acc = BACK[id]
    back(P, W, W, H, dr, (METAL_BACK[id],) if id in METAL_BACK else g, ink, band, bink, acc)  # bare metal shows on some backs
    # the front is drawn in a panel of its own (its coordinates start at 0)
    Fp = Panel(W, H, 0xffffff)
    F[id](Fp, W, H)
    P.paste(Fp.im, 0, 0)
    P.late += [(j[0], j[1], *j[2:]) for j in Fp.late]
    if dr['cont'] in ('can250', 'can350', 'can500', 'pet500') and not dr.get('hot'):  # a cold drink sweats
        P.condensation(0, 0, Wt, H, k=0.32 if CONT[dr['cont']][2] == 'can' else 0.16, tile=150)
    if dr['cont'] in ('can190', 'can250', 'can350', 'can500'):  # the seam: where the printed sheet overlaps itself
        P.rect(Wt - 1, 0, 1, H, mixc(g, 0x000000, 0.25))
    return P.image()


# ------------------------------------------------------------------ the vending machines' own advertising
# The poster under the plexi on each machine's door (323 x 251) and the ad down its side (291 x 620): a real photo of
# the drink, the maker's name and the line; laid in by src/places/vending/cabinet.js over its painted cabinet.
LIVERY = {  # id: (maker, line, sub, photo, focus, ground, ink, accent, face)
    'coffee': ('番長珈琲', 'いっぷく、どうぞ。', 'BANCHO COFFEE', 'coffee_black', (0.5, 0.5, 1.15), 0x1c140e, 0xf3e6c8, GOLD, 'tokumin'),
    'soda': ('プクポップ', 'シュワッと、いこう。', 'PUKU POP', 'soda', (0.5, 0.5, 1.2), 0x1e5fc0, 0xffffff, 0xf6d63a, 'kaku'),
    'corner': ('ほこほこ堂', 'ほっと、ひといき。', 'HOKOHOKO-DO', 'cornsoup', (0.5, 0.5, 1.15), 0x9a1e16, 0xf4ead6, 0xf4c534, 'mincho'),
    'sake': ('ホーホー酒造', '今夜も、おつかれさま。', 'HOHO BREWERY', 'beer2', (0.5, 0.45, 1.1), 0x14204e, 0xf3e6c8, GOLD, 'mincho'),
    'odd': ('謎商会', 'なにが出るかな？', 'NAZO SHOKAI', 'cola', (0.5, 0.5, 1.2), 0x2a1e3a, 0xf2f1ec, 0xd8f060, 'tokumin'),
}
SIDE_PHOTO = {'coffee': ('beans', (0.5, 0.5, 1.0)), 'soda': ('lemonade', (0.5, 0.5, 1.0)), 'corner': ('oden', (0.5, 0.5, 1.0)),
              'sake': ('beer2', (0.5, 0.5, 1.0)), 'odd': ('cola2', (0.5, 0.5, 1.0))}

def poster(lv):
    mk, line, sub, phk, f, g, ink, acc, face = LIVERY[lv]
    W, H = 323, 251
    P = Panel(W, H, g)
    P.photo(ph(phk), 120, 0, W - 120, H, f=f, sat=0.95, fade=('l', 0.35))
    P.text(mk, face, 34, 14, 52, ink, anchor='lm', maxw=190)
    P.rect(14, 80, 120, 1.5, acc)
    P.text(sub, 'barlow', 10, 14, 92, acc, anchor='lt', track=2)
    P.text(line, 'mincho', 15, 14, 140, ink, anchor='lm', maxw=200)
    P.rect(14, 196, 64, 18, 0x1e5fc0, r=2); P.text('つめた〜い', 'kakub', 8.5, 46, 205, 0xffffff)
    P.rect(84, 196, 70, 18, RED, r=2); P.text('あったか〜い', 'kakub', 8.5, 119, 205, 0xffffff)
    P.text('120円から', 'kaku', 11, 14, 232, ink, anchor='lm')
    return P.image()

def side(lv):
    mk, line, sub, phk, f, g, ink, acc, face = LIVERY[lv]
    W, H = 291, 620
    P = Panel(W, H, g)
    k, ff = SIDE_PHOTO[lv]
    P.photo(ph(k), 0, 250, W, H - 250, f=ff, sat=0.95, fade=('t', 0.2))
    P.text(mk, face, 54, W / 2, 30, ink, anchor='mt', vert=True, maxh=210) if len(mk) <= 4 else P.text(mk, face, 44, W / 2, 30, ink, anchor='mt', vert=True, maxh=210)
    P.text(sub, 'barlow', 14, W / 2, H - 22, 0xffffff, track=3)
    return P.image()


def main():
    args = sys.argv[1:]
    only = None; sheet = None
    if '--only' in args: only = args[args.index('--only') + 1].split(',')
    if '--sheet' in args: sheet = args[args.index('--sheet') + 1]
    ids = [i for i in D if not only or i in only]
    ims = {i: bake(i) for i in ids}
    if not only:
        for lv in LIVERY: ims['poster:' + lv] = poster(lv); ims['side:' + lv] = side(lv)
    if not only:
        # pack: tallest first into rows of a 1024-wide sheet
        order = sorted(ims, key=lambda i: -ims[i].height)
        Wsh = 1024; x = y = rh = 0; idx = {}
        for i in order:
            w, h = ims[i].size
            if x + w > Wsh: x = 0; y += rh; rh = 0
            idx[i] = [x, y, w, h]; x += w; rh = max(rh, h)
        Hsh = y + rh
        out = Image.new('RGB', (Wsh, Hsh), (0, 0, 0))
        for i, (x, y, w, h) in idx.items(): out.paste(ims[i], (x, y))
        idx = {('drinks:wrap:' + k if k in D else k): v for k, v in idx.items()}  # keyed as the drinks sheet's regions
        os.makedirs(OUT, exist_ok=True)
        out.save(os.path.join(OUT, 'labels.webp'), quality=94, method=6)
        json.dump(idx, open(os.path.join(OUT, 'labels.json'), 'w'), separators=(',', ':'))
        print('labels.webp', out.size, os.path.getsize(os.path.join(OUT, 'labels.webp')) // 1024, 'KB')
    if sheet:
        cols = 3; cw = 416 * 2 + 8
        rows = (len(ids) + cols - 1) // cols
        S = Image.new('RGB', (cols * cw, rows * 330), (40, 40, 40)); dd = ImageDraw.Draw(S)
        for k, i in enumerate(ids):
            im = ims[i].resize((ims[i].width * 2, ims[i].height * 2), Image.NEAREST)
            if im.height > 316: im = im.resize((im.width * 316 // im.height, 316), Image.NEAREST)
            S.paste(im, ((k % cols) * cw, (k // cols) * 330)); dd.text(((k % cols) * cw + 2, (k // cols) * 330 + 318), i, fill=(255, 255, 0))
        S.save(sheet)


if __name__ == '__main__':
    main()
