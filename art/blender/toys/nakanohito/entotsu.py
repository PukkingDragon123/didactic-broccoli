"""エントツトカゲ Smokestack Lizard (series nakanohito, common): an olive-green lizard kaijū standing up on its long
tail, three factory smokestacks (brick, banded, iron) growing out of its lower back. Inside: a fire-bellied newt with
a towel round its neck, worn out between takes.
Gimmick: the hood tips back, the newt pants and looks round, and the tall stack lets out a puff of cotton-wool smoke.

    tools/blender.sh art/blender/toys/nakanohito/entotsu.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _suit import *  # noqa: E402,F401,F403

F = Fig('nakanohito', 'entotsu')

# ------------------------------------------------------------------ the suit
BODY = [(9.0, 1.5, 14.0, 6.0, 6.0), (12.0, 1.0, 20.0, 9.0, 8.0), (18.0, 0.0, 21.5, 9.6, 8.6), (24.0, -0.5, 19.5, 8.6, 8.0),
        (29.0, 0.0, 16.0, 7.0, 7.0), (32.4, 0.5, 11.0, 5.0, 5.0)]
ZIP = [(7.4, 29.6), (8.4, 25.0), (9.0, 20.5)]
STACKS = [((5.4, 8.2, 14.0), (8.0, 12.2, 27.0), 2.8), ((-5.2, 8.0, 13.0), (-6.6, 12.0, 25.0), 2.4), ((0.4, 9.8, 10.5), (0.6, 14.0, 20.5), 2.1)]


def sc_body(h):
    def f(V, N):
        x, z = V[:, 0], V[:, 2]
        front = tk.smoothstep(-0.3, -0.7, N[:, 1]) * tk.smoothstep(7.0, 5.0, np.abs(x)) * (z > 12.0) * (z < 29)
        d = -0.3 * front * tk.smoothstep(0.35, 0.0, np.abs(np.sin((z - 12.0) * math.pi / 2.8)))  # the belly plates
        return d + scales(V, 0.09, 1.9) * (1 - front) + zip_groove(0.0, ZIP)(V, N)
    tk.push(h, f)


trunk_lo, trunk_hi = trunk('trunk', BODY, tris=230, region=('suit', [('belly', lambda C, N: (N[:, 1] < -0.5) & (np.abs(C[:, 0]) < 6.6) & (C[:, 2] > 11.6) & (C[:, 2] < 29.4))]),
                           sculpt=sc_body)
los, his = [trunk_lo], [trunk_hi]
for sx in (1, -1):
    lg, lgh = limb('leg', [(sx * 7.6, 1.0, 12.5), (sx * 9.2, -1.6, 7.4), (sx * 8.6, 0.4, 3.4)], [5.8, 5.0, 3.9], tris=60)
    tk.push(lgh, lambda V, N: scales(V, 0.09, 1.9))
    ft, fth = foot('foot', (sx * 8.8, 4.0), (sx * 0.2, -1), L=12.2, W=8.6, H=5.0, toes=3, claw=1.05, claw_len=2.4, tris=66)
    los += [lg, ft]
    his += [lgh] + fth
# the long tail, curling off to one side along the ground, a row of low spines on top
TAIL = [(0, 8.0, 12.5), (0.2, 13.5, 7.4), (1.6, 19.5, 3.4), (4.6, 25.0, 1.9), (8.4, 28.6, 1.3)]
tl, tlh = limb('tail', TAIL, [5.0, 4.0, 3.0, 2.0, 1.25], tris=70, folds=False)
tk.push(tlh, lambda V, N: scales(V, 0.1, 1.9))
los.append(tl)
his.append(tlh)
for (a, b) in ((TAIL[1], 3.5), (TAIL[2], 2.7), (TAIL[3], 1.9)):
    base = V3(a) + V3((0, 0, b))
    sp = cone('spine_hi', base - V3((0, 0, 0.8)), base + V3((0, 1.2, 2.0)), 1.1, n=8)
    tk.set_region(sp, 'plate')
    his.append(sp)
    los.append(tk.tube('spine', [tuple(base - V3((0, 0, 0.8))), tuple(base + V3((0, 1.2, 2.0)))], [1.1, 0.15], n=4, cap0=None, cap1='point'))
# the smokestacks: brick, red-and-white banded, and iron, sooty at the mouth
for i, (b, t, r) in enumerate(STACKS):
    b, t = V3(b), V3(t)
    L = float(np.linalg.norm(t - b))
    sth = tk.lathe('stack_hi', [(0, 0), (r * 1.08, 0), (r, L * 0.5), (r * 0.94, L * 0.9), (r * 1.14, L * 0.92), (r * 1.14, L * 1.02),
                                (r * 0.74, L * 1.02), (r * 0.72, L * 0.9), (0, L * 0.88)], n=16)
    tk.transform(sth, Matrix.Translation(Vector(b)) @ Vector(t - b).to_track_quat('Z', 'Y').to_matrix().to_4x4())
    tk.set_region(sth, ('brick', 'band', 'iron')[i])
    his.append(sth)
    los.append(tk.tube('stack', [tuple(b), tuple(t + (t - b) * 0.02)], [r * 1.08, r * 1.1], n=7, cap0=None, cap1='flat'))
cl, clh = collar('collar', (0, -0.6, 32.2), 5.4, 4.9, r=0.9)
zl, zh = zip_tab('tab', (0, 7.4, 29.8))
los += [cl, zl]
his += [clh] + zh
F.part('body', tk.decimate(tk.join(los, 'body'), 470), his, bone='body')

# ------------------------------------------------------------------ the arms: little clenched fists
SH = {}
for sx, nm in ((1, 'arm_l'), (-1, 'arm_r')):
    sh_ = (sx * 9.4, -1.0, 26.0)
    wr = (sx * 10.6, -8.6, 22.4)
    a, ah = limb(nm, [sh_, (sx * 11.8, -4.2, 21.8), wr], [3.6, 3.1, 2.6], tris=56)
    tk.push(ah, lambda V, N: scales(V, 0.08, 1.9))
    hd, hdh = mitten(nm + '_hand', wr, (-sx * 0.15, -1, 0.25), (sx * 1.0, 0, 0.2), L=4.0, W=4.8, T=3.4, claws=3, claw=0.55, tris=50)
    F.part(nm, tk.decimate(tk.join([a, hd], nm), 96), [ah] + hdh, bone=nm)
    SH[nm] = sh_

# ------------------------------------------------------------------ the hood: a blunt-snouted lizard head with a crest
HOOD = [(9.0, 39.5, 14.0, 7.0, 7.0), (5.5, 40.0, 21.0, 9.5, 8.8), (0.5, 40.0, 22.5, 10.0, 9.0), (-5.0, 39.3, 20.0, 8.6, 8.4),
        (-10.0, 38.0, 16.0, 6.4, 6.6), (-15.0, 37.0, 13.6, 4.8, 5.4), (-19.0, 36.4, 12.0, 4.0, 4.6), (-21.4, 36.2, 10.6, 3.2, 3.8)]
cage = tk.loft('hood', [{'c': (0, y, z), 'w': w, 'ht': ht, 'hb': hb, 'e': 2.3} for y, z, w, ht, hb in HOOD], n=14, up=(0, 0, 1), cap0='round', cap1='round')


def sc_hood(h):
    def f(V, N):
        x, y, z = V[:, 0], V[:, 1], V[:, 2]
        d = 0.0
        for sx in (1, -1):
            d = d + tk.bump(V, (sx * 5.6, -8.0, 45.6), 3.2, 1.6, sharp=1.6)   # brow ridges
            d = d + tk.bump(V, (sx * 2.6, -22.4, 39.0), 1.4, 0.6)            # nostril bumps
            d = d + tk.bump(V, (sx * 9.2, -3.0, 36.0), 3.2, 0.7)             # jowls
        # the jaw line: a groove along each side of the snout
        jaw = -0.35 * tk.smoothstep(0.5, 0.0, np.abs(z - (35.4 - 0.05 * (y + 10)))) * (y < -6) * (np.abs(x) > 3.0)
        return d + jaw + scales(V, 0.1, 1.9)
    tk.push(h, f)


hood_lo, hood_hi = lh(cage, 'hood', None, 'suit', sculpt=sc_hood)
hollow(hood_lo, hood_hi, (0, -1.0, 39.4), (8.6, 9.6, 8.0), bottom=31.5)
tk.decimate(hood_lo, 300)
# the crest: three plates down the top of the head
crl, crh = [], []
for y, z, s in ((-3.0, 49.6, 1.0), (2.0, 49.8, 1.2), (6.6, 47.6, 0.95)):
    c = tk.slab('crest_hi', [(-2.6 * s, 0), (2.6 * s, 0), (0.6 * s, 3.4 * s), (-0.9 * s, 3.0 * s)], 1.2, plane='YZ', at=0.0, bevel=0.35, segs=2)
    tk.move(c, (0, y, z - 1.0))
    tk.set_region(c, 'plate')
    crh.append(c)
    cl_ = tk.slab('crest', [(-2.6 * s, 0), (2.6 * s, 0), (0.6 * s, 3.4 * s), (-0.9 * s, 3.0 * s)], 1.2, plane='YZ', at=0.0, bevel=0, segs=0)
    tk.move(cl_, (0, y, z - 1.0))
    crl.append(cl_)
F.part('hood', tk.join([hood_lo] + crl, 'hood'), [hood_hi] + crh, bone='hood')

# ------------------------------------------------------------------ the smoke (squashed into the tall stack's mouth until the clip)
T1 = V3(STACKS[0][1])
D1 = (V3(STACKS[0][1]) - V3(STACKS[0][0]))
D1 /= np.linalg.norm(D1)
puffs = [((0.8, 0.2, 2.8), 2.6), ((-0.6, 0.6, 4.8), 2.2), ((2.8, 0.4, 5.4), 2.4), ((1.8, 0.8, 7.6), 2.0)]
sm_hi = []
for c, r in puffs:
    b = ball('smoke_hi', tuple(T1 + V3(c)), r, n=12, rings=7)
    tk.subsurf(b, 2)
    tk.push(b, lambda V, N: 0.22 * np.sin(V[:, 0] * 2.3 + V[:, 2] * 1.7) * np.sin(V[:, 1] * 2.1 + V[:, 2] * 1.1))
    tk.set_region(b, 'smoke')
    sm_hi.append(b)
sm_lo = ball('smoke', tuple(T1 + V3((1.0, 0.5, 5.2))), 3.9, squash=(1.0, 0.95, 1.45), n=10, rings=6)
tk.subsurf(sm_lo, 1)
tk.decimate(sm_lo, 70)
F.part('smoke', sm_lo, sm_hi, bone='smoke', uvw=0.7)
SQ = 0.05

# ------------------------------------------------------------------ the actor: a fire-bellied newt with a towel round its neck
AC = (0, -1.2, 37.4)
nw = ball('actor', AC, 5.8, squash=(1.2, 1.08, 0.9), n=12, rings=7)


def sc_newt(h):
    def f(V, N):
        d = 0.0
        for sx in (1, -1):
            d = d + tk.bump(V, (sx * 4.2, -4.4, 41.0), 1.7, 0.8)  # the eye bumps
        return d + 0.04 * np.sin(V[:, 0] * 7 + V[:, 1] * 5)
    tk.push(h, f)


nw_lo, nw_hi = lh(nw, 'actor', 130, 'newt', lo=1, hi=3, sculpt=sc_newt)
nk_lo, nk_hi = lh(tk.tube('neck', [(0, -0.4, 29.5), (0, -0.8, 35.0)], 3.8, n=8, cap0='round', cap1=None), 'neck', 24, 'newt', lo=0, hi=2)
ring = [(5.0 * math.cos(a), -0.8 + 4.6 * math.sin(a), 33.4 + 0.25 * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 14, endpoint=False)]
tw_hi = tk.tube('towel_hi', ring, 1.05, n=8, closed=True, squash=0.75)
tk.subsurf(tw_hi, 1)
tk.push(tw_hi, lambda V, N: 0.14 * np.sin(np.arctan2(V[:, 1] + 0.8, V[:, 0]) * 11 + V[:, 2] * 3))  # (the twist)
knot = ball('knot_hi', (1.6, -5.6, 33.0), 1.3, squash=(1.0, 0.8, 0.9), n=8, rings=5)
tw_hi = tk.join([tw_hi, knot], 'towel_hi')
tk.set_region(tw_hi, 'towel')
tw_lo = tk.tube('towel', ring[::2], 1.05, n=4, closed=True, squash=0.75)
F.part('actor', tk.join([nw_lo, nk_lo, tw_lo], 'actor'), [nw_hi, nk_hi, tw_hi], bone='actor')

for p in F.parts:
    p.bone = p.bone or 'body'
HINGE = (0, 9.4, 31.2)


def make_rig():
    from rig import Rig
    sm = F.parts[[p.name for p in F.parts].index('smoke')].low
    if not sm.get('squashed'):  # (the smoke is modelled full size for the bake, then squashed into the stack)
        tk.transform(sm, Matrix.Translation(Vector(T1)) @ Matrix.Diagonal((SQ, SQ, SQ, 1)) @ Matrix.Translation(-Vector(T1)))
        sm['squashed'] = 1
    R = Rig()
    R.bone('root', (0, 0, 0))
    R.bone('body', (0, 0, 10), parent='root')
    for nm, at in SH.items():
        R.bone(nm, at, parent='body')
    R.bone('hood', HINGE, parent='body')
    R.bone('smoke', tuple(T1), parent='body', tail=tuple(T1 + D1 * 4))
    R.bone('actor', (0, -0.6, 32.0), parent='body')
    for p in F.parts:
        R.attach(p.low, p.bone)
    with R.action('gimmick'):
        k = R.key
        for b in ('body', 'arm_l', 'arm_r', 'smoke', 'actor'):
            k(b, 0)
        t0, up, hold, down, end = reveal(R, k, t0=4, up=14, hold=52, down=62, end=72, hinge_deg=-92)
        k('body', 4, move=(0, 0, -0.5))
        k('body', 12)
        # the newt comes up for air: pants (head bobbing), looks round, slumps a little
        k('actor', 12)
        k('actor', 18, move=(0, 0, 1.4), ease='BACK')
        for i, f_ in enumerate(range(22, 46, 4)):
            k('actor', f_, move=(0, 0, 1.0 if i % 2 else 1.5), rot=('Z', (-14, -14, 0, 14, 14, 0)[i]))
        k('actor', 54, move=(0, 0, 0.6))
        k('actor', 60)
        # the arms drop, tired, then pull back up into character
        for nm, sx in (('arm_l', 1), ('arm_r', -1)):
            k(nm, 14)
            k(nm, 22, rot=('X', 28))
            k(nm, 48, rot=('X', 24))
            k(nm, 58)
        # the smoke: a puff out of the tall stack that rises and thins out
        k('smoke', 14, scale=1.0)
        k('smoke', 22, scale=1 / SQ * 0.75, ease='BACK')
        k('smoke', 34, scale=1 / SQ, move=(4.6, -1.0, 1.2))
        k('smoke', 46, scale=1 / SQ * 0.9, move=(7.0, -1.6, 2.6))
        k('smoke', 54, scale=1.0, move=(1.4, -0.3, 0.6))
        k('smoke', 56, scale=1.0)
        for b in ('body', 'arm_l', 'arm_r', 'actor', 'hood', 'smoke'):
            k(b, end)
    return R


def paint(P, pt):
    X, Yc, Z = P.X, P.Y, P.Z
    sh = P.shade(light=0.0, ao=0.8, cav=1.0)
    air = -0.14 * tk.smoothstep(2, 9, Yc) + 0.06 * tk.smoothstep(0, -8, Yc)
    P.fill('suit', pt.ramp('#6d7a52', 7, shift=0.06), tone=sh, base=air)
    P.fill('belly', pt.ramp('#cfc58e', 7, shift=0.06), tone=sh, base=0.05)
    P.fill('plate', pt.ramp('#3f4a34', 6, shift=0.05), tone=sh, base=0.05)
    P.fill('claw', pt.ramp('#2e2a26', 5, shift=0.04), tone=sh * 0.7, base=0.2)
    P.fill('zip', pt.ramp('#b4b2aa', 5, shift=0.04), tone=sh, base=0.1)
    P.fill('collar', pt.ramp('#3a3c30', 5, shift=0.03), tone=sh, base=0.0)
    foam(P, pt, sh)
    zip_paint(P, 0.0, ZIP)
    # the stacks: red brick with mortar courses, red and white bands, black iron; soot at every mouth
    br = P.region('brick')
    P.fill('brick', pt.ramp('#a04a34', 6, shift=0.06), tone=sh, base=0.0)
    P.flat(br & (np.abs(np.sin(Z * 2.6)) < 0.22), '#d8c8a8')
    P.fill('band', pt.ramp('#efe6d6', 6, shift=0.04), tone=sh, base=0.1)
    P.tint(P.region('band') & (np.sin(Z * 1.25) > 0.0), pt.ramp('#c8342c', 6, shift=0.05), sh)
    P.fill('iron', pt.ramp('#4a4a50', 6, shift=0.05), tone=sh * 1.2, base=0.05)
    for (b, t, r) in STACKS:
        tt = V3(t)
        soot = (P.region('brick') | P.region('band') | P.region('iron')) & (np.linalg.norm(P.pos - tt, axis=2) < r * 1.5 + 0.8 * np.sin(np.arctan2(P.Y - tt[1], P.X - tt[0]) * 5) * 0.3)
        P.tint(soot, pt.ramp('#2a2624', 5, shift=0.03), sh)
    P.fill('smoke', pt.ramp('#dcd8d0', 6, shift=0.03), tone=sh * 0.8, base=0.1)
    # the newt: near-black back, a fire-orange belly and throat with black blotches; the towel white with a blue stripe
    nm = P.region('newt')
    P.fill('newt', pt.ramp('#7c6a48', 7, shift=0.06), tone=sh * 0.8, base=0.12)
    throat = nm & (Z < AC[2] - 2.6 + 0.2 * np.abs(X))
    P.tint(throat, pt.ramp('#e8642c', 6, shift=0.06), sh + 0.1)
    for c_, r_ in (((2.2, AC[1] - 4.0, AC[2] - 3.2), 0.7), ((-2.8, AC[1] - 3.0, AC[2] - 3.4), 0.55), ((0.4, AC[1] - 5.0, AC[2] - 3.0), 0.45)):
        P.flat(throat & (np.linalg.norm(P.pos - np.array(c_), axis=2) < r_), '#3a2a22')  # (a few black spots on the red belly)
    P.fill('towel', pt.ramp('#f2eee4', 6, shift=0.04), tone=sh * 0.8, base=0.1)
    P.tint(P.region('towel') & (np.abs(np.sin(np.arctan2(Yc + 0.8, X) * 3.0)) > 0.92), pt.ramp('#3a62a8', 5, shift=0.04), sh)
    nf = face.Face(P, c=(AC[0], AC[1] - 6.4, AC[2] + 0.6), axis=(0, -1, 0.15), where=nm, seed=31)
    nf.eyes('sleepy', spread=8.4, size=0.85, dy=2.2)
    nf.mouth('wobble', w=7.0, dy=-1.2, weight=0.48)
    nf.nose('nostrils', dy=0.6, size=0.75)
    sweat(nf, [(-5.0, 4.0), (5.4, 3.0)], r=0.55)
    # the lizard's face: dot eyes under the brow ridges, a gritted grin right across the blunt snout
    lf = face.Face(P, c=(0, -9.2, 43.2), axis=(0, -1, 0.35), where=P.region('suit'), seed=33)
    lf.eyes('dot', spread=10.6, size=0.75, dy=0.0, uneven=0.3)
    lf.brows('angry', spread=10.6, dy=2.0, w=3.0, weight=0.55)
    mf = face.Face(P, c=(0, -21.6, 36.0), axis=(0, -1, 0), where=P.region('suit'), seed=34)
    mf.mouth('gritted', w=9.0, dy=0.0, teeth=4)
    mf.nose('nostrils', dy=2.6, size=1.1)
    P.lines(['belly', 'plate'], ['suit'], step=1)
    P.lines(['brick', 'band', 'iron'], ['suit'], step=1)
    P.lines(['newt'], ['towel', 'collar'], step=1)
    P.clusters()
    return P.done()


run(F, ARGS, make_rig, paint, cam=((70, -100, 62), (0, 0, 25)), back=((-70, 100, 62), (0, 4, 22)), folds=(0, 16, 24, 40),
    skip=[('arm_l', 'body'), ('arm_r', 'body'), ('actor', 'body'), ('smoke', 'body')])
