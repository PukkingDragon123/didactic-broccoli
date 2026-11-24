// Import a hand-made CC BY / CC0 vehicle (Sketchfab, tools/ai-check.py OK, no scans) keeping its materials: real
// glass, chrome, rubber, the cab interior. Its geometry is welded and simplified into the vehicle budget, turned to
// face +z and scaled to its real size (bottom centre at the origin); every texture is restyled to the house pixel art
// (resampled to about 256 px per metre of the model and posterised to a palette, nearest-filtered in the game);
// badges and plates are painted out by rectangles given per model (retouch: { image: [[x0, y0, x1, y1, '#rrggbb'], ...]
// in 0..1 of the image }), the game hangs its own pixel-font plates (src/world/carModels.js).
//   node art/lowpix/world_arch/import_vehicle.mjs <vehicles.json id>
// Reads art/lowpix/world_arch/vehicles.json: { id: { src (scene.gltf), name, len (metres, front to back), ry (deg),
// tris, paint?: { material: '#hex' }, drop?: [material names], retouch?: {...} } }; writes
// public/models/lowpix/world_arch/<id>.glb, its manifest entry (credit from the source's ATTRIBUTION.json), and
// regenerates src/kit/lowpixArch.js + the credits through pack.mjs's tables (node pack.mjs <dir> with no ids).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { flatten, join, weld, simplify, prune, dedup, quantize, reorder, transformMesh, clearNodeTransform, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join as pjoin, dirname, resolve } from 'node:path';
import { webpTextures } from '../../../tools/webp-glb.mjs';

const ROOT = resolve(import.meta.dirname, '../../..');
const OUT = resolve(ROOT, 'public/models/lowpix/world_arch');
const id = process.argv[2];
const CFG = JSON.parse(readFileSync(pjoin(import.meta.dirname, 'vehicles.json'), 'utf8'))[id];
if (!CFG) throw new Error('no vehicles.json entry for ' + id);
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const src = resolve(ROOT, CFG.src);
const doc = await io.read(src);
const root = doc.getRoot();
for (const a of root.listAnimations()) a.dispose();
for (const s of root.listSkins()) s.dispose();

// drop what the lane must not show (e.g. a shadow plane, a roof sign of the wrong company)
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if ((CFG.drop || []).includes(p.getMaterial()?.getName())) p.dispose();

