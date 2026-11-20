"""クロネコ Napping Cat Reaper (series shinigami, Reapers' Day Off): A black cat reaper sitting with its feet out, eyes shut, a cup of green tea in one paw and the scythe leant on its shoulder, ears poking through the hood. Press: the hood falls back, a big stretch and a sip.

Gimmick: Stretch. Built from the series spec (shinigami/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/shinigami/kuroneko.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
