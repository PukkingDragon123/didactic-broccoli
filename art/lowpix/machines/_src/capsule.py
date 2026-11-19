"""Gacha capsules as lowpix specs, after the real ones (Bandai's clear-top capsules, Takara Tomy / Yujin's hinged ones,
Kitan Club's opaque ones, the eco paper capsules). One size is modelled (the Ø65 mm M capsule, r = 32.5 mm); the game
scales it for Ø55 / Ø75 (src/game/Capsule.js). The seam is at y = 0, the top half above it. Joints (all at the origin):
  top / bottom / bottom_tab          the plastic halves: neutral white plastic, tinted per capsule by the game
  top_paper / bottom_paper           the paper capsule's pulp halves; the print is painted in MASK colours that the game
                                     recolours per series (mask red -> card bg, green -> accent, blue -> accent2)
  contents                           the folded mini catalogue and the bagged figure (mask colours too) + the clear bag
capsule_lo (coarser texels, fewer sides) has the same halves for the machine windows' instanced piles.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, ring_art  # noqa: E402

R = 32.5
PLASTIC = ["#6c6c70", "#8e8e92", "#adadb1", "#c8c8cb", "#dddddf", "#ececee", "#f8f8f9", "#ffffff"]
CLEAR = ["#9aa4ae", "#b8c2cc", "#d0d8e0", "#e2e8ee", "#eef2f6", "#f8fafc", "#ffffff"]
PULP = ["#8a8478", "#a8a294", "#c2bcae", "#d8d2c4", "#e8e2d4", "#f2eee4", "#faf8f2"]
# mask ramps (pure hues, value steps): recoloured per series in the game
MASK_A = ["#400000", "#600000", "#800000", "#a00000", "#c00000", "#e00000", "#ff0000"]
MASK_B = ["#004000", "#006000", "#008000", "#00a000", "#00c000", "#00e000", "#00ff00"]
MASK_C = ["#000040", "#000060", "#000080", "#0000a0", "#0000c0", "#0000e0", "#0000ff"]
INKG = ["#3a3a3c", "#58585a", "#7a7a7c", "#9a9a9c"]


def half(s, pid, top, sides, n, style, ramp, tone, lo=False, caps=False):
    """A hemisphere shell as a loft up (top) or down (bottom) from the seam, closing at the pole. The bottom half has
    the moulded lip that the top snaps over (a short band just inside the seam)."""
    sg = 1 if top else -1
    rings = []
    for i in range(n + 1):
        a = (i / n) * (math.pi / 2) * 0.985
        rings.append(((0, sg * R * math.sin(a), 0), 2 * R * math.cos(a)))
    rings.append(((0, sg * R, 0), 0.01))
    s.joint(pid, (0, 0, 0))
    s.loft(pid + "_s", rings, (0, 0, 0), parent=pid, sides=sides, rnd=2.0, subdiv=0, caps=(caps, False), col=ramp, style=style,
           tone=tone, double_sided=not lo, up=[0, 0, 1])
    if top:
        # the top's skirt: it snaps over the bottom's lip, a hair proud of the sphere (the seam ridge you feel)
        s.loft(pid + "_rim", [((0, 0, 0), 2 * R * 1.016), ((0, 2.6, 0), 2 * R * 1.012), ((0, 3.4, 0), 2 * R * 0.996)], (0, 0, 0), parent=pid,
               sides=sides, rnd=2.0, subdiv=0, caps=(False, False), col=ramp, style=style, tone=tone + (0.3 if ramp == "clear" else -0.3),
               double_sided=not lo, up=[0, 0, 1])
        # the twist-lock ribs moulded round the skirt (docs/ref/capsule): fine vertical ridges you grip to turn it
        s.layer(pid + "_rim", id="ribs", op="stripes", axis="around", period=1 / 40, width=0.5, shift=-0.9 if ramp == "plastic" else -1.3)
    if not top and not lo and ramp == "plastic":
        # the base's ribbed grip band just under the seam (the other half of the twist lock), proud of the sphere
        s.loft(pid + "_grip", [((0, 0, 0), 2 * R * 1.012), ((0, -3.2, 0), 2 * R * 1.010), ((0, -4.2, 0), 2 * R * 0.992)], (0, 0, 0),
               parent=pid, sides=sides, rnd=2.0, subdiv=0, caps=(False, False), col=ramp, style=style, tone=tone - 0.2, double_sided=False, up=[0, 0, 1])
        s.layer(pid + "_grip", id="ribs", op="stripes", axis="around", period=1 / 40, width=0.5, shift=-0.8)
    if not top and not lo:
        # the lip (the inside of the seam ring) and the inner wall, a shade darker: seen once the capsule is open
        s.loft(pid + "_lip", [((0, 0, 0), 2 * R * 0.955), ((0, 4.5, 0), 2 * R * 0.955)], (0, 0, 0), parent=pid, sides=sides,
               rnd=2.0, subdiv=0, caps=(False, False), col=ramp, style=style, tone=tone - 0.6, double_sided=True, up=[0, 0, 1])
    return pid + "_s"


def paint_plastic(s, pid, top, clear=False, lo=False):
    # the seam band, the mould's parting line down one side, the gate mark at the pole, a few highlight dashes
    s.layer(pid, id="seam", op="band", axis="path", **{"from": 0.0, "to": 0.07 if not lo else 0.1}, shift=-0.8 if not clear else 1.2)
    if not lo:
        s.layer(pid, id="mould", op="band", axis="around", **{"from": 0.248, "to": 0.252}, shift=-0.45 if not clear else 0.8)
        s.layer(pid, id="gate", op="band", axis="path", **{"from": 0.93, "to": 0.97}, shift=-0.5 if not clear else 0.7)
        s.layer(pid, id="sheen", op="fill", shift=0.9, min_light=0.86, post=False)


def build_all():
    out = {}
    for lo in (False, True):
        key = "capsule_lo" if lo else "capsule"
        s = Spec(key, "Gacha capsule" + (" (pile)" if lo else ""), dens=1.0 if lo else 3.0, budget=6000,
                 light={"dir": [-0.5, 1.0, 0.7], "strength": 0.28, "gradient": 0.12, "ao": 0.2, "ao_height": 6.0})
        s.raw("plastic", PLASTIC)
        s.raw("clear", CLEAR)
        s.raw("pulp", PULP)
        s.raw("maskA", MASK_A)
        s.raw("maskB", MASK_B)
        s.raw("maskC", MASK_C)
        s.raw("inkg", INKG)
        sides, n = (14, 4) if lo else (20, 6)
        sfx = "_lo" if lo else ""
        # plastic halves (white: tinted by the game) and the clear top
        p = half(s, "top" + sfx, True, sides, n, "abs", "clear", 4.6, lo)
        paint_plastic(s, p, True, clear=True, lo=lo)
        p = half(s, "bottom" + sfx, False, sides, n, "abs", "plastic", 4.4, lo)
        paint_plastic(s, p, False, lo=lo)
        if not lo:
            # Takara Tomy / Yujin: the hinge tab moulded on the back of the coloured half, below the seam
            p = half(s, "bottom_tab", False, sides, n, "abs", "plastic", 4.4)
            paint_plastic(s, p, False)
            s.box("tab", [9, 7, 3.2], (0, -5.5, -R - 0.6), ch=1.2, parent="bottom_tab", col="plastic", style="abs", tone=4.0)
            s.box("tab_knuckle", [10, 2.6, 2.6], (0, -1.6, -R - 0.9), ch=0.9, parent="bottom_tab", col="plastic", style="abs", tone=4.4)
        # the paper capsule: pulp, printed with the series' colours (mask ramps): an accent band either side of the seam,
        # a ring of dots, the pole caps in the card colour
        for top in (True, False):
            pid = ("top_paper" if top else "bottom_paper") + sfx
            p = half(s, pid, top, sides, n, "paper", "pulp", 4.4, lo)
            s.layer(p, id="bg", op="band", axis="path", **{"from": 0.0, "to": 1.0}, ramp="maskA", tone=5.0)
            s.layer(p, id="seamband", op="band", axis="path", **{"from": 0.0, "to": 0.06}, ramp="maskB", tone=4.0)
            s.layer(p, id="band", op="band", axis="path", **{"from": 0.14, "to": 0.26}, ramp="maskB", tone=4.6)
            if not lo:
                s.layer(p, id="dots", op="spots", count=14, radius=[1.6, 2.2], where={"path": [0.4, 0.72]}, ramp="maskC", tone=4.6, min_gap=5)
                s.layer(p, id="fibre", op="noise", scale=1.4, amount=0.3)
        if not lo:
            # the contents: the folded mini catalogue standing at the back, the figure in its little crimped bag
            s.joint("contents", (0, 0, 0))
            cw, ch_ = R * 1.1, R * 1.05
            s.box("insert_a", [cw * 0.5, ch_, 0.6], (-cw * 0.25, -R * 0.12, -R * 0.42), ch=0, parent="contents", col="maskA", style="paper", tone=5.0,
                  rot=[0, 14, 0])
            s.box("insert_b", [cw * 0.5, ch_, 0.6], (cw * 0.25, -R * 0.12, -R * 0.42), ch=0, parent="contents", col="maskA", style="paper", tone=5.0,
                  rot=[0, -14, 0])
            for k in ("insert_a", "insert_b"):
                s.layer(k, id="head", op="band", axis="y", **{"from": 0.62, "to": 1.0}, ramp="maskB", tone=4.0)
                s.layer(k, id="pic", op="rect", rect=[0.12, 0.3, 0.88, 0.58], ramp="maskC", tone=3.6, faces=["front"])
                s.layer(k, id="lines", op="stripes", axis="y", period=2.4, width=0.4, range=[-0.95, -0.25], ramp="inkg", tone=2.6, faces=["front"])
            # the figure in its bag (a soft lump in the series colours) and the bag's clear film with a crimped top
            s.loft("fig", [((0, -R * 0.62, R * 0.08), [R * 0.5, R * 0.42]), ((0, -R * 0.42, R * 0.1), [R * 0.62, R * 0.5]),
                          ((0, -R * 0.12, R * 0.08), [R * 0.48, R * 0.4]), ((0, 0.0, R * 0.06), [R * 0.2, R * 0.18])], (0, 0, 0), parent="contents",
                   sides=10, rnd=2.4, subdiv=1, col="maskB", style="abs", tone=3.6, up=[0, 0, 1])
            s.layer("fig", id="spots", op="spots", count=5, radius=[2.5, 4], ramp="maskC", tone=3.8)
            s.box("bag", [R * 0.84, R * 0.86, R * 0.64], (0, -R * 0.3, R * 0.1), ch=3.0, parent="contents", col="clear", style="clear", tone=4.6, mat="glass")
            s.box("crimp", [R * 0.86, 3.2, R * 0.2], (0, R * 0.14, R * 0.1), ch=0.6, parent="contents", col="clear", style="abs", tone=5.2)
            s.layer("crimp", id="teeth", op="stripes", axis="x", period=1.4, width=0.5, shift=-1.0)
        if lo:
            # the window piles' contents (seen through the clear tops: a pile of capsules is a pile of toys, not balls):
            # the folded insert and the bagged figure, coarse
            s.joint("contents_lo", (0, 0, 0))
            s.box("insert_lo", [R * 1.0, R * 0.95, 0.8], (0, -R * 0.12, -R * 0.45), ch=0, parent="contents_lo", col="maskA", style="paper", tone=5.0)
            s.layer("insert_lo", id="head", op="band", axis="y", **{"from": 0.6, "to": 1.0}, ramp="maskB", tone=4.0)
            s.layer("insert_lo", id="pic", op="rect", rect=[0.15, 0.25, 0.85, 0.55], ramp="maskC", tone=3.6, faces=["front"])
            s.loft("fig_lo", [((0, -R * 0.6, R * 0.1), [R * 0.5, R * 0.42]), ((0, -R * 0.3, R * 0.12), [R * 0.62, R * 0.5]),
                             ((0, R * 0.05, R * 0.08), [R * 0.4, R * 0.34]), ((0, R * 0.25, R * 0.06), [R * 0.12, R * 0.1])], (0, 0, 0),
                   parent="contents_lo", sides=7, rnd=2.4, subdiv=0, col="maskB", style="abs", tone=3.8, up=[0, 0, 1])
            s.layer("fig_lo", id="spots", op="spots", count=3, radius=[2.5, 4], ramp="maskC", tone=3.8)
        for j in list(s.meta["joints"]):
            s.meta["mats"].pop(j, None)
        out[key] = s
    return out
