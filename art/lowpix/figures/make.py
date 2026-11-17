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
CONV_H = 26  # every model is converted at this height (mm); pack.mjs scales it to the figure's
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
        F = fn()
        files.append(F.write(out))
    return files


_dl_lock = __import__("threading").Lock()


def ensure_source(src):
    """Download a Sketchfab model once (shared cache, polite: one at a time, backing off on 429) and return a local path
    for `lowpix convert` (its own fetch would download again every time)."""
    if not src.startswith("sketchfab:"):
        return src
    import time
    import urllib.error
    os.environ.setdefault("LOWPIX_SKETCHFAB_TOKEN", "proxy-injected")
    sys.path.insert(0, LOWPIX)
    from lowpix.sketchfab import fetch
    uid = src.split(":", 1)[1]
    d = os.path.join(CONV, "src", "sketchfab_" + uid, "sketchfab_" + uid)
    def found():
        for base, _, files in os.walk(d):
            for f in sorted(files):
                if f.lower().endswith((".gltf", ".glb")):
                    return os.path.join(base, f)
        return None
    if found():
        return found()
    with _dl_lock:
        for attempt in range(12):
            if found():
                return found()
            try:
                return fetch(uid, d)
            except urllib.error.HTTPError as e:
                if e.code != 429:
                    raise
                wait = 45 * (attempt + 1)
                print(f"  sketchfab busy (429), waiting {wait}s for {uid}", flush=True)
                time.sleep(wait)
        raise RuntimeError("sketchfab kept refusing " + uid)


def conv_key(m):
    k = {x: m.get(x) for x in ("src", "tris", "style", "atlas", "opts")}
    k["height"] = float(CONV_H)
    return hashlib.sha1(json.dumps(k, sort_keys=True).encode()).hexdigest()[:14]


def convert(m):
    key = conv_key(m)
    out = os.path.join(CONV, key)
    done = glob.glob(os.path.join(out, "*.glb"))
    if done:
        return key, done[0], None
    os.makedirs(out, exist_ok=True)
    # one shared download per source
    sid = m["src"].replace(":", "_").replace("/", "_")
    shared = os.path.join(CONV, "src", sid)
    os.makedirs(shared, exist_ok=True)
    link = os.path.join(out, "_source")
    if not os.path.exists(link):
        os.symlink(shared, link)
    try:
        local = ensure_source(m["src"])
    except Exception as e:  # noqa: BLE001
        return key, None, f"download: {e}"
    cmd = [sys.executable, "-m", "lowpix", "convert", local, "--style", m["style"], "--height", str(CONV_H), "--tris", str(m["tris"]),
           "--atlas", str(m["atlas"]), "-o", out, "--name", key]
    for k, v in (m.get("opts") or {}).items():
        cmd += [f"--{k}"] if v is True else [f"--{k}", str(v)]
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
    jobs = int(os.environ.get("CONV_JOBS", "3"))
    with cf.ThreadPoolExecutor(jobs) as ex:
        for key, glb, err in ex.map(convert, todo.values()):
            print("convert", key, "ok" if glb else "FAILED " + str(err))
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
        subprocess.run([sys.executable, "-m", "lowpix", "batch", *files, "-o", bdir, "-j", jobs], check=True, env=ENV)
    subprocess.run(["node", os.path.join(HERE, "pack.mjs"), BUILD, *args], check=True)


if __name__ == "__main__":
    main()
