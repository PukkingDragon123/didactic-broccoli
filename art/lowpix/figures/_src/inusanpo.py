"""Walkies! (いぬのおさんぽ): dogs of the neighbourhood, from hand-made models (Sketchfab CC BY; credits in
art/lowpix/figures/SOURCES.json) in the line's finish, standing on their own four feet. The station's bronze Akita
keeps its own pedestal. (Scanned dogs and the netsuke scan removed: never scans.)"""
from figlib import Fig

S = "inusanpo"
SHIBA = "sketchfab:9abfce885a834399b2c3ccaed51cd474"       # Animated Dog, Shiba Inu (quander)
DACHS = "sketchfab:046f4d21810e4bf68feabe393a6b83cf"       # Dog Dachshund (PusztaiAndras)
HACHI = "sketchfab:75a9949393034d5cbc18625bc2bdb810"       # Hachiko statue (a bronze Akita on its pedestal)


def shiba():
    F = Fig(f"{S}/shiba", "Shiba on a Walk", "Curled tail, fox face, absolute refusal to go home yet.")
    F.model("dog", SHIBA, L=42, h=34, yaw=-30)
    F.model_clip("model_dog", "turn", 2.2, amp=-30)
    return F


def dachs():
    F = Fig(f"{S}/dachs", "Long Dachshund", "Mostly dog, length-wise. Takes the corner in two instalments.")
    F.model("dog", DACHS, L=46, yaw=90, level=True)
    F.model_clip("model_dog", "slide", 2.0, amp=3, axis="x")
    return F


def hachi():
    F = Fig(f"{S}/hachi", "The Loyal Akita", "The bronze dog by the station, still waiting on its pedestal. Pat its nose for luck.")
    F.model("statue", HACHI, h=40, w=30, d=30, yaw=-20, mat="metal", cut=0.45, rest=True)
    return F


FIGS = {"shiba": shiba, "dachs": dachs, "hachi": hachi}
