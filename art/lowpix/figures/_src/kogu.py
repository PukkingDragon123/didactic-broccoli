"""Grandpa's Toolbox (おじいちゃんの道具箱): well-used hand tools, Poly Haven CC0 models made small in the line's finish, lying or standing on their own."""
from figlib import Fig

S = "kogu"


def f_hammer():
    F = Fig(f"{S}/hammer", "Wooden Mallet", "A beech mallet, its face dented from a thousand chisels.")
    F.model("m", "polyhaven:wooden_hammer_01", L=40, yaw=-25, mat="matte", pitch=90, rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_plane():
    F = Fig(f"{S}/plane", "Block Plane", "Push it and a curl of cedar comes up as thin as paper. Grandpa's favourite sound.")
    F.model("m", "polyhaven:hand_plane_no4", L=42, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "slide", 1.6, amp=4)
    return F


def f_wrench():
    F = Fig(f"{S}/wrench", "Pipe Wrench", "Red handle, toothed jaw, heavy as a brick. Fixes the bath every winter.")
    F.model("m", "polyhaven:pipe_wrench", L=44, yaw=-25, mat="metal", pitch=90, rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_drill():
    F = Fig(f"{S}/drill", "Hand Drill", "Turn the wheel and the bit goes round. Slowly. Very slowly.")
    F.model("m", "polyhaven:vintage_hand_drill", L=44, yaw=-25, mat="metal", pitch=90, rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_oilcan():
    F = Fig(f"{S}/oilcan", "Oil Can", "Press the bottom and one drop comes out of the long spout. Every hinge on the lane is quiet.")
    F.model("m", "polyhaven:small_oil_can_01", h=34, yaw=-25, mat="metal", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


def f_vice():
    F = Fig(f"{S}/vice", "Bench Vice", "Bolted to the bench since before you were born, the handle polished by hands.")
    F.model("m", "polyhaven:bench_vice_01", L=40, yaw=-25, mat="metal", rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_torch():
    F = Fig(f"{S}/torch", "Brass Blowtorch", "Pump, light, roar. It thawed the pipes in the winter of '63.")
    F.model("m", "polyhaven:brass_blowtorch", h=40, yaw=-25, mat="metal", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_toolbox():
    F = Fig(f"{S}/toolbox", "Red Toolbox", "Grandpa's own steel toolbox, dented, the lid still shutting with a clack.")
    F.model("m", "polyhaven:metal_toolbox", L=44, yaw=-25, mat="metal", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


FIGS = {"hammer": f_hammer, "plane": f_plane, "wrench": f_wrench, "drill": f_drill, "oilcan": f_oilcan, "vice": f_vice, "torch": f_torch, "toolbox": f_toolbox}
