"""Hand-painted source textures for the round-6 furniture (r6_props.py): the pieces that replace the old code-block
furniture (counters, kitchen steel, hoods, shelves, signboards, poles). Painted brushwork with soft wear, no per-pixel
noise; lowpix turns them into the game's pixel art. Run: python3 art/lowpix/world/made/r6_paint.py"""
import os, random, math
from PIL import Image, ImageDraw, ImageFilter
H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'r6_tex')
os.makedirs(OUT, exist_ok=True)
random.seed(606)
S = 512


def wear(im, amt=20, edge=True):
    """Soft dark blotches, a few scratches, darker edges (dirt where hands and mops don't reach)."""
    W, Hh = im.size
    lay = Image.new('L', (W, Hh), 0); d = ImageDraw.Draw(lay)
    for _ in range(max(8, W * Hh // 8000)):
        x, y, r = random.randrange(W), random.randrange(Hh), random.randint(8, 30)
        d.ellipse([x - r, y - r * 0.6, x + r, y + r * 0.6], fill=random.randint(amt // 2, amt))
    for _ in range(max(5, W * Hh // 18000)):
        x, y = random.randrange(W), random.randrange(Hh)
        d.line([x, y, x + random.randint(-40, 40), y + random.randint(-5, 5)], fill=amt * 2, width=1)
    if edge:
        for k in range(10): d.rectangle([k, k, W - 1 - k, Hh - 1 - k], outline=int(amt * (1 - k / 10)))
    lay = lay.filter(ImageFilter.GaussianBlur(2.5))
    dark = Image.new('RGB', (W, Hh), (52, 44, 36))
    return Image.composite(dark, im.convert('RGB'), lay.point(lambda v: min(95, v)))


def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def wood(name, base, dark, light, plank=0, knots=3):
    """Brush-stroke wood: long wavy grain strokes in two tones, a few knots, optional plank seams every `plank` px."""
    im = Image.new('RGB', (S, S), base); d = ImageDraw.Draw(im)
    for _ in range(260):
        y = random.uniform(0, S); amp = random.uniform(0.5, 3); ph = random.uniform(0, 6); w = random.choice([1, 1, 2, 2, 3])
        c = mix(dark, light, random.random()) if random.random() < 0.7 else mix(base, dark, random.uniform(0.3, 0.7))
        pts = [(x, y + math.sin(x / random.uniform(40, 90) + ph) * amp) for x in range(-8, S + 9, 8)]
        d.line(pts, fill=c, width=w)
    for _ in range(knots):
        x, y = random.randrange(40, S - 40), random.randrange(20, S - 20)
        for r in range(12, 2, -3): d.ellipse([x - r * 1.8, y - r * 0.7, x + r * 1.8, y + r * 0.7], outline=mix(dark, base, r / 14), width=2)
        d.ellipse([x - 4, y - 2, x + 4, y + 2], fill=dark)
    if plank:
        for y in range(0, S, plank):
            d.line([(0, y), (S, y)], fill=mix(dark, (20, 14, 10), 0.5), width=3)
            d.line([(0, y + 3), (S, y + 3)], fill=light, width=1)
    wear(im, 16).save(os.path.join(OUT, name + '.png'))


def metal(name, base, streak, rust=0, brushed=True):
    im = Image.new('RGB', (S, S), base); d = ImageDraw.Draw(im)
    if brushed:
        for _ in range(420):
            y = random.uniform(0, S); x = random.uniform(-100, S); L = random.uniform(60, 300)
            d.line([(x, y), (x + L, y + random.uniform(-1, 1))], fill=mix(base, streak, random.uniform(0.2, 1)), width=1)
    for _ in range(26):  # soft smudges (fingerprints, grease)
        x, y, r = random.randrange(S), random.randrange(S), random.randint(10, 34)
        d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=mix(base, streak, 0.55))
    im = im.filter(ImageFilter.GaussianBlur(0.6)); d = ImageDraw.Draw(im)
    for _ in range(rust):
        x, y = random.randrange(S), random.randrange(S)
        for k in range(random.randint(3, 8)):
            d.ellipse([x + k * 2 - 3, y + k * 5 - 2, x + k * 2 + 3, y + k * 5 + 2], fill=random.choice([(140, 74, 40), (120, 60, 34), (160, 96, 54)]))
    wear(im, 14, edge=False).save(os.path.join(OUT, name + '.png'))


def paint(name, base, dark, chips=30, chipc=(90, 80, 70)):
    """Enamel / gloss paint: soft brush strokes, chips at random showing what's under."""
    im = Image.new('RGB', (S, S), base); d = ImageDraw.Draw(im)
    for _ in range(160):
        x, y = random.uniform(0, S), random.uniform(0, S)
        d.line([(x, y), (x + random.uniform(20, 90), y + random.uniform(-6, 6))], fill=mix(base, dark, random.uniform(0.05, 0.35)), width=random.choice([2, 3, 4]))
    im = im.filter(ImageFilter.GaussianBlur(1.2)); d = ImageDraw.Draw(im)
    for _ in range(chips):
        x, y = random.randrange(S), random.randrange(S); r = random.randint(2, 6)
        d.polygon([(x + random.randint(-r, r), y + random.randint(-r, r)) for _ in range(6)], fill=chipc)
    wear(im, 18).save(os.path.join(OUT, name + '.png'))


wood('oak', (122, 78, 44), (74, 44, 24), (156, 106, 64), knots=4)            # stained counter wood (front boards)
wood('oak_top', (196, 150, 96), (150, 104, 60), (222, 184, 130), knots=2)    # the scrubbed light counter top
wood('pine', (178, 130, 82), (126, 84, 48), (206, 162, 108), knots=5)        # shelves, brackets' boards, battens
wood('cedar_dark', (92, 58, 36), (56, 34, 20), (124, 84, 52), knots=2)       # sign frames, door rails
metal('stainless', (176, 180, 184), (214, 218, 222))
metal('steel_worn', (138, 142, 146), (176, 180, 184), rust=14)
metal('iron', (58, 56, 54), (92, 88, 84), rust=10, brushed=False)
metal('galv', (160, 164, 160), (196, 198, 194), rust=6, brushed=False)
paint('cream', (226, 214, 186), (180, 166, 136), chips=24)
paint('enamel_red', (176, 40, 36), (120, 24, 22), chips=26, chipc=(60, 56, 54))
paint('enamel_green', (64, 112, 84), (40, 74, 56), chips=26, chipc=(60, 56, 54))
paint('black', (40, 38, 38), (20, 18, 18), chips=14, chipc=(110, 104, 96))
# a bowl stack's glaze (white with a blue rim band), for the shelves' crockery
im = Image.new('RGB', (S, S), (236, 232, 222)); d = ImageDraw.Draw(im)
for y in range(0, S, 64): d.rectangle([0, y, S, y + 10], fill=(46, 72, 140)); d.rectangle([0, y + 16, S, y + 19], fill=(46, 72, 140))
wear(im, 10, edge=False).save(os.path.join(OUT, 'glaze.png'))
# rubber (feet, grips), cast-iron burner, filter mesh (grid of slots)
paint('rubber', (34, 32, 32), (16, 16, 16), chips=0)
im = Image.new('RGB', (S, S), (150, 152, 152)); d = ImageDraw.Draw(im)
for y in range(8, S, 24):
    for x in range(8, S, 24): d.rectangle([x, y, x + 14, y + 4], fill=(60, 58, 56))
wear(im, 22, edge=False).save(os.path.join(OUT, 'filter.png'))
paint('navy', (40, 56, 88), (24, 34, 56), chips=8, chipc=(80, 90, 110))     # the collection cabinet's back
paint('velvet', (128, 30, 40), (84, 18, 26), chips=0)
paint('brass', (196, 160, 76), (150, 116, 44), chips=10, chipc=(120, 96, 40))
paint('cork', (176, 128, 80), (134, 92, 54), chips=60, chipc=(110, 76, 44))
# a striped cloth skirt (red and cream, soft fold shading)
im = Image.new('RGB', (S, S), (232, 70, 58)); d = ImageDraw.Draw(im)
for x in range(0, S, 64): d.rectangle([x + 32, 0, x + 63, S], fill=(244, 234, 210))
for x in range(0, S, 16): d.line([(x, 0), (x, S)], fill=(0, 0, 0), width=1) if False else None
im = Image.composite(Image.new('RGB', (S, S), (120, 40, 30)), im, Image.linear_gradient('L').rotate(90).resize((S, S)).point(lambda v: int(abs(math.sin(v / 255 * math.pi * 16)) * 40)))
wear(im, 12).save(os.path.join(OUT, 'skirt.png'))
# white cotton for the washing (tinted per garment in the game): soft fold shadows, a seam or two
im = Image.new('RGB', (S, S), (240, 238, 232)); d = ImageDraw.Draw(im)
for _ in range(40):
    x = random.uniform(0, S); d.line([(x, 0), (x + random.uniform(-40, 40), S)], fill=(214, 212, 206), width=random.choice([3, 5, 8]))
im = im.filter(ImageFilter.GaussianBlur(3)); d = ImageDraw.Draw(im)
for y in (60, 300): d.line([(0, y), (S, y)], fill=(200, 198, 192), width=2)
wear(im, 8, edge=False).save(os.path.join(OUT, 'cloth.png'))
paint('pot', (176, 96, 58), (132, 66, 38), chips=30, chipc=(120, 110, 96))  # terracotta with lime bloom
print('ok', sorted(os.listdir(OUT)))
