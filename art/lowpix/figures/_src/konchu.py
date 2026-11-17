"""Summer Bug Collection (夏の昆虫採集): the insects of a Japanese summer holiday at life size, from CC0 museum-grade
photogrammetry scans (ffish.asia) and hand-made models (Sketchfab CC BY; credits in art/lowpix/figures/SOURCES.json),
in the line's finish. Beetles, the mantis and the grub stand on their own legs and bodies; the dragonfly and the
butterfly fly, so they ride a clear rod."""
from figlib import Fig
from props import clear_stand

S = "konchu"
KABUTO = "sketchfab:6395f798f7d243e19975a55b76608a8b"     # CC0 Japanese Rhinoceros Beetle (ffish.asia scan)
MIYAMA = "sketchfab:e821b05809e54ab18d53b51de529666e"     # CC0 Mountain Stag Beetle (ffish.asia scan)
DRAGON = "sketchfab:fa3e5f2704904218a0e971e4edf63e20"     # Dragonfly (Erlangga1)
MANTIS = "sketchfab:ec088115ec8746d79c41f2db69665f15"     # Praying Mantis (VirReal4)
LARVA = "sketchfab:b67fb6cbe3fa455c81373aaa9f91fa1a"      # CC0 Japanese Rhinoceros Beetle larva (ffish.asia scan)
BUTTERFLY = "sketchfab:d642db74a3fa491a8143bd088b408094"  # BUTTERFLY (rukh3d)
SAKISHIMA = "sketchfab:2e240bc3ebd241ccba0dfa19736397d7"  # CC0 Sakishima Stag Beetle (ffish.asia scan)
CUBE = ["^Cube"]                                          # (the scans' colour-checker cube)


def kabuto():
    F = Fig(f"{S}/kabuto", "Rhinoceros Beetle", "The king of the summer woods, horn up, polished like a new conker.")
    F.model("beetle", KABUTO, w=44, d=30, yaw=-30, drop=CUBE, mat="gloss", dark=True, smooth=2.0)
    F.model_clip("model_beetle", "nod", 1.6, amp=8)
    return F


def miyama():
    F = Fig(f"{S}/miyama", "Mountain Stag Beetle", "Golden fuzz on its back and jaws like antlers. Only found high up, early in the morning.")
    F.model("beetle", MIYAMA, w=44, d=30, yaw=25, drop=CUBE, mat="gloss", smooth=2.0)
    F.model_clip("model_beetle", "turn", 2.0, amp=25)
    return F


def tonbo():
    F = Fig(f"{S}/tonbo", "Giant Dragonfly", "Hovering over the rice paddy, four glass wings and eyes that see everything.")
    top = 22.0
    F.model("fly", DRAGON, w=46, d=46, at=(0, top, 0), yaw=60)
    clear_stand(F, 0, 0, top + 0.5, "flying: held up on a clear rod")
    F.model_clip("model_fly", "hop", 1.2, amp=1.5)
    return F


def kamakiri():
    F = Fig(f"{S}/kamakiri", "Praying Mantis", "Arms folded, head turning to follow you. It is not praying.")
    F.model("mantis", MANTIS, w=40, d=44, yaw=-60, smooth=2.0)
    F.model_clip("model_mantis", "turn", 2.2, amp=20)
    return F


def larva():
    F = Fig(f"{S}/larva", "Beetle Grub", "Dug up from the leaf mould, fat and curled. Next summer it will have a horn.")
    F.model("grub", LARVA, w=32, d=32, yaw=30, drop=CUBE)
    F.model_clip("model_grub", "wobble", 1.4, amp=6)
    return F


def ageha():
    F = Fig(f"{S}/ageha", "Swallowtail Butterfly", "Tails on its wings and a dusting of blue, gone the moment you lift the net.")
    top = 24.0
    F.model("butterfly", BUTTERFLY, w=44, d=40, at=(0, top, 0), yaw=-20, pitch=-15, smooth=1.8)
    clear_stand(F, 0, 0, top + 0.5, "flying: held up on a clear rod")
    F.model_clip("model_butterfly", "hop", 0.8, amp=1.2)
    return F


def golden():
    F = Fig(f"{S}/golden", "Sakishima Stag Beetle", "From the far southern islands: the widest jaws of any stag beetle in Japan. Collectors wait years.")
    F.model("beetle", SAKISHIMA, w=48, d=34, yaw=-20, drop=CUBE, mat="gloss", dark=True, smooth=2.0)
    F.model_clip("model_beetle", "turn", 2.4, amp=30)
    return F


FIGS = {"kabuto": kabuto, "miyama": miyama, "tonbo": tonbo, "kamakiri": kamakiri, "larva": larva, "ageha": ageha, "golden": golden}
