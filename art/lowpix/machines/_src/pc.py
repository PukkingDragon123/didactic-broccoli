"""The home PC on the garage desk (src/pc/PC.js) and in the room (src/room/pcModel.js): a late-90s beige "CAPSULE-PC 98"
after the real ones: a 15" CRT on its swivel foot (the screen opening is exactly the game's 0.32 x 0.24 m screen at
y 0.22, its face at z 0.1705 in the monitor's frame), a beige keyboard with its key rows, a ball mouse, a mini-tower
with its floppy and CD drives, a speaker, a mug, a 3.5" floppy and a mouse pad. One spec, one atlas; joints at each
object's own origin (bottom centre, front +z), placed by the game: monitor, keyboard, mouse, tower, speaker, mug,
floppy, pad. Beige ABS yellowed a little with age, scuffed where hands go.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text5  # noqa: E402

BEIGE = "#dcd5c2"
BEIGE_D = "#c6bea8"


def build_all():
    s = Spec("pc", "Home PC (CAPSULE-PC 98)", dens=0.7, budget=8000,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.2, "ao": 0.4, "ao_height": 60.0})
    beige = s.c(BEIGE, k=0.0, hue=10)
    beiged = s.c(BEIGE_D, k=0.0, hue=10)
    dark = s.c("#2e2c2a", k=0.0)
    keyc = s.c("#ece4d0", k=0.0, hue=8)
    # ------------------------------------------------------------------ the CRT monitor (its frame: the game's)
    s.joint("monitor", (0, 0, 0))
    P = "monitor"
    s.box("m_foot", [230, 18, 190], (0, 9, 20), ch=8, parent=P, col=beiged, style="abs", hide=["bottom"])
    s.box("m_swivel", [110, 34, 100], (0, 35, 30), ch=10, parent=P, col=beiged, style="abs")
    # the bezel round the screen opening (x -160..160, y 100..340), its face at z 180
    for k, (x0, y0, x1, y1) in {"t": (-200, 340, 200, 380), "b": (-200, 50, 200, 100), "l": (-200, 100, -160, 340), "r": (160, 100, 200, 340)}.items():
        s.boxr("m_bz" + k, x0, y0, 150, x1, y1, 180, ch=0, parent=P, col=beige, style="abs", hide=["back"])
    s.layer("m_bzb", id="chin", op="band", axis="y", **{"from": 0.85, "to": 1.0}, shift=-0.4, faces=["front"])
    # the inner bezel's dark lip (the tube's mask showing round the glass) and the recess walls
    for k, (x0, y0, x1, y1) in {"t": (-160, 334, 160, 340), "b": (-160, 100, 160, 106), "l": (-160, 106, -154, 334), "r": (154, 106, 160, 334)}.items():
        s.boxr("m_lip" + k, x0, y0, 168, x1, y1, 176, ch=0, parent=P, col=dark, style="abs", tone=2.0)
    s.boxr("m_tube", -160, 100, 120, 160, 340, 168, ch=0, parent=P, col=dark, style="cavity", tone=1.0, hide=["front", "back"])
    s.boxr("m_shell", -198, 52, 60, 198, 378, 150, ch=6, parent=P, col=beige, style="abs", hide=["front"])
    s.taper("m_back", [330, 280, 230], (0, 215, -55), back=[0.56, 0.5], bshift=[0, -0.08], ch=10, parent=P, col=beiged, style="abs")
    s.layer("m_back", id="vents", op="grille", rect=[0.15, 0.35, 0.85, 0.85], period=4, slit_tone=0.6, lip=0.5, faces=["top", "back"])
    # the badge (a four-colour capsule mark and the name), the knobs, the power button
    mark = ["rryy..", "rryy..", "ggbb..", "ggbb.."]
    s.stamp("m_bzb", mark, {"r": "#e5383b", "y": "#ffd23f", "g": "#58c06c", "b": "#3f86e8"}, face="front", at=[16, 18])
    s.stamp("m_bzb", text3("CAPSULE-PC 98", "i"), {"i": f"{beige}:1"}, face="front", at=[26, 18])
    for x in (40, 70):
        s.disc(f"m_knob{x}", 7, 6, (x, 75, 183), parent=P, sides=10, col=beiged, style="abs")
    s.box("m_power", [26, 14, 6], (150, 75, 182), ch=2, parent=P, col=beiged, style="abs")
    # a capsule toy sitting on top (no notes on the bezel: the owner wants no notes anywhere)
    s.disc("m_cap_b", 24, 24, (100, 392, 100), axis="y", parent=P, sides=12, top=0.55, col=s.c("#ff6f91"), style="abs")
    s.disc("m_cap_t", 24, 20, (100, 414, 100), axis="y", parent=P, sides=12, top=0.4, col="chrome", style="clear", tone=5.0)
    # ------------------------------------------------------------------ the keyboard
    s.joint("keyboard", (0, 0, 0))
    K = "keyboard"
    s.taper("k_case", [432, 22, 140], (0, 11, 0), back=[1.0, 1.3], bshift=[0, 0.12], ch=4, parent=K, col=beige, style="abs")
    for r in range(5):
        z = -48 + r * 22
        w = 300 if r < 4 else 300
        y = 26 - r * 1.6
        s.boxr(f"k_row{r}", -200, y - 5, z - 9, 100, y + 3, z + 9, ch=1.5, parent=K, col=keyc, style="abs")
        s.layer(f"k_row{r}", id="keys", op="stripes", axis="x", period=19, width=0.12, phase=(r % 2) * 9, shift=-1.4, faces=["top", "front"])
        s.boxr(f"k_num{r}", 128, y - 5, z - 9, 206, y + 3, z + 9, ch=1.5, parent=K, col=keyc if r else beiged, style="abs")
        s.layer(f"k_num{r}", id="keys", op="stripes", axis="x", period=19, width=0.12, shift=-1.4, faces=["top", "front"])
    s.boxr("k_space", -110, 14, 48, 30, 20, 62, ch=2, parent=K, col=keyc, style="abs")
    s.layer("k_row0", id="esc", op="rect", rect=[0.0, 0.0, 0.07, 1.0], ramp=beiged, tone=3.0, faces=["top"])
    s.stamp("k_case", ["g.g.g"], {"g": "#58c06c"}, face="top", at="top-right", off=(-14, 4))
    # ------------------------------------------------------------------ the mouse (a two-button ball mouse) and its pad
    s.joint("mouse", (0, 0, 0))
    s.loft("mo_body", [((0, 0, -36), [44, 22]), ((0, 4, -16), [58, 30]), ((0, 4, 14), [56, 30]), ((0, 0, 36), [40, 18])], (0, 12, 0),
           parent="mouse", sides=10, rnd=2.6, subdiv=1, col=beige, style="abs")
    s.box("mo_btn", [52, 6, 26], (0, 26, -22), ch=3, parent="mouse", col=beiged, style="abs")
    s.layer("mo_btn", id="split", op="band", axis="x", **{"from": -0.05, "to": 0.05}, shift=-1.6, faces=["top", "back"])
    s.joint("pad", (0, 0, 0))
    s.box("pad_m", [200, 4, 170], (0, 2, 0), ch=0, parent="pad", col=s.c("#2f6fd6", k=0.2), style="paper", tone=3.0, hide=["bottom"])
    s.layer("pad_m", id="print", op="spots", count=4, radius=[14, 22], ramp=s.c("#ffd23f"), tone=4.0, faces=["top"])
    s.layer("pad_m", id="wear", op="patches", scale=40, threshold=0.62, shift=0.6, faces=["top"])
    # ------------------------------------------------------------------ the mini-tower
    s.joint("tower", (0, 0, 0))
    T = "tower"
    s.box("t_case", [190, 410, 410], (0, 205, 0), ch=4, parent=T, col=beige, style="abs", hide=["bottom"])
    s.layer("t_case", id="seam", op="panel", inset=3, shift=-0.8, faces=["left", "right"])
    s.box("t_bay1", [150, 42, 6], (0, 330, 207), ch=1, parent=T, col=beiged, style="abs")
    s.layer("t_bay1", id="tray", op="rect", rect=[0.06, 0.4, 0.94, 0.6], shift=-1.6, faces=["front"])
    s.box("t_bay2", [150, 26, 6], (0, 278, 207), ch=1, parent=T, col=beiged, style="abs")
    s.layer("t_bay2", id="slot", op="rect", rect=[0.2, 0.42, 0.8, 0.58], ramp=dark, tone=1.0, faces=["front"])
    s.box("t_power", [36, 30, 8], (0, 140, 207), ch=3, parent=T, col=beiged, style="abs")
    s.stamp("t_case", ["g.", "..", "o."], {"g": "#58c06c", "o": "#ffa040"}, face="front", at=[int(0.75 * 190 * s.dens), int(0.6 * 410 * s.dens)])
    s.layer("t_case", id="vent", op="grille", rect=[0.15, 0.82, 0.85, 0.95], period=4, slit_tone=0.6, lip=0.5, faces=["front"])
    s.stamp("t_case", text3("CAPSULE", "i"), {"i": f"{beige}:1"}, face="front", at="bottom", off=(0, -60))
    # ------------------------------------------------------------------ a speaker, the mug, a floppy
    s.joint("speaker", (0, 0, 0))
    s.box("sp_box", [110, 180, 110], (0, 90, 0), ch=5, parent="speaker", col=s.c("#3a3630"), style="abs")
    s.disc("sp_woofer", 38, 4, (0, 62, 57), parent="speaker", sides=16, col=dark, style="rubber")
    s.disc("sp_cone", 16, 6, (0, 62, 57), parent="speaker", sides=12, top=0.3, col=dark, style="rubber", tone=3.0)
    s.disc("sp_tweet", 16, 4, (0, 140, 57), parent="speaker", sides=12, col="chrome", style="chrome")
    s.joint("mug", (0, 0, 0))
    s.disc("mug_b", 40, 90, (0, 45, 0), axis="y", parent="mug", sides=16, top=1.04, col=s.c("#f2ead6", k=0.0), style="lacquer")
    s.layer("mug_b", id="band", op="band", axis="z", **{"from": 0.55, "to": 0.75}, ramp=s.c("#e5383b"), tone=3.0)
    s.disc("mug_tea", 36, 2, (0, 84, 0), axis="y", parent="mug", sides=16, col=s.c("#6a3a1a"), style="lacquer", tone=2.0)
    s.loft("mug_h", [((44, 70, 0), 9), ((62, 64, 0), 10), ((64, 34, 0), 10), ((44, 26, 0), 9)], (0, 0, 0), parent="mug", sides=6, rnd=2.2,
           subdiv=1, col=s.c("#f2ead6", k=0.0), style="lacquer")
    s.joint("floppy", (0, 0, 0))
    s.box("fl_b", [90, 3.4, 94], (0, 1.7, 0), ch=1.5, parent="floppy", col=s.c("#2a3a78", k=0.1), style="abs")
    s.box("fl_shut", [44, 1, 30], (6, 3.6, -30), ch=0, parent="floppy", col="chrome", style="chrome")
    s.box("fl_label", [70, 0.6, 50], (0, 3.6, 18), ch=0, parent="floppy", col="paperw", style="paper", tone=5.0)
    s.stamp("fl_label", text3("SAVE 1999", "i"), {"i": s.c("#2a3a78") + ":1"}, face="top", at="center")
    for j in list(s.meta["joints"]):
        s.meta["mats"].pop(j, None)
    return {"pc": s}
