"""No AI-generated model slop (CLAUDE.md toy rule): check every Sketchfab source of the toy line.

    python3 art/lowpix/figures/ai_check.py [uid ...]      (default: every Sketchfab source the figures use or list)

For each model it reads the Sketchfab model page data (name, description, tags, categories, author) and the author's
other uploads, and writes a verdict to art/lowpix/figures/AI_CHECK.json, which audit.py reports (no network there):
  "ok"           hand-made or a real scan, by an author whose uploads are not mostly AI output
  "ai-rejected"  the model or its author's uploads mention an AI generator (the reasons are listed)
Visual rejections (melted, over-smooth forms, mushy paws, plasticky gloss, glossy cartoon eyes, baked lighting
smears) are entered by hand in VISUAL below after looking at the source, and are verdicts too.
Poly Haven assets are made by the Poly Haven team (scans and hand modelling) and are "ok" without a lookup.
"""
import glob
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "AI_CHECK.json")
API = "https://api.sketchfab.com/v3"
AI_WORDS = re.compile(
    r"\bA\.?I\b|\bai[- ]?(generated|made|model|art|assisted)\b|\bgenerated\b|\bgenerative\b|meshy|tripo|\bluma\b|lumalabs|"
    r"\bgenie\b|rodin|hyper3d|\bcsm\b|csm\.ai|kaedim|text[- ]?to[- ]?3d|image[- ]?to[- ]?3d|img2|txt2|3d ?ai ?studio|"
    r"midjourney|stable ?diffusion|dall-?e|hunyuan|trellis|instantmesh|zero123|\bshap-e\b|\bpoint-e\b|sloyd|alpha3d|"
    r"masterpiece ?x|dreamfusion|get3d|neural|nerf|gaussian", re.I)
# Looked at by hand (the source's own viewer / thumbnails and the converted result): visual rejections and notes.
VISUAL = {
    # "uid": ("ai-rejected", "why")  or  ("ok", "note")
}


def get(url):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"Authorization": "Token " + os.environ.get("LOWPIX_SKETCHFAB_TOKEN", "proxy-injected")})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code != 429:
                raise
            time.sleep(30 * (attempt + 1))
    raise RuntimeError("sketchfab busy")


def words(m):
    yield "name", m.get("name") or ""
    yield "description", m.get("description") or ""
    for t in m.get("tags") or []:
        yield "tag", t.get("name") or t.get("slug") or ""
    for c in m.get("categories") or []:
        yield "category", c.get("name") or ""


def hits(m):
    out = []
    for where, text in words(m):
        for mt in AI_WORDS.finditer(text):
            out.append(f"{where}: {mt.group(0)!r}")
    return out


def sources():
    s = set()
    sp = os.path.join(HERE, "SOURCES.json")
    if os.path.exists(sp):
        s |= {k for k in json.load(open(sp)) if k.startswith("sketchfab:")}
    for mp in glob.glob(os.path.join(HERE, "*", "*.meta.json")):
        for m in json.load(open(mp)).get("models", []):
            if m["src"].startswith("sketchfab:"):
                s.add(m["src"])
    for py in glob.glob(os.path.join(HERE, "_src", "*.py")):
        s |= {"sketchfab:" + u for u in re.findall(r"sketchfab:([0-9a-f]{32})", open(py).read())}
    return sorted(u.split(":")[1] for u in s)


def main():
    res = json.load(open(OUT)) if os.path.exists(OUT) else {}
    uids = [a for a in sys.argv[1:] if re.fullmatch(r"[0-9a-f]{32}", a)] or sources()
    authors = {}
    for uid in uids:
        if uid in res and res[uid].get("checked") and uid not in VISUAL and "--force" not in sys.argv:
            continue
        try:
            m = get(f"{API}/models/{uid}")
        except urllib.error.HTTPError as e:
            res[uid] = {"verdict": "ai-rejected", "reasons": [f"model page unavailable ({e.code}): cannot be verified"], "checked": True}
            continue
        user = m.get("user") or {}
        reasons = hits(m)
        uname = user.get("username") or ""
        if uname and uname not in authors:
            time.sleep(1.0)
            try:
                d = get(f"{API}/search?type=models&user={urllib.parse.quote(uname)}&count=24")
                ups = d.get("results", [])
                ai = [u.get("name") for u in ups if hits(u)]
                authors[uname] = (len(ai), len(ups), ai[:4])
            except Exception as e:  # noqa: BLE001
                authors[uname] = (0, 0, [f"author lookup failed: {e}"])
        n_ai, n_all, ex = authors.get(uname, (0, 0, []))
        if n_all and n_ai * 2 >= n_all and n_ai >= 2:
            reasons.append(f"author {uname}: {n_ai} of {n_all} recent uploads mention AI generators ({'; '.join(map(str, ex))})")
        verdict = "ai-rejected" if reasons else "ok"
        if uid in VISUAL:
            verdict = VISUAL[uid][0]
            reasons.append("visual check: " + VISUAL[uid][1])
        res[uid] = {"verdict": verdict, "name": m.get("name"), "author": user.get("displayName") or uname,
                    "author_ai_uploads": f"{n_ai}/{n_all}", "reasons": reasons, "checked": True}
        print(f"{verdict:12} {uid[:8]} {m.get('name')!r} by {uname}  {'; '.join(reasons)[:160]}", flush=True)
        time.sleep(1.0)
    json.dump(dict(sorted(res.items())), open(OUT, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
