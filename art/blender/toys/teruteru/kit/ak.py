"""Agent B's animal anatomy helpers (series otsukai, tsuppari, obakebaito, karakuri), on top of lib/tk.py.

stack(): a body or neck lofted through sections stacked along z (front = -y): the usual sitting torso.
spine(): a form lofted along any spine (heads along y, tails along a curve) from per-point sizes.
shell(): a thin cloth / plate lying on a stacked form (a bib, a saddle cloth, a sash), from a 2D outline.
plinth(): a stepped shrine plinth (two or three lacquered steps) to sit an idol on.
Every helper returns (low, [sculpt]) like tk.lowhigh; regions are named by the caller.
"""
import math

import numpy as np

import tk


def stack(name, rings, n=16, tris=300, sculpt=None, region='body', hi=3, cap0='flat', cap1='round', capd=None):
    """rings: [(z, cy, w, ht, hb, e)] bottom to top: centre y, width, half-depth to the front (ht) and back (hb)."""
    R = [{'c': (0, cy, z), 'w': w, 'ht': ht, 'hb': hb, 'e': e} for z, cy, w, ht, hb, e in rings]
    cage = tk.loft(name, R, n=n, up=(0, -1, 0), cap0=cap0, cap1=cap1, capd=capd)
    lo, h = tk.lowhigh(cage, name, lo=1, hi=hi, sculpt=sculpt, region=region)
    tk.decimate(lo, tris)
    return lo, [h]


def stack_at(rings, z):
    """(cy, w, ht, hb) of a stacked form at height z (interpolated)."""
    zs = [r[0] for r in rings]
    return tuple(float(np.interp(z, zs, [r[k] for r in rings])) for k in (1, 2, 3, 4))


def spine(name, pts, w, ht, hb=None, e=2.2, n=12, up=(0, 0, 1), tris=200, sculpt=None, region='body', hi=3,
          cap0='round', cap1='round', capd=None, twist=None):
    """A form lofted along pts with per-point width w, half-heights ht / hb (lists or scalars)."""
    m = len(pts)
    L = lambda v: v if hasattr(v, '__len__') else [v] * m  # noqa: E731
    w, ht, e = L(w), L(ht), L(e)
    hb = L(hb if hb is not None else ht)
    tw = L(twist if twist is not None else 0.0)
    R = [{'c': p, 'w': w[i], 'ht': ht[i], 'hb': hb[i], 'e': e[i], 'twist': tw[i]} for i, p in enumerate(pts)]
    cage = tk.loft(name, R, n=n, up=up, cap0=cap0, cap1=cap1, capd=capd)
    lo, h = tk.lowhigh(cage, name, lo=1, hi=hi, sculpt=sculpt, region=region)
    tk.decimate(lo, tris)
    return lo, [h]


