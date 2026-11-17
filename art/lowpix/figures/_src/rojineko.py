"""Alley Cat Patrol (路地ネコパトロール): real cats, made small, on the lane's street furniture.
Cats are real models (Sketchfab, CC BY: see art/lowpix/figures/SOURCES.json) converted by lowpix; the street furniture
and bases are lowpix specs with factory paint (mould seams, the gate nub and the maker's mark underneath)."""
from figlib import Fig, text_jp
from props import asphalt, post_box, oil_drum, cardboard_box, block_wall, roof_tiles, crescent_moon, slab, tatami, bucket

S = "rojineko"
BENGAL = "sketchfab:6d82596b5db94f7b9093814a4a88caa9"     # Bengal Cat (sitting)
BLUE = "sketchfab:ee5dcbdd0c2b4c33adf83d4c6708e6ae"       # Sitting cat (British Shorthair Blue)
WALKER = "sketchfab:51cc3bfb49b64128aa54ffa29f36d8c1"     # cat (standing tabby and white)
CURIOUS = "sketchfab:c1465490a7c74d48b599e1d68ff990ef"    # Curious Cat (crouching)
NAPPER = "sketchfab:fde417a3962547d9a15e71f55c1b90d8"     # Sleeping Cat Scan 3d
KITTEN = "sketchfab:4ae3704cd65b423ab994545988d4db1a"     # Kitten
SPARROW = "sketchfab:11b5b94688bc4ee380849585086da98a"    # Sparrow


def postbox():
    F = Fig(f"{S}/postbox", "Post Box Sentry", "A blue-grey shorthair on the red post box, checking every letter.")
    top = asphalt(F, "base", 26, 26)
    pt = post_box(F, "", (0, top, -1))
    F.model("cat", BLUE, 20, (0, pt - 1.6, -0.5), yaw=-12)
    F.model_clip("model_cat", "turn", 2.4, amp=30)
    return F


def wall():
    F = Fig(f"{S}/wall", "Wall Walker", "Tail up, all the way along the block wall, like it owns it. It does.")
    top = slab(F, "base", 38, 14, col="#5a5c5a", style="stone")
    wt = block_wall(F, "", 34, 13, 7, (0, top, 0))
    F.model("cat", WALKER, 17, (1, wt, 0), yaw=90, fit=False)
    F.model_clip("model_cat", "slide", 2.2, amp=4, axis="x")
    return F


def box():
    F = Fig(f"{S}/box", "Mikan Box Kuro", "A black cat who found the one good box on the lane.")
    top = asphalt(F, "base", 30, 26)
    cardboard_box(F, "", 22, 9, 17, (0, top, 0), label="みかん")
    F.model("cat", BENGAL, 23, (0, top + 0.6, -1), yaw=-20, recolor={"brightness": 0.2, "saturation": 0.12})
    F.model_clip("model_cat", "hop", 1.6, amp=3)
    return F


def laundry():
    F = Fig(f"{S}/laundry", "Zabuton Nap", "Grandma's floor cushion, still warm from the sun. Not hers any more.")
    top = tatami(F, "base", 34, 30)
    F.box("zabuton", [24, 3.2, 22], (0, top + 1.6, 0), ch=1.2, col="#8a3a3a", style="velvet", tone=3.0)
    F.layer("zabuton", id="tuft", op="spots", centers=[[0, 1.6, 0, 0.9]], ramp="ink", tone=2.0)
    F.layer("zabuton", id="seam", op="band", axis="y", **{"from": -0.1, "to": 0.1}, shift=-0.8, faces=["sides"])
    F.model("cat", NAPPER, 9, (0, top + 3.0, 0), yaw=20)
    return F


def kittens():
    F = Fig(f"{S}/kittens", "Tin Bucket Kittens", "Two kittens and one bucket. The bucket is losing.")
    top = slab(F, "base", 30, 26, col="#6a5a48", style="plank")
    bucket(F, "", (-3, top, 0), r=8.5, h=8)
    F.model("kit1", KITTEN, 15, (-3, top + 0.6, -0.5), yaw=160)
    F.model("kit2", KITTEN, 13, (8, top, 4), yaw=-40, recolor={"brightness": 0.55, "saturation": 0.4})
    F.model_clip("model_kit2", "hop", 1.2, amp=2)
    return F


def boss():
    F = Fig(f"{S}/boss", "The Boss of Lane 3", "Scarred, unhurried and very large. Sits on the oil drum; owns the lane.")
    top = asphalt(F, "base", 30, 30)
    dt = oil_drum(F, "", (0, top, -1))
    F.model("cat", BLUE, 25, (0, dt - 0.4, -0.5), yaw=-10, recolor={"tint": "#a8784c", "brightness": 0.95})
    F.model_clip("model_cat", "turn", 2.4, amp=25)
    return F


def stalker():
    F = Fig(f"{S}/stalker", "Sparrow Stalker", "Low, still, tail twitching. The sparrow has noticed. The sparrow does not care.")
    top = asphalt(F, "base", 40, 26, line=(-0.95, -0.85))
    F.model("cat", CURIOUS, 18, (-6, top, 0), yaw=70)
    F.model("bird", SPARROW, 7.5, (12, top, 3), yaw=-110)
    F.model_clip("model_bird", "hop", 1.2, amp=2.5)
    return F


def moon():
    F = Fig(f"{S}/moon", "Moon-White Stray", "On the roof under a crescent moon, white as rice paper.")
    top = slab(F, "base", 32, 24, col="#2a2e40", style="stone")
    rt = roof_tiles(F, "", 30, 20, (0, top, 0))
    F.model("cat", BENGAL, 23, (-2, rt - 0.6, 1), yaw=-25, recolor={"saturation": 0.08, "linear": [0.38, 158]})
    F.box("pole", [1.0, 28, 1.0], (10, top + 14, -8), ch=0.3, col="#3a3a44", style="metal")
    crescent_moon(F, "moon", (10, top + 31, -8), r=7)
    F.model_clip("model_cat", "turn", 2.6, amp=-28)
    return F


FIGS = {"postbox": postbox, "wall": wall, "box": box, "laundry": laundry, "kittens": kittens, "boss": boss, "stalker": stalker, "moon": moon}
