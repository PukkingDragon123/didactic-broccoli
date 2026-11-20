"""Shared builder for series tabigame (World Tour Turtles): a turtle on its own four feet (or flippers) whose carapace
carries a world landmark (generic architecture: no signage, no logos). Each figure builds its own landmark and picks
its species' proportions, so every entry is its own sculpt. Faceted low-poly (FACET.md).

The common gimmick (shell_keys): head and legs pull in, the turtle settles on its plastron, the landmark shell lifts
off its back with a little turn (the turtle wears a striped vest under it), drops back, and out it all comes again.

The turtle is the real animal (the owner's realism pass, the series' benchmark): see Turtle.

    HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
    from _kame import *
"""
import math
import os
import sys

HERE_K = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE_K, '..', 'sabaku'), os.path.join(HERE_K, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403
import face  # noqa: E402

# the species' faces (lib/face.py kit): each turtle its own take
face.SPECIES.update({'tabigame/pagoda': 'pondturtle', 'tabigame/pisa': 'slider', 'tabigame/tokei': 'boxturtle',
                     'tabigame/piramido': 'sulcata', 'tabigame/tamanegi': 'steppe', 'tabigame/sekai': 'seaturtle'})
face.STYLE.update({
    'pondturtle': dict(eye='round', iris='#a07a28', lid=True, tilt=-6, mouth='beakline', eyek=1.0),                 # calm
    'slider': dict(eye='round', iris='#8a9a30', brows=('worried', 1.1), mouth='beakline', extras=('sweat',), eyek=1.0),  # nervous
    'boxturtle': dict(eye='round', iris='#d8602a', eyek=1.1, tilt=4, mouth='beakline'),                   # red-eyed, prim
    'sulcata': dict(eye='round', iris='#7a5626', lid=True, tilt=-10, brows=('flat', 1.2), mouth='beakline', eyek=0.95),  # grumpy elder
    'steppe': dict(eye='round', iris='#6a5028', eyek=1.05, tilt=8, mouth='beakline', extras=('blush',)),  # cheeky
    'seaturtle': dict(eye='round', iris='#6a5a30', lid=True, lashes=2, tilt=-4, mouth='beakline', eyek=1.0),      # wise
})


def lowk(o, name, tris, region, lo=1, hi=2, sculpt=None):
    return low(o, name, tris, lo=lo, hi=hi, region=region, sculpt=sculpt)


def box(name, size, c, region, tris=12, bev=0.25):
    """A bevelled block (game mesh, sculpt)."""
    a = tk.rbox(name, size, centre=c, bevel=bev, segs=1)
    b = tk.rbox(name + '_hi', size, centre=c, bevel=bev, segs=2)
    tk.set_region(b, region)
    if tris > 16:
        tk.decimate(a, tris)
    return a, b


def tier(name, rings, region, tris=40, n=16, e=5.0, sculpt=None, cap0='flat', cap1='flat', warp=None, at=None):
    """A square-ish (superellipse) vertical form: rings = [(z, w, d), ...] bottom to top, centred on `at` (x, y);
    warp(V) -> V reshapes the cage (upturned eaves)."""
    cx, cy = at or tier.at
    R = [dict(c=(cx, cy, z), w=w, h=d / 2, e=e) for z, w, d in rings]
    o = tk.loft(name, R, n=n, up=(0, -1, 0), cap0=cap0, cap1=cap1)
    if warp:
        tk.deform(o, warp)
    return lowk(o, name, tris, region, sculpt=sculpt)


tier.at = (0.0, 0.0)


def turn(name, prof, c, region, tris=40, n=12, sculpt=None, lo=1, hi=2):
    """A turned form (lathe) at c: prof = [(r, z), ...] (z from c)."""
    return lowk(tk.lathe(name, prof, n=n, centre=c), name, tris, region, lo=lo, hi=hi, sculpt=sculpt)


# ------------------------------------------------------------------ the real animal (the owner's realism pass)
# A turtle as it is built (photos of the six species beside the screen): the carapace modelled scute by scute (five
# vertebrals, four costals a side whose seams meet the vertebrals' side corners, 25 marginals with the nuchal over the
# neck), each scute a low faceted plate rising to its areola; the plastron a separate plate with its notches and the
# bridges up to the shell; the skull a flat-crowned wedge with a hooked beak, a separate lower jaw and the eardrum
# behind the eye; jointed limbs (a tortoise's flattened, scaled fore limbs and elephantine hind feet, a terrapin's
# webbed feet with long claws, a sea turtle's wing-like flippers); five claws on a fore foot, four on a hind one.

# the scute plates in plan, scaled to the shell (u across, v along, the head at v = -1): the seams' meeting points
_RIN = 0.84                                                   # the marginals' inner border
_SEAMS = [7.2 + 14.4 * k for k in range(12)]                  # marginal seams a side (the nuchal at 0, the supracaudals at 180)
_RING = sorted([-a for a in _SEAMS] + _SEAMS + [180.0])
_PTS = {'P1': (0.21, -0.47), 'P2': (0.21, -0.155), 'P3': (0.21, 0.155), 'P4': (0.21, 0.47),
        'Q0': (0.33, -0.31), 'Q1': (0.34, 0.0), 'Q2': (0.33, 0.31)}


def _ring(a, r=_RIN):
    a = math.radians(a)
    return (r * math.sin(a), -r * math.cos(a))


def _pt(nm, sx=1):
    if nm[0] == 'R':
        return _ring(sx * float(nm[1:]))
    if nm[0] == 'M':
        return (0.0, (-0.47, -0.155, 0.155, 0.47)[int(nm[1]) - 1])
    u, v = _PTS[nm]
    return (sx * u, v)


# each dorsal scute: its corners (names: R<angle> ring points, M<k> midline, P / Q seam corners; '-' mirrored)
_SIDE = {'C1': ['R21.6', 'R36', 'R50.4', 'R64.8', 'Q0', 'P1'], 'C2': ['R64.8', 'R79.2', 'R93.6', 'Q1', 'P2', 'Q0'],
         'C3': ['R93.6', 'R108', 'R122.4', 'Q2', 'P3', 'Q1'], 'C4': ['R122.4', 'R136.8', 'R151.2', 'P4', 'Q2']}
_VERT = {'V1': ['-R21.6', '-R7.2', 'R7.2', 'R21.6', 'P1', 'M1', '-P1'], 'V2': ['-P1', 'M1', 'P1', 'Q0', 'P2', 'M2', '-P2', '-Q0'],
         'V3': ['-P2', 'M2', 'P2', 'Q1', 'P3', 'M3', '-P3', '-Q1'], 'V4': ['-P3', 'M3', 'P3', 'Q2', 'P4', 'M4', '-P4', '-Q2'],
         'V5': ['-P4', 'M4', 'P4', 'R151.2', 'R165.6', 'R180', '-R165.6', '-R151.2']}


def _scutes():
    """[(name, [(u, v), ...] corners in order, [corner keys])] for the 13 dorsal scutes (vertebrals then costals)."""
    out = []

    def key(nm):
        sx = -1 if nm.startswith('-') else 1
        nm = nm.lstrip('-')
        if nm in ('R180',) or nm[0] == 'M':
            sx = 1
        return (nm, sx), _pt(nm, sx)
    for nm, cs in _VERT.items():
        ks, ps = zip(*[key(c) for c in cs])
        out.append((nm, list(ps), list(ks)))
    for sx in (1, -1):
        for nm, cs in _SIDE.items():
            ks, ps = zip(*[key(('-' if sx < 0 else '') + c) for c in cs])
            out.append((nm + ('r' if sx > 0 else 'l'), list(ps)[::sx], list(ks)[::sx]))
    return out


SCUTES = _scutes()

# per species: the shell's build (keel, areola rise, a serrated rim, the rim's lift over the neck), the limbs
BUILD = {
    'pond': dict(keel=0.55, rise=0.25, serr=('rear',), lift=0.5, post=0.07),
    'slider': dict(keel=0.25, rise=0.15, serr=('rear',), lift=0.35, post=0.06),
    'box': dict(keel=0.45, rise=0.25, serr=(), lift=0.2, post=0.04),
    'sulcata': dict(keel=0.0, rise=0.6, serr=('front', 'rear'), lift=1.1, post=0.08),
    'steppe': dict(keel=0.0, rise=0.35, serr=(), lift=0.5, post=0.05),
    'seaturtle': dict(keel=0.2, rise=0.12, serr=('rear',), lift=0.25, post=0.0, tear=0.3),
}


def _mesh(name, V, Fc, region, hi=1, sculpt=None, keep=True):
    """A hand-built faceted game mesh (vertices / faces as modelled, kept as they are) and its sculpt (the same
    subdivided `hi` times, `sculpt` applied, then the region rules)."""
    a = tk.from_pydata(name, [tuple(map(float, v)) for v in V], Fc)
    tk.fix_normals(a)
    a['facet'] = 1
    b = tk.copy(a, name + '_hi')
    tk.subsurf(b, hi, keep_corners=False)
    if sculpt:
        sculpt(b)
    if isinstance(region, str):
        tk.set_region(b, region)
    else:
        tk.regions(b, region[0], region[1])
    return a, b


class Turtle:
    """The turtle: body (plastron, bridges, the soft body and the vest under the shell), four legs (or flippers) and a
    tail ('legs'), the neck and head ('head'), the carapace ('shell', the landmark is added to it). Faces -Y.

    L, W: carapace length / width; clr: plastron height over the shelf; dome: carapace height; neck: how far the head
    reaches; legs: 'stump' (tortoise), 'webbed' (terrapin), 'flipper' (sea turtle); spurs: the spurred tortoise's
    thigh spurs; flat_top: how flat the crown is; sp: the species (BUILD, SPECIES)."""

    def __init__(s, B, L=26.0, W=21.0, clr=3.2, dome=8.0, neck=1.0, head=1.0, legs='stump', spurs=False, rim=1.0,
                 flat_top=0.45, hz=1.0, sp='pond'):
        s.B, s.L, s.W, s.clr, s.dome, s.rim, s.sp, s.kind = B, L, W, clr, dome, rim, sp, legs
        s.bd = BUILD.get(sp, BUILD['pond'])
        s.flat_top = flat_top
        s.R, s.H = W / 2, L / 2
        s.ZB = clr + 1.6                          # the carapace's rim height
        s.BC = (0.0, 0.0, clr + 2.6)              # the body's centre (bones)
        s.top = s.ZB + dome * 0.94                # where the landmark stands
        s.turned = None
        s.carapace()
        s.plastron()
        # ---- the soft body inside (seen at the openings) with the vest on its back (under the shell)
        body = tk.loft('body', [dict(c=(0, L * 0.4, clr + 2.3), w=W * 0.42, h=1.6), dict(c=(0, L * 0.18, clr + 2.8), w=W * 0.74, h=2.6),
                                dict(c=(0, -L * 0.16, clr + 2.8), w=W * 0.76, h=2.6), dict(c=(0, -L * 0.38, clr + 2.5), w=W * 0.48, h=1.9)],
                       n=12, up=(0, 0, 1), cap0='round', cap1='round')
        B.add('body', lowk(body, 'body', 70, ('skin', [('vest', lambda C, N: N[:, 2] > 0.55)])))
        s.head_neck(neck, head, hz)
        s.limbs(legs, spurs)
        s.tail()

    # -------------------------------------------------------------- the shell, scute by scute
    def plan(s, u, v):
        """Plan position (mm) of the normalized (u, v): a little wider behind (or a sea turtle's teardrop)."""
        bd = s.bd
        w = 1 + bd['post'] * v - bd.get('tear', 0) * np.clip(v, 0, 1) ** 1.6
        return u * s.R * w, v * s.H

    def unplan(s, X, Y):
        v = np.asarray(Y) / s.H
        bd = s.bd
        w = 1 + bd['post'] * v - bd.get('tear', 0) * np.clip(v, 0, 1) ** 1.6
        return np.asarray(X) / (s.R * w), v

    def zdorsal(s, u, v):
        """The carapace's height over the plan: a dome (flat-crowned per flat_top) from the marginals' inner border
        up, plus the keel down the vertebrals."""
        rho = np.hypot(u, v)
        p = 2.0 + 1.6 * s.flat_top + 1.2 * (s.dome / s.R > 0.75)   # (a high box turtle's / tortoise's dome: steeper sides)
        cap = np.clip(1 - np.minimum(rho, 1.0) ** p, 0, 1) ** 0.75
        z = s.ZB + 0.4 * s.rim + s.dome * cap
        z += s.bd['keel'] * np.exp(-(np.asarray(u) / 0.09) ** 2) * cap
        z += s.bd['lift'] * np.clip(-np.asarray(v) - 0.55, 0, 1) * 1.6       # the shell's front lifted over the neck
        return z

    def carapace(s):
        bd, ZB, rim = s.bd, s.ZB, s.rim
        V, Fc, idx = [], [], {}

        def vert(key, u, v, z):
            if key not in idx:
                x, y = s.plan(u, v)
                idx[key] = len(V)
                V.append((x, y, z))
            return idx[key]

        def dorsal(k, u, v):
            return vert(k, u, v, float(s.zdorsal(u, v)))
        # the dorsal scutes: a faceted plate each, from its corners up to its raised areola
        for nm, ps, ks in SCUTES:
            cu, cv = np.mean([p[0] for p in ps]), np.mean([p[1] for p in ps])
            if nm.startswith('C'):   # (a costal's areola sits toward its upper back corner, as on the animal)
                cu, cv = cu * 0.86, cv + 0.03
            ap = vert(('A', nm), cu, cv, float(s.zdorsal(cu, cv)) + bd['rise'] * (1.25 if nm.startswith('V') else 1.0))
            ids = [dorsal(k, u, v) for k, (u, v) in zip(ks, ps)]
            for i in range(len(ids)):
                Fc.append([ap, ids[i], ids[(i + 1) % len(ids)]])
        # the marginals: a ring of plates from the inner border out and down over the rim, the lip under them
        n = len(_RING)
        for i in range(n):
            a0, a1 = _RING[i], _RING[(i + 1) % n] + (360 if i == n - 1 else 0)
            am = (a0 + a1) / 2
            front, rear = abs(((am + 180) % 360) - 180) < 60, abs(((am + 180) % 360) - 180) > 135
            serr = ('front' in bd['serr'] and front) or ('rear' in bd['serr'] and rear)

            def outer(a, r=1.0):
                u, v = _ring(a, r)
                lift = bd['lift'] * np.clip(-v - 0.6, 0, 1) * 1.8 * 0.8
                flare = 0.25 * rim * (abs(((a + 180) % 360) - 180) > 120)    # the rear rim flared out over the tail
                return u, v, ZB + 0.35 * rim + lift - flare

            def key_r(a):
                return ('R%g' % abs(a), 1 if 0 < a < 180 else (-1 if a < 0 else 1))
            r0 = idx[key_r(a0)] if key_r(a0) in idx else dorsal(key_r(a0), *_ring(a0))
            a1n = _RING[(i + 1) % n]
            r1 = idx[key_r(a1n)] if key_r(a1n) in idx else dorsal(key_r(a1n), *_ring(a1n))
            o0 = vert(('O', a0), *outer(a0))
            o1 = vert(('O', a1n), *outer(a1n))
            l0 = vert(('L', a0), *_ring(a0, 0.95), ZB - 0.45)
            l1 = vert(('L', a1n), *_ring(a1n, 0.95), ZB - 0.45)
            if serr:   # a serrated rim: each marginal's edge drawn out to a point between its seams
                u, v, z = outer(am, 1.045)
                om = vert(('Om', am), u, v, z - 0.15)
                Fc += [[r0, om, r1], [r0, o0, om], [r1, om, o1], [o0, l0, om], [om, l0, l1], [om, l1, o1]]
            else:
                Fc += [[r0, o0, o1, r1], [o0, l0, l1, o1]]
        Fc.append([idx[('L', a)] for a in _RING][::-1])   # (the underside, closed: inside the body)
        reg = ('shell', [('marginal', lambda C, N: s.scute_at(C[:, 0], C[:, 1], C[:, 2])[2])])

        def sc(h):  # the seams sunk as grooves; growth steps parallel to them on a tortoise's scutes
            def f(Vh, Nh):
                sid, e, mar = s.scute_at(Vh[:, 0], Vh[:, 1], Vh[:, 2])
                out = -0.3 * np.clip(1 - e / 0.28, 0, 1)
                if s.sp in ('sulcata', 'steppe', 'box', 'pond'):
                    out -= 0.06 * (np.abs(np.mod(e, 0.5) - 0.25) < 0.07) * (e > 0.3)
                return out
            tk.push(h, f)
        s.B.add('shell', _mesh('cara', V, Fc, reg, hi=2, sculpt=sc))

    def scute_at(s, X, Y, Z):
        """Which scute a point of the carapace is on (0-12 dorsal: SCUTES order; 20+ marginal), its distance (mm) to
        the scute's seam, and whether it is a marginal: the modelled layout, exactly."""
        u, v = s.unplan(X, Y)
        u, v = np.asarray(u, float), np.asarray(v, float)
        sid = np.full(u.shape, -1, np.int32)
        e = np.full(u.shape, 99.0)
        for j, (nm, ps, ks) in enumerate(SCUTES):
            P = np.asarray(ps)
            inside = np.zeros(u.shape, bool)
            d = np.full(u.shape, 99.0)
            for i in range(len(P)):
                (x0, y0), (x1, y1) = P[i], P[(i + 1) % len(P)]
                cr = ((y0 > v) != (y1 > v)) & (u < (x1 - x0) * (v - y0) / (y1 - y0 + 1e-12) + x0)
                inside ^= cr
                dx, dy = x1 - x0, y1 - y0
                t = np.clip(((u - x0) * dx + (v - y0) * dy) / (dx * dx + dy * dy), 0, 1)
                d = np.minimum(d, np.hypot((u + 0) - (x0 + t * dx), v - (y0 + t * dy)))
            sid = np.where(inside & (sid < 0), j, sid)
            e = np.where(inside, d * s.R, e)
        mar = sid < 0
        ph = np.degrees(np.arctan2(u, -v))                        # 0 at the front, + toward +x
        ph = np.where(ph < _RING[0], ph + 360, ph)
        R = np.array(_RING + [_RING[0] + 360])
        k = np.searchsorted(R, ph) - 1
        k = np.clip(k, 0, len(_RING) - 1)
        lo, hi = R[k], R[k + 1]
        rho = np.hypot(u, v)
        em = np.minimum(np.minimum(ph - lo, hi - ph) * math.pi / 180 * s.R, np.abs(rho - _RIN) * s.R)
        sid = np.where(mar, 20 + k, sid)
        e = np.where(mar, em, e)
        return sid, e, mar

    # -------------------------------------------------------------- the plastron and the bridges
    def plastron(s):
        clr = s.clr
        o = [(0.0, -0.8), (0.13, -0.86), (0.34, -0.76), (0.5, -0.52), (0.55, -0.36), (0.86, -0.22), (0.88, 0.16),
             (0.56, 0.3), (0.52, 0.55), (0.36, 0.74), (0.15, 0.82), (0.0, 0.72)]   # gular notch .. bridge .. anal notch
        if s.kind == 'flipper':   # a sea turtle's plastron is narrower, its bridge long
            o = [(u * 0.85, v) for u, v in o]
        ring = o + [(-u, v) for u, v in o[1:-1][::-1]]
        n = len(ring)
        V = []
        for z in (clr + 0.2, clr + 1.2):
            for u, v in ring:
                x, y = s.plan(u * 0.94, v * 0.96)
                V.append((x, y, z if z > clr + 1 else z + 0.25 * (abs(u) < 0.5)))
        Fc = [list(range(n))[::-1], list(range(n, 2 * n))]
        Fc += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
        s.B.add('body', _mesh('plastron', V, Fc, 'plastron', hi=1))
        for sx in (1, -1):   # the bridges: the plastron's sides rising to the carapace between the limbs
            u0, u1 = sx * 0.8, sx * 0.97
            pts = []
            for v in (-0.2, 0.15):
                for u, z in ((u0, clr + 1.0), (u1, s.ZB - 0.3)):
                    x, y = s.plan(u, v)
                    pts.append((x, y, z))
            Vb = pts + [(x - sx * 0.5, y, z) for x, y, z in pts]
            Fb = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]
            s.B.add('body', _mesh('bridge', Vb, Fb, 'plastron', hi=1))

    # -------------------------------------------------------------- the skull, the jaw, the neck
    def head_neck(s, neck, hk, hz):
        L, clr = s.L, s.clr
        hk = hk * 0.82   # (a real turtle's head: about a fifth of its shell)
        s.hk = hk
        s.NECK = (0.0, -L * 0.3, clr + 3.0)
        s.HC = HC = (0.0, -L * (0.5 + 0.1 * neck), clr + 3.6 + 1.6 * neck * hz)
        mid = (0, (s.NECK[1] + HC[1]) / 2 - 0.3, (s.NECK[2] + HC[2]) / 2 + 0.45)
        nk = tk.loft('neck', [dict(c=s.NECK, w=4.6 * hk, ht=2.2 * hk, hb=2.5 * hk), dict(c=mid, w=4.0 * hk, ht=1.9 * hk, hb=2.3 * hk),
                              dict(c=(0, HC[1] + 2.0 * hk, HC[2] - 0.5 * hk), w=3.9 * hk, ht=1.8 * hk, hb=2.0 * hk)],
                     n=10, up=(0, 0, 1), cap0='round', cap1='round')

        def folds(h):  # the loose neck skin: rings of folds, the throat hanging a little
            tk.push(h, lambda V, N: 0.14 * np.sin(V[:, 1] * 3.4 + 0.6 * np.sin(V[:, 0] * 2.0)) - 0.1 * (N[:, 2] < -0.5))
        s.B.add('head', lowk(nk, 'neck', 36, 'skin', sculpt=folds))
        # the skull: a flat-crowned wedge, widest at the eardrums, the snout blunt, the upper beak hooked down
        Y0, Z0 = HC[1], HC[2]
        S = [(2.3, -0.2, 4.3, 2.0, 1.9, 2.2), (1.0, 0.15, 5.6, 2.3, 1.5, 2.7), (-0.6, 0.35, 5.25, 2.2, 1.2, 2.7),
             (-2.1, 0.08, 4.1, 1.7, 1.05, 2.5), (-3.2, -0.35, 2.7, 1.15, 1.05, 2.2)]
        rings = [dict(c=(0, Y0 + y * hk, Z0 + z * hk), w=w * hk, ht=ht * hk, hb=hb * hk, e=e) for y, z, w, ht, hb, e in S]
        hd = tk.loft('skull', rings, n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.55 * hk)

        def skull(h):  # brow ridges over the eyes, the eardrum's shallow disc, the nostrils at the snout's tip
            def f(V, N):
                x, y, z = V[:, 0] / hk, (V[:, 1] - Y0) / hk, (V[:, 2] - Z0) / hk
                brow = np.exp(-((np.abs(x) - 1.75) ** 2 / 0.3 + (y + 1.0) ** 2 / 0.45 + (z - 1.75) ** 2 / 0.35))
                ear = np.exp(-((np.abs(x) - 2.7) ** 2 / 0.08 + (y - 0.9) ** 2 / 0.35 + (z - 0.1) ** 2 / 0.35))
                nos = np.exp(-((np.abs(x) - 0.42) ** 2 / 0.03 + (y + 3.6) ** 2 / 0.05 + (z - 0.25) ** 2 / 0.05))
                return 0.3 * brow - 0.16 * ear - 0.14 * nos
            tk.push(h, f)
        s.B.add('head', lowk(hd, 'skull', 110, ('skin', [('beak', lambda C, N: (C[:, 1] < Y0 - 2.5 * hk) & (C[:, 2] < Z0 + 0.1 * hk)),
                                                         ('face', lambda C, N: (N[:, 1] < -0.3) & (C[:, 1] < Y0 - 0.4 * hk))]), sculpt=skull))
        # the lower jaw: its own piece under the skull (the mouth's seam between them), its horny sheath in front
        J = [(1.3, -1.45, 4.5, 0.55, 0.85), (-0.8, -1.4, 4.4, 0.55, 0.9), (-2.4, -1.22, 3.0, 0.5, 0.72), (-3.05, -1.05, 1.7, 0.38, 0.48)]
        jr = [dict(c=(0, Y0 + y * hk, Z0 + z * hk), w=w * hk, ht=ht * hk, hb=hb * hk) for y, z, w, ht, hb in J]
        jw = tk.loft('jaw', jr, n=10, up=(0, 0, 1), cap0='round', cap1='round', capd=0.35 * hk)
        s.B.add('head', lowk(jw, 'jaw', 40, ('jaw', [('beak', lambda C, N: C[:, 1] < Y0 - 1.9 * hk)])))

    def turn_head(s, yaw=0.0, pitch=0.0):
        """Turn the head (and neck) about the neck's base: yaw (degrees, + toward +x), then pitch (+ nose up)."""
        for a, b in s.B.p['head']:
            for o in (a, b):
                tk.rotate(o, yaw, 'Z', pivot=s.NECK)
                tk.rotate(o, pitch, 'X', pivot=s.NECK)
        s.turned = (yaw, pitch)

    def head_local(s, X, Y, Z):
        """Figure-space points on the head back in the head's own (unturned) frame."""
        P = np.stack([X, Y, Z], -1) - np.asarray(s.NECK)
        if s.turned:
            yaw, pitch = np.radians(s.turned[0]), np.radians(s.turned[1])
            c, sn = math.cos(-pitch), math.sin(-pitch)
            P = np.stack([P[..., 0], P[..., 1] * c - P[..., 2] * sn, P[..., 1] * sn + P[..., 2] * c], -1)
            c, sn = math.cos(-yaw), math.sin(-yaw)
            P = np.stack([P[..., 0] * c - P[..., 1] * sn, P[..., 0] * sn + P[..., 1] * c, P[..., 2]], -1)
        P = P + np.asarray(s.NECK)
        return P[..., 0], P[..., 1], P[..., 2]

    def to_fig(s, p):
        """A point of the unturned head into figure space."""
        p = np.asarray(p, float) - np.asarray(s.NECK)
        if s.turned:
            yaw, pitch = np.radians(s.turned[0]), np.radians(s.turned[1])
            c, sn = math.cos(yaw), math.sin(yaw)
            p = np.array([p[0] * c - p[1] * sn, p[0] * sn + p[1] * c, p[2]])
            c, sn = math.cos(pitch), math.sin(pitch)
            p = np.array([p[0], p[1] * c - p[2] * sn, p[1] * sn + p[2] * c])
        return p + np.asarray(s.NECK)

    # -------------------------------------------------------------- limbs, feet, claws, tail
    def claws(s, foot, fwd, n, r, ln, z=0.45):
        """n claws round the front of a foot (centre foot, facing fwd (x, y)), each a three-sided horn point."""
        f = np.array([fwd[0], fwd[1], 0.0])
        f /= np.linalg.norm(f)
        side = np.array([-f[1], f[0], 0.0])
        for j in range(n):
            k = (j - (n - 1) / 2) / max((n - 1) / 2, 1)
            d = f * math.cos(k * 0.75) + side * math.sin(k * 0.75)
            c0 = np.array(foot) + d * r * 0.92 + np.array((0, 0, z))
            w = 0.34 * (1 - 0.15 * k * k)
            b = np.cross(d, (0, 0, 1))
            V = [c0 + b * w, c0 - b * w, c0 + np.array((0, 0, 0.42)) - d * 0.1, c0 + d * ln * (1 - 0.18 * k * k) - np.array((0, 0, z - 0.08))]
            s.B.add('legs', _mesh('claw', V, [[0, 1, 2], [0, 3, 1], [1, 3, 2], [2, 3, 0]], 'claw', hi=1))

    def limbs(s, kind, spurs):
        L, W, clr, B = s.L, s.W, s.clr, s.B
        for sx in (1, -1):
            for front in (True, False):
                fy = -L * 0.27 if front else L * 0.27
                if kind == 'flipper':
                    s.flipper(sx, fy, front)
                    continue
                tort = kind == 'stump'
                sh = (sx * W * 0.35, fy + (-0.6 if front else 0.6), clr + 3.0)
                if front:   # a fore limb: out of the shell, bent at the elbow, the forearm down to the wrist
                    el = (sx * W * (0.48 if tort else 0.48), fy - 1.4, clr + 1.9)
                    wr = (sx * W * (0.47 if tort else 0.47), fy - 1.9, 1.1)
                    r = (2.4, 2.2, 2.0) if tort else (2.0, 1.7, 1.45)
                    up = (0, -1, 0)
                    sq = 0.72 if tort else 0.85   # (a tortoise's fore limb is flattened, its broad front armoured)
                else:       # a hind limb: thigh, knee, a column of a shank (a tortoise's elephant leg)
                    el = (sx * W * (0.45 if tort else 0.45), fy + 0.8, clr + 1.6)
                    wr = (sx * W * (0.44 if tort else 0.44), fy + 1.0, 1.0)
                    r = (2.6, 2.5, 2.4) if tort else (2.1, 1.8, 1.5)
                    up = (0, -1, 0)
                    sq = 1.0 if tort else 0.9
                rings = [dict(c=p, w=2 * rr, h=rr * sq) for p, rr in zip((sh, el, wr), r)]
                lg = tk.loft('leg', rings, n=8, up=up, cap0='round', cap1='round')
                sc = None
                if tort and front:   # the fore limb's big overlapping scales, rows down its front
                    sc = (lambda h: tk.push(h, lambda V, N: 0.3 * (np.abs(np.mod(V[:, 2] * 1.25 + np.abs(V[:, 0]) * 0.4, 1.0) - 0.5) < 0.2) * (N[:, 1] < -0.2)))
                B.add('legs', lowk(lg, 'leg', 34, 'skin', sculpt=sc))
                foot = (wr[0] + sx * (0.3 if front else 0.2), wr[1] - (0.6 if front else 0.2), 0.0)
                fwd = (sx * (0.45 if front else 0.55), -1.0)
                if tort:   # a round pad of a foot, flat under, its toes fused (an elephant's)
                    rp = r[2] * 1.12
                    pad = tk.lathe('pad', [(0, 0), (rp, 0), (rp * 1.05, 0.7), (rp * 0.85, 1.5), (0, 1.8)], n=10, centre=foot)
                    a, b = lowk(pad, 'pad', 20, 'skin')
                    tk.flat_bottom(a, 0.25)
                    tk.flat_bottom(b, 0.25)
                    B.add('legs', (a, b))
                    s.claws(foot, fwd, 5 if front else 4, rp, 0.85)
                else:      # a terrapin's webbed foot: a flat paddle, the toes' ridges, long claws
                    f = np.array(fwd) / np.linalg.norm(fwd)
                    c1 = (foot[0] + f[0] * 1.4, foot[1] + f[1] * 1.4, 0.35)
                    pf = tk.loft('foot', [dict(c=(foot[0], foot[1], 0.8), w=2.6, h=0.8), dict(c=c1, w=3.6, h=0.42)],
                                 n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=0.5)
                    a, b = lowk(pf, 'foot', 24, 'skin', sculpt=lambda h: tk.push(h, lambda V, N: 0.12 * np.cos((V[:, 0] - foot[0]) * 4.2) * (N[:, 2] > 0.4)))
                    tk.flat_bottom(a, 0.2)
                    tk.flat_bottom(b, 0.2)
                    B.add('legs', (a, b))
                    s.claws(c1[:2] + (0,), fwd, 5 if front else 4, 1.6, 0.9, z=0.25)
                if spurs and not front:  # the spurred tortoise's namesake: two big conical spurs on each thigh
                    for j, dz in enumerate((0.0, 1.0)):
                        b0 = np.array((sx * (W * 0.42 + 0.2 * j), fy + 2.1, clr + 1.6 + dz))
                        tip = b0 + np.array((sx * 0.35, 1.25, -0.25))
                        bb = np.array((sx, 0.0, 0.0)) * 0.42
                        V = [b0 + bb, b0 - bb + (0, -0.2, 0), b0 + (0, -0.3, 0.45), b0 + (0, -0.3, -0.4), tip]
                        s.B.add('legs', _mesh('spur', V, [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [0, 3, 1, 2]], 'claw', hi=1))

    def flipper(s, sx, fy, front):
        W, clr = s.W, s.clr
        if front:   # a long wing of a flipper, bent at the wrist and swept back, thick along its leading edge
            pts = [(sx * W * 0.36, fy - 0.4, clr + 2.6), (sx * W * 0.55, fy - 1.6, clr + 1.7), (sx * W * 0.75, fy - 0.6, clr + 0.8),
                   (sx * W * 0.95, fy + 3.4, clr + 0.25)]
            rings = [dict(c=pts[0], w=3.4, h=1.1), dict(c=pts[1], w=4.0, h=0.8), dict(c=pts[2], w=4.6, h=0.6),
                     dict(c=pts[3], w=1.8, h=0.35)]
            f = tk.loft('flip', rings, n=8, up=(0, 0, 1), cap0='round', cap1='point')
            s.B.add('legs', lowk(f, 'flip', 44, 'skin', sculpt=lambda h: tk.push(h, lambda V, N: 0.1 * (N[:, 1] < -0.5))))
            c0 = (sx * W * 0.62, fy - 2.6, clr + 1.4)   # the claw on its leading edge
            V = [np.array(c0) + (0, 0.35, 0.2), np.array(c0) + (0, 0.35, -0.2), np.array(c0) + (sx * 0.3, 0.2, 0), np.array(c0) + (sx * 0.5, -0.6, -0.1)]
            s.B.add('legs', _mesh('claw', V, [[0, 1, 2], [0, 3, 1], [1, 3, 2], [2, 3, 0]], 'claw', hi=1))
        else:       # a rounded hind paddle
            pts = [(sx * W * 0.3, fy, clr + 2.3), (sx * W * 0.42, fy + 2.6, clr + 0.9), (sx * W * 0.46, fy + 4.8, clr + 0.3)]
            rings = [dict(c=pts[0], w=3.0, h=0.9), dict(c=pts[1], w=4.0, h=0.55), dict(c=pts[2], w=3.0, h=0.4)]
            f = tk.loft('flip', rings, n=8, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8)
            s.B.add('legs', lowk(f, 'flip', 26, 'skin'))

    def tail(s):
        L, clr = s.L, s.clr
        ln = 1.3 if s.sp in ('pond', 'slider') else 0.8
        tl = tk.tube('tail', [(0, L * 0.4, clr + 2.5), (0, L * (0.44 + 0.06 * ln), clr + 1.7), (0.4, L * (0.46 + 0.1 * ln), clr + 0.9)],
                     [1.4, 0.9, 0.2], n=6, cap1='point')
        s.B.add('legs', lowk(tl, 'tail', 16, 'skin'))

    def commit(s, F, extra_bones=(), kinds=None):
        s.B.commit(F, bones={'body': 'body', 'legs': 'legs', 'head': 'head', 'shell': 'shell', **dict(extra_bones)}, kinds=kinds)
        s.PI = {p.name: i for i, p in enumerate(F.parts)}

    def rig(s, F, extra=None):
        from rig import Rig
        R = Rig()
        R.bone('root', (0, 0, 0.5))
        R.bone('body', s.BC, parent='root')
        R.bone('legs', s.BC, parent='body')
        R.bone('head', s.NECK, parent='body')
        R.bone('shell', (0, 0, s.top), parent='body')
        if extra:
            extra(R)
        for p in F.parts:
            R.attach(p.low, p.bone)
        return R


