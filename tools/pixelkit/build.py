"""Gacha Garage pixel-art kit builder.
   python3 tools/pixelkit/build.py [--render job,job|all] [--sheet]
3D props (coins, piggy, tin bank, purse, capsule) are modelled + rendered in Blender (render3d.py, normals + id
passes at 4x), then toon-stepped here with an upper-left key, quantised to fixed 7-step ramps by 4x4 majority,
outlined in a dark coloured line and hand-detailed (stamped decals). Flat paper items are hand-pixelled (flat.py).
Writes public/img/pixelkit/kit.png + kit.json (strips: one row of same-size frames per sprite, fps, loop)."""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(__file__))
from pk import *
import coins as CO

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
WORK = os.path.join(ROOT, 'art', 'pixelkit', '_render')
OUT = os.path.join(ROOT, 'public', 'img', 'pixelkit')

R7 = {
    'nickel': ramp('#2f2b38', '#4d4957', '#6f6c78', '#96949c', '#bdbdbd', '#e0ded4', '#fbf9ee'),
    'alu': ramp('#383b49', '#585e6e', '#7d8494', '#a5acb8', '#c9ced6', '#e5e9ec', '#fbfcfa'),
    'brass': ramp('#3a2712', '#654519', '#926a24', '#bb9233', '#d9b653', '#eed686', '#fdf3c8'),
    'bronze': ramp('#2f1711', '#55281a', '#7d3d24', '#a25732', '#c27848', '#dc9d6c', '#f3c99e'),
    'gold': ramp('#3a2810', '#684815', '#966c1e', '#c09630', '#dcba55', '#f0da8c', '#fff6d0'),
    'token': ramp('#2d1a10', '#553218', '#7f4f20', '#a8722a', '#c9963c', '#e4bf68', '#f8e5a6'),
    'pink': ramp('#5a2438', '#7f3448', '#a74b5c', '#c96a75', '#e18f96', '#f2b7b2', '#fde3d6'),
    'label': ramp('#3e1218', '#62191f', '#8a2427', '#b2362f', '#cf5640', '#e57d58', '#f4a77a'),
    'indigo': ramp('#141a33', '#1f2a4d', '#2c3d68', '#3e5585', '#5873a0', '#7c96b8', '#a9bdd2'),
    'cream': ramp('#5e5040', '#857258', '#a99474', '#c9b592', '#e0d0ad', '#efe3c6', '#faf3e0'),
    'capred': ramp('#4a1416', '#7a1f1f', '#a8332a', '#cc5038', '#e47a52', '#f2a77c', '#fcd8b6'),
    'white': ramp('#6a6170', '#8d8590', '#b0a9ae', '#cdc7c6', '#e3ded7', '#f2eee6', '#fdfbf5'),
    'paper': ramp('#7d5a44', '#9a7456', '#b8916c', '#d2ae86', '#e6caa2', '#f3e0be', '#fcf1da'),
}
OL = {'silver': C('#1d1b27'), 'gold': C('#2a160c'), 'pig': C('#3d1424'), 'tin': C('#22141a'), 'purse': C('#120f1f'), 'cap': C('#2b1418')}


# ======================= decoding + toon stepping ======================================
def load(job, fi):
    d = os.path.join(WORK, job)
    n = np.asarray(Image.open(f'{d}/f{fi}_n.png').convert('RGBA')).astype(float) / 255
    i = np.asarray(Image.open(f'{d}/f{fi}_i.png').convert('RGBA')).astype(float) / 255
    a = n[..., 3] > 0.5
    nv = n[..., :3] * 2 - 1
    nv[..., 2] *= -1  # Cycles camera space looks down +z
    nv /= np.maximum(np.linalg.norm(nv, axis=-1, keepdims=True), 1e-6)
    return a, nv, np.round(i[..., 0] * 32).astype(int), i[..., 1], i[..., 2] * 20


