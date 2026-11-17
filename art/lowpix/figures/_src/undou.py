"""Sports Day (うんどうかい): the kit from the school field, Poly Haven CC0 models made small in the line's finish, lying or standing on their own."""
from figlib import Fig

S = "undou"


def f_baseball():
    F = Fig(f"{S}/baseball", "Baseball", "Red stitches, grass stains and a name in marker that has nearly worn away.")
    F.model("m", "polyhaven:baseball_01", h=28, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


def f_football():
    F = Fig(f"{S}/football", "Football", "Black and white panels, scuffed from the gravel pitch behind the school.")
    F.model("m", "polyhaven:football", h=32, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


def f_rugby():
    F = Fig(f"{S}/rugby", "Rugby Ball", "Bounces in every direction but the one you want.")
    F.model("m", "polyhaven:american_football", L=40, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_bat():
    F = Fig(f"{S}/bat", "Wooden Bat", "Taped at the grip, signed by the whole team in the last summer.")
    F.model("m", "polyhaven:baseball_bat", L=46, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "slide", 1.6, amp=4)
    return F


def f_megaphone():
    F = Fig(f"{S}/megaphone", "Megaphone", "The teacher's megaphone: \"Red team, last lap!\" heard three streets away.")
    F.model("m", "polyhaven:Megaphone_01", L=42, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_dartboard():
    F = Fig(f"{S}/dartboard", "Dartboard", "From the teachers' room, the real secret of sports day. Nobody ever hits the bull.")
    F.model("m", "polyhaven:dartboard", h=40, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


FIGS = {"baseball": f_baseball, "football": f_football, "rugby": f_rugby, "bat": f_bat, "megaphone": f_megaphone, "dartboard": f_dartboard}
