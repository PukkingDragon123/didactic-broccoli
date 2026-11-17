"""No AI-generated model slop (CLAUDE.md toy rule): the verdict on every Sketchfab source of the toy line.

    python3 art/lowpix/figures/ai_check.py [uid ...]      (default: every Sketchfab source the figure scripts name)

The metadata verdict is the project's own check (tools/ai-check.py: the model's name, description and tags, its
author's recent uploads, known AI uploaders and photo-to-3D pet services, mass uploaders); a REVIEW there needs a look
by eye, entered in VISUAL below, as does anything that looks AI-made whatever its metadata says (melted over-smooth
forms, mushy paws, plasticky gloss, big glossy cartoon eyes, smeared baked lighting). The result goes to
art/lowpix/figures/AI_CHECK.json, which audit.py reports (no network there):
  "ok"           hand-made by a real artist, or a real photogrammetry / LiDAR scan, and looked at
  "ai-rejected"  AI output, an AI uploader, or the AI look (the reasons are listed)
  "review"       not decided yet: counts as a failure in the audit
Poly Haven assets are made by the Poly Haven team (scans and hand modelling) and are "ok" without a lookup.
"""
import glob
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
OUT = os.path.join(HERE, "AI_CHECK.json")

# Looked at by eye (the Sketchfab viewer / thumbnails and the lowpix conversion). uid -> (verdict, note)
VISUAL = {
    "6d82596b5db94f7b9093814a4a88caa9": ("ai-rejected", "Bengal Cat: one material, ~100k faces, 2026; smooth melted paws and face, painted-on stripes"),
    "e4dffd0f67204f84a2595dd2d249f451": ("ai-rejected", "Vintage Electric Fan: melted blob base and stand, smeared cage"),
    "51f498df96c049cbb9e600b0a88c5838": ("ai-rejected", "Realistic Terrier Dog: SEO title 2026, over-smooth body"),
    "7afb2c8ef92c40819abc690584e6772a": ("ai-rejected", "corgi dog: one material, ~100k faces, mushy legs"),
    "e5b5085369674ed28354d2a08f027d91": ("ai-rejected", "Nautilus: one material, 229k faces, speckled smeared texture"),
    "2b7eba3fc9aa4cdc8f62d5c2c20c6419": ("ai-rejected", "Animated Frilled Shark: one material, 2026, over-smooth"),
    "991ad2e0a9fc44b18ad6fb91e8e714fc": ("ai-rejected", "Dark Giant Robot Golem: one material, 2026, melted detail"),
}


def tool():
    spec = importlib.util.spec_from_file_location("ai_check_tool", os.path.join(ROOT, "tools", "ai-check.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def sources():
    s = set()
    for py in glob.glob(os.path.join(HERE, "_src", "*.py")):
        s |= set(re.findall(r"sketchfab:([0-9a-f]{32})", open(py).read()))
    for mp in glob.glob(os.path.join(HERE, "*", "*.meta.json")):
        for m in json.load(open(mp)).get("models", []):
            if m["src"].startswith("sketchfab:"):
                s.add(m["src"].split(":")[1])
    return sorted(s)


def main():
    res = json.load(open(OUT)) if os.path.exists(OUT) else {}
    uids = [a for a in sys.argv[1:] if re.fullmatch(r"[0-9a-f]{32}", a)] or sources()
    T = tool()
    for uid in uids:
        _, v, why, m = T.verdict(uid)
        verdict = {"OK": "ok", "REJECT": "ai-rejected", "REVIEW": "review"}[v]
        reasons = [why] if why else []
        if uid in VISUAL and verdict != "ai-rejected":
            verdict = VISUAL[uid][0]
            reasons.append("by eye: " + VISUAL[uid][1])
        elif uid in VISUAL:
            reasons.append("by eye: " + VISUAL[uid][1])
        res[uid] = {"verdict": verdict, "name": (m or {}).get("name"), "author": ((m or {}).get("user") or {}).get("username"),
                    "reasons": reasons}
        print(f"{verdict:12} {uid[:8]} {res[uid]['name']!r} by {res[uid]['author']}  {'; '.join(reasons)[:150]}", flush=True)
    json.dump(dict(sorted(res.items())), open(OUT, "w"), indent=1, ensure_ascii=False)


if __name__ == "__main__":
    main()
