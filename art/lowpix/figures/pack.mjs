// Pack lowpix figure builds for the game: node art/lowpix/figures/pack.mjs <buildDir> <series> [<series> ...]
// For every built figure (<buildDir>/<series>/<slug>/<slug>.glb + the spec's <id>.meta.json sidecar):
//   keeps only the clips the game plays (the meta's clip roles), drops joint channels that never move, quantizes and
//   meshopt-compresses the GLB into public/models/lowpix/figures/<series>/<id>.glb, and records the figure in
//   src/figures/lowpix.manifest.json: { "<series>/<id>": { size [x,y,z] mm, min [x,y,z], tris, atlas, clips, mats, pts } }.
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, resample, getBounds, mergeDocuments, unpartition } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { webpTextures } from '../../../tools/webp-glb.mjs';

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
function quatFromMatrix(M) { // 3x3 rotation (rows) -> [x, y, z, w]
  const [[m00, m01, m02], [m10, m11, m12], [m20, m21, m22]] = M;
  const t = m00 + m11 + m22;
  if (t > 0) { const s = 0.5 / Math.sqrt(t + 1); return [(m21 - m12) * s, (m02 - m20) * s, (m10 - m01) * s, 0.25 / s]; }
  if (m00 > m11 && m00 > m22) { const s = 2 * Math.sqrt(1 + m00 - m11 - m22); return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
  if (m11 > m22) { const s = 2 * Math.sqrt(1 + m11 - m00 - m22); return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
  const s = 2 * Math.sqrt(1 + m22 - m00 - m11); return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
}
const mulq = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
/** A converted model's pixel-art atlas: the transparent gutters are flattened onto the atlas' mean colour (so mipmaps
 * do not bleed black into the edges) and it stays a lossless PNG (no JPEG ringing on pixel art). No recolouring here:
 * every figure keeps the line's one finish (a recolour is a game finish, never a new entry). */
async function flatten(tex) {
  const img = sharp(Buffer.from(tex.getImage()));
  const st = await img.stats();
  const bg = { r: Math.round(st.channels[0].mean), g: Math.round(st.channels[1].mean), b: Math.round(st.channels[2].mean) };
  tex.setImage(new Uint8Array(await sharp(Buffer.from(tex.getImage())).flatten({ background: bg }).png({ compressionLevel: 9, palette: false }).toBuffer())).setMimeType('image/png');
}
/** The smallest extra tilt (about x and z, up to 50 deg) that leaves a laid-down toy steady on the shelf: its surface
 * centroid over what touches (corners within 0.5 mm of the lowest), with a tipping angle >= 10 deg. */
function settle(doc, scene, node, sep) {
  const P = [], A = [];
  const walk = (n, M) => {
    if (sep.has(n.getName())) return;
    const W = new Float64Array(16); mul4(M, n.getMatrix(), W);
    const mesh = n.getMesh();
    if (mesh) for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices(), v = [];
      const cnt = idx ? idx.getCount() : pos.getCount();
      for (let i = 0; i < cnt; i++) { pos.getElement(idx ? idx.getScalar(i) : i, v); P.push(xf4(W, v)); }
    }
    for (const c of n.listChildren()) walk(c, W);
  };
  const N0 = node.getMatrix(); // the lay rotation: points in the frame the extra tilt applies to
  for (const c of node.listChildren()) walk(c, N0);
  let cx = 0, cy = 0, cz = 0, at = 0;
  for (let i = 0; i + 2 < P.length; i += 3) {
    const [a, b, c] = [P[i], P[i + 1], P[i + 2]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const ar = 0.5 * Math.hypot(u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]);
    cx += ar * (a[0] + b[0] + c[0]) / 3; cy += ar * (a[1] + b[1] + c[1]) / 3; cz += ar * (a[2] + b[2] + c[2]) / 3; at += ar;
  }
  const C = [cx / at, cy / at, cz / at];
  const q0 = node.getRotation();
  const margin = (ax, az) => {
    const q = quat(ax, 0, az); // extra tilt applied after the lay rotation
    const pts = P.map((p) => rotq(q, [p[0] - C[0], p[1] - C[1], p[2] - C[2]]));
    const y0 = Math.min(...pts.map((p) => p[1]));
    const H = hull2(pts.filter((p) => p[1] < y0 + 0.3).map((p) => [p[0], p[2]]));
    if (H.length < 3) return -1;
    let d = Infinity, inside = true;
    for (let i = 0; i < H.length; i++) {
      const [a, b] = [H[(i + H.length - 1) % H.length], H[i]];
      const cr = (b[0] - a[0]) * (0 - a[1]) - (b[1] - a[1]) * (0 - a[0]);
      if (cr < 0) inside = false;
      d = Math.min(d, Math.abs(cr) / Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), 1e-9));
    }
    return inside ? Math.atan2(d, -y0) * 180 / Math.PI : -1;
  };
  const cands = [];
  for (let i = -35; i <= 35; i++) for (let j = -35; j <= 35; j++) cands.push([i * 2, j * 2]);
  cands.sort((a, b) => a[0] ** 2 + a[1] ** 2 - b[0] ** 2 - b[1] ** 2);
  let best = [-2, [0, 0]];
  for (const [ax, az] of cands) { const m = margin(ax, az); if (m >= 14) { best = [m, [ax, az]]; break; } if (m > best[0]) best = [m, [ax, az]]; }
  node.setRotation(mulq(quat(best[1][0], 0, best[1][1]), q0));
}
function mul4(a, b, o) { for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } }
const xf4 = (m, p) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
function rotq(q, v) { const [x, y, z, w] = q; const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
  return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x]; }
