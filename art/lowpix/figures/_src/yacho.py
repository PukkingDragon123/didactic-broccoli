"""Garden Birds (庭の野鳥): Japanese birds from hand-made models (Sketchfab CC BY / CC0; credits in art/lowpix/figures/SOURCES.json), in the line's finish. They
stand on their own feet. (Retired line; scanned specimens removed: owner rule, never scans.)"""
from figlib import Fig

S = "yacho"
SPARROW = "sketchfab:11b5b94688bc4ee380849585086da98a"     # Sparrow
CROW = "sketchfab:45a169ef98804f06a9b7a4af1a04d6f9"        # Crow (zixisun51)


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


FIGS = {"suzume": suzume}
