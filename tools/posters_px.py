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


def framed(S, ref, x, y, w, h, f=(0.5, 0.5, 1.0), rim=0xffffff, t=2, sat=1.15, con=1.08, bright=1.04, ink=None):
    """A real photo in full colour with a white print border (and an optional thin ink line round it)."""
    if ink is not None: S.rect(x - t - 1, y - t - 1, w + 2 * t + 2, h + 2 * t + 2, ink)
    S.rect(x - t, y - t, w + 2 * t, h + 2 * t, rim)
    S.photo(ref, x, y, w, h, f=f, sat=sat, con=con, bright=bright)


def badge(S, x, y, w, h, fill, line, r=2):
    S.rrect(x, y, w, h, fill, r=r, line=line)


def tag(S, s, x, y, fill, ink, line=None, face='b5', anchor='lt'):
    return S.tag(x, y, s, fill=fill, ink=ink, line=line if line is not None else fill, face=face, anchor=anchor, pad=2)


# ================================================================== lane: the summer festival (board: KANIKAN red card)
# Red field, the real bon-dance photo big and full colour, a lantern-lettered logo in lemon with a white die-cut
# border, the fireworks as a white-framed snapshot, the date and programme in white.
@design('lane:festival:0', 158, 224, paper='Paper001', fade=0.04, streak=0.3, tape=('tl', 'tr'), crease=0.35, seed=11)
def _(S):
    P = PW.BOARD['kanikan']; red, wh, lem, ink = P['red'], P['white'], P['lemon'], P['ink']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, wh); S.rect(3, 3, w - 6, h - 6, red)
    S.photo('oi:99d0d046afd231c4@train', 3, 3, w - 6, 112, f=(0.4, 0.42, 1.2), sat=1.2, con=1.08, bright=1.08)
    tag(S, 'THE 28TH KAMIYAMA', 8, 8, wh, red)
    LF.word(S, 'chochin', 'SUMMER', 9, 92, wh, border=(2, ink), bounce=[0, -1, 0, 1, 0, -1])
    LF.word(S, 'chochin20', 'FESTIVAL', 8, 108, lem, border=(2, wh), bounce=[0, 1, 0, -1, 0, 1, 0, -1])
    b = LF.word(S, 'figs', '8.14', 9, 140, wh)
    tag(S, 'SAT', b[2] + 4, b[1], lem, red)
    S.text('FROM 5PM', b[2] + 4, b[1] + 11, 'b5', 1, wh)
    y = 164
    for t, ev in [('5:00', 'STALLS'), ('6:30', 'BON DANCE'), ('7:30', 'MIKOSHI')]:
        S.text(t, 9, y, 'b5', 1, lem); S.text(ev, 36, y, 'b5', 1, wh); y += 10
    framed(S, 'oi:3273e580b71afeef@validation', 100, 140, 50, 44, f=(0.62, 0.4, 1.3))
    tag(S, '8:30 FIREWORKS!', 125, 188, lem, red, face='micro5', anchor='mt')
    S.rect(3, h - 20, w - 6, 17, lem)
    S.text('FREE ENTRY', 8, h - 15, 'b5', 1, red)
    S.text('KAMIYAMA TOWN ASSOC.', w - 8, h - 14, 'micro5', 1, ink, anchor='rt')


