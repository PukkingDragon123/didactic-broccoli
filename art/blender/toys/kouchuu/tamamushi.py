"""タマムシ・ジュエル Jewel, Rooftop Session (series kouchuu, The Hardwings; the secret): the band's secret fifth member,
an iridescent jewel beetle (green-gold, with the two red-violet stripes down its wing cases) in a long camel coat with
a dark fur collar, singing at a tall chrome microphone stand on a piece of flat rooftop: wooden duckboards on the tar,
a brick parapet behind and a chimney stack with two clay pots.
Gimmick: it throws its head back for the high note and leans the stand over with it.

    tools/blender.sh art/blender/toys/kouchuu/tamamushi.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

os.environ.setdefault('GG_BZ_K', '1.15')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _band import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('kouchuu', 'tamamushi')
B = Build()
DECK = 2.4
OFF = V3(-1.6, 1.4, DECK)
MIC = V3(-1.8, -5.6, 0) + (0, 0, DECK)
M = Beetle(B, hand_r=(0.6, -6.6, 20.4), hand_l=(7.2, -2.6, 15.8), hk=1.05, legs=True, fringe=22.4)
M.shift(OFF)
M.antennae(club=False)
# the long coat over the suit, its fur collar
coat = tk.loft('coat', [dict(c=(0, 0.8, 16.4), w=9.6, ht=4.4, hb=4.4), dict(c=(0, 1.0, 10.0), w=10.6, ht=5.0, hb=4.8), dict(c=(0, 1.4, 5.6), w=12.0, ht=5.6, hb=5.4),
                        dict(c=(0, 1.6, 3.6), w=12.8, ht=6.0, hb=6.0)], n=16, up=(0, -1, 0), cap0=None, cap1=None)
tk.drop_faces(coat, lambda C, N: (np.abs(C[:, 0]) < 1.3) & (N[:, 1] < -0.6) & (C[:, 2] < 12.0))   # it hangs open at the front
tk.move(coat, tuple(OFF))
B.add('body', lowk(coat, 'coat', 110, 'coat', lo=0, hi=2, sculpt=lambda h: tk.push(h, lambda V, N: 0.15 * bands(np.arctan2(V[:, 1] - 1.4 - OFF[1], V[:, 0] - OFF[0]) * 5, 1.0, 0.4) * (V[:, 2] < 10 + OFF[2]))))
cl = tk.tube('collar', [tuple(V3(x, y, 18.4) + OFF) for x, y in ((-4.2, 1.6), (-3.6, -2.0), (-1.4, -3.8), (1.4, -3.8), (3.6, -2.0), (4.2, 1.6), (2.4, 3.8),
                                                                      (-2.4, 3.8))], 1.3, n=8, closed=True)
B.add('body', lowk(cl, 'collar', 40, 'fur', sculpt=lambda h: tk.push(h, lambda V, N: 0.15 * np.sin(V[:, 0] * 5 + V[:, 2] * 4))))
# ------------------------------------------------------------------ the rooftop: duckboards on tar, parapet, chimney stack
base = tk.rbox('roof', (30.0, 24.0, 1.2), centre=(0, 0, 0.6), bevel=0.3, segs=1)
base_hi = tk.rbox('roof_hi', (30.0, 24.0, 1.2), centre=(0, 0, 0.6), bevel=0.3, segs=2)
tk.set_region(base_hi, 'tar')
B.add('base', (base, base_hi))
deck = tk.rbox('deck', (20.0, 15.0, 1.2), centre=(-1.0, -2.6, 1.8), bevel=0.2, segs=1)
deck_hi = tk.rbox('deck_hi', (20.0, 15.0, 1.2), centre=(-1.0, -2.6, 1.8), bevel=0.2, segs=2)
tk.push(deck_hi, lambda V, N: -0.25 * bands(V[:, 0] + 1.0, 2.0, 0.3) * (N[:, 2] > 0.7))
tk.set_region(deck_hi, 'deck')
B.add('base', (deck, deck_hi))
par = tk.rbox('parapet', (30.0, 2.0, 4.2), centre=(0, 11.0, 3.3), bevel=0.3, segs=1)
par_hi = tk.rbox('parapet_hi', (30.0, 2.0, 4.2), centre=(0, 11.0, 3.3), bevel=0.3, segs=2)
tk.set_region(par_hi, 'brick')
B.add('base', (par, par_hi))
ch = tk.rbox('stack', (6.4, 4.4, 13.0), centre=(10.4, 9.4, 7.7), bevel=0.3, segs=1)
ch_hi = tk.rbox('stack_hi', (6.4, 4.4, 13.0), centre=(10.4, 9.4, 7.7), bevel=0.3, segs=2)
tk.set_region(ch_hi, 'brick')
B.add('base', (ch, ch_hi))
for x in (8.9, 11.9):
    B.add('base', turn('pot', [(0, 0), (1.2, 0), (1.0, 1.6), (0.8, 2.6), (1.0, 3.0), (0.6, 3.1), (0, 2.9)], (x, 9.4, 14.2), 'clay', tris=24, n=8))
# ------------------------------------------------------------------ the microphone stand (it leans with the singer)
for a in (90, 210, 330):
    B.add('stand', limb('mleg', [tuple(MIC + (0, 0, 3.0)), tuple(MIC + (2.6 * math.cos(math.radians(a)), 2.6 * math.sin(math.radians(a)), 0.25))], 0.24,
                        tris=8, region='chrome', n=4))
B.add('stand', limb('mpole', [tuple(MIC + (0, 0, 0.6)), tuple(MIC + (0, 0, 20.4))], 0.32, tris=10, region='chrome', n=6))
B.add('stand', limb('mclip', [tuple(MIC + (0, 0, 20.2)), tuple(MIC + (0.2, 0.6, 21.4))], 0.3, tris=8, region='chrome', n=5))
B.add('stand', blob('mic', MIC + (0.3, 0.9, 22.0), 1.0, tris=20, region='grille', squash=(1, 1, 1.25)))
B.commit(F, bones={'body': 'body', 'head': 'head', 'arm_r': 'arm_r', 'arm_l': 'arm_l', 'base': 'root', 'stand': 'stand'})


def make_rig():
    R = M.rig(F, extra=lambda R: R.bone('stand', tuple(MIC + (0, 0, 0.3)), parent='root'))
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l', 'stand']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        k('head', 6)
        k('head', 16, rot=('X', -26), ease='BACK')         # the high note
        k('head', 34, rot=[('X', -24), ('Z', 6)])
        k('head', 44, rot=('X', 6))
        k('head', 50)
        k('stand', 8)
        k('stand', 18, rot=('X', 9), move=(0, 0.6, 0))
        k('stand', 34, rot=('X', 8), move=(0, 0.6, 0))
        k('stand', 46)
        k('arm_r', 8)
        k('arm_r', 18, rot=('X', 8), move=(0, 0.8, 0.2))
        k('arm_r', 34, rot=('X', 8), move=(0, 0.8, 0.2))
        k('arm_r', 46)
        k('arm_l', 8)
        k('arm_l', 18, rot=('Y', -28), ease='BACK')    # the free arm flung out
        k('arm_l', 36, rot=('Y', -24))
        k('arm_l', 48)
        k('body', 10)
        k('body', 18, rot=('X', -5))
        k('body', 34, rot=('X', -4))
        k('body', 46)
        for b in allb:
            k(b, 56)
    return R


def paint(P, pt):
    X, Y, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    paint_member(P, pt, sh, chitin='#1e7a5a', suit='#3a3a44', hair='#6a3a24', ely='#2a8a5a')
    er = P.region('elytra')
    for sx in (1, -1):   # the two red-violet stripes
        P.fill(er & (np.abs(X - OFF[0] - sx * 2.3) < 0.7), pt.ramp('#a8306a', 6, shift=0.08), tone=sh, base=0.2, brush={'preset': 'gloss', 'shine': 0.5})
    ch = P.region('chitin') | P.region('face')
    P.fill(ch & (P.on[:, :, 2] > 0.5), pt.ramp('#c8a838', 6, shift=0.08), tone=sh, base=0.2, brush={'preset': 'gloss', 'shine': 0.6})   # the gold flash
    P.fill('coat', pt.ramp('#c8a87a', 7, shift=0.06), tone=sh, base=0.1, brush={'preset': 'cloth', 'flow': 'down'})
    P.fill('fur', pt.ramp('#4a3226', 6, shift=0.06), tone=sh, base=0.15, brush='fur')
    P.fill('tar', pt.ramp('#4a4a50', 6, shift=0.04), tone=sh, base=0.1)
    P.shift(P.region('tar') & (np.abs(np.sin(X * 1.3 + np.sin(Y * 0.9) * 2)) > 0.94), -1)
    dk = P.region('deck')
    P.fill(dk, pt.ramp('#a07a4a', 6, shift=0.06), tone=sh, base=0.1, brush={'preset': 'wood', 'flow': 'along', 'axis': (0, 1, 0), 'L': 6})
    P.fill(dk & (P.cav > 0.56), pt.ramp('#4a3220', 4), tone=sh, base=0.0, brush=False)
    br = P.region('brick')
    P.fill(br, pt.ramp('#a84a32', 6, shift=0.05), tone=sh, base=0.05)
    row = np.floor(Z / 0.8)
    u = np.where(np.abs(P.on[:, :, 0]) > 0.7, Y, X)
    P.fill(br & ((np.mod(Z, 0.8) < 0.14) | (np.mod(u + 0.9 * (row % 2), 1.8) < 0.14)), pt.ramp('#d0c4ac', 4), tone=sh, base=0.1, brush=False)
    P.fill('clay', pt.ramp('#c0683a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('chrome', pt.ramp('#c0c4cc', 6, light=0.6), tone=sh, base=0.2, brush='metal')
    P.fill('grille', pt.ramp('#b8bcc4', 6, light=0.6), tone=sh, base=0.2, brush='metal')
    P.shift(P.region('grille') & (bands(Z, 0.5, 0.12) | bands(X + Y, 0.5, 0.12)), -1)
    face_at(P, M, 306, size=0.6, mouth='open', dy_m=-2.2)
    P.lines(['coat', 'fur', 'deck'], step=1)
    P.clusters()
    return P.done()


go(F, make_rig, paint, frames=56, skip=[('arm_r', 'stand'), ('stand', 'head'), ('stand', 'body'), ('body', 'base'), ('arm_l', 'base'), ('stand', 'base')],
   cams=[((62, -80, 50), (0, -1, 13)), ((-60, 74, 46), (0, 2, 13))])
