"""posters_px.py: the posters and promo flyers, remade in the owner's gashapon-board language (scratchpad ref_gacha):
a huge chunky outlined title with a hard offset shadow, a big hero photo or toy, a line-up strip with names, price /
N types / age badges, burst stickers, flat colour fields with dots, stripes, rays and diagonal splits, little
annotation arrows with captions. ALL ENGLISH, ALL PIXEL TYPE (tools/pixprint.py), each poster its own layout.
Pictures are real photographs (credited in CREDITS.md) and the actual in-game toy renders (tools/render-toys.mjs).
Each design is drawn at its final pixel size (no resampling after the type is set) and then aged on real paper
(tools/paperkit.py). Used by tools/bake-posters.py:  DESIGNS[key] = (w, h, design(S), age options)
"""
import os
from pixprint import Sheet, text_size
from printkit import mixc

INK = 0x1c1816; PAPER = 0xfbf8f1; CREAM = 0xf3ecdc; RED = 0xd8402a; VERM = 0xe0502a; YEL = 0xffd23f; GOLD = 0xf2b42a
INDIGO = 0x1b2340; NAVY = 0x22305e; BLUE = 0x2a6ad8; GREEN = 0x2f8a4a; PINK = 0xff7aa8; SKY = 0x7cc4e8
def lp(n): return 'local:lane/' + n + '.jpg'

DESIGNS = {}
def design(key, w, h, **age):
    def deco(fn): DESIGNS[key] = (w, h, fn, age); return fn
    return deco


