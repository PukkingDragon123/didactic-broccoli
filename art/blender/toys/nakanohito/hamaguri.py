"""ハマグリロボ Clam Robot (series nakanohito, uncommon): a silver Shōwa tin-toy robot kaijū with accordion limbs,
pincer hands, a chest of dials and a red lamp, and for a head a giant hamaguri clam with a little aerial on top.
Inside the clam: a calico kitten, like a pearl.
Gimmick: the clam opens on its hinge, the kitten pops up with its paws on the rim and looks round, the robot's
arms go up and the chest lamp blinks; then the clam shuts.

    tools/blender.sh art/blender/toys/nakanohito/hamaguri.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _suit import *  # noqa: E402,F401,F403

F = Fig('nakanohito', 'hamaguri')
CZ = 31.0          # the clam's lips (where the two valves meet)
CR, CY = 13.0, 0.84  # the clam's radius (x) and its depth factor (y)


def ribs(c, axis, k=2.6, amp=0.32):
    """Accordion bellows: deep rings along `axis` from c."""
    a = V3(axis) / np.linalg.norm(axis)
    return lambda V, N: -amp * tk.smoothstep(0.25, 0.75, np.abs(np.sin((V - V3(c)) @ a * k)))


# ------------------------------------------------------------------ the robot: a boxy chest, bellows legs, slab feet
torso_c = tk.rbox('torso', (20.0, 15.4, 14.6), centre=(0, 0.4, 20.0), bevel=3.4, segs=3)
ZIP = [(8.0, 26.2), (8.2, 15.0)]


def sc_torso(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        d = 0.0
        # rivets round the chest panel and down the sides
        for rx in (-6.8, 6.8):
            for rz in (14.6, 18.4, 22.2, 25.6):
                d = d + tk.bump(V, (rx, -7.4, rz), 0.55, 0.3)
        panel = (np.abs(x) < 6.0) & (np.abs(z - 20.0) < 5.2) & (N[:, 1] < -0.8)
        d = d - 0.35 * panel  # the recessed chest panel
        d = d - 0.3 * tk.smoothstep(0.35, 0.0, np.abs(z - 13.6)) * (z > 12.0)  # the waist seam
        return d + zip_groove(0.0, ZIP)(V, N)
    tk.push(h, f)


torso_lo, torso_hi = lh(torso_c, 'torso', 190, ('suit', [('panel', lambda C, N: (np.abs(C[:, 0]) < 6.0) & (np.abs(C[:, 2] - 20.0) < 5.2) & (N[:, 1] < -0.8))]),
                        lo=1, hi=3, sculpt=sc_torso, keep_corners=True)
los, his = [torso_lo], [torso_hi]
for sx in (1, -1):
    lg = tk.lathe('leg', [(0, 2.6), (3.4, 2.6), (3.6, 4.0), (3.6, 11.6), (3.2, 13.6), (0, 13.6)], n=12, centre=(sx * 5.6, 0.6, 0))
    lgh = tk.lathe('leg_hi', [(0, 2.6), (3.4, 2.6), (3.6, 4.0), (3.6, 11.6), (3.2, 13.6), (0, 13.6)], n=24, centre=(sx * 5.6, 0.6, 0))
    tk.subsurf(lgh, 1)
    tk.push(lgh, lambda V, N: ribs((0, 0, 4.0), (0, 0, 1), k=2.4)(V, N) * (V[:, 2] > 4.0) * (V[:, 2] < 11.6))
    tk.set_region(lgh, 'bellows')
    ft = tk.rbox('foot', (8.4, 11.6, 3.2), centre=(sx * 5.8, -0.8, 1.6), bevel=1.0, segs=1)
    fth = tk.rbox('foot_hi', (8.4, 11.6, 3.2), centre=(sx * 5.8, -0.8, 1.6), bevel=1.0, segs=3)
    tk.set_region(fth, 'suit')
    tk.decimate(lg, 48)
    los += [lg, ft]
    his += [lgh, fth]
# the bottom valve of the clam: a bowl on the shoulders, ridged with growth lines
BOWL = [(0, CZ - 5.4), (4.0, CZ - 5.1), (8.4, CZ - 3.9), (11.4, CZ - 2.1), (CR, CZ - 0.6), (CR + 0.2, CZ), (CR - 1.1, CZ), (CR - 2.0, CZ - 1.2),
        (8.0, CZ - 3.0), (0, CZ - 4.2)]


def clam(o):
    """The hamaguri's plan: a rounded triangle narrowing to the hinge at the back."""
    tk.transform(o, Matrix.Diagonal((1, CY, 1, 1)))
    tk.deform(o, lambda V: V * np.stack([1 - 0.3 * np.clip(V[:, 1] / (CR * CY), 0, 1) ** 1.6, np.ones(len(V)), np.ones(len(V))], 1))
