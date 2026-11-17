"""Onsen Animals (どうぶつ温泉): animals having a soak, real animal models made small in tubs and rock pools."""
from figlib import Fig, GOLD
from props import slab, bucket

S = "yudono"
CAPY = "sketchfab:f9201e6cca66434dbb5f759bd9884d75"      # Capybara
PENGUIN = "sketchfab:d798077b6ff3438791beee88e9ef1c8d"   # Penguin
OTTER = "sketchfab:296da41f47534f98ae2d3b958d4c4f98"     # Otter
FROG = "sketchfab:81a49956c5944279abfb2ccaa791f7d8"      # Realistic Frog
DUCK = "polyhaven:rubber_duck_toy"                        # Rubber duck (Poly Haven, CC0)


def tiles(F, w=30, d=24):
    top = slab(F, "base", w, d, 3.0, col="#d8d4c8", style="glaze", tone=3.4)
    F.layer("base", id="grout", op="scales", along="x", size=[2.6, 2.6], shape="square", gap=0.2, gradient=0.3, rim=0.3, shadow=-1.0, faces=["up"])
    return top


def tub(F, pid, r, h, at, water="#7ab8c0"):
    """A hinoki bath tub (open, staves and hoops) with a steaming surface."""
    F.cyl(pid, r, h, at, sides=16, col="#d8b880", style="wood", tone=3.4, double_sided=True, hide=["front"])
    F.layer(pid, id="staves", op="stripes", axis="around", period=0.06, width=0.08, shift=-0.6, faces=["sides"])
    for i, y in enumerate((0.2, 0.75)):
        F.cyl(f"{pid}_hoop{i}", r * 1.02, 0.8, (at[0], at[1] + h * y, at[2]), sides=16, col="#6a6a70", style="metal", hide=["front", "back"], double_sided=True)
    F.cyl(f"{pid}_water", r * 0.94, 0.3, (at[0], at[1] + h * 0.82, at[2]), sides=16, col=water, style="clear", tone=3.4)
    return at[1] + h * 0.82


def steam(F, pid, at):
    n = 24
    art = []
    import math
    for y in range(n * 2):
        row = ""
        for x in range(n):
            u, v = x / n, y / (n * 2)
            c = 0.5 + 0.18 * math.sin(v * 9)
            row += "s" if abs(u - c) < 0.12 * (1 - v) and (x + y) % 3 else "."
        art.append(row)
    F.add(pid, "card", at, plane="xy", art=art, style="card", paint={"art_key": {"s": "white:-1"}, "ramp": "white", "tone": 4})
    F.meta["mats"][pid] = "glass"


def capy():
    F = Fig(f"{S}/capy", "Yuzu Bath Capybara", "Eyes half shut in a tub full of floating yuzu. Has not moved since November.")
    top = tiles(F)
    wt = tub(F, "tub", 11, 9, (0, top, 0))
    F.model("m", CAPY, 15, (0, top + 2, -1), yaw=-25)
    for i, (x, z) in enumerate([(-6, 5), (5, 6), (7, -3), (-7, -4)]):
        F.blob(f"yuzu{i}", 2.6, 2.2, 2.6, (x, wt - 0.8, z), col="#e8c040", style="glaze", tone=3.4, sides=10)
    steam(F, "steam", (3, wt + 8, -4))
    return F


def penguin():
    F = Fig(f"{S}/penguin", "Bath Pail Penguin", "Brought its own wash bucket and a towel. Very polite at the baths.")
    top = tiles(F, 26, 24)
    bucket(F, "", (-7, top, 4), r=5, h=5, col="#e8c870")
    F.box("towel", [6, 1.2, 4], (-7, top + 5.6, 4), ch=0.5, col="#f0ece0", style="cloth", tone=3.8)
    F.model("m", PENGUIN, 22, (3, top, -1), yaw=-20)
    F.model_clip("model_m", "wobble", 1.0, amp=8)
    return F


def frog():
    F = Fig(f"{S}/frog", "Hinoki Tub Frog", "Sitting on the rim of the cedar tub, thinking about getting in. Still thinking.")
    top = tiles(F)
    tub(F, "tub", 10, 8, (0, top, -1))
    F.model("m", FROG, 7, (0, top + 8, 7.5), yaw=0)
    F.model_clip("model_m", "hop", 0.8, amp=3)
    return F


