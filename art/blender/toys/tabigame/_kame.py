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
    'pondturtle': dict(eye='round', iris='#7a5a20', lid=True, tilt=-6, mouth='beakline'),                 # calm
    'slider': dict(eye='round', iris='#5a7a30', brows=('worried', 1.1), mouth='beakline', extras=('sweat',)),  # nervous
    'boxturtle': dict(eye='round', iris='#d8602a', eyek=1.3, tilt=4, mouth='beakline'),                   # red-eyed, prim
    'sulcata': dict(eye='round', iris='#4a3018', lid=True, tilt=-10, brows=('flat', 1.2), mouth='beakline'),  # grumpy elder
    'steppe': dict(eye='round', iris='#3a2a18', eyek=1.2, tilt=8, mouth='beakline', extras=('blush',)),  # cheeky
    'seaturtle': dict(eye='round', iris='#2a3a30', lid=True, lashes=2, tilt=-4, mouth='beakline'),      # wise
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
                 flat_top=0.45, hz=1.0):
        s.B, s.L, s.W, s.clr, s.dome = B, L, W, clr, dome
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
            def f(V, N):
                x, y, z = V[:, 0], V[:, 1], V[:, 2] - ZB
                up = z > 1.6 * rim
                g = (np.abs(np.abs(x) - R * 0.32) < 0.22) & up & (z < dome * 0.9)
                g |= (np.abs(np.mod(y + L * 0.13, L * 0.26) - L * 0.13) < 0.22) & up & (z < dome * 0.9)
                ang = np.arctan2(y * W / L, x)
                g |= (np.abs(np.mod(ang, np.pi / 6) - np.pi / 12) < 0.04) & (z < 1.6 * rim) & (z > -0.2)
                rimg = np.abs(z - 1.55 * rim) < 0.22
                return -0.3 * (g | rimg)
            tk.push(h, f)
        B.add('shell', lowk(cara, 'cara', 160, ('shell', [('marginal', lambda C, N: C[:, 2] < ZB + 1.5 * rim)]), hi=3, sculpt=sc))
        # ---- the head on its neck
        hk = head
        s.NECK = (0.0, -L * 0.3, clr + 3.0)
        s.HC = HC = (0.0, -L * (0.5 + 0.1 * neck), clr + 3.6 + 1.6 * neck * hz)
        nk = tk.tube('neck', [s.NECK, (0, (s.NECK[1] + HC[1]) / 2 - 0.4, (s.NECK[2] + HC[2]) / 2 + 0.3), (0, HC[1] + 2.0 * hk, HC[2] - 0.4)],
                     [2.4 * hk, 2.2 * hk, 2.1 * hk], n=8)
        B.add('head', lowk(nk, 'neck', 30, 'skin', sculpt=lambda h: tk.push(h, lambda V, N: 0.12 * np.sin(V[:, 1] * 4.0))))
        hd = tk.loft('head', [dict(c=(0, HC[1] + 2.4 * hk, HC[2] - 0.2), w=4.6 * hk, h=2.1 * hk),
                              dict(c=(0, HC[1] + 0.4 * hk, HC[2] + 0.3 * hk), w=5.8 * hk, ht=2.8 * hk, hb=2.4 * hk),
                              dict(c=(0, HC[1] - 1.8 * hk, HC[2]), w=5.2 * hk, ht=2.5 * hk, hb=2.2 * hk),
                              dict(c=(0, HC[1] - 3.3 * hk, HC[2] - 0.5 * hk), w=3.4 * hk, ht=1.5 * hk, hb=1.6 * hk)],
                      n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=0.8 * hk)
        B.add('head', lowk(hd, 'head', 90, ('skin', [('beak', lambda C, N: (C[:, 1] < HC[1] - 2.6 * hk) & (C[:, 2] < HC[2] - 0.2 * hk)),
                                                      ('face', lambda C, N: (N[:, 1] < -0.35) & (C[:, 1] < HC[1] - 0.5 * hk))])))
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
                for k in (-1, 0, 1):
                    c0 = (foot[0] + k * r * 0.55, foot[1] + d * r * 0.95, 0.55)
                    cl = tk.tube('claw', [c0, (c0[0] + k * 0.2, c0[1] + d * 1.0, 0.25)], [0.45, 0.18], n=5, cap1='point')
                    B.add('legs', lowk(cl, 'claw', 8, 'claw', lo=0, hi=1))

    def commit(s, F, extra_bones=(), kinds=None):
        s.B.commit(F, bones={'body': 'body', 'legs': 'legs', 'head': 'head', 'shell': 'shell', **dict(extra_bones)}, kinds=kinds)

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


