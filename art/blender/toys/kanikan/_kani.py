"""Shared parts for series kanikan (Crabs in Food Cans, concepts_D.md): the crab builder (each species its own
proportions and features), tin pieces, the 5x7 pixel font for the printed tin labels (read from src/gfx/font5x7.js,
the game's own bitmap font), and the press clip (the lid peels back, the crab pops up and munches, crumbs fly).

    sys.path: this folder and ../lib
    import _kani as kn
    C = kn.crab(spec, at=(x, y, z), s=1.0, yaw=0)   # -> dict: body [(lo, hi)], claws {name: ([(lo, hi)], shoulder)}, mouth, eyes
    m = kn.text(U, V, 'SARDINES', cell=0.35, x0=..., y0=...)   # a boolean mask of the lit font pixels
"""
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [HERE, os.path.join(HERE, '..', 'lib')]
import numpy as np  # noqa: E402

import tk  # noqa: E402  (imports bpy first)
from mathutils import Matrix, Vector  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))


def low(o, name, tris, lo=1, hi=2, region=None, sculpt=None):
    a, b = tk.lowhigh(o, name, lo=lo, hi=hi, sculpt=sculpt, region=region or name)
    tk.decimate(a, tris)
    return a, b


# ------------------------------------------------------------------ the crab
def crab(sp, at=(0, 0, 0), s=1.0, yaw=0.0, name='c'):
    """sp: dict(w, d, h: carapace (mm); spines: lateral spines; claws: (right, left) chela sizes; legs: walking-leg
    length; paddle: last legs flattened; stalk: eye-stalk length; hair: furry; lumps: knobbly; shape: lathe profile
    of the carapace [(r, z), ...] on a unit radius). Built at the origin facing -y, standing on z = 0, then scaled,
    turned and moved. Returns dict(body=[(lo, hi)], claws={'claw_r': (parts, shoulder), 'claw_l': ...}, mouth, eyes)."""
    w, d, h = sp['w'], sp['d'], sp['h']
    z0 = sp.get('lift', 2.2)                       # the carapace's underside above the ground
    prof = sp.get('shape', [(0, 0.0), (0.7, 0.02), (1.0, 0.3), (0.92, 0.62), (0.6, 0.92), (0, 1.0)])
    cara = tk.lathe(name + 'cara', [(r, z * h + z0) for r, z in prof], n=18)
    tk.scale(cara, (w / 2, d / 2, 1.0))
    bumps = sp.get('lumps', 0.0)

    def sc(hh):
        def f(V, N):
            a = np.arctan2(V[:, 1], V[:, 0])
            g = -0.22 * (np.abs(np.abs(V[:, 0]) - w * 0.16) < 0.3) * (V[:, 2] > z0 + h * 0.55)     # the grooves of the carapace
            k = bumps * (np.sin(V[:, 0] * 2.2) * np.sin(V[:, 1] * 2.4) > 0.4)
            fr = 0.3 * np.exp(-((V[:, 2] - z0 - h * 0.3) / 0.4) ** 2) * (np.abs(np.sin(a * 9)) ** 3) * (V[:, 1] < 0)   # the toothed front edge
            hair = sp.get('hair', 0.0) * 0.35 * np.sin(V[:, 0] * 7) * np.sin(V[:, 1] * 6.5) * np.sin(V[:, 2] * 7.3)
            return g + k + fr + hair
        tk.push(hh, f)
    body = [low(cara, name + 'cara', sp.get('tris', 260), sculpt=sc, region=('cshell', [('cunder', lambda C, N: N[:, 2] < -0.4)]))]
    if sp.get('spines'):
        for sx in (1, -1):
            sn = tk.tube(name + 'spine', [(sx * w * 0.44, -0.4, z0 + h * 0.3), (sx * w * 0.66, -1.0, z0 + h * 0.36)], [0.8, 0.08], n=5, cap1='point')
            body.append(low(sn, name + 'spine', 12, lo=0, hi=1, region='cshell'))
    L = sp.get('legs', 9.0)
    for sx in (1, -1):
        for i in range(4):
            y0 = -d * 0.18 + i * d * 0.16
            hip = (sx * w * 0.4, y0, z0 + h * 0.2)
            knee = (sx * (w * 0.4 + L * 0.55), y0 + (i - 1.5) * 0.8, z0 + h * 0.5 + 1.0)
            foot = (sx * (w * 0.4 + L * 0.85), y0 + (i - 1.5) * 1.6, 0.25)
            r = [1.0, 0.85, 0.4]
            if sp.get('paddle') and i == 3:
                lg = tk.loft(name + 'leg', [{'c': hip, 'w': 1.6, 'h': 0.7}, {'c': knee, 'w': 1.4, 'h': 0.6}, {'c': (foot[0], foot[1] + 1.0, z0 + 0.6), 'w': 2.6, 'h': 0.35}],
                             n=6, up=(0, 0, 1), cap0='round', cap1='round', capd=0.4)
            else:
                lg = tk.tube(name + 'leg', [hip, knee, foot], [x * sp.get('legr', 1.0) for x in r], n=6, cap1='point')
            body.append(low(lg, name + 'leg', 22, lo=1, hi=1, region='chair' if sp.get('hair') else 'cshell'))
    eyes = []
    st = sp.get('stalk', 2.2)
    for sx in (1, -1):
        b = np.array((sx * w * 0.14, -d * 0.4, z0 + h * 0.75))
        e = b + (sx * 0.3, -0.5, st)
        stalk = tk.tube(name + 'stalk', [tuple(b), tuple(e)], [0.55, 0.45], n=6, cap1=None)
        bulb = tk.lathe(name + 'bulb', [(0, -0.8), (0.75, -0.5), (0.85, 0.2), (0.6, 0.7), (0, 0.85)], n=8, centre=tuple(e + (0, 0, 0.5)))
        body += [low(stalk, name + 'stalk', 12, lo=1, hi=1, region='cshell'), low(bulb, name + 'bulb', 18, lo=1, hi=1, region='cbulb')]
        eyes.append(e + (0, -0.6, 0.6))
    claws = {}
    cr, cl = sp.get('claws', (1.0, 1.0))
    for nm, sx, k in (('claw_r', -1, cr), ('claw_l', 1, cl)):
        sh_ = np.array((sx * w * 0.3, -d * 0.3, z0 + h * 0.3))
        el = sh_ + (sx * 2.6 * k, -2.0 * k, 1.0)
        wr = el + (-sx * 1.2 * k, -1.6 * k, 2.2 * k)
        arm = tk.tube(name + nm, [tuple(sh_), tuple(el), tuple(wr)], [1.0 * k ** 0.5, 0.9 * k ** 0.5, 0.85 * k ** 0.5], n=6)
        tip = wr + (-sx * 1.6 * k, -1.2 * k, 1.8 * k)
        palm = tk.loft(name + 'palm', [{'c': tuple(wr), 'w': 1.8 * k, 'h': 1.1 * k}, {'c': tuple((wr + tip) / 2), 'w': 2.6 * k, 'h': 1.5 * k},
                                       {'c': tuple(tip), 'w': 1.6 * k, 'h': 1.0 * k}], n=8, up=(0, -1, 0.2), cap0='round', cap1='round', capd=0.4)
        f1 = tk.tube(name + 'f1', [tuple(tip), tuple(tip + (-sx * 1.0 * k, -0.6 * k, 1.4 * k)), tuple(tip + (-sx * 2.0 * k, -0.4 * k, 1.6 * k))], [0.6 * k, 0.45 * k, 0.1], n=5, cap1='point')
        f2 = tk.tube(name + 'f2', [tuple(tip + (0, 0, -0.4 * k)), tuple(tip + (-sx * 1.4 * k, -0.8 * k, 0.2 * k)), tuple(tip + (-sx * 2.2 * k, -0.6 * k, 0.6 * k))], [0.5 * k, 0.4 * k, 0.1], n=5, cap1='point')
        parts = [low(arm, name + nm, 30, lo=1, hi=1, region='chair' if sp.get('hair') else 'cshell'), low(palm, name + 'palm', 40, lo=1, hi=1, region='cshell'),
                 low(f1, name + 'f1', 14, lo=1, hi=1, region='ctip'), low(f2, name + 'f2', 14, lo=1, hi=1, region='ctip')]
        claws[nm] = [parts, sh_, tip]
    M = Matrix.Translation(Vector(at)) @ Matrix.Rotation(math.radians(yaw), 4, 'Z') @ Matrix.Scale(s, 4)
    for pr in body + [q for v in claws.values() for q in v[0]]:
        for o in pr:
            tk.transform(o, M)
    T = lambda p: np.array(M @ Vector(tuple(p)))  # noqa: E731
    for v in claws.values():
        v[1], v[2] = T(v[1]), T(v[2])
    return {'body': body, 'claws': {k_: (v[0], v[1], v[2]) for k_, v in claws.items()}, 'mouth': T((0, -d * 0.5, z0 + h * 0.45)),
            'eyes': [T(e) for e in eyes], 'M': M, 'top': T((0, 0, z0 + h))}


