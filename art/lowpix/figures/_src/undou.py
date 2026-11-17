"""Sports Day (うんどうかい): the kit from the school field, modelled low poly by hand in lowpix (docs/LOWPOLY.md) to
reference photos and photo-bashed with real CC0 material photos (Poly Haven) under painted light."""
import math
from figlib import Fig
from objkit import seam_curve

S = "undou"


def f_baseball():
    F = Fig(f"{S}/baseball", "Baseball", "Red stitches, grass stains and a name in marker that has nearly worn away.")
    # reference: a used baseball (refs/baseball.jpg, CC BY): two white cowhide figure-of-eight covers, a sunken seam
    # and 108 double red stitches; a 73 mm ball made 26 mm. A ball rolls: it rests in a clear acrylic ball ring.
    R, cy = 13.0, 15.2
    hide = F.c("#efe9dc", hue=3, spread=0.6)
    red = F.c("#c4342c")
    rings = []
    for i in range(13):
        a = math.pi * i / 12
        rings.append(((0, -R * math.cos(a), 0), [max(2 * R * math.sin(a), 0.01)] * 2))
    F.loft("ball", rings, (0, cy, 0), sides=16, rnd=2.0, subdiv=0, up=[0, 0, 1], col=hide, style="hide", rot=[64, 24, 0])
    pts = seam_curve(R, 160)
    F.layer("ball", id="seam", op="spots", centers=[[x, y, z, 0.3] for x, y, z in pts], ramp="steel", tone=2.2, roughness=0)
    st = []
    for i, (x, y, z) in enumerate(pts):
        nx, ny, nz = pts[(i + 1) % len(pts)]
        tx, ty, tz = nx - x, ny - y, nz - z
        # the stitch rows run either side of the seam: offset along (normal x tangent)
        bx, by, bz = y * tz - z * ty, z * tx - x * tz, x * ty - y * tx
        L = math.sqrt(bx * bx + by * by + bz * bz) or 1
        for sgn in ((-1, 1) if i % 3 != 2 else ()):
            st.append([x + sgn * bx / L * 0.85, y + sgn * by / L * 0.85, z + sgn * bz / L * 0.85, 0.34])
    F.layer("ball", id="stitch", op="spots", centers=st, ramp=red, tone=3.0, roughness=0)
    F.layer("ball", id="scuff", op="patches", scale=5.0, threshold=0.8, shift=-0.35)
    F.cyl("ring", 6.4, 2.6, (0, 0, 0), sides=16, col="#d8e8ee", style="clear", tone=3.6, mat="glass", top=0.86)
    F.meta["base"] = {"family": "clear", "w": 12.8, "d": 12.8}
    F.meta["stand_why"] = "a ball rolls away: it rests in a clear acrylic ball ring"
    F.clip("spin", 1.2, [{"part": "ball", "keys": [[0, [64, 24, 0]], [1.2, [64, 384, 0]]], "ease": "linear"}], role="gimmick")
    return F


FIGS = {"baseball": f_baseball}
