"""Pixel kit samples: 100-yen coin spin, train-ticket punch, piggy-bank shake -> shots/pixelkit/sample.png"""
import math, os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from pk import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# ======================= 100-yen coin ====================================================
NICKEL = ramp('#3a3542', '#57525f', '#78747f', '#9c9aa0', '#bfbfbd', '#dddcd2', '#f6f3e4')
NICKEL_OL = C('#26212b')


def coin100():
    R = 11
    val = Face(R)
    val.raise_text('100', 10.5, 7, tall=True)
    for k in range(-5, 6):  # legend arcs (top: maker line, bottom: year)
        for ang0, rr in ((90, 6.9), (270, 6.9)):
            a = math.radians(ang0 + k * 11)
            if (k + 6) % 3 == 2:
                continue
            val.raise_px(int(round(10.5 + rr * math.cos(a) - 0.5)), int(round(10.5 - rr * math.sin(a) - 0.5)))
    val.finish()
    flo = Face(R)
    cx, cy = 11.5, 9.0
    for k in range(5):  # plum blossom: five round petals, grooved centre
        a = math.radians(90 + 72 * k)
        px_, py_ = cx + 2.7 * math.cos(a), cy - 2.7 * math.sin(a)
        for y in range(22):
            for x in range(22):
                if math.hypot(x + 0.5 - px_, y + 0.5 - py_) <= 1.75:
                    flo.raise_px(x, y)
    for y in range(22):
        for x in range(22):
            d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
            if 0.8 < d <= 1.6:
                flo.raised[y, x] = False
    line_pts = [(4, 16), (5, 15), (6, 15), (7, 14), (8, 13), (9, 12)]  # branch + bud + leaf
    for x, y in line_pts:
        flo.raise_px(x, y)
    flo.raise_rows(["XX", "XX"], 4, 12)
    flo.raise_rows([".X", "XX"], 7, 16)
    flo.raise_rows(["X"], 15, 15); flo.raise_rows(["XX"], 14, 16)
    flo.finish()
    frames = []
    for f in range(8):
        frames.append(coin_frame(val, flo, f * math.pi / 4, 3, [NICKEL], NICKEL_OL, reeds=26))
    return frames


# ======================= train ticket + punch ===========================================
PAPER = ramp('#9a6a4c', '#c08e66', '#ddb185', '#ecca9f', '#f6e0bd', '#fdf1dc')
PAPER_OL = C('#4e2c24')
INK, INK2 = C('#272943'), C('#454a72')
RED = ramp('#6f2420', '#a03a2b', '#c25a3d')
PURP, PURP2 = C('#5d4a8c'), C('#8673b4')
STEEL = ramp('#2c2f3d', '#4b5064', '#727a8e', '#9ea7b6', '#c9d0d9', '#eef2f4')
STEEL_OL = C('#1f1e29')
GRIP = ramp('#3a1e16', '#5e3222', '#86492c', '#a9653a', '#c88552')
GRIP_OL = C('#22120d')
BRASS = ramp('#4f3417', '#8a5f22', '#c0902f', '#e6c35a', '#fbeaa0')
BRASS_OL = C('#33200e')

LOCO = ["......XXXX..",
        ".XX....X.X..",
        "XXXXXXXXXXX.",
        "XXXXXXXXXXXX",
        "XXXXXXXXXXXX",
        ".ooX.ooX.oo."]


