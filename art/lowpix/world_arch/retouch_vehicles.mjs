// Repaint a converted vehicle (art/lowpix/world_arch/_src/vehicles.py, `lowpix convert --style pixel-hd`) in the house
// style, in its build dir, before pack.mjs: the source model's flat colours only tell what each texel is (body paint,
// glass, rubber, steel, lamps, a maker's script); every texel is then painted again from its place on the model (each
// triangle rasterised in uv space with its world position and normal): car paint with brush dabs, sun fade on the top
// faces, panel gaps, road grime and dried drips low down, rust blistering round the wheel arches and along the sills;
// glass with the sky and the street reflected and the cab's seats behind it; tyres with tread blocks; galvanised and
// chrome steel; the lamps kept. Every maker's badge and script is painted over with the body colour (no real brand).
//   node art/lowpix/world_arch/retouch_vehicles.mjs <buildDir> <id> <outId> <paintHex> [seed]
// writes <buildDir>/<outId>/<outId>.glb (+ _texture.png); then: node art/lowpix/world_arch/pack.mjs <buildDir> <outId>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { mkdirSync, copyFileSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [buildDir, id, outId = id, paintHex = 'e6e2d4', seedArg = '1'] = process.argv.slice(2);
const SEED = +seedArg;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(join(buildDir, id, id + '.glb'));
const root = doc.getRoot();

// ------------------------------------------------------------------ geometry in model space (metres after fit)
const spec = JSON.parse(readFileSync(join(import.meta.dirname, id + '.json'), 'utf8'));
const tris = [];
let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const M = node.getWorldMatrix();
  const tf = (v) => [M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12], M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13], M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14]];
  for (const p of mesh.listPrimitives()) {
    const P = p.getAttribute('POSITION'), UV = p.getAttribute('TEXCOORD_0'), I = p.getIndices();
    if (!UV) continue;
    const n = I ? I.getCount() : P.getCount(), v = [0, 0, 0], t = [0, 0];
    for (let k = 0; k < n; k += 3) {
      const tri = [];
      for (let j = 0; j < 3; j++) {
        const i = I ? I.getScalar(k + j) : k + j;
        P.getElement(i, v); UV.getElement(i, t);
        const w = tf(v);
        for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], w[a]); hi[a] = Math.max(hi[a], w[a]); }
        tri.push({ p: w, uv: [t[0], t[1]] });
      }
      tris.push(tri);
    }
  }
}
const S = spec.game.fit.h / (hi[1] - lo[1]); // metres per model unit
const ry = (spec.game.fit.ry || 0) * Math.PI / 180, cr = Math.cos(ry), sr = Math.sin(ry);
const cx0 = (lo[0] + hi[0]) / 2, cz0 = (lo[2] + hi[2]) / 2;
const toM = (w) => { const x = (w[0] - cx0) * S, z = (w[2] - cz0) * S; return [x * cr + z * sr, (w[1] - lo[1]) * S, -x * sr + z * cr]; };
for (const tri of tris) for (const v of tri) v.m = toM(v.p);
// the cab: where the roof is (the top 15 %), and the wheels (the lowest dark rings)
let cab = [1e9, -1e9], zl = 1e9, zh = -1e9, xw = 0;
for (const tri of tris) for (const v of tri) {
  zl = Math.min(zl, v.m[2]); zh = Math.max(zh, v.m[2]); xw = Math.max(xw, Math.abs(v.m[0]));
  if (v.m[1] > spec.game.fit.h * 0.85) { cab[0] = Math.min(cab[0], v.m[2]); cab[1] = Math.max(cab[1], v.m[2]); }
}
if (process.argv.includes('--inspect')) { console.log(JSON.stringify({ tris: tris.length, S, cab, z: [zl, zh], xw })); process.exit(0); }

// ------------------------------------------------------------------ the texture
const tex = root.listTextures()[0];
const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, Hh = info.height, src = new Uint8ClampedArray(data), out = new Uint8ClampedArray(data);

