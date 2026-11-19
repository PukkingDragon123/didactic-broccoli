#!/bin/bash
# Build the Blender toy figures and pack them for the game:
#   art/blender/toys/make.sh <series> [<id> ...] [--fast] [--repaint] [--card | --card-only] [--faces | --faces-only]
#   art/blender/toys/make.sh all --faces-only     every series: each figure's alternate-face texture (figure variants)
# Each figure script (art/blender/toys/<series>/<id>.py) models, bakes, paints, rigs and exports its GLB into
# art/blender/toys/_build/<series>/; pack.mjs then writes public/models/lowpix/figures/<series>/<id>.glb and the
# figure's entry in src/figures/lowpix.manifest.json. Run from the repository root.
# Safe to run for different series at the same time (several agents): Blender runs take one of GG_BLENDER_SLOTS
# (default 2) machine-wide slots, and the manifest merge happens under flock /tmp/gg-manifest.lock, touching only
# <series>' entries.
set -e
slot() { # run "$@" in a free Blender slot (waits for one)
  local N=${GG_BLENDER_SLOTS:-2} i fd
  while true; do
    for i in $(seq 1 "$N"); do
      exec {fd}>"/tmp/gg-blender-$i.lock"
      if flock -n "$fd"; then nice -n 5 "$@"; local r=$?; exec {fd}>&-; return $r; fi
      exec {fd}>&-
    done
    sleep 3
  done
}
cd "$(dirname "$0")/../../.."
S=$1; shift
ids=(); flags=()
card=0
only=0
var=0
for a in "$@"; do case $a in --card) card=1;; --card-only) card=1; only=1;; --faces) var=1;; --faces-only) var=2;; --*) flags+=("$a");; *) ids+=("$a");; esac; done
if [ "$S" = all ] && [ $var = 2 ]; then
  for d in art/blender/toys/*/; do s=$(basename "$d"); [ -f src/data/series/$s.js ] && [[ $s != _* && $s != lib ]] || continue
    "$0" "$s" --faces-only; done
  exit 0
fi
[ $only = 1 ] && ids=() || { [ ${#ids[@]} -eq 0 ] && ids=($(ls art/blender/toys/$S/[!_]*.py | xargs -n1 basename | sed 's/\.py$//')); }
# --faces: also paint each figure's alternate face (GIMMICKS.md "Variants": an expression picked per figure from the
# face kit) on the same unwrap: public/models/lowpix/figures/<series>/<id>.face.png, listed (with the expression) in
# src/figures/variants.manifest.json; --faces-only: just those (the figure's last build stays). A repaint that
# changes nothing (a face not drawn with lib/face.py) or does not match the GLB's atlas (stale unwrap) is dropped.
faces() {
  local id=$1 out=art/blender/toys/_build/$S/$id.face_col.png log
  echo "== $S/$id face"
  rm -f "$out"
  local rf=art/blender/toys/_build/$S/$id.ratio  # (the collapse start its shipped build used: the same mesh, the same UVs)
  log=$( ( [ -f $rf ] && export GG_FACET_RATIO=$(cat $rf); GG_VARIANT='{"texture":"face","face":"auto"}' slot tools/blender.sh art/blender/toys/$S/$id.py --repaint 2>&1 ) | grep -E "^\[|Error|Traceback|error" || true)
  echo "$log" | grep -E "variant face|Error|Traceback" || true
  [ -f "$out" ] || { echo "no face texture for $S/$id"; return 0; }
  python3 -I - "$out" art/blender/toys/_build/$S/${id}_col.png "public/models/lowpix/figures/$S/$id.face.png" "$S/$id" "$(echo "$log" | sed -n 's/.*variant face //p' | head -1)" <<'PY'
import json, os, shutil, subprocess, sys, fcntl
import numpy as np
from PIL import Image
new, base, dst, key, expr = sys.argv[1:6]
a, b = (np.asarray(Image.open(p).convert('RGB')).astype(int) for p in (new, base))
diff = float((np.abs(a - b).sum(2) > 24).mean()) if a.shape == b.shape else 1.0
man = 'src/figures/variants.manifest.json'
with open('/tmp/gg-variants.lock', 'w') as lk:
    fcntl.flock(lk, fcntl.LOCK_EX)
    m = json.load(open(man)) if os.path.exists(man) else {}
    if 1e-5 < diff < 0.03 and expr:
        Image.open(new).save(dst, optimize=True)
        m[key] = expr
        print('face', key, expr, f'{diff:.4%} changed ->', dst)
    else:
        m.pop(key, None)
        if os.path.exists(dst): os.remove(dst)
        print('face', key, 'dropped', f'({diff:.4%} changed)')
    open(man, 'w').write(json.dumps(dict(sorted(m.items())), indent=0) + '\n')
PY
}
if [ $var = 2 ]; then for id in "${ids[@]}"; do faces "$id"; done; exit 0; fi
for id in "${ids[@]}"; do
  echo "== $S/$id"
  rm -f art/blender/toys/_build/$S/$id.glb
  rf=art/blender/toys/_build/$S/$id.ratio
  if [ -f $rf ] && [ -z "$GG_FACET_RATIO" ]; then  # (built again with the collapse start it shipped with)
    GG_FACET_RATIO=$(cat $rf) slot tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
    [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
    continue
  fi
  slot tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
  [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
  # facet (FACET.md): a simple figure should not land far under ~1000 tris; one that did is built again with its
  # collapse starting proportionally higher (GG_FACET_RATIO), once
  r=$(python3 -c "import json;m=json.load(open('art/blender/toys/_build/$S/$id.meta.json'));t=m.get('tris',0);print(round(min(1.3,0.6*1080/t),3) if m.get('facet') and 0<t<860 and 'GG_FACET_RATIO' not in __import__('os').environ else '')")
  if [ -n "$r" ]; then
    echo "[$S/$id] facet: too few tris, building again with GG_FACET_RATIO=$r"
    rm -f art/blender/toys/_build/$S/$id.glb
    GG_FACET_RATIO=$r slot tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
    echo $r > $rf
    [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
  fi
done
[ $only = 1 ] || node art/blender/toys/pack.mjs "$S" "${ids[@]}"
if [ $var = 1 ]; then for id in "${ids[@]}"; do faces "$id"; done; fi
# --card: re-render the series' toys and bake its display card (public/img/print/cards/<series>.webp), serialized
# machine-wide (the toy renders share shots/.art-cache/toys/lineup.json)
if [ $card = 1 ]; then
  flock -w 900 /tmp/gg-cards.lock bash -c "tools/slot.sh node tools/render-toys.mjs $S && python3 -I tools/bake-cards.py $S"
fi
