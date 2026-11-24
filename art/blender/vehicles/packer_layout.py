"""Shared layout of the packer truck's paint atlas (art/blender/vehicles/packer.py models the truck in Blender,
packer_paint.py paints the atlas). The painted shell is mapped by projection: every face takes the view its normal
faces most (both sides, front, back, top, underside), so the atlas is a set of hand-painted elevations at 256 px/m and
the livery, lamps, seams and wear sit exactly where they are on the truck.

Game frame: metres, x to the truck's left, y up, z forward (the cab), y = 0 the road."""
P = 256                      # px per metre (docs/ART.md: close-up vehicles)
PB = 64                      # the underside
ATLAS = 2048
Z0, Z1 = -2.74, 2.58         # the painted extent
Y0, Y1 = 0.16, 2.40
X0, X1 = -0.95, 0.95
ZW, YH, XW = round((Z1 - Z0) * P), round((Y1 - Y0) * P), round((X1 - X0) * P)
VIEWS = {
    'px': (0, 0, ZW, YH),                        # the left side (+x), seen from outside: the cab on the left
    'nx': (0, YH + 8, ZW, YH),                   # the right side (-x): the cab on the right
    'top': (0, 2 * (YH + 8), ZW, XW),            # from above, the cab on the left
    'pz': (ZW + 8, 0, XW, YH),                   # the front
    'nz': (ZW + 8, YH + 8, XW, YH),              # the back
    'bot': (ZW + 8, 2 * (YH + 8), round((Z1 - Z0) * PB), round((X1 - X0) * PB)),
    # at half density: what faces forward behind the cab (the body's front, the ribs) and back ahead of the hopper
    'pz2': (ZW + 8, 2 * (YH + 8) + round((X1 - X0) * PB) + 8, XW // 2, YH // 2),
    'nz2': (ZW + 8 + XW // 2 + 8, 2 * (YH + 8) + round((X1 - X0) * PB) + 8, XW // 2, YH // 2),
}


def px(view, x, y, z):
    """Game point -> atlas pixel (column, row from the top) in a view."""
    ox, oy, _, _ = VIEWS[view]
    if view == 'px': return ox + (Z1 - z) * P, oy + (Y1 - y) * P
    if view == 'nx': return ox + (z - Z0) * P, oy + (Y1 - y) * P
    if view == 'pz': return ox + (x - X0) * P, oy + (Y1 - y) * P
    if view == 'nz': return ox + (X1 - x) * P, oy + (Y1 - y) * P
    if view == 'top': return ox + (Z1 - z) * P, oy + (X1 - x) * P
    if view == 'pz2': return ox + (x - X0) * P / 2, oy + (Y1 - y) * P / 2
    if view == 'nz2': return ox + (X1 - x) * P / 2, oy + (Y1 - y) * P / 2
    return ox + (z - Z0) * PB, oy + (x - X0) * PB


def view_of(n, c=None):
    """The view a face with normal n and centre c (game frame) is painted in."""
    ax = max(range(3), key=lambda i: abs(n[i]))
    if ax == 1: return 'top' if n[1] > 0 else 'bot'
    if ax == 0: return 'px' if n[0] > 0 else 'nx'
    if n[2] > 0: return 'pz2' if c is not None and c[2] < 2.0 else 'pz'
    return 'nz2' if c is not None and c[2] > -1.95 else 'nz'


# the tiling material swatches (128 px = 0.5 m, repeat-wrapped) and the wheel sheet
TILE = 128
WHEEL = (256, 320)           # the disc (0.8 m across) on top, a tread strip (4 repeats round the tyre) under it
