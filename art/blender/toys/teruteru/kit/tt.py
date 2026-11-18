"""The Upside-Down Rain Charms' shared anatomy (series teruteru): every charm is its own sculpt built from these.

body(): the cloth-covered head at the bottom (standing on its flattened crown), the neck pinched by the string and
the cloth sack gathered up to the knot, as one subdivision form; the sculpt adds the gathered pleats at the neck,
the folds that run up into the knot, the cheeks and the sag of wet cloth.
knot(): the twisted gather at the top.  corner(): one handkerchief corner sticking out of the knot (on its own bone).
neck_cord(): the string round the neck with its knot and two loose ends lying on the head.
"""
import math

import numpy as np

import tk
from mathutils import Matrix, Vector


def ring_r(rings, z):
    zs = [r[0] for r in rings]
    return float(np.interp(z, zs, [r[1] for r in rings])), float(np.interp(z, zs, [r[2] for r in rings]))


def body(rings, n=18, neck_z=17.5, knot=(0, 0, 35), folds=7, fold_amp=0.5, soggy=0.0, cheeks=(), tris=520,
         depth=1.0, region='cloth', extra=None, twist=0.0, keep=None, seam=90.0):
    """rings: [(z, r, x-centre)], bottom to top. depth: front-back scale of the sections. twist: degrees the sack's
    folds turn per mm (a wrung cloth). extra(V, N, th) -> more sculpt offsets. keep(V) -> rings deformation (both)."""
    R = [{'c': (x, 0, z), 'w': 2 * r, 'h': r * depth, 'e': 2.0} for z, r, x in rings]
    cage = tk.loft('body', R, n=n, up=(0, -1, 0), cap0='flat', cap1='round')
    zk = knot[2]

    def sculpt(h):
        def f(V, N):
            xc = np.interp(V[:, 2], [r[0] for r in rings], [r[2] for r in rings])
            th = np.arctan2(V[:, 1], V[:, 0] - xc)
            z = V[:, 2]
            d = np.zeros(len(V))
            # the string bites into the cloth, and the cloth is gathered into little pleats above and below it
            d -= 0.75 * np.exp(-((z - neck_z) / 0.85) ** 2)
            pleat = np.cos(11 * th + 0.4) ** 3
            d += 0.42 * pleat * np.exp(-((z - neck_z - 1.6) / 1.6) ** 2) + 0.3 * pleat * np.exp(-((z - neck_z + 2.0) / 1.5) ** 2)
            # the sack's folds run up into the knot (sharper, deeper as they gather)
            ph = th * folds + np.radians(twist) * folds * (z - neck_z) + 0.6 * np.sin(z * 0.35)
            env = tk.smoothstep(neck_z + 1.0, neck_z + 5.0, z) * (0.45 + 0.75 * tk.smoothstep(neck_z + 4, zk - 1, z))
            d += fold_amp * env * (np.cos(ph) ** 3 * 0.8 + 0.25 * np.cos(2 * ph + 1.1))
            # the cloth pulled over the head: a few long soft wrinkles running down from the neck
            d += 0.28 * np.cos(5 * th + 0.8) ** 5 * np.exp(-((z - neck_z + 4.5) / 2.6) ** 2)
            # wet cloth sags: the sack's lower half bellies out a little, the top is drawn in
            d += soggy * np.exp(-((z - neck_z - 5.5) / 3.0) ** 2) * (0.6 + 0.4 * np.cos(2 * th))
            for cx, cz in cheeks:  # round cheeks either side of the face
                d += tk.bump(V, (cx, -11.5, cz), 4.6, 0.6, sharp=1.5)
            if seam:  # the back seam where the handkerchief was sewn: a groove with a row of stitches across it
                sd = np.abs(np.mod(th - math.radians(seam) + math.pi, 2 * math.pi) - math.pi) * np.hypot(V[:, 0] - xc, V[:, 1])
                on = tk.smoothstep(neck_z + 0.8, neck_z + 1.6, z) * tk.smoothstep(zk - 1.0, zk - 2.5, z)
                d -= 0.32 * np.exp(-(sd / 0.32) ** 2) * on
                d += 0.16 * (np.abs(np.mod(z, 1.3) - 0.65) < 0.22) * (sd < 0.9) * on
            if extra is not None:
                d += extra(V, N, th)
            return d
        tk.push(h, f)
    if keep:
        tk.deform(cage, keep)
    lo, hi = tk.lowhigh(cage, 'body', lo=1, hi=3, tris=None, sculpt=sculpt, region=region)
    for o in (lo, hi):
        flatten(o)
    tk.decimate(lo, tris)
    return lo, [hi]


