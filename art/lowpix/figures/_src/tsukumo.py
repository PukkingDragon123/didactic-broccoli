"""Tsukumogami Parade (付喪神パレード): old household things that came alive after a hundred years. Real object models
made small, each opened up by one big tampo-printed eye and a lolling tongue, on a moonlit stepping stone."""
from figlib import Fig, GOLD
from props import slab, eye_card, tongue_card, aura

S = "tsukumo"
LANTERN = "sketchfab:99a3c92192d04d088c9241d1cab3e765"   # Japanese paper lantern
LANTERN2 = "sketchfab:6fd5dcdb4702409a8be04e5f0fb2c316"  # Chochin with a crest
UMBRELLA = "sketchfab:3da333ade95d47919ece6934f84cdccb"  # Japanese Umbrella
GETA = "sketchfab:f9785f6152484a44bbd73508655a9741"      # Japanese Geta
KETTLE = "sketchfab:252c28595d3c45fb87095faf71466113"    # Japanese teapot (cast iron)
BROOM = "sketchfab:0b049255562349ad8072afb9c33acfea"     # Outdoor broom


def night(F, w=26, d=24):
    top = slab(F, "base", w, d, 3.0, col="#2a2e3a", style="rock", tone=2.4)
    F.blob("stone", w * 0.7, 2.0, d * 0.6, (0, top, 0), col="#5a5a60", style="rock", tone=3.0, sides=12, rnd=2.2)
    return top + 1.8


def chochin():
    F = Fig(f"{S}/chochin", "Lantern Ghost", "The soba shop's paper lantern split along a rib and stuck its tongue out.")
    top = night(F)
    F.model("m", LANTERN, 24, (0, top, 0), yaw=-10)
    eye_card(F, "eye", 6, (0.5, top + 15, 5.4))
    tongue_card(F, "tongue", 3.4, (0, top + 7.5, 5.6), rot=(-20, 0, 0))
    F.model_clip("model_m", "hop", 1.0, amp=3)
    return F


def kasa():
    F = Fig(f"{S}/kasa", "Umbrella Ghost", "A paper umbrella with one eye, one leg, and a lot to say about the rain.")
    top = night(F)
    F.model("m", UMBRELLA, 26, (0, top, 0), yaw=0, pitch=-8)
    eye_card(F, "eye", 6, (0, top + 17, 6.0))
    tongue_card(F, "tongue", 3.0, (0, top + 12, 6.4), rot=(-30, 0, 0))
    F.model_clip("model_m", "hop", 0.8, amp=3)
    return F


def geta():
    F = Fig(f"{S}/geta", "Hopping Geta", "One wooden clog that hops along the stepping stones by itself. Clack. Clack.")
    top = night(F)
    F.model("m", GETA, 6, (0, top, 0), yaw=-30)
    eye_card(F, "eye", 4.5, (1.5, top + 6.5, 3.0), rot=(-10, -30, 0))
    F.model_clip("model_m", "hop", 0.7, amp=4)
    return F


def kettle():
    F = Fig(f"{S}/kettle", "Iron Kettle Spirit", "A cast-iron kettle that hums to itself and steams when it is cross.")
    top = night(F)
    F.model("m", KETTLE, 14, (0, top, 0), yaw=-20, mat="metal")
    eye_card(F, "eye", 5, (0, top + 8, 7.0))
    F.model_clip("model_m", "wobble", 1.0, amp=8)
    return F


def broom():
    F = Fig(f"{S}/broom", "Broom Spirit", "The temple broom that sweeps the path at night. It leaves the leaves in the shape of a face.")
    top = night(F)
    F.model("m", BROOM, 34, (0, top, 0), yaw=0)
    eye_card(F, "eye", 5, (0, top + 9, 3.6))
    F.model_clip("model_m", "wobble", 1.2, amp=10)
    return F


def mon():
    F = Fig(f"{S}/mon", "Crest Lantern", "The shrine lantern with the swirling crest. Its eye only opens at the festival.")
    top = night(F)
    F.model("m", LANTERN2, 24, (0, top, 0), yaw=0)
    eye_card(F, "eye", 7, (0, top + 12, 6.4), iris="#3a8ac8")
    tongue_card(F, "tongue", 3.6, (0, top + 5, 6.4), rot=(-20, 0, 0))
    F.model_clip("model_m", "hop", 1.0, amp=3)
    return F


def parade():
    F = Fig(f"{S}/parade", "Night Parade", "Lantern, umbrella and clog marching under the moon. Do not join in.")
    top = slab(F, "base", 40, 26, 3.0, col="#2a2e3a", style="rock", tone=2.4)
    F.model("lan", LANTERN, 18, (-11, top, -2), yaw=20)
    F.model("um", UMBRELLA, 20, (2, top, -4), yaw=0)
    F.model("geta", GETA, 5, (13, top, 4), yaw=-40)
    eye_card(F, "eye1", 4.5, (-10.6, top + 11, 2.2), rot=(0, 20, 0))
    eye_card(F, "eye2", 4.5, (2, top + 13, 1.2))
    eye_card(F, "eye3", 3.5, (14, top + 5, 6.4), rot=(0, -40, 0))
    aura(F, "wisp", 30, 16, (0, top + 12, -10), col="#5ab8c8", seed=4)
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Kettle", "A hundred-year kettle that turned to gold instead of to mischief. Lucky for someone.")
    top = slab(F, "base", 24, 22, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.model("m", KETTLE, 14, (0, top, 0), yaw=-20, mat="metal", recolor=GOLD)
    eye_card(F, "eye", 5, (0, top + 8, 7.0), iris="#c8a030")
    F.model_clip("model_m", "turn", 2.0, amp=30)
    return F


FIGS = {"chochin": chochin, "kasa": kasa, "geta": geta, "kettle": kettle, "broom": broom, "mon": mon, "parade": parade, "golden": golden}
