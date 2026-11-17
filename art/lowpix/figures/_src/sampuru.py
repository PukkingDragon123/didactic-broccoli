"""Fake Food Window (サンプル食堂): the plastic food samples of a Showa restaurant window, made from real food models
(hand-made and scanned, Sketchfab CC BY / Poly Haven CC0, art/lowpix/figures/SOURCES.json) in the line's finish. One
dish per figure, every dish its own model, each sitting in its own bowl, plate or glass: no stand."""
from figlib import Fig
from props import plate

S = "sampuru"
RAMEN = "sketchfab:f65a8eab51794fbc8c7941101a354a54"     # Japanese Ramen (senkinsky): shoyu, naruto, egg, chopsticks
TEMPURA = "sketchfab:de0f08813c6f4090b1b163bfc94e5688"   # Giant Tower of TEMPURA Rice Bowl (nantsune, scan)
UDON = "sketchfab:50f286afdcf14b54bf35f22affb0b15c"      # Udon (OHitsuji, Scaniverse scan): kitsune udon on its tray
GYOZA = "sketchfab:d09c2142da5c41e498d4e8ce1e5a5502"     # Japanese Gyoza (edemaistre, ObjectCapture scan)
FLOAT = "sketchfab:a7652a3d813a479ba93cf880e466789c"     # Cherry Soda Float (LittleWhiteElk): a dark cola glass
CAKE = "polyhaven:strawberry_chocolate_cake"             # a chocolate cake crowned with strawberries
SUNDAE = "sketchfab:7fcd555c03de4411a83aa5685fac1b5b"    # Ice Cream Sundae (Discovered)
FORK = "sketchfab:6f9efa17eab544eba05518bf29454895"      # Spaghetti and Fork (OsianOHM)


def ramen():
    F = Fig(f"{S}/ramen", "Shoyu Ramen", "Naruto, a soft egg, nori and the chopsticks resting on the bowl. Smells of nothing at all.")
    F.model("bowl", RAMEN, w=32, d=32, yaw=-20)
    return F


def katsu():
    F = Fig(f"{S}/katsu", "Gyoza Plate", "Six pan-fried dumplings, crisp side up, on the blue-and-white plate.")
    F.model("plate", GYOZA, w=36, d=32, yaw=-25)
    return F


def udon():
    F = Fig(f"{S}/udon", "Kitsune Udon", "Two sheets of sweet fried tofu on a bowl of thick noodles, for the fox in you.")
    F.model("bowl", UDON, w=34, d=32, yaw=-10, level=True, cut=0.07, smooth=2.0)
    return F


def ebifry():
    F = Fig(f"{S}/ebifry", "Tower Tendon", "Prawns, squid and lotus root stacked as high as the cook dared, in a black lacquer bowl.")
    F.model("bowl", TEMPURA, h=40, w=30, d=30, yaw=-20)
    return F


def soda():
    F = Fig(f"{S}/soda", "Cola Float", "A tall dark glass, a scoop of vanilla that never melts and a cherry on top.")
    F.model("glass", FLOAT, h=36, yaw=0, mat="gloss")
    F.model_clip("model_glass", "wobble", 1.4, amp=5)
    return F


def pudding():
    F = Fig(f"{S}/pudding", "Strawberry Chocolate Cake", "A whole cake under the counter glass, crowned with strawberries. Nobody has ever been sold a slice.")
    F.model("cake", CAKE, w=34, d=34, h=26, yaw=-20, smooth=2.5)
    return F


def sundae():
    F = Fig(f"{S}/sundae", "Tower Parfait", "Three scoops, a wafer, a cherry and a spoon that will never reach the bottom.")
    F.model("parfait", SUNDAE, h=42, w=32, d=32, yaw=-15)
    return F


def fork():
    F = Fig(f"{S}/fork", "Floating Fork Napolitan", "The fork twirls the spaghetti up and stays there, held by nothing at all. A window classic.")
    top = plate(F, "plate", 13.0, (0, 0, 0), col="#f4f2ea", rim="#c8a040")
    F.model("pasta", FORK, w=34, d=16, at=(12, top, 0), yaw=0)  # the noodle strands (at the tines end) land mid-plate
    F.model_clip("model_pasta", "hop", 1.8, amp=2.0)
    return F


FIGS = {"ramen": ramen, "katsu": katsu, "udon": udon, "ebifry": ebifry, "soda": soda, "pudding": pudding, "sundae": sundae, "fork": fork}
