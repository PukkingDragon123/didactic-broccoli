#!/bin/bash
# Build the Blender toy figures and pack them for the game:
#   art/blender/toys/make.sh <series> [<id> ...] [--fast] [--repaint]
# Each figure script (art/blender/toys/<series>/<id>.py) models, bakes, paints, rigs and exports its GLB into
# art/blender/toys/_build/<series>/; pack.mjs then writes public/models/lowpix/figures/<series>/<id>.glb and the
# figure's entry in src/figures/lowpix.manifest.json. Run from the repository root.
set -e
cd "$(dirname "$0")/../../.."
S=$1; shift
ids=(); flags=()
for a in "$@"; do case $a in --*) flags+=("$a");; *) ids+=("$a");; esac; done
[ ${#ids[@]} -eq 0 ] && ids=($(ls art/blender/toys/$S/*.py | xargs -n1 basename | sed 's/\.py$//'))
for id in "${ids[@]}"; do
  echo "== $S/$id"
  rm -f art/blender/toys/_build/$S/$id.glb
  tools/blender.sh art/blender/toys/$S/$id.py "${flags[@]}" 2>&1 | grep -E "^\[|Error|Traceback|error" || true
  [ -f art/blender/toys/_build/$S/$id.glb ] || { echo "no glb for $S/$id"; exit 1; }
done
node art/blender/toys/pack.mjs "$S" "${ids[@]}"
