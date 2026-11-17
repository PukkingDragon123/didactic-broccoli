"""Audit the toy line against the toy rule (CLAUDE.md): one finish, no reskins, no flat or noisy models, full bases.

    python3 art/lowpix/figures/audit.py [series ...]        (default: every series in src/data/series)

Measures the GLBs the game ships (public/models/lowpix/figures, via audit_measure.mjs) and the figure sources
(art/lowpix/figures/<series>/<id>.meta.json), prints a table and writes shots/lowpix/AUDIT.txt. Every check has a
stated threshold and a PASS / FAIL; the exit status is 1 when anything fails.

Checks (the thresholds are the constants below):
  dup      a source model (Sketchfab / Poly Haven id) used by more than one catalogue entry, or twice in one: 0 allowed
  recolor  a model atlas recoloured / tinted outside the game's finish system (meta "recolor", GOLD): 0 allowed
  missing  catalogue entries without a figure, figures without their models, empty models: 0 allowed
  px/mm    texel density, area-weighted over the figure, and per part (parts with >= 3 % of the area)
  flat     share of the subject's texels whose 7x7 neighbourhood is one single colour (an unpainted / white source)
  noise    share of the subject's chart-interior texels with at most one same-coloured neighbour of 8
           (salt-and-pepper speckle)
  fill     subject footprint / base footprint (larger of x, z) and subject height / base size (no empty bases,
           no tiny slivers)
  stand    whether the figure has a base (most must not: they stand on their own feet, bowl or body). Every
           figure must rest stably: its centre of mass (surface centroid) over the polygon of what touches the shelf,
           with a tipping angle >= TIP_MIN degrees. fill applies to figures with a base only
  ai       every Sketchfab source has an "ok" verdict in AI_CHECK.json (ai_check.py: no AI-generated models; the
           model's and its author's metadata, plus a visual check); Poly Haven assets are ok. 0 rejected or unchecked
"""
import glob
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, os.path.join(HERE, "_lib"))
from figlib import DENS  # noqa: E402

OUT = os.path.join(ROOT, "shots", "lowpix", "AUDIT.txt")
CACHE = os.path.join(ROOT, "node_modules", ".cache", "lowpix-audit")

DENSITY = (DENS * 0.9, DENS * 1.1)      # figure px/mm (area-weighted)
PART_DENSITY = (DENS * 0.75, DENS * 1.3)  # each part with >= 3 % of the figure's area
# calibrated on sources converted in the line's finish: a white untextured rice cooker 67 % flat, a good blue
# shorthair 28 % (dark glass 39 %); the speckled nautilus the owner flagged 23.5 % noise, good models 1.5-6 %
FLAT_MAX = 0.45                         # flat share of the subject's texels
NOISE_MAX = 0.08                        # isolated-texel share of the subject's chart-interior texels
FILL_XZ = (0.62, 0.90)                  # subject footprint / base footprint
FILL_H_MIN = 0.40                       # subject height / larger base side
TIP_MIN = 8.0                           # degrees it can lean before it tips over
SAME = 6                                # two texels are "the same colour" when no channel differs by more than this


def catalogue(series):
    src = open(os.path.join(ROOT, "src", "data", "series", series + ".js")).read()
    out = []
    for m in re.finditer(r"\{\s*id:\s*['\"]([^'\"]+)['\"],\s*name:\s*(\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*').*?rarity:\s*'(\w+)'", src):
        out.append((m.group(1), m.group(2)[1:-1], m.group(3)))
    return out


def all_series():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, "src", "data", "series", "*.js"))):
        s = os.path.basename(p)[:-3]
        if s not in ("index", "legacy") and catalogue(s):
            out.append(s)
    return out


def hull(pts):
    pts = sorted(set(map(tuple, pts)))
    if len(pts) < 3:
        return pts
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


def stability(contact, com, min_y):
    """(tip angle in degrees, contact area mm²): how far the figure can lean before its centre of mass leaves the
    polygon of what touches the shelf (negative: it falls over)."""
    import math
    H = hull(contact)
    if len(H) < 3:
        return -90.0, 0.0
    area = 0.5 * abs(sum(H[i][0] * H[i - 1][1] - H[i - 1][0] * H[i][1] for i in range(len(H))))
    cx, cz = com[0], com[2]
    inside = all((H[i][0] - H[i - 1][0]) * (cz - H[i - 1][1]) - (H[i][1] - H[i - 1][1]) * (cx - H[i - 1][0]) >= 0 for i in range(len(H)))
    d = min(abs((H[i][0] - H[i - 1][0]) * (cz - H[i - 1][1]) - (H[i][1] - H[i - 1][1]) * (cx - H[i - 1][0]))
            / max(math.hypot(H[i][0] - H[i - 1][0], H[i][1] - H[i - 1][1]), 1e-9) for i in range(len(H)))
    h = max(com[1] - min_y, 0.1)
    ang = math.degrees(math.atan2(d, h))
    return (ang if inside else -ang), area


