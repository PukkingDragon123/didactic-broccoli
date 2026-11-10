// The growable pot plants (src/places/plants.js): a morning glory, a tomato and a cactus at each stage, seed to bloom,
// in a terracotta pot with its soil. The pots are the prop kit's; the plants are the town's foliage (hand-pixelled sprig
// cards on modelled stems, src/town/foliage.js), so they match the gardens outside.
import { pot } from '../kit/shapes.js';
import { leaves } from '../kit/foliage.js';

const models = {};
const STAGES = [0, 1, 2, 3, 4];
for (const st of STAGES) {
  // 朝顔: seed (bare soil), two seed leaves, a young vine on a cane, the full lantern trellis, then in flower
  models['plant_asagao_' + st] = { box: [-0.09, 0, -0.09, 0.09, [0.13, 0.16, 0.34, 0.6, 0.6][st], 0.09], build: (K) => {
    const ys = pot(K, 0, 0, 0, 0.075, 0.11, { n: 14 });
    if (!st) return;
    leaves(K, (t, F) => {
      if (st === 1) return F.tuft(t, 0, ys, 0, 0.05, 'sprout', 3);
      F.potPlant(t, 0, ys, 0, 'asagao', st === 2 ? 0.2 : 0.46, 3, { r: 0.07, leaf: st < 4 ? 'ivy' : null });
    });
  } };
  // トマト: seed, seedling, a young plant, grown with green fruit, fruiting red
  models['plant_tomato_' + st] = { box: [-0.09, 0, -0.09, 0.09, [0.13, 0.17, 0.32, 0.52, 0.52][st], 0.09], build: (K) => {
    const ys = pot(K, 0, 0, 0, 0.078, 0.11, { n: 14 });
    if (!st) return;
    leaves(K, (t, F) => {
      if (st === 1) return F.tuft(t, 0, ys, 0, 0.06, 'sprout', 5);
      F.potPlant(t, 0, ys, 0, 'tomato', st === 2 ? 0.18 : 0.38, 5, { fruit: st === 3 ? 0x7ab04a : st === 4 ? 0xd8302a : null });
    });
  } };
  // サボテン: a cactus in grit, a nub, a column, a column with an arm, in flower
  models['plant_cactus_' + st] = { box: [-0.06, 0, -0.06, 0.06, [0.08, 0.1, 0.14, 0.18, 0.2][st], 0.06], build: (K) => {
    const ys = pot(K, 0, 0, 0, 0.05, 0.065, { n: 14, soil: 0xc8b890 });
    if (!st) return;
    leaves(K, (t, F) => F.potPlant(t, 0, ys, 0, 'cactus', [0, 0.025, 0.06, 0.1, 0.12][st], 7, { arm: st >= 3, bloom: st === 4 }));
  } };
}
export default { family: 'decor', models };
