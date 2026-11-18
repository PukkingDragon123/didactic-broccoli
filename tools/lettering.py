"""lettering.py: hand-lettered logotypes and maker emblems, drawn glyph by glyph on the pixel grid (the owner: real
gashapon cards carry a custom logotype per series: unique letterforms, overlapping / interlocking letters, a bouncing
baseline, one letter swapped for a motif, uneven widths, ONE simple outline or ONE hard shadow, never stacked effects).
Stock pixel fonts (tools/pixprint.py) are for small body text only.

Every logo has its own alphabet below ('#' letter ink, 'x' the motif accent, 'o' a second motif ink, '.' empty), only
the letters it uses. logo(S, name, lines, x, y, ...) sets it; a later letter's outline is drawn over the one before it,
so overlapped letters interlock.
"""
import numpy as np
from PIL import Image
from printkit import rgb
from pixprint import _dilate

A = {}  # logo alphabet name -> {char: rows}

# ------------------------------------------------------------------ SUMMER FESTIVAL: fat, round, bouncing; the I is a lantern
A['fest'] = {
    'S': [".#####.", "###.###", "###....", ".#####.", "....###", "###.###", ".#####."],
    'U': ["###.###", "###.###", "###.###", "###.###", "###.###", "###.###", ".#####."],
    'M': ["###...###", "####.####", "#########", "###.#.###", "###...###", "###...###", "###...###"],
    'E': ["######", "###...", "###...", "#####.", "###...", "###...", "######"],
    'R': ["######.", "###.###", "###.###", "######.", "#####..", "###.##.", "###.###"],
    'F': ["######", "###...", "###...", "#####.", "###...", "###...", "###..."],
    'T': ["#######", "..###..", "..###..", "..###..", "..###..", "..###..", "..###.."],
    'V': ["###.###", "###.###", "###.###", "###.###", ".#####.", ".#####.", "..###.."],
    'A': [".#####.", "###.###", "###.###", "#######", "###.###", "###.###", "###.###"],
    'L': ["###...", "###...", "###...", "###...", "###...", "###...", "######"],
    'I': ["..#..", ".###.", "#xxx#", "#####", "#xxx#", "#####", "#xxx#", ".###.", "..#.."],  # a paper lantern
}
# ------------------------------------------------------------------ BIG ONES!: tall museum slab serif
A['slab'] = {
    'B': ["######.", ".##..##", ".##..##", ".#####.", ".##..##", ".##..##", ".##..##", "######."],
    'I': ["####", ".##.", ".##.", ".##.", ".##.", ".##.", ".##.", "####"],
    'G': [".#####.", "##...##", "##.....", "##.....", "##.####", "##...##", "##...##", ".######"],
    'O': [".#####.", "##...##", "##...##", "##...##", "##...##", "##...##", "##...##", ".#####."],
    'N': ["###..###", ".##...#.", ".###..#.", ".#.##.#.", ".#..###.", ".#...##.", ".#...##.", "###..###"],
    'E': ["#######", ".##...#", ".##....", ".####..", ".##....", ".##....", ".##...#", "#######"],
    'S': [".#####.", "##...##", "##.....", ".#####.", ".....##", ".....##", "##...##", ".#####."],
    '!': ["xx.", "xx.", ".xx", ".xx", ".xx", "xx.", "...", "##."],  # the stroke is a tusk
}
# ------------------------------------------------------------------ WHO'S IN THE SUIT?: drippy monster-movie letters; ? = a zip pull
A['kaiju'] = {
    'W': ["##...##", "##...##", "##.#.##", "##.#.##", "#######", "###.###", "##...##", ".#...#.", "......."],
    'H': ["##..##", "##..##", "##..##", "######", "##..##", "##..##", "##..##", "#...#.", "#....."],
    'O': [".####.", "##..##", "##..##", "##..##", "##..##", "##..##", ".####.", "..#...", "......"],
    "'": ["##", "##", "#.", "..", "..", "..", "..", "..", ".."],
    'S': [".#####", "##....", "##....", ".####.", "....##", "....##", "#####.", ".#....", "......"],
    'I': ["##", "##", "##", "##", "##", "##", "##", ".#", ".."],
    'N': ["##..##", "###.##", "######", "##.###", "##..##", "##..##", "##..##", "#...#.", "......"],
    'T': ["######", "######", "..##..", "..##..", "..##..", "..##..", "..##..", "..#...", "......"],
    'E': ["#####", "##...", "##...", "####.", "##...", "##...", "#####", ".#..#", "....."],
    'U': ["##..##", "##..##", "##..##", "##..##", "##..##", "##..##", ".####.", "...#..", "......"],
    '?': [".####.", "##..##", "...##.", "..##..", "..##..", "......", "..xx..", ".x..x.", "..xx.."],
}
# ------------------------------------------------------------------ SUPER SECRET: tall condensed, the C is a split capsule
A['tall'] = {
    'S': [".###.", "##.##", "##...", "##...", ".##..", "..##.", "...##", "...##", "...##", "##.##", ".###."],
    'U': ["##.##"] * 10 + [".###."],
    'P': ["####.", "##.##", "##.##", "##.##", "####.", "##...", "##...", "##...", "##...", "##...", "##..."],
    'E': ["#####", "##...", "##...", "##...", "####.", "##...", "##...", "##...", "##...", "##...", "#####"],
    'R': ["####.", "##.##", "##.##", "##.##", "####.", "###..", "##.#.", "##.##", "##.##", "##.##", "##.##"],
    'C': [".xxx.", "xxxxx", "xx..x", "xx...", "xx...", "##...", "##...", "##...", "##...", "##.##", ".###."],
    'T': ["######", "######", "..##..", "..##..", "..##..", "..##..", "..##..", "..##..", "..##..", "..##..", "..##.."],
}
# ------------------------------------------------------------------ STATIONERY BEASTS: ruled, notched; the I is a pencil, the A wears a compass cap
A['ruler'] = {
    'S': [".####", "##...", "##...", ".###.", "...##", "...##", "####."],
    'T': ["######", "..##..", "..##..", "..##..", "..##..", "..##..", "..##.."],
    'A': ["..x..", ".###.", "##.##", "##.##", "#####", "##.##", "##.##"],
    'O': [".###.", "##.##", "##.##", "##.##", "##.##", "##.##", ".###."],
    'N': ["##..##", "###.##", "######", "##.###", "##..##", "##..##", "##..##"],
    'E': ["#####", "##...", "##...", "####.", "##...", "##...", "#####"],
    'R': ["####.", "##.##", "##.##", "####.", "##.#.", "##.##", "##.##"],
    'Y': ["##..##", "##..##", ".####.", "..##..", "..##..", "..##..", "..##.."],
    'B': ["####.", "##.##", "##.##", "####.", "##.##", "##.##", "####."],
    'I': [".x.", "xxx", "###", "###", "###", "###", "###", ".o.", ".o."],  # a pencil, rubber up
}
# ------------------------------------------------------------------ DEEP-SEA NIGHT STALLS: round bubble letters; - is a fish, the I a lantern
A['bubble'] = {
    'D': ["####.", "##.##", "##.##", "##.##", "##.##", "##.##", "####."],
    'E': ["####", "##..", "##..", "###.", "##..", "##..", "####"],
    'P': ["####.", "##.##", "##.##", "####.", "##...", "##...", "##..."],
    '-': ["........", "..###...", ".#####.#", "#x######", ".#####.#", "..###...", "........"],  # a little fish
    'S': [".###", "##..", "##..", ".##.", "..##", "..##", "###."],
    'A': [".###.", "##.##", "##.##", "#####", "##.##", "##.##", "##.##"],
    'N': ["##..##", "###.##", "######", "##.###", "##..##", "##..##", "##..##"],
    'I': [".##.", "#xx#", "####", "#xx#", "####", "#xx#", ".##."],
    'G': [".###.", "##...", "##...", "##.##", "##.##", "##.##", ".###."],
    'H': ["##.##", "##.##", "##.##", "#####", "##.##", "##.##", "##.##"],
    'T': ["######", "..##..", "..##..", "..##..", "..##..", "..##..", "..##.."],
    'L': ["##..", "##..", "##..", "##..", "##..", "##..", "####"],
}
for al in A.values():
    for k, rows in al.items():  # pad ragged rows to the glyph's width
        w = max(len(r) for r in rows); al[k] = [r.ljust(w, '.') for r in rows]


