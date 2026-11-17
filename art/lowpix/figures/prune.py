"""Remove shipped figures that are no longer part of the line: GLBs and manifest entries of catalogue entries that
were cut, and of figures still made the old way (recoloured / fitted after conversion: their meta has no "pos"),
which wait for their new source. The game shows its stand-in for those until they are rebuilt.

    python3 art/lowpix/figures/prune.py [--keep=series,series]   (dry run with --dry)
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MAN = os.path.join(ROOT, "src", "figures", "lowpix.manifest.json")


def catalogue_ids(series):
    p = os.path.join(ROOT, "src", "data", "series", series + ".js")
    return set(re.findall(r"\{\s*id:\s*['\"]([^'\"]+)['\"]", open(p).read())) if os.path.exists(p) else set()


def main():
    keep = set()
    for a in sys.argv[1:]:
        if a.startswith("--keep="):
            keep = set(a.split("=", 1)[1].split(","))
    dry = "--dry" in sys.argv
    man = json.load(open(MAN))
    gone = []
    for key in sorted(man):
        s, fid = key.split("/")
        if s in keep:
            continue
        mp = os.path.join(HERE, s, fid + ".meta.json")
        meta = json.load(open(mp)) if os.path.exists(mp) else None
        old = meta is None or any("pos" not in m for m in meta.get("models", []))
        if fid not in catalogue_ids(s) or old:
            gone.append((key, "cut" if fid not in catalogue_ids(s) else "old/unbuilt"))
    for key, why in gone:
        print(("would remove " if dry else "removed ") + key, f"({why})")
        if not dry:
            man.pop(key)
            g = os.path.join(ROOT, "public", "models", "lowpix", "figures", key + ".glb")
            if os.path.exists(g):
                os.remove(g)
            for ext in (".json", ".meta.json"):
                f = os.path.join(HERE, key + ext)
                if os.path.exists(f):
                    os.remove(f)
    if not dry:
        txt = json.dumps(dict(sorted(man.items())), separators=(",", ":")).replace('},"', '},\n"')
        open(MAN, "w").write(txt + "\n")


if __name__ == "__main__":
    main()
