"""Yōkai Yatai (妖怪屋台): the night-festival yōkai and their favourite stall treats, an original capsule-toy mascot
series (CLAUDE.md toy rule) modelled in lowpix: smooth glossy vinyl, big painted eyes, airbrushed blush. 6 figures,
one secret. About 4-5 cm; each stands on its own (the one-legged umbrella on its own geta)."""
import math
from figlib import Fig
from mascot import vbody, face, nub, ball, dot, gimmick, arm

S = "yokaiya"


def big_eye(F, pid, c, r, iris="ink"):
    """A yōkai's single big eye painted on: white, a dark iris, a catchlight."""
    dot(F, pid, [list(c) + [r]], "white", 4.6, "eyewhite")
    dot(F, pid, [[c[0], c[1] - r * 0.1, c[2] + 0.15, r * 0.55]], iris, 1.2, "iris")
    dot(F, pid, [[c[0] - r * 0.22, c[1] + r * 0.12, c[2] + 0.3, r * 0.2]], "white", 5.0, "catch")


def tongue(F, pid, at, length, col, rot=(0, 0, 0)):
    F.loft(pid, [((0, 0, 0), [2.6, 0.9]), ((0, -length * 0.6, 0.8), [2.4, 0.8]), ((0, -length, 1.2), [1.6, 0.7])], at, sides=6, rnd=2.2,
           subdiv=0, col=col, style="vinyl", rot=list(rot))


def karakasa():
    F = Fig(f"{S}/karakasa", "Karakasa & Cotton Candy", "The one-eyed paper umbrella hops to the cotton-candy stall on its one wooden leg.")
    paper, rib, pink = F.c("#7a4ab0", hue=12, spread=0.7), F.c("#f2e2b8", spread=0.5), F.c("#f6a8c8", spread=0.5)
    wood = F.c("#b07a48", spread=0.6)
    F.box("geta", [12.0, 1.8, 15.0], (2.0, 1.5, 0.6), ch=0.5, col=wood, style="vinyl_hard")
    for z in (-4.4, 5.4):
        F.box(f"teeth{z:+.0f}", [11.0, 1.2, 1.6], (2.0, 0.6, z), ch=0.2, col=wood, style="vinyl_hard")
    F.add("handle", "prism", (0, 2.2, 0), size=[2.0, 2.0, 15.0], sides=8, rot=[-90, 0, 0], off=[0, 0, 7.5], col=wood, style="vinyl")
    F.loft("canopy", [((0, 14.6, 0), [4.0, 4.0]), ((0, 15.4, 0), [24.0, 24.0]), ((0, 21.0, 0), [17.0, 17.0]), ((0, 27.6, 0), [8.0, 8.0]),
                      ((0, 30.6, 0), [1.6, 1.6])], (0, 0, 0), sides=12, rnd=1.9, subdiv=1, up=[0, 0, 1], col=paper, style="vinyl")
    F.layer("canopy", id="ribs", op="stripes", axis="around", period=1 / 12, width=0.06, ramp=rib, tone=3.0)
    F.layer("canopy", id="band", op="band", axis="y", **{"from": -0.62, "to": -0.42}, ramp=rib, tone=3.2)
    F.add("tip", "prism", (0, 30.2, 0), size=[1.4, 1.4, 3.2], sides=6, rot=[-90, 0, 0], off=[0, 0, 1.6], col=wood, style="vinyl")
    big_eye(F, "canopy", (0, 22.2, 6.75), 2.8)
    dot(F, "canopy", [[-4.6, 19.8, 7.0, 1.4], [4.6, 19.8, 7.0, 1.4]], F.c("#f08a90"), 3.6, "blush")
    tongue(F, "tongue", (0, 18.0, 8.6), 6.0, F.c("#e8505a"), rot=(-10, 0, 0))
    arm(F, "arm", (8.6, 17.0, 1.4), (10.4, 16.6, 4.0), paper, r=1.4, paw=1.6)
    F.add("stick", "prism", (10.6, 17.4, 4.0), size=[0.7, 0.7, 10.0], sides=6, rot=[-90, 0, 0], off=[0, 0, 5.0], col=rib, style="vinyl")
    ball(F, "candy", (10.6, 30.0, 4.0), 4.6, pink, sides=12, n=7, squash=1.1)
    for i, (dx, dy) in enumerate(((-2.4, 2.0), (2.6, 1.0), (0.4, -2.6))):
        ball(F, f"fluff{i}", (10.6 + dx, 30.0 + dy, 4.6), 2.6, pink, sides=8, n=5)
    gimmick(F, "hop", 1.0, 3.0)
    return F


