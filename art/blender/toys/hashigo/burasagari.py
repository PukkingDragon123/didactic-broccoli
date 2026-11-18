"""ぶら下がり Burasagari, "The Dangle" (series hashigo): a pale spotted frog hanging upside down by its knees from the
top rung, one arm dangling, one waving. Gimmick: it swings like a pendulum, waving, and comes to rest.

    tools/blender.sh art/blender/toys/hashigo/burasagari.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
exec(open(__file__.replace('burasagari.py', '_head.py')).read())
F = Fig('hashigo', 'burasagari')
M = fr.body_matrix(rot=(12, 180, 0), at=(0, -5.6, 24.6))
fr.ladder(F, seed=3)
lo, his = fr.body(F, M, seed=31, belly=0.95)
F.part('body', lo, his, bone='body')
# the knees hooked over the top rung, the shins hanging down behind it
leg_l, HIP_L = fr.leg(F, M, 1, knee=(-5.0, 1.4, 30.8), heel=(-4.6, 5.6, 27.0), ankle=(-4.6, 4.8, 23.6), foot_dir=(0, -0.2, -1), foot_up=(0, 1, 0))
leg_r, HIP_R = fr.leg(F, M, -1, knee=(5.0, 1.4, 30.8), heel=(4.6, 5.6, 27.0), ankle=(4.6, 4.8, 23.6), foot_dir=(0, -0.2, -1), foot_up=(0, 1, 0))
# one arm dangling, one waving
arm_l, SH_L = fr.arm(F, M, 1, elbow=(-8.6, -7.6, 12.4), wrist=(-9.0, -8.2, 8.2), hand_dir=(0, -0.2, -1), hand_up=(-1, 0, 0))
arm_r, SH_R = fr.arm(F, M, -1, elbow=(10.6, -7.4, 18.6), wrist=(14.4, -8.0, 21.6), hand_dir=(0.6, -0.2, 0.75), hand_up=(0, -1, 0))
KNEES = (0, 1.6, 30.8)

# the frog grown 15% about its knees on the rung (the rung moved up 3 mm)
T, M = fr.grow(F, M, KNEES, shift=(0, 0, 3.0))
KNEES, SH_L, SH_R, HIP_L, HIP_R = [T(p) for p in (KNEES, SH_L, SH_R, HIP_L, HIP_R)]


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, fr.LY, 0))
    R.bone('hang', (0, fr.LY, fr.RUNG[1]), parent='root')  # it swings round the rung
    R.bone('body', T((0, -5.6, 24.6)), parent='hang')
    for nm, at in (('arm_l', SH_L), ('arm_r', SH_R)):
        R.bone(nm, tuple(at), parent='body')
    for nm, at in (('leg_l', HIP_L), ('leg_r', HIP_R)):
        R.bone(nm, tuple(at), parent='hang')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        B = ('hang', 'arm_l', 'arm_r')
        for b in B:
            k(b, 0)
        # a push off: it swings out over you and back, three times smaller, the right arm waving all the while
        for f_, a in ((8, -12), (18, 3), (27, -5), (35, 2), (42, -1), (48, 0)):
            k('hang', f_, rot=('X', a))
        for i, f_ in enumerate(range(4, 44, 5)):
            k('arm_r', f_, rot=('Y', 22 if i % 2 else -10))
        k('arm_l', 10, rot=('X', 12))
        k('arm_l', 20, rot=('X', -4))
        k('arm_l', 30, rot=('X', 4))
        for b in B:
            k(b, 56)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    fr.paint_ladder(P, pt, sh)
    fr.paint_frog(P, pt, sh, skin='#a8c454', belly='#f2eccc', happi='#2c4a3a', spots='#6e8a30', seed=7)
    fr.happi_marks(P, M, pt, sh)
    fr.frog_face(P, M, eyes='wink', mouth='tongue', seed=36, blush=True, mouth_w=14.0, weight=0.55, side=1)
    P.lines(['skin', 'belly'], ['happi', 'band'], step=1)
    P.lines(['pad'], ['skin', 'belly'], col='#1b1513', step=1)  # (marker outlines round the toe pads)
    P.clusters()
    return P.done()


fr.run(F, ARGS, make_rig, paint, cam=((48, -78, 40), (0, -3, 22)), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('leg_l', 'body'), ('leg_r', 'body'), ('leg_l', 'ladder'), ('leg_r', 'ladder'), ('body', 'ladder')])
