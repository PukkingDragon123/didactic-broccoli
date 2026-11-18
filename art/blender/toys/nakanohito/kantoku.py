"""監督 The Director (series nakanohito, secret): the studio's king kaijū, a red-and-white ranchu goldfish monster with
a bumpy wen hood, a little gold crown, fin hands and a great double tail fanned out on the floor, a megaphone in one
fin. Press it: the hood tips back and there is nobody inside ... then up comes the director, an old tortoise in a green
sun visor, who had pulled its head in. "Cut!"

    tools/blender.sh art/blender/toys/nakanohito/kantoku.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _suit import *  # noqa: E402,F401,F403

F = Fig('nakanohito', 'kantoku')

# ------------------------------------------------------------------ the suit: a round goldfish body on stubby legs
BODY = [(7.0, 1.0, 16.0, 7.0, 7.0), (10.0, 0.5, 24.0, 11.0, 10.0), (16.0, 0.0, 27.0, 12.5, 11.5), (22.0, 0.0, 26.0, 11.8, 11.0),
        (27.0, 0.5, 22.0, 9.5, 9.5), (31.0, 0.8, 16.0, 7.0, 7.0), (33.2, 1.0, 10.5, 4.8, 4.8)]
ZIP = [(8.6, 30.0), (10.6, 25.0), (11.4, 19.0)]


def fish_scales(V, amp=0.16):
    """Overlapping goldfish scales: rows of little arcs, each scale's lower edge proud."""
    a = np.arctan2(V[:, 0], -V[:, 1] + 1e-3) * 7.0
    z = V[:, 2] * 0.62
    row = np.floor(z)
    a = a + 0.5 * (row % 2)
    fa, fz = a - np.floor(a) - 0.5, z - row
    d = np.hypot(fa * 1.2, fz - 0.15)
    return amp * tk.smoothstep(0.62, 0.45, d) - amp * 0.5


def sc_body(h):
    def f(V, N):
        belly = tk.smoothstep(-0.3, -0.7, N[:, 1]) * tk.smoothstep(8.0, 6.0, np.abs(V[:, 0]))
        return fish_scales(V) * (1 - belly) + zip_groove(0.0, ZIP)(V, N)
    tk.push(h, f)


trunk_lo, trunk_hi = trunk('trunk', BODY, tris=240, region=('suit', [('belly', lambda C, N: (N[:, 1] < -0.55) & (np.abs(C[:, 0]) < 7.4) & (C[:, 2] > 9.0) & (C[:, 2] < 30.0))]),
                           sculpt=sc_body)
los, his = [trunk_lo], [trunk_hi]
for sx in (1, -1):
    lg, lgh = limb('leg', [(sx * 7.6, 0.5, 10.5), (sx * 8.8, -0.8, 6.4), (sx * 8.6, 0.0, 3.2)], [5.0, 4.6, 3.9], tris=50)
    ft, fth = foot('foot', (sx * 8.8, 3.6), (sx * 0.2, -1), L=10.4, W=8.4, H=4.6, toes=0, tris=50)
    los += [lg, ft]
    his += [lgh] + fth
# the double tail: two fans spread on the floor behind, their edges ruffled and lifting
for sx in (1, -1):
    out = [(sx * u * 1.35, v * 1.3) for u, v in [(0.0, 0.0), (4.0, 3.0), (9.6, 6.0), (14.0, 11.6), (13.6, 16.6), (9.0, 15.0), (5.6, 17.6), (2.4, 12.0), (0.6, 5.0)]]
    out = out if sx > 0 else out[::-1]
    fan_hi = tk.slab('fan_hi', [(x, y + 8.0) for x, y in smooth_outline(out, 36)], 1.0, plane='XY', at=0.0, bevel=0.35, segs=2)
    tk.subsurf(fan_hi, 1)
    fan_lo = tk.slab('fan', [(x, y + 8.0) for x, y in smooth_outline(out, 12)], 1.0, plane='XY', at=0.0, bevel=0, segs=0)
    for o in (fan_hi, fan_lo):
        tk.deform(o, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], 0.55 + 4.6 * np.clip(1 - (V[:, 1] - 8.0) / 9.0, 0, 1) ** 1.6 + 0.04 * np.clip(V[:, 1] - 22.0, 0, None) ** 2
                                              + 0.35 * np.sin(np.arctan2(V[:, 1] - 8, V[:, 0]) * 9) * tk.smoothstep(14, 26, V[:, 1])], 1))
    tk.push(fan_hi, lambda V, N: 0.12 * np.sin(np.arctan2(V[:, 1] - 8.0, V[:, 0]) * 26) * (np.abs(N[:, 2]) > 0.5))  # the fin rays
    tk.set_region(fan_hi, 'fin')
    his.append(fan_hi)
    los.append(fan_lo)
