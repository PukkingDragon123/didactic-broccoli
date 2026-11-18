"""posters_px.py: the lane's posters and the shop's promo posters, from one print studio (tools/pressworks.py; the
research and the palette of each piece in docs/ref/posters.md). ALL ENGLISH, ALL PIXEL TYPE, each poster drawn at
its final pixel size and then aged on real paper (tools/paperkit.py). Photographs are real (credited in CREDITS.md)
and screened in the poster's own inks; the toys are the actual in-game renders (tools/render-toys.mjs).
Used by tools/bake-posters.py:  DESIGNS[key] = (w, h, design(S), age options)
"""
from pixprint import text_size
import letterforms as LF
import pressworks as PW
from pressworks import PALETTES, mul, tint, halftone, stamp, region, imprint
import numpy as np

DESIGNS = {}
def design(key, w, h, **age):
    def deco(fn): DESIGNS[key] = (w, h, fn, age); return fn
    return deco

IMPRINT = 'ITO PRESS'


def spaced(S, s, x, y, col, face='b5', track=2, anchor='lt'):
    return S.text(s, x, y, face, 1, col, anchor=anchor, track=track)


# ================================================================== lane: the summer festival ('bon-night')
# The 1930s rail-poster lesson: one big picture, one big title, the facts in a quiet column. Real fireworks (Open
# Images) screened in marigold on a navy night; the title knocked out to the paper; the date in vermilion.
@design('lane:festival:0', 158, 224, paper='Paper001', fade=0.08, streak=0.4, tape=('tl', 'tr'), crease=0.45, seed=11)
def _(S):
    P = PALETTES['bon-night']; navy, mari, verm, pap = P['navy'], P['marigold'], P['verm'], P['paper']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, pap)
    X, Y, W, H = 6, 6, w - 12, h - 18
    S.rect(X, Y, W, H, navy)
    halftone(S, 'oi:3273e580b71afeef@validation', X, Y, W, 96, mari, T=4, f=(0.62, 0.36, 1.2), invert=True, lo=0.24, hi=0.85, gamma=0.9)
    spaced(S, 'THE 28TH KAMIYAMA', X + 6, Y + 6, pap, track=1)
    LF.word(S, 'chochin', 'SUMMER', X + 6, Y + 104, verm)
    LF.word(S, 'chochin20', 'FESTIVAL', X + 6, Y + 120, pap)
    y0 = Y + 148
    S.rect(X + 6, y0, W - 12, 1, mari)
    b = LF.word(S, 'figs', '8.14', X + 6, y0 + 6, verm)
    S.text('SAT', b[2] + 4, b[1], 'b5', 1, mari)
    S.text('FROM 5PM', X + 6, b[3] + 5, 'b5', 1, pap)
    S.text('FREE ENTRY', X + 6, b[3] + 15, 'b5', 1, verm)
    S.rect(X + 72, y0 + 6, 1, 45, tint(mari, 0.45, navy))
    y = y0 + 7
    for t, ev in [('5:00', 'STALLS'), ('6:30', 'BON DANCE'), ('7:30', 'MIKOSHI'), ('8:30', 'FIREWORKS')]:
        S.text(t, X + 78, y, 'b5', 1, mari); S.text(ev, X + 103, y + 1, 'micro5', 1, pap); y += 11
    S.text('KAMIYAMA TOWN ASSOC.', X, h - 3, 'micro5', 1, navy, anchor='lb')
    S.text(IMPRINT, X + W, h - 3, 'micro5', 1, tint(navy, 0.55), anchor='rb')