def shell_keys(k, T, extra=(), lift=7.0, spin=24.0, rot_axis='Z', end=64):
    """The tabigame clip: 4-12 head and legs in, the turtle settles; 14-24 the landmark shell lifts off with a turn;
    24-30 hold; 30-36 it drops back; 38-48 out it all comes (the head last, with a pop); end rest."""
    allb = ['root', 'body', 'legs', 'head', 'shell'] + list(extra)
    for b in allb:
        k(b, 0)
    hk = T.hk
    k('head', 4)
    k('head', 12, move=(0, 5.0 * hk, -1.2), scale=0.62)
    k('head', 40, move=(0, 5.0 * hk, -1.2), scale=0.62)
    k('head', 48, ease='BACK')
    k('legs', 4)
    k('legs', 12, scale=(0.72, 0.5, 0.72), move=(0, 0, 0.8))
    k('legs', 38, scale=(0.72, 0.5, 0.72), move=(0, 0, 0.8))
    k('legs', 46, ease='BACK')
    k('body', 6)
    k('body', 13, move=(0, 0, -T.clr * 0.8))
    k('body', 38, move=(0, 0, -T.clr * 0.8))
    k('body', 46)
    k('shell', 14)
    k('shell', 22, move=(0, 0, lift), rot=(rot_axis, spin), ease='BACK')
    k('shell', 29, move=(0, 0, lift), rot=(rot_axis, spin * 0.8))
    k('shell', 36, ease=('QUAD', 'EASE_IN'))
    k('shell', 38, move=(0, 0, 0.5))
    k('shell', 40)
    for b in allb:
        k(b, end)
    return allb


