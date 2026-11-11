// Fix an imported model's material factors: node tools/decals/matfix.mjs <model name> <material name|*>=<metal>[,<rough>] ...
// (e.g. a wooden stool the importer read as metal: wooden_stool_01 '*=0'; a metal value of 0 also drops the ORM map)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const [name, ...rules] = process.argv.slice(2), path = `public/models/${name}.glb`, doc = await io.read(path);
for (const r of rules) {
  const [k, v] = r.split('='), [metal, rough] = v.split(',').map(Number);
  for (const m of doc.getRoot().listMaterials()) if (k === '*' || m.getName() === k) {
    m.setMetallicFactor(metal); if (!metal) m.setMetallicRoughnessTexture(null);
    if (rough >= 0) m.setRoughnessFactor(rough);
  }
}
await doc.transform(prune());
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(path, doc);
console.log(path, 'ok');
