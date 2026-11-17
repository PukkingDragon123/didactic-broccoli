"""Alley Cat Patrol (路地ネコパトロール): the back lane's cats, every one a different real cat (hand-made models by real
artists and photogrammetry scans of real cats, Sketchfab CC BY; no AI-generated models: art/lowpix/figures/AI_CHECK.json)
made small at one scale (about 1:12) in the line's finish. They stand, sit or sprawl on their own; the street
furniture they own (a block wall, a tin bucket, a post box, an oil drum, a roof) is lowpix spec work and part of the
toy, never a display stand."""
from figlib import Fig
from props import post_box, oil_drum, cardboard_box, block_wall, roof_tiles, crescent_moon, bucket

S = "rojineko"
MOONCAT = "sketchfab:69db9de4d5c446a895cec3c2a048f7a8"      # Cat (mustafasahinfb, scan): a tabby lying stretched out
PERSIAN = "sketchfab:9899bf74b406468b9efd32e4a32dd7a8"      # Persian Cat Sleeping (romansn, scan): curled up
COMFY = "sketchfab:2c2baa9563db4f20ba23f869ec3288dc"        # Sleepy Comfy Cat (leoskateman, scan): asleep on a cushion
TUXEDO = "sketchfab:1912d5ed6498459abb50cda71a288258"       # cat sleeping on tatami (sekiri, scan): sprawled, cut out
TUXEDO_BOX = [-0.24, 0.118, -0.31, 0.065, 0.32, 0.42]      # (the cat and its rug, without the room)
KOSMO = "sketchfab:a0df91f135d447acb9b69b1deeefbdcf"        # Kosmo Sleeping Cat Scan (samhodge): a grey cat curled up
GINGER = "sketchfab:36bc3223d8ab49b39bc1f105f9b4dbb3"       # Orange Tabby Cat (Chenchanchong): standing
CALICO = "sketchfab:7325331900d8458b852f39f0dbcdbf18"       # Calico Cat (AaronRydning): walking
SLEEPER = "sketchfab:cdc2fa52cccf476fab8b64370455dd34"      # Sleeping Cat (3rik, scan): a ginger cat asleep on a blanket
SLEEPER_BOX = [0.93, 2.575, 1.02, 1.37, 2.80, 1.47]        # (the cat and the blanket under it, without the room)


def postbox():
    F = Fig(f"{S}/postbox", "Post Box Sentry", "Curled up on top of the red post box, guarding every letter in it with its whole body.")
    top = post_box(F, "", (0, 0, 0), r=7.5, h=22.0)
    F.model("cat", KOSMO, w=17, d=17, at=(0, top - 1.8, 0), yaw=-14)
    F.model_clip("model_cat", "turn", 2.4, amp=30)
    return F


def wall():
    F = Fig(f"{S}/wall", "Wall Walker", "A calico tail-up all the way along the block wall, like it owns it. It does.")
    wt = block_wall(F, "", 36, 12, 8, (0, 0, 0))
    F.model("cat", CALICO, L=34, at=(0, wt, 0), yaw=0)
    F.model_clip("model_cat", "slide", 2.2, amp=3, axis="x")
    return F


def box():
    F = Fig(f"{S}/box", "Mikan Box Lodger", "Asleep on somebody's blue blanket in the one good box on the lane. Do not ask for either back.")
    cardboard_box(F, "", 27, 6, 24, (0, 0, 0), label="みかん")
    F.model("cat", SLEEPER, w=25, d=22, at=(0, 0.9, 0), yaw=-10, box=SLEEPER_BOX)
    F.model_clip("model_cat", "hop", 1.6, amp=3)
    return F


def laundry():
    F = Fig(f"{S}/laundry", "Zabuton Nap", "Grandma's floor cushion, still warm from the sun. Not hers any more.")
    F.model("cat", COMFY, w=36, d=32, h=18, yaw=20)
    return F


def kittens():
    F = Fig(f"{S}/kittens", "Tin Bucket Nap", "A long-haired ginger curled up in the washing bucket, which is now its bucket.")
    bt = bucket(F, "", (0, 0, 0), r=10.0, h=7)
    F.model("cat", PERSIAN, L=22, at=(0, 1.0, 0), yaw=-35)
    F.model_clip("model_cat", "hop", 1.2, amp=2)
    return F


def boss():
    F = Fig(f"{S}/boss", "The Boss of Lane 3", "Unhurried and very large. Stands on the oil drum; owns the lane.")
    dt = oil_drum(F, "", (0, 0, 0), r=8.0, h=15.0)
    F.model("cat", GINGER, w=30, d=16, at=(0, dt - 0.2, 0), yaw=-20)
    F.model_clip("model_cat", "turn", 2.4, amp=25)
    return F


def stalker():
    F = Fig(f"{S}/stalker", "Sunbeam Sprawl", "Belly up on the rug in the one patch of sun, and nothing on earth will move it.")
    F.model("cat", TUXEDO, w=46, d=46, yaw=60, box=TUXEDO_BOX, level=True)
    F.model_clip("model_cat", "nod", 2.0, amp=4)
    return F


def moon():
    F = Fig(f"{S}/moon", "Moonlit Sleeper", "Stretched out on the warm roof tiles under a crescent moon. Nobody has ever seen it come down.")
    rt = roof_tiles(F, "", 34, 18, (0, 0, 0), tilt=10)
    F.model("cat", MOONCAT, L=30, at=(-1, rt - 0.4, 1), yaw=-8, rest=12)
    F.cyl("rod", 0.7, 30, (12, rt - 1.0, -6.5), sides=8, col="#cfe4ee", style="clear", mat="glass")  # the moon's clear rod
    crescent_moon(F, "moon", (12, rt + 33, -6.5), r=6)
    F.model_clip("model_cat", "turn", 2.6, amp=-28)
    return F


FIGS = {"postbox": postbox, "wall": wall, "box": box, "laundry": laundry, "kittens": kittens, "boss": boss, "stalker": stalker, "moon": moon}
