#!/usr/bin/env python3
"""Review sheets for a Blender toy series, beside the owner's reference boards (system python, PIL).

    python3 -I art/blender/toys/sheet.py series <looks.png> <out.png> [--card card.webp] [--refs a.jpg:x0,y0,x1,y1 ...]
    python3 -I art/blender/toys/sheet.py gimmick <frames.png> <out.png> [--shots a.png:x0,y0,x1,y1 ...]
    python3 -I art/blender/toys/sheet.py facet <series> <old.png> <new.png> <zoom.png> <out.png> --old-tris '{"id": n}'
        [--crop id:fx0,fy0,fx1,fy1 ...]   the faceted conversion (FACET.md): per figure the old front 3/4 beside the
        new front 3/4, back 3/4 and gimmick mid-pose (<new.png>: 3 columns), and a texture close-up cropped from
        <zoom.png> (one big front render per figure; the crop box in fractions of the tile, default the centre half)

<looks.png> / <frames.png> are grids from art/blender/toys/look.mjs (one row per figure); the labels come from the
series data (src/data/series/<series>.js, read as text) and the manifest (tris, atlas).
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
FONT = '/etc/alternatives/fonts-japanese-gothic.ttf'
INK, PAPER, ACC = (34, 30, 28), (236, 230, 216), (47, 122, 74)


def font(n):
    try:
        return ImageFont.truetype(FONT, n)
    except OSError:
        return ImageFont.load_default()


def series_items(sid):
    src = open(os.path.join(ROOT, 'src', 'data', 'series', sid + '.js'), encoding='utf8').read()
    out = []
    Q = r"""(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")"""  # a single- or double-quoted JS string
    for m in re.finditer(r"id: '(\w+)', name: " + Q + r", jp: " + Q + r", rarity: '(\w+)'", src):
        g = m.groups()
        out.append({'id': g[0], 'name': g[1] or g[2] or '', 'jp': g[3] or g[4] or '', 'rarity': g[5]})
    name = re.search(r"\n  name: " + Q + r",\n  jp: " + Q, src)
    return out, ((name.group(1) or name.group(2), name.group(3) or name.group(4)) if name else (sid, sid))


def crop_arg(a):
    path, box = a.rsplit(':', 1)
    return Image.open(path).convert('RGB').crop(tuple(int(v) for v in box.split(',')))


def facet_sheet(argv):
    sid, old_p, new_p, zoom_p, out = argv[:5]
    rest = argv[5:]
    old_tris = json.loads(rest[rest.index('--old-tris') + 1]) if '--old-tris' in rest else {}
    crops = {}
    if '--crop' in rest:
        i = rest.index('--crop') + 1
        while i < len(rest) and not rest[i].startswith('--'):
            k, box = rest[i].split(':')
            crops[k] = tuple(float(v) for v in box.split(','))
            i += 1
    items, (sname, sjp) = series_items(sid)
    man = json.load(open(os.path.join(ROOT, 'src', 'figures', 'lowpix.manifest.json')))
    old, new, zoom = (Image.open(p).convert('RGB') for p in (old_p, new_p, zoom_p))
    rows = len(items)
    T = new.height // rows
    zt = zoom.height // rows
    label_w, head = 300, 150
    W = label_w + 5 * (T + 12) + 30
    H = head + rows * (T + 12) + 30
    S = Image.new('RGB', (W, H), PAPER)
    D = ImageDraw.Draw(S)
    D.text((24, 22), f'{sjp}  {sname}  — faceted low-poly: old (smooth) beside new (facet)', font=font(40), fill=INK)
    for c, cap in enumerate(('OLD front 3/4', 'NEW front 3/4', 'NEW back 3/4', 'NEW gimmick mid-pose', 'NEW close-up (1:1 of a 1000 px render)')):
        D.text((label_w + c * (T + 12) + 8, head - 34), cap, font=font(20), fill=(150, 60, 40) if c == 0 else ACC)
    D.text((26, 74), 'in the game renderer (look.mjs, catalogue light); flat-shaded facets, 1024 px hand-painted atlas, no normal map',
           font=font(19), fill=(90, 80, 70))
    for r, it in enumerate(items):
        y = head + r * (T + 12)
        e = man.get(f"{sid}/{it['id']}", {})
        D.rectangle((24, y + 4, label_w - 10, y + T - 4), fill=(246, 242, 232), outline=(200, 190, 175))
        D.text((40, y + 20), it['jp'], font=font(28), fill=INK)
        D.text((40, y + 58), it['name'], font=font(22), fill=ACC)
        D.text((40, y + 90), it['rarity'], font=font(17), fill=(150, 60, 40) if it['rarity'] == 'secret' else (110, 100, 90))
        D.text((40, y + T - 96), f"tris {old_tris.get(it['id'], '?')} -> {e.get('tris', '?')}", font=font(22), fill=INK)
        D.text((40, y + T - 64), f"atlas 512+normal -> {'x'.join(map(str, e.get('atlas') or ['?']))}", font=font(16), fill=(110, 100, 90))
        D.text((40, y + T - 40), f"{'x'.join(str(round(v)) for v in e.get('size', []))} mm · {e.get('kb', '?')} KB", font=font(16), fill=(110, 100, 90))
        ot = old.height // rows
        S.paste(old.crop((0, r * ot, ot, (r + 1) * ot)).resize((T, T), Image.LANCZOS), (label_w, y))
        for c in range(3):
            S.paste(new.crop((c * T, r * T, (c + 1) * T, (r + 1) * T)), (label_w + (c + 1) * (T + 12), y))
        fx0, fy0, fx1, fy1 = crops.get(it['id'], (0.25, 0.25, 0.75, 0.75))
        z = zoom.crop((int(fx0 * zt), int(r * zt + fy0 * zt), int(fx1 * zt), int(r * zt + fy1 * zt)))
        S.paste(z.resize((T, T), Image.NEAREST), (label_w + 4 * (T + 12), y))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out)
    print('wrote', out, S.size)


