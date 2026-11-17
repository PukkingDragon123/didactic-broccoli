"""Deep Sea Mysteries (深海ミステリー): the strange animals of the deep, real models made small on the dark sea floor,
the swimmers held up on clear acrylic rods like museum models, each with its depth plate."""
from figlib import Fig, text3, text_jp, GOLD
from props import slab

S = "shinkai"
ISOPOD = "sketchfab:46469c568b3743ec8fb4bb711949d49a"    # Giant Isopod (Nature Lab)
DUMBO = "sketchfab:977d38f89ca54c8b91b9667d52cb3d79"     # Flapjack Dumbo Octopus
JELLY = "sketchfab:d9262b63d7e042c0a455dc5d84cda1f9"     # Jellyfish
NAUTILUS = "sketchfab:e5b5085369674ed28354d2a08f027d91"  # Nautilus
ANGLER = "sketchfab:6ee4e67640794f7b8cecd10295ab2f55"    # Deep Sea Fish (anglerfish)
GOBLIN = "sketchfab:2b7eba3fc9aa4cdc8f62d5c2c20c6419"    # Animated Frilled Shark
OARFISH = "sketchfab:7a60a4df5af940e58ff1f300609e7ee2"   # Oarfish
COELA = "sketchfab:2400195832b64f698096ed0fdac85d51"     # Coelacanth


def seafloor(F, w=32, d=24, depth="1000M", name=None):
    top = slab(F, "base", w, d, 3.4, col="#2e3440", style="stone", tone=2.4)
    F.layer("base", id="silt", op="noise", scale=1.0, amount=0.5, faces=["up"])
    F.layer("base", id="snow", op="speckle", density=0.05, shift=1.2, faces=["up"])
    F.box("plate", [11, 3.2, 0.5], (0, 1.7, d / 2 + 0.2), ch=0.15, col="#c8a04a", style="metal", tone=3.4)
    art = text3("DEPTH " + depth)
    F.stamp("plate", art, {"#": "ink:1"}, "front", at="center")
    return top


def rod(F, h, at, pid="rod"):
    """A clear acrylic display rod."""
    F.cyl(pid, 0.8, h, at, sides=8, col="#cfe4ec", style="clear", tone=3.6)


def isopod():
    F = Fig(f"{S}/isopod", "Giant Isopod", "Fourteen legs, armour plates, and it has not eaten since the spring. It is fine.")
    top = seafloor(F, depth="800M")
    F.model("bug", ISOPOD, 9, (0, top, 0), yaw=-30)
    F.model_clip("model_bug", "turn", 2.2, amp=18)
    return F


def dumbo():
    F = Fig(f"{S}/dumbo", "Dumbo Octopus", "Flaps its ear-fins and drifts. The softest thing in the deep.")
    top = seafloor(F, 26, 22, depth="3000M")
    rod(F, 12, (0, top, 0))
    F.model("octo", DUMBO, 13, (0, top + 11, 0), yaw=-20)
    F.model_clip("model_octo", "hop", 2.0, amp=2.5)
    return F


def jelly():
    F = Fig(f"{S}/jelly", "Moon Jelly", "A see-through bell with four rings inside, pulsing in the dark.")
    top = seafloor(F, 26, 22, depth="200M")
    rod(F, 10, (0, top, 0))
    F.model("jelly", JELLY, 24, (0, top + 9, 0), yaw=0, mat="glass")
    F.model_clip("model_jelly", "hop", 1.8, amp=2)
    return F


def nautilus():
    F = Fig(f"{S}/nautilus", "Chambered Nautilus", "A living fossil in a striped shell, steering with ninety tentacles.")
    top = seafloor(F, depth="600M")
    rod(F, 9, (0, top, 0))
    F.model("naut", NAUTILUS, 14, (0, top + 8, 0), yaw=30)
    F.model_clip("model_naut", "turn", 2.4, amp=25)
    return F


def angler():
    F = Fig(f"{S}/angler", "Lantern Anglerfish", "Teeth like needles and a little light on a stick. Do not follow the light.")
    top = seafloor(F, depth="1500M")
    rod(F, 8, (0, top, 0))
    F.model("fish", ANGLER, 15, (0, top + 7, 0), yaw=-35)
    F.model_clip("model_fish", "wobble", 1.6, amp=6)
    return F


def goblin():
    F = Fig(f"{S}/goblin", "Frilled Shark", "Three hundred needle teeth and six frilly gills: an eel-shaped shark unchanged since the dinosaurs.")
    top = seafloor(F, 38, 22, depth="1300M")
    rod(F, 9, (0, top, 0))
    F.model("shark", GOBLIN, 12, (0, top + 8, 0), yaw=90)
    F.model_clip("model_shark", "slide", 1.2, amp=2, axis="x")
    return F


def oarfish():
    F = Fig(f"{S}/oarfish", "Oarfish", "The longest bony fish in the sea, a silver ribbon with a red crest. Omen of earthquakes.")
    top = seafloor(F, 42, 20, depth="500M")
    rod(F, 10, (-8, top, 0), "rod")
    rod(F, 10, (8, top, 0), "rod2")
    F.model("fish", OARFISH, 30, (0, top + 9, 0), yaw=90, fill=0.95)
    return F


def coela():
    F = Fig(f"{S}/coela", "Golden Coelacanth", "The fish that outlived the dinosaurs, cast in gold for the museum's hundredth year.")
    top = seafloor(F, 36, 22, depth="400M")
    rod(F, 9, (0, top, 0))
    F.model("fish", COELA, 14, (0, top + 8, 0), yaw=80, mat="metal", recolor=GOLD)
    F.model_clip("model_fish", "turn", 2.4, amp=25)
    return F


FIGS = {"isopod": isopod, "dumbo": dumbo, "jelly": jelly, "nautilus": nautilus, "angler": angler, "goblin": goblin, "oarfish": oarfish, "coela": coela}
