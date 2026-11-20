"""モグラ Digging Mole Reaper (series shinigami, Reapers' Day Off): A mole reaper half out of its molehill, digging claws round the scythe it uses as a pick, pink star of a nose sniffing the air. Press: it ducks down the hole, pops up with its hood off and swings the pick.

Gimmick: Dig. Built from the series spec (shinigami/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/shinigami/mogura.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)
# the hole round the mole: a darker ring of fresh soil (painted)
def hole(P, pt, sh, T):
    m = P.region('dirt') & (np.hypot(P.X, P.Y + 0.4) < 6.8)
    P.fill(m, pt.ramp('#3e2a1e', 6, shift=0.05), tone=sh, base=-0.1, brush='pvc')
T.paints.append(hole)

T.go()
