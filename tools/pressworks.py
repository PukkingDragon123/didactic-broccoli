"""pressworks.py: the print studio behind every poster and gacha card (POSTER-3, research in docs/ref/posters.md).

One studio, one set of rules (what the 1930s rail posters, Showa matchbox labels, riso and screen print teach):
  * Each piece is printed in 2-3 INKS on cream PAPER (the paper is a colour). One palette per piece, chosen on
    purpose (PALETTES below); overlaps are real overprints (the two inks multiplied), never a new free colour.
  * Paper margin all round (a riso / offset sheet never bleeds), wider at the foot, where the printer's imprint sits.
  * Photographs are SCREENED in the piece's own inks (a pixel clustered-dot halftone, 45 degrees), so they belong to
    the print: a one-ink halftone, or a duotone (a flat or screened underprint + a second screened ink).
  * Type: one hand-pixelled headline (tools/letterforms.py), the studio's figures for numbers, the game's 5 x 7
    face (b5) for labels and Micro 5 for the small print. Flat ink only: no outline, shadow, glow, gradient, bevel.
  * Few elements, big scale contrast, ink fields and rules instead of stickers, bursts and badges.
Toy renders (the products themselves) stay in their true colours on top of the print.
"""
import numpy as np
from PIL import Image
from printkit import source, cover, rgb

PAPER = 0xf1e7d0  # the studio's cream stock (aged further by tools/paperkit.py)

# The owner's boards, sampled (k-means over each reference card, scratchpad p3/km2.py): bright, clean candy
# colours, used the way those cards use them (field, logo, badges, ink). Name: the card each set comes from.
BOARD = {
    'kanikan': dict(red=0xe23929, white=0xfcfaf8, lemon=0xfae90c, ink=0x2a262d, sky=0x43a7d0),       # festival
    'pipe-otter': dict(green=0x087e24, sky=0x43a7d0, white=0xf3f8f7, lemon=0xfae90c, ink=0x2a262d),  # museum
    'tako-winner': dict(lemon=0xfbe80b, orange=0xe8682a, red=0xe43827, cream=0xf4ebbb, ink=0x753f29), # kaiju
    'pudding': dict(teal=0x3a9b96, yellow=0xe1c235, sky=0x86c1cd, white=0xf4f4f3, ink=0x3a2a20, red=0xe43827),  # secret
    'morokoshi': dict(yellow=0xfae90c, leaf=0x579d44, cream=0xfafae1, ink=0x834619, red=0xe23929),  # henshin card
    'kaju-dragon': dict(white=0xf8f5e6, forest=0x285726, mustard=0xd59c2a, red=0xe23929, sky=0x43a7d0, ink=0x2a262d),  # yomise card
}

PALETTES = {  # name: inks (warm, slightly muted Showa print colours; deliberate value contrast)
    'bon-night': dict(paper=PAPER, navy=0x232c4a, marigold=0xe2a53c, verm=0xd2553a),       # summer festival
    'specimen': dict(paper=PAPER, teal=0x2c5e58, ochre=0xd6a456, sumi=0x2b2622),            # museum
    'tokusatsu': dict(paper=PAPER, salmon=0xe9907a, navy=0x26304d, jade=0x3d8c7c),           # kaiju promo
    'vault': dict(paper=PAPER, plum=0x2c2335, gold=0xcf9f45),                                # secret promo
    'schoolroom': dict(paper=PAPER, cobalt=0x2f4478, pencil=0xe4ad3e, redpen=0xc9472f),      # henshin card
    'night-stall': dict(paper=PAPER, deep=0x173a44, lantern=0xe9845a, aqua=0x9fcfc2),        # yomise card
}


def mul(a, b):
    """The colour where ink b overprints ink a (transparent inks multiply)."""
    a, b = rgb(a), rgb(b)
    return tuple(int(round(a[i] * b[i] / 255)) for i in range(3))


def tint(ink, k, paper=PAPER):
    """A flat screen tint of an ink as the eye mixes it with the paper (only for type-free fields)."""
    a, b = rgb(paper), rgb(ink)
    return tuple(int(round(a[i] + (b[i] - a[i]) * k)) for i in range(3))


