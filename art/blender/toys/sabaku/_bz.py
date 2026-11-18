"""Agent E's shared builder for the homage series (sabaku, minato, datesha, janru; concepts_E.md): a posed
anthropomorphic animal from lofts and tubes (limbs, hands, shoes, ears), the series bases, the clear-tint spirit's
pop-out keys and a few paint helpers. Faceted low-poly (FACET.md): build with GG_FACET=1.

    HERE = os.path.dirname(os.path.abspath(__file__))
    sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
    from _bz import *
"""
import math
import os
import sys

import numpy as np

HERE_BZ = os.path.dirname(os.path.abspath(__file__))
if os.path.join(HERE_BZ, '..', 'lib') not in sys.path:
    sys.path.insert(0, os.path.join(HERE_BZ, '..', 'lib'))
import tk  # noqa: E402  (imports bpy first)
from fig import Fig, cli  # noqa: E402,F401

V3 = lambda *a: np.array(a, float)  # noqa: E731


K = float(os.environ.get('GG_BZ_K', 1.0))   # every piece's smooth-line budget times this (a build-wide detail knob)


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    """lowhigh + decimate: (game mesh, sculpt)."""
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, max(tris, int(round(tris * K))) if tris > 16 else tris)
    return a, b


class Build:
    """Pieces gathered per part, committed as F.part()s: B.add('body', piece, ...); B.commit(F, kinds=...)."""

    def __init__(s):
        s.p = {}

    def add(s, part, *pieces):
        s.p.setdefault(part, []).extend(pieces)

    def commit(s, F, bones=None, kinds=None, uvw=None):
        for nm, L in s.p.items():
            F.part(nm, tk.join([a for a, b in L], nm), [b for a, b in L], bone=(bones or {}).get(nm, nm),
                   kind=(kinds or {}).get(nm, 'matte'), uvw=(uvw or {}).get(nm, 1.0))


def basis(d, up=(0, 0, 1)):
    """forward, side, up unit vectors for a direction d."""
    f = np.asarray(d, float)
    f = f / np.linalg.norm(f)
    s = np.cross(f, up)
    if np.linalg.norm(s) < 1e-4:
        s = np.cross(f, (0, -1, 0))
    s = s / np.linalg.norm(s)
    return f, s, np.cross(s, f)


def limb(name, pts, radii, tris=40, region='cloth', n=8, cap0='round', cap1='round', sculpt=None, e=2.0):
    """A sleeve / leg / tail: a tube through pts."""
    return low(tk.tube(name, [tuple(p) for p in pts], radii, n=n, cap0=cap0, cap1=cap1, e=e), name, tris, region=region,
               sculpt=sculpt)


def blob(name, c, r, tris=24, region=None, n=8, squash=(1, 1, 1), lo=1, hi=2):
    """A little ellipsoid (a knuckle, a bead, a nose, a pebble)."""
    o = tk.lathe(name, [(0, -r), (r * 0.75, -r * 0.66), (r, 0), (r * 0.75, r * 0.66), (0, r)], n=n, centre=(0, 0, 0))
    tk.scale(o, squash)
    tk.move(o, tuple(c))
    return low(o, name, tris, lo=lo, hi=hi, region=region or name)


