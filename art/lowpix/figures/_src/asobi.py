"""Dagashi-ya Toys (駄菓子屋おもちゃ): the playable penny-shop toys (src/game/toys.js), sculpted in lowpix at their real
proportions as turned and pressed forms (lathe lofts with real profiles, chamfered pressed tin), in the line's
finish: lacquered wood, lithographed tinplate, foam and gloss plastic. They lie or stand on their own. Moving parts
are separate joints the game picks up by name (ken, tama, dart, key); gimmick points are pt_<name> joints."""
from figlib import Fig, text3

S = "asobi"


def mark(F, pid, face="bottom"):
    rows = text3("(C)KAPUKAPU") + ["..."] + text3("MADE IN JAPAN")
    w = max(len(r) for r in rows)
    F.stamp(pid, [r.center(w, ".") for r in rows], {"#": F.ids[pid]["paint"]["ramp"] + ":1"}, face, at="center")


def lathe(F, pid, prof, at=(0, 0, 0), sides=22, **kw):
    """A turned form from a (height, diameter) profile, bottom to top."""
    return F.loft(pid, [((0, y, 0), d) for y, d in prof], at, sides=sides, rnd=2.0, up=[0, 0, 1], **kw)


def squishy():
    F = Fig(f"{S}/squishy", "Melon-pan Squishy", "Hold to squeeze. Smells like a bakery. Squeaks like a duck.")
    lathe(F, "bun", [(0, 24), (0.8, 28), (3, 31), (7, 30), (11, 25), (14, 16), (15.5, 5), (15.8, 0.5)], col="#e2bc6e", style="food", tone=3.3)
    for i, ax in enumerate(([1, 0, 1], [1, 0, -1])):  # the cookie-crust grid, pressed in
        F.layer("bun", id=f"crust{i}", op="stripes", axis=ax, period=4.6, width=0.1, shift=-0.9, faces=["up"], bevel={"shadow": 1, "highlight": 1})
    F.layer("bun", id="bake", op="gradient", axis="y", amount=0.9)
    F.layer("bun", id="crumb", op="noise", scale=0.8, amount=0.8)  # the sugar crust's crumbly bake
    F.layer("bun", id="base", op="band", axis="y", **{"from": -1, "to": -0.6}, ramp=F.c("#caa060"), tone=3.0)
    mark(F, "bun", "start")
    return F


def superball():
    F = Fig(f"{S}/superball", "Super Ball", "Click to throw. It will find the one gap under the fridge.")
    lathe(F, "ball", [(0, 0.5), (0.8, 9), (2.6, 15.5), (5.5, 19.6), (9, 21), (12.5, 19.6), (15.4, 15.5), (17.2, 9), (18, 0.5)], sides=20,
          col="#2fa8c8", style="pvc", tone=3.0)
    F.layer("ball", id="swirl", op="stripes", axis=[1, 1, 0.3], period=6, width=0.32, wobble=0.6, ramp=F.c("#f0c840"), tone=3.6, bevel={"shadow": 1, "highlight": 1})
    F.layer("ball", id="swirl2", op="stripes", axis=[-1, 0.6, 1], period=7.5, width=0.22, wobble=0.6, ramp=F.c("#e0487a"), tone=3.2)
    return F


