"""Shared parts for series kasabuki (Umbrella Arms, concepts_D.md): the black-lacquer sword stand (katana-kake) every
umbrella lies on, and umbrella pieces: the closed canopy bundle (a spindle along x with its folds), shafts, rings.

    sys.path: this folder and ../lib
    import _kake as kk
    lo, hi = kk.stand(F)                                  # the umbrella's axis is the line y = 0, z = kk.AZ
    b = kk.bundle('canopy', x0, x1, prof, folds=10)       # -> (lo, hi)
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)

AZ = 13.0             # the umbrella's axis height
PX = 16.5             # the stand's posts (x = +-PX)


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


def box(name, size, c, region, bevel=0.3):
    hi_ = tk.rbox(name + '_hi', size, centre=c, bevel=bevel, segs=2)
    tk.set_region(hi_, region)
    return tk.rbox(name, size, centre=c, bevel=min(bevel, 0.25), segs=1), hi_


def stand(F):
    """The katana-kake: a lacquer plinth and two posts, each with a padded fork at the top for the umbrella."""
    lo, hi = [], []
    for p in (box('plinth', (50.0, 15.0, 2.6), (0, 0, 1.3), 'lacquer', bevel=0.6), box('step', (44.0, 11.0, 1.0), (0, 0, 3.1), 'lacquer', bevel=0.35)):
        lo.append(p[0])
        hi.append(p[1])
    for sx in (1, -1):
        A = AZ - 3.4      # (the post stands on the step at z = 3.4)
        post = tk.slab('post', [(-2.0, 0.0), (2.0, 0.0), (1.4, 3.0), (1.8, A - 2.6), (3.4, A + 1.0), (2.2, A + 1.8), (1.3, A - 0.4), (0.0, A - 1.6),
                                (-1.3, A - 0.4), (-2.2, A + 1.8), (-3.4, A + 1.0), (-1.8, A - 2.6), (-1.4, 3.0)], 3.0, plane='XZ', at=0.0, bevel=0.35, segs=1)
        tk.rotate(post, 90, 'Z')
        tk.move(post, (sx * PX, 0, 3.4))
        a, b = low(post, 'post', 400, lo=0, hi=1, region='lacquer')   # (kept whole: the fork's notch must stay open)
        lo.append(a)
        hi.append(b)
    return lo, hi


def bundle(name, x0, x1, prof, folds=10, n=16, region='canopy', tris=260, depth=0.3, twist=0.0):
    """A closed canopy along x from x0 to x1: prof = [(t, r), ...] with t 0..1 along it; its fabric folds as `folds`
    soft ridges (twisting a little round the axis)."""
    pts = [(r, x0 + t * (x1 - x0)) for t, r in prof]
    o = tk.lathe(name, pts, n=n, axis='X')
    tk.move(o, (0, 0, AZ))

    def sc(h):
        def f(V, N):
            a = np.arctan2(V[:, 2] - AZ, V[:, 1]) + twist * (V[:, 0] - x0)
            return depth * (np.abs(np.sin(a * folds / 2)) ** 0.6 - 0.5)
        tk.push(h, f)
    return low(o, name, tris, lo=1, hi=2, sculpt=sc, region=region)


def rod(name, x0, x1, r, region, n=8, z=None, tris=None):
    o = tk.tube(name, [(x0, 0, AZ if z is None else z), (x1, 0, AZ if z is None else z)], r if hasattr(r, '__len__') else [r, r], n=n, cap0='flat', cap1='flat')
    return low(o, name, tris or n * 4, lo=0, hi=1, region=region)


def ring(name, x, r, w, region, n=12):
    o = tk.lathe(name, [(r * 0.92, -w / 2), (r, -w / 2 + 0.1), (r, w / 2 - 0.1), (r * 0.92, w / 2)], n=n, axis='X')
    tk.move(o, (x, 0, AZ))
    return low(o, name, n * 3, lo=0, hi=1, region=region)


# ------------------------------------------------------------------ paint
def paint_stand(P, pt, sh):
    P.fill('lacquer', pt.ramp('#1c1618', 6, shift=0.05, light=0.35), tone=sh, base=0.0, brush={'preset': 'pvc', 'flow': 'along', 'axis': (1, 0, 0), 'p': 0.1})
    lq = P.region('lacquer')
    P.fill(lq & (P.Z < 2.65) & (P.Z > 2.35) & (np.abs(P.on[:, :, 2]) < 0.5), pt.ramp('#c8a048', 5, shift=0.05), tone=sh, base=0.1, brush=False)     # a gold line round the plinth
    P.fill(lq & (np.abs(P.X) > PX - 2.6) & (P.Z > AZ - 1.8) & (P.on[:, :, 2] > 0.3), pt.ramp('#7a1e22', 5), tone=sh, base=0.1, brush='cloth')  # red felt in the forks
    fr = lq & (P.on[:, :, 1] < -0.7) & (np.abs(P.X) < 3.0) & (np.abs(P.Z - 1.3) < 0.8)
    P.fill(fr, pt.ramp('#c8a048', 5, shift=0.05), tone=sh, base=0.1)                                            # a brass plate on the front


def paint_steel(P, pt, sh, region='steel'):
    P.fill(region, pt.ramp('#c8ced6', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.4, base=0.1, brush={'preset': 'metal', 'flow': 'along', 'axis': (1, 0, 0)})