def chochin():
    F = Fig(f"{S}/chochin", "Lantern & Goldfish", "The paper-lantern yōkai won a goldfish at the scooping stall and will not stop looking at it.")
    paper, red, ink = F.c("#f4ead2", spread=0.55), F.c("#d8382c", hue=10, spread=0.7), F.c("#2a2224", spread=0.6)
    b = vbody(F, "body", [(1.4, 10, 10), (3.2, 15.4, 15.4), (8.0, 19.6, 19.6), (14.0, 21.0, 21.0), (20.0, 19.6, 19.6), (24.0, 15.0, 15.0),
                          (24.8, 10, 10)], paper, subdiv=0)
    F.layer("body", id="ribs", op="stripes", axis="y", period=1.6, width=0.12, shift=-1.0)
    F.layer("body", id="top", op="band", axis="y", **{"from": 0.62, "to": 1.0}, ramp=red, tone=3.0)
    F.layer("body", id="bottom", op="band", axis="y", **{"from": -1.0, "to": -0.62}, ramp=red, tone=3.0)
    for i, y in enumerate((0.0, 24.6)):
        F.cyl(f"cap{i}", 5.6, 1.6, (0, y, 0), sides=12, col=ink, style="vinyl")
    big_eye(F, "body", b(16.0, -16), 3.0)
    dot(F, "body", [b(11.4, 26) + [1.6]], F.c("#f08a90"), 3.6, "blush")
    tongue(F, "tongue", tuple(b(10.6, 4, 0.0)), 5.6, F.c("#e8505a"), rot=(-12, 0, 0))
    for sx in (-1, 1):
        nub(F, f"leg{'LR'[sx > 0]}", (sx * 3.6, 2.8, 0.6), (sx * 4.6, 1.4, 4.0), 1.6, 1.6, ink)
    arm(F, "arm", (9.6, 13.0, 2.0), (12.4, 10.0, 6.6), paper, r=1.3, paw=1.5)
    F.loft("bag", [((12.6, 0.0, 8.0), [5.0, 5.0]), ((12.6, 2.4, 8.0), [8.0, 8.0]), ((12.6, 6.4, 8.0), [7.6, 7.6]), ((12.6, 8.6, 8.0), [2.4, 2.4]),
                   ((12.6, 10.2, 8.0), [1.6, 1.6])], (0, 0, 0), sides=10, rnd=2.0, subdiv=0, up=[0, 0, 1], col=F.c("#d8eef4"), style="clear",
           mat="glass")
    F.loft("fish", [((11.6, 4.6, 8.0), [1.4, 1.8]), ((12.8, 4.8, 8.0), [2.4, 2.6]), ((14.0, 4.8, 8.0), [0.8, 1.4]), ((14.8, 5.0, 8.0), [0.2, 2.4])],
           (0, 0, 0), sides=6, rnd=2.0, subdiv=0, col=F.c("#f07a2a"), style="vinyl")
    gimmick(F, "wobble", 1.2, 8)
    return F


