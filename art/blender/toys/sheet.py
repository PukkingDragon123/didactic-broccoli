#!/usr/bin/env python3
"""Review sheets for a Blender toy series, beside the owner's reference boards (system python, PIL).

    python3 -I art/blender/toys/sheet.py series <looks.png> <out.png> [--card card.webp] [--refs a.jpg:x0,y0,x1,y1 ...]
    python3 -I art/blender/toys/sheet.py gimmick <frames.png> <out.png> [--shots a.png:x0,y0,x1,y1 ...]

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
    for m in re.finditer(r"id: '(\w+)', name: '([^']+)', jp: '([^']+)', rarity: '(\w+)'", src):
        out.append({'id': m.group(1), 'name': m.group(2), 'jp': m.group(3), 'rarity': m.group(4)})
    name = re.search(r"name: '([^']+)',\n  jp: '([^']+)'", src)
    return out, (name.group(1), name.group(2)) if name else (sid, sid)


def crop_arg(a):
    path, box = a.rsplit(':', 1)
    return Image.open(path).convert('RGB').crop(tuple(int(v) for v in box.split(',')))


def main():
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
    D.text((24, 24), title, font=font(44), fill=INK)
    if mode == 'series':
        cap = 'front 3/4 · back 3/4 · inside the gimmick (the object) · the signature move   (the in-game mesh, materials and baked normal maps)'
    else:
        cap = 'each row: the gimmick clip at 0.0 / 0.4 / 0.8 / 1.3 / 1.8 / 2.3 s (press: left click in hand, right click on a shelf)'
    D.text((26, 80), cap, font=font(20), fill=(90, 80, 70))
    y0 = head
    if extra:  # the owner's boards (or in-game shots) along the top
        x = 24
        D.text((24, y0 - 4), "the owner's reference boards" if mode == 'series' else 'in the game: capsule reveal, in hand, on the shelf', font=font(18), fill=(90, 80, 70))
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
