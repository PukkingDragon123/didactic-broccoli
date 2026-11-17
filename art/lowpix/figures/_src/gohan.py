"""Gohan Zoo (ごはんズー): little animals made of Shōwa home cooking, an original capsule-toy mascot series (CLAUDE.md
toy rule): chunky soft-PVC forms modelled by hand in lowpix, factory paint with airbrushed blush and dot eyes,
5 figures, one secret. About 4-5 cm; each stands on its own."""
import math
from figlib import Fig
from mascot import vbody, hbody, face, nub, ball, dot, gimmick

S = "gohan"


def sph(c, r, yaw, elev, out=0.15):
    """A point on a ball's surface, `yaw` degrees round from the front, `elev` up from its equator."""
    a, e = math.radians(yaw), math.radians(elev)
    return [round(c[0] + (r + out) * math.sin(a) * math.cos(e), 2), round(c[1] + (r + out) * math.sin(e), 2),
            round(c[2] + (r + out) * math.cos(a) * math.cos(e), 2)]


def onigiri():
    F = Fig(f"{S}/onigiri", "Onigiri Penguin", "A rice-ball penguin in a nori tailcoat. It waddles straight into your bento.")
    rice, nori, org = F.c("#f4f0e4", spread=0.6), F.c("#1e3a2c", hue=10, spread=0.75), F.c("#f08a28", hue=10)
    s = vbody(F, "body", [(0, 26, 15), (2, 33, 18), (8, 36, 19), (15, 32, 18), (22, 24, 16), (28, 15, 13), (32, 8, 9), (34, 2.5, 3)],
              rice, "vinyl")
    F.layer("body", id="grains", op="spots", count=46, radius=[0.5, 0.7], stretch=[1.0, 0.55, 1.0], shift=0.7, roughness=0, min_gap=1.5)
    F.layer("body", id="nori", op="band", axis="z", **{"from": -1.0, "to": 0.42}, ramp=nori, tone=3.0, wobble=0.02)
    F.layer("body", id="wrap", op="band", axis="y", **{"from": -1.0, "to": -0.62}, ramp=nori, tone=3.0)
    face(F, "body", s(23, -24), s(23, 24), er=1.25, blushL=s(19.4, -42), blushR=s(19.4, 42), br=1.8)
    F.loft("beak", [((0, 0, 0), [5.4, 3.6]), ((0, -0.3, 2.2), [3.6, 2.4]), ((0, -0.7, 3.6), [0.8, 0.6])], (0, 19.6, 8.3), sides=8,
           rnd=2.0, subdiv=0, col=org, style="vinyl")
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        F.loft(f"flipper{k}", [((sx * 15.6, 15.0, -1.0), [2.0, 7.0]), ((sx * 18.4, 10.6, 0.4), [1.8, 6.4]), ((sx * 19.4, 7.2, 1.2), [1.2, 3.0])],
               (0, 0, 0), sides=8, rnd=2.0, subdiv=0, col=nori, style="vinyl")
        F.loft(f"foot{k}", [((sx * 6.0, 0.9, 4.6), [5.4, 1.8]), ((sx * 6.8, 0.9, 9.0), [6.4, 1.8]), ((sx * 7.2, 0.8, 11.4), [4.4, 1.4])],
               (0, 0, 0), sides=8, rnd=2.4, subdiv=0, col=org, style="vinyl")
    gimmick(F, "wobble", 1.2, 9)
    return F


