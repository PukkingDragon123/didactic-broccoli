"""Bathhouse Buddies (銭湯なかま): animals at the neighbourhood sentō doing the sentō things, an original capsule-toy
mascot series (CLAUDE.md toy rule) modelled in lowpix: smooth glossy vinyl, dot eyes, airbrushed blush. 6 figures,
one secret. About 4-5 cm; each stands on its own."""
from figlib import Fig
from mascot import vbody, face, nub, ball, dot, gimmick, arm

S = "furoba"
TOWEL = "#f4f2ec"


def head_round(F, pid, y, w, h, d, col, sides=16, z=0.0):
    """A round mascot head from y (neck) up: returns its surface lookup."""
    return vbody(F, pid, [(y, w * 0.45, d * 0.45, z), (y + h * 0.08, w * 0.78, d * 0.78, z), (y + h * 0.25, w * 0.96, d * 0.96, z),
                          (y + h * 0.48, w, d, z), (y + h * 0.7, w * 0.95, d * 0.95, z), (y + h * 0.86, w * 0.78, d * 0.78, z),
                          (y + h * 0.96, w * 0.48, d * 0.48, z), (y + h, w * 0.12, d * 0.12, z)], col, sides=sides, subdiv=0)


def round_ear(F, pid, at, r, col, inner=None, rot=(0, 0, 0)):
    F.add(pid, "prism", at, size=[2 * r, 2 * r * 0.95, r * 0.8], sides=10, rot=list(rot), col=col, style="vinyl", front_scale=[0.82, 0.82])
    if inner:
        F.layer(pid, id="inner", op="spots", centers=[[0, -r * 0.08, r * 0.42, r * 0.6]], ramp=inner, tone=3.2, roughness=0, faces=["front"])


def coffee():
    F = Fig(f"{S}/coffee", "Coffee-Milk Bear", "Hand on hip, towel round the neck, coffee milk in one go. The only correct way to finish a bath.")
    fur, cream, brown = F.c("#9a6a40", hue=12, spread=0.7), F.c("#ecdcbc", spread=0.55), F.c("#7a4a24", spread=0.7)
    b = vbody(F, "body", [(0.0, 15, 13), (1.6, 18.4, 16), (6, 20.6, 17.6), (11, 19.6, 16.8), (15.6, 16, 13.6), (18.0, 10, 9)], fur, subdiv=0)
    F.layer("body", id="belly", op="spots", centers=[b(8.0, 0, -0.2) + [5.6]], ramp=cream, tone=3.2, roughness=0, stretch=[1.0, 1.2, 1.0])
    h = head_round(F, "head", 15.4, 20, 15.6, 17, fur)
    ball(F, "muzzle", (0, 20.4, 7.2), 3.4, cream, sides=12, n=5, squash=0.78)
    dot(F, "muzzle", [[0, 21.6, 10.4, 1.1]], brown, 1.4, "nose")
    face(F, "head", h(22.6, -24), h(22.6, 24), er=1.1, blushL=h(20.6, -44), blushR=h(20.6, 44), br=1.6)
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        round_ear(F, f"ear{k}", (sx * 7.2, 29.0, -0.8), 2.8, fur, inner=cream, rot=(-6, sx * -16, sx * -20))
        nub(F, f"leg{k}", (sx * 5.0, 3.6, 1.4), (sx * 6.0, 2.7, 4.6), 2.8, 2.7, fur)
    F.loft("towel", [((0, 16.6, 0), [17.6, 15.4]), ((0, 18.0, 0.3), [16.6, 14.6])], (0, 0, 0), sides=16, rnd=2.1, subdiv=0, up=[0, 0, 1],
           col=F.c(TOWEL), style="vinyl")
    F.box("towel_end", [3.4, 7.0, 1.2], (-3.6, 13.2, 8.0), ch=0.5, col=F.c(TOWEL), style="vinyl", rot=[-14, 0, 6])
    F.layer("towel_end", id="stripe", op="band", axis="y", **{"from": -0.75, "to": -0.55}, ramp=F.c("#3a6ac8"), tone=3.0)
    arm(F, "armL", (-8.6, 13.6, 0.6), (-10.8, 8.4, 2.6), fur, r=2.4, paw=2.4)
    arm(F, "armR", (8.6, 14.0, 0.6), (9.0, 21.0, 6.6), fur, r=2.4, paw=2.4)
    F.loft("bottle", [((8.6, 19.4, 8.2), [3.2, 3.2]), ((7.8, 22.4, 9.4), [3.6, 3.6]), ((6.8, 24.8, 10.4), [2.4, 2.4]), ((6.4, 25.8, 10.8), [2.2, 2.2])],
           (0, 0, 0), sides=8, rnd=2.0, subdiv=0, col=F.c("#a8703a"), style="vinyl")
    F.layer("bottle", id="cap", op="band", axis="path", **{"from": 0.8, "to": 1.0}, ramp=F.c("#f2ead0"), tone=3.4)
    gimmick(F, "nod", 1.2, 8)
    return F