bowl_hi = tk.lathe('bowl_hi', BOWL, n=32, centre=(0, 0, 0))
clam(bowl_hi)
tk.push(bowl_hi, lambda V, N: -0.18 * (np.abs(np.sin(np.hypot(V[:, 0], V[:, 1] / CY) * 1.3)) > 0.9) * (N[:, 2] < -0.2))
tk.regions(bowl_hi, 'shell', [('nacre', lambda C, N: (N[:, 2] > 0.3) & (np.hypot(C[:, 0], C[:, 1] / CY) < CR - 1.3))])
bowl_lo = tk.lathe('bowl', BOWL[:6] + BOWL[7:], n=14, centre=(0, 0, 0))
clam(bowl_lo)
neck = tk.cyl('neckring_hi', 5.6, 25.8, CZ - 3.2, n=16, at=(0, 0.2), bevel=0.4, segs=2)
tk.set_region(neck, 'suit')
zl, zh = zip_tab('tab', (0, 8.2, 26.4))
los += [bowl_lo, tk.cyl('neckring', 5.6, 25.8, CZ - 3.2, n=8, at=(0, 0.2), bevel=0, segs=0), zl]
his += [bowl_hi, neck] + zh
F.part('body', tk.decimate(tk.join(los, 'body'), 470), his, bone='body')

# the chest lamp (lights up)
LAMP = (0, -8.1, 23.2)
lamp_hi = tk.lathe('lamp_hi', [(0, 0), (1.6, 0), (1.7, -0.5), (1.4, -1.3), (0.8, -1.8), (0, -1.95)], n=14, axis='Y', centre=LAMP)
tk.set_region(lamp_hi, 'lamp')
lamp_lo = tk.lathe('lamp', [(0, 0), (1.7, 0), (1.4, -1.3), (0, -1.95)], n=7, axis='Y', centre=LAMP)
F.part('lamp', lamp_lo, [lamp_hi], bone='body', kind='led', uvw=0.8)

