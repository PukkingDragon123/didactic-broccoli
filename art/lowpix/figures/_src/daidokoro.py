"""Kitchen Shelf (台所のたな): the pots, jugs, cans and bowls of a Showa kitchen, modelled low poly by hand in lowpix
(docs/LOWPOLY.md) to reference photos and photo-bashed with real CC0 material photos (Poly Haven) under painted light.
Each stands on its own."""
from figlib import Fig
from objkit import lathe, arc_handle

S = "daidokoro"


def f_milk():
    F = Fig(f"{S}/milk", "Milk Can", "The tall aluminium can the milkman filled at dawn, dented from the bicycle.")
    # reference: aluminium milk churns at a farm gate (refs/milk.jpg, CC BY): a footed drum, a sloped shoulder to a
    # narrow neck about half the drum's width, a flared collar, a domed lid with a knob, and two loop handles at the
    # shoulder. Drum : neck+collar height about 2 : 1. A 60 cm churn made 40 mm.
    alu = F.c("#8a9098", hue=6, k=0.0, spread=0.5)
    lathe(F, "can", [(0.0, 9.4), (1.2, 9.8), (1.8, 9.5), (2.2, 10.0), (15.5, 10.0), (16.2, 10.3), (17.0, 10.0), (22.6, 9.7),
                     (27.6, 5.6), (30.8, 5.0), (32.4, 5.4), (34.2, 6.4), (35.0, 6.4)], col=alu, style="steelp", sides=16)
    F.layer("can", id="bands", op="stripes", axis="y", period=16.2, width=0.05, phase=0.1, shift=-0.8)
    lathe(F, "lid", [(34.6, 6.2), (35.8, 6.0), (37.2, 4.0), (37.9, 1.6), (39.4, 1.5), (40.0, 1.0)], col=alu, style="steelp", sides=14)
    for sx in (-1, 1):
        arc_handle(F, f"handle{'LR'[sx > 0]}", (sx * 8.0, 24.6, -2.8), (sx * 8.0, 24.6, 2.8), 0.0, 0.55, alu, "steelp",
                   out=(sx * 2.6, 1.6, 0))
    F.clip("wobble", 1.2, [{"part": "can", "keys": [[0, [0, 0, 0]], [0.3, [0, 0, 6]], [0.7, [0, 0, -4]], [1.2, [0, 0, 0]]]},
                           {"part": "lid", "keys": [[0, [0, 0, 0]], [0.3, [0, 0, 6]], [0.7, [0, 0, -4]], [1.2, [0, 0, 0]]]}], role="gimmick")
    return F


def f_bowl():
    F = Fig(f"{S}/bowl", "Turned Lidded Bowl", "Turned from one block of zelkova on Grandpa's lathe, ring after ring, for the New Year beans.")
    # reference: a turned wooden lidded bowl (refs/bowl.jpg, CC BY): a short flared foot a third of the width, a deep
    # rounded bowl, a domed lid as tall as the bowl with turned rings all over and a small round finial.
    # Width : height about 1 : 0.85. Made 34 mm wide.
    wood = F.c("#5e3a1e", hue=12, spread=0.8)
    lathe(F, "bowl", [(0.0, 7.2), (1.4, 7.6), (2.4, 6.0), (3.4, 5.6), (4.4, 8.6), (6.2, 12.6), (8.6, 15.4), (11.6, 16.8),
                      (13.0, 16.9), (13.4, 16.4)], col=wood, style="oak", sides=18)
    import math
    prof = [(13.2, 16.6), (14.0, 16.8)]
    for i in range(1, 8):  # a domed lid turned in rings: each ring a bead, then a small step in
        a = math.radians(i * 11.5)
        y, r = 14.0 + 12.0 * math.sin(a), 16.8 * math.cos(a) + 0.4
        prof += [(y - 0.5, r + 0.45), (y, r)]
    y = prof[-1][0]
    prof += [(y + 0.4, 3.0), (y + 0.6, 2.2)]
    lathe(F, "lid", prof, col=wood, style="oak", sides=18)
    lathe(F, "knob", [(y + 1.2, 2.0), (y + 2.2, 2.6), (y + 3.6, 2.4), (y + 4.2, 1.0)], col=wood, style="oak", sides=10)
    F.layer("bowl", id="rings", op="stripes", axis="y", period=1.6, width=0.12, shift=-0.6)
    F.clip("lift", 1.4, [{"part": "lid", "channel": "position", "keys": [[0, [0, 0, 0]], [0.35, [0, 5, 0]], [0.9, [0, 5, 0]], [1.4, [0, 0, 0]]]},
                         {"part": "knob", "channel": "position", "keys": [[0, [0, 0, 0]], [0.35, [0, 5, 0]], [0.9, [0, 5, 0]], [1.4, [0, 0, 0]]]}],
           role="gimmick")
    return F


