"""Alley Cat Patrol (路地ネコパトロール): eight real cats of the back lane, eight different breeds and poses, made small at
one scale (about 1:12) on the lane's asphalt. Every cat is its own real model (Sketchfab CC BY, converted by lowpix in
the line's finish; credits in art/lowpix/figures/SOURCES.json); the street furniture they own is lowpix spec work."""
from figlib import Fig, BASE_H
from props import series_base, post_box, oil_drum, cardboard_box, block_wall, roof_tiles, crescent_moon, bucket

S = "rojineko"
BSH = "sketchfab:ee5dcbdd0c2b4c33adf83d4c6708e6ae"      # Sitting cat (British Shorthair, blue)
TABBY_WHITE = "sketchfab:51cc3bfb49b64128aa54ffa29f36d8c1"  # cat (brown tabby and white, walking, tail up)
MAINE_COON = "sketchfab:b468b86a95144e48bd95a6d1b77061a9"  # Large black maine coon cat (sitting)
COMFY = "sketchfab:2c2baa9563db4f20ba23f869ec3288dc"    # Sleepy Comfy Cat (asleep on a cushion, scan)
KITTEN = "sketchfab:4ae3704cd65b423ab994545988d4db1a"   # Kitten (standing)
GINGER = "sketchfab:6d82596b5db94f7b9093814a4a88caa9"   # Bengal Cat (a big ginger tabby, sitting)
CROUCH = "sketchfab:c1465490a7c74d48b599e1d68ff990ef"   # Curious Cat (low, head down, creeping)
SIAMESE = "sketchfab:322334f0c12445cdadb5d8dcd9c3738f"  # Siamese Cat In Motion (walking)
RAT = "polyhaven:street_rat"                             # a brown street rat (Poly Haven CC0)


def postbox():
    F = Fig(f"{S}/postbox", "Post Box Sentry", "A blue-grey shorthair on the red post box, checking every letter.")
    top = post_box(F, "", (0, BASE_H, 0), r=7.5, h=22.0)
    F.prop(-8.1, BASE_H, -8.1, 8.1, top, 8.1)
    F.model("cat", BSH, h=24, at=(0, top - 1.2, 0.6), yaw=-14)
    series_base(F, "lane")
    F.model_clip("model_cat", "turn", 2.4, amp=30)
    return F


def wall():
    F = Fig(f"{S}/wall", "Wall Walker", "Tail up, all the way along the block wall, like it owns it. It does.")
    wt = block_wall(F, "", 36, 12, 8, (0, BASE_H, 0))
    F.prop(-18.6, BASE_H, -4.6, 18.6, wt, 4.6)
    F.model("cat", TABBY_WHITE, w=34, at=(0, wt, 0), yaw=0)
    series_base(F, "lane")
    F.model_clip("model_cat", "slide", 2.2, amp=3, axis="x")
    return F


def box():
    F = Fig(f"{S}/box", "Mikan Box Kuro", "A big black long-hair who found the one good box on the lane. Do not ask for it back.")
    bt = cardboard_box(F, "", 24, 9, 20, (0, BASE_H, 0), label="みかん")
    F.prop(-12, BASE_H, -10, 12, bt, 10)
    F.model("cat", MAINE_COON, h=28, at=(0, BASE_H + 1.0, -0.5), yaw=-18)
    series_base(F, "lane")
    F.model_clip("model_cat", "hop", 1.6, amp=3)
    return F


def laundry():
    F = Fig(f"{S}/laundry", "Zabuton Nap", "Grandma's floor cushion, still warm from the sun. Not hers any more.")
    F.model("cat", COMFY, w=34, d=30, h=16, at=(0, BASE_H, 0), yaw=20)
    series_base(F, "lane")
    return F


def kittens():
    F = Fig(f"{S}/kittens", "Tin Bucket Kitten", "One kitten, one bucket. The bucket is losing.")
    bt = bucket(F, "", (-5, BASE_H, -2), r=7.5, h=8)
    F.prop(-12.5, BASE_H, -9.5, 2.5, bt + 4, 5.5)
    F.model("kit", KITTEN, h=17, at=(6, BASE_H, 3), yaw=-35)
    series_base(F, "lane")
    F.model_clip("model_kit", "hop", 1.2, amp=2)
    return F


def boss():
    F = Fig(f"{S}/boss", "The Boss of Lane 3", "Scarred, unhurried and very large. Sits on the oil drum; owns the lane.")
    dt = oil_drum(F, "", (0, BASE_H, 0), r=8.0, h=15.0)
    F.prop(-8.3, BASE_H, -8.3, 8.3, dt, 8.3)
    F.model("cat", GINGER, h=28, at=(0, dt - 0.3, 0.4), yaw=-12)
    series_base(F, "lane")
    F.model_clip("model_cat", "turn", 2.4, amp=25)
    return F


def stalker():
    F = Fig(f"{S}/stalker", "Rat Patrol", "Low, still, tail twitching. The rat by the drain has noticed, and is pretending it has not.")
    F.model("cat", CROUCH, w=34, d=30, at=(-3, BASE_H, -2), yaw=40)
    F.model("rat", RAT, w=10, d=12, at=(14, BASE_H, 10), yaw=-140)
    series_base(F, "lane")
    F.model_clip("model_cat", "slide", 1.6, amp=2.5, axis="z")
    return F


def moon():
    F = Fig(f"{S}/moon", "Moonlit Siamese", "Along the roof ridge under a crescent moon, blue eyes and not a sound. Nobody has ever seen it come down.")
    rt = roof_tiles(F, "", 34, 18, (0, BASE_H, 0), tilt=10)
    F.prop(-17, BASE_H, -9, 17, rt, 9)
    F.model("cat", SIAMESE, w=32, at=(-1, rt - 0.4, 1), yaw=-8)
    # the moon on a clear acrylic rod behind the roof
    F.cyl("rod", 0.7, 30, (12, rt - 1.0, -6.5), sides=8, col="#cfe4ee", style="clear", mat="glass")
    crescent_moon(F, "moon", (12, rt + 33, -6.5), r=6)
    F.prop(6, BASE_H, -9, 18, rt + 39, -4)
    series_base(F, "lane")
    F.model_clip("model_cat", "turn", 2.6, amp=-28)
    return F


FIGS = {"postbox": postbox, "wall": wall, "box": box, "laundry": laundry, "kittens": kittens, "boss": boss, "stalker": stalker, "moon": moon}
