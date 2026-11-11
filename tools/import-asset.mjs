// Import a Poly Haven model (CC0) into the game: node tools/import-asset.mjs <polyhavenId> [options]
//   --tris N      triangle budget (default 3000): welded, then simplified (meshoptimizer) until it fits
//   --size M      scale so the largest dimension is M metres (default: keep the model's own real-world scale)
//   --tex 512     base-colour texture size in px (512 default; 1024 for things held in the hand)
//   --colours     (ignored: textures are no longer palette-reduced; kept so old command lines still work)
//   --normal      keep the normal map (at half the texture size); dropped by default
//   --origin keep keep the model's own origin (default: bottom centre, the props' convention)
//   --res 1k|2k   source resolution to download (default: 1k for --tex <= 512, else 2k)
//   --as name     save as public/models/<name>.glb (default: the Poly Haven id)
//   --keep RE / --drop RE  keep only the nodes whose name matches RE / leave out those that match (one item from a set)
// Steps: fetch api.polyhaven.com/info + /files (glTF on dl.polyhaven.org, cached in node_modules/.cache/import-asset),
// bake node transforms, re-origin, weld, simplify, join per material, dedup, prune; the base colour gets the shared
// texture polish (tools/pixelart.py polish(), the same as the town's surfaces: ambient occlusion multiplied in, cleaned,
// no palette, a JPEG unless it has alpha); roughness / metalness become per-material factors unless the metal mask
// varies (then the ORM map is kept small); quantized + meshopt-compressed GLB (src/kit/assets.js decodes it).
// Writes public/models/<name>.glb, updates public/models/manifest.json, appends the credit to CREDITS.md and
// public/CREDITS.txt. Needs curl (it goes through the agent proxy).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { weld, simplify, flatten, join, dedup, prune, clearNodeTransform, transformPrimitive, quantize, reorder, getBounds } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, appendFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const FLAGS = new Set(['normal']);
const id = argv.find((a, i) => !a.startsWith('--') && (i === 0 || !argv[i - 1].startsWith('--') || FLAGS.has(argv[i - 1].slice(2))));
const opt = (k, d) => { const i = argv.indexOf('--' + k); if (i < 0) return d; const v = argv[i + 1]; return v === undefined || v.startsWith('--') ? true : v; };
if (!id || id.startsWith('--')) { console.log('usage: node tools/import-asset.mjs <polyhavenId> [--tris N] [--size M] [--tex 512] [--colours 32] [--normal] [--origin keep] [--as name]'); process.exit(1); }
const TRIS = +opt('tris', 3000), SIZE = opt('size', null) ? +opt('size') : null, TEX = +opt('tex', 512), COLOURS = Math.max(8, Math.min(256, +opt('colours', 32)));
const KEEP_NORMAL = !!opt('normal', false), KEEP_ORIGIN = opt('origin', '') === 'keep', NAME = opt('as', id), RES = opt('res', TEX > 512 ? '2k' : '1k');

const CACHE = resolve(ROOT, 'node_modules/.cache/import-asset', id);
mkdirSync(CACHE, { recursive: true });
const curl = (url, out) => execFileSync('curl', ['-sSfL', '--retry', '3', '-m', '300', '-o', out, url], { stdio: ['ignore', 'ignore', 'inherit'] });
const getJSON = (url, name) => { const f = resolve(CACHE, name); if (!existsSync(f)) curl(url, f); return JSON.parse(readFileSync(f, 'utf8')); };

// ------------------------------------------------------------------ fetch
const info = getJSON(`https://api.polyhaven.com/info/${id}`, 'info.json');
if (info.type !== 2) throw new Error(`${id} is not a Poly Haven model`);
const files = getJSON(`https://api.polyhaven.com/files/${id}`, 'files.json');
const g = files.gltf?.[RES]?.gltf || files.gltf?.['1k']?.gltf || Object.values(files.gltf || {})[0]?.gltf;
if (!g) throw new Error('no glTF download for ' + id);
const gltfPath = resolve(CACHE, `${RES}/${id}.gltf`);
mkdirSync(dirname(gltfPath), { recursive: true });
if (!existsSync(gltfPath)) curl(g.url, gltfPath);
for (const [rel, f] of Object.entries(g.include || {})) {
  const p = resolve(dirname(gltfPath), rel);
  mkdirSync(dirname(p), { recursive: true });
  if (!existsSync(p)) curl(f.url, p);
}
const authors = Object.keys(info.authors || {}).join(', ') || 'Poly Haven';
console.log(`${id}: "${info.name}" by ${authors}, ${info.polycount} tris at source`);

