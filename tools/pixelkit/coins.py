"""Coin designs (original game-yen faces) as native pixel grids -> relief heightmaps for render3d.py."""
import math
import numpy as np
from pk import F3, text3_w

N_HM = 256

# name: R (face radius px), thick (edge px), D (relief depth), hole (px), reeds, angles, ramp, outline
SPIN = [0, 45, 70, 90, 110, 135, 180, 270]
COINS = {
    'coin1': dict(R=8, thick=2, D=0.07, reeds=0, ramp='alu'),
    'coin5': dict(R=9, thick=2, D=0.07, hole=2, reeds=0, ramp='brass'),
    'coin10': dict(R=10, thick=3, D=0.075, reeds=0, ramp='bronze'),
    'coin50': dict(R=9, thick=2, D=0.07, hole=2, reeds=40, ramp='nickel'),
    'coin100': dict(R=10, thick=3, D=0.075, reeds=48, ramp='nickel'),
    'coin500': dict(R=11, thick=3, D=0.075, reeds=56, ramp='gold'),
    'token': dict(R=10, thick=3, D=0.08, reeds=0, ramp='token'),
}
for c in COINS.values():
    c['angles'] = SPIN


class Grid:
    def __init__(self, R):
        self.R, self.n = R, 2 * R
        self.a = np.zeros((self.n, self.n), bool)
        self.c = (self.n - 1) / 2

    def px(self, x, y):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.a[y, x] = True

    def rows(self, rows, x0, y0):
        for j, r in enumerate(rows):
            for i, v in enumerate(r):
                if v == 'X':
                    self.px(x0 + i, y0 + j)

    def text(self, s, cx, y, tall=False):
        x = int(round(cx - text3_w(s) / 2 + 0.01))
        for ch in s:
            g = F3[ch]
            if tall:
                g = [g[0], g[1], g[1], g[2], g[3], g[3], g[4]]
            self.rows(g, x, y)
            x += len(g[0]) + 1

    def arc(self, rr, a0, a1, step, skip=None):
        k = 0
        a = a0
        while a <= a1 + 1e-6:
            if not (skip and k % skip == skip - 1):
                t = math.radians(a)
                self.px(int(math.floor(self.c + 0.5 + rr * math.cos(t))), int(math.floor(self.c + 0.5 - rr * math.sin(t))))
            a += step; k += 1

    def disc(self, cx, cy, r, on=True):
        for y in range(self.n):
            for x in range(self.n):
                if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r:
                    self.a[y, x] = on


