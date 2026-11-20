"""ヤドカリ Postbox Hermit Crab (series yuubin, Tide Pool Post): A hermit crab who moved into a red pillar postbox: it carries the box around on its back, claws out front, a letter waiting in the slot. Press: it ducks inside and the letter pops up out of the slot.

Gimmick: Post it. Built from the series spec (yuubin/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/yuubin/yadokari.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