// ------------------------------------------------------------------ geometry
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(gltfPath);
const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
{ const keep = opt('keep', null), drop = opt('drop', null);
  for (const n of doc.getRoot().listNodes()) if (n.getMesh() && ((keep && !new RegExp(keep).test(n.getName())) || (drop && new RegExp(drop).test(n.getName())))) n.dispose();
  if (keep || drop) await doc.transform(prune()); }
await doc.transform(flatten());
for (const n of doc.getRoot().listNodes()) if (n.getMesh()) clearNodeTransform(n);
const tris = () => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((a, p) => a + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);
// real scale and the origin at the bottom centre
{
  const b = getBounds(scene), sx = b.max[0] - b.min[0], sy = b.max[1] - b.min[1], sz = b.max[2] - b.min[2];
  const k = SIZE ? SIZE / Math.max(sx, sy, sz) : 1;
  const tx = KEEP_ORIGIN ? 0 : -(b.min[0] + b.max[0]) / 2, ty = KEEP_ORIGIN ? 0 : -b.min[1], tz = KEEP_ORIGIN ? 0 : -(b.min[2] + b.max[2]) / 2;
  const M = [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, tx * k, ty * k, tz * k, 1];
  const done = new Set();
  if (k !== 1 || tx || ty || tz) for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { if (done.has(p)) continue; done.add(p); transformPrimitive(p, M); }
}
const t0 = tris();
await doc.transform(dedup(), weld());
for (let err = 0.001, ratio = Math.min(1, TRIS / Math.max(1, tris())); tris() > TRIS && err < 0.5; err *= 1.8) {
  await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, TRIS / tris()) * 0.98, error: err, lockBorder: false }));
  ratio = TRIS / tris();
}
await doc.transform(join({ keepMeshes: false, keepNamed: false }), dedup(), prune());

