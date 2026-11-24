"""Vehicles converted from real hand-made CC BY models (Sketchfab; tools/ai-check.py OK) to the game's high-resolution
pixel-art style (`lowpix convert --style pixel-hd`, 256 px/m like the architecture standard), scaled to their real size,
front +z, bottom centre at the origin. Every maker's badge and script is painted out in the atlas
(art/lowpix/world_arch/retouch_vehicles.mjs after the conversion repaints every texel in the house style) and the game hangs its own pixel-font plates
(src/world/carModels.js), so no real brand shows.
  kei_truck:  a mid-1980s cab-over kei truck (the "1984 Suzuki Kei Truck" model by untitled.vvti, CC BY 4.0), 3.2 x 1.4
              x 1.47 m. The raw conversion is not shipped: retouch_vehicles.mjs repaints it into kei_truck_a (cream,
              the Suzukis' truck in the carport) and kei_truck_b (faded green, parked by the rental garages), which
              pack.mjs ships (src/world/carModels.js places them with their plates).
Credits: CREDITS.md / public/CREDITS.txt (and the manifest's credit field).
"""


def conv(src, h, ppm=256, ry=0, desc='', **kw):
    return {'name': desc, 'density': ppm, 'convert': {'src': src, 'style': 'pixel-hd', **kw}, 'game': {'fit': {'h': h, 'ry': ry}}}


def specs():
    return {
        'kei_truck': conv('sketchfab:c08fd6d5410b4a4099043033907616bd', 1.47, ry=180, tris=12000, atlas=2048,
                          desc='1980s kei truck (1984 Suzuki Kei Truck by iwak.rebus, CC BY 4.0, converted, badges painted out)'),
    }
