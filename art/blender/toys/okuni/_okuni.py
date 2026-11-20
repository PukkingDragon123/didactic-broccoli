"""Shared bits for series okuni (National Animal Parade): each country's national animal in a little costume or with a
prop of its home (simple colour cues only: no flags, crests or emblems). Every figure is its own sculpt (lofts and
tubes from sabaku/_bz.py), faceted low-poly (FACET.md), its species' face from lib/face.py.

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from _okuni import *
"""
import os
import sys

HERE_O = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE_O, '..', 'sabaku'), os.path.join(HERE_O, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403
import face  # noqa: E402

face.SPECIES.update({'okuni/kangaru': 'kangaroo', 'okuni/panda': 'panda', 'okuni/washi': 'eagle', 'okuni/kiwi': 'kiwi',
                     'okuni/biba': 'beaver', 'okuni/yunikon': 'unicorn'})
face.STYLE.update({
    'kangaroo': dict(eye='round', iris='#3a2418', lashes=2, tilt=-4, mouth='muzzle', muzzle='#ecd8b8', eyek=1.1),          # easy-going
    'panda': dict(eye='round', iris='#3a2a20', around=('patch',), patch='#221e22', eyek=1.05, mouth='muzzle', muzzle='#f2efe8'),  # placid
    'eagle': dict(eye='round', iris='#e8c030', around=('ring',), tilt=14, brows=('angry', 1.5), mouth='beakline', eyek=1.05),   # fierce
    'kiwi': dict(eye='round', iris='#2a1e18', eyek=0.9, spread=1.1, mouth=None),                                  # shy, tiny-eyed
    'beaver': dict(eye='round', iris='#2a1e18', tilt=8, brows=('raised', 1.0), mouth='muzzle', muzzle='#c8a88a', eyek=1.1),  # keen
    'unicorn': dict(eye='round', iris='#6a4aa0', lid=True, lashes=3, tilt=6, mouth='muzzle', muzzle='#f4eef0', eyek=1.1),   # proud
})


def lowk(o, name, tris, region, lo=1, hi=2, sculpt=None):
    return low(o, name, tris, lo=lo, hi=hi, region=region, sculpt=sculpt)


def turn(name, prof, c, region, tris=40, n=12, sculpt=None):
    """A turned form (lathe) at c: prof = [(r, z), ...] (z from c)."""
    return lowk(tk.lathe(name, prof, n=n, centre=c), name, tris, region, sculpt=sculpt)


def slabp(name, outline, depth, region, plane='XZ', move=(0, 0, 0), rot=()):
    """A flat cut-out piece (a boomerang, a blade): game mesh unbevelled, sculpt bevelled; rot = [(deg, axis, pivot)]."""
    a = tk.slab(name, outline, depth, plane=plane, at=0.0, bevel=0.0, segs=0)
    b = tk.slab(name + '_hi', outline, depth, plane=plane, at=0.0, bevel=min(0.15, depth * 0.3), segs=2)
    for o in (a, b):
        for deg, ax, pv in rot:
            tk.rotate(o, deg, ax, pivot=pv)
        tk.move(o, move)
    tk.set_region(b, region)
    return a, b


def box(name, size, c, region, bev=0.15):
    """A small bevelled block (game mesh, sculpt)."""
    a = tk.rbox(name, size, centre=c, bevel=bev, segs=1)
    b = tk.rbox(name + '_hi', size, centre=c, bevel=bev, segs=2)
    tk.set_region(b, region)
    return a, b


def grow(B, part, k, pivot):
    """Scale a part's pieces about pivot (the mascot's big head); returns the point map for the face's centre."""
    for a, b in B.p[part]:
        for o in (a, b):
            tk.scale(o, k, pivot=pivot)
    return lambda c: tuple(np.asarray(pivot, float) + k * (np.asarray(c, float) - np.asarray(pivot, float)))


def bands(u, period, width):
    return np.abs(np.mod(u, period) - period / 2) < width / 2


def tartan(P, pt, m, sh, u, v, base='#2a5a3a', dark='#1e2a50', line1='#c8302a', line2='#e8c030', k=1.0):
    """A woven tartan on mask m (u, v: the cloth's two directions, mm): the set, the dark over-checks, the fine lines."""
    P.fill(m, pt.ramp(base, 6, shift=0.05), tone=sh, base=0.1, brush='cloth')
    bu, bv = bands(u, 3.2 * k, 1.4 * k), bands(v, 3.2 * k, 1.4 * k)
    P.fill(m & (bu | bv), pt.ramp(dark, 6, shift=0.05), tone=sh, base=0.1, brush='cloth')
    P.shift(m & bu & bv, -1)
    P.fill(m & (bands(u + 1.6 * k, 3.2 * k, 0.22 * k) | bands(v + 1.6 * k, 3.2 * k, 0.22 * k)), pt.ramp(line1, 5, shift=0.05), tone=sh, base=0.1, brush=False)
    P.fill(m & (bands(u + 0.8 * k, 3.2 * k, 0.16 * k) & ~bv), pt.ramp(line2, 5, shift=0.05), tone=sh, base=0.15, brush=False)


def check(P, pt, m, sh, u, v, red='#c0302a', black='#1e1a1c', k=1.0):
    """Buffalo check: red ground, black squares where the bands cross, dark red where one band runs."""
    P.fill(m, pt.ramp(red, 6, shift=0.05), tone=sh, base=0.1, brush='cloth')
    bu, bv = bands(u, 2.4 * k, 1.2 * k), bands(v, 2.4 * k, 1.2 * k)
    P.shift(m & (bu ^ bv), -2)
    P.fill(m & bu & bv, pt.ramp(black, 5, shift=0.04), tone=sh, base=0.1, brush='cloth')


def go(F, make_rig, paint, frames=64, skip=(), fold=(0, 14, 28, 44), cams=None):
    run(F, make_rig, paint, frames=frames, skip=list(skip), fold=fold,
        cams=cams or [((60, -78, 50), (0, -2, 18)), ((-58, 72, 46), (0, 2, 18))])