def koma():
    F = Fig(f"{S}/koma", "Spinning Top", "Click to spin it on the floor or the table. It wobbles like it means it.")
    lathe(F, "body", [(0.5, 1.6), (2.5, 7), (5.5, 15), (8.5, 22), (11, 26.5), (12.4, 27.6), (13.8, 27), (15, 22), (15.8, 11)],
          col="#d8b07a", style="wood", tone=3.4)
    for i, (a, b, c) in enumerate([(0.36, 0.46, "#b8302a"), (0.56, 0.62, "#2a6a44"), (0.7, 0.76, "#2a4a98")]):
        F.layer("body", id=f"ring{i}", op="band", axis="path", **{"from": a, "to": b}, ramp=F.c(c), tone=3.0, bevel={"shadow": 1, "highlight": 1})
    F.layer("body", id="turning", op="stripes", axis="y", period=1.1, width=0.3, shift=-0.5)  # lathe rings
    F.cyl("iron", 13.9, 1.4, (0, 11.4, 0), sides=24, col="#5a5c62", style="metal", tone=3.0, top=1.0)  # the iron tyre on the rim
    lathe(F, "stem", [(0, 5), (2, 4.6), (5.5, 3.8), (6.6, 4.4), (7.4, 3.0)], at=(0, 15.6, 0), sides=12, col="#7a4a24", style="wood", tone=3.0)
    lathe(F, "tip", [(0, 0.2), (0.6, 0.9), (1.2, 2.4)], sides=8, col="#9aa0a8", style="metal")
    mark(F, "body", "start")
    F.meta["lay"] = [0, 0, 62]  # a top rests on its side
    return F


def yoyo():
    F = Fig(f"{S}/yoyo", "Champion Yo-yo", "Click to throw it down. Hold to make it sleep. Walk the dog at your own risk.")
    for side, sgn in (("a", 1), ("b", -1)):
        # each half a turned disc lying on its face: a domed outside, a flat rim, a gap to the axle
        F.loft(f"disc_{side}", [((0, 0, 0.6 * sgn), [10, 10]), ((0, 0, 1.6 * sgn), [26, 26]), ((0, 0, 3.6 * sgn), [29, 29]),
                                ((0, 0, 5.6 * sgn), [27.5, 27.5]), ((0, 0, 6.8 * sgn), [22, 22]), ((0, 0, 7.2 * sgn), [12, 12])],
               (0, 14.6, 0), sides=22, rnd=2.0, col="#c82c28", style="pvc", tone=3.0)
        F.layer(f"disc_{side}", id="ring", op="band", axis="path", **{"from": 0.3, "to": 0.42}, ramp="white", tone=4.2)
        F.stamp(f"disc_{side}", ["....y....", "...yyy...", "yyyyyyyyy", ".yyyyyyy.", "..yyyyy..", ".yyy.yyy.", "yy.....yy"],
                {"y": F.c("#f0c840") + ":4"}, "end", at="center")
    F.cyl("axle", 2.0, 1.4, (0, 14.6, -0.7), sides=10, col="#c8c8d0", style="metal", rot=(90, 0, 0))
    F.loft("string", [((0, 0, 0), 0.6), ((0.5, 7, 0), 0.5), ((0, 12, 0), 0.5)], (0, 29, 0), sides=5, rnd=2, col="#f0ece0", style="matte", up=[0, 0, 1])
    return F


