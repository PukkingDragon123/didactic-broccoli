"""Shared parts of はしご乗り Hashigo Nori ("New Year Ladder Frogs"): the bamboo ladder section every frog comes on,
and the frog itself (a cute PVC frog in a fire brigade's happi coat and twisted hachimaki), built from a pose.

Figure space (mm, Z up, the front is -Y). The ladder section: two bamboo rails (x = +-11, y = LY) from the foot
board (z 0..3) to z = TOP, two lashed rungs (z = RUNG), pegs on the rail tops and sockets under the board, so the
sections stack (pt_in at the board's underside, pt_out on the rail tops: art/blender/toys/GIMMICKS.md, playset).
A pose: the body's placement (rotation degrees XYZ, then the pelvis position) and each limb's elbow / knee and
wrist / ankle points in figure space, plus the hand / foot facing. The face is painted (lib/face.py).
"""
import math

import numpy as np

import kit
import tk
from mathutils import Euler, Matrix, Vector

LY = 2.0                  # the ladder's plane (rails, rungs)
RX = 11.0                 # rail centres
RR = 1.75                 # rail radius
TOP = 50.0                # the rail tops (where the next section's board sits)
RUNG = (13.0, 30.0)       # rung heights (the frogs perform in front of the ladder, the rungs pass behind them)
BOARD = (26.0, 19.0, 3.0)  # the foot board (x, y, z), centred at (0, LY - 3, 1.5)

# the frog's body, local: spine up +Z from the pelvis, the front -Y: (z, width, front half-depth, back half-depth)
BODY = [(-1.0, 8.0, 3.6, 3.6), (0.8, 12.6, 5.8, 5.2), (3.2, 14.2, 6.2, 5.4), (5.6, 14.6, 5.6, 5.0), (7.4, 18.0, 6.0, 4.8),
        (9.4, 22.0, 6.8, 5.0), (11.8, 22.4, 6.4, 4.8), (13.6, 19.6, 5.2, 4.0), (15.0, 13.6, 3.4, 2.6), (15.8, 6.0, 1.5, 1.1)]
SHOULDER = (6.4, -1.0, 6.2)  # (x mirrored)
HIP = (4.8, 0.6, 0.8)
EYE_BUMP = (7.7, -2.4, 14.6)  # the eye bumps, proud on the top corners of the wide flat head
MOUTH_Z = 9.6                # the mouth line, right across the front of the head (local)


def body_matrix(rot=(0, 0, 0), at=(0, 0, 0)):
    return Matrix.Translation(Vector(at)) @ Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4()


def W(M, p):
    """A local body point in figure space."""
    return tuple(M @ Vector(p))


