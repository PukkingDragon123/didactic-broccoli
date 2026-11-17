"""Dagashi-ya Toys (だがしやのおもちゃ): the toys from the sweet shop's bottom shelf, from hand-made models and a scan
(Sketchfab CC BY; credits in art/lowpix/figures/SOURCES.json) in the line's finish. They lie or stand on their own and
work in the hand (src/game/toys.js): the kendama bounces, the robot walks, the blaster fires its foam dart, the LCD
game plays on its screen."""
from figlib import Fig

S = "asobi"
ROBOT = "sketchfab:7780d6de101b47e085fc5397f7e33701"     # Vintage Toy Robot (TomScudder)
KENDAMA = "sketchfab:03b652b3678e4eba9fcad09145e51aa0"   # Japanese bilboquet (kayaaku, scan)
BLASTER = "sketchfab:013151b2d05e473fb391b298adfd62d1"   # Sci Fi Ray Gun (pfontaine23): a toy blaster
LCD = "sketchfab:835048164013473cb675841e27b67ee5"       # Auto Race - 80's Handheld Game (tiagobarrozzo)


def robot():
    F = Fig(f"{S}/robot", "Wind-up Tin Robot", "Click to wind it up and set it down. It walks until it forgets why.")
    F.model("m", ROBOT, h=44, L=28, yaw=-20, mat="gloss")
    return F


def kendama():
    F = Fig(f"{S}/kendama", "Lacquer Kendama", "Click to flip the ball: big cup, small cup... spike? One in a hundred. Probably.")
    F.model("m", KENDAMA, h=44, L=30, yaw=-20, mat="gloss", level=True)
    return F


def dartgun():
    F = Fig(f"{S}/dartgun", "Foam Dart Blaster", "Click to fire. The darts stick to walls, windows and very surprised neighbours.")
    b = F.model("m", BLASTER, L=44, yaw=90, mat="gloss")
    # the foam dart it fires (a separate part the game launches): orange foam, a red suction cup
    F.cyl("dart", 1.4, 10.0, (b.hi[0] - 2.0, b.centre[1], 0), sides=10, col="#e8742a", style="matte", rot=(0, 0, -90))
    F.layer("dart", id="cup", op="band", axis="y", **{"from": 0.8, "to": 1.0}, ramp=F.c("#c8302a"), tone=3.0)
    F.pt("muzzle", (b.hi[0] + 2.0, b.centre[1], 0))
    F.meta["separate"] = ["dart"]
    return F


def lcdgame():
    F = Fig(f"{S}/lcdgame", "Pocket LCD Game", "Click to play Capsule Dash. The high score is still 9999 from 1983. Nobody knows who.")
    F.model("m", LCD, L=40, yaw=0, pitch=-70)
    return F


FIGS = {"robot": robot, "kendama": kendama, "dartgun": dartgun, "lcdgame": lcdgame}
