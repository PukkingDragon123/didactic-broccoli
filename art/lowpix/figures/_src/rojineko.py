"""Alley Cat Patrol (路地ネコパトロール): the lane's stray cats on the street furniture they own."""
from figlib import Fig, text_jp
from beast import beast
from props import asphalt, post_box, oil_drum, cardboard_box, bucket, block_wall, roof_tiles, crescent_moon, slab, maker_mark

S = "rojineko"


def head_turn(F, part="head_j", amp=35, length=2.4):
    F.clip("gimmick", length, [{"part": part, "axis": "y", "keys": [[0, 0], [0.5, amp, "out"], [1.3, amp], [1.7, -amp * 0.4], [2.1, 0]]}], role="gimmick")


def basket():
    F = Fig(f"{S}/basket", "Basket Tora", "A ginger tabby loafing in a bicycle's wire basket.")
    top = asphalt(F, "base", 30, 24, line=(0.55, 0.62))
    # the front of a lane bicycle: fork, mudguard, wheel stub, the wire basket on its bracket
    F.box("fork", [1.6, 18, 1.6], (0, top + 9, 4), ch=0.4, col="#2a2a30", style="metal", rot=(-12, 0, 0))
    F.cyl("tyre", 6.5, 3.0, (0, top + 6.5, 6), sides=16, col="#1e1e22", style="matte")
    F.ids["tyre"]["rotation"] = [0, 90, 0]
    F.ids["tyre"]["offset"] = [0, 0, 0]
    F.ids["tyre"]["pivot"] = [-1.5, top + 6.5, 6]
    F.layer("tyre", id="tread", op="stripes", axis="around", period=0.04, width=0.3, shift=-0.6, faces=["sides"])
    F.cyl("hub", 1.6, 3.4, (-1.7, top + 6.5, 6), sides=8, col="#b8b8be", style="metal", rot=(0, 0, 0))
    F.ids["hub"]["rotation"] = [0, 90, 0]
    F.ids["hub"]["offset"] = [0, 0, 0]
    bw, bd, bh = 20, 15, 10
    by = top + 14
    W = F.c("#c8ccd0", k=0.3)
    F.box("bk_floor", [bw, 0.8, bd], (0, by, 1), ch=0.2, col=W, style="metal", tone=3.0)
    for nm, sz, pos in (("bk_front", [bw, bh, 0.6], (0, by + bh / 2, 1 + bd / 2)), ("bk_back", [bw, bh, 0.6], (0, by + bh / 2, 1 - bd / 2)),
                        ("bk_l", [0.6, bh, bd], (bw / 2, by + bh / 2, 1)), ("bk_r", [0.6, bh, bd], (-bw / 2, by + bh / 2, 1))):
        F.box(nm, sz, pos, ch=0.1, col=W, style="metal", tone=3.4, double_sided=True)
        # the wire mesh: painted lattice (light wires over the dark gaps)
        F.layer(nm, id="gaps", op="fill", ramp="ink", tone=1.2)
        F.layer(nm, id="wire_v", op="stripes", axis="x" if nm in ("bk_front", "bk_back") else "z", period=2.2, width=0.28, ramp=W, tone=4.4)
        F.layer(nm, id="wire_h", op="stripes", axis="y", period=2.4, width=0.25, ramp=W, tone=3.8)
    F.box("bk_rim", [bw + 0.8, 0.9, bd + 0.8], (0, by + bh, 1), ch=0.3, col=W, style="metal", tone=4.2, hide=["top", "bottom"])
    F.box("bracket", [3, 6, 2], (0, by - 2.5, 1 + bd / 2 - 1), ch=0.4, col="#2a2a30", style="metal")
    o = beast(F, "cat", "loaf", at=(0, by + 1.0, 0.5), coat="#d0884a", pattern="tabby", pat_col="#8a4a22", belly="#f0e2c8", head_rot=(-8, 12, 0))
    F.clip("gimmick", 2.0, [{"part": "body", "channel": "position", "axis": "y", "keys": [[0, 0], [0.35, -4, "in"], [0.9, -4], [1.2, 1.2, "back"], [1.5, 0]]},
                            {"part": "head_j", "axis": "y", "keys": [[0, 12], [1.2, 12], [1.5, -18], [2.0, 12]]}], role="gimmick")
    return F


