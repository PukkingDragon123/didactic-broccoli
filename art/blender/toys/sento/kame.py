"""ばんだいガメ Bandai Tortoise: the old attendant of the bathhouse up on the bandai, the high wooden booth by the door
(series sento, concepts_D.md). He sits upright behind the booth's rail in a knitted belly-warmer, a coin tray at his
elbow and a stack of folded towels beside him.

Gimmick: he dozes off: the head and arms pull right into the shell, a snooze, then the head pops out and he holds a
towel out to you.

    tools/blender.sh art/blender/toys/sento/kame.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import _yu as yu  # noqa: E402
import tk  # noqa: E402
from fig import Fig, cli  # noqa: E402

tk.reset()
F = Fig('sento', 'kame')
H = yu.H
BT = H + 9.0                  # the booth's top (where he sits)
BC = (0.0, 3.6, BT)           # his seat
HC = (0.0, -1.6, BT + 18.6)   # the head's centre
NECK = (0.0, 2.4, BT + 13.6)


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


# ------------------------------------------------------------------ the floor section and the bandai booth
base_lo, base_hi = yu.floor(F)
bx = tk.rbox('booth_hi', (24.0, 14.0, 9.0), centre=(0, 3.4, H + 4.5), bevel=0.5, segs=2)
tk.push(bx, lambda V, N: -0.18 * (np.abs(np.mod(V[:, 0] + 1.75, 3.5) - 1.75) < 0.18) * (N[:, 1] < -0.7))   # front planks
tk.set_region(bx, 'booth')
base_hi.append(bx)
base_lo.append(tk.rbox('booth', (24.0, 14.0, 9.0), centre=(0, 3.4, H + 4.5), bevel=0.4, segs=1))
for nm, size, c in (('rail', (25.0, 2.2, 2.6), (0, -4.6, BT + 1.3)), ('sill', (25.4, 14.6, 1.0), (0, 3.4, BT - 0.2))):
    o = tk.rbox(nm + '_hi', size, centre=c, bevel=0.35, segs=2)
    tk.set_region(o, 'rail')
    base_hi.append(o)
    base_lo.append(tk.rbox(nm, size, centre=c, bevel=0.3, segs=1))
# the coin tray on the rail and the stack of folded towels on the booth
tray = tk.rbox('tray_hi', (4.6, 3.4, 0.8), centre=(9.0, -4.6, BT + 3.0), bevel=0.3, segs=2)
tk.push(tray, lambda V, N: -0.3 * (N[:, 2] > 0.7) * (np.abs(V[:, 0] - 9.0) < 1.8) * (np.abs(V[:, 1] + 4.6) < 1.2))
tk.set_region(tray, 'tray')
base_hi.append(tray)
base_lo.append(tk.rbox('tray', (4.6, 3.4, 0.8), centre=(9.0, -4.6, BT + 3.0), bevel=0.25, segs=1))
for i in range(3):
    z = BT + 0.8 + i * 1.5
    o = tk.rbox('towel_hi', (4.6 - 0.2 * i, 4.2, 1.4), centre=(-9.6 + 0.2 * (i % 2), 6.4, z), bevel=0.55, segs=2)
    tk.set_region(o, 'towel')
    base_hi.append(o)
    base_lo.append(tk.rbox('towel', (4.6 - 0.2 * i, 4.2, 1.4), centre=(-9.6 + 0.2 * (i % 2), 6.4, z), bevel=0.4, segs=1))

# ------------------------------------------------------------------ the tortoise: an upright body, the domed shell on its back
body = tk.loft('body', [{'c': (0, 3.2, BT + 0.4), 'w': 12.4, 'h': 4.6, 'e': 2.2},
                        {'c': (0, 2.6, BT + 5.0), 'w': 15.4, 'h': 5.2, 'e': 2.3},
                        {'c': (0, 2.4, BT + 10.0), 'w': 14.0, 'h': 4.8, 'e': 2.3},
                        {'c': (0, 2.6, BT + 13.8), 'w': 8.6, 'h': 3.6, 'e': 2.2}], n=16, up=(0, -1, 0), cap0='round', cap1='round', capd=1.2)
body_lo, body_hi = low(body, 'body', 170, region=('skin', [('knit', lambda C, N: (N[:, 1] < -0.35) & (C[:, 2] > BT + 1.4) & (C[:, 2] < BT + 11.4))]))
SC = (0.0, 5.4, BT + 8.4)
shell = tk.lathe('shell', [(0, -0.6), (8.4, -0.6), (9.4, 0.5), (9.2, 3.2), (7.8, 6.4), (4.8, 8.6), (0, 9.4)], n=18, axis='Y', centre=SC)
tk.scale(shell, (1.0, 1.0, 1.25), pivot=SC)


def sc_shell(h):
    def f(V, N):  # the scutes: a central row and the side rows, grooved; a rim groove round the edge
        x, z = V[:, 0], V[:, 2] - SC[2]
        g = (np.abs(np.abs(x) - 2.5) < 0.22) | ((np.abs(np.mod(z + 1.6, 4.2) - 2.1) < 0.2) & (V[:, 1] > SC[1] + 1.4))
        g |= (np.abs(np.abs(x) - 6.6) < 0.22) & (V[:, 1] > SC[1] + 0.6)
        rim = np.abs(V[:, 1] - SC[1] - 0.6) < 0.25
        return -0.32 * (g | rim) + 0.15 * (V[:, 1] > SC[1] + 1.4)
    tk.push(h, f)


shell_lo, shell_hi = low(shell, 'shell', 200, sculpt=sc_shell, region='shell')
LEGS = []
for sx in (1, -1):   # the hind legs, folded forward on the seat
    lg = tk.tube('leg', [(sx * 5.0, 1.6, BT + 2.0), (sx * 6.0, -1.8, BT + 1.8), (sx * 6.2, -3.0, BT + 2.0)], [3.0, 2.7, 2.4], n=8)
    LEGS.append(low(lg, 'leg', 36, region='skin'))
ARMS = {}
for nm, sx in (('arm_l', 1), ('arm_r', -1)):
    sh_ = (sx * 6.4, 2.2, BT + 11.0)
    a = tk.tube(nm, [sh_, (sx * 8.4, 0.2, BT + 7.0), (sx * 6.6, -3.6, BT + 4.6)], [2.8, 2.5, 2.3], n=8)
    pp = [low(a, nm, 44, region='skin')]
    for k in range(3):   # three blunt claws
        cl = tk.tube('claw', [(sx * (6.6 + (k - 1) * 1.1), -5.0, BT + 4.4), (sx * (6.7 + (k - 1) * 1.2), -6.0, BT + 3.9)], [0.55, 0.3], n=5, cap1='point')
        pp.append(low(cl, 'claw', 10, lo=0, hi=1, region='claw'))
    if sx < 0:   # the right hand keeps a folded towel ready
        tw = tk.rbox('htowel_hi', (3.6, 1.6, 2.8), centre=(sx * 4.6, -5.0, BT + 5.4), bevel=0.5, segs=2)
        tk.rotate(tw, 18, 'Z', pivot=(sx * 4.6, -5.0, BT + 5.4))
        tk.set_region(tw, 'towel')
        tl = tk.rbox('htowel', (3.6, 1.6, 2.8), centre=(sx * 4.6, -5.0, BT + 5.4), bevel=0.35, segs=1)
        tk.rotate(tl, 18, 'Z', pivot=(sx * 4.6, -5.0, BT + 5.4))
        pp.append((tl, tw))
    ARMS[nm] = (pp, sh_)

# ------------------------------------------------------------------ the head on its wrinkly neck
neck = tk.tube('neck', [NECK, (0, 1.2, BT + 15.8), (0, 0.2, HC[2] - 1.0)], [3.2, 2.9, 2.7], n=10)
neck_lo, neck_hi = low(neck, 'neck', 50, region='skin',
                       sculpt=lambda h: tk.push(h, lambda V, N: 0.16 * np.sin(V[:, 2] * 4.6)))
head = tk.loft('head', [{'c': (0, HC[1] + 3.0, HC[2] - 0.2), 'w': 6.0, 'h': 2.8, 'e': 2.2},
                        {'c': (0, HC[1] + 0.6, HC[2] + 0.3), 'w': 7.6, 'h': 3.6, 'e': 2.3},
                        {'c': (0, HC[1] - 2.0, HC[2]), 'w': 7.0, 'h': 3.3, 'e': 2.4},
                        {'c': (0, HC[1] - 4.0, HC[2] - 0.6), 'w': 4.8, 'h': 2.3, 'e': 2.3}], n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=0.9)
head_lo, head_hi = low(head, 'head', 120, region=('skin', [('beak', lambda C, N: (C[:, 1] < HC[1] - 3.2) & (C[:, 2] < HC[2] - 0.6))]))

# ------------------------------------------------------------------ parts
F.part('base', tk.join(base_lo, 'base'), base_hi, bone='root')
F.part('body', tk.join([body_lo, shell_lo] + [l[0] for l in LEGS], 'body'), [body_hi, shell_hi] + [l[1] for l in LEGS], bone='body')
for nm, (pp, sh_) in ARMS.items():
    F.part(nm, tk.join([p_[0] for p_ in pp], nm), [p_[1] for p_ in pp], bone=nm)
F.part('head', tk.join([neck_lo, head_lo], 'head'), [neck_hi, head_hi], bone='head')


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', BC, parent='root')
    for nm, (pp, sh_) in ARMS.items():
        R.bone(nm, sh_, parent='body')
    R.bone('head', NECK, parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    allb = ['root', 'body', 'arm_l', 'arm_r', 'head']
    k = R.key
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # 6-16 head and arms pull into the shell; 16-46 a doze (the shell rises and falls); 46-52 the head pops out;
        # 52-60 the towel held out to you; 84 back to rest
        k('head', 6)
        k('head', 16, move=(0, 5.0, -5.0), scale=0.72)
        k('head', 46, move=(0, 5.0, -5.0), scale=0.72)
        k('head', 52, move=(0, -0.8, 0.6), ease='BACK')
        k('head', 58, rot=('X', -8))
        k('head', 76, rot=('X', -8))
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 8)
            k(nm, 18, move=(-sx * 1.6, 3.0, 0.4), rot=('X', 30), scale=0.8)
            k(nm, 46, move=(-sx * 1.6, 3.0, 0.4), rot=('X', 30), scale=0.8)
        k('arm_l', 54)
        k('arm_r', 54, rot=('X', -40), ease='BACK')
        k('arm_r', 76, rot=('X', -40))
        k('body', 16)
        for i, f in enumerate(range(22, 46, 6)):
            k('body', f, scale=(1.0, 1.0, 1.03 if i % 2 == 0 else 1.0))
        k('body', 48)
        for b in allb:
            k(b, 86)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    PI = {p.name: i for i, p in enumerate(F.parts)}
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    yu.paint_floor(P, pt, sh)
    yu.paint_wood(P, pt, sh, 'booth', '#8a5a34', axis=(0, 0, 1))
    yu.paint_wood(P, pt, sh, 'rail', '#b07a46')
    P.fill('tray', pt.ramp('#8c2a26', 5, shift=0.05), tone=sh, base=0.05, brush='lacquer')     # a red lacquer coin tray
    tr = P.region('tray') & (P.on[:, :, 2] > 0.7) & (np.hypot(np.mod(X - 7.4, 1.3) - 0.65, np.mod(Y + 3.8, 1.3) - 0.65) < 0.45)
    P.fill(tr, pt.ramp('#c8b070', 4, shift=0.04), tone=sh, base=0.2, brush=False)               # a few coins
    P.fill('towel', pt.ramp('#f1ede2', 6, shift=0.04), tone=sh, base=0.15, brush='cloth')
    tw = P.region('towel')
    P.fill(tw & (np.abs(np.mod(Z * 1.0, 1.4) - 0.7) < 0.18) & (P.on[:, :, 2] < 0.5), pt.ramp('#5a86c0', 4), tone=sh, base=0.1)  # blue stripe
    SKIN = pt.ramp('#8a9466', 7, shift=0.07)
    P.fill('skin', SKIN, tone=sh, base=0.05, brush='pvc')
    who, d = P.dabs(P.region('skin'), size=0.9, spacing=1.2)
    P.shift(P.region('skin') & (who >= 0) & (d > 0.75), -1)       # pebbly old skin
    P.fill('claw', pt.ramp('#e8dcc0', 4), tone=sh, base=0.15)
    P.fill('beak', pt.ramp('#a8a070', 6, shift=0.06), tone=sh, base=0.1)
    # the shell: dark olive scutes with lighter growth rings towards each scute's centre
    P.fill('shell', pt.ramp('#5a4a2a', 7, shift=0.08), tone=sh, base=0.1, brush={'preset': 'lacquer', 'flow': 'around'})
    sr = P.region('shell')
    cu = np.abs(np.mod(Z - SC[2] + 1.6, 4.2) - 2.1)
    ring = (np.minimum(np.abs(np.abs(X) - 1.25), np.abs(np.abs(X) - 4.25)) < 0.55) & (cu < 1.0) & (Y > SC[1] + 1.6)
    P.fill(sr & ring, pt.ramp('#8a7240', 6, shift=0.06), tone=sh, base=0.1)
    P.fill(sr & (P.cav > 0.58), pt.ramp('#2e2616', 4), tone=sh, base=0.0, brush=False)
    # the knitted haramaki: camel rib knit, a darker band top and bottom
    P.fill('knit', pt.ramp('#c8964e', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'cloth', 'flow': 'down'})
    kn = P.region('knit')
    P.shift(kn & (np.abs(np.mod(X, 0.9) - 0.45) < 0.14), -1)
    P.fill(kn & ((np.abs(Z - BT - 1.8) < 0.6) | (np.abs(Z - BT - 10.0) < 0.6)), pt.ramp('#7a4a2a', 5), tone=sh, base=0.05)
    # the face: a sleepy old fellow: small uneven dots set wide, heavy lids, a long flat beak-line with a little upturn
    hd = (P.region('skin') | P.region('beak')) & (P.part == PI['head'])
    fc = face.Face(P, c=(0, HC[1] - 4.0, HC[2] + 0.5), axis=(0, -1, 0.12), where=hd, seed=511)
    fc.eyes('dot', spread=5.0, size=0.5, dy=0.8, uneven=0.25)
    fc.brows('worried', spread=5.2, dy=1.9, w=1.4, weight=0.32)
    fc.mouth('upturn', w=4.2, dy=-1.1, weight=0.38)
    fc.blush(spread=5.6, dy=-0.4, rx=1.0, ry=0.55, col='#c89070')
    P.lines(['shell'], ['skin', 'knit'], step=1)
    P.lines(['knit'], ['skin'], step=1)
    P.clusters()
    return P.done()


cli(F, make_rig, paint, clip=dict(frames=range(1, 87), skip=[('head', 'body'), ('arm_l', 'body'), ('arm_r', 'body'), ('arm_r', 'base'),
                                                              ('arm_l', 'base')]),
    cams=[((46, -58, 44), (0, 0, 18)), ((-46, 52, 40), (0, 2, 18))], fold=(0, 16, 50, 60))
