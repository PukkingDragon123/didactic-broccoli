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
- hand_face(): the owner's hand-drawn face: two uneven ink dots and one brush-stroke mouth (docs/ref/faces_owner.png).
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


# ------------------------------------------------------------------ hand-drawn faces (the owner's rule, docs/ref/faces_owner.png)
INK = '#1f1a1d'


def _wob(t, seed, k=1.0):
    """A smooth seeded wobble (-1..1) along a parameter t: a quick marker hand."""
    r = np.random.default_rng(seed)
    a, b, c = r.uniform(0, 6.3, 3)
    return k * (0.55 * np.sin(t * 5.1 + a) + 0.3 * np.sin(t * 11.3 + b) + 0.15 * np.sin(t * 23.0 + c))


def ink_dot(f, cu, cv, w, h, rot=0.0, seed=0):
    """A solid ink dot: a slightly lumpy, slightly tilted oval (never a perfect circle). w, h: full size (mm)."""
    u, v = f.U - cu, f.V - cv
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    u, v = u * cr + v * sr, -u * sr + v * cr
    th = np.arctan2(v / h, u / w)
    rr = 1 + 0.09 * _wob(th / 2, seed) + 0.06 * np.cos(2 * th + seed)
    return f.m & ((u / (w / 2)) ** 2 + (v / (h / 2)) ** 2 <= rr * rr)


def ink_line(f, pts, w, seed=0, press=(0.75, 1.0, 0.8), jitter=0.06, n=24):
    """One brush stroke along a polyline [(u, v), ...]: pressure (width factor at start, middle, end) and a slight
    sideways wobble, like a quick marker line. w: the widest width (mm)."""
    P = np.asarray(pts, float)
    seg = np.linalg.norm(np.diff(P, axis=0), axis=1)
    cum = np.concatenate([[0], np.cumsum(seg)])
    ts = np.linspace(0, 1, n)
    Q = np.stack([np.interp(ts * cum[-1], cum, P[:, 0]), np.interp(ts * cum[-1], cum, P[:, 1])], 1)
    d = np.gradient(Q, axis=0)
    nrm = np.stack([-d[:, 1], d[:, 0]], 1) / (np.linalg.norm(d, axis=1)[:, None] + 1e-9)
    Q = Q + nrm * (_wob(ts * 3, seed, jitter))[:, None]
    wid = np.interp(ts, [0, 0.5, 1], press) * w * (1 + 0.12 * _wob(ts * 2, seed + 7))
    out = np.zeros_like(f.m)
    for i in range(n - 1):
        out |= f.dist(Q[i:i + 2]) <= (wid[i] + wid[i + 1]) / 4
    return f.m & out


def hand_face(P, c, axis=(0, -1, 0), up=(0, 0, 1), eyes=(4.0, 0.0), eye=(0.95, 1.2), mouth='smile', mouth_at=(0.0, -2.2),
              mouth_w=4.0, seed=1, ink=INK, where=None, depth=6.0, tilt=0.0, line=0.42, teeth=3, flip=False):
    """A face as the owner draws them: two small solid ink dots (uneven), one brush-stroke mouth.
    eyes: (half the spacing, height of the eye line above c); eye: dot (width, height);
    mouth: 'smile' (a flat line with a little upturn at one end), 'dash' (a short slanted dash), 'grin' (a big grin
    with `teeth` vertical tooth strokes), 'flat' (a plain wobbly line), or None. flip: mirror the mouth's asymmetry.
    Returns the Face (its frame, for anything else drawn on the same face)."""
    f = Face(P, c, axis, up=up, depth=depth, where=where)
    g, ey = eyes
    r = np.random.default_rng(seed)
    for k, su in enumerate((-1, 1)):
        sz = 1.0 if k == 0 else r.uniform(0.82, 0.92)
        P.flat(ink_dot(f, su * g + r.uniform(-0.12, 0.12), ey + (tilt * su) + r.uniform(-0.1, 0.1), eye[0] * sz, eye[1] * sz,
                       rot=r.uniform(-12, 12), seed=seed + k), ink)
    mu, mv = mouth_at
    sx = -1 if flip else 1
    W = mouth_w
    if mouth == 'smile':
        pts = [(mu - sx * W / 2, mv + 0.05), (mu - sx * W / 6, mv - 0.08), (mu + sx * W / 4, mv - 0.05), (mu + sx * W * 0.43, mv + 0.12),
               (mu + sx * W / 2, mv + 0.42)]
        P.flat(ink_line(f, pts, line, seed=seed + 3, press=(0.8, 1.0, 1.15)), ink)
    elif mouth == 'dash':
        pts = [(mu - W / 2, mv - sx * W * 0.08), (mu + W / 2, mv + sx * W * 0.1)]
        P.flat(ink_line(f, pts, line, seed=seed + 3, press=(0.7, 1.0, 1.1), n=12), ink)
    elif mouth == 'flat':
        pts = [(mu - W / 2, mv), (mu, mv - 0.06), (mu + W / 2, mv + 0.04)]
        P.flat(ink_line(f, pts, line, seed=seed + 3, press=(0.8, 1.0, 0.85)), ink)
    elif mouth == 'grin':
        H = W * 0.42
        top = [(mu - W * 0.44, mv + 0.15), (mu, mv + 0.32), (mu + W * 0.42, mv + 0.12)]
        bot = bezier((mu - W * 0.52, mv + 0.55), (mu - W * 0.05, mv - H * 1.9), (mu + W * 0.52, mv + 0.35), 14)
        P.flat(ink_line(f, top, line * 1.05, seed=seed + 3, press=(0.9, 1.0, 0.85)), ink)
        P.flat(ink_line(f, [(p[0], p[1]) for p in bot], line, seed=seed + 4, press=(0.6, 1.0, 1.1)), ink)
        for i in range(teeth):
            x = mu + W * (-0.24 + 0.48 * i / max(1, teeth - 1))
            yb = np.interp(x, [p[0] for p in bot], [p[1] for p in bot])
            yt = mv + 0.3 - 0.0 * x
            P.flat(ink_line(f, [(x - 0.05, yt - 0.1), (x + 0.12 * (i - 1), yb + 0.25)], line * 0.7, seed=seed + 9 + i, press=(1.0, 0.9, 0.7), n=8), ink)
    return f


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
