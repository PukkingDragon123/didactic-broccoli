"""Gacha Garage machines kit for lowpix: writes lowpix JSON specs for the gacha machines, capsules, display cases,
vending machines, held items and the PC (art/lowpix/machines/make.py runs it).

Units are millimetres (1 model unit = 1 mm), Y up, front +Z, ground y = 0. Positions given to the helpers are in the
MODEL's frame (not the parent's): a part under a joint is converted to the joint's frame here, so a spec reads like a
drawing. Top-level joints (bone parts) are the moving parts the game drives (crank, lid, flap, drawer, buttons...);
pack.mjs merges each joint's subtree into one mesh in the joint's frame.

Paint: realistic hard-surface materials as pixel art (muted, hue-shifted 7-step ramps; index 3 = the base colour):
moulded ABS plastic, baked enamel over steel (chipped to the metal at the edges), chrome, brushed / galvanised steel,
gold trim, rubber, wood (photo-bashed from CC0 Poly Haven photos in art/lowpix/photos), paper print.
"""
import colorsys
import json
import math
import os
import sys

LOWPIX = os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles")
sys.path.insert(0, LOWPIX)
from lowpix.palette import make_ramp  # noqa: E402

PHOTO = "art/lowpix/photos/"


# ------------------------------------------------------------------ colour
def hexc(c):
    if isinstance(c, int):
        return "#%06x" % c
    return c if c.startswith("#") else "#" + c


def mute(c, k=0.1, warm=0.015):
    c = hexc(c)
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    s *= 1 - k
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    r, g, b = min(1, r + warm), g, max(0, b - warm * 0.5)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


def ramp(c, steps=7, hue=12, sat=0.05, spread=0.8, k=0.1):
    return make_ramp(mute(c, k), steps=steps, hue_shift=hue, sat_shift=sat, spread=spread)


def r3(v):
    if isinstance(v, (list, tuple)):
        return [r3(x) for x in v]
    if isinstance(v, float):
        return round(v, 3)
    return v


# ------------------------------------------------------------------ paint styles
def photo(pid, scale, amount, **kw):
    d = {"id": "photo", "op": "photo", "src": PHOTO + pid, "scale": scale, "amount": amount}
    d.update(kw)
    return d


