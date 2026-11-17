"""Gacha Garage figure kit for lowpix: writes one lowpix JSON spec per toy figure.

Units are millimetres (1 model unit = 1 mm), Y up, the figure faces +Z and stands on y = 0, painted at DENS texels
per mm. A figure is built with a Fig: parts (lowpix lofts, chamfered boxes, prisms, cards), colour ramps (muted,
hue-shifted), paint styles that read as real factory-painted capsule toys (PVC sheen, matte vinyl, photo-bashed
cloth / fur / wood / metal / clay from CC0 Poly Haven photos in art/lowpix/photos), the marks of a real toy (mould
parting lines, offset tampo prints, paint bleed, a gate nub and a maker's mark under the base) and clips.

Game metadata (which parts use the gloss / metal / glow / clear material, gimmick points, clip roles) goes to a
sidecar <key>.meta.json next to the spec; the pack step (art/lowpix/figures/pack.mjs) folds it into the manifest.
"""
import colorsys
import json
import math
import os
import sys

LOWPIX = os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles")
sys.path.insert(0, LOWPIX)
from lowpix.palette import make_ramp  # noqa: E402

DENS = 6.0  # THE texel density of the whole line (px per mm), for specs and converted models alike
BASE_H = 3.0  # a base, where a figure needs one (most stand on their own), is this thick
# lowpix convert settings every real model gets (the finish of the line); a figure may only change tris / ramps / smooth
CONVERT = {"style": "pixel-hd", "density": DENS, "steps": 7, "light": 1.0, "detail": 0.9, "grain": 0.25, "spread": 0.55}
PHOTO = "art/lowpix/photos/"

# ------------------------------------------------------------------ colour


def _hex(c):
    if isinstance(c, int):
        return "#%06x" % c
    return c if c.startswith("#") else "#" + c


def mute(c, k=0.14, warm=0.02):
    """Pull a colour a little toward grey (natural factory paint, not candy) and warm it a touch."""
    c = _hex(c)
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    s *= 1 - k
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    r, g, b = min(1, r + warm), g, max(0, b - warm * 0.5)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def ramp(c, steps=7, hue=20, sat=0.12, spread=0.55, k=0.1):
    return make_ramp(mute(c, k), steps=steps, hue_shift=hue, sat_shift=sat, spread=spread)


# ------------------------------------------------------------------ paint styles
# Ramps are 7 steps (index 3 = the base colour). Every style leaves `ramp`/`tone` to the part.


def _photo(pid, scale, amount, **kw):
    d = {"id": "photo", "op": "photo", "src": PHOTO + pid, "scale": scale, "amount": amount}
    d.update(kw)
    return d


GLOSS = {"id": "gloss", "op": "gloss", "post": True, "dash": True, "length": 3, "density": 0.12, "shift": 1.0}
RIM = {"light": 1, "dark": 1, "outline": "dark"}


def _st(*layers, **kw):
    d = {"dither": 0, "rim": dict(RIM), "layers": list(layers)}
    d.update(kw)
    return d


def _mottle(scale=3.0, amount=0.1):
    """Paint-film mottling: soft blotches a few mm across (never per-texel speckle)."""
    return {"id": "mottle", "op": "noise", "scale": scale, "amount": amount}