# ------------------------------------------------------------------ the ladder section
def ladder(F, seed=1, nodes=(7.5, 21.0, 36.0, 46.0)):
    """The bamboo section: rails with nodes, two rope-lashed rungs, the foot board with peg sockets, pegs on top."""
    rng = np.random.default_rng(seed)
    his, los = [], []
    for sx in (-1, 1):
        x = sx * RX
        rail = tk.lathe('rail_hi', [(0, 2.0), (RR, 2.2)] + [(RR, z) for z in np.linspace(3, TOP - 0.4, 14)] + [(RR * 0.92, TOP), (0, TOP)], n=12)
        tk.move(rail, (x, LY, 0))

        def nodes_(h, x=x):
            def f(V, N):
                z = V[:, 2]
                d = sum(0.32 * np.exp(-((z - zn) / 0.55) ** 2) for zn in nodes)  # the bamboo nodes
                d += 0.06 * np.sin(V[:, 2] * 0.9 + np.arctan2(V[:, 1] - LY, V[:, 0] - x) * 3)  # faint fibres
                return d
            tk.push(h, f)
        tk.subsurf(rail, 2)
        nodes_(rail)
        his.append(rail)
        los.append(tk.lathe('rail', [(0, 2.0), (RR, 2.4), (RR, TOP - 0.6), (0, TOP)], n=6))
        tk.move(los[-1], (x, LY, 0))
        peg_h = tk.cyl('peg_hi', 0.8, TOP - 0.2, TOP + 1.8, n=10, at=(x, LY), bevel=0.25, segs=1)
        his.append(peg_h)
        los.append(tk.cyl('peg', 0.8, TOP - 0.2, TOP + 1.8, n=5, at=(x, LY), bevel=0, segs=0))
    for z in RUNG:
        r_hi = tk.tube('rung_hi', [(-RX, LY, z), (RX, LY, z)], 1.15, n=10, cap0='flat', cap1='flat')
        tk.subsurf(r_hi, 1)
        his.append(r_hi)
        los.append(tk.tube('rung', [(-RX + 1.2, LY, z), (RX - 1.2, LY, z)], 1.1, n=5, cap0='flat', cap1='flat'))
        for sx in (-1, 1):  # the rope lashing: a fat wrapped knot round each joint
            k = tk.tube('lash_hi', [(sx * (RX - 0.4), LY - 0.1, z - 1.9), (sx * (RX + 0.1), LY, z), (sx * (RX - 0.4), LY + 0.1, z + 1.9)], 2.05, n=10)
            tk.subsurf(k, 1)

            def wrap(h, sx=sx, z=z):
                tk.push(h, lambda V, N: 0.12 * np.sin((V[:, 2] - z) * 5.5 + (V[:, 0] - sx * RX) * 2.5))
            wrap(k)
            tk.set_region(k, 'rope')
            his.append(k)
    board = tk.rbox('board_hi', BOARD, centre=(0, LY - 3, BOARD[2] / 2), bevel=0.6, segs=2)
    for sx in (-1, 1):
        tk.boolean(board, tk.cyl('sock', 0.95, -0.5, 2.0, n=12, at=(sx * RX, LY), bevel=0, segs=0))
    tk.subsurf(board, 1)
    tk.push(board, lambda V, N: 0.07 * np.sin(V[:, 0] * 3.1 + 0.6 * np.sin(V[:, 1] * 0.9)) * (N[:, 2] > 0.5))  # wood grain
    tk.set_region(board, 'board')
    his.append(board)
    los.append(tk.rbox('board', BOARD, centre=(0, LY - 3, BOARD[2] / 2), bevel=0.5, segs=1))
    for h in his:
        if not h.data.materials:
            tk.set_region(h, 'bamboo')
    lo = tk.join(los, 'ladder')
    tk.decimate(lo, 300)
    F.part('ladder', lo, his, bone='root')
    kit.connector(F, 'in', (0, LY, 0), bone='root')
    kit.connector(F, 'out', (0, LY, TOP), bone='root')
    return lo


# ------------------------------------------------------------------ the frog
def warts(rng, n, lo_z, hi_z):
    """Wart centres on the back and the top of the head (local space)."""
    out = []
    for _ in range(n):
        z = rng.uniform(lo_z, hi_z)
        a = rng.uniform(-2.3, 2.3)  # round the back (0 = straight back)
        out.append((z, a, rng.uniform(0.45, 0.9)))
    return out