def zori():
    F = Fig(f"{S}/zori", "Walking Zōri", "A straw sandal that got up and walked off to the festival, fanning itself all the way.")
    straw, red, ink = F.c("#d8c088", spread=0.6), F.c("#c83a3a", hue=8), F.c("#2a2224", spread=0.6)
    F.box("sole", [13.0, 27.0, 3.4], (0, 15.6, 0), ch=1.6, col=straw, style="vinyl")
    F.layer("sole", id="weave", op="stripes", axis="y", period=1.4, width=0.25, shift=-0.7, faces=["front", "back"])
    F.layer("sole", id="edge", op="band", axis="z", **{"from": -1.0, "to": -0.5}, ramp=F.c("#a88850"), tone=3.0)
    for sx in (-1, 1):
        F.loft(f"thong{'LR'[sx > 0]}", [((sx * 5.0, 14.0, 1.8), [1.4, 1.0]), ((sx * 3.4, 19.0, 3.6), [1.4, 1.0]), ((0, 22.0, 2.4), [1.4, 1.0])],
               (0, 0, 0), sides=6, rnd=2.2, subdiv=1, col=red, style="vinyl")
        nub(F, f"leg{'LR'[sx > 0]}", (sx * 3.4, 3.6, 0.4), (sx * 4.0, 1.8, 0.8), 1.2, 1.4, ink)
        F.loft(f"foot{'LR'[sx > 0]}", [((sx * 4.0, 0.8, -3.6), [2.8, 1.6]), ((sx * 4.0, 0.9, 1.0), [3.4, 1.8]), ((sx * 4.0, 0.8, 4.6), [2.6, 1.6])],
               (0, 0, 0), sides=8, rnd=2.2, subdiv=0, col=ink, style="vinyl")
    ball(F, "knot", (0, 22.4, 2.6), 1.2, red, sides=8, n=4)
    big_eye(F, "sole", (0, 9.0, 1.85), 2.8)
    dot(F, "sole", [[-4.0, 6.4, 1.85, 1.2], [4.0, 6.4, 1.85, 1.2]], F.c("#f08a90"), 3.6, "blush")
    arm(F, "arm", (6.2, 17.0, 0.6), (9.4, 21.0, 2.6), straw, r=1.2, paw=1.4)
    F.add("fan", "prism", (10.0, 24.6, 2.6), size=[8.4, 8.0, 0.6], sides=12, rot=[0, 10, -16], col=F.c("#5a8ad8"), style="vinyl")
    F.layer("fan", id="wave", op="stripes", axis="y", period=2.0, width=0.3, ramp=F.c("#f4f2ec"), tone=3.4, wobble=1.0)
    F.add("fanstick", "prism", (9.6, 19.6, 2.6), size=[0.8, 0.8, 5.0], sides=6, rot=[-90, 0, -16], off=[0, 0, 2.5], col=straw, style="vinyl")
    gimmick(F, "wobble", 1.0, 10)
    return F


def nurikabe():
    F = Fig(f"{S}/nurikabe", "Nurikabe & Takoyaki", "The wall yōkai blocks the whole lane so nobody else gets to the takoyaki boat first.")
    grey, wood, tako = F.c("#a8a8a0", spread=0.6), F.c("#e8d8b0", spread=0.5), F.c("#c8823a", hue=10, spread=0.6)
    F.loft("wall", [((0, 0, 0), [24.0, 11.0]), ((0, 2.0, 0), [25.0, 12.0]), ((0, 22.0, 0), [24.6, 11.6]), ((0, 25.6, 0), [22.0, 10.4]),
                    ((0, 27.0, 0), [16.0, 8.0])], (0, 0, 0), sides=12, rnd=3.2, subdiv=0, up=[0, 0, 1], col=grey, style="vinyl")
    F.layer("wall", id="plaster", op="spots", count=10, radius=[0.8, 1.6], shift=0.6, roughness=0, min_gap=3.0)
    face(F, "wall", [-4.4, 18.0, 6.05], [4.4, 18.0, 6.05], er=1.1, mouth=[0, 14.0, 6.05], mouth_kind="smile", mr=1.4,
         blushL=[-7.6, 15.2, 6.05], blushR=[7.6, 15.2, 6.05], br=1.7, brows=[[-4.4, 19.8, 6.1], [-3.4, 19.9, 6.1], [4.4, 19.8, 6.1], [3.4, 19.9, 6.1]])
    for sx in (-1, 1):
        nub(F, f"leg{'LR'[sx > 0]}", (sx * 6.0, 2.0, 2.0), (sx * 6.6, 1.4, 6.6), 2.0, 2.0, grey)
    arm(F, "armL", (-10.6, 11.0, 2.0), (-5.0, 9.4, 9.6), grey, r=1.8, paw=1.8)
    arm(F, "armR", (10.6, 11.0, 2.0), (5.0, 9.4, 9.6), grey, r=1.8, paw=1.8)
    F.box("boat", [11.0, 2.2, 6.6], (0, 10.6, 10.4), ch=0.4, col=wood, style="vinyl_hard")
    for i, x in enumerate((-3.4, 0.0, 3.4)):
        ball(F, f"tako{i}", (x, 12.6, 10.4), 1.7, tako, sides=10, n=5)
        dot(F, f"tako{i}", [[x - 0.4, 14.3, 10.6, 0.6], [x + 0.5, 14.2, 10.0, 0.5]], F.c("#5a8a3a"), 2.4, "nori")
        dot(F, f"tako{i}", [[x, 14.35, 10.4, 0.9]], F.c("#5a2a14"), 2.6, "sauce")
    F.add("pick", "prism", (2.0, 15.0, 10.4), size=[0.4, 0.4, 5.0], sides=4, rot=[-70, 0, 20], col=wood, style="vinyl")
    gimmick(F, "wobble", 1.4, 5)
    return F


