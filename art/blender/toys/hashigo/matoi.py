"""纏 Matoi, "The Standard-Bearer" (series hashigo): a bright green frog on the foot board with the brigade's matoi
on its shoulder: a black pole, a gourd-topped crest box, and the white paper streamers (baren) round it. The other
fist is up in a cheer. Gimmick: it spins the matoi, the streamers flying out, and plants it again.

    tools/blender.sh art/blender/toys/hashigo/matoi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
exec(open(__file__.replace('matoi.py', '_head.py')).read())
from mathutils import Vector  # noqa: E402

F = Fig('hashigo', 'matoi')
PELVIS = (0.6, -6.4, 11.2)
M = fr.body_matrix(rot=(-8, -4, 0), at=PELVIS)
fr.ladder(F, seed=5)
lo, his = fr.body(F, M, seed=51, belly=1.05)
F.part('body', lo, his, bone='body')
leg_l, HIP_L = fr.leg(F, M, 1, knee=(9.6, -11.0, 10.0), heel=(6.4, -5.0, 7.4), ankle=(6.0, -8.6, 4.4), foot_dir=(0.3, -1, 0), foot_up=(0, 0, 1))
leg_r, HIP_R = fr.leg(F, M, -1, knee=(-6.6, -12.0, 9.6), heel=(-4.6, -5.0, 7.4), ankle=(-4.4, -8.6, 4.4), foot_dir=(-0.3, -1, 0), foot_up=(0, 0, 1))
# the matoi: a pole leaning out to its right (clear of the next section's board when stacked)
B0, B1 = Vector((-8.6, -9.4, 3.4)), Vector((-16.2, -9.4, 40.0))
D = (B1 - B0).normalized()
at = lambda z: B0 + D * ((z - B0.z) / D.z)  # noqa: E731
arm_r, SH_R = fr.arm(F, M, -1, elbow=(-9.4, -10.8, 15.4), wrist=tuple(at(17.0) + Vector((0.4, -1.0, 0))), hand_dir=(0.2, 0.2, 1), hand_up=(-1, 0, 0.2))
arm_l, SH_L = fr.arm(F, M, 1, elbow=(10.4, -8.6, 22.6), wrist=(11.2, -9.2, 27.6), hand_dir=(0.1, -0.1, 1), hand_up=(1, 0, 0))
pole_hi = tk.tube('pole_hi', [tuple(B0), tuple(B1)], 0.75, n=10, cap0='round', cap1='flat')
tk.subsurf(pole_hi, 1)
tk.set_region(pole_hi, 'pole')
pole_lo = tk.tube('pole', [tuple(B0), tuple(B1)], 0.75, n=5, cap0='flat', cap1='flat')
# the crest box and the gourd on top, built along the pole's axis
up = Vector((0, 0, 1))
q = up.rotation_difference(D)
Mq = q.to_matrix().to_4x4()
box_hi = tk.rbox('dashi_hi', (4.2, 4.2, 2.8), centre=(0, 0, 1.4), bevel=0.35, segs=2)
gourd = [(0, 2.8), (1.3, 3.0), (2.0, 3.9), (1.9, 4.8), (1.0, 5.6), (0.8, 6.0), (1.35, 6.6), (1.4, 7.3), (0.7, 7.9), (0, 8.1)]
g_hi = tk.lathe('gourd_hi', gourd, n=14)
tk.set_region(g_hi, 'gold')
box_lo = tk.rbox('dashi', (4.2, 4.2, 2.8), centre=(0, 0, 1.4), bevel=0, segs=0)
g_lo = tk.lathe('gourd', gourd[::2] + [gourd[-1]], n=7)
# the baren: twelve paper streamers hanging round the pole under the box, a little flared
strips_hi, strips_lo = [], []
for i in range(10):
    a = 2 * math.pi * i / 10
    c, s = math.cos(a), math.sin(a)
    pts = [(c * 1.2, s * 1.2, -0.2), (c * 2.0, s * 2.0, -3.6), (c * 2.5, s * 2.5, -7.4)]
    st = tk.loft('baren_hi', [{'c': p, 'w': 1.05, 'h': 0.14} for p in pts], n=6, up=(c, s, 0), cap0='flat', cap1='flat')
    strips_hi.append(st)
    strips_lo.append(tk.loft('baren', [{'c': pts[0], 'w': 1.05, 'h': 0.14}, {'c': pts[2], 'w': 1.05, 'h': 0.14}], n=4, up=(c, s, 0), cap0='flat', cap1='flat'))
bar_hi = tk.join(strips_hi, 'baren_hi')
bar_lo = tk.join(strips_lo, 'baren')
tk.set_region(bar_hi, 'baren')
TOPM = __import__('mathutils').Matrix.Translation(B1) @ Mq
for o in (box_hi, g_hi, box_lo, g_lo, bar_hi, bar_lo):
    tk.transform(o, TOPM)
tk.set_region(box_hi, 'dashi')
F.part('pole', tk.join([pole_lo, box_lo, g_lo], 'pole'), [pole_hi, box_hi, g_hi], bone='matoi', kind='gloss')
F.part('baren', bar_lo, [bar_hi], bone='baren')

# the frog (and its matoi) grown 15% about its feet on the board
T, M = fr.grow(F, M, (0.8, -8.6, 4.4))
PELVIS, SH_L, SH_R, HIP_L, HIP_R = [T(p) for p in (PELVIS, SH_L, SH_R, HIP_L, HIP_R)]
B0, B1 = Vector(T(B0)), Vector(T(B1))


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, fr.LY, 0))
    R.bone('body', PELVIS, parent='root')
    for nm, at_ in (('arm_l', SH_L), ('arm_r', SH_R), ('leg_l', HIP_L), ('leg_r', HIP_R)):
        R.bone(nm, tuple(at_), parent='body' if nm.startswith('arm') else 'root')
    R.bone('matoi', tuple(B0), parent='root', tail=tuple(B0 + D * 4))  # its y axis runs up the pole
    R.bone('baren', tuple(B1), parent='matoi', tail=tuple(B1 + D * 4))
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        B = ('body', 'arm_l', 'arm_r', 'matoi', 'baren')
        for b in B:
            k(b, 0)
        # it lifts the matoi a little and spins it two full turns, the streamers flying out, then plants it with a stamp
        k('matoi', 5, move=tuple(D * 1.2))
        k('baren', 5)
        for i, f_ in enumerate(range(8, 41, 4)):
            k('matoi', f_, rot=[(tuple(D), (i + 1) * 80)], move=tuple(D * 1.2), ease='LINEAR')
            k('baren', f_, scale=(1.6, 0.8, 1.6))
        k('matoi', 44, rot=[(tuple(D), 720)], move=tuple(D * 1.2))
        k('matoi', 48, rot=[(tuple(D), 720)], ease='BOUNCE')
        k('baren', 46)
        k('arm_l', 6, rot=('X', -14))
        k('arm_l', 12, rot=('X', 8))
        k('arm_l', 18, rot=('X', -14))
        k('arm_l', 24, rot=('X', 8))
        k('body', 40)
        k('body', 46, rot=('Y', -4), move=(0, 0, 0.6))
        k('body', 50)
        for b in ('body', 'arm_l', 'arm_r', 'baren'):
            k(b, 60)
        k('matoi', 60, rot=[(tuple(D), 720)])
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    fr.paint_ladder(P, pt, sh)
    fr.paint_frog(P, pt, sh, skin='#58b84a', belly='#ecebb0', happi='#2c3c6a', spots='#3c8a34', seed=11)
    fr.happi_marks(P, M, pt, sh)
    P.fill('pole', pt.ramp('#2a2426', 6, dark=0.4, light=0.4, shift=0.03), tone=sh * 1.2, base=0.05)
    P.fill('dashi', pt.ramp('#f1ece0', 6, shift=0.05), tone=sh * 0.7, base=0.15)
    P.fill('gold', pt.ramp('#d9a63a', 7, shift=0.07), tone=sh * 1.3, base=0.1)
    P.fill('baren', pt.ramp('#f3efe4', 6, shift=0.04), tone=sh * 0.6, base=0.2)
    # the baren's two black bands and the crest box's frog mark (ink)
    Q = (P.pos - np.array(B1)) @ np.array(D)
    P.flat(P.region('baren') & ((np.abs(Q + 5.2) < 0.45) | (np.abs(Q + 6.6) < 0.3)), '#2a2220')
    P.flat(P.region('dashi') & (np.abs(Q - 1.4) < 0.3), '#c8342c')
    fr.frog_face(P, M, eyes='big', mouth='shout', seed=55, mouth_w=9.0, h=5.6, weight=0.6)
    P.lines(['skin', 'belly'], ['happi', 'band'], step=1)
    P.lines(['pad'], ['skin', 'belly'], col='#1b1513', step=1)  # (marker outlines round the toe pads)
    P.clusters()
    return P.done()


fr.run(F, ARGS, make_rig, paint, cam=((52, -82, 42), (-3, -3, 25)), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('leg_l', 'body'), ('leg_r', 'body'), ('arm_r', 'pole'), ('baren', 'pole'), ('pole', 'ladder')])
