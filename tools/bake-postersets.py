#!/usr/bin/env python3
"""bake-postersets.py: the shop's promo posters and handout flyers, and the lane's posters and notices, laid out with
tools/posterkit.py (pixel type only, set on the texture grid, real photographs and Open Images cut-outs, renders of the actual
in-game toys, real paper scans and wear; English text, original names; no drawn filler, no glow or gradient).
Every design is its own layout. Output sheets (WebP + region JSON, via bake-print.py's packer):
  promo  promo:<id>  (224 x 317)  the six promo posters and nine meme flyers of src/gfx/flyers.js (FLYERS): on the
                                   garage piers (src/world/Posters.js) and handed out in the lane (the flyer stack)
  lane   lane:<design>:<n>        the lane's posters and notices (src/world/LanePosters.js); the Canva lost-pet notices
                                   (tools/bake-canva.py) are kept as they are
  python3 -I tools/bake-postersets.py [promo] [lane] [--sheet out.png] [--only key,key]
Photos: public/img/photos (credited in CREDITS.md) and full-size Open Images originals of the same credited photos.
"""
import os, sys, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from posterkit import Sheet
import pixprint as PX
_bp = importlib.util.spec_from_file_location('bake_print', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-print.py'))
BP = importlib.util.module_from_spec(_bp); _bp.loader.exec_module(BP)

INK = 0x1c1816; CREAM = 0xf3ecdc; PAPER = 0xf6f1e4; RED = 0xc4291e; VERM = 0xd4442c; TEAL = 0x23756a; GOLD = 0xe2b23c
NAVY = 0x1b2a4a; MINT = 0xbfeccc; YEL = 0xf2c230; SKY = 0x2f6fa8
OI = {'shiba_puppy': 'a21093132630d7a2', 'cat_black': '4d2786e4d0239451', 'cat_grey': '73caeb335f576904', 'cat_fluffy': 'd3487e4cf55c90d3',
      'fuji': '6e1e87bb95452e41', 'monkeys': '2a1c261ad12e6f62', 'sailboat': '934ee278c3b493ca', 'hydrangea': 'e5572ed148dc0b76',
      'shinkansen': '842fcd9c97854956', 'sumo': '0deee1bb956b2216', 'baseball': '6c906fe112f15285', 'giraffe': '7222bd0a37b46602',
      'elephant': '3546e315dd033322', 'aquarium': '12b1f929640f1227', 'kakigori': 'b27664c9ed82adff', 'bonodori': '99d0d046afd231c4',
      'fireworks': '3273e580b71afeef', 'shiba': '318cacc523658be4', 'tatami': 'f4200fadef07c329', 'gumballs': '9a73ee8933d93045', 'fuji_izu': '78539e8d9556eb55'}
def oi(k): return 'oi:' + OI[k]
FOOT = 'GACHA GARAGE  ·  BACK LANE, SHOWA-CHO 2-CHOME'

PROMO, LANE = {}, {}
def design(reg, key, size, **age):
    def deco(fn): reg[key] = (size, fn, age); return fn
    return deco
P = (224, 317)  # promo / flyer layout units; the texture is U x that: 291 x 412 px, 0.42 m on the piers (~690 px/m)
U = 1.3  # texels per layout unit: room for the pixel type at its native size (no tiny bitmap faces)


# ==================================================================== promo posters (224 x 317 px; coordinates are texture px)
def tag(S, s, cx, cy, bg, ink=CREAM, face='ala', scale=1, pad=3):
    """A flat label: a block of ink with pixel type knocked out of it."""
    w, h = S.tw(s, face, scale) + 2 * pad + 1, S.th(face, scale) + 2 * pad
    S.rect(round(cx - w / 2), round(cy - h / 2), w, h, bg)
    S.text(s, round(cx - w / 2) + pad + 1, round(cy - h / 2) + pad, face, scale, ink)

@design(PROMO, 'promo:reopen', P, paper='Paper001', fade=0.06, tape=('tl', 'tr'), seed=1)
def _(S):
    S.paper('Paper001', 0.35)
    S.photo('ph:garage', 10, 10, 204, 152, f=(0.5, 0.6, 1.08), sat=0.82, warm=0.05)
    S.rect(10, 10, 204, 152, INK, line=1)
    S.rect(0, 174, 224, 60, RED)
    for ref, cx, h in [('teruteru/para', 34, 56), ('dango/hanami', 76, 60), ('tabigame/pagoda', 120, 54), ('sento/kani', 164, 42), ('kaden/usagi', 198, 48)]:
        S.toy(ref, cx, 180, h, shade=(0x7a140e, 2, 0))
    S.text('GRAND', 'ala', 1, 112, 186, CREAM, anchor='mt', track=2)
    S.text('RE-OPENING', 'ggd', 1, 112, 204, CREAM, anchor='mt', shadow=(1, 1, 0x6e120c))
    S.text('GACHA GARAGE', 'jersey20', 1, 112, 242, INK, anchor='mt', track=1)
    S.rect(72, 266, 80, 1, RED)
    S.text('Open again in the back lane', 'dot', 1, 112, 271, INK, anchor='mt')
    S.text('10:00-20:00  300 YEN A TURN', 'dot', 1, 112, 286, RED, anchor='mt')
    S.text('SHOWA-CHO 2-CHOME', 'dot', 1, 112, 301, INK, anchor='mt')


@design(PROMO, 'promo:space', P, paper='Paper001', fade=0.08, tape=('tl', 'tr'), seed=2)
def _(S):
    S.paper('Paper001', 0.35)
    S.rect(0, 0, 34, 317, TEAL)
    S.text('NEW SERIES - 6 FIGURES + 1 SECRET', 'ala', 1, 17, 304, CREAM, anchor='mb', rot=90, track=1)
    S.photo(oi('tatami'), 46, 14, 168, 120, f=(0.5, 0.55, 1.15), sat=0.85, warm=0.04)
    S.rect(168, 112, 46, 40, TEAL)
    S.text('300', 'jersey20', 1, 191, 117, CREAM, anchor='mt'); S.text('YEN', 'ala', 1, 191, 140, CREAM, anchor='mt')
    S.text('Appliance', 'ala', 2, 46, 160, INK)
    S.text('Animals', 'ala', 2, 46, 188, TEAL)
    S.para('Switch them on and they turn into animals.', 46, 210, 168, 'dot', 1, INK)
    S.rect(46, 292, 168, 1, INK)
    for ref, cx, h in [('kaden/fukuro', 74, 54), ('kaden/zou', 128, 42), ('kaden/usagi', 182, 46)]:
        S.toy(ref, cx, 292, h)
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 46, 299, INK)


