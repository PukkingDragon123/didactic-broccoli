"""Hundred-Year Things (つくも神): old household things that, the story goes, get a soul on their hundredth birthday,
from hand-made models (Sketchfab CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. Real
objects, no cartoon faces; each stands on its own foot, handle or base."""
from figlib import Fig

S = "tsukumo"
LANTERN = "sketchfab:99a3c92192d04d088c9241d1cab3e765"   # Japanese paper lantern
CREST = "sketchfab:6fd5dcdb4702409a8be04e5f0fb2c316"     # Japanese Lamp / Chōchin (with a crest)
UMBRELLA = "sketchfab:3da333ade95d47919ece6934f84cdccb"  # Japanese Umbrella
GETA = "sketchfab:f9785f6152484a44bbd73508655a9741"      # Japanese Geta
KETTLE = "sketchfab:252c28595d3c45fb87095faf71466113"    # Japanese teapot (cast iron)
BROOM = "sketchfab:0b049255562349ad8072afb9c33acfea"     # Simple Outdoor Brooms


def chochin():
    F = Fig(f"{S}/chochin", "Soba Shop Lantern", "The paper lantern from the soba shop door, a hundred summers old. It sways when nobody is near.")
    F.model("m", LANTERN, h=40, L=26, yaw=-10)
    F.model_clip("model_m", "wobble", 1.4, amp=6)
    return F


def kasa():
    F = Fig(f"{S}/kasa", "Oiled Paper Umbrella", "Bamboo ribs and oiled paper, closed and leaning, waiting for a rain that suits it.")
    F.model("m", UMBRELLA, h=44, L=30, yaw=0, level=True)
    F.model_clip("model_m", "hop", 0.8, amp=2)
    return F


def geta():
    F = Fig(f"{S}/geta", "Wooden Geta", "One clog with a red thong, worn hollow at the heel. Clack. Clack. By itself.")
    F.model("m", GETA, L=40, yaw=-30)
    F.model_clip("model_m", "hop", 0.7, amp=3)
    return F


def kettle():
    F = Fig(f"{S}/kettle", "Iron Kettle", "Cast iron, bumpy as a toad, still humming on the brazier after a hundred years.")
    F.model("m", KETTLE, L=36, h=32, yaw=-20, mat="metal", dark=True)
    F.model_clip("model_m", "wobble", 1.0, amp=8)
    return F


def broom():
    F = Fig(f"{S}/broom", "Temple Broom", "The broom that sweeps the temple path at night. It leaves the leaves in the shape of a word.")
    F.model("m", BROOM, h=46, L=24, yaw=0)
    F.model_clip("model_m", "wobble", 1.2, amp=10)
    return F


def mon():
    F = Fig(f"{S}/mon", "Crest Lantern", "The shrine lantern with the family crest. Lit once a year, and it remembers every face.")
    F.model("m", CREST, h=40, L=28, yaw=0)
    F.model_clip("model_m", "hop", 1.0, amp=2)
    return F


FIGS = {"chochin": chochin, "kasa": kasa, "geta": geta, "kettle": kettle, "broom": broom, "mon": mon}