def crumbs(name, c, r=0.35, n=4, region='crumb'):
    """A few crumbs bunched at c (hidden in the mouth at rest: the clip throws them out)."""
    obs = []
    for i in range(n):
        a = i * 2.1
        p = np.array(c) + (0.4 * math.cos(a), -0.2, 0.3 * math.sin(a))
        b = tk.lathe(name, [(0, -r), (r * 0.9, -r * 0.4), (r, r * 0.2), (0, r)], n=6, centre=tuple(p))
        obs.append(b)
    return low(tk.join(obs, name), name, 40, lo=0, hi=1, region=region)


# ------------------------------------------------------------------ tins
def tin_round(name, r, h, at, region='tin', n=24, bead=True, rim=0.5):
    """A round tin can standing on z = at[2]: its body with rolled rims (and beads round it), open at the top."""
    z = at[2]
    prof = [(0, z), (r - 0.4, z), (r + rim * 0.4, z + 0.2), (r + rim * 0.4, z + 0.9), (r, z + 1.1)]
    prof += [(r, z + h - 1.1), (r + rim * 0.4, z + h - 0.9), (r + rim * 0.4, z + h - 0.1), (r - 0.5, z + h), (r - 0.6, z + h - 0.6), (0, z + h - 0.6)]
    o = tk.lathe(name, prof, n=n, centre=(at[0], at[1], 0))

    def sc(hh):
        def f(V, N):
            return -0.18 * (np.abs(np.mod(V[:, 2] - z, 2.4) - 1.2) < 0.18) * (V[:, 2] > z + 1.6) * (V[:, 2] < z + h - 1.6) * (np.abs(N[:, 2]) < 0.5) if bead else 0.0 * V[:, 0]
        tk.push(hh, f)
    return low(o, name, 220, lo=1, hi=1, sculpt=sc, region=(region, [(region + '_rim', lambda C, N: (C[:, 2] < z + 1.0) | (C[:, 2] > z + h - 1.0)),
                                                                   (region + '_in', lambda C, N: (N[:, 2] > 0.7) & (C[:, 2] > z + h - 1.0))]))


