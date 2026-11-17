#!/bin/bash
# Build the Blender toy figures and pack them for the game:
#   art/blender/toys/make.sh <series> [<id> ...] [--fast] [--repaint] [--card]
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
for a in "$@"; do case $a in --card) card=1;; --*) flags+=("$a");; *) ids+=("$a");; esac; done
[ ${#ids[@]} -eq 0 ] && ids=($(ls art/blender/toys/$S/*.py | xargs -n1 basename | sed 's/\.py$//'))
for id in "${ids[@]}"; do
  echo "== $S/$id"
  rm -f art/blender/toys/_build/$S/$id.glb
  slot tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
  [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
done
node art/blender/toys/pack.mjs "$S" "${ids[@]}"
# --card: re-render the series' toys and bake its display card (public/img/print/cards/<series>.webp), serialized
# machine-wide (the toy renders share shots/.art-cache/toys/lineup.json)
if [ $card = 1 ]; then
  flock -w 900 /tmp/gg-cards.lock bash -c "tools/slot.sh node tools/render-toys.mjs $S && python3 -I tools/bake-cards.py $S"
fi