// paint colours: a material's base colour factor (the texture's shading stays). Set before anything is merged, so
// a repainted material keeps its own identity (dedup would fold it into its look-alikes)
for (const m of root.listMaterials()) {
  const want = CFG.paint?.[m.getName()];
  if (want) m.setBaseColorFactor([...[1, 3, 5].map((i) => (parseInt(want.slice(i, i + 2), 16) / 255) ** 2.2), 1]);
}
// bake every node's transform into its mesh (flatten puts each node under the scene with its world transform;
// clearNodeTransform then bakes that into the mesh, cloning meshes shared by several nodes)
await doc.transform(flatten());
for (const node of root.listNodes()) clearNodeTransform(node);
// a model authored z-up (no root turn in its file) is stood up first
if (CFG.up === 'z') for (const m of root.listMeshes()) transformMesh(m, [1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1]);
// fit: turned to face +z, scaled to its real length, bottom centre at the origin
const scene = root.listScenes()[0];
let b = getBounds(scene);
const lenAxis = (b.max[2] - b.min[2]) >= (b.max[0] - b.min[0]) ? 2 : 0;
const k = CFG.len / (b.max[lenAxis] - b.min[lenAxis]);
const a = (CFG.ry || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
// matrix (column-major): translate to centre, scale, turn about y, lift to the ground
const T = [k * c, 0, -k * s, 0, 0, k, 0, 0, k * s, 0, k * c, 0, 0, 0, 0, 1];
const tx = -cx * k, tz = -cz * k, ty = -b.min[1] * k;
T[12] = tx * c + tz * s; T[13] = ty; T[14] = -tx * s + tz * c;
for (const m of root.listMeshes()) transformMesh(m, T);

if (process.env.DEBUG) {
  const by = new Map();
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    const P = p.getAttribute('POSITION'), v = [0, 0, 0], k2 = p.getMaterial()?.getName() || '?';
    const e = by.get(k2) || { lo: [1e9, 1e9, 1e9], hi: [-1e9, -1e9, -1e9], n: 0 };
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); for (let q = 0; q < 3; q++) { e.lo[q] = Math.min(e.lo[q], v[q]); e.hi[q] = Math.max(e.hi[q], v[q]); } }
    e.n += (p.getIndices()?.getCount() || P.getCount()) / 3; by.set(k2, e);
  }
  for (const [k2, e] of by) console.log('  ', k2.padEnd(22), String(Math.round(e.n)).padStart(6), e.lo.map((x) => x.toFixed(2)).join(','), '..', e.hi.map((x) => x.toFixed(2)).join(','));
}
// cut: drop a material's triangles inside boxes (metres, after the fit): a maker's emblem modelled into a grille
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  const nm = p.getMaterial()?.getName();
  const boxes = CFG.cut?.[nm] || (CFG.cutAll && !(CFG.cutKeep || []).includes(nm) ? CFG.cutAll : null);
  const I = p.getIndices();
  if (!boxes || !I) continue;
  const P = p.getAttribute('POSITION'), v = [0, 0, 0], keep = [];
  for (let t = 0; t < I.getCount(); t += 3) {
    const c = [0, 0, 0];
    for (let j = 0; j < 3; j++) { P.getElement(I.getScalar(t + j), v); for (let q = 0; q < 3; q++) c[q] += v[q] / 3; }
    if (boxes.some(([x0, y0, z0, x1, y1, z1]) => c[0] > x0 && c[0] < x1 && c[1] > y0 && c[1] < y1 && c[2] > z0 && c[2] < z1)) continue;
    keep.push(I.getScalar(t), I.getScalar(t + 1), I.getScalar(t + 2));
  }
  I.setArray(P.getCount() > 65535 ? new Uint32Array(keep) : new Uint16Array(keep));
}
// one primitive per material, welded and simplified into the budget (the silhouette and seams kept)
await doc.transform(join(), weld(), dedup());
const count = () => root.listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((q, p) => q + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
const tris0 = count();
if (tris0 > CFG.tris) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: CFG.tris / tris0, error: CFG.err ?? 0.002, lockBorder: !CFG.err }));
await doc.transform(prune());