SHEEN = {"id": "sheen", "op": "fill", "shift": 0.75, "min_light": 0.8}
REF = {"id": "ref", "op": "fill", "shift": -0.3, "min_light": -0.1, "max_light": 0.22}
# The line's one finish (CLAUDE.md, the toy rule): hand-painted pixel-art PVC. Every style is the same ramp shading,
# light and rims, with only structured detail (grain, boards, ribs) and soft mottling on top: no photo noise, no
# speckle, no random sparkle, so specs sit beside the converted models (lowpix pixel-hd) without a seam.
STYLES = {
    "pvc": _st(_mottle(2.0, 0.3), SHEEN, REF, GLOSS),      # injection-moulded, factory-painted PVC with a soft sheen
    "matte": _st(_mottle(2.0, 0.32)),                        # soft vinyl / flat paint
    "skin": _st(_mottle(3.0, 0.08), {"id": "sheen", "op": "fill", "shift": 0.45, "min_light": 0.84}),
    "cloth": _st(_mottle(2.4, 0.14)),
    "denim": _st(_mottle(2.4, 0.14)),
    "velvet": _st(_mottle(2.0, 0.18), {"id": "sheen", "op": "fill", "shift": 0.5, "min_light": 0.82}),
    "fur": _st(_mottle(2.2, 0.16)),
    "wood": _st({"id": "grain", "op": "stripes", "axis": "x", "period": 2.2, "width": 0.18, "wobble": 1.2, "shift": -0.45},
                _mottle(5.0, 0.22), {"id": "sheen", "op": "fill", "shift": 0.45, "min_light": 0.82}),
    "plank": _st({"id": "grain", "op": "stripes", "axis": "x", "period": 1.8, "width": 0.3, "wobble": 0.8, "shift": -0.6},
                 {"id": "boards", "op": "stripes", "axis": "z", "period": 6.0, "width": 0.06, "shift": -1.2}, _mottle(4.0, 0.15)),
    "metal": _st(_mottle(2.2, 0.32), {"id": "sheen", "op": "fill", "shift": 1.1, "min_light": 0.7},
                 {"id": "ref", "op": "fill", "shift": -0.8, "min_light": -0.1, "max_light": 0.3}),
    "tin": _st(_mottle(2.0, 0.32), {"id": "sheen", "op": "fill", "shift": 0.9, "min_light": 0.74}, GLOSS),
    "bark": _st({"id": "furrows", "op": "stripes", "axis": "z", "period": 1.4, "width": 0.35, "wobble": 0.9, "shift": -0.8},
                _mottle(2.0, 0.25)),
    "rock": _st(_mottle(2.6, 0.28), {"id": "facets", "op": "patches", "scale": 3.0, "threshold": 0.62, "shift": -0.6}),
    "stone": _st(_mottle(1.8, 0.38)),
    "leafy": _st(_mottle(1.8, 0.3)),
    "rust": _st(_mottle(2.5, 0.2), {"id": "rust", "op": "patches", "scale": 2.5, "threshold": 0.6, "shift": -0.7}),
    "clay": _st(_mottle(3.0, 0.15)),
    "food": _st(_mottle(2.0, 0.15), {"id": "sheen", "op": "fill", "shift": 0.4, "min_light": 0.85}),
    "glaze": _st(_mottle(1.8, 0.38), {"id": "sheen", "op": "fill", "shift": 0.9, "min_light": 0.72}, GLOSS),
    "paper": _st(_mottle(1.6, 0.4), {"id": "fibre", "op": "stripes", "axis": "x", "period": 1.4, "width": 0.25, "wobble": 1.5, "shift": -0.5}),
    # clear tinted plastic (drawn with the game's glass material): a bright rim and inner depth
    "clear": {"dither": 0, "light": 0.6, "rim": {"light": 2, "dark": 1, "outline": "none"}, "layers": [
        {"id": "depth", "op": "gradient", "axis": "y", "amount": -0.8},
        {"id": "sheen", "op": "fill", "shift": 1.4, "min_light": 0.7}]},
    "glow": {"dither": 0, "light": 0.15, "rim": {"light": 1, "dark": 0}},
    "flat": {"dither": 0, "light": 0.5, "rim": {"light": 0, "dark": 0}},
    "card": {"dither": 0, "light": 0.0, "rim": {"light": 0, "dark": 0}},
}
BRUSH_MARKS = {}
GAME_MAT = {"pvc": "gloss", "glaze": "gloss", "tin": "gloss", "metal": "metal", "clear": "glass", "glow": "glow"}

# shared ramps every figure has
BASE_RAMPS = {
    "ink": ["#141019", "#241c26", "#3a2c34", "#54424a", "#706068"],
    "white": ramp("#f1ece2", hue=10, k=0.0, spread=0.85),
    "steel": ramp("#8c8f96", k=0.0),
    "blush": ramp("#e88a8a", k=0.1),
    "moss": ramp("#5a7a3a", k=0.2),
}


# ------------------------------------------------------------------ pixel art helpers


class Raster:
    """A tiny char raster for stamp / card art ('.' = empty)."""

    def __init__(s, w, h):
        s.w, s.h = w, h
        s.g = [["."] * w for _ in range(h)]

    def set(s, x, y, ch):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < s.w and 0 <= y < s.h:
            s.g[y][x] = ch

    def ell(s, cx, cy, rx, ry, ch, only=None):
        for y in range(s.h):
            for x in range(s.w):
                dx, dy = (x + 0.5 - cx) / max(rx, 0.01), (y + 0.5 - cy) / max(ry, 0.01)
                if dx * dx + dy * dy <= 1.0 and (only is None or s.g[y][x] in only):
                    s.g[y][x] = ch

    def rect(s, x0, y0, x1, y1, ch):
        for y in range(max(0, int(y0)), min(s.h, int(y1))):
            for x in range(max(0, int(x0)), min(s.w, int(x1))):
                s.g[y][x] = ch

    def line(s, pts, ch, w=1):
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
            for i in range(n + 1):
                t = i / n
                x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
                for ox in range(w):
                    for oy in range(w):
                        s.set(x - w / 2 + 0.5 + ox, y - w / 2 + 0.5 + oy, ch)

    def arc(s, cx, cy, rx, ry, a0, a1, ch, w=1, n=24):
        pts = [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
        s.line(pts, ch, w)

    def blit(s, rows, x0, y0):
        for y, r in enumerate(rows):
            for x, ch in enumerate(r):
                if ch not in ". ":
                    s.set(x0 + x, y0 + y, ch)

    def rows(s):
        return ["".join(r) for r in s.g]


_F5 = None


def _font5():
    global _F5
    if _F5 is None:
        import re
        src = open(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "src", "gfx", "font5x7.js"), encoding="utf8").read()
        body = src[src.index("const GLYPHS"):src.index("};", src.index("const GLYPHS"))]
        _F5 = {}
        for m in re.finditer(r"(?:'([^']+)'|\"([^\"]+)\"|([A-Z0-9]))\s*:\s*'([.#|]+)'", body):
            ch = m.group(1) or m.group(2) or m.group(3)
            _F5[ch] = m.group(4).split("|")
    return _F5


def text5(s, ch="#", gap=1):
    """Rows of a 5x7 bitmap text line (capitals)."""
    F = _font5()
    s = s.upper()
    rows = [""] * 7
    for i, c in enumerate(s):
        g = F.get(c) or F.get("?")
        for y in range(7):
            rows[y] += g[y].replace("#", ch) + ("." * gap if i < len(s) - 1 else "")
    return rows