def ticket(hole=False):
    a = blank(48, 24)
    rect(a, 1, 1, 46, 22, PAPER[3])
    hline(a, 1, 46, 0, PAPER_OL); hline(a, 1, 46, 23, PAPER_OL)
    vline(a, 0, 1, 22, PAPER_OL); vline(a, 47, 1, 22, PAPER_OL)
    hline(a, 1, 45, 1, PAPER[4]); vline(a, 1, 1, 21, PAPER[4]); put(a, 1, 1, PAPER[5]); put(a, 2, 1, PAPER[5])
    hline(a, 2, 46, 21, PAPER[2]); hline(a, 1, 46, 22, PAPER[1]); vline(a, 46, 2, 22, PAPER[1])
    # paper fibres (hand placed)
    for x, y in ((7, 12), (8, 12), (25, 2), (26, 2), (13, 20), (14, 20), (30, 16), (22, 9), (23, 9), (42, 20), (5, 20), (33, 2)):
        if (a[y, x] == PAPER[3]).all() or (a[y, x] == PAPER[4]).all():
            put(a, x, y, PAPER[2])
    # print border (worn ink, small breaks)
    for x in range(3, 45):
        if x not in (17, 29):
            put(a, x, 3, INK2)
        if x not in (11, 36):
            put(a, x, 19, INK2)
    for y in range(3, 20):
        if y != 14:
            put(a, 3, y, INK2)
        put(a, 44, y, INK2)
    # red fare band
    for y in range(4, 19):
        put(a, 34, y, RED[2]); hline(a, 35, 37, y, RED[1]); put(a, 38, y, RED[0])
    for x, y in ((36, 10), (37, 11), (36, 12)):
        put(a, x, y, PAPER[4])
    put(a, 35, 5, RED[2]); put(a, 35, 17, RED[0])
    # locomotive + rails
    stamp(a, LOCO, {'X': INK, 'o': INK2}, 5, 5)
    hline(a, 6, 9, 7, INK2)  # boiler sheen (lighter ink)
    for x in range(5, 17):
        put(a, x, 11, INK2 if x % 3 else INK)
    # destination + arrow
    text3(a, 'GRG', 19, 5, INK)
    hline(a, 19, 31, 11, INK); put(a, 30, 10, INK); put(a, 30, 12, INK); put(a, 19, 10, INK); put(a, 19, 12, INK)
    # fare
    text3(a, '¥120', 5, 13, INK)
    hline(a, 5, 18, 18, INK2)
    # purple date stamp, slightly crooked, worn
    for x in range(21, 33):
        if x not in (24, 30):
            put(a, x, 13, PURP2)
        if x != 27:
            put(a, x, 18, PURP2)
    vline(a, 21, 13, 18, PURP2); vline(a, 32, 14, 18, PURP2)
    text3(a, 'S57', 22, 14, PURP)
    put(a, 25, 16, PAPER[3]); put(a, 30, 14, PURP2)
    # stub: route letter, punch guide, serial
    text3(a, 'A', 40, 5, INK)
    for x, y in ((41, 10), (40, 11), (42, 11), (41, 12)):
        put(a, x, y, INK2)
    text3(a, '7', 40, 14, INK)
    if hole:
        for x, y in ((41, 10), (40, 11), (41, 11), (42, 11), (41, 12)):
            a[y, x] = 0
        for x, y in ((40, 10), (39, 11), (40, 12)):
            put(a, x, y, PAPER[1])
        for x, y in ((42, 10), (41, 9)):
            put(a, x, y, PAPER[1])
        for x, y in ((42, 12), (43, 11), (41, 13)):
            put(a, x, y, PAPER[4])
    return a


def chip():
    a = blank(5, 5)
    for x, y in ((2, 1), (1, 2), (2, 2), (3, 2), (2, 3)):
        put(a, x, y, PAPER[3])
    put(a, 2, 1, PAPER[4]); put(a, 1, 2, PAPER[4]); put(a, 3, 2, PAPER[2]); put(a, 2, 3, PAPER[1])
    return outline(a, PAPER_OL)