def hand(name, at, d, r=1.8, kind='mitt', region='skin', up=(0, 0, 1), tris=36, curl=0.0):
    """A hand from the wrist `at` reaching along d: 'mitt' (fingers together), 'fist', 'point' (index finger out),
    'open' (four spread fingers), 'claw' (three hooked claws). Returns a list of pieces."""
    f, s, u = basis(d, up)
    at = np.asarray(at, float)
    L = {'fist': 1.4, 'point': 1.5}.get(kind, 2.1) * r
    rings = [{'c': tuple(at), 'w': 1.25 * r, 'h': 0.55 * r}, {'c': tuple(at + f * L * 0.5), 'w': 1.9 * r, 'h': 0.62 * r},
             {'c': tuple(at + f * L - u * curl * r), 'w': 1.75 * r, 'h': 0.55 * r}]
    palm = tk.loft(name, rings, n=8, up=tuple(u), cap0='round', cap1='round', capd=0.5 * r)
    out = [low(palm, name, tris, region=region)]
    tb = at + f * L * 0.35 + s * 0.9 * r
    out.append(limb(name + '_th', [tb, tb + f * 0.6 * r + s * 0.6 * r - u * 0.2 * r, tb + f * 1.1 * r + s * 0.55 * r], [0.42 * r, 0.38 * r, 0.33 * r],
                    tris=14, region=region, n=6))
    if kind == 'point':
        b0 = at + f * L * 0.9 + s * 0.45 * r + u * 0.1 * r
        out.append(limb(name + '_ix', [b0, b0 + f * 1.5 * r], [0.36 * r, 0.32 * r], tris=14, region=region, n=6))
    elif kind == 'open':
        for i, a in enumerate((-24, -8, 8, 24)):
            fa = f * math.cos(math.radians(a)) + s * math.sin(math.radians(a))
            b0 = at + f * L * 0.85 + s * (i - 1.5) * 0.45 * r
            out.append(limb(name + f'_f{i}', [b0, b0 + fa * 1.3 * r - u * curl * r], [0.32 * r, 0.27 * r], tris=12, region=region, n=6))
    elif kind == 'claw':
        for i, a in enumerate((-18, 0, 18)):
            fa = f * math.cos(math.radians(a)) + s * math.sin(math.radians(a))
            b0 = at + f * L * 0.85 + s * (i - 1) * 0.6 * r
            out.append(limb(name + f'_c{i}', [b0, b0 + fa * 1.2 * r, b0 + fa * 1.9 * r - u * 0.7 * r], [0.34 * r, 0.26 * r, 0.06 * r], tris=14,
                            region=region + '_claw' if region in ('skin', 'fur') else region, n=6, cap1='point'))
    return out


def shoe(name, heel, d=(0, -1, 0), L=7.0, W=3.8, H=2.6, region='shoe', tris=36, toe_up=0.4):
    """A shoe / boot foot on the floor: its heel's floor point `heel`, the toe along d (horizontal)."""
    f, s, u = basis((d[0], d[1], 0))
    h = np.asarray(heel, float)
    rings = [{'c': tuple(h + f * 0.4 + u * H * 0.5), 'w': W * 0.8, 'ht': H * 0.5, 'hb': H * 0.5, 'e': 2.6},
             {'c': tuple(h + f * L * 0.45 + u * H * 0.5), 'w': W, 'ht': H * 0.55, 'hb': H * 0.5, 'e': 2.6},
             {'c': tuple(h + f * L * 0.85 + u * (H * 0.42 + toe_up * 0.5)), 'w': W * 0.92, 'ht': H * 0.38, 'hb': H * 0.42, 'e': 2.4}]
    o = tk.loft(name, rings, n=10, up=tuple(u), cap0='round', cap1='round', capd=0.6)
    return low(o, name, tris, region=region)


def ear(name, base, tip, w, th=0.9, region='fur', tris=14, cup=(0, -1, 0)):
    """A pointed animal ear from base to tip (w wide at the base), its hollow facing `cup`."""
    b, t = np.asarray(base, float), np.asarray(tip, float)
    m = b + (t - b) * 0.45
    o = tk.loft(name, [{'c': tuple(b), 'w': w, 'h': th}, {'c': tuple(m), 'w': w * 0.82, 'h': th * 0.8}, {'c': tuple(t), 'w': w * 0.1, 'h': th * 0.3}],
                n=8, up=tuple(cup), cap0='round', cap1='point')
    return low(o, name, tris, region=region)