RIM = {"light": 1, "dark": 1, "outline": "none"}
RIMD = {"light": 1, "dark": 1, "outline": "dark"}
GLOSS = {"id": "gloss", "op": "gloss", "post": True, "dash": True, "length": 4, "density": 0.22, "shift": 0.9}
STYLES = {
    # injection-moulded ABS: an even satin sheen on the lit faces, the reflection darker on the shaded side, faint
    # flow marks, a few scuffs low down
    "abs": {"dither": 0, "rim": RIM, "layers": [
        {"id": "mottle", "op": "noise", "scale": 30, "amount": 0.14},
        {"id": "sheen", "op": "fill", "shift": 0.45, "min_light": 0.82},
        {"id": "ref", "op": "fill", "shift": -0.25, "min_light": -0.1, "max_light": 0.25},
        {"id": "scuff", "op": "patches", "scale": 40, "threshold": 0.78, "shift": -0.35},
        GLOSS]},
    # glossy lacquer (black / pearl cabinets): the same with stronger highlights
    "lacquer": {"dither": 0, "rim": {"light": 1, "dark": 1, "outline": "none", "light_shift": 1.4}, "layers": [
        {"id": "mottle", "op": "noise", "scale": 24, "amount": 0.12},
        {"id": "sheen", "op": "fill", "shift": 0.7, "min_light": 0.8},
        {"id": "ref", "op": "fill", "shift": -0.4, "min_light": -0.2, "max_light": 0.25},
        dict(GLOSS, density=0.35, shift=1.3, length=5)]},
    # baked enamel over pressed steel: orange-peel mottle, a little sheen, chipped to dark steel along the edges,
    # grime in the lower corners
    "enamel": {"dither": 0, "rim": RIM, "layers": [
        photo("metal_plate", 160, 0.12),
        {"id": "mottle", "op": "noise", "scale": 22, "amount": 0.12},
        {"id": "sheen", "op": "fill", "shift": 0.5, "min_light": 0.82},
        {"id": "grime", "op": "patches", "scale": 70, "threshold": 0.76, "shift": -0.3},
        {"id": "wear", "op": "wear", "width": 2, "density": 0.14, "scratches": 0.0, "ramp": "steel", "tone": 2.0, "post": True},
        dict(GLOSS, density=0.15)]},
    # chrome: high contrast, the sky reflected bright on top faces, the floor dark below, hard highlight dashes
    "chrome": {"dither": 0, "rim": {"light": 1, "dark": 1, "outline": "none", "light_shift": 1.6, "dark_shift": -1.4}, "layers": [
        {"id": "base", "op": "gradient", "axis": "y", "amount": 1.2},
        {"id": "sky", "op": "fill", "shift": 1.4, "min_light": 0.75},
        {"id": "floor", "op": "fill", "shift": -1.5, "max_light": 0.05},
        dict(GLOSS, density=0.5, shift=1.6, length=3)]},
    # brushed / galvanised steel
    "steel": {"dither": 0, "rim": RIM, "layers": [
        photo("metal_plate", 120, 0.4),
        {"id": "sheen", "op": "fill", "shift": 0.7, "min_light": 0.75},
        {"id": "ref", "op": "fill", "shift": -0.5, "max_light": 0.2},
        {"id": "wear", "op": "wear", "width": 2, "density": 0.08, "shift": 1.0, "post": True}]},
    # painted steel frame (angle iron, a pedestal), a bit of rust
    "ironpaint": {"dither": 0, "rim": RIM, "layers": [
        photo("metal_plate", 120, 0.5),
        {"id": "mottle", "op": "noise", "scale": 16, "amount": 0.2},
        {"id": "rust", "op": "patches", "scale": 50, "threshold": 0.8, "ramp": "rust", "tone": 3.0},
        {"id": "wear", "op": "wear", "width": 2, "density": 0.1, "ramp": "steel", "tone": 2.4, "post": True}]},
    "gold": {"dither": 0, "rim": {"light": 1, "dark": 1, "outline": "none", "light_shift": 1.5, "dark_shift": -1.2}, "layers": [
        {"id": "base", "op": "gradient", "axis": "y", "amount": 0.8},
        {"id": "mottle", "op": "noise", "scale": 10, "amount": 0.3},
        {"id": "sky", "op": "fill", "shift": 1.1, "min_light": 0.78},
        {"id": "floor", "op": "fill", "shift": -1.0, "max_light": 0.1},
        dict(GLOSS, density=0.45, shift=1.4, length=3)]},
    "rubber": {"dither": 0, "rim": {"light": 1, "dark": 0, "outline": "none"}, "layers": [
        {"id": "mottle", "op": "noise", "scale": 8, "amount": 0.25}]},
    # the dark inside of a chute / slot / cavity
    "cavity": {"dither": 0, "light": 0.4, "rim": {"light": 0, "dark": 0, "outline": "none"}, "layers": [
        {"id": "mottle", "op": "noise", "scale": 40, "amount": 0.1}]},
    "wood": {"dither": 0, "rim": RIM, "brush": {"flow": "long", "length": 8, "width": 1.5, "rough": 0.55},
             "layers": [photo("wood_table_001", 260, 1.4),
                        {"id": "grime", "op": "patches", "scale": 80, "threshold": 0.72, "shift": -0.5}]},
    "plank": {"dither": 0, "rim": RIM, "brush": {"flow": "long", "length": 8, "width": 1.5, "rough": 0.55},
              "layers": [photo("oak_veneer_01", 220, 1.3)]},
    "rust": {"dither": 0, "rim": RIM, "layers": [photo("rusty_metal_02", 200, 1.0)]},
    "paper": {"dither": 0, "light": 0.5, "rim": {"light": 0, "dark": 1, "outline": "none"}, "layers": [
        {"id": "mottle", "op": "noise", "scale": 6, "amount": 0.12}, photo("rough_linen", 80, 0.3)]},
    # cardboard: kraft board, flute shadows, scuffs
    "card": {"dither": 0, "rim": RIM, "layers": [
        {"id": "flutes", "op": "stripes", "axis": "x", "period": 4.0, "width": 0.35, "shift": -0.2, "faces": ["sides", "-front", "-back"]},
        {"id": "mottle", "op": "noise", "scale": 14, "amount": 0.25},
        photo("rough_linen", 120, 0.35),
        {"id": "scuff", "op": "wear", "width": 2, "density": 0.1, "shift": 0.8, "post": True}]},
    # clear plastic (drawn with a see-through material in the game): a bright rim, darker depth
    "clear": {"dither": 0, "light": 0.5, "rim": {"light": 2, "dark": 1, "outline": "none"}, "layers": [
        {"id": "depth", "op": "gradient", "axis": "y", "amount": -0.6},
        {"id": "sheen", "op": "fill", "shift": 1.2, "min_light": 0.7}]},
    "glow": {"dither": 0, "light": 0.12, "rim": {"light": 1, "dark": 0, "outline": "none"}},
    "flat": {"dither": 0, "light": 0.35, "rim": {"light": 0, "dark": 0, "outline": "none"}},
}
GAME_MAT = {"chrome": "metal", "gold": "metal", "steel": "metal", "clear": "glass", "glow": "glow", "lacquer": "gloss", "abs": "gloss"}

