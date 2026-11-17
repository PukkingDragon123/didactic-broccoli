"""Grandpa's Toolbox (おじいちゃんの道具箱): well-used hand tools, modelled low poly by hand in lowpix (docs/LOWPOLY.md)
to reference photos and photo-bashed with real CC0 material photos (Poly Haven) under painted light."""
from figlib import Fig
from objkit import arc_handle

S = "kogu"


def f_toolbox():
    F = Fig(f"{S}/toolbox", "Tin Toolbox", "Grandpa's galvanised tin box, dented, the hasp held with a bent nail. It still shuts with a clack.")
    # reference: an old galvanised tin tool box (refs/toolbox.jpg, CC BY): a box twice as wide as deep and a little
    # less tall than deep, a shallow lid overhanging by its rolled edge, a wire bail handle in two lugs, and a hasp
    # and staple at the front centre. Made 42 mm wide.
    zinc = F.c("#6a6e66", hue=6, k=0.05, spread=0.5)
    F.box("box", [42.0, 17.0, 21.0], (0, 8.5, 0), ch=0.6, col=zinc, style="steelp")
    F.layer("box", id="rust", op="patches", scale=4.0, threshold=0.7, ramp=F.c("#7a5a3a"), tone=2.6, faces=["sides"])
    F.layer("box", id="seam", op="band", axis="y", **{"from": -1.0, "to": -0.88}, shift=-0.8, faces=["sides"])
    F.box("lid", [43.0, 4.0, 22.0], (0, 19.0, 0), ch=0.9, col=zinc, style="steelp")
    F.layer("lid", id="rim", op="band", axis="y", **{"from": -1.0, "to": -0.4}, shift=0.5, faces=["sides"], bevel=True)
    for sx in (-1, 1):
        F.box(f"lug{'LR'[sx > 0]}", [2.4, 1.6, 2.0], (sx * 7.0, 21.6, 0), ch=0.3, col=zinc, style="steelp")
    arc_handle(F, "handle", (-7.0, 22.0, 0), (7.0, 22.0, 0), 3.0, 0.45, F.c("#4a4a48"), "steelp", n=6)
    F.box("hasp", [3.6, 7.6, 0.6], (0, 15.8, 11.2), ch=0.2, col=zinc, style="steelp", rot=[-4, 0, 0])
    F.box("staple", [1.6, 1.8, 1.2], (0, 13.2, 11.6), ch=0.2, col=F.c("#4a4a48"), style="steelp")
    F.add("nail", "prism", (0, 13.2, 12.4), size=[0.6, 0.6, 3.2], sides=6, rot=[0, 90, 20], col=F.c("#5a4a3a"), style="paint")
    F.clip("clack", 1.2, [{"part": p, "channel": "rotation", "keys": [[0, [0, 0, 0]], [0.3, [-18, 0, 0]], [0.8, [-18, 0, 0]], [1.0, [2, 0, 0]], [1.2, [0, 0, 0]]]}
                          for p in ("lid",)], role="gimmick")
    return F


def f_jouro():
    F = Fig(f"{S}/jouro", "Watering Can", "Galvanised and dented, the can that kept Grandpa's morning glories alive every summer.")
    # reference: a galvanised watering can (refs/wcan.jpg, CC BY): an upright oval tank 1.2 times as long as tall,
    # a long thin spout from the bottom front rising to above the top with a round rose, an arched carry handle over
    # the top and a back handle. Made 44 mm long.
    zinc = F.c("#868c8c", hue=6, k=0.05, spread=0.5)
    F.loft("tank", [((0, 0.0, 0), [17.0, 12.0]), ((0, 1.0, 0), [18.4, 13.2]), ((0, 17.0, 0), [18.4, 13.2]), ((0, 18.2, 0), [17.4, 12.2]),
                    ((0, 19.0, 0), [16.0, 11.0])], (0, 0, 0), sides=14, rnd=2.0, subdiv=0, up=[0, 0, 1], col=zinc, style="steelp")
    F.layer("tank", id="seams", op="band", axis="y", **{"from": 0.62, "to": 0.7}, shift=-0.7)
    F.layer("tank", id="spots", op="patches", scale=3.0, threshold=0.7, shift=-0.6)
    F.loft("spout", [((-7.0, 3.0, 0), [3.0, 3.0]), ((-13.0, 9.0, 0), [2.0, 2.0]), ((-19.0, 17.0, 0), [1.6, 1.6]),
                     ((-21.0, 20.0, 0), [1.8, 1.8])], (0, 0, 0), sides=8, rnd=2.0, subdiv=0, col=zinc, style="steelp")
    F.add("rose", "prism", (-21.6, 21.0, 0), size=[5.0, 5.0, 2.0], sides=12, rot=[0, -90, -38], col=zinc, style="steelp",
          back_scale=[0.5, 0.5])
    F.layer("rose", id="holes", op="spots", count=12, radius=[0.25, 0.3], shift=-1.6, roughness=0, faces=["front"])
    arc_handle(F, "carry", (-6.0, 18.8, 0), (6.0, 18.8, 0), 6.0, 0.8, zinc, "steelp", n=6)
    F.loft("back", [((9.0, 17.0, 0), [2.2, 1.4]), ((12.4, 14.0, 0), [2.0, 1.4]), ((12.6, 8.0, 0), [2.0, 1.4]), ((9.0, 4.4, 0), [2.2, 1.4])],
           (0, 0, 0), sides=6, rnd=2.0, subdiv=1, col=zinc, style="steelp")
    F.clip("pour", 1.6, [{"part": p, "keys": [[0, [0, 0, 0]], [0.5, [0, 0, 20]], [1.0, [0, 0, 20]], [1.6, [0, 0, 0]]]}
                         for p in ("tank", "spout", "rose", "carry", "back")], role="gimmick")
    return F


FIGS = {"toolbox": f_toolbox, "jouro": f_jouro}
