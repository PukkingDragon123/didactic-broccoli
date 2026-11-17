"""Showa Home Appliances (昭和の家電): the machines of a 1960s-80s Japanese home, real models made small on a walnut
sideboard top. Every appliance is its own real model (Poly Haven CC0 / Sketchfab CC BY, converted by lowpix in the
line's finish; credits in art/lowpix/figures/SOURCES.json); the sideboard and the lace doily are lowpix specs."""
from figlib import Fig, BASE_H
from props import series_base, doily

S = "denka"
PHONE = "sketchfab:24c655388db749fe9a679ea4c6edc626"     # Vintage Rotary Telephone
FAN = "sketchfab:e4dffd0f67204f84a2595dd2d249f451"       # Vintage Electric Fan (sky blue)
THERMOS = "polyhaven:modified_thermos"                   # a green vacuum flask with a cup lid
CASSETTE = "polyhaven:cassette_player"                   # a portable cassette tape recorder
TV = "sketchfab:fe9acba84eed4a43b4315200aefbead1"        # Vintage Television (wooden cabinet)
BOOMBOX = "polyhaven:boombox"                            # a twin-speaker radio-cassette
CLOCK = "polyhaven:alarm_clock_01"                       # a twin-bell alarm clock
PROJECTOR = "polyhaven:filmstrip_projector_8mm"          # an 8 mm home-movie projector


def shelf(F, doily_r=None):
    w, d = series_base(F, "shelf")
    if doily_r:
        c = F.subject.centre
        doily(F, "base_doily", doily_r, (c[0], BASE_H + 0.05, c[2]))


def phone():
    F = Fig(f"{S}/phone", "Black Rotary Phone", "Heavy as a brick, rings like a fire bell. Dial with one finger and a lot of patience.")
    F.model("phone", PHONE, w=28, d=26, h=22, at=(0, BASE_H + 0.1, 0), yaw=-15, mat="gloss", dark=True)
    shelf(F, doily_r=14)
    F.model_clip("model_phone", "hop", 1.0, amp=1.2)
    return F


def fan():
    F = Fig(f"{S}/fan", "Sky-Blue Electric Fan", "Three speeds, one oscillation, a cage you were told never to poke.")
    F.model("fan", FAN, h=36, w=28, d=24, at=(0, BASE_H, 0), yaw=-20)
    shelf(F)
    F.model_clip("model_fan", "turn", 3.0, amp=35)
    return F


def cooker():
    F = Fig(f"{S}/cooker", "Green Vacuum Flask", "Barley tea, still cold at the bottom of the hill. The cup on top is the lid.")
    F.model("flask", THERMOS, h=34, at=(0, BASE_H, 0), yaw=-30, mat="gloss")
    shelf(F)
    return F


def radio():
    F = Fig(f"{S}/radio", "Cassette Recorder", "Press play and record together, hold it up to the TV speaker, and nobody breathe.")
    F.model("rec", CASSETTE, h=30, w=26, d=24, at=(0, BASE_H, 0), yaw=-20)
    shelf(F)
    F.model_clip("model_rec", "hop", 0.8, amp=1.0)
    return F


def tv():
    F = Fig(f"{S}/tv", "Wooden Cabinet TV", "The whole family in front of it at seven. Thump the side if the picture rolls.")
    F.model("tv", TV, w=32, h=30, d=28, at=(0, BASE_H, 0), yaw=-20)
    shelf(F)
    return F


def boombox():
    F = Fig(f"{S}/boombox", "Radio-Cassette Deck", "Twin speakers, chrome everywhere, the top ten taped off the air.")
    F.model("deck", BOOMBOX, w=34, d=26, at=(0, BASE_H, 0), yaw=-15)
    shelf(F)
    F.model_clip("model_deck", "hop", 0.8, amp=1.0)
    return F


def sewing():
    F = Fig(f"{S}/sewing", "Twin-Bell Alarm Clock", "Two bells and a hammer, wound every night, louder than the whole street.")
    F.model("clock", CLOCK, h=34, at=(0, BASE_H, 0), yaw=-15, mat="gloss", drop=["mat:Glass"])
    shelf(F)
    F.model_clip("model_clock", "wobble", 1.2, amp=8)
    return F


def valve():
    F = Fig(f"{S}/valve", "Sunday Night Projector", "Father's 8 mm projector: the sheet on the wall, the reels turning, the summer at the sea again.")
    F.model("proj", PROJECTOR, w=36, h=34, d=24, at=(0, BASE_H, 0), yaw=-70, mat="metal")
    shelf(F)
    F.model_clip("model_proj", "turn", 2.4, amp=20)
    return F


FIGS = {"phone": phone, "fan": fan, "cooker": cooker, "radio": radio, "tv": tv, "boombox": boombox, "sewing": sewing, "valve": valve}
