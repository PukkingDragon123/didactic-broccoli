"""Shared builder for series kouchuu (The Hardwings, a 1960s mop-top beetle beat group: original band, original
characters): a beetle standing on its hind legs in drainpipe trousers and Chelsea boots, a collarless suit jacket
whose tails are its own wing cases (elytra), a white shirt and a thin tie, a little pair of middle legs at the waist,
a wide chitin head under a mop-top fringe, antennae poking out of the hair. Every member adds its own head gear
(mandibles, horn), colours and instrument, so each figure is its own sculpt. Faceted low-poly (FACET.md).

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from _band import *
"""
import math
import os
import sys

HERE_B = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [os.path.join(HERE_B, '..', 'sabaku'), os.path.join(HERE_B, '..', 'lib')]
from _bz import *  # noqa: E402,F401,F403
import face  # noqa: E402

face.SPECIES.update({'kouchuu/kuwagata': 'stagbeetle', 'kouchuu/kabuto': 'rhinobeetle', 'kouchuu/tentou': 'ladybeetle',
                     'kouchuu/sukarabe': 'scarab', 'kouchuu/funkoro': 'dungbeetle', 'kouchuu/tamamushi': 'jewelbeetle'})
face.STYLE.update({
    'stagbeetle': dict(eye='lid', tilt=-6, lashes=1, mouth='smirk'),                      # the cool one
    'rhinobeetle': dict(eye='bean', tilt=10, brows=('flat', 1.1), mouth='smug'),          # the cheeky one
    'ladybeetle': dict(eye='oval', lashes=2, mouth='w', extras=('blush',)),               # the sweet one
    'scarab': dict(eye='halfmoon', tilt=8, mouth='grin', extras=('hatch',)),              # the joker
    'dungbeetle': dict(eye='oval', brows=('worried', 1.1), mouth='wobble', extras=('sweat',)),   # the put-upon roadie
    'jewelbeetle': dict(eye='bean', tilt=14, lid=True, lashes=2, brows=('angry', 1.0), mouth='open'),  # belting it out
})


def lowk(o, name, tris, region, lo=1, hi=2, sculpt=None):
    return low(o, name, tris, lo=lo, hi=hi, region=region, sculpt=sculpt)


def turn(name, prof, c, region, tris=40, n=12, sculpt=None, axis='Z'):
    return lowk(tk.lathe(name, prof, n=n, axis=axis, centre=c), name, tris, region, sculpt=sculpt)


def slabp(name, outline, depth, region, plane='XZ', move=(0, 0, 0), rot=(), bev=0.15):
    """A flat cut-out piece: game mesh unbevelled, sculpt bevelled; rot = [(deg, axis, pivot)] applied before move."""
    a = tk.slab(name, outline, depth, plane=plane, at=0.0, bevel=0.0, segs=0)
    b = tk.slab(name + '_hi', outline, depth, plane=plane, at=0.0, bevel=min(bev, depth * 0.3), segs=2)
    for o in (a, b):
        for deg, ax, pv in rot:
            tk.rotate(o, deg, ax, pivot=pv)
        tk.move(o, move)
    tk.set_region(b, region)
    return a, b


def bands(u, period, width):
    return np.abs(np.mod(u, period) - period / 2) < width / 2


def place(pieces, rots, at):
    """Turn pieces built round the origin (rots = [(deg, axis), ...]) and move them to `at`."""
    for a, b in pieces:
        for o in (a, b):
            for deg, ax in rots:
                tk.rotate(o, deg, ax)
            tk.move(o, tuple(at))
    return pieces


