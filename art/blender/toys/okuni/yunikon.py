"""ユニコーン Bagpipe Unicorn (series okuni, National Animal Parade; Scotland; the secret): Scotland's national animal is
the unicorn. A white unicorn sitting up on its haunches in a tartan kilt and sash with a sporran, a spiralled gold
horn and gold hooves, a lilac mane, a set of bagpipes under its arm: the tartan bag, three drones over its shoulder,
the blowpipe to its lips, the chanter in its hooves.
Gimmick: it squeezes the bag and plays, swaying, the drones wobbling.

    tools/blender.sh art/blender/toys/okuni/yunikon.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.5')   # (this figure's detail: the pieces' budgets times this)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _okuni import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('okuni', 'yunikon')
B = Build()
# ------------------------------------------------------------------ haunches, hind legs forward, gold hooves; the tail on the ground
for sx in (1, -1):
    hb = blob('haunch', (sx * 4.4, 2.6, 4.8), 4.4, tris=40, region='coat', squash=(0.8, 1.2, 1.0))
    for o in hb:
        tk.flat_bottom(o, 0.8)
    B.add('body', hb)
    B.add('body', limb('shin', [(sx * 5.0, -0.4, 3.0), (sx * 4.9, -3.6, 1.6)], [1.5, 1.3], tris=16, region='coat', n=8))
    B.add('body', turn('hoof', [(0, 0), (1.6, 0), (1.6, 1.0), (1.4, 1.8), (0, 1.9)], (sx * 4.9, -4.8, 0.0), 'gold', tris=20, n=10))
tail = limb('tail', [(0, 5.8, 3.2), (2.2, 8.6, 1.4), (5.2, 9.2, 1.0), (7.2, 7.4, 1.0)], [1.9, 1.6, 1.2, 0.5], tris=36, region='mane', n=8,
            sculpt=lambda h: tk.push(h, lambda V, N: 0.18 * np.sin(V[:, 0] * 4.0 + V[:, 1] * 3.0)))
for o in tail:
    tk.flat_bottom(o, 0.6)
B.add('body', tail)
# ------------------------------------------------------------------ the body, the kilt and sporran, the sash
BODY = [dict(c=(0, 3.0, 2.4), w=10.4, h=5.4), dict(c=(0, 1.8, 7.0), w=11.0, ht=5.6, hb=5.4), dict(c=(0, 0.2, 12.4), w=9.6, ht=5.0, hb=4.4),
        dict(c=(0, -0.8, 16.6), w=8.0, h=3.8)]
bd = low(tk.loft('body', BODY, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 130, lo=1, hi=3, region='coat')
for o in bd:
    tk.flat_bottom(o, 0.8)
B.add('body', bd)
kilt = tk.loft('kilt', [dict(c=(0, 1.7, 10.0), w=11.8, ht=6.0, hb=5.8), dict(c=(0, 1.4, 6.6), w=13.0, ht=7.0, hb=6.4), dict(c=(0, 1.0, 3.6), w=14.0, ht=7.8, hb=6.8)],
               n=16, up=(0, -1, 0), cap0=None, cap1=None)
B.add('body', low(kilt, 'kilt', 70, lo=0, hi=2, region='kilt', sculpt=lambda h: tk.push(h, lambda V, N: 0.18 * bands(np.arctan2(V[:, 1] - 1.4, V[:, 0]) * 7, 1.0, 0.5) * (V[:, 2] < 8.4))))
B.add('body', blob('sporran', (0, -6.2, 6.6), 1.5, tris=16, region='sporran', squash=(1.0, 0.55, 1.2)))
B.add('body', limb('belt', [(-5.2, -2.6, 10.2), (0, -5.4, 10.2), (5.2, -2.6, 10.2)], 0.45, tris=16, region='leather', n=5))
B.add('body', limb('sash', [(-4.6, -1.6, 10.6), (-1.6, -4.6, 12.6), (1.8, -4.0, 15.4), (3.8, -1.8, 17.2), (3.6, 1.4, 17.8)], 0.7, tris=30, region='sash', n=5,
                   sculpt=lambda h: tk.scale(h, (1, 1, 1))))
# ------------------------------------------------------------------ neck, head, ears, the horn, the mane
NECK = (0, -0.8, 16.6)
B.add('head', limb('neck', [NECK, (0, -2.2, 21.0), (0, -2.6, 24.4)], [3.0, 2.6, 2.4], tris=30, region='coat', n=8))
hd = tk.loft('head', [dict(c=(0, -0.8, 26.8), w=5.6, h=3.0), dict(c=(0, -3.2, 26.6), w=6.2, ht=3.0, hb=2.8), dict(c=(0, -5.8, 25.2), w=5.0, ht=2.2, hb=2.4),
                      dict(c=(0, -7.4, 24.2), w=4.4, h=2.0)], n=12, up=(0, 0.3, 1), cap0='round', cap1='round', capd=0.9)
B.add('head', low(hd, 'head', 96, region=('coat', [('muzzle', lambda C, N: C[:, 1] < -6.4)])))
for sx in (1, -1):
    B.add('head', ear('ear', (sx * 1.9, -0.8, 28.8), (sx * 2.4, 0.2, 32.0), 1.8, th=0.8, region='coat', tris=14))


def spiral(h):
    tk.push(h, lambda V, N: 0.16 * (np.abs(np.mod(V[:, 2] * 1.6 + np.arctan2(V[:, 0], V[:, 1] + 4.0) / np.pi, 1.0) - 0.5) < 0.18))


B.add('head', limb('horn', [(0, -3.2, 29.0), (0, -4.0, 32.8), (0, -4.8, 36.4)], [1.05, 0.62, 0.08], tris=30, region='gold', n=8, cap1='point', sculpt=spiral))
for i, (p0, p1) in enumerate((((0, -2.4, 29.8), (0, -3.8, 29.6)), ((0, 0.2, 29.0), (0, 1.6, 27.0)), ((0, 0.6, 26.6), (0, 2.4, 24.4)),
                               ((0, 0.6, 24.0), (0, 2.2, 21.6)), ((0, 0.4, 21.4), (0, 1.8, 18.8)))):
    B.add('head', limb('mane', [p0, p1], [1.3 if i else 0.9, 0.3], tris=14, region='mane', n=6, cap1='point'))
G = grow(B, 'head', 1.22, NECK)
# ------------------------------------------------------------------ the forelegs on the chanter
SR, SL = V3(-3.6, -1.6, 16.8), V3(3.6, -1.6, 16.8)
B.add('body', limb('fore_r', [SR, (-4.2, -4.8, 13.8), (-1.6, -6.6, 12.6)], [1.6, 1.4, 1.2], tris=28, region='coat', n=8))
B.add('body', limb('fore_l', [SL, (4.4, -4.2, 13.2), (1.8, -6.8, 10.4)], [1.6, 1.4, 1.2], tris=28, region='coat', n=8))
B.add('body', turn('fhoof_r', [(0, -0.6), (1.2, -0.6), (1.25, 0.6), (0, 0.6)], (-1.2, -7.0, 12.4), 'gold', tris=16, n=8))
B.add('body', turn('fhoof_l', [(0, -0.6), (1.2, -0.6), (1.25, 0.6), (0, 0.6)], (1.5, -7.2, 10.2), 'gold', tris=16, n=8))
# ------------------------------------------------------------------ the bagpipes: the bag (it squeezes), drones, blowpipe, chanter
BAG = (6.0, -2.4, 13.8)
B.add('bag', blob('bag', BAG, 3.0, tris=40, region='bagcover', squash=(0.75, 1.15, 0.95)))
for top in ((6.6, 3.0, 25.2), (4.8, 4.2, 27.4), (8.0, 1.8, 22.8)):
    p0 = (5.6, -1.4, 16.2)
    B.add('pipes', limb('drone', [p0, ((p0[0] + top[0]) / 2, (p0[1] + top[1]) / 2, (p0[2] + top[2]) / 2), top], [0.5, 0.45, 0.42], tris=16, region='pipe', n=6))
    B.add('pipes', blob('stock', top, 0.75, tris=12, region='ivory', squash=(1, 1, 1.3)))
B.add('pipes', limb('blow', [(4.6, -3.8, 15.8), (2.4, -6.8, 20.8), G((0.9, -7.6, 23.8))], 0.32, tris=16, region='pipe', n=5))
B.add('pipes', limb('chanter', [(4.0, -4.2, 12.4), (1.6, -7.0, 10.8), (1.2, -7.6, 7.8)], [0.5, 0.55, 0.7], tris=20, region='pipe', n=6))
B.add('pipes', blob('bell', (1.2, -7.7, 7.3), 0.85, tris=12, region='ivory'))
B.commit(F, bones={'body': 'body', 'head': 'head', 'bag': 'bag', 'pipes': 'pipes'})


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 1.2, 6.0), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('bag', BAG, parent='body')
    R.bone('pipes', (5.6, -1.4, 16.2), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'bag', 'pipes']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        for i, f in enumerate(range(6, 54, 8)):
            s_ = 1 if i % 2 == 0 else -1
            k('bag', f, scale=(0.84, 0.9, 0.84) if i % 2 == 0 else (1.03, 1.0, 1.03))
            k('body', f, rot=('Y', 3.5 * s_))
            k('head', f, rot=[('Z', 7 * s_), ('X', -5 if i % 2 == 0 else 2)])
            k('pipes', f, rot=('Y', -3 * s_))
        for b in allb:
            k(b, 60)
    return R


def paint(P, pt):
    import face
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('coat', pt.ramp('#f4f0f2', 6, shift=0.04), tone=sh, base=0.2, brush='fur')
    P.fill('muzzle', pt.ramp('#ead6dc', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('mane', pt.ramp('#a88ad0', 6, shift=0.07), tone=sh, base=0.1, brush={'preset': 'fur', 'flow': 'down'})
    P.fill(P.region('mane') & bands(X * 0.8 + Z * 0.5, 2.2, 0.8), pt.ramp('#e89ab8', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('gold', pt.ramp('#e0b040', 7, shift=0.08, light=0.6), tone=sh, base=0.15, brush='metal')
    u = np.where(np.abs(P.on[:, :, 0]) > 0.7, Y, X)
    tartan(P, pt, P.region('kilt'), sh, u, Z)
    tartan(P, pt, P.region('bagcover'), sh, X + Y, Z, k=0.8)
    tartan(P, pt, P.region('sash'), sh, X - Z, X + Z, k=0.6)
    P.fill('leather', pt.ramp('#3a2a24', 5), tone=sh, base=0.15)
    P.fill('sporran', pt.ramp('#5a3a26', 6, shift=0.05), tone=sh, base=0.15, brush='fur')
    P.fill(P.region('sporran') & (Z > 7.4), pt.ramp('#e0b040', 5, shift=0.08), tone=sh, base=0.2)
    P.fill('pipe', pt.ramp('#3a2620', 6, shift=0.05, light=0.6), tone=sh, base=0.15, brush='gloss')
    P.shift(P.region('pipe') & bands(Z, 2.2, 0.35), 2)
    P.fill('ivory', pt.ramp('#efe6d0', 5, shift=0.04), tone=sh, base=0.2)
    fc = face.Face(P, c=G((0, -5.6, 26.4)), axis=(0, -1, 0.35), where=P.region('coat') | P.region('muzzle'), seed=1707)
    fc.eyes('dot', spread=4.2, size=0.38, dy=0.9)
    fc.blush(5.0, -0.4, rx=0.9, ry=0.5, col='#f0a0b8')
    P.lines(['kilt', 'sash', 'bagcover'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=60, skip=[('head', 'body'), ('bag', 'body'), ('pipes', 'body'), ('pipes', 'bag'), ('pipes', 'head'), ('bag', 'head')],
   fold=(0, 6, 14, 30))
