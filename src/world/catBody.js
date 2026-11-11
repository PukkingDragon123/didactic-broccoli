// Mikan's body: a chubby, round, fluffy calico in chunky voxels. Built once from sculpted voxel parts (body with a chest
// ruff and fur tufts, a big round head with cheek fluff and a flat face, two ears, four stubby legs with toe beans, a
// five-segment fluffy tail, whiskers), greedy-meshed with baked AO, and merged into ONE rigidly skinned geometry (every
// part rides its own bone: a voxel puppet in a single draw call). The face is pixel art: two decal quads on the head
// (eyes, nose + mouth) whose UVs switch between hand-pixelled frames in a small atlas (content squint, wide surprise,
// sleepy, annoyed, the happy ω mouth, a blep...). Everything else samples one white texel of the same atlas, so the
// whole cat is one mesh with one material.
// Rest pose: standing, facing +z, metres, paws on y = 0; +x is the cat's LEFT.
import * as THREE from 'three';
import { VoxelModel } from '../voxel/VoxelModel.js';
import { meshVoxels } from '../voxel/mesher.js';

export const VS = 0.0105; // metres per voxel

// [bone, parent, rest joint (voxel units, cat space)]
export const CAT_BONES = [
  ['body', null, [0, 12, -3]],
  ['head', 'body', [0, 18, 7]],
  ['earL', 'head', [5, 27.5, 10]], ['earR', 'head', [-5, 27.5, 10]],
  ['legFL', 'body', [4.5, 7, 5]], ['legFR', 'body', [-4.5, 7, 5]],
  ['legBL', 'body', [5, 8, -10]], ['legBR', 'body', [-5, 8, -10]],
  ['tail0', 'body', [0, 14.5, -14.5]], ['tail1', 'tail0', [0, 14.5, -18.5]], ['tail2', 'tail1', [0, 14.5, -22.5]],
  ['tail3', 'tail2', [0, 14.5, -26.5]], ['tail4', 'tail3', [0, 14.5, -30]],
];
export const TAIL_N = 5;
export const CAT_JOINT = Object.fromEntries(CAT_BONES.map(([n, , p]) => [n, p.map((v) => v * VS)]));

// calico palette
const C = {
  W: 0xf6f0e6, W2: 0xe6dccc, O: 0xec923c, O2: 0xc8691f, K: 0x2e2622, K2: 0x45392f,
  P: 0xf2a2ac, P2: 0xd47884, N: 0xe8808e, WH: 0xfbf8f2,
};

function hash(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
const d3 = (x, y, z, c) => Math.hypot(x - c[0], y - c[1], z - c[2]);

/** Coat colour on the body at a voxel centre: white belly, bib and socks, orange (tabby-striped) and black patches. */
function coat(x, y, z) {
  if (y < 9.5 || (z > 3 && y < 15.5 && Math.abs(x) < 7)) return C.W;
  // a big black saddle over her right side and a smaller one on her left shoulder; orange over her left flank and rump
  if (d3(x, y, z, [-5.5, 18.5, -6]) < 8.2 || d3(x, y, z, [3.5, 20, 4.5]) < 3.6) return (Math.floor(x * 0.7 + z * 1.3) % 5 === 0) ? C.K2 : C.K;
  if (d3(x, y, z, [5.5, 18, -3]) < 8.4 || d3(x, y, z, [0, 20.5, -12]) < 5.4) return (Math.floor(z * 0.55 + y * 0.18) % 3 === 0) ? C.O2 : C.O;
  return C.W;
}

/** Fur tufts: some surface voxels get a neighbour sticking out (never on the underside). */
function fluff(v, k = 0.14, seed = 1, dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]]) {
  const add = [];
  v.forEach((x, y, z, c) => {
    for (const [dx, dy, dz] of dirs) {
      if (v.has(x + dx, y + dy, z + dz)) continue;
      if (hash(x, y, z, seed + dx * 3 + dy * 5 + dz * 7) < k) add.push([x + dx, y + dy, z + dz, c]);
    }
  });
  for (const [x, y, z, c] of add) v.set(x, y, z, c);
}

