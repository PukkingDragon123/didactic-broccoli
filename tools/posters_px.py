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
from lettering import logo, emblem
from printkit import mixc

INK = 0x1c1816; PAPER = 0xfbf8f1; CREAM = 0xf3ecdc; RED = 0xd8402a; VERM = 0xe0502a; YEL = 0xffd23f; GOLD = 0xf2b42a
INDIGO = 0x1b2340; NAVY = 0x22305e; BLUE = 0x2a6ad8; GREEN = 0x2f8a4a; PINK = 0xff7aa8; SKY = 0x7cc4e8
def lp(n): return 'local:lane/' + n + '.jpg'

DESIGNS = {}
def design(key, w, h, **age):
    def deco(fn): DESIGNS[key] = (w, h, fn, age); return fn
    return deco


# ================================================================== lane: the summer festival (bon dance + fireworks)
# photo on a hard diagonal, the hand-lettered title (the I a paper lantern) across the split, the date, a plain
# programme, a red-and-white curtain along the foot.
@design('lane:festival:0', 158, 224, paper='Paper001', fade=0.1, streak=0.45, tape=('tl', 'tr'), crease=0.5, seed=11)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, INDIGO)
    S.photo('oi:99d0d046afd231c4@train', 0, 0, w, 116, f=(0.36, 0.45, 1.25), sat=1.0, con=1.08, clip=[(0, 0), (w, 0), (w, 92), (0, 115)])
    S.poly([(0, 115), (w, 92), (w, 96), (0, 119)], VERM)
    S.text('THE 28TH KAMIYAMA', 6, 6, 'micro5', 1, PAPER)
    logo(S, 'fest', 'SUMMER', 6, 70, 1, PAPER, outline=None, shadow=(1, 1, INK), bounce=[0, -1, 0, 1, 0, -1], track=1)
    logo(S, 'fest', 'FESTIVAL', 4, 92, 1, YEL, accent=VERM, shadow=(1, 1, INK), bounce=[1, 0, -1, 0, 1, 0, -1, 0], track=0)
    S.text('AUGUST 14 SAT', 8, 134, 'silkb', 1, YEL)
    S.text('FROM 5 PM, RAIN OR SHINE', 8, 144, 'micro5', 1, mixc(PAPER, INDIGO, 0.25))
    y = 160
    for t, ev in [('5:00', 'NIGHT STALLS'), ('6:30', 'BON DANCE'), ('7:30', "KIDS' MIKOSHI"), ('8:30', 'FIREWORKS')]:
        S.text(t, 8, y, 'micro5', 1, YEL); S.text(ev, 32, y, 'micro5', 1, PAPER); y += 9
    S.roundel(128, 168, 17, fill=YEL, line=INK, t=1)
    S.text('FREE', 128, 164, 'silkb', 1, RED, anchor='mm'); S.text('ENTRY', 128, 173, 'micro5', 1, INK, anchor='mm')
    S.text('KAMIYAMA TOWN ASSOC.', w // 2, h - 22, 'micro5', 1, mixc(PAPER, INDIGO, 0.25), anchor='mt')
    for x in range(0, w, 10): S.rect(x, h - 12, 5, 12, VERM); S.rect(x + 5, h - 12, 5, 12, PAPER)


# ================================================================== lane: the museum's elephant (museum hall photo)
# a slab-serif headline on a flat green block, the elephant big with two fact tags, the other halls as round insets.
@design('lane:zoo:0', 158, 224, paper='Paper001', fade=0.16, streak=0.4, tape=('tl', 'tr'), crease=0.6, seed=41)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, CREAM)
    S.rect(0, 0, w, 46, GREEN)
    logo(S, 'slab', 'BIG', 6, 8, 1, YEL, accent=PAPER, shadow=(1, 1, INK), track=1)
    logo(S, 'slab', 'ONES!', 64, 8, 1, PAPER, accent=PAPER, accent2=INK, shadow=(1, 1, INK), track=0, lift={1: 1, 3: -1})
    S.photo(lp('elephant'), 0, 46, w, 100, f=(0.5, 0.55, 1.0), sat=1.0, con=1.08)
    S.rect(0, 146, w, 1, INK)
    S.tag(6, 128, 'TUSKS 1.5 M', YEL)
    S.arrow([(24, 126), (24, 116), (30, 108)], INK, t=1, head=3)
    S.text('SHIOMI CITY MUSEUM OF NATURE', 6, 152, 'micro5', 1, INK)
    for k, (ph, nm, f) in enumerate([('giraffe', 'GIRAFFE', (0.6, 0.45, 1.25)), ('aquarium', 'CLOWNFISH', (0.5, 0.5, 1.6)), ('snow_monkeys', 'SNOW APES', (0.5, 0.4, 1.6))]):
        cx = 27 + k * 52
        S.ellipse(cx - 16, 162, 32, 32, INK)
        S.photo(lp(ph), cx - 15, 163, 30, 30, f=f, clip=_circle(cx, 178, 15))
        S.text(nm, cx, 197, 'micro5', 1, INK, anchor='mt')
    S.rect(0, 208, w, h - 208, INK)
    S.text('ADULTS 600 YEN  KIDS 200 YEN', 6, 211, 'micro5', 1, PAPER)
    S.text('CLOSED MONDAYS', 6, 218, 'micro5', 1, YEL)


