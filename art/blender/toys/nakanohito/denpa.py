"""デンパガ Radio Moth (series nakanohito, uncommon): a fluffy cream silk-moth kaijū with a red-and-white radio mast
growing out of its head (the beacon on top lights up), feathery antennae, a white fur ruff and two pairs of wings
printed with radio waves. Inside: a Japanese quail.
Gimmick: the hood tips back, the quail bobs and peers round, the wings flutter and the mast's beacon blinks.

    tools/blender.sh art/blender/toys/nakanohito/denpa.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _suit import *  # noqa: E402,F401,F403

F = Fig('nakanohito', 'denpa')


def fluff(V, amp=0.14):
    return amp * np.sin(V[:, 0] * 3.1 + np.sin(V[:, 2] * 2.3) * 1.5) * np.sin(V[:, 1] * 2.7 + V[:, 2] * 1.9)


# ------------------------------------------------------------------ the suit: a segmented, fluffy abdomen
BODY = [(8.0, 1.0, 15.0, 6.5, 6.5), (10.5, 0.5, 21.0, 9.5, 9.0), (16.0, 0.0, 23.0, 10.6, 10.0), (22.0, 0.0, 22.0, 10.0, 9.4),
        (27.0, 0.5, 19.0, 8.4, 8.0), (30.5, 0.8, 15.0, 6.4, 6.4), (32.6, 1.0, 10.0, 4.6, 4.6)]
ZIP = [(7.4, 30.6), (9.0, 26.0), (10.0, 21.0)]


def sc_body(h):
    def f(V, N):
        z = V[:, 2]
        seg = -0.42 * tk.smoothstep(0.5, 0.0, np.abs(np.sin((z - 8.6) * math.pi / 3.6))) * (z > 9) * (z < 26)  # the abdomen's rings
        return seg + fluff(V, 0.06) + zip_groove(0.0, ZIP)(V, N)
    tk.push(h, f)


trunk_lo, trunk_hi = trunk('trunk', BODY, tris=220, region='suit', sculpt=sc_body)
los, his = [trunk_lo], [trunk_hi]
for sx in (1, -1):
    lg, lgh = limb('leg', [(sx * 7.0, 1.0, 11.5), (sx * 8.0, -0.6, 7.0), (sx * 7.8, 0.4, 3.6)], [4.6, 4.2, 3.7], tris=50)
    tk.push(lgh, lambda V, N: fluff(V))
    ft, fth = foot('foot', (sx * 8.0, 3.8), (sx * 0.12, -1), L=10.6, W=7.8, H=5.2, toes=0, tris=56)
    tk.push(fth[0], lambda V, N: fluff(V, 0.1))
    los += [lg, ft]
    his += [lgh] + fth
cl, clh = collar('collar', (0, -0.4, 32.6), 5.4, 4.8, r=0.9)
zl, zh = zip_tab('tab', (0, 7.5, 30.8))
los += [cl, zl]
his += [clh] + zh
F.part('body', tk.decimate(tk.join(los, 'body'), 360), his, bone='body')

# ------------------------------------------------------------------ the wings: fore and hind, spread behind like a fan
WROOT = {1: (2.4, 10.4, 22.0), -1: (-2.4, 10.4, 22.0)}
FORE = [(0.0, 0.0), (6.0, -1.4), (13.0, -0.8), (18.6, 1.6), (21.8, 5.6), (21.6, 10.4), (18.4, 13.8), (12.4, 14.6), (5.6, 11.0), (1.4, 5.2)]
HIND = [(0.0, -1.2), (5.0, -0.4), (11.6, -1.8), (15.0, -5.8), (14.2, -10.6), (10.0, -13.2), (5.0, -12.0), (1.6, -7.0)]
WINGS = {}
for sx, nm in ((1, 'wing_l'), (-1, 'wing_r')):
    wl, wh = [], []
    for out, k_ in ((FORE, 'fore'), (HIND, 'hind')):
        pts = [(sx * u, v) for u, v in out] if sx > 0 else [(sx * u, v) for u, v in out][::-1]
        hi = tk.slab(nm + '_hi', smooth_outline(pts, 40), 1.1, plane='XZ', at=0.0, bevel=0.42, segs=2)
        tk.subsurf(hi, 1)
        tk.push(hi, lambda V, N: 0.12 * np.sin(np.hypot(np.abs(V[:, 0]) - 1.0, V[:, 2] - 22.0) * 1.05) * (np.abs(N[:, 1]) > 0.6))  # (veins)
        lo = tk.slab(nm, smooth_outline(pts, 14), 1.1, plane='XZ', at=0.0, bevel=0, segs=0)
        for o in (lo, hi):
            tk.rotate(o, sx * -18, 'Z')   # swept back a little
            tk.rotate(o, 8, 'X')          # leaning back
            tk.move(o, WROOT[sx])
        tk.set_region(hi, 'wing')
        wl.append(lo)
        wh.append(hi)
    F.part(nm, tk.decimate(tk.join(wl, nm), 70), wh, bone=nm, uvw=0.9)
    WINGS[nm] = WROOT[sx]

# ------------------------------------------------------------------ the arms: thin, with two little hooked claws
SH = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    sh_ = (sx * 9.4, -1.0, 26.4)
    wr = (sx * 11.6, -8.0, 21.2)
    a, ah = limb(nm, [sh_, (sx * 12.2, -3.8, 22.6), wr], [3.2, 2.6, 2.2], tris=48)
    tk.push(ah, lambda V, N: fluff(V, 0.1))
    hd, hdh = mitten(nm + '_hand', wr, (-sx * 0.25, -1, -0.1), (sx * 1.0, 0, 0.3), L=3.4, W=3.6, T=2.4, claws=2, claw=0.55, tris=36)
    F.part(nm, tk.decimate(tk.join([a, hd], nm), 72), [ah] + hdh, bone=nm)
    SH[nm] = sh_

# ------------------------------------------------------------------ the hood: a round fluffy moth's head, a fur ruff, the mast
HOOD = [(8.0, 40.5, 15.0, 7.5, 7.5), (5.0, 41.0, 22.0, 10.5, 9.5), (0.0, 41.0, 23.5, 11.0, 9.8), (-5.0, 40.5, 22.0, 10.2, 9.2),
        (-9.0, 40.0, 17.0, 7.8, 7.0), (-11.0, 39.8, 11.0, 5.0, 4.6)]
cage = tk.loft('hood', [{'c': (0, y, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.0} for y, z, w, ht, hb in HOOD], n=14, up=(0, 0, 1), cap0='round', cap1='round')
hood_lo, hood_hi = lh(cage, 'hood', None, 'suit', sculpt=lambda h: tk.push(h, lambda V, N: fluff(V, 0.07)))
hollow(hood_lo, hood_hi, (0, -0.4, 40.2), (9.2, 9.0, 8.6), bottom=32.0)
tk.decimate(hood_lo, 250)
# the radio mast: four splayed lattice legs in red and white bands, an observation deck, a slim upper tower, the spire
M0 = (0, -1.2)
mast_lo, mast_hi = [], []
for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
    a, b = (M0[0] + dx * 3.5, M0[1] + dy * 3.5, 48.4), (M0[0] + dx * 0.85, M0[1] + dy * 0.85, 55.2)
    mast_hi.append(tk.tube('leg_hi', [a, tuple((V3(a) + V3(b)) / 2 + V3((dx * 0.25, dy * 0.25, 0))), b], [0.78, 0.62, 0.5], n=6, cap0='flat', cap1='flat'))
    mast_lo.append(tk.tube('leg', [a, b], [0.78, 0.5], n=3, cap0=None, cap1=None))
for z in (51.0, 53.2):  # the cross girders between the legs
    w = 3.5 - (z - 48.4) / 6.8 * 2.65
    mast_hi.append(tk.rbox('girder_hi', (2 * w + 0.6, 2 * w + 0.6, 0.45), centre=(M0[0], M0[1], z), bevel=0.15, segs=1))
deck = tk.cyl('deck_hi', 1.75, 55.0, 55.9, n=12, at=M0, bevel=0.2, segs=1)
upper = tk.loft('upper_hi', [{'c': (M0[0], M0[1], z), 'w': w, 'h': w / 2, 'e': 5.0, 'roll': 45} for z, w in ((55.9, 1.6), (58.6, 1.0), (59.6, 0.8))],
                n=8, up=(0, -1, 0), cap0='flat', cap1='flat')
spire = tk.tube('spire_hi', [(M0[0], M0[1], 59.4), (M0[0], M0[1], 61.6)], [0.3, 0.2], n=6, cap0='flat', cap1='flat')
mast_hi = [tk.join(mast_hi + [deck, upper, spire], 'mast_hi')]
tk.set_region(mast_hi[0], 'mast')
mast_lo += [tk.cyl('deck', 1.75, 55.0, 55.9, n=8, at=M0, bevel=0, segs=0),
            tk.loft('upper', [{'c': (M0[0], M0[1], z), 'w': w, 'h': w / 2, 'e': 5.0, 'roll': 45} for z, w in ((55.9, 1.6), (59.6, 0.8))], n=4, up=(0, -1, 0), cap0=None, cap1='flat'),
            tk.tube('spire', [(M0[0], M0[1], 59.4), (M0[0], M0[1], 61.6)], [0.3, 0.2], n=3, cap0=None, cap1=None)]
mast_lo = tk.join(mast_lo, 'mast')
# the feathery antennae: two combed fronds either side of the mast
ant_lo, ant_hi = [], []
for sx in (1, -1):
    pts = [(0.0, 0.0), (2.4, 2.4), (3.2, 6.4), (2.8, 10.4), (1.2, 13.0), (-0.6, 12.0), (-1.6, 7.6), (-1.2, 2.6)]
    pts = [(sx * u, v) for u, v in pts] if sx > 0 else [(sx * u, v) for u, v in pts][::-1]
    a_hi = tk.slab('ant_hi', smooth_outline(pts, 28), 0.7, plane='XZ', at=0.0, bevel=0.25, segs=1)
    tk.subsurf(a_hi, 1)
    tk.push(a_hi, lambda V, N: 0.22 * np.sin(V[:, 2] * 3.2 - np.abs(V[:, 0]) * 2.4) * (np.abs(N[:, 1]) > 0.5))
    a_lo = tk.slab('ant', smooth_outline(pts, 10), 0.7, plane='XZ', at=0.0, bevel=0, segs=0)
    for o in (a_lo, a_hi):
        tk.deform(o, lambda V, sx=sx: V + np.stack([sx * 0.035 * V[:, 2] ** 2, -0.03 * V[:, 2] ** 2, 0 * V[:, 2]], 1))
    for o in (a_lo, a_hi):
        tk.rotate(o, sx * 40, 'Y')
        tk.rotate(o, -22, 'X')
        tk.move(o, (sx * 4.6, -6.6, 47.6))
    tk.set_region(a_hi, 'feather')
    ant_lo.append(a_lo)
    ant_hi.append(a_hi)
F.part('hood', tk.join([hood_lo, mast_lo] + ant_lo, 'hood'), [hood_hi] + mast_hi + ant_hi, bone='hood')
LAMP = (0, -1.2, 62.4)
lamp_hi = tk.lathe('lamp_hi', [(0, -0.9), (0.8, -0.8), (1.0, -0.1), (0.85, 0.6), (0.45, 1.0), (0, 1.1)], n=12, centre=LAMP)
tk.set_region(lamp_hi, 'lamp')
lamp_lo = tk.lathe('lamp', [(0, -0.9), (1.0, -0.4), (0.85, 0.6), (0, 1.1)], n=6, centre=LAMP)
F.part('lamp', lamp_lo, [lamp_hi], bone='hood', kind='led', uvw=0.8)

# ------------------------------------------------------------------ the actor: a Japanese quail
AC = (0, -0.2, 38.4)
q = ball('actor', AC, 5.6, squash=(1.02, 1.04, 0.98), n=12, rings=7)
q_lo, q_hi = lh(q, 'actor', 130, 'quail', lo=1, hi=3, sculpt=lambda h: tk.push(h, lambda V, N: 0.05 * np.sin(V[:, 0] * 6 + V[:, 2] * 5)))
nk_lo, nk_hi = lh(tk.tube('neck', [(0, 0.2, 29.5), (0, 0.0, 35.0)], 4.0, n=8, cap0='round', cap1=None), 'neck', 24, 'quail', lo=0, hi=2)
bk_hi = cone('beak_hi', (0, -5.0, 37.9), (0, -7.4, 37.2), 1.15, n=10, mid=0.6)
tk.set_region(bk_hi, 'beak')
bk_lo = tk.tube('beak', [(0, -5.0, 37.9), (0, -7.4, 37.2)], [1.15, 0.15], n=5, cap0=None, cap1='point')
F.part('actor', tk.join([q_lo, nk_lo, bk_lo], 'actor'), [q_hi, nk_hi, bk_hi], bone='actor')

for p in F.parts:
    p.bone = p.bone or 'body'
HINGE = (0, 9.2, 31.8)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, 10), parent='root')
    for nm, at in list(SH.items()) + list(WINGS.items()):
        R.bone(nm, at, parent='body')
    R.bone('hood', HINGE, parent='body')
    R.bone('actor', (0, 0.0, 32.4), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'arm_l', 'arm_r', 'wing_l', 'wing_r', 'actor'):
            k(b, 0)
        t0, up, hold, down, end = reveal(R, k, t0=4, up=14, hold=52, down=62, end=72, hinge_deg=-94)
        # the quail: up, a quick head-bob, a peer to each side
        k('actor', 12)
        k('actor', 18, move=(0, 0, 1.0), ease='BACK')
        for f_, rot in ((22, ('X', 12)), (25, ('X', -4)), (28, ('X', 12)), (31, ('X', 0)), (37, ('Z', 22)), (43, ('Z', -22)), (48, ('Z', 0))):
            k('actor', f_, move=(0, 0, 1.0), rot=rot)
        k('actor', 54, move=(0, 0, 0.5))
        k('actor', 60)
        # the wings flutter (fanning forward and back about their roots)
        for nm, sx in (('wing_l', 1), ('wing_r', -1)):
            k(nm, 12)
            for i, f_ in enumerate(range(16, 50, 3)):
                k(nm, f_, rot=('Z', sx * (16 if i % 2 else -6)))
            k(nm, 54)
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 14)
            k(nm, 22, rot=('Y', sx * 18))
            k(nm, 46, rot=('Y', sx * 18))
            k(nm, 54)
        for b in ('body', 'arm_l', 'arm_r', 'wing_l', 'wing_r', 'actor', 'hood'):
            k(b, end)
    return R


def paint(P, pt):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=0.9)
    CREAM = pt.ramp('#ece2c8', 7, shift=0.06)
    P.fill('suit', CREAM, tone=sh, base=0.05 - 0.1 * tk.smoothstep(2, 9, Yc))
    # the abdomen's bands: every other ring a warm buff
    band = P.region('suit') & (Z > 9) & (Z < 26) & (np.sin((Z - 8.6) * math.pi / 3.6 * 0.5 + 0.8) > 0.35)
    P.tint(band, pt.ramp('#d2b88e', 6, shift=0.06), sh)
    ruff = P.region('suit') & (Z < 35.4 + 0.7 * np.abs(np.sin(np.arctan2(Yc + 0.4, X) * 7))) & (Z > 30.5) & (np.hypot(X, Yc + 0.4) > 8.0)
    P.tint(ruff, pt.ramp('#f8f4ea', 6, shift=0.04), sh * 0.8 + 0.15)  # (the white fur ruff round the hood's rim)
    P.fill('feather', pt.ramp('#b98e5a', 6, shift=0.06), tone=sh, base=0.05)
    P.flat(P.region('feather') & (np.sin(Z * 7.0) > 0.4), '#8a6440')
    P.fill('claw', pt.ramp('#5a4a3c', 5, shift=0.04), tone=sh * 0.7, base=0.2)
    P.fill('zip', pt.ramp('#b4b2aa', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('collar', pt.ramp('#8a7c64', 5, shift=0.03), tone=sh, base=0.0)
    foam(P, pt, sh)
    zip_paint(P, 0.0, ZIP)
    # the wings: cream, printed with radio waves rippling out from the body, a brown border and a dark spot
    wing = P.region('wing')
    P.fill('wing', pt.ramp('#e6dcc0', 7, shift=0.05), tone=sh * 0.8, base=0.08)
    rr = np.hypot(np.abs(X) - 1.0, Z - 21.0)
    P.tint(wing & (np.abs(np.sin(rr * 1.05)) > 0.88), pt.ramp('#8a7660', 6, shift=0.05), sh * 0.8)
    edge = wing & (rr > 20.5)
    P.tint(edge, pt.ramp('#7a5e44', 6, shift=0.05), sh * 0.8)
    for sx in (1, -1):
        P.flat(wing & (np.hypot(X - sx * 15.0, Z - 33.0) < 1.5), '#3a2c26')
        P.flat(wing & (np.hypot(X - sx * 15.3, Z - 33.3) < 0.55), '#efe6cf')
    # the mast: red and white bands, the steel lattice drawn on in dark ink, the beacon a warm red
    P.fill('mast', pt.ramp('#efe8dc', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('mast') & (np.sin((Z - 48.6) * math.pi / 1.7) > 0), pt.ramp('#d2402e', 6, shift=0.05), sh)
    P.fill('lamp', pt.ramp('#f2867a', 5, shift=0.05), tone=sh * 0.5, base=0.25)
    # the quail: buff-brown, a dark crown with a cream centre stripe, cream brows, pale throat, dark speckles
    qm = P.region('quail')
    P.fill('quail', pt.ramp('#c4945e', 7, shift=0.06), tone=sh * 0.8, base=0.08)
    crown = qm & (Z > AC[2] + 2.4 - 0.1 * np.abs(X))
    P.tint(crown, pt.ramp('#7a5638', 6, shift=0.05), sh * 0.8)
    P.tint(crown & (np.abs(X) < 0.6), pt.ramp('#efe0c0', 5, shift=0.04), sh * 0.8 + 0.2)
    brow = qm & (np.abs(Z - (AC[2] + 2.0 - 0.1 * np.abs(X))) < 0.4) & (Yc < AC[1] - 0.5)
    P.tint(brow, pt.ramp('#efe0c0', 5, shift=0.04), sh * 0.8 + 0.2)
    throat = qm & (Z < AC[2] - 1.6) & (Yc < AC[1] - 1.5)
    P.tint(throat, pt.ramp('#f2e6cc', 6, shift=0.04), sh * 0.8 + 0.1)
    P.fill('beak', pt.ramp('#3e3430', 5, shift=0.04), tone=sh, base=0.1)
    qf = face.Face(P, c=(AC[0], AC[1] - 5.4, AC[2] + 0.4), axis=(0, -1, 0), where=qm, seed=41)
    qf.eyes('dot', spread=5.4, size=0.62, dy=0.6, uneven=0.3)
    qf.blush(7.6, -1.2, rx=1.2, ry=0.7, col='#e9967a')
    sweat(qf, [(4.6, 3.0)], r=0.45)
    # the moth's face: big dot eyes set wide on the round head, a tiny worried mouth
    mf = face.Face(P, c=(0, -11.0, 41.0), axis=(0, -1, 0.1), where=P.region('suit'), seed=43)
    mf.eyes('dot', spread=8.6, size=1.0, dy=1.0, uneven=0.2)
    mf.brows('worried', spread=8.8, dy=3.6, w=2.6, weight=0.45)
    mf.mouth('o', w=1.8, dy=-2.6)
    P.lines(['wing'], ['suit'], step=1)
    P.lines(['quail'], ['collar', 'beak'], step=1)
    P.clusters()
    return P.done()


run(F, ARGS, make_rig, paint, cam=((70, -100, 62), (0, 0, 28)), back=((-70, 100, 62), (0, 4, 28)),
    skip=[('arm_l', 'body'), ('arm_r', 'body'), ('actor', 'body'), ('wing_l', 'body'), ('wing_r', 'body'), ('lamp', 'hood')])
