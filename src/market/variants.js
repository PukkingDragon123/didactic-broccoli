// Funny second-hand variants made visible on the 3D item: die-cut stickers, marker doodles (a moustache, glasses, 肉 on
// the forehead), a kid's crayon signature, stains, and recoloured materials for sun-faded paint and factory misprints.
// Everything is hand-pixelled (16 x 16 sprites, nearest filtering) and stuck to the actual surface: each decal is
// placed by casting a ray at the item from the front, so it sits on the figure's belly or the machine's faceplate.
//   decorate(obj, variant, { kind: 'figure' | 'machine' | 'prop', face?: { x0, x1, y0, y1, z } }) -> obj
//   undecorate(obj)                     remove a previous decoration
//   variantMaterial(mat, variant)       the faded / misprinted version of a material (or the material itself)
//   tintMaterial(mat, rgbHex)           white paint recoloured (black / red maneki-neko)
import * as THREE from 'three';
import { Pix } from '../gfx/pix.js';
import { rng } from '../core/util.js';

const K = 0x1a1216, CREAM = 0xf4ead6;

// ------------------------------------------------------------------ sprite textures
const texCache = new Map();
function cached(key, draw) {
  let t = texCache.get(key);
  if (!t) {
    const p = draw();
    t = p.texture();
    t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
    t.userData = { aspect: p.w / p.h };
    texCache.set(key, t);
  }
  return t;
}
/** 16 x 16 sticker: a shape mask filled by colour(x, y), with a cream die-cut border and a dark rim. */
function sticker(maskFn, colFn, W = 16, H = 16) {
  const p = new Pix(W + 4, H + 4, 3);
  const m = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) m[y * W + x] = maskFn(x + 0.5, y + 0.5);
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
  // border: anything within 1 px of the shape
  for (let y = -1; y <= H; y++) for (let x = -1; x <= W; x++) {
    if (at(x, y)) continue;
    let n = false;
    for (let dy = -1; dy <= 1 && !n; dy++) for (let dx = -1; dx <= 1 && !n; dx++) if (at(x + dx, y + dy)) n = true;
    if (n) p.px(x + 2, y + 2, CREAM);
  }
  // a thin darker rim just outside the cream border (collected first, so it doesn't spread)
  const rim = [];
  for (let y = -2; y <= H + 1; y++) for (let x = -2; x <= W + 1; x++) {
    const i = (y + 2) * (W + 4) + (x + 2);
    if (p.d[i * 4 + 3]) continue;
    let n = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx + 2, yy = y + dy + 2; if (xx >= 0 && yy >= 0 && xx < W + 4 && yy < H + 4 && p.d[(yy * (W + 4) + xx) * 4 + 3] && !(at(x + dx, y + dy))) n = true; }
    if (n) rim.push([x + 2, y + 2]);
  }
  for (const [x, y] of rim) p.px(x, y, 0x8a7a6a);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y)) p.px(x + 2, y + 2, colFn(x, y));
  return p;
}
const circ = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
function starTest(cx, cy, R, r) {
  return (x, y) => {
    const a = Math.atan2(y - cy, x - cx) + Math.PI / 2, d = Math.hypot(x - cx, y - cy);
    const k = ((a / (Math.PI * 2 / 5)) % 1 + 1) % 1, t = Math.abs(k - 0.5) * 2;
    return d <= r + (R - r) * t;
  };
}
const heartTest = (x, y) => { const X = (x - 8) / 6.5, Y = -(y - 7.5) / 6.5 + 0.15; return (X * X + Y * Y - 0.5) ** 3 - X * X * Y * Y * Y < 0; };

