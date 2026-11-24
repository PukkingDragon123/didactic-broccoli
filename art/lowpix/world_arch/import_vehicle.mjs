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
  const boxes = CFG.cut?.[p.getMaterial()?.getName()];
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

// textures: pixel art at about 256 px/m, posterised; badges painted out; paint colours swapped where asked
b = getBounds(scene);
const sizeM = Math.max(b.max[0] - b.min[0], b.max[1] - b.min[1], b.max[2] - b.min[2]);
for (const tex of root.listTextures()) {
  const name = tex.getName() || tex.getURI();
  const img = tex.getImage();
  if (!img) continue;
  const slots = root.listMaterials().flatMap((m) => [['base', m.getBaseColorTexture()], ['normal', m.getNormalTexture()], ['mr', m.getMetallicRoughnessTexture()]].filter(([, t]) => t === tex).map(([k2]) => [k2, m.getName()]));
  const isColour = slots.some(([k2]) => k2 === 'base');
  const meta = await sharp(Buffer.from(img)).metadata();
  // colour at the source's full resolution up to 2048 px (a body atlas spreads ~25 m² of panels: 2048 px is the
  // 256 px/m standard), normal maps up to 1024, metal/roughness up to 512
  void sizeM;
  const cap = isColour ? 2048 : slots.some(([k2]) => k2 === 'normal') ? 1024 : 512;
  const target = Math.min(cap, 2 ** Math.round(Math.log2(Math.max(meta.width, meta.height))));
  let pipe = sharp(Buffer.from(img)).resize(target, target, { fit: 'fill', kernel: 'lanczos3' });
  let raw = await pipe.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = new Uint8ClampedArray(raw.data), W = raw.info.width, H = raw.info.height;
  if (isColour) {
    const mats = slots.map(([, n]) => n);
    for (const [x0, y0, x1, y1, col] of mats.flatMap((n) => CFG.retouch?.[n] || [])) {
      // 'auto': the average of the ring of texels just outside the rectangle (the panel the badge sits on)
      let rgb = col === 'auto' ? null : [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16));
      if (!rgb) {
        const X0 = Math.max(0, Math.floor(x0 * W) - 2), X1 = Math.min(W - 1, Math.ceil(x1 * W) + 1), Y0 = Math.max(0, Math.floor(y0 * H) - 2), Y1 = Math.min(H - 1, Math.ceil(y1 * H) + 1);
        const acc = [0, 0, 0]; let n = 0;
        for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
          if (x > X0 && x < X1 && y > Y0 && y < Y1) continue;
          const o = (y * W + x) * 4; acc[0] += px[o]; acc[1] += px[o + 1]; acc[2] += px[o + 2]; n++;
        }
        rgb = acc.map((v) => v / Math.max(1, n));
      }
      for (let y = Math.floor(y0 * H); y < Math.ceil(y1 * H); y++) for (let x = Math.floor(x0 * W); x < Math.ceil(x1 * W); x++) {
        const o = (y * W + x) * 4; px[o] = rgb[0]; px[o + 1] = rgb[1]; px[o + 2] = rgb[2];
      }
    }
  }
  const out = sharp(Buffer.from(px.buffer), { raw: { width: W, height: H, channels: 4 } });
  const png = isColour ? await out.png({ palette: true, colours: 96, dither: 0, effort: 10 }).toBuffer() : await out.png({ compressionLevel: 9 }).toBuffer();
  tex.setImage(png); tex.setMimeType('image/png');
  console.log('texture', name, meta.width + 'px ->', target + 'px', isColour ? '(colour, posterised)' : '');
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
