// Pack lowpix figure builds for the game: node art/lowpix/figures/pack.mjs <buildDir> <series> [<series> ...]
// For every built figure (<buildDir>/<series>/<slug>/<slug>.glb + the spec's <id>.meta.json sidecar):
//   keeps only the clips the game plays (the meta's clip roles), drops joint channels that never move, quantizes and
//   meshopt-compresses the GLB into public/models/lowpix/figures/<series>/<id>.glb, and records the figure in
//   src/figures/lowpix.manifest.json: { "<series>/<id>": { size [x,y,z] mm, min [x,y,z], tris, atlas, clips, mats, pts } }.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, resample, getBounds, mergeDocuments, unpartition } from '@gltf-transform/functions';
import sharp from 'sharp';
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
const D2R = Math.PI / 180;
function quat(pitch, yaw, roll) { // XYZ euler (degrees) -> quaternion
  const [x, y, z] = [pitch * D2R / 2, yaw * D2R / 2, roll * D2R / 2];
  const [c1, c2, c3, s1, s2, s3] = [Math.cos(x), Math.cos(y), Math.cos(z), Math.sin(x), Math.sin(y), Math.sin(z)];
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
}
const mulq = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
/** Painted model atlases are photographic: JPEG keeps them small (PNG only where there is real transparency). */
async function compact(tex) {
  // (the transparent texels are the atlas gutters: flattened onto the atlas' mean colour)
  const st = await sharp(Buffer.from(tex.getImage())).stats();
  const bg = { r: Math.round(st.channels[0].mean), g: Math.round(st.channels[1].mean), b: Math.round(st.channels[2].mean) };
  tex.setImage(new Uint8Array(await sharp(Buffer.from(tex.getImage())).flatten({ background: bg }).jpeg({ quality: 86, chromaSubsampling: '4:4:4' }).toBuffer())).setMimeType('image/jpeg');
}
async function recolor(png, r) {
  let im = sharp(Buffer.from(png));
  const meta = await im.metadata();
  if (r.brightness || r.saturation || r.hue) im = im.modulate({ brightness: r.brightness ?? 1, saturation: r.saturation ?? 1, hue: r.hue ?? 0 });
  if (r.tint) im = im.tint(r.tint);
  if (r.gamma) im = im.gamma(r.gamma);
  if (r.linear) im = im.linear(r.linear[0], r.linear[1]); // [a, b]: out = a * in + b (lift a coat to white)
  return new Uint8Array(await im.png().toBuffer());
}
/** A gimmick clip on a model node: turn (look aside and back), hop, nod, spin, wobble, slide. */
function modelClip(doc, c) {
  const node = doc.getRoot().listNodes().find((n) => n.getName() === c.node);
  if (!node) { console.error('model clip: no node', c.node); return; }
  const L = c.length || 2, N = 31, times = [], vals = [];
  const r0 = node.getRotation(), t0 = node.getTranslation();
  const rot = ['turn', 'nod', 'spin', 'wobble'].includes(c.kind);
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) * L, k = i / (N - 1), e = Math.sin(Math.PI * k);
    times.push(t);
    if (c.kind === 'turn') { const a = (c.amp ?? 35) * Math.sin(Math.PI * Math.min(1, k * 1.6)) * (k < 0.62 ? 1 : Math.max(0, 1 - (k - 0.62) / 0.38)); vals.push(...mulq(r0, quat(0, a, 0))); }
    else if (c.kind === 'nod') { vals.push(...mulq(r0, quat((c.amp ?? 18) * Math.sin(Math.PI * 2 * k) * (1 - k), 0, 0))); }
    else if (c.kind === 'spin') { vals.push(...mulq(r0, quat(0, 360 * k * (c.amp ?? 1), 0))); }
    else if (c.kind === 'wobble') { vals.push(...mulq(r0, quat(0, 0, (c.amp ?? 10) * Math.sin(Math.PI * 4 * k) * (1 - k)))); }
    else if (c.kind === 'hop') { vals.push(t0[0], t0[1] + (c.amp ?? 4) * Math.abs(Math.sin(Math.PI * 2 * k)) * (1 - k * 0.5), t0[2]); }
    else if (c.kind === 'slide') { const ax = { x: 0, y: 1, z: 2 }[c.axis || 'z']; const v = [...t0]; v[ax] += (c.amp ?? 4) * e; vals.push(...v); }
  }
  const buf = doc.getRoot().listBuffers()[0];
  const inp = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(times)).setBuffer(buf);
  const out = doc.createAccessor().setType(rot ? 'VEC4' : 'VEC3').setArray(new Float32Array(vals)).setBuffer(buf);
  const smp = doc.createAnimationSampler().setInput(inp).setOutput(out).setInterpolation('LINEAR');
  const ch = doc.createAnimationChannel().setTargetNode(node).setTargetPath(rot ? 'rotation' : 'translation').setSampler(smp);
  let anim = doc.getRoot().listAnimations().find((a) => a.getName() === 'gimmick');
  if (!anim) anim = doc.createAnimation('gimmick');
  anim.addSampler(smp).addChannel(ch);
}

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
    const mainScene = root.listScenes()[0];
    const baseB = getBounds(mainScene); // the spec's base and props: models are fitted onto its footprint
    // real models: merge each converted GLB in under a placed node "model_<name>"
    for (const m of meta.models || []) {
      const key = m.key;
      const dir = resolve(ROOT, 'node_modules/.cache/lowpix-conv', key);
      const g = existsSync(dir) ? readdirSync(dir).find((f) => f.endsWith('.glb')) : null;
      if (!g) { console.error('missing conversion', m.src, key); continue; }
      const src = await io.read(join(dir, g));
      for (const a of src.getRoot().listAnimations()) a.dispose();
      const sb = getBounds(src.getRoot().listScenes()[0]);
      const [w0, h0, d0] = [0, 1, 2].map((i) => sb.max[i] - sb.min[i]);
      const th = (m.yaw || 0) * D2R, wx = Math.abs(w0 * Math.cos(th)) + Math.abs(d0 * Math.sin(th)), wz = Math.abs(w0 * Math.sin(th)) + Math.abs(d0 * Math.cos(th));
      const bw = baseB.max[0] - baseB.min[0], bd = baseB.max[2] - baseB.min[2], fill = m.fill ?? 0.82;
      const fit = Math.min(m.height / h0, m.fit === false ? 1e9 : (fill * bw) / wx, m.fit === false ? 1e9 : (fill * bd) / wz) * (m.scale || 1);
      const tone = { brightness: 0.9, saturation: 1.04 };
      for (const t of src.getRoot().listTextures()) t.setImage(await recolor(t.getImage(), m.recolor ? { ...tone, ...m.recolor } : tone));
      for (const t of src.getRoot().listTextures()) await compact(t);
      const map = mergeDocuments(doc, src);
      const holder = doc.createNode('model_' + m.name);
      const q = quat(m.pitch || 0, m.yaw || 0, m.roll || 0);
      holder.setTranslation(m.at).setRotation(q);
      holder.setScale([fit, fit, fit]);
      for (const sc of src.getRoot().listScenes()) {
        const t = map.get(sc);
        for (const n of t.listChildren()) { t.removeChild(n); holder.addChild(n); }
        t.dispose();
      }
      mainScene.addChild(holder);
      meta.mats['model_' + m.name] = m.mat || 'matte';
    }
    if ((meta.models || []).length) await doc.transform(unpartition());
    if (meta.model_clip) modelClip(doc, meta.model_clip);
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
      kb: Math.round(statSync(out).size / 1024), clips: meta.clips || {}, mats: meta.mats || {}, pts: meta.pts || {}, ...(meta.separate ? { separate: meta.separate } : {}),
    };
    console.log(key, man[key].tris + ' tris', atlas?.join('x'), man[key].kb + ' KB', Object.keys(meta.clips || {}).join(','));
  }
}
const fresh = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
for (const [k, v] of Object.entries(man)) if (seriesList.some((s) => k.startsWith(s + '/'))) fresh[k] = v;
const sorted = Object.fromEntries(Object.keys(fresh).sort().map((k) => [k, fresh[k]]));
writeFileSync(manPath, JSON.stringify(sorted, null, 0).replace(/\},"/g, '},\n"') + '\n');