function bodyModel() {
  const v = new VoxelModel();
  v.jitter = 0.05;
  const B = [0, 12.5, -3], R = [9.6, 8.6, 12.6];
  for (let x = -10; x < 10; x++) for (let y = 3; y < 22; y++) for (let z = -16; z < 10; z++) {
    const cx = x + 0.5, cy = y + 0.5, cz = z + 0.5;
    // a chubby pear: fuller low at the back, a round belly sagging a touch
    const sag = cy < B[1] ? 1 + 0.12 * (1 - (cy - 3) / (B[1] - 3)) : 1;
    const rx = R[0] * sag * (cz < -6 ? 1.05 : 1);
    const q = ((cx - B[0]) / rx) ** 2 + ((cy - B[1]) / R[1]) ** 2 + ((cz - B[2]) / R[2]) ** 2;
    if (q <= 1) v.set(x, y, z, coat(cx, cy, cz));
  }
  // chest ruff: a fluffy white bib standing out in front, ragged at the bottom
  for (let x = -6; x < 6; x++) for (let y = 8; y < 18; y++) {
    let zf = -99;
    for (let z = 12; z > -2; z--) if (v.has(x, y, z)) { zf = z; break; }
    if (zf < -50) continue;
    const ragged = y < 10 + ((x + 7) % 3 === 0 ? 1 : 0);
    if (ragged) continue;
    v.set(x, y, zf + 1, C.W);
    if (y < 16 && ((x + y) % 3 !== 0)) v.set(x, y, zf + 2, (x + y) % 4 === 0 ? C.W2 : C.W);
  }
  fluff(v, 0.13, 2);
  return v;
}

function headModel() {
  const v = new VoxelModel();
  v.jitter = 0.045;
  const H = [0, 22.5, 11.5], E = [8.8, 7.2, 6.6], p = 2.6;
  // calico mask: white blaze, muzzle, chin and lower cheeks; orange on her left, black on her right
  const col = (x, y, z, cx, cy, cz) => {
    if (cy < 19.5 || (Math.abs(cx) < 1.6 && cy < 27) || (cy < 21 && Math.abs(cx) < 5)) return C.W;
    if (cx > 0) return cy > 25.5 && (x === 2 || x === 4) && cz > 9 ? C.O2 : C.O;
    return cy > 26 && x === -3 && cz < 12 ? C.K2 : C.K;
  };
  for (let x = -10; x < 10; x++) for (let y = 14; y < 31; y++) for (let z = 4; z < 18; z++) {
    const cx = x + 0.5, cy = y + 0.5, cz = z + 0.5;
    const q = Math.abs((cx - H[0]) / E[0]) ** p + Math.abs((cy - H[1]) / E[1]) ** p + Math.abs((cz - H[2]) / E[2]) ** p;
    // a flat face plate up front for the pixel eyes
    const plate = z >= 12 && Math.abs(cx) < 7.6 && cy > 19 && cy < 26.8;
    if (q > 1 && !plate) continue;
    v.set(x, y, z, col(x, y, z, cx, cy, cz));
  }
  // the muzzle: a white snout block a voxel proud of the face, and the chin under it
  for (let x = -3; x < 3; x++) for (let y = 17; y < 21; y++) if (!(y === 20 && (x === -3 || x === 2))) v.set(x, y, 18, C.W);
  for (let x = -2; x < 2; x++) v.set(x, 16, 17, C.W);
  // cheek fluff: zig-zag tufts sticking out low on both sides
  for (const s of [1, -1]) for (let y = 15; y < 21; y++) for (let z = 8; z < 16; z++) {
    const x = s > 0 ? 9 : -10;
    if (!v.has(x - s, y, z)) continue;
    if ((y + z) % 2 === 0 && y < 20) v.set(x, y, z, y < 19 ? C.W : (s > 0 ? C.O : C.K));
    if ((z % 3 === 0) && y < 18) v.set(x + s, y, z, C.W);
  }
  fluff(v, 0.08, 5, [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, -1]]);
  return v;
}

function earModel(s) {
  const v = new VoxelModel();
  v.jitter = 0.04;
  const fur = s > 0 ? C.O : C.K;
  const rows = [[-2, 2], [-2, 2], [-1, 1], [-1, 1], [0, 0]];
  rows.forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) for (let z = -1; z <= 0; z++) {
      const inner = z === 0 && y < 3 && x > a && x < b;
      v.set(x + (y > 2 ? s * 0 : 0), y, z, inner ? (y === 0 ? C.P2 : C.P) : fur);
    }
  });
  v.set(0, 0, 1, C.W); v.set(0, 1, 1, C.W2); // a white tuft in the ear
  return v;
}

