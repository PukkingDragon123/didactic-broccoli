"""Shared parts for series obakebaito (Haunted House Part-Timers, concepts_B.md): the stage block every scare stands
on (a playset part: the blocks join side by side into one haunted-house corridor), the black flat that hides the
part-timer from the front, and the part-timers themselves (small animals in indigo happi coats).

    sys.path: this folder, ../teruteru/kit, ../tsuppari (for _gl glyphs)
    import _ob as ob
    st = ob.stage(F)                        # -> dict: lo, hi lists, SZ (the stage top), Y (the flat's y)
    w = ob.worker('hamster', at=(x, y, z), yaw=150)   # -> dict: lo, hi, head (centre), body (rings), up (z of the shoulders)
"""
import math

import numpy as np

import tk
import ak
import kit

W, D, H = 30.0, 24.0, 4.6       # the stage block
SZ = H
FY = 3.2                        # the black flat's centre plane (front: the scare; behind it: the part-timer)
FH = 21.0                       # its height above the stage


def stage(F, flat=True):
    lo, hi = [], []
    hi.append(tk.rbox('stage_hi', (W, D, H), centre=(0, 0, H / 2), bevel=0.5, segs=2))
    lo.append(tk.rbox('stage', (W, D, H), centre=(0, 0, H / 2), bevel=0.3, segs=1))
    # boards on the stage floor, a lip along the front edge
    tk.push(hi[0], lambda V, N: -0.2 * (np.abs(np.mod(V[:, 0] + 0.5, 3.75) - 1.9) > 1.75) * (N[:, 2] > 0.7))
    hi.append(tk.rbox('lip_hi', (W, 1.2, 1.0), centre=(0, -D / 2 + 0.6, H + 0.5), bevel=0.3, segs=1))
    lo.append(tk.rbox('lip', (W, 1.2, 1.0), centre=(0, -D / 2 + 0.6, H + 0.5), bevel=0, segs=0))
    tk.set_region(hi[0], 'stage')
    tk.set_region(hi[1], 'lip')
    # the playset joint: two dowels out of the right side (pt_out), two holes in the left side (pt_in)
    for y in (-6.0, 6.0):
        o = tk.cyl('peg_hi', 0.8, W / 2 - 0.4, W / 2 + 1.4, n=10, at=(y, H / 2), axis='X', bevel=0.2, segs=1)
        tk.set_region(o, 'peg')
        hi.append(o)
        lo.append(tk.cyl('peg', 0.8, W / 2 - 0.4, W / 2 + 1.4, n=5, at=(y, H / 2), axis='X', bevel=0, segs=0))
    kit.connector(F, 'in', (-W / 2, 0.0, 0.0), bone=None)
    kit.connector(F, 'out', (W / 2, 0.0, 0.0), bone=None)
    if flat:
        # the black flat: a cloth-covered frame; behind, its raw plywood back and two battens
        hi.append(tk.rbox('flat_hi', (W - 1.0, 1.2, FH), centre=(0, FY, H + FH / 2), bevel=0.3, segs=2))
        lo.append(tk.rbox('flat', (W - 1.0, 1.2, FH), centre=(0, FY, H + FH / 2), bevel=0, segs=0))
        tk.push(hi[-1], lambda V, N: 0.12 * np.cos(V[:, 0] * 1.3) ** 4 * (N[:, 1] < -0.7))  # the cloth's soft folds
        tk.set_region(hi[-1], 'flat')
        for z in (H + 4.0, H + FH - 3.0):
            o = tk.rbox('batten_hi', (W - 3.0, 1.0, 1.6), centre=(0, FY + 1.1, z), bevel=0.25, segs=1)
            tk.set_region(o, 'ply')
            hi.append(o)
            lo.append(tk.rbox('batten', (W - 3.0, 1.0, 1.6), centre=(0, FY + 1.1, z), bevel=0, segs=0))
    return {'lo': lo, 'hi': hi}


