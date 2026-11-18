"""Kanji from glyphs.npz (_glyphs.py) laid out on a bk.Decal plane: embroidery, printed flags and labels."""
import os

import numpy as np

_G = None


def text(d, name, n, cu, cv, h, vertical=False, mirror=False):
    """Mask of the n-character glyph strip `name` on decal d, each character h mm tall, centred on (cu, cv); vertical
    stacks the characters top to bottom; mirror flips u (a decal seen from behind its axis)."""
    global _G
    if _G is None:
        _G = np.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'glyphs.npz'))
    g = _G[name]
    gh, gw = g.shape
    cw = gw / n                               # one character's width in glyph pixels
    s = h / gh
    u = (-d.U if mirror else d.U) - cu
    v = d.V - cv
    if vertical:
        top = n * h / 2
        k = np.floor((top - v) / h).astype(int)
        ok = (k >= 0) & (k < n) & (np.abs(u) < cw * s / 2)
        gi = ((top - v) - k * h) / s
        gj = (u + cw * s / 2) / s + k * cw
    else:
        ok = (np.abs(v) < h / 2) & (np.abs(u) < gw * s / 2)
        gi = (h / 2 - v) / s
        gj = (u + gw * s / 2) / s
    gi = np.clip(gi.astype(int), 0, gh - 1)
    gj = np.clip(gj.astype(int), 0, gw - 1)
    return d.m & ok & g[gi, gj]
