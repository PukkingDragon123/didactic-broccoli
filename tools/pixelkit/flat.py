"""Hand-pixelled flat paper items for the pixel kit (after docs/ref/pixel/ticket_punch.jpg):
train ticket + punch animation, prize ticket, raffle strip, receipt, stamp card (stamp lands), banknotes.
Fine 1 px print strokes and kana-like marks, faded inks, worn rubber stamps, irregular paper edges."""
import math
import numpy as np
from pk import *

PAPER = ramp('#93654a', '#b8875f', '#d6aa7f', '#e8c69b', '#f4dcb9', '#fcefd8')
PAPER_OL = C('#4a2a22')
INK, INK2 = C('#2b2f4c'), C('#545b86')  # printed navy, faded
RED = ramp('#6c2420', '#9b3a2b', '#bd583c')
PURP, PURP2 = C('#5f4b8f'), C('#8b78b6')
STEEL = ramp('#3c414f', '#5d6475', '#858d9d', '#aab2bf', '#cdd3db', '#eef1f4')
STEEL_OL = C('#262833')
GRIP = ramp('#1f100b', '#341b12', '#4b291b', '#633826', '#7b4a32')
GRIP_OL = C('#140906')
BRASS = ramp('#4f3417', '#8a5f22', '#c0902f', '#e6c35a', '#fbeaa0')
BRASS_OL = C('#33200e')

KANA = {  # tiny kana-like print marks, 3x4, 1 px strokes
    'mi': ["XX.", "..X", "XX.", "..X"], 'ka': [".X.", "XXX", ".XX", "X.X"], 'wa': ["XXX", "X.X", "..X", ".X."],
    'ga': [".XX", "XXX", ".X.", "X.."], 're': ["X..", "X..", "X.X", "XX."], 'ji': ["X.X", "..X", ".X.", "X.."],
    'shi': ["X..", ".X.", "..X", "XX."], 'yo': ["XXX", "..X", ".XX", "XXX"], 'ki': [".X.", "XXX", "XXX", ".X."],
    'to': ["X..", "XX.", "X..", "X.."], 'ko': ["XXX", "..X", "..X", "XXX"], 'na': [".X.", "XXX", ".X.", "X.."],
}


def kana(a, seq, x, y, c, gap=1):
    for k in seq:
        stamp(a, KANA[k], {'X': c}, x, y)
        x += 3 + gap
    return x


def paper_from_mask(m, pr, ol, thick=1):
    """Fill a paper shape: dark coloured outline on the edge, lit top/left lip, shaded bottom thickness."""
    H, W = m.shape
    a = blank(W, H)
    a[m] = pr[3]
    inside = lambda y, x: 0 <= y < H and 0 <= x < W and m[y, x]
    for y in range(H):
        for x in range(W):
            if not m[y, x]:
                continue
            if not all(inside(y + dy, x + dx) for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0))):
                a[y, x] = ol
            elif not inside(y - 2, x) or not inside(y, x - 2):
                a[y, x] = pr[4]
            elif not all(inside(y + k, x) for k in range(1, thick + 2)):
                a[y, x] = pr[1]
            elif not inside(y, x + 2):
                a[y, x] = pr[2]
    return a


def wobbly_rect(W, H, dips=(), bumps=()):
    m = np.ones((H, W), bool)
    for x, y in ((0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1)):
        m[y, x] = False
    for x, y in dips:
        m[y, x] = False
    return m


