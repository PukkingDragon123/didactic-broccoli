#!/usr/bin/env python3
"""Capsule 98 desktop wallpapers: real photographs from Wikimedia Commons (public domain / CC0), cropped to the
CRT's 4:3 and saved at 1024 x 768 into public/img/wallpapers/ (src/os/art.js WALLPAPERS lists them; the credits are in
CREDITS.md and public/CREDITS.txt).

    python3 tools/wallpapers.py [download_dir]

Downloads the Commons thumbnails (1280 px) into download_dir (default: a temp dir) unless they're already there.
Commons rate-limits scripted downloads: on an error, wait a minute and run it again.
"""
import os
import sys
import tempfile
import time
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img', 'wallpapers')
UA = 'GachaGarageWallpapers/1.0 (game asset build)'
T = 'https://upload.wikimedia.org/wikipedia/commons/thumb/'

# id: (thumbnail url, crop box as fractions (l, t, r, b) before the 4:3 centre crop, focus y 0..1)
SOURCES = {
    # "Sunrise with Mount Fuji - March 2025", Romain Guy, CC0
    'fuji': (T + '2/29/Sunrise_with_Mount_Fuji_-_March_2025.jpg/1280px-Sunrise_with_Mount_Fuji_-_March_2025.jpg', (0, 0, 1, 1), 0.55),
    # "Mt Hiei with Cherry Blossom", Hahifuheho, CC0
    'sakura': (T + '6/63/Mt_Hiei_with_Cherry_Blossom.JPG/1280px-Mt_Hiei_with_Cherry_Blossom.JPG', (0, 0, 1, 1), 0.5),
    # "The Hot Springs At Atami" (1915 lantern slide), OSU Special Collections & Archives, no known restrictions
    'atami': (T + 'd/d4/The_Hot_Springs_At_Atami_%284788363936%29.jpg/1280px-The_Hot_Springs_At_Atami_%284788363936%29.jpg', (0.035, 0.05, 0.965, 0.95), 0.5),
    # "Cumulus clouds in the sky", desilia (Pixabay), CC0
    'clouds': (T + '0/0a/Cumulus_clouds_in_the_sky.jpg/1280px-Cumulus_clouds_in_the_sky.jpg', (0, 0, 1, 1), 0.45),
    # "Sky Clouds Sea", unknown photographer (PikWizard), CC0
    'sea': (T + 'a/ae/Sky_Clouds_Sea.jpg/1280px-Sky_Clouds_Sea.jpg', (0, 0, 1, 1), 0.5),
}


def fetch(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 10000:
        return
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req) as r, open(path, 'wb') as f:
        f.write(r.read())
    time.sleep(3)


def build(src, crop, focus, out):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    l, t, r, b = crop
    im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
    w, h = im.size
    if w / h > 4 / 3:  # too wide: trim the sides
        nw = round(h * 4 / 3)
        x = (w - nw) // 2
        im = im.crop((x, 0, x + nw, h))
    else:  # too tall: trim top and bottom around the focus
        nh = round(w * 3 / 4)
        y = max(0, min(h - nh, round(focus * h - nh / 2)))
        im = im.crop((0, y, w, y + nh))
    im = im.resize((1024, 768), Image.LANCZOS)
    im.save(out, 'JPEG', quality=84, optimize=True, progressive=True)


def main():
    dl = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='wallpapers-')
    os.makedirs(OUT, exist_ok=True)
    for wid, (url, crop, focus) in SOURCES.items():
        src = os.path.join(dl, wid + '.jpg')
        fetch(url, src)
        build(src, crop, focus, os.path.join(OUT, wid + '.jpg'))
        print('wrote', wid, os.path.getsize(os.path.join(OUT, wid + '.jpg')) // 1024, 'KB')


if __name__ == '__main__':
    main()
