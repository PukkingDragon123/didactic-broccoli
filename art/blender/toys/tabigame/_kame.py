"""Shared builder for series tabigame (World Tour Turtles): a turtle on its own four feet (or flippers) whose carapace
carries a world landmark (generic architecture: no signage, no logos). Each figure builds its own landmark and picks
its species' proportions, so every entry is its own sculpt. Faceted low-poly (FACET.md).

The common gimmick (shell_keys): head and legs pull in, the turtle settles on its plastron, the landmark shell lifts
off its back with a little turn (the turtle wears a striped vest under it), drops back, and out it all comes again.

    HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
    from _kame import *
"""
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
    'pondturtle': dict(eye='round', iris='#7a5a20', lid=True, tilt=-6, mouth='beakline', eyek=1.0),                 # calm
    'slider': dict(eye='round', iris='#5a7a30', brows=('worried', 1.1), mouth='beakline', extras=('sweat',), eyek=1.0),  # nervous
    'boxturtle': dict(eye='round', iris='#d8602a', eyek=1.1, tilt=4, mouth='beakline'),                   # red-eyed, prim
    'sulcata': dict(eye='round', iris='#4a3018', lid=True, tilt=-10, brows=('flat', 1.2), mouth='beakline', eyek=0.95),  # grumpy elder
    'steppe': dict(eye='round', iris='#3a2a18', eyek=1.05, tilt=8, mouth='beakline', extras=('blush',)),  # cheeky
    'seaturtle': dict(eye='round', iris='#2a3a30', lid=True, lashes=2, tilt=-4, mouth='beakline', eyek=1.0),      # wise
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


