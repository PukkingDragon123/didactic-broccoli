"""The packing station on the work table (src/game/packaging.js): a stack of blister backing cards with their printed
headers, a small heat sealer (grey body, the steel platen, the red lever, the green pilot light) and a clear box of
acrylic stands; and the acrylic display stand itself (a clear stepped riser on its base, the black name plate with its
gold rule). Joints at the origin = each object's bottom centre (the voxel builds' 'bottom' origin), front +Z.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text5  # noqa: E402


def build_all():
    s = Spec("packing", "Packing station and acrylic stand", dens=1.1, budget=2500,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.2, "ao": 0.35, "ao_height": 40.0})
    cream = s.c("#e8dcc4", k=0.0, hue=8)
    red = s.c("#c8352a", k=0.08)
    grey = s.c("#4a5058", k=0.0)
    clear = s.c("#dceaf2", k=0.0)
    # ------------------------------------------------------------------ the station (x -160..130, z -80..70 mm)
    s.joint("station", (0, 0, 0))
    ox = 15.0  # (the voxel build was centred on its own bounds)
    for i in range(6):
        s.boxr(f"card{i}", -160 + ox + (i % 2) * 1.5, i * 2.6, -80, -40 + ox + (i % 2) * 1.5, i * 2.6 + 2.2, 70, ch=0, parent="station",
               col=cream, style="paper", tone=4.2 - (i % 2) * 0.3, hide=["bottom"])
        s.layer(f"card{i}", id="head", op="band", axis="z", **{"from": 0.55, "to": 1.0}, ramp=red, tone=3.0)
    s.stamp("card5", text5("CAPSULE", "i"), {"i": "paperw:6"}, face="top", at="bottom", off=(0, -10))
    s.box("seal_body", [125, 60, 135], (63 + ox, 30, -5), ch=6, parent="station", col=grey, style="lacquer")
    s.box("seal_plate", [104, 4, 112], (63 + ox, 62, -8), ch=1.5, parent="station", col="steel", style="steel")
    s.box("seal_lever", [86, 12, 14], (63 + ox, 72, 26), ch=4, parent="station", col=red, style="lacquer")
    s.box("seal_arm_l", [6, 16, 8], (24 + ox, 66, 26), ch=1.5, parent="station", col="chrome", style="chrome")
    s.box("seal_arm_r", [6, 16, 8], (102 + ox, 66, 26), ch=1.5, parent="station", col="chrome", style="chrome")
    s.disc("seal_lamp", 4, 3, (105 + ox, 14, 63), parent="station", sides=10, col=s.c("#3cae5a"), style="glow", tone=5.0)
    s.stamp("seal_body", text3("HEAT SEAL", "i"), {"i": "paperw:5"}, face="front", at="top-left", off=(6, 8))
    s.stamp("seal_body", text3("ON  OFF", "i"), {"i": "paperw:4"}, face="front", at="bottom-right", off=(-14, -6))
    # a clear box of acrylic stands on top of the cards
    for k, (x0, z0, x1, z1) in {"f": (-140, 4, -60, 8), "b": (-140, -70, -60, -66), "l": (-140, -66, -136, 4), "r": (-64, -66, -60, 4)}.items():
        s.boxr("sbox_" + k, x0 + ox, 15.6, z0, x1 + ox, 75, z1, ch=0, parent="station", col=clear, style="clear", tone=4.6, mat="glass")
    s.boxr("sbox_bot", -140 + ox, 15.6, -70, -60 + ox, 18, 8, ch=0, parent="station", col=clear, style="clear", tone=4.6, mat="glass")
    for i in range(3):
        s.boxr(f"sbox_st{i}", -132 + ox, 18 + i * 9, -60 + i * 4, -68 + ox, 24 + i * 9, -6 + i * 2, ch=1, parent="station", col=clear, style="clear",
               tone=4.2, mat="glass")
    # ------------------------------------------------------------------ the acrylic stand (72 x 31.5 x 72 mm, the figure on top)
    s.joint("stand", (0, 0, 0))
    s.box("st_base", [72, 9, 62], (0, 4.5, -4), ch=2.5, parent="stand", col=clear, style="clear", tone=4.6, mat="glass")
    s.box("st_riser", [54, 22.5, 45], (0, 9 + 11.25, -4), ch=2.5, parent="stand", col=clear, style="clear", tone=4.4, mat="glass")
    s.box("st_plate", [72, 16, 4], (0, 8, 29), ch=1.0, parent="stand", col=s.c("#2a2a2e"), style="lacquer")
    s.box("st_rule", [62, 3, 1.2], (0, 8, 31.4), ch=0.3, parent="stand", col="goldr", style="gold")
    for j in list(s.meta["joints"]):
        s.meta["mats"].pop(j, None)
    return {"packing": s}
