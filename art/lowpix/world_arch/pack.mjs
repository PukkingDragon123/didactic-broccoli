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
import { webpTextures } from '../../../tools/webp-glb.mjs';

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
  // a converted model: turned (ry, degrees), scaled to its real height (h, metres), bottom centre at the origin
  if (game.fit) {
    const b0 = getBounds(root.getDefaultScene() || root.listScenes()[0]);
    const k = game.fit.h / (b0.max[1] - b0.min[1]), a = (game.fit.ry || 0) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    const cx = (b0.min[0] + b0.max[0]) / 2, cz = (b0.min[2] + b0.max[2]) / 2, y0 = b0.min[1];
    const done = new Set();
    for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
      for (const [name, isPos] of [['POSITION', true], ['NORMAL', false]]) {
        const at = p.getAttribute(name);
        if (!at || done.has(at)) continue;
        done.add(at);
        const v = at.getArray().slice();
        for (let i = 0; i < v.length; i += 3) {
          let x = v[i], y = v[i + 1], z = v[i + 2];
          if (isPos) { x = (x - cx) * k; y = (y - y0) * k; z = (z - cz) * k; }
          v[i] = x * c + z * sn; v[i + 1] = y; v[i + 2] = -x * sn + z * c;
        }
        at.setArray(v);
      }
    }
  }
  // one mesh: move every primitive under the first mesh node, then join
  const meshNodes = root.listNodes().filter((n) => n.getMesh());
  const keep = meshNodes[0], keepMesh = keep.getMesh();
  for (const n of meshNodes.slice(1)) { for (const p of n.getMesh().listPrimitives()) keepMesh.addPrimitive(p); n.getMesh().dispose(); n.dispose(); }
  keep.setName(id);
  await doc.transform(dedup(), join({ keepNamed: false }), prune());
  // clean geometry: drop degenerate (zero-area) triangles, give zero / NaN normals the face normal (NaN shading
  // poisons the environment bake and the bloom: black frames)
  for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL'), idx = p.getIndices();
    if (!pos || !idx) continue;
    const P = pos.getArray(), I = idx.getArray(), keep = [];
    // lowpix exports no normals (unlit): write each flat face's normal (the game lights these models)
    const N = nor ? nor.getArray().slice() : new Float32Array(P.length);
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
      const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const L = Math.hypot(nx, ny, nz);
      if (!(L > 1e-7)) continue;
      keep.push(I[t], I[t + 1], I[t + 2]);
      for (const v of [a, b, c]) { const l = Math.hypot(N[v], N[v + 1], N[v + 2]); if (!nor || !(l > 1e-6) || !Number.isFinite(l)) { N[v] = nx / L; N[v + 1] = ny / L; N[v + 2] = nz / L; } }
    }
    idx.setArray(new (I.constructor)(keep));
    for (let v = 0; v < N.length; v += 3) if (!(Math.hypot(N[v], N[v + 1], N[v + 2]) > 0.5)) { N[v] = 0; N[v + 1] = 1; N[v + 2] = 0; }
    if (nor) nor.setArray(N);
    else p.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(N).setBuffer(pos.getBuffer()));
  }
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
  await webpTextures(doc); // (lossless WebP: the same pixels, smaller: tools/webp-glb.mjs)
  const outPath = pjoin(OUT, id + '.glb');
  await io.write(outPath, doc);
  let credit;
  if (spec.convert) {
    const src = pjoin(dir, '_source');
    const att = existsSync(src) ? readdirSync(src).map((d) => pjoin(src, d, 'ATTRIBUTION.json')).find((f) => existsSync(f)) : null;
    const a = att ? JSON.parse(readFileSync(att, 'utf8')) : {};
    const lic = { by: 'CC BY 4.0', cc0: 'CC0 1.0', 'cc0-public-domain': 'CC0 1.0' }[a.licence] || a.licence;
    credit = { title: a.name, author: a.author, authorUrl: a.author_url, license: lic, url: a.source, site: spec.convert.src.split(':')[0] };
  }
  man[id] = { id, name: spec.name, ...(game.houses ? { houses: game.houses } : {}), ...(credit ? { credit } : {}), min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)), tris, tex, bytes: statSync(outPath).size, ppm: spec.density };
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
// the houses each block model draws (art/lowpix/world_arch/_src/houses.py): house id (Town.js houseId) -> { block, ridge }
export const LP_HOUSES = {
${Object.values(man).flatMap((m) => Object.entries(m.houses || {}).map(([h, v]) => `  '${h}': { block: '${m.id}', ridge: ${v.ridge} },`)).join('\n')}
};
`);

// ------------------------------------------------------------------ credits (CREDITS.md, public/CREDITS.txt)
{
  const PH = resolve(ROOT, 'art/lowpix/world_arch/photos');
  const photos = existsSync(PH) ? readdirSync(PH).filter((d) => existsSync(pjoin(PH, d, 'source.json'))).map((d) => JSON.parse(readFileSync(pjoin(PH, d, 'source.json'), 'utf8'))) : [];
  // the tiling surface textures (art/lowpix/world_arch/tex/make_tex.py) are stylised from these Poly Haven photos
  const TX = resolve(ROOT, 'art/lowpix/world_arch/tex/src'), used = ['asphalt_01', 'rocky_trail_02', 'sand_01', 'rectangular_paving', 'plywood', 'concrete_wall_003', 'painted_plaster_wall', 'rusty_metal_02', 'weathered_planks'];
  for (const id of used) if (existsSync(pjoin(TX, id + '.png')) && !photos.some((p) => p.asset === id)) photos.push({ asset: id, source: 'https://polyhaven.com/a/' + id });
  const conv = Object.values(man).filter((m) => m.credit);
  const md = ['<!-- lowpix-world-arch:begin (generated by art/lowpix/world_arch/pack.mjs) -->',
    '## 3D models: buildings, the garage front, the street, vehicles (lowpix)', '',
    'Modelled for the game as lowpix specs (art/lowpix/world_arch/, CC0) and built with the owner\'s modeller lowpix; textures photo-bashed from these CC0 Poly Haven textures (art/lowpix/world_arch/photos/):', '',
    ...photos.map((p) => `- ${p.asset}: ${p.source} (CC0 1.0)`), '',
    ...(conv.length ? ['Converted from these models (`lowpix convert --style pixel-hd`), shipped in `models/lowpix/world_arch/`:', '',
      ...conv.map((m) => `- ${m.credit.title} by ${m.credit.author}, ${m.credit.license}: ${m.credit.url} (${m.id})`), ''] : []),
    '<!-- lowpix-world-arch:end -->'].join('\n');
  const txt = ['[lowpix-world-arch:begin]', '3D models: buildings, the garage front, the street, vehicles (lowpix; textures photo-bashed from CC0 Poly Haven textures)',
    ...photos.map((p) => `- ${p.asset}: ${p.source} (CC0 1.0)`),
    ...conv.map((m) => `- ${m.credit.title} by ${m.credit.author}, ${m.credit.license}: ${m.credit.url} (${m.id})`), '[lowpix-world-arch:end]'].join('\n');
  for (const [f, block, re] of [[resolve(ROOT, 'CREDITS.md'), md, /<!-- lowpix-world-arch:begin[\s\S]*?<!-- lowpix-world-arch:end -->/], [resolve(ROOT, 'public/CREDITS.txt'), txt, /\[lowpix-world-arch:begin\][\s\S]*?\[lowpix-world-arch:end\]/]]) {
    const cur = readFileSync(f, 'utf8');
    writeFileSync(f, re.test(cur) ? cur.replace(re, block) : cur.replace(/\s*$/, '\n\n') + block + '\n');
  }
}