BASE_RAMPS = {
    "ink": ["#120f15", "#211b22", "#332a31", "#4a3f45", "#62575c", "#7c7276"],
    "steel": ramp("#8a8e94", k=0.0, hue=8),
    "chrome": ["#2a2d33", "#4a4f57", "#6f757e", "#9aa1aa", "#c3c9d0", "#e2e6ea", "#f8f9fa"],
    "goldr": ramp("#c49a3c", hue=16, sat=0.08, spread=0.9),
    "rust": ramp("#8a4a2a", hue=10),
    "rubber": ["#121113", "#1b1a1d", "#252428", "#302e33", "#3c3a40", "#4a484e"],
    "cavity": ["#0b0a0d", "#141217", "#1d1a20", "#28242b", "#332e36"],
    "paperw": ramp("#efe8d8", hue=8, k=0.0, spread=0.6),
    "kraft": ramp("#b08a58", hue=10),
    "wood": ramp("#b68c58", hue=12),
}


class Spec:
    """One lowpix spec in model mm. at = the part's centre (box) or its pivot (joint) in MODEL space."""

    def __init__(s, key, name, dens=0.5, desc="", light=None, budget=8000, hero=(32, 18)):
        s.key, s.name, s.dens = key, name, dens
        s.spec = {
            "name": name, "description": desc, "author": "Gacha Garage (lowpix spec)", "license": "CC0-1.0",
            "density": dens, "budget": {"tris": budget, "colors": 160},
            "light": light or {"dir": [-0.5, 1.0, 0.7], "strength": 0.55, "gradient": 0.25, "ao": 0.5, "ao_height": 120.0},
            "render": {"background": "#2a2630", "hero": list(hero), "shadow": 0.4},
            "palette": {"ramps": dict(BASE_RAMPS)}, "styles": json.loads(json.dumps(STYLES)), "parts": [],
        }
        s.ids, s.world = {}, {}
        s.meta = {"joints": {}, "mats": {}}
        s.anims = {}

    # ---- colour
    def c(s, col, **kw):
        h = hexc(col).lstrip("#")
        name = "c" + h + ("_" + "_".join(f"{k}{v}" for k, v in sorted(kw.items())) if kw else "")
        name = name.replace(".", "p").replace("-", "m")
        if name not in s.spec["palette"]["ramps"]:
            s.spec["palette"]["ramps"][name] = ramp(col, **kw)
        return name

    def raw(s, name, cols):
        s.spec["palette"]["ramps"][name] = cols
        return name

    # ---- parts
    def _rel(s, at, parent):
        if not parent:
            return list(at)
        w = s.world[parent]
        return [at[0] - w[0], at[1] - w[1], at[2] - w[2]]

    def add(s, pid, shape, at=(0, 0, 0), parent=None, style="abs", col=None, tone=None, paint=None, mat=None, rot=None,
            off=None, **kw):
        assert pid not in s.ids, pid
        p = {"id": pid, "shape": shape}
        if parent:
            p["parent"] = parent
        p["pivot"] = r3(s._rel(at, parent))
        if off:
            p["offset"] = r3(list(off))
        if rot:
            p["rotation"] = r3(list(rot))
        p.update({k: r3(v) for k, v in kw.items()})
        if shape != "bone":
            p["style"] = style
            pa = json.loads(json.dumps(paint or {}))
            if col is not None:
                pa.setdefault("ramp", col if (isinstance(col, str) and col in s.spec["palette"]["ramps"]) else s.c(col))
            if tone is not None:
                pa["tone"] = tone
            elif "ramp" in pa and "tone" not in pa:
                pa["tone"] = 3.0
            p["paint"] = pa
            gm = mat or GAME_MAT.get(style if isinstance(style, str) else style[0])
            if gm:
                s.meta["mats"][pid] = gm
        s.spec["parts"].append(p)
        s.ids[pid] = p
        s.world[pid] = list(at)
        return p

    def joint(s, pid, at, parent=None):
        """A moving part's pivot (the game drives it): its subtree becomes one mesh in its frame."""
        p = s.add(pid, "bone", at, parent)
        p["paint"] = {"ramp": "ink"}
        s.meta["joints"][pid] = r3(list(at))
        return p

    def box(s, pid, size, at=(0, 0, 0), ch=None, **kw):
        """A box of size [w, h, d] centred at `at` (model mm). ch: chamfer (default ~ the smallest side * 0.12)."""
        if ch is None:
            ch = min(size) * 0.12
        if ch and ch >= 0.3:
            kw["chamfer"] = min(ch, min(size[0], size[1]) * 0.45)
        return s.add(pid, "box", at, size=list(size), **kw)

    def boxr(s, pid, x0, y0, z0, x1, y1, z1, **kw):
        """A box from its corners."""
        return s.box(pid, [x1 - x0, y1 - y0, z1 - z0], ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), **kw)

    def taper(s, pid, size, at=(0, 0, 0), front=None, back=None, fshift=None, bshift=None, ch=None, **kw):
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

    def disc(s, pid, r, t, at=(0, 0, 0), axis="z", sides=16, top=None, ry=None, **kw):
        """A cylinder of radius r, thickness t centred at `at`, its axis along x / y / z (z = facing the front).
        top: scale of the +axis end (a cone / bevel)."""
        if top is not None:
            kw["front_scale"] = [top, top] if not isinstance(top, (list, tuple)) else list(top)
        rot = {"z": None, "y": [-90, 0, 0], "x": [0, 90, 0], "-z": [0, 180, 0], "-x": [0, -90, 0]}[axis]
        rr = r if ry is None else ry
        return s.add(pid, "prism", at, size=[2 * r, 2 * rr, t], sides=sides, rot=rot, **kw)

    def loft(s, pid, rings, at=(0, 0, 0), sides=12, rnd=2.0, subdiv=1, caps=(True, True), **kw):
        R = []
        for r in rings:
            q = {"at": r3(list(r[0])), "size": r3(r[1] if not isinstance(r[1], (list, tuple)) else list(r[1]))}
            if len(r) > 2 and r[2]:
                q["shift"] = r3(list(r[2]))
            R.append(q)
        return s.add(pid, "loft", at, rings=R, profile={"sides": sides, "round": rnd}, subdiv=subdiv, caps=list(caps), **kw)

    def card(s, pid, art, key, at=(0, 0, 0), plane="xy", style="flat", **kw):
        return s.add(pid, "card", at, plane=plane, art=art, style=style, paint={"art_key": key, "ramp": "ink", "tone": 2}, **kw)

    # ---- paint
    def stamp(s, pid, art, key, face="front", at="center", off=(0, 0), **kw):
        st = {"face": face, "at": at, "offset": [int(off[0]), int(off[1])], "art": art, "key": key}
        st.update(kw)
        s.ids[pid]["paint"].setdefault("stamps", []).append(st)

    def layer(s, pid, **L):
        s.ids[pid]["paint"].setdefault("layers", []).append(L)

    def clip(s, name, length, tracks, loop=False):
        s.anims[name] = {"length": length, "loop": loop, "tracks": tracks}

    # ---- output
    def write(s, out_dir):
        os.makedirs(out_dir, exist_ok=True)
        spec = dict(s.spec)
        if s.anims:
            spec["animations"] = s.anims
        used = set()
        for p in spec["parts"]:
            st = p.get("style")
            if st:
                used.update([st] if isinstance(st, str) else st)
        spec["styles"] = {k: v for k, v in spec["styles"].items() if k in used}
        fid = s.key
        with open(os.path.join(out_dir, fid + ".json"), "w") as fh:
            json.dump(spec, fh, indent=1)
        meta = dict(s.meta)
        meta["key"] = s.key
        meta["density"] = s.dens
        with open(os.path.join(out_dir, fid + ".meta.json"), "w") as fh:
            json.dump(meta, fh, indent=1)
        return os.path.join(out_dir, fid + ".json")


