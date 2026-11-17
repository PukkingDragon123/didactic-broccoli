"""Desk Drawer (つくえのひきだし): the things in a Showa schoolchild's desk drawer, made small from hand-made models,
scans (Sketchfab CC BY) and Poly Haven CC0 models (credits in art/lowpix/figures/SOURCES.json), in the line's finish.
Everything lies or stands on its own, as it would on the desk."""
from figlib import Fig

S = "hikidashi"
SET = "sketchfab:62d50825c5de4d1ba574356fbe9b2985"        # Pencil case, pencil, sharpener, eraser and ruler (Mr.Octopus)
CUP = "sketchfab:fa72296b31164928b45b7732fb5bf9ae"        # pencil case Model (daand): a pencil cup
STAPLER = "polyhaven:vintage_stapler"                     # a teal enamel office stapler
SHARPENER = "sketchfab:d404f8700b304a91ad13924fa6af94d6"  # Pencil sharpener (thesidekick, scan): a crank sharpener
ABACUS = "sketchfab:ee04aa74fcd04b839d4b964a17fc1a20"     # Abacus (hky111111)
PEN = "sketchfab:b4676e41c38a4348af933f1d00051afb"        # Fountain Pen (gazgolder)
RANDOSERU = "sketchfab:608a48391a534d9aa67bbe82e2a96748"  # Japanese School Backpack (afx_cgmotion)
WATCH = "polyhaven:vintage_pocket_watch"                  # an engraved gold pocket watch


def fudebako():
    F = Fig(f"{S}/fudebako", "Pencil Case Set", "The case, the pencil, the ruler, the sharpener and the eraser that smells of strawberries.")
    F.model("m", SET, w=40, d=30, yaw=-15)
    return F


def cup():
    F = Fig(f"{S}/cup", "Pencil Cup", "Every pencil and pen you own, all chewed at the same end.")
    F.model("m", CUP, h=36, w=26, d=26, yaw=-10)
    return F


def stapler():
    F = Fig(f"{S}/stapler", "Stapler", "Open wide, clack. It has eaten a thousand worksheets and wants more.")
    F.model("m", STAPLER, w=40, d=16, yaw=-30, mat="gloss")
    F.model_clip("model_m", "hop", 0.6, amp=1)
    return F


def kezuri():
    F = Fig(f"{S}/kezuri", "Crank Sharpener", "Clamp it to the desk, turn the handle: the best smell in the classroom.")
    F.model("m", SHARPENER, h=32, w=30, d=26, yaw=-25, mat="gloss")
    F.model_clip("model_m", "wobble", 0.8, amp=4)
    return F


def soroban():
    F = Fig(f"{S}/soroban", "Soroban", "The abacus from the after-school class. Clack the beads and the sums do themselves.")
    F.model("m", ABACUS, w=42, d=20, yaw=-10)
    F.model_clip("model_m", "slide", 0.8, amp=1.5, axis="x")
    return F


def pen():
    F = Fig(f"{S}/pen", "Fountain Pen", "Father's red fountain pen. You were absolutely not to touch it.")
    F.model("m", PEN, w=44, d=12, yaw=-30, mat="gloss")
    return F


def randoseru():
    F = Fig(f"{S}/randoseru", "Red Randoseru", "Six years of school on your back in red leather. Too big in the first year, too small in the last.")
    F.model("m", RANDOSERU, h=36, w=30, d=26, yaw=-20, mat="gloss")
    F.model_clip("model_m", "wobble", 1.2, amp=4)
    return F


def golden():
    F = Fig(f"{S}/golden", "Grandfather's Pocket Watch", "Engraved gold, wound every morning at six, never once late. It is still ticking in the drawer.")
    F.model("m", WATCH, w=34, d=34, h=12, yaw=-20, mat="metal")
    F.model_clip("model_m", "turn", 2.4, amp=25)
    return F


FIGS = {"fudebako": fudebako, "cup": cup, "stapler": stapler, "kezuri": kezuri, "soroban": soroban, "pen": pen, "randoseru": randoseru, "golden": golden}
