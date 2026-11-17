"""The wholesale capsule carton (src/game/capsuleBox.js): single-wall corrugated board, 270 x 150 x 200 mm, open at the
top, its four flaps hinged at the rim. The packing tape and the series label stay the game's (they change per carton).
Joints at the origin, in capsuleBox.js's frames: shell (x -135..135, y 0..150, z -100..100), flap_l (a long flap:
x -135..135, z 0..100, 10 mm thick at y 0..10... its board 3 mm), flap_s (a short flap: x 0..135, z -100..100).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3, text_jp  # noqa: E402

W, H, D, T = 270.0, 150.0, 200.0, 3.0


def x2(rows, k=2):
    return ["".join(c * k for c in r) for r in rows for _ in range(k)]


def build_all():
    s = Spec("carton", "Capsule carton", dens=0.9, budget=1500,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.2, "ao": 0.35, "ao_height": 60.0})
    kraft = s.c("#c89a5f", hue=10, k=0.05)
    kraft2 = s.c("#b68850", hue=10, k=0.05)
    inside = s.c("#d8b88a", hue=8, k=0.05)
    ink = s.c("#3a2a24", k=0.0)
    s.joint("shell", (0, 0, 0))
    hw, hd = W / 2, D / 2
    s.boxr("bottom", -hw, 0, -hd, hw, T, hd, ch=0, parent="shell", col=kraft2, style="card", hide=["bottom"])
    s.layer("bottom", id="in", op="fill", faces=["top"], ramp=inside, tone=3.0)
    for k, (x0, z0, x1, z1) in {"f": (-hw, hd - T, hw, hd), "b": (-hw, -hd, hw, -hd + T), "l": (-hw, -hd + T, -hw + T, hd - T), "r": (hw - T, -hd + T, hw, hd - T)}.items():
        s.boxr("wall_" + k, x0, 0, z0, x1, H, z1, ch=0, parent="shell", col=kraft, style="card", double_sided=False)
        # the inside face is the board's unprinted liner; the cut top edge shows the flutes
        inner = {"f": "back", "b": "front", "l": "right", "r": "left"}[k]
        s.layer("wall_" + k, id="in", op="fill", faces=[inner], ramp=inside, tone=3.0)
        s.layer("wall_" + k, id="flute", op="stripes", axis="x" if k in "fb" else "z", period=2.2, width=0.45, shift=-1.2, faces=["top"])
        s.layer("wall_" + k, id="edge", op="band", axis="y", **{"from": 0.9, "to": 1.0}, shift=-0.35, faces=["front", "back", "left", "right"])
    # print on the ends: this way up, fragile, the maker's stencil
    up = ["..i..i..", ".iii.iii", "iiiiiiii", "..i..i..", "..i..i..", "..i..i..", "iiiiiiii"]
    for k, f in (("wall_l", "left"), ("wall_r", "right")):
        s.stamp(k, x2(up), {"i": f"{ink}:1"}, face=f, at="top", off=(0, 10))
        s.stamp(k, text_jp("こわれもの", 14, "i"), {"i": s.c("#c8382c") + ":2"}, face=f, at="center", off=(0, 14))
        s.stamp(k, text3("CAPSULE CO.", "i"), {"i": f"{ink}:1"}, face=f, at="bottom", off=(0, -10))
    s.stamp("wall_f", text3("NO.24  M-65", "i"), {"i": f"{ink}:1"}, face="front", at="bottom-right", off=(-12, -8))
    s.stamp("wall_b", text3("NO.24  M-65", "i"), {"i": f"{ink}:1"}, face="back", at="bottom-right", off=(-12, -8))
    # the flaps: a long one (front / back) and a short one (left / right), lying flat when closed
    s.joint("flap_l", (0, 0, 0))
    s.boxr("fl_l", -hw, 0, 0, hw, T, hd, ch=0, parent="flap_l", col=kraft, style="card")
    s.layer("fl_l", id="in", op="fill", faces=["bottom"], ramp=inside, tone=3.0)
    s.layer("fl_l", id="crease", op="band", axis="z", **{"from": -1.0, "to": -0.94}, shift=-0.6, faces=["top", "bottom"])
    s.joint("flap_s", (0, 0, 0))
    s.boxr("fl_s", 0, 0, -hd, hw, T, hd, ch=0, parent="flap_s", col=kraft2, style="card")
    s.layer("fl_s", id="in", op="fill", faces=["bottom"], ramp=inside, tone=3.0)
    s.layer("fl_s", id="crease", op="band", axis="x", **{"from": -1.0, "to": -0.94}, shift=-0.6, faces=["top", "bottom"])
    for j in list(s.meta["joints"]):
        s.meta["mats"].pop(j, None)
    return {"carton": s}
