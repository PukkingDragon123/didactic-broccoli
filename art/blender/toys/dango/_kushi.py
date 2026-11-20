"""Shared parts for series dango (Dango Skewer Pals, concepts_F.md): the little wooden skewer block every pal stands
in (a plank on two feet, like a geta), the bamboo skewer, the dango balls (squeezed mochi, a little flattened, a soft
bulge round the middle), the spin-and-hop clip, and the paint for wood and bamboo.

    HERE = os.path.dirname(os.path.abspath(__file__))
    sys.path[:0] = [HERE]
    from _kushi import *          # (also brings in sabaku/_bz: Build, low, limb, blob, ear, hand, V3, tk, np, Fig)
    F = Fig('dango', 'hanami'); B = Build()
    stand(B); skewer(B)
    B.add('b3', ball('head', Z3, region='pink'))   # b1 bottom, b2 middle, b3 top: each its own part and bone
    run(F, lambda: spin_rig(F), paint, frames=60)

Layout (mm): the plank's top at TZ, the three balls' centres Z1, Z2, Z3 on the skewer (x = y = 0), radius BR.
"""
import math
import os
import sys

HERE_KS = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE_KS, '..', 'sabaku'), os.path.join(HERE_KS, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403
from _bz import tk, np, low, V3  # noqa: E402

TZ = 3.6                 # the plank's top
BR = 5.6                 # a ball's radius
SQ = 0.86                # ... squashed to this in z
GAP = 2 * BR * SQ - 0.5  # centre to centre (each squeezes the next a little)
Z1 = TZ + 0.3 + BR * SQ
Z2 = Z1 + GAP
Z3 = Z2 + GAP
STICK = Z3 + BR * SQ + 3.6   # the skewer's tip


def stand(B, w=24.0, d=14.0, part='bed'):
    """The skewer block: a cedar plank on two cross feet (a geta), its edges eased."""
    B.add(part, low(tk.rbox('plank', (w, d, 2.0), centre=(0, 0, TZ - 1.0), bevel=0.5, segs=2), 'plank', 40, lo=0, hi=2, region='wood'))
    for sx in (1, -1):
        B.add(part, low(tk.rbox('foot', (2.6, d - 1.0, TZ - 2.0), centre=(sx * w * 0.3, 0, (TZ - 2.0) / 2), bevel=0.35, segs=2), 'foot', 16, lo=0, hi=2,
                        region='wood'))


def skewer(B, top=STICK, part='bed', bottom=TZ - 0.6):
    B.add(part, limb('stick', [(0, 0, bottom), (0, 0, (bottom + top) / 2), (0, 0, top)], [0.6, 0.58, 0.5], tris=24, region='bamboo', n=6,
                     cap0='flat', cap1='point'))


def mochi(h, k=0.06, seed=0):
    """A hand-rolled ball: soft dents and a few creases."""
    ph = np.random.default_rng(seed).uniform(0, 6, 4)
    tk.push(h, lambda V, N: k * (np.sin(V[:, 0] * 1.3 + ph[0]) * np.sin(V[:, 1] * 1.1 + ph[1]) + 0.6 * np.sin(V[:, 2] * 2.1 + V[:, 0] * 0.7 + ph[2])))


def ball(name, z, r=BR, sq=SQ, region='mochi', tris=110, sculpt=None, at=(0.0, 0.0), squash=(1.0, 1.0), seed=0):
    """A dango ball centred on the skewer at height z: flattened top and bottom where it presses on its neighbours."""
    prof = [(0, -1.0), (0.55, -0.93), (0.86, -0.62), (1.0, -0.18), (1.0, 0.18), (0.86, 0.62), (0.55, 0.93), (0, 1.0)]
    o = tk.lathe(name, [(a * r, b * r * sq) for a, b in prof], n=16)
    tk.scale(o, (squash[0], squash[1], 1.0))
    tk.move(o, (at[0], at[1], z))

    def sc(h):
        mochi(h, seed=seed)
        if sculpt:
            sculpt(h)
    return low(o, name, tris, lo=1, hi=3, region=region, sculpt=sc)


def drips(name, z, r, n, region, seed=0, length=2.4, wid=1.0, start=0.0):
    """Syrup / glaze runs down a ball's sides: little tapered tongues lying on the surface."""
    rng = np.random.default_rng(seed)
    out = []
    for i in range(n):
        a = start + 2 * math.pi * i / n + rng.uniform(-0.25, 0.25)
        L = length * rng.uniform(0.7, 1.2)
        pts = []
        for t in np.linspace(0.0, 1.0, 4):
            el = math.radians(40 - 55 * t * L / length)
            pts.append((math.cos(a) * math.cos(el) * (r + 0.05), math.sin(a) * math.cos(el) * (r + 0.05), z + math.sin(el) * r * SQ))
        out.append(limb(name, pts, [wid * 0.8, wid, wid * 0.9, wid * 0.7], tris=12, region=region, n=6, cap1='round'))
    return out


# ------------------------------------------------------------------ the clip: spin, spin, spin, hop
def spin_rig(F, frames=60, hop=7.0, extra=None, centres=(Z1, Z2, Z3)):
    """Bones: root, bed (block and skewer), b1, b2, b3 (the balls, turning on the skewer). Like a slot machine: each
    ball turns once round in turn (the middle the other way), then the head ball hops up off the tip and drops back."""
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('bed', (0, 0, TZ), parent='root')
    for i, z in enumerate(centres):
        R.bone(f'b{i + 1}', (0, 0, z), parent='bed')
    names = ['root', 'bed', 'b1', 'b2', 'b3']
    if extra:
        names += list(extra(R, None) or ())
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    with R.action('gimmick'):
        for b in names:
            k(b, 0)
        for i, (b, sgn, f0) in enumerate((('b1', 1, 3), ('b2', -1, 9), ('b3', 1, 15))):
            k(b, f0)
            k(b, f0 + 12, rot=('Z', sgn * 360), ease='BACK')
            k(b, f0 + 13, ease='CONSTANT')                     # (a whole turn: back where it started)
        k('b3', 31)
        k('b3', 37, move=(0, 0, hop), rot=('Z', 20), ease='QUAD')
        k('b3', 40, move=(0, 0, hop), rot=('Z', -20))
        k('b3', 47, ease='BOUNCE')
        k('b2', 45)
        k('b2', 47, move=(0, 0, -0.5))                          # the middle one squashes as it lands
        k('b2', 51)
        if extra:
            extra(R, k)
        for b in names:
            k(b, frames)
    return R


# ------------------------------------------------------------------ paint
def paint_stand(P, pt, sh):
    X, Yc, Z = P.X, P.Y, P.Z
    P.fill('wood', pt.ramp('#c8965a', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'wood', 'flow': 'along', 'axis': (1, 0, 0), 'L': 9})
    grain = P.region('wood') & (np.abs(np.mod(Yc * 1.6 + 0.5 * np.sin(X * 0.4), 1.4) - 0.7) < 0.1)
    P.shift(grain, -1)
    P.fill('bamboo', pt.ramp('#d8c088', 6, shift=0.05), tone=sh, base=0.15, brush={'preset': 'wood', 'flow': 'along', 'axis': (0, 0, 1), 'L': 6})
    P.shift(P.region('bamboo') & (Z > STICK - 1.6), -1)                                   # the cut tip, a little scorched


def mochi_fill(P, pt, sh, reg, col, base=0.2, brush='pvc'):
    P.fill(reg, pt.ramp(col, 7, shift=0.05, dark=0.5), tone=sh, base=base, brush=brush)


def wrap(name, z, a0, a1, h, region='nori', r=BR, th=0.35, tris=60, nu=10, nv=4, dz=0.0):
    """A sheet wrapped round a ball (a nori strip, a leaf): from azimuth a0 to a1 (degrees, 0 = +x, -90 = the front),
    h above and below the ball's middle (shifted by dz), hugging its surface, th thick."""
    def build(nm, nu_, nv_):
        V, F_ = [], []
        for layer in (0, 1):
            for i in range(nu_):
                a = math.radians(a0 + (a1 - a0) * i / (nu_ - 1))
                for j in range(nv_):
                    zz = dz - h + 2 * h * j / (nv_ - 1)
                    q = min(0.995, abs(zz) / (r * SQ))
                    rr = r * math.sqrt(1 - q * q) + 0.12 + layer * th
                    V.append((rr * math.cos(a), rr * math.sin(a), z + zz * (1 + 0.04 * layer)))
        n_ = nu_ * nv_

        def ix(l, i, j):
            return l * n_ + i * nv_ + j
        for i in range(nu_ - 1):
            for j in range(nv_ - 1):
                F_.append([ix(0, i, j), ix(0, i, j + 1), ix(0, i + 1, j + 1), ix(0, i + 1, j)])
                F_.append([ix(1, i, j), ix(1, i + 1, j), ix(1, i + 1, j + 1), ix(1, i, j + 1)])
        for i in range(nu_ - 1):
            for j in (0, nv_ - 1):
                F_.append([ix(0, i, j), ix(0, i + 1, j), ix(1, i + 1, j), ix(1, i, j)])
        for j in range(nv_ - 1):
            for i in (0, nu_ - 1):
                F_.append([ix(0, i, j), ix(1, i, j), ix(1, i, j + 1), ix(0, i, j + 1)])
        return tk.from_pydata(nm, V, F_)
    lo = build(name, nu, nv)
    hi = build(name + '_hi', nu * 3, nv * 3)
    tk.subsurf(hi, 1)
    tk.push(hi, lambda V, N: 0.04 * np.sin(V[:, 0] * 5.0 + V[:, 2] * 4.0) * np.sin(V[:, 1] * 4.6))
    tk.set_region(hi, region)
    tk.decimate(lo, tris)
    return lo, hi
