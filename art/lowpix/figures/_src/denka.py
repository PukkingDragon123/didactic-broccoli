"""Showa Home Appliances (昭和の家電): the machines of a 1960s-70s Japanese home, real models made small, each in its
corner of the house: a lace doily, a tatami edge, a veneer shelf. Appliances are real models (Sketchfab CC BY,
art/lowpix/figures/SOURCES.json); bases and doilies are lowpix specs."""
from figlib import Fig, GOLD
from props import slab, tatami, doily

S = "denka"
PHONE = "sketchfab:24c655388db749fe9a679ea4c6edc626"     # Vintage Rotary Telephone
FAN = "sketchfab:e4dffd0f67204f84a2595dd2d249f451"       # Vintage Electric Fan
COOKER = "sketchfab:8376d2613cb74acdbfad039e7b5e161c"    # National Rice Cooker
TRANSISTOR = "sketchfab:c01869269a8b4bd2a8a05b8162fe7a11"  # Vintage Portable Transistor Radio
TV = "sketchfab:fe9acba84eed4a43b4315200aefbead1"        # Vintage Television
BOOMBOX = "sketchfab:c13af52fcba1490c98871952e34d4f10"   # Boombox (silver)
SEWING = "sketchfab:4f6c74f9f904439b8554078d1be14821"    # Vintage sewing machine
VALVE = "sketchfab:7724f81ad4e043079b7bf4b16146c087"     # Vintage Radio 1940s


def shelf(F, w=32, d=24, col="#7a4a2a"):
    """A veneer sideboard top."""
    return slab(F, "base", w, d, 4.0, col=col, style="wood", tone=3.0)


def phone():
    F = Fig(f"{S}/phone", "Black Rotary Phone", "Heavy as a brick, rings like a fire bell. Dial with one finger and patience.")
    top = shelf(F)
    doily(F, "doily", 12, (0, top + 0.1, 0))
    F.model("phone", PHONE, 15, (0, top + 0.2, 0), yaw=-15)
    F.model_clip("model_phone", "hop", 1.0, amp=1.2)
    return F


def fan():
    F = Fig(f"{S}/fan", "Mint Electric Fan", "Three speeds, one oscillation, a cage you were told never to poke.")
    top = tatami(F, "base", 30, 26)
    F.model("fan", FAN, 34, (0, top, -1), yaw=-20, recolor={"hue": -35, "saturation": 0.7, "brightness": 1.15})
    F.model_clip("model_fan", "turn", 3.0, amp=35)
    return F


def cooker():
    F = Fig(f"{S}/cooker", "Electric Rice Cooker", "Click, steam, the smell of rice. It has never once burned the bottom.")
    top = shelf(F, col="#8a5a34")
    F.model("cooker", COOKER, 22, (0, top, 0), yaw=-20)
    return F


def radio():
    F = Fig(f"{S}/radio", "Pocket Transistor Radio", "Six transistors, one earphone, the baseball on a summer night.")
    top = shelf(F, w=26, d=20)
    doily(F, "doily", 9, (0, top + 0.1, 0))
    F.model("radio", TRANSISTOR, 20, (0, top + 0.2, 0), yaw=-15)
    F.model_clip("model_radio", "wobble", 1.2, amp=4)
    return F


def tv():
    F = Fig(f"{S}/tv", "Wooden Cabinet TV", "The whole family in front of it at seven o'clock. Thump the side if it rolls.")
    top = tatami(F, "base", 34, 28)
    F.model("tv", TV, 26, (0, top, -1), yaw=-18)
    return F


def boombox():
    F = Fig(f"{S}/boombox", "Radio-Cassette Deck", "Twin speakers, chrome everywhere, a tape of the top ten recorded off the air.")
    top = shelf(F, w=36, d=20, col="#5a3a24")
    F.model("deck", BOOMBOX, 18, (0, top, 0), yaw=-12)
    F.model_clip("model_deck", "hop", 0.8, amp=1.0)
    return F


def sewing():
    F = Fig(f"{S}/sewing", "Cream Sewing Machine", "Mother's machine: a cream enamel body, a chrome wheel, a thread of red.")
    top = shelf(F, w=34, d=24, col="#6a4428")
    F.model("machine", SEWING, 22, (0, top, 0), yaw=-20)
    return F


def valve():
    F = Fig(f"{S}/valve", "Golden Valve Radio", "Grandfather's valve set, warmed up and glowing. Gold plated, for the shrine of the living room.")
    top = shelf(F, w=34, d=24, col="#4a2a1a")
    doily(F, "doily", 13, (0, top + 0.1, 0))
    F.model("radio", VALVE, 20, (0, top + 0.2, 0), yaw=-15, mat="metal", recolor=GOLD)
    F.model_clip("model_radio", "turn", 2.4, amp=20)
    return F


FIGS = {"phone": phone, "fan": fan, "cooker": cooker, "radio": radio, "tv": tv, "boombox": boombox, "sewing": sewing, "valve": valve}
