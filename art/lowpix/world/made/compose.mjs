// Composite props made of two converted models (no code boxes): each part is a finished lowpix conversion from
// public/models/lowpix/world/, placed on the other with a node transform and written as one GLB the prop library loads
// like any other (src/kit/assets.js bakes the node transforms). Credits stay with the parts (CREDITS.md).
//   node art/lowpix/world/made/compose.mjs
// pinkphone_table: the red tabletop public phone (payphone_red) on a classic nightstand, the Showa shop-counter phone.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { mergeDocuments, getBounds, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { resolve } from 'node:path';

const DIR = resolve(import.meta.dirname, '../../../../public/models/lowpix/world');
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const COMPOSITES = {
  pinkphone_table: { base: 'nightstand', top: 'payphone_red', topScale: 1.0, topYaw: 0, topZ: 0.02 },
};

for (const [name, c] of Object.entries(COMPOSITES)) {
  const doc = await io.read(resolve(DIR, c.base + '.glb'));
  const top = await io.read(resolve(DIR, c.top + '.glb'));
  const baseScene = doc.getRoot().listScenes()[0];
  const h = getBounds(baseScene).max[1];
  const map = mergeDocuments(doc, top);
  const topScene = map.get(top.getRoot().listScenes()[0]);
  const holder = doc.createNode(c.top).setTranslation([0, h, c.topZ || 0]).setScale([c.topScale, c.topScale, c.topScale])
    .setRotation([0, Math.sin((c.topYaw || 0) / 2), 0, Math.cos((c.topYaw || 0) / 2)]);
  for (const n of topScene.listChildren()) { topScene.removeChild(n); holder.addChild(n); }
  baseScene.addChild(holder);
  topScene.dispose();
  await doc.transform(unpartition());
  await io.write(resolve(DIR, name + '.glb'), doc);
  console.log('wrote', name, getBounds(baseScene).max.map((v) => v.toFixed(3)).join(' '));
}
