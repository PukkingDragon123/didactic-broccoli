"""Shared parts of なかのひと Naka no Hito ("Who's in the Suit?"): Shōwa tokusatsu kaijū suits, each worn by a very
small animal actor (concepts.md, series 2). Every figure is the same stunt: a latex monster suit standing on its own
feet and tail, a monster head that is a hollow hood on a hinge at the nape, and the actor's own head inside it.
Press: the hood tips back on its hinge and the actor looks out, sweating; then it is back in character.

Figure space (mm, Z up, the front is -Y). The figure scripts import this (helper modules start with _ so make.sh
skips them):

    import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from _suit import *  # noqa

Parts the scripts build with these helpers: the suit (trunk, legs and feet, tail: bone 'body'), the arms ('arm_l',
'arm_r'), the hood ('hood', hollowed by `hollow`, its hinge at the back of its rim) and the actor's head ('actor').
The faces are painted (lib/face.py): a monster face on the hood, the animal's own face on the actor.
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
import face  # noqa: E402
import kit  # noqa: E402
from fig import Fig  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

ARGS = sys.argv[1:]
tk.reset()


# ------------------------------------------------------------------ small builders
def V3(p):
    return np.asarray(p, float)


def lh(cage, name, tris, region, lo=1, hi=3, sculpt=None, keep_corners=False):
    """One cage -> (game mesh decimated to `tris`, sculpt)."""
    return tk.lowhigh(cage, name, lo=lo, hi=hi, tris=tris, sculpt=sculpt, region=region, keep_corners=keep_corners)


def cone(name, base, tip, r, n=8, mid=0.55, cap0='round'):
    """A tapered spike / claw / horn from base to tip (radius r at the base)."""
    b, t = V3(base), V3(tip)
    return tk.tube(name, [tuple(b), tuple(b + (t - b) * 0.55), tuple(t)], [r, r * mid, r * 0.14], n=n, cap0=cap0, cap1='round')


def push_folds(h, c, axis, k=2.2, amp=0.18, lo=None, hi=None):
    """Latex suit folds: shallow rings across `axis` (at a joint), between distances lo..hi along it from c."""
    a = V3(axis) / np.linalg.norm(axis)

    def f(V, N):
        t = (V - V3(c)) @ a
        m = np.ones(len(V))
        if lo is not None:
            m *= tk.smoothstep(lo - 0.8, lo, t)
        if hi is not None:
            m *= tk.smoothstep(hi + 0.8, hi, t)
        return amp * m * np.sin(t * k + 0.6 * np.sin(V[:, 0] * 0.7 + V[:, 1] * 0.5))
    tk.push(h, f)


def scales(V, amp=0.1, f=1.7):
    """Rubber scale texture (a displacement field)."""
    return amp * (np.sin(V[:, 0] * f + np.sin(V[:, 2] * f * 0.6)) * np.sin(V[:, 1] * f * 1.1) * np.sin(V[:, 2] * f + V[:, 0] * 0.4))


# ------------------------------------------------------------------ the suit
def trunk(name, rings, tris=240, region='suit', sculpt=None, n=14):
    """The suit's body, vertical: rings [(z, y, width, front depth, back depth), ...] bottom to top."""
    R = [{'c': (0, y, z), 'w': w, 'ht': hf, 'hb': hb, 'e': 2.15} for z, y, w, hf, hb in rings]
    cage = tk.loft(name, R, n=n, up=(0, -1, 0), cap0='round', cap1='round')
    return lh(cage, name, tris, region, sculpt=sculpt)


