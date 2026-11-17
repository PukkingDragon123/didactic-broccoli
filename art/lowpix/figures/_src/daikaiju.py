"""Kaiju Diorama (大怪獣): giant monsters as vinyl-figure-style minis, from hand-made models (Sketchfab CC BY; credits
in art/lowpix/figures/SOURCES.json) in the line's finish, standing on their own feet. Original names only."""
from figlib import Fig

S = "daikaiju"
TREX = "sketchfab:6465a297fa784598adc49f6e0042d449"      # Tyrant King - Tyrannosaurus
SAURO = "sketchfab:0a43eeb601264d728fb5848ee62482b5"     # Dinosaur (long neck)
CRAB = "sketchfab:6295676291c141728457ef7550b0650a"      # Giant Crab
TURTLE = "sketchfab:f8fbbd4a2f05416288e4f7836ec61a11"    # Turtle Kaiju
TOAD = "sketchfab:3cc5fe7b9ee34d448b16e04985a0cdf2"      # Kaiju : Toad


def gyaosaur():
    F = Fig(f"{S}/gyaosaur", "Gyaosaur", "Up from the bay at midnight, roaring at the lighthouse. The lighthouse lost.")
    F.model("m", TREX, L=48, h=40, yaw=-40, level=True, cut=0.04, ramps=12)
    F.model_clip("model_m", "nod", 1.6, amp=10)
    return F


def kanigon():
    F = Fig(f"{S}/kanigon", "Kanigon", "A crab the size of a ferry, one claw bigger than the other, walking sideways through the harbour.")
    F.model("m", CRAB, L=48, yaw=-20, level=True, cut=0.06)
    F.model_clip("model_m", "slide", 1.4, amp=3, axis="x")
    return F


def iwagame():
    F = Fig(f"{S}/iwagame", "Iwagame", "A turtle with a mountain on its back. When it sleeps, villages grow on it.")
    F.model("m", TURTLE, L=48, yaw=-30, level=True)
    F.model_clip("model_m", "nod", 2.0, amp=6)
    return F


def gamagon():
    F = Fig(f"{S}/gamagon", "Gamagon", "A warty toad as tall as the temple, croaking up the rainy season single-handed.")
    F.model("m", TOAD, L=44, h=36, yaw=-20, level=True)
    F.model_clip("model_m", "hop", 1.0, amp=3)
    return F


def okami():
    F = Fig(f"{S}/okami", "Longneck", "Peers over the five-storey pagoda to see who is ringing the bell.")
    F.model("m", SAURO, L=50, h=44, yaw=-40, level=True)
    F.model_clip("model_m", "turn", 2.4, amp=20)
    return F


FIGS = {"gyaosaur": gyaosaur, "kanigon": kanigon, "iwagame": iwagame, "gamagon": gamagon, "okami": okami}