def kappa():
    F = Fig(f"{S}/kappa", "Kappa & Pickle", "A cucumber on a stick from the pickle stall, and the water in its head-plate sloshing. Perfect night.")
    green, shell, beak = F.c("#58a858", hue=10, spread=0.7), F.c("#8a6a3a", spread=0.65), F.c("#f2c040", hue=8)
    b = vbody(F, "body", [(0.0, 12.4, 11), (1.6, 15.6, 14), (6.0, 16.8, 15.0), (11.0, 15.6, 14.0), (14.6, 12.4, 11.4), (16.4, 8, 7.4)], green, subdiv=0)
    F.layer("body", id="belly", op="spots", centers=[b(7.4, 0, -0.3) + [4.6]], ramp=F.c("#d8e8a0"), tone=3.2, roughness=0)
    F.loft("shell", [((0, 2.4, -5.4), [12.0, 3.0]), ((0, 8.0, -7.6), [15.0, 4.6]), ((0, 13.6, -6.4), [12.0, 3.2]), ((0, 15.4, -5.0), [6.0, 1.4])],
           (0, 0, 0), sides=10, rnd=2.4, subdiv=1, col=shell, style="vinyl")
    F.layer("shell", id="plates", op="scales", along="y", size=[3.2, 3.0], shape="square", gap=0.6)
    h = vbody(F, "head", [(14.0, 8, 7.4), (15.4, 14.4, 12.6), (18.6, 17.2, 15.0), (22.0, 16.6, 14.4), (24.4, 13.6, 11.8), (25.4, 10.6, 9.4)],
              green, subdiv=0)
    F.loft("dish", [((0, 25.0, 0), [11.4, 10.0]), ((0, 25.8, 0), [11.0, 9.6]), ((0, 26.0, 0), [9.0, 7.8])], (0, 0, 0), sides=14, rnd=2.0, subdiv=0,
           up=[0, 0, 1], col=F.c("#e8e4d4"), style="vinyl")
    F.layer("dish", id="water", op="fill", ramp=F.c("#8ad0e8"), tone=3.4, faces=["end"])
    for i, a in enumerate(range(0, 360, 40)):
        x, z = 5.8 * math.sin(math.radians(a)), 5.0 * math.cos(math.radians(a))
        F.add(f"hair{i}", "prism", (x, 24.6, z), size=[1.8, 1.0, 2.6], sides=4, rot=[-90 + 25 * math.cos(math.radians(a)), 0, -25 * math.sin(math.radians(a))],
              off=[0, 0, 1.0], col=F.c("#2a5a3a"), style="vinyl")
    F.loft("beak", [((0, 0, 0), [5.4, 3.0]), ((0, -0.4, 1.8), [4.2, 2.2]), ((0, -0.8, 2.8), [1.6, 1.0])], (0, 18.8, 6.8), sides=8, rnd=2.0, subdiv=0,
           col=beak, style="vinyl")
    face(F, "head", h(21.0, -26), h(21.0, 26), er=1.1, blushL=h(18.6, -46), blushR=h(18.6, 46), br=1.5)
    for sx in (-1, 1):
        nub(F, f"leg{'LR'[sx > 0]}", (sx * 4.2, 3.0, 1.4), (sx * 5.0, 1.6, 4.6), 2.2, 2.4, green)
    arm(F, "armL", (-7.2, 12.0, 0.6), (-9.0, 7.6, 3.0), green, r=1.8, paw=1.8)
    arm(F, "armR", (7.2, 12.0, 0.6), (9.0, 15.0, 4.4), green, r=1.8, paw=1.8)
    F.add("pstick", "prism", (9.4, 13.6, 4.6), size=[0.7, 0.7, 6.0], sides=6, rot=[-90, 0, 0], off=[0, 0, 3.0], col=F.c("#e8d8b0"), style="vinyl")
    F.loft("pickle", [((9.4, 17.8, 4.6), [2.6, 2.6]), ((9.4, 20.6, 4.6), [3.0, 3.0]), ((9.4, 24.4, 4.6), [2.8, 2.8]), ((9.4, 26.0, 4.6), [1.4, 1.4])],
           (0, 0, 0), sides=8, rnd=2.0, subdiv=0, up=[0, 0, 1], col=F.c("#3a8a3a"), style="vinyl")
    F.layer("pickle", id="bumps", op="spots", count=10, radius=[0.3, 0.4], shift=1.0, roughness=0)
    gimmick(F, "nod", 1.2, 9)
    return F