# ======================= train ticket ====================================================
LOCO = ["......XXX...",
        ".X.....X.X..",
        "XXX.XXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".o.o.oo..oo."]


def ticket(notch=False):
    W, H = 48, 24
    m = wobbly_rect(W, H, dips=((9, 0), (10, 0), (31, 0), (0, 8), (47, 5), (22, 23), (23, 23), (38, 23)))
    if notch:  # the conductor's punch bite on the right edge
        for x, y in ((47, 12), (47, 13), (47, 14), (47, 15), (47, 16), (46, 13), (46, 14), (46, 15), (45, 14)):
            m[y, x] = False
    a = paper_from_mask(m, PAPER, PAPER_OL)
    for x, y in ((7, 13), (8, 13), (26, 2), (13, 20), (14, 20), (30, 17), (22, 10), (41, 19), (6, 19), (34, 2), (17, 15)):
        if (a[y, x] == PAPER[3]).all():
            put(a, x, y, PAPER[2])
    # print border, worn
    for x in range(3, 45):
        if x not in (12, 13, 29):
            put(a, x, 3, INK2)
        if x not in (10, 36, 37):
            put(a, x, 19, INK2)
    for y in range(3, 20):
        if y not in (13,):
            put(a, 3, y, INK2)
        if y != 7:
            put(a, 44, y, INK2)
    # red fare band
    for y in range(4, 19):
        put(a, 33, y, RED[2]); hline(a, 34, 36, y, RED[1]); put(a, 37, y, RED[0])
    for x, y in ((35, 10), (36, 11), (35, 12)):
        put(a, x, y, PAPER[4])
    put(a, 34, 6, RED[2]); put(a, 36, 16, RED[0]); put(a, 34, 15, RED[0])
    # locomotive on its rails
    stamp(a, LOCO, {'X': INK, 'o': INK2}, 5, 5)
    hline(a, 7, 10, 7, INK2); put(a, 1 + 5, 6, INK2)
    for x in range(4, 18):
        put(a, x, 11, INK2 if x % 3 else INK)
    # station kana, arrow to the destination
    kana(a, ['mi', 'ka', 'wa'], 19, 5, INK)
    hline(a, 19, 30, 10, INK2); put(a, 29, 9, INK2); put(a, 29, 11, INK2)
    # second line: kana + fare digits
    kana(a, ['ga', 're', 'ji'], 5, 13, INK2)
    text3(a, '120', 18, 13, INK)
    put(a, 17, 15, INK2)
    hline(a, 5, 19, 17, INK2)
    # purple rubber date stamp (oval, worn)
    oval = ["..XXXXXXXXX..", ".X.........X.", "X...........X", "X...........X", "X...........X", ".X.........X.", "..XXXXXXXXX.."]
    stamp(a, oval, {'X': PURP2}, 19, 13)
    text3(a, 'S57', 20, 14, PURP)
    for x, y in ((22, 13), (27, 19), (31, 15), (20, 16), (24, 15), (19, 15)):
        if m[y, x]:
            put(a, x, y, PAPER[3])
    # stub: route kana, punch guide
    stamp(a, KANA['ki'], {'X': INK}, 39, 5)
    for x, y in ((40, 10), (39, 11), (41, 11), (40, 12)):
        put(a, x, y, INK2)
    text3(a, '7', 39, 14, INK)
    return a


def chip():
    a = blank(4, 5)
    for x, y in ((1, 1), (2, 1), (1, 2), (2, 2), (1, 3)):
        put(a, x, y, PAPER[3])
    put(a, 1, 1, PAPER[4]); put(a, 2, 2, PAPER[2])
    return outline(a, PAPER_OL)


def arm(W, H, piv, ang, jaw, hdl, grip0, dark=0):
    a = blank(W, H)
    steel = np.zeros((H, W), bool)
    dx, dy = math.cos(ang), math.sin(ang)
    for y in range(H):
        for x in range(W):
            px, py = x + 0.5 - piv[0], y + 0.5 - piv[1]
            l, p = px * dx + py * dy, -px * dy + py * dx
            if -jaw <= l <= grip0 + 0.5:
                hw = 1.55
                if l < -jaw + 3.5:
                    hw = 2.1  # the chunky die head
                if abs(l) < 2.6:
                    hw = 2.1
                if abs(p) <= hw:
                    k = 4 if p < -0.6 else (3 if p < 0.5 else 1)
                    if p < -0.6 and -jaw + 3.5 < l < -2.5 and int(l) % 4 != 0:
                        k = 5
                    if l < -jaw + 1.2:
                        k = min(k, 2)
                    a[y, x] = STEEL[max(0, k - dark)]
                    steel[y, x] = True
            elif grip0 < l <= hdl:
                hw = 2.1 if l < hdl - 1.2 else 1.3
                if abs(p) <= hw:
                    k = 3 if p < -1.0 else (2 if p < 0.0 else (1 if p < 1.0 else 0))
                    if int(l - grip0) % 3 == 2:
                        k = max(0, k - 1)
                    if p < -1.0 and int(l) % 4 == 1:
                        k = 4
                    a[y, x] = GRIP[max(0, k - dark)]
    outline(a, GRIP_OL)
    o2 = outline(np.zeros_like(a), STEEL_OL, mask=steel)
    a[(o2[..., 3] > 0)] = STEEL_OL
    return a


def rivet(a, cx, cy):
    pts = {(-1, -1): 4, (0, -1): 3, (-1, 0): 3, (0, 0): 2, (1, -1): 2, (-1, 1): 2, (1, 0): 1, (0, 1): 1, (1, 1): 0}
    for (dx, dy), k in pts.items():
        put(a, cx + dx, cy + dy, BRASS[k])
    for dx, dy in ((-2, -1), (-2, 0), (-2, 1), (2, -1), (2, 0), (2, 1), (-1, -2), (0, -2), (1, -2), (-1, 2), (0, 2), (1, 2)):
        put(a, cx + dx, cy + dy, BRASS_OL)


def punch(W, H, piv, opening):
    a = blank(W, H)
    over(a, arm(W, H, piv, -opening, 10, 25, 8, dark=1), 0, 0)
    over(a, arm(W, H, piv, opening, 10, 25, 8), 0, 0)
    rivet(a, int(piv[0]), int(piv[1]))
    return a


def tilt(t, k):
    """Pixel tilt: columns stepped down towards the right (k px over the width)."""
    if not k:
        return t
    H, W = t.shape[:2]
    o = blank(W, H + k)
    for x in range(W):
        d = int(k * x / W + 0.5) if k > 0 else 0
        o[d:d + H, x] = t[:, x]
    return o


def ticket_punch():
    W, H = 88, 34
    tx, ty = 2, 5
    hx, hy = tx + 46, ty + 14  # bite centre
    seq = [(24, 0.21, 0, False, None), (0, 0.21, 1, False, None), (0, 0.04, 2, False, None),
           (0, 0.21, 1, True, 3), (12, 0.21, 0, True, 9), (None, 0, 0, True, None)]
    frames = []
    for pdx, op, tl, notch, ch in seq:
        f = blank(W, H)
        over(f, tilt(ticket(notch), tl), tx, ty)
        if ch is not None:
            over(f, chip(), hx - 1, hy - 2 + ch + tl)
        if pdx is not None:
            over(f, punch(W, H, (hx + 10.5 + pdx, hy + 0.5 + tl), op), 0, 0)
        frames.append(f)
    return frames


# ======================= prize ticket ====================================================
ORANGE = ramp('#7a2a18', '#a8401f', '#cc5a2a', '#e57c3c', '#f3a35a', '#fbc98a')
CREAM = ramp('#8a7458', '#b09676', '#cdb492', '#e4d0ad', '#f2e4c8', '#fcf5e6')


def prize_ticket():
    W, H = 44, 22
    m = wobbly_rect(W, H, dips=((16, 0), (40, 21)))
    for y in range(1, H - 1, 3):  # zig-zag tear on the stub end
        m[y, W - 1] = False
    a = paper_from_mask(m, CREAM, C('#40180f'))
    for y in range(2, 8):  # orange header band
        for x in range(2, 33):
            a[y, x] = ORANGE[3] if y > 2 else ORANGE[4]
    hline(a, 2, 32, 8, ORANGE[1])
    text3(a, 'PRIZE', 12, 3, CREAM[5])
    # capsule emblem
    cap = ["..ooooo..", ".oRRRRro.", "oRWRRRRro", "oRRRRRrro", "okkkkkkko", "oWWWWWWuo", "oWWWWWuuo", ".oWWWuuo.", "..ooooo.."]
    stamp(cap, None, None, 0, 0) if False else None
    stamp(a, cap, {'o': C('#40180f'), 'R': ORANGE[3], 'r': ORANGE[1], 'W': CREAM[5], 'u': CREAM[2], 'k': C('#40180f')}, 3, 10)
    kana(a, ['ga', 'shi', 'ya', 'ko'] if False else ['ka', 'na', 'to'], 14, 11, INK2)
    text3(a, '1', 27, 11, ORANGE[1]); stamp(a, KANA['ki'], {'X': INK2}, 29, 11)
    hline(a, 14, 31, 16, INK2)
    text3(a, 'No', 14, 18 - 1, INK) if False else None
    for x in range(14, 32, 2):
        put(a, x, 18, INK2)
    # perforation + stub
    for y in range(2, H - 2, 2):
        a[y, 34] = 0
    for y in range(2, H - 2):
        if (a[y, 33, 3] and not (a[y, 33] == PAPER_OL).all()):
            pass
    text3(a, '0', 36, 3, ORANGE[1]); text3(a, '8', 36, 9, ORANGE[1]); text3(a, '1', 36, 15, ORANGE[1])
    stamp(a, ['X.X', '.X.', 'X.X'], {'X': PURP2}, 39, 10) if False else None
    return a


# ======================= raffle strip ====================================================
MINT = ramp('#4e6a5a', '#6f8e7a', '#93b39c', '#b6d3bb', '#d6ead6', '#eef8ee')


def raffle_strip():
    W, H = 24, 45
    m = np.ones((H, W), bool)
    for x in range(W):  # torn zig-zag top and bottom
        if x % 3 == 0:
            m[0, x] = False; m[H - 1, x] = False
    m[1, 0] = m[1, W - 1] = False
    a = paper_from_mask(m, MINT, C('#22322a'))
    red, red2 = C('#a8302e'), C('#cf6a5a')
    for i, num in enumerate(('017', '018', '019')):
        y0 = 1 + i * 15
        for x in range(2, W - 2):  # inner print frame
            if x % 7 != 5:
                put(a, x, y0 + 2, red2); put(a, x, y0 + 12, red2)
        vline(a, 2, y0 + 2, y0 + 12, red2); vline(a, W - 3, y0 + 2, y0 + 12, red2)
        text3(a, 'No', 4, y0 + 4, red) if False else None
        kana(a, ['ki', 'to'], 4, y0 + 4, INK2)
        text3(a, num, 12, y0 + 4, red)
        hline(a, 4, 19, y0 + 10, INK2)
        put(a, 6 + i * 4, y0 + 10, MINT[3])
        if i < 2:  # perforation between tickets
            for x in range(0, W, 2):
                a[y0 + 14, x] = 0 if 0 < x < W - 1 else a[y0 + 14, x]
                if a[y0 + 14, x, 3] == 0:
                    put(a, x, y0 + 13, MINT[2]); put(a, x, y0 + 15, MINT[4])
    return a


# ======================= receipt =========================================================
THERM = ramp('#7f7a72', '#a7a196', '#c8c2b5', '#e2dccd', '#f0ebdf', '#fbf8f0')


def receipt():
    W, H = 30, 52
    m = np.ones((H, W), bool)
    for x in range(W):  # torn zig-zag bottom
        if x % 4 in (1, 2):
            m[H - 1, x] = False
        if x % 4 == 2:
            m[H - 2, x] = False
    m[0, 0] = m[0, W - 1] = False
    a = paper_from_mask(m, THERM, C('#2c2630'))
    ink, ink2 = C('#4b4366'), C('#857ea0')
    text3(a, 'MIKAWA', 4, 3, ink)
    kana(a, ['ko', 'na', 'shi'], 9, 9, ink2)
    for x in range(3, W - 3, 2):
        put(a, x, 14, ink2)
    items = ((['ka', 'ra'] if False else ['ka', 'ki'], '120'), (['ga', 'mi'], '80'), (['to', 'wa', 'ji'], '60'), (['yo', 're'], '40'))
    y = 17
    for ks, p in items:
        kana(a, ks, 3, y, ink2)
        text3(a, p, W - 3 - text3_w(p), y, ink)
        y += 6
    for x in range(3, W - 3, 2):
        put(a, x, y, ink2)
    y += 2
    text3(a, 'TL', 3, y, ink)
    text3(a, '¥300', W - 3 - text3_w('¥300'), y, ink)
    hline(a, W - 3 - text3_w('¥300'), W - 4, y + 6, ink)
    for i in range(14):  # barcode
        if (i * 7) % 3:
            vline(a, 7 + i, y + 9, y + 12, ink)
    vline(a, W - 3, 2, H - 4, THERM[2])  # slight curl
    return a


# ======================= stamp card (the stamp lands) ===================================
KRAFT = ramp('#7b5a3e', '#9b7752', '#ba976b', '#d3b388', '#e6cea6', '#f4e6c8')
HAN = {'k': C('#3a2214'), 'T': C('#c8945a'), 't': C('#8e5e34'), 'R': C('#b8323a'), 'r': C('#7d1f28')}
HANKO = ["..kkk..", ".kTTtk.", ".kTTtk.", "..kTk..", "..kTk..", "..kTk..", "..kTk..", ".kTTtk.", "kTTTTtk", "kTTTttk", "kRRRrrk", ".kkkkk."]
MARK = ["..XXX..", ".X...X.", "X.XXX.X", "X.X.X.X", "X.XXX.X", ".X...X.", "..XXX.."]


def stamp_card(n=7):
    W, H = 52, 32
    m = wobbly_rect(W, H, dips=((20, 0), (51, 17)))
    a = paper_from_mask(m, KRAFT, C('#3b2516'))
    red, red2 = C('#a52c34'), C('#c95a5a')
    for x in range(3, W - 3):
        if x % 9 != 4:
            put(a, x, 2, red2); put(a, x, H - 3, red2)
    text3(a, 'STAMPS', 4, 4, red)
    kana(a, ['mi', 'ka', 'wa', 'ya'] if False else ['mi', 'ka', 'wa'], 30, 5, INK2)
    for i in range(10):
        x, y = 4 + (i % 5) * 9, 11 + (i // 5) * 9
        if i < n:
            mk = MARK if i % 2 == 0 else MARK[::-1]
            stamp(a, mk, {'X': red}, x + (i % 3 == 1), y + (i % 4 == 2))
            put(a, x + 2 + (i % 2), y + 1, red2)
        else:
            for dx, dy in ((2, 0), (4, 0), (0, 2), (6, 2), (0, 4), (6, 4), (2, 6), (4, 6)):
                put(a, x + dx, y + dy, INK2)
    return a


def stamp_land():
    W, H = 52, 48
    cy = 16
    tx, ty = 4 + 2 * 9, cy + 11 + 9  # slot 7 (index 7: second row, third)
    seq = [(-15, 0, 7), (-8, 0, 7), (-1, 1, 7), (-6, 0, 8), (-15, 0, 8), (None, 0, 8)]
    frames = []
    for hy, sq, n in seq:
        f = blank(W, H)
        over(f, stamp_card(n), 0, cy)
        if hy is not None:
            hk = HANKO[:3] + HANKO[3 + sq:] if sq else HANKO
            hk_a = blank(7, len(hk))
            stamp(hk_a, hk, HAN, 0, 0)
            over(f, hk_a, tx, ty + hy - len(hk) + 8)
            if sq:
                for x0, y0, x1, y1 in ((tx - 3, ty + 4, tx - 2, ty + 4), (tx + 8, ty + 4, tx + 9, ty + 4), (tx - 2, ty, tx - 3, ty - 1), (tx + 8, ty, tx + 9, ty - 1)):
                    line(f, x0, y0, x1, y1, C('#3b2516'))
        frames.append(f)
    return frames


# ======================= banknotes =======================================================
NOTES = {
    1000: dict(paper=ramp('#7a8270', '#9da592', '#bec5b0', '#d6dcc8', '#e8ecdb', '#f6f8ee'), ink=C('#34507c'), ink2=C('#6d86ad'),
               motif=["......X......", ".....XXX.....", "....X.X.X....", "...X.....X...", "..X...X...X..", ".X...X.X...X.", "X...X...X...X", "XXXXXXXXXXXXX", "..X.X.X.X.X..", ".............", ".X.X.X.X.X.X."]),
    5000: dict(paper=ramp('#8a7476', '#ab9595', '#c9b4b0', '#ddcdc6', '#ece1da', '#f8f1ec'), ink=C('#5e3f73'), ink2=C('#9479a6'),
               motif=["....X.X....", "...XX.XX...", "..X.XXX.X..", "..XX.X.XX..", "...XXXXX...", "....XXX....", ".....X.....", "..X..X..X..", "...X.X.X...", "....XXX....", ".....X....."]),
    10000: dict(paper=ramp('#8a7550', '#ab966c', '#c9b58a', '#ddcea6', '#ece2c3', '#f8f2e0'), ink=C('#6e4a28'), ink2=C('#a6845a'),
                motif=["X...........X", "XX.........XX", ".XXX.....XXX.", "..XXXX.XXXX..", "....XXXXX....", ".....XXX.....", "......X......", ".....X.X.....", "....X...X....", "...X.....X...", "............."]),
}


def banknote(v):
    d = NOTES[v]
    W, H = 52, 24
    m = wobbly_rect(W, H)
    a = paper_from_mask(m, d['paper'], C('#2a2a30'))
    ink, ink2, pr = d['ink'], d['ink2'], d['paper']
    for x in range(2, W - 2):  # border + guilloche waves
        put(a, x, 2, ink2); put(a, x, H - 3, ink2)
        put(a, x, 4 + (1 if (x // 2) % 2 else 0), ink2)
        put(a, x, H - 6 + (1 if (x // 2) % 2 else 0), ink2)
    vline(a, 2, 2, H - 3, ink2); vline(a, W - 3, 2, H - 3, ink2)
    # watermark oval (clean paper, faint ring)
    for y in range(7, 17):
        for x in range(37, 48):
            r = ((x + 0.5 - 42) / 5) ** 2 + ((y + 0.5 - 12) / 5) ** 2
            if r <= 1:
                a[y, x] = pr[4]
            if 0.78 < r <= 1:
                a[y, x] = pr[2]
    stamp(a, d['motif'], {'X': ink}, 23 if v == 10000 else 21, 7)
    s = str(v)
    text3(a, s, 4, 7, ink)
    text3(a, s, W - 4 - text3_w(s) - 0, H - 11, ink) if v < 10000 else text3(a, s, 4, H - 9, ink2)
    kana(a, ['na', 'to'], 4, 13, ink2)
    text3(a, 'G', 4, 17, ink2) if False else None
    for x, y in ((31, 7), (32, 7), (31, 8), (32, 8)):  # red seal
        put(a, x, y, C('#b8423a'))
    put(a, 31, 7, C('#d8705a'))
    text3(a, 'A7', 37, 3 + 0, C('#a8463a')) if False else None
    return a


def crumple(a, pr):
    """Folded / crumpled variant: compressed panels, alternate panels lit/shaded, creases."""
    H, W = a.shape[:2]
    keep = list(range(W))
    b = a[:, keep]
    W2 = b.shape[1]
    out = blank(W2, H + 2)
    pal = [tuple(c) for c in pr]
    for x in range(W2):
        p = x * 4 // W2
        dy = (0, 2, 1, 2)[p] + (1 if p in (1, 3) and (x % (W2 // 4)) > W2 // 8 else 0)
        dy = min(dy, 2)
        for y in range(H):
            c = b[y, x]
            if c[3] == 0:
                continue
            t = tuple(c)
            if t in pal:
                k = pal.index(t) + (1 if p in (0, 2) else -1)
                c = pr[int(np.clip(k, 0, len(pr) - 1))]
            out[y + dy, x] = c
    for x in (W2 // 4, W2 // 2, 3 * W2 // 4):  # crease lines
        for y in range(out.shape[0]):
            if out[y, x, 3] and tuple(out[y, x]) in pal:
                out[y, x] = pr[5] if (x // (W2 // 4)) % 2 else pr[1]
    return out


def all_flat():
    S = {}
    S['ticket_punch'] = dict(frames=ticket_punch(), fps=8, loop=False)
    S['ticket_train'] = dict(frames=[ticket(), ticket(True)])
    S['ticket_prize'] = dict(frames=[prize_ticket()])
    S['raffle'] = dict(frames=[raffle_strip()])
    S['receipt'] = dict(frames=[receipt()])
    S['stampcard'] = dict(frames=stamp_land(), fps=8, loop=False)
    for v in NOTES:
        S[f'note{v}'] = dict(frames=[banknote(v)])
        S[f'note{v}_crumpled'] = dict(frames=[crumple(banknote(v), NOTES[v]['paper'])])
    return S
