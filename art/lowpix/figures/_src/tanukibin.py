"""Tanuki Express (たぬき便): the lane's tanuki delivery crew, an original capsule-toy mascot series (CLAUDE.md toy
rule): chunky soft-PVC tanuki modelled by hand in lowpix, each with its own pose and load, factory paint with
airbrushed blush and dot eyes, 5 figures, one secret. About 4.5 cm; each stands on its own feet."""
from figlib import Fig
from mascot import vbody, face, nub, ball, dot, gimmick, arm

S = "tanukibin"


def tanuki(F, hat=None):
    """The crew's tanuki: a pear body with a cream belly, a big round head with the dark eye mask, round ears, stubby
    dark legs and a fat ringed tail. Returns (body surface, head surface, colours)."""
    fur, dark, cream = F.c("#9a7650", hue=12, spread=0.7), F.c("#3e3028", spread=0.6), F.c("#eadcbc", spread=0.55)
    b = vbody(F, "body", [(0.0, 16, 14), (1.4, 18.6, 16.2), (3.6, 20.6, 17.8), (8, 21.4, 18.6), (12.4, 20.0, 17.4), (15.6, 17.2, 15.0),
                        (17.6, 13.4, 11.8), (18.6, 9, 8)], fur, "vinyl", subdiv=0)
    F.layer("body", id="belly", op="spots", centers=[b(8.6, 0, -0.2) + [6.4]], ramp=cream, tone=3.2, roughness=0, stretch=[1.0, 1.15, 1.0])
    h = vbody(F, "head", [(15.6, 9, 8), (16.6, 14, 12.4), (18.0, 18.4, 15.6), (20.4, 21.2, 17.8), (23.4, 22, 18.4), (26.6, 21.4, 17.6),
                          (29.2, 18.4, 15.4), (31.2, 13, 11), (32.4, 6, 5.6)], fur, "vinyl", sides=16, subdiv=0)
    F.layer("head", id="mask", op="spots", centers=[h(23.4, -27) + [2.9], h(23.4, 27) + [2.9]], ramp=dark, tone=3.0, roughness=0,
            stretch=[1.25, 0.9, 1.0])
    F.layer("head", id="brows", op="spots", centers=[h(26.8, -22) + [1.5], h(26.8, 22) + [1.5]], ramp=cream, tone=3.4, roughness=0,
            stretch=[1.4, 0.7, 1.0])
    ball(F, "muzzle", (0, 21.4, 7.0), 3.6, cream, "vinyl", sides=12, n=5, squash=0.8)
    dot(F, "muzzle", [[0, 22.6, 10.4, 1.2]], dark, 1.6, "nose")
    dot(F, "muzzle", [[0.0, 21.7, 10.65, 0.38]], "white", 4.6, "nose_hi")
    face(F, "head", h(23.4, -27, 0.3), h(23.4, 27, 0.3), er=1.15, blushL=h(21.0, -48), blushR=h(21.0, 48), br=1.7)
    for sx in (-1, 1):
        k = "LR"[sx > 0]
        F.add(f"ear{k}", "prism", (sx * 7.4, 30.0, -1.2), size=[5.4, 5.0, 2.0], sides=8, rot=[-6, sx * -18, sx * -24], col=dark,
              style="vinyl", front_scale=[0.85, 0.85])
        nub(F, f"leg{k}", (sx * 5.2, 3.8, 1.6), (sx * 6.2, 2.7, 4.8), 2.8, 2.7, dark, "vinyl")
    F.loft("tail", [((0, 4.8, -7.4), [6.4, 6.0]), ((0, 3.8, -11.6), [8.0, 7.4]), ((0.8, 2.6, -15.6), [6.6, 6.0]), ((1.4, 2.0, -18.0), [2.6, 2.4])],
           (0, 0, 0), sides=9, rnd=2.1, subdiv=0, col=fur, style="vinyl")
    F.layer("tail", id="rings", op="stripes", axis="path", period=3.4, width=0.36, ramp=dark, tone=3.0)
    if hat == "cap":  # a delivery cap with a short peak
        F.loft("cap", [((0, 27.4, -0.4), [20.6, 17.6]), ((0, 30.2, -0.6), [19.0, 16.2]), ((0, 32.4, -0.8), [13.0, 11.0]),
                       ((0, 33.2, -0.8), [5.0, 4.4])], (0, 0, 0), sides=12, rnd=2.1, subdiv=0, up=[0, 0, 1], col=F.c("#2c4a7a"), style="vinyl")
        F.loft("peak", [((0, 28.2, 6.0), [12.0, 1.0]), ((0, 27.8, 9.6), [11.0, 0.9]), ((0, 27.4, 11.0), [7.0, 0.8])], (0, 0, 0), sides=6,
               rnd=2.4, subdiv=0, col=F.c("#2c4a7a"), style="vinyl")
    return b, h, (fur, dark, cream)