def body(F, M, name='body', seed=1, belly=1.0, head_k=1.0, happi=True, hachimaki=True, extra_highs=(), extra_lows=(), sculpt_more=None, tris=530):
    """The frog's body and head (one part), its happi coat and hachimaki, placed by M. belly / head_k: proportions."""
    rng = np.random.default_rng(seed)
    rings = []
    for z, w, hf, hb in BODY:
        kb = belly if 1.0 < z < 8.0 else 1.0
        kh = head_k if z > 11 else 1.0
        rings.append({'c': (0, 0, z * (1 if z < 11 else 1 + (kh - 1) * 0.5)), 'w': w * kh * (1 + (kb - 1) * 0.6), 'ht': hf * kh * kb, 'hb': hb * kh, 'e': 2.1})
    cage = tk.loft(name, rings, n=14, up=(0, -1, 0), cap0='round', cap1='round')
    W_ = warts(rng, 38, 2.0, 19.0)

    def sc(h):
        def f(V, N):
            x, y, z = V[:, 0], V[:, 1], V[:, 2]
            d = 0.0
            for sx in (1, -1):  # the eye bumps, and a soft cheek pouch under each
                d = d + tk.bump(V, (sx * EYE_BUMP[0] * head_k, EYE_BUMP[1], EYE_BUMP[2] * (1 + (head_k - 1) * 0.5)), 3.7, 3.9, sharp=1.3)
                d = d + tk.bump(V, (sx * 9.4 * head_k, -4.4, 8.6), 3.2, 0.45)  # the jaw corners
            back = y > -1.0
            ang = np.arctan2(x, np.maximum(y, 1e-3) + 3.0)
            for wz, wa, wh in W_:  # warts on the back and the head top (none on the belly)
                d = d + (back * wh * 0.55) * np.exp(-(((z - wz) / 0.8) ** 2 + ((ang - wa * 0.45) / 0.16) ** 2))
            d = d + 0.25 * tk.smoothstep(-2.0, -4.5, y) * (z < 9) * (z > 0)  # the round belly
            # (the mouth is painted: lib/face.py)
            return d + (sculpt_more(V, N) if sculpt_more else 0)
        tk.push(h, f)
    lo, hi = tk.lowhigh(cage, name, lo=1, hi=3, tris=330, sculpt=sc, region=('skin', [('belly', lambda C, N: (C[:, 1] < -2.8) & (C[:, 2] < MOUTH_Z - 0.4))]))  # (belly and throat)
    los, his = [lo], [hi]
    if happi:  # the happi coat: a shell over the torso, short wide sleeves are on the arms
        hr = [{'c': (0, 0, z), 'w': w + 1.3, 'ht': hf + 0.75, 'hb': hb + 0.75, 'e': 2.1} for z, w, hf, hb in BODY if 0.3 < z < 7.0]
        hr = [{'c': (0, 0, -0.3), 'w': BODY[1][1] + 1.6, 'ht': BODY[1][2] + 0.9, 'hb': BODY[1][3] + 0.9, 'e': 2.1}] + hr
        hr.append({'c': (0, 0, 7.6), 'w': 15.0, 'ht': 5.4, 'hb': 4.6, 'e': 2.1})
        hc = tk.loft('happi', hr, n=14, up=(0, -1, 0), cap0=None, cap1=None)
        hlo, hhi = tk.lowhigh(hc, 'happi', lo=1, hi=2, tris=130, region='happi')
        tk.push(hhi, lambda V, N: 0.18 * np.sin(np.arctan2(V[:, 0], V[:, 1]) * 9 + V[:, 2] * 0.4) * (V[:, 2] < 4))  # folds at the hem
        los.append(hlo)
        his.append(hhi)
    if hachimaki:  # the twisted headband round the head, the knot at the back with two short tails
        zc = 12.2 * (1 + (head_k - 1) * 0.5)  # round the head between the mouth and the eye bumps
        ring = [(math.sin(a) * (11.25 * head_k), -math.cos(a) * (6.55 * head_k) * (1.0 if math.cos(a) > 0 else 0.76), zc + 0.3 * math.cos(a))
                for a in np.linspace(0, 2 * math.pi, 18, endpoint=False)]
        band_hi = tk.tube('band_hi', ring, 0.6, n=8, closed=True, squash=1.8)
        tk.push(band_hi, lambda V, N: 0.22 * np.sin(np.arctan2(V[:, 0], V[:, 1]) * 22 + V[:, 2] * 3))  # the twist
        band_lo = tk.tube('band', ring[::2], 0.6, n=4, closed=True, squash=1.8)
        knot_hi = tk.loft('knot_hi', [{'c': (0, 4.9 * head_k, zc - 0.6), 'w': 1.0, 'h': 0.8}, {'c': (0, 5.8 * head_k, zc - 0.4), 'w': 2.4, 'h': 1.4},
                                      {'c': (0, 6.4 * head_k, zc - 0.5), 'w': 1.4, 'h': 0.9}], n=8)
        tails = [tk.tube('tail_hi', [(0, 6.2 * head_k, zc - 0.6), (sx * 1.6, 7.3 * head_k, zc - 2.0), (sx * 2.4, 7.6 * head_k, zc - 3.6)], [0.7, 0.6, 0.45], n=6, squash=0.45)
                 for sx in (1, -1)]
        bh = tk.join([band_hi, knot_hi] + tails, 'band_hi')
        tk.set_region(bh, 'band')
        knot_lo = tk.loft('knot', [{'c': (0, 5.2 * head_k, zc - 0.6), 'w': 1.6, 'h': 1.0}, {'c': (0, 6.3 * head_k, zc - 0.5), 'w': 1.6, 'h': 1.0}], n=4)
        tails_lo = [tk.tube('tail', [(0, 6.2 * head_k, zc - 0.6), (sx * 2.4, 7.6 * head_k, zc - 3.6)], 0.6, n=3, squash=0.45) for sx in (1, -1)]
        los.append(tk.join([band_lo, knot_lo] + tails_lo, 'band'))
        his.append(bh)
    los += list(extra_lows)
    his += list(extra_highs)
    for o in los + his:
        tk.transform(o, M)
    lo = tk.join(los, name)
    tk.decimate(lo, tris)
    return lo, his


