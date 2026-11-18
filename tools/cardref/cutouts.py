#!/usr/bin/env python3
"""cutouts.py: real-photo cut-outs for the gacha cards (the way the reference boards layer real leaves and fruit).
Cut from Open Images' hand-made segmentation masks (photos CC BY 2.0 by their Flickr authors, masks CC BY 4.0 Google),
largest clean instances first (box well inside the photo), hard alpha edge. Cache: shots/.art-cache/cuts/<class>_<k>.png
and cuts.json (image id, author, title, source, licence) for CREDITS.md.
  python3 -I tools/cardref/cutouts.py [contact]     (contact: shots/clone/cutouts.png to review them)"""
import os, sys, io, csv, json, zipfile
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from printkit import CACHE, source

SEG = os.path.join(CACHE, 'seg'); OUT = os.path.join(CACHE, 'cuts')
WANT = ['Pen', 'Ruler', 'Scissors', 'Pencil case', 'Adhesive tape', 'Sword', 'Dagger', 'Fish', 'Oyster', 'Lemon', 'Kettle',
        'Corded phone', 'Alarm clock', 'Starfish', 'Sea turtle', 'Flag', 'Balloon', 'Pumpkin', 'Candle', 'Skull', 'Milk', 'Towel',
        'Duck', 'Tap', 'Skyscraper', 'Tank', 'Camera', 'Flower', 'Rose', 'Clock', 'Teapot', 'Watch', 'Rocket', 'Dice', 'Boot',
        'Kite', 'Sun hat', 'Common sunflower', 'Train', 'Suitcase', 'Coin', 'Motorcycle', 'Ball', 'Cowboy hat', 'Snake',
        'Lighthouse', 'Canoe', 'Fedora', 'Tie', 'Cocktail', 'Mushroom', 'Frog', 'Strawberry', 'Lizard']
PER = 3
SKIP = set()  # mask files rejected on review (cut badly / other things in the cut)


def pick():
    names = {r[0]: r[1] for r in csv.reader(open(os.path.join(SEG, 'class-descriptions-boxable.csv')))}
    mid = {v: k for k, v in names.items()}
    have = {(f.split('-')[0], f.split('-')[-1][0]) for f in os.listdir(SEG) if f.endswith('.zip')}
    meta = {}
    for sub in ('test', 'validation'):
        for r in csv.DictReader(open(os.path.join(SEG, sub + '-images-with-rotation.csv'))):
            if 'by/2.0' in r['License'] and r['Rotation'] in ('', '0.0'): meta[r['ImageID']] = r
    cand = {w: [] for w in WANT}
    want = {mid[w]: w for w in WANT if w in mid}
    for sub in ('test', 'validation'):
        for r in csv.DictReader(open(os.path.join(SEG, sub + '.csv'))):
            w = want.get(r['LabelName'])
            if not w or (sub, r['MaskPath'][0]) not in have or r['ImageID'] not in meta or r['MaskPath'] in SKIP: continue
            x0, x1, y0, y1 = (float(r[k]) for k in ('BoxXMin', 'BoxXMax', 'BoxYMin', 'BoxYMax'))
            if min(x0, y0, 1 - x1, 1 - y1) < 0.015: continue
            cand[w].append(((x1 - x0) * (y1 - y0), sub, r))
    return cand, meta


def cut(sub, r):
    z = zipfile.ZipFile(os.path.join(SEG, '%s-masks-%s.zip' % (sub, r['MaskPath'][0])))
    m = Image.open(io.BytesIO(z.read(r['MaskPath']))).convert('L')
    arr = np.asarray(source('oi:%s@%s' % (r['ImageID'], sub)), np.float32)
    img = Image.fromarray(np.clip(arr * (255 if arr.max() <= 1.0 else 1), 0, 255).astype(np.uint8)).convert('RGB')
    m = np.asarray(m.resize(img.size, Image.BILINEAR)) > 127
    ys, xs = np.where(m)
    if len(ys) < 400: return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    a = np.dstack([np.asarray(img)[y0:y1, x0:x1], (m[y0:y1, x0:x1] * 255).astype(np.uint8)])
    return Image.fromarray(a, 'RGBA')


def build():
    os.makedirs(OUT, exist_ok=True)
    cand, meta = pick(); credits = {}
    for w, L in cand.items():
        k = 0
        for area, sub, r in sorted(L, key=lambda t: -t[0]):
            if k >= PER: break
            try: im = cut(sub, r)
            except Exception as e: print('skip', w, r['MaskPath'], e); continue
            if im is None: continue
            key = '%s_%d' % (w.lower().replace(' ', '_'), k)
            im.thumbnail((640, 640), Image.LANCZOS); im.save(os.path.join(OUT, key + '.png'))
            m = meta[r['ImageID']]
            credits[key] = dict(cls=w, mask=r['MaskPath'], id=r['ImageID'], author=m['Author'], title=m['Title'],
                                source=m['OriginalLandingURL'], licence='CC BY 2.0')
            k += 1
        print(w, k)
    json.dump(credits, open(os.path.join(OUT, 'cuts.json'), 'w'), indent=1)


def contact():
    C = json.load(open(os.path.join(OUT, 'cuts.json'))); keys = sorted(C)
    o = Image.new('RGB', (12 * 110, ((len(keys) + 11) // 12) * 110), (60, 60, 64))
    from PIL import ImageDraw
    d = ImageDraw.Draw(o)
    for i, k in enumerate(keys):
        im = Image.open(os.path.join(OUT, k + '.png')); im.thumbnail((100, 96))
        o.paste(im, ((i % 12) * 110 + 4, (i // 12) * 110), im); d.text(((i % 12) * 110 + 2, (i // 12) * 110 + 98), k[:18], fill='white')
    o.save(os.path.join(os.path.dirname(CACHE), 'clone', 'cutouts.png'))


if __name__ == '__main__':
    if 'contact' not in sys.argv: build()
    contact()
