"""series_specs.py: the mass-produced series' card and title settings, read from their spec files
(art/blender/toys/<series>/series.json, tools/newseries.py, art/blender/toys/MASS.md) for tools/card7.py (CFG, SCENE,
POOL) and tools/logo3d_themes.py (THEMES). A hand-written entry in those files always wins.

card: layout ('left' | 'right' | 'top': three base layouts, every value overridable: logo, hero, back, front, burst_at,
price_at, caps, kick_at, calls), col, fill, lines, kick, burst (words), burst_col, price ('coin' | 'ticket' | 'tsuba'),
pricecol, hero_id, calls ([text, fx, fy]: a tag pointing at the hero), scene (Open Images id), cutouts (cut-out keys),
sw (line-up swatches).
title: v (letter paints: f, L layers, s, sL, chip, rough; colours as '#rrggbb'), pick, bits (k, on, n, paint, ...)."""
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = 320

LAYOUTS = {
    'left': dict(logo=(6, 6, 186, 92), hero=(234, 208, 132, 156), back=[(290, 68, 56, -12), (34, 190, 46, -8)], front=[(130, 208, 34, 10), (306, 196, 40, 6)],
                 burst_at=(172, 58, 21), price_at=(38, 150), caps=(70, 168), call_at=(232, 136)),
    'right': dict(logo=(124, 6, 192, 92), align='r', hero=(84, 208, 150, 130), back=[(34, 60, 50, 20), (300, 150, 40, 0)],
                  front=[(20, 150, 30, -8), (302, 214, 28, 0)], kick_at=(150, 92), burst_at=(298, 176, 21), price_at=(190, 150), caps=(232, 140), flow=True,
                  call_at=(150, 130)),
    'top': dict(logo=(6, 6, 186, 76), hero=(226, 182, 116, 128), back=[(26, 146, 50, -28), (300, 200, 40, 10)], front=[(132, 182, 32, 18), (308, 190, 24, -12)],
                burst_at=(200, 30, 21), price_at=(294, 26), caps=(246, 54), call_at=(146, 132)),
}


def _hex(v):
    return int(v.lstrip('#'), 16) if isinstance(v, str) and v.startswith('#') else v


def _cols(x):
    if isinstance(x, dict):
        return {k: _cols(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_cols(v) for v in x]
    return _hex(x)


def specs():
    out = {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'art', 'blender', 'toys', '*', 'series.json'))):
        try:
            J = json.load(open(p))
            out[J['id']] = J
        except Exception as e:  # noqa: BLE001
            print('series_specs: skipped', p, e)
    return out


def card(J):
    """(CFG entry, scene id, cut-out pool) for card7."""
    c = J.get('card', {})
    L = dict(LAYOUTS[c.get('layout', 'left')])
    pool = c.get('cutouts', [])
    back = c.get('back') or [(pool[i % len(pool)],) + tuple(L['back'][i]) for i in range(min(2, len(pool)))]
    front = c.get('front') or [(pool[(i + 2) % len(pool)],) + tuple(L['front'][i]) for i in range(min(2, len(pool)))]
    bx, by, br = c.get('burst_at', L['burst_at'])
    cx, cy = c.get('call_at', L['call_at'])
    cfg = dict(col=_hex(c.get('col', '#c8302a')), fill=_hex(c.get('fill', '#f6eedc')), face=c.get('face', 'jersey15'), lines=c.get('lines', [J['name'].upper()]),
               logo=tuple(c.get('logo', L['logo'])), hero_id=c.get('hero_id'), bg=[], back=[tuple(x) for x in back], hero=tuple(c.get('hero', L['hero'])),
               front=[tuple(x) for x in front], kick=c.get('kick', [J['tagline'].upper()]),
               burst=(bx, by, br, tuple(c.get('burst', ['NEW!'])), _hex(c.get('burst_col', '#f2c230'))),
               price=c.get('price', 'coin'), price_at=tuple(c.get('price_at', L['price_at'])), caps=tuple(c.get('caps', L['caps'])),
               calls=[(t, cx, cy + 16 * i, fx, fy) for i, (t, fx, fy) in enumerate(c.get('calls', []))],
               sw=[_hex(x) for x in c.get('sw', [])] or None)
    for k in ('align', 'kick_at', 'flow'):
        if k in c or k in L:
            cfg[k] = tuple(c[k]) if isinstance(c.get(k), list) else c.get(k, L.get(k))
    if c.get('pricecol'):
        cfg['pricecol'] = _hex(c['pricecol'])
    if c.get('space'):
        cfg['space'] = c['space']
    if not cfg['sw']:
        del cfg['sw']
    if not cfg['hero_id']:
        del cfg['hero_id']
    return cfg, c.get('scene'), pool


def cards():
    return {sid: card(J) for sid, J in specs().items() if J.get('card')}


def themes():
    out = {}
    for sid, J in specs().items():
        t = J.get('title')
        if t:
            th = _cols(t)
            for v in th.get('v', []):
                v.setdefault('L', [])
                for Ly in v['L'] + v.get('sL', []):
                    for k in ('p', 'ax'):
                        if isinstance(Ly.get(k), list):
                            Ly[k] = tuple(Ly[k])
            out[sid] = th
    return out
