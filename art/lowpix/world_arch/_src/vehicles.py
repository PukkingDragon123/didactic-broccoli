"""Vehicles are no longer converted with `lowpix convert` (the per-triangle bake lost the glass, chrome and the cab):
they are imported with their own materials by art/lowpix/world_arch/import_vehicle.mjs from the list in
art/lowpix/world_arch/vehicles.json (hand-made CC BY Sketchfab models, tools/ai-check.py OK; badges painted out,
plates replaced in the game by src/world/carModels.js). This module only keeps make.py's module list stable.
"""


def specs():
    return {}