def ring_pull(name, c, axis=(0, 0, 1), region='pull'):
    """A ring pull lying on a lid at c."""
    ring = tk.tube(name, [(c[0] + 1.4 * math.cos(a), c[1] + 1.0 * math.sin(a) - 1.4, c[2] + 0.25) for a in np.linspace(0, 2 * math.pi, 10, endpoint=False)], 0.25, n=4, closed=True)
    tab = tk.rbox(name + 'tab', (1.6, 1.8, 0.3), centre=(c[0], c[1] + 0.2, c[2] + 0.2), bevel=0.15, segs=1)
    return low(tk.join([ring, tab], name), name, 70, lo=0, hi=1, region=region)


# ------------------------------------------------------------------ the 5x7 pixel font (the game's own, src/gfx/font5x7.js)
_FONT = None


def _font():
    global _FONT
    if _FONT is None:
        src = open(os.path.join(ROOT, 'src', 'gfx', 'font5x7.js'), encoding='utf8').read()
        _FONT = {}
        for m in re.finditer(r"""(?:(\w)|'(\\'|[^'])'|"(.)")\s*:\s*'([.#|]+)'""", src):
            ch = m.group(1) or m.group(2) or m.group(3)
            ch = "'" if ch == "\\'" else ch
            _FONT[ch] = [r for r in m.group(4).split('|')]
    return _FONT


def bitmap(s):
    """The 7-row bitmap of a line of text (capitals), one blank column between glyphs."""
    F = _font()
    cols = []
    for ch in s.upper():
        g = F.get(ch, F.get('?'))
        for x in range(len(g[0])):
            cols.append([g[y][x] == '#' for y in range(7)])
        cols.append([False] * 7)
    return np.array(cols[:-1], bool).T if cols else np.zeros((7, 1), bool)