def oke():
    F = Fig(f"{S}/oke", "Bucket Penguin", "Sitting in the wooden bath pail with a folded towel on its head. It refuses to get out.")
    navy, white, org = F.c("#2a3a58", spread=0.65), F.c("#f2f0ea", spread=0.5), F.c("#f08a28", hue=10)
    wood = F.c("#d8a868", spread=0.6)
    F.loft("pail", [((0, 0, 0), [19.0, 19.0]), ((0, 0.8, 0), [20.0, 20.0]), ((0, 10.4, 0), [23.0, 23.0]), ((0, 11.0, 0), [21.8, 21.8])],
           (0, 0, 0), sides=18, rnd=2.0, subdiv=0, up=[0, 0, 1], col=wood, style="vinyl_hard")
    F.layer("pail", id="staves", op="stripes", axis="around", period=0.0833, width=0.08, shift=-0.6)
    F.layer("pail", id="hoops", op="band", axis="y", **{"from": 0.3, "to": 0.48}, ramp=F.c("#3a3a40"), tone=2.6, faces=["sides"])
    F.layer("pail", id="hoop2", op="band", axis="y", **{"from": -0.62, "to": -0.44}, ramp=F.c("#3a3a40"), tone=2.6, faces=["sides"])
    b = vbody(F, "body", [(4.0, 14, 13), (9, 17.6, 16), (14, 17.4, 15.8), (20, 15, 13.6), (25.6, 10.4, 9.6), (27.8, 4, 4)], navy, subdiv=0)
    F.layer("body", id="belly", op="spots", centers=[b(13.4, 0, -0.3) + [6.6], b(19.6, 0, -0.3) + [4.6]], ramp=white, tone=3.2, roughness=0)
    face(F, "body", b(20.6, -26), b(20.6, 26), er=1.05, blushL=b(18.0, -40), blushR=b(18.0, 40), br=1.5)
    F.loft("beak", [((0, 0, 0), [3.6, 2.4]), ((0, -0.2, 1.8), [2.2, 1.4]), ((0, -0.5, 2.8), [0.5, 0.4])], (0, 18.6, 7.2), sides=8, rnd=2.0,
           subdiv=0, col=org, style="vinyl")
    F.box("towel", [9.0, 2.4, 7.0], (0, 27.4, -0.4), ch=0.9, col=F.c(TOWEL), style="vinyl", rot=[0, 18, 4])
    F.layer("towel", id="stripe", op="band", axis="x", **{"from": 0.5, "to": 0.7}, ramp=F.c("#d8483a"), tone=3.0)
    for sx in (-1, 1):
        F.loft(f"flipper{'LR'[sx > 0]}", [((sx * 8.0, 15.6, 0), [1.6, 5.6]), ((sx * 11.2, 13.0, 1.6), [1.4, 5.0]), ((sx * 12.4, 11.8, 2.4), [0.8, 2.4])],
               (0, 0, 0), sides=8, rnd=2.0, subdiv=0, col=navy, style="vinyl")
    gimmick(F, "wobble", 1.2, 8)
    return F


