"""ユウレイゴイ Ghost Koi Reaper (series shinigami, Reapers' Day Off): The secret: a pale ghost koi in a little reaper's hood, red-and-white patches faded like old silk, whiskers drifting, a tiny scythe held in one fin, swimming on a curl of will-o'-the-wisp. Press: hood off and it swims a lap of its flame.

Gimmick: Swim. Built from the series spec (shinigami/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/shinigami/koi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)
# kohaku patches faded like old silk on the ghost-white scales (painted), a hint of the hitodama's blue in the fins
def kohaku(P, pt, sh, T):
    X, Y, Z = P.X, P.Y, P.Z
    m = P.region('scale')
    n = np.sin(Y * 0.55 + 1.3) * np.sin(X * 0.9 + Z * 0.5) + 0.6 * np.sin(Y * 1.3 - Z * 0.7)
    P.fill(m & (n > 0.35), pt.ramp('#e0705a', 6, shift=0.06, light=0.55), tone=sh, base=0.25, brush='scale')
    P.fill(m & (Y < -9.5) & (Z > 15.6), pt.ramp('#d8604a', 6, shift=0.06), tone=sh, base=0.2, brush='scale')   # the red crown spot
T.paints.append(kohaku)

T.go()