def limb(F, name, pts, radii, end, end_dir, end_up, fingers=4, splay=1.0, pad=0.55, length=4.2, sleeve=None, bone=None, tris=150):
    """An arm or a leg along pts (shoulder / hip, elbow / knee, wrist / ankle) ending in a webbed hand or foot: `fingers`
    long toes with round sticky pads, spread over `splay` radians round end_dir (end_up: the back of the hand)."""
    los, his = [], []
    t_hi = tk.tube(name + '_hi', pts, radii, n=10)
    tk.subsurf(t_hi, 2)
    his.append(t_hi)
    los.append(tk.tube(name + '_lo', pts, radii, n=6))
    d = Vector(end_dir).normalized()
    up = Vector(end_up).normalized()
    side = d.cross(up).normalized()
    up = side.cross(d).normalized()
    e = Vector(end)
    palm_hi = tk.loft(name + '_palm_hi', [{'c': tuple(e - d * 0.4), 'w': radii[-1] * 1.9, 'h': radii[-1] * 0.7},
                                          {'c': tuple(e + d * 1.3), 'w': radii[-1] * 2.6, 'h': radii[-1] * 0.55}], n=10, up=tuple(up))
    tk.subsurf(palm_hi, 1)
    his.append(palm_hi)
    los.append(tk.loft(name + '_palm', [{'c': tuple(e - d * 0.4), 'w': radii[-1] * 1.9, 'h': radii[-1] * 0.7},
                                        {'c': tuple(e + d * 1.3), 'w': radii[-1] * 2.6, 'h': radii[-1] * 0.55}], n=5, up=tuple(up)))
    for i in range(fingers):
        a = (i / max(1, fingers - 1) - 0.5) * splay
        fd = (d * math.cos(a) + side * math.sin(a)).normalized()
        L = length * (0.85 + 0.3 * (1 - abs(i / max(1, fingers - 1) - 0.6)))
        p0, p1 = e + d * 1.0, e + d * 1.0 + fd * L
        f_hi = tk.tube(name + '_f_hi', [tuple(p0), tuple((p0 + p1) / 2), tuple(p1)], [0.55, 0.45, 0.42], n=6, squash=0.7, up=tuple(up))
        pad_hi = tk.loft(name + '_pad', [{'c': tuple(p1 - fd * 0.2), 'w': pad * 1.6, 'h': pad * 0.8}, {'c': tuple(p1 + fd * 0.35), 'w': pad * 1.7, 'h': pad * 0.85},
                                        {'c': tuple(p1 + fd * 0.8), 'w': pad * 0.7, 'h': pad * 0.4}], n=8, up=tuple(up))
        tk.set_region(pad_hi, 'pad')
        his += [f_hi, pad_hi]
        los.append(tk.tube(name + '_f', [tuple(p0), tuple(p1 + fd * 0.6)], [0.42, 0.5], n=3, squash=0.7, up=tuple(up)))
    if sleeve:  # the happi's short wide sleeve round the upper arm
        a, b = Vector(pts[0]), Vector(pts[1])
        s_pts = [tuple(a - (b - a) * 0.05), tuple(a + (b - a) * sleeve)]
        s_hi = tk.tube(name + '_sl_hi', s_pts, [radii[0] + 0.9, radii[0] + 1.4], n=12, cap1='flat')
        tk.subsurf(s_hi, 1)
        tk.set_region(s_hi, 'happi')
        his.append(s_hi)
        los.append(tk.tube(name + '_sl', s_pts, [radii[0] + 0.9, radii[0] + 1.4], n=6, cap1='flat'))
    for h in his:
        if not h.data.materials:
            tk.set_region(h, 'skin')
    lo = tk.join(los, name)
    tk.decimate(lo, tris)
    F.part(name, lo, his, bone=bone or name)
    return lo