# ================================================================== lane: the summer festival (bon dance + fireworks)
# street-signage build: photo on a hard diagonal, the title stamped across the split, a big pixel date, a programme
# list with dot leaders, a red-and-white kohaku curtain along the foot.
@design('lane:festival:0', 158, 224, paper='Paper001', fade=0.1, streak=0.45, tape=('tl', 'tr'), crease=0.5, seed=11)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, INDIGO)
    S.photo('oi:99d0d046afd231c4@train', 0, 0, w, 112, f=(0.36, 0.45, 1.25), sat=1.0, con=1.08, clip=[(0, 0), (w, 0), (w, 86), (0, 111)])
    S.poly([(0, 111), (w, 86), (w, 91), (0, 116)], VERM)
    S.poly([(0, 116), (w, 91), (w, 93), (0, 118)], YEL)
    S.dots([(0, 118), (w, 93), (w, h - 26), (0, h - 26)], mixc(INDIGO, 0xffffff, 0.1), step=6, size=1)
    # the ribbon and the title, stamped over the split
    S.ribbon(0, 56, 76, 10, INK, notch='r')
    S.text('THE 28TH KAMIYAMA', 4, 59, 'micro5', 1, YEL)
    S.text('SUMMER', 5, 70, 'jersey15', 1, PAPER, outline=[(1, INK)], extrude=(1, 1, 3, VERM))
    S.text('FESTIVAL', 5, 92, 'jersey20', 1, YEL, outline=[(1, INK), (1, PAPER), (1, INK)], shadow=(3, 3, INK))
    # the date in big blocks, the day in a box
    b = S.text('8', 6, 132, 'ps2p', 3, YEL, outline=[(1, INK)], shadow=(2, 2, VERM))
    S.rect(b[2] + 3, b[3] - 5, 6, 6, INK); S.rect(b[2] + 4, b[3] - 4, 4, 4, YEL)
    S.text('14', b[2] + 12, 132, 'ps2p', 3, YEL, outline=[(1, INK)], shadow=(2, 2, VERM))
    S.rrect(112, 130, 38, 24, VERM, r=2, line=INK)
    S.text('SAT', 131, 134, 'silkb', 1, PAPER, anchor='mt')
    S.text('5PM-9PM', 131, 144, 'micro5', 1, PAPER, anchor='mt')
    # the programme
    y = 162
    for t, ev in [('5:00', 'NIGHT STALLS'), ('6:30', 'BON DANCE'), ('7:30', "KIDS' MIKOSHI"), ('8:30', 'FIREWORKS!')]:
        S.text(t, 7, y, 'silkb', 1, YEL)
        b = S.text(ev, w - 7, y, 'silkb', 1, PAPER, anchor='rt')
        for x in range(32, b[0] - 3, 3): S.rect(x, y + 4, 1, 1, mixc(INDIGO, 0xffffff, 0.45))
        y += 9
    # the sticker and the caption with its arrow, on the photo
    S.burst(126, 27, 27, n=13, fill=YEL, line=INK, t=2, inner=0.74, shadow=(2, 2, INK), seed=3)
    S.text('FREE', 127, 21, 'silkb', 1, RED, anchor='mm'); S.text('ENTRY!', 127, 30, 'silkb', 1, RED, anchor='mm')
    S.rrect(4, 4, 62, 11, PAPER, r=2, line=INK)
    S.text('DANCE WITH US!', 8, 7, 'micro5', 1, INK)
    S.arrow([(40, 16), (52, 22), (54, 36)], INK, t=1, head=3, outline=PAPER)
    # the foot: organisers, the red-and-white curtain
    S.rect(0, h - 26, w, 12, CREAM)
    S.text('KAMIYAMA TOWN ASSOC. & SHOPPING ST.', w // 2, h - 23, 'micro5', 1, INK, anchor='mt')
    for x in range(0, w, 10): S.rect(x, h - 14, 5, 14, VERM); S.rect(x + 5, h - 14, 5, 14, PAPER)
    S.rect(0, h - 14, w, 1, INK)


# ================================================================== lane: the nature museum's elephant (museum hall photo)
# the hero photo full bleed with annotation arrows and fact tags like a toy card, a huge stepped title, a line-up of
# the other halls as round photo insets with name tags, a zebra-stripe foot with the ticket badges.
@design('lane:zoo:0', 158, 224, paper='Paper001', fade=0.16, streak=0.4, tape=('tl', 'tr'), crease=0.6, seed=41)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, CREAM)
    S.rect(0, 0, w, 44, GREEN); S.dots((0, 0, w, 44), mixc(GREEN, 0xffffff, 0.18), step=4, size=1)
    S.photo(lp('elephant'), 0, 40, w, 100, f=(0.5, 0.55, 1.0), sat=1.0, con=1.08, clip=[(0, 52), (w, 40), (w, 140), (0, 140)])
    S.poly([(0, 50), (w, 38), (w, 41), (0, 53)], INK)
    S.rect(0, 140, w, 3, INK)
    # title: two words, the big one in arcade blocks
    S.text('BIG', 5, 6, 'ps2p', 3, YEL, outline=[(1, INK)], extrude=(1, 1, 3, INK))
    S.text('ONES!', 86, 6, 'ps2p', 1, PAPER, outline=[(1, INK)], shadow=(1, 1, INK))
    S.ribbon(84, 18, 70, 10, RED, notch='r', line=INK)
    S.text('SHIOMI MUSEUM', 87, 21, 'micro5', 1, PAPER)
    # fact tags with arrows to the elephant
    def tag(x, y, s, col=PAPER, ink=INK):
        tw, th = text_size(s, 'micro5'); S.rrect(x - 3, y - 2, tw + 6, th + 5, col, r=2, line=INK); S.text(s, x, y + 1, 'micro5', 1, ink)
        return x - 3, y - 2, x + tw + 3, y + th + 3
    tag(6, 120, 'TUSKS 1.5 M!', YEL)
    S.arrow([(26, 118), (22, 108), (24, 98)], INK, t=1, head=3, outline=PAPER)
    tag(112, 124, '6 TONNES', PAPER)
    S.arrow([(118, 122), (112, 110), (106, 100)], INK, t=1, head=3, outline=PAPER)
    S.burst(132, 64, 18, n=11, fill=YEL, line=INK, t=2, inner=0.72, shadow=(2, 2, INK), seed=5)
    S.text('LIFE', 132, 60, 'silkb', 1, RED, anchor='mm'); S.text('SIZE!', 132, 69, 'silkb', 1, RED, anchor='mm')
    # the line-up: the other halls, round photo insets on a dotted field
    S.dots((0, 143, w, 50), mixc(CREAM, INK, 0.12), step=5, size=1)
    S.text('ALSO ON SHOW', 6, 147, 'silkb', 1, INK)
    S.text('3 HALLS', w - 6, 147, 'micro5', 1, RED, anchor='rt')
    for k, (ph, nm, f) in enumerate([('giraffe', 'GIRAFFE', (0.6, 0.45, 1.25)), ('aquarium', 'CLOWNFISH', (0.5, 0.5, 1.6)), ('snow_monkeys', 'SNOW APES', (0.5, 0.4, 1.6))]):
        cx = 27 + k * 52
        S.ellipse(cx - 17, 156, 34, 34, INK)
        S.photo(lp(ph), cx - 16, 157, 32, 32, f=f, clip=_circle(cx, 173, 16))
        tw = text_size(nm, 'micro5')[0]
        S.rrect(cx - tw // 2 - 3, 186, tw + 6, 9, GREEN, r=2, line=INK); S.text(nm, cx, 188, 'micro5', 1, PAPER, anchor='mt')
    # the zebra foot with the tickets
    S.rect(0, 198, w, h - 198, PAPER); S.stripes((0, 198, w, h - 198), INK, w=4, gap=4, slope=1)
    S.rrect(5, 202, 54, 18, YEL, r=2, line=INK)
    S.text('ADULTS', 9, 205, 'micro5', 1, INK); b = S.text('600', 9, 211, 'silkb', 1, RED); S.text('YEN', b[2] + 3, b[3], 'micro5', 1, RED, anchor='lb')
    S.rrect(62, 202, 40, 18, RED, r=2, line=INK)
    S.text('KIDS', 66, 205, 'micro5', 1, PAPER); b = S.text('200', 66, 211, 'silkb', 1, PAPER); S.text('YEN', b[2] + 3, b[3], 'micro5', 1, PAPER, anchor='lb')
    S.rrect(105, 202, 48, 18, PAPER, r=2, line=INK)
    S.text('CLOSED', 129, 205, 'micro5', 1, INK, anchor='mt'); S.text('MONDAYS', 129, 212, 'micro5', 1, INK, anchor='mt')


def _circle(cx, cy, r, n=28):
    import math
    return [(cx + math.cos(i * 6.2832 / n) * r, cy + math.sin(i * 6.2832 / n) * r) for i in range(n)]


# ================================================================== promo: the kaiju-suit series (tools/render-toys.mjs)
# the 'WINNER' board: yellow sunburst, the title in the top left, the hero kaiju big with arrows and shouts, the line-up
# strip with names, the price / types badges and the shop's foot.
@design('promo:kaiju', 150, 212, paper='Paper001', fade=0.05, crease=0.35, tape=('tl', 'tr'), seed=7)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, YEL)
    S.rays((0, 0, w, 150), 100, 92, 0xffe27a, n=18, rot=0.1)
    S.text("WHO'S IN", 5, 8, 'jersey20', 1, RED, outline=[(1, INK), (2, PAPER), (1, INK)], shadow=(2, 2, INK))
    S.text('THE SUIT?', 5, 37, 'jersey20', 1, RED, outline=[(1, INK), (2, PAPER), (1, INK)], shadow=(2, 2, INK))
    kw = text_size('MONSTER SUIT FIGURE', 'micro5')[0]
    S.ribbon(0, 64, kw + 12, 10, BLUE, notch='r', line=INK)
    S.text('MONSTER SUIT FIGURE', 4, 67, 'micro5', 1, PAPER)
    # the hero and his shouts
    hb = S.toy('nakanohito', 'tanbo', 106, 146, h=86, w=84)
    S.burst(129, 74, 15, n=10, fill=RED, line=INK, t=2, inner=0.7, shadow=(2, 2, INK), seed=2)
    S.text('NEW!', 129, 74, 'silkb', 1, PAPER, anchor='mm')
    def shout(x, y, s, col=PAPER):
        tw, th = text_size(s, 'micro5'); S.rrect(x - 3, y - 2, tw + 6, th + 5, col, r=2, line=INK); S.text(s, x, y + 1, 'micro5', 1, INK)
    shout(6, 84, "SOMEONE'S INSIDE?!", PINK)
    S.arrow([(36, 92), (54, 96), (74, 90)], INK, t=1, head=3, outline=PAPER)
    shout(6, 104, 'ZIP AT THE BACK!')
    S.arrow([(30, 112), (44, 122), (66, 120)], INK, t=1, head=3, outline=PAPER)
    S.tag(6, 128, 'PADDY HYDRA', YEL)
    S.arrow([(52, 134), (60, 138), (68, 134)], INK, t=1, head=3, outline=PAPER)
    # the line-up strip
    S.rect(0, 148, w, 34, PAPER); S.rect(0, 148, w, 1, INK); S.rect(0, 181, w, 1, INK)
    names = [('mogura', 'MOLE'), ('entotsu', 'LIZARD'), ('denpa', 'MOTH'), ('hamaguri', 'CLAM'), ('tanbo', 'HYDRA'), ('kantoku', '???')]
    cw = w / len(names)
    for k, (iid, nm) in enumerate(names):
        cx = cw * (k + 0.5)
        S.toy('nakanohito', iid, cx, 172, h=21, w=cw - 3, silhouette=INK if nm == '???' else None)
        if nm == '???': S.text('?', cx, 162, 'silkb', 1, YEL, anchor='mm')
        S.text(nm, cx, 174, 'micro5', 1, RED if nm == '???' else INK, anchor='mt')
    # the foot: price, types, the shop
    S.rect(0, 182, w, h - 182, INK)
    pw = text_size('300', 'jersey15')[0] + text_size('YEN', 'micro5')[0] + 10
    S.rrect(4, 185, pw, 24, RED, r=3, line=PAPER)
    b = S.text('300', 8, 190, 'jersey15', 1, PAPER); S.text('YEN', b[2] + 2, b[3], 'micro5', 1, PAPER, anchor='lb')
    x = 4 + pw + 3
    S.rrect(x, 185, 36, 24, YEL, r=3, line=PAPER)
    b = S.text('6', x + 4, 190, 'jersey15', 1, INK); S.text('ALL', b[2] + 3, 191, 'micro5', 1, INK); S.text('TYPES', b[2] + 3, 198, 'micro5', 1, INK)
    x += 40
    S.capsule(x, 186, 11, top=RED, bot=PAPER, line=PAPER)
    S.text('GACHA', x + 14, 186, 'silkb', 1, PAPER); S.text('GARAGE', x + 14, 195, 'silkb', 1, YEL)
    S.text('BACK LANE', x + 14, 204, 'micro5', 1, PAPER)


