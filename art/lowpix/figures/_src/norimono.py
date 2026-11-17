"""Lane Vehicles (路地のりもの): the cars, vans and scooters of a Showa back street, real vehicle models made small on
slabs of the road (art/lowpix/figures/SOURCES.json)."""
from figlib import Fig, GOLD
from props import asphalt, slab

S = "norimono"
SCOOTER = "sketchfab:ad0f9220657c43fb89692dcf7a6b45a8"   # Vintage Scooter
RABBIT = "sketchfab:041f66b1dc6f4392bc99898ebe8ac942"    # Vintage Scooter (rounded)
KEI = "sketchfab:fb477a6082c5442ca060dfcdf8eae928"       # Simple Kei Truck
VAN = "sketchfab:5772dc675e5347e09979998bfcf54938"       # Retro vintage van
BUS = "sketchfab:5eb1166198a147949f95aacb4257ad37"       # Retro Bus
PATROL = "sketchfab:b16585738a284cafbb3c209766408b3a"    # Generic 70s Police Cruiser
FIRE = "sketchfab:6e10c14d33c14963b01fd8d825ea0fe5"      # 1938 Fire Truck
TRAM = "sketchfab:2a6f78db7ea4403eb0aa5de268126799"      # Playground Tram


def road(F, w=40, d=22, line=True):
    return asphalt(F, "base", w, d, line=(-0.04, 0.04) if line else None)


def scooter():
    F = Fig(f"{S}/scooter", "Mint Scooter", "The family scooter in mint green, the one that took everyone everywhere.")
    top = road(F, 34, 20, line=False)
    F.model("v", SCOOTER, 20, (0, top, 0), yaw=-60, mat="gloss")
    F.model_clip("model_v", "slide", 1.8, amp=3, axis="x")
    return F


def keitruck():
    F = Fig(f"{S}/keitruck", "Kei Truck", "Small, white, unstoppable: carries the whole greengrocer's shop at dawn.")
    top = road(F)
    F.model("v", KEI, 15, (0, top, 0), yaw=-60, mat="gloss")
    F.model_clip("model_v", "hop", 0.6, amp=0.8)
    return F


def van():
    F = Fig(f"{S}/van", "Delivery Van", "The laundry's round-nosed van, two-tone and polished every Sunday.")
    top = road(F)
    F.model("v", VAN, 15, (0, top, 0), yaw=-60, mat="gloss")
    F.model_clip("model_v", "hop", 0.6, amp=0.8)
    return F


def bus():
    F = Fig(f"{S}/bus", "Bonnet Bus", "The old mountain-line bus with its nose out front. Mind the step.")
    top = road(F, 44, 22)
    F.box("stop", [1.0, 18, 1.0], (16, top + 9, -7), ch=0.3, col="#c8c0b0", style="metal")
    F.cyl("stopsign", 3.4, 0.6, (16, top + 18, -7), sides=16, col="#2a6ab8", style="tin", rot=(90, 0, 0))
    F.model("v", BUS, 16, (-2, top, 0), yaw=-70, mat="gloss")
    return F


def patrol():
    F = Fig(f"{S}/patrol", "Patrol Car", "Black and white, lamp on the roof, parked by the police box all afternoon.")
    top = road(F)
    F.model("v", PATROL, 13, (0, top, 0), yaw=-60, mat="gloss")
    F.model_clip("model_v", "wobble", 0.8, amp=1.5)
    return F


def fire():
    F = Fig(f"{S}/fire", "Fire Engine", "Red as a lacquer bowl, bell polished, ladder ready. Out of the way!")
    top = road(F, 44, 22)
    F.cyl("hydrant", 1.6, 6, (15, top, -7), sides=10, col="#c83a2a", style="tin")
    F.model("v", FIRE, 17, (-2, top, 0), yaw=-65, mat="gloss")
    F.model_clip("model_v", "slide", 1.4, amp=2.5, axis="x")
    return F


def tram():
    F = Fig(f"{S}/tram", "Chin-Chin Tram", "The streetcar that rings its bell at every corner. Ten yen, any distance.")
    top = slab(F, "base", 46, 22, 3.0, col="#5a5a5a", style="stone", tone=2.8)
    for z in (-2.6, 2.6):
        F.box(f"rail{z}", [44, 0.8, 0.8], (0, top + 0.4, z), ch=0.2, col="#9a9aa0", style="metal", tone=3.4)
    for i in range(10):
        F.box(f"sleeper{i}", [1.6, 0.5, 8], (-20 + i * 4.4, top + 0.25, 0), ch=0.2, col="#5a4030", style="plank", tone=2.6)
    F.model("v", TRAM, 20, (0, top + 0.8, 0), yaw=90, mat="gloss")
    F.model_clip("model_v", "slide", 2.0, amp=4, axis="x")
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Rabbit Scooter", "A round little scooter plated in gold for the maker's fiftieth birthday.")
    top = slab(F, "base", 34, 22, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.model("v", RABBIT, 19, (0, top, 0), yaw=-60, mat="metal", recolor=GOLD)
    F.model_clip("model_v", "spin", 3.0, amp=1)
    return F


FIGS = {"scooter": scooter, "keitruck": keitruck, "van": van, "bus": bus, "patrol": patrol, "fire": fire, "tram": tram, "golden": golden}
