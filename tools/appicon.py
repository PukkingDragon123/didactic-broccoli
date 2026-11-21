"""appicon.py: the game's app icon (Windows build: desktop/build/icon.png + icon.ico) and the browser favicon, hand-pixelled
per size (never the gacha capsule): the shop's enamel sign, a red enamel plate with a navy rim and a cream pin-line,
"GG" in chunky cream letters with a dark extruded side (echoing the 3D title), screws, a rust chip; the bigger sizes
hang on two chains. 16 and 32 are their own pixel grids; 64 is shown at 1x / 2x / 4x (64, 128, 256), 48 is the 16 at 3x.
  python3 -I tools/appicon.py     -> desktop/build/icon.png (256), desktop/build/icon.ico, public/img/ui/favicon.png (32)"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
C = {'#': (30, 20, 24), 'N': (38, 52, 110), 'n': (24, 34, 78), 'H': (58, 76, 142), 'R': (192, 48, 42), 'r': (140, 30, 32),
     'L': (216, 80, 62), 'P': (242, 230, 198), 'p': (205, 184, 142), 'D': (94, 20, 22), 'S': (210, 214, 222), 's': (154, 160, 170),
     't': (94, 100, 110), 'u': (138, 74, 36), 'i': (42, 36, 40), 'W': (255, 248, 228)}

G5 = ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.']
G8 = ['..####..', '.######.', '##....##', '##......', '##......', '##..####', '##..####', '##....##', '##....##', '.######.', '..####..']
G14 = ['....######....', '..##########..', '.####....#####.', '####......####', '####.......##.', '####..........', '####..........',
       '####...#######', '####...#######', '####......####', '####......####', '.####....#####', '..###########.', '....#######...']


def plate(n, rim, r, top=0):
    """An n x (n-top) enamel plate: ink edge, navy rim `rim` px, a cream pin-line, red field, lit top row, shaded foot."""
    g = [['.'] * n for _ in range(n)]
    h = n - top
    def inb(x, y):
        cx = min(max(x, r), n - 1 - r); cy = min(max(y, r), h - 1 - r)
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.5
    for y in range(h):
        for x in range(n):
            if not inb(x, y): continue
            e = not (inb(x - 1, y) and inb(x + 1, y) and inb(x, y - 1) and inb(x, y + 1))
            d = min(x, y, n - 1 - x, h - 1 - y)
            if e: c = '#'
            elif d <= rim: c = 'H' if y == 1 else 'n' if y >= h - 2 else 'N'
            elif d == rim + 1 and n >= 32: c = 'P'
            else: c = 'L' if d == rim + (2 if n >= 32 else 1) and y < h / 2 else 'r' if y >= h - rim - 3 else 'R'
            g[top + y][x] = c
    return g


def letters(g, glyph, x0, y0, side):
    """Two glyphs side by side: a dark extruded side (down-right `side` px, ink edged), then the cream face."""
    w = len(glyph[0]); gap = max(1, w // 6)
    for k in range(2):
        ox = x0 + k * (w + gap)
        for d in range(side, 0, -1):
            for j, row in enumerate(glyph):
                for i, ch in enumerate(row):
                    if ch == '#': g[y0 + j + d][ox + i + d] = 'D' if d < side else '#'
        for j, row in enumerate(glyph):
            for i, ch in enumerate(row):
                if ch != '#': continue
                lit = j == 0 or glyph[j - 1][i] != '#'
                g[y0 + j][ox + i] = 'W' if lit and len(glyph) > 8 else 'P'
                if j + 1 < len(glyph) and glyph[j + 1][i] != '#' and len(glyph) > 8: g[y0 + j][ox + i] = 'p'
    return g


def screws(g, pts):
    for x, y in pts:
        g[y][x] = 'S'; g[y][x + 1] = 's'; g[y + 1][x] = 's'; g[y + 1][x + 1] = 't'


def chains(g, xs, h):
    for x in xs:
        for y in range(h):
            k = y % 4
            if k in (0, 3): g[y][x] = '#'; g[y][x + 1] = '#'
            else: g[y][x] = 'S' if k == 1 else 's'; g[y][x + 1] = 't'


def img(g):
    n = len(g); im = Image.new('RGBA', (len(g[0]), n), (0, 0, 0, 0))
    for y, row in enumerate(g):
        for x, ch in enumerate(row):
            if ch in C: im.putpixel((x, y), C[ch] + (255,))
    return im


def icon16():
    g = plate(16, 1, 2, 2)
    g = letters(g, G5, 2, 6, 1)
    g[4][13] = 'u'; g[3][14] = 'i'
    return img(g)


def icon32():
    g = plate(32, 2, 4, 5)
    chains(g, (8, 22), 6)
    g = letters(g, G8, 7, 14, 2)
    screws(g, [(4, 9), (26, 9), (4, 28), (26, 28)])
    for x, y, c in ((29, 14, 'i'), (29, 15, 'u'), (28, 15, 'i'), (2, 24, 'i')): g[y][x] = c
    return img(g)


def icon64():
    g = plate(64, 4, 7, 10)
    chains(g, (16, 46), 12)
    g = letters(g, G14, 15, 28, 3)
    screws(g, [(8, 17), (54, 17), (8, 55), (54, 55)])
    # rust chips at the rim: iron with rust bleeding down
    for x, y in ((58, 22), (3, 44), (40, 62), (20, 11)):
        for d, c in enumerate('iiu'):
            if 0 <= y + d < 64 and g[y + d][x] not in '.#': g[y + d][x] = c
    # a little cream kicker rule under the letters (the sign-writer's underline)
    for x in range(15, 49):
        if g[48][x] in 'RLr' and x % 6: g[48][x] = 'p'
    return img(g)


def main():
    i16, i32, i64 = icon16(), icon32(), icon64()
    up = lambda im, k: im.resize((im.width * k, im.height * k), Image.NEAREST)
    big = up(i64, 4)
    out = os.path.join(ROOT, 'desktop', 'build')
    big.save(os.path.join(out, 'icon.png'))
    sizes = {256: big, 128: up(i64, 2), 64: i64, 48: up(i16, 3), 32: i32, 16: i16}
    big.save(os.path.join(out, 'icon.ico'), format='ICO', sizes=[(s, s) for s in sizes], append_images=[sizes[s] for s in sizes if s != 256])
    os.makedirs(os.path.join(ROOT, 'public', 'img', 'ui'), exist_ok=True)
    i32.save(os.path.join(ROOT, 'public', 'img', 'ui', 'favicon.png'))
    # a look sheet: every size at 1x and blown up
    sheet = Image.new('RGBA', (16 + 32 + 64 + 256 + 64 * 4 + 120, 300), (60, 64, 90, 255))
    x = 10
    for im in (i16, i32, i64, big):
        sheet.alpha_composite(im, (x, 10)); x += im.width + 12
    sheet.alpha_composite(up(i16, 8), (x, 10)); sheet.alpha_composite(up(i32, 4), (x + 140, 10))
    sheet.save(os.path.join(ROOT, 'shots', 'menu', '_icons_app.png'))
    print('appicon ok')


if __name__ == '__main__':
    main()