def gyoza():
    F = Fig(f"{S}/gyoza", "Gyoza Seal", "A pan-fried seal pup, crisp underneath, pleated along the back. Best with a little vinegar.")
    skin, brown = F.c("#f2e6c8", spread=0.6), F.c("#c8843a", hue=10, spread=0.8)
    rings = [(-20, 6, 4, 3.0), (-15, 14, 9, 5.0), (-6, 22, 15, 7.5), (4, 22, 15, 7.6), (11, 18, 13, 7.2), (16, 12, 10.4, 6.4), (18.6, 5, 4.6, 6.0)]
    s = hbody(F, "body", rings, skin, "vinyl", sides=14)
    F.layer("body", id="crisp", op="band", axis="y", **{"from": -1.0, "to": -0.5}, ramp=brown, tone=3.0, wobble=0.08)
    F.layer("body", id="toast", op="spots", count=14, radius=[0.8, 1.4], ramp=brown, tone=3.8, roughness=0, where={"y": [-0.8, -0.2]})
    F.loft("pleat", [((0, 13.0, -15.0), [2.0, 2.4]), ((0, 15.2, -8.0), [3.6, 5.2]), ((0, 15.6, 2.0), [3.8, 5.4]), ((0, 14.0, 9.6), [2.8, 3.6]),
                     ((0, 12.4, 13.0), [1.2, 1.6])], (0, 0, 0), sides=8, rnd=2.0, subdiv=1, col=skin, style="vinyl")
    F.layer("pleat", id="crimp", op="stripes", axis="z", period=2.6, width=0.42, shift=-1.6)
    face(F, "body", s(15.4, -30), s(15.4, 30), er=1.05, mouth=[0, 6.6, 18.9], mouth_kind="smile", mr=0.9,
         blushL=s(13.0, -58), blushR=s(13.0, 58), br=1.6)
    dot(F, "body", [[0, 8.0, 19.0, 0.8]], F.c("#5a3a2a"), 2.0, "nose")
    dot(F, "body", [[sx * (2.6 + i * 0.9), 7.4 - i * 0.5, 18.2 - i * 0.4, 0.28] for sx in (-1, 1) for i in range(3)], F.c("#8a6a4a"), 2.2, "whisk")
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        F.loft(f"flipper{k}", [((sx * 9.6, 3.0, 7.0), [2.2, 4.2]), ((sx * 13.0, 1.2, 10.0), [1.6, 4.0]), ((sx * 14.2, 0.7, 11.4), [1.0, 2.0])],
               (0, 0, 0), sides=8, rnd=2.0, subdiv=0, col=skin, style="vinyl")
        F.loft(f"tail{k}", [((sx * 1.2, 3.0, -18.0), [3.0, 2.0]), ((sx * 4.0, 1.4, -22.6), [4.4, 1.6]), ((sx * 5.4, 1.0, -24.6), [2.4, 1.0])],
               (0, 0, 0), sides=8, rnd=2.0, subdiv=0, col=skin, style="vinyl")
    gimmick(F, "wobble", 1.2, 8)
    return F