def shell(name, rings, outline, gap=0.35, th=0.8, nu=7, nv=9, tris=80, region='cloth', ripple=0.0, lift=None):
    """A thin cloth on the front of a stacked form: outline(v) -> (x0, x1) its left / right edge at height v in [0, 1]
    over z range outline.z = (z_top, z_bottom). Each point lies on the form's front surface (a superellipse wrap) plus
    gap, `th` thick. lift(x, v) -> extra offset out (a curl). Returns (low, [sculpt])."""
    z0, z1 = outline.z

    def build(nm, nu_, nv_, rip):
        V, F = [], []
        for layer in (0, 1):
            for i in range(nv_):
                v = i / (nv_ - 1)
                z = z0 + (z1 - z0) * v
                cy, w, ht, hb = stack_at(rings, z)
                xa, xb = outline(v)
                for j in range(nu_):
                    x = xa + (xb - xa) * j / (nu_ - 1)
                    q = min(0.999, abs(x) / (w / 2))
                    yf = cy - ht * (1 - q ** 2.4) ** (1 / 2.4)
                    off = gap + (th if layer else 0) + (lift(x, v) if lift else 0) + rip * math.sin(x * 1.3 + v * 5)
                    # (out along the section's normal, approximated: forward, and sideways near the flanks)
                    nx = math.copysign(q ** 1.6, x)
                    V.append((x + nx * off, yf - off * (1 - q ** 1.6 * 0.6), z))
        n_ = nu_ * nv_

        def idx(l, i, j):
            return l * n_ + i * nu_ + j
        for i in range(nv_ - 1):
            for j in range(nu_ - 1):
                F.append([idx(0, i, j), idx(0, i + 1, j), idx(0, i + 1, j + 1), idx(0, i, j + 1)])
                F.append([idx(1, i, j), idx(1, i, j + 1), idx(1, i + 1, j + 1), idx(1, i + 1, j)])
        for i in range(nv_ - 1):
            F.append([idx(0, i, 0), idx(1, i, 0), idx(1, i + 1, 0), idx(0, i + 1, 0)])
            F.append([idx(0, i, nu_ - 1), idx(0, i + 1, nu_ - 1), idx(1, i + 1, nu_ - 1), idx(1, i, nu_ - 1)])
        for j in range(nu_ - 1):
            F.append([idx(0, 0, j), idx(0, 0, j + 1), idx(1, 0, j + 1), idx(1, 0, j)])
            F.append([idx(0, nv_ - 1, j), idx(1, nv_ - 1, j), idx(1, nv_ - 1, j + 1), idx(0, nv_ - 1, j + 1)])
        return tk.from_pydata(nm, V, F)
    lo = build(name, nu, nv, 0.0)
    hi = build(name + '_hi', nu * 4, nv * 4, ripple)
    tk.subsurf(hi, 1)
    tk.set_region(hi, region)
    tk.decimate(lo, tris)
    return lo, [hi]


def plinth(name, steps, region='plinth', tris=120, edge='gold'):
    """steps: [(w, d, h)] bottom to top, centred on x = 0, y = 0; each a softly bevelled lacquered block with a raised
    rim moulding round its top. Returns (low, [sculpt], top_z)."""
    z = 0.0
    los, his = [], []
    for w, d, h in steps:
        c = (0, 0, z + h / 2)
        his.append(tk.rbox(name + '_hi', (w, d, h), centre=c, bevel=0.55, segs=3))
        rim = tk.rbox(name + '_rim', (w + 0.5, d + 0.5, 0.7), centre=(0, 0, z + h - 0.45), bevel=0.3, segs=2)
        tk.set_region(rim, edge)
        his.append(rim)
        los.append(tk.rbox(name, (w, d, h), centre=c, bevel=0.45, segs=1))
        z += h
    for h_ in his:
        if not h_.data.materials:
            tk.set_region(h_, region)
    lo = tk.join(los, name)
    tk.decimate(lo, tris)
    return lo, his, z


def lacquer(P, regs, where=None, base=0.06):
    """Black urushi: a deep near-black ramp kept tight (no speckle), and crisp painted specular highlights (two
    stepped tones, short and sharp) where the form faces the painted key light. Returns the lacquer mask."""
    import paint as pt
    LAC = pt.ramp('#1b1920', 7, shift=0.08, dark=0.45, light=0.45)
    m = np.zeros_like(P.mask)
    for r in regs:
        m |= P.region(r)
    if where is not None:
        m &= where
    sh = P.shade(light=0.0, ao=0.8, cav=0.6)
    P.fill(m, LAC, tone=sh * 0.5, base=base)
    key = np.array((-0.45, -0.62, 0.64))
    key /= np.linalg.norm(key)
    l = np.einsum('ijk,k->ij', P.on, key)
    P.flat(m & (l > 0.9), '#5c5866')
    P.flat(m & (l > 0.965), '#a7a3b0')
    return m


def gold_bands(P, m, field, width, period=None):
    """Bold gold-leaf bands on mask m where |field| < width/2 (or, with period, a band every `period`)."""
    import paint as pt
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    f = np.mod(field, period) - period / 2 if period else field
    band = m & (np.abs(f) < width / 2)
    P.fill(band, GOLD, tone=P.shade(light=0.0, ao=0.8, cav=0.8), base=0.12)
    return band
