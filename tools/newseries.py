#!/usr/bin/env python3
"""newseries.py: mass-produce a toy series from one spec file (art/blender/toys/MASS.md).

    python3 -I tools/newseries.py <series>                 run every step not done yet (resumable)
    python3 -I tools/newseries.py <series> --bg            the same in the background (log: shots/series/<series>.log)
    python3 -I tools/newseries.py <series> --only build,card   just those steps;  --force card   redo a step
    python3 -I tools/newseries.py <series> --scenes        a contact sheet of candidate card scene photos (pick one:
                                                           card.scene in series.json)
    python3 -I tools/newseries.py --rebake-card tabigame   re-render toys + logo + card of any series
    python3 -I tools/newseries.py <series> --accept a,b     a lib/parts.py change that does not touch figures a, b: no rebuild

The spec: art/blender/toys/<series>/series.json (names, concept, price, card, title theme, figures with their build
lists: lib/parts.py). Steps, in order:
  scaffold  <id>.py figure scripts from the template (never overwrites one: custom touches stay), the catalogue entry
            src/data/series/<series>.js (generated: name, price, items, gimmick sounds)
  scene     the card's scene photo: card.scene (an Open Images id) or the best match of card.scene_query, credited in
            CREDITS.md and public/CREDITS.txt
  build     make.sh <series> <ids> --faces (only figures whose script / spec changed since their last build), with the
            face close-ups for the audit; pack.mjs registers them in the manifest
  card      the toy renders, the 3D title (tools/logo3d.py, theme from the spec via tools/series_specs.py) and the card
            (tools/bake-cards.py: public/img/print/cards/<series>.webp, shots/clone/card7_<series>.png)
  audit     faces_audit.py (shots/series/<series>_faces.png) and art/lowpix/figures/audit.py (px/mm FAILs are known)
  sheet     the review sheet shots/series/<series>.png (look.mjs line-up + sheet.py, with the card)
State: art/blender/toys/_build/<series>/newseries.json. Temp files are deleted as each step finishes."""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOYS = os.path.join(ROOT, 'art', 'blender', 'toys')
STEPS = ['scaffold', 'scene', 'build', 'card', 'audit', 'sheet']
SEG = os.path.join(ROOT, 'shots', '.art-cache', 'seg')

