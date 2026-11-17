"""Lane Vehicles (まちのくるま): the vehicles of a Showa town as die-cast-style minis, from hand-made models (Sketchfab
CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. They stand on their own wheels."""
from figlib import Fig

S = "norimono"
SCOOTER = "sketchfab:ad0f9220657c43fb89692dcf7a6b45a8"   # Vintage Scooter
KEI = "sketchfab:fb477a6082c5442ca060dfcdf8eae928"       # Simple Kei Truck
BUS = "sketchfab:5eb1166198a147949f95aacb4257ad37"       # Retro Bus
PATROL = "sketchfab:b16585738a284cafbb3c209766408b3a"    # Generic 70s Police Cruiser
FIRE = "sketchfab:6e10c14d33c14963b01fd8d825ea0fe5"      # 1938 Vairogs Fire Truck
TRAM = "sketchfab:2a6f78db7ea4403eb0aa5de268126799"      # Playground Tram


def vehicle(F, name, src, L, yaw, mat="gloss"):
    F.model("v", src, L=L, yaw=yaw, mat=mat, level=True)
    F.model_clip("model_v", "slide", 1.6, amp=3, axis="x")


def scooter():
    F = Fig(f"{S}/scooter", "Mint Scooter", "A round-nosed scooter with a spare wheel on the back, for the fish market at dawn.")
    vehicle(F, "v", SCOOTER, 40, -60)
    return F


def keitruck():
    F = Fig(f"{S}/keitruck", "Kei Truck", "The little flat-bed that carries everything: cabbages, a fridge, the whole family on moving day.")
    vehicle(F, "v", KEI, 46, -60)
    return F


def bus():
    F = Fig(f"{S}/bus", "Bonnet Bus", "The country bus with a long nose, twice a day, the conductor calling every stop.")
    vehicle(F, "v", BUS, 50, -60)
    return F


def patrol():
    F = Fig(f"{S}/patrol", "Patrol Car", "Black and white, a single red lamp on the roof. Mostly it gives directions.")
    vehicle(F, "v", PATROL, 48, -60)
    return F


def fire():
    F = Fig(f"{S}/fire", "Fire Engine", "Red, brass and ladders, polished every morning whether there is a fire or not.")
    vehicle(F, "v", FIRE, 50, -60)
    return F


def tram():
    F = Fig(f"{S}/tram", "Chin-Chin Tram", "Two-tone, one car, ringing its bell down the middle of the main street.")
    vehicle(F, "v", TRAM, 50, -60)
    return F


FIGS = {"scooter": scooter, "keitruck": keitruck, "bus": bus, "patrol": patrol, "fire": fire, "tram": tram}