def text3(s, ch="#"):
    """A 3x5 micro font (digits, capitals) for maker marks and tiny tags."""
    G = {
        "A": "###|#.#|###|#.#|#.#", "B": "##.|#.#|##.|#.#|##.", "C": "###|#..|#..|#..|###", "D": "##.|#.#|#.#|#.#|##.",
        "E": "###|#..|##.|#..|###", "F": "###|#..|##.|#..|#..", "G": "###|#..|#.#|#.#|###", "H": "#.#|#.#|###|#.#|#.#",
        "I": "###|.#.|.#.|.#.|###", "J": "..#|..#|..#|#.#|###", "K": "#.#|#.#|##.|#.#|#.#", "L": "#..|#..|#..|#..|###",
        "M": "#.#|###|###|#.#|#.#", "N": "##.|#.#|#.#|#.#|#.#", "O": "###|#.#|#.#|#.#|###", "P": "###|#.#|###|#..|#..",
        "Q": "###|#.#|#.#|###|..#", "R": "###|#.#|##.|#.#|#.#", "S": "###|#..|###|..#|###", "T": "###|.#.|.#.|.#.|.#.",
        "U": "#.#|#.#|#.#|#.#|###", "V": "#.#|#.#|#.#|#.#|.#.", "W": "#.#|#.#|###|###|#.#", "X": "#.#|#.#|.#.|#.#|#.#",
        "Y": "#.#|#.#|.#.|.#.|.#.", "Z": "###|..#|.#.|#..|###", "0": "###|#.#|#.#|#.#|###", "1": ".#.|##.|.#.|.#.|###",
        "2": "###|..#|###|#..|###", "3": "###|..#|###|..#|###", "4": "#.#|#.#|###|..#|..#", "5": "###|#..|###|..#|###",
        "6": "###|#..|###|#.#|###", "7": "###|..#|..#|.#.|.#.", "8": "###|#.#|###|#.#|###", "9": "###|#.#|###|..#|###",
        " ": "..|..|..|..|..", ".": ".|.|.|.|#", "-": "...|...|###|...|...", "(": ".#|#.|#.|#.|.#", ")": "#.|.#|.#|.#|#.",
        "©": "###|#.#|#..|#.#|###", "/": "..#|..#|.#.|#..|#..", "!": "#|#|#|.|#", "'": "#|#|.|.|.",
    }
    rows = [""] * 5
    s = s.upper()
    for i, c in enumerate(s):
        g = G.get(c, G[" "]).split("|")
        for y in range(5):
            rows[y] += g[y].replace("#", ch) + ("." if i < len(s) - 1 else "")
    return rows


def text_jp(s, px=10, ch="#"):
    """Rows of a kana / kanji line rendered from DotGothic16 at px (no anti-aliasing)."""
    from PIL import Image, ImageDraw, ImageFont
    root = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
    fp = os.path.join(root, "node_modules", "@fontsource", "dotgothic16", "files", "dotgothic16-japanese-400-normal.woff2")
    try:
        font = ImageFont.truetype(fp, px)
    except Exception:
        font = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", px)
    w = int(font.getlength(s)) + 2
    im = Image.new("1", (w, px + 4), 0)
    ImageDraw.Draw(im).text((1, 0), s, font=font, fill=1)
    bb = im.getbbox() or (0, 0, 1, 1)
    im = im.crop(bb)
    return ["".join(ch if im.getpixel((x, y)) else "." for x in range(im.width)) for y in range(im.height)]


def outline_rows(rows, ch="o", src=None):
    """Add a 1px outline (char ch) around the lit pixels of rows."""
    h, w = len(rows), max(len(r) for r in rows)
    g = [list(r.ljust(w, ".")) for r in rows]
    G = [["."] * (w + 2) for _ in range(h + 2)]
    for y in range(h):
        for x in range(w):
            G[y + 1][x + 1] = g[y][x]
    out = [r[:] for r in G]
    for y in range(h + 2):
        for x in range(w + 2):
            if G[y][x] == ".":
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h + 2 and 0 <= xx < w + 2 and G[yy][xx] not in ". " and (src is None or G[yy][xx] in src):
                        out[y][x] = ch
                        break
    return ["".join(r) for r in out]


def scale_rows(rows, k):
    return ["".join(c * k for c in r) for r in rows for _ in range(k)]


# ------------------------------------------------------------------ faces (tampo-printed)