def ebi():
    F = Fig(f"{S}/ebi", "Tempura Yokozuna", "A prawn tempura sumo wrestler, crisp batter, red tail for a topknot. Undefeated at dinner.")
    batter, tail, navy = F.c("#e4a848", hue=12, spread=0.8), F.c("#e85a3a", hue=10), F.c("#2c3260", hue=8, spread=0.7)
    s = vbody(F, "body", [(0, 16, 14), (3, 21, 18), (10, 23, 20), (18, 22, 19), (26, 19, 17), (33, 15, 13.6), (38, 10, 9.4), (41, 4, 4)],
              batter, "vinyl")
    F.layer("body", id="crumb", op="spots", count=90, radius=[0.5, 0.9], shift=0.9, roughness=0, min_gap=0.8)
    F.loft("mawashi", [((0, 8.6, 0), [23.6, 20.6]), ((0, 11.6, 0.1), [24.0, 20.8]), ((0, 15.4, 0.1), [23.2, 20.0])], (0, 0, 0), sides=14,
           rnd=2.1, subdiv=0, up=[0, 0, 1], col=navy, style="vinyl")
    for i, x in enumerate((-3.2, 0.0, 3.2)):
        F.box(f"sagari{i}", [1.4, 6.0, 0.8], (x, 6.4, 10.4), ch=0.3, col=navy, style="vinyl", rot=[-8, 0, x * 2])
    # the prawn's tail as the topknot: a red fan of five blades from a short tail stub, the tips darker
    F.loft("tailstub", [((0, 39.0, -0.4), [5.0, 3.6]), ((0, 41.6, -0.6), [4.0, 2.4])], (0, 0, 0), sides=8, rnd=2.0, subdiv=0, up=[0, 0, 1],
           col=tail, style="vinyl")
    for i, rz in enumerate((-48, -24, 0, 24, 48)):
        h = 8.4 - abs(rz) * 0.03
        F.loft(f"tail{i}", [((0, 0, 0), [2.0, 1.0]), ((0, h * 0.55, 0), [3.6, 1.1]), ((0, h, 0), [2.4, 0.8]), ((0, h + 0.8, 0), [0.6, 0.4])],
               (0, 41.2, -0.6), sides=8, rnd=2.0, subdiv=0, col=tail, style="vinyl", rot=[-8, 0, rz])
        F.layer(f"tail{i}", id="tip", op="band", axis="path", **{"from": 0.7, "to": 1.0}, ramp=tail, tone=1.8)
    face(F, "body", s(30.6, -22), s(30.6, 22), er=1.15, mouth=s(26.6, 0), mouth_kind="smile", mr=1.1,
         blushL=s(27.6, -42), blushR=s(27.6, 42), br=1.7, brows=[s(33.4, -26)[:2] + [s(33.4, -26)[2]], s(34.0, -16), s(33.4, 26), s(34.0, 16)])
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        nub(F, f"arm{k}", (sx * 9.4, 24.0, 1.0), (sx * 12.6, 14.0, 6.0), 2.6, 2.6, batter, "vinyl")
        nub(F, f"leg{k}", (sx * 6.2, 5.0, 1.0), (sx * 8.6, 3.0, 4.6), 3.2, 3.0, batter, "vinyl")
    for p in ("armL", "armR", "legL", "legR"):
        F.layer(p, id="crumb", op="spots", count=16, radius=[0.5, 0.8], shift=0.9, roughness=0, min_gap=0.8)
    gimmick(F, "nod", 1.2, 10)
    return F


def dango():
    F = Fig(f"{S}/dango", "Dango Caterpillar", "Three sweet dumplings on a skewer, out for a slow walk under the cherry blossom.")
    pink, white, green = F.c("#f4a4b8", spread=0.6), F.c("#f2eee2", spread=0.55), F.c("#8cc070", hue=10, spread=0.65)
    wood = F.c("#c8a070", spread=0.6)
    C = [((0, 8.4, 11.6), 7.2, pink), ((0, 7.8, 0.0), 7.0, white), ((0, 7.6, -11.6), 6.9, green)]
    for i, (c, r, col) in enumerate(C):
        ball(F, f"ball{i}", c, r, col, "vinyl", sides=14, n=8, squash=0.94)
        for sx in (-1, 1):
            nub(F, f"leg{i}{'LR'[sx > 0]}", (sx * 3.6, 2.2, c[2] + 1.0), (sx * 4.2, 0.9, c[2] + 2.4), 1.4, 1.3, col, "vinyl", sides=7)
    F.add("skewer", "prism", (0, 7.6, -14.0), size=[1.6, 1.6, 22.0], sides=6, col=wood, style="vinyl_hard", off=[0, 0, -2.0])
    c, r = C[0][0], C[0][1]
    face(F, "ball0", sph(c, r, -24, 10), sph(c, r, 24, 10), er=1.15, mouth=sph(c, r, 0, -12), mouth_kind="smile", mr=1.0,
         blushL=sph(c, r, -44, -6), blushR=sph(c, r, 44, -6), br=1.6, blush_ramp=F.c("#e86a80"))
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        nub(F, f"antenna{k}", (sx * 2.2, 14.6, 12.6), (sx * 4.0, 19.0, 13.6), 0.55, 0.5, wood, "vinyl", sides=6)
        ball(F, f"tip{k}", (sx * 4.2, 19.6, 13.7), 1.3, pink, "vinyl", sides=8, n=5)
    gimmick(F, "wobble", 1.4, 7)
    return F


