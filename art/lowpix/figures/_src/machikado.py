"""Street Corner (街角コレクション): the furniture of a Showa street corner, real models made small on slabs of pavement."""
from figlib import Fig, GOLD
from props import asphalt, slab

S = "machikado"
MAILBOX = "sketchfab:e980d78b5535474e85c085e652eb9e4c"   # Japanese Mailbox
MAILBOX2 = "sketchfab:aad08d888ae4498da59c47faf149208e"  # Japanese mailbox (round)
VENDING = "sketchfab:f537e142a592428d85ca7a940be221d3"   # Vending Machine
HYDRANT = "sketchfab:7f9164e6018c4ec7a3585bbf6e6d70df"   # Fire Hydrant
CONE = "sketchfab:573feef839d7450cb3e12da9986e7a98"      # Traffic Cone
BOOTH = "sketchfab:068f8bc747114856a7505cadf7873792"     # Phone Booth
LAMP = "sketchfab:b7cebcfb4b1c4d4a97e22072800704ca"      # Street Lamp
BUSSTOP = "sketchfab:b9a3cab48d304eeabf096df4f14bb7e7"   # The Bus Stop at Hida City


def pavement(F, w=26, d=24):
    top = asphalt(F, "base", w, d)
    F.box("kerb", [w - 0.4, 1.0, 5], (0, top + 0.5, -d / 2 + 2.7), ch=0.3, col="#a8a49a", style="stone", tone=3.2)
    return top


def posuto():
    F = Fig(f"{S}/posuto", "Round Post Box", "The red pillar box on the corner, collections at nine and at four.")
    top = pavement(F)
    F.model("m", MAILBOX, 30, (0, top, 1), yaw=-15, mat="gloss")
    return F


def jihanki():
    F = Fig(f"{S}/jihanki", "Candy Vending Machine", "Push the big button: a capsule of sweets and a tune that sticks for a week.")
    top = pavement(F)
    F.model("m", VENDING, 34, (0, top, 1), yaw=-15, mat="gloss")
    F.model_clip("model_m", "wobble", 0.8, amp=2)
    return F


def shokasen():
    F = Fig(f"{S}/shokasen", "Fire Hydrant", "Bright red, chained caps, guarding the corner for fifty years.")
    top = pavement(F, 22, 22)
    F.model("m", HYDRANT, 22, (0, top, 1), yaw=-20, mat="gloss")
    return F


def cone():
    F = Fig(f"{S}/cone", "Roadworks Cone", "Orange, striped, a little squashed. Somebody has to stand there.")
    top = pavement(F, 22, 22)
    F.model("m", CONE, 22, (0, top, 1), yaw=-10)
    F.model_clip("model_m", "wobble", 1.0, amp=6)
    return F


def denwa():
    F = Fig(f"{S}/denwa", "Phone Booth", "A glass box with a payphone and a phone book. Ten-yen coins stacked on the shelf.")
    top = pavement(F)
    F.model("m", BOOTH, 34, (0, top, 1), yaw=-20, recolor={"hue": 70, "saturation": 0.8})
    return F


def gaito():
    F = Fig(f"{S}/gaito", "Street Lamp", "The lamp where everyone waited to be picked up, moths and all.")
    top = pavement(F, 22, 22)
    F.model("m", LAMP, 40, (0, top, 1), yaw=-20, mat="metal")
    return F


def busstop():
    F = Fig(f"{S}/busstop", "Country Bus Stop", "A little shelter with a bench and a timetable: one bus in the morning, one at night.")
    top = slab(F, "base", 34, 26, 3.0, col="#5a5a50", style="stone", tone=2.8)
    F.model("m", BUSSTOP, 28, (0, top, 0), yaw=-15)
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Post Box", "A post box plated in gold for the town's centenary. Letters posted here always arrive.")
    top = slab(F, "base", 24, 24, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.model("m", MAILBOX2, 30, (0, top, 0), yaw=-15, mat="metal", recolor=GOLD)
    F.model_clip("model_m", "turn", 2.4, amp=30)
    return F


FIGS = {"posuto": posuto, "jihanki": jihanki, "shokasen": shokasen, "cone": cone, "denwa": denwa, "gaito": gaito, "busstop": busstop, "golden": golden}
