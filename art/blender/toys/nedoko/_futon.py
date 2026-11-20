"""Shared parts for series nedoko (Sushi Bedtime, concepts_F.md): the conveyor-belt plate, the rice futon (shari), a
topping duvet draped over the sleeper (a thick sheet laid over a form), the sleeper's loaf of a body, the wake-up clip
every bed shares, and the paint for rice, plates and nori.

    HERE = os.path.dirname(os.path.abspath(__file__))
    sys.path[:0] = [HERE]
    from _futon import *          # (also brings in sabaku/_bz: Build, low, limb, blob, ear, V3, tk, np, Fig)
    F = Fig('nedoko', 'maguro'); B = Build()
    plate(B); rice_bed(B)         # the bed part; RZ is the rice's top
    ...
    run(F, lambda: wake_rig(F, hip, neck, pivot), paint, frames=64)

Layout (mm): the plate's well floor at PZ, the rice futon along y (the head end at the front, -y), its top at RZ.
"""
import math
import os
import sys

HERE_FT = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE_FT, '..', 'sabaku'), os.path.join(HERE_FT, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403
from _bz import tk, np, low, V3  # noqa: E402

PR = 14.0      # plate radius
PZ = 1.4       # the plate's well floor
RL = 23.0      # rice futon length (y)
RW = 13.0      # ... width (x)
RH = 5.6       # ... height
RY = 1.6       # ... centre y
RZ = PZ + RH   # the rice's top

PLATES = {  # kaiten plate colours (the plate's colour is its price: here its rarity)
    'white': ('#f2efe6', '#2a5a9a'), 'green': ('#f2efe6', '#3f8a4a'), 'red': ('#f2efe6', '#c8302a'),
    'yellow': ('#f2efe6', '#e8b030'), 'black': ('#26242a', '#c8a040'), 'gold': ('#d8a840', '#8a2a24'),
}


def plate(B, r=PR, part='bed'):
    """A kaiten-zushi plate: a foot ring under, a shallow well, a raised rim with its coloured band."""
    prof = [(0, 0.7), (r * 0.5, 0.7), (r * 0.53, 0.0), (r * 0.63, 0.0), (r * 0.67, 0.6), (r * 0.93, 1.9), (r, 2.7),
            (r * 0.97, 2.95), (r * 0.9, 2.5), (r * 0.74, PZ + 0.15), (r * 0.64, PZ), (0, PZ)]
    o = tk.lathe('plate', prof, n=24)
    B.add(part, low(o, 'plate', 110, lo=0, hi=2, region=('plate', [('rim', lambda C, N: (np.hypot(C[:, 0], C[:, 1]) > r * 0.86) & (C[:, 2] > 1.6))])))


def grains(h, k=0.16, seed=0):
    """Rice-grain lumps over a sculpt (packed oval grains: three crossed waves, only their crests)."""
    ph = np.random.default_rng(seed).uniform(0, 6, 3)

    def f(V, N):
        a = np.sin(V[:, 0] * 3.1 + V[:, 2] * 1.7 + ph[0]) * np.sin(V[:, 1] * 2.3 - V[:, 2] * 2.9 + ph[1]) * np.sin(V[:, 0] * 1.9 + V[:, 1] * 2.7 + ph[2])
        return k * np.clip(a * 1.6, -0.4, 1.0)
    tk.push(h, f)


def rice_bed(B, L=RL, W=RW, H=RH, cy=RY, part='bed', region='rice', tris=150, seed=1):
    """The shari futon: a squeezed rice block, rounded ends, packed grains."""
    y0, y1 = cy - L / 2, cy + L / 2
    rings = [dict(c=(0, y0 + 0.2, PZ + H * 0.45), w=W * 0.8, ht=H * 0.4, hb=H * 0.42, e=2.4),
             dict(c=(0, y0 + 2.4, PZ + H * 0.5), w=W, ht=H * 0.5, hb=H * 0.5, e=2.8),
             dict(c=(0, cy, PZ + H * 0.52), w=W * 1.02, ht=H * 0.5, hb=H * 0.52, e=2.8),
             dict(c=(0, y1 - 2.4, PZ + H * 0.5), w=W, ht=H * 0.5, hb=H * 0.5, e=2.8),
             dict(c=(0, y1 - 0.2, PZ + H * 0.45), w=W * 0.8, ht=H * 0.4, hb=H * 0.42, e=2.4)]
    o = tk.loft('rice', rings, n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=1.2)
    B.add(part, low(o, 'rice', tris, lo=1, hi=3, region=region, sculpt=lambda h: grains(h, seed=seed)))


def sheet(name, fn, nu, nv, th, region, tris, sculpt=None, hi=3):
    """A thick sheet (a topping, a quilt, a flap): fn(u, v) -> (x, y, z) its top surface for u, v in [0, 1], `th` thick
    under it (along its normal). Returns (low, sculpt)."""
    def build(nm, nu_, nv_):
        U, Vv = np.meshgrid(np.linspace(0, 1, nu_), np.linspace(0, 1, nv_), indexing='ij')
        P = np.array([[fn(U[i, j], Vv[i, j]) for j in range(nv_)] for i in range(nu_)], float)
        N = np.cross(np.gradient(P, axis=0), np.gradient(P, axis=1))
        N /= np.linalg.norm(N, axis=2, keepdims=True) + 1e-9
        if N[..., 2].mean() < 0:
            N = -N
        Bt = P - N * th
        V = list(P.reshape(-1, 3)) + list(Bt.reshape(-1, 3))
        n_ = nu_ * nv_

        def ix(l, i, j):
            return l * n_ + i * nv_ + j
        F_ = []
        for i in range(nu_ - 1):
            for j in range(nv_ - 1):
                F_.append([ix(0, i, j), ix(0, i + 1, j), ix(0, i + 1, j + 1), ix(0, i, j + 1)])
                F_.append([ix(1, i, j), ix(1, i, j + 1), ix(1, i + 1, j + 1), ix(1, i + 1, j)])
        for i in range(nu_ - 1):
            for j in (0, nv_ - 1):
                F_.append([ix(0, i, j), ix(1, i, j), ix(1, i + 1, j), ix(0, i + 1, j)])
        for j in range(nv_ - 1):
            for i in (0, nu_ - 1):
                F_.append([ix(0, i, j), ix(0, i, j + 1), ix(1, i, j + 1), ix(1, i, j)])
        return tk.from_pydata(nm, V, F_)
    lo = build(name, nu, nv)
    h = build(name + '_hi', nu * hi, nv * hi)
    tk.subsurf(h, 1)
    if sculpt:
        sculpt(h)
    tk.set_region(h, region)
    tk.decimate(lo, tris)
    return lo, h


def duvet(name, y0, y1, w, top, sides, region, th=1.2, tris=120, curl=0.0, sculpt=None, arch=1.9, foot=None, ends=0.62, roll=3.4):
    """A topping laid over the sleeper like a duvet: from y0 (the head end) to y1, w wide; its crown at `top`, its
    long edges draped down to `sides`; curl lifts the head end's lip (a turned-down sheet); foot: the crown's height at
    the foot end (it settles onto the rice past `ends` of its length)."""
    a = w / 2

    def fn(u, v):
        x = (u - 0.5) * w
        y = y0 + (y1 - y0) * v
        q = min(1.0, abs(x) / a)
        t = top
        if foot is not None and v > ends:                      # past the sleeper's rump it settles down onto the rice
            k = (v - ends) / (1 - ends)
            t = top + (foot - top) * (k * k * (3 - 2 * k))
        z = t - (t - sides) * q ** arch                         # the crown over the body, the edges hanging down
        z += curl * max(0.0, 1 - v * 6) ** 2                     # the head end's lip turned up
        z -= roll * (max(0.0, v - 0.8) / 0.2) ** 2 * (1 - 0.3 * q)  # the foot end rolls down over the rice's end
        z = max(z, sides)                                       # (never through the plate)
        return (x * (1 + 0.04 * math.sin(v * 3.1)), y, z)
    return sheet(name, fn, 9, 8, th, region, tris, sculpt=sculpt)


def loaf(name, y0, y1, w, h, z0, region='fur', tris=160, sculpt=None):
    """The sleeper's body lying on its tummy along y (shoulders at y0, the rump at y1), its belly on z0."""
    rings = [dict(c=(0, y0, z0 + h * 0.5), w=w * 0.72, ht=h * 0.45, hb=h * 0.4, e=2.2),
             dict(c=(0, y0 + (y1 - y0) * 0.3, z0 + h * 0.52), w=w, ht=h * 0.52, hb=h * 0.48, e=2.4),
             dict(c=(0, y0 + (y1 - y0) * 0.75, z0 + h * 0.5), w=w * 1.04, ht=h * 0.5, hb=h * 0.48, e=2.4),
             dict(c=(0, y1, z0 + h * 0.42), w=w * 0.7, ht=h * 0.36, hb=h * 0.36, e=2.2)]
    o = tk.loft(name, rings, n=12, up=(0, 0, 1), cap0='round', cap1='round')
    return low(o, name, tris, lo=1, hi=3, region=region, sculpt=sculpt)


def head(name, c, w, d, h, snout=0.0, region='fur', tris=200, sculpt=None, rules=None):
    """A head lofted front to back (front = -y): w wide, d deep, h tall, a snout pushed forward by `snout`."""
    c = np.asarray(c, float)
    rings = [dict(c=tuple(c + (0, d * 0.48, 0.1 * h)), w=w * 0.55, ht=h * 0.32, hb=h * 0.3),
             dict(c=tuple(c + (0, d * 0.2, 0.05 * h)), w=w * 0.96, ht=h * 0.5, hb=h * 0.46),
             dict(c=tuple(c + (0, -d * 0.12, 0)), w=w, ht=h * 0.5, hb=h * 0.48),
             dict(c=tuple(c + (0, -d * 0.4, -0.1 * h)), w=w * 0.78, ht=h * 0.36, hb=h * 0.36),
             dict(c=tuple(c + (0, -d * 0.5 - snout, -0.16 * h)), w=w * 0.42 + snout * 0.3, ht=h * 0.2, hb=h * 0.2)]
    o = tk.loft(name, rings, n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=min(w, h) * 0.12)
    return low(o, name, tris, lo=1, hi=3, region=(region, rules) if rules else region, sculpt=sculpt)


def paw(name, at, d=(0, -1, 0), r=1.3, region='fur', tris=24):
    """A little front paw laid on the futon edge: a rounded mitt with two toe grooves."""
    at = np.asarray(at, float)
    f = np.asarray(d, float) / np.linalg.norm(d)

    def toes(h):
        def g(V, N):
            q = (V - at) @ np.array([f[1], -f[0], 0.0])
            return -0.12 * (np.abs(np.abs(q) - r * 0.32) < 0.12) * ((V - at) @ f > r * 0.6)
        tk.push(h, g)
    o = tk.loft(name, [dict(c=tuple(at), w=r * 1.6, h=r * 0.6), dict(c=tuple(at + f * r * 1.1), w=r * 2.0, h=r * 0.7),
                       dict(c=tuple(at + f * r * 2.0), w=r * 1.8, h=r * 0.55)], n=8, up=(0, 0, 1), cap0='round', cap1='round')
    return low(o, name, tris, lo=1, hi=3, region=region, sculpt=toes)


# ------------------------------------------------------------------ the clip: wake up, sit up, stretch, back to bed
def wake_rig(F, hip, neck, pivot, frames=64, lift=-128, sit=-36, look=16, extra=None):
    """Bones: root, bed (plate and rice), body (pivots at the hip), head (on the body), neta (the duvet, hinged at
    its foot end). extra(R, k) adds a figure's own bones and keys."""
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('bed', (0, 0, PZ), parent='root')
    R.bone('body', tuple(hip), parent='bed')
    R.bone('head', tuple(neck), parent='body')
    R.bone('neta', tuple(pivot), parent='bed')
    names = {'root', 'bed', 'body', 'head', 'neta'}
    if extra:
        names |= set(extra(R, None) or ())
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        for b in names:
            k(b, 0)
        k('neta', 3)
        k('neta', 13, rot=('X', lift), ease='BACK')
        k('body', 8)
        k('body', 18, rot=('X', sit), ease='BACK')
        k('head', 10)
        k('head', 18, rot=('X', 8))
        k('head', 24, rot=('X', -look))                       # the big yawn, chin up
        k('head', 30, rot=[('X', -look), ('Y', 9)])
        k('head', 36, rot=[('X', -look), ('Y', -9)])
        k('head', 42, rot=('X', 4))
        k('body', 40, rot=('X', sit))
        k('body', 50, ease='QUAD')                            # flop
        k('head', 50)
        k('neta', 46, rot=('X', lift))
        k('neta', 56, ease='BOUNCE')                          # and the duvet back over
        if extra:
            extra(R, k)
        for b in names:
            k(b, frames)
    return R


# ------------------------------------------------------------------ paint
def paint_bed(P, pt, sh, plate_col='white', rice='rice', seed=2):
    """The plate (glaze, its coloured rim band), the rice futon's packed grains."""
    body, band = PLATES[plate_col]
    gold = plate_col == 'gold'
    P.fill('plate', pt.ramp(body, 6, shift=0.04, light=0.5, dark=0.5 if gold else 0.45), tone=sh, base=0.2, brush='metal' if gold else 'gloss')
    P.fill('rim', pt.ramp(body, 6, shift=0.04), tone=sh, base=0.2, brush='gloss')
    X, Yc, Z = P.X, P.Y, P.Z
    rr = np.hypot(X, Yc)
    P.fill(P.region('rim') & (Z > 2.15), pt.ramp(band, 6, shift=0.06), tone=sh, base=0.15, brush='gloss')     # the colour band on the rim
    P.flat(P.region('plate') & (np.abs(rr - PR * 0.62) < 0.12) & (Z < 0.9) & (Z > 0.3), '#8a8478')            # the foot ring's edge
    if P.region(rice).any():
        who, d = P.dabs(P.region(rice), size=0.62, spacing=0.78, seed=seed)
        base = np.where(who >= 0, 0.42 - 0.75 * np.clip(d, 0, 1), -0.35)
        P.fill(rice, pt.ramp('#f3efe4', 6, shift=0.03, dark=0.45), tone=sh, base=base, brush=False)
        P.shift(P.region(rice) & (who >= 0) & (d > 0.86), -1)


def nori(P, pt, sh, reg='nori'):
    P.fill(reg, pt.ramp('#25302a', 6, shift=0.05, light=0.5), tone=sh, base=0.1, brush={'preset': 'cloth', 'flow': 'along', 'axis': (0, 0, 1), 'L': 4})