TEMPLATE = '''"""{jp} {name} (series {sid}, {sname}): {desc}

Gimmick: {gtext}. Built from the series spec ({sid}/series.json, its "build" list) with the parts library
(lib/parts.py, art/blender/toys/MASS.md); this figure's own touches below.

    tools/blender.sh art/blender/toys/{sid}/{id}.py [--preview] [--fold] [--clip] [--fast] [--repaint]
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from parts import *  # noqa: E402,F401,F403

T = build(Toy(__file__))
# ------------------------------------------------------------------ this figure's own touches (custom sculpt, paint, keys)

T.go()
'''


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def sh(cmd, env=None, check=True):
    log('$', cmd if isinstance(cmd, str) else ' '.join(cmd))
    e = dict(os.environ, **(env or {}))
    r = subprocess.run(cmd, shell=isinstance(cmd, str), cwd=ROOT, env=e, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    out = r.stdout.strip()
    if out:
        print('\n'.join(out.splitlines()[-60:]), flush=True)
    if check and r.returncode != 0:
        raise SystemExit('step failed (%d): %s' % (r.returncode, cmd))
    return out


def spec(sid):
    return json.load(open(os.path.join(TOYS, sid, 'series.json')))


def digest(*paths):
    h = hashlib.sha1()
    for p in paths:
        if os.path.exists(p):
            h.update(open(p, 'rb').read())
    return h.hexdigest()[:12]


class State:
    def __init__(s, sid):
        s.p = os.path.join(TOYS, '_build', sid, 'newseries.json')
        os.makedirs(os.path.dirname(s.p), exist_ok=True)
        s.d = json.load(open(s.p)) if os.path.exists(s.p) else {}

    def get(s, k, d=None):
        return s.d.get(k, d)

    def set(s, k, v):
        s.d[k] = v
        json.dump(s.d, open(s.p, 'w'), indent=1)


# ------------------------------------------------------------------ scaffold
def hexint(c):
    return int(c.lstrip('#'), 16)


def jsv(v):
    """A value in the catalogue files' own style: single-quoted strings, unquoted keys, inline."""
    if isinstance(v, str):
        if "'" in v and '"' not in v:
            return '"' + v.replace('\\', '\\\\') + '"'
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, list):
        return '[' + ', '.join(jsv(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{ ' + ', '.join('%s: %s' % (k, jsv(x)) for k, x in v.items()) + ' }'
    raise TypeError(v)


def series_js(J):
    c = J['card']
    L = ['// %s (%s, "%s"): %s' % (J['jp'], J['id'], J['name'], J.get('concept', J['tagline'])),
         '// GENERATED by tools/newseries.py from art/blender/toys/%s/series.json: edit the spec, not this file.' % J['id'],
         '// gimmick.sfx: little sounds timed to the clip, [seconds, sound, opts] (src/game/figureGimmicks.js).',
         'export default {', "  id: %s," % jsv(J['id']), '  order: %d,' % J['order'], '  name: %s,' % jsv(J['name']), '  jp: %s,' % jsv(J['jp']),
         '  tagline: %s,' % jsv(J['tagline']), '  taglineJp: %s,' % jsv(J.get('taglineJp', '')), '  price: %d,' % J['price'],
         '  themes: %s,' % jsv(J.get('themes', [])),
         '  card: %s,' % jsv({k: c[k] for k in ('bg', 'accent', 'text', 'accent2', 'pattern', 'kind') if k in c}),
         '  capsule: { colors: [%s] },' % ', '.join('0x%06x' % hexint(x) for x in J['capsule']), '  items: [']
    for f in J['figures']:
        L += ['    {', "      id: %s, name: %s, jp: %s, rarity: %s," % (jsv(f['id']), jsv(f['name']), jsv(f['jp']), jsv(f['rarity'])),
              '      desc: %s,' % jsv(f['desc'])]
        if f.get('gimmick'):
            L.append('      gimmick: %s,' % jsv(f['gimmick']))
        L.append('    },')
    L += ['  ],', '};', '']
    return '\n'.join(L)


def step_scaffold(sid, J, st):
    for f in J['figures']:
        p = os.path.join(TOYS, sid, f['id'] + '.py')
        if not os.path.exists(p):
            open(p, 'w').write(TEMPLATE.format(jp=f['jp'], name=f['name'], sid=sid, sname=J['name'], desc=f['desc'], id=f['id'],
                                               gtext=f.get('gimmick', {}).get('text', 'press')))
            log('scaffolded', p)
    js = os.path.join(ROOT, 'src', 'data', 'series', sid + '.js')
    open(js, 'w').write(series_js(J))
    log('catalogue', js)


# ------------------------------------------------------------------ scene photo
def used_scenes():
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    import re
    t = open(os.path.join(ROOT, 'tools', 'card7.py')).read()
    m = re.search(r'^SCENE = (\{.*?\})', t, re.M)
    used = set(json.loads(m.group(1)).values()) if m else set()
    for d in os.listdir(TOYS):
        p = os.path.join(TOYS, d, 'series.json')
        if os.path.exists(p):
            s_ = json.load(open(p)).get('card', {}).get('scene')
            if s_:
                used.add(s_)
    return used


def candidates(query, n=12):
    """Open Images (test) photos carrying every label of the query (verified), CC BY 2.0, upright, not used yet."""
    import csv
    names = {r[1].lower(): r[0] for r in csv.reader(open(os.path.join(SEG, 'class-descriptions.csv')))}
    want = [names[q.lower()] for q in query if q.lower() in names]
    if not want:
        return []
    have = {}
    for r in csv.reader(open(os.path.join(SEG, 'test-imagelabels.csv'))):
        if r[2] in want and r[3] == '1':
            have.setdefault(r[0], set()).add(r[2])
    ids = {i for i, s_ in have.items() if len(s_) == len(want)}
    meta = {}
    for r in csv.DictReader(open(os.path.join(SEG, 'test-images-with-rotation.csv'))):
        if r['ImageID'] in ids and 'by/2.0' in r['License'] and r['Rotation'] in ('', '0.0'):
            meta[r['ImageID']] = r
    used = used_scenes()
    out = [meta[i] for i in sorted(meta) if i not in used]
    return out[:n]


def contact(sid, rows):
    from PIL import Image, ImageDraw
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    from printkit import source
    T = 240
    S = Image.new('RGB', (4 * T, ((len(rows) + 3) // 4) * (T + 14)), (236, 230, 216))
    d = ImageDraw.Draw(S)
    for i, r in enumerate(rows):
        im = source('oi:%s@test' % r['ImageID']).convert('RGB')
        im.thumbnail((T, T))
        x, y = (i % 4) * T, (i // 4) * (T + 14)
        S.paste(im, (x, y))
        d.text((x + 2, y + T), r['ImageID'], fill=(30, 30, 30))
    out = os.path.join(ROOT, 'shots', 'series', sid + '_scenes.png')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out)
    log('scene candidates ->', out)


def credit(sid, r):
    line = ('- %s card: "%s" by %s, %s, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), Open Images ID %s (cropped, colour-graded)'
            % (sid, r['Title'], r['Author'], r['OriginalLandingURL'], r['ImageID']))
    for p in (os.path.join(ROOT, 'CREDITS.md'), os.path.join(ROOT, 'public', 'CREDITS.txt')):
        t = open(p).read()
        if r['ImageID'] not in t:
            open(p, 'a').write(('' if t.endswith('\n') else '\n') + line + '\n')
            log('credited', r['ImageID'], 'in', os.path.basename(p))


def step_scene(sid, J, st):
    import csv
    c = J['card']
    iid = c.get('scene')
    if not iid:
        cs = candidates(c.get('scene_query', ['Sky']))
        if not cs:
            log('no scene photo matches', c.get('scene_query'), ': the card uses its bg list')
            return
        iid = cs[0]['ImageID']
        J['card']['scene'] = iid  # pinned in the spec (reproducible; change it after looking at --scenes)
        p = os.path.join(TOYS, sid, 'series.json')
        S = json.load(open(p))
        S['card']['scene'] = iid
        open(p, 'w').write(json.dumps(S, indent=1, ensure_ascii=False) + '\n')
        log('scene picked', iid, '(pinned in series.json card.scene)')
    for r in csv.DictReader(open(os.path.join(SEG, 'test-images-with-rotation.csv'))):
        if r['ImageID'] == iid:
            credit(sid, r)
            break


# ------------------------------------------------------------------ build
def figure_hash(sid, fid):
    J = spec(sid)
    ent = next(f for f in J['figures'] if f['id'] == fid)
    lib = os.path.join(TOYS, 'lib')
    return digest(os.path.join(TOYS, sid, fid + '.py'), os.path.join(lib, 'parts.py')) + hashlib.sha1(
        json.dumps([ent, J.get('defaults')], sort_keys=True).encode()).hexdigest()[:8]


def step_build(sid, J, st):
    built = st.get('built', {})
    todo = [f['id'] for f in J['figures']
            if built.get(f['id']) != figure_hash(sid, f['id']) or not os.path.exists(os.path.join(ROOT, 'public', 'models', 'lowpix', 'figures', sid, f['id'] + '.glb'))]
    if not todo:
        log('build: every figure is up to date')
        return
    fc = os.path.join(TOYS, '_build', sid, 'faces')
    from concurrent.futures import ThreadPoolExecutor
    import threading
    lock = threading.Lock()
    failed = []

    def one(fid):  # (make.sh takes a machine-wide Blender slot; the manifest merge is locked)
        h = figure_hash(sid, fid)
        out = sh(['bash', 'art/blender/toys/make.sh', sid, fid, '--faces'], env={'GG_FACE_CLOSE': fc, 'GG_FACET': '1'}, check=False)
        ok = os.path.exists(os.path.join(ROOT, 'public', 'models', 'lowpix', 'figures', sid, fid + '.glb')) and 'no glb' not in out
        with lock:
            if ok:
                built[fid] = h
                st.set('built', built)
            else:
                failed.append(fid)
        for x in ('_prev.png', '_fold.png'):
            p = os.path.join(TOYS, '_build', sid, fid + x)
            if os.path.exists(p):
                os.remove(p)
    with ThreadPoolExecutor(int(os.environ.get('GG_SERIES_JOBS', 2))) as ex:
        list(ex.map(one, todo))
    if failed:
        raise SystemExit('build failed for: %s' % ', '.join(failed))


# ------------------------------------------------------------------ card
def rebake_card(sid):
    lg = os.path.join(ROOT, 'shots', '.art-cache', 'logo3d')
    if os.path.isdir(lg):
        for f in os.listdir(lg):
            if f == sid + '.png' or f.startswith(sid + '_'):
                os.remove(os.path.join(lg, f))
    sh(['bash', 'art/blender/toys/make.sh', sid, '--card-only'])
    sh(['python3', '-I', 'tools/bake-cards.py', '--card7', sid])


def step_card(sid, J, st):
    rebake_card(sid)


# ------------------------------------------------------------------ audits
def step_audit(sid, J, st):
    out = os.path.join(ROOT, 'shots', 'series')
    os.makedirs(out, exist_ok=True)
    fc = os.path.join(TOYS, '_build', sid, 'faces')
    if os.path.isdir(fc) and os.listdir(fc):
        sh(['python3', '-I', 'art/blender/toys/faces_audit.py', fc, os.path.join(out, sid + '_faces.png'), '--cols', '6'])
    a = sh(['python3', 'art/lowpix/figures/audit.py', sid], check=False)
    rows = [l_ for l_ in a.splitlines() if l_.startswith(sid + '/') and 'FAIL' in l_]
    other = [l_.split()[0] + ': ' + '; '.join(x for x in l_.split('FAIL', 1)[1].split(';') if 'px/mm' not in x).strip() for l_ in rows]
    other = [o for o in other if not o.endswith(': ')]
    log('audit:', 'no FAILs beyond the known px/mm' if not other else 'other FAILs: ' + ' | '.join(other))


# ------------------------------------------------------------------ review sheet
def step_sheet(sid, J, st):
    out = os.path.join(ROOT, 'shots', 'series')
    os.makedirs(out, exist_ok=True)
    looks = os.path.join(out, '_%s_looks.png' % sid)
    sh(['bash', 'tools/slot.sh', 'node', 'art/blender/toys/look.mjs', sid, looks, '--views', 'front,back,t0.4,t0.9,t1.5', '--size', '300'])
    card = os.path.join(ROOT, 'public', 'img', 'print', 'cards', sid + '.webp')
    sh(['python3', '-I', 'art/blender/toys/sheet.py', 'series', sid, looks, os.path.join(out, sid + '.png')] + (['--card', card] if os.path.exists(card) else []))
    os.remove(looks)
    log('review sheet ->', os.path.join(out, sid + '.png'))


def main():
    a = sys.argv[1:]
    if '--rebake-card' in a:
        rebake_card(a[a.index('--rebake-card') + 1])
        return
    sid = a[0]
    if '--bg' in a:
        os.makedirs(os.path.join(ROOT, 'shots', 'series'), exist_ok=True)
        lp = os.path.join(ROOT, 'shots', 'series', sid + '.log')
        args = [x for x in a if x != '--bg']
        p = subprocess.Popen([sys.executable, '-I', os.path.abspath(__file__)] + args, cwd=ROOT, stdout=open(lp, 'a'), stderr=subprocess.STDOUT,
                             start_new_session=True)
        print('running in the background (pid %d), log: %s' % (p.pid, lp))
        return
    J = spec(sid)
    if '--accept' in a:  # (a lib change that does not touch these figures: record them as up to date, no rebuild)
        st = State(sid)
        b = st.get('built', {})
        for fid in a[a.index('--accept') + 1].split(','):
            b[fid] = figure_hash(sid, fid)
        st.set('built', b)
        log('accepted as built:', a[a.index('--accept') + 1])
        return
    if '--scenes' in a:
        contact(sid, candidates(J['card'].get('scene_query', ['Sky'])))
        return
    st = State(sid)
    only = a[a.index('--only') + 1].split(',') if '--only' in a else STEPS
    force = a[a.index('--force') + 1].split(',') if '--force' in a else []
    for name in STEPS:
        if name not in only:
            continue
        key = 'done_' + name
        inp = digest(os.path.join(TOYS, sid, 'series.json'))
        if name in ('card', 'audit', 'sheet'):
            inp += str(st.get('built'))
        if name != 'build' and st.get(key) == inp and name not in force:
            log('skip', name, '(done)')
            continue
        log('==', name)
        globals()['step_' + name](sid, spec(sid), st)
        st.set(key, digest(os.path.join(TOYS, sid, 'series.json')) + (str(st.get('built')) if name in ('card', 'audit', 'sheet') else ''))
    log('== done', sid)


if __name__ == '__main__':
    main()
