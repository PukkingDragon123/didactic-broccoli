"""提灯おばけ Lantern Ghost: series obakebaito, Haunted House Part-Timers (concepts_B.md).

Front: a chōchin-obake, an old paper lantern torn across the middle into a grin, one eye and one squint painted
above, dangling from a bamboo pole in front of the black flat. Turn it round: a tanuki in a happi coat stands behind
the flat holding the pole like a fishing rod, the far end resting on the flat's top.
Gimmick: the tanuki jiggles the pole; the lantern bobs, its mouth splits wide open and the tongue rolls out. A
playset stage block.

    tools/blender.sh art/blender/toys/obakebaito/chochin.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import ak  # noqa: E402
import kit  # noqa: E402
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'tsuppari'))
import _ob as ob  # noqa: E402
import _gl as gl  # noqa: E402

F = bk.start('obakebaito', 'chochin')
SZ, FY, FH = ob.SZ, ob.FY, ob.FH
st = ob.stage(F)

# ------------------------------------------------------------------ the lantern: ribbed paper between black lacquer caps, torn into a mouth
LC = (-1.0, -7.0)
LB = SZ + 7.0      # the lantern's bottom
MZ = SZ + 15.2     # the tear (its mouth line)
TOPZ = SZ + 23.6


def lantern_half(name, z0, z1, region, top):
    """The lantern's paper between z0 and z1 (a barrel: widest at the mouth line)."""
    prof = []
    for t in np.linspace(0, 1, 7):
        z = z0 + (z1 - z0) * t
        r = 3.2 + 3.0 * math.sin(math.pi * (z - (LB)) / (TOPZ - SZ - 4.2))
        prof.append((r, z))
    prof = [(0, z0)] + prof + [(0, z1)]
    hi = tk.lathe(name + '_hi', prof, n=24, centre=(LC[0], LC[1], 0))
    tk.subsurf(hi, 1)
    tk.push(hi, lambda V, N: -0.28 * (np.abs(np.mod(V[:, 2] - SZ, 1.3) - 0.65) > 0.55))  # the bamboo hoops under the paper
    tk.set_region(hi, region)
    lo = tk.lathe(name, prof[::2] if len(prof) > 6 else prof, n=12, centre=(LC[0], LC[1], 0))
    return lo, hi


up_lo, up_hi = lantern_half('lantern', MZ + 0.3, TOPZ, 'paper', True)
jw_lo, jw_hi = lantern_half('jaw', LB, MZ - 0.3, 'paper', False)
caps_lo, caps_hi = [], []
for nm_, z, lst_lo, lst_hi in (('captop', TOPZ, caps_lo, caps_hi), ('capbot', LB, None, None)):
    c = (LC[0], LC[1], z)
    prof = [(0, -0.9), (3.6, -0.8), (3.8, 0.0), (3.6, 0.8), (0, 0.9)]
    h_ = tk.lathe(nm_ + '_hi', prof, n=16, centre=c)
    tk.subsurf(h_, 1)
    tk.set_region(h_, 'lacquer')
    l_ = tk.lathe(nm_, prof, n=8, centre=c)
    if nm_ == 'captop':
        up_lo, up_hi = tk.join([up_lo, l_], 'lantern'), [up_hi, h_]
    else:
        jw_lo, jw_hi = tk.join([jw_lo, l_], 'jaw'), [jw_hi, h_]
# the hook and a short cord up to the pole's tip
TIP = (LC[0], LC[1] - 0.4, TOPZ + 4.8)
cd_lo, cd_hi = ak.spine('cord', [(LC[0], LC[1], TOPZ + 0.6), TIP], 0.45, 0.25, n=4, up=(1, 0, 0), tris=6, region='string', cap0='round', cap1='round')
up_lo = tk.join([up_lo, cd_lo], 'lantern')
up_hi += cd_hi
TG0 = (LC[0], LC[1] - 4.8, MZ - 0.6)
tg_lo, tg_hi = ak.spine('tongue', [TG0, (LC[0], LC[1] - 6.6, MZ - 1.4), (LC[0], LC[1] - 7.0, MZ - 3.4), (LC[0], LC[1] - 6.2, MZ - 4.8)],
                        [2.8, 3.0, 2.6, 1.8], 0.55, n=8, up=(0, -1, 0), tris=30, region='tongue', cap0='round', cap1='round')