def arm(F, M, sx, elbow, wrist, hand_dir, hand_up, name=None, tris=118, **kw):
    sh = W(M, (sx * SHOULDER[0], SHOULDER[1], SHOULDER[2]))
    a, e, w = Vector(sh), Vector(elbow), Vector(wrist)
    pts = [tuple(a), tuple(a.lerp(e, 0.45)), tuple(e), tuple(e.lerp(w, 0.4)), tuple(w)]
    return limb(F, name or ('arm_l' if sx > 0 else 'arm_r'), pts, [2.1, 2.25, 1.5, 1.7, 1.05], wrist, hand_dir, hand_up,
                fingers=4, splay=1.9, pad=1.05, length=3.3, sleeve=0.22, tris=tris, **kw), sh


def leg(F, M, sx, knee, heel, ankle, foot_dir, foot_up, name=None, tris=132, **kw):
    """A frog's back leg folded like a Z: a fat thigh to the knee, the shin back to the heel, the long foot forward
    to the toes' base (`ankle`), then five long toes with round pads."""
    hp = W(M, (sx * HIP[0], HIP[1], HIP[2]))
    return limb(F, name or ('leg_l' if sx > 0 else 'leg_r'), [hp, knee, heel, ankle], [3.4, 2.1, 1.35, 1.05], ankle, foot_dir, foot_up,
                fingers=5, splay=1.5, pad=0.75, length=4.2, tris=tris, **kw), hp


# ------------------------------------------------------------------ paint
def paint_ladder(P, pt, sh, seed=1):
    X, Yc, Z = P.X, P.Y, P.Z
    BAMBOO = pt.ramp('#c9b46a', 7, shift=0.07)
    P.fill('bamboo', BAMBOO, tone=sh, base=0.05)
    rail = P.region('bamboo')
    node = rail & np.any([np.abs(Z - zn) < 0.45 for zn in (7.5, 21.0, 36.0, 46.0)], axis=0)
    P.tint(node, pt.ramp('#8f8a4a', 6, shift=0.06), sh - 0.05)
    P.tint(rail & (np.sin(Z * 0.5 + X * 2.0) > 0.93), pt.ramp('#a89650', 6, shift=0.05), sh)  # streaks in the cane
    P.fill('rope', pt.ramp('#3a3330', 6, shift=0.04), tone=sh, base=0.0)
    P.tint(P.region('rope') & (np.sin((Z + X) * 6.0) > 0.3), pt.ramp('#57504a', 5, shift=0.03), sh)
    P.fill('board', pt.ramp('#b98a55', 7, shift=0.07), tone=sh, base=0.05)
    grain = P.region('board') & (np.sin(X * 3.1 + 0.6 * np.sin(Yc * 0.9)) > 0.55)
    P.tint(grain, pt.ramp('#9a6e40', 6, shift=0.06), sh)
    # the brigade's mark on the board front: a ring and a three-toed frog foot (our own crest)
    front = P.region('board') & (P.on[:, :, 1] < -0.6)
    cy = 1.5
    r = np.hypot(X, Z - cy)
    P.flat(front & (np.abs(r - 1.15) < 0.24), '#2a2220')
    for a in (-0.55, 0.0, 0.55):
        P.flat(front & (r < 0.95) & (np.abs(np.arctan2(X, Z - cy + 0.6) - a) < 0.13) & (r > 0.1), '#2a2220')