# ------------------------------------------------------------------ the halftone screen
def _cell(T):
    """A 45-degree clustered-dot threshold tile (T x T px, two dots per tile): ranks 0..1, centre first."""
    yy, xx = np.mgrid[0:T, 0:T] + 0.5
    cs = [(T / 4, T / 4), (3 * T / 4, 3 * T / 4), (T / 4 + T, 3 * T / 4 - T)]
    d = np.full((T, T), 1e9); own = np.zeros((T, T), int)
    for k, (cx, cy) in enumerate([(T / 4, T / 4), (3 * T / 4, 3 * T / 4)]):
        for ox in (-T, 0, T):
            for oy in (-T, 0, T):
                dd = (xx - cx - ox) ** 2 + (yy - cy - oy) ** 2 + 1e-3 * np.arctan2(yy - cy - oy, xx - cx - ox)
                m = dd < d; d[m] = dd[m]; own[m] = k
    thr = np.zeros((T, T))
    for k in (0, 1):
        idx = np.argwhere(own == k); order = np.argsort(d[own == k])
        for r, i in enumerate(order): thr[tuple(idx[i])] = (r + 0.5) / len(idx)
    return thr


_TILES = {}
def screen(w, h, T=4, ox=0, oy=0):
    if T not in _TILES: _TILES[T] = _cell(T)
    t = _TILES[T]
    return np.tile(t, (h // T + 2, w // T + 2))[oy % T:oy % T + h, ox % T:ox % T + w]


def tone(ref, w, h, f=(0.5, 0.5, 1.0), lo=0.0, hi=1.0, gamma=1.0, chan=None, invert=False, flip=False):
    """A photo cropped into place as ink coverage 0..1 (0 = paper). lo / hi: the black and white points of the
    photo's lightness; gamma > 1 lightens the mid tones; chan: weight the lightness by (r, g, b) like a filter."""
    im = cover(source(ref), int(w), int(h), f)
    if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
    a = np.asarray(im, np.float32) / 255
    wts = np.array(chan or (0.3, 0.59, 0.11), np.float32); wts /= wts.sum()
    L = (a * wts).sum(2)
    L = np.clip((L - lo) / max(1e-3, hi - lo), 0, 1) ** (1 / gamma)
    cov = L if invert else 1 - L
    return cov


def dots(cov, T=4, ox=0, oy=0):
    """Coverage -> the printed dots (bool), on the 45-degree screen."""
    h, w = cov.shape
    return cov > screen(w, h, T, ox, oy)


def stamp(S, m, x, y, ink, over=False):
    """Print a bool mask in an ink at (x, y). over: overprint (multiply onto what is already there)."""
    x, y = int(x), int(y)
    h, w = m.shape
    a = np.asarray(S.im).copy()
    X0, Y0 = max(0, x), max(0, y); X1, Y1 = min(S.w, x + w), min(S.h, y + h)
    if X1 <= X0 or Y1 <= Y0: return
    mm = m[Y0 - y:Y1 - y, X0 - x:X1 - x]
    sub = a[Y0:Y1, X0:X1, :3]
    if over: sub[mm] = (sub[mm].astype(np.float32) * np.array(rgb(ink), np.float32) / 255).round().astype(np.uint8)
    else: sub[mm] = rgb(ink)
    a[Y0:Y1, X0:X1, :3] = sub
    S.im = Image.fromarray(a); S.d = __import__('PIL.ImageDraw', fromlist=['Draw']).Draw(S.im)


def halftone(S, ref, x, y, w, h, ink, T=4, over=False, clip=None, **tk):
    """A one-ink halftone of a photo into the box. clip: a bool mask (h x w) limiting where it prints.
    Returns the coverage (for a second ink's plate)."""
    cov = tone(ref, w, h, **tk)
    m = dots(cov, T, int(x), int(y))
    if clip is not None: m &= clip
    stamp(S, m, x, y, ink, over)
    return cov


def region(w, h, poly):
    """A polygon (box-local points) as a bool mask."""
    from PIL import ImageDraw
    im = Image.new('L', (int(w), int(h)), 0); ImageDraw.Draw(im).polygon([(int(round(a)), int(round(b))) for a, b in poly], fill=255)
    return np.asarray(im) > 0


def imprint(S, text, col, y=None):
    """The printer's line in the foot margin (every piece the studio prints carries it)."""
    S.text(text, S.w // 2, (S.h - 2) if y is None else y, 'micro5', 1, col, anchor='mb')
