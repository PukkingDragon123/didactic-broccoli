"""あわガニ Lather Crab: a crab at the washing tap on a little wooden stool (series sento, concepts_D.md). Behind him the
tiled tap wall with its ledge, the hot and cold taps and a mirror; a yellow basin by his feet; on his head a heap of
foam he blew himself (crabs blow bubbles).

Gimmick: the claws scrub, the foam heap swells up big and the eye-stalks pop up out of it.

    tools/blender.sh art/blender/toys/sento/kani.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yu as yu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('sento', 'kani')
H = yu.H
ST = H + 3.6                  # the stool's top
C0 = (0.0, -0.6, ST + 3.4)    # the carapace's centre
FC = (0.0, 0.0, C0[2] + 3.0)  # the foam heap's foot
low = yu.low

# ------------------------------------------------------------------ floor, tap wall, ledge, taps, mirror, stool, basin
base_lo, base_hi = yu.floor(F)
PB = [yu.box('wall', (30.0, 3.0, 14.0), (0, 9.6, H + 7.0), 'walltile', bevel=0.4),
      yu.box('ledge', (28.0, 4.0, 1.0), (0, 7.4, H + 5.6), 'ledge', bevel=0.35),
      yu.box('mirror', (10.0, 0.8, 4.4), (0, 7.9, H + 11.0), 'mirror', bevel=0.3),
      yu.box('seat', (8.4, 6.2, 1.1), (0, -0.4, ST - 0.55), 'stool', bevel=0.35)]
for sx in (1, -1):
    PB.append(yu.box('sleg', (1.1, 5.6, ST - H - 1.1), (sx * 3.0, -0.4, H + (ST - H - 1.1) / 2), 'stool', bevel=0.25))
    tx = sx * 4.6
    PB.append(yu.rod('pipe', 0.55, 7.8, 5.0, (tx, H + 8.2), 'Y', 'chrome', n=8))
    PB.append(yu.rod('spout', 0.5, H + 8.2, H + 7.0, (tx, 5.0), 'Z', 'chrome', n=8))
    PB.append(yu.rod('cap_' + ('red' if sx > 0 else 'blue'), 1.0, H + 8.8, H + 9.8, (tx, 6.2), 'Z', 'red' if sx > 0 else 'blue', n=10))
PB.append(yu.basin('basin', (10.4, -7.4, H), r=3.8))
for lo_, hi_ in PB:
    base_lo.append(lo_)
    base_hi.append(hi_)

# ------------------------------------------------------------------ the crab: carapace, eight walking legs
cara = tk.lathe('cara', [(0, -2.0), (5.0, -1.9), (7.0, -0.7), (7.3, 0.5), (5.8, 1.9), (3.2, 2.7), (0, 2.9)], n=16, centre=C0)
tk.scale(cara, (1.0, 0.74, 1.0), pivot=C0)


def sc_cara(h):
    def f(V, N):  # a serrated front edge and two grooves across the back
        a = np.arctan2(V[:, 1] - C0[1], V[:, 0])
        rim = np.exp(-((V[:, 2] - C0[2] - 0.3) / 0.5) ** 2)
        teeth = 0.35 * rim * (np.abs(np.sin(a * 9)) ** 3) * (V[:, 1] < C0[1])
        groove = -0.25 * (np.abs(np.abs(V[:, 0]) - 2.6) < 0.25) * (V[:, 2] > C0[2] + 1.2)
        return teeth + groove
    tk.push(h, f)


body_lo, body_hi = low(cara, 'cara', 180, sculpt=sc_cara, region=('shell', [('under', lambda C, N: N[:, 2] < -0.35)]))
BODY = [(body_lo, body_hi)]
for sx in (1, -1):
    for i in range(4):
        y0 = C0[1] - 1.8 + i * 1.5
        hip = (sx * 5.8, y0, C0[2] - 0.6)
        knee = (sx * 9.4, y0 + (i - 1.5) * 0.9, C0[2] + 1.2)
        foot = (sx * 11.0, y0 + (i - 1.5) * 1.6, H + 0.3)
        lg = tk.tube('leg', [hip, knee, foot], [0.95, 0.8, 0.35], n=6, cap1='point')
        BODY.append(low(lg, 'leg', 22, lo=1, hi=1, region='shell'))
ARMS = {}
for nm, sx in (('claw_l', 1), ('claw_r', -1)):
    sh_ = (sx * 5.0, C0[1] - 3.0, C0[2] + 0.2)
    el = (sx * 8.2, C0[1] - 4.0, C0[2] + 2.6)
    wr = (sx * 7.4, C0[1] - 2.8, C0[2] + 6.0)
    arm = tk.tube(nm, [sh_, el, wr], [1.3, 1.2, 1.1], n=8)
    palm = tk.loft('palm', [{'c': wr, 'w': 3.0, 'h': 1.4, 'e': 2.2}, {'c': (sx * 6.8, C0[1] - 2.2, C0[2] + 8.2), 'w': 3.4, 'h': 1.7, 'e': 2.3},
                            {'c': (sx * 6.2, C0[1] - 1.8, C0[2] + 9.6), 'w': 2.6, 'h': 1.3, 'e': 2.2}], n=10, up=(0, 1, 0))
    f1 = tk.tube('finger', [(sx * 5.6, C0[1] - 1.8, C0[2] + 9.6), (sx * 4.2, C0[1] - 1.4, C0[2] + 10.6), (sx * 3.2, C0[1] - 1.2, C0[2] + 10.2)], [0.8, 0.6, 0.2], n=6, cap1='point')
    f2 = tk.tube('finger', [(sx * 5.8, C0[1] - 2.0, C0[2] + 8.6), (sx * 4.4, C0[1] - 1.8, C0[2] + 8.6), (sx * 3.6, C0[1] - 1.6, C0[2] + 8.0)], [0.7, 0.5, 0.2], n=6, cap1='point')
    ARMS[nm] = ([low(arm, nm, 40, region='shell'), low(palm, 'palm', 50, region='shell'),
                 low(f1, 'finger', 20, lo=1, hi=1, region='tip'), low(f2, 'finger', 18, lo=1, hi=1, region='tip')], sh_)

# ------------------------------------------------------------------ the foam heap and the eye-stalks poking out of it
foam = tk.lathe('foam', [(0, 0.0), (5.6, 0.2), (6.2, 1.6), (5.4, 3.4), (3.6, 4.8), (1.6, 5.6), (0, 5.8)], n=16, centre=FC)


def sc_foam(h):
    def f(V, N):  # suds: lumps of bubbles
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        return 0.55 * (np.abs(np.sin(x * 1.3 + 0.7) * np.sin(y * 1.2) * np.sin(z * 1.4 + 1.1)) ** 0.7) - 0.25
    tk.push(h, f)


foam_lo, foam_hi = low(foam, 'foam', 150, lo=1, hi=3, sculpt=sc_foam, region='foam')
EYES = []
for sx in (1, -1):
    st = tk.tube('stalk', [(sx * 1.8, C0[1] - 3.2, C0[2] + 1.6), (sx * 2.0, C0[1] - 4.2, C0[2] + 3.8), (sx * 2.3, C0[1] - 4.6, C0[2] + 5.4)], [0.7, 0.6, 0.55], n=6, cap1=None)
    bulb = tk.lathe('bulb', [(0, -1.0), (0.9, -0.6), (1.05, 0.2), (0.8, 0.9), (0, 1.1)], n=8, centre=(sx * 2.3, C0[1] - 4.6, C0[2] + 6.2))
    EYES += [low(st, 'stalk', 20, lo=1, hi=1, region='shell'), low(bulb, 'bulb', 26, lo=1, hi=1, region='bulb')]

# ------------------------------------------------------------------ the crab is scaled up about its seat (KS)
KS, PV = 1.22, np.array((0.0, -0.4, ST))


def S(p):
    return tuple(PV + KS * (np.asarray(p, float) - PV))


for o in [b for pr in BODY + EYES + [(foam_lo, foam_hi)] + [q for pp, _ in ARMS.values() for q in pp] for b in pr]:
    tk.scale(o, KS, pivot=tuple(PV))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('body', tk.join([b[0] for b in BODY], 'body'), [b[1] for b in BODY], bone='body')
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('eyes', tk.join([e[0] for e in EYES], 'eyes'), [e[1] for e in EYES], bone='eyes')
F.part('foam', foam_lo, [foam_hi], bone='foam', kind='gloss')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', S((0, C0[1], ST)), parent='root')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, S(sh_), parent='body')
    R.bone('eyes', S((0, C0[1] - 3.4, C0[2] + 1.6)), parent='body')
    R.bone('foam', S(FC), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'claw_l', 'claw_r', 'eyes', 'foam']
    k = R.key
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 4-40 the claws scrub turn about (the body sways); 12-36 the foam swells; 36-42 the eyes pop up; 70 back
        for i, f in enumerate(range(4, 44, 4)):
            for nm, sx in (('claw_l', 1), ('claw_r', -1)):
                up = (i + (sx > 0)) % 2
                k(nm, f, rot=[('X', 14 if up else -10), ('Y', sx * (6 if up else -4))], ease='LINEAR')
            k('body', f, rot=('Z', 4 if i % 2 else -4), ease='LINEAR')
        for nm in ('claw_l', 'claw_r'):
            k(nm, 48)
        k('body', 46)
        k('foam', 10)
        k('foam', 36, scale=1.5, ease='BACK')
        k('foam', 58, scale=1.5)
        k('foam', 70)
        k('eyes', 34)
        k('eyes', 40, move=(0, -0.8, 4.4), ease='BACK')
        k('eyes', 58, move=(0, -0.8, 4.4))
        k('eyes', 68)
        for b in allb:
            k(b, 72)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    yu.paint_floor(P, pt, sh)
    # the tap wall: pale-blue square tiles, white grout; a white ledge
    P.fill('walltile', pt.ramp('#b9d3e0', 6, shift=0.05), tone=sh, base=0.15, brush='gloss')
    wt = P.region('walltile')
    T = 3.0
    P.fill(wt & ((np.abs(np.mod(X, T) - T / 2) > T / 2 - 0.2) | (np.abs(np.mod(Z - H, T) - T / 2) > T / 2 - 0.2)), pt.ramp('#e8ece8', 4), tone=sh, base=0.1, brush=False)
    P.fill('ledge', pt.ramp('#eceee8', 5, shift=0.04), tone=sh, base=0.2, brush='gloss')
    P.fill('mirror', pt.ramp('#9fb4bc', 6, shift=0.04, light=0.6), tone=sh, base=0.2, brush={'preset': 'gloss', 'flow': 'along', 'axis': (1, 0, 1)})
    P.fill(P.region('mirror') & (np.abs(np.mod(X + Z * 0.8, 6.0) - 3.0) < 0.5), pt.ramp('#e6eef0', 4), tone=sh, base=0.3, brush=False)
    P.fill('chrome', pt.ramp('#c3c8ce', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.5, base=0.05)
    P.fill('red', pt.ramp('#c8302a', 5, shift=0.06), tone=sh, base=0.1, brush='gloss')
    P.fill('blue', pt.ramp('#2a5ab0', 5, shift=0.06), tone=sh, base=0.1, brush='gloss')
    yu.paint_wood(P, pt, sh, 'stool', '#c89a60')
    yu.paint_basin(P, pt, sh)
    # the crab: a red-orange shell, paler underneath, dark claw tips; white suds with blue-grey shade
    P.fill('shell', pt.ramp('#c84a2a', 7, shift=0.08), tone=sh, base=0.1)
    who, d = P.dabs(P.region('shell'), size=0.8, spacing=1.5, seed=3)
    P.shift(P.region('shell') & (who >= 0) & (d < 0.45) & (Z > S(C0)[2]), 1)
    P.fill('under', pt.ramp('#e89a6a', 6, shift=0.06), tone=sh, base=0.15)
    P.fill('tip', pt.ramp('#3a2a26', 5, shift=0.05), tone=sh, base=0.1)
    P.fill('bulb', pt.ramp('#d8644a', 5, shift=0.05), tone=sh, base=0.15)
    P.fill('foam', pt.ramp('#f2f4f0', 6, shift=0.03, dark=0.4), tone=sh, base=0.25, brush={'preset': 'gloss', 'flow': 'around', 'L': 1.6})
    fw, fd = P.dabs(P.region('foam'), size=0.9, spacing=1.1, seed=9)
    P.fill(P.region('foam') & (fw >= 0) & (fd > 0.8), pt.ramp('#b8cad4', 4), tone=sh, base=0.1, brush=False)   # bubble rims
    # the face: ink dots on the eye bulbs, a small w mouth on the shell's front edge
    eb = P.region('bulb')
    for sx in (1, -1):
        fe = face.Face(P, c=S((sx * 2.3, C0[1] - 5.6, C0[2] + 6.3)), axis=(0, -1, 0.05), where=eb, seed=520 + sx)
        fe.dot(0.0, 0.0, 0.6 if sx > 0 else 0.52)
    fm = face.Face(P, c=S((0, C0[1] - 5.4, C0[2] + 0.4)), axis=(0, -1, 0.1), where=P.region('shell') & (P.part == PI['body']), seed=523)
    fm.mouth('w', w=3.0, dy=0.0, weight=0.4)
    fm.blush(spread=6.0, dy=0.6, rx=1.2, ry=0.6, col='#f08a6a')
    P.lines(['shell'], ['under', 'tip'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 73), skip=[('claw_l', 'body'), ('claw_r', 'body'), ('eyes', 'body'), ('foam', 'body'),
                                                              ('eyes', 'foam'), ('claw_l', 'foam'), ('claw_r', 'foam')]),
    cams=[((46, -58, 40), (0, 0, 14)), ((-46, 52, 36), (0, 2, 14))], fold=(0, 20, 40, 56))
