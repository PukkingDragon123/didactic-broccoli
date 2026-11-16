// World props through lowpix (the owner's modeller, /home/user/pukkingdragon123/symmetrical-goggles, read-only):
// real models from Poly Haven (CC0) and Sketchfab (downloadable CC0 / CC BY) converted to the game's high-resolution
// pixel-art style, then made game-ready.
//   node tools/lowpix-world.mjs [id ...] [--force] [--jobs 3] [--post]   (wrap in tools/slot.sh on a shared machine)
// Spec: art/lowpix/world/world.json  { defaults: {...}, items: [{ id, src: 'polyhaven:<id>' | 'sketchfab:<uid>', h (m,
//   optional for Poly Haven: its real height), ppm (texels per metre, default 160), tris, yaw, alpha (keep cut-outs),
//   name, any lowpix convert option (light, detail, smooth, grain, crease, spread, ramps, steps) }] }
// Steps per item: `python3 -m lowpix convert <src> --style pixel-hd --height <h * ppm / 6>` (6 px per lowpix unit, so
// every model gets the same texel density in metres) into node_modules/.cache/lowpix-world/<id>, then: scaled to
// metres, origin at the bottom centre, unlit -> lit (roughness 0.9), the atlas cropped to its used rows and dilated
// (no dark seams in the mips), opaque unless `alpha`, quantized + meshopt (src/kit/assets.js decodes it).
// Writes public/models/lowpix/world/<id>.glb + manifest.json, art/lowpix/world/out/<id>.jpg (hero, for review),
// art/lowpix/world/out/<id>.json (lowpix report + licence) and the credits blocks in CREDITS.md / public/CREDITS.txt.
// --post: redo only the game-ready step from the cached conversions.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { quantize, reorder, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const LOWPIX = process.env.LOWPIX_HOME || '/home/user/pukkingdragon123/symmetrical-goggles';
const SPEC = resolve(ROOT, 'art/lowpix/world/world.json');
const OUT_ART = resolve(ROOT, 'art/lowpix/world/out');
const OUT_GLB = resolve(ROOT, 'public/models/lowpix/world');
const CACHE = resolve(ROOT, 'node_modules/.cache/lowpix-world');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : argv[i + 1]; };
const FORCE = argv.includes('--force'), POST = argv.includes('--post'), JOBS = +opt('jobs', 3);
const only = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--jobs'].includes(argv[i - 1])));
const PX_PER_UNIT = 6; // lowpix pixel-hd density
const LP_KEYS = ['tris', 'light', 'detail', 'smooth', 'grain', 'crease', 'spread', 'ramps', 'steps', 'dither', 'chart_angle', 'atlas'];

const spec = JSON.parse(readFileSync(SPEC, 'utf8'));
const D = spec.defaults || {};
const items = spec.items.filter((it) => !only.length || only.includes(it.id));
for (const d of [OUT_ART, OUT_GLB, CACHE]) mkdirSync(d, { recursive: true });

const phInfo = new Map();
function polyhavenInfo(id) {
  if (phInfo.has(id)) return phInfo.get(id);
  const f = join(CACHE, '_ph_' + id + '.json');
  if (!existsSync(f)) execFileSync('curl', ['-sSfL', '--retry', '3', '-m', '60', '-o', f, 'https://api.polyhaven.com/info/' + id]);
  const j = JSON.parse(readFileSync(f, 'utf8'));
  phInfo.set(id, j);
  return j;
}
function heightOf(it) {
  if (it.h) return it.h;
  if (it.src.startsWith('polyhaven:')) { const d = polyhavenInfo(it.src.slice(10)).dimensions; if (d) return d[2] / 1000; }
  throw new Error(it.id + ': no height (h) given');
}

