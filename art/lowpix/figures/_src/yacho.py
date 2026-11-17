"""Garden Birds (庭の野鳥): Japanese birds from museum specimen scans (RISD Nature Lab, the Virtual Museums of Małopolska)
and hand-made models (Sketchfab CC BY / CC0; credits in art/lowpix/figures/SOURCES.json), in the line's finish. They
stand on their own feet; a specimen mounted on its perch keeps the perch as part of the toy."""
from figlib import Fig

S = "yacho"
SPARROW = "sketchfab:11b5b94688bc4ee380849585086da98a"     # Sparrow
CROW = "sketchfab:45a169ef98804f06a9b7a4af1a04d6f9"        # Crow (zixisun51)
KINGFISHER = "sketchfab:eb654151f2d54b3a89169af96da09f89"  # White-throated Kingfisher (RISD Nature Lab scan)
OWL = "sketchfab:f54db6b8e26f427b9ba93ca993dc234a"         # Owl (Horton, scan)
PHEASANT = "sketchfab:65d2444648ce4bd8850525de1b8bacee"    # 190402 Pheasant (clementvalla1, scan)


def suzume():
    F = Fig(f"{S}/suzume", "Puffed-up Sparrow", "Fluffed into a ball against the cold, one eye on the rice you dropped.")
    F.model("bird", SPARROW, L=32, h=24, yaw=-20, smooth=2.0)
    F.model_clip("model_bird", "hop", 0.8, amp=1.2)
    return F


def karasu():
    F = Fig(f"{S}/karasu", "Lane Crow", "Glossy, clever and in no hurry. It knows which day the rubbish goes out.")
    F.model("bird", CROW, L=44, h=34, yaw=-60, mat="gloss", dark=True)
    F.model_clip("model_bird", "nod", 1.4, amp=14)
    return F


def kawasemi():
    F = Fig(f"{S}/kawasemi", "Kingfisher", "A jewel of blue and orange on its perch, gone in a flash of colour.")
    F.model("bird", KINGFISHER, h=38, L=34, yaw=-20, smooth=2)
    return F


def fukuro():
    F = Fig(f"{S}/fukuro", "Lucky Wooden Owl", "A hand-carved owl from the mountain inn: fukurou, no hardship. The grain makes the feathers.")
    F.model("bird", OWL, h=38, L=32, yaw=-15)
    F.model_clip("model_bird", "turn", 2.6, amp=60)
    return F


def kiji():
    F = Fig(f"{S}/kiji", "Green Pheasant", "The bird on the old banknotes: emerald breast, red face, a tail as long as itself.")
    F.model("bird", PHEASANT, L=48, h=36, yaw=-70, smooth=2.0, rest=12)
    return F


FIGS = {"suzume": suzume, "karasu": karasu, "kawasemi": kawasemi, "fukuro": fukuro, "kiji": kiji}
