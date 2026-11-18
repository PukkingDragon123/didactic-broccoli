"""孔雀の参謀 Peacock Counsel (series datesha, concepts_E.md): the gang's adviser, a peacock in a teal three-piece suit
printed with a little feather-eye motif, a gold waistcoat and a white cravat, his crest of plumes, leaning on a silver-
topped cane with a hand on his hip, his great train folded and leaning back behind him.
Gimmick (pose change): the train swings up and fans wide open behind him, he turns his head to you and lifts his chin;
then it folds away.

    GG_FACET=1 tools/blender.sh art/blender/toys/datesha/kujaku.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('datesha', 'kujaku')
B = Build()
GZ = 2.6
TP = V3(0, 4.4, 13.6)          # the train's root
NARROW, LEAN = 0.24, -42.0     # the folded train: squeezed to this width, leaning back this far

# ------------------------------------------------------------------ the plinth; scaly bird feet under the trouser cuffs
B.add('base', plinth(n=14))
for sx in (1, -1):
    B.add('body', limb('leg', [(sx * 2.4, 0.2, GZ + 2.0), (sx * 2.5, 0.4, 13.6)], [2.0, 2.6], tris=16, region='pants', n=8))
    for a in (-24, 0, 24):
        d = V3(math.sin(math.radians(a)) + sx * 0.1, -math.cos(math.radians(a)), 0)
        r0 = V3(sx * 2.4, -0.2, GZ + 0.7)
        B.add('body', limb('toe', [r0, r0 + d * 3.0, r0 + d * 4.0 + (0, 0, -0.3)], [0.7, 0.55, 0.15], tris=8, region='feet', n=5, cap1='point'))
    B.add('body', limb('shank', [(sx * 2.4, -0.2, GZ + 0.6), (sx * 2.4, 0.2, GZ + 2.4)], 0.8, tris=6, region='feet', n=5))

# ------------------------------------------------------------------ the body: jacket, gold waistcoat, cravat; the long blue neck
TORSO = [dict(c=(0, 0.6, 13.0), w=9.4, h=4.4), dict(c=(0, 0.2, 17.0), w=10.6, ht=5.2, hb=4.8), dict(c=(0, 0.0, 21.0), w=10.6, ht=4.8, hb=4.6),
         dict(c=(0, 0.0, 24.0), w=11.4, ht=4.0, hb=4.0, e=2.5), dict(c=(0, -0.2, 25.6), w=5.4, h=2.8)]


def vest(C, N):
    return (N[:, 1] < -0.4) & (np.abs(C[:, 0]) < 0.8 + 0.42 * (C[:, 2] - 14.6)) & (C[:, 2] > 14.6)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 170, lo=1, hi=3,
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.3 * (vest(V, N) == 0) * (N[:, 1] < -0.4) * (V[:, 2] > 14.6)),
                  region=('suit', [('cravat', lambda C, N: vest(C, N) & (C[:, 2] > 21.8)), ('vest', vest)])))
B.add('head', limb('neck', [(0, -0.4, 24.6), (0, -1.6, 28.0), (0, -2.0, 31.0)], [2.6, 1.9, 1.8], tris=16, region='blue', n=8))

# ------------------------------------------------------------------ the arms: one on the cane, one on his hip
SR, SL = V3(-5.8, 0.0, 23.2), V3(5.8, 0.0, 23.2)
WR = V3(-7.2, -6.8, 17.4)
B.add('body', limb('arm_r', [SR, (-8.4, -3.0, 19.0), WR], [2.2, 1.9, 1.5], tris=24, region='suit', n=8))
B.add('body', blob('hand_r', WR + (0, -0.8, 0.6), 1.3, tris=10, region='feet'))
CT = WR + (0, -1.2, 1.4)
B.add('body', limb('cane', [CT, (-8.6, -10.2, GZ + 0.2)], 0.45, tris=8, region='ebony', n=5))
B.add('body', blob('knob', CT + (0, 0, 0.6), 0.9, tris=10, region='silver'))
B.add('body', limb('arm_l', [SL, (9.6, 0.8, 19.6), (6.4, -1.6, 16.4)], [2.2, 1.9, 1.5], tris=24, region='suit', n=8))
B.add('body', blob('hand_l', (6.0, -1.8, 16.0), 1.3, tris=10, region='feet'))

# ------------------------------------------------------------------ the head: small, the beak, the crest of plumes
NECK = (0, -0.4, 25.0)
head = tk.loft('head', [dict(c=(0, 0.2, 32.6), w=4.4, h=2.4), dict(c=(0, -1.8, 32.6), w=4.8, ht=2.6, hb=2.2), dict(c=(0, -3.6, 32.2), w=3.2, h=1.6)],
               n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
HP = [low(head, 'head', 60, lo=1, hi=3, region='blue'),
      limb('beak', [(0, -4.6, 32.0), (0, -5.8, 31.6), (0, -6.6, 31.2)], [0.8, 0.5, 0.1], tris=8, region='beak', n=5, cap1='point')]
for i, a in enumerate((-26, -9, 9, 26)):
    t = V3(math.sin(math.radians(a)) * 2.4, -1.2 + 0.6 * abs(a) / 26, 37.2 - 0.6 * abs(a) / 26)
    HP.append(limb('crest', [(0, -1.4, 34.4), t], 0.18, tris=4, region='blue', n=3, cap0=None, cap1=None))
    HP.append(blob('plume', t + (0, 0, 0.4), 0.55, tris=8, region='plume', squash=(0.8, 0.5, 1.2), lo=0, hi=1))
B.add('head', *HP)

# ------------------------------------------------------------------ the train: a full fan, squeezed shut and leaning back behind him
pts = [(0.0, 0.0)] + [(17.0 * math.cos(math.radians(a)), 17.0 * math.sin(math.radians(a)) + (1.2 if 30 < a < 150 else 0.0) * math.sin(math.radians(a * 7)) ** 2)
                      for a in np.linspace(12, 168, 15)]
fan = tk.slab('fan', pts, 1.1, plane='XZ', at=0.0, bevel=0.4, segs=1)
tk.move(fan, tuple(TP))


def sc_fan(h):
    def f(V, N):  # the feather shafts radiating from the root
        a = np.arctan2(V[:, 2] - TP[2], V[:, 0] - TP[0])
        return -0.25 * (np.abs(np.sin(a * 14)) > 0.88)
    tk.push(h, f)


fp = low(fan, 'fan', 80, lo=1, hi=2, region='train', sculpt=sc_fan)
for o in fp:
    tk.scale(o, (NARROW, 1, 1), pivot=tuple(TP))
    tk.rotate(o, LEAN, 'X', pivot=tuple(TP))
B.add('fan', fp)
B.commit(F, bones={'base': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pose change)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('fan', tuple(TP), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'fan']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # the train swings upright and fans open; he turns his head to you and lifts his chin
        k('fan', 6)
        k('fan', 14, rot=('X', -LEAN * 0.8), scale=(1.0 / NARROW * 0.4, 1, 1))
        k('fan', 22, rot=('X', -LEAN), scale=(1.0 / NARROW, 1, 1), ease='BACK')
        for i, f in enumerate((30, 38, 46, 54)):
            k('fan', f, rot=('X', -LEAN + (3 if i % 2 == 0 else 0)), scale=(1.0 / NARROW, 1, 1))     # the shiver of the train
        k('fan', 64, rot=('X', -LEAN), scale=(1.0 / NARROW, 1, 1))
        k('fan', 76)
        k('head', 10)
        k('head', 20, rot=[('Z', 32), ('X', -10)], ease='BACK')
        k('head', 64, rot=[('Z', 32), ('X', -10)])
        k('head', 74)
        k('body', 10)
        k('body', 20, rot=('Z', -10))
        k('body', 64, rot=('Z', -10))
        k('body', 74)
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('marble', pt.ramp('#e9e4da', 6, shift=0.04), tone=sh, base=0.1)
    mb = P.region('marble') & (P.on[:, :, 2] > 0.5)
    P.tint(mb & ((np.floor(X / 3.0) + np.floor(Yc / 3.0)) % 2 == 0), pt.ramp('#2a2a30', 6, shift=0.05), sh)
    TEAL = pt.ramp('#1f6a6a', 7, shift=0.07)
    P.fill('suit', TEAL, tone=sh, base=0.05)
    P.fill('pants', TEAL, tone=sh, base=0.0)
    who, d = P.dabs(P.region('suit') | P.region('pants'), size=0.45, spacing=2.4, seed=61)
    m = (P.region('suit') | P.region('pants')) & (who >= 0)
    P.tint(m & (d < 0.75), pt.ramp('#5aa8a0', 5), sh)                       # the little feather-eye print
    P.tint(m & (d < 0.35), pt.ramp('#d6a640', 5), sh)
    P.fill('vest', pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08), tone=sh, base=0.1)
    for z in (16.4, 18.2, 20.0):
        P.flat(P.region('vest') & (np.hypot(X, Z - z) < 0.4), '#2a2426')
    P.fill('cravat', pt.ramp('#f4f1ea', 6, shift=0.03), tone=sh, base=0.15)
    BLUE = pt.ramp('#2a52b8', 7, shift=0.08)
    P.fill('blue', BLUE, tone=sh, base=0.1, brush='feather')
    P.fill('plume', pt.ramp('#2a8a9a', 5), tone=sh, base=0.1)
    P.fill('beak', pt.ramp('#8a7a6a', 5), tone=sh, base=0.1)
    P.fill('feet', pt.ramp('#8a8a8e', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('ebony', pt.ramp('#26222a', 5, light=0.6), tone=sh, base=0.2, brush='gloss')
    P.fill('silver', pt.ramp('#c8ccd4', 6, light=0.6), tone=sh, base=0.3)
    # the train: green with rows of eye-spots, laid out where they will sit when the fan is open (rest -> open coords)
    tr = P.region('train')
    P.fill('train', pt.ramp('#3a7a3a', 7, shift=0.07), tone=sh, base=0.1, brush='feather')
    c, s_ = math.cos(math.radians(-LEAN)), math.sin(math.radians(-LEAN))
    y0, z0 = Yc - TP[1], Z - TP[2]
    zo = s_ * y0 + c * z0
    xo = (X - TP[0]) / NARROW
    r, a = np.hypot(xo, zo), np.arctan2(zo, xo)
    for k_, rr in enumerate((8.0, 12.4, 15.8)):
        aa = np.mod(a * (5 + 3 * k_) / math.pi + 0.5 * k_, 1.0) - 0.5
        dd = np.hypot(aa * rr * math.pi / (5 + 3 * k_) * 1.2, r - rr)
        P.tint(tr & (dd < 1.5), pt.ramp('#d6a640', 5), sh)
        P.tint(tr & (dd < 1.0), pt.ramp('#2a8a9a', 5), sh)
        P.tint(tr & (dd < 0.55), pt.ramp('#1a2a6a', 5), sh)
    # the face: a haughty side glance, a raised brow
    fc = face.Face(P, c=(0, -3.4, 33.4), axis=(0, -1, 0.1), where=P.region('blue') & (Z > 31), seed=1111, ink='#efe4c8')
    fc.eyes('side', spread=3.4, size=0.4, dy=0.2, look=1)
    fc.brows('raised', spread=3.6, dy=1.0, w=1.2, weight=0.25)
    P.lines(['suit', 'vest', 'cravat'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=84, skip=[('head', 'body'), ('fan', 'body'), ('body', 'base'), ('fan', 'base'), ('fan', 'head')], fold=(0, 14, 22, 50))
