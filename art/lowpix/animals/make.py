"""The game's animals: real CC BY models (Sketchfab), converted with lowpix (realistic transfer), then repainted as
detailed pixel-art coats (coat.py) and written as plain glTF for src/animals (rigged in the game, src/animals/fit.js).

    python3 art/lowpix/animals/make.py mikan [stray ...]      (from the repository root; LOWPIX = the lowpix checkout)

Sources and credits: SOURCES below (and CREDITS.md). Output: public/models/lowpix/animals/<id>.glb, a review render
art/lowpix/animals/out/<id>.png.
"""
import io, os, sys, subprocess, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from glbio import read_glb, write_glb
from coat import repaint, weld_normals, set_mid
from ortho import render
from face import carve_eye, carve_eye2, split_mouth, jaw_weights, mouth_bag, mouth_bowl, mouth_lens, paint_open_mouth
from eyes import eyeball, lid, lid_texels, closest_uv, paint_iris, frame_basis
from coat import hexes

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
LOWPIX = os.environ.get('LOWPIX', '/home/user/pukkingdragon123/symmetrical-goggles')
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'lowpix-animals')
OUT_GLB = os.path.join(ROOT, 'public', 'models', 'lowpix', 'animals')
OUT_ART = os.path.join(HERE, 'out')

