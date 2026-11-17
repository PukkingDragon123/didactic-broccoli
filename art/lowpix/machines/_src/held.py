"""Things you hold: the ¥100 coin (cupronickel, reeded edge, the cherry blossom and 100, 日本国 and the year on the back:
the real coin's design is public domain currency art, drawn here as pixel art), the old brass garage key, Mikawa-ya's
1 L milk carton (an original dairy's print), the shop's wooden OPEN / CLOSED sign (営業中 / 準備中).
Each is its own small spec (the props draw a whole GLB: src/kit/assets.js), real size in mm, origin at its centre
(the coin) or bottom centre, front +Z.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text5, text_jp  # noqa: E402


def x2(rows, k=2):
    return ["".join(c * k for c in r) for r in rows for _ in range(k)]


def coins():
    s = Spec("coins", "Yen coins", dens=6.0, budget=2000, light={"dir": [-0.5, 1.0, 0.7], "strength": 0.4, "gradient": 0.0, "ao": 0.0, "ao_height": 1.0})
    nickel = s.raw("nickel", ["#4a4d52", "#6a6e74", "#8c9096", "#aeb2b8", "#c8ccd0", "#dde0e3", "#f0f2f4"])
    s.joint("yen100", (0, 0, 0))
    s.disc("c100", 11.3, 1.7, (0, 0, 0), axis="y", parent="yen100", sides=28, col=nickel, style="chrome", tone=3.6)
    s.layer("c100", id="reeds", op="fill", faces=[f"side{i}" for i in range(0, 28, 2)], shift=-0.9)
    # the face: a raised rim, the cherry blossom (five petals) and 100
    R = int(11.3 * 6)
    art = []
    for yy in range(-R, R + 1):
        row = ""
        for xx in range(-R, R + 1):
            d = math.hypot(xx, yy)
            if d > R - 0.5:
                row += "."
            elif d > R - 4:
                row += "h" if (xx + yy) < 0 else "s"
            else:
                a = math.atan2(yy, xx)
                cx, cy = xx + R * 0.18, yy + R * 0.12
                pr = math.hypot(cx, cy)
                pa = math.atan2(cy, cx)
                petal = pr < R * 0.42 * (0.62 + 0.38 * abs(math.cos(2.5 * pa)))
                if petal and pr > R * 0.1:
                    row += "l" if (cx + cy) < 0 else "m"
                elif petal:
                    row += "d"
                else:
                    row += "."
        art.append(row)
    key = {"h": f"{nickel}:6", "s": f"{nickel}:2", "l": f"{nickel}:5", "m": f"{nickel}:3", "d": f"{nickel}:1"}
    s.stamp("c100", art, key, face="front")
    digits = [r.replace("#", "i") for r in text5("100")]
    big = ["".join(c * 2 for c in r) for r in digits for _ in (0, 1)]
    s.stamp("c100", big, {"i": f"{nickel}:1"}, face="front", at=[R + 10, R + 2])
    s.stamp("c100", text_jp("日本国 百円", 9, "i"), {"i": f"{nickel}:1"}, face="back", at="center")
    return s


def key():
    s = Spec("key", "Old garage key", dens=5.0, budget=1500, light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.0, "ao": 0.0, "ao_height": 1.0})
    brass = s.c("#c0902e", hue=16, k=0.0)
    # lying flat, the bow (a round head with its hole) at -x, the shank to +x, the bit hanging down at the tip
    s.disc("bow", 11, 2.4, (-26, 1.2, 0), axis="y", sides=16, col=brass, style="gold")
    s.disc("bow_hole", 4.2, 2.6, (-29, 1.25, 0), axis="y", sides=10, col="cavity", style="cavity", tone=1.0)
    s.box("collar", [5, 3.2, 7], (-14.5, 1.6, 0), ch=1.0, col=brass, style="gold")
    s.disc("shank", 2.6, 40, (6, 1.6, 0), axis="x", sides=8, col=brass, style="gold")
    s.box("bit", [10, 2.0, 8], (21, 1.0, 5.5), ch=0.6, col=brass, style="gold")
    s.layer("bit", id="wards", op="stripes", axis="x", period=3, width=0.3, shift=-1.2)
    s.box("tag", [16, 0.8, 26], (-46, 0.4, 0), ch=2, col="paperw", style="paper", tone=4.6, rot=[0, 18, 0])
    s.stamp("tag", text_jp("ガレージ", 7, "i"), {"i": "ink:2"}, face="top", at="center")
    s.loft("string", [((-36, 0.6, 0), 1.0), ((-39, 1.6, 2), 1.0), ((-42, 0.6, 1), 1.0)], (0, 0, 0), sides=5, rnd=2, subdiv=1, col=s.c("#c8382c"), style="rubber")
    return s


def milk():
    s = Spec("milk", "Milk carton (1 L)", dens=2.0, budget=1500, light={"dir": [-0.5, 1.0, 0.7], "strength": 0.4, "gradient": 0.15, "ao": 0.3, "ao_height": 30.0})
    white = s.c("#f8f6f0", k=0.0)
    blue = s.c("#2456b0", k=0.1)
    sky = s.c("#8cc6ee", k=0.1)
    red = s.c("#d8342e", k=0.1)
    s.box("body", [70, 160, 70], (0, 80, 0), ch=1.2, col=white, style="paper", hide=["top"])
    s.layer("body", id="band", op="band", axis="y", **{"from": -1.0, "to": -0.55}, ramp=blue, tone=3.0)
    s.layer("body", id="sky", op="band", axis="y", **{"from": -0.55, "to": -0.45}, ramp=sky, tone=3.5)
    s.layer("body", id="hill", op="band", axis="y", **{"from": -0.45, "to": -0.3}, wobble=0.12, wobble_scale=30, ramp=s.c("#58a048"), tone=3.5)
    for f in ("front", "back"):
        s.stamp("body", text_jp("牛乳", 44, "i"), {"i": f"{blue}:2"}, face=f, at="center", off=(0, -30))
        s.stamp("body", x2(text5("MIKAWA", "i")), {"i": f"{red}:3"}, face=f, at="center", off=(0, 18))
        s.stamp("body", x2(text3("1000ML", "i")), {"i": "paperw:6"}, face=f, at="bottom", off=(0, -10))
    # the gable top: two sloping panels and the sealed fin
    s.taper("gable", [70, 70, 36], (0, 178, 0), front=[1.0, 0.0], rot=[-90, 0, 0], col=white, style="paper", tone=4.8)
    s.box("fin", [70, 10, 3], (0, 199, 0), ch=0.5, col=white, style="paper", tone=4.4)
    s.layer("fin", id="date", op="rect", rect=[0.1, 0.3, 0.6, 0.7], ramp=blue, tone=2.0, faces=["front"])
    return s


def open_sign():
    s = Spec("open_sign", "Shop sign (OPEN / CLOSED)", dens=0.9, budget=1500, light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.15, "ao": 0.3, "ao_height": 60.0})
    wood = s.c("#9a6a3a", hue=12)
    cream = s.c("#f4ecd8", k=0.0)
    red = s.c("#d8282a", k=0.1)
    s.box("board", [440, 208, 16], (0, 104, 0), ch=3, col=wood, style="plank")
    s.box("panel_f", [370, 140, 1.5], (0, 98, 8.5), ch=0, col=cream, style="paper", tone=4.2)
    s.box("panel_b", [370, 140, 1.5], (0, 98, -8.5), ch=0, col=cream, style="paper", tone=4.0)
    s.stamp("panel_f", text_jp("営業中", 40, "i"), {"i": f"{red}:3"}, face="front", at="center", off=(0, -8))
    s.stamp("panel_f", x2(text5("OPEN", "i")), {"i": "ink:2"}, face="front", at="bottom", off=(0, -8))
    s.stamp("panel_b", text_jp("準備中", 40, "i"), {"i": "ink:2"}, face="back", at="center", off=(0, -8))
    s.stamp("panel_b", x2(text5("CLOSED", "i")), {"i": f"{red}:3"}, face="back", at="bottom", off=(0, -8))
    for k, sx in (("l", -1), ("r", 1)):
        s.disc("eye_" + k, 5, 18, (sx * 170, 196, 0), axis="z", sides=8, col="steel", style="steel")
    s.loft("cord", [((-170, 200, 0), 3), ((-90, 255, 0), 3), ((0, 272, 0), 3), ((90, 255, 0), 3), ((170, 200, 0), 3)], (0, 0, 0), sides=5, rnd=2,
           subdiv=1, col=s.c("#c8b48a"), style="rubber", tone=4.0)
    return s


def coin_bag():
    """The little cloth coin bag the coin box empties into (src/game/cash.js): red cotton gathered at the neck by a
    yellow drawstring, a stamped coin mark. Origin at its centre."""
    s = Spec("coin_bag", "Cloth coin bag", dens=2.2, budget=1500, light={"dir": [-0.5, 1.0, 0.7], "strength": 0.5, "gradient": 0.2, "ao": 0.4, "ao_height": 20.0})
    cloth = s.c("#8a3a2a", hue=14)
    cord = s.c("#e8c860", hue=12)
    s.joint("bag", (0, 0, 0))
    s.loft("bag_b", [((0, -40, 0), [40, 36]), ((0, -30, 0), [80, 72]), ((0, -8, 0), [90, 80]), ((0, 14, 0), [70, 62]), ((0, 30, 0), [30, 28]),
                     ((0, 36, 0), [36, 32]), ((0, 46, 0), [40, 36])], (0, 0, 0), parent="bag", sides=12, rnd=2.2, subdiv=1, col=cloth, style="paper",
           caps=(True, True), up=[0, 0, 1])
    s.layer("bag_b", id="folds", op="stripes", axis="around", period=0.083, width=0.3, shift=-0.8, range=[0.55, 1.0])
    s.layer("bag_b", id="weave", op="noise", scale=3, amount=0.3)
    s.loft("cord", [((-20, 31, 18), 4), ((0, 32, 21), 4), ((20, 31, 18), 4), ((22, 32, -6), 4), ((0, 32, -20), 4), ((-22, 31, -6), 4), ((-20, 31, 18), 4)],
           (0, 0, 0), parent="bag", sides=6, rnd=2, subdiv=1, col=cord, style="rubber", tone=4.0)
    s.loft("tail", [((20, 31, 18), 3.5), ((26, 18, 26), 3.5), ((24, 6, 30), 3.5)], (0, 0, 0), parent="bag", sides=6, rnd=2, subdiv=1, col=cord,
           style="rubber", tone=4.0)
    return s


def build_all():
    out = {}
    for f in (coins, key, milk, open_sign, coin_bag):
        S = f()
        for j in list(S.meta["joints"]):
            S.meta["mats"].pop(j, None)
        out[S.key] = S
    return out
