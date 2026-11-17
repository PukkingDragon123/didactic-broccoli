"""Props and diorama bases for the figure kit (street furniture, containers, tiles), all hard-surface lowpix parts
with real-material paint. Every function takes the Fig, a part-id prefix and a position, and returns useful
heights / anchor points.
"""
from figlib import text_jp, text5, text3, BASE_H

# Most figures stand on their own (feet, paws, bowl, body) like real capsule toys. A base only where the toy needs one
# (a floating subject on a clear rod, a scene that is the point of the toy, a fragile pose), and then one base family
# per series (CLAUDE.md toy rule): the same shape, material and thickness, quiet paint, the subject filling ~75 %.
FAMILIES = {
    # Alley Cat Patrol: a slab of worn lane asphalt with a kerb-stone edge
    "lane": dict(col="#4a474e", style="stone", tone=2.5, ch=0.8, edge="#77736e"),
    # Fake Food Window: the black lacquered riser of a sample window
    "riser": dict(col="#2c2628", style="glaze", tone=2.6, ch=0.6, edge="#7a2a2a"),
    # Showa Home Appliances: a walnut-veneer sideboard top
    "shelf": dict(col="#6a4228", style="wood", tone=2.8, ch=0.6, edge=None),
    # the line's display stand for floating subjects: a clear acrylic plate (a rod goes up from it)
    "clear": dict(col="#d8e8ee", style="clear", tone=3.6, ch=0.6, edge=None, mat="glass"),
}
FILL = 0.75


def clear_stand(F, x, z, top, why, r=9.0, h=2.0):
    """The line's stand for a flying or floating subject: a clear acrylic disc and a clear rod up to `top` (the
    subject's underside at x, z). Clear plastic (the game's glass material), so the subject reads as in the air."""
    F.spec["light"]["ground"] = h
    F.cyl("base", r, h, (x, 0, z), sides=24, col="#d8e8ee", style="clear", tone=3.6, mat="glass")
    F.cyl("base_rod", 0.8, top - h + 0.6, (x, h, z), sides=8, col="#d8e8ee", style="clear", tone=3.6, mat="glass")
    F.meta["base"] = {"family": "clear", "w": 2 * r, "d": 2 * r}
    F.meta["stand_why"] = why


def series_base(F, family, why, fill=FILL, minw=18.0, aspect=0.62, maker="KAPUKAPU", year="1999"):
    """The series' base under everything placed so far (F.subject, standing at BASE_H), centred on it; `why` says
    why this toy needs a base at all (audit.py reports it). Returns (w, d)."""
    fam = FAMILIES[family]
    F.spec["light"]["ground"] = BASE_H
    sw, _, sd = F.subject.size
    cx, _, cz = F.subject.centre
    w = max(sw / fill, minw)
    d = max(sd / fill, w * aspect, minw * 0.75)
    w = max(w, d * aspect)
    w, d = round(w * 2) / 2, round(d * 2) / 2
    R = F.c(fam["col"])
    F.box("base", [w, BASE_H, d], (cx, BASE_H / 2, cz), ch=fam["ch"], col=R, style=fam["style"], tone=fam["tone"], mat=fam.get("mat"))
    if fam.get("edge"):
        F.layer("base", id="edge", op="band", axis="y", **{"from": 0.55, "to": 1.0}, ramp=F.c(fam["edge"]), tone=3.2,
                faces=["sides"], bevel={"shadow": 1, "highlight": 1})
    maker_mark(F, "base", maker=maker, year=year)
    F.stamp("base", ["dd", "hd"], {"d": f"{R}:1", "h": f"{R}:4"}, "right", at="center")  # the gate nub
    F.meta["base"] = {"family": family, "w": w, "d": d}
    F.meta["stand_why"] = why
    return w, d