def purin():
    F = Fig(f"{S}/purin", "Pudding Kaiju", "Custard pudding with a caramel crown, risen from the bottom of the fridge. Wobbles when it roars.")
    custard, caramel = F.c("#f6d062", hue=12, spread=0.7), F.c("#8a4418", hue=12, spread=0.8)
    F.cyl("plate", 16.0, 1.6, (0, 0, 0), sides=20, col=F.c("#f2f2ee"), style="vinyl_hard", top=0.9)
    F.layer("plate", id="rim", op="band", axis="z", **{"from": 0.6, "to": 1.0}, ramp=F.c("#3e64a8"), tone=3.0, faces=["sides"])
    s = vbody(F, "body", [(1.6, 25, 25), (3.6, 27, 27), (12, 24.4, 24.4), (20, 21.6, 21.6), (26, 19, 19), (28.4, 16.6, 16.6),
                          (29.4, 11, 11), (29.8, 3, 3)], custard, "vinyl", sides=16)
    F.layer("body", id="caramel", op="band", axis="y", **{"from": 0.72, "to": 1.0}, ramp=caramel, tone=3.0, wobble=0.03)
    drips = [s(24.6 - (i % 3) * 1.3, a, 0.1) + [1.3 + (i % 2) * 0.5] for i, a in enumerate(range(-160, 200, 24))]
    F.layer("body", id="drips", op="spots", centers=drips, ramp=caramel, tone=3.0, roughness=0, stretch=[0.7, 1.9, 0.7])
    face(F, "body", s(19.4, -20), s(19.4, 20), er=1.3, mouth=s(13.4, 0), mouth_kind="open", mr=2.6,
         blushL=s(15.6, -40), blushR=s(15.6, 40), br=1.8, brows=[s(22.0, -27), s(21.4, -15), s(22.0, 27), s(21.4, 15)])
    m = s(13.4, 0)
    dot(F, "body", [[m[0] + dx, m[1] + 1.8, m[2] + 0.1, 0.5] for dx in (-1.3, 1.3)], "white", 5.0, "fangs")
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        nub(F, f"arm{k}", (sx * 10.4, 15.0, 2.0), (sx * 14.6, 21.4, 4.6), 2.6, 2.3, custard, "vinyl")
        F.layer(f"arm{k}", id="claw", op="band", axis="path", **{"from": 0.86, "to": 1.0}, ramp="white", tone=4.2)
    F.loft("tail", [((0, 5.0, -10.0), [8.0, 6.0]), ((0, 3.6, -15.0), [5.0, 4.0]), ((1.4, 2.6, -19.0), [2.6, 2.2]), ((2.4, 2.4, -20.6), [0.6, 0.6])],
           (0, 0, 0), sides=8, rnd=2.0, subdiv=1, col=custard, style="vinyl")
    for i, (y, z, h) in enumerate(((25.0, -8.0, 5.0), (19.0, -10.6, 5.6), (12.6, -12.4, 5.0))):
        F.loft(f"plate{i}", [((0, 0, 0), [1.2, 5.4]), ((0, h * 0.7, -0.6), [0.9, 3.2]), ((0, h, -1.0), [0.4, 0.6])], (0, y, z), sides=6,
               rnd=2.0, subdiv=0, col=caramel, style="vinyl", rot=[-40, 0, 0])
    gimmick(F, "wobble", 1.0, 10)
    return F


FIGS = {"onigiri": onigiri, "gyoza": gyoza, "ebi": ebi, "dango": dango, "purin": purin}