function run(cmd, args, opts) {
  return new Promise((ok, bad) => {
    const p = spawn(cmd, args, { ...opts, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', (b) => { out += b; }); p.stderr.on('data', (b) => { out += b; });
    p.on('close', (code) => (code === 0 ? ok(out) : bad(new Error(out.slice(-1500)))));
  });
}
async function convert(it) {
  const dir = join(CACHE, it.id);
  const have = existsSync(dir) && readdirSync(dir).some((f) => f.endsWith('.glb'));
  if (have && !FORCE) return dir;
  if (existsSync(dir)) for (const f of readdirSync(dir)) if (f !== '_source') rmSync(join(dir, f), { recursive: true, force: true });
  const o = { ...D, ...it };
  const h = heightOf(it), ppm = o.ppm || 160;
  const args = ['-m', 'lowpix', 'convert', it.src, '--style', o.style || 'pixel-hd', '-o', dir, '--height', (h * ppm / PX_PER_UNIT).toFixed(2), '--name', it.name || it.id];
  if (o.yaw) args.push('--yaw', String(o.yaw));
  for (const k of LP_KEYS) if (o[k] != null) args.push('--' + k.replace('_', '-'), String(o[k]));
  const t0 = Date.now();
  await run('python3', args, { cwd: LOWPIX, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', LOWPIX_SKETCHFAB_TOKEN: process.env.LOWPIX_SKETCHFAB_TOKEN || 'proxy-injected' } });
  console.log(`converted ${it.id} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
  return dir;
}

/** Fill the empty atlas texels from their neighbours (so mips never pull in black) and crop unused rows. */
async function polishAtlas(png, keepAlpha) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, px = new Uint8ClampedArray(data);
  let maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] > 0) maxY = y;
  const Hc = Math.min(H, Math.ceil((maxY + 9) / 16) * 16);
  const solid = new Uint8Array(W * Hc);
  for (let i = 0; i < W * Hc; i++) solid[i] = px[i * 4 + 3] > 0 ? 1 : 0;
  const origAlpha = new Uint8Array(W * Hc);
  for (let i = 0; i < W * Hc; i++) origAlpha[i] = px[i * 4 + 3];
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
  for (let i = 0; i < W * Hc; i++) px[i * 4 + 3] = keepAlpha ? origAlpha[i] : 255;
  const out = await sharp(Buffer.from(px.buffer, 0, W * Hc * 4), { raw: { width: W, height: Hc, channels: 4 } })
    .png({ compressionLevel: 9, palette: !keepAlpha, colours: 256, effort: 10 }).toBuffer();
  return { png: out, vScale: H / Hc, W, H: Hc };
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
async function gameReady(it, dir) {
  const glb = readdirSync(dir).find((f) => f.endsWith('.glb'));
  const doc = await io.read(join(dir, glb));
  const root = doc.getRoot();
  const h = heightOf(it);
  // bake node transforms, scale to metres, bottom centre at the origin
  const scene = root.getDefaultScene() || root.listScenes()[0];
  const b0 = getBounds(scene), k = h / (b0.max[1] - b0.min[1]);
  const cx = (b0.min[0] + b0.max[0]) / 2, cz = (b0.min[2] + b0.max[2]) / 2, y0 = b0.min[1];
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
        const X = M[0] * x + M[4] * y + M[8] * z + M[12], Y = M[1] * x + M[5] * y + M[9] * z + M[13], Z = M[2] * x + M[6] * y + M[10] * z + M[14];
        a[i] = (X - cx) * k; a[i + 1] = (Y - y0) * k; a[i + 2] = (Z - cz) * k;
        if (na) {
          const nx = na[i], ny = na[i + 1], nz = na[i + 2];
          let X2 = M[0] * nx + M[4] * ny + M[8] * nz, Y2 = M[1] * nx + M[5] * ny + M[9] * nz, Z2 = M[2] * nx + M[6] * ny + M[10] * nz;
          const L = Math.hypot(X2, Y2, Z2) || 1;
          na[i] = X2 / L; na[i + 1] = Y2 / L; na[i + 2] = Z2 / L;
        }
      }
      pos.setArray(a);
      if (n) n.setArray(na);
    }
    node.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }
  for (const n of root.listNodes()) if (!n.getMesh()) n.setMatrix([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  // materials: lit, rough, opaque (unless the item keeps its cut-outs); the atlas polished
  let tex = 0, tris = 0;
  const done = new Map();
  for (const m of root.listMaterials()) {
    m.setExtension('KHR_materials_unlit', null);
    m.setRoughnessFactor(it.rough ?? 0.88).setMetallicFactor(0);
    if (!it.alpha) m.setAlphaMode('OPAQUE');
    const t = m.getBaseColorTexture();
    if (t && !done.has(t)) {
      const r = await polishAtlas(Buffer.from(t.getImage()), !!it.alpha);
      t.setImage(r.png).setMimeType('image/png');
      done.set(t, r);
      tex = Math.max(tex, r.W, r.H);
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
  await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize());
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const outPath = join(OUT_GLB, it.id + '.glb');
  await io.write(outPath, doc);
  const b = getBounds(doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0]);
  const size = [0, 1, 2].map((i) => +(b.max[i] - b.min[i]).toFixed(3));
  // credit
  let credit;
  if (it.src.startsWith('polyhaven:')) {
    const pid = it.src.slice(10), info = polyhavenInfo(pid);
    credit = { title: info.name, author: Object.keys(info.authors || {}).join(', '), license: 'CC0 1.0', url: 'https://polyhaven.com/a/' + pid, site: 'Poly Haven' };
  } else {
    const src = join(dir, '_source');
    const sub = existsSync(src) ? readdirSync(src).map((d) => join(src, d, 'ATTRIBUTION.json')).find((f) => existsSync(f)) : null;
    const a = sub ? JSON.parse(readFileSync(sub, 'utf8')) : {};
    const lic = { by: 'CC BY 4.0', cc0: 'CC0 1.0', 'cc0-public-domain': 'CC0 1.0', 'by-sa': 'CC BY-SA 4.0' }[a.licence] || a.licence;
    credit = { title: a.name, author: a.author, authorUrl: a.author_url, license: lic, url: a.source, site: 'Sketchfab' };
  }
  const report = JSON.parse(readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith('_report.json'))), 'utf8'));
  const hero = readdirSync(dir).find((f) => f.endsWith('_hero.png'));
  if (hero) await sharp(join(dir, hero)).resize(400, 300, { fit: 'inside' }).jpeg({ quality: 82 }).toFile(join(OUT_ART, it.id + '.jpg'));
  writeFileSync(join(OUT_ART, it.id + '.json'), JSON.stringify({ id: it.id, src: it.src, credit, tris, tex, size, colours: report.colors_used, palette: report.palette, warnings: report.warnings }, null, 1) + '\n');
  return { id: it.id, name: it.name || credit.title, src: it.src, ...credit, tris, tex, size, bytes: statSync(outPath).size };
}

// ------------------------------------------------------------------ run
const manPath = join(OUT_GLB, 'manifest.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
const queue = items.slice();
let failed = 0;
async function worker() {
  while (queue.length) {
    const it = queue.shift();
    try {
      const dir = POST ? join(CACHE, it.id) : await convert(it);
      man[it.id] = await gameReady(it, dir);
      console.log(`ok ${it.id}: ${man[it.id].tris} tris, ${man[it.id].tex}px, ${(man[it.id].bytes / 1024).toFixed(0)} KB, ${man[it.id].size.join(' x ')} m`);
    } catch (e) { failed++; console.log(`FAILED ${it.id}: ${e.message.split('\n').slice(-6).join(' | ')}`); }
  }
}
await Promise.all(Array.from({ length: Math.max(1, JOBS) }, worker));
const ids = new Set(spec.items.map((i) => i.id));
for (const k of Object.keys(man)) if (!ids.has(k)) delete man[k];
writeFileSync(manPath, JSON.stringify(Object.fromEntries(Object.entries(man).sort()), null, 1) + '\n');

// credits: one generated block in each file
const list = Object.values(man).sort((a, b) => a.site.localeCompare(b.site) || a.title.localeCompare(b.title));
const md = ['<!-- lowpix-world:begin (generated by tools/lowpix-world.mjs) -->', '## 3D models: world props and furniture (Poly Haven CC0, Sketchfab CC BY / CC0)', '',
  'Converted to the game\'s pixel-art style with lowpix (`python3 -m lowpix convert --style pixel-hd`), then scaled, re-textured and compressed by tools/lowpix-world.mjs. Shipped in `models/lowpix/world/`.', '',
  ...list.map((c) => `- ${c.title} by ${c.author} (${c.url}), ${c.license}${c.license.startsWith('CC BY') ? ' (https://creativecommons.org/licenses/by/4.0/)' : ''}. Shipped as \`models/lowpix/world/${c.id}.glb\``), '', '<!-- lowpix-world:end -->'].join('\n');
const txt = ['[lowpix-world:begin]', '3D models: world props and furniture (converted to pixel art with lowpix)', ...list.map((c) => `- ${c.title} by ${c.author}, ${c.license}: ${c.url} (models/lowpix/world/${c.id}.glb)`), '[lowpix-world:end]'].join('\n');
for (const [f, block, re] of [[resolve(ROOT, 'CREDITS.md'), md, /<!-- lowpix-world:begin[\s\S]*?<!-- lowpix-world:end -->/], [resolve(ROOT, 'public/CREDITS.txt'), txt, /\[lowpix-world:begin\][\s\S]*?\[lowpix-world:end\]/]]) {
  const s = readFileSync(f, 'utf8');
  writeFileSync(f, re.test(s) ? s.replace(re, block) : s.trimEnd() + '\n\n' + block + '\n');
}
const total = list.reduce((s, c) => s + c.bytes, 0);
console.log(`${list.length} models, ${(total / 1048576).toFixed(2)} MB, ${failed} failed`);