def _glyph(al, ch, smooth=False, slant=0):
    rows = A[al].get(ch)
    if rows is None: return None
    g = np.array([[c for c in r] for r in rows])
    if smooth: g = epx(g)
    if slant:  # an italic lean: each row shifted right by one step every `slant` rows from the bottom
        H = g.shape[0]; sh = [(H - 1 - j) // slant for j in range(H)]; out = np.full((H, g.shape[1] + max(sh)), '.')
        for j in range(H): out[j, sh[j]:sh[j] + g.shape[1]] = g[j]
        g = out
    return g


def epx(g):
    """The EPX / Scale2x pixel-art doubling: corners round off the way a letterer would pixel them by hand, still
    hard-edged, every pixel a flat ink."""
    H, W = g.shape; p = np.pad(g, 1, constant_values='.'); out = np.full((2 * H, 2 * W), '.')
    for j in range(H):
        for i in range(W):
            P = p[j + 1, i + 1]; a, b, c, d = p[j, i + 1], p[j + 1, i + 2], p[j + 1, i], p[j + 2, i + 1]
            e = [P, P, P, P]
            if c == a and c != d and a != b: e[0] = a
            if a == b and a != c and b != d: e[1] = b
            if d == c and d != b and c != a: e[2] = c
            if b == d and b != a and d != c: e[3] = d
            out[2 * j, 2 * i], out[2 * j, 2 * i + 1], out[2 * j + 1, 2 * i], out[2 * j + 1, 2 * i + 1] = e
    return out


def logo(S, al, text, x, y, scale=2, fill=0xffd23f, accent=0xd8402a, accent2=0x1c1816, outline=None, shadow=None,
         track=1, bounce=None, fills=None, anchor='lt', space=3, lift=None, smooth=True, slant=0):
    """Set one line of a hand-lettered logotype. bounce: per-letter baseline offsets (glyph px, cycled); lift: {index:
    dy}; track < 0 overlaps letters (each letter's outline cuts into the one before: interlocking). outline=(r, col)
    OR shadow=(dx, dy, col): one effect only. Returns the box (x0, y0, x1, y1) in sheet px."""
    assert not (outline and shadow), 'one effect per title'
    gl = []; cx = 0
    k2 = 2 if smooth else 1
    base = max(len(A[al]['S' if 'S' in A[al] else next(iter(A[al]))]), 1) * k2
    for i, ch in enumerate(text):
        if ch == ' ': cx += space * k2; continue
        g = _glyph(al, ch, smooth, slant)
        if g is None: continue
        dy = ((bounce[i % len(bounce)] if bounce else 0) + ((lift or {}).get(i, 0))) * k2
        if g.shape[0] > base and ch not in "?'!": dy -= (g.shape[0] - base) // 2  # tall motif letters straddle the line
        gl.append((g, cx, dy, (fills[i % len(fills)] if fills else fill)))
        cx += g.shape[1] + track * k2
    r = outline[0] if outline else 0
    sx, sy = (shadow[0], shadow[1]) if shadow else (0, 0)
    top = min(dy for _, _, dy, _ in gl); bot = max(dy + g.shape[0] for g, _, dy, _ in gl)
    W = max(px + g.shape[1] for g, px, _, _ in gl) + 2 * r + sx; H = bot - top + 2 * r + sy
    img = np.zeros((H, W, 4), np.uint8)
    def stamp(mask, ox, oy, col):
        sub = img[oy:oy + mask.shape[0], ox:ox + mask.shape[1]]; sub[mask[:sub.shape[0], :sub.shape[1]]] = rgb(col) + (255,)
    if shadow:  # one hard shadow under the whole word
        for g, px, dy, _ in gl: stamp(g != '.', px + sx, dy - top + sy, shadow[2])
    for g, px, dy, col in gl:
        m = g != '.'
        if outline: stamp(_dilate(m, r, 'sq' if r == 1 else 'disc'), px, dy - top, outline[1])
        o = (px + r, dy - top + r)
        stamp(g == '#', *o, col); stamp(g == 'x', *o, accent); stamp(g == 'o', *o, accent2)
    lay = Image.fromarray(img, 'RGBA')
    if scale != 1: lay = lay.resize((lay.width * scale, lay.height * scale), Image.NEAREST)
    X = int(x - {'l': 0, 'm': lay.width / 2, 'r': lay.width}[anchor[0]]); Y = int(y - {'t': 0, 'm': lay.height / 2, 'b': lay.height}[anchor[1]])
    S.im.paste(lay, (X, Y), lay)
    return (X, Y, X + lay.width, Y + lay.height)


# ------------------------------------------------------------------ maker emblems: small stamps, each its own shape, a little worn
# ' ' clear, '.' paper, '#' ink, 'x' the maker's colour
EMBLEM = {
    'gg': ["   #####   ", "  #xxxxx#  ", " #xxxxxxx# ", "#xxxxx.xxx#", "###########", "#.........#", "#....#....#", " #...#...# ", "  #.....#  ", "   ## ##   "],
    'hutch': ["     #     ", "    ###    ", "   ##.##   ", "  ##...##  ", " ##.....## ", "###########", " #.xxx...# ", " #.x.x.#.# ", " #.x.x...# ", " ##### ### "],
    'koro': ["  ###  ### ", " #xxx##...#", "#xx.x#.#..#", "#x.xx#..#.#", " #xxx##...#", "  ###  ### "],
    'pokke': ["###########", "#x.x.x.x.x#", "#.........#", "#.........#", "#....#....#", " #.......# ", "  #.....#  ", "   #####   "],
    'maru': ["  #######  ", " #.......# ", "#..#####..#", "#.#xxxxx#.#", "#.#xx.xx#.#", "#.#xxxxx#.#", "#..#####. #", " #.......# ", "  ### ###  "],
}


def emblem(S, key, x, y, col, ink=0x1c1816, paper=0xfbf8f1, scale=1):
    rows = EMBLEM[key]; h = len(rows); w = max(len(r) for r in rows)
    for j, r in enumerate(rows):
        for i, c in enumerate(r):
            if c in ' ': continue
            S.rect(x + i * scale, y + j * scale, scale, scale, {'#': ink, 'x': col, '.': paper}[c])
    return (x, y, x + w * scale, y + h * scale)