@design(PROMO, 'promo:sakura', P, paper='Paper001', fade=0.07, tape=('tl', 'tr'), seed=3)
def _(S):
    S.paper('Paper001', 0.35)
    S.photo('ph:sakura', 0, 0, 224, 142, f=(0.5, 0.42, 1.1), sat=0.88)
    S.rect(24, 116, 176, 54, VERM)
    S.rect(27, 119, 170, 48, CREAM, line=1)
    S.text('A NEW SERIES OF SIX', 'dot', 1, 112, 122, CREAM, anchor='mt')
    S.text("THE GODS' MESSENGERS", 'ala', 1, 112, 140, CREAM, anchor='mt', track=1)
    S.para('Fox, snake, deer and crow, sent down from the shrine.', 22, 178, 180, 'dot', 1, INK, align='m')
    S.rect(0, 266, 224, 5, VERM)
    for ref, cx, h in [('otsukai/kitsune', 40, 62), ('otsukai/hebi', 90, 50), ('otsukai/shika', 139, 64), ('otsukai/karasu', 188, 58)]:
        S.toy(ref, cx, 268, h)
    S.text('400 YEN A TURN', 'jersey15', 1, 112, 279, VERM, anchor='mt', track=1)
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 112, 302, INK, anchor='mt', track=1)


@design(PROMO, 'promo:glow', P, paper='Paper005', fade=0.04, tape=('tl', 'tr'), seed=4)
def _(S):
    S.rect(0, 0, 224, 317, 0x0d131b)
    S.photo('ph:rain_window', 0, 0, 224, 262, f=(0.5, 0.5, 1.1), sat=0.55, bright=0.42, con=1.1)
    S.text('GLOW', 'ggd', 2, 112, 26, MINT, anchor='mt')
    S.text('IN THE DARK', 'ala', 2, 112, 66, MINT, anchor='mt', track=1)
    for ref, cx, h in [('yomise/hotaruika', 56, 86), ('obakebaito/chochin', 116, 76), ('teruteru/niji', 174, 76)]:
        S.toy(ref, cx, 264, h)
    S.rect(0, 262, 224, 55, MINT)
    S.text('SPECIAL FINISH: 1 IN 200', 'ala', 1, 112, 269, 0x0d131b, anchor='mt', track=1)
    S.text('Switch the light off and look.', 'dot', 1, 112, 284, 0x0d131b, anchor='mt')
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 112, 299, 0x0d131b, anchor='mt')


@design(PROMO, 'promo:kaiju', P, paper='Paper001', fade=0.1, tape=('tl', 'tr'), seed=5)
def _(S):
    S.rect(0, 0, 224, 317, 0x14120f)
    S.photo('ph:skyline', 0, 0, 224, 196, f=(0.6, 0.62, 1.25), sat=0.9, con=1.12, bright=0.95)
    S.toy('nakanohito/entotsu', 38, 200, 76, flip=True)
    S.toy('nakanohito/mogura', 136, 204, 172)
    S.rect(0, 184, 224, 30, YEL)
    t = "WHO'S IN THE SUIT?"
    face = 'jersey20' if S.tw(t, 'jersey20') <= 216 else 'jersey15'
    S.text(t, face, 1, 112, 199, 0x14120f, anchor='mm')
    S.text('GACHA GARAGE PRESENTS', 'ala', 1, 112, 222, CREAM, anchor='mt', track=2)
    S.text('MONSTERS WITH SOMEONE INSIDE', 'dot', 1, 112, 237, YEL, anchor='mt')
    S.para('DRILL MOLE - SMOKESTACK LIZARD - CLAM ROBOT - AND ONE SECRET', 16, 252, 192, 'dot', 1, CREAM, align='m')
    S.text('300 YEN  NOW SHOWING', 'jersey15', 1, 112, 284, YEL, anchor='mt', track=1)
    S.text('IN THE BACK LANE', 'dot', 1, 112, 301, CREAM, anchor='mt')


