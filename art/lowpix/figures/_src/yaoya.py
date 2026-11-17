"""Greengrocer (やおやさん): fruit and vegetables from the corner shop, Poly Haven CC0 scans made into chunky minis in the line's finish."""
from figlib import Fig

S = "yaoya"


def f_apple():
    F = Fig(f"{S}/apple", "Red Apple", "Polished on the grocer's apron until you can see your face in it.")
    F.model("m", "polyhaven:food_apple_01", h=30, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_nashi():
    F = Fig(f"{S}/nashi", "Nashi Pear", "Crisp as ice, gritty and sweet. Two of them in a paper bag for a sick friend.")
    F.model("m", "polyhaven:food_pears_asian_01", L=34, yaw=-25, mat="matte", smooth=2, rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_lemon():
    F = Fig(f"{S}/lemon", "Lemon", "Bright enough to light the shelf.")
    F.model("m", "polyhaven:lemon", L=34, yaw=-25, mat="matte", roll=90, rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_imo():
    F = Fig(f"{S}/imo", "Sweet Potato", "Roast it in the leaf fire until the skin cracks and the inside goes gold.")
    F.model("m", "polyhaven:sweet_potato", L=44, yaw=-25, mat="matte", roll=90, rest=12)
    F.model_clip("model_m", "slide", 1.6, amp=4)
    return F


def f_ginger():
    F = Fig(f"{S}/ginger", "Ginger Root", "Knobbly, fragrant and hot. Grated over everything in summer.")
    F.model("m", "polyhaven:food_ginger_01", L=40, yaw=-25, mat="matte", pitch=90, rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_banana():
    F = Fig(f"{S}/banana", "Banana Bunch", "A whole hand of bananas: once the most expensive thing in the shop.")
    F.model("m", "polyhaven:bananas", L=44, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_pomegranate():
    F = Fig(f"{S}/pomegranate", "Pomegranate", "Split open, its ruby seeds spilling. The grocer saves it for the regulars.")
    F.model("m", "polyhaven:food_pomegranate_01", h=32, yaw=-25, mat="matte", smooth=2, rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_lychee():
    F = Fig(f"{S}/lychee", "Lychee Bunch", "Rough red shells and pearl inside: the rarest crate of summer.")
    F.model("m", "polyhaven:food_lychee_01", L=40, yaw=-25, mat="matte", smooth=2, rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


FIGS = {"apple": f_apple, "nashi": f_nashi, "lemon": f_lemon, "imo": f_imo, "ginger": f_ginger, "banana": f_banana, "pomegranate": f_pomegranate, "lychee": f_lychee}