# ------------------------------------------------------------------ the bamboo pole over the flat, and the tanuki holding it
REST = (LC[0] + 3.0, FY, SZ + FH + 0.9)
GRIP = np.array((6.4, 8.6, SZ + 11.6))
pole_pts = [tuple(GRIP + (0.6, 1.4, -1.6)), tuple(GRIP), REST, TIP]
pl_lo, pl_hi = ak.spine('pole', pole_pts, [1.3, 1.2, 1.0, 0.7], [0.65, 0.6, 0.5, 0.35], n=8, up=(1, 0, 0), tris=40, region='bamboo',
                        cap0='round', cap1='round')
tk.push(pl_hi[0], lambda V, N: 0.2 * (np.abs(np.mod(np.linalg.norm(V - GRIP, axis=1), 5.2) - 2.6) > 2.4))  # bamboo nodes
w = ob.worker('tanuki', at=(8.8, 8.8, SZ), yaw=205, name='t')
bw, bh = ob.KINDS['tanuki'][:2]
arms_lo, arms_hi = [], []
for k_, sh in (('l', w['sh_l']), ('r', w['sh_r'])):
    hand = GRIP + (np.array(sh) - GRIP) * 0.1 + (0, 0, -0.6)
    a_lo, a_hi, _ = tt.arm('tarm_' + k_, [sh, tuple((np.array(sh) + hand) / 2 + (0, 0, -1.0)), tuple(hand)], r=1.2, hand=1.3, tris=30,
                           region='happi', hand_region='fur_tanuki')
    arms_lo.append(a_lo)
    arms_hi += a_hi
tail_lo, tail_hi = ak.spine('ttail', [w['tp']((0, 3.2, 1.4)), w['tp']((0.6, 5.6, 0.8)), w['tp']((1.4, 7.0, 0.6))], [2.6, 3.0, 1.8], 1.4, n=8,
                            up=(0, 0, 1), tris=24, region='fur_tanuki', cap0='round', cap1='round')