@design(PROMO, 'promo:secret', P, paper='Paper005', fade=0.04, tape=('tl', 'tr'), seed=6)
def _(S):
    S.photo('ph:milky_way', 0, 0, 224, 317, f=(0.5, 0.5, 1.0), sat=0.8, bright=0.85)
    S.rect(12, 12, 200, 293, GOLD, line=1)
    S.text('ONE IN EVERY SERIES', 'ala', 1, 112, 24, GOLD, anchor='mt', track=2)
    S.text('SUPER', 'ggd', 1, 112, 38, GOLD, anchor='mt')
    S.text('SECRET', 'ggd', 2, 112, 60, GOLD, anchor='mt', shadow=(2, 2, 0x4a3208))
    S.toy('tabigame/sekai', 112, 236, 110)
    S.text('ONE IN 500 PULLS.', 'dot', 1, 112, 244, CREAM, anchor='mt')
    S.text('CAN YOU PULL ONE?', 'dot', 1, 112, 258, CREAM, anchor='mt')
    S.text('GACHA GARAGE', 'jersey15', 1, 112, 276, GOLD, anchor='mt', track=1)


# ==================================================================== meme flyers (original parodies, the game's cast)
@design(PROMO, 'promo:much', P, paper='Paper001', fade=0.05, seed=7)
def _(S):
    S.photo(oi('shiba_puppy'), 0, 0, 224, 294, f=(0.5, 0.42, 1.0), sat=0.95)
    for s, x, y, sc, c in [('wow', 18, 26, 2, YEL), ('such capsule', 104, 70, 1, 0xff5a9e), ('very gacha', 12, 160, 1, 0x48d0f0),
                           ('much want', 118, 214, 1, 0x9ae860), ('so 300 yen', 22, 258, 1, 0xff8a3a)]:
        S.text(s, x, y, 'ala', sc, c, outline=[(1, 0x1a1410)])
    S.rect(0, 294, 224, 23, INK)
    S.text('WOW. GACHA GARAGE, BACK LANE.', 'dot', 1, 112, 302, CREAM, anchor='mt')


@design(PROMO, 'promo:nope', P, paper='Paper001', fade=0.05, seed=8)
def _(S):
    S.paper('Paper002', 0.3)
    S.photo(oi('cat_black'), 8, 8, 102, 138, f=(0.42, 0.5, 1.2), sat=0.9)
    S.photo(oi('cat_grey'), 8, 154, 102, 138, f=(0.55, 0.45, 1.25), sat=0.9)
    S.rect(116, 8, 100, 138, INK, line=1); S.rect(116, 154, 100, 138, INK, line=1)
    tag(S, 'NOPE', 140, 22, RED)
    S.para('Ordering toys online and waiting a week', 124, 42, 86, 'ala', 1, INK)
    tag(S, 'YEP', 136, 168, TEAL)
    S.para('One turn at the garage in the back lane', 124, 188, 86, 'ala', 1, INK)
    S.toy('teruteru/para', 194, 288, 44)
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 112, 302, INK, anchor='mt', track=1)


@design(PROMO, 'promo:distracted', P, paper='Paper001', fade=0.06, seed=9)
def _(S):
    S.paper('Paper001', 0.3)
    S.photo('ph:back_street', 0, 0, 224, 210, f=(0.5, 0.55, 1.15), sat=0.85)
    tag(S, 'MY LUNCH BREAK', 56, 88, INK); tag(S, 'ME, ON PAYDAY', 120, 158, RED); tag(S, 'THE GACHA GARAGE', 160, 44, TEAL)
    S.text('Distracted', 'ala', 2, 12, 220, INK)
    S.text('Customer', 'ala', 2, 12, 246, RED)
    S.para('Payday lunch break. My feet know the way.', 12, 274, 136, 'dot', 1, INK)
    S.toy('tsuppari/neko', 186, 304, 88)


@design(PROMO, 'promo:brain', P, paper='Paper001', fade=0.05, seed=10)
def _(S):
    rows = [('One turn.', PAPER, INK, [('dango/hanami', 0.5, 58)]),
            ('Ten turns.', 0xe9e1cc, INK, [('dango/hanami', 0.22, 46), ('dango/kusa', 0.5, 50), ('dango/kinako', 0.78, 46)]),
            ('The whole series, secret and all.', 0x2a3248, CREAM, [('tabigame/pagoda', 0.14, 38), ('tabigame/pisa', 0.38, 42), ('tabigame/tokei', 0.62, 42), ('tabigame/sekai', 0.86, 44)]),
            ('Inheriting the garage.', 0x0c0e1a, CREAM, None)]
    y = 0
    for i, (txt, bg, ink, toys) in enumerate(rows):
        S.rect(0, y, 224, 75, bg)
        if toys is None:
            S.photo('ph:galaxy', 112, y + 5, 106, 65, f=(0.5, 0.5, 1.1), sat=0.9)
            S.toy('teruteru/niji', 166, y + 70, 56)
        else:
            for ref, fx, h in toys: S.toy(ref, 112 + 106 * fx, y + 71, h)
        S.para(txt, 8, y + 12, 96, 'ala', 1, ink)
        S.rect(0, y + 75, 224, 1, INK)
        y += 76
    S.rect(0, 304, 224, 13, INK)
    S.text('GALAXY COLLECTOR', 'ala', 1, 112, 307, CREAM, anchor='mt', track=1)


