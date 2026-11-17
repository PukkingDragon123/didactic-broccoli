"""Make the toy figures: specs + converted real models -> packed GLBs + manifest.

    python3 art/lowpix/figures/make.py <series> [<series> ...]   (or "all"; --only=id1,id2 to rebuild some figures)

1. runs art/lowpix/figures/_src/<series>.py, which writes art/lowpix/figures/<series>/<id>.json (+ .meta.json): the
   lowpix spec of the base, props and anything modelled by hand, and the real models to place on it,
2. converts every real model (Sketchfab / Poly Haven, `lowpix convert`, cached by its options) into
   node_modules/.cache/lowpix-conv/<hash>/ and records its attribution in art/lowpix/figures/SOURCES.json,
3. builds the specs with `lowpix batch` into node_modules/.cache/lowpix-figures/<series>/ (contact.png for review),
4. packs them (pack.mjs): spec + models merged into public/models/lowpix/figures/<series>/<id>.glb, and
   src/figures/lowpix.manifest.json.
Run from the repository root. Needs the lowpix checkout (LOWPIX env, default the read-only clone).
"""
import concurrent.futures as cf
import glob
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(HERE, "_lib"))
LOWPIX = os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles")
BUILD = os.path.join(ROOT, "node_modules", ".cache", "lowpix-figures")
CONV = os.path.join(ROOT, "node_modules", ".cache", "lowpix-conv")
ENV = dict(os.environ, PYTHONPATH=LOWPIX, LOWPIX_SKETCHFAB_TOKEN=os.environ.get("LOWPIX_SKETCHFAB_TOKEN", "proxy-injected"))


