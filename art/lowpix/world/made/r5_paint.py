"""Hand-painted source textures for the round-5 own models (art/lowpix/world/made/r5_props.py): the hina-dan (red mosen
felt, black lacquer, gold leaf, the dolls' brocades and faces, the lanterns' painted paper, the tachibana and cherry, the
diamond rice cakes) and the space-pod exhibit (riveted panels, porthole glass, pixel-font decals, painted wear).
Brush dabs and painted detail, no per-pixel noise; every word is DotGothic16 at 16 px multiples, in English.
Run: python3 art/lowpix/world/made/r5_paint.py   (writes art/lowpix/world/made/r5_tex/*.png)"""
import os, math, random
from PIL import Image, ImageDraw, ImageFont

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'r5_tex')
os.makedirs(OUT, exist_ok=True)
FONT = os.path.join(H, '..', '..', '..', '..', 'shots', '.art-cache', 'fonts', 'DotGothic16-Regular.ttf')
R = random.uniform


def text(d, xy, s, px, fill, anchor='la'):
    assert px % 16 == 0
    d.fontmode = '1'
    d.text(xy, s, font=ImageFont.truetype(FONT, px), fill=fill, anchor=anchor)


def tone(c, k): return tuple(max(0, min(255, int(v * k))) for v in c[:3])
def dab(d, x, y, w, h, c):
    x0, x1 = sorted((x - w / 2, x + w / 2)); y0, y1 = sorted((y - h / 2, y + h / 2)); d.ellipse([x0, y0, x1, y1], fill=c)


def paint(W, H_, c, n=0, k=(0.96, 1.04), w=(8, 22), h=(3, 8)):
    im = Image.new('RGB', (W, H_), c); d = ImageDraw.Draw(im)
    for _ in range(n or int(W * H_ / 90)):
        x, y = R(0, W), R(0, H_); cc = tone(c, R(*k)); ww, hh = R(*w), R(*h)
        for ox in (0, -W, W): dab(d, x + ox, y, ww, hh, cc)
    return im, d


def save(im, n): im.save(os.path.join(OUT, n + '.png'))


# ------------------------------------------------------------------ hina-dan: mosen felt, lacquer, gold
random.seed('mosen')
im, d = paint(256, 256, (184, 30, 38), k=(0.94, 1.05), w=(3, 8), h=(3, 8))               # red felt: a soft nap
save(im, 'hd_mosen')
random.seed('lacquer')
im, d = paint(256, 64, (26, 20, 20), k=(0.9, 1.25), w=(20, 60), h=(1, 3))
d.line([0, 8, 255, 8], fill=(70, 56, 50), width=2)                                       # the lacquer's sheen line
save(im, 'hd_lacquer')
random.seed('gold')
im = Image.new('RGB', (512, 1024), (214, 172, 74)); d = ImageDraw.Draw(im)
for j in range(0, 1024, 128):
    for i in range(0, 512, 128):
        c = tone((222, 180, 80), R(0.985, 1.02)); d.rectangle([i, j, i + 127, j + 127], fill=c)
        for _ in range(24): dab(d, R(i, i + 128), R(j, j + 128), R(16, 40), R(3, 7), tone(c, R(0.985, 1.015)))
        d.line([i, j, i + 128, j], fill=tone(c, 0.94)); d.line([i, j, i, j + 128], fill=tone(c, 0.95))
save(im, 'hd_gold')
random.seed('brass')
im, d = paint(64, 64, (200, 164, 80), k=(0.9, 1.1)); d.rectangle([3, 3, 60, 60], outline=(150, 118, 56), width=3)
for x, y in ((14, 14), (50, 14), (14, 50), (50, 50)): d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(240, 214, 140))
save(im, 'hd_brass')