# ================================================================== lane: the museum (board: PIPE OTTER sky card)
# Sky-blue field, a heavy leaf-green logo in a white border, the real elephant in the museum hall big and full
# colour, three more halls as framed snapshots with green name tags.
@design('lane:zoo:0', 158, 224, paper='Paper001', fade=0.05, streak=0.3, tape=('tl', 'tr'), crease=0.35, seed=41)
def _(S):
    P = PW.BOARD['pipe-otter']; grn, sky, wh, lem, ink = P['green'], P['sky'], P['white'], P['lemon'], P['ink']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, wh); S.rect(3, 3, w - 6, h - 6, sky)
    LF.word(S, 'chochin20', 'BIG ONES!', w // 2, 9, grn, border=(2, wh), anchor='mt', bounce=[0, -1, 1, 0, 0, -1, 1, 0, -1])
    tag(S, 'SHIOMI CITY MUSEUM OF NATURE', w // 2, 37, grn, wh, face='micro5', anchor='mt')
    framed(S, 'local:lane/elephant.jpg', 8, 52, w - 16, 92, f=(0.45, 0.5, 1.05))
    tag(S, 'LIFE SIZE!', 12, 56, lem, ink, line=ink)
    tag(S, 'TUSKS 1.5 M', w - 12, 134, wh, ink, line=ink, face='micro5', anchor='rb')
    for k, (ph, nm, f) in enumerate([('giraffe', 'GIRAFFE', (0.6, 0.45, 1.3)), ('aquarium', 'CLOWNFISH', (0.5, 0.5, 1.5)), ('snow_monkeys', 'SNOW APES', (0.5, 0.4, 1.4))]):
        x = 9 + k * 48
        framed(S, 'local:lane/%s.jpg' % ph, x, 153, 44, 34, f=f)
        tag(S, nm, x + 22, 190, grn, wh, face='micro5', anchor='mt')
    S.rect(3, h - 22, w - 6, 19, grn)
    S.text('ADULTS 600 YEN  KIDS 200', 8, h - 18, 'b5', 1, wh)
    S.text('CLOSED MONDAYS', 8, h - 10, 'micro5', 1, lem)


# ================================================================== promo: the kaiju-suit series (POSTER-5: the toys in action)
# Comic Ben-Day dots for a theme, a two-panel split: the suit unzipped to show who's inside (focus lines, ZIP!), the
# monster stomping (speed lines, STOMP!), the leaning title-card logo in a white die-cut border, the line-up in
# action poses, the badges.
import comickit as CK
def _pose(sid, iid, n):
    import os
    from pixprint import TOYS
    return 'pose/%s_%d' % (iid, n) if os.path.exists(os.path.join(TOYS, sid, 'pose', '%s_%d.png' % (iid, n))) else iid


@design('promo:kaiju', 150, 212, paper='Paper001', fade=0.03, crease=0.3, tape=('tl', 'tr'), seed=7)
def _(S):
    P = PW.BOARD['tako-winner']; lem, org, red, cr, ink = P['lemon'], P['orange'], P['red'], P['cream'], 0x2a262d
    WH = 0xffffff; w, h = S.w, S.h
    S.rect(0, 0, w, h, WH)
    CK.pattern(S, 'bendots', (3, 3, w - 6, h - 6), [lem, 0xf6c21a])
    pa = [(8, 44), (w - 8, 44), (w - 8, 76), (8, 104)]
    pb = [(8, 110), (w - 8, 82), (w - 8, 132), (8, 132)]
    CK.panel(S, pa, 0x43a7d0, ink); CK.focus(S, pa, 46, 82, WH, n=40, r0=16, seed=3)
    CK.panel(S, pb, red, ink); CK.speed(S, pb, org, seed=4)
    S.toy('nakanohito', _pose('nakanohito', 'tanbo', 0), 44, 106, h=60, w=56, outline=(2, WH))
    S.toy('nakanohito', _pose('nakanohito', 'tanbo', 2), 106, 134, h=66, w=60, outline=(2, WH))
    LF.word(S, 'kaiju', "WHO'S IN", 7, 6, org, border=(2, WH), lean=3, track=1)
    LF.word(S, 'kaiju', 'THE SUIT?', 7, 23, red, border=(2, WH), lean=3, track=1)
    LF.word(S, 'boom', 'ZIP!', w - 10, 50, lem, anchor='rt', border=(1, ink), lean=3, bounce=[0, -1, 1, 0])
    LF.word(S, 'boom', 'STOMP!', 12, 112, lem, border=(1, ink), lean=3, bounce=[0, 1, -1, 0, 1, -1])
    by = 138
    CK.panel(S, [(7, by), (w - 7, by), (w - 7, by + 40), (7, by + 40)], WH, ink, g=1, t=1)
    names = [('mogura', 'MOLE'), ('entotsu', 'LIZARD'), ('denpa', 'MOTH'), ('hamaguri', 'CLAM'), ('tanbo', 'HYDRA'), ('kantoku', 'SECRET')]
    cw = (w - 14) / 6
    for k, (iid, nm) in enumerate(names):
        cx = 7 + cw * (k + 0.5)
        S.toy('nakanohito', _pose('nakanohito', iid, 1 if k % 2 else 0), cx, by + 31, h=28, w=cw - 1, silhouette=ink if nm == 'SECRET' else None)
        if nm == 'SECRET': LF.word(S, 'figs', '?', cx, by + 6, lem, anchor='mt', border=(1, ink))
        tag(S, '???' if nm == 'SECRET' else nm, cx, by + 32, red if nm == 'SECRET' else org, WH, face='micro5', anchor='mt')
    fy = by + 45
    badge(S, 6, fy, 61, 24, WH, ink)
    b = LF.word(S, 'figs', '300', 10, fy + 4, red)
    S.text('YEN', b[2] + 2, b[1], 'b5', 1, red); S.text('A TURN', b[2] + 2, b[1] + 10, 'micro5', 1, ink)
    badge(S, 70, fy, 40, 24, red, ink)
    n = LF.word(S, 'figs', '6', 74, fy + 4, WH)
    S.text('ALL', n[2] + 3, fy + 5, 'micro5', 1, WH); S.text('TYPES', n[2] + 3, fy + 13, 'micro5', 1, WH)
    badge(S, 113, fy, 31, 24, WH, ink)
    S.text('AGES', 128, fy + 4, 'micro5', 1, ink, anchor='mt'); S.text('15+', 128, fy + 13, 'b5', 1, ink, anchor='mt')


# ================================================================== promo: the secret figures (board: LIVING DEAD PUDDING teal card)
# Teal field, the real Milky Way big and full colour, the dragon secret in front of it, a stencil logo in yellow with
# a white border, the other secrets as silhouettes on sky blue, the odds on a yellow badge.
@design('promo:secret', 150, 212, paper='Paper001', fade=0.03, crease=0.3, tape=('tl', 'tr'), seed=9)
def _(S):
    P = PW.BOARD['pudding']; teal, yel, sky, wh, ink, red = P['teal'], P['yellow'], P['sky'], P['white'], P['ink'], P['red']
    w, h = S.w, S.h
    S.rect(0, 0, w, h, wh); S.rect(3, 3, w - 6, h - 6, teal)
    framed(S, 'local:milky_way.jpg', 8, 44, w - 16, 84, f=(0.5, 0.5, 1.15), sat=1.25, bright=1.15)
    tag(S, 'SUPER', w // 2, 7, red, wh, anchor='mt')
    LF.word(S, 'stencil', 'SECRET', w // 2, 18, yel, border=(2, wh), anchor='mt')
    S.toy('henshin', 'ryu', w // 2, 132, h=82, w=w - 30)
    tag(S, 'ONE HIDES IN EVERY SERIES!', w // 2, 136, wh, ink, line=ink, face='micro5', anchor='mt')
    sy = 152
    S.rect(3, sy, w - 6, 36, sky)
    sil = [('nakanohito', 'kantoku'), ('teruteru', 'niji'), ('obakebaito', 'honmono'), ('yomise', 'ryuuguu'), ('kaden', 'shika')]
    for k, (sid, iid) in enumerate(sil):
        cx = 6 + (w - 12) * (k + 0.5) / len(sil)
        S.toy(sid, iid, cx, sy + 33, h=28, w=(w - 12) / len(sil) - 4, silhouette=ink)
        S.text('?', cx, sy + 18, 'b5', 1, yel, anchor='mm')
    badge(S, 8, sy + 39, 70, 18, yel, ink)
    t = S.text('1 IN', 13, sy + 45, 'b5', 1, ink)
    LF.word(S, 'figs', '500', t[2] + 3, sy + 40, red) if False else S.text('500', t[2] + 4, sy + 45, 'b5', 1, red)
    S.text('CAN YOU PULL ONE?', w - 8, sy + 42, 'micro5', 1, wh, anchor='rt')
    S.text('GACHA GARAGE', w - 8, sy + 50, 'micro5', 1, yel, anchor='rt')
