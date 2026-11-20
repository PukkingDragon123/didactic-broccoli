"""parts.py: the toy line's reusable, parametric figure parts (mass production: art/blender/toys/MASS.md).

A figure script built with tools/newseries.py is mostly parameters (its entry in art/blender/toys/<series>/series.json)
plus a few custom touches. Everything here is still real poly modelling with the lib (lofts with edge loops,
subdivision cages, a sculpt baked onto a faceted game mesh: FACET.md), never primitives stuck together: each family
builds proper merged forms (a head loft running into its muzzle, limbs that grow out of the body, joints overlapping).
Every sculpt is unique: the proportions come from the spec, and a per-figure seed jitters every loft (no reskins).

    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
    from parts import *
    T = Toy(__file__)                 # the spec: series.json's entry for this file's id
    mammal(T, **T.S['body'])          # or bird / fish / crab / insect / reptile (turtle: tabigame/_kame.py's Turtle)
    cloak(T, ...); hood(T); scythe(T, 'arm_r', T.A['HAND_R'], ...)       # clothing, props
    base(T, 'mound')                  # bases
    T.gim(hood_back(10))              # gimmick presets (+ your own: T.gim(lambda k, T: ...))
    T.go()                            # commit, rig, paint (palette + face from the spec), bake, export

Families set anchors in T.A (HEAD, HR (head radius), NECK, SH_R / SH_L, HAND_R / HAND_L, TOP, FACE, FACE_AX, ...),
bones in T.bones (name -> (pivot, parent)), default paint regions in T.pal (region -> (colour, brush)), and the face
(T.face: centre, axis, the regions it is drawn on, size). Coordinates: mm, the figure faces -Y, z up, stands on z = 0.
"""
import json
import math
import os
import sys
import zlib

os.environ.setdefault('GG_FACET', '1')   # (every mass-produced series is faceted: lib/facet.py's SERIES not needed)
HERE_P = os.path.dirname(os.path.abspath(__file__))
for _p in (os.path.join(HERE_P, '..', 'sabaku'), HERE_P):
    if _p not in sys.path:
        sys.path.insert(0, _p)
from _bz import *  # noqa: E402,F401,F403  (tk, Fig, V3, low, Build, basis, limb, blob, hand, shoe, ear, run, drift, cobbles, plinth)
import numpy as np  # noqa: E402
import face  # noqa: E402

def limb(name, pts, radii, tris=40, region='cloth', n=8, cap0='round', cap1='round', sculpt=None, e=2.0, squash=1.0):
    """A sleeve / leg / tail / stalk: a tube through pts (squash: flattened, a strap or a leaf)."""
    return low(tk.tube(name, [tuple(p) for p in pts], radii, n=n, cap0=cap0, cap1=cap1, e=e, squash=squash), name, tris, region=region, sculpt=sculpt)


HX = lambda c: c if isinstance(c, str) else '#%06x' % c  # noqa: E731


def spec(path):
    """This figure's spec: the series.json beside the script, its figure entry (by the script's file name) merged over
    the series' 'defaults'; S['series'], S['id'], S['secret']."""
    d = os.path.dirname(os.path.abspath(path))
    fid = os.path.splitext(os.path.basename(path))[0]
    J = json.load(open(os.path.join(d, 'series.json')))
    ent = next(f for f in J['figures'] if f['id'] == fid)
    S = dict(J.get('defaults', {}))
    for k, v in ent.items():
        S[k] = dict(S.get(k, {}), **v) if isinstance(v, dict) and isinstance(S.get(k), dict) else v
    S['series'], S['id'] = J['id'], fid
    S['secret'] = ent.get('rarity') == 'secret'
    return S


class Toy:
    """One figure: its spec, Fig, Build, anchors, bones, palette, face, gimmick keys and extra paint passes."""

    def __init__(s, path):
        s.S = spec(path)
        tk.reset()
        s.F = Fig(s.S['series'], s.S['id'])
        s.B = Build()
        s.A = {}
        s.bones = {'root': ((0, 0, 0.5), None)}
        s.pal = {}
        s.paints = []
        s.keys = []
        s.skip = []
        s.lines = []
        s.face = None
        s.frames = s.S.get('frames', 60)
        s.seed = zlib.crc32(f"{s.S['series']}/{s.S['id']}".encode()) % 100000
        s.rng = np.random.default_rng(s.seed)
        if s.S.get('detail'):   # (this figure's detail: every piece's budget times this, like GG_BZ_K)
            sys.modules['_bz'].K = float(s.S['detail'])
        sp = s.S.get('species')
        if sp:
            face.SPECIES[f"{s.S['series']}/{s.S['id']}"] = sp
        if s.S.get('face_style'):
            fs = {k: tuple(v) if isinstance(v, list) else v for k, v in s.S['face_style'].items()}
            face.STYLE[sp or s.S['id']] = dict(face.STYLE.get(sp, {}), **fs)
            face.SPECIES[f"{s.S['series']}/{s.S['id']}"] = sp or s.S['id']

    # -------------------------------------------------------------- building
    def j(s, k=0.06):
        """A small random factor about 1 (each sculpt its own: no two figures share a proportion)."""
        return 1.0 + s.rng.uniform(-k, k)

    def add(s, part, *pieces):
        s.B.add(part, *pieces)

    def bone(s, name, at, parent='body'):
        if name not in s.bones:
            s.bones[name] = (tuple(float(x) for x in at), parent)

    def region(s, name, col, brush='pvc', **kw):
        s.pal.setdefault(name, dict(col=col, brush=brush, **kw))

    def gim(s, fn):
        s.keys.append(fn)

    def moved(s, part, d):
        """Move every piece of a part (and its bone) by d."""
        for a, b in s.B.p.get(part, []):
            for o in (a, b):
                tk.move(o, tuple(d))

    def xform(s, deg, axis, pivot=(0, 0, 0), move=(0, 0, 0), floor=None):
        """Turn (then move) everything built so far, with its anchors, bones and face: a figure lying on its back, a
        whole body leaning into its pose."""
        from mathutils import Matrix, Vector
        M = Matrix.Translation(Vector(move)) @ Matrix.Translation(Vector(pivot)) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-Vector(pivot))
        R3 = M.to_3x3()
        P = lambda p: V3(*(M @ Vector(tuple(float(x) for x in p))))  # noqa: E731
        for L in s.B.p.values():
            for a, b in L:
                for o in (a, b):
                    tk.transform(o, M)
        for k_, v in list(s.A.items()):
            if isinstance(v, np.ndarray) and v.shape == (3,):
                s.A[k_] = P(v)
            elif isinstance(v, list) and v and isinstance(v[0], np.ndarray):
                s.A[k_] = [P(x) for x in v]
        s.bones = {nm: (tuple(P(at)), par) if nm != 'root' else (at, par) for nm, (at, par) in s.bones.items()}
        for L_ in s.A.get('LETTERS', []):   # (the painted letters follow: their centre, and a turn about X adds to their tilt)
            L_['c'] = P(L_['c'])
            if axis == 'X':
                L_['rx'] += deg
        if s.face:
            s.face['c'] = tuple(P(s.face['c']))
            ax = R3 @ Vector(s.face['axis'])
            s.face['axis'] = tuple(ax)
            s.face['zmin'] = None
        if floor is not None:   # (lift it so its lowest point sits at `floor`: on its base, never through the shelf)
            zmin = min(tk.verts(a)[:, 2].min() for L in s.B.p.values() for a, b in L)
            if zmin < floor:
                s.xform(0, 'Z', move=(0, 0, floor - zmin))

    # -------------------------------------------------------------- rig / paint / run
    def rig(s):
        from rig import Rig
        R = Rig()
        used = {p.bone for p in s.F.parts}
        need = set(used) | {'root'}
        for b in list(need):     # (a used bone's parents)
            while b in s.bones and s.bones[b][1]:
                b = s.bones[b][1]
                need.add(b)
        done = set()
        order = [nm for nm in s.bones if nm in need]
        while order:   # (parents first)
            n0 = len(order)
            for nm in list(order):
                at, par = s.bones[nm]
                if par is None or par in done:
                    R.bone(nm, at, parent=par)
                    done.add(nm)
                    order.remove(nm)
            if len(order) == n0:
                raise ValueError('bones without their parent: %s' % order)
        for p in s.F.parts:
            R.attach(p.low, p.bone)
        k = R.key
        allb = [b for b in s.bones if b in need]
        with R.action('gimmick'):
            for b in allb:
                k(b, 0)
            for fn in s.keys:
                fn(k, s)
            for b in allb:
                k(b, s.frames)
        return R

    def paint(s, P, pt):
        X, Y, Z = P.X, P.Y, P.Z
        sh = P.shade(light=0.0, ao=0.85, cav=1.1)
        pal = dict(s.pal)
        for nm, v in s.S.get('palette', {}).items():   # the spec's colours (and brushes) over the families' defaults
            pal[nm] = dict(pal.get(nm, {'brush': 'pvc'}), **(v if isinstance(v, dict) else {'col': v}))
        for nm, v in pal.items():
            c = pt.hexrgb(v['col'])
            lum = float(0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2])
            dark = lum < 0.3   # (a dark paint keeps a narrow, quiet ramp: no pale speckle in the brushwork)
            n = v.get('n', 5 if dark else 6)
            P.fill(nm, pt.ramp(v['col'], n, shift=v.get('shift', 0.05 if dark else 0.06), light=v.get('light', 0.1 if dark else 0.38), dark=0.7 if dark else 0.55),
                   tone=sh, base=v.get('base', 0.05 if dark else 0.12), levels=v.get('levels', n * (0.36 if dark else 0.55)), brush=v.get('brush', 'pvc'))
        for fn in s.paints:
            fn(P, pt, sh, s)
        if s.face:
            draw_face(P, s)
        if s.lines:
            P.lines(*s.lines, step=1)
        P.clusters()
        return P.done()

    def commit(s):
        bones = {nm: nm for nm in s.B.p}
        s.B.commit(s.F, bones=bones, kinds=s.S.get('kinds'))
        missing = [nm for nm in bones if nm not in s.bones]
        for nm in missing:
            s.bone(nm, (0, 0, 6), 'root' if nm == 'body' else 'body')

    def go(s, cams=None):
        s.commit()
        h = s.A.get('TOP', (0, 0, 30))[2]
        tgt = (0, 0, h * 0.5)
        if os.environ.get('GG_CLOSE'):   # (modelling review: close 3/4 front and back)
            cams = [((34, -44, h * 0.5 + 18), tgt), ((-30, 40, h * 0.5 + 16), tgt)]
        run(s.F, s.rig, s.paint, frames=s.frames, skip=s.skip + [(a, b) for a in s.B.p for b in s.B.p if a < b],
            cams=cams or [((60, -78, h * 0.5 + 34), tgt), ((-58, 70, h * 0.5 + 30), tgt)])


# ------------------------------------------------------------------ the face (lib/face.py: the species' style)
def draw_face(P, T):
    """The figure's hand-inked face from the family's anchor and the spec's 'face' settings: eyes (kind, spread,
    size, dy), mouth (kind, w, dy), blush, extras (whiskers, nose...). The species' style (face.STYLE) restyles it."""
    f = dict(T.face, **T.S.get('face', {}))
    where = None
    for r in f['regions']:
        m = P.region(r)
        where = m if where is None else (where | m)
    if f.get('zmin') is not None:
        where = where & (P.Z > f['zmin'])
    r = f['r']
    fc = face.Face(P, c=tuple(f['c']), axis=tuple(f['axis']), where=where, seed=T.seed)
    if f.get('eyes'):
        fc.eyes(f['eyes'], spread=f.get('spread', 0.8) * r, size=f.get('size', 0.075) * r, dy=f.get('dy', 0.12) * r)
    if f.get('mouth'):
        fc.mouth(f['mouth'], w=f.get('mw', 0.32) * r, dy=f.get('mdy', -0.32) * r, weight=f.get('mweight', 0.05) * r)
    if f.get('nose'):
        fc.nose(f['nose'], dy=f.get('ndy', -0.12) * r, size=f.get('nsize', 0.09) * r)
    if f.get('whiskers'):
        fc.whiskers(dy=f.get('mdy', -0.32) * r * 0.6, spread=0.5 * r, length=0.45 * r, weight=0.035 * r)
    if f.get('blush', True):
        fc.blush(f.get('bspread', 1.0) * r, f.get('bdy', -0.2) * r, rx=0.16 * r, ry=0.09 * r, col=f.get('bcol', '#e88a86'))
    return fc


# ------------------------------------------------------------------ shared shaping
def ruffle(amp=0.12, f=2.4, seed=0):
    """A sculpt: soft lumpy fur / cloth unevenness (each seed its own)."""
    ph = np.random.default_rng(seed).uniform(0, 6, 3)

    def sc(h):
        tk.push(h, lambda V, N: amp * np.sin(V[:, 0] * f + ph[0]) * np.sin(V[:, 1] * f * 0.9 + ph[1]) * np.sin(V[:, 2] * f * 1.1 + ph[2]))
    return sc


def folds(c, n=9, amp=0.35, zmax=99.0, seed=0):
    """A sculpt: cloth folds running down from zmax (vertical grooves round the axis through c)."""
    ph = np.random.default_rng(seed).uniform(0, 6)

    def sc(h):
        def fn(V, N):
            a = np.arctan2(V[:, 1] - c[1], V[:, 0] - c[0])
            g = np.sin(a * n + ph + 0.4 * np.sin(V[:, 2] * 0.4))
            fall = tk.smoothstep(zmax, zmax - 8.0, V[:, 2])
            return amp * fall * (np.abs(g) ** 0.6 * np.sign(g)) * (np.abs(N[:, 2]) < 0.8)
        tk.push(h, fn)
    return sc


def blobs(*sc):
    def f(h):
        for x in sc:
            if x:
                x(h)
    return f