# ------------------------------------------------------------------ the dolls: brocades, layered hems, faces, hair
def brocade(name, ground, motif, edge=None, seed=1):
    random.seed(name)
    im, d = paint(256, 256, ground, k=(0.96, 1.04), w=(3, 8), h=(2, 5))
    for j in range(0, 256, 32):
        for i in range(0, 256, 32):
            x, y = i + (16 if (j // 32) % 2 else 0), j + 16
            if motif == 'kiri':                                                              # a paulownia crest
                for a in (-0.6, 0, 0.6): dab(d, x + math.sin(a) * 7, y - 6 + abs(a) * 4, 4, 7, (214, 176, 84))
                d.line([x - 6, y + 3, x + 6, y + 3], fill=(214, 176, 84), width=2); d.line([x, y - 2, x, y + 7], fill=(214, 176, 84), width=2)
            else:                                                                            # a flower roundel
                for k in range(6):
                    a = k / 6 * 6.283; dab(d, x + math.cos(a) * 5, y + math.sin(a) * 5, 5, 5, motif)
                dab(d, x, y, 4, 4, (240, 220, 150))
    if edge:
        for k, c in enumerate(edge): d.rectangle([0, 256 - 14 - k * 10, 255, 256 - 4 - k * 10], fill=c)   # layered hems at the cuff
    save(im, name)


brocade('hd_robe_m', (30, 30, 46), 'kiri', edge=[(190, 40, 40), (230, 220, 200)])                     # the emperor's sokutai
brocade('hd_robe_f', (178, 34, 52), (236, 196, 96), edge=[(120, 160, 70), (150, 70, 150), (236, 226, 206), (220, 150, 50)])  # the empress
random.seed('hakama')
im, d = paint(128, 128, (236, 230, 214), k=(0.97, 1.03)); save(im, 'hd_white')
random.seed('face')
im = Image.new('RGB', (256, 256), (246, 238, 228)); d = ImageDraw.Draw(im)
for sx in (-1, 1):
    dab(d, 128 + sx * 34, 84, 26, 12, (150, 150, 150))                                     # hikimayu: the high painted brows
    d.arc([128 + sx * 32 - 16, 120, 128 + sx * 32 + 16, 140], 200 if sx < 0 else 200, 340, fill=(30, 24, 24), width=4)   # long narrow eyes
d.ellipse([118, 176, 138, 188], fill=(196, 40, 52)); d.line([120, 182, 136, 182], fill=(120, 20, 30), width=2)   # small red lips
save(im, 'hd_face')
random.seed('hair')
im, d = paint(128, 128, (18, 16, 20), k=(0.8, 1.6), w=(2, 4), h=(16, 40)); save(im, 'hd_hair')   # combed, glossy
random.seed('shaku')
im, d = paint(64, 128, (196, 160, 110), k=(0.94, 1.05), w=(2, 5), h=(20, 50)); save(im, 'hd_wood')
random.seed('fan')
im = Image.new('RGB', (256, 128), (236, 226, 200)); d = ImageDraw.Draw(im)
for k, c in enumerate([(200, 40, 60), (240, 180, 60), (90, 140, 70), (120, 80, 160), (220, 120, 150)]):
    d.rectangle([k * 52, 0, k * 52 + 40, 127], fill=c)
for x in range(0, 256, 12): d.line([x, 0, x, 127], fill=(150, 120, 80))
d.rectangle([0, 0, 255, 10], fill=(214, 176, 84))
save(im, 'hd_fan')

# ------------------------------------------------------------------ accessories: lanterns, trees, rice cakes
random.seed('bonbori')
im, d = paint(256, 256, (246, 238, 222), k=(0.98, 1.02), w=(10, 30), h=(4, 10))
for k in range(5):                                                                          # cherry sprays painted on the shade
    cx, cy = R(30, 226), R(80, 200)
    d.line([cx - 30, cy + 20, cx + 20, cy - 10], fill=(110, 70, 50), width=3)
    for _ in range(6): dab(d, cx + R(-28, 24), cy + R(-14, 18), 9, 9, (236, 150, 170))
for x in range(0, 256, 64): d.line([x, 0, x, 255], fill=(60, 40, 30), width=3)             # the wooden ribs
d.rectangle([0, 0, 255, 22], fill=(26, 20, 20)); d.rectangle([0, 234, 255, 255], fill=(26, 20, 20))
save(im, 'hd_bonbori')
random.seed('leaf')
im, d = paint(128, 128, (52, 110, 58), k=(0.85, 1.2), w=(6, 12), h=(4, 8))
save(im, 'hd_leaf')
im2 = im.copy(); d2 = ImageDraw.Draw(im2)
for _ in range(10): x, y = R(6, 122), R(6, 122); dab(d2, x, y, 13, 13, (236, 150, 40)); dab(d2, x - 2, y - 2, 4, 4, (252, 210, 120))   # tachibana oranges
save(im2, 'hd_tachibana')
random.seed('sakura')
im, d = paint(128, 128, (236, 176, 194), k=(0.9, 1.08), w=(5, 10), h=(5, 10))
for _ in range(60): dab(d, R(0, 128), R(0, 128), 6, 6, random.choice([(250, 220, 230), (220, 120, 150), (246, 196, 210)]))
save(im, 'hd_sakura')
random.seed('mochi')
im = Image.new('RGB', (64, 192), (240, 236, 228)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 63, 63], fill=(236, 150, 170)); d.rectangle([0, 128, 63, 191], fill=(120, 170, 90))
for y0 in (0, 64, 128):
    for _ in range(14): dab(d, R(0, 64), R(y0, y0 + 64), 8, 4, tone(im.getpixel((32, y0 + 32)), R(0.95, 1.04)))
save(im, 'hd_mochi')

# ------------------------------------------------------------------ the space-pod exhibit: riveted panels, decals, portholes
random.seed('pod hull')
im, d = paint(1024, 256, (196, 204, 214), k=(0.97, 1.03), w=(20, 50), h=(4, 10))
for x in range(0, 1024, 128):                                                              # panel seams + rivet rows
    d.line([x, 0, x, 255], fill=(120, 128, 142), width=3)
    for y in range(12, 256, 20): d.ellipse([x + 6, y - 3, x + 12, y + 3], fill=(150, 158, 172)); d.point((x + 8, y - 2), fill=(236, 240, 246))
for y in (6, 249): d.line([0, y, 1023, y], fill=(120, 128, 142), width=3)
d.rectangle([0, 96, 1023, 160], fill=(200, 60, 50))                                        # the red band
for x in range(0, 1024, 256): text(d, (x + 128, 128), 'STAR POD-7', 32, (250, 246, 232), 'mm')
for x in (60, 316, 572, 828): text(d, (x, 196), 'NO STEP', 16, (60, 64, 74), 'mm')
for _ in range(40): x, y = R(0, 1024), R(0, 256); dab(d, x, y, R(3, 10), R(2, 5), (150, 154, 160))   # chips and scuffs
for _ in range(12): x = R(0, 1024); d.line([x, 160, x + R(-3, 3), 160 + R(20, 60)], fill=(170, 120, 90), width=2)   # rust runs under the band
save(im, 'sp2_hull')
random.seed('pod skirt')
im, d = paint(512, 128, (58, 62, 72), k=(0.9, 1.1)); d.line([0, 10, 511, 10], fill=(110, 116, 128), width=3)
for x in range(16, 512, 32): d.rectangle([x, 100, x + 16, 116], fill=(230, 190, 50)); d.polygon([(x + 16, 100), (x + 24, 100), (x + 16, 116)], fill=(30, 30, 34))   # hazard chevrons
save(im, 'sp2_skirt')
random.seed('porthole')
im, d = paint(256, 256, (22, 30, 46), k=(0.9, 1.15), w=(30, 80), h=(10, 30))                  # dark tinted glass
for x, y in ((90, 150), (170, 110), (128, 190)): dab(d, x, y, 10, 6, (255, 200, 110))  # the cabin's little lamps behind the glass
d.polygon([(30, 210), (60, 200), (100, 60), (70, 70)], fill=(70, 90, 140))                 # the glass's reflection
save(im, 'sp2_port')
random.seed('chrome')
im, d = paint(128, 32, (214, 220, 228), k=(0.85, 1.12), w=(10, 30), h=(1, 3)); d.line([0, 10, 127, 10], fill=(252, 252, 255), width=3)
save(im, 'sp2_chrome')
random.seed('pod top')
im = Image.new('RGB', (512, 512), (40, 44, 56)); d = ImageDraw.Draw(im)
for k in range(12):
    a = k / 12 * 6.283; d.line([256, 256, 256 + math.cos(a) * 250, 256 + math.sin(a) * 250], fill=(70, 76, 90), width=4)
d.ellipse([40, 40, 472, 472], outline=(120, 128, 142), width=8)
text(d, (256, 150), 'TURN TABLE', 32, (230, 190, 50), 'mm')
save(im, 'sp2_deck')
random.seed('beacon')
im, d = paint(64, 64, (230, 60, 50), k=(0.9, 1.15)); dab(d, 22, 20, 14, 10, (255, 180, 160)); save(im, 'sp2_beacon')
print('ok', len(os.listdir(OUT)), 'textures in', OUT)
