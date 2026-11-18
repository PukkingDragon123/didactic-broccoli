#!/usr/bin/env python3
"""Rasterise the few kanji the B series embroider or paint on their figures into glyphs.npz (1 = ink), so the Blender
paint step (no PIL there) can lay them out in figure space with bk.Decal.

    python3 -I art/blender/toys/tsuppari/glyphs.py <font.ttf>     (Shippori Mincho B1 Bold, SIL OFL)
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

TEXT = {'ban': '番', 'bosou': '暴走', 'oudan': '横断中', 'kotobuki': '寿', 'kusuri': '薬', 'yoroshiku': '夜露死苦', 'anzen': '安全運転'}
font = ImageFont.truetype(sys.argv[1], 96)
out = {}
for k, t in TEXT.items():
    W = 100 * len(t)
    im = Image.new('L', (W, 112), 0)
    ImageDraw.Draw(im).text((2, -2), t, font=font, fill=255)
    a = np.array(im) > 127
    ys, xs = np.nonzero(a)
    out[k] = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
np.savez_compressed(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'glyphs.npz'), **out)
print({k: v.shape for k, v in out.items()})
