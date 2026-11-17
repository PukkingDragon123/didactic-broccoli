"""Capsule-toy mascot kit (CLAUDE.md toy rule: real gashapon mascot figures): chunky soft PVC forms built as lofts,
painted faces (dot eyes with a catchlight, airbrushed blush, a tiny mouth) put straight onto the surface with spots,
and the whole-toy gimmick. Units mm, Y up, the figure faces +Z and stands on y = 0."""
import math


def vbody(F, pid, rings, col, style="pvc", sides=14, at=(0, 0, 0), **kw):
    """A soft upright form from rings [(y, w, d), ...] or [(y, w, d, z), ...] bottom to top; returns a surface lookup."""
    R = [(r[0], r[1], r[2], r[3] if len(r) > 3 else 0.0) for r in rings]
    F.loft(pid, [((0, y, z), [w, d]) for y, w, d, z in R], at, sides=sides, rnd=2.1, up=[0, 0, 1], col=col, style=style, **kw)

    def surf(y, ang, out=0.15):
        """The surface point at height y, `ang` degrees round from the front (+ toward +x), in part coordinates."""
        for (y0, w0, d0, z0), (y1, w1, d1, z1) in zip(R, R[1:]):
            if y0 <= y <= y1:
                t = (y - y0) / max(y1 - y0, 1e-6)
                w, d, z = w0 + (w1 - w0) * t, d0 + (d1 - d0) * t, z0 + (z1 - z0) * t
                a = math.radians(ang)
                return [round((w / 2 + out) * math.sin(a), 2), round(y, 2), round(z + (d / 2 + out) * math.cos(a), 2)]
        raise ValueError(f"{pid}: y {y} outside the body")
    return surf


def hbody(F, pid, rings, col, style="pvc", sides=12, at=(0, 0, 0), **kw):
    """A soft lying form along Z from rings [(z, w, h, y), ...] back to front; returns a surface lookup."""
    F.loft(pid, [((0, y, z), [w, h]) for z, w, h, y in rings], at, sides=sides, rnd=2.1, col=col, style=style, **kw)

    def surf(z, ang, out=0.15):
        """The surface point at z, `ang` degrees round from the top (+ toward +x)."""
        for (z0, w0, h0, y0), (z1, w1, h1, y1) in zip(rings, rings[1:]):
            if min(z0, z1) <= z <= max(z0, z1):
                t = (z - z0) / ((z1 - z0) or 1e-6)
                w, h, y = w0 + (w1 - w0) * t, h0 + (h1 - h0) * t, y0 + (y1 - y0) * t
                a = math.radians(ang)
                return [round((w / 2 + out) * math.sin(a), 2), round(y + (h / 2 + out) * math.cos(a), 2), round(z, 2)]
        raise ValueError(f"{pid}: z {z} outside the body")
    return surf


def dot(F, pid, centres, ramp, tone, rid):
    F.layer(pid, id=rid, op="spots", centers=[list(c) for c in centres], ramp=ramp, tone=tone, roughness=0)


def face(F, pid, eyeL, eyeR, er=1.1, mouth=None, mouth_kind="smile", mr=0.9, blushL=None, blushR=None, br=1.9,
         brows=None, eye_ramp="ink", blush_ramp=None, mouth_ramp=None):
    """A gashapon face painted on the part: dot eyes with a white catchlight, soft two-step airbrushed blush and a
    small mouth (smile: a little arc of dots; open: a dark oval with a pink tongue; dot: one dot)."""
    blush_ramp = blush_ramp or F.c("#f08a90", spread=0.6)
    if blushL:
        dot(F, pid, [blushL + [br * 1.3], blushR + [br * 1.3]], blush_ramp, 4.5, "blush_soft")
        dot(F, pid, [blushL + [br], blushR + [br]], blush_ramp, 3.4, "blush")
    dot(F, pid, [eyeL + [er], eyeR + [er]], eye_ramp, 1.2, "eyes")
    hi = [[e[0] - er * 0.35, e[1] + er * 0.4, e[2] + 0.2, er * 0.36] for e in (eyeL, eyeR)]
    dot(F, pid, hi, "white", 5.0, "catch")
    if brows:
        dot(F, pid, [b + [0.45] for b in brows], eye_ramp, 1.6, "brows")
    if mouth:
        mr_ = mouth_ramp or F.c("#7a2a2a")
        if mouth_kind == "open":
            dot(F, pid, [mouth + [mr]], mr_, 1.6, "mouth")
            dot(F, pid, [[mouth[0], mouth[1] - mr * 0.45, mouth[2] + 0.2, mr * 0.5]], blush_ramp, 3.0, "tongue")
        elif mouth_kind == "dot":
            dot(F, pid, [mouth + [mr * 0.5]], mr_, 1.6, "mouth")
        else:  # a small smiling arc of dots
            pts = []
            for i in range(5):
                a = math.radians(-50 + 25 * i)
                pts.append([mouth[0] + mr * math.sin(a), mouth[1] - mr * 0.5 * math.cos(a) + mr * 0.25, mouth[2], 0.32])
            dot(F, pid, pts, mr_, 1.6, "mouth")