def raster(uvtris, W, H):
    im = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(im)
    for t in uvtris:
        dr.polygon([(t[0], t[1]), (t[2], t[3]), (t[4], t[5])], fill=255)
    return np.array(im) > 0


def _win(a, k, fn, fill):
    p = k // 2
    b = np.pad(a, p, constant_values=fill)
    from numpy.lib.stride_tricks import sliding_window_view as sw
    b = fn(sw(b, k, axis=0), axis=-1)
    return fn(sw(b, k, axis=1), axis=-1)


def texel_stats(rgb, mask):
    """(flat share, isolated share) over the masked texels of one atlas."""
    n = int(mask.sum())
    if n == 0:
        return 0.0, 0.0, 0
    rgb = rgb.astype(np.int16)
    L = (rgb[..., 0] * 299 + rgb[..., 1] * 587 + rgb[..., 2] * 114) // 1000
    hi = _win(np.where(mask, L, -999), 7, np.max, -999)
    lo = _win(np.where(mask, L, 999), 7, np.min, 999)
    flat = mask & (hi - lo <= 2)
    H, W = mask.shape
    pad = np.pad(rgb, ((1, 1), (1, 1), (0, 0)), mode="edge")
    pm = np.pad(mask, 1)
    same = np.zeros((H, W), np.int16)
    inn = np.zeros((H, W), np.int16)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nb = pad[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]
            nm = pm[1 + dy:1 + dy + H, 1 + dx:1 + dx + W]
            inn += nm
            same += nm & (np.abs(nb - rgb).max(-1) <= SAME)
    inner = mask & (inn == 8)  # texels inside a chart (their neighbours are the same surface, not another chart)
    iso = inner & (same <= 1)
    ni = max(int(inner.sum()), 1)
    return float(flat.sum()) / n, float(iso.sum()) / ni, n


def measure(keys):
    todo = [k for k in keys]
    if todo:
        subprocess.run(["node", os.path.join(HERE, "audit_measure.mjs"), CACHE, *todo], check=True, cwd=ROOT)
    out = {}
    for k in keys:
        p = os.path.join(CACHE, k, "measure.json")
        out[k] = json.load(open(p)) if os.path.exists(p) else {"key": k, "missing": True}
    return out