def otter():
    F = Fig(f"{S}/otter", "Otter on the Rocks", "Stood up on the warm stones to see who has the yuzu.")
    top = slab(F, "base", 30, 24, 3.0, col="#5a5650", style="rock", tone=2.8)
    F.box("pool", [22, 0.6, 14], (0, top + 0.3, 2), ch=0.4, col="#7ab8c0", style="clear", tone=3.2)
    for i, (x, z, s) in enumerate([(-9, -6, 7), (8, -7, 6), (-10, 6, 5)]):
        F.blob(f"rock{i}", s, s * 0.6, s * 0.8, (x, top, z), col="#6a6660", style="rock", tone=3.0, sides=10)
    F.model("m", OTTER, 22, (0, top, -2), yaw=-15)
    F.model_clip("model_m", "turn", 2.0, amp=25)
    return F


def duck():
    F = Fig(f"{S}/duck", "Bath Duck", "The yellow duck that lives in the men's bath. Nobody knows whose it is.")
    top = tiles(F, 26, 24)
    wt = tub(F, "tub", 10, 6, (0, top, 0), water="#8ac8d0")
    F.model("m", DUCK, 10, (0, wt - 2.2, 0), yaw=-30, mat="gloss")
    F.model_clip("model_m", "wobble", 1.4, amp=8)
    return F


def family():
    F = Fig(f"{S}/family", "Capybara Family Bath", "Mother, father and the little one, all in one tub, all asleep.")
    top = tiles(F, 36, 28)
    wt = tub(F, "tub", 15, 8, (0, top, 0))
    F.model("a", CAPY, 15, (-4, top + 1.6, -3), yaw=-20)
    F.model("b", CAPY, 14, (5, top + 1.6, -1), yaw=-60)
    F.model("c", CAPY, 9, (0, top + 3.6, 6), yaw=10)
    steam(F, "steam", (-2, wt + 9, -6))
    return F


def rotenburo():
    F = Fig(f"{S}/rotenburo", "Rock Pool Under Snow", "The open-air bath in the snow: a frog, an otter and a capybara who do not get along.")
    top = slab(F, "base", 40, 30, 3.0, col="#e8ecf0", style="stone", tone=3.6)
    F.box("pool", [28, 0.6, 18], (0, top + 0.3, 0), ch=0.6, col="#7ab8c0", style="clear", tone=3.2)
    for i, (x, z, s) in enumerate([(-14, -8, 8), (13, -9, 7), (-15, 7, 6), (14, 8, 6), (0, -11, 7)]):
        F.blob(f"rock{i}", s, s * 0.7, s * 0.8, (x, top, z), col="#5a5650", style="rock", tone=2.8, sides=10)
        F.layer(f"rock{i}", id="snow", op="drip", ramp="white", tone=5.0, depth=0.35, length=0.2, width=0.5, scale=1.2)
    F.model("capy", CAPY, 13, (-3, top + 0.2, 1), yaw=-30)
    F.model("otter", OTTER, 14, (11, top + 3, -8), yaw=-50)
    F.model("frog", FROG, 6, (-14, top + 5.4, 7), yaw=40)
    steam(F, "steam", (0, top + 12, -2))
    return F


def kinkapi():
    F = Fig(f"{S}/kinkapi", "Golden Capybara", "The god of the baths: a golden capybara with a golden yuzu on its head.")
    top = slab(F, "base", 30, 24, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.box("cushion", [20, 2.4, 14], (0, top + 1.2, 0), ch=0.9, col="#8a1e28", style="velvet", tone=3.0)
    F.model("m", CAPY, 17, (0, top + 2.4, 0), yaw=-25, mat="metal", recolor=GOLD)
    F.model_clip("model_m", "turn", 2.4, amp=25)
    return F


FIGS = {"capy": capy, "penguin": penguin, "frog": frog, "otter": otter, "duck": duck, "family": family, "rotenburo": rotenburo, "kinkapi": kinkapi}
