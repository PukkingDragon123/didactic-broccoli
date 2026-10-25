// Low-poly realistic humans for the street and the shop.
//   const h = createHuman({ preset: 'salaryman', seed: 3 });   scene.add(h.root);
//   h.update(dt, { speed, lookAt, talking });  h.setExpression('happy', 2);  h.gesture('wave');
//   h.gesture('dance', { bpm: 120, style: 'bon', clock: () => songTime });  h.stopDance();   (styles: DANCES)
//   const bubbles = new Bubbles(camera);  bubbles.say(h, 'Nice sunset today.');  bubbles.update(dt);
import { Human } from './Human.js';
import { HUMAN_PRESETS, makeSpec, streetPreset } from './presets.js';
export { Bubbles } from './Bubbles.js';
export { GESTURES, DANCES } from './gestures.js';
export { EXPRESSIONS } from './face.js';
export { HUMAN_PRESETS, Human };

/**
 * Build a human. preset: an id from HUMAN_PRESETS (random street preset when omitted).
 * lazy (default true): the detailed texture is painted over the next few update() calls (a flat-coloured
 * placeholder shows meanwhile) so spawning never hitches; call human.finishPaint() to force it.
 */
export function createHuman({ preset, seed = 1, height, lazy = true } = {}) {
  return new Human(makeSpec(preset || streetPreset(seed), seed, height), { lazy });
}

/** A random passer-by (weighted street cast) for this seed. */
export function randomHuman(seed = (Math.random() * 1e9) | 0) {
  return createHuman({ seed });
}
