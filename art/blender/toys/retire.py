"""Retire old (lowpix-era) series as the Blender line replaces them:

    python3 art/blender/toys/retire.py <series>[,<series>...] --to <new-series> [--dry]

For each series: its items (id and rarity) go into RETIRED in src/data/series/legacy.js and the series is mapped to
the new series in THEME, so a save that holds them gets a figure of the same rarity from the new series
(migrateLineup); items cut from it earlier are merged in, and capsule-exclusive cosmetics follow it. The series file is then removed, along with its shipped GLBs, its manifest entries (under
flock /tmp/gg-manifest.lock), its card and its rendered toy shots. The art/lowpix/figures/<series> sources stay in
git history only; they are removed too.
"""
import fcntl
import json
import os
import re
import shutil
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
LEG = os.path.join(ROOT, 'src/data/series/legacy.js')
MAN = os.path.join(ROOT, 'src/figures/lowpix.manifest.json')
LETTER = {'common': 'c', 'uncommon': 'u', 'rare': 'r', 'ultra': 'x', 'secret': 's'}


def items_of(sid):
    src = open(os.path.join(ROOT, 'src/data/series', sid + '.js')).read()
    out = {}
    for m in re.finditer(r"\{\s*id:\s*'([^']+)'[^{}]*?rarity:\s*'(\w+)'", src, re.S):
        out[m.group(1)] = LETTER[m.group(2)]
    return out


def main():
    args = sys.argv[1:]
    dry = '--dry' in args
    to = args[args.index('--to') + 1]
    sids = args[0].split(',')
    leg = open(LEG).read()
    for sid in sids:
        p = os.path.join(ROOT, 'src/data/series', sid + '.js')
        if not os.path.exists(p):
            print('no series', sid)
            continue
        its = items_of(sid)
        print(sid, len(its), 'items ->', to)
        a = leg.index('export const RETIRED = {')
        b = leg.index('\n};', a)
        m = re.search(r'(?<![\w.])' + sid + r': \{([^{}]*)\}', leg[a:b])
        if m:  # (some of its items were cut earlier: merge, keeping those)
            old = dict(re.findall(r"(\w+): '(\w)'", m.group(1)))
            its = {**old, **its}
            leg = leg[:a] + leg[a:b][:m.start()] + leg[a:b][m.end():].replace(', ,', ',') + leg[b:]
            leg = re.sub(r'\{\s*,\s*', '{ ', leg)
            leg = re.sub(r'\n  ,\s*', '\n  ', leg)
            leg = re.sub(r',\s*,', ',', leg)
            b = leg.index('\n};', a)
        entry = '  ' + sid + ': { ' + ', '.join(f"{k}: '{v}'" for k, v in its.items()) + ' },\n'
        leg = leg[:b + 1] + entry + leg[b + 1:]
        a = leg.index('const THEME = {')
        b = leg.index('\n};', a)
        if re.search(r'(?<![\w.])' + sid + r": '", leg[a:b]):
            leg = leg[:a] + re.sub(r'(?<![\w.])' + sid + r": '\w+'", f"{sid}: '{to}'", leg[a:b]) + leg[b:]
        else:
            leg = leg[:b + 1] + f"  {sid}: '{to}', // (retired: the Blender line)\n" + leg[b + 1:]
        if dry:
            continue
        os.remove(p)
        for d in (os.path.join(ROOT, 'public/models/lowpix/figures', sid), os.path.join(ROOT, 'art/lowpix/figures', sid),
                  os.path.join(ROOT, 'shots/.art-cache/toys', sid)):
            shutil.rmtree(d, ignore_errors=True)
        for f in (os.path.join(ROOT, 'public/img/print/cards', sid + '.webp'),):
            if os.path.exists(f):
                os.remove(f)
    if dry:
        a = leg.index('export const RETIRED')
        print(leg[a:leg.index('\n};', a) + 3])
        a = leg.index('const THEME = {')
        print('...', leg[leg.index('\n};', a) - 300:leg.index('\n};', a) + 3])
        return
    open(LEG, 'w').write(leg)
    cat = os.path.join(ROOT, 'src/cosmetics/catalog.js')  # (capsule-exclusive cosmetics follow the series' stock)
    src = open(cat).read()
    new = re.sub(r"capsule: '(" + '|'.join(sids) + r")'", f"capsule: '{to}'", src)
    if new != src:
        open(cat, 'w').write(new)
        print('cosmetics: capsule ->', to)
    with open('/tmp/gg-manifest.lock', 'w') as lk:
        fcntl.flock(lk, fcntl.LOCK_EX)
        man = json.load(open(MAN))
        n = len(man)
        man = {k: v for k, v in man.items() if k.split('/')[0] not in sids}
        tmp = MAN + '.retire.tmp'
        open(tmp, 'w').write(json.dumps(dict(sorted(man.items())), separators=(',', ':')).replace('},"', '},\n"') + '\n')
        os.replace(tmp, MAN)
        print('manifest:', n - len(man), 'entries removed')


main()