def eye_art(kind="bead", w=6, h=8, iris="eye", glint=True, look=0):
    """Eye stamp rows + key. The colour print sits 1px off the black like a real tampo print."""
    key = {"k": "ink:0", "d": "ink:1", "w": "white:-1", "s": "white:3", "i": f"{iris}:2", "j": f"{iris}:4", "l": f"{iris}:5"}
    R = Raster(w + 2, h + 2)
    cx, cy = (w + 2) / 2, (h + 2) / 2
    if kind == "bead":
        R.ell(cx, cy, w / 2, h / 2, "k")
        R.ell(cx + 0.5, cy + h * 0.12, w * 0.3, h * 0.28, "d")
        if glint:
            R.ell(cx - w * 0.18 + look, cy - h * 0.2, max(0.8, w * 0.17), max(0.8, h * 0.13), "w")
            R.set(cx + w * 0.2 + look, cy + h * 0.22, "s")
    elif kind == "anime":
        R.ell(cx, cy + 0.5, w / 2, h / 2, "s")
        R.ell(cx + 0.5 + look, cy + 1, w * 0.42, h * 0.44, "i")          # iris, printed 1px off
        R.ell(cx + 0.5 + look, cy + 1 + h * 0.12, w * 0.36, h * 0.24, "j")
        R.ell(cx + 0.5 + look, cy + 1 + h * 0.26, w * 0.26, h * 0.12, "l")
        R.ell(cx + look, cy + 0.5, w * 0.18, h * 0.2, "k")
        R.rect(0, 0, w + 2, max(1, round(h * 0.18)), "k")                # upper lash line
        R.set(w + 1, max(1, round(h * 0.18)), "k")
        R.ell(cx - w * 0.16 + look, cy - h * 0.12, max(0.9, w * 0.16), max(0.9, h * 0.11), "w")
        R.set(cx + w * 0.18 + look, cy + h * 0.2, "w")
        R.g = [["." if (c == "." or (y == 0 and x in (0, w + 1))) else c for x, c in enumerate(r)] for y, r in enumerate(R.g)]
    elif kind == "happy":
        R.arc(cx, cy + h * 0.25, w * 0.45, h * 0.45, 200, 340, "k", w=max(1, round(w / 6)))
    elif kind == "line":
        R.line([(1, cy), (w + 1, cy)], "k", w=max(1, round(h / 6)))
    elif kind == "sleepy":
        R.arc(cx, cy - h * 0.2, w * 0.45, h * 0.4, 20, 160, "k", w=max(1, round(w / 6)))
    elif kind == "angry":
        R.ell(cx, cy + 1, w / 2, h / 2.6, "k")
        R.line([(0, cy - h * 0.35), (w + 1, cy - h * 0.05)], "k", w=max(1, round(h / 7)))
        if glint:
            R.ell(cx - w * 0.15, cy + 0.3, max(0.8, w * 0.15), max(0.8, h * 0.1), "w")
    elif kind == "star":
        R.ell(cx, cy, w / 2, h / 2, "k")
        R.line([(cx, cy - h * 0.32), (cx, cy + h * 0.32)], "j")
        R.line([(cx - w * 0.32, cy), (cx + w * 0.32, cy)], "j")
        R.set(cx, cy, "w")
    elif kind == "swirl":
        R.ell(cx, cy, w / 2, h / 2, "k")
        R.ell(cx, cy, w / 2 - 1, h / 2 - 1, "w")
        R.arc(cx, cy, w * 0.25, h * 0.25, 0, 300, "k")
    elif kind == "x":
        R.line([(1, 1), (w + 1, h + 1)], "k", 1)
        R.line([(w + 1, 1), (1, h + 1)], "k", 1)
    return R.rows(), key