# ------------------------------------------------------------------ pixel art helpers (stamps)
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


def text5(txt, ch="#", gap=1):
    F = _font5()
    rows = [""] * 7
    for i, c in enumerate(txt.upper()):
        g = F.get(c) or F.get("?") or ["....."] * 7
        for y in range(7):
            rows[y] += g[y].replace("#", ch) + ("." * gap if i < len(txt) - 1 else "")
    return rows


G3 = {
    "A": "###|#.#|###|#.#|#.#", "B": "##.|#.#|##.|#.#|##.", "C": "###|#..|#..|#..|###", "D": "##.|#.#|#.#|#.#|##.",
    "E": "###|#..|##.|#..|###", "F": "###|#..|##.|#..|#..", "G": "###|#..|#.#|#.#|###", "H": "#.#|#.#|###|#.#|#.#",
    "I": "###|.#.|.#.|.#.|###", "J": "..#|..#|..#|#.#|###", "K": "#.#|#.#|##.|#.#|#.#", "L": "#..|#..|#..|#..|###",
    "M": "#.#|###|###|#.#|#.#", "N": "##.|#.#|#.#|#.#|#.#", "O": "###|#.#|#.#|#.#|###", "P": "###|#.#|###|#..|#..",
    "Q": "###|#.#|#.#|###|..#", "R": "###|#.#|##.|#.#|#.#", "S": "###|#..|###|..#|###", "T": "###|.#.|.#.|.#.|.#.",
    "U": "#.#|#.#|#.#|#.#|###", "V": "#.#|#.#|#.#|#.#|.#.", "W": "#.#|#.#|###|###|#.#", "X": "#.#|#.#|.#.|#.#|#.#",
    "Y": "#.#|#.#|.#.|.#.|.#.", "Z": "###|..#|.#.|#..|###", "0": "###|#.#|#.#|#.#|###", "1": ".#.|##.|.#.|.#.|###",
    "2": "###|..#|###|#..|###", "3": "###|..#|###|..#|###", "4": "#.#|#.#|###|..#|..#", "5": "###|#..|###|..#|###",
    "6": "###|#..|###|#.#|###", "7": "###|..#|..#|.#.|.#.", "8": "###|#.#|###|#.#|###", "9": "###|#.#|###|..#|###",
    " ": "..|..|..|..|..", ".": ".|.|.|.|#", "-": "...|...|###|...|...", "/": "..#|..#|.#.|#..|#..", "+": "...|.#.|###|.#.|...",
    "¥": "#.#|.#.|###|.#.|.#.", ":": ".|#|.|#|.",
}