// ---- textures: restyled to the house pixel art (the lowpix standard), from the model's own geometry ----
// every colour texture is resampled to 256 px per metre of the surface it covers (measured from the uv and world
// areas of its triangles), posterised to a small palette with no dithering (clean even paint, hard steps), and gets
// light painted wear where the model really has it: road grime up from the sills, mud round the wheel arches, a
// worn lighter lip on the edges of the panels (the uv island borders). Normal and metal/roughness maps are dropped:
// the painted texture carries the detail, as on every lowpix model.
b = getBounds(scene);
const wheelC = [];
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  if (!/wheel|tire|tyre/i.test(p.getMaterial()?.getName() || '')) continue;
  const P = p.getAttribute('POSITION'), v = [0, 0, 0];
  for (let i = 0; i < P.getCount(); i += 7) { P.getElement(i, v); wheelC.push([v[0], v[1], v[2]]); }
}
// the wheel centres: the four quadrants of the wheel vertices
const wheels = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const q = wheelC.filter((w) => Math.sign(w[0]) === sx && Math.sign(w[2]) === sz);
  if (q.length) wheels.push([0, 1, 2].map((k) => q.reduce((t, w) => t + w[k], 0) / q.length));
}
const WR = wheels.length ? Math.max(0.2, Math.min(0.45, wheels[0][1])) : 0.3;
const byTex = new Map();
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  const mat = p.getMaterial(), t = mat?.getBaseColorTexture();
  if (!t) continue;
  const P = p.getAttribute('POSITION'), UV = p.getAttribute('TEXCOORD_0'), I = p.getIndices();
  if (!UV || !I) continue;
  const L = byTex.get(t) || { tris: [], mats: new Set() };
  L.mats.add(mat.getName());
  const v = [0, 0, 0], u = [0, 0];
  for (let k = 0; k < I.getCount(); k += 3) {
    const tri = [];
    for (let j = 0; j < 3; j++) { const i = I.getScalar(k + j); P.getElement(i, v); UV.getElement(i, u); tri.push({ p: [v[0], v[1], v[2]], uv: [u[0], u[1]] }); }
    L.tris.push(tri);
  }
  byTex.set(t, L);
}
const area3 = (a, b2, c) => { const e1 = [b2[0] - a[0], b2[1] - a[1], b2[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]; return Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2; };
const area2 = (a, b2, c) => Math.abs((b2[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b2[1] - a[1])) / 2;
const frac = (x) => x - Math.floor(x);
for (const m of root.listMaterials()) {
  for (const t of [m.getNormalTexture(), m.getMetallicRoughnessTexture(), m.getOcclusionTexture()]) if (t) t.dispose();
  m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null);
}
for (const tex of root.listTextures()) {
  const img = tex.getImage();
  if (!img) continue;
  const L = byTex.get(tex);
  const meta = await sharp(Buffer.from(img)).metadata();
  // 256 px per metre of the surface this texture covers
  let uvA = 0, wA = 0;
  for (const tri of L?.tris || []) { uvA += area2(...tri.map((v) => [frac(v.uv[0]), frac(v.uv[1])])); wA += area3(...tri.map((v) => v.p)); }
  const want = wA > 0 && uvA > 0 ? 256 * Math.sqrt(wA / uvA) : Math.max(meta.width, meta.height); // texture size giving 256 px/m
  const size = Math.max(64, Math.min(2048, 2 ** Math.round(Math.log2(Math.min(want, Math.max(meta.width, meta.height) * 2)))));
  const raw = await sharp(Buffer.from(img)).resize(size, size, { fit: 'fill', kernel: size < meta.width ? 'lanczos3' : 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8ClampedArray(raw.data), W = raw.info.width, H = raw.info.height;
  const mats = [...(L?.mats || [])];
  // badges and plates painted out (rectangles in 0..1 of the image): a colour, 'auto' (the panel round it) or
  // 'slats' (the dark horizontal slats of a grille)
  for (const [x0, y0, x1, y1, col] of mats.flatMap((n) => CFG.retouch?.[n] || [])) {
    const X0 = Math.max(0, Math.floor(x0 * W)), X1 = Math.min(W - 1, Math.ceil(x1 * W)), Y0 = Math.max(0, Math.floor(y0 * H)), Y1 = Math.min(H - 1, Math.ceil(y1 * H));
    let rgb = /^#/.test(col) ? [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16)) : null;
    if (col === 'auto') {
      const acc = [0, 0, 0]; let n = 0;
      for (let y = Math.max(0, Y0 - 2); y <= Math.min(H - 1, Y1 + 2); y++) for (let x = Math.max(0, X0 - 2); x <= Math.min(W - 1, X1 + 2); x++) {
        if (x >= X0 && x <= X1 && y >= Y0 && y <= Y1) continue;
        const o = (y * W + x) * 4; acc[0] += px[o]; acc[1] += px[o + 1]; acc[2] += px[o + 2]; n++;
      }
      rgb = acc.map((v) => v / Math.max(1, n));
    }
    for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
      const o = (y * W + x) * 4;
      const c = col === 'slats' ? ((Math.floor((y - Y0) / Math.max(2, (Y1 - Y0) / 7)) % 2) ? [34, 36, 40] : (y - Y0) % Math.max(2, Math.round((Y1 - Y0) / 7)) === 0 ? [150, 154, 158] : [96, 100, 104]) : rgb;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
  // painted wear from the geometry: rasterise every triangle in uv space with its world position
  const done = new Uint8Array(W * H);
  const isWheel = mats.some((n) => /wheel|tire|tyre|rim|hub/i.test(n));
  for (const tri of (isWheel ? [] : L?.tris || [])) {
    const P2 = tri.map((v) => [frac(v.uv[0]) * W - 0.5, frac(v.uv[1]) * H - 0.5]), w3 = tri.map((v) => v.p);
    const d = (P2[1][1] - P2[2][1]) * (P2[0][0] - P2[2][0]) + (P2[2][0] - P2[1][0]) * (P2[0][1] - P2[2][1]);
    if (Math.abs(d) < 1e-6) continue;
    const xa = Math.max(0, Math.floor(Math.min(P2[0][0], P2[1][0], P2[2][0]))), xb = Math.min(W - 1, Math.ceil(Math.max(P2[0][0], P2[1][0], P2[2][0])));
    const ya = Math.max(0, Math.floor(Math.min(P2[0][1], P2[1][1], P2[2][1]))), yb = Math.min(H - 1, Math.ceil(Math.max(P2[0][1], P2[1][1], P2[2][1])));
    if ((xb - xa) * (yb - ya) > W * H * 0.25) continue; // wrapped / tiling uvs: no wear
    for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) {
      const l0 = ((P2[1][1] - P2[2][1]) * (x - P2[2][0]) + (P2[2][0] - P2[1][0]) * (y - P2[2][1])) / d;
      const l1 = ((P2[2][1] - P2[0][1]) * (x - P2[2][0]) + (P2[0][0] - P2[2][0]) * (y - P2[2][1])) / d, l2 = 1 - l0 - l1;
      if (l0 < 0 || l1 < 0 || l2 < 0) continue;
      const o = y * W + x;
      if (done[o]) continue;
      done[o] = 1;
      const wy = w3[0][1] * l0 + w3[1][1] * l1 + w3[2][1] * l2, wz = w3[0][2] * l0 + w3[1][2] * l1 + w3[2][2] * l2, wx = w3[0][0] * l0 + w3[1][0] * l1 + w3[2][0] * l2;
      const k = o * 4;
      let g = 0;
      if (wy < 0.38) g = Math.max(g, (0.38 - wy) / 0.38 * 0.38); // road grime up the sills and bumpers
      for (const c of wheels) { const r = Math.hypot(wy - c[1], wz - c[2]); if (Math.abs(wx) > 0.3 && r > WR && r < WR + 0.12) g = Math.max(g, 0.42 * (1 - (r - WR) / 0.12)); } // mud round the arches
      // (only a soft tone, no per-texel stipple: the game's car-wear shader paints the pixel dirt, src/world/carModels.js)
      if (g > 0) { const t = g * 0.5; px[k] = px[k] * (1 - t) + 88 * t; px[k + 1] = px[k + 1] * (1 - t) + 74 * t; px[k + 2] = px[k + 2] * (1 - t) + 58 * t; }
    }
  }

  const png = await sharp(Buffer.from(px.buffer), { raw: { width: W, height: H, channels: 4 } }).png({ palette: true, colours: CFG.colours || 40, dither: 0, effort: 10 }).toBuffer();
  tex.setImage(png); tex.setMimeType('image/png');
  console.log('texture', tex.getName() || tex.getURI(), meta.width + 'px ->', W + 'px', '(' + Math.round(Math.sqrt(uvA / Math.max(1e-9, wA)) * W) + ' px/m)', mats.join(','));
}
await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder }), quantize());
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await webpTextures(doc);
const outPath = pjoin(OUT, id + '.glb');
await io.write(outPath, doc);

