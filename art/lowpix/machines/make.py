"""Make the machines-area models: specs -> lowpix builds -> packed game GLBs.

    python3 art/lowpix/machines/make.py [group|id ...] [--force] [-j N]     (wrap in tools/slot.sh on a shared machine)

1. runs the generators in art/lowpix/machines/_src/*.py (each has build_all() -> {id: Spec}), writing the lowpix spec
   art/lowpix/machines/<id>.json and its game sidecar <id>.meta.json (joints, game materials, stand boxes),
2. builds every changed spec with `python3 -m lowpix build` into node_modules/.cache/lowpix-machines/<id>/ (the
   _sheet.png there is the review image),
3. packs them (pack.mjs): public/models/lowpix/machines/<model>.glb + src/gachakit/lowpix.manifest.json.
Groups: the generator file names (gacha, capsule, ...). Run from anywhere; needs the lowpix checkout (LOWPIX).
"""
import concurrent.futures as cf
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
LOWPIX = os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles")
BUILD = os.path.join(ROOT, "node_modules", ".cache", "lowpix-machines")
ENV = dict(os.environ, PYTHONPATH=LOWPIX, PYTHONDONTWRITEBYTECODE="1")


def generators():
    d = os.path.join(HERE, "_src")
    return sorted(f[:-3] for f in os.listdir(d) if f.endswith(".py") and not f.startswith("_"))


def gen(group):
    spec = importlib.util.spec_from_file_location("src_" + group, os.path.join(HERE, "_src", group + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out = {}
    for sid, S in mod.build_all().items():
        out[sid] = S.write(HERE)
    return out


def build(sid, path, force):
    data = open(path, "rb").read()
    h = hashlib.sha1(data).hexdigest()[:12]
    out = os.path.join(BUILD, sid)
    stamp = os.path.join(out, ".hash")
    if not force and os.path.exists(stamp) and open(stamp).read() == h:
        return sid, "cached", None
    os.makedirs(out, exist_ok=True)
    r = subprocess.run([sys.executable, "-m", "lowpix", "build", path, "-o", out], env=ENV, cwd=ROOT, capture_output=True, text=True, timeout=3600)
    if r.returncode != 0:
        return sid, "FAILED", (r.stdout + r.stderr)[-2500:]
    open(stamp, "w").write(h)
    rep = [f for f in os.listdir(out) if f.endswith("_report.json")]
    warn = json.load(open(os.path.join(out, rep[0]))).get("warnings", []) if rep else []
    return sid, "built", warn


def main():
    argv = sys.argv[1:]
    args = [a for i, a in enumerate(argv) if not a.startswith("-") and not (i and argv[i - 1] == "-j")]
    force = "--force" in sys.argv
    jobs = int(sys.argv[sys.argv.index("-j") + 1]) if "-j" in sys.argv else 3
    groups = generators()
    want_groups = [a for a in args if a in groups] or (groups if not args else [])
    want_ids = set(a for a in args if a not in groups)
    specs = {}
    for g in (groups if want_ids else want_groups):
        for sid, p in gen(g).items():
            if not want_ids or sid in want_ids or any(sid.startswith(w + "_") for w in want_ids):
                specs[sid] = p
    print(f"{len(specs)} specs")
    os.makedirs(BUILD, exist_ok=True)
    with cf.ThreadPoolExecutor(jobs) as ex:
        for sid, state, info in ex.map(lambda kv: build(kv[0], kv[1], force), specs.items()):
            print(f"{state:7s} {sid}" + (f"  warnings: {info[:6]}" if state == "built" and info else ""))
            if state == "FAILED":
                print(info)
    subprocess.run(["node", os.path.join(HERE, "pack.mjs")], check=True, cwd=ROOT)


if __name__ == "__main__":
    main()
