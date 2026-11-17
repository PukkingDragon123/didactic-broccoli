"""Fake Food Window (サンプル食堂): the plastic food samples of a Showa restaurant window, as real-food models made small,
each on its little display riser with the folded price card. Food models are real (Sketchfab CC BY scans and models,
art/lowpix/figures/SOURCES.json); risers, plates and cards are lowpix specs."""
from figlib import Fig
from props import slab, plate, price_card

S = "sampuru"
RAMEN = "sketchfab:f65a8eab51794fbc8c7941101a354a54"     # Japanese Ramen (chopsticks lifting the noodles)
YAKIUDON = "sketchfab:262da93cd8b64bcda24dcfd8752b634f"  # Yakiudon
UDON = "sketchfab:50f286afdcf14b54bf35f22affb0b15c"      # Udon (scan)
SHRIMP = "sketchfab:382be6710803495da6cc2035967f9648"    # Fried Shrimp (3D scan)
FLOAT = "sketchfab:a7652a3d813a479ba93cf880e466789c"     # Cherry Soda Float
PUDDING = "sketchfab:8ae63b5fbce94fbfa17eb2f6c4f095ff"   # Caramel Pudding Cream & Cherry
SUNDAE = "sketchfab:7fcd555c03de4411a83aa5685fac1b5b"    # Ice Cream Sundae
FORK = "sketchfab:6f9efa17eab544eba05518bf29454895"      # Spaghetti and Fork


def riser(F, w=30, d=26, col="#2a2224"):
    """The black lacquered display riser of a sample window, with a felt top."""
    top = slab(F, "base", w, d, 4.0, col=col, style="glaze", tone=2.4)
    F.box("felt", [w - 2, 0.6, d - 2], (0, top + 0.3, 0), ch=0.2, col="#7a2a2a", style="velvet", tone=2.8)
    return top + 0.6


def ramen():
    F = Fig(f"{S}/ramen", "Chopstick-Lift Ramen", "The noodles hang in the air forever. That is the whole trick, and it never gets old.")
    top = riser(F)
    F.model("bowl", RAMEN, 26, (0, top, -1), yaw=-20)
    price_card(F, "card", "Y650", "ラーメン", (9, top, 10), yaw=-20)
    return F


def katsu():
    F = Fig(f"{S}/katsu", "Yaki Udon", "Fat noodles fried with cabbage and pork, a heap of bonito on top. The varnish is the secret.")
    top = riser(F)
    F.model("plate", YAKIUDON, 9, (0, top, -1), yaw=15)
    price_card(F, "card", "Y600", "焼うどん", (10, top, 10), yaw=-25)
    return F


def udon():
    F = Fig(f"{S}/udon", "Kitsune Udon", "Two sheets of sweet fried tofu on a bowl of thick noodles, for the fox in you.")
    top = riser(F)
    F.model("bowl", UDON, 13, (0, top, -1), yaw=0)
    price_card(F, "card", "Y450", "きつね", (10, top, 10), yaw=-25)
    return F


def ebifry():
    F = Fig(f"{S}/ebifry", "Ebi-fry Plate", "Two crunchy prawns, curly tails up, a wedge of lemon, a mound of cabbage.")
    top = riser(F)
    pt = plate(F, "plate", 11, (0, top, -1), rim="#2a4a8a")
    F.model("shrimp1", SHRIMP, 16, (-3, pt + 1.6, -2), yaw=10, pitch=90, fill=0.6)
    F.model("shrimp2", SHRIMP, 16, (3, pt + 1.6, 2), yaw=35, pitch=90, fill=0.6)
    F.blob("cabbage", 9, 4.5, 8, (6, pt, -6), col="#b8d088", style="food", tone=3.4, sides=12, rnd=2.2)
    F.layer("cabbage", id="shreds", op="stripes", axis="x", period=0.5, width=0.4, wobble=0.9, shift=0.8)
    F.taper("lemon", [4.0, 2.4, 3.2], (-7, pt + 1.1, 4), front=(0.1, 0.6), col="#e8d050", style="glaze", tone=3.6, rot=(0, 30, 0))
    price_card(F, "card", "Y720", "エビフライ", (10, top, 10), yaw=-25)
    return F


def soda():
    F = Fig(f"{S}/soda", "Melon Cream Soda", "Fizz you can't drink, a scoop that never melts, a cherry on a stalk.")
    top = riser(F, w=24, d=24)
    F.cyl("coaster", 7.5, 0.8, (0, top, -1), sides=20, col="#e8e0cc", style="paper", tone=3.6)
    F.model("glass", FLOAT, 28, (0, top + 0.8, -1), yaw=0, recolor={"hue": 115, "saturation": 1.1, "linear": [0.75, 70]})
    price_card(F, "card", "Y380", "メロンソーダ", (8, top, 9), yaw=-25)
    F.model_clip("model_glass", "wobble", 1.4, amp=5)
    return F


def pudding():
    F = Fig(f"{S}/pudding", "Purin a la Mode", "A wobbling custard pudding with cream, fruit and a wafer, on a footed glass boat.")
    top = riser(F)
    F.model("purin", PUDDING, 20, (0, top, -1), yaw=0)
    price_card(F, "card", "Y550", "プリン", (10, top, 10), yaw=-25)
    F.model_clip("model_purin", "wobble", 1.6, amp=4)
    return F


def sundae():
    F = Fig(f"{S}/sundae", "Tower Parfait", "Seven layers, three scoops, a spoon that will never reach the bottom.")
    top = riser(F, w=26, d=26)
    F.model("parfait", SUNDAE, 34, (0, top, -1), yaw=0)
    price_card(F, "card", "Y980", "パフェ", (9, top, 9), yaw=-25)
    return F


def fork():
    F = Fig(f"{S}/fork", "Floating Fork Napolitan", "The fork twirls the spaghetti up and stays there, held by nothing at all. A window classic.")
    top = riser(F)
    pt = plate(F, "plate", 11.5, (0, top, -1), col="#f4f2ea", rim="#c8a040")
    F.blob("pasta", 15, 4.5, 13, (0, pt, -1), col="#d8603a", style="glaze", tone=3.2, sides=14, rnd=2.2, bottom=0.95, top=0.5)
    F.layer("pasta", id="noodles", op="stripes", axis=[1, 0.2, 1], period=0.7, width=0.45, wobble=0.9, shift=0.9)
    F.layer("pasta", id="onion", op="spots", count=6, radius=[0.6, 1.0], ramp="white", tone=4.2)
    F.layer("pasta", id="pepper", op="spots", count=5, radius=[0.5, 0.8], ramp=F.c("#4a8a3a"), tone=3.0, seed=3)
    F.model("pasta", FORK, 18, (1, pt + 3.0, -1), yaw=0, roll=50, fit=False)
    price_card(F, "card", "Y700", "ナポリタン", (10, top, 10), yaw=-25)
    F.model_clip("model_pasta", "hop", 1.8, amp=2.5)
    return F


FIGS = {"ramen": ramen, "katsu": katsu, "udon": udon, "ebifry": ebifry, "soda": soda, "pudding": pudding, "sundae": sundae, "fork": fork}