def paint_turtle(P, pt, sh, T, skin, shell, scute=None, plast='#d8c28a', claw='#e6dcc0', beak=None, vest=('#f2efe6', '#3a5aa0'),
                 dabs=True):
    """The turtle's own paint: scaly skin, the carapace's scutes with growth rings, plastron, claws, beak, the vest."""
    X, Y, Z = P.X, P.Y, P.Z
    P.fill('skin', pt.ramp(skin, 7, shift=0.07), tone=sh, base=0.05)
    if dabs:
        who, d = P.dabs(P.region('skin'), size=0.8, spacing=1.1)
        P.shift(P.region('skin') & (who >= 0) & (d > 0.78), -1)
    P.fill('face', pt.ramp(skin, 7, shift=0.07), tone=sh, base=0.15)
    P.fill('beak', pt.ramp(beak or skin, 6, shift=0.06), tone=sh, base=0.0)
    P.fill('claw', pt.ramp(claw, 4), tone=sh, base=0.15)
    P.fill('plastron', pt.ramp(plast, 6, shift=0.05), tone=sh, base=0.1)
    vr = P.region('vest')
    P.fill(vr, pt.ramp(vest[0], 5, shift=0.04), tone=sh, base=0.2, brush='cloth')
    P.fill(vr & (np.abs(np.mod(Y, 2.4) - 1.2) < 0.5), pt.ramp(vest[1], 5, shift=0.05), tone=sh, base=0.1, brush='cloth')
    sr = P.region('shell')
    P.fill(sr, pt.ramp(shell, 7, shift=0.08), tone=sh, base=0.1, brush={'preset': 'lacquer', 'flow': 'around'})
    if scute:
        R = T.W / 2
        cu = np.abs(np.mod(Y + T.L * 0.13, T.L * 0.26) - T.L * 0.13)
        ring = (np.minimum(np.abs(X), np.abs(np.abs(X) - R * 0.62)) < R * 0.18) & (cu < T.L * 0.07)
        P.fill(sr & ring, pt.ramp(scute, 6, shift=0.06), tone=sh, base=0.15)
    P.fill(sr & (P.cav > 0.6), pt.ramp(shell, 7, shift=0.08)[:3], tone=sh, base=-0.3, brush=False)
    P.fill('marginal', pt.ramp(shell, 7, shift=0.08), tone=sh, base=-0.05)
    mr = P.region('marginal')
    ang = np.arctan2(Y * T.W / T.L, X)
    P.shift(mr & (np.abs(np.mod(ang, np.pi / 6) - np.pi / 12) < 0.05), -2)
    if scute:
        P.fill(mr & (np.abs(np.mod(ang + np.pi / 12, np.pi / 6) - np.pi / 12) < 0.12), pt.ramp(scute, 6, shift=0.06), tone=sh, base=0.0)


def turtle_face(P, T, seed, eyes=('dot', 0.55), mouth='upturn', blush=None, ink=None, yaw=0.0):
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
    fc.eyes(eyes[0], spread=4.0 * hk, size=eyes[1] * hk, dy=0.5 * hk)
    fc.mouth(mouth, w=2.6 * hk, dy=-1.2 * hk, weight=0.32)
    if blush:
        fc.blush(4.6 * hk, -0.6 * hk, rx=0.8 * hk, ry=0.45 * hk, col=blush)
    return fc


def go(F, make_rig, paint, frames=64, skip=(), fold=(0, 12, 24, 46)):
    run(F, make_rig, paint, frames=frames, skip=list(SKIP) + list(skip), fold=fold,
        cams=[((60, -76, 54), (0, -2, 16)), ((-58, 70, 48), (0, 2, 16))])
