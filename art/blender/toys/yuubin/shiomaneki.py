"""シオマネキ Fiddler Crab Mail Sorter (series yuubin, Tide Pool Post): A fiddler crab in a postman's cap, holding a letter in its little claw and waving the mail through with its one enormous orange claw. Press: the big claw beckons, wave after wave.

Gimmick: Wave. Built from the series spec (yuubin/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/yuubin/shiomaneki.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