def paint_frog(P, pt, sh, skin='#6faa3c', belly='#e6dd9c', happi='#2c3c6a', spots=None, seed=1):
    X, Yc, Z = P.X, P.Y, P.Z
    SK = pt.ramp(skin, 7, shift=0.08)
    P.fill('skin', SK, tone=sh, base=0.05)
    P.fill('belly', pt.ramp(belly, 6, shift=0.06), tone=sh, base=0.15)
    P.fill('pad', pt.ramp(belly, 6, shift=0.06), tone=sh, base=0.1)
    if spots:  # uneven spots on the back and limbs, each a lumpy blob with a brushy lighter edge
        rng = np.random.default_rng(seed)
        m = P.region('skin') & (P.on[:, :, 1] > -0.75)
        core, edge = np.zeros(m.shape, bool), np.zeros(m.shape, bool)
        for _ in range(70):
            c = rng.uniform((-16, -12, 2), (16, 12, 46))
            r0 = rng.uniform(0.6, 1.5)
            d = np.sqrt((X - c[0]) ** 2 + (Yc - c[1]) ** 2 + (Z - c[2]) ** 2)
            ang = np.arctan2(Z - c[2], X - c[0])
            rr = r0 * (1 + 0.22 * np.sin(3 * ang + rng.uniform(0, 6)) + 0.12 * np.sin(5 * ang + rng.uniform(0, 6)))
            core |= d < rr
            edge |= (d < rr + 0.35) & ((np.sin(X * 7.3 + Z * 5.1) + np.sin(Yc * 6.1 - Z * 4.4)) > 0.2)  # (a dry-brush edge)
        P.tint(m & edge & ~core, pt.ramp(spots, 6, shift=0.06), sh + 0.35)
        P.tint(m & core, pt.ramp(spots, 6, shift=0.06), sh)
    HP = pt.ramp(happi, 7, dark=0.5, shift=0.06)
    P.fill('happi', HP, tone=sh, base=0.0)
    P.fill('band', pt.ramp('#f1ece0', 6, shift=0.05), tone=sh * 0.7, base=0.15)
    return SK, HP


def happi_marks(P, M, pt, sh, collar='#efe6cf', crest='#efe6cf'):
    """The happi's printed collar bands down the front (a V that opens over the belly) and the big crest on the back."""
    Minv = M.inverted()
    Q = P.pos @ np.array(Minv.to_3x3()).T + np.array(Minv.translation)
    x, y, z = Q[:, :, 0], Q[:, :, 1], Q[:, :, 2]
    m = P.region('happi')
    front = m & (y < -1.5)
    vline = np.abs(np.abs(x) - (0.6 + 0.32 * np.clip(10.6 - z, 0, None))) < 0.75
    P.flat(front & vline, collar)
    # little printed characters down each collar band (dashes in the indigo)
    P.flat(front & vline & (np.abs(np.abs(x) - (0.6 + 0.32 * np.clip(10.6 - z, 0, None))) < 0.22) & (np.sin(z * 4.2) > 0.4), happi_ink(collar))
    back = m & (y > 2.0)
    r = np.hypot(x, z - 5.4)
    P.flat(back & (np.abs(r - 2.6) < 0.38), crest)
    for a in (-0.55, 0.0, 0.55):
        P.flat(back & (r < 2.1) & (r > 0.3) & (np.abs(np.arctan2(x, z - 5.4 + 1.2) - a) < 0.12), crest)
    # the hem: a printed band of white lines
    P.flat(m & (np.abs(z - 0.9) < 0.22), crest)
    return Q