def kitsune():
    F = Fig(f"{S}/kitsune", "Kitsune-bi", "The white fox of the shrine at the top of the lane, two blue foxfires dancing on its tails. Seen once a year.")
    white, red, fire = F.c("#f6f2ea", spread=0.5), F.c("#d83a3a", hue=8), F.c("#7ac8f8", spread=0.5)
    b = vbody(F, "body", [(0.0, 13, 12), (1.6, 15.6, 14.6), (6.0, 16.0, 15.0), (11.0, 13.8, 13.0), (14.4, 10.6, 10.0), (16.0, 7, 6.6)], white, subdiv=0)
    h = vbody(F, "head", [(13.6, 7, 6.6), (15.0, 12.6, 11.4), (18.0, 15.0, 13.6), (21.0, 14.0, 12.4), (23.0, 10.4, 9.4), (23.8, 5.6, 5.2)], white, subdiv=0)
    F.loft("snout", [((0, 17.6, 4.6), [7.0, 5.6]), ((0, 17.0, 7.6), [4.8, 3.8]), ((0, 16.6, 9.6), [2.4, 2.0]), ((0, 16.5, 10.2), [0.8, 0.8])],
           (0, 0, 0), sides=10, rnd=2.1, subdiv=0, col=white, style="vinyl")
    dot(F, "snout", [[0, 16.7, 10.45, 0.6]], "ink", 1.4, "nose")
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        dot(F, "head", [h(19.6, sx * 26) + [1.1]], red, 3.0, f"mark{k}")
        dot(F, "head", [[h(19.6, sx * 26)[0], h(19.6, sx * 26)[1] - 0.3, h(19.6, sx * 26)[2] + 0.2, 0.7]], "ink", 1.2, f"eye{k}")
        F.loft(f"ear{k}", [((sx * 4.0, 21.6, -0.6), [4.4, 2.0]), ((sx * 5.0, 25.0, -0.8), [3.0, 1.4]), ((sx * 5.6, 27.6, -1.0), [0.6, 0.4])],
               (0, 0, 0), sides=6, rnd=2.0, subdiv=0, col=white, style="vinyl")
        F.layer(f"ear{k}", id="inner", op="band", axis="path", **{"from": 0.3, "to": 1.0}, ramp=red, tone=3.0, faces=["s0_0", "s1_0"])
        nub(F, f"leg{k}", (sx * 3.4, 3.0, 2.4), (sx * 3.8, 1.4, 5.6), 1.6, 1.7, white)
        F.loft(f"tail{k}", [((sx * 2.0, 3.4, -6.0), [4.4, 4.0]), ((sx * 6.0, 5.6, -9.6), [6.0, 5.4]), ((sx * 9.0, 10.6, -10.6), [5.0, 4.6]),
                            ((sx * 10.4, 15.0, -9.6), [2.4, 2.2])], (0, 0, 0), sides=10, rnd=2.1, subdiv=1, col=white, style="vinyl")
        F.layer(f"tail{k}", id="tip", op="band", axis="path", **{"from": 0.78, "to": 1.0}, ramp=red, tone=3.0)
        ball(F, f"fire{k}", (sx * 10.6, 18.6, -9.2), 2.6, fire, sides=10, n=6, squash=1.3, mat="glow")
    F.loft("bib", [((0, 14.6, 0.2), [11.0, 10.4]), ((0, 15.4, 0.4), [10.6, 10.0])], (0, 0, 0), sides=12, rnd=2.1, subdiv=0, up=[0, 0, 1],
           col=red, style="vinyl")
    gimmick(F, "wobble", 1.4, 6)
    return F


FIGS = {"karakasa": karakasa, "chochin": chochin, "zori": zori, "nurikabe": nurikabe, "kappa": kappa, "kitsune": kitsune}
