// Pack lowpix architecture builds for the game: node art/lowpix/world_arch/pack.mjs <buildDir> <id> [<id> ...]
// For every built model (<buildDir>/<id>/<slug>.glb): node transforms baked into the vertices (the spec is authored in
// the frame the game places it in, metres, so nothing is re-centred), one mesh, the unlit material made lit (rough,
// not metal; alpha-masked only if the spec has cut-out cards), the atlas dilated into its empty texels (no dark seams in
// the mips) and cropped to its used rows, quantized + meshopt (src/kit/assets.js decodes it). Writes
// public/models/lowpix/world_arch/<id>.glb and updates public/models/lowpix/world_arch/manifest.json and
// src/kit/lowpixArch.js (bounds, tris, atlas size per id).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { quantize, reorder, getBounds, join, flatten, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join as pjoin } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const OUT = resolve(ROOT, 'public/models/lowpix/world_arch');
const SPECS = resolve(ROOT, 'art/lowpix/world_arch');
const [buildDir, ...ids] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const manPath = pjoin(OUT, 'manifest.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};

/** Fill empty atlas texels from their neighbours (mips never pull in black) and crop unused rows at the bottom. */
async function polishAtlas(png, keepAlpha) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = new Uint8ClampedArray(data);
  let maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 0) maxY = y;
  const Hc = Math.min(H, Math.ceil((maxY + 9) / 16) * 16);
  const solid = new Uint8Array(W * Hc), alpha0 = new Uint8Array(W * Hc);
  for (let i = 0; i < W * Hc; i++) { solid[i] = px[i * 4 + 3] > 0 ? 1 : 0; alpha0[i] = px[i * 4 + 3]; }
  for (let pass = 0; pass < 24; pass++) {
    const add = [];
    for (let y = 0; y < Hc; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (solid[i]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy;
        if (X < 0 || Y < 0 || X >= W || Y >= Hc) continue;
        const j = Y * W + X;
        if (!solid[j]) continue;
        r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; n++;
      }
      if (n) add.push([i, r / n, g / n, b / n]);
    }
    if (!add.length) break;
    for (const [i, r, g, b] of add) { px[i * 4] = r; px[i * 4 + 1] = g; px[i * 4 + 2] = b; solid[i] = 1; }
  }
  for (let i = 0; i < W * Hc; i++) px[i * 4 + 3] = keepAlpha ? alpha0[i] : 255;
  const out = await sharp(Buffer.from(px.buffer, 0, W * Hc * 4), { raw: { width: W, height: Hc, channels: 4 } })
    .png({ compressionLevel: 9, palette: !keepAlpha, colours: 256, effort: 10 }).toBuffer();
  return { png: out, vScale: H / Hc, W, H: Hc };
}