def shade(nv, kind):
    diff = np.clip(nv @ L, 0, 1)
    spec = np.clip(nv @ HV, 0, 1)
    env = 0.5 + 0.5 * nv[..., 1]
    if kind == 'metal':
        s = 0.13 + 0.36 * diff + 0.3 * env + 1.0 * spec ** 14
        return np.clip((s * 7).astype(int), 0, 6)
    if kind == 'glaze':  # ceramic / plastic: soft bands + crisp hot spot
        s = 0.0 + 0.86 * diff + 0.14 * np.clip(nv[..., 1], 0, 1)
        k = np.clip((s * 6.2).astype(int), 0, 5)
        return np.where(spec ** 50 > 0.5, 6, k)
    s = 0.04 + 0.86 * diff + 0.1 * env  # matte cloth / paper
    return np.clip((s * 6.4).astype(int), 0, 5)


def downsample(alpha, key, depth, k=4):
    H, W = alpha.shape[0] // k, alpha.shape[1] // k
    A = np.zeros((H, W), bool); K = np.zeros((H, W), int); D = np.full((H, W), 99.0)
    for y in range(H):
        for x in range(W):
            a = alpha[y * k:(y + 1) * k, x * k:(x + 1) * k]
            if a.sum() * 2 < k * k:
                continue
            A[y, x] = True
            kk = key[y * k:(y + 1) * k, x * k:(x + 1) * k][a]
            v, c = np.unique(kk, return_counts=True)
            best = v[c == c.max()]
            if len(best) > 1:  # tie: the sample nearest the pixel centre
                cen = key[y * k + k // 2 - 1:y * k + k // 2 + 1, x * k + k // 2 - 1:x * k + k // 2 + 1].ravel()
                best = [b for b in cen if b in best] or best
            K[y, x] = best[0]
            D[y, x] = depth[y * k:(y + 1) * k, x * k:(x + 1) * k][a].min()
    return A, K, D


def colourise(A, K, pal):
    """K = mid*100 + sub*10 + step; pal(mid, sub) -> ramp."""
    out = blank(A.shape[1], A.shape[0])
    for y, x in zip(*np.nonzero(A)):
        k = K[y, x]
        rp = pal(k // 100, (k // 10) % 10)
        out[y, x] = rp[min(k % 10, len(rp) - 1)]
    return out


def depth_lines(img, A, D, col, thr):
    m = np.zeros_like(A)
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        nb = np.roll(np.roll(D, dy, 0), dx, 1)
        na = np.roll(np.roll(A, dy, 0), dx, 1)
        m |= A & na & (D > nb + thr)
    img[m] = col
    return img


def clean_singles(img, A):
    """Hand clean-up: a lone pixel whose 4 neighbours all share one colour takes that colour."""
    out = img.copy()
    H, W = A.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not A[y, x]:
                continue
            nb = [tuple(img[y + dy, x + dx]) for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0))]
            if all(A[y + dy, x + dx] for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0))) and nb.count(nb[0]) == 4 and nb[0] != tuple(img[y, x]):
                out[y, x] = nb[0]
    return out


