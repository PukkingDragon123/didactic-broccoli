#!/usr/bin/env python3
"""AI-model check: the owner bans AI-generated models ("never use AI-generated model slop").

Finds every Sketchfab model id the repo uses (art/, src/, CREDITS), fetches its metadata and its author's latest
uploads from the Sketchfab API, and flags:
  REJECT  the model or its author is AI output (Meshy, Tripo, Rodin/Hyper3D, Luma, CSM, Kaedim, "made with AI",
          photo-of-your-pet-to-3D services, mass uploaders of unrelated subjects)
  REVIEW  metadata looks like AI output (one material, dense mesh, 2024+, SEO-style title): look at it yourself
  OK      everything else (hand-made by a person, or a real photogrammetry / LiDAR scan)
Usage: python3 tools/ai-check.py [--only REJECT|REVIEW] > shots/audit/AI_CHECK.txt
Network: api.sketchfab.com (the proxy adds the token). Results are cached in node_modules/.cache/ai-check/.
"""
import json, os, re, subprocess, sys, datetime, concurrent.futures as cf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'ai-check')
os.makedirs(os.path.join(CACHE, 'm'), exist_ok=True); os.makedirs(os.path.join(CACHE, 'u'), exist_ok=True)

AI = re.compile(r'\b(ai[- ]?generated|generated (by|with|using) ai|made with ai|created ?with ?ai|ai[- ]made|meshy|tripo(3d)?|luma ?ai|'
                r'rodin|hyper3d|csm(\.ai)?|kaedim|text[- ]?to[- ]?3d|image[- ]?to[- ]?3d|3d ai studio|rapidassets|'
                r'ai generation|genie|trellis|hunyuan ?3d|ai)\b', re.I)
NOT_AI = re.compile(r'generative AI programs|NoAI|\bno[- ]ai\b|not ai|sitescape', re.I)
SCAN = re.compile(r'photogramm|scan|object ?capture|photocatch|realityscan|polycam|scaniverse|metashape|photoscan|lidar|trnio', re.I)
PET_SERVICE = re.compile(r'photo of your pet|customi[sz]e a 3d model|available for 3d print', re.I)
# Authors the lead checked by hand (their uploads are AI output or AI-based)
KNOWN_AI_AUTHORS = {'qanitaarif0207', 'timmygeorgy', 'stevelamuerte', 'restore50', 'powerengine98', 'rt699448',
                    'notskyzzer001b226802eb469d', 'Areebacat123', 'Nordener', '3DChuang-Ke-Ji', 'Avramania', 'shadowdarkdemon2'}


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 2:
        try: return json.load(open(path))
        except Exception: pass
    out = subprocess.run(['curl', '-sS', '-m', '40', url], capture_output=True, text=True).stdout
    try: d = json.loads(out)
    except Exception: return {}
    json.dump(d, open(path, 'w'))
    return d


def text(m):
    return ' '.join([m.get('name', ''), m.get('description') or '', ' '.join(t['name'] for t in m.get('tags', []))])


def used_ids():
    uses = {}
    pat = re.compile(r'sketchfab[:/][\w/.-]*?([0-9a-f]{32})')
    for base in ['art', 'src', 'public/CREDITS.txt', 'CREDITS.md']:
        p = os.path.join(ROOT, base)
        files = [p] if os.path.isfile(p) else [os.path.join(dp, f) for dp, _, fs in os.walk(p) for f in fs
                                                  if f.endswith(('.json', '.md', '.txt', '.py', '.js', '.mjs'))]
        for f in files:
            try: s = open(f, encoding='utf-8', errors='ignore').read()
            except Exception: continue
            for uid in pat.findall(s): uses.setdefault(uid, set()).add(os.path.relpath(f, ROOT))
    return uses


def verdict(uid):
    m = get(f'https://api.sketchfab.com/v3/models/{uid}', os.path.join(CACHE, 'm', uid + '.json'))
    if not m.get('uid'): return uid, 'REVIEW', 'metadata not found (model removed?)', {}
    user = m['user']['username']
    ups = get(f'https://api.sketchfab.com/v3/search?type=models&user={user}&count=24', os.path.join(CACHE, 'u', user + '.json')).get('results', [])
    t = text(m)
    reasons = []
    if AI.search(t) and not NOT_AI.search(t): reasons.append('model text mentions AI: "' + AI.search(t).group(0) + '"')
    if PET_SERVICE.search(t): reasons.append('photo-to-3D pet service')
    if user in KNOWN_AI_AUTHORS: reasons.append('author checked by hand: AI uploads')
    ai_ups = sum(1 for u in ups if AI.search(text(u)) and not NOT_AI.search(text(u)))
    dates = sorted(u['publishedAt'][:10] for u in ups if u.get('publishedAt'))
    span = (datetime.date.fromisoformat(dates[-1]) - datetime.date.fromisoformat(dates[0])).days if len(dates) > 1 else 999
    scan = bool(SCAN.search(t) or SCAN.search(str(m.get('source', ''))))
    if ai_ups >= 3 and not scan: reasons.append(f'author: {ai_ups}/{len(ups)} recent uploads are AI-tagged')
    if len(ups) >= 20 and span < 15 and not scan: reasons.append(f'mass uploader: {len(ups)} uploads in {span} days')
    if reasons: return uid, 'REJECT', '; '.join(reasons), m
    pub = (m.get('publishedAt') or '')[:4]
    seo = re.search(r'3d model( free)?|game ready|high quality|cute and realistic|realistic .* 3d model', m.get('name', ''), re.I)
    if not scan and pub >= '2024' and m.get('materialCount', 9) <= 1 and m.get('faceCount', 0) > 40000:
        return uid, 'REVIEW', f'one material, {m["faceCount"]} faces, {pub}' + (', SEO title' if seo else '') + ': look at it', m
    if seo and pub >= '2024' and not scan: return uid, 'REVIEW', 'SEO-style title, ' + pub + ': look at it', m
    return uid, 'OK', 'scan' if scan else '', m


def main():
    only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
    uses = used_ids()
    with cf.ThreadPoolExecutor(8) as ex: res = list(ex.map(verdict, sorted(uses)))
    order = {'REJECT': 0, 'REVIEW': 1, 'OK': 2}
    counts = {}
    for _, v, _, _ in res: counts[v] = counts.get(v, 0) + 1
    print(f'AI CHECK {datetime.date.today()}: {len(res)} Sketchfab models used; ' + ', '.join(f'{k}={v}' for k, v in sorted(counts.items(), key=lambda x: order[x[0]])))
    for uid, v, why, m in sorted(res, key=lambda r: (order[r[1]], r[3].get('name', '') if r[3] else '')):
        if only and v != only: continue
        name = (m.get('name') or '?')[:48] if m else '?'
        user = m['user']['username'] if m else '?'
        print(f'{v:6} {uid}  {name!r} by {user}  {why}')
        if v != 'OK':
            for f in sorted(uses[uid])[:6]: print('         used in', f)


if __name__ == '__main__':
    main()