def mouth_art(kind="smile", w=6, h=3):
    key = {"k": "ink:1", "m": "mouth:2", "t": "mouth:4", "w": "white:-1"}
    R = Raster(w + 2, h + 2)
    cx = (w + 2) / 2
    if kind == "smile":
        R.arc(cx, 0.5, w / 2, h, 25, 155, "k")
    elif kind == "cat":
        R.arc(cx - w * 0.25, 0.8, w * 0.25, h * 0.8, 10, 170, "k")
        R.arc(cx + w * 0.25, 0.8, w * 0.25, h * 0.8, 10, 170, "k")
    elif kind == "open":
        R.ell(cx, 1.4, w / 2, h, "k")
        R.ell(cx, 1.4 + h * 0.35, w * 0.32, h * 0.55, "m")
        R.rect(0, 0, w + 2, 1.4, ".")
        R.line([(cx - w / 2, 1.4), (cx + w / 2, 1.4)], "k")
    elif kind == "grin":
        R.ell(cx, 1.2, w / 2, h, "k")
        R.rect(0, 0, w + 2, 1.2, ".")
        R.line([(cx - w / 2 + 1, 1.6), (cx + w / 2 - 1, 1.6)], "w")
    elif kind == "o":
        R.ell(cx, (h + 2) / 2, max(1.2, w * 0.3), h / 2, "k")
        R.ell(cx, (h + 2) / 2 + 0.4, max(0.6, w * 0.15), h / 4, "m")
    elif kind == "flat":
        R.line([(cx - w / 2 + 0.5, h / 2 + 1), (cx + w / 2 - 0.5, h / 2 + 1)], "k")
    elif kind == "frown":
        R.arc(cx, h + 1.5, w / 2, h, 205, 335, "k")
    elif kind == "wavy":
        pts = [(1 + i * w / 6, 1.5 + (h * 0.5 if i % 2 else 0)) for i in range(7)]
        R.line(pts, "k")
    elif kind == "teeth":
        R.rect(1, 1, w + 1, h + 1, "k")
        R.rect(2, 1, w, 1 + max(1, h // 2), "w")
    elif kind == "fang":
        R.arc(cx, 0.5, w / 2, h, 25, 155, "k")
        R.set(cx + w * 0.22, 1 + h * 0.6, "w")
        R.set(cx + w * 0.22, 2 + h * 0.6, "w")
    return R.rows(), key


# ------------------------------------------------------------------ the figure


def r1(v):
    if isinstance(v, (list, tuple)):
        return [r1(x) for x in v]
    if isinstance(v, float):
        return round(v, 3)
    return v


class Box:
    def __init__(s, x0=1e9, y0=1e9, z0=1e9, x1=-1e9, y1=-1e9, z1=-1e9):
        s.lo, s.hi = [x0, y0, z0], [x1, y1, z1]

    def add(s, b):
        s.lo = [min(a, c) for a, c in zip(s.lo, b.lo)]
        s.hi = [max(a, c) for a, c in zip(s.hi, b.hi)]
        return s

    @property
    def size(s):
        return [s.hi[i] - s.lo[i] for i in range(3)]

    @property
    def top(s):
        return s.hi[1]

    @property
    def centre(s):
        return [(s.hi[i] + s.lo[i]) / 2 for i in range(3)]

    def __repr__(s):
        return "Box(%s..%s)" % (r1(s.lo), r1(s.hi))


def _rot(pitch, yaw, roll):
    """XYZ euler (degrees) -> 3x3, the same order pack.mjs turns a model node with (three.js Euler 'XYZ')."""
    import numpy as np
    a, b, c = (math.radians(v) for v in (pitch, yaw, roll))
    Rx = np.array([[1, 0, 0], [0, math.cos(a), -math.sin(a)], [0, math.sin(a), math.cos(a)]])
    Ry = np.array([[math.cos(b), 0, math.sin(b)], [0, 1, 0], [-math.sin(b), 0, math.cos(b)]])
    Rz = np.array([[math.cos(c), -math.sin(c), 0], [math.sin(c), math.cos(c), 0], [0, 0, 1]])
    return Rx @ Ry @ Rz


class Fig:
    def __init__(s, key, name, desc="", dens=DENS, light=None, budget=6000):
        s.key, s.name = key, name
        s.spec = {
            "name": name, "description": desc, "author": "Gacha Garage (lowpix spec)", "license": "CC0-1.0",
            "density": dens, "budget": {"tris": budget, "colors": 96},
            "light": light or {"dir": [-0.5, 1.0, 0.6], "strength": 1.15, "gradient": 0.0, "ao": 0.5, "ao_height": 3.0, "ground": 0.0},
            "render": {"background": "#2a2630", "hero": [32, 20], "shadow": 0.45},
            "palette": {"ramps": dict(BASE_RAMPS)}, "styles": json.loads(json.dumps(STYLES)), "parts": [],
        }
        s.dens = dens
        s.ids = {}
        s.meta = {"mats": {}, "clips": {}, "pts": {}}
        s.anims = {}
        s._ri = 0
        s.subject = Box()  # what stands on the base (models + furniture): the base is sized to it

    # ---- colour
    def ramp(s, name, c, **kw):
        s.spec["palette"]["ramps"][name] = ramp(c, **kw)
        return name

    def c(s, c, **kw):
        """A ramp for a colour (registered once per colour + options)."""
        h = _hex(c).lstrip("#")
        name = "c" + h + ("_" + "_".join(f"{k}{v}" for k, v in sorted(kw.items())) if kw else "")
        name = name.replace(".", "p").replace("-", "m")
        if name not in s.spec["palette"]["ramps"]:
            s.spec["palette"]["ramps"][name] = ramp(c, **kw)
        return name

    def raw_ramp(s, name, cols):
        s.spec["palette"]["ramps"][name] = cols
        return name

    # ---- parts
    def add(s, pid, shape, at=(0, 0, 0), parent=None, col=None, style="pvc", tone=None, paint=None, mat=None, off=None,
            rot=None, seam=False, **kw):
        assert pid not in s.ids, pid
        p = {"id": pid, "shape": shape}
        if parent:
            p["parent"] = parent
        p["pivot"] = r1(list(at))
        if off:
            p["offset"] = r1(list(off))
        if rot:
            p["rotation"] = r1(list(rot))
        p.update({k: r1(v) for k, v in kw.items()})
        if shape != "bone":
            p["style"] = style
            pa = dict(paint or {})
            if col is not None:
                pa.setdefault("ramp", col if (isinstance(col, str) and col in s.spec["palette"]["ramps"]) else s.c(col))
            if tone is not None:
                pa["tone"] = tone
            elif "ramp" in pa and "tone" not in pa:
                pa["tone"] = 3.1
            if seam:
                L = s._extent(p)
                if L:
                    wdt = (0.55 / s.dens) / (L / 2)
                    pa.setdefault("layers", []).append({"id": "seam", "op": "band", "axis": "x" if seam == "x" else "z", "from": -wdt, "to": wdt,
                                                        "shift": -0.55, "faces": ["-front", "-back", "-end", "-start"],
                                                        "bevel": {"shadow": 1, "highlight": 1, "shadow_shift": -0.6, "highlight_shift": 0.7}})
            st0 = style if isinstance(style, str) else style[0]
            if st0 in BRUSH_MARKS and "ramp" in pa:
                pa.setdefault("brush", {"textures": {pa["ramp"]: BRUSH_MARKS[st0]}})
            p["paint"] = pa
            gm = mat or GAME_MAT.get(style if isinstance(style, str) else style[0])
            if gm:
                s.meta["mats"][pid] = gm
        s.spec["parts"].append(p)
        s.ids[pid] = p
        return p

    def _extent(s, p):
        sh = p["shape"]
        if sh in ("box", "taper"):
            return p["size"][2]
        if sh == "prism":
            return p["size"][1]
        if sh == "loft":
            zs = [r["at"][2] for r in p["rings"]]
            ws = [(r["size"][1] if isinstance(r["size"], list) else r["size"]) for r in p["rings"]]
            span = max(zs) - min(zs)
            return span if span > 2 else max(ws)
        return None

    def box(s, pid, size, at=(0, 0, 0), ch=None, **kw):
        if ch is None:
            ch = min(size[0], size[1], size[2]) * 0.16
        if ch:
            kw["chamfer"] = ch
        return s.add(pid, "box", at, size=list(size), **kw)

    def taper(s, pid, size, at=(0, 0, 0), front=None, back=None, ch=None, fshift=None, bshift=None, **kw):
        if front:
            kw["front_scale"] = list(front)
        if back:
            kw["back_scale"] = list(back)
        if fshift:
            kw["front_shift"] = list(fshift)
        if bshift:
            kw["back_shift"] = list(bshift)
        if ch:
            kw["chamfer"] = ch
        return s.add(pid, "taper", at, size=list(size), **kw)

    def prism(s, pid, size, at=(0, 0, 0), sides=10, **kw):
        return s.add(pid, "prism", at, size=list(size), sides=sides, **kw)

    def cyl(s, pid, r, h, at=(0, 0, 0), sides=12, rz=None, top=None, rot=None, **kw):
        """Upright cylinder standing on its pivot (prism along +Y)."""
        if top:
            kw["front_scale"] = [top, top] if not isinstance(top, (list, tuple)) else list(top)
        R = [-90, 0, 0] if rot is None else [rot[0] - 90, rot[1], rot[2]]
        return s.add(pid, "prism", at, size=[2 * r, 2 * (rz or r), h], sides=sides, off=[0, 0, h / 2], rot=R, **kw)

    def loft(s, pid, rings, at=(0, 0, 0), sides=8, rnd=2.6, subdiv=1, caps=(True, True), **kw):
        R = []
        for r in rings:
            q = {"at": r1(list(r[0])), "size": r1(r[1] if not isinstance(r[1], (list, tuple)) else list(r[1]))}
            if len(r) > 2 and r[2]:
                q["shift"] = r1(list(r[2]))
            R.append(q)
        return s.add(pid, "loft", at, rings=R, profile={"sides": sides, "round": rnd}, subdiv=subdiv, caps=list(caps), **kw)

    def blob(s, pid, w, h, d, at=(0, 0, 0), bottom=0.78, top=0.62, sides=10, rnd=2.4, n=5, squash=0.0, **kw):
        """A rounded upright form (mochi bodies, heads, buns): a loft up the Y axis from a flat-ish base."""
        prof = [(0.0, bottom), (0.18, 0.95), (0.45, 1.0), (0.75, 0.9), (1.0, top)] if n == 5 else \
            [(0.0, bottom), (0.12, 0.92), (0.3, 1.0), (0.55, 0.98), (0.8, 0.84), (0.94, 0.62), (1.0, top)]
        rings = [((0, h * t, 0), [w * k * (1 + squash * (0.5 - t)), d * k]) for t, k in prof]
        return s.loft(pid, rings, at, sides=sides, rnd=rnd, up=[0, 0, 1], **kw)

    def head(s, pid, w, h, d, at=(0, 0, 0), front=0.92, back=0.86, rnd=3.0, sides=8, **kw):
        """A rounded block head as a loft from back to front (the face is the 'end' cap, so stamps sit flat)."""
        rings = [((0, 0, -d / 2), [w * back * 0.88, h * back * 0.88]), ((0, 0, -d * 0.32), [w, h]),
                 ((0, 0, d * 0.28), [w, h]), ((0, -h * 0.02, d / 2), [w * front, h * front])]
        return s.loft(pid, rings, at, sides=sides, rnd=rnd, subdiv=1, **kw)

    def card(s, pid, art, key, at=(0, 0, 0), plane="xy", style="card", **kw):
        p = s.add(pid, "card", at, plane=plane, art=art, style=style, paint={"art_key": key, "ramp": "ink", "tone": 2}, **kw)
        return p

    def bone(s, pid, at=(0, 0, 0), parent=None, rot=None):
        p = {"id": pid, "shape": "bone", "pivot": r1(list(at))}
        if parent:
            p["parent"] = parent
        if rot:
            p["rotation"] = r1(list(rot))
        s.spec["parts"].append(p)
        s.ids[pid] = p
        return p

    def pt(s, name, at, parent=None):
        """A named gimmick point (toys.js): an empty joint pt_<name>."""
        s.bone("pt_" + name, at, parent)
        s.meta["pts"][name] = "pt_" + name

    # ---- paint on parts
    def stamp(s, pid, art, key, face="end", at="center", off=(0, 0), **kw):
        st = {"face": face, "at": at, "offset": [int(off[0]), int(off[1])], "art": art, "key": key}
        st.update(kw)
        s.ids[pid]["paint"].setdefault("stamps", []).append(st)

    def layer(s, pid, **L):
        s.ids[pid]["paint"].setdefault("layers", []).append(L)

    def face(s, pid, eyes="bead", ew=None, eh=None, gap=None, ey=0, mouth="smile", mw=None, mh=None, my=None, blush=True,
             brows=None, iris=None, face="end", dx=0, look=0, extra=None, mouth_ramp=None):
        """Tampo-printed face on a part's front (a loft head's 'end' cap by default), sized from the part."""
        p = s.ids[pid]
        if p["shape"] == "loft":
            last = p["rings"][-1]["size"]
            fw = (last[0] if isinstance(last, list) else last) * s.dens
        else:
            fw = p["size"][0] * s.dens
        ew = ew or max(3, round(fw * 0.085))
        eh = eh or round(ew * 1.3)
        gap = gap if gap is not None else round(fw * 0.2)
        if iris and iris not in s.spec["palette"]["ramps"]:
            s.ramp("eye", iris)
        elif "eye" not in s.spec["palette"]["ramps"]:
            s.ramp("eye", "#5a3a28")
        if mouth_ramp or "mouth" not in s.spec["palette"]["ramps"]:
            s.ramp("mouth", mouth_ramp or "#b8484a")
        art, key = eye_art(eyes, ew, eh, look=look)
        art2, _ = eye_art(eyes, ew, eh, look=-look if eyes == "anime" else look)
        if eyes in ("anime",):
            art2 = [r[::-1] for r in art2]
        s.stamp(pid, art, key, face, off=(dx - gap, ey))
        s.stamp(pid, art2, key, face, off=(dx + gap, ey))
        if brows:
            bw = ew + 2
            for sgn in (-1, 1):
                R = Raster(bw + 2, 4)
                if brows == "angry":
                    R.line([(1, 0.5 if sgn < 0 else 2.5), (bw, 2.5 if sgn < 0 else 0.5)], "k", 1)
                elif brows == "sad":
                    R.line([(1, 2.5 if sgn < 0 else 0.5), (bw, 0.5 if sgn < 0 else 2.5)], "k", 1)
                elif brows == "thick":
                    R.rect(1, 1, bw + 1, 3, "k")
                else:
                    R.arc((bw + 2) / 2, 3, bw / 2, 2, 200, 340, "k")
                s.stamp(pid, R.rows(), {"k": "ink:1"}, face, off=(dx + sgn * gap, ey - eh // 2 - 4))
        if mouth:
            mw = mw or max(4, round(fw * 0.12))
            mh = mh or max(2, round(mw * 0.45))
            art, key = mouth_art(mouth, mw, mh)
            s.stamp(pid, art, key, face, off=(dx, (my if my is not None else ey + eh // 2 + max(3, round(fw * 0.07)))))
        if blush:
            bw = max(3, round(ew * 0.9))
            R = Raster(bw, 2)
            R.rect(0, 0, bw, 2, "b")
            R.set(0, 0, "."), R.set(bw - 1, 1, ".")
            R.set(1, 0, "h")
            for sgn in (-1, 1):
                s.stamp(pid, R.rows(), {"b": "blush:3", "h": "blush:4"}, face, off=(dx + sgn * (gap + ew // 2 + 1), ey + eh // 2 + 1))
        if extra:
            for e in extra:
                s.stamp(pid, *e)

    # ---- display base (with the marks of a real toy underneath)
    def base(s, pid="base", r=14, h=3, col="#3a3a44", at=(0, 0, 0), sides=12, style="pvc", trim=None, label=None, label_jp=None,
             maker="KAPUKAPU", year="1999", rz=None, top_inset=True, plate=None):
        R = s.c(col)
        s.cyl(pid, r, h, at, sides=sides, rz=rz, col=R, style=style, tone=2.6, top=0.97)
        # gate nub on the side, sink mark on top, maker's mark debossed underneath
        s.stamp(pid, ["dd", "hd"], {"d": f"{R}:1", "h": f"{R}:4"}, face="side%d" % (sides // 2), at="center")
        mk = text3(f"(C){maker} {year}")
        mk2 = text3("MADE IN JAPAN")
        w = max(len(mk[0]), len(mk2[0]))
        rows = [r_.center(w, ".") for r_ in mk] + ["." * w] + [r_.center(w, ".") for r_ in mk2]
        s.stamp(pid, rows, {"#": f"{R}:1"}, face="back", at="center")
        s.stamp(pid, ["." * w] + [r_.replace("#", "h") for r_ in rows], {"h": f"{R}:4"}, face="back", at="center", off=(0, 0))
        if trim:
            s.layer(pid, id="trim", op="band", axis="z", **{"from": 0.55, "to": 1.0}, ramp=s.c(trim), tone=3.0, faces=["sides"],
                    bevel={"shadow": 1, "highlight": 1})
        if top_inset:
            s.cyl(pid + "_top", r * 0.86, 0.8, (0, h, 0), sides=sides, rz=(rz * 0.86 if rz else None), col=R, style=style, tone=3.3, parent=None, hide=["back"])
        if label or label_jp:
            art = text_jp(label_jp, 9) if label_jp else text5(label)
            s.stamp(pid, art, {"#": "white:-2"}, face="side0", at="center")

    def square_base(s, pid="base", w=30, d=24, h=3.4, col="#3a3a44", at=(0, 0, 0), style="pvc", maker="KAPUKAPU", year="1999", photo=None):
        R = s.c(col)
        s.box(pid, [w, h, d], (at[0], at[1] + h / 2, at[2]), ch=0.8, col=R, style=style, tone=2.7)
        mk = text3(f"(C){maker} {year}") + ["." * 3] + text3("MADE IN JAPAN")
        wd = max(len(r_) for r_ in mk)
        mk = [r_.center(wd, ".") for r_ in mk]
        s.stamp(pid, mk, {"#": f"{R}:1"}, face="bottom", at="center")
        s.stamp(pid, ["dd", "hd"], {"d": f"{R}:1", "h": f"{R}:4"}, face="right", at="center")

    # ---- real models (Sketchfab / Poly Haven), converted by lowpix and merged in by pack.mjs
    def model(s, name, src, h=None, w=None, d=None, L=None, at=(0, 0, 0), yaw=0, pitch=0, roll=0, tris=5000, mat="matte",
              drop=None, keep=None, box=None, level=False, cut=0.0, rest=False, ramps=None, smooth=None, dark=False, **bad):
        """A real model, converted at its final size so its texels are the line's DENS px/mm: scaled (before
        conversion, never after) to the largest size that keeps it, turned by pitch/yaw/roll (degrees, XYZ), within
        h (height), w (x), d (z) and L (its longest side across the shelf) mm, and stood with the bottom centre of its turned bounds at `at`.
        No recolouring: a recolour is a finish of a figure (the game's finish system), never a new entry.
        Returns the placed bounds (Box)."""
        assert not bad, f"model(): unsupported {sorted(bad)} (one finish for the line; recolor / fit are gone)"
        import numpy as np
        from sources import subject_dims
        w0, h0, d0 = subject_dims(src, drop, keep, box, level, cut)
        R = _rot(pitch, yaw, roll)
        C = np.array([[x, y, z] for x in (-w0 / 2, w0 / 2) for y in (0, h0) for z in (-d0 / 2, d0 / 2)]) @ R.T
        ext = C.max(0) - C.min(0)
        k = min(v / e for v, e in ((w, ext[0]), (h, ext[1]), (d, ext[2]), (L, max(ext[0], ext[2]))) if v)
        lo, hi = C.min(0) * k, C.max(0) * k
        pos = [at[0] - (lo[0] + hi[0]) / 2, at[1] - lo[1], at[2] - (lo[2] + hi[2]) / 2]
        m = {"name": name, "src": src, "height": round(h0 * k, 3), "pos": r1(pos), "yaw": yaw, "pitch": pitch, "roll": roll,
             "tris": tris, "mat": mat}
        opts = {}
        if ramps:
            opts["ramps"] = ramps
        if smooth:
            opts["smooth"] = smooth
        if dark:  # black lacquer / dark plastic: a narrower ramp so the lit side stays dark, not gold
            opts["spread"] = 0.3
        if opts:
            m["opts"] = opts
        if drop:
            m["drop"] = list(drop)
        if keep:
            m["keep"] = list(keep)
        if box:
            m["box"] = list(box)
        if level:  # a scan shot on a slope: stood level on the shelf
            m["level"] = 2  # (the levelling method version: part of the conversion key)
        if cut:  # an uneven scanned underside sliced flat (this share of the height), so it sits without rocking
            m["cut"] = cut
        if rest:  # settled after conversion the way it lies on a shelf (make.py: rest_R, then re-stood at `at`)
            m["rest"] = True
            m["at"] = r1(list(at))
        s.meta.setdefault("models", []).append(m)
        box = Box(at[0] - (hi[0] - lo[0]) / 2, at[1], at[2] - (hi[2] - lo[2]) / 2,
                  at[0] + (hi[0] - lo[0]) / 2, at[1] + hi[1] - lo[1], at[2] + (hi[2] - lo[2]) / 2)
        s.subject.add(box)
        return box

    def prop(s, *box):
        """Count a spec part (furniture the subject stands on, a rod) into the subject bounds the base is sized to."""
        s.subject.add(Box(*box))

    def model_clip(s, node, kind, length=2.0, amp=None, axis="y"):
        """A gimmick clip on a converted model's node (pack.mjs bakes it): turn, hop, nod, spin, wobble, slide."""
        s.meta["model_clip"] = {"node": node, "kind": kind, "length": length, "amp": amp, "axis": axis}
        s.meta["clips"]["gimmick"] = "gimmick"

    # ---- clips
    def clip(s, name, length, tracks, loop=False, role=None):
        s.anims[name] = {"length": length, "loop": loop, "tracks": tracks}
        if role:
            s.meta["clips"][role] = name

    # ---- output
    def write(s, out_dir):
        os.makedirs(out_dir, exist_ok=True)
        spec = dict(s.spec)
        if s.anims:
            spec["animations"] = s.anims
        # only keep the styles this figure uses (smaller specs)
        used = set()
        for p in spec["parts"]:
            st = p.get("style")
            if st:
                used.update([st] if isinstance(st, str) else st)
        spec["styles"] = {k: v for k, v in spec["styles"].items() if k in used}
        fid = s.key.split("/")[-1]
        with open(os.path.join(out_dir, fid + ".json"), "w") as fh:
            json.dump(spec, fh, indent=1)
        meta = dict(s.meta)
        meta["key"] = s.key
        with open(os.path.join(out_dir, fid + ".meta.json"), "w") as fh:
            json.dump(meta, fh, indent=1)
        return os.path.join(out_dir, fid + ".json")