def paint_stage(P, pt, sh, gl=None, bk=None):
    P.fill('stage', pt.ramp('#2a2228', 6, shift=0.06), tone=sh, base=0.0)
    st = P.region('stage')
    P.fill(st & (P.on[:, :, 1] < -0.7), pt.ramp('#5a2a3e', 6, shift=0.06), tone=sh, base=0.0)      # the front skirt, plum
    P.fill(st & (P.on[:, :, 1] < -0.7) & (np.abs(np.mod(P.X + 1.6, 6.4) - 3.2) < 0.5), pt.ramp('#d8c27a', 5), tone=sh, base=0.0)
    P.fill('lip', pt.ramp('#c9a24a', 5, shift=0.05), tone=sh, base=0.05)
    P.fill('peg', pt.ramp('#c39a63', 5, shift=0.05), tone=sh, base=0.05)
    P.fill(st & (P.on[:, :, 0] < -0.7) & (np.minimum(np.hypot(P.Y + 6.0, P.Z - H / 2), np.hypot(P.Y - 6.0, P.Z - H / 2)) < 0.9),
           pt.ramp('#141012', 3), tone=sh)                                                         # the socket holes
    P.fill('flat', pt.ramp('#1d1a20', 6, shift=0.06), tone=sh, base=0.0)
    # willow fronds painted faintly down the front of the flat
    fl = P.region('flat') & (P.on[:, :, 1] < -0.5)
    fr = np.abs(P.X - 8.0 * np.sin((P.Z - H) * 0.12) - 9.0 * np.round((P.X - 8.0 * np.sin((P.Z - H) * 0.12)) / 9.0)) < 0.28
    P.fill(fl & fr & (P.Z > H + FH * 0.4), pt.ramp('#2f3a30', 4), tone=sh, base=0.0)
    P.fill(P.region('flat') & (P.on[:, :, 1] > 0.5), pt.ramp('#b89a6a', 6, shift=0.05), tone=sh, base=0.05)   # plywood back
    P.fill('ply', pt.ramp('#c8a774', 5, shift=0.05), tone=sh, base=0.05)
    if gl is not None and bk is not None:
        # a taped paper note on the back of the flat: 休憩中 (on break)
        d = bk.Decal(P, (-7.0, FY + 1.0, H + 12.0), (0, 1, 0), where=P.region('flat'))
        note = d.m & (np.abs(d.U) < 2.2) & (np.abs(d.V) < 4.6)
        P.fill(note, pt.ramp('#f1ece0', 4), tone=sh, base=0.2)
        P.fill(gl.text(d, 'kyuukei', 3, 0.0, 0.0, 2.6, vertical=True) & note, pt.ramp('#2a2224', 3), tone=sh)


# ------------------------------------------------------------------ the part-timers
KINDS = {
    #            body w, body h, head r, snout, ears
    'hamster': (8.6, 7.0, 3.9, 0.6, 'round'),
    'mole': (7.4, 7.6, 3.3, 2.6, 'none'),
    'tanuki': (8.0, 8.0, 3.8, 1.2, 'round'),
    'weasel': (5.8, 10.0, 2.9, 1.6, 'small'),
    'rabbit': (6.4, 7.4, 3.2, 0.8, 'long'),
}


