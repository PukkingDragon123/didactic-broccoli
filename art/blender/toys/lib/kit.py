"""Shared gimmick hardware for the Blender toy line (see art/blender/toys/GIMMICKS.md).

    import kit
    kit.eyepin(F, at=(0, 2, 61), bone='head', axis='Y')   # keychain: the screw eye (ヒートン) on the figure's head;
    ...                                                    # after make_rig(): kit.points(R) adds pt_chain etc.
    kit.connector(F, 'out', at, normal, bone)              # playset: a peg (out) / socket (in) the next part sits on

Each helper adds a part to the figure (low + sculpt, one region it names, kind metal / gloss) and remembers the gimmick
points; call kit.points(R) once the rig exists to write them as pt_<name> joints (Rig.point), bone-parented.
"""
import math

import numpy as np

import tk

PTS = []  # (name, at, bone)


def eyepin(F, at, bone=None, axis='Y', r=1.55, wire=0.42, shank=2.6, region='pin'):
    """A screw eye: a wire loop (outer radius r, its plane facing `axis`) on a short shank going down into the figure
    at `at` (the loop's centre is `r + 0.4` above it). The keychain's ball chain clips through the loop (pt_chain)."""
    cz = r + 0.4
    n = 14
    ring = [(math.cos(2 * math.pi * k / n) * (r - wire), 0.0, cz + math.sin(2 * math.pi * k / n) * (r - wire)) for k in range(n)]
    if axis == 'X':
        ring = [(0.0, x, z) for x, _, z in ring]
    loop_hi = tk.tube('pin_loop_hi', ring, wire, n=8, closed=True)
    loop_lo = tk.tube('pin_loop', ring, wire, n=5, closed=True)
    col_hi = tk.lathe('pin_col_hi', [(0, -shank), (wire * 1.15, -shank + 0.3), (wire * 1.15, 0.0), (wire * 2.1, 0.05), (wire * 2.2, 0.45),
                                    (wire * 1.6, 0.75), (wire * 1.05, 0.95), (0, 1.0)], n=12)
    col_lo = tk.lathe('pin_col', [(0, -shank), (wire * 1.15, -shank + 0.3), (wire * 2.2, 0.2), (wire * 1.2, 0.9), (0, 1.0)], n=6)
    hi = tk.join([loop_hi, col_hi], 'pin_hi')
    lo = tk.join([loop_lo, col_lo], 'pin')
    for o in (hi, lo):
        tk.move(o, at)
    tk.set_region(hi, region)
    F.part('pin', lo, [hi], bone=bone, kind='metal', uvw=0.5)
    PTS.append(('chain', (at[0], at[1], at[2] + cz), bone))
    return lo


def connector(F, name, at, normal=(0, 0, 1), bone=None):
    """A playset joint point: where the next part's pt_in sits (name 'out') or where this part sits on the previous
    one (name 'in'). Model the peg / socket yourself (they are part of the sculpt); this only records the point."""
    PTS.append((name, tuple(at), bone))


def point(name, at, bone=None):
    """Any other gimmick point (a light's centre, a chain anchor)."""
    PTS.append((name, tuple(at), bone))


def points(R):
    """Write the recorded gimmick points into the rig (call after the rig's bones exist)."""
    for name, at, bone in PTS:
        R.point(name, at, bone)
