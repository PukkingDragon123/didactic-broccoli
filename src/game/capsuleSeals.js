// The seals on a sealed capsule (opened in your hands: src/game/ritual.js), in the voxel look:
//   the tape   a printed paper strip round the seam that follows the voxel steps of the shell exactly (one quad per
//              voxel edge), its free end tucked under the seal; it peels away edge by edge with a flap standing out
//   the seal   a paper sticker (a red hanko ring with 封) across the seam on the front, or a red wax seal on ultra and
//              secret capsules; it cracks in stages and comes off
// dressSeals(cap, data) adds them to a capsule from makeCapsule (Capsule.js) once; data.seal (steps done) leaves off
// whatever was already opened. Textures are hand-pixelled here at 0.5 mm a texel, nearest filtered.
import * as THREE from 'three';
import { mask5, textW5 } from '../gfx/font5x7.js';
import { SERIES_BY_ID } from '../data/series/index.js';
import { activeLogo, logoCanvas } from '../logo/logo.js'; // (your own logo and name print on the seal and tape)

const N = 16; // voxels across a hi-res capsule (Capsule.js RES.hi)
const TAPE_H = 1.5; // voxels tall, centred on the seam
const LIFT = 0.07; // voxels off the shell

// ------------------------------------------------------------------ the tape's path: the voxel outline at the seam
const pathCache = new Map();
function seamEdges() {
  if (pathCache.has(N)) return pathCache.get(N);
  const R = N / 2, rr = (R + 0.15) ** 2;
  const filled = (x, z) => x >= -R && x < R && z >= -R && z < R && (x + 0.5) ** 2 + 0.25 + (z + 0.5) ** 2 <= rr;
  const edges = [];
  for (let x = -R; x < R; x++) for (let z = -R; z < R; z++) {
    if (!filled(x, z)) continue;
    // each open side is an edge [a, b] (x, z in voxels), offset outward a touch and stretched to close the corners
    if (!filled(x + 1, z)) edges.push([[x + 1 + LIFT, z - LIFT], [x + 1 + LIFT, z + 1 + LIFT]]);
    if (!filled(x - 1, z)) edges.push([[x - LIFT, z - LIFT], [x - LIFT, z + 1 + LIFT]]);
    if (!filled(x, z + 1)) edges.push([[x - LIFT, z + 1 + LIFT], [x + 1 + LIFT, z + 1 + LIFT]]);
    if (!filled(x, z - 1)) edges.push([[x - LIFT, z - LIFT], [x + 1 + LIFT, z - LIFT]]);
  }
  // in peeling order: from the front (+z, under the seal) round the way the capsule turns as you peel
  const rel = (e) => { const mx = (e[0][0] + e[1][0]) / 2, mz = (e[0][1] + e[1][1]) / 2; let a = -Math.atan2(mx, mz); if (a < 0) a += Math.PI * 2; return a; };
  edges.sort((p, q) => rel(p) - rel(q));
  // each edge runs in the peeling direction (so the flap hinges on its start)
  for (const e of edges) {
    const mx = (e[0][0] + e[1][0]) / 2, mz = (e[0][1] + e[1][1]) / 2;
    // position (sin θ, cos θ): θ grows along (z, -x); peeling runs the other way, along (-z, x)
    const t = [e[1][0] - e[0][0], e[1][1] - e[0][1]], dir = [-mz, mx];
    if (t[0] * dir[0] + t[1] * dir[1] < 0) e.reverse();
    // its outward normal
    const nl = Math.hypot(t[0], t[1]) || 1;
    let n = [t[1] / nl, -t[0] / nl];
    if (n[0] * mx + n[1] * mz < 0) n = [-n[0], -n[1]];
    e.n = n;
  }
  pathCache.set(N, edges);
  return edges;
}

// ------------------------------------------------------------------ textures
const texCache = new Map();
function canvasTex(key, w, h, paint) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  paint(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; t.generateMipmaps = true;
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
let seed = 7;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);

/** The tape: cream paper tape, the series colour in two rules, SEALED · 封 printed along it in red ink. */
function tapeTex(seriesId, len) {
  const col = SERIES_BY_ID[seriesId]?.capsule?.colors?.[0] ?? 0xff6f91;
  const W = Math.max(64, Math.round(len)), H = 12, L = activeLogo(), word = (L.named ? L.en : 'SEALED').slice(0, 16);
  return canvasTex(`tape|${seriesId}|${W}|${word}`, W, H, (g) => {
    seed = 11;
    g.fillStyle = '#f1e9d6'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < W * 2; i++) { g.fillStyle = rnd() < 0.5 ? '#e6dcc4' : '#f8f2e4'; g.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1, 1); } // paper fibre
    g.fillStyle = hex(col); g.fillRect(0, 1, W, 1); g.fillRect(0, H - 2, W, 1);
    g.fillStyle = 'rgba(40,24,20,.35)'; g.fillRect(0, 0, W, 1); g.fillRect(0, H - 1, W, 1); // the cut edges
    const ww = textW5(word) + 9;
    g.fillStyle = '#b8282c';
    for (let x = 3; x + ww < W; x += ww + 6) {
      for (const [i, j] of mask5(word)) g.fillRect(x + i, 3 + j - 1, 1, 1);
      // a little diamond between the words
      const dx = x + ww + 1; g.fillRect(dx + 1, 4, 1, 1); g.fillRect(dx, 5, 3, 1); g.fillRect(dx + 1, 6, 1, 1);
    }
  });
}