@design(PROMO, 'promo:simply', P, paper='Paper001', fade=0.06, seed=11)
def _(S):
    S.photo(oi('fuji'), 0, 0, 224, 317, f=(0.5, 0.5, 1.2), sat=0.95)
    for s, y in [('ONE DOES', 14), ('NOT SIMPLY', 34)]: S.text(s, 'ggd', 1, 112, y, 0xffffff, anchor='mt', outline=[(1, INK)])
    for s, y in [('TURN THE HANDLE', 244), ('ONLY ONCE', 264)]: S.text(s, 'ggd', 1, 112, y, 0xffffff, anchor='mt', outline=[(1, INK)], maxw=214)
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 112, 300, 0xffffff, anchor='mt', outline=[(1, INK)], track=1)


@design(PROMO, 'promo:nobody', P, paper='Paper002', fade=0.05, seed=12)
def _(S):
    S.paper('Paper002', 0.35)
    S.text('Nobody:', 'jersey15', 1, 14, 14, INK)
    S.text('Me at 3 a.m. in the back lane:', 'dot', 1, 14, 38, INK)
    S.photo('ph:rainy_lane', 14, 52, 196, 142, f=(0.5, 0.55, 1.05), sat=0.85)
    S.text('"Just one more turn."', 'ala', 1, 112, 204, INK, anchor='mt')
    S.rect(14, 222, 110, 1, INK)
    S.para('Rain, no umbrella, last coin in hand. The capsule machines never close.', 14, 230, 112, 'dot', 1, INK)
    S.toy('tsuppari/niwatori', 176, 300, 88)
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 14, 304, INK, track=1)


@design(PROMO, 'promo:expect', P, paper='Paper001', fade=0.05, seed=13)
def _(S):
    S.rect(0, 0, 224, 20, INK); S.text('EXPECTATION', 'ala', 1, 112, 5, CREAM, anchor='mt', track=1)
    S.photo(oi('gumballs'), 0, 20, 224, 132, f=(0.5, 0.5, 1.1), sat=0.95, bright=0.9)
    S.toy('teruteru/niji', 112, 150, 112)
    S.rect(0, 152, 224, 20, RED); S.text('REALITY', 'ala', 1, 112, 157, CREAM, anchor='mt', track=1)
    S.paper('Paper001', 0.3, 0, 172, 224, 145)
    for cx in (48, 112, 176): S.toy('teruteru/shito', cx, 280, 86)
    S.text('Drizzle. Again. Sixth time.', 'ala', 1, 112, 287, INK, anchor='mt')
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 112, 306, INK, anchor='mt', track=1)


@design(PROMO, 'promo:manager', P, paper='Paper001', fade=0.05, tape=('tl',), seed=14)
def _(S):
    S.paper('Paper001', 0.35)
    S.rect(0, 0, 224, 34, INK)
    S.text('STAFF NOTICE', 'jersey15', 1, 12, 10, CREAM, track=1)
    S.text('No. 1', 'ala', 1, 212, 15, GOLD, anchor='rt')
    S.text('MEET OUR NEW', 'ala', 1, 12, 44, INK, track=2)
    S.text('Store Manager', 'ala', S.fit('Store Manager', 'ala', 2, 200), 12, 56, INK)
    S.rect(12, 92, 88, 114, INK); S.photo(oi('cat_grey'), 15, 95, 82, 108, f=(0.5, 0.42, 1.35), sat=0.9)
    y = 94
    for k, v in [('NAME', 'Mikan'), ('DUTIES', 'Naps, checks capsules'), ('PAY', 'Snacks'), ('HOURS', 'When she likes')]:
        S.text(k, 'ala', 1, 108, y, RED, track=1)
        y = S.para(v, 108, y + 11, 104, 'dot', 1, INK) + 1
        S.rect(108, y, 104, 1, INK); y += 5
    S.para('Please be polite to the manager. She was here first.', 12, 240, 200, 'ala', 1, INK)
    S.text('GACHA GARAGE - BACK LANE', 'dot', 1, 12, 304, INK, track=1)


@design(PROMO, 'promo:itwasme', P, paper='Paper001', fade=0.05, seed=15)
def _(S):
    S.rect(0, 0, 224, 317, 0x0a0a0a)
    S.photo(oi('cat_fluffy'), 0, 40, 224, 236, f=(0.5, 0.45, 1.15), sat=0.85)
    S.text('GACHA GARAGE PRESENTS', 'ala', 1, 112, 18, CREAM, anchor='mt', track=2)
    S.text('What was in the capsule all along?', 'dot', 1, 112, 226, 0xffffff, anchor='mt', outline=[(1, 0x0a0a0a)])
    S.text('It was me. Mikan.', 'ala', 1, 112, 244, YEL, anchor='mt', outline=[(1, 0x0a0a0a)])
    S.text('BUT IT WAS ME', 'jersey15', 1, 112, 289, CREAM, anchor='mt', track=3)


# ==================================================================== lane posters (184 x 260), notices (164 x 232), photo-calendar pages (230 x 181)
LP, LN, LC, LL = (184, 260), (164, 232), (230, 181), (180, 255)
OUT = dict(paper='Paper001', streak=0.45, crease=0.5, tape=('tl', 'tr'))
def age(**kw): d = dict(OUT); d.update(kw); return d


