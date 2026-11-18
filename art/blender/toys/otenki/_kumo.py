"""Shared parts for series otenki (Weather Express, concepts_D.md): the cloud scooter every courier rides (a lumpy
cloud on four hidden wheels, a handlebar with a bell at the front, a chrome carrier rack and a number plate at the
back), its `run` clip for the pull-back, and paint for the cloud and the hardware.

    sys.path: this folder and ../lib
    import _kumo as km
    C = km.cloud(F, L=26, W=18, Hc=8, seed=1)   # -> dict: lo, hi (the cloud), seat z (C['top']), rack z, ...
    km.parts(F, C)                              # cloud + wheels as parts (bones cloud, wf, wb)
    km.bones(R, C); km.run(R, C)                # in make_rig
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)

WR = 2.0          # wheel radius (mm): the wheels peek out of the cloud's belly


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


def box(name, size, c, region, bevel=0.3, rz=0.0, rx=0.0):
    hi_ = tk.rbox(name + '_hi', size, centre=c, bevel=bevel, segs=2)
    lo = tk.rbox(name, size, centre=c, bevel=min(bevel, 0.25), segs=1)
    for o in (lo, hi_):
        if rz:
            tk.rotate(o, rz, 'Z', pivot=c)
        if rx:
            tk.rotate(o, rx, 'X', pivot=c)
    tk.set_region(hi_, region)
    return lo, hi_


def rod(name, pts, r, region, n=6):
    o = tk.tube(name, pts, r, n=n, cap0='round', cap1='round')
    return low(o, name, 8 * len(pts) * n // 3 + 8, lo=0, hi=1, region=region)


def cloud(F, L=26.0, W=18.0, Hc=8.0, z0=1.5, seed=1, lumps=1.0, tris=300, region='cloud', tail=0.0, plate=True, bar=True, rack=True):
    """The scooter. L: length (y, front at -y), W: width, Hc: height. tail > 0 curls a wisp up off the back."""
    rng = np.random.default_rng(seed)
    ks = [(-0.5, 0.42), (-0.32, 0.82), (-0.08, 1.0), (0.18, 0.96), (0.38, 0.78), (0.5, 0.42)]
    rings = []
    for t, k in ks:
        ht, hb = Hc * k * 0.72, Hc * k * 0.28
        rings.append({'c': (0.0, t * L, z0 + Hc * 0.28 * k + 0.2), 'w': W * k, 'ht': ht, 'hb': hb, 'e': 2.3, 'bw': 1.05})
    body = tk.loft('cloud', rings, n=20, up=(0, 0, 1), cap0='round', cap1='round', capd=Hc * 0.18)
    bumps = []
    for i in range(int(14 * lumps)):   # puffs on the top and sides (a cumulus' cauliflower)
        a = rng.uniform(0, 2 * math.pi)
        t = rng.uniform(-0.45, 0.45)
        bumps.append((W * 0.5 * math.cos(a) * (1 - abs(t)), t * L, z0 + Hc * (0.45 + 0.4 * abs(math.sin(a))), rng.uniform(2.6, 4.2)))

    def sc(h):
        def f(V, N):
            d = np.zeros(len(V))
            for bx, by, bz, r in bumps:
                q = np.sqrt((V[:, 0] - bx) ** 2 + (V[:, 1] - by) ** 2 + (V[:, 2] - bz) ** 2)
                d += 1.2 * np.exp(-(q / r) ** 2)
            return np.minimum(d, 1.6) * (N[:, 2] > -0.5) - 0.3
        tk.push(h, f)
    cage_bumps = sc
    lo, hi = low(body, 'cloud', tris, lo=1, hi=3, sculpt=cage_bumps, region=(region, [(region + '_belly', lambda C, N: N[:, 2] < -0.55)]))
    sc(lo)    # (the game mesh takes the puffs too, before its facets)
    out = {'lo': [lo], 'hi': [hi], 'L': L, 'W': W, 'Hc': Hc, 'z0': z0, 'top': z0 + Hc * 0.98, 'region': region}
    if tail > 0:   # a wisp curling up off the back
        tw = tk.tube('wisp', [(0, L * 0.42, z0 + Hc * 0.5), (0, L * 0.56, z0 + Hc * 0.8), (0, L * 0.6, z0 + Hc * (0.8 + tail)), (0, L * 0.5, z0 + Hc * (1.0 + tail))],
                     [Hc * 0.3, Hc * 0.26, Hc * 0.2, Hc * 0.1], n=10, cap1='point')
        a, b = low(tw, 'wisp', 80, region=region)
        out['lo'].append(a)
        out['hi'].append(b)
    # the hardware: a handlebar on a stem at the front (bell on the right grip), a carrier rack and a number plate behind
    fy = -L * 0.36
    ty = out['top']
    if bar:
        for p in (rod('stem', [(0, fy, ty - 3.0), (0, fy - 0.6, ty + 2.6)], 0.55, 'chrome'),
                  rod('bar', [(-4.6, fy - 0.2, ty + 3.4), (-2.0, fy - 0.8, ty + 2.6), (2.0, fy - 0.8, ty + 2.6), (4.6, fy - 0.2, ty + 3.4)], 0.45, 'chrome'),
                  rod('grip', [(-5.8, fy + 0.2, ty + 3.6), (-4.2, fy - 0.2, ty + 3.3)], 0.62, 'grip'),
                  rod('grip', [(5.8, fy + 0.2, ty + 3.6), (4.2, fy - 0.2, ty + 3.3)], 0.62, 'grip')):
            out['lo'].append(p[0])
            out['hi'].append(p[1])
        bell = tk.lathe('bell', [(0, 0.0), (1.1, 0.0), (1.0, 0.6), (0.6, 1.0), (0, 1.1)], n=10, centre=(2.9, fy - 0.8, ty + 3.0))
        b_lo, b_hi = low(bell, 'bell', 16, lo=0, hi=1, region='chrome')
        out['lo'].append(b_lo)
        out['hi'].append(b_hi)
    if rack:
        ry = L * 0.3
        rz = z0 + Hc * 0.86
        out['rack'] = (0.0, ry, rz + 0.5)
        for p in (box('rack', (8.0, 6.4, 0.6), (0, ry, rz + 0.2), 'chrome', bevel=0.2),
                  rod('strut', [(-3.6, ry + 3.0, rz + 0.2), (-3.4, ry + 4.4, z0 + Hc * 0.4)], 0.35, 'chrome'),
                  rod('strut', [(3.6, ry + 3.0, rz + 0.2), (3.4, ry + 4.4, z0 + Hc * 0.4)], 0.35, 'chrome')):
            out['lo'].append(p[0])
            out['hi'].append(p[1])
    if plate:
        p = box('plate', (4.6, 0.5, 2.6), (0, L * 0.5 + 0.6, z0 + Hc * 0.3), 'plate', bevel=0.2)
        out['lo'].append(p[0])
        out['hi'].append(p[1])
        out['plate'] = (0, L * 0.5 + 0.85, z0 + Hc * 0.3)
    # the four wheels under its belly
    out['wheels'] = {}
    for nm, y in (('wf', -L * 0.28), ('wb', L * 0.26)):
        lo_, hi_ = [], []
        for sx in (1, -1):
            x0 = sx * (W * 0.3)
            w = tk.cyl(nm + '_hi', WR, x0 - 0.8, x0 + 0.8, n=12, at=(y, WR), axis='X', bevel=0.3, segs=1)
            tk.set_region(w, 'tyre')
            hi_.append(w)
            lo_.append(tk.cyl(nm, WR, x0 - 0.8, x0 + 0.8, n=8, at=(y, WR), axis='X', bevel=0, segs=0))
        out['wheels'][nm] = (lo_, hi_, (0.0, y, WR))
    return out


def parts(F, C, extra_lo=(), extra_hi=()):
    F.part('cloud', tk.join(C['lo'] + list(extra_lo), 'cloud'), C['hi'] + list(extra_hi), bone='cloud')
    for nm, (lo_, hi_, c) in C['wheels'].items():
        F.part(nm, tk.join(lo_, nm), hi_, bone=nm)


def bones(R, C):
    R.bone('root', (0, 0, 0.5))
    R.bone('cloud', (0, 0, C['z0'] + 1.0), parent='root')
    for nm, (lo_, hi_, c) in C['wheels'].items():
        R.bone(nm, c, parent='root')


def spin(R, b, f0, f1, turns, step=4):
    n = max(1, int(round((f1 - f0) / step)))
    for i in range(n + 1):
        R.key(b, f0 + i * step, rot=('X', -360.0 * turns * i / n), ease='LINEAR')


def run(R, C, extra=None, frames=16):
    """The pull-back run: the wheels turn, the cloud bobs and leans into it (frame 0 = the last frame: it loops).
    extra(k, f): keys for the rider's own bones at frames 0, frames / 2 and frames."""
    with R.action('run'):
        for f in (0, frames):
            R.key('cloud', f)
            R.key('root', f)
        R.key('cloud', frames // 2, move=(0, 0, 0.5), rot=('X', -3))
        for nm in C['wheels']:
            spin(R, nm, 0, frames, 1)
        if extra:
            for f in (0, frames // 2, frames):
                extra(R.key, f)


def gimmick_rest(R, C, k, f):
    for b in ['root', 'cloud'] + list(C['wheels']):
        k(b, f)


# ------------------------------------------------------------------ paint
def paint_cloud(P, pt, sh, C, col='#eef0f2', belly='#aab4c4', region=None):
    rg = region or C['region']
    P.fill(rg, pt.ramp(col, 7, shift=0.06, dark=0.5), tone=sh, base=0.15, brush={'preset': 'pvc', 'flow': 'around', 'L': 2.2})
    P.fill(rg + '_belly', pt.ramp(belly, 6, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region(rg) & (P.Z < C['z0'] + C['Hc'] * 0.3), pt.ramp(belly, 6, shift=0.06), tone=sh, base=0.15)


def paint_kit(P, pt, sh, C, plate_ink='#c8302a'):
    P.fill('chrome', pt.ramp('#c7cbd2', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.5, base=0.05)
    P.fill('grip', pt.ramp('#2a2a2c', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('tyre', pt.ramp('#2a2a2c', 5, shift=0.05), tone=sh, base=0.05)
    ty = P.region('tyre') & (np.abs(P.on[:, :, 0]) > 0.7) & (np.hypot(P.Y - np.where(P.Y < 0, -C['L'] * 0.28, C['L'] * 0.26), P.Z - WR) < 0.9)
    P.fill(ty, pt.ramp('#c7cbd2', 5, shift=0.04, light=0.8), tone=sh, base=0.1, brush=False)        # the hubs
    if 'plate' in C:
        P.fill('plate', pt.ramp('#f2eee2', 4), tone=sh, base=0.2)
        pc = C['plate']
        pl = P.region('plate') & (P.on[:, :, 1] > 0.7)
        rim = (np.abs(np.abs(P.X - pc[0]) - 2.0) < 0.18) | (np.abs(np.abs(P.Z - pc[2]) - 1.0) < 0.18)
        P.flat(pl & rim & (np.abs(P.X - pc[0]) < 2.2) & (np.abs(P.Z - pc[2]) < 1.2), plate_ink)
