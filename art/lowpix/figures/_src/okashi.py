"""Wagashi Tray (和菓子処): the sweets of an old confectioner's, real-food models made small, each on its own plate or
lacquer tray with a pick or a sprig (art/lowpix/figures/SOURCES.json)."""
from figlib import Fig, GOLD
from props import slab, plate

S = "okashi"
DANGO = "sketchfab:a874a02e5e9c4bcba54173a20c3732e8"     # Dangos in the plate
TAIYAKI = "sketchfab:a8ca187f40504b9084b9052c569e5122"   # Taiyaki
DORAYAKI = "sketchfab:530b15ed5bbb461982f692bc10966a02"  # dorayaki
SAKURA = "sketchfab:2cb15ab24c1a468b931b30793d7c1296"    # Sakuramochi
MANJU = "sketchfab:2a94f9c0de5149dfbf9c0bbea1a0ee59"     # manju on a plate (scan)
MATCHA = "sketchfab:938e05641929403cab1f0c77376e0d9b"    # Japanese Matcha Bowl
KAGAMI = "sketchfab:a9c0b6ab4cb146d8a003d6c894af3fd4"    # Kagami-mochi
PEACH = "sketchfab:8cf8ce4a480e43dbafa390ae5394c627"     # Japanese Peach


def tray(F, w=30, d=24, col="#3a1c18"):
    """A black-and-vermilion lacquer tray."""
    top = slab(F, "base", w, d, 3.0, col=col, style="glaze", tone=2.4)
    F.box("rim", [w - 1, 1.4, d - 1], (0, top + 0.7, 0), ch=0.5, col="#8a2a1e", style="glaze", tone=3.0, hide=["top", "bottom"])
    F.add("mat", "box", (0, top + 0.1, 0), size=[w - 3, 0.2, d - 3], col="#d8c8a0", style="paper", tone=3.6)
    return top + 0.2


def dango():
    F = Fig(f"{S}/dango", "Hanami Dango", "Pink, white and green on a bamboo skewer: spring, summer and winter. Autumn is the stick.")
    top = tray(F)
    F.model("dango", DANGO, 30, (0, top, 0), yaw=-15, fill=0.8)
    return F


def taiyaki():
    F = Fig(f"{S}/taiyaki", "Taiyaki", "A sea bream of crisp batter full of hot sweet bean paste. Head first or tail first?")
    top = tray(F)
    pt = plate(F, "plate", 11, (0, top, 0), col="#e8e2d0", rim="#3a5a8a")
    F.model("fish", TAIYAKI, 30, (0, pt, 0), yaw=-20, fill=0.62)
    F.model_clip("model_fish", "wobble", 1.2, amp=6)
    return F


def dorayaki():
    F = Fig(f"{S}/dorayaki", "Dorayaki", "Two honey pancakes and the red bean between them. A whole stack would be fair.")
    top = tray(F)
    pt = plate(F, "plate", 10, (0, top, 0), col="#f0ead8")
    F.model("cake", DORAYAKI, 30, (0, pt, 0), yaw=-35, fill=0.55)
    return F


def sakura():
    F = Fig(f"{S}/sakura", "Sakura Mochi", "Pink rice round sweet bean, wrapped in a salted cherry leaf. Eat the leaf.")
    top = tray(F, col="#2a1a18")
    F.model("mochi", SAKURA, 30, (0, top, 0), yaw=0, fill=0.8)
    return F


def manju():
    F = Fig(f"{S}/manju", "Onsen Manju", "Brown-sugar buns steamed by the hot spring, stamped with the inn's mark.")
    top = slab(F, "base", 30, 24, 3.0, col="#3a1c18", style="glaze", tone=2.4)
    F.model("buns", MANJU, 30, (0, top, 0), yaw=30, fill=0.92)
    return F


def matcha():
    F = Fig(f"{S}/matcha", "Matcha Bowl", "Whisked to a fine green foam in a camellia bowl. Turn it twice before you drink.")
    top = slab(F, "base", 30, 26, 3.0, col="#c8b880", style="cloth", tone=3.2)
    F.box("cloth", [18, 0.4, 18], (0, top + 0.2, 0), ch=0.1, col="#7a1e24", style="velvet", tone=3.0)
    F.model("bowl", MATCHA, 9, (0, top + 0.4, 0), yaw=20)
    F.loft("whisk", [((0, 0, 0), 2.6), ((0, 2.4, 0), 3.2), ((0, 3.8, 0), 1.6), ((0, 8, 0), 1.4)], (10, top + 0.4, 6), sides=12, rnd=2,
           col="#d8c890", style="wood", tone=3.6, up=[0, 0, 1])
    F.layer("whisk", id="tines", op="stripes", axis="around", period=0.05, width=0.4, shift=-0.8)
    F.model_clip("model_bowl", "spin", 2.0, amp=0.25)
    return F


def kagami():
    F = Fig(f"{S}/kagami", "Kagami Mochi", "Two rice cakes and a bitter orange on a sanbo stand, for the god of the new year.")
    top = slab(F, "base", 26, 26, 3.0, col="#2a1a18", style="glaze", tone=2.4)
    F.box("sanbo", [18, 9, 18], (0, top + 4.5, 0), ch=0.4, col="#d8c08a", style="wood", tone=3.4, top=[1.0, 1.0])
    F.box("sanbo_top", [20, 1.2, 20], (0, top + 9.6, 0), ch=0.3, col="#d8c08a", style="wood", tone=3.6)
    F.add("paper", "box", (0, top + 10.3, 0), size=[16, 0.2, 16], rot=[0, 45, 0], col="#f4f0e4", style="paper", tone=4.2)
    F.model("mochi", KAGAMI, 14, (0, top + 10.4, 0), yaw=0)
    return F


def momo():
    F = Fig(f"{S}/momo", "Golden Peach of Long Life", "The peach of the mountain hermits: one bite, one thousand years. Gold leaf all over.")
    top = slab(F, "base", 24, 24, 3.6, col="#3a1e18", style="glaze", tone=2.4)
    F.box("cushion", [16, 2.4, 16], (0, top + 1.2, 0), ch=0.9, col="#8a1e28", style="velvet", tone=3.0)
    F.model("peach", PEACH, 13, (0, top + 2.4, 0), yaw=-20, mat="metal", recolor=GOLD)
    F.model_clip("model_peach", "turn", 2.4, amp=30)
    return F


FIGS = {"dango": dango, "taiyaki": taiyaki, "dorayaki": dorayaki, "sakura": sakura, "manju": manju, "matcha": matcha, "kagami": kagami, "momo": momo}
