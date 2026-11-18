"""The keychain hardware for the Blender toy line (src/game/keychains.js): one GLB with three parts the game uses
as its own meshes: a ball-chain bead (2.4 mm nickel ball), the ball-chain connector (a crimped tube the end bead
clicks into) and a screw-in cup hook (the display slots hang keychains from it). Packed as _kit/keychain.

    art/blender/toys/make.sh _kit keychain
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402
from fig import Fig  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()
F = Fig('_kit', 'keychain', size=128, budget=600)

# the bead: a nickel ball with the wire stubs that join it to its neighbours
bead_hi = tk.lathe('bead_hi', [(0, -1.5), (0.25, -1.45), (0.25, -1.1)] + [(1.2 * math.sin(a), -1.2 * math.cos(a)) for a in np.linspace(0.22, math.pi - 0.22, 9)]
                   + [(0.25, 1.1), (0.25, 1.45), (0, 1.5)], n=16)
bead_lo = tk.lathe('bead', [(0, -1.2)] + [(1.2 * math.sin(a), -1.2 * math.cos(a)) for a in np.linspace(0.6, math.pi - 0.6, 3)] + [(0, 1.2)], n=6)
tk.set_region(bead_hi, 'nickel')
F.part('bead', bead_lo, [bead_hi], kind='metal')

# the connector: a 7 mm tube, flared mouths, a crimp line round the middle
cl_prof = [(0, -3.5), (0.75, -3.5), (1.05, -3.2), (1.15, -2.2), (1.1, -0.3), (0.95, 0.0), (1.1, 0.3), (1.15, 2.2), (1.05, 3.2), (0.75, 3.5), (0, 3.5)]
clasp_hi = tk.lathe('clasp_hi', cl_prof, n=16)
clasp_lo = tk.lathe('clasp', [(0, -3.5), (1.05, -3.2), (1.1, 0.0), (1.05, 3.2), (0, 3.5)], n=6)
tk.move(clasp_hi, (0, 0, 3.5)); tk.move(clasp_lo, (0, 0, 3.5))  # (its origin at the end that holds the hook)
tk.set_region(clasp_hi, 'nickel')
F.part('clasp', clasp_lo, [clasp_hi], kind='metal')

# the cup hook: a brass screw going up into the board, a collar, the hook curling forward and up (opening at -y)
shank = tk.lathe('hook_screw_hi', [(0.0, 7.5), (0.35, 7.3)] + [(0.62 if k % 2 else 0.42, 7.0 - k * 0.45) for k in range(13)] + [(0.95, 1.2), (1.6, 1.0), (1.6, 0.4), (0.7, 0.0), (0, 0.0)], n=12)
arc = [(0, -2.6 * math.sin(a), -2.6 - 2.6 * math.cos(a) + 2.6 * 0) for a in np.linspace(0, math.radians(250), 12)]
arc = [(0.0, 0.0, 0.0), (0.0, 0.0, -1.2)] + [(0, 2.6 * math.sin(a), -3.8 + 2.6 * math.cos(a)) for a in np.linspace(math.radians(180), math.radians(-60), 12)]
hook_hi = tk.join([shank, tk.tube('hook_wire_hi', arc, 0.5, n=8)], 'hook_hi')
hook_lo = tk.join([tk.lathe('hook_screw', [(0, 7.5), (0.55, 7.0), (0.6, 1.2), (1.6, 0.8), (0.7, 0.0), (0, 0.0)], n=6),
                   tk.tube('hook_wire', arc[::2] + [arc[-1]], 0.5, n=4)], 'hook')
tk.set_region(hook_hi, 'brass')
F.part('hook', hook_lo, [hook_hi], kind='metal')
F.log('tris', F.tris())

import paint as pt  # noqa: E402

F.unwrap()
F.bake(ao_samples=24, ao_dist=2.0, reuse='--repaint' in ARGS)


def paint(P):
    sh = P.shade(light=0.0, ao=0.7, cav=1.4)
    P.fill('nickel', pt.ramp('#b9bec4', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.5, base=0.15)
    P.fill('brass', pt.ramp('#c39a48', 7, dark=0.65, light=0.6, shift=0.06), tone=sh * 1.5, base=0.1)
    return P.done()


F.finish(paint(pt.Painter(F.maps, F.region_index, F.size)))
F.drop_highs()
F.export(None)