# ================================================================== lane: the museum's elephant ('specimen')
# A specimen label: an engraved Didone title, the real museum elephant as an ochre + sumi duotone, a height rule
# like a natural-history plate, the facts in a ruled table.
@design('lane:zoo:0', 158, 224, paper='Paper001', fade=0.14, streak=0.35, tape=('tl', 'tr'), crease=0.5, seed=41)
def _(S):
    P = PALETTES['specimen']; teal, ochre, sumi, pap = P['teal'], P['ochre'], P['sumi'], P['paper']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, pap)
    X, W = 8, w - 16
    S.text('SHIOMI CITY MUSEUM OF NATURE', w // 2, 9, 'micro5', 1, teal, anchor='mt', track=1)
    S.rect(X, 17, W, 1, teal)
    LF.word(S, 'didone', 'BIG ONES!', w // 2, 23, teal, anchor='mt')
    S.rect(X, 47, W, 1, teal)
    # the duotone: an ochre underprint, the real giraffe (Open Images) screened in sumi over it, a tall plate
    py, ph, pw = 53, 120, 90
    S.rect(X, py, pw, ph, ochre)
    halftone(S, 'local:lane/giraffe.jpg', X, py, pw, ph, sumi, T=4, over=True, f=(0.62, 0.45, 1.4), lo=0.2, hi=0.6, gamma=1.5, chan=(0.2, 0.3, 0.5))
    # the height rule, like a natural-history plate: hoof to horn
    rx, r0, r1 = X + pw + 4, py + 18, py + ph - 3
    S.rect(rx, r0, 1, r1 - r0 + 1, sumi)
    for k in range(0, r1 - r0 + 1, 5): S.rect(rx, r1 - k, 3 if k % 25 == 0 else 2, 1, sumi)
    S.text('5.5M', rx - 4, r0 - 2, 'micro5', 1, sumi, anchor='rb')
    # the wall label, a narrow column
    cx = X + pw + 11; cw = X + W - cx
    S.text('NO.2', cx, py, 'b5', 1, teal)
    y = py + 11
    S.rect(cx, y - 2, cw, 1, teal)
    for t, c in [('GIRAFFE', sumi), ('', None), ('GIRAFFA', tint(sumi, 0.65)), ('CAMELO-', tint(sumi, 0.65)), ('PARDALIS', tint(sumi, 0.65))]:
        if t: S.text(t, cx, y, 'micro5', 1, c)
        y += 7
    y += 4
    S.rect(cx, y, cw, 1, teal); y += 4
    S.text('ALSO', cx, y, 'micro5', 1, teal); y += 9
    for t in ['ELEPHANT', 'SNOW APES', 'CLOWN-', 'FISH']:
        S.text(t, cx, y, 'micro5', 1, sumi); y += 7
    S.text('LIFE-SIZE HALL', X, py + ph + 6, 'b5', 1, teal)
    S.text('NOW OPEN', X + W, py + ph + 6, 'b5', 1, sumi, anchor='rt')
    fy = h - 24
    S.rect(X, fy, W, 13, teal)
    S.text('ADULTS 600 YEN  KIDS 200', X + 4, fy + 4, 'micro5', 1, pap)
    S.text('CLOSED MON', X + W - 4, fy + 4, 'micro5', 1, ochre, anchor='rt')
    imprint(S, IMPRINT, tint(teal, 0.7))


# ================================================================== promo: the kaiju-suit series ('tokusatsu')
# The monster-movie sheet: a leaning title card, the city at night screened in navy across a salmon sky, the hero
# figure towering over it like a suit actor over a miniature set; the line-up on a jade band.
@design('promo:kaiju', 150, 212, paper='Paper001', fade=0.05, crease=0.35, tape=('tl', 'tr'), seed=7)
def _(S):
    P = PALETTES['tokusatsu']; sal, navy, jade, pap = P['salmon'], P['navy'], P['jade'], P['paper']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, pap)
    X, Y, W, H = 5, 5, w - 10, h - 17
    S.rect(X, Y, W, 130, sal)
    LF.word(S, 'kaiju', "WHO'S IN", X + 5, Y + 6, navy, lean=3, track=1)
    LF.word(S, 'kaiju', 'THE SUIT?', X + 5, Y + 23, navy, lean=3, track=1)
    S.text('MONSTER SUIT FIGURES', X + 6, Y + 43, 'micro5', 1, navy)
    # the city: buildings print solid navy, the lit windows and the dusk stay salmon
    halftone(S, 'local:skyline.jpg', X, Y + 84, W, 46, navy, T=4, f=(0.62, 0.28, 1.4), lo=0.08, hi=0.32)
    S.toy('nakanohito', 'tanbo', X + W * 0.7, Y + 128, h=84, w=72)
    S.text('ZIP AT', X + 6, Y + 60, 'b5', 1, navy); S.text('THE BACK!', X + 6, Y + 69, 'b5', 1, navy)
    # the line-up on jade
    by = Y + 130
    S.rect(X, by, W, 40, jade)
    names = [('mogura', 'MOLE'), ('entotsu', 'LIZARD'), ('denpa', 'MOTH'), ('hamaguri', 'CLAM'), ('tanbo', 'HYDRA'), ('kantoku', '?')]
    cw = W / 6
    for k, (iid, nm) in enumerate(names):
        cx = X + cw * (k + 0.5)
        S.toy('nakanohito', iid, cx, by + 29, h=24, w=cw - 3, silhouette=navy if nm == '?' else None)
        S.text(nm if nm != '?' else '???', cx, by + 32, 'micro5', 1, pap if nm != '?' else navy, anchor='mt')
    fy = by + 40
    S.rect(X, fy, W, Y + H - fy, navy)
    b = LF.word(S, 'figs', '300', X + 5, fy + 3, pap)
    S.text('YEN', b[2] + 3, b[1], 'b5', 1, sal)
    S.text('PER TURN', b[2] + 3, b[3], 'micro5', 1, sal, anchor='lb')
    S.text('ALL 6', X + W - 5, fy + 4, 'b5', 1, pap, anchor='rt')
    S.text('TYPES', X + W - 5, fy + 13, 'b5', 1, pap, anchor='rt')
    S.text('GACHA GARAGE, BACK LANE', X, h - 3, 'micro5', 1, navy, anchor='lb')
    S.text(IMPRINT, X + W, h - 3, 'micro5', 1, tint(navy, 0.5), anchor='rb')


# ================================================================== promo: the secret figures ('vault')
# Two inks only, plum and gold: a crate-stencil title knocked out to the paper, the real Milky Way screened in gold,
# the one secret in its true colours, the other secrets as plum shapes on a gold shelf.
@design('promo:secret', 150, 212, paper='Paper001', fade=0.05, crease=0.35, tape=('tl', 'tr'), seed=9)
def _(S):
    P = PALETTES['vault']; plum, gold, pap = P['plum'], P['gold'], P['paper']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, pap)
    X, Y, W, H = 5, 5, w - 10, h - 17
    S.rect(X, Y, W, H, plum)
    halftone(S, 'local:milky_way.jpg', X, Y, W, 132, gold, T=4, f=(0.5, 0.5, 1.2), invert=True, lo=0.2, hi=0.75, gamma=0.8)
    S.text('SUPER', w // 2, Y + 7, 'b5', 1, gold, anchor='mt', track=4)
    LF.word(S, 'stencil', 'SECRET', w // 2, Y + 17, pap, anchor='mt')
    S.toy('henshin', 'ryu', w // 2, Y + 124, h=78, w=W - 24)
    S.rect(X + 34, Y + 124, W - 68, 1, gold)
    S.text('ONE HIDES IN EVERY SERIES', w // 2, Y + 130, 'b5', 1, pap, anchor='mt')
    sy = Y + 142
    S.rect(X, sy, W, H - 142, gold)
    t = S.text('1 IN', X + 6, sy + 6, 'b5', 1, plum)
    b = LF.word(S, 'figs', '500', t[2] + 4, sy + 6, plum)
    S.text('CAN YOU', X + W - 6, b[1] + 1, 'b5', 1, plum, anchor='rt')
    S.text('PULL ONE?', X + W - 6, b[1] + 10, 'b5', 1, plum, anchor='rt')
    S.rect(X + 6, sy + 26, W - 12, 1, plum)
    sil = [('nakanohito', 'kantoku'), ('teruteru', 'niji'), ('obakebaito', 'honmono'), ('yomise', 'ryuuguu'), ('kaden', 'shika'), ('kabuki', 'jishi')]
    for k, (sid, iid) in enumerate(sil):
        S.toy(sid, iid, X + W * (k + 0.5) / len(sil), Y + H - 3, h=21, w=W / len(sil) - 4, silhouette=plum)
    S.text('GACHA GARAGE, BACK LANE', X, h - 3, 'micro5', 1, plum, anchor='lb')
    S.text(IMPRINT, X + W, h - 3, 'micro5', 1, tint(plum, 0.5), anchor='rb')
