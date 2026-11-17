"""Summer Festival Stalls (夏祭り屋台): the treats, games and masks of a summer festival night, real models made small."""
from figlib import Fig, text_jp, GOLD
from props import slab

S = "yatai"
RYUKIN = "sketchfab:df9a7c57c2b34d5a818f360e679b576a"    # Ryukin goldfish
ORANDA = "sketchfab:e530fd4c7f264088ad8dce405349f88e"    # Redcap Oranda goldfish
MASK = "sketchfab:cc027effc78844f6a3774ca0352a20f9"      # Kitsune Mask
TAKO = "sketchfab:df2871d10eca42b68b9347dbd97d498e"      # Takoyaki (photogrammetry)
TAIKO = "sketchfab:58ce63ddc7fa40abad42b7bb969f7a47"     # Taiko Drum
ICESTALL = "sketchfab:733c2f23e8154a5c9d3c8f0fda7ee2f6"  # Shaved Ice Stall
TAKOCART = "sketchfab:7b32f2b277e24186a78f3d04b5800b33"  # Takoyaki cart


def grounds(F, w=28, d=24):
    top = slab(F, "base", w, d, 3.0, col="#6a5a44", style="stone", tone=2.8)
    F.layer("base", id="gravel", op="speckle", density=0.12, shift=0.8, faces=["up"])
    return top


def bag(F, pid, at, r=6, h=12):
    """A festival goldfish bag: clear plastic, water to the knot, a red string."""
    F.loft(pid, [((0, 0, 0), r * 1.5), ((0, h * 0.35, 0), r * 2), ((0, h * 0.7, 0), r * 1.7), ((0, h * 0.92, 0), r * 0.5), ((0, h, 0), r * 0.25)], at,
           sides=12, rnd=2.0, col="#d8eef0", style="clear", tone=3.6, up=[0, 0, 1])
    F.loft(pid + "_str", [((0, 0, 0), 0.5), ((1.5, 3, 0), 0.4), ((0, 6, 0), 0.4)], (at[0], at[1] + h, at[2]), sides=6, rnd=2, col="#c83a3a", style="matte", up=[0, 0, 1])


def kingyo():
    F = Fig(f"{S}/kingyo", "Goldfish in a Bag", "Won at the scooping stall with the third paper net. Name: Kintaro.")
    top = grounds(F, 24, 22)
    bag(F, "bag", (0, top, 0))
    F.model("fish", RYUKIN, 6, (0, top + 4, 0), yaw=70)
    F.model_clip("model_fish", "wobble", 1.0, amp=10)
    return F


def omen():
    F = Fig(f"{S}/omen", "Fox Mask", "White fox with red marks, from the mask stall. Wear it on the side of your head, like everyone.")
    top = grounds(F, 24, 22)
    F.box("pole", [1.4, 26, 1.4], (0, top + 13, -4), ch=0.3, col="#c8a870", style="wood")
    F.model("mask", MASK, 14, (0, top + 9, -2.4), yaw=0)
    return F


def takoyaki():
    F = Fig(f"{S}/takoyaki", "Takoyaki Boat", "Eight hot octopus balls with sauce, mayo and dancing bonito flakes. Burns every time.")
    top = grounds(F)
    F.model("food", TAKO, 7, (0, top, 0), yaw=-20)
    return F


def wataame():
    F = Fig(f"{S}/wataame", "Cotton Candy", "A pink cloud on a stick, in a bag with a hero printed on it.")
    top = grounds(F, 22, 22)
    F.loft("stick", [((0, 0, 0), 0.7), ((0, 14, 0), 0.6)], (0, top, 0), sides=6, rnd=2, col="#e8dcc0", style="wood", up=[0, 0, 1])
    F.blob("cloud", 13, 13, 12, (0, top + 11, 0), col="#f0b0c8", style="food", tone=3.6, sides=14, rnd=2.1, bottom=0.5, top=0.5)
    F.layer("cloud", id="fluff", op="noise", scale=0.6, amount=0.6)
    F.layer("cloud", id="strands", op="speckle", density=0.25, shift=0.9)
    F.model_clip("model_none", "hop", 1.0)
    F.meta.pop("model_clip", None)
    F.meta["clips"].pop("gimmick", None)
    return F


def yoyo():
    F = Fig(f"{S}/yoyo", "Water Yo-yo Balloon", "A water balloon on a rubber band. Thwack, thwack, splash.")
    top = grounds(F, 22, 22)
    F.blob("balloon", 10, 10, 10, (0, top + 6, 0), col="#3a8ac8", style="pvc", tone=3.2, sides=14, rnd=2.0, bottom=0.6, top=0.4)
    F.layer("balloon", id="swirl", op="stripes", axis="around", period=0.25, width=0.25, wobble=0.4, ramp=F.c("#f0d050"), tone=3.6)
    F.loft("band", [((0, 0, 0), 0.4), ((1, 6, 0), 0.4), ((0, 12, 0), 0.4)], (0, top + 16, 0), sides=6, rnd=2, col="#e8e0d0", style="matte", up=[0, 0, 1])
    F.box("water", [14, 0.5, 10], (0, top + 0.25, 3), ch=0.2, col="#5aa8c8", style="clear", tone=3.4)
    return F


def taiko():
    F = Fig(f"{S}/taiko", "Festival Drum", "The big drum on the yagura stand. You feel it in your chest before you hear it.")
    top = grounds(F, 28, 26)
    F.model("drum", TAIKO, 22, (0, top, 0), yaw=-25)
    F.model_clip("model_drum", "wobble", 0.6, amp=3)
    return F


def stall():
    F = Fig(f"{S}/stall", "Shaved Ice Stall", "Flags flapping, syrups lined up, the ice shaver turning. Strawberry or melon?")
    top = grounds(F, 34, 28)
    F.model("stall", ICESTALL, 30, (0, top, 0), yaw=-15)
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Lucky Goldfish", "The one nobody can scoop: a golden oranda with a red cap. Lucky all year.")
    top = slab(F, "base", 24, 22, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    bag(F, "bag", (0, top, 0))
    F.model("fish", ORANDA, 7, (0, top + 4, 0), yaw=70, mat="metal", recolor=GOLD)
    F.model_clip("model_fish", "wobble", 1.0, amp=10)
    return F


FIGS = {"kingyo": kingyo, "omen": omen, "takoyaki": takoyaki, "wataame": wataame, "yoyo": yoyo, "taiko": taiko, "stall": stall, "golden": golden}
