"""The Shinkin Bank ATM kiosk across the lane (src/money/atm.js), after the free-standing bank kiosks of the late 90s:
a cream enamel steel cabinet with the bank's green bands, the privacy hood round a recessed CRT screen with four soft
keys each side, the console ledge with its keypad well, the card reader (green light), the receipt slot and the cash
slot with its shutter, a coin-door panel and the instruction plate below, the lit ATM sign on top. An original bank.
Coordinates are the old voxel prop's (20 mm voxels, voxel i spanning [20i, 20i + 20] mm; atm.js scales the root 1.18),
so the screen (0.44 x 0.28 at y 1.06, z 0.202), the soft keys (x +-0.25, z 0.226), the keypad (y 0.766), the card slot,
the cash tray and the receipt slot all line up. Joints: body (static), soft (one soft key, centred), key (a keypad
key's body, centred: the printed cap is the game's), shutter (the cash slot's shutter, hinged at its top edge).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text5, text_jp  # noqa: E402


def x2(rows, k=2):
    return ["".join(c * k for c in r) for r in rows for _ in range(k)]


def build_all():
    s = Spec("atm", "Bank ATM kiosk", dens=0.4, budget=5000,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.2, "ao": 0.45, "ao_height": 300.0})
    cream = s.c("#e8e4da", k=0.0, hue=8)
    grey = s.c("#8a9096", k=0.0)
    green = s.c("#2f8a5a", k=0.08)
    navy = s.c("#1e3e78", k=0.05)
    dark = s.c("#2a2c30", k=0.0)
    s.joint("body", (0, 0, 0))
    B = "body"
    # the plinth and the cabinet (green bands down the back edges and round the top)
    s.boxr("plinth", -380, 0, -280, 380, 60, 240, ch=4, parent=B, col=dark, style="ironpaint", hide=["bottom"])
    s.boxr("cab", -380, 60, -280, 380, 1400, 200, ch=6, parent=B, col=cream, style="enamel", hide=["bottom"])
    s.layer("cab", id="band_l", op="band", axis="z", **{"from": -1.0, "to": -0.78}, ramp=green, tone=3.0, faces=["left", "right"])
    s.layer("cab", id="band_t", op="band", axis="y", **{"from": 0.72, "to": 0.86}, ramp=green, tone=3.0, faces=["left", "right", "front", "back"])
    s.layer("cab", id="vents", op="grille", rect=[0.2, 0.1, 0.8, 0.3], period=4, slit_tone=0.5, lip=0.6, faces=["back"])
    s.layer("cab", id="seam", op="panel", inset=3, shift=-0.6, faces=["left", "right"])
    # the fascia: a grey frame round the recessed screen (the game's screen sits in front of the dark backing)
    for k, (x0, y0, x1, y1) in {"t": (-280, 1200, 280, 1240), "b": (-280, 880, 280, 920), "l": (-280, 920, -220, 1200), "r": (220, 920, 280, 1200)}.items():
        s.boxr("fas_" + k, x0, y0, 200, x1, y1, 220, ch=1.5, parent=B, col=grey, style="abs")
    s.boxr("screen_back", -220, 920, 180, 220, 1200, 200, ch=0, parent=B, col=dark, style="cavity", tone=1.4)
    for k, (x0, y0, x1, y1) in {"t": (-222, 1196, 222, 1200), "b": (-222, 920, 222, 924), "l": (-222, 924, -218, 1196), "r": (218, 924, 222, 1196)}.items():
        s.boxr("lip_" + k, x0, y0, 198, x1, y1, 212, ch=0, parent=B, col=dark, style="abs", tone=2.0)
    # the privacy hood: wings either side and a brow over the screen
    s.boxr("wing_l", -380, 800, 180, -360, 1300, 300, ch=2, parent=B, col=grey, style="abs")
    s.boxr("wing_r", 360, 800, 180, 380, 1300, 300, ch=2, parent=B, col=grey, style="abs")
    s.boxr("brow", -380, 1280, 180, 380, 1320, 262, ch=3, parent=B, col=grey, style="abs")
    s.stamp("brow", x2(text5("SHINKIN BANK", "i")), {"i": "paperw:6"}, face="front", at="center")
    # the console ledge carrying the keypad, the card reader block, the receipt and cash slots on its front
    s.boxr("ledge", -340, 660, 180, 340, 760, 380, ch=5, parent=B, col=cream, style="enamel")
    s.layer("ledge", id="well", op="rect", rect=[0.03, 0.05, 0.6, 0.9], ramp=grey, tone=2.4, faces=["top"])
    s.layer("ledge", id="cash", op="rect", rect=[0.2, 0.25, 0.62, 0.55], ramp="cavity", tone=0.8, faces=["front"])
    s.layer("ledge", id="receipt", op="rect", rect=[0.71, 0.45, 0.91, 0.55], ramp="cavity", tone=0.8, faces=["front"])
    s.stamp("ledge", text_jp("おさつ", 10, "i"), {"i": "ink:2"}, face="front", at=[int(0.04 * 680 * s.dens), int(0.3 * 100 * s.dens)])
    s.boxr("cash_lip_t", -244, 721, 380, 44, 727, 386, ch=1, parent=B, col="chrome", style="chrome")
    s.boxr("cash_lip_b", -244, 679, 380, 44, 685, 386, ch=1, parent=B, col="chrome", style="chrome")
    s.boxr("card", 120, 760, 220, 300, 840, 320, ch=4, parent=B, col=grey, style="abs")
    s.layer("card", id="slot", op="rect", rect=[0.12, 0.42, 0.88, 0.52], ramp="cavity", tone=0.5, faces=["front"])
    s.layer("card", id="light", op="rect", rect=[0.12, 0.6, 0.88, 0.68], ramp=s.c("#2a9a4a"), tone=5.0, faces=["front"])
    s.stamp("card", text_jp("カード", 8, "i"), {"i": "paperw:6"}, face="front", at="bottom", off=(0, -2))
    # the coin-door panel and the instruction plate below
    s.boxr("door", -240, 420, 200, 240, 640, 210, ch=2, parent=B, col=grey, style="abs")
    s.layer("door", id="seam", op="panel", inset=3, shift=-1.0, faces=["front"])
    s.disc("door_lock", 9, 4, (180, 530, 212), parent=B, sides=12, col="chrome", style="chrome")
    s.boxr("plate", -240, 240, 200, 240, 380, 204, ch=1, parent=B, col=s.c("#f6f2e6", k=0.0), style="paper", tone=4.2)
    s.stamp("plate", text_jp("ごりようじかん 8:45〜18:00", 10, "i"), {"i": "ink:2"}, face="front", at="top-left", off=(8, 6))
    s.stamp("plate", text_jp("じかんがい てすうりょう 110えん", 10, "i"), {"i": "ink:2"}, face="front", at="top-left", off=(8, 22))
    s.stamp("plate", text_jp("硬貨はご利用になれません", 10, "i"), {"i": s.c("#c8382c") + ":2"}, face="front", at="top-left", off=(8, 38))
    s.layer("plate", id="sticker", op="rect", rect=[0.78, 0.15, 0.95, 0.85], ramp=s.c("#e5383b"), tone=3.0, faces=["front"])
    # the lit sign on top: ATM in white on dark blue, the bank's green leaf
    s.boxr("sign", -380, 1400, -240, 380, 1560, 220, ch=6, parent=B, col=navy, style="lacquer")
    s.layer("sign", id="rules", op="band", axis="y", **{"from": -1.0, "to": -0.86}, ramp=s.c("#2a5aa8"), tone=3.0)
    s.layer("sign", id="rules2", op="band", axis="y", **{"from": 0.86, "to": 1.0}, ramp=s.c("#2a5aa8"), tone=3.0)
    atm = ["..###..#####.#...#", ".#...#...#...##.##", ".#####...#...#.#.#", ".#...#...#...#...#", ".#...#...#...#...#"]
    leaf = [".##.", "####", ".##.", "..#."]
    for f in ("front", "back"):
        s.stamp("sign", ["".join(c * 6 for c in r) for r in atm for _ in range(6)], {"#": s.c("#e8f0ff") + ":5"}, face=f, at="center", off=(14, 0))
        s.stamp("sign", ["".join(c * 6 for c in r) for r in leaf for _ in range(6)], {"#": s.c("#58c06c") + ":5"}, face=f, at="left", off=(30, 0))
    # ------------------------------------------------------------------ the moving and repeated parts
    s.joint("soft", (0, 0, 0))
    s.box("soft_b", [34, 26, 12], (0, 0, 0), ch=3, parent="soft", col=s.c("#b8bec4", k=0.0), style="chrome", tone=3.6)
    s.layer("soft_b", id="dish", op="rect", rect=[0.2, 0.25, 0.8, 0.75], shift=-0.6, faces=["front"])
    s.joint("key", (0, 0, 0))
    s.box("key_b", [45, 12, 32], (0, 0, 0), ch=2.5, parent="key", col=s.c("#9aa0a6", k=0.0), style="abs", hide=["top"])
    s.joint("shutter", (0, 0, 0))
    s.box("shutter_b", [300, 42, 4], (0, -21, 2), ch=0.8, parent="shutter", col=s.c("#5a6066", k=0.0), style="steel")
    s.layer("shutter_b", id="ribs", op="stripes", axis="y", period=7, width=0.25, shift=-0.9, faces=["front"])
    for j in list(s.meta["joints"]):
        s.meta["mats"].pop(j, None)
    return {"atm": s}