def main():
    if sys.argv[1] == 'facet':
        return facet_sheet(sys.argv[2:])
    mode, sid, grid_path, out = sys.argv[1:5]
    rest = sys.argv[5:]
    card = rest[rest.index('--card') + 1] if '--card' in rest else None
    extra = []
    for flag in ('--refs', '--shots'):
        if flag in rest:
            i = rest.index(flag) + 1
            while i < len(rest) and not rest[i].startswith('--'):
                extra.append(crop_arg(rest[i]))
                i += 1
    items, (sname, sjp) = series_items(sid)
    man = json.load(open(os.path.join(ROOT, 'src', 'figures', 'lowpix.manifest.json')))
    grid = Image.open(grid_path).convert('RGB')
    rows = len(items)
    th = grid.height // rows
    cols = grid.width // th
    label_w = 300
    W = label_w + grid.width + 40
    head = 120
    side = 0
    if card:
        cim = Image.open(card).convert('RGB')
        side = cim.width + 40
        W += side
    ref_h = 0
    if extra:
        ref_h = 360
    H = head + ref_h + rows * th + 40
    S = Image.new('RGB', (W, H), PAPER)
    D = ImageDraw.Draw(S)
    title = f'{sjp}  {sname}' + ('  — the gimmicks in the game renderer' if mode == 'gimmick' else f'  — {sid}, modelled in Blender')
    fs = 44  # (a long title shrinks to fit the sheet)
    while fs > 22 and D.textlength(title, font=font(fs)) > W - 48:
        fs -= 2
    D.text((24, 24 + (44 - fs) // 2), title, font=font(fs), fill=INK)
    if mode == 'series':
        cap = 'front 3/4 · back 3/4 · inside the gimmick (the object) · the signature move   (the in-game mesh, materials and baked normal maps)'
    else:
        cap = 'each row: the gimmick clip at 0.0 / 0.4 / 0.8 / 1.3 / 1.8 / 2.3 s (press: left click in hand, right click on a shelf)'
    D.text((26, 80), cap, font=font(20), fill=(90, 80, 70))
    y0 = head
    if extra:  # the owner's boards (or in-game shots) along the top
        x = 24
        D.text((24, y0 - 4), ("the owner's reference boards" if '--refs' in rest else 'close-ups: the faces') if mode == 'series' else 'in the game: capsule reveal, in hand, on the shelf', font=font(18), fill=(90, 80, 70))
        for im in extra:
            k = min((ref_h - 40) / im.height, (W - 48) / im.width)  # (a wide strip is fitted to the sheet)
            im = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
            if x + im.width > W - 24:
                break
            S.paste(im, (x, y0 + 22))
            x += im.width + 16
        y0 += ref_h
    for r, it in enumerate(items):
        y = y0 + r * th
        e = man.get(f"{sid}/{it['id']}", {})
        D.rectangle((24, y + 10, label_w - 10, y + th - 10), fill=(246, 242, 232), outline=(200, 190, 175))
        D.text((40, y + 26), it['jp'], font=font(30), fill=INK)
        D.text((40, y + 66), it['name'], font=font(24), fill=ACC)
        D.text((40, y + 100), it['rarity'], font=font(18), fill=(150, 60, 40) if it['rarity'] == 'secret' else (110, 100, 90))
        D.text((40, y + th - 70), f"{e.get('tris', '?')} tris · {'x'.join(map(str, e.get('atlas') or ['?']))} px", font=font(17), fill=(110, 100, 90))
        D.text((40, y + th - 46), f"{'x'.join(str(round(v)) for v in e.get('size', []))} mm · {e.get('kb', '?')} KB", font=font(17), fill=(110, 100, 90))
        S.paste(grid.crop((0, r * th, grid.width, (r + 1) * th)), (label_w, y))
    if card:
        S.paste(cim, (label_w + grid.width + 40, y0 + 10))
        D.text((label_w + grid.width + 40, y0 + cim.height + 20), 'the display card (tools/bake-cards.py)', font=font(18), fill=(90, 80, 70))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    S.save(out)
    print('wrote', out, S.size)


if __name__ == '__main__':
    main()
