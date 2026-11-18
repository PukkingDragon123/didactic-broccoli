// Pack the Blender toy figures for the game: node art/blender/toys/pack.mjs <series> [<id> ...]
// Reads art/blender/toys/_build/<series>/<id>.glb + <id>.meta.json (written by the figure scripts, lib/fig.py) and
// writes public/models/lowpix/figures/<series>/<id>.glb + its entry in src/figures/lowpix.manifest.json, the same
// contract as art/lowpix/figures/pack.mjs: { size [x,y,z] mm, min, tris, atlas, kb, clips, mats, pts }.
// Keeps only the clips the game plays, drops channels that never move, keeps normals + tangents (normal-mapped PVC),
// quantizes and meshopt-compresses. Faceted figures (FACET.md) come with split per-face normals, no tangents and no
// normal map: nothing here welds vertices or recomputes normals, so the flat shading survives as exported.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, resample, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const manPath = resolve(ROOT, 'src/figures/lowpix.manifest.json');
const LOCK = '/tmp/gg-manifest.lock'; // every writer of lowpix.manifest.json should hold this (flock)
if (process.argv[2] === '--merge') merge(process.argv[3]);
else await pack(process.argv.slice(2));

async function pack([series, ...only]) {
if (!series) { console.error('usage: node art/blender/toys/pack.mjs <series> [<id> ...]'); process.exit(1); }
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const BUILD = resolve(ROOT, 'art/blender/toys/_build', series);
const outDir = resolve(ROOT, 'public/models/lowpix/figures', series);
mkdirSync(outDir, { recursive: true });
const same = (a, b, eps = 1e-4) => a.every((v, i) => Math.abs(v - b[i]) < eps);
const ids = only.length ? only : readdirSync(BUILD).filter((f) => f.endsWith('.meta.json')).map((f) => f.slice(0, -10));
const done = {};
for (const id of ids) {
  const glb = join(BUILD, id + '.glb');
  if (!existsSync(glb)) { console.error('missing', glb); process.exitCode = 1; continue; }
  const meta = JSON.parse(readFileSync(join(BUILD, id + '.meta.json'), 'utf8'));
  const doc = await io.read(glb);
  const root = doc.getRoot();
  const keep = new Set(Object.values(meta.clips || {}));
  for (const a of root.listAnimations()) if (!keep.has(a.getName())) a.dispose();
  await doc.transform(resample({ tolerance: 1e-5 }));
  for (const a of root.listAnimations()) { // drop channels that hold a joint at its rest pose for the whole clip
    for (const ch of a.listChannels()) {
      const node = ch.getTargetNode(), path = ch.getTargetPath(), out = ch.getSampler()?.getOutput();
      if (!node || !out) continue;
      const rest = path === 'translation' ? node.getTranslation() : path === 'rotation' ? node.getRotation() : node.getScale();
      const el = [];
      let still = true;
      for (let i = 0; i < out.getCount() && still; i++) { out.getElement(i, el); if (!same(el, rest)) still = false; }
      if (still) { const s = ch.getSampler(); ch.dispose(); if (s && !s.listParents().some((p) => p.propertyType === 'AnimationChannel')) s.dispose(); }
    }
    if (!a.listChannels().length) a.dispose();
  }
  const scene = root.listScenes()[0];
  const b = getBounds(scene);
  let tris = 0;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3;
  const base = root.listMaterials()[0]?.getBaseColorTexture();
  const atlas = base ? base.getSize() : null;
  // the baked normal map as a high-quality JPEG (smooth data; a PNG of it is most of the file), the paint stays PNG
  const nmaps = new Set(root.listMaterials().map((m) => m.getNormalTexture()).filter(Boolean));
  for (const t of nmaps) {
    const buf = await sharp(Buffer.from(t.getImage())).removeAlpha().jpeg({ quality: 92, chromaSubsampling: '4:4:4' }).toBuffer();
    t.setImage(new Uint8Array(buf)).setMimeType('image/jpeg').setURI(t.getURI().replace(/\.png$/i, '.jpg'));
  }
  await doc.transform(dedup(), prune({ keepAttributes: true, keepLeaves: true }), reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = join(outDir, id + '.glb');
  await io.write(out, doc);
  done[`${series}/${id}`] = {
    size: b.max.map((v, i) => +(v - b.min[i]).toFixed(2)), min: b.min.map((v) => +v.toFixed(2)), tris: Math.round(tris), atlas,
    kb: Math.round(statSync(out).size / 1024), clips: meta.clips || {}, mats: meta.mats || {}, pts: meta.pts || {}, blender: true,
    ...(meta.separate ? { separate: meta.separate } : {}),
  };
  const e = done[`${series}/${id}`];
  console.log(`${series}/${id}`, e.tris + ' tris', atlas?.join('x'), e.kb + ' KB', 'size', e.size.join('x'), 'clips', Object.keys(e.clips).join(','));
}
// Merge into the shared manifest under an exclusive lock (several agents pack series in parallel): re-read the file
// inside the lock, touch only this series' entries, write a temp file and rename it into place. A whole-series pack
// (no ids given) also drops this series' entries (and GLBs) for figures that no longer exist.
const part = join(BUILD, `_pack.${process.pid}.json`);
writeFileSync(part, JSON.stringify({ series, full: !only.length, done }));
execFileSync('flock', ['-w', '120', LOCK, process.execPath, import.meta.filename, '--merge', part], { stdio: 'inherit' });
rmSync(part, { force: true });
}

function merge(partFile) {
  const { series, full, done } = JSON.parse(readFileSync(partFile, 'utf8'));
  const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
  if (full) {
    for (const k of Object.keys(man)) {
      if (!k.startsWith(series + '/') || done[k] || !man[k].blender) continue;
      delete man[k];
      rmSync(resolve(ROOT, 'public/models/lowpix/figures', k + '.glb'), { force: true });
      console.log('pruned', k);
    }
  }
  Object.assign(man, done);
  const sorted = Object.fromEntries(Object.keys(man).sort().map((k) => [k, man[k]]));
  const tmp = manPath + '.' + process.pid + '.tmp';
  writeFileSync(tmp, JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"') + '\n');
  renameSync(tmp, manPath);
  console.log(`manifest: ${Object.keys(done).length} ${series} entries merged`);
}