# ------------------------------------------------------------------ instruments (built at the origin: body in XZ facing -y, neck up +z)
GUITARS = {
    'hollow': [(-3.6, -3.6), (-1.6, -4.3), (1.6, -4.3), (3.6, -3.6), (4.0, -1.6), (3.0, 0.0), (3.3, 1.8), (2.5, 3.7), (1.1, 3.0), (0.7, 4.2),
               (-0.7, 4.2), (-1.1, 3.0), (-2.5, 3.7), (-3.3, 1.8), (-3.0, 0.0), (-4.0, -1.6)],
    'single': [(-3.4, -3.8), (-1.4, -4.4), (1.4, -4.4), (3.4, -3.8), (3.8, -1.6), (2.8, 0.2), (2.9, 2.2), (2.0, 3.6), (0.7, 4.2), (-0.7, 4.2),
               (-2.4, 3.2), (-2.6, 1.6), (-2.6, 0.2), (-3.8, -1.6)],
    'bass': [(-3.0, -4.0), (-1.2, -4.6), (1.2, -4.6), (3.0, -4.0), (3.4, -1.8), (2.4, 0.0), (2.8, 2.2), (2.2, 4.4), (1.0, 3.4), (0.6, 4.2),
             (-0.6, 4.2), (-1.4, 3.2), (-2.2, 2.0), (-2.4, 0.2), (-3.4, -1.8)],
}


def guitar(kind='hollow', neck=11.0, depth=1.5, k=1.0):
    """A guitar (body slab, neck, headstock, a bridge and pickups) at the origin: (pieces, tip of the neck)."""
    out = [slabp('gbody', [(u * k, v * k) for u, v in GUITARS[kind]], depth * k, 'gbody', bev=0.3)]
    top = 4.2 * k
    out.append(limb('gneck', [(0, -0.1, top - 0.6), (0, -0.1, top + neck)], 0.5 * k, tris=12, region='gneck', n=6))
    hs = [(-0.9, 0), (0.9, 0), (1.1, 2.6), (0.6, 3.2), (-0.6, 3.2), (-1.1, 2.6)]
    out.append(slabp('ghead', [(u * k, v * k) for u, v in hs], 0.6 * k, 'gneck', move=(0, 0.1, top + neck - 0.2)))
    out.append(slabp('guard', [(-1.6 * k, -1.2 * k), (1.4 * k, -1.2 * k), (1.4 * k, 0.4 * k), (-1.6 * k, 0.4 * k)], 0.3, 'gfit',
                     move=(0, -depth * k / 2 - 0.1, -1.0 * k)))
    return out, top + neck + 3.0 * k