for (const id of ids) {
  const dir = pjoin(buildDir, id);
  const glb = readdirSync(dir).find((f) => f.endsWith('.glb'));
  if (!glb) { console.log('no build for', id); continue; }
  const spec = JSON.parse(readFileSync(pjoin(SPECS, id + '.json'), 'utf8'));
  const game = spec.game || {};
  const hasCards = spec.parts.some((p) => p.shape === 'card');
  const doc = await io.read(pjoin(dir, glb));
  const root = doc.getRoot();
  await doc.transform(flatten());
  // bake every node's world transform into its vertices
  const seen = new Set();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const M = node.getWorldMatrix();
    for (const p of mesh.listPrimitives()) {
      const pos = p.getAttribute('POSITION');
      if (seen.has(pos)) continue;
      seen.add(pos);
      const a = pos.getArray().slice(), n = p.getAttribute('NORMAL'), na = n ? n.getArray().slice() : null;
      for (let i = 0; i < a.length; i += 3) {
        const x = a[i], y = a[i + 1], z = a[i + 2];
        a[i] = M[0] * x + M[4] * y + M[8] * z + M[12]; a[i + 1] = M[1] * x + M[5] * y + M[9] * z + M[13]; a[i + 2] = M[2] * x + M[6] * y + M[10] * z + M[14];
        if (na) {
          const nx = na[i], ny = na[i + 1], nz = na[i + 2];
          const X = M[0] * nx + M[4] * ny + M[8] * nz, Y = M[1] * nx + M[5] * ny + M[9] * nz, Z = M[2] * nx + M[6] * ny + M[10] * nz;
          const L = Math.hypot(X, Y, Z) || 1;
          na[i] = X / L; na[i + 1] = Y / L; na[i + 2] = Z / L;
        }
      }
      pos.setArray(a);
      if (n) n.setArray(na);
    }
    node.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  for (const n of root.listNodes()) n.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  // one mesh: move every primitive under the first mesh node, then join
  const meshNodes = root.listNodes().filter((n) => n.getMesh());
  const keep = meshNodes[0], keepMesh = keep.getMesh();
  for (const n of meshNodes.slice(1)) { for (const p of n.getMesh().listPrimitives()) keepMesh.addPrimitive(p); n.getMesh().dispose(); n.dispose(); }
  keep.setName(id);
  await doc.transform(dedup(), join({ keepNamed: false }), prune());
  let tex = [0, 0], tris = 0;
  const done = new Map();
  for (const m of root.listMaterials()) {
    m.setExtension('KHR_materials_unlit', null);
    m.setRoughnessFactor(game.rough ?? 0.86).setMetallicFactor(0);
    m.setAlphaMode(hasCards ? 'MASK' : 'OPAQUE');
    if (hasCards) m.setAlphaCutoff(0.5);
    m.setDoubleSided(hasCards || !!game.doubleSided);
    m.setName(id);
    const t = m.getBaseColorTexture();
    if (t && !done.has(t)) {
      const r = await polishAtlas(Buffer.from(t.getImage()), hasCards);
      t.setImage(r.png).setMimeType('image/png');
      done.set(t, r);
      tex = [r.W, r.H];
    }
    const r = t && done.get(t);
    if (r && r.vScale !== 1) {
      for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
        if (p.getMaterial() !== m) continue;
        const uv = p.getAttribute('TEXCOORD_0');
        if (!uv || uv._lpScaled) continue;
        const a = uv.getArray().slice();
        for (let i = 1; i < a.length; i += 2) a[i] *= r.vScale;
        uv.setArray(a); uv._lpScaled = true;
      }
    }
  }
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
  const b = getBounds(root.getDefaultScene() || root.listScenes()[0]);
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const outPath = pjoin(OUT, id + '.glb');
  await io.write(outPath, doc);
  man[id] = { id, name: spec.name, min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)), tris, tex, bytes: statSync(outPath).size, ppm: spec.density };
  console.log(`packed ${id}: ${tris} tris, atlas ${tex.join('x')}, ${(man[id].bytes / 1024).toFixed(0)} KB`);
}
writeFileSync(manPath, JSON.stringify(Object.fromEntries(Object.entries(man).sort()), null, 1) + '\n');
writeFileSync(resolve(ROOT, 'src/kit/lowpixArch.js'), `// Generated by art/lowpix/world_arch/pack.mjs (do not edit): the lowpix architecture and vehicle models in
// public/models/lowpix/world_arch/<id>.glb (specs: art/lowpix/world_arch/<id>.json, made by make.py). Each is authored in
// the frame the game places it in (metres), so min / max are its bounds there. Load through src/kit/assets.js with
// archAsset(id) as the asset id.
export const LP_ARCH = {
${Object.values(man).map((m) => `  ${m.id}: { min: [${m.min.join(', ')}], max: [${m.max.join(', ')}], tris: ${m.tris}, tex: [${m.tex.join(', ')}] },`).join('\n')}
};
export const archAsset = (id) => 'lowpix/world_arch/' + id;
`);