# the source models: sketchfab uid, lowpix convert options, the transform into the game's metres
SOURCES = {
    'calico': dict(uid='7325331900d8458b852f39f0dbcdbf18', title='Calico Cat', author='AaronRydning', yaw=180, tris=10000, height=30),
    'fri': dict(uid='0ab14bf98e754f8d90fe1bf1c84ca66c', title='3d modelling my cat: Fripouille', author='guillaume bolis', licence='CC BY 4.0'),
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
MIKAN_IRIS = dict(ball='#1c140e', limbus='#2a2c16', outer='#66703a', mid='#8b9046', inner='#b6a252', fibre_d='#545c2c',
                  fibre_l='#a9a45a', shadow='#4f5a22', pupil='#080706', glint='#f4f0e2', glint2='#a8a888')
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


def make_mikan_sculpt():
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

    head_soft = lambda Ps: np.where((Ps[..., 2] > 20.5) & (Ps[..., 1] > 20), 0.55, 1.0)     # short face fur
    body, dbg = repaint(src, P, N, F, UV, CALICO, calico_classify, flow, seed=7, occl=occl, strength=head_soft)
    face_details(body, src, dbg, FACE_MIKAN)
    return rig_cat('mikan', P, F, UV, N, body, MIKAN_JOINTS, MIKAN_IRIS, eye_y=26.05, eye_x=1.65, eye_r=1.1)


def rig_cat(gid, P, F, UV, N, body, J, iris, eye_y, eye_x, eye_r, eye_in=0.74, cut=None, scale=0.0108, shift=(0, 0, -10.0), source='calico', head_z=None):
    W, H0, H = body.shape[1], body.shape[0], body.shape[0] + 128
    tex = np.zeros((H, W, 3), np.uint8); tex[:H0] = body
    tex[H0:] = hexes([iris['ball']])[0]
    vs = H0 / H
    UVs = UV * [1, vs]
    # --- the strip below the coat: iris frames (64 px), mouth and lid-rim patches
    frames = {'round': (0.34, 0.4), 'normal': (0.26, 0.66), 'narrow': (0.13, 0.76), 'slit': (0.05, 0.8)}
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
    eye_region = (P[F].mean(1)[:, 2] > (head_z if head_z is not None else J['head'][2] + 2)) & (P[F].mean(1)[:, 1] > eye_y - 2.2) & (P[F].mean(1)[:, 1] < eye_y + 2.2)
    surf_uv = closest_uv(P, F, UVs, eye_region)
    def colour_at(p):
        u, v = surf_uv(p)
        return tex[min(H - 1, int(v * H)), min(W - 1, int(u * W))]
    eyes, parts = {}, []
    Pc = P.copy()
    for sx, side in ((1, 'L'), (-1, 'R')):
        S = np.array([sx * eye_x, eye_y, ray_z(sx * eye_x, eye_y)])
        ax = np.array([0.27 * sx, 0.06, 1.0]); ax /= np.linalg.norm(ax)
        c = S - ax * (eye_r * eye_in)                              # the cornea proud of the socket, as a cat's is
        tilt = 0.16 * sx                                           # outer corner up
        fb = frame_basis(ax, tilt)
        Pc = carve_eye2(Pc, c, fb[0], fb[1], fb[2], eye_r, OPEN_EYE[0], OPEN_EYE[1])
        eyes[side] = dict(c=c, ax=ax, tilt=tilt, s=fb[2])
        bp, bn, buv, bt = eyeball(c, ax, eye_r, fuv['normal'])
        parts.append(('eye' + side, bp, bn, buv, bt))
        for k, up in enumerate((True, False)):
            # each lid its own patch in the strip (64 x 24 px): rim, then the fur round the eye
            rx = 420 + (0 if sx > 0 else 140) + k * 70
            rect = (rx, H0 + 40, 64, 24)
            lid_texels(tex, rect, c, ax, eye_r * 1.02, up, tilt, colour_at, hexes([MOUTH['rim'], '#3a2c26']), seed=k + 3 * (sx > 0))
            lp, ln, luv, lt = lid(c, ax, eye_r * 1.02, up, tilt, (rx / W, (H0 + 40) / H, 64 / W, 24 / H), az=1.5, rim=0.1)
            parts.append(('lid' + ('U' if up else 'D') + side, lp, ln, luv, lt))
    # --- the mouth: lips cut apart, the jaw weights, the inside of the mouth
    # the sculpt has a lip crease at y 23.63 (source units) from the nose to the corners (z 26): cut along it
    def zone(C): return (np.abs(C[:, 0]) < 1.55) & (C[:, 2] > 26.2) & (C[:, 1] > 22.6) & (C[:, 1] < 24.6)
    def lower(C): return (C[:, 1] < 23.63) & (C[:, 2] > 23.0) & (np.abs(C[:, 0]) < 2.9) & (C[:, 1] > 21.6)
    if cut: zone, lower = cut['zone'], cut['lower']
    if cut and 'lens' in cut:
        P2, F2, UV2, pairs, ends = Pc, F, UVs, [], []
        low = lower(P2[F2].mean(1))
    else:
        P2, F2, UV2, low, pairs, ends = split_mouth(Pc, F, UVs, zone, lower, zc=cut.get('zc') if cut else None)
    def fall(Q):
        z, y, x = Q[:, 2], Q[:, 1], Q[:, 0]
        return np.clip((z - 23.3) / 2.2, 0, 1) * np.clip((y - 21.4) / 1.0, 0, 1) * np.clip((3.0 - np.abs(x)) / 0.8, 0, 1)
    if cut: fall = cut['fall']
    jaw = jaw_weights(P2, F2, low, fall, below=cut.get('below') if cut else None, upper_ids=[u for u, _ in pairs] + list(ends))
    print('mouth: cut vertices', len(pairs), 'ends', len(ends), 'lower tris', int(low.sum()))
    N2 = np.concatenate([N, N[list(dict.fromkeys(i for i, _ in pairs))]]) if False else None
    # normals for the duplicated vertices: copy the originals'
    Nfull = np.zeros((len(P2), 3)); Nfull[:len(N)] = N
    for u, l in pairs: Nfull[l] = N[u]
    inward = np.array(cut['inward']) if cut else np.array(J['jaw']) + np.array([0, -0.1, 0.7])
    mouth_parts = None
    if cut and 'lens' in cut:
        L = cut['lens']
        mrect = (700, H0 + 40, 48, 24)
        paint_open_mouth(tex, mrect, L['cols'])
        Pz = P2.copy()
        def surf_z(x, y):
            return ray_z(x, y) if True else 0
        xs = np.linspace(-L['w'], L['w'], 9)
        lp, luv, lt, lj = mouth_lens(xs, L['lip_y'], surf_z, (mrect[0] / W, mrect[1] / H, mrect[2] / W, mrect[3] / H))
        mouth_parts = (lp, luv, lt, lj)
        B = cut['bowl']
        bp, buv, bt, bj, tmask, tbase, tdir = mouth_bowl(B['c'], B['rx'], B['ry'], B['depth'], patch['roof'], patch['dark'], patch['tongue'], B['tongue'], B['tdir'], B['tlen'])
        keep = tmask.copy()                                        # only the tongue of the bowl: the lens is the mouth
        idx = np.where(keep)[0]; remapi = -np.ones(len(bp), int); remapi[idx] = np.arange(len(idx))
        bt = remapi[bt[np.all(keep[bt], axis=1)]]
        bp, buv, bj, tmask = bp[idx], buv[idx], bj[idx], tmask[idx]
    elif cut and 'bowl' in cut:
        B = cut['bowl']
        bp, buv, bt, bj, tmask, tbase, tdir = mouth_bowl(B['c'], B['rx'], B['ry'], B['depth'], patch['roof'], patch['dark'], patch['tongue'], B['tongue'], B['tdir'], B['tlen'])
    else:
        bp, buv, bt, bj, tmask, tbase, tdir = mouth_bag(P2, pairs, ends, inward, cut['depth'] if cut else 1.7, cut['tongue'] if cut else 1.9, patch['dark'], patch['roof'], patch['tongue'])
    # --- assemble: coat (+ mouth) first, then the lids (coat material), the eyeballs last (eye material)
    pos, nrm, uv, tri, part, jw = [P2], [Nfull], [UV2], [F2], [np.zeros(len(P2))], [jaw]
    n = len(P2)
    def add(p, nn, t, tr, pid, j):
        nonlocal n
        pos.append(p); nrm.append(nn); uv.append(t); tri.append(tr + n); part.append(np.full(len(p), pid)); jw.append(j); n += len(p)
    bn = np.tile([0, 1.0, 0], (len(bp), 1))
    add(bp, bn, buv, bt, 1, bj)
    part[-1][tmask] = 8
    PART = {'eyeL': 2, 'eyeR': 3, 'lidUL': 4, 'lidDL': 5, 'lidUR': 6, 'lidDR': 7, 'tongue': 8, 'mouth': 9}
    lids = [q for q in parts if q[0].startswith('lid')]; balls = [q for q in parts if q[0].startswith('eye')]
    for name, p, nn, t, tr in lids: add(p, nn, t, tr, PART[name], np.zeros(len(p)))
    eye_start = sum(len(t) for t in tri)
    for name, p, nn, t, tr in balls: add(p, nn, t, tr, PART[name], np.zeros(len(p)))
    mouth_start = sum(len(t) for t in tri)
    if mouth_parts is not None:
        lp, luv, lt, lj = mouth_parts
        add(lp, np.tile([0, 0, 1.0], (len(lp), 1)), luv, lt, 9, lj)
    pos, nrm, uv, tri = np.concatenate(pos), np.concatenate(nrm), np.concatenate(uv), np.concatenate([np.asarray(t, np.int64).reshape(-1, 3) for t in tri])
    part, jw = np.concatenate(part), np.concatenate(jw)
    shift = np.array(shift)
    M = lambda q: ((np.array(q, float) + shift) * scale).round(5).tolist()
    extras = {
        'joints': {k: M(v) for k, v in J.items()},
        'eyes': {s: dict(c=M(e['c']), ax=e['ax'].round(4).tolist(), s=e['s'].round(4).tolist(), r=round(eye_r * scale, 5), tilt=e['tilt']) for s, e in eyes.items()},
        'tongue': dict(base=M(tbase), dir=tdir.round(4).tolist()),
        'frames': {k: [round(x, 6) for x in v] for k, v in fuv.items()},
        'eyeTris': [int(eye_start), int(mouth_start)], 'mouthTris': [int(mouth_start), int(len(tri))],
        'parts': PART, 'source': SOURCES[source],
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



# ------------------------------------------------------------------ Fripouille (guillaume bolis, hand-made): Mikan's base
def fri_prepared(tris=2150):
    """Fripouille's body in her rigged standing pose (skinned on the CPU: gltfskin.py), turned to stand on y = 0 facing
    +z, squared to the z axis, scaled to 30 units tall (ear tips), her head centred; her own UVs and Substance-painted
    texture. Returns P, F, UV, N, src (1024 px, the repaint's base) and her skeleton's joints read off the skin weights
    (same units): {pair or name: xyz}."""
    from gltfskin import load, joints_from_weights
    dl = os.path.join(CACHE, '_dl', 'fri')
    if not os.path.exists(os.path.join(dl, 'scene.gltf')):
        sys.path.insert(0, LOWPIX)
        from lowpix.sketchfab import fetch
        fetch(SOURCES['fri']['uid'], dl)
    M, _ = load(os.path.join(dl, 'scene.gltf'))
    m = [x for x in M if x['mat'] == 'SHD_frip'][0]
    pairs, own = joints_from_weights(m)
    P, F, UV = m['pos'].copy(), m['idx'][:, [0, 2, 1]].copy(), m['uv']
    a = np.radians(-28.8)                                       # she walks diagonally: square her to +z
    c, sn = np.cos(a), np.sin(a)
    def T0(Q):
        Q = np.stack([-Q[:, 2], -Q[:, 1], -Q[:, 0]], 1)          # upside down, facing -x  ->  standing, facing +z
        return np.stack([c * Q[:, 0] + sn * Q[:, 2], Q[:, 1], -sn * Q[:, 0] + c * Q[:, 2]], 1)
    P = T0(P)
    off = np.array([(P[:, 0].max() + P[:, 0].min()) / 2, P[:, 1].min(), (P[:, 2].max() + P[:, 2].min()) / 2])
    k = 30.0 / (P[:, 1].max() - off[1])
    def T(Q):
        Q = (T0(np.atleast_2d(Q)) - off) * k
        # her head is carried 1.4 to her right of the spine (a glance mid-stride): centre it, blended down the neck
        w = np.clip((Q[:, 2] - 13.5) / 4.5, 0, 1) * np.clip((Q[:, 1] - 17.5) / 3.0, 0, 1)
        Q[:, 0] += 1.4 * w * w * (3 - 2 * w)
        return Q
    P = T(m['pos'])
    N = weld_normals(P, F)
    J = {key: T(v[0])[0] for key, v in pairs.items()}
    O = {key: T(v) for key, v in own.items()}
    tex = Image.open(os.path.join(dl, 'textures', 'SHD_frip_baseColor.png')).convert('RGB')
    if tris:
        # the game budget (<= 3k tris an animal, with eyes, lids and mouth): lowpix decimates her (feature-preserving,
        # the silhouette kept) and re-bakes her texture onto the low mesh's own atlas
        out = os.path.join(CACHE, f'fri_lo{tris}')
        glb = os.path.join(out, 'src.glb')
        if not os.path.exists(glb):
            os.makedirs(out, exist_ok=True)
            png = io.BytesIO(); tex.save(png, 'PNG')
            write_glb(os.path.join(out, 'in.glb'), P, N, UV, F, png.getvalue())
            subprocess.run([sys.executable, '-m', 'lowpix', 'convert', os.path.join(out, 'in.glb'), '--name', 'src', '--style', 'realistic', '--height', '30',
                            '--tris', str(tris), '--atlas', '1024', '-o', out], check=True, env=dict(os.environ, PYTHONPATH=LOWPIX), cwd=LOWPIX)
        g = read_glb(glb)
        P2, F2, UV2 = g['pos'], g['idx'], g['uv']
        print('decimated', len(F), '->', len(F2), 'bounds', P2.min(0).round(2), P2.max(0).round(2), 'vs', P.min(0).round(2), P.max(0).round(2))
        return P2, F2, UV2, weld_normals(P2, F2), np.asarray(Image.open(io.BytesIO(g['png'])).convert('RGB')).astype(np.float32), J, O
    src = down2(np.asarray(tex))
    return P, F, UV, N, src, J, O


def debug_fri():
    P, F, UV, N, src, J, O = fri_prepared()
    print('bounds', P.min(0).round(2), P.max(0).round(2))
    for kk, v in sorted(J.items()): print(kk, v.round(2))
    t = src.astype(np.float32)
    a = render(P, F, 'side', None, px=22, grid=2, tex=t, UV=UV)
    zmax = P[:, 2].max()
    b = render(P, F, 'front', (-6, 6, P[:, 1].max() - 13, P[:, 1].max() + 0.5), px=50, grid=1, tex=t, UV=UV)
    c = render(P, F, 'side', (zmax - 11, zmax + 0.5, P[:, 1].max() - 13, P[:, 1].max() + 0.5), px=50, grid=1, tex=t, UV=UV)
    o = Image.new('RGB', (a.width + b.width + c.width, max(a.height, b.height, c.height))); o.paste(a, (0, 0)); o.paste(b, (a.width, 0)); o.paste(c, (a.width + b.width, 0))
    o.save(os.path.join(CACHE, 'fri_dbg.png'))



# ------------------------------------------------------------------ Mikan: Fripouille repainted as a calico
CAL = {
    'white': ['#3e3b38', '#56524d', '#706a63', '#8b847a', '#a69e93', '#bdb5aa', '#d0c9be', '#e0d9cf', '#ebe6dd', '#f4f0e9'],
    'orange': ['#2a160d', '#402213', '#583019', '#6f3e20', '#874d27', '#9c5d30', '#ae6e3b', '#bd8149', '#c9945b', '#d4a874'],
    'black': ['#0a0807', '#110e0c', '#181412', '#201b18', '#29231f', '#332c27', '#3f3731', '#4c433b'],
    'pink': ['#4a2a2a', '#62393a', '#7a4b4a', '#905e5b', '#a3716c', '#b4847d', '#c29790', '#cfaaa2'],
    'dark': ['#0b0908', '#151110', '#1f1a18', '#2a2421'],
}
STRAY_EYE = dict(ball='#1a120c', limbus='#3a2410', outer='#94621e', mid='#bc862a', inner='#d6a83e', fibre_d='#7a4c14',
                 fibre_l='#e0b656', shadow='#664012', pupil='#070605', glint='#f4f0e2', glint2='#b8a888')
MIKAN_EYE = dict(ball='#1a120c', limbus='#2e2a12', outer='#76702c', mid='#a29438', inner='#c8a846', fibre_d='#5e5620',
                 fibre_l='#c6b45a', shadow='#4a4416', pupil='#070605', glint='#f4f0e2', glint2='#b8a888')


def fri_joints(J, O):
    """CatRig's joints on Fripouille (source units): the trunk, legs and neck from her own skeleton (read off the skin
    weights: y and z; x from each leg's centre line), the hips, tail, ears and contact points from the sculpt."""
    g = lambda a, b: J[(a, b)] if (a, b) in J else J[(b, a)]
    yz = lambda v, x: (x, float(v[1]), float(v[2]))
    low = lambda k: O[k][O[k][:, 1] < O[k][:, 1].min() + 0.6].mean(0)
    c = {k: O[k].mean(0) for k in ['Bone.005_014', 'Bone.006_015', 'Bone.007_016', 'Bone.008_017', 'Bone.010_019']}
    mid = lambda a, b: tuple(((c[a] + c[b]) / 2).round(3).tolist())
    tip = O['Bone.010_019'][O['Bone.010_019'][:, 2].argmin()]
    return {
        'body': (0, 18.0, 1.0), 'chest': (0, 19.5, 9.3), 'head': yz(g('Bone.003_04', 'Bone.004_05'), 0.0), 'jaw': (0, 22.9, 21.2),
        'earL': (2.5, 27.9, 20.7), 'earR': (-2.5, 27.9, 20.8),
        'legFL': yz(g('Bone.015_06', 'Bone.016_07'), 3.8), 'armFL': yz(g('Bone.016_07', 'Bone.017_08'), 3.2), 'pawFL': yz(g('Bone.017_08', 'Bone.018_09'), 2.1),
        'legFR': yz(g('Bone.019_010', 'Bone.020_011'), -3.9), 'armFR': yz(g('Bone.020_011', 'Bone.021_012'), -3.6), 'pawFR': yz(g('Bone.021_012', 'Bone.022_013'), -3.2),
        'legBL': (3.4, 18.5, -5.5), 'shinBL': yz(g('Bone.011_020', 'Bone.012_021'), 2.5), 'pawBL': yz(g('Bone.012_021', 'Bone.013_022'), 1.9),
        'legBR': (-3.4, 18.5, -5.5), 'shinBR': yz(g('Bone.023_024', 'Bone.024_00'), -3.1), 'pawBR': yz(g('Bone.024_00', 'Bone.025_025'), -3.0),
        'tail0': (0, 21.9, -8.6), 'tail1': mid('Bone.005_014', 'Bone.006_015'), 'tail2': mid('Bone.006_015', 'Bone.007_016'),
        'tail3': mid('Bone.007_016', 'Bone.008_017'), 'tail4': mid('Bone.008_017', 'Bone.010_019'),
        '_footFL': tuple(low('Bone.018_09')), '_footFR': tuple(low('Bone.022_013')), '_footBL': tuple(low('Bone.014_023')), '_footBR': tuple(low('Bone.026_026')),
        '_tailTip': tuple(tip), '_nose': (0, 23.9, 25.5), '_rump': (0, 21.0, -10.5),
    }


def make_mikan(coat='calico'):
    from coat import vnoise3, raster, surface
    P, F, UV, N, src, J, O = fri_prepared()
    H, W = src.shape[:2]
    tri, bary = raster(P, F, UV, W, H)
    ok, Ps, Ns = surface(P, N, F, tri, bary)
    r, g, b = src[..., 0], src[..., 1], src[..., 2]
    lum = (r * 0.3 + g * 0.55 + b * 0.15) / 255
    x, y, z = Ps[..., 0], Ps[..., 1], Ps[..., 2]
    ax = np.abs(x)
    warm = (r - b > 38) & (lum < 0.86)
    # inner ears: the front-facing hollow, inside its rim (the rim and the back of the ear keep the coat)
    ear = (y > 27.4) & (ax > 1.4) & (z > 19.8)
    ex = np.where(x > 0, 2.55, -2.55)
    inner_ear = ear & (Ns[..., 2] > 0.35) & (np.abs(x - ex) < 0.75 - 0.35 * np.clip((y - 27.4) / 2.6, 0, 1))
    skin = ((z > 24.7) & (ax < 0.75) & (y > 23.3) & (y < 24.6)) | (y < 0.7) | inner_ear
    pink = skin & (r > g + 18) & (r > b + 6) & (lum > 0.28)
    pink |= inner_ear
    dark = lum < 0.1
    # calico: black patches over the orange (noise, a jagged edge), the face split down the blaze: her right cheek and
    # ear black, her left orange; the tail ringed
    n1 = vnoise3(x * 0.15, y * 0.15, z * 0.15, 5)
    n2 = vnoise3(x * 1.7 + 7, y * 1.7, z * 1.7, 9)
    n3 = vnoise3(x * 4.5, y * 4.5, z * 4.5, 13)
    jag = (n2 - 0.5) * 1.6 + (n3 - 0.5) * 0.7          # a ragged, furry patch edge
    head = z > 17.5
    blackp = np.where(head, x < -0.5 + jag * 0.8, n1 > 0.53 + (n2 - 0.5) * 0.12)
    tail = z < -8.8
    blackp = np.where(tail, ((np.abs(z + 20) % 4.8) < 1.6 + jag * 0.4) | (z < -24.2), blackp)
    out = src.copy()
    def put(m, name, k, mid):
        R = hexes(CAL[name])
        if not m.any(): return
        L = lum[m]; med = np.median(L)
        idx = np.clip(np.round(mid * (len(R) - 1) + (L / max(med, 1e-3) - 1) * k), 0, len(R) - 1).astype(int)
        out[m] = R[idx]
    base = ok & ~pink & ~dark
    if coat == 'tabby':
        # the stray: a dark grey-brown mackerel tabby: narrow dark stripes down the flanks (perpendicular to the spine),
        # rings on the legs and tail, the forehead M and cheek lines, a dark spine line; a paler buff underside
        TB = {'coat': hexes(['#1c1916', '#262220', '#302b27', '#3b3530', '#47403a', '#544c45', '#625951', '#70675e', '#7f756b']),
              'stripe': hexes(['#0e0c0b', '#161311', '#1d1a17', '#25211e', '#2e2925']),
              'pale': hexes(['#4a443d', '#5a534b', '#6b635a', '#7c7368', '#8d8377', '#9d9386', '#ada395'])}
        L = lum; med = np.median(L[base]) if base.any() else 0.5
        jitter = (n3 - 0.5) * 0.25 + (n2 - 0.5) * 0.3
        body_ = (z > -8.8) & (z < 17.5)
        band = np.where(body_, np.sin((z + jitter * 3) * 1.25 + 0.4 * np.abs(x)) > 0.55 - 0.25 * np.clip((y - 14) / 8, 0, 1), False)
        band |= (z < -8.8) & (np.sin(z * 1.4 + jitter) > 0.35)
        band |= (y < 12) & (z > -14) & (np.sin(y * 1.5 + jitter * 2) > 0.62)
        band |= head & (ax < 0.9) & (y > 26.4) & (z > 19.5) & (np.sin(x * 9) > 0.2)               # the forehead M
        band |= (z > -9) & (z < 15) & (ax < 0.55) & (y > 22)
        band &= ~(head & (y < 26.4))                                                             # a clean face
        under = ~warm
        def tput(m, R, mid):
            if not m.any(): return
            idx = np.clip(np.round(mid * (len(R) - 1) + (L[m] / max(med, 1e-3) - 1) * 5 + jitter[m] * 3), 0, len(R) - 1).astype(int)
            out[m] = R[idx]
        tput(base & band & ~(under & (y < 13) & (z > -9) & (z < 17)), TB['stripe'], 0.5)
        tput(base & ~band & warm, TB['coat'], 0.6)
        tput(base & under & ~band, TB['pale'], 0.62)
        put(ok & pink, 'pink', 6, 0.35)
        put(ok & dark, 'dark', 3, 0.4)
    else:
        put(base & warm & blackp, 'black', 6, 0.5)
        put(base & warm & ~blackp, 'orange', 8, 0.6)
        put(base & ~warm, 'white', 8, 0.8)
        put(ok & pink, 'pink', 6, 0.62)
        put(ok & dark, 'dark', 3, 0.4)
    # the sculpt's dark eye sockets round the new eyeballs: coat colour (the eyes and lids are modelled now)
    for sx in (1, -1):
        d = np.sqrt((x - sx * 1.6) ** 2 + (y - 25.24) ** 2)
        sock = ok & (d < 1.25) & (z > 21.5) & (lum < 0.3)
        out[sock & (blackp if coat == 'calico' else True)] = hexes(CAL['black'])[4]
        if coat == 'calico': out[sock & ~blackp] = hexes(CAL['orange'])[5]
    # inner-ear furnishings: pale hairs fanning up from the base of the hollow
    from coat import hash2
    hh = hash2((x * 9).astype(int) & 0xffff, (y * 3).astype(int) & 0xffff, 21)
    out[inner_ear & (y < 28.6) & (hh < 0.14)] = hexes(CAL['white'])[5]
    body = np.clip(out, 0, 255).astype(np.uint8)
    global OPEN_EYE
    OPEN_EYE = (0.74, -0.66)
    lip = lambda X: 22.55 - 0.35 * (np.asarray(X) / 1.5) ** 2
    return rig_cat('mikan' if coat == 'calico' else 'stray', P, F, UV, N, body, fri_joints(J, O), MIKAN_EYE if coat == 'calico' else STRAY_EYE, eye_y=25.24, eye_x=1.6, eye_r=0.72, eye_in=0.62, cut=dict(
        zone=lambda C: np.zeros(len(C), bool),
        lower=lambda C: (C[:, 1] < lip(C[:, 0]) - 0.02) & (C[:, 2] > 21.0) & (np.abs(C[:, 0]) < 2.6) & (C[:, 1] > 19.8),
        fall=lambda Q: np.clip((Q[:, 2] - 21.0) / 1.6, 0, 1) * np.clip((2.6 - np.abs(Q[:, 0])) / 0.9, 0, 1) * np.clip((Q[:, 1] - 19.8) / 0.8, 0, 1),
        below=lambda Q: np.clip((lip(Q[:, 0]) - Q[:, 1]) / 0.4 + 0.35, 0, 1),
        inward=(0, 22.3, 22.5), depth=1.4, tongue=1.5,
        bowl=dict(c=(0, 22.3, 24.6), rx=1.3, ry=0.6, depth=2.0, tongue=(0, 22.25, 24.4), tdir=(0, 0.05, -1), tlen=1.5),
        lens=dict(w=1.45, lip_y=lip, cols=dict(lip='#2a1a1a', inside='#5c2226', throat='#2e0f12', ridge='#7a3439', tongue='#c27a7c', tongueD='#9a5658', tooth='#ece6d8'))),
        scale=0.0102, shift=(0, 0, -3.0), source='fri', head_z=21.5)


def make_stray():
    return make_mikan('tabby')


if __name__ == '__main__':
    for a in sys.argv[1:] or ['mikan']:
        (globals().get('make_' + a) or globals()[a])()