class Beetle:
    """The band member: B parts 'body' (legs, boots, torso, elytra unless wings=True, middle legs), 'head' (head,
    mop-top, antennae), 'arm_r' / 'arm_l' (sleeves to the hands at hand_r / hand_l). Faces -y. hk: head size."""

    def __init__(s, B, hand_r, hand_l, hk=1.0, wings=False, legs=True, seat=None, fringe=22.9, hair='mop', trousers='suit', stance=(2.6, 6.6, 3.2)):
        s.B, s.hk = B, hk
        s.NECK = V3(0, 0.6, 19.0)
        s.SR, s.SL = V3(-4.3, 0.6, 17.0), V3(4.3, 0.6, 17.0)
        if seat is None:
            for sx in (1, -1):   # Chelsea boots and drainpipe trousers
                B.add('body', shoe('boot', (sx * stance[0], stance[3] if len(stance) > 3 else 1.8, 0.0), (sx * 0.06, -1, 0), L=stance[1], W=stance[2], H=2.8, region='boot', tris=36, toe_up=0.3))
                B.add('body', limb('trouser', [(sx * 2.2, 0.6, 9.8), (sx * 2.5, 0.4, 5.4), (sx * 2.6, 0.9, 2.2)], [1.8, 1.6, 1.45], tris=26,
                                   region=trousers, n=8))
        else:   # sitting: thighs forward along the seat, shins down to the boots
            sz = seat
            for sx in (1, -1):
                B.add('body', shoe('boot', (sx * 3.0, -3.6, 0.0), (sx * 0.06, -1, 0), L=6.0, W=3.2, H=2.8, region='boot', tris=36, toe_up=0.3))
                B.add('body', limb('trouser', [(sx * 2.2, 1.6, sz + 1.2), (sx * 2.8, -3.4, sz + 1.0), (sx * 3.0, -4.6, 3.0)], [1.8, 1.6, 1.45],
                                   tris=26, region=trousers, n=8))
        z0 = 8.6 if seat is None else seat
        TORSO = [dict(c=(0, 0.8, z0), w=8.0, h=3.6), dict(c=(0, 0.6, 12.0), w=9.0, ht=4.0, hb=4.4), dict(c=(0, 0.6, 16.0), w=8.6, ht=3.8, hb=4.4),
                 dict(c=(0, 0.6, 18.6), w=6.8, h=3.2)]
        B.add('body', low(tk.loft('torso', TORSO, n=12, up=(0, -1, 0), cap0='round', cap1='round'), 'torso', 140, lo=1, hi=3,
                          region=('suit', [('shirt', lambda C, N: (N[:, 1] < -0.45) & (C[:, 2] > 16.0) & (np.abs(C[:, 0]) < 1.9))])))
        s.ELY = []
        for sx in (1, -1):   # the wing cases: the jacket's tails
            ely = tk.loft('elytron', [dict(c=(sx * 2.0, 3.9, 17.8), w=3.8, h=1.0), dict(c=(sx * 2.3, 5.0, 13.4), w=4.6, h=1.4),
                                      dict(c=(sx * 2.2, 5.3, 9.4), w=4.0, h=1.25), dict(c=(sx * 1.6, 4.7, 6.6 if seat is None else z0 + 0.6), w=2.2, h=0.7)],
                          n=10, up=(0, 1, 0), cap0='round', cap1='round')
            p = lowk(ely, 'elytron', 50, 'elytra', sculpt=lambda h, sx=sx: tk.push(h, lambda V, N: -0.15 * (np.abs(V[:, 0] - sx * 3.6) < 0.25)))
            s.ELY.append(p)
            B.add(('wing_l' if sx > 0 else 'wing_r') if wings else 'body', p)
        if legs:
            for sx in (1, -1):   # the little middle legs at the waist
                B.add('body', limb('mid', [(sx * 3.8, 0.2, 11.6), (sx * 5.6, -0.8, 10.4), (sx * 5.5, -1.8, 8.8)], [0.55, 0.45, 0.3], tris=16, region='chitin',
                                   n=6))
        # ---- arms in the jacket sleeves, chitin hands
        for nm, S, H_ in (('arm_r', s.SR, V3(*hand_r)), ('arm_l', s.SL, V3(*hand_l))):
            mid = (S + H_) / 2 + V3(np.sign(S[0]) * 1.4, 0.4, -1.2)
            B.add(nm, limb(nm, [S, mid, H_], [1.6, 1.4, 1.2], tris=28, region='suit', n=8))
            B.add(nm, blob(nm + '_hand', H_ + (H_ - mid) / np.linalg.norm(H_ - mid) * 0.9, 1.15, tris=16, region='chitin', squash=(1, 1, 1.15)))
        # ---- the head under its mop-top
        k = hk
        HC = s.HC = V3(0, 0.2, 23.0)
        B.add('head', limb('neck', [s.NECK, (0, 0.4, 20.6)], 1.8, tris=12, region='shirt', n=8))
        hd = tk.loft('head', [dict(c=(0, 2.6 * k, HC[2] - 0.2), w=8.0 * k, h=3.2 * k), dict(c=(0, 0.2, HC[2] + 0.1), w=10.2 * k, ht=4.3 * k, hb=3.8 * k),
                              dict(c=(0, -2.6 * k, HC[2] - 0.4), w=9.2 * k, ht=3.6 * k, hb=3.4 * k), dict(c=(0, -4.2 * k, HC[2] - 1.1 * k), w=5.8 * k, h=2.4 * k)],
                      n=12, up=(0, 0, 1), cap0='round', cap1='round', capd=1.0)
        B.add('head', low(hd, 'head', 110, region=('chitin', [('face', lambda C, N: (N[:, 1] < -0.4) & (C[:, 2] < fringe + 0.4))])))
        s.fringe = fringe
        if hair:
            mop = tk.lathe('mop', [(0, -3.4), (3.6, -3.3), (5.4, -2.4), (6.2, -0.8), (6.4, 1.0), (6.0, 2.8), (4.8, 4.4), (2.6, 5.4), (0, 5.7)], n=16,
                           centre=(0, 0.6, HC[2] + 0.4))
            tk.scale(mop, (k, k * (1.0 if hair == 'mop' else 0.95), k), pivot=(0, 0.6, HC[2] + 0.4))
            nrm = np.array((0, -0.25, -1.0))
            nrm /= np.linalg.norm(nrm)
            tk.bisect(mop, (0, -3.0 * k, fringe), tuple(nrm), keep='-', fill=True)   # the fringe: cut dead straight above the eyes

            def strands(h):
                tk.push(h, lambda V, N: -0.13 * bands(np.arctan2(V[:, 0], V[:, 1] - 0.6) * 9 + V[:, 2] * 0.2, 1.0, 0.3) * (N[:, 2] < 0.85))
            B.add('head', lowk(mop, 'mop', 130, 'hair', sculpt=strands))
        s.ANT = []
        for sx in (1, -1):
            a0 = (sx * 4.0 * k, -2.4 * k, HC[2] - 1.0 * k)
            a1 = (sx * 5.6 * k, -4.0 * k, HC[2] + 0.2 * k)
            a2 = (sx * 6.4 * k, -4.4 * k, HC[2] + 1.8 * k)
            s.ANT.append((a0, a1, a2))

    def shift(s, d):
        """Move the whole member (every piece built so far) by d: standing on a playset base."""
        d = V3(*d)
        for L in s.B.p.values():
            for a, b in L:
                for o in (a, b):
                    tk.move(o, tuple(d))
        s.NECK, s.SR, s.SL, s.HC = s.NECK + d, s.SR + d, s.SL + d, s.HC + d
        s.fringe += d[2]
        s.ANT = [tuple(tuple(V3(*p) + d) for p in a) for a in s.ANT]
        s.off = d

    def antennae(s, club=True):
        for a0, a1, a2 in s.ANT:
            s.B.add('head', limb('ant', [a0, a1, a2], [0.32, 0.26, 0.24], tris=12, region='chitin', n=5))
            if club:
                s.B.add('head', blob('club', a2, 0.55, tris=12, region='chitin', squash=(1, 1, 1.4)))

    def rig(s, F, body=(0, 0.6, 9.0), extra=None):
        from rig import Rig
        R = Rig()
        R.bone('root', (0, 0, 0.5))
        R.bone('body', tuple(V3(*body) + getattr(s, 'off', V3(0, 0, 0))), parent='root')
        R.bone('head', tuple(s.NECK), parent='body')
        R.bone('arm_r', tuple(s.SR), parent='body')
        R.bone('arm_l', tuple(s.SL), parent='body')
        if any(p.bone == 'wing_l' for p in F.parts):
            o = getattr(s, 'off', V3(0, 0, 0))
            R.bone('wing_l', tuple(V3(0.3, 3.8, 17.8) + o), parent='body')
            R.bone('wing_r', tuple(V3(-0.3, 3.8, 17.8) + o), parent='body')
        if extra:
            extra(R)
        for p in F.parts:
            R.attach(p.low, p.bone)
        return R


