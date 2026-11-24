"""Fake Food Window (サンプル食堂): the plastic food samples of a Showa restaurant window, made from real food models
(hand-made only, never scans: Sketchfab CC BY / Poly Haven CC0, art/lowpix/figures/SOURCES.json) in the line's finish. One
dish per figure, every dish its own model, each sitting in its own bowl, plate or glass: no stand."""
from figlib import Fig
from props import plate

S = "sampuru"
RAMEN = "sketchfab:f65a8eab51794fbc8c7941101a354a54"     # Japanese Ramen (senkinsky): shoyu, naruto, egg, chopsticks
SUNDAE = "sketchfab:7fcd555c03de4411a83aa5685fac1b5b"    # Ice Cream Sundae (Discovered)
FORK = "sketchfab:6f9efa17eab544eba05518bf29454895"      # Spaghetti and Fork (OsianOHM)


def ramen():
    F = Fig(f"{S}/ramen", "Shoyu Ramen", "Naruto, a soft egg, nori and the chopsticks resting on the bowl. Smells of nothing at all.")
    F.model("bowl", RAMEN, w=32, d=32, yaw=-20)
    return F


def sundae():
    F = Fig(f"{S}/sundae", "Tower Parfait", "Three scoops, a wafer, a cherry and a spoon that will never reach the bottom.")
    F.model("parfait", SUNDAE, h=42, w=32, d=32, yaw=-15)
    return F


def fork():
    F = Fig(f"{S}/fork", "Floating Fork Napolitan", "The fork twirls the spaghetti up and stays there, held by nothing at all. A window classic.")
    top = plate(F, "plate", 13.0, (0, 0, 0), col="#f4f2ea", rim="#c8a040")
    F.model("pasta", FORK, w=24, d=12, at=(8, top, 0), yaw=0)  # the noodle strands (at the tines end) land mid-plate
    F.model_clip("model_pasta", "hop", 1.8, amp=2.0)
    return F


FIGS = {"ramen": ramen, "sundae": sundae, "fork": fork}
