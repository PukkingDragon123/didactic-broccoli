"""Kitchen Shelf (台所のたな): the pots, jugs and bowls of a Showa kitchen, Poly Haven CC0 models made small in the line's finish, standing on their own."""
from figlib import Fig

S = "daidokoro"


def f_nabe():
    F = Fig(f"{S}/nabe", "Enamel Pot", "Flower-painted enamel with a chip on the lid, for curry on Fridays.")
    F.model("m", "polyhaven:pot_enamel_01", L=38, yaw=-25, mat="gloss", smooth=2, rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


def f_jug():
    F = Fig(f"{S}/jug", "Flower Jug", "Tulips round the belly, barley tea inside, a ring on the table underneath.")
    F.model("m", "polyhaven:jug_01", h=36, yaw=-25, mat="gloss", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_bowl():
    F = Fig(f"{S}/bowl", "Wooden Bowl", "Turned from one piece of zelkova, the miso soup bowl of the house.")
    F.model("m", "polyhaven:wooden_bowl_01", L=36, yaw=-25, mat="gloss", rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_milk():
    F = Fig(f"{S}/milk", "Milk Can", "The tall can the milkman filled at dawn, dented from the bicycle.")
    F.model("m", "polyhaven:metal_jug", h=40, yaw=-25, mat="gloss", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_board():
    F = Fig(f"{S}/board", "Cutting Board", "Scarred by thirty years of the same knife and the same pickles.")
    F.model("m", "polyhaven:wooden_cutting_board", L=44, yaw=-25, mat="gloss", rest=12)
    F.model_clip("model_m", "slide", 1.6, amp=4)
    return F


def f_brasspot():
    F = Fig(f"{S}/brasspot", "Brass Pot", "Heavy, golden, polished every New Year until it shone.")
    F.model("m", "polyhaven:brass_pot_01", L=38, yaw=-25, mat="gloss", rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_teaset():
    F = Fig(f"{S}/teaset", "Best Tea Set", "Pot, cups and saucers in flowered porcelain, only out for the most important guests.")
    F.model("m", "polyhaven:tea_set_01", L=46, yaw=-25, mat="gloss", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


FIGS = {"nabe": f_nabe, "jug": f_jug, "bowl": f_bowl, "milk": f_milk, "board": f_board, "brasspot": f_brasspot, "teaset": f_teaset}
