"""Make the toy figures: specs -> lowpix batch -> packed GLBs + manifest.

    python3 art/lowpix/figures/make.py <series> [<series> ...]   (or "all"; --only id1,id2 to rebuild some figures)

1. runs art/lowpix/figures/_src/<series>.py, which writes art/lowpix/figures/<series>/<id>.json (+ .meta.json),
2. builds them with `lowpix batch` into node_modules/.cache/lowpix-figures/<series>/ (contact.png for review),
3. packs them (pack.mjs) into public/models/lowpix/figures/<series>/<id>.glb and src/figures/lowpix.manifest.json.
Run from the repository root. Needs the lowpix checkout (LOWPIX env, default the read-only clone).
"""
import glob
import importlib.util
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(HERE, "_lib"))
LOWPIX = os.environ.get("LOWPIX", "/home/user/pukkingdragon123/symmetrical-goggles")
BUILD = os.path.join(ROOT, "node_modules", ".cache", "lowpix-figures")


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
    env = dict(os.environ, PYTHONPATH=LOWPIX)
    for s in args:
        files = gen(s, only)
        bdir = os.path.join(BUILD, s)
        subprocess.run([sys.executable, "-m", "lowpix", "batch", *files, "-o", bdir, "-j", jobs], check=True, env=env)
    subprocess.run(["node", os.path.join(HERE, "pack.mjs"), BUILD, *args], check=True)


if __name__ == "__main__":
    main()
