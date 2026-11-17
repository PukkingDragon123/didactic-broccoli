"""Onsen Animals (ゆどのどうぶつ): animals at the hot spring, from hand-made models (Sketchfab CC BY) and Poly Haven CC0
models (credits in art/lowpix/figures/SOURCES.json) in the line's finish. Each sits in or beside its own wooden bath
pail, which is part of the toy, not a stand."""
from figlib import Fig

S = "yudono"
OTTER = "sketchfab:296da41f47534f98ae2d3b958d4c4f98"     # Otter
FROG = "sketchfab:81a49956c5944279abfb2ccaa791f7d8"      # Realistic Frog
DUCK = "polyhaven:rubber_duck_toy"                       # a rubber duck
PAIL = "polyhaven:wooden_bucket_01"                      # a wooden bath pail
TUB = "polyhaven:wooden_bucket_02"                       # a hooped wooden tub


def frog():
    F = Fig(f"{S}/frog", "Hinoki Tub Frog", "Up to its chin in the cypress tub, eyes half shut. Do not mention the cold plunge.")
    b = F.model("tub", TUB, L=34, h=24, yaw=-20)
    F.model("frog", FROG, L=20, at=(2, b.top - 3.0, 3), yaw=-30)
    return F


def otter():
    F = Fig(f"{S}/otter", "Otter on the Rocks", "Floating on its back by the hot spring rocks, a pebble on its tummy for later.")
    F.model("otter", OTTER, L=44, yaw=-30, level=True, cut=0.06)
    F.model_clip("model_otter", "wobble", 1.6, amp=5)
    return F


def duck():
    F = Fig(f"{S}/duck", "Bath Duck", "The rubber duck of the bath house, sat on the pail it lives in. Squeak once for luck.")
    b = F.model("pail", PAIL, L=30, h=22, yaw=0)
    F.model("duck", DUCK, L=20, at=(0, b.top - 0.5, 0), yaw=-25, mat="gloss")
    F.model_clip("model_duck", "wobble", 1.2, amp=8)
    return F


FIGS = {"frog": frog, "otter": otter, "duck": duck}