def text(U, V, s, cell, cu, cv, bold=False):
    """Mask of the lit pixels of the line s, centred on (cu, cv) in label coordinates (U to the right, V up), cell mm per
    font pixel."""
    B = bitmap(s)
    hgt, wid = B.shape
    x = np.floor((U - cu) / cell + wid / 2).astype(int)
    y = np.floor((cv - V) / cell + hgt / 2).astype(int)
    ok = (x >= 0) & (x < wid) & (y >= 0) & (y < hgt)
    m = np.zeros(U.shape, bool)
    m[ok] = B[y[ok], x[ok]]
    if bold:
        ok2 = (x - 1 >= 0) & (x - 1 < wid) & (y >= 0) & (y < hgt)
        m2 = np.zeros(U.shape, bool)
        m2[ok2] = B[y[ok2], x[ok2] - 1]
        m |= m2
    return m


# ------------------------------------------------------------------ the press clip
def munch(R, lid=None, lid_rot=None, crab='crab', crab_up=(0, 0, 5.0), claw='claw_r', claw_rot=(('X', -40),), other='claw_l', crumbs_bone=None,
          extra=None, n=90):
    """4-16 the lid peels back; 12-22 the crab pops up; 24-64 munch, munch (the claw to the mouth, crumbs fly);
    68-86 down it goes and the lid closes."""
    k = R.key
    bones = [b for b in ('root', lid, crab, claw, other, crumbs_bone) if b]
    with R.action('gimmick'):
        for b in bones:
            k(b, 0)
        if lid:
            k(lid, 4)
            k(lid, 16, rot=lid_rot, ease='BACK')
            k(lid, 72, rot=lid_rot)
            k(lid, 86)
        k(crab, 12)
        k(crab, 22, move=crab_up, ease='BACK')
        k(crab, 66, move=crab_up)
        k(crab, 76)
        for i, f in enumerate(range(24, 66, 6)):
            up = i % 2 == 0
            k(claw, f, rot=list(claw_rot) if up else None, ease='QUAD')
            k(other, f, rot=('Y', 8 if up else -6))
            if crumbs_bone and up:
                k(crumbs_bone, f)
                k(crumbs_bone, f + 4, move=(1.4 * (1 if i % 4 == 0 else -1), -2.4, 1.2), scale=1.0)
                k(crumbs_bone, f + 5, ease='CONSTANT')
        k(claw, 66)
        k(other, 66)
        if extra:
            extra(k)
        for b in bones:
            k(b, n)


# ------------------------------------------------------------------ paint
def tinplate(P, pt, sh, *regions):
    for rg in regions:
        P.fill(rg, pt.ramp('#c4c8ce', 7, shift=0.04, light=0.8, dark=0.7), tone=sh * 1.4, base=0.05)


def paint_crab(P, pt, sh, C, crab_part, shell, under='#efe6d2', tip='#3a2a26', bulb=None, mottle=True, hair=None, mouth='grin', mw=3.2, seed=900,
               brush=None):
    import face
    cs = P.fill('cshell', pt.ramp(shell, 7, shift=0.07), tone=sh, base=0.08, brush=brush)
    if mottle:
        who, d = P.dabs(cs, size=0.6, spacing=1.2, seed=seed)
        P.shift(cs & (who >= 0) & (d < 0.5) & (np.mod(who, 3) == 0), -1)
    P.fill('cunder', pt.ramp(under, 5, shift=0.04), tone=sh, base=0.15)
    P.fill('ctip', pt.ramp(tip, 5, shift=0.05), tone=sh, base=0.1)
    P.fill('cbulb', pt.ramp(bulb or shell, 5, shift=0.05), tone=sh, base=0.1)
    if hair:
        P.fill('chair', pt.ramp(hair, 6, shift=0.06), tone=sh, base=0.05, brush='fur')
    for i, e in enumerate(C['eyes']):
        fe = face.Face(P, c=tuple(e), axis=(0, -1, 0.1), where=P.region('cbulb'), seed=seed + i)
        fe.dot(0.0, 0.0, 0.5 if i else 0.44)
    fm = face.Face(P, c=tuple(C['mouth'] + (0, 0, 0.4)), axis=(0, -1, 0.2), where=cs & (P.part == crab_part), seed=seed + 2)
    if mouth == 'grin':
        fm.mouth('grin', w=mw, dy=0.0, weight=0.34, teeth=3)
    else:
        fm.mouth(mouth, w=mw, dy=0.0, weight=0.36)
    fm.blush(spread=mw * 1.6, dy=0.6, rx=0.9, ry=0.5)
    P.lines(['cshell'], ['cunder', 'ctip'], step=1)