def designs(name, R):
    f, b = Grid(R), Grid(R)
    c = R  # centre in px units (grid coords 0..2R)
    if name == 'coin1':
        f.text('1', c, c - 3, tall=True)
        f.rows(['X.', 'XX', '.X'], c - 5, c + 1); f.rows(['.X', 'XX', 'X.'], c + 3, c + 1)
        b.rows(['.XX..XX.', 'XXX..XXX', '.XXXXXX.', '...XX...', '...XX...', '.XXXXXX.'], c - 4, c - 3)
    elif name == 'coin5':
        f.text('5', c, c + 3)
        for k in (-1, 0, 1):
            f.rows(['.XX.', 'X..X'], c - 2 + k * 4, c - 6 + abs(k))
        for k in range(8):
            a = math.radians(22.5 + 45 * k)
            for rr in (3.6, 4.6):
                b.px(int(math.floor(c + rr * math.cos(a))), int(math.floor(c - rr * math.sin(a))))
        b.arc(6.0, 0, 359, 30)
    elif name == 'coin10':
        f.text('10', c, c - 3, tall=True)
        f.arc(6.3, 200, 250, 12); f.arc(6.3, 290, 340, 12)
        b.rows(['....X....', '...XXX...', '.XXXXXXX.', '...X.X...', '..XXXXX..', 'XXXXXXXXX', '..X...X..', '.XXXXXXX.', '..X.X.X..', '..X.X.X..', 'XXXXXXXXX'], c - 4, c - 5)
    elif name == 'coin50':
        f.text('50', c, c + 3)
        f.rows(['X.X.X', '.XXX.', '..X..'], c - 2, c - 6)
        for k in range(12):
            a = math.radians(15 + 30 * k)
            b.px(int(math.floor(c + 4.0 * math.cos(a))), int(math.floor(c - 4.0 * math.sin(a))))
            b.px(int(math.floor(c + 5.1 * math.cos(a))), int(math.floor(c - 5.1 * math.sin(a))))
    elif name == 'coin100':
        f.text('100', c, c - 3, tall=True)
        f.arc(6.3, 50, 130, 10, skip=3); f.arc(6.3, 230, 310, 10, skip=3)
        cx, cy = c + 0.6, c - 1.4
        for k in range(5):
            a = math.radians(90 + 72 * k)
            b.disc(cx + 2.6 * math.cos(a), cy - 2.6 * math.sin(a), 1.75)
        for y in range(b.n):
            for x in range(b.n):
                if 0.75 < math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= 1.55:
                    b.a[y, x] = False
        for x, y in ((3, 15), (4, 14), (5, 14), (6, 13), (7, 12)):
            b.px(x, y)
        b.rows(['XX', 'XX'], 3, 11); b.rows(['.X', 'XX'], 6, 15); b.rows(['X.', 'XX'], 14, 14)
    elif name == 'coin500':
        f.text('500', c, c - 3, tall=True)
        f.arc(7.2, 30, 150, 12); f.arc(7.2, 210, 330, 12)
        b.rows(['......XX......', '.....X..X.....', '....XX..XX....', '...X.XXXX.X...', '..X........X..',
                '.X..........X.', 'X............X', 'XXXXXXXXXXXXXX'], c - 7, c - 2)
        b.disc(c - 4.5, c - 4.5, 1.6)
        b.arc(7.4, 20, 160, 14, skip=4)
    elif name == 'token':
        f.arc(5.6, 0, 359, 8)
        for x in range(c - 5, c + 5):
            f.px(x, c - 1); f.px(x, c)
        f.disc(c, c - 0.0, 1.4, False); f.px(c - 1, c - 1); f.px(c, c - 1)
        f.disc(c - 1.8, c - 3.2, 0.9)
        b.text('GG', c, c - 3, tall=True)
        b.arc(6.6, 0, 359, 30)
    return f.a, b.a


def box(a, r):
    k = 2 * r + 1
    p = np.pad(a, r, mode='edge')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    return (c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]) / (k * k)


def heightmap(R, raised, hole=0):
    N = N_HM
    yy, xx = np.mgrid[0:N, 0:N].astype(float)
    u = (xx + 0.5) / N * 2 - 1; v = 1 - (yy + 0.5) / N * 2
    r = np.hypot(u, v)
    p = 1 / R
    H = np.full((N, N), 0.25)
    H = np.where(r > 1 - 3 * p, 0.25 + np.clip((r - (1 - 3 * p)) / p, 0, 1) * 0.75, H)
    H = np.where(r > 1 - 2 * p, 1.0, H)
    H = np.where(r > 1 - p, 1.0 - np.clip((r - (1 - p)) / p, 0, 1) * 0.5, H)
    if hole:
        rh = hole / R
        H = np.where(r < rh + 2 * p, 0.25 + np.clip((rh + 2 * p - r) / p, 0, 1) * 0.6, H)
    col = np.clip(((u + 1) / 2 * 2 * R).astype(int), 0, 2 * R - 1)
    row = np.clip(((1 - v) / 2 * 2 * R).astype(int), 0, 2 * R - 1)
    field = (r <= 1 - 3 * p) & (r >= (hole / R + 2 * p if hole else 0))
    H = np.where(field & raised[row, col], 0.85, H)
    k = max(1, int(N / (2 * R) * 0.18))
    return box(box(H, k), k).astype(np.float32)