/** The seal, in 4 stages (0 whole .. 3 split along the seam): a paper sticker or a wax seal. */
function sealTex(kind, stage) {
  const W = 28, H = 34, L = activeLogo();
  return canvasTex(`seal|${kind}|${stage}|${L.custom ? L.rev : 0}`, W, H, (g) => {
    seed = 3;
    const wax = kind === 'wax';
    if (wax) {
      // a blob of red wax: a round with a lumpy rim, a pressed ring and the character in it
      const cx = 13.5, cy = 16.5;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - cx, (y - cy) * 0.95) + Math.sin(Math.atan2(y - cy, x - cx) * 7) * 0.7;
        if (d > 12.5) continue;
        g.fillStyle = d > 11.4 ? '#7a1016' : d > 10 ? '#c02a2c' : (x + y) % 7 === 0 ? '#c8383a' : '#a81c22';
        g.fillRect(x, y, 1, 1);
      }
      ring(g, cx, cy, 8.2, '#781018'); ring(g, cx, cy, 7.2, '#d84a44');
      glyph(g, '封', 6, 9, '#74101a');
      g.fillStyle = '#ff9a8c'; g.fillRect(7, 7, 2, 1); g.fillRect(6, 8, 1, 2); // a hard highlight
    } else {
      // a cream sticker with clipped corners, an ink rule, a red hanko ring with 封
      g.fillStyle = '#2a1e1c'; g.fillRect(1, 0, W - 2, H); g.fillRect(0, 1, W, H - 2);
      g.fillStyle = '#f4ecd8'; g.fillRect(1, 1, W - 2, H - 2);
      for (let i = 0; i < 70; i++) { g.fillStyle = rnd() < 0.5 ? '#e4d8bc' : '#fbf6ea'; g.fillRect(1 + Math.floor(rnd() * (W - 2)), 1 + Math.floor(rnd() * (H - 2)), 1, 1); }
      g.fillStyle = '#c9b48c'; g.fillRect(2, 2, W - 4, 1); g.fillRect(2, H - 3, W - 4, 1);
      if (L.custom) g.drawImage(logoCanvas(L, 1, 22), 3, 6); // your shop's logo
      else { ring(g, 13.5, 16.5, 10.5, '#c0282c'); ring(g, 13.5, 16.5, 9.5, '#c0282c'); glyph(g, '封', 6, 9, '#c0282c'); }
    }
    // the cracks across the seam (row 16-17), more each stage
    if (stage > 0) {
      const ink = wax ? '#3a060a' : '#2a1e1c';
      const pts = [[0, 17], [4, 16], [7, 18], [11, 16], [14, 17], [18, 15], [21, 17], [24, 16], [28, 17]];
      const upTo = stage === 1 ? 4 : stage === 2 ? 7 : pts.length - 1;
      g.fillStyle = ink;
      for (let k = 0; k < upTo; k++) {
        const [x0, y0] = pts[k], [x1, y1] = pts[k + 1];
        for (let s = 0; s <= 8; s++) g.fillRect(Math.round(x0 + (x1 - x0) * s / 8), Math.round(y0 + (y1 - y0) * s / 8), 1, 1);
      }
      if (stage >= 2) { g.fillRect(7, 19, 1, 2); g.fillRect(14, 14, 1, 2); g.fillRect(20, 18, 1, 2); } // branches
      if (stage >= 3) { g.clearRect(0, 16, W, 1); for (let x = 0; x < W; x += 3) g.clearRect(x, 17, 2, 1); } // split open
    }
  });
}
function ring(g, cx, cy, r, c) {
  g.fillStyle = c;
  const n = Math.round(r * 7);
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.fillRect(Math.round(cx + Math.cos(a) * r - 0.5), Math.round(cy + Math.sin(a) * r - 0.5), 1, 1); }
}
/** One DotGothic16 character as hard texels. */
function glyph(g, ch, x, y, col) {
  const t = document.createElement('canvas'); t.width = t.height = 18;
  const tg = t.getContext('2d', { willReadFrequently: true });
  tg.font = '16px "DotGothic16"'; tg.textBaseline = 'top'; tg.fillStyle = '#000'; tg.fillText(ch, 0, 0);
  const d = tg.getImageData(0, 0, 18, 18).data;
  g.fillStyle = col;
  for (let j = 0; j < 18; j++) for (let i = 0; i < 18; i++) if (d[(j * 18 + i) * 4 + 3] > 110) g.fillRect(x + i, y + j, 1, 1);
}

