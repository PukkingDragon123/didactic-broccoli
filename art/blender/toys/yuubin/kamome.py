"""カモメ Airmail Gull (series yuubin, Tide Pool Post): A herring gull on airmail duty, standing on a rock in a peaked cap with the mailbag over its shoulder and a letter held in its beak. Press: a hop and a big flap of the wings, ready for take-off.

Gimmick: Take off. Built from the series spec (yuubin/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/yuubin/kamome.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)
# the herring gull's red spot near the tip of the lower beak, its grey wing tips black with white "mirrors"
TIPB = T.A['BEAK']


def gull(P, pt, sh, T):
    b = P.region('beak')
    P.fill(b & (np.hypot(P.Y - TIPB[1] - 0.9, P.Z - TIPB[2] + 0.1) < 0.55) & (P.Z < TIPB[2] + 0.5), pt.ramp('#d8402a', 5), tone=sh, base=0.15, brush=False)
    w = P.region('wing')
    tipm = w & (P.Z < T.A['ZB'] + 2.6) & (P.Y > 1.0)
    P.fill(tipm, pt.ramp('#2a2a30', 5, light=0.5), tone=sh, base=0.15, brush='feather')
    P.fill(tipm & (np.abs(np.mod(P.Z * 1.4, 1.6) - 0.8) < 0.18), pt.ramp('#f2f0ea', 5), tone=sh, base=0.2, brush=False)
T.paints.append(gull)

T.go()