class Turtle:
    """The turtle: body (plastron + skin + the vest under the shell), four legs (or flippers) and a tail ('legs'),
    the neck and head ('head'), the carapace ('shell', the landmark is added to it). Faces -Y.

    L, W: carapace length / width; clr: plastron height over the shelf; dome: carapace height; neck: how far the head
    reaches; legs: 'stump' (tortoise), 'webbed' (terrapin), 'flipper' (sea turtle); spurs: tortoise leg scales."""

    def __init__(s, B, L=26.0, W=21.0, clr=3.2, dome=8.0, neck=1.0, head=1.0, legs='stump', spurs=False, rim=1.0,
                 flat_top=0.45, hz=1.0, sp='pond'):
        s.B, s.L, s.W, s.clr, s.dome, s.rim, s.sp, s.kind = B, L, W, clr, dome, rim, sp, legs
        R = W / 2
        s.ZB = ZB = clr + 1.6                     # the carapace's rim height
        s.BC = (0.0, 0.0, clr + 2.6)              # the body's centre (bones)
        # ---- the body: plastron below, soft skin round it, a vest on its back (under the shell)
        body = tk.loft('body', [dict(c=(0, L * 0.44, clr + 2.4), w=W * 0.46, h=1.8), dict(c=(0, L * 0.2, clr + 2.8), w=W * 0.8, h=2.8),
                                dict(c=(0, -L * 0.16, clr + 2.8), w=W * 0.82, h=2.8), dict(c=(0, -L * 0.4, clr + 2.6), w=W * 0.52, h=2.1)],
                       n=12, up=(0, 0, 1), cap0='round', cap1='round')
        B.add('body', lowk(body, 'body', 90, ('skin', [('plastron', lambda C, N: N[:, 2] < -0.5), ('vest', lambda C, N: N[:, 2] > 0.55)])))
        # ---- the carapace: a dome with a flattened crown (the landmark's footing), scutes and a marginal rim
        prof = [(0, -0.6), (R * 0.97, -0.6), (R * 1.03, 0.4 * rim), (R * 1.0, 1.4 * rim), (R * 0.9, dome * 0.42),
                (R * 0.74, dome * 0.7), (R * flat_top, dome * 0.94), (0, dome)]
        cara = tk.lathe('cara', prof, n=16, centre=(0, 0, ZB))
        tk.scale(cara, (1.0, L / W, 1.0), pivot=(0, 0, ZB))
        s.top = ZB + dome * 0.94                   # where the landmark stands

        def sc(h):
            def f(V, N):  # the real scute layout (scute_map): seams sunk as grooves, growth steps, a pond turtle's keel
                sid, e, mar = scute_map(s, V[:, 0], V[:, 1], V[:, 2])
                z = V[:, 2] - ZB
                out = -0.34 * np.clip(1 - e / 0.3, 0, 1)
                if sp in ('sulcata', 'steppe', 'box', 'pond'):
                    out -= 0.07 * (np.abs(np.mod(e, 0.5) - 0.25) < 0.07) * (e > 0.3)
                if sp == 'sulcata':  # pyramided scutes: each areola raised
                    out += 0.45 * np.clip((e - 0.6) / 2.4, 0, 1) * ~mar
                if sp in ('pond', 'box'):  # the keel down the vertebrals
                    out += 0.4 * np.clip(1 - np.abs(V[:, 0]) / (R * 0.1), 0, 1) * (z > dome * 0.4)
                return out * (z > -0.4)
            tk.push(h, f)
        B.add('shell', lowk(cara, 'cara', 160, ('shell', [('marginal', lambda C, N: C[:, 2] < ZB + 1.5 * rim)]), hi=3, sculpt=sc))
        # ---- the head on its neck
        hk = head
        s.NECK = (0.0, -L * 0.3, clr + 3.0)
        s.HC = HC = (0.0, -L * (0.5 + 0.1 * neck), clr + 3.6 + 1.6 * neck * hz)
        nk = tk.tube('neck', [s.NECK, (0, (s.NECK[1] + HC[1]) / 2 - 0.4, (s.NECK[2] + HC[2]) / 2 + 0.3), (0, HC[1] + 2.0 * hk, HC[2] - 0.4)],
                     [2.4 * hk, 2.2 * hk, 2.1 * hk], n=8)
        B.add('head', lowk(nk, 'neck', 30, 'skin', sculpt=lambda h: tk.push(h, lambda V, N: 0.12 * np.sin(V[:, 1] * 4.0))))
        hd = tk.loft('head', [dict(c=(0, HC[1] + 2.4 * hk, HC[2] - 0.2), w=4.5 * hk, h=2.1 * hk),
                              dict(c=(0, HC[1] + 0.7 * hk, HC[2] + 0.2 * hk), w=5.9 * hk, ht=2.5 * hk, hb=2.6 * hk),   # jaw angle
                              dict(c=(0, HC[1] - 1.0 * hk, HC[2] + 0.25 * hk), w=5.5 * hk, ht=2.55 * hk, hb=2.2 * hk),  # brows
                              dict(c=(0, HC[1] - 2.5 * hk, HC[2] - 0.1 * hk), w=4.3 * hk, ht=1.9 * hk, hb=1.9 * hk),   # snout
                              dict(c=(0, HC[1] - 3.45 * hk, HC[2] - 0.55 * hk), w=2.9 * hk, ht=1.2 * hk, hb=1.5 * hk)],  # beak
                      n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.7 * hk)

        def hsc(h):  # brow ridges over the eyes, the jaw line and a flat crown (baked into the shading)
            def f(V, N):
                x, y, z = V[:, 0] / hk, (V[:, 1] - HC[1]) / hk, (V[:, 2] - HC[2]) / hk
                brow = np.exp(-((np.abs(x) - 1.6) ** 2 / 0.35 + (y + 1.4) ** 2 / 0.5 + (z - 1.6) ** 2 / 0.4))
                jaw = np.exp(-((z + 0.55 - 0.18 * (y + 3.0)) ** 2) / 0.02) * (y < 1.2) * (np.abs(N[:, 2]) < 0.8)
                return 0.32 * brow - 0.16 * jaw
            tk.push(h, f)
        B.add('head', lowk(hd, 'head', 100, ('skin', [('beak', lambda C, N: (C[:, 1] < HC[1] - 2.6 * hk) & (C[:, 2] < HC[2] - 0.2 * hk)),
                                                       ('face', lambda C, N: (N[:, 1] < -0.35) & (C[:, 1] < HC[1] - 0.5 * hk))]), sculpt=hsc))
        s.hk = hk
        # ---- legs
        s.legs(legs, spurs)
        tl = tk.tube('tail', [(0, L * 0.42, clr + 2.6), (0, L * 0.52, clr + 1.8), (0.4, L * 0.58, clr + 1.0)], [1.3, 0.9, 0.2], n=6, cap1='point')
        B.add('legs', lowk(tl, 'tail', 14, 'skin'))

    def legs(s, kind, spurs):
        L, W, clr, B = s.L, s.W, s.clr, s.B
        for sx in (1, -1):
            for fy, front in ((-L * 0.27, True), (L * 0.27, False)):
                top = (sx * W * 0.34, fy, clr + 2.8)
                if kind == 'flipper':
                    if front:   # a long paddle flipper swept back
                        pts = [(sx * W * 0.38, fy, clr + 2.6), (sx * W * 0.62, fy - 1.0, clr + 1.4), (sx * W * 0.86, fy + 3.6, clr + 0.3)]
                        f = tk.loft('flip', [dict(c=pts[0], w=3.6, h=1.0), dict(c=pts[1], w=4.4, h=0.7), dict(c=pts[2], w=2.4, h=0.45)],
                                    n=8, up=(0, 0, 1), cap0='round', cap1='point')
                        s.B.add('legs', lowk(f, 'flip', 40, 'skin'))
                        c0 = (sx * W * 0.6, fy - 2.2, clr + 1.55)  # the claw on the flipper's leading edge
                        cl = tk.tube('claw', [c0, (c0[0] + sx * 0.5, c0[1] - 0.7, c0[2] - 0.2)], [0.32, 0.1], n=5, cap1='point')
                        s.B.add('legs', lowk(cl, 'claw', 8, 'claw', lo=0, hi=1))
                    else:
                        pts = [(sx * W * 0.3, fy, clr + 2.4), (sx * W * 0.44, fy + 3.0, clr + 0.9), (sx * W * 0.48, fy + 5.2, clr + 0.3)]
                        f = tk.loft('flip', [dict(c=pts[0], w=3.0, h=0.9), dict(c=pts[1], w=3.6, h=0.6), dict(c=pts[2], w=2.0, h=0.4)],
                                    n=8, up=(0, 0, 1), cap0='round', cap1='point')
                        s.B.add('legs', lowk(f, 'flip', 26, 'skin'))
                    continue
                r = 2.3 if kind == 'stump' else 1.8
                foot = (sx * W * 0.43, fy + (-1.0 if front else 0.8), 1.2)
                lg = tk.tube('leg', [top, ((top[0] + foot[0]) / 2 + sx * 0.6, (top[1] + foot[1]) / 2, (top[2] + foot[2]) / 2 + 0.4), foot],
                             [r, r * 0.95, r * 0.9], n=8)
                sc = None
                if spurs and front:   # the tortoise's big overlapping fore-leg scales
                    sc = (lambda h: tk.push(h, lambda V, N: 0.35 * (np.abs(np.mod(V[:, 2] * 1.6 + V[:, 1] * 0.8, 1.0) - 0.5) < 0.18)))
                B.add('legs', lowk(lg, 'leg', 30, 'skin', sculpt=sc))
                pad = tk.lathe('pad', [(0, 0), (r * 1.15, 0), (r * 1.2, 0.8), (r * 0.9, 1.7), (0, 2.0)], n=10, centre=(foot[0], foot[1], 0.0))
                tk.scale(pad, (1.0, 1.25 if kind == 'webbed' else 1.05, 1.0), pivot=(foot[0], foot[1], 0.0))
                a, b = lowk(pad, 'pad', 20, 'skin')
                tk.flat_bottom(a, 0.25)
                tk.flat_bottom(b, 0.25)
                B.add('legs', (a, b))
                d = -1 if front else 1
                n = 5 if front else 4                      # (a turtle's fore foot has five claws, a hind one four)
                ln = 1.25 if kind == 'webbed' else 0.95    # (a terrapin's are long, for digging into a bank)
                for j in range(n):
                    k = (j - (n - 1) / 2) / ((n - 1) / 2)  # -1 .. 1 across the toes
                    c0 = (foot[0] + k * r * 0.72, foot[1] + d * r * (0.98 - 0.16 * k * k), 0.5)
                    cl = tk.tube('claw', [c0, (c0[0] + k * 0.3, c0[1] + d * ln * (1 - 0.15 * k * k), 0.2)], [0.36, 0.13], n=5, cap1='point')
                    B.add('legs', lowk(cl, 'claw', 8, 'claw', lo=0, hi=1))
                if spurs and not front:  # the spurred tortoise's namesake: two big conical spurs on each thigh
                    for j, dz in enumerate((0.0, 1.1)):
                        b0 = (sx * (W * 0.4 + 0.3 * j), fy + r * 0.7, clr + 1.9 + dz)
                        sp_ = tk.tube('spur', [b0, (b0[0] + sx * 0.4, b0[1] + 1.3, b0[2] - 0.2)], [0.55, 0.12], n=6, cap1='point')
                        B.add('legs', lowk(sp_, 'spur', 10, 'claw', lo=0, hi=1))

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


