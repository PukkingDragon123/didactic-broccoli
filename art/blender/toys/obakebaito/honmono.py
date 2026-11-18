"""ほんもの The Real One: series obakebaito, Haunted House Part-Timers (concepts_B.md). The secret.

Front: a little ghost child in a white burial kimono (folded the wrong way, right over left), the white triangle on
its brow, long black hair, hands up and limp at the wrists, its legs fading into a wisp that curls down to the stage,
a will-o'-the-wisp flame bobbing on a thread of mist from its sleeve. Turn it round: nobody. An empty crate, a cold
cup of tea, the 休憩中 note, and a happi coat hanging on a nail. Everyone else went home.
Gimmick: it rises, sways and glows (light-up), the wisp circling it; then it sinks back. A playset stage block.

    tools/blender.sh art/blender/toys/obakebaito/honmono.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'teruteru', 'kit'))
import bk  # noqa: E402  (lib on the path, bpy first)
import numpy as np  # noqa: E402
import tk  # noqa: E402
import tt  # noqa: E402
import ak  # noqa: E402
import kit  # noqa: E402
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'tsuppari'))
import _ob as ob  # noqa: E402
import _gl as gl  # noqa: E402

F = bk.start('obakebaito', 'honmono')
SZ, FY, FH = ob.SZ, ob.FY, ob.FH
st = ob.stage(F)

# ------------------------------------------------------------------ behind the flat: nobody (a crate, cold tea, a coat on a nail)
CR = (5.4, 8.8, SZ)
cr_hi = tk.rbox('crate_hi', (7.0, 6.0, 4.2), centre=(CR[0], CR[1], SZ + 2.1), bevel=0.3, segs=1)
tk.push(cr_hi, lambda V, N: -0.2 * (np.abs(np.mod(V[:, 2] - SZ, 1.4) - 0.7) > 0.62) * (np.abs(N[:, 2]) < 0.5))
tk.set_region(cr_hi, 'ply')
st['hi'].append(cr_hi)
st['lo'].append(tk.rbox('crate', (7.0, 6.0, 4.2), centre=(CR[0], CR[1], SZ + 2.1), bevel=0, segs=0))
CUP = (3.6, 9.6, SZ + 4.2)
cu_hi = tk.lathe('cup_hi', [(0, 0), (0.9, 0.0), (1.1, 1.6), (0.9, 1.7), (0.8, 1.4), (0, 1.4)], n=12, centre=CUP)
tk.set_region(cu_hi, 'cup')
st['hi'].append(cu_hi)
st['lo'].append(tk.lathe('cup', [(0, 0), (0.9, 0.0), (1.1, 1.6), (0, 1.5)], n=6, centre=CUP))
COAT = (-6.4, FY + 1.6, SZ + 16.0)
coat_out = [(-3.6, 0.0), (3.6, 0.0), (4.4, -3.6), (3.4, -4.2), (2.6, -2.6), (2.4, -9.0), (-2.4, -9.0), (-2.6, -2.6), (-3.4, -4.2), (-4.4, -3.6)]
ch_hi = tk.slab('hcoat_hi', coat_out, 0.8, plane='XZ', at=0.0, bevel=0.25, segs=1)
ch_lo = tk.slab('hcoat', coat_out, 0.8, plane='XZ', at=0.0, bevel=0, segs=0)
for o in (ch_hi, ch_lo):
    tk.move(o, COAT)
tk.subsurf(ch_hi, 1)
tk.push(ch_hi, lambda V, N: 0.2 * np.cos((V[:, 0] - COAT[0]) * 1.6) ** 6 * (V[:, 2] < COAT[2] - 3.0))  # hanging folds
tk.set_region(ch_hi, 'happi')
nl_lo, nl_hi = ak.spine('nail', [(COAT[0], FY + 0.6, COAT[2] + 0.6), (COAT[0], FY + 2.6, COAT[2] + 0.9)], 0.6, 0.3, n=5, up=(0, 0, 1), tris=8,
                        region='peg', cap0='round', cap1='round')
st['lo'] += [ch_lo, nl_lo]
st['hi'] += [ch_hi] + nl_hi

# ------------------------------------------------------------------ the ghost child: a wisp, a white kimono, hands up and limp
GX, GY = -0.6, -5.4
g_lo, g_hi = [], []
wisp = [(GX + 3.2, GY - 1.6, SZ + 0.3), (GX + 4.6, GY - 0.4, SZ + 2.6), (GX + 3.0, GY + 0.4, SZ + 5.0), (GX + 0.6, GY, SZ + 7.2), (GX, GY, SZ + 9.4)]
ws_lo, ws_hi = ak.spine('wisp', wisp, [1.2, 2.4, 3.6, 5.2, 7.4], [0.6, 1.2, 1.8, 2.6, 3.4], n=10, up=(0, -1, 0), tris=44, region='robe',
                        cap0='round', cap1='round')
tk.push(ws_hi[0], lambda V, N: 0.18 * np.cos(np.arctan2(V[:, 1] - GY, V[:, 0] - GX) * 3 + V[:, 2] * 1.4) ** 6)  # swirls of mist
GB = [(SZ + 8.4, GY, 7.6, 3.6, 3.4, 2.0), (SZ + 12.0, GY, 8.4, 3.8, 3.4, 2.1), (SZ + 15.6, GY + 0.2, 7.8, 3.4, 3.2, 2.2),
      (SZ + 17.4, GY + 0.2, 4.2, 2.0, 2.0, 2.0)]


def sc_robe(h):
    def f(V, N):
        z = V[:, 2]
        d = 0.3 * np.exp(-((z - SZ - 11.6) / 0.45) ** 2)                                            # the sash
        # the collar, right over left (the dead's way), down to the sash
        d -= 0.3 * np.exp(-((V[:, 0] - GX + 0.6 + (z - SZ - 17.0) * 0.45) / 0.25) ** 2) * (z > SZ + 12.0) * (V[:, 1] < GY - 1.0)
        return d
    tk.push(h, f)


gb_lo, gb_hi = ak.stack('robe', [(z, cy, w, ht, hb, e) for z, cy, w, ht, hb, e in GB], n=14, tris=90, sculpt=sc_robe, region='robe',
                        cap0='round', cap1='round')
for o in [gb_lo] + gb_hi:
    tk.move(o, (GX, 0, 0))
g_lo += [ws_lo, gb_lo]
g_hi += ws_hi + gb_hi
HC = np.array((GX, GY - 0.2, SZ + 21.0))
hp = [(0, -3.3), (2.5, -2.8), (3.4, -0.4), (3.1, 1.6), (1.9, 3.0), (0, 3.4)]
hh = tk.lathe('head_hi', hp, n=16, centre=tuple(HC))
tk.subsurf(hh, 1)
tk.set_region(hh, 'skin')
g_hi.append(hh)
g_lo.append(tk.lathe('head', hp, n=8, centre=tuple(HC)))
HAIR = [(HC[2] - 6.0, HC[1] + 1.8, 6.4, 1.4, 2.6, 2.0), (HC[2] - 1.0, HC[1] + 1.0, 7.4, 2.4, 3.4, 2.0), (HC[2] + 1.8, HC[1] + 0.4, 7.2, 3.2, 3.4, 2.0),
        (HC[2] + 3.4, HC[1] + 0.4, 4.0, 2.0, 2.2, 2.0)]
hr_lo, hr_hi = ak.stack('hair', HAIR, n=12, tris=60, region='hair', cap0='round', cap1='round')
for o in [hr_lo] + hr_hi:
    tk.move(o, (GX, 0, 0))
tk.push(hr_hi[0], lambda V, N: 0.15 * np.cos((V[:, 0] - GX) * 3.0) ** 6 - 2.0 * ((V[:, 1] < HC[1] - 1.2) & (V[:, 2] < HC[2] + 1.6) & (np.abs(V[:, 0] - GX) < 2.6)))  # the fringe cut over the face
g_lo.append(hr_lo)
g_hi += hr_hi
tri_hi = tk.slab('tenkan_hi', [(-1.5, 0.0), (1.5, 0.0), (0.0, 1.9)], 0.4, plane='XZ', at=HC[1] - 3.3, bevel=0.1, segs=1)
tri_lo = tk.slab('tenkan', [(-1.5, 0.0), (1.5, 0.0), (0.0, 1.9)], 0.4, plane='XZ', at=HC[1] - 3.3, bevel=0, segs=0)
for o in (tri_hi, tri_lo):
    tk.move(o, (GX, 0, HC[2] + 1.0))
tk.set_region(tri_hi, 'robe')
g_lo.append(tri_lo)
g_hi.append(tri_hi)
for sx in (1, -1):
    sh = (GX + sx * 3.6, GY, SZ + 16.4)
    el = (GX + sx * 4.0, GY - 3.6, SZ + 16.8)
    wr = (GX + sx * 2.6, GY - 5.6, SZ + 17.0)
    lo, hi = ak.spine('sleeve', [sh, el, (wr[0], wr[1] + 0.6, wr[2] - 0.6)], [3.0, 3.4, 3.0], [1.6, 2.4, 3.0], n=8, up=(0, 0, 1), tris=36,
                      region='robe', cap0='round', cap1='flat')
    g_lo.append(lo)
    g_hi += hi
    hd_lo, hd_hi = ak.spine('hand', [wr, (wr[0], wr[1] - 1.0, wr[2] - 0.4), (wr[0], wr[1] - 1.4, wr[2] - 2.0)], [1.8, 1.7, 1.3], 0.7, n=6,
                            up=(0, -1, 0), tris=16, region='skin', cap0='round', cap1='round')
    g_lo.append(hd_lo)
    g_hi += hd_hi

# ------------------------------------------------------------------ the will-o'-the-wisp, on its thread of mist from the left sleeve
HD = np.array((GX - 7.6, GY - 3.0, SZ + 22.0))
fl_lo, fl_hi = ak.spine('flame', [tuple(HD + (0.6, 0.6, -3.6)), tuple(HD + (-0.4, 0, -1.0)), tuple(HD), tuple(HD + (0.6, 0, 2.6))],
                        [1.6, 3.4, 3.8, 0.3], [1.6, 3.2, 3.6, 0.3], n=10, up=(0, -1, 0), tris=40, region='flame', cap0='round', cap1='point')
mt_lo, mt_hi = ak.spine('thread', [(GX - 4.6, GY - 3.0, SZ + 16.4), (GX - 6.4, GY - 2.4, SZ + 17.0), tuple(HD + (0.6, 0.6, -3.6))], [1.0, 0.8, 0.6],
                        [0.5, 0.4, 0.3], n=6, up=(0, -1, 0), tris=12, region='flame', cap0='round', cap1='round')

# ------------------------------------------------------------------ parts
F.part('stage', tk.join(st['lo'], 'stage'), st['hi'])
F.part('ghost', tk.join(g_lo, 'ghost'), g_hi, bone='ghost', kind='led')
F.part('flame', tk.join([fl_lo, mt_lo], 'flame'), fl_hi + mt_hi, bone='flame', kind='led')


def make_rig():
    from rig import Rig
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('ghost', (GX, GY, SZ), parent='root')
    R.bone('flame', (GX - 4.6, GY - 3.0, SZ + 16.4), parent='ghost')
    for p in F.parts:
        R.attach(p.low, p.bone)
    kit.points(R)
    k = R.key
    with R.action('gimmick'):
        bones = ['root', 'ghost', 'flame']
        for b in bones:
            k(b, 0)
        # it rises out of nowhere (glowing: the light-up), sways, the flame circling round it; then it sinks back
        k('ghost', 4)
        k('ghost', 22, move=(0, 0, 5.0))
        for i, f in enumerate((30, 38, 46, 54)):
            k('ghost', f, move=(0, 0, 5.0 + (0.6 if i % 2 == 0 else -0.6)), rot=('Y', 7 if i % 2 == 0 else -7))
        k('ghost', 62, move=(0, 0, 5.0))
        k('ghost', 80)
        k('flame', 6)
        for i in range(1, 9):
            k('flame', 6 + i * 7, rot=('Y', 16 * math.sin(i * math.pi / 2)), move=(0, 0, 0.8 * math.sin(i * 1.3)))
        k('flame', 74)
        for b in bones:
            k(b, 84)
    return R


import paint as pt  # noqa: E402


def paint(P):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.85, cav=1.1)
    ob.paint_stage(P, pt, sh, gl, bk)
    # pale: it is painted as it glows (a cold blue-white), so the light-up and the glow finish read
    P.fill('robe', pt.ramp('#eef2f2', 6, shift=0.04), tone=sh * 0.8, base=0.25)
    rb = P.region('robe')
    P.fill(rb & (np.abs(Z - SZ - 11.6) < 0.5), pt.ramp('#c8d4d8', 4), tone=sh, base=0.15)
    P.fill(rb & (Z < SZ + 7.6) & (np.sin(X * 2.0 + Z * 1.6 + Yc) > 0.45), pt.ramp('#d4e2e8', 4), tone=sh, base=0.2)   # the mist's swirls
    P.fill('skin', pt.ramp('#e6eef0', 5, shift=0.03), tone=sh * 0.8, base=0.25)
    P.fill('hair', pt.ramp('#1c1a22', 6, shift=0.05, light=0.5), tone=sh * 1.2, base=0.0)
    P.fill('flame', pt.ramp('#bfe6ec', 5, shift=0.05), tone=sh * 0.6, base=0.3)
    P.fill(P.region('flame') & (np.linalg.norm(P.pos - HD, axis=2) < 2.2) & (P.on[:, :, 1] < -0.2), pt.ramp('#f1fbfc', 3), tone=sh, base=0.3)
    P.fill('cup', pt.ramp('#d8d2c4', 5, shift=0.04), tone=sh, base=0.1)
    P.fill(P.region('cup') & (Z > CUP[2] + 1.35) & (P.on[:, :, 2] > 0.7), pt.ramp('#8a9a4a', 3), tone=sh)
    P.fill('happi', pt.ramp('#2c3a66', 6, shift=0.07), tone=sh, base=0.05)
    d = bk.Decal(P, (COAT[0], FY + 3.0, COAT[2] - 4.0), (0, 1, 0), where=P.region('happi'), depth=3.0)
    P.fill(d.ring(0, 0, 1.9, 0.35) | gl.text(d, 'bake', 1, 0.0, 0.0, 2.4), pt.ramp('#efe9dc', 4), tone=sh, base=0.2)
    import face
    # a little lost face: round eyes, a small open mouth; cold blue cheeks
    fc = face.Face(P, c=(GX, HC[1] - 3.2, HC[2] - 0.8), axis=(0, -1, 0.05), where=P.region('skin'), seed=751)
    fc.eyes('dot', spread=2.8, size=0.42, dy=0.4)
    fc.mouth('o', w=0.8, dy=-1.4, weight=0.25)
    fc.blush(1.9, -0.6, rx=0.7, ry=0.4, col='#a8c4d8')
    P.lines(['hair', 'cup'], step=1)
    P.clusters()
    return P.done()


bk.run(F, make_rig, paint, skip=[('ghost', 'stage'), ('flame', 'ghost')],
       cam=((62, -90, 56), (0, 0, 16)), fold=(0, 22, 38, 54), frames=84)
