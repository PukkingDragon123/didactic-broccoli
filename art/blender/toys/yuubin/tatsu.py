"""タツノオトシゴ Seahorse Express (series yuubin, Tide Pool Post): The secret: the seahorse express rider, curled round a branch of coral with saddlebags of special-delivery post and a tiny peaked cap. Press: it gallops, bobbing up and down like a carousel horse.

Gimmick: Gallop. Built from the series spec (yuubin/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/yuubin/tatsu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