def flatten(o, zf=0.3):
    """Flatten the crown it stands on (contact at z = 0)."""
    def f(V):
        V = V.copy()
        V[:, 2] = np.maximum(V[:, 2], zf) - zf
        return V
    tk.deform(o, f)


def knot(name, c, r=2.8, h=3.6, lean=(0.0, 0.0), tris=70, region='cloth', turns=1.3):
    """The gathered, twisted knot at the top of the sack."""
    zs = np.linspace(-h / 2, h / 2, 5)
    rr = [r * 0.82, r, r * 1.02, r * 0.9, r * 0.66]
    R = [{'c': (c[0] + lean[0] * z, c[1] + lean[1] * z, c[2] + z), 'w': 2 * q, 'h': q, 'e': 2.0} for z, q in zip(zs, rr)]
    cage = tk.loft(name, R, n=10, up=(0, -1, 0), cap0='round', cap1='round')

    def sculpt(hh):
        def f(V, N):
            th = np.arctan2(V[:, 1] - c[1], V[:, 0] - c[0])
            z = V[:, 2] - c[2]
            return 0.45 * np.cos(5 * th + turns * 2 * z) ** 3 - 0.2
        tk.push(hh, f)
    lo, hi = tk.lowhigh(cage, name, lo=1, hi=3, sculpt=sculpt, region=region)
    tk.decimate(lo, tris)
    return lo, [hi]


def corner(name, knot_c, ang, L=12.0, W=6.0, a0=20, a1=-70, cup=0.6, ripple=0.3, tris=60, thick=1.0, root_r=1.7,
           root_z=1.2, curl=0.0, region='corner', twist=0.0, power=1.3, shape=0.6):
    """One handkerchief corner out of the knot: a leaf-shaped flap of cloth `thick` mm, L long, W wide at the root,
    pointing out at `ang` (degrees about Z, 0 = +X, -90 = front), its centreline turning from a0 (degrees above the
    horizontal) at the root to a1 at the tip. cup: the edges curl up; curl: the tip rolls under; twist: degrees the
    flap twists along its length. Returns (low, sculpt, root, tip)."""
    def outline(k):
        us = np.linspace(0, L, k)
        top = [(u, W / 2 * max(0.0, 1 - (u / L) ** 2) ** shape) for u in us]
        top[-1] = (L, 0.0)
        bot = [(u, -v) for u, v in top[::-1][1:-1]]
        return top + bot

    def build(nm, k, bev, segs, sub):
        o = tk.slab(nm, outline(k), thick, plane='XY', at=0.0, bevel=bev, segs=segs)
        if sub:
            tk.subsurf(o, sub)
        return o

    lo = build(name, 7, 0.0, 0, 1)
    hi = build(name + '_hi', 12, thick * 0.42, 2, 2)
    a = math.radians(ang)
    dirv = np.array((math.cos(a), math.sin(a), 0.0))
    side = np.array((-math.sin(a), math.cos(a), 0.0))
    root = np.array(knot_c) + dirv * root_r + np.array((0, 0, root_z))
    # the centreline in (out, up)
    us = np.linspace(0, L, 64)
    angs = np.radians(a0 + (a1 - a0) * (us / L) ** power)
    cx = np.concatenate([[0], np.cumsum(np.cos(angs[:-1]) * np.diff(us))])
    cz = np.concatenate([[0], np.cumsum(np.sin(angs[:-1]) * np.diff(us))])

    def bend(V, rip=0.0):
        u, v, w = V[:, 0], V[:, 1], V[:, 2]
        uu = np.clip(u, 0, L)
        an = np.interp(uu, us, angs)
        px, pz = np.interp(uu, us, cx), np.interp(uu, us, cz)
        nx, nz = -np.sin(an), np.cos(an)
        t = uu / L
        off = w + cup * (v / (W / 2)) ** 2 * (0.4 + t) - curl * t ** 3 * 2.0
        off = off + rip * np.sin(v * 1.6 + u * 0.9) * (0.3 + t)
        if rip:  # the rolled hem round the edge of the cloth
            hw = W / 2 * np.clip(1 - (uu / L) ** 2, 0, 1) ** shape
            off = off + 0.28 * np.sign(w) * tk.smoothstep(0.9, 0.25, hw - np.abs(v))
        tw = np.radians(twist) * t
        o2 = off * np.cos(tw) + v * np.sin(tw)
        vv = v * np.cos(tw) - off * np.sin(tw)
        X = root[None, :] + dirv[None, :] * (px + nx * o2)[:, None] + side[None, :] * vv[:, None]
        X[:, 2] += pz + nz * o2
        return X
    tk.deform(lo, lambda V: bend(V))
    tk.deform(hi, lambda V: bend(V, ripple))
    tk.fix_normals(lo)
    tk.fix_normals(hi)
    tk.set_region(hi, region)
    tk.decimate(lo, tris)
    tip = bend(np.array([[L, 0.0, -thick / 2]]))[0]
    return lo, hi, tuple(root), tuple(tip)


