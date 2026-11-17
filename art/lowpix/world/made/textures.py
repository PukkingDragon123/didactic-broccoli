# Painted source textures for the self-made source models (art/lowpix/world/made/make.mjs): signs and cloth with real
# Japanese lettering, converted to pixel art by lowpix like every other model. Run: python3 art/lowpix/world/made/textures.py
import os, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = os.path.dirname(os.path.abspath(__file__))
FONT = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
random.seed(7)
def grime(im, amt=18):
    """Wear without speckle: soft darker blotches, a few scratches and edge dirt (no per-pixel noise)."""
    W, Hh = im.size
    lay = Image.new('L', (W, Hh), 0); d = ImageDraw.Draw(lay)
    for _ in range(max(6, W * Hh // 9000)):
        x, y, r = random.randrange(W), random.randrange(Hh), random.randint(6, 26)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=random.randint(amt // 2, amt))
    for _ in range(max(4, W * Hh // 20000)):
        x, y = random.randrange(W), random.randrange(Hh); d.line([x, y, x + random.randint(-30, 30), y + random.randint(-6, 6)], fill=amt * 2, width=1)
    lay = lay.filter(ImageFilter.GaussianBlur(2))
    dark = Image.new('RGB', (W, Hh), (60, 52, 44))
    return Image.composite(dark, im.convert('RGB'), lay.point(lambda v: min(90, v)))
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
grime(im).save(os.path.join(H, 'tomare.png'))
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
for _ in range(5000):
    x, y = x0 + random.randrange(256), y0 + random.randrange(256); c = random.choice([(168, 140, 98), (150, 120, 80), (186, 160, 118), (120, 96, 66), (96, 88, 80)])
    d.rectangle([x, y, x + random.randint(1, 3), y + random.randint(1, 2)], fill=c)
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
for _ in range(5000): x, y = x0 + random.randrange(256), y0 + random.randrange(256); d.rectangle([x, y, x + 1, y + 1], fill=random.choice([(150, 140, 120), (100, 92, 82), (170, 160, 140)]))
for _ in range(14):
    a, b = x0 + random.randrange(20, 230), y0 + random.randrange(20, 230); d.rectangle([a, b, a + 18, b + 5], fill=(236, 232, 220)); d.rectangle([a, b, a + 6, b + 5], fill=(200, 140, 70))
for _ in range(6):
    a, b = x0 + random.randrange(20, 230), y0 + random.randrange(20, 230); d.ellipse([a, b, a + 12, b + 12], fill=random.choice([(190, 150, 60), (200, 200, 205), (180, 40, 40)]))
for i in range(8, 16):
    x0, y0 = cell(i); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(112, 104, 96))
im.save(os.path.join(H, 'debris.png'))
print('debris ok')
# mini fridge (512x512): 0..255 x the door (cream enamel, chrome badge, stickers, scuffs), 256.. the body sides, the top, the
# grille strip, the handle chrome
im = Image.new('RGB', (512, 512), (226, 222, 210)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 511], fill=(234, 230, 218))
for (x, y, w, h, c, t) in [(30, 90, 70, 52, (238, 196, 60), 'ガチャ'), (150, 60, 60, 60, (90, 160, 210), '★'), (60, 300, 90, 40, (200, 70, 60), 'SALE'), (160, 360, 56, 70, (110, 170, 90), '野菜')]:
    d.rectangle([x, y, x + w, y + h], fill=c); d.text((x + 6, y + h // 2 - 12), t, font=ImageFont.truetype(FONT, 20), fill=(250, 248, 240))
d.rectangle([90, 470, 166, 486], fill=(190, 194, 198)); d.text((96, 470), 'KOGURE', font=ImageFont.truetype(FONT, 13), fill=(80, 84, 90))
d.rectangle([256, 0, 511, 383], fill=(222, 218, 206))
for r in range(392, 452, 6): d.line([256, r, 511, r], fill=(70, 70, 72), width=3)
d.rectangle([256, 460, 511, 511], fill=(196, 200, 204))
grime(im, 8).save(os.path.join(H, 'fridge.png'))
# gas water heater (瞬間湯沸器): white case, the flame window, the knob, the badge, pipes
im = Image.new('RGB', (512, 512), (236, 234, 228)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 511], fill=(238, 236, 230))
d.rectangle([90, 150, 166, 200], fill=(40, 36, 34)); d.rectangle([100, 168, 156, 190], fill=(60, 110, 200))
d.ellipse([108, 250, 148, 290], fill=(70, 70, 74)); d.ellipse([118, 260, 138, 280], fill=(200, 200, 204))
d.text((70, 60), '瞬間湯沸器', font=ImageFont.truetype(FONT, 24), fill=(70, 70, 76)); d.text((88, 330), 'TOKYO GAS-KI', font=ImageFont.truetype(FONT, 12), fill=(130, 60, 50))
for r in range(380, 470, 10): d.line([40, r, 216, r], fill=(200, 198, 192), width=4)
d.rectangle([256, 0, 511, 255], fill=(226, 224, 218)); d.rectangle([256, 256, 511, 383], fill=(184, 150, 96)); d.rectangle([256, 384, 511, 511], fill=(176, 180, 186))
grime(im, 8).save(os.path.join(H, 'waterheater.png'))
# cobweb (RGBA 256x256): silk threads, radial + spiral, a little dust caught in it
im = Image.new('RGBA', (256, 256), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
import math
for k in range(9):
    a = math.pi * k / 16; d.line([0, 0, int(math.cos(a) * 250), int(math.sin(a) * 250)], fill=(232, 230, 222, 230), width=1)
for r in range(14, 250, 13):
    pts = [(int(math.cos(math.pi * k / 16) * (r + (k % 2) * 3)), int(math.sin(math.pi * k / 16) * (r + (k % 2) * 3))) for k in range(9)]
    d.line(pts, fill=(222, 220, 212, 200), width=1)
for _ in range(40): x, y = random.randrange(10, 160), random.randrange(10, 160); d.point((x, y), fill=(160, 150, 130, 255))
im.save(os.path.join(H, 'cobweb.png'))
# coin tray (カルトン): green rubber with a ribbed floor, a few coins
im = Image.new('RGB', (256, 256), (52, 86, 62)); d = ImageDraw.Draw(im)
for r in range(0, 256, 5): d.line([0, r, 255, r], fill=(44, 76, 54), width=2)
for (x, y, c) in [(60, 80, (200, 170, 70)), (110, 120, (196, 196, 200)), (150, 70, (196, 196, 200)), (90, 150, (176, 120, 70))]: d.ellipse([x, y, x + 26, y + 26], fill=c); d.ellipse([x + 4, y + 4, x + 22, y + 22], outline=tuple(v - 30 for v in c))
d.rectangle([0, 200, 255, 255], fill=(30, 72, 48))
grime(im, 10).save(os.path.join(H, 'cointray.png'))
print('more ok')
# weathered cedar planks (縁台): grain lines, knots, nail heads, grey sun-bleached tops
def planks(W, Hh, base=(150, 118, 84)):
    im = Image.new('RGB', (W, Hh), base); d = ImageDraw.Draw(im)
    for y in range(0, Hh, 3):
        c = tuple(max(0, min(255, v + random.randint(-14, 10))) for v in base)
        d.line([0, y, W, y + random.randint(-2, 2)], fill=c, width=2)
    for _ in range(W * Hh // 9000): x, y = random.randrange(W), random.randrange(Hh); d.ellipse([x, y, x + 10, y + 6], fill=tuple(v - 40 for v in base)); d.ellipse([x + 3, y + 2, x + 7, y + 4], fill=tuple(v - 60 for v in base))
    return grime(im, 22)
im = planks(512, 512, (158, 132, 102)); d = ImageDraw.Draw(im)
for x in range(0, 512, 128):
    for y in (20, 236, 492): d.rectangle([x + 60, y, x + 63, y + 3], fill=(70, 66, 62))
for x in range(0, 512, 128): d.line([x, 0, x, 255], fill=(96, 74, 52), width=2)
im.save(os.path.join(H, 'bench.png'))
# pink public phone on its little stand: pink plastic, the dial, the coin slot, the label, a wooden stand
im = Image.new('RGB', (512, 512), (226, 140, 160)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 255], fill=(230, 146, 166)); d.ellipse([60, 90, 196, 226], fill=(240, 236, 228)); d.ellipse([86, 116, 170, 200], fill=(228, 136, 156))
for k in range(10):
    import math
    a = math.pi * 2 * k / 10 - 1.2; x, y = 128 + math.cos(a) * 50, 158 + math.sin(a) * 50; d.ellipse([x - 8, y - 8, x + 8, y + 8], fill=(60, 56, 54)); d.text((x - 4, y - 7), str((k + 1) % 10), font=ImageFont.truetype(FONT, 11), fill=(244, 244, 240))
d.rectangle([40, 24, 216, 70], fill=(246, 242, 236)); d.text((52, 30), '10円 電話', font=ImageFont.truetype(FONT, 30), fill=(196, 40, 60))
d.rectangle([200, 100, 214, 150], fill=(70, 66, 64))
d.rectangle([256, 0, 511, 255], fill=(220, 132, 152))
im.paste(planks(256, 256, (120, 84, 56)), (0, 256)); im.paste(planks(256, 256, (110, 76, 50)), (256, 256))
grime(im, 10).save(os.path.join(H, 'pinkphone.png'))
# street light: galvanised steel, the lamp head's milky diffuser, a pole plate with a number
im = Image.new('RGB', (256, 256), (150, 156, 158)); d = ImageDraw.Draw(im)
for y in range(0, 128, 4): d.line([0, y, 255, y], fill=(140, 146, 148), width=1)
d.rectangle([0, 128, 127, 255], fill=(226, 228, 220)); d.rectangle([8, 136, 119, 247], fill=(240, 240, 232))
d.rectangle([128, 128, 255, 255], fill=(220, 222, 214)); d.text((140, 170), '杜王 26', font=ImageFont.truetype(FONT, 22), fill=(40, 60, 120))
grime(im, 16).save(os.path.join(H, 'streetlight.png'))
print('set3 ok')
# Mikawa-ya fixtures and the gacha corner (1024 atlas, 4x4 cells of 256)
im = Image.new('RGB', (1024, 1024), (120, 100, 80)); d = ImageDraw.Draw(im)
def C(i): return (i % 4) * 256, (i // 4) * 256
J = lambda s, n: ImageFont.truetype(FONT, n)
# 0 dark varnished wood   1 light wood   2 grey steel (coin changer body)   3 coin changer front
for i, base in [(0, (92, 58, 34)), (1, (176, 140, 98))]:
    x0, y0 = C(i); im.paste(planks(256, 256, base), (x0, y0))
x0, y0 = C(2); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(150, 156, 160))
for y in range(0, 256, 3): d.line([x0, y0 + y, x0 + 255, y0 + y], fill=(144, 150, 154))
x0, y0 = C(3); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(176, 182, 186)); d.rectangle([x0 + 20, y0 + 14, x0 + 236, y0 + 64], fill=(200, 40, 44))
d.text((x0 + 60, y0 + 18), '両替機', font=J(0, 38), fill=(250, 248, 240)); d.text((x0 + 30, y0 + 74), '千円札 → 百円玉', font=J(0, 22), fill=(40, 40, 44))
d.rectangle([x0 + 50, y0 + 110, x0 + 206, y0 + 124], fill=(30, 30, 32)); d.rectangle([x0 + 60, y0 + 140, x0 + 120, y0 + 160], fill=(60, 160, 80)); d.rectangle([x0 + 136, y0 + 140, x0 + 196, y0 + 160], fill=(220, 180, 40))
d.rectangle([x0 + 70, y0 + 186, x0 + 186, y0 + 240], fill=(60, 62, 66)); d.rectangle([x0 + 80, y0 + 196, x0 + 176, y0 + 232], fill=(36, 36, 38))
# 4 capsule return box front: clear window full of capsules, label
x0, y0 = C(4); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(220, 60, 50)); d.rectangle([x0 + 20, y0 + 70, x0 + 236, y0 + 236], fill=(200, 214, 220))
for _ in range(60):
    a, b = x0 + random.randrange(28, 210), y0 + random.randrange(120, 210); c = random.choice([(230, 80, 80), (80, 140, 220), (240, 200, 60), (120, 200, 120), (240, 240, 240)])
    d.ellipse([a, b, a + 24, b + 24], fill=c); d.line([a, b + 12, a + 24, b + 12], fill=(250, 250, 250), width=2)
d.text((x0 + 22, y0 + 14), 'カプセル回収', font=J(0, 34), fill=(250, 248, 240))
# 5 dairy case back: shelves of milk bottles and cartons   6 dairy case body (white enamel, a red stripe)
x0, y0 = C(5); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(70, 84, 92))
for r in range(4):
    yy = y0 + 10 + r * 62; d.rectangle([x0, yy + 52, x0 + 255, yy + 58], fill=(170, 176, 180))
    for k in range(9):
        xx = x0 + 6 + k * 28
        if (k + r) % 3 == 0: d.rectangle([xx, yy + 18, xx + 18, yy + 52], fill=(246, 246, 240)); d.rectangle([xx, yy + 26, xx + 18, yy + 36], fill=(60, 120, 200)); d.polygon([(xx, yy + 18), (xx + 9, yy + 8), (xx + 18, yy + 18)], fill=(236, 236, 230))
        else: d.rounded_rectangle([xx + 2, yy + 16, xx + 16, yy + 52], 5, fill=(240, 240, 236)); d.rectangle([xx + 4, yy + 12, xx + 14, yy + 18], fill=(200, 60, 50) if k % 2 else (230, 180, 60))
x0, y0 = C(6); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(232, 232, 226)); d.rectangle([x0, y0 + 30, x0 + 255, y0 + 60], fill=(190, 40, 46)); d.text((x0 + 60, y0 + 32), '牛乳 乳製品', font=J(0, 24), fill=(250, 248, 240))
# 7 kamidana: white paper, the shrine's wood, a sakaki green, the rope
x0, y0 = C(7); im.paste(planks(256, 128, (200, 170, 120)), (x0, y0)); d.rectangle([x0, y0 + 128, x0 + 127, y0 + 255], fill=(244, 240, 228))
d.rectangle([x0 + 128, y0 + 128, x0 + 255, y0 + 190], fill=(60, 110, 50)); d.rectangle([x0 + 128, y0 + 190, x0 + 255, y0 + 255], fill=(214, 190, 120))
for k in range(0, 128, 10): d.line([x0 + 128 + k, y0 + 190, x0 + 136 + k, y0 + 255], fill=(180, 150, 80), width=3)
# 8 watch case top (glass over watches)   9 puff box front + top
x0, y0 = C(8); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(70, 30, 34))
for k in range(6):
    a, b = x0 + 20 + (k % 3) * 76, y0 + 30 + (k // 3) * 110; d.ellipse([a, b, a + 50, b + 50], fill=(220, 210, 180)); d.ellipse([a + 6, b + 6, a + 44, b + 44], fill=(246, 244, 236)); d.line([a + 25, b + 25, a + 25, b + 10], fill=(30, 30, 30), width=2); d.line([a + 25, b + 25, a + 36, b + 28], fill=(30, 30, 30), width=2); d.rectangle([a + 18, b + 48, a + 32, b + 80], fill=(110, 70, 40))
x0, y0 = C(9); d.rectangle([x0, y0, x0 + 255, y0 + 127], fill=(240, 200, 60)); d.text((x0 + 20, y0 + 20), 'うまか棒', font=J(0, 40), fill=(200, 40, 40)); d.text((x0 + 30, y0 + 76), '10円 30本入', font=J(0, 22), fill=(60, 40, 30))
for k in range(16): d.rectangle([x0 + k * 16, y0 + 128, x0 + k * 16 + 12, y0 + 255], fill=random.choice([(240, 200, 60), (230, 120, 60), (120, 180, 220), (200, 80, 120)]))
# 10 dagashi rack fronts: rows of sweets   11 counter showcase front (glass, goods behind)
x0, y0 = C(10); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(176, 140, 98))
for r in range(4):
    for k in range(6):
        a, b = x0 + 4 + k * 42, y0 + 6 + r * 62; c = random.choice([(220, 60, 60), (240, 200, 60), (80, 150, 220), (240, 140, 180), (120, 190, 110), (250, 240, 230)])
        d.rectangle([a, b, a + 38, b + 54], fill=c); d.text((a + 4, b + 18), random.choice(['あめ', 'ガム', 'チョコ', 'くじ', 'ラムネ']), font=J(0, 12), fill=(255, 255, 255) if sum(c) < 500 else (60, 40, 40))