def maker_mark(F, pid, face="bottom", maker="KAPUKAPU", year="1999"):
    """The maker's mark debossed under a base."""
    rows = text3(f"(C){maker} {year}") + ["..."] + text3("MADE IN JAPAN")
    w = max(len(r) for r in rows)
    rows = [r.center(w, ".") for r in rows]
    R = F.ids[pid]["paint"].get("ramp", "ink")
    F.stamp(pid, rows, {"#": f"{R}:1"}, face, at="center")


def slab(F, pid, w, d, h=3.0, col="#5a5e66", style="stone", at=(0, 0, 0), ch=0.7, tone=2.9, mark=True, **kw):
    """A rectangular diorama base (asphalt, concrete, tatami...)."""
    F.box(pid, [w, h, d], (at[0], at[1] + h / 2, at[2]), ch=ch, col=col, style=style, tone=tone, **kw)
    if mark:
        maker_mark(F, pid)
        R = F.ids[pid]["paint"]["ramp"]
        F.stamp(pid, ["dd", "hd"], {"d": f"{R}:1", "h": f"{R}:4"}, "right", at="center")  # the gate nub
    return at[1] + h


def asphalt(F, pid, w, d, h=3.0, at=(0, 0, 0), line=None, **kw):
    top = slab(F, pid, w, d, h, col="#4a4c52", style="stone", at=at, **kw)
    if line:
        F.layer(pid, id="line", op="band", axis="x", **{"from": line[0], "to": line[1]}, ramp="white", tone=4.6, faces=["up"], wobble=0.05)
    return top


def post_box(F, p, at=(0, 0, 0), r=7.0, h=24.0, col="#b83228"):
    """The round red post box of the Showa street: a cylinder, a domed cap, the slot, the white collection plate."""
    R = F.c(col)
    F.cyl(p + "pb_body", r, h, at, sides=16, col=R, style="tin", tone=3.0, seam="x")
    F.cyl(p + "pb_cap", r * 1.08, 2.0, (at[0], at[1] + h, at[2]), sides=16, col=R, style="tin", tone=3.2, top=0.92)
    F.loft(p + "pb_dome", [((0, 0, 0), [r * 1.9, r * 1.9]), ((0, r * 0.35, 0), [r * 1.6, r * 1.6]), ((0, r * 0.55, 0), [r * 0.9, r * 0.9])],
           (at[0], at[1] + h + 2.0, at[2]), sides=16, rnd=2.0, col=R, style="tin", tone=3.3, up=[0, 0, 1])
    F.box(p + "pb_slot", [r * 1.1, 1.4, 1.2], (at[0], at[1] + h - 4.0, at[2] + r - 0.3), ch=0.3, col="#1c1a1e", style="metal", tone=1.2)
    F.box(p + "pb_plate", [r * 0.9, 5.0, 0.6], (at[0], at[1] + h * 0.52, at[2] + r - 0.1), ch=0.2, col="#ece6d8", style="paper", tone=4.0)
    F.stamp(p + "pb_plate", text_jp("ゆうびん", 8), {"#": F.c(col) + ":1"}, "front")
    F.box(p + "pb_mark", [3.4, 3.4, 0.5], (at[0], at[1] + h * 0.8, at[2] + r - 0.05), ch=0.2, col="#ece6d8", style="pvc", tone=4.2)
    F.stamp(p + "pb_mark", ["#######", "...#...", "#######", "...#...", "...#..."], {"#": R + ":1"}, "front")
    return at[1] + h + 2.0 + r * 0.55


def oil_drum(F, p, at=(0, 0, 0), r=8.0, h=17.0, col="#2e5a48"):
    R = F.c(col)
    F.cyl(p + "drum", r, h, at, sides=16, col=R, style="tin", tone=2.8, seam="x")
    F.layer(p + "drum", id="ribs", op="stripes", axis="y", period=h / 3, width=0.08, shift=0.9, faces=["sides"],
            bevel={"shadow": 1, "highlight": 1})
    F.cyl(p + "drum_lid", r * 1.03, 0.9, (at[0], at[1] + h, at[2]), sides=16, col=R, style="tin", tone=3.0)
    F.cyl(p + "drum_bung", 1.3, 0.8, (at[0] + r * 0.5, at[1] + h + 0.9, at[2] - r * 0.3), sides=8, col="#9a9aa0", style="metal")
    return at[1] + h + 0.9