def shake(k, f0, f1, amp=12.0, step=3, bone='head'):
    """The mop-top shake: the head turned left, right, left... from f0 to f1."""
    for i, f in enumerate(range(f0, f1, step)):
        k(bone, f, rot=[('Z', amp if i % 2 == 0 else -amp), ('X', -4)])
    k(bone, f1)


def paint_member(P, pt, sh, chitin='#2a1e18', suit='#8a8a8e', hair='#2a2220', shirt='#f2efe6', tie='#1e1a1c', ely=None, boot='#1e1a1c'):
    """The band's uniform: glossy chitin, the collarless suit with its piping and buttons, shirt and thin tie, the
    Chelsea boots with their elastic sides, the mop-top's combed strands."""
    X, Y, Z = P.X, P.Y, P.Z
    P.fill('chitin', pt.ramp(chitin, 7, shift=0.07, light=0.6), tone=sh, base=0.15, brush={'preset': 'gloss', 'flow': 'around', 'shine': 0.5})
    P.fill('face', pt.ramp(chitin, 7, shift=0.07, light=0.6), tone=sh, base=0.35, brush='gloss')
    sr = P.region('suit')
    P.fill(sr, pt.ramp(suit, 7, shift=0.06), tone=sh, base=0.1, brush='cloth')
    front = sr & (P.on[:, :, 1] < -0.4)
    P.flat(front & (np.abs(X) < 0.12) & (Z > 9.4) & (Z < 16.4), '#1e1a1c')                     # the jacket's closing edge
    P.flat(sr & (np.abs(np.hypot(X, (Z - 18.6) * 1.6) - 2.6) < 0.18) & (Y < 0) & (Z > 15.0), '#1e1a1c')   # the round collarless neckline
    for z in (11.0, 13.0, 15.0):
        P.flat(front & (np.hypot(X + 0.5, Z - z) < 0.32), '#1e1a1c')
    P.fill('shirt', pt.ramp(shirt, 5, shift=0.04), tone=sh, base=0.25, brush=False)
    P.flat(P.region('shirt') & (np.abs(X) < 0.32) & (Y < -2) & (Z < 18.8), tie)
    bt = P.region('boot')
    P.fill(bt, pt.ramp(boot, 6, shift=0.05, light=0.6), tone=sh, base=0.25, brush='gloss')
    P.fill(bt & (np.abs(P.on[:, :, 0]) > 0.6) & (Z > 1.2) & (Z < 2.4) & (np.abs(Y - 1.2) < 1.0), pt.ramp('#4a4a50', 4), tone=sh, base=0.1, brush=False)
    hr = P.region('hair')
    P.fill(hr, pt.ramp(hair, 7, shift=0.07, light=0.55), tone=sh, base=0.15, brush={'preset': 'fur', 'flow': 'down'})
    P.fill(hr & (P.cav > 0.56), pt.ramp(hair, 7, shift=0.07)[:2], tone=sh, base=-0.4, brush=False)
    if ely:
        P.fill('elytra', pt.ramp(ely, 7, shift=0.07, light=0.6), tone=sh, base=0.15, brush={'preset': 'gloss', 'flow': 'down', 'shine': 0.4})
    else:
        P.fill('elytra', pt.ramp(suit, 7, shift=0.06), tone=sh, base=0.1, brush='cloth')
    P.lines(['suit', 'elytra'], step=1)
    P.lines(['hair'], ['face', 'chitin'], step=1)