// ------------------------------------------------------------------ the parts
const mat = (map) => new THREE.MeshStandardMaterial({ map, roughness: 0.85, metalness: 0, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

/** Which seal a capsule has. */
export const sealKind = (data) => (data?.rarity === 'ultra' || data?.rarity === 'secret' ? 'wax' : 'sticker');

/**
 * Add the tape and the seal to a capsule (once). cap.seals = { tape, flap, seal, setPeel(p), setCrack(p), edges }.
 * stepsDone: 0 everything on, 1 the seal is off, 2 the tape is off too.
 */
export function dressSeals(cap, data, stepsDone = data?.seal || 0) {
  if (cap.seals || !cap.group || !cap.paper) return cap.seals; // (hi-res capsules with their contents only)
  const vs = (2 * cap.r) / N;
  const edges = seamEdges();
  // the tape: one outward quad an edge, u running along it
  let total = 0;
  const lens = edges.map((e) => { const l = Math.hypot(e[1][0] - e[0][0], e[1][1] - e[0][1]); total += l; return l; });
  const pos = [], uv = [], nrm = [];
  const y0 = -TAPE_H / 2 * vs, y1 = TAPE_H / 2 * vs;
  let acc = 0;
  edges.forEach((e, i) => {
    const [a, b] = e, u0 = acc / total, u1 = (acc + lens[i]) / total;
    acc += lens[i];
    const ax = a[0] * vs, az = a[1] * vs, bx = b[0] * vs, bz = b[1] * vs;
    const quad = [[ax, y0, az, u0, 0], [bx, y0, bz, u1, 0], [bx, y1, bz, u1, 1], [ax, y0, az, u0, 0], [bx, y1, bz, u1, 1], [ax, y1, az, u0, 1]];
    for (const q of quad) { pos.push(q[0], q[1], q[2]); uv.push(q[3], q[4]); nrm.push(e.n[0], 0, e.n[1]); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const tmap = tapeTex(data?.series, total * vs / 0.0005);
  const tape = new THREE.Mesh(geo, mat(tmap));
  tape.material.side = THREE.DoubleSide;
  tape.castShadow = false; tape.receiveShadow = true;
  // the flap: the peeled end standing out from the shell, hinged where the tape is still stuck
  const fl = 2.2 * vs;
  const fgeo = new THREE.PlaneGeometry(fl, TAPE_H * vs);
  fgeo.translate(fl / 2, 0, 0);
  const flapMap = tmap.clone(); flapMap.needsUpdate = true; flapMap.repeat.set(fl / (total * vs), 1);
  const flap = new THREE.Mesh(fgeo, mat(flapMap));
  flap.material.side = THREE.DoubleSide;
  // the seal on the front, across the seam
  const kind = sealKind(data);
  const sw = (kind === 'wax' ? 6.6 : 6.2) * vs * 0.68, sh = sw * 34 / 28;
  const seal = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), mat(sealTex(kind, 0)));
  seal.position.set(0, 0, cap.r + (LIFT + 0.12) * vs);
  seal.userData.kind = kind;
  const layers = cap.group.children[0]?.children?.[0]?.layers?.mask ?? cap.top.children[0]?.layers?.mask;
  for (const m of [tape, flap, seal]) { if (layers != null) m.layers.mask = layers; m.userData.noOutline = true; cap.group.add(m); }
  const S = cap.seals = { tape, flap, seal, edges, kind, total, vs, crackStage: 0 };
  /** p 0..1: how much of the tape has come away. */
  S.setPeel = (p) => {
    const M = edges.length, k = Math.min(M, Math.floor(p * M + 1e-6));
    geo.setDrawRange(k * 6, (M - k) * 6);
    tape.visible = k < M && !S.tapeGone;
    // the flap hangs off the edge the tape is stuck to
    const e = edges[Math.min(M - 1, k)], f = p * M - k;
    const ax = e[0][0] * vs, az = e[0][1] * vs, bx = e[1][0] * vs, bz = e[1][1] * vs;
    flap.position.set(ax + (bx - ax) * f, 0, az + (bz - az) * f);
    // it points back the way the tape has come away, tilted out from the shell
    const l = Math.hypot(bx - ax, bz - az) || 1, b = 0.5 + Math.min(1, p * 4) * 0.45;
    const dx = -(bx - ax) / l * Math.cos(b) + e.n[0] * Math.sin(b), dz = -(bz - az) / l * Math.cos(b) + e.n[1] * Math.sin(b);
    flap.rotation.set(0, Math.atan2(-dz, dx), 0);
    flap.visible = tape.visible && (p > 0 || S.sealGone);
    flap.material.map.offset.x = (k + f) / M - flap.material.map.repeat.x;
  };
  /** p 0..1 through cracking: the seal's crack stage. */
  S.setCrack = (p) => {
    const st = p >= 1 ? 3 : Math.min(2, Math.floor(p * 3 + 0.34));
    if (st !== S.crackStage) { S.crackStage = st; seal.material.map = sealTex(kind, st); seal.material.needsUpdate = true; }
  };
  if (stepsDone >= 1) { seal.visible = false; S.sealGone = true; }
  if (stepsDone >= 2) { S.tapeGone = true; tape.visible = flap.visible = false; }
  S.setPeel(0);
  return S;
}
