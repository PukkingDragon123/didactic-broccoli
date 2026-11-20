#!/usr/bin/env python3
"""The toy painter's photo-bash sources (lib/paint.py Painter.photo): crops of real CC0 / PD / CC BY animal photos
(credited in CREDITS.md and public/CREDITS.txt, "Toy textures"), turned into the two fields the painter lays under its
brushwork, stored here as <name>.npz (uint8, 320 px):
  det  the fine surface detail (growth rings, scale edges, hair strands, barbs): the crop's luminance minus its 5 px blur
  mot  the mottling (blotches, colour patches): the luminance band between a 5 px and a 40 px blur
Both are mirror-tiled by the painter, so the crops need not tile. Run with the system python (PIL), from the repo root:
    python3 -I art/blender/toys/lib/photos/make.py [--sheet out.png]
"""
import io, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), *['..'] * 5))
CACHE = os.path.join(ROOT, 'shots', '.art-cache')
OUT = os.path.dirname(os.path.abspath(__file__))
UA = {'User-Agent': 'gg-art-tool/1.0'}
CM = 'https://commons.wikimedia.org/wiki/Special:FilePath/%s?width=1600'
OI = 'https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg'
# name: (source url, cache file, crop box as fractions x0, y0, x1, y1)
SRC = {
    'scute': (CM % 'Scute_of_the_carapace_of_a_Texas_tortoise_Gopherus_berlandieri.jpg',
              'commons/animal/Scute_of_the_carapace_of_a_Texas_tortoise_Gopherus_berlandieri.jpg', (0.06, 0.08, 0.94, 0.72)),
    'tortoise': (CM % 'Aldabra_giant_tortoise_(8455424676).jpg', 'commons/animal/Aldabra_giant_tortoise_(8455424676).jpg',
                 (0.35, 0.42, 0.49, 0.62)),
    'fur': (CM % 'Black_bear_fur_skin_(2).jpg', 'commons/animal/Black_bear_fur_skin_(2).jpg', (0.42, 0.30, 0.58, 0.58)),
    'crab': (CM % 'Large_edible_crab_carapace.jpg', 'commons/animal/Large_edible_crab_carapace.jpg', (0.30, 0.30, 0.70, 0.62)),
    'scales': (OI % ('train', '67dd52b7190e9f19'), 'oi/67dd52b7190e9f19.jpg', (0.56, 0.52, 0.70, 0.70)),
    'feather': (OI % ('train', '2343212ab72aafb2'), 'oi/2343212ab72aafb2.jpg', (0.63, 0.52, 0.85, 0.74)),
    'frog': (OI % ('train', 'e022ed892f8b1e0e'), 'oi/e022ed892f8b1e0e.jpg', (0.30, 0.18, 0.58, 0.42)),
    'flipper': (OI % ('train', '238adf8f7c8c2216'), 'oi/238adf8f7c8c2216.jpg', (0.31, 0.66, 0.44, 0.92)),
}
N = 320


def load(name):
    url, rel, box = SRC[name]
    p = os.path.join(CACHE, rel)
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read())
    im = ImageOps.exif_transpose(Image.open(p)).convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = box
    c = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    s = min(c.size)
    c = c.crop(((c.size[0] - s) // 2, (c.size[1] - s) // 2, (c.size[0] - s) // 2 + s, (c.size[1] - s) // 2 + s))
    return c.resize((N, N), Image.LANCZOS)


def fields(c):
    L = c.convert('L')
    a = np.asarray(L, np.float32)
    b5 = np.asarray(L.filter(ImageFilter.GaussianBlur(5)), np.float32)
    b40 = np.asarray(L.filter(ImageFilter.GaussianBlur(40)), np.float32)
    det, mot = a - b5, b5 - b40
    q = lambda f: np.clip(f / (f.std() + 1e-6) * 42 + 128, 0, 255).astype(np.uint8)  # (2.5 sigma either side of 128)
    return q(det), q(mot)


if __name__ == '__main__':
    tiles = []
    for nm in SRC:
        c = load(nm)
        det, mot = fields(c)
        np.savez_compressed(os.path.join(OUT, nm + '.npz'), det=det, mot=mot)
        tiles.append((nm, c, det, mot))
        print('photo', nm, '->', os.path.join(OUT, nm + '.npz'))
    if '--sheet' in sys.argv:
        S = Image.new('RGB', (3 * 160, len(tiles) * 160))
        for i, (nm, c, det, mot) in enumerate(tiles):
            for j, im in enumerate((c, Image.fromarray(det), Image.fromarray(mot))):
                S.paste(im.convert('RGB').resize((160, 160)), (j * 160, i * 160))
        S.save(sys.argv[sys.argv.index('--sheet') + 1])
