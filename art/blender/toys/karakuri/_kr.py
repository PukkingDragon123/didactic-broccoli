"""Shared parts for series karakuri (Edo Wind-Up Automata, concepts_B.md): the black-lacquer base every automaton
stands on, with a round gear window in its front (brass wheels behind the glass), the hatch on its back with the
whalebone spring coiled inside, gold-leaf bands, and the brass wind key out of its right side on a `key` bone.

    import _kr as kr
    b = kr.base(F)                 # -> dict lo, hi, key (lo, [hi]), KEY (the key's axle centre), SZ (top of the base)
    kr.wind(R.key, 0, 12, 2)       # the key winds two turns, frames 0-12 (quarter-turn keys, linear)
    kr.unwind(R.key, 12, 90, 2)    # ... and unwinds as the trick runs
    kr.paint_base(P, pt, sh)

Rig helpers for the automata's arms (a karakuri arm is two rigid links on cams, so the clips are solved here):
    E = kr.ik2(S, H, a, b, pole)                      # elbow of a two-link arm from shoulder S reaching H
    kr.arm(R.key, 'uarm', 'farm', S, E0, H0, E, H, f) # key both links so the hand moves from H0 (rest) to H
    q = kr.qframe(d0, n0, d1, n1)                      # the turn taking a part's (direction, face normal) to new ones
"""
import math

import numpy as np
from mathutils import Matrix, Vector

import tk
import ak

W, D, H = 26.0, 20.0, 6.0
SZ = H
KEY = (W / 2 + 0.4, 2.0, 3.2)
GEAR = (-5.6, -D / 2, 3.1)


