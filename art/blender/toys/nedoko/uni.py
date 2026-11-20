"""うにハリネズミ Gold-Leaf Urchin Hedgehog, the secret of series nedoko (Sushi Bedtime, concepts_F.md): the dearest
plate on the belt. A hedgehog curled up asleep in a round gunkan-maki cup, its spines the plump golden tongues of sea
urchin roe laid in a star round its back, only its pointed snout and two pink paws out at the front, a flake of gold
leaf stuck on its nose; gold leaf on the nori too, on a gold kaiten plate.
Gimmick: it uncurls, its head comes up and out and it sniffs, sniff, sniff, then curls back up.

    tools/blender.sh art/blender/toys/nedoko/uni.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _futon import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('nedoko', 'uni')
B = Build()
plate(B)
GR, GH = 8.6, 7.4
rice_bed(B, L=11.8, W=11.8, H=4.6, cy=0.0, seed=17, tris=100)
TZ = PZ + 4.6

# ------------------------------------------------------------------ the gunkan cup: a round band of nori
loop = [(GR * math.cos(a), GR * math.sin(a), PZ + GH / 2) for a in np.linspace(0, 2 * math.pi, 28, endpoint=False)]
wall = tk.loft('wall', [dict(c=p, w=0.7, h=GH / 2, e=5.0) for p in loop], n=8, up=(0, 0, 1), closed=True, spine=np.array(loop))
B.add('bed', low(wall, 'wall', 230, lo=1, hi=2, region='nori',
                 sculpt=lambda h: tk.push(h, lambda V, N: 0.06 * np.sin(V[:, 2] * 4.0 + np.arctan2(V[:, 1], V[:, 0]) * 9))))

# ------------------------------------------------------------------ the hedgehog: a curled ball, urchin-roe spines, the snout tucked in front
BC = V3(0, 0.8, TZ + 4.2)
ball = tk.lathe('body', [(0, -1), (0.8, -0.85), (1.0, -0.2), (0.95, 0.45), (0.7, 0.85), (0, 1.0)], n=14)
tk.scale(ball, (6.6, 6.8, 4.8))
tk.move(ball, tuple(BC))
B.add('body', low(ball, 'body', 200, lo=1, hi=3, region=('belly', [('skin', lambda C, N: (N[:, 2] > -0.1) & ~((N[:, 1] < -0.55) & (N[:, 2] < 0.5)))])))
rng = np.random.default_rng(23)
for ring, (el, n) in enumerate(((78, 1), (56, 7), (34, 11), (12, 13))):     # tongues laid in rings from the crown down
    for i in range(n):
        az = 2 * math.pi * (i + 0.5 * ring) / n + rng.uniform(-0.12, 0.12)
        e = math.radians(el + rng.uniform(-4, 4))
        d = np.array((math.cos(e) * math.sin(az), math.cos(e) * math.cos(az), math.sin(e)))
        if d[1] < -0.6 and el < 40:
            continue                                                              # (leave the face clear)
        p0 = BC + d * np.array((6.4, 6.6, 4.6))
        t = np.cross(d, (0, 0, 1)) if el < 85 else np.array((1.0, 0, 0))
        t = np.cross(t, d)
        t = t / (np.linalg.norm(t) + 1e-9) * (1 if el < 85 else 0)
        L = 3.0 if el < 85 else 1.6
        pts = [p0 - d * 0.2 + t * 0.8, p0 + d * 0.35 - t * 0.8, p0 + d * 0.15 - t * L]
        B.add('body', limb('lobe', pts, [0.8, 1.15, 0.7], tris=14, region='uni', n=6, cap1='round',
                           sculpt=lambda h: tk.push(h, lambda V, N: 0.08 * np.sin(V[:, 0] * 7.0 + V[:, 1] * 6.0 + V[:, 2] * 5.0))))
for sx in (1, -1):
    B.add('body', paw('paw', BC + (sx * 1.8, -5.4, -3.2), d=(sx * 0.2, -1, 0.1), r=0.9, region='pink', tris=16))
HC = BC + (0, -4.8, -1.2)
HP = [head('head', HC, 5.2, 4.2, 4.2, snout=2.0, region='skin', tris=150)]
NOSE = HC + (0, -4.4, -0.8)
HP.append(blob('nose', NOSE, 0.7, tris=12, region='ink'))
HP.append(low(tk.rbox('leaf', (1.4, 1.0, 0.18), centre=tuple(NOSE + (0.2, 0.5, 0.75)), bevel=0.06, segs=1), 'leaf', 12, lo=0, hi=1, region='gold'))
for sx in (1, -1):
    HP.append(blob('ear', HC + (sx * 2.2, 0.6, 1.8), 0.75, tris=10, region='pink', squash=(1.0, 0.5, 1.0)))
B.add('head', *HP)
B.commit(F, kinds={'bed': 'metal', 'body': 'gloss'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('bed', (0, 0, PZ), parent='root')
    R.bone('body', tuple(BC + (0, 3.0, -3.6)), parent='bed')
    R.bone('head', tuple(HC + (0, 2.0, 0)), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    bones = ['root', 'bed', 'body', 'head']
    with R.action('gimmick'):
        for b in bones:
            k(b, 0)
        k('body', 4)
        k('body', 14, rot=('X', 10), move=(0, 0, 0.6), ease='BACK')            # uncurls: the back rounds up
        k('head', 6)
        k('head', 16, rot=('X', -28), move=(0, -1.6, 0.8), ease='BACK')        # head up and out
        for i, f in enumerate((20, 24, 28, 32, 36)):                           # sniff, sniff
            k('head', f, rot=[('X', -28 - (5 if i % 2 else 0)), ('Z', (-8, 8, -8, 8, 0)[i])], move=(0, -1.6, 0.8))
        k('head', 42, rot=('X', -28), move=(0, -1.6, 0.8))
        k('body', 42, rot=('X', 10), move=(0, 0, 0.6))
        k('head', 52, ease='QUAD')
        k('body', 54, ease='BOUNCE')                                           # and back into a ball
        for b in bones:
            k(b, 64)
    return R


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_bed(P, pt, sh, 'gold', seed=17)
    nori(P, pt, sh, 'nori')
    flake = P.region('nori') & (np.sin(X * 2.3 + Z * 1.7) * np.sin(Yc * 2.1 - Z * 2.6) > 0.82)
    P.fill(flake, pt.ramp('#e0b040', 6, dark=0.6, light=0.6), tone=sh, base=0.25, brush='metal')            # gold leaf on the nori
    UNI = pt.ramp('#f0a42a', 7, shift=0.07, light=0.5)
    P.fill('uni', UNI, tone=sh, base=0.15, brush={'preset': 'gloss', 'flow': 'down'})
    uni = P.region('uni')
    P.shift(uni & (np.sin(X * 6.0 + Yc * 5.0 + Z * 4.0) > 0.6), -1)                    # the lobes' fine grain
    P.shift(uni & (P.on[:, :, 2] > 0.7) & (P.on[:, :, 1] < -0.2), 1)
    P.fill('skin', pt.ramp('#8a6a50', 6, shift=0.05), tone=sh, base=0.05, brush='fur')
    P.fill('belly', pt.ramp('#efe0c8', 6, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill(P.region('skin') & (Yc < HC[1] - 1.0), pt.ramp('#f2e2c8', 6, shift=0.04), tone=sh, base=0.15, brush='fur')   # the pale face
    P.fill('pink', pt.ramp('#eea8a0', 6), tone=sh, base=0.2)
    P.fill('ink', pt.ramp('#1e1a1c', 5, light=0.5), tone=sh, base=0.3, brush='gloss')
    P.fill('gold', pt.ramp('#e8b840', 6, dark=0.6, light=0.6), tone=sh, base=0.3, brush='metal')
    fc = face.Face(P, c=tuple(HC + (0, -2.6, 0.6)), axis=(0, -1, 0.3), where=P.region('skin'), seed=4601)
    fc.eyes('sleepy', spread=2.8, size=0.45, dy=0.5)
    fc.mouth('w', w=0.9, dy=-1.1, weight=0.16)
    fc.blush(3.4, -0.5, rx=0.6, ry=0.35)
    P.lines(['uni', 'skin', 'nori'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=64, fold=(0, 16, 28, 48), skip=[('body', 'bed'), ('head', 'body'), ('head', 'bed')],
    cams=[((34, -44, 32), (0, 0, 8)), ((-34, 40, 28), (0, 2, 8))])
