"""Shared helpers for series punipuni (Yōkai Squishies, concepts_D.md): the squeeze clip every squishy plays, the
sugary matte squishy finish (soft brushed colour under a fine sugar-grain of lighter and darker specks), lathe / loft
shortcuts.

    sys.path: this folder and ../lib
    import _puni as pu
    pu.squeeze(R, 'body', pop=lambda k, f0, f1: ...)   # in make_rig, inside nothing: it opens the 'gimmick' action
    pu.sugar(P, pt, sh, 'skin', '#f4c4b0')
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)

SQ = (1.3, 0.6, 1.3)      # the full squash (bone space: x, height, depth)


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


def lumps(amp=0.25, f=1.3, seed=0):
    """a sculpt: soft dough lumps"""
    def sc(h):
        def g(V, N):
            return amp * np.sin(V[:, 0] * f + seed) * np.sin(V[:, 1] * f * 1.1 + seed * 2) * np.sin(V[:, 2] * f * 0.9 + seed * 3)
        tk.push(h, g)
    return sc


def squeeze(R, body, others=(), pop=None, n=84):
    """The press clip: squash down and spread (frames 4-12), held squished with a wobble (12-30: pop(k, 12, 30) keys the
    mid-squish expression parts), then the slow rise (30-74) with a little overshoot; rest at n."""
    k = R.key
    with R.action('gimmick'):
        for b in [body] + list(others):
            k(b, 0)
        k(body, 4)
        k(body, 12, scale=SQ, ease='QUAD')
        k(body, 20, scale=(SQ[0] + 0.04, SQ[1] - 0.03, SQ[2] + 0.04))
        k(body, 30, scale=SQ)
        k(body, 62, scale=(0.97, 1.05, 0.97), ease='SINE')
        k(body, 70, scale=(1.01, 0.99, 1.01))
        k(body, 76)
        if pop:
            pop(k, 12, 30)
        for b in [body] + list(others):
            k(b, n)


# ------------------------------------------------------------------ paint
def sugar(P, pt, sh, region, col, n=6, seed=1, base=0.12, shift=0.05, grain=True):
    """The squishy finish: matte soft colour, the brush laid round the form, then a fine sugar grain (tiny specks a
    step lighter and a step darker)."""
    m = P.fill(region, pt.ramp(col, n, shift=shift, dark=0.42, light=0.4), tone=sh, base=base, brush={'preset': 'pvc', 'flow': 'around', 'L': 1.8, 'p': 0.12})
    if grain and m.any():
        who, d = P.dabs(m, size=0.22, spacing=0.55, seed=seed)
        rng = np.random.default_rng(seed)
        side = rng.integers(0, 3, max(int(who.max()) + 1, 1))
        dot = m & (who >= 0) & (d < 0.6)
        P.shift(dot & (side[np.maximum(who, 0)] == 0), 1)
        P.shift(dot & (side[np.maximum(who, 0)] == 1), -1)
    return m
