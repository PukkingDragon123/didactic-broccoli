"""Summer Bug Collection (夏休み昆虫採集): the insects of a Japanese summer holiday, each on its piece of the wood
with the collector's label. Insects are real scans and models (several CC0 specimen scans; SOURCES.json); logs,
leaves and labels are lowpix specs."""
from figlib import Fig, GOLD
from props import slab, log, leaf_card, specimen_label

S = "konchu"
KABUTO = "sketchfab:6395f798f7d243e19975a55b76608a8b"     # CC0 Japanese Rhinoceros Beetle (scan)
MIYAMA = "sketchfab:e821b05809e54ab18d53b51de529666e"     # CC0 Mountain Stag Beetle (scan)
CICADA = "sketchfab:ea9fefe65291491b97412972884657f1"     # Cicada
DRAGON = "sketchfab:fa3e5f2704904218a0e971e4edf63e20"     # Dragonfly
MANTIS = "sketchfab:ec088115ec8746d79c41f2db69665f15"     # Praying Mantis
LARVA = "sketchfab:b67fb6cbe3fa455c81373aaa9f91fa1a"      # CC0 Japanese Rhinoceros Beetle larva (scan)
BUTTERFLY = "sketchfab:d45ea22770f44818949e8933b853c6c4"  # Butterfly
SAKISHIMA = "sketchfab:2e240bc3ebd241ccba0dfa19736397d7"  # CC0 Sakishima Stag Beetle (scan)


def forest(F, w=34, d=24):
    """Forest floor: dark leaf mould over soil."""
    top = slab(F, "base", w, d, 3.0, col="#3e3226", style="leafy", tone=2.6)
    return top


def kabuto():
    F = Fig(f"{S}/kabuto", "Rhinoceros Beetle", "The king of the summer woods, horn up, on a sawtooth-oak log sticky with sap.")
    top = forest(F)
    lt = log(F, "log", 32, 5.5, (0, top, -1), yaw=12)
    F.layer("log", id="sap", op="spots", centers=[[2, 4.5, 3, 2.2]], ramp=F.c("#c8782a"), tone=3.2, bevel={"shadow": 1, "highlight": 1})
    F.model("beetle", KABUTO, 10, (0, lt - 1.0, -0.5), yaw=-30)
    specimen_label(F, "label", "カブトムシ", "TRYPOXYLUS", (9, top + 0.2, 9), yaw=-10)
    F.model_clip("model_beetle", "nod", 1.6, amp=8)
    return F


def miyama():
    F = Fig(f"{S}/miyama", "Mountain Stag Beetle", "Antler jaws and a gold-dusted head. Only found high up the cool valley.")
    top = forest(F)
    lt = log(F, "log", 30, 5.0, (0, top, -1), yaw=-15, col="#5a4030")
    F.model("beetle", MIYAMA, 10, (1, lt - 0.8, 0), yaw=25)
    specimen_label(F, "label", "ミヤマクワガタ", "LUCANUS", (9, top + 0.2, 9), yaw=-10)
    F.model_clip("model_beetle", "turn", 2.0, amp=25)
    return F


def semi():
    F = Fig(f"{S}/semi", "Brown Cicada", "Meeeen-meeeen. Clinging to the bark, singing the whole of August.")
    top = forest(F, 26, 22)
    F.cyl("trunk", 6.5, 34, (0, top, -2), sides=14, col="#5a4634", style="bark", tone=2.9, top=0.9)
    F.model("cicada", CICADA, 6.5, (0, top + 14, 4.6), yaw=180, pitch=90)
    specimen_label(F, "label", "アブラゼミ", "GRAPTOPSALTRIA", (6, top + 0.2, 8), yaw=-15)
    F.model_clip("model_cicada", "wobble", 1.0, amp=3)
    return F


