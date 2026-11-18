"""Shared parts for series yomise (Deep-Sea Night Stalls, concepts_D.md): the patch of sea floor every stall-keeper
stands on (a lumpy oval of grey ooze with a few pebbles and a snail shell), and paint for the floor and stall wood.

    sys.path: this folder and ../lib
    import _yatai as ya
    lo, hi = ya.seabed(F, rx=14, ry=12)       # its top is about ya.SZ
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)

SZ = 2.6          # the sea floor's top (mm)


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


def box(name, size, c, region, bevel=0.3, rz=0.0):
    hi_ = tk.rbox(name + '_hi', size, centre=c, bevel=bevel, segs=2)
    lo = tk.rbox(name, size, centre=c, bevel=min(bevel, 0.25), segs=1)
    if rz:
        for o in (lo, hi_):
            tk.rotate(o, rz, 'Z', pivot=c)
    tk.set_region(hi_, region)
    return lo, hi_


def seabed(F, rx=14.0, ry=12.0, seed=1, pebbles=4):
    """A flat-bottomed lumpy oval of sea floor: (lo list, hi list)."""
    o = tk.lathe('seabed', [(0, 0.0), (1.0, 0.0), (1.0, SZ * 0.55), (0.82, SZ), (0, SZ + 0.2)], n=20)
    tk.scale(o, (rx, ry, 1.0))
    rng = np.random.default_rng(seed)
    lumps = [(rng.uniform(-rx * 0.7, rx * 0.7), rng.uniform(-ry * 0.7, ry * 0.7), rng.uniform(2.0, 4.0)) for _ in range(7)]

    def sc(h):
        def f(V, N):
            d = sum(0.5 * np.exp(-((V[:, 0] - x) ** 2 + (V[:, 1] - y) ** 2) / r ** 2) for x, y, r in lumps)
            return d * (N[:, 2] > 0.5)
        tk.push(h, f)
    lo, hi = low(o, 'seabed', 120, lo=1, hi=3, sculpt=sc, region='ooze')
    tk.flat_bottom(lo, 0.3)
    los, his = [lo], [hi]
    for i in range(pebbles):
        a = rng.uniform(0, 2 * math.pi)
        c = (rx * 0.78 * math.cos(a), ry * 0.78 * math.sin(a), SZ - 0.2)
        p = tk.lathe('pebble', [(0, -0.4), (1.0, -0.3), (1.2, 0.2), (0.7, 0.7), (0, 0.8)], n=8, centre=c)
        tk.scale(p, (rng.uniform(0.7, 1.3), rng.uniform(0.7, 1.2), 1.0), pivot=c)
        a_, b_ = low(p, 'pebble', 16, lo=0, hi=1, region='pebble')
        los.append(a_)
        his.append(b_)
    return los, his


def paint_seabed(P, pt, sh):
    """Grey-violet deep-sea ooze with pale specks (marine snow), dark pebbles."""
    oz = P.region('ooze')
    P.fill('ooze', pt.ramp('#6e6a7c', 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'pvc', 'flow': 'around', 'L': 1.6})
    who, d = P.dabs(oz & (P.on[:, :, 2] > 0.5), size=0.35, spacing=1.6, seed=7)
    rng = np.random.default_rng(3)
    keep = rng.random(max(int(who.max()) + 1, 1)) < 0.3
    P.fill(oz & (who >= 0) & keep[np.maximum(who, 0)] & (d < 0.6), pt.ramp('#cfd2dc', 4), tone=sh, base=0.2, brush=False)
    P.fill(oz & (P.on[:, :, 2] < 0.4), pt.ramp('#4a4658', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('pebble', pt.ramp('#3e3c46', 5, shift=0.05), tone=sh, base=0.1)


def paint_wood(P, pt, sh, region, col='#a0744a', axis=(1, 0, 0)):
    P.fill(region, pt.ramp(col, 6, shift=0.06), tone=sh, base=0.05, brush={'preset': 'wood', 'flow': 'along', 'axis': axis})
