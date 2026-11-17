"""Wagashi Tray (和菓子のおぼん): Japanese sweets about life size, from photogrammetry scans and hand-made models (Sketchfab
CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. Each sweet sits on its own plate, stand or
bottom, like the real thing on the tea tray: no stand."""
from figlib import Fig

S = "okashi"
DANGO = "sketchfab:a874a02e5e9c4bcba54173a20c3732e8"     # Dangos in the plate (jaromir.ternavskiy)
TAIYAKI = "sketchfab:a8ca187f40504b9084b9052c569e5122"   # Taiyaki (patrakeevasveta)
DORAYAKI = "sketchfab:530b15ed5bbb461982f692bc10966a02"  # dorayaki (gillga, scan)
SAKURA = "sketchfab:2cb15ab24c1a468b931b30793d7c1296"    # Sakuramochi (tessie675, scan)
MANJU = "sketchfab:12dae70316694b5c9ae92bdb30f38f82"     # Momiji manju
MATCHA = "sketchfab:938e05641929403cab1f0c77376e0d9b"    # Japanese Matcha Bowl (visionfountain, scan)
PEACH = "sketchfab:8cf8ce4a480e43dbafa390ae5394c627"     # Japanese Peach (DuckbillStudio, scan)


def dango():
    F = Fig(f"{S}/dango", "Hanami Dango", "Pink, white and green on bamboo skewers: spring, summer and winter. Autumn is the stick.")
    F.model("dango", DANGO, w=36, d=30, yaw=-15)
    return F


def taiyaki():
    F = Fig(f"{S}/taiyaki", "Taiyaki", "A sea bream of crisp batter full of hot sweet bean paste. Head first or tail first?")
    F.model("fish", TAIYAKI, w=36, d=24, yaw=-20, cut=0.05)
    F.model_clip("model_fish", "wobble", 1.2, amp=6)
    return F


def dorayaki():
    F = Fig(f"{S}/dorayaki", "Dorayaki", "Two honey pancakes and the red bean between them.")
    F.model("cake", DORAYAKI, w=30, d=30, yaw=-35, level=True, cut=0.04, smooth=2.0)
    return F


def sakura():
    F = Fig(f"{S}/sakura", "Sakura Mochi", "Pink rice round sweet bean, wrapped in a salted cherry leaf. Eat the leaf.")
    F.model("mochi", SAKURA, w=30, d=30, yaw=0, smooth=2.0)
    return F


def manju():
    F = Fig(f"{S}/manju", "Momiji Manju", "Little sponge cakes baked in the shape of maple leaves, bean paste inside. The island's souvenir.")
    F.model("cakes", MANJU, w=36, d=30, yaw=30, smooth=2)
    return F


def matcha():
    F = Fig(f"{S}/matcha", "Matcha Bowl", "Whisked to a fine green foam in a rough bowl. Turn it twice before you drink.")
    F.model("bowl", MATCHA, w=32, d=32, yaw=20)
    F.model_clip("model_bowl", "spin", 2.0, amp=0.25)
    return F


def momo():
    F = Fig(f"{S}/momo", "Peach of Long Life", "The hermits' peach from the mountain orchard, blushing and heavy. One bite, one thousand years.")
    F.model("peach", PEACH, w=32, d=32, yaw=-20)
    F.model_clip("model_peach", "turn", 2.4, amp=30)
    return F


FIGS = {"dango": dango, "taiyaki": taiyaki, "sakura": sakura, "manju": manju}
