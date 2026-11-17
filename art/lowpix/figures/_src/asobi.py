"""Dagashi-ya Toys (駄菓子屋おもちゃ): the playable penny-shop toys (src/game/toys.js) modelled in lowpix at their real
proportions: lathe-turned wood, tinplate, lacquer, foam and gloss plastic. Moving parts are separate joints the game
picks up by name (ken, tama, dart, key) and gimmick points are pt_<name> joints."""
from figlib import Fig, text3, text_jp

S = "asobi"


def mark(F, pid, face="bottom"):
    rows = text3("(C)KAPUKAPU") + ["..."] + text3("MADE IN JAPAN")
    w = max(len(r) for r in rows)
    F.stamp(pid, [r.center(w, ".") for r in rows], {"#": F.ids[pid]["paint"]["ramp"] + ":1"}, face, at="center")


def squishy():
    F = Fig(f"{S}/squishy", "Melon-pan Squishy", "Hold to squeeze. Smells like a bakery. Squeaks like a duck.")
    F.blob("bun", 30, 17, 30, (0, 0, 0), col="#e8c878", style="food", tone=3.4, sides=16, rnd=2.0, bottom=0.92, top=0.55)
    F.layer("bun", id="crust", op="stripes", axis=[1, 0, 1], period=4.2, width=0.12, shift=-0.9, faces=["up"], bevel={"shadow": 1, "highlight": 1})
    F.layer("bun", id="crust2", op="stripes", axis=[1, 0, -1], period=4.2, width=0.12, shift=-0.9, faces=["up"], bevel={"shadow": 1, "highlight": 1})
    F.layer("bun", id="sugar", op="speckle", density=0.18, shift=1.4, faces=["up"])
    F.layer("bun", id="bake", op="gradient", axis="y", amount=0.8)
    F.layer("bun", id="base", op="band", axis="y", **{"from": -1, "to": -0.55}, ramp=F.c("#d8a868"), tone=3.0)
    mark(F, "bun", "start")
    return F


def superball():
    F = Fig(f"{S}/superball", "Super Ball", "Click to throw. It will find the one gap under the fridge.")
    F.loft("ball", [((0, 0, 0), 0.1), ((0, 2.2, 0), 15), ((0, 7, 0), 25), ((0, 13, 0), 25), ((0, 17.8, 0), 15), ((0, 20, 0), 0.1)], (0, 0, 0),
           sides=16, rnd=2.0, col="#3ab8d8", style="pvc", tone=3.2, up=[0, 0, 1])
    F.layer("ball", id="swirl", op="stripes", axis=[1, 1, 0.3], period=5.5, width=0.3, wobble=0.5, ramp=F.c("#f0d040"), tone=3.6,
            bevel={"shadow": 1, "highlight": 1})
    F.layer("ball", id="swirl2", op="stripes", axis=[-1, 0.6, 1], period=7, width=0.2, wobble=0.5, ramp=F.c("#e84a8a"), tone=3.2)
    F.layer("ball", id="glitter", op="speckle", density=0.06, shift=1.6)
    return F


def koma():
    F = Fig(f"{S}/koma", "Spinning Top", "Click to spin it on the floor or the table. It wobbles like it means it.")
    F.loft("body", [((0, 0.6, 0), 1.2), ((0, 4, 0), 10), ((0, 9, 0), 22), ((0, 12.5, 0), 26), ((0, 14.5, 0), 25), ((0, 16, 0), 12)], (0, 0, 0),
           sides=18, rnd=2.0, col="#e0bc84", style="wood", tone=3.4, up=[0, 0, 1])
    for i, (a, b, c) in enumerate([(0.42, 0.52, "#c8302a"), (0.62, 0.68, "#2a7a4a"), (0.74, 0.8, "#2a4aa8")]):
        F.layer("body", id=f"ring{i}", op="band", axis="path", **{"from": a, "to": b}, ramp=F.c(c), tone=3.0, bevel={"shadow": 1, "highlight": 1})
    F.cyl("stem", 2.4, 7, (0, 15.5, 0), sides=10, col="#8a5a2a", style="wood", tone=3.0, top=0.85)
    F.loft("tip", [((0, 0, 0), 0.4), ((0, 1.4, 0), 1.6)], (0, 0, 0), sides=8, rnd=2, col="#9aa0a8", style="metal", up=[0, 0, 1])
    return F


