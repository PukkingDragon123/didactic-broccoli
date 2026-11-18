"""頭 Kashira, "The Old Chief" (series hashigo, secret): the brigade's old toad, big in the belly, in a brass-crested
fire helmet, a brass hose nozzle in both hands and the hose snaking over the foot board.
Gimmick: the nozzle comes up and a jet of water arcs out (a clear stream that runs out of the nozzle), then stops.

    tools/blender.sh art/blender/toys/hashigo/kashira.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
exec(open(__file__.replace('kashira.py', '_head.py')).read())
from mathutils import Matrix, Vector  # noqa: E402

F = Fig('hashigo', 'kashira')
PELVIS = (0.0, -7.2, 11.0)
M = fr.body_matrix(rot=(4, 0, 0), at=PELVIS)
fr.ladder(F, seed=6)
HK = 1.08
# the helmet: a low dome with a brim, perched on the back of the head (behind the eye bumps), tipped back
hz = 16.6 * (1 + (HK - 1) * 0.5)
dome = [(0, hz + 4.4), (2.4, hz + 4.1), (4.0, hz + 3.0), (4.9, hz + 1.5), (5.2, hz + 0.2), (6.0, hz - 0.1), (6.2, hz - 0.4), (5.0, hz - 0.45), (0, hz - 0.45)]
helm_hi = tk.lathe('helm_hi', dome, n=16)
tk.rotate(helm_hi, -14, 'X', pivot=(0, 0, hz))
tk.move(helm_hi, (0, 2.0, 0.6))
tk.push(helm_hi, lambda V, N: 0.25 * np.exp(-((V[:, 0]) / 0.5) ** 2) * (V[:, 2] > hz + 1.0))  # the ridge front to back
badge_hi = tk.cyl('badge_hi', 1.6, -0.3, 0.5, n=12, at=(0, hz + 2.2), axis='Y', bevel=0.2, segs=1)
tk.move(badge_hi, (0, 2.0 - 4.6, 0.2))
tk.set_region(helm_hi, 'helmet')
tk.set_region(badge_hi, 'brass')
helm_lo = tk.lathe('helm', dome[::2] + [dome[-1]], n=8)
tk.rotate(helm_lo, -14, 'X', pivot=(0, 0, hz))
tk.move(helm_lo, (0, 2.0, 0.6))
lo, his = fr.body(F, M, seed=61, belly=1.28, head_k=HK, hachimaki=False, extra_highs=[helm_hi, badge_hi], extra_lows=[helm_lo])
F.part('body', lo, his, bone='body')
leg_l, HIP_L = fr.leg(F, M, 1, knee=(7.6, -10.8, 7.2), ankle=(6.0, -8.6, 4.6), foot_dir=(0.45, -1, 0), foot_up=(0, 0, 1))
leg_r, HIP_R = fr.leg(F, M, -1, knee=(-7.6, -10.8, 7.2), ankle=(-6.0, -8.6, 4.6), foot_dir=(-0.45, -1, 0), foot_up=(0, 0, 1))
# the nozzle in both hands at the chest, pointing out and a little up
N0, N1 = Vector((0.0, -16.8, 17.6)), Vector((0.0, -23.4, 20.4))
ND = (N1 - N0).normalized()
arm_l, SH_L = fr.arm(F, M, 1, elbow=(7.8, -13.8, 13.8), wrist=(1.6, -17.6, 17.4), hand_dir=(-0.8, -0.3, 0.3), hand_up=(0, -0.3, 1))
arm_r, SH_R = fr.arm(F, M, -1, elbow=(-7.8, -13.8, 13.8), wrist=(-1.6, -19.8, 18.4), hand_dir=(0.8, -0.3, 0.3), hand_up=(0, -0.3, 1))
noz_hi = tk.tube('noz_hi', [tuple(N0 - ND * 1.0), tuple(N0 + ND * 2.5), tuple(N1)], [1.25, 1.0, 0.55], n=12, cap0='flat', cap1='flat')
tk.subsurf(noz_hi, 1)
ring_hi = tk.tube('noz_ring_hi', [tuple(N0 + ND * 3.4), tuple(N0 + ND * 4.2)], 1.15, n=12, cap0='flat', cap1='flat')
noz = tk.join([noz_hi, ring_hi], 'noz_hi')
tk.set_region(noz, 'brass')
noz_lo = tk.tube('noz', [tuple(N0 - ND * 1.0), tuple(N1)], [1.25, 0.55], n=6, cap0='flat', cap1='flat')
# the hose: out of the nozzle's back, down its right side, over the board and off its front edge
hose_pts = [tuple(N0 - ND * 0.8), (-2.4, -15.8, 15.6), (-7.8, -13.8, 11.6), (-10.6, -11.4, 7.2), (-10.4, -10.4, 4.4), (-6.0, -12.2, 4.25),
            (0.0, -12.0, 4.25), (5.6, -9.8, 4.25), (9.8, -11.0, 4.25), (11.8, -12.6, 4.0)]
hose_hi = tk.tube('hose_hi', hose_pts, 1.25, n=10, cap0='flat', cap1='flat')
tk.push(hose_hi, lambda V, N: 0.08 * np.sin(V[:, 0] * 3 + V[:, 1] * 3 + V[:, 2] * 3))  # the canvas weave
tk.set_region(hose_hi, 'hose')
hose_lo = tk.tube('hose', hose_pts[::2] + [hose_pts[-1]], 1.25, n=5, cap0='flat', cap1='flat')
F.part('nozzle', tk.join([noz_lo, hose_lo], 'nozzle'), [noz, hose_hi], bone='body', kind='matte')
# the water: a clear jet, modelled squashed into the nozzle's mouth (the clip stretches it out along the nozzle)
SQ = 0.04
w_pts = [N1 + ND * (2 + 26 * t) + Vector((0, 0, 9 * math.sin(math.pi * t * 0.8) - 6 * t * t)) for t in np.linspace(0, 1, 7)]
w_hi = tk.tube('water_hi', [tuple(p) for p in w_pts], [0.8, 1.15, 1.4, 1.55, 1.7, 1.8, 1.4], n=10, cap0='round', cap1='round')
tk.push(w_hi, lambda V, N: 0.15 * np.sin(V[:, 1] * 2.2 + V[:, 2] * 1.3))
tk.set_region(w_hi, 'water')
w_lo = tk.tube('water', [tuple(p) for p in w_pts[::2]], [0.8, 1.4, 1.7, 1.4], n=5)
SQM = Matrix.Translation(N1) @ Matrix.Diagonal((SQ, SQ, SQ, 1)) @ Matrix.Translation(-N1)
for o in (w_hi, w_lo):
    tk.transform(o, SQM)
F.part('water', w_lo, [w_hi], bone='water', kind='gloss', uvw=0.6)


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, fr.LY, 0))
    R.bone('body', PELVIS, parent='root')
    for nm, at_ in (('arm_l', SH_L), ('arm_r', SH_R)):
        R.bone(nm, tuple(at_), parent='body')
    for nm, at_ in (('leg_l', HIP_L), ('leg_r', HIP_R)):
        R.bone(nm, tuple(at_), parent='root')
    R.bone('water', tuple(N1), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        B = ('body', 'water')
        for b in B:
            k(b, 0)
        # braces (leans back), the jet shoots out, holds, wavers, runs dry
        k('body', 6, rot=('X', -5))
        k('water', 6)
        k('water', 12, scale=1 / SQ)
        k('body', 12, rot=('X', -3))
        for i, f_ in enumerate((18, 24, 30, 36, 42)):
            k('body', f_, rot=[('X', -3), ('Z', 5 if i % 2 else -5)])
            k('water', f_, scale=1 / SQ * (0.96 if i % 2 else 1.0))
        k('water', 48, scale=1 / SQ)
        k('water', 54)
        k('body', 50, rot=('X', -3))
        k('body', 60)
        k('water', 60)
    return R


def paint(P, pt):
    sh = P.shade(light=0.0, ao=0.8, cav=1.1)
    fr.paint_ladder(P, pt, sh)
    fr.paint_frog(P, pt, sh, skin='#8a7e5a', belly='#e2d6a8', happi='#3a2c22', spots='#5e543a', seed=13)
    fr.happi_marks(P, M, pt, sh, collar='#e9b83c', crest='#e9b83c')
    P.fill('helmet', pt.ramp('#2c2a2e', 7, dark=0.4, light=0.45, shift=0.03), tone=sh * 1.3, base=0.1)
    P.fill('brass', pt.ramp('#d4a23e', 7, shift=0.07), tone=sh * 1.4, base=0.1)
    P.fill('hose', pt.ramp('#d8cfb4', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('water', pt.ramp('#9fd0ea', 5, shift=0.04), tone=sh * 0.5, base=0.3)
    P.flat(P.region('water') & (np.sin(P.Y * 2.4 + P.Z * 1.1) > 0.8), '#eef8fc')
    c, ax, upv = fr.W(M, (0, -6.4 * HK, 12.4)), np.array(fr.W(M, (0, -1, 0))) - np.array(fr.W(M, (0, 0, 0))), np.array(fr.W(M, (0, 0, 1))) - np.array(fr.W(M, (0, 0, 0)))
    fc = face.Face(P, c, tuple(ax), up=tuple(upv), where=P.region('skin') | P.region('belly'), seed=66)
    fc.eyes(spread=9.6, size=0.5, dy=1.4, uneven=0.3)
    fc.stroke([(-6.0, 3.2), (-3.2, 2.6)], weight=0.45)   # two stern brows
    fc.stroke([(6.1, 3.1), (3.3, 2.5)], weight=0.45)
    fc.mouth('frown', w=6.4, dy=-1.2, weight=0.5, side=-1)
    P.lines(['skin', 'belly'], ['happi', 'helmet'], step=1)
    P.clusters()
    return P.done()


fr.run(F, ARGS, make_rig, paint, cam=((52, -82, 40), (0, -5, 22)), skip=[('arm_l', 'body'), ('arm_r', 'body'), ('leg_l', 'body'), ('leg_r', 'body'), ('nozzle', 'body'), ('arm_l', 'nozzle'), ('arm_r', 'nozzle'), ('water', 'nozzle'), ('leg_l', 'nozzle'), ('leg_r', 'nozzle')])
