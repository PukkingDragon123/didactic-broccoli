"""Deep Sea Mysteries (深海のなかまたち): creatures of the deep from museum scans (RISD Nature Lab, the Digital Atlas of
Ancient Life) and hand-made models (Sketchfab CC BY / CC0; credits in art/lowpix/figures/SOURCES.json), in the
line's finish. The isopod and the nautilus shell rest on the sea floor of your shelf; what swims rides a clear rod."""
from figlib import Fig
from props import clear_stand

S = "shinkai"
ISOPOD = "sketchfab:46469c568b3743ec8fb4bb711949d49a"    # Giant Isopod (RISD Nature Lab scan)
DUMBO = "sketchfab:977d38f89ca54c8b91b9667d52cb3d79"     # Flapjack Dumbo Octopus (andrearosini)
JELLY = "sketchfab:fb53480e510c40a7bd5e12e0b182621e"     # moon jellyfish (foxcc007)
NAUTILUS = "sketchfab:9b4acc4a177c41e984a0199c6fdcf90e"  # Nautilus Shell (RISD Nature Lab scan)
ANGLER = "sketchfab:5e2f4b2d2e1a4613a008b6caaf40d50c"    # Anglerfish (Abby_Holzworth1)
GOBLIN = "sketchfab:778fd6dec71442a2abd468477ecc3a17"    # Goblin Shark (canyutsai1)
COELA = "sketchfab:2400195832b64f698096ed0fdac85d51"     # Coelacanth (TimFallas)


def swim(F, name, src, w, d, h, top, yaw, **kw):
    F.model(name, src, w=w, d=d, h=h, at=(0, top, 0), yaw=yaw, **kw)
    clear_stand(F, 0, 0, top + 0.5, "swimming: held up in the water on a clear rod")


def isopod():
    F = Fig(f"{S}/isopod", "Giant Isopod", "A woodlouse the size of a shoe, armoured and patient, from two thousand metres down.")
    F.model("bug", ISOPOD, w=44, d=30, yaw=-30, level=True)
    F.model_clip("model_bug", "turn", 2.2, amp=18)
    return F


def dumbo():
    F = Fig(f"{S}/dumbo", "Dumbo Octopus", "Flaps its ear-fins and drifts through the dark like a lost umbrella.")
    swim(F, "octo", DUMBO, 34, 30, 26, 14.0, -20)
    F.model_clip("model_octo", "hop", 2.0, amp=2.5)
    return F


def jelly():
    F = Fig(f"{S}/jelly", "Moon Jelly", "Four pale rings in a bell of glass, pulsing slowly up through the dark.")
    swim(F, "jelly", JELLY, 30, 30, 34, 12.0, 0)
    F.model_clip("model_jelly", "hop", 1.8, amp=2)
    return F


def nautilus():
    F = Fig(f"{S}/nautilus", "Chambered Nautilus", "Striped like a tiger, built in perfect rooms. It has not changed in five hundred million years.")
    F.model("naut", NAUTILUS, w=40, d=30, h=34, yaw=30, level=True)
    F.model_clip("model_naut", "turn", 2.4, amp=25)
    return F


def angler():
    F = Fig(f"{S}/angler", "Lantern Anglerfish", "All teeth and a lamp on a stalk. Do not follow the light.")
    swim(F, "fish", ANGLER, 40, 28, 26, 12.0, -35)
    F.model_clip("model_fish", "wobble", 1.6, amp=6)
    return F


def goblin():
    F = Fig(f"{S}/goblin", "Goblin Shark", "A long flat snout and jaws that shoot forward. Pink, sleepy and very, very old.")
    swim(F, "shark", GOBLIN, 46, 20, 20, 12.0, 90)
    F.model_clip("model_shark", "slide", 1.2, amp=2, axis="x")
    return F


def coela():
    F = Fig(f"{S}/coela", "Living Fossil Coelacanth", "Steel-blue, white-flecked, with fins like little legs. Thought gone with the dinosaurs, until a fisherman pulled one up.")
    swim(F, "fish", COELA, 46, 22, 24, 12.0, 80)
    F.model_clip("model_fish", "turn", 2.4, amp=25)
    return F


FIGS = {"isopod": isopod, "dumbo": dumbo, "jelly": jelly, "nautilus": nautilus, "angler": angler, "goblin": goblin, "coela": coela}
