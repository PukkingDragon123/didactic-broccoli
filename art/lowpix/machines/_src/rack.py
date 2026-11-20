"""The stacking rack (src/plugins/stackRack.js): the painted angle-iron frame Japanese shops stack two coin-op capsule
machines in, one on the floor tray, one on the shelf above it. Sized for the ¥100 / ¥300 machines (retro, standard);
the machines stand in it without their own stands.
Model mm, front +Z, floor y = 0. The game reads: BASE (the lower machine's floor), SHELF (the upper machine's floor),
the inner box X +-IW, Z -ID..+ID. Keep in step with RACK in src/plugins/stackRack.js.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "_lib"))
from mk import Spec, text3  # noqa: E402

BASE, SHELF = 60.0, 1010.0
IW, ID = 225.0, 195.0  # inner half width / half depth
A, T = 32.0, 3.0  # angle iron flange, gauge
TOP = SHELF + 150.0  # the posts run past the shelf as the upper machine's guard


def build_all():
    s = Spec("stack_rack", "Capsule machine stacking rack", dens=0.4, budget=2400,
             light={"dir": [-0.5, 1.0, 0.7], "strength": 0.5, "gradient": 0.25, "ao": 0.55, "ao_height": 120.0})
    paint = s.c("#7c8a84", hue=10, k=0.06)  # shop-rack grey-green enamel
    paint2 = s.c("#6a7670", hue=10, k=0.06)
    plate = s.c("#9a9c98", k=0.05)  # galvanised floor tray / shelf
    X0, X1, Z0, Z1 = -IW - A, IW + A, -ID - A, ID + A
    # four angle-iron posts, flanges facing out, rubber feet
    for k, (px, pz, sx, sz) in {"a": (X0, Z0, 1, 1), "b": (X1, Z0, -1, 1), "c": (X0, Z1, 1, -1), "d": (X1, Z1, -1, -1)}.items():
        s.boxr("post_" + k, min(px, px + sx * A), 12, min(pz, pz + sz * T), max(px, px + sx * A), TOP, max(pz, pz + sz * T), ch=0, col=paint, style="ironpaint")
        s.boxr("post2_" + k, min(px, px + sx * T), 12, min(pz, pz + sz * A), max(px, px + sx * T), TOP, max(pz, pz + sz * A), ch=0, col=paint, style="ironpaint")
        s.boxr("foot_" + k, min(px, px + sx * A) - 2, 0, min(pz, pz + sz * A) - 2, max(px, px + sx * A) + 2, 12, max(pz, pz + sz * A) + 2, ch=2, col="rubber", style="rubber")
    # the floor tray and the shelf: galvanised plate on an angle-iron ring, a lip at the front
    for k, y in (("base", BASE), ("shelf", SHELF)):
        s.boxr(k, X0 + T, y - 4, Z0 + T, X1 - T, y, Z1 - T, ch=0, col=plate, style="steel", **({"hide": ["bottom"]} if k == "base" else {}))
        s.layer(k, id="ribs", op="stripes", axis="x", period=40, width=0.12, shift=-0.8, faces=["top"])
        for rk, (a0, a1, b0, b1) in {"f": (X0, X1, Z1 - T, Z1), "b": (X0, X1, Z0, Z0 + T), "l": (X0, X0 + T, Z0, Z1), "r": (X1 - T, X1, Z0, Z1)}.items():
            s.boxr(f"{k}_r{rk}", a0, y - A, b0, a1, y, b1, ch=0, col=paint2, style="ironpaint")
        s.boxr(f"{k}_lip", X0, y, Z1 - T, X1, y + 14, Z1, ch=0, col=paint2, style="ironpaint")
    # side rails holding the lower machine in, a top guard ring round the upper one
    for yk, y in (("lo", 420), ("mid", 760), ("top", TOP - 24)):
        s.boxr(f"sl_{yk}", X0, y, Z0 + A, X0 + T, y + 24, Z1 - A, ch=0, col=paint2, style="ironpaint")
        s.boxr(f"sr_{yk}", X1 - T, y, Z0 + A, X1, y + 24, Z1 - A, ch=0, col=paint2, style="ironpaint")
    s.boxr("bk_top", X0 + A, TOP - 24, Z0, X1 - A, TOP, Z0 + T, ch=0, col=paint2, style="ironpaint")
    # the back: two flat bars crossed (the rack's bracing), bolted at the posts
    for k, (ya, yb) in {"x1": (BASE + 40, SHELF - 60), "x2": (SHELF - 60, BASE + 40)}.items():
        dx, dy = X1 - X0 - 2 * A, yb - ya
        L = math.hypot(dx, dy)
        ang = math.degrees(math.atan2(dy, dx))
        s.box("brace_" + k, [L, 22, T], ((X0 + X1) / 2, (ya + yb) / 2, Z0 - T / 2 - (0 if k == "x1" else T)), ch=0,
              col=paint2, style="ironpaint", rot=[0, 0, ang])
    # bolt heads where rails meet the posts (front face)
    for y in (BASE - A / 2, SHELF - A / 2, 432, 772):
        for x in (X0 + A / 2, X1 - A / 2):
            s.box(f"bolt_{int(x)}_{int(y)}", [7, 7, 3], (x, y, Z1 + 1.5), ch=1.2, col="steel", style="steel", tone=2.4, hide=["back"])
    # the shelf lip's stencilled maker plate (original name)
    s.boxr("tag", -70, SHELF + 1, Z1, 70, SHELF + 13, Z1 + 1.5, ch=0, col="paperw", style="lacquer", tone=4.0)
    s.stamp("tag", text3("KOBO STEEL", "i"), {"i": s.c("#2a2a30") + ":1"}, face="front", at="center")
    return {"stack_rack": s}