SKIP = [('head', 'body'), ('legs', 'body'), ('shell', 'body'), ('shell', 'head'), ('shell', 'legs'), ('head', 'legs')]


# ------------------------------------------------------------------ paint: the real animal's surfaces, following the model
# per species: the carapace's pattern (areola, rays, how strong the growth rings are, the seam colour), the skin's
# markings and its limbs' scaling
SPECIES = {
    'pond': dict(areola=None, rays=None, rings=0.7, seam='#2a2016', skin='scale', mark='pond'),           # Japanese pond turtle
    'slider': dict(areola=None, rays='#a8a43a', rings=0.4, seam='#1e2a16', skin='scale', mark='slider'),  # red-eared slider
    'box': dict(areola=None, rays='#e0a030', rings=0.6, seam='#1e140c', skin='skin', mark='spots'),      # box turtle
    'sulcata': dict(areola='light', rays=None, rings=1.0, seam='#4a3420', skin='skin', mark=None),       # spurred tortoise
    'steppe': dict(areola='#3a2a16', rays=None, rings=0.7, seam='#3a2a16', skin='skin', mark=None),      # steppe tortoise
    'seaturtle': dict(areola=None, rays='#c08a3a', rings=0.3, seam='#e6dcb8', skin='flipper', mark='sea'),  # green sea turtle
}
NATURAL_SKIN = dict(kind='pebbles', photo='tortoise', mm=16.0, k=0.14, mot=0.06, vary=1.6, rim=0.6)


