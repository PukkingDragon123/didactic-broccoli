"""logo3d.py: the gacha cards' 3D hand-painted title logos (the owner's direction: real 3D lettering, hand-painted like
the toys, interactive with the series' own figures). The title's pixel-font glyphs (tools/pixprint.py, the card's own
face) become chunky extruded blocks in one Blender scene (art/blender/logo3d/scene.py): every letter tilted, bounced
and turned its own way, the top line stacked on the bottom line, letters leaning on each other, two or three of the
series' toys sitting on / peeking behind / pushing / holding letters, lit by the toy key light with real contact
shadows. Painted per letter in the series' colours (brush-stroke bands, a lighter facet rim, a painted side colour,
chipped wear); then pixel-snapped here: hard alpha, a clean quantised palette, a 1-grid-pixel ink keyline and a hard
ink ground shadow, at the card's 2x scale. No glow, gradient, chrome or bevel presets.
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


def _rgb8(c): return ((c >> 16) & 255, (c >> 8) & 255, c & 255)


def _rgb(c): return ((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255


def tones(c, ix=(2, 3, 5)):
    r = ramp(_rgb(c), n=7)
    b = np.array(_rgb(c))
    return [tuple(float(v) for v in (b if i == 3 else (b * 0.4 + r[i] * 0.6) if i == 2 else r[i])) for i in ix]


def _runs(m): return [int(np.sum(r[1:] & ~r[:-1]) + r[0]) for r in m]


def _dist(a, b): return sum(abs(x - y) for x, y in zip(_rgb(a), _rgb(b)))


def spec(sid, c, items, hero, box, name=None):
    """The scene spec for one title: letters (glyph rows, size, place, angles, paint) and toys (glb, role, letter).
    c: face, lines (top to bottom), col (side colour), fill (face colour), optional pop / burst / align; items: the
    series' line-up (empty for a call-out or a price: letters only)."""
    name = name or sid; rn = random.Random(name * 3); face = c['face']; lines = c['lines']
    col, fill = c['col'], c['fill']
    pop = c.get('pop') or (c['burst'][4] if c.get('burst') else GOLD)
    if pop != fill and (_dist(pop, col) < 0.5 or _dist(pop, fill) < 0.35): pop = GOLD if _dist(GOLD, fill) > 0.35 else YEL
    side = col if lum(col) < 0.5 else deep(col, 0.45)
    cap = line_mask('H', face)[2]; p = 1.0 / cap
    scheme = rn.choice(['alt', 'line', 'first'])
    L, rows = [], []
    for j, txt in enumerate(lines):
        row = []
        for i, ch in enumerate(txt):
            if ch == ' ': row.append(None); continue
            m, _, b, _ = line_mask(ch, face)
            if cap >= 10 and ch.isalnum():  # a step bolder, but never where it would close a counter (W, M, N stay open)
                mb, _, bb_, _ = line_mask(ch, face, bold=1)
                if all(x >= y for x, y in zip(_runs(mb), _runs(m))): m, b = mb, bb_
            row.append(dict(ch=ch, rows=[''.join('1' if v else '0' for v in r) for r in m], b=int(b), p=p, w=m.shape[1] * p,
                            punct=not ch.isalnum()))
        rows.append(row)
    n = len(rows); two = n > 1
    # sizes: first letter of each line a step bigger, one more letter a little bigger; the lines balanced in width
    def width(row, s):
        return sum((g['w'] * s * g['k'] + 0.03 * s) if g else 0.34 * s for g in row)
    for row in rows:
        big = rn.randrange(1, max(2, len(row)))
        for i, g in enumerate(row):
            if g: g['k'] = 1.24 if i == 0 and len(row) > 3 else 1.1 if i == big else 1.0
    sl = [1.0] * n
    if two:
        wb = width(rows[-1], 1); wt = max(width(r, 1) for r in rows[:-1])
        if wt > wb: sl[-1] = min(1.6, (wt / wb) ** 0.6)
        for j in range(n - 1):  # a longer top line may overhang the bottom one a little (its end letters cantilever)
            sl[j] = 0.8 if len(lines[j].strip()) <= 3 and n == 2 else min(1.0, 1.12 * wb * sl[-1] / width(rows[j], 1))
    W2 = width(rows[-1], sl[-1]); bot_line = n - 1
    lean = rn.randrange(len(rows[0])) if two and len(rows[0]) > 3 else -1
    sgn = rn.choice([-1, 1]); al = c.get('align', 'l')
    for j, row in enumerate(rows):
        s = sl[j]; Wj = width(row, s); top = j < bot_line
        x = (-W2 / 2 + 0.12 * s if al == 'l' else W2 / 2 - Wj - 0.05 if al == 'r' else -Wj / 2) if top else -W2 / 2
        x += rn.uniform(-0.08, 0.08) if top else 0
        for i, g in enumerate(row):
            if not g: x += 0.34 * s; continue
            sk = s * g['k']; w = g['w'] * sk; sgn = -sgn
            tilt = sgn * rn.choice([2, 3, 5, 6]) if not g['punct'] else 0
            if j == 0 and i == lean: tilt = rn.choice([-1, 1]) * 10
            fc = (pop if i % 2 else fill) if scheme == 'alt' else (pop if top else fill) if scheme == 'line' else (pop if i == 0 else fill)
            fc = mixc(fc, 0xffffff if rn.random() < 0.5 else 0x000000, rn.uniform(0.0, 0.06))  # each letter its own pot
            sd = mixc(deep(fc, 0.5), side, 0.3)  # the extruded side: a darker shade of the face, toward the series colour
            g.update(s=sk, x=x + w / 2, y=(0.05 * (bot_line - j) + rn.uniform(-0.02, 0.04)) if top else (0.15 if i % 2 else 0.0),
                     line=j, depth=0.4, cham=min(0.22 * p, 0.035), tilt=tilt, yaw=rn.uniform(-8, 8) if not g['punct'] else 0,
                     pitch=rn.uniform(-4, 5), front=tones(fc), rim=tones(mixc(fc, 0xfff8e8, 0.45), (3, 5, 6)), side=tones(sd, (1, 3, 4)),
                     chip_f=_rgb(mixc(fc, 0xf4ecdc, 0.55)), chip_r=_rgb(deep(sd, 0.5)), chip_s=_rgb(mixc(sd, 0xf4ecdc, 0.45)),
                     stroke=(rn.uniform(-1.4, 1.4), rn.uniform(2.6, 4.0), rn.uniform(0.7, 1.0)), idx=i)
            L.append(g); x += w + 0.03 * s
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
            at = bot[-1] if where == 'r' else bot[0]; h = (1.25 if role == 'push' else 1.45) * hs
            if role == 'push': L[at]['tilt'] = (-12 if where == 'r' else 12)
        else:
            at = bot[0] if free == 'r' else bot[-1]; h = 1.1 * hs  # hugging the outer corner of an end letter
        used.append(at)
        yaw = {'push': -62 if where == 'r' else 62, 'peek': -24 if where == 'r' else 24}.get(role, rn.uniform(-25, 25))
        T.append(dict(glb=os.path.join(BUILD, sid, pool[k] + '.glb'), role=role, at=at, h=h, side=where, yaw=yaw,
                      dx=(-0.48 if at == bot[0] else 0.48) if role == 'hold' else rn.uniform(-0.15, 0.15), id=pool[k]))
    return dict(letters=L, toys=T, box=list(box), shelf={str(j): 0.98 * sum(sl[j + 1:]) for j in range(n)},
                cam=dict(elev=rn.uniform(13, 18), azim=rn.choice([-1, 1]) * rn.uniform(20, 27), dist=2.3),  # 3/4, low, perspective
                out=os.path.join(OUT, '%s_raw.png' % name), samples=40)


