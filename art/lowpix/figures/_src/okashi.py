"""Wagashi Tray (和菓子のおぼん): Japanese sweets about life size, from hand-made models (Sketchfab
CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. Each sweet sits on its own plate, stand or
bottom, like the real thing on the tea tray: no stand."""
from figlib import Fig

S = "okashi"
DANGO = "sketchfab:a874a02e5e9c4bcba54173a20c3732e8"     # Dangos in the plate (jaromir.ternavskiy)
TAIYAKI = "sketchfab:a8ca187f40504b9084b9052c569e5122"   # Taiyaki (patrakeevasveta)


def dango():
    F = Fig(f"{S}/dango", "Hanami Dango", "Pink, white and green on bamboo skewers: spring, summer and winter. Autumn is the stick.")
    F.model("dango", DANGO, w=36, d=30, yaw=-15)
    return F


def taiyaki():
    F = Fig(f"{S}/taiyaki", "Taiyaki", "A sea bream of crisp batter full of hot sweet bean paste. Head first or tail first?")
    F.model("fish", TAIYAKI, w=36, d=24, yaw=-20, cut=0.05)
    F.model_clip("model_fish", "wobble", 1.2, amp=6)
    return F


FIGS = {"dango": dango, "taiyaki": taiyaki}