def cardboard_box(F, p, w, h, d, at=(0, 0, 0), col="#b88a54", label="みかん", label_col="#d8641e", flaps=40):
    """An open cardboard box: four walls, a floor, folded-out flaps and a printed label."""
    C = F.c(col, k=0.2)
    t = 0.9
    x, y, z = at
    F.box(p + "cb_floor", [w, t, d], (x, y + t / 2, z), ch=0.2, col=C, style="paper", tone=2.6)
    for nm, sz, pos in (("cb_front", [w, h, t], (x, y + h / 2, z + d / 2 - t / 2)), ("cb_back", [w, h, t], (x, y + h / 2, z - d / 2 + t / 2)),
                        ("cb_left", [t, h, d - 2 * t], (x + w / 2 - t / 2, y + h / 2, z)), ("cb_right", [t, h, d - 2 * t], (x - w / 2 + t / 2, y + h / 2, z))):
        F.box(p + nm, sz, pos, ch=0.15, col=C, style="paper", tone=3.0, double_sided=True)
        F.layer(p + nm, id="flute", op="stripes", axis="y", period=0.9, width=0.3, shift=-0.25, faces=["top"])
    F.layer(p + "cb_front", id="tape", op="band", axis="x", **{"from": -0.12, "to": 0.12}, ramp=F.c("#c8a870"), tone=3.6, faces=["front"])
    if label:
        LC = F.c(label_col)
        art = text_jp(label, 11)
        F.stamp(p + "cb_front", art, {"#": LC + ":3"}, "front", off=(1, 2))   # tampo print, a touch off-centre
        F.stamp(p + "cb_left", art, {"#": LC + ":3"}, "right", off=(0, 2))
    for nm, pos, rot, sz in (("cb_ff", (x, y + h, z + d / 2), (flaps, 0, 0), [w * 0.98, t, d * 0.45]),
                             ("cb_fb", (x, y + h, z - d / 2), (-flaps, 0, 0), [w * 0.98, t, d * 0.45]),
                             ("cb_fl", (x + w / 2, y + h, z), (0, 0, -flaps - 20), [w * 0.45, t, d * 0.98]),
                             ("cb_fr", (x - w / 2, y + h, z), (0, 0, flaps + 20), [w * 0.45, t, d * 0.98])):
        off = [0, 0, sz[2] / 2] if nm == "cb_ff" else [0, 0, -sz[2] / 2] if nm == "cb_fb" else [sz[0] / 2, 0, 0] if nm == "cb_fl" else [-sz[0] / 2, 0, 0]
        F.box(p + nm, sz, pos, ch=0.15, col=C, style="paper", tone=3.2, rot=rot, off=off, double_sided=True)
    return y + h


def bucket(F, p, at=(0, 0, 0), r=8.0, h=10.0, col="#9aa0a6"):
    """A galvanised tin bucket (open, double-sided walls) with a wire handle."""
    R = F.c(col, k=0.3)
    F.cyl(p + "bk_wall", r * 0.82, h, at, sides=16, top=1.22, col=R, style="tin", tone=4.0, double_sided=True, hide=["front"], seam="x")
    F.layer(p + "bk_wall", id="ribs", op="stripes", axis="y", period=h / 4, width=0.1, shift=-0.8, faces=["sides"], bevel={"shadow": 1, "highlight": 1})
    F.cyl(p + "bk_rim", r, 0.8, (at[0], at[1] + h - 0.4, at[2]), sides=16, col=R, style="metal", tone=3.8, hide=["front", "back"], double_sided=True)
    F.loft(p + "bk_handle", [((-r, 0, 0), 0.5), ((-r * 0.7, r * 0.55, 0), 0.5), ((0, r * 0.8, 0), 0.5), ((r * 0.7, r * 0.55, 0), 0.5), ((r, 0, 0), 0.5)],
           (at[0], at[1] + h - 1.2, at[2]), sides=6, rnd=2, col="#7a7c82", style="metal", rot=(-55, 0, 0))
    return at[1] + h