def scute_map(T, X, Y, Z):
    """A real carapace's scute layout (plan view, scaled to the shell): five vertebrals down the middle, four costals
    a side whose seams meet the vertebrals' side corners, and round the rim (below ZB + 1.5 rim) 24 marginals with
    the nuchal at the front. Per point: the scute (0-4 vertebral, 5-12 costal, 20+ marginal), the distance (mm) to its
    seam, and whether it is a marginal."""
    R, H = T.W / 2, T.L / 2
    u, v = np.asarray(X) / R, np.asarray(Y) / H
    C = np.array([(0, y) for y in (-0.62, -0.31, 0.0, 0.31, 0.62)] +
                 [(sx * 0.56, y) for sx in (1, -1) for y in (-0.47, -0.155, 0.155, 0.47)])
    D2 = (u[..., None] - C[:, 0]) ** 2 + (v[..., None] - C[:, 1]) ** 2
    o = np.argsort(D2, axis=-1)
    i1, i2 = o[..., 0], o[..., 1]
    d1 = np.take_along_axis(D2, i1[..., None], -1)[..., 0]
    d2 = np.take_along_axis(D2, i2[..., None], -1)[..., 0]
    e = (d2 - d1) / np.maximum(2 * np.linalg.norm(C[i2] - C[i1], axis=-1), 1e-6) * R
    zm = T.ZB + 1.5 * T.rim
    z = np.asarray(Z)
    mar = z < zm
    e = np.where(mar, e, np.minimum(e, (z - zm) * 1.6))
    ph = np.mod(np.arctan2(v, u) + np.pi / 2, 2 * np.pi)
    seg = np.rint(ph / (2 * np.pi / 24))
    em = np.minimum(np.abs(ph - seg * 2 * np.pi / 24) * R, (zm - z) * 1.6)
    sid = np.where(mar, 20 + np.mod(seg, 24).astype(int), i1)
    return sid, np.where(mar, em, e), mar


