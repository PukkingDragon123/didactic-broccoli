#!/usr/bin/env python3
"""make-views.py: real photographs -> the 2D views out of the windows (public/img/views/*.png), as HD pixel art.

The views behind the annex's open shutter and the Kaikan's windows (src/growth/views.js) are CC BY 2.0 photos of
Tokyo streets from Google Open Images (credited in CREDITS.md): cropped to the window's shape, evened out a little and
reduced by tools/pixelart.py (hue families with shading ramps, clean clusters, warm highlights and cool shadows, a
little pastel). The game shows them with nearest magnification and linear-light mips.

Usage: python3 -I tools/make-views.py <photo dir> [--fetch] [name ...]
Needs Pillow and numpy.
"""
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pixelart import reduce, save_png  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'img', 'views')
S3 = 'https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg'

# name: Open Images photo, crop (x, y, w, h as fractions), output size, pixel-art options
VIEWS = {
    # the lane outside the annex's shutter: wooden and mortar houses, poles and their wires, a strip of road
    'lane': dict(id='50d546d006457f9a', subset='train', crop=(0.0, 0.08, 1.0, 0.62), size=(384, 192),
                 opts=dict(fam=5, steps=8, bins='even', chroma=0.8, smooth=0.05, passes=2, min_cluster=3, hue=0.1, maxdrop=1, maxlift=1)),
    # the Kaikan's ground floor: the shopping street in front of the station, its shops, signs and people
    'plaza': dict(id='1c50a2d9bb44696e', subset='train', crop=(0.0, 0.0, 1.0, 0.75), size=(480, 192),
                  opts=dict(fam=6, steps=8, bins='even', chroma=0.8, smooth=0.05, passes=2, min_cluster=3, hue=0.1, maxdrop=1, maxlift=1)),
    # the Kaikan's upper floors: down onto the tracks, a train, the buildings beyond
    'tracks': dict(id='2ab37fb75e9ecd33', subset='test', crop=(0.0, 0.12, 1.0, 0.6), size=(480, 192),
                   opts=dict(fam=6, steps=8, bins='even', chroma=0.6, smooth=0.06, passes=2, min_cluster=3, hue=0.1, maxdrop=1, maxlift=1)),
}


def main():
    args = sys.argv[1:]
    fetch = '--fetch' in args
    args = [a for a in args if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 1
    src, names = args[0], args[1:] or list(VIEWS)
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        v = VIEWS[n]
        p = os.path.join(src, v['id'] + '.jpg')
        if not os.path.exists(p):
            if not fetch:
                print(f'{n}: missing {p} (use --fetch)')
                continue
            os.system(f"curl -sS -f -o '{p}' '{S3 % (v['subset'], v['id'])}'")
        im = Image.open(p).convert('RGB')
        W, H = im.size
        x, y, w, h = v['crop']
        im = im.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
        rgb = np.asarray(im, dtype=np.float32) / 255
        px, labels, pal = reduce(rgb, v['size'][0], v['size'][1], wrap=False, **v['opts'])
        out = os.path.join(OUT, n + '.png')
        save_png(out, labels, pal)
        print(f'{n}: {v["size"][0]}x{v["size"][1]} {len(np.unique(labels))} tones {os.path.getsize(out) // 1024} KB')
    return 0


if __name__ == '__main__':
    sys.exit(main())
