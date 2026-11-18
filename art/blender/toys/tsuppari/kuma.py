"""番長グマ Banchō Bear: series tsuppari, Tsuppari Zoo (concepts_B.md).

The gang's boss: a big brown bear in a floor-length black coat embroidered with 番 across the back, a battered school
cap pushed back between his ears, a sticking plaster on his cheek, geta, and a scowl. He holds his coat shut. Up in
the V of its lapels, out of the white sarashi round his belly, a stray kitten peeks out.
Gimmick: he flings the coat open (red lining, gold embroidery): the kitten pops out and waves, he looks away, coat shut.

    tools/blender.sh art/blender/toys/tsuppari/kuma.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import ak  # noqa: E402

F = bk.start('tsuppari', 'kuma')

# ------------------------------------------------------------------ geta, the thongs, round bear feet, trouser cuffs
GX, GY = 4.8, -1.6
low, high = [], []
for sx in (1, -1):
    cx = sx * GX
    high.append(tk.rbox('geta_hi', (6.6, 12.6, 1.8), centre=(cx, GY, 2.7), bevel=0.45, segs=2))
    low.append(tk.rbox('geta', (6.6, 12.6, 1.8), centre=(cx, GY, 2.7), bevel=0.3, segs=1))
    for ty in (-3.6, 3.6):
        high.append(tk.rbox('tooth_hi', (6.2, 1.4, 1.9), centre=(cx, GY + ty, 0.95), bevel=0.25, segs=1))
        low.append(tk.rbox('tooth', (6.2, 1.4, 1.9), centre=(cx, GY + ty, 0.95), bevel=0, segs=0))
    for h_ in high[-3:]:
        tk.set_region(h_, 'geta')
    fc_ = (cx, GY - 0.6, 3.5)
    paw = tk.lathe('foot', [(0, 0), (2.6, 0.0), (2.9, 1.2), (2.3, 2.5), (0, 3.0)], n=10, centre=fc_)
    tk.scale(paw, (1.0, 1.45, 1.0), pivot=fc_)
    ph = tk.copy(paw, 'foot_hi')
    tk.subsurf(ph, 2)
    tk.push(ph, lambda V, N, cx=cx: -0.3 * (np.abs(np.cos((V[:, 0] - cx) * 2.0)) < 0.25) * (V[:, 1] < GY - 3.6))  # toes
    tk.set_region(ph, 'fur')
    tk.decimate(paw, 34)
    low.append(paw)
    high.append(ph)
    for seg in ([(cx - 3.0, GY + 0.4, 3.5), (cx - 2.4, GY - 0.9, 5.3), (cx, GY - 3.0, 5.9), (cx, GY - 4.6, 3.5)],
                [(cx, GY - 3.0, 5.9), (cx + 2.4, GY - 0.9, 5.3), (cx + 3.0, GY + 0.4, 3.5)]):
        h_ = tk.tube('hanao_hi', seg, 0.55, n=8)
        tk.subsurf(h_, 1)
        tk.set_region(h_, 'hanao')
        high.append(h_)
        low.append(tk.tube('hanao', seg, 0.55, n=4, cap0=None, cap1=None))
    lo, hi = ak.spine('cuff', [(cx, GY + 0.2, 5.0), (cx * 0.95, GY + 1.0, 8.0)], [5.4, 6.4], [2.8, 3.2], n=8, up=(0, -1, 0), tris=24,
                      region='pants', cap0='round', cap1='flat')
    low.append(lo)
    high += hi

# ------------------------------------------------------------------ the bear inside: a white sarashi round the belly
TORSO = [(7.0, 0.6, 13.6, 6.0, 6.4, 2.2), (14.0, 0.2, 14.4, 7.0, 6.6, 2.2), (21.0, -0.4, 14.2, 7.6, 6.0, 2.2),
         (27.0, -0.2, 13.2, 7.4, 5.6, 2.2), (31.4, 0.2, 9.6, 5.0, 4.6, 2.0)]


def sc_torso(h):
    def f(V, N):
        z = V[:, 2]
        band = (z > 12.5) & (z < 24.5)
        return 0.25 * band * (np.mod(z - 12.5, 2.4) < 0.25) + 0.2 * band + 0.3 * tk.bump(V, (0, -6.0, 28.0), 4.0, 1.0)
    tk.push(h, f)


tor_lo, tor_hi = ak.stack('torso', TORSO, n=14, tris=110, sculpt=sc_torso, region='fur')
tk.regions(tor_hi[0], 'fur', [('sarashi', lambda C, N: (C[:, 2] > 12.5) & (C[:, 2] < 24.5))])
low.append(tor_lo)
high += tor_hi

# ------------------------------------------------------------------ the long coat: the back half, its lining showing at the cut
COAT = [(5.2, 0.6, 21.4, 9.8, 9.2, 2.4), (10.0, 0.4, 19.4, 9.0, 8.6, 2.4), (16.0, 0.0, 18.4, 8.8, 8.2, 2.4),
        (22.0, -0.2, 19.4, 9.0, 7.8, 2.4), (27.0, 0.0, 21.2, 8.2, 7.4, 2.4), (30.6, 0.2, 17.0, 6.6, 6.0, 2.4),
        (32.6, 0.4, 11.2, 5.0, 5.0, 2.0)]
YCUT = -4.0
TOPZ, BOTZ = 30.4, 5.4


def x_edge(z):
    cy, w, ht, hb = ak.stack_at(COAT, z)
    r = min(0.999, (cy - YCUT) / ht)
    return (1 - r ** 2.4) ** (1 / 2.4) * w / 2


def sc_coat(h):
    def f(V, N):
        z = V[:, 2]
        back = tk.smoothstep(0.2, 0.7, N[:, 1])
        d = 0.3 * np.cos(np.arctan2(V[:, 0], V[:, 1]) * 7.0) ** 6 * tk.smoothstep(18.0, 8.0, z) * back   # the skirt's folds
        d -= 0.3 * np.exp(-((z - 6.2) / 0.3) ** 2)                                                       # the hem stitching
        d -= 0.25 * np.exp(-((z - 27.6 + 0.1 * np.abs(V[:, 0])) / 0.3) ** 2) * (np.abs(V[:, 0]) > 5.0)   # shoulder seams
        return d
    tk.push(h, f)


coat_lo, coat_hi = ak.stack('coat', COAT, n=20, tris=250, sculpt=sc_coat, region='coat', cap0='flat', cap1='round')
for o in [coat_lo] + coat_hi:
    tk.bisect(o, (0, YCUT, 0), (0, 1, 0), keep='+', fill=True)
tk.regions(coat_hi[0], 'coat', [('lining', lambda C, N: (N[:, 1] < -0.9) & (np.abs(C[:, 1] - YCUT) < 0.08))])
col_lo, col_hi = ak.stack('collar', [(31.2, 0.4, 12.0, 5.6, 5.6, 2.2), (34.4, 0.5, 11.4, 5.2, 5.2, 2.2)], n=12, tris=48,
                          region='coat', cap0=None, cap1=None)
low += [coat_lo, col_lo]
high += coat_hi + col_hi

# ------------------------------------------------------------------ the front panels (hinged at the side seams) and arms
PANELS = {}
for nm, sx in (('flap_r', 1), ('flap_l', -1)):
    class _Out:
        z = (TOPZ, BOTZ)

        def __call__(s, v, sx=sx):
            z = TOPZ + (BOTZ - TOPZ) * v
            xin = 0.05 + max(0.0, 3.8 * (1 - v / 0.3))      # the lapels' V at the top
            xe = x_edge(z) + 0.25
            return (xin, xe) if sx > 0 else (-xe, -xin)
    lo, hi = ak.shell('panel_' + nm[-1], COAT, _Out(), gap=0.25, th=0.75, nu=7, nv=8, tris=64, region='panel', ripple=0.08)
    # the arm: down from the shoulder, the paw holding the coat's front edge shut at the waist
    sh = (sx * 9.4, -2.8, 27.6)
    a_lo, a_hi, hc = tt.arm('arm_' + nm[-1], [sh, (sx * 11.2, -5.4, 21.4), (sx * 6.4, -10.4, 17.4)], r=2.7, hand=2.4, tris=52,
                            region='coat', hand_region='fur', mitt=(-sx * 0.3, -0.4, 0.85))
    top = np.array((x_edge(TOPZ) * sx, YCUT, TOPZ))
    bot = np.array((x_edge(BOTZ) * sx, YCUT, BOTZ))
    PANELS[nm] = (lo, hi, a_lo, a_hi, top, bot)

# ------------------------------------------------------------------ the head: a big round bear head, muzzle, ears, cap
HZ = 40.6
HEAD = [(0, 4.4, HZ - 0.2), (0, 1.4, HZ + 0.3), (0, -2.4, HZ), (0, -5.6, HZ - 1.6), (0, -7.8, HZ - 2.0)]
head_lo, head_hi = ak.spine('head', HEAD, [9.6, 16.6, 16.6, 8.8, 6.0], [5.6, 7.8, 7.4, 3.6, 2.6], [5.4, 7.4, 7.0, 3.7, 2.6],
                            e=2.3, n=14, up=(0, 0, 1), tris=190, region='fur')


def sc_head(V, N):
    d = np.zeros(len(V))
    for sx in (1, -1):
        d += tk.bump(V, (sx * 6.4, -2.4, HZ - 3.0), 3.6, 0.8)          # jowls
        d += tk.bump(V, (sx * 2.8, -6.2, HZ + 2.6), 2.4, 0.5)          # the scowling brow
    d += tk.bump(V, (0, -8.4, HZ - 1.2), 1.6, 0.6)                      # the nose
    d += 0.1 * np.cos(V[:, 0] * 4.0 + V[:, 2] * 2.0) ** 8 * tk.smoothstep(-0.2, 0.4, N[:, 1])  # fur grain on the back
    return d


tk.push(head_hi[0], sc_head)
tk.regions(head_hi[0], 'fur', [('muzzle', lambda C, N: (C[:, 1] < -5.6) & (C[:, 2] < HZ + 0.4) & (np.abs(C[:, 0]) < 3.4))])
ears_lo, ears_hi = [], []
for sx in (1, -1):
    c = (sx * 6.9, 0.6, HZ + 5.4)
    for nm_, n_, lst in (('ear', 7, ears_lo), ('ear_hi', 16, ears_hi)):
        o = tk.lathe(nm_, [(0, -0.8), (2.1, -0.6), (2.5, 0.0), (2.1, 0.6), (0, 0.8)], n=n_, axis='Y', centre=c)
        tk.rotate(o, sx * -30, 'Y', pivot=c)
        lst.append(o)
    tk.subsurf(ears_hi[-1], 1)
    tk.push(ears_hi[-1], lambda V, N, c=c: -0.5 * np.exp(-((V[:, 0] - c[0]) ** 2 + (V[:, 2] - c[2]) ** 2) / 2.0) * (V[:, 1] < c[1]))
    tk.set_region(ears_hi[-1], 'fur')
# the school cap, pushed back: crown, band, a cracked visor, the badge
CAPC = (0, 0.4, HZ + 6.4)
cap_prof = [(0, 0.0), (5.8, 0.0), (6.0, 1.4), (6.6, 3.0), (6.4, 3.6), (0, 3.7)]
cap_hi = tk.lathe('cap_hi', cap_prof, n=24, centre=CAPC)
tk.subsurf(cap_hi, 1)
cap_lo = tk.lathe('cap', cap_prof, n=12, centre=CAPC)
tk.push(cap_hi, lambda V, N: -0.25 * np.exp(-((V[:, 2] - CAPC[2] - 1.5) / 0.3) ** 2) + 0.2 * np.cos(np.arctan2(V[:, 0], V[:, 1]) * 3) * (V[:, 2] > CAPC[2] + 3.0))
tk.regions(cap_hi, 'cap', [('band', lambda C, N: C[:, 2] < CAPC[2] + 1.45)])
vis = [(-4.4, 0.0), (-3.0, -2.4), (0.0, -3.4), (3.0, -2.4), (4.4, 0.0)]
vis_hi = tk.slab('visor_hi', vis, 0.6, plane='XY', at=CAPC[2] + 0.4, bevel=0.2, segs=1)
vis_lo = tk.slab('visor', vis, 0.6, plane='XY', at=CAPC[2] + 0.4, bevel=0, segs=0)
for o in (vis_hi, vis_lo):
    tk.move(o, (0, CAPC[1] - 5.6, 0))
    tk.rotate(o, -6, 'X', pivot=(0, CAPC[1] - 5.6, CAPC[2] + 0.4))
tk.set_region(vis_hi, 'visor')
for o in (cap_hi, cap_lo, vis_hi, vis_lo):
    tk.rotate(o, -16, 'X', pivot=(0, CAPC[1] + 2.0, CAPC[2]))
    tk.rotate(o, 6, 'Y', pivot=CAPC)

# ------------------------------------------------------------------ the kitten in his lapels, a paw ready to wave
K = (0.6, -7.2, 26.4)
kh_prof = [(0, -2.4), (2.0, -2.0), (2.7, -0.4), (2.4, 1.2), (1.4, 2.2), (0, 2.5)]
kit_hi = [tk.lathe('kit_hi', kh_prof, n=16, centre=K)]
kit_lo = [tk.lathe('kit', kh_prof, n=8, centre=K)]
for o in kit_hi + kit_lo:
    tk.scale(o, (1.12, 0.9, 0.95), pivot=K)
tk.subsurf(kit_hi[0], 1)
tk.push(kit_hi[0], lambda V, N: tk.bump(V, (K[0], K[1] - 2.4, K[2] - 0.6), 1.1, 0.5))  # the little muzzle
for sx in (1, -1):
    base = np.array((K[0] + sx * 1.5, K[1] + 0.2, K[2] + 1.6))
    tip = base + (sx * 0.9, -0.2, 2.2)
    for nm_, lst, n_ in (('kear_hi', kit_hi, 8), ('kear', kit_lo, 4)):
        lo_, hi_ = ak.spine(nm_, [tuple(base), tuple((base + tip) / 2), tuple(tip)], [2.0, 1.4, 0.2], 0.55, n=n_, up=(0, -1, 0), tris=12,
                            region='kitten', cap0='round', cap1='point')
        if nm_.endswith('hi'):
            lst += hi_
        else:
            lst.append(lo_)
for o in kit_hi:
    tk.set_region(o, 'kitten')
KP0 = (K[0] - 2.0, K[1] - 0.6, K[2] - 1.8)
kp_lo, kp_hi = ak.spine('kpaw', [KP0, (K[0] - 3.0, K[1] - 1.4, K[2] - 0.2), (K[0] - 3.4, K[1] - 1.8, K[2] + 0.9)], [1.6, 1.4, 1.5], 0.75,
                        n=8, up=(0, -1, 0), tris=24, region='kitten', cap0='round', cap1='round')

# ------------------------------------------------------------------ parts
F.part('body', tk.join(low, 'body'), high)
F.part('head', tk.join([head_lo] + ears_lo + [cap_lo, vis_lo], 'head'), head_hi + ears_hi + [cap_hi, vis_hi], bone='head')
for nm, (lo, hi, a_lo, a_hi, top, bot) in PANELS.items():
    F.part(nm, tk.join([lo, a_lo], nm), hi + a_hi, bone=nm)
F.part('kitten', tk.join(kit_lo, 'kitten'), kit_hi, bone='kitten')
F.part('kpaw', kp_lo, kp_hi, bone='kpaw')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('head', (0, 0.0, 33.6), parent='root')
    for nm, (lo, hi, a_lo, a_hi, top, bot) in PANELS.items():
        R.bone(nm, tuple(top), parent='root')
    R.bone('kitten', (K[0], K[1] + 2.0, K[2] - 2.0), parent='root')
    R.bone('kpaw', KP0, parent='kitten')
    for p in F.parts:
        R.attach(p.low, p.bone)
    k = R.key
    hinge = {nm: tuple((v[5] - v[4]) / np.linalg.norm(v[5] - v[4])) for nm, v in PANELS.items()}
    with R.action('gimmick'):
        bones = ['root', 'head', 'flap_r', 'flap_l', 'kitten', 'kpaw']
        for b in bones:
            k(b, 0)
        # 0-8 he hunches, scowls; 8-18 the coat flies open (both sides swing out on their side seams)
        k('head', 7, rot=('X', 6))
        for nm, s_ in (('flap_r', 1), ('flap_l', -1)):
            k(nm, 7, rot=[(hinge[nm], s_ * 4)])
            k(nm, 17, rot=[(hinge[nm], -s_ * 72)], ease='BACK')
            k(nm, 52, rot=[(hinge[nm], -s_ * 72)])
            k(nm, 62, ease='BOUNCE')
        # 14-50 the kitten pops up and waves; he looks away, embarrassed
        k('kitten', 12)
        k('kitten', 19, move=(0, -1.6, 1.4), ease='BACK')
        k('kitten', 50, move=(0, -1.6, 1.4))
        k('kitten', 58)
        k('kpaw', 18)
        for i, f in enumerate((23, 28, 33, 38, 43)):
            k('kpaw', f, rot=('Y', 28 if i % 2 == 0 else -8))
        k('kpaw', 48)
        k('head', 18, rot=[('Z', -22), ('X', -4)])
        k('head', 48, rot=[('Z', -22), ('X', -4)])
        k('head', 58)
        for b in bones:
            k(b, 70)
    return R


import paint as pt  # noqa: E402


def glyph(name):
    g = np.load(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'glyphs.npz'))[name]
    return g


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    GOLD = pt.ramp('#d6a640', 6, dark=0.6, light=0.6, shift=0.08)
    COAT_ = pt.ramp('#211f28', 7, shift=0.08, light=0.5)
    RED = pt.ramp('#a3222c', 6, shift=0.06)
    P.fill('coat', COAT_, tone=sh, base=0.0)
    P.fill('panel', COAT_, tone=sh, base=0.0)
    inside = P.region('panel') & (P.on[:, :, 1] > 0.3)
    P.fill(inside, RED, tone=sh, base=0.05)
    P.fill('lining', RED, tone=sh, base=0.0)
    # gold-thread embroidery: 番 big across the back in a ring; flames up the lining; a line round the hem
    d = bk.Decal(P, (0, 9.0, 18.0), (0, 1, 0), where=P.region('coat'))
    g = glyph('ban')
    gh, gw = g.shape
    u, v = -d.U, d.V                                    # (seen from behind: u to the viewer's right)
    s_ = 9.0 / gh
    gi = np.clip(((4.5 - v) / s_).astype(int), 0, gh - 1)
    gj = np.clip(((u + gw * s_ / 2) / s_).astype(int), 0, gw - 1)
    on = d.m & (np.abs(v) < 4.5) & (np.abs(u) < gw * s_ / 2) & g[gi, gj]
    P.fill(on, GOLD, tone=sh, base=0.1)
    P.fill(d.ring(0, 0, 6.6, 0.7), GOLD, tone=sh, base=0.1)
    lin = P.region('lining') | inside
    P.fill(lin & (np.sin(Z * 1.3 + np.abs(X) * 0.8) * np.cos(Z * 0.5 - X) > 0.55), GOLD, tone=sh, base=0.0)
    P.fill((P.region('coat') | P.region('panel')) & (np.abs(Z - 6.8) < 0.3), GOLD, tone=sh, base=0.0)
    P.fill('fur', pt.ramp('#7a5232', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('muzzle', pt.ramp('#c9a274', 6, shift=0.05), tone=sh, base=0.1)
    P.fill('sarashi', pt.ramp('#ece6da', 6, shift=0.04), tone=sh, base=0.15)
    P.fill('pants', pt.ramp('#2a2c36', 6, shift=0.06), tone=sh, base=0.0)
    P.fill('geta', pt.ramp('#c39a63', 7, shift=0.06), tone=sh + 0.18 * (np.sin(Yc * 5.0 + np.sin(X * 2) * 0.8) > 0.6), base=0.0)
    P.fill('hanao', pt.ramp('#26242a', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('cap', pt.ramp('#26252e', 6, shift=0.06), tone=sh, base=0.05)
    P.fill('band', pt.ramp('#18171c', 5, shift=0.05), tone=sh, base=0.0)
    P.fill('visor', pt.ramp('#141317', 5, shift=0.05, light=0.6), tone=sh * 1.3, base=0.0)
    P.fill(P.region('band') & (np.hypot(X - 0.5, Z - (CAPC[2] + 0.6)) < 0.9) & (Yc < 0), GOLD, tone=sh, base=0.15)  # badge
    # a little ginger tabby with a white muzzle and chest
    P.fill('kitten', pt.ramp('#df9a52', 6, shift=0.05), tone=sh, base=0.1)
    P.fill(P.region('kitten') & (np.sin(np.arctan2(X - K[0], Yc - K[1]) * 9.0) > 0.5) & (Z > K[2] + 1.0), pt.ramp('#b0602a', 5), tone=sh, base=0.0)
    P.fill(P.region('kitten') & (np.hypot(X - K[0], (Z - K[2] + 1.2) * 1.3) < 1.5) & (Yc < K[1] - 1.0), pt.ramp('#f2ebe0', 5), tone=sh, base=0.15)
    # the faces: his scowl (a plaster on his cheek), the kitten's open little mouth
    import face
    fc = face.Face(P, c=(0.0, -7.6, HZ + 1.4), axis=(0, -1, 0.15), where=P.region('fur'), seed=611)
    fc.eyes('dot', spread=6.8, size=0.62, dy=0.2)
    fc.brows('angry', spread=7.2, dy=2.0, w=2.6, weight=0.55)
    fc.patch(4.8, -1.8, 1.7, 0.75, '#e6c9a0', rot=-18)       # the sticking plaster
    sn = face.Face(P, c=(0.0, -9.0, HZ - 1.0), axis=(0, -1, 0.1), where=P.region('muzzle') | P.region('fur'), seed=612)
    sn.nose('button', dy=0.2, size=0.95)
    sn.snout_mouth('Y', dy=-0.9, w=1.8)
    kf = face.Face(P, c=(K[0], K[1] - 2.6, K[2] + 0.2), axis=(0, -1, 0.1), where=P.region('kitten'), seed=613)
    kf.eyes('dot', spread=2.8, size=0.36, dy=0.5)
    kf.nose('tri', dy=-0.4, size=0.35, col='#d98a8a')
    kf.snout_mouth('cat', dy=-0.8, w=0.9, weight=0.25)
    P.lines(['hanao', 'band', 'visor', 'sarashi'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('head', 'body'), ('flap_r', 'body'), ('flap_l', 'body'), ('kitten', 'body'), ('kpaw', 'kitten'),
                                 ('kpaw', 'body')],
       cam=((66, -92, 58), (0, 0, 26)), fold=(0, 8, 20, 40), frames=70)
