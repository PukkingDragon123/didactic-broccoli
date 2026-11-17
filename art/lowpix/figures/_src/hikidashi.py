"""Desk Drawer (ひきだし文具): the stationery of a Showa school desk, real models made small on the desk's wood."""
from figlib import Fig, text_jp, GOLD
from props import slab

S = "hikidashi"
SET = "sketchfab:62d50825c5de4d1ba574356fbe9b2985"       # Pencil case, pencil, sharpener, eraser
CUP = "sketchfab:fa72296b31164928b45b7732fb5bf9ae"       # pencil cup
STAPLER = "sketchfab:f996b1c1902947caa506d56e565de77e"   # stapler
SHARPENER = "sketchfab:d404f8700b304a91ad13924fa6af94d6"  # desk pencil sharpener (crank)
ABACUS = "sketchfab:ee04aa74fcd04b839d4b964a17fc1a20"    # Abacus (soroban)
PEN = "sketchfab:b4676e41c38a4348af933f1d00051afb"       # Fountain Pen
PEN2 = "sketchfab:18b147a4dca547649b5f6ee65c954458"      # a fountain pen
RANDOSERU = "sketchfab:608a48391a534d9aa67bbe82e2a96748"  # Japanese School Backpack


def desk(F, w=30, d=22):
    top = slab(F, "base", w, d, 3.0, col="#8a6038", style="wood", tone=3.0)
    F.layer("base", id="carve", op="spots", centers=[[w * 0.3, 1.5, -d * 0.2, 1.2]], shift=-1.0, faces=["up"])
    return top


def fudebako():
    F = Fig(f"{S}/fudebako", "Pencil Case Set", "The case, the pencils, the sharpener, the eraser that smells of strawberries.")
    top = desk(F)
    F.model("m", SET, 30, (0, top, 0), yaw=-15, fill=0.8)
    return F


def cup():
    F = Fig(f"{S}/cup", "Pencil Cup", "Every pencil you own, all chewed at the same end.")
    top = desk(F, 22, 20)
    F.model("m", CUP, 18, (0, top, 0), yaw=-10)
    return F


def stapler():
    F = Fig(f"{S}/stapler", "Stapler", "Open wide, clack. It has eaten a thousand worksheets and wants more.")
    top = desk(F)
    F.model("m", STAPLER, 10, (0, top, 0), yaw=-30, mat="gloss")
    F.model_clip("model_m", "hop", 0.6, amp=1)
    return F


def kezuri():
    F = Fig(f"{S}/kezuri", "Crank Sharpener", "Clamp it to the desk, turn the handle: the best smell in the classroom.")
    top = desk(F)
    F.model("m", SHARPENER, 20, (0, top, 0), yaw=-25, mat="gloss")
    F.model_clip("model_m", "wobble", 0.8, amp=4)
    return F


def soroban():
    F = Fig(f"{S}/soroban", "Soroban", "The abacus from the after-school class. Clack the beads and the sums do themselves.")
    top = desk(F, 34, 22)
    F.model("m", ABACUS, 9, (0, top, 0), yaw=-10, recolor={"tint": "#7a5030", "linear": [0.75, 0]})
    F.model_clip("model_m", "slide", 0.8, amp=1.5, axis="x")
    return F


def pen():
    F = Fig(f"{S}/pen", "Fountain Pen", "Father's red fountain pen. You were absolutely not to touch it.")
    top = desk(F, 32, 20)
    F.box("paper", [20, 0.3, 14], (0, top + 0.15, 0), ch=0.05, col="#f4f0e4", style="paper", tone=4.0, rot=(0, 8, 0))
    F.layer("paper", id="lines", op="stripes", axis="z", period=1.4, width=0.08, ramp=F.c("#8ab0d0"), tone=3.4, faces=["up"])
    F.model("m", PEN, 30, (0, top + 0.3, 0), yaw=-30, mat="gloss", fill=0.75)
    return F


def randoseru():
    F = Fig(f"{S}/randoseru", "Red Randoseru", "Six years of school on your back in red leather. Too big in the first year, too small in the last.")
    top = desk(F, 26, 22)
    F.model("m", RANDOSERU, 24, (0, top, 0), yaw=-20, mat="gloss")
    F.model_clip("model_m", "wobble", 1.2, amp=4)
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Fountain Pen", "The principal's gold pen, used once a year, for the graduation certificates.")
    top = slab(F, "base", 30, 20, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.box("cushion", [24, 1.6, 10], (0, top + 0.8, 0), ch=0.6, col="#1e3a5a", style="velvet", tone=3.0)
    F.model("m", PEN2, 30, (0, top + 1.6, 0), yaw=-20, mat="metal", recolor=GOLD, fill=0.8)
    F.model_clip("model_m", "turn", 2.4, amp=25)
    return F


FIGS = {"fudebako": fudebako, "cup": cup, "stapler": stapler, "kezuri": kezuri, "soroban": soroban, "pen": pen, "randoseru": randoseru, "golden": golden}