function legModel(front, side) {
  const v = new VoxelModel();
  v.jitter = 0.04;
  if (front) {
    for (let x = -2; x < 2; x++) for (let y = -7; y < 0; y++) for (let z = -2; z < 2; z++) {
      const bottom = y === -7, toe = z === 1 && y <= -6 && (x === -1 || x === 1);
      v.set(x, y, z, bottom && Math.abs(x + 0.5) < 1.1 && z > -2 ? C.P : toe ? C.W2 : C.W);
    }
  } else {
    const fur = side > 0 ? C.O : C.K;
    for (let x = -3; x < 3; x++) for (let y = -4; y < 1; y++) for (let z = -3; z < 3; z++) {
      if (Math.abs(x + 0.5) > 2.2 && y < -2) continue;
      v.set(x, y, z, y > -3 && (side * (x + 0.5) > -1) ? fur : C.W);
    }
    for (let x = -2; x < 2; x++) for (let y = -7.5; y < -3; y++) for (let z = -1; z < 3; z++) {
      const bottom = y === -7.5, toe = z === 2 && y <= -6.5 && (x === -1 || x === 1);
      v.set(x, Math.floor(y), z, bottom && z > -1 && Math.abs(x + 0.5) < 1.1 ? C.P : toe ? C.W2 : C.W);
    }
  }
  return v;
}

function tailModel(i) {
  const v = new VoxelModel();
  v.jitter = 0.05;
  const r = 3.1 - i * 0.22, L = i === TAIL_N - 1 ? 5 : 4;
  for (let x = -4; x < 4; x++) for (let y = -4; y < 4; y++) for (let z = -L; z < 1; z++) {
    const cx = x + 0.5, cy = y + 0.5, cz = z + 0.5;
    const tip = i === TAIL_N - 1 ? Math.max(0.35, 1 - (-cz) / (L + 0.5)) : 1;
    if (cx * cx + cy * cy > (r * tip) ** 2) continue;
    const band = (i + Math.floor(-cz / 2.2)) % 3;
    v.set(x, y, z, i === TAIL_N - 1 && cz < -2.5 ? C.K : band === 0 ? C.K : band === 1 ? C.O : C.O2);
  }
  fluff(v, 0.22, 11 + i, [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]]);
  return v;
}

// ------------------------------------------------------------------ the face atlas
// 128 x 64 px: a white block (the body samples it), eye frames (28 x 12: both eyes) and mouth frames (12 x 8)
export const FACE_W = 128, FACE_H = 64;
export const EYE_F = { w: 28, h: 12 }, MOUTH_F = { w: 12, h: 8 };
export const EYES = {}; // name -> [x, y] (top-left px)
export const MOUTHS = {};
const PAL = { K: '#2a1a14', G: '#86c24c', Y: '#d6e06a', P: '#160e0c', W: '#ffffff', L: '#e2d2c2', B: '#f2a0aa', N: '#e57e8e', R: '#c84858', T: '#f08a98', F: '#fffaf0' };

