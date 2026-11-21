#!/usr/bin/env python3
"""bake-canva.py: bakes the posters and notices redesigned in Canva into the game's print sheets.
Each design starts from a human-designed Canva template (never Canva's AI image generation), filled with our own real
photos (credited in CREDITS.md) and English text, then exported from Canva as PNG. The exports are kept, shrunk, as
source art in art/print/canva/<name>.webp; this script ages them like paper on a wall (tools/paperkit.py: real paper
stock, sun fade, folds, tape) and packs them into the sheet, replacing the old panels of the same design.
Run it after tools/bake-posters.py (which rebuilds the lane sheet from scratch).
  python3 -I tools/bake-canva.py [--sheet out.png]

  art/print/canva/      Canva template                                    -> sheet key
  lost_cat0.webp        "Brown Vintage Missing Cat Poster" (EAFW8vNJs-4)  -> lane:lost:cat0
  lost_cat1.webp        "Beige and Brown Modern Aesthetic Missing Cat
                         Poster" (EAFu39Od7ao)                            -> lane:lost:cat1
  lost_dog0.webp        "Blue and Orange Organic Shapes Lost Cat Flyer"
                         (EAFSHeSX8FQ)                                    -> lane:lost:dog0
"""
import os, sys, json, importlib.util
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
import paperkit as PK
from printkit import ROOT
_bp = importlib.util.spec_from_file_location('bake_print', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-print.py'))
BP = importlib.util.module_from_spec(_bp); _bp.loader.exec_module(BP)

SRC = os.path.join(ROOT, 'art', 'print', 'canva')
# key -> (source, final px size (A-series, ~700 px/m on a 0.22-0.26 m notice), paper ageing outdoors)
LANE = {
    'lane:lost:cat0': ('lost_cat0', (180, 255), dict(paper='Paper002', fade=0.18, streak=0.5, crease=0.6, folds=(1, 1), tape=('tl', 'tr'), seed=41)),
    'lane:lost:cat1': ('lost_cat1', (180, 255), dict(paper='Paper002', fade=0.1, streak=0.35, crease=0.4, folds=(1, 1), tape=('tl', 'tr'), torn=('br',), seed=42)),
    'lane:lost:dog0': ('lost_dog0', (180, 255), dict(paper='Paper002', fade=0.25, streak=0.6, crease=0.7, folds=(1, 1), tape=('tl', 'tr'), seed=43)),
}
REPLACES = ('lane:lost:',)  # the old panels these designs supersede


def panel(src, size, age):
    im = Image.open(os.path.join(SRC, src + '.webp')).convert('RGB')
    w, h = size
    # aged at twice the final size (paper grain and fold lines at print scale), then shrunk once
    im = im.resize((w * 2, h * 2), Image.LANCZOS)
    return PK.age(im, **age).resize((w, h), Image.LANCZOS)


def sheet_panels(name):
    """The panels already on a sheet (key -> RGBA image), read back from the shipped WebP."""
    reg = json.load(open(os.path.join(ROOT, 'src', 'gfx', 'print', name + '.json')))
    img = Image.open(os.path.join(ROOT, 'public', 'img', 'print', name + '.webp')).convert('RGBA')
    return {k: img.crop((r[0], r[1], r[0] + r[2], r[1] + r[3])) for k, r in reg.items() if k != '_size'}


if __name__ == '__main__':
    ims = {k: v for k, v in sheet_panels('lane').items() if not k.startswith(REPLACES)}
    for k, (src, size, age) in LANE.items(): ims[k] = panel(src, size, age)
    out, idx = BP.pack(ims, 1024, alpha=True)
    if '--sheet' in sys.argv:
        p = sys.argv[sys.argv.index('--sheet') + 1]
        bg = Image.new('RGBA', out.size, (90, 84, 78, 255)); bg.alpha_composite(out); bg.convert('RGB').save(p)
        print('sheet', p, out.size)
    else:
        BP.save_sheet('lane', out, idx, near=True)
