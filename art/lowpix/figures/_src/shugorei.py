"""Guardian Spirits (守護霊): masked, armoured guardians, from hand-made models and a museum armour scan (Sketchfab
CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. No bare human faces: helmets, masks and
empty armour only. They stand on their own feet; the scanned armour keeps its own stand."""
from figlib import Fig, BASE_H
from props import series_base

S = "shugorei"
SAMURAI = "sketchfab:0ac619b7b276445cb69c1887dd21ede9"   # Samurai
ARMOUR = "sketchfab:2144079e664740b19997c83d07c3c0f8"    # Samurai Armor Scan (on its stand)
KNIGHT = "sketchfab:d14eb14d83bd4e7ba7cbe443d76a10fd"    # The Forgotten Knight
KING = "sketchfab:f5a4479d211e49d49937b55fd9478e85"      # Old king armor
NINJA = "sketchfab:a0bbe212318b4ee9bfaec55a3e060227"     # Ninja
CYBORG = "sketchfab:1673131f9e914d60af48d2dd51b85339"    # Ninja Cyborg
CYBER = "sketchfab:26ccafaddb2745ceb56ae5cfc65bfed5"     # Cyber Samurai


def guardian(key, name, desc, src, h=46, yaw=-20, mat="metal", clip="turn"):
    def make():
        F = Fig(f"{S}/{key}", name, desc)
        F.model("m", src, h=h, L=34, at=(0, BASE_H, 0), yaw=yaw, mat=mat)
        series_base(F, "riser", "a figure on two armoured feet: it stands on a low display riser", minw=20)
        F.model_clip("model_m", clip, 2.2, amp=20)
        return F
    return make


FIGS = {
    "tetsu": guardian("tetsu", "Iron Ronin", "A masterless samurai in lacquered iron, mask down, sword ready, guarding whoever needs it.", SAMURAI),
    "kage": guardian("kage", "Shadow Step", "A masked ninja who is always one step behind you, and has been for years.", NINJA, mat="matte"),
    "kishi": guardian("kishi", "Forgotten Knight", "A knight from a story nobody remembers, still standing watch in dented plate.", KNIGHT),
    "ou": guardian("ou", "Old King's Armour", "A king's armour with nobody inside, still giving orders.", KING),
    "raijin": guardian("raijin", "Lightning Edge", "A samurai of the year 3000, all plates and cables, faster than the thunder.", CYBER),
    "yoroi": guardian("yoroi", "Empty Armour", "A real suit of armour on its museum stand. On quiet nights it turns its head.", ARMOUR, h=44, mat="gloss"),
    "mecha": guardian("mecha", "Chrome Shinobi", "Half shadow, half machine: the ninja the future sent back.", CYBORG),
}
