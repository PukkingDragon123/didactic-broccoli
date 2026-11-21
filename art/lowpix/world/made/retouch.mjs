// Retouch the printed text on a converted model's atlas into the game's pixel fonts (CLAUDE.md: every font is pixel
// art; real-photo labels keep their picture, their words become original text in a pixel face). The edit itself is
// done on the extracted PNG (art/lowpix/world/made/retouch.py paints the labels with DotGothic16 / the 5x7 font).
//   node art/lowpix/world/made/retouch.mjs extract <id> <out.png>    the base-colour atlas of models/lowpix/world/<id>.glb
//   node art/lowpix/world/made/retouch.mjs apply <id> <in.png>       put the edited atlas back (lossless WebP, as before)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webpTextures } from '../../../../tools/webp-glb.mjs';

const [cmd, id, file] = process.argv.slice(2);
const glb = resolve(import.meta.dirname, '../../../../public/models/lowpix/world', id + '.glb');
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(glb);
const tex = doc.getRoot().listMaterials().map((m) => m.getBaseColorTexture()).find(Boolean);
if (!tex) throw new Error(id + ': no base-colour texture');
if (cmd === 'extract') {
  writeFileSync(file, await sharp(Buffer.from(tex.getImage())).png().toBuffer());
  console.log('extracted', id, '->', file);
} else if (cmd === 'apply') {
  tex.setImage(readFileSync(file)).setMimeType('image/png');
  await webpTextures(doc);
  await io.write(glb, doc);
  console.log('retouched', id);
} else throw new Error('usage: retouch.mjs extract|apply <id> <png>');