function faceAtlas() {
  const cv = document.createElement('canvas');
  cv.width = FACE_W; cv.height = FACE_H;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 4, 4);
  const px = (x, y, ch) => { if (!PAL[ch]) return; g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); };
  const rows = (x0, y0, R) => R.forEach((row, y) => { for (let x = 0; x < row.length; x++) px(x0 + x, y0 + y, row[x]); });
  // one eye (10 x 12) drawn at ox; dx = pupil offset (looking), kind = open | wide | slit | half
  const eye = (x0, y0, kind, dx, right) => {
    const big = kind === 'wide';
    const rx = big ? 4.6 : 4.1, ry = big ? 5.6 : 4.9, cx = 5, cy = 6;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 10; x++) {
      const ex = (x + 0.5 - cx) / rx, ey = (y + 0.5 - cy) / ry, d = ex * ex + ey * ey;
      if (d > 1) continue;
      if (kind === 'half' && y + 0.5 < cy - 0.6) continue;
      const edge = d > 0.62 || (kind === 'half' && y + 0.5 < cy + 0.6);
      let ch = edge ? 'K' : y + 0.5 > cy + 1.5 ? 'Y' : 'G';
      const pdx = x + 0.5 - cx - dx, pdy = y + 0.5 - cy - 0.4;
      const pr = kind === 'wide' ? [1.25, 1.6] : kind === 'slit' ? [0.55, 3.6] : kind === 'half' ? [1.5, 2] : [2.15, 3.1];
      if (!edge && (pdx / pr[0]) ** 2 + (pdy / pr[1]) ** 2 <= 1) ch = 'P';
      px(x0 + x, y0 + y, ch);
    }
    // the shine: a 2x2 glint top-left and a dot bottom-right (same side on both eyes: one light)
    if (kind !== 'half') {
      const hx = cx - 2 + dx * 0.5 - (right ? 0 : 0), hy = kind === 'wide' ? cy - 3 : cy - 2;
      for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px(x0 + Math.round(hx) + a - 1, y0 + Math.round(hy) + b - 1, 'W');
      px(x0 + Math.round(cx + 1 + dx * 0.5), y0 + Math.round(cy + (kind === 'wide' ? 2 : 1.5)), 'W');
    }
  };
  let ex = 0, ey = 4;
  const slot = (name, draw) => {
    if (ex + EYE_F.w > FACE_W) { ex = 0; ey += EYE_F.h + 1; }
    EYES[name] = [ex, ey];
    draw(ex, ey);
    ex += EYE_F.w + 1;
  };
  for (const kind of ['open', 'wide', 'slit', 'half']) {
    for (const [lk, dx] of [['', 0], ['L', -1.2], ['R', 1.2]]) slot(kind + lk, (x, y) => { eye(x + 1, y, kind, dx, false); eye(x + 17, y, kind, dx, true); });
  }
  // closed-eye shapes (both eyes): content ^ ^ (with blush), sleepy u u, squeezed > <, a slow blink line
  const pair = (name, R, blush) => slot(name, (x, y) => {
    // her right eye sits on black fur: its lid line is drawn light
    rows(x + 1, y + 3, R.map((r) => r.replace(/K/g, 'L'))); rows(x + 17, y + 3, R.map((r) => r.split('').reverse().join('')));
    if (blush) for (const bx of [x + 1, x + 22]) { px(bx, y + 10, 'B'); px(bx + 2, y + 10, 'B'); px(bx + 4, y + 10, 'B'); }
  });
  pair('content', ['..........', '...KKKK...', '..K....K..', '.K......K.', '.K......K.'], true);
  pair('sleepy', ['..........', '..........', '.K......K.', '..KK..KK..', '....KK....'], false);
  pair('squeeze', ['.KK.......', '...KK.....', '.....KK...', '...KK.....', '.KK.......'], false);
  pair('blink', ['..........', '..........', '.KKKKKKKK.', '..........', '..........'], false);
  // mouths (12 x 8): pink nose on top, then the mouth
  let mx = 0, my = ey + EYE_F.h + 2;
  const mouth = (name, R) => { if (mx + MOUTH_F.w > FACE_W) { mx = 0; my += MOUTH_F.h + 1; } MOUTHS[name] = [mx, my]; rows(mx, my, R); mx += MOUTH_F.w + 1; };
  const nose = ['...NNNNNN...', '....NNNN....', '.....KK.....'];
  mouth('w', [...nose, '..K..KK..K..', '...KK..KK...']);
  mouth('happy', [...nose, '.K..KKKK..K.', '..KKTTTTKK..', '....TTTT....']);
  mouth('open', [...nose, '....KKKK....', '...KRRRRK...', '...KTTTTK...', '....KKKK....']);
  mouth('blep', [...nose, '..K..KK..K..', '...KKTTKK...', '.....TT.....', '.....TT.....']);
  mouth('lap', [...nose, '....KKKK....', '....KTTK....', '....TTTT....', '.....TT.....']);
  mouth('yawn', [...nose, '..KKKKKKKK..', '..KFRRRRFK..', '..KRRTTRRK..', '...KKKKKK...']);
  mouth('hiss', [...nose, '..KKKKKKKK..', '..KF.RR.FK..', '...KRRRRK...', '....KKKK....']);
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  return tex;
}