def foot(name, heel, toe_dir, L, W, H, toes=3, claw=1.0, region='suit', claw_region='claw', claw_len=2.2, tris=70):
    """A big suit foot on the ground: a boxy-round slipper from `heel` (x, y) along toe_dir, flat sole at z = 0, and
    `toes` claws over the toe end. Returns (low, [highs])."""
    d = V3((toe_dir[0], toe_dir[1], 0.0))
    d /= np.linalg.norm(d)
    h0 = V3((heel[0], heel[1], 0.0))
    rings = []
    for t, w, h in ((0.0, 0.72, 0.8), (0.14, 0.95, 1.0), (0.45, 1.0, 0.92), (0.78, 0.98, 0.66), (1.0, 0.8, 0.42)):
        c = h0 + d * L * t
        rings.append({'c': (c[0], c[1], H * h * 0.5 - 0.6), 'w': W * w, 'h': H * h * 0.5 + 0.6, 'e': 2.5})
    cage = tk.loft(name, rings, n=12, up=(0, 0, 1), cap0='round', cap1='round')
    lo, hi = lh(cage, name, tris, region)
    for o in (lo, hi):
        tk.bisect(o, (0, 0, 0.0), (0, 0, 1), keep='+')
    his = [hi]
    los = [lo]
    side = V3((-d[1], d[0], 0.0))
    for i in range(toes):
        u = (i - (toes - 1) / 2) / max(1, (toes - 1) / 2)
        b = h0 + d * (L * 0.93 - abs(u) * 1.0) + side * u * W * 0.33 + V3((0, 0, H * 0.32))
        tip = b + d * claw_len + V3((0, 0, -H * 0.3))
        ch = cone(name + '_claw_hi', b, tip, claw, n=10)
        tk.set_region(ch, claw_region)
        his.append(ch)
        los.append(cone(name + '_claw', b, tip, claw, n=4))
    return tk.join(los, name), his