def yoyo():
    F = Fig(f"{S}/yoyo", "Champion Yo-yo", "Click to throw it down. Hold to make it sleep. Walk the dog at your own risk.")
    for side, z in (("a", 3.6), ("b", -3.6)):
        F.add(f"disc_{side}", "prism", (0, 14, z), size=[28, 28, 6.0], sides=20, col="#d8302a", style="pvc", tone=3.0,
              front_scale=[0.84, 0.84] if z > 0 else [1, 1], back_scale=[0.84, 0.84] if z < 0 else [1, 1], seam="x")
        F.layer(f"disc_{side}", id="ring", op="band", axis="y", **{"from": -1, "to": 1}, faces=["front" if z > 0 else "back"], ramp="white", tone=4.4)
        F.layer(f"disc_{side}", id="center", op="spots", centers=[[0, 0, 3.2 if z > 0 else -3.2, 8]], ramp=F.c("#d8302a"), tone=3.0, faces=["front", "back"])
        F.stamp(f"disc_{side}", ["....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyyyy..", ".yyy.yyy.", "yy.....yy"], {"y": F.c("#f0d040") + ":4"},
                "front" if z > 0 else "back", at="center", off=(1, 0))
    F.cyl("axle", 2.2, 1.6, (0, 14, -0.8), sides=10, col="#c8c8d0", style="metal", rot=(90, 0, 0))
    F.loft("string", [((0, 0, 0), 0.6), ((0.4, 7, 0), 0.5), ((0, 12, 0), 0.5)], (0, 28, 0), sides=6, rnd=2, col="#f0ece0", style="matte", up=[0, 0, 1])
    return F


def robot():
    F = Fig(f"{S}/robot", "Wind-up Tin Robot", "Click to wind it up and set it down. It walks until it forgets why.")
    T = F.c("#b8c0cc", k=0.2)
    for sx in (-1, 1):
        F.box(f"leg{sx}", [6.5, 12, 7], (sx * 4.2, 6.5, 0), ch=0.6, col=T, style="tin", tone=3.2)
        F.box(f"foot{sx}", [7.5, 3, 10.5], (sx * 4.2, 1.5, 1.4), ch=0.8, col="#c8302a", style="tin", tone=3.0)
    F.box("chest", [20, 16, 14], (0, 21, 0), ch=1.2, col=T, style="tin", tone=3.3, seam="x")
    F.layer("chest", id="panel", op="rect", rect=[0.2, 0.25, 0.8, 0.8], ramp=F.c("#2a4aa8"), tone=3.0, faces=["front"], bevel=True)
    F.layer("chest", id="vent", op="grille", rect=[0.25, 0.32, 0.75, 0.55], period=2, dir="h", faces=["front"])
    F.layer("chest", id="rivets", op="rivets", inset=2, spacing=8, faces=["sides", "front", "back"])
    F.stamp("chest", text3("ROBO-1"), {"#": F.c("#f0d040") + ":4"}, "front", at="center", off=(0, -12))
    for sx in (-1, 1):
        F.bone(f"arm{sx}", (sx * 11.5, 26, 0), rot=(20, 0, sx * 10))
        F.box(f"arm{sx}_m", [4.4, 12, 4.4], (0, -5, 0), ch=0.6, col=T, style="tin", tone=3.2, parent=f"arm{sx}")
        F.box(f"hand{sx}", [5.2, 3.4, 5.2], (0, -12.2, 0), ch=0.8, col="#5a5a62", style="metal", tone=3.0, parent=f"arm{sx}")
    F.box("head", [15, 12, 13], (0, 35.5, 0), ch=1.2, col=T, style="tin", tone=3.4, seam="x")
    for sx in (-1, 1):
        F.cyl(f"eye{sx}", 2.6, 1.2, (sx * 3.8, 37, 6.4), sides=12, col="#f0e8b0", style="glow", tone=4.0, rot=(90, 0, 0))
    F.layer("head", id="mouth", op="grille", rect=[0.3, 0.15, 0.7, 0.32], period=2, dir="v", faces=["front"])
    F.cyl("antenna", 0.8, 5, (0, 41.5, 0), sides=8, col="#c8302a", style="metal")
    F.loft("ball", [((0, 0, 0), 0.1), ((0, 1, 0), 3.2), ((0, 2.2, 0), 3.2), ((0, 3, 0), 0.1)], (0, 46, 0), sides=10, rnd=2, col="#c8302a", style="pvc", up=[0, 0, 1])
    F.bone("key", (0, 22, -7.4))
    F.box("key_bar", [8, 2.6, 1.0], (0, 0, -1.8), ch=0.3, col="#d8b040", style="metal", tone=3.6, parent="key")
    F.cyl("key_stem", 0.7, 2.4, (0, 0, 0), sides=8, col="#8a8a90", style="metal", parent="key", rot=(90, 0, 0))
    F.pt("key", (0, 22, -7.4))
    F.meta["separate"] = ["key"]
    mark(F, "foot1")
    return F