def cage(o, name, region, sculpt=None, hi=2):
    """The cage itself as the game mesh (its deliberate facets: a turned drum, a pillar box), the subdivided sculpt baked
    onto it. For forms the collapse would mangle (long straight walls with a soft dome: it keeps no ring between)."""
    a = tk.copy(o, name + '_c')
    _, b = tk.lowhigh(o, name, lo=1, hi=hi, sculpt=sculpt, region=region)
    tk.delete(_)
    a.name = name
    tk.triangulate(a)
    a['facet'] = 1
    return a, b


def piece(name, o, tris, region, sculpt=None, lo=1, hi=2):
    return low(o, name, tris, lo=lo, hi=hi, region=region, sculpt=sculpt)


def slab(name, outline, depth, region, plane='XZ', move=(0, 0, 0), rot=(), bev=0.15):
    """A flat cut-out piece (a fin, a blade, a book cover): the game mesh unbevelled, the sculpt bevelled."""
    a = tk.slab(name, outline, depth, plane=plane, at=0.0, bevel=0.0, segs=0)
    b = tk.slab(name + '_hi', outline, depth, plane=plane, at=0.0, bevel=min(bev, depth * 0.3), segs=2)
    for o in (a, b):
        for deg, ax, pv in rot:
            tk.rotate(o, deg, ax, pivot=pv)
        tk.move(o, tuple(move))
    tk.set_region(b, region)
    return a, b


def box(name, size, c, region, bev=0.2, rz=0.0, rx=0.0):
    a = tk.rbox(name, size, centre=c, bevel=bev, segs=1)
    b = tk.rbox(name + '_hi', size, centre=c, bevel=bev, segs=2)
    for o in (a, b):
        if rz:
            tk.rotate(o, rz, 'Z', pivot=c)
        if rx:
            tk.rotate(o, rx, 'X', pivot=c)
    tk.set_region(b, region)
    return a, b


def turn(name, prof, c, region, tris=40, n=12, axis='Z', sculpt=None):
    """A turned form (lathe) at c: prof = [(r, z), ...]."""
    return low(tk.lathe(name, prof, n=n, axis=axis, centre=tuple(c)), name, tris, region=region, sculpt=sculpt)


def arm(T, part, sh, hand_at, r=1.6, region='fur', paw='fur', kind='paw', tris=28, elbow=1.2, sleeve=None):
    """An arm from the shoulder sh to the hand at hand_at, a soft elbow bend, a paw (blob) or a hand (_bz.hand:
    mitt, fist, point, open, claw); sleeve = (region, bell): a cloth sleeve over the upper arm, belled at the wrist."""
    sh, H = V3(*sh), V3(*hand_at)
    mid = (sh + H) / 2 + V3(np.sign(sh[0] + 1e-6) * elbow, 0.5, -elbow * 0.7)
    if sleeve:
        reg, bell = sleeve
        T.add(part, limb(part + '_sl', [sh, mid, H - (H - mid) / np.linalg.norm(H - mid) * 0.6], [r * 1.25, r * 1.2, r * bell], tris=tris + 8,
                         region=reg, n=9, sculpt=ruffle(0.04, 2.0, T.seed)))
    else:
        T.add(part, limb(part, [sh, mid, H], [r, r * 0.88, r * 0.8], tris=tris, region=region, n=8))
    d = (H - mid) / np.linalg.norm(H - mid)
    if kind == 'paw':
        T.add(part, blob(part + '_paw', H + d * r * 0.55, r * 0.95, tris=18, region=paw, squash=(1.0, 1.1, 0.9)))
    elif kind:
        T.add(part, *hand(part + '_h', H, d, r=r * 0.7, kind=kind, region=paw, tris=30))
    T.bone(part, sh, 'body')
    return H + d * r * 0.9