def f_teapot():
    F = Fig(f"{S}/teapot", "Flowered Teapot", "Red stoneware painted with peonies and plum blossom. Only out when the most important guests come.")
    # reference: a redware teapot with enamelled flowers (refs/teapot.jpg, CC BY): a pear body widest low down, a
    # domed lid with a ball knob, a tall S-spout rising from low on the body to above the rim, a loop handle the
    # body's height. Body height : width about 1.05 : 1. Made 38 mm tall.
    red = F.c("#c44a2c", hue=10, spread=0.7)
    lathe(F, "pot", [(0.0, 6.4), (0.6, 7.0), (1.0, 7.4), (4.0, 10.4), (8.0, 11.4), (12.0, 10.6), (16.0, 8.6), (20.0, 6.6),
                     (23.0, 5.6), (24.0, 5.9), (24.6, 5.9)], col=red, style="ceramic", sides=16)
    lathe(F, "lid", [(24.2, 5.6), (25.2, 5.5), (26.6, 4.2), (27.4, 1.6), (27.6, 1.2)], col=red, style="ceramic", sides=14)
    lathe(F, "knob", [(27.4, 1.0), (27.9, 1.7), (29.0, 1.9), (30.0, 1.3), (30.4, 0.5)], col=red, style="ceramic", sides=10)
    F.loft("spout", [((0, 7.0, 8.6), [6.4, 6.0]), ((0, 9.6, 12.4), [4.4, 4.0]), ((0, 13.6, 15.2), [3.2, 3.0]),
                     ((0, 19.0, 16.4), [2.6, 2.5]), ((0, 23.4, 18.4), [2.4, 2.2]), ((0, 25.4, 20.6), [2.8, 2.2])], (0, 0, 0), sides=8, rnd=2.0, col=red, style="ceramic")
    F.loft("handle", [((0, 20.6, -6.4), [2.4, 3.0]), ((0, 22.4, -11.6), [2.2, 2.8]), ((0, 17.6, -16.6), [2.0, 2.6]),
                      ((0, 9.6, -15.2), [2.0, 2.6]), ((0, 5.6, -10.4), [2.4, 3.0])], (0, 0, 0), sides=8, rnd=2.0, col=red, style="ceramic")
    # the enamelled flowers, painted after the reference: peonies (pink), a blue chrysanthemum, plum blossom, leaves
    pink, blue, green, yel = F.c("#e890b8"), F.c("#6aa0d8"), F.c("#3a7a4a"), F.c("#e8c040")
    import math
    def on(ang, y, rad):  # a point on the pot's surface at this angle (deg from the front) and height
        R = {2: 9.0, 5: 10.6, 8: 11.3, 11: 11.0, 14: 9.9, 17: 8.4}[y]
        return [round(R * math.sin(math.radians(ang)), 2), y, round(R * math.cos(math.radians(ang)), 2), rad]
    lv = [on(a, y, 1.9) for a, y in ((-38, 5), (-14, 2), (22, 8), (40, 5), (70, 11), (-70, 8), (140, 5), (-150, 8), (190, 11), (100, 2))]
    F.layer("pot", id="leaves", op="spots", centers=lv, ramp=green, tone=2.6, roughness=0.5)
    pe = [on(a, y, 2.8) for a, y in ((-30, 8), (40, 11), (-110, 5), (160, 8))]
    F.layer("pot", id="peony", op="spots", centers=pe, ramp=pink, tone=3.0, roughness=0.55)
    F.layer("pot", id="peony2", op="spots", centers=[p[:3] + [1.5] for p in pe], ramp=pink, tone=4.2, roughness=0.5)
    mu = [on(a, y, 3.0) for a, y in ((10, 5), (-170, 11), (100, 8))]
    F.layer("pot", id="mum", op="spots", centers=mu, ramp=blue, tone=3.0, roughness=0.7)
    F.layer("pot", id="mum2", op="spots", centers=[p[:3] + [1.4] for p in mu], ramp=blue, tone=4.2, roughness=0.6)
    F.layer("pot", id="centre", op="spots", centers=[p[:3] + [0.6] for p in pe + mu], ramp=yel, tone=3.4, roughness=0)
    F.layer("pot", id="blossom", op="spots", centers=[on(a, 14, 0.8) for a in (-60, -20, 25, 65, 120, 200, 250)] + [on(a, 17, 0.7) for a in (0, 90, 180, 270)],
            ramp="white", tone=4.6, roughness=0)
    F.layer("lid", id="flower", op="spots", centers=[[2.6, 26.0, 2.6, 0.9], [-2.6, 26.0, -1.6, 0.8]], ramp=pink, tone=3.2, roughness=0.4)
    F.clip("pour", 1.6, [{"part": p, "keys": [[0, [0, 0, 0]], [0.5, [24, 0, 0]], [1.0, [24, 0, 0]], [1.6, [0, 0, 0]]]}
                         for p in ("pot", "lid", "knob", "spout", "handle")], role="gimmick")
    return F


