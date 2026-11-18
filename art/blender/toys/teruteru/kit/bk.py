"""Agent B's helpers for series teruteru, otsukai, tsuppari, obakebaito and karakuri (concepts_B.md), on top of lib/.

    import os, sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
    import bk
    F = bk.start('teruteru', 'shito')
    ...
    bk.run(F, make_rig, paint, skip=[...], cam=..., fold=(0, 20, 40, 60), frames=90)

- run(): the usual figure-script tail (--preview / --fold / --clip / --fast / --repaint, unwrap, bake, paint, rig,
  export), so each figure script is only its sculpt, its paint and its clip.
- Face: painted strokes, dots and shapes on a surface seen from one direction (mouths, brows, stitches, marker
  lines), in figure space so they wrap across UV seams.
- keychain(): a screw eye, a ball-chain loop and its connector, as one part on its own bone ('chain') with the
  gimmick point pt_hang at the top of the loop.
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
    tk.reset()
    return Fig(series, fid, budget=budget)


# ------------------------------------------------------------------ painted strokes in figure space
class Face:
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


def keychain(top, h=15.0, w=10.5, tilt=(0.0, 0.0), ball=1.15, eye_r=2.3, lean=0.0):
    """The keychain hardware on top of a figure: a screw eye whose shank goes into the figure at `top`, a ball-chain
    loop of height h and width w threaded through it, and the chain's connector capsule. Returns
    (low, [sculpt...], hang_point). Game mesh: thin tubes; sculpt: real balls and links, baked onto them.
    tilt: (degrees about x, about y) of the whole loop; lean: the loop leans back (degrees)."""
    tx, ty = tilt
    t = np.array(top, float)
    # the screw eye: a ring on a short shank
    eye_c = t + np.array((0, 0, 1.0 + eye_r))
    ring_pts = [tuple(eye_c + np.array((eye_r * math.cos(a), 0, eye_r * math.sin(a)))) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)]
    eye_lo = tk.tube('eye', ring_pts[::2], 0.55, n=4, closed=True)
    eye_hi = tk.tube('eye_hi', ring_pts, 0.6, n=10, closed=True)
    tk.subsurf(eye_hi, 1)
    sh_lo = tk.cyl('shank', 0.7, t[2] - 2.5, t[2] + 1.4, n=6, at=(t[0], t[1]), bevel=0, segs=0)
    sh_hi = tk.cyl('shank_hi', 0.75, t[2] - 2.5, t[2] + 1.4, n=12, at=(t[0], t[1]), bevel=0.15, segs=1)
    # the ball-chain loop: a teardrop through the eye's top, standing up (a gashapon keychain as it's photographed)
    base = eye_c + np.array((0, 0, eye_r - 0.2))
    loop = []
    N = 18
    for i in range(N):
        a = 2 * math.pi * i / N
        # teardrop: pinched at the bottom (through the eye), round at the top
        x = w / 2 * math.sin(a) * (0.35 + 0.65 * (1 - math.cos(a)) / 2) ** 0.9
        z = h * (1 - math.cos(a)) / 2
        loop.append(np.array((x, 0.0, z)))
    loop = [base + p for p in loop]

    def tilt_pts(P):
        P = [np.asarray(p, float) - t for p in P]
        out = []
        for p in P:
            v = Vector(p)
            v.rotate(Vector((1, 0, 0)).rotation_difference(Vector((1, 0, 0))))
            from mathutils import Matrix
            M = Matrix.Rotation(math.radians(tx - lean), 3, 'X') @ Matrix.Rotation(math.radians(ty), 3, 'Y')
            out.append(tuple(np.array(M @ v) + t))
        return out
    loop_t = tilt_pts(loop)
    ch_lo = tk.tube('chain', loop_t, 0.62, n=4, closed=True)
    # sculpt: the balls (spheres along the loop) and the short necks between them
    P = np.array(loop_t + [loop_t[0]])
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    L = seg.sum()
    nb = int(L / (ball * 1.32))
    balls = []
    cum = np.concatenate([[0], np.cumsum(seg)])
    conn_at = None
    for k in range(nb):
        s_ = (k + 0.5) * L / nb
        i = np.searchsorted(cum, s_) - 1
        f = (s_ - cum[i]) / seg[i]
        c = P[i] * (1 - f) + P[i + 1] * f
        if k == nb // 2:  # the connector capsule sits at the top of the loop
            conn_at = (c, P[i + 1] - P[i])
            continue
        b = tk.lathe('ball', [(0, -ball / 2), (ball * 0.36, -ball * 0.42), (ball / 2, 0), (ball * 0.36, ball * 0.42), (0, ball / 2)], n=8, centre=tuple(c))
        balls.append(b)
    neck = tk.tube('neck_hi', loop_t, 0.22, n=6, closed=True)
    c, d = conn_at
    d = d / np.linalg.norm(d)
    conn = tk.lathe('conn', [(0, -2.2), (0.75, -2.1), (0.95, -1.6), (0.95, 1.6), (0.75, 2.1), (0, 2.2)], n=10)
    q = Vector((0, 0, 1)).rotation_difference(Vector(tuple(d)))
    tk.transform(conn, q.to_matrix().to_4x4())
    tk.move(conn, tuple(c))
    conn_lo = tk.copy(conn, 'conn_lo')
    tk.decimate(conn_lo, 24)
    hi = tk.join(balls + [neck, conn], 'chain_hi')
    tk.set_region(hi, 'metal')
    tk.set_region(eye_hi, 'metal')
    tk.set_region(sh_hi, 'metal')
    lo = tk.join([ch_lo, eye_lo, sh_lo, conn_lo], 'chain')
    top_pt = max(loop_t, key=lambda p: p[2])
    return lo, [hi, eye_hi, sh_hi], tuple(top_pt)


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
    ao_by_bone(F, ao_also)
    F.unwrap()
    F.bake(ao_samples=24 if fast else 128, ao_dist=ao_dist, reuse='--repaint' in ARGS)
    P = pt.Painter(F.maps, F.region_index, F.size)
    F.finish(paint(P), roughness=roughness)
    F.drop_highs()
    R = make_rig()
    meta = {'blender': True}
    meta.update(extra_meta or {})
    F.export(R, extra_meta=meta)
