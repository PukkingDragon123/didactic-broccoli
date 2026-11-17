"""The game's animals: real CC BY models (Sketchfab), converted with lowpix (realistic transfer), then repainted as
detailed pixel-art coats (coat.py) and written as plain glTF for src/animals (rigged in the game, src/animals/fit.js).

    python3 art/lowpix/animals/make.py mikan [stray ...]      (from the repository root; LOWPIX = the lowpix checkout)

Sources and credits: SOURCES below (and CREDITS.md). Output: public/models/lowpix/animals/<id>.glb, a review render
art/lowpix/animals/out/<id>.png.
"""
import io, os, sys, subprocess
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbio import read_glb, write_glb
from coat import repaint, weld_normals, set_mid
from ortho import render
from face import carve_eye, carve_eye2, split_mouth, jaw_weights, mouth_bag
from eyes import eyeball, lid, closest_uv, paint_iris, frame_basis
from coat import hexes

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LOWPIX = os.environ.get('LOWPIX', '/home/user/pukkingdragon123/symmetrical-goggles')
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'lowpix-animals')
OUT_GLB = os.path.join(ROOT, 'public', 'models', 'lowpix', 'animals')
OUT_ART = os.path.join(HERE, 'out')

# the source models: sketchfab uid, lowpix convert options, the transform into the game's metres
SOURCES = {
    'calico': dict(uid='7325331900d8458b852f39f0dbcdbf18', title='Calico Cat', author='AaronRydning', yaw=180, tris=10000, height=30),
}


def convert(src):
    S = SOURCES[src]
    out = os.path.join(CACHE, src + '_r')
    glb = os.path.join(out, 'scene.glb')
    if not os.path.exists(glb):
        dl = os.path.join(CACHE, '_dl', src)
        if not os.path.exists(dl):
            sys.path.insert(0, LOWPIX)
            from lowpix.sketchfab import fetch
            fetch(S['uid'], dl)
        g = [os.path.join(dl, f) for f in os.listdir(dl) if f.endswith(('.gltf', '.glb'))][0]
        subprocess.run([sys.executable, '-m', 'lowpix', 'convert', g, '--style', 'realistic', '--height', str(S['height']),
                        '--tris', str(S['tris']), '--atlas', '2048', '--yaw', str(S['yaw']), '-o', out], check=True,
                       env=dict(os.environ, PYTHONPATH=LOWPIX), cwd=LOWPIX)
    return read_glb(glb)


def down2(img):
    a = img.astype(np.float32)
    return (a[0::2, 0::2] + a[1::2, 0::2] + a[0::2, 1::2] + a[1::2, 1::2]) / 4


# ------------------------------------------------------------------ Mikan: the calico
CALICO = {
    'white': ['#4e4b47', '#6c6862', '#8c867e', '#aaa398', '#c6beb2', '#dad3c7', '#e8e2d7', '#f2ede4', '#f9f6ef'],
    'orange': ['#2e170d', '#4a2414', '#6a341a', '#8a4521', '#a65728', '#bd6a31', '#d0803f', '#dc9653', '#e6ad70'],
    'black': ['#0c0a09', '#131010', '#1b1716', '#24201d', '#2f2a26', '#3b3531', '#4a433d', '#5b534b'],
    'pink': ['#4e2427', '#6e3639', '#8e4c4d', '#ac6461', '#c27c76', '#d4948a', '#e2ab9f'],
}
set_mid('white', 0.8); set_mid('orange', 0.6); set_mid('black', 0.45); set_mid('pink', 0.6)


def calico_classify(src, P, N):
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    lum = (r * 0.3 + g * 0.55 + b * 0.15) / 255
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    G = np.zeros(r.shape, np.int32)                                    # white
    G[(r - b > 60) & (g < r * 0.85)] = 1                              # orange (and its soft edges)
    G[lum < 0.32] = 2                                                  # black
    pinkish = (r > 150) & (r - g > 35) & (g > 70) & (b > 60) & (g < r * 0.85)
    skin = (y > 27.2) | (y < 0.9)                                     # inner ears, pads (the nose leather: face_details)
    G[pinkish & skin] = 3
    return G