def paint_turtle(P, pt, sh, T, skin, shell, scute=None, plast='#d8c28a', claw='#e6dcc0', beak=None, vest=('#f2efe6', '#3a5aa0'),
                 dabs=True):
    """The turtle's paint, following its model: scaled limbs and wrinkled neck skin (photo-bashed from a real
    tortoise's / lizard's / sea turtle's skin), the crown's head plates, the species' markings, the horny beak and
    claws; the modelled scutes each their own tone with growth rings parallel to their seams, areolae, rays or
    blotches by species, dark seams; the plastron's paired scutes; the vest under the shell."""
    X, Y, Z = P.X, P.Y, P.Z
    sp = SPECIES.get(T.sp, SPECIES['pond'])
    hk, HC = T.hk, T.HC
    rng = np.random.default_rng(len(T.sp) * 97 + int(T.L * 10))
    PI = getattr(T, 'PI', {})
    part = lambda nm: P.part == PI.get(nm, -9)  # noqa: E731
    sk, jaw = P.region('skin'), P.region('jaw')
    legs = sk & part('legs')
    headm = (sk | P.region('face') | jaw) & part('head')
    HX, HY, HZ = T.head_local(X, Y, Z)
    neck = headm & (HY > HC[1] + 2.0 * hk)
    skull = headm & ~neck
    skr = pt.ramp(skin, 7, shift=0.07)
    # ---- limbs: a tortoise's big overlapping fore-limb scales and pebbled hind legs, a terrapin's small scales, a
    #      sea turtle's polygon plates with pale seams
    if T.kind == 'flipper':
        P.fill(legs, skr, tone=sh, base=0.05, brush='skin',
               tex=dict(kind='pebbles', photo='flipper', mm=18.0, k=0.2, mot=0.12, vary=1.2, size=1.3, spacing=1.2, rim=-1.0))
    elif sp['skin'] == 'skin':
        fore = legs & (Y < 0)
        P.fill(fore, skr, tone=sh, base=0.05, brush='scale',
               tex=dict(kind='scales', photo='tortoise', mm=16.0, k=0.16, mot=0.12, vary=1.2, size=1.7, stretch=1.15, spacing=1.05, rim=1.2))
        P.fill(legs & ~fore, skr, tone=sh, base=0.05, brush='skin', tex=dict(NATURAL_SKIN, size=1.0, spacing=1.0))
    else:
        P.fill(legs, skr, tone=sh, base=0.05, brush='scale', tex=dict(kind='scales', photo='scales', mm=16.0, k=0.14, mot=0.12, vary=1.2, size=0.95))
    P.fill(skull, skr, tone=sh, base=0.12, brush='skin', tex=dict(NATURAL_SKIN, size=0.5, spacing=0.6))
    P.fill(jaw & part('head'), skr, tone=sh, base=0.3, brush='skin', tex=dict(NATURAL_SKIN, size=0.4, spacing=0.5))
    P.fill(neck, skr, tone=sh, base=0.05, brush='skin', tex=dict(NATURAL_SKIN, size=0.45, spacing=0.55))
    P.shift(neck & (np.abs(np.mod(HY + 0.35 * np.sin(HX * 2.4), 1.05) - 0.52) < 0.07), -1)   # the neck's skin folds
    rest = sk & ~legs & ~headm
    P.fill(rest, skr, tone=sh, base=0.05, brush='skin', tex=dict(NATURAL_SKIN, size=0.6, spacing=0.7))
    # ---- the crown's big head plates: seams fine dark lines (pale on a sea turtle)
    crown = skull & (P.on[:, :, 2] > 0.25) & (HY > HC[1] - 3.0 * hk) & (HZ > HC[2] + 0.6 * hk)
    hc = [(sx * a * hk, HC[1] + b * hk, HC[2] + 2.4 * hk) for sx in (1, -1) for a, b in ((0.5, -2.3), (0.8, -1.0), (1.8, -1.3), (0.9, 0.5), (2.0, 0.7))]
    hc += [(0, HC[1] - 1.6 * hk, HC[2] + 2.4 * hk), (0, HC[1] - 0.15 * hk, HC[2] + 2.4 * hk)]
    pid, he, _ = P.plates(crown, [T.to_fig(c) for c in hc], flat=2 if not T.turned else None)
    P.shift(crown & (he < 0.06 * hk + 0.04), 1 if T.sp == 'seaturtle' else -1)
    # ---- the species' skin markings (in the head's own frame, so a turned head keeps them)
    if sp['mark'] == 'slider':  # yellow stripes down the head, neck and limbs; the red ear patch behind each eye
        zc = HC[2] + (HY - HC[1]) * (T.NECK[2] - HC[2]) / max(T.NECK[1] - HC[1], 1e-6)
        phi = np.arctan2(HZ - zc, HX)
        st = (np.abs(np.mod(phi / (2 * np.pi) * 13 + 0.15 * np.sin(HY * 0.8), 1) - 0.5) < 0.13) & (sk & part('head')) & (HY > HC[1] - 2.2 * hk)
        P.fill(st, pt.ramp('#d8c84a', 6, shift=0.06), tone=sh, base=0.15, brush={'preset': 'skin', 'flow': 'along', 'axis': (0, 1, 0)})
        P.fill(legs & (np.abs(np.mod(Z * 1.3 + X * 0.4, 1.6) - 0.8) < 0.17), pt.ramp('#d0c048', 6, shift=0.06), tone=sh, base=0.1, brush='skin')
        for sx in (1, -1):
            ear = skull & (((HX - sx * 2.6 * hk) / (0.6 * hk)) ** 2 + ((HY - HC[1] - 0.7 * hk) / (1.2 * hk)) ** 2 + ((HZ - HC[2] - 0.25 * hk) / (0.55 * hk)) ** 2 < 1)
            P.fill(ear, pt.ramp('#c83224', 6, shift=0.06), tone=sh, base=0.15, brush='skin')
    elif sp['mark'] == 'pond':  # a Japanese pond turtle's fine dark reticulation on the neck, a pale throat
        P.fill(neck & (HZ < HC[2] - 0.3 * hk) & (P.on[:, :, 2] < -0.3), pt.ramp('#c8b070', 6, shift=0.06), tone=sh, base=0.15, brush='skin')
    elif sp['mark'] == 'spots':  # a box turtle's orange spots on the head, the neck and the fore legs
        who, d = P.dabs(skull | neck | (legs & (Y < 0)), size=0.75, spacing=1.6, seed=11)
        P.fill((headm | legs) & (who >= 0) & (d < 0.85) & (rng.random(int(who.max()) + 2)[np.maximum(who, 0)] < 0.55),
               pt.ramp('#e0902a', 6, shift=0.06), tone=sh, base=0.2, brush='skin')
    elif sp['mark'] == 'sea':  # a green sea turtle's head: big polygon scales, each dark-centred with pale seams
        pid, he2, _ = P.plates(skull, [T.to_fig((sx * a * hk, HC[1] + b * hk, HC[2] + c * hk)) for sx in (1, -1)
                                       for a, b, c in ((2.4, 0.6, 0.4), (2.2, -0.6, -0.2), (2.6, 1.6, -0.6), (1.6, 1.5, 1.4), (2.6, -0.2, 1.2))])
        P.shift(skull & (he2 < 0.12) & ~crown, 1)
    P.fill('beak', pt.ramp(beak or skin, 6, shift=0.06), tone=sh, base=0.05, brush='shell')
    P.shift(P.region('beak') & (P.cav > 0.56), -1)                         # the beak's cutting edge
    if T.sp in ('pond', 'slider', 'box') and claw == '#e6dcc0':   # (a terrapin's claws are dark horn)
        claw = '#6a5a40'
    P.fill('claw', pt.ramp(claw, 5, shift=0.05), tone=sh, base=0.1, brush='shell')
    # ---- the plastron: paired scutes (gular, humeral, pectoral, abdominal, femoral, anal), seams and growth lines
    pr = P.region('plastron')
    P.fill(pr, pt.ramp(plast, 6, shift=0.05), tone=sh, base=0.1, brush='shell')
    pu, pv = T.unplan(X, Y)
    py = np.abs(np.stack([pv - f for f in (-0.6, -0.38, -0.1, 0.3, 0.56)])) * T.H
    pe = np.minimum(np.abs(X), py.min(0))
    if T.sp in ('slider', 'pond', 'box'):  # dark blotches on each plastral scute
        P.fill(pr & (pe > 1.4) & (P.photo('frog', pr, mm=9.0, kind='mot') > -0.1), pt.ramp('#3a2a1c', 5, shift=0.05), tone=sh, base=0.1, brush='shell')
    P.shift(pr & (np.abs(np.mod(pe, 0.55) - 0.27) < 0.06) & (pe > 0.3), -1)
    P.fill(pr & (pe < 0.16), pt.ramp(plast, 6, shift=0.05)[:2], tone=sh, base=-0.3, brush=False)
    # ---- the vest under the shell
    vr = P.region('vest')
    P.fill(vr, pt.ramp(vest[0], 5, shift=0.04), tone=sh, base=0.2, brush='cloth')
    P.fill(vr & (np.abs(np.mod(Y, 2.4) - 1.2) < 0.5), pt.ramp(vest[1], 5, shift=0.05), tone=sh, base=0.1, brush='cloth')
    # ---- the carapace, scute by scute as modelled (T.scute_at): each its own tone, growth rings parallel to its
    #      seams, the areola at its heart, rays or blotches by species, dark seams (pale on a sea turtle)
    sr = (P.region('shell') | P.region('marginal')) & part('shell')
    sid, e, mar = T.scute_at(X, Y, Z)
    sid = np.where(sr, sid, -1)
    nid = 48
    ip = np.maximum(sid, 0)
    jit = rng.normal(0, 0.13, nid)
    emax = np.full(nid, 0.3)
    np.maximum.at(emax, sid[sr], e[sr])
    rel = np.where(sr, e / emax[ip], 0)                                   # 0 at the seam .. 1 at the areola
    shr = pt.ramp(shell, 7, shift=0.08)
    P.fill(sr & ~mar, shr, tone=sh, base=0.1 + jit[ip] - 0.15 * (rel < 0.2), brush='shell')
    P.fill(sr & mar, shr, tone=sh, base=-0.02 + jit[ip] - 0.15 * (rel < 0.25), brush='shell')
    if scute:  # the lighter growth zone between the seams and the areola
        P.fill(sr & (rel > 0.22) & (rel < 0.62) & (np.abs(np.mod(e, 0.5) - 0.25) < 0.17), pt.ramp(scute, 6, shift=0.06), tone=sh, base=0.15 + jit[ip], brush='shell')
    ring = sr & (np.abs(np.mod(e, 0.5) - 0.25) < 0.05) & (rel > 0.08) & (rel < 0.8)
    if sp['rings'] >= 0.6:
        P.shift(ring, -1)
    if sp['areola'] == 'light':
        P.shift(sr & (rel > 0.7), 1)
    elif sp['areola']:  # a dark blotch at each scute's heart (steppe tortoise)
        bl = sr & (rel > 0.5 + 0.12 * P.photo('frog', sr, mm=6.0, kind='mot'))
        P.fill(bl, pt.ramp(sp['areola'], 6, shift=0.06), tone=sh, base=0.1, brush='shell')
    if sp['rays']:  # rays from each areola (a box turtle's yellow flashes, a slider's streaks, a sea turtle's flames)
        cnt = np.maximum(np.bincount(sid[sr], None, nid), 1)
        cx = np.bincount(sid[sr], X[sr], nid) / cnt
        cy = np.bincount(sid[sr], Y[sr], nid) / cnt
        ang = np.arctan2(Y - cy[ip], X - cx[ip])
        ph0 = rng.random(nid) * 6.283
        thr = {'slider': 0.95, 'box': 0.93, 'seaturtle': 0.93}.get(T.sp, 0.88)   # (a slider's are fine vermiculated lines, a box turtle's bold flashes)
        ray = sr & (np.abs(np.sin(ang * (3 + (ip % 3)) + ph0[ip] + 0.6 * np.sin(e * 2.2))) > thr) & (rel > 0.12) & (rel < 0.9)
        P.fill(ray, pt.ramp(sp['rays'], 6, shift=0.06), tone=sh, base=0.1 + jit[ip], brush={'preset': 'shell', 'flow': 'down'})
    P.fill(sr & (e < 0.16), pt.ramp(sp['seam'], 5, shift=0.05), tone=sh, base=0.05 if T.sp == 'seaturtle' else -0.1, brush=False)
    P.shift(sr & mar & (Z < T.ZB - 0.1), -1)                              # the rim's underside
    P.lines(['jaw'], ['skin', 'face', 'beak'], step=2)                     # the mouth's seam, along the jaw