def kendama():
    F = Fig(f"{S}/kendama", "Lacquer Kendama", "Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.")
    L = F.c("#c8302a")
    F.bone("ken", (0, 0, 0))
    F.cyl("handle", 2.6, 22, (0, -6, 0), sides=12, col="#e6c48a", style="wood", tone=3.4, top=0.7, parent="ken")
    F.cyl("knob", 3.6, 3, (0, -8.5, 0), sides=12, col=L, style="glaze", tone=3.0, top=1.2, parent="ken")
    F.add("cross", "prism", (0, 20, 0), size=[6.5, 6.5, 22], sides=12, col=L, style="glaze", tone=3.0, rot=[0, 90, 0], parent="ken")
    F.cyl("cup_big", 4.6, 4, (-11, 20, 0), sides=14, col=L, style="glaze", tone=3.2, rot=(0, 0, 90), top=1.35, parent="ken")
    F.cyl("cup_small", 3.8, 4, (11, 20, 0), sides=14, col=L, style="glaze", tone=3.2, rot=(0, 0, -90), top=1.35, parent="ken")
    F.cyl("spike", 2.0, 8, (0, 23, 0), sides=10, col=L, style="glaze", tone=3.2, top=0.35, parent="ken")
    F.bone("tama", (6, 4, 7))
    F.loft("ball", [((0, 0, 0), 0.1), ((0, 1.2, 0), 7), ((0, 4, 0), 11.5), ((0, 7.5, 0), 11.5), ((0, 10.6, 0), 7), ((0, 11.8, 0), 0.1)], (0, -5.9, 0),
           sides=16, rnd=2.0, col=L, style="glaze", tone=3.0, up=[0, 0, 1], parent="tama")
    F.layer("ball", id="band", op="band", axis="path", **{"from": 0.46, "to": 0.54}, ramp="white", tone=4.4)
    F.loft("string", [((0, 0, 0), 0.5), ((3, -3, 3), 0.45), ((6, 0, 7), 0.45)], (0, 17, 1), sides=6, rnd=2, col="#f0ece0", style="matte")
    for n, p in {"from": (0, 30, 0), "big": (-12, 26, 0), "small": (12, 25, 0), "spike": (0, 33, 0), "miss": (6, 4, 6)}.items():
        F.pt(n, p)
    return F


