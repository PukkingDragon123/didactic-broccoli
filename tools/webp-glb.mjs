// Lossless WebP textures for the game's GLBs (performance: download / install size). A PNG atlas re-encoded as lossless
// WebP (exact: transparent pixels keep their colour too) decodes to the very same pixels and is ~40-65% smaller, so the
// hand-painted figures look identical. The GLB keeps its meshopt compression; EXT_texture_webp is marked required
// (Chromium / Electron decode WebP; three's GLTFLoader reads it). Also converts the figures' variant atlases
// (<key>.<variant>.png next to the GLB, src/figures/lowpix.js loads <key>.<variant>.webp) and checks every converted
// image decodes back bit for bit before replacing anything.
//   node tools/webp-glb.mjs [dir-or-file ...]      (default: public/models)
//   node tools/webp-glb.mjs --face-patches [dir-or-file ...]   (default: public/models/lowpix/figures)
//   import { webpTextures } from '../../../tools/webp-glb.mjs'; await webpTextures(doc)   (the pack scripts)
// Face patches: an alternate-face atlas (<key>.face.webp) differs from the figure's own atlas in a few thousand pixels
// (the face; GIMMICKS.md "Variants"), so it ships as a sparse patch: the changed pixels, opaque, everything else fully
// transparent (a ~3 KB WebP instead of ~250 KB). src/figures/lowpix.js draws it over the GLB's atlas, which gives back
// the painted face atlas pixel for pixel (checked here before writing). Only for opaque atlases of the same size.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readdirSync, statSync, readFileSync, writeFileSync, renameSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WEBP = { lossless: true, exact: true, effort: 6 };

/** Raw RGBA of an encoded image (to prove a re-encode is lossless). */
async function raw(buf) { return sharp(buf).ensureAlpha().raw().toBuffer(); }

/** Lossless WebP for a PNG buffer, or null when it is not smaller or not bit-exact. */
export async function pngToWebp(png) {
  const webp = await sharp(png).webp(WEBP).toBuffer();
  if (webp.length >= png.length) return null;
  const [a, b] = await Promise.all([raw(png), raw(webp)]);
  if (!a.equals(b)) return null;
  return webp;
}

/** Re-encode a glTF-Transform document's PNG textures as lossless WebP (in place). Returns bytes saved. */
export async function webpTextures(doc) {
  let saved = 0, any = false;
  for (const t of doc.getRoot().listTextures()) {
    if (t.getMimeType() !== 'image/png') continue;
    const png = Buffer.from(t.getImage());
    const webp = await pngToWebp(png);
    if (!webp) continue;
    t.setImage(new Uint8Array(webp)).setMimeType('image/webp');
    if (t.getURI()) t.setURI(t.getURI().replace(/\.png$/i, '.webp'));
    saved += png.length - webp.length; any = true;
  }
  if (any) doc.createExtension(EXTTextureWebP).setRequired(true);
  return saved;
}

/** The GLB's paint atlas (its only base-colour texture) as raw RGBA, or null. */
async function atlasOf(io, glb) {
  const doc = await io.read(glb);
  const maps = new Set(doc.getRoot().listMaterials().map((m) => m.getBaseColorTexture()).filter(Boolean));
  if (maps.size !== 1) return null;
  return sharp(Buffer.from([...maps][0].getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** A sparse lossless patch turning `atlas` (raw RGBA) into the image `face` (encoded), or null when that is not exact. */
export async function facePatch(face, atlas) {
  const f = await sharp(face).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const a = atlas, W = a.info.width, H = a.info.height;
  if (f.info.width !== W || f.info.height !== H) return null;
  const A = a.data, F = f.data, P = Buffer.alloc(W * H * 4);
  for (let o = 0; o < A.length; o += 4) {
    if (A[o + 3] !== 255 || F[o + 3] !== 255) return null; // (opaque atlases only: drawn over with source-over, exactly)
    if (A[o] !== F[o] || A[o + 1] !== F[o + 1] || A[o + 2] !== F[o + 2]) { P[o] = F[o]; P[o + 1] = F[o + 1]; P[o + 2] = F[o + 2]; P[o + 3] = 255; }
  }
  const webp = await sharp(P, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 6 }).toBuffer();
  // check: the atlas with the patch drawn over it is the face, pixel for pixel
  const back = await sharp(webp).ensureAlpha().raw().toBuffer();
  for (let o = 0; o < A.length; o += 4) {
    const on = back[o + 3];
    if (on !== 0 && on !== 255) return null;
    const src = on ? back : A;
    if (src[o] !== F[o] || src[o + 1] !== F[o + 1] || src[o + 2] !== F[o + 2]) return null;
  }
  return webp;
}

function* walk(p) {
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) yield* walk(join(p, f)); } else yield p;
}

if (import.meta.filename === resolve(process.argv[1] || '')) {
  await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
  const patches = process.argv[2] === '--face-patches';
  const targets = process.argv.slice(patches ? 3 : 2);
  let before = 0, after = 0, n = 0;
  if (patches) {
    for (const target of targets.length ? targets : ['public/models/lowpix/figures']) for (const p of walk(target)) {
      const m = p.match(/^(.*)\.face\.(webp|png)$/);
      if (!m || !existsSync(m[1] + '.glb')) continue;
      const face = readFileSync(p), atlas = await atlasOf(io, m[1] + '.glb');
      const patch = atlas && await facePatch(face, atlas);
      if (!patch || patch.length >= face.length) { console.warn('kept whole (no exact patch):', p); continue; }
      writeFileSync(m[1] + '.face.webp', patch);
      if (m[2] === 'png') rmSync(p);
      before += face.length; after += patch.length; n++;
    }
    console.log(`${n} face patches: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
    process.exit(0);
  }
  for (const target of targets.length ? targets : ['public/models']) for (const p of walk(target)) {
    if (p.endsWith('.glb')) {
      const doc = await io.read(p);
      if (!doc.getRoot().listTextures().some((t) => t.getMimeType() === 'image/png')) continue;
      const s0 = statSync(p).size;
      if (!(await webpTextures(doc))) continue;
      const mo = doc.getRoot().listExtensionsUsed().find((e) => e.extensionName === 'EXT_meshopt_compression');
      if (mo) mo.setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
      const tmp = p + '.tmp';
      writeFileSync(tmp, await io.writeBinary(doc));
      renameSync(tmp, p);
      before += s0; after += statSync(p).size; n++;
    } else if (/\.[a-z]+\.png$/.test(p) && p.includes('/figures/')) { // a figure's variant atlas
      const png = readFileSync(p), webp = await pngToWebp(png);
      if (!webp) { console.warn('kept as PNG (not smaller / not exact):', p); continue; }
      writeFileSync(p.replace(/\.png$/, '.webp'), webp);
      rmSync(p);
      before += png.length; after += webp.length; n++;
    }
  }
  console.log(`${n} files: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
}