# ------------------------------------------------------------------ the arms: bellows, a cuff and a two-finger pincer
SH = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    sh_ = V3((sx * 10.6, 0.0, 23.0))
    el_ = V3((sx * 14.2, -3.6, 18.0))
    wr = V3((sx * 13.4, -9.0, 20.6))
    bolt = tk.lathe(nm + '_bolt_hi', [(0, -1.6), (3.0, -1.6), (3.3, -0.6), (3.3, 0.6), (2.8, 1.6), (0, 1.8)], n=16, axis='X', centre=tuple(sh_))
    tk.set_region(bolt, 'suit')
    arm_hi = tk.tube(nm + '_hi', [tuple(sh_), tuple(el_), tuple(wr)], [2.3, 2.3, 2.1], n=14, cap0='round', cap1='flat')
    tk.subsurf(arm_hi, 1)
    tk.push(arm_hi, lambda V, N: ribs(tuple(sh_), tuple(el_ - sh_), k=3.0, amp=0.28)(V, N) * ((V - el_) @ (el_ - sh_) < 0) + ribs(tuple(el_), tuple(wr - el_), k=3.0, amp=0.28)(V, N) * ((V - el_) @ (el_ - sh_) >= 0))
    tk.set_region(arm_hi, 'bellows')
    d = (wr - el_) / np.linalg.norm(wr - el_)
    cuff_hi = tk.tube(nm + '_cuff_hi', [tuple(wr - d * 0.4), tuple(wr + d * 1.6)], [2.8, 2.6], n=14, cap0='flat', cap1='flat')
    tk.set_region(cuff_hi, 'suit')
    side = V3((0, 0, 1))
    fing_hi, fing_lo = [], []
    for s_ in (1, -1):  # the pincer: two hooked fingers that close on each other
        b0 = wr + d * 1.4 + side * s_ * 1.1
        p1 = b0 + d * 2.4 + side * s_ * 1.2
        p2 = b0 + d * 4.4 - side * s_ * 0.3
        fh = tk.tube(nm + '_f_hi', [tuple(b0), tuple(p1), tuple(p2)], [1.0, 0.8, 0.35], n=8, cap0='round', cap1='round')
        tk.set_region(fh, 'suit')
        fing_hi.append(fh)
        fing_lo.append(tk.tube(nm + '_f', [tuple(b0), tuple(p1), tuple(p2)], [1.0, 0.8, 0.3], n=4, cap0=None, cap1='point'))
    arm_lo = tk.tube(nm, [tuple(sh_), tuple(el_), tuple(wr + d * 1.6)], [2.4, 2.4, 2.6], n=6, cap0='round', cap1='flat')
    bolt_lo = tk.lathe(nm + '_bolt', [(0, -1.6), (3.3, -1.2), (3.3, 0.6), (0, 1.8)], n=8, axis='X', centre=tuple(sh_))
    F.part(nm, tk.decimate(tk.join([arm_lo, bolt_lo] + fing_lo, nm), 110), [arm_hi, bolt, cuff_hi] + fing_hi, bone=nm)
    SH[nm] = tuple(sh_)

# ------------------------------------------------------------------ the hood: the top valve, with its growth rings and an aerial
TOP = [(0, CZ + 7.2), (4.0, CZ + 6.6), (8.0, CZ + 4.8), (10.8, CZ + 2.4), (CR - 1.1, CZ), (CR + 0.2, CZ), (CR, CZ + 1.2), (11.6, CZ + 3.8),
       (8.6, CZ + 6.6), (4.4, CZ + 8.2), (0, CZ + 8.8)]
TOP_LO = [(0, CZ + 7.2), (8.0, CZ + 4.8), (CR - 1.1, CZ), (CR + 0.2, CZ), (11.6, CZ + 3.8), (6.6, CZ + 7.6), (0, CZ + 8.8)]
top_hi = tk.lathe('hood_hi', TOP, n=36)
clam(top_hi)
tk.push(top_hi, lambda V, N: -0.2 * (np.abs(np.sin(np.hypot(V[:, 0], V[:, 1] / CY) * 1.25)) > 0.88) * (N[:, 2] > 0.1)
        + tk.bump(V, (0, CR * CY - 2.0, CZ + 6.6), 3.2, 1.4))  # the growth lines; the umbo (the shell's beak) at the back
tk.set_region(top_hi, 'shell')
top_lo = tk.lathe('hood', TOP_LO, n=14)
clam(top_lo)
# (the valve's underside is its own region: the dark mother-of-pearl lining you see when it opens)
for o in (top_hi,):
    tk.regions(o, 'shell', [('nacre', lambda C, N: (N[:, 2] < -0.25) & (C[:, 2] > CZ + 0.3))])
ant_hi = tk.join([tk.tube('aerial_hi', [(3.2, -1.6, CZ + 7.6), (4.4, -2.0, CZ + 11.8), (5.0, -2.2, CZ + 13.4)], [0.45, 0.35, 0.3], n=8, cap0='flat', cap1='flat'),
                  ball('knob_hi', (5.1, -2.3, CZ + 14.2), 1.0, n=8, rings=5)], 'aerial_hi')
tk.set_region(ant_hi, 'aerial')
ant_lo = tk.join([tk.tube('aerial', [(3.2, -1.6, CZ + 7.6), (5.0, -2.2, CZ + 13.4)], [0.45, 0.3], n=4, cap0=None, cap1=None),
                  ball('knob', (5.1, -2.3, CZ + 14.2), 1.0, n=6, rings=4)], 'aerial')