def robot():
    F = Fig(f"{S}/robot", "Wind-up Tin Robot", "Click to wind it up and set it down. It walks until it forgets why.")
    T = F.c("#2a58a8", k=0.1)  # lithographed blue tinplate
    for sx in (-1, 1):  # pressed-tin legs, splayed boots
        F.taper(f"leg{sx}", [6, 12, 6.5], (sx * 4.2, 7, 0), front=(0.86, 0.86), ch=1.2, col=T, style="tin", tone=3.2, rot=(90, 0, 0))
        F.taper(f"foot{sx}", [7.4, 3.2, 11], (sx * 4.2, 1.6, 1.4), front=(0.8, 0.7), ch=1.2, col="#b8302a", style="tin", tone=3.0)
        F.layer(f"leg{sx}", id="bands", op="stripes", axis="y", period=3.0, width=0.2, ramp=F.c("#e8b830"), tone=3.4)
        F.layer(f"leg{sx}", id="wear", op="wear", width=2, density=0.3, ramp="steel", tone=4.0, post=True)
    F.taper("chest", [21, 17, 14], (0, 21.5, 0), front=(0.9, 0.92), ch=2.2, col=T, style="tin", tone=3.3, rot=(90, 0, 0), seam="x")
    F.layer("chest", id="panel", op="rect", rect=[0.14, 0.18, 0.86, 0.86], ramp=F.c("#e8b830"), tone=3.4, faces=["front"], bevel=True)
    F.layer("chest", id="panel2", op="rect", rect=[0.22, 0.58, 0.78, 0.8], ramp=F.c("#c82c28"), tone=3.0, faces=["front"], bevel=True)
    F.layer("chest", id="gauges", op="spots", centers=[[-4.5, 2.5, 7, 2.2], [0, 2.5, 7, 2.2], [4.5, 2.5, 7, 2.2]], ramp="white", tone=4.2, faces=["front"],
            bevel={"shadow": 1, "highlight": 0})
    F.layer("chest", id="needles", op="spots", centers=[[-4.5, 2.5, 7, 0.6], [0, 2.5, 7, 0.6], [4.5, 2.5, 7, 0.6]], ramp="ink", tone=1.0, faces=["front"])
    F.layer("chest", id="vent", op="grille", rect=[0.28, 0.6, 0.72, 0.76], period=2, dir="h", faces=["front"])
    F.layer("chest", id="sidelitho", op="stripes", axis="y", period=3.0, width=0.18, ramp=F.c("#e8b830"), tone=3.4, faces=["sides"])
    F.layer("chest", id="wear", op="wear", width=2, density=0.3, ramp="steel", tone=4.0, post=True)
    F.layer("chest", id="rivets", op="rivets", inset=2, spacing=8, faces=["sides", "front", "back"])
    F.stamp("chest", text3("ROBO-1"), {"#": F.c("#f0c840") + ":4"}, "front", at="center", off=(0, -12))
    for sx in (-1, 1):
        F.bone(f"arm{sx}", (sx * 12, 27, 0), rot=(20, 0, sx * 10))
        F.loft(f"arm{sx}_m", [((0, 0, 0), [4.6, 4.6]), ((0, -6, 0), [4.2, 4.2]), ((0, -11, 0), [4.0, 4.0])], (0, 0, 0), sides=10, rnd=2.4,
               col=T, style="tin", tone=3.2, parent=f"arm{sx}", up=[0, 0, 1])
        F.taper(f"hand{sx}", [5.2, 3.6, 5.2], (0, -12.6, 0), front=(0.7, 0.8), ch=1.0, col="#5a5a62", style="metal", tone=3.0, parent=f"arm{sx}")
    F.taper("head", [15, 12.5, 13], (0, 36, 0), front=(0.9, 0.9), ch=2.4, col=T, style="tin", tone=3.4, rot=(90, 0, 0), seam="x")
    for sx in (-1, 1):
        F.cyl(f"eye{sx}", 2.6, 1.2, (sx * 3.8, 37.6, 6.4), sides=14, col="#f0e8b0", style="glow", tone=4.0, rot=(90, 0, 0))
    F.layer("head", id="face", op="rect", rect=[0.12, 0.1, 0.88, 0.9], ramp=F.c("#c82c28"), tone=3.0, faces=["front"], bevel=True)
    F.layer("head", id="mouth", op="grille", rect=[0.25, 0.12, 0.75, 0.36], period=2, dir="v", ramp="steel", tone=4.0, faces=["front"])
    F.layer("head", id="rivets", op="rivets", inset=2, spacing=6, faces=["sides", "front", "back"])
    F.layer("head", id="wear", op="wear", width=2, density=0.3, ramp="steel", tone=4.0, post=True)
    F.cyl("antenna", 0.7, 5, (0, 42.2, 0), sides=8, col="#b8302a", style="metal")
    lathe(F, "ball", [(0, 0.3), (0.8, 2.8), (1.8, 3.4), (2.8, 2.8), (3.4, 0.3)], at=(0, 46.6, 0), sides=10, col="#b8302a", style="pvc")
    F.bone("key", (0, 22, -7.4))
    F.taper("key_bar", [8, 2.6, 1.0], (0, 0, -1.8), front=(0.8, 0.8), ch=0.4, col="#d0a840", style="metal", tone=3.6, parent="key")
    F.cyl("key_stem", 0.7, 2.4, (0, 0, 0), sides=8, col="#8a8a90", style="metal", parent="key", rot=(90, 0, 0))
    F.pt("key", (0, 22, -7.4))
    F.meta["separate"] = ["key"]
    mark(F, "foot1")
    return F