@design(LANE, 'lane:travel:0', LP, **age(fade=0.22, seed=21))
def _(S):
    S.photo(oi('fuji'), 0, 0, 184, 196, f=(0.5, 0.48, 1.05), sat=0.9)
    tag(S, 'KAMIYAMA RAILWAY', 66, 14, NAVY)
    S.text('FUJI', 'ggd', 2, 92, 30, CREAM, anchor='mt', shadow=(2, 2, NAVY))
    S.rect(0, 196, 184, 64, CREAM); S.paper('Paper001', 0.4, 0, 196, 184, 64)
    S.text('SEE IT BY RAIL', 'jersey15', 1, 92, 203, NAVY, anchor='mt', track=1)
    S.text('RETURN FARE 3,800 YEN', 'dot', 1, 92, 221, INK, anchor='mt')
    S.rect(10, 236, 164, 2, RED)
    S.text('KAMIYAMA RAILWAY', 'ala', 1, 92, 244, RED, anchor='mt', track=2)


@design(LANE, 'lane:travel:1', LP, **age(fade=0.3, seed=22))
def _(S):
    G = 0x2c4636
    S.rect(0, 0, 184, 260, G); S.paper('Paper001', 0.3)
    S.text('HOT SPRING', 'jersey15', 1, 92, 10, CREAM, anchor='mt', track=2)
    S.text('VALLEY', 'ggd', 1, 92, 28, GOLD, anchor='mt')
    S.photo(oi('monkeys'), 10, 52, 164, 112, f=(0.5, 0.45, 1.15), sat=0.9)
    S.rect(10, 52, 164, 112, CREAM, line=1)
    for i, (d, t) in enumerate([('DAY 1', 'Express'), ('DAY 2', 'Monkeys'), ('DAY 3', 'Home')]):
        x = 10 + i * 56
        S.text(d, 'ala', 1, x, 172, GOLD, track=1)
        S.text(t, 'dot', 1, x, 186, CREAM)
    S.rect(10, 212, 164, 1, GOLD)
    S.text('TWO NIGHTS, RAIL AND INN', 'dot', 1, 92, 219, CREAM, anchor='mt')
    S.text('18,000 YEN', 'jersey15', 1, 92, 230, GOLD, anchor='mt', track=1)
    S.text('KAMIYAMA RAILWAY', 'dot', 1, 92, 247, CREAM, anchor='mt')


@design(LANE, 'lane:travel:2', LP, **age(fade=0.25, seed=23))
def _(S):
    S.photo(oi('sailboat'), 0, 0, 184, 260, f=(0.55, 0.5, 1.0), sat=0.92)
    S.rect(0, 0, 34, 260, SKY)
    S.text('SUMMER SEA LINE', 'ggd', 1, 17, 246, CREAM, anchor='mb', rot=90)
    S.rect(44, 206, 132, 46, CREAM)
    S.text('SEASIDE EXPRESS', 'ala', 1, 50, 212, NAVY, track=1)
    S.text('Saturdays in summer', 'dot', 1, 50, 222, INK)
    S.text('FROM 1,200 YEN', 'ala', 1, 50, 234, RED, track=1)


@design(LANE, 'lane:travel:3', LP, **age(fade=0.18, seed=24))
def _(S):
    S.paper('Paper001', 0.35)
    S.photo(oi('hydrangea'), 22, 20, 140, 140, f=(0.5, 0.45, 1.2), sat=0.95)
    S.text('Hydrangea', 'ala', 2, 92, 172, INK, anchor='mt')
    S.text('S E A S O N', 'ala', 1, 92, 200, 0x5a4a8a, anchor='mt')
    S.text('June at Kita Temple', 'dot', 1, 92, 211, INK, anchor='mt')
    S.rect(60, 226, 64, 1, INK)
    S.rect(48, 236, 7, 7, RED)
    S.text('KAMIYAMA RAILWAY', 'dot', 1, 60, 236, INK)


@design(LANE, 'lane:festival:0', LP, **age(fade=0.2, seed=25))
def _(S):
    S.rect(0, 0, 184, 260, NAVY)
    S.photo(oi('bonodori'), 0, 0, 184, 118, f=(0.5, 0.45, 1.1), sat=0.95)
    S.photo(oi('fireworks'), 112, 82, 62, 62, f=(0.5, 0.5, 1.2), shape='circle')
    S.ellipse(112, 82, 62, 62, CREAM, line=2)
    S.text('SUMMER', 'ggd', 1, 10, 124, GOLD)
    S.text('FESTIVAL', 'ggd', 1, 10, 143, CREAM)
    S.text('SAT 8.14 - FROM 17:00', 'dot', 1, 10, 166, GOLD)
    y = 184
    for t, ev in [('17:00', 'NIGHT STALLS'), ('18:30', 'BON DANCE'), ('19:30', "KIDS' MIKOSHI"), ('20:30', 'FIREWORKS')]:
        S.rect(10, y - 2, 164, 1, 0x4a5a80)
        S.text(t, 'dot', 1, 10, y + 1, GOLD); S.text(ev, 'dot', 1, 50, y + 1, CREAM); y += 13
    S.rect(0, 238, 184, 22, 0x121a30)
    S.text('CENTRAL PARK - FREE ENTRY', 'dot', 1, 92, 244, CREAM, anchor='mt')


