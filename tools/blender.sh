#!/bin/bash
# Run a Python script with Blender (bpy) headless. Creates the venv on first use.
#   tools/blender.sh art/blender/toys/make.py [args...]
V=${GG_BPY_VENV:-$HOME/.cache/gg-bpy}
if [ ! -x "$V/bin/python" ] || ! "$V/bin/python" -c "import bpy" 2>/dev/null; then
  python3 -m venv "$V" && "$V/bin/pip" install -q bpy || exit 1
fi
exec "$V/bin/python" "$@"