// ------------------------------------------------------------------ textures: the shared polish (tools/pixelart.py)
// The same finish as the town's surface library (tools/make-tex.py): realistic content kept, area-downscaled in linear
// light, speckle cleaned, a touch of sharpening, ambient occlusion multiplied in at half strength; no palette, no
// posterising. Shown crisp up close (nearest magnification) and mipmapped far away by src/kit/assets.js.
const texInfo = [];
const PIXELART = resolve(ROOT, 'tools/pixelart.py');
let texN = 0;
async function polishTex(buf, size, ao, alpha) {
  const n = texN++, inp = resolve(CACHE, `polish_in_${n}.png`), out = resolve(CACHE, `polish_out_${n}.${alpha ? 'png' : 'jpg'}`);
  await sharp(buf).png().toFile(inp);
  const opts = {};
  if (ao) { const a = resolve(CACHE, `polish_ao_${n}.png`); await sharp(ao).png().toFile(a); opts.ao = a; }
  execFileSync('python3', ['-I', PIXELART, '--polish', inp, out, String(size), String(size), JSON.stringify(opts)], { stdio: ['ignore', 'ignore', 'inherit'] });
  return readFileSync(out);
}
async function stats(buf) {
  const { data, info: inf } = await sharp(buf).resize(64, 64, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let r = 0, m = 0, m2 = 0, n = 0;
  for (let i = 0; i < data.length; i += inf.channels, n++) { r += data[i + 1]; m += data[i + 2]; m2 += (data[i + 2] / 255) ** 2; }
  const mm = m / n / 255;
  return { rough: r / n / 255, metal: mm, metalVar: m2 / n - mm * mm };
}
for (const mat of doc.getRoot().listMaterials()) {
  const base = mat.getBaseColorTexture(), orm = mat.getMetallicRoughnessTexture(), occ = mat.getOcclusionTexture();
  const ormImg = orm?.getImage() || occ?.getImage() || null;
  if (base) {
    const hasAlpha = mat.getAlphaMode() !== 'OPAQUE';
    const out = await polishTex(base.getImage(), TEX, hasAlpha ? null : occ ? occ.getImage() : null, hasAlpha);
    base.setImage(out).setMimeType(hasAlpha ? 'image/png' : 'image/jpeg').setURI(`${NAME}_${mat.getName() || 'mat'}_base.${hasAlpha ? 'png' : 'jpg'}`);
    texInfo.push(`${mat.getName()}: ${TEX}px polished ${(out.length / 1024).toFixed(0)} KB`);
  }
  if (orm) {
    const s = await stats(orm.getImage());
    mat.setRoughnessFactor(Math.max(0.3, Math.min(0.95, s.rough * mat.getRoughnessFactor())));
    if (s.metalVar > 0.04) {
      const small = await sharp(orm.getImage()).resize(TEX / 4, TEX / 4, { fit: 'fill' }).png({ compressionLevel: 9 }).toBuffer();
      orm.setImage(small).setMimeType('image/png').setURI(`${NAME}_${mat.getName() || 'mat'}_orm.png`);
      mat.setMetallicFactor(1);
    } else {
      mat.setMetallicFactor(s.metal > 0.5 ? 1 : 0);
      mat.setMetallicRoughnessTexture(null);
    }
  }
  mat.setOcclusionTexture(null);
  const nor = mat.getNormalTexture();
  if (nor && KEEP_NORMAL) {
    const small = await sharp(nor.getImage()).resize(TEX / 2, TEX / 2, { fit: 'fill' }).jpeg({ quality: 88 }).toBuffer();
    nor.setImage(small).setMimeType('image/jpeg').setURI(`${NAME}_${mat.getName() || 'mat'}_nor.jpg`);
  } else if (nor) mat.setNormalTexture(null);
}
await doc.transform(prune(), dedup());

// ------------------------------------------------------------------ write
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
const outPath = resolve(ROOT, 'public/models', NAME + '.glb');
mkdirSync(dirname(outPath), { recursive: true });
await io.write(outPath, doc);
const bytes = statSync(outPath).size;
const b = getBounds(doc.getRoot().listScenes()[0]);
const dims = [0, 1, 2].map((i) => +(b.max[i] - b.min[i]).toFixed(3));
const source = `https://polyhaven.com/a/${id}`;
console.log(`-> public/models/${NAME}.glb  ${Math.round(tris())} tris (from ${Math.round(t0)}), ${(bytes / 1024).toFixed(0)} KB, ${dims.join(' x ')} m, ${doc.getRoot().listMaterials().length} materials`);
for (const t of texInfo) console.log('   ' + t);

// ------------------------------------------------------------------ manifest and credits
const manPath = resolve(ROOT, 'public/models/manifest.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
man[NAME] = { id, name: info.name, authors, license: 'CC0 1.0', source, tris: Math.round(tris()), bytes, size: dims, tex: TEX };
writeFileSync(manPath, JSON.stringify(Object.fromEntries(Object.entries(man).sort()), null, 1) + '\n');
const credMd = resolve(ROOT, 'CREDITS.md'), credTxt = resolve(ROOT, 'public/CREDITS.txt');
const HEAD = '## 3D models (Poly Haven, CC0)';
let md = readFileSync(credMd, 'utf8');
if (!md.includes(HEAD)) { appendFileSync(credMd, `\n${HEAD}\n\nModels from Poly Haven (polyhaven.com), CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). Decimated, re-scaled and re-textured as pixel art for the game by tools/import-asset.mjs.\n\n`); md = readFileSync(credMd, 'utf8'); }
if (!md.includes(`(${source})`)) appendFileSync(credMd, `- ${info.name} by ${authors} (${source}), CC0 1.0. Shipped as \`models/${NAME}.glb\`\n`);
const txt = readFileSync(credTxt, 'utf8');
if (!txt.includes(source)) appendFileSync(credTxt, `${txt.includes('3D models (Poly Haven') ? '' : '\n3D models (Poly Haven, CC0 1.0, decimated and re-textured as pixel art)\n'}- ${info.name} by ${authors}: ${source} (models/${NAME}.glb)\n`);