def scrub():
    F = Fig(f"{S}/scrub", "Back-Scrub Monkey", "Pink-faced from the heat, sawing a long towel across its back. Scrubs yours too, for one banana.")
    fur, skin = F.c("#a8a49a", spread=0.65), F.c("#e8828a", spread=0.6)
    b = vbody(F, "body", [(0.0, 14, 12), (1.6, 17.4, 15), (6, 18.6, 16.4), (11, 17.4, 15.2), (15.2, 14, 12), (17.2, 9, 8)], fur, subdiv=0)
    h = head_round(F, "head", 14.6, 18, 14.6, 15.6, fur)
    F.loft("face", [((0, 0, 0), [10.0, 8.8]), ((0, -0.3, 1.4), [9.2, 8.0]), ((0, -0.6, 2.2), [7.0, 6.0])], (0, 21.6, 6.0), sides=12,
           rnd=2.1, subdiv=0, col=skin, style="vinyl")
    face(F, "face", [-2.0, 22.4, 8.25], [2.0, 22.4, 8.25], er=0.95, mouth=[0, 19.8, 8.25], mouth_kind="smile", mr=0.9,
         blushL=[-3.2, 20.4, 8.0], blushR=[3.2, 20.4, 8.0], br=1.0, blush_ramp=F.c("#d85a6a"))
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        round_ear(F, f"ear{k}", (sx * 8.4, 22.0, 0.0), 2.0, skin, rot=(0, sx * -70, 0))
        nub(F, f"leg{k}", (sx * 4.6, 3.4, 1.6), (sx * 5.6, 2.6, 5.2), 2.6, 2.5, fur)
    arm(F, "armL", (-8.0, 12.6, 0.4), (-10.6, 18.2, -4.6), fur, r=2.2, paw=2.2)
    arm(F, "armR", (8.0, 12.0, 0.4), (10.2, 7.6, -5.4), fur, r=2.2, paw=2.2)
    F.loft("towel", [((-11.6, 19.4, -5.8), [1.2, 3.6]), ((-6.0, 16.6, -8.6), [1.0, 3.6]), ((0.0, 13.4, -9.4), [1.0, 3.6]), ((6.0, 10.2, -8.6), [1.0, 3.6]),
                     ((11.2, 6.8, -6.4), [1.2, 3.6])], (0, 0, 0), sides=6, rnd=2.4, subdiv=1, col=F.c(TOWEL), style="vinyl")
    F.layer("towel", id="stripe", op="band", axis="path", **{"from": 0.86, "to": 0.94}, ramp=F.c("#3a6ac8"), tone=3.0)
    gimmick(F, "wobble", 1.0, 10)
    return F


def frog():
    F = Fig(f"{S}/frog", "Basin Frog", "On the little wooden stool with its yellow basin and a new bar of soap. Always the first one in.")
    green, belly, yel = F.c("#6ab04a", hue=10, spread=0.7), F.c("#e8f0c0", spread=0.5), F.c("#f2c43a", hue=8)
    wood = F.c("#c8945a", spread=0.6)
    F.box("stool", [15.0, 1.6, 11.0], (0, 7.6, 0), ch=0.5, col=wood, style="vinyl_hard")
    for sx in (-1, 1):
        F.box(f"leg{'LR'[sx > 0]}stool", [1.6, 6.8, 9.6], (sx * 6.2, 3.4, 0), ch=0.4, col=wood, style="vinyl_hard")
    b = vbody(F, "body", [(8.4, 13, 11), (10.4, 17.0, 14.6), (14.4, 17.6, 15.0), (18.6, 15.6, 13.4), (22.0, 15.0, 12.8), (25.4, 13.0, 11.2),
                          (27.4, 8.0, 7.0), (28.0, 3.0, 3.0)], green, subdiv=0)
    F.layer("body", id="belly", op="spots", centers=[b(13.6, 0, -0.3) + [5.6]], ramp=belly, tone=3.2, roughness=0)
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        ball(F, f"eyeball{k}", (sx * 4.2, 26.4, 2.6), 3.0, green, sides=12, n=6)
        dot(F, f"eyeball{k}", [[sx * 4.4, 27.0, 5.5, 1.3]], "ink", 1.2, "eye")
        dot(F, f"eyeball{k}", [[sx * 4.4 - 0.5, 27.6, 5.75, 0.45]], "white", 5.0, "catch")
        nub(F, f"foot{k}", (sx * 4.6, 10.4, 4.0), (sx * 5.8, 9.4, 8.6), 2.0, 2.2, green)
    face(F, "body", b(23.0, -30, 5), b(23.0, 30, 5), er=0.01, mouth=b(21.4, 0), mouth_kind="smile", mr=2.2, blushL=b(22.0, -46), blushR=b(22.0, 46), br=1.6)
    F.loft("basin", [((0, 0, 0), [11.0, 11.0]), ((0, 0.6, 0), [11.6, 11.6]), ((0, 3.6, 0), [14.6, 14.6]), ((0, 4.2, 0), [15.2, 15.2])], (0, 15.6, 7.6),
           sides=16, rnd=2.0, subdiv=0, up=[0, 0, 1], col=yel, style="vinyl_hard")
    F.box("soap", [3.6, 1.8, 2.4], (3.6, 20.4, 8.0), ch=0.7, col=F.c("#f0a8c0"), style="vinyl", rot=[0, 20, 0])
    arm(F, "armL", (-7.4, 16.6, 2.4), (-6.0, 18.0, 7.6), green, r=1.8, paw=1.9)
    arm(F, "armR", (7.4, 16.6, 2.4), (6.0, 18.0, 7.6), green, r=1.8, paw=1.9)
    gimmick(F, "hop", 1.0, 2.5)
    return F