def neck_cord(name, neck_z, rings, bow_at=-35, ends=((-0.6, -6.5), (0.8, -7.8)), thick=0.75, tris=150, region='cord',
              sink=0.35, bow=1.25):
    """The string round the neck: a loop sunk into the pleated neck, a knot at `bow_at` degrees (0 = +X, -90 = the
    front) and loose ends lying down the head [(degrees of turn, dz)]."""
    r, xc = ring_r(rings, neck_z)
    rc = r + thick - sink
    loop = [(xc + rc * math.cos(t), rc * math.sin(t), neck_z) for t in np.linspace(0, 2 * math.pi, 16, endpoint=False)]
    lo_parts = [tk.tube(name, loop, thick, n=4, closed=True)]
    loop_hi = [(xc + rc * math.cos(t), rc * math.sin(t), neck_z) for t in np.linspace(0, 2 * math.pi, 64, endpoint=False)]
    hi = tk.tube(name + '_hi', loop_hi, thick, n=10, closed=True)
    twist_cord(hi, thick)
    his = [hi]
    a = math.radians(bow_at)
    kc = (xc + (rc + 0.5) * math.cos(a), (rc + 0.5) * math.sin(a), neck_z)
    kl = tk.lathe('cknot', [(0, -bow), (bow * 0.85, -bow * 0.6), (bow, 0), (bow * 0.85, bow * 0.6), (0, bow)], n=6, centre=kc)
    kh = tk.lathe('cknot_hi', [(0, -bow), (bow * 0.85, -bow * 0.6), (bow, 0), (bow * 0.85, bow * 0.6), (0, bow)], n=12, centre=kc)
    tk.subsurf(kh, 1)
    lo_parts.append(kl)
    his.append(kh)
    for i, (turn, dz) in enumerate(ends):
        pts = []
        for t in np.linspace(0, 1, 5):
            z = neck_z - 0.6 - (-dz) * t
            rz, xz = ring_r(rings, z)
            aa = a + math.radians(turn * 6 * t + (i - 0.5) * 10 * t)
            pts.append((xz + (rz + thick * 0.75) * math.cos(aa), (rz + thick * 0.75) * math.sin(aa), z))
        pts[0] = kc
        lo_parts.append(tk.tube('cend', pts, thick * 0.95, n=4, cap0='round', cap1='flat'))
        ph = tk.tube('cend_hi', pts, thick * 0.95, n=10, cap0='round', cap1='flat')
        tk.subsurf(ph, 1)
        twist_cord(ph, thick)
        his.append(ph)
    lo = tk.join(lo_parts, name)
    for h in his:
        tk.set_region(h, region)
    tk.decimate(lo, tris)
    return lo, his


def twist_cord(o, thick, strands=3, pitch=2.2):
    """The twisted strands of a string: helical grooves along it (phase from the position)."""
    def f(V, N):
        ph = np.arctan2(N[:, 1], N[:, 0]) * strands + (V[:, 0] + V[:, 1] + V[:, 2]) * (2 * math.pi / pitch)
        return 0.12 * thick * np.cos(ph)
    tk.push(o, f)


def spots(P, n, rmin, rmax, seed=0, zmin=0, zmax=99, where=None):
    """Printed spots (rain marks) on the surface: n random discs in figure space."""
    rng = np.random.default_rng(seed)
    m = P.mask & (P.Z > zmin) & (P.Z < zmax)
    if where is not None:
        m &= where
    ys, xs = np.nonzero(m)
    out = np.zeros_like(P.mask)
    if not len(ys):
        return out
    for _ in range(n):
        i = rng.integers(len(ys))
        c = P.pos[ys[i], xs[i]]
        r = rng.uniform(rmin, rmax)
        out |= np.linalg.norm(P.pos - c, axis=2) < r
    return out & P.mask