# the joints of CatRig's skeleton fitted to the model (source units; parents in CatRig / src/world/catBody.js)
MIKAN_JOINTS = {
    'body': (0, 16.5, 1.0), 'chest': (0, 17.0, 11.0), 'head': (0, 22.6, 20.6), 'jaw': (0, 23.7, 23.9),
    'earL': (2.55, 27.6, 22.6), 'earR': (-2.55, 27.6, 22.6),
    'legFL': (3.0, 15.5, 17.0), 'armFL': (3.2, 10.5, 15.3), 'pawFL': (2.7, 2.8, 16.7),
    'legFR': (-3.0, 15.5, 17.0), 'armFR': (-3.2, 10.5, 15.3), 'pawFR': (-2.7, 2.8, 16.7),
    'legBL': (4.2, 14.5, -2.0), 'shinBL': (4.9, 9.8, 2.2), 'pawBL': (5.1, 5.4, -3.6),
    'legBR': (-4.2, 14.5, -2.0), 'shinBR': (-4.9, 9.8, 2.2), 'pawBR': (-5.1, 5.4, -3.6),
    'tail0': (0, 21.3, -8.5), 'tail1': (0, 21.3, -12.5), 'tail2': (0, 21.2, -16.5), 'tail3': (0, 21.2, -20.5), 'tail4': (0, 21.2, -24.5),
    # contact points (not bones): toe tips, the tail tip, the nose
    '_footFL': (2.85, 0, 19.3), '_footFR': (-2.85, 0, 19.3), '_footBL': (5.5, 0, 1.8), '_footBR': (-5.5, 0, 1.8),
    '_tailTip': (0, 21.2, -29), '_nose': (0, 24.8, 28.7), '_rump': (0, 19.5, -8.0),
}
MIKAN_IRIS = dict(ball='#1c140e', limbus='#2c3014', outer='#6e7a2c', mid='#97a23e', inner='#c2b049', fibre_d='#5c6624',
                  fibre_l='#b5b552', shadow='#4f5a22', pupil='#080706', glint='#f4f0e2', glint2='#a8a888')
OPEN_EYE = (0.62, -0.5)   # the lids' edges with the eye open (CatRig EYE_POSE.open)
MOUTH = {'rim': '#16100e', 'roof': '#7e3c40', 'dark': '#3a1517', 'tongue': '#c27578', 'tooth': '#ece6d6'}


# the face, painted over the coat in the model's units: nose leather, nostrils, philtrum, lips, whisker spots
FACE_MIKAN = dict(nose=(0.0, 24.2, 25.15, 0.62), lip_y=23.63, lip_x=1.9, muzzle=(2.3, 22.8, 24.3, 25.4),
                  white=CALICO['white'], pink=['#5a2a2d', '#7a3d40', '#9a5556', '#b46a68', '#c98480', '#d99c95'],
                  lip='#2a1d1b', dots='#9a8f84')


