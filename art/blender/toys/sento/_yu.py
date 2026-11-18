"""Shared parts for series sento (Bathhouse Regulars, concepts_D.md): the section of bathhouse floor every regular
comes on (a playset part: white mosaic tile with a cobalt front band, dowels out of the right side and holes in the
left, so the sections join side by side into one long bathhouse), the yellow plastic wash basin, and paint helpers
for tile, water, wood and the basin.

    sys.path: this folder and ../lib
    import _yu as yu
    fl = yu.floor(F)                 # -> (lo list, hi list); the floor top is yu.H
    lo, hi = yu.basin('basin', at=(x, y, z), r=4.4)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import kit  # noqa: E402

W, D, H = 32.0, 24.0, 3.2           # the floor section (x along the shelf, y depth, height)
TILE = 1.6                          # mosaic tile pitch (mm)


def floor(F, w=W, d=D, h=H, x0=0.0):
    """The tiled floor section with its playset joint. pt_in on the left edge, pt_out on the right (both at floor level,
    centred in depth), so every section lines up on the previous one."""
    lo, hi = [], []
    c = (x0, 0.0, h / 2)
    o = tk.rbox('floor_hi', (w, d, h), centre=c, bevel=0.45, segs=2)
    tk.regions(o, 'tile', [('band', lambda C, N: N[:, 1] < -0.6)])
    hi.append(o)
    lo.append(tk.rbox('floor', (w, d, h), centre=c, bevel=0.3, segs=1))
    for y in (-6.5, 6.5):   # two dowels out of the right side
        o = tk.cyl('peg_hi', 0.8, x0 + w / 2 - 0.4, x0 + w / 2 + 1.5, n=10, at=(y, h / 2), axis='X', bevel=0.2, segs=1)
        tk.set_region(o, 'peg')
        hi.append(o)
        lo.append(tk.cyl('peg', 0.8, x0 + w / 2 - 0.4, x0 + w / 2 + 1.5, n=5, at=(y, h / 2), axis='X', bevel=0, segs=0))
    kit.connector(F, 'in', (x0 - w / 2, 0.0, 0.0), bone=None)
    kit.connector(F, 'out', (x0 + w / 2, 0.0, 0.0), bone=None)
    return lo, hi


def basin(name, at, r=4.4, h=2.8, tris=110, region='basin'):
    """The yellow plastic wash basin (a hollow bowl with a rolled lip). Returns (lo, hi)."""
    prof = [(0, 0.0), (r * 0.72, 0.0), (r * 0.78, 0.25), (r * 0.98, h * 0.92), (r * 1.04, h), (r * 0.94, h * 1.02),
            (r * 0.86, h * 0.35), (r * 0.6, h * 0.2), (0, h * 0.2)]
    o = tk.lathe(name, prof, n=14, centre=at)
    lo, hi_ = tk.lowhigh(o, name, lo=0, hi=1, region=region)
    tk.decimate(lo, tris)
    return lo, hi_


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    """One cage -> (game mesh decimated to `tris` (the facet budget in facet mode), sculpt)."""
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


def box(name, size, c, region, bevel=0.4, rz=0.0):
    """A bevelled box: (lo, hi)."""
    hi_ = tk.rbox(name + '_hi', size, centre=c, bevel=bevel, segs=2)
    lo = tk.rbox(name, size, centre=c, bevel=min(bevel, 0.3), segs=1)
    if rz:
        for o in (lo, hi_):
            tk.rotate(o, rz, 'Z', pivot=c)
    tk.set_region(hi_, region)
    return lo, hi_


def rod(name, r, a, b, at, axis, region, n=12):
    """A bevelled cylinder from a to b along an axis through `at`: (lo, hi)."""
    hi_ = tk.cyl(name + '_hi', r, a, b, n=n, at=at, axis=axis, bevel=min(0.25, r * 0.3), segs=1)
    lo = tk.cyl(name, r, a, b, n=max(5, n // 2), at=at, axis=axis, bevel=0, segs=0)
    tk.set_region(hi_, region)
    return lo, hi_


def tub_water(name, size, centre, region='water'):
    """A flat block of bath water (its top is the surface): (lo, hi)."""
    hi_ = tk.rbox(name + '_hi', size, centre=centre, bevel=0.3, segs=1)
    tk.set_region(hi_, region)
    return tk.rbox(name, size, centre=centre, bevel=0, segs=0), hi_


# ------------------------------------------------------------------ paint
def paint_floor(P, pt, sh, h=H):
    """White mosaic tile with grey grout, a cobalt band down the front, the dowels, the socket holes on the left."""
    X, Y, Z = P.X, P.Y, P.Z
    tile = P.region('tile')
    P.fill('tile', pt.ramp('#e9ece6', 6, shift=0.04), tone=sh, base=0.25, brush='gloss')
    # cobalt tiles: a band along the front edge of the top and the whole front face
    top = tile & (P.on[:, :, 2] > 0.7)
    P.fill(top & (Y < -D / 2 + 2 * TILE + 0.2), pt.ramp('#2a5aa8', 6, shift=0.06), tone=sh, base=0.1, brush='gloss')
    P.fill('band', pt.ramp('#2a5aa8', 6, shift=0.06), tone=sh, base=0.05, brush='gloss')
    # a scatter of pale-blue tiles in the white (a mosaic is never one colour)
    gx, gy = np.floor(X / TILE), np.floor(Y / TILE)
    rnd = np.mod(np.sin(gx * 12.9898 + gy * 78.233) * 43758.5453, 1.0)
    P.fill(top & (Y >= -D / 2 + 2 * TILE + 0.2) & (rnd < 0.12), pt.ramp('#b8d0e4', 5, shift=0.04), tone=sh, base=0.2, brush='gloss')
    # grout: printed flat lines (crisp)
    gr = (np.abs(np.mod(X, TILE) - TILE / 2) > TILE / 2 - 0.16) | (np.abs(np.mod(Y, TILE) - TILE / 2) > TILE / 2 - 0.16)
    gz = np.abs(np.mod(Z, TILE) - TILE / 2) > TILE / 2 - 0.16
    P.fill(top & gr, pt.ramp('#9aa09c', 4, shift=0.03), tone=sh, base=0.0, brush=False)
    front = (tile | P.region('band')) & (P.on[:, :, 1] < -0.6)
    P.fill(front & ((np.abs(np.mod(X, TILE) - TILE / 2) > TILE / 2 - 0.16) | gz), pt.ramp('#1c3c78', 4, shift=0.03), tone=sh, base=0.0, brush=False)
    P.fill('peg', pt.ramp('#c39a63', 5, shift=0.05), tone=sh, base=0.05, brush='wood')
    hole = tile & (P.on[:, :, 0] < -0.7) & (np.minimum(np.hypot(Y + 6.5, Z - h / 2), np.hypot(Y - 6.5, Z - h / 2)) < 0.9)
    P.flat(hole, '#2a2c2e')


def paint_basin(P, pt, sh, region='basin'):
    """Yellow wash-basin plastic, a printed blue ring inside the rim (our own: no maker's mark)."""
    P.fill(region, pt.ramp('#f2c230', 6, shift=0.07), tone=sh, base=0.15, brush='gloss')


def paint_water(P, pt, sh, region='water'):
    """Bath water: a clear green-blue, light ripples across the top."""
    X, Y = P.X, P.Y
    P.fill(region, pt.ramp('#5fb4b8', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'gloss', 'flow': 'along', 'axis': (1, 0.3, 0)})
    w = P.region(region) & (P.on[:, :, 2] > 0.7)
    rip = np.abs(np.sin(X * 0.9 + np.sin(Y * 0.7) * 1.6)) > 0.93
    P.shift(w & rip, 1)


def paint_wood(P, pt, sh, region, col='#c99a62', axis=(1, 0, 0)):
    P.fill(region, pt.ramp(col, 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': axis})