# the face, per species: the lid's line, the brow, the mouth's set (the faces kit's ink and brush, lib/face.py)
MOOD = {
    'pond': dict(lid=((0.62, 0.3), (0.0, 0.6), (-0.62, 0.38)), brow=None, mouth=(0.25, 0.02, -0.1), w=1.35),          # calm
    'slider': dict(lid=((0.6, 0.32), (0.0, 0.62), (-0.6, 0.4)), brow=((0.5, 1.05), (-0.45, 0.8)), mouth=(0.05, 0.06, -0.12), w=1.25),  # worried
    'box': dict(lid=((0.6, 0.32), (0.0, 0.6), (-0.6, 0.32)), brow=None, lower=True, mouth=(0.12, 0.02, -0.08), w=0.95),  # prim
    'sulcata': dict(lid=((0.7, 0.28), (0.0, 0.48), (-0.7, 0.62)), brow=((0.7, 0.55), (-0.6, 0.85)), mouth=(-0.18, 0.04, -0.1), w=1.4),  # grumpy elder
    'steppe': dict(lid=((0.6, 0.38), (0.0, 0.62), (-0.6, 0.3)), brow=None, cheek=True, mouth=(0.42, 0.0, -0.08), w=1.3),   # cheeky
    'seaturtle': dict(lid=((0.65, 0.36), (0.0, 0.52), (-0.65, 0.42)), brow=None, lashes=True, mouth=(0.2, 0.03, -0.1), w=1.4),  # wise, half-lidded
}