def gen(series, only=None):
    spec = importlib.util.spec_from_file_location("src_" + series, os.path.join(HERE, "_src", series + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    out = os.path.join(HERE, series)
    os.makedirs(out, exist_ok=True)
    files = []
    for fid, fn in mod.FIGS.items():
        if only and fid not in only:
            continue
        try:
            F = fn()
        except FileNotFoundError as e:  # NO_DOWNLOAD=1: a source still waiting for its download
            print(f"SKIP {series}/{fid}: {e}", flush=True)
            continue
        files.append(F.write(out))
    return files


from sources import prepare  # noqa: E402
from figlib import CONVERT  # noqa: E402
OPT_OK = {"ramps", "smooth", "chart-angle", "spread"}  # what a figure may change (spread: only to keep black lacquer
# and dark plastics dark); everything else is the line's finish (CONVERT)


def conv_key(m):
    k = {x: m.get(x) for x in ("src", "tris", "opts", "drop", "keep")}
    for x in ("box", "level", "cut"):
        if m.get(x):
            k[x] = m[x]
    k["height"] = round(float(m["height"]), 2)
    k["finish"] = CONVERT
    return hashlib.sha1(json.dumps(k, sort_keys=True).encode()).hexdigest()[:14]


def convert(m):
    key = conv_key(m)
    out = os.path.join(CONV, key)
    done = glob.glob(os.path.join(out, "*.glb"))
    if done:
        return key, done[0], None
    os.makedirs(out, exist_ok=True)
    try:
        local = prepare(m["src"], m.get("drop"), m.get("keep"), m.get("box"), m.get("level"), m.get("cut", 0.0))
    except Exception as e:  # noqa: BLE001
        return key, None, f"download: {e}"
    cmd = [sys.executable, "-m", "lowpix", "convert", local, "--height", str(m["height"]), "--tris", str(m["tris"]),
           "-o", out, "--name", key]
    for k, v in CONVERT.items():
        cmd += [f"--{k}", str(v)]
    for k, v in (m.get("opts") or {}).items():
        assert k in OPT_OK, f"{m['src']}: convert option {k} would change the line's finish"
        cmd += [f"--{k}", str(v)]
    r = subprocess.run(cmd, env=ENV, capture_output=True, text=True, timeout=1800)
    done = glob.glob(os.path.join(out, "*.glb"))
    if not done:
        return key, None, (r.stderr or r.stdout)[-800:]
    return key, done[0], None


def convert_all(spec_files):
    todo = {}
    for f in spec_files:
        mp = f.replace(".json", ".meta.json")
        meta = json.load(open(mp))
        for m in meta.get("models", []):
            m["key"] = conv_key(m)
            todo.setdefault(m["key"], m)
        json.dump(meta, open(mp, "w"), indent=1)
    if not todo:
        return
    jobs = int(os.environ.get("CONV_JOBS", "2"))
    with cf.ThreadPoolExecutor(jobs) as ex:
        for key, glb, err in ex.map(convert, todo.values()):
            print("convert", key, "ok" if glb else "FAILED " + str(err))
    # models that settle on the shelf: the resting turn of the converted mesh, and its new standing position
    import numpy as np
    from sources import rest_matrix, read_obj
    from figlib import _rot
    for f in spec_files:
        mp = f.replace(".json", ".meta.json")
        meta = json.load(open(mp))
        changed = False
        for m in meta.get("models", []):
            objs = glob.glob(os.path.join(CONV, m["key"], "*.obj"))
            if not m.get("rest") or not objs:
                continue
            V, Fc = read_obj(objs[0])
            Rr = rest_matrix(V, Fc, span=float(m['rest']) if not isinstance(m['rest'], bool) else 50.0)
            P = V @ (_rot(m.get("pitch", 0), m.get("yaw", 0), m.get("roll", 0)) @ Rr).T
            lo, hi = P.min(0), P.max(0)
            at = m["at"]
            m["rest_R"] = [[round(x, 6) for x in row] for row in Rr.tolist()]
            m["pos"] = [round(at[0] - (lo[0] + hi[0]) / 2, 3), round(at[1] - lo[1], 3), round(at[2] - (lo[2] + hi[2]) / 2, 3)]
            changed = True
        if changed:
            json.dump(meta, open(mp, "w"), indent=1)
    # attributions
    sp = os.path.join(HERE, "SOURCES.json")
    src = json.load(open(sp)) if os.path.exists(sp) else {}
    for m in todo.values():
        sid = m["src"].replace(":", "_").replace("/", "_")
        a = next((os.path.join(b, "ATTRIBUTION.json") for b, _, fs in os.walk(os.path.join(CONV, "src", sid)) if "ATTRIBUTION.json" in fs), "")
        if a and os.path.exists(a):
            src[m["src"]] = json.load(open(a))
        elif m["src"].startswith("polyhaven:"):
            src[m["src"]] = {"title": m["src"].split(":")[1], "author": "Poly Haven", "license": "CC0", "url": "https://polyhaven.com/a/" + m["src"].split(":")[1]}
    json.dump(dict(sorted(src.items())), open(sp, "w"), indent=1)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    only = None
    for a in sys.argv[1:]:
        if a.startswith("--only="):
            only = set(a.split("=", 1)[1].split(","))
    jobs = os.environ.get("JOBS", "3")
    if args == ["all"]:
        args = sorted(os.path.splitext(os.path.basename(p))[0] for p in glob.glob(os.path.join(HERE, "_src", "*.py")))
    os.chdir(ROOT)
    for s in args:
        files = gen(s, only)
        convert_all(files)
        bdir = os.path.join(BUILD, s)
        os.makedirs(bdir, exist_ok=True)
        # a figure that is only real models (most: they stand on their own) has no spec geometry to build
        spec = [f for f in files if any(p["shape"] != "bone" for p in json.load(open(f))["parts"])]
        run = {"spec": [os.path.basename(f)[:-5] for f in spec], "model": [os.path.basename(f)[:-5] for f in files if f not in spec]}
        json.dump(run, open(os.path.join(bdir, "run.json"), "w"))
        if spec:
            subprocess.run([sys.executable, "-m", "lowpix", "batch", *spec, "-o", bdir, "-j", jobs], check=False, env=ENV)  # (failures are listed; the rest still packs)
    subprocess.run(["node", os.path.join(HERE, "pack.mjs"), BUILD, *args], check=True)


if __name__ == "__main__":
    main()
