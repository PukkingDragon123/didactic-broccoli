"""2D convex hull helpers (shared by audit.py and sources.rest)."""


def hull2(pts):
    pts = sorted(set((round(float(p[0]), 5), round(float(p[1]), 5)) for p in pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def inside2(H, q):
    return all((H[i][0] - H[i - 1][0]) * (q[1] - H[i - 1][1]) - (H[i][1] - H[i - 1][1]) * (q[0] - H[i - 1][0]) >= 0 for i in range(len(H)))
