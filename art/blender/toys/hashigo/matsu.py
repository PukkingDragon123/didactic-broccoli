"""松 Matsu, "The Pine" (series hashigo): an orange frog in the full splits between the rails, a foot braced on each,
arms up in a V like the branches of a pine. Gimmick: it bounces in the splits and its arms sway like branches in wind.

    tools/blender.sh art/blender/toys/hashigo/matsu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
exec(open(__file__.replace('matsu.py', '_head.py')).read())
F = Fig('hashigo', 'matsu')
M = fr.body_matrix(rot=(-3, 0, 0), at=(0, -5.2, 22.0))
fr.ladder(F, seed=4)
lo, his = fr.body(F, M, seed=41)
F.part('body', lo, his, bone='body')
leg_l, HIP_L = fr.leg(F, M, 1, knee=(9.0, -8.6, 24.4), heel=(7.6, -3.4, 22.0), ankle=(10.2, -1.4, 21.6), foot_dir=(0.3, 0.6, 0.7), foot_up=(1, -0.3, 0))
leg_r, HIP_R = fr.leg(F, M, -1, knee=(-9.0, -8.6, 24.4), heel=(-7.6, -3.4, 22.0), ankle=(-10.2, -1.4, 21.6), foot_dir=(-0.3, 0.6, 0.7), foot_up=(-1, -0.3, 0))
arm_l, SH_L = fr.arm(F, M, 1, elbow=(9.6, -6.8, 34.0), wrist=(11.8, -7.0, 38.2), hand_dir=(0.5, -0.1, 0.85), hand_up=(0.3, -1, 0))
arm_r, SH_R = fr.arm(F, M, -1, elbow=(-9.6, -6.8, 34.0), wrist=(-11.8, -7.0, 38.2), hand_dir=(-0.5, -0.1, 0.85), hand_up=(-0.3, -1, 0))


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, fr.LY, 0))
    R.bone('body', (0, -5.2, 22.0), parent='root')
    for nm, at in (('arm_l', SH_L), ('arm_r', SH_R)):
        R.bone(nm, tuple(at), parent='body')
    for nm, at in (('leg_l', HIP_L), ('leg_r', HIP_R)):
        R.bone(nm, tuple(at), parent='root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        B = ('body', 'arm_l', 'arm_r')
        for b in B:
            k(b, 0)
        for f_, dz in ((6, -1.4), (12, 0.6), (18, -1.2), (24, 0.5), (30, -0.8), (36, 0.0)):
            k('body', f_, move=(0, 0, dz))
        for i, f_ in enumerate(range(4, 46, 6)):
            k('arm_l', f_, rot=('Y', -12 if i % 2 else 6))
            k('arm_r', f_ + 2, rot=('Y', 12 if i % 2 else -6))
        for b in B:
            k(b, 56)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    fr.paint_ladder(P, pt, sh)
    fr.paint_frog(P, pt, sh, skin='#e0843a', belly='#f2dcae', happi='#2c3c6a', spots='#b45a2a', seed=9)
    fr.happi_marks(P, M, pt, sh)
    fr.frog_face(P, M, eyes='squeeze', mouth='gritted', seed=45, mouth_w=9.0, h=2.4, weight=0.46, teeth=4)
    P.lines(['skin', 'belly'], ['happi', 'band'], step=1)
    P.lines(['pad'], ['skin', 'belly'], col='#1b1513', step=1)  # (marker outlines round the toe pads)
    P.clusters()
    return P.done()


fr.run(F, ARGS, make_rig, paint, cam=((48, -78, 40), (0, -3, 24)), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('leg_l', 'body'), ('leg_r', 'body'), ('leg_l', 'ladder'), ('leg_r', 'ladder')])
