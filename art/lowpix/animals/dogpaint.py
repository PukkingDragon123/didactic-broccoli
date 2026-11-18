"""The Shiba sculpt (shiba.py, built by lowpix) repainted per coat: the urajiro (the cream underside, cheeks, chest,
inner legs and tail underside of the Japanese breeds), the eyes, eyebrow dots, lips, whisker spots, inner ears, pads,
and each coat's colours (red, black and tan, white, sesame, a brown mutt, the ghost dog's white with grey ears and
socks). Fur strands and clumps stay from lowpix's brush (the tone inside each colour). Writes
public/models/lowpix/animals/dog_<coat>.glb (one mesh, smooth-welded normals, joint table in the node extras)."""
import os, io, json, subprocess, sys
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbio import write_glb
from coat import raster, surface, hexes, hash2, weld_normals

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LOWPIX = os.environ.get('LOWPIX', '/home/user/pukkingdragon123/symmetrical-goggles')
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'lowpix-animals', 'shiba')
OUT = os.path.join(ROOT, 'public', 'models', 'lowpix', 'animals')

def ramp(base, n=9, dark=0.28, light=1.32, cool=(0.9, 0.95, 1.08), warm=(1.06, 1.0, 0.9)):
    b = np.array([int(base[i:i + 2], 16) for i in (1, 3, 5)], float)
    out = []
    for k in range(n):
        t = k / (n - 1); f = dark + (light - dark) * t
        tint = np.array(cool) * (1 - t) + np.array(warm) * t
        out.append(np.clip(b * f * tint, 0, 255))
    return np.array(out, np.float32)

COATS = {
    'pochi': dict(fur='#b46a38', cream='#e6d8c0', back='#9c5a2e'),
    'kuro': dict(fur='#2c2624', cream='#e0d2ba', back='#1e1a19', tan='#aa7444'),
    'shiro': dict(fur='#ddd4c4', cream='#ebe4d6', back='#d2c8b6'),
    'goma': dict(fur='#a8703f', cream='#e2d2b6', back='#3e2c22', sesame=True),
    'chibi': dict(fur='#946238', cream='#ddc9ac', back='#7c5030'),
    'ghost': dict(fur='#e8e2d8', cream='#f0ebe2', back='#e0d8cc', ear='#8e8a84', sock='#b4b0a8'),
}

def load_obj(path):
    V, T, parts, F, FT, FP = [], [], [], [], [], []
    cur = 0
    for l in open(path):
        if l.startswith('o '): parts.append(l.split()[1]); cur = len(parts) - 1
        elif l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): T.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('f '):
            ids = [p.split('/') for p in l.split()[1:4]]
            F.append([int(a[0]) - 1 for a in ids]); FT.append([int(a[1]) - 1 for a in ids]); FP.append(cur)
    V, T, F, FT, FP = np.array(V), np.array(T), np.array(F), np.array(FT), np.array(FP)
    # one vertex per (position, uv) pair
    key = {}
    P, UV, idx, part = [], [], np.zeros_like(F), []
    for t in range(len(F)):
        for k in range(3):
            kk = (F[t, k], FT[t, k])
            if kk not in key:
                key[kk] = len(P); P.append(V[F[t, k]]); UV.append([T[FT[t, k], 0], 1 - T[FT[t, k], 1]]); part.append(FP[t])
            idx[t, k] = key[kk]
    return np.array(P), np.array(UV), idx, np.array(part), parts

