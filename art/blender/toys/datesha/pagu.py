"""おかっぱパグ Bowl-Cut Pug (series datesha, concepts_E.md): the gang's youngest, a fawn pug with a glossy black
bowl cut, in an op-art black-and-white check suit with cropped trousers and red loafers, feet planted wide, arms
crossed, chin up, his curly tail out behind.
Gimmick (pose change): he drops into a lean with both hands up framing his face, the head cocked; then straightens.

    GG_FACET=1 tools/blender.sh art/blender/toys/datesha/pagu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE, '..', 'sabaku'), os.path.join(HERE, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403

tk.reset()
F = Fig('datesha', 'pagu')
B = Build()
GZ = 2.6

# ------------------------------------------------------------------ the plinth; feet planted wide, cropped trousers, bare ankles, loafers
B.add('base', plinth(n=12))
for sx in (1, -1):
    B.add('legs', shoe('loafer', (sx * 4.4, 0.8, GZ - 0.2), (sx * 0.35, -1, 0), L=5.6, W=3.0, H=2.0, region='shoe'))
    B.add('legs', limb('ankle', [(sx * 4.4, 0.2, GZ + 1.4), (sx * 4.2, 0.2, GZ + 3.2)], 1.4, tris=8, region='fur', n=6))
    B.add('legs', limb('leg', [(sx * 4.2, 0.2, GZ + 3.0), (sx * 3.4, 0.4, 9.6), (sx * 2.6, 0.6, 13.0)], [2.2, 2.4, 2.8], tris=20, region='suit', n=8))

# ------------------------------------------------------------------ the stout body, jacket buttoned, the curly tail
TORSO = [dict(c=(0, 0.6, 12.6), w=10.4, h=4.8), dict(c=(0, 0.2, 16.2), w=11.6, ht=5.6, hb=5.2), dict(c=(0, 0.0, 19.8), w=11.8, h=5.0),
         dict(c=(0, 0.0, 22.8), w=12.4, ht=4.4, hb=4.4, e=2.6), dict(c=(0, 0.0, 24.4), w=7.0, h=3.4)]
B.add('body', low(tk.loft('torso', TORSO, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 160, lo=1, hi=3, region='suit',
                  sculpt=lambda h: tk.push(h, lambda V, N: -0.25 * np.exp(-((V[:, 0] - 0.6 + 0.3 * (V[:, 2] - 18)) / 0.3) ** 2) * (N[:, 1] < -0.4) * (V[:, 2] > 13.4))))
B.add('body', limb('tail', [(0, 5.0, 15.0), (0, 7.2, 16.6), (0.4, 7.4, 18.6), (0.2, 5.8, 19.2), (0, 5.2, 18.0)], [1.4, 1.4, 1.2, 1.0, 0.6], tris=18,
                   region='fur', n=6))

# ------------------------------------------------------------------ the arms crossed over his chest
SR, SL = V3(-6.2, 0.0, 22.2), V3(6.2, 0.0, 22.2)
ARM = {}
for nm, sx, s_, z in (('arm_r', -1, SR, 19.4), ('arm_l', 1, SL, 20.8)):
    el = s_ + (sx * 1.4, -3.4, -4.0)
    wr = V3(-sx * 3.6, -5.8, z)
    ARM[nm] = [limb(nm, [s_, el, wr], [2.4, 2.2, 1.9], tris=26, region='suit', n=8),
               limb(nm + '_cuff', [wr, wr + (-sx * 0.6, 0.1, 0)], 2.0, tris=8, region='shirt', n=8, cap0='flat', cap1='flat'),
               blob(nm + '_hand', wr + (-sx * 1.6, 0.4, 0.2), 1.4, tris=12, region='fur', squash=(1.1, 0.9, 0.9))]
for nm, pcs in ARM.items():
    B.add(nm, *pcs)

# ------------------------------------------------------------------ the head: the round pug head, the squashed muzzle, the bowl cut
NECK = (0, 0.0, 24.2)
head = tk.loft('head', [dict(c=(0, 2.4, 29.4), w=9.6, h=4.6), dict(c=(0, -0.4, 29.4), w=11.2, ht=5.0, hb=4.6), dict(c=(0, -3.6, 28.4), w=9.6, ht=3.6, hb=3.8),
                        dict(c=(0, -5.0, 27.8), w=6.6, ht=2.4, hb=2.6)], n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)


def sc_head(h):
    def f(V, N):
        d = -0.3 * np.exp(-((V[:, 2] - 30.0 - 0.08 * V[:, 0] ** 2) / 0.35) ** 2) * (V[:, 1] < -3)                    # the brow wrinkle
        d += 0.4 * tk.bump(V, (2.0, -5.4, 27.2), 1.6, 0.6) + 0.4 * tk.bump(V, (-2.0, -5.4, 27.2), 1.6, 0.6)           # the jowls
        return d
    tk.push(h, f)


HP = [low(head, 'head', 110, lo=1, hi=3, sculpt=sc_head, region=('fur', [('mask', lambda C, N: C[:, 1] < -4.2)])),
      blob('nose', (0, -6.0, 28.6), 0.9, tris=10, region='nose', squash=(1.3, 0.7, 0.8))]
for sx in (1, -1):
    HP.append(ear('ear', (sx * 4.4, 0.4, 32.0), (sx * 6.2, -1.0, 30.0), 3.0, th=0.8, region='mask', tris=10, cup=(sx * 0.4, 0, -1)))
bowl = tk.lathe('bowl', [(0, 0), (6.4, 0), (6.6, 1.6), (6.0, 3.6), (4.0, 5.2), (0, 5.6)], n=16, centre=(0, 0.0, 29.8))
tk.bisect(bowl, (0, 0, 0), (0, 0, 1), keep='+', fill=True)
tk.deform(bowl, lambda V: V + np.stack([0 * V[:, 0], 0 * V[:, 0], -1.8 * (V[:, 1] > -1.0) * tk.smoothstep(29.8, 31.6, V[:, 2]) * 0], 1))
HP.append(low(bowl, 'bowl', 60, lo=1, hi=3, region='hair',
              sculpt=lambda h: tk.push(h, lambda V, N: -0.15 * (np.abs(np.sin(np.arctan2(V[:, 0], V[:, 1]) * 18)) > 0.9))))
B.add('head', *HP)
B.commit(F, bones={'base': 'root', 'legs': 'root'})


# ------------------------------------------------------------------ rig and the gimmick clip (the pose change)
def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0.5))
    R.bone('body', (0, 0.4, 13.0), parent='root')
    R.bone('head', NECK, parent='body')
    R.bone('arm_r', tuple(SR), parent='body')
    R.bone('arm_l', tuple(SL), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    allb = ['root', 'body', 'head', 'arm_r', 'arm_l']
    with R.action('gimmick'):
        for b in allb:
            k(b, 0)
        # pose B: lean in, both hands up framing his face, head cocked
        B_ = {'body': [('X', 12), ('Y', 6)], 'head': [('Y', -16), ('X', -10)]}
        for nm, sx, s_, z in (('arm_r', -1, SR, 19.4), ('arm_l', 1, SL, 20.8)):
            a = V3(-sx * 3.6, -5.8, z) - s_                       # the crossed wrist ...
            b = V3(sx * 5.0, -6.4, 29.4) - s_                     # ... swung up beside his face
            ax = np.cross(a, b)
            B_[nm] = [(tuple(ax / np.linalg.norm(ax)), float(np.degrees(np.arccos(np.dot(a, b) / np.linalg.norm(a) / np.linalg.norm(b)))))]
        for b, r in B_.items():
            k(b, 6)
            k(b, 16, rot=r, ease='BACK')
            k(b, 60, rot=r)
            k(b, 72)
        for b in allb:
            k(b, 80)
    return R


# ------------------------------------------------------------------ paint
def paint(P, pt):
    import face
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    P.fill('marble', pt.ramp('#e9e4da', 6, shift=0.04), tone=sh, base=0.1)
    mb = P.region('marble') & (P.on[:, :, 2] > 0.5)
    P.tint(mb & ((np.floor(X / 3.0) + np.floor(Yc / 3.0)) % 2 == 0), pt.ramp('#2a2a30', 6, shift=0.05), sh)
    P.fill('suit', pt.ramp('#efeae0', 6, shift=0.03), tone=sh, base=0.1)
    su = P.region('suit')
    # op-art checks that swell and shrink across the body
    cx_, cz_ = X * (1.0 + 0.08 * np.cos(Z * 0.3)), Z * (1.0 + 0.06 * np.cos(X * 0.4))
    P.tint(su & ((np.floor(cx_ / 1.6) + np.floor(cz_ / 1.6) + np.floor(Yc / 1.6)) % 2 == 0), pt.ramp('#25232a', 6, shift=0.05), sh)
    P.fill('shirt', pt.ramp('#c8343a', 6, shift=0.06), tone=sh, base=0.1)
    P.fill('shoe', pt.ramp('#b8303a', 6, shift=0.06), tone=sh, base=0.15, brush='gloss')
    P.fill('fur', pt.ramp('#d9b98a', 7, shift=0.05), tone=sh, base=0.1, brush='fur')
    P.fill('mask', pt.ramp('#3a302c', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('nose', pt.ramp('#1a1618', 5, light=0.6), tone=sh, base=0.3)
    P.fill('hair', pt.ramp('#1e1e26', 7, shift=0.06, light=0.6), tone=sh, base=0.2, brush={'preset': 'gloss', 'flow': 'down'})
    # the face: wide-apart dots, a stubborn little frown on the black mask
    hd = (P.region('fur') | P.region('mask')) & (Z > 25.5)
    fc = face.Face(P, c=(0, -5.4, 29.6), axis=(0, -1, 0.1), where=hd, seed=1121, ink='#1e1a18')
    fc.eyes('dot', spread=6.8, size=0.7, dy=0.4, uneven=0.3)
    fm = face.Face(P, c=(0, -6.4, 27.0), axis=(0, -1, 0.0), where=P.region('mask'), seed=1122, ink='#efe4c8')
    fm.mouth('frown', w=1.8, dy=-0.4, weight=0.28)
    P.lines(['suit', 'shirt'], ['fur', 'mask', 'shoe'], step=1)
    P.lines(['hair'], step=1)
    P.clusters()
    return P.done()


run(F, make_rig, paint, frames=80, skip=[('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('arm_r', 'arm_l'), ('arm_r', 'head'), ('arm_l', 'head'),
                                         ('body', 'legs'), ('legs', 'base'), ('body', 'base')], fold=(0, 16, 40, 76))
