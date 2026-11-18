"""タンボヒドラ Paddy Hydra (series nakanohito, rare): a mud-green three-headed hydra kaijū with terraced rice paddies
stepping up its back (water, seedlings and a tiny scarecrow) and drooping golden rice ears for crests. Only the middle
head is a head: the other two are hand puppets on the actor's arms. Inside: a shiba pup.
Gimmick: the middle head tips back on the panting pup, and the two puppet heads bob hello.

    tools/blender.sh art/blender/toys/nakanohito/tanbo.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _suit import *  # noqa: E402,F401,F403

F = Fig('nakanohito', 'tanbo')

# ------------------------------------------------------------------ the suit
BODY = [(8.0, 1.0, 17.0, 7.0, 7.0), (11.0, 0.5, 23.0, 10.0, 9.5), (16.5, 0.0, 25.0, 10.8, 10.4), (22.0, 0.0, 23.0, 9.8, 9.6),
        (27.0, 0.5, 19.0, 8.0, 8.0), (30.5, 0.8, 14.5, 6.2, 6.2), (32.6, 1.0, 10.0, 4.6, 4.6)]
ZIP = [(7.2, 30.8), (8.6, 27.4)]


def sc_body(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1]) * tk.smoothstep(7.5, 5.5, np.abs(x)) * (z > 11.0) * (z < 28)
        d = -0.3 * front * tk.smoothstep(0.35, 0.0, np.abs(np.sin((z - 11.0) * math.pi / 3.0)))
        return d + scales(V, 0.09, 1.6) * (1 - front) + zip_groove(0.0, ZIP)(V, N)
    tk.push(h, f)


trunk_lo, trunk_hi = trunk('trunk', BODY, tris=230, region=('suit', [('belly', lambda C, N: (N[:, 1] < -0.5) & (np.abs(C[:, 0]) < 7.0) & (C[:, 2] > 10.6) & (C[:, 2] < 28.4))]),
                           sculpt=sc_body)
los, his = [trunk_lo], [trunk_hi]
for sx in (1, -1):
    lg, lgh = limb('leg', [(sx * 8.0, 0.5, 11.5), (sx * 9.2, -1.2, 7.0), (sx * 9.0, 0.4, 3.4)], [5.4, 4.8, 4.0], tris=56)
    tk.push(lgh, lambda V, N: scales(V, 0.09, 1.6))
    ft, fth = foot('foot', (sx * 9.2, 4.0), (sx * 0.18, -1), L=12.0, W=8.8, H=5.0, toes=3, claw=0.95, claw_len=2.0, tris=60)
    los += [lg, ft]
    his += [lgh] + fth
tl, tlh = limb('tail', [(0, 8.6, 10.0), (0, 13.0, 5.4), (0, 16.6, 2.2), (0, 19.6, 1.2)], [4.4, 3.4, 2.2, 1.2], tris=46, folds=False)
los.append(tl)
his.append(tlh)
# the terraced paddies stepping up the back: a mud bank (aze) round each, water inside, rows of seedlings
TERR = [(13.4, 14.8, 18.0, 10.2), (19.2, 13.4, 15.6, 10.0), (24.6, 11.6, 12.0, 9.0)]  # (z of the water, y of the outer bank, width, y of the back)
sd_lo, sd_hi = [], []
for i, (zw, yo, w, yb) in enumerate(TERR):
    yi = 6.0 + i * 0.6
    bank = tk.rbox('bank_hi', (w, yo - yi, 2.4), centre=(0, (yo + yi) / 2, zw - 0.7), bevel=0.7, segs=2)
    tk.boolean(bank, tk.rbox('pool', (w - 1.6, yo - yi - 1.4, 2.0), centre=(0, (yo + yi) / 2 + 0.2, zw + 0.55), bevel=0.4, segs=1))
    tk.set_region(bank, 'mud')
    water = tk.rbox('water_hi', (w - 1.5, yo - yi - 1.3, 0.4), centre=(0, (yo + yi) / 2 + 0.2, zw - 0.1), bevel=0.15, segs=1)
    tk.set_region(water, 'water')
    his += [bank, water]
    los.append(tk.rbox('bank', (w, yo - yi, 2.4), centre=(0, (yo + yi) / 2, zw - 0.7), bevel=0, segs=0))
    for k_ in range(4):  # seedlings: a row of little tufts across each paddy
        x = (k_ - 1.5) * (w - 4.0) / 3
        y = (yo + yb) / 2 + (0.5 if k_ % 2 else -0.3)
        sd_hi += [cone('sd_hi', (x + dx, y, zw), (x + dx * 3.2, y - 0.2, zw + 2.0), 0.32, n=6) for dx in (-0.25, 0.0, 0.25)]
        sd_lo.append(tk.tube('sd', [(x, y, zw - 0.2), (x, y - 0.2, zw + 2.0)], [0.55, 0.1], n=3, cap0=None, cap1='point'))
for o in sd_hi:
    tk.set_region(o, 'seedling')
his += sd_hi
los += sd_lo
# a tiny scarecrow in the top paddy: a pole, a cross-stick, a straw hat
SC = (3.8, 10.4, TERR[2][0])
sc_hi = [tk.tube('pole_hi', [SC, (SC[0], SC[1], SC[2] + 6.0)], 0.3, n=6, cap0='flat', cap1='flat'),
         tk.tube('arms_hi', [(SC[0] - 2.2, SC[1], SC[2] + 3.8), (SC[0] + 2.2, SC[1], SC[2] + 3.8)], 0.26, n=6, cap0='flat', cap1='flat'),
         tk.lathe('hat_hi', [(0, 0), (1.9, 0.0), (1.8, 0.25), (0.8, 0.7), (0, 1.3)], n=12, centre=(SC[0], SC[1], SC[2] + 5.6))]
for o in sc_hi[:2]:
    tk.set_region(o, 'pole')
tk.set_region(sc_hi[2], 'straw')
his += sc_hi
los += [tk.tube('pole', [SC, (SC[0], SC[1], SC[2] + 6.0)], 0.3, n=3, cap0=None, cap1=None),
        tk.tube('arms', [(SC[0] - 2.2, SC[1], SC[2] + 3.8), (SC[0] + 2.2, SC[1], SC[2] + 3.8)], 0.26, n=3, cap0=None, cap1=None),
        tk.lathe('hat', [(0, 0), (1.9, 0.0), (0, 1.3)], n=6, centre=(SC[0], SC[1], SC[2] + 5.6))]
cl, clh = collar('collar', (0, -0.6, 32.8), 5.2, 4.8, r=0.9)
zl, zh = zip_tab('tab', (0, 7.3, 31.0))
los += [cl, zl]
his += [clh] + zh
F.part('body', tk.decimate(tk.join(los, 'body'), 560), his, bone='body')

# ------------------------------------------------------------------ the arms: long necks, each a hand puppet's head
SH = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    sh_ = (sx * 10.4, -0.6, 26.6)
    pts = [sh_, (sx * 15.0, -2.4, 29.4), (sx * 17.6, -4.2, 34.4), (sx * 17.4, -6.6, 38.4)]
    a, ah = limb(nm, pts, [3.2, 2.8, 2.5, 2.4], tris=56, folds=False)
    tk.push(ah, lambda V, N: scales(V, 0.08, 1.6))
    hc = tk.loft(nm + '_head', [{'c': (sx * 17.4, -4.6, 40.2), 'w': 5.6, 'ht': 2.8, 'hb': 2.6}, {'c': (sx * 17.2, -7.6, 41.0), 'w': 7.4, 'ht': 3.6, 'hb': 3.0},
                                {'c': (sx * 16.8, -11.2, 40.6), 'w': 6.2, 'ht': 2.6, 'hb': 2.4}, {'c': (sx * 16.6, -14.0, 40.2), 'w': 5.0, 'ht': 1.9, 'hb': 2.0},
                                {'c': (sx * 16.5, -15.2, 40.1), 'w': 4.2, 'ht': 1.5, 'hb': 1.6}],
                    n=10, up=(0, 0, 1), cap0='round', cap1='round')
    hl, hh = lh(hc, nm + '_head', 80, 'suit', lo=1, hi=3, sculpt=lambda h, sx=sx: tk.push(h, lambda V, N: scales(V, 0.07, 1.6) + tk.bump(V, (sx * 15.0, -8.4, 43.6), 1.6, 0.7) + tk.bump(V, (sx * 19.4, -8.4, 43.6), 1.6, 0.7)))
    F.part(nm, tk.decimate(tk.join([a, hl], nm), 120), [ah, hh], bone=nm)
    SH[nm] = sh_

# ------------------------------------------------------------------ the hood: the middle head, crested with drooping rice ears
HOOD = [(8.5, 40.5, 15.0, 7.0, 7.0), (5.0, 41.0, 21.5, 9.8, 9.2), (0.0, 41.0, 22.5, 10.2, 9.4), (-5.0, 40.4, 20.5, 9.0, 8.6),
        (-10.0, 39.4, 16.5, 6.6, 6.6), (-14.0, 38.8, 13.0, 4.8, 5.2), (-16.6, 38.6, 11.0, 3.8, 4.4)]
cage = tk.loft('hood', [{'c': (0, y, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.1} for y, z, w, ht, hb in HOOD], n=14, up=(0, 0, 1), cap0='round', cap1='round')


def sc_hood(h):
    def f(V, N):
        d = 0.0
        for sx in (1, -1):
            d = d + tk.bump(V, (sx * 5.0, -8.4, 46.0), 3.0, 1.2, sharp=1.6)  # brow ridges
            d = d + tk.bump(V, (sx * 2.2, -17.2, 40.6), 1.2, 0.5)            # nostrils
        return d + scales(V, 0.08, 1.6)
    tk.push(h, f)


hood_lo, hood_hi = lh(cage, 'hood', None, 'suit', sculpt=sc_hood)
hollow(hood_lo, hood_hi, (0, -0.6, 40.6), (9.0, 9.4, 8.4), bottom=32.2)
tk.decimate(hood_lo, 280)
ri_lo, ri_hi = [], []
for sx in (1, -1):
    stem = [(sx * 3.0, 1.0, 50.2), (sx * 3.6, 2.6, 54.4), (sx * 5.0, 5.6, 56.0), (sx * 6.2, 8.4, 54.4), (sx * 6.8, 9.6, 51.2), (sx * 7.0, 9.8, 48.6)]
    rh = tk.tube('rice_hi', stem, [0.6, 0.55, 0.9, 1.3, 1.2, 0.6], n=8, cap0='round', cap1='round')
    tk.subsurf(rh, 1)
    tk.push(rh, lambda V, N, sx=sx: 0.35 * (np.sin(V[:, 2] * 4.4 + V[:, 1] * 2.0) > 0) * (V[:, 1] > 6.0))  # the grains
    tk.set_region(rh, 'rice')
    ri_hi.append(rh)
    ri_lo.append(tk.tube('rice', [stem[0], stem[2], stem[3], stem[5]], [0.6, 0.9, 1.3, 0.6], n=4, cap0=None, cap1='round'))
F.part('hood', tk.join([hood_lo] + ri_lo, 'hood'), [hood_hi] + ri_hi, bone='hood')

# ------------------------------------------------------------------ the actor: a shiba pup
AC = (0, -0.8, 38.4)
sb = ball('actor', AC, 5.6, squash=(1.1, 1.0, 0.95), n=12, rings=7)
sb_lo, sb_hi = lh(sb, 'actor', 130, 'shiba', lo=1, hi=3, sculpt=lambda h: tk.push(h, lambda V, N: tk.bump(V, (0, -5.6, 37.0), 2.4, 1.0)))
nk_lo, nk_hi = lh(tk.tube('neck', [(0, -0.4, 29.5), (0, -0.7, 35.0)], 3.9, n=8, cap0='round', cap1=None), 'neck', 24, 'shiba', lo=0, hi=2)
alos, ahis = [sb_lo, nk_lo], [sb_hi, nk_hi]
for sx in (1, -1):
    e = ear('ear', (sx * 3.1, -0.4, 42.4), (sx * 4.4, 0.2, 46.0), 3.6, t=1.0)
    el, eh = lh(e, 'ear', 26, ('shiba', [('ear_in', lambda C, N: N[:, 1] < -0.4)]), lo=0, hi=2)
    alos.append(el)
    ahis.append(eh)
F.part('actor', tk.join(alos, 'actor'), ahis, bone='actor')

for p in F.parts:
    p.bone = p.bone or 'body'
HINGE = (0, 9.4, 32.2)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, 10), parent='root')
    for nm, at in SH.items():
        R.bone(nm, at, parent='body')
    R.bone('hood', HINGE, parent='body')
    R.bone('actor', (0, -0.6, 32.4), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'arm_l', 'arm_r', 'actor'):
            k(b, 0)
        t0, up, hold, down, end = reveal(R, k, t0=4, up=14, hold=52, down=62, end=72, hinge_deg=-100)
        # the pup pops up, panting (a quick bob), head tilted
        k('actor', 12)
        k('actor', 18, move=(0, 0, 1.0), ease='BACK')
        for i, f_ in enumerate(range(21, 45, 3)):
            k('actor', f_, move=(0, 0, 1.0 if i % 2 else 0.7), rot=('Y', 12 if i < 4 else -10))
        k('actor', 52, move=(0, 0, 0.5))
        k('actor', 58)
        # the puppet heads bob hello, out of time with each other
        for nm, sx, ph in (('arm_l', 1, 0), ('arm_r', -1, 2)):
            k(nm, 12)
            for i, f_ in enumerate(range(18 + ph, 46 + ph, 5)):
                k(nm, f_, rot=[('X', -12 if i % 2 else 6), ('Y', sx * (8 if i % 2 else -4))])
            k(nm, 54 + ph)
        for b in ('body', 'arm_l', 'arm_r', 'actor', 'hood'):
            k(b, end)
    return R


def paint(P, pt):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.0)
    air = -0.12 * tk.smoothstep(2, 9, Yc) + 0.06 * tk.smoothstep(0, -8, Yc)
    P.fill('suit', pt.ramp('#7a7a46', 7, shift=0.07), tone=sh, base=air)
    P.fill('belly', pt.ramp('#d8c27a', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('claw', pt.ramp('#3a3226', 5, shift=0.04), tone=sh * 0.7, base=0.2)
    P.fill('zip', pt.ramp('#b4b2aa', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('collar', pt.ramp('#3c3a26', 5, shift=0.03), tone=sh, base=0.0)
    foam(P, pt, sh)
    zip_paint(P, 0.0, ZIP)
    # the paddies: wet brown mud banks, sky-and-green water, bright seedlings, the scarecrow
    P.fill('mud', pt.ramp('#7a5a3e', 6, shift=0.05), tone=sh, base=0.0)
    P.fill('water', pt.ramp('#8fb4b0', 6, shift=0.04), tone=sh * 0.5, base=0.15)
    P.tint(P.region('water') & (np.sin(X * 2.2 + Yc * 0.6) > 0.85), pt.ramp('#d6e6e2', 5, shift=0.03), sh * 0.5 + 0.3)  # (sky in the water)
    P.fill('seedling', pt.ramp('#7cbc4a', 6, shift=0.07), tone=sh, base=0.1)
    P.fill('pole', pt.ramp('#8a6a46', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('straw', pt.ramp('#e2c070', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('rice', pt.ramp('#e0b44a', 7, shift=0.07), tone=sh, base=0.1)
    # the shiba: red-tan, white urajiro on the cheeks, muzzle, brows and chin
    sb = P.region('shiba')
    P.fill('shiba', pt.ramp('#d4884a', 7, shift=0.07), tone=sh, base=0.05)
    m = sb & (Yc < AC[1] - 2.0) & ((Z < AC[2] - 0.6 + 0.1 * np.abs(X)) | (np.abs(X) < 1.2)) & (Z > AC[2] - 5.6)
    P.tint(m, pt.ramp('#f6efe2', 6, shift=0.04), sh + 0.15)
    for sx in (1, -1):  # the pale brow dots
        P.tint(sb & (np.hypot(X - sx * 2.4, Z - (AC[2] + 2.4)) < 0.75) & (Yc < AC[1] - 3), pt.ramp('#f6efe2', 6, shift=0.04), sh + 0.15)
    P.fill('ear_in', pt.ramp('#f0e2cc', 5, shift=0.04), tone=sh, base=0.05)
    sf = face.Face(P, c=(AC[0], AC[1] - 5.8, AC[2] + 0.4), axis=(0, -1, 0), where=sb, seed=61)
    sf.eyes('dot', spread=6.0, size=0.62, dy=1.2, uneven=0.25)
    sf.nose('button', dy=-0.6, size=0.75)
    sf.snout_mouth('Y', dy=-1.1, w=2.0, weight=0.32)
    sf.blep(dy=-2.0, w=1.0)
    sweat(sf, [(-4.6, 3.0)], r=0.45)
    # the hydra's three faces: the middle one fierce, the puppet heads one cross-eyed, one dozing
    hf = face.Face(P, c=(0, -9.6, 44.4), axis=(0, -1, 0.35), where=P.region('suit'), seed=63)
    hf.eyes('dot', spread=10.0, size=0.75, dy=0.0, uneven=0.25)
    hf.brows('angry', spread=10.0, dy=2.0, w=2.8, weight=0.55)
    mf = face.Face(P, c=(0, -16.8, 38.0), axis=(0, -1, 0), where=P.region('suit'), seed=64)
    mf.mouth('grin', w=8.0, dy=0.0, teeth=3)
    for sx, kind, mouth, seed in ((1, 'dizzy', 'wobble', 65), (-1, 'sleepy', 'drool', 66)):
        pf = face.Face(P, c=(sx * 17.0, -12.6, 41.6), axis=(0, -1, 0.35), where=P.region('suit'), seed=seed, depth=3.0)
        pf.eyes(kind, spread=4.4, size=0.55, dy=0.6)
        pf.mouth(mouth, w=3.6, dy=-1.8, weight=0.36)
    P.lines(['belly'], ['suit'], step=1)
    P.lines(['mud'], ['water', 'suit'], step=1)
    P.lines(['shiba'], ['collar'], step=1)
    P.lines(['rice'], ['suit'], step=1)
    P.clusters()
    return P.done()


run(F, ARGS, make_rig, paint, cam=((74, -104, 62), (0, 0, 27)), back=((-74, 104, 62), (0, 4, 25)),
    skip=[('arm_l', 'body'), ('arm_r', 'body'), ('actor', 'body')])