def text3(txt, ch="#"):
    rows = [""] * 5
    for i, c in enumerate(txt.upper()):
        g = G3.get(c, G3[" "]).split("|")
        for y in range(5):
            rows[y] += g[y].replace("#", ch) + ("." if i < len(txt) - 1 else "")
    return rows


def text_jp(txt, px=10, ch="#"):
    from PIL import Image, ImageDraw, ImageFont
    root = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")
    fp = os.path.join(root, "node_modules", "@fontsource", "dotgothic16", "files", "dotgothic16-japanese-400-normal.woff2")
    try:
        font = ImageFont.truetype(fp, px)
    except Exception:
        font = ImageFont.truetype("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", px)
    w = int(font.getlength(txt)) + 2
    im = Image.new("1", (w, px + 4), 0)
    ImageDraw.Draw(im).text((1, 0), txt, font=font, fill=1)
    bb = im.getbbox() or (0, 0, 1, 1)
    im = im.crop(bb)
    return ["".join(ch if im.getpixel((x, y)) else "." for x in range(im.width)) for y in range(im.height)]


def ring_art(r, ch="#", fill=None, w=1):
    """A pixel circle of radius r (outline w px, optional fill char)."""
    n = int(math.ceil(r)) * 2 + 1
    c = n // 2
    rows = []
    for y in range(n):
        row = ""
        for x in range(n):
            d = math.hypot(x - c, y - c)
            row += ch if r - w < d <= r + 0.35 else (fill if fill and d <= r - w else ".")
        rows.append(row)
    return rows


def screw_art(kind="+"):
    """A 5x5 screw head: rim, slot, lit top-left."""
    if kind == "-":
        return [".hhh.", "hhllh", "dssss", "hlldd", ".ddd."]
    return [".hhh.", "hhsld", "hsssd", "hlsdd", ".ddd."]
