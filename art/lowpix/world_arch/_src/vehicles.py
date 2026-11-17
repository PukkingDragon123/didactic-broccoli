"""Vehicles converted from real CC BY models (Sketchfab) to the game's high-resolution pixel-art style
(`lowpix convert --style pixel-hd`), scaled to their real size, front +z, bottom centre at the origin.
  kei_wagon: a 1997 Honda Life-type tall kei wagon (the Suzukis' car in the carport); its badges are unreadable at
  this texel size and the game paints its own plates.
Credits: CREDITS.md / public/CREDITS.txt (and the manifest's credit field).
"""


def conv(src, h, ppm=64, ry=0, desc='', **kw):
    return {'name': desc, 'density': ppm, 'convert': {'src': src, 'style': 'pixel-hd', **kw}, 'game': {'fit': {'h': h, 'ry': ry}}}


def specs():
    return {
        'kei_wagon': conv('sketchfab:40549ad17b8746d29b2da65acd2c74b7', 1.6, ppm=64, tris=4000, atlas=1024,
                          desc='Tall 1990s kei wagon (1997 Honda Life by niev, CC BY 4.0, converted)'),
    }