x0, y0 = C(11); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(150, 170, 176))
for k in range(10):
    a, b = x0 + 8 + k * 24, y0 + 120 + (k % 3) * 30; d.rectangle([a, b, a + 20, b + 90], fill=random.choice([(220, 200, 150), (200, 90, 80), (240, 220, 120), (120, 160, 200)]))
for k in range(0, 256, 40): d.line([x0 + k, y0, x0 + k + 80, y0 + 255], fill=(196, 214, 220), width=4)
# 12 milk carton print   13 fluorescent tube box print   14 tin bucket   15 broom straw and handles
x0, y0 = C(12); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(248, 248, 244)); d.rectangle([x0, y0 + 90, x0 + 255, y0 + 180], fill=(40, 110, 200)); d.text((x0 + 70, y0 + 100), '牛乳', font=J(0, 60), fill=(250, 250, 250)); d.text((x0 + 60, y0 + 196), '1000ml 森王牧場', font=J(0, 22), fill=(40, 60, 120))
x0, y0 = C(13); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(236, 230, 214)); d.rectangle([x0, y0 + 100, x0 + 255, y0 + 156], fill=(40, 90, 170)); d.text((x0 + 10, y0 + 108), '蛍光灯 FL20SS 昼光色', font=J(0, 28), fill=(250, 250, 250))
x0, y0 = C(14); d.rectangle([x0, y0, x0 + 255, y0 + 255], fill=(166, 170, 172))
for y in range(0, 256, 22): d.line([x0, y0 + y, x0 + 255, y0 + y], fill=(140, 144, 146), width=3)
x0, y0 = C(15); d.rectangle([x0, y0, x0 + 127, y0 + 255], fill=(196, 168, 100))
for k in range(0, 128, 4): d.line([x0 + k, y0, x0 + k + random.randint(-3, 3), y0 + 255], fill=random.choice([(170, 140, 80), (210, 186, 120)]), width=2)
im.paste(planks(128, 256, (120, 86, 54)), (x0 + 128, y0))
grime(im, 12).save(os.path.join(H, 'mikawaya.png'))
print('mikawaya ok')
# garbage station: the green crow net (rolled), the rules board, its post; batteries in a blister card
im = Image.new('RGB', (512, 512), (40, 110, 70)); d = ImageDraw.Draw(im)
for k in range(0, 256, 8): d.line([k, 0, k + 64, 255], fill=(30, 86, 54), width=2); d.line([k + 64, 0, k, 255], fill=(54, 132, 86), width=2)
d.rectangle([256, 0, 511, 255], fill=(240, 238, 228)); d.rectangle([256, 0, 511, 40], fill=(40, 110, 70))
d.text((270, 6), 'ごみ集積所', font=ImageFont.truetype(FONT, 26), fill=(250, 250, 244))
rules = ['月・木  燃えるごみ', '水  資源ごみ', '金  びん・かん', '朝8時までに', '杜王町 町内会']
for i, t in enumerate(rules): d.text((268, 52 + i * 38), t, font=ImageFont.truetype(FONT, 22), fill=(40, 40, 44))
d.rectangle([0, 256, 255, 511], fill=(150, 156, 160)); d.rectangle([256, 256, 511, 511], fill=(130, 126, 118))
grime(im, 12).save(os.path.join(H, 'garbage.png'))
im = Image.new('RGB', (256, 256), (236, 236, 230)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 255, 70], fill=(30, 60, 140)); d.text((14, 14), '単3 アルカリ', font=ImageFont.truetype(FONT, 30), fill=(250, 250, 250))
for k in range(4): d.rectangle([20 + k * 56, 90, 64 + k * 56, 240], fill=(40, 40, 44)); d.rectangle([20 + k * 56, 90, 64 + k * 56, 130], fill=(200, 160, 40)); d.rectangle([34 + k * 56, 82, 50 + k * 56, 90], fill=(190, 190, 196))
grime(im, 6).save(os.path.join(H, 'battery.png'))
print('set5 ok')
