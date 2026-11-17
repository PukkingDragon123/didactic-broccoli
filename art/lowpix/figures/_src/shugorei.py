"""Guardian Spirits (守護霊ガーディアンズ): masked, armoured guardian beings rising out of their spirit aura, each on a
stormy base with its name plate. Real armour models (full helmets, masks: no faces) made small and repainted, the
auras and bases modelled in lowpix (glowing alpha-cut flames)."""
from figlib import Fig, text3, GOLD
from props import slab, aura

S = "shugorei"
SAMURAI = "sketchfab:0ac619b7b276445cb69c1887dd21ede9"   # Samurai
ARMOUR = "sketchfab:2144079e664740b19997c83d07c3c0f8"    # Samurai Armor (scan, on its stand)
KNIGHT = "sketchfab:d14eb14d83bd4e7ba7cbe443d76a10fd"    # The Forgotten Knight
KING = "sketchfab:f5a4479d211e49d49937b55fd9478e85"      # Old king armor
NINJA = "sketchfab:a0bbe212318b4ee9bfaec55a3e060227"     # Ninja
CYBORG = "sketchfab:1673131f9e914d60af48d2dd51b85339"    # Ninja Cyborg
CYBER = "sketchfab:26ccafaddb2745ceb56ae5cfc65bfed5"     # Cyber Samurai


def stormbase(F, name, col="#3a3448", w=28, d=24):
    top = slab(F, "base", w, d, 4.0, col=col, style="rock", tone=2.4)
    F.layer("base", id="cracks", op="cracks", scale=0.6, width=0.6, threshold=0.7, ramp="aura", tone=4.5, faces=["up"]) if "aura" in F.spec["palette"]["ramps"] else None
    F.box("plate", [14, 3.2, 0.5], (0, 2.0, d / 2 + 0.2), ch=0.15, col="#c8a04a", style="metal", tone=3.4)
    F.stamp("plate", text3(name), {"#": "ink:1"}, "front", at="center")
    return top


def guardian(F, key, src, height, name, col, aura_col, yaw=-15, recolor=None, seed=1, clip="turn"):
    aura(F, "aura", height * 1.3, height * 1.25, (0, 4 + height * 0.6, -4), col=aura_col, seed=seed)
    top = stormbase(F, name, col)
    F.model("m", src, height, (0, top, 0), yaw=yaw, mat="metal", recolor=recolor)
    F.model_clip("model_m", clip, 2.2, amp=20)
    return F


def tetsu():
    F = Fig(f"{S}/tetsu", "Iron Ronin", "A masterless guardian in lacquered iron, hand on the sword it has never drawn.")
    return guardian(F, "tetsu", SAMURAI, 30, "IRON RONIN", "#2e2a3a", "#c83a3a", seed=1)


def kage():
    F = Fig(f"{S}/kage", "Shadow Step", "A masked guardian of the night roofs. You will only ever see its outline.")
    return guardian(F, "kage", NINJA, 28, "SHADOW STEP", "#1e2230", "#5a6ad8", seed=2)


def kishi():
    F = Fig(f"{S}/kishi", "Forgotten Knight", "A closed helm and a long cloak, standing guard over a promise nobody remembers.")
    return guardian(F, "kishi", KNIGHT, 32, "FORGOTTEN KNIGHT", "#2a2e2a", "#5ac888", seed=3)


def ou():
    F = Fig(f"{S}/ou", "Old King's Armour", "Gilded plate with nobody inside, still walking the castle walls.")
    return guardian(F, "ou", KING, 30, "OLD KING", "#2a2420", "#e8a83a", seed=4)


def raijin():
    F = Fig(f"{S}/raijin", "Lightning Edge", "A cyborg guardian frozen mid-lunge, blade out, crackling with stolen thunder.")
    return guardian(F, "raijin", CYBORG, 26, "LIGHTNING EDGE", "#1e2030", "#4ac8e8", seed=5, clip="nod")


def yoroi():
    F = Fig(f"{S}/yoroi", "Empty Armour", "A great general's armour on its stand. At night the stand is empty.")
    return guardian(F, "yoroi", ARMOUR, 32, "EMPTY ARMOUR", "#2a1e1e", "#d84a6a", seed=6)


def mecha():
    F = Fig(f"{S}/mecha", "Chrome Shogun", "A samurai of chrome and cable, mask lit from inside. It guards the arcade after closing.")
    return guardian(F, "mecha", CYBER, 30, "CHROME SHOGUN", "#1e1a2a", "#b85ae8", seed=7)


def golden():
    F = Fig(f"{S}/golden", "Golden Requiem Guardian", "A guardian of pure gold whose aura stops time for one second. One in five hundred.")
    return guardian(F, "golden", KNIGHT, 32, "GOLDEN GUARDIAN", "#2a1e10", "#f0c850", seed=8,
                    recolor=GOLD)


FIGS = {"tetsu": tetsu, "kage": kage, "kishi": kishi, "ou": ou, "raijin": raijin, "yoroi": yoroi, "mecha": mecha, "golden": golden}
