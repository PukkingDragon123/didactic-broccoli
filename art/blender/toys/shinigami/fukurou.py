"""フクロウ Bookworm Owl Reaper (series shinigami, Reapers' Day Off): A big-eyed owl reaper reading a picture book held open in its wings, ear tufts through the hood, the scythe slung across its back. Press: the hood flips back and its head turns right round to see who's there.

Gimmick: Who?. Built from the series spec (shinigami/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/shinigami/fukurou.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