def nub(F, pid, a, b, r0, r1, col, style="pvc", sides=8, flat=1.0):
    """A chunky rounded limb / stub from a to b with domed ends (mascot arms, legs, feet)."""
    dx, dy, dz = (b[i] - a[i] for i in range(3))
    L = max(math.sqrt(dx * dx + dy * dy + dz * dz), 1e-6)
    u = (dx / L, dy / L, dz / L)
    rings = [((a[0] - u[0] * r0 * 0.6, a[1] - u[1] * r0 * 0.6, a[2] - u[2] * r0 * 0.6), [r0 * 1.1, r0 * 1.1 * flat]),
             (a, [2 * r0, 2 * r0 * flat]), (b, [2 * r1, 2 * r1 * flat]),
             ((b[0] + u[0] * r1 * 0.55, b[1] + u[1] * r1 * 0.55, b[2] + u[2] * r1 * 0.55), [r1 * 1.3, r1 * 1.3 * flat])]
    return F.loft(pid, rings, (0, 0, 0), sides=sides, rnd=2.1, subdiv=0, col=col, style=style)


def ball(F, pid, c, r, col, style="pvc", sides=12, n=8, squash=1.0, **kw):
    """A soft ball (dango, a bead, a pompom), slightly squashed by `squash` in Y."""
    rings = []
    for i in range(n + 1):
        a = math.pi * i / n
        rings.append(((0, -r * squash * math.cos(a), 0), [max(2 * r * math.sin(a), 0.05)] * 2))
    return F.loft(pid, rings, tuple(c), sides=sides, rnd=2.0, subdiv=0, up=[0, 0, 1], col=col, style=style, **kw)


def gimmick(F, kind="wobble", length=1.4, amp=8.0):
    """The click gimmick: the whole figure rocks (wobble), nods (nod), hops (hop) or spins (spin) as one piece."""
    root = {"id": "root", "shape": "bone", "pivot": [0, 0, 0]}
    for p in F.spec["parts"]:
        p.setdefault("parent", "root")
    F.spec["parts"].insert(0, root)
    F.ids["root"] = root
    if kind == "hop":
        tr = [{"part": "root", "channel": "position", "keys": [[0, [0, 0, 0]], [0.25, [0, amp, 0]], [0.5, [0, 0, 0]],
                                                              [0.72, [0, amp * 0.4, 0]], [1.0, [0, 0, 0]]]}]
    elif kind == "spin":
        tr = [{"part": "root", "keys": [[0, [0, 0, 0]], [1.0, [0, 360, 0]]], "ease": "inout_back"}]
    else:
        ax = 0 if kind == "nod" else 2
        k = lambda v: [v if i == ax else 0 for i in range(3)]
        tr = [{"part": "root", "keys": [[0, k(0)], [0.3, k(amp)], [0.65, k(-amp * 0.6)], [1.0, k(0)]]}]
    for t in tr:
        t["keys"] = [[round(a * length, 3)] + list(rest) for a, *rest in t["keys"]]
    F.clip(kind, length, tr, role="gimmick")
