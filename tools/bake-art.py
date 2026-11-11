#!/usr/bin/env python3
"""bake-art.py: the printed matter's real-art sheets (gacha display cards, product-label hero shots, posters), baked
from real, freely licensed images into high-resolution pixel-art PNGs in public/img/art/.

Every picture starts from a real source, credited in CREDITS.md:
  oi:<ImageID>@<subset>   a Google Open Images photo (CC BY 2.0), fetched from the dataset's S3 mirror
  met:<objectID>          a public-domain (CC0) work from the Metropolitan Museum's open access collection
  acg:<AssetId>           a CC0 surface photo from ambientCG (the colour map of its 1K JPG set)
  local:<path>            a photo already shipped in public/img/photos (credited there)
and is reduced the way a pixel artist would finish it: cropped and composed, an edge-keeping pass that flattens the
photographic noise into clean shapes, an area downscale, a printer's grade (a little washed towards the paper, less
saturated, the ink's contrast), a limited palette (k-means in Oklab, 20 to 40 inks per picture), a light ordered dither
in lightness only where a tone really shades off (skies), and a cleanup of orphan pixels. Nothing is generated: no
noise, no formula shapes; the only drawing is a one-pixel lit edge where the photographed table meets the backdrop.

  python3 -I tools/bake-art.py [labels] [--only id,id] [--sheet out.png]   (no group: the display cards)
Downloads are cached in shots/.art-cache (gitignored). Needs Pillow and numpy.
"""
import io, json, os, sys, urllib.request, zipfile
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'public', 'img', 'art')
CACHE = os.environ.get('ART_CACHE', os.path.join(ROOT, 'shots', '.art-cache'))
UA = {'User-Agent': 'Mozilla/5.0 (pixel-art bake)'}


# ------------------------------------------------------------------------------------------------ sources
def fetch(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
        with open(path, 'wb') as f: f.write(data)
    return path


def source(ref):
    """An RGB float image (0..1) for a source reference."""
    kind, _, rest = ref.partition(':')
    if kind == 'oi':
        iid, _, sub = rest.partition('@')
        p = fetch('https://s3.amazonaws.com/open-images-dataset/%s/%s.jpg' % (sub or 'test', iid), os.path.join(CACHE, 'oi', iid + '.jpg'))
    elif kind == 'met':
        meta = os.path.join(CACHE, 'met', rest + '.json')
        if not os.path.exists(meta):
            fetch('https://collectionapi.metmuseum.org/public/collection/v1/objects/' + rest, meta)
        o = json.load(open(meta))
        assert o.get('isPublicDomain'), 'not public domain: met ' + rest
        p = fetch(o['primaryImage'].replace('/original/', '/web-large/'), os.path.join(CACHE, 'met', rest + '_l.jpg'))
    elif kind == 'acg':
        p = os.path.join(CACHE, 'acg', rest + '.jpg')
        if not os.path.exists(p):
            z = zipfile.ZipFile(io.BytesIO(urllib.request.urlopen(urllib.request.Request(
                'https://ambientcg.com/get?file=%s_1K-JPG.zip' % rest, headers=UA), timeout=120).read()))
            name = next(n for n in z.namelist() if n.endswith('_Color.jpg'))
            os.makedirs(os.path.dirname(p), exist_ok=True)
            with open(p, 'wb') as f: f.write(z.read(name))
    elif kind == 'local':
        p = os.path.join(ROOT, 'public', 'img', 'photos', rest)
    else:
        raise ValueError(ref)
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.float32) / 255.0


# ------------------------------------------------------------------------------------------------ colour
def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def unlin(c): c = np.clip(c, 0, 1); return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def to_lab(rgb):
    r, g, b = np.moveaxis(lin(rgb), -1, 0)
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)


def to_rgb(lab):
    L, a, b = np.moveaxis(lab, -1, 0)
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return unlin(np.stack([4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                           -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                           -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s], -1))


def hexrgb(h): return np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255], np.float32) / 255.0


