"""Props and diorama bases for the figure kit (street furniture, containers, tiles), all hard-surface lowpix parts
with real-material paint. Every function takes the Fig, a part-id prefix and a position, and returns useful
heights / anchor points.
"""
from figlib import text_jp, text5, text3


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
    F.layer(pid, id="grit", op="speckle", density=0.05, shift=0.8, faces=["up"])
    F.layer(pid, id="crack", op="cracks", scale=0.5, width=0.5, threshold=0.75, shift=-1.0, faces=["up"])
    if line:
        F.layer(pid, id="line", op="band", axis="x", **{"from": line[0], "to": line[1]}, ramp="white", tone=4.6, faces=["up"], wobble=0.05)
    return top


def post_box(F, p, at=(0, 0, 0), r=7.0, h=24.0, col="#b83228"):
    """The round red post box of the Showa street: a cylinder, a domed cap, the slot, the white collection plate."""
    R = F.c(col)
    F.cyl(p + "pb_body", r, h, at, sides=16, col=R, style="tin", tone=3.0, seam="x")
    F.layer(p + "pb_body", id="rust", op="patches", scale=1.1, threshold=0.8, ramp=F.c("#6a3a24"), tone=2.2, faces=["sides"])
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
    F.layer(p + "drum", id="rust", op="patches", scale=0.8, threshold=0.62, ramp=F.c("#7a3e1e"), tone=2.4,
            bevel={"shadow": 1, "highlight": 0, "shadow_shift": -0.8})
    F.layer(p + "drum", id="streak", op="stripes", axis="x", period=2.2, width=0.15, wobble=0.6, range=[-1, 1], shift=-0.5, faces=["sides"])
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
    F.cyl(p + "bk_wall", r * 0.82, h, at, sides=16, top=1.22, col=R, style="metal", tone=3.2, double_sided=True, hide=["front"], seam="x")
    F.layer(p + "bk_wall", id="spangle", op="patches", scale=1.6, threshold=0.5, shift=0.5)
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
    F.layer(p + "wall", id="stain", op="stripes", axis="x", period=2.6, width=0.12, wobble=0.6, shift=-0.5, faces=["front", "back"])
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