F.part('hood', tk.decimate(tk.join([top_lo, ant_lo], 'hood'), 210), [top_hi, ant_hi], bone='hood', kind='gloss')

# ------------------------------------------------------------------ the actor: a calico kitten, paws on the rim
AC = (0, -0.8, CZ + 0.8)
kt = ball('actor', AC, 4.8, squash=(1.12, 0.95, 0.92), n=12, rings=7)
kt_lo, kt_hi = lh(kt, 'actor', 120, 'cat', lo=1, hi=3, sculpt=lambda h: tk.push(h, lambda V, N: tk.bump(V, (0, -5.2, CZ - 0.2), 1.8, 0.45)))
alos, ahis = [kt_lo], [kt_hi]
for sx in (1, -1):
    e = ear('ear', (sx * 2.7, -0.8, CZ + 4.0), (sx * 3.5, -0.6, CZ + 6.1), 3.0, t=0.9)
    el, eh = lh(e, 'ear', 26, ('cat', [('ear_in', lambda C, N: N[:, 1] < -0.4)]), lo=0, hi=2)
    pw = ball('paw', (sx * 3.0, -6.0, CZ + 0.2), 1.2, squash=(1.0, 1.25, 0.8), n=8, rings=5)
    pl, ph = lh(pw, 'paw', 30, 'cat', lo=0, hi=2)
    alos += [el, pl]
    ahis += [eh, ph]
F.part('actor', tk.join(alos, 'actor'), ahis, bone='actor')

for p in F.parts:
    p.bone = p.bone or 'body'
HINGE = (0, CR * CY + 0.2, CZ + 0.2)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, 10), parent='root')
    for nm, at in SH.items():
        R.bone(nm, at, parent='body')
    R.bone('hood', HINGE, parent='body')
    R.bone('actor', (0, -0.8, CZ - 3.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'arm_l', 'arm_r', 'actor'):
            k(b, 0)
        t0, up, hold, down, end = reveal(R, k, t0=4, up=14, hold=52, down=62, end=72, hinge_deg=-74, lift=0.6)
        # the kitten pops up like a pearl, tilts its head one way, the other
        k('actor', 12)
        k('actor', 18, move=(0, 0, 1.6), ease='BACK')
        k('actor', 26, move=(0, 0, 1.5), rot=('Y', -14))
        k('actor', 34, move=(0, 0, 1.5), rot=('Y', 14))
        k('actor', 42, move=(0, 0, 1.6))
        k('actor', 54, move=(0, 0, 0.6))
        k('actor', 60)
        # the robot's arms go up, ta-da
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 12)
            k(nm, 20, rot=[('X', -50), ('Y', sx * -20)], ease='BACK')
            k(nm, 46, rot=[('X', -46), ('Y', sx * -16)])
            k(nm, 56)
        k('body', 4, move=(0, 0, -0.4))
        k('body', 10)
        for b in ('body', 'arm_l', 'arm_r', 'actor', 'hood'):
            k(b, end)
    return R