root_hi = tk.tube('troot_hi', [(0, 7.0, 8.0), (0, 10.0, 3.6), (0, 11.0, 1.4)], [4.0, 3.0, 1.6], n=12)
tk.set_region(root_hi, 'suit')
his.append(root_hi)
los.append(tk.tube('troot', [(0, 7.0, 8.0), (0, 10.0, 3.6), (0, 11.0, 1.4)], [4.0, 3.0, 1.6], n=6))
cl, clh = collar('collar', (0, -0.4, 33.6), 5.0, 4.6, r=0.9)
zl, zh = zip_tab('tab', (0, 8.7, 30.2))
los += [cl, zl]
his += [clh] + zh
F.part('body', tk.decimate(tk.join(los, 'body'), 560), his, bone='body')

# ------------------------------------------------------------------ the arms: short, ending in fin mittens; a megaphone in one
SH = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    sh_ = (sx * 12.0, -1.0, 24.6)
    wr = (sx * 14.6, -4.6, 18.8)
    a, ah = limb(nm, [sh_, (sx * 14.4, -2.6, 21.8), wr], [3.4, 3.0, 2.6], tris=44)
    hd, hdh = mitten(nm + '_fin', wr, (sx * 0.2, -0.5, -1), (sx * 1.0, 0.0, 0.0), L=5.6, W=5.8, T=1.5, claws=0, region='fin', tris=40)
    tk.push(hdh[0], lambda V, N: 0.1 * np.sin(V[:, 1] * 6.0 + V[:, 2] * 2.0))
    parts_lo, parts_hi = [a, hd], [ah] + hdh
    if sx < 0:  # the director's megaphone, held out front
        MP0 = (sx * 15.2, -6.0, 15.6)
        mp_hi = tk.lathe('mega_hi', [(0, 0.4), (0.9, 0.4), (0.9, -0.6), (1.2, -1.0), (2.4, -5.0), (3.4, -8.2), (3.6, -8.6), (3.0, -8.4), (0, -6.2)], n=18, axis='Y', centre=MP0)
        tk.regions(mp_hi, 'mega', [('mega_in', lambda C, N: (N[:, 1] > 0.3) & (C[:, 1] < MP0[1] - 6.0))])
        grip = tk.tube('grip_hi', [(MP0[0], MP0[1] - 2.6, MP0[2] - 1.4), (MP0[0], MP0[1] - 2.8, MP0[2] - 4.4)], 0.7, n=8, cap0='round', cap1='round')
        tk.set_region(grip, 'grip')
        mp_lo = tk.lathe('mega', [(0, 0.4), (0.9, 0.4), (1.2, -1.0), (3.6, -8.6), (0, -6.2)], n=8, axis='Y', centre=MP0)
        parts_lo.append(mp_lo)
        parts_hi += [mp_hi, grip]
    F.part(nm, tk.decimate(tk.join(parts_lo, nm), 130 if sx < 0 else 76), parts_hi, bone=nm)
    SH[nm] = sh_

# ------------------------------------------------------------------ the hood: a ranchu's blunt head under a raspberry wen, a crown
HOOD = [(9.0, 41.0, 16.0, 7.5, 7.5), (5.0, 41.5, 24.0, 11.0, 9.6), (0.0, 41.5, 26.0, 11.6, 10.0), (-5.0, 41.0, 25.0, 11.0, 9.6),
        (-9.0, 40.4, 21.0, 9.0, 8.4), (-11.6, 40.0, 14.0, 6.0, 5.6)]
