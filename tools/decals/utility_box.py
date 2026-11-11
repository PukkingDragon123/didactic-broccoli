# A Japanese warning label on the Poly Haven utility box (utility_box_01): 危険 高電圧 / 関係者以外開扉禁止.
# Usage: python3 -I tools/decals/utility_box.py <base.png> <out.png>
import sys
from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
a = Image.open(sys.argv[1]).convert('RGB'); d = ImageDraw.Draw(a)
x, y = 300, 300
d.rectangle((x, y, x + 74, y + 46), fill=(232, 226, 210))
d.rectangle((x + 2, y + 2, x + 72, y + 20), fill=(204, 44, 36))
d.text((x + 6, y + 3), '危険 高電圧', font=ImageFont.truetype(F, 13), fill=(246, 240, 228))
d.text((x + 4, y + 23), '関係者以外', font=ImageFont.truetype(F, 10), fill=(40, 36, 40))
d.text((x + 4, y + 34), '開扉禁止', font=ImageFont.truetype(F, 10), fill=(40, 36, 40))
d.rectangle((x, y, x + 74, y + 46), outline=(150, 140, 126))
a.save(sys.argv[2])