def dartgun():
    F = Fig(f"{S}/dartgun", "Foam Dart Blaster", "Click to fire. The darts stick to walls, windows and very surprised neighbours.")
    O = F.c("#f08a2a")
    F.box("barrel", [9, 10, 36], (0, 30, 0), ch=1.6, col=O, style="pvc", tone=3.2, seam="x")
    F.layer("barrel", id="stripe", op="band", axis="y", **{"from": -0.2, "to": 0.2}, ramp=F.c("#3f86e8"), tone=3.0, faces=["sides"], bevel=True)
    F.stamp("barrel", text3("FOAM-X"), {"#": "ink:0"}, "right", at="center")
    F.stamp("barrel", text3("FOAM-X"), {"#": "ink:0"}, "left", at="center")
    F.box("grip", [7, 22, 9], (0, 15, -8), ch=1.4, col="#2a2a2e", style="matte", tone=2.8, rot=(-18, 0, 0))
    F.layer("grip", id="knurl", op="stripes", axis="y", period=1.2, width=0.3, shift=-0.6, faces=["sides"])
    F.box("guard", [4, 7, 3], (0, 22, 4), ch=0.6, col="#2a2a2e", style="matte")
    F.cyl("muzzle", 3.6, 4, (0, 30, 18), sides=12, col="#3f86e8", style="pvc", rot=(90, 0, 0))
    F.box("sight", [5, 3, 14], (0, 36.5, 2), ch=0.8, col="#f6d84a", style="pvc", tone=3.4)
    F.bone("dart", (0, 0, 0))
    F.box("dart_foam", [3.4, 3.4, 10], (0, 0, -2), ch=1.2, col=O, style="matte", tone=3.4, parent="dart")
    F.cyl("dart_tip", 2.2, 2.4, (0, 0, 3.6), sides=10, col="#3f86e8", style="pvc", rot=(90, 0, 0), parent="dart")
    F.pt("muzzle", (0, 30, 23))
    F.meta["separate"] = ["dart"]
    mark(F, "grip", "bottom")
    return F


def lcdgame():
    F = Fig(f"{S}/lcdgame", "Pocket LCD Game", "Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.")
    F.box("case", [34, 44, 8], (0, 22, 0), ch=1.6, col="#d8d4c8", style="pvc", tone=3.4, seam="x")
    F.layer("case", id="bezel", op="rect", rect=[0.08, 0.06, 0.92, 0.5], ramp=F.c("#2a2a34"), tone=2.4, faces=["front"], bevel=True)
    F.layer("case", id="screen", op="rect", rect=[0.15, 0.12, 0.85, 0.44], ramp=F.c("#9fae8e"), tone=3.0, faces=["front"])
    F.stamp("case", text3("CAPSULE DASH"), {"#": F.c("#8a2a2a") + ":2"}, "front", at="center", off=(0, 12))
    F.layer("case", id="dpad", op="rect", rect=[0.1, 0.66, 0.34, 0.86], ramp="ink", tone=1.4, faces=["front"], bevel=True)
    F.layer("case", id="speaker", op="grille", rect=[0.6, 0.9, 0.9, 0.96], period=2, dir="v", faces=["front"])
    for i, (x, y) in enumerate([(9, 11), (3, 7)]):
        F.cyl(f"btn{i}", 3.0, 1.4, (x, y, 4), sides=12, col="#d8302a", style="pvc", rot=(90, 0, 0))
    F.pt("scrA", (-11.9, 38.7, 4.15))
    F.pt("scrB", (11.9, 24.6, 4.15))
    F.meta["screen"] = True
    mark(F, "case", "back")
    return F


FIGS = {"squishy": squishy, "superball": superball, "koma": koma, "yoyo": yoyo, "robot": robot, "kendama": kendama, "dartgun": dartgun, "lcdgame": lcdgame}
