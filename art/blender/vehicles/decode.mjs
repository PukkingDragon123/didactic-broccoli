// A plain copy of a packed game model for the Blender scripts to fit parts to (no meshopt, no quantization, PNG
// textures): node art/blender/vehicles/decode.mjs [id]  (default kei_van) -> art/blender/vehicles/out/<id>_ref.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');
const id = process.argv[2] || 'kei_van';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(resolve(ROOT, 'public/models/lowpix/world_arch', id + '.glb'));
for (const e of doc.getRoot().listExtensionsUsed()) if (/meshopt|webp|quantiz/i.test(e.extensionName)) e.dispose();
await doc.transform(dequantize());
for (const t of doc.getRoot().listTextures()) if (t.getMimeType() === 'image/webp') { t.setImage(await sharp(Buffer.from(t.getImage())).png().toBuffer()); t.setMimeType('image/png'); }
await io.write(resolve(import.meta.dirname, 'out', id + '_ref.glb'), doc);
console.log('decoded', id);