def turtle_face(P, T, seed, eyes=None, mouth=None, blush=None, ink=None, yaw=0.0):
    """The turtle's face, hand-inked on the modelled head: an eye on each side of the skull under its brow, looking
    forward (the species' iris, a solid pupil, no catchlight), the lid's brush line and brow setting the mood, the
    nostrils at the snout's tip, the mouth along the beak's edge with its little hook. The variant faces (face.EXPR)
    shut the eyes in one stroke."""
    hk, HC = T.hk, T.HC
    mood = MOOD.get(T.sp, MOOD['pond'])
    where = (P.region('face') | P.region('skin') | P.region('beak') | P.region('jaw')) & (P.part == getattr(T, 'PI', {}).get('head', -9))
    kw = dict(ink=ink) if ink else {}
    w, h = 1.3 * hk, 1.15 * hk
    fcs = []
    for sx in (1, -1):
        e = np.array((sx * 2.15 * hk, HC[1] - 1.3 * hk, HC[2] + 0.8 * hk))
        ax = np.array((sx * 0.74, -0.62, 0.26))
        c = T.to_fig(e)
        a = T.to_fig(e + ax) - c
        fe = face.Face(P, c=tuple(c), axis=tuple(a / np.linalg.norm(a)), where=where, seed=seed + (sx > 0), **kw)
        fr = -sx   # (the eye's frame: +u runs toward the tail on the right eye, toward the snout on the left)
        if face.EXPR in ('happy', 'sleepy') or (face.EXPR == 'wink' and sx > 0):
            fe.shut(0, 0, w / 2, h / 2, 'sleepy' if face.EXPR == 'sleepy' else 'happy')
        else:
            fe.eye(0, 0, w, h, shape='round', sx=sx)
            fe.stroke([(fr * x * w, y * h) for x, y in mood['lid']], max(0.14, 0.2 * w), taper=(0.7, 0.9), wobble=0.01)
            if mood.get('lower'):
                fe.stroke([(fr * 0.45 * w, -0.62 * h), (0, -0.7 * h), (-fr * 0.45 * w, -0.6 * h)], max(0.08, 0.08 * w), taper=(0.6, 0.6))
            if mood.get('lashes'):
                for i in range(2):
                    fe.stroke([(-fr * (0.55 + 0.1 * i) * w, (0.2 + 0.2 * i) * h), (-fr * (0.8 + 0.12 * i) * w, (0.38 + 0.25 * i) * h)], max(0.08, 0.1 * w), taper=(1, 0.2))
        if mood.get('brow'):
            fe.stroke([(fr * x * w, y * h) for x, y in mood['brow']], max(0.12, 0.17 * w), taper=(0.9, 0.5), wobble=0.02)
        if mood.get('cheek') or blush:
            fe.dab(-fr * 0.15 * w, -0.95 * h, 0.42 * hk, blush or '#e08a70')
        fcs.append(fe)
    # the snout: nostrils and the mouth along the upper beak's edge, a small hook at its middle
    c = T.to_fig((0, HC[1] - 3.35 * hk, HC[2] - 1.2 * hk))
    a = T.to_fig((0, HC[1] - 4.35 * hk, HC[2] - 1.08 * hk)) - c
    fm = face.Face(P, c=tuple(c), axis=tuple(a / np.linalg.norm(a)), where=where, seed=seed + 7, **kw)
    end, mid, hook = mood['mouth']
    mw = mood['w'] * hk
    fm.stroke([(-mw, end * hk), (-0.5 * mw, mid * hk), (0, hook * hk), (0.5 * mw, mid * hk), (mw, end * hk)], max(0.12, 0.13 * hk), taper=(0.5, 0.5), wobble=0.015)
    fm._used = True
    for sx in (1, -1):
        fm.dot(sx * 0.4 * hk, 1.45 * hk, 0.15 * hk, 0.1 * hk)
    return fcs[0]


def go(F, make_rig, paint, frames=64, skip=(), fold=(0, 12, 24, 46)):
    cams = [((60, -76, 54), (0, -2, 16)), ((-58, 70, 48), (0, 2, 16))]
    if os.environ.get('GG_TCAM'):  # (modelling review: close on the turtle, 3/4 front and low side)
        cams = [((34, -44, 30), (0, -3, 6)), ((-46, -14, 14), (0, -3, 5)), ((2, -8, 72), (0, 0, 5))]
    run(F, make_rig, paint, frames=frames, skip=list(SKIP) + list(skip), fold=fold, cams=cams)
