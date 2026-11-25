"""Hand-painted source textures for the garage kit (art/lowpix/world/made/garage_kit.py): the shop's own structure and
fittings (timber joists, painted steel beams and columns, PVC conduit, porcelain knobs, cloth flex, the inverted-Fuji
fixture's enamel, bakelite fittings, the green steel door, the window's steel sash, plywood planks, the cafe curtain,
the light box housing, the storage bin). Brush dabs and painted strokes, no per-pixel noise. Every texture is one metre
square (the kit's UVs are in metres), 512 px.
Run: python3 art/lowpix/world/made/garage_paint.py   (writes art/lowpix/world/made/garage_tex/*.png)"""
import os, math, random
from PIL import Image, ImageDraw

H = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(H, 'garage_tex')
os.makedirs(OUT, exist_ok=True)
R = random.uniform
S = 512


def tone(c, k): return tuple(max(0, min(255, int(v * k))) for v in c[:3])
def mix(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def dab(d, x, y, w, h, c):
    x0, x1 = sorted((x - w / 2, x + w / 2)); y0, y1 = sorted((y - h / 2, y + h / 2)); d.ellipse([x0, y0, x1, y1], fill=c)


def paint(c, n=0, k=(0.95, 1.05), w=(10, 30), h=(4, 10), size=S):
    """A flat ground broken up by overlapping brush dabs (wrapping, so the metre tiles seamlessly)."""
    im = Image.new('RGB', (size, size), c); d = ImageDraw.Draw(im)
    for _ in range(n or int(size * size / 80)):
        x, y = R(0, size), R(0, size); cc = tone(c, R(*k)); ww, hh = R(*w), R(*h)
        for ox in (0, -size, size):
            for oy in (0, -size, size): dab(d, x + ox, y + oy, ww, hh, cc)
    return im, d


def streaks(d, c, n, vertical=False, ln=(40, 200), wd=(1, 3), size=S):
    for _ in range(n):
        x, y = R(0, size), R(0, size); L = R(*ln); w = int(R(*wd))
        if vertical: d.line([x, y, x + R(-3, 3), y + L], fill=c, width=w)
        else: d.line([x, y, x + L, y + R(-3, 3)], fill=c, width=w)


def chips(d, ground, n, under=(150, 150, 140), r=(2, 7)):
    for _ in range(n):
        x, y, rr = R(0, S), R(0, S), R(*r)
        pts = [(x + math.cos(a) * rr * R(0.5, 1.2), y + math.sin(a) * rr * R(0.4, 1.0)) for a in [k * 0.9 for k in range(7)]]
        d.polygon(pts, fill=under)
        d.line(pts + [pts[0]], fill=tone(ground, 1.12), width=1)


def rust(d, n, size=S):
    for _ in range(n):
        x, y = R(0, size), R(0, size)
        for k in range(int(R(3, 8))): dab(d, x + R(-6, 6), y + k * R(3, 6), R(3, 7), R(4, 9), random.choice([(132, 74, 44), (150, 90, 52), (110, 62, 40)]))


def save(im, n): im.save(os.path.join(OUT, n + '.png'))


# ---------------------------------------------------------------- timber: sawn cedar joists, forty years under a roof
random.seed('timber')
im, d = paint((170, 132, 92), k=(0.93, 1.06), w=(30, 90), h=(3, 6))
for y in range(0, S, 7):                                                                   # the grain, wavering along the length
    c = tone((150, 112, 76), R(0.9, 1.08)); ph = R(0, 6.28)
    d.line([(x, y + math.sin(x / R(40, 90) + ph) * 2) for x in range(0, S + 8, 8)], fill=c, width=1)
for _ in range(5):                                                                          # knots with grain flowing round
    x, y = R(20, S - 20), R(20, S - 20); dab(d, x, y, 14, 9, (104, 70, 44)); dab(d, x, y, 6, 4, (74, 48, 30))
    for k in range(3): d.arc([x - 14 - k * 5, y - 7 - k * 3, x + 14 + k * 5, y + 7 + k * 3], 0, 360, fill=(140, 100, 66))
for _ in range(10):                                                                         # nail heads, a rust halo each
    x, y = R(0, S), R(0, S); dab(d, x, y, 9, 9, (120, 80, 50)); dab(d, x, y, 5, 5, (60, 56, 52)); dab(d, x - 1, y - 1, 2, 2, (120, 116, 108))
for _ in range(3):                                                                          # carpenter's pencil ticks
    x, y = R(0, S), R(0, S); d.line([x, y, x + 2, y + 26], fill=(70, 64, 60), width=2)
for _ in range(14): x, y = R(0, S), R(0, S); dab(d, x, y, R(30, 70), R(8, 16), tone((150, 116, 82), R(0.85, 0.95)))
save(im, 'timber')

# ---------------------------------------------------------------- painted structural steel (grey-green), chipped, rust runs
random.seed('steel')
im, d = paint((112, 122, 124), k=(0.97, 1.03), w=(30, 80), h=(6, 14))
chips(d, (112, 122, 124), 18, under=(140, 140, 132), r=(3, 9))
rust(d, 7)
streaks(d, (96, 84, 70), 18, vertical=True, ln=(20, 70), wd=(1, 2))
for _ in range(8): x, y = R(0, S), R(0, S); dab(d, x, y, R(40, 120), R(20, 50), tone((112, 122, 124), 0.96))
for x in range(0, S, 128):                                                                  # mill-scale scratches
    d.line([x + 10, R(0, S), x + 60, R(0, S)], fill=(134, 142, 144), width=1)
save(im, 'steel')
random.seed('steeldark')
im, d = paint((70, 74, 78), k=(0.9, 1.08), w=(20, 60), h=(4, 10)); chips(d, (70, 74, 78), 30, under=(120, 116, 108), r=(1, 4)); rust(d, 10)
save(im, 'steeldark')

# ---------------------------------------------------------------- grey PVC conduit, dust on the top side
random.seed('pvc')
im, d = paint((188, 188, 180), k=(0.97, 1.03), w=(40, 120), h=(4, 10))
for y in (60, 64): d.line([0, y, S, y], fill=(214, 214, 206), width=3)                     # the sheen line along it
for _ in range(30): x, y = R(0, S), R(380, 500); dab(d, x, y, R(20, 60), R(4, 10), (160, 156, 146))
save(im, 'pvc')

# ---------------------------------------------------------------- glazed porcelain (knobs, junction boxes), crazed
random.seed('porcelain')
im, d = paint((236, 234, 224), k=(0.97, 1.02), w=(20, 50), h=(10, 20))
for _ in range(60):
    x, y = R(0, S), R(0, S); pts = [(x, y)]
    for k in range(4): x += R(-14, 14); y += R(-14, 14); pts.append((x, y))
    d.line(pts, fill=(206, 202, 190), width=1)
for _ in range(16): x, y = R(0, S), R(0, S); dab(d, x, y, R(20, 40), R(10, 20), (214, 206, 186))
save(im, 'porcelain')

# ---------------------------------------------------------------- cloth-covered flex (twisted black cotton braid), rubber
random.seed('flex')
im = Image.new('RGB', (S, S), (38, 34, 32)); d = ImageDraw.Draw(im)
for k in range(-S, S * 2, 10): d.line([k, 0, k + S // 2, S], fill=(56, 50, 46), width=3)       # the braid's twist
for k in range(-S, S * 2, 10): d.line([k, 0, k - S // 2, S], fill=(30, 28, 26), width=1)
for _ in range(30): x, y = R(0, S), R(0, S); dab(d, x, y, R(10, 30), R(6, 12), (70, 62, 54))   # dust caught in the cloth
save(im, 'flex')
random.seed('rubber')
im, d = paint((40, 40, 40), k=(0.85, 1.2), w=(30, 90), h=(3, 6))
for y in (S // 4, S // 4 + 4): d.line([0, y, S, y], fill=(78, 78, 76), width=2)
save(im, 'rubber')

# ---------------------------------------------------------------- white stove enamel on the fixtures, yellowed, dusty
random.seed('enamel')
im, d = paint((236, 234, 222), k=(0.985, 1.01), w=(30, 90), h=(8, 20))
for _ in range(24): x, y = R(0, S), R(0, S); dab(d, x, y, R(40, 120), R(16, 40), (232, 228, 210))
for _ in range(40): x, y = R(0, S), R(0, S); dab(d, x, y, R(4, 10), R(3, 6), (190, 182, 164))
chips(d, (236, 234, 222), 8, under=(90, 90, 92), r=(1, 3))
save(im, 'enamel')

# ---------------------------------------------------------------- cream bakelite (outlets, the switch plate)
random.seed('bakelite')
im, d = paint((226, 214, 184), k=(0.96, 1.03), w=(20, 60), h=(8, 16))
for _ in range(20): x, y = R(0, S), R(0, S); dab(d, x, y, R(30, 70), R(20, 40), (204, 188, 156))   # finger grime
save(im, 'bakelite')
random.seed('plug')
im, d = paint((44, 40, 38), k=(0.9, 1.15), w=(20, 60), h=(4, 10)); save(im, 'plug')
random.seed('brass')
im, d = paint((196, 160, 88), k=(0.85, 1.15), w=(10, 40), h=(3, 8))
for _ in range(20): x, y = R(0, S), R(0, S); dab(d, x, y, R(10, 30), R(6, 12), (120, 104, 64))
save(im, 'brass')
random.seed('alu')
im, d = paint((178, 182, 184), k=(0.92, 1.08), w=(40, 140), h=(2, 4)); streaks(d, (204, 208, 210), 30, ln=(60, 200))
for _ in range(16): x, y = R(0, S), R(0, S); dab(d, x, y, R(20, 50), R(8, 16), (150, 150, 146))
save(im, 'alu')

# ---------------------------------------------------------------- the tube's glass and the end caps (glow is added in game)
random.seed('tube')
im, d = paint((244, 246, 248), k=(0.98, 1.01), w=(30, 90), h=(4, 10))
d.rectangle([0, 0, S, 40], fill=(200, 202, 204))
for _ in range(6): x = R(0, S); d.line([x, 40, x, S], fill=(230, 232, 236), width=2)
save(im, 'tube')

# ---------------------------------------------------------------- plywood planks (shelves)
random.seed('ply')
im, d = paint((212, 184, 138), k=(0.94, 1.05), w=(40, 140), h=(3, 7))
for y in range(0, S, 9):
    c = tone((192, 160, 114), R(0.92, 1.06)); ph = R(0, 6.28)
    d.line([(x, y + math.sin(x / R(60, 140) + ph) * 4) for x in range(0, S + 8, 8)], fill=c, width=1)
for _ in range(8): x, y = R(0, S), R(0, S); dab(d, x, y, R(30, 60), R(20, 40), (176, 146, 104))   # rings from wet tins
for _ in range(4):
    x, y, r = R(40, S - 40), R(40, S - 40), R(20, 30); d.ellipse([x - r, y - r, x + r, y + r], outline=(150, 118, 82), width=2)
save(im, 'ply')

# ---------------------------------------------------------------- the green steel door (and its kick plate wear)
random.seed('door')
im, d = paint((104, 136, 110), k=(0.975, 1.025), w=(30, 90), h=(8, 18))
chips(d, (104, 136, 110), 22, under=(150, 154, 146), r=(3, 9))
for _ in range(30): x, y = R(0, S), R(400, S); dab(d, x, y, R(10, 40), R(4, 10), (84, 96, 84))    # shoe scuffs low down
rust(d, 8)
for _ in range(10): x, y = R(0, S), R(0, S); dab(d, x, y, R(60, 160), R(30, 80), tone((104, 136, 110), 0.97))
save(im, 'door')
random.seed('frame')
im, d = paint((78, 84, 78), k=(0.92, 1.06), w=(20, 70), h=(4, 10)); chips(d, (78, 84, 78), 40, under=(130, 128, 118), r=(1, 4)); rust(d, 10)
save(im, 'frame')
random.seed('sash')
im, d = paint((184, 190, 184), k=(0.94, 1.05), w=(20, 70), h=(4, 10)); chips(d, (184, 190, 184), 30, under=(110, 112, 108), r=(1, 4)); rust(d, 6)
save(im, 'sash')
random.seed('sill')
im, d = paint((190, 152, 108), k=(0.92, 1.06), w=(40, 120), h=(3, 6))
for y in range(0, S, 8): d.line([0, y + R(-2, 2), S, y + R(-2, 2)], fill=tone((170, 132, 92), R(0.9, 1.05)), width=1)
for _ in range(12): x, y = R(0, S), R(0, S); dab(d, x, y, R(10, 30), R(10, 30), (150, 120, 90))   # water marks under the pots
save(im, 'sill')

# ---------------------------------------------------------------- the faded cafe curtain: cream cotton, small brown checks
random.seed('curtain')
im, d = paint((232, 220, 186), k=(0.97, 1.03), w=(30, 80), h=(10, 20))
for x in range(0, S, 32): d.line([x, 0, x, S], fill=(206, 176, 134), width=6)
for y in range(0, S, 32): d.line([0, y, S, y], fill=(206, 176, 134), width=6)
for _ in range(30): x, y = R(0, S), R(0, S); dab(d, x, y, R(40, 120), R(20, 60), (222, 206, 168))   # sun-fade
save(im, 'curtain')

# ---------------------------------------------------------------- the light box housing: black-painted tin, chipped
random.seed('lightbox')
im, d = paint((44, 36, 34), k=(0.95, 1.08), w=(20, 60), h=(4, 10)); chips(d, (44, 36, 34), 20, under=(110, 102, 92), r=(1, 4)); rust(d, 4)
save(im, 'lightbox')

# ---------------------------------------------------------------- the storage bin: frosted white tub and its blue lid
random.seed('bin')
im, d = paint((226, 232, 232), k=(0.98, 1.015), w=(30, 90), h=(10, 24))
for _ in range(20): x, y = R(0, S), R(300, S); dab(d, x, y, R(30, 90), R(10, 30), (212, 218, 216))
for x in range(0, S, 64): d.line([x, 0, x, S], fill=(212, 218, 218), width=4)          # moulded ribs
save(im, 'bin')
random.seed('binlid')
im, d = paint((62, 128, 214), k=(0.97, 1.03), w=(30, 90), h=(6, 14))
for _ in range(24): x, y = R(0, S), R(0, S); dab(d, x, y, R(4, 12), R(2, 4), (120, 170, 230))   # scuffs
save(im, 'binlid')

# ---------------------------------------------------------------- the hook pole: galvanised steel, red rubber grip
random.seed('galv')
im, d = paint((160, 166, 164), k=(0.9, 1.1), w=(10, 40), h=(10, 40)); rust(d, 8)
save(im, 'galv')
random.seed('grip')
im, d = paint((168, 44, 40), k=(0.9, 1.1), w=(20, 60), h=(4, 10)); save(im, 'grip')
print('ok', OUT)
