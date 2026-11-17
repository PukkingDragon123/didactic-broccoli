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
# debris atlas (1024x1024, 4x4 cells of 256): 0 sawdust and grit, 1 newspaper, 2 crumpled white paper, 3 sweet wrappers,
# 4 can (silver and red, an original label), 5 cardboard (corrugated, tape, print), 6 grey dust and fluff, 7 cigarette
# butts and bottle caps on grit
im = Image.new('RGB', (1024, 1024), (120, 110, 96)); d = ImageDraw.Draw(im)
def cell(i): return (i % 4) * 256, (i // 4) * 256
x0, y0 = cell(0)
for _ in range(9000):
    x, y = x0 + random.randrange(256), y0 + random.randrange(256); c = random.choice([(168, 140, 98), (150, 120, 80), (186, 160, 118), (120, 96, 66), (96, 88, 80)])
    d.rectangle([x, y, x + random.randint(0, 2), y + random.randint(0, 1)], fill=c)
x0, y0 = cell(1); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(206, 202, 188))
fs = ImageFont.truetype(FONT, 9); fb = ImageFont.truetype(FONT, 22)
d.text((x0 + 8, y0 + 6), '杜王新聞 夕刊', font=fb, fill=(40, 40, 40))
for col in range(4):
    for r in range(22): d.text((x0 + 8 + col * 62, y0 + 40 + r * 9.5), ''.join(random.choice('の地町店駅市日本人時間今年月円会社') for _ in range(5)), font=fs, fill=(70, 70, 70))
d.rectangle([x0 + 140, y0 + 120, x0 + 240, y0 + 200], fill=(150, 146, 138))
x0, y0 = cell(2); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(232, 230, 222))
for _ in range(60):
    a, b = x0 + random.randrange(256), y0 + random.randrange(256); d.line([a, b, a + random.randint(-40, 40), b + random.randint(-40, 40)], fill=random.choice([(200, 198, 190), (214, 212, 204), (180, 178, 170)]), width=random.randint(1, 3))
for r in range(8): d.line([x0 + 20, y0 + 30 + r * 24, x0 + 220, y0 + 30 + r * 24], fill=(150, 170, 200), width=1)
x0, y0 = cell(3)
for k, c in enumerate([(176, 52, 46), (214, 170, 52), (60, 110, 160), (90, 140, 70)]):
    xs, ys = x0 + (k % 2) * 128, y0 + (k // 2) * 128; d.rectangle([xs, ys, xs + 127, ys + 127], fill=c)
    for _ in range(25): a, b = xs + random.randrange(128), ys + random.randrange(128); d.line([a, b, a + random.randint(-20, 20), b + random.randint(-20, 20)], fill=tuple(min(255, v + 40) for v in c), width=2)
    d.text((xs + 20, ys + 50), random.choice(['ラムネ', 'チョコ', 'あめ', 'ガム']), font=ImageFont.truetype(FONT, 26), fill=(246, 242, 230))
x0, y0 = cell(4); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(184, 188, 192))
d.rectangle([x0, y0 + 40, x0 + 255, y0 + 200], fill=(178, 40, 42)); d.text((x0 + 30, y0 + 80), 'COLA', font=ImageFont.truetype(FONT, 60), fill=(246, 244, 240))
for _ in range(40): a = x0 + random.randrange(256); d.line([a, y0, a + random.randint(-10, 10), y0 + 255], fill=(150, 150, 156), width=1)
x0, y0 = cell(5); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(176, 136, 88))
for r in range(0, 256, 6): d.line([x0, y0 + r, x0 + 255, y0 + r], fill=(160, 122, 78), width=2)
d.rectangle([x0, y0 + 110, x0 + 255, y0 + 140], fill=(196, 176, 130)); d.text((x0 + 30, y0 + 30), '取扱注意', font=ImageFont.truetype(FONT, 34), fill=(60, 40, 30))
d.text((x0 + 30, y0 + 170), 'FRAGILE ↑↑', font=ImageFont.truetype(FONT, 26), fill=(70, 50, 36))
x0, y0 = cell(6)
for _ in range(9000):
    x, y = x0 + random.randrange(256), y0 + random.randrange(256); c = random.choice([(132, 128, 122), (150, 146, 140), (112, 108, 104), (170, 166, 160)])
    d.rectangle([x, y, x + random.randint(0, 2), y + random.randint(0, 2)], fill=c)
for _ in range(30): a, b = x0 + random.randrange(256), y0 + random.randrange(256); d.arc([a, b, a + 20, b + 14], 0, 300, fill=(190, 186, 180), width=1)
x0, y0 = cell(7); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(128, 118, 104))
for _ in range(5000): x, y = x0 + random.randrange(256), y0 + random.randrange(256); d.point((x, y), fill=random.choice([(150, 140, 120), (100, 92, 82), (170, 160, 140)]))
for _ in range(14):
    a, b = x0 + random.randrange(20, 230), y0 + random.randrange(20, 230); d.rectangle([a, b, a + 18, b + 5], fill=(236, 232, 220)); d.rectangle([a, b, a + 6, b + 5], fill=(200, 140, 70))
for _ in range(6):
    a, b = x0 + random.randrange(20, 230), y0 + random.randrange(20, 230); d.ellipse([a, b, a + 12, b + 12], fill=random.choice([(190, 150, 60), (200, 200, 205), (180, 40, 40)]))
for i in range(8, 16):
    x0, y0 = cell(i); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(112, 104, 96))
im.save(os.path.join(H, 'debris.png'))
print('debris ok')
