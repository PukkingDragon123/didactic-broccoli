"""波リーゼントカワウソ Wave-Quiff Otter (series minato, concepts_E.md): the harbour town's bad boy, a river otter in
a cropped navy school jacket with anchor buttons, a red tee and baggy trousers, one foot up on an iron mooring bollard,
his forearm on his knee, a skipping stone ready between his fingers, and his quiff combed into a breaking wave.
Gimmick: the wave breaks: the quiff curls forward over his face and crashes, then springs back, as he flicks the stone.

    GG_FACET=1 tools/blender.sh art/blender/toys/minato/kawauso.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('minato', 'kawauso')
B = Build()
GZ = 3.0
BOL = (-5.8, -2.4)
BZ = GZ + 7.2                 # the bollard's top

# ------------------------------------------------------------------ the cobbles, the iron bollard, legs (one up on it), shoes, the tail
B.add('body', cobbles(seed=5))
bol = tk.lathe('bollard', [(0, 0), (3.2, 0), (3.2, 0.8), (2.2, 1.6), (2.0, 5.2), (2.8, 5.8), (3.2, 6.6), (2.6, 7.2), (0, 7.3)], n=10,
               centre=(BOL[0], BOL[1], GZ - 0.2))
B.add('body', low(bol, 'bollard', 60, lo=0, hi=2, region='iron'))
B.add('body', limb('thigh_l', [(2.8, 0.6, 15.0), (3.6, -1.0, 9.4)], [3.0, 2.6], tris=20, region='pants', n=8))
B.add('body', limb('shin_l', [(3.6, -1.0, 9.4), (3.6, 0.8, GZ + 1.8)], [2.6, 2.3], tris=16, region='pants', n=8))
B.add('body', shoe('shoe_l', (3.6, 2.2, GZ - 0.2), (0.25, -1, 0), L=6.0, W=3.2, H=2.2, region='shoe'))
KR = V3(-6.6, -5.2, 15.8)
B.add('body', limb('thigh_r', [(-2.8, 0.4, 15.0), KR], [3.0, 2.6], tris=20, region='pants', n=8))
B.add('body', limb('shin_r', [KR, (BOL[0], BOL[1] + 0.4, BZ + 1.8)], [2.6, 2.3], tris=16, region='pants', n=8))
B.add('body', shoe('shoe_r', (BOL[0], BOL[1] + 1.6, BZ - 0.2), (-0.1, -1, 0), L=6.0, W=3.2, H=2.2, region='shoe'))
B.add('body', limb('tail', [(0, 4.0, 14.0), (0, 7.6, 8.6), (1.4, 9.8, GZ + 1.4), (3.4, 10.4, GZ + 0.9)], [2.8, 2.4, 1.6, 0.6], tris=28,
                   region='fur', n=8, cap1='point'))

# ------------------------------------------------------------------ the long otter body leaning on the knee: tee, cropped jacket
TORSO = [dict(c=(0, 0.6, 13.6), w=10.2, h=4.6), dict(c=(0, 0.0, 17.4), w=10.4, h=4.8), dict(c=(0, -0.8, 21.2), w=10.8, h=4.6),
         dict(c=(0, -1.6, 24.4), w=11.6, ht=4.2, hb=4.2, e=2.5), dict(c=(0, -2.0, 26.2), w=6.8, h=3.2)]


def sc_torso(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1])
        d = 0.35 * tk.smoothstep(18.6, 19.2, z) * (np.abs(x) > 1.4) * (front > 0.2)                    # the open jacket fronts
        d += 0.35 * tk.smoothstep(18.6, 19.2, z) * (front <= 0.2)
        d -= 0.25 * np.exp(-((z - 14.8) / 0.3) ** 2)                                                      # the trouser waist
        return d
    tk.push(h, f)


B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 180, lo=1, hi=3, sculpt=sc_torso,
                  region=('jacket', [('pants', lambda C, N: C[:, 2] < 15.0), ('tee', lambda C, N: (C[:, 2] < 19.0) | ((N[:, 1] < -0.4) & (np.abs(C[:, 0]) < 1.5))),
                                     ('fur', lambda C, N: C[:, 2] > 25.8)])))

# ------------------------------------------------------------------ arms: one forearm over the raised knee, the other with the stone up
SR, SL = V3(-6.6, -1.6, 24.0), V3(6.6, -1.6, 24.0)
B.add('body', limb('arm_r', [SR, (-8.0, -6.0, 18.6), (-3.6, -8.8, 17.6)], [2.5, 2.2, 1.7], tris=28, region='jacket', n=8))
B.add('body', *hand('hand_r', (-3.2, -9.2, 17.4), (0.5, -0.4, -0.7), r=1.6, kind='mitt', region='fur'))
WL = V3(9.8, -6.2, 24.4)
B.add('arm_l', limb('arm_l', [SL, (10.6, -2.4, 19.6), WL], [2.5, 2.2, 1.7], tris=28, region='jacket', n=8))
B.add('arm_l', *hand('hand_l', WL, (-0.15, -0.5, 0.85), r=1.6, kind='mitt', region='fur', up=(0, -1, 0)))
st = tk.lathe('stone', [(0, -0.5), (1.4, -0.35), (1.7, 0), (1.4, 0.35), (0, 0.5)], n=8, centre=(0, 0, 0))
tk.rotate(st, 70, 'X')
tk.move(st, tuple(WL + (-0.6, -1.8, 2.8)))
B.add('arm_l', low(st, 'stone', 14, lo=0, hi=2, region='pebble'))

# ------------------------------------------------------------------ the head: broad and flat, whisker pads, little ears
NECK = (0, -2.0, 26.0)
head = tk.loft('head', [dict(c=(0, -0.8, 30.2), w=8.2, h=3.8), dict(c=(0, -3.6, 30.0), w=9.4, ht=4.0, hb=3.6),
                        dict(c=(0, -6.6, 29.0), w=7.6, ht=2.6, hb=2.9), dict(c=(0, -8.4, 28.8), w=5.0, ht=1.8, hb=1.9)],
               n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
HP = [low(head, 'head', 110, lo=1, hi=3, region=('fur', [('cream', lambda C, N: (C[:, 1] < -5.6) & (C[:, 2] < 29.4) | (C[:, 2] < 27.2))]),
          sculpt=lambda h: tk.push(h, lambda V, N: 0.4 * tk.bump(V, (2.0, -8.0, 28.6), 1.6, 0.6) + 0.4 * tk.bump(V, (-2.0, -8.0, 28.6), 1.6, 0.6))),
      limb('neck', [NECK, (0, -2.4, 29.0)], 3.2, tris=12, region='fur', n=8), blob('nose', (0, -9.6, 29.6), 0.8, tris=10, region='nose', squash=(1.2, 0.8, 0.8))]
for sx in (1, -1):
    HP.append(blob('ear', (sx * 4.2, -1.0, 32.2), 1.2, tris=12, region='fur', squash=(1.0, 0.6, 0.9)))
B.add('head', *HP)
# the quiff: a wave sweeping up off his crown and curling over at the crest, a lick of foam at its lip
QB = V3(0, 0.2, 33.2)
quiff = tk.loft('quiff', [dict(c=(0, 1.4, 32.6), w=7.6, h=1.6), dict(c=(0, -0.6, 36.6), w=6.8, h=2.2), dict(c=(0, -3.8, 40.6), w=6.2, h=2.4),
                          dict(c=(0, -8.4, 41.4), w=5.6, h=2.2), dict(c=(0, -11.8, 38.8), w=4.8, h=1.8), dict(c=(0, -11.2, 35.8), w=3.6, h=1.4),
                          dict(c=(0, -9.0, 35.0), w=2.4, h=0.9)],
                n=10, up=(1, 0, 0), cap0='round', cap1='round')


def sc_quiff(h):
    def f(V, N):  # combed grooves running along the wave
        return -0.2 * (np.abs(np.sin(V[:, 0] * 2.2)) > 0.85)
    tk.push(h, f)


QP = [low(quiff, 'quiff', 80, lo=1, hi=3, sculpt=sc_quiff, region=('hair', [('foam', lambda C, N: (C[:, 1] < -8.0) & (C[:, 2] > 39.6) | (C[:, 1] < -10.4))]))]
for i, (x, y, z) in enumerate(((1.8, -11.6, 36.4), (-1.6, -11.4, 36.8), (0.2, -12.6, 38.2), (0.6, -10.6, 41.6))):
    QP.append(blob('foam', (x, y, z), 0.9, tris=10, region='foam'))
B.add('quiff', *QP)
B.commit(F)


# ------------------------------------------------------------------ rig and the gimmick clip
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0, GZ), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('quiff', tuple(QB), parent='head')
    R.bone('arm_l', tuple(SL), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'quiff', 'arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # he tips his chin up; the wave rears, breaks forward over his face, and springs back
        k('head', 6, rot=('X', -8))
        k('head', 40, rot=('X', -8))
        k('head', 48, rot=('Z', 10))
        k('head', 70, rot=('Z', 10))
        k('head', 80)
        k('quiff', 6, rot=('X', -10))
        k('quiff', 16, rot=('X', 34), ease='BACK')
        k('quiff', 26, rot=('X', 30))
        k('quiff', 36, ease='ELASTIC')
        # ...and flicks the stone (wind back, flick)
        k('arm_l', 30)
        k('arm_l', 38, rot=[('Z', 30), ('X', 10)])
        k('arm_l', 42, rot=[('Z', -24), ('X', -6)], ease='BACK')
        k('arm_l', 66, rot=[('Z', -24), ('X', -6)])
        k('arm_l', 76)
        for b in allb:
            k(b, 84)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('stone', pt.ramp('#8c8a84', 7, shift=0.05), tone=sh, base=0.0)
    P.fill(P.region('stone') & (np.abs(np.mod(X + 0.5 * np.floor(Yc / 2.6) * 2.6, 3.4) - 1.7) < 1.45) & (np.abs(np.mod(Yc, 2.6) - 1.3) < 1.1) & (P.on[:, :, 2] > 0.5),
           pt.ramp('#9c968a', 7, shift=0.05), tone=sh, base=0.05)
    P.fill('iron', pt.ramp('#3a4440', 6, shift=0.06, light=0.6), tone=sh, base=0.1)
    P.tint(P.region('iron') & (np.abs(np.sin(X * 3.1 + Z * 1.7) * np.sin(Yc * 2.3)) > 0.8), pt.ramp('#8a4a2a', 5), sh)   # rust
    P.fill('fur', pt.ramp('#6e4c32', 7, shift=0.06), tone=sh, base=0.1, brush='fur')
    P.fill('cream', pt.ramp('#d9c09a', 6, shift=0.05), tone=sh, base=0.15)
    P.fill('nose', pt.ramp('#2a2224', 5, light=0.6), tone=sh, base=0.3)
    P.fill('jacket', pt.ramp('#252a3c', 7, shift=0.07, light=0.55), tone=sh, base=0.05)
    jk = P.region('jacket')
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    for z in (20.4, 22.8):
        for sx in (1, -1):
            P.fill(jk & (np.hypot(X - sx * 2.4, Z - z) < 0.6) & (Yc < -3), GOLD, tone=sh, base=0.2)
    P.fill('tee', pt.ramp('#b8343a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('pants', pt.ramp('#2a2a2e', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('shoe', pt.ramp('#e8e2d4', 6, shift=0.04), tone=sh, base=0.05)
    P.fill('hair', pt.ramp('#4a3424', 7, shift=0.06, light=0.6), tone=sh, base=0.1, brush={'preset': 'gloss', 'flow': 'along', 'axis': (0, -1, 0.3)})
    P.fill('foam', pt.ramp('#eef2f0', 6, shift=0.04), tone=sh, base=0.2)
    P.fill('pebble', pt.ramp('#9aa0a4', 6, shift=0.05), tone=sh, base=0.1)
    # the face: a sidelong cool look, a tough brow, a smug little mouth with a grass stalk in it
    hd = (P.region('fur') | P.region('cream')) & (Z > 27)
    fc = face.Face(P, c=(0, -8.4, 30.4), axis=(0, -1, 0.1), where=hd, seed=971)
    fc.eyes('side', spread=6.0, size=0.55, dy=0.8, look=1)
    fc.brows('angry', spread=6.4, dy=2.2, w=2.0, weight=0.5)
    fm = face.Face(P, c=(0, -9.4, 28.2), axis=(0, -1, -0.1), where=hd, seed=972)
    fm.mouth('smug', w=2.2, dy=-0.2, weight=0.3)
    fm.stroke([(0.8, -0.3), (2.4, -1.0), (3.6, -1.2)], weight=0.2, col='#7a9a4a')
    fm.whiskers(dy=0.4, spread=2.4, n=2, length=2.2, weight=0.18, dots=True)
    P.lines(['jacket', 'tee', 'pants'], step=1)
    P.lines(['hair'], ['fur', 'cream'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=84, skip=[('head', 'body'), ('quiff', 'head'), ('quiff', 'body'), ('arm_l', 'body'), ('arm_l', 'head')],
    fold=(0, 16, 26, 42))
