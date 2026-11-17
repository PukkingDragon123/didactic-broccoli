// Pack lowpix figure builds for the game: node art/lowpix/figures/pack.mjs <buildDir> <series> [<series> ...]
// For every built figure (<buildDir>/<series>/<slug>/<slug>.glb + the spec's <id>.meta.json sidecar):
//   keeps only the clips the game plays (the meta's clip roles), drops joint channels that never move, quantizes and
//   meshopt-compresses the GLB into public/models/lowpix/figures/<series>/<id>.glb, and records the figure in
//   src/figures/lowpix.manifest.json: { "<series>/<id>": { size [x,y,z] mm, min [x,y,z], tris, atlas, clips, mats, pts } }.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, resample, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const [buildDir, ...seriesList] = process.argv.slice(2);
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const manPath = resolve(ROOT, 'src/figures/lowpix.manifest.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};

const same = (a, b, eps = 1e-4) => a.every((v, i) => Math.abs(v - b[i]) < eps);

for (const series of seriesList) {
  const specDir = resolve(ROOT, 'art/lowpix/figures', series);
  const summary = JSON.parse(readFileSync(resolve(buildDir, series, 'summary.json'), 'utf8'));
  const outDir = resolve(ROOT, 'public/models/lowpix/figures', series);
  mkdirSync(outDir, { recursive: true });
  for (const r of summary.results) {
    if (r.status !== 'ok') { console.error('FAILED', r.source, r.error); continue; }
    const id = r.source.split('/').pop().replace(/\.json$/, '');
    const meta = JSON.parse(readFileSync(join(specDir, id + '.meta.json'), 'utf8'));
    const glbPath = resolve(buildDir, series, r.files[Object.keys(r.files).find((f) => f.endsWith('.glb'))]);
    const doc = await io.read(glbPath);
    const root = doc.getRoot();
    const keep = new Set(Object.values(meta.clips || {}));
    for (const a of root.listAnimations()) if (!keep.has(a.getName())) a.dispose();
    await doc.transform(resample({ tolerance: 1e-4 }));
    // drop channels that hold a joint at its rest pose for the whole clip
    for (const a of root.listAnimations()) {
      for (const ch of a.listChannels()) {
        const node = ch.getTargetNode(), path = ch.getTargetPath(), out = ch.getSampler()?.getOutput();
        if (!node || !out) continue;
        const rest = path === 'translation' ? node.getTranslation() : path === 'rotation' ? node.getRotation() : node.getScale();
        const n = out.getCount(), el = [];
        let still = true;
        for (let i = 0; i < n && still; i++) { out.getElement(i, el); if (!same(el, rest)) still = false; }
        if (still) { const s = ch.getSampler(); ch.dispose(); if (s && !s.listParents().some((p) => p.propertyType === 'AnimationChannel')) s.dispose(); }
      }
      if (!a.listChannels().length) a.dispose();
    }
    const scene = root.listScenes()[0];
    const b = getBounds(scene);
    let tris = 0;
    for (const m of root.listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3;
    const tex = root.listTextures()[0];
    const atlas = tex ? tex.getSize() : null;
    await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder }), quantize());
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    const out = join(outDir, id + '.glb');
    await io.write(out, doc);
    const key = `${series}/${id}`;
    man[key] = {
      size: b.max.map((v, i) => +(v - b.min[i]).toFixed(2)), min: b.min.map((v) => +v.toFixed(2)), tris: Math.round(tris), atlas,
      kb: Math.round(statSync(out).size / 1024), clips: meta.clips || {}, mats: meta.mats || {}, pts: meta.pts || {},
    };
    console.log(key, man[key].tris + ' tris', atlas?.join('x'), man[key].kb + ' KB', Object.keys(meta.clips || {}).join(','));
  }
}
const sorted = Object.fromEntries(Object.keys(man).sort().map((k) => [k, man[k]]));
writeFileSync(manPath, JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"') + '\n');
