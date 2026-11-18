"""傘おばけ Umbrella Ghost: series obakebaito, Haunted House Part-Timers (concepts_B.md).

Front: a kasa-obake, a closed oiled-paper umbrella with one big painted eye and a long red tongue, hopping on one
hairy leg in one geta, in front of the haunted house's black flat. Turn it round: a hamster in an indigo happi coat
sits on a crate behind the flat with a cup of tea, holding the string that runs over a pulley to the umbrella's tip.
Gimmick: the hamster yanks the string; the umbrella jumps, spins and lolls its tongue, then hops again. The stage
block is a playset part: stand the series side by side and the blocks click into one haunted-house corridor.

    tools/blender.sh art/blender/toys/obakebaito/kasa.py [--preview] [--fold] [--clip] [--fast] [--repaint]
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

F = bk.start('obakebaito', 'kasa')
SZ, FY, FH = ob.SZ, ob.FY, ob.FH
st = ob.stage(F)

# ------------------------------------------------------------------ the umbrella ghost: geta, one hairy leg, the folded canopy
UX, UY = -1.0, -4.6
u_lo, u_hi = [], []
u_hi.append(tk.rbox('geta_hi', (4.6, 8.8, 1.4), centre=(UX, UY, SZ + 2.1), bevel=0.35, segs=2))
u_lo.append(tk.rbox('geta', (4.6, 8.8, 1.4), centre=(UX, UY, SZ + 2.1), bevel=0, segs=0))
for ty in (-2.8, 2.8):
    u_hi.append(tk.rbox('tooth_hi', (4.2, 1.2, 1.5), centre=(UX, UY + ty, SZ + 0.75), bevel=0.2, segs=1))
    u_lo.append(tk.rbox('tooth', (4.2, 1.2, 1.5), centre=(UX, UY + ty, SZ + 0.75), bevel=0, segs=0))
for o in u_hi:
    tk.set_region(o, 'geta')
lg = [(UX, UY - 0.6, SZ + 3.4), (UX + 0.9, UY - 0.2, SZ + 6.2), (UX, UY, SZ + 9.8)]
l_lo, l_hi = ak.spine('leg', lg, [2.4, 2.2, 2.0], 1.1, n=8, up=(0, -1, 0), tris=26, region='leg', cap0='round', cap1='round')
tk.push(l_hi[0], lambda V, N: 0.12 * (np.sin(V[:, 2] * 9.0 + V[:, 0] * 5.0) > 0.7))   # hairy shin
ft_lo, ft_hi = ak.spine('foot', [(UX, UY + 0.4, SZ + 3.3), (UX, UY - 1.6, SZ + 3.2), (UX, UY - 3.0, SZ + 3.1)], [2.6, 2.6, 2.0], 0.8,
                        n=8, up=(0, 0, 1), tris=20, region='leg', cap0='round', cap1='round')
hn_lo, hn_hi = ak.spine('hanao', [(UX - 2.1, UY + 0.6, SZ + 2.8), (UX, UY - 2.0, SZ + 4.4), (UX + 2.1, UY + 0.6, SZ + 2.8)], 0.7, 0.4,
                        n=5, up=(0, 0, 1), tris=12, region='hanao', cap0='round', cap1='round')
u_lo += [l_lo, ft_lo, hn_lo]
u_hi += l_hi + ft_hi + hn_hi
CAN = [(SZ + 9.4, UY, 9.4, 4.7, 4.7, 2.0), (SZ + 13.0, UY, 12.4, 6.2, 6.2, 2.0), (SZ + 18.0, UY, 12.0, 6.0, 6.0, 2.0),
       (SZ + 23.0, UY, 9.0, 4.5, 4.5, 2.0), (SZ + 27.0, UY, 4.8, 2.4, 2.4, 2.0), (SZ + 29.4, UY, 1.8, 0.9, 0.9, 2.0)]
for i in range(len(CAN)):
    z, cy, w, ht, hb, e = CAN[i]
    CAN[i] = (z, cy, w, ht, hb, e)


def sc_can(h):
    def f(V, N):
        a = np.arctan2(V[:, 0] - UX, V[:, 1] - UY)
        d = 0.5 * np.abs(np.sin(a * 4.0)) - 0.25                       # eight folds of paper between the ribs
        # the mouth: a slit across the front, where the tongue comes out
        d -= 0.6 * np.exp(-((V[:, 2] - SZ - 14.4 - 0.02 * (V[:, 0] - UX) ** 2) / 0.35) ** 2) * (V[:, 1] < UY - 3.0) * (np.abs(V[:, 0] - UX) < 3.6)
        return d * tk.smoothstep(SZ + 9.4, SZ + 11.0, V[:, 2])
    tk.push(h, f)


c_lo, c_hi = ak.stack('canopy', [(z, cy, w, ht, hb, e) for z, cy, w, ht, hb, e in CAN], n=16, tris=150, sculpt=sc_can, region='paper',
                      cap0='flat', cap1='round')
for o in [c_lo] + c_hi:
    tk.move(o, (UX, 0, 0))
TIP = (UX, UY, SZ + 30.6)
tp_hi = tk.lathe('tip_hi', [(0, -1.4), (0.8, -1.0), (0.9, 0.2), (0.5, 1.0), (0, 1.3)], n=10, centre=TIP)
tk.subsurf(tp_hi, 1)
tk.set_region(tp_hi, 'tipk')
tp_lo = tk.lathe('tipk', [(0, -1.4), (0.8, -1.0), (0.9, 0.2), (0.5, 1.0), (0, 1.3)], n=5, centre=TIP)
u_lo += [c_lo, tp_lo]
u_hi += c_hi + [tp_hi]
TG0 = (UX, UY - 5.4, SZ + 14.2)
tg_lo, tg_hi = ak.spine('tongue', [TG0, (UX + 0.2, UY - 7.0, SZ + 13.0), (UX + 0.4, UY - 7.6, SZ + 10.6), (UX + 0.6, UY - 7.4, SZ + 8.6)],
                        [2.6, 2.8, 2.6, 2.0], 0.55, n=8, up=(0, -1, 0), tris=30, region='tongue', cap0='round', cap1='round')
tk.push(tg_hi[0], lambda V, N: -0.2 * np.exp(-((V[:, 0] - UX - 0.3) / 0.25) ** 2) * (N[:, 1] < -0.3))  # its middle groove
# the string: from the tip over the pulley on the flat (front run, moves with the umbrella)
PUL = (UX, FY + 0.2, SZ + FH + 1.4)
s1_lo, s1_hi = ak.spine('str1', [TIP, ((TIP[0] + PUL[0]) / 2, (TIP[1] + PUL[1]) / 2, (TIP[2] + PUL[2]) / 2 + 0.3), PUL], 0.4, 0.2, n=4,
                        up=(1, 0, 0), tris=8, region='string', cap0='round', cap1='round')
pl_hi = tk.lathe('pulley_hi', [(0, -0.7), (1.3, -0.6), (0.9, 0.0), (1.3, 0.6), (0, 0.7)], n=12, axis='X', centre=PUL)
pl_lo = tk.lathe('pulley', [(0, -0.7), (1.3, -0.6), (0.9, 0.0), (1.3, 0.6), (0, 0.7)], n=6, axis='X', centre=PUL)
tk.set_region(pl_hi, 'peg')
br_lo, br_hi = ak.spine('bracket', [(UX, FY, SZ + FH - 0.4), (UX, FY + 0.2, PUL[2])], 1.4, 0.4, n=4, up=(0, 1, 0), tris=8, region='peg',
                        cap0='flat', cap1='round')
st['lo'] += [pl_lo, br_lo]
st['hi'] += [pl_hi] + br_hi

# ------------------------------------------------------------------ behind the flat: a hamster on a crate, tea, the string
CR = (5.4, 8.6, SZ)
cr_hi = tk.rbox('crate_hi', (7.0, 6.0, 4.2), centre=(CR[0], CR[1], SZ + 2.1), bevel=0.3, segs=1)
tk.push(cr_hi, lambda V, N: -0.2 * (np.abs(np.mod(V[:, 2] - SZ, 1.4) - 0.7) > 0.62) * (np.abs(N[:, 2]) < 0.5))  # slats
tk.set_region(cr_hi, 'ply')
cr_lo = tk.rbox('crate', (7.0, 6.0, 4.2), centre=(CR[0], CR[1], SZ + 2.1), bevel=0, segs=0)
CUP = (8.2, 10.6, SZ + 4.2)
cu_hi = tk.lathe('cup_hi', [(0, 0), (0.9, 0.0), (1.1, 1.6), (0.9, 1.7), (0.8, 1.4), (0, 1.4)], n=12, centre=CUP)
tk.set_region(cu_hi, 'cup')
cu_lo = tk.lathe('cup', [(0, 0), (0.9, 0.0), (1.1, 1.6), (0, 1.5)], n=6, centre=CUP)
st['lo'] += [cr_lo, cu_lo]
st['hi'] += [cr_hi, cu_hi]
w = ob.worker('hamster', at=(CR[0] - 0.6, CR[1] - 0.6, SZ + 4.2), yaw=158, name='h')
tp = w['tp']
bw, bh = ob.KINDS['hamster'][:2]
HANDS = tp((0.0, -bw * 0.62, bh * 0.66))
arms_lo, arms_hi = [], []
for k_, sh in (('l', w['sh_l']), ('r', w['sh_r'])):
    hand = np.array(HANDS) + (np.array(sh) - np.array(HANDS)) * 0.12
    mid = (np.array(sh) + hand) / 2 + (0, 0, -1.0)
    a_lo, a_hi, _ = tt.arm('arm_' + k_, [sh, tuple(mid), tuple(hand)], r=1.2, hand=1.2, tris=30, region='happi', hand_region='fur_hamster')
    arms_lo.append(a_lo)
    arms_hi += a_hi
s2_lo, s2_hi = ak.spine('str2', [PUL, (PUL[0] + 2.0, PUL[1] + 2.4, PUL[2] - 3.0), HANDS], 0.4, 0.2, n=4, up=(1, 0, 0), tris=8,
                        region='string', cap0='round', cap1='round')

# ------------------------------------------------------------------ parts
F.part('stage', tk.join(st['lo'], 'stage'), st['hi'])
F.part('umb', tk.join(u_lo + [s1_lo], 'umb'), u_hi + s1_hi, bone='umb')
F.part('tongue', tg_lo, tg_hi, bone='tongue', kind='gloss')
F.part('ham', tk.join(w['lo'], 'ham'), w['hi'], bone='ham')
F.part('arms', tk.join(arms_lo + [s2_lo], 'arms'), arms_hi + s2_hi, bone='arms')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('umb', (UX, UY, SZ), parent='root')
    R.bone('tongue', TG0, parent='umb')
    R.bone('ham', (CR[0] - 0.6, CR[1] - 0.6, SZ + 4.2), parent='root')
    R.bone('arms', tuple((np.array(w['sh_l']) + np.array(w['sh_r'])) / 2), parent='ham')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'umb', 'tongue', 'ham', 'arms']
        for b in bones:
            k(b, 0)
        # 0-6 the hamster yanks the string; 6-18 the umbrella jumps, spins a quarter turn, the tongue lolls
        k('arms', 2)
        k('arms', 6, rot=('X', -26), ease='BACK')
        k('ham', 6, rot=('X', -8))
        k('umb', 5)
        k('umb', 11, move=(0, 0, 5.0), rot=('Z', 25))
        k('umb', 17, rot=('Z', 30), ease='BOUNCE')
        k('tongue', 7)
        k('tongue', 12, rot=('X', 34), ease='BACK')
        k('tongue', 40, rot=('X', 30))
        k('tongue', 48, ease='BACK')
        k('arms', 14)
        k('ham', 14)
        # 20-32 again, a smaller hop back round; the hamster yawns
        k('arms', 20)
        k('arms', 24, rot=('X', -20), ease='BACK')
        k('umb', 22, rot=('Z', 30))
        k('umb', 27, move=(0, 0, 3.0), rot=('Z', 8))
        k('umb', 32, ease='BOUNCE')
        k('arms', 32)
        k('ham', 34)
        k('ham', 42, rot=[('X', 10), ('Z', -8)])
        k('ham', 52)
        for b in bones:
            k(b, 60)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ob.paint_stage(P, pt, sh, gl, bk)
    # oiled paper: plum with a white janome ring painted round the shoulders; bamboo ribs between the folds
    P.fill('paper', pt.ramp('#8e2f4a', 7, shift=0.08, light=0.5), tone=sh, base=0.0)
    pa = P.region('paper')
    P.fill(pa & (np.abs(Z - SZ - 24.0) < 1.2), pt.ramp('#efe7d6', 5), tone=sh, base=0.1)
    P.fill(pa & (P.cav < 0.44), pt.ramp('#5e1c30', 5), tone=sh, base=0.0)
    P.fill('tipk', pt.ramp('#2a2024', 4), tone=sh, base=0.0)
    P.fill('tongue', pt.ramp('#d8484e', 6, shift=0.06), tone=sh * 1.2, base=0.1)
    P.fill('leg', pt.ramp('#e2b48c', 6, shift=0.05), tone=sh, base=0.05)
    P.fill(P.region('leg') & (P.cav > 0.56) & (Z > SZ + 4.0), pt.ramp('#3a2a24', 4), tone=sh, base=0.0)   # leg hairs
    P.fill('geta', pt.ramp('#c39a63', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('hanao', pt.ramp('#b3282c', 5, shift=0.06), tone=sh, base=0.0)
    P.fill('string', pt.ramp('#e8e2d2', 4), tone=sh, base=0.1)
    P.fill('cup', pt.ramp('#d8d2c4', 5, shift=0.04), tone=sh, base=0.1)
    P.fill(P.region('cup') & (Z > CUP[2] + 1.35) & (P.on[:, :, 2] > 0.7), pt.ramp('#8a9a4a', 3), tone=sh)      # green tea
    ob.paint_worker(P, pt, sh, 'hamster', '#e0a462')   # (her back, and its crest, face the flat)
    fh = P.region('fur_hamster')
    P.fill(fh & (P.on[:, :, 2] < 0.2) & (np.linalg.norm(P.pos - np.array(w['head']), axis=2) < 4.6) &
           (((P.pos - np.array(w['head'])) @ np.array((math.sin(math.radians(158)), -math.cos(math.radians(158)), 0.0))) < -0.0),
           pt.ramp('#f4ece0', 5), tone=sh, base=0.15)                                                     # a white muzzle and chest
    import face
    hc = np.array(w['head'])
    fdir = np.array((math.sin(math.radians(158)), -math.cos(math.radians(158)), 0.0))
    fc = face.Face(P, c=tuple(hc + fdir * 3.6 + (0, 0, 0.2)), axis=tuple(fdir + (0, 0, 0.1)), where=fh, seed=701)
    fc.eyes('sleepy', spread=3.6, size=0.42, dy=0.5)
    fc.nose('tri', dy=-0.5, size=0.3, col='#d98a8a')
    fc.mouth('line', w=1.0, dy=-1.3, weight=0.25)
    # the umbrella's single eye, big, and a few painted brush strokes for brows
    ue = face.Face(P, c=(UX, UY - 6.0, SZ + 18.2), axis=(0, -1, 0.0), where=pa, seed=702)
    ue.eyes('big', spread=0.01, size=1.6, only=0)
    ue.stroke([(-2.6, 2.8), (-0.6, 3.6), (1.8, 3.2)], weight=0.55)
    P.lines(['tongue', 'hanao', 'string', 'cup'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('umb', 'stage'), ('tongue', 'umb'), ('ham', 'stage'), ('arms', 'ham'), ('arms', 'stage'), ('umb', 'arms')],
       cam=((62, -90, 56), (0, 0, 16)), fold=(0, 6, 11, 27), frames=60)
