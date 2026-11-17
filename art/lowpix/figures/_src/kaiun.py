"""Lucky Charms (開運コレクション): the good-luck things of a Japanese shrine and shop, from hand-made models and scans
(Sketchfab CC BY; credits in art/lowpix/figures/SOURCES.json), in the line's finish. Each stands on its own base or
body; the koi swims on a clear rod."""
from figlib import Fig
from props import clear_stand

S = "kaiun"
MANEKI = "sketchfab:170f632b9b294fdabc660ba91894c10a"    # Maneki neko (Ramzus)
DARUMA = "sketchfab:2eea678d5ade4c4a9f8b55f5872af92c"    # Daruma (e6life)
TORII = "sketchfab:e12d2fa1b2b94928b8b87cb7787e2462"     # Japanese Torii gate (Bazylonator)
LANTERN = "sketchfab:2c94940fb10a4b3899f19eb0f07b79db"   # Hakone Gardens Stone Lantern (lord.xiphos)
KOI = "sketchfab:3e1b80c3653f43349252aab3b4fb1d86"       # Koi Fish (sdpm)
FOX = "sketchfab:af9a74ebe6ee4e23b0c2b41d82a958a7"       # Kitsune statue in Nagoya (fusion, scan)


def maneki():
    F = Fig(f"{S}/maneki", "Beckoning Cat", "Left paw up for customers, a gold koban coin in the other. Every shop needs one.")
    F.model("m", MANEKI, h=36, w=28, d=26, yaw=-10, mat="gloss")
    F.model_clip("model_m", "nod", 1.2, amp=8)
    return F


def daruma():
    F = Fig(f"{S}/daruma", "Daruma", "Paint one eye when you make the wish, the other when it comes true. He never falls over.")
    F.model("m", DARUMA, h=34, w=30, d=30, yaw=-10, mat="gloss")
    F.model_clip("model_m", "wobble", 1.6, amp=14)
    return F


def torii():
    F = Fig(f"{S}/torii", "Vermilion Torii", "The gate between the street and the shrine. Bow once on the way through.")
    F.model("m", TORII, w=44, h=40, d=16, yaw=-10)
    return F


def toro():
    F = Fig(f"{S}/toro", "Stone Lantern", "Moss on the roof, a candle inside on festival nights.")
    F.model("m", LANTERN, h=44, w=28, d=28, yaw=-15)
    return F


def koi():
    F = Fig(f"{S}/koi", "Lucky Koi", "A red-and-white carp from the shrine pond. Climb the waterfall, become a dragon.")
    top = 12.0
    F.model("m", KOI, w=44, d=24, h=18, at=(0, top, 0), yaw=70, pitch=-6)
    clear_stand(F, 0, 0, top + 0.5, "swimming: held up in the pond on a clear rod")
    F.model_clip("model_m", "wobble", 1.4, amp=6)
    return F


def kitsune():
    F = Fig(f"{S}/kitsune", "Inari Fox", "The shrine fox in her red bib, a scroll key in her mouth, on her stone plinth. Leave her an inari-zushi.")
    F.model("m", FOX, h=46, w=26, d=26, yaw=-10, level=True)
    return F


FIGS = {"maneki": maneki, "daruma": daruma, "torii": torii, "toro": toro, "koi": koi, "kitsune": kitsune}