@design(LANE, 'lane:festival:1', LN, **age(fade=0.25, seed=26, folds=(1, 0)))
def _(S):
    S.photo(oi('fireworks'), 0, 0, 164, 232, f=(0.5, 0.45, 1.05), sat=0.95)
    S.text('FIREWORKS', 'jersey20', 1, 82, 12, CREAM, anchor='mt', track=1)
    S.text('ON THE RIVER', 'ala', 1, 82, 36, GOLD, anchor='mt', track=2)
    S.rect(0, 196, 164, 36, 0x0b0b10)
    S.text('SAT 21 AUGUST - 19:30', 'dot', 1, 82, 203, CREAM, anchor='mt')
    S.text('KAMIYAMA RIVERBANK', 'dot', 1, 82, 217, GOLD, anchor='mt', track=1)


@design(LANE, 'lane:event:0', LP, **age(fade=0.3, seed=27))
def _(S):
    S.paper('Paper001', 0.4)
    S.rect(0, 0, 184, 58, INK)
    S.text('GRAND', 'ala', 1, 10, 10, CREAM, track=3)
    S.text('SUMO', 'ggd', 2, 10, 20, CREAM)
    S.rect(150, 0, 34, 58, RED)
    S.text('AUTUMN', 'ala', 1, 167, 52, CREAM, anchor='mb', rot=90, track=1)
    S.photo(oi('sumo'), 8, 64, 168, 108, f=(0.5, 0.55, 1.25), sat=0.88)
    S.text('KAMIYAMA AUTUMN TOUR', 'ala', 1, 92, 180, INK, anchor='mt', track=1)
    S.text('15-20 AUGUST - CITY GYMNASIUM', 'dot', 1, 92, 198, RED, anchor='mt')
    y = 212
    for k, v in [('RINGSIDE', '6,000 YEN'), ('BOX SEAT', '3,500 YEN'), ('GALLERY', '1,500 YEN')]:
        S.text(k, 'dot', 1, 16, y, INK); S.text(v, 'dot', 1, 168, y, INK, anchor='rt')
        S.rect(16, y + 10, 152, 1, 0x8a8070); y += 14


@design(LANE, 'lane:event:1', LP, **age(fade=0.22, seed=28))
def _(S):
    S.paper('Paper001', 0.35)
    S.rect(0, 0, 184, 40, SKY)
    S.text('JUNIOR BASEBALL', 'jersey15', 1, 92, 7, CREAM, anchor='mt', track=1)
    S.text('SUMMER CUP', 'ala', 1, 92, 27, GOLD, anchor='mt', track=2)
    S.photo(oi('baseball'), 0, 40, 184, 124, f=(0.5, 0.5, 1.1), sat=0.85)
    S.text('7.27', 'jersey25', 1, 10, 172, NAVY)
    S.text('SUNDAY', 'ala', 1, 10, 200, RED, track=1)
    S.para('RIVERSIDE GROUND, KAMIYAMA. 8 TEAMS, FIRST PITCH 9:00. COME AND CHEER!', 72, 174, 104, 'dot', 1, INK)
    S.rect(0, 236, 184, 24, NAVY)
    S.text('KAMIYAMA LITTLE LEAGUE', 'dot', 1, 92, 245, CREAM, anchor='mt', track=1)


@design(LANE, 'lane:zoo:0', LP, **age(fade=0.25, seed=29))
def _(S):
    Z = 0x2f6a3a
    S.paper('Paper001', 0.35)
    S.photo(oi('giraffe'), 0, 0, 90, 260, f=(0.7, 0.45, 1.08), sat=0.92)
    S.text('SHIOMI', 'jersey15', 1, 98, 10, Z, track=1)
    S.text('ZOO', 'ggd', 2, 98, 28, Z)
    S.para('Meet the giraffes', 98, 66, 80, 'ala', 1, INK)
    S.photo(oi('elephant'), 104, 100, 70, 70, f=(0.5, 0.5, 1.2), shape='circle')
    S.ellipse(104, 100, 70, 70, Z, line=2)
    y = 180
    for t in ['OPEN 9-17', 'CLOSED MON', 'ADULTS 600', 'KIDS 200']:
        S.text(t, 'dot', 1, 98, y, INK); y += 11
    S.rect(90, 226, 94, 34, Z)
    S.text('NEW!', 'ala', 1, 98, 231, CREAM, track=1)
    S.text('SAVANNA WALK', 'dot', 1, 98, 245, GOLD)


@design(LANE, 'lane:zoo:1', LP, **age(fade=0.2, seed=30))
def _(S):
    B = 0x14385a
    S.rect(0, 0, 184, 260, B)
    S.photo(oi('aquarium'), 0, 0, 184, 170, f=(0.5, 0.5, 1.2), sat=0.95)
    S.text('SHIOMI AQUARIUM', 'jersey15', 1, 92, 178, CREAM, anchor='mt', track=1)
    S.text('SUMMER NIGHTS', 'ala', 1, 92, 198, 0x7fd8e8, anchor='mt', track=2)
    S.para('OPEN LATE UNTIL 21:00 EVERY SATURDAY IN AUGUST', 14, 210, 156, 'dot', 1, CREAM, align='m')
    S.rect(14, 232, 156, 1, 0x7fd8e8)
    S.text('ADULTS 900  CHILDREN 400', 'dot', 1, 92, 240, CREAM, anchor='mt')