def drift(name='base', r=14.0, h=3.0, seed=1, region='sand', tris=80, squash=(1.0, 0.86, 1.0)):
    """The sabaku base: a little wind-swept sand drift with ripples (its top at about h)."""
    prof = [(0, 0), (r, 0), (r * 1.0, h * 0.3), (r * 0.84, h * 0.82), (r * 0.5, h * 1.0), (0, h * 1.04)]
    o = tk.lathe(name, prof, n=20, centre=(0, 0, 0))
    tk.scale(o, squash)
    rng = np.random.default_rng(seed)
    ph = rng.uniform(0, 6)

    def sc(hh):
        def f(V, N):
            top = tk.smoothstep(0.3, 0.8, N[:, 2])
            rip = 0.22 * np.sin(V[:, 1] * 1.25 + 1.4 * np.sin(V[:, 0] * 0.21 + ph))
            return top * rip
        tk.push(hh, f)
    return low(o, name, tris, lo=1, hi=3, region=region, sculpt=sc)


def cobbles(name='base', r=14.0, h=3.0, seed=2, region='stone', tris=80):
    """The minato base: a round of harbour cobbles (setts with sunk joints)."""
    o = tk.lathe(name, [(0, 0), (r, 0), (r * 1.01, h * 0.8), (r * 0.94, h), (0, h)], n=20, centre=(0, 0, 0))

    def sc(hh):
        def f(V, N):
            top = tk.smoothstep(0.5, 0.9, N[:, 2])
            gx = np.abs(np.mod(V[:, 0] + 0.5 * np.floor(V[:, 1] / 2.6) * 2.6, 3.4) - 1.7)
            gy = np.abs(np.mod(V[:, 1], 2.6) - 1.3)
            return -0.3 * top * ((gx > 1.45) | (gy > 1.1))
        tk.push(hh, f)
    return low(o, name, tris, lo=1, hi=3, region=region, sculpt=sc)


def plinth(name='base', r=13.5, h=2.6, region='marble', tris=60, n=12):
    """The datesha base: a low round (n-sided) marble plinth with a chamfer."""
    o = tk.lathe(name, [(0, 0), (r, 0), (r, h * 0.7), (r * 0.94, h), (0, h)], n=n, centre=(0, 0, 0))
    return low(o, name, tris, lo=0, hi=2, region=region)


# ------------------------------------------------------------------ the spirit: rides small, swells up on the press
def spirit_keys(k, bone, f0, f1, f2, f3, grow, move, ease='BACK'):
    """The spirit's pop: rest until f0, swell to `grow` x and step by `move` (mm) by f1, hold to f2, back by f3."""
    k(bone, f0)
    k(bone, f1, scale=grow, move=move, ease=ease)
    k(bone, f2, scale=grow, move=move)
    k(bone, f3, ease='QUAD')


def run(F, make_rig, paint, frames=90, skip=(), cams=None, fold=(0, 30, 52, 68), tol=0.35):
    cli(F, make_rig, paint, clip=dict(frames=range(1, frames + 1), skip=list(skip), tol=tol),
        cams=cams or [((62, -78, 52), (0, -1, 22)), ((-60, 70, 46), (0, 1, 22))], fold=fold)


# ------------------------------------------------------------------ paint helpers
def ghost(P, pt, reg, col, tone, lines=True):
    """A spirit's clear tint: a pale, even ramp (it is the glass material that makes it see-through)."""
    P.fill(reg, pt.ramp(col, 6, shift=0.07, light=0.5, dark=0.75), tone=tone * 0.8, base=-0.15, brush='gloss')


def sand(P, pt, tone, col='#d9b77a'):
    P.fill('sand', pt.ramp(col, 7, shift=0.06), tone=tone, base=0.1, brush={'preset': 'pvc', 'flow': 'around'})
    X, Yc = P.X, P.Y
    rip = P.region('sand') & (np.abs(np.sin(Yc * 1.25 + 1.4 * np.sin(X * 0.21))) > 0.93) & (P.on[:, :, 2] > 0.5)
    P.shift(rip, -1)
