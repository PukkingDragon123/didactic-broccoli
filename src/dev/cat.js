// Viewer module: the street cat in each pose.  viewer.html?module=/src/dev/cat.js&cols=5
import { CatRig } from '../world/CatRig.js';
export async function viewerEntries() {
  return ['walk', 'sit', 'groom', 'sleep', 'held'].map((p) => {
    const c = new CatRig();
    c.setPose(p);
    for (let i = 0; i < 120; i++) c.update(1 / 60, p === 'walk' ? 0.5 : 0);
    c.root.rotation.y = 0.6;
    return { obj: c.root, label: p };
  });
}
