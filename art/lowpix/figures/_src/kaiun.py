"""Lucky Charms (開運招福): the lucky things of a Japanese shrine and shop, real models made small on lacquer stands."""
from figlib import Fig
from props import slab

S = "kaiun"
MANEKI = "sketchfab:170f632b9b294fdabc660ba91894c10a"    # Maneki neko
GOLDNEKO = "sketchfab:9c1cd4d051bc419b8ce121f9cd2730ff"  # Maneki-neko (gold)
DARUMA = "sketchfab:2eea678d5ade4c4a9f8b55f5872af92c"    # Daruma
TORII = "sketchfab:e12d2fa1b2b94928b8b87cb7787e2462"     # Japanese Torii gate
FOXSTONE = "sketchfab:b51e4bb527d749c38bfb6f964b2b9ead"  # Kitsune Fox Shrine Statue
FOXBIB = "sketchfab:af9a74ebe6ee4e23b0c2b41d82a958a7"    # Kitsune statue (red bib)
LANTERN = "sketchfab:2c94940fb10a4b3899f19eb0f07b79db"   # Stone Lantern
KOI = "sketchfab:3e1b80c3653f43349252aab3b4fb1d86"       # Koi Fish


def stand(F, w=24, d=22, col="#3a1c18"):
    return slab(F, "base", w, d, 3.6, col=col, style="glaze", tone=2.4)


def gravel(F, w=30, d=24):
    top = slab(F, "base", w, d, 3.0, col="#b8b4a8", style="stone", tone=3.4)
    F.layer("base", id="raked", op="stripes", axis="z", period=1.2, width=0.4, wobble=0.15, shift=-0.6, faces=["up"])
    return top


def maneki():
    F = Fig(f"{S}/maneki", "Beckoning Cat", "Left paw up for customers, a gold koban coin in the other. Every shop needs one.")
    top = stand(F)
    F.box("cushion", [16, 2.2, 14], (0, top + 1.1, 0), ch=0.8, col="#8a1e28", style="velvet", tone=3.0)
    F.model("m", MANEKI, 20, (0, top + 2.2, 0), yaw=-10, mat="gloss")
    F.model_clip("model_m", "nod", 1.2, amp=8)
    return F


def daruma():
    F = Fig(f"{S}/daruma", "Daruma", "Paint one eye when you make the wish, the other when it comes true. He never falls over.")
    top = stand(F)
    F.model("m", DARUMA, 18, (0, top, 0), yaw=-10, mat="gloss")
    F.model_clip("model_m", "wobble", 1.6, amp=14)
    return F


def torii():
    F = Fig(f"{S}/torii", "Vermilion Torii", "The gate between the street and the shrine. Bow once on the way through.")
    top = gravel(F, 32, 22)
    F.model("m", TORII, 30, (0, top, 0), yaw=-10)
    return F


def toro():
    F = Fig(f"{S}/toro", "Stone Lantern", "Moss on the roof, a candle inside on festival nights.")
    top = gravel(F, 24, 22)
    F.model("m", LANTERN, 30, (0, top, 0), yaw=-15)
    return F


def koi():
    F = Fig(f"{S}/koi", "Lucky Koi", "A red-and-white carp from the shrine pond. Climb the waterfall, become a dragon.")
    top = slab(F, "base", 30, 22, 3.0, col="#3a4a4a", style="rock", tone=2.6)
    F.box("pond", [26, 0.6, 18], (0, top + 0.3, 0), ch=0.3, col="#3a6a7a", style="clear", tone=3.0)
    F.cyl("rod", 0.7, 6, (0, top, 0), sides=8, col="#cfe4ec", style="clear", tone=3.6)
    F.model("m", KOI, 20, (0, top + 5, 0), yaw=70, pitch=-6)
    F.model_clip("model_m", "wobble", 1.4, amp=6)
    return F


def kitsune():
    F = Fig(f"{S}/kitsune", "Inari Fox", "The shrine fox in her red bib, a scroll key in her mouth. Leave her an inari-zushi.")
    top = gravel(F, 26, 24)
    F.model("m", FOXBIB, 30, (0, top, 0), yaw=-10)
    return F


def jinja():
    F = Fig(f"{S}/jinja", "Fox Gate at Dusk", "Two stone foxes, a torii and a lantern: a whole little shrine under a red sky.")
    top = gravel(F, 40, 28)
    F.model("gate", TORII, 26, (0, top, -5), yaw=0, tris=2200)
    F.model("fox1", FOXSTONE, 14, (-12, top, 6), yaw=30, tris=2200)
    F.model("fox2", FOXSTONE, 14, (12, top, 6), yaw=-30, tris=2200)
    F.model("lamp", LANTERN, 16, (0, top, 8), yaw=0, tris=2200)
    return F


def goldneko():
    F = Fig(f"{S}/goldneko", "Golden Beckoning Cat", "Solid-looking gold, both paws raised: customers AND money. Very greedy, very lucky.")
    top = stand(F, col="#2a1410")
    F.box("cushion", [16, 2.2, 14], (0, top + 1.1, 0), ch=0.8, col="#a81e28", style="velvet", tone=3.0)
    F.model("m", GOLDNEKO, 22, (0, top + 2.2, 0), yaw=-10, mat="metal")
    F.model_clip("model_m", "nod", 1.2, amp=8)
    return F


FIGS = {"maneki": maneki, "daruma": daruma, "torii": torii, "toro": toro, "koi": koi, "kitsune": kitsune, "jinja": jinja, "goldneko": goldneko}