def limb(name, pts, radii, tris=60, region='suit', n=10, folds=True):
    """A leg or an arm of the suit: a soft tube with latex folds at the middle joint."""
    cage = tk.tube(name, pts, radii, n=n, cap0='round', cap1='round')
    lo, hi = lh(cage, name, tris, region, lo=1, hi=2)
    if folds and len(pts) >= 3:
        P = V3(pts)
        push_folds(hi, P[len(P) // 2], P[-1] - P[0], k=3.2, amp=0.16, lo=-2.5, hi=2.5)
    return lo, hi


def mitten(name, wrist, d, up, L=5.0, W=4.4, T=2.6, claws=3, claw=0.6, region='suit', claw_region='claw', tris=60):
    """A suit's mitten hand: a flattened paddle along d (palm facing -up), with `claws` little claws at its end."""
    d = V3(d) / np.linalg.norm(d)
    rings = []
    for t, w, h in ((0.0, 0.62, 0.7), (0.3, 0.95, 1.0), (0.7, 1.0, 0.95), (1.0, 0.8, 0.7)):
        c = V3(wrist) + d * L * t
        rings.append({'c': tuple(c), 'w': W * w, 'h': T * h * 0.5, 'e': 2.2})
    cage = tk.loft(name, rings, n=10, up=up, cap0='round', cap1='round')
    lo, hi = lh(cage, name, tris, region, lo=1, hi=2)
    his, los = [hi], [lo]
    upv = V3(up) / np.linalg.norm(up)
    side = np.cross(d, upv)
    for i in range(claws):
        u = (i - (claws - 1) / 2) / max(1, (claws - 1) / 2)
        b = V3(wrist) + d * (L * 0.95) + side * u * W * 0.3
        tip = b + d * 1.6 - upv * 0.6
        ch = cone(name + '_cl_hi', b, tip, claw, n=8)
        tk.set_region(ch, claw_region)
        his.append(ch)
        los.append(cone(name + '_cl', b, tip, claw, n=3))
    return tk.join(los, name), his


def hollow(lo, hi, centre, r, bottom, top=None, region='inside', n_lo=10, n_hi=28):
    """Hollow the hood: cut a cavity (an egg of radii r = (x, y, z) about centre, with a straight shaft down out of
    the bottom so the hood is open underneath, below z = bottom) out of the game mesh and the sculpt. The cavity's
    faces become region `inside` (the dark foam lining you see when the hood tips back)."""
    cx, cy, cz = centre
    rx, ry, rz = r
    k = 0.92  # (the shaft out of the bottom: a touch narrower than the egg)
    th0 = -math.acos(k)
    prof = [(0, bottom - 6), (k, bottom - 6)]
    prof += [(math.cos(t), cz + rz * math.sin(t)) for t in np.linspace(th0, math.pi / 2, 10)]
    prof[-1] = (0.0, top or cz + rz)
    for o, n in ((lo, n_lo), (hi, n_hi)):
        c = tk.lathe('cav', prof, n=n)
        tk.transform(c, Matrix.Translation((cx, cy, 0)) @ Matrix.Diagonal((rx, ry, 1, 1)))
        tk.set_region(c, region)
        tk.boolean(o, c)
    return lo, hi


def collar(name, c, rx, ry, r=0.8, region='collar'):
    """The suit's rolled neck opening (you see it round the actor's neck when the hood is up)."""
    ring = [(c[0] + rx * math.cos(a), c[1] + ry * math.sin(a), c[2]) for a in np.linspace(0, 2 * math.pi, 16, endpoint=False)]
    hi = tk.tube(name + '_hi', ring, r, n=8, closed=True)
    tk.set_region(hi, region)
    lo = tk.tube(name, ring[::2], r, n=4, closed=True)
    return lo, hi


def zip_tab(name, at, region='zip'):
    """The zip's pull tab hanging at the top of the zip down the suit's back (the give-away)."""
    x, y, z = at
    hi = tk.rbox(name + '_hi', (1.5, 0.5, 2.6), centre=(x, y + 0.25, z - 1.3), bevel=0.22, segs=2)
    ring = tk.tube(name + '_r_hi', [(x - 0.55, y + 0.1, z + 0.3), (x, y + 0.2, z + 0.75), (x + 0.55, y + 0.1, z + 0.3)], 0.22, n=6)
    hi = tk.join([hi, ring], name + '_hi')
    tk.set_region(hi, region)
    lo = tk.rbox(name, (1.5, 0.5, 2.8), centre=(x, y + 0.25, z - 1.2), bevel=0, segs=0)
    return lo, [hi]


def zip_groove(xc, path, w=0.5, depth=0.22):
    """A displacement field (for tk.push) cutting the zip's groove down the suit's back along `path` [(y, z), ...]
    (piecewise straight, x = xc), the teeth standing proud in it."""
    P = V3(path)

    def f(V, N):
        best = np.full(len(V), 1e9)
        along = np.zeros(len(V))
        acc = 0.0
        for a, b in zip(P[:-1], P[1:]):
            ab = b - a
            L = np.linalg.norm(ab)
            q = np.stack([V[:, 1], V[:, 2]], 1)
            t = np.clip(((q - a) @ ab) / (L * L), 0, 1)
            d = np.linalg.norm(q - (a + t[:, None] * ab), axis=1)
            sel = d < best
            best = np.where(sel, d, best)
            along = np.where(sel, acc + t * L, along)
            acc += L
        dx = np.abs(V[:, 0] - xc)
        on = (best < 1.6) & (N[:, 1] > 0.2)
        teeth = 0.12 * (np.sin(along * 9.0) > 0)
        return np.where(on, -depth * tk.smoothstep(w + 0.35, w, dx) + teeth * (dx < w * 0.7), 0.0)
    return f


# ------------------------------------------------------------------ the actors' heads
def ball(name, c, r, squash=(1, 1, 1), n=12, rings=7):
    """A soft head shape (an egg loft along -Y)."""
    cx, cy, cz = c
    R = []
    for t in np.linspace(-1, 1, rings):
        s = math.sqrt(max(0.0, 1 - t * t * 0.92))
        R.append({'c': (cx, cy + t * r * squash[1], cz), 'w': 2 * r * squash[0] * s, 'h': r * squash[2] * s, 'e': 2.0})
    return tk.loft(name, R[::-1], n=n, up=(0, 0, 1), cap0='round', cap1='round')


def ear(name, root, tip, w, t=0.9, cup=0.4, n=8):
    """A pointed ear (shiba, kitten): a thin cupped cone from root to tip, `w` wide at the root."""
    r, p = V3(root), V3(tip)
    rings = [{'c': tuple(r), 'w': w, 'h': t, 'e': 2.0}, {'c': tuple(r + (p - r) * 0.5), 'w': w * 0.66, 'h': t * 0.8, 'e': 2.0},
             {'c': tuple(r + (p - r) * 0.9), 'w': w * 0.18, 'h': t * 0.5, 'e': 2.0}]
    return tk.loft(name, rings, n=n, up=(0, -1, 0), cap0='round', cap1='round')


# ------------------------------------------------------------------ the clip
def reveal(R, k, t0=4, up=14, hold=48, down=58, end=66, hinge_deg=-104, lift=1.6, bones_rest=()):
    """The series' press clip on the hood: a shrug, the hood tips back on its hinge (and lifts a little off the
    shoulders), holds open while the actor looks out, then snaps back down. Returns the frames used."""
    for b in ('hood',) + tuple(bones_rest):
        k(b, 0)
    k('hood', t0)
    k('hood', t0 + 3, rot=('X', -10), move=(0, 0, lift))
    k('hood', up, rot=('X', hinge_deg), move=(0, 0, lift * 0.4), ease='BACK')
    k('hood', hold, rot=('X', hinge_deg + 6), move=(0, 0, lift * 0.4))
    k('hood', down - 3, rot=('X', -14), move=(0, 0, lift))
    k('hood', down, ease='BOUNCE')
    k('hood', end)
    return t0, up, hold, down, end


# ------------------------------------------------------------------ paint helpers
def zip_paint(P, xc, path, col='#b9b6ae', tape='#3a3634', w=0.5):
    """The zip down the back: dark tape either side, nickel teeth in a ladder."""
    Pp = V3(path)
    best = np.full(P.X.shape, 1e9)
    along = np.zeros(P.X.shape)
    acc = 0.0
    for a, b in zip(Pp[:-1], Pp[1:]):
        ab = b - a
        L = np.linalg.norm(ab)
        qy, qz = P.Y - a[0], P.Z - a[1]
        t = np.clip((qy * ab[0] + qz * ab[1]) / (L * L), 0, 1)
        d = np.hypot(qy - t * ab[0], qz - t * ab[1])
        sel = d < best
        best = np.where(sel, d, best)
        along = np.where(sel, acc + t * L, along)
        acc += L
    dx = np.abs(P.X - xc)
    on = P.mask & (best < 1.2) & (P.on[:, :, 1] > 0.2) & (along > 0.0) & (along < acc)
    P.flat(on & (dx < w + 0.45), tape)
    P.flat(on & (dx < w * 0.8) & (np.sin(along * 9.0) > -0.1), col)
    P.flat(on & (dx < w * 0.8) & (np.sin(along * 9.0) > 0.75), '#e4e0d6')
    return on


def foam(P, pt, sh, region='inside', col='#4a4440'):
    """The hood's lining: grey-brown foam rubber, open-celled (dark pits), stitched seams."""
    m = P.region(region)
    if not m.any():
        return m
    P.fill(region, pt.ramp(col, 5, shift=0.03), tone=sh * 0.5, base=-0.1)
    pits = m & (np.sin(P.X * 4.1 + np.sin(P.Z * 3.3)) * np.sin(P.Y * 3.7 + P.Z * 1.3) > 0.55)
    P.flat(pits, '#2e2a28')
    return m


def sweat(fc, pts, r=0.5):
    """Beads of sweat on the actor's brow (face-plane (u, v) points)."""
    for u, v in pts:
        fc.drop(u, v, r=r)


# ------------------------------------------------------------------ the figure script's run
def run(F, ARGS, make_rig, paint_fn, cam=((80, -110, 70), (0, 0, 26)), back=((-80, 110, 70), (0, 0, 26)), skip=(), folds=(0, 14, 30, 60), frames=90,
        ao_also=None):
    """--preview / --fold / --clip, or the full build: unwrap, bake (per-bone AO), paint, rig, export."""
    OUT = os.path.join(F.out, F.id)
    F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
    if '--clip' in ARGS:
        from rig import check_clip
        R = make_rig()
        res = check_clip(R, F.parts, range(1, frames + 1), skip=list(skip), tol=0.35)
        for f, L in sorted(res.items()):
            print('CLIP', f, L)
        print('CLIP frames', len(res))
        sys.exit(0)
    if '--preview' in ARGS or '--fold' in ARGS:
        lows = [p.low for p in F.parts]
        highs = [h for p in F.parts for h in p.highs]
        if '--fold' in ARGS:
            import bpy
            R = make_rig()
            R.arm.animation_data.action = bpy.data.actions['gimmick']
            for i, fr in enumerate(folds):
                bpy.context.scene.frame_set(fr)
                tk.preview(OUT + f'_p{i + 1}.png', lows, cam=cam, lens=50)
            sys.exit(0)
        tk.preview(OUT + '_p1.png', highs, cam=cam, lens=50)
        tk.preview(OUT + '_p2.png', highs, cam=back, lens=50)
        tk.preview(OUT + '_p3.png', lows, cam=cam, lens=50)
        sys.exit(0)
    import paint as pt
    F.unwrap()
    F.bake(ao_samples=24 if '--fast' in ARGS else 128, ao_dist=5.0, reuse='--repaint' in ARGS, ao_by_bone=True, ao_also=ao_also)
    P = pt.Painter(F.maps, F.region_index, F.size)
    F.finish(paint_fn(P, pt))
    F.drop_highs()
    R = make_rig()
    kit.points(R)
    F.export(R)