@design(LANE, 'lane:kakigori:0', LN, **age(fade=0.15, seed=31, paper='Paper002'))
def _(S):
    S.paper('Paper002', 0.4)
    S.text('KAKIGORI', 'jersey20', 1, 82, 10, RED, anchor='mt', track=1)
    S.text('SHAVED ICE NOW SERVING', 'ala', 1, 82, 34, SKY, anchor='mt')
    S.photo(oi('kakigori'), 12, 46, 140, 90, f=(0.5, 0.45, 1.2), sat=0.95)
    y = 144
    for k, v in [('STRAWBERRY', '150'), ('MELON', '150'), ('LEMON', '150'), ('BLUE HAWAII', '150'), ('UJI KINTOKI', '250')]:
        S.text(k, 'dot', 1, 14, y, INK); S.text(v + ' YEN', 'dot', 1, 150, y, RED, anchor='rt')
        S.rect(14, y + 9, 136, 1, 0xc0b8a8); y += 13
    S.text('AT MIKAWA-YA', 'dot', 1, 82, 213, INK, anchor='mt')


@design(LANE, 'lane:rent:0', LN, **age(fade=0.3, seed=32, paper='Paper002', folds=(1, 1)))
def _(S):
    S.paper('Paper002', 0.4)
    S.rect(0, 0, 164, 26, 0x1f4a9a)
    S.text('ROOM FOR RENT', 'jersey15', 1, 82, 6, CREAM, anchor='mt', track=1)
    S.photo('oi:f291d677045b5a38', 10, 32, 144, 66, f=(0.5, 0.5, 1.1), sat=0.85)
    y = 104
    for k, v in [('LAYOUT', '2DK'), ('RENT', '45,000 YEN'), ('STATION', '8 MIN WALK'), ('FLOOR', '2ND, SOUTH'), ('GAS', 'INCLUDED')]:
        S.text(k, 'ala', 1, 12, y + 1, 0x1f4a9a); S.text(v, 'dot', 1, 152, y, INK, anchor='rt')
        S.rect(12, y + 9, 140, 1, 0xb8b0a0); y += 12
    S.text('OTA REALTY  3-2711', 'dot', 1, 82, 168, RED, anchor='mt')
    for i in range(10):  # tear-off phone tabs (two already taken)
        x = 2 + i * 16
        if i in (3, 7): S.rect(x, 182, 16, 50, 0x5a544e, a=0); continue
        S.rect(x, 182, 1, 50, 0x9a9080)
        S.text('3-2711', 'dot', 1, x + 9, 228, INK, anchor='mb', rot=90)


def calendar(S, y0, x0, w, year, month, fs='ala'):
    import calendar as C
    first, n = C.monthrange(year, month); first = (first + 1) % 7  # weeks start on Sunday
    cw = w / 7
    for i, d in enumerate('SMTWTFS'): S.text(d, 'ala', 1, round(x0 + cw * i + cw / 2), y0, RED if i == 0 else INK, anchor='mt')
    for d in range(1, n + 1):
        c = (first + d - 1) % 7; r = (first + d - 1) // 7
        S.text(str(d), fs, 1, round(x0 + cw * c + cw / 2), y0 + 12 + r * 11, RED if c == 0 else INK, anchor='mt')


@design(LANE, 'lane:print:0', LC, **age(fade=0.3, seed=33, paper='Paper003'))
def _(S):
    S.paper('Paper001', 0.35)
    S.photo('ph:sakura', 0, 0, 106, 181, f=(0.5, 0.4, 1.1), sat=0.9)
    S.text('APRIL', 'jersey20', 1, 168, 10, INK, anchor='mt', track=1)
    S.text('SHOWA 62 - 1987', 'ala', 1, 168, 34, RED, anchor='mt', track=1)
    calendar(S, 50, 110, 116, 1987, 4)
    S.text('SHINKIN BANK', 'dot', 1, 168, 166, INK, anchor='mt')


@design(LANE, 'lane:print:1', LC, **age(fade=0.25, seed=34, paper='Paper003'))
def _(S):
    S.paper('Paper001', 0.35)
    S.photo('ph:cumulus', 0, 0, 230, 98, f=(0.5, 0.45, 1.05), sat=0.95)
    S.text('AUGUST', 'ggd', 1, 8, 108)
    S.text('1987', 'ala', 1, 8, 128, SKY, track=2)
    calendar(S, 104, 92, 132, 1987, 8)
    S.text('OTA REALTY', 'dot', 1, 8, 152, INK)


@design(LANE, 'lane:print:2', LC, **age(fade=0.35, seed=35, paper='Paper003'))
def _(S):
    S.photo('ph:rainy_lane', 0, 0, 230, 181, f=(0.5, 0.5, 1.0), sat=0.85)
    S.rect(104, 18, 120, 146, CREAM); S.paper('Paper001', 0.35, 104, 18, 120, 146)
    S.text('June', 'ala', 2, 164, 26, INK, anchor='mt')
    S.text('SHOWA 62', 'ala', 1, 164, 52, SKY, anchor='mt', track=1)
    calendar(S, 66, 108, 112, 1987, 6)


