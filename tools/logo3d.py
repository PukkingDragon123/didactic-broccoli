"""logo3d.py: the gacha cards' 3D hand-painted title logos (the owner's direction: real 3D lettering, hand-painted like
the toys, interactive with the series' own figures). Glyphs of our own hand-pixelled display face (tools/fonts/
gg_display.py, 16 px caps) become chunky extruded blocks in one Blender scene (art/blender/logo3d/scene.py): every
letter tilted, bounced and turned its own way, the top line stacked on the bottom line, letters leaning on each other,
two or three of the series' toys sitting on / peeking behind / pushing / holding letters, lit by the toy key light with
real contact shadows. Each series paints its letters in its own themed finish (tools/logo3d_themes.py: crab shell,
turtle scutes, sushi toppings on rice, bath tiles, wagasa paper... never a default yellow) with small sculpted themed
bits growing off them (claws, legs, flippers, drips, steam, ribs, a skewer...); then pixel-snapped here: hard alpha,
a clean quantised palette, a 1-grid-pixel ink keyline and a hard ink ground shadow, at the card's 2x scale. No glow,
gradient, chrome or bevel presets.
  python3 -I tools/logo3d.py dango,kouchuu     (re-render; tools/card7.py uses the cached shots/.art-cache/logo3d/)"""
import os, sys, json, math, random, subprocess
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixprint import line_mask, _dilate
from printkit import CACHE, ROOT
from card6 import mixc, lum, deep, INK, YEL

OUT = os.path.join(CACHE, 'logo3d')
BUILD = os.path.join(ROOT, 'art', 'blender', 'toys', '_build')
GOLD = 0xf2c84a; CREAM = 0xf6eedb
sys.path.insert(0, os.path.join(ROOT, 'art', 'blender', 'toys', 'lib'))
from paint import ramp  # the toy line's hue-shifted ramps
from logo3d_themes import THEMES
FACE = 'ggd'  # the titles' own hand-pixelled face (tools/fonts/gg_display.py)


def _rgb8(c): return ((c >> 16) & 255, (c >> 8) & 255, c & 255)


def _rgb(c): return ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255


def tones(c, ix=(2, 3, 5)):
    r = ramp(_rgb(c), n=7)
    b = np.array(_rgb(c))
    return [tuple(float(v) for v in (b if i == 3 else (b * 0.4 + r[i] * 0.6) if i == 2 else r[i])) for i in ix]


def _runs(m): return [int(np.sum(r[1:] & ~r[:-1]) + r[0]) for r in m]


def _dist(a, b): return sum(abs(x - y) for x, y in zip(_rgb(a), _rgb(b)))


def _paint(base, layers, stroke, off, chip, rough=None):
    """A scene paint spec (art/blender/logo3d/scene.py paint()) from hex colours."""
    L = []
    for l in layers:
        d = dict(l, c=_rgb(l['c']))
        if l.get('c2'): d['c2'] = _rgb(l['c2'])
        L.append(d)
    d = dict(t=tones(base), L=L, stroke=stroke, off=off, chip=chip)
    if rough: d['rough'] = rough
    return d


def _bitpaint(pt, rn):
    if isinstance(pt, str): return pt
    if isinstance(pt, int): return _paint(pt, [], (rn.uniform(-1.4, 1.4), 3.2, 0.85), (rn.uniform(-5, 5), 0, rn.uniform(-5, 5)), (_rgb(mixc(pt, 0xf4ecdc, 0.5)), 0.8))
    return _paint(pt['f'], pt['L'], (0.4, 3.2, 0.85), (0, 0, 0), None)


def letter_paint(v, rn):
    """front / rim / side paint specs of one letter from its theme paint v."""
    f = v['f']; s = v.get('s', deep(f, 0.5)); L = v['L']
    sL = v['sL'] if 'sL' in v else [dict(l, c=mixc(deep(l['c'], 0.42), s, 0.3), **({'c2': mixc(deep(l['c2'], 0.42), s, 0.3)} if l.get('c2') else {})) for l in L]
    rL = [dict(l, c=mixc(l['c'], 0xfff8e8, 0.3), **({'c2': mixc(l['c2'], 0xfff8e8, 0.3)} if l.get('c2') else {})) for l in L]
    st = (rn.uniform(-1.4, 1.4), rn.uniform(2.6, 4.0), rn.uniform(0.7, 1.0)); off = (rn.uniform(-6, 6), rn.uniform(-6, 6), rn.uniform(-6, 6))
    ch = v.get('chip', mixc(f, 0xf4ecdc, 0.55))
    return dict(front=_paint(f, L, st, off, (_rgb(ch), 0.76), v.get('rough')),
                rim=dict(_paint(mixc(f, 0xfff8e8, 0.4), rL, st, off, (_rgb(deep(s, 0.5)), 0.62), v.get('rough')), t=tones(mixc(f, 0xfff8e8, 0.4), (3, 5, 6))),
                side=dict(_paint(s, sL, (st[0] + 1.2, st[1], st[2]), off, (_rgb(mixc(s, ch, 0.45)), 0.7), v.get('rough')), t=tones(s, (1, 3, 4))))