def box():
    F = Fig(f"{S}/box", "Mikan Box Kuro", "A black cat who found the one good box on the lane.")
    top = asphalt(F, "base", 28, 24)
    cardboard_box(F, "", 20, 9, 15, (0, top, 0), label="みかん")
    beast(F, "cat", "sit", at=(0, top + 0.8, -0.5), coat="#26222a", belly=False, eye_col="#d8b83a", sc=0.95, head_rot=(4, -10, 6), inner_ear="#7a5058")
    F.clip("gimmick", 2.2, [{"part": "body", "channel": "position", "axis": "y", "keys": [[0, 0], [0.4, -9, "in"], [1.2, -9], [1.5, 1, "back"], [1.8, 0]]},
                            {"part": "ear_l", "axis": "z", "keys": [[0, 0], [1.5, 0], [1.65, -18], [1.9, 0]]}], role="gimmick")
    return F


def wall():
    F = Fig(f"{S}/wall", "Wall-Top Mike", "A calico draped along the top of a block wall, one paw hanging.")
    top = slab(F, "base", 34, 16, col="#5a5c5a", style="stone")
    wt = block_wall(F, "", 30, 14, 8, (0, top, 0))
    beast(F, "cat", "loaf", at=(0, wt, 0), coat="#f2ece0", pattern="calico", pat_col="#d8843a", belly=False, eye_col="#9aa83a", yaw=90,
          head_rot=(10, -70, 0))
    F.layer("body", id="patch2", op="spots", count=3, radius=[2.4, 4.0], roughness=0.5, ramp=F.c("#2a2224"), tone=2.4, seed=7)
    F.ids["fpaw_r"]["pivot"][1] -= 3.0
    F.ids["fpaw_r"]["pivot"][2] += 0.0
    F.clip("gimmick", 2.4, [{"part": "tail_0", "axis": "x", "keys": [[0, 0], [0.4, 25], [0.8, -10], [1.2, 25], [1.6, 0]]},
                            {"part": "head_j", "axis": "y", "keys": [[0, 0], [0.6, 30, "out"], [1.8, 30], [2.4, 0]]}], role="gimmick")
    return F


def postbox():
    F = Fig(f"{S}/postbox", "Post Box Sentry", "A grey tabby on the red post box, inspecting every letter.")
    top = asphalt(F, "base", 24, 24)
    pt = post_box(F, "", (0, top, 0))
    beast(F, "cat", "sit", at=(0, pt - 1.2, 0.5), coat="#8a8c92", pattern="tabby", pat_col="#3a3c44", belly="#e8e4dc", eye_col="#c8a83a", sc=0.85,
          head_rot=(14, 0, 0))
    head_turn(F)
    return F


def bucket_():
    F = Fig(f"{S}/bucket", "Tin Bucket Kittens", "Two kittens and one bucket. The bucket is losing.")
    top = slab(F, "base", 26, 24, col="#6a5a48", style="plank")
    bt = bucket(F, "", (0, top, 0))
    beast(F, "kitten", "sit", at=(-2.5, top + 1.2, -1), p="a_", coat="#e8e2d8", pattern="patches", pat_col="#4a4448", eye_col="#7aa0c8", sc=0.78,
          head_rot=(0, 18, -8))
    beast(F, "kitten", "beg", at=(3.0, top + 1.6, 1.4), p="b_", coat="#d89a5a", pattern="tabby", pat_col="#9a5a2a", eye_col="#9aa83a", sc=0.72,
          head_rot=(-10, -12, 6))
    F.ids["b_fleg_l"]["rotation"] = [-70, 0, 0]
    F.clip("gimmick", 1.6, [{"part": "b_fleg_l", "axis": "z", "keys": [[0, 0], [0.2, 20], [0.4, -10], [0.6, 20], [0.8, -10], [1.0, 0]]},
                            {"part": "a_head_j", "axis": "z", "keys": [[0, 0], [0.5, 14], [1.2, 14], [1.6, 0]]}], role="gimmick")
    return F