const STICKER_DRAW = {
  star: () => sticker(starTest(8, 8.6, 8, 3.6), (x, y) => (y < 6 ? 0xffe46a : y > 11 ? 0xe8a820 : 0xffd23f)),
  heart: () => sticker(heartTest, (x, y) => (x < 6 && y < 6 ? 0xff9fae : 0xe8455a)),
  smiley: () => {
    const p = sticker(circ(8, 8, 7.5), (x, y) => (y < 5 ? 0xffe46a : 0xffd23f));
    for (const [x, y] of [[5, 5], [5, 6], [10, 5], [10, 6], [4, 10], [5, 11], [6, 12], [7, 12], [8, 12], [9, 12], [10, 11], [11, 10]]) p.px(x + 2, y + 2, K);
    return p;
  },
  kitty: () => {
    const m = (x, y) => circ(8, 9.5, 6.4)(x, y) || (y < 7 && ((x > 2 && x < 6.5 && y > 1 + (x - 2) * 0.2) || (x > 9.5 && x < 13.5 && y > 1 + (13.5 - x) * 0.2)));
    const p = sticker(m, () => 0xfbf6ec);
    for (const [x, y] of [[5, 9], [5, 10], [10, 9], [10, 10]]) p.px(x + 2, y + 2, K);
    p.px(7 + 2, 11 + 2, 0xffd23f); p.px(8 + 2, 11 + 2, 0xffd23f);
    for (const [x, y] of [[11, 4], [12, 4], [12, 5], [11, 5], [13, 5]]) p.px(x + 2, y + 2, 0xe8455a); // bow
    for (const [x, y] of [[1, 10], [2, 10], [1, 12], [2, 12], [13, 10], [14, 10], [13, 12], [14, 12]]) p.px(x + 2, y + 2, 0x6a5a5a);
    return p;
  },
  price: () => {
    const p = sticker((x, y) => x > 0.5 && x < 15.5 && y > 3.5 && y < 12.5, (x, y) => (y < 6 ? 0xff7a5a : 0xe8452a));
    p.tinyText('100', 10, 5, { color: 0xfff8e8, align: 'center' });
    p.rect(3, 7, 1, 5, 0xfff8e8); p.px(2, 7, 0xfff8e8); p.px(4, 7, 0xfff8e8); p.rect(2, 9, 3, 1, 0xfff8e8);
    return p;
  },
  band: () => {
    const p = sticker((x, y) => x > 0.5 && x < 15.5 && y > 2.5 && y < 13.5, (x, y) => (y < 5 ? 0x3a3a3e : 0x1e1e22));
    p.tinyText('KAP', 10, 4, { color: 0xe8455a, align: 'center' });
    p.tinyText('PA', 10, 10, { color: 0xffd23f, align: 'center' });
    return p;
  },
  onigiri: () => {
    const p = sticker((x, y) => y > 2 && y < 15 && Math.abs(x - 8) < (y - 1.5) * 0.62 + 0.5, (x, y) => (y > 10.5 ? 0x1e2a1e : 0xfbf6ec));
    p.px(6 + 2, 7 + 2, K); p.px(9 + 2, 7 + 2, K); p.px(7 + 2, 9 + 2, 0xe8455a); p.px(8 + 2, 9 + 2, 0xe8455a);
    return p;
  },
  skull: () => {
    const p = sticker((x, y) => circ(8, 7, 6.2)(x, y) || (y < 14.5 && x > 4.5 && x < 11.5), (x, y) => (y < 5 ? 0xfbf6ec : 0xe8e0d0));
    for (const [x, y] of [[5, 6], [6, 6], [5, 7], [6, 7], [9, 6], [10, 6], [9, 7], [10, 7], [7, 10], [8, 10], [6, 13], [8, 13], [10, 13]]) p.px(x + 2, y + 2, K);
    return p;
  },
  rainbow: () => sticker((x, y) => { const d = Math.hypot(x - 8, y - 13); return y < 13.5 && d < 8 && d > 2.5; }, (x, y) => [0xe8455a, 0xff8a3a, 0xffd23f, 0x58c06c, 0x3f86e8][Math.min(4, Math.floor((8 - Math.hypot(x + 0.5 - 8, y + 0.5 - 13)) / 1.1))]),
  ghost: () => {
    const p = sticker((x, y) => (circ(8, 7, 5.6)(x, y) || (y >= 7 && y < 14 && x > 2.4 && x < 13.6)) && !(y > 12.5 && Math.floor(x / 2.8) % 2), () => 0xf0f4ff);
    for (const [x, y] of [[6, 6], [6, 7], [10, 6], [10, 7]]) p.px(x + 2, y + 2, K);
    p.px(8 + 2, 10 + 2, 0xff9fae);
    return p;
  },
  flower: () => sticker((x, y) => [0, 1, 2, 3, 4].some((i) => circ(8 + Math.cos(i * 1.2566 - 1.57) * 4.2, 8 + Math.sin(i * 1.2566 - 1.57) * 4.2, 3.2)(x, y)) || circ(8, 8, 2.6)(x, y), (x, y) => (Math.hypot(x + 0.5 - 8, y + 0.5 - 8) < 2.6 ? 0xffd23f : 0xff8ab8)),
  bolt: () => sticker((x, y) => { const pts = [[10, 0], [3, 9], [7.5, 9], [5, 16], [13, 6], [8.5, 6], [11, 0]]; let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }, (x, y) => (x < 8 ? 0xffe46a : 0xf0b820)),
};
export const stickerTex = (id) => cached('st:' + id, STICKER_DRAW[id] || STICKER_DRAW.star);

