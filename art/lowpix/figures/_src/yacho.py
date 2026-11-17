"""Garden Birds (庭の野鳥): the birds of the shrine woods and the garden, real models made small on their perches."""
from figlib import Fig, text_jp
from props import slab, log, leaf_card

S = "yacho"
SPARROW = "sketchfab:11b5b94688bc4ee380849585086da98a"   # Sparrow
QUAIL = "sketchfab:902dfc2a95a24e988c6a961c61a0c6b5"     # Realistic Common quail
CROW = "sketchfab:45a169ef98804f06a9b7a4af1a04d6f9"      # Crow
KINGFISHER = "sketchfab:eb654151f2d54b3a89169af96da09f89"  # White-throated Kingfisher (mounted)
OWL = "sketchfab:f54db6b8e26f427b9ba93ca993dc234a"       # Owl
BARNOWL = "sketchfab:0e65de5934db4f0eae02835ba7227dcc"   # Barn owl (CC0)
PHEASANT = "sketchfab:65d2444648ce4bd8850525de1b8bacee"  # Pheasant
GOLDEN = "sketchfab:f9b3decb485c4a7c9d97cf70b17cbd29"    # Golden Pheasant


def garden(F, w=30, d=24):
    top = slab(F, "base", w, d, 3.0, col="#4a4a3a", style="leafy", tone=2.6)
    return top


def branch(F, pid, at, length=28, r=1.6, rise=4, col="#5a4430"):
    F.loft(pid, [((-length / 2, 0, 0), r * 1.2), ((-length * 0.1, rise * 0.6, 1), r), ((length * 0.25, rise, -1), r * 0.85), ((length / 2, rise * 1.3, 0), r * 0.5)],
           at, sides=8, rnd=2.1, col=col, style="bark", tone=3.0)


def suzume():
    F = Fig(f"{S}/suzume", "Puffed-up Sparrow", "Fluffed into a ball against the winter wind, on the plum branch.")
    top = garden(F)
    F.cyl("post", 2.6, 12, (-9, top, -2), sides=10, col="#5a4430", style="bark")
    branch(F, "branch", (0, top + 12, -1), length=26, rise=3)
    for i, (x, y) in enumerate([(-6, 13.5), (6, 15.8)]):
        F.blob(f"bloom{i}", 2.4, 1.4, 2.4, (x, top + y + 1, 1), col="#f0b8c8", style="matte", tone=3.4, sides=10)
    F.model("bird", SPARROW, 8, (1, top + 13.6, -1), yaw=-20)
    F.model_clip("model_bird", "hop", 0.8, amp=1.2)
    return F


def uzura():
    F = Fig(f"{S}/uzura", "Quail in the Straw", "A round brown quail tucked in the rice straw, speckled like an egg.")
    top = slab(F, "base", 28, 24, 3.0, col="#b8a060", style="cloth", tone=3.2)
    F.layer("base", id="straw", op="stripes", axis="x", period=0.6, width=0.4, wobble=0.9, shift=0.8, faces=["up"])
    F.model("bird", QUAIL, 13, (0, top, 0), yaw=-30)
    F.model_clip("model_bird", "turn", 1.8, amp=25)
    return F


def karasu():
    F = Fig(f"{S}/karasu", "Crow with a Key", "It found something shiny. You will not be getting your key back.")
    top = slab(F, "base", 30, 24, 3.0, col="#4a4c52", style="stone", tone=2.8)
    F.box("bin", [14, 10, 10], (-4, top + 5, -3), ch=0.8, col="#3a6a8a", style="pvc", tone=3.0)
    F.box("net", [16, 0.6, 12], (-4, top + 10.3, -3), ch=0.2, col="#4a8a5a", style="matte", tone=3.0)
    F.layer("net", id="mesh", op="stripes", axis="x", period=1.0, width=0.3, shift=-1.2)
    F.model("bird", CROW, 14, (4, top + 10.6, -1), yaw=-60)
    F.box("key", [3.4, 0.4, 1.2], (8, top + 0.2, 6), ch=0.1, col="#d8b048", style="metal", tone=3.6, rot=(0, 30, 0))
    F.model_clip("model_bird", "nod", 1.4, amp=14)
    return F


def kawasemi():
    F = Fig(f"{S}/kawasemi", "Kingfisher", "A jewel of blue and orange on the river post. Gone before you can point.")
    top = slab(F, "base", 26, 24, 3.4, col="#3a3026", style="wood", tone=2.6)
    F.model("bird", KINGFISHER, 26, (0, top, 0), yaw=-20)
    return F


def fukuro():
    F = Fig(f"{S}/fukuro", "Horned Owl", "Two ear tufts, two orange eyes, all night long on the shrine cedar.")
    top = garden(F)
    lt = log(F, "log", 24, 5, (0, top, 0), yaw=10)
    F.model("bird", OWL, 20, (0, lt - 0.8, 0), yaw=-15)
    F.model_clip("model_bird", "turn", 2.6, amp=60)
    return F


def menfukuro():
    F = Fig(f"{S}/menfukuro", "Barn Owl", "A heart-shaped face as white as a moon, on a branch over the barley.")
    top = garden(F)
    F.model("bird", BARNOWL, 28, (0, top, 0), yaw=0)
    F.model_clip("model_bird", "turn", 2.6, amp=55)
    return F


def kiji():
    F = Fig(f"{S}/kiji", "Green Pheasant", "The bird on the old banknotes: emerald breast, red face, a tail like a brush stroke.")
    top = slab(F, "base", 38, 24, 3.0, col="#5a6a3a", style="leafy", tone=2.8)
    F.model("bird", PHEASANT, 15, (0, top, 0), yaw=-70)
    return F


def kinkei():
    F = Fig(f"{S}/kinkei", "Golden Pheasant", "Flame and gold in full flight. The emperor's garden bird, one in five hundred.")
    top = slab(F, "base", 34, 26, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.cyl("rod", 0.8, 12, (0, top, 0), sides=8, col="#cfe4ec", style="clear", tone=3.6)
    F.model("bird", GOLDEN, 22, (0, top + 10, 0), yaw=-30)
    F.model_clip("model_bird", "hop", 1.6, amp=2)
    return F


FIGS = {"suzume": suzume, "uzura": uzura, "karasu": karasu, "kawasemi": kawasemi, "fukuro": fukuro, "menfukuro": menfukuro, "kiji": kiji, "kinkei": kinkei}