def face_details(tex, src, dbg, Fd):
    tri, bary, ok, Ps, Ns, group = dbg
    x, y, z = Ps[..., 0], Ps[..., 1], Ps[..., 2]
    ax = np.abs(x)
    H, W = tex.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    from coat import hash2
    cl = hash2(xx // 2, yy // 2, 11)
    white = hexes(Fd['white']); pink = hexes(Fd['pink'])
    # the muzzle: the source's painted smile and the over-wide pink go; white fur with fine clusters
    mx, my0, my1, mz = Fd['muzzle']
    mu = ok & (ax < mx) & (y > my0) & (y < my1) & (z > mz)
    lum = src.mean(-1) / 255
    clean = mu & ((lum < 0.85) | (group == 3))
    tex[clean] = white[np.where(cl[clean] < 0.2, 6, np.where(cl[clean] > 0.85, 8, 7))]
    # nose leather: a rounded triangle, wide at the top, pointing down to the philtrum; darker rim, lit top, nostrils
    n0, y0, y1, w0 = Fd['nose']
    t = (y - y0) / (y1 - y0)
    half = w0 * (0.18 + 0.82 * np.clip(t, 0, 1) ** 0.7)
    nose = ok & (z > 26.5) & (t > 0) & (t < 1) & (ax < half)
    edge = nose & ((ax > half - 0.09) | (t < 0.08) | (t > 0.93))
    tex[nose] = pink[3]
    tex[nose & (t > 0.7) & (ax < half * 0.6)] = pink[4]
    tex[nose & (t > 0.82) & (ax < half * 0.35)] = pink[5]
    tex[edge] = pink[1]
    nos = nose & (t > 0.08) & (t < 0.32) & (ax > 0.14) & (ax < 0.36) & (np.abs((ax - 0.25) / 0.11) ** 2 + ((t - 0.2) / 0.12) ** 2 < 1)
    tex[nos] = pink[0]
    # philtrum: a fine dark groove from the nose down to the lip
    ph = ok & (ax < 0.07) & (y < y0 + 0.02) & (y > Fd['lip_y']) & (z > 27.5)
    tex[ph] = hexes([Fd['lip']])[0] * 0.6 + white[4] * 0.4
    # lips: the dark lip line along the cut, either side
    ly = Fd['lip_y'] - 0.1 * (ax / 1.2) ** 2
    lip = ok & (np.abs(y - ly) < 0.06 + 0.03 * (ax < 0.5)) & (ax < 1.25) & (z > 26.2)
    tex[lip] = hexes([Fd['lip']])[0] * (1 - 0.5 * np.clip((ax[lip] - 0.8) / 0.45, 0, 1))[:, None] + white[3] * (0.5 * np.clip((ax[lip] - 0.8) / 0.45, 0, 1))[:, None]
    # whisker spots: three staggered rows on each pad
    for row, (yy0, n, x0) in enumerate([(24.2, 3, 0.62), (24.02, 4, 0.58), (23.86, 3, 0.7)]):
        for k in range(n):
            cx = x0 + k * 0.22
            sp = ok & (z > 26.3) & (((ax - cx) / 0.045) ** 2 + ((y - yy0 + k * 0.03) / 0.04) ** 2 < 1)
            tex[sp] = white[3]


def make_mikan():
    g = convert('calico')
    P, F, UV = g['pos'], g['idx'], g['uv']
    N = weld_normals(P, F)
    src = down2(np.asarray(Image.open(io.BytesIO(g['png'])).convert('RGB')))
    nose = np.array([0, 24.8, 28.6])

    def flow(Ps, Ns):
        x, y, z = Ps[..., 0], Ps[..., 1], Ps[..., 2]
        f = np.zeros(Ps.shape, np.float32)
        f[..., 1] = -0.35 - 0.6 * np.abs(Ns[..., 0]); f[..., 2] = -1.0     # body: back toward the tail, down the flanks
        head = (z > 19.5) & (y > 19)
        d = Ps - nose
        f[head] = d[head]                                                  # face: out from the nose
        legs = y < 11.5
        f[legs] = [0, -1, 0.15]
        tail = z < -8.5
        f[tail] = [0, 0, -1]
        f -= Ns * (f * Ns).sum(-1, keepdims=True)
        return f / (np.linalg.norm(f, axis=-1, keepdims=True) + 1e-9)

    def occl(Ps, Ns):
        o = np.clip(-Ns[..., 1] - 0.15, 0, 1) * 0.45
        o += ((Ps[..., 1] < 12) & (np.abs(Ps[..., 0]) < 3.2)) * 0.2       # the inner sides of the legs
        return o

    body, dbg = repaint(src, P, N, F, UV, CALICO, calico_classify, flow, seed=7, occl=occl)
    face_details(body, src, dbg, FACE_MIKAN)
    return rig_cat('mikan', P, F, UV, N, body, MIKAN_JOINTS, MIKAN_IRIS, eye_y=26.05, eye_x=1.65, eye_r=1.1)


def rig_cat(gid, P, F, UV, N, body, J, iris, eye_y, eye_x, eye_r):
    W, H0, H = body.shape[1], body.shape[0], body.shape[0] + 128
    tex = np.zeros((H, W, 3), np.uint8); tex[:H0] = body
    tex[H0:] = hexes([iris['ball']])[0]
    vs = H0 / H
    UVs = UV * [1, vs]
    # --- the strip below the coat: iris frames (64 px), mouth and lid-rim patches
    frames = {'round': (0.36, 0.42), 'normal': (0.12, 0.8), 'narrow': (0.07, 0.85), 'slit': (0.03, 0.85)}
    fuv = {}
    for k, (name, pup) in enumerate(frames.items()):
        tex[H0 + 32:H0 + 96, k * 64:(k + 1) * 64] = paint_iris(64, iris, pup, seed=3)
        fuv[name] = (k * 64 / W, (H0 + 32) / H, 64 / W, 64 / H)
    patch = {}
    for k, (name, col) in enumerate(MOUTH.items()):
        x0 = 300 + k * 24
        tex[H0 + 8:H0 + 24, x0:x0 + 16] = hexes([col])[0]
        if name == 'roof':
            tex[H0 + 8:H0 + 24:4, x0:x0 + 16] = hexes(['#5e2a2e'])[0]          # the ridges of the palate
        if name == 'tongue':
            tex[H0 + 8:H0 + 24, x0 + 7:x0 + 9] = hexes(['#a85e62'])[0]          # the groove down its middle
        patch[name] = ((x0 + 8) / W, (H0 + 16) / H)
    # --- eyes: sockets carved, eyeballs, lids
    def ray_z(x, y):
        A, B, C = P[F[:, 0]], P[F[:, 1]], P[F[:, 2]]
        o, d = np.array([x, y, 60.0]), np.array([0, 0, -1.0])
        e1, e2 = B - A, C - A
        h = np.cross(d, e2); a = (e1 * h).sum(1); ok = np.abs(a) > 1e-9
        f = np.where(ok, 1 / np.where(ok, a, 1), 0); s = o - A
        u = f * (s * h).sum(1); q = np.cross(s, e1); v = f * (q @ d); t = f * (e2 * q).sum(1)
        hit = ok & (u >= 0) & (v >= 0) & (u + v <= 1) & (t > 0)
        return 60 - t[hit].min()
    eye_region = (P[F].mean(1)[:, 2] > J['head'][2] + 2) & (P[F].mean(1)[:, 1] > eye_y - 2.2) & (P[F].mean(1)[:, 1] < eye_y + 2.2)
    surf_uv = closest_uv(P, F, UVs, eye_region)
    eyes, parts = {}, []
    Pc = P.copy()
    for sx, side in ((1, 'L'), (-1, 'R')):
        S = np.array([sx * eye_x, eye_y, ray_z(sx * eye_x, eye_y)])
        ax = np.array([0.27 * sx, 0.06, 1.0]); ax /= np.linalg.norm(ax)
        c = S - ax * (eye_r * 0.74)                                # the cornea proud of the socket, as a cat's is
        tilt = 0.16 * sx                                           # outer corner up
        fb = frame_basis(ax, tilt)
        Pc = carve_eye2(Pc, c, fb[0], fb[1], fb[2], eye_r, OPEN_EYE[0], OPEN_EYE[1])
        eyes[side] = dict(c=c, ax=ax, tilt=tilt, s=fb[2])
        bp, bn, buv, bt = eyeball(c, ax, eye_r, fuv['normal'])
        parts.append(('eye' + side, bp, bn, buv, bt))
        for up in (True, False):
            lp, ln, luv, lt = lid(c, ax, eye_r * 1.02, up, tilt, surf_uv, patch['rim'], az=1.5, rim=0.1)
            parts.append(('lid' + ('U' if up else 'D') + side, lp, ln, luv, lt))
    # --- the mouth: lips cut apart, the jaw weights, the inside of the mouth
    # the sculpt has a lip crease at y 23.63 (source units) from the nose to the corners (z 26): cut along it
    def zone(C): return (np.abs(C[:, 0]) < 1.55) & (C[:, 2] > 26.2) & (C[:, 1] > 22.6) & (C[:, 1] < 24.6)
    def lower(C): return (C[:, 1] < 23.63) & (C[:, 2] > 23.0) & (np.abs(C[:, 0]) < 2.9) & (C[:, 1] > 21.6)
    P2, F2, UV2, low, pairs, ends = split_mouth(Pc, F, UVs, zone, lower)
    def fall(Q):
        z, y, x = Q[:, 2], Q[:, 1], Q[:, 0]
        return np.clip((z - 23.3) / 2.2, 0, 1) * np.clip((y - 21.4) / 1.0, 0, 1) * np.clip((3.0 - np.abs(x)) / 0.8, 0, 1)
    jaw = jaw_weights(P2, F2, low, fall)
    print('mouth: cut vertices', len(pairs), 'ends', len(ends), 'lower tris', int(low.sum()))
    N2 = np.concatenate([N, N[list(dict.fromkeys(i for i, _ in pairs))]]) if False else None
    # normals for the duplicated vertices: copy the originals'
    Nfull = np.zeros((len(P2), 3)); Nfull[:len(N)] = N
    for u, l in pairs: Nfull[l] = N[u]
    inward = np.array(J['jaw']) + np.array([0, -0.1, 0.7])
    bp, buv, bt, bj, tmask, tbase, tdir = mouth_bag(P2, pairs, ends, inward, 1.7, 1.9, patch['dark'], patch['roof'], patch['tongue'])
    # --- assemble: coat (+ mouth) first, then the lids (coat material), the eyeballs last (eye material)
    pos, nrm, uv, tri, part, jw = [P2], [Nfull], [UV2], [F2], [np.zeros(len(P2))], [jaw]
    n = len(P2)
    def add(p, nn, t, tr, pid, j):
        nonlocal n
        pos.append(p); nrm.append(nn); uv.append(t); tri.append(tr + n); part.append(np.full(len(p), pid)); jw.append(j); n += len(p)
    bn = np.tile([0, 1.0, 0], (len(bp), 1))
    add(bp, bn, buv, bt, 1, bj)
    part[-1][tmask] = 8
    PART = {'eyeL': 2, 'eyeR': 3, 'lidUL': 4, 'lidDL': 5, 'lidUR': 6, 'lidDR': 7, 'tongue': 8}
    lids = [q for q in parts if q[0].startswith('lid')]; balls = [q for q in parts if q[0].startswith('eye')]
    for name, p, nn, t, tr in lids: add(p, nn, t, tr, PART[name], np.zeros(len(p)))
    eye_start = sum(len(t) for t in tri)
    for name, p, nn, t, tr in balls: add(p, nn, t, tr, PART[name], np.zeros(len(p)))
    pos, nrm, uv, tri = np.concatenate(pos), np.concatenate(nrm), np.concatenate(uv), np.concatenate([np.asarray(t, np.int64).reshape(-1, 3) for t in tri])
    part, jw = np.concatenate(part), np.concatenate(jw)
    scale, shift = 0.0108, np.array([0, 0, -10.0])
    M = lambda q: ((np.array(q, float) + shift) * scale).round(5).tolist()
    extras = {
        'joints': {k: M(v) for k, v in J.items()},
        'eyes': {s: dict(c=M(e['c']), ax=e['ax'].round(4).tolist(), s=e['s'].round(4).tolist(), r=round(eye_r * scale, 5), tilt=e['tilt']) for s, e in eyes.items()},
        'tongue': dict(base=M(tbase), dir=tdir.round(4).tolist()),
        'frames': {k: [round(x, 6) for x in v] for k, v in fuv.items()},
        'eyeTris': [int(eye_start), int(len(tri))],
        'parts': PART, 'source': SOURCES['calico'],
    }
    finish(gid, pos, nrm, tri, uv, tex, scale, tuple(shift), extra={'_PART': (part[:, None], 'SCALAR'), '_JAW': (jw[:, None], 'SCALAR')}, extras=extras)


def finish(gid, P, N, F, UV, tex, scale, shift, extra=None, extras=None):
    Pm = (P + np.array(shift)) * scale
    png = io.BytesIO(); Image.fromarray(tex).save(png, 'PNG', optimize=True)
    os.makedirs(OUT_GLB, exist_ok=True); os.makedirs(OUT_ART, exist_ok=True)
    write_glb(os.path.join(OUT_GLB, gid + '.glb'), Pm, N, UV, F, png.getvalue(), name=gid, rough=0.9, extra=extra, extras=extras)
    # review: front, side and a face close-up with the new coat
    t = tex.astype(np.float32)
    a = render(Pm, F, 'side', None, px=1600, grid=0.05, tex=t, UV=UV)
    hb = (Pm[:, 2].max() - 0.12, Pm[:, 2].max() + 0.01)
    b = render(Pm, F, 'front', (-0.06, 0.06, Pm[:, 1].max() - 0.12, Pm[:, 1].max() + 0.005), px=3200, grid=0.01, tex=t, UV=UV)
    o = Image.new('RGB', (a.width + b.width, max(a.height, b.height)), (40, 40, 40))
    o.paste(a, (0, 0)); o.paste(b, (a.width, 0))
    o.save(os.path.join(OUT_ART, gid + '.png'))
    Image.fromarray(tex).save(os.path.join(CACHE, gid + '_atlas.png'))
    print(gid, 'verts', len(Pm), 'tris', len(F), 'atlas', tex.shape, 'size', (Pm.max(0) - Pm.min(0)).round(3), 'png', png.tell())


if __name__ == '__main__':
    for a in sys.argv[1:] or ['mikan']:
        globals()['make_' + a]()