const MARKER = 0x1a1a22;
const DOODLE_DRAW = {
  moustache: () => { const p = new Pix(16, 6, 1); const rows = ['.KK..........KK.', 'K..K........K..K', 'K...KKK..KKK...K', '.K.KKKKKKKKKK.K.', '..KKKKK..KKKKK..', '................']; p.sprite(rows, { K: MARKER }, 0, 0); return p; },
  glasses: () => { const p = new Pix(16, 7, 1); const rows = ['.KKKKK....KKKKK.', 'K.....K..K.....K', 'K.....KKKK.....K', 'K.....K..K.....K', '.KKKKK....KKKKK.', '................', '................']; p.sprite(rows, { K: MARKER }, 0, 0); return p; },
  niku: () => { const p = new Pix(9, 9, 1); const rows = ['KKKKKKKKK', 'K...K...K', 'K..K.K..K', 'K.K...K.K', 'K...K...K', 'K..K.K..K', 'K.K...K.K', 'K.......K', 'K......KK']; p.sprite(rows, { K: MARKER }, 0, 0); return p; },
  brows: () => { const p = new Pix(16, 5, 1); const rows = ['KKKK........KKKK', '.KKKKK....KKKKK.', '...KKK....KKK...', '................', '................']; p.sprite(rows, { K: MARKER }, 0, 0); return p; },
  scribble: () => {
    const p = new Pix(16, 16, 7); const r = rng(42);
    for (const c of [0xe8455a, 0x3f86e8, 0x58c06c]) { let x = 2 + r() * 12, y = 2 + r() * 12; for (let i = 0; i < 9; i++) { const nx = 1 + r() * 14, ny = 1 + r() * 14; p.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), c); x = nx; y = ny; } }
    return p;
  },
  heart: () => { const p = new Pix(16, 16, 1); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const a = heartTest(x + 0.5, y + 0.5), b = heartTest(x + 1.5, y + 0.5) && heartTest(x - 0.5, y + 0.5) && heartTest(x + 0.5, y + 1.5) && heartTest(x + 0.5, y - 0.5); if (a && !b) p.px(x, y, 0xd8282a); } return p; },
};
const doodleTex = (id) => cached('dd:' + id, DOODLE_DRAW[id] || DOODLE_DRAW.scribble);
function signTex(name) {
  return cached('sg:' + name, () => {
    const w = name.length * 6 + 6;
    const p = new Pix(w, 12, name.length);
    const r = rng(name.length * 97 + name.charCodeAt(0));
    const c = [0x2a58c8, 0xd8282a, 0x2a8a3a][name.charCodeAt(0) % 3];
    // crayon letters with a wobble, then an underline swoosh
    for (let i = 0; i < name.length; i++) p.tinyText(name[i], 3 + i * 6, 1 + Math.round(r() * 2), { color: c });
    for (let x = 2; x < w - 2; x++) p.px(x, 10 - Math.round(Math.sin(x * 0.5) * 0.8), c);
    return p;
  });
}
function stainTex(kind) {
  return cached('sn:' + kind, () => {
    const p = new Pix(16, 16, kind.length * 3);
    const c = kind === 'curry' ? 0xc8902a : kind === 'coffee' ? 0x5a3a22 : 0x2a3a8a;
    const r = rng(kind.length * 31);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const d = Math.hypot(x - 7.5 + Math.sin(y * 0.9) * 1.2, (y - 8) * 1.2) / 6.5;
      if (d < 1 && r() > d * 0.55) p.px(x, y, c);
      else if (d < 1.15 && r() < 0.18) p.px(x, y, c);
    }
    return p;
  });
}