def f_kettle():
    F = Fig(f"{S}/kettle", "Aluminium Kettle", "The dented yakan that sang on the stove every morning, its handle wrapped in leather against the heat.")
    # reference: an aluminium kettle (refs/kettle.jpg, CC BY): a squat drum 1.3 times as wide as tall with a rounded
    # shoulder, a flat lid with a knob, a short spout low on the front angled up, a tall bail handle hinged at two
    # lugs with a leather-wrapped grip. Made 34 mm wide.
    alu = F.c("#9296a0", hue=6, k=0.0, spread=0.5)
    leather = F.c("#7a4a2a", spread=0.8)
    lathe(F, "pot", [(0.0, 15.0), (0.6, 16.4), (1.6, 17.0), (13.0, 17.0), (15.6, 15.6), (17.4, 12.0), (18.2, 7.6), (18.6, 7.4)],
          col=alu, style="steelp", sides=18)
    F.layer("pot", id="dents", op="spots", count=5, radius=[1.5, 3.0], shift=-0.8, roughness=0.6, where={"y": [-0.6, 0.6]})
    lathe(F, "lid", [(18.2, 7.2), (19.0, 7.0), (19.6, 5.4), (19.8, 1.6), (21.6, 1.4), (22.6, 2.2), (23.2, 1.2)], col=alu,
          style="steelp", sides=14)
    F.loft("spout", [((0, 4.0, 13.4), [6.4, 7.0]), ((0, 6.4, 18.0), [3.8, 4.2]), ((0, 9.4, 21.2), [2.8, 2.8]),
                     ((0, 11.0, 22.8), [2.8, 2.6])], (0, 0, 0), sides=8, rnd=2.0, col=alu, style="steelp")
    for sx in (-1, 1):
        F.box(f"lug{'LR'[sx > 0]}", [1.6, 2.6, 2.4], (sx * 9.0, 17.0, 0), ch=0.4, col=alu, style="steelp")
    arc_handle(F, "bail", (-9.2, 18.2, 0), (9.2, 18.2, 0), 13.0, 0.6, alu, "steelp", n=8)
    arc_handle(F, "grip", (-6.0, 28.6, 0), (6.0, 28.6, 0), 2.6, 1.6, leather, "jean", n=4, sides=8)
    F.layer("grip", id="wrap", op="stripes", axis="x", period=1.2, width=0.2, shift=-0.8)
    F.clip("whistle", 1.2, [{"part": "lid", "channel": "position", "keys": [[0, [0, 0, 0]], [0.15, [0, 1.2, 0]], [0.3, [0, 0, 0]], [0.45, [0, 1.2, 0]], [0.6, [0, 0, 0]], [1.2, [0, 0, 0]]]}],
           role="gimmick")
    return F


