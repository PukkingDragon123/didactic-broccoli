"""ウサギ Gardener Rabbit Reaper (series shinigami, Reapers' Day Off): A rabbit reaper in the carrot patch, long ears through the slits of its hood, the scythe turned down as a hoe and a little watering can in the other paw. Press: off with the hood, the ears spring up and it waters the carrots.

Gimmick: Water. Built from the series spec (shinigami/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/shinigami/usagi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)
# the carrot patch: three carrots' shoulders showing in the mound, their leafy tops
T.region('carrot', '#e07a2a', 'pvc')
T.region('leaf', '#5a9a3a', 'pvc')
for i, (x, y) in enumerate(((-7.0, -6.4), (-2.4, -9.2), (6.4, -7.2))):
    c = V3(x, y, 2.0)
    T.add('body', turn('carrot', [(0, -0.6), (1.1, -0.4), (1.25, 0.5), (1.0, 1.1), (0, 1.3)], c, 'carrot', tris=24, n=8,
                       sculpt=lambda h: tk.push(h, lambda V, N: -0.08 * (np.abs(np.mod(V[:, 2], 0.5) - 0.25) < 0.05))))
    for a in (0, 120, 240):
        d = V3(math.cos(math.radians(a + 40 * i)), math.sin(math.radians(a + 40 * i)), 0)
        T.add('body', limb('leaf', [c + V3(0, 0, 1.1), c + d * 0.8 + V3(0, 0, 2.6), c + d * 1.8 + V3(0, 0, 3.6)], [0.3, 0.45, 0.15], tris=10, region='leaf', n=5,
                           cap1='point', squash=0.5))

T.go()