// ------------------------------------------------------------------ materials
const decalMats = new Map();
function decalMat(tex) {
  let m = decalMats.get(tex);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false });
    decalMats.set(tex, m);
  }
  return m;
}
const varMats = new Map();
const glsl = {
  fade: (a) => `{ float l_ = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(l_) * 0.62 + vec3(0.34, 0.33, 0.3), ${a.toFixed(3)}); }`,
  swap: () => 'diffuseColor.rgb = diffuseColor.gbr;',
  swap2: () => 'diffuseColor.rgb = diffuseColor.brg;',
  pale: () => 'diffuseColor.rgb = vec3(diffuseColor.r, diffuseColor.g, diffuseColor.b * 0.25 + 0.5);',
  bootleg: () => '{ float l_ = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); diffuseColor.rgb = mix(diffuseColor.bgr, vec3(l_), 0.3) * 1.1; }',
  tint: (c) => { const v = new THREE.Color(c); return `{ float l_ = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114)); float s_ = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) - min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)); if (l_ > 0.7 && s_ < 0.16) diffuseColor.rgb = vec3(${v.r.toFixed(3)}, ${v.g.toFixed(3)}, ${v.b.toFixed(3)}) * (0.55 + 0.55 * l_); }`; },
};
function patched(mat, key, code) {
  const ck = mat.uuid + '|' + key;
  let m = varMats.get(ck);
  if (m) return m;
  m = mat.clone();
  const prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.bind(mat);
  m.onBeforeCompile = (sh, r) => {
    prev?.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `${code}\n#include <emissivemap_fragment>`);
  };
  m.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|mkt:${key}`;
  varMats.set(ck, m);
  return m;
}
/** The faded / misprinted version of a material, for a variant (the same material when it has neither). */
export function variantMaterial(mat, v) {
  if (!v || !mat) return mat;
  if (Array.isArray(mat)) return mat.map((m) => variantMaterial(m, v));
  if (mat.isMeshBasicMaterial || mat.transparent) return mat;
  const parts = [];
  if (v.bootleg) parts.push(['boot', glsl.bootleg()]);
  else if (v.misprint) parts.push([v.misprint, glsl[v.misprint]?.() || '']);
  if (v.faded) { const a = Math.round(v.faded * 10) / 10; parts.push([`f${a}`, glsl.fade(a)]); }
  if (!parts.length) return mat;
  return patched(mat, parts.map((p) => p[0]).join('+'), parts.map((p) => p[1]).join('\n'));
}
export function tintMaterial(mat, c) {
  if (Array.isArray(mat)) return mat.map((m) => tintMaterial(m, c));
  if (!mat || mat.isMeshBasicMaterial || mat.transparent) return mat;
  return patched(mat, 'tint' + c, glsl.tint(c));
}

// ------------------------------------------------------------------ placing decals on the surface
const _ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3(0, 0, -1), _n = new THREE.Vector3();
const _box = new THREE.Box3(), _inv = new THREE.Matrix4();
const planeGeo = new THREE.PlaneGeometry(1, 1);
const hitMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });

/** Meshes under obj (in obj's local space) that a decal can stick to. */
function surfaces(obj) {
  const out = [];
  obj.updateWorldMatrix(true, true);
  _inv.copy(obj.matrixWorld).invert();
  obj.traverse((m) => {
    if (!m.isMesh || m.userData.decal || m.userData.noDecal || !m.geometry?.attributes?.position) return;
    if (m.isInstancedMesh || m.material?.transparent) return;
    const local = new THREE.Mesh(m.geometry, hitMat);
    local.matrixAutoUpdate = false;
    local.matrix.multiplyMatrices(_inv, m.matrixWorld);
    local.matrixWorld.copy(local.matrix);
    out.push(local);
  });
  return out;
}

/**
 * Decorate obj with a variant. opts.kind: 'figure' (decals sized for a 7 cm toy, doodles on the head), 'machine' or
 * 'prop'; opts.face: the front rectangle { x0, x1, y0, y1, z } in obj space (else from the bounding box, front = +z).
 */
export function decorate(obj, v, opts = {}) {
  if (!obj || !v) return obj;
  undecorate(obj);
  const kind = opts.kind || 'prop';
  // recolour (faded paint, misprints, bootlegs)
  if (v.faded || v.misprint || v.bootleg) obj.traverse((m) => { if (m.isMesh && !m.userData.decal) { m.userData.mat0 ??= m.material; m.material = variantMaterial(m.userData.mat0, v); } });
  const decals = [];
  if (v.stickers) for (const s of v.stickers) decals.push({ tex: stickerTex(s.id), u: s.u, v: s.v, rot: s.rot || 0, size: (s.s || 1) * (kind === 'machine' ? 0.075 : kind === 'figure' ? 0.36 : 0.24) });
  if (v.doodle) {
    const onFace = ['moustache', 'glasses', 'brows', 'niku'].includes(v.doodle);
    decals.push({ tex: doodleTex(v.doodle), u: 0.5, v: onFace ? 0.75 : 0.45, head: onFace ? { moustache: -0.2, glasses: -0.1, brows: -0.06, niku: -0.03 }[v.doodle] : undefined, rot: 0, size: kind === 'machine' ? 0.12 : v.doodle === 'niku' ? 0.2 : v.doodle === 'moustache' ? 0.38 : 0.44, doodle: true });
  }
  if (v.signed) decals.push({ tex: signTex(v.signed), u: 0.5, v: 0.22, rot: -0.12, size: kind === 'machine' ? 0.16 : 0.62, doodle: true });
  if (v.stain) decals.push({ tex: stainTex(v.stain), u: 0.35, v: 0.4, rot: 0.3, size: kind === 'machine' ? 0.1 : 0.32 });
  if (!decals.length) { obj.userData.variant = v; return obj; }
  const grp = new THREE.Group();
  grp.name = 'variant';
  grp.userData.decal = true;
  const hitList = surfaces(obj);
  obj.updateWorldMatrix(true, true);
  let face = opts.face;
  if (!face) {
    _box.makeEmpty();
    for (const m of hitList) { m.geometry.computeBoundingBox(); const b = m.geometry.boundingBox.clone().applyMatrix4(m.matrix); _box.union(b); }
    if (_box.isEmpty()) return obj;
    face = { x0: _box.min.x, x1: _box.max.x, y0: _box.min.y, y1: _box.max.y, z: _box.max.z };
  }
  const W = face.x1 - face.x0, H = face.y1 - face.y0;
  const r = rng(Math.round((v.stickers?.length || 0) * 31 + W * 1e4));
  // figures: find the top of the face (the highest point near the front; keychain loops and ears sit further back)
  let headV = 0.86;
  if (kind === 'figure' && hitList.length) {
    const zFront = face.z, depth = Math.max(0.01, face.z - (_box.isEmpty() ? face.z - 0.04 : _box.min.z));
    for (let k = 0.98; k > 0.4; k -= 0.02) {
      _o.set(face.x0 + W * 0.5, face.y0 + H * k, zFront + 0.5);
      _ray.set(_o, _d); _ray.far = 1;
      const hh = _ray.intersectObjects(hitList, false)[0];
      if (hh && hh.point.z >= zFront - depth * 0.38) { headV = k; break; }
    }
  }
  for (const d of decals) {
    const asp = d.tex.userData.aspect || 1;
    const w = kind === 'machine' ? d.size : d.size * Math.min(W, H * 0.9);
    const h = w / asp;
    let x = face.x0 + W * d.u, y = face.y0 + H * (kind === 'figure' && d.head !== undefined ? Math.max(0.3, headV + d.head) : d.v);
    let z = face.z + 0.0006, nrm = new THREE.Vector3(0, 0, 1);
    if (hitList.length && !opts.flat) {
      // stick it to whatever is in front at (x, y); nudge sideways a little if the ray misses (between legs, past an ear)
      let hit = null;
      for (let k = 0; k < 6 && !hit; k++) {
        const jx = k ? (r() - 0.5) * W * 0.4 : 0, jy = k ? (r() - 0.5) * H * 0.2 : 0;
        _o.set(x + jx, y + jy, face.z + 0.5);
        _ray.set(_o, _d);
        _ray.far = 1;
        const hits = _ray.intersectObjects(hitList, false);
        if (hits.length) { hit = hits[0]; x += jx; y += jy; }
      }
      if (!hit) continue;
      _n.copy(hit.face?.normal || _n.set(0, 0, 1)).transformDirection(hit.object.matrix);
      if (_n.z < 0.3) _n.set(0, 0, 1);
      nrm = _n.clone();
      z = hit.point.z;
    }
    const m = new THREE.Mesh(planeGeo, decalMat(d.tex));
    m.userData.decal = true; m.userData.noRim = true;
    m.raycast = () => {};
    m.scale.set(w, h, 1);
    m.position.set(x, y, z).addScaledVector(nrm, kind === 'machine' ? 0.0015 : 0.0006);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
    m.rotateZ(d.rot);
    m.castShadow = false; m.receiveShadow = true;
    m.renderOrder = 2;
    grp.add(m);
  }
  obj.add(grp);
  obj.userData.variant = v;
  return obj;
}

export function undecorate(obj) {
  if (!obj) return;
  const old = obj.children.find((c) => c.name === 'variant');
  if (old) obj.remove(old);
  obj.traverse((m) => { if (m.isMesh && m.userData.mat0) { m.material = m.userData.mat0; delete m.userData.mat0; } });
  delete obj.userData.variant;
}

/** Decorate the figure mesh inside a holder group (held toys, loose toys, shelf slots). */
export function decorateFigure(holderOrMesh, v) {
  if (!v || !holderOrMesh) return;
  let mesh = holderOrMesh.isMesh && holderOrMesh.userData.itemKey ? holderOrMesh : null;
  if (!mesh) holderOrMesh.traverse((m) => { if (!mesh && m.isMesh && m.userData.itemKey) mesh = m; });
  if (!mesh || mesh.userData.variant === v) return;
  decorate(mesh, v, { kind: 'figure' });
}