const hex = (h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const hashI = (a, b) => { let h = (a * 374761393 + b * 668265263 + SEED * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (i, j, t) => (B4[(j & 3) * 4 + (i & 3)] + 0.5) / 16 < t;
const smooth = (x, y, z) => Math.sin(x * 2.3 + Math.sin(z * 1.7) * 1.4) * 0.5 + Math.sin(z * 3.1 + y * 2.0 + 1.7) * 0.5; // big soft patches

const PAINT = hex(paintHex), DIRT = [92, 78, 62], RUST = [[74, 44, 30], [112, 66, 42], [150, 96, 62]];
/** Smooth value noise on a unit grid (bilinear between hashed corners): organic blots, never per-pixel speckle. */
function vnoise(a, b) {
  const a0 = Math.floor(a), b0 = Math.floor(b), fa = a - a0, fb = b - b0, sa = fa * fa * (3 - 2 * fa), sb = fb * fb * (3 - 2 * fb);
  const h = (p, q) => hashI(p + 1000, q + 1000);
  return (h(a0, b0) * (1 - sa) + h(a0 + 1, b0) * sa) * (1 - sb) + (h(a0, b0 + 1) * (1 - sa) + h(a0 + 1, b0 + 1) * sa) * sb;
}
const SKY = [168, 190, 204], STREET = [52, 56, 60], INSIDE = [34, 36, 40], SEAT = [74, 70, 66];
const RUBBER = [34, 34, 37], STEEL = [150, 154, 156], CHROME = [196, 202, 206], BLACKSTEEL = [44, 46, 50];
const wheelZ = [];
// wheel centres along z: the two clusters of low dark texels nearest each end (filled in below from the rings)
const lowDark = [];

function cls(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), lum = (r + g + b) / 3;
  if (r > 170 && g < 110 && b < 90) return 'red';
  if (r > 200 && g >= 110 && g < 190 && b < 110) return 'amber';
  if (mx - mn > 60 && lum > 90) return 'colour';
  if (lum < 150) return 'dark';
  if (lum < 190) return 'mid';
  return 'light';
}

// pass 1: find the wheels from the low dark texels
for (const tri of tris) {
  const c = tri.map((v) => v.m);
  const yc = (c[0][1] + c[1][1] + c[2][1]) / 3;
  if (yc > 0.62) continue;
  const u = tri.map((v) => v.uv), px = Math.min(W - 1, Math.max(0, Math.floor((u[0][0] + u[1][0] + u[2][0]) / 3 * W))), py = Math.min(Hh - 1, Math.max(0, Math.floor((u[0][1] + u[1][1] + u[2][1]) / 3 * Hh)));
  const o = (py * W + px) * 4;
  if (cls(src[o], src[o + 1], src[o + 2]) === 'dark' && Math.abs((c[0][0] + c[1][0] + c[2][0]) / 3) > xw * 0.55) lowDark.push((c[0][2] + c[1][2] + c[2][2]) / 3);
}
lowDark.sort((a, b) => a - b);
const mid = (zl + zh) / 2;
const front = lowDark.filter((z) => z > mid), rear = lowDark.filter((z) => z < mid);
const med = (a) => (a.length ? a[Math.floor(a.length / 2)] : null);
if (med(front) !== null) wheelZ.push(med(front));
if (med(rear) !== null) wheelZ.push(med(rear));
const WR = 0.29, WY = WR; // kei wheel radius
const nearWheel = (m) => wheelZ.some((z) => Math.hypot(m[2] - z, m[1] - WY) < WR + 0.06) && m[1] < 0.66;
const archDist = (m) => Math.min(...wheelZ.map((z) => Math.hypot(m[2] - z, m[1] - WY)));

/** The new colour of one texel. */
function paint(i, j, m, n, c0) {
  const [x, y, z] = m;
  let k = cls(c0[0], c0[1], c0[2]);
  const inCab = z > cab[0] - 0.05 && z < cab[1] + 0.05;
  // a maker's script or badge on a panel: paint it out with the body colour
  if ((k === 'red' || k === 'colour') && y > 0.5) k = 'light';
  if (k === 'amber' && y > 0.55 && !(z > zh - 0.12 || z < zl + 0.12)) k = 'light';
  const lum = (c0[0] + c0[1] + c0[2]) / 3;
  // the maker's script across the tailgate and any badge on the nose: plain paint, no lines left
  const badge = (n[2] < -0.6 && y > 0.36 && Math.abs(x) < xw * 0.8) || (n[2] > 0.6 && y > 0.42 && y < 0.95 && Math.abs(x) < 0.4 && k !== 'dark');
  if (badge && k !== 'dark' && !(k === 'red' || k === 'amber')) k = 'plain';
  const ad0 = archDist(m);
  if (ad0 > WR - 0.03 && ad0 < WR + 0.07 && y < 0.62 && k !== 'dark') return mix(BLACKSTEEL, DIRT, 0.35); // arch liners, mud-caked
  if (nearWheel(m) && Math.abs(x) > xw * 0.5) {
    // tyre and wheel
    const ang = Math.atan2(y - WY, z - wheelZ.reduce((a, b) => (Math.abs(b - z) < Math.abs(a - z) ? b : a)));
    if (k === 'dark') {
      const tread = Math.abs(n[0]) < 0.55;
      let col = tread ? ((Math.floor((ang + Math.PI) / (Math.PI / 18)) % 2) ? RUBBER : mul(RUBBER, 1.3)) : mul(RUBBER, 1.12);
      if (y < 0.06) col = mix(col, DIRT, 0.4);
      return col;
    }
    return mix(STEEL, CHROME, Math.max(0, n[1]) * 0.5); // the steel wheel and its cap
  }
  if (k === 'red' || k === 'amber' || k === 'colour') return c0; // the lamps
  if (k === 'dark') {
    if (y > 0.92 && inCab && Math.abs(n[1]) < 0.75) {
      // glass: the street reflected low, the sky high, two slanted streaks; the seat backs and the dash behind
      const t = Math.min(1, Math.max(0, (y - 0.95) / 0.55));
      let col = mix(STREET, SKY, t * t * 0.9 + 0.08);
      if (((x * 0.7 + z * 0.9 + y * 1.4) % 0.9 + 0.9) % 0.9 < 0.08) col = mix(col, [228, 236, 240], 0.55);
      if (t < 0.35 && Math.abs(n[0]) > 0.6) col = mix(col, t < 0.18 ? INSIDE : SEAT, 0.55);
      return col;
    }
    if (y < 0.6) return mix(BLACKSTEEL, DIRT, y < 0.25 ? 0.35 : 0.12); // bumpers, valances, the chassis
    return lum < 70 ? mul(BLACKSTEEL, 0.8) : BLACKSTEEL; // rubber seals, the headboard guard, the mirrors
  }
  if (k === 'mid' && (y < 0.6 || !inCab && y < 0.95)) {
    // galvanised and painted steel: the bed's ribs and hinges, the bumper
    let col = mix(STEEL, CHROME, Math.max(0, n[1]) * 0.6);
    if (hashI(i >> 2, j >> 2) < 0.06) col = mix(col, RUST[1], 0.6);
    return col;
  }
  // ---- body paint
  let col = PAINT.slice();
  // painted light: top faces lighter, under faces darker (the game light does the rest)
  col = mul(col, 0.9 + 0.12 * n[1] + 0.04 * n[2]);
  // panel gaps and pressed lines the source draws as dark lines (not on a painted-out badge)
  if (k !== 'plain' && (k === 'mid' || lum < 176)) col = mul(col, 0.62);
  // brush dabs along each row
  const seg = Math.floor((i + Math.floor(hashI(j, 7) * 9)) / (4 + Math.floor(hashI(j, 3) * 6))), sv = hashI(seg, j);
  if (sv < 0.13) col = mul(col, 0.9); else if (sv > 0.89) col = mix(col, [255, 252, 244], 0.18);
  // sun fade on the faces that see the sky: chalky, a little greyer
  const f = Math.min(1, Math.max(0, (smooth(x * 1.3, y * 1.3, z * 1.3) - 0.25) / 0.3)) * Math.max(0, n[1] * 0.8 + 0.3);
  if (f > 0 && dith(i, j, f)) col = mix(col, [214, 210, 198], 0.22);
  // road grime and dried drips up from the sills
  if (y < 0.5) { const g = 1 - y / 0.5; if (dith(i + 2, j + 1, g * 0.8)) col = mix(col, DIRT, 0.5); }
  if (hashI(i >> 1, 11) < 0.08 && y < 0.5 + hashI(i >> 1, 12) * 0.5 && n[1] < 0.3) col = mix(col, DIRT, 0.3);
  // rust: blisters creeping out of the wheel-arch lips in a ragged band, a few runs and freckles beyond it
  const ad = archDist(m);
  if (ad > WR + 0.05 && ad < WR + 0.13 && y > 0.12) {
    const edge = (ad - WR - 0.05) / 0.08, blot = vnoise(y / 0.035, z / 0.035);
    if (blot > 0.45 + edge * 0.5) col = mix(col, edge < 0.3 ? RUST[0] : RUST[1], 0.7);
    else if (edge > 0.5 && hashI(Math.floor(i / 2), Math.floor(j / 2)) < 0.02) col = mix(col, RUST[1], 0.6);
  }
  if (y < 0.34 && y > 0.2 && Math.abs(n[1]) < 0.5) { const blot = vnoise(z / 0.05 + 7, y / 0.03); if (blot > 0.8) col = mix(col, RUST[blot > 0.9 ? 0 : 1], 0.65); }
  // the bed floor: pressed ribs along the load, scuffed through to bare metal on their tops, rust in the troughs
  if (!inCab && z < cab[0] - 0.1 && n[1] > 0.7 && y < 1.0) {
    const rib = ((x + 2) / 0.12) % 1;
    if (rib < 0.18) col = mul(col, 0.7); else if (rib > 0.82) col = mix(col, [250, 248, 240], 0.25);
    if (rib < 0.18 && vnoise(z / 0.08, x / 0.12) > 0.72) col = mix(col, RUST[1], 0.7);
    if (rib > 0.82 && hashI(Math.floor(i / 5), j) < 0.2) col = mix(col, STEEL, 0.65);
  }
  return col;
}

// pass 2: rasterise every triangle in uv space
const done = new Uint8Array(W * Hh);
for (const tri of tris) {
  const P = tri.map((v) => [v.uv[0] * W - 0.5, v.uv[1] * Hh - 0.5]), m = tri.map((v) => v.m);
  const e1 = [m[1][0] - m[0][0], m[1][1] - m[0][1], m[1][2] - m[0][2]], e2 = [m[2][0] - m[0][0], m[2][1] - m[0][1], m[2][2] - m[0][2]];
  let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const nl = Math.hypot(...n) || 1; n = n.map((a) => a / nl);
  const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
  const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(Hh - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
  const d = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]);
  if (Math.abs(d) < 1e-9) continue;
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    let a = ((P[1][1] - P[2][1]) * (px - P[2][0]) + (P[2][0] - P[1][0]) * (py - P[2][1])) / d;
    let b = ((P[2][1] - P[0][1]) * (px - P[2][0]) + (P[0][0] - P[2][0]) * (py - P[2][1])) / d;
    let c = 1 - a - b;
    const eps = -0.6 / Math.max(1, Math.min(x1 - x0, y1 - y0)); // a texel of slack round the edges (no unpainted seams)
    if (a < eps || b < eps || c < eps) continue;
    a = Math.max(0, a); b = Math.max(0, b); c = Math.max(0, c);
    const s = a + b + c; a /= s; b /= s; c /= s;
    const o = py * W + px;
    if (done[o]) continue;
    done[o] = 1;
    const w = [0, 1, 2].map((k) => m[0][k] * a + m[1][k] * b + m[2][k] * c);
    const col = paint(px, py, w, n, [src[o * 4], src[o * 4 + 1], src[o * 4 + 2]]);
    out[o * 4] = col[0]; out[o * 4 + 1] = col[1]; out[o * 4 + 2] = col[2];
  }
}
// each triangle has its own island (the other half of its rectangle is unused): grow the paint over those texels so
// the mips never pull the old colours in
for (let pass = 0; pass < 12; pass++) {
  const add = [];
  for (let py = 0; py < Hh; py++) for (let px = 0; px < W; px++) {
    const o = py * W + px;
    if (done[o]) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = px + dx, Y = py + dy;
      if (X < 0 || Y < 0 || X >= W || Y >= Hh || done[Y * W + X] !== 1) continue;
      add.push([o, Y * W + X]); break;
    }
  }
  if (!add.length) break;
  for (const [o, q] of add) { out[o * 4] = out[q * 4]; out[o * 4 + 1] = out[q * 4 + 1]; out[o * 4 + 2] = out[q * 4 + 2]; done[o] = 2; }
  for (const [o] of add) done[o] = 1;
}
const png = await sharp(Buffer.from(out.buffer), { raw: { width: W, height: Hh, channels: 4 } }).png().toBuffer();
tex.setImage(png);
mkdirSync(join(buildDir, outId), { recursive: true });
await io.write(join(buildDir, outId, outId + '.glb'), doc);
writeFileSync(join(buildDir, outId, outId + '_texture.png'), png);
// the source model's attribution travels with the repaint (pack.mjs writes the credit from it)
const srcDir = join(buildDir, id, '_source');
if (outId !== id && existsSync(srcDir)) for (const d of readdirSync(srcDir)) {
  const f = join(srcDir, d, 'ATTRIBUTION.json');
  if (existsSync(f)) { mkdirSync(join(buildDir, outId, '_source', d), { recursive: true }); copyFileSync(f, join(buildDir, outId, '_source', d, 'ATTRIBUTION.json')); }
}
const specOut = join(import.meta.dirname, outId + '.json');
if (outId !== id && !existsSync(specOut)) copyFileSync(join(import.meta.dirname, id + '.json'), specOut);
console.log('repainted', outId, 'paint #' + paintHex, 'tris', tris.length, 'wheels at z', wheelZ.map((z) => z.toFixed(2)).join(', '), 'cab z', cab.map((z) => z.toFixed(2)).join('..'));
