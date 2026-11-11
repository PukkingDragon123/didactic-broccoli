"""Bakes the drinks' photographic wraps (public/img/drinks/labels.webp + labels.json, from tools/bake-drinks.py) into
pixel art for the voxel game: each wrap is scaled to about 1 texel a millimetre (half size), its colours reduced to a
small palette of its own (median cut, no dither, so flat areas stay flat and edges stay crisp), and packed into
public/img/drinks/labels-px.webp (lossless) + labels-px.json { id: [x, y, w, h] } (id without the 'drinks:wrap:' prefix).
Usage: python3 tools/bake-drink-px.py [scale=0.5] [colours=24]"""
import json, sys
from PIL import Image

scale = float(sys.argv[1]) if len(sys.argv) > 1 else 0.5
ncol = int(sys.argv[2]) if len(sys.argv) > 2 else 24
src = Image.open('public/img/drinks/labels.webp').convert('RGB')
regions = json.load(open('public/img/drinks/labels.json'))
tiles = []
for k, (x, y, w, h) in regions.items():
    if not k.startswith('drinks:wrap:'):
        continue
    c = src.crop((x, y, x + w, y + h))
    tw, th = max(8, round(w * scale)), max(8, round(h * scale))
    c = c.resize((tw, th), Image.LANCZOS)
    # a touch more contrast before the palette, so the reduced colours hold the print's punch
    q = c.quantize(colors=ncol, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    tiles.append((k[len('drinks:wrap:'):], q))
# shelf-pack into a sheet 512 wide
W, x, y, rowh, out = 512, 0, 0, 0, {}
for k, t in sorted(tiles, key=lambda e: -e[1].height):
    if x + t.width > W:
        x, y, rowh = 0, y + rowh + 1, 0
    out[k] = [x, y, t.width, t.height]
    x += t.width + 1
    rowh = max(rowh, t.height)
H = y + rowh
sheet = Image.new('RGB', (W, H), (0, 0, 0))
for k, t in tiles:
    sheet.paste(t, tuple(out[k][:2]))
sheet.save('public/img/drinks/labels-px.webp', lossless=True, quality=100, method=6)
json.dump(out, open('public/img/drinks/labels-px.json', 'w'), separators=(',', ':'))
print('wrote labels-px.webp', sheet.size, len(out), 'wraps')