def finish(name, ink=INK):
    """Pixel-snap a render: hard alpha, a clean quantised palette (no gradients), a 1-grid-pixel ink keyline and the
    real cast shadows (ground, backdrop) as a hard ink shadow. -> shots/.art-cache/logo3d/<sid>.png (2x card scale)."""
    a = np.asarray(Image.open(os.path.join(OUT, '%s_raw.png' % name)).convert('RGBA')).astype(np.int32)
    A = a[..., 3]; obj = (A > 140) & (a[..., :3].max(-1) > 8); shd = ~obj & (A > 95)
    q = np.asarray(Image.fromarray(a[..., :3].astype(np.uint8)).quantize(56, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB'))
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
        p = os.path.join(OUT, name + '.json'); json.dump(spec(sid, c, items, hero, box, name), open(p, 'w')); paths.append(p)
    subprocess.run([os.path.join(ROOT, 'tools', 'blender.sh'), os.path.join(ROOT, 'art', 'blender', 'logo3d', 'scene.py')] + paths,
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=ROOT)
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
        J.append((sid + '_call', sid, dict(face=c['face'], lines=list(bl), col=c['col'] if _dist(c['col'], bf) > 0.6 else INK,
                  fill=bf, pop=bf, align='m'), [], None, (int(2 * br * 2.1), int(2 * br * 1.7))))
    J.append((sid + '_price', sid, dict(face='b5', lines=['%d' % c['_price']], col=c['col'], fill=0xf6eedb if lum(c['col']) < 0.6 else 0x2a2420,
              pop=0xf6eedb if lum(c['col']) < 0.6 else 0x2a2420, align='m'), [], None, (84, 40)))
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
