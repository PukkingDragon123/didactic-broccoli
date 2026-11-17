# Painted source textures for the self-made source models (art/lowpix/world/made/make.mjs): signs and cloth with real
# Japanese lettering, converted to pixel art by lowpix like every other model. Run: python3 art/lowpix/world/made/textures.py
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = os.path.dirname(os.path.abspath(__file__))
FONT = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
random.seed(7)
def grime(im, amt=18):
    px = im.load(); W, Hh = im.size
    for _ in range(W * Hh // 6):
        x, y = random.randrange(W), random.randrange(Hh); r, g, b = px[x, y][:3]; d = random.randint(-amt, amt // 2)
        px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    return im
# stop sign: atlas 512x512, the plate face in the top 512x448 (an inverted triangle), metal + concrete strips below
im = Image.new('RGB', (512, 512), (150, 154, 156)); d = ImageDraw.Draw(im)
tri = [(8, 8), (504, 8), (256, 440)]
d.polygon(tri, fill=(240, 240, 236))
inner = [(40, 26), (472, 26), (256, 400)]
d.polygon(inner, fill=(196, 34, 38))
f = ImageFont.truetype(FONT, 104)
for i, ch in enumerate('止まれ'):
    w = d.textlength(ch, font=f); d.text((256 - w / 2 + (i - 1) * 112, 74), ch, font=f, fill=(244, 244, 240), stroke_width=5, stroke_fill=(244, 244, 240))
d.rectangle([0, 448, 255, 511], fill=(168, 172, 176)); d.rectangle([256, 448, 511, 511], fill=(150, 146, 138))
grime(im).filter(ImageFilter.SMOOTH).save(os.path.join(H, 'tomare.png'))
# shaved-ice flag (nobori): cloth 256x512 left, pole/stand strip right
im = Image.new('RGB', (512, 512), (120, 120, 120)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 511], fill=(246, 244, 236))
for k in range(5):  # blue waves at the foot
    y = 400 + k * 22
    for x in range(-20, 260, 40): d.arc([x, y - 18, x + 40, y + 18], 180, 360, fill=(36, 92, 170), width=6)
d.rectangle([0, 470, 255, 511], fill=(36, 92, 170))
f = ImageFont.truetype(FONT, 210)
w = d.textlength('氷', font=f); d.text((128 - w / 2, 120), '氷', font=f, fill=(206, 34, 40), stroke_width=6, stroke_fill=(206, 34, 40))
d.rectangle([0, 0, 255, 30], fill=(206, 34, 40))
d.rectangle([256, 0, 383, 511], fill=(196, 198, 200)); d.rectangle([384, 0, 511, 511], fill=(64, 92, 140))
grime(im, 12).save(os.path.join(H, 'kakigori.png'))
# fire buckets (消火用): red buckets with white lettering, a red steel stand
im = Image.new('RGB', (512, 256), (180, 36, 34)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 255], fill=(196, 40, 36))
f = ImageFont.truetype(FONT, 58)
lay = Image.new('RGB', (256, 256), (196, 40, 36)); dl = ImageDraw.Draw(lay)  # the lettering faces the front (+z): it straddles the seam
for i, ch in enumerate('消火用'): w = dl.textlength(ch, font=f); dl.text((128 - w / 2, 18 + i * 72), ch, font=f, fill=(246, 244, 238), stroke_width=2, stroke_fill=(246, 244, 238))
im.paste(lay.crop((128, 0, 256, 256)), (0, 0)); im.paste(lay.crop((0, 0, 128, 256)), (128, 0))
d.rectangle([256, 0, 383, 255], fill=(170, 30, 30)); d.rectangle([384, 0, 511, 255], fill=(60, 58, 56))
grime(im, 16).save(os.path.join(H, 'firebucket.png'))
# bus stop (バス停): a round sign on a pole, the timetable plate below, a weighted concrete base
im = Image.new('RGB', (512, 512), (150, 150, 150)); d = ImageDraw.Draw(im)
d.ellipse([8, 8, 248, 248], fill=(236, 236, 230)); d.ellipse([22, 22, 234, 234], fill=(40, 96, 170)); d.ellipse([46, 46, 210, 210], fill=(236, 236, 230))
f = ImageFont.truetype(FONT, 56); w = d.textlength('バス', font=f); d.text((128 - w / 2, 66), 'バス', font=f, fill=(40, 96, 170), stroke_width=2, stroke_fill=(40, 96, 170))
f2 = ImageFont.truetype(FONT, 30); w = d.textlength('森王町', font=f2); d.text((128 - w / 2, 140), '森王町', font=f2, fill=(30, 30, 30))
d.rectangle([264, 8, 504, 312], fill=(240, 238, 228)); d.rectangle([264, 8, 504, 48], fill=(40, 96, 170))
f3 = ImageFont.truetype(FONT, 24); d.text((276, 14), '時刻表', font=f3, fill=(244, 244, 240))
f4 = ImageFont.truetype(FONT, 17)
for r in range(10):
    y = 58 + r * 25; d.text((272, y), f'{6 + r:2d}', font=f4, fill=(40, 40, 40))
    for c in range(4): d.text((312 + c * 46, y), f'{(r * 17 + c * 13) % 60:02d}', font=f4, fill=(60, 60, 60))
    d.line([268, y + 22, 500, y + 22], fill=(200, 196, 186))
d.rectangle([0, 320, 255, 511], fill=(170, 172, 176)); d.rectangle([256, 320, 511, 511], fill=(146, 142, 134))
grime(im, 12).save(os.path.join(H, 'busstop.png'))
# standing ashtray (灰皿): a red steel drum on a short leg
im = Image.new('RGB', (256, 256), (186, 40, 36)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 127], fill=(190, 44, 38)); f = ImageFont.truetype(FONT, 40)
w = d.textlength('灰皿', font=f); d.text((128 - w / 2, 40), '灰皿', font=f, fill=(246, 244, 238), stroke_width=1, stroke_fill=(246, 244, 238))
d.rectangle([0, 128, 127, 255], fill=(70, 68, 66)); d.rectangle([128, 128, 255, 255], fill=(150, 150, 152))
for _ in range(60): x, y = random.randrange(132, 252), random.randrange(132, 252); d.rectangle([x, y, x + 6, y + 2], fill=(230, 220, 200))
grime(im, 16).save(os.path.join(H, 'ashtray.png'))
print('ok')