# ------------------------------------------------------------------ parts
F.part('stage', tk.join(st['lo'], 'stage'), st['hi'])
F.part('pole', pl_lo, pl_hi, bone='pole')
F.part('lantern', up_lo, up_hi, bone='lantern')
F.part('jaw', jw_lo, jw_hi, bone='jaw')
F.part('tongue', tg_lo, tg_hi, bone='tongue', kind='gloss')
F.part('tanu', tk.join(w['lo'] + [tail_lo], 'tanu'), w['hi'] + tail_hi, bone='tanu')
F.part('tarms', tk.join(arms_lo, 'tarms'), arms_hi, bone='tarms')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('pole', REST, parent='root')
    R.bone('lantern', TIP, parent='pole')
    R.bone('jaw', (LC[0], LC[1] + 4.0, MZ), parent='lantern')
    R.bone('tongue', TG0, parent='jaw')
    R.bone('tanu', (8.8, 8.8, SZ), parent='root')
    R.bone('tarms', tuple((np.array(w['sh_l']) + np.array(w['sh_r'])) / 2), parent='tanu')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'pole', 'lantern', 'jaw', 'tongue', 'tanu', 'tarms']
        for b in bones:
            k(b, 0)
        # the tanuki jiggles the rod: the lantern bobs on its cord (6-30), its mouth splits open and the tongue unrolls
        for i, f in enumerate((4, 8, 12, 16, 20, 24)):
            s_ = 1 if i % 2 == 0 else -1
            k('pole', f, rot=('X', 5 * s_))
            k('tarms', f, rot=('X', -6 * s_))
            k('lantern', f, rot=('X', -5 * s_))
        k('pole', 30)
        k('tarms', 30)
        k('lantern', 34, ease='BOUNCE')
        k('jaw', 8)
        k('jaw', 16, rot=('X', 34), ease='BACK')
        k('jaw', 44, rot=('X', 30))
        k('jaw', 54, ease='BACK')
        k('tongue', 12)
        k('tongue', 22, rot=('X', 52), ease='BACK')
        k('tongue', 44, rot=('X', 46))
        k('tongue', 52)
        k('tanu', 30)
        k('tanu', 38, rot=('X', 8))          # (a yawn)
        k('tanu', 50)
        for b in bones:
            k(b, 60)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ob.paint_stage(P, pt, sh, gl, bk)
    # old lantern paper: warm cream, browned, with its hoops showing; a red-painted lip round the tear
    P.fill('paper', pt.ramp('#efe0bc', 6, shift=0.05), tone=sh, base=0.15)
    pa = P.region('paper')
    P.fill(pa & (P.cav < 0.45), pt.ramp('#b89a6a', 4), tone=sh, base=0.0)
    P.fill(pa & (np.abs(Z - MZ) < 0.9) & (Yc < LC[1] - 1.0), pt.ramp('#b3282c', 4), tone=sh, base=0.05)
    P.fill(pa & (np.abs(Z - MZ) < 0.6) & (Yc < LC[1] - 2.0) & (P.on[:, :, 2] * np.sign(MZ - Z) > 0.3), pt.ramp('#3a1416', 3), tone=sh)  # the mouth's dark inside
    P.fill('lacquer', pt.ramp('#1d1a20', 5, shift=0.05, light=0.6), tone=sh * 1.3, base=0.0)
    P.fill('tongue', pt.ramp('#d8484e', 6, shift=0.06), tone=sh * 1.2, base=0.1)
    P.fill('bamboo', pt.ramp('#b9a35a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill(P.region('bamboo') & (P.cav < 0.45), pt.ramp('#7a6a34', 4), tone=sh)
    P.fill('string', pt.ramp('#2a2224', 3), tone=sh)
    ob.paint_worker(P, pt, sh, 'tanuki', '#8a6a48')   # (his back, and its crest, face the flat)
    import face
    # the lantern's face: one big eye, one squinting, above the torn grin
    lf = face.Face(P, c=(LC[0], LC[1] - 6.0, MZ + 4.0), axis=(0, -1, 0.0), where=pa, seed=721)
    lf.eyes('dot', spread=0.01, size=0.85, dy=0.0, only=0)
    lf.stroke([(1.4, 0.4), (3.4, 0.0), (1.6, -0.6)], weight=0.55)
    fdir = np.array((math.sin(math.radians(205)), -math.cos(math.radians(205)), 0.0))
    hc = np.array(w['head'])
    tf = face.Face(P, c=tuple(hc + fdir * 4.4), axis=tuple(fdir + (0, 0, 0.1)), where=P.region('fur_tanuki'), seed=722)
    for sx in (1, -1):
        tf.patch(sx * 1.45, 0.45, 1.05, 0.7, '#3a2a20', rot=-sx * 28)
    te = face.Face(P, c=tuple(hc + fdir * 4.4), axis=tuple(fdir + (0, 0, 0.1)), where=P.region('fur_tanuki'), seed=723, ink='#f1e8d4')
    te.eyes('sleepy', spread=2.8, size=0.36, dy=0.6)
    tf.nose('button', dy=-0.8, size=0.4)
    tf.mouth('o', w=0.8, dy=-1.8, weight=0.22)
    P.lines(['tongue', 'lacquer'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('pole', 'stage'), ('lantern', 'pole'), ('jaw', 'lantern'), ('tongue', 'jaw'), ('tongue', 'lantern'),
                                 ('tanu', 'stage'), ('tarms', 'tanu'), ('tarms', 'pole'), ('pole', 'tanu')],
       cam=((62, -90, 56), (0, 0, 16)), fold=(0, 8, 16, 24), frames=60)
