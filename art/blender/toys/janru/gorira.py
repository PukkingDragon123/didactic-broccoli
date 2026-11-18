"""番長ゴリラ Rooftop Gorilla (series janru, concepts_E.md): the delinquent-school genre, our own: a huge silverback
gang boss on the school roof in a long black school coat worn open over a white belly wrap, baggy black trousers and a
battered school cap, a grass stalk in his teeth; he leans in on his left knuckles, his bandaged right fist cocked
back by his ear.
Gimmick (the haymaker): he winds back, twists and swings the bandaged fist round in a huge haymaker; his cap jumps
off his head with the force and drops back.

    GG_FACET=1 tools/blender.sh art/blender/toys/janru/gorira.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('janru', 'gorira')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the school roof: a concrete slab, a drain line, a bit of railing at the back
B.add('base', low(tk.rbox('base', (26.0, 23.0, GZ), centre=(0, 0, GZ / 2), bevel=0.5, segs=1), 'base', 40, lo=0, hi=2, region='concrete'))
for x in (-11.4, 0.0, 11.4):
    B.add('base', limb('post', [(x, 10.2, GZ), (x, 10.2, 12.0)], 0.45, tris=8, region='rail', n=6, cap0='flat'))
B.add('base', limb('rail', [(-11.8, 10.2, 12.0), (11.8, 10.2, 12.0)], 0.5, tris=10, region='rail', n=6))
B.add('base', limb('rail2', [(-11.8, 10.2, 7.4), (11.8, 10.2, 7.4)], 0.35, tris=8, region='rail', n=6))

# ------------------------------------------------------------------ the short bowed legs in baggy trousers, the big feet
for sx in (1, -1):
    B.add('body', low(tk.loft('trouser', [dict(c=(sx * 3.2, 1.4, 10.6), w=5.0, h=2.6), dict(c=(sx * 4.8, 0.2, 7.0), w=6.2, h=3.0), dict(c=(sx * 5.0, 0.6, GZ + 2.4), w=4.6, h=2.4)],
                              n=10, up=(0, -1, 0), cap0='round', cap1='flat'), 'trouser', 36, lo=1, hi=2, region='pants'))
    B.add('body', shoe('foot', (sx * 5.0, 2.2, GZ), (sx * 0.3, -1, 0), L=6.0, W=4.0, H=2.6, region='skin', tris=30, toe_up=0.2))

# ------------------------------------------------------------------ the barrel body: coat open over the belly wrap; the long coat skirt


def opening(C, N):
    return (N[:, 1] < -0.3) & (np.abs(C[:, 0]) < 1.6 + 0.12 * (22.0 - C[:, 2]))


TORSO = [dict(c=(0, 1.2, 10.4), w=9.6, h=4.2), dict(c=(0, 0.4, 15.0), w=11.4, h=4.6), dict(c=(0, -0.8, 20.0), w=14.0, ht=4.8, hb=5.0, e=2.4),
         dict(c=(0, -1.2, 22.6), w=9.4, h=3.6)]
B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 190, lo=1, hi=3,
                  region=('coat', [('wrap', opening)]),
                  sculpt=lambda h: tk.push(h, lambda V, N: -0.3 * opening(V, N) + 0.2 * (np.abs(np.abs(V[:, 0]) - 1.6 - 0.12 * (22.0 - V[:, 2])) < 0.3) * (N[:, 1] < -0.3))))
SK = [dict(c=(0, 1.2, 13.6), w=11.0, h=4.8), dict(c=(0, 1.8, 9.4), w=13.0, h=5.6), dict(c=(0, 2.6, 6.0), w=13.8, ht=4.4, hb=6.0)]
B.add('body', low(tk.loft('skirt', SK, n=14, up=(0, -1, 0), cap0='flat', cap1='flat'), 'skirt', 70, lo=1, hi=2, region=('coat', [('wrap', opening)]),
                  sculpt=lambda h: tk.push(h, lambda V, N: 0.25 * np.sin(np.arctan2(V[:, 1] - 2.0, V[:, 0]) * 7.0) * tk.smoothstep(10.0, 6.0, V[:, 2]))))
B.add('body', low(tk.lathe('collar', [(2.6, 0), (3.8, 0), (3.6, 2.2), (2.6, 2.2)], n=10, centre=(0, -1.6, 22.4)), 'collar', 24, lo=0, hi=2, region='coat'))
for z in (17.0, 19.4):
    for sx in (1, -1):
        B.add('body', blob('button', (sx * (2.8 + 0.12 * (22 - z)), -5.5, z), 0.45, tris=6, region='brass', squash=(1, 0.5, 1)))

# ------------------------------------------------------------------ the left arm down to its knuckles on the roof; the right cocked back, bandaged
SL, SR = V3(6.6, -0.8, 20.4), V3(-6.6, -0.8, 20.4)
WL = V3(9.8, -4.4, 6.8)
B.add('body', limb('slv_l', [SL, (9.6, -2.6, 14.0), (9.8, -3.6, 10.6)], [2.8, 2.5, 2.4], tris=28, region='coat', n=8, cap1='flat'),
      limb('fore_l', [(9.8, -3.6, 11.0), WL], [2.2, 1.9], tris=14, region='fur', n=8),
      *hand('hand_l', WL, (0.05, -0.15, -1.0), r=1.8, kind='fist', region='skin', up=(0, -1, 0), tris=24))
WR = V3(-8.4, -0.4, 23.0)
B.add('arm_r', limb('slv_r', [SR, (-10.6, 2.8, 18.4), (-10.0, 1.6, 20.0)], [2.8, 2.6, 2.4], tris=26, region='coat', n=8, cap1='flat'),
      limb('fore_r', [(-10.0, 1.8, 19.6), WR], [2.3, 2.0], tris=14, region='bandage', n=8),
      *hand('hand_r', WR, (0.25, -0.75, 0.6), r=1.9, kind='fist', region='bandage', up=(0, 0, 1), tris=24))

# ------------------------------------------------------------------ the head: low and forward, the brow, the muzzle, the battered cap, the grass stalk
HC = V3(0, -3.8, 26.2)
head = tk.loft('head', [dict(c=tuple(HC + (0, 2.6, 0.6)), w=6.8, h=3.2), dict(c=tuple(HC), w=7.6, ht=3.4, hb=3.0), dict(c=tuple(HC + (0, -2.4, -1.6)), w=6.2, ht=2.2, hb=2.6)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HP = [low(head, 'head', 110, lo=1, hi=3, region=('fur', [('skin', lambda C, N: (C[:, 1] < HC[1] - 1.0) & (C[:, 2] < HC[2] + 1.4))])),
      limb('brow', [HC + (-3.0, -2.2, 1.0), HC + (0, -2.8, 1.4), HC + (3.0, -2.2, 1.0)], [0.9, 1.0, 0.9], tris=14, region='skin', n=6),
      limb('neck', [(0, -1.2, 22.4), HC + (0, 1.4, -2.0)], 2.6, tris=10, region='fur', n=8),
      limb('grass', [HC + (1.8, -4.6, -2.2), HC + (4.0, -6.4, -1.4), HC + (5.4, -7.0, 0.2)], [0.18, 0.15, 0.06], tris=8, region='grass', n=4, cap1='point')]
B.add('head', *HP)
CAPC = HC + (0, 0.8, 2.8)
cap = [low(tk.lathe('cap', [(0, 0), (3.5, 0), (3.9, 1.7), (4.0, 2.2), (0, 2.3)], n=12, centre=tuple(CAPC)), 'cap', 36, lo=1, hi=2, region='cap',
           sculpt=lambda h: tk.push(h, lambda V, N: 0.25 * np.sin(V[:, 0] * 2.1 + V[:, 1] * 1.7))),
       low(tk.loft('bill', [dict(c=tuple(CAPC + (0, -3.2, 0.3)), w=5.6, h=0.22), dict(c=tuple(CAPC + (0, -5.4, 0.0)), w=4.6, h=0.2)], n=8, up=(0, 0, 1), cap0='flat',
                   cap1='round', capd=0.6), 'bill', 14, lo=1, hi=2, region='capbill')]
for a, b in cap:
    for o in (a, b):
        tk.rotate(o, -10, 'X', pivot=tuple(CAPC))
        tk.rotate(o, 8, 'Y', pivot=tuple(CAPC))
B.add('cap', *cap)
B.commit(F, bones={'base': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the haymaker)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', (0, -1.2, 22.4), parent='body')
    R.bone('cap', tuple(CAPC), parent='head')
    R.bone('arm_r', tuple(SR), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'cap', 'arm_r']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # wind back...
        k('arm_r', 10, rot=[('Z', -16), ('X', -10)])
        k('body', 10, rot=('Z', -4))
        # ...and the haymaker swings round in front of him
        k('arm_r', 18, rot=[('Z', 62), ('X', 18)], ease='QUAD')
        k('body', 18, rot=('Z', 10), ease='QUAD')
        k('head', 12)
        k('head', 18, rot=('X', 8), ease='BACK')
        k('arm_r', 50, rot=[('Z', 62), ('X', 18)])
        k('body', 50, rot=('Z', 10))
        k('head', 50, rot=('X', 8))
        # the cap jumps off his head and drops back
        k('cap', 16)
        k('cap', 26, move=(0, 1.0, 5.0), rot=('X', -26), ease='QUAD')
        k('cap', 36, ease='BOUNCE')
        for b in allb:
            k(b, 66)
        for b in allb:
            k(b, 76)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('concrete', pt.ramp('#9a978e', 7, shift=0.05), tone=sh, base=0.05, brush={'preset': 'pvc', 'flow': 'around'})
    top = P.region('concrete') & (P.on[:, :, 2] > 0.5)
    P.shift(top & ((np.abs(np.mod(X, 6.5) - 3.25) < 0.08) | (np.abs(np.mod(Yc, 6.5) - 3.25) < 0.08)), -2)          # expansion joints
    P.tint(top & (np.sin(X * 0.7) * np.sin(Yc * 0.9) > 0.85), pt.ramp('#6e7068', 6), sh)                                 # rain stains
    P.fill('rail', pt.ramp('#3e7a6a', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('fur', pt.ramp('#34323a', 7, shift=0.06, light=0.6), tone=sh, base=0.1, brush='fur')
    P.tint(P.region('fur') & (Yc > 2.0) & (Z > 14) & (Z < 24), pt.ramp('#8a8890', 6), sh)                               # the silver back
    P.fill('skin', pt.ramp('#4a4448', 6, shift=0.05, light=0.6), tone=sh, base=0.1)
    P.fill('coat', pt.ramp('#22222a', 7, shift=0.05, light=0.6), tone=sh, base=0.1, brush='cloth')
    P.fill('pants', pt.ramp('#26262e', 7, shift=0.05, light=0.6), tone=sh, base=0.05, brush='cloth')
    P.fill('wrap', pt.ramp('#efe8da', 6, shift=0.04), tone=sh, base=0.15, brush='cloth')
    P.tint(P.region('wrap') & (np.abs(np.mod(Z, 1.6) - 0.8) < 0.08), pt.ramp('#c8c0b0', 5), sh)                       # the wrap's turns
    P.fill('bandage', pt.ramp('#efe8da', 6, shift=0.04), tone=sh, base=0.15, brush='cloth')
    P.tint(P.region('bandage') & (np.abs(np.mod(Z * 0.8 + X * 0.6, 1.3) - 0.65) < 0.08), pt.ramp('#c8c0b0', 5), sh)
    P.fill('brass', pt.ramp('#d6a640', 6, dark=0.6, light=0.6), tone=sh, base=0.2)
    P.fill('cap', pt.ramp('#22222a', 7, shift=0.05, light=0.6), tone=sh, base=0.1)
    P.fill(P.region('cap') & (np.abs(Z - CAPC[2] - 1.0) < 0.35), pt.ramp('#efe8da', 5), tone=sh, base=0.1)            # the white cap band
    P.fill('capbill', pt.ramp('#1a1a20', 5, light=0.6), tone=sh, base=0.1, brush='gloss')
    P.fill('grass', pt.ramp('#8aa040', 5), tone=sh, base=0.2)
    fc = face.Face(P, c=tuple(HC + (0, -3.6, -0.4)), axis=(0, -1, 0.1), where=P.region('skin'), seed=1241, ink='#efe4c8')
    fc.eyes('dot', spread=3.2, size=0.3, dy=0.6, uneven=0.25)
    fc.mouth('smug', w=2.2, dy=-1.4, weight=0.26)
    P.lines(['coat', 'pants', 'wrap', 'cap'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=76, skip=[('head', 'body'), ('arm_r', 'body'), ('cap', 'head'), ('arm_r', 'head'), ('cap', 'arm_r'), ('body', 'base')],
    fold=(0, 10, 18, 26))