def arm(W, H, piv, ang, jaw, hdl, grip0, dark=0):
    a = blank(W, H)
    jj, ii = np.mgrid[0:H, 0:W].astype(float)
    px, py = ii + 0.5 - piv[0], jj + 0.5 - piv[1]
    dx, dy = math.cos(ang), math.sin(ang)
    al = px * dx + py * dy
    pe = -px * dy + py * dx
    for y in range(H):
        for x in range(W):
            l, p = al[y, x], pe[y, x]
            if -jaw <= l <= grip0 + 0.5:
                hw = 1.5 if l > -jaw + 2.5 else 1.05
                if abs(l) < 2.6:
                    hw = 2.1
                if abs(p) <= hw:
                    k = 4 if p < -0.55 else (3 if p < 0.5 else 1)
                    if p < -0.55 and -jaw + 2 < l < -2.5 and int(l) % 5 != 0:
                        k = 5
                    if abs(l) < 2.6 and p > 0.5:
                        k = 2
                    a[y, x] = STEEL[max(0, k - dark)]
            elif grip0 < l <= hdl:
                hw = 2.05 if l < hdl - 1.2 else 1.3
                if abs(p) <= hw:
                    k = 3 if p < -1.0 else (2 if p < 0.0 else (1 if p < 1.0 else 0))
                    if int(l - grip0) % 3 == 2:
                        k = max(0, k - 1)
                    if p < -1.0 and int(l) % 4 == 1:
                        k = 4
                    a[y, x] = GRIP[max(0, k - dark)]
    steel = np.zeros((H, W), bool)
    for y in range(H):
        for x in range(W):
            steel[y, x] = a[y, x, 3] > 0 and al[y, x] <= grip0 + 0.5
    outline(a, GRIP_OL)
    o2 = outline(np.zeros_like(a), STEEL_OL, mask=steel)
    m = (o2[..., 3] > 0) & (al > -jaw - 2) & (al < grip0 + 0.5)
    a[m] = STEEL_OL
    return a


def pivot(a, cx, cy):
    pts = {(-1, -1): 4, (0, -1): 3, (-1, 0): 3, (0, 0): 2, (1, -1): 2, (-1, 1): 2, (1, 0): 1, (0, 1): 1, (1, 1): 0}
    for (dx, dy), k in pts.items():
        put(a, cx + dx, cy + dy, BRASS[k])
    for dx, dy in ((-2, -1), (-2, 0), (-2, 1), (2, -1), (2, 0), (2, 1), (-1, -2), (0, -2), (1, -2), (-1, 2), (0, 2), (1, 2)):
        put(a, cx + dx, cy + dy, BRASS_OL)


def punch_layer(W, H, piv, opening):
    a = blank(W, H)
    over(a, arm(W, H, piv, -opening, 10, 25, 8, dark=1), 0, 0)
    over(a, arm(W, H, piv, opening, 10, 25, 8), 0, 0)
    pivot(a, int(piv[0]), int(piv[1]))
    return a


def ticket_punch():
    W, H = 88, 34
    tx, ty = 2, 5
    hx, hy = tx + 41, ty + 11  # hole centre
    seq = [  # (pivot dx, opening, ticket squeeze, hole, chip offset)
        (26, 0.20, 0, False, None),
        (0, 0.20, 0, False, None),
        (0, 0.05, 1, False, None),
        (0, 0.20, 0, True, 4),
        (14, 0.20, 0, True, 10),
        (None, 0, 0, True, None),
    ]
    frames = []
    for pdx, op, sq, hole, ch in seq:
        f = blank(W, H)
        t = ticket(hole or sq)
        if sq:
            t2 = blank(48, 25)
            t2[:24, :30] = t[:, :30]
            t2[1:25, 30:] = t[:, 30:]
            t = t2
        over(f, t, tx, ty)
        if ch is not None:
            over(f, chip(), hx - 2, hy - 2 + ch)
        if pdx is not None:
            piv = (hx + 10.5 + pdx, hy + 0.5 + (1 if sq else 0))
            over(f, punch_layer(W, H, piv, op), 0, 0)
        frames.append(f)
    return frames


# ======================= piggy bank =====================================================
PINK = ramp('#5a2a3c', '#81394b', '#a9505f', '#cc6e77', '#e5939a', '#f4bcb6', '#fde5d8')
PIG_OL = C('#3b1a2b')
PIG_INK = C('#2e1522')
FLW = {'r': C('#a5323f'), 'R': C('#cf4d55'), 'c': C('#f5dfa6'), 'g': C('#4c6e45'), 'G': C('#6f9460')}
GOLD = ramp('#5a3a12', '#94661f', '#c99a35', '#ecca62', '#fdf0b0')