def happi_ink(col):
    return '#2c3c6a'


# ------------------------------------------------------------------ the figure script's run
def run(F, ARGS, make_rig, paint_fn, cam=((70, -110, 52), (0, -2, 23)), back=((-70, 100, 52), (0, 0, 23)), skip=(), folds=(0, 20, 40, 60)):
    """--preview / --fold / --clip, or the full build: unwrap, bake, paint, rig, export (like the henshin scripts)."""
    import os
    import sys
    OUT = os.path.join(F.out, F.id)
    F.log('tris', F.tris(), {p.name: tk.tri_count(p.low) for p in F.parts})
    if '--clip' in ARGS:
        from rig import check_clip
        R = make_rig()
        res = check_clip(R, F.parts, range(1, 91), skip=list(skip), tol=0.35)
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
    F.bake(ao_samples=24 if '--fast' in ARGS else 128, ao_dist=5.0, reuse='--repaint' in ARGS)
    P = pt.Painter(F.maps, F.region_index, F.size)
    F.finish(paint_fn(P, pt))
    F.drop_highs()
    R = make_rig()
    kit.points(R)
    F.export(R)


def frog_face(P, M, eyes='dot', mouth='upturn', seed=1, head_k=1.0, brows=None, blush=False, mouth_w=19.0, look=1, **mk):
    """The frog's face, painted like a quick marker drawing: a dot (or line) eye on the front of each eye bump and ONE
    mouth stroke right across the front of the head (or another mouth, still wide). The toe pads and the mouth get
    their ink outline from paint_frog / P.lines."""
    import face
    o = np.array(W(M, (0, 0, 0)))
    fwd = np.array(W(M, (0, -1, 0))) - o
    up = np.array(W(M, (0, 0, 1))) - o
    skin = P.region('skin') | P.region('belly')
    zf = 1 + (head_k - 1) * 0.5
    for sx in (-1, 1):  # one Face per bump, looking out of the bump's front
        bump = np.array(W(M, (sx * EYE_BUMP[0] * head_k, EYE_BUMP[1] - 2.6, EYE_BUMP[2] * zf + 0.9)))
        ax = fwd + up * 0.45 + (np.array(W(M, (sx, 0, 0))) - o) * 0.15
        fc = face.Face(P, tuple(bump), tuple(ax), up=tuple(up), where=skin, seed=seed + sx, depth=2.5)
        kind = ('dot' if sx < 0 else 'happy') if eyes == 'wink' else eyes
        fc.eyes(kind, spread=0.0, size=0.85, dy=0.0, look=look, only=sx)
        if brows:
            fc.brows(brows, spread=0.0, dy=2.1, w=2.4, only=sx)
    fc = face.Face(P, W(M, (0, -6.6 * head_k, MOUTH_Z * zf)), tuple(fwd), up=tuple(up), where=skin, seed=seed + 7)
    fc.mouth(mouth, w=mouth_w * head_k, dy=0.0, **mk)
    if blush:
        fc.blush(16.0 * head_k, 1.6, rx=1.8, ry=0.95, col='#e88c6c')


def grow(F, M, pivot, k=1.15, shift=(0, 0, 0)):
    """Scale the frog (every part but the ladder) by k about `pivot` (its contact with the ladder or the board), then
    shift it (the rungs moved). Returns T (a point map for the rig's pivots) and the new body matrix."""
    pv, sh = Vector(pivot), Vector(shift)
    G = Matrix.Translation(pv + sh) @ Matrix.Diagonal((k, k, k, 1)) @ Matrix.Translation(-pv)
    for p in F.parts:
        if p.name == 'ladder':
            continue
        tk.transform(p.low, G)
        for h in p.highs:
            tk.transform(h, G)
    T = lambda q: tuple(G @ Vector(q))  # noqa: E731
    return T, G @ M