def base(F, w=W, d=D):
    lo, hi = [], []
    o = tk.rbox('base_hi', (w, d, H), centre=(0, 0, H / 2), bevel=0.6, segs=3)
    tk.subsurf(o, 1)

    def det(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        out = np.zeros(len(V))
        # the gear window: a round recess in the front, two brass wheels with their teeth inside it
        front = N[:, 1] < -0.7
        r = np.hypot(x - GEAR[0], z - GEAR[2])
        out -= 0.9 * front * (r < 2.7)
        for gx, gz, gr, n in ((GEAR[0] - 0.8, GEAR[2] + 0.4, 1.5, 10), (GEAR[0] + 1.2, GEAR[2] - 0.7, 1.0, 7)):
            rr = np.hypot(x - gx, z - gz)
            a = np.arctan2(z - gz, x - gx)
            tooth = rr < gr + 0.3 * (np.cos(a * n) > 0)
            out += 0.55 * front * (r < 2.7) * tooth * (rr > 0.35)
        out += 0.25 * front * (np.abs(r - 3.0) < 0.3)                       # the window's brass rim
        # the back hatch: a panel outline, and the coiled spring seen through its slot
        back = N[:, 1] > 0.7
        out -= 0.25 * back * ((np.abs(np.abs(x) - 6.0) < 0.15) & (np.abs(z - 3.0) < 2.2) | (np.abs(np.abs(z - 3.0) - 2.2) < 0.15) & (np.abs(x) < 6.0))
        rs = np.hypot(x - 2.0, z - 3.0)
        out -= 0.5 * back * (rs < 1.8) * (np.mod(rs - np.arctan2(z - 3.0, x - 2.0) / (2 * math.pi) * 0.5, 0.5) < 0.22)
        # moulded bands round the top and bottom edges
        out += 0.2 * (np.abs(z - H + 0.7) < 0.25) + 0.2 * (np.abs(z - 0.6) < 0.25)
        return out
    tk.push(o, det)
    tk.set_region(o, 'base')
    hi.append(o)
    lo.append(tk.rbox('base', (w, d, H), centre=(0, 0, H / 2), bevel=0.45, segs=1))
    # the brass wind key: an axle out of the side, a butterfly bow
    kx, ky, kz = KEY
    k_hi = [tk.cyl('kshaft_hi', 0.55, w / 2 - 0.6, w / 2 + 2.2, n=10, at=(ky, kz), axis='X', bevel=0.15, segs=1)]
    k_lo = [tk.cyl('kshaft', 0.55, w / 2 - 0.6, w / 2 + 2.2, n=5, at=(ky, kz), axis='X', bevel=0, segs=0)]
    wing = [(-1.2, 0.4), (-2.6, 1.8), (-2.0, 3.0), (0.0, 3.2), (2.0, 3.0), (2.6, 1.8), (1.2, 0.4)]
    for nm_, b_, s_, lst in (('kbow_hi', 0.2, 1, k_hi), ('kbow', 0, 0, k_lo)):
        ob = tk.slab(nm_, wing + [(p[0], -p[1]) for p in wing[::-1]], 0.7, plane='YZ', at=w / 2 + 2.4, bevel=b_, segs=s_)
        tk.move(ob, (0, ky, kz))
        lst.append(ob)
    for o in k_hi:
        tk.set_region(o, 'brass')
    return {'lo': lo, 'hi': hi, 'key': (tk.join(k_lo, 'key'), k_hi), 'KEY': (w / 2, ky, kz)}


def turns(k, bone, f0, f1, a0, a1, step=90.0):
    """Quarter-turn keys of a bone about X from angle a0 to a1 (degrees) over frames f0..f1, linear."""
    n = max(1, int(round(abs(a1 - a0) / step)))
    for i in range(n + 1):
        k(bone, f0 + (f1 - f0) * i / n, rot=('X', a0 + (a1 - a0) * i / n), ease='LINEAR')


def wind(k, f0, f1, n):
    turns(k, 'key', f0, f1, 0.0, -360.0 * n)


def unwind(k, f0, f1, n):
    turns(k, 'key', f0, f1, -360.0 * n, 0.0)


def paint_base(P, pt, sh):
    ak.lacquer(P, ('base',))
    X, Yc, Z = P.X, P.Y, P.Z
    GOLD = pt.ramp('#d9a640', 7, dark=0.6, light=0.6, shift=0.08)
    BRASS = pt.ramp('#c79a48', 6, dark=0.6, light=0.7, shift=0.06)
    b = P.region('base')
    P.fill(b & ((np.abs(Z - H + 0.7) < 0.35) | (np.abs(Z - 0.6) < 0.35)), GOLD, tone=sh, base=0.1)
    front = P.on[:, :, 1] < -0.7
    r = np.hypot(X - GEAR[0], Z - GEAR[2])
    P.fill(b & front & (r < 3.3), BRASS, tone=sh * 1.3, base=0.05)
    P.fill(b & front & (r < 2.75), pt.ramp('#2a1e14', 3), tone=sh)                          # the dark inside the window
    for gx, gz, gr, n in ((GEAR[0] - 0.8, GEAR[2] + 0.4, 1.5, 10), (GEAR[0] + 1.2, GEAR[2] - 0.7, 1.0, 7)):
        rr = np.hypot(X - gx, Z - gz)
        a = np.arctan2(Z - gz, X - gx)
        wheel = (rr < gr + 0.3 * (np.cos(a * n) > 0)) & ((rr > gr * 0.55) | (np.abs(np.sin(a * 2)) < 0.25)) & (rr > 0.3)
        P.fill(b & front & (r < 2.75) & wheel, BRASS, tone=sh * 1.3, base=0.15)            # two brass wheels, spoked
    # a gold maki-e vine across the front
    vine = b & front & (np.abs(Z - 3.0 - 1.2 * np.sin(X * 0.55)) < 0.22) & (X > GEAR[0] + 3.6)
    P.fill(vine, GOLD, tone=sh, base=0.1)
    for i in range(5):
        lx = GEAR[0] + 5.0 + i * 3.1
        lz = 3.0 + 1.2 * math.sin(lx * 0.55) + (0.9 if i % 2 else -0.9)
        P.fill(b & front & (np.hypot((X - lx) * 0.8, Z - lz) < 0.6), GOLD, tone=sh, base=0.1)
    back = P.on[:, :, 1] > 0.7
    P.fill(b & back & (np.abs(X) < 6.0) & (np.abs(Z - 3.0) < 2.2) & (P.cav > 0.55), pt.ramp('#e8dcc0', 4), tone=sh, base=0.1)  # the whalebone spring
    P.fill('brass', BRASS, tone=sh * 1.4, base=0.08)


# ------------------------------------------------------------------ rig helpers
def ease(t):
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def ik2(S, H, a, b, pole):
    """The elbow of a two-link arm (upper a, fore b) from S reaching H, bending toward `pole`."""
    S, H, pole = Vector(S), Vector(H), Vector(pole)
    d = H - S
    L = min(max(d.length, abs(a - b) + 1e-3), a + b - 1e-3)
    dh = d.normalized()
    ca = (a * a + L * L - b * b) / (2 * a * L)
    p = (pole - dh * pole.dot(dh)).normalized()
    return S + a * (ca * dh + math.sqrt(max(0.0, 1 - ca * ca)) * p)


def qdir(r0, r1):
    return Vector(r0).normalized().rotation_difference(Vector(r1).normalized())


def qframe(d0, n0, d1, n1):
    """The rotation taking direction d0 (with a face normal n0) to d1 (with n1)."""
    def M(d, n):
        d = Vector(d).normalized()
        n = Vector(n)
        n = (n - d * n.dot(d)).normalized()
        return Matrix((d, n.cross(d), n)).transposed()
    return (M(d1, n1) @ M(d0, n0).transposed()).to_quaternion()


def arm(k, b1, b2, S, E0, H0, E, H, f, ease=None):
    """Key a two-link arm (bones b1 at S, b2 at its elbow, child of b1): from rest (elbow E0, hand H0) to E, H."""
    S, E0, H0, E, H = (Vector(v) for v in (S, E0, H0, E, H))
    q1 = qdir(E0 - S, E - S)
    q2 = qdir(H0 - E0, H - E)
    k(b1, f, quat=tuple(q1), ease=ease)
    k(b2, f, quat=tuple(q1.inverted() @ q2), ease=ease)


# ------------------------------------------------------------------ paint helpers
def kikko(u, v, size, w):
    """Mask of a tortoiseshell (kikko) honeycomb's lines, hexagons `size` across, lines w wide, on plane coords u, v."""
    s = size / math.sqrt(3)
    q = (math.sqrt(3) / 3 * u - v / 3) / s
    r = (2 / 3 * v) / s
    x, z = q, r
    y = -x - z
    rx, ry, rz = np.round(x), np.round(y), np.round(z)
    dx, dy, dz = np.abs(rx - x), np.abs(ry - y), np.abs(rz - z)
    fx = (dx > dy) & (dx > dz)
    fz = ~fx & (dz > dy)
    rx = np.where(fx, -ry - rz, rx)
    rz = np.where(fz, -rx - ry, rz)
    cu = s * (math.sqrt(3) * rx + math.sqrt(3) / 2 * rz)
    cv = s * 1.5 * rz
    du, dv = np.abs(u - cu), np.abs(v - cv)
    d = np.maximum(du, du / 2 + dv * math.sqrt(3) / 2)
    return d > size / 2 - w


def seigaiha(u, v, R, w, rings=3):
    """Mask of the seigaiha wave pattern's lines (overlapping fans of `rings` arcs, radius R) on plane coords u, v."""
    h = R / 2
    owner_d = np.full(u.shape, 1e9)
    j0 = np.floor(v / h)
    for k in range(5):                       # (lower rows are drawn over the ones above)
        j = j0 - k
        cv = j * h
        off = np.mod(j, 2) * R
        cu = np.round((u - off) / (2 * R)) * 2 * R + off
        d = np.hypot(u - cu, v - cv)
        owner_d = np.where(d < R, d, owner_d)
    step = R / rings
    return (owner_d < R) & (np.mod(owner_d, step) < w)