function hull2(pts) {
  pts = [...new Map(pts.map((p) => [p[0].toFixed(3) + ',' + p[1].toFixed(3), p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
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
  const run = JSON.parse(readFileSync(resolve(buildDir, series, 'run.json'), 'utf8'));
  const summary = run.spec.length ? JSON.parse(readFileSync(resolve(buildDir, series, 'summary.json'), 'utf8')) : { results: [] };
  const outDir = resolve(ROOT, 'public/models/lowpix/figures', series);
  mkdirSync(outDir, { recursive: true });
  const jobs = [...run.spec.map((id) => ({ id, r: summary.results.find((r) => r.source.split('/').pop() === id + '.json') })), ...run.model.map((id) => ({ id, r: null }))];
  for (const { id, r } of jobs) {
    if (r === undefined || (r && r.status !== 'ok')) { console.error('FAILED', series, id, r?.error); continue; }
    const meta = JSON.parse(readFileSync(join(specDir, id + '.meta.json'), 'utf8'));
    let doc;
    if (r) doc = await io.read(resolve(buildDir, series, r.files[Object.keys(r.files).find((f) => f.endsWith('.glb'))]));
    else { doc = new Document(); doc.createBuffer(); doc.getRoot().setDefaultScene(doc.createScene('figure')); } // models only, no spec parts
    const root = doc.getRoot();
    const mainScene = root.listScenes()[0];
    // real models: merge each converted GLB in under a placed node "model_<name>"
    let missing = false;
    for (const m of meta.models || []) {
      const key = m.key;
      const dir = resolve(ROOT, 'node_modules/.cache/lowpix-conv', key);
      const g = existsSync(dir) ? readdirSync(dir).find((f) => f.endsWith('.glb')) : null;
      if (!g) { console.error('missing conversion', m.src, key); missing = true; break; }
      const src = await io.read(join(dir, g));
      for (const a of src.getRoot().listAnimations()) a.dispose();
      const sb = getBounds(src.getRoot().listScenes()[0]);
      const h0 = sb.max[1] - sb.min[1], k = m.height / h0; // converted at its final size: k is 1 (up to lowpix rounding)
      if (Math.abs(k - 1) > 0.03) console.error(`  ${series}/${id} model ${m.name}: converted ${h0.toFixed(2)} mm, wanted ${m.height}`);
      for (const t of src.getRoot().listTextures()) await flatten(t);
      const map = mergeDocuments(doc, src);
      const holder = doc.createNode('model_' + m.name);
      let q = quat(m.pitch || 0, m.yaw || 0, m.roll || 0);
      if (m.rest_R) q = mulq(q, quatFromMatrix(m.rest_R)); // settled on the shelf first, then turned
      holder.setTranslation(m.pos).setRotation(q);
      if (Math.abs(k - 1) > 1e-3) holder.setScale([k, k, k]);
      for (const sc of src.getRoot().listScenes()) {
        const t = map.get(sc);
        for (const n of t.listChildren()) { t.removeChild(n); holder.addChild(n); }
        t.dispose();
      }
      mainScene.addChild(holder);
      meta.mats['model_' + m.name] = m.mat || 'matte';
    }
    if (missing) { console.error('SKIPPED', `${series}/${id}`, '(a model did not convert)'); continue; }
    const sep = new Set(meta.separate || []);
    if (meta.lay) { // the whole toy laid down the way it rests on a shelf (a top on its side), then stood on y = 0
      const lay = doc.createNode('lay').setRotation(quat(...meta.lay));
      for (const n of mainScene.listChildren()) { mainScene.removeChild(n); lay.addChild(n); }
      mainScene.addChild(lay);
      settle(doc, mainScene, lay, new Set(meta.separate || []));
      const keep = lay.listChildren().filter((n) => sep.has(n.getName()));
      for (const n of keep) lay.removeChild(n);
      const lb = getBounds(mainScene);
      for (const n of keep) lay.addChild(n);
      lay.setTranslation([0, -lb.min[1], 0]);
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
    // capsule-toy mascots keep their smooth vertex normals (smoothlight.py) so the game's lit view is soft, not faceted;
    // prune() would otherwise drop NORMAL as unused by the unlit material
    await doc.transform(dedup(), prune({ keepAttributes: !!meta.mascot }), reorder({ encoder: MeshoptEncoder }), quantize());
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
    await webpTextures(doc); // (lossless WebP: the same pixels, smaller: tools/webp-glb.mjs)
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
