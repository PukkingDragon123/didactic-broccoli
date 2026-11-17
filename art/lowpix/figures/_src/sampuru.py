"""Fake Food Window (サンプル食堂): the plastic food samples of a Showa restaurant window, made from real food models
(Sketchfab CC BY scans and models, art/lowpix/figures/SOURCES.json) in the line's finish, each on the black lacquered
riser of the window with its folded price card. One dish per figure, every dish its own model."""
from figlib import Fig, BASE_H
from props import series_base, price_card

S = "sampuru"
RAMEN = "sketchfab:f65a8eab51794fbc8c7941101a354a54"     # Japanese Ramen (shoyu, naruto, egg, chopsticks)
TEMPURA = "sketchfab:de0f08813c6f4090b1b163bfc94e5688"   # Giant Tower of TEMPURA Rice Bowl
UDON = "sketchfab:50f286afdcf14b54bf35f22affb0b15c"      # Udon (scan): kitsune udon on its tray
GYOZA = "sketchfab:d09c2142da5c41e498d4e8ce1e5a5502"     # Japanese Gyoza (ObjectCapture)
FLOAT = "sketchfab:a7652a3d813a479ba93cf880e466789c"     # Cherry Soda Float (a dark cola glass)
PUDDING = "sketchfab:8ae63b5fbce94fbfa17eb2f6c4f095ff"   # Caramel Pudding Cream & Cherry
SUNDAE = "sketchfab:7fcd555c03de4411a83aa5685fac1b5b"    # Ice Cream Sundae
FORK = "sketchfab:6f9efa17eab544eba05518bf29454895"      # Spaghetti and Fork


def window(F, price, name_jp):
    """The riser under the dish, and the price card at its front corner."""
    w, d = series_base(F, "riser", fill=0.78)
    price_card(F, "base_card", price, name_jp, (w / 2 - 5.5 + F.subject.centre[0], BASE_H, d / 2 - 3.2 + F.subject.centre[2]), yaw=-20, size=0.75)


def ramen():
    F = Fig(f"{S}/ramen", "Shoyu Ramen", "Naruto, a soft egg, nori and the chopsticks resting on the bowl. Smells of nothing at all.")
    F.model("bowl", RAMEN, w=30, d=30, at=(0, BASE_H, 0), yaw=-20)
    window(F, "Y650", "ラーメン")
    return F


def katsu():
    F = Fig(f"{S}/katsu", "Gyoza Plate", "Six pan-fried dumplings, crisp side up, on the blue-and-white plate.")
    F.model("plate", GYOZA, w=32, d=30, at=(0, BASE_H, 0), yaw=-25)
    window(F, "Y400", "ギョーザ")
    return F


def udon():
    F = Fig(f"{S}/udon", "Kitsune Udon", "Two sheets of sweet fried tofu on a bowl of thick noodles, for the fox in you.")
    F.model("bowl", UDON, w=32, d=30, at=(0, BASE_H, 0), yaw=-10)
    window(F, "Y450", "きつね")
    return F


def ebifry():
    F = Fig(f"{S}/ebifry", "Tower Tendon", "Prawns, squid and lotus root stacked as high as the cook dared, in a black lacquer bowl.")
    F.model("bowl", TEMPURA, h=38, w=28, d=28, at=(0, BASE_H, 0), yaw=-20)
    window(F, "Y980", "天丼")
    return F


def soda():
    F = Fig(f"{S}/soda", "Cola Float", "A tall dark glass, a scoop of vanilla that never melts and a cherry on top.")
    F.model("glass", FLOAT, h=34, at=(0, BASE_H, 0), yaw=0, mat="gloss")
    window(F, "Y380", "コーラフロート")
    F.model_clip("model_glass", "wobble", 1.4, amp=5)
    return F


def pudding():
    F = Fig(f"{S}/pudding", "Purin a la Mode", "A wobbling custard pudding with cream and a cherry, on its footed glass dish.")
    F.model("purin", PUDDING, h=28, at=(0, BASE_H, 0), yaw=0)
    window(F, "Y550", "プリン")
    F.model_clip("model_purin", "wobble", 1.6, amp=4)
    return F


def sundae():
    F = Fig(f"{S}/sundae", "Tower Parfait", "Three scoops, a wafer, a cherry and a spoon that will never reach the bottom.")
    F.model("parfait", SUNDAE, h=40, w=30, d=30, at=(0, BASE_H, 0), yaw=-15)
    window(F, "Y980", "パフェ")
    return F


def fork():
    F = Fig(f"{S}/fork", "Floating Fork Napolitan", "The fork twirls the spaghetti up and stays there, held by nothing at all. A window classic.")
    F.model("pasta", FORK, w=30, d=30, h=30, at=(0, BASE_H, 0), yaw=0)
    window(F, "Y700", "ナポリタン")
    F.model_clip("model_pasta", "hop", 1.8, amp=2.0)
    return F


FIGS = {"ramen": ramen, "katsu": katsu, "udon": udon, "ebifry": ebifry, "soda": soda, "pudding": pudding, "sundae": sundae, "fork": fork}
