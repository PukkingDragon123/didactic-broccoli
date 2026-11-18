"""コックペンギン Chef Penguin (series minato, concepts_E.md): the cook of the little harbour trattoria, a penguin in a
white double-breasted chef's jacket, red neckerchief, navy apron and tall toque, up on one foot as he flips the frying
pan, the other flipper flung up. In the pan lies a ghostly fish (whatever he cooks, you feel oddly better).
Gimmick: the pan flips: the ghost fish leaps up out of it, somersaults and lands back in the pan with a sizzle.

    GG_FACET=1 tools/blender.sh art/blender/toys/minato/pengin.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('minato', 'pengin')
B = Build()
GZ = 3.0

# ------------------------------------------------------------------ the cobbles, the planted foot and the kicked-up one
B.add('body', cobbles(seed=7))
B.add('body', shoe('foot_r', (-2.6, 0.4, GZ - 0.2), (-0.2, -1, 0), L=5.8, W=4.0, H=1.6, region='feet'))
B.add('body', limb('ankle_r', [(-2.6, -0.4, GZ + 0.8), (-2.4, -0.2, 7.0)], 1.6, tris=10, region='feet', n=6))
B.add('body', limb('leg_l', [(2.6, 1.0, 7.6), (4.4, 5.4, 6.4), (5.0, 8.2, 8.2)], [1.6, 1.4, 1.3], tris=14, region='feet', n=6))
fl = tk.loft('foot_l', [dict(c=(5.0, 8.4, 8.4), w=2.6, h=0.7), dict(c=(5.4, 10.4, 10.6), w=4.0, h=0.7)], n=6, up=(0, -1, 1), cap0='round', cap1='round')
B.add('body', low(fl, 'foot_l', 14, lo=1, hi=2, region='feet'))

# ------------------------------------------------------------------ the pear-shaped body: black back, the chef's jacket, apron skirt
BODY = [dict(c=(0, 0.6, 5.0), w=9.8, h=4.6), dict(c=(0, 0.4, 9.4), w=12.6, ht=5.8, hb=6.0), dict(c=(0, 0.2, 15.0), w=12.8, ht=6.0, hb=6.0),
        dict(c=(0, 0.0, 20.6), w=11.2, ht=5.2, hb=5.2), dict(c=(0, 0.0, 24.6), w=9.0, h=4.4)]


def jacket(C, N):
    return (N[:, 1] < -0.15) & (C[:, 2] > 12.4) & (C[:, 2] < 24.8)


B.add('body', low(tk.loft('body', BODY, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 170, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: -0.25 * np.exp(-((V[:, 0] - 1.6 + 0.12 * (V[:, 2] - 18)) / 0.3) ** 2) * (N[:, 1] < -0.3) * (V[:, 2] > 12.6)),
                  region=('back', [('jacket', jacket), ('belly', lambda C, N: N[:, 1] < -0.3)])))
apron = tk.loft('apron', [dict(c=(0, 0.2, 12.8), w=13.2, ht=6.3, hb=6.3), dict(c=(0, 0.4, 7.6), w=13.4, ht=6.4, hb=6.4)], n=14, up=(0, -1, 0),
                cap0=None, cap1=None)
tk.bisect(apron, (0, -1.0, 0), (0, 1, 0), keep='-', fill=False)
B.add('body', low(apron, 'apron', 30, lo=0, hi=2, region='apron'))
B.add('body', limb('kerchief', [(-3.8, -1.4, 24.6), (0, -4.6, 24.4), (3.8, -1.4, 24.6)], 1.2, tris=16, region='kerchief', n=6))
B.add('body', limb('kerchief_tip', [(0, -4.6, 24.4), (0.4, -5.4, 22.6), (0.6, -5.2, 21.2)], [1.2, 0.9, 0.2], tris=10, region='kerchief', n=5,
                   cap1='point'))

# ------------------------------------------------------------------ the head: round, the beak, the tall toque
NECK = (0, 0, 24.6)
head = tk.loft('head', [dict(c=(0, 2.4, 28.4), w=8.2, h=4.0), dict(c=(0, -0.2, 28.8), w=9.2, ht=4.4, hb=4.0), dict(c=(0, -3.0, 28.2), w=7.0, ht=3.0, hb=3.2)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.6)
HP = [low(head, 'head', 90, lo=1, hi=3, region=('back', [('face', lambda C, N: (N[:, 1] < -0.5) & (C[:, 2] < 29.6))]))]
HP.append(limb('beak', [(0, -4.6, 28.0), (0, -6.6, 27.6), (0, -8.2, 27.0)], [1.4, 0.9, 0.2], tris=12, region='beak', n=6, cap1='point', e=2.6))
toque = tk.lathe('toque', [(0, 0), (4.2, 0), (4.2, 1.6), (4.6, 2.6), (5.6, 4.6), (5.8, 7.0), (5.0, 8.6), (2.6, 9.4), (0, 9.6)], n=12, centre=(0, 0.6, 31.2))


def sc_toque(h):
    def f(V, N):  # the pleats
        return 0.35 * np.cos(np.arctan2(V[:, 0], V[:, 1] - 0.6) * 6.0) ** 4 * (V[:, 2] > 32.6)
    tk.push(h, f)


HP.append(low(toque, 'toque', 60, lo=1, hi=3, sculpt=sc_toque, region='toque'))
for a, b in HP[-1:]:
    for o in (a, b):
        tk.rotate(o, 8, 'Y', pivot=(0, 0.6, 31.2))
B.add('head', *HP)

# ------------------------------------------------------------------ the flippers: the pan out in front, tipped for the flip; the other flung up
SR, SL = V3(-5.4, -0.4, 21.6), V3(5.4, -0.4, 21.6)
FR = V3(-8.6, -6.6, 20.2)
B.add('arm_r', limb('flip_r', [SR, (-8.6, -3.0, 20.4), FR], [2.2, 1.8, 0.8], tris=22, region='back', n=8, cap1='point',
                    sculpt=lambda h: tk.scale(h, (1, 1, 1))))
PC = V3(-7.6, -14.4, 21.4)
B.add('arm_r', limb('handle', [FR + (0.2, -0.6, 0.0), PC + (0.2, 3.8, -0.6)], [0.75, 0.7], tris=10, region='handle', n=6))
pan = tk.lathe('pan', [(0, 0), (4.0, 0), (4.6, 0.4), (4.9, 1.6), (4.4, 1.7), (3.9, 0.7), (0, 0.6)], n=14, centre=(0, 0, 0))
tk.rotate(pan, -14, 'X')
tk.move(pan, tuple(PC))
B.add('arm_r', low(pan, 'pan', 50, lo=0, hi=2, region='iron'))
B.add('arm_l', limb('flip_l', [SL, (10.2, 0.0, 25.0), (13.6, 0.6, 29.4)], [2.2, 1.8, 0.8], tris=22, region='back', n=8, cap1='point'))

# ------------------------------------------------------------------ the ghost fish lying in the pan
FC = PC + (0, 0, 1.8)
fish = tk.loft('fish', [dict(c=tuple(FC + (0, 3.0, 0)), w=0.6, h=0.4), dict(c=tuple(FC + (0, 1.4, 0)), w=1.8, h=1.4),
                        dict(c=tuple(FC + (0, -0.8, 0)), w=2.0, h=1.6), dict(c=tuple(FC + (0, -2.6, 0)), w=1.2, h=1.0)], n=8, up=(0, 0, 1),
               cap0='round', cap1='round')
tail = tk.slab('fish_tail', [(-1.6, 0.0), (0.0, -1.6), (1.6, 0.0), (0.0, -0.6)], 0.4, plane='XY', at=0.0, bevel=0.15, segs=1)
tk.move(tail, tuple(FC + (0, 4.4, 0)))
tk.rotate(tail, 180, 'Z', pivot=tuple(FC + (0, 3.8, 0)))
fp = [low(fish, 'fish', 30, lo=1, hi=2, region='spirit'), low(tail, 'fish_tail', 10, lo=0, hi=1, region='spirit')]
for a, b in fp:
    for o in (a, b):
        tk.rotate(o, 90, 'Z', pivot=tuple(FC))
        tk.rotate(o, -14, 'X', pivot=tuple(PC))
B.add('fish', *fp)
B.commit(F, kinds={'fish': 'glass'}, uvw={'fish': 1.6})


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    R.bone('fish', tuple(FC), parent='arm_r')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'fish']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # the pan dips and snaps up; the fish leaps, somersaults, and is caught
        k('arm_r', 6, rot=('X', 8))
        k('arm_r', 12, rot=('X', -12), ease='BACK')
        k('arm_r', 22)
        k('arm_r', 38, rot=('X', 6))
        k('arm_r', 44)
        k('fish', 10)
        k('fish', 22, move=(0, 1.0, 13.0), rot=('X', 170), scale=1.6, ease=('QUAD', 'EASE_OUT'))
        k('fish', 34, move=(0, 0.2, 4.0), rot=('X', 340), scale=1.3, ease=('QUAD', 'EASE_IN'))
        k('fish', 38, rot=('X', 360))
        k('fish', 39)
        for i, f in enumerate((42, 46, 50, 54)):
            k('fish', f, move=(0, 0, 0.5 if i % 2 == 0 else 0.0), ease='LINEAR')
        k('fish', 58)
        k('head', 8)
        k('head', 20, rot=('X', -14))
        k('head', 36, rot=('X', 4))
        k('head', 46)
        k('body', 10)
        k('body', 20, rot=('Y', -4))
        k('body', 40)
        k('arm_l', 10)
        k('arm_l', 20, rot=('Y', 14), ease='BACK')
        k('arm_l', 44)
        for b in allb:
            k(b, 66)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stone', pt.ramp('#8c8a84', 7, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('stone') & (np.abs(np.mod(X + 0.5 * np.floor(Yc / 2.6) * 2.6, 3.4) - 1.7) < 1.45) & (np.abs(np.mod(Yc, 2.6) - 1.3) < 1.1) & (P.on[:, :, 2] > 0.5),
           pt.ramp('#9c968a', 7, shift=0.05), tone=sh, base=0.05)
    P.fill('back', pt.ramp('#262a3a', 7, shift=0.07, light=0.55), tone=sh, base=0.1)
    P.fill('belly', pt.ramp('#efeae0', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('face', pt.ramp('#efeae0', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('jacket', pt.ramp('#f4f1ea', 6, shift=0.03), tone=sh, base=0.15)
    jk = P.region('jacket')
    for z in (15.0, 18.0, 21.0):
        for x in (-1.0, 3.4):
            P.flat(jk & (np.hypot(X - x, Z - z) < 0.5) & (Yc < -3), '#2a2a30')
    P.fill('apron', pt.ramp('#2c3a5e', 6, shift=0.06), tone=sh, base=0.05)
    P.tint(P.region('apron') & (np.abs(np.mod(X, 1.8) - 0.9) < 0.1), pt.ramp('#c8cde0', 5), sh)
    P.fill('kerchief', pt.ramp('#c8343a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('toque', pt.ramp('#f4f1ea', 6, shift=0.03), tone=sh, base=0.2)
    P.fill('beak', pt.ramp('#2a2426', 5, light=0.6), tone=sh, base=0.2)
    P.fill(P.region('beak') & (Z < 27.2), pt.ramp('#e08a3a', 5), tone=sh, base=0.2)
    P.fill('feet', pt.ramp('#e3913e', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('iron', pt.ramp('#2c2c30', 6, shift=0.05, light=0.6), tone=sh, base=0.2, brush='metal')
    P.fill('handle', pt.ramp('#7a4a2a', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'wood', 'flow': 'along', 'axis': (0.1, -1, 0.1), 'L': 5})
    # the face: proud closed-eye arcs, a pink blush
    fc = face.Face(P, c=(0, -4.2, 29.8), axis=(0, -1, 0.1), where=P.region('face') | P.region('back'), seed=981)
    fc.eyes('happy', spread=4.4, size=0.62, dy=-0.5)  # (on the white face, under the navy cap of the head: dark ink reads there)
    fc.blush(5.8, -1.7, rx=1.1, ry=0.6)
    ghost(P, pt, 'spirit', '#7ec4e6', sh)
    P.lines(['jacket', 'apron', 'kerchief', 'toque'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=66, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('fish', 'arm_r'), ('fish', 'body'), ('arm_l', 'head')],
    fold=(0, 14, 22, 30))