cage = tk.loft('hood', [{'c': (0, y, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.1} for y, z, w, ht, hb in HOOD], n=14, up=(0, 0, 1), cap0='round', cap1='round')
rng = np.random.default_rng(7)
WEN = []
for _ in range(46):  # the wen: bumps over the crown and down the cheeks, none on the face's middle
    a = rng.uniform(-math.pi * 0.95, math.pi * 0.95)
    e = rng.uniform(0.05, 1.25)
    c = (12.6 * math.sin(a) * math.cos(e) * 0.95, -1.0 - 11.0 * math.cos(a) * math.cos(e), 41.5 + 11.0 * math.sin(e))
    if c[1] < -9.0 and abs(c[0]) < 5.0 and c[2] < 46.0:
        continue
    WEN.append((c, rng.uniform(1.3, 2.3)))


def sc_hood(h):
    def f(V, N):
        d = 0.0
        for c, r in WEN:
            d = d + tk.bump(V, c, r, 0.55 * r, sharp=1.8)
        d = d + tk.bump(V, (0, -12.8, 38.4), 2.2, 0.9)  # the pouting mouth
        return d
    tk.push(h, f)


hood_lo, hood_hi = lh(cage, 'hood', None, ('suit', [('wen', lambda C, N: (C[:, 2] > 47.5) & (C[:, 1] < 6.0))]), sculpt=sc_hood)
hollow(hood_lo, hood_hi, (0, -0.4, 40.8), (9.6, 9.4, 9.0), bottom=31.6)
tk.decimate(hood_lo, 300)
F.part('hood', hood_lo, [hood_hi], bone='hood')
CR0 = (0, -1.6, 52.4)
crown_hi = tk.lathe('crown_hi', [(0, -0.6), (3.0, -0.6), (3.2, 0.4), (3.0, 2.4), (2.4, 2.4), (2.4, 0.6), (0, 0.6)], n=20, centre=CR0)
pts_ = []
for k_ in range(5):
    a = 2 * math.pi * k_ / 5
    p = (CR0[0] + 2.8 * math.cos(a), CR0[1] + 2.8 * math.sin(a), CR0[2] + 2.0)
    pts_.append(cone('pt_hi', p, (p[0], p[1], p[2] + 1.8), 0.7, n=6))
    pts_.append(ball('gem_hi', (p[0], p[1], p[2] + 2.0), 0.45, n=6, rings=4))
crown_hi = tk.join([crown_hi] + pts_, 'crown_hi')
tk.set_region(crown_hi, 'gold')
crown_lo = tk.lathe('crown', [(0, -0.6), (3.2, -0.4), (3.0, 3.6), (2.4, 3.6), (2.4, 0.6), (0, 0.6)], n=10, centre=CR0)
tk.rotate(crown_lo, 0, 'Z')
for o in (crown_hi, crown_lo):
    tk.rotate(o, 14, 'X', pivot=CR0)
    tk.rotate(o, -10, 'Y', pivot=CR0)
F.part('crown', crown_lo, [crown_hi], bone='hood', kind='metal', uvw=0.8)

# ------------------------------------------------------------------ the actor: the old tortoise, head drawn in, in a green visor
UP = 13.5          # how far the head comes up out of the suit
AC = (0, -0.6, 39.6 - UP)   # (modelled drawn in, inside the suit)
th = tk.loft('actor', [{'c': (0, AC[1] + 3.0, AC[2] + 0.2), 'w': 6.0, 'ht': 3.0, 'hb': 2.8}, {'c': (0, AC[1], AC[2] + 0.6), 'w': 7.6, 'ht': 3.8, 'hb': 3.2},
                       {'c': (0, AC[1] - 2.8, AC[2] + 0.2), 'w': 6.6, 'ht': 3.2, 'hb': 2.8}, {'c': (0, AC[1] - 4.6, AC[2] - 0.4), 'w': 4.6, 'ht': 2.2, 'hb': 2.0}],
               n=12, up=(0, 0, 1), cap0='round', cap1='round')
th_lo, th_hi = lh(th, 'actor', 110, 'turtle', lo=1, hi=3, sculpt=lambda h: tk.push(h, lambda V, N: 0.06 * np.sin(V[:, 0] * 5 + V[:, 1] * 4)))
nk = tk.tube('neck', [(0, AC[1] + 2.6, AC[2] - 13.0), (0, AC[1] + 2.4, AC[2] - 6.0), (0, AC[1] + 1.6, AC[2] - 1.0)], [3.0, 2.8, 2.6], n=10, cap0='round', cap1=None)
nk_lo, nk_hi = lh(nk, 'neck', 40, 'turtle', lo=0, hi=2)
push_folds(nk_hi, (0, 0, AC[2] - 6.0), (0, 0, 1), k=2.6, amp=0.32)
# the visor: a green band round the head and its bill out over the eyes
band = [(3.95 * math.cos(a), AC[1] + 0.6 + 4.1 * math.sin(a), AC[2] + 2.9 + 0.5 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 16, endpoint=False)]
vb_hi = tk.tube('visor_hi', band, 0.55, n=6, closed=True, squash=1.6)
bill = tk.slab('bill_hi', smooth_outline([(-3.6, 0.0), (3.6, 0.0), (3.0, -2.8), (0.0, -3.8), (-3.0, -2.8)], 20), 0.45, plane='XY', at=0.0, bevel=0.15, segs=1)
tk.rotate(bill, -16, 'X')
tk.move(bill, (0, AC[1] - 3.0, AC[2] + 2.5))
vis_hi = tk.join([vb_hi, bill], 'visor_hi')
tk.set_region(vis_hi, 'visor')
vb_lo = tk.tube('visor', band[::2], 0.55, n=3, closed=True, squash=1.6)
bill_lo = tk.slab('bill', smooth_outline([(-3.6, 0.0), (3.6, 0.0), (3.0, -2.8), (0.0, -3.8), (-3.0, -2.8)], 8), 0.45, plane='XY', at=0.0, bevel=0, segs=0)
tk.rotate(bill_lo, -16, 'X')
tk.move(bill_lo, (0, AC[1] - 3.0, AC[2] + 2.5))
F.part('actor', tk.join([th_lo, nk_lo, vb_lo, bill_lo], 'actor'), [th_hi, nk_hi, vis_hi], bone='actor')

for p in F.parts:
    p.bone = p.bone or 'body'
HINGE = (0, 9.8, 32.0)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, 10), parent='root')
    for nm, at in SH.items():
        R.bone(nm, at, parent='body')
    R.bone('hood', HINGE, parent='body')
    R.bone('actor', (0, AC[1], AC[2] - 6.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'arm_l', 'arm_r', 'actor'):
            k(b, 0)
        t0, up, hold, down, end = reveal(R, k, t0=4, up=14, hold=56, down=66, end=76, hinge_deg=-100)
        # ... nobody. A beat. Then up comes the director's head, and the megaphone: "Cut!"
        k('actor', 24)
        k('actor', 30, move=(0, 0, UP), ease='BACK')
        k('actor', 34, move=(0, 0, UP), rot=('X', 8))
        k('actor', 38, move=(0, 0, UP), rot=('X', -6))
        k('actor', 50, move=(0, 0, UP), rot=('X', -6))
        k('actor', 56, move=(0, 0, 0.0), ease=('BACK', 'EASE_IN'))
        k('arm_r', 26)
        k('arm_r', 32, rot=[('Y', 66), ('Z', 10)], ease='BACK')
        for i, f_ in enumerate((36, 40, 44, 48)):
            k('arm_r', f_, rot=[('Y', 66 + (6 if i % 2 else 0)), ('Z', 10)])
        k('arm_r', 56)
        k('arm_l', 26)
        k('arm_l', 32, rot=('Y', -24))
        k('arm_l', 50, rot=('Y', -24))
        k('arm_l', 56)
        for b in ('body', 'arm_l', 'arm_r', 'actor', 'hood'):
            k(b, end)
    return R


def paint(P, pt):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=0.9)
    RED = pt.ramp('#e2502e', 7, shift=0.06)
    WHITE = pt.ramp('#f4ece0', 6, shift=0.04)
    suit = P.region('suit')
    P.fill('suit', RED, tone=sh, base=0.05)
    # the sarasa pattern: white patches over the red, a white face and belly
    pat = suit & ((np.sin(X * 0.42 + 1.0) * np.sin(Z * 0.33 + Yc * 0.2) > 0.42) & ~((Z > 35) & (Yc < -5)) | ((Z > 35.5) & (Z < 44.5) & (Yc < -8) & (np.abs(X) < 7.5)))
    P.tint(pat, WHITE, sh + 0.1)
    P.fill('belly', pt.ramp('#f7e8c8', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('wen', pt.ramp('#ee7a3a', 7, shift=0.07), tone=sh * 1.3, base=0.1)
    # scale rows picked out in a deeper red
    a = np.arctan2(X, -Yc + 1e-3) * 7.0
    z = Z * 0.62
    row = np.floor(z)
    fa = a + 0.5 * (row % 2)
    d = np.hypot((fa - np.floor(fa) - 0.5) * 1.2, z - row - 0.15)
    P.flat(suit & ~pat & (np.abs(d - 0.55) < 0.06) & (Z < 34), '#a8321e')
    P.fill('fin', pt.ramp('#f2a07a', 6, shift=0.05), tone=sh * 0.7, base=0.15)
    P.tint(P.region('fin') & (np.sin(np.arctan2(Yc - 8.0, X) * 26) > 0.6), pt.ramp('#e2502e', 6, shift=0.05), sh * 0.7)
    P.fill('claw', pt.ramp('#3a3226', 5, shift=0.04), tone=sh, base=0.2)
    P.fill('zip', pt.ramp('#b4b2aa', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('collar', pt.ramp('#5a2a20', 5, shift=0.03), tone=sh, base=0.0)
    # (nobody in the suit: the neck hole's dark inside)
    hole = suit & (np.hypot(X, Yc + 0.4) < 4.4) & (Z > 33.0)
    P.flat(hole, '#241e1c')
    foam(P, pt, sh)
    zip_paint(P, 0.0, ZIP)
    P.fill('gold', pt.ramp('#e2b64a', 7, dark=0.6, light=0.6, shift=0.08), tone=sh * 1.4, base=0.1)
    P.fill('mega', pt.ramp('#f0e6d2', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('mega') & (np.abs(Yc - (MP0_Y - 4.6)) < 0.8), pt.ramp('#c8342c', 6, shift=0.05), sh)
    P.fill('mega_in', pt.ramp('#3a3432', 5, shift=0.03), tone=sh, base=0.0)
    P.fill('grip', pt.ramp('#2e2a28', 5, shift=0.03), tone=sh, base=0.1)
    # the tortoise: olive, a scaly crown, a pale beak and throat; the visor a see-through green
    tm = P.region('turtle')
    P.fill('turtle', pt.ramp('#8c8a54', 7, shift=0.07), tone=sh * 0.8, base=0.08)
    P.tint(tm & (Z < AC[2] - 1.2) & (Yc < AC[1] - 1.0), pt.ramp('#d8cc94', 6, shift=0.05), sh + 0.1)
    P.fill('visor', pt.ramp('#5ab06a', 6, shift=0.06), tone=sh * 0.6, base=0.2)
    tf = face.Face(P, c=(0, AC[1] - 4.0, AC[2] + 1.0), axis=(0, -1, 0.45), where=tm, seed=71)
    tf.eyes('dot', spread=3.8, size=0.42, dy=0.5, uneven=0.25)
    tf.brows('angry', spread=4.0, dy=1.5, w=1.4, weight=0.3)
    tm2 = face.Face(P, c=(0, AC[1] - 5.6, AC[2] - 0.6), axis=(0, -1, 0), where=tm, seed=72)
    tm2.mouth('shout', w=2.0, dy=0.0, h=1.2)
    # the goldfish king: little dot eyes far apart on the sides, a pouting 'o' of a mouth
    gf = face.Face(P, c=(0, -11.4, 41.4), axis=(0, -1, 0.15), where=suit, seed=73)
    gf.eyes('dot', spread=10.6, size=0.85, dy=1.0, uneven=0.2)
    gf.brows('raised', spread=10.8, dy=3.4, w=2.4, weight=0.45)
    gf.mouth('o', w=2.6, dy=-2.8)
    gf.blush(13.0, -1.0, rx=1.6, ry=0.9, col='#f08a86')
    P.lines(['fin'], ['suit', 'belly'], step=1)
    P.lines(['wen'], ['suit'], step=1)
    P.lines(['turtle'], ['visor'], step=1)
    P.clusters()
    return P.done()


MP0_Y = -6.0
run(F, ARGS, make_rig, paint, cam=((74, -104, 62), (0, 0, 26)), back=((-74, 104, 62), (0, 6, 22)),
    skip=[('arm_l', 'body'), ('arm_r', 'body'), ('actor', 'body'), ('crown', 'hood')])