# ------------------------------------------------------------------------------------------------ the reduction
def crop(img, box, aspect):
    """box: (x, y, w) as fractions of the image; the height follows from the aspect (w / h of the result)."""
    H, W = img.shape[:2]
    x, y, w = box
    cw = W * w; ch = cw / aspect
    if ch > H: ch = H; cw = ch * aspect
    x0 = int(round(min(max(0, W * x), W - cw))); y0 = int(round(min(max(0, H * y), H - ch)))
    return img[y0:y0 + int(round(ch)), x0:x0 + int(round(cw))]


def area(img, w, h):
    """Area downscale in linear light."""
    out = np.stack([np.asarray(Image.fromarray(lin(img[..., k]).astype(np.float32), 'F').resize((w, h), Image.BOX)) for k in range(3)], -1)
    return unlin(out)


def blur(a):
    """A small soft blur (two 3 x 3 box passes, edges held)."""
    for _ in range(2):
        p = np.pad(a, 1, mode='edge'); H, W = a.shape
        a = sum(p[dy:dy + H, dx:dx + W] for dy in range(3) for dx in range(3)) / 9.0
    return a


def bilateral(lab, r=2, ss=1.6, sr=0.06, passes=2):
    for _ in range(passes):
        acc = np.zeros_like(lab); wsum = np.zeros(lab.shape[:2], np.float32)
        pad = np.pad(lab, ((r, r), (r, r), (0, 0)), mode='edge')
        H, W = lab.shape[:2]
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                nb = pad[r + dy:r + dy + H, r + dx:r + dx + W]
                d2 = ((nb - lab) ** 2).sum(-1)
                wgt = np.exp(-(dx * dx + dy * dy) / (2 * ss * ss)) * np.exp(-d2 / (2 * sr * sr))
                acc += nb * wgt[..., None]; wsum += wgt
        lab = acc / wsum[..., None]
    return lab


def kmeans(P, k, iters=18, seed=7):
    rng = np.random.default_rng(seed)
    S = P[rng.choice(len(P), min(len(P), 24000), replace=False)]
    # seeds spread along lightness, then along hue
    order = np.argsort(S[:, 0] + 0.35 * np.arctan2(S[:, 2], S[:, 1]) * np.hypot(S[:, 1], S[:, 2]))
    C = S[order[np.linspace(0, len(S) - 1, k).astype(int)]].copy()
    for _ in range(iters):
        lab = ((S[:, None, :] - C[None]) ** 2).sum(-1).argmin(1)
        for j in range(k):
            m = lab == j
            if m.any(): C[j] = S[m].mean(0)
    return C


BAYER = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + 0.5) / 16 - 0.5