def paint(coat):
    C = COATS[coat]
    P, UV, F, part, names = load_obj(os.path.join(CACHE, 'shiba_inu.obj'))
    N = weld_normals(P, F)
    src = np.asarray(Image.open(os.path.join(CACHE, 'shiba_inu_texture.png')).convert('RGB')).astype(np.float32)
    H, W = src.shape[:2]
    tri, bary = raster(P, F, UV, W, H)
    ok, Ps, Ns = surface(P, N, F, tri, bary)
    pid = np.where(tri >= 0, part[F[np.maximum(tri, 0), 0]], -1)
    name = np.array(names)[np.maximum(pid, 0)]
    x, y, z = Ps[..., 0], Ps[..., 1], Ps[..., 2]; ax = np.abs(x)
    lum = src.mean(-1) / 255
    is_ = lambda *k: np.isin(name, k) & ok
    yy, xx = np.mgrid[0:H, 0:W]
    edge = (hash2(xx // 2, yy // 2, 4) - 0.5) * 1.2          # a furry edge on every marking
    cream = np.zeros(lum.shape, bool)
    b = is_('body')
    cream |= b & (y < 29 - np.maximum(0, z - 4) * 0.25 + edge)
    cream |= b & (z > 13) & (y < 39.5 + edge) & (ax < 5.2 - (39.5 - y) * 0.05)
    cream |= b & (z > 18) & (y < 43 + edge) & (Ns[..., 1] < 0.2)
    h = is_('head', 'jaw')
    cream |= h & (((y < 45.5 + edge * 0.6 - np.maximum(0, 27 - z) * 0.6) & ((ax > 1.2) | (y < 43)) & (z > 23.5)) | (y < 43))
    cream |= is_('jaw')
    legs = is_('fore_l', 'fore_r', 'hind_l', 'hind_r')
    cx = np.where(name == 'fore_l', 4.9, np.where(name == 'fore_r', -4.9, np.where(name == 'hind_l', 5.6, -5.6)))
    inner = (x - cx) * np.sign(cx) < -0.5 + edge * 0.6
    hind = is_('hind_l', 'hind_r')
    cream |= legs & ((inner & ~(hind & (y > 23))) | (y < 8 + edge * 1.5))
    t = is_('tail')
    toC = (0 - x) * Ns[..., 0] + (43.5 - y) * Ns[..., 1] + (-19 - z) * Ns[..., 2]
    cream |= t & (toC > 0.4)
    ear = is_('ear_l', 'ear_r')
    ein = ear & (Ns[..., 2] > 0.3) & (y < 52.5) & (np.abs(ax - 3.5) < 1.4 - (y - 47.4) * 0.2)
    cream |= ein
    nose = is_('nose')
    out = src.copy()
    def put(m, rp, mid=0.62, k=6):
        if not m.any(): return
        L = lum[m]; med = np.median(L)
        i = np.clip(np.round(mid * (len(rp) - 1) + (L / max(med, 1e-3) - 1) * k), 0, len(rp) - 1).astype(int)
        out[m] = rp[i]
    furR, creamR, backR = ramp(C['fur']), ramp(C['cream'], dark=0.55, light=1.12), ramp(C['back'])
    fur = ok & ~cream & ~nose
    back = fur & ((is_('body') & (y > 37) & (ax < 5 + edge)) | (is_('tail') & (toC <= 0.4)) | (is_('head') & (y > 47) & (z < 25)))
    if C.get('sesame'):
        n = hash2((x * 4).astype(int) & 0xffff, (z * 1.2).astype(int) * 131 + (y * 4).astype(int) & 0xffff, 8)
        back = back | (fur & is_("body", "tail") & (y > 33) & (n < 0.28))   # black-tipped hairs along the back
    put(fur & ~back, furR)
    put(back, backR, 0.5)
    put(ok & cream & ~nose, creamR, 0.66, 4)
    if 'tan' in C:   # black and tan: tan cheeks over the cream, tan on the legs and the eyebrows
        tanR = ramp(C['tan'])
        put((h & ~cream & (y < 46.2) & (z > 24)) | (legs & ~cream & (y < 20)), tanR)
    if 'ear' in C: put(ear, ramp(C['ear']))
    if 'sock' in C: put(legs & (y < 6), ramp(C['sock']))
    # pads, nose leather
    out[legs & (y < 1.0) & (Ns[..., 1] < -0.5)] = hexes(['#2e2624'])[0]
    nz = hexes(['#0e0b0b', '#1a1515', '#2a2222', '#3c3232'])
    out[nose] = nz[np.clip((lum[nose] / max(np.median(lum[nose]), 1e-3) * 1.5).astype(int), 0, 3)]
    # eyes: almond, dark brown iris, black rim, a catchlight; eyebrow dots; the lip line; whisker spots
    hf = is_('head') & (z > 26.5) & (Ns[..., 2] > 0.15)
    ex = ax - 2.65; ey = y - (46.9 + ex * 0.15)
    q = (ex / 1.02) ** 2 + (ey / 0.74) ** 2
    out[hf & (q < 1.45)] = hexes(['#1a1210'])[0]
    out[hf & (q < 1.0)] = hexes(['#3a2416'])[0]
    out[hf & (q < 0.42)] = hexes(['#0e0a08'])[0]
    out[hf & (np.hypot(ex + 0.25, ey - 0.25) < 0.2)] = hexes(['#f2ece2'])[0]
    dots = hf & (((ax - 2.2) / 0.65) ** 2 + ((y - 48.35) / 0.4) ** 2 < 1)
    if coat in ('pochi', 'goma', 'shiro', 'chibi'): out[dots] = creamR[6]
    if 'tan' in C: out[dots] = ramp(C['tan'])[5]
    lipY = 41.65 + np.maximum(0, 31 - z) * 0.35
    out[is_('head') & (z > 29.2) & (ax > 0.6) & (np.abs(y - lipY) < 0.16) & (Ns[..., 1] < 0.2)] = hexes(['#241818'])[0]
    for r in range(2):
        for k in range(3):
            out[is_('head') & (ax > 1.1) & (np.hypot(z - (30.8 + k * 0.9), y - (42.4 + r * 0.4)) < 0.12)] = creamR[2]
    tex = np.clip(out, 0, 255).astype(np.uint8)
    S = 0.01
    J = {'body': [0, .33, -.08], 'chest': [0, .335, .07], 'neck': [0, .37, .165], 'head': [0, .445, .235], 'jaw': [0, .425, .272]}
    png = io.BytesIO(); Image.fromarray(tex).save(png, 'PNG', optimize=True)
    jaw = (is_('jaw'))
    # per-vertex part id (for the rig: jaw, ears, tail, legs are skinned by part)
    os.makedirs(OUT, exist_ok=True)
    write_glb(os.path.join(OUT, f'dog_{coat}.glb'), P * S, N, UV, F, png.getvalue(), name='dog_' + coat, rough=0.9,
              extra={'_PART': (part[:, None].astype(np.float32), 'SCALAR')}, extras={'parts': names, 'source': 'lowpix sculpt (art/lowpix/animals/shiba.py)'})
    print(coat, 'verts', len(P), 'tris', len(F), 'png', png.tell())
    return tex

if __name__ == '__main__':
    for c in sys.argv[1:] or list(COATS):
        t = paint(c)
        if c == 'pochi': Image.fromarray(t).save(os.path.join(CACHE, 'pochi_atlas.png'))
