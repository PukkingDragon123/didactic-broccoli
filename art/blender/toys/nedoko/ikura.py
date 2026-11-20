"""イクラカワウソ Roe-Bath Sea Otter (series nedoko, Sushi Bedtime, concepts_F.md): a sea otter floating on its back in
an oval gunkan-maki, the crisp nori wall for its bathtub, a bed of glossy salmon roe for its bath water; it holds one
big roe on its tummy the way an otter holds its stone, its hind feet and tail up out of the roe. A black kaiten plate
with a gold rim.
Gimmick: it sits up out of the roe and juggles the big one, three tosses, then floats back down.

    tools/blender.sh art/blender/toys/nedoko/ikura.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _futon import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('nedoko', 'ikura')
B = Build()
plate(B)
GA, GB, GH = 8.4, 11.6, 7.6      # the gunkan's half-width, half-length, wall height
GY = 1.0
rice_bed(B, L=2 * GB - 4.4, W=2 * GA - 4.8, H=4.4, cy=GY, seed=13, tris=110)
TZ = PZ + 4.4                    # the rice's top: the roe lie on it

# ------------------------------------------------------------------ the nori wall: a band round the oval
loop = [(GA * math.cos(a), GY + GB * math.sin(a), PZ + GH / 2) for a in np.linspace(0, 2 * math.pi, 28, endpoint=False)]
rings = [dict(c=p, w=0.7, h=GH / 2, e=5.0) for p in loop]
wall = tk.loft('wall', rings, n=8, up=(0, 0, 1), closed=True, spine=np.array(loop))
B.add('bed', low(wall, 'wall', 230, lo=1, hi=2, region='nori',
                 sculpt=lambda h: tk.push(h, lambda V, N: 0.06 * np.sin(V[:, 2] * 4.0 + np.arctan2(V[:, 1] - GY, V[:, 0]) * 9))))

# ------------------------------------------------------------------ the roe: a layer of glossy beads round the otter
rng = np.random.default_rng(5)
roe = []
for i in range(46):
    for _ in range(40):
        a, r = rng.uniform(0, 2 * math.pi), math.sqrt(rng.uniform(0, 1))
        x, y = GA * 0.86 * r * math.cos(a), GY + GB * 0.88 * r * math.sin(a)
        if abs(x) < 3.9 and -7.4 < y < 10.2:
            continue
        if all(math.hypot(x - q[0], y - q[1]) > 1.75 for q in roe):
            roe.append((x, y, TZ + 0.75 + rng.uniform(-0.1, 0.5)))
            break
for i, q in enumerate(roe):
    B.add('bed', blob('roe', q, 0.95, tris=12, region='roe', n=8))

# ------------------------------------------------------------------ the otter on its back: belly up, head up, the big roe on its tummy
BZ = TZ + 1.0
B.add('body', loaf('body', -2.4, 9.2, 7.6, 4.4, BZ, region=('fur', [('cream', lambda C, N: (N[:, 2] > 0.55) & (C[:, 1] < 6.0))])))
for sx in (1, -1):
    B.add('body', limb('foot', [(sx * 2.2, 8.4, BZ + 3.0), (sx * 2.8, 10.6, BZ + 5.2)], [1.0, 1.3], tris=16, region='dark', n=7))   # the hind feet up
    B.add('body', limb('arm', [(sx * 3.3, -0.6, BZ + 3.4), (sx * 2.6, 1.2, BZ + 5.0), (sx * 1.4, 1.8, BZ + 5.4)], [1.1, 0.95, 0.8], tris=18, region='fur', n=7))
B.add('body', limb('tail', [(0, 9.0, BZ + 1.6), (0.6, 11.4, BZ + 1.8), (1.6, 12.4, BZ + 2.6)], [1.4, 1.2, 0.7], tris=18, region='fur', n=7, cap1='point'))
HC = V3(0, -4.6, BZ + 5.6)
hlo, hhi = head('head', HC, 7.6, 6.4, 6.4, snout=0.5, region='fur', rules=[('cream', lambda C, N: (C[:, 1] < HC[1] - 1.6))])
for o in (hlo, hhi):
    tk.rotate(o, -18, 'X', pivot=tuple(HC))          # chin up: it looks at you over its tummy
HP = [(hlo, hhi)]
for sx in (1, -1):
    HP.append(blob('ear', HC + (sx * 3.4, 1.4, 1.8), 0.9, tris=10, region='fur', squash=(0.9, 0.5, 1.0)))
    HP.append(blob('pad', HC + (sx * 0.9, -4.0, -0.2), 1.05, tris=12, region='cream', squash=(1.0, 0.85, 0.85)))
B.add('head', *HP)
BALL = V3(0, 1.8, BZ + 6.4)
B.add('ball', blob('bigroe', BALL, 1.7, tris=24, region='roe', n=10))
B.commit(F, kinds={'bed': 'gloss', 'ball': 'gloss'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('bed', (0, 0, PZ), parent='root')
    R.bone('body', (0, 7.6, BZ + 1.2), parent='bed')
    R.bone('head', (0, -2.6, BZ + 3.6), parent='body')
    R.bone('ball', tuple(BALL), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    bones = ['root', 'bed', 'body', 'head', 'ball']
    with R.action('gimmick'):
        for b in bones:
            k(b, 0)
        k('body', 4)
        k('body', 14, rot=('X', -26), ease='BACK')            # sits up out of the roe
        k('head', 14, rot=('X', 6))
        for i, t0 in enumerate((16, 26, 36)):                 # three tosses, the roe spinning
            k('ball', t0)
            k('ball', t0 + 5, move=(0, 0, 7.0), rot=('Y', 180 * (i + 1)), ease='QUAD')
            k('ball', t0 + 10, rot=('Y', 360 * (i + 1)), ease='QUAD')
            k('head', t0 + 5, rot=('X', -12))
            k('head', t0 + 10, rot=('X', 6))
        k('ball', 47)
        k('body', 46, rot=('X', -26))
        k('body', 56, ease='BOUNCE')                          # floats back down
        k('head', 56)
        for b in bones:
            k(b, 64)
    return R


def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_bed(P, pt, sh, 'black', seed=13)
    nori(P, pt, sh, 'nori')
    P.shift(P.region('nori') & (np.abs(np.mod(Z * 1.3 + np.arctan2(Yc - GY, X) * 3, 1.0) - 0.5) < 0.08), 1)    # the sheet's fibres
    ROE = pt.ramp('#f0601e', 7, shift=0.06, light=0.55)
    P.fill('roe', ROE, tone=sh, base=0.2, brush='gloss')
    P.shift(P.region('roe') & (P.on[:, :, 2] > 0.9), -1)                    # the darker yolk spot in each bead
    P.shift(P.region('roe') & (P.on[:, :, 2] > 0.5) & (P.on[:, :, 1] < -0.35) & (P.on[:, :, 0] > 0.1), 2)   # the gloss on each bead
    P.fill('fur', pt.ramp('#6e4c34', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('cream', pt.ramp('#e8d8bc', 6, shift=0.04), tone=sh, base=0.15, brush='fur')
    P.fill('dark', pt.ramp('#3e2c22', 6, shift=0.05), tone=sh, base=0.1, brush='fur')
    fc = face.Face(P, c=tuple(HC + (0, -3.6, 1.2)), axis=(0, -1, 0.4), where=P.region('fur') | P.region('cream'), seed=4501)
    fc.eyes('dot', spread=3.6, size=0.5, dy=0.7)
    fc.nose('tri', dy=-0.4, size=0.55)
    fc.mouth('smug', w=1.3, dy=-1.3, weight=0.2)
    fc.blush(4.4, -0.6, rx=0.8, ry=0.45)
    P.lines(['fur', 'cream', 'nori'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=64, fold=(0, 14, 21, 40), skip=[('body', 'bed'), ('head', 'body'), ('ball', 'body'), ('head', 'bed'), ('ball', 'head')],
    cams=[((34, -44, 32), (0, 0, 7)), ((-34, 40, 28), (0, 2, 7))])
