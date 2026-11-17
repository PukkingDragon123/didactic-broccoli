"""Street Corner (まちかど): the furniture of a Showa shopping street, made small from hand-made models, scans
(Sketchfab CC BY) and Poly Haven CC0 models (credits in art/lowpix/figures/SOURCES.json), in the line's finish.
Each piece stands on its own foot, plinth or post, as it does on the pavement."""
from figlib import Fig

S = "machikado"
MAILBOX = "sketchfab:e980d78b5535474e85c085e652eb9e4c"   # Japanese Mailbox (javileria)
VENDING = "sketchfab:f537e142a592428d85ca7a940be221d3"   # Vending Machine (iJacques)
HYDRANT = "sketchfab:7f9164e6018c4ec7a3585bbf6e6d70df"   # Fire Hydrant (jvouillon, scan)
CONE = "sketchfab:573feef839d7450cb3e12da9986e7a98"      # Traffic Cone (hinndia)
BOOTH = "sketchfab:068f8bc747114856a7505cadf7873792"     # Phone Booth (rud.olenka)
REGISTER = "polyhaven:CashRegister_01"                   # a brass-and-enamel shop till


def posuto():
    F = Fig(f"{S}/posuto", "Round Post Box", "The red pillar box on the corner, collections at nine and at four.")
    F.model("m", MAILBOX, h=40, w=24, d=24, yaw=-15, mat="gloss")
    return F


def jihanki():
    F = Fig(f"{S}/jihanki", "Candy Vending Machine", "Push the big button: a capsule of sweets and a tune that sticks for a week.")
    F.model("m", VENDING, h=42, w=26, d=22, yaw=-15, mat="gloss", smooth=2.0)
    F.model_clip("model_m", "wobble", 0.8, amp=2)
    return F


def shokasen():
    F = Fig(f"{S}/shokasen", "Fire Hydrant", "Chained caps and flaking paint, guarding the corner for fifty years.")
    F.model("m", HYDRANT, h=34, w=26, d=26, yaw=-20, mat="gloss", level=True, smooth=2.5)
    return F


def cone():
    F = Fig(f"{S}/cone", "Roadworks Cone", "Orange, striped, a little squashed. Somebody has to stand there.")
    F.model("m", CONE, h=36, w=26, d=26, yaw=-10)
    F.model_clip("model_m", "wobble", 1.0, amp=6)
    return F


def denwa():
    F = Fig(f"{S}/denwa", "Phone Booth", "A glass box with a payphone and a phone book. Ten-yen coins stacked on the shelf.")
    F.model("m", BOOTH, h=44, w=22, d=22, yaw=-20, smooth=2.0)
    return F


def golden():
    F = Fig(f"{S}/golden", "Corner Shop Till", "The tobacco shop's brass till: every key clacks, the drawer rings, and the total pops up in the window.")
    F.model("m", REGISTER, w=34, d=32, h=34, yaw=-25, mat="metal")
    F.model_clip("model_m", "hop", 0.8, amp=1.2)
    return F


FIGS = {"posuto": posuto, "jihanki": jihanki, "shokasen": shokasen, "cone": cone, "denwa": denwa, "golden": golden}