def arms(F, la, ra, fur):
    """Both arms: (shoulder, hand) per side."""
    for k, (a, b) in (("L", la), ("R", ra)):
        arm(F, f"arm{k}", a, b, fur, r=2.5, paw=2.5)


def soba():
    F = Fig(f"{S}/soba", "Soba Run", "Three trays of zaru soba on one paw, through the lane at full speed. Not a noodle lost.")
    b, h, (fur, dark, cream) = tanuki(F)
    F.loft("hachimaki", [((0, 26.0, 0), [22.4, 18.8]), ((0, 28.0, -0.2), [21.6, 18.2])], (0, 0, 0), sides=14, rnd=2.1, subdiv=0,
           up=[0, 0, 1], col=F.c("#e8e4dc"), style="vinyl")
    F.layer("hachimaki", id="dot", op="spots", centers=[[0, 27.0, 9.6, 1.4]], ramp=F.c("#c83a2c"), tone=3.0, roughness=0)
    arms(F, ((-9.0, 13.6, 1.0), (-11.6, 8.6, 2.6)), ((9.0, 14.6, 0.6), (11.4, 30.8, 1.0)), fur)
    wood, soba_c = F.c("#b07840", spread=0.7), F.c("#8a7a5a", spread=0.6)
    for i in range(3):
        y = 34.0 + i * 3.4
        F.box(f"tray{i}", [13.0, 2.8, 13.0], (11.0, y, 0.6), ch=0.4, col=wood, style="vinyl_hard", rot=[0, 12 * i - 8, 0])
        F.layer(f"tray{i}", id="bamboo", op="stripes", axis="x", period=0.8, width=0.25, shift=-0.5, faces=["top"])
    F.loft("noodles", [((11.0, 44.8, 0.6), [10.0, 9.0]), ((11.0, 46.4, 0.6), [8.6, 7.6]), ((11.0, 47.4, 0.6), [4.0, 3.6])], (0, 0, 0),
           sides=10, rnd=2.1, subdiv=0, up=[0, 0, 1], col=soba_c, style="vinyl")
    F.layer("noodles", id="strands", op="stripes", axis="x", period=0.6, width=0.35, wobble=2.0, shift=0.7)
    gimmick(F, "wobble", 1.2, 6)
    return F


def parcel():
    F = Fig(f"{S}/parcel", "Furoshiki Courier", "A parcel twice its size, wrapped in the green arabesque cloth, knotted at the chest. Off it goes.")
    b, h, (fur, dark, cream) = tanuki(F)
    green, white = F.c("#3a8a4a", hue=10, spread=0.7), F.c("#f0f0e8")
    F.box("parcel", [20.0, 17.0, 11.0], (0, 15.6, -13.0), ch=3.2, col=green, style="vinyl")
    F.layer("parcel", id="karakusa", op="spots", count=60, radius=[0.5, 1.1], ramp=white, tone=3.6, roughness=0.8, min_gap=1.2)
    F.layer("parcel", id="curl", op="stripes", axis="x", period=2.4, width=0.12, wobble=3.0, ramp=white, tone=3.2, faces=["back", "top", "left", "right"])
    ball(F, "knot", (0, 15.0, 9.2), 2.4, green, "vinyl", sides=8, n=5)
    for sx in (-1, 1):
        F.loft(f"strap{'LR'[sx > 0]}", [((sx * 8.0, 22.0, -7.0), [2.2, 1.0]), ((sx * 8.6, 18.0, 2.0), [2.2, 1.0]), ((sx * 2.0, 15.4, 8.6), [2.0, 1.0])],
               (0, 0, 0), sides=6, rnd=2.4, subdiv=1, col=green, style="vinyl")
    arms(F, ((-9.0, 14.6, 1.0), (-3.4, 14.0, 9.4)), ((9.0, 14.6, 1.0), (3.4, 14.0, 9.4)), fur)
    gimmick(F, "hop", 1.0, 2.0)
    return F


def milk():
    F = Fig(f"{S}/milk", "Milk Round", "Four bottles in the wooden crate before the sun is up. It never drinks one. Almost never.")
    b, h, (fur, dark, cream) = tanuki(F, hat="cap")
    wood = F.c("#c08a50", spread=0.7)
    F.box("crate", [19.0, 7.0, 10.0], (0, 12.6, 13.4), ch=0.6, col=wood, style="vinyl_hard")
    F.layer("crate", id="slat", op="stripes", axis="y", period=2.4, width=0.14, shift=-0.9, faces=["front", "left", "right"])
    dot(F, "crate", [[0, 13.0, 18.5, 1.6]], F.c("#2c4a7a"), 3.0, "mark")
    for i, x in enumerate((-6.6, -2.2, 2.2, 6.6)):
        F.loft(f"bottle{i}", [((x, 14.6, 13.4), [3.6, 3.6]), ((x, 19.6, 13.4), [3.8, 3.8]), ((x, 21.6, 13.4), [2.6, 2.6]), ((x, 22.8, 13.4), [2.2, 2.2])],
               (0, 0, 0), sides=6, rnd=2.0, subdiv=0, up=[0, 0, 1], col=F.c("#f6f6f0"), style="vinyl")
        F.layer(f"bottle{i}", id="cap", op="band", axis="y", **{"from": 0.7, "to": 1.0}, ramp=F.c("#e86a3a" if i % 2 else "#3a7ac8"), tone=3.0)
    arms(F, ((-9.0, 14.0, 1.0), (-9.6, 13.0, 12.0)), ((9.0, 14.0, 1.0), (9.6, 13.0, 12.0)), fur)
    gimmick(F, "wobble", 1.2, 6)
    return F