def worker(kind, at, yaw=0.0, s=1.0, name='w'):
    """A small part-timer in a happi coat, built at the origin facing -y then turned `yaw` degrees and moved to `at`
    (its seat). Returns dict(lo, hi, head (centre), sh_l / sh_r (shoulders), up)."""
    bw, bh, hr, sn, ears = KINDS[kind]
    lo, hi = [], []
    rings = [(0.0, 0.4, bw * 0.95, bw * 0.48, bw * 0.5, 2.2), (bh * 0.35, 0.2, bw, bw * 0.5, bw * 0.48, 2.2),
             (bh * 0.75, 0.0, bw * 0.85, bw * 0.42, bw * 0.4, 2.2), (bh, 0.0, bw * 0.62, bw * 0.32, bw * 0.3, 2.1)]
    def sc(h):
        def f(V, N):
            z = V[:, 2]
            d = 0.25 * np.exp(-((z - bh * 0.42) / 0.35) ** 2)                      # the obi
            d -= 0.2 * np.exp(-((np.abs(V[:, 0]) - 0.7 - (bh - z) * 0.12) / 0.25) ** 2) * (V[:, 1] < 0) * (z > bh * 0.45)  # the collar's V
            return d
        tk.push(h, f)
    b_lo, b_hi = ak.stack(name + 'body', rings, n=12, tris=90, sculpt=sc, region='happi', cap0='round', cap1='round')
    tk.regions(b_hi[0], 'happi', [('fur_' + kind, lambda C, N: C[:, 2] < bh * 0.38)])
    lo.append(b_lo)
    hi += b_hi
    HC = np.array((0.0, -0.3, bh + hr * 0.85))
    hp = [(0, -hr), (hr * 0.7, -hr * 0.8), (hr, -hr * 0.1), (hr * 0.92, hr * 0.5), (hr * 0.6, hr * 0.9), (0, hr)]
    h_hi = tk.lathe(name + 'head_hi', hp, n=16, centre=tuple(HC))
    h_lo = tk.lathe(name + 'head', hp, n=8, centre=tuple(HC))
    if kind == 'hamster':
        for o in (h_hi, h_lo):
            tk.scale(o, (1.18, 1.0, 0.92), pivot=tuple(HC))                   # fat cheek pouches
    tk.subsurf(h_hi, 1)
    tk.set_region(h_hi, 'fur_' + kind)
    lo.append(h_lo)
    hi.append(h_hi)
    if sn > 0:
        p0 = HC + (0, -hr * 0.6, -hr * 0.25)
        pts = [tuple(p0), tuple(p0 + (0, -sn * 0.6, -0.1)), tuple(p0 + (0, -sn, -0.25))]
        s_lo, s_hi = ak.spine(name + 'snout', pts, [hr * 0.9, hr * 0.6, hr * 0.32], [hr * 0.5, hr * 0.36, hr * 0.22], n=8, up=(0, 0, 1),
                              tris=20, region='fur_' + kind, cap0='round', cap1='round')
        lo.append(s_lo)
        hi += s_hi
    for sx in (1, -1):
        if ears == 'round' or ears == 'small':
            r_ = hr * (0.42 if ears == 'round' else 0.3)
            c = HC + (sx * hr * 0.62, 0.3, hr * 0.78)
            for nm_, n_, lst in ((name + 'ear_hi', 12, hi), (name + 'ear', 5, lo)):
                o = tk.lathe(nm_, [(0, -0.4), (r_ * 0.9, -0.3), (r_, 0.0), (r_ * 0.9, 0.3), (0, 0.4)], n=n_, axis='Y', centre=tuple(c))
                tk.rotate(o, sx * -25, 'Y', pivot=tuple(c))
                if nm_.endswith('hi'):
                    tk.subsurf(o, 1)
                    tk.set_region(o, 'fur_' + kind)
                lst.append(o)
        elif ears == 'long':
            b0 = HC + (sx * hr * 0.4, 0.4, hr * 0.7)
            pts = [tuple(b0), tuple(b0 + (sx * 0.5, 0.6, hr * 0.9)), tuple(b0 + (sx * 1.0, 1.4, hr * 1.9))]
            e_lo, e_hi = ak.spine(name + 'ear', pts, [1.6, 2.0, 0.8], 0.5, n=6, up=(0, -1, 0), tris=14, region='fur_' + kind,
                                  cap0='round', cap1='round')
            lo.append(e_lo)
            hi += e_hi
    # a twisted towel headband (hachimaki) on every part-timer
    band = [(math.cos(a) * hr * 1.0, HC[1] + math.sin(a) * hr * 1.0, HC[2] + hr * 0.42) for a in np.linspace(0, 2 * math.pi, 12, endpoint=False)]
    b2_hi = tk.loft(name + 'band_hi', [{'c': p_, 'w': 0.7, 'h': 0.55, 'e': 2.0} for p_ in band], n=6, closed=True)
    tk.subsurf(b2_hi, 1)
    tk.set_region(b2_hi, 'towel')
    hi.append(b2_hi)
    lo.append(tk.loft(name + 'band', [{'c': p_, 'w': 0.7, 'h': 0.55, 'e': 2.0} for p_ in band[::2]], n=4, closed=True))
    out = {'lo': lo, 'hi': hi}
    M = None
    from mathutils import Matrix
    M = Matrix.Translation(tuple(at)) @ Matrix.Scale(s, 4) @ Matrix.Rotation(math.radians(yaw), 4, 'Z')
    for o in lo + hi:
        tk.transform(o, M)

    def tp(p):
        from mathutils import Vector
        return tuple(M @ Vector(tuple(p)))
    out['head'] = tp(HC)
    out['sh_l'] = tp((-bw * 0.42, 0.0, bh * 0.82))
    out['sh_r'] = tp((bw * 0.42, 0.0, bh * 0.82))
    out['M'] = M
    out['tp'] = tp
    out['hr'] = hr * s
    out['yaw'] = yaw
    return out


def paint_worker(P, pt, sh, kind, fur, gl=None, bk=None, crest_at=None, crest_axis=None):
    P.fill('happi', pt.ramp('#2c3a66', 6, shift=0.07), tone=sh, base=0.05)
    hp = P.region('happi')
    P.fill(hp & (P.cav > 0.56), pt.ramp('#e9e4d6', 4), tone=sh, base=0.15)     # the white trim in the obi and collar grooves
    P.fill('fur_' + kind, pt.ramp(fur, 6, shift=0.06), tone=sh, base=0.08)
    P.fill('towel', pt.ramp('#efe9dc', 4, shift=0.04), tone=sh, base=0.2)
    if gl is not None and crest_at is not None:
        d = bk.Decal(P, crest_at, crest_axis, where=hp, depth=3.0)
        P.fill(d.ring(0, 0, 1.9, 0.35) | gl.text(d, 'bake', 1, 0.0, 0.0, 2.4), pt.ramp('#efe9dc', 4), tone=sh, base=0.2)