# ---- the three lost-pet notices, rebuilt in pixel type from their Canva layouts (photos and paper as before)
@design(LANE, 'lane:lost:cat0', LL, **age(paper='Paper002', fade=0.18, streak=0.5, crease=0.6, folds=(1, 1), seed=41))
def _(S):
    BR, PA = 0x492809, 0xe2c899
    S.rect(0, 0, 180, 255, BR)
    S.rect(7, 7, 166, 241, PA); S.paper('Paper003', 0.9, 7, 7, 166, 241)
    S.rect(11, 11, 158, 233, BR, line=1)
    S.text('MISSING CAT', 'jersey20', 1, 90, 18, BR, anchor='mt', track=1)
    S.rect(16, 48, 72, 52, BR)
    S.text('REWARD', 'ala', 1, 52, 60, PA, anchor='mt', track=2)
    S.text('5,000 YEN', 'dot', 1, 52, 76, PA, anchor='mt')
    S.text('KURO', 'ggd', 1, 16, 110, BR)
    S.rect(16, 130, 72, 2, BR)
    S.para('Black, 2 yrs, red collar. Shy.', 16, 137, 72, 'dot', 1, BR)
    S.rect(94, 46, 72, 110, BR); S.photo(oi('cat_black'), 97, 49, 66, 98, f=(0.42, 0.5, 1.1), sat=0.9)
    S.para('LAST SEEN: SHOWA-CHO BACK LANE', 16, 184, 150, 'dot', 1, BR)
    S.rect(16, 210, 150, 2, BR)
    S.text('PLEASE CALL', 'dot', 1, 166, 216, BR, anchor='rt')
    S.text('23-4567 (TANAKA)', 'ala', 1, 166, 230, BR, anchor='rt', track=1)


@design(LANE, 'lane:lost:cat1', LL, **age(paper='Paper002', fade=0.1, streak=0.35, crease=0.4, folds=(1, 1), torn=('br',), seed=42))
def _(S):
    BRN, SAND = 0x6b5645, 0xf2e1c6
    S.rect(0, 0, 180, 255, 0xfffbf6); S.paper('Paper002', 0.3)
    S.rect(16, 12, 148, 46, SAND, r=8)
    S.text('MISSING CAT', 'jersey20', 1, 90, 18, BRN, anchor='mt', track=1)
    S.text('PLEASE HELP US FIND "TAMA"', 'dot', 1, 90, 44, BRN, anchor='mt')
    S.rect(14, 68, 152, 124, 0xfff3e6, r=8)
    S.photo(oi('cat_grey'), 22, 76, 136, 80, f=(0.55, 0.45, 1.25), sat=0.9)
    S.poly([(146, 76), (158, 76), (158, 88)], BRN)
    S.para('Grey tabby, 4 years, very friendly. Last seen: Sakura Heights.', 22, 160, 136, 'dot', 1, BRN, align='m')
    S.text('ANY NEWS? PLEASE', 'dot', 1, 90, 204, BRN, anchor='mt')
    S.text('CALL 23-8812 ANY TIME', 'ala', 1, 90, 219, BRN, anchor='mt', track=1)


@design(LANE, 'lane:lost:dog0', LL, **age(paper='Paper002', fade=0.25, streak=0.6, crease=0.7, folds=(1, 1), seed=43))
def _(S):
    DK, BL, OR = 0x2a2e30, 0x345c72, 0xd17d5d
    S.rect(0, 0, 180, 255, 0xffffff); S.paper('Paper002', 0.3)
    S.rect(0, 0, 180, 6, OR); S.rect(0, 249, 180, 6, BL)
    S.text('LOST DOG', 'ggd', 1, 90, 16, DK, anchor='mt')
    S.photo(oi('shiba'), 38, 42, 104, 100, f=(0.5, 0.42, 1.25), shape='circle', sat=0.9)
    S.text('HACHI', 'jersey20', 1, 90, 150, BL, anchor='mt', track=2)
    S.para('Shiba, male, 3 yrs, red collar.', 16, 174, 148, 'dot', 1, BL, align='m')
    S.para('Last seen: Kamiyama Underpass, 3 August.', 16, 200, 148, 'dot', 1, DK, align='m')
    S.text('PLEASE CALL 23-4567', 'ala', 1, 90, 233, OR, anchor='mt', track=1)


# ==================================================================== bake
def render(reg, only=None):
    out = {}
    for k, (size, fn, age) in reg.items():
        if only and k not in only: continue
        S = Sheet(size[0], size[1], PAPER, u=U)
        fn(S)
        out[k] = S.finish(**age)
        print(' ', k)
    return out


if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    sheets = [a for a in sys.argv[1:] if a in ('promo', 'lane')] or ['promo', 'lane']
    for name in sheets:
        reg = PROMO if name == 'promo' else LANE
        ims = render(reg, only)
        out, idx = BP.pack(ims, 1024, alpha=True)
        if '--sheet' in sys.argv:
            p = sys.argv[sys.argv.index('--sheet') + 1].replace('.png', '_' + name + '.png')
            bg = Image.new('RGBA', out.size, (90, 84, 78, 255)); bg.alpha_composite(out); bg.convert('RGB').save(p); print('sheet', p, out.size)
        else:
            # lossy WebP with sharp's smart chroma subsampling: photos stay small, the pixel type keeps its colour edges
            import json
            PX.save_webp(out, os.path.join(BP.OUT, name + '.webp'), near=False, quality=90)
            json.dump(idx, open(os.path.join(BP.REGIONS, name + '.json'), 'w'), separators=(',', ':'))
            print(name, out.size, os.path.getsize(os.path.join(BP.OUT, name + '.webp')) // 1024, 'KB')