def kendama():
    F = Fig(f"{S}/kendama", "Lacquer Kendama", "Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.")
    L = F.c("#b82c28")
    F.bone("ken", (0, 0, 0))
    lathe(F, "handle", [(0, 6.4), (1.6, 7.2), (3, 5.6), (10, 5.0), (19, 4.4), (22, 4.8)], at=(0, -8.5, 0), sides=10, col="#e0bc84",
          style="wood", tone=3.4, parent="ken")
    F.loft("cross", [((0, 0, -11), [4.6, 4.6]), ((0, 0, -9), [6.8, 6.8]), ((0, 0, 9), [6.8, 6.8]), ((0, 0, 11), [4.6, 4.6])], (0, 17, 0),
           sides=14, rnd=2.2, col="#e0bc84", style="wood", tone=3.4, rot=[0, 90, 0], parent="ken")
    for nm, x, d in (("cup_big", -11.5, 11.0), ("cup_small", 11.5, 9.2)):  # turned cups, flared and dished
        F.loft(nm, [((0, 0, 0), [4.4, 4.4]), ((0, 0, 1.6), [d * 0.7, d * 0.7]), ((0, 0, 3.2), [d, d]), ((0, 0, 3.6), [d * 0.86, d * 0.86])],
               (x, 17, 0), sides=16, rnd=2.0, col="#e0bc84", style="wood", tone=3.5, rot=(0, 90 if x > 0 else -90, 0), parent="ken")
    lathe(F, "spike", [(0, 4.6), (2, 4.0), (6, 1.8), (8, 0.4)], at=(0, 20, 0), sides=12, col="#e0bc84", style="wood", tone=3.5, parent="ken")
    F.bone("tama", (6, 4, 7))
    lathe(F, "ball", [(0, 0.5), (0.8, 7), (2.4, 11.6), (5.9, 13.2), (9.4, 11.6), (11, 7), (11.8, 0.5)], at=(0, -5.9, 0), sides=14,
          col=L, style="glaze", tone=3.0, parent="tama")
    F.layer("ball", id="band", op="band", axis="path", **{"from": 0.46, "to": 0.54}, ramp="white", tone=4.4)
    F.loft("string", [((0, 0, 0), 0.5), ((3, -3, 3), 0.45), ((6, 0, 7), 0.45)], (0, 17, 1), sides=5, rnd=2, col="#f0ece0", style="matte")
    for n, p in {"from": (0, 30, 0), "big": (-13, 23, 0), "small": (13, 22, 0), "spike": (0, 29, 0), "miss": (6, 4, 6)}.items():
        F.pt(n, p)
    F.meta["lay"] = [0, 0, 90]  # laid on its side on the shelf
    return F


