"""カラス Fishing Crow Reaper (series shinigami, Reapers' Day Off): A crow reaper standing in a puddle in its tattered cloak, the scythe held out as a fishing rod, the line down in the water. Press: the hood flips back and up comes the catch.

Gimmick: Catch!. Built from the series spec (shinigami/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/shinigami/karasu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)
# the fishing line from the blade's tip down into the puddle, a little fish on the end: its own bone ('catch', on the rod)
TIP = T.A['BLADE_TIP']
END = V3(TIP[0] - 0.4, TIP[1] + 0.6, 4.2)
T.region('line', '#e8e4dc', 'pvc')
T.region('minnow', '#9aa8b0', 'scale')
T.add('catch', limb('line', [TIP, (TIP + END) / 2 + V3(0, 0, 0), END], [0.13, 0.12, 0.12], tris=8, region='line', n=4))
T.add('catch', limb('minnow', [END + V3(0, 0, 0.2), END + V3(0, 0.6, -1.6), END + V3(0, 0.9, -3.0)], [0.55, 0.75, 0.3], tris=18, region='minnow', n=6))
T.add('catch', slab('ftail', [(0, 0), (0.9, 1.0), (1.1, 0.0), (0.9, -1.0)], 0.2, 'minnow', plane='YZ', move=tuple(END + V3(0, 0.9, -3.0)), rot=[(-80, 'X', (0, 0, 0))]))
T.bone('catch', TIP, 'wing_r')
T.gim(seq('catch', [[12, {}], [17, {'rot': ('X', -95), 'ease': 'BACK'}], [30, {'rot': ('X', -80)}], [38, {'rot': ('X', -20)}], [44, {}]]))

T.go()
