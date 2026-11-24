"""Hand-painted source textures for the round-4 own models (art/lowpix/world/made/r4_props.py): the twin-tub washer, the
can / PET recycling cage and its bottles, a cigarette, a granny's shopping cart, Grandpa's notebook, the bush guy's
cardboard sign, a hat box, a gold-leaf byobu, a shrine-case roof, the space pod's base and a diorama landscape. Brush
dabs and painted detail, no per-pixel noise; every word is DotGothic16 (pixel art) at 16 px multiples, in English.
Run: python3 art/lowpix/world/made/r4_paint.py   (writes art/lowpix/world/made/r4_tex/*.png)"""
import os, math, random
from PIL import Image, ImageDraw, ImageFont

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'r4_tex')
os.makedirs(OUT, exist_ok=True)
FONT = os.path.join(H, '..', '..', '..', '..', 'shots', '.art-cache', 'fonts', 'DotGothic16-Regular.ttf')
random.seed(404)
R = random.uniform


def font(px):
    assert px % 16 == 0, px
    return ImageFont.truetype(FONT, px)


def text(d, xy, s, px, fill, anchor='la'):
    d.fontmode = '1'  # hard pixels, no anti-aliasing
    d.text(xy, s, font=font(px), fill=fill, anchor=anchor)


def tone(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + tuple(c[3:])


def dab(d, x, y, w, h, c):
    x0, x1 = sorted((x - w / 2, x + w / 2)); y0, y1 = sorted((y - h / 2, y + h / 2))
    d.ellipse([x0, y0, x1, y1], fill=c)


def paint(W, H_, c, n=0, k=(0.95, 1.04), w=(8, 22), h=(3, 8), mode='RGB', wrap=True):
    """A base coat laid in soft horizontal brush dabs (the colour varies a few percent, never noise)."""
    im = Image.new(mode, (W, H_), c); d = ImageDraw.Draw(im)
    n = n or int(W * H_ / 90)
    for _ in range(n):
        x, y = R(0, W), R(0, H_); cc = tone(c, R(*k)); ww, hh = R(*w), R(*h)
        for ox in ((0, -W, W) if wrap else (0,)):
            dab(d, x + ox, y, ww, hh, cc)
    return im, d


def save(im, name):
    im.save(os.path.join(OUT, name + '.png'))


def scuffs(d, W, H_, n, col, y0=0.0, y1=1.0, size=(3, 9)):
    for _ in range(n):
        x, y = R(0, W), R(y0 * H_, y1 * H_)
        dab(d, x, y, R(*size), R(1, 3), col)


# ------------------------------------------------------------------ twin tub (二槽式洗濯機)
ENAMEL = (238, 234, 222)
im, d = paint(512, 512, ENAMEL, k=(0.97, 1.02))
d.rectangle([0, 448, 511, 511], fill=(176, 196, 204))                       # the kick band
for _ in range(160): dab(d, R(0, 512), R(448, 512), R(8, 20), R(2, 5), tone((176, 196, 204), R(0.95, 1.04)))
d.line([0, 447, 511, 447], fill=(150, 150, 146), width=2)
for x in (6, 505): d.line([x, 0, x, 447], fill=(214, 210, 198), width=2)  # the folded panel edges
d.rectangle([40, 40, 216, 88], fill=(196, 200, 206)); d.rectangle([40, 40, 216, 88], outline=(120, 124, 130), width=2)
d.line([42, 43, 214, 43], fill=(236, 238, 240))
text(d, (128, 64), 'HAKUCHO', 32, (36, 52, 96), 'mm')                       # the (original) maker's badge
d.rectangle([300, 120, 470, 252], fill=(250, 248, 240)); d.rectangle([300, 120, 470, 252], outline=(196, 52, 46), width=4)
text(d, (385, 142), 'TWIN TUB', 16, (196, 52, 46), 'mm')
for i, s in enumerate(['WASH  3.0 kg', 'SPIN  2.5 kg', 'AC 100V 50Hz']):
    text(d, (316, 170 + i * 24), s, 16, (50, 50, 56))
for x in range(330, 460, 12): d.line([x, 420, x + 4, 420], fill=(120, 120, 118), width=1)  # louvre slits
for i in range(6): d.rectangle([150 + i * 36, 404, 172 + i * 36, 410], fill=(150, 150, 146))
scuffs(d, 512, 512, 26, (206, 200, 186), 0.6, 0.86)
for x, y in ((24, 436), (488, 432), (470, 440)): dab(d, x, y, 5, 3, (168, 120, 84))  # three pin-points of rust
save(im, 'tt_front')
im, d = paint(512, 512, ENAMEL, k=(0.99, 1.01), w=(20, 40), h=(6, 12))   # (calm: a big plain enamel side)
d.rectangle([0, 448, 511, 511], fill=(176, 196, 204)); d.line([0, 447, 511, 447], fill=(150, 150, 146), width=3)
for y in range(300, 412, 16): d.rectangle([360, y, 472, y + 6], fill=(150, 152, 150))     # the motor vent
save(im, 'tt_side')
AQUA = (130, 196, 200)
im, d = paint(256, 256, AQUA); save(im, 'tt_deck')
for name, label, W in (('tt_lid_wash', 'WASH', 512), ('tt_lid_spin', 'SPIN', 256)):
    # (the lids share the deck's aqua: a paler blue would bridge the cream body and the aqua in lowpix's colour groups)
    im, d = paint(W, 384, (136, 198, 202), k=(0.97, 1.03))
    for x in range(12, W - 12, 16): d.line([x, 30, x, 300], fill=(118, 180, 186), width=3)   # moulded ribs
    d.rectangle([W // 2 - 60, 318, W // 2 + 60, 366], fill=(96, 150, 158))                   # the finger pull
    d.line([W // 2 - 58, 320, W // 2 + 58, 320], fill=(70, 116, 126), width=2)
    text(d, (W // 2, 14), label, 16, (40, 70, 86), 'mt')
    d.rectangle([0, 0, W - 1, 383], outline=(110, 150, 164), width=3)
    save(im, name)
im = Image.new('RGB', (256, 256), (40, 70, 74)); d = ImageDraw.Draw(im)
d.ellipse([28, 28, 228, 228], fill=(70, 104, 108)); d.ellipse([60, 60, 196, 196], fill=(50, 82, 86))
for k in range(36):
    a = k / 36 * 6.283
    for rr in (82, 96):
        x, y = 128 + math.cos(a + rr) * rr, 128 + math.sin(a + rr) * rr; dab(d, x, y, 7, 7, (28, 46, 50))
d.ellipse([112, 112, 144, 144], fill=(96, 130, 132))
d.polygon([(30, 200), (70, 200), (200, 40), (160, 40)], fill=(96, 138, 142)); d.polygon([(84, 214), (100, 214), (226, 60), (210, 60)], fill=(84, 124, 128))
d.rectangle([0, 0, 255, 255], outline=(120, 160, 172), width=8)
save(im, 'tt_window')
im, d = paint(512, 256, (232, 236, 232), k=(0.97, 1.02))
d.rectangle([0, 0, 511, 40], fill=AQUA)
text(d, (16, 6), 'HAKUCHO', 32, (250, 252, 250))
text(d, (496, 12), 'TWIN TUB', 16, (36, 70, 80), 'ra')
for cx, lab, nums in ((96, 'WASH TIMER', ['0', '5', '10', '15']), (256, 'SELECT', ['SOFT', 'STD', 'HARD']), (416, 'SPIN TIMER', ['0', '1', '3', '5'])):
    cy = 150
    for k in range(len(nums)):
        a = math.radians(-120 + 240 * k / (len(nums) - 1))
        x, y = cx + math.sin(a) * 62, cy - math.cos(a) * 62
        text(d, (x, y), nums[k], 16, (50, 50, 56), 'mm')
        d.line([cx + math.sin(a) * 44, cy - math.cos(a) * 44, cx + math.sin(a) * 50, cy - math.cos(a) * 50], fill=(60, 60, 66), width=3)
    text(d, (cx, 232), lab, 16, (36, 70, 80), 'mm')
save(im, 'tt_panel')
im = Image.new('RGB', (128, 128), (226, 228, 226)); d = ImageDraw.Draw(im)
d.ellipse([10, 10, 118, 118], fill=(244, 246, 244)); d.ellipse([10, 10, 118, 118], outline=(150, 152, 150), width=4)
d.rectangle([58, 14, 70, 64], fill=(206, 52, 46)); save(im, 'tt_knob')
im = Image.new('RGB', (128, 128), (200, 202, 200)); d = ImageDraw.Draw(im)
for x in range(0, 128, 8): d.rectangle([x, 0, x + 3, 127], fill=(168, 170, 168))
save(im, 'tt_knob_side')
im = Image.new('RGB', (128, 512), (104, 110, 116)); d = ImageDraw.Draw(im)
for y in range(0, 512, 12): d.rectangle([0, y, 127, y + 4], fill=(80, 86, 92)); d.line([0, y + 6, 127, y + 6], fill=(132, 138, 144))
save(im, 'tt_hose')
im, d = paint(128, 128, (52, 52, 56)); save(im, 'tt_rubber')
im, d = paint(256, 128, (92, 96, 100)); scuffs(d, 256, 128, 12, (120, 124, 126)); save(im, 'tt_plinth')

# ------------------------------------------------------------------ recycling cage (缶・ペットボトル回収かご)
im, d = paint(256, 64, (52, 108, 84), k=(0.95, 1.05))
for _ in range(16): dab(d, R(0, 256), R(0, 64), R(3, 8), R(2, 4), (150, 156, 150))  # chipped paint
save(im, 'rc_frame')
im = Image.new('RGBA', (512, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
step = 32
for k in range(0, 512 + step, step):
    d.rectangle([k - 2, 0, k + 2, 511], fill=(170, 176, 180, 255)); d.line([k - 1, 0, k - 1, 511], fill=(214, 218, 220, 255))
    d.rectangle([0, k - 2, 511, k + 2], fill=(158, 164, 168, 255)); d.line([0, k - 1, 511, k - 1], fill=(206, 210, 212, 255))
for x in range(0, 512 + step, step):
    for y in range(0, 512 + step, step): d.rectangle([x - 3, y - 3, x + 3, y + 3], fill=(120, 126, 130, 255))  # the welds
save(im, 'rc_mesh')
im, d = paint(512, 256, (244, 242, 234), k=(0.98, 1.02))
d.rectangle([0, 0, 511, 64], fill=(46, 120, 80))
text(d, (256, 32), 'RECYCLING', 32, (250, 250, 246), 'mm')
text(d, (130, 118), 'CANS', 32, (196, 52, 46), 'mm'); text(d, (370, 118), 'PET BOTTLES', 32, (40, 90, 170), 'mm')
d.line([256, 84, 256, 152], fill=(170, 168, 160), width=2)
text(d, (256, 186), 'Rinse, squash, caps off.', 16, (50, 50, 56), 'mm')
text(d, (256, 214), 'Collected Tue / Fri', 16, (50, 50, 56), 'mm')
d.rectangle([0, 0, 511, 255], outline=(46, 120, 80), width=6)
for x, y in ((14, 80), (498, 80), (14, 242), (498, 242)): d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(150, 150, 146))
save(im, 'rc_sign')
CLEAR = (198, 222, 230)
for i, (band, ink, word, cap) in enumerate([((214, 170, 70), (90, 50, 20), 'MUGI CHA', (240, 240, 236)),
                                            ((40, 120, 200), (250, 250, 246), 'OCEAN SODA', (40, 90, 170)),
                                            ((70, 140, 70), (250, 250, 246), 'GREEN TEA', (40, 110, 60)),
                                            ((240, 220, 80), (60, 110, 40), 'LEMON WATER', (250, 210, 60))]):
    im, d = paint(256, 512, CLEAR, k=(0.97, 1.03))
    for x in (40, 46): d.line([x, 0, x, 511], fill=(236, 246, 250), width=4)            # the highlight
    for y in (60, 110, 400): d.line([0, y, 255, y], fill=(176, 204, 214), width=3)       # moulded rings
    d.rectangle([0, 200, 255, 330], fill=band)                                          # the label band
    for _ in range(40): dab(d, R(0, 256), R(204, 326), R(8, 20), R(3, 6), tone(band, R(0.94, 1.05)))
    text(d, (128, 265), word, 32 if len(word) <= 8 else 16, ink, 'mm')
    d.rectangle([0, 470, 255, 511], fill=cap)                                           # the cap (top of the lathe)
    for x in range(0, 256, 10): d.line([x, 470, x, 511], fill=tone(cap, 0.85))
    save(im, f'rc_pet{i}')
for i, (body, ink, word) in enumerate([((200, 44, 40), (250, 250, 246), 'KICK COLA'), ((246, 140, 30), (250, 250, 246), 'SUNNY'),
                                       ((40, 70, 150), (240, 220, 90), 'BLUE SKY'), ((110, 70, 40), (240, 226, 200), 'COFFEE')]):
    im, d = paint(256, 256, body, k=(0.95, 1.05))
    d.rectangle([0, 0, 255, 26], fill=(196, 200, 206)); d.rectangle([0, 230, 255, 255], fill=(196, 200, 206))
    d.line([0, 30, 255, 30], fill=tone(body, 0.8), width=2)
    for x in range(0, 256, 4): d.point((x, 30 + int(10 * math.sin(x / 256 * 6.283 * 2))), fill=ink)
    text(d, (64, 128), word, 32 if len(word) <= 5 else 16, ink, 'mm'); text(d, (192, 128), word, 32 if len(word) <= 5 else 16, ink, 'mm')
    text(d, (128, 200), '350 ml', 16, ink, 'mm')
    save(im, f'rc_can{i}')

# ------------------------------------------------------------------ a cigarette (v: filter end -> lit end)
im = Image.new('RGB', (64, 256), (244, 242, 236)); d = ImageDraw.Draw(im)
d.rectangle([0, 0, 63, 70], fill=(206, 142, 70))
for _ in range(60): dab(d, R(0, 64), R(0, 70), R(2, 4), R(2, 4), (226, 178, 110))         # cork speckle
d.rectangle([0, 70, 63, 74], fill=(214, 182, 90))
for y in range(80, 236, 22): d.line([0, y, 63, y], fill=(232, 230, 224))
d.rectangle([0, 236, 63, 250], fill=(150, 146, 140)); d.rectangle([0, 250, 63, 255], fill=(230, 80, 40))
for x in range(0, 64, 9): dab(d, x, 252, 5, 4, (255, 170, 60))
save(im, 'cig')

# ------------------------------------------------------------------ the granny cart (ショッピングカート)
im = Image.new('RGB', (512, 512), (36, 58, 46)); d = ImageDraw.Draw(im)
for k in range(0, 512, 64):                                                                  # an (original) tartan sett
    d.rectangle([k, 0, k + 22, 511], fill=(28, 40, 72)); d.rectangle([0, k, 511, k + 22], fill=(28, 40, 72))
    d.rectangle([k + 36, 0, k + 40, 511], fill=(176, 40, 46)); d.rectangle([0, k + 36, 511, k + 40], fill=(176, 40, 46))
    d.line([k + 50, 0, k + 50, 511], fill=(226, 200, 120)); d.line([0, k + 50, 511, k + 50], fill=(226, 200, 120))
im2 = im.copy(); d2 = ImageDraw.Draw(im2)
for _ in range(1600): x, y = R(0, 512), R(0, 512); c = im.getpixel((int(x) % 512, int(y) % 512)); d2.line([x, y, x + 3, y + 3], fill=tone(c, R(0.88, 1.08)))  # twill
im = im2; d = ImageDraw.Draw(im)
d.rectangle([0, 0, 511, 30], fill=(28, 34, 52)); d.rectangle([0, 482, 511, 511], fill=(28, 34, 52))
for x in range(0, 512, 16): d.line([x, 4, x + 8, 26], fill=(60, 66, 84), width=2)          # the drawstring hem
save(im, 'cart_bag')
im, d = paint(256, 64, (186, 190, 196), k=(0.94, 1.05)); d.line([0, 18, 255, 18], fill=(226, 230, 234), width=3); save(im, 'cart_frame')
im = Image.new('RGB', (128, 128), (40, 40, 44)); d = ImageDraw.Draw(im)
d.ellipse([22, 22, 106, 106], fill=(176, 180, 186)); d.ellipse([52, 52, 76, 76], fill=(110, 114, 120))
for k in range(5):
    a = k / 5 * 6.283; d.line([64, 64, 64 + math.cos(a) * 38, 64 + math.sin(a) * 38], fill=(140, 144, 150), width=6)
d.ellipse([22, 22, 106, 106], outline=(110, 114, 120), width=3)
save(im, 'cart_wheel')
im, d = paint(128, 64, (34, 34, 38)); save(im, 'cart_rubber')

# ------------------------------------------------------------------ Grandpa's notebook
im, d = paint(512, 512, (52, 64, 92), k=(0.93, 1.06), w=(4, 10), h=(4, 10))                # cloth, worn
for _ in range(120): x, y = R(0, 512), R(0, 512); d.line([x, y, x + R(4, 12), y], fill=(64, 78, 108))
for y0 in (0, 488): d.rectangle([0, y0, 511, y0 + 23], fill=(70, 84, 112))                 # rubbed edges
d.rectangle([140, 150, 372, 300], fill=(234, 222, 190)); d.rectangle([140, 150, 372, 300], outline=(120, 96, 70), width=3)
d.line([150, 236, 362, 236], fill=(170, 150, 120)); d.line([150, 268, 362, 268], fill=(170, 150, 120))
text(d, (256, 190), 'NOTES', 32, (40, 40, 60), 'mm')
text(d, (256, 252), 'K. Morioka', 16, (60, 60, 80), 'mm')
for _ in range(30): dab(d, R(0, 512), R(0, 512), R(4, 12), R(2, 4), (84, 96, 122))
save(im, 'nb_cover')
im = Image.new('RGB', (256, 64), (236, 228, 206)); d = ImageDraw.Draw(im)
for y in range(2, 64, 3): d.line([0, y, 255, y], fill=(214, 204, 180))
save(im, 'nb_pages')
im, d = paint(128, 128, (40, 48, 72)); save(im, 'nb_spine')

# ------------------------------------------------------------------ the bush guy's sign: NOT A BUSH (cardboard, marker)
im, d = paint(512, 256, (196, 160, 108), k=(0.94, 1.05))
for y in range(0, 256, 7): d.line([0, y, 511, y], fill=(186, 150, 100))                    # the corrugation shows through
for _ in range(14): dab(d, R(0, 512), R(0, 256), R(20, 60), R(6, 14), (182, 144, 96))       # damp patches
text(d, (256, 70), 'NOT A', 64, (36, 30, 28), 'mm')
text(d, (256, 172), 'BUSH', 64, (184, 40, 36), 'mm')
for x in range(0, 512, 6): d.point((x, int(R(0, 4))), fill=(150, 116, 74)); d.point((x, 255 - int(R(0, 4))), fill=(150, 116, 74))
save(im, 'sign_card')
im, d = paint(64, 256, (118, 84, 52), w=(2, 5), h=(10, 30))
for x in (14, 40): d.line([x, 0, x, 255], fill=(96, 66, 40))
save(im, 'sign_stick')

# ------------------------------------------------------------------ a hat box (stripes) and its lid
im = Image.new('RGB', (512, 128), (242, 228, 206)); d = ImageDraw.Draw(im)
for x in range(0, 512, 64): d.rectangle([x, 0, x + 31, 127], fill=(226, 148, 156))
for _ in range(500): x, y = R(0, 512), R(0, 128); c = im.getpixel((int(x) % 512, int(y) % 128)); dab(d, x, y, R(6, 14), R(2, 4), tone(c, R(0.96, 1.03)))
d.rectangle([0, 116, 511, 127], fill=(200, 116, 126))
save(im, 'hb_side')
im, d = paint(256, 256, (242, 228, 206), k=(0.97, 1.03))
d.ellipse([8, 8, 248, 248], outline=(200, 116, 126), width=10)
text(d, (128, 128), 'MAISON ASAHI', 16, (170, 90, 100), 'mm')
save(im, 'hb_lid')
im, d = paint(256, 64, (214, 128, 138)); save(im, 'hb_rim')

# ------------------------------------------------------------------ museum: gold-leaf byobu (金屏風), lacquer, brass
im = Image.new('RGB', (512, 1024), (214, 172, 74)); d = ImageDraw.Draw(im)
S = 128                                                                                     # one leaf: four across a panel
for j in range(0, 1024, S):
    for i in range(0, 512, S):
        c = tone((222, 180, 80), R(0.985, 1.02))                                            # leaf to leaf: barely different
        d.rectangle([i, j, i + S - 1, j + S - 1], fill=c)
        for _ in range(24): dab(d, R(i, i + S), R(j, j + S), R(16, 40), R(3, 7), tone(c, R(0.985, 1.015)))
        d.line([i, j, i + S, j], fill=tone(c, 0.94)); d.line([i, j, i, j + S], fill=tone(c, 0.95))   # the faint overlap seams
for _ in range(30):                                                                         # tiny cracks in the leaf
    x, y = R(0, 512), R(0, 1024); d.line([x, y, x + R(-10, 10), y + R(4, 12)], fill=(170, 130, 54))
save(im, 'by_gold')
im, d = paint(128, 128, (30, 22, 20), k=(0.9, 1.2)); d.line([0, 20, 127, 20], fill=(70, 50, 40), width=2); save(im, 'by_lacquer')
im, d = paint(64, 64, (196, 160, 80), k=(0.9, 1.1)); d.rectangle([4, 4, 60, 60], outline=(150, 118, 56), width=3); save(im, 'by_brass')

# ------------------------------------------------------------------ museum: the shrine case's roof (copper, aged green)
im = Image.new('RGB', (512, 512), (82, 140, 116)); d = ImageDraw.Draw(im)
for y in range(0, 512, 32):                                                                 # copper plates, staggered
    off = 32 if (y // 32) % 2 else 0
    for x in range(-64, 512, 64):
        c = tone((86, 146, 120), R(0.9, 1.08)); d.rectangle([x + off, y, x + off + 62, y + 30], fill=c)
        for _ in range(4): dab(d, R(x + off, x + off + 62), R(y, y + 30), R(6, 18), R(2, 5), tone(c, R(0.92, 1.08)))
        d.line([x + off, y + 30, x + off + 62, y + 30], fill=(52, 96, 80), width=2)
for _ in range(40): dab(d, R(0, 512), R(0, 512), R(3, 8), R(2, 4), (150, 104, 60))          # bare copper showing through
save(im, 'sr_copper')
im, d = paint(256, 64, (92, 62, 40), w=(10, 30), h=(1, 3))
for y in (10, 30, 50): d.line([0, y, 255, y], fill=(76, 50, 32))
save(im, 'sr_wood')
im, d = paint(64, 64, (204, 166, 76), k=(0.9, 1.1)); save(im, 'sr_gold')

# ------------------------------------------------------------------ museum: the space pod's base
im, d = paint(512, 128, (172, 180, 196), k=(0.96, 1.04))
for x in range(0, 512, 64):
    d.line([x, 0, x, 127], fill=(120, 128, 146), width=2)
    for y in (10, 118): d.ellipse([x + 6, y - 3, x + 12, y + 3], fill=(130, 138, 156))      # rivets
d.rectangle([0, 52, 511, 74], fill=(110, 220, 255))                                         # the light band
for x in range(0, 512, 16): d.rectangle([x, 56, x + 9, 70], fill=(190, 244, 255))
save(im, 'sp_side')
im = Image.new('RGB', (512, 512), (16, 20, 52)); d = ImageDraw.Draw(im)
for _ in range(160):
    x, y = int(R(0, 512)), int(R(0, 512)); s = random.choice([1, 1, 1, 2, 2, 3])
    d.rectangle([x, y, x + s, y + s], fill=random.choice([(255, 255, 255), (200, 220, 255), (255, 240, 200)]))
for x, y in ((120, 160), (380, 300), (260, 420)):                                           # a few cross-shaped bright stars
    d.rectangle([x - 6, y, x + 6, y + 1], fill=(255, 255, 255)); d.rectangle([x, y - 6, x + 1, y + 6], fill=(255, 255, 255))
d.ellipse([4, 4, 508, 508], outline=(150, 160, 180), width=14)
save(im, 'sp_top')

# ------------------------------------------------------------------ a plastic carrier bag from the corner shop (Mikawaya)
im, d = paint(512, 512, (240, 240, 236), k=(0.985, 1.015), w=(20, 40), h=(4, 8))
for _ in range(26):                                                                         # creases in the thin plastic
    x, y, L, a = R(0, 512), R(0, 512), R(30, 120), R(-0.6, 0.6)
    d.line([x, y, x + math.cos(a) * L, y + math.sin(a) * L], fill=(214, 214, 210), width=2)
    d.line([x, y + 3, x + math.cos(a) * L, y + 3 + math.sin(a) * L], fill=(252, 252, 250), width=1)
d.rectangle([0, 150, 511, 166], fill=(204, 46, 40))
text(d, (256, 230), 'MIKAWAYA', 64, (204, 46, 40), 'mm')
text(d, (256, 300), 'GROCER  SINCE 1952', 16, (204, 46, 40), 'mm')
save(im, 'sb_plastic')

# ------------------------------------------------------------------ the ofuro: glazed tiles (5 cm), hinoki, chrome
for name, glaze in (('tb_tile', (120, 182, 210)), ('tb_tile_in', (150, 204, 226))):
    im = Image.new('RGB', (512, 512), (214, 222, 222)); d = ImageDraw.Draw(im)
    S = 51.2
    for j in range(10):
        for i in range(10):
            x0, y0 = round(i * S) + 3, round(j * S) + 3; x1, y1 = round((i + 1) * S) - 3, round((j + 1) * S) - 3
            c = tone(glaze, R(0.97, 1.03)); d.rectangle([x0, y0, x1, y1], fill=c)
            d.line([x0 + 4, y0 + 4, x0 + 16, y0 + 4], fill=tone(c, 1.25), width=2)                 # the glaze's highlight
            d.line([x0, y1, x1, y1], fill=tone(c, 0.88))
    save(im, name)
im, d = paint(512, 128, (226, 198, 152), k=(0.97, 1.03), w=(20, 60), h=(1, 3))
for y in range(6, 128, 11): d.line([0, y + R(-2, 2), 511, y + R(-2, 2)], fill=(206, 174, 128))
save(im, 'tb_hinoki')
im, d = paint(64, 64, (200, 206, 212), k=(0.9, 1.1)); d.line([0, 20, 63, 20], fill=(240, 244, 248), width=3); save(im, 'tb_chrome')

# ------------------------------------------------------------------ museum: diorama landscape (top-down painting)
W, Hh = 1024, 640
im, d = paint(W, Hh, (104, 168, 76), k=(0.92, 1.08), w=(10, 26), h=(6, 14))
for _ in range(500): dab(d, R(0, W), R(0, Hh), R(4, 10), R(3, 6), random.choice([(130, 190, 90), (84, 146, 60), (150, 200, 100)]))
pts = [(x, Hh / 2 + math.sin(x / W * 6.283 * 1.1) * 120 / 0.9 * 0.6) for x in range(0, W + 1, 8)]   # the river (matches the mesh)
for x, y in pts: dab(d, x, y, 70, 66, (152, 128, 90))                                       # banks
for x, y in pts: dab(d, x, y, 50, 46, (70, 140, 200))
for x, y in pts[::3]: d.line([x - 10, y - 6, x + 6, y - 6], fill=(170, 214, 240), width=2)   # ripples
for k in range(0, W, 6): dab(d, k, Hh * 0.82 + math.sin(k / 70) * 20, 8, 8, (196, 172, 120))   # a footpath
save(im, 'dio_top')
im, d = paint(256, 128, (124, 96, 66), w=(6, 16), h=(2, 5))
for y in range(20, 128, 22): d.line([0, y, 255, y], fill=(104, 80, 54), width=2)
save(im, 'dio_side')
print('ok', len(os.listdir(OUT)), 'textures in', OUT)