# ------------------------------------------------------------------ MAMMAL
def mammal(T, sp='cat', pose='sit', k=1.0, head=1.0, bw=1.0, snout=0.35, snoutw=0.55, ears='point', ear_k=1.0, tail='thin',
           hands=('down', 'down'), paw='paw', muzzle=True, belly=True, torso=True, z0=0.0, neck=0.0, fur='fur', fur2='fur2',
           brows=0.0, cheeks=0.0, lean=0.0):
    """A mascot mammal (big head, real species cues). pose: 'sit' (pear body, legs forward), 'stand' (biped on legs and
    feet), 'pop' (the torso coming up out of the base at z0: no legs). snout: muzzle length (x head radius; 0.1 a cat,
    0.5 a dog / mole, 0.9 a long snout); ears: point / round / long / floppy / tiny / none; tail: thin / bushy / puff /
    stub / flat / none; hands: (right, left) each 'down' / 'lap' / 'up' / 'out' / [x, y, z]; torso=False: the body is
    hidden (under a cloak): only shoulders, arms and feet are built. brows / cheeks: sculpted brow ridge / cheek fluff."""
    j = T.j
    hr = 6.4 * k * head * j(0.04)
    W = 12.6 * k * bw * j()
    if pose == 'stand':
        zb, zt = 6.4 * k + z0, 17.0 * k + z0
    elif pose == 'pop':
        zb, zt = z0 - 2.0, z0 + 9.5 * k
    else:
        zb, zt = 0.6 + z0, 15.0 * k + z0
    HC = V3(0, -0.6 * k + lean, zt + hr * 0.88 + neck)
    T.A.update(HEAD=HC, HR=hr, TOP=HC + V3(0, 0, hr), NECK=V3(0, 0.2, zt - 0.6), BODYW=W, ZB=zb, ZT=zt,
               BELLY=V3(0, 0.8 - W * 0.5, zb + (zt - zb) * 0.42))
    T.region(fur, '#8a6a4a', 'fur')
    if belly or muzzle:
        T.region(fur2, '#efe4d0', 'fur')
    T.region('nose', '#3a2a28', 'pvc')
    T.region('pad', '#d89090', 'pvc')
    T.bone('body', (0, 0.4, zb + (zt - zb) * 0.35), 'root')
    # ---- body
    if torso:
        if pose == 'sit':
            R = [dict(c=(0, 1.0, zb), w=W * 0.86, h=W * 0.36), dict(c=(0, 0.8, zb + (zt - zb) * 0.22), w=W * 1.06, ht=W * 0.48, hb=W * 0.44),
                 dict(c=(0, 0.5, zb + (zt - zb) * 0.6), w=W * 0.96, ht=W * 0.42, hb=W * 0.4), dict(c=(0, 0.3, zt - 1.2), w=W * 0.7, h=W * 0.32),
                 dict(c=(0, 0.2, zt + 0.6), w=W * 0.46, h=W * 0.22)]
        else:
            R = [dict(c=(0, 0.6, zb), w=W * 0.7, h=W * 0.3), dict(c=(0, 0.5, zb + (zt - zb) * 0.3), w=W * 0.86, ht=W * 0.4, hb=W * 0.36),
                 dict(c=(0, 0.4, zb + (zt - zb) * 0.72), w=W * 0.78, ht=W * 0.36, hb=W * 0.33), dict(c=(0, 0.3, zt + 0.4), w=W * 0.46, h=W * 0.22)]
        rules = [(fur2, lambda C, N, y=0.4: (N[:, 1] < -0.55) & (C[:, 2] > zb + 1.2) & (C[:, 2] < zt))] if belly else []
        b = low(tk.loft('body', R, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 170, lo=1, hi=3, region=(fur, rules),
                sculpt=ruffle(0.05, 1.8, T.seed))
        if pose in ('sit',) and z0 < 0.5:
            for o in b:
                tk.flat_bottom(o, 0.9)
        T.add('body', b)
    # ---- legs and feet
    if pose == 'sit':
        for sx in (1, -1):
            lg = limb('leg', [(sx * W * 0.32, -0.6, zb + 3.0 * k), (sx * W * 0.38, -W * 0.38, zb + 2.0 * k), (sx * W * 0.4, -W * 0.6, zb + 1.9 * k)],
                      [2.9 * k, 2.6 * k, 2.4 * k], tris=36, region=fur, n=8)
            for o in lg:
                tk.flat_bottom(o, 0.5)
            T.add('body', lg)
            T.add('body', blob('sole', (sx * W * 0.41, -W * 0.6 - 2.0 * k, zb + 2.2 * k), 1.9 * k, tris=16, region='pad', squash=(1.0, 0.42, 1.1)))
    elif pose == 'stand':
        for sx in (1, -1):
            hip = (sx * W * 0.24, 0.6, zb + 1.2)
            ft = (sx * W * 0.27, -0.2, 1.6 * k + z0)
            if torso:
                T.add('body', limb('leg', [hip, (sx * W * 0.27, 0.3, (hip[2] + ft[2]) / 2), ft], [2.4 * k, 2.1 * k, 1.9 * k], tris=28, region=fur, n=8))
            fo = tk.loft('foot', [dict(c=(ft[0], 1.0, 1.0 * k + z0), w=3.6 * k, h=1.0 * k), dict(c=(ft[0], -1.4 * k, 1.1 * k + z0), w=4.0 * k, ht=1.2 * k, hb=1.0 * k),
                                   dict(c=(ft[0] + sx * 0.2, -3.4 * k, 0.9 * k + z0), w=3.4 * k, h=0.8 * k)], n=10, up=(0, 0, 1), cap0='round', cap1='round')
            p = low(fo, 'foot', 30, region=fur if paw == 'paw' else paw)
            for o in p:
                tk.flat_bottom(o, 0.4)
            T.add('body', p)
    # ---- arms
    S = {}
    for nm, sx, hk in (('arm_r', -1, hands[0]), ('arm_l', 1, hands[1])):
        sh = V3(sx * W * 0.4, 0.4, zt - 1.4 * k)
        if isinstance(hk, str):
            hk = {'down': (sx * W * 0.5, -1.4, zb + (zt - zb) * 0.3), 'lap': (sx * W * 0.18, -W * 0.42, zb + (zt - zb) * 0.3),
                  'up': (sx * W * 0.6, -1.0, zt + hr * 1.3), 'out': (sx * W * 0.95, -2.4, zt - 1.0), 'front': (sx * W * 0.22, -W * 0.55, zt - 2.4)}[hk]
        S[nm] = (sh, V3(*hk))
    T.A.update(SH_R=S['arm_r'][0], SH_L=S['arm_l'][0], HAND_R=S['arm_r'][1], HAND_L=S['arm_l'][1], ARM_R=1.7 * k, ARM_L=1.7 * k)
    T.A['ARMS'] = dict(fur=fur, paw=fur, r=1.7 * k)
    if torso:   # (cloaked figures build their arms as sleeves: sleeves(T))
        for nm, (sh, H) in S.items():
            arm(T, nm, sh, H, r=1.7 * k, region=fur, paw=fur)
    # ---- the head: one loft from the crown into the muzzle
    sn = snout * hr
    rings = [dict(c=tuple(HC + V3(0, hr * 0.72, 0.05 * hr)), w=hr * 1.3, h=hr * 0.68),
             dict(c=tuple(HC + V3(0, hr * 0.1, 0)), w=hr * 2.0, ht=hr * 0.98, hb=hr * 0.86),
             dict(c=tuple(HC + V3(0, -hr * 0.55, -0.05 * hr)), w=hr * 1.78, ht=hr * 0.78, hb=hr * 0.76)]
    if sn > 0.3:
        rings.append(dict(c=tuple(HC + V3(0, -hr * 0.82 - sn * 0.5, -0.3 * hr)), w=hr * snoutw * 1.25, ht=hr * 0.36, hb=hr * 0.32))
        rings.append(dict(c=tuple(HC + V3(0, -hr * 0.8 - sn, -0.33 * hr)), w=hr * snoutw * 0.8, h=hr * 0.22))
    else:
        rings.append(dict(c=tuple(HC + V3(0, -hr * 0.86, -0.12 * hr)), w=hr * 1.1, ht=hr * 0.5, hb=hr * 0.55))
    zchin = HC[2] - 0.12 * hr
    mrule = (fur2, lambda C, N: (C[:, 1] < HC[1] - hr * 0.62) & (C[:, 2] < zchin + 0.05 * hr) & (np.abs(C[:, 0]) < hr * 0.62))

    def hsc(h):
        def f(V, N):
            d = np.zeros(len(V))
            if brows:
                d = d + sum(tk.bump(V, HC + V3(sx * hr * 0.42, -hr * 0.82, hr * 0.32), hr * 0.32, brows * 0.5) for sx in (1, -1))
            if cheeks:
                d = d + sum(tk.bump(V, HC + V3(sx * hr * 0.8, -hr * 0.45, -hr * 0.3), hr * 0.45, cheeks * 0.6) for sx in (1, -1))
            return d
        tk.push(h, f)
        ruffle(0.04, 2.0, T.seed + 1)(h)
    T.add('head', low(tk.loft('head', rings, n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=hr * 0.18), 'head', 150, lo=1, hi=3,
                      region=(fur, [mrule] if muzzle else []), sculpt=hsc))
    tipy = HC[1] - hr * (0.86 + (snout if sn > 0.3 else 0.12)) - (0.1 * hr if sn > 0.3 else 0.12 * hr)
    tipz = HC[2] - (0.2 if sn > 0.3 else 0.02) * hr
    T.add('head', blob('nose', (0, tipy + (0.05 if sn > 0.3 else 0.1) * hr, tipz), hr * (0.09 + 0.07 * (sn > 0.3)), tris=14, region='nose', squash=(1.3, 0.6, 0.8)))
    T.add('head', limb('neck', [T.A['NECK'], HC - V3(0, 0, hr * 0.5)], hr * 0.5, tris=14, region=fur, n=8))
    T.bone('head', T.A['NECK'], 'body')
    # ---- ears
    ek = ear_k
    for sx in (1, -1):
        b = HC + V3(sx * hr * 0.55, hr * 0.12, hr * 0.72)
        if ears == 'point':
            T.add('head', ear('ear', b, b + V3(sx * hr * 0.35 * ek, 0.05, hr * 0.75 * ek), hr * 0.62 * ek, th=hr * 0.16, region=fur, tris=16))
        elif ears == 'long':
            b = HC + V3(sx * hr * 0.32, hr * 0.25, hr * 0.8)
            o = tk.loft('ear', [dict(c=tuple(b), w=hr * 0.42 * ek, h=hr * 0.14), dict(c=tuple(b + V3(sx * hr * 0.25 * ek, 0.3, hr * 1.0 * ek)), w=hr * 0.55 * ek, h=hr * 0.14),
                                dict(c=tuple(b + V3(sx * hr * 0.42 * ek, 0.8, hr * 1.9 * ek)), w=hr * 0.25 * ek, h=hr * 0.1)], n=8, up=(0, -1, 0), cap0='round', cap1='round')
            T.add('ears', low(o, 'ear', 24, region=(fur, [('inner', lambda C, N: (N[:, 1] < -0.5))])))
            T.region('inner', '#e8a8a8', 'pvc')
            T.bone('ears', HC + V3(0, hr * 0.25, hr * 0.75), 'head')
        elif ears == 'round':
            e = tk.lathe('ear', [(0, -0.3), (hr * 0.38 * ek, -0.2), (hr * 0.42 * ek, 0.1), (hr * 0.3 * ek, 0.3), (0, 0.35)], n=10, axis='Y', centre=tuple(b))
            tk.rotate(e, sx * -20, 'Y', pivot=tuple(b))
            T.add('head', low(e, 'ear', 18, region=fur))
        elif ears == 'floppy':
            o = tk.loft('ear', [dict(c=tuple(b), w=hr * 0.5, h=hr * 0.12), dict(c=tuple(b + V3(sx * hr * 0.45, 0, -hr * 0.4)), w=hr * 0.6, h=hr * 0.12),
                                dict(c=tuple(b + V3(sx * hr * 0.55, -0.2, -hr * 1.0 * ek)), w=hr * 0.4, h=hr * 0.1)], n=8, up=(sx, 0, 0), cap0='round', cap1='round')
            T.add('head', low(o, 'ear', 20, region=fur))
        elif ears == 'tiny':
            T.add('head', blob('ear', b + V3(sx * hr * 0.25, 0.3, -hr * 0.2), hr * 0.16, tris=10, region=fur, squash=(0.7, 0.5, 1.0)))
    # ---- tail
    tb = V3(0, W * 0.42, zb + 1.6 * k)
    if tail == 'thin':
        T.add('tail', limb('tail', [tb, tb + V3(-2.0 * k, 3.6 * k, 0.4), tb + V3(-4.6 * k, 3.4 * k, 4.6 * k), tb + V3(-4.0 * k, 1.8 * k, 8.4 * k)],
                           [1.0 * k, 0.9 * k, 0.8 * k, 0.6 * k], tris=24, region=fur, n=7))
    elif tail == 'bushy':
        T.add('tail', low(tk.loft('tail', [dict(c=tuple(tb), w=2.4 * k, h=2.2 * k), dict(c=tuple(tb + V3(-1.4 * k, 4.0 * k, 2.4 * k)), w=5.0 * k, h=4.2 * k),
                                           dict(c=tuple(tb + V3(-2.6 * k, 5.0 * k, 7.6 * k)), w=3.0 * k, h=2.6 * k)], n=10, up=(0, -1, 0)), 'tail', 50, region=fur,
                          sculpt=ruffle(0.2, 2.0, T.seed + 2)))
    elif tail == 'puff':
        T.add('tail', blob('tail', tb + V3(0, 1.0 * k, 0.6), 2.2 * k, tris=20, region=fur2 if belly else fur, squash=(1, 0.9, 1)))
    elif tail == 'stub':
        T.add('tail', limb('tail', [tb, tb + V3(0, 2.2 * k, 0.6)], [1.0 * k, 0.5 * k], tris=10, region=fur, n=6))
    elif tail == 'flat':
        T.add('tail', low(tk.loft('tail', [dict(c=tuple(tb), w=3.0 * k, h=0.9 * k), dict(c=tuple(tb + V3(0, 4.0 * k, -1.0)), w=5.6 * k, h=0.8 * k),
                                           dict(c=tuple(tb + V3(0, 7.4 * k, -1.2)), w=4.8 * k, h=0.6 * k)], n=8, up=(0, 0, 1)), 'tail', 30, region='tailskin'))
        T.region('tailskin', '#4a3a34', 'scale')
    if tail and tail != 'none':
        T.bone('tail', tb, 'body')
    # ---- the face anchor
    fy = HC[1] - hr * 0.9
    T.face = dict(c=(0, fy, HC[2] + 0.08 * hr), axis=(0, -1, 0.12), regions=[fur, fur2, 'nose'], zmin=HC[2] - hr * 1.1, r=hr,
                  eyes='dot', spread=0.82, size=0.085, dy=0.16, mouth='upturn', mw=0.3, mdy=-0.36 - (0.12 if sn > 0.3 else 0))
    T.A['FACE'] = V3(*T.face['c'])
    return T


# ------------------------------------------------------------------ BIRD
def bird(T, sp='crow', k=1.0, head=1.0, bw=1.0, beak='crow', beak_k=1.0, wings='fold', hands=None, tail='wedge', legs=True, tufts=0.0,
         disc=False, neck=0.0, crest=0.0, plumage='feather', plumage2='feather2', z0=0.0, upright=1.0, torso=True, wingr=None):
    """A mascot bird standing on its own feet (or sitting at z0 with legs=False). beak: crow (long, deep), hook (raptor,
    owl), flat (duck), short (sparrow / gull), long (heron); wings: 'fold' (along the sides) or 'arms' (wings used as
    arms, the primaries as fingers, reaching to hands=(right, left)); tail: wedge / fan / short; tufts: owl ear tufts;
    disc: an owl's facial disc (region 'disc'); crest: a crest of feathers."""
    j = T.j
    hr = 5.8 * k * head * j(0.04)
    W = 11.6 * k * bw * j()
    zb = (5.0 * k if legs else 0.8) + z0
    zt = zb + 12.5 * k * upright
    HC = V3(0, -0.8 * k, zt + hr * 0.78 + neck)
    T.A.update(HEAD=HC, HR=hr, TOP=HC + V3(0, 0, hr), NECK=V3(0, 0.0, zt - 0.4), BODYW=W, ZB=zb, ZT=zt)
    T.region(plumage, '#2a2a30', 'feather')
    T.region(plumage2, '#d8d0c0', 'feather')
    T.region('beak', '#e8b030', 'pvc')
    T.region('leg', '#d8a040', 'scale')
    T.region('talon', '#2a2224', 'pvc')
    T.bone('body', (0, 0.4, zb + 3.0), 'root')
    R = [dict(c=(0, 1.4, zb - 0.4), w=W * 0.62, h=W * 0.3), dict(c=(0, 0.8, zb + (zt - zb) * 0.25), w=W * 1.0, ht=W * 0.46, hb=W * 0.44),
         dict(c=(0, 0.2, zb + (zt - zb) * 0.62), w=W * 0.92, ht=W * 0.42, hb=W * 0.4), dict(c=(0, -0.2, zt), w=W * 0.6, h=W * 0.3)]
    b = low(tk.loft('body', R, n=14, up=(0, -1, 0), cap0='round', cap1='round'), 'body', 160, lo=1, hi=3,
            region=(plumage, [(plumage2, lambda C, N: (N[:, 1] < -0.5) & (C[:, 2] > zb) & (C[:, 2] < zt - 0.5))]),
            sculpt=lambda h: tk.push(h, lambda V, N: -0.1 * (np.abs(np.mod(V[:, 2] * 1.3 + np.abs(V[:, 0]) * 0.5, 1.6) - 0.8) < 0.12)))
    if not legs and z0 < 0.5:
        for o in b:
            tk.flat_bottom(o, 0.6)
    if torso:
        T.add('body', b)
    else:
        for o in b:
            tk.delete(o)
    if legs:
        for sx in (1, -1):
            T.add('body', limb('leg', [(sx * W * 0.2, 0.4, zb + 0.8), (sx * W * 0.22, -0.3, 1.2 + z0)], [1.0 * k, 0.75 * k], tris=14, region='leg', n=6))
            for k_ in (-1, 0, 1):
                t0, t1 = (sx * W * 0.22, -0.5, 0.7 + z0), (sx * W * 0.22 + k_ * 1.3 * k, -3.0 * k, 0.5 + z0)
                toe = limb('toe', [t0, t1], [0.5 * k, 0.4 * k], tris=10, region='leg', n=5)
                for o in toe:
                    tk.flat_bottom(o, 0.2)
                T.add('body', toe)
                T.add('body', limb('talon', [t1, (t1[0], t1[1] - 0.8 * k, 0.2 + z0)], [0.32 * k, 0.07], tris=8, region='talon', n=5, cap1='point'))
            bt = limb('btoe', [(sx * W * 0.22, -0.2, 0.6 + z0), (sx * W * 0.23, 1.6 * k, 0.45 + z0)], [0.45 * k, 0.35 * k], tris=8, region='leg', n=5)
            for o in bt:
                tk.flat_bottom(o, 0.2)
            T.add('body', bt)
    # ---- tail
    tb = V3(0, W * 0.38, zb + 1.0)
    if tail:
        L = {'wedge': 7.0, 'fan': 6.0, 'short': 3.6}.get(tail, 5.0) * k
        wd = {'wedge': 4.6, 'fan': 7.6, 'short': 4.0}.get(tail, 5.0) * k
        tl = tk.loft('tail', [dict(c=tuple(tb + V3(0, 0, 1.0)), w=wd * 0.6, h=1.0 * k), dict(c=tuple(tb + V3(0, L * 0.55, -1.2 * k)), w=wd, h=0.6 * k),
                              dict(c=tuple(tb + V3(0, L, -2.6 * k)), w=wd * (0.9 if tail == 'fan' else 0.6), h=0.4 * k)], n=8, up=(0, -0.4, 1), cap0='round', cap1='round')
        p = low(tl, 'tail', 30, region=plumage, sculpt=lambda h: tk.push(h, lambda V, N: -0.12 * (np.abs(np.mod(V[:, 0], 1.2) - 0.6) < 0.1)))
        if tb[2] - 2.6 * k < 0.6 + z0:
            for o in p:
                tk.flat_bottom(o, 0.4)
        T.add('body', p)
    # ---- wings
    for nm, sx in (('wing_r', -1), ('wing_l', 1)):
        sh = V3(sx * W * 0.42, 0.6, zt - 1.0 * k)
        if wings == 'arms':
            H = V3(*(hands[0] if sx < 0 else hands[1]))
            mid = (sh + H) / 2 + V3(sx * 1.6, 0.6, -0.6)
            T.add(nm, limb(nm, [sh, mid, H], [2.4 * k, 2.0 * k, 1.3 * k], tris=36, region=wingr or plumage, n=8,
                           sculpt=lambda h: tk.push(h, lambda V, N: -0.1 * (np.abs(np.mod(V[:, 2] * 1.6, 1.4) - 0.7) < 0.12))))
            d = (H - mid) / np.linalg.norm(H - mid)
            for jj in (-1, 0, 1):
                f0 = H + V3(0, 0, jj * 0.45 * k)
                T.add(nm, limb('prim', [f0, f0 + d * 1.6 * k + V3(sx * 0.2, 0, jj * 0.5 * k)], [0.5 * k, 0.22 * k], tris=8, region=wingr or plumage, n=5, cap1='point'))
        else:
            H = V3(sx * W * 0.5, 2.6 * k, zb + 0.6)
            o = tk.loft(nm, [dict(c=tuple(sh), w=3.4 * k, h=1.3 * k), dict(c=tuple((sh + H) / 2 + V3(sx * 0.9, 0, 0)), w=4.6 * k, h=1.2 * k),
                             dict(c=tuple(H + V3(0, 1.6 * k, -1.4 * k)), w=2.0 * k, h=0.6 * k)], n=8, up=(sx, -0.3, 0), cap0='round', cap1='point')
            T.add(nm, low(o, nm, 40, region=wingr or plumage, sculpt=lambda h, sx=sx: tk.push(h, lambda V, N: -0.13 * (np.abs(np.mod(V[:, 2] * 1.3 - V[:, 1] * 0.4, 1.5) - 0.75) < 0.12))))
        T.bone(nm, sh, 'body')
    T.A.update(SH_R=V3(-W * 0.42, 0.6, zt - 1.0), SH_L=V3(W * 0.42, 0.6, zt - 1.0))
    if hands:
        T.A.update(HAND_R=V3(*hands[0]), HAND_L=V3(*hands[1]))
    # ---- head and beak
    rings = [dict(c=tuple(HC + V3(0, hr * 0.62, 0)), w=hr * 1.4, h=hr * 0.72), dict(c=tuple(HC + V3(0, 0, 0.02 * hr)), w=hr * 2.0, ht=hr * 0.98, hb=hr * 0.9),
             dict(c=tuple(HC + V3(0, -hr * 0.62, -0.02 * hr)), w=hr * 1.55, ht=hr * 0.74, hb=hr * 0.72)]
    rules = [('disc', lambda C, N: (N[:, 1] < -0.45) & (np.hypot(np.abs(C[:, 0]) - hr * 0.38, C[:, 2] - HC[2] - 0.1 * hr) < hr * 0.58))] if disc else []
    if disc:
        T.region('disc', '#d8c8a8', 'feather')
    T.add('head', low(tk.loft('head', rings, n=14, up=(0, 0, 1), cap0='round', cap1='round', capd=hr * 0.2), 'head', 130, lo=1, hi=3, region=(plumage, rules),
                      sculpt=(lambda h: tk.push(h, lambda V, N: sum(tk.bump(V, HC + V3(sx * hr * 0.38, -hr * 0.8, 0.1 * hr), hr * 0.42, -0.35) for sx in (1, -1)))) if disc else None))
    T.add('head', limb('neck', [T.A['NECK'], HC - V3(0, -0.2, hr * 0.45)], hr * 0.55, tris=14, region=plumage, n=8))
    bk = beak_k * hr
    by, bz = HC[1] - hr * 0.86, HC[2] - 0.12 * hr
    if beak == 'crow':
        pts, rr = [(0, by + 0.3, bz), (0, by - 0.9 * bk, bz - 0.12 * bk), (0, by - 1.55 * bk, bz - 0.38 * bk)], [0.42 * bk, 0.26 * bk, 0.04]
    elif beak == 'hook':
        pts, rr = [(0, by + 0.3, bz + 0.1 * bk), (0, by - 0.35 * bk, bz - 0.05 * bk), (0, by - 0.5 * bk, bz - 0.4 * bk)], [0.26 * bk, 0.16 * bk, 0.03]
    elif beak == 'flat':
        pts, rr = [(0, by + 0.3, bz), (0, by - 0.8 * bk, bz - 0.15 * bk), (0, by - 1.2 * bk, bz - 0.2 * bk)], [0.45 * bk, 0.4 * bk, 0.3 * bk]
    elif beak == 'long':
        pts, rr = [(0, by + 0.3, bz), (0, by - 1.4 * bk, bz - 0.3 * bk), (0, by - 2.4 * bk, bz - 0.5 * bk)], [0.32 * bk, 0.18 * bk, 0.04]
    else:  # short (gull / sparrow): a stout wedge with the gull's hooked tip
        pts, rr = [(0, by + 0.3, bz), (0, by - 0.7 * bk, bz - 0.06 * bk), (0, by - 1.05 * bk, bz - 0.22 * bk)], [0.36 * bk, 0.24 * bk, 0.06]
    o = tk.tube('beak', pts, rr, n=7, cap1='point', squash=(1.25 if beak != 'flat' else 0.45))
    T.add('head', low(o, 'beak', 26, region='beak'))
    T.A['BEAK'] = V3(*pts[-1])
    for sx in (1, -1):
        if tufts:
            b0 = HC + V3(sx * hr * 0.55, 0, hr * 0.7)
            T.add('head', ear('tuft', b0, b0 + V3(sx * hr * 0.35, 0.4, hr * 0.7 * tufts), hr * 0.5, th=hr * 0.14, region=plumage, tris=14))
    if crest:
        for i in range(3):
            c0 = HC + V3(0, hr * (0.1 + 0.25 * i), hr * 0.88)
            T.add('head', limb('crest', [c0, c0 + V3(0, hr * 0.5 * crest, hr * 0.5 * crest)], [hr * 0.18, 0.05], tris=8, region=plumage, n=5, cap1='point'))
    T.bone('head', T.A['NECK'], 'body')
    T.face = dict(c=(0, HC[1] - hr * 0.86, HC[2] + 0.2 * hr), axis=(0, -1, 0.1), regions=[plumage, plumage2, 'disc'], zmin=HC[2] - hr * 0.9, r=hr,
                  eyes='dot', spread=0.95, size=0.09, dy=0.12, mouth=None, blush=True, bspread=1.3, bdy=-0.25)
    T.A['FACE'] = V3(*T.face['c'])
    return T


# ------------------------------------------------------------------ FISH (and the seahorse)
def fish(T, sp='fish', kind='koi', L=20.0, H=8.0, Wd=None, zc=14.0, pitch=0.0, fins=1.0, spines=0, scale='scale', belly='belly',
         fin='fin', tail_k=1.0, lips=True, whisk=0):
    """A fish body swimming at height zc (on a stand: base(T, 'wisp' / 'coral' / 'wave')), head toward -Y. kind:
    'koi' / 'slim' (a long carp / gull-shaped fish), 'puffer' (round, spines = how many), 'seahorse' (upright S body,
    snout, coronet, curled tail: L = height). Parts: 'body' (everything but the tail fin), 'tail' (bone at the
    peduncle) for koi / slim; the seahorse's 'tail' is its curl."""
    j = T.j
    Wd = Wd or H * 0.72
    T.region(scale, '#d86a2a', 'scale')
    T.region(belly, '#f2e6d0', 'scale')
    T.region(fin, '#f0c890', 'gloss')
    T.region('lip', '#e09080', 'pvc')
    if kind == 'seahorse':
        return _seahorse(T, L, H, scale, belly, fin)
    c = V3(0, 0, zc)
    T.bone('body', c, 'root')
    if kind == 'puffer':
        R = H * j(0.03)
        o = tk.lathe('body', [(0, -R * 0.92), (R * 0.6, -R * 0.78), (R * 0.95, -R * 0.3), (R, R * 0.1), (R * 0.85, R * 0.6), (R * 0.45, R * 0.92), (0, R)],
                     n=16, axis='Y', centre=tuple(c))
        tk.scale(o, (1.0, 1.08, 0.94), pivot=tuple(c))
        T.add('body', low(o, 'body', 150, lo=1, hi=3, region=(scale, [(belly, lambda C, N: N[:, 2] < -0.35)])))
        rng = T.rng
        for i in range(spines):
            th, ph = rng.uniform(0, 2 * math.pi), rng.uniform(-0.75, 0.9)
            d = V3(math.cos(ph) * math.cos(th), math.cos(ph) * math.sin(th) * 1.08, math.sin(ph) * 0.94)
            if d[1] < -0.75:
                continue
            p0 = c + d * R * 0.92
            T.add('body', limb('spine', [p0, p0 + d * R * 0.24], [R * 0.07, 0.03], tris=6, region=belly if d[2] < -0.3 else scale, n=4, cap1='point'))
        head_y, ped = -R * 1.08, V3(0, R * 1.0, zc)
        Lh = R
        for sx in (1, -1):
            T.add('fins', slab('pec', [(0, 0), (sx * R * 0.4, -0.5), (sx * R * 0.38, -R * 0.3), (0, -0.8)][::sx], 0.3, fin, plane='XZ',
                               move=(sx * R * 0.92, -R * 0.15, zc - R * 0.1), rot=[(sx * 30, 'Z', (0, 0, 0))]))
        T.bone('fins', (0, -R * 0.15, zc), 'body')
        tf = [(0, 0), (R * 0.5, R * 0.42), (R * 0.62, R * 0.3), (R * 0.4, 0), (R * 0.62, -R * 0.3), (R * 0.5, -R * 0.42)]
        T.add('tail', slab('caudal', tf, 0.4, fin, plane='YZ', move=tuple(ped + V3(0, -0.6, 0))))
        T.bone('tail', ped, 'body')
    else:
        sl = 0.75 if kind == 'slim' else 1.0
        R = [dict(c=(0, -L * 0.5, zc - H * 0.06), w=Wd * 0.38, h=H * 0.24), dict(c=(0, -L * 0.36, zc), w=Wd * 0.8, ht=H * 0.42, hb=H * 0.38),
             dict(c=(0, -L * 0.1, zc + H * 0.04), w=Wd * sl, ht=H * 0.52 * sl, hb=H * 0.46 * sl), dict(c=(0, L * 0.18, zc + H * 0.02), w=Wd * 0.8 * sl, ht=H * 0.42 * sl, hb=H * 0.36 * sl),
             dict(c=(0, L * 0.4, zc), w=Wd * 0.34, h=H * 0.16)]
        o = tk.loft('body', R, n=14, up=(0, 0, 1), cap0='round', cap1='round')

        def scl(h):
            tk.push(h, lambda V, N: -0.09 * ((np.abs(np.mod(V[:, 1] * 0.9 + np.abs(V[:, 2] - zc) * 0.55, 1.1) - 0.55) < 0.08)
                                             | (np.abs(np.mod(V[:, 1] * 0.9 - np.abs(V[:, 2] - zc) * 0.55, 1.1) - 0.55) < 0.08)) * (V[:, 1] > -L * 0.34))
        T.add('body', low(o, 'body', 150, lo=1, hi=3, region=(scale, [(belly, lambda C, N: (N[:, 2] < -0.3) & (C[:, 1] < L * 0.3))]), sculpt=scl))
        head_y, ped, Lh = -L * 0.5 - H * 0.12, V3(0, L * 0.4, zc), H * 0.5
        # fins: dorsal, pelvic pair, pectoral pair
        dors = [(-L * 0.14, 0), (-L * 0.06, H * 0.4 * fins), (L * 0.14, H * 0.26 * fins), (L * 0.26, 0)]
        T.add('body', slab('dorsal', [(y, z) for y, z in dors], 0.35, fin, plane='YZ', move=(0, 0, zc + H * 0.42 * sl - 0.3)))
        for sx in (1, -1):
            pec = slab('pec', [(0, 0), (H * 0.45 * fins, -0.6), (H * 0.4 * fins, -H * 0.28), (0, -0.9)], 0.3, fin, plane='XY',
                       move=(sx * Wd * 0.4, -L * 0.28, zc - H * 0.18), rot=[(sx * 25, 'Y', (0, 0, 0)), (sx * -30, 'Z', (0, 0, 0))])
            if sx < 0:
                for o_ in pec:
                    tk.scale(o_, (-1, 1, 1), pivot=(sx * Wd * 0.4, -L * 0.28, zc))
            T.add('fins', pec)
        T.bone('fins', (0, -L * 0.28, zc), 'body')
        # the tail fin (its own bone: it sways)
        tf = [(0, 0), (H * 0.55 * tail_k, H * 0.62 * tail_k), (H * 0.72 * tail_k, H * 0.5 * tail_k), (H * 0.42 * tail_k, 0), (H * 0.72 * tail_k, -H * 0.5 * tail_k),
              (H * 0.55 * tail_k, -H * 0.62 * tail_k)]
        T.add('tail', slab('caudal', tf, 0.4, fin, plane='YZ', move=tuple(ped + V3(0, -0.4, 0))))
        T.bone('tail', ped, 'body')
    if lips:
        T.add('body', limb('lip', [(-Lh * 0.25, head_y + 0.2, zc - H * 0.08), (0, head_y - 0.2, zc - H * 0.06), (Lh * 0.25, head_y + 0.2, zc - H * 0.08)],
                           [Lh * 0.1, Lh * 0.13, Lh * 0.1], tris=14, region='lip', n=6))
    for sx in range(whisk):
        s_ = 1 if sx % 2 else -1
        T.add('body', limb('barbel', [(s_ * Lh * 0.22, head_y + 0.2, zc - H * 0.1), (s_ * Lh * 0.45, head_y - 0.6, zc - H * 0.3), (s_ * Lh * 0.5, head_y - 0.4, zc - H * 0.45)],
                           [Lh * 0.06, Lh * 0.045, 0.04], tris=8, region='lip', n=5, cap1='point'))
    T.A.update(HEAD=V3(0, head_y + Lh, zc), HR=Lh, TOP=V3(0, 0, zc + H * 0.6), BELLY=V3(0, 0, zc - H * 0.45), PED=ped, ZC=zc)
    fy = head_y + Lh * (0.35 if kind == 'puffer' else 0.25)
    T.face = dict(c=(0, fy, zc + H * 0.1), axis=(0, -1, 0.1), regions=[scale, belly], zmin=zc - H, r=Lh,
                  eyes='dot', spread=1.2 if kind == 'puffer' else 1.0, size=0.12, dy=0.22, mouth=None, blush=True, bspread=1.5, bdy=-0.15)
    if kind != 'puffer':   # (a fish's eyes sit on the sides of the head)
        T.face.update(spread=1.25, size=0.14)
    return T


def _seahorse(T, Ht, H, scale, belly, fin):
    k = Ht / 30.0
    T.bone('body', (0, 0, 14 * k), 'root')
    # one loft from the tail root up the pot belly, the arched neck and round into the head (the spine turns forward:
    # sections are depth (w) x half-width (h))
    S_ = [(1.6, 5.0, 2.4, 1.0), (1.0, 8.6, 5.6, 1.9), (0.0, 12.6, 7.6, 2.3), (0.4, 16.6, 6.6, 2.1), (1.4, 20.0, 5.0, 1.8), (2.4, 22.8, 3.6, 1.5),
          (2.6, 25.4, 4.0, 1.9), (1.4, 27.4, 4.4, 2.2), (-0.6, 27.6, 3.8, 2.0), (-2.2, 26.9, 2.4, 1.3)]
    rings = [dict(c=(0, y * k, z * k), w=d * k * (1.25 if z < 21 else 1.1), h=hw * k * (1.3 if z < 21 else 1.1)) for y, z, d, hw in S_]

    def rings_sc(h):
        tk.push(h, lambda V, N: (-0.16 * (np.abs(np.mod(V[:, 2] * 1.1 / k, 1.2) - 0.6) < 0.12) + 0.14 * (np.abs(np.mod(V[:, 2] * 1.1 / k, 1.2) - 0.6) > 0.5) * (N[:, 1] > 0.3))
                * (V[:, 2] < 24 * k))
    o = tk.loft('body', rings, n=12, up=(1, 0, 0), cap0='round', cap1='round')
    T.add('body', low(o, 'body', 210, lo=1, hi=3, region=(scale, [(belly, lambda C, N: (N[:, 1] < -0.5) & (C[:, 2] < 21 * k))]), sculpt=rings_sc))
    rings = rings_sc
    HC = V3(0, 0.6 * k, 27.2 * k)
    T.add('body', limb('snout', [V3(0, -2.0 * k, 26.9 * k), V3(0, -4.6 * k, 26.2 * k), V3(0, -6.4 * k, 25.8 * k)], [1.0 * k, 0.72 * k, 0.85 * k], tris=22, region=scale, n=8))
    for sx in (1, -1):   # the gill / cheek plates
        T.add('body', blob('cheek', V3(sx * 1.6 * k, 0.6 * k, 26.4 * k), 1.2 * k, tris=12, region=scale, squash=(0.5, 1, 1)))
    for i in range(4):  # the coronet
        a = i * math.pi / 2 + 0.4
        c0 = HC + V3(math.cos(a) * 1.0 * k, 0.6 * k + math.sin(a) * 1.0 * k, 1.8 * k)
        T.add('body', limb('coronet', [c0, c0 + V3(0, 0.3 * k, 1.6 * k)], [0.5 * k, 0.15 * k], tris=8, region=scale, n=5, cap1='point'))
    T.add('body', slab('dorsal', [(0, 0), (1.4 * k, 2.2 * k), (3.4 * k, 2.0 * k), (4.4 * k, 0)], 0.3, fin, plane='YZ', move=(0, 3.0 * k, 12.0 * k),
                       rot=[(-75, 'X', (0, 0, 0))]))
    tail = [V3(0, 1.4 * k, 5.4 * k), V3(0, 1.0 * k, 2.2 * k), V3(0, -1.0 * k, 0.8 * k), V3(0, -3.0 * k, 1.4 * k), V3(0, -3.4 * k, 3.4 * k), V3(0, -1.9 * k, 4.2 * k)]
    T.add('tail', low(tk.tube('tail', [tuple(p) for p in tail], [1.8 * k, 1.3 * k, 1.0 * k, 0.8 * k, 0.6 * k, 0.4 * k], n=8), 'tail', 50, region=scale, sculpt=rings))
    T.bone('tail', tail[0], 'body')
    T.A.update(HEAD=HC, HR=3.0 * k, TOP=HC + V3(0, 0, 4 * k), SNOUT=HC + V3(0, -6.8 * k, -1.8 * k), BACK=V3(0, 4.0 * k, 16 * k), CURL=V3(0, -3.0 * k, 2.6 * k),
               BODYW=8.0 * k, SH_L=V3(2.0 * k, 1.6 * k, 20 * k), NECK=V3(0, 0.6, 22 * k))
    T.face = dict(c=(0, HC[1] - 2.4 * k, HC[2] + 0.4 * k), axis=(0, -1, 0.25), regions=[scale], zmin=HC[2] - 3 * k, r=3.0 * k,
                  eyes='dot', spread=0.95, size=0.14, dy=0.25, mouth=None, blush=True, bspread=1.5, bdy=-0.25)
    return T


# ------------------------------------------------------------------ CRAB (and the hermit crab), after kanikan/_kani.crab
def crab(T, sp='crab', w=12.0, d=9.0, h=5.0, claws=(1.0, 1.0), legs=8.0, stalk=2.4, lift=2.4, hermit=False, shell='shell', under='under',
         tip='tip', at=(0, 0, 0), pinch=True, claw_regions=None):
    """A crab standing on its walking legs, its claws on their own bones ('claw_r', 'claw_l': press to snip / wave).
    claws: (right, left) sizes (a fiddler crab: (2.4, 0.6)); hermit: a small soft front (the shell / house is a prop
    added by the script, hiding the abdomen), four walking legs forward. Eyes on stalks (the face on the bulbs)."""
    j = T.j
    at = V3(*at)
    T.region(shell, '#c8402a', 'chitin')
    T.region(under, '#efe2c8', 'chitin')
    T.region(tip, '#3a2824', 'pvc')
    T.region('bulb', '#2a2224', 'gloss')
    z0 = lift
    w, d, h = w * j(0.05), d * j(0.05), h * j(0.05)
    T.bone('body', tuple(at + V3(0, 0, z0 + h * 0.4)), 'root')
    prof = [(0, 0.0), (0.7, 0.02), (1.0, 0.3), (0.92, 0.62), (0.6, 0.92), (0, 1.0)]
    cara = tk.lathe('cara', [(r, z * h + z0) for r, z in prof], n=18)
    tk.scale(cara, (w / 2, d / 2, 1.0))
    if hermit:
        tk.scale(cara, (0.8, 0.8, 0.9))

    def sc(hh):
        def f(V, N):
            g = -0.2 * (np.abs(np.abs(V[:, 0]) - w * 0.16) < 0.3) * (V[:, 2] > z0 + h * 0.55)
            a = np.arctan2(V[:, 1], V[:, 0])
            fr = 0.28 * np.exp(-((V[:, 2] - z0 - h * 0.3) / 0.4) ** 2) * (np.abs(np.sin(a * 9)) ** 3) * (V[:, 1] < 0)
            return g + fr + 0.08 * np.sin(V[:, 0] * 2.2) * np.sin(V[:, 1] * 2.4)
        tk.push(hh, f)
    T.add('body', low(cara, 'cara', 220, lo=1, hi=3, sculpt=sc, region=(shell, [(under, lambda C, N: N[:, 2] < -0.4)])))
    n_leg = 4 if hermit else 4
    for sx in (1, -1):
        for i in range(n_leg):
            y0 = -d * 0.18 + i * d * (0.12 if hermit else 0.16)
            hip = (sx * w * 0.38, y0, z0 + h * 0.2)
            kn = (sx * (w * 0.38 + legs * 0.55), y0 + (i - 1.5) * 0.8 - (1.5 if hermit else 0), z0 + h * 0.5 + 1.0)
            ft = (sx * (w * 0.38 + legs * 0.85), y0 + (i - 1.5) * 1.6 - (2.0 if hermit else 0), 0.25)
            T.add('body', low(tk.tube('leg', [hip, kn, ft], [0.95, 0.8, 0.38], n=6, cap1='point'), 'leg', 22, lo=1, hi=1, region=shell))
    for sx in (1, -1):
        b = V3(sx * w * 0.14, -d * 0.4, z0 + h * 0.75)
        e = b + V3(sx * 0.3, -0.5, stalk)
        T.add('body', low(tk.tube('stalk', [tuple(b), tuple(e)], [0.55, 0.45], n=6, cap1=None), 'stalk', 12, lo=1, hi=1, region=shell))
        T.add('body', low(tk.lathe('bulb', [(0, -0.8), (0.8, -0.5), (0.9, 0.2), (0.65, 0.7), (0, 0.9)], n=8, centre=tuple(e + V3(0, 0, 0.5))), 'bulb', 18,
                          lo=1, hi=1, region='bulb'))
    T.A['EYES'] = [V3(sx * w * 0.14 + sx * 0.3, -d * 0.4 - 0.5, z0 + h * 0.75 + stalk + 0.5) for sx in (1, -1)]
    cr, cl = claws
    crg = claw_regions or (shell, shell)
    for nm, sx, kk, cshell in (('claw_r', -1, cr, crg[0]), ('claw_l', 1, cl, crg[1])):
        sh_ = V3(sx * w * 0.3, -d * 0.3, z0 + h * 0.3)
        el = sh_ + V3(sx * 2.6 * kk, -2.0 * kk, 1.0)
        wr = el + V3(-sx * 1.2 * kk, -1.6 * kk, 2.2 * kk)
        T.add(nm, low(tk.tube(nm, [tuple(sh_), tuple(el), tuple(wr)], [1.0 * kk ** 0.5, 0.9 * kk ** 0.5, 0.85 * kk ** 0.5], n=6), nm, 30, lo=1, hi=1, region=cshell))
        tp = wr + V3(-sx * 1.6 * kk, -1.2 * kk, 1.8 * kk)
        T.add(nm, low(tk.loft('palm', [dict(c=tuple(wr), w=1.8 * kk, h=1.1 * kk), dict(c=tuple((wr + tp) / 2), w=2.7 * kk, h=1.6 * kk),
                                       dict(c=tuple(tp), w=1.6 * kk, h=1.0 * kk)], n=8, up=(0, -1, 0.2), cap0='round', cap1='round', capd=0.4), 'palm', 44, lo=1, hi=1,
                      region=cshell, sculpt=lambda hh: tk.push(hh, lambda V, N: 0.06 * np.sin(V[:, 0] * 5) * np.sin(V[:, 2] * 5))))
        T.add(nm, low(tk.tube('f1', [tuple(tp), tuple(tp + V3(-sx * 1.0 * kk, -0.6 * kk, 1.4 * kk)), tuple(tp + V3(-sx * 2.0 * kk, -0.4 * kk, 1.6 * kk))],
                              [0.6 * kk, 0.45 * kk, 0.1], n=5, cap1='point'), 'f1', 14, lo=1, hi=1, region=tip))
        fing = low(tk.tube('f2', [tuple(tp + V3(0, 0, -0.4 * kk)), tuple(tp + V3(-sx * 1.4 * kk, -0.8 * kk, 0.2 * kk)), tuple(tp + V3(-sx * 2.2 * kk, -0.6 * kk, 0.6 * kk))],
                           [0.5 * kk, 0.4 * kk, 0.1], n=5, cap1='point'), 'f2', 14, lo=1, hi=1, region=tip)
        if pinch:
            T.add(nm + '_f', fing)
            T.bone(nm + '_f', tuple(tp + V3(0, 0, -0.4 * kk)), nm)
        else:
            T.add(nm, fing)
        T.bone(nm, sh_, 'body')
        T.A[nm.upper()] = tp + V3(-sx * 1.0 * kk, -0.6 * kk, 0.9 * kk)
    T.A.update(HEAD=V3(0, -d * 0.45, z0 + h * 0.5), HR=h, TOP=V3(0, 0, z0 + h + stalk + 1.4), MOUTH=V3(0, -d * 0.5, z0 + h * 0.45))
    T.face = dict(c=(0, -d * 0.5, z0 + h * 0.42), axis=(0, -1, 0.05), regions=[shell, under], zmin=z0, r=h,
                  eyes=None, mouth='smirk', mw=0.5, mdy=0.0, blush=True, bspread=1.6, bdy=0.05)
    T.paints.append(_crab_eyes)
    return T


def _crab_eyes(P, pt, sh, T):
    """A crab's eyes are its bulbs: the bead ink on each, slightly uneven."""
    for i, e in enumerate(T.A['EYES']):
        fc = face.Face(P, c=tuple(e), axis=(0.15 * (1 if i else -1), -1, 0.2), where=P.region('bulb'), seed=T.seed + i)
        fc.dot(0, 0.1, 0.42 + 0.05 * i, 0.5)


# ------------------------------------------------------------------ INSECT (after kouchuu/_band.Beetle, without the band)
def insect(T, sp='bee', k=1.0, head=1.0, abdomen=1.2, wings='clear', antenna='elbow', stance='stand', chitin='chitin', stripe=None, arms=True, hands=None):
    """An upright mascot insect: big head, thorax, abdomen behind, six legs (the lower pair on the ground, the upper
    pairs as arms 'arm_r' / 'arm_l' plus a middle pair), antennae, wings ('clear' / 'case' / None) on 'wings'."""
    j = T.j
    hr = 5.6 * k * head * j(0.04)
    T.region(chitin, '#e8b030', 'chitin')
    T.region('dark', '#2a2224', 'chitin')
    T.region('wing', '#cfe0e8', 'gloss')
    T.bone('body', (0, 0.6, 9.0 * k), 'root')
    TH = [dict(c=(0, 0.6, 8.0 * k), w=7.0 * k, h=3.2 * k), dict(c=(0, 0.6, 11.6 * k), w=8.0 * k, ht=3.6 * k, hb=3.8 * k), dict(c=(0, 0.6, 15.2 * k), w=6.6 * k, h=3.0 * k)]
    T.add('body', low(tk.loft('thorax', TH, n=12, up=(0, -1, 0)), 'thorax', 110, lo=1, hi=3, region='dark', sculpt=ruffle(0.15, 3.0, T.seed)))
    ab = abdomen
    AB = [dict(c=(0, 2.4 * k, 9.0 * k), w=6.4 * k, h=3.0 * k), dict(c=(0, 5.6 * k * ab, 7.6 * k), w=8.0 * k * ab, ht=4.0 * k, hb=3.6 * k),
          dict(c=(0, 8.6 * k * ab, 5.2 * k), w=6.0 * k, h=2.8 * k), dict(c=(0, 10.4 * k * ab, 3.6 * k), w=2.0 * k, h=1.0 * k)]
    st = stripe or chitin
    T.add('body', low(tk.loft('abdomen', AB, n=12, up=(0, -0.3, 1)), 'abdomen', 110, lo=1, hi=3,
                      region=(chitin, [('dark', lambda C, N: np.abs(np.mod(C[:, 1] - C[:, 2] * 0.4, 2.6 * k) - 1.3) < 0.45)] if st != chitin or True else []),
                      sculpt=lambda h: tk.push(h, lambda V, N: -0.14 * (np.abs(np.mod(V[:, 1] - V[:, 2] * 0.4, 2.6 * k) - 1.3) < 0.15))))
    for sx in (1, -1):
        T.add('body', limb('leg', [(sx * 2.4 * k, 0.4, 7.0 * k), (sx * 3.6 * k, -0.4, 3.6 * k), (sx * 3.4 * k, -1.6, 0.8)], [0.8 * k, 0.65 * k, 0.55 * k],
                           tris=18, region='dark', n=6))
        T.add('body', blob('foot', (sx * 3.4 * k, -2.6, 0.7), 0.9 * k, tris=10, region='dark', squash=(1, 1.4, 0.7)))
        T.add('body', limb('mid', [(sx * 3.6 * k, 0.4, 11.0 * k), (sx * 5.8 * k, -0.6, 10.0 * k), (sx * 6.0 * k, -1.8, 8.4 * k)], [0.55 * k, 0.45 * k, 0.3 * k],
                           tris=14, region='dark', n=6))
    T.A.update(SH_R=V3(-3.4 * k, 0.4, 14.0 * k), SH_L=V3(3.4 * k, 0.4, 14.0 * k), NECK=V3(0, 0.4, 16.6 * k))
    T.A.update(HAND_R=V3(*(hands[0] if hands else (-6.0 * k, -3.0, 11.0 * k))), HAND_L=V3(*(hands[1] if hands else (6.0 * k, -3.0, 11.0 * k))))
    if arms:   # the front pair: thin jointed arms with little hooked tarsi (props go in T.A HAND_R / HAND_L)
        for nm, sd in (('arm_r', 'R'), ('arm_l', 'L')):
            arm(T, nm, T.A['SH_' + sd], T.A['HAND_' + sd], r=0.65 * k, region='dark', paw='dark', kind='paw', tris=18)
    if wings:
        for nm, sx in (('wing_r', -1), ('wing_l', 1)):
            ol = [(0, 0), (sx * 2.6 * k, 1.0 * k), (sx * 4.6 * k, 4.6 * k), (sx * 3.6 * k, 8.0 * k), (sx * 1.0 * k, 7.0 * k)]
            p = slab(nm, ol if sx > 0 else ol[::-1], 0.3, 'wing', plane='XY', move=(sx * 1.0, 2.0 * k, 15.0 * k), rot=[(-62, 'X', (0, 0, 0))])
            T.add(nm, p)
            T.bone(nm, (sx * 1.0, 2.0 * k, 15.0 * k), 'body')
    HC = V3(0, -0.4, 16.6 * k + hr * 0.9)
    T.add('head', low(tk.loft('head', [dict(c=tuple(HC + V3(0, hr * 0.6, 0)), w=hr * 1.4, h=hr * 0.7), dict(c=tuple(HC), w=hr * 2.0, ht=hr * 0.95, hb=hr * 0.85),
                                       dict(c=tuple(HC + V3(0, -hr * 0.6, -0.1 * hr)), w=hr * 1.6, ht=hr * 0.7, hb=hr * 0.75)], n=14, up=(0, 0, 1)), 'head', 120, lo=1, hi=3,
                      region=chitin))
    for sx in (1, -1):
        a0 = HC + V3(sx * hr * 0.35, -hr * 0.55, hr * 0.6)
        pts = [a0, a0 + V3(sx * hr * 0.2, -0.4, hr * 0.7), a0 + V3(sx * hr * 0.6, -1.4, hr * 1.0)] if antenna == 'elbow' else [a0, a0 + V3(sx * hr * 0.5, 0.2, hr * 1.2)]
        T.add('head', limb('ant', pts, [0.32 * k, 0.26 * k, 0.24 * k][:len(pts)], tris=12, region='dark', n=5))
        T.add('head', blob('club', pts[-1], 0.55 * k, tris=10, region='dark', squash=(1, 1, 1.3)))
    T.bone('head', T.A['NECK'], 'body')
    T.A.update(HEAD=HC, HR=hr, TOP=HC + V3(0, 0, hr * 1.8))
    T.face = dict(c=(0, HC[1] - hr * 0.86, HC[2]), axis=(0, -1, 0.1), regions=[chitin], zmin=HC[2] - hr, r=hr, eyes='dot', spread=0.9, size=0.11, dy=0.15,
                  mouth='upturn', mw=0.3, mdy=-0.35)
    return T


# ------------------------------------------------------------------ REPTILE: the turtle is tabigame/_kame.py's Turtle
def reptile(T, kind='turtle', **kw):
    """kind 'turtle': the realistic Turtle builder of series tabigame (art/blender/toys/tabigame/_kame.py: real scutes,
    plastron, skull, limbs; kw = its arguments: L, W, clr, dome, neck, head, legs, spurs, rim, flat_top, sp) with its
    paint (paint_turtle) and inked face (turtle_face). kind 'lizard': a low four-legged lizard / gecko / newt."""
    if kind == 'turtle':
        kd = os.path.join(HERE_P, '..', 'tabigame')
        if kd not in sys.path:
            sys.path.insert(0, kd)
        import _kame
        paint_kw = kw.pop('paint', {})
        TT = _kame.Turtle(T.B, **kw)
        T.turtle = TT
        for nm, at in (('body', TT.BC), ('legs', TT.BC), ('head', TT.NECK), ('shell', (0, 0, TT.top))):
            T.bone(nm, at, 'root' if nm == 'body' else 'body')
        T.A.update(HEAD=V3(*TT.HC), HR=3.0 * TT.hk, TOP=V3(0, 0, TT.top), SHELL_TOP=V3(0, 0, TT.top))
        T.skip += list(_kame.SKIP)

        def paint_turtle(P, pt, sh, T_):
            TT.PI = {p.name: i for i, p in enumerate(T_.F.parts)}
            _kame.paint_turtle(P, pt, sh, TT, paint_kw.get('skin', '#6a7a4a'), paint_kw.get('shell', '#5a4a2a'), **{k_: v for k_, v in paint_kw.items() if k_ not in ('skin', 'shell')})
            _kame.turtle_face(P, TT, T_.seed)
        T.paints.append(paint_turtle)
        return T
    # ---- lizard
    k = kw.get('k', 1.0)
    sk = kw.get('skin', 'skin')
    T.region(sk, kw.get('col', '#7a9a4a'), 'scale')
    T.region('belly', '#e8dcb0', 'scale')
    z = 3.2 * k
    T.bone('body', (0, 0, z), 'root')
    BODY = [dict(c=(0, -5.0 * k, z + 0.6), w=4.0 * k, h=2.0 * k), dict(c=(0, -1.0 * k, z + 0.4), w=6.4 * k, ht=2.6 * k, hb=2.2 * k),
            dict(c=(0, 4.0 * k, z), w=5.6 * k, ht=2.2 * k, hb=2.0 * k), dict(c=(0, 7.4 * k, z - 0.6), w=3.0 * k, h=1.4 * k)]
    T.add('body', low(tk.loft('body', BODY, n=12, up=(0, 0, 1)), 'body', 120, lo=1, hi=3, region=(sk, [('belly', lambda C, N: N[:, 2] < -0.5)])))
    tail = [V3(0, 7.0 * k, z - 0.6), V3(1.0 * k, 11.0 * k, 1.0), V3(-1.4 * k, 14.0 * k, 0.6), V3(-3.4 * k, 14.6 * k, 0.5)]
    T.add('tail', limb('tail', tail, [1.4 * k, 0.9 * k, 0.5 * k, 0.15 * k], tris=24, region=sk, n=7, cap1='point'))
    T.bone('tail', tail[0], 'body')
    for sx in (1, -1):
        for fy in (-3.6 * k, 4.6 * k):
            T.add('body', limb('leg', [(sx * 2.4 * k, fy, z), (sx * 4.6 * k, fy - 0.6, z + 0.8), (sx * 5.6 * k, fy - 1.4, 0.6)], [1.0 * k, 0.8 * k, 0.6 * k], tris=18, region=sk, n=6))
            T.add('body', blob('foot', (sx * 5.8 * k, fy - 2.0, 0.45), 0.9 * k, tris=10, region=sk, squash=(1.2, 1.2, 0.5)))
    HC = V3(0, -7.6 * k, z + 1.6 * k)
    T.add('head', low(tk.loft('head', [dict(c=tuple(HC + V3(0, 2.0 * k, 0)), w=4.0 * k, h=2.2 * k), dict(c=tuple(HC), w=5.0 * k, ht=2.6 * k, hb=2.0 * k),
                                       dict(c=tuple(HC + V3(0, -3.0 * k, -0.4 * k)), w=3.0 * k, h=1.3 * k)], n=12, up=(0, 0, 1)), 'head', 80, region=sk))
    T.bone('head', HC + V3(0, 2.4 * k, 0), 'body')
    T.A.update(HEAD=HC, HR=2.5 * k, TOP=HC + V3(0, 0, 3 * k))
    T.face = dict(c=(0, HC[1] - 2.0 * k, HC[2] + 0.6 * k), axis=(0, -1, 0.3), regions=[sk], zmin=HC[2] - 3 * k, r=2.5 * k, eyes='dot', spread=1.5, size=0.14, dy=0.3,
                  mouth='long', mw=0.6, mdy=-0.4)
    return T


# ------------------------------------------------------------------ CLOTHING
def cloak(T, z_top=None, r_top=None, r_hem=None, z_hem=0.5, part='body', region='cloak', col='#26222e', rag=0.6, n_folds=9, y=0.4, sq=0.86):
    """A long cloak (a reaper's robe, a postman's cape) from the shoulders to the hem: a flared loft with cloth folds
    falling from the shoulders and a ragged, tattered hem (rag mm), its feet showing under it."""
    zt = z_top if z_top is not None else T.A['ZT'] + 0.4
    W = T.A.get('BODYW', 12.0)
    rt, rh = (r_top or W * 0.36), (r_hem or W * 0.68)
    T.region(region, col, 'cloth')
    zs = np.linspace(z_hem, zt, 6)
    R = []
    for i, z in enumerate(zs):
        t = (z - z_hem) / max(zt - z_hem, 1e-3)
        r = rh + (rt - rh) * t ** 0.8
        R.append(dict(c=(0, y, float(z)), w=2 * r, ht=2 * r * sq * 0.5, hb=2 * r * sq * 0.5))
    R.append(dict(c=(0, y, zt + 1.0), w=2 * rt * 0.62, h=rt * 0.5))
    o = tk.loft('cloak', R, n=16, up=(0, -1, 0), cap0='flat', cap1='round')
    ph = T.rng.uniform(0, 6)

    def hem(V):
        low_ = V[:, 2] < z_hem + 0.2
        a = np.arctan2(V[:, 1] - y, V[:, 0])
        V[low_, 2] = z_hem + rag * (0.5 + 0.5 * np.sign(np.sin(a[low_] * 7 + ph)) * np.abs(np.sin(a[low_] * 7 + ph)) ** 0.5)
        return V
    tk.deform(o, hem)
    p = low(o, 'cloak', 170, lo=1, hi=3, region=region, sculpt=folds((0, y, 0), n_folds, 0.4, zt, T.seed))
    if z_hem < 1.0:   # (a hem on the floor stands on it: the ragged points and the subdivided rim pressed flat)
        for o_ in p:
            tk.flat_bottom(o_, z_hem + rag + 0.4)
    T.add(part, p)
    T.A['CLOAK'] = dict(z_hem=z_hem, zt=zt, rh=rh, rt=rt, region=region)
    return T


def sleeves(T, region='cloak', bell=1.7, paw=None, r=None, kind='paw'):
    """Both arms as wide cloak sleeves from the shoulders to the hands (T.A HAND_R / HAND_L), paws peeking out."""
    a = T.A.get('ARMS', {})
    r = r or a.get('r', 1.7)
    for nm, side in (('arm_r', 'R'), ('arm_l', 'L')):
        arm(T, nm, T.A['SH_' + side], T.A['HAND_' + side], r=r, region=region, paw=paw or a.get('paw', 'fur'), kind=kind, sleeve=(region, bell))


def hood(T, part='hood', region='cloak', k=1.18, th=0.55, peak=1.0, depth=0.62, drop=1.35, open_k=1.0, pivot=None, ears_out=False):
    """A deep hood over the head (a reaper's cowl): a thick turned shell open at the front, its rim framing the face,
    its point flopping back (peak), its lower edge dropping onto the shoulders (drop). On its own bone (part) pivoting at
    the nape: press to flip it back (gimmick preset hood_back)."""
    HC, hr = T.A['HEAD'], T.A['HR']
    R = hr * k
    front = -hr * depth   # (the opening's plane, from the head centre: the face shows in front of it)
    back = R
    # profile (r, a) around the forward axis: a = distance behind the opening (the lathe's axis runs back to front)
    pr = [(0, back), (R * 0.55, back * 0.88), (R * 0.88, back * 0.55), (R, 0.0), (R * 0.99, -(-front) * 0.5), (R * 0.93 * open_k, front),
          (R * 0.93 * open_k - th, front + th * 0.3), (R - th * 1.1, -(-front) * 0.5 + th * 0.2), (R - th, 0.0), (R * 0.86 - th, back * 0.55 - th * 0.5),
          (R * 0.5 - th, back * 0.88 - th), (0, back - th)]
    o = tk.lathe('hood', [(r, -a) for r, a in pr], n=16, axis='Y', centre=(0, 0, 0))
    tk.set_verts(o, tk.verts(o) * np.array([1, -1, 1]))     # (the opening toward -Y)
    tk.fix_normals(o)
    tk.move(o, tuple(HC))

    def shape(V):
        d = V - HC
        up = d[:, 2] > 0
        # the peak: the crown pulled up and back into a soft point
        t = np.clip(d[:, 2] / R, 0, 1) * np.clip((d[:, 1] + R * 0.2) / R, 0, 1)
        V[:, 2] += peak * hr * 0.55 * t ** 2
        V[:, 1] += peak * hr * 0.5 * t ** 2
        # the lower half dropped down onto the shoulders, flared a little
        lo = ~up
        V[lo, 2] = HC[2] + d[lo, 2] * drop
        V[lo, 0] = HC[0] + d[lo, 0] * (1.0 + 0.12 * np.clip(-d[lo, 2] / R, 0, 1))
        return V
    tk.deform(o, shape)
    T.add(part, low(o, 'hood', 150, lo=1, hi=3, region=(region, [(region + '_in', lambda C, N: np.einsum('ij,ij->i', N, C - HC) < 0)]),
                    sculpt=blobs(ruffle(0.03, 1.6, T.seed + 5), folds(tuple(HC), 7, 0.22, HC[2] + R, T.seed + 6))))
    T.region(region + '_in', '#121016', 'cloth', base=-0.3)
    pv = pivot if pivot is not None else HC + V3(0, R * 0.7, -R * 0.75)
    T.bone(part, pv, 'head' if (part != 'head' and 'head' in T.bones) else 'body')
    T.A['HOOD'] = dict(pivot=V3(*pv), R=R)
    return T


def cap(T, kind='post', part='head', region='capcloth', col='#2a3a6a', band='capband', bandcol='#c8302a', k=1.0, tilt=-6, at=None, badge=True):
    """A cap on the head: 'post' (a peaked postman's / station cap, band and badge), 'beret', 'boater' (straw hat)."""
    HC, hr = T.A['HEAD'], T.A['HR']
    c = V3(*(at if at is not None else HC + V3(0, 0.2, hr * 0.78)))
    T.region(region, col, 'cloth')
    T.region(band, bandcol, 'cloth')
    r = hr * 0.72 * k
    if kind == 'boater':
        crown = tk.lathe('cap', [(0, 0), (r * 0.9, 0), (r * 0.88, r * 0.55), (0, r * 0.58)], n=14, centre=tuple(c))
        brim = tk.lathe('brim', [(r * 0.85, -0.15), (r * 1.6, -0.1), (r * 1.6, 0.15), (r * 0.85, 0.2)], n=16, centre=tuple(c))
        pieces = [low(crown, 'cap', 40, region=(region, [(band, lambda C, N: C[:, 2] < c[2] + r * 0.2)])), low(brim, 'brim', 40, region=region)]
    elif kind == 'beret':
        crown = tk.lathe('cap', [(0, 0), (r * 1.1, 0.1), (r * 1.25, r * 0.3), (r * 0.8, r * 0.55), (0, r * 0.6)], n=14, centre=tuple(c))
        pieces = [low(crown, 'cap', 50, region=region)]
    else:
        crown = tk.lathe('cap', [(0, 0), (r, 0), (r * 1.02, r * 0.35), (r * 1.15, r * 0.75), (r * 0.95, r * 0.95), (0, r * 1.0)], n=14, centre=tuple(c))
        out = tk.circle_pts(r * 1.75, 8, (0, 0), 210, 330, closed=False)[::-1] + tk.circle_pts(r * 0.95, 6, (0, 0), 210, 330, closed=False)
        pk = slab('peak', out, 0.35, 'peak', plane='XY', move=tuple(c + V3(0, 0, 0.15)), rot=[(-14, 'X', (0, 0, 0))])
        T.region('peak', '#1e1a1c', 'gloss')
        pieces = [low(crown, 'cap', 50, region=(region, [(band, lambda C, N: (C[:, 2] < c[2] + r * 0.36) & (np.abs(N[:, 2]) < 0.7))])), pk]
        if badge:
            pieces.append(blob('badge', c + V3(0, -r * 1.02, r * 0.55), r * 0.2, tris=10, region='badge', squash=(1, 0.4, 1)))
            T.region('badge', '#e8c040', 'metal')
    for p in pieces:
        for o in p:
            tk.rotate(o, tilt, 'X', pivot=tuple(c))
    T.add(part, *pieces)
    if part not in T.bones:   # (a cap on its own part pops off: it hangs from the root)
        T.bone(part, c, 'root')
    T.A['CAP'] = c + V3(0, 0, r)
    return T


def bag(T, part='body', at=None, size=(5.0, 2.0, 4.2), strap_from=None, region='bag', col='#7a4a2a', flap=True):
    """A satchel at `at` (default on the right hip) on a strap over the opposite shoulder."""
    W = T.A.get('BODYW', 12.0)
    at = V3(*(at if at is not None else (-W * 0.42, -1.6, T.A.get('ZB', 4) + 2.6)))
    T.region(region, col, 'cloth')
    T.add(part, box('bag', size, tuple(at), region, bev=0.6, rz=-70))
    if flap:
        T.add(part, box('flap', (size[0] * 1.02, size[1] * 0.4, size[2] * 0.5), tuple(at + V3(0.2, -size[1] * 0.45, size[2] * 0.22)), region, bev=0.3, rz=-70))
    sf = V3(*(strap_from if strap_from is not None else T.A['SH_L'] + V3(0, -0.4, 0.4)))
    mid = (sf + at) / 2 + V3(0, -W * 0.36, 0)
    T.add(part, limb('strap', [sf, mid, at + V3(0, 0, size[2] * 0.45)], [0.45, 0.45, 0.45], tris=16, region=region, n=5, squash=0.4))
    return T


def scarf(T, part='body', region='scarf', col='#c8302a', tails=True):
    NK, W = T.A['NECK'], T.A.get('BODYW', 12)
    T.region(region, col, 'cloth')
    r = W * 0.3
    pts = [NK + V3(r * math.cos(a), r * math.sin(a) * 0.9, 0.3 * math.sin(a * 2)) for a in np.linspace(0, 2 * math.pi, 9)[:-1]]
    T.add(part, low(tk.tube('scarf', [tuple(p) for p in pts], 0.9, n=6, closed=True), 'scarf', 40, region=region))
    if tails:
        t0 = NK + V3(-r * 0.6, -r * 0.8, -0.4)
        T.add(part, limb('tail', [t0, t0 + V3(-0.4, -0.6, -3.0), t0 + V3(-0.2, -0.4, -5.0)], [0.9, 0.85, 0.8], tris=14, region=region, n=6, squash=0.4))


# ------------------------------------------------------------------ PROPS
def scythe(T, part, grip, top=(0.0, 0.4, 1.0), L=26.0, blade=9.0, side=-1, region='snath', blade_region='blade', r=0.55, droop=0.35, bend=1.0,
           grip2=True, below=6.0):
    """A reaper's scythe held at grip: the snath (a slightly bent wooden pole) running `below` mm under the hand and up
    along `top` to its head, a second little hand-grip peg, the long curved blade sweeping to `side` (-1 viewer's left
    / +1 right) and drooping. Returns the snath's head and the blade's tip."""
    g = V3(*grip)
    u = V3(*top) / np.linalg.norm(top)
    p0, p1 = g - u * below, g + u * (L - below)
    s_ = np.cross(u, (0, -1, 0))
    s_ = s_ / (np.linalg.norm(s_) + 1e-6)
    mid = (p0 + p1) / 2 + s_ * 0.6 * bend
    T.region(region, '#5a3a24', 'wood')
    T.region(blade_region, '#c8ccd0', 'metal')
    T.add(part, limb('snath', [p0, mid, p1], [r, r, r * 0.9], tris=24, region=region, n=6))
    if grip2:
        q = g + u * (L * 0.35)
        T.add(part, limb('nib', [q, q + V3(0, -1.6, 0.4)], [0.4, 0.35], tris=8, region=region, n=5))
    # the blade: a tapered, curved loft from the head, flat facing the viewer
    sd = V3(side, 0, 0) - u * np.dot(u, (side, 0, 0))
    sd = sd / np.linalg.norm(sd)
    pts = [p1 - u * 0.4]
    for t in np.linspace(0.2, 1.0, 5):
        pts.append(p1 + sd * blade * t - u * blade * droop * t ** 1.8 + V3(0, -0.2 * t, 0))
    ws = np.linspace(blade * 0.22, blade * 0.04, len(pts))
    rings = [dict(c=tuple(p), w=float(w_), h=0.18, e=2.0, shift=0) for p, w_ in zip(pts, ws)]
    o = tk.loft('blade', rings, n=6, up=(0, 1, 0), cap0='round', cap1='point')
    T.add(part, low(o, 'blade', 30, lo=1, hi=2, region=blade_region))
    T.A['SCYTHE_HEAD'], T.A['BLADE_TIP'] = p1, pts[-1]
    return p1, pts[-1]


def lantern(T, part, hang, r=2.2, h=3.4, region='lantern', col='#f2e2b0', cap_col='#2a2224', handle=3.0):
    """A paper chochin lantern hanging from `hang` on a short cord: ribbed paper body, black lacquered rims."""
    hang = V3(*hang)
    c = hang - V3(0, 0, handle + h * 0.5)
    T.region(region, col, 'pvc')
    T.region('lacquer', cap_col, 'gloss')
    T.add(part, limb('cord', [hang, c + V3(0, 0, h * 0.5)], 0.18, tris=6, region='lacquer', n=4))
    prof = [(r * 0.55, -h * 0.5), (r * 0.9, -h * 0.35), (r, 0), (r * 0.9, h * 0.35), (r * 0.55, h * 0.5)]
    T.add(part, turn('lantern', prof, c, region, tris=50, n=12, sculpt=lambda hh: tk.push(hh, lambda V, N: -0.08 * (np.abs(np.mod(V[:, 2] - c[2], 0.6) - 0.3) < 0.06))))
    for sz in (-1, 1):
        T.add(part, turn('rim', [(0, -0.25), (r * 0.6, -0.25), (r * 0.6, 0.25), (0, 0.25)], c + V3(0, 0, sz * h * 0.5), 'lacquer', tris=20, n=10))
    T.A['LANTERN'] = c
    return c


def book(T, part, c, w=5.0, h=6.4, open_deg=140, rot=(), region='cover', col='#6a2a2a'):
    """An open book (two boards and a page block each side) at c, opening toward -Y."""
    T.region(region, col, 'cloth')
    T.region('page', '#efe6d2', 'pvc')
    a = math.radians((180 - open_deg) / 2)
    out = []
    for sx in (1, -1):
        cov = [(0, -h / 2), (w, -h / 2), (w, h / 2), (0, h / 2)]
        p = slab('cover', cov, 0.35, region, plane='XZ', rot=[(sx * -math.degrees(a), 'Z', (0, 0, 0))] if sx > 0 else [(180 + math.degrees(a), 'Z', (0, 0, 0))])
        pg = box('pages', (w * 0.92, 0.7, h * 0.92), (w * 0.48, -0.5, 0), 'page', bev=0.15)
        for o in pg:
            tk.rotate(o, -math.degrees(a) if sx > 0 else 180 + math.degrees(a), 'Z')
        out += [p, pg]
    for pp in out:
        for o in pp:
            for deg, ax in rot:
                tk.rotate(o, deg, ax)
            tk.move(o, tuple(c))
    T.add(part, *out)


def letter(T, part, c, w=4.4, h=3.0, rz=0.0, rx=0.0, region='envelope', col='#f2ebdc'):
    """An envelope (a thin bevelled card; the flap seam, address lines and stamp are painted: paint_letter)."""
    T.region(region, col, 'pvc')
    T.add(part, box('letter', (w, 0.4, h), tuple(c), region, bev=0.12, rz=rz, rx=rx))
    T.A.setdefault('LETTERS', []).append(dict(c=V3(*c), w=w, h=h, rz=rz, rx=rx, region=region))
    if paint_letter not in T.paints:
        T.paints.append(paint_letter)


def paint_letter(P, pt, sh, T):
    """Every letter's printed bits: the red postage stamp in the corner, a postmark ring, the address lines."""
    for L in T.A.get('LETTERS', []):
        c, w, h = L['c'], L['w'], L['h']
        m = P.region(L['region']) & (np.abs(P.Z - c[2]) < h) & (np.hypot(P.X - c[0], P.Y - c[1]) < w)
        d = np.stack([P.X - c[0], P.Y - c[1], P.Z - c[2]], -1)
        a = math.radians(L['rz'])
        u = d[..., 0] * math.cos(a) + d[..., 1] * math.sin(a)
        v = d[..., 2] * math.cos(math.radians(L['rx'])) - (-d[..., 0] * math.sin(a) + d[..., 1] * math.cos(a)) * math.sin(math.radians(L['rx']))
        st = m & (u > w * 0.18) & (u < w * 0.44) & (v > h * 0.08) & (v < h * 0.42)
        P.fill(st, pt.ramp('#c8302a', 5), tone=sh, base=0.15, brush=False)
        P.flat(m & (np.abs(np.hypot(u - w * 0.18, v - h * 0.18) - h * 0.2) < 0.08), '#3a3a5a')
        for i, vv in enumerate((-0.05, -0.2, -0.33)):
            P.flat(m & (np.abs(v - vv * h) < 0.06) & (u > -w * 0.32) & (u < w * (0.12 - 0.08 * i)), '#4a4a5a')


def parcel(T, part, c, size=(5.0, 4.0, 3.6), rz=0.0, region='kraft', col='#c89a62', string='#efe6d0'):
    """A brown-paper parcel tied with string both ways (the string painted on its own region strip)."""
    T.region(region, col, 'pvc')
    T.region('string', string, 'pvc')
    T.add(part, box('parcel', size, tuple(c), region, bev=0.3, rz=rz))
    sx, sy, sz = size
    T.add(part, box('str1', (sx + 0.15, 0.5, sz + 0.15), tuple(c), 'string', bev=0.05, rz=rz))
    T.add(part, box('str2', (0.5, sy + 0.15, sz + 0.15), tuple(c), 'string', bev=0.05, rz=rz))
    T.add(part, blob('knot', V3(*c) + V3(0, 0, sz / 2 + 0.2), 0.6, tris=10, region='string', squash=(1.4, 1, 0.6)))


def hanko(T, part, c, r=1.0, h=3.0, region='hanko', col='#c8a070', ink='#c8302a', rx=0.0):
    """A hanko stamp: a turned wooden handle, its red rubber face at the bottom."""
    T.region(region, col, 'wood')
    T.region('stampink', ink, 'pvc')
    c = V3(*c)
    p = turn('hanko', [(0, 0), (r, 0), (r, h * 0.35), (r * 0.7, h * 0.6), (r * 0.85, h * 0.85), (0, h)], c, (region, [('stampink', lambda C, N: C[:, 2] < c[2] + 0.25)]),
             tris=30, n=10)
    for o in p:
        tk.rotate(o, rx, 'X', pivot=tuple(c))
    T.add(part, p)


def cup(T, part, c, r=1.6, h=2.4, region='cup', col='#6a7a5a'):
    """A yunomi tea cup (turned, a foot ring, the tea's surface inside)."""
    T.region(region, col, 'gloss')
    T.region('tea', '#7a8a3a', 'gloss')
    c = V3(*c)
    T.add(part, turn('cup', [(0, 0), (r * 0.7, 0), (r * 0.72, 0.3), (r * 0.85, 0.35), (r, h), (r * 0.88, h), (r * 0.8, h * 0.8), (0, h * 0.78)], c,
                     (region, [('tea', lambda C, N: (N[:, 2] > 0.8) & (C[:, 2] > c[2] + h * 0.6) & (np.hypot(C[:, 0] - c[0], C[:, 1] - c[1]) < r * 0.8))]), tris=36, n=12))


def can(T, part, c, r=1.8, h=2.8, spout=(0, -1, 0.6), region='tin', col='#5a8a9a'):
    """A little watering can: turned body, a long spout with its rose, a hoop handle."""
    T.region(region, col, 'metal')
    c = V3(*c)
    T.add(part, turn('can', [(0, 0), (r, 0), (r * 1.02, h * 0.9), (r * 0.7, h), (0, h)], c, region, tris=40, n=12))
    sd = V3(*spout) / np.linalg.norm(spout)
    s0 = c + V3(0, -r * 0.8, h * 0.3)
    T.add(part, limb('spout', [s0, s0 + sd * r * 2.2], [0.4, 0.28], tris=12, region=region, n=6))
    T.add(part, blob('rose', s0 + sd * r * 2.3, 0.55, tris=10, region=region, squash=(1, 0.6, 1)))
    T.add(part, limb('handle', [c + V3(0, r * 0.6, h), c + V3(0, r * 0.4, h + r * 0.9), c + V3(0, -r * 0.4, h + r * 0.9), c + V3(0, -r * 0.6, h)], 0.3, tris=14, region=region, n=5))
    T.A['SPOUT'] = s0 + sd * r * 2.3
    return T


def postbox(T, part, c, r=4.6, h=13.0, region='pillar', col='#c8281e', slot=True, door=False):
    """A round pillar postbox: plinth ring, the red drum, a domed cap with its brim, the letter slot (a dark recess
    under a little hood), a door panel line; on its own part (a hermit crab's house)."""
    c = V3(*c)
    T.region(region, col, 'lacquer')
    T.region('slot', '#141012', 'pvc')
    T.region('plate', '#efe6d0', 'pvc')
    prof = [(0, 0), (r * 1.08, 0), (r * 1.08, 0.8), (r, 1.0), (r, h * 0.78), (r * 1.12, h * 0.8), (r * 1.12, h * 0.85), (r * 0.95, h * 0.88), (r * 0.8, h * 0.97), (r * 0.4, h * 1.02), (0, h * 1.03)]

    def sc(hh):
        def f(V, N):
            d = V - c
            a = np.arctan2(d[:, 0], -d[:, 1])
            door = (np.abs(np.abs(a) - 0.55) < 0.03) & (d[:, 2] > h * 0.2) & (d[:, 2] < h * 0.6)
            sl = (np.abs(a) < 0.45) & (np.abs(d[:, 2] - h * 0.68) < h * 0.025)
            return -0.15 * door - 0.45 * sl
        tk.push(hh, f)
    rings = [dict(c=tuple(c + V3(0, 0, z)), w=2 * r_, h=r_) for r_, z in prof if r_ > 0]
    pil = tk.loft('pillar', rings, n=18, up=(0, -1, 0), cap0='flat', cap1='round', capd=r * 0.12)
    T.add(part, cage(pil, 'pillar', sculpt=sc, region=(region, [('slot', lambda C, N: (N[:, 1] < -0.6) & (np.abs(C[:, 2] - c[2] - h * 0.68) < h * 0.03) & (np.abs(C[:, 0] - c[0]) < r * 0.4)),
                                                   ('plate', lambda C, N: (N[:, 1] < -0.7) & (np.abs(C[:, 2] - c[2] - h * 0.48) < h * 0.07) & (np.abs(C[:, 0] - c[0]) < r * 0.28))]
                                          + ([('slot', lambda C, N: (N[:, 1] < -0.3) & (C[:, 2] < c[2] + h * 0.3) & (np.abs(C[:, 0] - c[0]) < r * 0.62))] if door else []))))
    if slot:
        T.add(part, box('slothood', (r * 0.95, 0.9, 0.5), tuple(c + V3(0, -r * 1.02, h * 0.72)), region, bev=0.15, rx=-12))
    T.A['SLOT'] = c + V3(0, -r, h * 0.68)
    return T


# ------------------------------------------------------------------ BASES
def base(T, kind='disc', r=13.0, h=2.6, part='body', region=None, col=None, top=None, column=False):
    """A figure's own base (only where the toy needs one): disc (a turned plinth), mound (a dirt / sand drift),
    rock (cobbles), puddle (a stone rim with water in it), wave (a breaking swell with foam), wisp (a will-o'-the-wisp
    flame stand to T.A['BELLY']), coral (a branching coral stand). Returns the top height."""
    rg = region or {'disc': 'plinth', 'mound': 'dirt', 'rock': 'stone', 'puddle': 'stone', 'wave': 'sea', 'wisp': 'flame', 'coral': 'coral'}[kind]
    dc = {'plinth': '#4a4450', 'dirt': '#6a4a30', 'stone': '#7a766e', 'sea': '#2a6a8a', 'flame': '#8ad0e0', 'coral': '#e07a6a'}
    T.region(rg, col or dc.get(rg, '#7a766e'), {'dirt': 'pvc', 'sea': 'gloss', 'flame': 'gloss'}.get(rg, 'pvc'))
    if part != 'body':
        T.bone(part, (0, 0, h * 0.5), 'root')
    if kind == 'disc':
        T.add(part, plinth('base', r=r, h=h, region=rg, tris=60, n=14))
        return h
    if kind == 'mound':
        T.add(part, drift('base', r=r, h=h, seed=T.seed, region=rg, tris=90))
        return h
    if kind == 'rock':
        T.add(part, cobbles('base', r=r, h=h, seed=T.seed, region=rg, tris=90))
        return h
    if kind == 'puddle':
        o = tk.lathe('base', [(0, h * 0.6), (r * 0.72, h * 0.6), (r * 0.78, h * 1.05), (r * 0.98, h), (r, 0), (0, 0)][::-1], n=24)
        T.region('water', '#3a6a7a', 'gloss')
        T.add(part, cage(o, 'base', region=(rg, [('water', lambda C, N: (N[:, 2] > 0.8) & (np.hypot(C[:, 0], C[:, 1]) < r * 0.72))]),
                         sculpt=ruffle(0.2, 1.4, T.seed)))
        return h * 0.6
    if kind == 'wave':
        o = tk.lathe('base', [(0, 0), (r, 0), (r * 1.02, h * 0.5), (r * 0.9, h), (r * 0.5, h * 1.1), (0, h * 1.12)], n=20)
        ph = T.rng.uniform(0, 6)
        T.region('foam', '#eef2ee', 'pvc')

        def sw(hh):
            tk.push(hh, lambda V, N: 0.5 * np.sin(V[:, 0] * 0.6 + ph) * np.sin(V[:, 1] * 0.5) * tk.smoothstep(0.3, 0.9, N[:, 2]))
        T.add(part, low(o, 'base', 100, lo=1, hi=3, sculpt=sw, region=(rg, [('foam', lambda C, N: (C[:, 2] > h * 0.4) & (np.hypot(C[:, 0], C[:, 1]) > r * 0.82))])))
        if column:   # a swell of water rising to hold the figure up (to T.A['BELLY'])
            tp = T.A.get('BELLY', V3(0, 0, 10))
            pts = [V3(0, 0, h * 0.8), V3(0.5, 0.4, h + (tp[2] - h) * 0.45), V3(tp[0], tp[1], tp[2] + 0.8)]
            T.add(part, low(tk.tube('swell', [tuple(p) for p in pts], [r * 0.4, r * 0.24, r * 0.3], n=12), 'swell', 60, region=rg,
                            sculpt=lambda hh: tk.push(hh, lambda V, N: 0.3 * np.sin(np.arctan2(V[:, 1], V[:, 0]) * 4 + V[:, 2] * 0.5))))
        return h
    if kind == 'wisp':
        top = T.A.get('BELLY', V3(0, 0, 10))
        rr = r * 0.62
        T.add(part, turn('base', [(0, 0), (rr, 0), (rr * 0.96, h * 0.7), (rr * 0.8, h), (0, h)], (0, 0, 0), 'plinth', tris=40, n=14))
        T.region('plinth', '#2a2630', 'pvc')
        pts = [V3(0, 0, h), V3(0.6, 0.3, h + (top[2] - h) * 0.35), V3(-0.8, 0.0, h + (top[2] - h) * 0.7), V3(top[0], top[1], top[2] + 0.6)]
        tw = lambda hh: tk.push(hh, lambda V, N: 0.25 * np.sin(np.arctan2(V[:, 1], V[:, 0]) * 3 + V[:, 2] * 0.6))  # noqa: E731
        T.add(part, low(tk.tube('wisp', [tuple(p) for p in pts], [rr * 0.55, rr * 0.3, rr * 0.22, rr * 0.3], n=10), 'wisp', 60, region=rg, sculpt=tw))
        return h
    if kind == 'coral':
        top = top if top is not None else T.A.get('CORAL_TOP', V3(0, 0, 8))
        T.add(part, turn('base', [(0, 0), (r * 0.7, 0), (r * 0.68, h * 0.7), (r * 0.55, h), (0, h)], (0, 0, 0), 'stone', tris=40, n=14, sculpt=ruffle(0.25, 1.2, T.seed)))
        T.region('stone', '#9a948a', 'pvc')
        stem = [V3(0, 0, h), V3(0.6, 0.0, (h + top[2]) * 0.5), V3(*top)]
        T.add(part, limb('coral', stem, [1.4, 1.0, 0.8], tris=30, region=rg, n=8, sculpt=ruffle(0.15, 3.0, T.seed)))
        for sx, z in ((1, 0.45), (-1, 0.62)):
            p0 = stem[0] + (V3(*top) - stem[0]) * z
            T.add(part, limb('branch', [p0, p0 + V3(sx * 2.6, -0.4, 2.0), p0 + V3(sx * 3.2, -0.6, 4.4)], [0.8, 0.6, 0.45], tris=18, region=rg, n=6))
        return h
    raise ValueError(kind)


# ------------------------------------------------------------------ GIMMICK PRESETS (each returns fn(k, T) for T.gim)
def hood_back(f0=8, hold=30, deg=120):
    """The hood flips back off the head (on its nape pivot) and later slides up over it again."""
    def g(k, T):
        k('hood', f0)
        k('hood', f0 + 7, rot=('X', deg * 0.75), move=(0, 0.8, 1.2), ease='BACK')
        k('hood', f0 + 9, rot=('X', deg * 0.72), move=(0, 0.8, 1.0))
        k('hood', f0 + hold, rot=('X', deg * 0.72), move=(0, 0.8, 1.0))
        k('hood', f0 + hold + 8)
    return g


def seq(bone, keys):
    """Free keys on one bone: [(frame, dict(rot=..., move=..., scale=..., ease=...)), ...]."""
    def g(k, T):
        for f, kw in keys:
            k(bone, f, **kw)
    return g


def wave(bone, f0, f1, axis='Y', amp=20.0, step=4, base=None):
    """A to-and-fro (a waving claw, a wagging tail, a head shake) from f0 to f1."""
    def g(k, T):
        k(bone, f0, rot=base) if base else k(bone, f0)
        for i, f in enumerate(range(f0 + step, f1, step)):
            r = [(axis, amp if i % 2 == 0 else -amp)] + ([base] if base else [])
            k(bone, f, rot=r)
        k(bone, f1, rot=base) if base else k(bone, f1)
    return g


def hop(f0, n=2, h=4.0, step=8, bone='body'):
    def g(k, T):
        for i in range(n):
            f = f0 + i * step
            k(bone, f)
            k(bone, f + step // 2, move=(0, 0, h), ease=('QUAD', 'EASE_OUT'))
        k(bone, f0 + n * step, ease='BOUNCE')
    return g


def flap(f0, f1, amp=40.0, step=3):
    def g(k, T):
        for nm, sx in (('wing_r', -1), ('wing_l', 1)):
            k(nm, f0)
            for i, f in enumerate(range(f0 + step, f1, step)):
                k(nm, f, rot=('Y', sx * (amp if i % 2 == 0 else amp * 0.2)))
            k(nm, f1)
    return g


def spin(bone, f0, f1, deg=360.0, axis='Z'):
    def g(k, T):
        k(bone, f0)
        k(bone, f1, rot=(axis, deg), ease=('SINE', 'EASE_IN_OUT'))
        k(bone, f1 + 1)
    return g


def inflate(bone, f0, f1, s=1.45, hold=12):
    def g(k, T):
        k(bone, f0)
        k(bone, f0 + 5, scale=s, ease='ELASTIC')
        k(bone, f0 + 5 + hold, scale=s * 0.98)
        k(bone, f1)
    return g


def pop(bone, f0, f1, dz=5.0, hold=12, rot=None):
    def g(k, T):
        k(bone, f0)
        k(bone, f0 + 6, move=(0, 0, dz), rot=rot, ease='BACK')
        k(bone, f0 + 6 + hold, move=(0, 0, dz), rot=rot)
        k(bone, f1)
    return g


# ------------------------------------------------------------------ the spec's build list (series.json "build")
FAMILIES = {}


def ref(T, v):
    """A spec value: an anchor name ('HAND_R'), an anchor plus an offset ('HAND_R+0,-1,2'), or a plain value
    (lists resolved item by item)."""
    if isinstance(v, str) and v[:1].isupper() and v.split('+')[0].split('*')[0] in T.A:
        nm, _, off = v.partition('+')
        a = T.A[nm]
        return a + V3(*[float(x) for x in off.split(',')]) if off else a
    if isinstance(v, list) and any(isinstance(x, str) and x[:1].isupper() for x in v):
        return [ref(T, x) for x in v]
    return v


def build(T, steps=None):
    """Run the spec's build list: [[fn, {kwargs}], ...]: a family (mammal, bird, fish, crab, insect, reptile), clothing
    (cloak, hood, sleeves, cap, bag, scarf), props (scythe, lantern, book, letter, parcel, hanko, can, postbox), base,
    and ['gim', preset, {kwargs}] gimmick presets (hood_back, seq, wave, hop, flap, spin, inflate, pop). Anchor names
    in the kwargs are resolved when the step runs (so a prop can use the hand the family just made)."""
    G = globals()
    for st in (steps if steps is not None else T.S.get('build', [])):
        fn, kw = st[0], (st[1] if len(st) > 1 else {})
        if fn == 'gim':
            T.gim(G[kw](**{k: ref(T, v) for k, v in (st[2] if len(st) > 2 else {}).items()}))
            continue
        if fn == 'xform':
            T.xform(**kw)
            continue
        kw = {k: ref(T, v) for k, v in kw.items()}
        if fn == 'base':
            base(T, **kw)
        elif fn in ('mammal', 'bird', 'fish', 'crab', 'insect', 'reptile', 'cloak', 'sleeves', 'hood', 'cap', 'bag', 'scarf', 'postbox'):
            G[fn](T, **kw)
        else:   # props take (T, part, ...)
            G[fn](T, **kw)
    return T
