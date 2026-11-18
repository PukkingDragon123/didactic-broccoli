"""ドリモグラ Drill Mole (series nakanohito, common): a velvet-grey mole kaijū suit with a steel drill on the tip of its
snout, big pink spade hands with white claws and a pale plated belly. Inside: a golden hamster, cheeks stuffed.
Gimmick: the hood tips back, the hamster looks out (sweating, pleased with itself) and waves a spade hand while the
drill spins; then the hood snaps back down.

    tools/blender.sh art/blender/toys/nakanohito/mogura.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _suit import *  # noqa: E402,F401,F403

F = Fig('nakanohito', 'mogura')

# ------------------------------------------------------------------ the suit
BODY = [(8.0, 0.5, 15.0, 6.0, 6.0), (10.5, 0.0, 22.0, 10.0, 8.5), (15.5, -0.5, 25.0, 11.5, 9.5), (21.0, -0.5, 24.0, 10.8, 9.2),
        (26.0, 0.0, 21.0, 9.0, 8.4), (29.5, 0.5, 17.0, 7.0, 7.0), (32.0, 0.8, 11.0, 4.8, 4.8)]
ZIP = [(7.6, 29.4), (8.8, 25.5), (9.6, 18.0), (8.8, 11.5)]


def sc_body(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1]) * tk.smoothstep(7.5, 5.0, np.abs(x)) * (z > 11.0) * (z < 27)
        d = -0.32 * front * tk.smoothstep(0.35, 0.0, np.abs(np.sin((z - 11.0) * math.pi / 3.6)))  # the belly plates
        
        return d + zip_groove(0.0, ZIP)(V, N)
    tk.push(h, f)


trunk_lo, trunk_hi = trunk('trunk', BODY, tris=250, region=('suit', [('belly', lambda C, N: (N[:, 1] < -0.5) & (np.abs(C[:, 0]) < 7.6) & (C[:, 2] > 10.6) & (C[:, 2] < 27.4))]),
                           sculpt=sc_body)
los, his = [trunk_lo], [trunk_hi]
for sx in (1, -1):
    lg, lgh = limb('leg', [(sx * 7.5, 0.5, 11.5), (sx * 8.6, -1.0, 7.0), (sx * 8.6, 0.5, 3.6)], [5.2, 4.6, 4.0], tris=60)
    ft, fth = foot('foot', (sx * 8.8, 4.2), (sx * 0.16, -1), L=12.6, W=9.0, H=5.6, toes=3, claw=1.0, claw_len=2.0, tris=70)
    los += [lg, ft]
    his += [lgh] + fth
tl, tlh = limb('tail', [(0, 8.0, 11.0), (0, 11.6, 6.4), (0, 14.4, 2.6), (0, 17.0, 1.25)], [3.6, 3.0, 2.1, 1.25], tris=50, folds=False)
cl, clh = collar('collar', (0, -0.8, 32.4), 5.6, 5.0, r=0.9)
zl, zh = zip_tab('tab', (0, 7.7, 29.6))
los += [tl, cl, zl]
his += [tlh, clh] + zh
F.part('body', tk.decimate(tk.join(los, 'body'), 440), his, bone='body')

# ------------------------------------------------------------------ the arms: big spade hands, palms turned out
SH = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    sh_ = (sx * 10.0, -1.5, 25.5)
    wr = (sx * 13.4, -9.4, 25.6)
    a, ah = limb(nm, [sh_, (sx * 14.4, -5.4, 22.4), wr], [4.0, 3.6, 3.2], tris=56)
    hd, hdh = mitten(nm + '_hand', wr, (sx * 0.3, -0.25, 1), (sx * 0.35, -1, 0.15), L=7.4, W=9.4, T=2.8, claws=5, claw=0.75,
                     region='skin', tris=70)
    F.part(nm, tk.decimate(tk.join([a, hd], nm), 110), [ah] + hdh, bone=nm)
    SH[nm] = sh_

# ------------------------------------------------------------------ the hood: a mole's head on a snout, hollow
HOOD = [(9.0, 39.6, 16.0, 7.2, 7.2), (6.0, 40.0, 24.5, 10.2, 9.3), (0.5, 40.0, 27.0, 10.8, 9.6), (-5.0, 39.6, 25.0, 9.8, 9.0),
        (-9.5, 38.6, 18.5, 7.4, 7.0), (-13.0, 37.6, 11.5, 5.2, 5.0), (-15.6, 37.1, 8.6, 4.0, 4.0), (-17.0, 37.0, 8.0, 3.7, 3.7)]
cage = tk.loft('hood', [{'c': (0, y, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.1} for y, z, w, ht, hb in HOOD], n=14, up=(0, 0, 1), cap0='round', cap1='flat')


def sc_hood(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        d = 0.0
        for sx in (1, -1):  # heavy brows over the (tiny) eyes, and the cheeks either side of the snout
            d = d + tk.bump(V, (sx * 5.0, -9.2, 44.4), 3.2, 1.0, sharp=1.6)
            d = d + tk.bump(V, (sx * 7.0, -8.6, 35.0), 3.8, 0.9)
        d = d + 0.25 * np.sin(y * 3.2) * tk.smoothstep(-12.6, -15.0, y)  # the snout's ribbed skin
        return d
    tk.push(h, f)


hood_lo, hood_hi = lh(cage, 'hood', None, ('suit', [('snout', lambda C, N: C[:, 1] < -13.2)]), sculpt=sc_hood)
hollow(hood_lo, hood_hi, (0, -0.5, 39.6), (9.6, 9.8, 8.6), bottom=31.6)
tk.decimate(hood_lo, 330)
F.part('hood', hood_lo, [hood_hi], bone='hood')

# the drill on the tip of the snout: a chuck ring with bolts and a fluted steel cone
DR0 = Vector((0, -17.0, 37.0))
DRD = Vector((0, -1, -0.04)).normalized()
drill_hi = tk.lathe('drill_hi', [(0, 0.8), (4.3, 0.8), (4.6, 0.3), (4.6, -1.6), (4.2, -2.0), (3.3, -2.2), (3.0, -3.0), (2.3, -5.0), (1.6, -6.8), (0.8, -8.6),
                                 (0.0, -9.8)], n=24, axis='Y', centre=tuple(DR0))
tk.push(drill_hi, lambda V, N: 0.55 * np.sin(np.arctan2(V[:, 2] - DR0.z, V[:, 0]) * 2 + V[:, 1] * 1.6) * tk.smoothstep(DR0.y - 2.6, DR0.y - 3.4, V[:, 1]) + 0.3 * (np.sin(np.arctan2(V[:, 2] - DR0.z, V[:, 0]) * 6) > 0.7) * (np.abs(V[:, 1] - DR0.y + 0.6) < 0.7))
tk.set_region(drill_hi, 'drill')
drill_lo = tk.lathe('drill', [(0, 0.8), (4.4, 0.8), (4.6, -1.6), (3.3, -2.2), (3.0, -3.0), (1.6, -6.8), (0.0, -9.8)], n=10, axis='Y', centre=tuple(DR0))
F.part('drill', drill_lo, [drill_hi], bone='drill', kind='metal')

# ------------------------------------------------------------------ the actor: a golden hamster, cheeks stuffed
AC = (0, -1.0, 38.0)
ham = ball('actor', AC, 6.4, squash=(1.1, 0.95, 0.94), n=12, rings=7)


def sc_ham(h):
    def f(V, N):
        d = 0.0
        for sx in (1, -1):
            d = d + tk.bump(V, (sx * 4.6, -4.8, 36.4), 3.0, 0.9)  # the stuffed cheek pouches
        d = d + 0.06 * np.sin(V[:, 0] * 6 + V[:, 2] * 4) * np.sin(V[:, 1] * 5)  # (fur)
        return d
    tk.push(h, f)


ham_lo, ham_hi = lh(ham, 'actor', 150, 'fur', lo=1, hi=3, sculpt=sc_ham)
nk_lo, nk_hi = lh(tk.tube('neck', [(0, -0.6, 29.5), (0, -0.9, 35.0)], 3.8, n=8, cap0='round', cap1=None), 'neck', 24, 'fur', lo=0, hi=2)
alos, ahis = [ham_lo, nk_lo], [ham_hi, nk_hi]
for sx in (1, -1):
    e = ball('ear', (0, 0, 0), 1.9, squash=(1.0, 0.42, 1.0), n=8, rings=5)  # (round, a little cupped)
    tk.push(e, lambda V, N: -0.25 * (V[:, 1] < 0))
    tk.rotate(e, sx * -28, 'Y')
    tk.rotate(e, -12, 'Z' if sx > 0 else 'Z')
    tk.move(e, (sx * 4.0, 0.4, 43.4))
    el, eh = lh(e, 'ear', 24, ('fur', [('ear_in', lambda C, N: N[:, 1] < -0.4)]), lo=0, hi=2)
    alos.append(el)
    ahis.append(eh)
F.part('actor', tk.join(alos, 'actor'), ahis, bone='actor')

for p in F.parts:
    p.bone = p.bone or 'body'
HINGE = (0, 9.6, 31.8)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, 10), parent='root')
    for nm, at in SH.items():
        R.bone(nm, at, parent='body')
    R.bone('hood', HINGE, parent='body')
    R.bone('drill', tuple(DR0), parent='hood', tail=tuple(DR0 + DRD * 4))
    R.bone('actor', (0, -0.8, 32.2), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'arm_l', 'arm_r', 'drill', 'actor'):
            k(b, 0)
        t0, up, hold, down, end = reveal(R, k, t0=4, up=14, hold=50, down=60, end=70, hinge_deg=-138)
        k('body', 4, move=(0, 0, -0.6))
        k('body', 10, move=(0, 0, 0.3))
        k('body', 16)
        # the hamster pops up, looks one way, the other, then waves a spade hand
        k('actor', 12)
        k('actor', 18, move=(0, 0, 1.0), ease='BACK')
        k('actor', 26, move=(0, 0, 0.9), rot=('Z', 16))
        k('actor', 34, move=(0, 0, 0.9), rot=('Z', -16))
        k('actor', 42, move=(0, 0, 1.0), rot=('Y', 10))
        k('actor', 52, move=(0, 0, 0.6))
        k('actor', 58)
        k('arm_r', 16)
        k('arm_r', 22, rot=[('Y', -60), ('X', 20)])
        for i, f_ in enumerate((26, 30, 34, 38, 42)):
            k('arm_r', f_, rot=[('Y', -60 + (14 if i % 2 else -6)), ('X', 20)])
        k('arm_r', 50)
        k('arm_l', 18)
        k('arm_l', 26, rot=('Y', 12))
        k('arm_l', 46, rot=('Y', 12))
        k('arm_l', 54)
        # the drill spins up and runs down
        k('drill', 14)
        for i in range(1, 10):
            k('drill', 14 + i * 4, rot=[(tuple(DRD), 120 * i)], ease='LINEAR')
        k('drill', 52, rot=[(tuple(DRD), 1080)], ease='LINEAR')
        for b in ('body', 'arm_l', 'arm_r', 'actor', 'hood'):
            k(b, end)
    return R


def paint(P, pt):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=0.8)
    SUIT = pt.ramp('#5e5560', 7, shift=0.05)
    # (the suit's airbrush: darker down the back and over the hood's crown, lighter on the chest)
    air = -0.12 * tk.smoothstep(2, 8, Yc) + 0.08 * tk.smoothstep(0, -8, Yc)
    P.fill('suit', SUIT, tone=sh, base=air)
    P.fill('belly', pt.ramp('#c9b08a', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('snout', pt.ramp('#e7a2a0', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('skin', pt.ramp('#e9aaa2', 6, shift=0.06), tone=sh, base=0.08)
    P.fill('claw', pt.ramp('#efe8d8', 5, shift=0.04), tone=sh * 0.7, base=0.2)
    P.fill('drill', pt.ramp('#b9c0c6', 7, dark=0.7, light=0.7, shift=0.04), tone=sh * 1.5, base=0.1)
    P.fill('zip', pt.ramp('#b4b2aa', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('collar', pt.ramp('#3c3638', 5, shift=0.03), tone=sh, base=0.0)
    foam(P, pt, sh)
    zip_paint(P, 0.0, ZIP)
    # the hamster: golden fur, a white muzzle, chin and belly of the cheeks, pink inside the ears
    fur = P.region('fur')
    P.fill('fur', pt.ramp('#e0a35a', 7, shift=0.07), tone=sh, base=0.05)
    white = fur & (Z > AC[2] - 5.4) & ((Z < AC[2] - 1.6 + 0.6 * np.abs(X)) | ((Yc < AC[1] - 3.2) & (np.abs(X) < 1.6 + 0.5 * (AC[2] + 1 - Z))))
    P.tint(white & (Yc < AC[1] + 2.5), pt.ramp('#f3ead8', 6, shift=0.04), sh + 0.15)
    P.fill('ear_in', pt.ramp('#e9a39a', 5, shift=0.05), tone=sh, base=0.0)
    hm = face.Face(P, c=(AC[0], AC[1] - 6.0, AC[2] + 0.2), axis=(0, -1, 0), where=fur, seed=21)
    hm.eyes('dot', spread=6.2, size=0.6, dy=1.3, uneven=0.25)
    hm.nose('tri', dy=-0.5, size=0.45, col='#e47c86')
    hm.snout_mouth('cat', dy=-0.9, w=1.5, weight=0.3)
    hm.blush(8.0, -1.0, rx=1.3, ry=0.75)
    sweat(hm, [(5.2, 3.0)], r=0.45)
    # the mole's face: tiny squinting eyes under heavy brows, a gritted grin under the snout
    mf = face.Face(P, c=(0, -9.8, 42.8), axis=(0, -1, 0.3), where=P.region('suit'), seed=11)
    mf.eyes('tiny', spread=9.4, size=0.7, dy=0.0)
    mf.brows('angry', spread=9.6, dy=1.7, w=2.8, weight=0.5)
    mm = face.Face(P, c=(0, -14.4, 35.0), axis=(0, -1, -0.25), where=P.region('snout'), seed=12)
    mm.mouth('gritted', w=5.0, dy=0.0, teeth=3)
    nf = face.Face(P, c=(0, -17.5, 37.0), axis=(0, -1, 0), where=P.region('snout'), seed=13)
    nf.nose('nostrils', dy=2.4, size=1.0)
    P.lines(['skin', 'snout'], ['suit', 'claw'], step=1)
    P.lines(['belly'], ['suit'], step=1)
    P.lines(['fur'], ['collar'], step=1)
    P.clusters()
    return P.done()


run(F, ARGS, make_rig, paint, cam=((70, -100, 62), (0, -3, 25)), back=((-70, 100, 62), (0, 0, 25)), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('actor', 'body'), ('drill', 'hood')])
