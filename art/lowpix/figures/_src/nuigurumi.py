"""Plush Pals (ぬいぐるみなかま): real soft toys, hand-made models and 3D scans of plushies (Sketchfab CC BY), made small in the line's finish, sitting on their own."""
from figlib import Fig

S = "nuigurumi"


def f_teddy():
    F = Fig(f"{S}/teddy", "Old Teddy", "Bald at the paws from forty years of hugs. Still the first one in the bed.")
    F.model("m", "sketchfab:459ce5b99da947438d3ea11d7c0d4225", h=36, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "nod", 1.6, amp=12)
    return F


def f_bunny():
    F = Fig(f"{S}/bunny", "Knitted Bunny", "Hand-knitted ears, one a little longer, and a nose of pink thread.")
    F.model("m", "sketchfab:4e5df1084d524a83aa3bacdd41660fb7", h=38, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_penguin():
    F = Fig(f"{S}/penguin", "Penguin Plush", "A round penguin with felt feet. It sits up by itself, which is more than most.")
    F.model("m", "sketchfab:228fddb7362f42e2a349b84cbe8191b4", h=34, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


def f_lamb():
    F = Fig(f"{S}/lamb", "Fleece Lamb", "Lying down in fleece gone soft and grey. It has been through the washing machine six times.")
    F.model("m", "sketchfab:83eb9c35e5784c33b4f94e730b93fd15", L=40, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "nod", 1.6, amp=12)
    return F


def f_fox():
    F = Fig(f"{S}/fox", "Corduroy Fox", "Orange corduroy, a white-tipped tail and a stitched smile that never changes.")
    F.model("m", "sketchfab:9a9460010885486f93774384609fe24f", h=38, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_elephant():
    F = Fig(f"{S}/elephant", "Temple Elephant Plush", "Red flowered cloth, a little blanket on its back, bought at a festival far away.")
    F.model("m", "sketchfab:5072de467d74471fbbc7d945514c5d27", L=40, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_whale():
    F = Fig(f"{S}/whale", "Denim Whale", "Sewn from somebody's old jeans, its seams showing, its tail flipped up.")
    F.model("m", "sketchfab:e099fdc80c954e44b784d9b9127ec4fc", L=46, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "wobble", 1.6, amp=12)
    return F


def f_owl():
    F = Fig(f"{S}/owl", "Patchwork Owl", "Plaid wings, a heart on its tummy and two big felt eyes. Made from the scrap bag.")
    F.model("m", "sketchfab:f174cf27c27c4e5bb816d41ad15394a1", h=38, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "turn", 1.6, amp=12)
    return F


def f_narwhal():
    F = Fig(f"{S}/narwhal", "Rainbow Narwhal", "Spotted, rainbow-finned, with a felt horn. Won at the claw machine on the very last coin.")
    F.model("m", "sketchfab:e328e8d141de47829040efaf55306148", L=46, yaw=-25, mat="matte", rest=12)
    F.model_clip("model_m", "hop", 1.6, amp=4)
    return F


FIGS = {"teddy": f_teddy, "bunny": f_bunny, "penguin": f_penguin, "lamb": f_lamb, "fox": f_fox, "elephant": f_elephant, "whale": f_whale, "owl": f_owl, "narwhal": f_narwhal}
