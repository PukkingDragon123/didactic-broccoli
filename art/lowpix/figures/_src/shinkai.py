"""Deep Sea Mysteries (深海のなかまたち): creatures of the deep from hand-made models (Sketchfab CC BY / CC0; credits in art/lowpix/figures/SOURCES.json), in the
line's finish. What swims rides a clear rod. (Scanned specimens removed: never scans.)"""
from figlib import Fig
from props import clear_stand

S = "shinkai"
DUMBO = "sketchfab:977d38f89ca54c8b91b9667d52cb3d79"     # Flapjack Dumbo Octopus (andrearosini)
JELLY = "sketchfab:fb53480e510c40a7bd5e12e0b182621e"     # moon jellyfish (foxcc007)
ANGLER = "sketchfab:5e2f4b2d2e1a4613a008b6caaf40d50c"    # Anglerfish (Abby_Holzworth1)
COELA = "sketchfab:2400195832b64f698096ed0fdac85d51"     # Coelacanth (TimFallas)


def swim(F, name, src, L, h, top, yaw, **kw):
    F.model(name, src, L=L, h=h, at=(0, top, 0), yaw=yaw, **kw)
    clear_stand(F, 0, 0, top + 0.5, "swimming: held up in the water on a clear rod")


def dumbo():
    F = Fig(f"{S}/dumbo", "Dumbo Octopus", "Flaps its ear-fins and drifts through the dark like a lost umbrella.")
    swim(F, "octo", DUMBO, 34, 26, 14.0, -20, smooth=2.0)
    F.model_clip("model_octo", "hop", 2.0, amp=2.5)
    return F


def jelly():
    F = Fig(f"{S}/jelly", "Moon Jelly", "Four pale rings in a bell of glass, pulsing slowly up through the dark.")
    swim(F, "jelly", JELLY, 30, 34, 12.0, 0)
    F.model_clip("model_jelly", "hop", 1.8, amp=2)
    return F


def angler():
    F = Fig(f"{S}/angler", "Lantern Anglerfish", "All teeth and a lamp on a stalk. Do not follow the light.")
    swim(F, "fish", ANGLER, 40, 26, 12.0, -35, smooth=2.0)
    F.model_clip("model_fish", "wobble", 1.6, amp=6)
    return F


def coela():
    F = Fig(f"{S}/coela", "Living Fossil Coelacanth", "Steel-blue, white-flecked, with fins like little legs. Thought gone with the dinosaurs, until a fisherman pulled one up.")
    swim(F, "fish", COELA, 48, 24, 12.0, 80, smooth=2.0)
    F.model_clip("model_fish", "turn", 2.4, amp=25)
    return F


FIGS = {"dumbo": dumbo, "jelly": jelly}
