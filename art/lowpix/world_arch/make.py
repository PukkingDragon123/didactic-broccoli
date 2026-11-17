"""Make the world architecture and vehicle models (the WORLD agent's lowpix set).

    python3 art/lowpix/world_arch/make.py <id|module> [...]    ("all" = every module in _src/; --no-build = specs only;
                                                               --force = redo cached conversions)

1. runs art/lowpix/world_arch/_src/<module>.py: its `specs()` returns {id: Spec} (art/lowpix/world_arch/_lib/arch.py),
   written to art/lowpix/world_arch/<id>.json (the lowpix specs, authored in metres in the frame the game places them in),
2. builds them with `python3 -m lowpix build` into node_modules/.cache/lowpix-arch/<id>/ (hero + sheet for review are
   copied to art/lowpix/world_arch/out/<id>.png),
3. packs them for the game (pack.mjs): public/models/lowpix/world_arch/<id>.glb, manifest.json, src/kit/lowpixArch.js.
Run from the repository root; wrap in tools/slot.sh on a shared machine. Needs the lowpix checkout (LOWPIX env).
"""
import concurrent.futures as cf
import glob
import json
import importlib.util
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '_lib'))
LOWPIX = os.environ.get('LOWPIX', '/home/user/pukkingdragon123/symmetrical-goggles')
BUILD = os.path.join(ROOT, 'node_modules', '.cache', 'lowpix-arch')
ENV = dict(os.environ, PYTHONPATH=LOWPIX, PYTHONDONTWRITEBYTECODE='1',
           LOWPIX_SKETCHFAB_TOKEN=os.environ.get('LOWPIX_SKETCHFAB_TOKEN', 'proxy-injected'))
FORCE = '--force' in sys.argv


def load(mod):
    spec = importlib.util.spec_from_file_location(mod, os.path.join(HERE, '_src', mod + '.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m.specs()


PX_PER_UNIT = 6  # lowpix pixel-hd: texels per unit, so --height = metres * ppm / 6 gives ppm texels per metre


def build(id):
    out = os.path.join(BUILD, id)
    with open(os.path.join(HERE, id + '.json')) as f:
        spec = json.load(f)
    conv = spec.get('convert')
    if conv:  # a real model (Sketchfab / Poly Haven) converted to the style; cached unless --force
        have = os.path.isdir(out) and any(f.endswith('.glb') for f in os.listdir(out))
        if have and not FORCE:
            return id, 'cached conversion'
        cmd = [sys.executable, '-m', 'lowpix', 'convert', conv['src'], '--style', conv.get('style', 'pixel-hd'), '-o', out,
               '--height', '%.2f' % (spec['game']['fit']['h'] * spec['density'] / PX_PER_UNIT), '--name', id]
        for k in ('tris', 'light', 'detail', 'smooth', 'grain', 'crease', 'spread', 'ramps', 'steps', 'atlas', 'yaw'):
            if conv.get(k) is not None:
                cmd += ['--' + k, str(conv[k])]
        r = subprocess.run(cmd, cwd=LOWPIX, env=ENV, capture_output=True, text=True)
        if r.returncode:
            return id, 'FAILED ' + (r.stderr or r.stdout)[-1500:]
        for f in os.listdir(out):
            if f.endswith('_hero.png'):
                os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
                shutil.copy(os.path.join(out, f), os.path.join(HERE, 'out', id + '.png'))
        return id, 'converted'
    shutil.rmtree(out, ignore_errors=True)
    r = subprocess.run([sys.executable, '-m', 'lowpix', 'build', os.path.join(HERE, id + '.json'), '-o', out],
                       cwd=LOWPIX, env=ENV, capture_output=True, text=True)
    if r.returncode:
        return id, 'FAILED ' + (r.stderr or r.stdout)[-1500:]
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    for f in os.listdir(out):
        if f.endswith('_sheet.png'):
            shutil.copy(os.path.join(out, f), os.path.join(HERE, 'out', id + '.png'))
    line = [l for l in r.stdout.splitlines() if l.startswith('built')]
    warn = [l for l in r.stdout.splitlines() if 'warn' in l.lower()]
    return id, (line[0] if line else 'built') + (' | ' + ' | '.join(warn[:4]) if warn else '')


def main(args):
    no_build = '--no-build' in args
    args = [a for a in args if not a.startswith('--')]
    mods = sorted(os.path.basename(p)[:-3] for p in glob.glob(os.path.join(HERE, '_src', '*.py')))
    want = set(args)
    ids = []
    for mod in mods:
        if 'all' not in want and mod not in want and not any(a.startswith(mod + ':') for a in want):
            # an id inside a module: "module:id"
            continue
        only = {a.split(':', 1)[1] for a in want if a.startswith(mod + ':')}
        for id, S in load(mod).items():
            if only and id not in only:
                continue
            if isinstance(S, dict):  # a conversion: {'convert': {...}, 'game': {...}, 'density': ppm, 'name': ...}
                with open(os.path.join(HERE, id + '.json'), 'w') as f:
                    json.dump({'parts': [], **S}, f, indent=1)
            else:
                S.write(os.path.join(HERE, id + '.json'))
            ids.append(id)
    print('specs:', ' '.join(ids))
    if no_build or not ids:
        return
    ok = []
    with cf.ThreadPoolExecutor(max_workers=int(os.environ.get('JOBS', '3'))) as ex:
        for id, msg in ex.map(build, ids):
            print(id, ':', msg)
            if not msg.startswith('FAILED'):
                ok.append(id)
    if ok:
        subprocess.run(['node', os.path.join(HERE, 'pack.mjs'), BUILD] + ok, cwd=ROOT, check=True)


if __name__ == '__main__':
    main(sys.argv[1:])