class Glyph:
    """Anchor points on one glyph's pixel grid, in letter space (cap height 1, x centred, z up from the baseline)."""
    def __init__(self, g):
        self.r = g['rows']; self.b = g['b']; self.p = g['p']; self.h = len(self.r); self.w = len(self.r[0])
        self.top = [next((y for y in range(self.h) if self.r[y][x] == '1'), None) for x in range(self.w)]
        self.bot = [next((y for y in range(self.h - 1, -1, -1) if self.r[y][x] == '1'), None) for x in range(self.w)]
    def X(self, c): return (c + 0.5 - self.w / 2) * self.p
    def Z(self, r): return (self.b - r) * self.p  # the top edge of row r
    def top_at(self, u):
        """(x, z, run) on the top surface, the highest columns preferred, nearest to u (0 left .. 1 right)."""
        best = min(t for t in self.top if t is not None)
        cs = [c for c, t in enumerate(self.top) if t is not None and t <= best + 1]
        c = min(cs, key=lambda c: abs(c - u * (self.w - 1)))
        run = 0
        while self.top[c] + run < self.h and self.r[self.top[c] + run][c] == '1': run += 1
        return self.X(c), self.Z(self.top[c]), run * self.p
    def bot_at(self, u):
        best = max(t for t in self.bot if t is not None)
        cs = [c for c, t in enumerate(self.bot) if t is not None and t >= best - 1]
        c = min(cs, key=lambda c: abs(c - u * (self.w - 1)))
        return self.X(c), self.Z(self.bot[c] + 1)
    def side_at(self, sg, v):
        """(x, z) on the left (sg -1) or right (sg 1) edge, v up the cap height (0 foot .. 1 top)."""
        cap = min(self.h, self.b); r0 = int(round((1 - v) * (cap - 1)))
        for d in range(cap):
            for r in (r0 - d, r0 + d):
                if 0 <= r < cap and '1' in self.r[r]:
                    row = self.r[r]; c = row.index('1') if sg < 0 else len(row) - 1 - row[::-1].index('1')
                    return (c + (0 if sg < 0 else 1) - self.w / 2) * self.p, (self.b - r - 0.5) * self.p
        return 0.0, 0.5
    def face_pts(self, n, zlo, zhi, rn, block=1):
        """n spread pixel centres on the face between heights zlo and zhi (block: a solid block x block around them)."""
        P = []
        for y in range(self.h):
            for x in range(self.w):
                z = (self.b - y - 0.5) * self.p
                if zlo <= z <= zhi and all(0 <= y + dy < self.h and 0 <= x + dx < self.w and self.r[y + dy][x + dx] == '1'
                                           for dy in range(-(block // 2), block - block // 2) for dx in range(-(block // 2), block - block // 2)):
                    P.append(((x + 0.5 - self.w / 2) * self.p + (0 if block % 2 else -0.5 * self.p), z + (0 if block % 2 else 0.5 * self.p)))
        rn.shuffle(P); out = []
        for q in P:  # spread out
            if all(abs(q[0] - o[0]) + abs(q[1] - o[1]) > 0.22 for o in out): out.append(q)
            if len(out) >= n: break
        return out


TOP = ('spike', 'drip', 'puff', 'rib', 'cactus', 'lure', 'staple', 'antenna', 'horn', 'shide', 'bubble', 'drop')


def plan_bits(L, T, th, rn, small):
    """Puts the theme's sculpted bits on letters (never where a toy sits / pushes), -> skewer specs."""
    sits = {t['at'] for t in T if t['role'] == 'sit'}; sides = {t['at'] for t in T if t['role'] != 'sit'}
    lines = sorted({g['line'] for g in L}); top_line, bot_line = lines[0], lines[-1]
    real = [k for k, g in enumerate(L) if not g['punct']]
    ln = lambda j: [q for q in real if L[q]['line'] == j]
    for b in th.get('bits', []):
        k = b['k']; on = b['on']
        if small == 2 and k not in ('grain', 'rivet', 'stud', 'knot'): continue  # the price: face bits only
        if small and k not in ('grain', 'rivet', 'stud', 'knot', 'claw'): continue  # a call-out: face bits and claws only
        if on == 'first': cand = [ln(top_line)[0], ln(bot_line)[0]]  # an end letter's outer side, never a neighbour's
        elif on == 'last': cand = [ln(bot_line)[-1], ln(top_line)[-1]]
        elif on == 'top': cand = ln(top_line)
        elif on == 'bot': cand = ln(bot_line)
        else: cand = list(real)
        if on != 'all': cand = [q for q in cand if q not in sides and not (k in TOP and q in sits)
                                and not any(x['k'] in TOP for x in L[q].get('bits', []) if k in TOP)
                                and not any(x['k'] == k for x in L[q].get('bits', []))]
        if not cand: continue
        n = len(cand) if on == 'all' else 1 if on in ('first', 'last') else min(b['n'], len(cand))
        if on in ('first', 'last'): pick = cand[:1]
        elif on == 'all': pick = cand
        else:
            st = len(cand) / n; o = rn.uniform(0, st); pick = sorted({cand[min(len(cand) - 1, int(o + st * i))] for i in range(n)})
        for j, q in enumerate(pick):
            G = Glyph(L[q]); d = dict(k=k, paint=_bitpaint(b.get('paint', 'front'), rn))
            if b.get('paint2') is not None: d['paint2'] = _bitpaint(b['paint2'], rn)
            for kk in ('th', 'gap', 'fan', 's'):
                if kk in b: d[kk] = b[kk]
            if k == 'claw':
                sg = -1 if on == 'first' else 1; x, z = G.side_at(sg, 0.55); d.update(x=x, z=z, sg=sg, a=150 if sg < 0 else 30)
            elif k in ('legs', 'flipper'):
                sg = (-1, 1)[(j + (on == 'last')) % 2]; x, _ = G.side_at(sg, 0.06); d.update(x=x - sg * 0.12, z=0.0, sg=sg)
            elif k == 'head': x, z = G.side_at(-1, 0.28); d.update(x=x, z=z, sg=-1)
            elif k == 'tail': x, z = G.side_at(1, 0.22); d.update(x=x, z=z, sg=1)
            elif k == 'key': x, z = G.side_at(1, 0.5); d.update(x=x, z=z, sg=1)
            elif k == 'knot': x, z = G.side_at(-1, 0.04); d.update(x=x + 0.06, z=z, a=205)
            elif k == 'toes': x, z = G.bot_at(rn.choice([0.2, 0.8])); d.update(x=x, z=z)
            elif k == 'spike':
                for u in ((0.25, 0.75) if b.get('per', 1) > 1 and G.w > 9 else (0.5,)):
                    x, z, _ = G.top_at(u); L[q].setdefault('bits', []).append(dict(d, x=x, z=z, lean=rn.uniform(-0.06, 0.06)))
                continue
            elif k == 'drip':
                x, z, run = G.top_at(rn.uniform(0.15, 0.85)); d.update(x=x, z=z, len=max(0.12, min(0.32, run * 0.85)))
            elif k in ('puff', 'rib', 'cactus', 'lure', 'staple', 'antenna', 'horn', 'shide'):
                x, z, _ = G.top_at(rn.uniform(0.3, 0.7)); d.update(x=x, z=z - (0.02 if k == 'shide' else 0))
            elif k == 'bubble':
                x, z, _ = G.top_at(0.5); d['pts'] = [(x + rn.uniform(-0.15, 0.15), z + 0.12), (x + rn.uniform(-0.2, 0.2), z + 0.3)]
            elif k == 'drop':
                d['pts'] = [(rn.uniform(-0.25, 0.25), rn.uniform(0.18, 0.4)), (rn.uniform(-0.25, 0.25), rn.uniform(0.55, 0.7))]
            elif k in ('barnacle', 'stud', 'rivet', 'grain'):
                rng = {'barnacle': (0.06, 0.45), 'stud': (0.35, 0.75), 'rivet': (0.08, 0.95), 'grain': (0.04, 0.26)}[k]
                d['pts'] = G.face_pts({'barnacle': 3, 'stud': 2, 'rivet': 2, 'grain': 4}[k], rng[0], rng[1], rn, block=2 if k in ('barnacle', 'stud') else 1)
                if not d['pts']: continue
            elif k == 'knob':
                pts = G.face_pts(1, 0.25, 0.75, rn, block=4)
                if not pts: continue
                d.update(x=pts[0][0], z=pts[0][1])
            L[q].setdefault('bits', []).append(d)
    sk = th.get('skewer')
    if not sk or small: return []
    return [dict(line=j, paint=_bitpaint(sk['paint'], rn), r=0.035) for j in (lines if sk.get('line') == 'all' else [bot_line])]


def spec(sid, c, items, hero, box, name=None, small=False):
    """The scene spec for one title: letters (glyph rows, size, place, angles, themed paint, sculpted bits) and toys
    (glb, role, letter). c: lines (top to bottom), optional align; items: the series' line-up (empty for a call-out
    or a price: letters only)."""
    name = name or sid; rn = random.Random(name * 3); face = FACE; lines = c['lines']
    th = THEMES.get(sid) or dict(v=[dict(f=c.get('col', 0xc8302a), L=[])])
    V = th['v']; v0 = rn.randrange(len(V)); pick = th.get('pick', 'cycle')
    cap = line_mask('H', face)[2]; p = 1.0 / cap
    L, rows = [], []
    for j, txt in enumerate(lines):
        row = []
        for i, ch in enumerate(txt):
            if ch == ' ': row.append(None); continue
            m, _, b, _ = line_mask(ch, face)
            row.append(dict(ch=ch, rows=[''.join('1' if v else '0' for v in r) for r in m], b=int(b), p=p, w=m.shape[1] * p,
                            punct=not ch.isalnum()))
        rows.append(row)
    n = len(rows); two = n > 1
    # sizes: first letter of each line a step bigger, one more letter a little bigger; the lines balanced in width
    def width(row, s):
        return sum((g['w'] * s * g['k'] + 0.06 * s) if g else 0.58 * s for g in row)
    for j, row in enumerate(rows):  # the big first letter only on the bottom line (a big one on top reads as a stray)
        big = rn.randrange(1, max(2, len(row)))
        for i, g in enumerate(row):
            if g: g['k'] = 1.24 if i == 0 and len(row) > 3 and j == len(rows) - 1 else 1.1 if i == big else 1.0
    sl = [1.0] * n
    if two:
        wb = width(rows[-1], 1); wt = max(width(r, 1) for r in rows[:-1])
        if wt > wb: sl[-1] = min(1.6, (wt / wb) ** 0.6)
        for j in range(n - 1):  # a longer top line may overhang the bottom one a little (its end letters cantilever)
            sl[j] = 0.8 if len(lines[j].strip()) <= 3 and n == 2 else min(1.0, 1.12 * wb * sl[-1] / width(rows[j], 1))
    W2 = width(rows[-1], sl[-1]); bot_line = n - 1
    lean = rn.randrange(len(rows[0])) if two and len(rows[0]) > 3 else -1
    sgn = rn.choice([-1, 1]); al = c.get('align', 'l'); cnt = 0
    for j, row in enumerate(rows):
        s = sl[j]; Wj = width(row, s); top = j < bot_line
        x = (-W2 / 2 + 0.12 * s if al == 'l' else W2 / 2 - Wj - 0.05 if al == 'r' else -Wj / 2) if top else -W2 / 2
        x += rn.uniform(-0.08, 0.08) if top else 0
        for i, g in enumerate(row):
            if not g: x += 0.58 * s; continue
            if g['punct']: x += 0.1 * s  # punctuation stands clear of the word (never hides a letter)
            sk = s * g['k']; w = g['w'] * sk; sgn = -sgn
            tilt = sgn * rn.choice([2, 3, 5, 6]) if not g['punct'] else 0
            if j == 0 and i == lean: tilt = rn.choice([-1, 1]) * 10
            vi = (v0 + cnt) % len(V) if pick == 'cycle' else (v0 + j) % len(V) if pick == 'line' else rn.randrange(len(V)); cnt += 1
            g.update(s=sk, x=x + w / 2, y=(0.05 * (bot_line - j) + rn.uniform(-0.02, 0.04)) if top else (0.08 if i % 2 else 0.0),
                     line=j, depth=0.4, cham=0.026, tilt=tilt, yaw=rn.uniform(-8, 8) if not g['punct'] else 0,
                     pitch=rn.uniform(-4, 5), idx=i, **letter_paint(V[vi], rn))
            nx = row[i + 1] if i + 1 < len(row) else None
            thin = g['w'] < 0.6 or (nx is not None and (nx['punct'] or nx['w'] < 0.6))  # air around I and punctuation
            L.append(g); x += w + (0.12 if thin else 0.06) * s
    # toys: two or three of the series' own figures, each in a different role (never the card's hero)
    pool = [it['id'] for it in items if not it['secret'] and it['id'] != hero and os.path.exists(os.path.join(BUILD, sid, it['id'] + '.glb'))]
    rn.shuffle(pool); hs = min(sl[-1], 1.3)
    top = [k for k, g in enumerate(L) if g['line'] == 0 and not g['punct']]
    bot = [k for k, g in enumerate(L) if g['line'] == bot_line and not g['punct']]
    free = 'l' if al == 'r' else 'r'
    wide = box[0] / box[1] > 2.6  # a wide, short box has room at the ends (push); else the toys go on top / behind / in front
    plans = [[('sit', 'top'), ('peek', free)], [('sit', 'top'), ('hold', 'bot')], [('sit', 'top'), ('push', free)],
             [('sit', 'bot_end'), ('sit', 'top')]]  # one or two big figures, each its own role
    plan = rn.choice(plans) if two else rn.choice([[('sit', 'bot'), ('push', free)], [('sit', 'bot'), ('hold', 'bot')]])
    def aspect(i):  # width / height of the toy's catalogue render: long, low toys stay on the ground
        q = os.path.join(CACHE, 'toys', sid, i + '.png')
        if not os.path.exists(q): return 1.0
        bx = Image.open(q).getchannel('A').getbbox() or (0, 0, 1, 1); return (bx[2] - bx[0]) / max(1, bx[3] - bx[1])
    pool.sort(key=aspect)
    if pool and aspect(pool[0]) > 1.3: plan = [('push', free), ('hold', 'bot')]
    T, used = [], []
    for k, (role, where) in enumerate(plan[:len(pool)]):
        if role == 'sit':
            cand = top if where in ('top', 'top2') and top else bot
            if where == 'bot_end':  # an end letter of the bottom line, only where no top-line letter stands on it
                e = bot[-1] if free == 'r' else bot[0]
                cand = [e] if all(abs(L[e]['x'] - L[q]['x']) > 0.75 for q in top) else top or bot
            cand = [q for q in cand if q not in used and L[q]['idx'] != lean] or cand
            far = lambda q: min([abs(L[q]['x'] - L[u]['x']) for u in used] or [0])  # toys spread out, never stacked
            at = max(cand, key=far) if used else rn.choice(cand)
            h = 1.35 * hs
        elif role in ('push', 'peek'):
            ends = [k for k, g in enumerate(L) if g['line'] == bot_line]  # the true end glyph, punctuation too
            at = (ends[-1] if role == 'push' else bot[-1]) if where == 'r' else (ends[0] if role == 'push' else bot[0])
            h = (1.25 if role == 'push' else 1.45) * hs
            if role == 'push' and not L[at]['punct']: L[at]['tilt'] = (-7 if where == 'r' else 7)
        else:
            at = bot[0] if free == 'r' else bot[-1]; h = 1.1 * hs  # hugging the outer corner of an end letter
        used.append(at)
        yaw = {'push': -62 if where == 'r' else 62, 'peek': -24 if where == 'r' else 24}.get(role, rn.uniform(-25, 25))
        T.append(dict(glb=os.path.join(BUILD, sid, pool[k] + '.glb'), role=role, at=at, h=h, side=where, yaw=yaw,
                      dx=(-0.8 if at == bot[0] else 0.8) if role == 'hold' else rn.uniform(-0.15, 0.15), id=pool[k]))
    sk = plan_bits(L, T, th, rn, small)
    return dict(letters=L, toys=T, box=list(box), skewers=sk, shelf={str(j): 0.98 * sum(sl[j + 1:]) for j in range(n)},
                cam=dict(elev=rn.uniform(13, 18), azim=rn.choice([-1, 1]) * rn.uniform(20, 27), dist=2.3),  # 3/4, low, perspective
                out=os.path.join(OUT, '%s_raw.png' % name), samples=40)


def finish(name, ink=INK):
    """Pixel-snap a render: hard alpha, a clean quantised palette (no gradients), a 1-grid-pixel ink keyline and the
    real cast shadows (ground, backdrop) as a hard ink shadow. -> shots/.art-cache/logo3d/<sid>.png (2x card scale)."""
    a = np.asarray(Image.open(os.path.join(OUT, '%s_raw.png' % name)).convert('RGBA')).astype(np.int32)
    A = a[..., 3]; obj = (A > 140) & (a[..., :3].max(-1) > 8); shd = ~obj & (A > 95)
    q = np.asarray(Image.fromarray(a[..., :3].astype(np.uint8)).quantize(64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
    pad = 10; H, W = obj.shape
    out = np.zeros((H + 2 * pad, W + 2 * pad, 4), np.uint8)
    O = np.zeros(out.shape[:2], bool); O[pad:pad + H, pad:pad + W] = obj
    S = np.zeros_like(O); S[pad:pad + H, pad:pad + W] = shd
    ir = ((ink >> 16) & 255, (ink >> 8) & 255, ink & 255)
    out[S] = ir + (128,)
    out[_dilate(O, 2, 'disc')[2:-2, 2:-2] & ~O] = ir + (255,)  # a 1-grid-pixel ink keyline
    sub = out[pad:pad + H, pad:pad + W]; sub[obj, :3] = q[obj]; sub[obj, 3] = 255
    Image.fromarray(out, 'RGBA').save(os.path.join(OUT, name + '.png'))


def render(jobs):
    """jobs: [(name, sid, cfg, items, hero_id, box_px)] -> renders all in one Blender run, then finishes each."""
    os.makedirs(OUT, exist_ok=True); paths = []
    for name, sid, c, items, hero, box in jobs:
        p = os.path.join(OUT, name + '.json'); json.dump(spec(sid, c, items, hero, box, name, small=2 if name.endswith('_price') else int(name != sid)), open(p, 'w')); paths.append(p)
    subprocess.run([os.path.join(ROOT, 'tools', 'blender.sh'), os.path.join(ROOT, 'art', 'blender', 'logo3d', 'scene.py')] + paths,
                   check=True, stdout=None if os.environ.get('LOGO3D_LOG') else subprocess.DEVNULL, stderr=None if os.environ.get('LOGO3D_LOG') else subprocess.DEVNULL, cwd=ROOT)
    for name, *_ in jobs:
        finish(name)
        for t in (() if os.environ.get('LOGO3D_KEEP') else ('_raw.png', '.json')): os.remove(os.path.join(OUT, name + t))


def box_of(c):
    lx, ly, lw, lh = c['logo']; return (int(2 * lw * 1.2), int(2 * lh * 1.5))


def jobs_for(sid, c, items, hero):
    """Every 3D title on a card: the series logo, the burst call-out, the price."""
    J = [(sid, sid, c, items, hero, box_of(c))]
    if c.get('burst'):
        bx, by, br, bl, bf = c['burst']
        J.append((sid + '_call', sid, dict(lines=list(bl), align='m'), [], None, (int(2 * br * 2.1), int(2 * br * 1.7))))
    J.append((sid + '_price', sid, dict(lines=['%d' % c['_price']], align='m'), [], None, (84, 40)))
    return J


def get(name, sid=None, c=None, items=None, hero=None):
    """A finished 3D title (rendered with the rest of its card's titles on first use, then cached)."""
    p = os.path.join(OUT, name + '.png')
    if not os.path.exists(p) and c is not None:
        try: render([j for j in jobs_for(sid, c, items, hero) if not os.path.exists(os.path.join(OUT, j[0] + '.png'))])
        except Exception as e: print('logo3d: no render for', name, e)
    return Image.open(p).convert('RGBA') if os.path.exists(p) else None


if __name__ == '__main__':
    from card7 import CFG
    L = json.load(open(os.path.join(CACHE, 'toys', 'lineup.json')))
    sids = sys.argv[1].split(',') if len(sys.argv) > 1 else list(CFG)
    def hero(sid):
        c = CFG[sid]
        if c.get('hero_id'): return c['hero_id']
        reg = [i for i in L[sid]['items'] if not i['secret']]
        bulk = lambda i: (np.asarray(Image.open(os.path.join(CACHE, 'toys', sid, i['id'] + '.png')).getchannel('A')) > 100).sum() if os.path.exists(os.path.join(CACHE, 'toys', sid, i['id'] + '.png')) else 0
        return max(reg, key=bulk)['id']
    J = []
    for sid in sids: J += jobs_for(sid, dict(CFG[sid], _price=L[sid]['price']), L[sid]['items'], hero(sid))
    render(J)
    print('logo3d', ','.join(sids))