def block_wall(F, p, w, h, d, at=(0, 0, 0), col="#a8a49a"):
    """A concrete block wall segment (stacked hollow blocks with a coping)."""
    C = F.c(col, k=0.3)
    F.box(p + "wall", [w, h, d], (at[0], at[1] + h / 2, at[2]), ch=0.4, col=C, style="stone", tone=3.1)
    F.layer(p + "wall", id="blocks", op="scales", along="x", size=[w / 4, h / 4], shape="square", gap=0.35, gradient=0.6, rim=0.6,
            shadow=-1.2, jitter=0.4, faces=["sides", "front", "back"])
    F.box(p + "wall_cap", [w + 1.2, 1.6, d + 1.2], (at[0], at[1] + h + 0.8, at[2]), ch=0.4, col=C, style="stone", tone=3.5)
    return at[1] + h + 1.6


def roof_tiles(F, p, w, d, at=(0, 0, 0), col="#5a6070", rows=4, tilt=14):
    """A patch of grey kawara roof tiles, rows of half-round tiles on a sloped deck."""
    C = F.c(col, k=0.2)
    F.box(p + "roof", [w, 2.0, d], (at[0], at[1] + 1.0, at[2]), ch=0.4, col=C, style="glaze", tone=2.6, rot=(tilt, 0, 0))
    n = int(w // 5)
    for i in range(n):
        x = -w / 2 + (i + 0.5) * w / n
        F.loft(p + f"tile{i}", [((0, 0, -d / 2), [w / n * 0.62, 2.4]), ((0, 0, d / 2), [w / n * 0.62, 2.4])], (at[0] + x, at[1] + 2.0, at[2]),
               sides=8, rnd=2.0, col=C, style="glaze", tone=3.0, rot=(tilt, 0, 0), caps=(True, True))
        F.layer(p + f"tile{i}", id="rows", op="stripes", axis="z", period=d / rows, width=0.1, shift=-1.0)
    return at[1] + 3.4


def crescent_moon(F, pid, at, r=9.0, parent=None):
    """A crescent moon on a stalk (glows): an alpha-cut card."""
    n = int(r * 2 * F.dens)
    art = []
    for y in range(n):
        row = ""
        for x in range(n):
            dx, dy = (x + 0.5) / n * 2 - 1, (y + 0.5) / n * 2 - 1
            ins = dx * dx + dy * dy < 1
            cut = (dx - 0.42) ** 2 + (dy + 0.12) ** 2 < 0.62
            if ins and not cut:
                row += "m" if dx * dx + dy * dy < 0.72 else "o"
            else:
                row += "."
        art.append(row)
    F.ramp("moon", "#f4d47a", k=0.0)
    F.card(pid, art, {"m": "moon:5", "o": "moon:3"}, at, plane="xy", style="glow", parent=parent)
    F.meta["mats"][pid] = "glow"


def tatami(F, pid, w, d, h=3.0, at=(0, 0, 0), col="#b8b070", edge="#2a3a2a"):
    """A slab of tatami: woven rush (fine stripes over a linen photo), the cloth border (heri) along the long sides."""
    top = slab(F, pid, w, d, h, col=col, style="cloth", at=at, ch=0.5, tone=3.2)
    F.layer(pid, id="weave", op="stripes", axis="z", period=0.55, width=0.35, shift=-0.45, faces=["up", "front", "back"])
    F.layer(pid, id="sun", op="gradient", axis="x", amount=0.6, faces=["up"])
    F.layer(pid, id="heri", op="band", axis="x", **{"from": 0.86, "to": 1.0}, ramp=F.c(edge), tone=2.6, faces=["up", "right", "left"],
            bevel={"shadow": 1, "highlight": 1})
    F.layer(pid, id="heri2", op="band", axis="x", **{"from": -1.0, "to": -0.86}, ramp=F.c(edge), tone=2.6, faces=["up", "right", "left"],
            bevel={"shadow": 1, "highlight": 1})
    return top


def plate(F, pid, r, at=(0, 0, 0), col="#f2efe6", rim=None, h=1.6, sides=20, parent=None):
    """A glazed ceramic plate: a shallow lofted dish with a foot ring and an optional painted rim line."""
    C = F.c(col, k=0.1, hue=8)
    F.loft(pid, [((0, 0, 0), [r * 1.1, r * 1.1]), ((0, h * 0.35, 0), [r * 1.5, r * 1.5]), ((0, h * 0.8, 0), [r * 1.95, r * 1.95]),
                 ((0, h, 0), [r * 2.0, r * 2.0])], at, sides=sides, rnd=2.0, col=C, style="glaze", tone=2.7, up=[0, 0, 1], parent=parent)
    if rim:
        F.layer(pid, id="rimline", op="band", axis="y", **{"from": 0.55, "to": 0.8}, ramp=F.c(rim), tone=3.0, faces=["sides"])
    return at[1] + h


def price_card(F, pid, price, name_jp=None, at=(0, 0, 0), yaw=0, col="#f4efe0", size=1.0):
    """The folded tent card with the price that stands in front of every food sample (base furniture)."""
    C = F.c(col, k=0.0)
    w, h = 12.0 * size, 7.0 * size
    for i, a in enumerate((-72, 72)):
        F.box(f"{pid}{i}", [w, 0.4, h], at, ch=0.05, col=C, style="paper", tone=3.8, rot=(a + 180 * (i == 0), yaw, 0), off=[0, 0, h / 2])
    art = text3(price)
    F.stamp(f"{pid}1", art, {"#": "ink:1"}, "top", at="center", off=(0, -3 if name_jp else 0))
    if name_jp:
        F.stamp(f"{pid}1", text_jp(name_jp, 8), {"#": F.c("#b83a2a") + ":2"}, "top", at="center", off=(0, 6))


def doily(F, pid, r, at=(0, 0, 0)):
    """A crocheted lace doily (the one under every Showa telephone): an alpha-cut card, lying flat."""
    import math
    n = int(r * 2 * F.dens)
    art = []
    for y in range(n):
        row = ""
        for x in range(n):
            dx, dy = (x + 0.5) / n * 2 - 1, (y + 0.5) / n * 2 - 1
            d = math.hypot(dx, dy)
            a = math.atan2(dy, dx)
            edge = 0.86 + 0.08 * math.cos(a * 12)
            if d > edge:
                row += "."
            elif (int(d * 9) % 2 == 0 and abs(math.sin(a * 8)) > 0.35) or (0.78 < d < 0.82) or d < 0.18:
                row += "w"
            elif int(d * 9) % 2 == 1:
                row += "s"
            else:
                row += "."
        art.append(row)
    F.add(pid, "card", at, plane="xz", art=art, style="card", paint={"art_key": {"w": "white:-1", "s": "white:3"}, "ramp": "white", "tone": 4})


def log(F, pid, length, r, at=(0, 0, 0), yaw=0, col="#6a4a32", cut="#c8a070"):
    """A fallen branch / log section: a slightly bent bark loft with sawn end grain."""
    F.loft(pid, [((0, 0, -length / 2), [r * 2, r * 1.8]), ((0, r * 0.08, -length * 0.15), [r * 2.08, r * 1.9]),
                 ((0, r * 0.05, length * 0.2), [r * 1.95, r * 1.85]), ((0, -r * 0.02, length / 2), [r * 1.9, r * 1.75])],
           (at[0], at[1] + r * 0.9, at[2]), sides=12, rnd=2.1, col=col, style="bark", tone=2.8, rot=(0, yaw, 0), seam=False)
    F.layer(pid, id="rings", op="spots", centers=[[0, 0, length / 2, r * 0.7], [0, 0, -length / 2, r * 0.7]], ramp=F.c(cut), tone=3.2,
            faces=["start", "end"], bevel={"shadow": 1, "highlight": 1})
    F.layer(pid, id="ring2", op="spots", centers=[[0, 0, length / 2, r * 0.35], [0, 0, -length / 2, r * 0.35]], ramp=F.c(cut), tone=2.6,
            faces=["start", "end"])
    return at[1] + r * 1.75


def leaf_card(F, pid, w, at=(0, 0, 0), rot=(0, 0, 0), col="#4a7a32", parent=None):
    """A broad leaf (alpha-cut card, a midrib and veins painted in)."""
    import math
    n = int(w * F.dens)
    hgt = int(n * 0.62)
    art = []
    for y in range(hgt):
        row = ""
        for x in range(n):
            u, v = (x + 0.5) / n, (y + 0.5) / hgt * 2 - 1
            half = math.sin(math.pi * u) ** 0.8 * (1 - 0.2 * u)
            if abs(v) > half:
                row += "."
            elif abs(v) < 0.06:
                row += "m"
            elif abs((u * 7 - abs(v) * 2.2) % 1) < 0.12:
                row += "v"
            else:
                row += "l" if v < 0 else "d"
        art.append(row)
    R = F.c(col)
    F.add(pid, "card", at, plane="xz", art=art, style="flat", rot=list(rot), parent=parent,
          paint={"art_key": {"m": f"{R}:5", "v": f"{R}:4", "l": f"{R}:3", "d": f"{R}:2"}, "ramp": R, "tone": 3})


def specimen_label(F, pid, text, latin=None, at=(0, 0, 0), yaw=0, w=12.0):
    """A collector's paper label on a pin card: the name in pen, the Latin name under it."""
    F.box(pid, [w, 0.4, 5.0], at, ch=0.05, col="#efe6cf", style="paper", tone=3.8, rot=(0, yaw, 0))
    F.stamp(pid, text_jp(text, 9), {"#": "ink:1"}, "top", at="center", off=(0, -3 if latin else 0))
    if latin:
        F.stamp(pid, text3(latin), {"#": "ink:2"}, "top", at="center", off=(0, 5))
    F.layer(pid, id="border", op="panel", inset=2, shift=-0.6)


def city_block(F, w=40, d=30, at=(0, 0, 0), seed=1, col="#6a6e74"):
    """A model-railway city for a kaiju to stomp: road, kerbs, little buildings with lit windows, a car."""
    import random
    rnd = random.Random(seed)
    top = slab(F, "base", w, d, 3.0, col="#4a4c52", style="stone", tone=2.6, at=at)
    F.layer("base", id="road", op="band", axis="z", **{"from": -0.25, "to": 0.25}, ramp=F.c("#2e3036"), tone=2.4, faces=["up"])
    spots = [(-w / 2 + 5, -d / 2 + 5), (w / 2 - 5, -d / 2 + 5), (-w / 2 + 5, d / 2 - 5), (w / 2 - 6, d / 2 - 5)]
    for i, (x, z) in enumerate(spots):
        bw, bd, bh = rnd.uniform(6, 8), rnd.uniform(5, 7), rnd.uniform(7, 15)
        c = rnd.choice(["#b8b0a0", "#9aa0a8", "#c8b890", "#8a8a80"])
        F.box(f"bld{i}", [bw, bh, bd], (at[0] + x, top + bh / 2, at[2] + z), ch=0.3, col=c, style="stone", tone=3.2)
        F.layer(f"bld{i}", id="win", op="grille", rect=[0.12, 0.15, 0.88, 0.9], period=3, dir="h", slit_tone=1.2, faces=["sides"])
        F.layer(f"bld{i}", id="lit", op="spots", count=3, radius=[0.4, 0.7], ramp=F.c("#f0d070"), tone=4.0, faces=["sides"], seed=i)
        F.box(f"roof{i}", [bw + 0.4, 0.6, bd + 0.4], (at[0] + x, top + bh + 0.3, at[2] + z), ch=0.1, col="#5a5a5e", style="metal", tone=2.6)
    F.box("car", [3.2, 1.6, 1.8], (at[0] - 3, top + 0.8, at[2] + 1.8), ch=0.4, col=rnd.choice(["#c83a2a", "#3a6aa8", "#e8e0c8"]), style="pvc", tone=3.0)
    return top


def eye_card(F, pid, size, at, parent=None, iris="#c83a2a", rot=(0, 0, 0)):
    """One big round tsukumogami eye (alpha-cut card, a tampo print 1px off its black ring)."""
    n = max(8, int(size * F.dens))
    art = []
    for y in range(n):
        row = ""
        for x in range(n):
            dx, dy = (x + 0.5) / n * 2 - 1, (y + 0.5) / n * 2 - 1
            d = (dx * dx + dy * dy) ** 0.5
            di = ((dx - 0.12) ** 2 + (dy - 0.05) ** 2) ** 0.5
            if d > 1:
                row += "."
            elif d > 0.84:
                row += "k"
            elif ((dx + 0.3) ** 2 + (dy + 0.35) ** 2) ** 0.5 < 0.16:
                row += "h"
            elif di < 0.2:
                row += "p"
            elif di < 0.48:
                row += "i"
            else:
                row += "w"
        art.append(row)
    F.ramp("spirit", iris, k=0.0)
    F.add(pid, "card", at, plane="xy", art=art, style="card", parent=parent, rot=list(rot),
          paint={"art_key": {"k": "ink:0", "w": "white:-1", "i": "spirit:3", "p": "ink:0", "h": "white:-1"}, "ramp": "white", "tone": 4})


def tongue_card(F, pid, w, at, parent=None, rot=(0, 0, 0)):
    n = max(6, int(w * F.dens))
    h = int(n * 1.3)
    art = []
    for y in range(h):
        row = ""
        for x in range(n):
            u, v = (x + 0.5) / n * 2 - 1, (y + 0.5) / h
            half = 0.9 * (1 - v ** 3) ** 0.5
            row += "." if abs(u) > half else ("d" if abs(u) < 0.08 and v > 0.2 else ("h" if u < -0.3 else "t"))
        art.append(row)
    F.ramp("tongue", "#d84a5a", k=0.0)
    F.add(pid, "card", at, plane="xy", art=art, style="card", parent=parent, rot=list(rot),
          paint={"art_key": {"t": "tongue:3", "h": "tongue:4", "d": "tongue:1"}, "ramp": "tongue", "tone": 3})


def aura(F, pid, w, h, at, col="#8a5ad8", seed=1, rot=(0, 0, 0)):
    """A guardian spirit's aura: licking flames as an alpha-cut glowing card behind the figure."""
    import math
    import random
    rnd = random.Random(seed)
    n, m = int(w * F.dens * 0.5), int(h * F.dens * 0.5)
    tongues = [(rnd.uniform(0.05, 0.95), rnd.uniform(0.55, 1.0), rnd.uniform(0.05, 0.12)) for _ in range(9)]
    art = []
    for y in range(m):
        v = 1 - (y + 0.5) / m
        row = ""
        for x in range(n):
            u = (x + 0.5) / n
            body = abs(u - 0.5) < 0.42 * (1 - v ** 2) ** 0.5 and v < 0.62
            fl = any(abs(u - c + 0.04 * math.sin(v * 9 + c * 7)) < wd * (1 - v / top) and v < top for c, top, wd in tongues)
            if body or fl:
                edge = not (abs(u - 0.5) < 0.36 * (1 - v ** 2) ** 0.5 and v < 0.55)
                row += "e" if edge else ("m" if (x + y) % 5 else "c")
            else:
                row += "."
        art.append(row)
    F.ramp("aura", col, k=0.0)
    F.add(pid, "card", at, plane="xy", art=art, style="glow", rot=list(rot), size=[w, h],
          paint={"art_key": {"e": "aura:5", "m": "aura:3", "c": "aura:4"}, "ramp": "aura", "tone": 3})
    F.meta["mats"][pid] = "glow"