def _circle(cx, cy, r, n=28):
    import math
    return [(cx + math.cos(i * 6.2832 / n) * r, cy + math.sin(i * 6.2832 / n) * r) for i in range(n)]


# ================================================================== promo: the kaiju-suit series (tools/render-toys.mjs)
# the yellow board: a drippy monster-movie logotype (the ? hangs a zip pull), the hero kaiju big with one shout, the
# line-up strip with names, price and the shop's foot.
@design('promo:kaiju', 150, 212, paper='Paper001', fade=0.05, crease=0.35, tape=('tl', 'tr'), seed=7)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, YEL)
    S.rays((0, 0, w, 148), 104, 100, 0xffe27a, n=14, rot=0.1)
    logo(S, 'kaiju', "WHO'S IN", 6, 8, 1, RED, outline=(1, INK), track=0, bounce=[0, 1, -1, 0, 0, 0, 1, 0])
    logo(S, 'kaiju', 'THE SUIT?', 6, 34, 1, RED, accent=INK, outline=(1, INK), track=0, bounce=[1, 0, 0, 0, -1, 0, 1, 0, 0])
    S.text('MONSTER SUIT FIGURES', 7, 62, 'micro5', 1, INK)
    S.toy('nakanohito', 'tanbo', 104, 146, h=82, w=84)
    S.tag(6, 104, 'ZIP AT THE BACK!', PAPER)
    S.arrow([(40, 112), (52, 122), (66, 118)], INK, t=1, head=3)
    S.rect(0, 148, w, 34, PAPER); S.rect(0, 148, w, 1, INK); S.rect(0, 181, w, 1, INK)
    names = [('mogura', 'MOLE'), ('entotsu', 'LIZARD'), ('denpa', 'MOTH'), ('hamaguri', 'CLAM'), ('tanbo', 'HYDRA'), ('kantoku', '???')]
    cw = w / len(names)
    for k, (iid, nm) in enumerate(names):
        cx = cw * (k + 0.5)
        S.toy('nakanohito', iid, cx, 172, h=21, w=cw - 3, silhouette=INK if nm == '???' else None)
        S.text(nm, cx, 174, 'micro5', 1, RED if nm == '???' else INK, anchor='mt')
    S.rect(0, 182, w, h - 182, INK)
    b = S.text('300', 8, 188, 'jersey15', 1, YEL); S.text('YEN  ALL 6 TYPES', b[2] + 3, b[3], 'micro5', 1, PAPER, anchor='lb')
    emblem(S, 'gg', w - 17, 187, RED)
    S.text('GACHA GARAGE, BACK LANE', 8, 205, 'micro5', 1, mixc(PAPER, INK, 0.3))


# ================================================================== promo: the secret figures
# night photo cut by a hazard-tape diagonal, a tall condensed logotype (its C a split capsule), one revealed secret,
# a row of silhouettes.
@design('promo:secret', 150, 212, paper='Paper001', fade=0.05, crease=0.35, tape=('tl', 'tr'), seed=9)
def _(S):
    w, h = S.w, S.h
    S.rect(0, 0, w, h, INK)
    S.photo('local:milky_way.jpg', 0, 0, w, 132, f=(0.55, 0.5, 1.3), sat=1.0, con=1.1, bright=1.05, clip=[(0, 0), (w, 0), (w, 104), (0, 132)])
    tape = [(0, 132), (w, 104), (w, 116), (0, 144)]
    S.fill(tape, YEL); S.stripes(tape, INK, w=5, gap=5, slope=1)
    logo(S, 'tall', 'SUPER', 8, 6, 1, PAPER, track=1)
    logo(S, 'tall', 'SECRET', 6, 32, 2, GOLD, accent=RED, shadow=(1, 1, 0x6a4410), track=0, bounce=[0, 0, 0, 0, 0, 0])
    S.text('ONE IN EVERY SERIES', 8, 82, 'micro5', 1, PAPER)
    S.toy('henshin', 'ryu', 112, 112, h=58, w=66)
    S.roundel(30, 110, 16, fill=GOLD, line=INK, t=1)
    S.text('1 IN', 30, 106, 'micro5', 1, INK, anchor='mm'); S.text('500', 30, 114, 'silkb', 1, RED, anchor='mm')
    S.text('WHO ELSE IS HIDING?', 8, 154, 'silkb', 1, YEL)
    for k, (sid, iid) in enumerate([('nakanohito', 'kantoku'), ('teruteru', 'niji'), ('obakebaito', 'honmono'), ('yomise', 'ryuuguu')]):
        S.toy(sid, iid, 22 + k * 36, 192, h=26, w=30, silhouette=NAVY)
    S.text('ONLY AT GACHA GARAGE, BACK LANE', 8, 201, 'micro5', 1, mixc(PAPER, INK, 0.3))
