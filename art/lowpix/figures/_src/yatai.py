"""Summer Festival Stalls (夏祭りの屋台): the prizes and food of a summer festival, from hand-made models and
photogrammetry (Sketchfab CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. Food and stalls
stand on their own; a goldfish swims in its clear water bag; the mask hangs on a clear stand."""
from figlib import Fig
from props import clear_stand

S = "yatai"
RYUKIN = "sketchfab:df9a7c57c2b34d5a818f360e679b576a"    # Ryukin goldfish
ORANDA = "sketchfab:e530fd4c7f264088ad8dce405349f88e"    # Redcap Oranda goldfish
MASK = "sketchfab:cc027effc78844f6a3774ca0352a20f9"      # Kitsune Mask
TAKO = "sketchfab:df2871d10eca42b68b9347dbd97d498e"      # Takoyaki (1scanaday, photogrammetry)
TAIKO = "sketchfab:58ce63ddc7fa40abad42b7bb969f7a47"     # Taiko Drum
ICESTALL = "sketchfab:733c2f23e8154a5c9d3c8f0fda7ee2f6"  # Shaved Ice Stall


def water_bag(F, h=36.0, r=13.0):
    """The festival's clear plastic water bag, knotted at the top (the game's glass material)."""
    F.loft("bag", [((0, 0, 0), [r * 1.2, r * 1.2]), ((0, h * 0.2, 0), [r * 2.0, r * 2.0]), ((0, h * 0.55, 0), [r * 1.9, r * 1.9]),
                   ((0, h * 0.8, 0), [r * 0.9, r * 0.9]), ((0, h * 0.92, 0), [r * 0.35, r * 0.35]), ((0, h, 0), [r * 0.6, r * 0.6])],
           (0, 0, 0), sides=14, rnd=2.2, col="#cfe6ee", style="clear", tone=6.0, up=[0, 0, 1], mat="glass")
    F.loft("water", [((0, 0.6, 0), [r * 1.1, r * 1.1]), ((0, h * 0.2, 0), [r * 1.85, r * 1.85]), ((0, h * 0.5, 0), [r * 1.82, r * 1.82])],
           (0, 0, 0), sides=14, rnd=2.2, col="#9cc8d8", style="clear", tone=3.0, up=[0, 0, 1], mat="glass")
    return h * 0.18


def kingyo():
    F = Fig(f"{S}/kingyo", "Goldfish in a Bag", "Won at the scooping stall with the third paper net. Name: Kintaro.")
    y = water_bag(F)
    F.model("fish", RYUKIN, L=16, at=(0, y, 0), yaw=70)
    F.model_clip("model_fish", "wobble", 1.0, amp=10)
    return F


def omen():
    F = Fig(f"{S}/omen", "Fox Mask", "White fox with red marks, from the mask stall. Wear it on the side of your head, like everyone.")
    top = 4.0
    F.model("mask", MASK, h=34, L=30, at=(0, top, 0), yaw=0)
    clear_stand(F, 0, -3.0, top + 8.0, "a mask has nothing to stand on: it hangs on a clear stand")
    return F


def takoyaki():
    F = Fig(f"{S}/takoyaki", "Takoyaki Boat", "Hot octopus balls with sauce, mayo and dancing bonito flakes, in their paper boat. Burns your mouth every time.")
    F.model("food", TAKO, L=44, yaw=-20, level=True, smooth=2)
    return F


def taiko():
    F = Fig(f"{S}/taiko", "Festival Drum", "The big drum on its stand. You feel it in your chest before you hear it.")
    F.model("drum", TAIKO, h=40, L=36, yaw=-25)
    F.model_clip("model_drum", "wobble", 0.6, amp=3)
    return F


def stall():
    F = Fig(f"{S}/stall", "Shaved Ice Stall", "Flags flapping, syrups lined up, the ice shaver turning. Strawberry or melon?")
    F.model("stall", ICESTALL, h=44, L=44, yaw=-15)
    return F


def golden():
    F = Fig(f"{S}/golden", "Redcap Oranda", "The one nobody can scoop: a fat white oranda with a red cap, swimming in the lantern light.")
    top = 12.0
    F.model("fish", ORANDA, L=36, at=(0, top, 0), yaw=70)
    clear_stand(F, 0, 0, top + 0.5, "swimming: held up in the water on a clear rod")
    F.model_clip("model_fish", "wobble", 1.0, amp=10)
    return F


FIGS = {"kingyo": kingyo, "omen": omen, "takoyaki": takoyaki, "taiko": taiko, "stall": stall, "golden": golden}