def hard_shadow(img, cx, y0, hw, rows=2):
    sh = blank(img.shape[1], img.shape[0])
    for j in range(rows + 1):
        w = hw - j * 2
        for x in range(int(cx - w), int(cx + w)):
            put(sh, x, y0 + j - rows // 2, (26, 16, 24, 120))
    return over(sh, img, 0, 0)


# ======================= coins ===========================================================
def coin_sprites():
    out = {}
    for name, c in CO.COINS.items():
        R = c['R']
        frames = []
        for fi, ang in enumerate(c['angles']):
            a, nv, mid, pat, dep = load(name, fi)
            st = shade(nv, 'metal')
            # face vs milled edge from the known spin: the face normal is the coin axis
            t = math.radians(ang)
            axis = np.array([math.sin(t), 0, math.cos(t)])
            face = np.abs(nv @ axis) > 0.55
            hgt = pat
            off = np.where(face & (hgt < 0.4), -1, 0) + np.where(face & (hgt > 0.7), 1, 0)
            st = np.clip(st + off, 0, 6)
            key = 100 + st
            A, K, D = downsample(a, key, dep)
            img = colourise(A, K, lambda m, s, rp=R7[c['ramp']]: rp)
            img = clean_singles(img, A)
            col = OL['silver'] if c['ramp'] in ('nickel', 'alu') else OL['gold']
            frames.append(outline(img, col))
        out[name] = frames
    return out


# ======================= piggy ===========================================================
FLW = {'r': C('#9c2c3c'), 'R': C('#cf4a53'), 'c': C('#f7dc98'), 'g': C('#4a6a40'), 'G': C('#6e9258'), 'w': C('#fbefe6')}
INK = C('#2a1220')


def piggy_sprites():
    meta = json.load(open(os.path.join(WORK, 'piggy', 'anchors.json')))
    frames = []
    seq_coin = {2: (27, 2, 'face'), 3: (29, -1, 'edge')}
    for fi, an in enumerate(meta):
        a, nv, mid, pat, dep = load('piggy', fi)
        st = shade(nv, 'glaze')
        st = np.where((mid == 3) & (st < 6), np.clip(st - 1, 0, 5), st)  # inner ear a step deeper
        A, K, D = downsample(a, mid * 100 + st, dep)
        img = colourise(A, K, lambda m, s: R7['pink'])
        img = depth_lines(img, A, D, OL['pig'], 0.25)
        img = clean_singles(img, A)

        def P(k):
            x, y, v = an[k]
            return int(math.floor(x)), int(math.floor(y)), v
        s0, s1 = P('slot0'), P('slot1')
        line(img, s0[0], s0[1], s1[0], s1[1], INK)
        line(img, s0[0], s0[1] + 1, s1[0], s1[1] + 1, R7['pink'][5])
        for side in ('L', 'R'):
            x, y, v = P('eye' + side)
            if v:
                stamp(img, ['XX.', 'XXX', '.XX'] if side == 'L' else ['XX', 'XX'], {'X': INK}, x - 1, y - 1)
                put(img, x - 1, y - 2, INK); put(img, x, y - 2, INK)  # lid stroke
            x, y, v = P('blush' + side)
            if v:
                stamp(img, ['rR.', '.rR'], {'r': C('#c9505e'), 'R': C('#dc6f74')}, x - 1, y)
            x, y, v = P('nos' + side)
            if v:
                stamp(img, ['X', 'X'], {'X': C('#6a2438')}, x, y - 1)
        for k, rows in (('fl1', ['..R..', '.RcR.', 'RRcRr', '.rRr.', '.r.r.']), ('fl2', ['.R.', 'RcR', '.r.']), ('fl3', ['.R.', 'Rcr', '.r.'])):
            x, y, v = P(k)
            if v:
                stamp(img, rows, FLW, x - len(rows[0]) // 2, y - len(rows) // 2)
                if k == 'fl1':
                    stamp(img, ['G.', '.g'], FLW, x + 3, y + 2); stamp(img, ['.G', 'g.'], FLW, x - 4, y + 2)
        img = outline(img, OL['pig'])
        ys = np.nonzero(A.any(1))[0]
        img = hard_shadow(img, img.shape[1] / 2 - 1, 47, 15)
        if fi in seq_coin:
            cx, cy, kind = seq_coin[fi]
            rows = ['.ooo.', 'oYyyo', 'oyBbo', 'oBbbo', '.ooo.'] if kind == 'face' else ['oo', 'Yo', 'yo', 'bo', 'oo']
            stamp(img, rows, {'o': OL['gold'], 'Y': R7['gold'][6], 'y': R7['gold'][5], 'B': R7['gold'][4], 'b': R7['gold'][2]}, cx, max(0, cy))
        if fi in (1, 2, 3, 4):
            sd = 1 if fi % 2 else -1
            for x0, y0 in ((2, 20), (1, 24), (51, 20), (52, 24)):
                hline(img, x0, x0 + 2, y0 + (sd if x0 < 20 else -sd), OL['pig'])
        frames.append(img)
    return frames


# ======================= tin bank, purse, capsule =======================================
def tin_sprite():
    an = json.load(open(os.path.join(WORK, 'tin', 'anchors.json')))[0]
    a, nv, mid, pat, dep = load('tin', 0)
    st = np.where(mid == 1, shade(nv, 'metal'), shade(nv, 'glaze'))
    A, K, D = downsample(a, mid * 100 + st, dep)
    img = colourise(A, K, lambda m, s: R7['nickel'] if m == 1 else R7['label'])
    img = depth_lines(img, A, D, OL['tin'], 0.3)
    img = clean_singles(img, A)
    x, y, _ = an['label']; x, y = int(x), int(y)
    cr, ink = R7['cream'][5], C('#3a1a1c')
    for j in range(7):
        hline(img, x - 2 + (j in (0, 6)), x + 14 - (j in (0, 6)), y - 3 + j, cr)
    text3(img, 'SAVE', x - 1, y - 2, ink)
    hline(img, x - 1, x + 13, y + 3, R7['label'][3])
    s0, s1 = an['slot0'], an['slot1']
    line(img, int(s0[0]), int(s0[1]), int(s1[0]), int(s1[1]), C('#1d1820'))
    line(img, int(s0[0]), int(s0[1]) + 1, int(s1[0]), int(s1[1]) + 1, R7['nickel'][6])
    img = outline(img, OL['tin'])
    return [hard_shadow(img, img.shape[1] / 2 - 1, img.shape[0] - 2, 12)]


def purse_sprite():
    a, nv, mid, pat, dep = load('purse', 0)
    st = np.where(mid == 1, shade(nv, 'metal'), shade(nv, 'cloth'))
    sub = np.where((mid == 2) & (pat > 0.5), 1, 0)
    A, K, D = downsample(a, mid * 100 + sub * 10 + st, dep)
    img = colourise(A, K, lambda m, s: R7['gold'] if m == 1 else (R7['cream'] if s else R7['indigo']))
    img = depth_lines(img, A, D, OL['purse'], 0.3)
    img = clean_singles(img, A)
    img = outline(img, OL['purse'])
    return [hard_shadow(img, img.shape[1] / 2 - 1, img.shape[0] - 2, 14)]


CAP_R = {
    'glass': ramp('#3c4a5a', '#62788c', '#8ba3b6', '#b2c9d6', '#d2e4ec', '#eaf4f6', '#ffffff'),
    'base': ramp('#14284a', '#1c3d6c', '#255892', '#3075b4', '#4f95cc', '#7cb6de', '#b4d8ee'),
    'toy': ramp('#4a1e12', '#7a3418', '#a8521e', '#cf7426', '#e89a3c', '#f4c06a', '#fde3a4'),
    'insert': R7['cream'],
    'pulp': ramp('#4e3f2e', '#6e5a42', '#8e7656', '#ab936c', '#c4ad86', '#d8c6a2', '#e9dcbf'),
}


def capsule_sprites(job='capsule', n=6, paper=False):
    """The pixel capsule: a real gashapon capsule (docs/ref/capsule). The clear dome is composited from two renders:
    the full one and one without the dome, so the figure and the folded insert show through it a step paler, with
    the dome's own rim, glints and the empty top in a cool glass ramp. Coloured base, knurled twist band (flat-shaded
    ribs), hinge knuckle + thumb tab, an original moulded 'GG' maker mark. paper=True: the matte pulp eco capsule."""
    frames = []
    try:
        an = json.load(open(os.path.join(WORK, job, 'anchors.json')))
    except FileNotFoundError:
        an = [{}] * n
    ol = OL['cap']
    for fi in range(n):
        a, nv, mid, pat, dep = load(job, fi)
        rim = (mid == 1) & (np.abs(nv[..., 2]) < 0.42)
        kind = np.where(np.isin(mid, (4, 7)) | paper, 'cloth', 'glaze')
        st = np.where(kind == 'cloth', shade(nv, 'cloth'), shade(nv, 'glaze'))
        A, K, D = downsample(a, mid * 100 + rim * 10 + st, dep)
        b, nvb, midb, _, depb = load(job + '_in', fi)
        stb = np.where(np.isin(midb, (4, 7)) | paper, shade(nvb, 'cloth'), shade(nvb, 'glaze'))
        B, KB, DB = downsample(b, midb * 100 + stb, depb)

        def col(m, s):
            if paper and m in (1, 2, 3, 6, 7):
                rp = CAP_R['pulp']; s = s - 2 * (m == 3) - (m == 7)
            else:
                rp = {1: CAP_R['glass'], 2: CAP_R['base'], 3: CAP_R['base'], 4: CAP_R['insert'], 5: CAP_R['toy'], 6: CAP_R['base'],
                      7: CAP_R['base']}[m]
                s = s - (m == 3) - (m == 7) + (m == 6)
            return rp[int(np.clip(s, 0, len(rp) - 1))]
        H, Wd = A.shape
        img = blank(Wd, H)
        seen = np.zeros((H, Wd), int)  # the mid that shows (through the dome too), for the insert print
        haze = np.zeros((H, Wd), bool)
        for y, x in zip(*np.nonzero(A)):
            m, r, s_ = K[y, x] // 100, (K[y, x] // 10) % 10, K[y, x] % 10
            if m != 1 or paper:
                if m == 3:  # the twist band's ribs: alternate columns a step apart (paper: one dark pressed seam)
                    s_ = 0 if paper else s_ + (x % 2)
                img[y, x] = col(m, s_); seen[y, x] = m
                continue
            g = CAP_R['glass']
            if r:
                img[y, x] = g[2 if s_ < 3 else 3]
            elif s_ >= 6:
                img[y, x] = g[6]
            elif B[y, x] and KB[y, x] // 100 != 1:
                mb, sb = KB[y, x] // 100, KB[y, x] % 10
                img[y, x] = col(mb, sb + 1); seen[y, x] = mb; haze[y, x] = True
            else:  # clear glass with nothing behind it: see-through (the only part of the kit with partial alpha)
                c = g[int(np.clip(s_, 3, 5))].copy(); c[3] = 150 if s_ < 5 else 190
                img[y, x] = c
        # lines: the solid silhouette edges, and paler ones for what sits behind the glass
        img = depth_lines(img, A & ~(K // 100 == 1) & (img[..., 3] == 255), D, ol, 0.3)
        if not paper:
            m2 = np.zeros_like(A)
            for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
                nb = np.roll(np.roll(DB, dy, 0), dx, 1); na = np.roll(np.roll(B, dy, 0), dx, 1)
                m2 |= B & ~na | (B & na & (DB > nb + 0.3))
            img[haze & m2] = C('#5d6a86')
        img = clean_singles(img, A)
        # the insert's print (a little catalogue: lines of text), paler behind the glass
        ys, xs = np.nonzero(seen == 4)
        if len(xs) > 6:
            y0, x0 = ys.min() + 2, xs.min() + 1
            for y, x in zip(ys, xs):
                if (y - y0) % 2 == 0 and y >= y0 and x >= x0 and seen[y, x - 1] == 4 and seen[min(y + 1, H - 1), x] == 4 and (x * 3 + y) % 7:
                    img[y, x] = C('#8a8aa8') if haze[y, x] else C('#6a5a8c')
        # the figure's face: two ink eyes (paler through the dome)
        f = an[fi].get('face') if fi < len(an) else None
        if f and not paper:
            fx, fy = int(f[0]), int(f[1])
            for ex in (fx - 2, fx + 1):
                if 0 <= fy < H and 0 <= ex < Wd and seen[fy, ex] == 5:
                    img[fy, ex] = C('#6a4a52') if haze[fy, ex] else C('#2a1418')
        # the moulded maker mark on the base: a small embossed oval (light top-left, shadow bottom-right)
        mk = an[fi].get('mark') if fi < len(an) else None
        if mk and (n > 1 or paper):
            mx, my = int(mk[0]), int(mk[1])
            base = CAP_R['pulp'] if paper else CAP_R['base']
            hi, lo = base[5], base[1]
            for dx, dy, c in ((-1, -1, hi), (0, -1, hi), (1, -1, hi), (-2, 0, hi), (2, 0, lo), (-1, 1, lo), (0, 1, lo), (1, 1, lo)):
                if 0 <= my + dy < H and 0 <= mx + dx < Wd and K[my + dy, mx + dx] // 100 == 2:
                    img[my + dy, mx + dx] = c
        img = outline(img, ol)
        frames.append(hard_shadow(img, img.shape[1] / 2 - 2, img.shape[0] - 2, 13) if n > 1 or paper else img)
    return frames


# ======================= atlas ===========================================================
def pack(sprites, out_png, out_json):
    """sprites: name -> dict(frames=[arr], fps, loop). One strip per sprite, shelf-packed."""
    items = sorted(sprites.items(), key=lambda kv: -kv[1]['frames'][0].shape[0])
    W = 1024
    x = y = sh = 0
    place = {}
    for name, s in items:
        h, w = s['frames'][0].shape[:2]
        sw = w * len(s['frames'])
        if x + sw > W:
            x, y, sh = 0, y + sh + 1, 0
        place[name] = (x, y)
        x += sw + 1; sh = max(sh, h)
    H = y + sh
    sheet = blank(W, H)
    meta = {'image': 'kit.png', 'size': [W, H], 'sprites': {}}
    for name, s in sprites.items():
        x0, y0 = place[name]
        h, w = s['frames'][0].shape[:2]
        for i, f in enumerate(s['frames']):
            sheet[y0:y0 + h, x0 + i * w:x0 + (i + 1) * w] = f
        meta['sprites'][name] = {'x': x0, 'y': y0, 'w': w, 'h': h, 'n': len(s['frames']), 'fps': s.get('fps', 0), 'loop': s.get('loop', True)}
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    Image.fromarray(sheet, 'RGBA').save(out_png, optimize=True)
    json.dump(meta, open(out_json, 'w'), indent=1)
    return sheet, meta


def contact_sheet(sprites, out, K=3):
    bg = (35, 30, 37, 255)
    rows, line_ = [], []
    W = 2000
    x = 0
    for name, s in sprites.items():
        f0 = s['frames'][0]
        w = (f0.shape[1] * K + 6) * len(s['frames']) + 20
        if x + w > W and line_:
            rows.append(line_); line_ = []; x = 0
        line_.append(name); x += w
    rows.append(line_)
    hs = [max(sprites[n]['frames'][0].shape[0] for n in r) * K + 22 for r in rows]
    img = Image.new('RGBA', (W, sum(hs) + 20), bg)
    dr = ImageDraw.Draw(img)
    y = 10
    for r, h in zip(rows, hs):
        x = 14
        for n in r:
            s = sprites[n]
            dr.text((x, y), n, fill=(214, 196, 168, 255))
            for f in s['frames']:
                img.alpha_composite(up(f, K), (x, y + 14)); x += f.shape[1] * K + 6
            x += 20
        y += h
    os.makedirs(os.path.dirname(out), exist_ok=True)
    img.save(out)


def main():
    args = sys.argv[1:]
    os.makedirs(WORK, exist_ok=True)
    spec = {}
    for name, c in CO.COINS.items():
        f, b = CO.designs(name, c['R'])
        np.save(os.path.join(WORK, f'h_{name}_f.npy'), CO.heightmap(c['R'], f, c.get('hole', 0)))
        np.save(os.path.join(WORK, f'h_{name}_b.npy'), CO.heightmap(c['R'], b, c.get('hole', 0)))
        spec[name] = c
    json.dump(spec, open(os.path.join(WORK, 'coins.json'), 'w'))
    if '--render' in args:
        jobs = args[args.index('--render') + 1]
        jobs = ['coins', 'piggy', 'tin', 'purse', 'capsule'] if jobs == 'all' else jobs.split(',')
        subprocess.run([os.path.join(ROOT, 'tools/blender.sh'), os.path.join(os.path.dirname(__file__), 'render3d.py'), WORK, *jobs], check=True,
                       stdout=subprocess.DEVNULL)
    import flat
    S = {}
    for name, fr in coin_sprites().items():
        S[name] = dict(frames=fr, fps=12, loop=True)
    S['piggy'] = dict(frames=piggy_sprites(), fps=10, loop=False)
    S['tinbank'] = dict(frames=tin_sprite())
    S['purse'] = dict(frames=purse_sprite())
    S['capsule'] = dict(frames=capsule_sprites(), fps=8, loop=False)
    S['capsule_s'] = dict(frames=capsule_sprites('capsule_s', 1))
    S['capsule_paper'] = dict(frames=capsule_sprites('capsule_p', 1, paper=True))
    S.update(flat.all_flat())
    pack(S, os.path.join(OUT, 'kit.png'), os.path.join(OUT, 'kit.json'))
    if '--sheet' in args:
        contact_sheet(S, os.path.join(ROOT, 'shots/pixelkit/all.png'))
    print('pixelkit:', len(S), 'sprites')


if __name__ == '__main__':
    main()
