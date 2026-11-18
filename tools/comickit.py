"""comickit.py: themed pixel patterns and comic effects for the action cards and toy promos (the owner: "more poses
and the toy in action, cool comic effects, more patterns, and a theme too, like ocean waves").
Every mark is a hard pixel in a flat colour (no glow, gradient, cross or sparkle).

  pattern(S, kind, region, cols)       a themed background: 'seigaiha' (ocean waves), 'graph' (stationery grid
                                       paper), 'rain', 'bendots' (comic dots), 'zigzag', 'tiles', 'ripples'
  focus(S, poly, cx, cy, col, n)       manga focus lines (集中線) into a panel, the centre left clear
  speed(S, poly, col, seed)            horizontal speed lines
  panel(S, poly, fill, ink, gutter)    a comic panel: white gutter, ink rule, the fill
"""
import math
import numpy as np
from printkit import rgb


def _mask(S, region):
    return S._region(region)


def _paint(S, m, col):
    S._paint(m, col)


def pattern(S, kind, region, cols, scale=1, seed=0):
    R = _mask(S, region)
    yy, xx = np.mgrid[0:S.h, 0:S.w]
    if kind == 'seigaiha':  # overlapping fans of rings, row on row, the lower row in front
        r = 9 * scale; out = np.full((S.h, S.w), -1)
        for j in range(-1, S.h // (r // 2) + 3):
            cy = j * (r // 2); off = (r if j % 2 else 0)
            for i in range(-1, S.w // (2 * r) + 2):
                cx = i * 2 * r + off
                d = np.hypot(xx - cx, yy - cy)
                inside = (d <= r) & (yy <= cy)
                out[inside] = (d[inside] // (r / 3.2)).astype(int) % 2
        _paint(S, R & (out == 0), cols[0]); _paint(S, R & (out == 1), cols[1])
        if len(cols) > 2:  # the rim of each fan
            rim = np.zeros_like(R)
            for j in range(-1, S.h // (r // 2) + 3):
                cy = j * (r // 2); off = (r if j % 2 else 0)
                for i in range(-1, S.w // (2 * r) + 2):
                    cx = i * 2 * r + off
                    d = np.hypot(xx - cx, yy - cy); rim |= (np.abs(d - r) < 0.6) & (yy <= cy)
            _paint(S, R & rim, cols[2])
    elif kind == 'graph':  # stationery grid paper: fine rules every 5 px, a bold rule every 25, a red margin
        _paint(S, R, cols[0])
        _paint(S, R & ((xx % 5 == 0) | (yy % 5 == 0)), cols[1])
        _paint(S, R & ((xx % 25 == 0) | (yy % 25 == 0)), cols[2])
        if len(cols) > 3: _paint(S, R & ((xx == 22) | (xx == 24)), cols[3])
    elif kind == 'bendots':  # comic Ben-Day dots on a staggered grid
        _paint(S, R, cols[0])
        st = 7 * scale; sx = (xx + (yy // st % 2) * (st // 2)) % st; sy = yy % st
        d = (sx - st // 2) ** 2 + (sy - st // 2) ** 2
        _paint(S, R & (d <= (st * 0.32) ** 2), cols[1])
    elif kind == 'zigzag':
        _paint(S, R, cols[0])
        u = (yy + np.abs(((xx // 1) % 16) - 8)) % 12
        _paint(S, R & (u < 4), cols[1])
    elif kind == 'rain':
        _paint(S, R, cols[0])
        rn = np.random.default_rng(seed)
        m = np.zeros_like(R)
        for _ in range(S.w * S.h // 90):
            x, y, L = rn.integers(0, S.w), rn.integers(0, S.h), rn.integers(3, 8)
            for k in range(L):
                if 0 <= y + k < S.h and 0 <= x - k // 3 < S.w: m[y + k, x - k // 3] = True
        _paint(S, R & m, cols[1])
    elif kind == 'tiles':
        _paint(S, R, cols[0]); _paint(S, R & ((xx % 10 == 0) | (yy % 10 == 0)), cols[1])
    elif kind == 'ripples':
        _paint(S, R, cols[0]); _paint(S, R & (((yy + 3 * np.sin(xx / 9.0)).astype(int) % 8) < 2), cols[1])


def focus(S, poly, cx, cy, col, n=44, r0=22, seed=1):
    """Manga focus lines: n thin wedges aimed at (cx, cy); each starts at its own distance (the centre stays clear)
    and widens outward, clipped to the panel."""
    R = _mask(S, poly)
    yy, xx = np.mgrid[0:S.h, 0:S.w]
    a = (np.arctan2(yy - cy, xx - cx) / (2 * math.pi) + 1) % 1
    d = np.hypot(xx - cx, yy - cy)
    rn = np.random.default_rng(seed)
    starts = rn.uniform(r0, r0 * 2.2, n); widths = rn.uniform(0.25, 0.6, n)
    k = (a * n).astype(int) % n; f = (a * n) % 1
    on = (np.abs(f - 0.5) < widths[k] * 0.5 * np.clip((d - starts[k]) / 60.0, 0, 1)) & (d > starts[k])
    _paint(S, R & on, col)


def speed(S, poly, col, seed=2, density=0.3, slope=0.0):
    """Horizontal speed lines (1 px), of random lengths."""
    R = _mask(S, poly); m = np.zeros_like(R)
    rn = np.random.default_rng(seed)
    for y in range(S.h):
        if rn.random() > density: continue
        x0 = rn.integers(-20, S.w); L = rn.integers(20, 90); t = 2 if rn.random() < 0.5 else 1
        for x in range(max(0, x0), min(S.w, x0 + L)):
            yy = int(y + (x - x0) * slope)
            for k in range(t if x < x0 + L - 6 else 1):
                if 0 <= yy + k < S.h: m[yy + k, x] = True
    _paint(S, R & m, col)


def panel(S, poly, fill, ink, gutter=0xffffff, g=3, t=2):
    """A comic panel: the white gutter round it, the ink rule, the fill."""
    def grow(p, k):
        cx = sum(x for x, _ in p) / len(p); cy = sum(y for _, y in p) / len(p)
        return [(x + (k if x > cx else -k), y + (k if y > cy else -k)) for x, y in p]
    S.poly(grow(poly, g + t), gutter); S.poly(grow(poly, t), ink); S.poly(poly, fill)