def scooter():
    F = Fig(f"{S}/scooter", "Scooter Seat Nap", "Curled up on the warm seat of the soba shop's delivery scooter.")
    top = asphalt(F, "base", 34, 22, line=(-0.9, -0.82))
    R = F.c("#3a6a8a")
    # the back half of a delivery scooter: rear wheel, swingarm, body cowl, long seat, carrier
    F.cyl("wheel", 6.0, 3.2, (0, top + 6.0, -6), sides=16, col="#1e1e22", style="matte")
    F.ids["wheel"]["rotation"] = [0, 90, 0]
    F.ids["wheel"]["offset"] = [0, 0, 0]
    F.layer("wheel", id="tread", op="stripes", axis="around", period=0.04, width=0.3, shift=-0.6, faces=["sides"])
    F.cyl("rim", 3.6, 3.4, (0, top + 6.0, -6), sides=12, col="#b8b8be", style="metal")
    F.ids["rim"]["rotation"] = [0, 90, 0]
    F.ids["rim"]["offset"] = [0, 0, 0]
    F.loft("cowl", [((0, 0, -9), [10, 8]), ((0, 1.0, 0), [12, 10]), ((0, 0.5, 8), [10, 9]), ((0, -1.5, 13), [7, 6])], (0, top + 11, 0),
           sides=12, rnd=2.4, col=R, style="pvc", tone=3.0, seam="x")
    F.layer("cowl", id="stripe", op="band", axis="y", **{"from": -0.25, "to": -0.05}, ramp="white", tone=4.3, faces=["sides"],
            bevel={"shadow": 1, "highlight": 1})
    F.box("seat", [9, 3, 17], (0, top + 17, -1), ch=1.4, col="#2a2228", style="matte", tone=2.6, top=None)
    F.layer("seat", id="stitch", op="stripes", axis="z", period=2.2, width=0.12, shift=0.8, faces=["up"])
    F.box("carrier", [11, 1, 7], (0, top + 17, -12), ch=0.3, col="#9a9aa2", style="metal")
    F.box("lamp", [5, 2.6, 1.6], (0, top + 12.5, -9.6), ch=0.6, col="#c83a2a", style="clear", tone=3.0)
    F.meta["mats"]["lamp"] = "glass"
    F.box("plate", [6, 3.4, 0.4], (0, top + 9.5, -10.2), ch=0.2, col="#e8e2c8", style="pvc", tone=4.0)
    F.stamp("plate", text_jp("路地", 8), {"#": "ink:1"}, "back")
    beast(F, "cat", "curl", at=(0, top + 18.6, -1), coat="#f0eae0", pattern="saddle", pat_col="#3a3236", belly=False, eye_col="#9ab83a", closed=True,
          sc=0.82, head_rot=(18, 30, 10), yaw=-20)
    F.clip("gimmick", 2.6, [{"part": "tail", "segments": "all", "axis": "y", "keys": [[0, 0], [0.5, 22], [1.0, -8], [1.5, 18], [2.0, 0]]},
                            {"part": "ear_l", "axis": "z", "keys": [[0, 0], [1.9, 0], [2.05, -20], [2.3, 0]]}], role="gimmick")
    return F


def boss():
    F = Fig(f"{S}/boss", "The Boss of Lane 3", "Scarred, unhurried and very large. Sits on the oil drum; owns the lane.")
    top = asphalt(F, "base", 30, 30)
    dt = oil_drum(F, "", (0, top, -1))
    beast(F, "cat", "sit", at=(0, dt, -0.5), coat="#7a5a3e", pattern="tabby", pat_col="#3e2a1e", belly="#d8c8a8", eye_col="#c8a030", sc=1.12, scar=True,
          head_rot=(6, 0, 0), ear_rot=-6)
    # a fish skeleton trophy at his feet
    F.ramp("bone", "#e8e0cc", k=0.0)
    F.card("fishbone", [".........kk", "kk.k.k.k.kkk", "kkkkkkkkkkkkk", "kk.k.k.k.kkk", ".........kk"], {"k": "bone:4"}, (4, dt + 0.2, 5), plane="xz")
    # a notch in the ear
    F.stamp("ear_r", ["k"], {"k": "ink:1"}, "bottom", at="top")
    head_turn(F, amp=28, length=2.4)
    return F


def moon():
    F = Fig(f"{S}/moon", "Moon-White Stray", "On the roof under a crescent moon. Odd eyes: one gold, one blue.")
    top = slab(F, "base", 30, 22, col="#2a2e40", style="stone")
    rt = roof_tiles(F, "", 28, 18, (0, top, 0))
    beast(F, "cat", "sit", at=(0, rt - 0.4, 1), coat="#f4f2ee", belly=False, eye_col="#d8b030", sc=0.95, head_rot=(-12, -16, 0), inner_ear="#e8b0b0")
    F.box("pole", [1.0, 26, 1.0], (8, top + 13, -7), ch=0.3, col="#3a3a44", style="metal")
    crescent_moon(F, "moon", (8, top + 30, -7), r=8)
    F.clip("gimmick", 3.0, [{"part": "tail", "segments": "all", "axis": "y", "keys": [[0, 0], [0.8, 18], [1.6, -12], [2.4, 10], [3.0, 0]]},
                            {"part": "head_j", "axis": "x", "keys": [[0, 0], [0.7, -14], [2.2, -14], [3.0, 0]]}], role="gimmick")
    return F


FIGS = {"basket": basket, "box": box, "wall": wall, "postbox": postbox, "bucket": bucket_, "scooter": scooter, "boss": boss, "moon": moon}
