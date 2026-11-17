"""Write the toy-figure model credits into CREDITS.md and public/CREDITS.txt (between marker lines), from
art/lowpix/figures/SOURCES.json and the figures' .meta.json files (which figure uses which source).

    python3 art/lowpix/figures/credits.py
"""
import glob
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
BEGIN, END = "<!-- toy figures: begin (art/lowpix/figures/credits.py) -->", "<!-- toy figures: end -->"
LIC = {"by": ("CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"), "cc0": ("CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/"),
       "CC0": ("CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/")}


def main():
    src = json.load(open(os.path.join(HERE, "SOURCES.json")))
    used = {}
    for mp in glob.glob(os.path.join(HERE, "*", "*.meta.json")):
        meta = json.load(open(mp))
        if not os.path.exists(os.path.join(ROOT, "public", "models", "lowpix", "figures", meta["key"] + ".glb")):
            continue
        if any("pos" not in m for m in meta.get("models", [])):
            continue  # (an old-pipeline figure that is not shipped any more)
        for m in meta.get("models", []):
            used.setdefault(m["src"], set()).add(meta["key"])
    md, txt = [], []
    for s in sorted(used, key=lambda k: (src.get(k, {}).get("name") or src.get(k, {}).get("title") or k).lower()):
        a = src.get(s, {})
        name = a.get("name") or a.get("title") or s
        author = a.get("author") or "unknown"
        url = a.get("source") or a.get("url") or ""
        lic, lurl = LIC.get(a.get("licence") or a.get("license") or "by", ("CC BY 4.0", LIC["by"][1]))
        figs = ", ".join(f"`models/lowpix/figures/{k}.glb`" for k in sorted(used[s]))
        md.append(f"- {name} by {author} ({url}), {lic} ({lurl}). Converted with lowpix (pixel-hd), used in {figs}")
        txt.append(f"- {name} by {author}, {lic}: {url} ({', '.join(sorted(used[s]))})")
    head_md = ["## 3D models: toy figures (Sketchfab CC BY / CC0, Poly Haven CC0)", "",
               "Real models (hand-made by their artists, or photogrammetry scans) made small for the capsule toys: converted by",
               "lowpix in one pixel-art finish, cut out / levelled where a scan needed it, with lowpix-modelled street furniture",
               "and clear stands (art/lowpix/figures). No AI-generated models (art/lowpix/figures/AI_CHECK.json).", ""]
    for path, body, head in ((os.path.join(ROOT, "CREDITS.md"), md, head_md),
                             (os.path.join(ROOT, "public", "CREDITS.txt"), txt, ["3D models: toy figures (Sketchfab CC BY / CC0, Poly Haven CC0)", ""])):
        cur = open(path, encoding="utf8").read()
        block = "\n".join([BEGIN] + head + body + [END])
        if BEGIN in cur:
            cur = cur[:cur.index(BEGIN)] + block + cur[cur.index(END) + len(END):]
        else:
            cur = cur.rstrip("\n") + "\n\n" + block + "\n"
        open(path, "w", encoding="utf8").write(cur)
    print(len(md), "sources credited")


if __name__ == "__main__":
    main()
