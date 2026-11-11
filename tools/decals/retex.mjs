// Swap a texture image inside an imported model: node tools/decals/retex.mjs <model name> <texture index> <png> [...]
// (for decals: Japanese text over the source model's own lettering; pairs of index + png may repeat)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { readFileSync, statSync } from 'node:fs';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [name, ...rest] = process.argv.slice(2), path = `public/models/${name}.glb`;
const doc = await io.read(path), tex = doc.getRoot().listTextures();
for (let i = 0; i < rest.length; i += 2) {
  const t = tex[+rest[i]], png = await sharp(readFileSync(rest[i + 1])).png({ palette: true, colours: 64, dither: 0, effort: 10, compressionLevel: 9 }).toBuffer();
  t.setImage(png).setMimeType('image/png');
}
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(path, doc);
console.log(path, (statSync(path).size / 1024).toFixed(0) + ' KB');
