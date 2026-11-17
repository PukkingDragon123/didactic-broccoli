"""Helpers for hand-modelled object toys (docs/LOWPOLY.md): lathe forms, handles, seams. Units mm, Y up, front +Z."""
import math


def lathe(F, pid, prof, at=(0, 0, 0), sides=14, col=None, style="enamel", caps=(True, True), **kw):
    """A turned / spun form from a profile [(y, r), ...] bottom to top (an enamel pot, a churn, a bowl, a jug)."""
    rings = [((0, y, 0), [2 * r, 2 * r]) for y, r in prof]
    return F.loft(pid, rings, at, sides=sides, rnd=2.0, subdiv=0, caps=caps, up=[0, 0, 1], col=col, style=style, **kw)


def arc_handle(F, pid, a, b, rise, r, col, style, sides=6, n=5, out=(0, 0, 0)):
    """A bent wire / strap handle from a to b, bowed `rise` mm up (and pushed `out`) at the middle."""
    rings = []
    for i in range(n + 1):
        t = i / n
        k = math.sin(math.pi * t)
        p = [a[j] + (b[j] - a[j]) * t + out[j] * k for j in range(3)]
        p[1] += rise * k
        rings.append((tuple(p), [2 * r, 2 * r]))
    return F.loft(pid, rings, (0, 0, 0), sides=sides, rnd=2.0, subdiv=0, col=col, style=style)


def seam_curve(R, n=64, a=0.72):
    """Points of a baseball / tennis-ball seam on a sphere of radius R (the two-lobed figure-of-eight)."""
    pts = []
    b = 1 - a
    for i in range(n):
        t = 2 * math.pi * i / n
        x = a * math.cos(t) + b * math.cos(3 * t)
        z = a * math.sin(t) - b * math.sin(3 * t)
        y = 2 * math.sqrt(a * b) * math.sin(2 * t)
        L = math.sqrt(x * x + y * y + z * z)
        pts.append((x / L * R, y / L * R, z / L * R))
    return pts