def hippo():
    F = Fig(f"{S}/hippo", "Soaking Hippo", "Up to its chin in the hottest tub, a little towel folded on its head. Has not moved since Tuesday.")
    grey, pink, water = F.c("#8a90a8", spread=0.65), F.c("#e8a0a8", spread=0.55), F.c("#8ad0e0", spread=0.5)
    tile = F.c("#e8ecec", spread=0.5)
    F.box("tub", [28.0, 7.0, 21.0], (0, 3.5, 0), ch=1.0, col=F.c("#9ad0e0", spread=0.55), style="vinyl_hard")
    F.layer("tub", id="tiles", op="stripes", axis="y", period=2.4, width=0.08, shift=-0.8, faces=["sides"])
    F.layer("tub", id="tiles2", op="stripes", axis="x", period=2.4, width=0.06, shift=-0.8, faces=["sides"])
    F.box("water", [25.0, 0.8, 18.0], (0, 6.6, 0), ch=0.3, col=water, style="vinyl")
    h = vbody(F, "head", [(5.6, 15, 14, -1), (8.4, 20.6, 18.4, -1), (13.0, 21.4, 19.0, -1), (17.6, 18.6, 16.8, -1.4), (20.4, 12.6, 11.4, -1.6),
                          (21.6, 4.6, 4.6, -1.6)], grey, subdiv=0)
    F.loft("snout", [((0, 7.6, 3.6), [17.6, 8.4]), ((0, 8.8, 8.4), [18.2, 8.8]), ((0, 9.2, 11.2), [16.4, 7.6]), ((0, 9.4, 12.4), [10.4, 4.6])],
           (0, 0, 0), sides=12, rnd=2.2, subdiv=0, col=grey, style="vinyl")
    dot(F, "snout", [[-3.2, 11.0, 12.1, 1.0], [3.2, 11.0, 12.1, 1.0]], F.c("#4a4a5a"), 2.0, "nostrils")
    face(F, "head", h(15.8, -24), h(15.8, 24), er=1.15, blushL=h(12.6, -50), blushR=h(12.6, 50), br=2.0, blush_ramp=pink)
    for sx in (-1, 1):
        round_ear(F, f"ear{'LR'[sx > 0]}", (sx * 6.2, 20.4, -2.6), 2.0, grey, inner=pink, rot=(-10, sx * -20, sx * -20))
    F.box("towel", [8.6, 2.0, 6.6], (0, 21.8, -1.4), ch=0.8, col=F.c(TOWEL), style="vinyl", rot=[4, -10, 0])
    F.layer("towel", id="stripe", op="band", axis="x", **{"from": -0.6, "to": -0.4}, ramp=F.c("#3a6ac8"), tone=3.0)
    gimmick(F, "wobble", 1.4, 4)
    return F


def steam():
    F = Fig(f"{S}/steam", "Spirit of the Steam", "The sentō's own little god: a puff of steam with a wooden pail. Appears only when the water is perfect.")
    white, wood = F.c("#f6f6f8", hue=-8, spread=0.55), F.c("#d8a868", spread=0.6)
    vbody(F, "puff0", [(0.0, 13.0, 12.0), (1.4, 16.4, 15.2), (5.0, 18.4, 17.0), (9.6, 18.0, 16.6), (14.0, 14.6, 13.6), (16.4, 8.0, 7.6)], white,
          sides=14, subdiv=0)
    for i, (c, r) in enumerate((((-6.6, 12.0, -1.0), 6.0), ((6.6, 12.4, -1.0), 6.4), ((0, 17.4, -0.6), 7.6),
                                ((-3.4, 22.4, -1.4), 4.6), ((3.0, 23.6, -1.6), 4.2))):
        ball(F, f"puff{i + 1}", c, r, white, sides=12, n=7)
    face(F, "puff4", [-2.4, 18.6, 6.95], [2.4, 18.6, 6.95], er=1.0, mouth=[0, 15.8, 7.05], mouth_kind="smile", mr=1.0,
         blushL=[-4.2, 16.4, 6.2], blushR=[4.2, 16.4, 6.2], br=1.4)
    F.loft("pail", [((0, 0, 0), [7.6, 7.6]), ((0, 4.6, 0), [9.0, 9.0]), ((0, 5.0, 0), [8.4, 8.4])], (9.6, 6.0, 5.4), sides=12, rnd=2.0, subdiv=0,
           up=[0, 0, 1], col=wood, style="vinyl_hard")
    F.layer("pail", id="hoop", op="band", axis="y", **{"from": 0.2, "to": 0.4}, ramp=F.c("#3a3a40"), tone=2.6, faces=["sides"])
    arm(F, "armR", (7.0, 11.0, 2.0), (9.4, 10.6, 5.0), white, r=1.8, paw=1.8)
    gimmick(F, "hop", 1.2, 3)
    return F


FIGS = {"coffee": coffee, "oke": oke, "scrub": scrub, "frog": frog, "hippo": hippo, "steam": steam}
