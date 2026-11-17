# Writes src/data/propModels.js (which lowpix model draws each voxel prop) from draft.js (the picks) + overrides.json
# (skip / model / id / ry / fit per prop), keeping only models that exist. Run: python3 art/lowpix/world/propmap/activate.py
# write src/data/propModels.js from the draft, keeping only entries whose model exists (and keeping hand edits: ry/fit
# overrides live in OVR below)
import os, re, json
R = '/home/user/didactic-broccoli/'
draft = open(R + 'art/lowpix/world/propmap/draft.js').read()
OVR = json.load(open(R + 'art/lowpix/world/propmap/overrides.json')) if os.path.exists(R + 'art/lowpix/world/propmap/overrides.json') else {}
keep = []
for m in re.finditer(r"  ([a-z0-9_]+): \{ id: 'lowpix/world/([a-z0-9_]+)' \},", draft):
    pid, mid = m.group(1), m.group(2)
    o = OVR.get(pid, {})
    if o.get('skip'): continue
    full = o.get('id') or 'lowpix/world/' + o.get('model', mid)
    if not os.path.exists(R + 'public/models/' + full + '.glb'): continue
    extra = ''.join(f", {k}: {v}" for k, v in o.items() if k in ('ry', 'fit', 'tint'))
    keep.append(f"  {pid}: {{ id: '{full}'{extra} }},")
head = draft.split('export const PROP_MODELS = {')[0]
open(R + 'src/data/propModels.js', 'w').write(head + 'export const PROP_MODELS = {\n' + '\n'.join(keep) + '\n};\n')
print(len(keep))