def f_jug():
    F = Fig(f"{S}/jug", "Blue Flower Jug", "White ironstone printed all over with blue flowers, for barley tea in summer. A chip on the lip, from 1962.")
    # reference: a transferware water jug (refs/jug.jpg, CC BY): a low foot, a full belly, a narrow waist, a tall
    # flared neck to a pouring lip with a beak, a big loop handle from rim to belly. Height : width about 1.25 : 1.
    white, blue = F.c("#eef0f2", hue=-6, spread=0.6), F.c("#3e64a8", hue=8, spread=0.8)
    lathe(F, "jug", [(0.0, 7.6), (1.0, 8.0), (1.6, 7.6), (3.0, 10.0), (8.0, 12.4), (13.0, 12.0), (18.0, 9.6), (21.0, 8.8),
                     (25.6, 10.0), (29.0, 11.4), (30.0, 11.6)], col=white, style="ceramic", sides=16, caps=(True, False))
    F.layer("jug", id="leaves", op="spots", count=260, radius=[0.25, 0.55], roughness=0.6, ramp=blue, tone=3.4, seed=7)
    F.layer("jug", id="flowers", op="spots", count=70, radius=[0.5, 1.0], roughness=0.8, ramp=blue, tone=2.4, min_gap=0.6)
    F.layer("jug", id="hearts", op="spots", count=60, radius=[0.2, 0.35], roughness=0, ramp="white", tone=4.2, seed=3)
    F.layer("jug", id="rim", op="band", axis="y", **{"from": 0.9, "to": 1.0}, ramp=blue, tone=2.6)
    F.loft("beak", [((0, 26.0, 9.0), [7.0, 2.0]), ((0, 28.6, 11.6), [6.0, 1.8]), ((0, 30.6, 13.8), [3.4, 1.4])], (0, 0, 0), sides=8, rnd=2.0,
           col=white, style="ceramic")
    F.loft("handle", [((0, 27.6, -10.4), [2.8, 3.6]), ((0, 28.0, -15.6), [2.6, 3.4]), ((0, 22.0, -19.0), [2.4, 3.2]),
                      ((0, 13.0, -16.6), [2.4, 3.2]), ((0, 8.0, -11.6), [2.8, 3.6])], (0, 0, 0), sides=8, rnd=2.0, col=white, style="ceramic")
    F.layer("handle", id="flowers", op="spots", count=6, radius=[0.6, 1.2], roughness=0.6, ramp=blue, tone=3.0)
    F.clip("pour", 1.6, [{"part": p, "keys": [[0, [0, 0, 0]], [0.5, [26, 0, 0]], [1.0, [26, 0, 0]], [1.6, [0, 0, 0]]]}
                         for p in ("jug", "beak", "handle")], role="gimmick")
    return F


FIGS = {"milk": f_milk, "bowl": f_bowl, "teapot": f_teapot, "kettle": f_kettle, "jug": f_jug}