def audit(series_list):
    lines, fails = [], []
    man = json.load(open(os.path.join(ROOT, "src", "figures", "lowpix.manifest.json")))
    # ---- sources: duplicates and recolours across the whole line (every series, not only the audited ones)
    uses, recolors = {}, []
    for mp in sorted(glob.glob(os.path.join(HERE, "*", "*.meta.json"))):
        meta = json.load(open(mp))
        key = meta.get("key") or (os.path.basename(os.path.dirname(mp)) + "/" + os.path.basename(mp).split(".")[0])
        s = key.split("/")[0]
        if s not in all_series():
            continue
        ids = {i for i, _, _ in catalogue(s)}
        if key.split("/")[1] not in ids:
            continue  # a retired spec file
        for m in meta.get("models", []):
            uses.setdefault(m["src"], []).append(key)
            if m.get("recolor"):
                recolors.append(f"{key} model {m['name']}")
    for p in glob.glob(os.path.join(HERE, "_src", "*.py")):
        if os.path.basename(p)[:-3] not in series_list:
            continue
        t = open(p).read()
        for ln, row in enumerate(t.splitlines(), 1):
            if re.search(r"recolor\s*=|\bGOLD\b", row) and not row.strip().startswith("#"):
                recolors.append(f"{os.path.relpath(p, ROOT)}:{ln}")
    dups = {s: k for s, k in uses.items() if len(k) > 1}
    aip = os.path.join(HERE, "AI_CHECK.json")
    aichk = json.load(open(aip)) if os.path.exists(aip) else {}

    def ai_verdict(src):
        v = aichk.get(src) if src.startswith("polyhaven:") else aichk.get(src.split(":")[-1])
        return v["verdict"] if v else "unchecked"
    # ---- figures
    keys = []
    for s in series_list:
        keys += [f"{s}/{i}" for i, _, _ in catalogue(s)]
    M = measure(keys)
    rows = []
    for key in keys:
        s, fid = key.split("/")
        mp = os.path.join(HERE, s, fid + ".meta.json")
        meta = json.load(open(mp)) if os.path.exists(mp) else None
        m = M[key]
        bad = []
        if m.get("missing") or key not in man or meta is None:
            rows.append((key, None, ["MISSING figure (no GLB / manifest / spec)"]))
            continue
        parts = m["parts"]
        names = {p["name"]: p for p in parts}
        for mm in meta.get("models", []):
            p = names.get("model_" + mm["name"])
            if not p or p["tris"] < 50:
                bad.append(f"empty model {mm['name']}")
        tex = [p for p in parts if p["uvpx"] > 0 and p["area"] > 0]
        A = sum(p["area"] for p in tex)
        dens = (sum(p["uvpx"] for p in tex) / A) ** 0.5 if A else 0
        off = [f"{p['name']} {(p['uvpx'] / p['area']) ** 0.5:.1f}" for p in tex if p["area"] >= 0.03 * A
               and not PART_DENSITY[0] <= (p["uvpx"] / p["area"]) ** 0.5 <= PART_DENSITY[1]]
        if not DENSITY[0] <= dens <= DENSITY[1]:
            bad.append(f"px/mm {dens:.2f} outside {DENSITY[0]:.1f}-{DENSITY[1]:.1f}")
        if off:
            bad.append("part px/mm off: " + ", ".join(off[:4]))
        # texel stats over the subject (everything but the base)
        base = [p for p in parts if p["name"].startswith("base")]
        subj = [p for p in parts if not p["name"].startswith("base")]
        fl_n = fl_s = no_s = 0
        worst = []
        for ti, (W, H) in enumerate(m["textures"]):
            tris = [t for p in subj for t in p["uvtris"].get(str(ti), [])]
            if not tris:
                continue
            rgb = np.array(Image.open(os.path.join(CACHE, key, f"tex{ti}.png")).convert("RGB"))
            f, n, cnt = texel_stats(rgb, raster(tris, W, H))
            fl_s += f * cnt
            no_s += n * cnt
            fl_n += cnt
            owner = next((p["name"] for p in subj if str(ti) in p["uvtris"]), "?")
            worst.append((owner, f, n))
        flat = fl_s / fl_n if fl_n else 1.0
        noise = no_s / fl_n if fl_n else 0.0
        if flat > FLAT_MAX:
            bad.append(f"flat {flat:.0%} > {FLAT_MAX:.0%} (" + ", ".join(f"{o} {f:.0%}" for o, f, _ in worst if f > FLAT_MAX) + ")")
        if noise > NOISE_MAX:
            bad.append(f"noise {noise:.1%} > {NOISE_MAX:.0%} (" + ", ".join(f"{o} {n:.1%}" for o, _, n in worst if n > NOISE_MAX) + ")")
        # fill
        lo = lambda ps, i: min(p["lo"][i] for p in ps)  # noqa: E731
        hi = lambda ps, i: max(p["hi"][i] for p in ps)  # noqa: E731
        stand = bool(base)
        fxz = fh = None
        if not subj:
            bad.append("no subject")
        elif stand:
            bw, bd = hi(base, 0) - lo(base, 0), hi(base, 2) - lo(base, 2)
            sw, sh, sd = hi(subj, 0) - lo(subj, 0), hi(subj, 1) - max(lo(subj, 1), hi(base, 1)), hi(subj, 2) - lo(subj, 2)
            fxz = max(min(sw, bw) / bw, min(sd, bd) / bd)
            fh = sh / max(bw, bd)
            clear = (meta.get("base") or {}).get("family") == "clear"  # a rod stand: the subject may overhang it
            if not FILL_XZ[0] <= fxz <= (9.9 if clear else FILL_XZ[1]):
                bad.append(f"fill {fxz:.2f} outside {FILL_XZ[0]}-{FILL_XZ[1]}")
            if fh < FILL_H_MIN:
                bad.append(f"height fill {fh:.2f} < {FILL_H_MIN}")
            if not meta.get("stand_why"):
                bad.append("base without a reason (meta stand_why)")
        tip, carea = stability(m.get("contact", []), m.get("com", [0, 0, 0]), m.get("minY", 0))
        if tip < TIP_MIN:
            bad.append(f"unstable: tips at {tip:.0f} deg (contact {carea:.0f} mm2)")
        for src, ks in dups.items():
            if key in ks:
                bad.append(f"dup source {src.split(':')[-1][:8]} ({', '.join(ks)})")
        if meta and any(mm.get("recolor") for mm in meta.get("models", [])):
            bad.append("recolored model")
        for mm in meta.get("models", []):
            v = ai_verdict(mm["src"])
            if v != "ok":
                bad.append(f"source {mm['src'].split(':')[-1][:8]} {v}")
        tris = sum(p["tris"] for p in parts)
        size = man[key]["size"]
        rows.append((key, dict(dens=dens, flat=flat, noise=noise, fxz=fxz, fh=fh, tris=tris, size=size, stand=stand, tip=tip,
                               tex="+".join(f"{w}x{h}" for w, h in m["textures"]), models=len(meta.get("models", []))), bad))
    # ---- report
    lines.append("TOY LINE AUDIT (art/lowpix/figures/audit.py)")
    lines.append(f"series: {', '.join(series_list)}")
    lines.append("thresholds: px/mm %.1f-%.1f (parts %.1f-%.1f) | flat <= %d%% | noise <= %d%% | tip >= %d deg | with a base: fill %.2f-%.2f, height fill >= %.2f | dup 0 | recolor 0 | AI 0 | missing 0"
                 % (DENSITY[0], DENSITY[1], PART_DENSITY[0], PART_DENSITY[1], FLAT_MAX * 100, NOISE_MAX * 100, TIP_MIN, FILL_XZ[0], FILL_XZ[1], FILL_H_MIN))
    lines.append("")
    lines.append(f"{'figure':28} {'px/mm':>6} {'flat':>5} {'noise':>6} {'stand':>5} {'tip':>4} {'fill':>5} {'h':>5} {'tris':>6} {'size mm':>17}  textures       result")
    npass = 0
    for key, r, bad in rows:
        if r is None:
            lines.append(f"{key:28} {'-':>6}  FAIL  " + "; ".join(bad))
            fails.append(key)
            continue
        res = "PASS" if not bad else "FAIL  " + "; ".join(bad)
        npass += not bad
        if bad:
            fails.append(key)
        sz = "x".join(f"{v:.0f}" for v in r["size"])
        fx = f"{r['fxz']:5.2f} {r['fh']:5.2f}" if r["fxz"] is not None else f"{'-':>5} {'-':>5}"
        lines.append(f"{key:28} {r['dens']:6.2f} {r['flat']:5.0%} {r['noise']:6.1%} {'yes' if r['stand'] else 'no':>5} {r['tip']:4.0f} {fx} {r['tris']:6d} {sz:>17}  {r['tex']:14} {res}")
    lines.append("")
    lines.append(f"duplicate sources (whole line): {len(dups)}  {'PASS' if not dups else 'FAIL'}")
    for s, k in dups.items():
        lines.append(f"  {s}: {', '.join(k)}")
    used = sorted(u for u, ks in uses.items() if any(k.split("/")[0] in series_list for k in ks))
    bad_ai = [u for u in used if ai_verdict(u) != "ok"]
    every = sorted(uses)
    lines.append(f"sources used by these series: {len(used)}  AI-check verdicts: ok {len(used) - len(bad_ai)}, rejected/unchecked {len(bad_ai)}  {'PASS' if not bad_ai else 'FAIL'}"
                 f"   (whole line: {sum(ai_verdict(u) != 'ok' for u in every)} of {len(every)} not ok yet)")
    for u in used:
        a = aichk.get(u.split(":")[-1], {})
        why = "; ".join(a.get("reasons", []))[:110]
        lines.append(f"  {ai_verdict(u):11} {u[:46]:46} {(a.get('name') or u.split(':')[-1])[:34]:34} {why}")
    lines.append(f"recolours outside the finish system: {len(recolors)}  {'PASS' if not recolors else 'FAIL'}")
    for r in recolors[:30]:
        lines.append(f"  {r}")
    ns = sum(1 for _, r, _ in rows if r and not r["stand"])
    lines.append(f"figures: {len(rows)}  PASS {npass}  FAIL {len(rows) - npass}   standing on their own: {ns} of {len(rows)}")
    ok = not fails and not dups and not recolors and not bad_ai
    lines.append("RESULT: " + ("ALL PASS" if ok else "FAIL"))
    return lines, ok


def main():
    series = [a for a in sys.argv[1:] if not a.startswith("-")] or all_series()
    lines, ok = audit(series)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