// ------------------------------------------------------------------ assembly
let ASSETS = null;
/** Shared geometry (merged, rigidly skinned) + face atlas; decals: vertex ranges to retarget per expression. */
export function catAssets() {
  if (ASSETS) return ASSETS;
  const BI = Object.fromEntries(CAT_BONES.map(([n], i) => [n, i]));
  const J = Object.fromEntries(CAT_BONES.map(([n, , p]) => [n, p]));
  const pos = [], nrm = [], col = [], uv = [], si = [], sw = [], idx = [];
  const WHITE = [2 / FACE_W, 2 / FACE_H];
  const addGeo = (g, bone, off = [0, 0, 0]) => {
    const P = g.attributes.position, Nn = g.attributes.normal, Cc = g.attributes.color, base = pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      pos.push((P.getX(i) + off[0]) * VS, (P.getY(i) + off[1]) * VS, (P.getZ(i) + off[2]) * VS);
      nrm.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i));
      if (Cc) col.push(Cc.getX(i), Cc.getY(i), Cc.getZ(i)); else col.push(1, 1, 1);
      uv.push(WHITE[0], WHITE[1]);
      si.push(BI[bone], 0, 0, 0); sw.push(1, 0, 0, 0);
    }
    const I = g.index;
    if (I) for (let i = 0; i < I.count; i++) idx.push(base + I.getX(i));
    else for (let i = 0; i < P.count; i++) idx.push(base + i);
  };
  const vox = (model, bone, off) => addGeo(meshVoxels(model, { voxelSize: 1, origin: 'none' }), bone, off);
  vox(bodyModel(), 'body');
  vox(headModel(), 'head');
  vox(earModel(1), 'earL', [J.earL[0], J.earL[1], J.earL[2]]);
  vox(earModel(-1), 'earR', [J.earR[0], J.earR[1], J.earR[2]]);
  for (const [n, f, s] of [['legFL', 1, 1], ['legFR', 1, -1], ['legBL', 0, 1], ['legBR', 0, -1]]) vox(legModel(f, s), n, J[n]);
  for (let i = 0; i < TAIL_N; i++) vox(tailModel(i), 'tail' + i, J['tail' + i]);
  // whiskers: thin pale strands fanning out of the muzzle
  for (const s of [1, -1]) for (let i = 0; i < 3; i++) {
    const g = new THREE.BoxGeometry(4.6, 0.13, 0.13);
    g.translate(s * 2.3, 0, 0);
    g.rotateZ(s * (0.18 - i * 0.18));
    g.rotateY(-s * 0.2);
    g.translate(s * 3.2, 18.8 - i * 0.7, 18.5);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(g.attributes.position.count * 3).fill(0.78), 3));
    addGeo(g, 'head');
  }
  // the face decals: eyes and mouth quads on the flat front of the head (UVs set per expression)
  const quad = (cx, cy, z, w, h) => {
    const base = pos.length / 3;
    for (const [x, y] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      pos.push((cx + x * w / 2) * VS, (cy + y * h / 2) * VS, z * VS); nrm.push(0, 0, 1); col.push(1, 1, 1); uv.push(0, 0);
      si.push(BI.head, 0, 0, 0); sw.push(1, 0, 0, 0);
    }
    idx.push(base, base + 3, base + 2, base, base + 2, base + 1);
    return base;
  };
  const eyesAt = quad(0, 23.2, 18.04, 14, 6);
  const mouthAt = quad(0, 19, 19.05, 6, 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(idx);
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  ASSETS = { geometry: geo, map: faceAtlas(), eyesAt, mouthAt };
  return ASSETS;
}

/** Point a decal quad (4 verts from `base`) at the atlas frame [x, y] of size w x h px. */
export function setFrame(uvAttr, base, [x, y], w, h) {
  const u0 = x / FACE_W, u1 = (x + w) / FACE_W, v0 = y / FACE_H, v1 = (y + h) / FACE_H;
  uvAttr.setXY(base, u0, v0); uvAttr.setXY(base + 1, u1, v0); uvAttr.setXY(base + 2, u1, v1); uvAttr.setXY(base + 3, u0, v1);
}