def tonbo():
    F = Fig(f"{S}/tonbo", "Giant Dragonfly", "Perched on the tip of a reed over the paddy, wings flat, eyes everywhere.")
    top = slab(F, "base", 30, 22, 3.0, col="#3a4a3a", style="rock", tone=2.4)
    F.add("water", "box", (0, top + 0.1, 0), size=[26, 0.2, 18], col="#3a6a72", style="glaze", tone=2.6)
    for i, (x, z, h, r) in enumerate([(-6, -3, 26, -6), (-2, 2, 32, 4), (4, -2, 22, 9), (8, 4, 18, -10)]):
        F.loft(f"reed{i}", [((0, 0, 0), 1.2), ((0, h * 0.5, 0), 1.0), ((0.6, h, 0), 0.5)], (x, top, z), sides=6, rnd=2, col="#7a8a3a", style="matte",
               tone=3.0, rot=(0, 0, r), up=[0, 0, 1])
    F.model("fly", DRAGON, 14, (-1.5, top + 32, 2.6), yaw=60, roll=4)
    specimen_label(F, "label", "オニヤンマ", "ANOTOGASTER", (8, top + 0.2, 8), yaw=-15)
    F.model_clip("model_fly", "hop", 1.2, amp=1.5)
    return F


def kamakiri():
    F = Fig(f"{S}/kamakiri", "Praying Mantis", "Arms folded, head tilted. It has already decided about you.")
    top = forest(F, 30, 22)
    F.loft("twig", [((-14, 0, 0), 1.6), ((-4, 3, 1), 1.4), ((6, 5, -1), 1.2), ((14, 8, 0), 0.8)], (0, top + 2.5, -1), sides=8, rnd=2,
           col="#5a4430", style="bark", tone=3.0)
    leaf_card(F, "leaf", 9, (8, top + 8.5, -1), rot=(0, 30, 15))
    F.model("mantis", MANTIS, 15, (-2, top + 5.0, -1), yaw=-60)
    specimen_label(F, "label", "オオカマキリ", "TENODERA", (8, top + 0.2, 8), yaw=-15)
    F.model_clip("model_mantis", "turn", 2.2, amp=20)
    return F


def larva():
    F = Fig(f"{S}/larva", "Beetle Grub", "Fat, curled and glossy in the leaf mould. Next summer it will be a king.")
    top = slab(F, "base", 26, 22, 3.0, col="#2e241c", style="leafy", tone=2.2)
    F.blob("mould", 22, 4, 18, (0, top, 0), col="#3a2c20", style="leafy", tone=2.4, sides=14, rnd=2.2)
    F.model("grub", LARVA, 9, (0, top + 2.5, 0), yaw=30, pitch=0)
    specimen_label(F, "label", "幼虫", "LARVA", (7, top + 0.2, 8), yaw=-15, w=9)
    F.model_clip("model_grub", "wobble", 1.4, amp=6)
    return F


def ageha():
    F = Fig(f"{S}/ageha", "Swallowtail Butterfly", "Wings open on a thistle head for one second. That was the second.")
    top = forest(F, 28, 22)
    F.loft("stem", [((0, 0, 0), 1.0), ((0.5, 12, 0), 0.9), ((0, 20, 0), 0.8)], (0, top, -1), sides=6, rnd=2, col="#4a6a2a", style="matte", up=[0, 0, 1])
    F.blob("flower", 5, 4.5, 5, (0, top + 20, -1), col="#a85aa8", style="matte", tone=3.2, sides=12, rnd=2.2)
    F.layer("flower", id="spikes", op="stripes", axis="around", period=0.06, width=0.4, shift=0.8)
    leaf_card(F, "leaf", 8, (-1, top + 8, -1), rot=(0, -40, -20))
    F.model("butterfly", BUTTERFLY, 9, (0, top + 24.0, -1), yaw=-20, pitch=-15)
    specimen_label(F, "label", "アゲハチョウ", "PAPILIO", (8, top + 0.2, 8), yaw=-15)
    F.model_clip("model_butterfly", "hop", 0.8, amp=1.2)
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Stag Beetle", "A legend of the summer camp: a stag beetle that shines like a temple roof.")
    top = slab(F, "base", 30, 22, 3.6, col="#2a1c14", style="wood", tone=2.4)
    lt = log(F, "log", 28, 5.0, (0, top, -1), yaw=8, col="#4a3424")
    F.model("beetle", SAKISHIMA, 12, (0, lt - 0.8, 0), yaw=-20, mat="metal", recolor=GOLD)
    specimen_label(F, "label", "黄金クワガタ", "AURUM", (9, top + 0.2, 9), yaw=-10)
    F.model_clip("model_beetle", "turn", 2.4, amp=30)
    return F


FIGS = {"kabuto": kabuto, "miyama": miyama, "semi": semi, "tonbo": tonbo, "kamakiri": kamakiri, "larva": larva, "ageha": ageha, "golden": golden}
