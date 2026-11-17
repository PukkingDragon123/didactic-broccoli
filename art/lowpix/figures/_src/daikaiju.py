"""Kaiju Diorama (大怪獣ジオラマ): original monsters rampaging through a model-railway city. The monsters are real
creature models made small and repainted (art/lowpix/figures/SOURCES.json); the little city is a lowpix spec."""
from figlib import Fig, GOLD
from props import city_block, slab

S = "daikaiju"
TREX = "sketchfab:6465a297fa784598adc49f6e0042d449"      # Tyrannosaurus
SAURO = "sketchfab:0a43eeb601264d728fb5848ee62482b5"     # Dinosaur (long neck)
ANKY = "sketchfab:9709067ffaf2424b9bbaf1e08a46afac"      # Ankylosaurus
CRAB = "sketchfab:6295676291c141728457ef7550b0650a"      # Giant Crab
TURTLE = "sketchfab:f8fbbd4a2f05416288e4f7836ec61a11"    # Turtle monster
TOAD = "sketchfab:3cc5fe7b9ee34d448b16e04985a0cdf2"      # Toad monster
BEAST = "sketchfab:80b61be8006840918e70a83b96568da0"     # monster dragon
ROBOT = "sketchfab:991ad2e0a9fc44b18ad6fb91e8e714fc"     # Giant Robot Golem


def gyaosaur():
    F = Fig(f"{S}/gyaosaur", "Gyaosaur", "Green, scaled and furious, roaring at the department store. It wanted the rooftop rides.")
    top = city_block(F, seed=1)
    F.model("m", TREX, 28, (0, top, 0), yaw=-40, recolor={"hue": 60, "saturation": 0.9})
    F.model_clip("model_m", "nod", 1.2, amp=10)
    return F


def anky():
    F = Fig(f"{S}/anky", "Armorus", "A walking armoured tank with a club for a tail. The trams run late again.")
    top = city_block(F, seed=2)
    F.model("m", ANKY, 16, (0, top, 0), yaw=-60, recolor={"hue": -20})
    F.model_clip("model_m", "wobble", 1.2, amp=5)
    return F


def kanigon():
    F = Fig(f"{S}/kanigon", "Kanigon", "A giant crab from the bay, sideways down the shopping street, snapping at the signs.")
    top = city_block(F, seed=3)
    F.model("m", CRAB, 14, (0, top, 0), yaw=-20)
    F.model_clip("model_m", "slide", 1.2, amp=4, axis="x")
    return F


def iwagame():
    F = Fig(f"{S}/iwagame", "Iwagame", "A turtle the size of a hill, with a shell of broken rock. Sleeps in the reservoir.")
    top = city_block(F, seed=4)
    F.model("m", TURTLE, 18, (0, top, 0), yaw=-30)
    F.model_clip("model_m", "turn", 2.4, amp=20)
    return F


def gamagon():
    F = Fig(f"{S}/gamagon", "Gamagon", "A warty toad monster with a temple bell for a croak. Rains for a week after.")
    top = city_block(F, seed=5)
    F.model("m", TOAD, 18, (0, top, 0), yaw=-30)
    F.model_clip("model_m", "hop", 1.0, amp=3)
    return F


def okami():
    F = Fig(f"{S}/okami", "Shadow Beast", "A shaggy horned beast from the mountain, prowling the station at midnight.")
    top = city_block(F, seed=6)
    F.model("m", BEAST, 18, (0, top, 0), yaw=-35)
    F.model_clip("model_m", "turn", 2.0, amp=25)
    return F


def tetsujin():
    F = Fig(f"{S}/tetsujin", "Iron Colossus", "The steel giant built to stop them all. Nobody remembers who has the remote.")
    top = city_block(F, seed=7)
    F.model("m", ROBOT, 32, (0, top, 0), yaw=-25, mat="metal")
    F.model_clip("model_m", "nod", 1.4, amp=6)
    return F


def golden():
    F = Fig(f"{S}/golden", "Golden Gyaosaur", "The king of the monsters, cast in gold for the film's twentieth anniversary.")
    top = slab(F, "base", 36, 30, 3.6, col="#2a1e18", style="glaze", tone=2.4)
    F.model("m", TREX, 28, (0, top, 0), yaw=-40, mat="metal", recolor=GOLD)
    F.model_clip("model_m", "nod", 1.2, amp=10)
    return F


FIGS = {"gyaosaur": gyaosaur, "anky": anky, "kanigon": kanigon, "iwagame": iwagame, "gamagon": gamagon, "okami": okami, "tetsujin": tetsujin, "golden": golden}
