// Low-poly realistic humans: createHuman / presets / speech bubbles.
import { Human } from './Human.js';
import { HUMAN_PRESETS, makeSpec, streetPreset } from './presets.js';
export { HUMAN_PRESETS };
export function createHuman({ preset, seed = 1, height } = {}) {
  const spec = makeSpec(preset || streetPreset(seed), seed, height);
  const h = new Human(spec);
  h.headTop = (v) => v.set(0, spec.H + 0.25, 0).applyMatrix4(h.root.matrixWorld);
  return h;
}
