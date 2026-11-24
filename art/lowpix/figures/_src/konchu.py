"""Summer Bug Collection (夏の昆虫採集): the insects of a Japanese summer holiday at life size, from hand-made models
(Sketchfab CC BY; credits in art/lowpix/figures/SOURCES.json),
in the line's finish. Beetles, the mantis and the grub stand on their own legs and bodies; the dragonfly and the
butterfly fly, so they ride a clear rod."""
from figlib import Fig
from props import clear_stand

S = "konchu"
DRAGON = "sketchfab:fa3e5f2704904218a0e971e4edf63e20"     # Dragonfly (Erlangga1)
MANTIS = "sketchfab:ec088115ec8746d79c41f2db69665f15"     # Praying Mantis (VirReal4)
BUTTERFLY = "sketchfab:d642db74a3fa491a8143bd088b408094"  # BUTTERFLY (rukh3d)
CUBE = ["^Cube"]


def tonbo():
    F = Fig(f"{S}/tonbo", "Giant Dragonfly", "Hovering over the rice paddy, four glass wings and eyes that see everything.")
    top = 22.0
    F.model("fly", DRAGON, L=48, at=(0, top, 0), yaw=60)
    clear_stand(F, 0, 0, top + 0.5, "flying: held up on a clear rod")
    F.model_clip("model_fly", "hop", 1.2, amp=1.5)
    return F


def kamakiri():
    F = Fig(f"{S}/kamakiri", "Praying Mantis", "Arms folded, head turning to follow you. It is not praying.")
    F.model("mantis", MANTIS, L=46, yaw=-60, smooth=2.0, rest=True)
    F.model_clip("model_mantis", "turn", 2.2, amp=20)
    return F


def ageha():
    F = Fig(f"{S}/ageha", "Swallowtail Butterfly", "Tails on its wings and a dusting of blue, gone the moment you lift the net.")
    top = 24.0
    F.model("butterfly", BUTTERFLY, L=44, at=(0, top, 0), yaw=-20, pitch=-15, smooth=2.5)
    clear_stand(F, 0, 0, top + 0.5, "flying: held up on a clear rod")
    F.model_clip("model_butterfly", "hop", 0.8, amp=1.2)
    return F


FIGS = {"tonbo": tonbo, "kamakiri": kamakiri, "ageha": ageha}