def news():
    F = Fig(f"{S}/news", "Morning Paper", "One paw in the satchel, one paw throwing. It lands on the doorstep every time, in the bucket only once.")
    b, h, (fur, dark, cream) = tanuki(F, hat="cap")
    canvas, paper = F.c("#c8b07a", spread=0.6), F.c("#eeeae0", spread=0.5)
    F.box("satchel", [5.0, 10.0, 11.0], (-11.6, 8.6, 0.6), ch=1.4, col=canvas, style="vinyl", rot=[0, 0, 6])
    F.loft("sling", [((-10.6, 13.6, 4.2), [1.6, 0.8]), ((-4.0, 20.0, 7.4), [1.6, 0.8]), ((4.6, 23.4, 5.4), [1.6, 0.8]), ((8.4, 22.0, -2.0), [1.6, 0.8])],
           (0, 0, 0), sides=6, rnd=2.4, subdiv=0, col=canvas, style="vinyl")
    for i, z in enumerate((-2.6, 0.4, 3.2)):
        F.box(f"paper{i}", [3.0, 6.0, 2.0], (-11.8, 14.6 + i * 0.6, z), ch=0.3, col=paper, style="vinyl_hard", rot=[0, 0, 10 - i * 6])
        F.layer(f"paper{i}", id="print", op="stripes", axis="y", period=0.8, width=0.25, shift=-1.4, faces=["left", "right"])
    arms(F, ((-9.0, 14.0, 1.0), (-11.4, 11.6, 4.4)), ((9.0, 14.6, 0.4), (14.6, 24.0, -2.0)), fur)
    F.add("roll", "prism", (15.4, 26.6, -2.4), size=[3.2, 3.2, 10.0], sides=8, rot=[0, 10, 70], col=paper, style="vinyl_hard")
    F.layer("roll", id="band", op="band", axis="z", **{"from": -0.12, "to": 0.12}, ramp=F.c("#c83a2c"), tone=3.0)
    gimmick(F, "nod", 1.2, 8)
    return F


def night():
    F = Fig(f"{S}/night", "Night Shift", "Last delivery after the bath house shuts: a red paper lantern on a pole and a bento for the watchman.")
    b, h, (fur, dark, cream) = tanuki(F)
    red, paper = F.c("#d83a2c", hue=10, spread=0.7), F.c("#f6ead0", spread=0.5)
    F.add("pole", "prism", (12.0, 18.0, 6.0), size=[1.0, 1.0, 24.0], sides=6, rot=[-90, 0, -18], off=[0, 0, 0], col=F.c("#4a3a2a"), style="vinyl_hard")
    F.loft("lantern", [((15.4, 27.0, 6.0), [4.4, 4.4]), ((15.4, 28.0, 6.0), [7.2, 7.2]), ((15.4, 32.0, 6.0), [8.0, 8.0]), ((15.4, 36.0, 6.0), [7.2, 7.2]),
                       ((15.4, 37.0, 6.0), [4.4, 4.4])], (0, 0, 0), sides=12, rnd=2.0, subdiv=0, up=[0, 0, 1], col=red, style="vinyl", mat="glow")
    F.layer("lantern", id="ribs", op="stripes", axis="y", period=1.2, width=0.2, shift=-0.8)
    F.layer("lantern", id="band", op="band", axis="y", **{"from": -0.2, "to": 0.25}, ramp=paper, tone=3.6, faces=["sides"])
    for i, y in enumerate((26.6, 37.4)):
        F.cyl(f"cap{i}", 2.4, 1.2, (15.4, y - 0.6, 6.0), sides=10, col=F.c("#2a2224"), style="vinyl")
    F.box("bento", [9.0, 6.0, 7.0], (-11.4, 9.4, 4.0), ch=1.6, col=F.c("#7a3a8a"), style="vinyl")
    ball(F, "bknot", (-11.4, 13.4, 4.0), 1.8, F.c("#7a3a8a"), "vinyl", sides=8, n=4)
    arms(F, ((-9.0, 14.0, 1.0), (-11.0, 11.6, 4.0)), ((9.0, 14.6, 1.0), (12.4, 18.0, 6.0)), fur)
    gimmick(F, "wobble", 1.4, 6)
    return F


FIGS = {"soba": soba, "parcel": parcel, "milk": milk, "news": news, "night": night}