def paint_guitar(P, pt, sh, body='#b02a2a', burst=None, guard='#efe6d0', neck='#5a3a24'):
    gb = P.region('gbody')
    P.fill(gb, pt.ramp(body, 7, shift=0.07), tone=sh, base=0.15, brush={'preset': 'lacquer', 'flow': 'around'})
    if burst:   # a sunburst: dark toward the rim (the cavity / edge texels and the outer band)
        P.fill(gb & (P.cav > 0.52), pt.ramp(burst, 6, shift=0.05), tone=sh, base=0.0)
    P.fill('gfit', pt.ramp(guard, 5, shift=0.04), tone=sh, base=0.2)
    P.fill('gneck', pt.ramp(neck, 6, shift=0.06), tone=sh, base=0.15, brush={'preset': 'wood', 'flow': 'down', 'L': 4})
    P.lines(['gbody'], step=1)


def face_at(P, M, seed, where=None, size=0.46, spread=4.2, mouth='upturn', dy_m=-2.0):
    """The member's face below the fringe."""
    k = M.hk
    o = getattr(M, 'off', V3(0, 0, 0))
    c = (o[0], o[1] - 4.6 * k, M.fringe - 1.6 * k)
    fc = face.Face(P, c=c, axis=(0, -1, 0.1), where=where if where is not None else (P.region('face') | P.region('chitin')), seed=seed)
    fc.eyes('dot', spread=spread * k, size=size * k, dy=0.5 * k)
    fc.mouth(mouth, w=2.4 * k, dy=dy_m * k, weight=0.32)
    return fc


def go(F, make_rig, paint, frames=60, skip=(), fold=(0, 12, 24, 40), cams=None):
    sk = [('head', 'body'), ('arm_r', 'body'), ('arm_l', 'body'), ('arm_r', 'head'), ('arm_l', 'head')] + list(skip)
    run(F, make_rig, paint, frames=frames, skip=sk, fold=fold, cams=cams or [((58, -76, 46), (0, -2, 15)), ((-56, 70, 42), (0, 2, 15))])
