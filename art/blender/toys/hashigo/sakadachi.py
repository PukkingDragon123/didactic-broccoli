"""逆立ち Sakadachi, "Handstand" (series hashigo): a brown toad doing a handstand on the bottom rung, legs up in a V,
grinning at you upside down. Gimmick: it lets go with one hand, waves, scissors its legs and catches the rung again.

    tools/blender.sh art/blender/toys/hashigo/sakadachi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
exec(open(__file__.replace('sakadachi.py', '_head.py')).read())
F = Fig('hashigo', 'sakadachi')
M = fr.body_matrix(rot=(12, 180, 4), at=(0, -5.6, 31.0))  # upside down, still facing you
fr.ladder(F, seed=2)
lo, his = fr.body(F, M, seed=21, belly=1.08)
F.part('body', lo, his, bone='body')
# hands on the rung's front (the shoulders are flipped: arm_l's shoulder is at -x)
arm_l, SH_L = fr.arm(F, M, 1, elbow=(-8.2, -5.8, 18.8), wrist=(-5.6, -0.6, 14.2), hand_dir=(0, 0.75, -0.65), hand_up=(0, -0.65, -0.75))
arm_r, SH_R = fr.arm(F, M, -1, elbow=(8.2, -5.8, 18.8), wrist=(5.6, -0.6, 14.2), hand_dir=(0, 0.75, -0.65), hand_up=(0, -0.65, -0.75))
# legs up in a V, the feet turned out
leg_l, HIP_L = fr.leg(F, M, 1, knee=(-9.6, -7.6, 34.6), heel=(-8.4, -4.4, 38.4), ankle=(-11.4, -5.6, 40.6), foot_dir=(-0.8, -0.2, 0.45), foot_up=(-0.4, -0.5, -0.7))
leg_r, HIP_R = fr.leg(F, M, -1, knee=(9.6, -7.6, 34.6), heel=(8.4, -4.4, 38.4), ankle=(11.4, -5.6, 40.6), foot_dir=(0.8, -0.2, 0.45), foot_up=(0.4, -0.5, -0.7))
HAND_L = (-5.6, -0.6, 14.2)

# the frog grown 15% about the hand on the rung (the rung moved up 1 mm)
T, M = fr.grow(F, M, HAND_L, shift=(0, 0, 1.0))
HAND_L, SH_L, SH_R, HIP_L, HIP_R = [T(p) for p in (HAND_L, SH_L, SH_R, HIP_L, HIP_R)]


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, fr.LY, 0))
    R.bone('body', HAND_L, parent='root')  # it pivots on the hand that stays on the rung
    for nm, at in (('arm_l', SH_L), ('arm_r', SH_R), ('leg_l', HIP_L), ('leg_r', HIP_R)):
        R.bone(nm, tuple(at), parent='body' if nm != 'arm_l' else 'root')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        B = ('body', 'arm_r', 'leg_l', 'leg_r')
        for b in B:
            k(b, 0)
        # weight onto the left hand, the right hand lets go and waves, the legs scissor
        k('body', 8, rot=('Y', -9))
        k('arm_r', 6)
        k('arm_r', 14, rot=[('Y', -40), ('X', -25)])
        for i, f_ in enumerate((18, 23, 28, 33)):
            k('arm_r', f_, rot=[('Y', -40 - (12 if i % 2 else -6)), ('X', -25)])
        for i, f_ in enumerate((10, 17, 24, 31)):
            k('leg_l', f_, rot=('X', 16 if i % 2 else -16))
            k('leg_r', f_, rot=('X', -16 if i % 2 else 16))
        k('leg_l', 38)
        k('leg_r', 38)
        k('arm_r', 40, rot=[('Y', -40), ('X', -25)])
        k('arm_r', 48)
        k('body', 40, rot=('Y', -9))
        k('body', 50, rot=('Y', 2))
        for b in B:
            k(b, 60)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    fr.paint_ladder(P, pt, sh)
    fr.paint_frog(P, pt, sh, skin='#8a7a3e', belly='#ece2b8', happi='#5a2a2a', spots='#6e4a2a', seed=5)
    fr.happi_marks(P, M, pt, sh)
    fr.frog_face(P, M, eyes='happy', mouth='grin', seed=24, mouth_w=13.0, h=3.8, weight=0.55, teeth=3)
    P.lines(['skin', 'belly'], ['happi', 'band'], step=1)
    P.lines(['pad'], ['skin', 'belly'], col='#1b1513', step=1)  # (marker outlines round the toe pads)
    P.clusters()
    return P.done()


fr.run(F, ARGS, make_rig, paint, cam=((48, -78, 40), (0, -3, 24)), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('leg_l', 'body'), ('leg_r', 'body'), ('arm_l', 'ladder'), ('arm_r', 'ladder')])