def assign(lab, C, dither=0.0):
    H, W = lab.shape[:2]
    q = lab.copy()
    if dither:
        q[..., 0] += np.tile(BAYER, (H // 4 + 1, W // 4 + 1))[:H, :W] * dither
    d = ((q.reshape(-1, 1, 3) - C[None]) ** 2 * np.array([1.0, 0.8, 0.8])).sum(-1)
    return d.argmin(1).reshape(H, W)


def cleanup(L, rounds=2):
    """Orphans (no 4-neighbour of their own ink) take the ink most of their 8 neighbours have."""
    for _ in range(rounds):
        p = np.pad(L, 1, mode='edge')
        H, W = L.shape
        n4 = [p[0:H, 1:W + 1], p[2:H + 2, 1:W + 1], p[1:H + 1, 0:W], p[1:H + 1, 2:W + 2]]
        n8 = n4 + [p[0:H, 0:W], p[0:H, 2:W + 2], p[2:H + 2, 0:W], p[2:H + 2, 2:W + 2]]
        lonely = np.all([n != L for n in n4], 0)
        st = np.stack(n8, -1)
        best = np.zeros_like(L); bc = np.zeros_like(L)
        for k in range(8):
            c = (st == st[..., k:k + 1]).sum(-1)
            upd = c > bc; best = np.where(upd, st[..., k], best); bc = np.where(upd, c, bc)
        L = np.where(lonely & (bc >= 4), best, L)
    return L


def grade(lab, wash=0.2, paper=0xfff6e4, sat=0.85, con=1.0, lift=0.0, tint=None, tint_k=0.0):
    lab = lab.copy()
    lab[..., 1:] *= sat
    lab[..., 0] = (lab[..., 0] - 0.6) * con + 0.6 + lift
    if tint is not None:
        lab[..., 1:] = lab[..., 1:] * (1 - tint_k) + to_lab(hexrgb(tint))[1:] * tint_k
    P = to_lab(hexrgb(paper))
    return lab * (1 - wash) + P * wash


def pixelate(img, w, h, k=28, wash=0.2, sat=0.9, con=1.08, lift=0.0, dither=0.012, smooth=0.09, passes=3, tint=None, tint_k=0.0, rounds=3, sharp=0.9):
    """A cropped photo or print -> (rgb uint8 h x w x 3) high-resolution pixel art."""
    big = area(img, w * 2, h * 2)
    lab = bilateral(to_lab(big), sr=smooth, passes=passes) if passes else to_lab(big)
    small = to_lab(area(to_rgb(lab), w, h))
    if sharp:  # an unsharp touch on lightness, so edges land on whole pixels
        Lb = blur(small[..., 0])
        small[..., 0] += (small[..., 0] - Lb) * sharp
    small = grade(small, wash, sat=sat, con=con, lift=lift, tint=tint, tint_k=tint_k)
    C = kmeans(small.reshape(-1, 3), k)
    L = cleanup(assign(small, C, dither), rounds)
    return (to_rgb(C[L]) * 255 + 0.5).astype(np.uint8)


def save(rgb, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.fromarray(rgb)
    n = len(np.unique(rgb.reshape(-1, rgb.shape[-1]), axis=0))
    if n <= 256 and rgb.shape[-1] == 3: im = im.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    im.save(path, optimize=True)
    return os.path.getsize(path)


# ------------------------------------------------------------------------------------------------ the display cards
# A card's backdrop (src/figures/flyer.js: 640 x 338 of the 640 x 560 card, printed in 2 x 2 blocks, so 320 x 169 here):
# a real photograph or print of the series' place, and along the bottom 26 rows the surface the figures stand on, a
# real surface photo seen low (squashed) with a lit front edge.
CW, CH, FLOOR = 320, 169, 26
# series: (backdrop source, crop (x, y, w) fractions, floor source, options)
CARDS = {
    'mochi':     ('oi:05992b1991659e33@validation', (0.0, 0.25, 1.0), 'acg:Grass004', dict(wash=0.18, sat=1.2, con=1.12, tint=0xf0b0c4, tint_k=0.45)),
    'hoshitate': ('local:cumulus.jpg', (0.0, 0.2, 1.0), 'acg:Concrete034', dict(wash=0.18)),
    'shokudo':   ('oi:41a0268c320af00e@validation', (0.0, 0.18, 1.0), 'acg:Wood049', dict(wash=0.32)),
    'hakoiri':   ('local:parcels.jpg', (0.0, 0.55, 1.0), 'acg:Wood051', dict(wash=0.26)),
    'kasa':      ('local:rainy_lane.jpg', (0.0, 0.35, 1.0), 'acg:PavingStones070', dict(wash=0.2)),
    'bungu':     ('oi:669c4c7bbe75cb0b@test', (0.0, 0.08, 1.0), 'acg:Wood051', dict(wash=0.24)),
    'showa':     ('local:prints/kawai_house.jpg', (0.0, 0.3, 1.0), 'acg:Tatami001', dict(wash=0.2)),
    'konbini':   ('oi:93cc30e919f2ed47@test', (0.0, 0.25, 1.0), 'acg:Concrete034', dict(wash=0.34)),
    'omocha':    ('oi:ca2191dfa313b006@test', (0.0, 0.1, 1.0), 'acg:Wood049', dict(wash=0.4, sat=0.9)),
    'heya':      ('oi:aee63c54b2a4e0a6@test', (0.0, 0.2, 1.0), 'acg:WoodFloor041', dict(wash=0.28)),
    'machikado': ('local:back_street.jpg', (0.0, 0.4, 1.0), 'acg:Asphalt025A', dict(wash=0.2)),
    'kaden':     ('oi:a442e976af3e94e5@test', (0.0, 0.25, 1.0), 'acg:Concrete034', dict(wash=0.32)),
    'yokai':     ('met:55553', (0.05, 0.5, 0.9), 'acg:Ground054', dict(wash=0.12, sat=1.0, lift=0.08, con=1.15)),
    'onsen':     ('met:56915', (0.03, 0.12, 0.94), 'acg:Rock030', dict(wash=0.1, sat=0.95)),
    'dajare':    ('oi:3454f5c299102bea@validation', (0.0, 0.12, 1.0), 'acg:WoodFloor041', dict(wash=0.16)),
    'pachimon':  ('local:toy_shop.jpg', (0.0, 0.42, 1.0), 'acg:Wood051', dict(wash=0.32)),
    'kaiju':     ('local:skyline.jpg', (0.0, 0.3, 1.0), 'acg:Asphalt025A', dict(wash=0.1, lift=0.08, con=1.15)),
    'uchu':      ('local:galaxy.jpg', (0.0, 0.3, 1.0), 'acg:MetalPlates006', dict(wash=0.06, sat=1.0)),
    'omamori':   ('oi:0fada83d41fbde5d@validation', (0.0, 0.2, 1.0), 'acg:Gravel022', dict(wash=0.2)),
    'neko_cafe': ('oi:041b3597d605f38a@test', (0.0, 0.2, 1.0), 'acg:Wood049', dict(wash=0.2)),
    'wagashi':   ('met:45299', (0.04, 0.12, 0.92), 'acg:Tatami001', dict(wash=0.12)),
    'matsuri':   ('met:37093', (0.05, 0.56, 0.9), 'acg:Planks012', dict(wash=0.1)),
    'sentai':    ('oi:34e438905666f290@validation', (0.0, 0.1, 1.0), 'acg:Ground054', dict(wash=0.22)),
    'densha':    ('oi:2ab37fb75e9ecd33@test', (0.0, 0.3, 1.0), 'acg:Concrete034', dict(wash=0.32)),
    'umi':       ('local:lane/aquarium.jpg', (0.0, 0.3, 1.0), 'acg:Concrete034', dict(wash=0.14)),
    'obake_yashiki': ('met:55743', (0.015, 0.02, 0.97), 'acg:Planks012', dict(wash=0.12, lift=0.04)),
    'bizarre':   ('oi:8a8d05961ec690a1@test', (0.0, 0.3, 1.0), 'acg:Asphalt025A', dict(wash=0.08, sat=1.0)),
    'lanepals':  ('local:back_street.jpg', (0.0, 0.2, 1.0), 'acg:Asphalt025A', dict(wash=0.2)),
    'menzoo':    ('local:products/ramen_shoyu.jpg', (0.0, 0.3, 1.0), 'acg:Wood049', dict(wash=0.26)),
    'oden':      ('local:products/oden.jpg', (0.0, 0.3, 1.0), 'acg:Wood051', dict(wash=0.26)),
    'shotengai': ('local:shutters.jpg', (0.0, 0.45, 1.0), 'acg:PavingStones070', dict(wash=0.2)),
    'haniwa':    ('local:prints/bamboo_forest.jpg', (0.0, 0.3, 1.0), 'acg:Ground054', dict(wash=0.2)),
    'chibitto':  ('oi:672bfcfa436a0a63@test', (0.0, 0.32, 1.0), 'acg:Concrete034', dict(wash=0.06, sat=1.0)),
}


def floor_strip(ref, w=CW, h=FLOOR, k=12):
    img = source(ref)
    # a band of the surface seen low: the full width, squashed to about a third of its height
    band = crop(img, (0.0, 0.3, 1.0), w / (h / 0.34))
    px = pixelate(band, w, h, k=k, wash=0.04, sat=1.0, con=1.3, dither=0.0, passes=1, sharp=0.6)
    lab = to_lab(px / 255.0)
    # the lit front edge and the shade under it, in the surface's own colour
    lab[0, :, 0] = lab[0, :, 0] * 0.4 + min(0.97, lab[1:, :, 0].mean() + 0.16) * 0.6
    lab[0, :, 1:] *= 0.6
    lab[1, :, 0] -= 0.07
    lab[2:, :, 0] -= np.linspace(0.04, 0.0, h - 2)[:, None]
    return (to_rgb(lab) * 255 + 0.5).astype(np.uint8)


def bake_card(sid):
    ref, box, floor, o = CARDS[sid]
    img = source(ref)
    top = crop(img, box, CW / CH)
    px = pixelate(top, CW, CH, k=o.get('k', 28), **{k: v for k, v in o.items() if k != 'k'})
    px[CH - FLOOR:] = floor_strip(floor)
    return save(px, os.path.join(OUT, 'cards', sid + '.png')), px


# ------------------------------------------------------------------------------------------------ the label windows
# Every photo window the labels, packs and menus ask for (tools/art-labels.json, written by src/dev/art.js from
# src/products/photos.js PHOTO_REQUESTS) baked at exactly its size onto one sheet, public/img/art/labels.png + .json.
# A window shows its photo (public/img/photos/products, credited there); fruit and cups are real cut-outs instead, cut
# from Open Images' hand-made segmentation masks (CC BY 2.0 photos, the masks CC BY 4.0) and printed on the label as a
# sticker (src/products/photos.js framed() adds the white keyline and the ink rim round the silhouette).
CUTS = {  # name: (subset, mask file)
    'melon': ('validation', '0aebb420d22f3e6e_m0kpt__9da4286a.png', dict(sat=1.6, con=1.18)),
    'lemon': ('test', '197d6d46a493a45d_m0hqkz_758c2318.png'),
    'grapefruit': ('validation', 'e9d0afbfc0bdb2c9_m0hqkz_1b6e4e75.png'),
    'orange': ('validation', '52c33abf081b58ce_m0hqkz_4b4a265f.png'),
    'coffee': ('test', '8ddbe71a5ac1d646_m02p5f1q_41e623dd.png'),
    'teacup': ('test', '27e46f5f25ce1d6a_m02jvh9_89798823.png'),
    'plum': ('test', '8e6716ad6cc01e60_m0dj6p_a55c45d7.png'),
}


def seg_mask(sub, path):
    z = fetch('https://storage.googleapis.com/openimages/v5/%s-masks/%s-masks-%s.zip' % (sub, sub, path[0]), os.path.join(CACHE, 'seg', '%s-masks-%s.zip' % (sub, path[0])))
    return Image.open(io.BytesIO(zipfile.ZipFile(z).read(path))).convert('L')


def cutout(name, w, h):
    sub, mp, *more = CUTS[name]
    o = dict(k=14, wash=0.0, sat=1.12, con=1.1, dither=0.0, passes=2, sharp=0.7, rounds=2); o.update(more[0] if more else {})
    iid = mp.split('_')[0]
    img = source('oi:%s@%s' % (iid, sub))
    H, W = img.shape[:2]
    m = np.asarray(seg_mask(sub, mp).resize((W, H), Image.BILINEAR), np.float32) / 255.0
    ys, xs = np.where(m > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    img, m = img[y0:y1, x0:x1], m[y0:y1, x0:x1]
    # fill round the subject with its own mean colour, so the palette is all subject
    mean = (img * m[..., None]).sum((0, 1)) / max(1, m.sum())
    img = img * m[..., None] + mean * (1 - m[..., None])
    k = min(w / img.shape[1], h / img.shape[0]); fw, fh = max(4, round(img.shape[1] * k)), max(4, round(img.shape[0] * k))
    rgb = pixelate(img, fw, fh, **o)
    a = np.asarray(Image.fromarray(m.astype(np.float32), 'F').resize((fw, fh), Image.BOX)) > 0.5
    out = np.zeros((h, w, 4), np.uint8)
    ox, oy = (w - fw) // 2, (h - fh) // 2
    out[oy:oy + fh, ox:ox + fw, :3] = rgb; out[oy:oy + fh, ox:ox + fw, 3] = a * 255
    return out


def window(r):
    name, w, h = r['name'], r['w'], r['h']
    if name in CUTS: return cutout(name, w, h)
    img = source('local:products/%s.jpg' % name)
    Hh, Ww = img.shape[:2]
    sc = min(Ww / w, Hh / h); cw, ch = w * sc, h * sc
    x0 = int((Ww - cw) * (r.get('fx') if r.get('fx') is not None else 0.5)); y0 = int((Hh - ch) * (r.get('fy') if r.get('fy') is not None else 0.5))
    rgb = pixelate(img[y0:y0 + int(ch), x0:x0 + int(cw)], w, h, k=16 if w * h > 2000 else 12, wash=0.0, sat=1.15, con=1.1, dither=0.0, passes=2, sharp=0.7)
    out = np.zeros((h, w, 4), np.uint8); out[..., :3] = rgb; out[..., 3] = 255
    if r['shape'] == 'circle':
        yy, xx = np.mgrid[0:h, 0:w]
        out[((xx + 0.5 - w / 2) / (w / 2)) ** 2 + ((yy + 0.5 - h / 2) / (h / 2)) ** 2 > 1, 3] = 0
    return out


def bake_labels():
    reqs = json.load(open(os.path.join(ROOT, 'tools', 'art-labels.json')))
    tiles = [(r['name'] + '|%dx%d|' % (r['w'], r['h']) + r['shape'], window(r)) for r in reqs]
    SW = 512; x = y = rowh = 0; index = {}; place = []
    for key, t in sorted(tiles, key=lambda kt: -kt[1].shape[0]):
        th, tw = t.shape[:2]
        if x + tw > SW: x = 0; y += rowh + 1; rowh = 0
        index[key] = [x, y, tw, th]; place.append((x, y, t)); x += tw + 1; rowh = max(rowh, th)
    sheet = np.zeros((y + rowh, SW, 4), np.uint8)
    for x, y, t in place: sheet[y:y + t.shape[0], x:x + t.shape[1]] = t
    os.makedirs(OUT, exist_ok=True)
    Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, 'labels.png'), optimize=True)
    json.dump(index, open(os.path.join(OUT, 'labels.json'), 'w'), separators=(',', ':'))
    print('labels: %d windows, %d bytes' % (len(index), os.path.getsize(os.path.join(OUT, 'labels.png'))))
    return sheet


def main():
    args = sys.argv[1:]
    only = None; sheet = None
    if '--only' in args: only = args[args.index('--only') + 1].split(',')
    if '--sheet' in args: sheet = args[args.index('--sheet') + 1]
    if 'labels' in args:
        sh = bake_labels()
        if sheet: Image.fromarray(sh, 'RGBA').resize((sh.shape[1] * 3, sh.shape[0] * 3), Image.NEAREST).save(sheet)
        return
    total = 0; tiles = []
    for sid in CARDS:
        if only and sid not in only: continue
        n, px = bake_card(sid); total += n; tiles.append((sid, px))
        print('card %-14s %6d bytes' % (sid, n))
    print('cards: %d bytes' % total)
    if sheet and tiles:
        cols = 4; S = 2
        im = Image.new('RGB', (cols * (CW * S + 8) + 8, ((len(tiles) + cols - 1) // cols) * (CH * S + 8) + 8), (40, 34, 30))
        for i, (sid, px) in enumerate(tiles):
            im.paste(Image.fromarray(px).resize((CW * S, CH * S), Image.NEAREST), (8 + (i % cols) * (CW * S + 8), 8 + (i // cols) * (CH * S + 8)))
        im.save(sheet)


if __name__ == '__main__':
    main()
