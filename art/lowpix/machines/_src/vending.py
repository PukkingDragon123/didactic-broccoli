"""The lane's drink vending machine (src/places/vending: its drinks, prices and the lit selection are the game's live
panel over the window), after the late-90s Japanese street machines: a steel cabinet in red enamel with a white front
door, the dummy-drink window under a lit header, the payment column (money display, bill and coin slots, the return
lever), the illuminated advertising panel below, the takeout door at the bottom with its swinging flap and the coin
return cup. Brand-free: the ad is an original "cool water" wave and bottle.

Coordinates are the old voxel prop's, recentred as the prop builder does (bbox x -490..490, y 0..1840, z -380..380 mm;
the model fills that box exactly, so the prop's 'stretch' fit is 1:1), so the game's window panel
(WIN x -0.44..0.28, y 0.91..1.75, z 0.368), the click box and the outlet (OUTLET -0.1, 0.13, 0.25) line up; the prop
fits the model into the voxel build's box (src/data/props/garage.js vending.asset, fit 'stretch').
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text5, text_jp  # noqa: E402

V = 20.0


def vx(i):
    """The old voxel i's lower edge in the prop's recentred frame (x: voxel i spans [20i - 10, 20i + 10])."""
    return i * V - 10


def build_all():
    s = Spec("vending", "Drink vending machine", dens=0.32, budget=6000,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.25, "ao": 0.5, "ao_height": 300.0})
    red = s.c("#c4302b", k=0.12)
    white = s.c("#efebe2", k=0.04, hue=8)
    grey = s.c("#b9bcc0", k=0.0)
    blue = s.c("#2a62b8", k=0.08)
    sky = s.c("#6cc6ff", k=0.1)
    char = s.c("#2a2a2e", k=0.0)
    X0, X1 = -490.0, 490.0
    Z0, ZF = -380.0, 326.0  # back, the cabinet's front (the door stands on it)
    # ------------------------------------------------------------------ the cabinet
    s.box("cab", [X1 - X0, 1816 - 60, ZF - Z0], (0, (60 + 1816) / 2, (Z0 + ZF) / 2), ch=0, col=red, style="enamel",
          hide=["bottom", "front"])
    s.layer("cab", id="vents", op="grille", rect=[0.2, 0.05, 0.8, 0.14], period=3, slit_tone=0.4, lip=0.6, faces=["back"])
    s.layer("cab", id="rustfoot", op="band", axis="y", **{"from": -1.0, "to": -0.9}, wobble=0.05, ramp="rust", tone=3.0,
            faces=["left", "right", "back"])
    # the rounded top and the plinth
    s.box("cab_top", [X1 - X0, 24, ZF - Z0 + 24], (0, 1840 - 12, (Z0 + ZF + 24) / 2), ch=10, col=red, style="enamel")
    s.box("plinth", [X1 - X0 - 20, 60, ZF - Z0 - 20], (0, 30, (Z0 + ZF) / 2 - 10), ch=0, col=char, style="ironpaint",
          hide=["bottom", "top"])
    # ------------------------------------------------------------------ the front door (built round the takeout opening)
    dx0, dx1 = vx(-23), vx(24)
    DZ0, DZ1 = ZF, ZF + 24  # the door: a 24 mm thick panel on the cabinet front (its face at z 350)
    ox0, ox1, oy0, oy1 = vx(-21), vx(11), 90.0, 360.0
    s.boxr("door_top", dx0, oy1, DZ0, dx1, 1800, DZ1, ch=3, col=white, style="enamel", hide=["back"])
    s.boxr("door_l", dx0, 66, DZ0, ox0, oy1, DZ1, ch=3, col=white, style="enamel", hide=["back", "top"])
    s.boxr("door_r", ox1, 66, DZ0, dx1, oy1, DZ1, ch=3, col=white, style="enamel", hide=["back", "top"])
    s.boxr("door_b", ox0, 66, DZ0, ox1, oy0, DZ1, ch=0, col=white, style="enamel", hide=["back", "left", "right"])
    for k in ("door_top", "door_l", "door_r", "door_b"):
        s.layer(k, id="wear", op="wear", width=2, density=0.05, ramp="steel", tone=2.0, post=True)
    s.layer("door_top", id="handle_shade", op="rect", rect=[0.955, 0.4, 0.985, 0.62], shift=-1.2, faces=["right"])
    # the takeout bay: a dark well, its chrome lip, the flap (hinged at its top)
    s.boxr("bay", ox0, oy0, DZ1 - 140, ox1, oy1, DZ1 - 1, ch=0, col="cavity", style="cavity", hide=["front"], double_sided=True, tone=2.0)
    s.layer("bay", id="floor", op="fill", faces=["top"], shift=0.8)
    for k, (a, b, c, d) in {"t": (ox0 - 8, oy1, ox1 + 8, oy1 + 10), "b": (ox0 - 8, oy0 - 10, ox1 + 8, oy0), "l": (ox0 - 8, oy0, ox0, oy1),
                            "r": (ox1, oy0, ox1 + 8, oy1)}.items():
        s.boxr("bay_lip_" + k, a, b, DZ1, c, d, DZ1 + 5, ch=1.5, col="chrome", style="chrome")
    s.joint("flap", (0, oy1 - 4, DZ1 - 6))
    s.boxr("flap_p", ox0 + 3, 220, DZ1 - 9, ox1 - 3, oy1 - 4, DZ1 - 4, ch=1.5, parent="flap", col=s.c("#3a3c44"), style="lacquer")
    s.stamp("flap_p", text_jp("とりだしぐち", 10, "i"), {"i": "paperw:5"}, face="front")
    s.stamp("flap_p", ["..i..", ".iii.", "iiiii"], {"i": "paperw:5"}, face="front", at="top", off=(0, 3))
    # the coin return cup
    cx0, cx1, cy0, cy1 = vx(15), vx(22), 160.0, 300.0
    s.boxr("cup", cx0, cy0, DZ1, cx1, cy1, DZ1 + 14, ch=4, col=grey, style="chrome")
    s.layer("cup", id="hole", op="rect", rect=[0.12, 0.18, 0.88, 0.7], ramp="cavity", tone=1.0, faces=["front"])
    s.stamp("cup", text3("RETURN", "i"), {"i": "ink:1"}, face="front", at="top", off=(0, 2))
    # the kick plate
    s.boxr("kick", dx0, 60, DZ0, dx1, 66, DZ1 + 2, ch=1, col=char, style="ironpaint")
    # ------------------------------------------------------------------ the window bezel round the game's drinks panel
    wx0, wx1, wy0, wy1 = -440.0, 280.0, 910.0, 1750.0
    for k, (a, b, c, d) in {"t": (wx0 - 14, wy1, wx1 + 14, wy1 + 14), "b": (wx0 - 14, wy0 - 14, wx1 + 14, wy0), "l": (wx0 - 14, wy0, wx0, wy1),
                            "r": (wx1, wy0, wx1 + 14, wy1)}.items():
        s.boxr("win_" + k, a, b, DZ1, c, d, DZ1 + 12, ch=3, col="chrome", style="chrome")
    s.boxr("win_back", wx0, wy0, DZ1 - 6, wx1, wy1, DZ1 - 2, ch=0, col=s.c("#dfe4ea"), style="glow", tone=4.0)
    # the lit header sign over the window
    s.boxr("header", dx0 + 10, 1764, DZ1, dx1 - 10, 1806, DZ1 + 8, ch=3, col=s.c("#fff4dc"), style="glow", tone=4.6)
    hw_ = int((dx1 - dx0 - 20) * s.dens)
    # ------------------------------------------------------------------ the payment column
    px0, px1 = vx(15) - 4, vx(23) + 4
    s.boxr("pay", px0, 880, DZ1, px1, 1740, DZ1 + 6, ch=2, col=s.c("#e2ded6", k=0.0), style="abs")
    s.layer("pay", id="seam", op="panel", inset=2, shift=-0.8, faces=["front"])
    # money display, the bill acceptor, the coin slot plate, the return lever, the change lamp
    s.boxr("disp", vx(16), 1520, DZ1 + 6, vx(22), 1600, DZ1 + 9, ch=1, col=s.c("#1e3a22"), style="glow", tone=1.6)
    s.stamp("disp", text5("  0", "g"), {"g": s.c("#58ff7a") + ":5"}, face="front")
    s.boxr("bill", vx(16), 1320, DZ1 + 6, vx(22), 1440, DZ1 + 14, ch=3, col=grey, style="chrome")
    s.layer("bill", id="mouth", op="rect", rect=[0.15, 0.42, 0.85, 0.52], ramp="cavity", tone=0.5, faces=["front"])
    s.stamp("bill", text3("1000", "i"), {"i": "ink:1"}, face="front", at="bottom", off=(0, -3))
    s.boxr("coin", vx(17), 1120, DZ1 + 6, vx(21), 1260, DZ1 + 12, ch=2, col=grey, style="chrome")
    s.layer("coin", id="slot", op="rect", rect=[0.44, 0.25, 0.56, 0.8], ramp="cavity", tone=0.5, faces=["front"])
    s.stamp("coin", text3("10 50 100 500", "i"), {"i": "ink:1"}, face="front", at="bottom", off=(0, -1))
    s.boxr("lever", vx(17), 1020, DZ1 + 6, vx(21), 1068, 380, ch=3, col=grey, style="chrome")
    s.boxr("lamp", vx(16), 940, DZ1 + 6, vx(22), 988, DZ1 + 8, ch=1, col=s.c("#ffd84a"), style="glow", tone=4.0)
    s.stamp("lamp", text_jp("つりせんぎれ", 8, "i"), {"i": s.c("#8a5a10") + ":2"}, face="front")
    # ------------------------------------------------------------------ the illuminated ad panel (brand-free)
    ay0, ay1 = 400.0, 870.0
    s.boxr("ad", dx0 + 6, ay0, DZ1, dx1 - 6, ay1, DZ1 + 4, ch=2, col=blue, style="glow", tone=3.0)
    bottle = ["...hh...", "...hh...", "..hhhh..", ".hbbbbh.", "hbwwbbbh", "hbwwbbbh", "hbbbbbbh", "hrrrrrrh", "hrwwwwrh", "hrrrrrrh",
              "hbbbbbbh", "hbbbbbbh", "hbbbbbbh", ".hhhhhh."]
    big = ["".join(c * 4 for c in r) for r in bottle for _ in range(4)]
    # stickers on the door: the operator's number, a recycle-bin note
    s.stamp("door_top", [".kkkkkkkkkkkkkkkkkkkk.", *["k" + r.replace(".", "y").replace("i", "k") + "k" for r in text3("No.4417 ", "i")], ".kkkkkkkkkkkkkkkkkkkk."],
            {"k": "ink:1", "y": s.c("#f6d84a") + ":4"}, face="front", at=[int((vx(16) - dx0) * s.dens), int((1800 - 392) * s.dens)])
    for j in list(s.meta["joints"]):
        s.meta["mats"].pop(j, None)
    return {"vending": s}