def dartgun():
    F = Fig(f"{S}/dartgun", "Foam Dart Blaster", "Click to fire. The darts stick to walls, windows and very surprised neighbours.")
    O = F.c("#e8822a")
    F.loft("barrel", [((0, 0, -18), [12.0, 9.6]), ((0, 0.4, -14), [13.0, 10.4]), ((0, 0.4, 12), [12.6, 9.8]), ((0, 0, 17), [11.0, 8.2])], (0, 30, 0),
           sides=12, rnd=1.4, col=O, style="pvc", tone=3.2)
    F.layer("barrel", id="stripe", op="band", axis="y", **{"from": -0.2, "to": 0.2}, ramp=F.c("#3a7ed8"), tone=3.0, faces=["sides"], bevel=True)
    F.loft("grip", [((0, 0, 0), [12.4, 8.6]), ((0, 10, 1.6), [12.8, 9.0]), ((0, 20, 3.0), [12.2, 8.2])], (0, 5, -10), sides=10, rnd=1.4,
           col="#2a2a2e", style="matte", tone=2.8, up=[0, 0, 1])
    F.layer("grip", id="knurl", op="stripes", axis="y", period=1.4, width=0.3, shift=-0.6)
    F.taper("guard", [4, 7, 3], (0, 22, 4), front=(0.8, 0.8), ch=1.0, col="#2a2a2e", style="matte")
    lathe(F, "muzzle", [(0, 7.6), (1.4, 8.0), (3.6, 7.2), (4.2, 5.6)], at=(0, 30, 17), sides=14, col="#3a7ed8", style="pvc", rot=(90, 0, 0))
    F.taper("sight", [5, 3, 14], (0, 36.2, 2), front=(0.7, 0.8), ch=1.0, col="#f0d04a", style="pvc", tone=3.4)
    F.bone("dart", (0, 0, 0))
    F.loft("dart_foam", [((0, 0, -7), [3.4, 3.4]), ((0, 0, 3), [3.4, 3.4])], (0, 0, 0), sides=10, rnd=2.4, col=O, style="matte", tone=3.4, parent="dart")
    lathe(F, "dart_tip", [(0, 3.6), (1.2, 4.8), (2.0, 3.2)], at=(0, 0, 3), sides=12, col="#3a7ed8", style="pvc", rot=(90, 0, 0), parent="dart")
    F.pt("muzzle", (0, 30, 23))
    F.meta["separate"] = ["dart"]
    mark(F, "grip", "start")
    F.meta["lay"] = [0, 0, 90]  # laid on its side on the shelf
    return F


def lcdgame():
    F = Fig(f"{S}/lcdgame", "Pocket LCD Game", "Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.")
    F.taper("case", [34, 44, 8], (0, 22, 0), front=(0.96, 0.97), ch=2.6, col="#d4cfc2", style="pvc", tone=3.4, seam="x")
    F.layer("case", id="bezel", op="rect", rect=[0.08, 0.06, 0.92, 0.5], ramp=F.c("#2a2a34"), tone=2.4, faces=["front"], bevel=True)
    F.layer("case", id="screen", op="rect", rect=[0.15, 0.12, 0.85, 0.44], ramp=F.c("#9cab8a"), tone=3.0, faces=["front"])
    F.stamp("case", text3("CAPSULE DASH"), {"#": F.c("#8a2a2a") + ":2"}, "front", at="center", off=(0, 12))
    F.layer("case", id="dpad", op="rect", rect=[0.1, 0.66, 0.34, 0.86], ramp="ink", tone=1.4, faces=["front"], bevel=True)
    F.layer("case", id="speaker", op="grille", rect=[0.6, 0.9, 0.9, 0.96], period=2, dir="v", faces=["front"])
    F.layer("case", id="grain", op="stripes", axis="y", period=1.2, width=0.35, shift=-0.35, faces=["sides", "back"])  # moulded texture
    for i, (x, y) in enumerate([(9, 11), (3, 7)]):
        lathe(F, f"btn{i}", [(0, 6.0), (0.9, 6.0), (1.5, 4.8)], at=(x, y, 4), sides=12, col="#c82c28", style="pvc", rot=(90, 0, 0))
    F.pt("scrA", (-11.9, 38.7, 4.15))
    F.pt("scrB", (11.9, 24.6, 4.15))
    F.meta["screen"] = True
    mark(F, "case", "back")
    return F


FIGS = {"squishy": squishy, "superball": superball, "koma": koma, "yoyo": yoyo, "robot": robot, "kendama": kendama, "dartgun": dartgun, "lcdgame": lcdgame}
