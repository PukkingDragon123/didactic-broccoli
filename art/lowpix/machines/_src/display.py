"""The machine-top display cases' stands (src/display/models.js): the moulded plinth with its cream lip and the steel
rails it sits on, and the cream tiers stepping up to the back, one per machine type and style, sized exactly as the
game lays out its figure slots (5 mm units W x D from the machine's lid: w = spec.w - 0.02, d = spec.d - 0.03).
One spec, one atlas; joints (at the origin) <style>_<W>x<D>_plinth (painted neutral: the game tints it in the machine's
trim colour) and <style>_<W>x<D>_tiers (the cream tiers, the lip, the rails). The acrylic case, the back card, the
header and the risers' print strips stay the game's (clear plastic and live print).
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec  # noqa: E402

VS = 5.0
TYPES = {"retro": (0.34, 0.32), "standard": (0.36, 0.34), "deluxe": (0.4, 0.38), "royal": (0.44, 0.4)}
STYLES = {"tier": 2, "grand": 3}
NEUTRAL = ["#6e6e72", "#8e8e92", "#ababae", "#c4c4c6", "#d8d8da", "#e8e8e9", "#f6f6f6"]
CREAM = ["#8a7e66", "#a89a80", "#c2b49a", "#d8cab0", "#e6dac4", "#f0e8d8", "#faf6ec"]


def dims(t):
    w, d = TYPES[t]
    return max(24, round((w - 0.02) / 0.005)), max(20, round((d - 0.03) / 0.005))


def build_all():
    s = Spec("display", "Display case stands", dens=0.45, budget=8000,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.45, "gradient": 0.2, "ao": 0.4, "ao_height": 40.0})
    s.raw("neutral", NEUTRAL)
    s.raw("cream", CREAM)
    done = set()
    for style, tiers in STYLES.items():
        for t in TYPES:
            W, D = dims(t)
            key = f"{style}_{W}x{D}"
            if key in done:
                continue
            done.add(key)
            tierH = 5 if tiers == 3 else 6
            step = (D - 8) // tiers
            hw, hd = W * VS / 2, D * VS / 2
            pj, tj = key + "_plinth", key + "_tiers"
            s.joint(pj, (0, 0, 0))
            s.joint(tj, (0, 0, 0))
            # the plinth: a darker foot, the body, both in the machine's trim colour (tinted by the game)
            s.boxr(pj + "_foot", -hw, VS, -hd, hw, 2 * VS, hd, ch=1.0, parent=pj, col="neutral", style="abs", tone=2.4, hide=["top"])
            s.boxr(pj + "_body", -hw + 0.4, 2 * VS, -hd + 0.4, hw - 0.4, 6 * VS, hd - 0.4, ch=1.5, parent=pj, col="neutral", style="abs", tone=3.6,
                   hide=["bottom", "top"])
            s.layer(pj + "_body", id="seam", op="panel", inset=2, shift=-0.6, faces=["front", "back", "left", "right"])
            # the cream lip and the rails under it (steel)
            s.boxr(tj + "_lip", -hw, 6 * VS, -hd, hw, 7 * VS, hd, ch=1.0, parent=tj, col="cream", style="abs", tone=4.2, hide=["bottom"])
            for k, sx in (("l", -1), ("r", 1)):
                x = sx * (hw - 3.5 * VS)
                s.boxr(f"{tj}_rail{k}", x - VS, 0, -hd + 2 * VS, x + VS, VS, hd - 2 * VS, ch=0.8, parent=tj, col="steel", style="steel")
            # the tiers stepping up to the back, each with a lit nose and a shadowed riser foot
            for k in range(tiers):
                z0 = 2 + k * step
                top = 6 + (k + 1) * tierH
                zf = hd - z0 * VS
                zb = hd - (2 + (k + 1) * step) * VS if k < tiers - 1 else -hd + 2 * VS
                s.boxr(f"{tj}_t{k}", -hw + 2 * VS, 7 * VS, zb, hw - 2 * VS, VS + top * VS, zf, ch=0, parent=tj, col="cream", style="abs",
                       tone=4.0 - k * 0.15, hide=["bottom"] + (["back"] if k < tiers - 1 else []))
                s.layer(f"{tj}_t{k}", id="nose", op="band", axis="y", **{"from": 0.86, "to": 1.0}, shift=0.6, faces=["front"])
    out = {"display": s}
    for j in list(s.meta["joints"]):
        s.meta["mats"].pop(j, None)
    return out