# ================================================================== promo: the secret figures
# night photo cut by a hazard-tape diagonal, the title in gold blocks, a row of '?' silhouettes, the odds in a burst.
@design('promo:secret', 150, 212, paper='Paper001', fade=0.05, crease=0.35, tape=('tl', 'tr'), seed=9)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, INK)
    S.photo('local:milky_way.jpg', 0, 0, w, 132, f=(0.55, 0.5, 1.3), sat=1.0, con=1.1, bright=1.05, clip=[(0, 0), (w, 0), (w, 104), (0, 132)])
    tape = [(0, 132), (w, 104), (w, 116), (0, 144)]
    S.fill(tape, YEL); S.stripes(tape, INK, w=5, gap=5, slope=1)
    S.poly([(0, 131), (w, 103), (w, 104), (0, 132)], INK); S.poly([(0, 144), (w, 116), (w, 117), (0, 145)], INK)
    S.text('SUPER', 6, 8, 'jersey15', 1, PAPER, outline=[(1, INK)], shadow=(2, 2, INK))
    S.text('SECRET', 6, 28, 'jersey25', 1, GOLD, outline=[(1, INK), (1, PAPER), (1, INK)], extrude=(1, 1, 4, 0x6a4410))
    S.ribbon(0, 62, 92, 10, RED, notch='r', line=INK)
    S.text('ONE IN EVERY SERIES', 4, 65, 'micro5', 1, PAPER)
    # the revealed one: a real secret, in its gold-leaf finish? no: as it is, under a spotlight ring
    hb = S.toy('henshin', 'ryu', 114, 112, h=58, w=66)
    S.burst(30, 100, 21, n=12, fill=GOLD, line=INK, t=2, inner=0.72, shadow=(2, 2, 0x6a4410), seed=4)
    S.text('1 IN', 30, 95, 'silkb', 1, INK, anchor='mm'); S.text('500!', 30, 104, 'silkb', 1, RED, anchor='mm')
    S.tag(52, 80, 'PEN DRAGON', PAPER)
    S.arrow([(92, 91), (94, 98), (100, 96)], PAPER, t=1, head=3, outline=INK)
    # the line-up of the unknown
    S.text('WHO ELSE IS HIDING?', w // 2, 152, 'silkb', 1, YEL, anchor='mt')
    picks = [('nakanohito', 'kantoku'), ('teruteru', 'niji'), ('obakebaito', 'honmono'), ('yomise', 'ryuuguu')]
    for k, (sid, iid) in enumerate(picks):
        cx = 19 + k * 37
        S.rrect(cx - 16, 162, 32, 30, NAVY, r=3, line=GOLD)
        S.toy(sid, iid, cx, 190, h=24, w=28, silhouette=0x0a0808)
        S.text('?', cx, 177, 'silkb', 1, GOLD, anchor='mm', outline=[(1, INK)])
    S.rect(0, 195, w, h - 195, YEL); S.rect(0, 195, w, 1, INK)
    S.text('CAN YOU PULL ONE?', w // 2, 198, 'silkb', 1, INK, anchor='mt')
    S.text('ONLY AT GACHA GARAGE, BACK LANE', w // 2, 206, 'micro5', 1, RED, anchor='mt')
