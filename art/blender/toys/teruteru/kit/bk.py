"""Agent B's helpers for series teruteru, otsukai, tsuppari, obakebaito and karakuri (concepts_B.md), on top of lib/.

    import os, sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
    import bk
    F = bk.start('teruteru', 'shito')
    ...
    bk.run(F, make_rig, paint, skip=[...], cam=..., fold=(0, 20, 40, 60), frames=90)

- run(): the usual figure-script tail (--preview / --fold / --clip / --fast / --repaint, unwrap, bake, paint, rig,
  export), so each figure script is only its sculpt, its paint and its clip.
- Decal: painted markings (stripes, crests, printed shapes) on a surface seen from one direction, in figure space so
  they wrap across UV seams. Faces are lib/face.py (the owner's hand-drawn rule).
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
from fig import Fig  # noqa: E402
from mathutils import Vector  # noqa: E402

ARGS = sys.argv[1:]


def start(series, fid, budget=1500):
    import facet
    facet.OVERFLOW = True  # (the sack bodies: at the hi-res budget's cap the collapse crushed them to stems)
    tk.reset()
    return Fig(series, fid, budget=budget)


# ------------------------------------------------------------------ painted markings in figure space
class Decal:
    """A drawing plane through c facing `axis` (the viewer's side): U right, V up, W out of the surface.
    m: the texels near the plane on the side that faces the axis (painted details only land there)."""

    def __init__(s, P, c, axis, up=(0, 0, 1), depth=6.0, facing=0.05, where=None):
        s.P = P
        s.U, s.V, s.W, s.a = P.frame(c, axis, up)
        s.m = P.mask & (np.einsum('ijk,k->ij', P.on, s.a) > facing) & (np.abs(s.W) < depth)
        if where is not None:
            s.m &= where

    def dist(s, pts):
        """Distance (mm, in the plane) to a polyline [(u, v), ...]."""
        pts = np.asarray(pts, float)
        d = np.full(s.U.shape, 1e9)
        for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
            dx, dy = bx - ax, by - ay
            L2 = dx * dx + dy * dy + 1e-12
            t = np.clip(((s.U - ax) * dx + (s.V - ay) * dy) / L2, 0, 1)
            d = np.minimum(d, np.hypot(s.U - ax - t * dx, s.V - ay - t * dy))
        return d

    def stroke(s, pts, w, taper=False):
        """A brush line of width w along the polyline (taper: thinner at both ends)."""
        if not taper:
            return s.m & (s.dist(pts) <= w / 2)
        pts = np.asarray(pts, float)
        out = np.zeros_like(s.m)
        n = len(pts) - 1
        for i in range(n):
            k = 0.45 + 0.55 * math.sin(math.pi * (i + 0.5) / n)
            out |= s.dist(pts[i:i + 2]) <= w * k / 2
        return s.m & out

    def ell(s, cu, cv, ru, rv=None, rot=0.0):
        rv = rv or ru
        u, v = s.U - cu, s.V - cv
        if rot:
            c_, s_ = math.cos(math.radians(rot)), math.sin(math.radians(rot))
            u, v = u * c_ + v * s_, -u * s_ + v * c_
        return s.m & ((u / ru) ** 2 + (v / rv) ** 2 <= 1)

    def ring(s, cu, cv, r, w):
        return s.m & (np.abs(np.hypot(s.U - cu, s.V - cv) - r) <= w / 2)

    def poly(s, pts):
        """A filled polygon [(u, v), ...] (even-odd)."""
        pts = np.asarray(pts, float)
        inside = np.zeros(s.U.shape, bool)
        n = len(pts)
        for i in range(n):
            (ax, ay), (bx, by) = pts[i], pts[(i + 1) % n]
            cond = ((ay > s.V) != (by > s.V)) & (s.U < (bx - ax) * (s.V - ay) / (by - ay + 1e-12) + ax)
            inside ^= cond
        return s.m & inside


def arc(cu, cv, r, a0, a1, n=12, ry=None):
    """Points of an arc (degrees, 0 = +u, counter-clockwise) for Face.stroke."""
    ry = ry or r
    return [(cu + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cv + ry * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


def bezier(p0, p1, p2, n=10):
    """A quadratic curve (2D or 3D points) for strokes and spines."""
    p0, p1, p2 = (np.asarray(p, float) for p in (p0, p1, p2))
    return [tuple((1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2) for t in np.linspace(0, 1, n)]


# ------------------------------------------------------------------ small sculpted parts
def drop(name, tip, r, length, region='drop', n=10, axis=(0, 0, -1)):
    """A water drop hanging from `tip`: a lathe teardrop whose point is at tip, its round end r wide down `axis`."""
    L = length
    prof = [(0, 0)]
    for t in np.linspace(0.12, 1.0, 7):
        z = -L * t
        # a teardrop: a cone from the point flowing into a sphere of radius r
        zc = -(L - r)
        rr = r * math.sqrt(max(0.0, 1 - ((z - zc) / r) ** 2)) if z < zc else (r * (-z / (L - r)) ** 0.8 if L > r else r)
        prof.append((max(rr, 0.05), z))
    prof.append((0, -L))
    prof = sorted(prof, key=lambda p: p[1])
    ob = tk.lathe(name, prof, n=n)
    q = Vector((0, 0, -1)).rotation_difference(Vector(axis))
    tk.transform(ob, q.to_matrix().to_4x4())
    tk.move(ob, tip)
    return ob


# ------------------------------------------------------------------ AO only from what moves with the part
class _ObjOps:
    """bpy.ops.object with bake wrapped: an AO bake of a part's game mesh sees only the sculpts of the parts on the
    same bone (plus `also`), so a part that moves never carries another part's shadow (fig.py bakes every part with
    every sculpt in the scene)."""

    def __init__(s, orig, F, also):
        s._orig, s._F, s._also = orig, F, also

    def __getattr__(s, k):
        return getattr(s._orig, k)

    def bake(s, *a, **kw):
        if kw.get('type') != 'AO':
            return s._orig.bake(*a, **kw)
        import bpy
        act = bpy.context.view_layer.objects.active
        me = next((p for p in s._F.parts if p.low is act), None)
        hidden = []
        if me is not None:
            friends = {p.name for p in s._F.parts if p.bone == me.bone} | set(s._also.get(me.name, ()))
            for p in s._F.parts:
                if p.name in friends:
                    continue
                for h in p.highs:
                    hidden.append((h, h.hide_render))
                    h.hide_render = True
        try:
            return s._orig.bake(*a, **kw)
        finally:
            for h, v in hidden:
                h.hide_render = v


def ao_by_bone(F, also=None):
    import bpy
    import fig
    if not isinstance(bpy.ops.object, _ObjOps):
        bpy.ops.object = _ObjOps(bpy.ops.object, F, also or {})
    fig.bpy = bpy


# ------------------------------------------------------------------ the figure-script tail
def run(F, make_rig, paint, skip=(), cam=((62, -70, 50), (0, 0, 14)), lens=50, fold=(0, 30, 52, 68), frames=90,
        tol=0.35, ao_dist=6.0, roughness=0.42, extra_meta=None, cam2=None, ao_also=None):
    """ao_also: {part: [other parts whose sculpts may shade it]} (parts that never move apart)."""
    import bpy
    OUT = os.path.join(F.out, F.id)
    for p in F.parts:
        p.bone = p.bone or 'root'
    F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
    if '--clip' in ARGS:
        from rig import check_clip
        R = make_rig()
        res = check_clip(R, F.parts, range(1, frames + 1), skip=skip, tol=tol)
        for f, L_ in sorted(res.items()):
            print('CLIP', f, L_)
        print('CLIP frames', len(res))
        sys.exit(0)
    if '--preview' in ARGS or '--fold' in ARGS:
        lows = [p.low for p in F.parts]
        highs = [h for p in F.parts for h in p.highs]
        if '--fold' in ARGS:
            R = make_rig()
            R.arm.animation_data.action = bpy.data.actions['gimmick']
            for i, fr in enumerate(fold):
                bpy.context.scene.frame_set(fr)
                tk.preview(OUT + f'_f{i + 1}.png', lows, cam=cam, lens=lens, res=(420, 420))
            sys.exit(0)
        back = cam2 or ((-cam[0][0], -cam[0][1] * 0.95, cam[0][2] * 0.9), cam[1])
        tk.preview(OUT + '_p1.png', highs, cam=cam, lens=lens, res=(480, 480))
        tk.preview(OUT + '_p2.png', highs, cam=back, lens=lens, res=(480, 480))
        tk.preview(OUT + '_p3.png', lows, cam=cam, lens=lens, res=(480, 480))
        sys.exit(0)
    import paint as pt
    fast = '--fast' in ARGS
    F.unwrap()
    F.bake(ao_samples=24 if fast else 128, ao_dist=ao_dist, reuse='--repaint' in ARGS, ao_by_bone=True, ao_also=ao_also or {})
    P = pt.Painter(F.maps, F.region_index, F.size)
    F.finish(paint(P), roughness=roughness)
    F.drop_highs()
    R = make_rig()
    meta = {'blender': True}
    meta.update(extra_meta or {})
    F.export(R, extra_meta=meta)
