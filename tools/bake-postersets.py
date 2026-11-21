#!/usr/bin/env python3
"""bake-postersets.py: the shop's promo posters and handout flyers, and the lane's posters and notices, laid out with
tools/posterkit.py (OFL print faces properly set, real photographs and Open Images cut-outs, renders of the actual
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
_bp = importlib.util.spec_from_file_location('bake_print', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-print.py'))
BP = importlib.util.module_from_spec(_bp); _bp.loader.exec_module(BP)
_bc = importlib.util.spec_from_file_location('bake_canva', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-canva.py'))
BC = importlib.util.module_from_spec(_bc); _bc.loader.exec_module(BC)

INK = 0x1c1816; CREAM = 0xf3ecdc; PAPER = 0xf6f1e4; RED = 0xc4291e; VERM = 0xd4442c; TEAL = 0x23756a; GOLD = 0xe2b23c
NAVY = 0x1b2a4a; MINT = 0xbfeccc; YEL = 0xf2c230; SKY = 0x2f6fa8
OI = {'shiba_puppy': 'a21093132630d7a2', 'cat_black': '4d2786e4d0239451', 'cat_grey': '73caeb335f576904', 'cat_fluffy': 'd3487e4cf55c90d3',
      'fuji': '6e1e87bb95452e41', 'monkeys': '2a1c261ad12e6f62', 'sailboat': '934ee278c3b493ca', 'hydrangea': 'e5572ed148dc0b76',
      'shinkansen': '842fcd9c97854956', 'sumo': '0deee1bb956b2216', 'baseball': '6c906fe112f15285', 'giraffe': '7222bd0a37b46602',
      'elephant': '3546e315dd033322', 'aquarium': '12b1f929640f1227', 'kakigori': 'b27664c9ed82adff', 'bonodori': '99d0d046afd231c4',
      'fireworks': '3273e580b71afeef', 'tatami': 'f4200fadef07c329', 'gumballs': '9a73ee8933d93045', 'fuji_izu': '78539e8d9556eb55'}
def oi(k): return 'oi:' + OI[k]
FOOT = 'GACHA GARAGE  ·  BACK LANE, SHOWA-CHO 2-CHOME'

PROMO, LANE = {}, {}
def design(reg, key, size, **age):
    def deco(fn): reg[key] = (size, fn, age); return fn
    return deco
P = (224, 317)  # promo / flyer: 0.42 m on the piers (~530 px/m), the same in the hand


# ==================================================================== promo posters
@design(PROMO, 'promo:reopen', P, paper='Paper001', fade=0.06, tape=('tl', 'tr'), seed=1)
def _(S):
    S.paper('Paper001', 0.35)
    S.photo('ph:garage', 30, 30, 540, 420, f=(0.5, 0.6, 1.08), sat=0.82, warm=0.05)
    S.rect(30, 30, 540, 420, INK, line=3)
    S.rect(0, 476, 600, 156, RED)
    for ref, cx, h in [('teruteru/para', 96, 150), ('dango/hanami', 204, 160), ('tabigame/pagoda', 318, 150), ('sento/kani', 438, 112), ('kaden/usagi', 528, 128)]:
        S.toy(ref, cx, 490, h, shade=(0x7a140e, 5, 0))
    S.text('GRAND', 'alfa', 34, 300, 548, CREAM, track=0.42, anchor='c')
    S.text('RE-OPENING', 'alfa', 58, 300, 616, CREAM, track=0.05, anchor='c', shade=(0x6e120c, 4, 4))
    S.text('GACHA GARAGE', 'archivo', 36, 300, 694, INK, track=0.1, anchor='c')
    S.rect(170, 710, 260, 3, RED)
    S.text('Grandpa’s capsule-toy garage is open again', 'barlows', 18, 300, 748, INK, track=0.03, anchor='c')
    S.text('OPEN 10:00 – 20:00   ·   300 YEN A TURN', 'barlowx', 22, 300, 790, RED, track=0.1, anchor='c')
    S.text('BACK LANE, SHOWA-CHO 2-CHOME', 'barlows', 14, 300, 824, INK, track=0.3, anchor='c')


@design(PROMO, 'promo:space', P, paper='Paper001', fade=0.08, tape=('tl', 'tr'), seed=2)
def _(S):
    S.paper('Paper001', 0.35)
    S.rect(0, 0, 92, 848, TEAL)
    S.text('NEW SERIES   ·   6 FIGURES + 1 SECRET', 'barlows', 20, 58, 808, CREAM, track=0.28, rot=90)
    S.photo(oi('tatami'), 122, 40, 448, 320, f=(0.5, 0.55, 1.15), sat=0.85, warm=0.04)
    S.rect(450, 300, 120, 120, TEAL)
    S.text('300', 'bebas', 50, 510, 368, CREAM, anchor='c'); S.text('YEN A TURN', 'barlows', 12, 510, 396, CREAM, track=0.2, anchor='c')
    S.text('Appliance', 'serif', 64, 120, 470, INK, track=-0.01)
    S.text('Animals', 'serif', 64, 120, 548, TEAL, track=-0.01)
    S.text('Switch them on and they turn into animals.', 'barlows', 20, 122, 594, INK, track=0.02)
    S.rect(122, 792, 448, 2, INK)
    for ref, cx, h in [('kaden/fukuro', 196, 180), ('kaden/zou', 342, 140), ('kaden/usagi', 486, 150)]:
        S.toy(ref, cx, 790, h)
    S.text(FOOT, 'barlows', 13, 122, 822, INK, track=0.22)


@design(PROMO, 'promo:sakura', P, paper='Paper001', fade=0.07, tape=('tl', 'tr'), seed=3)
def _(S):
    S.paper('Paper001', 0.35)
    S.photo('ph:sakura', 0, 0, 600, 380, f=(0.5, 0.42, 1.1), sat=0.88)
    S.rect(64, 318, 472, 132, VERM)
    S.rect(72, 326, 456, 116, CREAM, line=2)
    S.text('A NEW SERIES OF SIX', 'barlows', 14, 300, 360, CREAM, track=0.4, anchor='c')
    S.text('THE GODS’ MESSENGERS', 'oldmincho', S.fit('THE GODS’ MESSENGERS', 'oldmincho', 40, 420, 0.06), 300, 420, CREAM, track=0.06, anchor='c')
    S.text('Fox, white snake, deer and crow, sent down from the shrine.', 'barlows', 18, 300, 500, INK, anchor='c')
    S.rect(0, 716, 600, 12, VERM)
    for ref, cx, h in [('otsukai/kitsune', 110, 190), ('otsukai/hebi', 240, 150), ('otsukai/shika', 372, 196), ('otsukai/karasu', 500, 176)]:
        S.toy(ref, cx, 720, h)
    S.text('400 YEN A TURN', 'bebas', 40, 300, 784, VERM, track=0.08, anchor='c')
    S.text(FOOT, 'barlows', 13, 300, 822, INK, track=0.22, anchor='c')


@design(PROMO, 'promo:glow', P, paper='Paper005', fade=0.04, tape=('tl', 'tr'), seed=4)
def _(S):
    S.rect(0, 0, 600, 848, 0x0d131b)
    S.photo('ph:rain_window', 0, 0, 600, 700, f=(0.5, 0.5, 1.1), sat=0.55, bright=0.42, con=1.1)
    S.text('GLOW', 'bebas', 200, 300, 250, MINT, track=0.04, anchor='c')
    S.text('IN THE DARK', 'barlowx', 40, 300, 318, MINT, track=0.42, anchor='c')
    for ref, cx, h in [('yomise/hotaruika', 150, 230), ('obakebaito/chochin', 312, 200), ('teruteru/niji', 466, 200)]:
        S.toy(ref, cx, 704, h)
    S.rect(0, 700, 600, 148, MINT)
    S.text('A SPECIAL FINISH  ·  1 IN 200 PULLS', 'barlowx', 24, 300, 752, 0x0d131b, track=0.08, anchor='c')
    S.text('Take it home, switch the light off, and look.', 'barlows', 18, 300, 788, 0x0d131b, anchor='c')
    S.text(FOOT, 'barlows', 12, 300, 824, 0x0d131b, track=0.24, anchor='c')


@design(PROMO, 'promo:kaiju', P, paper='Paper001', fade=0.1, tape=('tl', 'tr'), seed=5)
def _(S):
    S.rect(0, 0, 600, 848, 0x14120f)
    S.photo('ph:skyline', 0, 0, 600, 540, f=(0.6, 0.62, 1.25), sat=0.9, con=1.12, bright=0.95)
    S.toy('nakanohito/entotsu', 110, 548, 210, flip=True)
    S.toy('nakanohito/mogura', 360, 560, 470)
    S.poly([(0, 488), (600, 420), (600, 520), (0, 588)], YEL)
    S.text('WHO’S IN THE SUIT?', 'anton', 54, 300, 530, 0x14120f, track=0.03, anchor='c', rot=6.5)
    S.text('GACHA GARAGE PRESENTS', 'barlows', 15, 300, 636, CREAM, track=0.42, anchor='c')
    S.text('MONSTERS WITH A LITTLE SOMEONE INSIDE', 'barlowx', 25, 300, 676, YEL, track=0.04, anchor='c')
    S.para('DRILL MOLE  ·  SMOKESTACK LIZARD  ·  RADIO MOTH  ·  CLAM ROBOT  ·  PADDY HYDRA  ·  AND ONE SECRET IN THE DIRECTOR’S CHAIR',
           'barlows', 12, 60, 712, 480, CREAM, track=0.16, align='c', lead=1.2)
    S.text('300 YEN  ·  NOW SHOWING IN THE BACK LANE', 'bebas', 30, 300, 806, YEL, track=0.06, anchor='c')


@design(PROMO, 'promo:secret', P, paper='Paper005', fade=0.04, tape=('tl', 'tr'), seed=6)
def _(S):
    S.photo('ph:milky_way', 0, 0, 600, 848, f=(0.5, 0.5, 1.0), sat=0.8, bright=0.85)
    S.rect(34, 34, 532, 780, GOLD, line=2)
    S.text('ONE IN EVERY SERIES', 'barlows', 16, 300, 88, GOLD, track=0.45, anchor='c')
    S.text('SUPER', 'limelight', 64, 300, 176, GOLD, track=0.2, anchor='c')
    S.text('SECRET', 'limelight', 92, 300, 286, GOLD, track=0.06, anchor='c', shade=(0x4a3208, 4, 4))
    S.toy('tabigame/sekai', 300, 650, 300)
    S.text('1 IN 500 PULLS.  CAN YOU PULL ONE?', 'barlowx', 24, 300, 714, CREAM, track=0.08, anchor='c')
    S.text('GACHA GARAGE', 'archivo', 26, 300, 770, GOLD, track=0.14, anchor='c')


# ==================================================================== meme flyers (original parodies, the game's cast)
@design(PROMO, 'promo:much', P, paper='Paper001', fade=0.05, seed=7)
def _(S):
    S.photo(oi('shiba_puppy'), 0, 0, 600, 790, f=(0.5, 0.42, 1.0), sat=0.95)
    for s, x, y, cap, c in [('wow', 64, 120, 46, YEL), ('such capsule', 300, 210, 32, 0xe8488e), ('very gacha', 40, 470, 30, 0x37c0e0),
                            ('much want', 330, 600, 34, 0x8ee05a), ('so 300 yen', 70, 712, 30, 0xff7a3a)]:
        S.text(s, 'yusei', cap, x, y, c, shade=(0x1a1410, 2, 2))
    S.rect(0, 790, 600, 58, INK)
    S.text('WOW.  GACHA GARAGE, BACK LANE.', 'barlowx', 22, 300, 828, CREAM, track=0.12, anchor='c')


@design(PROMO, 'promo:nope', P, paper='Paper001', fade=0.05, seed=8)
def _(S):
    S.paper('Paper002', 0.3)
    S.photo(oi('cat_black'), 24, 24, 276, 366, f=(0.42, 0.5, 1.2), sat=0.9)
    S.photo(oi('cat_grey'), 24, 412, 276, 366, f=(0.55, 0.45, 1.25), sat=0.9)
    S.rect(312, 24, 264, 366, INK, line=2); S.rect(312, 412, 264, 366, INK, line=2)
    S.rect(332, 48, 92, 38, RED); S.text('NOPE', 'barlowx', 26, 378, 77, CREAM, track=0.1, anchor='c')
    S.para('Ordering toys online and waiting a week', 'barlowx', 30, 334, 150, 224, INK, lead=1.0)
    S.rect(332, 436, 82, 38, TEAL); S.text('YEP', 'barlowx', 26, 373, 465, CREAM, track=0.1, anchor='c')
    S.para('One turn at the garage in the back lane', 'barlowx', 30, 334, 538, 224, INK, lead=1.0)
    S.toy('teruteru/para', 520, 770, 110)
    S.text(FOOT, 'barlows', 13, 300, 824, INK, track=0.22, anchor='c')


@design(PROMO, 'promo:distracted', P, paper='Paper001', fade=0.06, seed=9)
def _(S):
    S.paper('Paper001', 0.3)
    S.photo('ph:back_street', 0, 0, 600, 560, f=(0.5, 0.55, 1.15), sat=0.85)
    def tag(s, x, y, c):
        w = S.textw(s, 'barlowx', 20, 0.08) + 28
        S.rect(x - w / 2, y - 30, w, 42, c); S.text(s, 'barlowx', 20, x, y, CREAM, track=0.08, anchor='c')
    tag('MY LUNCH BREAK', 150, 230, INK); tag('ME, ON PAYDAY', 330, 420, RED); tag('THE GACHA GARAGE', 440, 120, TEAL)
    S.text('Distracted', 'serif', 56, 40, 646, INK)
    S.text('Customer', 'serif', 56, 40, 712, RED)
    S.para('Payday lunch break. My feet already know the way to the back lane.', 'barlows', 18, 40, 760, 360, INK, lead=1.0)
    S.toy('tsuppari/neko', 500, 800, 230)


@design(PROMO, 'promo:brain', P, paper='Paper001', fade=0.05, seed=10)
def _(S):
    rows = [('One turn.', PAPER, INK, [('dango/hanami', 0.5, 150)]),
            ('Ten turns.', 0xe9e1cc, INK, [('dango/hanami', 0.25, 120), ('dango/kusa', 0.5, 130), ('dango/kinako', 0.75, 120)]),
            ('The whole series, secret and all.', 0x2a3248, CREAM, [('tabigame/pagoda', 0.16, 100), ('tabigame/pisa', 0.38, 110), ('tabigame/tokei', 0.6, 112), ('tabigame/sekai', 0.84, 120)]),
            ('Inheriting the garage.', 0x0c0e1a, CREAM, None)]
    y = 0
    for i, (txt, bg, ink, toys) in enumerate(rows):
        S.rect(0, y, 600, 200, bg)
        if toys is None:
            S.photo('ph:galaxy', 300, y + 12, 288, 176, f=(0.5, 0.5, 1.1), sat=0.9)
            S.toy('teruteru/niji', 444, y + 186, 150)
        else:
            for ref, fx, h in toys: S.toy(ref, 300 + 288 * fx, y + 190, h)
        S.para(txt, 'barlowx', 30 if i < 3 else 34, 26, y + 72, 250, ink, lead=1.0)
        S.rect(0, y + 199, 600, 2, INK)
        y += 202
    S.rect(0, 808, 600, 40, INK)
    S.text('GALAXY COLLECTOR  ·  ' + FOOT, 'barlows', 12, 300, 834, CREAM, track=0.18, anchor='c')


@design(PROMO, 'promo:simply', P, paper='Paper001', fade=0.06, seed=11)
def _(S):
    S.photo(oi('fuji'), 0, 0, 600, 848, f=(0.5, 0.5, 1.2), sat=0.95)
    S.text('ONE DOES NOT SIMPLY', 'anton', S.fit('ONE DOES NOT SIMPLY', 'anton', 54, 560, 0.02), 300, 118, 0xffffff, track=0.02, anchor='c', stroke=(INK, 4))
    S.text('TURN THE HANDLE', 'anton', 54, 300, 704, 0xffffff, track=0.02, anchor='c', stroke=(INK, 4))
    S.text('ONLY ONCE', 'anton', 54, 300, 776, 0xffffff, track=0.02, anchor='c', stroke=(INK, 4))
    S.text(FOOT, 'barlows', 12, 300, 830, 0xffffff, track=0.22, anchor='c', stroke=(INK, 2))


@design(PROMO, 'promo:nobody', P, paper='Paper002', fade=0.05, seed=12)
def _(S):
    S.paper('Paper002', 0.35)
    S.text('Nobody:', 'barlowx', 34, 40, 84, INK)
    S.text('Me at 3 a.m. in the back lane:', 'barlowx', 34, 40, 140, INK)
    S.photo('ph:rainy_lane', 40, 172, 520, 380, f=(0.5, 0.55, 1.05), sat=0.85)
    S.text('“Just one more turn.”', 'serif', 46, 300, 640, INK, anchor='c')
    S.rect(40, 672, 300, 2, INK)
    S.para('Rain, no umbrella, last coin in hand. The capsule machines never close.', 'barlows', 18, 40, 712, 300, INK, lead=1.0)
    S.toy('tsuppari/niwatori', 470, 800, 230)
    S.text(FOOT, 'barlows', 12, 40, 830, INK, track=0.2)


@design(PROMO, 'promo:expect', P, paper='Paper001', fade=0.05, seed=13)
def _(S):
    S.rect(0, 0, 600, 54, INK); S.text('EXPECTATION', 'barlowx', 26, 300, 38, CREAM, track=0.42, anchor='c')
    S.photo(oi('gumballs'), 0, 54, 600, 352, f=(0.5, 0.5, 1.1), sat=0.95, bright=0.9)
    S.toy('teruteru/niji', 300, 400, 300)
    S.rect(0, 406, 600, 54, RED); S.text('REALITY', 'barlowx', 26, 300, 444, CREAM, track=0.42, anchor='c')
    S.paper('Paper001', 0.3, 0, 460, 600, 388)
    for cx in (130, 300, 470): S.toy('teruteru/shito', cx, 760, 230)
    S.text('Drizzle. Again. Sixth time.', 'serif', 30, 300, 808, INK, anchor='c')
    S.text(FOOT, 'barlows', 11, 300, 836, INK, track=0.22, anchor='c')


@design(PROMO, 'promo:manager', P, paper='Paper001', fade=0.05, tape=('tl',), seed=14)
def _(S):
    S.paper('Paper001', 0.35)
    S.rect(0, 0, 600, 96, INK)
    S.text('STAFF NOTICE', 'barlowx', 34, 40, 62, CREAM, track=0.3)
    S.text('No. 1', 'barlowx', 22, 560, 60, GOLD, anchor='r')
    S.text('MEET OUR NEW', 'barlows', 22, 40, 156, INK, track=0.35)
    S.text('Store Manager', 'serif', 58, 38, 228, INK)
    S.rect(40, 262, 230, 300, INK); S.photo(oi('cat_grey'), 48, 270, 214, 284, f=(0.5, 0.42, 1.35), sat=0.9)
    rows = [('NAME', 'Mikan'), ('AGE', 'Nobody knows'), ('DUTIES', 'Naps on the counter. Checks every capsule.'), ('PAY', 'Snacks'), ('HOURS', 'Whenever she likes')]
    y = 290
    for k, v in rows:
        S.text(k, 'barlowx', 15, 296, y, RED, track=0.3)
        y = S.para(v, 'barlowx', 22, 296, y + 34, 270, INK, lead=1.0) - 4
        S.rect(296, y - 22, 264, 1.5, INK); y += 18
    S.para('Please be polite to the manager. She was here first.', 'serif', 26, 40, 636, 520, INK, lead=1.0)
    S.text(FOOT, 'barlows', 13, 40, 820, INK, track=0.22)


@design(PROMO, 'promo:itwasme', P, paper='Paper001', fade=0.05, seed=15)
def _(S):
    S.rect(0, 0, 600, 848, 0x0a0a0a)
    S.photo(oi('cat_fluffy'), 0, 110, 600, 628, f=(0.5, 0.45, 1.15), sat=0.85)
    S.text('GACHA GARAGE PRESENTS', 'barlows', 14, 300, 66, CREAM, track=0.5, anchor='c')
    S.text('What was in the capsule all along?', 'barlows', 24, 300, 618, 0xffffff, anchor='c', stroke=(0x0a0a0a, 2.5))
    S.text('It was me. Mikan.', 'barlowx', 40, 300, 690, YEL, anchor='c', stroke=(0x0a0a0a, 3))
    S.text('BUT IT WAS ME', 'bebas', 40, 300, 796, CREAM, track=0.3, anchor='c')


# ==================================================================== bake
def render(reg, only=None):
    out = {}
    for k, (size, fn, age) in reg.items():
        if only and k not in only: continue
        S = Sheet(600, round(600 * size[1] / size[0]), PAPER)
        fn(S)
        out[k] = S.finish(size, **age)
        print(' ', k)
    return out


if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--only') + 1].split(',') if '--only' in sys.argv else None
    sheets = [a for a in sys.argv[1:] if a in ('promo', 'lane')] or ['promo', 'lane']
    for name in sheets:
        reg = PROMO if name == 'promo' else LANE
        ims = render(reg, only)
        if name == 'lane' and not only:
            for k, (src, size, age) in BC.LANE.items(): ims[k] = BC.panel(src, size, age)
        out, idx = BP.pack(ims, 1024, alpha=True)
        if '--sheet' in sys.argv:
            p = sys.argv[sys.argv.index('--sheet') + 1].replace('.png', '_' + name + '.png')
            bg = Image.new('RGBA', out.size, (90, 84, 78, 255)); bg.alpha_composite(out); bg.convert('RGB').save(p); print('sheet', p, out.size)
        else:
            BP.save_sheet(name, out, idx, quality=88)