def paint(P, pt):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    SIL = pt.ramp('#a9b4ba', 7, dark=0.6, light=0.5, shift=0.04)
    P.fill('suit', SIL, tone=sh * 1.2, base=0.05)
    P.fill('bellows', pt.ramp('#5d666e', 6, shift=0.04), tone=sh * 1.2, base=0.05)
    P.fill('panel', pt.ramp('#2e3a44', 6, shift=0.04), tone=sh, base=0.05)
    # the chest dials: two cream gauges with red needles, a row of switches
    for gx in (-3.4, 3.4):
        r = np.hypot(X - gx, Z - 18.4)
        m = P.region('panel') & (r < 1.9)
        P.flat(m, '#efe6d0')
        P.flat(m & (np.abs(r - 1.75) < 0.2), '#1b1513')
        ang = np.arctan2(Z - 18.4, X - gx)
        P.flat(m & (r < 1.5) & (np.abs(ang - (0.9 if gx < 0 else 2.1)) < 0.18), '#c8342c')
    for i in range(5):
        P.flat(P.region('panel') & (np.abs(X - (-4.0 + 2.0 * i)) < 0.45) & (np.abs(Z - 15.6) < 0.7), ('#e8b23a', '#efe6d0')[i % 2])
    P.fill('lamp', pt.ramp('#f26a5a', 5, shift=0.05), tone=sh * 0.5, base=0.25)
    # rivets: a dab of lighter silver on each bump
    P.fill('zip', pt.ramp('#b4b2aa', 5, shift=0.04), tone=sh, base=0.1)
    zip_paint(P, 0.0, ZIP)
    # the clam: cream-buff, glossy, the hamaguri's brown zig-zag tent marks and growth bands
    shell = P.region('shell')
    P.fill('shell', pt.ramp('#e2cfa6', 7, shift=0.06), tone=sh, base=0.05)
    rr = np.hypot(X, Yc / CY)
    P.tint(shell & (np.abs(np.sin(rr * 0.9)) > 0.93), pt.ramp('#b89668', 6, shift=0.05), sh)
    zz = shell & (np.sin(np.arctan2(Yc / CY, X) * 22 + rr * 1.6) > 0.55) & (np.sin(rr * 0.55 + 0.4) > 0.3)
    P.tint(zz, pt.ramp('#7a5434', 6, shift=0.05), sh)
    P.fill('nacre', pt.ramp('#cfc6d6', 6, shift=0.03), tone=sh * 0.6, base=0.1)
    P.fill('aerial', pt.ramp('#c8342c', 6, shift=0.05), tone=sh, base=0.1)
    # the robot's face on the top valve: two big round eyes and a gritted grin along the lips
    rf = face.Face(P, c=(0, -9.0, CZ + 4.2), axis=(0, -1, 0.7), where=shell, seed=51)
    rf.eyes('big', spread=8.4, size=0.8, dy=0.6, uneven=0.15)
    rf.brows('angry', spread=8.6, dy=2.6, w=2.6, weight=0.5)
    mf = face.Face(P, c=(0, -10.8, CZ + 1.6), axis=(0, -1, 0.1), where=shell, seed=52)
    mf.mouth('gritted', w=11.0, dy=0.0, teeth=5)
    # the kitten: white, an orange patch over one ear and eye, a black patch on the other side of the head
    cat = P.region('cat')
    P.fill('cat', pt.ramp('#f4efe4', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(cat & (np.hypot(X - 2.6, Z - (CZ + 4.4)) < 3.2), pt.ramp('#e0903e', 6, shift=0.06), sh)
    P.tint(cat & (np.hypot(X + 3.6, Z - (CZ + 3.0)) < 2.3) & (Yc > -3.0), pt.ramp('#3a3230', 6, shift=0.04), sh)
    P.fill('ear_in', pt.ramp('#eba4a0', 5, shift=0.05), tone=sh, base=0.05)
    kf = face.Face(P, c=(AC[0], AC[1] - 5.2, AC[2] - 0.2), axis=(0, -1, 0), where=cat, seed=53)
    kf.eyes('happy', spread=5.2, size=0.62, dy=0.9)
    kf.nose('tri', dy=-0.6, size=0.45, col='#e47c86')
    kf.snout_mouth('cat', dy=-1.0, w=1.6, weight=0.3)
    kf.whiskers(dy=-0.9, spread=5.0, n=2, length=1.9, weight=0.2)
    kf.blush(6.6, -0.9, rx=1.0, ry=0.55)
    P.lines(['shell'], ['nacre', 'suit'], step=1)
    P.lines(['panel'], ['suit'], step=1)
    P.lines(['cat'], ['shell', 'nacre'], step=1)
    P.clusters()
    return P.done()


run(F, ARGS, make_rig, paint, cam=((70, -100, 62), (0, 0, 24)), back=((-70, 100, 62), (0, 4, 24)),
    skip=[('arm_l', 'body'), ('arm_r', 'body'), ('actor', 'body'), ('lamp', 'body')])
