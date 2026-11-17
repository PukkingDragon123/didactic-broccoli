"""Walkies! (いぬのおさんぽ): dogs of the neighbourhood on their walk, real dogs made small on bits of the riverside path.
Dogs are real models (Sketchfab CC BY, SOURCES.json); paths, posts and bowls are lowpix specs."""
from figlib import Fig, text_jp, GOLD
from props import slab, asphalt

S = "inusanpo"
POINTER = "sketchfab:6e52a930b88c4580aa721f386998aa9b"    # Realistic Sitting Dog (pointer)
SHIBA2 = "sketchfab:9abfce885a834399b2c3ccaed51cd474"     # Animated Dog, Shiba Inu
DACHS = "sketchfab:046f4d21810e4bf68feabe393a6b83cf"      # Dog Dachshund
CORGI = "sketchfab:7afb2c8ef92c40819abc690584e6772a"      # corgi dog
BEAGLE = "sketchfab:c199a59fc6b248b99261f24173d2a384"     # Beagle
TERRIER = "sketchfab:51f498df96c049cbb9e600b0a88c5838"    # Realistic Terrier Dog
HACHI = "sketchfab:75a9949393034d5cbc18625bc2bdb810"      # Hachiko statue (bronze Akita)
NETSUKE = "sketchfab:3bf1533c76f94fcd94fe61da58fb4cdc"    # Netsuke in shape of puppy


def path(F, w=34, d=24):
    """A strip of the riverside path: gravel, a kerb of grass."""
    top = slab(F, "base", w, d, 3.0, col="#8a7e6a", style="stone", tone=3.0)
    F.layer("base", id="gravel", op="speckle", density=0.12, shift=-0.9, faces=["up"])
    F.layer("base", id="grass", op="band", axis="z", **{"from": -1.0, "to": -0.6}, wobble=0.25, ramp=F.c("#5a7a32"), tone=3.0, faces=["up", "back"])
    return top


def leash(F, pid, a, b, sag=3.0, col="#c83a2a"):
    """A leash from point a to b with a little sag."""
    mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2]
    F.loft(pid, [((0, 0, 0), 0.5), ((mid[0] - a[0], mid[1] - a[1], mid[2] - a[2]), 0.5), ((b[0] - a[0], b[1] - a[1], b[2] - a[2]), 0.5)], a,
           sides=6, rnd=2, col=col, style="pvc", tone=3.0, caps=(True, True))


def shiba():
    F = Fig(f"{S}/shiba", "Shiba on a Walk", "Curled tail, fox face, absolute refusal to go home yet.")
    top = path(F)
    F.model("dog", SHIBA2, 22, (0, top, 0), yaw=-30)
    F.model_clip("model_dog", "turn", 2.2, amp=-30)
    return F


def sitshiba():
    F = Fig(f"{S}/sitshiba", "Pointer Sits", "Sat down mid-walk, ears up, waiting for the word. It may be some time.")
    top = path(F)
    F.model("dog", POINTER, 22, (0, top, 0), yaw=20)
    F.model_clip("model_dog", "wobble", 1.4, amp=5)
    return F


def dachs():
    F = Fig(f"{S}/dachs", "Long Dachshund", "Mostly dog, length-wise. Takes the corner in two instalments.")
    top = path(F, 38, 22)
    F.model("dog", DACHS, 14, (0, top, 0), yaw=90)
    F.model_clip("model_dog", "slide", 2.0, amp=3, axis="x")
    return F


def corgi():
    F = Fig(f"{S}/corgi", "Corgi Trot", "Short legs, big ears, the happiest bottom on the riverbank.")
    top = path(F)
    F.model("dog", CORGI, 18, (0, top, 0), yaw=-40)
    F.model_clip("model_dog", "hop", 0.9, amp=1.5)
    return F


def pug():
    F = Fig(f"{S}/pug", "Beagle on the Step", "Nose down, ears flapping, following a smell only it can see.")
    top = path(F, 28, 22)
    F.box("step", [18, 4, 10], (0, top + 2, -3), ch=0.6, col="#9a948a", style="stone", tone=3.2)
    F.model("dog", BEAGLE, 15, (0, top, 4), yaw=-15)
    F.box("bowl", [6, 2, 6], (-9, top + 1, 5), ch=1.4, col="#c8473b", style="pvc", tone=3.0)
    F.layer("bowl", id="water", op="band", axis="y", **{"from": 0.6, "to": 1}, ramp=F.c("#5a8ab8"), tone=3.4, faces=["up"])
    F.model_clip("model_dog", "turn", 2.0, amp=25)
    return F


def terrier():
    F = Fig(f"{S}/terrier", "Terrier at the Post", "Read every message on the telegraph pole. Replied to all of them.")
    top = path(F)
    F.cyl("pole", 3.2, 40, (-8, top, -6), sides=12, col="#8a8478", style="stone", tone=3.0)
    F.box("sign", [8, 12, 0.6], (-8, top + 26, -2.6), ch=0.2, col="#e8e2cc", style="tin", tone=4.0)
    F.stamp("sign", text_jp("三丁目", 9), {"#": F.c("#2a4a8a") + ":2"}, "front")
    F.model("dog", TERRIER, 16, (4, top, 2), yaw=-110)
    F.model_clip("model_dog", "turn", 2.0, amp=25)
    return F


def hachi():
    F = Fig(f"{S}/hachi", "The Loyal Akita", "The bronze dog by the station, still waiting. Pat its nose for luck.")
    top = slab(F, "base", 30, 26, 3.6, col="#6a6460", style="rock", tone=2.8)
    F.model("statue", HACHI, 34, (0, top, 0), yaw=-20, mat="metal")
    return F


def netsuke():
    F = Fig(f"{S}/netsuke", "Golden Netsuke Puppy", "A tiny carved puppy from a merchant's sash, covered in gold leaf.")
    top = slab(F, "base", 22, 20, 4.0, col="#3a1e18", style="glaze", tone=2.4)
    F.box("cushion", [14, 2.4, 12], (0, top + 1.2, 0), ch=0.9, col="#7a1e2a", style="velvet", tone=3.0)
    F.model("puppy", NETSUKE, 13, (0, top + 2.4, 0), yaw=-20, mat="metal", recolor=GOLD)
    F.model_clip("model_puppy", "turn", 2.4, amp=30)
    return F


FIGS = {"shiba": shiba, "sitshiba": sitshiba, "dachs": dachs, "corgi": corgi, "pug": pug, "terrier": terrier, "hachi": hachi, "netsuke": netsuke}
