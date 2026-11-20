"""フグ Parcel Puffer (series yuubin, Tide Pool Post): A pufferfish courier in a postman's cap with a parcel tied on its back, riding a little swell of water. Press: it puffs up round, spines out, and the cap pops off.

Gimmick: Puff. Built from the series spec (yuubin/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/yuubin/fugu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