# per species: the carapace pattern (areola, rays, ring colour), the skin's markings, how the legs are scaled
SPECIES = {
    'pond': dict(areola=None, rays=None, rings=0.7, seam='#2a2016', skin='scale', mark=None),             # Japanese pond turtle
    'slider': dict(areola=None, rays='#d8c040', rings=0.4, seam='#1e2a16', skin='scale', mark='slider'),  # red-eared slider
    'box': dict(areola=None, rays='#e0a030', rings=0.6, seam='#1e140c', skin='skin', mark='spots'),      # box turtle
    'sulcata': dict(areola='light', rays=None, rings=1.0, seam='#4a3420', skin='skin', mark=None),       # spurred tortoise
    'steppe': dict(areola='#3a2a16', rays=None, rings=0.7, seam='#3a2a16', skin='skin', mark=None),      # steppe tortoise
    'seaturtle': dict(areola=None, rays='#c08a3a', rings=0.3, seam='#e6dcb8', skin='flipper', mark=None),  # green sea turtle
}


def paint_turtle(P, pt, sh, T, skin, shell, scute=None, plast='#d8c28a', claw='#e6dcc0', beak=None, vest=('#f2efe6', '#3a5aa0'),
                 dabs=True):
    """The turtle's own paint, from the real animal: scaled and wrinkled skin (photo-bashed from a real tortoise's /
    lizard's / sea turtle's skin), the carapace's real scutes (seams, growth rings, areolae, rays: scute_map), the
    plastron's paired scutes, keratin claws and beak, the species' markings; then the vest."""
    X, Y, Z = P.X, P.Y, P.Z
    sp = SPECIES.get(T.sp, SPECIES['pond'])
    hk, HC = T.hk, T.HC
    rng = np.random.default_rng(len(T.sp) * 97 + int(T.L * 10))
    PI = getattr(T, 'PI', {})
    part = lambda nm: P.part == PI.get(nm, -9)  # noqa: E731
    sk = P.region('skin')
    legs, head = sk & part('legs'), (sk | P.region('face')) & part('head')
    neck = head & (Y > HC[1] + 2.0 * hk)
    skr = pt.ramp(skin, 7, shift=0.07)
    # ---- skin: limbs scaled (big overlapping scales on a tortoise's fore legs, pebbles behind, polygon plates on a
    #      flipper), the neck wrinkled, the head small-scaled; all photo-bashed and brushed over
    kind = sp['skin'] if dabs else 'scale'
    if T.kind == 'flipper':
        P.fill(legs, skr, tone=sh, base=0.05, brush='skin',
               tex=dict(kind='pebbles', photo='flipper', mm=18.0, k=0.2, mot=0.16, vary=1.2, size=1.25, spacing=1.15, rim=-1.0))
    elif kind == 'skin':
        fore = legs & (Y < 0)
        P.fill(fore, skr, tone=sh, base=0.05, brush='scale',
               tex=dict(kind='scales', photo='tortoise', mm=16.0, k=0.16, mot=0.14, vary=1.2, size=1.6, stretch=1.2, spacing=1.0, rim=1.2))
        P.fill(legs & ~fore, skr, tone=sh, base=0.05, brush='skin', tex=dict(NATURAL_SKIN, size=0.95, spacing=0.95))
    else:
        P.fill(legs, skr, tone=sh, base=0.05, brush='scale', tex=dict(kind='scales', photo='scales', mm=16.0, k=0.14, mot=0.14, vary=1.2, size=0.9))
    P.fill(head & ~neck, skr, tone=sh, base=0.1, brush='skin', tex=dict(NATURAL_SKIN, size=0.5, spacing=0.6))
    P.fill(neck, skr, tone=sh, base=0.05, brush='skin', tex=dict(NATURAL_SKIN, size=0.45, spacing=0.55))
    P.shift(neck & (np.abs(np.mod(Y + 0.35 * np.sin(X * 2.4), 1.05) - 0.52) < 0.07), -1)   # the neck's skin folds
    rest = sk & ~legs & ~head
    P.fill(rest, skr, tone=sh, base=0.05, brush='skin', tex=dict(NATURAL_SKIN, size=0.6, spacing=0.7))
    # ---- head scales: the big plates on the crown, their seams fine dark lines (pale on a sea turtle)
    crown = head & ~neck & (P.on[:, :, 2] > 0.3) & (Y > HC[1] - 3.0 * hk)
    hc = [(sx * a * hk, HC[1] + b * hk, 0) for sx in (1, -1) for a, b in ((0.55, -2.2), (0.75, -0.9), (1.7, -1.2), (0.9, 0.5), (2.0, 0.6))]
    hc += [(0, HC[1] - 1.5 * hk, 0), (0, HC[1] - 0.1 * hk, 0)]
    pid, he, _ = P.plates(crown, hc, flat=2)
    P.shift(crown & (he < 0.07 * hk + 0.04), 1 if T.sp == 'seaturtle' else -1)
    # ---- the species' skin markings
    if sp['mark'] == 'slider':  # yellow stripes down the head, neck and limbs; the red ear patch behind each eye
        zc = HC[2] + (Y - HC[1]) * (T.NECK[2] - HC[2]) / max(T.NECK[1] - HC[1], 1e-6)
        phi = np.arctan2(Z - zc, X)
        st = (np.abs(np.mod(phi / (2 * np.pi) * 13 + 0.15 * np.sin(Y * 0.8), 1) - 0.5) < 0.13) & (head | rest)
        P.fill(st & ~(P.region('face') & (Y < HC[1] - 2.0 * hk)), pt.ramp('#d8c84a', 6, shift=0.06), tone=sh, base=0.15, brush={'preset': 'skin', 'flow': 'along', 'axis': (0, 1, 0)})
        P.fill(legs & (np.abs(np.mod(Z * 1.3 + X * 0.4, 1.6) - 0.8) < 0.17), pt.ramp('#d0c048', 6, shift=0.06), tone=sh, base=0.1, brush='skin')
        for sx in (1, -1):
            ear = head & (((X - sx * 2.55 * hk) / (0.55 * hk)) ** 2 + ((Y - HC[1] - 0.3 * hk) / (1.15 * hk)) ** 2 + ((Z - HC[2] - 0.35 * hk) / (0.5 * hk)) ** 2 < 1)
            P.fill(ear, pt.ramp('#c83224', 6, shift=0.06), tone=sh, base=0.15, brush='skin')
    elif sp['mark'] == 'spots':  # a box turtle's orange spots on the head and fore legs
        who, d = P.dabs(head | (legs & (Y < 0)), size=0.75, spacing=1.7, seed=11)
        P.fill((head | legs) & (who >= 0) & (d < 0.85) & (rng.random(int(who.max()) + 2)[np.maximum(who, 0)] < 0.55),
               pt.ramp('#e0902a', 6, shift=0.06), tone=sh, base=0.2, brush='skin')
    P.fill('beak', pt.ramp(beak or skin, 6, shift=0.06), tone=sh, base=0.0, brush='shell')
    br = P.region('beak')
    P.shift(br & (P.cav > 0.56), -1)                                       # the beak's cutting edge
    P.fill('claw', pt.ramp(claw, 5, shift=0.05), tone=sh, base=0.1, brush='shell')
    P.shift(P.region('claw') & (Z > 0.62), -1)                              # (darker where the claw leaves the toe)
    # ---- the plastron: paired scutes (gular, humeral, pectoral, abdominal, femoral, anal), seams and growth lines
    pr = P.region('plastron')
    P.fill(pr, pt.ramp(plast, 6, shift=0.05), tone=sh, base=0.1, brush='shell')
    py = np.abs(np.stack([Y - T.L * f for f in (-0.33, -0.2, -0.04, 0.17, 0.32)]))
    pe = np.minimum(np.abs(X), py.min(0))
    if T.sp in ('slider', 'pond', 'box'):  # dark blotches on each plastral scute
        P.fill(pr & (pe > 1.4) & (P.photo('frog', pr, mm=9.0, kind='mot') > -0.1), pt.ramp('#3a2a1c', 5, shift=0.05), tone=sh, base=0.1, brush='shell')
    P.shift(pr & (np.abs(np.mod(pe, 0.55) - 0.27) < 0.06) & (pe > 0.3), -1)
    P.fill(pr & (pe < 0.16), pt.ramp(plast, 6, shift=0.05)[:2], tone=sh, base=-0.3, brush=False)
    # ---- the vest under the shell
    vr = P.region('vest')
    P.fill(vr, pt.ramp(vest[0], 5, shift=0.04), tone=sh, base=0.2, brush='cloth')
    P.fill(vr & (np.abs(np.mod(Y, 2.4) - 1.2) < 0.5), pt.ramp(vest[1], 5, shift=0.05), tone=sh, base=0.1, brush='cloth')
    # ---- the carapace: real scutes (scute_map), each its own tone; growth rings parallel to its seams, the areola
    #      at its heart, rays or blotches by species; dark seams (pale on a sea turtle); keratin brushwork over a real
    #      tortoise-scute photo (brush 'shell')
    sr = P.region('shell') | P.region('marginal')
    sid, e, mar = scute_map(T, X, Y, Z)
    sid = np.where(sr, sid, -1)
    nid = 48
    jit = rng.normal(0, 0.12, nid)
    emax = np.zeros(nid)
    np.maximum.at(emax, sid[sr], e[sr])
    rel = np.where(sr, e / np.maximum(emax[np.maximum(sid, 0)], 0.3), 0)       # 0 at the seam .. 1 at the areola
    shr = pt.ramp(shell, 7, shift=0.08)
    P.fill(sr & ~mar, shr, tone=sh, base=0.1 + jit[np.maximum(sid, 0)] - 0.15 * (rel < 0.18), brush='shell')
    P.fill(sr & mar, shr, tone=sh, base=-0.02 + jit[np.maximum(sid, 0)] - 0.15 * (rel < 0.25), brush='shell')
    if scute:  # the lighter growth zone between the seams and the areola
        P.fill(sr & (rel > 0.22) & (rel < 0.62) & (np.abs(np.mod(e, 0.5) - 0.25) < 0.17), pt.ramp(scute, 6, shift=0.06), tone=sh, base=0.15 + jit[np.maximum(sid, 0)], brush='shell')
    ring = sr & (np.abs(np.mod(e, 0.5) - 0.25) < 0.05) & (rel > 0.08) & (rel < 0.8)
    if sp['rings'] >= 0.6:
        P.shift(ring, -1)
    if sp['areola'] == 'light':
        P.shift(sr & (rel > 0.7), 1)
    elif sp['areola']:  # a dark blotch at each scute's heart (steppe tortoise)
        bl = sr & (rel > 0.5 + 0.12 * P.photo('frog', sr, mm=6.0, kind='mot'))
        P.fill(bl, pt.ramp(sp['areola'], 6, shift=0.06), tone=sh, base=0.1, brush='shell')
    if sp['rays']:  # rays from each areola (box turtle's yellow flashes, slider's streaks, a sea turtle's amber flames)
        cx = np.bincount(sid[sr], X[sr], nid) / np.maximum(np.bincount(sid[sr], None, nid), 1)
        cy = np.bincount(sid[sr], Y[sr], nid) / np.maximum(np.bincount(sid[sr], None, nid), 1)
        ip = np.maximum(sid, 0)
        ang = np.arctan2(Y - cy[ip], X - cx[ip])
        ph0 = rng.random(nid) * 6.283
        ray = sr & (np.abs(np.sin(ang * (3 + (ip % 3)) + ph0[ip] + 0.6 * np.sin(e * 2.2))) > 0.88) & (rel > 0.12) & (rel < 0.9)
        P.fill(ray, pt.ramp(sp['rays'], 6, shift=0.06), tone=sh, base=0.1 + jit[ip], brush={'preset': 'shell', 'flow': 'down'})
    seam = sr & (e < 0.17)
    P.fill(seam, pt.ramp(sp['seam'], 5, shift=0.05), tone=sh, base=0.05 if T.sp == 'seaturtle' else -0.1, brush=False)
    P.shift(sr & mar & (Z < T.ZB - 0.1), -1)                               # the rim's underside


