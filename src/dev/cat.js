// Viewer module: the street cat in each pose, then grooving at a few points of the bar.  viewer.html?module=/src/dev/cat.js&cols=5
import { CatRig } from '../world/CatRig.js';
export async function viewerEntries() {
  const poses = ['walk', 'sit', 'groom', 'sleep', 'held'].map((p) => {
    const c = new CatRig();
    c.setPose(p);
    for (let i = 0; i < 120; i++) c.update(1 / 60, p === 'walk' ? 0.5 : 0);
    c.root.rotation.y = 0.6;
    return { obj: c.root, label: p };
  });
  const groove = [0, 0.5, 1, 1.5, 2, 3].map((b) => {
    const c = new CatRig();
    c.setPose('groove', { bpm: 120 });
    for (let t = 0; t < 4 + b / 2 - 1e-6; t += 1 / 60) c.update(1 / 60, 0);
    c.root.rotation.y = 0.3;
    return { obj: c.root, label: `groove b${b}` };
  });
  return [...poses, ...groove];
}