// the manifest entry and the credit (pack.mjs regenerates src/kit/lowpixArch.js and the credits from the manifest)
b = getBounds(scene);
const tris = count();
const att = pjoin(dirname(src), 'ATTRIBUTION.json');
const A = existsSync(att) ? JSON.parse(readFileSync(att, 'utf8')) : {};
const lic = { by: 'CC BY 4.0', cc0: 'CC0 1.0', 'cc0-public-domain': 'CC0 1.0' }[A.licence] || A.licence;
const manPath = pjoin(OUT, 'manifest.json');
const man = JSON.parse(readFileSync(manPath, 'utf8'));
const texs = root.listTextures().map((t) => sharp(Buffer.from(t.getImage())).metadata());
const tex = (await Promise.all(texs)).reduce((m, x) => (x.width * x.height > m[0] * m[1] ? [x.width, x.height] : m), [0, 0]);
man[id] = { id, name: CFG.name, credit: { title: A.name, author: A.author, authorUrl: A.author_url, license: lic, url: A.source, site: 'sketchfab' },
  min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)), tris, tex, bytes: statSync(outPath).size, ppm: 256 };
writeFileSync(manPath, JSON.stringify(Object.fromEntries(Object.entries(man).sort()), null, 1) + '\n');
console.log(`imported ${id}: ${tris0} -> ${tris} tris, ${root.listMaterials().length} materials, ${(man[id].bytes / 1024).toFixed(0)} KB, size`, b.min.map((v, i) => (b.max[i] - v).toFixed(2)).join(' x '));
