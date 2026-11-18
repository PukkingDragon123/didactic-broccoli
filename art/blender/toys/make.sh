#!/bin/bash
# Build the Blender toy figures and pack them for the game:
#   art/blender/toys/make.sh <series> [<id> ...] [--fast] [--repaint] [--card | --card-only] [--variants | --variants-only]
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
for a in "$@"; do case $a in --card) card=1;; --card-only) card=1; only=1;; --variants) var=1;; --variants-only) var=2;; --*) flags+=("$a");; *) ids+=("$a");; esac; done
[ $only = 1 ] && ids=() || { [ ${#ids[@]} -eq 0 ] && ids=($(ls art/blender/toys/$S/[!_]*.py | xargs -n1 basename | sed 's/\.py$//')); }
# --variants: also repaint each figure's texture variants (src/data/series/<series>.js item.variants with a `texture`,
# GIMMICKS.md "Variants") on the same unwrap: public/models/lowpix/figures/<series>/<id>.<texture>.png;
# --variants-only: just those (the figure's last build stays)
variants() {
  local id=$1 v tex
  node --input-type=module -e "const m = await import('./src/data/series/$S.js'); const it = m.default.items.find((i) => i.id === '$id'); for (const v of it?.variants || []) if (v.texture) console.log(JSON.stringify(v));" | while read -r v; do
    tex=$(node -e "console.log(JSON.parse(process.argv[1]).texture)" "$v")
    echo "== $S/$id variant $tex"
    rm -f art/blender/toys/_build/$S/$id.$tex"_col.png"
    GG_VARIANT="$v" slot tools/blender.sh art/blender/toys/$S/$id.py --repaint 2>&1 | grep -E "^\[|Error|Traceback|error" || true
    [ -f art/blender/toys/_build/$S/$id.$tex"_col.png" ] || { echo "no variant texture for $S/$id $tex"; exit 1; }
    node -e "require('sharp')(process.argv[1]).png({ compressionLevel: 9, effort: 10 }).toFile(process.argv[2]).then((i) => console.log('variant', process.argv[2], Math.round(i.size / 1024) + ' KB'))" \
      art/blender/toys/_build/$S/$id.$tex"_col.png" public/models/lowpix/figures/$S/$id.$tex.png
  done
}
if [ $var = 2 ]; then for id in "${ids[@]}"; do variants "$id"; done; exit 0; fi
for id in "${ids[@]}"; do
  echo "== $S/$id"
  rm -f art/blender/toys/_build/$S/$id.glb
  slot tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
  [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
  # facet (FACET.md): a simple figure should not land far under ~700 tris; one that did is built again with its
  # collapse starting proportionally higher (GG_FACET_RATIO), once
  r=$(python3 -c "import json;m=json.load(open('art/blender/toys/_build/$S/$id.meta.json'));t=m.get('tris',0);print(round(min(0.95,0.6*720/t),3) if m.get('facet') and 0<t<600 and 'GG_FACET_RATIO' not in __import__('os').environ else '')")
  if [ -n "$r" ]; then
    echo "[$S/$id] facet: too few tris, building again with GG_FACET_RATIO=$r"
    rm -f art/blender/toys/_build/$S/$id.glb
    GG_FACET_RATIO=$r slot tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
    [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
  fi
done
[ $only = 1 ] || node art/blender/toys/pack.mjs "$S" "${ids[@]}"
if [ $var = 1 ]; then for id in "${ids[@]}"; do variants "$id"; done; fi
# --card: re-render the series' toys and bake its display card (public/img/print/cards/<series>.webp), serialized
# machine-wide (the toy renders share shots/.art-cache/toys/lineup.json)
if [ $card = 1 ]; then
  flock -w 900 /tmp/gg-cards.lock bash -c "tools/slot.sh node tools/render-toys.mjs $S && python3 -I tools/bake-cards.py $S"
fi