def turtle_face(P, T, seed, eyes=('dot', 0.36), mouth='upturn', blush=None, ink=None, yaw=0.0):
    """The turtle's face on the front of its head (yaw: degrees the head was turned about the neck, +: toward +x)."""
    hk, HC = T.hk, T.HC
    c = np.array((0, HC[1] - 3.0 * hk, HC[2] + 0.6 * hk))
    ax = np.array((0, -1, 0.15))
    if yaw:
        a = np.radians(yaw)
        Rz = np.array(((np.cos(a), -np.sin(a), 0), (np.sin(a), np.cos(a), 0), (0, 0, 1)))
        c = np.asarray(T.NECK) + Rz @ (c - np.asarray(T.NECK))
        ax = Rz @ ax
    where = P.region('face') | P.region('skin') | P.region('beak')
    kw = dict(ink=ink) if ink else {}
    fc = face.Face(P, c=tuple(c), axis=tuple(ax), where=where, seed=seed, **kw)
    fc.eyes(eyes[0], spread=3.5 * hk, size=eyes[1] * hk, dy=0.5 * hk)
    fc.mouth(mouth, w=2.6 * hk, dy=-1.2 * hk, weight=0.32)
    if blush:
        fc.blush(4.6 * hk, -0.6 * hk, rx=0.8 * hk, ry=0.45 * hk, col=blush)
    for sx in (1, -1):  # the nostrils, two small ink slits at the snout's tip
        nc = np.array((sx * 0.38 * hk, HC[1] - 3.75 * hk, HC[2] - 0.05 * hk))
        if yaw:
            nc = np.asarray(T.NECK) + Rz @ (nc - np.asarray(T.NECK))
        P.flat(P.ellipse(tuple(nc), tuple(ax), 0.16 * hk, 0.1 * hk) & where, face.INK)
    return fc


NATURAL_SKIN = dict(kind='pebbles', photo='tortoise', mm=16.0, k=0.18, mot=0.14, vary=1.2)


def go(F, make_rig, paint, frames=64, skip=(), fold=(0, 12, 24, 46)):
    run(F, make_rig, paint, frames=frames, skip=list(SKIP) + list(skip), fold=fold,
        cams=[((60, -76, 54), (0, -2, 16)), ((-58, 70, 48), (0, 2, 16))])