def pig_sdf(p):
    body = sd_ellipsoid(p, (1.0, 0.8, 0.78))
    q = p - np.array([0.98, -0.08, 0.0])
    snout = sd_cyl_x(q, 0.15, 0.29, 0.06)
    d = smin(body, snout, 0.14)
    for zz in (0.36, -0.36):
        e = p - np.array([0.5, 0.7, zz])
        e = e @ Rz(-0.5).T
        d = smin(d, sd_ellipsoid(e, (0.07, 0.21, 0.16)), 0.06)
    for xx in (0.52, -0.52):
        for zz in (0.42, -0.42):
            d = smin(d, sd_capsule(p, (xx, -0.45, zz), (xx * 1.04, -0.9, zz * 1.05), 0.17), 0.08)
    d = smin(d, sd_ellipsoid(p - np.array([-0.99, 0.12, 0]), (0.08, 0.08, 0.08)), 0.04)
    return np.maximum(d, -(p[..., 1] + 0.97))


def surf(dirv, r=(1.0, 0.8, 0.78)):
    d = np.asarray(dirv, float)
    return d / np.linalg.norm(d / np.asarray(r))


def pig_frame(roll, hop, coin=None):
    W, H, S, cx, cy = 54, 48, 17.0, 27.0, 27.0
    M0 = Rx(math.radians(18)) @ Ry(math.radians(208))
    R = Rz(math.radians(roll))
    M = R @ M0
    pv = np.array([0, -0.98, 0.0])
    b = pv - R @ pv + np.array([0, hop / S, 0])
    hit, po, nv, depth = march(pig_sdf, W, H, S, cx, cy, M, b)
    diff = np.clip(nv @ L, 0, 1)
    spec = np.clip(nv @ HV, 0, 1) ** 40
    s = 0.02 + 0.92 * diff + 0.12 * np.clip(nv[..., 1], 0, 1)
    idx = np.clip((s * 6).astype(int), 0, 5)
    idx[po[..., 1] < -0.55] -= 1
    idx = np.clip(idx, 0, 5)
    idx[spec > 0.55] = 6
    idx = despeckle(idx, hit)
    a = blank(W, H)
    a[hit] = np.array(PINK)[idx[hit]]
    # internal contour where depth jumps (legs / ears behind body)
    dj = np.zeros((H, W), bool)
    for sy, sx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nb = np.roll(np.roll(depth, sy, 0), sx, 1)
        nh = np.roll(np.roll(hit, sy, 0), sx, 1)
        dj |= hit & nh & (depth < nb - 0.22)
    a[dj] = PIG_OL

    def P(pt):
        x, y, z = project(pt, M, b, S, cx, cy)
        vis = 0 <= x < W and 0 <= y < H and hit[y, x] and z >= depth[y, x] - 0.12
        return x, y, vis
    # coin slot along the back
    p0, p1 = P((-0.28, 0.79, 0)), P((0.22, 0.79, 0))
    line(a, p0[0], p0[1], p1[0], p1[1], PIG_INK)
    line(a, p0[0], p0[1] + 1, p1[0], p1[1] + 1, PINK[2])
    # eyes, blush, nostrils, ear inner
    for zs in (-1, 1):
        x, y, v = P(surf((0.74, 0.34, 0.43 * zs)))
        if v:
            stamp(a, ["X..", ".XX", ".XX"], {'X': PIG_INK}, x - 1, y - 1)
            x2, y2, v2 = P(surf((0.78, 0.0, 0.5 * zs)))
            if v2:
                stamp(a, ["rR"], {'r': C('#c8545f'), 'R': C('#d96a70')}, x2 - 1, y2)
        x, y, v = P((1.13, -0.08, 0.09 * zs))
        if v:
            stamp(a, ["X", "X"], {'X': C('#6e2b3e')}, x, y - 1)
    # painted plum blossoms on the near flank
    for dv, rows in (((-0.15, 0.05, -1.0), ["..R..", "RRcRr", ".rrr.", "gr.rG", "g...."]),
                     ((0.25, -0.35, -1.0), [".R.", "RcR", "r.r"]),
                     ((-0.55, 0.35, -1.0), [".R.", "Rcr", ".r."])):
        x, y, v = P(surf(dv))
        if v:
            stamp(a, rows, FLW, x - len(rows[0]) // 2, y - len(rows) // 2)
    x, y, v = P((-1.06, 0.14, -0.02))
    if v:
        stamp(a, [".X.", "X.X", ".XX"], {'X': PINK[1]}, x - 1, y - 1)
    outline(a, PIG_OL)
    # ground shadow (flat, hard)
    sh = blank(W, H)
    w = 17 - abs(hop)
    for y in range(44, 47):
        hw = w - (abs(y - 45) * 3)
        for x in range(int(cx - hw), int(cx + hw)):
            sh[y, x] = (24, 16, 24, 110)
    over(sh, a, 0, 0)
    a = sh
    if coin is not None:
        cxp, cyp, wd = coin
        rows = {3: [".ooo.", "oYyyo", "oyBBo", "oBbbo", ".ooo."], 2: [".o.", "oYo", "oyo", "obo", ".o."], 1: ["o", "Y", "b", "o"]}[wd]
        stamp(a, rows, {'o': BRASS_OL, 'Y': GOLD[4], 'y': GOLD[3], 'B': GOLD[2], 'b': GOLD[1]}, cxp, cyp)
    if roll:
        sd = 1 if roll > 0 else -1
        for x0, y0 in ((4, 22), (3, 26), (48, 22), (49, 26)):
            hline(a, x0, x0 + 2, y0 + (sd if x0 < 20 else -sd), PIG_OL)
    return a


def piggy_shake():
    return [pig_frame(0, 0), pig_frame(-9, 3), pig_frame(8, 4, (27, 6, 3)),
            pig_frame(-6, 2, (28, 1, 1)), pig_frame(4, 1), pig_frame(0, 0)]


# ======================= preview sheet ==================================================
def sheet(coins, tick, pig, out):
    K = 4
    bg = (35, 30, 37, 255)
    W, Hh = 2380, 1000
    img = Image.new('RGBA', (W, Hh), bg)
    dr = ImageDraw.Draw(img)
    x, y = 30, 30
    dr.text((x, y), '100 yen spin (8f) @4x', fill=(220, 200, 170, 255)); y += 16
    for f in coins:
        img.alpha_composite(up(f, K), (x, y)); x += f.shape[1] * K + 12
    y += coins[0].shape[0] * K + 24; x = 30
    dr.text((x, y), 'train ticket punch (6f) @4x', fill=(220, 200, 170, 255)); y += 16
    for i, f in enumerate(tick):
        img.alpha_composite(up(f, K), (30 + (i % 3) * (f.shape[1] * K + 10), y + (i // 3) * (f.shape[0] * K + 6)))
    y += 2 * (tick[0].shape[0] * K + 6) + 18
    dr.text((30, y), 'piggy bank shake (6f) @4x', fill=(220, 200, 170, 255)); y += 16
    x = 30
    for f in pig:
        img.alpha_composite(up(f, K), (x, y)); x += f.shape[1] * K + 8
    rx = 1400
    for nm in ('ticket_punch.jpg', 'suitcase_turn.jpg'):
        r = Image.open(os.path.join(ROOT, 'docs/ref/pixel', nm)).convert('RGBA')
        r = r.resize((950, int(r.height * 950 / r.width)), Image.LANCZOS)
        img.alpha_composite(r, (rx, 30 if nm.startswith("ticket") else 500))
    dr.text((rx, 10), 'refs (docs/ref/pixel)', fill=(220, 200, 170, 255))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out)


if __name__ == '__main__':
    c = coin100(); t = ticket_punch(); p = piggy_shake()
    sheet(c, t, p, os.path.join(ROOT, 'shots/pixelkit/sample.png'))
    print('ok')