def drop_gloss(P, reg):
    """A water drop's gloss: a short highlight dash on the lit shoulder and a small reflected light low down."""
    m = P.region(reg)
    l = np.einsum('ijk,k->ij', P.on, np.array((-0.45, -0.55, 0.7)) / np.linalg.norm((-0.45, -0.55, 0.7)))
    P.flat(m & (l > 0.9), '#f8fbff')
    l2 = np.einsum('ijk,k->ij', P.on, np.array((0.5, -0.6, -0.62)) / np.linalg.norm((0.5, -0.6, -0.62)))
    P.flat(m & (l2 > 0.93), '#d6efff')


def arm(name, pts, r=1.7, hand=2.1, tris=56, region='cloth', hand_region='hand', mitt=None):
    """A stubby cloth arm poking out of the sack: a tube through pts (the first point inside the cloth), ending in a
    round mitten hand (a thumb nub pointing `mitt`, a unit vector, when given). Returns (low, [sculpt], hand centre)."""
    P = [np.asarray(p, float) for p in pts]
    d = P[-1] - P[-2]
    d /= np.linalg.norm(d)
    hc = P[-1] + d * hand * 0.55
    radii = [r * 1.05] + [r * (1 - 0.1 * i / max(1, len(P) - 1)) for i in range(1, len(P))]
    lo = tk.tube(name, [tuple(p) for p in P], radii, n=5, cap0='flat', cap1='flat')
    hi = tk.tube(name + '_hi', [tuple(p) for p in P], radii, n=12, cap0='flat', cap1='flat')
    tk.subsurf(hi, 1)
    # cloth wrinkles round the sleeve
    tk.push(hi, lambda V, N: 0.18 * np.cos((V @ d) * 2.6) ** 4)
    tk.set_region(hi, region)
    hp = [(0, -hand), (hand * 0.75, -hand * 0.7), (hand, 0), (hand * 0.8, hand * 0.62), (0, hand)]
    h_lo = tk.lathe(name + '_h', hp, n=6, centre=tuple(hc))
    h_hi = tk.lathe(name + '_hhi', [(0, -hand)] + [(hand * math.sin(q), -hand * math.cos(q)) for q in np.linspace(0.25, math.pi - 0.25, 8)] + [(0, hand)], n=14, centre=tuple(hc))
    tk.subsurf(h_hi, 1)
    his = [hi, h_hi]
    if mitt is not None:
        m = np.asarray(mitt, float)
        tc = hc + m * hand * 0.85
        th_hi = tk.lathe(name + '_thumb', [(0, -0.9), (0.8, -0.5), (0.85, 0.3), (0, 0.9)], n=10, centre=tuple(tc))
        tk.subsurf(th_hi, 1)
        tk.set_region(th_hi, hand_region)
        his.append(th_hi)
    tk.set_region(h_hi, hand_region)
    lo = tk.join([lo, h_lo], name)
    tk.decimate(lo, tris)
    return lo, his, tuple(hc)


def feet(name, rings, x=4.3, y=None, size=(4.6, 5.6, 2.6), toe=-6.5, tris=24, region='hand', splay=14):
    """Two little feet peeking out under the head at the front (they stand on them, with the crown)."""
    los, his = [], []
    for sx in (-1, 1):
        r0 = ring_r(rings, 1.2)[0]
        cy = y if y is not None else -(r0 - size[1] * 0.25)
        c = (sx * x, cy, 0.0)
        w, d_, h = size
        prof = [(0, 0), (w / 2 * 0.92, 0.0), (w / 2, h * 0.35), (w / 2 * 0.8, h * 0.8), (0, h)]
        lo = tk.lathe(name, prof, n=8, centre=c)
        hi = tk.lathe(name + '_hi', [(0, 0), (w / 2 * 0.9, 0.0), (w / 2, h * 0.3), (w / 2 * 0.92, h * 0.6), (w / 2 * 0.6, h * 0.9), (0, h)], n=16, centre=c)
        for o in (lo, hi):
            tk.scale(o, (1.0, d_ / w, 1.0), pivot=c)
            tk.rotate(o, -sx * splay, 'Z', pivot=c)
        tk.subsurf(hi, 1)
        # two toe creases at the front
        tk.push(hi, lambda V, N, c=c: -0.22 * (np.abs(np.abs(V[:, 0] - c[0]) - 0.75) < 0.22) * (V[:, 1] < c[1] - d_ * 0.2) * (V[:, 2] > 0.3))
        tk.set_region(hi, region)
        tk.decimate(lo, tris)
        los.append(lo)
        his.append(hi)
    return tk.join(los, name), his
